import assert from 'node:assert/strict';
import { buildDeskPlaybookCamouflageNoLookaheadValidation } from './desk-playbook-selector-camouflage-no-lookahead-validation';

const report = buildDeskPlaybookCamouflageNoLookaheadValidation({
  camouflageAuditPath: 'diagnostic-reports/camouflage.json',
  report: {
    reportType: 'desk_playbook_selector_camouflage_audit',
    generatedAt: '2026-07-21T00:00:00.000Z',
    rows: [
      {
        date: '2026-06-01',
        session: 'morning',
        movement: 'balanced_range',
        camouflageClass: 'camouflaged_positive_proof',
        marketMoveDirection: 'LONG',
        selectedModel: 'OpeningDriveFvgContinuation',
        selectedDirection: 'LONG',
        selectedOutcome: 't2_hit',
        selectedPnl: 87.5,
        completeCandidateCount: 6,
        activeRaids: ['overnightHighRaid'],
        htfAlignment: 'supports',
        complexityScore: 92,
      },
      {
        date: '2026-06-02',
        session: 'morning',
        movement: 'balanced_range',
        camouflageClass: 'candidate_present_but_not_drive_raid',
        marketMoveDirection: 'LONG',
        selectedModel: 'OpeningDriveFvgContinuation',
        selectedDirection: 'SHORT',
        selectedOutcome: 'stopped_before_t1',
        selectedPnl: -40,
        completeCandidateCount: 4,
        activeRaids: ['overnightHighRaid'],
        htfAlignment: 'supports',
        complexityScore: 70,
      },
      {
        date: '2026-06-03',
        session: 'lunch',
        movement: 'balanced_range',
        camouflageClass: 'camouflaged_positive_proof',
        marketMoveDirection: 'SHORT',
        selectedModel: 'IntradayMssMicroContinuation',
        selectedDirection: 'SHORT',
        selectedOutcome: 't1_then_stop',
        selectedPnl: 10,
        completeCandidateCount: 8,
        activeRaids: ['priorLowRaid'],
        htfAlignment: 'supports',
        complexityScore: 81,
      },
      {
        date: '2026-06-04',
        session: 'lunch',
        movement: 'balanced_range',
        camouflageClass: 'candidate_present_but_not_drive_raid',
        marketMoveDirection: 'LONG',
        selectedModel: 'IntradayMssMicroContinuation',
        selectedDirection: 'LONG',
        selectedOutcome: 't2_hit',
        selectedPnl: 30,
        completeCandidateCount: 3,
        activeRaids: [],
        htfAlignment: 'supports',
        complexityScore: 50,
      },
      {
        date: '2026-06-05',
        session: 'lunch',
        movement: 'bullish_drive',
        camouflageClass: 'story_without_5m_proof',
        marketMoveDirection: 'LONG',
        selectedModel: null,
        selectedDirection: null,
        selectedOutcome: null,
        selectedPnl: null,
        completeCandidateCount: 0,
        activeRaids: ['priorHighRaid'],
        htfAlignment: 'supports',
        complexityScore: 40,
      },
    ],
  },
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_camouflage_no_lookahead_validation');
assert.equal(report.summary.comparisonRows, 4);
assert.equal(report.summary.positiveRows, 2);
assert.equal(report.summary.validatedLanes, 4);
assert.equal(report.summary.passingLanes, 0);
assert.equal(report.summary.recommendation, 'hold_research_only');
assert.equal(report.authority.noFinalSessionMoveSelectorInput, true);
assert.equal(report.authority.outcomesUsedOnlyForMeasurement, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);

const allModels = report.lanes.find((lane) => lane.name === 'all_models_htf_support_with_raid');
assert.equal(allModels?.matches, 3);
assert.equal(allModels?.positives, 2);
assert.equal(allModels?.negatives, 1);
assert.equal(allModels?.precision, 0.6667);
assert.equal(allModels?.status, 'insufficient_sample');

const intraday = report.lanes.find((lane) => lane.name === 'intraday_lunch_htf_support_with_raid');
assert.equal(intraday?.matches, 1);
assert.equal(intraday?.positives, 1);
assert.equal(intraday?.status, 'insufficient_sample');
assert.match(report.markdown, /No-Lookahead Validation/);

console.log('Desk playbook camouflage no-lookahead validation verified.');
