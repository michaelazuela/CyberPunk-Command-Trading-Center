import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';

interface TriageRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  firstSeenTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  sourceFile: string;
  triageDecision: string;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ReplayRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  triageDecision: string;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: OutcomeLabel;
  resolvedOneMesPl: number | null;
  entryHitTime: string | null;
  blockers: string[];
}

interface CapRow {
  filterId: string;
  setupType: string;
  riskCapPoints: number;
  evaluatedRows: number;
  keptRows: number;
  rejectedRows: number;
  keptWinners: number;
  rejectedWinners: number;
  keptLosses: number;
  rejectedLosses: number;
  keptUnresolved: number;
  rejectedUnresolved: number;
  keptOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  falseRejectWinnerRows: number;
  decision: 'candidate_for_more_research' | 'rejected_for_now';
}

export interface UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport {
  reportType: 'unified_positive_held_local_preview_broad_risk_cap_validation';
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
    reportDir: string;
    intakeTriagePath: string | null;
    auditDir: string;
  };
  assumptions: {
    usesCompletedFiveMinuteBarsOnly: true;
    usesIntakeTriageRowsOnly: true;
    missingBarsAreNotInvented: true;
    capsAreResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    evaluatedTargetRows: number;
    replayedRows: number;
    blockedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    candidateCapRows: number;
    livePromotionAllowedRows: 0;
  };
  capRows: CapRow[];
  rows: ReplayRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const POINT_VALUE = 5;
const TARGET_CAPS = [
  { setupType: 'IntradayMssMicroContinuation', riskCapPoints: 7 },
  { setupType: 'raidReclaim', riskCapPoints: 10 },
];

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

function authority(): UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport['authority'] {
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
  return { time, open, high, low, close };
}

function timeMs(value: string): number {
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

function loadTapeBars(auditDir: string, sourceFile: string): OhlcBar[] {
  const filePath = path.isAbsolute(sourceFile) ? sourceFile : path.join(auditDir, sourceFile);
  if (!fs.existsSync(filePath)) return [];
  const tape = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function crosses(row: Pick<TriageRow, 'direction'>, bar: OhlcBar, level: number): boolean {
  return row.direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(row: Pick<TriageRow, 'direction'>, bar: OhlcBar, stop: number): boolean {
  return row.direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function replayRow(row: TriageRow, auditDir: string): ReplayRow {
  const bars = loadTapeBars(auditDir, row.sourceFile);
  const proofTime = normalizeTime(row.firstSeenTime) || row.firstSeenTime;
  const riskPoints = round(Math.abs(row.entry - row.stop));
  const blockers = [
    bars.length === 0 ? 'missing local completed 5M tape bars' : null,
    riskPoints <= 0 ? 'missing positive risk' : null,
  ].filter((item): item is string => Boolean(item));
  if (blockers.length) {
    return {
      rowId: row.intakeId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      triageDecision: row.triageDecision,
      riskPoints,
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers,
    };
  }
  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryIndex = eligibleBars.findIndex((bar) => crosses(row, bar, row.entry));
  if (entryIndex < 0) {
    return {
      rowId: row.intakeId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      triageDecision: row.triageDecision,
      riskPoints,
      outcomeBucket: 'unresolved',
      outcomeLabel: 'no_fill',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers: [],
    };
  }
  const replayBars = eligibleBars.slice(entryIndex + 1);
  let stopTime: string | null = null;
  let t1Time: string | null = null;
  let t2Time: string | null = null;
  for (const bar of replayBars) {
    if (!stopTime && hitsStop(row, bar, row.stop)) stopTime = bar.time;
    if (!t1Time && crosses(row, bar, row.target1)) t1Time = bar.time;
    if (!t2Time && crosses(row, bar, row.target2)) t2Time = bar.time;
  }
  const stoppedFirst = Boolean(stopTime && (!t1Time || timeMs(stopTime) <= timeMs(t1Time)));
  const outcomeLabel: OutcomeLabel = stoppedFirst
    ? 'stopped_before_t1'
    : t2Time
      ? 't1_and_t2_hit'
      : t1Time
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = outcomeLabel === 'stopped_before_t1'
    ? row.stop
    : outcomeLabel === 't1_and_t2_hit'
      ? row.target2
      : outcomeLabel === 't1_hit_only'
        ? row.target1
        : null;
  return {
    rowId: row.intakeId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    triageDecision: row.triageDecision,
    riskPoints,
    outcomeBucket: exit === null ? 'unresolved' : outcomeLabel === 'stopped_before_t1' ? 'loss' : 'winner',
    outcomeLabel,
    resolvedOneMesPl: exit === null ? null : pointsToPl(row.direction, row.entry, exit),
    entryHitTime: eligibleBars[entryIndex].time,
    blockers: [],
  };
}

function capRow(setupType: string, riskCapPoints: number, rows: ReplayRow[]): CapRow {
  const target = rows.filter((row) => row.setupType === setupType);
  const kept = target.filter((row) => row.riskPoints <= riskCapPoints);
  const rejected = target.filter((row) => row.riskPoints > riskCapPoints);
  const rejectedWinners = rejected.filter((row) => row.outcomeBucket === 'winner').length;
  const rejectedLosses = rejected.filter((row) => row.outcomeBucket === 'loss').length;
  return {
    filterId: `${setupType}_risk_lte_${riskCapPoints}`,
    setupType,
    riskCapPoints,
    evaluatedRows: target.length,
    keptRows: kept.length,
    rejectedRows: rejected.length,
    keptWinners: kept.filter((row) => row.outcomeBucket === 'winner').length,
    rejectedWinners,
    keptLosses: kept.filter((row) => row.outcomeBucket === 'loss').length,
    rejectedLosses,
    keptUnresolved: kept.filter((row) => row.outcomeBucket === 'unresolved').length,
    rejectedUnresolved: rejected.filter((row) => row.outcomeBucket === 'unresolved').length,
    keptOneMesPl: sum(kept.map((row) => row.resolvedOneMesPl)),
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    falseRejectWinnerRows: rejectedWinners,
    decision: rejectedLosses > 0 && rejectedWinners === 0 ? 'candidate_for_more_research' : 'rejected_for_now',
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Broad Risk-Cap Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only broad risk-cap validation. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Evaluated target rows: ${report.summary.evaluatedTargetRows}.`,
    `- Replayed rows: ${report.summary.replayedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Winners: ${report.summary.winners}.`,
    `- Losses: ${report.summary.losses}.`,
    `- Unresolved: ${report.summary.unresolved}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- Candidate cap rows: ${report.summary.candidateCapRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Cap Rows',
    '| Filter | Evaluated | Kept | Rejected | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | False-Reject Winners | Decision |',
    '|---|---:|---:|---:|---|---|---:|---:|---:|---|',
    ...report.capRows.map((row) => `| ${row.filterId} | ${row.evaluatedRows} | ${row.keptRows} | ${row.rejectedRows} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.falseRejectWinnerRows} | ${row.decision} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport(args: {
  reportDir: string;
  intakeTriagePath: string | null;
  intakeTriageReport: Record<string, unknown> | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport {
  const triageRows = Array.isArray(args.intakeTriageReport?.rows) ? args.intakeTriageReport.rows as TriageRow[] : [];
  const targetRows = triageRows.filter((row) => TARGET_CAPS.some((cap) => cap.setupType === row.setupType) && row.triageDecision !== 'already_processed_reference');
  const rows = targetRows.map((row) => replayRow(row, args.auditDir));
  const capRows = TARGET_CAPS.map((cap) => capRow(cap.setupType, cap.riskCapPoints, rows));
  const blockers = [
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    targetRows.length === 0 ? 'no IntradayMssMicroContinuation or raidReclaim target rows found' : null,
    rows.filter((row) => row.outcomeBucket === 'blocked').length > 0 ? 'one or more target rows could not be replayed from local tape' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_broad_risk_cap_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      intakeTriagePath: args.intakeTriagePath,
      auditDir: args.auditDir,
    },
    assumptions: {
      usesCompletedFiveMinuteBarsOnly: true,
      usesIntakeTriageRowsOnly: true,
      missingBarsAreNotInvented: true,
      capsAreResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      evaluatedTargetRows: targetRows.length,
      replayedRows: rows.length,
      blockedRows: rows.filter((row) => row.outcomeBucket === 'blocked').length,
      winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
      losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      candidateCapRows: capRows.filter((row) => row.decision === 'candidate_for_more_research').length,
      livePromotionAllowedRows: 0,
    },
    capRows,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use broad risk-cap validation until all target rows replay from local completed 5M tape.']
      : [
        'Use candidate caps as broader research evidence only; do not install live scanner/ranking behavior from this report.',
        'False-reject winner count must be reviewed before any scanner-visible risk-cap change.',
        'No live promotion, Supabase write, Discord post, canExecute change, model removal, or bridge change is recommended.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport(
  report: UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-broad-risk-cap-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport({
    reportDir: outDir,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? JSON.parse(fs.readFileSync(intakeTriagePath, 'utf8')) as Record<string, unknown>
      : null,
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewBroadRiskCapValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
