import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport,
} from './unified-positive-held-local-preview-model-family-valid-slate-simulation';

const intakeTriageReport = {
  rows: [
    {
      intakeId: 'blocked-top',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-05T12:00:00',
      occurrences: 10,
      entry: 100,
      stop: 101,
      target1: 104,
      target2: 106,
      riskPoints: 1,
      executionStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      triageScore: 200,
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'valid-replacement',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-05T12:05:00',
      occurrences: 4,
      entry: 100,
      stop: 97,
      target1: 104.5,
      target2: 106,
      riskPoints: 3,
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      triageScore: 150,
      triageDecision: 'held_for_later_batch',
    },
    {
      intakeId: 'stable-top',
      tradeDate: '2026-06-06',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      firstSeenTime: '2026-06-06T12:05:00',
      occurrences: 3,
      entry: 200,
      stop: 203,
      target1: 195.5,
      target2: 194,
      riskPoints: 3,
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      triageScore: 160,
      triageDecision: 'held_for_later_batch',
    },
  ],
};

const modelFamilyBroadReplayReport = {
  status: 'pass',
  rows: [
    {
      rowId: 'blocked-top',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 1,
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers: ['directionally invalid long entry-to-stop geometry'],
    },
    {
      rowId: 'valid-replacement',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 3,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 30,
      entryHitTime: '2026-06-05T12:10:00',
      blockers: [],
    },
    {
      rowId: 'stable-top',
      tradeDate: '2026-06-06',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      triageDecision: 'held_for_later_batch',
      riskPoints: 3,
      outcomeBucket: 'loss',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -15,
      entryHitTime: '2026-06-06T12:10:00',
      blockers: [],
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport({
  reportDir: 'reports',
  modelFamilyBroadReplayPath: 'broad.json',
  modelFamilyBroadReplayReport: modelFamilyBroadReplayReport as never,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_model_family_valid_slate_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.outcomesUsedOnlyForEvaluation, true);
assert.equal(report.summary.replayRowsRead, 3);
assert.equal(report.summary.joinedRows, 3);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineBlockedGeometryTopSlates, 1);
assert.equal(report.summary.changedFromBlockedGeometryToValidCandidateSlates, 1);
assert.equal(report.summary.validOnlyTopOneMesPl, 15);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.slates[0].baselineTopRowId, 'blocked-top');
assert.equal(report.slates[0].validOnlyTopRowId, 'valid-replacement');
assert.match(report.markdown, /Valid Slate Simulation/);

const missing = buildUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport({
  reportDir: 'reports',
  modelFamilyBroadReplayPath: null,
  modelFamilyBroadReplayReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
}, '2026-07-20T00:00:01.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing model-family broad replay path'));

console.log('unified positive held-local model-family valid slate simulation verified.');
