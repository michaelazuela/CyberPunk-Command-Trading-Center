import assert from 'node:assert/strict';
import {
  attachDiscordMessageReceiptToRagPayload,
  normalizeSupabaseRestUrl,
  resolveDiscordRagPersistenceConfig,
  upsertDiscordAlertRagPayload,
  type DiscordRagPersistenceConfig,
} from './discord-rag-persistence';

assert.equal(normalizeSupabaseRestUrl('https://project.supabase.co/rest/v1'), 'https://project.supabase.co');
assert.equal(normalizeSupabaseRestUrl('https://project.supabase.co/'), 'https://project.supabase.co');

const resolved = resolveDiscordRagPersistenceConfig({
  SUPABASE_URL: 'https://project.supabase.co/rest/v1',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
  DISCORD_RAG_USER_ID: 'user-1',
} as NodeJS.ProcessEnv);
assert.deepEqual(resolved, {
  config: {
    supabaseUrl: 'https://project.supabase.co',
    serviceRoleKey: 'service-role-test',
    userId: 'user-1',
  },
  missing: [],
});

const missing = resolveDiscordRagPersistenceConfig({} as NodeJS.ProcessEnv);
assert.equal(missing.config, null);
assert.deepEqual(missing.missing, ['SUPABASE_URL or VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DISCORD_RAG_USER_ID']);

const config: DiscordRagPersistenceConfig = {
  supabaseUrl: 'https://project.supabase.co',
  serviceRoleKey: 'service-role-test',
  userId: 'user-1',
};

const upsertCalls: Array<{ method: string; url: string; body: any }> = [];
const insertFallbackFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  upsertCalls.push({
    method: init?.method || 'GET',
    url: String(input),
    body: init?.body ? JSON.parse(String(init.body)) : null,
  });
  if ((init?.method || 'GET') === 'PATCH') {
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify([{ id: 'inserted-1' }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
};

const upsertResult = await upsertDiscordAlertRagPayload({
  config,
  planVersionId: 'PLAN-1',
  payload: { session_type: 'morning', trade_date: '2026-06-09' },
  fetchImpl: insertFallbackFetch,
});
assert.equal(upsertResult, 'inserted');
assert.equal(upsertCalls.length, 2);
assert.equal(upsertCalls[0].method, 'PATCH');
assert.ok(upsertCalls[0].url.includes('user_id=eq.user-1'));
assert.ok(upsertCalls[0].url.includes('plan_version_id=eq.PLAN-1'));
assert.equal(upsertCalls[0].body.user_id, 'user-1');
assert.equal(upsertCalls[0].body.plan_version_id, 'PLAN-1');
assert.equal(upsertCalls[1].method, 'POST');

const receiptCalls: Array<{ method: string; url: string; body: any }> = [];
const receiptFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  receiptCalls.push({
    method: init?.method || 'GET',
    url: String(input),
    body: init?.body ? JSON.parse(String(init.body)) : null,
  });
  if (!init?.method) {
    return new Response(JSON.stringify([{ id: 'row-1', trade_plan_json: { existing: true } }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify([{ id: 'row-1' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

const receiptUpdated = await attachDiscordMessageReceiptToRagPayload({
  config,
  planVersionId: 'PLAN-1',
  discordMessageId: 'message-1',
  webhookSource: 'scanner',
  fetchImpl: receiptFetch,
});
assert.equal(receiptUpdated, true);
assert.equal(receiptCalls.length, 2);
assert.ok(receiptCalls[0].url.includes('user_id=eq.user-1'));
assert.ok(receiptCalls[0].url.includes('plan_version_id=eq.PLAN-1'));
assert.ok(receiptCalls[1].url.includes('id=eq.row-1'));
assert.equal(receiptCalls[1].body.trade_plan_json.existing, true);
assert.equal(receiptCalls[1].body.trade_plan_json.discordMessage.messageId, 'message-1');
assert.equal(receiptCalls[1].body.trade_plan_json.discordMessage.webhookSource, 'scanner');

console.log('Discord RAG persistence helper verified.');
