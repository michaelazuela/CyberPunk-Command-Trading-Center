import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskPublishDecision,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  type ScannerState,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

interface CliOptions {
  intakeTriagePath: string | null;
  broadReplayPath: string | null;
  outDir: string;
  json: boolean;
}

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  firstSeenTime: string;
  lastSeenTime: string;
  occurrences: number;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  candidateState: string | null;
  executionStatus: string | null;
  detectedStatus: string | null;
  blockReason: string | null;
  sourceFile: string;
  proofState: string;
  triageScore: number;
  triageDecision: string;
}

interface ReplayRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  outcomeBucket: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  entryHitTime: string | null;
  blockers: string[];
}

interface PublishableCandidateRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofState: string;
  candidateState: string | null;
  executionStatus: string | null;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  triageScore: number;
  occurrences: number;
  sourceFile: string;
  scannerVisibilityMode: string;
  deskTicketState: string;
  publishDisplaySource: string;
  publishShouldPost: boolean;
  publishHasCompletePlan: boolean;
  publishCanExecute: boolean;
  publishReason: string;
  outcomeBucket: string | null;
  outcomeLabel: string | null;
  resolvedOneMesPl: number | null;
  entryHitTime: string | null;
  publishableReviewCandidate: boolean;
  recommendation: 'candidate_for_publishable_review_replay' | 'hold_for_missing_publishability' | 'blocked';
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport {
  reportType: 'unified_positive_held_local_preview_publishable_candidate_miner';
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
    usesScannerOwnedBuilders: true;
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
    intakeTriagePath: string | null;
    broadReplayPath: string | null;
  };
  assumptions: {
    savedArtifactsOnly: true;
    scannerOwnedBuilderSnapshotOnly: true;
    noRuntimeSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    intakeRowsRead: number;
    replayRowsRead: number;
    completeGeometryRows: number;
    positiveProofRows: number;
    scannerPublishCompleteRows: number;
    scannerPublishShouldPostRows: number;
    publishCanExecuteTrueRows: number;
    publishableReviewCandidates: number;
    publishableWinners: number;
    publishableLosses: number;
    publishableUnresolved: number;
    publishableResolvedOneMesPl: number;
    modelGroups: Record<string, number>;
    sessionGroups: Record<string, number>;
    livePromotionAllowedRows: 0;
    recommendation: 'build_replay_package_for_publishable_candidates' | 'no_publishable_candidates_found' | 'fix_missing_input_reports';
  };
  rows: PublishableCandidateRow[];
  selectedReplayPackage: PublishableCandidateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const POSITIVE_PROOF_STATES = new Set([
  'human_review_ready',
  'opening_observation_armed',
  'after_lunch_drive_armed',
  'mss_hold_confirmed',
]);

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

export function parseUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    intakeTriagePath: readFlag(args, '--intake-triage') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/),
    broadReplayPath: readFlag(args, '--broad-replay') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-broad-replay-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function rowsFrom<T>(report: { rows?: unknown } | null): T[] {
  return Array.isArray(report?.rows) ? report.rows as T[] : [];
}

function setupType(value: string): SetupType {
  return Object.values(SetupType).includes(value as SetupType) ? value as SetupType : SetupType.NoSetup;
}

function executionStatus(value: string | null): ExecutionStatus {
  return Object.values(ExecutionStatus).includes(value as ExecutionStatus) ? value as ExecutionStatus : ExecutionStatus.Conditional;
}

function blockReason(value: string | null): NoTradeReason | null {
  if (!value) return null;
  return Object.values(NoTradeReason).includes(value as NoTradeReason) ? value as NoTradeReason : NoTradeReason.NoApprovedSetup;
}

function hasCompleteGeometry(row: IntakeRow): boolean {
  return row.entry !== null && row.stop !== null && row.target1 !== null && row.target2 !== null && row.riskPoints !== null;
}

function directionallyValid(row: IntakeRow): boolean {
  if (row.entry === null || row.stop === null) return false;
  return row.direction === 'LONG' ? row.stop < row.entry : row.stop > row.entry;
}

function scannerStateFor(row: IntakeRow): ScannerState {
  const status = executionStatus(row.executionStatus);
  if (status === ExecutionStatus.Executable) return 'Executable';
  if (status === ExecutionStatus.Blocked) return 'Blocked';
  if (row.blockReason === 'EntryTriggerPending' || row.blockReason === 'EntryTriggerMissing') return 'TriggerPending';
  return 'Conditional';
}

function eventDateEt(row: IntakeRow): Date {
  const time = row.firstSeenTime || `${row.tradeDate}T09:30:00`;
  return new Date(`${time.replace(/\.0000000$/, '')}-04:00`);
}

function candidateFrom(row: IntakeRow): SetupCandidate {
  const reason = blockReason(row.blockReason);
  return {
    setupType: setupType(row.setupType),
    scenarioLabel: `Saved reviewed-positive intake ${row.setupType} ${row.direction}`,
    direction: row.direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: row.triageScore >= 220 ? 'High' : row.triageScore >= 170 ? 'Medium' : 'Low',
    priority: row.triageScore,
    entry: row.entry,
    stop: row.stop,
    target1: row.target1,
    target2: row.target2,
    riskPoints: row.riskPoints,
    invalidation: row.stop === null ? null : row.direction === 'LONG'
      ? `Invalid if price trades below protected 5M stop ${row.stop}.`
      : `Invalid if price trades above protected 5M stop ${row.stop}.`,
    rankScore: row.triageScore,
    evidence: [
      `Saved intake proof state: ${row.proofState}.`,
      `Source tape: ${row.sourceFile}.`,
    ],
    missingEvidence: reason ? [`Blocked reason: ${reason}.`] : [],
    executionStatus: executionStatus(row.executionStatus),
    blockReason: reason,
    requiredTrigger: `Review ${row.setupType} ${row.direction} at ${row.entry}; 5M remains execution authority.`,
    nextAction: 'Research-only scanner-owned publishability snapshot. No live post or execution approval.',
    reducedRiskPlan: null,
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: false,
      reason: 'Research-only publishable candidate miner; live Discord remains disabled.',
    },
  };
}

function replayKey(row: Pick<IntakeRow, 'tradeDate' | 'session' | 'setupType' | 'direction'>): string {
  return `${row.tradeDate}|${row.session}|${row.setupType}|${row.direction}`;
}

function replayMap(rows: ReplayRow[]): Map<string, ReplayRow> {
  const map = new Map<string, ReplayRow>();
  for (const row of rows) map.set(replayKey(row), row);
  return map;
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] || 0) + 1;
}

function rowFor(input: IntakeRow, replay: ReplayRow | null): PublishableCandidateRow {
  const candidate = candidateFrom(input);
  const state = scannerStateFor(input);
  const window = resolveScannerWindow(eventDateEt(input));
  const canExecute = false;
  const alertDecision = { shouldSend: false, reason: 'Research-only publishable candidate miner. No live Discord post.' };
  const visibility = classifyScannerVisibility({ state, candidate, window, alertDecision, canExecute });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [candidate],
    selectedCandidate: candidate,
    state,
    window,
    alertDecision,
    canExecute,
  });
  const deskState = buildDeskState({
    state,
    candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute,
    currentPrice: null,
    asOfCompleted5mTime: input.firstSeenTime,
  });
  const publishDecision = buildDeskPublishDecision({ deskState, completed5mTime: input.firstSeenTime });
  const blockers = [
    hasCompleteGeometry(input) ? null : 'missing entry, stop, T1, T2, or riskPoints',
    directionallyValid(input) ? null : 'directionally invalid entry-to-stop geometry',
    POSITIVE_PROOF_STATES.has(input.proofState) ? null : `proof state ${input.proofState} is not publishable-positive`,
    input.blockReason ? `blockReason=${input.blockReason}` : null,
    publishDecision.hasCompletePlan ? null : 'scanner-owned publish decision lacks complete plan',
    publishDecision.shouldPost ? null : 'scanner-owned publish decision would not post',
    publishDecision.canExecute ? 'canExecute unexpectedly true' : null,
  ].filter((item): item is string => Boolean(item));
  const publishableReviewCandidate = blockers.length === 0;
  return {
    intakeId: input.intakeId,
    tradeDate: input.tradeDate,
    session: input.session,
    setupType: input.setupType,
    direction: input.direction,
    proofState: input.proofState,
    candidateState: input.candidateState,
    executionStatus: input.executionStatus,
    blockReason: input.blockReason,
    entry: input.entry,
    stop: input.stop,
    target1: input.target1,
    target2: input.target2,
    riskPoints: input.riskPoints,
    triageScore: input.triageScore,
    occurrences: input.occurrences,
    sourceFile: input.sourceFile,
    scannerVisibilityMode: visibility.visibilityMode,
    deskTicketState: deskState.deskTicket.state,
    publishDisplaySource: publishDecision.displaySource,
    publishShouldPost: publishDecision.shouldPost,
    publishHasCompletePlan: publishDecision.hasCompletePlan,
    publishCanExecute: publishDecision.canExecute,
    publishReason: publishDecision.reason,
    outcomeBucket: replay?.outcomeBucket || null,
    outcomeLabel: replay?.outcomeLabel || null,
    resolvedOneMesPl: replay?.resolvedOneMesPl ?? null,
    entryHitTime: replay?.entryHitTime || null,
    publishableReviewCandidate,
    recommendation: publishableReviewCandidate ? 'candidate_for_publishable_review_replay' : input.blockReason ? 'blocked' : 'hold_for_missing_publishability',
    blockers,
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport, 'markdown'>): string {
  return [
    '# Publishable Candidate Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only scanner-owned publishability snapshot. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trading logic.',
    '',
    '## Summary',
    `- Intake rows read: ${report.summary.intakeRowsRead}.`,
    `- Replay rows read: ${report.summary.replayRowsRead}.`,
    `- Complete geometry rows: ${report.summary.completeGeometryRows}.`,
    `- Positive proof rows: ${report.summary.positiveProofRows}.`,
    `- Scanner publish complete rows: ${report.summary.scannerPublishCompleteRows}.`,
    `- Scanner publish shouldPost rows: ${report.summary.scannerPublishShouldPostRows}.`,
    `- Publish canExecute true rows: ${report.summary.publishCanExecuteTrueRows}.`,
    `- Publishable review candidates: ${report.summary.publishableReviewCandidates}.`,
    `- Publishable outcomes: winners=${report.summary.publishableWinners}, losses=${report.summary.publishableLosses}, unresolved=${report.summary.publishableUnresolved}, P/L=${report.summary.publishableResolvedOneMesPl.toFixed(2)}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selected Replay Package',
    '| Date | Session | Model | Side | Proof | Outcome | P/L | Entry | Stop | T1 | T2 |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.selectedReplayPackage.map((row) => `| ${row.tradeDate} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.proofState} | ${row.outcomeBucket || '-'} | ${row.resolvedOneMesPl ?? '-'} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport(args: {
  intakeTriagePath: string | null;
  intakeTriageReport: { rows?: unknown } | null;
  broadReplayPath: string | null;
  broadReplayReport: { rows?: unknown } | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport {
  const intakeRows = rowsFrom<IntakeRow>(args.intakeTriageReport);
  const replayRows = rowsFrom<ReplayRow>(args.broadReplayReport);
  const outcomes = replayMap(replayRows);
  const rows = intakeRows.map((row) => rowFor(row, outcomes.get(replayKey(row)) || null));
  const publishable = rows.filter((row) => row.publishableReviewCandidate)
    .sort((a, b) =>
      (b.resolvedOneMesPl ?? -999999) - (a.resolvedOneMesPl ?? -999999) ||
      b.triageScore - a.triageScore ||
      a.intakeId.localeCompare(b.intakeId)
    );
  const modelGroups: Record<string, number> = {};
  const sessionGroups: Record<string, number> = {};
  for (const row of publishable) {
    increment(modelGroups, row.setupType);
    increment(sessionGroups, row.session);
  }
  const blockers = [
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    intakeRows.length === 0 ? 'intake triage has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const selectedReplayPackage = publishable.slice(0, 24);
  const base: Omit<UnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_publishable_candidate_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      usesScannerOwnedBuilders: true,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
    },
    source: {
      intakeTriagePath: args.intakeTriagePath,
      broadReplayPath: args.broadReplayPath,
    },
    assumptions: {
      savedArtifactsOnly: true,
      scannerOwnedBuilderSnapshotOnly: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      intakeRowsRead: intakeRows.length,
      replayRowsRead: replayRows.length,
      completeGeometryRows: intakeRows.filter(hasCompleteGeometry).length,
      positiveProofRows: rows.filter((row) => POSITIVE_PROOF_STATES.has(row.proofState)).length,
      scannerPublishCompleteRows: rows.filter((row) => row.publishHasCompletePlan).length,
      scannerPublishShouldPostRows: rows.filter((row) => row.publishShouldPost).length,
      publishCanExecuteTrueRows: rows.filter((row) => row.publishCanExecute).length,
      publishableReviewCandidates: publishable.length,
      publishableWinners: publishable.filter((row) => row.outcomeBucket === 'winner').length,
      publishableLosses: publishable.filter((row) => row.outcomeBucket === 'loss').length,
      publishableUnresolved: publishable.filter((row) => !row.outcomeBucket || row.outcomeBucket === 'unresolved').length,
      publishableResolvedOneMesPl: publishable.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0),
      modelGroups,
      sessionGroups,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_missing_input_reports'
        : publishable.length
          ? 'build_replay_package_for_publishable_candidates'
          : 'no_publishable_candidates_found',
    },
    rows,
    selectedReplayPackage,
    blockers,
    recommendations: [
      publishable.length
        ? 'Build the next replay package from the selected publishable review candidates, preserving scanner-owned DeskState/DeskPublishDecision boundaries.'
        : 'No publishable candidates were found from saved intake rows; refresh intake artifacts before changing scanner behavior.',
      'Do not change Discord posting, Supabase writes, canExecute, ranking, entry, stop, target, or risk from this miner.',
      'Use joined outcome labels as research context only; outcome data must not approve execution.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport(report: UnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-publishable-candidate-miner-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-publishable-candidate-miner-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport({
    intakeTriagePath: options.intakeTriagePath,
    intakeTriageReport: readJson<{ rows?: unknown }>(options.intakeTriagePath),
    broadReplayPath: options.broadReplayPath,
    broadReplayReport: readJson<{ rows?: unknown }>(options.broadReplayPath),
  });
  const written = writeUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
