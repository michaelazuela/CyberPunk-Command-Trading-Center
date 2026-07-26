import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskPublishDecision,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
  type DeskPublishDecision,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';
import { buildPhase9CActiveDeskStateAudit } from './active-desk-state-audit';
import { buildDeskPublishContractAudit } from './desk-publish-contract-audit';
import { buildNoSilentDropPolicyAudit } from './no-silent-drop-policy-audit';
import { buildPhase9FReplayValidationAudit } from './replay-validation-audit';

export interface BehaviorValidationCommandCheck {
  id: string;
  command: string;
  args: string[];
}

export interface BehaviorValidationCommandResult extends BehaviorValidationCommandCheck {
  status: 'pass' | 'fail';
  exitCode: number | null;
  durationMs: number;
  outputTail: string;
}

export interface BehaviorValidationFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface BehaviorValidationPackReport {
  reportType: 'behavior_validation_live_replay_pack';
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
  latestEvaluatedTape: string | null;
  latestEvaluatedSession: string | null;
  status: 'pass' | 'fail';
  summary: {
    auditChecks: number;
    commandChecks: number;
    failedChecks: number;
    fixtureDirection: DeskPublishDecision['direction'];
    fixtureDiscordDecision: 'post' | 'hold' | 'no_trade' | 'data_blocker';
    fixtureLineInSand: number | null;
    fixtureEntry: number | null;
    fixtureStop: number | null;
    fixtureT1: number | null;
    fixtureT2: number | null;
    fixtureCanExecute: boolean;
    fixtureAgreement: boolean;
    fixtureSuppressionReason: string | null;
  };
  commandResults: BehaviorValidationCommandResult[];
  findings: BehaviorValidationFinding[];
  markdown: string;
}

export type BehaviorValidationCommandRunner = (check: BehaviorValidationCommandCheck, rootDir: string) => BehaviorValidationCommandResult;

function bin(name: 'npm' | 'npx'): string {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function defaultCommandChecks(): BehaviorValidationCommandCheck[] {
  return [
    {
      id: 'workflow_loopback',
      command: bin('npm'),
      args: ['run', 'workflow:loopback'],
    },
    {
      id: 'focused_scanner_alert_fixture',
      command: bin('npx'),
      args: ['tsx', 'tools/automation/nt-scanner-alert.test.ts'],
    },
  ];
}

function runCommand(check: BehaviorValidationCommandCheck, rootDir: string): BehaviorValidationCommandResult {
  const started = Date.now();
  const useWindowsShell = process.platform === 'win32';
  const command = useWindowsShell
    ? [check.command, ...check.args.map((part) => /\s/.test(part) ? `"${part.replace(/"/g, '\\"')}"` : part)].join(' ')
    : check.command;
  const args = useWindowsShell ? [] : check.args;
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: useWindowsShell,
    windowsHide: true,
    env: {
      ...process.env,
      SCANNER_VERBOSE_DISCORD_PAYLOAD_LOG: process.env.SCANNER_VERBOSE_DISCORD_PAYLOAD_LOG || 'false',
    },
  });
  const output = `${result.stdout || ''}${result.stderr || ''}${result.error ? `\n${result.error.message}` : ''}`.trim();
  return {
    ...check,
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status,
    durationMs: Date.now() - started,
    outputTail: output.split(/\r?\n/).slice(-12).join('\n'),
  };
}

function authority(): BehaviorValidationPackReport['authority'] {
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

function finding(checkId: string, reason: string, evidence: string[] = []): BehaviorValidationFinding {
  return { checkId, reason, evidence };
}

function failedHighBreakdownCandidate(): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'Blank-slate no-model fixture',
    direction: 'NO TRADE',
    detectedStatus: SetupCandidateStatus.Blocked,
    confidence: 'Low',
    priority: 0,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    rankScore: 0,
    decisionQualityScore: 0,
    invalidation: null,
    evidence: [],
    missingEvidence: ['Blank-slate mode: no trading models are installed.'],
    executionStatus: ExecutionStatus.Blocked,
    blockReason: null,
    requiredTrigger: null,
    nextAction: 'Install a newly approved model definition before scanner publishing can resume.',
    reducedRiskPlan: null,
  };
}

function failedHighBreakdownPublishDecision(): DeskPublishDecision {
  const candidate = failedHighBreakdownCandidate();
  const window = resolveScannerWindow(new Date('2026-07-15T10:25:00-04:00'));
  const alertDecision = {
    shouldSend: false,
    reason: 'Blank-slate mode: no model publish.',
  };
  const visibilityMetadata = classifyScannerVisibility({
    state: 'Blocked',
    candidate,
    window,
    alertDecision,
    canExecute: false,
  });
  const candidateLifecycleTrace = buildCandidateLifecycleTrace({
    candidates: [candidate],
    selectedCandidate: null,
    state: 'Blocked',
    window,
    alertDecision,
    canExecute: false,
  });
  const deskState = buildDeskState({
    state: 'Blocked',
    candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    currentPrice: null,
    canExecute: false,
  });
  return buildDeskPublishDecision({
    deskState,
    currentPrice: null,
    completed5mTime: '2026-07-15T10:25:00-04:00',
  });
}

function classifyDiscordDecision(decision: DeskPublishDecision): BehaviorValidationPackReport['summary']['fixtureDiscordDecision'] {
  if (decision.action === 'DATA_QUALITY_BLOCKER') return 'data_blocker';
  if (decision.discordAction === 'no_trade') return 'no_trade';
  if (decision.shouldPost) return 'post';
  return 'hold';
}

function validateFailedHighFixture(decision: DeskPublishDecision): BehaviorValidationFinding[] {
  const findings: BehaviorValidationFinding[] = [];
  if (decision.direction !== 'WAIT') findings.push(finding('blank_slate_fixture', 'Blank-slate fixture produced a non-neutral direction.', [`direction=${decision.direction}`]));
  if (decision.lineInSand !== null) findings.push(finding('blank_slate_fixture', 'Blank-slate fixture produced a line in the sand.', [`line=${decision.lineInSand}`]));
  if (decision.entry !== null) findings.push(finding('blank_slate_fixture', 'Blank-slate fixture produced an entry.', [`entry=${decision.entry}`]));
  if (decision.stop !== null) findings.push(finding('blank_slate_fixture', 'Blank-slate fixture produced a stop.', [`stop=${decision.stop}`]));
  if (decision.t1 !== null) findings.push(finding('blank_slate_fixture', 'Blank-slate fixture produced T1.', [`t1=${decision.t1}`]));
  if (decision.t2 !== null) findings.push(finding('blank_slate_fixture', 'Blank-slate fixture produced T2.', [`t2=${decision.t2}`]));
  if (decision.shouldPost || decision.discordAction !== 'hold') {
    findings.push(finding('blank_slate_fixture', 'Blank-slate fixture did not hold Discord local.', [
      `shouldPost=${decision.shouldPost}`,
      `discordAction=${decision.discordAction}`,
      decision.reason,
    ]));
  }
  if (decision.canExecute !== false || decision.approvalBoundary.changesCanExecute !== false) {
    findings.push(finding('blank_slate_fixture', 'Fixture changed canExecute authority boundary.', [
      `canExecute=${decision.canExecute}`,
      `changesCanExecute=${decision.approvalBoundary.changesCanExecute}`,
    ]));
  }
  if (decision.hasCompletePlan || decision.displaySource !== 'none') {
    findings.push(finding('blank_slate_fixture', 'Blank-slate fixture exposed a complete display source.', [
      `hasCompletePlan=${decision.hasCompletePlan}`,
      `displaySource=${decision.displaySource}`,
    ]));
  }
  return findings;
}

function auditFindings(): BehaviorValidationFinding[] {
  const reports = [
    { id: 'desk_publish_contract', report: buildDeskPublishContractAudit() },
    { id: 'no_silent_drop', report: buildNoSilentDropPolicyAudit() },
    { id: 'active_desk_state', report: buildPhase9CActiveDeskStateAudit() },
    { id: 'replay_validation', report: buildPhase9FReplayValidationAudit() },
  ];
  return reports.flatMap(({ id, report }) =>
    report.status === 'pass'
      ? []
      : [finding(id, `${report.reportType} failed.`, report.findings.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).slice(0, 8))]
  );
}

function buildMarkdown(report: Omit<BehaviorValidationPackReport, 'markdown'>): string {
  const lines = [
    '# Behavior Validation / Live Replay Pack',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only local validation. No Discord posts, Supabase writes, scanner behavior changes, trading logic changes, canExecute changes, bridge changes, or entry/stop/target changes.',
    '',
    `Latest tape: ${report.latestEvaluatedTape || 'not supplied'}; session=${report.latestEvaluatedSession || 'not supplied'}.`,
    `Summary: audits=${report.summary.auditChecks}; commandChecks=${report.summary.commandChecks}; failed=${report.summary.failedChecks}.`,
    `Fixture: ${report.summary.fixtureDirection} ${report.summary.fixtureDiscordDecision}; line=${report.summary.fixtureLineInSand}; entry=${report.summary.fixtureEntry}; stop=${report.summary.fixtureStop}; T1=${report.summary.fixtureT1}; T2=${report.summary.fixtureT2}; canExecute=${report.summary.fixtureCanExecute}; agreement=${report.summary.fixtureAgreement}.`,
    '',
    'Command checks:',
    ...report.commandResults.map((result) => `- ${result.id}: ${result.status} (${result.durationMs}ms, exit=${result.exitCode})`),
  ];
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.checkId}: ${item.reason}`);
  } else {
    lines.push('', 'Findings: none.');
  }
  return lines.join('\n');
}

function argValue(name: string): string | null {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

export function buildBehaviorValidationPackReport(args: {
  rootDir?: string;
  commandRunner?: BehaviorValidationCommandRunner;
  commandChecks?: BehaviorValidationCommandCheck[];
  skipCommands?: boolean;
  latestEvaluatedTape?: string | null;
  latestEvaluatedSession?: string | null;
} = {}): BehaviorValidationPackReport {
  const rootDir = args.rootDir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const commandChecks = args.commandChecks || defaultCommandChecks();
  const runner = args.commandRunner || runCommand;
  const commandResults = args.skipCommands ? [] : commandChecks.map((check) => runner(check, rootDir));
  const decision = failedHighBreakdownPublishDecision();
  const findings = [
    ...auditFindings(),
    ...validateFailedHighFixture(decision),
    ...commandResults
      .filter((result) => result.status !== 'pass')
      .map((result) => finding(result.id, 'Behavior validation command failed.', [
        `${result.command} ${result.args.join(' ')}`,
        result.outputTail,
      ])),
  ];
  const reportWithoutMarkdown: Omit<BehaviorValidationPackReport, 'markdown'> = {
    reportType: 'behavior_validation_live_replay_pack',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    latestEvaluatedTape: args.latestEvaluatedTape ?? null,
    latestEvaluatedSession: args.latestEvaluatedSession ?? null,
    status: findings.length ? 'fail' : 'pass',
    summary: {
      auditChecks: 4,
      commandChecks: commandResults.length,
      failedChecks: findings.length,
      fixtureDirection: decision.direction,
      fixtureDiscordDecision: classifyDiscordDecision(decision),
      fixtureLineInSand: decision.lineInSand,
      fixtureEntry: decision.entry,
      fixtureStop: decision.stop,
      fixtureT1: decision.t1,
      fixtureT2: decision.t2,
      fixtureCanExecute: decision.canExecute,
      fixtureAgreement: !decision.shouldPost &&
        decision.discordAction === 'hold' &&
        decision.direction === 'WAIT' &&
        decision.lineInSand === null &&
        decision.entry === null &&
        decision.stop === null &&
        decision.t1 === null &&
        decision.t2 === null,
      fixtureSuppressionReason: decision.shouldPost ? null : decision.reason,
    },
    commandResults,
    findings,
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

function writeReport(rootDir: string, report: BehaviorValidationPackReport): string {
  const outDir = path.join(rootDir, 'tools', 'automation', 'diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `behavior-validation-pack-${stamp}.json`);
  const markdownPath = path.join(outDir, `behavior-validation-pack-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(markdownPath, report.markdown);
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const report = buildBehaviorValidationPackReport({
    rootDir,
    skipCommands: process.argv.includes('--skip-commands'),
    latestEvaluatedTape: argValue('--tape'),
    latestEvaluatedSession: argValue('--session'),
  });
  const reportPath = writeReport(rootDir, report);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  } else {
    console.log(report.markdown);
    console.log('');
    console.log(`Report: ${reportPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
