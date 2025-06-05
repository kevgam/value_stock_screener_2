import { createClient } from '@supabase/supabase-js';
import { Stock } from '../types/stock';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseRepository {
  async getStocks(): Promise<{ data: Stock[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('stocks_v2')
        .select('*');

      return { data, error };
    } catch (error) {
      console.error('Error fetching stocks:', error);
      return { data: null, error };
    }
  }

  async getStock(symbol: string): Promise<Stock | null> {
    try {
      const { data, error } = await supabase
        .from('stocks_v2')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching stock ${symbol}:`, error);
      return null;
    }
  }

  async updateStock(stock: Stock): Promise<void> {
    try {
      const { error } = await supabase
        .from('stocks_v2')
        .upsert(stock);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating stock ${stock.symbol}:`, error);
      throw error;
    }
  }

  async getUndervaluedStocks(threshold: number = 20): Promise<Stock[]> {
    try {
      const { data, error } = await supabase
        .from('stocks_v2')
        .select('*')
        .gte('margin_of_safety', threshold)
        .order('margin_of_safety', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching undervalued stocks:', error);
      return [];
    }
  }

  async recordMetricsHistory(stockId: string, metrics: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('metrics_history')
        .insert({
          stock_id: stockId,
          ...metrics,
          recorded_at: new Date()
        });

      if (error) throw error;
    } catch (error) {
      console.error(`Error recording metrics history for stock ${stockId}:`, error);
    }
  }

  async getMetricsHistory(stockId: string, days: number = 30): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('metrics_history')
        .select('*')
        .eq('stock_id', stockId)
        .gte('recorded_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching metrics history for stock ${stockId}:`, error);
      return [];
    }
  }

  async getActiveAlerts(stockId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('stock_id', stockId)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching active alerts for stock ${stockId}:`, error);
      return [];
    }
  }

  async createAlertNotification(notification: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('alert_notifications')
        .insert(notification);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating alert notification:', error);
    }
  }

  async updateAlertStatus(alertId: string, status: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ status })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating alert ${alertId} status:`, error);
    }
  }
} 