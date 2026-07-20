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

interface SequenceRow {
  ticketId: string;
  tradeDate: string;
  setupType: string;
  direction: string;
  proofTime: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  candidateState: string;
  targetRoomStatus: string;
  fvgFormedAt: string | null;
  proofAgeMinutes: number | null;
  sameSideSequence: number;
  sameGeometrySequence: number;
  targetObstacleDistanceR: number | null;
  htfLineDistanceR: number | null;
  htfLineBehindPrice: boolean;
  joinStatus: 'matched_scanner_candidate' | 'missing_replay_row' | 'missing_scanner_event' | 'missing_scanner_candidate';
}

interface SelectorSummary {
  selectorId: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
  lossCoverage: number;
  winnerCollisionRows: number;
  decision: 'research_candidate' | 'too_broad' | 'insufficient_rows';
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_structural_sequence_loss_miner';
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
    recommendation: 'validate_sequence_candidate_on_fresh_oos_replay' | 'mine_additional_structural_context' | 'fix_inputs';
  };
  selectors: SelectorSummary[];
  rows: SequenceRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport['authority'] {
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

function isWinner(row: Pick<SequenceRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('winner');
}

function isLoss(row: Pick<SequenceRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('loss');
}

function approxEqual(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 0.01;
}

function minutesBetween(later: string | null, earlier: string | null): number | null {
  if (!later || !earlier) return null;
  const minutes = (Date.parse(later) - Date.parse(earlier)) / 60000;
  return Number.isFinite(minutes) ? round(minutes) : null;
}

function parseFirstPrice(text: unknown): number | null {
  const match = String(text || '').match(/(?:at|above|below|near|close:)\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : null;
}

function signedDistance(direction: string, fromEntry: number, level: number | null): number | null {
  if (level === null) return null;
  return direction === 'SHORT' ? fromEntry - level : level - fromEntry;
}

function distanceR(direction: string, entry: number, riskPoints: number, level: number | null): number | null {
  if (level === null || riskPoints <= 0) return null;
  return round((signedDistance(direction, entry, level) ?? 0) / riskPoints);
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

function buildRows(sourceRows: TimingRow[], replayRows: ReplayRow[], scannerArtifactReport: any): SequenceRow[] {
  const replayByTicket = new Map(replayRows.map((row) => [row.ticketId, row]));
  const baseRows = sourceRows
    .map((timing) => {
      const replay = replayByTicket.get(timing.ticketId) || null;
      const event = eventByProofTime(scannerArtifactReport, timing.proofTime);
      const candidate = event ? findCandidate(event, timing, replay) : null;
      const entry = replay?.entry ?? Number.NaN;
      const riskPoints = replay?.riskPoints ?? timing.riskPoints;
      const targetObstacleLevel = parseFirstPrice(candidate?.targetRoom?.targetRoomReason);
      const htfLineLevel = typeof candidate?.activeRuleset?.htfLineInSand?.lineInSand === 'number'
        ? candidate.activeRuleset.htfLineInSand.lineInSand
        : null;
      const fvgFormedAt = typeof candidate?.tacticalZone?.formedAt === 'string' ? candidate.tacticalZone.formedAt : null;
      const htfLineDistanceR = Number.isFinite(entry) ? distanceR(timing.direction, entry, riskPoints, htfLineLevel) : null;
      return {
        ticketId: timing.ticketId,
        tradeDate: timing.tradeDate,
        setupType: timing.setupType,
        direction: timing.direction,
        proofTime: timing.proofTime,
        outcomeBucket: timing.outcomeBucket,
        resolvedOneMesPl: timing.resolvedOneMesPl,
        riskPoints,
        candidateState: candidate?.candidateState || 'unknown',
        targetRoomStatus: candidate?.targetRoom?.targetRoomStatus || 'unknown',
        fvgFormedAt,
        proofAgeMinutes: minutesBetween(timing.proofTime, fvgFormedAt),
        sameSideSequence: 0,
        sameGeometrySequence: 0,
        targetObstacleDistanceR: Number.isFinite(entry) ? distanceR(timing.direction, entry, riskPoints, targetObstacleLevel) : null,
        htfLineDistanceR,
        htfLineBehindPrice: htfLineDistanceR !== null && htfLineDistanceR < 0,
        joinStatus: !replay
          ? 'missing_replay_row' as const
          : !event
            ? 'missing_scanner_event' as const
            : !candidate
              ? 'missing_scanner_candidate' as const
              : 'matched_scanner_candidate' as const,
      };
    })
    .sort((a, b) => Date.parse(a.proofTime) - Date.parse(b.proofTime));

  const sideSeen = new Map<string, number>();
  const geometrySeen = new Map<string, number>();
  return baseRows.map((row) => {
    const sideKey = `${row.tradeDate}|${row.direction}`;
    const geometryKey = `${row.tradeDate}|${row.direction}|${row.riskPoints}|${row.targetObstacleDistanceR ?? 'n/a'}|${row.htfLineDistanceR ?? 'n/a'}`;
    const sameSideSequence = (sideSeen.get(sideKey) || 0) + 1;
    const sameGeometrySequence = (geometrySeen.get(geometryKey) || 0) + 1;
    sideSeen.set(sideKey, sameSideSequence);
    geometrySeen.set(geometryKey, sameGeometrySequence);
    return { ...row, sameSideSequence, sameGeometrySequence };
  });
}

function selectorMap(): Array<{ id: string; select: (row: SequenceRow) => boolean }> {
  return [
    { id: 'riskPoints<=10+htfLineBehindPrice', select: (row) => row.riskPoints <= 10 && row.htfLineBehindPrice },
    { id: 'riskPoints<=10+htfLineBehindPrice+sameSideSequence>1', select: (row) => row.riskPoints <= 10 && row.htfLineBehindPrice && row.sameSideSequence > 1 },
    { id: 'riskPoints<=10+htfLineBehindPrice+targetBlockedBeforeT1', select: (row) => row.riskPoints <= 10 && row.htfLineBehindPrice && row.targetRoomStatus === 'blocked_before_t1' },
    { id: 'htfLineBehindPrice', select: (row) => row.htfLineBehindPrice },
    { id: 'proofAgeMinutes>30+htfLineBehindPrice', select: (row) => (row.proofAgeMinutes ?? 0) > 30 && row.htfLineBehindPrice },
    { id: 'proofAgeMinutes>60+htfLineBehindPrice', select: (row) => (row.proofAgeMinutes ?? 0) > 60 && row.htfLineBehindPrice },
    { id: 'proofAgeMinutes<=0+candidateReady+riskPoints<=10', select: (row) => (row.proofAgeMinutes ?? 0) <= 0 && row.candidateState === 'HUMAN_REVIEW_READY' && row.riskPoints <= 10 },
  ];
}

function summarizeSelector(rows: SequenceRow[], selectorId: string, selected: SequenceRow[]): SelectorSummary {
  const totalLosses = rows.filter(isLoss).length;
  const losses = selected.filter(isLoss).length;
  const winners = selected.filter(isWinner).length;
  const lossCoverage = totalLosses ? round(losses / totalLosses) : 0;
  return {
    selectorId,
    rows: selected.length,
    winners,
    losses,
    unresolved: selected.filter((row) => !isWinner(row) && !isLoss(row)).length,
    grossResolvedOneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
    lossCoverage,
    winnerCollisionRows: winners,
    decision: losses > 0 && winners === 0 && selected.length >= 2
      ? 'research_candidate'
      : losses > 0
        ? 'too_broad'
        : 'insufficient_rows',
  };
}

function buildSelectors(rows: SequenceRow[]): SelectorSummary[] {
  return selectorMap()
    .map((selector) => summarizeSelector(rows, selector.id, rows.filter(selector.select)))
    .sort((a, b) => {
      const order = { research_candidate: 0, too_broad: 1, insufficient_rows: 2 };
      if (a.decision !== b.decision) return order[a.decision] - order[b.decision];
      return b.lossCoverage - a.lossCoverage || a.winnerCollisionRows - b.winnerCollisionRows || b.rows - a.rows;
    });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Structural Sequence Loss Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only structural sequence diagnostic. It reads saved reports only and does not run setupScanner, post Discord, write Supabase, read the bridge, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source/matched rows: ${report.summary.sourceRows}/${report.summary.matchedRows}.`,
    `- W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Research candidates: ${report.summary.researchCandidates}.`,
    `- Top research candidate: ${report.summary.topResearchCandidateId ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selectors',
    '| Decision | Selector | Rows | W/L/U | P/L | Loss Coverage | Winner Collisions |',
    '|---|---|---:|---|---:|---:|---:|',
    ...report.selectors.map((row) => `| ${row.decision} | ${escapeTable(row.selectorId)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.lossCoverage} | ${row.winnerCollisionRows} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
    '',
    report.blockers.length ? `Blockers: ${report.blockers.join('; ')}` : 'Blockers: none.',
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  replayPackagePath: string | null;
  scannerArtifactPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  scannerArtifactReport: any | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport {
  const sourceRows = (args.sourceProofTimingReport?.rows || []).filter((row) => row.setupType === SETUP);
  const rows = buildRows(sourceRows, args.replayPackageReport?.rows || [], args.scannerArtifactReport);
  const matchedRows = rows.filter((row) => row.joinStatus === 'matched_scanner_candidate');
  const selectors = buildSelectors(matchedRows);
  const researchCandidates = selectors.filter((row) => row.decision === 'research_candidate');
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
  const recommendation: UnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : researchCandidates.length
      ? 'validate_sequence_candidate_on_fresh_oos_replay'
      : 'mine_additional_structural_context';
  const reportWithoutMarkdown = {
    reportType: 'unified_positive_held_local_preview_afterlunch_structural_sequence_loss_miner' as const,
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
      topResearchCandidateId: researchCandidates[0]?.selectorId || null,
      runtimeRankConsumerAllowedByThisReport: false as const,
      recommendation,
    },
    selectors,
    rows,
    blockers,
    recommendations: recommendation === 'validate_sequence_candidate_on_fresh_oos_replay'
      ? [
        'Treat the sequence selector as research-only until it survives fresh OOS scanner-artifact validation.',
        'Validate riskPoints<=10+htfLineBehindPrice against a later unseen scanner artifact before proposing any review note or rank penalty.',
        'Do not remove AfterLunchDriveFvgContinuation, do not loosen canExecute, and do not change Discord/Supabase/bridge behavior from this report.',
      ]
      : [
        'Mine additional known-at-proof structural context before any scanner-visible behavior changes.',
      ],
  };
  return { ...reportWithoutMarkdown, markdown: buildMarkdown(reportWithoutMarkdown) };
}

export function runCli(args = process.argv.slice(2)): UnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport {
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(reportDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const replayPackagePath = readFlag(args, '--replay-package') ||
    latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifact-replay-package-\d+\.json$/);
  const scannerArtifactPath = readFlag(args, '--scanner-artifact') ||
    latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifacts-.*-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport({
    reportDir,
    sourceProofTimingPath,
    replayPackagePath,
    scannerArtifactPath,
    sourceProofTimingReport: readJson(sourceProofTimingPath),
    replayPackageReport: readJson(replayPackagePath),
    scannerArtifactReport: readJson(scannerArtifactPath),
  });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-structural-sequence-loss-miner-${Date.now()}.json`);
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
