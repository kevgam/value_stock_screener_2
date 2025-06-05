import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FinnhubService } from '@/src/infrastructure/services/FinnhubService';
import { RateLimiter } from '@/src/services/rateLimiter';

const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const UPDATE_THRESHOLD_HOURS = 12;

export async function POST() {
  log('=== Starting stock update process ===');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('ERROR: Missing Supabase credentials');
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const finnhubService = new FinnhubService();
  const rateLimiter = RateLimiter.getInstance();

  try {
    // Get all available stocks
    log('Fetching available stocks...');
    const availableStocks = await finnhubService.getAvailableStocks();
    log(`Found ${availableStocks.length} available stocks`);

    // Get existing stocks and their last update times
    const { data: existingStocks, error: fetchError } = await supabase
      .from('stocks_v2')
      .select('symbol, last_updated');

    if (fetchError) {
      log(`ERROR: Failed to fetch existing stocks - ${fetchError.message}`);
      return NextResponse.json({ error: 'Failed to fetch existing stocks' }, { status: 500 });
    }

    // Create a map of existing stocks and their last update times
    const existingStocksMap = new Map(
      existingStocks?.map(stock => [stock.symbol, new Date(stock.last_updated)])
    );

    // Filter stocks that need updating
    const now = new Date();
    const stocksToUpdate = availableStocks.filter(stock => {
      const lastUpdated = existingStocksMap.get(stock.displaySymbol);
      if (!lastUpdated) return true; // New stock
      
      const hoursSinceLastUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastUpdate >= UPDATE_THRESHOLD_HOURS;
    });

    log(`Found ${stocksToUpdate.length} stocks to update (${availableStocks.length - stocksToUpdate.length} up to date)`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process stocks in batches
    const BATCH_SIZE = 20;
    for (let i = 0; i < stocksToUpdate.length; i += BATCH_SIZE) {
      const batch = stocksToUpdate.slice(i, i + BATCH_SIZE);
      log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(stocksToUpdate.length/BATCH_SIZE)}`);

      for (const stock of batch) {
        try {
          await rateLimiter.checkRateLimit('processStock');
          
          const symbol = stock.displaySymbol;
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
            continue;
          }

          // Skip if market cap is too small
          const marketCap = quote.c * (metrics.metric?.marketCapitalization || 0);
          if (marketCap < 100000000) { // $100M
            log(`Skipping ${symbol} - Market cap too small: $${marketCap.toLocaleString()}`);
            skippedCount++;
            continue;
          }

          // Prepare stock data
          const stockData = {
            symbol: symbol,
            name: profile.name || '',
            price: quote.c,
            currency: profile.currency || 'USD',
            market_cap: marketCap,
            eps: metrics.metric?.epsBasicExclExtraItemsTTM || 0,
            book_value_per_share: metrics.metric?.bookValuePerShareAnnual || 0,
            current_ratio: metrics.metric?.currentRatioAnnual || 0,
            long_term_debt_to_equity: metrics.metric?.longTermDebtToEquityAnnual || 0,
            earnings_growth_5y: metrics.metric?.epsGrowth5Y || 0,
            dividend_yield: metrics.metric?.dividendYieldIndicatedAnnual || 0,
            last_updated: new Date().toISOString()
          };

          // Update or insert stock
          const { error: upsertError } = await supabase
            .from('stocks_v2')
            .upsert(stockData, { onConflict: 'symbol' });

          if (upsertError) {
            throw upsertError;
          }

          successCount++;
          log(`Updated ${symbol}: $${stockData.price} (MC: $${(stockData.market_cap/1000000).toFixed(2)}M)`);
        } catch (error) {
          errorCount++;
          log(`Error processing stock: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    log('\n=== Stock update completed ===');
    log(`Results: ${successCount} updated, ${skippedCount} skipped, ${errorCount} errors`);
    
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