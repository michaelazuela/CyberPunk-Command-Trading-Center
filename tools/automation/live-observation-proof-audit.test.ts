import assert from 'node:assert/strict';
import { buildLiveObservationProofAudit } from './live-observation-proof-audit';

const report = buildLiveObservationProofAudit();

assert.equal(report.reportType, 'phase_9j_live_observation_proof_audit');
assert.equal(report.status, 'pass', JSON.stringify(report.findings, null, 2));
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.startsScannerServices, false);
assert.equal(report.authority.changesScannerState, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.summary.supervisorCommandPresent, true);
assert.equal(report.summary.loopbackFlagPresent, true);
assert.equal(report.summary.readOnlyAuthorityPresent, true);
assert.equal(report.summary.freshRestartOptionPresent, true);
assert.equal(report.summary.runbookCommandPresent, true);
assert.equal(report.summary.phase9hPreconditionPresent, true);
assert.ok(report.filesScanned.includes('tools/supervisor/liveObservationSignoff.ts'));
assert.ok(report.markdown.includes('does not post Discord'));
