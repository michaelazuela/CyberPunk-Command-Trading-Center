import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildNoChaseIntradayInvalidStopLocationDrilldownReport,
  type NoChaseIntradayInvalidStopLocationDrilldownReport,
} from './no-chase-intraday-invalid-stop-location-drilldown';
import type { NoChaseIntradayBlockerDispositionRollupReport } from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseProtectedGeometryOmissionDiagnosticReport } from './no-chase-protected-geometry-omission-diagnostic';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'invalid-stop-drilldown-'));
fs.writeFileSync(path.join(tempDir, 'fixture-snapshot.json'), `${JSON.stringify({
  normalizedPlan: {
    setupCandidates: [{
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      entry: null,
      stop: 7476,
      candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
      blockReason: 'InvalidStopLocation',
      missingEvidence: ['Candidate invalidated: current 5M price action has already traded through the structure stop/invalidation.'],
      activeRuleset: { htfLineInSand: { status: 'blocked', lineInSand: 7430 } },
      tacticalZone: { lower: 7468, upper: 7471.75 },
    }],
  },
})}\n`, 'utf8');

const dispositionRollup = {
  rows: [{
    caseId: '2026-06-24|lunch|IntradayMssMicroContinuation|LONG',
    tradeDate: '2026-06-24',
    sessionType: 'lunch',
    direction: 'LONG',
    blockerFamily: 'invalid_stop_location',
    disposition: 'needs_invalid_stop_location_research',
    evidence: [],
    nextAction: 'Run narrow invalid-stop-location drilldown.',
  }],
} as NoChaseIntradayBlockerDispositionRollupReport;

const omissionReport = {
  rows: [{
    caseId: '2026-06-24|lunch|IntradayMssMicroContinuation|LONG',
    tradeDate: '2026-06-24',
    sessionType: 'lunch',
    setupType: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    firstNoChaseSnapshotId: 'fixture-snapshot',
    firstNoChaseTime: '2026-06-24T13:20:00.0000000',
    proofBarTime: '2026-06-24T14:20:00',
    snapshotFound: true,
    matchedCandidateKey: 'fixture',
    itemState: 'no_chase',
    itemTradingModelState: 'blocked_missing_plan_geometry',
    sourceFields: { entry: null, stop: 7476, target1: null, target2: null, riskPoints: null },
    unifiedItemFields: { entry: null, stop: 7476, target1: null, target2: null, riskPoints: null },
    sourceMissingFields: ['entry', 'target1', 'target2'],
    unifiedMissingFields: ['entry', 'target1', 'target2'],
    sourceGeometryValid: null,
    unifiedGeometryValid: null,
    omissionClass: 'source_candidate_never_built_full_geometry',
    recommendedNextAction: 'inspect_intraday_candidate_builder_plan_geometry',
    canExecute: false,
    publishDiscord: false,
    livePromotionAllowed: false,
  }],
} as NoChaseProtectedGeometryOmissionDiagnosticReport;

const report: NoChaseIntradayInvalidStopLocationDrilldownReport = buildNoChaseIntradayInvalidStopLocationDrilldownReport({
  dispositionRollupPath: 'rollup.json',
  omissionReportPath: 'omission.json',
  auditDir: tempDir,
  marketBarsJson: 'bars.json',
  dispositionRollup,
  omissionReport,
  bars: {
    '5m': [
      { time: '2026-06-24T13:15:00', open: 7480, high: 7481, low: 7475, close: 7477, volume: 1 },
      { time: '2026-06-24T13:20:00', open: 7477, high: 7478, low: 7425, close: 7427, volume: 1 },
      { time: '2026-06-24T14:20:00', open: 7427, high: 7432, low: 7424, close: 7428, volume: 1 },
    ],
    '15m': [],
    '60m': [],
    '120m': [],
    '240m': [],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rowsChecked, 1);
assert.equal(report.summary.confirmedStaleInvalidatedStopRows, 1);
assert.equal(report.summary.stopWrongSideOfZoneRows, 1);
assert.equal(report.summary.stopAlreadyTradedThroughRows, 1);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'keep_invalid_stop_rows_blocked');

console.log('no-chase Intraday invalid-stop-location drilldown verified.');
