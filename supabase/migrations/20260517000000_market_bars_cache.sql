-- Durable NinjaTrader OHLC candle cache.
-- Stores compact timeframe bars only, not tick data.
-- Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS market_bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  bridge_instrument TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('5m','15m','60m','240m')),
  candle_time_et TIMESTAMP NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'ninjatrader_bridge',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT market_bars_unique_candle UNIQUE (user_id, bridge_instrument, timeframe, candle_time_et)
);

CREATE INDEX IF NOT EXISTS idx_market_bars_lookup
  ON market_bars(user_id, bridge_instrument, timeframe, candle_time_et);

CREATE INDEX IF NOT EXISTS idx_market_bars_instrument_time
  ON market_bars(bridge_instrument, timeframe, candle_time_et DESC);

ALTER TABLE market_bars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own market bars" ON market_bars;
CREATE POLICY "Users read own market bars"
  ON market_bars FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own market bars" ON market_bars;
CREATE POLICY "Users insert own market bars"
  ON market_bars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own market bars" ON market_bars;
CREATE POLICY "Users update own market bars"
  ON market_bars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
