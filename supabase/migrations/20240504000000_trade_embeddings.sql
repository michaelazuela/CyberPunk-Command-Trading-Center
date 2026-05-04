CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS trade_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  setup_id UUID REFERENCES setups(id) ON DELETE SET NULL,

  session_type TEXT NOT NULL CHECK (session_type IN ('morning','lunch')),
  trade_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  instrument TEXT NOT NULL CHECK (instrument IN ('MES','MNQ')),

  midnight_open_price NUMERIC,
  rth_vs_midnight TEXT CHECK (rth_vs_midnight IN ('above','below','at')),
  retrace_probability NUMERIC,
  initial_balance_high NUMERIC,
  initial_balance_low NUMERIC,
  ib_position TEXT CHECK (
    ib_position IN ('above_ib','inside_ib','below_ib','at_ib_high','at_ib_low')
  ),

  entry_price NUMERIC,
  exit_price NUMERIC,
  pnl_ticks NUMERIC,
  pnl_dollars NUMERIC,
  contracts INTEGER,

  gemini_confidence TEXT CHECK (gemini_confidence IN ('High','Medium','Low')),
  gemini_verdict TEXT CHECK (gemini_verdict IN ('CONFIRMED','DISPUTED','UNCLEAR')),
  setup_quality_score NUMERIC,
  trade_result TEXT CHECK (trade_result IN ('win','loss','scratch','pending')),

  embedding_text TEXT NOT NULL,
  embedding vector(768),

  ocr_text TEXT,
  gemini_analysis_json JSONB,
  screenshot_url TEXT,
  proof_screenshot_url TEXT,
  midnight_open_source TEXT CHECK (
    midnight_open_source IN ('manual','gemini_ocr','undetected')
  ),
  notes TEXT
);

CREATE OR REPLACE FUNCTION match_similar_setups(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  filter_instrument TEXT DEFAULT NULL,
  filter_session TEXT DEFAULT NULL,
  filter_result TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
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
  embedding_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
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
    te.embedding_text,
    1 - (te.embedding <=> query_embedding) AS similarity
  FROM trade_embeddings te
  WHERE
    (filter_instrument IS NULL OR te.instrument = filter_instrument)
    AND (filter_session IS NULL OR te.session_type = filter_session)
    AND (filter_result IS NULL OR te.trade_result = filter_result)
    AND te.embedding IS NOT NULL
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE INDEX IF NOT EXISTS trade_embeddings_vector_idx
ON trade_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

ALTER TABLE trade_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own embeddings"
ON trade_embeddings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
