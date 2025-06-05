import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { updateAvailableStocks } from '@/services/stockService'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

// Create service role client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export async function POST() {
  console.log('Starting available stocks update...')
  try {
    const result = await updateAvailableStocks()
    console.log('Available stocks update completed:', result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating available stocks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  console.log('Fetching available stocks...')
  try {
    const { data, error } = await supabase
      .from('available_stocks')
      .select('*')
      .eq('exchange', 'US')
      .eq('is_active', true)
      .order('symbol')

    if (error) {
      console.error('Error fetching available stocks:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Found ${data.length} available stocks`)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in available stocks fetch:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 