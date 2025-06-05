export interface Stock {
  symbol: string;
  company_name: string;
  price: number;
  pe_ratio?: number;
  pb_ratio?: number;
  graham_number?: number;
  margin_of_safety?: number;
  eps?: number;
  book_value_per_share?: number;
  last_updated?: string;
  industry?: string;
  market_cap?: number;
  // Exchange information
  exchange?: string;
  // Currency information
  currency: string;
  is_price_usd: boolean;
  original_price?: number;
  original_market_cap: number;
  forex_rate?: number;
  // Additional Graham-relevant metrics
  current_ratio?: number;
  long_term_debt_to_equity?: number;
  net_current_assets?: number;
  working_capital?: number;
  earnings_growth_5y?: number;
  dividend_yield?: number;
  payout_ratio?: number;
  roe_5y?: number;
  roa_5y?: number;
  revenue_growth_5y?: number;
  operating_margin?: number;
  net_profit_margin?: number;
  // Calculated safety metrics
  graham_safety_score?: number;
  graham_value_score?: number;
  value_score?: number;
  safety_score?: number;
}