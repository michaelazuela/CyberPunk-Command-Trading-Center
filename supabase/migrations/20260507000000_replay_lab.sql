-- Add Replay Lab / Historical fields

DO $$
BEGIN
  -- setups table updates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'setups') THEN
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS analysis_mode TEXT CHECK (analysis_mode IN ('live','historical_replay'));
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS trade_date DATE;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS session_type TEXT CHECK (session_type IN ('morning','lunch'));
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS replay_status TEXT CHECK (replay_status IN ('pending','verified','discarded'));
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win','loss','scratch','no_trade','missed_trade'));
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS actual_entry NUMERIC;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS actual_exit NUMERIC;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS pnl_ticks NUMERIC;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS pnl_dollars NUMERIC;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS contracts INTEGER;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS eth_context_screenshot_url TEXT;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS execution_screenshot_url TEXT;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS replay_metadata JSONB;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS morning_context_setup_id UUID;
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS rag_context_used BOOLEAN DEFAULT false;
  END IF;

  -- trade_embeddings table updates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trade_embeddings') THEN
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS analysis_mode TEXT CHECK (analysis_mode IN ('live','historical_replay'));
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS replay_status TEXT CHECK (replay_status IN ('pending','verified','discarded'));
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('win','loss','scratch','no_trade','missed_trade'));
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS eth_context_screenshot_url TEXT;
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS execution_screenshot_url TEXT;
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT;
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS replay_metadata JSONB;
    ALTER TABLE trade_embeddings ADD COLUMN IF NOT EXISTS morning_context_setup_id UUID;
  END IF;

  -- trades table updates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades') THEN
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS analysis_mode TEXT CHECK (analysis_mode IN ('live','historical_replay') OR analysis_mode IS NULL);
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_date DATE;
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS replay_setup_id UUID;
  END IF;

END $$;
