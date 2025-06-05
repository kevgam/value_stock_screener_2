import { Stock } from '../types/stock';
import { FinnhubService } from './FinnhubService';
import { SupabaseRepository } from './SupabaseRepository';
import { GrahamAnalysisService, GrahamVerdict } from './GrahamAnalysisService';

export class ValueScreeningService {
  private finnhubService: FinnhubService;
  private repository: SupabaseRepository;
  private grahamAnalysis: GrahamAnalysisService;

  constructor() {
    this.finnhubService = new FinnhubService();
    this.repository = new SupabaseRepository();
    this.grahamAnalysis = new GrahamAnalysisService();
  }

  async getAvailableStocks(): Promise<Array<{ symbol: string; name: string }>> {
    try {
      return await this.finnhubService.getAvailableStocks();
    } catch (error) {
      console.error('Error fetching available stocks:', error);
      return [];
    }
  }

  async screenStock(symbol: string): Promise<Stock | null> {
    try {
      // Fetch stock data from Finnhub
      const stockData = await this.finnhubService.getStockData(symbol);
      if (!stockData) return null;

      // Calculate Graham metrics
      const grahamNumber = this.grahamAnalysis.calculateGrahamNumber(
        stockData.eps || 0,
        stockData.book_value_per_share || 0,
        stockData.currency || 'USD',
        stockData.usd_rate || 1
      );

      const marginOfSafety = this.grahamAnalysis.calculateMarginOfSafety({
        ...stockData,
        graham_number: grahamNumber
      });

      // Determine Graham verdict based on existing scores or calculate new ones
      const grahamVerdict = this.grahamAnalysis.determineGrahamVerdict({
        ...stockData,
        graham_number: grahamNumber
      });

      // Update stock with calculated metrics
      const updatedStock: Stock = {
        ...stockData,
        graham_number: grahamNumber,
        margin_of_safety: marginOfSafety,
        graham_analysis: grahamVerdict
      };

      // Save to database
      await this.repository.updateStock(updatedStock);

      return updatedStock;
    } catch (error) {
      console.error(`Error screening stock ${symbol}:`, error);
      return null;
    }
  }

  async getUndervaluedStocks(threshold: number = 20): Promise<Stock[]> {
    try {
      const stocks = await this.repository.getUndervaluedStocks(threshold);
      return stocks;
    } catch (error) {
      console.error('Error fetching undervalued stocks:', error);
      return [];
    }
  }
} 