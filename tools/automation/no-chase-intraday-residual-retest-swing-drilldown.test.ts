import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildNoChaseIntradayResidualRetestSwingDrilldownReport,
  type NoChaseIntradayResidualRetestSwingDrilldownReport,
} from './no-chase-intraday-residual-retest-swing-drilldown';
import type { NoChaseIntradayBlockerDispositionRollupReport } from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseProtectedGeometryOmissionDiagnosticReport } from './no-chase-protected-geometry-omission-diagnostic';

const dispositionRollup = {
  rows: [{
    caseId: '2026-06-25|lunch|NoInstalledSetup|LONG',
    tradeDate: '2026-06-25',
    sessionType: 'lunch',
    direction: 'LONG',
    blockerFamily: 'retest_swing_stop_not_confirmed',
    disposition: 'needs_retest_swing_residual_research',
    evidence: [],
    nextAction: 'Run residual retest-swing-stop drilldown before invalid-stop rows.',
  }],
} as NoChaseIntradayBlockerDispositionRollupReport;

const omissionReport = {
  rows: [{
    caseId: '2026-06-25|lunch|NoInstalledSetup|LONG',
    tradeDate: '2026-06-25',
    sessionType: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    firstNoChaseSnapshotId: 'fixture-snapshot',
    firstNoChaseTime: '2026-06-25T14:15:00.0000000',
    proofBarTime: '2026-06-25T14:20:00',
    snapshotFound: true,
    matchedCandidateKey: 'fixture',
    itemState: 'no_chase',
    itemTradingModelState: 'blocked_missing_plan_geometry',
    sourceFields: { entry: 7439.75, stop: null, target1: null, target2: null, riskPoints: null },
    unifiedItemFields: { entry: 7439.75, stop: null, target1: null, target2: null, riskPoints: null },
    sourceMissingFields: ['stop', 'target1', 'target2'],
    unifiedMissingFields: ['stop', 'target1', 'target2'],
    sourceGeometryValid: null,
    unifiedGeometryValid: null,
    omissionClass: 'source_candidate_never_built_full_geometry',
    recommendedNextAction: 'inspect_intraday_candidate_builder_plan_geometry',
    canExecute: false,
    publishDiscord: false,
    livePromotionAllowed: false,
  }],
} as NoChaseProtectedGeometryOmissionDiagnosticReport;

const bars = {
  '5m': [
    { time: '2026-06-25T14:15:00', open: 7440, high: 7441, low: 7438.5, close: 7439.75, volume: 1 },
    { time: '2026-06-25T14:20:00', open: 7439.75, high: 7440.25, low: 7435, close: 7436, volume: 1 },
    { time: '2026-06-25T14:25:00', open: 7436, high: 7441, low: 7437, close: 7440, volume: 1 },
    { time: '2026-06-25T14:30:00', open: 7440, high: 7443, low: 7436, close: 7442, volume: 1 },
    { time: '2026-06-25T14:35:00', open: 7442, high: 7448, low: 7441, close: 7447, volume: 1 },
    { time: '2026-06-25T14:40:00', open: 7447, high: 7452, low: 7446, close: 7451, volume: 1 },
    { time: '2026-06-25T14:45:00', open: 7451, high: 7455, low: 7450, close: 7454, volume: 1 },
  ],
  '15m': [],
  '60m': [],
  '120m': [],
  '240m': [],
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'residual-retest-swing-'));
fs.writeFileSync(path.join(tempDir, 'fixture-snapshot.json'), `${JSON.stringify({
  normalizedPlan: {
    setupCandidates: [{
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      entry: 7439.75,
      candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
      blockReason: 'EntryTriggerPending',
      missingEvidence: ['Protected 5M retest swing stop blocked: retest low is not a confirmed protected 5M swing low.'],
      activeRuleset: {
        htfLineInSand: {
          lineInSand: 7436,
        },
      },
    }],
  },
})}\n`, 'utf8');

const report: NoChaseIntradayResidualRetestSwingDrilldownReport = buildNoChaseIntradayResidualRetestSwingDrilldownReport({
  dispositionRollupPath: 'rollup.json',
  omissionReportPath: 'omission.json',
  auditDir: tempDir,
  marketBarsJson: 'bars.json',
  dispositionRollup,
  omissionReport,
  bars,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rowsChecked, 1);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].disposition, 'risk_valid_probe_found');
assert.equal(report.rows[0].firstRiskValidSwing?.stop, 7434.75);
assert.equal(report.summary.recommendation, 'candidate_for_source_builder_probe');

console.log('no-chase Intraday residual retest-swing drilldown verified.');
