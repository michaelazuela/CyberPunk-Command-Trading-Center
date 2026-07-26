import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  validateDeskStateReplayPath,
  type DeskState,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

export interface ActiveDeskStateAuditFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface Phase9CActiveDeskStateAuditReport {
  reportType: 'phase_9c_active_desk_state_audit';
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
    deskStateSnapshots: number;
    watchSnapshots: number;
    planOrReviewSnapshots: number;
    sourceOfTruthAligned: boolean;
    visibilityAligned: boolean;
    promotionPathObserved: boolean;
    canExecuteBoundaryPreserved: boolean;
    noChasePreserved: boolean;
    replayFindings: number;
  };
  checks: string[];
  findings: ActiveDeskStateAuditFinding[];
  markdown: string;
}

function authority(): Phase9CActiveDeskStateAuditReport['authority'] {
  return {
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
  };
}

function finding(checkId: string, reason: string, evidence: string[]): ActiveDeskStateAuditFinding {
  return { checkId, reason, evidence };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/lib/localScannerEngine.ts',
    'src/lib/localScannerEngine.test.ts',
    'tools/automation/new-project-workflow-loopback.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
}

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'Active DeskState audit conditional plan',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 98,
    entry: 7469.75,
    stop: 7459.75,
    target1: 7484.75,
    target2: 7489.75,
    riskPoints: 10,
    invalidation: 'Invalid below protected 5M swing low.',
    rankScore: 97,
    evidence: ['Sweep reclaimed', 'MSS confirmed', 'FVG retrace available'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M close above 7469.75, then retest holds.',
    nextAction: 'Wait for completed 5M proof.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function buildDeskStateFixture(): DeskState[] {
  const window = resolveScannerWindow(new Date('2026-06-26T10:05:00-04:00'));
  const watchCandidate = candidate({
    scenarioLabel: 'Active DeskState audit watch missing entry proof',
    entry: null,
    stop: 7459.75,
    target1: null,
    target2: null,
    riskPoints: null,
    missingEvidence: ['Completed 5M close above line in the sand missing.'],
    missingLevels: [
      {
        key: 'entry',
        label: 'Entry trigger',
        reason: 'No completed 5M close through the line in the sand.',
        source: '5m_execution',
        requiredFor: 'entry',
      },
    ],
    requiredTrigger: 'Completed 5M close above 7469.75, then retest holds. No chase before proof.',
  });
  const watchTrace = buildCandidateLifecycleTrace({
    candidates: [watchCandidate],
    selectedCandidate: watchCandidate,
    state: 'TriggerPending',
    window,
    alertDecision: { shouldSend: false, reason: 'Watch held until completed 5M proof.' },
    canExecute: false,
  });
  const watchVisibility = classifyScannerVisibility({
    state: 'TriggerPending',
    candidate: watchCandidate,
    window,
    alertDecision: { shouldSend: false, reason: 'Watch held until completed 5M proof.' },
    canExecute: false,
  });
  const watchState = buildDeskState({
    state: 'TriggerPending',
    candidate: watchCandidate,
    visibilityMetadata: watchVisibility,
    candidateLifecycleTrace: watchTrace,
    canExecute: false,
    currentPrice: 7466.5,
  });

  const reviewCandidate = candidate();
  const reviewTrace = buildCandidateLifecycleTrace({
    candidates: [reviewCandidate],
    selectedCandidate: reviewCandidate,
    state: 'Executable',
    window,
    alertDecision: { shouldSend: false, reason: 'Discord duplicate suppressed by durable ledger.' },
    canExecute: false,
  });
  const reviewVisibility = classifyScannerVisibility({
    state: 'Executable',
    candidate: reviewCandidate,
    window,
    alertDecision: { shouldSend: false, reason: 'Discord duplicate suppressed by durable ledger.' },
    canExecute: false,
  });
  const reviewState = buildDeskState({
    state: 'Executable',
    candidate: reviewCandidate,
    visibilityMetadata: reviewVisibility,
    candidateLifecycleTrace: reviewTrace,
    canExecute: false,
    currentPrice: 7468.25,
  });

  return [watchState, reviewState];
}

function buildFindings(): ActiveDeskStateAuditFinding[] {
  const states = buildDeskStateFixture();
  const replay = validateDeskStateReplayPath(states);
  const findings: ActiveDeskStateAuditFinding[] = [];

  if (!states.length) {
    findings.push(finding('desk_state_presence', 'Audit fixture did not build any DeskState snapshots.', []));
  }
  for (const [index, state] of states.entries()) {
    const label = `state[${index}]`;
    if (state.sourceOfTruth !== 'scanner_desk_state') {
      findings.push(finding('source_of_truth', 'DeskState sourceOfTruth changed.', [label, String(state.sourceOfTruth)]));
    }
    if (state.visibilityMetadata.sourceOfTruth !== 'scanner_desk_state_visibility_metadata') {
      findings.push(finding('source_of_truth', 'Visibility metadata sourceOfTruth changed.', [label]));
    }
    if (state.candidateLifecycleTrace.sourceOfTruth !== 'scanner_candidate_lifecycle_trace') {
      findings.push(finding('source_of_truth', 'Candidate lifecycle trace sourceOfTruth changed.', [label]));
    }
    if (state.promotion.sourceOfTruth !== 'scanner_desk_state_promotion_path') {
      findings.push(finding('source_of_truth', 'Promotion path sourceOfTruth changed.', [label]));
    }
    if (state.visibilityMode !== state.visibilityMetadata.visibilityMode) {
      findings.push(finding('visibility_alignment', 'DeskState visibilityMode diverged from visibility metadata.', [
        label,
        `deskState=${state.visibilityMode}`,
        `visibility=${state.visibilityMetadata.visibilityMode}`,
      ]));
    }
    if (state.discordAction !== state.visibilityMetadata.discordAction) {
      findings.push(finding('visibility_alignment', 'DeskState discordAction diverged from visibility metadata.', [
        label,
        `deskState=${state.discordAction}`,
        `visibility=${state.visibilityMetadata.discordAction}`,
      ]));
    }
    if (state.canExecute !== state.visibilityMetadata.authority.canExecute) {
      findings.push(finding('can_execute_boundary', 'DeskState canExecute diverged from visibility authority.', [
        label,
        `deskState=${state.canExecute}`,
        `visibility=${state.visibilityMetadata.authority.canExecute}`,
      ]));
    }
    if (state.promotion.approvalBoundary.changesTradeApprovals !== false ||
      state.promotion.approvalBoundary.changesCanExecute !== false ||
      state.promotion.approvalBoundary.changesEntryStopTargets !== false ||
      state.promotion.approvalBoundary.changesRiskRules !== false ||
      state.promotion.approvalBoundary.changesBridgeBehavior !== false) {
      findings.push(finding('approval_boundary', 'Promotion boundary no longer preserves no-authority-change flags.', [label]));
    }
    if (!state.notes.some((note) => note.includes('does not change trade approvals'))) {
      findings.push(finding('authority_language', 'DeskState no-authority-change note is missing.', [label]));
    }
  }

  if (!replay.singleSourceOfTruthPresent) {
    findings.push(finding('replay_source_of_truth', 'Replay validation did not confirm scanner-owned source-of-truth markers.', replay.findings));
  }
  if (!replay.discordRagUiAligned) {
    findings.push(finding('replay_alignment', 'Replay validation found Discord/RAG/UI alignment drift.', replay.findings));
  }
  if (!replay.promotionPathObserved) {
    findings.push(finding('promotion_path', 'Replay validation did not observe watch-to-plan promotion path.', replay.findings));
  }
  if (!replay.canExecuteBoundaryPreserved) {
    findings.push(finding('can_execute_boundary', 'Replay validation found canExecute boundary drift.', replay.findings));
  }
  if (!replay.noChasePreserved) {
    findings.push(finding('no_chase_language', 'Replay validation found missing no-chase/completed-5M/protected-structure language.', replay.findings));
  }
  if (replay.promotionBoundary.changesTradeApprovals !== false ||
    replay.promotionBoundary.changesCanExecute !== false ||
    replay.promotionBoundary.changesEntryStopTargets !== false ||
    replay.promotionBoundary.changesRiskRules !== false ||
    replay.promotionBoundary.changesBridgeBehavior !== false) {
    findings.push(finding('replay_authority_boundary', 'Replay validation boundary no longer preserves no-authority-change flags.', []));
  }
  if (replay.authority.replayValidationApprovesTrade !== false ||
    replay.authority.replayValidationChangesRules !== false ||
    replay.authority.replayValidationChangesCanExecute !== false) {
    findings.push(finding('replay_authority_boundary', 'Replay validation authority flags changed.', []));
  }

  return findings;
}

function buildSummary(): Phase9CActiveDeskStateAuditReport['summary'] {
  const states = buildDeskStateFixture();
  const replay = validateDeskStateReplayPath(states);
  return {
    deskStateSnapshots: states.length,
    watchSnapshots: states.filter((state) => state.visibilityMode === 'POST_WATCH').length,
    planOrReviewSnapshots: states.filter((state) =>
      state.visibilityMode === 'POST_PLAN' ||
      state.visibilityMode === 'POST_REVIEW' ||
      state.visibilityMode === 'POST_CONDITIONAL'
    ).length,
    sourceOfTruthAligned: replay.singleSourceOfTruthPresent,
    visibilityAligned: replay.discordRagUiAligned,
    promotionPathObserved: replay.promotionPathObserved,
    canExecuteBoundaryPreserved: replay.canExecuteBoundaryPreserved,
    noChasePreserved: replay.noChasePreserved,
    replayFindings: replay.findings.length,
  };
}

function buildMarkdown(report: Omit<Phase9CActiveDeskStateAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 9C Active DeskState Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, change ranking, change risk rules, change bridge behavior, or change entry/stop/target math.',
    '',
    `DeskState snapshots: ${report.summary.deskStateSnapshots}; watch=${report.summary.watchSnapshots}; plan/review/conditional=${report.summary.planOrReviewSnapshots}.`,
    `Alignment: sourceOfTruth=${report.summary.sourceOfTruthAligned}; visibility=${report.summary.visibilityAligned}; promotionPath=${report.summary.promotionPathObserved}; canExecuteBoundary=${report.summary.canExecuteBoundaryPreserved}; noChase=${report.summary.noChasePreserved}; replayFindings=${report.summary.replayFindings}.`,
    '',
    'Checks:',
    ...report.checks.map((check) => `- ${check}`),
  ];
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.checkId}: ${item.reason}`);
  } else {
    lines.push('', 'Findings: none.');
  }
  return lines.join('\n');
}

export function buildPhase9CActiveDeskStateAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9CActiveDeskStateAuditReport {
  const findings = buildFindings();
  const reportWithoutMarkdown = {
    reportType: 'phase_9c_active_desk_state_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' as const : 'pass' as const,
    summary: buildSummary(),
    checks: [
      'DeskState snapshots carry scanner-owned source-of-truth markers.',
      'DeskState mirrors visibility mode, Discord action, and canExecute from visibility metadata.',
      'DeskState carries candidate lifecycle trace and promotion path metadata for downstream consumers.',
      'Watch-to-plan/review promotion path remains observable through validateDeskStateReplayPath.',
      'Promotion and replay boundaries preserve no changes to trade approvals, canExecute, entry/stop/target math, risk rules, and bridge behavior.',
      'Non-executable DeskState snapshots preserve no-chase, completed-5M, or protected-structure language.',
      'The audit remains metadata only and does not change trading logic, ranking, Discord routing, or live trade approval.',
    ],
    findings,
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildPhase9CActiveDeskStateAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
