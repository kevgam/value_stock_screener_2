import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

export async function POST() {
  log('=== Starting database reset process ===');
  
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
    // First, count available stocks
    log('Counting available stocks...');
    const { count: availableCount, error: countError } = await supabase
      .from('available_stocks')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      log(`ERROR: Failed to count available stocks - ${countError.message}`);
      return NextResponse.json({ error: 'Failed to count available stocks' }, { status: 500 });
    }

    if (!availableCount) {
      log('ERROR: No stocks found in available_stocks table');
      return NextResponse.json({ error: 'No available stocks found' }, { status: 500 });
    }

    log(`Found ${availableCount} stocks in available_stocks table`);

    // Clear stocks_v2 table
    log('Clearing stocks_v2 table...');
    const { error: deleteError } = await supabase
      .from('stocks_v2')
      .delete()
      .neq('symbol', ''); // Delete all records

    if (deleteError) {
      log(`ERROR: Failed to clear stocks_v2 table - ${deleteError.message}`);
      return NextResponse.json({ error: 'Failed to clear stocks table' }, { status: 500 });
    }

    log('Successfully cleared stocks_v2 table');
    log('=== Database reset completed ===');
    
    return NextResponse.json({
      message: 'Database reset successful',
      availableStocks: availableCount
    });

  } catch (error) {
    log(`FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
} 