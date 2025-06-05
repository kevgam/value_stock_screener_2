import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateGrahamNumber, calculateMarginOfSafety, calculateGrahamSafetyScore, calculateGrahamValueScore } from '@/src/application/stockService';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export async function POST() {
  log('=== Starting recalculation process ===');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('ERROR: Missing Supabase credentials');
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    log('Counting total stocks...');
    const { count, error: countError } = await supabase
      .from('stocks_v2')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      log(`ERROR: Failed to count stocks - ${countError.message}`);
      return NextResponse.json({ error: 'Failed to count stocks' }, { status: 500 });
    }

    if (!count) {
      log('No stocks found in database');
      return NextResponse.json({ message: 'No stocks found' }, { status: 200 });
    }

    log(`Found ${count} stocks to process`);
    let successCount = 0;
    let errorCount = 0;
    const BATCH_SIZE = 50;

    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      log(`\n=== Processing batch ${Math.floor(offset/BATCH_SIZE) + 1} of ${Math.ceil(count/BATCH_SIZE)} ===`);
      
      const { data: stocks, error: fetchError } = await supabase
        .from('stocks_v2')
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        log(`ERROR: Failed to fetch batch - ${fetchError.message}`);
        continue;
      }

      if (!stocks || stocks.length === 0) {
        log('WARNING: Empty batch received, skipping');
        continue;
      }

      for (const stock of stocks) {
        try {
          // Get forex rate if needed
          let usdRate = 1;
          if (stock.currency === 'JPY' || 
              stock.symbol.endsWith('.T') || 
              ['TKOMF', 'TKOMY'].includes(stock.symbol)) {
            
            log(`Processing Japanese stock ${stock.symbol}`);
            const forexResponse = await fetch(
              `${FINNHUB_BASE_URL}/forex/exchange?symbol=JPYUSD&token=${FINNHUB_API_KEY}`
            );
            
            if (!forexResponse.ok) {
              throw new Error(`Finnhub API error: ${forexResponse.status} ${forexResponse.statusText}`);
            }
            
            const forexData = await forexResponse.json();
            if (!forexData.rate) {
              throw new Error(`No forex rate for JPY/USD`);
            }
            usdRate = forexData.rate;
            log(`Using forex rate: 1 JPY = ${usdRate} USD`);

            // Store original values and convert to USD
            const originalPrice = Number(stock.price);
            const originalMarketCap = Number(stock.market_cap);
            
            const { error: updateError } = await supabase
              .from('stocks_v2')
              .update({
                currency: 'JPY',
                is_price_usd: false,
                original_price: originalPrice,
                original_market_cap: originalMarketCap,
                forex_rate: usdRate,
                price: Number((originalPrice * usdRate).toFixed(2)),
                market_cap: Number((originalMarketCap * usdRate).toFixed(2))
              })
              .eq('symbol', stock.symbol);

            if (updateError) throw updateError;
            log(`Updated currency info for ${stock.symbol} - Original: ¥${originalMarketCap.toLocaleString()}, USD: $${(originalMarketCap * usdRate).toLocaleString()}`);
          }

          // Calculate metrics using the correct currency values
          const grahamNumber = calculateGrahamNumber(
            stock.eps, 
            stock.book_value_per_share, 
            stock.currency || 'USD', 
            usdRate
          );
          const marginOfSafety = calculateMarginOfSafety(stock.price, grahamNumber);
          const grahamSafetyScore = calculateGrahamSafetyScore({
            currentRatioAnnual: stock.current_ratio,
            'longTermDebt/equityAnnual': stock.long_term_debt_to_equity,
            epsGrowth5Y: stock.earnings_growth_5y,
            currentDividendYieldTTM: stock.dividend_yield,
          });
          const grahamValueScore = calculateGrahamValueScore({
            epsAnnual: stock.eps,
            bookValuePerShareAnnual: stock.book_value_per_share,
            currency: stock.currency,
          }, stock.price);

          // Update stock in database
          const { error: updateError } = await supabase
            .from('stocks_v2')
            .update({
              graham_number: Number(grahamNumber.toFixed(2)),
              margin_of_safety: Number(marginOfSafety.toFixed(2)),
              graham_safety_score: grahamSafetyScore,
              graham_value_score: grahamValueScore,
              value_score: grahamValueScore,
              safety_score: grahamSafetyScore,
              last_updated: new Date().toISOString(),
            })
            .eq('symbol', stock.symbol);

          if (updateError) throw updateError;

          successCount++;
          const marketCapDisplay = stock.is_price_usd 
            ? `MC=${(stock.market_cap / 1000000).toFixed(2)}M USD` 
            : `MC=${(stock.market_cap / 1000000).toFixed(2)}M USD (${(stock.original_market_cap / 1000000).toFixed(2)}M ${stock.currency})`;
          log(`✓ ${stock.symbol}: ${marketCapDisplay}, GN=${grahamNumber.toFixed(2)}, MoS=${marginOfSafety.toFixed(2)}%, Safety=${grahamSafetyScore}, Value=${grahamValueScore}`);

        } catch (error) {
          errorCount++;
          log(`✗ Error processing ${stock.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      log(`Progress: ${offset + BATCH_SIZE >= count ? count : offset + BATCH_SIZE}/${count} stocks processed`);
    }

    log('\n=== Recalculation completed ===');
    log(`Final results: ${successCount} successful, ${errorCount} errors`);
    
    return NextResponse.json({
      message: 'Recalculation completed',
      success: successCount,
      errors: errorCount,
      total: count
    });

  } catch (error) {
    log(`\n=== FATAL ERROR ===\n${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ error: 'Recalculation failed' }, { status: 500 });
  }
} 