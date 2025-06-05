import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FinnhubService } from '@/src/infrastructure/services/FinnhubService';
import { RateLimiter } from '@/src/services/rateLimiter';

const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const UPDATE_THRESHOLD_HOURS = 12;

export async function POST() {
  log('=== Starting stocks_v2 update process ===');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const marketCapThreshold = Number(process.env.MARKET_CAP_THRESHOLD_MILLIONS || '100');
  
  if (!supabaseUrl || !supabaseKey) {
    log('ERROR: Missing Supabase credentials');
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }

  if (isNaN(marketCapThreshold) || marketCapThreshold <= 0) {
    log('ERROR: Invalid MARKET_CAP_THRESHOLD_MILLIONS value');
    return NextResponse.json({ error: 'Invalid market cap threshold configuration' }, { status: 500 });
  }

  log(`Using market cap threshold: $${marketCapThreshold}M`);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const finnhubService = new FinnhubService();
  const rateLimiter = RateLimiter.getInstance();

  try {
    // Get stocks that need updating (older than 12 hours or don't exist)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    // First get the count of stocks that need updating
    const { count: totalCount, error: countError } = await supabase
      .from('available_stocks')
      .select('*', { count: 'exact', head: true })
      .eq('exchange', 'US')
      .eq('is_active', true)
      .not('symbol', 'in', `(
        select symbol from stocks_v2 
        where last_updated > '${twelveHoursAgo.toISOString()}'
        and skip_reason is null  -- Only consider successfully processed stocks
      )`);

    if (countError) {
      log(`ERROR: Failed to count stocks needing update - ${countError.message}`);
      return NextResponse.json({ 
        error: 'Failed to count stocks',
        details: countError.message 
      }, { status: 500 });
    }

    if (totalCount === null || totalCount === 0) {
      log('No stocks need updating at this time');
      return NextResponse.json({ 
        message: 'No stocks need updating',
        updated: 0,
        skipped: 0,
        errors: 0
      });
    }

    log(`Found ${totalCount} stocks that need updating`);

    // Process stocks in batches
    const BATCH_SIZE = 1000;
    let processedCount = 0;
    let allStocks: { symbol: string }[] = [];
    const totalBatches = Math.ceil(totalCount / BATCH_SIZE);

    while (processedCount < totalCount) {
      const currentBatch = Math.floor(processedCount / BATCH_SIZE) + 1;
      log(`Fetching batch ${currentBatch}/${totalBatches} (${processedCount + 1}-${Math.min(processedCount + BATCH_SIZE, totalCount)} of ${totalCount})`);

      const { data: batch, error: batchError } = await supabase
        .from('available_stocks')
        .select('symbol')
        .eq('exchange', 'US')
        .eq('is_active', true)
        .not('symbol', 'in', `(
          select symbol from stocks_v2 
          where last_updated > '${twelveHoursAgo.toISOString()}'
          and skip_reason is null  -- Only consider successfully processed stocks
        )`)
        .order('symbol')
        .range(processedCount, processedCount + BATCH_SIZE - 1);

      if (batchError) {
        log(`ERROR: Failed to fetch batch ${currentBatch} - ${batchError.message}`);
        return NextResponse.json({ 
          error: 'Failed to fetch stocks',
          details: batchError.message 
        }, { status: 500 });
      }

      if (!batch || batch.length === 0) {
        break;
      }

      allStocks = [...allStocks, ...batch];
      processedCount += batch.length;
      log(`✓ Batch ${currentBatch}/${totalBatches} complete: ${batch.length} stocks fetched`);
    }

    log(`\n=== Fetching Complete ===`);
    log(`Successfully fetched ${allStocks.length} stocks that need updating`);

    // Shuffle the stocks to avoid rate limiting issues with similar stocks
    const shuffledStocks = [...allStocks].sort(() => Math.random() - 0.5);
    log('Stocks have been shuffled for processing');

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let skippedReasons: Record<string, number> = {
      'no_price_data': 0,
      'market_cap_too_small': 0,
      'invalid_market_cap': 0
    };

    // Process stocks in batches
    const processBatchSize = 20;
    const totalProcessBatches = Math.ceil(shuffledStocks.length / processBatchSize);
    
    log(`\n=== Starting Stock Updates ===`);
    log(`Processing ${shuffledStocks.length} stocks in ${totalProcessBatches} batches of ${processBatchSize}`);

    for (let i = 0; i < shuffledStocks.length; i += processBatchSize) {
      const currentBatch = Math.floor(i / processBatchSize) + 1;
      const batch = shuffledStocks.slice(i, i + processBatchSize);
      
      log(`\nProcessing batch ${currentBatch}/${totalProcessBatches} (${i + 1}-${Math.min(i + processBatchSize, shuffledStocks.length)} of ${shuffledStocks.length})`);

      for (const stock of batch) {
        try {
          await rateLimiter.checkRateLimit('processStock');
          
          const symbol = stock.symbol;
          log(`Processing ${symbol}...`);

          // Get stock data
          const [quote, profile, metrics] = await Promise.all([
            finnhubService.getQuote(symbol),
            finnhubService.getCompanyProfile(symbol),
            finnhubService.getStockMetrics(symbol)
          ]);

          // Skip if no price data
          if (!quote.c || quote.c === 0) {
            log(`Skipping ${symbol} - No price data`);
            skippedCount++;
            skippedReasons['no_price_data']++;
            // Update last_updated even for skipped stocks to avoid rechecking too soon
            await supabase
              .from('stocks_v2')
              .upsert({ 
                symbol, 
                last_updated: new Date().toISOString(),
                price: 0,
                market_cap: 0,
                skip_reason: 'no_price_data'
              }, { onConflict: 'symbol' });
            continue;
          }

          // Skip if market cap is too small
          const marketCap = metrics.metric?.marketCapitalization || 0;  // This is already in millions
          
          // Validate market cap is a reasonable value
          if (marketCap <= 0) {
            log(`Skipping ${symbol} - Invalid market cap: $${marketCap}M`);
            skippedCount++;
            skippedReasons['invalid_market_cap']++;
            await supabase
              .from('stocks_v2')
              .upsert({ 
                symbol, 
                last_updated: new Date().toISOString(),
                price: quote.c,
                market_cap: 0,
                skip_reason: 'invalid_market_cap'
              }, { onConflict: 'symbol' });
            continue;
          }

          // Check if market cap is too small
          if (marketCap < marketCapThreshold) {
            log(`Skipping ${symbol} - Market cap too small: $${marketCap.toLocaleString()}M (threshold: $${marketCapThreshold}M)`);
            skippedCount++;
            skippedReasons['market_cap_too_small']++;
            await supabase
              .from('stocks_v2')
              .upsert({ 
                symbol, 
                last_updated: new Date().toISOString(),
                price: quote.c,
                market_cap: marketCap * 1000000,
                skip_reason: 'market_cap_too_small'
              }, { onConflict: 'symbol' });
            continue;
          }

          // Log warning for unusually large market caps but still process them
          const MAX_REASONABLE_MARKET_CAP = 1000000; // $1T
          if (marketCap > MAX_REASONABLE_MARKET_CAP) {
            log(`Warning: ${symbol} has unusually large market cap: $${marketCap.toLocaleString()}M`);
          }

          // Prepare stock data
          const stockData = {
            symbol: symbol,
            name: profile.name || '',
            price: quote.c,
            currency: profile.currency || 'USD',
            market_cap: marketCap * 1000000,  // Convert to actual value
            eps: metrics.metric?.epsBasicExclExtraItemsTTM || 0,
            book_value_per_share: metrics.metric?.bookValuePerShareAnnual || 0,
            current_ratio: metrics.metric?.currentRatioAnnual || 0,
            long_term_debt_to_equity: metrics.metric?.longTermDebtToEquityAnnual || 0,
            earnings_growth_5y: metrics.metric?.epsGrowth5Y || 0,
            dividend_yield: metrics.metric?.dividendYieldIndicatedAnnual || 0,
            last_updated: new Date().toISOString(),
            skip_reason: null
          };

          // Update or insert stock
          const { error: upsertError } = await supabase
            .from('stocks_v2')
            .upsert(stockData, { onConflict: 'symbol' });

          if (upsertError) {
            throw upsertError;
          }

          successCount++;
          log(`✓ Updated ${symbol}: $${stockData.price} (MC: $${(stockData.market_cap/1000000).toFixed(2)}M)`);
        } catch (error) {
          errorCount++;
          log(`✗ Error processing ${stock.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      log(`Batch ${currentBatch}/${totalProcessBatches} complete: ${successCount} updated, ${skippedCount} skipped, ${errorCount} errors`);
    }

    log(`\n=== Stock Update Completed ===`);
    log(`Final Results:
      - Successfully updated: ${successCount}
      - Skipped: ${skippedCount}
        - No price data: ${skippedReasons['no_price_data']}
        - Market cap too small: ${skippedReasons['market_cap_too_small']}
        - Invalid market cap: ${skippedReasons['invalid_market_cap']}
      - Errors: ${errorCount}
      - Total processed: ${successCount + skippedCount + errorCount}
    `);
    
    return NextResponse.json({
      message: 'Stock update completed',
      updated: successCount,
      skipped: skippedCount,
      errors: errorCount
    });

  } catch (error) {
    log(`\n=== FATAL ERROR ===\n${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ error: 'Stock update failed' }, { status: 500 });
  }
} 