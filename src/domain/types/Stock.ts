export interface Stock {
  symbol: string;
  company_name: string;
  price: number;
  pe_ratio: number;
  pb_ratio: number;
  graham_number: number;
  margin_of_safety: number;
  eps: number;
  book_value_per_share: number;
  last_updated: string;
  industry: string | null;
  market_cap: number;
  exchange: string | null;
  currency: string;
  is_price_usd: boolean;
  original_price: number;
  original_market_cap: number;
  forex_rate: number;
  current_ratio: number | null;
  long_term_debt_to_equity: number | null;
  net_current_assets: number | null;
  working_capital: number | null;
  earnings_growth_5y: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
  roe_5y: number | null;
  roa_5y: number | null;
  revenue_growth_5y: number | null;
  operating_margin: number | null;
  net_profit_margin: number | null;
  graham_safety_score: number;
  graham_value_score: number;
  value_score: number;
  safety_score: number;
}

export interface SizeAnalysisResult {
    meetsCriteria: boolean;
    annualSales?: number;
    totalAssets?: number;
    companyType: 'industrial' | 'utility' | 'financial';
    reason?: string;
}

export class SizeAnalysisService {
    async analyze(symbol: string): Promise<SizeAnalysisResult> {
        // Implementation for size criteria
    }
}

export interface FinancialStrengthResult {
    meetsCriteria: boolean;
    currentRatio?: number;
    longTermDebt?: number;
    netCurrentAssets?: number;
    debtToEquity?: number;
    reason?: string;
}

export class FinancialStrengthService {
    async analyze(symbol: string): Promise<FinancialStrengthResult> {
        // Implementation for financial strength criteria
    }
}

export interface EarningsAnalysisResult {
    meetsStabilityCriteria: boolean;
    meetsGrowthCriteria: boolean;
    tenYearEarnings?: number[];
    earningsGrowthRate?: number;
    reason?: string;
}

export class EarningsAnalysisService {
    async analyze(symbol: string): Promise<EarningsAnalysisResult> {
        // Implementation for earnings criteria
    }
}

export interface DividendAnalysisResult {
    meetsCriteria: boolean;
    yearsUninterrupted?: number;
    dividendHistory?: number[];
    reason?: string;
}

export class DividendAnalysisService {
    async analyze(symbol: string): Promise<DividendAnalysisResult> {
        // Implementation for dividend criteria
    }
}

export interface ValuationAnalysisResult {
    meetsCriteria: boolean;
    peRatio3yrAvg?: number;
    priceBookRatio?: number;
    grahamNumber?: number;
    reason?: string;
}

export class ValuationAnalysisService {
    async analyze(symbol: string): Promise<ValuationAnalysisResult> {
        // Implementation for valuation criteria
    }
} 