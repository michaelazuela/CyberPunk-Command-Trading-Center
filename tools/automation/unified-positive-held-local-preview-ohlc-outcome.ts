import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type {
  UnifiedPositiveHeldLocalPreviewReplayQueueReport,
  UnifiedPositiveHeldLocalPreviewReplayQueueRow,
} from './unified-positive-held-local-preview-replay-queue';

type Direction = 'LONG' | 'SHORT';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface UnifiedPositiveHeldLocalPreviewOhlcOutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  sourceSnapshotId: string | null;
  proofTime: string | null;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: 'stopped_before_t1' | 't1_hit_only' | 't1_and_t2_hit' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
  barsSource: 'local_market_bars_json' | 'scanner_decision_tape_completed_5m' | 'missing';
  barsLoaded: number;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedOneMesPl: number | null;
  resolvedR: number | null;
  intrabarAmbiguity: boolean;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport {
  reportType: 'unified_positive_held_local_preview_ohlc_outcome';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    replayQueuePath: string | null;
    heldLocalAdapterPath: string | null;
    marketBarsJsonPath: string | null;
    auditDir: string;
  };
  assumptions: {
    oneMesPointValue: 5;
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    sameBarStopAndTargetUsesConservativeStopFirst: true;
    outcomeIsResearchOnly: true;
  };
  summary: {
    queuedRows: number;
    resolvedRows: number;
    unresolvedRows: number;
    blockedRows: number;
    grossResolvedOneMesPl: number | null;
    turtleSoupResolvedOneMesPl: number | null;
    sweepMssFvgRetraceResolvedOneMesPl: number | null;
    livePromotionAllowedRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewOhlcOutcomeRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const POINT_VALUE = 5;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = numberOrNull(record.open);
  const high = numberOrNull(record.high);
  const low = numberOrNull(record.low);
  const close = numberOrNull(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  const volume = numberOrNull(record.volume);
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractProofTime(adapterRow: UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number] | undefined): string | null {
  const trigger = adapterRow?.artifact?.deskTicket.triggerCondition || adapterRow?.artifact?.deskPublishDecision.triggerCondition || '';
  return normalizeTime(trigger.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/)?.[0]);
}

function loadMarketBars5m(marketBarsJsonPath: string | null): OhlcBar[] {
  if (!marketBarsJsonPath || !fs.existsSync(marketBarsJsonPath)) return [];
  const raw = JSON.parse(fs.readFileSync(marketBarsJsonPath, 'utf8')) as unknown;
  const root = asRecord(raw);
  const grouped = asRecord(root.bars || root.timeframes || root);
  const rows = Array.isArray(grouped['5m'])
    ? grouped['5m'] as unknown[]
    : Array.isArray(raw)
      ? raw.filter((row) => asRecord(row).timeframe === '5m')
      : [];
  const byTime = new Map<string, OhlcBar>();
  for (const row of rows) {
    const bar = normalizeBar(row);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function tapePath(auditDir: string, row: Pick<UnifiedPositiveHeldLocalPreviewReplayQueueRow, 'tradeDate' | 'session'>): string {
  return path.join(auditDir, `scanner-decision-tape-${row.tradeDate}-MES-${row.session}.json`);
}

function loadDecisionTapeBars(auditDir: string, row: Pick<UnifiedPositiveHeldLocalPreviewReplayQueueRow, 'tradeDate' | 'session'>): OhlcBar[] {
  const file = tapePath(auditDir, row);
  if (!fs.existsSync(file)) return [];
  const tape = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function barsForRow(args: {
  row: UnifiedPositiveHeldLocalPreviewReplayQueueRow;
  marketBars5m: OhlcBar[];
  auditDir: string;
}): { bars: OhlcBar[]; source: UnifiedPositiveHeldLocalPreviewOhlcOutcomeRow['barsSource'] } {
  const localBars = args.marketBars5m.filter((bar) => bar.time.slice(0, 10) === args.row.tradeDate);
  if (localBars.length) return { bars: localBars, source: 'local_market_bars_json' };
  const tapeBars = loadDecisionTapeBars(args.auditDir, args.row);
  if (tapeBars.length) return { bars: tapeBars, source: 'scanner_decision_tape_completed_5m' };
  return { bars: [], source: 'missing' };
}

function crosses(row: UnifiedPositiveHeldLocalPreviewReplayQueueRow, bar: OhlcBar, level: number): boolean {
  return row.direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(row: UnifiedPositiveHeldLocalPreviewReplayQueueRow, bar: OhlcBar, stop: number): boolean {
  return row.direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(row: UnifiedPositiveHeldLocalPreviewReplayQueueRow, bar: OhlcBar, entry: number): number {
  return row.direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(row: UnifiedPositiveHeldLocalPreviewReplayQueueRow, bar: OhlcBar, entry: number): number {
  return row.direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function pointsToPl(row: Pick<UnifiedPositiveHeldLocalPreviewReplayQueueRow, 'direction'>, entry: number, exit: number): number {
  const points = row.direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function buildOutcomeRow(args: {
  row: UnifiedPositiveHeldLocalPreviewReplayQueueRow;
  adapterRow: UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number] | undefined;
  marketBars5m: OhlcBar[];
  auditDir: string;
}): UnifiedPositiveHeldLocalPreviewOhlcOutcomeRow {
  const proofTime = extractProofTime(args.adapterRow);
  const { row } = args;
  const { bars, source } = barsForRow({ row, marketBars5m: args.marketBars5m, auditDir: args.auditDir });
  const blockers = [
    row.replayStatus !== 'ready_for_read_only_outcome_replay' ? `replay queue status ${row.replayStatus}` : null,
    !proofTime ? 'missing completed 5M proof time from held-local adapter' : null,
    row.entry === null ? 'missing entry' : null,
    row.stop === null ? 'missing stop' : null,
    row.t1 === null ? 'missing T1' : null,
    row.t2 === null ? 'missing T2' : null,
    row.riskPoints === null || row.riskPoints <= 0 ? 'missing positive risk' : null,
    !bars.length ? 'missing local completed 5M bars for trade date' : null,
  ].filter((item): item is string => Boolean(item));

  if (blockers.length || !proofTime || row.entry === null || row.stop === null || row.t1 === null || row.t2 === null || row.riskPoints === null) {
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      sourceSnapshotId: row.sourceSnapshotId,
      proofTime,
      outcomeStatus: 'blocked',
      outcomeLabel: 'blocked',
      entry: row.entry,
      stop: row.stop,
      t1: row.t1,
      t2: row.t2,
      riskPoints: row.riskPoints,
      barsSource: source,
      barsLoaded: bars.length,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
      resolvedR: null,
      intrabarAmbiguity: false,
      blockers,
    };
  }

  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryHitIndex = eligibleBars.findIndex((bar) => crosses(row, bar, row.entry as number));
  if (entryHitIndex < 0) {
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      sourceSnapshotId: row.sourceSnapshotId,
      proofTime,
      outcomeStatus: 'unresolved',
      outcomeLabel: 'no_fill',
      entry: row.entry,
      stop: row.stop,
      t1: row.t1,
      t2: row.t2,
      riskPoints: row.riskPoints,
      barsSource: source,
      barsLoaded: eligibleBars.length,
      entryHitTime: null,
      firstReplayBarTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      resolvedOneMesPl: null,
      resolvedR: null,
      intrabarAmbiguity: false,
      blockers: [],
    };
  }

  const entryHitTime = eligibleBars[entryHitIndex].time;
  const replayBars = eligibleBars.slice(entryHitIndex + 1);
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let mfe = 0;
  let mae = 0;
  let intrabarAmbiguity = false;

  for (const bar of replayBars) {
    mfe = Math.max(mfe, favorableMove(row, bar, row.entry));
    mae = Math.max(mae, adverseMove(row, bar, row.entry));
    const stopHit = hitsStop(row, bar, row.stop);
    const t1Hit = crosses(row, bar, row.t1);
    const t2Hit = crosses(row, bar, row.t2);
    if (stopHit && (t1Hit || t2Hit)) intrabarAmbiguity = true;
    if (!stopHitTime && stopHit) stopHitTime = bar.time;
    if (!t1HitTime && t1Hit) t1HitTime = bar.time;
    if (!t2HitTime && t2Hit) t2HitTime = bar.time;
  }

  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const outcomeLabel: UnifiedPositiveHeldLocalPreviewOhlcOutcomeRow['outcomeLabel'] = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = outcomeLabel === 'stopped_before_t1'
    ? row.stop
    : outcomeLabel === 't1_and_t2_hit'
      ? row.t2
      : outcomeLabel === 't1_hit_only'
        ? row.t1
        : null;
  const resolvedOneMesPl = exit === null ? null : pointsToPl(row, row.entry, exit);
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    sourceSnapshotId: row.sourceSnapshotId,
    proofTime,
    outcomeStatus: resolvedOneMesPl === null ? 'unresolved' : 'resolved',
    outcomeLabel,
    entry: row.entry,
    stop: row.stop,
    t1: row.t1,
    t2: row.t2,
    riskPoints: row.riskPoints,
    barsSource: source,
    barsLoaded: eligibleBars.length,
    entryHitTime,
    firstReplayBarTime: replayBars[0]?.time || null,
    stopHitTime,
    t1HitTime,
    t2HitTime,
    maximumFavorableExcursion: round(mfe),
    maximumAdverseExcursion: round(mae),
    resolvedOneMesPl,
    resolvedR: resolvedOneMesPl === null ? null : round(resolvedOneMesPl / (row.riskPoints * POINT_VALUE)),
    intrabarAmbiguity,
    blockers: [],
  };
}

function sumResolved(rows: UnifiedPositiveHeldLocalPreviewOhlcOutcomeRow[], setupType?: string): number | null {
  const values = rows
    .filter((row) => !setupType || row.setupType === setupType)
    .map((row) => row.resolvedOneMesPl)
    .filter((value): value is number => value !== null);
  return values.length ? round(values.reduce((sum, value) => sum + value, 0)) : null;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview OHLC Outcome',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only OHLC outcome replay. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Queued rows: ${report.summary.queuedRows}.`,
    `- Resolved rows: ${report.summary.resolvedRows}.`,
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- TurtleSoup resolved one-MES P/L: ${report.summary.turtleSoupResolvedOneMesPl ?? 'not available'}.`,
    `- SweepMssFvgRetrace resolved one-MES P/L: ${report.summary.sweepMssFvgRetraceResolvedOneMesPl ?? 'not available'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Ticket | Date | Session | Setup | Side | Outcome | Entry Hit | Stop | T1 | T2 | P/L | R | MFE | MAE | Source | Blockers |',
    '|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.outcomeLabel} | ${row.entryHitTime ?? '-'} | ${row.stopHitTime ?? '-'} | ${row.t1HitTime ?? '-'} | ${row.t2HitTime ?? '-'} | ${row.resolvedOneMesPl ?? '-'} | ${row.resolvedR ?? '-'} | ${row.maximumFavorableExcursion ?? '-'} | ${row.maximumAdverseExcursion ?? '-'} | ${row.barsSource} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewOhlcOutcomeReport(args: {
  replayQueuePath: string | null;
  replayQueueReport: UnifiedPositiveHeldLocalPreviewReplayQueueReport | null;
  heldLocalAdapterPath: string | null;
  heldLocalAdapterReport: UnifiedPositiveHeldLocalTicketAdapterReport | null;
  marketBarsJsonPath: string | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport {
  const queueRows = args.replayQueueReport?.rows || [];
  const adapterByTicket = new Map((args.heldLocalAdapterReport?.rows || []).map((row) => [row.ticketId, row]));
  const marketBars5m = loadMarketBars5m(args.marketBarsJsonPath);
  const rows = queueRows.map((row) => buildOutcomeRow({
    row,
    adapterRow: adapterByTicket.get(row.ticketId),
    marketBars5m,
    auditDir: args.auditDir,
  }));
  const topLevelBlockers = [
    !args.replayQueuePath ? 'missing replay queue path' : null,
    !args.replayQueueReport ? 'missing replay queue report' : null,
    args.replayQueueReport && args.replayQueueReport.status !== 'pass' ? `replay queue status ${args.replayQueueReport.status}` : null,
    args.replayQueueReport && args.replayQueueReport.summary.livePromotionAllowedRows !== 0 ? `replay queue has ${args.replayQueueReport.summary.livePromotionAllowedRows} live-promotion rows` : null,
    !args.heldLocalAdapterPath ? 'missing held-local adapter path' : null,
    !args.heldLocalAdapterReport ? 'missing held-local adapter report' : null,
    !args.marketBarsJsonPath ? 'missing local market-bars JSON path' : null,
    args.marketBarsJsonPath && !fs.existsSync(args.marketBarsJsonPath) ? `local market-bars JSON not found: ${args.marketBarsJsonPath}` : null,
    queueRows.length === 0 ? 'no queued replay rows found' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_ohlc_outcome',
    generatedAt,
    status: topLevelBlockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      replayQueuePath: args.replayQueuePath,
      heldLocalAdapterPath: args.heldLocalAdapterPath,
      marketBarsJsonPath: args.marketBarsJsonPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      oneMesPointValue: POINT_VALUE,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      outcomeIsResearchOnly: true,
    },
    summary: {
      queuedRows: queueRows.length,
      resolvedRows: rows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: rows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedRows: rows.filter((row) => row.outcomeStatus === 'blocked').length,
      grossResolvedOneMesPl: sumResolved(rows),
      turtleSoupResolvedOneMesPl: sumResolved(rows, 'TurtleSoup'),
      sweepMssFvgRetraceResolvedOneMesPl: sumResolved(rows, 'SweepMssFvgRetrace'),
      livePromotionAllowedRows: args.replayQueueReport?.summary.livePromotionAllowedRows || 0,
    },
    rows,
    blockers: topLevelBlockers,
    recommendations: topLevelBlockers.length
      ? ['Do not use this outcome report for model-quality decisions until blockers are cleared with approved local OHLC evidence.']
      : ['Use resolved P/L as research evidence only; model removal, quarantine, or repair still needs a separate narrow decision phase.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewOhlcOutcomeReport(
  report: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-ohlc-outcome-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewOhlcOutcomeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const replayQueuePath = readFlag(args, '--replay-queue') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-queue-\d+\.json$/);
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter') || latestMatchingFile(outDir, /^unified-positive-held-local-ticket-adapter-\d+\.json$/);
  const marketBarsJsonPath = readFlag(args, '--market-bars-json') || latestMatchingFile(outDir, /^raw-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewOhlcOutcomeReport({
    replayQueuePath,
    replayQueueReport: replayQueuePath && fs.existsSync(replayQueuePath)
      ? JSON.parse(fs.readFileSync(replayQueuePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReplayQueueReport
      : null,
    heldLocalAdapterPath,
    heldLocalAdapterReport: heldLocalAdapterPath && fs.existsSync(heldLocalAdapterPath)
      ? JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport
      : null,
    marketBarsJsonPath,
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewOhlcOutcomeReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewOhlcOutcomeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
