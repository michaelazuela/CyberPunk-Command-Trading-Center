import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-level-generation-path-diagnostic';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-level-path-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'snapshot-entry-missing.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [
      {
        setupType: 'raidReclaim',
        direction: 'SHORT',
        stop: 7455.75,
        executionStatus: 'Conditional',
        detectedStatus: 'Possible',
        blockReason: 'EntryTriggerMissing',
        requiredTrigger: 'Fresh completed 5M reclaim trigger is required.',
        nextAction: 'Wait for fresh entry proof.',
        missingEvidence: ['Entry trigger missing'],
        evidence: ['Liquidity sweep visible'],
        activeRuleset: {
          htfLineInSand: {
            blockers: ['No chase: wait for completed close.'],
          },
        },
        decisionQualityHardBlocker: null,
      },
    ],
  },
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'snapshot-invalid-stop.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [
      {
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT',
        stop: 7466.75,
        executionStatus: 'Blocked',
        detectedStatus: 'Blocked',
        blockReason: 'InvalidStopLocation',
        requiredTrigger: 'Retrace into bearish FVG.',
        nextAction: 'Candidate invalidated. Stand down.',
        missingEvidence: ['Candidate invalidated: current 5M price action has already traded through the structure stop/invalidation.'],
        evidence: ['5M bearish MSS aligned'],
        activeRuleset: {
          timeframeMss: {
            blockers: ['Opposing completed HTF MSS caution.'],
          },
        },
        decisionQualityHardBlocker: 'InvalidStopLocation',
      },
    ],
  },
}, null, 2));

const blockerDrilldown = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_strict_blocker_drilldown',
  status: 'pass',
  rows: [
    {
      ticketId: '2026-06-23|evening|raidReclaim|SHORT|prefer_replacement|snapshot-entry-missing',
      tradeDate: '2026-06-23',
      session: 'evening',
      setupType: 'raidReclaim',
      direction: 'SHORT',
      snapshotId: 'snapshot-entry-missing',
    },
    {
      ticketId: '2026-06-29|lunch|SweepMssFvgRetrace|SHORT|keep_later_sweep_proof|snapshot-invalid-stop',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      snapshotId: 'snapshot-invalid-stop',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport({
  blockerDrilldownPath: 'blocker-drilldown.json',
  blockerDrilldown: blockerDrilldown as any,
  auditDir,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_level_generation_path_diagnostic');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.rows, 2);
assert.equal(report.summary.waitingForEntryTriggerRows, 1);
assert.equal(report.summary.invalidatedWithoutReplayableEntryRows, 1);
assert.equal(report.summary.missingTargetGeometryAfterTriggerRows, 0);
assert.equal(report.summary.unclassifiedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'keep_blocked_until_fresh_entry_or_valid_stop');

const wait = report.rows.find((row) => row.setupType === 'raidReclaim');
assert.equal(wait?.pathState, 'waiting_for_entry_trigger');
assert.equal(wait?.replayUse, 'do_not_replay_until_fresh_entry');
assert.equal(wait?.requiredTrigger, 'Fresh completed 5M reclaim trigger is required.');
assert.ok(wait?.activeRulesetBlockers.includes('No chase: wait for completed close.'));

const invalid = report.rows.find((row) => row.setupType === 'SweepMssFvgRetrace');
assert.equal(invalid?.pathState, 'invalidated_without_replayable_entry');
assert.equal(invalid?.replayUse, 'do_not_replay_stale_invalidated_plan');
assert.equal(invalid?.decisionQualityHardBlocker, 'InvalidStopLocation');
assert.match(report.markdown, /Level-Generation Path Diagnostic/);

const missingInput = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport({
  blockerDrilldownPath: null,
  blockerDrilldown: null,
  auditDir,
}, '2026-07-19T00:01:00.000Z');

assert.equal(missingInput.status, 'fail');
assert.ok(missingInput.blockers.includes('missing blocker drilldown path'));

console.log('OpeningDrive keep-later-proof selector shadow missing level-generation path diagnostic verified.');
