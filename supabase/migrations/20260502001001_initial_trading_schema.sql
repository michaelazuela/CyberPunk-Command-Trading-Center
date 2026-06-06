-- Initial trading schema recorded in the linked Supabase migration history.
-- This file reconciles local migration history with the remote project.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  day_type TEXT NOT NULL CHECK (day_type IN ('TYPE 1 LONG', 'TYPE 2 LONG', 'TYPE 1 SHORT', 'TYPE 2 SHORT', 'LUNCH REVERSAL', 'DISTRIBUTION', 'NO TRADE')),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  stop_price NUMERIC NOT NULL,
  target_price NUMERIC NOT NULL,
  contracts INTEGER NOT NULL DEFAULT 1 CHECK (contracts > 0),
  pnl NUMERIC,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED', 'EXECUTED', 'MISSED', 'SUCCESSFUL', 'FAILED')),
  exit_reason TEXT CHECK (exit_reason IS NULL OR exit_reason IN ('TARGET', 'STOP', 'HARD EXIT', 'MANUAL')),
  manual_outcome TEXT CHECK (manual_outcome IS NULL OR manual_outcome IN ('SUCCESS', 'FAILED')),
  notes TEXT,
  timestamp BIGINT NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL,
  reasoning TEXT,
  confidence NUMERIC,
  image_url TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  suggested_entry NUMERIC,
  suggested_stop NUMERIC,
  suggested_target NUMERIC,
  ocr_text JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_trades_updated_at ON public.trades;
CREATE TRIGGER set_trades_updated_at
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_setups_updated_at ON public.setups;
CREATE TRIGGER set_setups_updated_at
BEFORE UPDATE ON public.setups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trades_select_own" ON public.trades;
CREATE POLICY "trades_select_own" ON public.trades
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_insert_own" ON public.trades;
CREATE POLICY "trades_insert_own" ON public.trades
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_update_own" ON public.trades;
CREATE POLICY "trades_update_own" ON public.trades
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trades_delete_own" ON public.trades;
CREATE POLICY "trades_delete_own" ON public.trades
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_select_own" ON public.setups;
CREATE POLICY "setups_select_own" ON public.setups
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_insert_own" ON public.setups;
CREATE POLICY "setups_insert_own" ON public.setups
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_update_own" ON public.setups;
CREATE POLICY "setups_update_own" ON public.setups
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "setups_delete_own" ON public.setups;
CREATE POLICY "setups_delete_own" ON public.setups
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('screenshots', 'screenshots', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "screenshots_select_own" ON storage.objects;
CREATE POLICY "screenshots_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "screenshots_insert_own" ON storage.objects;
CREATE POLICY "screenshots_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "screenshots_update_own" ON storage.objects;
CREATE POLICY "screenshots_update_own" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "screenshots_delete_own" ON storage.objects;
CREATE POLICY "screenshots_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE INDEX IF NOT EXISTS trades_user_timestamp_idx ON public.trades (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS setups_user_created_at_idx ON public.setups (user_id, created_at DESC);
