import { TRADE_RULES } from '../config/tradeRules';
import { ExecutionStatus, NoTradeReason, SetupCandidate, TargetObjective, TradeDecisionStatus } from '../types';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

export type ScannerState =
  | 'NoData'
  | 'MapReady'
  | 'Watching'
  | 'TriggerPending'
  | 'Conditional'
  | 'Executable'
  | 'Approved'
  | 'Blocked'
  | 'Missed'
  | 'NoTrade';

export type ScannerWindowQuality = 'observe_only' | 'approved' | 'strict' | 'disabled' | 'outside';
export type ScannerSession = 'premarket' | 'morning' | 'lunch' | 'afternoon' | 'outside';
export type BridgeTimestampMode = 'open' | 'close';
export type BridgeTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';

export interface ScannerWindowState {
  session: ScannerSession;
  label: string;
  quality: ScannerWindowQuality;
  enabled: boolean;
  allowsTradePlan: boolean;
  allowsDiscordAlert: boolean;
  nextWindowLabel: string | null;
}

export interface ScannerThresholds {
  conditional: number;
  executable: number;
  educationalBlocked: number;
}

export interface ScannerRiskGuards {
  maxChaseDistancePoints: number;
  maxChaseDistanceR: number;
  staleSetupMaxCandles: number;
  targetAlreadySweptLookbackCandles: number;
  allowRetestOnlyEntries: boolean;
}

export interface ScannerConfidenceBreakdown {
  score: number;
  qualifiedReasons: string[];
  missingReasons: string[];
}

export interface StaleChaseResult {
  state: ScannerState;
  stale: boolean;
  reason: string | null;
}

export interface BridgeBarStalenessResult {
  stale: boolean;
  latestTime: string | null;
  ageMinutes: number | null;
  maxAllowedMinutes: number;
  reason: string | null;
}

export interface TargetCascadeResult {
  activeTarget: TargetObjective | null;
  activeTimeframe: string | null;
  sweptTargets: TargetObjective[];
  promotedTarget: TargetObjective | null;
  path: string[];
  targetRoomPoor: boolean;
  reason: string;
}

export interface ScannerAlertDecision {
  shouldSend: boolean;
  reason: string;
}

const DEFAULT_THRESHOLDS: ScannerThresholds = TRADE_RULES.discordAlertThresholds;

export const DEFAULT_SCANNER_RISK_GUARDS: ScannerRiskGuards = {
  maxChaseDistancePoints: 3,
  maxChaseDistanceR: 0.5,
  staleSetupMaxCandles: 3,
  targetAlreadySweptLookbackCandles: 8,
  allowRetestOnlyEntries: true,
};

function etParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  };
}

function minutesFromClock(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function etClockMinutes(date: Date): number {
  const parts = etParts(date);
  return parts.hour * 60 + parts.minute;
}

function isBetween(value: number, start: string, end: string): boolean {
  return value >= minutesFromClock(start) && value < minutesFromClock(end);
}

export function getScannerTradeDate(date = new Date()): string {
  const parts = etParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function resolveScannerWindow(date = new Date(), afternoonEnabled = false): ScannerWindowState {
  const minutes = etClockMinutes(date);
  const windows = TRADE_RULES.executionWindows;

  if (isBetween(minutes, windows.openingObservation.startET, windows.openingObservation.endET)) {
    return {
      session: 'premarket',
      label: windows.openingObservation.label,
      quality: 'observe_only',
      enabled: windows.openingObservation.enabled,
      allowsTradePlan: false,
      allowsDiscordAlert: false,
      nextWindowLabel: windows.morningExecution.label,
    };
  }

  if (isBetween(minutes, windows.morningExecution.startET, windows.morningExecution.endET)) {
    return {
      session: 'morning',
      label: windows.morningExecution.label,
      quality: 'approved',
      enabled: windows.morningExecution.enabled,
      allowsTradePlan: windows.morningExecution.enabled,
      allowsDiscordAlert: windows.morningExecution.enabled,
      nextWindowLabel: windows.middayTrapReversal.label,
    };
  }

  if (isBetween(minutes, windows.middayTrapReversal.startET, windows.middayTrapReversal.endET)) {
    return {
      session: 'lunch',
      label: windows.middayTrapReversal.label,
      quality: 'strict',
      enabled: windows.middayTrapReversal.enabled,
      allowsTradePlan: windows.middayTrapReversal.enabled,
      allowsDiscordAlert: windows.middayTrapReversal.enabled,
      nextWindowLabel: afternoonEnabled ? windows.afternoonExecution.label : null,
    };
  }

  const afternoonActive = isBetween(minutes, windows.afternoonExecution.startET, windows.afternoonExecution.endET);
  if (afternoonActive) {
    return {
      session: 'afternoon',
      label: windows.afternoonExecution.label,
      quality: windows.afternoonExecution.enabled && afternoonEnabled ? 'approved' : 'disabled',
      enabled: windows.afternoonExecution.enabled && afternoonEnabled,
      allowsTradePlan: windows.afternoonExecution.enabled && afternoonEnabled,
      allowsDiscordAlert: windows.afternoonExecution.enabled && afternoonEnabled,
      nextWindowLabel: null,
    };
  }

  return {
    session: 'outside',
    label: 'Outside Approved Execution Window',
    quality: 'outside',
    enabled: false,
    allowsTradePlan: false,
    allowsDiscordAlert: false,
    nextWindowLabel:
      minutes < minutesFromClock(windows.openingObservation.startET)
        ? windows.openingObservation.label
        : minutes < minutesFromClock(windows.morningExecution.startET)
          ? windows.morningExecution.label
          : minutes < minutesFromClock(windows.middayTrapReversal.startET)
            ? windows.middayTrapReversal.label
            : null,
  };
}

const BRIDGE_TIME_ZONES: Record<Exclude<BridgeTimeZoneMode, 'local'>, string> = {
  eastern: 'America/New_York',
  central: 'America/Chicago',
  pacific: 'America/Los_Angeles',
};

function timeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return (zonedAsUtc - date.getTime()) / 60_000;
}

function parseWallClockInTimeZone(value: string, timeZone: string): Date | null {
  const cleaned = value.replace(/\.\d+/, '');
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const wallAsUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  const offset = timeZoneOffsetMinutes(timeZone, wallAsUtc);
  const date = new Date(wallAsUtc.getTime() - offset * 60_000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseBridgeTime(value: string, timeZoneMode: BridgeTimeZoneMode = 'eastern'): Date | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (!trimmed.includes('Z') && !/[+-]\d\d:\d\d$/.test(trimmed)) {
    if (timeZoneMode === 'local') {
      const localDate = new Date(trimmed.replace(/\.\d+/, ''));
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
    return parseWallClockInTimeZone(trimmed, BRIDGE_TIME_ZONES[timeZoneMode]);
  }
  const normalized = trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function completedAtMs(bar: NinjaBridgeBar, timeframeMinutes: number, timestampMode: BridgeTimestampMode, timeZoneMode: BridgeTimeZoneMode): number | null {
  const parsed = parseBridgeTime(bar.time, timeZoneMode);
  if (!parsed) return null;
  return timestampMode === 'close'
    ? parsed.getTime()
    : parsed.getTime() + timeframeMinutes * 60_000;
}

export function latestCompletedBar(
  bars: NinjaBridgeBar[],
  timeframeMinutes: number,
  now = new Date(),
  timestampMode: BridgeTimestampMode = 'close',
  timeZoneMode: BridgeTimeZoneMode = 'eastern'
): NinjaBridgeBar | null {
  const completed = bars.filter((bar) => {
    const completedAt = completedAtMs(bar, timeframeMinutes, timestampMode, timeZoneMode);
    if (completedAt === null) return true;
    return completedAt <= now.getTime();
  });
  return completed[completed.length - 1] || null;
}

export function assessBridgeBarStaleness(args: {
  latestBar: NinjaBridgeBar | null;
  timeframeMinutes: number;
  now?: Date;
  maxStaleBarMinutes?: number;
  timestampMode?: BridgeTimestampMode;
  timeZoneMode?: BridgeTimeZoneMode;
}): BridgeBarStalenessResult {
  const now = args.now || new Date();
  const maxAllowedMinutes = args.maxStaleBarMinutes ?? 10;
  const timestampMode = args.timestampMode || 'close';
  const timeZoneMode = args.timeZoneMode || 'eastern';
  if (!args.latestBar) {
    return {
      stale: true,
      latestTime: null,
      ageMinutes: null,
      maxAllowedMinutes,
      reason: 'No completed 5M candle returned from NinjaTrader. Confirm NinjaTrader is open, connected, and the MES chart is receiving current data.',
    };
  }

  const completedAt = completedAtMs(args.latestBar, args.timeframeMinutes, timestampMode, timeZoneMode);
  if (completedAt === null) {
    return {
      stale: true,
      latestTime: args.latestBar.time,
      ageMinutes: null,
      maxAllowedMinutes,
      reason: `Latest NinjaTrader candle time could not be parsed (${args.latestBar.time}). Restart Quant Desk Live after NinjaTrader is current.`,
    };
  }

  const ageMinutes = Math.max(0, (now.getTime() - completedAt) / 60_000);
  if (ageMinutes > maxAllowedMinutes) {
    return {
      stale: true,
      latestTime: args.latestBar.time,
      ageMinutes,
      maxAllowedMinutes,
      reason: `NinjaTrader bridge is reachable, but latest completed ${args.timeframeMinutes}M candle is stale (${args.latestBar.time}, ${ageMinutes.toFixed(1)} minutes old, timezone=${timeZoneMode}). Start/refresh NinjaTrader first, confirm live data, then restart Quant Desk Live.`,
    };
  }

  return {
    stale: false,
    latestTime: args.latestBar.time,
    ageMinutes,
    maxAllowedMinutes,
    reason: null,
  };
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function directionSign(direction: SetupCandidate['direction']): number {
  return direction === 'LONG' ? 1 : direction === 'SHORT' ? -1 : 0;
}

function confidencePoints(candidate: SetupCandidate): number {
  if (candidate.confidence === 'High') return 12;
  if (candidate.confidence === 'Medium') return 7;
  return 0;
}

export function scoreScannerCandidate(args: {
  candidate: SetupCandidate | null;
  window: ScannerWindowState;
  currentPrice?: number | null;
  higherTimeframeAligned?: boolean;
}): ScannerConfidenceBreakdown {
  const qualifiedReasons: string[] = [];
  const missingReasons: string[] = [];
  let score = 0;
  const candidate = args.candidate;

  const add = (condition: boolean, points: number, good: string, missing: string) => {
    if (condition) {
      score += points;
      qualifiedReasons.push(good);
    } else {
      missingReasons.push(missing);
    }
  };

  add(args.window.allowsTradePlan, 10, `valid ${args.window.label}`, 'not inside an approved execution window');
  add(Boolean(candidate), 15, 'major reference level identified', 'no candidate/reference level');
  add(Boolean(candidate?.evidence?.length), 10, 'price interaction evidence present', 'no price interaction evidence');
  add(
    candidate?.executionStatus === ExecutionStatus.Executable || candidate?.executionStatus === ExecutionStatus.Conditional,
    15,
    'sweep/failure/reclaim condition is active',
    'sweep/failure/reclaim condition not confirmed'
  );
  add(
    Boolean(candidate?.evidence?.some((item) => /expansion|impulse|structure|break/i.test(item))),
    15,
    'expansion or local structure evidence present',
    'no expansion or local structure break evidence'
  );
  add(Boolean(candidate?.requiredTrigger), 10, 'preferred retest/trigger zone defined', 'preferred retest/trigger zone missing');
  add(
    Boolean(candidate && candidate.blockReason !== NoTradeReason.EntryTriggerPending && candidate.blockReason !== NoTradeReason.EntryTriggerMissing),
    5,
    'completed 5M trigger is no longer pending',
    'completed 5M trigger still pending'
  );
  add(isValidPrice(candidate?.stop), 10, 'structure stop defined', 'structure stop missing');
  add(
    isValidPrice(candidate?.riskPoints) && (candidate?.riskPoints || 0) <= TRADE_RULES.maxRiskPoints,
    10,
    'actual risk within limit',
    'actual risk missing or outside limit'
  );
  add(Boolean(candidate?.target1 && candidate?.target2), 10, 'target room mapped', 'target room not mapped');
  add(Boolean(args.higherTimeframeAligned || candidate?.levelContextScore), 5, 'higher-timeframe/session context supports plan', 'higher-timeframe support not confirmed');

  if (candidate) score += confidencePoints(candidate);
  return { score: Math.max(0, Math.min(100, Math.round(score))), qualifiedReasons, missingReasons };
}

export function applyStaleChaseGuard(args: {
  candidate: SetupCandidate | null;
  currentPrice?: number | null;
  guards?: Partial<ScannerRiskGuards>;
}): StaleChaseResult {
  const candidate = args.candidate;
  const currentPrice = args.currentPrice;
  const guards = { ...DEFAULT_SCANNER_RISK_GUARDS, ...(args.guards || {}) };
  if (!candidate || !isValidPrice(currentPrice) || !isValidPrice(candidate.entry) || candidate.direction === 'NO TRADE') {
    return { state: candidate ? 'Conditional' : 'NoTrade', stale: false, reason: null };
  }
  const sign = directionSign(candidate.direction);
  const movedPastEntry = (currentPrice - candidate.entry) * sign;
  const risk = isValidPrice(candidate.riskPoints) ? candidate.riskPoints : isValidPrice(candidate.stop) ? Math.abs(candidate.entry - candidate.stop) : null;
  const maxRDistance = risk ? risk * guards.maxChaseDistanceR : Number.POSITIVE_INFINITY;
  const chaseDistance = Math.min(guards.maxChaseDistancePoints, maxRDistance);

  if (guards.allowRetestOnlyEntries && movedPastEntry > chaseDistance) {
    return {
      state: 'Missed',
      stale: true,
      reason: 'Preferred entry was missed. Do not chase. Waiting for new retest or next setup.',
    };
  }

  if (isValidPrice(candidate.target1)) {
    const distanceToEntry = Math.abs(currentPrice - candidate.entry);
    const distanceToT1 = Math.abs(candidate.target1 - currentPrice);
    if (distanceToT1 < distanceToEntry) {
      return {
        state: 'Missed',
        stale: true,
        reason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
      };
    }
  }

  return { state: 'Conditional', stale: false, reason: null };
}

function timeframeRank(source: TargetObjective['source']): number {
  if (source === 'ninjatrader' || source === 'app') return 4;
  if (source === 'full_context' || source === 'prior_eth' || source === 'previous_rth') return 4;
  if (source === 'asian' || source === 'london' || source === 'ny_premarket') return 3;
  if (source === 'rth_morning' || source === 'lunch') return 2;
  return 1;
}

function hasTargetBeenSwept(target: TargetObjective, bars: NinjaBridgeBar[], direction: SetupCandidate['direction']): boolean {
  if (direction === 'LONG') return bars.some((bar) => bar.high >= target.price);
  if (direction === 'SHORT') return bars.some((bar) => bar.low <= target.price);
  return false;
}

export function buildTargetCascade(args: {
  candidate: SetupCandidate | null;
  objectives?: TargetObjective[];
  recentBars?: NinjaBridgeBar[];
  lookbackCandles?: number;
}): TargetCascadeResult {
  const candidate = args.candidate;
  const objectives = (args.objectives || candidate?.targetObjectivePlan?.objectives || [])
    .filter((objective) => candidate?.direction === objective.direction)
    .sort((a, b) => {
      const rankDiff = timeframeRank(a.source) - timeframeRank(b.source);
      if (rankDiff !== 0) return rankDiff;
      const distanceA = a.distancePoints ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distancePoints ?? Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) return distanceA - distanceB;
      return b.score - a.score;
    });
  const recentBars = (args.recentBars || []).slice(-(args.lookbackCandles || DEFAULT_SCANNER_RISK_GUARDS.targetAlreadySweptLookbackCandles));

  if (!candidate || !objectives.length) {
    return {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['No directional target map available.'],
      targetRoomPoor: true,
      reason: 'No valid target exists with acceptable reward/risk.',
    };
  }

  const sweptTargets: TargetObjective[] = [];
  const path: string[] = [];
  let activeTarget: TargetObjective | null = null;

  for (const objective of objectives) {
    if (hasTargetBeenSwept(objective, recentBars, candidate.direction)) {
      sweptTargets.push(objective);
      path.push(`${objective.label} at ${objective.price} already swept; promoting next objective.`);
      continue;
    }
    activeTarget = objective;
    path.push(`${objective.label} at ${objective.price} selected as active target.`);
    break;
  }

  if (!activeTarget) {
    return {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets,
      promotedTarget: null,
      path,
      targetRoomPoor: true,
      reason: 'All mapped objectives in this direction were already swept.',
    };
  }

  const targetRoomPoor = Boolean(activeTarget.rMultiple !== null && activeTarget.rMultiple !== undefined && activeTarget.rMultiple < 1);
  return {
    activeTarget,
    activeTimeframe: String(activeTarget.source),
    sweptTargets,
    promotedTarget: sweptTargets.length ? activeTarget : null,
    path,
    targetRoomPoor,
    reason: targetRoomPoor
      ? 'Promoted target is too close to justify actual risk.'
      : `Target cascade selected ${activeTarget.label} from ${activeTarget.source}.`,
  };
}

export function scannerStateFromDecision(args: {
  decisionStatus?: TradeDecisionStatus | null;
  candidate?: SetupCandidate | null;
  stale?: StaleChaseResult | null;
  targetCascade?: TargetCascadeResult | null;
}): ScannerState {
  if (args.stale?.stale) return 'Missed';
  if (args.targetCascade?.targetRoomPoor) return 'Blocked';
  if (args.decisionStatus === TradeDecisionStatus.ApprovedTrade) return 'Approved';
  if (args.decisionStatus === TradeDecisionStatus.ConditionalTrade) return 'Conditional';
  if (args.decisionStatus === TradeDecisionStatus.Wait) return args.candidate ? 'Conditional' : 'Watching';
  if (args.decisionStatus === TradeDecisionStatus.NoTrade) return args.candidate ? 'Blocked' : 'NoTrade';
  if (args.decisionStatus === TradeDecisionStatus.OutsideRules) return 'MapReady';
  return args.candidate ? 'Watching' : 'MapReady';
}

export function shouldSendScannerAlert(args: {
  state: ScannerState;
  confidence: number;
  window: ScannerWindowState;
  candidate?: SetupCandidate | null;
  thresholds?: Partial<ScannerThresholds>;
  stale?: boolean;
  duplicate?: boolean;
  stateImproved?: boolean;
}): ScannerAlertDecision {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(args.thresholds || {}) };
  if (!args.window.allowsDiscordAlert) {
    return { shouldSend: false, reason: 'Outside approved alert window. Context updated only.' };
  }
  if (args.duplicate && !args.stateImproved) {
    return { shouldSend: false, reason: 'Duplicate alert suppressed for same setup/reference/direction/state.' };
  }
  if (args.state === 'Watching' || args.state === 'MapReady' || args.state === 'NoData') {
    return { shouldSend: false, reason: `${args.state} is logged locally but not sent to Discord by default.` };
  }
  if (args.state === 'Missed') {
    return args.confidence >= thresholds.educationalBlocked
      ? { shouldSend: true, reason: 'Missed preferred retest qualifies for RAG/journal learning alert.' }
      : { shouldSend: false, reason: 'Missed setup below educational alert threshold.' };
  }
  if (args.state === 'Blocked') {
    const educational =
      args.candidate?.blockReason === NoTradeReason.RiskTooWide ||
      args.candidate?.blockReason === NoTradeReason.TargetsUnavailable ||
      args.stale;
    return educational && args.confidence >= thresholds.educationalBlocked
      ? { shouldSend: true, reason: 'Educational blocked setup qualified for one Discord alert.' }
      : { shouldSend: false, reason: 'Blocked setup did not meet educational Discord threshold.' };
  }
  if (args.state === 'Conditional') {
    return args.confidence >= thresholds.conditional
      ? { shouldSend: true, reason: 'High-confidence conditional plan qualified for Discord.' }
      : { shouldSend: false, reason: 'Conditional plan below Discord threshold.' };
  }
  if (args.state === 'Executable' || args.state === 'Approved') {
    return args.confidence >= thresholds.executable
      ? { shouldSend: true, reason: 'Executable/approved plan qualified for Discord.' }
      : { shouldSend: false, reason: 'Executable/approved plan below Discord threshold.' };
  }
  return { shouldSend: false, reason: 'No actionable scanner alert.' };
}

export function scannerAlertKey(args: {
  tradeDate: string;
  instrument: string;
  session: ScannerSession;
  candidate?: SetupCandidate | null;
  state: ScannerState;
}): string {
  const candidate = args.candidate;
  const reference =
    candidate?.entry ||
    candidate?.stop ||
    candidate?.requiredTrigger ||
    'no-reference';
  return [
    args.tradeDate,
    args.instrument,
    args.session,
    candidate?.direction || 'NONE',
    candidate?.setupType || 'NoSetup',
    reference,
    args.state,
  ].join('|');
}
