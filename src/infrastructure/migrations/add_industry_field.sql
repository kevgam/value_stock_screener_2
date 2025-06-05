-- Add industry field to stocks_v2 table
ALTER TABLE stocks_v2
ADD COLUMN IF NOT EXISTS industry TEXT;

-- Create index for industry
CREATE INDEX IF NOT EXISTS idx_stocks_v2_industry ON stocks_v2(industry);

-- Add comment to document the industry field
COMMENT ON COLUMN stocks_v2.industry IS 'The industry sector that the company operates in'; 