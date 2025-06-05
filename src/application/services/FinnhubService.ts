import { Stock } from '../types/stock';

export class FinnhubService {
  private baseUrl: string;
  private apiKey: string;
  private lastRequestTime: number = 0;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests

  constructor() {
    if (!process.env.NEXT_PUBLIC_FINNHUB_API_KEY) {
      throw new Error('NEXT_PUBLIC_FINNHUB_API_KEY environment variable is not set');
    }
    this.baseUrl = process.env.FINNHUB_BASE_URL || 'https://finnhub.io/api/v1';
    this.apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  }

  private async delay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  async getAvailableStocks(): Promise<Array<{ symbol: string; name: string }>> {
    try {
      await this.delay();
      const response = await fetch(
        `${this.baseUrl}/stock/symbol?exchange=US&token=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch available stocks: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((stock: any) => ({
        symbol: stock.symbol,
        name: stock.description
      }));
    } catch (error) {
      console.error('Error fetching available stocks:', error);
      return [];
    }
  }

  async getStockData(symbol: string): Promise<Stock | null> {
    try {
      await this.delay();
      // Fetch quote data
      const quoteResponse = await fetch(
        `${this.baseUrl}/quote?symbol=${symbol}&token=${this.apiKey}`
      );
      if (!quoteResponse.ok) {
        throw new Error(`Failed to fetch quote data: ${quoteResponse.statusText}`);
      }
      const quoteData = await quoteResponse.json();

      await this.delay();
      // Fetch company profile
      const profileResponse = await fetch(
        `${this.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`
      );
      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch company profile: ${profileResponse.statusText}`);
      }
      const profileData = await profileResponse.json();

      // Fetch forex rate if needed
      let usdRate = 1;
      if (profileData.currency && profileData.currency !== 'USD') {
        await this.delay();
        const forexResponse = await fetch(
          `${this.baseUrl}/forex/exchange?symbol=${profileData.currency}USD&token=${this.apiKey}`
        );
        if (forexResponse.ok) {
          const forexData = await forexResponse.json();
          usdRate = forexData.rate;
        }
      }

      // Handle market cap conversion based on currency
      let marketCap = quoteData.marketCap || 0;
      let originalMarketCap = marketCap;

      // For JPY, market cap is in millions of JPY
      if (profileData.currency === 'JPY') {
        marketCap = marketCap * usdRate; // Convert from millions JPY to USD
      }
      // For other non-USD currencies, market cap is in millions
      else if (profileData.currency !== 'USD') {
        marketCap = marketCap * usdRate;
      }

      // Create stock object
      const stock: Stock = {
        id: symbol,
        symbol: symbol,
        name: profileData.name || symbol,
        price: quoteData.c || 0,
        market_cap: marketCap,
        original_market_cap: originalMarketCap,
        currency: profileData.currency || 'USD',
        usd_rate: usdRate,
        eps: quoteData.eps || 0,
        book_value_per_share: quoteData.bookValuePerShare || 0,
        price_to_book: quoteData.pb || 0,
        graham_number: 0, // Will be calculated by GrahamAnalysisService
        margin_of_safety: 0, // Will be calculated by GrahamAnalysisService
        value_score: 0, // Will be calculated by GrahamAnalysisService
        industry: profileData.finnhubIndustry || '',
        sector: profileData.sector || '',
        last_updated: new Date()
      };

      return stock;
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      return null;
    }
  }
} 