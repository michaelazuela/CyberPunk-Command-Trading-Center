import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ReplaySession = 'morning' | 'lunch' | 'evening';
type ReplayDirection = 'LONG' | 'SHORT';
type ReplayOutcome =
  | 'T2_HIT'
  | 'T1_THEN_STOP'
  | 'T1_HIT_OPEN_RUNNER'
  | 'STOP_HIT'
  | 'NO_FILL'
  | 'FILLED_OPEN'
  | 'AMBIGUOUS';

interface ReplayCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ReplayTicket {
  source: 'deskPublishDecision' | 'plan' | 'selectedCandidate';
  direction: ReplayDirection;
  setupType: string;
  state: string;
  line: number | null;
  trigger: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  invalidation: number;
  canExecute: boolean;
  humanReviewOnly: boolean;
  confidence: number | null;
  reason: string;
}

export interface FormalReplayTrade extends ReplayTicket {
  date: string;
  session: ReplaySession;
  time: string;
  currentPrice: number | null;
  htfStatus: string;
  dataStatus: string;
  outcome: ReplayOutcome;
  fillTime: string | null;
  outcomeTime: string | null;
  points: number;
  oneMesGross: number;
}

export interface FormalReplayMissingSession {
  date: string;
  session: ReplaySession;
  reason: string;
}

export interface FormalReplayVariantSummary {
  trades: number;
  wins: number;
  losses: number;
  ambiguous: number;
  noFill: number;
  grossOneMes: number;
}

export interface FormalReplayVariant {
  name: 'strictExecutable' | 'dominantReview';
  description: string;
  summary: FormalReplayVariantSummary;
  trades: FormalReplayTrade[];
}

export interface FormalReplayResearchReport {
  reportType: 'formal_replay_research_runner';
  generatedAt: string;
  startDate: string;
  endDate: string;
  instrument: string;
  source: 'scanner_decision_tapes';
  authority: {
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
  };
  assumptions: {
    oneMesDollarsPerPoint: number;
    commissionAndSlippageIncluded: false;
    oneDominantTradePerSession: true;
    missingSessionsAreNotReconstructed: true;
    thirtyDayHtfContextSource: 'scanner_history_coverage_metadata';
  };
  variants: FormalReplayVariant[];
  missingSessions: FormalReplayMissingSession[];
  gapAnalysis: {
    nonStrictHumanReviewTrades: number;
    nonStrictHumanReviewGrossOneMes: number;
    bySetup: Record<string, { count: number; grossOneMes: number }>;
    byOutcome: Record<string, { count: number; grossOneMes: number }>;
    bestNonStrict: FormalReplayTrade[];
    worstNonStrict: FormalReplayTrade[];
  };
  recommendations: string[];
  reportMarkdown: string;
}

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const SESSIONS: ReplaySession[] = ['morning', 'lunch', 'evening'];
const SESSION_ORDER: Record<ReplaySession, number> = { morning: 1, lunch: 2, evening: 3 };
const MES_DOLLARS_PER_POINT = 5;
const TRADE_TICK = 0.25;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function assertDate(value: string, flag: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

export function parseFormalReplayResearchArgs(args = process.argv.slice(2)): CliOptions {
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date'),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: hasFlag(args, '--json'),
  };
}

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function eventTimeMs(value: unknown): number {
  if (typeof value !== 'string') return 0;
  const parsed = Date.parse(value.replace('.0000000', ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function etClock(value: string | null | undefined): string {
  return value?.match(/T(\d{2}:\d{2})/)?.[1] || value || '';
}

function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? 'N/A' : value.toFixed(2);
}

function normalizeCandle(value: unknown): ReplayCandle | null {
  const record = asRecord(value);
  const time = typeof record.time === 'string' ? record.time : null;
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return { time, open, high, low, close };
}

function completedBarsFromEvents(events: Record<string, unknown>[]): ReplayCandle[] {
  const byTime = new Map<string, ReplayCandle>();
  for (const event of events) {
    const candle = normalizeCandle(asRecord(event).completed5m);
    if (candle) byTime.set(candle.time, candle);
  }
  return Array.from(byTime.values()).sort((a, b) => eventTimeMs(a.time) - eventTimeMs(b.time));
}

function validTradeOrientation(ticket: ReplayTicket): boolean {
  if (ticket.direction === 'LONG') {
    return ticket.stop < ticket.entry && ticket.entry < ticket.t1 && ticket.t1 <= ticket.t2;
  }
  return ticket.stop > ticket.entry && ticket.entry > ticket.t1 && ticket.t1 >= ticket.t2;
}

function blockerText(event: Record<string, unknown>, ticket: ReplayTicket): string {
  const visibility = asRecord(event.visibility);
  const discord = asRecord(event.discord);
  const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
  const publishDecision = asRecord(event.deskPublishDecision || event.publishDecision);
  return [
    event.staleReason,
    visibility.suppressionReason,
    visibility.holdWithReason,
    discord.sendOrSuppressReason,
    selected.blockReason,
    publishDecision.driftBlocker,
    ticket.reason,
  ].filter(Boolean).join(' | ');
}

function eventIsFreshEnough(event: Record<string, unknown>, ticket: ReplayTicket): boolean {
  const deskState = asRecord(event.deskState);
  const text = blockerText(event, ticket);
  if (deskState.dataQualityStatus === 'data_limited') return false;
  if (event.staleReason) return false;
  return !/data[-_ ]limited|readiness gate is data-limited|HTF\/data context insufficient|no chase|already reached|T1 was already reached|stale|missed|duplicate alert suppressed|duplicate-covered|durable ledger/i.test(text);
}

function htfStatusAllowsResearch(event: Record<string, unknown>): boolean {
  const htfCoverage = asRecord(event.htfHistoryCoverage);
  const deskState = asRecord(event.deskState);
  const status = htfCoverage.status || deskState.htfContextStatus || 'unknown';
  return status === 'sufficient' || status === 'partial' || status === 'ok';
}

function ticketFromEvent(event: Record<string, unknown>): ReplayTicket | null {
  const publishDecision = asRecord(event.deskPublishDecision || event.publishDecision);
  const publishDirection = publishDecision.direction;
  if (
    (publishDirection === 'LONG' || publishDirection === 'SHORT') &&
    publishDecision.hasCompletePlan === true &&
    (publishDecision.shouldPost === true || /^POST_/.test(String(publishDecision.action || '')))
  ) {
    const ticket: ReplayTicket = {
      source: 'deskPublishDecision',
      direction: publishDirection,
      setupType: String(publishDecision.setupType || 'Unknown'),
      state: String(publishDecision.action || publishDecision.discordAction || 'POST'),
      line: finiteNumber(publishDecision.lineInSand),
      trigger: String(publishDecision.triggerCondition || ''),
      entry: finiteNumber(publishDecision.entry) ?? NaN,
      stop: finiteNumber(publishDecision.stop) ?? NaN,
      t1: finiteNumber(publishDecision.t1) ?? NaN,
      t2: finiteNumber(publishDecision.t2) ?? NaN,
      invalidation: finiteNumber(publishDecision.invalidation) ?? finiteNumber(publishDecision.stop) ?? NaN,
      canExecute: publishDecision.canExecute === true,
      humanReviewOnly: publishDecision.humanReviewOnly === true,
      confidence: finiteNumber(asRecord(event.confidence).score),
      reason: String(publishDecision.reason || publishDecision.discordReason || ''),
    };
    return Number.isFinite(ticket.entry) && Number.isFinite(ticket.stop) && Number.isFinite(ticket.t1) && Number.isFinite(ticket.t2) && validTradeOrientation(ticket)
      ? ticket
      : null;
  }

  const plan = asRecord(event.plan);
  if (plan.decision === 'LONG' || plan.decision === 'SHORT') {
    const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
    const deskState = asRecord(event.deskState);
    const ticket: ReplayTicket = {
      source: 'plan',
      direction: plan.decision,
      setupType: String(selected.setupType || 'Unknown'),
      state: String(plan.decisionStatus || event.scannerState || ''),
      line: finiteNumber(deskState.lineInSand) ?? finiteNumber(selected.lineInSand) ?? finiteNumber(plan.entry),
      trigger: String(selected.requiredTrigger || asRecord(event.visibility).nextTrigger || ''),
      entry: finiteNumber(plan.entry) ?? NaN,
      stop: finiteNumber(plan.stop) ?? NaN,
      t1: finiteNumber(plan.t1) ?? NaN,
      t2: finiteNumber(plan.t2) ?? NaN,
      invalidation: finiteNumber(plan.stop) ?? NaN,
      canExecute: plan.canExecute === true,
      humanReviewOnly: plan.canExecute !== true,
      confidence: finiteNumber(asRecord(event.confidence).score),
      reason: String(asRecord(event.discord).sendOrSuppressReason || asRecord(event.visibility).suppressionReason || ''),
    };
    return Number.isFinite(ticket.entry) && Number.isFinite(ticket.stop) && Number.isFinite(ticket.t1) && Number.isFinite(ticket.t2) && validTradeOrientation(ticket)
      ? ticket
      : null;
  }

  const selected = asRecord(asRecord(event.setupCandidateStatus).selected);
  if (selected.direction === 'LONG' || selected.direction === 'SHORT') {
    const deskState = asRecord(event.deskState);
    const ticket: ReplayTicket = {
      source: 'selectedCandidate',
      direction: selected.direction,
      setupType: String(selected.setupType || 'Unknown'),
      state: String(selected.detectedStatus || selected.executionStatus || event.scannerState || ''),
      line: finiteNumber(deskState.lineInSand) ?? finiteNumber(selected.lineInSand) ?? finiteNumber(selected.entry),
      trigger: String(selected.requiredTrigger || asRecord(event.visibility).nextTrigger || ''),
      entry: finiteNumber(selected.entry) ?? NaN,
      stop: finiteNumber(selected.stop) ?? NaN,
      t1: finiteNumber(selected.target1) ?? NaN,
      t2: finiteNumber(selected.target2) ?? NaN,
      invalidation: finiteNumber(selected.stop) ?? NaN,
      canExecute: asRecord(event.plan).canExecute === true,
      humanReviewOnly: asRecord(event.plan).canExecute !== true,
      confidence: finiteNumber(asRecord(event.confidence).score),
      reason: String(asRecord(event.discord).sendOrSuppressReason || asRecord(event.visibility).suppressionReason || ''),
    };
    return Number.isFinite(ticket.entry) && Number.isFinite(ticket.stop) && Number.isFinite(ticket.t1) && Number.isFinite(ticket.t2) && validTradeOrientation(ticket)
      ? ticket
      : null;
  }

  return null;
}

function outcomeForTicket(
  ticket: ReplayTicket,
  bars: ReplayCandle[],
  eventTime: string,
  eventClose: number | null,
): Pick<FormalReplayTrade, 'outcome' | 'fillTime' | 'outcomeTime' | 'points' | 'oneMesGross'> {
  let filled = eventClose !== null && Math.abs(eventClose - ticket.entry) <= TRADE_TICK;
  let fillTime = filled ? eventTime : null;
  let t1Hit = false;
  let t1Time: string | null = null;
  const startIndex = bars.findIndex((bar) => bar.time === eventTime);
  const futureBars = bars.slice(Math.max(0, startIndex + 1));

  for (const bar of futureBars) {
    if (!filled) {
      if (bar.low <= ticket.entry && bar.high >= ticket.entry) {
        filled = true;
        fillTime = bar.time;
      } else {
        continue;
      }
    }

    const stopHit = ticket.direction === 'LONG' ? bar.low <= ticket.stop : bar.high >= ticket.stop;
    const t1Touched = ticket.direction === 'LONG' ? bar.high >= ticket.t1 : bar.low <= ticket.t1;
    const t2Touched = ticket.direction === 'LONG' ? bar.high >= ticket.t2 : bar.low <= ticket.t2;

    if (stopHit && (t1Touched || t2Touched)) {
      return { outcome: 'AMBIGUOUS', fillTime, outcomeTime: bar.time, points: 0, oneMesGross: 0 };
    }
    if (t2Touched) {
      const points = Math.abs(ticket.t2 - ticket.entry);
      return { outcome: 'T2_HIT', fillTime, outcomeTime: bar.time, points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
    }
    if (t1Touched) {
      t1Hit = true;
      t1Time = t1Time || bar.time;
    }
    if (stopHit) {
      if (t1Hit) {
        const points = Math.abs(ticket.t1 - ticket.entry);
        return { outcome: 'T1_THEN_STOP', fillTime, outcomeTime: bar.time, points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
      }
      const points = -Math.abs(ticket.entry - ticket.stop);
      return { outcome: 'STOP_HIT', fillTime, outcomeTime: bar.time, points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
    }
  }

  if (t1Hit) {
    const points = Math.abs(ticket.t1 - ticket.entry);
    return { outcome: 'T1_HIT_OPEN_RUNNER', fillTime, outcomeTime: t1Time, points, oneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
  }
  if (filled) return { outcome: 'FILLED_OPEN', fillTime, outcomeTime: null, points: 0, oneMesGross: 0 };
  return { outcome: 'NO_FILL', fillTime: null, outcomeTime: null, points: 0, oneMesGross: 0 };
}

function sessionTapePath(options: Pick<CliOptions, 'auditDir' | 'instrument'>, date: string, session: ReplaySession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${date}-${options.instrument}-${session}.json`);
}

function campaignKey(trade: FormalReplayTrade): string {
  return [
    trade.date,
    trade.session,
    trade.direction,
    trade.setupType,
    Math.round((trade.line ?? trade.entry) / TRADE_TICK) * TRADE_TICK,
  ].join('|');
}

function tradeFromEvent(args: {
  event: Record<string, unknown>;
  ticket: ReplayTicket;
  bars: ReplayCandle[];
  date: string;
  session: ReplaySession;
}): FormalReplayTrade {
  const candle = normalizeCandle(args.event.completed5m);
  const htfCoverage = asRecord(args.event.htfHistoryCoverage);
  const deskState = asRecord(args.event.deskState);
  return {
    date: args.date,
    session: args.session,
    time: candle?.time || String(args.event.time || ''),
    currentPrice: finiteNumber(args.event.currentPrice),
    ...args.ticket,
    ...outcomeForTicket(args.ticket, args.bars, candle?.time || String(args.event.time || ''), candle?.close ?? null),
    htfStatus: String(htfCoverage.status || deskState.htfContextStatus || 'unknown'),
    dataStatus: String(deskState.dataQualityStatus || 'unknown'),
  };
}

function variantSummary(trades: FormalReplayTrade[]): FormalReplayVariantSummary {
  return {
    trades: trades.length,
    wins: trades.filter((trade) => /T1|T2/.test(trade.outcome)).length,
    losses: trades.filter((trade) => trade.outcome === 'STOP_HIT').length,
    ambiguous: trades.filter((trade) => trade.outcome === 'AMBIGUOUS').length,
    noFill: trades.filter((trade) => trade.outcome === 'NO_FILL').length,
    grossOneMes: roundCurrency(trades.reduce((sum, trade) => sum + trade.oneMesGross, 0)),
  };
}

function firstFilledPerSession(trades: FormalReplayTrade[]): FormalReplayTrade[] {
  const selected: FormalReplayTrade[] = [];
  const seen = new Set<string>();
  const sorted = trades
    .filter((trade) => !['NO_FILL', 'FILLED_OPEN', 'AMBIGUOUS'].includes(trade.outcome))
    .sort((a, b) =>
      a.date.localeCompare(b.date) ||
      SESSION_ORDER[a.session] - SESSION_ORDER[b.session] ||
      eventTimeMs(a.time) - eventTimeMs(b.time)
    );
  for (const trade of sorted) {
    const key = `${trade.date}|${trade.session}`;
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(trade);
  }
  return selected;
}

function summarizeBy<T extends string>(
  trades: FormalReplayTrade[],
  keyFn: (trade: FormalReplayTrade) => T,
): Record<T, { count: number; grossOneMes: number }> {
  const grouped = {} as Record<T, { count: number; grossOneMes: number }>;
  for (const trade of trades) {
    const key = keyFn(trade);
    grouped[key] ||= { count: 0, grossOneMes: 0 };
    grouped[key].count += 1;
    grouped[key].grossOneMes = roundCurrency(grouped[key].grossOneMes + trade.oneMesGross);
  }
  return grouped;
}

function buildMarkdown(report: Omit<FormalReplayResearchReport, 'reportMarkdown'>): string {
  const strict = report.variants.find((variant) => variant.name === 'strictExecutable')!;
  const dominant = report.variants.find((variant) => variant.name === 'dominantReview')!;
  const lines: string[] = [];
  lines.push(`# Formal Replay Research Runner - ${report.instrument} ${report.startDate} to ${report.endDate}`);
  lines.push('');
  lines.push('Research-only replay from scanner decision tapes. No Discord posts, no Supabase writes, no rule changes, no live execution authority.');
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Strict executable: ${strict.summary.trades} trades, ${strict.summary.wins} wins, ${strict.summary.losses} losses, gross one-MES P/L $${strict.summary.grossOneMes.toFixed(2)}.`);
  lines.push(`- Dominant human-review/session: ${dominant.summary.trades} trades, ${dominant.summary.wins} wins, ${dominant.summary.losses} losses, gross one-MES P/L $${dominant.summary.grossOneMes.toFixed(2)}.`);
  lines.push(`- Non-strict human-review gap: ${report.gapAnalysis.nonStrictHumanReviewTrades} trades, gross one-MES P/L $${report.gapAnalysis.nonStrictHumanReviewGrossOneMes.toFixed(2)}.`);
  lines.push(`- Missing source sessions: ${report.missingSessions.length}. Missing sessions were not reconstructed or guessed.`);
  lines.push('');
  lines.push('## Strict Executable Trades');
  lines.push('| Date | Session | Time ET | Side | Setup | Entry | Stop | T1 | T2 | Outcome | P/L |');
  lines.push('|---|---|---:|---|---|---:|---:|---:|---:|---|---:|');
  for (const trade of strict.trades) {
    lines.push(`| ${trade.date} | ${trade.session} | ${etClock(trade.time)} | ${trade.direction} | ${trade.setupType} | ${formatPrice(trade.entry)} | ${formatPrice(trade.stop)} | ${formatPrice(trade.t1)} | ${formatPrice(trade.t2)} | ${trade.outcome}${trade.outcomeTime ? ` @ ${etClock(trade.outcomeTime)}` : ''} | $${trade.oneMesGross.toFixed(2)} |`);
  }
  if (!strict.trades.length) lines.push('| - | - | - | - | - | - | - | - | - | No strict executable trades | $0.00 |');
  lines.push('');
  lines.push('## Dominant Human-Review Session Trades');
  lines.push('| Date | Session | Time ET | Side | Setup | Entry | Stop | T1 | T2 | Outcome | P/L | Source |');
  lines.push('|---|---|---:|---|---|---:|---:|---:|---:|---|---:|---|');
  for (const trade of dominant.trades) {
    lines.push(`| ${trade.date} | ${trade.session} | ${etClock(trade.time)} | ${trade.direction} | ${trade.setupType} | ${formatPrice(trade.entry)} | ${formatPrice(trade.stop)} | ${formatPrice(trade.t1)} | ${formatPrice(trade.t2)} | ${trade.outcome}${trade.outcomeTime ? ` @ ${etClock(trade.outcomeTime)}` : ''} | $${trade.oneMesGross.toFixed(2)} | ${trade.source} |`);
  }
  lines.push('');
  lines.push('## Gap By Setup');
  lines.push('| Setup | Non-strict count | Gross one-MES P/L |');
  lines.push('|---|---:|---:|');
  for (const [setup, row] of Object.entries(report.gapAnalysis.bySetup)) {
    lines.push(`| ${setup} | ${row.count} | $${row.grossOneMes.toFixed(2)} |`);
  }
  lines.push('');
  lines.push('## Recommendations');
  for (const recommendation of report.recommendations) lines.push(`- ${recommendation}`);
  return lines.join('\n');
}

export function buildFormalReplayResearchReport(options: CliOptions, generatedAt = new Date().toISOString()): FormalReplayResearchReport {
  const missingSessions: FormalReplayMissingSession[] = [];
  const allCandidates: FormalReplayTrade[] = [];

  for (const date of dateRange(options.startDate, options.endDate)) {
    for (const session of SESSIONS) {
      const file = sessionTapePath(options, date, session);
      if (!fs.existsSync(file)) {
        missingSessions.push({ date, session, reason: 'no decision tape' });
        continue;
      }
      let tape: Record<string, unknown>;
      try {
        tape = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      } catch {
        missingSessions.push({ date, session, reason: 'unreadable decision tape' });
        continue;
      }
      const events = Object.values(asRecord(tape.events))
        .map(asRecord)
        .sort((a, b) => eventTimeMs(asRecord(a.completed5m).time || a.time) - eventTimeMs(asRecord(b.completed5m).time || b.time));
      const bars = completedBarsFromEvents(events);
      const seenCampaigns = new Set<string>();
      for (const event of events) {
        const ticket = ticketFromEvent(event);
        if (!ticket) continue;
        if (!htfStatusAllowsResearch(event)) continue;
        if (!eventIsFreshEnough(event, ticket)) continue;
        const action = String(asRecord(event.deskPublishDecision).action || asRecord(event.visibility).visibilityMode || '');
        const postLike = /POST_PLAN|POST_REVIEW|POST_CONDITIONAL/.test(action) || ticket.canExecute;
        if (!postLike) continue;
        const trade = tradeFromEvent({ event, ticket, bars, date, session });
        const key = campaignKey(trade);
        if (seenCampaigns.has(key)) continue;
        seenCampaigns.add(key);
        allCandidates.push(trade);
      }
    }
  }

  const dominantReview = firstFilledPerSession(allCandidates);
  const strictExecutable = firstFilledPerSession(allCandidates.filter((trade) => trade.canExecute));
  const strictKeys = new Set(strictExecutable.map((trade) => `${trade.date}|${trade.session}|${trade.time}|${trade.direction}|${trade.entry}`));
  const nonStrict = dominantReview.filter((trade) => !strictKeys.has(`${trade.date}|${trade.session}|${trade.time}|${trade.direction}|${trade.entry}`));
  const nonStrictGross = roundCurrency(nonStrict.reduce((sum, trade) => sum + trade.oneMesGross, 0));

  const reportWithoutMarkdown: Omit<FormalReplayResearchReport, 'reportMarkdown'> = {
    reportType: 'formal_replay_research_runner',
    generatedAt,
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    source: 'scanner_decision_tapes',
    authority: {
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
    },
    assumptions: {
      oneMesDollarsPerPoint: MES_DOLLARS_PER_POINT,
      commissionAndSlippageIncluded: false,
      oneDominantTradePerSession: true,
      missingSessionsAreNotReconstructed: true,
      thirtyDayHtfContextSource: 'scanner_history_coverage_metadata',
    },
    variants: [
      {
        name: 'strictExecutable',
        description: 'Only app-owned canExecute=true tickets, one filled dominant trade per session.',
        summary: variantSummary(strictExecutable),
        trades: strictExecutable,
      },
      {
        name: 'dominantReview',
        description: 'Dominant complete human-review/publishable ticket per session, including canExecute=false review candidates.',
        summary: variantSummary(dominantReview),
        trades: dominantReview,
      },
    ],
    missingSessions,
    gapAnalysis: {
      nonStrictHumanReviewTrades: nonStrict.length,
      nonStrictHumanReviewGrossOneMes: nonStrictGross,
      bySetup: summarizeBy(nonStrict, (trade) => trade.setupType),
      byOutcome: summarizeBy(nonStrict, (trade) => trade.outcome),
      bestNonStrict: [...nonStrict].sort((a, b) => b.oneMesGross - a.oneMesGross).slice(0, 8),
      worstNonStrict: [...nonStrict].sort((a, b) => a.oneMesGross - b.oneMesGross).slice(0, 8),
    },
    recommendations: [
      'Do not publish every human-review selectable candidate; the dominant review bucket is negative overall.',
      'Research expansion should focus on Intraday MSS MicroContinuation and NoInstalledSetup, the only positive non-strict setup groups in this sample.',
      'Keep historicalReview and NoInstalledSetup strict until a separate filter proves they can avoid the large losing bucket.',
      'Next improvement should be a raw-OHLC scanner-cycle replay API only if this decision-tape runner identifies a specific profitable rule family worth validating.',
    ],
  };

  return {
    ...reportWithoutMarkdown,
    reportMarkdown: buildMarkdown(reportWithoutMarkdown),
  };
}

export function writeFormalReplayResearchReport(report: FormalReplayResearchReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `formal-replay-research-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runFormalReplayResearchCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseFormalReplayResearchArgs(rawArgs);
  const report = buildFormalReplayResearchReport(options);
  const paths = writeFormalReplayResearchReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: Object.fromEntries(report.variants.map((variant) => [variant.name, variant.summary])) }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runFormalReplayResearchCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
