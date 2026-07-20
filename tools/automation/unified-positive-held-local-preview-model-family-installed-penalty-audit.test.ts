import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport,
} from './unified-positive-held-local-preview-model-family-installed-penalty-audit';

const intakeTriageReport = {
  rows: [
    {
      intakeId: 'bad-sweep',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      entry: 100,
      stop: 101,
      target1: 104,
      target2: 106,
      riskPoints: 1,
      executionStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      modelPriority: 100,
      proofPriority: 55,
      triageScore: 200,
    },
    {
      intakeId: 'valid-sweep',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      entry: 100,
      stop: 97,
      target1: 104.5,
      target2: 106,
      riskPoints: 3,
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      modelPriority: 88,
      proofPriority: 55,
      triageScore: 150,
    },
  ],
};

const modelFamilyBroadReplayReport = {
  status: 'pass',
  rows: [
    {
      rowId: 'bad-sweep',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
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
      rowId: 'valid-sweep',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      triageDecision: 'held_for_later_batch',
      riskPoints: 3,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 30,
      entryHitTime: '2026-06-05T12:10:00',
      blockers: [],
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport({
  reportDir: 'reports',
  modelFamilyBroadReplayPath: 'broad.json',
  modelFamilyBroadReplayReport: modelFamilyBroadReplayReport as never,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_model_family_installed_penalty_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.replayRowsRead, 2);
assert.equal(report.summary.invalidStopSweepRows, 1);
assert.equal(report.summary.invalidStopSweepRowsBlocked, 1);
assert.equal(report.summary.invalidStopSweepCanExecuteTrueRows, 0);
assert.equal(report.summary.invalidStopSweepPrimaryRows, 0);
assert.equal(report.summary.invalidStopSweepRowsWithValidAlternativeAbove, 1);
assert.equal(report.summary.entryStopTargetRiskDriftRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'installed_penalty_protects_selection_continue_builder_source_audit');
assert.match(report.markdown, /Installed Penalty Audit/);

const missing = buildUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport({
  reportDir: 'reports',
  modelFamilyBroadReplayPath: null,
  modelFamilyBroadReplayReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
}, '2026-07-20T00:00:01.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing model-family broad replay path'));

console.log('unified positive held-local model-family installed penalty audit verified.');
