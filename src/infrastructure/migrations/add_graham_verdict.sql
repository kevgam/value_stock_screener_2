-- Add Graham verdict field
ALTER TABLE stocks_v2
ADD COLUMN IF NOT EXISTS graham_analysis VARCHAR(20);

-- Add comment to document the field
COMMENT ON COLUMN stocks_v2.graham_analysis IS 'Graham verdict (Strong Buy, Buy, Hold, Sell, Strong Sell)';

-- Create index for quick filtering by Graham verdict
CREATE INDEX IF NOT EXISTS idx_stocks_v2_graham_analysis ON stocks_v2(graham_analysis); 