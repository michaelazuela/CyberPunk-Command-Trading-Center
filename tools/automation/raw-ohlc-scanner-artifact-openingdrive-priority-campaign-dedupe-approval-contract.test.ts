import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-approval-contract';
import type { RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-reentry-simulation';

const simulation: RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_reentry_simulation',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  },
  source: { replayPackageOutcome: 'outcome.json', setupType: 'SweepMssFvgRetrace' },
  assumptions: {
    consumesSavedReplayOutcomeOnly: true,
    campaignKeyUsesExactModelDirectionAndLevels: true,
    postStopReentryRequiresProofAfterStopHit: true,
    oracleFirstNonLossIsResearchOnlyHindsight: true,
    livePromotionAllowed: false,
  },
  summary: {
    inputRows: 2,
    setupRows: 2,
    campaigns: 1,
    campaignsWithDuplicateRows: 1,
    suppressibleDuplicateRows: 1,
    campaignsWithStopThenLaterTarget: 0,
    campaignsWithPostStopReentry: 0,
    earliestOnly: { policy: 'earliest_only', selectedRows: 1, winners: 1, losses: 0, unresolved: 0, grossOneMesPl: 125 },
    earliestPlusPostStopReentry: { policy: 'earliest_plus_post_stop_reentry', selectedRows: 1, winners: 1, losses: 0, unresolved: 0, grossOneMesPl: 125 },
    oracleFirstNonLoss: { policy: 'oracle_first_non_loss', selectedRows: 1, winners: 1, losses: 0, unresolved: 0, grossOneMesPl: 125 },
    livePromotionAllowedRows: 0,
    broadeningAllowedNow: false,
    recommendation: 'keep_researching_reentry_policy',
  },
  campaigns: [
    {
      campaignId: '2026-07-10|morning|SweepMssFvgRetrace|LONG|1|2|3|4',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      entry: 1,
      stop: 2,
      t1: 3,
      t2: 4,
      rows: 2,
      firstProofTime: '2026-07-10T09:35:00',
      lastProofTime: '2026-07-10T09:40:00',
      earliestTicketId: 'ticket-a',
      earliestOutcomeLabel: 't1_and_t2_hit',
      earliestOneMesPl: 125,
      postStopReentryTicketId: null,
      postStopReentryProofTime: null,
      postStopReentryOneMesPl: null,
      oracleFirstNonLossTicketId: 'ticket-a',
      oracleFirstNonLossOneMesPl: 125,
      suppressibleDuplicateRows: 1,
      hasStopThenLaterTarget: false,
      recommendation: 'no_reentry_needed',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport({
  campaignReentrySimulationPath: 'simulation.json',
  campaignReentrySimulation: simulation,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.suppressedDuplicateRows, 1);
assert.equal(report.summary.entryStopTargetRiskDriftRows, 0);
assert.equal(report.summary.canExecuteChangeRows, 0);
assert.equal(report.summary.discordPostingChangeRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'approval_contract_research_pass');
assert.equal(report.daySessionRows[0].selectedOneMesPl, 125);

console.log('OpeningDrive priority campaign dedupe approval contract verified.');
