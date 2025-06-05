-- Drop existing table and indexes
DROP TABLE IF EXISTS stocks CASCADE;

-- Create stocks table
CREATE TABLE IF NOT EXISTS stocks (
  symbol TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  price DECIMAL NOT NULL,
  pe_ratio DECIMAL,
  pb_ratio DECIMAL,
  graham_number DECIMAL,
  margin_of_safety DECIMAL,
  eps DECIMAL,
  book_value_per_share DECIMAL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  industry TEXT,
  market_cap DECIMAL,
  -- Additional Graham-relevant metrics
  current_ratio DECIMAL,
  long_term_debt_to_equity DECIMAL,
  net_current_assets DECIMAL,
  working_capital DECIMAL,
  earnings_growth_5y DECIMAL,
  dividend_yield DECIMAL,
  payout_ratio DECIMAL,
  roe_5y DECIMAL,
  roa_5y DECIMAL,
  revenue_growth_5y DECIMAL,
  operating_margin DECIMAL,
  net_profit_margin DECIMAL,
  -- Calculated safety metrics
  graham_safety_score DECIMAL,
  graham_value_score DECIMAL,
  value_score NUMERIC,
  safety_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_stocks_graham_number ON stocks(graham_number);
CREATE INDEX IF NOT EXISTS idx_stocks_graham_safety_score ON stocks(graham_safety_score);
CREATE INDEX IF NOT EXISTS idx_stocks_graham_value_score ON stocks(graham_value_score);
CREATE INDEX IF NOT EXISTS idx_stocks_margin_of_safety ON stocks(margin_of_safety);
CREATE INDEX IF NOT EXISTS idx_stocks_industry ON stocks(industry);
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap ON stocks(market_cap);
CREATE INDEX IF NOT EXISTS idx_stocks_value_score ON stocks(value_score);
CREATE INDEX IF NOT EXISTS idx_stocks_safety_score ON stocks(safety_score);

-- Enable Row Level Security
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON stocks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read access for anonymous users" ON stocks
  FOR SELECT TO anon USING (true);

CREATE POLICY "Enable full access for authenticated users" ON stocks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable full access for service role" ON stocks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Enable write access for authenticated users only" ON stocks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON stocks
  FOR SELECT USING (true); 