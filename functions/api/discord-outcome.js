function html(message, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Quant Desk Outcome</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #050505; color: #f5f5f5; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      main { max-width: 720px; border: 1px solid #ff6d00; background: #101010; padding: 24px; box-shadow: 0 0 24px rgba(255,109,0,.16); }
      h1 { margin: 0 0 12px; color: #ff8a00; font-size: 18px; letter-spacing: .12em; text-transform: uppercase; }
      p { line-height: 1.55; color: #ddd; }
      .ok { color: #00e676; }
      .warn { color: #ffcc00; }
    </style>
  </head>
  <body>
    <main>
      <h1>Quant Desk Outcome</h1>
      <p>${escapeHtml(message)}</p>
      <p class="${status >= 200 && status < 300 ? 'ok' : 'warn'}">Decision support only. No automated orders were placed.</p>
    </main>
  </body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getEnv(context, name) {
  return context.env?.[name] || '';
}

function normalizeOutcomeSecret(secret) {
  return String(secret || '').trim().replace(/^["']|["']$/g, '').trim();
}

async function secretKeyId(secret) {
  const normalized = normalizeOutcomeSecret(secret);
  if (!normalized) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return bytesToHex(digest).slice(0, 12);
}

async function keyCheckResponse(context) {
  const activeSecret = normalizeOutcomeSecret(getEnv(context, 'DISCORD_OUTCOME_SECRET'));
  const previousSecrets = String(getEnv(context, 'DISCORD_OUTCOME_SECRET_PREVIOUS') || '')
    .split(',')
    .map(normalizeOutcomeSecret)
    .filter(Boolean);
  const activeKeyId = await secretKeyId(activeSecret);
  const previousKeyIds = [];
  for (const previousSecret of previousSecrets) {
    const previousKeyId = await secretKeyId(previousSecret);
    if (previousKeyId) previousKeyIds.push(previousKeyId);
  }
  return new Response(JSON.stringify({
    ok: Boolean(activeKeyId),
    configured: Boolean(activeKeyId),
    activeKeyId,
    acceptedKeyIds: [activeKeyId, ...previousKeyIds].filter(Boolean),
    boundary: 'decision_support_only_no_automated_orders',
  }), {
    status: activeKeyId ? 200 : 500,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function sign(encodedPayload, secret) {
  const normalizedSecret = normalizeOutcomeSecret(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(normalizedSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return bytesToHex(signature);
}

function outcomeSecrets(context) {
  const active = normalizeOutcomeSecret(getEnv(context, 'DISCORD_OUTCOME_SECRET'));
  const previous = String(getEnv(context, 'DISCORD_OUTCOME_SECRET_PREVIOUS') || '')
    .split(',')
    .map(normalizeOutcomeSecret)
    .filter(Boolean);
  return [active, ...previous].filter(Boolean);
}

async function verifyToken(token, secrets) {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) throw new Error('Missing or malformed outcome token.');
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
  for (const secret of secrets) {
    const expected = await sign(encodedPayload, secret);
    if (timingSafeEqualHex(expected, signature)) return validateOutcomePayload(payload);
  }
  const tokenKid = payload?.kid ? ` Token key id: ${payload.kid}.` : '';
  throw new Error(`Outcome token signature is invalid.${tokenKid} The Discord button was signed with a different outcome secret than this deployed endpoint accepts.`);
}

function validateOutcomePayload(payload) {
  if (payload.v !== 1) throw new Error('Unsupported outcome token version.');
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Outcome token expired.');
  }
  if (!payload.pid || !payload.s || !payload.d || !payload.i || !payload.tr) {
    throw new Error('Outcome token is missing required plan data.');
  }
  return payload;
}

function normalizeSupabaseUrl(context) {
  const raw = getEnv(context, 'SUPABASE_URL') || getEnv(context, 'VITE_SUPABASE_URL');
  return raw ? raw.replace(/\/$/, '') : '';
}

function normalizeTradeResult(value) {
  const normalized = String(value || '').toLowerCase();
  if (['win', 'loss', 'scratch', 'no_trade', 'missed_trade'].includes(normalized)) return normalized;
  return 'pending';
}

function outcomeSummary(payload) {
  if (payload.tt) {
    return `${payload.dir} trade marked ${payload.tr.toUpperCase()} (${payload.hit || 'NONE'}).`;
  }
  return payload.tr === 'missed_trade' ? 'Trade marked MISSED.' : 'Trade marked NOT TAKEN.';
}

function outcomeLockLabel(payload) {
  if (payload.hit === 'T1') return `${payload.dir || ''} T1 saved`.trim();
  if (payload.hit === 'T2') return `${payload.dir || ''} T2 saved`.trim();
  if (payload.hit === 'RUNNER') return `${payload.dir || ''} runner saved`.trim();
  if (payload.hit === 'STRETCH') return `${payload.dir || ''} stretch saved`.trim();
  if (payload.hit === 'STOP') return `${payload.dir || ''} stopped saved`.trim();
  if (payload.tr === 'scratch') return 'Scratch saved';
  if (payload.tr === 'missed_trade') return 'Missed saved';
  if (payload.tr === 'no_trade') return 'No trade saved';
  return 'Outcome saved';
}

function disabledButton(label, customId) {
  return {
    type: 2,
    style: 2,
    label,
    custom_id: customId.slice(0, 100),
    disabled: true,
  };
}

function buildLockedOutcomeComponents(payload) {
  const planId = String(payload.pid || 'plan').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  return [
    {
      type: 1,
      components: [
        disabledButton(outcomeLockLabel(payload), `rag_saved_${planId}`),
        disabledButton('RAG submitted', `rag_submitted_${planId}`),
        disabledButton('No automated orders', `decision_support_${planId}`),
      ],
    },
  ];
}

function discordWebhookUrl(context) {
  return (
    getEnv(context, 'QUANT_DESK_SCANNER_WEBHOOK_URL') ||
    getEnv(context, 'SCANNER_DISCORD_WEBHOOK_URL') ||
    getEnv(context, 'DISCORD_WEBHOOK_URL')
  );
}

async function lockDiscordOutcomeMessage(context, payload, discordMessage) {
  const messageId = typeof discordMessage?.messageId === 'string' ? discordMessage.messageId : '';
  const webhookUrl = discordWebhookUrl(context);
  if (!messageId || !webhookUrl) {
    return { edited: false, reason: !messageId ? 'missing_discord_message_id' : 'missing_discord_webhook_url' };
  }
  const url = new URL(webhookUrl);
  url.search = '';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/messages/${encodeURIComponent(messageId)}`;
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      components: buildLockedOutcomeComponents(payload),
    }),
  });
  if (!response.ok) {
    return { edited: false, reason: `discord_patch_failed_${response.status}` };
  }
  return { edited: true, reason: null };
}

function journalResultR(existingJournalRecord, payload, tradeResult) {
  if (!payload.tt || tradeResult === 'no_trade' || tradeResult === 'missed_trade') return null;
  if (tradeResult === 'scratch') return 0;
  if (tradeResult === 'loss' || payload.hit === 'STOP') return -1;
  if (payload.hit === 'T1') {
    return typeof existingJournalRecord?.plannedR === 'number' ? existingJournalRecord.plannedR : 1.5;
  }
  if (payload.hit === 'T2') return 2;
  return null;
}

async function selectExistingRecord(context, payload, headers) {
  const supabaseUrl = normalizeSupabaseUrl(context);
  const response = await fetch(
    `${supabaseUrl}/rest/v1/trade_embeddings?plan_version_id=eq.${encodeURIComponent(payload.pid)}&select=id,trade_plan_json,embedding_text`,
    { headers }
  );
  if (!response.ok) {
    throw new Error(`Supabase lookup failed (${response.status}): ${await response.text()}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function persistOutcome(context, payload) {
  const supabaseUrl = normalizeSupabaseUrl(context);
  const serviceRoleKey = getEnv(context, 'SUPABASE_SERVICE_ROLE_KEY');
  const userId = getEnv(context, 'DISCORD_RAG_USER_ID');
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    throw new Error('Missing Cloudflare environment. Set SUPABASE_URL or VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.');
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const existing = await selectExistingRecord(context, payload, headers);
  const tradeResult = normalizeTradeResult(payload.tr);
  const outcomePatch = {
    tradeTaken: Boolean(payload.tt),
    direction: payload.dir || 'NONE',
    targetHit: payload.hit || 'NONE',
    outcomeCode: payload.o || null,
    tradeResult,
    updatedFrom: 'discord_button',
    updatedAt: new Date().toISOString(),
    approvalBoundary: {
      proofSubmissionApprovesTrade: false,
      tradeConfirmationOverridesRiskRules: false,
      ragSaveApprovesTradeRetroactively: false,
    },
  };
  const existingPlanJson = existing?.trade_plan_json && typeof existing.trade_plan_json === 'object'
    ? existing.trade_plan_json
    : {};
  const existingJournalRecord = existingPlanJson.journalRecord && typeof existingPlanJson.journalRecord === 'object'
    ? existingPlanJson.journalRecord
    : null;
  const journalRecord = existingJournalRecord
    ? {
        ...existingJournalRecord,
        outcome: tradeResult === 'scratch' ? 'breakeven' : tradeResult,
        actualResultR: journalResultR(existingJournalRecord, payload, tradeResult),
        discordAlertId: payload.pid,
        notes: `Discord outcome button: ${outcomeSummary(payload)}`,
      }
    : null;
  const tradePlanJson = {
    ...existingPlanJson,
    discordOutcome: outcomePatch,
    ...(journalRecord ? { journalRecord } : {}),
  };
  const patchPayload = {
    user_id: userId,
    session_type: payload.s,
    trade_date: payload.d,
    day_of_week: payload.dow || new Date(`${payload.d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
    instrument: payload.i,
    trade_result: tradeResult,
    outcome: tradeResult,
    source: 'discord_alert',
    analysis_mode: 'live',
    plan_version_id: payload.pid,
    trade_plan_json: tradePlanJson,
    embedding_text: existing?.embedding_text || `Discord outcome for ${payload.s} ${payload.i} ${payload.d}. ${outcomeSummary(payload)}`,
    notes: `Discord outcome button: ${outcomeSummary(payload)}`,
  };

  if (existing?.id) {
    const response = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchPayload),
    });
    if (!response.ok) throw new Error(`Supabase outcome update failed (${response.status}): ${await response.text()}`);
    return { rowId: existing.id, discordMessage: tradePlanJson.discordMessage || null };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...patchPayload,
      setup_quality_score: 0.5,
    }),
  });
  if (!response.ok) throw new Error(`Supabase outcome insert failed (${response.status}): ${await response.text()}`);
  const rows = await response.json().catch(() => []);
  return {
    rowId: Array.isArray(rows) && rows[0]?.id ? rows[0].id : payload.pid,
    discordMessage: tradePlanJson.discordMessage || null,
  };
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    if (url.searchParams.get('keycheck') === '1') {
      return keyCheckResponse(context);
    }
    const token = url.searchParams.get('t');
    const secrets = outcomeSecrets(context);
    if (!secrets.length) {
      return html('Missing DISCORD_OUTCOME_SECRET in Cloudflare environment.', 500);
    }
    const payload = await verifyToken(token, secrets);
    const result = await persistOutcome(context, payload);
    const lock = await lockDiscordOutcomeMessage(context, payload, result.discordMessage);
    const lockText = lock.edited
      ? 'Discord card locked.'
      : `Discord card lock unavailable (${lock.reason}).`;
    return html(`Saved to RAG. ${lockText} Plan ${payload.pid}. ${outcomeSummary(payload)} Row ${String(result.rowId).slice(0, 8)}.`);
  } catch (error) {
    return html(error instanceof Error ? error.message : String(error), 400);
  }
}
