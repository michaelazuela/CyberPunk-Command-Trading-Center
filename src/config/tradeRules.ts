import { NoTradeReason, SetupType } from '../types';
import { SYSTEM_RULES } from '../constants';

export const TRADE_RULES = {
  instruments: ['MES', 'MNQ'] as const,
  // Compatibility cap only. New execution logic must use structure stops first,
  // then validate actual entry-to-stop risk against this max.
  fixedRiskPoints: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
  maxRiskPoints: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
  preferredRiskPoints: SYSTEM_RULES.FIXED_STOP_RISK_POINTS,
  executionParameters: {
    minimumSweepTicks: 2,
    defaultSweepDistancePoints: 0.5,
    stopOffsetTicks: 1,
    confirmationTimeframe: '5m',
    displacementScoreThreshold: 70,
    fvgImpulseBodyRatio: 1.25,
    fvgImpulseRangeRatio: 1.25,
  },
  discordAlertThresholds: {
    conditional: 65,
    executable: 80,
    educationalBlocked: 70,
  },
  executionWindows: {
    openingObservation: {
      label: 'Opening Observation Window',
      startET: '09:30',
      endET: '10:00',
      quality: 'observe_only',
      enabled: true,
    },
    morningExecution: {
      label: 'Morning Setup Scan',
      startET: '09:15',
      endET: '12:00',
      quality: 'approved',
      enabled: true,
    },
    middayTrapReversal: {
      label: 'Lunch/PM Setup Scan',
      startET: '12:00',
      endET: '16:00',
      quality: 'strict',
      enabled: true,
    },
    eveningExecution: {
      label: 'Evening Setup Scan',
      startET: '18:45',
      endET: '22:15',
      quality: 'approved',
      enabled: true,
    },
  },
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
      label: 'Morning Setup Scan',
      requiredScreenshotRange: '9:15 AM through 12:00 PM ET',
      allowedSetups: [
        SetupType.SweepMssFvgRetrace,
        SetupType.TurtleSoup,
        SetupType.HtfDrawContinuationAfterRaid,
        SetupType.HtfDisplacementMssContinuation,
        SetupType.HtfDisplacementFvgContinuation,
        SetupType.OpeningDriveFvgContinuation,
        SetupType.IntradayMssMicroContinuation,
        SetupType.FailedPlanReversal,
      ],
      supportingEvidence: [
        SetupType.LiquiditySweep,
        SetupType.FairValueGap,
        SetupType.FvgImbalancePullback,
        SetupType.MarketStructureShift,
        SetupType.EqualHighsLows,
        SetupType.PreviousDaySweep,
        SetupType.BreakerBlock,
      ],
    },
    lunch: {
      label: 'Lunch/PM Setup Scan',
      requiredScreenshotRange: '12:00 PM through 4:00 PM ET',
      allowedSetups: [
        SetupType.SweepMssFvgRetrace,
        SetupType.TurtleSoup,
        SetupType.HtfDrawContinuationAfterRaid,
        SetupType.HtfDisplacementMssContinuation,
        SetupType.HtfDisplacementFvgContinuation,
        SetupType.AfterLunchDriveFvgContinuation,
        SetupType.IntradayMssMicroContinuation,
        SetupType.FailedPlanReversal,
      ],
      supportingEvidence: [
        SetupType.LiquiditySweep,
        SetupType.FairValueGap,
        SetupType.FvgImbalancePullback,
        SetupType.MarketStructureShift,
        SetupType.EqualHighsLows,
        SetupType.PreviousDaySweep,
        SetupType.BreakerBlock,
      ],
    },
    evening: {
      label: 'Evening Setup Scan',
      requiredScreenshotRange: '6:45 PM through 10:15 PM ET',
      allowedSetups: [
        SetupType.SweepMssFvgRetrace,
        SetupType.TurtleSoup,
        SetupType.HtfDrawContinuationAfterRaid,
        SetupType.HtfDisplacementMssContinuation,
        SetupType.HtfDisplacementFvgContinuation,
        SetupType.IntradayMssMicroContinuation,
        SetupType.FailedPlanReversal,
      ],
      supportingEvidence: [
        SetupType.LiquiditySweep,
        SetupType.FairValueGap,
        SetupType.FvgImbalancePullback,
        SetupType.MarketStructureShift,
        SetupType.EqualHighsLows,
        SetupType.PreviousDaySweep,
        SetupType.BreakerBlock,
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
    [NoTradeReason.RiskTooWide]: 'warning',
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

export function stopOffsetPoints(ticks = TRADE_RULES.executionParameters.stopOffsetTicks): number {
  return ticks * TRADE_RULES.targetModel.tickSize;
}

export function minimumSweepDistancePoints(ticks = TRADE_RULES.executionParameters.minimumSweepTicks): number {
  return ticks * TRADE_RULES.targetModel.tickSize;
}

export function targetsFromEntryStop(
  direction: 'LONG' | 'SHORT' | 'NO TRADE' | null | undefined,
  entry: number | null | undefined,
  stop: number | null | undefined
): { target1: number | null; target2: number | null; riskPoints: number | null } {
  if (!isValidPrice(entry) || !isValidPrice(stop) || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { target1: null, target2: null, riskPoints: null };
  }
  if ((direction === 'LONG' && stop >= entry) || (direction === 'SHORT' && stop <= entry)) {
    return { target1: null, target2: null, riskPoints: null };
  }
  const riskPoints = Math.abs(entry - stop);
  if (!Number.isFinite(riskPoints) || riskPoints <= 0) {
    return { target1: null, target2: null, riskPoints: null };
  }
  const sign = direction === 'LONG' ? 1 : -1;
  return {
    target1: roundToTradeTick(entry + sign * riskPoints * TRADE_RULES.targetModel.t1R),
    target2: roundToTradeTick(entry + sign * riskPoints * TRADE_RULES.targetModel.t2R),
    riskPoints: roundToTradeTick(riskPoints),
  };
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

