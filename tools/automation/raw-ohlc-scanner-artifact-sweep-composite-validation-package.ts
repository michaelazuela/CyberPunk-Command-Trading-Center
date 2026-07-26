import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepSnapshotFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-snapshot-field-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  snapshotMinerReport: string;
  scannerArtifacts: string[];
  minRows: number;
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

interface CandidateShape {
  setupType?: string;
  direction?: string;
  detectedStatus?: string;
  executionStatus?: string;
  blockReason?: string | null;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  confidence?: string;
  rankScore?: number;
  targetRoom?: {
    targetRoomStatus?: string;
  };
  evidence?: string[];
  missingEvidence?: string[];
  activeRuleset?: {
    htfLineInSand?: {
      status?: string;
      obstacleType?: string | null;
      obstacleSource?: string | null;
    };
  };
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  completed5m?: OhlcBar;
  setupCandidateStatus?: {
    statuses?: CandidateShape[];
  };
}

interface ArtifactShape {
  reportType?: string;
  instrument?: string;
  events?: Record<string, ArtifactEventShape>;
}

interface SegmentSelector {
  kind: string;
  key: string;
}

interface SelectedMetadata {
  matchedSegmentKind: string;
  matchedSegmentKey: string;
  selectorSource: 'zero_loss_transfer_segment';
}

type ValidationPackageRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number] & {
  sweepCompositeValidation?: SelectedMetadata;
};

export interface RawOhlcScannerArtifactSweepCompositeValidationPackageReport extends Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'rows' | 'reportType'> {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_validation_package';
  rows: ValidationPackageRow[];
  source: UnifiedPositiveHeldLocalPreviewReplayPackageReport['source'] & {
    snapshotMinerReportPath: string;
    scannerArtifactPaths: string[];
    minRows: number;
  };
  summary: UnifiedPositiveHeldLocalPreviewReplayPackageReport['summary'] & {
    selectorSegments: number;
    selectedTicketIds: number;
    duplicateMatchesSkipped: number;
    incompleteMatchesSkipped: number;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP_TYPE = 'NoInstalledSetup';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function parseRawOhlcScannerArtifactSweepCompositeValidationPackageArgs(args = process.argv.slice(2)): CliOptions {
  const snapshotMinerReport = readFlag(args, '--snapshot-miner-report');
  if (!snapshotMinerReport) throw new Error('--snapshot-miner-report is required.');
  const minRows = Number(readFlag(args, '--min-rows') || 1);
  return {
    snapshotMinerReport,
    scannerArtifacts: splitPaths(readFlag(args, '--scanner-artifacts')),
    minRows: Number.isFinite(minRows) && minRows > 0 ? minRows : 1,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function validDirection(value: unknown): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function hasDirectionallyValidEntryStop(direction: Direction, entry: number, stop: number): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function levelR(args: { direction: Direction; entry: number; stop: number; target: number }): number | null {
  const risk = Math.abs(args.entry - args.stop);
  if (risk <= 0) return null;
  return args.direction === 'LONG'
    ? round((args.target - args.entry) / risk)
    : round((args.entry - args.target) / risk);
}

function eventTime(eventKey: string, event: ArtifactEventShape): string {
  return normalizeTime(event.eventTime) || normalizeTime(eventKey) || eventKey;
}

function completedEventTimes(artifact: ArtifactShape): string[] {
  return Object.entries(artifact.events || {})
    .filter(([, event]) => Boolean(event.completed5m))
    .map(([eventKey, event]) => eventTime(eventKey, event))
    .sort((a, b) => timeMs(a) - timeMs(b));
}

function ticketId(event: ArtifactEventShape, candidate: CandidateShape, proofTime: string): string {
  return [
    event.date || proofTime.slice(0, 10),
    event.session || 'unknown',
    candidate.setupType || 'UnknownSetup',
    candidate.direction || 'UNKNOWN',
    proofTime.replace(/[^0-9T]/g, '').slice(0, 15),
  ].join('-');
}

function candleDirection(bar: OhlcBar): string {
  if (bar.close > bar.open) return 'bullish_close';
  if (bar.close < bar.open) return 'bearish_close';
  return 'doji_close';
}

function candleCloseLocation(bar: OhlcBar): string {
  const range = Math.max(bar.high - bar.low, 0);
  if (range <= 0) return 'close_location_unknown';
  const location = (bar.close - bar.low) / range;
  if (location >= 0.75) return 'close_upper_quartile';
  if (location <= 0.25) return 'close_lower_quartile';
  return 'close_middle_half';
}

function rankBucket(value: unknown): string {
  const rank = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(rank)) return 'rank_unknown';
  if (rank < 120) return 'rank_lt_120';
  if (rank < 180) return 'rank_120_to_179';
  if (rank < 240) return 'rank_180_to_239';
  return 'rank_gte_240';
}

function missingTagList(values: string[] | undefined): string[] {
  const text = (values || []).join(' | ').toLowerCase();
  return [
    text.includes('opposing completed 5m') ? 'opposing_5m_mss' : null,
    text.includes('no chase') ? 'no_chase_line_in_sand' : null,
    text.includes('nearest obstacle sits before') ? 'obstacle_before_1r' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function candidateSegments(event: ArtifactEventShape, candidate: CandidateShape, bar: OhlcBar): SegmentSelector[] {
  const sessionDirection = `${event.session || 'unknown'}|${candidate.direction}`;
  const candleShape = `${candleDirection(bar)}|${candleCloseLocation(bar)}`;
  const htfLineStatus = candidate.activeRuleset?.htfLineInSand?.status || 'htf_line_unknown';
  const htfLineObstacle = `${candidate.activeRuleset?.htfLineInSand?.obstacleSource || 'obstacle_source_unknown'}:${candidate.activeRuleset?.htfLineInSand?.obstacleType || 'obstacle_type_unknown'}`;
  const htfLine = `${htfLineStatus}|${htfLineObstacle}`;
  return [
    { kind: 'session_direction_candle_rank', key: `${sessionDirection}|${candleShape}|${rankBucket(candidate.rankScore)}` },
    ...missingTagList(candidate.missingEvidence).map((tag) => ({
      kind: 'session_direction_htf_line_missing',
      key: `${sessionDirection}|${htfLine}|${tag}`,
    })),
  ];
}

function selectorSet(report: RawOhlcScannerArtifactSweepSnapshotFieldMinerReport): Set<string> {
  return new Set((report.zeroLossTransferSegments || []).map((segment) => `${segment.kind}:${segment.key}`));
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

function buildRows(args: {
  artifactPath: string;
  artifact: ArtifactShape;
  selectors: Set<string>;
  seen: Set<string>;
}): { rows: ValidationPackageRow[]; duplicateMatchesSkipped: number; incompleteMatchesSkipped: number } {
  const rows: ValidationPackageRow[] = [];
  let duplicateMatchesSkipped = 0;
  let incompleteMatchesSkipped = 0;
  const eventTimes = completedEventTimes(args.artifact);
  for (const [eventKey, event] of Object.entries(args.artifact.events || {})) {
    const proofTime = eventTime(eventKey, event);
    const bar = event.completed5m;
    if (!bar) continue;
    for (const candidate of event.setupCandidateStatus?.statuses || []) {
      const direction = validDirection(candidate.direction);
      if (candidate.setupType !== SETUP_TYPE || !direction) continue;
      const matched = candidateSegments(event, candidate, bar)
        .find((segment) => args.selectors.has(`${segment.kind}:${segment.key}`));
      if (!matched) continue;
      const id = ticketId(event, candidate, proofTime);
      if (args.seen.has(id)) {
        duplicateMatchesSkipped += 1;
        continue;
      }
      args.seen.add(id);
      const entry = numberOrNull(candidate.entry);
      const stop = numberOrNull(candidate.stop);
      const t1 = numberOrNull(candidate.target1);
      const t2 = numberOrNull(candidate.target2);
      const invalidGeometry = entry !== null && stop !== null && !hasDirectionallyValidEntryStop(direction, entry, stop);
      const barsAfterProof = eventTimes.filter((time) => timeMs(time) >= timeMs(proofTime)).length;
      const blockers = [
        entry === null ? 'missing entry' : null,
        stop === null ? 'missing stop' : null,
        t1 === null ? 'missing T1' : null,
        t2 === null ? 'missing T2' : null,
        invalidGeometry ? 'directionally invalid entry-to-stop geometry' : null,
        barsAfterProof <= 0 ? 'missing completed 5M bars at or after proof time' : null,
      ].filter((item): item is string => Boolean(item));
      const riskPoints = entry !== null && stop !== null ? round(Math.abs(entry - stop)) : 0;
      if (blockers.length) {
        incompleteMatchesSkipped += 1;
        continue;
      }
      rows.push({
        ticketId: id,
        tradeDate: event.date || proofTime.slice(0, 10),
        session: event.session || 'unknown',
        instrument: args.artifact.instrument || 'MES',
        setupType: SETUP_TYPE,
        direction,
        proofTime,
        firstSeenTime: proofTime,
        lastSeenTime: proofTime,
        occurrences: 1,
        entry: entry ?? 0,
        stop: stop ?? 0,
        t1: t1 ?? 0,
        t2: t2 ?? 0,
        riskPoints,
        t1R: entry !== null && stop !== null && t1 !== null ? levelR({ direction, entry, stop, target: t1 }) : null,
        t2R: entry !== null && stop !== null && t2 !== null ? levelR({ direction, entry, stop, target: t2 }) : null,
        proofState: `${candidate.detectedStatus || 'unknown'}:${candidate.executionStatus || 'unknown'}:${candidate.blockReason || 'none'}`,
        triageScore: 0,
        sourceTapePath: args.artifactPath,
        barsSource: 'scanner_decision_tape_completed_5m',
        barsLoaded: eventTimes.length,
        barsAfterProof,
        firstBarTime: eventTimes[0] || null,
        lastBarTime: eventTimes[eventTimes.length - 1] || null,
        outcomeInputStatus: 'ready_for_read_only_outcome_replay',
        blockers: [],
        sweepCompositeValidation: {
          matchedSegmentKind: matched.kind,
          matchedSegmentKey: matched.key,
          selectorSource: 'zero_loss_transfer_segment',
        },
      });
    }
  }
  return { rows, duplicateMatchesSkipped, incompleteMatchesSkipped };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeValidationPackageReport, 'markdown'>): string {
  const segments = new Map<string, number>();
  for (const row of report.rows) {
    const key = `${row.sweepCompositeValidation?.matchedSegmentKind}:${row.sweepCompositeValidation?.matchedSegmentKey}`;
    segments.set(key, (segments.get(key) || 0) + 1);
  }
  return [
    '# Raw-OHLC Sweep Composite Validation Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation package built from saved scanner artifacts and a saved snapshot-miner report. It does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selector segments: ${report.summary.selectorSegments}.`,
    `- Selected ticket IDs: ${report.summary.selectedTicketIds}.`,
    `- Replay package rows: ${report.summary.replayPackageRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Duplicate matches skipped: ${report.summary.duplicateMatchesSkipped}.`,
    `- Incomplete matches skipped: ${report.summary.incompleteMatchesSkipped}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Selected Segments',
    ...[...segments.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => `- ${key}: ${count}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeValidationPackageReport(args: {
  reportDir: string;
  snapshotMinerReportPath: string;
  snapshotMinerReport: RawOhlcScannerArtifactSweepSnapshotFieldMinerReport | null;
  scannerArtifactPaths: string[];
  scannerArtifacts: ArtifactShape[];
  minRows: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeValidationPackageReport {
  const selectors = args.snapshotMinerReport ? selectorSet(args.snapshotMinerReport) : new Set<string>();
  const seen = new Set<string>();
  const built = args.scannerArtifacts.map((artifact, index) => buildRows({
    artifactPath: args.scannerArtifactPaths[index] || `artifact-${index}.json`,
    artifact,
    selectors,
    seen,
  }));
  const rows = built.flatMap((item) => item.rows)
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.setupType}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.setupType}-${b.direction}`));
  const duplicateMatchesSkipped = built.reduce((total, item) => total + item.duplicateMatchesSkipped, 0);
  const incompleteMatchesSkipped = built.reduce((total, item) => total + item.incompleteMatchesSkipped, 0);
  const blockers = [
    !args.snapshotMinerReport ? 'missing snapshot miner report' : null,
    args.snapshotMinerReport && args.snapshotMinerReport.status !== 'pass' ? `snapshot miner report status ${args.snapshotMinerReport.status}` : null,
    selectors.size === 0 ? 'snapshot miner report has no zero-loss transfer segments' : null,
    args.scannerArtifacts.length === 0 ? 'missing scanner artifacts' : null,
    rows.length < args.minRows ? `selected rows ${rows.length} below minimum ${args.minRows}` : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeValidationPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_validation_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      triageReportPath: args.snapshotMinerReportPath,
      auditDir: args.reportDir,
      snapshotMinerReportPath: args.snapshotMinerReportPath,
      scannerArtifactPaths: args.scannerArtifactPaths,
      minRows: args.minRows,
    },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: rows.length,
      replayPackageRows: rows.length,
      readyRows: rows.filter((row) => row.outcomeInputStatus === 'ready_for_read_only_outcome_replay').length,
      blockedRows: rows.filter((row) => row.outcomeInputStatus === 'blocked').length,
      directionallyInvalidGeometryRows: rows.filter((row) => row.blockers.includes('directionally invalid entry-to-stop geometry')).length,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
      selectorSegments: selectors.size,
      selectedTicketIds: seen.size,
      duplicateMatchesSkipped,
      incompleteMatchesSkipped,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run outcome replay until selected composite rows are complete and ready.']
      : ['Run the existing read-only replay-package outcome tool over this package before any scanner-visible proposal.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeValidationPackageReport(
  report: RawOhlcScannerArtifactSweepCompositeValidationPackageReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-validation-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeValidationPackageCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeValidationPackageArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeValidationPackageReport({
    reportDir: options.outDir,
    snapshotMinerReportPath: options.snapshotMinerReport,
    snapshotMinerReport: fs.existsSync(options.snapshotMinerReport)
      ? readJson<RawOhlcScannerArtifactSweepSnapshotFieldMinerReport>(options.snapshotMinerReport)
      : null,
    scannerArtifactPaths: options.scannerArtifacts,
    scannerArtifacts: options.scannerArtifacts.map((filePath) => readJson<ArtifactShape>(filePath)),
    minRows: options.minRows,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeValidationPackageReport(report, options.outDir);
  if (options.json) {
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
    runRawOhlcScannerArtifactSweepCompositeValidationPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
