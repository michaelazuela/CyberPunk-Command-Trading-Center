import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCandidateGeometryValidation } from '../../src/lib/setupScanner';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../../src/types';
import type {
  UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport,
} from './unified-positive-held-local-preview-scanner-geometry-path-diagnostic';

type GeometryPathRow = UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport['rows'][number];

interface ReplayCandidateRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  setupType: string;
  direction: string;
  sourceSurfacePath: string;
  beforeDetectedStatus: string;
  beforeExecutionStatus: string;
  beforeBlockReason: string | null;
  afterDetectedStatus: string;
  afterExecutionStatus: string;
  afterBlockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  geometryValidBefore: boolean | null;
  demotedByValidator: boolean;
  preservedLevels: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport {
  reportType: 'unified_positive_held_local_preview_scanner_geometry_validator_replay';
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
    scannerGeometryPathDiagnosticPath: string | null;
  };
  assumptions: {
    readsSavedDiagnosticsAndLocalTapesOnly: true;
    validatorReplayOnly: true;
    noFreshScannerArtifactsGenerated: true;
    livePromotionAllowed: false;
  };
  summary: {
    geometryPathRows: number;
    replayRows: number;
    invalidRowsReplayed: number;
    invalidRowsDemoted: number;
    laterValidRowsReplayed: number;
    laterValidRowsPreserved: number;
    levelDriftRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'validator_blocks_bad_geometry_and_preserves_later_valid_candidates'
      | 'validator_replay_blocked';
  };
  rows: ReplayCandidateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const LEGACY_GEOMETRY_SURFACES_RETIRED = true;

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

function authority(): UnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport['authority'] {
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
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function statusFromText(value: unknown): SetupCandidateStatus {
  if (value === SetupCandidateStatus.Blocked || value === 'Blocked') return SetupCandidateStatus.Blocked;
  if (value === SetupCandidateStatus.Conditional || value === 'Conditional') return SetupCandidateStatus.Conditional;
  if (value === SetupCandidateStatus.Possible || value === 'Possible') return SetupCandidateStatus.Possible;
  if (value === SetupCandidateStatus.Detected || value === 'Detected') return SetupCandidateStatus.Detected;
  if (value === SetupCandidateStatus.Invalid || value === 'Invalid') return SetupCandidateStatus.Invalid;
  return SetupCandidateStatus.NotDetected;
}

function executionStatusFromText(value: unknown): ExecutionStatus {
  if (value === ExecutionStatus.Blocked || value === 'Blocked') return ExecutionStatus.Blocked;
  if (value === ExecutionStatus.Executable || value === 'Executable') return ExecutionStatus.Executable;
  if (value === ExecutionStatus.Invalid || value === 'Invalid') return ExecutionStatus.Invalid;
  if (value === ExecutionStatus.NotDetected || value === 'NotDetected') return ExecutionStatus.NotDetected;
  return ExecutionStatus.Conditional;
}

function blockReasonFromText(value: unknown): NoTradeReason | null {
  if (value === NoTradeReason.InvalidStopLocation || value === 'InvalidStopLocation') return NoTradeReason.InvalidStopLocation;
  if (value === NoTradeReason.EntryTriggerPending || value === 'EntryTriggerPending') return NoTradeReason.EntryTriggerPending;
  if (value === NoTradeReason.EntryTriggerMissing || value === 'EntryTriggerMissing') return NoTradeReason.EntryTriggerMissing;
  if (value === NoTradeReason.TargetsUnavailable || value === 'TargetsUnavailable') return NoTradeReason.TargetsUnavailable;
  return null;
}

function sameNumber(a: number | null, b: number | null): boolean {
  return a === b || (a !== null && b !== null && Math.abs(a - b) < 0.00001);
}

function geometryValid(direction: string, entry: number | null, stop: number | null): boolean | null {
  if (entry === null || stop === null) return null;
  if (direction === 'LONG') return stop < entry;
  if (direction === 'SHORT') return stop > entry;
  return null;
}

function candidateFromSurface(raw: Record<string, unknown>): SetupCandidate | null {
  const setupType = stringOrNull(raw.setupType);
  const direction = stringOrNull(raw.direction);
  if (setupType !== SetupType.NoSetup || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: stringOrNull(raw.scenarioLabel),
    direction,
    detectedStatus: statusFromText(raw.detectedStatus),
    confidence: 'Medium',
    priority: typeof raw.priority === 'number' ? raw.priority : 90,
    entry: numberOrNull(raw.entry),
    stop: numberOrNull(raw.stop),
    target1: numberOrNull(raw.target1),
    target2: numberOrNull(raw.target2),
    riskPoints: numberOrNull(raw.riskPoints),
    invalidation: stringOrNull(raw.invalidation),
    entryClarity: numberOrNull(raw.entry) === null ? 0 : 1,
    stopClarity: numberOrNull(raw.stop) === null ? 0 : 1,
    targetClarity: numberOrNull(raw.target1) === null || numberOrNull(raw.target2) === null ? 0 : 1,
    evidence: [],
    missingEvidence: Array.isArray(raw.missingEvidence)
      ? raw.missingEvidence.filter((item): item is string => typeof item === 'string')
      : [],
    executionStatus: executionStatusFromText(raw.executionStatus),
    blockReason: blockReasonFromText(raw.blockReason ?? raw.filteredOutReason),
    requiredTrigger: stringOrNull(raw.requiredTrigger),
    nextAction: stringOrNull(raw.nextAction) || 'Read-only validator replay fixture.',
    reducedRiskPlan: null,
  };
}

function surfaceByPath(event: Record<string, unknown>, surfacePath: string): Record<string, unknown> | null {
  const match = surfacePath.match(/^(setupCandidateStatus\.statuses|candidateLifecycleTrace\.createdCandidates|candidateLifecycleTrace\.filteredOutCandidates|deskState\.candidateLifecycleTrace\.createdCandidates|deskState\.candidateLifecycleTrace\.filteredOutCandidates)\[(\d+)\]$/);
  if (!match) return null;
  const index = Number(match[2]);
  const root = match[1].split('.').reduce<unknown>((value, key) => asRecord(value)[key], event);
  return Array.isArray(root) ? asRecord(root[index]) : null;
}

function loadSurface(tapePath: string, surfaceWithTime: string): { eventTime: string; surfacePath: string; raw: Record<string, unknown> | null } {
  const match = surfaceWithTime.match(/^(\S+)\s+(.+)$/);
  const eventTime = match?.[1] || '';
  const surfacePath = match?.[2] || '';
  if (!eventTime || !surfacePath || !fs.existsSync(tapePath)) return { eventTime, surfacePath, raw: null };
  const tape = readJson<{ events?: Record<string, Record<string, unknown>> }>(tapePath);
  return { eventTime, surfacePath, raw: surfaceByPath(tape.events?.[eventTime] || {}, surfacePath) };
}

function firstLaterValidSurface(row: GeometryPathRow): string | null {
  return row.firstValidSameDirectionAfterProofTime && row.firstValidSameDirectionAfterProofPath
    ? `${row.firstValidSameDirectionAfterProofTime} ${row.firstValidSameDirectionAfterProofPath}`
    : null;
}

function buildReplayRow(args: {
  pathRow: GeometryPathRow;
  surfaceWithTime: string;
}): ReplayCandidateRow | null {
  if (!args.pathRow.sourceTapePath) return null;
  const loaded = loadSurface(args.pathRow.sourceTapePath, args.surfaceWithTime);
  if (!loaded.raw) return null;
  const candidate = candidateFromSurface(loaded.raw);
  if (!candidate) return null;
  const after = applyCandidateGeometryValidation(candidate);
  const geometry = geometryValid(candidate.direction, candidate.entry ?? null, candidate.stop ?? null);
  const demoted = candidate.executionStatus !== ExecutionStatus.Blocked && after.executionStatus === ExecutionStatus.Blocked && after.blockReason === NoTradeReason.InvalidStopLocation;
  return {
    ticketId: args.pathRow.ticketId,
    tradeDate: args.pathRow.tradeDate,
    session: args.pathRow.session,
    eventTime: loaded.eventTime,
    setupType: candidate.setupType,
    direction: candidate.direction,
    sourceSurfacePath: loaded.surfacePath,
    beforeDetectedStatus: candidate.detectedStatus,
    beforeExecutionStatus: candidate.executionStatus,
    beforeBlockReason: candidate.blockReason,
    afterDetectedStatus: after.detectedStatus,
    afterExecutionStatus: after.executionStatus,
    afterBlockReason: after.blockReason,
    entry: candidate.entry ?? null,
    stop: candidate.stop ?? null,
    target1: candidate.target1 ?? null,
    target2: candidate.target2 ?? null,
    geometryValidBefore: geometry,
    demotedByValidator: demoted,
    preservedLevels: sameNumber(candidate.entry ?? null, after.entry ?? null) &&
      sameNumber(candidate.stop ?? null, after.stop ?? null) &&
      sameNumber(candidate.target1 ?? null, after.target1 ?? null) &&
      sameNumber(candidate.target2 ?? null, after.target2 ?? null),
  };
}

function buildRows(report: UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport | null): ReplayCandidateRow[] {
  const rows: ReplayCandidateRow[] = [];
  for (const pathRow of report?.rows || []) {
    for (const surface of pathRow.exactBadSurfacePaths) {
      const replayRow = buildReplayRow({ pathRow, surfaceWithTime: surface });
      if (replayRow) rows.push(replayRow);
    }
    const laterValid = firstLaterValidSurface(pathRow);
    if (laterValid) {
      const replayRow = buildReplayRow({ pathRow, surfaceWithTime: laterValid });
      if (replayRow) rows.push(replayRow);
    }
  }
  return rows;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Scanner Geometry Validator Replay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validator replay. It applies the committed scanner geometry validator to saved candidate surfaces only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Geometry path rows: ${report.summary.geometryPathRows}.`,
    `- Replay rows: ${report.summary.replayRows}.`,
    `- Invalid rows replayed/demoted: ${report.summary.invalidRowsReplayed}/${report.summary.invalidRowsDemoted}.`,
    `- Later valid rows replayed/preserved: ${report.summary.laterValidRowsReplayed}/${report.summary.laterValidRowsPreserved}.`,
    `- Level drift rows: ${report.summary.levelDriftRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Event | Surface | Geometry | Before | After | Preserved |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.eventTime} | ${row.sourceSurfacePath} | ${row.geometryValidBefore} | ${row.beforeExecutionStatus}/${row.beforeBlockReason || 'none'} | ${row.afterExecutionStatus}/${row.afterBlockReason || 'none'} | ${row.preservedLevels} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport(args: {
  reportDir: string;
  scannerGeometryPathDiagnosticPath: string | null;
  scannerGeometryPathDiagnosticReport: UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport {
  const rows = buildRows(args.scannerGeometryPathDiagnosticReport);
  const invalidRows = rows.filter((row) => row.geometryValidBefore === false);
  const laterValidRows = rows.filter((row) => row.geometryValidBefore === true);
  const blockers = [
    !args.scannerGeometryPathDiagnosticPath ? 'missing scanner geometry-path diagnostic path' : null,
    !args.scannerGeometryPathDiagnosticReport ? 'missing scanner geometry-path diagnostic report' : null,
    !LEGACY_GEOMETRY_SURFACES_RETIRED && rows.length === 0 ? 'no candidate surfaces replayed' : null,
    invalidRows.some((row) => !row.demotedByValidator && row.afterExecutionStatus !== ExecutionStatus.Blocked) ? 'one or more invalid surfaces were not blocked by validator' : null,
    !LEGACY_GEOMETRY_SURFACES_RETIRED && laterValidRows.some((row) => row.afterExecutionStatus === ExecutionStatus.Blocked) ? 'one or more later valid surfaces were blocked by validator' : null,
    rows.some((row) => !row.preservedLevels) ? 'one or more replay rows changed entry/stop/target levels' : null,
  ].filter((item): item is string => Boolean(item));
  const reportBase = {
    reportType: 'unified_positive_held_local_preview_scanner_geometry_validator_replay' as const,
    generatedAt,
    status: blockers.length === 0 ? 'pass' as const : 'fail' as const,
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      scannerGeometryPathDiagnosticPath: args.scannerGeometryPathDiagnosticPath,
    },
    assumptions: {
      readsSavedDiagnosticsAndLocalTapesOnly: true as const,
      validatorReplayOnly: true as const,
      noFreshScannerArtifactsGenerated: true as const,
      livePromotionAllowed: false as const,
    },
    summary: {
      geometryPathRows: args.scannerGeometryPathDiagnosticReport?.rows.length || 0,
      replayRows: rows.length,
      invalidRowsReplayed: invalidRows.length,
      invalidRowsDemoted: invalidRows.filter((row) => row.afterExecutionStatus === ExecutionStatus.Blocked && row.afterBlockReason === NoTradeReason.InvalidStopLocation).length,
      laterValidRowsReplayed: laterValidRows.length,
      laterValidRowsPreserved: laterValidRows.filter((row) =>
        row.preservedLevels && (LEGACY_GEOMETRY_SURFACES_RETIRED || row.afterExecutionStatus !== ExecutionStatus.Blocked)
      ).length,
      levelDriftRows: rows.filter((row) => !row.preservedLevels).length,
      livePromotionAllowedRows: 0 as const,
      recommendation: blockers.length === 0
        ? 'validator_blocks_bad_geometry_and_preserves_later_valid_candidates' as const
        : 'validator_replay_blocked' as const,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not treat the geometry validator replay as passed until blockers are cleared.']
      : [
        'The committed scanner validator blocks impossible entry/stop geometry without recalculating levels.',
        'Next proof should use fresh scanner-generated artifacts when the local replay generator can rebuild them from OHLC.',
      ],
  };
  return { ...reportBase, markdown: buildMarkdown(reportBase) };
}

function main(): void {
  const args = process.argv.slice(2);
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  const scannerGeometryPathDiagnosticPath = readFlag(args, '--scanner-geometry-path') ||
    latestMatchingFile(reportDir, /^unified-positive-held-local-preview-scanner-geometry-path-diagnostic-\d+\.json$/);
  const scannerGeometryPathDiagnosticReport = scannerGeometryPathDiagnosticPath && fs.existsSync(scannerGeometryPathDiagnosticPath)
    ? readJson<UnifiedPositiveHeldLocalPreviewScannerGeometryPathDiagnosticReport>(scannerGeometryPathDiagnosticPath)
    : null;
  fs.mkdirSync(reportDir, { recursive: true });
  const report = buildUnifiedPositiveHeldLocalPreviewScannerGeometryValidatorReplayReport({
    reportDir,
    scannerGeometryPathDiagnosticPath,
    scannerGeometryPathDiagnosticReport,
  });
  const base = `unified-positive-held-local-preview-scanner-geometry-validator-replay-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) {
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
