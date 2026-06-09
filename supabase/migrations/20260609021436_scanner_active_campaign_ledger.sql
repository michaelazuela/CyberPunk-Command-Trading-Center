-- Durable scanner ActiveCampaign alert ledger.
-- Prevents repeated Discord trade-plan alerts for the same campaign across
-- scanner restarts, deleted local state files, or multiple scanner instances.
-- This table stores alert-delivery state only; it is not trade approval,
-- execution authority, or a broker/order ledger.

CREATE TABLE IF NOT EXISTS scanner_active_campaign_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  trade_date DATE NOT NULL,
  instrument TEXT NOT NULL,
  session TEXT NOT NULL CHECK (session IN ('morning','lunch','replay_morning','replay_lunch')),
  direction TEXT NOT NULL CHECK (direction IN ('LONG','SHORT','NONE','NO TRADE')),
  setup_type TEXT,
  state TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  alert_key TEXT NOT NULL,
  plan_version_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','sent','failed','skipped','released')),
  first_claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_sent_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  suppressed_count INTEGER NOT NULL DEFAULT 0 CHECK (suppressed_count >= 0),
  reset_policy TEXT NOT NULL DEFAULT 'trade_date_direction_campaign'
    CHECK (reset_policy = 'trade_date_direction_campaign'),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT scanner_active_campaign_alerts_unique_campaign UNIQUE (user_id, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_scanner_active_campaign_alerts_lookup
  ON scanner_active_campaign_alerts(user_id, campaign_id);

CREATE INDEX IF NOT EXISTS idx_scanner_active_campaign_alerts_trade_date
  ON scanner_active_campaign_alerts(user_id, trade_date DESC, instrument, session);

ALTER TABLE scanner_active_campaign_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own scanner active campaign alerts" ON scanner_active_campaign_alerts;
CREATE POLICY "Users read own scanner active campaign alerts"
  ON scanner_active_campaign_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own scanner active campaign alerts" ON scanner_active_campaign_alerts;
CREATE POLICY "Users insert own scanner active campaign alerts"
  ON scanner_active_campaign_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own scanner active campaign alerts" ON scanner_active_campaign_alerts;
CREATE POLICY "Users update own scanner active campaign alerts"
  ON scanner_active_campaign_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON TABLE scanner_active_campaign_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scanner_active_campaign_alerts TO service_role;
