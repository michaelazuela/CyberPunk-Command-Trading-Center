import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-replay-package';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  missingReplayPackage: string;
  auditDir: string;
  limit: number | null;
  readyOnly: boolean;
  outDir: string;
  json: boolean;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandidateRecord {
  setupType?: string;
  direction?: string;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  riskPoints?: number | null;
  executionStatus?: string | null;
  detectedStatus?: string | null;
  blockReason?: string | null;
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
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const missingReplayPackage = readFlag(args, '--missing-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-replay-package-\d+\.json$/);
  const limitRaw = readFlag(args, '--limit');
  const limit = limitRaw === null ? null : Number(limitRaw);
  if (!missingReplayPackage) throw new Error('--missing-replay-package is required.');
  if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) throw new Error('--limit must be a positive integer.');
  return {
    missingReplayPackage: path.resolve(missingReplayPackage),
    auditDir: path.resolve(readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR),
    limit,
    readyOnly: args.includes('--ready-only'),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
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

function hasDirectionallyValidEntryStop(args: { direction: Direction; entry: number; stop: number }): boolean {
  return args.direction === 'LONG' ? args.stop < args.entry : args.stop > args.entry;
}

function positiveLevel(value: number | null): boolean {
  return value !== null && value > 0;
}

function levelR(args: { direction: Direction; entry: number; stop: number; target: number }): number | null {
  const risk = Math.abs(args.entry - args.stop);
  if (risk <= 0) return null;
  return args.direction === 'LONG'
    ? round((args.target - args.entry) / risk)
    : round((args.entry - args.target) / risk);
}

function snapshotPath(auditDir: string, snapshotId: string): string {
  return path.join(auditDir, `${snapshotId}.json`);
}

function tapePath(auditDir: string, row: { tradeDate: string; sessionType: string }): string {
  return path.join(auditDir, `scanner-decision-tape-${row.tradeDate}-MES-${row.sessionType}.json`);
}

function loadDecisionTapeBars(sourceTapePath: string): OhlcBar[] {
  if (!fs.existsSync(sourceTapePath)) return [];
  const tape = readJson<Record<string, unknown>>(sourceTapePath);
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function candidatesFromSnapshot(file: string): CandidateRecord[] {
  if (!fs.existsSync(file)) return [];
  const root = asRecord(readJson<unknown>(file));
  const normalizedPlan = asRecord(root.normalizedPlan);
  return Array.isArray(normalizedPlan.setupCandidates) ? normalizedPlan.setupCandidates as CandidateRecord[] : [];
}

function completedBarTimeFromSnapshot(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  const root = asRecord(readJson<unknown>(file));
  const completed5m = asRecord(root.completed5m);
  return normalizeTime(completed5m.time ?? root.completedBarTime);
}

function candidateMatches(candidate: CandidateRecord, expected: { setupType: string; direction: string }): boolean {
  return candidate.setupType === expected.setupType && candidate.direction === expected.direction;
}

function finiteCandidate(candidate: CandidateRecord): candidate is CandidateRecord & {
  entry: number;
  stop: number;
  target1: number;
  target2: number;
} {
  return Number.isFinite(candidate.entry) &&
    Number.isFinite(candidate.stop) &&
    Number.isFinite(candidate.target1) &&
    Number.isFinite(candidate.target2);
}

function scoreCandidate(candidate: CandidateRecord, direction: Direction | null): number {
  if (!finiteCandidate(candidate)) return 0;
  if (candidate.entry <= 0 || candidate.stop <= 0 || candidate.target1 <= 0 || candidate.target2 <= 0) return 0;
  const riskPoints = Math.abs(candidate.entry - candidate.stop);
  const directionallyValid = direction
    ? hasDirectionallyValidEntryStop({ direction, entry: candidate.entry, stop: candidate.stop })
    : false;
  return (riskPoints > 0 ? 1 : 0) + (directionallyValid ? 2 : 0);
}

function buildReplayPackageRow(args: {
  packageRow: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport['rows'][number];
  auditDir: string;
}): UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number] {
  const sourceTapePath = tapePath(args.auditDir, args.packageRow);
  const bars = loadDecisionTapeBars(sourceTapePath);
  let selectedSnapshotId: string | null = null;
  let selectedCandidate: CandidateRecord | null = null;
  const direction = args.packageRow.direction === 'LONG' || args.packageRow.direction === 'SHORT'
    ? args.packageRow.direction
    : null;
  for (const snapshotId of args.packageRow.sampleSnapshotIds) {
    const matchingCandidates = candidatesFromSnapshot(snapshotPath(args.auditDir, snapshotId))
      .filter((item) => candidateMatches(item, args.packageRow))
      .sort((a, b) => scoreCandidate(b, direction) - scoreCandidate(a, direction));
    const candidate = matchingCandidates[0] || null;
    if (candidate && (!selectedCandidate || scoreCandidate(candidate, direction) > scoreCandidate(selectedCandidate, direction))) {
      selectedSnapshotId = snapshotId;
      selectedCandidate = candidate;
      if (scoreCandidate(candidate, direction) >= 3) break;
    }
  }
  const completedBarTime = selectedSnapshotId ? completedBarTimeFromSnapshot(snapshotPath(args.auditDir, selectedSnapshotId)) : null;
  const proofTime = completedBarTime || args.packageRow.tradeDate;
  const entry = numberOrNull(selectedCandidate?.entry);
  const stop = numberOrNull(selectedCandidate?.stop);
  const t1 = numberOrNull(selectedCandidate?.target1);
  const t2 = numberOrNull(selectedCandidate?.target2);
  const riskPoints = entry !== null && stop !== null ? round(Math.abs(entry - stop)) : 0;
  const barsAfterProof = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length;
  const blockers = [
    !selectedSnapshotId ? 'no sample snapshot contained matching setup/direction candidate' : null,
    !selectedCandidate ? 'missing matching candidate' : null,
    !direction ? 'unsupported direction' : null,
    entry === null ? 'missing entry' : null,
    stop === null ? 'missing stop' : null,
    t1 === null ? 'missing T1' : null,
    t2 === null ? 'missing T2' : null,
    !positiveLevel(entry) ? 'nonpositive entry placeholder' : null,
    !positiveLevel(stop) ? 'nonpositive stop placeholder' : null,
    !positiveLevel(t1) ? 'nonpositive T1 placeholder' : null,
    !positiveLevel(t2) ? 'nonpositive T2 placeholder' : null,
    riskPoints <= 0 ? 'missing positive entry-to-stop risk' : null,
    direction && entry !== null && stop !== null && !hasDirectionallyValidEntryStop({ direction, entry, stop })
      ? 'directionally invalid entry-to-stop geometry'
      : null,
    !fs.existsSync(sourceTapePath) ? 'missing scanner decision tape' : null,
    bars.length === 0 ? 'missing completed 5M bars from scanner decision tape' : null,
    barsAfterProof === 0 ? 'missing completed 5M bars at or after proof time' : null,
  ].filter((item): item is string => Boolean(item));
  const safeDirection = direction || 'LONG';
  return {
    ticketId: `${args.packageRow.replayQueueKey}|${selectedSnapshotId || 'missing-snapshot'}`,
    tradeDate: args.packageRow.tradeDate,
    session: args.packageRow.sessionType,
    instrument: 'MES',
    setupType: args.packageRow.setupType,
    direction: safeDirection,
    proofTime,
    firstSeenTime: proofTime,
    lastSeenTime: proofTime,
    occurrences: args.packageRow.shadowRows,
    entry: entry ?? NaN,
    stop: stop ?? NaN,
    t1: t1 ?? NaN,
    t2: t2 ?? NaN,
    riskPoints,
    t1R: entry !== null && stop !== null && t1 !== null && direction
      ? levelR({ direction, entry, stop, target: t1 })
      : null,
    t2R: entry !== null && stop !== null && t2 !== null && direction
      ? levelR({ direction, entry, stop, target: t2 })
      : null,
    proofState: `strict_missing_shadow:${args.packageRow.selectorDecision}`,
    triageScore: args.packageRow.shadowRows + args.packageRow.wouldChangePrimaryRows,
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Missing Strict Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only strict replay package. It consumes saved package rows, saved scanner snapshots, and saved scanner decision tapes only. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selected rows read: ${report.summary.selectedRowsRead}.`,
    `- Replay package rows: ${report.summary.replayPackageRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Directionally invalid geometry rows: ${report.summary.directionallyInvalidGeometryRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Session | Side | Entry | Stop | T1 | T2 | Bars After Proof | Status | Blockers |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.setupType} | ${row.session} | ${row.direction} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.barsAfterProof} | ${row.outcomeInputStatus} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport(args: {
  missingReplayPackagePath: string | null;
  missingReplayPackage: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport | null;
  auditDir: string;
  limit: number | null;
  readyOnly?: boolean;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  const selected = (args.missingReplayPackage?.rows || []).slice(0, args.limit || undefined);
  const allRows = selected.map((row) => buildReplayPackageRow({ packageRow: row, auditDir: args.auditDir }));
  const rows = args.readyOnly
    ? allRows.filter((row) => row.outcomeInputStatus === 'ready_for_read_only_outcome_replay')
    : allRows;
  const skippedBlockedRows = allRows.length - rows.length;
  const blockers = [
    !args.missingReplayPackagePath ? 'missing replay package path' : null,
    !args.missingReplayPackage ? 'missing replay package report' : null,
    args.missingReplayPackage && args.missingReplayPackage.status !== 'pass' ? `missing replay package status ${args.missingReplayPackage.status}` : null,
    selected.length === 0 ? 'missing replay package has no rows' : null,
    ...(args.readyOnly ? [] : rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`))),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      triageReportPath: args.missingReplayPackagePath,
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
      directionallyInvalidGeometryRows: rows.filter((row) => row.blockers.includes('directionally invalid entry-to-stop geometry')).length,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run outcome replay for blocked rows until strict package blockers are cleared.']
      : args.readyOnly && skippedBlockedRows > 0
        ? [`Run the existing read-only replay-package outcome tool against these ${rows.length} strict-ready rows; keep ${skippedBlockedRows} blocked rows in the full audit report.`]
        : ['Run the existing read-only replay-package outcome tool against this strict package.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport(
  report: UnifiedPositiveHeldLocalPreviewReplayPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport({
    missingReplayPackagePath: options.missingReplayPackage,
    missingReplayPackage: fs.existsSync(options.missingReplayPackage)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport>(options.missingReplayPackage)
      : null,
    auditDir: options.auditDir,
    limit: options.limit,
    readyOnly: options.readyOnly,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
