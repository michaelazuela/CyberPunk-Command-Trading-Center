import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import { buildTradeDecisionMapAudit } from './localScannerEngine';
import { buildPhase10ModelHealthReport } from './scannerModelE2EHealth';

const audit = buildTradeDecisionMapAudit();
const report = buildPhase10ModelHealthReport(SETUP_REGISTRY, audit);

assert.equal(report.sourceOfTruth, 'scanner_phase_10_model_e2e_health');
assert.equal(report.phases.alphaPerModelHealthMatrix, 'ready');
assert.equal(report.phases.bravoStaleDataCoverage, 'ready');
assert.equal(report.phases.charliePortfolioE2EContract, 'ready');
assert.equal(report.primaryModelCount, 5);
assert.equal(report.contextLabelCount, 0);
assert.equal(report.deprecatedCount, 0);
assert.equal(report.entries.length, 5);
assert.equal(report.findings.length, 0);
assert.equal(report.boundaries.changesTradingLogic, false);
assert.equal(report.boundaries.changesScannerApprovals, false);
assert.equal(report.boundaries.changesCanExecute, false);
assert.equal(report.boundaries.changesEntryStopTargetRisk, false);
assert.equal(report.boundaries.changesDiscordHardBlockers, false);
assert.match(report.notes.join(' '), /Every primary model must retain a DeskState\/visibility route/);

console.log('scannerModelE2EHealth five-model contract verified');
