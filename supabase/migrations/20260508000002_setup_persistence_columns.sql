-- Align persisted analysis setup records with the fields the live app saves.

ALTER TABLE setups
  ADD COLUMN IF NOT EXISTS instrument TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'setups_instrument_check'
      AND conrelid = 'public.setups'::regclass
  ) THEN
    ALTER TABLE setups
      ADD CONSTRAINT setups_instrument_check
      CHECK (instrument IS NULL OR instrument IN ('MES', 'MNQ'));
  END IF;
END $$;
