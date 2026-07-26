import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-outcome-key-expansion-miner';

const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outcome-key-expansion-'));
fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-07-06-MES-morning.json'), '{}');

const passReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport({
  reportDir: 'reports',
  auditDir,
  realMetadataReplayPath: 'real.json',
  outcomePath: 'outcome.json',
  realMetadataReplay: {
    status: 'pass',
    rows: [
      {
        tradeDate: '2026-07-06',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        completedBarTime: '2026-07-06T09:35:00',
        selectorDecision: 'keep_later_sweep_proof',
        deterministicLevelsValid: true,
      },
      {
        tradeDate: '2026-07-06',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        completedBarTime: '2026-07-06T09:40:00',
        selectorDecision: 'keep_later_sweep_proof',
        deterministicLevelsValid: false,
      },
    ],
  },
  outcome: {
    status: 'pass',
    rows: [
      {
        tradeDate: '2026-06-10',
        session: 'morning',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-06-10T10:05:00',
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(passReport.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_outcome_key_expansion_miner');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.readOnly, true);
assert.equal(passReport.authority.runsSetupScanner, false);
assert.equal(passReport.summary.realKeepLaterRows, 2);
assert.equal(passReport.summary.realKeepLaterRowsWithValidLevels, 1);
assert.equal(passReport.summary.outcomeRows, 1);
assert.equal(passReport.summary.exactOutcomeMatchedRows, 0);
assert.equal(passReport.summary.looseOutcomeMatchedRows, 0);
assert.equal(passReport.summary.unmatchedRealRowsWithScannerTape, 2);
assert.equal(passReport.summary.unmatchedRealRowsWithoutScannerTape, 0);
assert.equal(passReport.summary.distinctRealGroupsWithScannerTape, 1);
assert.equal(passReport.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(passReport.summary.recommendation, 'build_real_row_replay_package_from_local_scanner_tapes');
assert.ok(passReport.gates.some((gate) => gate.name === 'direct_outcome_key_coverage' && gate.status === 'caution'));
assert.match(passReport.markdown, /Outcome Key Expansion Miner/);

const failReport = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport({
  reportDir: 'reports',
  auditDir,
  realMetadataReplayPath: 'real.json',
  outcomePath: 'outcome.json',
  realMetadataReplay: { status: 'pass', rows: [] },
  outcome: { status: 'pass', rows: [] },
}, '2026-07-19T00:01:00.000Z');

assert.equal(failReport.status, 'fail');
assert.ok(failReport.blockers.some((blocker) => blocker.includes('real_metadata_rows_available')));

console.log('OpeningDrive keep-later-proof selector outcome-key expansion miner verified.');
