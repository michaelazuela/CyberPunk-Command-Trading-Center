import assert from 'node:assert/strict';
import { buildPhase9BCandidateLifecycleTraceAudit } from './candidate-lifecycle-trace-audit';

const report = buildPhase9BCandidateLifecycleTraceAudit();

assert.equal(report.reportType, 'phase_9b_candidate_lifecycle_trace_audit');
assert.equal(report.status, 'pass', JSON.stringify(report.findings, null, 2));
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.changesRanking, false);
assert.equal(report.summary.fixtureCandidates, 3);
assert.equal(report.summary.createdCandidates, 3);
assert.equal(report.summary.filteredCandidates, 2);
assert.equal(report.summary.hasHighestRankedCandidate, true);
assert.equal(report.summary.hasBestLongPlan, true);
assert.equal(report.summary.hasBestShortPlan, true);
assert.equal(report.summary.hasSelectedCandidate, true);
assert.equal(report.summary.hasDiscordDecision, true);
assert.equal(report.summary.hasNextTrigger, true);
assert.ok(report.summary.missingProofItems >= 2);
assert.ok(report.filesScanned.includes('src/lib/localScannerEngine.ts'));
assert.ok(report.markdown.includes('does not post Discord'));
