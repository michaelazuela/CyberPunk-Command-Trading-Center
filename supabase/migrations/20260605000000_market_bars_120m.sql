-- Add 120m / 2H OHLC bars to the durable NinjaTrader market_bars cache.
-- Stores compact OHLCV bars only; no tick data and no execution authority.

DO $$
DECLARE
  existing_constraint_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'market_bars'::regclass
      AND conname = 'market_bars_timeframe_check'
  ) THEN
    ALTER TABLE market_bars DROP CONSTRAINT market_bars_timeframe_check;
  END IF;

  SELECT conname
    INTO existing_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'market_bars'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%timeframe%';

  IF existing_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE market_bars DROP CONSTRAINT %I', existing_constraint_name);
  END IF;
END $$;

ALTER TABLE market_bars
  ADD CONSTRAINT market_bars_timeframe_check
  CHECK (timeframe IN ('5m','15m','60m','120m','240m'));
