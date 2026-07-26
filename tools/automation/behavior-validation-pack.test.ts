import assert from 'node:assert/strict';
import {
  buildBehaviorValidationPackReport,
  type BehaviorValidationCommandCheck,
  type BehaviorValidationCommandResult,
} from './behavior-validation-pack';

function passedCommand(check: BehaviorValidationCommandCheck): BehaviorValidationCommandResult {
  return {
    ...check,
    status: 'pass',
    exitCode: 0,
    durationMs: 1,
    outputTail: `${check.id} passed in fixture`,
  };
}

const report = buildBehaviorValidationPackReport({
  commandRunner: (check) => passedCommand(check),
  commandChecks: [
    { id: 'workflow_loopback', command: 'npm', args: ['run', 'workflow:loopback'] },
    { id: 'focused_scanner_alert_fixture', command: 'npx', args: ['tsx', 'tools/automation/nt-scanner-alert.test.ts'] },
  ],
  latestEvaluatedTape: 'tools/automation/discord-audit/scanner-decision-tape-2026-07-15-MES-morning.json',
  latestEvaluatedSession: 'morning',
});

assert.equal(report.reportType, 'behavior_validation_live_replay_pack');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.summary.auditChecks, 4);
assert.equal(report.summary.commandChecks, 2);
assert.equal(report.summary.fixtureDirection, 'WAIT');
assert.equal(report.summary.fixtureDiscordDecision, 'hold');
assert.equal(report.summary.fixtureLineInSand, null);
assert.equal(report.summary.fixtureEntry, null);
assert.equal(report.summary.fixtureStop, null);
assert.equal(report.summary.fixtureT1, null);
assert.equal(report.summary.fixtureT2, null);
assert.equal(report.summary.fixtureCanExecute, false);
assert.equal(report.summary.fixtureAgreement, true);
assert.ok(report.summary.fixtureSuppressionReason?.includes('Blank-slate mode'));
assert.ok(report.markdown.includes('No Discord posts, Supabase writes'));
assert.ok(report.markdown.includes('Fixture: WAIT hold; line=null; entry=null; stop=null; T1=null; T2=null'));

const failedCommandReport = buildBehaviorValidationPackReport({
  commandRunner: (check) => ({
    ...passedCommand(check),
    status: check.id === 'workflow_loopback' ? 'fail' : 'pass',
    exitCode: check.id === 'workflow_loopback' ? 1 : 0,
    outputTail: check.id === 'workflow_loopback' ? 'loopback mismatch fixture' : 'ok',
  }),
  commandChecks: [
    { id: 'workflow_loopback', command: 'npm', args: ['run', 'workflow:loopback'] },
  ],
});

assert.equal(failedCommandReport.status, 'fail');
assert.ok(failedCommandReport.findings.some((finding) =>
  finding.checkId === 'workflow_loopback' &&
  finding.reason.includes('Behavior validation command failed')
));

console.log('Behavior validation / live replay pack verified.');
