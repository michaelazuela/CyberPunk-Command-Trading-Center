import { TradeDecisionStep } from '../types';

export const DECISION_STEPS: TradeDecisionStep[] = [
  TradeDecisionStep.ConfirmSessionAndInstrument,
  TradeDecisionStep.ConfirmScreenshotUsability,
  TradeDecisionStep.IdentifyMarketContext,
  TradeDecisionStep.IdentifyKeyLevels,
  TradeDecisionStep.DetermineBias,
  TradeDecisionStep.CheckApprovedTimeWindow,
  TradeDecisionStep.IdentifySetupType,
  TradeDecisionStep.ValidateEntryTrigger,
  TradeDecisionStep.ValidateStopLocation,
  TradeDecisionStep.ValidateRiskLimit,
  TradeDecisionStep.DetermineTargetModel,
  TradeDecisionStep.DefineInvalidation,
  TradeDecisionStep.DecideTradeOrNoTrade,
  TradeDecisionStep.GenerateFinalTradePlan,
  TradeDecisionStep.SaveJournalReadyRecord,
];

export const DECISION_STEP_LABELS: Record<TradeDecisionStep, string> = {
  [TradeDecisionStep.ConfirmSessionAndInstrument]: 'Confirm session and instrument',
  [TradeDecisionStep.ConfirmScreenshotUsability]: 'Confirm screenshot usability',
  [TradeDecisionStep.IdentifyMarketContext]: 'Identify market context',
  [TradeDecisionStep.IdentifyKeyLevels]: 'Identify key levels',
  [TradeDecisionStep.DetermineBias]: 'Determine bias',
  [TradeDecisionStep.CheckApprovedTimeWindow]: 'Check approved time window',
  [TradeDecisionStep.IdentifySetupType]: 'Identify setup type',
  [TradeDecisionStep.ValidateEntryTrigger]: 'Validate entry trigger',
  [TradeDecisionStep.ValidateStopLocation]: 'Validate stop location',
  [TradeDecisionStep.ValidateRiskLimit]: 'Validate risk limit',
  [TradeDecisionStep.DetermineTargetModel]: 'Determine target model',
  [TradeDecisionStep.DefineInvalidation]: 'Define invalidation',
  [TradeDecisionStep.DecideTradeOrNoTrade]: 'Decide trade or no-trade',
  [TradeDecisionStep.GenerateFinalTradePlan]: 'Generate final trade plan',
  [TradeDecisionStep.SaveJournalReadyRecord]: 'Save journal-ready record',
};

