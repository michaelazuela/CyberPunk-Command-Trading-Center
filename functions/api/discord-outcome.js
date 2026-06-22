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

function supabaseServiceHeaders(serviceRoleKey) {
  const headers = {
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (!String(serviceRoleKey || '').startsWith('sb_secret_')) {
    headers.Authorization = `Bearer ${serviceRoleKey}`;
  }
  return headers;
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
    capabilities: {
      tradeOutcomeButtons: true,
      watchFeedbackResearch: true,
    },
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
  if (payload.ft === 'watch_feedback') {
    return `Tactical watch feedback marked ${watchFeedbackLabel(payload.wf).toUpperCase()}.`;
  }
  if (payload.tt) {
    return `${payload.dir} trade marked ${payload.tr.toUpperCase()} (${payload.hit || 'NONE'}).`;
  }
  return payload.tr === 'missed_trade' ? 'Trade marked MISSED.' : 'Trade marked NOT TAKEN.';
}

function watchFeedbackLabel(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'watch_worked') return 'Watch worked';
  if (normalized === 'worked_after_invalidation') return 'Worked after invalidation';
  if (normalized === 'watch_failed') return 'Watch failed';
  if (normalized === 'stale_when_posted') return 'Stale when posted';
  if (normalized === 'no_trigger') return 'No trigger';
  if (normalized === 'needs_review') return 'Needs review';
  return 'Watch feedback';
}

function outcomeLockLabel(payload) {
  if (payload.ft === 'watch_feedback') return `${watchFeedbackLabel(payload.wf)} saved`;
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

function outcomeLockUrl(context) {
  const base = (
    getEnv(context, 'DISCORD_OUTCOME_BASE_URL') ||
    getEnv(context, 'APP_URL') ||
    getEnv(context, 'VITE_AUTH_REDIRECT_URL') ||
    'https://discord.com'
  ).replace(/\/$/, '');
  return `${base}/api/discord-outcome?locked=1`;
}

function disabledButton(label, url) {
  return {
    type: 2,
    style: 5,
    label,
    url,
    disabled: true,
  };
}

function buildLockedOutcomeComponents(context, payload) {
  const lockedUrl = outcomeLockUrl(context);
  return [
    {
      type: 1,
      components: [
        disabledButton(outcomeLockLabel(payload), lockedUrl),
        disabledButton('RAG submitted', lockedUrl),
        disabledButton('No automated orders', lockedUrl),
      ],
    },
  ];
}

function buildReplacementOutcomeMessage(payload) {
  return [
    '[QUANT DESK OUTCOME LOCK]',
    `Plan: ${payload.pid}`,
    outcomeSummary(payload),
    'Original Discord card was no longer available, so this locked replacement receipt was posted.',
    'Decision support only. No automated orders were placed.',
  ].join('\n');
}

function discordWebhookUrl(context, source) {
  const sourceKey = typeof source === 'string' ? source : '';
  if (sourceKey) {
    const sourceUrl = getEnv(context, sourceKey);
    if (sourceUrl) return sourceUrl;
  }
  return (
    getEnv(context, 'QUANT_DESK_SCANNER_WEBHOOK_URL') ||
    getEnv(context, 'SCANNER_DISCORD_WEBHOOK_URL') ||
    getEnv(context, 'DISCORD_WEBHOOK_URL')
  );
}

async function postDiscordOutcomeReplacementMessage(context, payload, webhookSource) {
  const webhookUrl = discordWebhookUrl(context, webhookSource);
  if (!webhookUrl) return { posted: false, reason: 'missing_discord_webhook_url', messageId: null };
  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');
  url.searchParams.set('with_components', 'true');
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: buildReplacementOutcomeMessage(payload),
      components: buildLockedOutcomeComponents(context, payload),
      allowed_mentions: { parse: [] },
    }),
  });
  if (!response.ok) {
    return { posted: false, reason: `discord_replacement_post_failed_${response.status}`, messageId: null };
  }
  const body = await response.json().catch(() => null);
  return {
    posted: true,
    reason: null,
    messageId: typeof body?.id === 'string' ? body.id : null,
  };
}

async function lockDiscordOutcomeMessage(context, payload, discordMessage) {
  const messageId = typeof discordMessage?.messageId === 'string' ? discordMessage.messageId : '';
  const webhookSource = typeof discordMessage?.webhookSource === 'string' ? discordMessage.webhookSource : null;
  const webhookUrl = discordWebhookUrl(context, webhookSource);
  if (!messageId || !webhookUrl) {
    return {
      edited: false,
      status: 'unavailable',
      reason: !messageId ? 'missing_discord_message_id' : 'missing_discord_webhook_url',
      replacementPosted: false,
      replacementMessageId: null,
    };
  }
  const url = new URL(webhookUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/messages/${encodeURIComponent(messageId)}`;
  url.search = '';
  url.searchParams.set('with_components', 'true');
  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      components: buildLockedOutcomeComponents(context, payload),
    }),
  });
  if (!response.ok) {
    if (response.status === 404) {
      const replacement = await postDiscordOutcomeReplacementMessage(context, payload, webhookSource);
      if (replacement.posted) {
        return {
          edited: false,
          status: 'replacement_posted',
          reason: 'original_discord_message_not_found',
          replacementPosted: true,
          replacementMessageId: replacement.messageId,
        };
      }
      return {
        edited: false,
        status: 'unavailable',
        reason: `original_discord_message_not_found_${replacement.reason}`,
        replacementPosted: false,
        replacementMessageId: null,
      };
    }
    return {
      edited: false,
      status: 'unavailable',
      reason: `discord_patch_failed_${response.status}`,
      replacementPosted: false,
      replacementMessageId: null,
    };
  }
  return {
    edited: true,
    status: 'locked_original',
    reason: null,
    replacementPosted: false,
    replacementMessageId: null,
  };
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

async function persistWatchFeedback(context, payload) {
  const supabaseUrl = normalizeSupabaseUrl(context);
  const serviceRoleKey = getEnv(context, 'SUPABASE_SERVICE_ROLE_KEY');
  const userId = getEnv(context, 'DISCORD_RAG_USER_ID');
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    throw new Error('Missing Cloudflare environment. Set SUPABASE_URL or VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.');
  }

  const headers = supabaseServiceHeaders(serviceRoleKey);
  const existing = await selectExistingRecord(context, payload, headers);
  const existingPlanJson = existing?.trade_plan_json && typeof existing.trade_plan_json === 'object'
    ? existing.trade_plan_json
    : {};
  if (existingPlanJson.discordWatchFeedback?.updatedFrom === 'discord_watch_feedback_button') {
    return {
      rowId: existing?.id || payload.pid,
      discordMessage: existingPlanJson.discordMessage || null,
      alreadySaved: true,
    };
  }

  const feedbackLabel = watchFeedbackLabel(payload.wf);
  const updatedAt = new Date().toISOString();
  const feedbackPatch = {
    feedbackCode: payload.wf || payload.o || null,
    feedbackLabel,
    watchType: 'tactical_reversal_watch',
    watchStateAtPost: payload.wst || null,
    direction: payload.dir || 'NONE',
    updatedFrom: 'discord_watch_feedback_button',
    updatedAt,
    approvalBoundary: {
      watchFeedbackApprovesTrade: false,
      researchFeedbackChangesCanExecute: false,
      buttonClickPlacesOrder: false,
    },
  };
  const researchPatch = {
    status: 'submitted',
    source: 'discord_watch_feedback_button',
    researchTrack: 'tactical_reversal_watch',
    researchUseOnly: true,
    feedbackCode: feedbackPatch.feedbackCode,
    feedbackLabel,
    updatedAt,
    notes: [
      `Trader feedback: ${feedbackLabel}.`,
      'Interpret as watch-quality/lifecycle research evidence only, not as execution approval.',
    ].join(' '),
    approvalBoundary: {
      researchFeedbackApprovesTrade: false,
      researchFeedbackChangesCanExecute: false,
      researchFeedbackChangesRules: false,
    },
  };
  const existingJournalRecord = existingPlanJson.journalRecord && typeof existingPlanJson.journalRecord === 'object'
    ? existingPlanJson.journalRecord
    : null;
  const journalRecord = existingJournalRecord
    ? {
        ...existingJournalRecord,
        outcome: 'watch_feedback',
        discordAlertId: payload.pid,
        notes: `Discord watch feedback button: ${feedbackLabel}. Research/learning only.`,
      }
    : {
        outcome: 'watch_feedback',
        discordAlertId: payload.pid,
        notes: `Discord watch feedback button: ${feedbackLabel}. Research/learning only.`,
      };
  const tradePlanJson = {
    ...existingPlanJson,
    discordWatchFeedback: feedbackPatch,
    researchOutcomeFeedback: researchPatch,
    journalRecord,
    approvalBoundary: {
      ...(existingPlanJson.approvalBoundary && typeof existingPlanJson.approvalBoundary === 'object' ? existingPlanJson.approvalBoundary : {}),
      discordWatchFeedbackApprovesTrade: false,
      researchFeedbackChangesCanExecute: false,
      buttonClickPlacesOrder: false,
    },
  };
  const patchPayload = {
    user_id: userId,
    session_type: payload.s,
    trade_date: payload.d,
    day_of_week: payload.dow || new Date(`${payload.d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
    instrument: payload.i,
    trade_result: 'no_trade',
    outcome: payload.wf || payload.o || 'watch_feedback',
    source: 'discord_watch_feedback',
    analysis_mode: 'live',
    plan_version_id: payload.pid,
    trade_plan_json: tradePlanJson,
    embedding_text: existing?.embedding_text || `Tactical Reversal Watch feedback for ${payload.s} ${payload.i} ${payload.d}. ${feedbackLabel}. Research/learning only.`,
    notes: `Discord watch feedback button: ${feedbackLabel}. Research/learning only.`,
  };

  if (existing?.id) {
    const response = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patchPayload),
    });
    if (!response.ok) throw new Error(`Supabase watch feedback update failed (${response.status}): ${await response.text()}`);
    return { rowId: existing.id, discordMessage: tradePlanJson.discordMessage || null, alreadySaved: false };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...patchPayload,
      setup_quality_score: 0.5,
    }),
  });
  if (!response.ok) throw new Error(`Supabase watch feedback insert failed (${response.status}): ${await response.text()}`);
  const rows = await response.json().catch(() => []);
  return {
    rowId: Array.isArray(rows) && rows[0]?.id ? rows[0].id : payload.pid,
    discordMessage: tradePlanJson.discordMessage || null,
    alreadySaved: false,
  };
}

async function persistOutcome(context, payload) {
  if (payload.ft === 'watch_feedback') return persistWatchFeedback(context, payload);
  const supabaseUrl = normalizeSupabaseUrl(context);
  const serviceRoleKey = getEnv(context, 'SUPABASE_SERVICE_ROLE_KEY');
  const userId = getEnv(context, 'DISCORD_RAG_USER_ID');
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    throw new Error('Missing Cloudflare environment. Set SUPABASE_URL or VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.');
  }

  const headers = supabaseServiceHeaders(serviceRoleKey);
  const existing = await selectExistingRecord(context, payload, headers);
  const tradeResult = normalizeTradeResult(payload.tr);
  const existingPlanJson = existing?.trade_plan_json && typeof existing.trade_plan_json === 'object'
    ? existing.trade_plan_json
    : {};
  if (existingPlanJson.discordOutcome?.updatedFrom === 'discord_button') {
    return {
      rowId: existing?.id || payload.pid,
      discordMessage: existingPlanJson.discordMessage || null,
      alreadySaved: true,
    };
  }
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
    return { rowId: existing.id, discordMessage: tradePlanJson.discordMessage || null, alreadySaved: false };
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
    alreadySaved: false,
  };
}

async function updateDiscordOutcomeLockStatus(context, rowId, lock, payload) {
  const supabaseUrl = normalizeSupabaseUrl(context);
  const serviceRoleKey = getEnv(context, 'SUPABASE_SERVICE_ROLE_KEY');
  const userId = getEnv(context, 'DISCORD_RAG_USER_ID');
  if (!supabaseUrl || !serviceRoleKey || !userId || !rowId) {
    return { updated: false, reason: 'missing_supabase_lock_status_context' };
  }
  const headers = supabaseServiceHeaders(serviceRoleKey);
  const lookup = await fetch(
    `${supabaseUrl}/rest/v1/trade_embeddings?id=eq.${encodeURIComponent(rowId)}&select=id,trade_plan_json`,
    { headers }
  );
  if (!lookup.ok) {
    return { updated: false, reason: `supabase_lock_status_lookup_failed_${lookup.status}` };
  }
  const rows = await lookup.json().catch(() => []);
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row?.id) return { updated: false, reason: 'supabase_lock_status_row_not_found' };
  const existingPlanJson = row.trade_plan_json && typeof row.trade_plan_json === 'object'
    ? row.trade_plan_json
    : {};
  const discordMessage = existingPlanJson.discordMessage && typeof existingPlanJson.discordMessage === 'object'
    ? existingPlanJson.discordMessage
    : {};
  const patch = {
    trade_plan_json: {
      ...existingPlanJson,
      discordOutcomeLock: {
        status: lock.status,
        reason: lock.reason,
        updatedAt: new Date().toISOString(),
        originalMessageIdPresent: Boolean(discordMessage.messageId),
        replacementPosted: Boolean(lock.replacementPosted),
        replacementMessageId: lock.replacementMessageId || null,
        outcomeCode: payload.o || null,
        approvalBoundary: {
          discordLockApprovesTrade: false,
          replacementReceiptApprovesTrade: false,
          buttonClickPlacesOrder: false,
        },
      },
    },
  };
  const update = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings?id=eq.${encodeURIComponent(row.id)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
  if (!update.ok) return { updated: false, reason: `supabase_lock_status_update_failed_${update.status}` };
  return { updated: true, reason: null };
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    if (url.searchParams.get('keycheck') === '1') {
      return keyCheckResponse(context);
    }
    if (url.searchParams.get('locked') === '1') {
      return html('This Discord outcome card is already locked. RAG submission was recorded as decision-support learning only.');
    }
    const token = url.searchParams.get('t');
    const secrets = outcomeSecrets(context);
    if (!secrets.length) {
      return html('Missing DISCORD_OUTCOME_SECRET in Cloudflare environment.', 500);
    }
    const payload = await verifyToken(token, secrets);
    const result = await persistOutcome(context, payload);
    const lock = await lockDiscordOutcomeMessage(context, payload, result.discordMessage);
    const lockStatus = await updateDiscordOutcomeLockStatus(context, result.rowId, lock, payload);
    const lockStatusText = lockStatus.updated ? '' : ` RAG lock status update skipped (${lockStatus.reason}).`;
    const lockText = lock.edited
      ? 'Discord card locked.'
      : lock.replacementPosted
        ? 'Original Discord card was unavailable; locked replacement receipt posted.'
        : `Discord card lock unavailable (${lock.reason}).`;
    if (result.alreadySaved) {
      return html(`Already saved. ${lockText}${lockStatusText} Plan ${payload.pid}. Existing RAG row ${String(result.rowId).slice(0, 8)}.`);
    }
    return html(`Saved to RAG. ${lockText}${lockStatusText} Plan ${payload.pid}. ${outcomeSummary(payload)} Row ${String(result.rowId).slice(0, 8)}.`);
  } catch (error) {
    return html(error instanceof Error ? error.message : String(error), 400);
  }
}
