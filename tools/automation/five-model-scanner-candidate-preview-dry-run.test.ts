import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRADE_RULES } from '../../src/config/tradeRules';
import { buildFiveModelScannerCandidatePreviewDryRun } from './five-model-scanner-candidate-preview-dry-run';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-model-preview-dry-run-'));
const contractPath = path.join(tempDir, 'contract.json');
const comparisonPath = path.join(tempDir, 'comparison.json');
const raidSelectorPath = path.join(tempDir, 'raid-selector.json');
const shiftSelectorPath = path.join(tempDir, 'shift-selector.json');

function selectorRow(args: { riskPoints: number; quality?: 'tight' | 'usable' | 'loose' }) {
  return {
    trade: {
      date: '2026-06-17',
      session: 'morning',
      direction: 'SHORT',
      entryTimeEt: '2026-06-17T10:35:40',
      dollars: 112.5,
    },
    quality: args.quality ?? 'tight',
    bestDetection: {
      proofTime: '2026-06-17T10:35:00',
      entry: 7590,
      stop: 7590 + args.riskPoints,
      target1: 7590 - args.riskPoints * 1.5,
      target2: 7590 - args.riskPoints * 2,
      riskPoints: args.riskPoints,
      htfContext: 'support',
    },
    minutesBeforeEntry: 0,
    entryDistancePoints: 1,
  };
}

fs.writeFileSync(raidSelectorPath, JSON.stringify({
  rows: [
    selectorRow({ riskPoints: TRADE_RULES.maxRiskPoints }),
    selectorRow({ riskPoints: TRADE_RULES.maxRiskPoints + 2, quality: 'usable' }),
    selectorRow({ riskPoints: 2, quality: 'loose' }),
  ],
}, null, 2));

fs.writeFileSync(shiftSelectorPath, JSON.stringify({
  rows: [
    selectorRow({ riskPoints: 3 }),
  ],
}, null, 2));

fs.writeFileSync(comparisonPath, JSON.stringify({
  source: {
    raidFailureDisplacementSelectorJson: raidSelectorPath,
    structureShiftContinuationSelectorJson: shiftSelectorPath,
  },
}, null, 2));

fs.writeFileSync(contractPath, JSON.stringify({
  source: {
    comparisonJson: comparisonPath,
  },
  lanes: [
    { modelId: 'raid_failure_displacement_reversal', displayName: 'Raid Failure Displacement Reversal', role: 'primary_candidate_lane' },
    { modelId: 'structure_shift_continuation', displayName: 'Structure Shift Continuation', role: 'secondary_candidate_lane' },
    { modelId: 'failed_breakout_reversal', displayName: 'Failed Breakout Reversal', role: 'context_only_lane' },
  ],
}, null, 2));

const defaultOff = buildFiveModelScannerCandidatePreviewDryRun({
  previewContractJson: contractPath,
  localPreview: false,
  json: true,
});

assert.equal(defaultOff.authority.localPreviewRequested, false);
assert.equal(defaultOff.summary.candidateLanes, 2);
assert.equal(defaultOff.summary.contextOnlyLanes, 1);
assert.equal(defaultOff.summary.shapedPreviewRows, 0);
assert.equal(defaultOff.summary.canExecuteTrueRows, 0);

const localPreview = buildFiveModelScannerCandidatePreviewDryRun({
  previewContractJson: contractPath,
  localPreview: true,
  json: true,
});

assert.equal(localPreview.authority.localPreviewRequested, true);
assert.equal(localPreview.authority.noSetupRegistryChange, true);
assert.equal(localPreview.authority.noScannerWiring, true);
assert.equal(localPreview.authority.noDiscordPost, true);
assert.equal(localPreview.authority.noSupabaseRead, true);
assert.equal(localPreview.authority.noSupabaseWrite, true);
assert.equal(localPreview.authority.noBridgeRead, true);
assert.equal(localPreview.authority.noExecutionApproval, true);
assert.equal(localPreview.authority.noCanExecuteChange, true);
assert.equal(localPreview.summary.shapedPreviewRows, 3);
assert.equal(localPreview.summary.previewReadyRows, 2);
assert.equal(localPreview.summary.heldByRiskRows, 1);
assert.equal(localPreview.summary.scannerInstallEligibleRows, 0);
assert.equal(localPreview.summary.discordEligibleRows, 0);
assert.equal(localPreview.summary.executionApprovalEligibleRows, 0);
assert.equal(localPreview.summary.canExecuteTrueRows, 0);
assert.equal(localPreview.contextOnlyLanes[0]?.modelId, 'failed_breakout_reversal');
assert.equal(localPreview.rows.every((row) => row.canExecute === false), true);
assert.equal(localPreview.rows.every((row) => row.scannerInstallEligible === false), true);
assert.equal(localPreview.recommendation, 'continue_to_disabled_scanner_surface_adapter_preview');

console.log('five-model scanner-candidate preview dry run verified');
