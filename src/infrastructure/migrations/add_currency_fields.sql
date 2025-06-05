-- Add currency-related fields to stocks_v2 table
ALTER TABLE stocks_v2
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS is_price_usd BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS original_price DECIMAL,
ADD COLUMN IF NOT EXISTS original_market_cap DECIMAL,
ADD COLUMN IF NOT EXISTS forex_rate DECIMAL;

-- Update existing records
UPDATE stocks_v2
SET currency = CASE 
    WHEN exchange IN ('TSE', 'JPEX') THEN 'JPY'
    WHEN exchange = 'LSE' THEN 'GBP'
    WHEN exchange IN ('US', 'NYSE', 'NASDAQ') THEN 'USD'
    ELSE 'USD'
END,
is_price_usd = CASE 
    WHEN exchange IN ('US', 'NYSE', 'NASDAQ') THEN true
    ELSE false
END
WHERE currency IS NULL OR is_price_usd IS NULL;

-- Create index for currency fields
CREATE INDEX IF NOT EXISTS idx_stocks_v2_currency ON stocks_v2(currency);
CREATE INDEX IF NOT EXISTS idx_stocks_v2_is_price_usd ON stocks_v2(is_price_usd); 