-- Plan traceability, duplicate detection, and database health support.
-- Safe to run repeatedly.

ALTER TABLE setups
  ADD COLUMN IF NOT EXISTS plan_version_id TEXT,
  ADD COLUMN IF NOT EXISTS setup_signature TEXT,
  ADD COLUMN IF NOT EXISTS save_receipt_json JSONB;

ALTER TABLE trade_embeddings
  ADD COLUMN IF NOT EXISTS plan_version_id TEXT,
  ADD COLUMN IF NOT EXISTS setup_signature TEXT,
  ADD COLUMN IF NOT EXISTS save_receipt_json JSONB;

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS plan_version_id TEXT,
  ADD COLUMN IF NOT EXISTS setup_signature TEXT;

CREATE INDEX IF NOT EXISTS idx_setups_user_signature
  ON setups(user_id, setup_signature)
  WHERE setup_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_embeddings_user_signature
  ON trade_embeddings(user_id, setup_signature)
  WHERE setup_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trade_embeddings_pending_embedding
  ON trade_embeddings(user_id, created_at DESC)
  WHERE embedding IS NULL;
