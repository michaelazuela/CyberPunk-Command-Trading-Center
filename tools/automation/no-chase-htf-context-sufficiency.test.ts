import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SetupType } from '../../src/types';
import type { ControlledHtfOhlcAcquisitionReport } from './controlled-htf-ohlc-acquisition';
import type { NoChaseArtifactRebuildSimulationReport, NoChaseRebuiltHumanReviewArtifact } from './no-chase-artifact-rebuild-simulation';
import {
  buildNoChaseHtfContextSufficiencyReport,
  writeNoChaseHtfContextSufficiencyReport,
} from './no-chase-htf-context-sufficiency';

function artifact(overrides: Partial<NoChaseRebuiltHumanReviewArtifact> = {}): NoChaseRebuiltHumanReviewArtifact {
  return {
    artifactId: 'rebuild-sim|2026-06-17|lunch|AfterLunchDriveFvgContinuation|SHORT',
    caseId: '2026-06-17|lunch|AfterLunchDriveFvgContinuation|SHORT',
    tradeDate: '2026-06-17',
    sessionType: 'lunch',
    setupType: SetupType.AfterLunchDriveFvgContinuation,
    direction: 'SHORT',
    status: 'human_review_rebuilt',
    canExecute: false,
    publishDiscord: false,
    sourceNoChaseSnapshotId: 'snapshot-1',
    proof: {
      proofType: 'completed_5m_close_through',
      proofBarTime: '2026-06-17T14:05:00',
      firstNoChaseTime: '2026-06-17T13:00:00',
    },
    plan: { entry: 7580.25, stop: 7591.5, target1: 7563.5, target2: 7557.75 },
    replay: { outcome: 'T2_HIT', fillTime: '2026-06-17T14:45:00', outcomeTime: '2026-06-17T14:45:00', oneMesGross: 112.5 },
    blockers: ['research_only_rebuild_simulation'],
    notes: ['fixture'],
    ...overrides,
  };
}

const simulationReport: NoChaseArtifactRebuildSimulationReport = {
  reportType: 'no_chase_artifact_rebuild_simulation',
  generatedAt: '2026-07-16T02:00:00.000Z',
  authority: {
    readOnly: true,
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
  },
  source: { rebuildPackPath: 'fixture-pack.json', rebuildPackGeneratedAt: '2026-07-16T01:00:00.000Z' },
  summary: {
    packRows: 2,
    includeRows: 2,
    simulatedArtifacts: 2,
    rejectedRows: 0,
    afterLunchSimulated: 1,
    intradaySimulated: 1,
    completePlanArtifacts: 2,
    humanReviewOnlyArtifacts: 2,
    canExecuteFalseArtifacts: 2,
    publishDiscordFalseArtifacts: 2,
    replayGrossOneMes: 220,
  },
  artifacts: [
    artifact(),
    artifact({
      artifactId: 'rebuild-sim|2026-06-25|morning|IntradayMssMicroContinuation|SHORT',
      caseId: '2026-06-25|morning|IntradayMssMicroContinuation|SHORT',
      tradeDate: '2026-06-25',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      proof: {
        proofType: 'completed_5m_close_through',
        proofBarTime: '2026-06-25T09:35:00',
        firstNoChaseTime: '2026-06-25T09:10:00',
      },
      replay: { outcome: 'T2_HIT', fillTime: '2026-06-25T09:40:00', outcomeTime: '2026-06-25T09:45:00', oneMesGross: 107.5 },
    }),
  ],
  rejectedRows: [],
  recommendations: ['fixture'],
  markdown: 'fixture',
};

const coverage = ['5m', '15m', '60m', '120m', '240m'].map((timeframe) => ({
  timeframe,
  source: 'market_bars',
  barsLoaded: 100,
  localBars: 100,
  cacheBars: 0,
  bridgeBars: 0,
  bridgeRequests: 0,
  contractLegs: [],
  rangeStart: '2026-05-03T18:05:00',
  rangeEnd: '2026-06-18T10:00:00',
  sufficient: false,
  failures: [],
  warning: null,
})) as ControlledHtfOhlcAcquisitionReport['coverage'];

const htfReport: ControlledHtfOhlcAcquisitionReport = {
  reportType: 'controlled_htf_ohlc_acquisition',
  generatedAt: '2026-07-16T00:00:00.000Z',
  startDate: '2026-06-01',
  endDate: '2026-07-02',
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  source: 'local-json',
  authority: {
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesTradingRules: false,
    changesCanExecute: false,
    changesBridgeBehavior: false,
    changesScannerBehavior: false,
  },
  assumptions: {
    missingBarsAreNotInvented: true,
    canonicalOutputIsLocalOnly: true,
    marketBarsReadsAreReadOnly: true,
    bridgeReadsAreHistoricalReadOnly: true,
    htfLookbackCalendarDays: 30,
  },
  canonicalMarketBarsPath: 'fixture-bars.json',
  summary: {
    totalBars: 500,
    sufficientTimeframes: [],
    dataLimitedTimeframes: ['5m', '15m', '60m', '120m', '240m'],
    liveSupabaseReadAttempted: false,
    liveBridgeReadAttempted: false,
    rolloverAware: false,
    contractLegs: [],
  },
  coverage,
  recommendations: ['fixture'],
  reportMarkdown: 'fixture',
};

const report = buildNoChaseHtfContextSufficiencyReport({
  simulationReport,
  htfReport,
  simulationReportPath: 'fixture-sim.json',
  htfCoverageReportPath: 'fixture-htf.json',
}, '2026-07-16T03:00:00.000Z');

assert.equal(report.reportType, 'no_chase_htf_context_sufficiency');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.source.localReadOnlyThisRun, true);
assert.equal(report.source.htfCoverageReportHadLiveReads, false);
assert.equal(report.summary.artifactsChecked, 2);
assert.equal(report.summary.sufficientArtifacts, 1);
assert.equal(report.summary.partialArtifacts, 0);
assert.equal(report.summary.insufficientArtifacts, 1);
assert.equal(report.summary.dataLimitedArtifacts, 1);
assert.equal(report.summary.afterLunchSufficient, 1);
assert.equal(report.summary.intradaySufficient, 0);
assert.equal(report.summary.canExecuteFalseArtifacts, 2);
assert.equal(report.summary.publishDiscordFalseArtifacts, 2);
assert.equal(report.summary.htfPromotionEvidenceAllowed, 0);

const sufficient = report.rows.find((row) => row.tradeDate === '2026-06-17');
const insufficient = report.rows.find((row) => row.tradeDate === '2026-06-25');
assert.equal(sufficient?.sufficiency, 'sufficient');
assert.equal(sufficient?.reliability, 'structured_context_available');
assert.equal(sufficient?.canUseHtfForPromotionEvidence, false);
assert.equal(insufficient?.sufficiency, 'insufficient');
assert.equal(insufficient?.reliability, 'data_limited');
assert.equal(insufficient?.blockers.length, 5);
assert.match(insufficient?.recommendation || '', /data-limited/);
assert.match(report.markdown, /HTF promotion evidence allowed: 0/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-htf-context-sufficiency-'));
const paths = writeNoChaseHtfContextSufficiencyReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);

console.log('no-chase HTF context sufficiency verified.');
