import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFiveModelScannerCandidatePreviewContract } from './five-model-scanner-candidate-preview-contract';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-model-preview-contract-'));
const comparisonJson = path.join(tempDir, 'comparison.json');

fs.writeFileSync(comparisonJson, JSON.stringify({
  summary: {
    leadingModelId: 'raid_failure_displacement_reversal',
    selectedOnlyCounts: {
      liquidity_raid_reclaim_reversal: 0,
      raid_failure_displacement_reversal: 12,
      drive_pullback_continuation: 0,
      structure_shift_continuation: 3,
      failed_breakout_reversal: 0,
    },
  },
  modelSummaries: [
    { modelId: 'liquidity_raid_reclaim_reversal', displayName: 'Liquidity Raid Reclaim Reversal', selectedRows: 3, selectedDollars: 155, tightRows: 2, usableRows: 1, sourceMatchedTrades: 12 },
    { modelId: 'raid_failure_displacement_reversal', displayName: 'Raid Failure Displacement Reversal', selectedRows: 17, selectedDollars: 1090, tightRows: 10, usableRows: 7, sourceMatchedTrades: 23 },
    { modelId: 'drive_pullback_continuation', displayName: 'Drive Pullback Continuation', selectedRows: 4, selectedDollars: 271.25, tightRows: 2, usableRows: 2, sourceMatchedTrades: 4 },
    { modelId: 'structure_shift_continuation', displayName: 'Structure Shift Continuation', selectedRows: 6, selectedDollars: 135, tightRows: 1, usableRows: 5, sourceMatchedTrades: 14 },
    { modelId: 'failed_breakout_reversal', displayName: 'Failed Breakout Reversal', selectedRows: 3, selectedDollars: 155, tightRows: 2, usableRows: 1, sourceMatchedTrades: 12 },
  ],
}, null, 2));

const report = buildFiveModelScannerCandidatePreviewContract({
  comparisonJson,
  json: true,
});

assert.equal(report.authority.noSetupRegistryChange, false);
assert.equal(report.authority.noScannerWiring, false);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noCanExecuteChange, true);
assert.equal(report.summary.lanes, 5);
assert.equal(report.summary.primaryCandidateLanes, 1);
assert.equal(report.summary.secondaryCandidateLanes, 1);
assert.equal(report.summary.contextOnlyLanes, 3);
assert.deepEqual(report.summary.primaryModelIds, ['raid_failure_displacement_reversal']);
assert.deepEqual(report.summary.secondaryModelIds, ['structure_shift_continuation']);
assert.deepEqual(report.summary.contextOnlyModelIds, [
  'liquidity_raid_reclaim_reversal',
  'drive_pullback_continuation',
  'failed_breakout_reversal',
]);
assert.equal(report.summary.scannerCandidateEligibleRows, 5);
assert.equal(report.summary.discordEligibleRows, 5);
assert.equal(report.summary.executionApprovalEligibleRows, 0);
assert.equal(report.lanes.every((lane) => lane.productionSessionsEnabled.join(',') === 'morning,lunch,evening'), true);
assert.equal(report.lanes.every((lane) => lane.scannerCandidateEligible === true), true);
assert.equal(report.lanes.every((lane) => lane.discordEligible === true), true);
assert.equal(report.lanes.every((lane) => lane.canExecuteEligible === false), true);
assert.equal(report.recommendation, 'scanner_candidate_detection_installed_validate_completed_5m_proof_before_visibility');

console.log('five-model scanner-candidate preview contract verified');
