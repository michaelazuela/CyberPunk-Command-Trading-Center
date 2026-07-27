import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  type DeskState,
} from '../../src/lib/localScannerEngine';
import { runBridgeDiagnosticReplay, type BridgeDiagnosticReplayInput, type DiagnosticScannerAuditEvent } from '../../src/agents/bridgeDiagnosticReplayAgent';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';

export interface Phase9FReplayValidationAuditReport {
  reportType: 'phase_9f_replay_validation_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRanking: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
  rootDir: string;
  filesScanned: string[];
  status: 'pass' | 'fail';
  summary: {
    phase9FStatus: string;
    cycleCount: number;
    watchBeforeMove: string;
    lineMatched: string;
    promotionCorrect: string;
    noChasePreserved: string;
    noTradeExplained: string;
    consumersAligned: string;
    noAuthorityChange: boolean;
  };
  findings: string[];
  markdown: string;
}

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

const bars5m = [
  bar('2026-05-29T09:30:00', 100, 101, 99, 100.5),
  bar('2026-05-29T09:35:00', 100.5, 101, 100, 100.75),
  bar('2026-05-29T09:40:00', 100.75, 108, 100.5, 107.5),
  bar('2026-05-29T09:45:00', 107.5, 109, 106.5, 108.5),
  bar('2026-05-29T09:50:00', 108.5, 110, 103, 104.5),
  bar('2026-05-29T09:55:00', 104.5, 109, 104, 108.75),
  bar('2026-05-29T10:00:00', 108.75, 112, 108, 111.5),
  bar('2026-05-29T10:05:00', 111.5, 114, 111, 113.5),
];
const bars15m = [
  bar('2026-05-29T09:30:00', 100, 103, 99, 102),
  bar('2026-05-29T09:45:00', 102, 111, 101.5, 110),
  bar('2026-05-29T10:00:00', 110, 114, 108, 113),
];
const bars60m = [
  bar('2026-05-29T08:00:00', 96, 100, 95, 99),
  bar('2026-05-29T09:00:00', 99, 106, 98, 105),
  bar('2026-05-29T10:00:00', 105, 114, 104, 113),
];
const bars240m = [
  bar('2026-05-29T02:00:00', 92, 98, 91, 97),
  bar('2026-05-29T06:00:00', 97, 106, 96, 104),
  bar('2026-05-29T10:00:00', 104, 114, 103, 113),
];

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 98,
    entry: 108,
    stop: 103,
    target1: 115.5,
    target2: 118,
    riskPoints: 5,
    invalidation: 'Below 103',
    evidence: ['Liquidity sweep', 'Reclaim after sweep', 'Displacement', 'Market structure shift', 'FVG retrace', 'Clean 1.5R path'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M reclaim from FVG. No chase before confirmation.',
    nextAction: 'Wait for completed 5M proof.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function deskStateFor(state: 'Watching' | 'Conditional' | 'Blocked', setupCandidate: SetupCandidate): DeskState {
  const visibility = classifyScannerVisibility({
    state,
    candidate: setupCandidate,
    alertDecision: { shouldSend: true, reason: `${state} fixture alert.` },
    canExecute: false,
  });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [setupCandidate],
    selectedCandidate: setupCandidate,
    state,
    alertDecision: { shouldSend: true, reason: `${state} fixture alert.` },
    canExecute: false,
  });
  return buildDeskState({
    state,
    candidate: setupCandidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute: false,
  });
}

function auditEvent(state: 'Watching' | 'Conditional' | 'Blocked', setupCandidate: SetupCandidate, time: string): DiagnosticScannerAuditEvent {
  return {
    alertTimestamp: '2026-05-29T14:00:00Z',
    marketTimestamp: time,
    tradeDate: '2026-05-29',
    instrument: 'MES',
    session: 'morning',
    alertType: 'diagnostic',
    candidateSetupType: setupCandidate.setupType,
    direction: setupCandidate.direction,
    scannerState: state,
    selectedCandidateDirection: setupCandidate.direction,
    selectedCandidateStatus: setupCandidate.executionStatus,
    healthStatus: null,
    watchlistType: null,
    watchlistStatus: null,
    suppressionOrBlockReason: setupCandidate.blockReason || null,
    auditWarnings: [],
    discordAlertSent: true,
    attachmentsGenerated: false,
    outcomeButtonsIncluded: false,
    ragOrSupabaseWriteAttempted: false,
    deskState: deskStateFor(state, setupCandidate),
    originalFilePath: `phase9f-fixture-${time}.json`,
  };
}

function input(events: DiagnosticScannerAuditEvent[]): BridgeDiagnosticReplayInput {
  return {
    tradeDate: '2026-05-29',
    instrument: 'MES',
    session: 'morning',
    bars5m,
    bars15m,
    bars60m,
    bars240m,
    replayWindow: { from: '09:30', to: '10:15' },
    suspectedMoveDirection: 'LONG',
    scannerAlertSent: false,
    scannerAuditEvents: events,
  };
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/agents/bridgeDiagnosticReplayAgent.ts',
    'src/agents/bridgeDiagnosticReplayAgent.test.ts',
    'src/lib/localScannerEngine.ts',
    'tools/automation/new-project-workflow-loopback.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => path.relative(rootDir, fullPath).replace(/\\/g, '/'));
}

export function buildPhase9FReplayValidationAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9FReplayValidationAuditReport {
  const watch = candidate({
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    missingEvidence: ['Completed 5M proof missing.'],
    nextAction: 'No chase. Wait for completed 5M proof.',
  });
  const conditional = candidate();
  const blocked = candidate({
    executionStatus: ExecutionStatus.Blocked,
    blockReason: null,
    riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
    riskPolicy: 'STRUCTURAL_RISK_ACKNOWLEDGED',
    missingEvidence: ['Extended structural risk review is required.'],
    requiredTrigger: 'Hold with reason: risk gate blocks execution; no trade until protected 5M structure improves.',
  });
  const replay = runBridgeDiagnosticReplay(input([
    auditEvent('Watching', watch, '2026-05-29T09:50:00'),
    auditEvent('Conditional', conditional, '2026-05-29T09:55:00'),
    auditEvent('Blocked', blocked, '2026-05-29T10:00:00'),
  ]));
  const phase9f = replay.phase9FReplayValidation;
  const noAuthorityChange =
    !phase9f.authority.replayApprovesTrade &&
    !phase9f.authority.replayChangesCanExecute &&
    !phase9f.authority.replayChangesScannerBehavior &&
    !phase9f.authority.replayChangesDiscordBehavior &&
    !phase9f.authority.replayChangesBridgeBehavior;
  const findings = [
    phase9f.status === 'pass' ? null : `Phase 9F status=${phase9f.status}`,
    replay.deskStateReplayValidation.watchAppearedBeforePlan ? null : 'Watch did not appear before plan/review.',
    replay.deskStateReplayValidation.watchToPlanPromotionProofed ? null : 'Promotion proof metadata missing.',
    noAuthorityChange ? null : 'Replay authority boundary changed.',
  ].filter((item): item is string => Boolean(item));
  const reportWithoutMarkdown: Omit<Phase9FReplayValidationAuditReport, 'markdown'> = {
    reportType: 'phase_9f_replay_validation_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRanking: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' as const : 'pass' as const,
    summary: {
      phase9FStatus: phase9f.status,
      cycleCount: replay.deskStateReplayValidation.cycleCount,
      watchBeforeMove: phase9f.checks.watchAppearedBeforeMove.status,
      lineMatched: phase9f.checks.lineInSandMatchedMarketStructure.status,
      promotionCorrect: phase9f.checks.planPromotedCorrectly.status,
      noChasePreserved: phase9f.checks.noChasePreserved.status,
      noTradeExplained: phase9f.checks.noTradeExplainedClearly.status,
      consumersAligned: phase9f.checks.discordRagUiReflectSameDeskState.status,
      noAuthorityChange,
    },
    findings,
  };
  const markdown = [
    '# Phase 9F Replay Validation Audit',
    '',
    `Status: ${reportWithoutMarkdown.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, change ranking, change risk rules, change bridge behavior, or change entry/stop/target math.',
    '',
    `Replay: phase9F=${reportWithoutMarkdown.summary.phase9FStatus}; cycles=${reportWithoutMarkdown.summary.cycleCount}; watch=${reportWithoutMarkdown.summary.watchBeforeMove}; line=${reportWithoutMarkdown.summary.lineMatched}; promotion=${reportWithoutMarkdown.summary.promotionCorrect}; noChase=${reportWithoutMarkdown.summary.noChasePreserved}; noTrade=${reportWithoutMarkdown.summary.noTradeExplained}; consumers=${reportWithoutMarkdown.summary.consumersAligned}; noAuthorityChange=${reportWithoutMarkdown.summary.noAuthorityChange}.`,
    '',
    reportWithoutMarkdown.findings.length ? `Findings:\n${reportWithoutMarkdown.findings.map((item) => `- ${item}`).join('\n')}` : 'Findings: none.',
  ].join('\n');
  return { ...reportWithoutMarkdown, markdown };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildPhase9FReplayValidationAudit();
  console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : report.markdown);
  if (report.status !== 'pass') process.exitCode = 1;
}
