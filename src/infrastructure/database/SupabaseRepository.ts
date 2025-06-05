import { createClient } from '@supabase/supabase-js';
import { Stock } from '../../domain/types/Stock';

export class SupabaseRepository {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async getStock(symbol: string): Promise<Stock | null> {
    try {
      const { data, error } = await this.supabase
        .from('stocks_v2')
        .select('*')
        .eq('symbol', symbol)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching stock ${symbol}:`, error);
      return null;
    }
  }

  async updateStock(stock: Stock): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('stocks_v2')
        .upsert({
          ...stock,
          market_cap: Number((stock.market_cap ?? 0).toFixed(2)),
          original_market_cap: Number((stock.original_market_cap ?? 0).toFixed(2))
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(`Error updating stock ${stock.symbol}:`, error);
      throw error;
    }
  }

  async getUndervaluedStocks(): Promise<Stock[]> {
    try {
      const { data, error } = await this.supabase
        .from('stocks_v2')
        .select('*')
        .order('margin_of_safety', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching undervalued stocks:', error);
      throw error;
    }
  }
} 