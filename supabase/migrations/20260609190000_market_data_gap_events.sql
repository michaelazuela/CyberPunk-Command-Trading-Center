-- Durable NinjaTrader market-data gap ledger.
-- Records unresolved cache/bridge ingestion defects without inventing candles.

CREATE TABLE IF NOT EXISTS market_data_gap_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  bridge_instrument TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('5m','15m','60m','120m','240m')),
  requested_from_et TIMESTAMP NOT NULL,
  requested_to_et TIMESTAMP NOT NULL,
  range_start_et TIMESTAMP,
  range_end_et TIMESTAMP,
  bars_loaded INTEGER NOT NULL DEFAULT 0,
  cache_bars INTEGER NOT NULL DEFAULT 0,
  bridge_repair_bars INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'missing',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','ignored')),
  data_limitation_message TEXT,
  operator_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT market_data_gap_events_unique_open_gap
    UNIQUE (user_id, bridge_instrument, timeframe, requested_from_et, requested_to_et)
);

CREATE INDEX IF NOT EXISTS idx_market_data_gap_events_open
  ON market_data_gap_events(user_id, status, bridge_instrument, timeframe, requested_to_et DESC);

CREATE INDEX IF NOT EXISTS idx_market_data_gap_events_instrument_time
  ON market_data_gap_events(bridge_instrument, timeframe, requested_to_et DESC);

ALTER TABLE market_data_gap_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own market data gap events" ON market_data_gap_events;
CREATE POLICY "Users read own market data gap events"
  ON market_data_gap_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own market data gap events" ON market_data_gap_events;
CREATE POLICY "Users insert own market data gap events"
  ON market_data_gap_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own market data gap events" ON market_data_gap_events;
CREATE POLICY "Users update own market data gap events"
  ON market_data_gap_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON TABLE market_data_gap_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE market_data_gap_events TO service_role;
