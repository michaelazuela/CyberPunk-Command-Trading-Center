-- Add window tracking to setups
ALTER TABLE setups ADD COLUMN IF NOT EXISTS window_start TEXT;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS window_end TEXT;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS window_timezone TEXT;
ALTER TABLE setups ADD COLUMN IF NOT EXISTS required_screenshot_range TEXT;

-- Add window tracking to embeddings
ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS window_start TEXT;
ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS window_end TEXT;
ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS window_timezone TEXT;
ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS required_screenshot_range TEXT;
