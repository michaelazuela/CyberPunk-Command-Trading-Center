import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport } from './raw-ohlc-scanner-artifact-sweep-lunch-long-caution-pocket-selection-validation';

function row(id: string, proofTime: string, fields: Record<string, string>, resolvedOneMesPl: number) {
  return {
    ticketId: id,
    tradeDate: '2026-06-10',
    session: 'lunch',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG' as const,
    proofTime,
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl,
    fields,
  };
}

const report = buildRawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport({
  scannerFieldMinerPath: 'synthetic-scanner-field-miner.json',
  cautionPocketDrilldownPath: 'synthetic-caution-pocket.json',
  scannerFieldMiner: {
    status: 'pass',
    summary: { bestPositiveCandidate: 'hasNoChaseMissingEvidence=false' },
    joinedRows: [
      row('baseline', '2026-06-10T12:00:00', {
        hasNoChaseMissingEvidence: 'true',
        htfLineInSandStatus: 'blocked',
        hasTierBDisplacementEvidence: 'true',
      }, 100),
      row('simulated', '2026-06-10T12:05:00', {
        hasNoChaseMissingEvidence: 'false',
        htfLineInSandStatus: 'not_applicable',
        hasTierBDisplacementEvidence: 'false',
      }, 100),
    ],
  },
  cautionPocketDrilldown: {
    status: 'pass',
    summary: { bestCautionCandidate: 'hasTierBDisplacementEvidence=true' },
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 2);
assert.equal(report.summary.cautionRows, 1);
assert.equal(report.summary.slates, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, 100);
assert.equal(report.summary.simulatedTopOneMesPl, 100);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 0);
assert.equal(report.summary.changedResolvedDeltaOneMesPl, 0);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'keep_research_only');
assert.match(report.markdown, /Caution Pocket Selection Validation/);

console.log('raw OHLC scanner artifact Sweep lunch LONG caution pocket selection validation verified.');
