-- Create stocks_v2 table with all required columns
CREATE TABLE IF NOT EXISTS stocks_v2 (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT,
    exchange TEXT,
    price DECIMAL,
    market_cap DECIMAL,
    pe_ratio DECIMAL,
    pb_ratio DECIMAL,
    eps DECIMAL,
    book_value_per_share DECIMAL,
    dividend_yield DECIMAL,
    current_ratio DECIMAL,
    long_term_debt_to_equity DECIMAL,
    earnings_growth_5y DECIMAL,
    graham_number DECIMAL,
    margin_of_safety DECIMAL,
    graham_safety_score INTEGER,
    graham_value_score INTEGER,
    value_score INTEGER,
    safety_score INTEGER,
    currency TEXT DEFAULT 'USD',
    is_price_usd BOOLEAN DEFAULT true,
    original_price DECIMAL,
    original_market_cap DECIMAL,
    forex_rate DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create metrics_history table
CREATE TABLE IF NOT EXISTS metrics_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    symbol TEXT REFERENCES stocks_v2(symbol),
    metric_type TEXT NOT NULL,
    value DECIMAL NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT REFERENCES stocks_v2(symbol),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT REFERENCES stocks_v2(symbol),
    condition TEXT NOT NULL,
    threshold DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_stocks_v2_symbol ON stocks_v2(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_exchange ON stocks_v2(exchange);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_currency ON stocks_v2(currency);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_market_cap ON stocks_v2(market_cap);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_graham_value_score ON stocks_v2(graham_value_score);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_graham_safety_score ON stocks_v2(graham_safety_score);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_last_updated ON stocks_v2(last_updated);

-- Add comments to document the currency-related fields
COMMENT ON COLUMN stocks_v2.currency IS 'The original currency of the stock price (e.g., USD, JPY)';
COMMENT ON COLUMN stocks_v2.is_price_usd IS 'Whether the price and market_cap are in USD';
COMMENT ON COLUMN stocks_v2.original_price IS 'The price in the original currency before USD conversion';
COMMENT ON COLUMN stocks_v2.original_market_cap IS 'The market cap in the original currency before USD conversion';
COMMENT ON COLUMN stocks_v2.forex_rate IS 'The forex rate used for USD conversion';

-- Enable Row Level Security
ALTER TABLE stocks_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON stocks_v2
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable full access for service role" ON stocks_v2
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON metrics_history
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable full access for service role" ON metrics_history
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users" ON watchlists
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Enable write access for authenticated users" ON watchlists
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for authenticated users" ON watchlists
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Enable read access for authenticated users" ON alerts
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Enable write access for authenticated users" ON alerts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete access for authenticated users" ON alerts
    FOR DELETE TO authenticated USING (auth.uid() = user_id); 