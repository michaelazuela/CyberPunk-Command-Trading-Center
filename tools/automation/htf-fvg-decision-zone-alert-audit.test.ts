import assert from 'node:assert/strict';
import { buildPhase9HDecisionZoneAlertAudit } from './htf-fvg-decision-zone-alert-audit';

const report = buildPhase9HDecisionZoneAlertAudit();

assert.equal(report.reportType, 'phase_9h_htf_fvg_decision_zone_alert_audit');
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
assert.equal(report.summary.fvgDecisionZoneRendered, true);
assert.equal(report.summary.lineInSandRendered, true);
assert.equal(report.summary.whyHoldFoldRendered, true);
assert.equal(report.summary.noChaseRendered, true);
assert.equal(report.summary.parentReactionRendered, true);
assert.equal(report.summary.cascadeRendered, true);
assert.equal(report.summary.boundaryRendered, true);
assert.equal(report.summary.pendingLevelsPreserved, true);
assert.equal(report.summary.noAuthorityChange, true);
assert.ok(report.filesScanned.includes('src/lib/localScannerEngine.ts'));
assert.ok(report.filesScanned.includes('tools/automation/discord-alert-format.ts'));
assert.ok(report.markdown.includes('does not post Discord'));
