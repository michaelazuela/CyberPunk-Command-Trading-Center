import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface LiveObservationProofAuditReport {
  reportType: 'phase_9j_live_observation_proof_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    startsScannerServices: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  rootDir: string;
  filesScanned: string[];
  status: 'pass' | 'fail';
  summary: {
    supervisorCommandPresent: boolean;
    loopbackFlagPresent: boolean;
    readOnlyAuthorityPresent: boolean;
    freshRestartOptionPresent: boolean;
    runbookCommandPresent: boolean;
    phase9hPreconditionPresent: boolean;
  };
  findings: string[];
  markdown: string;
}

function read(rootDir: string, relative: string): string {
  return fs.readFileSync(path.join(rootDir, relative), 'utf8');
}

function files(rootDir: string): string[] {
  return [
    'package.json',
    'tools/supervisor/liveObservationSignoff.ts',
    'tools/supervisor/liveObservationSignoff.test.ts',
    'tools/automation/new-project-workflow-loopback.ts',
    'docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md',
    'docs/PROJECT_STATUS.md',
  ].filter((relative) => fs.existsSync(path.join(rootDir, relative)));
}

export function buildLiveObservationProofAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): LiveObservationProofAuditReport {
  const packageJson = read(rootDir, 'package.json');
  const signoff = read(rootDir, 'tools/supervisor/liveObservationSignoff.ts');
  const loopback = read(rootDir, 'tools/automation/new-project-workflow-loopback.ts');
  const runbook = read(rootDir, 'docs/NEW_PROJECT_WORKFLOW_RUNBOOK.md');
  const statusDoc = read(rootDir, 'docs/PROJECT_STATUS.md');
  const summary = {
    supervisorCommandPresent: packageJson.includes('"supervisor:live-observation-signoff"'),
    loopbackFlagPresent: loopback.includes('--live-observation-signoff') && loopback.includes('live-observation-signoff-current-tape'),
    readOnlyAuthorityPresent:
      signoff.includes('postsDiscord: false') &&
      signoff.includes('writesSupabase: false') &&
      signoff.includes('startsScannerServices: false') &&
      signoff.includes('changesScannerState: false') &&
      signoff.includes('changesTradingLogic: false') &&
      signoff.includes('changesCanExecute: false') &&
      signoff.includes('changesEntryStopTargets: false'),
    freshRestartOptionPresent: signoff.includes('sinceRecordedAt') && runbook.includes('--since-recorded-at <scanner-restart-iso>'),
    runbookCommandPresent:
      runbook.includes('npm run supervisor:live-observation-signoff') &&
      runbook.includes('npm run workflow:loopback -- --real-tapes --live-observation-signoff'),
    phase9hPreconditionPresent:
      statusDoc.includes('Phase 9H') &&
      runbook.includes('Phase 9H HTF FVG decision-zone alert audit reports `pass`'),
  };
  const findings = [
    summary.supervisorCommandPresent ? null : 'Missing supervisor live-observation signoff command.',
    summary.loopbackFlagPresent ? null : 'Missing workflow loopback live-observation flag/check.',
    summary.readOnlyAuthorityPresent ? null : 'Live-observation authority boundary is incomplete.',
    summary.freshRestartOptionPresent ? null : 'Missing scanner-restart timestamp filter guidance.',
    summary.runbookCommandPresent ? null : 'Runbook does not show live-observation proof commands.',
    summary.phase9hPreconditionPresent ? null : 'Phase 9H precondition is not documented in current proof flow.',
  ].filter((item): item is string => Boolean(item));
  const reportWithoutMarkdown: Omit<LiveObservationProofAuditReport, 'markdown'> = {
    reportType: 'phase_9j_live_observation_proof_audit',
    generatedAt: new Date().toISOString(),
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      startsScannerServices: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
    rootDir,
    filesScanned: files(rootDir),
    status: findings.length ? 'fail' : 'pass',
    summary,
    findings,
  };
  const markdown = [
    '# Phase 9J Live-Observation Proof Audit',
    '',
    `Status: ${reportWithoutMarkdown.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, start scanner services, change scanner state, change trading logic, change canExecute, or change entry/stop/target math.',
    '',
    `Checks: command=${summary.supervisorCommandPresent}; loopback=${summary.loopbackFlagPresent}; authority=${summary.readOnlyAuthorityPresent}; restartFilter=${summary.freshRestartOptionPresent}; runbook=${summary.runbookCommandPresent}; phase9h=${summary.phase9hPreconditionPresent}.`,
    '',
    findings.length ? `Findings:\n${findings.map((item) => `- ${item}`).join('\n')}` : 'Findings: none.',
  ].join('\n');
  return { ...reportWithoutMarkdown, markdown };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildLiveObservationProofAudit();
  console.log(process.argv.includes('--json') ? JSON.stringify(report, null, 2) : report.markdown);
  if (report.status !== 'pass') process.exitCode = 1;
}
