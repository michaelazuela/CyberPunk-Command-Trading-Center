import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SetupType } from '../../src/types';
import type { NoChaseArtifactRebuildPackReport, NoChaseArtifactRebuildPackRow } from './no-chase-artifact-rebuild-pack';
import {
  buildNoChaseArtifactRebuildSimulationReport,
  writeNoChaseArtifactRebuildSimulationReport,
} from './no-chase-artifact-rebuild-simulation';

function row(overrides: Partial<NoChaseArtifactRebuildPackRow> = {}): NoChaseArtifactRebuildPackRow {
  return {
    caseId: '2026-06-17|lunch|AfterLunchDriveFvgContinuation|SHORT',
    tradeDate: '2026-06-17',
    sessionType: 'lunch',
    setupType: SetupType.AfterLunchDriveFvgContinuation,
    direction: 'SHORT',
    sourceNoChaseSnapshotId: 'snapshot-1',
    firstNoChaseTime: '2026-06-17T14:00:00',
    proofType: 'completed_5m_close_through',
    proofBarTime: '2026-06-17T14:05:00',
    replayOutcome: 'T2_HIT',
    replayFillTime: '2026-06-17T14:45:00',
    replayOutcomeTime: '2026-06-17T14:45:00',
    replayOneMesGross: 112.5,
    deterministicPlan: {
      entry: 7580.25,
      stop: 7591.5,
      target1: 7563.5,
      target2: 7557.75,
    },
    rebuildDecision: 'include_for_rebuild_review',
    canExecute: false,
    publishDiscord: false,
    recommendation: 'fixture',
    ...overrides,
  };
}

const rebuildPack: NoChaseArtifactRebuildPackReport = {
  reportType: 'no_chase_artifact_rebuild_pack',
  generatedAt: '2026-07-16T01:00:00.000Z',
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
  source: {
    proofReportPath: 'fixture-proof.json',
    proofReportGeneratedAt: '2026-07-16T00:00:00.000Z',
    proofReportFiveMinuteSource: 'scanner_decision_tape_completed_5m',
  },
  summary: {
    sourceNoChaseCases: 4,
    sourceReviewableFullPlan: 4,
    sourceProofOnlyMissingPlanFields: 0,
    sourceNotReviewableNoOhlcProof: 0,
    rebuildPackRows: 4,
    includeForRebuildReview: 2,
    holdForFilterReview: 1,
    excludeUntilRevalidated: 1,
    afterLunchRows: 2,
    afterLunchIncludeForReview: 1,
    intradayRows: 2,
    intradayIncludeForReview: 1,
    replayWins: 2,
    replayLosses: 1,
    replayNoFill: 1,
    replayFilledOpen: 0,
    replayAmbiguous: 0,
    replayGrossOneMes: 150,
  },
  rows: [
    row(),
    row({
      caseId: '2026-06-25|morning|IntradayMssMicroContinuation|SHORT',
      tradeDate: '2026-06-25',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      replayOneMesGross: 107.5,
    }),
    row({
      caseId: '2026-06-26|morning|IntradayMssMicroContinuation|LONG',
      tradeDate: '2026-06-26',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      deterministicPlan: { entry: 7395, stop: 7377.25, target1: 7421.75, target2: 7430.5 },
      replayOutcome: 'NO_FILL',
      replayFillTime: null,
      replayOutcomeTime: null,
      replayOneMesGross: 0,
      rebuildDecision: 'hold_for_filter_review',
    }),
    row({
      caseId: '2026-06-24|morning|IntradayMssMicroContinuation|LONG',
      tradeDate: '2026-06-24',
      sessionType: 'morning',
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      deterministicPlan: { entry: 7458, stop: 7438.75, target1: 7487, target2: 7496.5 },
      replayOutcome: 'STOP_HIT',
      replayOneMesGross: -96.25,
      rebuildDecision: 'exclude_until_revalidated',
    }),
  ],
  recommendations: ['fixture'],
  markdown: 'fixture',
};

const report = buildNoChaseArtifactRebuildSimulationReport({ rebuildPack, rebuildPackPath: 'fixture-pack.json' }, '2026-07-16T02:00:00.000Z');

assert.equal(report.reportType, 'no_chase_artifact_rebuild_simulation');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.packRows, 4);
assert.equal(report.summary.includeRows, 2);
assert.equal(report.summary.simulatedArtifacts, 2);
assert.equal(report.summary.rejectedRows, 2);
assert.equal(report.summary.afterLunchSimulated, 1);
assert.equal(report.summary.intradaySimulated, 1);
assert.equal(report.summary.completePlanArtifacts, 2);
assert.equal(report.summary.humanReviewOnlyArtifacts, 2);
assert.equal(report.summary.canExecuteFalseArtifacts, 2);
assert.equal(report.summary.publishDiscordFalseArtifacts, 2);
assert.equal(report.summary.replayGrossOneMes, 220);
assert.equal(report.artifacts.every((artifact) => artifact.status === 'human_review_rebuilt'), true);
assert.equal(report.artifacts.every((artifact) => artifact.canExecute === false), true);
assert.equal(report.artifacts.every((artifact) => artifact.publishDiscord === false), true);
assert.equal(report.artifacts.every((artifact) => artifact.blockers.includes('requires_separate_live_wiring_approval')), true);
assert.equal(report.rejectedRows.some((item) => item.rebuildDecision === 'hold_for_filter_review'), true);
assert.equal(report.rejectedRows.some((item) => item.rebuildDecision === 'exclude_until_revalidated'), true);
assert.match(report.markdown, /No-Chase Artifact Rebuild Simulation/);
assert.match(report.markdown, /canExecute=false artifacts: 2/);
assert.match(report.recommendations.join(' '), /local artifact reconstruction only/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-artifact-rebuild-simulation-'));
const paths = writeNoChaseArtifactRebuildSimulationReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);

console.log('no-chase artifact rebuild simulation verified.');
