-- setups table
ALTER TABLE setups ADD COLUMN IF NOT EXISTS
  midnight_open_source   TEXT CHECK (midnight_open_source IN ('manual','gemini_ocr','undetected')),
  midnight_open_override NUMERIC,
  midnight_open_price    NUMERIC,
  midnight_open_visible  BOOLEAN,
  rth_vs_midnight        TEXT CHECK (rth_vs_midnight IN ('above','below','at')),
  retrace_probability    NUMERIC,
  midnight_open_note     TEXT,
  is_target_today        BOOLEAN,
  ocr_timestamp_status   TEXT CHECK (ocr_timestamp_status IN ('valid','too_early','too_late','unreadable','weekend')),
  ocr_timestamp_delta    INTEGER;

-- trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS
  proof_screenshot_url   TEXT,
  gemini_verdict         TEXT CHECK (gemini_verdict IN ('CONFIRMED','DISPUTED','UNCLEAR')),
  gemini_confidence      TEXT CHECK (gemini_confidence IN ('High','Medium','Low')),
  gemini_evidence        TEXT[],
  gemini_notes           TEXT,
  gemini_dispute_reason  TEXT,
  proof_reviewed_at      TIMESTAMPTZ;

-- analysis-screenshots bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('analysis-screenshots', 'analysis-screenshots', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own analysis proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'analysis-screenshots' AND (auth.uid() = owner));

CREATE POLICY "Users can view their own analysis proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'analysis-screenshots' AND (auth.uid() = owner));

CREATE POLICY "Users can update their own analysis proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'analysis-screenshots' AND (auth.uid() = owner));

CREATE POLICY "Users can delete their own analysis proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'analysis-screenshots' AND (auth.uid() = owner));
