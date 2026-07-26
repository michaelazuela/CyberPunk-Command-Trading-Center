import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../../src/config/setupRegistry';
import { buildPhase9ATradeDecisionMapAudit } from './trade-decision-map-audit';

const report = buildPhase9ATradeDecisionMapAudit();
assert.equal(report.reportType, 'phase_9a_trade_decision_map_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.summary.registryEntries, SETUP_REGISTRY.length);
assert.equal(report.summary.auditedEntries, SETUP_REGISTRY.length);
assert.equal(report.summary.primaryModels, 0);
assert.equal(report.summary.contextNotes, 0);
assert.equal(report.summary.deprecatedModels, 0);
assert.equal(report.summary.executionEligible, 0);
assert.equal(report.findings.length, 0);
assert.ok(report.markdown.includes('Coverage:'));
assert.ok(report.markdown.includes('Blank-slate mode'));

console.log('Phase 9A trade decision map audit test verified.');
