import supabase from '@/utils/supabase/client';

export interface StockStats {
  totalAvailableStocks: number;
  totalStocksV2: number;
  totalStrongBuys: number;
}

export async function getStockStats(): Promise<StockStats> {
  try {
    // Get total available stocks
    const { count: availableStocksCount, error: availableStocksError } = await supabase
      .from('available_stocks')
      .select('*', { count: 'exact', head: true });

    if (availableStocksError) {
      console.error('Error fetching available stocks:', availableStocksError);
      throw availableStocksError;
    }

    // Get total stocks in stocks_v2
    const { count: stocksV2Count, error: stocksV2Error } = await supabase
      .from('stocks_v2')
      .select('*', { count: 'exact', head: true });

    if (stocksV2Error) {
      console.error('Error fetching stocks_v2:', stocksV2Error);
      throw stocksV2Error;
    }

    // Get total strong buys - using a more reliable query syntax
    const { data: strongBuysData, error: strongBuysError } = await supabase
      .from('stocks_v2')
      .select('id')
      .filter('graham_analysis', 'eq', 'Strong Buy');

    if (strongBuysError) {
      console.error('Error fetching strong buys:', strongBuysError);
      throw strongBuysError;
    }

    return {
      totalAvailableStocks: availableStocksCount || 0,
      totalStocksV2: stocksV2Count || 0,
      totalStrongBuys: strongBuysData?.length || 0
    };
  } catch (error) {
    console.error('Error fetching stock stats:', error);
    throw error;
  }
}

export interface StockDataStats {
  availableStocksCount: number;
  stocksV2Count: number;
  displayedStocksCount: number;
  strongBuysCount: number;
  strongBuysPercentage: number;
}

interface Stock {
  industry?: string;
  market_cap?: number;
  graham_analysis?: string;
}

export class StockDataService {
  constructor() {
    console.log('Initializing StockDataService...');
  }

  async getStockDataStats(): Promise<StockDataStats> {
    try {
      console.log('Fetching stock data stats...');

      // Get available stocks count
      console.log('Fetching available stocks count...');
      const { count: availableStocksCount, error: availableStocksError } = await supabase
        .from('available_stocks')
        .select('*', { count: 'exact', head: true });

      if (availableStocksError) {
        console.error('Error fetching available stocks:', availableStocksError);
        throw availableStocksError;
      }

      console.log('Available stocks count:', availableStocksCount);

      // Get stocks_v2 count
      console.log('Fetching stocks_v2 count...');
      const { count: stocksV2Count, error: stocksV2Error } = await supabase
        .from('stocks_v2')
        .select('*', { count: 'exact', head: true });

      if (stocksV2Error) {
        console.error('Error fetching stocks_v2:', stocksV2Error);
        throw stocksV2Error;
      }

      console.log('Stocks_v2 count:', stocksV2Count);

      // Get strong buys count
      console.log('Fetching strong buys count...');
      const { count: strongBuysCount, error: strongBuysError } = await supabase
        .from('stocks_v2')
        .select('*', { count: 'exact', head: true })
        .eq('graham_analysis', 'Strong Buy');

      if (strongBuysError) {
        console.error('Error fetching strong buys:', strongBuysError);
        // Try alternative query if the first one fails
        const { count: altStrongBuysCount, error: altStrongBuysError } = await supabase
          .from('stocks_v2')
          .select('*', { count: 'exact', head: true })
          .filter('graham_analysis', 'eq', 'Strong Buy');

        if (altStrongBuysError) {
          console.error('Error with alternative strong buys query:', altStrongBuysError);
          throw altStrongBuysError;
        }
        console.log('Strong buys count (alternative query):', altStrongBuysCount);
      } else {
        console.log('Strong buys count:', strongBuysCount);
      }

      // Calculate displayed stocks (stocks_v2 with valid data)
      console.log('Fetching displayed stocks count...');
      const { count: displayedStocksCount, error: displayedStocksError } = await supabase
        .from('stocks_v2')
        .select('*', { count: 'exact', head: true })
        .not('graham_analysis', 'is', null);

      if (displayedStocksError) {
        console.error('Error fetching displayed stocks:', displayedStocksError);
        throw displayedStocksError;
      }

      console.log('Displayed stocks count:', displayedStocksCount);

      // Calculate strong buys percentage
      console.log('Calculating strong buys percentage...');
      const strongBuysPercentage = displayedStocksCount > 0
        ? ((strongBuysCount || 0) / displayedStocksCount) * 100
        : 0;

      console.log('Strong buys percentage:', strongBuysPercentage.toFixed(2) + '%');

      const stats: StockDataStats = {
        availableStocksCount: availableStocksCount || 0,
        stocksV2Count: stocksV2Count || 0,
        displayedStocksCount: displayedStocksCount || 0,
        strongBuysCount: strongBuysCount || 0,
        strongBuysPercentage
      };

      console.log('Final stats:', {
        ...stats,
        strongBuysPercentage: stats.strongBuysPercentage.toFixed(2) + '%'
      });

      return stats;

    } catch (error) {
      console.error('Error in getStockDataStats:', error);
      throw error;
    }
  }

  async getStrongBuysByIndustry(): Promise<Record<string, number>> {
    try {
      console.log('Fetching strong buys by industry...');
      const { data, error } = await supabase
        .from('stocks_v2')
        .select('industry, graham_analysis')
        .eq('graham_analysis', 'Strong Buy');

      if (error) {
        console.error('Error fetching strong buys by industry:', error);
        throw error;
      }

      const industryCounts = data.reduce((acc: Record<string, number>, stock: Stock) => {
        const industry = stock.industry || 'Unknown';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Strong buys by industry:', industryCounts);
      return industryCounts;
    } catch (error) {
      console.error('Error in getStrongBuysByIndustry:', error);
      throw error;
    }
  }

  async getStrongBuysByMarketCap(): Promise<Record<string, number>> {
    try {
      console.log('Fetching strong buys by market cap...');
      const { data, error } = await supabase
        .from('stocks_v2')
        .select('market_cap, graham_analysis')
        .eq('graham_analysis', 'Strong Buy');

      if (error) {
        console.error('Error fetching strong buys by market cap:', error);
        throw error;
      }

      const marketCapRanges = {
        'Small Cap (<$2B)': 0,
        'Mid Cap ($2B-$10B)': 0,
        'Large Cap ($10B-$200B)': 0,
        'Mega Cap (>$200B)': 0
      };

      data.forEach((stock: Stock) => {
        const marketCap = stock.market_cap || 0;
        if (marketCap < 2e9) marketCapRanges['Small Cap (<$2B)']++;
        else if (marketCap < 10e9) marketCapRanges['Mid Cap ($2B-$10B)']++;
        else if (marketCap < 200e9) marketCapRanges['Large Cap ($10B-$200B)']++;
        else marketCapRanges['Mega Cap (>$200B)']++;
      });

      console.log('Strong buys by market cap:', marketCapRanges);
      return marketCapRanges;
    } catch (error) {
      console.error('Error in getStrongBuysByMarketCap:', error);
      throw error;
    }
  }
} 