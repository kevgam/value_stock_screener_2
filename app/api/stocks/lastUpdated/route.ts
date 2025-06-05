import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create service role client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET() {
  try {
    // Get the most recent last_updated timestamp from the stocks table
    const { data, error } = await supabase
      .from('stocks_v2')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching last updated time:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lastUpdated: data?.last_updated || null });
  } catch (error) {
    console.error('Error in lastUpdated endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 