import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-replay-package';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-missing-strict-replay-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-evening-2026-06-23-MES-EVENING-valid.json'), JSON.stringify({
  completed5m: {
    time: '2026-06-23T19:55:00.0000000',
    open: 7440,
    high: 7448,
    low: 7435,
    close: 7446,
  },
  normalizedPlan: {
    setupCandidates: [
      {
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        entry: 7442.5,
        stop: 7450,
        target1: 7453.75,
        target2: 7457.5,
      },
      {
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        entry: 7442.5,
        stop: 7431.5,
        target1: 7459,
        target2: 7464.5,
      },
    ],
  },
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-23-MES-evening.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-23',
  instrument: 'MES',
  session: 'evening',
  events: {
    '2026-06-23T19:55:00.0000000': {
      completed5m: {
        time: '2026-06-23T19:55:00.0000000',
        open: 7440,
        high: 7448,
        low: 7435,
        close: 7446,
      },
    },
    '2026-06-23T20:00:00.0000000': {
      completed5m: {
        time: '2026-06-23T20:00:00.0000000',
        open: 7446,
        high: 7452,
        low: 7444,
        close: 7450,
      },
    },
  },
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'scanner-morning-2026-06-24-MES-MORNING-missing-tape.json'), JSON.stringify({
  completed5m: {
    time: '2026-06-24T10:05:00.0000000',
    open: 7450,
    high: 7453,
    low: 7440,
    close: 7442,
  },
  normalizedPlan: {
    setupCandidates: [
      {
        setupType: 'historicalReview',
        direction: 'SHORT',
        entry: 7442,
        stop: 7452,
        target1: 7427,
        target2: 7422,
      },
    ],
  },
}, null, 2));

const missingReplayPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_replay_package',
  status: 'pass',
  rows: [
    {
      packagePriority: 1,
      replayQueueKey: '2026-06-23|evening|NoInstalledSetup|LONG|keep_later_sweep_proof',
      tradeDate: '2026-06-23',
      sessionType: 'evening',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      selectorDecision: 'keep_later_sweep_proof',
      shadowRows: 41,
      wouldChangePrimaryRows: 29,
      sampleSnapshotIds: ['scanner-evening-2026-06-23-MES-EVENING-valid'],
      replayIntent: 'resolve_missing_shadow_outcome_coverage',
      outcomeReplayStatus: 'queued_for_saved_report_replay',
    },
    {
      packagePriority: 2,
      replayQueueKey: '2026-06-24|morning|historicalReview|SHORT|prefer_replacement',
      tradeDate: '2026-06-24',
      sessionType: 'morning',
      setupType: 'historicalReview',
      direction: 'SHORT',
      selectorDecision: 'prefer_replacement',
      shadowRows: 16,
      wouldChangePrimaryRows: 16,
      sampleSnapshotIds: ['scanner-morning-2026-06-24-MES-MORNING-missing-tape'],
      replayIntent: 'resolve_missing_shadow_outcome_coverage',
      outcomeReplayStatus: 'queued_for_saved_report_replay',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport({
  missingReplayPackagePath: 'missing-package.json',
  missingReplayPackage: missingReplayPackage as any,
  auditDir,
  limit: null,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package');
assert.equal(report.status, 'fail');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.selectedRowsRead, 2);
assert.equal(report.summary.readyRows, 1);
assert.equal(report.summary.blockedRows, 1);
assert.equal(report.summary.directionallyInvalidGeometryRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const ready = report.rows.find((row) => row.setupType === 'NoInstalledSetup');
assert.equal(ready?.outcomeInputStatus, 'ready_for_read_only_outcome_replay');
assert.equal(ready?.entry, 7442.5);
assert.equal(ready?.stop, 7431.5);
assert.equal(ready?.riskPoints, 11);
assert.equal(ready?.t1R, 1.5);
assert.equal(ready?.t2R, 2);
assert.equal(ready?.proofTime, '2026-06-23T19:55:00');
assert.equal(ready?.barsLoaded, 2);
assert.equal(ready?.barsAfterProof, 2);

const blocked = report.rows.find((row) => row.setupType === 'historicalReview');
assert.equal(blocked?.outcomeInputStatus, 'blocked');
assert.ok(blocked?.blockers.includes('missing scanner decision tape'));
assert.ok(blocked?.blockers.includes('missing completed 5M bars from scanner decision tape'));
assert.match(report.markdown, /OpeningDrive Keep-Later-Proof Selector Shadow Missing Strict Replay Package/);

const limited = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport({
  missingReplayPackagePath: 'missing-package.json',
  missingReplayPackage: missingReplayPackage as any,
  auditDir,
  limit: 1,
}, '2026-07-19T00:01:00.000Z');

assert.equal(limited.status, 'pass');
assert.equal(limited.summary.selectedRowsRead, 1);
assert.equal(limited.summary.readyRows, 1);
assert.equal(limited.summary.blockedRows, 0);
assert.deepEqual(limited.blockers, []);

const readyOnly = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictReplayPackageReport({
  missingReplayPackagePath: 'missing-package.json',
  missingReplayPackage: missingReplayPackage as any,
  auditDir,
  limit: null,
  readyOnly: true,
}, '2026-07-19T00:02:00.000Z');

assert.equal(readyOnly.status, 'pass');
assert.equal(readyOnly.summary.selectedRowsRead, 2);
assert.equal(readyOnly.summary.replayPackageRows, 1);
assert.equal(readyOnly.summary.readyRows, 1);
assert.equal(readyOnly.summary.blockedRows, 0);
assert.equal(readyOnly.rows.length, 1);
assert.equal(readyOnly.rows[0].setupType, 'NoInstalledSetup');
assert.deepEqual(readyOnly.blockers, []);
assert.match(readyOnly.recommendations[0], /strict-ready rows/);

console.log('OpeningDrive keep-later-proof selector shadow missing strict replay package verified.');
