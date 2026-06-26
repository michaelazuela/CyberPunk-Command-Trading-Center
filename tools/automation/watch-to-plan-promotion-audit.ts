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
  type DeskStatePromotionStage,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

export interface WatchToPlanPromotionAuditFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface Phase9EWatchToPlanPromotionAuditReport {
  reportType: 'phase_9e_watch_to_plan_promotion_audit';
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
    snapshotsAudited: number;
    stagesObserved: string[];
    watchAppearedBeforePlan: boolean;
    promotionPathObserved: boolean;
    watchToPlanPromotionProofed: boolean;
    canExecuteBoundaryPreserved: boolean;
    noChasePreserved: boolean;
    sourceOfTruthAligned: boolean;
    discordRagUiAligned: boolean;
    canPromoteNowAlwaysFalse: boolean;
  };
  checks: string[];
  findings: WatchToPlanPromotionAuditFinding[];
  markdown: string;
}

function authority(): Phase9EWatchToPlanPromotionAuditReport['authority'] {
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

function finding(checkId: string, reason: string, evidence: string[]): WatchToPlanPromotionAuditFinding {
  return { checkId, reason, evidence };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/lib/localScannerEngine.ts',
    'src/lib/localScannerEngine.test.ts',
    'src/agents/bridgeDiagnosticReplayAgent.ts',
    'tools/automation/new-project-workflow-loopback.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
}

function baseCandidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'Phase 9E watch-to-plan promotion fixture',
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'blocked',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: 'SHORT',
        lineInSand: 7469.75,
        lineReason: 'HTF rejection line with 15M/5M bearish structure context.',
        requiredClose: 'Completed 5M close below 7469.75.',
        obstacleType: null,
        obstacleSource: null,
        evidence: ['HTF rejection line present', '5M structure shift forming'],
        blockers: ['Existing deterministic gates still own any promotion.'],
      },
    },
    direction: 'SHORT',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 96,
    entry: 7469.75,
    stop: 7489.75,
    target1: 7439.75,
    target2: 7429.75,
    riskPoints: 20,
    invalidation: 'Invalid above protected 5M sweep high at 7489.75.',
    rankScore: 92,
    evidence: ['HTF rejection line present', '5M structure shift forming'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M close below 7469.75, then retest/hold below the line.',
    nextAction: 'No chase. Wait for completed 5M proof and protected structure before promotion.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function buildState(args: {
  state: 'TriggerPending' | 'Conditional' | 'Executable' | 'Approved';
  candidate: SetupCandidate;
  canExecute: boolean;
  alertDecision: { shouldSend: boolean; reason: string };
  currentPrice: number;
}): DeskState {
  const window = resolveScannerWindow(new Date('2026-06-26T10:05:00-04:00'));
  const trace = buildCandidateLifecycleTrace({
    candidates: [args.candidate],
    selectedCandidate: args.candidate,
    state: args.state,
    window,
    alertDecision: args.alertDecision,
    canExecute: args.canExecute,
  });
  const visibility = classifyScannerVisibility({
    state: args.state,
    candidate: args.candidate,
    window,
    alertDecision: args.alertDecision,
    canExecute: args.canExecute,
  });
  return buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: trace,
    canExecute: args.canExecute,
    currentPrice: args.currentPrice,
  });
}

function buildPromotionPathFixture(): DeskState[] {
  const watch = baseCandidate({
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    missingEvidence: ['Completed 5M close below 7469.75 is missing.'],
    missingLevels: [
      {
        key: 'entry',
        label: 'Entry trigger',
        reason: 'No completed 5M close through the line in the sand.',
        source: '5m_execution',
        requiredFor: 'entry',
      },
    ],
    nextAction: 'No chase. Watch only until completed 5M proof appears.',
  });
  const conditional = baseCandidate({
    missingEvidence: ['Retest/hold proof is not complete.'],
    executionStatus: ExecutionStatus.Conditional,
    nextAction: 'No chase. Conditional plan waits for retest/hold proof.',
  });
  const humanReview = baseCandidate({
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: true,
      reason: 'Full levels are present, but existing app-owned execution gates still keep canExecute=false.',
    },
    missingEvidence: ['Existing canExecute gate remains false.'],
    nextAction: 'No chase. Human review only until existing canExecute gates pass.',
  });
  const postedPlan = baseCandidate({
    executionStatus: ExecutionStatus.Executable,
    missingEvidence: [],
    nextAction: 'Existing app-owned approval gate already passed for posted-plan metadata fixture.',
  });

  return [
    buildState({
      state: 'TriggerPending',
      candidate: watch,
      canExecute: false,
      alertDecision: { shouldSend: false, reason: 'Watch held until completed 5M proof.' },
      currentPrice: 7471,
    }),
    buildState({
      state: 'Conditional',
      candidate: conditional,
      canExecute: false,
      alertDecision: { shouldSend: true, reason: 'Conditional visibility fixture.' },
      currentPrice: 7468.5,
    }),
    buildState({
      state: 'Conditional',
      candidate: humanReview,
      canExecute: false,
      alertDecision: { shouldSend: true, reason: 'Human-review visibility fixture.' },
      currentPrice: 7468,
    }),
    buildState({
      state: 'Approved',
      candidate: postedPlan,
      canExecute: true,
      alertDecision: { shouldSend: true, reason: 'Existing posted-plan gate fixture.' },
      currentPrice: 7467.75,
    }),
  ];
}

function buildFindings(states: DeskState[]): WatchToPlanPromotionAuditFinding[] {
  const replay = validateDeskStateReplayPath(states);
  const findings: WatchToPlanPromotionAuditFinding[] = [];
  const stages = states.map((state) => state.promotion.currentStage);
  const expectedStages: DeskStatePromotionStage[] = ['watch', 'conditional', 'human_review_ready', 'posted_plan'];

  for (const expected of expectedStages) {
    if (!stages.includes(expected)) {
      findings.push(finding('stage_presence', `Promotion stage ${expected} was not observed.`, stages));
    }
  }
  for (const [index, state] of states.entries()) {
    const label = `state[${index}] ${state.promotion.currentStage}`;
    if (state.promotion.sourceOfTruth !== 'scanner_desk_state_promotion_path') {
      findings.push(finding('source_of_truth', 'Promotion source-of-truth marker changed.', [label]));
    }
    if (!state.promotion.requiredProof.length) {
      findings.push(finding('required_proof', 'Promotion required proof is missing.', [label]));
    }
    if (!state.promotion.blockedBy.length) {
      findings.push(finding('blocked_by', 'Promotion blocker/proof boundary is missing.', [label]));
    }
    if (state.promotion.canPromoteNow !== false) {
      findings.push(finding('can_promote_now', 'Promotion metadata no longer keeps canPromoteNow=false.', [label]));
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
      findings.push(finding('approval_boundary', 'Promotion approval boundary changed.', [label]));
    }
  }
  if (!replay.watchAppearedBeforePlan) {
    findings.push(finding('watch_before_plan', 'Replay did not observe watch before plan/review path.', replay.findings));
  }
  if (!replay.promotionPathObserved) {
    findings.push(finding('promotion_path', 'Replay did not observe watch-to-plan continuity.', replay.findings));
  }
  if (!replay.watchToPlanPromotionProofed) {
    findings.push(finding('promotion_proof', 'Replay did not prove promotion proof/blocker metadata.', replay.findings));
  }
  if (!replay.canExecuteBoundaryPreserved) {
    findings.push(finding('can_execute_boundary', 'Replay found canExecute or authority-boundary drift.', replay.findings));
  }
  if (!replay.noChasePreserved) {
    findings.push(finding('no_chase_language', 'Replay found missing no-chase/completed-5M/protected-structure language.', replay.findings));
  }
  if (!replay.singleSourceOfTruthPresent) {
    findings.push(finding('source_of_truth', 'Replay found missing scanner-owned source-of-truth markers.', replay.findings));
  }
  if (!replay.discordRagUiAligned) {
    findings.push(finding('consumer_alignment', 'Replay found Discord/RAG/UI alignment drift.', replay.findings));
  }
  if (replay.authority.replayValidationApprovesTrade !== false ||
    replay.authority.replayValidationChangesRules !== false ||
    replay.authority.replayValidationChangesCanExecute !== false) {
    findings.push(finding('replay_authority', 'Replay validation authority flags changed.', []));
  }

  return findings;
}

function buildSummary(states: DeskState[]): Phase9EWatchToPlanPromotionAuditReport['summary'] {
  const replay = validateDeskStateReplayPath(states);
  return {
    snapshotsAudited: states.length,
    stagesObserved: states.map((state) => state.promotion.currentStage),
    watchAppearedBeforePlan: replay.watchAppearedBeforePlan,
    promotionPathObserved: replay.promotionPathObserved,
    watchToPlanPromotionProofed: replay.watchToPlanPromotionProofed,
    canExecuteBoundaryPreserved: replay.canExecuteBoundaryPreserved,
    noChasePreserved: replay.noChasePreserved,
    sourceOfTruthAligned: replay.singleSourceOfTruthPresent,
    discordRagUiAligned: replay.discordRagUiAligned,
    canPromoteNowAlwaysFalse: states.every((state) => state.promotion.canPromoteNow === false),
  };
}

function buildMarkdown(report: Omit<Phase9EWatchToPlanPromotionAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 9E Watch-To-Plan Promotion Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, change ranking, change risk rules, change bridge behavior, or change entry/stop/target math.',
    '',
    `Snapshots audited: ${report.summary.snapshotsAudited}; stages=${report.summary.stagesObserved.join(' -> ')}.`,
    `Replay: watchBeforePlan=${report.summary.watchAppearedBeforePlan}; promotionPath=${report.summary.promotionPathObserved}; promotionProof=${report.summary.watchToPlanPromotionProofed}; canExecuteBoundary=${report.summary.canExecuteBoundaryPreserved}; noChase=${report.summary.noChasePreserved}; sourceOfTruth=${report.summary.sourceOfTruthAligned}; consumerAlignment=${report.summary.discordRagUiAligned}; canPromoteNowAlwaysFalse=${report.summary.canPromoteNowAlwaysFalse}.`,
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

export function buildPhase9EWatchToPlanPromotionAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9EWatchToPlanPromotionAuditReport {
  const states = buildPromotionPathFixture();
  const findings = buildFindings(states);
  const reportWithoutMarkdown = {
    reportType: 'phase_9e_watch_to_plan_promotion_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' as const : 'pass' as const,
    summary: buildSummary(states),
    checks: [
      'Watch-to-plan path observes watch, conditional, human-review-ready, and existing posted-plan stages.',
      'Every promotion snapshot carries required proof, blocker metadata, scanner-owned source-of-truth markers, and canPromoteNow=false.',
      'Replay validation confirms watch appears before plan/review and promotion proof metadata remains intact.',
      'Promotion metadata preserves canExecute and no-authority-change boundaries for trade approvals, entry/stop/target math, risk rules, and bridge behavior.',
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
  const report = buildPhase9EWatchToPlanPromotionAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
