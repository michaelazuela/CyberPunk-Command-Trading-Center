-- Allow the approved evening scanner/execution window to persist Discord/RAG
-- and durable ActiveCampaign ledger records. This is a schema acceptance update
-- only; it does not change trade approval, canExecute, entry, stop, target, or
-- risk rules.

ALTER TABLE public.trade_embeddings
  DROP CONSTRAINT IF EXISTS trade_embeddings_session_type_check;

ALTER TABLE public.trade_embeddings
  ADD CONSTRAINT trade_embeddings_session_type_check
  CHECK (session_type IN ('morning','lunch','evening','replay_morning','replay_lunch','replay_evening'));

ALTER TABLE public.setups
  DROP CONSTRAINT IF EXISTS setups_session_type_check;

ALTER TABLE public.setups
  ADD CONSTRAINT setups_session_type_check
  CHECK (session_type IS NULL OR session_type IN ('morning','lunch','evening','replay_morning','replay_lunch','replay_evening'));

ALTER TABLE public.scanner_active_campaign_alerts
  DROP CONSTRAINT IF EXISTS scanner_active_campaign_alerts_session_check;

ALTER TABLE public.scanner_active_campaign_alerts
  ADD CONSTRAINT scanner_active_campaign_alerts_session_check
  CHECK (session IN ('morning','lunch','evening','replay_morning','replay_lunch','replay_evening'));
