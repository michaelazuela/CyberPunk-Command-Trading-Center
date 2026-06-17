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
    if (String(url).includes('PLAN-ALREADY-SAVED')) {
      return new Response(JSON.stringify([{
        id: 'row-already-saved',
        embedding_text: 'existing embedding',
        trade_plan_json: {
          planVersionId: 'PLAN-ALREADY-SAVED',
          discordMessage: {
            messageId: 'discord-message-already-saved',
            webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
            editAfterOutcome: true,
          },
          discordOutcome: {
            updatedFrom: 'discord_button',
            outcomeCode: 'long_t2_hit',
            targetHit: 'T2',
            tradeResult: 'win',
          },
        },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('PLAN-DELETED-CARD')) {
      return new Response(JSON.stringify([{
        id: 'row-deleted-card',
        embedding_text: 'existing embedding',
        trade_plan_json: {
          planVersionId: 'PLAN-DELETED-CARD',
          discordMessage: {
            messageId: 'deleted-message-404',
            webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
            editAfterOutcome: true,
          },
        },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('PLAN-PATCH-FAIL')) {
      return new Response(JSON.stringify([{
        id: 'row-patch-fail',
        embedding_text: 'existing embedding',
        trade_plan_json: {
          planVersionId: 'PLAN-PATCH-FAIL',
          discordMessage: {
            messageId: 'discord-message-patch-fail',
            webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
            editAfterOutcome: true,
          },
        },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (String(url).includes('PLAN-SOURCE-WEBHOOK')) {
      return new Response(JSON.stringify([{
        id: 'row-source-webhook',
        embedding_text: 'existing embedding',
        trade_plan_json: {
          planVersionId: 'PLAN-SOURCE-WEBHOOK',
          discordMessage: {
            messageId: 'discord-message-source-webhook',
            webhookSource: 'SCANNER_DISCORD_WEBHOOK_URL',
            editAfterOutcome: true,
          },
        },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
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
    if ((init?.method || 'GET') === 'GET') {
      return new Response(JSON.stringify([{
        id: String(url).includes('row-already-saved')
          ? 'row-already-saved'
          : String(url).includes('row-deleted-card')
            ? 'row-deleted-card'
            : String(url).includes('row-patch-fail')
              ? 'row-patch-fail'
              : String(url).includes('row-source-webhook')
                ? 'row-source-webhook'
                : 'row-12345678',
        trade_plan_json: {
          existing: true,
          discordMessage: {
            messageId: String(url).includes('row-deleted-card')
              ? 'deleted-message-404'
              : String(url).includes('row-patch-fail')
                ? 'discord-message-patch-fail'
                : String(url).includes('row-source-webhook')
                  ? 'discord-message-source-webhook'
                  : 'discord-message-123',
            webhookSource: String(url).includes('row-source-webhook') ? 'SCANNER_DISCORD_WEBHOOK_URL' : 'QUANT_DESK_SCANNER_WEBHOOK_URL',
            editAfterOutcome: true,
          },
        },
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify([{ id: 'row-12345678' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(url).includes('/api/webhooks/')) {
    if ((init?.method || 'GET') === 'PATCH' && String(url).includes('/messages/discord-message-patch-fail')) {
      return new Response('forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });
    }
    if ((init?.method || 'GET') === 'PATCH' && String(url).includes('/messages/deleted-message-404')) {
      return new Response('not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
    if ((init?.method || 'GET') === 'POST') {
      return new Response(JSON.stringify({ id: 'replacement-message-123' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const keyCheckResponse = await onRequestGet({
    request: new Request('https://quant-desk.example/api/discord-outcome?keycheck=1'),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      DISCORD_OUTCOME_SECRET_PREVIOUS: 'old-secret',
    },
  });
  assert.equal(keyCheckResponse.status, 200);
  const keyCheck = await keyCheckResponse.json();
  assert.equal(keyCheck.configured, true);
  assert.equal(keyCheck.activeKeyId, keyId(secret));
  assert.deepEqual(keyCheck.acceptedKeyIds, [keyId(secret), keyId('old-secret')]);
  assert.equal(keyCheck.boundary, 'decision_support_only_no_automated_orders');
  assert.equal(JSON.stringify(keyCheck).includes(secret), false);

  const missingKeyCheckResponse = await onRequestGet({
    request: new Request('https://quant-desk.example/api/discord-outcome?keycheck=1'),
    env: {},
  });
  assert.equal(missingKeyCheckResponse.status, 500);
  const missingKeyCheck = await missingKeyCheckResponse.json();
  assert.equal(missingKeyCheck.configured, false);

  const token = buildToken(payload, secret);
  const response = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(token)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
      SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/secondary-webhook-id/secondary-webhook-token',
    },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('Saved to RAG.'));
  assert.ok(html.includes('Discord card locked.'));

  const discordPatch = calls.find((call) => call.init.method === 'PATCH' && call.url.includes('/api/webhooks/'));
  assert.ok(discordPatch, 'expected Discord webhook message PATCH after RAG save');
  assert.ok(discordPatch.url.includes('/messages/discord-message-123'));
  assert.ok(discordPatch.url.includes('with_components=true'));
  const body = JSON.parse(String(discordPatch.init.body));
  const buttons = body.components.flatMap((row) => row.components);
  assert.ok(buttons.every((button) => button.style === 5), 'locked buttons must remain webhook-compatible link buttons');
  assert.ok(buttons.every((button) => button.disabled === true), 'locked buttons must be disabled');
  assert.ok(buttons.every((button) => String(button.url).includes('/api/discord-outcome?locked=1')), 'locked link buttons must point at a harmless locked receipt URL');
  assert.ok(buttons.some((button) => button.label === 'LONG T2 saved'));
  assert.ok(JSON.stringify(body).includes('No automated orders'));
  const lockedResponse = await onRequestGet({
    request: new Request('https://quant-desk.example/api/discord-outcome?locked=1'),
    env: {},
  });
  assert.equal(lockedResponse.status, 200);
  assert.ok((await lockedResponse.text()).includes('already locked'));
  const secretKeyToken = buildToken({ ...payload, pid: 'PLAN-SECRET-KEY-HEADERS', kid: keyId(secret) }, secret);
  await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(secretKeyToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_server_key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  const secretKeyLookup = calls.find((call) =>
    String(call.url).includes('/rest/v1/trade_embeddings?plan_version_id=eq.PLAN-SECRET-KEY-HEADERS')
  );
  assert.ok(secretKeyLookup, 'expected Supabase lookup with sb_secret key');
  assert.equal(secretKeyLookup.init.headers.Authorization, undefined);
  assert.equal(secretKeyLookup.init.headers.apikey, 'sb_secret_server_key');

  const callsBeforeAlreadySaved = calls.length;
  const alreadySavedToken = buildToken({ ...payload, pid: 'PLAN-ALREADY-SAVED', kid: keyId(secret) }, secret);
  const alreadySavedResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(alreadySavedToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(alreadySavedResponse.status, 200);
  assert.ok((await alreadySavedResponse.text()).includes('Already saved.'));
  const alreadySavedCalls = calls.slice(callsBeforeAlreadySaved);
  assert.ok(alreadySavedCalls.some((call) => String(call.url).includes('/messages/discord-message-already-saved')));
  assert.ok(!alreadySavedCalls.some((call) => String(call.url).endsWith('/rest/v1/trade_embeddings') && call.init.method === 'POST'), 'already-saved outcome must not insert a duplicate RAG row');
  assert.ok(!alreadySavedCalls.some((call) => {
    if (call.init.method !== 'PATCH' || !call.init.body) return false;
    const patch = JSON.parse(String(call.init.body));
    return patch.trade_plan_json?.discordOutcome?.updatedFrom === 'discord_button';
  }), 'already-saved outcome must not rewrite the saved outcome');

  const deletedCardToken = buildToken({ ...payload, pid: 'PLAN-DELETED-CARD', kid: keyId(secret) }, secret);
  const deletedCardResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(deletedCardToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(deletedCardResponse.status, 200);
  const deletedCardHtml = await deletedCardResponse.text();
  assert.ok(deletedCardHtml.includes('locked replacement receipt posted'));
  const deletedCardPatch = calls.find((call) => call.init.method === 'PATCH' && String(call.url).includes('/messages/deleted-message-404'));
  assert.ok(deletedCardPatch, 'expected original deleted Discord card patch attempt');
  const replacementPost = calls.find((call) => call.init.method === 'POST' && String(call.url).includes('/api/webhooks/') && String(call.init.body).includes('Original Discord card was no longer available'));
  assert.ok(replacementPost, 'expected replacement locked receipt post when original card is deleted');
  assert.ok(String(replacementPost.url).includes('with_components=true'));
  const replacementBody = JSON.parse(String(replacementPost.init.body));
  assert.equal(replacementBody.allowed_mentions.parse.length, 0);
  assert.ok(JSON.stringify(replacementBody.components).includes('No automated orders'));
  assert.ok(calls.some((call) => {
    if (call.init.method !== 'PATCH' || !String(call.url).includes('/rest/v1/trade_embeddings?id=eq.row-deleted-card')) return false;
    const patch = JSON.parse(String(call.init.body));
    return patch.trade_plan_json?.discordOutcomeLock?.status === 'replacement_posted' &&
      patch.trade_plan_json.discordOutcomeLock.replacementMessageId === 'replacement-message-123' &&
      patch.trade_plan_json.discordOutcomeLock.approvalBoundary?.replacementReceiptApprovesTrade === false;
  }), 'expected RAG row to record replacement lock status without changing trade approval');

  const patchFailToken = buildToken({ ...payload, pid: 'PLAN-PATCH-FAIL', kid: keyId(secret) }, secret);
  const patchFailResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(patchFailToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
    },
  });
  assert.equal(patchFailResponse.status, 200);
  assert.ok((await patchFailResponse.text()).includes('Discord card lock unavailable (discord_patch_failed_403).'));
  assert.ok(calls.some((call) => {
    if (call.init.method !== 'PATCH' || !String(call.url).includes('/rest/v1/trade_embeddings?id=eq.row-patch-fail')) return false;
    const patch = JSON.parse(String(call.init.body));
    return patch.trade_plan_json?.discordOutcomeLock?.status === 'unavailable' &&
      patch.trade_plan_json.discordOutcomeLock.reason === 'discord_patch_failed_403' &&
      patch.trade_plan_json.discordOutcomeLock.approvalBoundary?.discordLockApprovesTrade === false;
  }), 'expected RAG row to record Discord lock patch failures');

  const sourceWebhookToken = buildToken({ ...payload, pid: 'PLAN-SOURCE-WEBHOOK', kid: keyId(secret) }, secret);
  const sourceWebhookResponse = await onRequestGet({
    request: new Request(`https://quant-desk.example/api/discord-outcome?t=${encodeURIComponent(sourceWebhookToken)}`),
    env: {
      DISCORD_OUTCOME_SECRET: secret,
      SUPABASE_URL: 'https://supabase.example',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      DISCORD_RAG_USER_ID: 'user-123',
      QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.com/api/webhooks/webhook-id/webhook-token',
      SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/secondary-webhook-id/secondary-webhook-token',
    },
  });
  assert.equal(sourceWebhookResponse.status, 200);
  assert.ok(calls.some((call) =>
    call.init.method === 'PATCH' &&
    String(call.url).includes('/api/webhooks/secondary-webhook-id/') &&
    String(call.url).includes('/messages/discord-message-source-webhook') &&
    String(call.url).includes('with_components=true')
  ), 'expected Discord lock to use the webhook source stored with the original receipt');

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
