-- Safe trade plan and RAG integrity updates
-- Purpose:
--   1. Prevent duplicate RAG rows for the same setup/trade.
--   2. Persist deterministic ENTRY / STOP / T1 / T2 plan data.
--   3. Return complete Midnight Open fields from match_similar_setups().

-- Prevent duplicate learning rows. Partial unique indexes allow many NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS trade_embeddings_setup_id_unique
  ON trade_embeddings(setup_id)
  WHERE setup_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trade_embeddings_trade_id_unique
  ON trade_embeddings(trade_id)
  WHERE trade_id IS NOT NULL;

-- Normalized deterministic trade-plan fields for embeddings.
ALTER TABLE trade_embeddings
  ADD COLUMN IF NOT EXISTS normalized_plan_json JSONB,
  ADD COLUMN IF NOT EXISTS plan_source TEXT,
  ADD COLUMN IF NOT EXISTS stop_price NUMERIC,
  ADD COLUMN IF NOT EXISTS t1_price NUMERIC,
  ADD COLUMN IF NOT EXISTS t2_price NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_points NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_reward_t1 TEXT,
  ADD COLUMN IF NOT EXISTS risk_reward_t2 TEXT;

-- Normalized deterministic trade-plan fields for setup records.
ALTER TABLE setups
  ADD COLUMN IF NOT EXISTS normalized_plan_json JSONB,
  ADD COLUMN IF NOT EXISTS plan_source TEXT,
  ADD COLUMN IF NOT EXISTS t1_price NUMERIC,
  ADD COLUMN IF NOT EXISTS t2_price NUMERIC,
  ADD COLUMN IF NOT EXISTS risk_points NUMERIC;

-- Keep the existing function signature current and include the Midnight Open
-- fields the frontend agent-learning mapper needs.
DROP FUNCTION IF EXISTS match_similar_setups(vector(768), INT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION match_similar_setups(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  filter_instrument TEXT DEFAULT NULL,
  filter_session TEXT DEFAULT NULL,
  filter_result TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source TEXT,
  analysis_mode TEXT,
  trade_date DATE,
  day_of_week TEXT,
  session_type TEXT,
  instrument TEXT,
  rth_vs_midnight TEXT,
  ib_position TEXT,
  gemini_confidence TEXT,
  setup_quality_score NUMERIC,
  trade_result TEXT,
  pnl_ticks NUMERIC,
  pnl_dollars NUMERIC,
  contracts INTEGER,
  entry_price NUMERIC,
  exit_price NUMERIC,
  screenshot_url TEXT,
  proof_screenshot_url TEXT,
  gemini_verdict TEXT,
  embedding_text TEXT,
  similarity FLOAT,
  midnight_open_price NUMERIC,
  midnight_open_instrument TEXT,
  midnight_open_status TEXT,
  midnight_role TEXT,
  midnight_interaction TEXT,
  distance_from_midnight_points NUMERIC,
  distance_from_midnight_ticks NUMERIC,
  midnight_plan_impact TEXT,
  midnight_confidence_adjustment TEXT,
  midnight_confidence_reason TEXT,
  normalized_plan_json JSONB,
  plan_source TEXT,
  stop_price NUMERIC,
  t1_price NUMERIC,
  t2_price NUMERIC,
  risk_points NUMERIC,
  risk_reward_t1 TEXT,
  risk_reward_t2 TEXT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.source,
    te.analysis_mode,
    te.trade_date,
    te.day_of_week,
    te.session_type,
    te.instrument,
    te.rth_vs_midnight,
    te.ib_position,
    te.gemini_confidence,
    te.setup_quality_score,
    te.trade_result,
    te.pnl_ticks,
    te.pnl_dollars,
    te.contracts,
    te.entry_price,
    te.exit_price,
    te.screenshot_url,
    te.proof_screenshot_url,
    te.gemini_verdict,
    te.embedding_text,
    1 - (te.embedding <=> query_embedding) AS similarity,
    te.midnight_open_price,
    te.midnight_open_instrument,
    te.midnight_open_status,
    te.midnight_role,
    te.midnight_interaction,
    te.distance_from_midnight_points,
    te.distance_from_midnight_ticks,
    te.midnight_plan_impact,
    te.midnight_confidence_adjustment,
    te.midnight_confidence_reason,
    te.normalized_plan_json,
    te.plan_source,
    te.stop_price,
    te.t1_price,
    te.t2_price,
    te.risk_points,
    te.risk_reward_t1,
    te.risk_reward_t2
  FROM trade_embeddings te
  WHERE
    ((filter_instrument IS NULL) OR (te.instrument = filter_instrument))
    AND ((filter_session IS NULL) OR (te.session_type = filter_session))
    AND ((filter_result IS NULL) OR (te.trade_result = filter_result))
    AND te.embedding IS NOT NULL
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RLS should already be enabled by previous migrations. Keep these idempotent
-- statements here as defense in depth for exposed public tables.
ALTER TABLE trade_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
