import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
type SessionType = 'morning' | 'lunch';
type Instrument = 'MES' | 'MNQ';
type TradeDirection = 'LONG' | 'SHORT';
type TradeResult = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
type TargetHit = 'T1' | 'T2' | 'RUNNER' | 'STRETCH' | 'NEAREST_LIQUIDITY' | 'STOP' | 'NONE';

export interface DiscordLinkButton {
  type: 2;
  style: 5;
  label: string;
  url: string;
  emoji?: { name: string };
}

export interface DiscordActionRow {
  type: 1;
  components: DiscordLinkButton[];
}

export interface OutcomeButtonArgs {
  planVersionId: string;
  sessionType: SessionType;
  tradeDate: string;
  instrument: Instrument;
  direction: TradeDirection | 'NO TRADE' | null | undefined;
}

export interface DiscordOutcomeEndpointSecretCheck {
  ok: boolean;
  configured: boolean;
  activeKeyId: string | null;
  acceptedKeyIds: string[];
  localKeyId: string | null;
  endpointUrl: string;
}

function getDayOfWeek(tradeDate: string): string {
  return new Date(`${tradeDate}T12:00:00`).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}

function getOutcomeBaseUrl(): string | null {
  const raw =
    process.env.DISCORD_OUTCOME_BASE_URL ||
    process.env.APP_URL ||
    process.env.VITE_AUTH_REDIRECT_URL ||
    '';
  return raw ? raw.replace(/\/$/, '') : null;
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export function normalizeDiscordOutcomeSecret(secret: string | undefined | null): string {
  return String(secret || '').trim().replace(/^["']|["']$/g, '').trim();
}

export function discordOutcomeSecretKeyId(secret: string | undefined | null): string | null {
  const normalized = normalizeDiscordOutcomeSecret(secret);
  if (!normalized) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

function isTestProcess(): boolean {
  return process.argv.some((arg) => /\.test\.[cm]?[tj]sx?$/.test(arg));
}

export function loadCanonicalDiscordOutcomeSecretFromEnvLocal(cwd = process.cwd()): {
  loaded: boolean;
  keyId: string | null;
  previousKeyId: string | null;
  source: '.env.local' | 'process.env';
} {
  const previousKeyId = discordOutcomeSecretKeyId(process.env.DISCORD_OUTCOME_SECRET);
  const envLocalPath = path.join(cwd, '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    return { loaded: false, keyId: previousKeyId, previousKeyId, source: 'process.env' };
  }
  const line = fs.readFileSync(envLocalPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith('DISCORD_OUTCOME_SECRET='));
  const value = normalizeDiscordOutcomeSecret(line?.slice('DISCORD_OUTCOME_SECRET='.length));
  if (!value) {
    return { loaded: false, keyId: previousKeyId, previousKeyId, source: 'process.env' };
  }
  process.env.DISCORD_OUTCOME_SECRET = value;
  const keyId = discordOutcomeSecretKeyId(value);
  if (previousKeyId && previousKeyId !== keyId && !isTestProcess()) {
    console.warn(`[discord-outcome] DISCORD_OUTCOME_SECRET from .env.local is overriding a different process environment key id (${previousKeyId} -> ${keyId}).`);
  }
  return { loaded: true, keyId, previousKeyId, source: '.env.local' };
}

export async function checkDiscordOutcomeEndpointSecret(
  fetchImpl: typeof fetch = fetch,
): Promise<DiscordOutcomeEndpointSecretCheck> {
  const baseUrl = getOutcomeBaseUrl();
  const localKeyId = discordOutcomeSecretKeyId(process.env.DISCORD_OUTCOME_SECRET);
  if (!baseUrl) {
    throw new Error('Discord outcome buttons blocked: DISCORD_OUTCOME_BASE_URL is not configured.');
  }
  if (!localKeyId) {
    throw new Error('Discord outcome buttons blocked: DISCORD_OUTCOME_SECRET is not configured.');
  }
  const endpointUrl = `${baseUrl}/api/discord-outcome?keycheck=1`;
  const response = await fetchImpl(endpointUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const bodyText = await response.text();
  let body: any = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error(`Discord outcome buttons blocked: endpoint key check returned non-JSON from ${endpointUrl}.`);
  }
  const activeKeyId = typeof body?.activeKeyId === 'string' ? body.activeKeyId : null;
  const acceptedKeyIds = Array.isArray(body?.acceptedKeyIds)
    ? body.acceptedKeyIds.filter((value: unknown): value is string => typeof value === 'string')
    : [];
  if (!response.ok || !body?.configured || !activeKeyId) {
    throw new Error(`Discord outcome buttons blocked: deployed endpoint at ${baseUrl} has no active DISCORD_OUTCOME_SECRET.`);
  }
  return {
    ok: activeKeyId === localKeyId,
    configured: true,
    activeKeyId,
    acceptedKeyIds,
    localKeyId,
    endpointUrl,
  };
}

export async function assertDiscordOutcomeEndpointSecretReady(
  components?: unknown[],
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (!components?.length) return;
  const check = await checkDiscordOutcomeEndpointSecret(fetchImpl);
  if (!check.ok) {
    throw new Error([
      'Discord outcome buttons blocked before posting.',
      `Local DISCORD_OUTCOME_SECRET key id ${check.localKeyId} does not match deployed active key id ${check.activeKeyId}.`,
      `Endpoint: ${check.endpointUrl}`,
      'Upload the exact local DISCORD_OUTCOME_SECRET to the Cloudflare Pages production secret and redeploy before posting RAG buttons.',
      'No Discord card was sent. No automated orders were placed.',
    ].join(' '));
  }
}

function signOutcomePayload(encodedPayload: string): string | null {
  const secret = normalizeDiscordOutcomeSecret(process.env.DISCORD_OUTCOME_SECRET);
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex');
}

function buildOutcomeUrl(args: Omit<OutcomeButtonArgs, 'direction'> & {
  outcome: string;
  tradeResult: TradeResult;
  tradeTaken: boolean;
  direction: TradeDirection | 'NONE';
  targetHit: TargetHit;
}): string | null {
  const baseUrl = getOutcomeBaseUrl();
  if (!baseUrl) return null;
  const payload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    pid: args.planVersionId,
    s: args.sessionType,
    d: args.tradeDate,
    i: args.instrument,
    dow: getDayOfWeek(args.tradeDate),
    o: args.outcome,
    tr: args.tradeResult,
    tt: args.tradeTaken,
    dir: args.direction,
    hit: args.targetHit,
    pp: args.tradeTaken,
    kid: discordOutcomeSecretKeyId(process.env.DISCORD_OUTCOME_SECRET),
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signOutcomePayload(encodedPayload);
  if (!signature) return null;
  return `${baseUrl}/api/discord-outcome?t=${encodeURIComponent(`${encodedPayload}.${signature}`)}`;
}

function outcomeButton(label: string, emoji: string, url: string): DiscordLinkButton {
  return {
    type: 2,
    style: 5,
    label,
    emoji: { name: emoji },
    url,
  };
}

export function buildOutcomeComponents(args: OutcomeButtonArgs): DiscordActionRow[] | undefined {
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') return undefined;

  const makeUrl = (
    outcome: string,
    tradeResult: TradeResult,
    tradeTaken: boolean,
    direction: TradeDirection | 'NONE',
    targetHit: TargetHit,
  ) => buildOutcomeUrl({ ...args, outcome, tradeResult, tradeTaken, direction, targetHit });

  const t1Hit = makeUrl(`${args.direction.toLowerCase()}_t1_hit`, 'win', true, args.direction, 'T1');
  const t2Hit = makeUrl(`${args.direction.toLowerCase()}_t2_hit`, 'win', true, args.direction, 'T2');
  const runnerHit = makeUrl(`${args.direction.toLowerCase()}_runner_hit`, 'win', true, args.direction, 'RUNNER');
  const stretchHit = makeUrl(`${args.direction.toLowerCase()}_stretch_hit`, 'win', true, args.direction, 'STRETCH');
  const loss = makeUrl(`${args.direction.toLowerCase()}_loss`, 'loss', true, args.direction, 'STOP');
  const scratch = makeUrl('scratch', 'scratch', true, args.direction, 'NONE');
  const missed = makeUrl('missed_trade', 'missed_trade', false, args.direction, 'NONE');
  const noTrade = makeUrl('not_taken', 'no_trade', false, 'NONE', 'NONE');

  if (!t1Hit || !t2Hit || !runnerHit || !stretchHit || !loss || !scratch || !missed || !noTrade) {
    if (!isTestProcess()) {
      console.warn('Outcome buttons skipped: DISCORD_OUTCOME_BASE_URL or signing secret not configured.');
    }
    return undefined;
  }

  const directionLabel = args.direction === 'LONG' ? 'Long' : 'Short';
  const winEmoji = args.direction === 'LONG' ? '🟢' : '🔴';

  return [
    {
      type: 1,
      components: [
        outcomeButton(`${directionLabel} T1 Hit`, winEmoji, t1Hit),
        outcomeButton(`${directionLabel} T2 Hit`, winEmoji, t2Hit),
        outcomeButton(`${directionLabel} Runner Hit`, winEmoji, runnerHit),
        outcomeButton(`${directionLabel} Stretch Hit`, winEmoji, stretchHit),
        outcomeButton(`${directionLabel} Stopped`, '🛑', loss),
      ],
    },
    {
      type: 1,
      components: [
        outcomeButton('Scratch', '⚪', scratch),
        outcomeButton('No Trade', '🚫', noTrade),
        outcomeButton('Missed', '⏭️', missed),
      ],
    },
  ];
}

export function discordWebhookUrlForPayload(webhookUrl: string, components?: unknown[]): string {
  if (!components?.length) return webhookUrl;
  const url = new URL(webhookUrl);
  url.searchParams.set('with_components', 'true');
  url.searchParams.set('wait', 'true');
  return url.toString();
}
