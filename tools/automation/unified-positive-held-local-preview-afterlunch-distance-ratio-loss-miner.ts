import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type ReplayRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number];

interface DistanceRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  targetRoomStatus: string;
  targetObstacleLevel: number | null;
  targetObstacleDistanceR: number | null;
  htfLineStatus: string;
  htfLineLevel: number | null;
  htfLineDistanceR: number | null;
  latestCompleted5mClose: number | null;
  latestCloseBeyondLine: boolean | null;
  modelConfidenceScore: number | null;
  candidateState: string;
  joinStatus: 'matched_scanner_candidate' | 'missing_replay_row' | 'missing_scanner_event' | 'missing_scanner_candidate';
}

interface SeparatorSummary {
  separatorId: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
  lossCoverage: number;
  winnerCollisionRows: number;
  decision: 'research_candidate' | 'too_broad' | 'insufficient_rows';
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_distance_ratio_loss_miner';
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
    sourceProofTimingPath: string | null;
    replayPackagePath: string | null;
    scannerArtifactPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    scannerFieldsKnownAtProofOnly: true;
    outcomesUsedOnlyForEvaluation: true;
    minedOnSameOosSlice: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    sourceRows: number;
    matchedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    researchCandidates: number;
    topResearchCandidateId: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_compound_distance_separator_on_broader_replay' | 'mine_additional_structural_context' | 'fix_inputs';
  };
  separators: SeparatorSummary[];
  rows: DistanceRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'AfterLunchDriveFvgContinuation';

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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isWinner(row: Pick<DistanceRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('winner');
}

function isLoss(row: Pick<DistanceRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('loss');
}

function parseFirstPrice(text: unknown): number | null {
  const match = String(text || '').match(/(?:at|above|below|close:)\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

function parseLatestClose(evidence: unknown): number | null {
  const items = Array.isArray(evidence) ? evidence.map(String) : [];
  for (const item of items) {
    const match = item.match(/Latest structured completed 5M close:\s*(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function approxEqual(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 0.01;
}

function signedDistance(direction: string, fromEntry: number, level: number | null): number | null {
  if (level === null) return null;
  return direction === 'SHORT' ? fromEntry - level : level - fromEntry;
}

function distanceR(direction: string, entry: number, riskPoints: number, level: number | null): number | null {
  if (level === null || riskPoints <= 0) return null;
  return round((signedDistance(direction, entry, level) ?? 0) / riskPoints);
}

function closeBeyondLine(direction: string, close: number | null, line: number | null): boolean | null {
  if (close === null || line === null) return null;
  return direction === 'SHORT' ? close < line : close > line;
}

function eventByProofTime(scannerArtifact: any, proofTime: string): any | null {
  const tradeDate = proofTime.slice(0, 10);
  return scannerArtifact?.events?.[proofTime] ||
    scannerArtifact?.events?.[`${proofTime}:00`] ||
    scannerArtifact?.events?.[`${tradeDate} ${proofTime}`] ||
    scannerArtifact?.events?.[`${tradeDate} ${proofTime}:00`] ||
    null;
}

function findCandidate(event: any, timing: TimingRow, replay: ReplayRow | null): any | null {
  const candidates = Array.isArray(event?.setupCandidateStatus?.statuses)
    ? event.setupCandidateStatus.statuses.filter((candidate) => candidate?.setupType === SETUP && candidate?.direction === timing.direction)
    : [];
  if (!candidates.length) return null;
  const exact = replay
    ? candidates.find((candidate) => approxEqual(candidate.entry, replay.entry) && approxEqual(candidate.stop, replay.stop))
    : null;
  return exact || candidates[0] || null;
}

function buildRow(timing: TimingRow, replay: ReplayRow | null, scannerArtifact: any): DistanceRow {
  const event = eventByProofTime(scannerArtifact, timing.proofTime);
  const candidate = event ? findCandidate(event, timing, replay) : null;
  const targetObstacleLevel = parseFirstPrice(candidate?.targetRoom?.targetRoomReason);
  const htfLine = candidate?.activeRuleset?.htfLineInSand || {};
  const htfLineLevel = typeof htfLine.lineInSand === 'number' ? htfLine.lineInSand : null;
  const latestCompleted5mClose = parseLatestClose(htfLine.evidence);
  const entry = replay?.entry ?? Number.NaN;
  return {
    ticketId: timing.ticketId,
    tradeDate: timing.tradeDate,
    session: timing.session,
    setupType: timing.setupType,
    direction: timing.direction,
    proofTime: timing.proofTime,
    outcomeBucket: timing.outcomeBucket,
    resolvedOneMesPl: timing.resolvedOneMesPl,
    riskPoints: timing.riskPoints,
    entry,
    stop: replay?.stop ?? Number.NaN,
    t1: replay?.t1 ?? Number.NaN,
    t2: replay?.t2 ?? Number.NaN,
    targetRoomStatus: candidate?.targetRoom?.targetRoomStatus || 'unknown',
    targetObstacleLevel,
    targetObstacleDistanceR: Number.isFinite(entry) ? distanceR(timing.direction, entry, timing.riskPoints, targetObstacleLevel) : null,
    htfLineStatus: htfLine.status || 'unknown',
    htfLineLevel,
    htfLineDistanceR: Number.isFinite(entry) ? distanceR(timing.direction, entry, timing.riskPoints, htfLineLevel) : null,
    latestCompleted5mClose,
    latestCloseBeyondLine: closeBeyondLine(timing.direction, latestCompleted5mClose, htfLineLevel),
    modelConfidenceScore: typeof candidate?.modelConfidenceScore === 'number' ? candidate.modelConfidenceScore : null,
    candidateState: candidate?.candidateState || 'unknown',
    joinStatus: !replay
      ? 'missing_replay_row'
      : !event
        ? 'missing_scanner_event'
        : !candidate
          ? 'missing_scanner_candidate'
          : 'matched_scanner_candidate',
  };
}

function selectorMap(): Array<{ id: string; select: (row: DistanceRow) => boolean }> {
  return [
    { id: 'targetObstacleDistanceR<=0.35', select: (row) => row.targetObstacleDistanceR !== null && row.targetObstacleDistanceR <= 0.35 },
    { id: 'htfLineBlocked+targetObstacleDistanceR<=0.35', select: (row) => row.htfLineStatus === 'blocked' && row.targetObstacleDistanceR !== null && row.targetObstacleDistanceR <= 0.35 },
    { id: 'htfLineBlocked+riskPoints<=6', select: (row) => row.htfLineStatus === 'blocked' && row.riskPoints <= 6 },
    { id: 'htfLineBlocked+riskPoints<=6+targetObstacleDistanceR<=0.35', select: (row) => row.htfLineStatus === 'blocked' && row.riskPoints <= 6 && row.targetObstacleDistanceR !== null && row.targetObstacleDistanceR <= 0.35 },
    { id: 'htfLineBlocked+htfLineDistanceR<=0.50', select: (row) => row.htfLineStatus === 'blocked' && row.htfLineDistanceR !== null && row.htfLineDistanceR <= 0.5 },
    { id: 'htfLineBlocked+latestCloseNotBeyondLine', select: (row) => row.htfLineStatus === 'blocked' && row.latestCloseBeyondLine === false },
    { id: 'htfLineBlocked+riskPoints<=6+latestCloseNotBeyondLine', select: (row) => row.htfLineStatus === 'blocked' && row.riskPoints <= 6 && row.latestCloseBeyondLine === false },
  ];
}

function summarizeSelector(rows: DistanceRow[], selectorId: string, selected: DistanceRow[]): SeparatorSummary {
  const totalLosses = rows.filter(isLoss).length;
  const losses = selected.filter(isLoss).length;
  const winners = selected.filter(isWinner).length;
  const lossCoverage = totalLosses ? round(losses / totalLosses) : 0;
  return {
    separatorId: selectorId,
    rows: selected.length,
    winners,
    losses,
    unresolved: selected.filter((row) => !isWinner(row) && !isLoss(row)).length,
    grossResolvedOneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
    lossCoverage,
    winnerCollisionRows: winners,
    decision: losses > 0 && lossCoverage === 1 && winners === 0
      ? 'research_candidate'
      : losses > 0
        ? 'too_broad'
        : 'insufficient_rows',
  };
}

function buildSeparators(rows: DistanceRow[]): SeparatorSummary[] {
  return selectorMap()
    .map((selector) => summarizeSelector(rows, selector.id, rows.filter(selector.select)))
    .sort((a, b) => {
      const order = { research_candidate: 0, too_broad: 1, insufficient_rows: 2 };
      if (a.decision !== b.decision) return order[a.decision] - order[b.decision];
      return b.lossCoverage - a.lossCoverage || a.winnerCollisionRows - b.winnerCollisionRows || b.separatorId.length - a.separatorId.length || a.separatorId.localeCompare(b.separatorId);
    });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Distance/Ratio Loss Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only distance/ratio diagnostic. It reads saved reports only and does not run setupScanner, post Discord, write Supabase, read the bridge, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source/matched rows: ${report.summary.sourceRows}/${report.summary.matchedRows}.`,
    `- W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Research candidates: ${report.summary.researchCandidates}.`,
    `- Top research candidate: ${report.summary.topResearchCandidateId ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Separators',
    '| Decision | Separator | Rows | W/L/U | P/L | Loss Coverage | Winner Collisions |',
    '|---|---|---:|---|---:|---:|---:|',
    ...report.separators.map((row) => `| ${row.decision} | ${escapeTable(row.separatorId)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.lossCoverage} | ${row.winnerCollisionRows} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
    '',
    report.blockers.length ? `Blockers: ${report.blockers.join('; ')}` : 'Blockers: none.',
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  replayPackagePath: string | null;
  scannerArtifactPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  scannerArtifactReport: any | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport {
  const sourceRows = (args.sourceProofTimingReport?.rows || []).filter((row) => row.setupType === SETUP);
  const replayByTicket = new Map((args.replayPackageReport?.rows || []).map((row) => [row.ticketId, row]));
  const rows = sourceRows.map((row) => buildRow(row, replayByTicket.get(row.ticketId) || null, args.scannerArtifactReport));
  const matchedRows = rows.filter((row) => row.joinStatus === 'matched_scanner_candidate');
  const separators = buildSeparators(matchedRows);
  const researchCandidates = separators.filter((row) => row.decision === 'research_candidate');
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    !args.replayPackagePath ? 'missing replay package path' : null,
    !args.replayPackageReport ? 'missing replay package report' : null,
    !args.scannerArtifactPath ? 'missing scanner artifact path' : null,
    !args.scannerArtifactReport ? 'missing scanner artifact report' : null,
    sourceRows.length === 0 ? 'no AfterLunch source/proof timing rows found' : null,
    rows.some((row) => row.joinStatus !== 'matched_scanner_candidate') ? 'one or more AfterLunch rows could not be joined to saved scanner candidate context' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: UnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : researchCandidates.length
      ? 'validate_compound_distance_separator_on_broader_replay'
      : 'mine_additional_structural_context';
  const reportWithoutMarkdown = {
    reportType: 'unified_positive_held_local_preview_afterlunch_distance_ratio_loss_miner' as const,
    generatedAt,
    status: blockers.length ? 'fail' as const : 'pass' as const,
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      replayPackagePath: args.replayPackagePath,
      scannerArtifactPath: args.scannerArtifactPath,
    },
    assumptions: {
      savedReportsOnly: true as const,
      afterLunchOnly: true as const,
      scannerFieldsKnownAtProofOnly: true as const,
      outcomesUsedOnlyForEvaluation: true as const,
      minedOnSameOosSlice: true as const,
      noRuntimeRankingChange: true as const,
      runtimeRankConsumerAllowedByThisReport: false as const,
    },
    summary: {
      sourceRows: sourceRows.length,
      matchedRows: matchedRows.length,
      winners: matchedRows.filter(isWinner).length,
      losses: matchedRows.filter(isLoss).length,
      unresolved: matchedRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      grossResolvedOneMesPl: sum(matchedRows.map((row) => row.resolvedOneMesPl)),
      researchCandidates: researchCandidates.length,
      topResearchCandidateId: researchCandidates[0]?.separatorId || null,
      runtimeRankConsumerAllowedByThisReport: false as const,
      recommendation,
    },
    separators,
    rows,
    blockers,
    recommendations: recommendation === 'validate_compound_distance_separator_on_broader_replay'
      ? [
        'Treat the compound selector as research-only because it was mined on the same July OOS slice.',
        'Validate htfLineBlocked+riskPoints<=6+targetObstacleDistanceR<=0.35 against a broader replay package before proposing any review note or rank penalty.',
        'Do not remove AfterLunchDriveFvgContinuation, do not loosen canExecute, and do not change Discord/Supabase/bridge behavior from this report.',
      ]
      : [
        'Mine additional known-at-proof structural context before any scanner-visible behavior changes.',
      ],
  };
  return { ...reportWithoutMarkdown, markdown: buildMarkdown(reportWithoutMarkdown) };
}

export function runCli(args = process.argv.slice(2)): UnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport {
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(reportDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const replayPackagePath = readFlag(args, '--replay-package') ||
    latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifact-replay-package-\d+\.json$/);
  const scannerArtifactPath = readFlag(args, '--scanner-artifact') ||
    latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifacts-.*-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport({
    reportDir,
    sourceProofTimingPath,
    replayPackagePath,
    scannerArtifactPath,
    sourceProofTimingReport: readJson(sourceProofTimingPath),
    replayPackageReport: readJson(replayPackagePath),
    scannerArtifactReport: readJson(scannerArtifactPath),
  });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-distance-ratio-loss-miner-${Date.now()}.json`);
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  if (args.includes('--json')) {
    console.log(JSON.stringify({ status: report.status, reportPath: outPath, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runCli();
}
