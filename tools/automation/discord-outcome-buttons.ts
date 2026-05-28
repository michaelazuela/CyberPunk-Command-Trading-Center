import crypto from 'node:crypto';

type SessionType = 'morning' | 'lunch';
type Instrument = 'MES' | 'MNQ';
type TradeDirection = 'LONG' | 'SHORT';
type TradeResult = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
type TargetHit = 'T1' | 'T2' | 'NEAREST_LIQUIDITY' | 'STOP' | 'NONE';

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

function signOutcomePayload(encodedPayload: string): string | null {
  const secret = process.env.DISCORD_OUTCOME_SECRET || '';
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

  const win = makeUrl(`${args.direction.toLowerCase()}_win`, 'win', true, args.direction, 'NONE');
  const loss = makeUrl(`${args.direction.toLowerCase()}_loss`, 'loss', true, args.direction, 'STOP');
  const scratch = makeUrl('scratch', 'scratch', true, args.direction, 'NONE');
  const missed = makeUrl('missed_trade', 'missed_trade', false, args.direction, 'NONE');
  const noTrade = makeUrl('not_taken', 'no_trade', false, 'NONE', 'NONE');

  if (!win || !loss || !scratch || !missed || !noTrade) {
    console.warn('Outcome buttons skipped: DISCORD_OUTCOME_BASE_URL or signing secret not configured.');
    return undefined;
  }

  const directionLabel = args.direction === 'LONG' ? 'Long' : 'Short';
  const winEmoji = args.direction === 'LONG' ? '🟢' : '🔴';

  return [{
    type: 1,
    components: [
      outcomeButton(`${directionLabel} Win`, winEmoji, win),
      outcomeButton(`${directionLabel} Loss`, '🛑', loss),
      outcomeButton('Scratch', '⚪', scratch),
      outcomeButton('Missed', '⏭️', missed),
      outcomeButton('No Trade', '🚫', noTrade),
    ],
  }];
}

export function discordWebhookUrlForPayload(webhookUrl: string, components?: unknown[]): string {
  if (!components?.length) return webhookUrl;
  const separator = webhookUrl.includes('?') ? '&' : '?';
  return `${webhookUrl}${separator}with_components=true`;
}
