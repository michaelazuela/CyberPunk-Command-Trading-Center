import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-unresolved-exclusion-drilldown';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-unresolved-exclusion-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'sweep-countertrend.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [{
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      entry: 7395,
      stop: 7396.75,
      target1: 7397.75,
      target2: 7399.25,
      blockReason: 'EntryTriggerPending',
      missingEvidence: ['Countertrend setup requires immediate failure confirmation', 'Active timeframe MSS ruleset found opposing completed 5M bearish MSS.'],
      evidence: ['Structure signal conflicts with higher-timeframe thesis'],
      activeRuleset: { timeframeMss: { blockers: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 15M.'] } },
    }],
  },
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'failed-no-levels.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [{
      setupType: 'RaidReclaimReversal',
      direction: 'SHORT',
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      blockReason: 'EntryTriggerPending',
      missingEvidence: ['Defined opposite-side 5M entry', 'Protected opposite-side 5M structure stop'],
      evidence: ['5M trigger status: confirmed'],
      activeRuleset: {},
    }],
  },
}, null, 2));

fs.writeFileSync(path.join(auditDir, 'htf-stop-conflict.json'), JSON.stringify({
  normalizedPlan: {
    setupCandidates: [{
      setupType: 'IntradayMssMicroContinuation',
      direction: 'SHORT',
      entry: 7444.5,
      stop: null,
      target1: null,
      target2: null,
      blockReason: 'EntryTriggerPending',
      missingEvidence: ['Protected 5M MSS swing stop blocked: 5M MSS direction is bullish, not bearish.', 'Protected 5M structure stop'],
      evidence: ['MSS_HOLD_CONFIRMED: completed 5M close confirmed'],
      activeRuleset: { timeframeMss: { blockers: ['Active timeframe MSS ruleset found opposing completed 5M bullish MSS.'] } },
    }],
  },
}, null, 2));

const carveoutMiner = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_exclusion_carveout_miner',
  status: 'pass',
  rows: [
    {
      ticketId: 'sweep',
      tradeDate: '2026-06-12',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      snapshotId: 'sweep-countertrend',
      performanceCarveoutEligible: false,
      blockReason: 'EntryTriggerPending',
    },
    {
      ticketId: 'failed',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'RaidReclaimReversal',
      direction: 'SHORT',
      snapshotId: 'failed-no-levels',
      performanceCarveoutEligible: false,
      blockReason: 'EntryTriggerPending',
    },
    {
      ticketId: 'htf',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'SHORT',
      snapshotId: 'htf-stop-conflict',
      performanceCarveoutEligible: false,
      blockReason: 'EntryTriggerPending',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport({
  carveoutMinerPath: 'carveout.json',
  carveoutMiner: carveoutMiner as any,
  auditDir,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_unresolved_exclusion_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.unresolvedRows, 3);
assert.equal(report.summary.newlyPerformanceCarveoutEligibleRows, 3);
assert.equal(report.summary.manualInspectionRows, 0);
assert.equal(report.summary.selectorProposalEligibleRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'rerun_readiness_with_research_accounting_carveouts');
assert.equal(report.rows.find((row) => row.ticketId === 'sweep')?.unresolvedClass, 'countertrend_opposing_mss_conditional');
assert.equal(report.rows.find((row) => row.ticketId === 'failed')?.unresolvedClass, 'raid_reclaim_reversal_no_deterministic_levels');
assert.equal(report.rows.find((row) => row.ticketId === 'htf')?.unresolvedClass, 'htf_mss_protected_stop_conflict');
assert.ok(report.rows.every((row) => row.performanceCarveoutEligible));
assert.ok(report.rows.every((row) => !row.selectorProposalEligible));
assert.match(report.markdown, /Unresolved Exclusion Drilldown/);

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport({
  carveoutMinerPath: null,
  carveoutMiner: null,
  auditDir,
}, '2026-07-19T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing carveout miner path'));

console.log('OpeningDrive keep-later-proof selector unresolved exclusion drilldown verified.');
