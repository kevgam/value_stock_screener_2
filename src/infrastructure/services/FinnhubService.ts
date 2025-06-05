import { RateLimiter } from '@/src/services/rateLimiter';

const FINNHUB_API_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export class FinnhubService {
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = RateLimiter.getInstance();
  }

  private async makeRequest(url: string, operation: string): Promise<any> {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        await this.rateLimiter.checkRateLimit(operation);
        const response = await fetch(url);

        if (response.status === 429) { // Too Many Requests
          console.log(`[${operation}] Rate limit hit, waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch ${operation}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (retries === MAX_RETRIES - 1) {
          console.error(`[${operation}] Max retries reached:`, error);
          throw error;
        }
        console.log(`[${operation}] Retry ${retries + 1}/${MAX_RETRIES}:`, error);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        retries++;
      }
    }
  }

  async getQuote(symbol: string): Promise<any> {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    return this.makeRequest(url, 'getQuote');
  }

  async getCompanyProfile(symbol: string): Promise<any> {
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    return this.makeRequest(url, 'getCompanyProfile');
  }

  async getForexRate(fromCurrency: string, toCurrency: string = 'USD'): Promise<number> {
    const url = `${FINNHUB_BASE_URL}/forex/exchange?symbol=${fromCurrency}${toCurrency}&token=${FINNHUB_API_KEY}`;
    const data = await this.makeRequest(url, 'getForexRate');
    
    if (!data.rate || typeof data.rate !== 'number' || data.rate <= 0) {
      throw new Error(`Invalid forex rate received: ${data.rate}`);
    }

    return data.rate;
  }

  async getStockMetrics(symbol: string): Promise<any> {
    const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`;
    return this.makeRequest(url, 'getStockMetrics');
  }

  async getAvailableStocks(): Promise<any[]> {
    const url = `${FINNHUB_BASE_URL}/stock/symbol?exchange=US&token=${FINNHUB_API_KEY}`;
    const data = await this.makeRequest(url, 'getAvailableStocks');
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from Finnhub API');
    }

    return data;
  }
} 