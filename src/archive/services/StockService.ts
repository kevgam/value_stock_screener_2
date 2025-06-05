import { Stock } from '../../domain/types/Stock';
import { FinnhubService } from '../../infrastructure/services/FinnhubService';
import { SupabaseRepository } from '../../infrastructure/database/SupabaseRepository';

export class StockService {
  private finnhubService: FinnhubService;
  private supabaseRepository: SupabaseRepository;

  constructor() {
    this.finnhubService = new FinnhubService();
    this.supabaseRepository = new SupabaseRepository();
  }

  async fetchStockData(symbol: string): Promise<Stock | null> {
    try {
      // Fetch quote data
      const quoteData = await this.finnhubService.getQuote(symbol);
      
      // Get company profile
      const profileData = await this.finnhubService.getCompanyProfile(symbol);

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
          forexRate = await this.finnhubService.getForexRate(tradingCurrency);

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
      const metricsData = await this.finnhubService.getStockMetrics(symbol);

      // Calculate Graham metrics using USD values
      const eps = metricsData.metric?.epsAnnual || 0;
      const bookValuePerShare = metricsData.metric?.bookValuePerShareAnnual || 0;
      const grahamNumber = this.calculateGrahamNumber(eps, bookValuePerShare, tradingCurrency, forexRate);
      const marginOfSafety = this.calculateMarginOfSafety(price, grahamNumber);
      const grahamSafetyScore = this.calculateGrahamSafetyScore(metricsData.metric);
      const grahamValueScore = this.calculateGrahamValueScore(metricsData.metric, price);

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

  async updateStockDatabase(stock: Stock): Promise<void> {
    try {
      await this.supabaseRepository.updateStock(stock);
    } catch (error) {
      console.error(`Failed to save ${stock.symbol}:`, error);
      throw error;
    }
  }

  async getUndervaluedStocks(): Promise<Stock[]> {
    try {
      return await this.supabaseRepository.getUndervaluedStocks();
    } catch (error) {
      console.error('Error fetching undervalued stocks:', error);
      throw error;
    }
  }

  private calculateGrahamNumber(eps: number, bookValuePerShare: number, currency: string, usdRate: number = 1): number {
    // Convert EPS and book value to USD if needed
    const epsUSD = eps * usdRate;
    const bookValuePerShareUSD = bookValuePerShare * usdRate;

    // Check for negative or zero values
    if (epsUSD <= 0 || bookValuePerShareUSD <= 0) {
      return 0;
    }

    // Calculate Graham number
    return Math.sqrt(22.5 * epsUSD * bookValuePerShareUSD);
  }

  private calculateMarginOfSafety(price: number, grahamNumber: number): number {
    if (grahamNumber <= 0) {
      return 0;
    }
    return ((grahamNumber - price) / grahamNumber) * 100;
  }

  private calculateGrahamSafetyScore(metrics: any): number {
    let score = 0;
    let totalFactors = 0;

    // Current Ratio (target: > 2)
    if (metrics.currentRatioAnnual) {
      score += Math.min(metrics.currentRatioAnnual / 2, 1);
      totalFactors++;
    }

    // Long-term Debt to Equity (target: < 0.5)
    if (metrics['longTermDebt/equityAnnual']) {
      score += Math.max(0, 1 - (metrics['longTermDebt/equityAnnual'] / 0.5));
      totalFactors++;
    }

    // Return on Equity (target: > 0.15)
    if (metrics.roe5Y) {
      score += Math.min(metrics.roe5Y / 0.15, 1);
      totalFactors++;
    }

    // Return on Assets (target: > 0.1)
    if (metrics.roa5Y) {
      score += Math.min(metrics.roa5Y / 0.1, 1);
      totalFactors++;
    }

    return totalFactors > 0 ? (score / totalFactors) * 100 : 0;
  }

  private calculateGrahamValueScore(metrics: any, price: number): number {
    let score = 0;
    let totalFactors = 0;

    // P/E Ratio (target: < 15)
    if (metrics.peAnnual) {
      score += Math.max(0, 1 - (metrics.peAnnual / 15));
      totalFactors++;
    }

    // P/B Ratio (target: < 1.5)
    if (metrics.pbAnnual) {
      score += Math.max(0, 1 - (metrics.pbAnnual / 1.5));
      totalFactors++;
    }

    // Dividend Yield (target: > 0.02)
    if (metrics.currentDividendYieldTTM) {
      score += Math.min(metrics.currentDividendYieldTTM / 0.02, 1);
      totalFactors++;
    }

    // Earnings Growth (target: > 0.05)
    if (metrics.epsGrowth5Y) {
      score += Math.min(metrics.epsGrowth5Y / 0.05, 1);
      totalFactors++;
    }

    return totalFactors > 0 ? (score / totalFactors) * 100 : 0;
  }

  async updateAvailableStocks(): Promise<{ success: boolean; message: string }> {
    try {
      const availableStocks = await this.finnhubService.getAvailableStocks();
      const stocks = await this.supabaseRepository.getStocks();
      const existingSymbols = new Set(stocks.map(stock => stock.symbol));
      
      let updatedCount = 0;
      let skippedCount = 0;
      
      for (const stock of availableStocks) {
        if (!existingSymbols.has(stock.symbol)) {
          const stockData = await this.fetchStockData(stock.symbol);
          if (stockData) {
            await this.updateStockDatabase(stockData);
            updatedCount++;
          } else {
            skippedCount++;
          }
        }
      }
      
      return {
        success: true,
        message: `Updated ${updatedCount} stocks, skipped ${skippedCount} stocks`
      };
    } catch (error) {
      console.error('Error updating available stocks:', error);
      return {
        success: false,
        message: 'Failed to update available stocks'
      };
    }
  }
} 