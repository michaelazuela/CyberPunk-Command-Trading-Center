import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TRADE_RULES } from '../../src/config/tradeRules';
import { buildRaidFailureDisplacementLocalPreviewDryRun } from './raid-failure-displacement-local-preview-dry-run';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raid-failure-displacement-preview-'));
const selectorPath = path.join(tempDir, 'selector.json');

function row(args: { riskPoints: number; htfContext?: string; evidence?: string[]; quality?: 'tight' | 'usable' | 'loose' }) {
  return {
    trade: {
      date: '2026-06-17',
      session: 'morning',
      direction: 'SHORT',
      entryTimeEt: '2026-06-17T10:35:40',
      entry: 7589,
      exit: 7566.5,
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
      htfContext: args.htfContext ?? 'support',
      evidence: args.evidence ?? ['Displacement left imbalance context.'],
    },
    minutesBeforeEntry: 0,
    entryDistancePoints: 1,
    scannerInstallEligible: false,
    promotionEligible: false,
    discordEligible: false,
    executionApprovalEligible: false,
  };
}

fs.writeFileSync(selectorPath, JSON.stringify({
  rows: [
    row({ riskPoints: TRADE_RULES.maxRiskPoints }),
    row({ riskPoints: TRADE_RULES.maxRiskPoints + 4 }),
    row({ riskPoints: 3, htfContext: 'conflict' }),
    row({ riskPoints: 3, evidence: ['Directional displacement confirmed.'] }),
    row({ riskPoints: 3, quality: 'loose' }),
  ],
}, null, 2));

const defaultOff = buildRaidFailureDisplacementLocalPreviewDryRun({
  selectorJson: selectorPath,
  localPreview: false,
  json: true,
});

assert.equal(defaultOff.authority.localPreviewRequested, false);
assert.equal(defaultOff.summary.clauseQualifiedRows, 2);
assert.equal(defaultOff.summary.shapedPreviewRows, 0);
assert.equal(defaultOff.summary.previewReadyRows, 0);
assert.equal(defaultOff.summary.heldByRiskRows, 0);
assert.equal(defaultOff.summary.canExecuteTrueRows, 0);

const localPreview = buildRaidFailureDisplacementLocalPreviewDryRun({
  selectorJson: selectorPath,
  localPreview: true,
  json: true,
});

assert.equal(localPreview.authority.localPreviewRequested, true);
assert.equal(localPreview.authority.noScannerWiring, true);
assert.equal(localPreview.authority.noDiscordPost, true);
assert.equal(localPreview.authority.noSupabaseRead, true);
assert.equal(localPreview.authority.noSupabaseWrite, true);
assert.equal(localPreview.authority.noBridgeRead, true);
assert.equal(localPreview.authority.noExecutionApproval, true);
assert.equal(localPreview.authority.noCanExecuteChange, true);
assert.equal(localPreview.summary.clauseQualifiedRows, 2);
assert.equal(localPreview.summary.shapedPreviewRows, 2);
assert.equal(localPreview.summary.previewReadyRows, 1);
assert.equal(localPreview.summary.heldByRiskRows, 1);
assert.equal(localPreview.summary.scannerInstallEligibleRows, 0);
assert.equal(localPreview.summary.promotionEligibleRows, 0);
assert.equal(localPreview.summary.discordEligibleRows, 0);
assert.equal(localPreview.summary.executionApprovalEligibleRows, 0);
assert.equal(localPreview.summary.canExecuteTrueRows, 0);
assert.equal(localPreview.rows[0]?.canExecute, false);
assert.equal(localPreview.rows[0]?.discordEligible, false);
assert.equal(localPreview.rows[1]?.readiness, 'held_by_risk');

console.log('raid failure displacement local preview dry run verified');
