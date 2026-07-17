import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';

interface TriageRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  firstSeenTime: string;
  lastSeenTime: string;
  occurrences: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  proofState: string;
  triageScore: number;
  triageDecision: string;
  triageReason: string;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ReplayPackageRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  firstSeenTime: string;
  lastSeenTime: string;
  occurrences: number;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  t1R: number | null;
  t2R: number | null;
  proofState: string;
  triageScore: number;
  sourceTapePath: string;
  barsSource: 'scanner_decision_tape_completed_5m' | 'missing';
  barsLoaded: number;
  barsAfterProof: number;
  firstBarTime: string | null;
  lastBarTime: string | null;
  outcomeInputStatus: 'ready_for_read_only_outcome_replay' | 'blocked';
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  reportType: 'unified_positive_held_local_preview_replay_package';
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
    triageReportPath: string | null;
    auditDir: string;
  };
  assumptions: {
    selectedRowsComeFromReadOnlyTriage: true;
    usesScannerDecisionTapeCompleted5mOnly: true;
    missingBarsAreNotInvented: true;
    outcomeIsNotCalculatedInThisStep: true;
    livePromotionAllowed: false;
  };
  summary: {
    selectedRowsRead: number;
    replayPackageRows: number;
    readyRows: number;
    blockedRows: number;
    modelGroups: number;
    sessionGroups: number;
    livePromotionAllowedRows: 0;
  };
  rows: ReplayPackageRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');

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

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageReport['authority'] {
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

function selectedRows(report: Record<string, unknown> | null): TriageRow[] {
  return report && Array.isArray(report.selectedReplayPackage)
    ? report.selectedReplayPackage as TriageRow[]
    : [];
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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function levelR(args: { direction: Direction; entry: number; stop: number; target: number }): number | null {
  const risk = Math.abs(args.entry - args.stop);
  if (risk <= 0) return null;
  return args.direction === 'LONG'
    ? round((args.target - args.entry) / risk)
    : round((args.entry - args.target) / risk);
}

function tapePath(auditDir: string, row: Pick<TriageRow, 'tradeDate' | 'instrument' | 'session'>): string {
  return path.join(auditDir, `scanner-decision-tape-${row.tradeDate}-${row.instrument}-${row.session}.json`);
}

function loadDecisionTapeBars(sourceTapePath: string): OhlcBar[] {
  if (!fs.existsSync(sourceTapePath)) return [];
  const tape = readJson(sourceTapePath);
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function buildRow(row: TriageRow, auditDir: string): ReplayPackageRow {
  const sourceTapePath = tapePath(auditDir, row);
  const bars = loadDecisionTapeBars(sourceTapePath);
  const proofTime = normalizeTime(row.firstSeenTime) || row.firstSeenTime;
  const barsAfterProof = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length;
  const riskPoints = round(Math.abs(row.entry - row.stop));
  const blockers = [
    row.triageDecision !== 'selected_for_replay_package' ? `triage decision ${row.triageDecision}` : null,
    !Number.isFinite(row.entry) ? 'missing entry' : null,
    !Number.isFinite(row.stop) ? 'missing stop' : null,
    !Number.isFinite(row.target1) ? 'missing T1' : null,
    !Number.isFinite(row.target2) ? 'missing T2' : null,
    riskPoints <= 0 ? 'missing positive entry-to-stop risk' : null,
    !fs.existsSync(sourceTapePath) ? 'missing scanner decision tape' : null,
    bars.length === 0 ? 'missing completed 5M bars from scanner decision tape' : null,
    barsAfterProof === 0 ? 'missing completed 5M bars at or after proof time' : null,
  ].filter((item): item is string => Boolean(item));
  return {
    ticketId: row.intakeId,
    tradeDate: row.tradeDate,
    session: row.session,
    instrument: row.instrument,
    setupType: row.setupType,
    direction: row.direction,
    proofTime,
    firstSeenTime: row.firstSeenTime,
    lastSeenTime: row.lastSeenTime,
    occurrences: row.occurrences,
    entry: row.entry,
    stop: row.stop,
    t1: row.target1,
    t2: row.target2,
    riskPoints,
    t1R: levelR({ direction: row.direction, entry: row.entry, stop: row.stop, target: row.target1 }),
    t2R: levelR({ direction: row.direction, entry: row.entry, stop: row.stop, target: row.target2 }),
    proofState: row.proofState,
    triageScore: row.triageScore,
    sourceTapePath,
    barsSource: bars.length ? 'scanner_decision_tape_completed_5m' : 'missing',
    barsLoaded: bars.length,
    barsAfterProof,
    firstBarTime: bars[0]?.time || null,
    lastBarTime: bars[bars.length - 1]?.time || null,
    outcomeInputStatus: blockers.length ? 'blocked' : 'ready_for_read_only_outcome_replay',
    blockers,
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay package. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Selected rows read: ${report.summary.selectedRowsRead}.`,
    `- Replay package rows: ${report.summary.replayPackageRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Model groups: ${report.summary.modelGroups}.`,
    `- Session groups: ${report.summary.sessionGroups}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Session | Side | Proof | Entry | Stop | T1 | T2 | Risk | T1R | T2R | Bars After Proof | Status |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.setupType} | ${row.session} | ${row.direction} | ${row.proofState} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.riskPoints} | ${row.t1R ?? '-'} | ${row.t2R ?? '-'} | ${row.barsAfterProof} | ${row.outcomeInputStatus} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReplayPackageReport(args: {
  reportDir: string;
  triageReportPath: string | null;
  triageReport: Record<string, unknown> | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  const selected = selectedRows(args.triageReport);
  const rows = selected.map((row) => buildRow(row, args.auditDir));
  const blockers = [
    !args.triageReportPath ? 'missing intake triage report path' : null,
    !args.triageReport ? 'missing intake triage report' : null,
    selected.length === 0 ? 'intake triage report has no selected replay package rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      triageReportPath: args.triageReportPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: selected.length,
      replayPackageRows: rows.length,
      readyRows: rows.filter((row) => row.outcomeInputStatus === 'ready_for_read_only_outcome_replay').length,
      blockedRows: rows.filter((row) => row.outcomeInputStatus === 'blocked').length,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run outcome replay until the package blockers are cleared with local completed 5M evidence.']
      : ['Run a read-only OHLC outcome pass over this package; keep results research-only until source/proof validation passes.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReplayPackageReport(
  report: UnifiedPositiveHeldLocalPreviewReplayPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReplayPackageCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const triageReportPath = readFlag(args, '--triage-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageReport({
    reportDir: outDir,
    triageReportPath,
    triageReport: triageReportPath && fs.existsSync(triageReportPath) ? readJson(triageReportPath) : null,
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReplayPackageReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewReplayPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
