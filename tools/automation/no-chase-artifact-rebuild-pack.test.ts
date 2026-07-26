import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SetupType } from '../../src/types';
import type { NoChaseOhlcProofExtractorReport } from './no-chase-ohlc-proof-extractor';
import {
  buildNoChaseArtifactRebuildPackReport,
  writeNoChaseArtifactRebuildPackReport,
} from './no-chase-artifact-rebuild-pack';

const baseCase = {
  caseId: '2026-06-10|morning|NoInstalledSetup|LONG',
  tradeDate: '2026-06-10',
  sessionType: 'morning',
  setupType: SetupType.NoSetup,
  direction: 'LONG',
  firstNoChaseSnapshotId: 'snapshot-1',
  firstNoChaseTime: '2026-06-10T10:00:00',
  noChaseCount: 1,
  referenceLevel: 101,
  referenceSource: 'htf_line_in_sand',
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  futureBarsChecked: 4,
  proofStatus: 'ohlc_proof_found',
  proofType: 'completed_5m_close_through',
  proofBarTime: '2026-06-10T10:05:00',
  proofBar: { time: '2026-06-10T10:05:00', open: 100.25, high: 101.5, low: 100, close: 101.25 },
  reviewClassification: 'reviewable_full_plan',
  reviewBlockers: [],
  replayOutcome: 'T2_HIT',
  replayFillTime: '2026-06-10T10:10:00',
  replayOutcomeTime: '2026-06-10T10:15:00',
  replayPoints: 8,
  replayOneMesGross: 40,
  blocker: null,
  recommendation: 'fixture',
} satisfies NoChaseOhlcProofExtractorReport['cases'][number];

const proofReport: NoChaseOhlcProofExtractorReport = {
  reportType: 'no_chase_ohlc_proof_extractor',
  generatedAt: '2026-07-16T00:00:00.000Z',
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
  scope: {
    setupTypes: [SetupType.NoSetup, SetupType.NoSetup],
    startDate: '2026-06-10',
    endDate: '2026-06-13',
    auditDir: 'fixture-audit',
    marketBarsJson: null,
    tolerancePoints: 0.25,
    sourcePreference: ['local_market_bars_json', 'scanner_decision_tape_completed_5m'],
  },
  summary: {
    snapshotsAudited: 4,
    noChaseCases: 4,
    ohlcProofFound: 3,
    noLocalOhlcProof: 1,
    missingReferenceLevel: 0,
    missingFutureBars: 0,
    intradayCases: 3,
    intradayProofFound: 2,
    afterLunchCases: 1,
    afterLunchProofFound: 1,
    reviewableFullPlan: 3,
    proofOnlyMissingPlanFields: 1,
    notReviewableNoOhlcProof: 0,
    replayedFullPlanCases: 3,
    replayWins: 1,
    replayLosses: 1,
    replayNoFill: 1,
    replayAmbiguous: 0,
    replayGrossOneMes: 20,
    fiveMinuteBarsLoaded: 10,
    fiveMinuteSource: 'scanner_decision_tape_completed_5m',
  },
  cases: [
    baseCase,
    {
      ...baseCase,
      caseId: '2026-06-11|morning|NoInstalledSetup|SHORT',
      tradeDate: '2026-06-11',
      direction: 'SHORT',
      replayOutcome: 'STOP_HIT',
      replayPoints: -4,
      replayOneMesGross: -20,
    },
    {
      ...baseCase,
      caseId: '2026-06-12|lunch|NoInstalledSetup|SHORT',
      tradeDate: '2026-06-12',
      sessionType: 'lunch',
      setupType: SetupType.NoSetup,
      direction: 'SHORT',
      replayOutcome: 'NO_FILL',
      replayFillTime: null,
      replayOutcomeTime: null,
      replayPoints: 0,
      replayOneMesGross: 0,
    },
    {
      ...baseCase,
      caseId: '2026-06-13|morning|NoInstalledSetup|LONG',
      tradeDate: '2026-06-13',
      stop: null,
      reviewClassification: 'proof_only_missing_plan_fields',
      reviewBlockers: ['missing stop'],
      replayOutcome: 'NOT_REPLAYED',
      replayFillTime: null,
      replayOutcomeTime: null,
      replayPoints: 0,
      replayOneMesGross: 0,
    },
  ],
  recommendations: ['fixture'],
  markdown: 'fixture',
};

const report = buildNoChaseArtifactRebuildPackReport({ proofReport, proofReportPath: 'fixture-report.json' }, '2026-07-16T01:00:00.000Z');

assert.equal(report.reportType, 'no_chase_artifact_rebuild_pack');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.rebuildPackRows, 0);
assert.equal(report.summary.includeForRebuildReview, 0);
assert.equal(report.summary.holdForFilterReview, 0);
assert.equal(report.summary.excludeUntilRevalidated, 0);
assert.equal(report.summary.afterLunchRows, 0);
assert.equal(report.summary.afterLunchIncludeForReview, 0);
assert.equal(report.summary.intradayRows, 0);
assert.equal(report.summary.intradayIncludeForReview, 0);
assert.equal(report.summary.replayGrossOneMes, 0);
assert.equal(report.rows.every((row) => row.canExecute === false), true);
assert.equal(report.rows.every((row) => row.publishDiscord === false), true);

const includeRow = report.rows.find((row) => row.rebuildDecision === 'include_for_rebuild_review');
const excludedRow = report.rows.find((row) => row.rebuildDecision === 'exclude_until_revalidated');
const heldRow = report.rows.find((row) => row.rebuildDecision === 'hold_for_filter_review');

assert.equal(includeRow, undefined);
assert.equal(excludedRow, undefined);
assert.equal(heldRow, undefined);
assert.match(report.markdown, /No-Chase Artifact Rebuild Pack/);
assert.match(report.markdown, /Rebuild pack rows: 0/);
assert.match(report.recommendations.join(' '), /Research-only rebuild pack/);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'no-chase-artifact-rebuild-pack-'));
const paths = writeNoChaseArtifactRebuildPackReport(report, root);
assert.equal(fs.existsSync(paths.jsonPath), true);
assert.equal(fs.existsSync(paths.markdownPath), true);

console.log('no-chase artifact rebuild pack verified.');
