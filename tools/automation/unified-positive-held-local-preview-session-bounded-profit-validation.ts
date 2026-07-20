import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';

interface SourceOutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  resolvedOneMesPl: number | null;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ValidationRow extends SourceOutcomeRow {
  sourceTapePath: string;
  barsLoaded: number;
  barsAfterProof: number;
  firstBarTime: string | null;
  lastBarTime: string | null;
  sessionOutcomeBucket: OutcomeBucket;
  sessionOutcomeLabel: OutcomeLabel;
  sessionResolvedOneMesPl: number | null;
  sessionResolvedR: number | null;
  sessionEntryHitTime: string | null;
  sessionStopHitTime: string | null;
  sessionT1HitTime: string | null;
  sessionT2HitTime: string | null;
  sessionMaximumFavorableExcursion: number | null;
  sessionMaximumAdverseExcursion: number | null;
  oldResolvedOneMesPl: number | null;
  oldVsSessionDeltaOneMesPl: number | null;
  riskBand: string;
  methodKey: string;
  targetPocket: boolean;
  blockers: string[];
}

interface GroupSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  oldGrossOneMesPl: number | null;
  sessionGrossOneMesPl: number | null;
  deltaOneMesPl: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
  topExampleTicketId: string | null;
  topExampleEntry: number | null;
  topExampleStop: number | null;
  topExampleT1: number | null;
  topExampleT2: number | null;
  topExampleRiskPoints: number | null;
}

interface SourceReport {
  rows?: unknown;
  reportType?: string;
}

export interface UnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport {
  reportType: 'unified_positive_held_local_preview_session_bounded_profit_validation';
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
    usesSavedScannerDecisionTapesOnly: true;
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
    outcomeReportPath: string | null;
    sourceReportType: string | null;
    auditDir: string;
  };
  assumptions: {
    sameSessionOnly: true;
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    sameBarStopAndTargetUsesConservativeStopFirst: true;
    oneMesPointValue: 5;
    outputIsResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    validationRows: number;
    rowsWithSessionTape: number;
    rowsWithBarsAfterProof: number;
    resolvedRows: number;
    winnerRows: number;
    lossRows: number;
    unresolvedRows: number;
    blockedRows: number;
    oldGrossOneMesPl: number | null;
    sessionGrossOneMesPl: number | null;
    deltaOneMesPl: number | null;
    targetPocketRows: number;
    targetPocketSessionGrossOneMesPl: number | null;
    targetPocketWinners: number;
    targetPocketLosses: number;
    livePromotionAllowedRows: 0;
    recommendation: 'promote_surviving_pockets_to_scanner_owned_proposal_research' | 'do_not_promote_until_session_evidence_improves' | 'fix_missing_outcome_report';
  };
  modelGroups: GroupSummary[];
  methodGroups: GroupSummary[];
  targetPocketGroups: GroupSummary[];
  topSessionTickets: ValidationRow[];
  rows: ValidationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const POINT_VALUE = 5;
const TARGET_METHODS = new Set([
  'SweepMssFvgRetrace|lunch|SHORT|risk_16_to_24',
  'SweepMssFvgRetrace|morning|SHORT|risk_8_to_16',
  'SweepMssFvgRetrace|morning|LONG|risk_gte_32',
  'OpeningDriveFvgContinuation|morning|LONG|risk_gte_32',
  'IntradayMssMicroContinuation|morning|SHORT|risk_16_to_24',
  'IntradayMssMicroContinuation|morning|SHORT|risk_24_to_32',
]);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rowsFrom(report: SourceReport | null): SourceOutcomeRow[] {
  return Array.isArray(report?.rows) ? report.rows as SourceOutcomeRow[] : [];
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function riskBand(riskPoints: number): string {
  if (riskPoints < 4) return 'risk_lt_4';
  if (riskPoints < 8) return 'risk_4_to_8';
  if (riskPoints < 16) return 'risk_8_to_16';
  if (riskPoints < 24) return 'risk_16_to_24';
  if (riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function methodKey(row: Pick<SourceOutcomeRow, 'setupType' | 'session' | 'direction' | 'riskPoints'>): string {
  return `${row.setupType}|${row.session}|${row.direction}|${riskBand(row.riskPoints)}`;
}

function tapePath(auditDir: string, row: Pick<SourceOutcomeRow, 'tradeDate' | 'session'>): string {
  return path.join(auditDir, `scanner-decision-tape-${row.tradeDate}-MES-${row.session}.json`);
}

function loadTapeBars(sourceTapePath: string, tradeDate: string): OhlcBar[] {
  if (!fs.existsSync(sourceTapePath)) return [];
  const tape = readJson<Record<string, unknown>>(sourceTapePath);
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape?.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar && bar.time.startsWith(tradeDate)) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function crosses(direction: Direction, bar: OhlcBar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(direction: Direction, bar: OhlcBar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(direction: Direction, bar: OhlcBar, entry: number): number {
  return direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(direction: Direction, bar: OhlcBar, entry: number): number {
  return direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function directionallyValid(row: SourceOutcomeRow): boolean {
  return row.direction === 'LONG' ? row.stop < row.entry : row.stop > row.entry;
}

function targetGeometryValid(row: SourceOutcomeRow): boolean {
  return row.direction === 'LONG'
    ? row.t1 > row.entry && row.t2 > row.entry
    : row.t1 < row.entry && row.t2 < row.entry;
}

function validateRow(row: SourceOutcomeRow, auditDir: string): ValidationRow {
  const sourceTapePath = tapePath(auditDir, row);
  const bars = loadTapeBars(sourceTapePath, row.tradeDate);
  const proofTime = normalizeTime(row.proofTime) || row.proofTime;
  const barsAfterProof = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length;
  const key = methodKey(row);
  const blockers = [
    !fs.existsSync(sourceTapePath) ? 'missing scanner decision tape' : null,
    bars.length === 0 ? 'missing same-session completed 5M bars' : null,
    barsAfterProof === 0 ? 'missing same-session bars at or after proof time' : null,
    row.riskPoints <= 0 ? 'missing positive risk' : null,
    !directionallyValid(row) ? 'directionally invalid entry-to-stop geometry' : null,
    !targetGeometryValid(row) ? 'directionally invalid target geometry' : null,
  ].filter((item): item is string => Boolean(item));
  const base = {
    ...row,
    sourceTapePath,
    barsLoaded: bars.length,
    barsAfterProof,
    firstBarTime: bars[0]?.time || null,
    lastBarTime: bars[bars.length - 1]?.time || null,
    oldResolvedOneMesPl: row.resolvedOneMesPl,
    oldVsSessionDeltaOneMesPl: null,
    riskBand: riskBand(row.riskPoints),
    methodKey: key,
    targetPocket: TARGET_METHODS.has(key),
  };
  if (blockers.length) {
    return {
      ...base,
      sessionOutcomeBucket: 'blocked',
      sessionOutcomeLabel: 'blocked',
      sessionResolvedOneMesPl: null,
      sessionResolvedR: null,
      sessionEntryHitTime: null,
      sessionStopHitTime: null,
      sessionT1HitTime: null,
      sessionT2HitTime: null,
      sessionMaximumFavorableExcursion: null,
      sessionMaximumAdverseExcursion: null,
      blockers,
    };
  }
  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryHitIndex = eligibleBars.findIndex((bar) => crosses(row.direction, bar, row.entry));
  if (entryHitIndex < 0) {
    return {
      ...base,
      sessionOutcomeBucket: 'unresolved',
      sessionOutcomeLabel: 'no_fill',
      sessionResolvedOneMesPl: null,
      sessionResolvedR: null,
      sessionEntryHitTime: null,
      sessionStopHitTime: null,
      sessionT1HitTime: null,
      sessionT2HitTime: null,
      sessionMaximumFavorableExcursion: null,
      sessionMaximumAdverseExcursion: null,
      blockers: [],
    };
  }
  const replayBars = eligibleBars.slice(entryHitIndex + 1);
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let maximumFavorableExcursion = 0;
  let maximumAdverseExcursion = 0;
  for (const bar of replayBars) {
    maximumFavorableExcursion = Math.max(maximumFavorableExcursion, favorableMove(row.direction, bar, row.entry));
    maximumAdverseExcursion = Math.max(maximumAdverseExcursion, adverseMove(row.direction, bar, row.entry));
    const stopHit = hitsStop(row.direction, bar, row.stop);
    const t1Hit = crosses(row.direction, bar, row.t1);
    const t2Hit = crosses(row.direction, bar, row.t2);
    if (!stopHitTime && stopHit) stopHitTime = bar.time;
    if (!t1HitTime && t1Hit) t1HitTime = bar.time;
    if (!t2HitTime && t2Hit) t2HitTime = bar.time;
  }
  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const label: OutcomeLabel = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = label === 'stopped_before_t1'
    ? row.stop
    : label === 't1_and_t2_hit'
      ? row.t2
      : label === 't1_hit_only'
        ? row.t1
        : null;
  const sessionResolvedOneMesPl = exit === null ? null : pointsToPl(row.direction, row.entry, exit);
  return {
    ...base,
    sessionOutcomeBucket: sessionResolvedOneMesPl === null ? 'unresolved' : label === 'stopped_before_t1' ? 'loss' : 'winner',
    sessionOutcomeLabel: label,
    sessionResolvedOneMesPl,
    sessionResolvedR: sessionResolvedOneMesPl === null ? null : round(sessionResolvedOneMesPl / (row.riskPoints * POINT_VALUE)),
    sessionEntryHitTime: eligibleBars[entryHitIndex].time,
    sessionStopHitTime: stopHitTime,
    sessionT1HitTime: t1HitTime,
    sessionT2HitTime: t2HitTime,
    sessionMaximumFavorableExcursion: round(maximumFavorableExcursion),
    sessionMaximumAdverseExcursion: round(maximumAdverseExcursion),
    oldVsSessionDeltaOneMesPl: row.resolvedOneMesPl === null || sessionResolvedOneMesPl === null
      ? null
      : round(sessionResolvedOneMesPl - row.resolvedOneMesPl),
    blockers: [],
  };
}

function groupRows(rows: ValidationRow[], keyFor: (row: ValidationRow) => string): GroupSummary[] {
  const groups = new Map<string, ValidationRow[]>();
  for (const row of rows) {
    const key = keyFor(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, group]) => {
    const resolved = group.filter((row) => row.sessionResolvedOneMesPl !== null);
    const winners = group.filter((row) => row.sessionOutcomeBucket === 'winner').length;
    const top = [...group].sort((a, b) => (b.sessionResolvedOneMesPl ?? -999999) - (a.sessionResolvedOneMesPl ?? -999999))[0] || null;
    const mfeR = group.map((row) => row.sessionMaximumFavorableExcursion !== null && row.riskPoints > 0
      ? row.sessionMaximumFavorableExcursion / row.riskPoints
      : null);
    const maeR = group.map((row) => row.sessionMaximumAdverseExcursion !== null && row.riskPoints > 0
      ? row.sessionMaximumAdverseExcursion / row.riskPoints
      : null);
    const oldGross = sum(group.map((row) => row.oldResolvedOneMesPl));
    const sessionGross = sum(group.map((row) => row.sessionResolvedOneMesPl));
    return {
      key,
      rows: group.length,
      winners,
      losses: group.filter((row) => row.sessionOutcomeBucket === 'loss').length,
      unresolved: group.filter((row) => row.sessionOutcomeBucket === 'unresolved').length,
      blocked: group.filter((row) => row.sessionOutcomeBucket === 'blocked').length,
      oldGrossOneMesPl: oldGross,
      sessionGrossOneMesPl: sessionGross,
      deltaOneMesPl: oldGross === null || sessionGross === null ? null : round(sessionGross - oldGross),
      winRateResolved: resolved.length ? round(winners / resolved.length) : null,
      averageRiskPoints: avg(group.map((row) => row.riskPoints)),
      averageMfeR: avg(mfeR),
      averageMaeR: avg(maeR),
      topExampleTicketId: top?.ticketId || null,
      topExampleEntry: top?.entry ?? null,
      topExampleStop: top?.stop ?? null,
      topExampleT1: top?.t1 ?? null,
      topExampleT2: top?.t2 ?? null,
      topExampleRiskPoints: top?.riskPoints ?? null,
    };
  }).sort((a, b) => (b.sessionGrossOneMesPl ?? -999999) - (a.sessionGrossOneMesPl ?? -999999));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function groupTable(groups: GroupSummary[], limit = 16): string[] {
  return [
    '| Key | Rows | W/L/U/B | Old P/L | Same-Session P/L | Delta | Win Rate | Avg Risk | Avg MFE R | Avg MAE R | Example Entry | Stop | T1 | T2 |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...groups.slice(0, limit).map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oldGrossOneMesPl ?? '-'} | ${row.sessionGrossOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} | ${row.topExampleEntry ?? '-'} | ${row.topExampleStop ?? '-'} | ${row.topExampleT1 ?? '-'} | ${row.topExampleT2 ?? '-'} |`),
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport, 'markdown'>): string {
  return [
    '# Session-Bounded Profit Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only same-session validation from saved scanner decision tapes. It does not run setupScanner, read live bridge data, post Discord, write Supabase, or change trading behavior.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Validation rows: ${report.summary.validationRows}.`,
    `- Rows with same-session tape: ${report.summary.rowsWithSessionTape}.`,
    `- W/L/U/B: ${report.summary.winnerRows}/${report.summary.lossRows}/${report.summary.unresolvedRows}/${report.summary.blockedRows}.`,
    `- Old gross one-MES P/L: ${report.summary.oldGrossOneMesPl ?? '-'}.`,
    `- Same-session gross one-MES P/L: ${report.summary.sessionGrossOneMesPl ?? '-'}.`,
    `- Delta: ${report.summary.deltaOneMesPl ?? '-'}.`,
    `- Target pocket rows: ${report.summary.targetPocketRows}; same-session P/L: ${report.summary.targetPocketSessionGrossOneMesPl ?? '-'}; W/L: ${report.summary.targetPocketWinners}/${report.summary.targetPocketLosses}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Target Pocket Groups',
    ...groupTable(report.targetPocketGroups, 12),
    '',
    '## Method Groups',
    ...groupTable(report.methodGroups, 16),
    '',
    '## Model Groups',
    ...groupTable(report.modelGroups, 8),
    '',
    '## Top Same-Session Tickets',
    '| Ticket | Date | Session | Model | Side | Outcome | Same-Session P/L | Old P/L | Entry | Stop | T1 | T2 | Risk |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|',
    ...report.topSessionTickets.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.sessionOutcomeLabel} | ${row.sessionResolvedOneMesPl ?? '-'} | ${row.oldResolvedOneMesPl ?? '-'} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.riskPoints} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport(args: {
  outcomeReportPath: string | null;
  outcomeReport: SourceReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport {
  const sourceRows = rowsFrom(args.outcomeReport);
  const rows = sourceRows.map((row) => validateRow(row, args.auditDir));
  const targetRows = rows.filter((row) => row.targetPocket);
  const oldGross = sum(rows.map((row) => row.oldResolvedOneMesPl));
  const sessionGross = sum(rows.map((row) => row.sessionResolvedOneMesPl));
  const targetGross = sum(targetRows.map((row) => row.sessionResolvedOneMesPl));
  const blockers = [
    !args.outcomeReportPath ? 'missing outcome report path' : null,
    !args.outcomeReport ? 'missing outcome report' : null,
    sourceRows.length === 0 ? 'outcome report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_session_bounded_profit_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      usesSavedScannerDecisionTapesOnly: true,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
    },
    source: {
      outcomeReportPath: args.outcomeReportPath,
      sourceReportType: args.outcomeReport?.reportType || null,
      auditDir: args.auditDir,
    },
    assumptions: {
      sameSessionOnly: true,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      oneMesPointValue: POINT_VALUE,
      outputIsResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      validationRows: rows.length,
      rowsWithSessionTape: rows.filter((row) => row.barsLoaded > 0).length,
      rowsWithBarsAfterProof: rows.filter((row) => row.barsAfterProof > 0).length,
      resolvedRows: rows.filter((row) => row.sessionOutcomeBucket === 'winner' || row.sessionOutcomeBucket === 'loss').length,
      winnerRows: rows.filter((row) => row.sessionOutcomeBucket === 'winner').length,
      lossRows: rows.filter((row) => row.sessionOutcomeBucket === 'loss').length,
      unresolvedRows: rows.filter((row) => row.sessionOutcomeBucket === 'unresolved').length,
      blockedRows: rows.filter((row) => row.sessionOutcomeBucket === 'blocked').length,
      oldGrossOneMesPl: oldGross,
      sessionGrossOneMesPl: sessionGross,
      deltaOneMesPl: oldGross === null || sessionGross === null ? null : round(sessionGross - oldGross),
      targetPocketRows: targetRows.length,
      targetPocketSessionGrossOneMesPl: targetGross,
      targetPocketWinners: targetRows.filter((row) => row.sessionOutcomeBucket === 'winner').length,
      targetPocketLosses: targetRows.filter((row) => row.sessionOutcomeBucket === 'loss').length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_missing_outcome_report'
        : (targetGross ?? 0) > 0
          ? 'promote_surviving_pockets_to_scanner_owned_proposal_research'
          : 'do_not_promote_until_session_evidence_improves',
    },
    modelGroups: groupRows(rows, (row) => row.setupType),
    methodGroups: groupRows(rows, (row) => row.methodKey),
    targetPocketGroups: groupRows(targetRows, (row) => row.methodKey),
    topSessionTickets: [...rows]
      .filter((row) => row.sessionResolvedOneMesPl !== null)
      .sort((a, b) => (b.sessionResolvedOneMesPl ?? -999999) - (a.sessionResolvedOneMesPl ?? -999999))
      .slice(0, 24),
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Provide the broad outcome report before running session-bounded validation.']
      : [
        'Treat same-session P/L as the realistic validation lens for review-ticket quality.',
        'Do not use cross-day target hits as evidence for live desk promotion.',
        'Only surviving method pockets should move to scanner-owned selector proposal research.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport(
  report: UnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-session-bounded-profit-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const outcomeReportPath = readFlag(args, '--outcome-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport({
    outcomeReportPath,
    outcomeReport: readJson<SourceReport>(outcomeReportPath),
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewSessionBoundedProfitValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
