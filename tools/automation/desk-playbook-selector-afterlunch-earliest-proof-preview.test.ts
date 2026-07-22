import assert from 'node:assert/strict';
import { buildDeskPlaybookAfterLunchEarliestProofPreviewReport } from './desk-playbook-selector-afterlunch-earliest-proof-preview';

const report = buildDeskPlaybookAfterLunchEarliestProofPreviewReport({
  sourceProofTimingPath: 'diagnostic-reports/source-proof.json',
  replayPackagePath: 'diagnostic-reports/replay-package.json',
  reviewedCaseIntakePath: 'diagnostic-reports/intake.json',
  camouflageAuditPath: 'diagnostic-reports/camouflage.json',
  sourceProofTimingReport: {
    reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
    status: 'pass',
    rows: [
      {
        ticketId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-LONG-20260601T123500',
        tradeDate: '2026-06-01',
        session: 'lunch',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'LONG',
        outcomeBucket: 'winner_t1_t2',
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 90,
        proofTime: '2026-06-01T12:35:00',
        entryHitTime: '2026-06-01T12:35:00',
        proofToEntryMinutes: 0,
        riskPoints: 9,
        issueTags: ['same_bar_entry'],
      },
      {
        ticketId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-LONG-20260601T124500',
        tradeDate: '2026-06-01',
        session: 'lunch',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'LONG',
        outcomeBucket: 'winner_t1_t2',
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 70,
        proofTime: '2026-06-01T12:45:00',
        entryHitTime: '2026-06-01T12:45:00',
        proofToEntryMinutes: 0,
        riskPoints: 8,
        issueTags: ['same_bar_entry'],
      },
      {
        ticketId: '2026-06-02-lunch-AfterLunchDriveFvgContinuation-SHORT-20260602T122000',
        tradeDate: '2026-06-02',
        session: 'lunch',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'SHORT',
        outcomeBucket: 'loss_stopped_before_t1',
        outcomeLabel: 'stopped_before_t1',
        resolvedOneMesPl: -30,
        proofTime: '2026-06-02T12:20:00',
        entryHitTime: '2026-06-02T12:20:00',
        proofToEntryMinutes: 0,
        riskPoints: 6,
        issueTags: ['stopped_before_t1'],
      },
      {
        ticketId: 'ignored-morning',
        tradeDate: '2026-06-02',
        session: 'morning',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'SHORT',
        outcomeBucket: 'winner_t1_t2',
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 100,
        proofTime: '2026-06-02T10:20:00',
        entryHitTime: '2026-06-02T10:20:00',
        proofToEntryMinutes: 0,
        riskPoints: 6,
        issueTags: [],
      },
    ],
  },
  replayPackageReport: {
    reportType: 'unified_positive_held_local_preview_replay_package',
    status: 'pass',
    rows: [
      {
        ticketId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-LONG-20260601T123500',
        entry: 7500,
        stop: 7491,
        t1: 7513.5,
        t2: 7518,
        riskPoints: 9,
      },
      {
        ticketId: '2026-06-02-lunch-AfterLunchDriveFvgContinuation-SHORT-20260602T122000',
        entry: 7500,
        stop: 7506,
        t1: 7491,
        t2: 7488,
        riskPoints: 6,
      },
    ],
  },
  reviewedCaseIntakeReport: {
    reportType: 'unified_positive_held_local_preview_reviewed_case_intake',
    status: 'pass',
    rows: [
      {
        intakeId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-LONG',
        tradeDate: '2026-06-01',
        session: 'lunch',
        instrument: 'MES',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'LONG',
        firstSeenTime: '2026-06-01T12:35:00.0000000',
        entry: 7500,
        stop: 7491,
        target1: 7513.5,
        target2: 7518,
        riskPoints: 9,
      },
      {
        intakeId: '2026-06-02-lunch-AfterLunchDriveFvgContinuation-SHORT',
        tradeDate: '2026-06-02',
        session: 'lunch',
        instrument: 'MES',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'SHORT',
        firstSeenTime: '2026-06-02T12:20:00.0000000',
        entry: 7500,
        stop: 7506,
        target1: 7491,
        target2: 7488,
        riskPoints: 6,
      },
    ],
  },
  camouflageAuditReport: {
    reportType: 'desk_playbook_selector_camouflage_audit',
    rows: [
      {
        date: '2026-06-01',
        session: 'lunch',
        selectedModel: 'AfterLunchDriveFvgContinuation',
        selectedDirection: 'LONG',
        activeRaids: ['overnightHighRaid'],
        htfAlignment: 'supports',
        movement: 'balanced_range',
        camouflageClass: 'camouflaged_positive_proof',
        complexityScore: 80,
      },
    ],
  },
}, '2026-07-22T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_afterlunch_earliest_proof_preview');
assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 4);
assert.equal(report.summary.afterLunchRows, 3);
assert.equal(report.summary.previewTickets, 2);
assert.equal(report.summary.joinedGeometryTickets, 2);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.oneMesPl, 60);
assert.equal(report.summary.recommendation, 'hold_dry_run_preview');
assert.equal(report.authority.dryRunPreviewOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);

const june1 = report.tickets.find((ticket) => ticket.slateId === '2026-06-01|lunch');
assert.equal(june1?.ticketId, '2026-06-01-lunch-AfterLunchDriveFvgContinuation-LONG-20260601T123500');
assert.equal(june1?.entry, 7500);
assert.equal(june1?.stop, 7491);
assert.deepEqual(june1?.activeRaids, ['overnightHighRaid']);
assert.match(report.markdown, /Earliest Proof Preview/);

const blocked = buildDeskPlaybookAfterLunchEarliestProofPreviewReport({
  sourceProofTimingPath: null,
  replayPackagePath: null,
  reviewedCaseIntakePath: null,
  camouflageAuditPath: null,
}, '2026-07-22T00:00:00.000Z');

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.includes('missing source/proof timing report'));

console.log('Desk playbook AfterLunch earliest-proof preview verified.');
