import assert from 'node:assert/strict';
import { buildOpeningDriveNoFillSourceSemanticsDrilldownReport } from './unified-positive-held-local-preview-openingdrive-no-fill-source-semantics-drilldown';

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

function noFill(overrides: Record<string, unknown>) {
  return {
    noFillTicketId: 'ticket',
    tradeDate: '2026-06-03',
    noFillProofTime: '2026-06-03T10:00:00',
    noFillEntry: 100,
    noFillStop: 108,
    noFillT1: 88,
    noFillT2: 84,
    noFillRiskPoints: 8,
    originalEntryFirstHitTime: null,
    ...overrides,
  };
}

const report = buildOpeningDriveNoFillSourceSemanticsDrilldownReport({
  noFillTimingReportPath: 'no-fill.json',
  noFillTimingReport: {
    rows: [
      noFill({ noFillTicketId: 'proof-bar-only' }),
      noFill({ noFillTicketId: 'after-proof-conflict', tradeDate: '2026-06-04', noFillProofTime: '2026-06-04T10:00:00' }),
      noFill({ noFillTicketId: 'stop-before-entry', tradeDate: '2026-06-05', noFillProofTime: '2026-06-05T10:00:00' }),
      noFill({ noFillTicketId: 'consistent-no-fill', tradeDate: '2026-06-06', noFillProofTime: '2026-06-06T10:00:00' }),
    ],
  },
  htfSourcePath: 'htf-source.json',
  htfSource: {
    bars: {
      '5m': [
        bar('2026-06-03T10:00:00', 103, 104, 99, 102),
        bar('2026-06-03T10:05:00', 102, 103, 101, 102),
        bar('2026-06-04T10:00:00', 105, 106, 101, 104),
        bar('2026-06-04T10:05:00', 104, 105, 99, 101),
        bar('2026-06-05T10:00:00', 103, 104, 101, 102),
        bar('2026-06-05T10:05:00', 102, 109, 101, 108),
        bar('2026-06-05T10:10:00', 107, 108, 99, 100),
        bar('2026-06-06T10:00:00', 105, 106, 101, 104),
        bar('2026-06-06T10:05:00', 104, 105, 101, 102),
      ],
    },
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 4);
assert.equal(report.summary.drilldownRows, 4);
assert.equal(report.summary.proofBarEntryTouchRows, 1);
assert.equal(report.summary.afterProofBarEntryTouchRows, 2);
assert.equal(report.summary.sameProofBarEntryOnlyRows, 1);
assert.equal(report.summary.sourceLabelConflictRows, 2);
assert.equal(report.summary.stopBeforeAfterProofBarEntryRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'fix_no_fill_outcome_semantics_before_selector_work');

const proofOnly = report.rows.find((row) => row.ticketId === 'proof-bar-only');
assert.ok(proofOnly);
assert.equal(proofOnly.likelySourceSemantics, 'proof_bar_excluded_no_fill_label');

const conflict = report.rows.find((row) => row.ticketId === 'after-proof-conflict');
assert.ok(conflict);
assert.equal(conflict.likelySourceSemantics, 'entry_touched_after_proof_bar_label_conflict');
assert.equal(conflict.firstEntryHitAfterProofBarTime, '2026-06-04T10:05:00');

const stopped = report.rows.find((row) => row.ticketId === 'stop-before-entry');
assert.ok(stopped);
assert.equal(stopped.likelySourceSemantics, 'stop_touched_before_later_entry');
assert.equal(stopped.firstStopTouchBeforeAfterProofBarEntryTime, '2026-06-05T10:05:00');

const consistent = report.rows.find((row) => row.ticketId === 'consistent-no-fill');
assert.ok(consistent);
assert.equal(consistent.likelySourceSemantics, 'no_completed_5m_entry_touch');

const missing = buildOpeningDriveNoFillSourceSemanticsDrilldownReport({
  noFillTimingReportPath: null,
  noFillTimingReport: null,
  htfSourcePath: null,
  htfSource: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive no-fill source semantics drilldown verified.');
