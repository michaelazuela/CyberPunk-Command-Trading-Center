-- Ensure Replay Lab and RAG runtime columns exist in production.
-- These are required by saveToRAG(), match_similar_setups(), and Replay Lab setup persistence.

ALTER TABLE setups
  ADD COLUMN IF NOT EXISTS analysis_mode TEXT CHECK (analysis_mode IN ('live','historical_replay')),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS trade_date DATE,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('morning','lunch')),
  ADD COLUMN IF NOT EXISTS replay_status TEXT CHECK (replay_status IN ('pending','verified','discarded')),
  ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win','loss','scratch','no_trade','missed_trade')),
  ADD COLUMN IF NOT EXISTS actual_entry NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_exit NUMERIC,
  ADD COLUMN IF NOT EXISTS pnl_ticks NUMERIC,
  ADD COLUMN IF NOT EXISTS pnl_dollars NUMERIC,
  ADD COLUMN IF NOT EXISTS contracts INTEGER,
  ADD COLUMN IF NOT EXISTS eth_context_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS execution_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS replay_metadata JSONB,
  ADD COLUMN IF NOT EXISTS morning_context_setup_id UUID,
  ADD COLUMN IF NOT EXISTS rag_context_used BOOLEAN DEFAULT false;

ALTER TABLE trade_embeddings
  ADD COLUMN IF NOT EXISTS analysis_mode TEXT CHECK (analysis_mode IN ('live','historical_replay')),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS replay_status TEXT CHECK (replay_status IN ('pending','verified','discarded')),
  ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win','loss','scratch','no_trade','missed_trade')),
  ADD COLUMN IF NOT EXISTS eth_context_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS execution_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS replay_metadata JSONB,
  ADD COLUMN IF NOT EXISTS morning_context_setup_id UUID;

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS analysis_mode TEXT CHECK (analysis_mode IN ('live','historical_replay') OR analysis_mode IS NULL),
  ADD COLUMN IF NOT EXISTS trade_date DATE,
  ADD COLUMN IF NOT EXISTS replay_setup_id UUID;
