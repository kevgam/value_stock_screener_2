import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateStocksToV2() {
  try {
    console.log('Starting migration...');
    
    // Get count of records to migrate
    const { count: totalCount } = await supabase
      .from('stocks')
      .select('count');
    
    console.log(`Found ${totalCount} stocks to migrate`);

    // Fetch all stocks from current table
    const { data: oldStocks, error: fetchError } = await supabase
      .from('stocks')
      .select('*');

    if (fetchError) throw fetchError;
    if (!oldStocks) {
      console.log('No stocks found to migrate');
      return;
    }

    console.log(`Fetched ${oldStocks.length} stocks for migration`);
    let successCount = 0;
    let errorCount = 0;

    // Process each stock
    for (const stock of oldStocks) {
      try {
        const newStock = {
          symbol: stock.symbol,
          company_name: stock.company_name,
          price: Number(stock.price),
          market_cap: Number(stock.market_cap || 0),
          eps: Number(stock.eps || 0),
          book_value_per_share: Number(stock.book_value_per_share || 0),
          graham_number: Number(stock.graham_number || 0),
          margin_of_safety: Number(stock.margin_of_safety || 0),
          pe_ratio: Number(stock.pe_ratio || 0),
          pb_ratio: Number(stock.pb_ratio || 0),
          last_updated: stock.last_updated,
          industry: stock.industry || null,
          exchange: stock.exchange || null,
          // Additional metrics
          current_ratio: Number(stock.current_ratio || 0),
          long_term_debt_to_equity: Number(stock.long_term_debt_to_equity || 0),
          net_current_assets: Number(stock.net_current_assets || 0),
          working_capital: Number(stock.working_capital || 0),
          earnings_growth_5y: Number(stock.earnings_growth_5y || 0),
          dividend_yield: Number(stock.dividend_yield || 0),
          payout_ratio: Number(stock.payout_ratio || 0),
          roe_5y: Number(stock.roe_5y || 0),
          roa_5y: Number(stock.roa_5y || 0),
          revenue_growth_5y: Number(stock.revenue_growth_5y || 0),
          operating_margin: Number(stock.operating_margin || 0),
          net_profit_margin: Number(stock.net_profit_margin || 0),
          graham_safety_score: Number(stock.graham_safety_score || 0),
          graham_value_score: Number(stock.graham_value_score || 0),
          value_score: Number(stock.value_score || 0),
          safety_score: Number(stock.safety_score || 0)
        };

        // Insert into new table
        const { error: insertError } = await supabase
          .from('stocks_v2')
          .upsert(newStock);

        if (insertError) throw insertError;

        // Create initial metrics history entry
        await supabase.from('metrics_history').insert([
          {
            symbol: stock.symbol,
            metric_type: 'graham_number',
            value: newStock.graham_number,
            recorded_at: stock.last_updated
          },
          {
            symbol: stock.symbol,
            metric_type: 'margin_of_safety',
            value: newStock.margin_of_safety,
            recorded_at: stock.last_updated
          }
        ]);

        successCount++;
        if (successCount % 100 === 0) {
          console.log(`Processed ${successCount} stocks...`);
        }
      } catch (error) {
        console.error(`Error migrating stock ${stock.symbol}:`, error);
        errorCount++;
      }
    }

    console.log('\nMigration completed:');
    console.log(`Total stocks processed: ${oldStocks.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateStocksToV2(); 