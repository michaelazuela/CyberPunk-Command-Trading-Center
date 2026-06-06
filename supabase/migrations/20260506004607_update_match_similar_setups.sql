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
  pnl_dollars NUMERIC,
  contracts INTEGER,
  entry_price NUMERIC,
  exit_price NUMERIC,
  screenshot_url TEXT,
  proof_screenshot_url TEXT,
  gemini_verdict TEXT,
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
    te.pnl_dollars,
    te.contracts,
    te.entry_price,
    te.exit_price,
    te.screenshot_url,
    te.proof_screenshot_url,
    te.gemini_verdict,
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
