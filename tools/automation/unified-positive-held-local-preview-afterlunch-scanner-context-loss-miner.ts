import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type ReplayRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number];

interface ScannerFeatureRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  outcomeLabel: TimingRow['outcomeLabel'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  issueTags: string[];
  candidateState: string;
  detectedStatus: string;
  executionStatus: string;
  blockReason: string | null;
  humanReviewStatus: string;
  discordTradePlanEligible: boolean;
  canExecute: boolean;
  targetRoomStatus: string;
  cleanPathToT1: boolean | null;
  obstacleBeforeT1: boolean | null;
  targetRoomReason: string | null;
  htfLineInSandStatus: string;
  htfLineInSandLevel: number | null;
  htfLineInSandBlocked: boolean;
  htfOpposingMssCaution: boolean;
  activeTimeframeMssPassed: boolean;
  riskAdvisoryStatus: string;
  riskPolicy: string;
  modelConfidenceScore: number | null;
  tacticalZoneAgeMinutes: number | null;
  joinStatus: 'matched_scanner_candidate' | 'missing_replay_row' | 'missing_scanner_event' | 'missing_scanner_candidate';
}

interface BucketSummary {
  bucketId: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
  lossCoverage: number;
  winnerCollisionRows: number;
  researchRead: 'loss_separator_candidate' | 'too_broad' | 'insufficient_rows';
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_scanner_context_loss_miner';
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
    lossRowsWithTargetRoomBlockedBeforeT1: number;
    winnerRowsWithTargetRoomBlockedBeforeT1: number;
    lossRowsWithHtfLineBlocked: number;
    winnerRowsWithHtfLineBlocked: number;
    lossRowsWithOpposingHtfMssCaution: number;
    winnerRowsWithOpposingHtfMssCaution: number;
    candidateSeparators: number;
    topSeparatorId: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_target_room_caution_as_review_note' | 'mine_additional_structural_context' | 'fix_inputs';
  };
  buckets: BucketSummary[];
  lossRows: ScannerFeatureRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport['authority'] {
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

function isWinner(row: Pick<ScannerFeatureRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('winner');
}

function isLoss(row: Pick<ScannerFeatureRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('loss');
}

function minutesBetween(start: string | null | undefined, end: string): number | null {
  if (!start) return null;
  const delta = (Date.parse(end) - Date.parse(start)) / 60000;
  return Number.isFinite(delta) ? round(delta) : null;
}

function approxEqual(a: unknown, b: unknown): boolean {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= 0.01;
}

function eventByProofTime(scannerArtifact: any, proofTime: string): any | null {
  const events = scannerArtifact?.events;
  if (!events || typeof events !== 'object') return null;
  return events[proofTime] || events[`${proofTime}:00`] || null;
}

function candidateRows(event: any): any[] {
  const statuses = event?.setupCandidateStatus?.statuses;
  return Array.isArray(statuses) ? statuses : [];
}

function findCandidate(event: any, timing: TimingRow, replay: ReplayRow | null): any | null {
  const candidates = candidateRows(event).filter((candidate) => (
    candidate?.setupType === SETUP &&
    candidate?.direction === timing.direction
  ));
  if (candidates.length === 0) return null;
  const exact = replay
    ? candidates.find((candidate) => (
      approxEqual(candidate.entry, replay.entry) &&
      approxEqual(candidate.stop, replay.stop) &&
      approxEqual(candidate.target1, replay.t1) &&
      approxEqual(candidate.target2, replay.t2)
    ))
    : null;
  return exact || candidates[0] || null;
}

function ruleset(candidate: any, key: string): any {
  return candidate?.activeRuleset?.[key] || {};
}

function buildRow(timing: TimingRow, replay: ReplayRow | null, scannerArtifact: any): ScannerFeatureRow {
  const event = eventByProofTime(scannerArtifact, timing.proofTime);
  const candidate = event ? findCandidate(event, timing, replay) : null;
  const htfLine = ruleset(candidate, 'htfLineInSand');
  const timeframeMss = ruleset(candidate, 'timeframeMss');
  const evidence = Array.isArray(candidate?.evidence) ? candidate.evidence.map(String) : [];
  const targetRoom = candidate?.targetRoom || {};
  return {
    ticketId: timing.ticketId,
    tradeDate: timing.tradeDate,
    session: timing.session,
    setupType: timing.setupType,
    direction: timing.direction,
    proofTime: timing.proofTime,
    outcomeBucket: timing.outcomeBucket,
    outcomeLabel: timing.outcomeLabel,
    resolvedOneMesPl: timing.resolvedOneMesPl,
    riskPoints: timing.riskPoints,
    issueTags: timing.issueTags,
    candidateState: candidate?.candidateState || 'unknown',
    detectedStatus: candidate?.detectedStatus || 'unknown',
    executionStatus: candidate?.executionStatus || 'unknown',
    blockReason: candidate?.blockReason ?? null,
    humanReviewStatus: candidate?.humanReview?.status || 'unknown',
    discordTradePlanEligible: Boolean(candidate?.humanReview?.discordTradePlanEligible),
    canExecute: Boolean(candidate?.humanReview?.canExecute),
    targetRoomStatus: targetRoom.targetRoomStatus || 'unknown',
    cleanPathToT1: typeof targetRoom.cleanPathToT1 === 'boolean' ? targetRoom.cleanPathToT1 : null,
    obstacleBeforeT1: typeof targetRoom.obstacleBeforeT1 === 'boolean' ? targetRoom.obstacleBeforeT1 : null,
    targetRoomReason: targetRoom.targetRoomReason || null,
    htfLineInSandStatus: htfLine.status || 'unknown',
    htfLineInSandLevel: typeof htfLine.lineInSand === 'number' ? htfLine.lineInSand : null,
    htfLineInSandBlocked: htfLine.status === 'blocked',
    htfOpposingMssCaution: evidence.some((item) => item.includes('HTF caution') && item.includes('opposing completed')),
    activeTimeframeMssPassed: timeframeMss.status === 'passed',
    riskAdvisoryStatus: candidate?.riskAdvisoryStatus || 'unknown',
    riskPolicy: candidate?.riskPolicy || 'unknown',
    modelConfidenceScore: typeof candidate?.modelConfidenceScore === 'number' ? candidate.modelConfidenceScore : null,
    tacticalZoneAgeMinutes: minutesBetween(candidate?.tacticalZone?.formedAt, timing.proofTime),
    joinStatus: !replay
      ? 'missing_replay_row'
      : !event
        ? 'missing_scanner_event'
        : !candidate
          ? 'missing_scanner_candidate'
          : 'matched_scanner_candidate',
  };
}

function featureValues(row: ScannerFeatureRow): string[] {
  return [
    `targetRoomStatus=${row.targetRoomStatus}`,
    `cleanPathToT1=${row.cleanPathToT1}`,
    `obstacleBeforeT1=${row.obstacleBeforeT1}`,
    `htfLineStatus=${row.htfLineInSandStatus}`,
    `htfLineBlocked=${row.htfLineInSandBlocked}`,
    `opposingHtfMssCaution=${row.htfOpposingMssCaution}`,
    `activeTimeframeMssPassed=${row.activeTimeframeMssPassed}`,
    `candidateState=${row.candidateState}`,
    `humanReviewStatus=${row.humanReviewStatus}`,
    `discordEligible=${row.discordTradePlanEligible}`,
    `riskAdvisoryStatus=${row.riskAdvisoryStatus}`,
    `targetRoom+line=${row.targetRoomStatus}|${row.htfLineInSandStatus}`,
    `targetRoom+opposingHtf=${row.targetRoomStatus}|${row.htfOpposingMssCaution}`,
    `line+opposingHtf=${row.htfLineInSandStatus}|${row.htfOpposingMssCaution}`,
    `targetRoom+line+opposingHtf=${row.targetRoomStatus}|${row.htfLineInSandStatus}|${row.htfOpposingMssCaution}`,
  ];
}

function bucketSummaries(rows: ScannerFeatureRow[]): BucketSummary[] {
  const groups = new Map<string, ScannerFeatureRow[]>();
  for (const row of rows) {
    for (const feature of featureValues(row)) {
      groups.set(feature, [...(groups.get(feature) || []), row]);
    }
  }
  const totalLosses = rows.filter(isLoss).length;
  return [...groups.entries()]
    .map(([bucketId, group]) => {
      const losses = group.filter(isLoss).length;
      const winners = group.filter(isWinner).length;
      const lossCoverage = totalLosses ? round(losses / totalLosses) : 0;
      const researchRead: BucketSummary['researchRead'] = losses > 0 && lossCoverage === 1 && winners <= losses
        ? 'loss_separator_candidate'
        : losses > 0
          ? 'too_broad'
          : 'insufficient_rows';
      return {
        bucketId,
        rows: group.length,
        winners,
        losses,
        unresolved: group.filter((row) => !isWinner(row) && !isLoss(row)).length,
        grossResolvedOneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
        lossCoverage,
        winnerCollisionRows: winners,
        researchRead,
      };
    })
    .sort((a, b) => {
      const order = { loss_separator_candidate: 0, too_broad: 1, insufficient_rows: 2 };
      if (a.researchRead !== b.researchRead) return order[a.researchRead] - order[b.researchRead];
      return b.lossCoverage - a.lossCoverage || a.winnerCollisionRows - b.winnerCollisionRows || a.bucketId.localeCompare(b.bucketId);
    });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Scanner Context Loss Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only scanner-context diagnostic. It reads saved source/proof timing, replay-package, and scanner-artifact JSON only. It does not run setupScanner, post Discord, write Supabase, read the live bridge, loosen canExecute, change scanner behavior, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source/matched rows: ${report.summary.sourceRows}/${report.summary.matchedRows}.`,
    `- W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Target-room blocked before T1, loss/winner rows: ${report.summary.lossRowsWithTargetRoomBlockedBeforeT1}/${report.summary.winnerRowsWithTargetRoomBlockedBeforeT1}.`,
    `- HTF line blocked, loss/winner rows: ${report.summary.lossRowsWithHtfLineBlocked}/${report.summary.winnerRowsWithHtfLineBlocked}.`,
    `- Opposing HTF MSS caution, loss/winner rows: ${report.summary.lossRowsWithOpposingHtfMssCaution}/${report.summary.winnerRowsWithOpposingHtfMssCaution}.`,
    `- Candidate separators: ${report.summary.candidateSeparators}.`,
    `- Top separator: ${report.summary.topSeparatorId ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Buckets',
    '| Read | Bucket | Rows | W/L/U | P/L | Loss Coverage | Winner Collisions |',
    '|---|---|---:|---|---:|---:|---:|',
    ...report.buckets.slice(0, 30).map((bucket) => `| ${bucket.researchRead} | ${escapeTable(bucket.bucketId)} | ${bucket.rows} | ${bucket.winners}/${bucket.losses}/${bucket.unresolved} | ${bucket.grossResolvedOneMesPl ?? '-'} | ${bucket.lossCoverage} | ${bucket.winnerCollisionRows} |`),
    '',
    '## Loss Rows',
    '| Ticket | Proof | Dir | P/L | Target Room | Line Status | Opposing HTF | Candidate State | Discord Eligible | Reason |',
    '|---|---|---|---:|---|---|---|---|---|---|',
    ...report.lossRows.map((row) => `| ${row.ticketId} | ${row.proofTime} | ${row.direction} | ${row.resolvedOneMesPl ?? '-'} | ${escapeTable(row.targetRoomStatus)} | ${escapeTable(row.htfLineInSandStatus)} | ${row.htfOpposingMssCaution} | ${escapeTable(row.candidateState)} | ${row.discordTradePlanEligible} | ${escapeTable(row.targetRoomReason ?? '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
    '',
    report.blockers.length ? `Blockers: ${report.blockers.join('; ')}` : 'Blockers: none.',
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  replayPackagePath: string | null;
  scannerArtifactPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  scannerArtifactReport: any | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport {
  const sourceRows = (args.sourceProofTimingReport?.rows || []).filter((row) => row.setupType === SETUP);
  const replayByTicket = new Map((args.replayPackageReport?.rows || []).map((row) => [row.ticketId, row]));
  const rows = sourceRows.map((row) => buildRow(row, replayByTicket.get(row.ticketId) || null, args.scannerArtifactReport));
  const matchedRows = rows.filter((row) => row.joinStatus === 'matched_scanner_candidate');
  const buckets = bucketSummaries(matchedRows);
  const lossRows = matchedRows.filter(isLoss);
  const winnerRows = matchedRows.filter(isWinner);
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
  const candidateSeparators = buckets.filter((bucket) => bucket.researchRead === 'loss_separator_candidate');
  const recommendation: UnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : candidateSeparators.some((bucket) => bucket.bucketId.startsWith('targetRoomStatus=blocked_before_t1') || bucket.bucketId.includes('blocked_before_t1|blocked|true'))
      ? 'validate_target_room_caution_as_review_note'
      : 'mine_additional_structural_context';
  const reportWithoutMarkdown = {
    reportType: 'unified_positive_held_local_preview_afterlunch_scanner_context_loss_miner' as const,
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
      losses: lossRows.length,
      unresolved: matchedRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      grossResolvedOneMesPl: sum(matchedRows.map((row) => row.resolvedOneMesPl)),
      lossRowsWithTargetRoomBlockedBeforeT1: lossRows.filter((row) => row.targetRoomStatus === 'blocked_before_t1').length,
      winnerRowsWithTargetRoomBlockedBeforeT1: winnerRows.filter((row) => row.targetRoomStatus === 'blocked_before_t1').length,
      lossRowsWithHtfLineBlocked: lossRows.filter((row) => row.htfLineInSandBlocked).length,
      winnerRowsWithHtfLineBlocked: winnerRows.filter((row) => row.htfLineInSandBlocked).length,
      lossRowsWithOpposingHtfMssCaution: lossRows.filter((row) => row.htfOpposingMssCaution).length,
      winnerRowsWithOpposingHtfMssCaution: winnerRows.filter((row) => row.htfOpposingMssCaution).length,
      candidateSeparators: candidateSeparators.length,
      topSeparatorId: candidateSeparators[0]?.bucketId || null,
      runtimeRankConsumerAllowedByThisReport: false as const,
      recommendation,
    },
    buckets,
    lossRows,
    blockers,
    recommendations: recommendation === 'validate_target_room_caution_as_review_note'
      ? [
        'Do not install a rank boost from the rejected proof-time proxy.',
        'Validate a review-note or rank-penalty candidate around target-room obstruction plus HTF line-in-the-sand conflict on a broader OOS package.',
        'Keep AfterLunchDriveFvgContinuation valid as human-review only; this report does not remove the model or loosen canExecute.',
      ]
      : [
        'Mine additional known-at-proof structural fields before any scanner-visible behavior changes.',
        'Keep AfterLunchDriveFvgContinuation valid as human-review only until a broader separator survives OOS.',
      ],
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

export function runCli(args = process.argv.slice(2)): UnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport {
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(reportDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const replayPackagePath = readFlag(args, '--replay-package') ||
    latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifact-replay-package-\d+\.json$/);
  const scannerArtifactPath = readFlag(args, '--scanner-artifact') ||
    latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifacts-.*-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport({
    reportDir,
    sourceProofTimingPath,
    replayPackagePath,
    scannerArtifactPath,
    sourceProofTimingReport: readJson(sourceProofTimingPath),
    replayPackageReport: readJson(replayPackagePath),
    scannerArtifactReport: readJson(scannerArtifactPath),
  });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-scanner-context-loss-miner-${Date.now()}.json`);
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
