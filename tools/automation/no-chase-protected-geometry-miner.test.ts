import assert from 'node:assert/strict';
import { buildNoChaseProtectedGeometryMinerReport, parseNoChaseProtectedGeometryMinerArgs } from './no-chase-protected-geometry-miner';

const proofReport = {
  summary: { proofOnlyMissingPlanFields: 1 },
  cases: [
    {
      caseId: '2026-06-09|morning|NoInstalledSetup|SHORT',
      tradeDate: '2026-06-09',
      sessionType: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      firstNoChaseTime: '2026-06-09T11:35:00',
      proofBarTime: '2026-06-09T11:40:00',
      proofBar: { time: '2026-06-09T11:40:00', open: 7600, high: 7601, low: 7597, close: 7598 },
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      reviewClassification: 'proof_only_missing_plan_fields',
    },
  ],
};

const bars = [
  { time: '2026-06-09T11:35:00', open: 7600, high: 7602, low: 7598, close: 7599 },
  { time: '2026-06-09T11:40:00', open: 7600, high: 7601, low: 7597, close: 7598 },
  { time: '2026-06-09T11:45:00', open: 7598, high: 7598.25, low: 7590, close: 7591 },
  { time: '2026-06-09T11:50:00', open: 7591, high: 7592, low: 7588.5, close: 7589 },
];

const report = buildNoChaseProtectedGeometryMinerReport({
  proofReportPath: 'proof.json',
  marketBarsJson: 'bars.json',
  proofReport: proofReport as any,
  bars,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'no_chase_protected_geometry_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.missingPlanRows, 1);
assert.equal(report.summary.geometryCompleteRows, 1);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].proposedGeometry.entry, 7598);
assert.equal(report.rows[0].proposedGeometry.stop, 7602.25);
assert.equal(report.rows[0].proposedGeometry.target1, 7591.75);
assert.equal(report.rows[0].proposedGeometry.target2, 7589.5);
assert.equal(report.rows[0].canExecute, false);
assert.equal(report.rows[0].publishDiscord, false);
assert.match(report.markdown, /Protected Geometry Miner/);

const failed = buildNoChaseProtectedGeometryMinerReport({
  proofReportPath: 'proof.json',
  marketBarsJson: 'bars.json',
  proofReport: proofReport as any,
  bars: [],
}, '2026-07-20T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.ok(failed.blockers.includes('missing 5M market bars'));

const parsed = parseNoChaseProtectedGeometryMinerArgs([
  '--proof-report',
  'proof.json',
  '--market-bars-json',
  'bars.json',
  '--json',
]);
assert.equal(parsed.proofReport, 'proof.json');
assert.equal(parsed.marketBarsJson, 'bars.json');
assert.equal(parsed.json, true);

console.log('no-chase protected geometry miner verified.');
