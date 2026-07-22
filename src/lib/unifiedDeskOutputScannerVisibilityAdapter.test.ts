import assert from 'node:assert/strict';
import {
  buildUnifiedDeskOutputScannerVisibilityModel,
  type UnifiedDeskOutputVisibilityReadinessReport,
} from './unifiedDeskOutputScannerVisibilityAdapter';

const candidate = {
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
} satisfies UnifiedDeskOutputVisibilityReadinessReport['candidates'][number];

const readinessReport = {
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
    candidate,
    {
      ...candidate,
      cardId: 'unified|2026-07-22|lunch|AfterLunchDriveFvgContinuation|LONG',
      session: 'lunch',
      state: 'FORMING_DESK_READ',
      model: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-07-22T12:35:00',
    },
  ],
  blockers: [],
} satisfies UnifiedDeskOutputVisibilityReadinessReport;

const disabled = buildUnifiedDeskOutputScannerVisibilityModel({
  enabled: false,
  readinessReport,
});

assert.equal(disabled.status, 'disabled');
assert.equal(disabled.scannerVisibleNow, false);
assert.equal(disabled.publishDiscord, false);
assert.equal(disabled.writesSupabase, false);
assert.equal(disabled.readsLiveBridge, false);
assert.equal(disabled.canExecute, false);
assert.equal(disabled.cards.length, 0);

const ready = buildUnifiedDeskOutputScannerVisibilityModel({
  enabled: true,
  readinessReport,
});

assert.equal(ready.status, 'ready');
assert.equal(ready.sourceOfTruth, 'scanner_visible_unified_desk_output_adapter');
assert.equal(ready.localScannerOnly, true);
assert.equal(ready.scannerVisibleNow, true);
assert.equal(ready.publishDiscord, false);
assert.equal(ready.shouldPostDiscord, false);
assert.equal(ready.shouldDispatch, false);
assert.equal(ready.writesSupabase, false);
assert.equal(ready.readsLiveSupabase, false);
assert.equal(ready.readsLiveBridge, false);
assert.equal(ready.changesScannerBehavior, false);
assert.equal(ready.changesTradingLogic, false);
assert.equal(ready.changesCanExecute, false);
assert.equal(ready.canExecute, false);
assert.equal(ready.canExecuteChanged, false);
assert.equal(ready.livePromotionAllowed, false);
assert.equal(ready.noAutomatedOrders, true);
assert.equal(ready.cards.length, 2);
assert.equal(ready.cards[0].state, 'APPROVED_DESK_PLAN');
assert.equal(ready.cards[1].state, 'FORMING_DESK_READ');
assert.equal(ready.cards.every((card) => card.scannerVisibleNow), true);
assert.equal(ready.cards.every((card) => !card.publishDiscord), true);
assert.equal(ready.cards.every((card) => !card.writesSupabase), true);
assert.equal(ready.cards.every((card) => !card.readsLiveBridge), true);
assert.equal(ready.cards.every((card) => !card.canExecute), true);
assert.doesNotMatch(JSON.stringify(ready.cards), /human[- ]review|no chase|missed|no-trade|no trade/i);

const dirtyReport = {
  ...readinessReport,
  summary: {
    ...readinessReport.summary,
    discordPostNowRows: 1,
  },
} satisfies UnifiedDeskOutputVisibilityReadinessReport;

const blocked = buildUnifiedDeskOutputScannerVisibilityModel({
  enabled: true,
  readinessReport: dirtyReport,
});

assert.equal(blocked.status, 'blocked');
assert.equal(blocked.scannerVisibleNow, false);
assert.equal(blocked.cards.length, 0);
assert.ok(blocked.blockers.includes('Readiness report has Discord post rows.'));

console.log('Unified Desk Output scanner visibility adapter verified.');
