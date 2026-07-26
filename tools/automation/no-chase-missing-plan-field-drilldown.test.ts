import assert from 'node:assert/strict';
import {
  buildNoChaseMissingPlanFieldDrilldownReport,
  parseNoChaseMissingPlanFieldDrilldownArgs,
} from './no-chase-missing-plan-field-drilldown';

const proofReport = {
  reportType: 'no_chase_ohlc_proof_extractor',
  summary: {
    proofOnlyMissingPlanFields: 2,
  },
  cases: [
    {
      caseId: '2026-06-09|morning|NoInstalledSetup|SHORT',
      tradeDate: '2026-06-09',
      sessionType: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      firstNoChaseTime: '2026-06-09T11:35:00',
      proofType: 'completed_5m_close_through',
      proofBarTime: '2026-06-09T11:40:00',
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      reviewClassification: 'proof_only_missing_plan_fields',
    },
    {
      caseId: '2026-06-15|morning|NoInstalledSetup|LONG',
      tradeDate: '2026-06-15',
      sessionType: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstNoChaseTime: '2026-06-15T10:15:00',
      proofType: 'completed_5m_close_through',
      proofBarTime: '2026-06-15T11:00:00',
      entry: 7609.75,
      stop: null,
      target1: null,
      target2: null,
      reviewClassification: 'proof_only_missing_plan_fields',
    },
    {
      caseId: 'reviewable',
      reviewClassification: 'reviewable_full_plan',
    },
  ],
};

const report = buildNoChaseMissingPlanFieldDrilldownReport({
  proofReportPath: 'proof.json',
  proofReport: proofReport as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_missing_plan_field_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.proofOnlyMissingPlanRows, 2);
assert.equal(report.summary.missingEntryRows, 1);
assert.equal(report.summary.missingStopRows, 2);
assert.equal(report.summary.missingTargetRows, 2);
assert.equal(report.summary.entryAndStopPresentTargetOnlyRows, 0);
assert.equal(report.summary.missingEntryOrStopRows, 2);
assert.equal(report.summary.noImmediateTicketRows, 2);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendedNextFix, 'mine_protected_5m_entry_stop_geometry');
assert.equal(report.rows[0].requiresProtectedEntryStopMiner, true);
assert.match(report.recommendations.join(' '), /Target math alone/);
assert.match(report.markdown, /Missing Plan Field Drilldown/);

const targetOnly = buildNoChaseMissingPlanFieldDrilldownReport({
  proofReportPath: 'proof.json',
  proofReport: {
    ...proofReport,
    summary: { proofOnlyMissingPlanFields: 1 },
    cases: [
      {
        caseId: 'target-only',
        tradeDate: '2026-06-17',
        sessionType: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'SHORT',
        proofType: 'completed_5m_retest_hold',
        proofBarTime: '2026-06-17T13:05:00',
        entry: 7583,
        stop: 7592,
        target1: null,
        target2: null,
        reviewClassification: 'proof_only_missing_plan_fields',
      },
    ],
  } as any,
}, '2026-07-20T00:00:00.000Z');
assert.equal(targetOnly.summary.recommendedNextFix, 'derive_targets_from_existing_entry_stop');
assert.equal(targetOnly.summary.entryAndStopPresentTargetOnlyRows, 1);

const failed = buildNoChaseMissingPlanFieldDrilldownReport({
  proofReportPath: 'proof.json',
  proofReport: {
    ...proofReport,
    summary: { proofOnlyMissingPlanFields: 3 },
  } as any,
}, '2026-07-20T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.ok(failed.blockers.some((blocker) => blocker.includes('summary')));

const parsed = parseNoChaseMissingPlanFieldDrilldownArgs([
  '--proof-report',
  'proof.json',
  '--json',
]);
assert.equal(parsed.proofReport, 'proof.json');
assert.equal(parsed.json, true);

console.log('no-chase missing plan field drilldown verified.');
