import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRuntimeJsonAtomic } from '../runtimeJson';
import type {
  DeskFinalBossMssZone,
  DeskRetainedBossZone,
  DeskState,
} from '../../src/lib/localScannerEngine';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SCANNER_ZONE_FEED_DIR = path.join(__dirname, 'scanner-zone-feed');
export const SCANNER_ZONE_FEED_FILE = path.join(SCANNER_ZONE_FEED_DIR, 'quant-desk-scanner-zones.json');
export const SCANNER_ZONE_FEED_VERSION = 6;
const CLEAN_DESK_MAX_ZONES = 4;
const CLEAN_DESK_MAX_DISTANCE_POINTS = 18;

export type ScannerZoneFeedZoneKind =
  | 'retained_boss_zone'
  | 'active_mss_protected_boss_zone'
  | 'final_boss_mss_zone';
export type ScannerZoneFeedZoneCategory = 'final_boss' | 'trade_box' | 'reaction_zone' | 'debug';
export type ScannerZoneFeedReactionGrade = 'A+' | 'A' | 'B' | 'C' | null;

export interface ScannerZoneFeedZone {
  id: string;
  kind: ScannerZoneFeedZoneKind;
  category: ScannerZoneFeedZoneCategory;
  direction: 'LONG' | 'SHORT';
  sourceKind: string;
  sourceLabel: string;
  role: string;
  bossRole: string | null;
  lower: number;
  upper: number;
  midpoint: number;
  lineInSand: number;
  sourceTimeframe: '15M';
  formedAt: string | null;
  state: string;
  stateReason: string;
  use: string;
  invalidation: string;
  reactionGrade: ScannerZoneFeedReactionGrade;
  reactionConfidence: number;
  gradeReason: string;
  draw: {
    label: string;
    fill: string;
    outline: string;
    line: string;
    opacity: number;
  };
  authorityBoundary: {
    displayOnly: true;
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    placesOrders: false;
  };
}

export interface ScannerZoneFeed {
  sourceOfTruth: 'scanner_zone_overlay_feed';
  schemaVersion: typeof SCANNER_ZONE_FEED_VERSION;
  generatedAt: string;
  instrument: string;
  tradeDate: string;
  session: string;
  latestCompleted5m: string | null;
  currentPrice: number | null;
  primaryDeskPlay: {
    direction: DeskState['primaryDeskPlay']['direction'];
    lineInSand: number | null;
    longAbove: number | null;
    shortBelow: number | null;
    nextTrigger: string | null;
    invalidation: string | null;
    discordEligible: boolean;
    canExecute: boolean;
  };
  zones: ScannerZoneFeedZone[];
  finalBossZones: ScannerZoneFeedZone[];
  tradeBoxes: ScannerZoneFeedZone[];
  reactionZones: ScannerZoneFeedZone[];
  debugZones: ScannerZoneFeedZone[];
  displayZones: ScannerZoneFeedZone[];
  displayPolicy: {
    mode: 'clean_desk';
    maxZones: number;
    maxDistancePoints: number;
    hidesStates: string[];
    hidesKinds: ScannerZoneFeedZoneKind[];
    purpose: string;
  };
  summary: string;
  authorityBoundary: {
    displayOnly: true;
    scannerOwnsRules: true;
    ninjaTraderIndicatorOwnsRules: false;
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    placesOrders: false;
  };
}

function zoneWidth(zone: Pick<ScannerZoneFeedZone, 'lower' | 'upper'>): number {
  return Math.max(0, zone.upper - zone.lower);
}

function isInvalidOrExpiredState(state: string): boolean {
  return /invalid|expired/i.test(state);
}

function isFlippedReactionState(state: string): boolean {
  return /flipped|reaction/i.test(state);
}

function isUnflippedControlState(state: string): boolean {
  return /active_control|defended|pierced/i.test(state) && !isFlippedReactionState(state);
}

function isBroadMssOriginZone(zone: Pick<ScannerZoneFeedZone, 'sourceKind' | 'kind' | 'lower' | 'upper'>): boolean {
  return zone.sourceKind === 'mss_protected_imbalance_origin'
    && zone.kind === 'final_boss_mss_zone'
    && zoneWidth(zone) > 8;
}

function reactionConfidenceScore(zone: ScannerZoneFeedZone, price: number | null | undefined): number {
  if (isInvalidOrExpiredState(zone.state)) return 0;

  let score = 0;
  if (zone.kind === 'retained_boss_zone') score += 35;
  if (zone.kind === 'final_boss_mss_zone') score += 25;
  if (zone.role === 'final_boss_zone' || zone.role === 'final_boss_mss_zone') score += 20;
  if (zone.sourceKind === 'strict_15m_fvg') score += 25;
  if (/defended/i.test(zone.state)) score += 18;
  if (/active_control/i.test(zone.state)) score += 12;
  if (/pierced/i.test(zone.state)) score += 8;
  if (isFlippedReactionState(zone.state)) score -= 20;
  if (isBroadMssOriginZone(zone)) score -= 25;

  const distance = zoneDistanceToPrice(zone, price);
  if (distance === 0) score += 8;
  else if (distance <= 5) score += 6;
  else if (distance <= 10) score += 3;
  else score -= Math.min(12, distance / 4);

  return Math.max(0, Math.min(100, Math.round(score)));
}

function reactionGrade(score: number): ScannerZoneFeedReactionGrade {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score > 0) return 'C';
  return null;
}

function classifyZone(zone: ScannerZoneFeedZone): ScannerZoneFeedZoneCategory {
  if (isInvalidOrExpiredState(zone.state)) return 'debug';
  if (zone.bossRole === 'debug_only') return 'debug';
  if (zone.kind === 'active_mss_protected_boss_zone') return 'debug';
  if (zone.bossRole === 'flipped_reaction_boss') return 'reaction_zone';
  if (zone.bossRole === 'active_final_boss') return 'final_boss';
  if (isFlippedReactionState(zone.state)) return 'reaction_zone';
  if (isBroadMssOriginZone(zone)) return 'reaction_zone';
  if (zone.sourceKind === 'strict_15m_fvg' && /defended|active_control|pierced/i.test(zone.state)) {
    return 'final_boss';
  }
  if (zone.kind === 'retained_boss_zone' && /final_boss/i.test(zone.role)) return 'final_boss';
  if (zone.kind === 'final_boss_mss_zone' && zoneWidth(zone) <= 8) return 'final_boss';
  return 'reaction_zone';
}

function gradeReasonFor(zone: ScannerZoneFeedZone): string {
  if (isInvalidOrExpiredState(zone.state)) return 'Hidden from desk view because the zone is invalidated or expired.';
  if (zone.kind === 'active_mss_protected_boss_zone') {
    return 'Kept for debug because active MSS-protected origin zones are too noisy for default desk view.';
  }
  if (isFlippedReactionState(zone.state)) {
    return 'Kept as reaction context because prior boss control flipped.';
  }
  if (isBroadMssOriginZone(zone)) {
    return 'Kept as reaction context because the MSS-origin area is broad and not a clean strict FVG boss.';
  }
  if (zone.sourceKind === 'strict_15m_fvg') {
    return 'Clean strict 15M FVG retained as Final Boss context.';
  }
  return 'Retained scanner-owned zone; visible only when it remains useful map context.';
}

function enrichZone(zone: ScannerZoneFeedZone, price: number | null | undefined): ScannerZoneFeedZone {
  const reactionConfidence = reactionConfidenceScore(zone, price);
  const category = classifyZone(zone);
  const grade = category === 'debug' ? null : reactionGrade(reactionConfidence);
  const labelSide = zone.direction === 'LONG' ? 'Bull' : 'Bear';
  const labelByCategory: Record<ScannerZoneFeedZoneCategory, string> = {
    final_boss: `${labelSide} Final Boss`,
    trade_box: `${labelSide} Trade Box`,
    reaction_zone: `${labelSide} Reaction Zone`,
    debug: `${labelSide} Debug Zone`,
  };
  return {
    ...zone,
    category,
    reactionGrade: grade,
    reactionConfidence,
    gradeReason: gradeReasonFor(zone),
    draw: {
      ...zone.draw,
      label: labelByCategory[category],
      opacity: category === 'debug' ? 10 : zone.draw.opacity,
    },
  };
}

function cleanIdPart(value: unknown): string {
  return String(value ?? 'none')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.:-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'none';
}

function zoneDrawStyle(args: {
  direction: 'LONG' | 'SHORT';
  kind: ScannerZoneFeedZoneKind;
  state: string;
}): ScannerZoneFeedZone['draw'] {
  const isLong = args.direction === 'LONG';
  const isFinalBoss = args.kind === 'final_boss_mss_zone' || args.kind === 'active_mss_protected_boss_zone';
  const isFlipped = /flipped|reaction/i.test(args.state);
  const isInvalid = /invalid|expired/i.test(args.state);
  const base = isLong
    ? { fill: '#16a34a', outline: '#22c55e', line: '#86efac' }
    : { fill: '#dc2626', outline: '#f87171', line: '#fecaca' };
  const finalBoss = isLong
    ? { fill: '#facc15', outline: '#fde047', line: '#fef08a' }
    : { fill: '#a855f7', outline: '#c084fc', line: '#e9d5ff' };
  const reaction = { fill: '#f97316', outline: '#fb923c', line: '#fed7aa' };
  const muted = { fill: '#64748b', outline: '#94a3b8', line: '#cbd5e1' };
  const palette = isInvalid ? muted : isFlipped ? reaction : isFinalBoss ? finalBoss : base;
  return {
    label: isInvalid ? 'invalid/expired' : isFlipped ? 'reaction' : isFinalBoss ? 'final boss' : 'primary 15M FVG',
    fill: palette.fill,
    outline: palette.outline,
    line: palette.line,
    opacity: isInvalid ? 12 : isFlipped ? 18 : isFinalBoss ? 22 : 16,
  };
}

function retainedZoneToFeedZone(zone: DeskRetainedBossZone, kind: ScannerZoneFeedZoneKind): ScannerZoneFeedZone {
  const draw = zoneDrawStyle({ direction: zone.direction, kind, state: zone.state });
  const labelSide = zone.direction === 'LONG' ? 'Bull' : 'Bear';
  const labelRole = 'Final Boss';
  return {
    id: [
      kind,
      zone.direction,
      zone.sourceKind,
      zone.role,
      zone.lower,
      zone.upper,
      zone.formedAt,
    ].map(cleanIdPart).join(':'),
    kind,
    category: 'debug',
    direction: zone.direction,
    sourceKind: zone.sourceKind,
    sourceLabel: zone.sourceLabel,
    role: zone.role,
    bossRole: null,
    lower: zone.lower,
    upper: zone.upper,
    midpoint: zone.midpoint,
    lineInSand: zone.lineInSand,
    sourceTimeframe: zone.sourceTimeframe,
    formedAt: zone.formedAt,
    state: zone.state,
    stateReason: zone.stateReason,
    use: zone.use,
    invalidation: zone.invalidation,
    reactionGrade: null,
    reactionConfidence: 0,
    gradeReason: '',
    draw: {
      ...draw,
      label: `${labelSide} ${labelRole}`,
    },
    authorityBoundary: {
      displayOnly: true,
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      placesOrders: false,
    },
  };
}

function finalBossMssZoneToFeedZone(zone: DeskFinalBossMssZone): ScannerZoneFeedZone {
  const draw = zoneDrawStyle({ direction: zone.direction, kind: 'final_boss_mss_zone', state: zone.state });
  const labelSide = zone.direction === 'LONG' ? 'Bull' : 'Bear';
  return {
    id: [
      'final_boss_mss_zone',
      zone.direction,
      zone.sourceKind,
      zone.lower,
      zone.upper,
      zone.mssBreakAt,
    ].map(cleanIdPart).join(':'),
    kind: 'final_boss_mss_zone',
    category: 'debug',
    direction: zone.direction,
    sourceKind: zone.sourceKind,
    sourceLabel: zone.sourceLabel,
    role: zone.role,
    bossRole: zone.bossRole || null,
    lower: zone.lower,
    upper: zone.upper,
    midpoint: zone.midpoint,
    lineInSand: zone.lineInSand,
    sourceTimeframe: zone.sourceTimeframe,
    formedAt: zone.formedAt,
    state: zone.state,
    stateReason: zone.stateReason,
    use: zone.use,
    invalidation: zone.invalidation,
    reactionGrade: null,
    reactionConfidence: 0,
    gradeReason: '',
    draw: {
      ...draw,
      label: `${labelSide} Final Boss`,
    },
    authorityBoundary: {
      displayOnly: true,
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      placesOrders: false,
    },
  };
}

function uniqueZones(zones: ScannerZoneFeedZone[]): ScannerZoneFeedZone[] {
  const byId = new Map<string, ScannerZoneFeedZone>();
  for (const zone of zones) {
    if (!byId.has(zone.id)) byId.set(zone.id, zone);
  }
  return [...byId.values()].sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === 'LONG' ? -1 : 1;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.lower - b.lower || a.upper - b.upper;
  });
}

function isHiddenInDeskMode(zone: ScannerZoneFeedZone): boolean {
  return zone.category === 'debug';
}

function zoneDistanceToPrice(zone: ScannerZoneFeedZone, price: number | null | undefined): number {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 0;
  if (price >= zone.lower && price <= zone.upper) return 0;
  return Math.min(Math.abs(price - zone.lower), Math.abs(price - zone.upper));
}

function deskZonePriority(zone: ScannerZoneFeedZone, price: number | null | undefined): number {
  let priority = 0;
  if (zone.kind === 'active_mss_protected_boss_zone') priority += 100;
  if (zone.kind === 'final_boss_mss_zone') priority += 45;
  if (zone.kind === 'retained_boss_zone') priority += 75;
  if (zone.role === 'active_mss_protected_boss_zone') priority += 15;
  if (zone.role === 'final_boss_mss_zone') priority += 10;
  if (zone.role === 'final_boss_zone') priority += 8;
  if (zone.sourceKind === 'strict_15m_fvg') priority += 8;
  if (zone.category === 'final_boss') priority += 35;
  if (zone.category === 'trade_box') priority += 20;
  if (zone.category === 'reaction_zone') priority -= 10;
  if (zone.sourceKind === 'mss_protected_imbalance_origin' && zone.kind !== 'final_boss_mss_zone') priority -= 35;
  if (/defended/i.test(zone.state)) priority += 10;
  if (/active_control/i.test(zone.state)) priority += 8;
  if (/flipped_reaction/i.test(zone.state)) priority -= 8;
  priority -= Math.min(20, zoneDistanceToPrice(zone, price) / 2);
  return priority;
}

function buildZoneBuckets(
  zones: ScannerZoneFeedZone[],
  price: number | null | undefined,
): Pick<ScannerZoneFeed, 'finalBossZones' | 'tradeBoxes' | 'reactionZones' | 'debugZones'> {
  const finalBossZones = buildDisplayZones(
    zones.filter((zone) => zone.category === 'final_boss'),
    price,
    6,
  );
  const reactionZones = buildDisplayZones(
    zones.filter((zone) => zone.category === 'reaction_zone'),
    price,
    6,
  );
  const tradeBoxes = buildDisplayZones(
    zones.filter((zone) => zone.category !== 'debug' && (zone.reactionGrade === 'A+' || zone.reactionGrade === 'A')),
    price,
    6,
  );
  const debugZones = zones.filter((zone) => zone.category === 'debug');
  return { finalBossZones, tradeBoxes, reactionZones, debugZones };
}

function zonesOverlap(a: ScannerZoneFeedZone, b: ScannerZoneFeedZone): boolean {
  if (a.direction !== b.direction) return false;
  return Math.max(a.lower, b.lower) <= Math.min(a.upper, b.upper);
}

function betterDeskZone(
  a: ScannerZoneFeedZone,
  b: ScannerZoneFeedZone,
  price: number | null | undefined,
): ScannerZoneFeedZone {
  const aPriority = deskZonePriority(a, price);
  const bPriority = deskZonePriority(b, price);
  if (aPriority !== bPriority) return aPriority > bPriority ? a : b;

  const aWidth = a.upper - a.lower;
  const bWidth = b.upper - b.lower;
  if (aWidth !== bWidth) return aWidth > bWidth ? a : b;

  return a.formedAt && b.formedAt && a.formedAt > b.formedAt ? a : b;
}

function buildDisplayZones(
  zones: ScannerZoneFeedZone[],
  price: number | null | undefined,
  maxZones = 6,
): ScannerZoneFeedZone[] {
  const candidates = zones.filter((zone) => !isHiddenInDeskMode(zone));
  const collapsed: ScannerZoneFeedZone[] = [];

  for (const zone of candidates) {
    const overlapIndex = collapsed.findIndex((existing) => zonesOverlap(existing, zone));
    if (overlapIndex === -1) {
      collapsed.push(zone);
      continue;
    }
    collapsed[overlapIndex] = betterDeskZone(collapsed[overlapIndex], zone, price);
  }

  return collapsed
    .sort((a, b) => {
      const priorityDelta = deskZonePriority(b, price) - deskZonePriority(a, price);
      if (Math.abs(priorityDelta) > 0.0001) return priorityDelta;
      return zoneDistanceToPrice(a, price) - zoneDistanceToPrice(b, price);
    })
    .slice(0, maxZones)
    .sort((a, b) => b.upper - a.upper || b.lower - a.lower);
}

function isWithinCleanDeskDistance(zone: ScannerZoneFeedZone, price: number | null | undefined): boolean {
  if (typeof price !== 'number' || !Number.isFinite(price)) return true;
  return zoneDistanceToPrice(zone, price) <= CLEAN_DESK_MAX_DISTANCE_POINTS;
}

function nearestZone(
  zones: ScannerZoneFeedZone[],
  price: number | null | undefined,
  direction: 'LONG' | 'SHORT',
): ScannerZoneFeedZone | null {
  const candidates = zones
    .filter((zone) => zone.direction === direction)
    .filter((zone) => zone.category === 'final_boss' || zone.category === 'trade_box')
    .filter((zone) => isWithinCleanDeskDistance(zone, price));

  if (typeof price === 'number' && Number.isFinite(price)) {
    const sided = candidates.filter((zone) =>
      direction === 'LONG'
        ? zone.lower <= price
        : zone.upper >= price,
    );
    if (sided.length > 0) {
      return sided.sort((a, b) => {
        const distanceDelta = zoneDistanceToPrice(a, price) - zoneDistanceToPrice(b, price);
        if (Math.abs(distanceDelta) > 0.0001) return distanceDelta;
        return deskZonePriority(b, price) - deskZonePriority(a, price);
      })[0] || null;
    }
  }

  return candidates.sort((a, b) => {
    const distanceDelta = zoneDistanceToPrice(a, price) - zoneDistanceToPrice(b, price);
    if (Math.abs(distanceDelta) > 0.0001) return distanceDelta;
    return deskZonePriority(b, price) - deskZonePriority(a, price);
  })[0] || null;
}

function buildCleanDeskDisplayZones(
  zones: ScannerZoneFeedZone[],
  price: number | null | undefined,
): ScannerZoneFeedZone[] {
  const visible = zones.filter((zone) => !isHiddenInDeskMode(zone));
  const selected = new Map<string, ScannerZoneFeedZone>();
  const add = (zone: ScannerZoneFeedZone | null | undefined) => {
    if (!zone || !isWithinCleanDeskDistance(zone, price)) return;
    selected.set(zone.id, zone);
  };

  const cleanSideZones = visible.filter((zone) => {
    if (typeof price !== 'number' || !Number.isFinite(price)) return true;
    if (!isUnflippedControlState(zone.state)) return true;
    return zone.direction === 'LONG'
      ? zone.lower <= price
      : zone.upper >= price;
  });

  add(nearestZone(cleanSideZones, price, 'SHORT'));
  add(nearestZone(cleanSideZones, price, 'LONG'));

  for (const zone of visible) {
    if (zone.kind !== 'final_boss_mss_zone') continue;
    if (zone.bossRole !== 'active_final_boss' && zone.bossRole !== 'flipped_reaction_boss') continue;
    if (
      typeof price === 'number'
      && Number.isFinite(price)
      && isUnflippedControlState(zone.state)
      && ((zone.direction === 'LONG' && zone.lower > price) || (zone.direction === 'SHORT' && zone.upper < price))
    ) {
      continue;
    }
    add(zone);
  }

  return buildDisplayZones([...selected.values()], price, CLEAN_DESK_MAX_ZONES);
}

export function buildScannerZoneFeed(args: {
  deskState: DeskState;
  instrument: string;
  tradeDate: string;
  session: string;
  completed5m?: Pick<NinjaBridgeBar, 'time'> | null;
  currentPrice?: number | null;
  generatedAt?: string;
}): ScannerZoneFeed {
  const play = args.deskState.primaryDeskPlay;
  const ledger = play.retainedBossZones;
  const zones: ScannerZoneFeedZone[] = [];
  for (const zone of ledger?.zones || []) {
    zones.push(retainedZoneToFeedZone(zone, 'retained_boss_zone'));
  }
  if (ledger?.activeMssProtectedBossZone) {
    zones.push(retainedZoneToFeedZone(ledger.activeMssProtectedBossZone, 'active_mss_protected_boss_zone'));
  }
  for (const zone of ledger?.finalBossMssZones?.bull || []) zones.push(finalBossMssZoneToFeedZone(zone));
  for (const zone of ledger?.finalBossMssZones?.bear || []) zones.push(finalBossMssZoneToFeedZone(zone));

  const feedZones = uniqueZones(zones).map((zone) => enrichZone(zone, args.currentPrice));
  const buckets = buildZoneBuckets(feedZones, args.currentPrice);
  const displayZones = buildDisplayZones(
    buildCleanDeskDisplayZones([...buckets.finalBossZones, ...buckets.tradeBoxes], args.currentPrice),
    args.currentPrice,
    CLEAN_DESK_MAX_ZONES,
  );
  return {
    sourceOfTruth: 'scanner_zone_overlay_feed',
    schemaVersion: SCANNER_ZONE_FEED_VERSION,
    generatedAt: args.generatedAt || new Date().toISOString(),
    instrument: args.instrument,
    tradeDate: args.tradeDate,
    session: args.session,
    latestCompleted5m: args.completed5m?.time || null,
    currentPrice: args.currentPrice ?? null,
    primaryDeskPlay: {
      direction: play.direction,
      lineInSand: play.lineInSand,
      longAbove: play.longAbove,
      shortBelow: play.shortBelow,
      nextTrigger: play.nextTrigger,
      invalidation: play.invalidation,
      discordEligible: play.discordEligible,
      canExecute: args.deskState.canExecute,
    },
    zones: feedZones,
    finalBossZones: buckets.finalBossZones,
    tradeBoxes: buckets.tradeBoxes,
    reactionZones: buckets.reactionZones,
    debugZones: buckets.debugZones,
    displayZones,
    displayPolicy: {
      mode: 'clean_desk',
      maxZones: CLEAN_DESK_MAX_ZONES,
      maxDistancePoints: CLEAN_DESK_MAX_DISTANCE_POINTS,
      hidesStates: ['invalidated', 'expired'],
      hidesKinds: ['active_mss_protected_boss_zone'],
      purpose: 'Show the current battlefield only: nearest overhead bear boss, nearest under-price bull boss, and nearby active MSS-created boss zones. Full retained memory remains available in zones/debug arrays for audit.',
    },
    summary: feedZones.length
      ? `Scanner overlay feed exported ${displayZones.length}/${feedZones.length} desk-visible zone(s): ${buckets.finalBossZones.length} final boss, ${buckets.tradeBoxes.length} trade box, ${buckets.reactionZones.length} reaction. NinjaTrader display is read-only.`
      : 'Scanner overlay feed has no active 15M boss/FVG zones to display.',
    authorityBoundary: {
      displayOnly: true,
      scannerOwnsRules: true,
      ninjaTraderIndicatorOwnsRules: false,
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      placesOrders: false,
    },
  };
}

export async function writeScannerZoneFeed(args: {
  deskState: DeskState;
  instrument: string;
  tradeDate: string;
  session: string;
  completed5m?: Pick<NinjaBridgeBar, 'time'> | null;
  currentPrice?: number | null;
  filePath?: string;
}): Promise<ScannerZoneFeed> {
  const feed = buildScannerZoneFeed(args);
  await writeRuntimeJsonAtomic(args.filePath || SCANNER_ZONE_FEED_FILE, feed);
  return feed;
}
