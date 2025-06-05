import axios from 'axios'
import { Stock } from '@/types/stock'
import { popularUSStocks } from '@/src/archive/archive/data/stockSymbols'
import { createClient } from '@supabase/supabase-js'

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// Configuration
const API_CALLS_PER_MINUTE = 60
const DELAY_BETWEEN_CALLS = (60 * 1000) / API_CALLS_PER_MINUTE // in milliseconds
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

export const calculateGrahamNumber = (eps: number, bookValuePerShare: number, currency: string, usdRate: number = 1): number => {
  // Convert EPS and book value to USD if needed
  const epsUSD = eps * usdRate;
  const bookValuePerShareUSD = bookValuePerShare * usdRate;
  
  // If either EPS or book value is negative or zero, return 0
  if (epsUSD <= 0 || bookValuePerShareUSD <= 0) {
    return 0;
  }
  
  return Math.sqrt(22.5 * epsUSD * bookValuePerShareUSD);
}

const calculateMarginOfSafety = (price: number, grahamNumber: number): number => {
  if (!price || !grahamNumber || grahamNumber <= 0) return 0;
  
  // Ensure price is positive
  if (price <= 0) return 0;
  
  const margin = ((grahamNumber - price) / grahamNumber) * 100;
  
  // Cap margin at 100% and ensure it's not negative
  return Math.min(Math.max(margin, 0), 100);
}

const calculateGrahamSafetyScore = (metrics: any): number => {
  let score = 0
  const maxScore = 100

  // 1. Current Ratio (should be > 2)
  if (metrics.currentRatioAnnual >= 2) score += 25
  else if (metrics.currentRatioAnnual >= 1.5) score += 12.5

  // 2. Long-term Debt to Equity (should be < 0.5)
  if (metrics['longTermDebt/equityAnnual'] <= 0.5) score += 35
  else if (metrics['longTermDebt/equityAnnual'] <= 1) score += 17.5

  // 3. Earnings Stability (positive EPS for past 5 years)
  if (metrics.epsGrowth5Y > 0) score += 20
  else if (metrics.epsGrowth5Y === 0) score += 10

  // 4. Dividend Record (consistent dividends)
  if (metrics.currentDividendYieldTTM > 0) score += 20
  
  return score
}

const calculateGrahamValueScore = (metrics: any, price: number): number => {
  let score = 0;
  const maxScore = 100;

  // 1. P/E Ratio (should be < 15)
  const peRatio = metrics.epsAnnual > 0 ? price / metrics.epsAnnual : Infinity;
  if (peRatio <= 15) score += 30;
  else if (peRatio <= 20) score += 15;

  // 2. P/B Ratio (should be < 1.5, ideally < 1.2)
  const pbRatio = metrics.bookValuePerShareAnnual > 0 ? price / metrics.bookValuePerShareAnnual : Infinity;
  if (pbRatio <= 1.2) score += 30;
  else if (pbRatio <= 1.5) score += 15;

  // 3. Margin of Safety (should be > 35%)
  const grahamNumber = calculateGrahamNumber(metrics.epsAnnual, metrics.bookValuePerShareAnnual, metrics.currency);
  const marginOfSafety = calculateMarginOfSafety(price, grahamNumber);
  if (marginOfSafety >= 35) score += 40;
  else if (marginOfSafety >= 20) score += 20;

  return score;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchStockData(symbol: string): Promise<Stock | null> {
  try {
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
    const profileData = await profileResponse.json();

    // Get trading currency and validate data
    const tradingCurrency = profileData.currency || 'USD';
    const isUSD = tradingCurrency === 'USD';
    
    // Skip if price or market cap is 0 or undefined
    if (!quoteData.c || quoteData.c === 0 || !profileData.marketCapitalization || profileData.marketCapitalization === 0) {
      console.log(`Skipping ${symbol} - price or market cap is 0 or undefined`);
      return null;
    }

    // Store original values
    const originalPrice = quoteData.c;
    const originalMarketCap = profileData.marketCapitalization;
    let price = originalPrice;
    let marketCap = originalMarketCap;
    let forexRate = 1;

    // Convert to USD if needed
    if (!isUSD) {
      try {
        console.log(`Converting ${symbol} from ${tradingCurrency} to USD`);
        const forexResponse = await fetch(
          `${FINNHUB_BASE_URL}/forex/exchange?symbol=${tradingCurrency}USD&token=${FINNHUB_API_KEY}`
        );

        if (!forexResponse.ok) {
          throw new Error(`Failed to fetch forex rate: ${forexResponse.statusText}`);
        }

        const forexData = await forexResponse.json();
        console.log(`Raw forex response for ${symbol} (${tradingCurrency}/USD):`, forexData);
        
        if (!forexData || typeof forexData !== 'object') {
          throw new Error(`Invalid forex response format for ${tradingCurrency}: ${JSON.stringify(forexData)}`);
        }

        if (!forexData.rate || typeof forexData.rate !== 'number' || forexData.rate <= 0) {
          throw new Error(`Invalid forex rate for ${tradingCurrency}: ${forexData.rate}`);
        }

        forexRate = forexData.rate;
        console.log(`Valid forex rate obtained for ${tradingCurrency}/USD: ${forexRate}`);

        // Store original values before conversion
        const originalPrice = price;
        const originalMarketCap = marketCap;

        // Convert values to USD
        price = Number((originalPrice * forexRate).toFixed(2));
        marketCap = Number((originalMarketCap * forexRate).toFixed(2));

        console.log(`Conversion details for ${symbol}:
          - Original Price: ${originalPrice} ${tradingCurrency} -> ${price} USD (rate: ${forexRate})
          - Original Market Cap: ${originalMarketCap} ${tradingCurrency} -> ${marketCap} USD (rate: ${forexRate})`);
      } catch (error) {
        console.error(`Failed to convert currency for ${symbol}:`, error);
        return null;
      }
    }

    // Fetch financial metrics
    const metricsResponse = await fetch(
      `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`
    );

    if (!metricsResponse.ok) {
      throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
    }

    const metricsData = await metricsResponse.json();

    // Calculate Graham metrics using USD values
    const eps = metricsData.metric?.epsAnnual || 0;
    const bookValuePerShare = metricsData.metric?.bookValuePerShareAnnual || 0;
    const grahamNumber = calculateGrahamNumber(eps, bookValuePerShare, tradingCurrency, forexRate);
    const marginOfSafety = calculateMarginOfSafety(price, grahamNumber);
    const grahamSafetyScore = calculateGrahamSafetyScore(metricsData.metric);
    const grahamValueScore = calculateGrahamValueScore(metricsData.metric, price);

    // Create stock object with all values in their proper currencies
    const stock: Stock = {
      symbol,
      company_name: profileData.name || symbol,
      price,
      pe_ratio: price / eps || 0,
      pb_ratio: price / bookValuePerShare || 0,
      graham_number: Number(grahamNumber.toFixed(2)),
      margin_of_safety: Number(marginOfSafety.toFixed(2)),
      eps,
      book_value_per_share: bookValuePerShare,
      last_updated: new Date().toISOString(),
      industry: profileData.finnhubIndustry || null,
      market_cap: marketCap,
      exchange: profileData.exchange || null,
      // Currency information
      currency: tradingCurrency,
      is_price_usd: isUSD,
      original_price: originalPrice,
      original_market_cap: originalMarketCap,
      forex_rate: forexRate,
      // Additional metrics
      current_ratio: metricsData.metric?.currentRatioAnnual || null,
      long_term_debt_to_equity: metricsData.metric?.['longTermDebt/equityAnnual'] || null,
      net_current_assets: metricsData.metric?.netCurrentAssets || null,
      working_capital: metricsData.metric?.workingCapital || null,
      earnings_growth_5y: metricsData.metric?.epsGrowth5Y || null,
      dividend_yield: metricsData.metric?.currentDividendYieldTTM || null,
      payout_ratio: metricsData.metric?.payoutRatioAnnual || null,
      roe_5y: metricsData.metric?.roe5Y || null,
      roa_5y: metricsData.metric?.roa5Y || null,
      revenue_growth_5y: metricsData.metric?.revenueGrowth5Y || null,
      operating_margin: metricsData.metric?.operatingMarginAnnual || null,
      net_profit_margin: metricsData.metric?.netProfitMarginAnnual || null,
      graham_safety_score: grahamSafetyScore,
      graham_value_score: grahamValueScore,
      value_score: grahamValueScore,
      safety_score: grahamSafetyScore
    };

    return stock;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return null;
  }
}

export const updateStockDatabase = async (stock: Stock): Promise<void> => {
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First, check if the stock exists
    const { data: existingStock, error: checkError } = await supabase
      .from('stocks_v2')
      .select('symbol')
      .eq('symbol', stock.symbol)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Error checking stock ${stock.symbol}: ${checkError.message}`);
    }

    // Format the market cap properly
    const formattedStock = {
      ...stock,
      market_cap: Number((stock.market_cap ?? 0).toFixed(2)), // Ensure market cap is properly formatted
      original_market_cap: Number((stock.original_market_cap ?? 0).toFixed(2)) // Ensure original market cap is properly formatted
    };

    let result;
    if (existingStock) {
      // Update existing stock
      console.log(`Updating existing stock ${stock.symbol}...`);
      result = await supabase
        .from('stocks_v2')
        .update(formattedStock)
        .eq('symbol', stock.symbol);
    } else {
      // Insert new stock
      console.log(`Inserting new stock ${stock.symbol}...`);
      result = await supabase
        .from('stocks_v2')
        .insert(formattedStock);
    }

    if (result.error) {
      throw new Error(`Error saving stock ${stock.symbol}: ${result.error.message}`);
    }

    console.log(`Successfully saved ${stock.symbol} to database`);
  } catch (error) {
    console.error(`Failed to save ${stock.symbol}:`, error);
    throw error;
  }
}

export const getUndervaluedStocks = async (): Promise<Stock[]> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stocks`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to fetch stocks')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching undervalued stocks:', error)
    throw error
  }
}

// Function to get a stock by symbol from the database
async function getStockBySymbol(symbol: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('stocks_v2')
    .select('*')
    .eq('symbol', symbol)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null;
    }
    console.error(`Error fetching stock ${symbol}:`, error);
    return null;
  }

  return data;
}

// Function to check if a stock was recently updated
function isRecentUpdate(lastUpdated: string): boolean {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  return new Date(lastUpdated) > twentyFourHoursAgo;
}

interface AvailableStock {
  symbol: string;
  last_updated?: string;
}

// Function to get available stocks from database
async function getAvailableStocks(): Promise<AvailableStock[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('available_stocks')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching available stocks:', error);
    throw error;
  }

  return data;
}

async function fetchBatchStockQuotes(symbols: string[]): Promise<Record<string, any>> {
  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbols.join(',')}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch batch quotes: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching batch quotes:', error);
    throw error;
  }
}

interface CustomWriter {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

export async function loadStocks(
  writer: CustomWriter,
  encoder: TextEncoder
) {
  try {
    console.log('Service: Starting loadStocks function');
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get available stocks
    const availableStocks = await getAvailableStocks();
    const stocksToFetch = process.env.NEXT_PUBLIC_TEST_MODE === 'true'
      ? availableStocks.slice(0, 250).map((stock: AvailableStock) => stock.symbol)
      : availableStocks.map((stock: AvailableStock) => stock.symbol);

    console.log(`Service: Found ${stocksToFetch.length} stocks to process${process.env.NEXT_PUBLIC_TEST_MODE === 'true' ? ' (TEST MODE - limited to 250)' : ''}`);

    // First, check which stocks need updating in bulk
    const { data: existingStocks, error: fetchError } = await supabase
      .from('stocks_v2')
      .select('symbol, last_updated')
      .in('symbol', stocksToFetch);

    if (fetchError) {
      throw new Error(`Error fetching existing stocks: ${fetchError.message}`);
    }

    // Create a map of recently updated stocks
    const recentlyUpdated = new Set(
      existingStocks
        ?.filter((stock: { symbol: string; last_updated: string }) => isRecentUpdate(stock.last_updated))
        .map((stock: { symbol: string }) => stock.symbol) || []
    );

    // Filter out recently updated stocks
    const stocksToUpdate = stocksToFetch.filter(symbol => !recentlyUpdated.has(symbol));
    const skippedCount = stocksToFetch.length - stocksToUpdate.length;

    console.log(`Service: ${skippedCount} stocks recently updated, ${stocksToUpdate.length} stocks to update`);

    let successCount = 0;
    let errorCount = 0;
    let totalChecked = 0;

    // Process stocks in larger batches to better utilize rate limits
    const batchSize = 30;
    const totalBatches = Math.ceil(stocksToUpdate.length / batchSize);
    let currentBatch = 1;

    // Rate limiting configuration
    const MAX_CALLS_PER_MINUTE = 55;
    const MAX_CALLS_PER_SECOND = 25;
    let apiCallsInLastMinute = 0;
    let apiCallsInLastSecond = 0;
    let lastMinuteStart = Date.now();
    let lastSecondStart = Date.now();

    // Send initial progress update
    console.log('Service: Sending initial progress update');
    await writer.write(`data: ${JSON.stringify({
      current: 0,
      total: stocksToUpdate.length,
      success: 0,
      errors: 0,
      skipped: skippedCount,
      checked: 0,
      message: `Starting stock database refresh for ${stocksToUpdate.length} stocks (${skippedCount} recently updated)...`
    })}\n\n`);

    for (let i = 0; i < stocksToUpdate.length; i += batchSize) {
      const batch = stocksToUpdate.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${currentBatch}/${totalBatches} (${batch.length} stocks)...`);

      // Process stocks in parallel within rate limits
      const processStock = async (symbol: string) => {
        try {
          // Check rate limits
          const now = Date.now();
          
          // Reset counters if time windows have passed
          if (now - lastMinuteStart >= 60000) {
            apiCallsInLastMinute = 0;
            lastMinuteStart = now;
          }
          if (now - lastSecondStart >= 1000) {
            apiCallsInLastSecond = 0;
            lastSecondStart = now;
          }

          // Wait if we're approaching rate limits
          if (apiCallsInLastMinute >= MAX_CALLS_PER_MINUTE) {
            const waitTime = 60000 - (now - lastMinuteStart);
            console.log(`  ⏳ Rate limit approaching (minute), waiting ${Math.ceil(waitTime/1000)}s...`);
            await delay(waitTime);
            apiCallsInLastMinute = 0;
            lastMinuteStart = Date.now();
          }
          if (apiCallsInLastSecond >= MAX_CALLS_PER_SECOND) {
            const waitTime = 1000 - (now - lastSecondStart);
            await delay(waitTime);
            apiCallsInLastSecond = 0;
            lastSecondStart = Date.now();
          }

          apiCallsInLastMinute++;
          apiCallsInLastSecond++;
          totalChecked++;

          const stockData = await fetchStockData(symbol);
          if (stockData) {
            console.log(`  ✅ Successfully fetched data for ${symbol}`);
            await updateStockDatabase(stockData);
            successCount++;
          } else {
            console.log(`  ❌ Failed to fetch data for ${symbol}`);
            errorCount++;
          }

          // Send progress update
          await writer.write(`data: ${JSON.stringify({
            current: i + batch.length,
            total: stocksToUpdate.length,
            success: successCount,
            errors: errorCount,
            skipped: skippedCount,
            checked: totalChecked,
            message: `Processing batch ${currentBatch}/${totalBatches} (${Math.round((totalChecked / stocksToUpdate.length) * 100)}% complete)...`
          })}\n\n`);
        } catch (error: unknown) {
          console.error(`  ❌ Error processing ${symbol}:`, error);
          errorCount++;
        }
      };

      // Process stocks in parallel, but limit concurrent operations
      const concurrentLimit = 5;
      for (let j = 0; j < batch.length; j += concurrentLimit) {
        const currentBatch = batch.slice(j, j + concurrentLimit);
        await Promise.all(currentBatch.map(processStock));
      }

      currentBatch++;
    }

    console.log('\n=== Stock Database Refresh Completed ===');
    console.log(`Total Stocks in Database: ${stocksToFetch.length}`);
    console.log(`Total Stocks Checked: ${totalChecked}`);
    console.log(`Successfully Updated: ${successCount} stocks`);
    console.log(`Failed to Update: ${errorCount} stocks`);
    console.log(`Skipped (Recently Updated): ${skippedCount} stocks\n`);

    // Send final update
    console.log('Service: Sending final update');
    await writer.write(`data: ${JSON.stringify({
      current: stocksToUpdate.length,
      total: stocksToUpdate.length,
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      checked: totalChecked,
      message: 'Stock database refresh completed!',
      completed: true
    })}\n\n`);

    return { 
      success: true, 
      count: successCount, 
      errors: errorCount, 
      skipped: skippedCount,
      checked: totalChecked,
      total: stocksToFetch.length
    };
  } catch (error) {
    console.error('Service: Error in loadStocks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await writer.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    throw error;
  }
}

// Function to fetch all US stock symbols from Finnhub
export async function fetchAllUSStocks(): Promise<{ symbol: string; description: string }[]> {
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/symbol`, {
      params: {
        exchange: 'US',
        token: FINNHUB_API_KEY,
      },
    });
    
    console.log('Fetching US stocks from Finnhub...');
    
    if (!response.data) {
      throw new Error('No data received from Finnhub API');
    }

    // Filter for common stocks only
    const stocks = response.data.filter((stock: any) => stock.type === 'Common Stock');
    console.log(`Found ${stocks.length} common stocks`);
    
    return stocks;
  } catch (error) {
    console.error('Error fetching US stocks:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch US stocks: ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
}

// Function to update available stocks in database
export async function updateAvailableStocks(
  writer: { write: (data: string) => Promise<void>; close: () => Promise<void> },
  encoder: TextEncoder
) {
  try {
    console.log('\n=== Starting Available Stocks Update ===');
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Configuration for rate limiting
    const MAX_CALLS_PER_MINUTE = 55;
    const MAX_CALLS_PER_SECOND = 25;
    const BATCH_SIZE = 30;
    let apiCallsInLastMinute = 0;
    let apiCallsInLastSecond = 0;
    let lastMinuteReset = Date.now();
    let lastSecondReset = Date.now();

    console.log('Fetching all US stocks from Finnhub...');
    const stocks = await fetchAllUSStocks();
    console.log(`Found ${stocks.length} stocks to process\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let currentBatch = 1;
    const totalBatches = Math.ceil(stocks.length / BATCH_SIZE);

    // Process in batches
    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
      const batch = stocks.slice(i, Math.min(i + BATCH_SIZE, stocks.length));
      console.log(`\nProcessing batch ${currentBatch}/${totalBatches} (${batch.length} stocks)...`);

      // Reset rate limit counters
      const now = Date.now();
      if (now - lastMinuteReset >= 60000) {
        apiCallsInLastMinute = 0;
        lastMinuteReset = now;
      }
      if (now - lastSecondReset >= 1000) {
        apiCallsInLastSecond = 0;
        lastSecondReset = now;
      }

      // Check rate limits
      if (apiCallsInLastMinute >= MAX_CALLS_PER_MINUTE) {
        console.log('Reached minute rate limit, waiting...');
        await delay(60000 - (now - lastMinuteReset));
        apiCallsInLastMinute = 0;
        lastMinuteReset = Date.now();
      }
      if (apiCallsInLastSecond >= MAX_CALLS_PER_SECOND) {
        console.log('Reached second rate limit, waiting...');
        await delay(1000 - (now - lastSecondReset));
        apiCallsInLastSecond = 0;
        lastSecondReset = Date.now();
      }

      // Process each stock in the batch
      const validStocks = [];
      for (const stock of batch) {
        try {
          apiCallsInLastMinute++;
          apiCallsInLastSecond++;

          // Validate stock data
          const stockData = await fetchStockData(stock.symbol);
          if (!stockData || stockData.price === 0 || stockData.market_cap === 0) {
            console.log(`  ❌ Skipping invalid stock: ${stock.symbol}`);
            skippedCount++;
            continue;
          }

          validStocks.push({
            symbol: stock.symbol,
            company_name: stock.description,
            exchange: 'US',
            is_active: true,
            last_updated: new Date().toISOString()
          });
          successCount++;
        } catch (error) {
          console.error(`  ❌ Error processing ${stock.symbol}:`, error);
          errorCount++;
        }
      }

      // Upsert valid stocks
      if (validStocks.length > 0) {
        const { error } = await supabase
          .from('available_stocks')
          .upsert(validStocks);

        if (error) {
          console.error(`  ❌ Error saving batch ${currentBatch}:`, error.message);
          errorCount += validStocks.length;
          successCount -= validStocks.length;
        } else {
          console.log(`  ✅ Successfully saved batch ${currentBatch}`);
        }
      }

      // Send progress update
      const progressData = {
        current: i + batch.length,
        total: stocks.length,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount,
        checked: i + batch.length,
        message: `Processing batch ${currentBatch}/${totalBatches} (${Math.round(((i + batch.length) / stocks.length) * 100)}% complete)...`
      };
      console.log(progressData.message);
      await writer.write(`data: ${JSON.stringify(progressData)}\n\n`);
      
      currentBatch++;

      // Add a small delay between batches
      if (i + BATCH_SIZE < stocks.length) {
        await delay(1000);
      }
    }

    // Send final update
    const finalData = {
      current: stocks.length,
      total: stocks.length,
      success: successCount,
      errors: errorCount,
      skipped: skippedCount,
      checked: stocks.length,
      message: 'Available stocks update completed!',
      completed: true
    };
    console.log(finalData.message);
    await writer.write(`data: ${JSON.stringify(finalData)}\n\n`);

    return { 
      success: true,
      total: stocks.length,
      successCount: successCount,
      errors: errorCount,
      skipped: skippedCount
    };
  } catch (error) {
    console.error('Error updating available stocks:', error);
    throw error;
  }
}

export async function cleanupInvalidStocks(
  writer: { write: (data: string) => Promise<void>; close: () => Promise<void> },
  encoder: TextEncoder
) {
  try {
    console.log('Starting cleanup of invalid stocks...');
    await writer.write(`data: ${JSON.stringify({
      current: 0,
      total: 0,
      deleted: 0,
      message: 'Starting cleanup of invalid stocks...'
    })}\n\n`);
    
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First, find invalid stocks in the stocks table
    const { data: invalidStocks, error: countError } = await supabase
      .from('stocks_v2')
      .select('symbol')
      .or('price.eq.0,price.is.null,market_cap.eq.0,market_cap.is.null');

    if (countError) {
      throw new Error(`Error counting invalid stocks: ${countError.message}`);
    }

    const invalidSymbols = invalidStocks?.map(stock => stock.symbol) || [];
    const totalStocks = invalidSymbols.length;

    // Send initial progress update
    await writer.write(`data: ${JSON.stringify({
      current: 0,
      total: totalStocks,
      deleted: 0,
      message: `Found ${totalStocks} invalid stocks to clean up...`
    })}\n\n`);

    // Delete invalid stocks from stocks table
    const { error: deleteError } = await supabase
      .from('stocks_v2')
      .delete()
      .in('symbol', invalidSymbols);

    if (deleteError) {
      throw new Error(`Error deleting invalid stocks: ${deleteError.message}`);
    }

    // Also delete these symbols from available_stocks table
    if (invalidSymbols.length > 0) {
      const { error: availableDeleteError } = await supabase
        .from('available_stocks')
        .delete()
        .in('symbol', invalidSymbols);

      if (availableDeleteError) {
        throw new Error(`Error deleting from available_stocks: ${availableDeleteError.message}`);
      }
    }

    // Send final update
    await writer.write(`data: ${JSON.stringify({
      current: totalStocks,
      total: totalStocks,
      deleted: totalStocks,
      message: `Successfully cleaned up ${totalStocks} invalid stocks from both tables`,
      completed: true
    })}\n\n`);

    console.log(`Cleaned up ${totalStocks} invalid stocks from both tables`);
    return { 
      total: totalStocks,
      deleted: totalStocks
    };
  } catch (error) {
    console.error('Error in cleanupInvalidStocks:', error);
    await writer.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    throw error;
  }
}

export async function cleanupAvailableStocks(
  writer: { write: (data: string) => Promise<void>; close: () => Promise<void> },
  encoder: TextEncoder
) {
  try {
    console.log('Starting cleanup of available_stocks table...');
    await writer.write(`data: ${JSON.stringify({
      current: 0,
      total: 0,
      deleted: 0,
      message: 'Starting cleanup of available stocks...'
    })}\n\n`);
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Configuration for rate limiting and parallel processing
    const MAX_CALLS_PER_MINUTE = 55;
    const MAX_CALLS_PER_SECOND = 25;
    const BATCH_SIZE = 30;
    const CONCURRENT_BATCHES = 2;
    const TOTAL_CONCURRENT = BATCH_SIZE * CONCURRENT_BATCHES;

    let totalInvalidSymbols: string[] = [];
    let totalCheckedCount = 0;
    let iteration = 1;

    // Continue processing until no more stocks need checking
    while (true) {
      // Get stocks that haven't been checked in the last 12 hours
      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
      const twelveHoursAgoISO = twelveHoursAgo.toISOString();

      console.log(`\nIteration ${iteration}: Looking for stocks last updated before ${twelveHoursAgoISO}`);

      const { data: availableStocks, error: fetchError } = await supabase
        .from('available_stocks')
        .select('symbol, last_updated')
        .or(`last_updated.is.null,last_updated.lt.${twelveHoursAgoISO}`)
        .eq('is_active', true);

      if (fetchError) {
        throw new Error(`Error fetching available stocks: ${fetchError.message}`);
      }

      if (!availableStocks || availableStocks.length === 0) {
        console.log(`No more stocks need checking (all checked within last 12 hours)`);
        break;
      }

      console.log(`Iteration ${iteration}: Found ${availableStocks.length} stocks to check`);
      const symbols = availableStocks.map(stock => stock.symbol);

      let invalidSymbols: string[] = [];
      let checkedCount = 0;
      let apiCallsInLastMinute = 0;
      let apiCallsInLastSecond = 0;
      let lastMinuteStart = Date.now();
      let lastSecondStart = Date.now();

      // Process stocks in parallel batches
      for (let i = 0; i < symbols.length; i += TOTAL_CONCURRENT) {
        const currentBatch = symbols.slice(i, i + TOTAL_CONCURRENT);
        const batches = [];
        
        // Split into smaller batches for concurrent processing
        for (let j = 0; j < currentBatch.length; j += BATCH_SIZE) {
          batches.push(currentBatch.slice(j, j + BATCH_SIZE));
        }

        // Process batches concurrently
        const batchResults = await Promise.all(
          batches.map(async (batch) => {
            // Check rate limits
            const now = Date.now();
            
            // Reset counters if time windows have passed
            if (now - lastMinuteStart >= 60000) {
              apiCallsInLastMinute = 0;
              lastMinuteStart = now;
            }
            if (now - lastSecondStart >= 1000) {
              apiCallsInLastSecond = 0;
              lastSecondStart = now;
            }

            // Wait if we're approaching rate limits
            if (apiCallsInLastMinute >= MAX_CALLS_PER_MINUTE) {
              const waitTime = 60000 - (now - lastMinuteStart);
              console.log(`  ⏳ Rate limit approaching (minute), waiting ${Math.ceil(waitTime/1000)}s...`);
              await delay(waitTime);
              apiCallsInLastMinute = 0;
              lastMinuteStart = Date.now();
            }
            if (apiCallsInLastSecond >= MAX_CALLS_PER_SECOND) {
              const waitTime = 1000 - (now - lastSecondStart);
              await delay(waitTime);
              apiCallsInLastSecond = 0;
              lastSecondStart = Date.now();
            }

            // Process stocks in parallel within the batch
            const results = await Promise.all(
              batch.map(async (symbol) => {
                try {
                  apiCallsInLastMinute++;
                  apiCallsInLastSecond++;
                  checkedCount++;
                  totalCheckedCount++;

                  const stockData = await fetchStockData(symbol);
                  if (!stockData || stockData.price === 0 || stockData.market_cap === 0) {
                    console.log(`  ❌ Found invalid stock: ${symbol}`);
                    return symbol;
                  }
                  return null;
                } catch (error) {
                  console.error(`  ❌ Error checking ${symbol}:`, error);
                  return symbol;
                }
              })
            );

            return results.filter(Boolean) as string[];
          })
        );

        // Flatten results and add to invalid symbols
        const newInvalidSymbols = batchResults.flat();
        invalidSymbols = invalidSymbols.concat(newInvalidSymbols);
        totalInvalidSymbols = totalInvalidSymbols.concat(newInvalidSymbols);

        // Delete invalid symbols from available_stocks immediately
        if (newInvalidSymbols.length > 0) {
          const { error: deleteError } = await supabase
            .from('available_stocks')
            .delete()
            .in('symbol', newInvalidSymbols);

          if (deleteError) {
            console.error('Error deleting invalid stocks:', deleteError);
          } else {
            console.log(`Deleted ${newInvalidSymbols.length} invalid stocks from available_stocks table`);
          }
        }

        // Update last_updated timestamp for valid stocks
        const validSymbols = currentBatch.filter(symbol => !newInvalidSymbols.includes(symbol));
        if (validSymbols.length > 0) {
          const { error: updateError } = await supabase
            .from('available_stocks')
            .update({ last_updated: new Date().toISOString() })
            .in('symbol', validSymbols);

          if (updateError) {
            console.error('Error updating last_updated timestamps:', updateError);
          }
        }

        // Send progress update
        const progressData = {
          current: totalCheckedCount,
          total: symbols.length,
          deleted: totalInvalidSymbols.length,
          message: `Iteration ${iteration}: Checked ${checkedCount}/${symbols.length} stocks, found ${invalidSymbols.length} invalid so far...`
        };
        console.log(progressData.message);
        await writer.write(`data: ${JSON.stringify(progressData)}\n\n`);
      }

      iteration++;
    }

    // Verify cleanup by checking if any invalid stocks remain
    const { data: remainingStocks, error: verifyError } = await supabase
      .from('available_stocks')
      .select('symbol')
      .eq('is_active', true);

    if (verifyError) {
      console.error('Error verifying cleanup:', verifyError);
    } else if (remainingStocks && remainingStocks.length > 0) {
      console.log(`Verification complete: ${remainingStocks.length} valid stocks remain in available_stocks table`);
    }

    // Send final update
    const finalData = {
      current: totalCheckedCount,
      total: totalCheckedCount,
      deleted: totalInvalidSymbols.length,
      message: `Cleanup completed after ${iteration - 1} iterations. Deleted ${totalInvalidSymbols.length} invalid stocks from available_stocks table. ${remainingStocks?.length || 0} valid stocks remain.`,
      completed: true
    };
    console.log(finalData.message);
    await writer.write(`data: ${JSON.stringify(finalData)}\n\n`);

    return { 
      total: totalCheckedCount,
      deleted: totalInvalidSymbols.length,
      remaining: remainingStocks?.length || 0,
      iterations: iteration - 1
    };
  } catch (error) {
    console.error('Error in cleanupAvailableStocks:', error);
    await writer.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    throw error;
  }
}

export async function recalculateStockMetrics(
  writer: { write: (data: string) => Promise<void>; close: () => Promise<void> },
  encoder: TextEncoder
) {
  try {
    console.log('Starting recalculation of stock metrics...');
    await writer.write(`data: ${JSON.stringify({
      current: 0,
      total: 0,
      updated: 0,
      message: 'Starting recalculation of stock metrics...'
    })}\n\n`);

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get total count of stocks first
    const { count, error: countError } = await supabase
      .from('stocks_v2')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Error counting stocks: ${countError.message}`);
    }

    const totalStocks = count || 0;
    console.log(`Found ${totalStocks} stocks to recalculate`);

    // Send initial progress update
    await writer.write(`data: ${JSON.stringify({
      current: 0,
      total: totalStocks,
      updated: 0,
      message: `Found ${totalStocks} stocks to recalculate...`
    })}\n\n`);

    // Process stocks in parallel batches
    const BATCH_SIZE = 100;
    const CONCURRENT_BATCHES = 5; // Process 5 batches concurrently
    let updatedCount = 0;
    let errorCount = 0;
    let currentPosition = 0;

    for (let offset = 0; offset < totalStocks; offset += BATCH_SIZE * CONCURRENT_BATCHES) {
      // Create batches for parallel processing
      const batchPromises = [];
      for (let i = 0; i < CONCURRENT_BATCHES; i++) {
        const currentOffset = offset + (i * BATCH_SIZE);
        if (currentOffset >= totalStocks) break;

        batchPromises.push(
          (async () => {
            // Fetch batch of stocks
            const { data: stocks, error: fetchError } = await supabase
              .from('stocks_v2')
              .select('*')
              .range(currentOffset, currentOffset + BATCH_SIZE - 1);

            if (fetchError) {
              throw new Error(`Error fetching stocks batch: ${fetchError.message}`);
            }

            if (!stocks || stocks.length === 0) {
              return;
            }

            // Process each stock in the batch
            for (let j = 0; j < stocks.length; j++) {
              const stock = stocks[j];
              
              try {
                // Get forex rate if needed
                let usdRate = 1;
                let originalMarketCap = stock.original_market_cap ?? stock.market_cap ?? 0; // Use original market cap if available
                let originalCurrency = stock.currency || 'USD'; // Default to USD if currency is null

                // If currency is null, try to determine it from the exchange
                if (!originalCurrency) {
                  if (stock.exchange === 'US' || stock.exchange === 'NYSE' || stock.exchange === 'NASDAQ') {
                    originalCurrency = 'USD';
                  } else if (stock.exchange === 'LSE') {
                    originalCurrency = 'GBP';
                  } else if (stock.exchange === 'TSE') {
                    originalCurrency = 'JPY';
                  } else if (stock.exchange === 'IDX') {
                    originalCurrency = 'IDR';
                  } else {
                    console.warn(`Unknown exchange ${stock.exchange} for ${stock.symbol}, defaulting to USD`);
                    originalCurrency = 'USD';
                  }
                }

                if (!stock.is_price_usd && originalCurrency !== 'USD') {
                  const forexResponse = await fetch(
                    `${FINNHUB_BASE_URL}/forex/exchange?symbol=${originalCurrency}USD&token=${FINNHUB_API_KEY}`
                  );
                  const forexData = await forexResponse.json();
                  
                  if (!forexData.rate) {
                    const errorMessage = `No forex rate available for ${originalCurrency} to USD for ${stock.symbol}`;
                    console.warn(errorMessage);
                    await writer.write(`data: ${JSON.stringify({
                      current: currentPosition,
                      total: totalStocks,
                      updated: updatedCount,
                      errors: errorCount,
                      message: errorMessage
                    })}\n\n`);
                    continue;
                  }
                  
                  usdRate = forexData.rate;
                  
                  // Log currency conversion details
                  const conversionMessage = `Currency conversion for ${stock.symbol}:
                    - Original Market Cap: ${originalMarketCap} ${originalCurrency}
                    - Forex Rate (${originalCurrency} to USD): ${usdRate}`;
                  
                  // Convert market cap to USD
                  const convertedMarketCap = Number((originalMarketCap * usdRate).toFixed(2));
                  stock.market_cap = convertedMarketCap;
                  console.log(`${conversionMessage}
                    - Converted Market Cap (${originalCurrency} to USD): ${convertedMarketCap} USD`);
                  
                  await writer.write(`data: ${JSON.stringify({
                    current: currentPosition,
                    total: totalStocks,
                    updated: updatedCount,
                    errors: errorCount,
                    message: conversionMessage
                  })}\n\n`);
                }

                // Recalculate metrics
                const grahamNumber = calculateGrahamNumber(stock.eps || 0, stock.book_value_per_share || 0, stock.currency || 'USD', usdRate);
                const marginOfSafety = calculateMarginOfSafety(stock.price, grahamNumber);
                const grahamSafetyScore = calculateGrahamSafetyScore({
                  currentRatioAnnual: stock.current_ratio || 0,
                  'longTermDebt/equityAnnual': stock.long_term_debt_to_equity || 0,
                  epsGrowth5Y: stock.earnings_growth_5y || 0,
                  currentDividendYieldTTM: stock.dividend_yield || 0
                });
                const grahamValueScore = calculateGrahamValueScore({
                  epsAnnual: stock.eps || 0,
                  bookValuePerShareAnnual: stock.book_value_per_share || 0,
                  currency: stock.currency || 'USD'
                }, stock.price);

                // Update stock in database
                const { error: updateError } = await supabase
                  .from('stocks_v2')
                  .update({
                    graham_number: grahamNumber,
                    margin_of_safety: marginOfSafety,
                    graham_safety_score: grahamSafetyScore,
                    graham_value_score: grahamValueScore,
                    last_updated: new Date().toISOString(),
                    currency: stock.currency,
                    market_cap: stock.market_cap ?? 0,
                    original_market_cap: originalMarketCap
                  })
                  .eq('symbol', stock.symbol);

                if (updateError) {
                  throw new Error(`Error updating stock ${stock.symbol}: ${updateError.message}`);
                }

                updatedCount++;
                currentPosition++;

                // Send progress update
                await writer.write(`data: ${JSON.stringify({
                  current: currentPosition,
                  total: totalStocks,
                  updated: updatedCount,
                  errors: errorCount,
                  message: `Recalculated metrics for ${stock.symbol} (${currentPosition}/${totalStocks})...`
                })}\n\n`);

              } catch (error: unknown) {
                console.error(`Error processing stock ${stock.symbol}:`, error);
                errorCount++;
                currentPosition++;
                await writer.write(`data: ${JSON.stringify({
                  current: currentPosition,
                  total: totalStocks,
                  updated: updatedCount,
                  errors: errorCount,
                  message: `Error processing ${stock.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
                })}\n\n`);
              }
            }
          })()
        );
      }

      // Wait for all batches in this group to complete
      await Promise.all(batchPromises);
    }

    // Send final update
    await writer.write(`data: ${JSON.stringify({
      current: totalStocks,
      total: totalStocks,
      updated: updatedCount,
      errors: errorCount,
      message: `Recalculation completed. Updated ${updatedCount} stocks, ${errorCount} errors.`,
      completed: true
    })}\n\n`);

    return {
      total: totalStocks,
      updated: updatedCount,
      errors: errorCount
    };
  } catch (error) {
    console.error('Error in recalculateStockMetrics:', error);
    await writer.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    throw error;
  }
} 