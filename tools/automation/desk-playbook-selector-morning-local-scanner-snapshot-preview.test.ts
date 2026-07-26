import assert from 'node:assert/strict';
import {
  buildDeskPlaybookMorningLocalScannerSnapshotPreviewReport,
  parseDeskPlaybookMorningLocalScannerSnapshotPreviewArgs,
} from './desk-playbook-selector-morning-local-scanner-snapshot-preview';

const baseSlate = {
  slateKey: '2026-06-09|morning|NoInstalledSetup|SHORT|7450.75|7464|7431|7424.25',
  selectedTicketId: '2026-06-09-morning-NoInstalledSetup-SHORT-20260609T102000',
  tradeDate: '2026-06-09',
  session: 'morning' as const,
  direction: 'SHORT' as const,
  firstProofTime: '2026-06-09T10:20:00',
  lastProofTime: '2026-06-09T11:55:00',
  selectedOutcomeBucket: 'winner' as const,
  selectedOutcomeLabel: 't1_and_t2_hit',
  selectedOneMesPl: 132.5,
  selectedR: 2,
  entry: 7450.75,
  stop: 7464,
  t1: 7431,
  t2: 7424.25,
  riskPoints: 13.25,
  rawRowsInSlate: 20,
  duplicateRowsSuppressed: 19,
  staleRowsSuppressed: 15,
  collisionRows: 4,
  collisionWinningRows: 4,
  collisionMethodKeys: [
    'NoInstalledSetup|morning|SHORT|risk_gte_32',
    'NoInstalledSetup|morning|SHORT|risk_16_to_24',
  ],
  mfeR: 9.42,
  maeR: 0,
};

const report = buildDeskPlaybookMorningLocalScannerSnapshotPreviewReport({
  dryRunContractPath: 'diagnostic-reports/morning-dry-run-contract.json',
  dryRunContractReport: {
    reportType: 'unified_positive_held_local_preview_scanner_owned_selector_dry_run_contract',
    status: 'pass',
    contract: {
      selectorMethodKey: 'NoInstalledSetup|morning|SHORT|risk_8_to_16',
      staleMinutes: 20,
      collisionWindowMinutes: 10,
      oneTicketPerSlate: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: 2154,
      selectorRawRows: 20,
      dryRunSlateRows: 1,
      duplicateRowsSuppressed: 19,
      staleRowsSuppressed: 15,
      collisionRows: 4,
      collisionWinningRows: 4,
      rawSelectorOneMesPl: 2650,
      dryRunOneMesPl: 132.5,
      dryRunVsRawDeltaOneMesPl: -2517.5,
      dryRunWinRateResolved: 1,
      livePromotionAllowedRows: 0,
      recommendation: 'advance_to_scanner_owned_local_preview_contract',
    },
    selectedSlates: [baseSlate],
    blockers: [],
  },
}, '2026-07-22T03:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_morning_local_scanner_snapshot_preview');
assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 2154);
assert.equal(report.summary.selectorRawRows, 20);
assert.equal(report.summary.contractSlateRows, 1);
assert.equal(report.summary.snapshotRows, 1);
assert.equal(report.summary.selectedCandidateSnapshotRows, 1);
assert.equal(report.summary.deskTicketSnapshotRows, 1);
assert.equal(report.summary.publishDecisionSnapshotRows, 1);
assert.equal(report.summary.publishCompletePlanRows, 1);
assert.equal(report.summary.publishCanExecuteTrueRows, 0);
assert.equal(report.summary.localSnapshotReadyRows, 1);
assert.equal(report.summary.canExecuteDriftRows, 0);
assert.equal(report.summary.entryStopTargetDriftRows, 0);
assert.equal(report.summary.duplicateRowsSuppressed, 19);
assert.equal(report.summary.staleRowsSuppressed, 15);
assert.equal(report.summary.collisionRows, 4);
assert.equal(report.summary.collisionWinningRows, 4);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'ready_for_live_wiring_decision_gate');
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.livePromotionAllowed, false);
assert.equal(report.source.selectorMethodKey, 'NoInstalledSetup|morning|SHORT|risk_8_to_16');
assert.equal(report.rows[0].setupType, 'NoInstalledSetup');
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
assert.match(report.markdown, /OpeningDrive/);

const missing = buildDeskPlaybookMorningLocalScannerSnapshotPreviewReport({
  dryRunContractPath: null,
  dryRunContractReport: null,
}, '2026-07-22T03:01:00.000Z');

assert.equal(missing.status, 'blocked');
assert.equal(missing.summary.recommendation, 'fix_dry_run_contract_input');
assert.ok(missing.blockers.includes('missing morning scanner-owned selector dry-run contract path'));

const parsed = parseDeskPlaybookMorningLocalScannerSnapshotPreviewArgs([
  '--dry-run-contract',
  'contract.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.dryRunContractPath, 'contract.json');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('Desk playbook morning local scanner snapshot preview verified.');
