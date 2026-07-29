import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ScannerSession = 'morning' | 'lunch' | 'evening';
type Direction = 'LONG' | 'SHORT';
type Outcome = 'stop' | 't1' | 't2' | 'no_fill' | 'session_close';

interface AuditOptions {
  tradeDate: string;
  instrument: string;
  sessions: ScannerSession[];
  auditDir: string;
  outDir: string;
  includeAll: boolean;
  json: boolean;
}

export interface StoppedTradeWorkflowAuditRow {
  tradeDate: string;
  session: ScannerSession;
  candidateTime: string;
  model: string;
  side: Direction;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcome: Outcome;
  oneMesPnl: number;
  firstEntryTime: string | null;
  firstStopTime: string | null;
  firstT1Time: string | null;
  firstT2Time: string | null;
  targetAlreadyHitBeforeEntry: boolean;
  sameCandleEntryStop: boolean;
  duplicateCampaign: boolean;
  duplicateOf: string | null;
  htfContextStatus: string;
  mtfPrimarySide: string;
  mtfArbitrationStatus: string;
  timeframeRows: string[];
  visibilityMode: string;
  discordAction: string;
  staleReason: string | null;
  workflowStageFindings: string[];
  recommendedDisposition: string;
  candlePath: string[];
}

export interface StoppedTradeWorkflowAuditReport {
  reportType: 'stopped_trade_workflow_audit';
  generatedAt: string;
  tradeDate: string;
  instrument: string;
  sessions: ScannerSession[];
  sourceTapes: string[];
  summary: {
    tapesReviewed: number;
    postedCandidatesReviewed: number;
    rowsReported: number;
    stoppedRows: number;
    targetAlreadyHitBeforeEntryRows: number;
    sameCandleEntryStopRows: number;
    duplicateCampaignRows: number;
    lateExtendedRows: number;
    htfMixedOrCounterRows: number;
    oneMesPnl: number;
  };
  rows: StoppedTradeWorkflowAuditRow[];
  authority: {
    readOnly: true;
    postsDiscord: false;
    readsSupabase: false;
    readsNinjaTrader: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntriesStopsTargets: false;
  };
  markdown: string;
}

interface TapeEvent {
  completed5m?: Record<string, unknown>;
  currentPrice?: unknown;
  setupCandidateStatus?: {
    selected?: Record<string, unknown>;
  };
  visibility?: Record<string, unknown>;
  discord?: Record<string, unknown>;
  staleReason?: unknown;
  mtfPrimarySideArbitration?: Record<string, unknown>;
  htfContextStatus?: unknown;
  deskState?: Record<string, unknown>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const ALL_SESSIONS: ScannerSession[] = ['morning', 'lunch', 'evening'];
const MES_DOLLARS_PER_POINT = 5;

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

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function parseSessions(raw: string | null): ScannerSession[] {
  if (!raw || raw.toLowerCase() === 'all') return ALL_SESSIONS;
  const sessions = raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  for (const session of sessions) {
    if (session !== 'morning' && session !== 'lunch' && session !== 'evening') {
      throw new Error('--sessions must contain morning,lunch,evening, or all.');
    }
  }
  return [...new Set(sessions)] as ScannerSession[];
}

export function parseStoppedTradeWorkflowAuditArgs(args = process.argv.slice(2)): AuditOptions {
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    sessions: parseSessions(readFlag(args, '--sessions')),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    includeAll: hasFlag(args, '--include-all'),
    json: hasFlag(args, '--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = 'N/A'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function directionValue(value: unknown): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function formatTime(value: unknown): string {
  const raw = typeof value === 'string' ? value : '';
  return raw.match(/T(\d{2}:\d{2})/)?.[1] || raw || 'N/A';
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

function eventTime(key: string, event: TapeEvent): string {
  return formatTime(event.completed5m?.time || event.completed5m?.timestamp || event.completed5m?.completedAt || key);
}

function tapePath(options: AuditOptions, session: ScannerSession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${options.tradeDate}-${options.instrument}-${session}.json`);
}

function hasCompletePlan(candidate: Record<string, unknown>): boolean {
  return Boolean(
    directionValue(candidate.direction) &&
    typeof candidate.setupType === 'string' &&
    numberValue(candidate.entry) !== null &&
    numberValue(candidate.stop) !== null &&
    numberValue(candidate.target1) !== null &&
    numberValue(candidate.target2) !== null &&
    numberValue(candidate.riskPoints) !== null,
  );
}

function shouldReviewEvent(event: TapeEvent): boolean {
  const selected = asRecord(event.setupCandidateStatus?.selected);
  if (!hasCompletePlan(selected)) return false;
  const publishDecision = asRecord(asRecord(event.discord).publishDecision);
  if (publishDecision.shouldPost === true) return true;
  const visibilityMode = stringValue(asRecord(event.visibility).visibilityMode, '');
  return /^POST_/.test(visibilityMode);
}

function hitFlags(candidate: Record<string, unknown>, bar: Record<string, unknown>): string[] {
  const high = numberValue(bar.high);
  const low = numberValue(bar.low);
  const entry = numberValue(candidate.entry);
  const stop = numberValue(candidate.stop);
  const t1 = numberValue(candidate.target1);
  const t2 = numberValue(candidate.target2);
  const side = directionValue(candidate.direction);
  if (high === null || low === null || entry === null || stop === null || t1 === null || t2 === null || !side) return [];
  const flags: string[] = [];
  if (low <= entry && high >= entry) flags.push('entry');
  if (side === 'SHORT') {
    if (high >= stop) flags.push('stop');
    if (low <= t1) flags.push('t1');
    if (low <= t2) flags.push('t2');
  } else {
    if (low <= stop) flags.push('stop');
    if (high >= t1) flags.push('t1');
    if (high >= t2) flags.push('t2');
  }
  return flags;
}

function firstHit(entries: Array<[string, TapeEvent]>, startIndex: number, candidate: Record<string, unknown>, flag: string): { time: string; index: number } | null {
  for (let index = startIndex; index < entries.length; index += 1) {
    const [key, event] = entries[index];
    if (hitFlags(candidate, asRecord(event.completed5m)).includes(flag)) {
      return { time: eventTime(key, event), index };
    }
  }
  return null;
}

function targetHitBeforeEntry(entries: Array<[string, TapeEvent]>, startIndex: number, candidate: Record<string, unknown>, firstEntryIndex: number | null): boolean {
  if (firstEntryIndex === null) return false;
  for (let index = startIndex; index < firstEntryIndex; index += 1) {
    const flags = hitFlags(candidate, asRecord(entries[index][1].completed5m));
    if (flags.includes('t1') || flags.includes('t2')) return true;
  }
  return false;
}

function outcomeFor(entries: Array<[string, TapeEvent]>, startIndex: number, candidate: Record<string, unknown>): { outcome: Outcome; pnl: number; firstEntry: { time: string; index: number } | null; firstStop: { time: string; index: number } | null; firstT1: { time: string; index: number } | null; firstT2: { time: string; index: number } | null } {
  const side = directionValue(candidate.direction);
  const entry = numberValue(candidate.entry) || 0;
  const stop = numberValue(candidate.stop) || 0;
  const t1 = numberValue(candidate.target1) || 0;
  const t2 = numberValue(candidate.target2) || 0;
  const firstEntry = firstHit(entries, startIndex, candidate, 'entry');
  const firstStop = firstHit(entries, startIndex, candidate, 'stop');
  const firstT1 = firstHit(entries, startIndex, candidate, 't1');
  const firstT2 = firstHit(entries, startIndex, candidate, 't2');
  if (!side || !firstEntry) return { outcome: 'no_fill', pnl: 0, firstEntry, firstStop, firstT1, firstT2 };

  for (let index = firstEntry.index; index < entries.length; index += 1) {
    const flags = hitFlags(candidate, asRecord(entries[index][1].completed5m));
    if (flags.includes('stop')) {
      return { outcome: 'stop', pnl: (side === 'SHORT' ? entry - stop : stop - entry) * MES_DOLLARS_PER_POINT, firstEntry, firstStop, firstT1, firstT2 };
    }
    if (flags.includes('t2')) {
      return { outcome: 't2', pnl: Math.abs(t2 - entry) * MES_DOLLARS_PER_POINT, firstEntry, firstStop, firstT1, firstT2 };
    }
    if (flags.includes('t1')) {
      return { outcome: 't1', pnl: Math.abs(t1 - entry) * MES_DOLLARS_PER_POINT, firstEntry, firstStop, firstT1, firstT2 };
    }
  }

  const lastBar = asRecord(entries.at(-1)?.[1].completed5m);
  const close = numberValue(lastBar.close);
  const pnl = close === null ? 0 : (side === 'SHORT' ? entry - close : close - entry) * MES_DOLLARS_PER_POINT;
  return { outcome: 'session_close', pnl, firstEntry, firstStop, firstT1, firstT2 };
}

function campaignKey(candidate: Record<string, unknown>): string {
  return [
    stringValue(candidate.setupType),
    stringValue(candidate.direction),
    numberValue(candidate.entry),
    numberValue(candidate.stop),
  ].join('|');
}

function candlePath(entries: Array<[string, TapeEvent]>, startIndex: number, candidate: Record<string, unknown>): string[] {
  return entries.slice(Math.max(0, startIndex - 2), Math.min(entries.length, startIndex + 8)).map(([key, event]) => {
    const bar = asRecord(event.completed5m);
    const flags = hitFlags(candidate, bar).join('/');
    return `${eventTime(key, event)} O${bar.open ?? 'N/A'} H${bar.high ?? 'N/A'} L${bar.low ?? 'N/A'} C${bar.close ?? 'N/A'}${flags ? ` ${flags}` : ''}`;
  });
}

function timeframeRows(mtf: Record<string, unknown>): string[] {
  return asArray(mtf.timeframeRows).map((row) => {
    const record = asRecord(row);
    return `${stringValue(record.timeframe)}:${stringValue(record.side)}/${stringValue(record.rawBias)}`;
  });
}

function buildFindings(args: {
  candidate: Record<string, unknown>;
  outcome: Outcome;
  targetAlreadyHitBeforeEntry: boolean;
  sameCandleEntryStop: boolean;
  duplicateCampaign: boolean;
  mtfStatus: string;
  staleReason: string | null;
}): string[] {
  const findings: string[] = [];
  const risk = numberValue(args.candidate.riskPoints) || 0;
  if (risk >= 20) findings.push('late_or_extended_risk: protected 5M stop was far from entry at candidate time');
  if (args.targetAlreadyHitBeforeEntry) findings.push('stale_entry: T1/T2 was already touched before entry filled');
  if (args.sameCandleEntryStop) findings.push('same_candle_ambiguity: entry and stop were touched in the same completed 5M candle');
  if (args.duplicateCampaign) findings.push('duplicate_campaign: same session/model/side/entry/stop appeared again');
  if (args.mtfStatus && args.mtfStatus !== 'aligned') findings.push(`mtf_not_clean: ${args.mtfStatus}`);
  if (args.staleReason) findings.push(`scanner_stale_reason: ${args.staleReason}`);
  if (args.outcome === 'stop' && findings.length === 0) findings.push('valid_loss: stopped without an audit-level stale/duplicate/ambiguity marker');
  return findings;
}

function recommendedDisposition(findings: string[], outcome: Outcome): string {
  if (findings.some((finding) => finding.startsWith('stale_entry'))) return 'Block as stale/no-chase; do not publish a fresh entry after targets were already touched.';
  if (findings.some((finding) => finding.startsWith('same_candle_ambiguity'))) return 'Hold for a clean completed 5M retest/hold; do not approve same-candle entry/stop noise.';
  if (findings.some((finding) => finding.startsWith('duplicate_campaign'))) return 'Collapse into the original campaign; update internally only if levels materially change.';
  if (findings.some((finding) => finding.startsWith('late_or_extended_risk'))) return 'Keep as evidence unless a fresh retest provides a closer protected 5M structure stop and target room.';
  if (findings.some((finding) => finding.startsWith('mtf_not_clean'))) return 'Require fresh 5M separator proof before promotion.';
  if (outcome === 'stop') return 'Treat as a valid loss unless a deeper model-specific replay finds missing pre-entry evidence.';
  return 'No stop-specific action.';
}

async function loadTape(filePath: string): Promise<Array<[string, TapeEvent]>> {
  const raw = JSON.parse(await fs.readFile(filePath, 'utf8')) as { events?: Record<string, TapeEvent> };
  return Object.entries(raw.events || {}).sort((a, b) => String(a[1].completed5m?.time || a[0]).localeCompare(String(b[1].completed5m?.time || b[0])));
}

export async function buildStoppedTradeWorkflowAuditReport(options: AuditOptions): Promise<StoppedTradeWorkflowAuditReport> {
  const rows: StoppedTradeWorkflowAuditRow[] = [];
  const sourceTapes: string[] = [];
  let postedCandidatesReviewed = 0;

  for (const session of options.sessions) {
    const filePath = tapePath(options, session);
    if (!existsSync(filePath)) continue;
    sourceTapes.push(filePath);
    const entries = await loadTape(filePath);
    const seenCampaigns = new Map<string, string>();

    for (let index = 0; index < entries.length; index += 1) {
      const [key, event] = entries[index];
      if (!shouldReviewEvent(event)) continue;
      postedCandidatesReviewed += 1;
      const candidate = asRecord(event.setupCandidateStatus?.selected);
      const side = directionValue(candidate.direction);
      const entry = numberValue(candidate.entry);
      const stop = numberValue(candidate.stop);
      const t1 = numberValue(candidate.target1);
      const t2 = numberValue(candidate.target2);
      const riskPoints = numberValue(candidate.riskPoints);
      if (!side || entry === null || stop === null || t1 === null || t2 === null || riskPoints === null) continue;

      const outcome = outcomeFor(entries, index, candidate);
      if (!options.includeAll && outcome.outcome !== 'stop') continue;

      const keyForCampaign = campaignKey(candidate);
      const duplicateOf = seenCampaigns.get(keyForCampaign) || null;
      const duplicateCampaign = duplicateOf !== null;
      if (!seenCampaigns.has(keyForCampaign)) seenCampaigns.set(keyForCampaign, eventTime(key, event));

      const targetAlreadyHit = targetHitBeforeEntry(entries, index, candidate, outcome.firstEntry?.index ?? null);
      const sameCandleEntryStop = Boolean(outcome.firstEntry && outcome.firstStop && outcome.firstEntry.index === outcome.firstStop.index);
      const mtf = asRecord(event.mtfPrimarySideArbitration);
      const visibility = asRecord(event.visibility);
      const discord = asRecord(event.discord);
      const publishDecision = asRecord(discord.publishDecision);
      const staleReason = typeof event.staleReason === 'string' ? event.staleReason : null;
      const mtfStatus = stringValue(mtf.mtfArbitrationStatus, 'N/A');
      const findings = buildFindings({
        candidate,
        outcome: outcome.outcome,
        targetAlreadyHitBeforeEntry: targetAlreadyHit,
        sameCandleEntryStop,
        duplicateCampaign,
        mtfStatus,
        staleReason,
      });

      rows.push({
        tradeDate: options.tradeDate,
        session,
        candidateTime: eventTime(key, event),
        model: stringValue(candidate.setupType),
        side,
        entry,
        stop,
        t1,
        t2,
        riskPoints,
        outcome: outcome.outcome,
        oneMesPnl: Number(outcome.pnl.toFixed(2)),
        firstEntryTime: outcome.firstEntry?.time || null,
        firstStopTime: outcome.firstStop?.time || null,
        firstT1Time: outcome.firstT1?.time || null,
        firstT2Time: outcome.firstT2?.time || null,
        targetAlreadyHitBeforeEntry: targetAlreadyHit,
        sameCandleEntryStop,
        duplicateCampaign,
        duplicateOf,
        htfContextStatus: stringValue(event.htfContextStatus || asRecord(event.deskState).htfContextStatus, 'N/A'),
        mtfPrimarySide: stringValue(mtf.mtfPrimarySide, 'N/A'),
        mtfArbitrationStatus: mtfStatus,
        timeframeRows: timeframeRows(mtf),
        visibilityMode: stringValue(visibility.visibilityMode, 'N/A'),
        discordAction: stringValue(publishDecision.action || visibility.discordAction, 'N/A'),
        staleReason,
        workflowStageFindings: findings,
        recommendedDisposition: recommendedDisposition(findings, outcome.outcome),
        candlePath: candlePath(entries, index, candidate),
      });
    }
  }

  const summary = {
    tapesReviewed: sourceTapes.length,
    postedCandidatesReviewed,
    rowsReported: rows.length,
    stoppedRows: rows.filter((row) => row.outcome === 'stop').length,
    targetAlreadyHitBeforeEntryRows: rows.filter((row) => row.targetAlreadyHitBeforeEntry).length,
    sameCandleEntryStopRows: rows.filter((row) => row.sameCandleEntryStop).length,
    duplicateCampaignRows: rows.filter((row) => row.duplicateCampaign).length,
    lateExtendedRows: rows.filter((row) => row.workflowStageFindings.some((finding) => finding.startsWith('late_or_extended_risk'))).length,
    htfMixedOrCounterRows: rows.filter((row) => row.workflowStageFindings.some((finding) => finding.startsWith('mtf_not_clean'))).length,
    oneMesPnl: Number(rows.reduce((sum, row) => sum + row.oneMesPnl, 0).toFixed(2)),
  };

  const report: StoppedTradeWorkflowAuditReport = {
    reportType: 'stopped_trade_workflow_audit',
    generatedAt: new Date().toISOString(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    sessions: options.sessions,
    sourceTapes,
    summary,
    rows,
    authority: {
      readOnly: true,
      postsDiscord: false,
      readsSupabase: false,
      readsNinjaTrader: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntriesStopsTargets: false,
    },
    markdown: '',
  };
  report.markdown = renderMarkdown(report);
  await fs.mkdir(options.outDir, { recursive: true });
  const stamp = Date.now();
  const base = path.join(options.outDir, `stopped-trade-workflow-audit-${options.instrument}-${options.tradeDate}-${stamp}`);
  await fs.writeFile(`${base}.json`, JSON.stringify(report, null, 2));
  await fs.writeFile(`${base}.md`, report.markdown);
  return report;
}

function renderMarkdown(report: StoppedTradeWorkflowAuditReport): string {
  const lines: string[] = [
    `# Stopped Trade Workflow Audit`,
    ``,
    `Date: ${report.tradeDate}`,
    `Instrument: ${report.instrument}`,
    `Sessions: ${report.sessions.join(', ')}`,
    ``,
    `Read-only workflow replay. No Discord, Supabase, NinjaTrader, scanner state, canExecute, entry, stop, target, risk, or trading-rule changes.`,
    ``,
    `## Summary`,
    ``,
    `- Tapes reviewed: ${report.summary.tapesReviewed}`,
    `- Posted candidates reviewed: ${report.summary.postedCandidatesReviewed}`,
    `- Rows reported: ${report.summary.rowsReported}`,
    `- Stopped rows: ${report.summary.stoppedRows}`,
    `- Target already hit before entry: ${report.summary.targetAlreadyHitBeforeEntryRows}`,
    `- Same-candle entry/stop: ${report.summary.sameCandleEntryStopRows}`,
    `- Duplicate campaign rows: ${report.summary.duplicateCampaignRows}`,
    `- Late/extended risk rows: ${report.summary.lateExtendedRows}`,
    `- MTF mixed/counter rows: ${report.summary.htfMixedOrCounterRows}`,
    `- One-MES P/L of reported rows: $${formatNumber(report.summary.oneMesPnl)}`,
    ``,
    `## Rows`,
    ``,
  ];

  for (const row of report.rows) {
    lines.push(
      `### ${row.session} ${row.candidateTime} ${row.model} ${row.side}`,
      ``,
      `Entry ${formatNumber(row.entry)} | Stop ${formatNumber(row.stop)} | T1 ${formatNumber(row.t1)} | T2 ${formatNumber(row.t2)} | Risk ${formatNumber(row.riskPoints)} pts`,
      `Outcome: ${row.outcome} | One-MES P/L: $${formatNumber(row.oneMesPnl)}`,
      `Workflow: first entry ${row.firstEntryTime || 'N/A'} | first stop ${row.firstStopTime || 'N/A'} | first T1 ${row.firstT1Time || 'N/A'} | first T2 ${row.firstT2Time || 'N/A'}`,
      `HTF/MTF: context ${row.htfContextStatus}; primary ${row.mtfPrimarySide}; status ${row.mtfArbitrationStatus}; ${row.timeframeRows.join(', ') || 'no timeframe rows'}`,
      `Publish state: ${row.visibilityMode} / ${row.discordAction}`,
      `Findings: ${row.workflowStageFindings.join('; ')}`,
      `Disposition: ${row.recommendedDisposition}`,
      ``,
      `Candle path:`,
      ...row.candlePath.map((item) => `- ${item}`),
      ``,
    );
  }

  return `${lines.join('\n')}\n`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseStoppedTradeWorkflowAuditArgs();
  buildStoppedTradeWorkflowAuditReport(options)
    .then((report) => {
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(report.markdown);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
