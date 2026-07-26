import assert from 'node:assert/strict';
import { buildOpeningDriveOvernightHighRaidDryRunProposalReport } from './unified-positive-held-local-preview-openingdrive-overnight-high-raid-dry-run-proposal';

function row(overrides: Record<string, unknown>) {
  return {
    ticketId: 'ticket',
    tradeDate: '2026-06-16',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT',
    proofTime: '2026-06-16T10:20:00',
    entry: 7629.75,
    stop: 7636.5,
    t1: 7619.75,
    t2: 7616.25,
    riskPoints: 6.75,
    bucket: 'winner',
    label: 't1_and_t2_hit',
    oneMesPl: 67.5,
    entryHitTime: '2026-06-16T10:20:00',
    stopHitTime: null,
    t1HitTime: '2026-06-16T10:25:00',
    t2HitTime: '2026-06-16T10:25:00',
    storyVerdict: 'mixed_short',
    htfSufficiency: 'sufficient',
    overnightHigh: 7634.75,
    overnightLow: 7612,
    raidedOvernightHigh: true,
    raidedOvernightLow: false,
    firstOvernightHighRaidTime: '2026-06-16T09:35:00',
    firstOvernightLowRaidTime: null,
    bearishDisplacementBeforeProof: true,
    strongestBearishDisplacementTime: '2026-06-16T10:00:00',
    strongestBearishDisplacementScore: 3.95,
    playStory: 'buy_side_raid_bearish_displacement_short',
    ...overrides,
  };
}

const report = buildOpeningDriveOvernightHighRaidDryRunProposalReport({
  overnightAuditReportPath: 'overnight.json',
  overnightAuditReport: {
    rows: [
      row({ ticketId: 'eligible-winner' }),
      row({ ticketId: 'eligible-unresolved', tradeDate: '2026-06-18', bucket: 'unresolved', label: 'no_fill', oneMesPl: null }),
      row({ ticketId: 'blocked-no-high-raid', raidedOvernightHigh: false, raidedOvernightLow: true, playStory: 'sell_side_raid_bearish_continuation_short' }),
      row({ ticketId: 'blocked-no-displacement', bearishDisplacementBeforeProof: false }),
      row({ ticketId: 'blocked-bad-geometry', stop: 7620 }),
    ],
  } as any,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 5);
assert.equal(report.summary.eligibleRows, 2);
assert.equal(report.summary.blockedRows, 3);
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
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('missing overnight high raid')));
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('missing bearish displacement before proof')));
assert.ok(report.blockedRows.some((item) => item.dryRunBlockers.includes('missing deterministic entry/stop/T1/T2 geometry')));

const missing = buildOpeningDriveOvernightHighRaidDryRunProposalReport({
  overnightAuditReportPath: null,
  overnightAuditReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_inputs');

console.log('OpeningDrive overnight high raid dry-run proposal verified.');
