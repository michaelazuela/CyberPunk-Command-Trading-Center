import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { onRequestGet } from './discord-outcome.js';

function base64Url(input) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(encodedPayload, secret) {
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex');
}

function buildToken(payload, secret) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

const secret = 'endpoint-test-secret';
const payload = {
  v: 1,
  exp: Math.floor(Date.now() / 1000) + 600,
  pid: 'PLAN-LOCK-TEST',
  s: 'morning',
  d: '2026-06-02',
  i: 'MES',
  dow: 'Tuesday',
  o: 'long_t2_hit',
  tr: 'win',
  tt: true,
  dir: 'LONG',
  hit: 'T2',
  pp: true,
};

const calls = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('/rest/v1/trade_embeddings?plan_version_id=')) {
    return new Response(JSON.stringify([{
      id: 'row-12345678',
      embedding_text: 'existing embedding',
      trade_plan_json: {
        planVersionId: 'PLAN-LOCK-TEST',
        discordMessage: {
          messageId: 'discord-message-123',
          webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
          editAfterOutcome: true,
        },
      },
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('/rest/v1/trade_embeddings?id=')) {
    return new Response(JSON.stringify([{ id: 'row-12345678' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('/api/webhooks/')) {
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const token = buildToken(payload, secret);
  const response = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(token)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('Saved to RAG.'));
  assert.ok(html.includes('Discord card locked.'));

  const discordPatch = calls.find((call) => call.init.method === 'PATCH' && call.url.includes('/api/webhooks/'));
  assert.ok(discordPatch, 'expected Discord webhook message PATCH after RAG save');
  assert.ok(discordPatch.url.endsWith('/messages/discord-message-123'));
  const body = JSON.parse(String(discordPatch.init.body));
  const buttons = body.components.flatMap((row) => row.components);
  assert.ok(buttons.every((button) => button.style === 2), 'locked buttons must be grey secondary buttons');
  assert.ok(buttons.every((button) => button.disabled === true), 'locked buttons must be disabled');
  assert.ok(buttons.some((button) => button.label === 'LONG T2 saved'));
  assert.ok(JSON.stringify(body).includes('No automated orders'));

  console.log('Discord outcome endpoint lock verified.');
} finally {
  globalThis.fetch = originalFetch;
}
