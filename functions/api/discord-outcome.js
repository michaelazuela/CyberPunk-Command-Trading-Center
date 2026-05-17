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
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return bytesToHex(signature);
}

async function verifyToken(token, secret) {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) throw new Error('Missing or malformed outcome token.');
  const expected = await sign(encodedPayload, secret);
  if (!timingSafeEqualHex(expected, signature)) throw new Error('Outcome token signature is invalid.');
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
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
  const tradePlanJson = {
    ...existingPlanJson,
    discordOutcome: outcomePatch,
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
    return existing.id;
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
  return Array.isArray(rows) && rows[0]?.id ? rows[0].id : payload.pid;
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const token = url.searchParams.get('t');
    const secret = getEnv(context, 'DISCORD_OUTCOME_SECRET');
    if (!secret) {
      return html('Missing DISCORD_OUTCOME_SECRET in Cloudflare environment.', 500);
    }
    const payload = await verifyToken(token, secret);
    const rowId = await persistOutcome(context, payload);
    return html(`Saved to RAG. Plan ${payload.pid}. ${outcomeSummary(payload)} Row ${String(rowId).slice(0, 8)}.`);
  } catch (error) {
    return html(error instanceof Error ? error.message : String(error), 400);
  }
}
