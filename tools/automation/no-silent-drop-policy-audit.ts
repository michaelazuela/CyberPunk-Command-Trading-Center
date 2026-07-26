import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  type ScannerState,
  type ScannerVisibilityMetadata,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

export interface NoSilentDropFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface NoSilentDropPolicyAuditReport {
  reportType: 'phase_8_6_no_silent_drop_policy_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  rootDir: string;
  filesScanned: string[];
  status: 'pass' | 'fail';
  checks: string[];
  findings: NoSilentDropFinding[];
  markdown: string;
}

interface VisibilityCase {
  id: string;
  state: ScannerState;
  candidate: SetupCandidate | null;
  canExecute: boolean;
  alertDecision: { shouldSend: boolean; reason: string };
  staleReason?: string | null;
  dataQualityBlocker?: string | null;
  expectedVisibilityMode: ScannerVisibilityMetadata['visibilityMode'];
  expectedDiscordAction: ScannerVisibilityMetadata['discordAction'];
  reasonField: 'holdWithReason' | 'noTradeWithReason' | 'dataQualityBlocker' | null;
}

const REQUIRED_VISIBILITY_MODES = [
  'POST_PLAN',
  'POST_WATCH',
  'POST_CONDITIONAL',
  'POST_REVIEW',
  'HOLD_WITH_REASON',
  'NO_TRADE_WITH_REASON',
  'DATA_QUALITY_BLOCKER',
];

const REQUIRED_METADATA_FIELDS = [
  'visibilityMode',
  'suppressionReason',
  'nextTrigger',
  'dataQualityBlocker',
  'holdWithReason',
  'noTradeWithReason',
  'hasMeaningfulStructuredEvidence',
  'sourceOfTruth',
];

function authority(): NoSilentDropPolicyAuditReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  };
}

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'No silent drop fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    invalidation: 'Invalid below protected swing.',
    rankScore: 92,
    evidence: ['completed 5M historical reversal pattern', 'structured displacement evidence'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M close through the line in the sand.',
    nextAction: 'Wait for completed 5M proof.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function defaultCases(): VisibilityCase[] {
  return [
    {
      id: 'conditional_structured_candidate_posts_conditional',
      state: 'Conditional',
      candidate: candidate(),
      canExecute: false,
      alertDecision: { shouldSend: false, reason: 'Conditional plan requires completed 5M proof.' },
      expectedVisibilityMode: 'POST_CONDITIONAL',
      expectedDiscordAction: 'post_conditional',
      reasonField: null,
    },
    {
      id: 'blocked_structured_candidate_holds_with_reason',
      state: 'Blocked',
      candidate: candidate({
        executionStatus: ExecutionStatus.Blocked,
        blockReason: NoTradeReason.InvalidStopLocation,
      }),
      canExecute: false,
      alertDecision: { shouldSend: false, reason: 'Blocked by protected-structure stop quality.' },
      expectedVisibilityMode: 'HOLD_WITH_REASON',
      expectedDiscordAction: 'hold',
      reasonField: 'holdWithReason',
    },
    {
      id: 'missed_structured_candidate_holds_with_stale_reason',
      state: 'Missed',
      candidate: candidate({ requiredTrigger: 'Fresh retest required before entry.' }),
      canExecute: false,
      staleReason: 'NO CHASE - price left the active tactical zone.',
      alertDecision: { shouldSend: false, reason: 'Missed/no-chase fixture.' },
      expectedVisibilityMode: 'HOLD_WITH_REASON',
      expectedDiscordAction: 'hold',
      reasonField: 'holdWithReason',
    },
    {
      id: 'no_trade_structured_candidate_keeps_no_trade_reason',
      state: 'NoTrade',
      candidate: candidate({
        executionStatus: ExecutionStatus.Blocked,
        blockReason: NoTradeReason.ConflictingStructure,
      }),
      canExecute: false,
      alertDecision: { shouldSend: false, reason: 'No-trade fixture with structured evidence.' },
      expectedVisibilityMode: 'NO_TRADE_WITH_REASON',
      expectedDiscordAction: 'no_trade',
      reasonField: 'noTradeWithReason',
    },
    {
      id: 'data_limited_structured_candidate_becomes_data_quality_blocker',
      state: 'Conditional',
      candidate: candidate(),
      canExecute: false,
      dataQualityBlocker: 'Missing 120M bars for HTF structural classification.',
      alertDecision: { shouldSend: false, reason: 'Data-quality fixture.' },
      expectedVisibilityMode: 'DATA_QUALITY_BLOCKER',
      expectedDiscordAction: 'hold',
      reasonField: 'dataQualityBlocker',
    },
  ];
}

function finding(checkId: string, reason: string, evidence: string[]): NoSilentDropFinding {
  return { checkId, reason, evidence };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function scanSource(rootDir: string): NoSilentDropFinding[] {
  const relative = 'src/lib/localScannerEngine.ts';
  const fullPath = path.join(rootDir, relative);
  if (!fs.existsSync(fullPath)) return [finding('source_scan', 'localScannerEngine visibility source is missing.', [relative])];
  const text = fs.readFileSync(fullPath, 'utf8');
  const findings: NoSilentDropFinding[] = [];
  for (const mode of REQUIRED_VISIBILITY_MODES) {
    if (!text.includes(mode)) findings.push(finding('source_scan', `Missing visibility mode ${mode}.`, [mode]));
  }
  for (const field of REQUIRED_METADATA_FIELDS) {
    if (!text.includes(field)) findings.push(finding('source_scan', `Missing visibility metadata field ${field}.`, [field]));
  }
  return findings;
}

function validateVisibilityCase(testCase: VisibilityCase): NoSilentDropFinding[] {
  const window = resolveScannerWindow(new Date('2026-05-19T10:05:00-04:00'));
  const visibility = classifyScannerVisibility({
    state: testCase.state,
    candidate: testCase.candidate,
    window,
    alertDecision: testCase.alertDecision,
    canExecute: testCase.canExecute,
    staleReason: testCase.staleReason,
    dataQualityBlocker: testCase.dataQualityBlocker,
  });
  const trace = buildCandidateLifecycleTrace({
    candidates: testCase.candidate ? [testCase.candidate] : [],
    selectedCandidate: testCase.candidate,
    state: testCase.state,
    window,
    alertDecision: testCase.alertDecision,
    canExecute: testCase.canExecute,
    staleReason: testCase.staleReason,
    dataQualityBlocker: testCase.dataQualityBlocker,
  });
  const deskState = buildDeskState({
    state: testCase.state,
    candidate: testCase.candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: trace,
    canExecute: testCase.canExecute,
  });

  const findings: NoSilentDropFinding[] = [];
  if (visibility.visibilityMode !== testCase.expectedVisibilityMode) {
    findings.push(finding(testCase.id, `Expected ${testCase.expectedVisibilityMode}, got ${visibility.visibilityMode}.`, [visibility.visibilityMode]));
  }
  if (visibility.discordAction !== testCase.expectedDiscordAction) {
    findings.push(finding(testCase.id, `Expected Discord action ${testCase.expectedDiscordAction}, got ${visibility.discordAction}.`, [visibility.discordAction]));
  }
  if (testCase.candidate && !visibility.hasMeaningfulStructuredEvidence) {
    findings.push(finding(testCase.id, 'Structured candidate was not marked as meaningful structured evidence.', [testCase.candidate.setupType]));
  }
  if (testCase.reasonField && !visibility[testCase.reasonField]) {
    findings.push(finding(testCase.id, `Missing required ${testCase.reasonField}.`, [testCase.reasonField]));
  }
  if (trace.createdCandidates.length && trace.createdCandidates.some((item) => !item.visibilityMode)) {
    findings.push(finding(testCase.id, 'Candidate lifecycle trace item is missing visibilityMode.', [JSON.stringify(trace.createdCandidates)]));
  }
  if (deskState.visibilityMode !== visibility.visibilityMode || deskState.discordAction !== visibility.discordAction) {
    findings.push(finding(testCase.id, 'DeskState does not preserve scanner visibility metadata.', [deskState.visibilityMode, deskState.discordAction]));
  }
  if (deskState.canExecute !== testCase.canExecute) {
    findings.push(finding(testCase.id, 'DeskState changed canExecute while applying visibility policy.', [String(deskState.canExecute)]));
  }

  return findings;
}

function buildMarkdown(report: Omit<NoSilentDropPolicyAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 8.6 No Silent Drop Policy Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target math.',
    '',
    'Policy: meaningful structured OHLC evidence must resolve to a visible lifecycle mode with an explicit reason when held, blocked, no-trade, or data-limited.',
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

export function buildNoSilentDropPolicyAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  cases = defaultCases(),
): NoSilentDropPolicyAuditReport {
  const sourceFile = path.join(rootDir, 'src/lib/localScannerEngine.ts');
  const findings = [
    ...scanSource(rootDir),
    ...cases.flatMap((testCase) => validateVisibilityCase(testCase)),
  ];
  const reportWithoutMarkdown = {
    reportType: 'phase_8_6_no_silent_drop_policy_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: fs.existsSync(sourceFile) ? [normalizeRelative(rootDir, sourceFile)] : [],
    status: findings.length ? 'fail' as const : 'pass' as const,
    checks: [
      'Scanner visibility source includes all shared visibility modes and required reason metadata fields.',
      'Conditional structured evidence remains visible as conditional/review/watch metadata.',
      'Blocked or missed structured evidence resolves to HOLD_WITH_REASON with an explicit reason.',
      'No-trade structured evidence resolves to NO_TRADE_WITH_REASON with an explicit reason.',
      'Data-limited structured evidence resolves to DATA_QUALITY_BLOCKER with exact missing proof.',
      'Candidate lifecycle trace and DeskState preserve the same visibility mode/action without changing canExecute.',
    ],
    findings,
  };

  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildNoSilentDropPolicyAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
