import assert from 'node:assert/strict';
import { buildDeskPlaybookAfterLunchProofTimeEnrichmentReport } from './desk-playbook-selector-afterlunch-proof-time-enrichment';

const report = buildDeskPlaybookAfterLunchProofTimeEnrichmentReport({
  noLookaheadValidationPath: 'diagnostic-reports/no-lookahead.json',
  broadReplayPath: 'diagnostic-reports/broad-replay.json',
  oosSlateComparisonPath: 'diagnostic-reports/oos-slate.json',
  noLookaheadValidationReport: {
    reportType: 'desk_playbook_selector_camouflage_no_lookahead_validation',
    summary: {
      comparisonRows: 83,
      positiveRows: 14,
      recommendation: 'hold_research_only',
    },
    lanes: [
      {
        name: 'afterlunch_lunch_htf_support_with_raid',
        matches: 4,
        positives: 3,
        negatives: 1,
        precision: 0.75,
        totalPnl: 178.14,
        status: 'insufficient_sample',
      },
    ],
  },
  broadReplayReport: {
    reportType: 'unified_positive_held_local_preview_model_family_broad_replay',
    status: 'pass',
    summary: {
      targetRows: 30,
      winners: 21,
      losses: 7,
      unresolved: 2,
      blockedRows: 0,
      grossResolvedOneMesPl: 745.69,
      livePromotionAllowedRows: 0,
    },
  },
  oosSlateComparisonReport: {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_oos_slate_comparison',
    status: 'pass',
    summary: {
      rows: 43,
      slates: 7,
      slatesWithProxyMatch: 3,
      changedSlates: 2,
      baselineTopOneMesPl: 539.4,
      selectorTopOneMesPl: 456.9,
      topSelectionDeltaOneMesPl: -82.5,
      changedResolvedDeltaOneMesPl: -82.5,
      selectorChosenLosses: 1,
      selectorMatchedLosses: 0,
      livePromotionAllowedRows: 0,
      recommendation: 'do_not_install_rank_boost',
    },
  },
}, '2026-07-22T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_afterlunch_proof_time_enrichment');
assert.equal(report.status, 'pass');
assert.equal(report.summary.camouflageLaneMatches, 4);
assert.equal(report.summary.camouflageLanePositives, 3);
assert.equal(report.summary.camouflageLanePrecision, 0.75);
assert.equal(report.summary.broadReplayRows, 30);
assert.equal(report.summary.broadReplayWinners, 21);
assert.equal(report.summary.broadReplayLosses, 7);
assert.equal(report.summary.broadReplayPnl, 745.69);
assert.equal(report.summary.oosSlates, 7);
assert.equal(report.summary.oosBaselinePnl, 539.4);
assert.equal(report.summary.oosSelectorPnl, 456.9);
assert.equal(report.summary.oosSelectorDelta, -82.5);
assert.equal(report.summary.recommendation, 'stop_proof_time_enrichment');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.match(report.markdown, /Proof-Time Enrichment/);
assert.ok(report.recommendations.some((line) => line.includes('Do not install')));
assert.ok(report.decisionNotes.some((line) => line.includes('broader NoInstalledSetup model family remains positive')));

const blocked = buildDeskPlaybookAfterLunchProofTimeEnrichmentReport({
  noLookaheadValidationPath: null,
  broadReplayPath: null,
  oosSlateComparisonPath: null,
}, '2026-07-22T00:00:00.000Z');

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_research_only');
assert.ok(blocked.blockers.includes('missing camouflage no-lookahead validation report'));

console.log('Desk playbook AfterLunch proof-time enrichment verified.');
