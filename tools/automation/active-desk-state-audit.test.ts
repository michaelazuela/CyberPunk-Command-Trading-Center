import assert from 'node:assert/strict';
import { buildPhase9CActiveDeskStateAudit } from './active-desk-state-audit';

const report = buildPhase9CActiveDeskStateAudit();

assert.equal(report.reportType, 'phase_9c_active_desk_state_audit');
assert.equal(report.status, 'pass', JSON.stringify(report.findings, null, 2));
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.changesRanking, false);
assert.equal(report.authority.changesRiskRules, false);
assert.equal(report.authority.changesBridgeBehavior, false);
assert.equal(report.summary.deskStateSnapshots, 2);
assert.equal(report.summary.watchSnapshots, 1);
assert.equal(report.summary.planOrReviewSnapshots, 1);
assert.equal(report.summary.sourceOfTruthAligned, true);
assert.equal(report.summary.visibilityAligned, true);
assert.equal(report.summary.promotionPathObserved, true);
assert.equal(report.summary.canExecuteBoundaryPreserved, true);
assert.equal(report.summary.noChasePreserved, true);
assert.ok(report.filesScanned.includes('src/lib/localScannerEngine.ts'));
assert.ok(report.markdown.includes('does not post Discord'));
