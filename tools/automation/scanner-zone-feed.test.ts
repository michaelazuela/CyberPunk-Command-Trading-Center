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
  bossRole: 'prior_boss',
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

const farHistoricalBullMssZone = {
  ...mssBearZone,
  sourceOfTruth: 'scanner_final_boss_mss_zone_lifecycle',
  sourceKind: 'strict_15m_fvg',
  sourceLabel: 'strict 15M FVG',
  direction: 'LONG',
  bossRole: 'active_final_boss',
  lower: 7636.5,
  upper: 7637,
  midpoint: 7636.75,
  lineInSand: 7641.75,
  formedAt: '2026-08-29T03:00:00-04:00',
  mssBreakAt: '2026-08-29T08:00:00-04:00',
  state: 'active_control',
  stateReason: 'Old Final Boss remains in full retained memory.',
  use: 'Bull final boss zone produced an older 15M structure shift higher.',
  invalidation: 'Old zone is hidden from clean desk view unless price returns near it.',
} as any;

const unflippedBearBelowPriceZone = {
  ...strictBullZone,
  sourceKind: 'strict_15m_fvg',
  sourceLabel: 'strict 15M FVG',
  direction: 'SHORT',
  lower: 7672.25,
  upper: 7677.25,
  midpoint: 7674.75,
  lineInSand: 7677.25,
  formedAt: '2026-09-02T16:45:00-04:00',
  state: 'defended',
  stateReason: 'Bear zone has not accepted through or flipped yet.',
  use: 'Bear Final Boss Resistance: watch only while price remains below the zone ceiling.',
  invalidation: 'Not a flipped short boss unless completed acceptance proves the flip.',
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
        bull: [farHistoricalBullMssZone],
        bear: [mssBearZone],
        primaryBull: null,
        primaryBear: mssBearZone,
      },
      zones: [strictBullZone, noisyBullZone, flippedBullZone, unflippedBearBelowPriceZone],
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
assert.equal(feed.schemaVersion, 6);
assert.equal(feed.primaryDeskPlay.canExecute, false);
assert.equal(feed.authorityBoundary.displayOnly, true);
assert.equal(feed.authorityBoundary.ninjaTraderIndicatorOwnsRules, false);
assert.equal(feed.authorityBoundary.placesOrders, false);
assert.equal(feed.zones.length, 6);
assert.ok(Array.isArray(feed.finalBossZones));
assert.ok(Array.isArray(feed.tradeBoxes));
assert.ok(Array.isArray(feed.reactionZones));
assert.ok(Array.isArray(feed.debugZones));
assert.equal(feed.displayPolicy.mode, 'clean_desk');
assert.equal(feed.displayPolicy.maxZones, 4);
assert.equal(feed.displayPolicy.maxDistancePoints, 18);
assert.deepEqual(feed.displayPolicy.hidesStates, ['invalidated', 'expired']);
assert.deepEqual(feed.displayPolicy.hidesKinds, ['active_mss_protected_boss_zone']);
assert.equal(feed.displayZones.length, 1);
assert.equal(feed.displayZones.some((zone) => zone.state === 'flipped_reaction'), false);
assert.equal(feed.displayZones.some((zone) => zone.kind === 'active_mss_protected_boss_zone'), false);
assert.equal(feed.debugZones.some((zone) => zone.kind === 'active_mss_protected_boss_zone'), false);

const strict = feed.zones.find((zone) => zone.lower === 7679.75 && zone.upper === 7683.5);
assert.ok(strict);
assert.equal(strict?.lower, 7679.75);
assert.equal(strict?.upper, 7683.5);
assert.equal(strict?.draw.label, 'Bull Final Boss');
assert.equal(strict?.category, 'final_boss');
assert.equal(strict?.reactionGrade, 'A+');
assert.equal(strict?.authorityBoundary.placesOrders, false);

const mss = feed.zones.find((zone) => zone.sourceKind === 'mss_protected_imbalance_origin' && zone.direction === 'SHORT');
assert.ok(mss);
assert.equal(mss?.direction, 'SHORT');
assert.equal(mss?.kind, 'final_boss_mss_zone');
assert.equal(mss?.lineInSand, 7705);
assert.equal(mss?.bossRole, 'prior_boss');
assert.equal(mss?.category, 'reaction_zone');
assert.equal(mss?.draw.label, 'Bear Reaction Zone');

const displayStrict = feed.displayZones.find((zone) => zone.sourceKind === 'strict_15m_fvg');
assert.ok(displayStrict);
assert.equal(displayStrict?.lower, 7679.75);
assert.equal(displayStrict?.upper, 7683.5);
assert.equal(displayStrict?.state, 'defended');
assert.equal(displayStrict?.category, 'final_boss');

const displayMssBoss = feed.displayZones.find((zone) => zone.kind === 'final_boss_mss_zone' && zone.direction === 'SHORT');
assert.equal(displayMssBoss, undefined);

const farHistorical = feed.zones.find((zone) => zone.lower === 7636.5 && zone.upper === 7637);
assert.ok(farHistorical);
assert.equal(farHistorical?.bossRole, 'active_final_boss');
assert.equal(feed.displayZones.some((zone) => zone.id === farHistorical?.id), false);

const unflippedBearBelowPrice = feed.zones.find((zone) => zone.lower === 7672.25 && zone.upper === 7677.25);
assert.ok(unflippedBearBelowPrice);
assert.equal(unflippedBearBelowPrice?.direction, 'SHORT');
assert.equal(unflippedBearBelowPrice?.state, 'defended');
assert.equal(feed.displayZones.some((zone) => zone.id === unflippedBearBelowPrice?.id), false);

assert.equal(feed.finalBossZones.some((zone) => zone.sourceKind === 'strict_15m_fvg'), true);
assert.equal(feed.finalBossZones.some((zone) => zone.sourceKind === 'mss_protected_imbalance_origin' && zone.upper - zone.lower > 8), false);
assert.equal(feed.reactionZones.some((zone) => zone.sourceKind === 'mss_protected_imbalance_origin' && zone.direction === 'SHORT'), true);
assert.equal(feed.tradeBoxes.some((zone) => zone.sourceKind === 'strict_15m_fvg'), true);

const insideUnflippedBearFeed = buildScannerZoneFeed({
  deskState: {
    ...deskState,
    primaryDeskPlay: {
      ...deskState.primaryDeskPlay,
      retainedBossZones: {
        ...deskState.primaryDeskPlay.retainedBossZones,
        zones: [unflippedBearBelowPriceZone],
        finalBossMssZones: {
          bull: [],
          bear: [],
          primaryBull: null,
          primaryBear: null,
        },
      },
    },
  },
  instrument: 'MES',
  tradeDate: '2026-09-02',
  session: 'evening',
  completed5m: { time: '2026-09-02T21:45:00-04:00' },
  currentPrice: 7674.5,
  generatedAt: '2026-09-03T01:55:00.000Z',
});
assert.equal(insideUnflippedBearFeed.zones.length, 1);
assert.equal(insideUnflippedBearFeed.displayZones.length, 0);

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
  assert.equal(parsed.finalBossZones.length, written.finalBossZones.length);
  assert.equal(parsed.tradeBoxes.length, written.tradeBoxes.length);
  assert.equal(parsed.reactionZones.length, written.reactionZones.length);
  assert.equal(parsed.authorityBoundary.changesCanExecute, false);
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

console.log('scanner zone feed loopback test passed');
