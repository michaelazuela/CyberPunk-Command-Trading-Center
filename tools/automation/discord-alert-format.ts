import { targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { candidateTargetReactionObjective } from '../../src/lib/localScannerEngine';
import { NoTradeReason, TradeDecisionStatus, type SetupCandidate } from '../../src/types';
import {
  assertDiscordReportDesignerIsAdvisoryOnly,
  designDiscordVisualReport,
  type DiscordDecisionStatus,
  type MemoryHistoricalSupport,
  type ReportDirection,
} from '../../src/agents/discordReportDesignerAgent';
import {
  scoreConditionalCandidateRiskForDisplay,
  type ConditionalCandidateRiskScore,
} from '../../src/agents/conditionalCandidateRiskAgent';
import { formatCompactHtfContextSufficiencyLines } from '../../src/lib/htfLiquidityDrawEngine';
import type { ScannerHealthReport, ScannerHealthStatus } from '../../src/agents/scannerHealthAgent';
import type { MorningContinuationWatchlistResult } from '../../src/agents/morningContinuationWatchlistAgent';
import { professionalCandidateModelLabel, professionalizeReportText } from './professional-report-language';

export type CompactDiscordSession = 'morning' | 'lunch';
export type CompactDiscordInstrument = 'MES' | 'MNQ';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  image?: { url: string };
  footer: { text: string };
  timestamp: string;
}

export interface DiscordWebhookPayload {
  username: string;
  content?: string;
  embeds: DiscordEmbed[];
  components?: unknown[];
}

export interface CompactDiscordAttachmentState {
  chartPlan: boolean;
  priceLevelMap: boolean;
  auditLogPath?: string | null;
}

export interface CompactNormalizedPlan {
  canExecute?: boolean;
  decisionStatus?: string;
  decision?: string;
  entry?: number | null;
  stop?: number | null;
  noTradeReason?: string | null;
  invalidation?: string | null;
  t1?: number | null;
  t2?: number | null;
  setupCandidates?: SetupCandidate[];
}

export interface CompactDeskStateForDiscord {
  marketMode?: string;
  visibilityMode?: string;
  discordAction?: string;
  lineInSand?: number | null;
  nextTrigger?: string | null;
  invalidation?: string | null;
  canExecute?: boolean;
  dataQualityStatus?: string;
  primaryDeskPlay?: {
    direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
    trendConfirmation?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      status?: string;
      supportingTimeframes?: string[];
      lineInSand?: number | null;
      confirmation?: string;
      summary?: string;
    } | null;
    modelRouting?: {
      sourceOfTruth?: string;
      primaryDirection?: 'LONG' | 'SHORT' | 'WAIT' | string;
      bestApprovedModel?: string | null;
      bestApprovedModelName?: string | null;
      routingSummary?: string | null;
      longModelFit?: CompactDeskPlayModelFit | null;
      shortModelFit?: CompactDeskPlayModelFit | null;
      executableConsideration?: CompactDeskPlayExecutableConsideration | null;
    } | null;
    title?: string;
    summary?: string;
    lineInSand?: number | null;
    longAbove?: number | null;
    shortBelow?: number | null;
    targetReactionLevel?: number | null;
    targetReactionLabel?: string | null;
    targetReactionReason?: string | null;
    levelTransition?: {
      sourceOfTruth?: string;
      targetReactionLevel?: number | null;
      targetReactionLabel?: string | null;
      targetReactionReason?: string | null;
      longAbove?: number | null;
      shortBelow?: number | null;
      profitProtectionInstruction?: string;
      targetManagementInstruction?: string;
      nextStructureInstruction?: string;
    } | null;
    htfObjectiveLadder?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      appTarget1?: number | null;
      appTarget2?: number | null;
      reaction?: CompactHtfObjective | null;
      nextDraw?: CompactHtfObjective | null;
      runner?: CompactHtfObjective | null;
      extension?: CompactHtfObjective | null;
      objectives?: CompactHtfObjective[];
      managementInstruction?: string | null;
    } | null;
    htfProtectedStructureMap?: {
      sourceOfTruth?: string;
      reliability?: string;
      summary?: string;
      rows?: Array<{
        sourceOfTruth?: string;
        timeframe?: string;
        bias?: string;
        currentBias?: string;
        biasChangeLine?: number | null;
        biasChangeConfirmation?: string | null;
        protectedStructure?: number | null;
        confirmationLine?: number | null;
        target?: number | null;
        targetLabel?: string | null;
        confidence?: number | null;
        status?: string;
        note?: string;
      }>;
    } | null;
    nextTrigger?: string | null;
    invalidation?: string | null;
    noChase?: string;
    htfConflict?: boolean;
    countertrendWarning?: string | null;
    discordEligible?: boolean;
    longBias?: {
      state?: string;
      scenarioLabel?: string | null;
      rankScore?: number | null;
      decisionQualityScore?: number | null;
      modelConfidenceScore?: number | null;
      lineInSand?: number | null;
      lineConfidence?: {
        score?: number | null;
        label?: string | null;
        reason?: string | null;
      } | null;
      htfReactionContext?: {
        reactionLevel?: number | null;
        reactionLabel?: string | null;
        reactionReason?: string | null;
        sourceTimeframes?: string[];
        strength?: string | null;
        whyItMayReact?: string | null;
      } | null;
      modelFit?: CompactDeskPlayModelFit | null;
      executableConsideration?: CompactDeskPlayExecutableConsideration | null;
      nextTrigger?: string | null;
      reason?: string;
      blockers?: string[];
    };
    shortBias?: {
      state?: string;
      scenarioLabel?: string | null;
      rankScore?: number | null;
      decisionQualityScore?: number | null;
      modelConfidenceScore?: number | null;
      lineInSand?: number | null;
      lineConfidence?: {
        score?: number | null;
        label?: string | null;
        reason?: string | null;
      } | null;
      htfReactionContext?: {
        reactionLevel?: number | null;
        reactionLabel?: string | null;
        reactionReason?: string | null;
        sourceTimeframes?: string[];
        strength?: string | null;
        whyItMayReact?: string | null;
      } | null;
      modelFit?: CompactDeskPlayModelFit | null;
      executableConsideration?: CompactDeskPlayExecutableConsideration | null;
      nextTrigger?: string | null;
      reason?: string;
      blockers?: string[];
    };
  } | null;
}

interface CompactHtfObjective {
  kind?: string;
  label?: string | null;
  price?: number | null;
  source?: string | null;
  rMultiple?: number | null;
  instruction?: string | null;
}

interface CompactDeskPlayModelFit {
  sourceOfTruth?: string;
  setupType?: string | null;
  modelName?: string | null;
  parentModelFamily?: string | null;
  fitScore?: number | null;
  status?: string;
  reason?: string;
  missingProof?: string[];
}

interface CompactDeskPlayExecutableConsideration {
  sourceOfTruth?: string;
  direction?: 'LONG' | 'SHORT' | string;
  status?: string;
  selectedApprovedModel?: string | null;
  canExecuteNow?: boolean;
  gateSummary?: string;
  missingGates?: string[];
}

export const BANNED_ACTIVE_DISCORD_ALERT_TEXT = [
  'Local Scanner Trading Card',
  'Trade State',
  'Execution Plan',
  'Invalidation / No Chase',
  'Alert Quality',
  'Score breakdown',
  'Qualified reasons',
  'Missing reasons',
  'X Tags',
  'Do not execute from the card alone',
  'Target Cascade',
  'Overall score',
  'Alert qualification',
  'Quant Desk • Local Scanner',
  'Read-only bridge',
] as const;

const OLD_REPORT_TRUNCATION_ARTIFACT = /\b(?:Missing rea|Qualified rea|Target casc|Audit det|Counte|Counter)\.\.\./i;

interface CompactDiscordSummaryArgs {
  session: CompactDiscordSession;
  tradeDate: string;
  instrument: CompactDiscordInstrument;
  planVersionId: string;
  normalized: CompactNormalizedPlan;
  candidates: SetupCandidate[];
  attachments: CompactDiscordAttachmentState;
  components?: unknown[];
  sourceLabel?: 'Morning' | 'Lunch' | 'Scanner';
  windowLabel?: string;
  scoreOverride?: number | null;
  decisionOverride?: string | null;
  statusOverride?: string | null;
  deskState?: CompactDeskStateForDiscord | null;
  currentPrice?: number | null;
}

interface MorningWatchlistDiscordArgs {
  tradeDate: string;
  instrument: CompactDiscordInstrument;
  watchlist: MorningContinuationWatchlistResult;
}

interface ScannerHealthDiscordArgs {
  instrument: CompactDiscordInstrument;
  bridgeInstrument: string;
  dryRun: boolean;
  report: ScannerHealthReport;
}

function priceLine(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function numberLine(value: number | null | undefined, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'N/A';
}

function compactLine(value: string | null | undefined, maxLength = 180): string {
  const text = professionalizeReportText(String(value || '').trim()).replace(/\s+/g, ' ');
  if (!text) return 'N/A';
  return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function sessionDisplayName(session: CompactDiscordSession): string {
  return session === 'morning' ? 'Morning' : 'Lunch';
}

function sessionShortLabel(session: CompactDiscordSession): string {
  return session === 'morning' ? 'AM' : 'PM';
}

function statusEmoji(status: string | undefined): string {
  if (status === TradeDecisionStatus.ApprovedTrade || status === 'Approved' || status === 'Executable') return '🟢';
  if (status === TradeDecisionStatus.ConditionalTrade || status === TradeDecisionStatus.Wait || status === 'Conditional' || status === 'TriggerPending') return '🟡';
  if (status === TradeDecisionStatus.NoTrade || status === TradeDecisionStatus.OutsideRules || status === 'Blocked' || status === 'NoTrade') return '🔴';
  if (status === TradeDecisionStatus.InvalidScreenshot || status === 'NoData') return '⚪';
  return '🟡';
}

function statusColor(status: string | undefined): number {
  if (status === TradeDecisionStatus.ApprovedTrade || status === 'Approved' || status === 'Executable') return 0x00c853;
  if (status === TradeDecisionStatus.ConditionalTrade || status === TradeDecisionStatus.Wait || status === 'Conditional' || status === 'TriggerPending') return 0xffa000;
  if (status === TradeDecisionStatus.NoTrade || status === TradeDecisionStatus.OutsideRules || status === 'Blocked' || status === 'NoTrade') return 0xd50000;
  if (status === TradeDecisionStatus.InvalidScreenshot || status === 'NoData') return 0x78909c;
  return 0xff6d00;
}

function healthStatusColor(status: ScannerHealthStatus): number {
  if (status === 'READY') return 0x00c853;
  if (status === 'DEGRADED') return 0xffa000;
  return 0xd50000;
}

function healthStatusLine(status: ScannerHealthStatus): string {
  if (status === 'READY') return 'Status: Alerts can be trusted';
  if (status === 'DEGRADED') return 'Status: Alerts allowed with caution';
  return 'Status: Trade/watchlist alerts suppressed';
}

function healthActionLine(status: ScannerHealthStatus): string {
  if (status === 'READY') return 'Action: Scanner recovered. Trade/watchlist alerts may resume.';
  if (status === 'DEGRADED') return 'Action: Scanner continues. Review warnings if alerts look unusual.';
  return 'Action: Fix NinjaTrader/bridge/data issue, then restart or wait for recovery.';
}

function healthCheckMessage(report: ScannerHealthReport, key: string, fallback: string): string {
  return report.checks.find((item) => item.key === key)?.message || fallback;
}

export function shouldSendScannerHealthAlert(
  previousStatus: ScannerHealthStatus | null | undefined,
  currentStatus: ScannerHealthStatus,
): boolean {
  if (!previousStatus) return currentStatus === 'DEGRADED' || currentStatus === 'BLOCKED';
  return previousStatus !== currentStatus;
}

function candidateLevels(candidate: SetupCandidate): { stop: number | null; target1: number | null; target2: number | null } {
  const stop = typeof candidate.stop === 'number' && Number.isFinite(candidate.stop) ? candidate.stop : null;
  const computed = targetsFromEntryStop(candidate.direction, candidate.entry, stop);
  return {
    stop,
    target1: typeof candidate.target1 === 'number' && Number.isFinite(candidate.target1) ? candidate.target1 : computed.target1,
    target2: typeof candidate.target2 === 'number' && Number.isFinite(candidate.target2) ? candidate.target2 : computed.target2,
  };
}

function appTargetLevels(candidate: SetupCandidate, normalized: CompactNormalizedPlan): { stop: number | null; target1: number | null; target2: number | null } {
  const stop = typeof candidate.stop === 'number' && Number.isFinite(candidate.stop) ? candidate.stop : null;
  const computed = targetsFromEntryStop(candidate.direction, candidate.entry, stop);
  return {
    stop,
    target1: typeof normalized.t1 === 'number' && Number.isFinite(normalized.t1) ? normalized.t1 : computed.target1,
    target2: typeof normalized.t2 === 'number' && Number.isFinite(normalized.t2) ? normalized.t2 : computed.target2,
  };
}

function isMeaningfulExtension(direction: SetupCandidate['direction'], price: number | null | undefined, base: number | null | undefined): price is number {
  if (typeof price !== 'number' || !Number.isFinite(price) || typeof base !== 'number' || !Number.isFinite(base)) return false;
  return direction === 'SHORT' ? price < base - 0.01 : price > base + 0.01;
}

function firstMeaningfulExtension(
  direction: SetupCandidate['direction'],
  base: number | null | undefined,
  prices: Array<number | null | undefined>,
): number | null {
  for (const price of prices) {
    if (isMeaningfulExtension(direction, price, base)) return price;
  }
  return null;
}

function objectiveLine(label: string, objective: CompactHtfObjective | null | undefined): string | null {
  if (!objective || !isFinitePrice(objective.price)) return null;
  const rText = isFinitePrice(objective.rMultiple) ? ` ${objective.rMultiple.toFixed(1)}R` : '';
  return `${label}: ${compactLine(objective.label || 'HTF objective', 28)} ${priceLine(objective.price)}${rText}`;
}

function targetObjectiveLine(
  label: string,
  objective: { label?: string | null; price?: number | null; source?: string | null; rMultiple?: number | null } | null | undefined,
): string | null {
  return objectiveLine(label, objective);
}

function objectiveExtendsBeyondAppTarget(
  direction: SetupCandidate['direction'],
  objective: { price?: number | null } | null | undefined,
  appTargetBoundary: number | null | undefined,
): boolean {
  return Boolean(objective && isMeaningfulExtension(direction, objective.price, appTargetBoundary));
}

function firstMeaningfulTargetObjective(
  direction: SetupCandidate['direction'],
  base: number | null | undefined,
  objectives: Array<{ label?: string | null; price?: number | null; source?: string | null; rMultiple?: number | null } | null | undefined>,
) {
  return objectives.find((objective) => objectiveExtendsBeyondAppTarget(direction, objective, base)) || null;
}

function compactTargetLadderLines(candidate: SetupCandidate, normalized: CompactNormalizedPlan): string[] {
  const appTargets = appTargetLevels(candidate, normalized);
  if (appTargets.target1 == null && appTargets.target2 == null) {
    return ['Targets:', 'Unavailable until entry and protected stop are proven.'];
  }
  const targetPlan = candidate.targetObjectivePlan;
  const runner = firstMeaningfulExtension(candidate.direction, appTargets.target2, [
    candidate.target2,
    targetPlan?.liquidityTarget1?.price,
    targetPlan?.nearestLiquidityTarget?.price,
    targetPlan?.liquidityTarget2?.price,
    targetPlan?.liquidityRunnerTarget?.price,
    targetPlan?.runnerTarget?.price,
  ]);
  const stretch = firstMeaningfulExtension(candidate.direction, runner || appTargets.target2, [
    targetPlan?.liquidityRunnerTarget?.price,
    targetPlan?.runnerTarget?.price,
  ]);
  const nextDrawObjective = firstMeaningfulTargetObjective(candidate.direction, appTargets.target2, [
    targetPlan?.nearestLiquidityTarget,
    targetPlan?.liquidityTarget1,
    targetPlan?.liquidityTarget2,
    targetPlan?.liquidityRunnerTarget,
    targetPlan?.runnerTarget,
  ]);
  const runnerObjective = firstMeaningfulTargetObjective(candidate.direction, nextDrawObjective?.price ?? appTargets.target2, [
    targetPlan?.liquidityTarget2,
    targetPlan?.liquidityRunnerTarget,
    targetPlan?.runnerTarget,
  ]);
  const extensionObjective = firstMeaningfulTargetObjective(candidate.direction, runnerObjective?.price ?? runner ?? appTargets.target2, [
    targetPlan?.liquidityRunnerTarget,
    targetPlan?.runnerTarget,
  ]);
  const nextDrawLine = targetObjectiveLine('Next draw', nextDrawObjective);
  const runnerLine = targetObjectiveLine('Runner', runnerObjective) ||
    (runner ? `Runner: ${priceLine(runner)} - extension if T2 clears` : null);
  const extensionLine = targetObjectiveLine('Extension', extensionObjective) ||
    (stretch ? `Extension: ${priceLine(stretch)} - trail only if structure keeps delivering` : null);
  const htfRunnerMapLines = [
    nextDrawLine,
    runnerLine,
    extensionLine && extensionLine !== runnerLine ? extensionLine : null,
  ].filter((line): line is string => Boolean(line));
  return [
    'Targets:',
    `T1: ${priceLine(appTargets.target1)} - scale/secure`,
    `T2: ${priceLine(appTargets.target2)} - base exit`,
    ...(htfRunnerMapLines.length
      ? [
          'HTF Runner Map:',
          ...htfRunnerMapLines,
          'Mgmt: App T1/T2 tactical; runner needs 5M acceptance beyond T2.',
        ]
      : []),
  ];
}

function scannerLevelTransitionLines(args: CompactDiscordSummaryArgs, candidate: SetupCandidate): string[] {
  const play = args.deskState?.primaryDeskPlay;
  const transition = play?.levelTransition;
  const reaction = transition?.targetReactionLevel
    ? {
        label: transition.targetReactionLabel || 'HTF/session reaction level',
        price: transition.targetReactionLevel,
        reason: transition.targetReactionReason || transition.profitProtectionInstruction || 'HTF/session reaction level; watch for failure or reversal proof.',
      }
    : candidateTargetReactionObjective(candidate);
  const longAbove = typeof transition?.longAbove === 'number' && Number.isFinite(transition.longAbove)
    ? transition.longAbove
    : typeof play?.longAbove === 'number' && Number.isFinite(play.longAbove) ? play.longAbove : null;
  const shortBelow = typeof transition?.shortBelow === 'number' && Number.isFinite(transition.shortBelow)
    ? transition.shortBelow
    : typeof play?.shortBelow === 'number' && Number.isFinite(play.shortBelow) ? play.shortBelow : null;
  const nextLine = [
    longAbove !== null ? `LONG above ${priceLine(longAbove)}` : null,
    shortBelow !== null ? `SHORT below ${priceLine(shortBelow)}` : null,
  ].filter(Boolean).join(' / ');
  if (!reaction && !nextLine) return [];
  return [
    ...(reaction ? [
      `HTF reaction: ${reaction.label} ${priceLine(reaction.price)}`,
      transition?.targetManagementInstruction
        ? 'Manage: T1 serious; cap T2 into HTF. Reversal risk live.'
        : compactLine(reaction.reason || 'HTF/session reaction level; watch for failure or reversal proof.', 62),
      ...(transition?.targetManagementInstruction ? [
        'Secure/reduce continuation assumptions at that level.',
      ] : []),
    ] : []),
    ...(nextLine ? [
      `Next 5M map: ${nextLine}.`,
      compactLine(transition?.nextStructureInstruction || 'Wait for close/retest/protected structure.', 72),
    ] : []),
  ];
}

function scannerHtfCautionLines(args: CompactDiscordSummaryArgs, candidate: SetupCandidate): string[] {
  const deskWarning = args.deskState?.primaryDeskPlay?.countertrendWarning;
  const reactionArea = typeof candidate.activeRuleset?.htfLineInSand?.lineInSand === 'number' &&
    Number.isFinite(candidate.activeRuleset.htfLineInSand.lineInSand)
    ? `the HTF/session reaction line ${priceLine(candidate.activeRuleset.htfLineInSand.lineInSand)}`
    : 'the HTF/session reaction area';
  const rulesetBlockers = [
    ...(candidate.activeRuleset?.timeframeMss?.blockers || []),
    ...(candidate.activeRuleset?.htfLineInSand?.blockers || []),
  ].join(' ');
  const candidateHasHtfConflict = /opposing.*htf|htf.*conflict|opposing completed.*mss|countertrend/i.test(rulesetBlockers);
  const inferredWarning = candidateHasHtfConflict && (candidate.direction === 'LONG' || candidate.direction === 'SHORT')
    ? `${candidate.direction} is pressing into ${candidate.direction === 'SHORT' ? 'bullish' : 'bearish'} HTF/session structure. Treat T1/T2 as management, stop pressing at ${reactionArea}, and wait for a protected completed 5M line-in-the-sand shift before continuing or reversing.`
    : null;
  const warning = deskWarning || inferredWarning;
  return warning ? ['HTF Caution:', compactLine(warning, 190)] : [];
}

function compactSessionDecisionLabel(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): string {
  if (getEffectiveCanExecute(normalized)) return 'Executable';
  if (override && !/approved|executable/i.test(override)) return override;
  if (candidate?.executionStatus === 'Executable') return 'Qualified conditional';
  if (candidate?.executionStatus) return candidate.executionStatus;
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'Blocked';
  return 'Conditional';
}

function compactTradeDirection(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): ReportDirection {
  if (candidate?.direction && candidate.direction !== 'NO TRADE') return candidate.direction;
  return normalized.decision === 'LONG' || normalized.decision === 'SHORT' ? normalized.decision : 'WAIT';
}

function isExplicitReviewCandidate(candidate: SetupCandidate | null): boolean {
  return Boolean(
    candidate &&
    candidate.executionStatus === 'Conditional' &&
    (candidate.humanReview || candidate.activeRuleset?.htfLineInSand?.lineInSand)
  );
}

function reportStatus(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): DiscordDecisionStatus {
  const effectiveCanExecute = getEffectiveCanExecute(normalized);
  if (effectiveCanExecute) return 'EXECUTABLE';
  if (normalized.decision === 'NO TRADE' && !candidate) return 'NO TRADE';
  const status = compactSessionDecisionLabel(candidate, normalized, override).toLowerCase();
  if (status.includes('approved') || status.includes('executable')) return effectiveCanExecute ? 'EXECUTABLE' : 'CONDITIONAL';
  if (status.includes('blocked') || status.includes('no trade') || status.includes('notrade')) return 'NO TRADE';
  if (isExplicitReviewCandidate(candidate) && status.includes('conditional')) return 'CONDITIONAL';
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'NO TRADE';
  if (status.includes('conditional')) return 'CONDITIONAL';
  return 'WAIT';
}

function statusLine(status: DiscordDecisionStatus, candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  if (candidate?.humanReview?.status === 'HumanReviewReady') return 'HUMAN REVIEW READY - decision-support plan only; trader confirmation required';
  if (status === 'EXECUTABLE') return 'EXECUTABLE - verify completed 5M trigger before trader action';
  if (status === 'CONDITIONAL') return 'WAIT - fresh completed 5M required';
  if (status === 'NO TRADE') return `NO TRADE - ${normalized.noTradeReason || candidate?.blockReason || 'no active executable plan'}`;
  return 'WAIT - app-owned pipeline has not approved execution';
}

function compactActionText(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string {
  if (status === 'NO TRADE') return 'Stand down. Recheck at next scheduled scan.';
  if (!candidate) return 'Stand down. No active plan candidate.';
  if (candidate.failedPlanReversal?.staleOrNoFreshEntry) {
    return 'Failed-plan reversal is stale. Do not chase. Wait for a new completed 5M trigger/retest.';
  }
  if (candidate.candidateState === 'NO_FRESH_ENTRY') {
    return 'Conditional review only. Do not chase. Wait for a fresh completed 5M trigger/retest with protected structure.';
  }
  if (candidate.humanReview?.status === 'HumanReviewReady') {
    return 'Human review required. Verify the 5M FVG retest, protected stop, target room, and invalidation before any trader action.';
  }
  if (status === 'EXECUTABLE') return 'Verify completed 5M trigger, protected stop, target room, and invalidation before trader action.';
  if (candidate.executionStatus === 'Blocked') return `Stand down. ${candidate.blockReason || normalized.noTradeReason || 'Required gate failed.'}`;
  return candidate.requiredTrigger || candidate.nextAction || 'Wait for completed 5M trigger. No early entry.';
}

function failedPlanReversalLines(candidate: SetupCandidate): string[] {
  const state = candidate.failedPlanReversal;
  if (!state && candidate.pathway !== 'failed_plan_reversal') return [];
  const timeframeLine = state?.timeframeConfirmations?.length
    ? `TF: ${state.timeframeConfirmations
      .map((item) => `${item.timeframe} ${item.direction} ${item.status}`)
      .join(' | ')}`
    : null;
  const blockerLine = state?.blockers?.length
    ? `Blockers: ${state.blockers.slice(0, 2).join(' | ')}`
    : null;
  return [
    'Failed Plan Reversal:',
    `State: ${candidate.candidateState || state?.decisionState || 'pending'} | Level: ${priceLine(state?.failedDecisionLevel ?? null)}`,
    `${state ? `${state.originalPlanDirection} -> ${state.oppositeDirection}` : 'N/A'} | HTF: ${state?.htfStackStatus || 'unknown'} | 5M: ${state?.fiveMinuteTriggerStatus || 'unknown'}`,
    ...(timeframeLine ? [timeframeLine] : []),
    ...(blockerLine ? [compactLine(blockerLine, 120)] : []),
    'Boundary: decision support only; not execution approval.',
  ];
}

function lineInSandLines(candidate: SetupCandidate): string[] {
  const htfLine = candidate.activeRuleset?.htfLineInSand;
  if (!htfLine?.lineInSand) return [];
  return [
    'Line in the Sand:',
    `${priceLine(htfLine.lineInSand)} - ${compactLine(htfLine.lineReason || 'Required structure line.', 90)}`,
    ...(htfLine.requiredClose ? [`Close: ${compactLine(htfLine.requiredClose, 90)}`] : []),
  ];
}

function missingProofLines(candidate: SetupCandidate): string[] {
  const missing: string[] = [];
  if (candidate.entry == null) missing.push('Entry not confirmed by the app-owned pipeline.');
  if (candidate.stop == null) missing.push('Protected 5M structure stop not confirmed.');
  if (candidate.target1 == null || candidate.target2 == null) missing.push('App T1/T2 unavailable until entry and protected stop are proven.');
  if (!missing.length) return [];
  for (const item of candidate.missingEvidence || []) {
    if (missing.length >= 5) break;
    if (item && !missing.includes(item)) missing.push(item);
  }
  return [
    'Missing Proof:',
    ...missing.slice(0, 3).map((item) => `- ${compactLine(item, 90)}`),
  ];
}

function compactPlanLines(candidate: SetupCandidate, normalized: CompactNormalizedPlan): string[] {
  const levels = appTargetLevels(candidate, normalized);
  const modelConfidenceScore =
    typeof candidate.modelConfidenceScore === 'number' && Number.isFinite(candidate.modelConfidenceScore)
      ? Math.round(candidate.modelConfidenceScore)
      : null;
  const riskAboveStandard =
    candidate.riskAdvisoryStatus === 'RISK_ABOVE_STANDARD_LIMIT' ||
    candidate.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL' ||
    (typeof candidate.riskPoints === 'number' && candidate.riskPoints > TRADE_RULES.maxRiskPoints);
  return [
    'Plan:',
    ...(modelConfidenceScore !== null ? [`Confidence: ${modelConfidenceScore}/100`] : []),
    ...(candidate.candidateState === 'MSS_HOLD_TRIGGER_PENDING' ||
      candidate.candidateState === 'MSS_HOLD_CONFIRMED' ||
      candidate.candidateState === 'MSS_CONTINUATION_RETEST_PENDING' ||
      candidate.candidateState === 'OPENING_OBSERVATION_ARMED' ||
      candidate.candidateState === 'HUMAN_REVIEW_READY'
      ? [`Trigger State: ${candidate.candidateState}`]
      : []),
    ...(candidate.humanReview ? [
      `Review: ${candidate.humanReview.status}`,
      'Human review required. Decision-support plan only.',
      'Trader must confirm entry before action.',
    ] : []),
    ...failedPlanReversalLines(candidate),
    ...lineInSandLines(candidate),
    `Entry: ${priceLine(candidate.entry)}`,
    `Stop: ${priceLine(levels.stop)}`,
    `Risk: ${numberLine(candidate.riskPoints)} pts / N/A`,
    ...(riskAboveStandard ? [
      'Risk exceeds standard limit. Human final decision required.',
    ] : []),
    '',
    ...compactTargetLadderLines(candidate, normalized),
    '',
    ...missingProofLines(candidate),
    ...(candidate.requiredTrigger || candidate.nextAction ? [
      '',
      'Trigger:',
      compactLine(candidate.requiredTrigger || candidate.nextAction, 85),
      ...(candidate.nextAction && candidate.nextAction !== candidate.requiredTrigger ? [compactLine(candidate.nextAction, 85)] : []),
      'No chase. Wait for completed 5M proof and protected structure.',
    ] : []),
  ];
}

function isDeskStateWatch(args: CompactDiscordSummaryArgs, candidate: SetupCandidate | null): boolean {
  return Boolean(
    candidate &&
    !getEffectiveCanExecute(args.normalized) &&
    (args.deskState?.discordAction === 'post_watch' || args.deskState?.visibilityMode === 'POST_WATCH')
  );
}

function scannerWatchDiscordSummary(args: CompactDiscordSummaryArgs, candidate: SetupCandidate): DiscordWebhookPayload {
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : candidate.direction === 'LONG' ? 'LONG' : 'NO TRADE';
  const sessionLabel = sessionShortLabel(args.session);
  const lineInSand = typeof args.deskState?.lineInSand === 'number' && Number.isFinite(args.deskState.lineInSand)
    ? priceLine(args.deskState.lineInSand)
    : 'N/A';
  const trigger = compactLine(
    args.deskState?.nextTrigger ||
    candidate.requiredTrigger ||
    candidate.nextAction ||
    'Wait for completed 5M confirmation before any plan review.',
    160,
  );
  const invalidation = compactLine(
    args.deskState?.invalidation ||
    candidate.invalidation ||
    'Invalidation remains unconfirmed until the app-owned pipeline proves protected 5M structure.',
    140,
  );
  const reason = compactLine(candidate.evidence?.[0] || candidate.scenarioLabel || professionalCandidateModelLabel(candidate), 140);
  const description = [
    `[${sessionLabel} WATCH] ${args.instrument} - ${direction} WATCH FORMING`,
    'Status: WATCH - NOT EXECUTION APPROVAL',
    '',
    `Line in the sand: ${lineInSand}`,
    `Trigger: ${trigger}`,
    `Reason: ${reason}`,
    `Invalidation: ${invalidation}`,
    '',
    'No chase. Wait for completed 5M proof, protected structure stop, target room, and normal app-owned gates.',
    'No entry, stop, T1, T2, or outcome buttons are included in this watch alert.',
    'Decision support only. No automated orders.',
  ].join('\n');

  return {
    username: 'Quant Desk',
    content: `🟠 [${sessionLabel} WATCH] ${args.instrument} - ${direction} WATCH FORMING | ${args.tradeDate}`,
    embeds: [
      {
        title: 'Scanner Watch Alert',
        description: professionalizeReportText(description),
        color: 0xffa000,
        fields: [],
        footer: { text: 'Quant Desk • Scanner DeskState watch • Not execution approval' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

function shouldRenderDeskPlay(args: CompactDiscordSummaryArgs): boolean {
  const play = args.deskState?.primaryDeskPlay;
  if (!play?.discordEligible || getEffectiveCanExecute(args.normalized)) return false;
  if (play.direction === 'WAIT') return true;
  if (args.candidates.length === 0) return true;
  return args.deskState?.discordAction === 'hold' || args.deskState?.discordAction === 'no_trade';
}

function deskPlayLineForDirection(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): number | null {
  const directionalLine = direction === 'LONG' ? play.longAbove : play.shortBelow;
  if (isFinitePrice(directionalLine)) return directionalLine;
  const biasLineInSand = direction === 'LONG' ? play.longBias?.lineInSand : play.shortBias?.lineInSand;
  if (isFinitePrice(biasLineInSand)) return biasLineInSand;
  return isFinitePrice(play.lineInSand) ? play.lineInSand : null;
}

function deskPlayCandidateForDirection(
  normalized: CompactNormalizedPlan,
  direction: 'LONG' | 'SHORT',
): SetupCandidate | null {
  return (normalized.setupCandidates || []).find((candidate) =>
    candidate.direction === direction &&
    isFinitePrice(candidate.entry) &&
    isFinitePrice(candidate.stop),
  ) || null;
}

function deskPlayDecisionMapLevels(
  normalized: CompactNormalizedPlan,
  direction: 'LONG' | 'SHORT',
  lineInSand?: number | null,
): { entry: number; stop: number; target1: number; target2: number; riskPoints: number } | null {
  const candidate = deskPlayCandidateForDirection(normalized, direction);
  const normalizedMatchesDirection = normalized.decision === direction;
  const entry = normalizedMatchesDirection && isFinitePrice(normalized.entry)
    ? normalized.entry
    : candidate?.entry ?? null;
  const stop = normalizedMatchesDirection && isFinitePrice(normalized.stop)
    ? normalized.stop
    : candidate?.stop ?? null;
  const computed = targetsFromEntryStop(direction, entry, stop);
  const sideIsValid = direction === 'LONG'
    ? isFinitePrice(entry) && isFinitePrice(stop) && stop < entry
    : isFinitePrice(entry) && isFinitePrice(stop) && stop > entry;
  const tick = TRADE_RULES.targetModel.tickSize;
  const lineIsValid = !isFinitePrice(lineInSand)
    ? true
    : direction === 'LONG'
    ? isFinitePrice(entry) &&
      isFinitePrice(stop) &&
      entry >= lineInSand &&
      stop < lineInSand &&
      entry - lineInSand <= Math.max(lineInSand - stop, tick)
    : isFinitePrice(entry) &&
      isFinitePrice(stop) &&
      entry <= lineInSand &&
      stop > lineInSand &&
      lineInSand - entry <= Math.max(stop - lineInSand, tick);
  const targetsAreValid = direction === 'LONG'
    ? isFinitePrice(computed.target1) && isFinitePrice(computed.target2) && computed.target1 > entry! && computed.target2 > computed.target1
    : isFinitePrice(computed.target1) && isFinitePrice(computed.target2) && computed.target1 < entry! && computed.target2 < computed.target1;
  if (
    !isFinitePrice(entry) ||
    !isFinitePrice(stop) ||
    !isFinitePrice(computed.target1) ||
    !isFinitePrice(computed.target2) ||
    !isFinitePrice(computed.riskPoints) ||
    !sideIsValid ||
    !lineIsValid ||
    !targetsAreValid
  ) {
    return null;
  }
  return {
    entry,
    stop,
    target1: computed.target1,
    target2: computed.target2,
    riskPoints: computed.riskPoints,
  };
}

function deskPlayReactionLevel(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
): { price: number | null; label: string | null } {
  const transition = play.levelTransition;
  const price = isFinitePrice(transition?.targetReactionLevel)
    ? transition.targetReactionLevel
    : isFinitePrice(play.targetReactionLevel)
    ? play.targetReactionLevel
    : null;
  return {
    price,
    label: transition?.targetReactionLabel || play.targetReactionLabel || null,
  };
}

function deskPlayTransitionLine(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): number | null {
  const transition = play.levelTransition;
  if (direction === 'LONG') {
    return isFinitePrice(transition?.longAbove)
      ? transition.longAbove
      : isFinitePrice(play.longAbove)
      ? play.longAbove
      : null;
  }
  return isFinitePrice(transition?.shortBelow)
    ? transition.shortBelow
    : isFinitePrice(play.shortBelow)
    ? play.shortBelow
    : null;
}

function deskPlayBiasForDirection(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
) {
  return direction === 'LONG' ? play.longBias : play.shortBias;
}

function deskPlayConfidenceLine(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): string | null {
  const bias = deskPlayBiasForDirection(play, direction);
  const score = typeof bias?.lineConfidence?.score === 'number' && Number.isFinite(bias.lineConfidence.score)
    ? Math.round(bias.lineConfidence.score)
    : typeof bias?.decisionQualityScore === 'number' && Number.isFinite(bias.decisionQualityScore)
    ? Math.round(bias.decisionQualityScore)
    : typeof bias?.modelConfidenceScore === 'number' && Number.isFinite(bias.modelConfidenceScore)
    ? Math.round(bias.modelConfidenceScore)
    : typeof bias?.rankScore === 'number' && Number.isFinite(bias.rankScore)
    ? Math.round(bias.rankScore)
    : null;
  const label = compactLine(bias?.lineConfidence?.label || (score === null ? 'unavailable' : score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'), 18);
  return `Confidence: ${score === null ? 'N/A' : `${score}/100`} ${label}`;
}

function deskPlayModelFitLine(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): string | null {
  const bias = deskPlayBiasForDirection(play, direction);
  const fit = bias?.modelFit || (direction === 'LONG' ? play.modelRouting?.longModelFit : play.modelRouting?.shortModelFit);
  if (!fit || fit.sourceOfTruth !== 'scanner_protected_structure_model_fit') return null;
  if (fit.status !== 'best_fit') return null;
  const score = typeof fit.fitScore === 'number' && Number.isFinite(fit.fitScore)
    ? `${Math.round(fit.fitScore)}/100`
    : 'N/A';
  return `Best model: ${compactLine(fit.modelName || String(fit.setupType || 'approved model'), 32)} | fit ${score}`;
}

function deskPlayExecutableGateLine(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): string | null {
  const bias = deskPlayBiasForDirection(play, direction);
  const gate = bias?.executableConsideration ||
    (play.modelRouting?.executableConsideration?.direction === direction ? play.modelRouting.executableConsideration : null);
  if (!gate || gate.sourceOfTruth !== 'scanner_executable_consideration_gate_metadata') return null;
  if (gate.status === 'not_aligned' || gate.status === 'data_limited') return null;
  const status = gate.status === 'ready_for_existing_can_execute_gate'
    ? 'ready for normal gate'
    : gate.status === 'review_only_missing_proof'
    ? 'review only'
    : gate.status || 'pending';
  const missing = Array.isArray(gate.missingGates) && gate.missingGates.length
    ? ` | Missing: ${compactLine(gate.missingGates[0], 46)}`
    : '';
  return `Gate: ${status}; canExecute unchanged${missing}`;
}

function deskPlayHtfReactionLine(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): string | null {
  const bias = deskPlayBiasForDirection(play, direction);
  const context = bias?.htfReactionContext;
  const level = isFinitePrice(context?.reactionLevel)
    ? context.reactionLevel
    : isFinitePrice(play.targetReactionLevel)
    ? play.targetReactionLevel
    : null;
  const timeframes = Array.isArray(context?.sourceTimeframes) && context.sourceTimeframes.length
    ? context.sourceTimeframes.join('/')
    : 'HTF/session';
  const strength = compactLine(context?.strength || 'unknown', 16);
  const label = compactLine(context?.reactionLabel || play.targetReactionLabel || 'reaction area', 34);
  const why = compactLine(context?.whyItMayReact || context?.reactionReason || play.targetReactionReason || 'Scanner-owned HTF/session context.', 74);
  if (level === null && !context?.whyItMayReact && !context?.reactionReason) return null;
  return `HTF reaction: ${level === null ? label : `${label} ${priceLine(level)}`} | ${timeframes} | strength ${strength} | ${why}`;
}

function deskPlayHtfObjectiveLadderLines(play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>): string[] {
  const ladder = play.htfObjectiveLadder;
  if (!ladder || ladder.sourceOfTruth !== 'scanner_htf_objective_ladder') return [];
  const lines = [
    'HTF Runner Map',
    `App targets: T1 ${priceLine(ladder.appTarget1 ?? null)} / T2 ${priceLine(ladder.appTarget2 ?? null)}`,
    objectiveLine('Reaction', ladder.reaction),
    objectiveLine('Next draw', ladder.nextDraw),
    objectiveLine('Runner', ladder.runner),
    objectiveLine('Extension', ladder.extension),
    compactLine(ladder.managementInstruction || 'App T1/T2 tactical; HTF ladder is management only.', 86),
  ].filter((line): line is string => Boolean(line));
  return lines.length > 2 ? lines : [];
}

function currentHtfBiasLine(args: {
  timeframe: string;
  rowBias: string | null | undefined;
  rowCurrentBias?: string | null;
  rowBiasChangeLine?: number | null;
  rowBiasChangeConfirmation?: string | null;
  protectedLevel: number | null;
  confirmationLine: number | null;
  target: number | null;
  currentPrice: number | null | undefined;
}): string {
  const tf = compactLine(args.timeframe || 'TF', 4);
  const protectedText = priceLine(args.protectedLevel);
  const confirmText = priceLine(args.confirmationLine);
  const targetText = priceLine(args.target);
  const currentPrice = isFinitePrice(args.currentPrice) ? args.currentPrice : null;
  const rowCurrentBias = args.rowCurrentBias || null;

  if (currentPrice === null && rowCurrentBias && rowCurrentBias !== 'UNKNOWN') {
    const lineText = priceLine(isFinitePrice(args.rowBiasChangeLine) ? args.rowBiasChangeLine : args.protectedLevel ?? args.confirmationLine);
    const confirmation = compactLine(args.rowBiasChangeConfirmation || 'completed close+hold', 28);
    if (rowCurrentBias === 'BULL') {
      return `${tf}: BULL now | line ${lineText} | changes BEAR below ${lineText} | confirm ${confirmation} | target ${targetText}`;
    }
    if (rowCurrentBias === 'BEAR') {
      return `${tf}: BEAR now | line ${lineText} | changes BULL above ${lineText} | confirm ${confirmation} | target ${targetText}`;
    }
    if (rowCurrentBias === 'RANGE') {
      return `${tf}: RANGE now | lines ${confirmText}/${protectedText} | BULL above / BEAR below | confirm ${confirmation} | target ${targetText}`;
    }
  }

  if (args.rowBias === 'BULL') {
    if (currentPrice !== null && isFinitePrice(args.protectedLevel) && currentPrice < args.protectedLevel) {
      return `${tf}: BEAR now | line ${protectedText} | changes BULL above ${protectedText} | confirm close+hold above | target ${targetText}`;
    }
    return `${tf}: BULL now | line ${protectedText} | changes BEAR below ${protectedText} | confirm close+hold below | target ${targetText}`;
  }
  if (args.rowBias === 'BEAR') {
    if (currentPrice !== null && isFinitePrice(args.protectedLevel) && currentPrice > args.protectedLevel) {
      return `${tf}: BULL now | line ${protectedText} | changes BEAR below ${protectedText} | confirm close+hold below | target ${targetText}`;
    }
    return `${tf}: BEAR now | line ${protectedText} | changes BULL above ${protectedText} | confirm close+hold above | target ${targetText}`;
  }

  if (currentPrice !== null && isFinitePrice(args.confirmationLine) && currentPrice >= args.confirmationLine) {
    return `${tf}: BULL now | line ${protectedText} | changes BEAR below ${protectedText} | confirm close+hold below | target ${targetText}`;
  }
  if (currentPrice !== null && isFinitePrice(args.protectedLevel) && currentPrice <= args.protectedLevel) {
    return `${tf}: BEAR now | line ${confirmText} | changes BULL above ${confirmText} | confirm close+hold above | target ${targetText}`;
  }
  if (currentPrice !== null && isFinitePrice(args.protectedLevel) && isFinitePrice(args.confirmationLine)) {
    return `${tf}: RANGE now | lines ${confirmText}/${protectedText} | BULL above / BEAR below | confirm close+hold | target ${targetText}`;
  }

  return `${tf}: Bias pending | lines ${confirmText}/${protectedText} | BULL above / BEAR below | confirm close+hold | target ${targetText}`;
}

function deskPlayHtfProtectedStructureLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  currentPrice?: number | null,
): string[] {
  const map = play.htfProtectedStructureMap;
  if (!map || map.sourceOfTruth !== 'scanner_htf_protected_structure_map' || !Array.isArray(map.rows) || map.rows.length === 0) {
    return [];
  }
  const order = new Map([['4H', 0], ['2H', 1], ['1H', 2], ['15M', 3], ['5M', 4]]);
  const rows = [...map.rows]
    .sort((a, b) => (order.get(String(a.timeframe)) ?? 99) - (order.get(String(b.timeframe)) ?? 99))
    .slice(0, 5)
    .map((row) => {
      return currentHtfBiasLine({
        timeframe: row.timeframe || 'TF',
        rowBias: row.bias,
        rowCurrentBias: row.currentBias,
        rowBiasChangeLine: row.biasChangeLine,
        rowBiasChangeConfirmation: row.biasChangeConfirmation,
        protectedLevel: isFinitePrice(row.protectedStructure) ? row.protectedStructure : null,
        confirmationLine: isFinitePrice(row.confirmationLine) ? row.confirmationLine : null,
        target: isFinitePrice(row.target) ? row.target : null,
        currentPrice,
      });
    });
  return [
    'HTF Bias Lines',
    ...rows,
    `Reliability: ${compactLine(map.reliability || 'unknown', 16)}; 5M still controls execution.`,
  ];
}

function deskPlayTrendConfirmationLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
): string[] {
  const trend = play.trendConfirmation;
  if (!trend || trend.sourceOfTruth !== 'scanner_protected_structure_trend_confirmation') return [];
  const direction = trend.direction === 'LONG' || trend.direction === 'SHORT' ? trend.direction : 'WAIT';
  const status = trend.status || 'unknown';
  const timeframes = Array.isArray(trend.supportingTimeframes) && trend.supportingTimeframes.length
    ? trend.supportingTimeframes.join('+')
    : '15M+5M';
  const line = isFinitePrice(trend.lineInSand) ? ` | Line ${priceLine(trend.lineInSand)}` : '';
  const summary = trend.summary || trend.confirmation || 'Protected-structure trend confirmation pending.';
  return [
    'Desk Direction',
    `${direction} | ${status} | ${timeframes}${line}`,
    compactLine(summary, 140),
  ];
}

function deskPlayManagementLines(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT'): string[] {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) return [];
  const managedDirection = direction === 'LONG' ? 'SHORT' : 'LONG';
  const reaction = deskPlayReactionLevel(play);
  const continuationLine = deskPlayTransitionLine(play, managedDirection);
  const structureWord = managedDirection === 'SHORT' ? 'support' : 'resistance';
  if (reaction.price === null && continuationLine === null && !play.countertrendWarning) return [];
  return [
    `${managedDirection}: Manage, do not press`,
    ...(reaction.price !== null
      ? [`${managedDirection === 'SHORT' ? 'Short' : 'Long'} ran into HTF ${structureWord}: ${priceLine(reaction.price)}`]
      : []),
    ...(deskPlayConfidenceLine(play, managedDirection) ? [deskPlayConfidenceLine(play, managedDirection)!] : []),
    ...(deskPlayHtfReactionLine(play, managedDirection) ? [deskPlayHtfReactionLine(play, managedDirection)!] : []),
    ...(reaction.price !== null ? [`Take profit into ${priceLine(reaction.price)}`] : []),
    ...(continuationLine !== null
      ? [`No fresh ${managedDirection.toLowerCase()} unless price accepts ${managedDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(continuationLine)}`]
      : []),
  ];
}

function deskPlayPrimaryLines(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT'): string[] {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) return [];
  const lineInSand = deskPlayLineForDirection(play, direction);
  if (!isFinitePrice(lineInSand)) return [];
  const levels = deskPlayDecisionMapLevels(args.normalized, direction, lineInSand);
  const triggerWord = direction === 'LONG' ? 'ABOVE' : 'BELOW';
  const header = `${direction} ${triggerWord} ${priceLine(lineInSand)}`;
  if (!levels) {
    return [
      header,
      ...(deskPlayConfidenceLine(play, direction) ? [deskPlayConfidenceLine(play, direction)!] : []),
      ...(deskPlayModelFitLine(play, direction) ? [deskPlayModelFitLine(play, direction)!] : []),
      ...(deskPlayExecutableGateLine(play, direction) ? [deskPlayExecutableGateLine(play, direction)!] : []),
      ...(deskPlayHtfReactionLine(play, direction) ? [deskPlayHtfReactionLine(play, direction)!] : []),
      'Levels withheld until scanner-owned entry and protected 5M stop proof exist.',
    ];
  }
  return [
    header,
    ...(deskPlayConfidenceLine(play, direction) ? [deskPlayConfidenceLine(play, direction)!] : []),
    ...(deskPlayModelFitLine(play, direction) ? [deskPlayModelFitLine(play, direction)!] : []),
    ...(deskPlayExecutableGateLine(play, direction) ? [deskPlayExecutableGateLine(play, direction)!] : []),
    ...(deskPlayHtfReactionLine(play, direction) ? [deskPlayHtfReactionLine(play, direction)!] : []),
    `Entry ref: ${priceLine(levels.entry)}`,
    `Stop: ${priceLine(levels.stop)}`,
    `Risk: ${numberLine(levels.riskPoints)} pts`,
    `T1: ${priceLine(levels.target1)}`,
    `T2: ${priceLine(levels.target2)}`,
  ];
}

function deskPlayWaitMapLine(
  args: CompactDiscordSummaryArgs,
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): string | null {
  const lineInSand = deskPlayLineForDirection(play, direction);
  if (!isFinitePrice(lineInSand)) return null;
  const levels = deskPlayDecisionMapLevels(args.normalized, direction, lineInSand);
  const triggerWord = direction === 'LONG' ? 'ABOVE' : 'BELOW';
  const fit = deskPlayBiasForDirection(play, direction)?.modelFit ||
    (direction === 'LONG' ? play.modelRouting?.longModelFit : play.modelRouting?.shortModelFit);
  const model = fit?.status === 'best_fit'
    ? ` | Model ${compactLine(fit.modelName || String(fit.setupType || 'approved'), 26)}`
    : '';
  if (!levels) return `${direction} ${triggerWord} ${priceLine(lineInSand)}${model} | levels pending`;
  return `${direction} ${triggerWord} ${priceLine(lineInSand)}${model} | Entry ${priceLine(levels.entry)} | Stop ${priceLine(levels.stop)} | T1 ${priceLine(levels.target1)} | T2 ${priceLine(levels.target2)}`;
}

function deskPlayWaitLines(
  args: CompactDiscordSummaryArgs,
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
): string[] {
  const reaction = deskPlayReactionLevel(play);
  const warningDirection = play.countertrendWarning?.match(/\b(LONG|SHORT)\b/)?.[1] || null;
  const opposingStructure = play.countertrendWarning?.match(/\b(bullish|bearish)\s+HTF\/session structure/i)?.[1] || null;
  const caution = reaction.price !== null
    ? `Caution: ${warningDirection || 'Trade'} into ${opposingStructure ? `${opposingStructure} ` : ''}HTF ${priceLine(reaction.price)}. Stop pressing.`
    : play.countertrendWarning
    ? `Caution: ${compactLine(play.countertrendWarning, 86)}`
    : null;
  const mapLines = [
    deskPlayWaitMapLine(args, play, 'LONG'),
    deskPlayWaitMapLine(args, play, 'SHORT'),
  ].filter((line): line is string => Boolean(line));
  const lines = [
    'Review Map:',
    ...mapLines,
    caution,
    'Need: protected 5M shift + canExecute.',
  ];
  return lines.filter((line): line is string => Boolean(line));
}

function deskPlayTriggerLine(
  args: CompactDiscordSummaryArgs,
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null | undefined,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string {
  if (!play) return 'Trigger: completed 5M proof + retest/hold.';
  if (direction === 'LONG' || direction === 'SHORT') {
    const line = deskPlayLineForDirection(play, direction);
    if (isFinitePrice(line)) {
      return `Trigger: completed 5M close/retest ${direction === 'LONG' ? 'above' : 'below'} ${priceLine(line)}.`;
    }
  }
  const longLine = deskPlayLineForDirection(play, 'LONG');
  const shortLine = deskPlayLineForDirection(play, 'SHORT');
  const parts = [
    isFinitePrice(longLine) ? `LONG above ${priceLine(longLine)}` : null,
    isFinitePrice(shortLine) ? `SHORT below ${priceLine(shortLine)}` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length
    ? `Trigger: ${parts.join(' / ')}; completed 5M close/retest only.`
    : `Trigger: ${compactLine(args.deskState?.nextTrigger || 'completed 5M proof + retest/hold.', 64)}`;
}

function deskPlayInvalidationLine(
  args: CompactDiscordSummaryArgs,
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null | undefined,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string {
  if (direction === 'LONG' || direction === 'SHORT') {
    const line = play ? deskPlayLineForDirection(play, direction) : null;
    const levels = deskPlayDecisionMapLevels(args.normalized, direction, line);
    if (levels?.stop !== null && levels?.stop !== undefined && isFinitePrice(levels.stop)) {
      return `Invalid: completed 5M ${direction === 'LONG' ? 'below' : 'above'} ${priceLine(levels.stop)}.`;
    }
  }
  if (play) {
    const longLine = deskPlayLineForDirection(play, 'LONG');
    const shortLine = deskPlayLineForDirection(play, 'SHORT');
    const parts = [
      isFinitePrice(longLine) ? `LONG fails below ${priceLine(longLine)}` : null,
      isFinitePrice(shortLine) ? `SHORT fails above ${priceLine(shortLine)}` : null,
    ].filter((part): part is string => Boolean(part));
    if (parts.length) return `Invalid: ${parts.join(' / ')}.`;
  }
  return `Invalid: ${compactLine(args.deskState?.invalidation || 'protected 5M structure fails.', 64)}`;
}

function deskPlayHeadlineDirection(play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null | undefined): 'LONG' | 'SHORT' | 'WAIT' {
  if (!play || (play.direction !== 'LONG' && play.direction !== 'SHORT')) return 'WAIT';
  const bias = play.direction === 'LONG' ? play.longBias : play.shortBias;
  return bias?.state === 'primary' ? play.direction : 'WAIT';
}

function scannerDeskPlayDiscordSummary(args: CompactDiscordSummaryArgs): DiscordWebhookPayload {
  const play = args.deskState?.primaryDeskPlay;
  const sessionLabel = sessionShortLabel(args.session);
  const direction = deskPlayHeadlineDirection(play);
  const hasConditionalLevels = Boolean(
    args.attachments.chartPlan &&
    (direction === 'LONG' || direction === 'SHORT') &&
    play &&
    deskPlayDecisionMapLevels(args.normalized, direction, deskPlayLineForDirection(play, direction)),
  );
  const line = typeof play?.lineInSand === 'number' && Number.isFinite(play.lineInSand)
    ? priceLine(play.lineInSand)
    : 'N/A';
  const lines = [
    `[${sessionLabel} DESK PLAY] ${args.instrument} - ${direction}`,
    'Status: REVIEW ONLY - NOT EXECUTION',
    '',
    ...(play ? deskPlayHtfProtectedStructureLines(play, args.currentPrice) : []),
    ...(play ? [''] : []),
    ...(play ? deskPlayTrendConfirmationLines(play) : []),
    ...(play ? [''] : []),
    ...(direction === 'LONG' || direction === 'SHORT'
      ? deskPlayManagementLines(args, direction)
      : play
      ? deskPlayWaitLines(args, play)
      : [`Line in the sand: ${line}`]),
    ...(play && (direction === 'LONG' || direction === 'SHORT') ? ['', ...deskPlayPrimaryLines(args, direction)] : []),
    ...(play && direction !== 'WAIT' ? ['', ...deskPlayHtfObjectiveLadderLines(play)] : []),
    '',
    deskPlayTriggerLine(args, play, direction),
    '',
    deskPlayInvalidationLine(args, play, direction),
    '',
    hasConditionalLevels
      ? 'Chart: review attached; not execution approval.'
      : args.attachments.chartPlan
      ? 'Chart: watch chart attached; levels withheld until protected structure is proven.'
      : 'Chart: none.',
    '',
    'Boundary: no approval/canExecute change.',
  ];
  return {
    username: 'Quant Desk',
    content: `🟠 [${sessionLabel} DESK PLAY] ${args.instrument} - ${direction} | ${args.tradeDate}`,
    embeds: [
      {
        title: 'Scanner Desk Play',
        description: professionalizeReportText(lines.join('\n')),
        color: direction === 'LONG' ? 0x00a86b : direction === 'SHORT' ? 0xff6d00 : 0xffa000,
        fields: [],
        footer: { text: 'Quant Desk • Scanner DeskState play • Not execution approval' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(args.components?.length ? { components: args.components } : {}),
  };
}

function compactRiskScoreReason(riskScore: ConditionalCandidateRiskScore): string {
  const hardBlock = riskScore.blockReason
    ? riskScore.blockReason === NoTradeReason.RiskTooWide
      ? 'Risk is advisory above the standard limit.'
      : `Risk remains blocked by ${riskScore.blockReason}.`
    : 'This score is advisory only.';
  const mainReason = riskScore.reasons[0] || hardBlock;
  if (mainReason === hardBlock) return mainReason;
  return `${mainReason} ${hardBlock}`.trim();
}

function conditionalRiskLines(candidate: SetupCandidate, normalized: CompactNormalizedPlan): string[] {
  const riskAboveStandard =
    candidate.riskAdvisoryStatus === 'RISK_ABOVE_STANDARD_LIMIT' ||
    candidate.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL' ||
    (typeof candidate.riskPoints === 'number' && candidate.riskPoints > TRADE_RULES.maxRiskPoints);
  if (!riskAboveStandard && candidate.blockReason !== NoTradeReason.RiskTooWide && normalized.noTradeReason !== NoTradeReason.RiskTooWide) {
    return [];
  }
  const score = scoreConditionalCandidateRiskForDisplay(candidate);
  return [
    'Risk Advisory:',
    `Decision: ${getEffectiveCanExecute(normalized) ? 'STRUCTURALLY COMPLETE' : 'WAIT'} | App plan review: ${getEffectiveCanExecute(normalized) ? 'YES' : 'NO'} | canExecute: ${getEffectiveCanExecute(normalized) ? 'true' : 'false'}`,
    `Risk State: ${candidate.riskAdvisoryStatus || 'RISK_ABOVE_STANDARD_LIMIT'}`,
    `Risk Score: ${score.score}/100 - ${score.label}`,
    `Reason: ${compactLine(compactRiskScoreReason(score), 85)}`,
    'Human final decision. Do not chase.',
  ];
}

function compactHtfSufficiencyLines(candidate: SetupCandidate | null): string[] {
  const state = candidate?.htfLiquidityDrawState;
  if (!state?.htfContextSufficiency || !state.classificationReliability) return [];
  return formatCompactHtfContextSufficiencyLines({
    htfContextSufficiency: state.htfContextSufficiency,
    classificationReliability: state.classificationReliability,
  });
}

function compactKeyLevelLines(candidate: SetupCandidate | null): string[] {
  const targetPlan = candidate?.targetObjectivePlan;
  const resistance =
    targetPlan?.liquidityTarget1?.type === 'high' ? targetPlan.liquidityTarget1.price :
    targetPlan?.liquidityTarget2?.type === 'high' ? targetPlan.liquidityTarget2.price :
    targetPlan?.nearestLiquidityTarget?.type === 'high' ? targetPlan.nearestLiquidityTarget.price :
    null;
  const support =
    targetPlan?.liquidityTarget1?.type === 'low' ? targetPlan.liquidityTarget1.price :
    targetPlan?.liquidityTarget2?.type === 'low' ? targetPlan.liquidityTarget2.price :
    targetPlan?.nearestLiquidityTarget?.type === 'low' ? targetPlan.nearestLiquidityTarget.price :
    null;
  const liquidity =
    targetPlan?.liquidityTarget1 ||
    targetPlan?.nearestLiquidityTarget ||
    targetPlan?.liquidityRunnerTarget ||
    null;
  return [
    'Key Levels:',
    `Resistance: ${priceLine(resistance)}`,
    `Support: ${priceLine(support)}`,
    `Liquidity: ${liquidity ? `${liquidity.label} ${priceLine(liquidity.price)}` : 'N/A'}`,
  ];
}

function memoryLines(): string[] {
  return [
    'Memory:',
    'History: Neutral',
    'Warning: none',
  ];
}

function memorySupportForDesigner(): MemoryHistoricalSupport {
  return 'NEUTRAL';
}

function noTradeReason(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  return normalized.noTradeReason || candidate?.blockReason || 'No active plan candidate available.';
}

export function compactAttachmentLine(attachments: CompactDiscordAttachmentState, hasCandidate: boolean): string {
  if (!hasCandidate) return 'Details: Visual attachments not generated because no active plan candidate was available.';
  if (attachments.chartPlan && attachments.priceLevelMap) return 'Details: Chart + Level Map attached.';
  if (attachments.chartPlan) return 'Details: Chart attached; Level Map unavailable.';
  if (attachments.priceLevelMap) return 'Details: Price Level Map attached. Chart Plan unavailable.';
  return 'Details: Visuals unavailable; review local logs before action.';
}

export function compactDiscordSummary(args: CompactDiscordSummaryArgs): DiscordWebhookPayload {
  const bestCandidate = args.candidates[0] || null;
  if (shouldRenderDeskPlay(args)) {
    return scannerDeskPlayDiscordSummary(args);
  }
  if (isDeskStateWatch(args, bestCandidate)) {
    return scannerWatchDiscordSummary(args, bestCandidate as SetupCandidate);
  }
  const effectiveCanExecute = getEffectiveCanExecute(args.normalized);
  const requestedStatus = args.statusOverride || args.normalized.decisionStatus || (effectiveCanExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait);
  const finalStatus = !effectiveCanExecute && (requestedStatus === TradeDecisionStatus.ApprovedTrade || requestedStatus === 'Approved' || requestedStatus === 'Executable')
    ? TradeDecisionStatus.Wait
    : isExplicitReviewCandidate(bestCandidate) && requestedStatus === TradeDecisionStatus.NoTrade
      ? TradeDecisionStatus.ConditionalTrade
    : requestedStatus;
  const direction = compactTradeDirection(bestCandidate, args.normalized);
  const decision = compactSessionDecisionLabel(bestCandidate, args.normalized, args.decisionOverride);
  const designerStatus = reportStatus(bestCandidate, args.normalized, args.statusOverride || args.decisionOverride);
  const model = bestCandidate ? professionalCandidateModelLabel(bestCandidate) : 'No registered active model candidate';
  const reportKind = designerStatus === 'EXECUTABLE' ? 'PLAN' : 'REVIEW';
  const sessionLabel = sessionShortLabel(args.session);
  const headlineDirection = designerStatus === 'NO TRADE' ? 'NO TRADE' : direction;
  const safeDecision = designerStatus === 'EXECUTABLE'
    ? decision.toUpperCase()
    : designerStatus === 'CONDITIONAL'
      ? 'CONDITIONAL / NO FRESH ENTRY'
      : designerStatus;
  const headlineStatus = designerStatus === 'NO TRADE' ? '' : ` ${safeDecision}`;
  const headline = `[${sessionLabel} ${reportKind}] ${args.instrument} - ${headlineDirection}${headlineStatus}`;
  const levels = bestCandidate ? appTargetLevels(bestCandidate, args.normalized) : { stop: null, target1: null, target2: null };
  const action = compactActionText(bestCandidate, args.normalized, designerStatus);
  const designerRecommendation = designDiscordVisualReport({
    reportType: 'discord_alert',
    headline,
    session: sessionDisplayName(args.session),
    instrument: args.instrument,
    direction: headlineDirection,
    status: designerStatus,
    setupType: model,
    actionInstruction: action,
    entry: bestCandidate?.entry ?? null,
    stop: levels.stop,
    t1: levels.target1,
    t2: levels.target2,
    riskPoints: bestCandidate?.riskPoints ?? null,
    riskDollars: null,
    invalidation: bestCandidate?.invalidation || args.normalized.invalidation || null,
    noTradeReason: noTradeReason(bestCandidate, args.normalized),
    memory: {
      similarSetupCount: 0,
      completedSetupCount: 0,
      historicalSupport: memorySupportForDesigner(),
      confidenceAdjustment: 'neutral',
      memoryWarning: null,
    },
  });
  assertDiscordReportDesignerIsAdvisoryOnly(designerRecommendation as unknown as Record<string, unknown>);
  const riskLines = bestCandidate ? conditionalRiskLines(bestCandidate, args.normalized) : [];
  const htfLines = compactHtfSufficiencyLines(bestCandidate);
  const bestLevels = bestCandidate ? appTargetLevels(bestCandidate, args.normalized) : null;
  const bestCandidateHasFullPlan = Boolean(
    bestCandidate?.entry != null &&
    bestLevels?.stop != null &&
    bestLevels?.target1 != null &&
    bestLevels?.target2 != null
  );
  const includeMemory = designerStatus === 'EXECUTABLE' || bestCandidateHasFullPlan;
  const levelTransitionLines = bestCandidate ? scannerLevelTransitionLines(args, bestCandidate) : [];
  const htfCautionLines = bestCandidate ? scannerHtfCautionLines(args, bestCandidate) : [];

  const lines = bestCandidate && designerStatus !== 'NO TRADE'
    ? [
        `Status: ${statusLine(designerStatus, bestCandidate, args.normalized)}`,
        '',
        ...compactPlanLines(bestCandidate, args.normalized),
        '',
        ...levelTransitionLines,
        ...(levelTransitionLines.length ? [''] : []),
        ...htfCautionLines,
        ...(htfCautionLines.length ? [''] : []),
        ...riskLines,
        ...(riskLines.length ? [''] : []),
        ...htfLines,
        ...(htfLines.length ? [''] : []),
        'Invalidation:',
        compactLine(bestCandidate.invalidation || args.normalized.invalidation || 'Invalidation not available. Do not act without protected structure.', 140),
        '',
        ...(includeMemory ? [...memoryLines(), ''] : []),
        'Action:',
        compactLine(designerRecommendation.actionLine, 100),
        '',
        compactAttachmentLine(args.attachments, true),
        'Decision support only.',
      ]
    : [
        `Reason: ${noTradeReason(bestCandidate, args.normalized)}`,
        '',
        ...compactKeyLevelLines(bestCandidate),
        '',
        ...memoryLines(),
        '',
        'Action:',
        designerRecommendation.actionLine,
        '',
        compactAttachmentLine(args.attachments, Boolean(bestCandidate)),
        'Decision support only.',
      ];

  const includeComponents = Boolean(args.components);
  return {
    username: 'Quant Desk',
    content: `${statusEmoji(finalStatus)} ${designerRecommendation.headlineRecommendation}`,
    embeds: [
      {
        title: 'Compact Trade Plan Summary',
        description: professionalizeReportText(lines.join('\n')),
        color: statusColor(finalStatus),
        fields: [],
        footer: { text: '' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(includeComponents ? { components: args.components } : {}),
  };
}

export function morningWatchlistDiscordSummary(args: MorningWatchlistDiscordArgs): DiscordWebhookPayload {
  const direction = args.watchlist.direction === 'SHORT' ? 'SHORT' : args.watchlist.direction === 'LONG' ? 'LONG' : 'NO TRADE';
  const safeLine = (value: string) => professionalizeReportText(value).replace(/\bapproved\b/gi, 'current');
  const why = safeLine(args.watchlist.evidence[0] || args.watchlist.reason);
  const noChase = safeLine(
    args.watchlist.missingEvidence.find((item) => item.toLowerCase().includes('structure stop')) ||
    'Current price is extended from the original trigger / no fresh structure stop exists.'
  );
  const description = [
    `[AM WATCHLIST] ${args.instrument} - ${direction} DEVELOPING`,
    'Status: WATCH ONLY - NO FRESH ENTRY',
    '',
    'Why:',
    why,
    '',
    'DO NOT CHASE:',
    noChase,
    '',
    'Next valid condition:',
    safeLine(args.watchlist.requiredNextCondition),
    '',
    'Action:',
    'Watch only. No entry until current rules confirm.',
    '',
    'This is not a trade alert. No action levels or outcome buttons are included.',
    'Decision support only. No automated orders.',
  ].join('\n');

  return {
    username: 'Quant Desk',
    content: `🟠 [AM WATCHLIST] ${args.instrument} - ${direction} DEVELOPING | WATCH ONLY - NO FRESH ENTRY | ${args.tradeDate}`,
    embeds: [
      {
        title: 'Morning Continuation Watchlist',
        description: professionalizeReportText(description),
        color: 0xffa000,
        fields: [],
        footer: { text: 'Quant Desk • Watchlist only • Existing app-owned rules must confirm any future trade' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function scannerHealthDiscordSummary(args: ScannerHealthDiscordArgs): DiscordWebhookPayload {
  const report = args.report;
  const mode = args.dryRun ? 'dry-run' : 'live';
  const warnings = report.warnings.slice(0, 4);
  const blockingReasons = report.blockingReasons.slice(0, 4);
  const detailLines = report.status === 'BLOCKED'
    ? [
        'Blocking reasons:',
        ...(blockingReasons.length ? blockingReasons.map((reason) => `- ${reason}`) : ['- Alert trust is blocked by scanner health.']),
      ]
    : report.status === 'DEGRADED'
      ? [
          'Warnings:',
          ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ['- Scanner health is degraded.']),
        ]
      : [
          `Bridge: ${healthCheckMessage(report, 'bridge_reachable', 'OK')}`,
          `Latest 5M: ${healthCheckMessage(report, 'latest_5m_bar_current', 'Current')}`,
          `Gemini: ${healthCheckMessage(report, 'gemini_independence', 'Gemini unavailable: scanner unaffected.')}`,
          `Instrument: ${args.instrument} / ${args.bridgeInstrument}`,
          `Mode: ${mode}`,
        ];
  const description = [
    `[SCANNER HEALTH] ${args.instrument} - ${report.status}`,
    healthStatusLine(report.status),
    '',
    ...detailLines,
    '',
    healthActionLine(report.status),
    '',
    'Operational status only. Not a trade alert. No action levels or outcome buttons are included.',
    'Decision support only. No automated orders.',
  ].join('\n');

  return {
    username: 'Quant Desk',
    content: `[SCANNER HEALTH] ${args.instrument} - ${report.status}`,
    embeds: [
      {
        title: 'Scanner Health',
        description: professionalizeReportText(description),
        color: healthStatusColor(report.status),
        fields: [],
        footer: { text: 'Quant Desk • Scanner health • Operational status only' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function flattenDiscordPayloadText(payload: DiscordWebhookPayload): string {
  return [
    payload.content || '',
    ...payload.embeds.flatMap((embed) => [
      embed.title,
      embed.description || '',
      embed.footer?.text || '',
      ...embed.fields.flatMap((field) => [field.name, field.value]),
    ]),
  ].join('\n');
}

export function validateDiscordPayload(payload: DiscordWebhookPayload, files: string[] = []): void {
  const contentLength = payload.content?.length || 0;
  if (contentLength > 2000) {
    throw new Error(`Discord payload blocked: content is ${contentLength} characters, above the 2000 character limit.`);
  }
  const mainText = flattenDiscordPayloadText(payload);
  if (mainText.length > 2000) {
    throw new Error(`Discord payload blocked: compact alert text is ${mainText.length} characters, above the 2000 character limit.`);
  }
  if (OLD_REPORT_TRUNCATION_ARTIFACT.test(mainText)) {
    throw new Error('Discord payload blocked: truncation artifact detected in main alert text.');
  }
  const loweredMainText = mainText.toLowerCase();
  const leakedOldSection = BANNED_ACTIVE_DISCORD_ALERT_TEXT.find((marker) => loweredMainText.includes(marker.toLowerCase()));
  if (leakedOldSection) {
    throw new Error(`Discord payload blocked: old long-form scanner card section leaked into compact alert text (${leakedOldSection}).`);
  }
  if (/\bAudit detail/i.test(mainText)) {
    throw new Error('Discord payload blocked: audit-only detail leaked into compact alert text.');
  }
  for (const embed of payload.embeds) {
    if (embed.title.length > 256) throw new Error('Discord payload blocked: embed title exceeds 256 characters.');
    if ((embed.description || '').length > 4096) throw new Error('Discord payload blocked: embed description exceeds 4096 characters.');
    if (embed.fields.length > 25) throw new Error('Discord payload blocked: embed has more than 25 fields.');
    for (const field of embed.fields) {
      if (field.name.length > 256) throw new Error('Discord payload blocked: embed field name exceeds 256 characters.');
      if (field.value.length > 1024) throw new Error('Discord payload blocked: embed field value exceeds 1024 characters.');
    }
  }
  const validFiles = files.filter(Boolean);
  const hasDeskPlaySingleChart = /watch chart attached|review (?:chart )?attached/i.test(mainText);
  if (validFiles.length > 0 && validFiles.length < 2 && !hasDeskPlaySingleChart) {
    console.warn('Discord payload warning: only one trade-plan image attachment is present. Expected Chart Plan + Price Level Map when a candidate exists.');
  }
  if (validFiles.length > 0 && mainText.length > 1600) {
    throw new Error(`Discord payload blocked: trade-plan compact alert text is ${mainText.length} characters; keep image-backed trade alerts under 1600.`);
  }
  if (mainText.length > 1200) {
    console.warn(`Discord payload warning: compact alert text is ${mainText.length} characters; preferred normal output is under 1200.`);
  }
}
