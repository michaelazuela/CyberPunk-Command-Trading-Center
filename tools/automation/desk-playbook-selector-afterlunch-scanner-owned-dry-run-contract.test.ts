import assert from 'node:assert/strict';
import { buildDeskPlaybookAfterLunchScannerOwnedDryRunContractReport } from './desk-playbook-selector-afterlunch-scanner-owned-dry-run-contract';

const baseTicket = {
  slateId: '2026-06-01|lunch',
  ticketId: 'source-a',
  tradeDate: '2026-06-01',
  session: 'lunch' as const,
  model: 'NoInstalledSetup' as const,
  direction: 'SHORT' as const,
  proofTime: '2026-06-01T12:20:00',
  entryHitTime: '2026-06-01T12:20:00',
  proofToEntryMinutes: 0,
  entry: 7594.75,
  stop: 7600.75,
  target1: 7585.75,
  target2: 7582.75,
  riskPoints: 6,
  outcomeBucket: 'winner_t1_t2',
  outcomeLabel: 't1_and_t2_hit',
  oneMesPl: 60,
  htfAlignment: 'supports',
  activeRaids: ['overnightHighRaid'],
  movement: 'balanced_range',
  camouflageClass: 'camouflaged_positive_proof',
  joinStatus: 'joined_ticket_geometry',
  issueTags: ['full_delivery'],
};

const report = buildDeskPlaybookAfterLunchScannerOwnedDryRunContractReport({
  earliestProofPreviewPath: 'diagnostic-reports/afterlunch-preview.json',
  earliestProofPreviewReport: {
    reportType: 'desk_playbook_selector_afterlunch_earliest_proof_preview',
    status: 'pass',
    summary: {
      previewTickets: 4,
      joinedGeometryTickets: 3,
      winners: 2,
      losses: 1,
      unresolved: 0,
      oneMesPl: 90,
      winRateResolved: 0.67,
      recommendation: 'candidate_for_scanner_owned_dry_run_contract',
    },
    tickets: [
      baseTicket,
      {
        ...baseTicket,
        ticketId: 'source-a-duplicate',
        proofTime: '2026-06-01T12:25:00',
        oneMesPl: 50,
      },
      {
        ...baseTicket,
        slateId: '2026-06-02|lunch',
        ticketId: 'source-b-loss',
        tradeDate: '2026-06-02',
        outcomeBucket: 'loss_stopped_before_t1',
        outcomeLabel: 'stopped_before_t1',
        oneMesPl: -30,
        htfAlignment: null,
        activeRaids: [],
      },
      {
        ...baseTicket,
        slateId: '2026-06-03|lunch',
        ticketId: 'source-c-missing-geometry',
        tradeDate: '2026-06-03',
        entry: null,
        stop: null,
        target1: null,
        target2: null,
        oneMesPl: null,
        joinStatus: 'missing_ticket_geometry',
      },
    ],
  },
}, '2026-07-22T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_afterlunch_scanner_owned_dry_run_contract');
assert.equal(report.status, 'pass');
assert.equal(report.summary.sourcePreviewTickets, 4);
assert.equal(report.summary.contractTickets, 4);
assert.equal(report.summary.reviewTickets, 2);
assert.equal(report.summary.blockedMissingGeometry, 1);
assert.equal(report.summary.duplicateSlatesSuppressed, 1);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.oneMesPl, 30);
assert.equal(report.summary.recommendation, 'hold_dry_run_contract');
assert.equal(report.contract.oneTicketPerSlate, true);
assert.equal(report.contract.publishDiscord, false);
assert.equal(report.contract.writeSupabase, false);
assert.equal(report.contract.canExecute, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingRules, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.tickets.every((ticket) => ticket.canExecute === false), true);
assert.equal(report.tickets.every((ticket) => ticket.publishDiscord === false), true);
assert.equal(report.tickets.every((ticket) => ticket.writeSupabase === false), true);
assert.equal(report.tickets[0].status, 'dry_run_review_ticket');
assert.equal(report.tickets[1].status, 'suppressed_duplicate_slate');
assert.equal(report.tickets[2].htfContextStatus, 'data_limited');
assert.equal(report.tickets[3].status, 'blocked_missing_geometry');
assert.match(report.tickets[0].ticketText.authority, /5M remains execution authority/);
assert.match(report.markdown, /Scanner-Owned Dry-Run Contract/);

const clean = buildDeskPlaybookAfterLunchScannerOwnedDryRunContractReport({
  earliestProofPreviewPath: 'diagnostic-reports/clean-preview.json',
  earliestProofPreviewReport: {
    reportType: 'desk_playbook_selector_afterlunch_earliest_proof_preview',
    status: 'pass',
    summary: {
      previewTickets: 2,
      joinedGeometryTickets: 2,
      winners: 2,
      losses: 0,
      unresolved: 0,
      oneMesPl: 120,
      winRateResolved: 1,
      recommendation: 'candidate_for_scanner_owned_dry_run_contract',
    },
    tickets: [
      baseTicket,
      { ...baseTicket, slateId: '2026-06-02|lunch', ticketId: 'source-b', tradeDate: '2026-06-02' },
    ],
  },
}, '2026-07-22T00:01:00.000Z');

assert.equal(clean.summary.recommendation, 'advance_to_local_scanner_snapshot_preview');

const missing = buildDeskPlaybookAfterLunchScannerOwnedDryRunContractReport({
  earliestProofPreviewPath: null,
  earliestProofPreviewReport: null,
}, '2026-07-22T00:02:00.000Z');

assert.equal(missing.status, 'blocked');
assert.equal(missing.summary.recommendation, 'fix_preview_input');
assert.ok(missing.blockers.includes('missing AfterLunch earliest-proof preview report'));

console.log('Desk playbook AfterLunch scanner-owned dry-run contract verified.');
