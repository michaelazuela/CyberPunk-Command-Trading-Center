export interface DiscordRagPersistenceConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
}

export interface DiscordRagPersistenceConfigResult {
  config: DiscordRagPersistenceConfig | null;
  missing: string[];
}

export function normalizeSupabaseRestUrl(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

export function resolveDiscordRagPersistenceConfig(env: NodeJS.ProcessEnv = process.env): DiscordRagPersistenceConfigResult {
  const supabaseUrl = normalizeSupabaseRestUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = env.DISCORD_RAG_USER_ID || '';
  const missing = [
    supabaseUrl ? null : 'SUPABASE_URL or VITE_SUPABASE_URL',
    serviceRoleKey ? null : 'SUPABASE_SERVICE_ROLE_KEY',
    userId ? null : 'DISCORD_RAG_USER_ID',
  ].filter(Boolean) as string[];

  if (missing.length) return { config: null, missing };
  return { config: { supabaseUrl: supabaseUrl as string, serviceRoleKey, userId }, missing: [] };
}

export function discordRagServiceHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

export async function upsertDiscordAlertRagPayload(args: {
  config: DiscordRagPersistenceConfig;
  planVersionId: string;
  payload: Record<string, unknown>;
  fetchImpl?: typeof fetch;
  errorLabel?: string;
}): Promise<'updated' | 'inserted'> {
  const fetcher = args.fetchImpl || fetch;
  const label = args.errorLabel || 'Discord alert RAG';
  const { supabaseUrl, serviceRoleKey, userId } = args.config;
  const headers = discordRagServiceHeaders(serviceRoleKey);
  const scopedPlanQuery = `user_id=eq.${encodeURIComponent(userId)}&plan_version_id=eq.${encodeURIComponent(args.planVersionId)}`;

  const updateResponse = await fetcher(`${supabaseUrl}/rest/v1/trade_embeddings?${scopedPlanQuery}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ ...args.payload, user_id: userId, plan_version_id: args.planVersionId }),
  });
  if (!updateResponse.ok) {
    throw new Error(`${label} update failed (${updateResponse.status}): ${await updateResponse.text()}`);
  }
  const updatedRows = await updateResponse.json().catch(() => []);
  if (Array.isArray(updatedRows) && updatedRows.length > 0) return 'updated';

  const insertResponse = await fetcher(`${supabaseUrl}/rest/v1/trade_embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...args.payload, user_id: userId, plan_version_id: args.planVersionId }),
  });
  if (!insertResponse.ok) {
    throw new Error(`${label} insert failed (${insertResponse.status}): ${await insertResponse.text()}`);
  }
  return 'inserted';
}

export async function attachDiscordMessageReceiptToRagPayload(args: {
  config: DiscordRagPersistenceConfig;
  planVersionId: string;
  discordMessageId: string | null;
  webhookSource: string | null;
  fetchImpl?: typeof fetch;
  warningLabel?: string;
}): Promise<boolean> {
  if (!args.discordMessageId) return false;
  const fetcher = args.fetchImpl || fetch;
  const label = args.warningLabel || 'Discord alert message receipt';
  const { supabaseUrl, serviceRoleKey, userId } = args.config;
  const headers = discordRagServiceHeaders(serviceRoleKey);
  const lookup = await fetcher(
    `${supabaseUrl}/rest/v1/trade_embeddings?user_id=eq.${encodeURIComponent(userId)}&plan_version_id=eq.${encodeURIComponent(args.planVersionId)}&select=id,trade_plan_json`,
    { headers },
  );
  if (!lookup.ok) {
    console.warn(`${label} lookup skipped (${lookup.status}).`);
    return false;
  }
  const rows = await lookup.json().catch(() => []);
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row?.id) return false;

  const existingPlanJson = row.trade_plan_json && typeof row.trade_plan_json === 'object' ? row.trade_plan_json : {};
  const update = await fetcher(`${supabaseUrl}/rest/v1/trade_embeddings?user_id=eq.${encodeURIComponent(userId)}&id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      trade_plan_json: {
        ...existingPlanJson,
        discordMessage: {
          messageId: args.discordMessageId,
          webhookSource: args.webhookSource,
          editAfterOutcome: true,
          storedAt: new Date().toISOString(),
        },
      },
    }),
  });
  if (!update.ok) {
    console.warn(`${label} update skipped (${update.status}).`);
    return false;
  }
  return true;
}
