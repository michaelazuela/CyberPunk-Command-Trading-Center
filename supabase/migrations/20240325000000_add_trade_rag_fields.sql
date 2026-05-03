-- Add RAG fields to trades table safely (camelCase columns to match TS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='screenshotUrl') THEN
        ALTER TABLE trades ADD COLUMN "screenshotUrl" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='analysisType') THEN
        ALTER TABLE trades ADD COLUMN "analysisType" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='analysisConfidence') THEN
        ALTER TABLE trades ADD COLUMN "analysisConfidence" NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='analysisReasoning') THEN
        ALTER TABLE trades ADD COLUMN "analysisReasoning" TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='setupTags') THEN
        ALTER TABLE trades ADD COLUMN "setupTags" TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trades' AND column_name='outcomeLabel') THEN
        ALTER TABLE trades ADD COLUMN "outcomeLabel" TEXT;
    END IF;
END $$;

