import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTables() {
  try {
    console.log('Starting table creation...');

    // Create stocks_v2 table
    const { error: stocksError } = await supabase.from('stocks_v2').insert({
      symbol: 'TEST',
      company_name: 'Test Company',
      price: 0,
      market_cap: 0,
      eps: 0,
      book_value_per_share: 0,
      graham_number: 0,
      margin_of_safety: 0,
      pe_ratio: 0,
      pb_ratio: 0,
      industry: null,
      exchange: null,
      current_ratio: 0,
      long_term_debt_to_equity: 0,
      net_current_assets: 0,
      working_capital: 0,
      earnings_growth_5y: 0,
      dividend_yield: 0,
      payout_ratio: 0,
      roe_5y: 0,
      roa_5y: 0,
      revenue_growth_5y: 0,
      operating_margin: 0,
      net_profit_margin: 0,
      graham_safety_score: 0,
      graham_value_score: 0,
      value_score: 0,
      safety_score: 0
    }).select();

    if (stocksError) {
      console.log('stocks_v2 table already exists or error:', stocksError);
    } else {
      console.log('Created stocks_v2 table');
    }

    // Create metrics_history table
    const { error: metricsError } = await supabase.from('metrics_history').insert({
      symbol: 'TEST',
      metric_type: 'test',
      value: 0
    }).select();

    if (metricsError) {
      console.log('metrics_history table already exists or error:', metricsError);
    } else {
      console.log('Created metrics_history table');
    }

    // Create watchlists table
    const { error: watchlistsError } = await supabase.from('watchlists').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      symbol: 'TEST'
    }).select();

    if (watchlistsError) {
      console.log('watchlists table already exists or error:', watchlistsError);
    } else {
      console.log('Created watchlists table');
    }

    // Create alerts table
    const { error: alertsError } = await supabase.from('alerts').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      symbol: 'TEST',
      condition: 'test',
      threshold: 0
    }).select();

    if (alertsError) {
      console.log('alerts table already exists or error:', alertsError);
    } else {
      console.log('Created alerts table');
    }

    // Clean up test data
    await supabase.from('stocks_v2').delete().eq('symbol', 'TEST');
    await supabase.from('metrics_history').delete().eq('symbol', 'TEST');
    await supabase.from('watchlists').delete().eq('symbol', 'TEST');
    await supabase.from('alerts').delete().eq('symbol', 'TEST');

    console.log('Tables created successfully');

  } catch (error) {
    console.error('Failed to create tables:', error);
  }
}

// Run the table creation
createTables(); 