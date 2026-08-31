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
export const SCANNER_ZONE_FEED_VERSION = 1;

export type ScannerZoneFeedZoneKind =
  | 'retained_boss_zone'
  | 'active_mss_protected_boss_zone'
  | 'final_boss_mss_zone';

export interface ScannerZoneFeedZone {
  id: string;
  kind: ScannerZoneFeedZoneKind;
  direction: 'LONG' | 'SHORT';
  sourceKind: string;
  sourceLabel: string;
  role: string;
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
  const labelRole = kind === 'active_mss_protected_boss_zone'
    ? 'Active MSS Boss'
    : 'Final Boss';
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
    direction: zone.direction,
    sourceKind: zone.sourceKind,
    sourceLabel: zone.sourceLabel,
    role: zone.role,
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
    draw: {
      ...draw,
      label: `${labelSide} ${labelRole} (${zone.sourceLabel})`,
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
    direction: zone.direction,
    sourceKind: zone.sourceKind,
    sourceLabel: zone.sourceLabel,
    role: zone.role,
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
    draw: {
      ...draw,
      label: `${labelSide} Final Boss Shift (${zone.sourceLabel})`,
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

  const feedZones = uniqueZones(zones);
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
    summary: feedZones.length
      ? `Scanner overlay feed exported ${feedZones.length} 15M boss/FVG zone(s). NinjaTrader display is read-only.`
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
