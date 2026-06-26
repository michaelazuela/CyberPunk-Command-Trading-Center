import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  type DeskState,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

export interface DiscordWatchAlertAuditFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface Phase9DDiscordWatchAlertAuditReport {
  reportType: 'phase_9d_discord_watch_alert_audit';
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
    watchAlertsAudited: number;
    watchVisibilityObserved: boolean;
    lineInSandPresent: boolean;
    completedFiveMinuteTriggerPresent: boolean;
    invalidationPresent: boolean;
    standDownPresent: boolean;
    notExecutionApprovalPresent: boolean;
    canExecuteBoundaryPreserved: boolean;
    predictionLanguageBlocked: boolean;
  };
  checks: string[];
  sampleAlert: string;
  findings: DiscordWatchAlertAuditFinding[];
  markdown: string;
}

const FORBIDDEN_WATCH_LANGUAGE = [
  'execution approved',
  'valid trade now',
  'enter now',
  'must take',
  'guaranteed',
  'will hit',
] as const;

function authority(): Phase9DDiscordWatchAlertAuditReport['authority'] {
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

function finding(checkId: string, reason: string, evidence: string[]): DiscordWatchAlertAuditFinding {
  return { checkId, reason, evidence };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/lib/localScannerEngine.ts',
    'tools/automation/discord-alert-format.ts',
    'tools/automation/new-project-workflow-loopback.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
}

function formatLevel(value: number | null): string {
  return value === null ? 'pending scanner-owned line' : value.toFixed(2);
}

function buildWatchCandidate(): SetupCandidate {
  return {
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'Phase 9D SHORT watch from HTF rejection and 5M structure shift',
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'blocked',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: 'SHORT',
        lineInSand: 7469.75,
        lineReason: 'HTF rejection area with 15M/5M bearish structure watch.',
        requiredClose: 'Completed 5M close below 7469.75.',
        obstacleType: null,
        obstacleSource: null,
        evidence: ['HTF reaction area tagged', '15M/5M structure shifting lower'],
        blockers: ['Completed 5M close and retest proof are not complete.'],
      },
    },
    direction: 'SHORT',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 96,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    invalidation: 'Invalid above 7489.75, the protected 5M sweep high.',
    rankScore: 92,
    evidence: ['HTF rejection area tagged', '5M structure shift forming'],
    missingEvidence: ['Completed 5M close below 7469.75 is missing.'],
    missingLevels: [
      {
        key: 'entry',
        label: 'Entry trigger',
        reason: 'Watch state only until completed 5M proof appears.',
        source: '5m_execution',
        requiredFor: 'entry',
      },
    ],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M close below 7469.75, then retest/hold below the line.',
    nextAction: 'No chase. Wait for completed 5M confirmation before a plan can promote.',
    reducedRiskPlan: null,
  };
}

function buildWatchDeskState(): DeskState {
  const candidate = buildWatchCandidate();
  const window = resolveScannerWindow(new Date('2026-06-26T10:05:00-04:00'));
  const alertDecision = { shouldSend: false, reason: 'Watch held until completed 5M proof.' };
  const trace = buildCandidateLifecycleTrace({
    candidates: [candidate],
    selectedCandidate: candidate,
    state: 'TriggerPending',
    window,
    alertDecision,
    canExecute: false,
  });
  const visibility = classifyScannerVisibility({
    state: 'TriggerPending',
    candidate,
    window,
    alertDecision,
    canExecute: false,
  });
  return buildDeskState({
    state: 'TriggerPending',
    candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: trace,
    canExecute: false,
    currentPrice: 7471,
  });
}

export function renderPhase9DWatchAlert(state: DeskState): string {
  const selected = state.selectedCandidate;
  const direction = selected?.direction === 'LONG' ? 'LONG' : selected?.direction === 'SHORT' ? 'SHORT' : 'WATCH';
  const line = formatLevel(state.lineInSand);
  const lineSide = direction === 'LONG' ? 'LONG ABOVE' : direction === 'SHORT' ? 'SHORT BELOW' : 'LINE';
  const trigger = state.nextTrigger || selected?.requiredTrigger || 'Wait for completed 5M confirmation.';
  const reason = selected?.lineInSandReason || selected?.scenarioLabel || 'Scanner-owned structure watch is forming.';
  const invalidation = state.invalidation || selected?.invalidation || 'Invalidation pending protected 5M structure.';

  return [
    `${direction} WATCH FORMING`,
    `Line in the sand: ${line}`,
    `${lineSide}: ${line}`,
    `Trigger: ${trigger}`,
    `Reason: ${reason}`,
    `Invalidation: ${invalidation}`,
    'Stand down: No chase. Wait for completed 5M confirmation and a fresh scanner-owned plan.',
    `Execution: NOT APPROVED - watch alert only; canExecute=${state.canExecute}.`,
    'Decision support only. No automated orders.',
  ].join('\n');
}

function buildFindings(sampleAlert: string, state: DeskState): DiscordWatchAlertAuditFinding[] {
  const findings: DiscordWatchAlertAuditFinding[] = [];
  const lower = sampleAlert.toLowerCase();

  if (state.visibilityMode !== 'POST_WATCH' || state.discordAction !== 'post_watch') {
    findings.push(finding('watch_visibility', 'Fixture no longer produces watch visibility metadata.', [
      `visibilityMode=${state.visibilityMode}`,
      `discordAction=${state.discordAction}`,
    ]));
  }
  if (!sampleAlert.includes('WATCH FORMING')) {
    findings.push(finding('headline', 'Watch alert headline does not say WATCH FORMING.', [sampleAlert]));
  }
  if (!sampleAlert.includes('Line in the sand: 7469.75') || !sampleAlert.includes('SHORT BELOW: 7469.75')) {
    findings.push(finding('line_in_sand', 'Watch alert does not show the line in the sand and side-specific line.', [sampleAlert]));
  }
  if (!lower.includes('completed 5m')) {
    findings.push(finding('completed_5m_trigger', 'Watch alert does not require completed 5M trigger language.', [sampleAlert]));
  }
  if (!sampleAlert.includes('Invalidation:') || !sampleAlert.includes('7489.75')) {
    findings.push(finding('invalidation', 'Watch alert does not show invalidation when available.', [sampleAlert]));
  }
  if (!sampleAlert.includes('Stand down:') || !lower.includes('no chase')) {
    findings.push(finding('stand_down', 'Watch alert does not show stand-down/no-chase language.', [sampleAlert]));
  }
  if (!sampleAlert.includes('NOT APPROVED') || !sampleAlert.includes('canExecute=false')) {
    findings.push(finding('execution_boundary', 'Watch alert does not plainly preserve the execution approval boundary.', [sampleAlert]));
  }
  if (state.canExecute !== false || state.visibilityMetadata.authority.canExecute !== false) {
    findings.push(finding('can_execute_boundary', 'Watch alert fixture changed canExecute authority.', [
      `deskState=${state.canExecute}`,
      `visibility=${state.visibilityMetadata.authority.canExecute}`,
    ]));
  }
  for (const phrase of FORBIDDEN_WATCH_LANGUAGE) {
    if (lower.includes(phrase)) {
      findings.push(finding('prediction_language', 'Watch alert contains forbidden prediction/execution language.', [phrase]));
    }
  }
  if (state.promotion.approvalBoundary.changesTradeApprovals !== false ||
    state.promotion.approvalBoundary.changesCanExecute !== false ||
    state.promotion.approvalBoundary.changesEntryStopTargets !== false ||
    state.promotion.approvalBoundary.changesRiskRules !== false ||
    state.promotion.approvalBoundary.changesBridgeBehavior !== false) {
    findings.push(finding('approval_boundary', 'Promotion boundary no longer preserves no-authority-change flags.', []));
  }

  return findings;
}

function buildSummary(sampleAlert: string, state: DeskState): Phase9DDiscordWatchAlertAuditReport['summary'] {
  const lower = sampleAlert.toLowerCase();
  return {
    watchAlertsAudited: 1,
    watchVisibilityObserved: state.visibilityMode === 'POST_WATCH' && state.discordAction === 'post_watch',
    lineInSandPresent: sampleAlert.includes('Line in the sand: 7469.75') && sampleAlert.includes('SHORT BELOW: 7469.75'),
    completedFiveMinuteTriggerPresent: lower.includes('completed 5m'),
    invalidationPresent: sampleAlert.includes('Invalidation:') && sampleAlert.includes('7489.75'),
    standDownPresent: sampleAlert.includes('Stand down:') && lower.includes('no chase'),
    notExecutionApprovalPresent: sampleAlert.includes('NOT APPROVED') && sampleAlert.includes('canExecute=false'),
    canExecuteBoundaryPreserved: state.canExecute === false && state.visibilityMetadata.authority.canExecute === false,
    predictionLanguageBlocked: !FORBIDDEN_WATCH_LANGUAGE.some((phrase) => lower.includes(phrase)),
  };
}

function buildMarkdown(report: Omit<Phase9DDiscordWatchAlertAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 9D Discord Watch Alert Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, change ranking, change risk rules, change bridge behavior, or change entry/stop/target math.',
    '',
    `Watch alerts audited: ${report.summary.watchAlertsAudited}; watchVisibility=${report.summary.watchVisibilityObserved}; lineInSand=${report.summary.lineInSandPresent}; completed5M=${report.summary.completedFiveMinuteTriggerPresent}; invalidation=${report.summary.invalidationPresent}; standDown=${report.summary.standDownPresent}; notExecutionApproval=${report.summary.notExecutionApprovalPresent}; canExecuteBoundary=${report.summary.canExecuteBoundaryPreserved}; predictionLanguageBlocked=${report.summary.predictionLanguageBlocked}.`,
    '',
    'Sample alert:',
    '```text',
    report.sampleAlert,
    '```',
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

export function buildPhase9DDiscordWatchAlertAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9DDiscordWatchAlertAuditReport {
  const state = buildWatchDeskState();
  const sampleAlert = renderPhase9DWatchAlert(state);
  const findings = buildFindings(sampleAlert, state);
  const reportWithoutMarkdown = {
    reportType: 'phase_9d_discord_watch_alert_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' as const : 'pass' as const,
    summary: buildSummary(sampleAlert, state),
    checks: [
      'Watch alerts come from scanner-owned DeskState visibility metadata.',
      'Watch alerts include WATCH FORMING, line in the sand, side-specific line, completed-5M trigger, invalidation, stand-down/no-chase, and decision-support language.',
      'Watch alerts plainly state not execution approval and canExecute=false.',
      'Watch alerts avoid prediction/execution language such as enter now, guaranteed, will hit, or execution approved.',
      'The audit remains metadata/presentation only and does not change trading logic, ranking, Discord routing, or live trade approval.',
    ],
    sampleAlert,
    findings,
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildPhase9DDiscordWatchAlertAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
