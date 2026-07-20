import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-lunch-long-blocked-caution-pocket-drilldown';

const report = buildRawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport({
  scannerFieldMinerPath: 'synthetic-scanner-field-miner.json',
  scannerFieldMiner: {
    status: 'pass',
    joinedRows: [
      ...Array.from({ length: 5 }, (_, index) => ({
        ticketId: `winner-${index}`,
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'LONG' as const,
        proofTime: '2026-06-10T13:00:00',
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 100,
        fields: {
          hasNoChaseMissingEvidence: 'true',
          htfLineInSandStatus: 'blocked',
          riskAdvisoryStatus: 'RISK_WITHIN_STANDARD_LIMIT',
        },
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        ticketId: `problem-${index}`,
        tradeDate: '2026-06-11',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'LONG' as const,
        proofTime: '2026-06-11T13:00:00',
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 'stopped_before_t1',
        resolvedOneMesPl: -50,
        fields: {
          hasNoChaseMissingEvidence: 'true',
          htfLineInSandStatus: 'blocked',
          riskAdvisoryStatus: 'RISK_EXCEEDS_STANDARD_LIMIT',
        },
      })),
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 10);
assert.equal(report.summary.cautionRows, 10);
assert.equal(report.summary.winnerRows, 5);
assert.equal(report.summary.problemRows, 5);
assert.equal(report.summary.winnerRescueCandidates, 1);
assert.equal(report.summary.cautionCandidates, 1);
assert.equal(report.summary.bestWinnerRescueCandidate, 'riskAdvisoryStatus=RISK_WITHIN_STANDARD_LIMIT');
assert.equal(report.summary.bestCautionCandidate, 'riskAdvisoryStatus=RISK_EXCEEDS_STANDARD_LIMIT');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_caution_pocket_separator');
assert.match(report.markdown, /Blocked Caution Pocket Drilldown/);

console.log('raw OHLC scanner artifact Sweep lunch LONG blocked caution pocket drilldown verified.');
