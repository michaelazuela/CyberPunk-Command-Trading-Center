import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-simulation';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  negativeSimulationReport: string;
  scannerArtifacts: string[];
  minReadyRows: number;
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
  rankScore?: number;
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

interface CandidateIndexEntry {
  ticketId: string;
  artifactPath: string;
  artifact: ArtifactShape;
  event: ArtifactEventShape;
  candidate: CandidateShape;
  proofTime: string;
  eventTimes: string[];
}

interface ReplacementRef {
  slateId: string;
  tradeDate: string;
  session: string;
  overlayTopTicketId: string | null;
  overlayTopSetupType: string | null;
  overlayTopOneMesPl: number | null;
  negativeTopTicketId: string;
  negativeTopSetupType: string | null;
  negativeTopOneMesPl: number | null;
}

interface CoverageRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction | null;
  slateIds: string[];
  replacedTicketIds: string[];
  replacementTopOutcomeMissing: boolean;
  coverageStatus: 'ready_for_replay_package' | 'blocked';
  blockers: string[];
  sourceTapePath: string | null;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  barsLoaded: number;
  barsAfterProof: number;
}

type ReplayPackageRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number] & {
  negativeReplacementCoverage?: {
    selectorSource: 'negative_overlay_changed_slate_replacement_top';
    slateIds: string[];
    replacedTicketIds: string[];
  };
};

type ReplayPackageReport = Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'rows'> & {
  rows: ReplayPackageRow[];
};

export interface RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_replacement_coverage';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: UnifiedPositiveHeldLocalPreviewReplayPackageReport['authority'];
  source: {
    reportDir: string;
    negativeSimulationReportPath: string;
    scannerArtifactPaths: string[];
    replayPackagePath: string | null;
    minReadyRows: number;
  };
  assumptions: {
    savedArtifactsOnly: true;
    changedSlateReplacementCoverageOnly: true;
    outcomeIsNotCalculatedInThisStep: true;
    replayPackageUsesCompleted5mOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlates: number;
    replacementTopRefs: number;
    replacementTopMissingOutcomeRefs: number;
    uniqueReplacementTopTicketIds: number;
    candidateIndexRows: number;
    readyRows: number;
    blockedRows: number;
    missingArtifactRows: number;
    incompleteLevelRows: number;
    directionallyInvalidGeometryRows: number;
    missingCompleted5mRows: number;
    modelGroups: number;
    sessionGroups: number;
    livePromotionAllowedRows: 0;
    recommendation: 'run_changed_replacement_outcome_replay' | 'fix_inputs' | 'keep_research_only';
  };
  rows: CoverageRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageArgs(args = process.argv.slice(2)): CliOptions {
  const negativeSimulationReport = readFlag(args, '--negative-simulation-report');
  if (!negativeSimulationReport) throw new Error('--negative-simulation-report is required.');
  const minReadyRows = Number(readFlag(args, '--min-ready-rows') || 1);
  return {
    negativeSimulationReport,
    scannerArtifacts: splitPaths(readFlag(args, '--scanner-artifacts')),
    minReadyRows: Number.isFinite(minReadyRows) && minReadyRows > 0 ? minReadyRows : 1,
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

function replacementRefs(report: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport | null): ReplacementRef[] {
  return (report?.slates || [])
    .filter((slate) => slate.topChanged && Boolean(slate.negativeTopTicketId))
    .map((slate) => ({
      slateId: slate.slateId,
      tradeDate: slate.tradeDate,
      session: slate.session,
      overlayTopTicketId: slate.overlayTopTicketId,
      overlayTopSetupType: slate.overlayTopSetupType,
      overlayTopOneMesPl: slate.overlayTopOneMesPl,
      negativeTopTicketId: slate.negativeTopTicketId as string,
      negativeTopSetupType: slate.negativeTopSetupType,
      negativeTopOneMesPl: slate.negativeTopOneMesPl,
    }));
}

function buildCandidateIndex(scannerArtifactPaths: string[], scannerArtifacts: ArtifactShape[]): Map<string, CandidateIndexEntry> {
  const index = new Map<string, CandidateIndexEntry>();
  scannerArtifacts.forEach((artifact, artifactIndex) => {
    const artifactPath = scannerArtifactPaths[artifactIndex] || `artifact-${artifactIndex}.json`;
    const eventTimes = completedEventTimes(artifact);
    for (const [eventKey, event] of Object.entries(artifact.events || {})) {
      const proofTime = eventTime(eventKey, event);
      for (const candidate of event.setupCandidateStatus?.statuses || []) {
        const id = ticketId(event, candidate, proofTime);
        if (!index.has(id)) {
          index.set(id, { ticketId: id, artifactPath, artifact, event, candidate, proofTime, eventTimes });
        }
      }
    }
  });
  return index;
}

function groupedRefs(refs: ReplacementRef[]): Map<string, ReplacementRef[]> {
  const groups = new Map<string, ReplacementRef[]>();
  for (const ref of refs) {
    const existing = groups.get(ref.negativeTopTicketId);
    if (existing) existing.push(ref);
    else groups.set(ref.negativeTopTicketId, [ref]);
  }
  return groups;
}

function buildCoverageRow(ticketIdValue: string, refs: ReplacementRef[], candidateIndex: Map<string, CandidateIndexEntry>): CoverageRow {
  const indexed = candidateIndex.get(ticketIdValue);
  if (!indexed) {
    return {
      ticketId: ticketIdValue,
      tradeDate: refs[0]?.tradeDate || 'unknown',
      session: refs[0]?.session || 'unknown',
      setupType: refs[0]?.negativeTopSetupType || 'UnknownSetup',
      direction: null,
      slateIds: [...new Set(refs.map((ref) => ref.slateId))],
      replacedTicketIds: [...new Set(refs.map((ref) => ref.overlayTopTicketId).filter((id): id is string => Boolean(id)))],
      replacementTopOutcomeMissing: refs.some((ref) => ref.negativeTopOneMesPl === null),
      coverageStatus: 'blocked',
      blockers: ['missing candidate in supplied scanner artifacts'],
      sourceTapePath: null,
      entry: null,
      stop: null,
      t1: null,
      t2: null,
      barsLoaded: 0,
      barsAfterProof: 0,
    };
  }
  const direction = validDirection(indexed.candidate.direction);
  const entry = numberOrNull(indexed.candidate.entry);
  const stop = numberOrNull(indexed.candidate.stop);
  const t1 = numberOrNull(indexed.candidate.target1);
  const t2 = numberOrNull(indexed.candidate.target2);
  const invalidGeometry = direction && entry !== null && stop !== null && !hasDirectionallyValidEntryStop(direction, entry, stop);
  const barsAfterProof = indexed.eventTimes.filter((time) => timeMs(time) >= timeMs(indexed.proofTime)).length;
  const blockers = [
    !direction ? 'missing LONG/SHORT direction' : null,
    entry === null ? 'missing entry' : null,
    stop === null ? 'missing stop' : null,
    t1 === null ? 'missing T1' : null,
    t2 === null ? 'missing T2' : null,
    invalidGeometry ? 'directionally invalid entry-to-stop geometry' : null,
    indexed.eventTimes.length === 0 ? 'missing completed 5M tape in scanner artifact' : null,
    barsAfterProof <= 0 ? 'missing completed 5M bars at or after proof time' : null,
  ].filter((item): item is string => Boolean(item));
  return {
    ticketId: ticketIdValue,
    tradeDate: indexed.event.date || indexed.proofTime.slice(0, 10),
    session: indexed.event.session || 'unknown',
    setupType: indexed.candidate.setupType || 'UnknownSetup',
    direction,
    slateIds: [...new Set(refs.map((ref) => ref.slateId))],
    replacedTicketIds: [...new Set(refs.map((ref) => ref.overlayTopTicketId).filter((id): id is string => Boolean(id)))],
    replacementTopOutcomeMissing: refs.some((ref) => ref.negativeTopOneMesPl === null),
    coverageStatus: blockers.length ? 'blocked' : 'ready_for_replay_package',
    blockers,
    sourceTapePath: indexed.artifactPath,
    entry,
    stop,
    t1,
    t2,
    barsLoaded: indexed.eventTimes.length,
    barsAfterProof,
  };
}

function replayRows(rows: CoverageRow[], candidateIndex: Map<string, CandidateIndexEntry>): ReplayPackageRow[] {
  return rows
    .filter((row) => row.coverageStatus === 'ready_for_replay_package')
    .map((row) => {
      const indexed = candidateIndex.get(row.ticketId);
      const direction = row.direction as Direction;
      const entry = row.entry as number;
      const stop = row.stop as number;
      const t1 = row.t1 as number;
      const t2 = row.t2 as number;
      return {
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        instrument: indexed?.artifact.instrument || 'MES',
        setupType: row.setupType,
        direction,
        proofTime: indexed?.proofTime || row.ticketId,
        firstSeenTime: indexed?.proofTime || row.ticketId,
        lastSeenTime: indexed?.proofTime || row.ticketId,
        occurrences: row.slateIds.length,
        entry,
        stop,
        t1,
        t2,
        riskPoints: round(Math.abs(entry - stop)),
        t1R: levelR({ direction, entry, stop, target: t1 }),
        t2R: levelR({ direction, entry, stop, target: t2 }),
        proofState: `${indexed?.candidate.detectedStatus || 'unknown'}:${indexed?.candidate.executionStatus || 'unknown'}:${indexed?.candidate.blockReason || 'none'}`,
        triageScore: numberOrNull(indexed?.candidate.rankScore) ?? 0,
        sourceTapePath: row.sourceTapePath || '',
        barsSource: 'scanner_decision_tape_completed_5m' as const,
        barsLoaded: row.barsLoaded,
        barsAfterProof: row.barsAfterProof,
        firstBarTime: indexed?.eventTimes[0] || null,
        lastBarTime: indexed?.eventTimes[(indexed?.eventTimes.length || 0) - 1] || null,
        outcomeInputStatus: 'ready_for_read_only_outcome_replay' as const,
        blockers: [],
        negativeReplacementCoverage: {
          selectorSource: 'negative_overlay_changed_slate_replacement_top' as const,
          slateIds: row.slateIds,
          replacedTicketIds: row.replacedTicketIds,
        },
      };
    })
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.setupType}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.setupType}-${b.direction}`));
}

function replayPackageReport(args: {
  reportDir: string;
  coverageReportPath: string | null;
  rows: ReplayPackageRow[];
}, generatedAt: string): ReplayPackageReport {
  const base: Omit<ReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt,
    status: args.rows.length ? 'pass' : 'fail',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      triageReportPath: args.coverageReportPath,
      auditDir: args.reportDir,
    },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: args.rows.length,
      replayPackageRows: args.rows.length,
      readyRows: args.rows.length,
      blockedRows: 0,
      directionallyInvalidGeometryRows: 0,
      modelGroups: new Set(args.rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(args.rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
    },
    rows: args.rows,
    blockers: args.rows.length ? [] : ['no ready changed-slate replacement rows available for replay package'],
    recommendations: args.rows.length
      ? ['Run the existing read-only replay-package outcome tool over this changed-slate replacement package, then rerun the negative overlay on outcome-covered changed slates only.']
      : ['Keep this research-only and fix missing levels/tapes before outcome replay.'],
  };
  return { ...base, markdown: buildReplayPackageMarkdown(base) };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildReplayPackageMarkdown(report: Omit<ReplayPackageReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Negative Overlay Replacement Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay package built from changed-slate replacement tops. It does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Replay package rows: ${report.summary.replayPackageRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
  ].join('\n');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport, 'markdown'>): string {
  const blockerCounts = new Map<string, number>();
  for (const row of report.rows) {
    for (const blocker of row.blockers) blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
  }
  return [
    '# Raw-OHLC Sweep Composite Overlay Negative Replacement Coverage',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only changed-slate replacement coverage over saved negative-simulation and scanner artifacts. It does not compute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Replacement top refs: ${report.summary.replacementTopRefs}.`,
    `- Replacement top refs still missing outcome: ${report.summary.replacementTopMissingOutcomeRefs}.`,
    `- Unique replacement top ticket IDs: ${report.summary.uniqueReplacementTopTicketIds}.`,
    `- Candidate index rows: ${report.summary.candidateIndexRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Missing artifact rows: ${report.summary.missingArtifactRows}.`,
    `- Incomplete level rows: ${report.summary.incompleteLevelRows}.`,
    `- Directionally invalid geometry rows: ${report.summary.directionallyInvalidGeometryRows}.`,
    `- Missing completed 5M rows: ${report.summary.missingCompleted5mRows}.`,
    `- Replay package: ${report.source.replayPackagePath ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blocker Mix',
    ...([...blockerCounts.entries()].sort((a, b) => b[1] - a[1]).map(([blocker, count]) => `- ${blocker}: ${count}`) || ['- None.']),
    '',
    '## Ready Rows',
    '| Ticket | Setup | Session | Side | Entry | Stop | T1 | T2 | Bars After Proof | Replaces |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---|',
    ...report.rows.filter((row) => row.coverageStatus === 'ready_for_replay_package').slice(0, 50).map((row) => `| ${escapeTable(row.ticketId)} | ${row.setupType} | ${row.session} | ${row.direction ?? '-'} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.t1 ?? '-'} | ${row.t2 ?? '-'} | ${row.barsAfterProof} | ${row.replacedTicketIds.length} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport(args: {
  reportDir: string;
  negativeSimulationReportPath: string;
  negativeSimulationReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport | null;
  scannerArtifactPaths: string[];
  scannerArtifacts: ArtifactShape[];
  replayPackagePath: string | null;
  minReadyRows: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport {
  const refs = replacementRefs(args.negativeSimulationReport);
  const index = buildCandidateIndex(args.scannerArtifactPaths, args.scannerArtifacts);
  const rows = [...groupedRefs(refs).entries()]
    .map(([id, idRefs]) => buildCoverageRow(id, idRefs, index))
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.ticketId}`.localeCompare(`${b.tradeDate}-${b.session}-${b.ticketId}`));
  const readyRows = rows.filter((row) => row.coverageStatus === 'ready_for_replay_package');
  const blockers = [
    !args.negativeSimulationReport ? 'missing negative simulation report' : null,
    args.negativeSimulationReport && args.negativeSimulationReport.status !== 'pass' ? `negative simulation report status ${args.negativeSimulationReport.status}` : null,
    args.scannerArtifacts.length === 0 ? 'missing scanner artifacts' : null,
    refs.length === 0 ? 'negative simulation has no changed replacement top refs' : null,
    readyRows.length < args.minReadyRows ? `ready rows ${readyRows.length} below minimum ${args.minReadyRows}` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : readyRows.length
      ? 'run_changed_replacement_outcome_replay'
      : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_replacement_coverage',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      negativeSimulationReportPath: args.negativeSimulationReportPath,
      scannerArtifactPaths: args.scannerArtifactPaths,
      replayPackagePath: args.replayPackagePath,
      minReadyRows: args.minReadyRows,
    },
    assumptions: {
      savedArtifactsOnly: true,
      changedSlateReplacementCoverageOnly: true,
      outcomeIsNotCalculatedInThisStep: true,
      replayPackageUsesCompleted5mOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlates: args.negativeSimulationReport?.slates?.filter((slate) => slate.topChanged).length || 0,
      replacementTopRefs: refs.length,
      replacementTopMissingOutcomeRefs: refs.filter((ref) => ref.negativeTopOneMesPl === null).length,
      uniqueReplacementTopTicketIds: rows.length,
      candidateIndexRows: index.size,
      readyRows: readyRows.length,
      blockedRows: rows.filter((row) => row.coverageStatus === 'blocked').length,
      missingArtifactRows: rows.filter((row) => row.blockers.includes('missing candidate in supplied scanner artifacts')).length,
      incompleteLevelRows: rows.filter((row) => row.blockers.some((blocker) => /^missing (entry|stop|T1|T2)$/.test(blocker))).length,
      directionallyInvalidGeometryRows: rows.filter((row) => row.blockers.includes('directionally invalid entry-to-stop geometry')).length,
      missingCompleted5mRows: rows.filter((row) => row.blockers.some((blocker) => blocker.includes('completed 5M'))).length,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved negative-simulation/scanner inputs or lower the research-only minimum ready row threshold before running outcome replay.']
      : [
        'Run the existing read-only replay-package outcome tool on the generated changed-slate replacement replay package.',
        'Then rerun the negative overlay on outcome-covered changed slates only.',
        'Keep this research-only; do not install scanner-visible ranking from coverage alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport,
  replayPackage: ReplayPackageReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string; replayPackagePath: string; replayPackageMarkdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-replacement-coverage-${stamp}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  const replayBase = `raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-replacement-replay-package-${stamp}`;
  const replayPackagePath = path.join(outDir, `${replayBase}.json`);
  const replayPackageMarkdownPath = path.join(outDir, `${replayBase}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify({ ...report, source: { ...report.source, replayPackagePath } }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown.replace(`- Replay package: ${report.source.replayPackagePath ?? '-'}.`, `- Replay package: ${replayPackagePath}.`)}\n`, 'utf8');
  fs.writeFileSync(replayPackagePath, `${JSON.stringify({ ...replayPackage, source: { ...replayPackage.source, triageReportPath: jsonPath } }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(replayPackageMarkdownPath, `${replayPackage.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath, replayPackagePath, replayPackageMarkdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageArgs(args);
  const scannerArtifacts = options.scannerArtifacts.map((filePath) => readJson<ArtifactShape>(filePath));
  const negativeSimulationReport = fs.existsSync(options.negativeSimulationReport)
    ? readJson<RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport>(options.negativeSimulationReport)
    : null;
  const preliminary = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport({
    reportDir: options.outDir,
    negativeSimulationReportPath: options.negativeSimulationReport,
    negativeSimulationReport,
    scannerArtifactPaths: options.scannerArtifacts,
    scannerArtifacts,
    replayPackagePath: null,
    minReadyRows: options.minReadyRows,
  });
  const packageRows = replayRows(preliminary.rows, buildCandidateIndex(options.scannerArtifacts, scannerArtifacts));
  const packageReport = replayPackageReport({
    reportDir: options.outDir,
    coverageReportPath: null,
    rows: packageRows,
  }, preliminary.generatedAt);
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport(preliminary, packageReport, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: preliminary.status, summary: preliminary.summary, blockers: preliminary.blockers }, null, 2));
  } else {
    console.log(preliminary.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Replay Package JSON: ${paths.replayPackagePath}`);
  }
  if (preliminary.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
