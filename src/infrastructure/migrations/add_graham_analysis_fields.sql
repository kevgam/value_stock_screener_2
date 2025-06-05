-- Add all fields required for Graham Analysis
ALTER TABLE stocks_v2
ADD COLUMN IF NOT EXISTS net_current_assets DECIMAL,
ADD COLUMN IF NOT EXISTS working_capital DECIMAL,
ADD COLUMN IF NOT EXISTS payout_ratio DECIMAL,
ADD COLUMN IF NOT EXISTS roe_5y DECIMAL,
ADD COLUMN IF NOT EXISTS roa_5y DECIMAL,
ADD COLUMN IF NOT EXISTS revenue_growth_5y DECIMAL,
ADD COLUMN IF NOT EXISTS operating_margin DECIMAL,
ADD COLUMN IF NOT EXISTS net_profit_margin DECIMAL;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_stocks_v2_net_current_assets ON stocks_v2(net_current_assets);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_working_capital ON stocks_v2(working_capital);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_payout_ratio ON stocks_v2(payout_ratio);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_roe_5y ON stocks_v2(roe_5y);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_roa_5y ON stocks_v2(roa_5y);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_revenue_growth_5y ON stocks_v2(revenue_growth_5y);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_operating_margin ON stocks_v2(operating_margin);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_net_profit_margin ON stocks_v2(net_profit_margin);

-- Add comments to document the fields
COMMENT ON COLUMN stocks_v2.net_current_assets IS 'Net current assets (current assets - total liabilities)';
COMMENT ON COLUMN stocks_v2.working_capital IS 'Working capital (current assets - current liabilities)';
COMMENT ON COLUMN stocks_v2.payout_ratio IS 'Dividend payout ratio (dividends per share / earnings per share)';
COMMENT ON COLUMN stocks_v2.roe_5y IS '5-year average return on equity';
COMMENT ON COLUMN stocks_v2.roa_5y IS '5-year average return on assets';
COMMENT ON COLUMN stocks_v2.revenue_growth_5y IS '5-year revenue growth rate';
COMMENT ON COLUMN stocks_v2.operating_margin IS 'Operating margin (operating income / revenue)';
COMMENT ON COLUMN stocks_v2.net_profit_margin IS 'Net profit margin (net income / revenue)'; 