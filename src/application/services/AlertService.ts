import { Stock } from '../types/stock';
import { SupabaseRepository } from './SupabaseRepository';
import { GrahamAnalysisService } from './GrahamAnalysisService';

export class AlertService {
  private repository: SupabaseRepository;
  private grahamAnalysis: GrahamAnalysisService;

  constructor() {
    this.repository = new SupabaseRepository();
    this.grahamAnalysis = new GrahamAnalysisService();
  }

  async checkAlerts(stock: Stock): Promise<void> {
    try {
      // Get active alerts for this stock
      const alerts = await this.repository.getActiveAlerts(stock.id);
      
      for (const alert of alerts) {
        const shouldTrigger = this.evaluateAlertCondition(alert, stock);
        if (shouldTrigger) {
          await this.triggerAlert(alert, stock);
        }
      }
    } catch (error) {
      console.error(`Error checking alerts for stock ${stock.symbol}:`, error);
    }
  }

  private evaluateAlertCondition(alert: any, stock: Stock): boolean {
    const valueScore = this.grahamAnalysis.calculateValueScore(stock);
    const marginOfSafety = this.grahamAnalysis.calculateMarginOfSafety(stock);

    switch (alert.condition) {
      case 'value_score_above':
        return valueScore >= alert.threshold;
      case 'value_score_below':
        return valueScore <= alert.threshold;
      case 'margin_of_safety_above':
        return marginOfSafety >= alert.threshold;
      case 'margin_of_safety_below':
        return marginOfSafety <= alert.threshold;
      case 'price_above':
        return (stock.price || 0) >= alert.threshold;
      case 'price_below':
        return (stock.price || 0) <= alert.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: any, stock: Stock): Promise<void> {
    try {
      // Create alert notification
      await this.repository.createAlertNotification({
        alert_id: alert.id,
        stock_id: stock.id,
        triggered_at: new Date(),
        condition: alert.condition,
        threshold: alert.threshold,
        current_value: this.getCurrentValue(alert.condition, stock)
      });

      // Update alert status
      await this.repository.updateAlertStatus(alert.id, 'triggered');
    } catch (error) {
      console.error(`Error triggering alert ${alert.id}:`, error);
    }
  }

  private getCurrentValue(condition: string, stock: Stock): number {
    switch (condition) {
      case 'value_score_above':
      case 'value_score_below':
        return this.grahamAnalysis.calculateValueScore(stock);
      case 'margin_of_safety_above':
      case 'margin_of_safety_below':
        return this.grahamAnalysis.calculateMarginOfSafety(stock);
      case 'price_above':
      case 'price_below':
        return stock.price || 0;
      default:
        return 0;
    }
  }
} 