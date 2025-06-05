-- Add exchange field to stocks table
ALTER TABLE stocks ADD COLUMN exchange TEXT;

-- Create index for exchange
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);

-- Update existing stocks with exchange info from available_stocks
UPDATE stocks s
SET exchange = a.exchange
FROM available_stocks a
WHERE s.symbol = a.symbol; 