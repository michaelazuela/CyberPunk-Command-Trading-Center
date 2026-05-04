-- Add proof fields to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS gemini_verdict TEXT CHECK (
  gemini_verdict IN ('CONFIRMED', 'DISPUTED', 'UNCLEAR') OR gemini_verdict IS NULL
),
ADD COLUMN IF NOT EXISTS gemini_confidence TEXT CHECK (
  gemini_confidence IN ('High', 'Medium', 'Low') OR gemini_confidence IS NULL
),
ADD COLUMN IF NOT EXISTS gemini_evidence TEXT,
ADD COLUMN IF NOT EXISTS gemini_notes TEXT,
ADD COLUMN IF NOT EXISTS gemini_dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS proof_reviewed_at TIMESTAMPTZ;

-- Add proof_reviewed_at to RAG sync function trigger if needed?
-- The requirements just asked for the migration of the trade table:

-- Set up storage bucket for trade proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-proofs', 'trade-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for trade-proofs
CREATE POLICY "Users can upload their own trade proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trade-proofs' AND (auth.uid() = owner));

CREATE POLICY "Users can view their own trade proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'trade-proofs' AND (auth.uid() = owner));

CREATE POLICY "Users can update their own trade proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'trade-proofs' AND (auth.uid() = owner));

CREATE POLICY "Users can delete their own trade proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'trade-proofs' AND (auth.uid() = owner));
