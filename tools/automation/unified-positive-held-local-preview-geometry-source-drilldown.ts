import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport,
} from './unified-positive-held-local-preview-replacement-blocker-drilldown';

type ReplayRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number];

interface TapeCandidate {
  eventTime: string;
  setupType: string;
  direction: string;
  executionStatus: string | null;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  geometryValid: boolean | null;
  exactReplayLevels: boolean;
}

interface GeometrySourceRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  replayProofTime: string;
  replayEntry: number;
  replayStop: number;
  replayGeometryValid: boolean | null;
  sourceTapePath: string | null;
  tapeCandidates: number;
  firstExactBadTapeEventTime: string | null;
  exactBadTapeEvents: number;
  laterGeometryValidSameDirectionEvents: number;
  firstLaterGeometryValidEvent: TapeCandidate | null;
  sourceConclusion:
    | 'bad_geometry_originates_in_scanner_tape'
    | 'bad_geometry_not_found_in_tape'
    | 'missing_source_tape'
    | 'replay_geometry_valid';
}

export interface UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport {
  reportType: 'unified_positive_held_local_preview_geometry_source_drilldown';
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
    replacementBlockerDrilldownPath: string | null;
    replayPackagePath: string | null;
  };
  assumptions: {
    readsSavedDiagnosticsAndLocalTapesOnly: true;
    geometrySourceOnly: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    invalidReplacementRows: number;
    badGeometryOriginatesInScannerTapeRows: number;
    rowsWithLaterGeometryValidSameDirectionEvent: number;
    missingSourceTapeRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'fix_scanner_candidate_geometry_before_ranking'
      | 'inspect_replay_mapping'
      | 'reject_missing_source';
  };
  rows: GeometrySourceRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport['authority'] {
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

function geometryValid(direction: string, entry: number | null, stop: number | null): boolean | null {
  if (entry === null || stop === null) return null;
  if (direction === 'LONG') return stop < entry;
  if (direction === 'SHORT') return stop > entry;
  return null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sameNumber(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) < 0.00001;
}

function collectTapeCandidates(tapePath: string, row: ReplayRow): TapeCandidate[] {
  if (!fs.existsSync(tapePath)) return [];
  const tape = readJson<{ events?: Record<string, unknown> }>(tapePath);
  const candidates: TapeCandidate[] = [];
  for (const [eventTime, event] of Object.entries(tape.events || {})) {
    const statuses = (((event as Record<string, unknown>).setupCandidateStatus as Record<string, unknown> | undefined)?.statuses || []) as Array<Record<string, unknown>>;
    for (const status of statuses) {
      if (status.setupType !== row.setupType || status.direction !== row.direction) continue;
      const entry = numberOrNull(status.entry);
      const stop = numberOrNull(status.stop);
      const target1 = numberOrNull(status.target1);
      const target2 = numberOrNull(status.target2);
      candidates.push({
        eventTime,
        setupType: String(status.setupType),
        direction: String(status.direction),
        executionStatus: typeof status.executionStatus === 'string' ? status.executionStatus : null,
        blockReason: typeof status.blockReason === 'string' ? status.blockReason : null,
        entry,
        stop,
        target1,
        target2,
        riskPoints: numberOrNull(status.riskPoints),
        geometryValid: geometryValid(row.direction, entry, stop),
        exactReplayLevels: sameNumber(entry, row.entry) && sameNumber(stop, row.stop),
      });
    }
  }
  return candidates.sort((a, b) => a.eventTime.localeCompare(b.eventTime));
}

function buildRows(args: {
  replacementBlockerDrilldownReport: UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
}): GeometrySourceRow[] {
  const replayByTicket = new Map((args.replayPackageReport?.rows || []).map((row) => [row.ticketId, row]));
  return (args.replacementBlockerDrilldownReport?.rows || [])
    .filter((row) => row.failureClass === 'directionally_invalid_entry_stop_geometry')
    .map((blockedRow) => {
      const replay = replayByTicket.get(blockedRow.ticketId);
      if (!replay) {
        return {
          ticketId: blockedRow.ticketId,
          tradeDate: blockedRow.tradeDate,
          session: blockedRow.session,
          setupType: blockedRow.setupType,
          direction: blockedRow.direction,
          replayProofTime: blockedRow.proofTime || 'unknown',
          replayEntry: blockedRow.entry ?? Number.NaN,
          replayStop: blockedRow.stop ?? Number.NaN,
          replayGeometryValid: blockedRow.geometryValid,
          sourceTapePath: null,
          tapeCandidates: 0,
          firstExactBadTapeEventTime: null,
          exactBadTapeEvents: 0,
          laterGeometryValidSameDirectionEvents: 0,
          firstLaterGeometryValidEvent: null,
          sourceConclusion: 'missing_source_tape',
        };
      }
      const sourceTapePath = replay.sourceTapePath || null;
      const tapeCandidates = sourceTapePath ? collectTapeCandidates(sourceTapePath, replay) : [];
      const exactBad = tapeCandidates.filter((candidate) => candidate.exactReplayLevels && candidate.geometryValid === false);
      const laterValid = tapeCandidates.filter((candidate) =>
        candidate.eventTime > replay.proofTime &&
        candidate.geometryValid === true &&
        candidate.entry !== null &&
        candidate.stop !== null
      );
      return {
        ticketId: replay.ticketId,
        tradeDate: replay.tradeDate,
        session: replay.session,
        setupType: replay.setupType,
        direction: replay.direction,
        replayProofTime: replay.proofTime,
        replayEntry: replay.entry,
        replayStop: replay.stop,
        replayGeometryValid: geometryValid(replay.direction, replay.entry, replay.stop),
        sourceTapePath,
        tapeCandidates: tapeCandidates.length,
        firstExactBadTapeEventTime: exactBad[0]?.eventTime || null,
        exactBadTapeEvents: exactBad.length,
        laterGeometryValidSameDirectionEvents: laterValid.length,
        firstLaterGeometryValidEvent: laterValid[0] || null,
        sourceConclusion: geometryValid(replay.direction, replay.entry, replay.stop) !== false
          ? 'replay_geometry_valid'
          : exactBad.length > 0
            ? 'bad_geometry_originates_in_scanner_tape'
            : 'bad_geometry_not_found_in_tape',
      };
    });
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Geometry Source Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only geometry-source drilldown. It reads saved diagnostics and local scanner tapes only and does not install behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Invalid replacement rows: ${report.summary.invalidReplacementRows}.`,
    `- Bad geometry originates in scanner tape rows: ${report.summary.badGeometryOriginatesInScannerTapeRows}.`,
    `- Rows with later valid same-direction event: ${report.summary.rowsWithLaterGeometryValidSameDirectionEvent}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Replay Entry | Replay Stop | First Bad Tape Event | Exact Bad Events | Later Valid Events | Conclusion |',
    '|---|---:|---:|---|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.replayEntry} | ${row.replayStop} | ${row.firstExactBadTapeEventTime ?? '-'} | ${row.exactBadTapeEvents} | ${row.laterGeometryValidSameDirectionEvents} | ${row.sourceConclusion} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport(args: {
  reportDir: string;
  replacementBlockerDrilldownPath: string | null;
  replacementBlockerDrilldownReport: UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport | null;
  replayPackagePath: string | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport {
  const rows = buildRows(args);
  const blockers = [
    !args.replacementBlockerDrilldownPath ? 'missing replacement-blocker drilldown path' : null,
    !args.replacementBlockerDrilldownReport ? 'missing replacement-blocker drilldown report' : null,
    args.replacementBlockerDrilldownReport && args.replacementBlockerDrilldownReport.status !== 'pass' ? `replacement-blocker drilldown status ${args.replacementBlockerDrilldownReport.status}` : null,
    !args.replayPackagePath ? 'missing replay-package path' : null,
    !args.replayPackageReport ? 'missing replay-package report' : null,
    args.replayPackageReport && args.replayPackageReport.status !== 'pass' ? `replay-package status ${args.replayPackageReport.status}` : null,
    rows.length === 0 ? 'no invalid replacement rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const badGeometryOriginatesInScannerTapeRows = rows.filter((row) => row.sourceConclusion === 'bad_geometry_originates_in_scanner_tape').length;
  const rowsWithLaterGeometryValidSameDirectionEvent = rows.filter((row) => row.laterGeometryValidSameDirectionEvents > 0).length;
  const missingSourceTapeRows = rows.filter((row) => row.sourceConclusion === 'missing_source_tape').length;
  const recommendation = blockers.length ? 'reject_missing_source'
    : badGeometryOriginatesInScannerTapeRows > 0 ? 'fix_scanner_candidate_geometry_before_ranking'
      : 'inspect_replay_mapping';
  const base: Omit<UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_geometry_source_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replacementBlockerDrilldownPath: args.replacementBlockerDrilldownPath,
      replayPackagePath: args.replayPackagePath,
    },
    assumptions: {
      readsSavedDiagnosticsAndLocalTapesOnly: true,
      geometrySourceOnly: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      invalidReplacementRows: rows.length,
      badGeometryOriginatesInScannerTapeRows,
      rowsWithLaterGeometryValidSameDirectionEvent,
      missingSourceTapeRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use geometry-source drilldown until source reports are present.']
      : [
        'Fix scanner candidate geometry before using these Sweep/FVG rows as rank replacements.',
        'Do not install historicalReview penalties or replacement ranking from rows whose source tape has inverted entry/stop geometry.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-geometry-source-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const replacementBlockerDrilldownPath = readFlag(args, '--replacement-blocker-drilldown') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replacement-blocker-drilldown-\d+\.json$/);
  const replayPackagePath = readFlag(args, '--replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport({
    reportDir: outDir,
    replacementBlockerDrilldownPath,
    replacementBlockerDrilldownReport: replacementBlockerDrilldownPath && fs.existsSync(replacementBlockerDrilldownPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport>(replacementBlockerDrilldownPath)
      : null,
    replayPackagePath,
    replayPackageReport: replayPackagePath && fs.existsSync(replayPackagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(replayPackagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, rows: report.rows }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
