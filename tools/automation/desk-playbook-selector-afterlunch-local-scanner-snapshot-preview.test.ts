import assert from 'node:assert/strict';
import {
  buildDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport,
  parseDeskPlaybookAfterLunchLocalScannerSnapshotPreviewArgs,
} from './desk-playbook-selector-afterlunch-local-scanner-snapshot-preview';

const baseTicket = {
  contractId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-SHORT-20260601T122000-dry-run',
  sourceTicketId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-SHORT-20260601T122000',
  slateId: '2026-06-01|lunch',
  tradeDate: '2026-06-01',
  session: 'lunch' as const,
  model: 'AfterLunchDriveFvgContinuation' as const,
  direction: 'SHORT' as const,
  proofTime: '2026-06-01T12:20:00',
  entry: 7594.75,
  stop: 7600.75,
  target1: 7585.75,
  target2: 7582.75,
  riskPoints: 6,
  htfContextStatus: 'supports' as const,
  activeRaids: ['overnightHighRaid', 'priorHighRaid'],
  movement: 'balanced_range',
  outcomeBucket: 'winner_t1_t2',
  oneMesPl: 60,
  status: 'dry_run_review_ticket' as const,
  canExecute: false as const,
  publishDiscord: false as const,
  writeSupabase: false as const,
  reviewOnly: true as const,
  livePromotionAllowed: false as const,
  blockers: [],
  ticketText: {
    what: 'AfterLunchDriveFvgContinuation short dry-run review ticket from the first completed 5M proof in the lunch window.',
    where: 'Entry 7594.75, stop 7600.75, T1 7585.75, T2 7582.75, risk 6 points.',
    when: 'Proof time 2026-06-01T12:20:00 ET. One scanner-owned ticket is allowed for this lunch slate.',
    why: 'Saved context: HTF=supports, raids=overnightHighRaid, priorHighRaid, movement=balanced_range.',
    invalidation: 'Invalid if price violates the protected 5M stop line at 7600.75.',
    authority: 'Dry-run human-review contract only. 5M remains execution authority.',
  },
};

const report = buildDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport({
  dryRunContractPath: 'diagnostic-reports/afterlunch-dry-run-contract.json',
  dryRunContractReport: {
    reportType: 'desk_playbook_selector_afterlunch_scanner_owned_dry_run_contract',
    status: 'pass',
    summary: {
      contractTickets: 2,
      reviewTickets: 1,
      winners: 1,
      losses: 0,
      unresolved: 0,
      oneMesPl: 60,
      winRateResolved: 1,
      recommendation: 'advance_to_local_scanner_snapshot_preview',
    },
    tickets: [
      baseTicket,
      {
        ...baseTicket,
        contractId: '2026-06-01-lunch-AfterLunchDriveFvgContinuation-SHORT-duplicate-dry-run',
        sourceTicketId: 'duplicate',
        status: 'suppressed_duplicate_slate',
      },
    ],
  },
}, '2026-07-22T02:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_afterlunch_local_scanner_snapshot_preview');
assert.equal(report.status, 'pass');
assert.equal(report.summary.contractTicketsRead, 2);
assert.equal(report.summary.reviewTicketsRead, 1);
assert.equal(report.summary.snapshotRows, 1);
assert.equal(report.summary.selectedCandidateSnapshotRows, 1);
assert.equal(report.summary.deskTicketSnapshotRows, 1);
assert.equal(report.summary.publishDecisionSnapshotRows, 1);
assert.equal(report.summary.publishCompletePlanRows, 1);
assert.equal(report.summary.publishCanExecuteTrueRows, 0);
assert.equal(report.summary.localSnapshotReadyRows, 1);
assert.equal(report.summary.canExecuteDriftRows, 0);
assert.equal(report.summary.entryStopTargetDriftRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'ready_for_live_wiring_decision_gate');
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.livePromotionAllowed, false);
assert.equal(report.rows[0].selectedCandidateSourceOfTruth, 'scanner_candidate_lifecycle_trace');
assert.equal(report.rows[0].deskStateSourceOfTruth, 'scanner_desk_state');
assert.equal(report.rows[0].deskTicketSourceOfTruth, 'scanner_single_active_desk_ticket');
assert.equal(report.rows[0].publishDecisionSourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(report.rows[0].publishDisplaySource, 'selected_candidate');
assert.equal(report.rows[0].publishHasCompletePlan, true);
assert.equal(report.rows[0].publishCanExecute, false);
assert.equal(report.rows[0].publishHumanReviewOnly, true);
assert.equal(report.rows[0].canExecutePreservedFalse, true);
assert.equal(report.rows[0].entryStopTargetsPreserved, true);
assert.equal(report.rows[0].localSnapshotReady, true);
assert.equal(report.rows[0].livePromotionAllowed, false);
assert.match(report.rows[0].liveReadinessBlockers[0], /Live wiring gate is not approved/);
assert.match(report.markdown, /Data-limited HTF is context only/);

const dataLimited = buildDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport({
  dryRunContractPath: 'diagnostic-reports/afterlunch-dry-run-contract.json',
  dryRunContractReport: {
    reportType: 'desk_playbook_selector_afterlunch_scanner_owned_dry_run_contract',
    status: 'pass',
    summary: {
      contractTickets: 1,
      reviewTickets: 1,
      winners: 1,
      losses: 0,
      unresolved: 0,
      oneMesPl: 60,
      winRateResolved: 1,
      recommendation: 'advance_to_local_scanner_snapshot_preview',
    },
    tickets: [{ ...baseTicket, htfContextStatus: 'data_limited' as const, activeRaids: [] }],
  },
}, '2026-07-22T02:01:00.000Z');

assert.equal(dataLimited.status, 'pass');
assert.equal(dataLimited.summary.htfDataLimitedSourceRows, 1);
assert.equal(dataLimited.rows[0].sourceHtfContextStatus, 'data_limited');
assert.equal(dataLimited.rows[0].localSnapshotReady, true);

const missing = buildDeskPlaybookAfterLunchLocalScannerSnapshotPreviewReport({
  dryRunContractPath: null,
  dryRunContractReport: null,
}, '2026-07-22T02:02:00.000Z');

assert.equal(missing.status, 'blocked');
assert.equal(missing.summary.recommendation, 'fix_dry_run_contract_input');
assert.ok(missing.blockers.includes('missing AfterLunch scanner-owned dry-run contract path'));

const parsed = parseDeskPlaybookAfterLunchLocalScannerSnapshotPreviewArgs([
  '--dry-run-contract',
  'contract.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.dryRunContractPath, 'contract.json');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('Desk playbook AfterLunch local scanner snapshot preview verified.');
