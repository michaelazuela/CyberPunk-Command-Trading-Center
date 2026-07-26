import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-replay-package';

const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'real-row-replay-package-'));
fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-07-06-MES-morning.json'), JSON.stringify({
  events: {
    a: { completed5m: { time: '2026-07-06T09:35:00', open: 100, high: 101, low: 99, close: 100.5 } },
    b: { completed5m: { time: '2026-07-06T09:40:00', open: 100.5, high: 103, low: 100, close: 102 } },
  },
}));

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport({
  reportDir: 'reports',
  auditDir,
  realMetadataReplayPath: 'real.json',
  realMetadataReplay: {
    status: 'pass',
    rows: [
      {
        candidateKey: 'ready',
        tradeDate: '2026-07-06',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        completedBarTime: '2026-07-06T09:35:00',
        selectorDecision: 'keep_later_sweep_proof',
        entry: 100,
        stop: 98,
        target1: 103,
        target2: 104,
      },
      {
        tradeDate: '2026-07-06',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        completedBarTime: '2026-07-06T09:35:00',
        selectorDecision: 'keep_later_sweep_proof',
        entry: 100,
        stop: null,
        target1: null,
        target2: null,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_replay_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.realKeepLaterRowsRead, 2);
assert.equal(report.summary.readyReplayRows, 1);
assert.equal(report.summary.excludedMissingLevelRows, 1);
assert.equal(report.summary.excludedInvalidGeometryRows, 0);
assert.equal(report.summary.excludedMissingTapeRows, 0);
assert.equal(report.summary.excludedMissingBarsAfterProofRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].ticketId, 'ready');
assert.equal(report.rows[0].outcomeInputStatus, 'ready_for_read_only_outcome_replay');
assert.equal(report.rows[0].barsAfterProof, 2);
assert.match(report.markdown, /Real-Row Replay Package/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport({
  reportDir: 'reports',
  auditDir,
  realMetadataReplayPath: 'real.json',
  realMetadataReplay: { status: 'pass', rows: [] },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.ok(failReport.blockers.some((blocker) => blocker.includes('no keep_later_sweep_proof rows')));

console.log('OpeningDrive keep-later-proof selector real-row replay package verified.');
