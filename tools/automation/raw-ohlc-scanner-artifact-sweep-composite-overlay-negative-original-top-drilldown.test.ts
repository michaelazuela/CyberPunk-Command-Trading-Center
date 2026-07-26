import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-original-top-drilldown';

const authority = {
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
} as const;

const negativeSimulationReport = {
  status: 'pass',
  authority,
  rows: [
    {
      ticketId: 'old-1',
      overlayScore: 260,
      negativePenalty: 100,
      negativeOverlayScore: 160,
      sourceTags: ['no_chase', 'late_day_after_1500'],
    },
    {
      ticketId: 'old-2',
      overlayScore: 255,
      negativePenalty: 30,
      negativeOverlayScore: 225,
      sourceTags: [],
    },
  ],
  slates: [
    {
      slateId: 'slate-1',
      tradeDate: '2026-07-16',
      session: 'lunch',
      overlayTopTicketId: 'old-1',
      overlayTopSetupType: 'NoInstalledSetup',
      negativeTopTicketId: 'new-1',
      negativeTopSetupType: 'NoInstalledSetup',
      topChanged: true,
    },
    {
      slateId: 'slate-2',
      tradeDate: '2026-07-17',
      session: 'morning',
      overlayTopTicketId: 'old-2',
      overlayTopSetupType: 'NoInstalledSetup',
      negativeTopTicketId: 'new-2',
      negativeTopSetupType: 'NoInstalledSetup',
      topChanged: true,
    },
  ],
};

const coverageReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'old-1',
      coverageStatus: 'ready_for_replay_package',
      blockers: [],
    },
    {
      ticketId: 'old-2',
      coverageStatus: 'blocked',
      blockers: ['missing entry', 'missing T1'],
    },
  ],
};

const sourceContextReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'old-1',
      sourceTags: ['no_chase', 'late_day_after_1500', 'entry_trigger_pending'],
      outcomeLabel: 'no_target_or_stop_hit',
      favorableR: 0.4,
      adverseR: 0.3,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport({
  reportDir: 'reports',
  negativeSimulationReportPath: 'negative.json',
  coverageReportPath: 'coverage.json',
  sourceContextReportPath: 'source.json',
  negativeSimulationReport: negativeSimulationReport as any,
  coverageReport: coverageReport as any,
  sourceContextReport: sourceContextReport as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_original_top_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.originalCoverageReadyRows, 1);
assert.equal(report.summary.originalCoverageBlockedRows, 1);
assert.equal(report.summary.originalSourceTaggedRows, 1);
assert.equal(report.summary.noChaseRows, 1);
assert.equal(report.summary.lateDayRows, 1);
assert.equal(report.summary.entryTriggerPendingRows, 1);
assert.equal(report.summary.incompleteLevelRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'use_as_negative_evidence_research_only');
assert.equal(report.rows.find((row) => row.originalTopTicketId === 'old-1')?.evidenceClass, 'no_chase_or_stale_original');
assert.equal(report.rows.find((row) => row.originalTopTicketId === 'old-2')?.evidenceClass, 'incomplete_levels_original');
assert.match(report.markdown, /Original-Top Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownArgs([
  '--negative-simulation-report',
  'negative.json',
  '--coverage-report',
  'coverage.json',
  '--source-context-report',
  'source.json',
  '--json',
]);
assert.equal(parsed.negativeSimulationReport, 'negative.json');
assert.equal(parsed.coverageReport, 'coverage.json');
assert.equal(parsed.sourceContextReport, 'source.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay negative original-top drilldown verified.');
