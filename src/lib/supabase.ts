/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const viteEnv: Record<string, string | undefined> =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {}) as Record<string, string | undefined>;
const supabaseUrl = viteEnv.VITE_SUPABASE_URL || 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co';
const supabaseKey = viteEnv.VITE_SUPABASE_ANON_KEY || viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
