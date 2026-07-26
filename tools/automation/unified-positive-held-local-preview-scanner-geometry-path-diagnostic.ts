import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport,
} from './unified-positive-held-local-preview-geometry-source-drilldown';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';

type ReplayRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number];
type GeometrySourceRow = UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport['rows'][number];

interface CandidateSurface {
  path: string;
  eventTime: string;
  setupType: string | null;
  direction: string | null;
  executionStatus: string | null;
  detectedStatus: string | null;
  blockReason: string | null;
  filteredOutReason: string | null;
  candidateKey: string | null;
  scenarioLabel: string | null;
  selected: boolean | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  geometryValid: boolean | null;
  exactReplayLevels: boolean;
  missingEvidence: string[];
}

interface ScannerGeometryPathRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  replayProofTime: string;
  replayEntry: number;
  replayStop: number;
  sourceTapePath: string | null;
  exactBadSurfaceCount: number;
  exactBadSurfacePaths: string[];
  exactBadLifecycleSurfaceCount: number;
  exactBadSetupStatusSurfaceCount: number;
  firstValidSameDirectionAfterProofTime: string | null;
  firstValidSameDirectionAfterProofPath: string | null;
  firstValidSameDirectionAfterProofEntry: number | null;
  firstValidSameDirectionAfterProofStop: number | null;
  likelySourceLayer:
    | 'candidate_lifecycle_and_setup_status'
    | 'setup_status_only'
    | 'desk_state_or_lifecycle_only'
    | 'not_found_in_tape'
    | 'missing_tape';
  recommendedNextAction:
    | 'inspect_candidate_builder_before_status_export'
    | 'inspect_setup_status_export_mapping'
    | 'inspect_replay_mapping'
    | 'missing_source_tape';
}

export interface UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport {
  reportType: 'unified_positive_held_local_preview_scanner_geometry_path_diagnostic';
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
    geometrySourceDrilldownPath: string | null;
    replayPackagePath: string | null;
  };
  assumptions: {
    readsSavedDiagnosticsAndLocalTapesOnly: true;
    noLiveFilterInstalled: true;
    candidatePathOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    invalidGeometryRows: number;
    exactBadCandidateLifecycleRows: number;
    exactBadSetupStatusOnlyRows: number;
    rowsWithLaterValidSameDirectionCandidate: number;
    missingTapeRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'inspect_candidate_builder_before_status_export'
      | 'inspect_setup_status_export_mapping'
      | 'inspect_replay_mapping'
      | 'reject_missing_source';
  };
  rows: ScannerGeometryPathRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport['authority'] {
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

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function sameNumber(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) < 0.00001;
}

function geometryValid(direction: string | null, entry: number | null, stop: number | null): boolean | null {
  if (entry === null || stop === null) return null;
  if (direction === 'LONG') return stop < entry;
  if (direction === 'SHORT') return stop > entry;
  return null;
}

function candidateSurface(pathName: string, eventTime: string, raw: Record<string, unknown>, replay: ReplayRow): CandidateSurface | null {
  const setupType = stringOrNull(raw.setupType);
  const direction = stringOrNull(raw.direction);
  if (setupType !== replay.setupType || direction !== replay.direction) return null;
  const entry = numberOrNull(raw.entry);
  const stop = numberOrNull(raw.stop);
  return {
    path: pathName,
    eventTime,
    setupType,
    direction,
    executionStatus: stringOrNull(raw.executionStatus),
    detectedStatus: stringOrNull(raw.detectedStatus),
    blockReason: stringOrNull(raw.blockReason),
    filteredOutReason: stringOrNull(raw.filteredOutReason),
    candidateKey: stringOrNull(raw.candidateKey),
    scenarioLabel: stringOrNull(raw.scenarioLabel),
    selected: booleanOrNull(raw.selected),
    entry,
    stop,
    target1: numberOrNull(raw.target1),
    target2: numberOrNull(raw.target2),
    riskPoints: numberOrNull(raw.riskPoints),
    geometryValid: geometryValid(direction, entry, stop),
    exactReplayLevels: sameNumber(entry, replay.entry) && sameNumber(stop, replay.stop),
    missingEvidence: Array.isArray(raw.missingEvidence)
      ? raw.missingEvidence.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function pushCandidate(surfaces: CandidateSurface[], pathName: string, eventTime: string, raw: unknown, replay: ReplayRow): void {
  if (!raw || typeof raw !== 'object') return;
  const surface = candidateSurface(pathName, eventTime, raw as Record<string, unknown>, replay);
  if (surface) surfaces.push(surface);
}

function collectEventSurfaces(event: Record<string, unknown> | undefined, eventTime: string, replay: ReplayRow): CandidateSurface[] {
  if (!event) return [];
  const surfaces: CandidateSurface[] = [];
  const statuses = (((event.setupCandidateStatus as Record<string, unknown> | undefined)?.statuses || []) as unknown[]);
  statuses.forEach((status, index) => pushCandidate(surfaces, `setupCandidateStatus.statuses[${index}]`, eventTime, status, replay));
  const lifecycle = event.candidateLifecycleTrace as Record<string, unknown> | undefined;
  const deskState = event.deskState as Record<string, unknown> | undefined;
  const lifecycleArrays: Array<[string, unknown]> = [
    ['candidateLifecycleTrace.createdCandidates', lifecycle?.createdCandidates],
    ['candidateLifecycleTrace.filteredOutCandidates', lifecycle?.filteredOutCandidates],
    ['deskState.candidateLifecycleTrace.createdCandidates', (deskState?.candidateLifecycleTrace as Record<string, unknown> | undefined)?.createdCandidates],
    ['deskState.candidateLifecycleTrace.filteredOutCandidates', (deskState?.candidateLifecycleTrace as Record<string, unknown> | undefined)?.filteredOutCandidates],
  ];
  for (const [basePath, value] of lifecycleArrays) {
    if (!Array.isArray(value)) continue;
    value.forEach((candidate, index) => pushCandidate(surfaces, `${basePath}[${index}]`, eventTime, candidate, replay));
  }
  for (const key of ['highestRankedCandidate', 'bestLongPlan', 'bestShortPlan']) {
    pushCandidate(surfaces, `candidateLifecycleTrace.${key}`, eventTime, lifecycle?.[key], replay);
    pushCandidate(surfaces, `deskState.candidateLifecycleTrace.${key}`, eventTime, (deskState?.candidateLifecycleTrace as Record<string, unknown> | undefined)?.[key], replay);
  }
  for (const key of ['bestLongPlan', 'bestShortPlan']) {
    pushCandidate(surfaces, `deskState.${key}`, eventTime, deskState?.[key], replay);
  }
  return surfaces;
}

function readTapeSurfaces(tapePath: string, replay: ReplayRow): CandidateSurface[] {
  const tape = readJson<{ events?: Record<string, Record<string, unknown>> }>(tapePath);
  return Object.entries(tape.events || {})
    .flatMap(([eventTime, event]) => collectEventSurfaces(event, eventTime, replay))
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime) || a.path.localeCompare(b.path));
}

function likelySourceLayer(exactBad: CandidateSurface[]): ScannerGeometryPathRow['likelySourceLayer'] {
  if (exactBad.length === 0) return 'not_found_in_tape';
  const hasSetup = exactBad.some((surface) => surface.path.startsWith('setupCandidateStatus.'));
  const hasLifecycle = exactBad.some((surface) => surface.path.includes('candidateLifecycleTrace') || surface.path.startsWith('deskState.'));
  if (hasSetup && hasLifecycle) return 'candidate_lifecycle_and_setup_status';
  if (hasSetup) return 'setup_status_only';
  return 'desk_state_or_lifecycle_only';
}

function nextAction(layer: ScannerGeometryPathRow['likelySourceLayer']): ScannerGeometryPathRow['recommendedNextAction'] {
  if (layer === 'candidate_lifecycle_and_setup_status' || layer === 'desk_state_or_lifecycle_only') {
    return 'inspect_candidate_builder_before_status_export';
  }
  if (layer === 'setup_status_only') return 'inspect_setup_status_export_mapping';
  if (layer === 'missing_tape') return 'missing_source_tape';
  return 'inspect_replay_mapping';
}

function buildRows(args: {
  geometrySourceDrilldownReport: UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
}): ScannerGeometryPathRow[] {
  const replayByTicket = new Map((args.replayPackageReport?.rows || []).map((row) => [row.ticketId, row]));
  return (args.geometrySourceDrilldownReport?.rows || [])
    .filter((row) => row.replayGeometryValid === false)
    .map((sourceRow: GeometrySourceRow) => {
      const replay = replayByTicket.get(sourceRow.ticketId);
      if (!replay || !sourceRow.sourceTapePath || !fs.existsSync(sourceRow.sourceTapePath)) {
        return {
          ticketId: sourceRow.ticketId,
          tradeDate: sourceRow.tradeDate,
          session: sourceRow.session,
          setupType: sourceRow.setupType,
          direction: sourceRow.direction,
          replayProofTime: sourceRow.replayProofTime,
          replayEntry: sourceRow.replayEntry,
          replayStop: sourceRow.replayStop,
          sourceTapePath: sourceRow.sourceTapePath,
          exactBadSurfaceCount: 0,
          exactBadSurfacePaths: [],
          exactBadLifecycleSurfaceCount: 0,
          exactBadSetupStatusSurfaceCount: 0,
          firstValidSameDirectionAfterProofTime: null,
          firstValidSameDirectionAfterProofPath: null,
          firstValidSameDirectionAfterProofEntry: null,
          firstValidSameDirectionAfterProofStop: null,
          likelySourceLayer: 'missing_tape',
          recommendedNextAction: 'missing_source_tape',
        };
      }
      const surfaces = readTapeSurfaces(sourceRow.sourceTapePath, replay);
      const exactBad = surfaces.filter((surface) => surface.exactReplayLevels && surface.geometryValid === false);
      const firstLaterValid = surfaces.find((surface) =>
        surface.eventTime > replay.proofTime &&
        surface.geometryValid === true &&
        surface.entry !== null &&
        surface.stop !== null
      ) || null;
      const layer = likelySourceLayer(exactBad);
      return {
        ticketId: sourceRow.ticketId,
        tradeDate: sourceRow.tradeDate,
        session: sourceRow.session,
        setupType: sourceRow.setupType,
        direction: sourceRow.direction,
        replayProofTime: replay.proofTime,
        replayEntry: replay.entry,
        replayStop: replay.stop,
        sourceTapePath: sourceRow.sourceTapePath,
        exactBadSurfaceCount: exactBad.length,
        exactBadSurfacePaths: exactBad.map((surface) => `${surface.eventTime} ${surface.path}`),
        exactBadLifecycleSurfaceCount: exactBad.filter((surface) => surface.path.includes('candidateLifecycleTrace') || surface.path.startsWith('deskState.')).length,
        exactBadSetupStatusSurfaceCount: exactBad.filter((surface) => surface.path.startsWith('setupCandidateStatus.')).length,
        firstValidSameDirectionAfterProofTime: firstLaterValid?.eventTime || null,
        firstValidSameDirectionAfterProofPath: firstLaterValid?.path || null,
        firstValidSameDirectionAfterProofEntry: firstLaterValid?.entry ?? null,
        firstValidSameDirectionAfterProofStop: firstLaterValid?.stop ?? null,
        likelySourceLayer: layer,
        recommendedNextAction: nextAction(layer),
      };
    });
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Scanner Geometry Path Diagnostic',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only scanner geometry path diagnostic. It reads saved diagnostics and local scanner tapes only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Invalid geometry rows: ${report.summary.invalidGeometryRows}.`,
    `- Exact bad candidate-lifecycle rows: ${report.summary.exactBadCandidateLifecycleRows}.`,
    `- Exact bad setup-status-only rows: ${report.summary.exactBadSetupStatusOnlyRows}.`,
    `- Rows with later valid same-direction candidate: ${report.summary.rowsWithLaterValidSameDirectionCandidate}.`,
    `- Missing tape rows: ${report.summary.missingTapeRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Bad surfaces | Layer | Later valid | Next action |',
    '| --- | ---: | --- | --- | --- |',
    ...report.rows.map((row) => [
      row.ticketId,
      row.exactBadSurfaceCount,
      row.likelySourceLayer,
      row.firstValidSameDirectionAfterProofTime || 'none',
      row.recommendedNextAction,
    ].join(' | ')).map((line) => `| ${line} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport(args: {
  reportDir: string;
  geometrySourceDrilldownPath: string | null;
  geometrySourceDrilldownReport: UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport | null;
  replayPackagePath: string | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport {
  const rows = buildRows(args);
  const candidateLifecycleRows = rows.filter((row) => row.likelySourceLayer === 'candidate_lifecycle_and_setup_status' || row.likelySourceLayer === 'desk_state_or_lifecycle_only').length;
  const setupStatusOnlyRows = rows.filter((row) => row.likelySourceLayer === 'setup_status_only').length;
  const missingTapeRows = rows.filter((row) => row.likelySourceLayer === 'missing_tape').length;
  const blockers = [
    !args.geometrySourceDrilldownPath ? 'missing geometry-source drilldown path' : null,
    !args.geometrySourceDrilldownReport ? 'missing geometry-source drilldown report' : null,
    !args.replayPackagePath ? 'missing replay package path' : null,
    !args.replayPackageReport ? 'missing replay package report' : null,
    rows.length === 0 ? 'no invalid geometry rows found' : null,
    rows.some((row) => row.likelySourceLayer === 'not_found_in_tape') ? 'one or more invalid rows were not found in scanner tape surfaces' : null,
    missingTapeRows > 0 ? 'one or more invalid rows are missing scanner tape context' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport['summary']['recommendation'] = blockers.length > 0
    ? (missingTapeRows > 0 ? 'reject_missing_source' : 'inspect_replay_mapping')
    : candidateLifecycleRows > 0
      ? 'inspect_candidate_builder_before_status_export'
      : setupStatusOnlyRows > 0
        ? 'inspect_setup_status_export_mapping'
        : 'inspect_replay_mapping';
  const reportWithoutMarkdown = {
    reportType: 'unified_positive_held_local_preview_scanner_geometry_path_diagnostic' as const,
    generatedAt,
    status: blockers.length === 0 ? 'pass' as const : 'fail' as const,
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      geometrySourceDrilldownPath: args.geometrySourceDrilldownPath,
      replayPackagePath: args.replayPackagePath,
    },
    assumptions: {
      readsSavedDiagnosticsAndLocalTapesOnly: true as const,
      noLiveFilterInstalled: true as const,
      candidatePathOnly: true as const,
      livePromotionAllowed: false as const,
    },
    summary: {
      invalidGeometryRows: rows.length,
      exactBadCandidateLifecycleRows: candidateLifecycleRows,
      exactBadSetupStatusOnlyRows: setupStatusOnlyRows,
      rowsWithLaterValidSameDirectionCandidate: rows.filter((row) => row.firstValidSameDirectionAfterProofTime !== null).length,
      missingTapeRows,
      livePromotionAllowedRows: 0 as const,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length > 0
      ? ['Do not inspect scanner source paths until saved diagnostics and local tapes join cleanly.']
      : [
        'Do not remove historicalReview, loosen canExecute, or install rank penalties from this diagnostic.',
        candidateLifecycleRows > 0
          ? 'Inspect the NoInstalledSetup candidate builder/source fields before setupCandidateStatus export; the bad geometry is present before status serialization.'
          : 'Inspect setupCandidateStatus export mapping; bad geometry was not found in lifecycle candidates.',
      ],
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

function main(): void {
  const cliArgs = process.argv.slice(2);
  const reportDir = readFlag(cliArgs, '--report-dir') || DEFAULT_REPORT_DIR;
  const geometrySourceDrilldownPath = readFlag(cliArgs, '--geometry-source-drilldown') ||
    latestMatchingFile(reportDir, /^unified-positive-held-local-preview-geometry-source-drilldown-\d+\.json$/);
  const replayPackagePath = readFlag(cliArgs, '--replay-package') ||
    latestMatchingFile(reportDir, /^unified-positive-held-local-preview-replay-package-\d+\.json$/);
  const geometrySourceDrilldownReport = geometrySourceDrilldownPath && fs.existsSync(geometrySourceDrilldownPath)
    ? readJson<UnifiedPositiveHeldLocalPreviewGeometrySourceDrilldownReport>(geometrySourceDrilldownPath)
    : null;
  const replayPackageReport = replayPackagePath && fs.existsSync(replayPackagePath)
    ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(replayPackagePath)
    : null;
  fs.mkdirSync(reportDir, { recursive: true });
  const report = buildUnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport({
    reportDir,
    geometrySourceDrilldownPath,
    geometrySourceDrilldownReport,
    replayPackagePath,
    replayPackageReport,
  });
  const base = `unified-positive-held-local-preview-scanner-geometry-path-diagnostic-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (cliArgs.includes('--json')) {
    console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nWrote ${jsonPath}`);
    console.log(`Wrote ${markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
