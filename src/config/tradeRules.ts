import { NoTradeReason, SetupType } from '../types';
import { SYSTEM_RULES } from '../constants';

export const TRADE_RULES = {
  instruments: ['MES', 'MNQ'] as const,
  fixedRiskPoints: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
  maxRiskPoints: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
  preferredRiskPoints: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
  targetModel: {
    t1R: 1.5,
    t2R: 2.0,
    tickSize: 0.25,
  },
  stopQuality: {
    minimumPracticalRiskPoints: {
      MES: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
      MNQ: 12,
    },
  },
  sessions: {
    morning: {
      label: 'Morning Analysis',
      requiredScreenshotRange: '9:30 AM through the 10:10 AM candle',
      allowedSetups: [
        SetupType.OrderBlock618,
        SetupType.LiquiditySweep,
        SetupType.MomentumRunaway,
        SetupType.FairValueGap,
        SetupType.FvgImbalancePullback,
        SetupType.MarketStructureShift,
        SetupType.OpeningOrderBlock,
        SetupType.EqualHighsLows,
        SetupType.InitialBalanceExtension,
        SetupType.PreviousDaySweep,
        SetupType.CompressionBreakout,
        SetupType.OpeningGapFill,
        SetupType.BreakerBlock,
        SetupType.AlgoKillZone,
        SetupType.MitigationBlock,
        SetupType.MomentumPullbackBreatherReclaim,
        SetupType.MorningFailedHighLiquidityRejection,
        SetupType.MorningReclaimLong,
      ],
    },
    lunch: {
      label: 'Lunch Reversal',
      requiredScreenshotRange: '11:50 AM through 1:00 PM ET',
      allowedSetups: [
        SetupType.LiquiditySweep,
        SetupType.MomentumRunaway,
        SetupType.FairValueGap,
        SetupType.FvgImbalancePullback,
        SetupType.MarketStructureShift,
        SetupType.EqualHighsLows,
        SetupType.PreviousDaySweep,
        SetupType.CompressionBreakout,
        SetupType.BreakerBlock,
        SetupType.AlgoKillZone,
        SetupType.MitigationBlock,
        SetupType.MomentumPullbackBreatherReclaim,
        SetupType.LunchFailedHighReversal,
        SetupType.LunchFailedLowReversal,
        SetupType.LunchCompressionBreakout,
        SetupType.LunchFailedContinuation,
        SetupType.LunchRangeReclaim,
      ],
    },
  },
  noTradeSeverity: {
    [NoTradeReason.InvalidScreenshot]: 'hard',
    [NoTradeReason.OutsideTimeWindow]: 'hard',
    [NoTradeReason.MissingInstrument]: 'hard',
    [NoTradeReason.MissingRequiredContext]: 'hard',
    [NoTradeReason.MissingKeyLevels]: 'hard',
    [NoTradeReason.NoClearBias]: 'hard',
    [NoTradeReason.NoApprovedSetup]: 'hard',
    [NoTradeReason.EntryTriggerMissing]: 'hard',
    [NoTradeReason.EntryTriggerPending]: 'wait',
    [NoTradeReason.InvalidStopLocation]: 'hard',
    [NoTradeReason.RiskTooWide]: 'hard',
    [NoTradeReason.TargetsUnavailable]: 'hard',
    [NoTradeReason.KillSwitchActive]: 'hard',
    [NoTradeReason.ConflictingStructure]: 'hard',
    [NoTradeReason.ConflictingRagHistory]: 'warning',
    [NoTradeReason.ChasingExtendedMove]: 'hard',
    [NoTradeReason.LowConfidence]: 'warning',
  } satisfies Record<NoTradeReason, 'hard' | 'wait' | 'warning'>,
};

export type SupportedInstrument = typeof TRADE_RULES.instruments[number];

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function roundToTradeTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

export function fixedRiskStopForDirection(direction: 'LONG' | 'SHORT' | 'NO TRADE' | null | undefined, entry: number | null | undefined): number | null {
  if (!isValidPrice(entry)) return null;
  if (direction === 'LONG') return roundToTradeTick(entry - TRADE_RULES.fixedRiskPoints);
  if (direction === 'SHORT') return roundToTradeTick(entry + TRADE_RULES.fixedRiskPoints);
  return null;
}

export function fixedRiskTargetsForDirection(direction: 'LONG' | 'SHORT' | 'NO TRADE' | null | undefined, entry: number | null | undefined): { target1: number | null; target2: number | null } {
  if (!isValidPrice(entry) || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { target1: null, target2: null };
  }
  const sign = direction === 'LONG' ? 1 : -1;
  return {
    target1: roundToTradeTick(entry + sign * TRADE_RULES.fixedRiskPoints * TRADE_RULES.targetModel.t1R),
    target2: roundToTradeTick(entry + sign * TRADE_RULES.fixedRiskPoints * TRADE_RULES.targetModel.t2R),
  };
}

