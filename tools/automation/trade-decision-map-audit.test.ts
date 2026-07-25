import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../../src/config/setupRegistry';
import { SetupType } from '../../src/types';
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
assert.ok(report.summary.primaryModels > 0);
assert.equal(report.summary.supportingEvidence, 0);
assert.equal(report.summary.deprecatedModels, 0);
assert.equal(report.findings.length, 0);
assert.ok(report.markdown.includes('Coverage:'));

const registryTypes = new Set(SETUP_REGISTRY.map((entry) => entry.setupType));
assert.equal(registryTypes.has(SetupType.OpeningDriveFvgContinuation), true);
assert.equal(registryTypes.has(SetupType.AfterLunchDriveFvgContinuation), true);

console.log('Phase 9A trade decision map audit test verified.');
