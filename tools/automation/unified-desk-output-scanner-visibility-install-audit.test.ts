import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputScannerVisibilityInstallAuditReport } from './unified-desk-output-scanner-visibility-install-audit';

const report = buildUnifiedDeskOutputScannerVisibilityInstallAuditReport({
  readinessAuditPath: 'fixture-readiness-audit.json',
  readinessAuditReport: {
    reportType: 'unified_desk_output_live_gate_readiness_audit',
    status: 'pass',
    summary: {
      discordPostNowRows: 0,
      supabaseWriteNowRows: 0,
      liveBridgeReadNowRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      incompleteVisiblePlanRows: 0,
      wordingViolationRows: 0,
      blockedRows: 0,
    },
    candidates: [
      {
        cardId: 'unified|2026-07-22|morning|OpeningDriveFvgContinuation|SHORT',
        date: '2026-07-22',
        session: 'morning',
        state: 'APPROVED_DESK_PLAN',
        model: 'OpeningDriveFvgContinuation',
        direction: 'SHORT',
        proofTime: '2026-07-22T09:45:00',
        entry: 100,
        stop: 104,
        target1: 94,
        target2: 92,
        riskPoints: 4,
        scannerVisibleIfExplicitGateApproved: true,
        discordEligibleIfSeparatelyApproved: true,
        supabaseEligibleIfSeparatelyApproved: true,
        canExecuteRemainsExternalGate: true,
      },
      {
        cardId: 'unified|2026-07-22|lunch|AfterLunchDriveFvgContinuation|LONG',
        date: '2026-07-22',
        session: 'lunch',
        state: 'FORMING_DESK_READ',
        model: 'AfterLunchDriveFvgContinuation',
        direction: 'LONG',
        proofTime: '2026-07-22T12:35:00',
        entry: 100,
        stop: 96,
        target1: 106,
        target2: 108,
        riskPoints: 4,
        scannerVisibleIfExplicitGateApproved: true,
        discordEligibleIfSeparatelyApproved: true,
        supabaseEligibleIfSeparatelyApproved: true,
        canExecuteRemainsExternalGate: true,
      },
    ],
    blockers: [],
  },
}, '2026-07-22T01:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_scanner_visibility_install_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.installsScannerVisibilityAdapter, true);
assert.equal(report.authority.scannerVisibleNow, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.scannerVisibleCards, 2);
assert.equal(report.summary.approvedDeskPlanCards, 1);
assert.equal(report.summary.formingDeskReadCards, 1);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'scanner_visibility_installed_local_only');
assert.equal(report.model.status, 'ready');
assert.equal(report.model.cards.every((card) => card.scannerVisibleNow), true);
assert.equal(report.model.cards.every((card) => !card.publishDiscord), true);
assert.equal(report.model.cards.every((card) => !card.writesSupabase), true);
assert.equal(report.model.cards.every((card) => !card.canExecute), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

console.log('Unified Desk Output scanner visibility install audit verified.');
