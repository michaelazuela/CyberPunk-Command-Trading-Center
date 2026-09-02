import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildScannerZoneFeed, writeScannerZoneFeed } from './scanner-zone-feed';

const strictBullZone = {
  sourceOfTruth: 'scanner_retained_boss_zone_ledger',
  sourceKind: 'strict_15m_fvg',
  sourceLabel: 'strict 15M FVG',
  direction: 'LONG',
  role: 'final_boss_zone',
  lower: 7679.75,
  upper: 7683.5,
  midpoint: 7681.75,
  lineInSand: 7679.75,
  sourceTimeframe: '15M',
  formedAt: '2026-08-30T20:00:00-04:00',
  formedCandleIndex: 10,
  confidence: 'High',
  state: 'defended',
  stateReason: 'Completed candle defended the zone.',
  use: 'Bull Final Boss Support: watch as downside support/reaction context.',
  holdCondition: 'Hold above the zone floor.',
  invalidation: 'Invalidated by completed acceptance below 7679.75.',
  approvalBoundary: {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  },
};

const mssBearZone = {
  sourceOfTruth: 'scanner_final_boss_mss_zone_lifecycle',
  sourceKind: 'mss_protected_imbalance_origin',
  sourceLabel: '15M MSS origin',
  direction: 'SHORT',
  role: 'final_boss_mss_zone',
  lower: 7705,
  upper: 7723,
  midpoint: 7714,
  mssLine: 7705,
  lineInSand: 7705,
  sourceTimeframe: '15M',
  formedAt: '2026-08-30T17:15:00-04:00',
  formedCandleIndex: 42,
  mssBreakAt: '2026-08-30T18:15:00-04:00',
  mssBreakCandleIndex: 46,
  state: 'active_control',
  stateReason: '15M MSS broke below the origin zone.',
  ageTradingDays: 1,
  expiresAfterTradingDays: 3,
  flipDirection: null,
  use: 'Bear final boss zone produced the 15M structure shift lower.',
  invalidation: 'Bear final boss control fails on completed 15M acceptance above 7723.00.',
  approvalBoundary: {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  },
};

const noisyBullZone = {
  ...strictBullZone,
  lower: 7680.25,
  upper: 7682,
  midpoint: 7681.25,
  lineInSand: 7680.25,
  formedAt: '2026-08-31T03:00:00-04:00',
  state: 'pierced',
  stateReason: 'Price pierced but did not preserve clean desk context.',
};

const flippedBullZone = {
  ...mssBearZone,
  direction: 'LONG',
  lower: 7688.5,
  upper: 7691.5,
  midpoint: 7690,
  lineInSand: 7688.5,
  state: 'flipped_reaction',
  stateReason: 'Prior bull boss flipped into reaction context.',
  use: 'Bull final boss flipped into reaction context.',
} as any;

const deskState = {
  canExecute: false,
  primaryDeskPlay: {
    direction: 'WAIT',
    lineInSand: 7679.75,
    longAbove: 7683.5,
    shortBelow: 7705,
    nextTrigger: 'Completed 5M proof required.',
    invalidation: 'Context only.',
    discordEligible: true,
    retainedBossZones: {
      sourceOfTruth: 'scanner_retained_boss_zone_ledger',
      bullBoss: strictBullZone,
      bearBoss: null,
      activeMssProtectedBossZone: null,
      finalBossMssZones: {
        bull: [],
        bear: [mssBearZone],
        primaryBull: null,
        primaryBear: mssBearZone,
      },
      zones: [strictBullZone, noisyBullZone, flippedBullZone],
      summary: 'Loopback zones.',
      approvalBoundary: {
        changesTradeApprovals: false,
        changesCanExecute: false,
        changesEntryStopTargets: false,
        createsNewModel: false,
      },
    },
  },
} as any;

const feed = buildScannerZoneFeed({
  deskState,
  instrument: 'MES',
  tradeDate: '2026-08-31',
  session: 'morning',
  completed5m: { time: '2026-08-31T09:55:00-04:00' },
  currentPrice: 7692.75,
  generatedAt: '2026-08-31T10:00:00.000Z',
});

assert.equal(feed.sourceOfTruth, 'scanner_zone_overlay_feed');
assert.equal(feed.schemaVersion, 3);
assert.equal(feed.primaryDeskPlay.canExecute, false);
assert.equal(feed.authorityBoundary.displayOnly, true);
assert.equal(feed.authorityBoundary.ninjaTraderIndicatorOwnsRules, false);
assert.equal(feed.authorityBoundary.placesOrders, false);
assert.equal(feed.zones.length, 4);
assert.equal(feed.displayPolicy.mode, 'desk');
assert.equal(feed.displayPolicy.maxZones, 6);
assert.deepEqual(feed.displayPolicy.hidesStates, ['invalidated', 'expired']);
assert.deepEqual(feed.displayPolicy.hidesKinds, ['active_mss_protected_boss_zone']);
assert.equal(feed.displayZones.length, 3);
assert.equal(feed.displayZones.some((zone) => zone.state === 'flipped_reaction'), true);
assert.equal(feed.displayZones.some((zone) => zone.kind === 'active_mss_protected_boss_zone'), false);

const strict = feed.zones.find((zone) => zone.sourceKind === 'strict_15m_fvg');
assert.ok(strict);
assert.equal(strict?.lower, 7679.75);
assert.equal(strict?.upper, 7683.5);
assert.equal(strict?.draw.label, 'Bull Final Boss');
assert.equal(strict?.authorityBoundary.placesOrders, false);

const mss = feed.zones.find((zone) => zone.sourceKind === 'mss_protected_imbalance_origin' && zone.direction === 'SHORT');
assert.ok(mss);
assert.equal(mss?.direction, 'SHORT');
assert.equal(mss?.kind, 'final_boss_mss_zone');
assert.equal(mss?.lineInSand, 7705);
assert.equal(mss?.draw.label, 'Bear Final Boss');

const displayStrict = feed.displayZones.find((zone) => zone.sourceKind === 'strict_15m_fvg');
assert.ok(displayStrict);
assert.equal(displayStrict?.lower, 7679.75);
assert.equal(displayStrict?.upper, 7683.5);
assert.equal(displayStrict?.state, 'defended');

const displayMssBoss = feed.displayZones.find((zone) => zone.kind === 'final_boss_mss_zone' && zone.direction === 'SHORT');
assert.ok(displayMssBoss);
assert.equal(displayMssBoss?.lower, 7705);
assert.equal(displayMssBoss?.upper, 7723);
assert.equal(displayMssBoss?.draw.label, 'Bear Final Boss');

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-zone-feed-'));
try {
  const filePath = path.join(tempDir, 'feed.json');
  const written = await writeScannerZoneFeed({
    deskState,
    instrument: 'MES',
    tradeDate: '2026-08-31',
    session: 'morning',
    completed5m: { time: '2026-08-31T09:55:00-04:00' },
    currentPrice: 7692.75,
    filePath,
  });
  const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
  assert.equal(parsed.sourceOfTruth, 'scanner_zone_overlay_feed');
  assert.equal(parsed.zones.length, written.zones.length);
  assert.equal(parsed.displayZones.length, written.displayZones.length);
  assert.equal(parsed.authorityBoundary.changesCanExecute, false);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('scanner zone feed loopback test passed');
