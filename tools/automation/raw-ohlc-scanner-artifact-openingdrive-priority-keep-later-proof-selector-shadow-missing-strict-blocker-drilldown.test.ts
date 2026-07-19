import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-strict-blocker-drilldown-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'snapshot-missing-levels.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [
      {
        setupType: 'TurtleSoup',
        direction: 'SHORT',
        stop: 7455.75,
        executionStatus: 'Conditional',
        detectedStatus: 'Possible',
        blockReason: 'EntryTriggerMissing',
      },
      {
        setupType: 'TurtleSoup',
        direction: 'LONG',
        entry: 7442.5,
        stop: 7438.5,
        target1: 7448.5,
        target2: 7450.5,
        executionStatus: 'Executable',
        detectedStatus: 'Conditional',
      },
    ],
  },
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'snapshot-invalid-stop.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [
      {
        setupType: 'SweepMssFvgRetrace',
        direction: 'LONG',
        entry: 7442.5,
        stop: 7450,
        target1: 7453.75,
        target2: 7457.5,
        executionStatus: 'Blocked',
        detectedStatus: 'Blocked',
        blockReason: 'InvalidStopLocation',
      },
      {
        setupType: 'OpeningDriveFvgContinuation',
        direction: 'LONG',
        entry: 7443,
        stop: 7436,
        target1: 7453.5,
        target2: 7457,
        executionStatus: 'Conditional',
        detectedStatus: 'Conditional',
      },
    ],
  },
}, null, 2));

const strictReplayPackage = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  status: 'fail',
  summary: {
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: '2026-06-23|evening|TurtleSoup|SHORT|prefer_replacement|snapshot-missing-levels',
      tradeDate: '2026-06-23',
      session: 'evening',
      instrument: 'MES',
      setupType: 'TurtleSoup',
      direction: 'SHORT',
      proofTime: '2026-06-23T19:55:00',
      firstSeenTime: '2026-06-23T19:55:00',
      lastSeenTime: '2026-06-23T19:55:00',
      occurrences: 37,
      entry: Number.NaN,
      stop: 7455.75,
      t1: Number.NaN,
      t2: Number.NaN,
      riskPoints: 0,
      t1R: null,
      t2R: null,
      proofState: 'strict_missing_shadow:prefer_replacement',
      triageScore: 37,
      sourceTapePath: 'missing',
      barsSource: 'missing',
      barsLoaded: 0,
      barsAfterProof: 0,
      firstBarTime: null,
      lastBarTime: null,
      outcomeInputStatus: 'blocked',
      blockers: ['nonpositive entry placeholder', 'nonpositive T1 placeholder', 'nonpositive T2 placeholder'],
    },
    {
      ticketId: '2026-06-29|evening|SweepMssFvgRetrace|LONG|keep_later_sweep_proof|snapshot-invalid-stop',
      tradeDate: '2026-06-29',
      session: 'evening',
      instrument: 'MES',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-06-29T19:55:00',
      firstSeenTime: '2026-06-29T19:55:00',
      lastSeenTime: '2026-06-29T19:55:00',
      occurrences: 18,
      entry: 7442.5,
      stop: 7450,
      t1: 7453.75,
      t2: 7457.5,
      riskPoints: 7.5,
      t1R: null,
      t2R: null,
      proofState: 'strict_missing_shadow:keep_later_sweep_proof',
      triageScore: 18,
      sourceTapePath: 'missing',
      barsSource: 'missing',
      barsLoaded: 0,
      barsAfterProof: 0,
      firstBarTime: null,
      lastBarTime: null,
      outcomeInputStatus: 'blocked',
      blockers: ['directionally invalid entry-to-stop geometry'],
    },
    {
      ticketId: 'ready-row|snapshot-invalid-stop',
      tradeDate: '2026-06-29',
      session: 'evening',
      instrument: 'MES',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      proofTime: '2026-06-29T19:55:00',
      firstSeenTime: '2026-06-29T19:55:00',
      lastSeenTime: '2026-06-29T19:55:00',
      occurrences: 1,
      entry: 7442.5,
      stop: 7450,
      t1: 7431.25,
      t2: 7427.5,
      riskPoints: 7.5,
      t1R: 1.5,
      t2R: 2,
      proofState: 'strict_missing_shadow:keep_later_sweep_proof',
      triageScore: 1,
      sourceTapePath: 'missing',
      barsSource: 'missing',
      barsLoaded: 0,
      barsAfterProof: 0,
      firstBarTime: null,
      lastBarTime: null,
      outcomeInputStatus: 'ready_for_read_only_outcome_replay',
      blockers: [],
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport({
  strictReplayPackagePath: 'strict-package.json',
  strictReplayPackage: strictReplayPackage as any,
  auditDir,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_strict_blocker_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.blockedRows, 2);
assert.equal(report.summary.matchingSideMissingLevelsRows, 1);
assert.equal(report.summary.matchingSideInvalidEntryStopRows, 1);
assert.equal(report.summary.validOppositeOrAlternateCandidateRows, 2);
assert.equal(report.summary.missingMatchingCandidateRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'inspect_matching_side_level_generation');

const missing = report.rows.find((row) => row.setupType === 'TurtleSoup');
assert.equal(missing?.likelyCause, 'matching_side_missing_levels');
assert.equal(missing?.validSameSetupOppositeDirectionCandidates, 1);
assert.equal(missing?.validExecutableCandidates, 1);
assert.equal(missing?.matchingCandidates[0].geometryState, 'placeholder_or_missing');

const invalid = report.rows.find((row) => row.setupType === 'SweepMssFvgRetrace');
assert.equal(invalid?.likelyCause, 'matching_side_invalid_entry_stop');
assert.equal(invalid?.validDifferentSetupSameDirectionCandidates, 1);
assert.equal(invalid?.matchingCandidates[0].geometryState, 'complete_invalid');
assert.match(report.markdown, /Strict Blocker Drilldown/);

const missingInput = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport({
  strictReplayPackagePath: null,
  strictReplayPackage: null,
  auditDir,
}, '2026-07-19T00:01:00.000Z');

assert.equal(missingInput.status, 'fail');
assert.ok(missingInput.blockers.includes('missing strict replay package path'));

console.log('OpeningDrive keep-later-proof selector shadow missing strict blocker drilldown verified.');
