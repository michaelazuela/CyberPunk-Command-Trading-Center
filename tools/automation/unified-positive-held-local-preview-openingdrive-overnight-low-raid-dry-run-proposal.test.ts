import assert from 'node:assert/strict';
import { buildOpeningDriveOvernightLowRaidDryRunProposalReport } from './unified-positive-held-local-preview-openingdrive-overnight-low-raid-dry-run-proposal';

function row(overrides: Record<string, unknown>) {
  return {
    ticketId: 'ticket',
    tradeDate: '2026-06-16',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    proofTime: '2026-06-16T10:20:00',
    entry: 7629.75,
    stop: 7623,
    t1: 7639.75,
    t2: 7643.25,
    riskPoints: 6.75,
    bucket: 'winner',
    label: 't1_and_t2_hit',
    oneMesPl: 67.5,
    storyVerdict: 'mixed_long',
    htfSufficiency: 'sufficient',
    overnightHigh: 7650,
    overnightLow: 7624.75,
    raidedOvernightHigh: false,
    raidedOvernightLow: true,
    firstOvernightHighRaidTime: null,
    firstOvernightLowRaidTime: '2026-06-16T09:35:00',
    bullishDisplacementBeforeProof: true,
    strongestBullishDisplacementTime: '2026-06-16T10:00:00',
    strongestBullishDisplacementScore: 3.95,
    playStory: 'sell_side_raid_bullish_displacement_long',
    ...overrides,
  };
}

const report = buildOpeningDriveOvernightLowRaidDryRunProposalReport({
  overnightAuditReportPath: 'overnight.json',
  overnightAuditReport: {
    rows: [
      row({ ticketId: 'eligible-winner' }),
      row({ ticketId: 'eligible-unresolved', tradeDate: '2026-06-18', bucket: 'unresolved', label: 'no_fill', oneMesPl: null }),
      row({ ticketId: 'blocked-no-low-raid', raidedOvernightLow: false, raidedOvernightHigh: true }),
      row({ ticketId: 'blocked-no-displacement', bullishDisplacementBeforeProof: false }),
      row({ ticketId: 'blocked-bad-geometry', stop: 7633 }),
      row({ ticketId: 'blocked-short-source', direction: 'SHORT' }),
    ],
  } as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 6);
assert.equal(report.summary.eligibleRows, 2);
assert.equal(report.summary.blockedRows, 4);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 0);
assert.equal(report.summary.unresolved, 1);
assert.equal(report.summary.noFills, 1);
assert.equal(report.summary.oneMesPl, 67.5);
assert.equal(report.summary.winRateResolved, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'user_decision_required_before_any_implementation');

assert.ok(report.eligibleRows.every((item) => item.scannerVisibility === 'dry_run_review_only'));
assert.ok(report.eligibleRows.every((item) => item.wouldPublishLive === false));
assert.ok(report.eligibleRows.every((item) => item.canExecuteChanged === false));
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('missing overnight low raid')));
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('missing bullish displacement before proof')));
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('missing deterministic entry/stop/T1/T2 geometry')));
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('not long direction')));

const shortOnly = buildOpeningDriveOvernightLowRaidDryRunProposalReport({
  overnightAuditReportPath: 'overnight.json',
  overnightAuditReport: {
    rows: [
      row({ ticketId: 'short-only', direction: 'SHORT' }),
    ],
  } as any,
}, '2026-07-20T00:01:00.000Z');
assert.equal(shortOnly.status, 'pass');
assert.equal(shortOnly.summary.eligibleRows, 0);
assert.equal(shortOnly.summary.recommendation, 'insufficient_bullish_source_rows');

const missing = buildOpeningDriveOvernightLowRaidDryRunProposalReport({
  overnightAuditReportPath: null,
  overnightAuditReport: null,
}, '2026-07-20T00:02:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive overnight low raid dry-run proposal verified.');
