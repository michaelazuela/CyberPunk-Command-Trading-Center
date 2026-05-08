-- Keep the live trades table aligned with the normalized trade plan fields
-- the app saves from Morning Analysis, Lunch Reversal, and Replay Lab.

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS instrument TEXT,
  ADD COLUMN IF NOT EXISTS setup_id UUID,
  ADD COLUMN IF NOT EXISTS pnl_ticks NUMERIC,
  ADD COLUMN IF NOT EXISTS pnl_dollars NUMERIC,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS "sessionType" TEXT,
  ADD COLUMN IF NOT EXISTS "analysisMode" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trades_instrument_check'
      AND conrelid = 'public.trades'::regclass
  ) THEN
    ALTER TABLE trades
      ADD CONSTRAINT trades_instrument_check
      CHECK (instrument IS NULL OR instrument IN ('MES', 'MNQ'));
  END IF;
END $$;
