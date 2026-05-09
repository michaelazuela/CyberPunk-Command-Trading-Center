-- Keep replay time-window metadata available for setup records and RAG memory.
-- Production already needs these fields when Replay Lab saves morning/lunch outcomes.

ALTER TABLE public.setups
  ADD COLUMN IF NOT EXISTS window_start TEXT,
  ADD COLUMN IF NOT EXISTS window_end TEXT,
  ADD COLUMN IF NOT EXISTS window_timezone TEXT,
  ADD COLUMN IF NOT EXISTS required_screenshot_range TEXT;

ALTER TABLE public.trade_embeddings
  ADD COLUMN IF NOT EXISTS window_start TEXT,
  ADD COLUMN IF NOT EXISTS window_end TEXT,
  ADD COLUMN IF NOT EXISTS window_timezone TEXT,
  ADD COLUMN IF NOT EXISTS required_screenshot_range TEXT;
