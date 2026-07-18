import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  scannerArtifact: string;
  outDir: string;
  json: boolean;
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
  riskPoints?: number | null;
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  completed5m?: unknown;
  setupCandidateStatus?: {
    statuses?: CandidateShape[];
  };
}

interface ArtifactShape {
  reportType?: string;
  generatedAt?: string;
  instrument?: string;
  startDate?: string;
  endDate?: string;
  events?: Record<string, ArtifactEventShape>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactReplayPackageArgs(args = process.argv.slice(2)): CliOptions {
  const scannerArtifact = readFlag(args, '--scanner-artifact');
  if (!scannerArtifact) throw new Error('--scanner-artifact is required.');
  return {
    scannerArtifact,
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

function levelR(args: { direction: Direction; entry: number; stop: number; target: number }): number | null {
  const risk = Math.abs(args.entry - args.stop);
  if (risk <= 0) return null;
  return args.direction === 'LONG'
    ? round((args.target - args.entry) / risk)
    : round((args.entry - args.target) / risk);
}

function validDirection(value: unknown): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function hasDirectionallyValidEntryStop(direction: Direction, entry: number, stop: number): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function completedEventTimes(artifact: ArtifactShape): string[] {
  return Object.entries(artifact.events || {})
    .filter(([, event]) => Boolean(event.completed5m))
    .map(([eventTime, event]) => normalizeTime(event.eventTime) || normalizeTime(eventTime) || eventTime)
    .sort((a, b) => timeMs(a) - timeMs(b));
}

function buildRows(args: {
  artifactPath: string;
  artifact: ArtifactShape;
}): UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'] {
  const eventTimes = completedEventTimes(args.artifact);
  const rows: UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'] = [];
  for (const [eventKey, event] of Object.entries(args.artifact.events || {})) {
    const proofTime = normalizeTime(event.eventTime) || normalizeTime(eventKey) || eventKey;
    for (const candidate of event.setupCandidateStatus?.statuses || []) {
      const direction = validDirection(candidate.direction);
      const entry = numberOrNull(candidate.entry);
      const stop = numberOrNull(candidate.stop);
      const t1 = numberOrNull(candidate.target1);
      const t2 = numberOrNull(candidate.target2);
      if (!direction || entry === null || stop === null || t1 === null || t2 === null) continue;
      if (!hasDirectionallyValidEntryStop(direction, entry, stop)) continue;
      const riskPoints = round(Math.abs(entry - stop));
      if (riskPoints <= 0) continue;
      const barsAfterProof = eventTimes.filter((time) => timeMs(time) >= timeMs(proofTime)).length;
      rows.push({
        ticketId: [
          event.date || proofTime.slice(0, 10),
          event.session || 'unknown',
          candidate.setupType || 'UnknownSetup',
          direction,
          proofTime.replace(/[^0-9T]/g, '').slice(0, 15),
        ].join('-'),
        tradeDate: event.date || proofTime.slice(0, 10),
        session: event.session || 'unknown',
        instrument: args.artifact.instrument || 'MES',
        setupType: candidate.setupType || 'UnknownSetup',
        direction,
        proofTime,
        firstSeenTime: proofTime,
        lastSeenTime: proofTime,
        occurrences: 1,
        entry,
        stop,
        t1,
        t2,
        riskPoints,
        t1R: levelR({ direction, entry, stop, target: t1 }),
        t2R: levelR({ direction, entry, stop, target: t2 }),
        proofState: `${candidate.detectedStatus || 'unknown'}:${candidate.executionStatus || 'unknown'}:${candidate.blockReason || 'none'}`,
        triageScore: 0,
        sourceTapePath: args.artifactPath,
        barsSource: 'scanner_decision_tape_completed_5m',
        barsLoaded: eventTimes.length,
        barsAfterProof,
        firstBarTime: eventTimes[0] || null,
        lastBarTime: eventTimes[eventTimes.length - 1] || null,
        outcomeInputStatus: barsAfterProof > 0 ? 'ready_for_read_only_outcome_replay' : 'blocked',
        blockers: barsAfterProof > 0 ? [] : ['missing completed 5M bars at or after proof time'],
      });
    }
  }
  return rows.sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.setupType}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.setupType}-${b.direction}`));
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay package built from saved raw-OHLC scanner artifacts. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Replay package rows: ${report.summary.replayPackageRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Directionally invalid geometry rows: ${report.summary.directionallyInvalidGeometryRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
  ].join('\n');
}

export function buildRawOhlcScannerArtifactReplayPackageReport(args: {
  scannerArtifactPath: string;
  scannerArtifact: ArtifactShape | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  const rows = args.scannerArtifact ? buildRows({ artifactPath: args.scannerArtifactPath, artifact: args.scannerArtifact }) : [];
  const blockers = [
    !args.scannerArtifact ? 'missing scanner artifact package' : null,
    rows.length === 0 ? 'scanner artifact package has no complete valid entry/stop/T1/T2 replay rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: path.dirname(args.scannerArtifactPath),
      triageReportPath: args.scannerArtifactPath,
      auditDir: path.dirname(args.scannerArtifactPath),
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
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run outcome replay until complete valid local artifact rows are available.']
      : ['Run the existing read-only outcome and source/proof timing chain over this package.'],
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeRawOhlcScannerArtifactReplayPackageReport(report: UnifiedPositiveHeldLocalPreviewReplayPackageReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runRawOhlcScannerArtifactReplayPackageCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcScannerArtifactReplayPackageArgs(rawArgs);
  const report = buildRawOhlcScannerArtifactReplayPackageReport({
    scannerArtifactPath: options.scannerArtifact,
    scannerArtifact: readJson<ArtifactShape>(options.scannerArtifact),
  });
  const paths = writeRawOhlcScannerArtifactReplayPackageReport(report, options.outDir);
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
  runRawOhlcScannerArtifactReplayPackageCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
