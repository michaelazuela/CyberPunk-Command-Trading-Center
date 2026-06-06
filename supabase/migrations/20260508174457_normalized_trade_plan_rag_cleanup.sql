-- Normalize trade-plan persistence and keep RAG retrieval aligned with agent learning.

ALTER TABLE trade_embeddings
ADD COLUMN IF NOT EXISTS stop_price NUMERIC,
ADD COLUMN IF NOT EXISTS target_1_price NUMERIC,
ADD COLUMN IF NOT EXISTS target_2_price NUMERIC,
ADD COLUMN IF NOT EXISTS risk_points NUMERIC,
ADD COLUMN IF NOT EXISTS plan_source TEXT,
ADD COLUMN IF NOT EXISTS risk_reward_t1 TEXT,
ADD COLUMN IF NOT EXISTS risk_reward_t2 TEXT;

-- Allow replay/no-trade records that the app already writes into RAG memory.
ALTER TABLE trade_embeddings
DROP CONSTRAINT IF EXISTS trade_embeddings_trade_result_check;

ALTER TABLE trade_embeddings
ADD CONSTRAINT trade_embeddings_trade_result_check
CHECK (trade_result IN ('win','loss','scratch','pending','no_trade','missed_trade'));

-- Remove historical duplicate memory rows before adding partial unique indexes.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, setup_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM trade_embeddings
  WHERE setup_id IS NOT NULL
)
DELETE FROM trade_embeddings te
USING ranked r
WHERE te.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, trade_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM trade_embeddings
  WHERE trade_id IS NOT NULL
)
DELETE FROM trade_embeddings te
USING ranked r
WHERE te.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS trade_embeddings_user_setup_uidx
ON trade_embeddings (user_id, setup_id)
WHERE setup_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trade_embeddings_user_trade_uidx
ON trade_embeddings (user_id, trade_id)
WHERE trade_id IS NOT NULL;

DROP FUNCTION IF EXISTS match_similar_setups(vector, integer, text, text, text);

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
  stop_price NUMERIC,
  target_1_price NUMERIC,
  target_2_price NUMERIC,
  risk_points NUMERIC,
  plan_source TEXT,
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
  distance_from_midnight_points NUMERIC
)
LANGUAGE plpgsql AS $$
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
    te.stop_price,
    te.target_1_price,
    te.target_2_price,
    te.risk_points,
    te.plan_source,
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
    te.distance_from_midnight_points
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
