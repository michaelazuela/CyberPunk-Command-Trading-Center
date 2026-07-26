import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport,
} from './unified-positive-held-local-preview-model-family-geometry-drilldown';

const modelFamilyBroadReplayReport = {
  status: 'pass',
  rows: [
    {
      rowId: 'bad-long',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 4,
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers: ['directionally invalid long entry-to-stop geometry'],
    },
    {
      rowId: 'bad-short-target',
      tradeDate: '2026-06-06',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      triageDecision: 'selected_for_replay_package',
      riskPoints: 3,
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers: ['directionally invalid short target geometry'],
    },
    {
      rowId: 'winner-ignored',
      tradeDate: '2026-06-07',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 3,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 30,
      entryHitTime: '2026-06-07T12:05:00',
      blockers: [],
    },
  ],
};

const intakeTriageReport = {
  rows: [
    {
      intakeId: 'bad-long',
      tradeDate: '2026-06-05',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-05T12:00:00',
      entry: 100,
      stop: 101,
      target1: 104,
      target2: 106,
      riskPoints: 1,
      sourceFile: 'scanner-decision-tape-2026-06-05-MES-lunch.json',
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'bad-short-target',
      tradeDate: '2026-06-06',
      session: 'morning',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      firstSeenTime: '2026-06-06T09:30:00',
      entry: 200,
      stop: 203,
      target1: 201,
      target2: 198,
      riskPoints: 3,
      sourceFile: 'scanner-decision-tape-2026-06-06-MES-morning.json',
      triageDecision: 'selected_for_replay_package',
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport({
  reportDir: 'reports',
  modelFamilyBroadReplayPath: 'broad.json',
  modelFamilyBroadReplayReport: modelFamilyBroadReplayReport as never,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_model_family_geometry_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.rowLevelBlockedDoesNotEqualModelRemoval, true);
assert.equal(report.summary.replayRowsRead, 3);
assert.equal(report.summary.blockedRows, 2);
assert.equal(report.summary.rowsWithIntakeMatch, 2);
assert.equal(report.summary.longStopNotBelowEntryRows, 1);
assert.equal(report.summary.targetDirectionIssueRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].entry, 100);
assert.equal(report.rows[0].stop, 101);
assert.equal(report.rows[0].geometryIssue, 'long_stop_not_below_entry');
assert.equal(report.rows[1].geometryIssue, 'short_target_not_below_entry');
assert.match(report.markdown, /source-geometry quality rows/);

const missing = buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport({
  reportDir: 'reports',
  modelFamilyBroadReplayPath: null,
  modelFamilyBroadReplayReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
}, '2026-07-20T00:00:01.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing model-family broad replay path'));

console.log('unified positive held-local model-family geometry drilldown verified.');
