import { Stock } from '../types/stock';
import { SupabaseRepository } from './SupabaseRepository';
import { GrahamAnalysisService } from './GrahamAnalysisService';

export class MonitoringService {
  private repository: SupabaseRepository;
  private grahamAnalysis: GrahamAnalysisService;

  constructor() {
    this.repository = new SupabaseRepository();
    this.grahamAnalysis = new GrahamAnalysisService();
  }

  async trackStockMetrics(stock: Stock): Promise<void> {
    try {
      // Calculate current metrics
      const grahamNumber = this.grahamAnalysis.calculateGrahamNumber(
        stock.eps || 0,
        stock.book_value_per_share || 0,
        stock.currency || 'USD',
        stock.usd_rate || 1
      );

      const marginOfSafety = this.grahamAnalysis.calculateMarginOfSafety({
        ...stock,
        graham_number: grahamNumber
      });

      const valueScore = this.grahamAnalysis.calculateValueScore({
        ...stock,
        graham_number: grahamNumber
      });

      // Record metrics history
      await this.repository.recordMetricsHistory(stock.id, {
        graham_number: grahamNumber,
        margin_of_safety: marginOfSafety,
        value_score: valueScore,
        price: stock.price,
        price_to_book: stock.price_to_book
      });
    } catch (error) {
      console.error(`Error tracking metrics for stock ${stock.symbol}:`, error);
    }
  }

  async getMetricsHistory(stockId: string, days: number = 30): Promise<any[]> {
    try {
      return await this.repository.getMetricsHistory(stockId, days);
    } catch (error) {
      console.error(`Error fetching metrics history for stock ${stockId}:`, error);
      return [];
    }
  }
} 