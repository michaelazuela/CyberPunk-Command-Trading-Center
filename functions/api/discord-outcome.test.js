import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { onRequestGet } from './discord-outcome.js';

function base64Url(input) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(encodedPayload, secret) {
  const normalized = String(secret || '').trim().replace(/^["']|["']$/g, '').trim();
  return crypto.createHmac('sha256', normalized).update(encodedPayload).digest('hex');
}

function keyId(secret) {
  const normalized = String(secret || '').trim().replace(/^["']|["']$/g, '').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
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
  kid: keyId(secret),
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

  const runnerToken = buildToken({ ...payload, pid: 'PLAN-RUNNER-TEST', o: 'long_runner_hit', hit: 'RUNNER', kid: keyId(secret) }, secret);
  const runnerResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(runnerToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(runnerResponse.status, 200);
  assert.ok((await runnerResponse.text()).includes('LONG trade marked WIN (RUNNER).'));
  assert.ok(calls.some((call) => {
    if (call.init.method !== 'PATCH' || !String(call.url).includes('/rest/v1/trade_embeddings?id=')) return false;
    const patch = JSON.parse(String(call.init.body));
    return patch.trade_plan_json?.discordOutcome?.targetHit === 'RUNNER';
  }), 'expected Supabase RAG patch to preserve RUNNER targetHit');

  const stretchToken = buildToken({ ...payload, pid: 'PLAN-STRETCH-TEST', o: 'long_stretch_hit', hit: 'STRETCH', kid: keyId(secret) }, secret);
  const stretchResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(stretchToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(stretchResponse.status, 200);
  assert.ok((await stretchResponse.text()).includes('LONG trade marked WIN (STRETCH).'));
  assert.ok(calls.some((call) => {
    if (call.init.method !== 'PATCH' || !String(call.url).includes('/rest/v1/trade_embeddings?id=')) return false;
    const patch = JSON.parse(String(call.init.body));
    return patch.trade_plan_json?.discordOutcome?.targetHit === 'STRETCH';
  }), 'expected Supabase RAG patch to preserve STRETCH targetHit');

  const previousSecretToken = buildToken({ ...payload, pid: 'PLAN-PREVIOUS-SECRET', kid: keyId('old-secret') }, 'old-secret');
  const previousSecretResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(previousSecretToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: 'new-secret',
      DISCORD_OUTCOME_SECRET_PREVIOUS: 'old-secret',
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(previousSecretResponse.status, 200);

  const quotedSecretToken = buildToken({ ...payload, pid: 'PLAN-QUOTED-SECRET', kid: keyId('endpoint-test-secret') }, 'endpoint-test-secret');
  const quotedSecretResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(quotedSecretToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: '  "endpoint-test-secret"  ',
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(quotedSecretResponse.status, 200);

  const invalidSecretResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(token)}`),
    env: {
      DISCORD_OUTCOME_SECRET: 'different-secret',
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
    },
  });
  assert.equal(invalidSecretResponse.status, 400);
  const invalidHtml = await invalidSecretResponse.text();
  assert.ok(invalidHtml.includes('signed with a different outcome secret'));
  assert.ok(invalidHtml.includes(payload.kid));

  console.log('Discord outcome endpoint lock verified.');
} finally {
  globalThis.fetch = originalFetch;
}
