import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputScannerSurfaceModel } from './unifiedDeskOutputScannerSurface';
import type { UnifiedDeskOutputScannerVisibilityModel } from './unifiedDeskOutputScannerVisibilityAdapter';

const card = (state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ') => ({
  cardId: `surface|${state}`,
  date: '2026-07-22',
  session: state === 'APPROVED_DESK_PLAN' ? 'morning' as const : 'lunch' as const,
  state,
  model: state === 'APPROVED_DESK_PLAN' ? 'OpeningDriveFvgContinuation' : 'AfterLunchDriveFvgContinuation',
  direction: state === 'APPROVED_DESK_PLAN' ? 'SHORT' as const : 'LONG' as const,
  proofTime: state === 'APPROVED_DESK_PLAN' ? '2026-07-22T09:45:00' : '2026-07-22T12:35:00',
  entry: 100,
  stop: state === 'APPROVED_DESK_PLAN' ? 104 : 96,
  target1: state === 'APPROVED_DESK_PLAN' ? 94 : 106,
  target2: state === 'APPROVED_DESK_PLAN' ? 92 : 108,
  riskPoints: 4,
  headline: state,
  what: `${state} what line.`,
  where: 'Entry/stop/targets.',
  when: 'Completed 5M proof.',
  why: `${state} why line.`,
  invalidation: 'Invalid if price violates the protected 5M stop line.',
  authority: 'Decision-support desk output only. Existing deterministic execution gates remain in control. No automated orders.',
  scannerVisibleNow: true as const,
  localScannerOnly: true as const,
  publishDiscord: false as const,
  shouldPostDiscord: false as const,
  shouldDispatch: false as const,
  writesSupabase: false as const,
  readsLiveSupabase: false as const,
  readsLiveBridge: false as const,
  changesScannerBehavior: false as const,
  changesTradingLogic: false as const,
  changesCanExecute: false as const,
  canExecute: false as const,
  canExecuteChanged: false as const,
  livePromotionAllowed: false as const,
  noAutomatedOrders: true as const,
});

const visibilityModel = {
  status: 'ready',
  sourceOfTruth: 'scanner_visible_unified_desk_output_adapter',
  localScannerOnly: true,
  scannerVisibleNow: true,
  publishDiscord: false,
  shouldPostDiscord: false,
  shouldDispatch: false,
  writesSupabase: false,
  readsLiveSupabase: false,
  readsLiveBridge: false,
  changesScannerBehavior: false,
  changesTradingLogic: false,
  changesCanExecute: false,
  canExecute: false,
  canExecuteChanged: false,
  livePromotionAllowed: false,
  noAutomatedOrders: true,
  cards: [
    card('APPROVED_DESK_PLAN'),
    card('FORMING_DESK_READ'),
  ],
  blockers: [],
} satisfies UnifiedDeskOutputScannerVisibilityModel;

const surface = buildUnifiedDeskOutputScannerSurfaceModel(visibilityModel);

assert.equal(surface.status, 'ready');
assert.equal(surface.sourceOfTruth, 'scanner_surface_unified_desk_output_consumer');
assert.equal(surface.localScannerOnly, true);
assert.equal(surface.summary.rows, 2);
assert.equal(surface.summary.approvedDeskPlans, 1);
assert.equal(surface.summary.formingDeskReads, 1);
assert.equal(surface.summary.discordPostRows, 0);
assert.equal(surface.summary.supabaseWriteRows, 0);
assert.equal(surface.summary.liveBridgeReadRows, 0);
assert.equal(surface.summary.canExecuteTrueRows, 0);
assert.equal(surface.summary.wordingViolationRows, 0);
assert.equal(surface.rows[0].stateLabel, 'Approved Desk Plan');
assert.equal(surface.rows[1].stateLabel, 'Forming Desk Read');
assert.match(surface.rows[0].headline, /Approved Desk Plan/);
assert.match(surface.rows[1].headline, /Forming Desk Read/);
assert.match(surface.rows[0].levelLine, /Entry 100/);
assert.match(surface.rows[0].authorityLine, /Discord\/Supabase\/bridge\/canExecute remain off/);
assert.doesNotMatch(JSON.stringify(surface.rows), /human[- ]review|no chase|missed|no-trade|no trade/i);

const dirtyVisibilityModel = {
  ...visibilityModel,
  publishDiscord: true as false,
} satisfies UnifiedDeskOutputScannerVisibilityModel;

const blockedSurface = buildUnifiedDeskOutputScannerSurfaceModel(dirtyVisibilityModel);

assert.equal(blockedSurface.status, 'blocked');
assert.equal(blockedSurface.rows.length, 0);
assert.ok(blockedSurface.blockers.includes('Visibility model would post or dispatch Discord.'));

console.log('Unified Desk Output scanner surface verified.');
