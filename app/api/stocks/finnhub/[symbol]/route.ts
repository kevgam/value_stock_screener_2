import { NextResponse } from 'next/server';

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // Fetch quote data
    const quoteResponse = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    if (!quoteResponse.ok) {
      throw new Error(`Failed to fetch quote: ${quoteResponse.statusText}`);
    }
    const quoteData = await quoteResponse.json();

    // Get company profile
    const profileResponse = await fetch(
      `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`
    );
    if (!profileResponse.ok) {
      throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`);
    }
    const profileData = await profileResponse.json();

    // Get company metrics
    const metricsResponse = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
    );
    if (!metricsResponse.ok) {
      throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
    }
    const metricsData = await metricsResponse.json();

    // Return all the raw data
    return NextResponse.json({
      quote: quoteData,
      profile: profileData,
      metrics: metricsData
    });
  } catch (error) {
    console.error(`Error fetching Finnhub data for ${params.symbol}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Finnhub data' },
      { status: 500 }
    );
  }
} 