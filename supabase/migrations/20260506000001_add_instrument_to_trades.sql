-- Add daily instrument columns

-- To 'trades' table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades') THEN
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS instrument TEXT CHECK ( instrument IN ('MES','MNQ') OR instrument IS NULL );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'setups') THEN
    ALTER TABLE setups ADD COLUMN IF NOT EXISTS instrument TEXT CHECK ( instrument IN ('MES','MNQ') OR instrument IS NULL );
  END IF;
END $$;
