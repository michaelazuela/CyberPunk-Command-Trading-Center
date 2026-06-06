-- Supabase advisor hardening recorded in the linked Supabase migration history.
-- This file reconciles local migration history with the remote project.

CREATE INDEX IF NOT EXISTS trade_embeddings_user_id_idx ON trade_embeddings(user_id);
CREATE INDEX IF NOT EXISTS trade_embeddings_trade_id_idx ON trade_embeddings(trade_id);
CREATE INDEX IF NOT EXISTS trade_embeddings_setup_id_idx ON trade_embeddings(setup_id);

ALTER FUNCTION public.match_similar_setups(vector, integer, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
