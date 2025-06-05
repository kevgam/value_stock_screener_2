-- Fix currency settings for Japanese ADRs
UPDATE stocks_v2
SET 
    currency = 'JPY',
    is_price_usd = false
WHERE symbol IN ('TKOMF', 'TKOMY')  -- Japanese ADRs
   OR symbol LIKE '%.T'             -- TSE stocks
   OR exchange = 'TSE';

-- Fix currency settings for UK ADRs
UPDATE stocks_v2
SET 
    currency = 'GBP',
    is_price_usd = false
WHERE (symbol LIKE '%L' AND exchange = 'US')  -- UK ADRs on US exchange
   OR exchange = 'LSE';                       -- LSE stocks

-- Add comment to identify ADR stocks
COMMENT ON COLUMN stocks_v2.exchange IS 'Exchange where the stock is listed. Note: US-listed ADRs may have different underlying currencies.'; 