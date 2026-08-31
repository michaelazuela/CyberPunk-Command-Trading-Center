import { roundToTradeTick, targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
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
import { classifyDiscordMessageText } from './discord-message-policy';
import { buildOutcomeComponents, loadCanonicalDiscordOutcomeSecretFromEnvLocal } from './discord-outcome-buttons';

export type CompactDiscordSession = 'morning' | 'lunch' | 'evening';
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
  htfContextStatus?: string;
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
    activeTacticalLine?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      originalLine?: number | null;
      activeLine?: number | null;
      migrated?: boolean;
      supportingTimeframes?: string[];
      reason?: string | null;
      nextTrigger?: string | null;
      standDown?: string | null;
    } | null;
    activeTacticalZone?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      lower?: number | null;
      upper?: number | null;
      anchorLine?: number | null;
      migratedFromLine?: number | null;
      migrated?: boolean;
      zoneLabel?: string | null;
      sourceTimeframe?: string | null;
      state?: string | null;
      reason?: string | null;
      nextTrigger?: string | null;
      standDown?: string | null;
      noChase?: string | null;
    } | null;
    modelRouting?: {
      sourceOfTruth?: string;
      primaryDirection?: 'LONG' | 'SHORT' | 'WAIT' | string;
      bestActiveModel?: string | null;
      bestActiveModelName?: string | null;
      /** @deprecated Use bestActiveModel. */
      bestApprovedModel?: string | null;
      /** @deprecated Use bestActiveModelName. */
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
    fvgDecisionZone?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | string;
      lineInSand?: number | null;
      zoneLabel?: string | null;
      sourceTimeframe?: string | null;
      state?: string | null;
      whyItMatters?: string | null;
      holdCondition?: string | null;
      foldCondition?: string | null;
      managementInstruction?: string | null;
      noChase?: string | null;
    } | null;
    retainedBossZones?: {
      sourceOfTruth?: string;
      bullBoss?: CompactRetainedBossZone | null;
      bearBoss?: CompactRetainedBossZone | null;
      zones?: CompactRetainedBossZone[];
      summary?: string | null;
    } | null;
    htfFvgCascade?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | string;
      parentZone?: {
        sourceOfTruth?: string;
        direction?: 'LONG' | 'SHORT' | string;
        timeframe?: string | null;
        lower?: number | null;
        upper?: number | null;
        midpoint?: number | null;
        label?: string | null;
        state?: string | null;
        evidence?: string | null;
      } | null;
      childExecutionZone?: {
        sourceOfTruth?: string;
        direction?: 'LONG' | 'SHORT' | string;
        timeframe?: string | null;
        source?: string | null;
        lower?: number | null;
        upper?: number | null;
        anchorLine?: number | null;
        entry?: number | null;
        stop?: number | null;
        target1?: number | null;
        target2?: number | null;
        triggerNeeded?: string | null;
      } | null;
      routingSummary?: string | null;
      standDown?: string | null;
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
      tradeReadiness?: CompactDeskPlayTradeReadiness | null;
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
      tradeReadiness?: CompactDeskPlayTradeReadiness | null;
      nextTrigger?: string | null;
      reason?: string;
      blockers?: string[];
    };
  } | null;
}

interface CompactRetainedBossZone {
  sourceOfTruth?: string;
  direction?: 'LONG' | 'SHORT' | string;
  role?: string;
  lower?: number | null;
  upper?: number | null;
  midpoint?: number | null;
  lineInSand?: number | null;
  sourceTimeframe?: string | null;
  formedAt?: string | null;
  formedCandleIndex?: number | null;
  confidence?: string | null;
  state?: string | null;
  stateReason?: string | null;
  use?: string | null;
  holdCondition?: string | null;
  invalidation?: string | null;
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
  selectedRegisteredModel?: string | null;
  /** @deprecated Use selectedRegisteredModel. */
  selectedApprovedModel?: string | null;
  canExecuteNow?: boolean;
  gateSummary?: string;
  missingGates?: string[];
}

interface CompactDeskPlayTradeReadiness {
  sourceOfTruth?: string;
  direction?: 'LONG' | 'SHORT' | string;
  status?: string;
  label?: string;
  action?: string;
  reason?: string;
  missingProof?: string[];
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
  'HTF Runner Map:',
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

function defaultOutcomeComponentsForSummary(
  args: CompactDiscordSummaryArgs,
  direction: 'LONG' | 'SHORT' | 'NO TRADE' | null | undefined,
): unknown[] | undefined {
  loadCanonicalDiscordOutcomeSecretFromEnvLocal();
  return buildOutcomeComponents({
    planVersionId: args.planVersionId,
    sessionType: args.session,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    direction,
  });
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
  return session === 'morning' ? 'Morning' : session === 'evening' ? 'Evening' : 'Lunch';
}

function sessionShortLabel(session: CompactDiscordSession): string {
  return session === 'morning' ? 'AM' : session === 'evening' ? 'EVENING' : 'PM';
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
  const runnerLine = targetObjectiveLine('Runner', runnerObjective) ||
    (runner ? `Runner: ${priceLine(runner)} - extension if T2 clears` : null);
  const extensionLine = targetObjectiveLine('Extension', extensionObjective) ||
    (stretch ? `Extension: ${priceLine(stretch)} - trail only if structure keeps delivering` : null);
  const htfTargetLine = nextDrawObjective || runnerObjective || runner
    ? `HTF target: ${priceLine(nextDrawObjective?.price ?? null)} / runner ${priceLine(runnerObjective?.price ?? runner ?? null)}`
    : null;
  return [
    'Targets:',
    `T1: ${priceLine(appTargets.target1)} - scale/secure`,
    `T2: ${priceLine(appTargets.target2)} - base exit`,
    ...(htfTargetLine
      ? [
          htfTargetLine,
          ...(extensionLine && extensionLine !== runnerLine ? [extensionLine] : []),
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

function candidateDiscordHtfPublishIssue(candidate: SetupCandidate | null): 'opposed' | 'unconfirmed' | 'data_limited' | null {
  if (!candidate) return null;
  if (candidate.htfLiquidityDrawState?.classificationReliability === 'data_limited') return 'data_limited';
  const text = [
    ...(candidate.activeRuleset?.timeframeMss?.blockers || []),
    ...(candidate.activeRuleset?.htfLineInSand?.blockers || []),
    ...(candidate.missingEvidence || []),
    ...(candidate.evidence || []),
    candidate.blockReason,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.levelContextSummary,
    candidate.decisionQualityScorecard?.map((item) => `${item.label} ${item.note}`).join(' '),
  ]
    .filter(Boolean)
    .join(' ');
  if (
    /opposing completed HTF MSS|opposing.*HTF|counter-HTF|countertrend|pressing into .*HTF\/session structure|No completed .*MSS support/i.test(text)
  ) {
    return 'opposed';
  }
  if (
    /completed HTF support is not confirmed|HTF support (?:is )?not confirmed|HTF is caution\/context only|not headline this as the active play until HTF support/i.test(text)
  ) {
    return 'unconfirmed';
  }
  return null;
}

function reportStatus(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): DiscordDecisionStatus {
  const effectiveCanExecute = getEffectiveCanExecute(normalized);
  const htfPublishIssue = candidateDiscordHtfPublishIssue(candidate);
  if (effectiveCanExecute && !htfPublishIssue) return 'EXECUTABLE';
  if (normalized.decision === 'NO TRADE' && !candidate) return 'NO TRADE';
  const status = compactSessionDecisionLabel(candidate, normalized, override).toLowerCase();
  if (status.includes('approved') || status.includes('executable')) return effectiveCanExecute && !htfPublishIssue ? 'EXECUTABLE' : 'CONDITIONAL';
  if (status.includes('blocked') || status.includes('no trade') || status.includes('notrade')) return 'NO TRADE';
  if (isExplicitReviewCandidate(candidate) && status.includes('conditional')) return 'CONDITIONAL';
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'NO TRADE';
  if (status.includes('conditional')) return 'CONDITIONAL';
  return 'WAIT';
}

function statusLine(status: DiscordDecisionStatus, candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  if (candidate?.humanReview?.status === 'HumanReviewReady') return 'HUMAN REVIEW READY - decision-support plan only; trader confirmation required';
  if (status === 'EXECUTABLE') return 'EXECUTABLE - verify completed 5M trigger before trader action';
  if (isHighConfidenceConditionalCandidate(candidate, normalized)) return 'HIGH-CONFIDENCE CONDITIONAL TRADE PLAN - armed after named completed 5M condition';
  if (status === 'CONDITIONAL' && candidateDiscordHtfPublishIssue(candidate)) return 'WAIT - HTF support required before Discord execution alert';
  if (status === 'CONDITIONAL') return 'WAIT - fresh completed 5M required';
  if (status === 'NO TRADE') return `NO TRADE - ${normalized.noTradeReason || candidate?.blockReason || 'no active executable plan'}`;
  return 'WAIT - app-owned pipeline has not approved execution';
}

function candidateQualityScore(candidate: SetupCandidate | null): number | null {
  const score = candidate?.decisionQualityScore ?? candidate?.modelConfidenceScore ?? null;
  return typeof score === 'number' && Number.isFinite(score) ? score : null;
}

function isHighConfidenceConditionalCandidate(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): boolean {
  if (!candidate || getEffectiveCanExecute(normalized)) return false;
  const levels = appTargetLevels(candidate, normalized);
  const hasFullPlan = isFinitePrice(candidate.entry) &&
    isFinitePrice(levels.stop) &&
    isFinitePrice(levels.target1) &&
    isFinitePrice(levels.target2);
  const score = candidateQualityScore(candidate);
  return hasFullPlan && typeof score === 'number' && score >= 85;
}

function discordPromotionDecisionLine(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string {
  if (status === 'EXECUTABLE') return 'Decision class: TRUE EXECUTION APPROVED - app-owned canExecute=true.';
  if (isHighConfidenceConditionalCandidate(candidate, normalized)) {
    return 'Decision class: HIGH-CONFIDENCE CONDITIONAL - publish prominently; execution arms only after the named completed 5M condition.';
  }
  if (candidate?.humanReview?.status === 'HumanReviewReady') return 'Decision class: HUMAN REVIEW READY - trader confirmation + canExecute required.';
  if (status === 'CONDITIONAL') return 'Decision class: CONDITIONAL REVIEW - wait for completed 5M proof + canExecute.';
  return 'Decision class: WAIT - no executable approval.';
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

function compactReviewPlanLines(candidate: SetupCandidate, normalized: CompactNormalizedPlan): string[] {
  const levels = appTargetLevels(candidate, normalized);
  const modelConfidenceScore =
    typeof candidate.modelConfidenceScore === 'number' && Number.isFinite(candidate.modelConfidenceScore)
      ? Math.round(candidate.modelConfidenceScore)
      : null;
  const htfLine = candidate.activeRuleset?.htfLineInSand?.lineInSand;
  const riskAboveStandard =
    candidate.riskAdvisoryStatus === 'RISK_ABOVE_STANDARD_LIMIT' ||
    candidate.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL' ||
    (typeof candidate.riskPoints === 'number' && candidate.riskPoints > TRADE_RULES.maxRiskPoints);
  const lineLines = lineInSandLines(candidate);
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
    ...lineLines,
    ...(!lineLines.length && isFinitePrice(htfLine) ? [
      'Line in the Sand:',
      `${priceLine(htfLine)} - Required structure line.`,
    ] : []),
    `Entry: ${priceLine(candidate.entry)} | Stop: ${priceLine(levels.stop)} | Risk: ${numberLine(candidate.riskPoints)} pts / N/A`,
    ...(riskAboveStandard ? ['Risk exceeds standard limit. Human final decision required.'] : []),
    ...compactTargetLadderLines(candidate, normalized),
    ...missingProofLines(candidate),
    '',
    'Trigger:',
    compactLine(candidate.requiredTrigger || candidate.nextAction || 'Wait for completed 5M trigger.', 92),
    'No chase. Wait for completed 5M proof and protected structure. Do not chase.',
  ];
}

function compactGeneralAlertLines(args: CompactDiscordSummaryArgs, candidate: SetupCandidate, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string[] {
  const levelTransitionLines = scannerLevelTransitionLines(args, candidate).slice(0, 3);
  const htfCautionLines = scannerHtfCautionLines(args, candidate).slice(0, 2);
  const riskLines = conditionalRiskLines(candidate, normalized).slice(0, 4);
  const htfLines = compactHtfSufficiencyLines(candidate);
  return [
    `Status: ${statusLine(status, candidate, normalized)}`,
    '',
    ...(status === 'EXECUTABLE' ? compactPlanLines(candidate, normalized) : compactReviewPlanLines(candidate, normalized)),
    '',
    ...levelTransitionLines,
    ...(levelTransitionLines.length ? [''] : []),
    ...htfCautionLines,
    ...(htfCautionLines.length ? [''] : []),
    ...riskLines,
    ...(riskLines.length ? [''] : []),
    ...htfLines,
    ...(htfLines.length ? [''] : []),
    'Decision support only. No automated orders.',
    '',
    'Invalidation:',
    compactLine(candidate.invalidation || normalized.invalidation || 'Invalidation not available. Do not act without protected structure.', 92),
  ];
}

function isDeskStateWatch(args: CompactDiscordSummaryArgs, candidate: SetupCandidate | null): boolean {
  return Boolean(
    candidate &&
    !getEffectiveCanExecute(args.normalized) &&
    (args.deskState?.discordAction === 'post_watch' || args.deskState?.visibilityMode === 'POST_WATCH')
  );
}

function completedFiveMinuteProofLine(trigger: string): string {
  return /completed 5m/i.test(trigger)
    ? 'Required proof: completed 5M trigger, protected structure stop, target room, and normal app-owned gates.'
    : 'Required proof: completed 5M confirmation first, then protected structure stop, target room, and normal app-owned gates.';
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
    completedFiveMinuteProofLine(trigger),
    'Boundary: canExecute=false. This watch does not approve execution.',
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
  if (/-DESK-PLAY(?:-|$)/.test(args.planVersionId)) return true;
  if (play.direction === 'WAIT') return true;
  if (args.candidates.length === 0) return true;
  return args.deskState?.discordAction === 'hold' || args.deskState?.discordAction === 'no_trade';
}

function deskPlayLineForDirection(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): number | null {
  const activeLine = play.activeTacticalLine;
  if (
    activeLine?.direction === direction &&
    isFinitePrice(activeLine.activeLine)
  ) {
    return activeLine.activeLine;
  }
  const directionalLine = direction === 'LONG' ? play.longAbove : play.shortBelow;
  if (isFinitePrice(directionalLine)) return directionalLine;
  const biasLineInSand = direction === 'LONG' ? play.longBias?.lineInSand : play.shortBias?.lineInSand;
  if (isFinitePrice(biasLineInSand)) return biasLineInSand;
  return isFinitePrice(play.lineInSand) ? play.lineInSand : null;
}

function deskPlayOriginalLine(play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>): number | null {
  const activeLine = play.activeTacticalLine;
  if (isFinitePrice(activeLine?.originalLine)) return activeLine!.originalLine!;
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

interface DeskPlayPlanningLevels {
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  source: 'normalized_candidate' | 'protected_5m_review_path';
  noChase: boolean;
}

function deskPlayFiveMinuteProtectedStructure(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null | undefined,
): number | null {
  const rows = play?.htfProtectedStructureMap?.rows;
  if (!Array.isArray(rows)) return null;
  const row = rows.find((item) => String(item.timeframe || '').toUpperCase() === '5M');
  return isFinitePrice(row?.protectedStructure) ? roundToTradeTick(row.protectedStructure) : null;
}

function deskPlayEntryZone(direction: 'LONG' | 'SHORT', entry: number, riskPoints: number): { low: number; high: number } {
  const tick = TRADE_RULES.targetModel.tickSize;
  const width = roundToTradeTick(Math.min(1, Math.max(tick, riskPoints * 0.4)));
  if (direction === 'LONG') {
    return { low: entry, high: roundToTradeTick(entry + width) };
  }
  return { low: roundToTradeTick(entry - width), high: entry };
}

function deskPlayValidatePlanningLevels(args: {
  direction: 'LONG' | 'SHORT';
  entry: number | null | undefined;
  stop: number | null | undefined;
  source: DeskPlayPlanningLevels['source'];
  currentPrice?: number | null;
}): DeskPlayPlanningLevels | null {
  const entry = isFinitePrice(args.entry) ? roundToTradeTick(args.entry) : null;
  const stop = isFinitePrice(args.stop) ? roundToTradeTick(args.stop) : null;
  const computed = targetsFromEntryStop(args.direction, entry, stop);
  const sideIsValid = args.direction === 'LONG'
    ? isFinitePrice(entry) && isFinitePrice(stop) && stop < entry
    : isFinitePrice(entry) && isFinitePrice(stop) && stop > entry;
  const targetsAreValid = args.direction === 'LONG'
    ? isFinitePrice(computed.target1) && isFinitePrice(computed.target2) && computed.target1 > entry! && computed.target2 > computed.target1
    : isFinitePrice(computed.target1) && isFinitePrice(computed.target2) && computed.target1 < entry! && computed.target2 < computed.target1;
  if (
    !isFinitePrice(entry) ||
    !isFinitePrice(stop) ||
    !isFinitePrice(computed.target1) ||
    !isFinitePrice(computed.target2) ||
    !isFinitePrice(computed.riskPoints) ||
    (args.source === 'protected_5m_review_path' && computed.riskPoints > TRADE_RULES.maxRiskPoints) ||
    !sideIsValid ||
    !targetsAreValid
  ) {
    return null;
  }
  const zone = deskPlayEntryZone(args.direction, entry, computed.riskPoints);
  const currentPrice = isFinitePrice(args.currentPrice) ? args.currentPrice : null;
  const noChase = currentPrice !== null && (
    args.direction === 'LONG'
      ? currentPrice > zone.high
      : currentPrice < zone.low
  );
  return {
    entry,
    stop,
    target1: computed.target1,
    target2: computed.target2,
    riskPoints: computed.riskPoints,
    entryZoneLow: zone.low,
    entryZoneHigh: zone.high,
    source: args.source,
    noChase,
  };
}

function deskPlayDecisionMapLevels(
  normalized: CompactNormalizedPlan,
  direction: 'LONG' | 'SHORT',
  lineInSand?: number | null,
  play?: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null,
  currentPrice?: number | null,
): DeskPlayPlanningLevels | null {
  const candidate = deskPlayCandidateForDirection(normalized, direction);
  const normalizedMatchesDirection = normalized.decision === direction;
  const entry = normalizedMatchesDirection && isFinitePrice(normalized.entry)
    ? normalized.entry
    : candidate?.entry ?? null;
  const stop = normalizedMatchesDirection && isFinitePrice(normalized.stop)
    ? normalized.stop
    : candidate?.stop ?? null;
  const topLevelLevels = normalizedMatchesDirection
    ? deskPlayValidatePlanningLevels({
        direction,
        entry: normalized.entry,
        stop: normalized.stop,
        source: 'normalized_candidate',
        currentPrice,
      })
    : null;
  if (topLevelLevels) return topLevelLevels;
  const tick = TRADE_RULES.targetModel.tickSize;
  const lineIsValid = !isFinitePrice(lineInSand)
    ? true
    : direction === 'LONG'
    ? isFinitePrice(entry) &&
      isFinitePrice(stop) &&
      entry >= lineInSand &&
      stop < lineInSand &&
      entry - lineInSand <= Math.max(entry - stop, tick)
    : isFinitePrice(entry) &&
      isFinitePrice(stop) &&
      entry <= lineInSand &&
      stop > lineInSand &&
      lineInSand - entry <= Math.max(stop - entry, tick);
  if (lineIsValid) {
    const normalizedLevels = deskPlayValidatePlanningLevels({
      direction,
      entry,
      stop,
      source: 'normalized_candidate',
      currentPrice,
    });
    if (normalizedLevels) return normalizedLevels;
  }
  if (!isFinitePrice(lineInSand)) return null;
  return deskPlayValidatePlanningLevels({
    direction,
    entry: lineInSand,
    stop: deskPlayFiveMinuteProtectedStructure(play),
    source: 'protected_5m_review_path',
    currentPrice,
  });
}

function resolveDeskPlayRowBias(
  row: NonNullable<NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>['htfProtectedStructureMap']>['rows'][number],
  currentPrice?: number | null,
): 'BULL' | 'BEAR' | 'RANGE' | 'UNKNOWN' {
  if (row.currentBias === 'BULL' || row.currentBias === 'BEAR' || row.currentBias === 'RANGE') return row.currentBias;
  if (row.bias === 'BULL' || row.bias === 'BEAR') return row.bias;
  const price = isFinitePrice(currentPrice) ? currentPrice : null;
  if (price !== null && isFinitePrice(row.confirmationLine) && price >= row.confirmationLine) return 'BULL';
  if (price !== null && isFinitePrice(row.protectedStructure) && price <= row.protectedStructure) return 'BEAR';
  if (isFinitePrice(row.protectedStructure) && isFinitePrice(row.confirmationLine)) return 'RANGE';
  return 'UNKNOWN';
}

function biasEmoji(bias: 'BULL' | 'BEAR' | 'RANGE' | 'UNKNOWN' | string | null | undefined): string {
  const normalized = String(bias || '').toUpperCase();
  if (normalized === 'BULL' || normalized === 'BULLISH') return '🐂';
  if (normalized === 'BEAR' || normalized === 'BEARISH') return '🐻';
  if (normalized === 'RANGE') return '⚖️';
  return '▫️';
}

function sideEmoji(side: 'LONG' | 'SHORT' | 'WAIT' | string | null | undefined): string {
  const normalized = String(side || '').toUpperCase();
  if (normalized === 'LONG') return '🐂';
  if (normalized === 'SHORT') return '🐻';
  if (normalized === 'WAIT') return '🛑';
  return '▫️';
}

function primaryPlanLabel(label: string): string {
  const trimmed = label.trim();
  if (trimmed === 'LONG') return `${sideEmoji('LONG')} LONG`;
  if (trimmed === 'SHORT') return `${sideEmoji('SHORT')} SHORT`;
  if (trimmed === 'WAIT') return `${sideEmoji('WAIT')} WAIT`;
  return trimmed
    .replace(/^WAIT\b/, `${sideEmoji('WAIT')} WAIT`)
    .replace(/\bLONG\b/, `${sideEmoji('LONG')} LONG`)
    .replace(/\bSHORT\b/, `${sideEmoji('SHORT')} SHORT`);
}

function sideBreakoutLabel(side: 'LONG' | 'SHORT', triggerWord: 'ABOVE' | 'BELOW', line: number | null): string {
  return `${sideEmoji(side)} ${side} ${triggerWord} ${priceLine(line)}`;
}

function deskPlayBiasSummary(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
  currentPrice?: number | null,
): string {
  const rows = play.htfProtectedStructureMap?.rows || [];
  const expected = direction === 'SHORT' ? 'BEAR' : direction === 'LONG' ? 'BULL' : null;
  if (!expected) {
    return rows.length
      ? '🧭 HTF protected structure rows are scanner-owned context only.'
      : 'No current directional bias confirmed.';
  }
  const label = expected === 'BULL' ? 'bullish' : 'bearish';
  const rowByTimeframe = new Map(rows.map((row) => [String(row.timeframe || '').toUpperCase(), row]));
  const aligned = ['15M', '5M'].filter((tf) => {
    const row = rowByTimeframe.get(tf);
    return row ? resolveDeskPlayRowBias(row, currentPrice) === expected : false;
  });
  const parts: string[] = [];
  if (aligned.length === 2) {
    parts.push(`${biasEmoji(expected)} 15M + 5M ${label}`);
  } else if (aligned.length === 1) {
    parts.push(`${biasEmoji(expected)} ${aligned[0]} ${label}`);
  }
  const oneHour = rowByTimeframe.get('1H');
  if (oneHour && resolveDeskPlayRowBias(oneHour, currentPrice) === expected) {
    parts.push(`${biasEmoji(expected)} 1H supportive`);
  }
  if (parts.length) return parts.join(', ');
  const trendSummary = play.trendConfirmation?.summary || play.trendConfirmation?.confirmation || null;
  return compactLine(trendSummary || `${direction} review map; HTF support not fully aligned.`, 96);
}

function deskPlayHtfTargetLine(play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>): string {
  const ladder = play.htfObjectiveLadder;
  const target = ladder?.nextDraw?.price ?? ladder?.reaction?.price ?? ladder?.appTarget1 ?? null;
  const runner = ladder?.runner?.price ?? ladder?.extension?.price ?? null;
  return `HTF target: ${priceLine(target)} / runner ${priceLine(runner)}`;
}

function deskPlayRunnerLine(play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>): string {
  const ladder = play.htfObjectiveLadder;
  const runner = ladder?.runner?.price ?? ladder?.extension?.price ?? null;
  return `Runner: ${priceLine(runner)}`;
}

function deskPlayBottomLineLine(direction: 'LONG' | 'SHORT' | 'WAIT'): string {
  if (direction === 'WAIT') {
    return 'Bottom line: HTF map only; 5M proof + canExecute. No chase';
  }
  return `Bottom line: HTF frames ${direction}; needs 5M proof, stop, risk, canExecute. No chase`;
}

function deskPlayHtfLineRows(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  currentPrice?: number | null,
): string[] {
  const rows = play.htfProtectedStructureMap?.rows || [];
  const byTimeframe = new Map(rows.map((row) => [String(row.timeframe || '').toUpperCase(), row]));
  return ['4H', '2H', '1H', '15M', '5M'].map((timeframe) => {
    const row = byTimeframe.get(timeframe);
    if (!row) return `${biasEmoji('UNKNOWN')} ${timeframe}: UNKNOWN; changes at N/A`;
    const bias = resolveDeskPlayRowBias(row, currentPrice);
    if (bias === 'RANGE' && isFinitePrice(row.confirmationLine) && isFinitePrice(row.protectedStructure)) {
      return `${biasEmoji(bias)} ${timeframe}: RANGE; bull above ${priceLine(row.confirmationLine)} / bear below ${priceLine(row.protectedStructure)}`;
    }
    const changeLine = isFinitePrice(row.biasChangeLine)
      ? row.biasChangeLine
      : isFinitePrice(row.protectedStructure)
      ? row.protectedStructure
      : isFinitePrice(row.confirmationLine)
      ? row.confirmationLine
      : null;
    return `${biasEmoji(bias)} ${timeframe}: ${bias}; changes at ${priceLine(changeLine)}`;
  });
}

function deskPlayFvgDecisionZoneLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
): string[] {
  const zone = play.fvgDecisionZone;
  if (!zone || !isFinitePrice(zone.lineInSand)) return [];
  const label = compactLine(zone.zoneLabel || 'FVG / imbalance decision zone', 44);
  const state = compactLine(String(zone.state || 'watch').replace(/_/g, ' '), 24);
  const hold = compactLine(String(zone.holdCondition || 'Completed 5M hold/retest required.').replace(/^Hold:\s*/i, ''), 96);
  const fold = compactLine(String(zone.foldCondition || 'Completed acceptance through the zone changes management context.').replace(/^Fold:\s*/i, ''), 96);
  return [
    'FVG Decision Zone:',
    `${label}: ${priceLine(zone.lineInSand)} (${state})`,
    `Why: ${compactLine(zone.whyItMatters || 'Scanner-owned FVG/imbalance line in the sand.', 108)}`,
    `Hold: ${hold}`,
    `Fold: ${fold}`,
    compactLine(zone.managementInstruction || 'FVG is context/management only; 5M proof and canExecute still control.', 118),
    compactLine(zone.noChase || 'No chase. Wait for completed 5M proof.', 96),
  ];
}

function retainedBossZoneLine(zone: CompactRetainedBossZone, label: string): string | null {
  if (!isFinitePrice(zone.lower) || !isFinitePrice(zone.upper)) return null;
  const state = compactLine(String(zone.state || 'alive').replace(/_/g, ' '), 18);
  const formed = zone.formedAt ? ` | formed ${compactLine(zone.formedAt, 24)}` : '';
  return `${label}: ${zoneRangeLine(zone.lower, zone.upper)} (${state})${formed}`;
}

function deskPlayRetainedBossZoneLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
): string[] {
  const ledger = play.retainedBossZones;
  if (!ledger) return [];
  const bull = ledger.bullBoss && ledger.bullBoss.state !== 'invalidated'
    ? retainedBossZoneLine(ledger.bullBoss, 'Bull Final Boss Support')
    : null;
  const bear = ledger.bearBoss && ledger.bearBoss.state !== 'invalidated'
    ? retainedBossZoneLine(ledger.bearBoss, 'Bear Final Boss Resistance')
    : null;
  const zones = [
    ledger.bullBoss && bull ? ledger.bullBoss : null,
    ledger.bearBoss && bear ? ledger.bearBoss : null,
  ].filter((zone): zone is CompactRetainedBossZone => Boolean(zone));
  if (!bull && !bear) return [];
  const details = zones.flatMap((zone) => [
    compactLine(zone.use || 'Retained final-boss FVG context; wait for completed 5M proof before any action.', 112),
    compactLine(zone.invalidation || 'Invalidated only by completed candle acceptance through the zone.', 112),
  ]);
  return [
    'Retained Boss Zones:',
    ...(bull ? [bull] : []),
    ...(bear ? [bear] : []),
    ...details,
  ];
}

function deskPlayQualityLabel(score: number | null | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'unavailable';
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  if (score > 0) return 'low';
  return 'unavailable';
}

function deskPlaySideStrength(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  side: 'LONG' | 'SHORT',
): string {
  const sideBias = side === 'LONG' ? play.longBias : play.shortBias;
  const score = sideBias?.decisionQualityScore ?? sideBias?.rankScore ?? sideBias?.modelConfidenceScore ?? null;
  return `${side} ${typeof score === 'number' && Number.isFinite(score) ? `${Math.round(score)}/100` : 'N/A'} ${deskPlayQualityLabel(score)}`;
}

function deskPlayConflictSummary(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  side: 'LONG' | 'SHORT' | 'WAIT',
  reviewReason?: string | null,
): string {
  const reliability = String(play.htfProtectedStructureMap?.reliability || '').toLowerCase();
  if (reliability === 'data_limited') return 'HTF data-limited; context only';
  if (reviewReason) return reviewReason;
  if (play.htfConflict || play.countertrendWarning) return 'parent context opposes map';
  if (side === 'WAIT') return 'no confirmed active side';
  return 'none flagged';
}

function deskPlayReadinessStatus(reviewOnly: boolean, hasLevels: boolean, highConfidenceConditional = false): string {
  if (highConfidenceConditional) return 'high-confidence conditional - wait for 5M proof';
  if (reviewOnly) return 'watch only - do not execute';
  if (!hasLevels) return 'review map - levels pending';
  return 'review map - wait';
}

function candidateBiasSummary(candidate: SetupCandidate): string {
  const directionWord = candidate.direction === 'SHORT' ? 'bearish' : candidate.direction === 'LONG' ? 'bullish' : 'neutral';
  const rulesetBlockers = [
    ...(candidate.activeRuleset?.timeframeMss?.blockers || []),
    ...(candidate.activeRuleset?.htfLineInSand?.blockers || []),
  ].join(' ');
  if (/opposing.*htf|htf.*conflict|opposing completed.*mss|countertrend/i.test(rulesetBlockers)) {
    return `${candidate.direction} into ${candidate.direction === 'SHORT' ? 'bullish' : 'bearish'} HTF/session structure; manage at reaction level.`;
  }
  const htfState = candidate.htfLiquidityDrawState;
  if (htfState?.classificationReliability === 'data_limited') {
    return 'HTF data-limited; use 5M execution proof only.';
  }
  const scorecardNote = candidate.decisionQualityScorecard?.find((item) =>
    /60M|240M|HTF|higher-timeframe|structure alignment/i.test(`${item.label} ${item.note}`),
  )?.note;
  if (scorecardNote && !/unknown|missing|not confirmed/i.test(scorecardNote)) {
    return compactLine(scorecardNote, 82);
  }
  const levelSummary = candidate.levelContextSummary;
  if (levelSummary) return compactLine(levelSummary, 82);
  return `${candidate.direction} ${directionWord} review from scanner-owned 5M structure.`;
}

function candidateLineInSand(candidate: SetupCandidate): number | null {
  const htfLine = candidate.activeRuleset?.htfLineInSand?.lineInSand;
  if (isFinitePrice(htfLine)) return htfLine;
  const targetPlan = candidate.targetObjectivePlan;
  const reaction = candidateTargetReactionObjective(candidate);
  if (isFinitePrice(reaction?.price)) return reaction.price;
  if (candidate.direction === 'LONG') {
    return targetPlan?.nearestObstacleTarget?.price ??
      targetPlan?.liquidityTarget1?.price ??
      targetPlan?.nearestLiquidityTarget?.price ??
      candidate.entry ??
      null;
  }
  return targetPlan?.nearestObstacleTarget?.price ??
    targetPlan?.liquidityTarget1?.price ??
    targetPlan?.nearestLiquidityTarget?.price ??
    candidate.entry ??
    null;
}

function candidateHtfTargetLine(candidate: SetupCandidate, levels: { target1: number | null; target2: number | null }): string {
  const targetPlan = candidate.targetObjectivePlan;
  const targetObjective = firstMeaningfulTargetObjective(candidate.direction, levels.target2, [
    targetPlan?.nearestLiquidityTarget,
    targetPlan?.liquidityTarget1,
    targetPlan?.liquidityTarget2,
    targetPlan?.liquidityRunnerTarget,
    targetPlan?.runnerTarget,
  ]);
  const runnerObjective = firstMeaningfulTargetObjective(candidate.direction, targetObjective?.price ?? levels.target2, [
    targetPlan?.liquidityTarget2,
    targetPlan?.liquidityRunnerTarget,
    targetPlan?.runnerTarget,
  ]);
  const target = targetObjective?.price ?? candidateTargetReactionObjective(candidate)?.price ?? null;
  const runner = runnerObjective?.price ?? null;
  return `HTF target: ${priceLine(target)} / runner ${priceLine(runner)}`;
}

function candidateHtfContextLine(candidate: SetupCandidate): string | null {
  const state = candidate.htfLiquidityDrawState;
  if (!state?.htfContextSufficiency || !state.classificationReliability) return null;
  const sufficiency = state.htfContextSufficiency.overallStatus === 'data_limited'
    ? 'insufficient'
    : state.htfContextSufficiency.overallStatus;
  return `HTF context: ${sufficiency}; reliability ${state.classificationReliability}.`;
}

function candidateCurrentDeskPlanLines(args: CompactDiscordSummaryArgs, candidate: SetupCandidate, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string[] {
  const levels = appTargetLevels(candidate, normalized);
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const triggerWord = direction === 'SHORT' ? 'BELOW' : 'ABOVE';
  const invalidWord = direction === 'SHORT' ? 'above' : 'below';
  const lineInSand = candidateLineInSand(candidate) ?? candidate.entry ?? null;
  const riskAboveStandard =
    candidate.riskAdvisoryStatus === 'RISK_ABOVE_STANDARD_LIMIT' ||
    candidate.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL' ||
    candidate.blockReason === NoTradeReason.RiskTooWide ||
    (typeof candidate.riskPoints === 'number' && candidate.riskPoints > TRADE_RULES.maxRiskPoints);
  const htfPublishIssue = candidateDiscordHtfPublishIssue(candidate);
  const highConfidenceConditional = isHighConfidenceConditionalCandidate(candidate, normalized);
  const dataLimitedIssue = htfPublishIssue === 'data_limited' ||
    args.deskState?.dataQualityStatus === 'data_limited' ||
    args.deskState?.htfContextStatus === 'insufficient';
  const referenceOnly = dataLimitedIssue && status !== 'EXECUTABLE';
  const statusText = htfPublishIssue === 'opposed'
    ? 'Review only; HTF opposes this side.'
    : htfPublishIssue === 'unconfirmed'
    ? 'Review only; HTF support not confirmed.'
    : dataLimitedIssue
    ? 'Review only; HTF context is data-limited.'
    : riskAboveStandard
    ? 'Risk review only; standard risk gate not clean.'
    : candidate.humanReview?.status === 'HumanReviewReady'
    ? 'Human review only; trader confirmation + canExecute required.'
    : highConfidenceConditional
    ? 'High-confidence conditional trade plan; armed after the named completed 5M condition.'
    : status === 'EXECUTABLE'
      ? 'Executable only while completed 5M trigger + canExecute remain true.'
      : 'Review only until 5M trigger + canExecute.';
  return [
    `${args.instrument} Current Desk Plan`,
    '',
    `Primary: ${primaryPlanLabel(direction)}`,
    `Model: ${professionalCandidateModelLabel(candidate)}`,
    discordPromotionDecisionLine(candidate, normalized, status),
    `Bias: ${biasEmoji(direction === 'LONG' ? 'BULL' : 'BEAR')} ${candidateBiasSummary(candidate)}`,
    ...(candidateHtfContextLine(candidate) ? [candidateHtfContextLine(candidate)!] : []),
    `Line in sand: ${priceLine(lineInSand)}`,
    `Overall play: ${direction} ${triggerWord.toLowerCase()} ${priceLine(lineInSand)}.`,
    `Next trigger: ${compactInstruction(candidate.requiredTrigger || candidate.nextAction, `completed 5M acceptance ${triggerWord.toLowerCase()} ${priceLine(lineInSand)}.`)}`,
    `Invalidation: ${compactInstruction(candidate.invalidation, `invalid ${invalidWord} ${priceLine(levels.stop)}.`)}`,
    `Stand down: ${standDownInstruction(candidate.invalidation, `completed acceptance ${invalidWord} ${priceLine(levels.stop)}.`)}`,
    '',
    sideBreakoutLabel(direction, triggerWord, lineInSand),
    ...(referenceOnly ? [
      'Tactical levels - not execution approval.',
      'Sniper watch: 1M timing only; 5M close/hold required.',
      `Entry: ${priceLine(candidate.entry)}`,
      `Stop: ${priceLine(levels.stop)}`,
      `T1: ${priceLine(levels.target1)}`,
      `T2: ${priceLine(levels.target2)}`,
      'Reason not executable: HTF/data context is limited; canExecute remains false.',
    ] : [
      `Entry: ${priceLine(candidate.entry)}`,
      `Stop: ${priceLine(levels.stop)}`,
      `T1: ${priceLine(levels.target1)}`,
      `T2: ${priceLine(levels.target2)}`,
    ]),
    '',
    ...(args.deskState?.primaryDeskPlay && deskPlayRetainedBossZoneLines(args.deskState.primaryDeskPlay).length ? [
      ...deskPlayRetainedBossZoneLines(args.deskState.primaryDeskPlay),
      '',
    ] : []),
    `Invalid ${invalidWord}: ${priceLine(levels.stop)}`,
    candidateHtfTargetLine(candidate, levels),
    '',
    'Decision support only. No automated orders.',
    '',
    `Status: ${statusText}`,
    deskPlayChartStatusLine({
      hasChart: args.attachments.chartPlan,
      hasLevels: Boolean(candidate.entry != null && levels.stop != null && levels.target1 != null && levels.target2 != null),
    }),
  ];
}

function deskPlayChartStatusLine(args: {
  hasChart: boolean;
  hasLevels: boolean;
}): string {
  if (args.hasChart && args.hasLevels) return 'Chart: attached.';
  if (args.hasChart) return 'Chart: attached; levels pending.';
  if (args.hasLevels) return 'Chart: missing; app-owned levels require chart before Discord post.';
  return 'Chart: not attached; waiting on app-owned levels.';
}

function hardBlockedDeskState(value: string): boolean {
  return /(^|[_\s-])(blocked|failed|not_aligned)([_\s-]|$)/i.test(value);
}

function deskPlayBiasForDirection(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
) {
  return direction === 'LONG' ? play.longBias : play.shortBias;
}

function compactInstruction(value: string | null | undefined, fallback: string): string {
  const cleaned = (value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[A-Z][A-Za-z0-9\s/+&-]{6,90}:\s+/, '');
  return cleaned || fallback;
}

function standDownInstruction(value: string | null | undefined, fallback: string): string {
  return compactInstruction(value, fallback).replace(/^invalid\s+if\s+/i, '');
}

function deskPlayStandDownLine(args: {
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>;
  deskState?: CompactDeskStateForDiscord;
  direction: 'LONG' | 'SHORT' | 'WAIT';
  lineInSand: number | null;
}): string {
  const bias = args.direction === 'LONG' || args.direction === 'SHORT'
    ? deskPlayBiasForDirection(args.play, args.direction)
    : null;
  if (args.direction === 'WAIT') return 'Stand down: no single primary side is active.';
  if (args.deskState?.dataQualityStatus === 'data_limited') return 'Stand down: data quality is limited.';
  if (bias?.tradeReadiness?.status === 'missed_no_chase') return 'Stand down: move is missed/no-chase until fresh completed 5M proof forms.';
  if (bias?.tradeReadiness?.status === 'blocked') return `Stand down: ${compactInstruction(bias.tradeReadiness.reason, 'primary side is blocked.')}`;
  if (args.play.activeTacticalZone?.direction === args.direction && args.play.activeTacticalZone.standDown) {
    return `Stand down: ${standDownInstruction(args.play.activeTacticalZone.standDown, 'active tactical zone failed.')}`;
  }
  if (args.play.activeTacticalLine?.direction === args.direction && args.play.activeTacticalLine.migrated && args.play.activeTacticalLine.standDown) {
    return `Stand down: ${standDownInstruction(args.play.activeTacticalLine.standDown, 'active tactical line failed.')}`;
  }
  const invalidation = args.play.invalidation || args.deskState?.invalidation || null;
  if (invalidation) return `Stand down: ${standDownInstruction(invalidation, 'primary invalidation is active.')}`;
  if (typeof args.lineInSand === 'number') {
    return args.direction === 'LONG'
      ? `Stand down: completed acceptance below ${priceLine(args.lineInSand)}.`
      : `Stand down: completed acceptance above ${priceLine(args.lineInSand)}.`;
  }
  return 'Stand down: completed 5M proof is missing or canExecute remains false.';
}

function deskPlayLineDisplayLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
  activeLine: number | null,
): string[] {
  if (direction !== 'LONG' && direction !== 'SHORT') return [`Line in sand: ${priceLine(activeLine)}`];
  const active = play.activeTacticalLine;
  const originalLine = deskPlayOriginalLine(play);
  if (active?.direction === direction && active.migrated && isFinitePrice(active.activeLine)) {
    const timeframes = Array.isArray(active.supportingTimeframes) && active.supportingTimeframes.length
      ? active.supportingTimeframes.join('+')
      : '5M/15M';
    return [
      `Original campaign line: ${priceLine(originalLine)}`,
      `Active tactical line: ${priceLine(active.activeLine)}`,
      `Line migration: ${priceLine(originalLine)} -> ${priceLine(active.activeLine)} via ${timeframes} structure.`,
    ];
  }
  return [`Line in sand: ${priceLine(activeLine)}`];
}

function deskPlayActiveTacticalZoneLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const zone = play.activeTacticalZone;
  if (direction !== 'LONG' && direction !== 'SHORT') return [];
  if (!zone || zone.direction !== direction || !isFinitePrice(zone.lower) || !isFinitePrice(zone.upper)) return [];
  const lower = zone.lower as number;
  const upper = zone.upper as number;
  const zoneText = Math.abs(lower - upper) < 0.0001 ? priceLine(lower) : `${priceLine(lower)}-${priceLine(upper)}`;
  const state = compactLine(String(zone.state || 'watch').replace(/_/g, ' '), 24);
  const label = compactLine(zone.zoneLabel || 'tactical decision zone', 52);
  return [
    `Active tactical zone: ${zoneText} (${label}; ${state})`,
    ...(zone.migrated && isFinitePrice(zone.migratedFromLine)
      ? [`Zone migration: ${priceLine(zone.migratedFromLine)} -> ${zoneText}; fresh decision area, not execution approval.`]
      : []),
    `Zone trigger: ${compactInstruction(zone.nextTrigger, 'completed 5M hold/retest through the active tactical zone.')}`,
    `Zone no chase: ${compactInstruction(zone.noChase, 'do not chase away from the active tactical zone.')}`,
  ];
}

function zoneRangeLine(lower: number | null | undefined, upper: number | null | undefined): string {
  if (!isFinitePrice(lower) || !isFinitePrice(upper)) return 'N/A';
  return Math.abs((lower as number) - (upper as number)) < 0.0001
    ? priceLine(lower)
    : `${priceLine(lower)}-${priceLine(upper)}`;
}

function deskPlayHtfFvgCascadeLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const cascade = play.htfFvgCascade;
  const displayDirection = direction === 'LONG' || direction === 'SHORT'
    ? direction
    : cascade?.direction === 'LONG' || cascade?.direction === 'SHORT'
    ? cascade.direction
    : null;
  if (!displayDirection) return [];
  if (!cascade || cascade.direction !== displayDirection) return [];
  const parent = cascade.parentZone;
  const child = cascade.childExecutionZone;
  if (!parent && !child) return [];
  const parentLine = parent
    ? `Parent FVG: ${compactLine(parent.timeframe || 'HTF', 8)} ${zoneRangeLine(parent.lower, parent.upper)} (${compactLine(parent.label || 'parent imbalance', 44)}; ${compactLine(String(parent.state || 'watch').replace(/_/g, ' '), 20)})`
    : 'Parent FVG: none mapped; using native 5M tactical zone.';
  const childLine = child
    ? `5M route: ${child.source === 'native_5m_fvg' ? 'native 5M FVG' : 'parent zone + 5M trigger'} ${zoneRangeLine(child.lower, child.upper)}.`
    : '5M route: wait for completed 5M trigger inside/around parent zone.';
  const trigger = compactInstruction(child?.triggerNeeded || cascade.routingSummary, 'wait for completed 5M proof inside/around the parent zone.');
  return [
    'HTF FVG Cascade:',
    parentLine,
    childLine,
    `Trigger: ${trigger}`,
    compactLine(cascade.standDown || 'Stand down if parent zone fails on completed 5M proof.', 108),
  ];
}

function deskPlayHtfRegimeLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  if (direction !== 'LONG' && direction !== 'SHORT') return [];
  const active = play.activeTacticalLine;
  if (!(active?.direction === direction && active.migrated)) return [];
  const rows = play.htfProtectedStructureMap?.rows || [];
  const order = ['4H', '2H', '1H', '15M', '5M'];
  const byTf = new Map(rows.map((row) => [String(row.timeframe || '').toUpperCase(), row]));
  const regime = order
    .map((tf) => {
      const row = byTf.get(tf);
      const bias = row ? resolveDeskPlayRowBias(row) : 'UNKNOWN';
      return `${tf} ${bias}`;
    })
    .join(' / ');
  return [`HTF regime: ${regime}`];
}

function deskPlayMainInstructionLines(args: {
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>;
  deskState?: CompactDeskStateForDiscord;
  direction: 'LONG' | 'SHORT' | 'WAIT';
  lineInSand: number | null;
}): string[] {
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') {
    const activeSide = args.play.direction === 'LONG' || args.play.direction === 'SHORT' ? args.play.direction : null;
    const activeBias = activeSide ? deskPlayBiasForDirection(args.play, activeSide) : null;
    const waitTrigger = activeBias?.tradeReadiness?.action ||
      activeBias?.tradeReadiness?.reason ||
      args.play.nextTrigger ||
      args.deskState?.nextTrigger;
    return [
      'Overall play: WAIT.',
      `Next trigger: ${compactInstruction(waitTrigger, 'wait for one primary side with completed 5M proof.')}`,
      'Invalidation: N/A until a primary side is active.',
      deskPlayStandDownLine(args),
    ];
  }
  const triggerWord = args.direction === 'LONG' ? 'above' : 'below';
  const activeLine = args.play.activeTacticalLine?.direction === args.direction && args.play.activeTacticalLine.migrated
    ? args.play.activeTacticalLine
    : null;
  const activeZone = args.play.activeTacticalZone?.direction === args.direction
    ? args.play.activeTacticalZone
    : null;
  const nextTrigger = activeZone?.nextTrigger || activeLine?.nextTrigger || args.play.nextTrigger || args.deskState?.nextTrigger || `completed 5M acceptance ${triggerWord} ${priceLine(args.lineInSand)}.`;
  const invalidation = args.play.invalidation || args.deskState?.invalidation || (
    args.direction === 'LONG'
      ? `completed acceptance below ${priceLine(args.lineInSand)}.`
      : `completed acceptance above ${priceLine(args.lineInSand)}.`
  );
  return [
    `Overall play: ${args.direction} ${triggerWord} ${priceLine(args.lineInSand)}.`,
    `Next trigger: ${compactInstruction(nextTrigger, `completed 5M acceptance ${triggerWord} ${priceLine(args.lineInSand)}.`)}`,
    `Invalidation: ${compactInstruction(invalidation, 'primary invalidation is not available.')}`,
    deskPlayStandDownLine(args),
  ];
}

function deskPlayCurrentPlanLines(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT' | 'WAIT'): string[] {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) {
    return [
      `${args.instrument} Current Desk Plan`,
      '',
      `Primary: ${primaryPlanLabel('WAIT')}`,
      'Bias: No DeskState play available.',
      'Line in sand: N/A',
      '',
      'Status: Review only until 5M trigger + canExecute.',
      deskPlayChartStatusLine({ hasChart: args.attachments.chartPlan, hasLevels: false }),
    ];
  }
  const sidePresentationSafety = (side: 'LONG' | 'SHORT'): { reviewOnly: boolean; reason: string | null; highConfidenceConditional: boolean } => {
    const sideBias = side === 'LONG' ? play.longBias : play.shortBias;
    const sideScore = sideBias?.decisionQualityScore ?? null;
    const rows = play.htfProtectedStructureMap?.rows || [];
    const opposingRows = rows.filter((row) => {
      const bias = resolveDeskPlayRowBias(row, args.currentPrice);
      return (side === 'LONG' && bias === 'BEAR') || (side === 'SHORT' && bias === 'BULL');
    }).length;
    const trendDirection = play.trendConfirmation?.direction;
    const trendOpposes = (side === 'LONG' && trendDirection === 'SHORT') || (side === 'SHORT' && trendDirection === 'LONG');
    const lowQuality = typeof sideScore === 'number' && sideScore < 55;
    const htfOpposes = trendOpposes || (rows.length > 0 && opposingRows > rows.length / 2);
    const dataLimited = args.deskState?.dataQualityStatus === 'data_limited' || args.deskState?.htfContextStatus === 'insufficient';
    const reviewOnly = args.deskState?.canExecute !== true && (dataLimited || lowQuality || htfOpposes);
    const highConfidenceConditional = args.deskState?.canExecute !== true &&
      typeof sideScore === 'number' &&
      sideScore >= 85;
    const reason = htfOpposes
      ? 'HTF/structure opposes this side'
      : dataLimited
        ? 'HTF/data context is limited; execution promotion is blocked'
      : lowQuality
        ? 'side quality is low'
        : null;
    return { reviewOnly, reason, highConfidenceConditional };
  };
  const deskPlayDecisionClassLine = (
    safety: { reviewOnly: boolean; reason: string | null; highConfidenceConditional: boolean },
  ): string => {
    if (args.deskState?.canExecute === true) return 'Decision class: TRUE EXECUTION APPROVED - app-owned canExecute=true.';
    if (safety.highConfidenceConditional) {
      return 'Decision class: HIGH-CONFIDENCE CONDITIONAL - publish prominently; execution arms only after the named completed 5M condition.';
    }
    if (safety.reviewOnly) return 'Decision class: REVIEW ONLY - wait for completed 5M proof + canExecute.';
    return 'Decision class: WAIT - no executable approval.';
  };
  const sideLinesFor = (side: 'LONG' | 'SHORT', options: { suppressPendingLevels?: boolean } = {}): { lines: string[]; hasLevels: boolean } => {
    const line = deskPlayLineForDirection(play, side);
    const levels = deskPlayDecisionMapLevels(args.normalized, side, line, play, args.currentPrice);
    const triggerWord = side === 'LONG' ? 'ABOVE' : 'BELOW';
    const safety = sidePresentationSafety(side);
    if (!levels) {
      return {
        hasLevels: false,
        lines: options.suppressPendingLevels
          ? [
              sideBreakoutLabel(side, triggerWord, line),
              'No complete app-owned plan on this side.',
            ]
          : [
              sideBreakoutLabel(side, triggerWord, line),
              'Entry: pending',
              'Stop: pending',
              'T1: pending',
              'T2: pending',
            ],
      };
    }
    if (safety.highConfidenceConditional) {
      return {
        hasLevels: true,
        lines: [
          sideBreakoutLabel(side, triggerWord, line),
          'High-confidence conditional trade plan - wait on the named completed 5M condition.',
          'Execution gate: armed only after that condition closes; not early-entry approval.',
          `Entry: ${priceLine(levels.entry)}`,
          `Stop: ${priceLine(levels.stop)}`,
          `T1: ${priceLine(levels.target1)}`,
          `T2: ${priceLine(levels.target2)}`,
          ...(safety.reason ? [`Caution: ${safety.reason}.`] : []),
        ],
      };
    }
    if (safety.reviewOnly) {
      const reviewLabel = safety.highConfidenceConditional
        ? 'High-confidence conditional trade plan - wait on the named completed 5M condition.'
        : 'Review levels only - not an executable trade plan.';
      const proofLabel = safety.highConfidenceConditional
        ? 'Execution gate: armed only after that condition closes; not early-entry approval.'
        : 'Sniper watch: 1M timing only; 5M close/hold required.';
      return {
        hasLevels: true,
        lines: [
          sideBreakoutLabel(side, triggerWord, line),
          reviewLabel,
          proofLabel,
          `Entry: ${priceLine(levels.entry)}`,
          `Stop: ${priceLine(levels.stop)}`,
          `T1: ${priceLine(levels.target1)}`,
          `T2: ${priceLine(levels.target2)}`,
          ...(safety.reason ? [`Reason: ${safety.reason}.`] : []),
        ],
      };
    }
    return {
      hasLevels: true,
      lines: [
        sideBreakoutLabel(side, triggerWord, line),
        `Entry: ${priceLine(levels.entry)}`,
        `Stop: ${priceLine(levels.stop)}`,
        `T1: ${priceLine(levels.target1)}`,
        `T2: ${priceLine(levels.target2)}`,
      ],
    };
  };
  const readinessLinesFor = (
    mapSide: 'LONG' | 'SHORT' | 'WAIT',
    safety: { reviewOnly: boolean; reason: string | null; highConfidenceConditional: boolean },
    hasLevels: boolean,
  ): string[] => {
    return [
      `Map Side: ${mapSide === 'WAIT' ? 'WAIT N/A' : deskPlaySideStrength(play, mapSide)}`,
      `Conflict: ${deskPlayConflictSummary(play, mapSide, safety.reason)}`,
      `Readiness: ${deskPlayReadinessStatus(safety.reviewOnly, hasLevels, safety.highConfidenceConditional)}`,
    ];
  };
  if (direction !== 'LONG' && direction !== 'SHORT') {
    const longWait = sideLinesFor('LONG');
    const shortWait = sideLinesFor('SHORT');
    const waitHasOneCompleteSide = longWait.hasLevels !== shortWait.hasLevels;
    const longWaitDisplay = waitHasOneCompleteSide && !longWait.hasLevels ? sideLinesFor('LONG', { suppressPendingLevels: true }) : longWait;
    const shortWaitDisplay = waitHasOneCompleteSide && !shortWait.hasLevels ? sideLinesFor('SHORT', { suppressPendingLevels: true }) : shortWait;
    const waitMapSide = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : 'WAIT';
    const waitPrimarySafety = play.direction === 'LONG' || play.direction === 'SHORT'
      ? sidePresentationSafety(play.direction)
      : { reviewOnly: false, reason: null, highConfidenceConditional: false };
    const waitStatusLine = waitPrimarySafety.reviewOnly
      ? waitPrimarySafety.highConfidenceConditional
        ? `Status: High-confidence conditional trade plan; ${waitPrimarySafety.reason || 'completed 5M proof missing'}. Armed only after the named completed 5M condition.`
        : `Status: Review levels only - not executable; ${waitPrimarySafety.reason || 'completed 5M proof missing'}. Wait for completed 5M trigger + canExecute.`
      : waitPrimarySafety.highConfidenceConditional
        ? 'Status: High-confidence conditional trade plan; armed only after the named completed 5M condition.'
      : 'Status: Review only until 5M trigger + canExecute.';
    const waitHasReferenceLevels = waitPrimarySafety.reviewOnly && (longWait.hasLevels || shortWait.hasLevels);
    const waitHtfRows = deskPlayHtfLineRows(play, args.currentPrice);
    const waitUsefulHtfRows = waitHtfRows.some((row) => !/UNKNOWN;\s*changes at N\/A/i.test(row)) ? waitHtfRows : [];
    return [
      `${args.instrument} Current Desk Plan`,
      '',
      `Primary: ${primaryPlanLabel(deskPlayPrimaryLabel(play, direction))}`,
      deskPlayDecisionClassLine(waitPrimarySafety),
      `Bias: ${deskPlayBiasSummary(play, direction, args.currentPrice)}`,
      ...deskPlayHtfRegimeLines(play, waitMapSide),
      ...deskPlayLineDisplayLines(
        play,
        waitMapSide,
        play.lineInSand ?? deskPlayLineForDirection(play, waitMapSide === 'WAIT' ? 'LONG' : waitMapSide),
      ),
      ...deskPlayActiveTacticalZoneLines(play, waitMapSide),
      ...deskPlayHtfFvgCascadeLines(play, waitMapSide),
      ...deskPlayMainInstructionLines({
        play,
        deskState: args.deskState,
        direction: waitMapSide,
        lineInSand: play.lineInSand ?? deskPlayLineForDirection(play, waitMapSide === 'WAIT' ? 'LONG' : waitMapSide),
      }),
      ...readinessLinesFor(waitMapSide, waitPrimarySafety, longWait.hasLevels || shortWait.hasLevels),
      '',
      ...(waitUsefulHtfRows.length ? ['HTF Lines:', ...waitUsefulHtfRows] : []),
      ...(deskPlayFvgDecisionZoneLines(play).length ? ['', ...deskPlayFvgDecisionZoneLines(play)] : []),
      ...(deskPlayRetainedBossZoneLines(play).length ? ['', ...deskPlayRetainedBossZoneLines(play)] : []),
      '',
      ...longWaitDisplay.lines,
      '',
      ...shortWaitDisplay.lines,
      '',
      'No active LONG/SHORT plan with complete app-owned levels.',
      deskPlayHtfTargetLine(play),
      deskPlayRunnerLine(play),
      deskPlayBottomLineLine(direction),
      '',
      'Decision support only. No automated orders.',
      waitStatusLine,
      deskPlayChartStatusLine({ hasChart: args.attachments.chartPlan, hasLevels: waitHasReferenceLevels }),
    ];
  }
  const lineInSand = deskPlayLineForDirection(play, direction);
  const invalidWord = direction === 'LONG' ? 'below' : 'above';
  const primary = sideLinesFor(direction);
  const opposite = sideLinesFor(direction === 'LONG' ? 'SHORT' : 'LONG', { suppressPendingLevels: primary.hasLevels });
  const primaryLevels = deskPlayDecisionMapLevels(args.normalized, direction, lineInSand, play, args.currentPrice);
  const primarySafety = sidePresentationSafety(direction);
  const htfRows = deskPlayHtfLineRows(play, args.currentPrice);
  const usefulHtfRows = htfRows.some((row) => !/UNKNOWN;\s*changes at N\/A/i.test(row)) ? htfRows : [];
  const statusLine = primarySafety.reviewOnly
    ? primarySafety.highConfidenceConditional
      ? `Status: High-confidence conditional trade plan; ${primarySafety.reason || 'completed 5M proof missing'}. Armed only after the named completed 5M condition.`
      : `Status: Review levels only - not executable; ${primarySafety.reason || 'completed 5M proof missing'}. Wait for completed 5M trigger + canExecute.`
    : primarySafety.highConfidenceConditional
      ? 'Status: High-confidence conditional trade plan; armed only after the named completed 5M condition.'
    : 'Status: Review only until 5M trigger + canExecute.';
  return [
    `${args.instrument} Current Desk Plan`,
    '',
    `Primary: ${primaryPlanLabel(direction)}`,
    deskPlayDecisionClassLine(primarySafety),
    `Bias: ${deskPlayBiasSummary(play, direction, args.currentPrice)}`,
    ...deskPlayHtfRegimeLines(play, direction),
    ...deskPlayLineDisplayLines(play, direction, lineInSand),
    ...deskPlayActiveTacticalZoneLines(play, direction),
    ...deskPlayHtfFvgCascadeLines(play, direction),
    ...deskPlayMainInstructionLines({
      play,
      deskState: args.deskState,
      direction,
      lineInSand,
    }),
    ...(primarySafety.highConfidenceConditional ? [] : readinessLinesFor(direction, primarySafety, primary.hasLevels || opposite.hasLevels)),
    '',
    ...(usefulHtfRows.length ? ['HTF Lines:', ...usefulHtfRows] : []),
    ...(deskPlayFvgDecisionZoneLines(play).length ? ['', ...deskPlayFvgDecisionZoneLines(play)] : []),
    ...(deskPlayRetainedBossZoneLines(play).length ? ['', ...deskPlayRetainedBossZoneLines(play)] : []),
    '',
    ...primary.lines,
    '',
    ...opposite.lines,
    '',
    `Invalid ${invalidWord}: ${primaryLevels ? priceLine(primaryLevels.stop) : 'pending'}`,
    deskPlayHtfTargetLine(play),
    deskPlayRunnerLine(play),
    deskPlayBottomLineLine(direction),
    '',
    'Decision support only. No automated orders.',
    statusLine,
    deskPlayChartStatusLine({ hasChart: args.attachments.chartPlan, hasLevels: primary.hasLevels || opposite.hasLevels }),
  ];
}

function deskPlayHasCompletePlanningLevels(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT'): boolean {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) return false;
  const line = deskPlayLineForDirection(play, direction);
  return Boolean(deskPlayDecisionMapLevels(args.normalized, direction, line, play, args.currentPrice));
}

function deskPlayHeadlineDirection(args: CompactDiscordSummaryArgs): 'LONG' | 'SHORT' | 'WAIT' {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) return 'WAIT';
  if (play.direction !== 'LONG' && play.direction !== 'SHORT') {
    const promotedCandidate = args.deskState?.discordAction === 'post_conditional'
      ? args.candidates.find((candidate) => (
          (candidate.direction === 'LONG' || candidate.direction === 'SHORT') &&
          isHighConfidenceConditionalCandidate(candidate, args.normalized) &&
          deskPlayHasCompletePlanningLevels(args, candidate.direction)
        ))
      : null;
    return promotedCandidate?.direction === 'LONG' || promotedCandidate?.direction === 'SHORT' ? promotedCandidate.direction : 'WAIT';
  }
  const bias = play.direction === 'LONG' ? play.longBias : play.shortBias;
  const hasCompleteLevels = deskPlayHasCompletePlanningLevels(args, play.direction);
  if (bias?.state !== 'primary') {
    return args.deskState?.discordAction === 'post_conditional' && hasCompleteLevels ? play.direction : 'WAIT';
  }
  return hasCompleteLevels ? play.direction : 'WAIT';
}

function deskPlayPrimaryLabel(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null | undefined,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string {
  if (direction === 'LONG' || direction === 'SHORT') return direction;
  if (play?.direction === 'LONG' || play?.direction === 'SHORT') {
    const bias = play.direction === 'LONG' ? play.longBias : play.shortBias;
    const stateText = `${bias?.state || ''} ${bias?.tradeReadiness?.status || ''} ${bias?.executableConsideration?.status || ''}`;
    if (hardBlockedDeskState(stateText)) return `WAIT / ${play.direction} FAILED`;
    if (bias?.state === 'primary') return `WAIT / ${play.direction} REVIEW`;
  }
  return 'WAIT';
}

function scannerDeskPlayDiscordSummary(args: CompactDiscordSummaryArgs): DiscordWebhookPayload {
  const play = args.deskState?.primaryDeskPlay;
  const sessionLabel = sessionShortLabel(args.session);
  const direction = deskPlayHeadlineDirection(args);
  const lines = deskPlayCurrentPlanLines(args, direction);
  const components = args.components || defaultOutcomeComponentsForSummary(args, direction === 'WAIT' ? null : direction);
  const headline = deskPlayPrimaryLabel(play, direction);
  return {
    username: 'Quant Desk',
    content: `🟠 [${sessionLabel} DESK PLAY] ${args.instrument} - ${headline} | ${args.tradeDate}`,
    embeds: [
      {
        title: `${args.instrument} Current Desk Plan`,
        description: professionalizeReportText(lines.join('\n')),
        color: direction === 'LONG' ? 0x00a86b : direction === 'SHORT' ? 0xff6d00 : 0xffa000,
        fields: [],
        footer: { text: 'Quant Desk • Scanner DeskState play • Not execution approval' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(components?.length ? { components } : {}),
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
  const direction = compactTradeDirection(bestCandidate, args.normalized);
  const decision = compactSessionDecisionLabel(bestCandidate, args.normalized, args.decisionOverride);
  const designerStatus = reportStatus(bestCandidate, args.normalized, args.statusOverride || args.decisionOverride);
  const highConfidenceConditional = isHighConfidenceConditionalCandidate(bestCandidate, args.normalized);
  const finalStatus = designerStatus === 'EXECUTABLE'
    ? requestedStatus
    : designerStatus === 'NO TRADE'
      ? TradeDecisionStatus.NoTrade
      : isExplicitReviewCandidate(bestCandidate) && requestedStatus === TradeDecisionStatus.NoTrade
        ? TradeDecisionStatus.ConditionalTrade
        : TradeDecisionStatus.Wait;
  const model = bestCandidate ? professionalCandidateModelLabel(bestCandidate) : 'No registered active model candidate';
  const reportKind = designerStatus === 'EXECUTABLE' ? 'PLAN' : 'REVIEW';
  const sessionLabel = sessionShortLabel(args.session);
  const headlineDirection = designerStatus === 'NO TRADE' ? 'NO TRADE' : direction;
  const safeDecision = designerStatus === 'EXECUTABLE'
    ? decision.toUpperCase()
    : highConfidenceConditional
      ? 'HIGH-CONFIDENCE CONDITIONAL'
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
  const bestLevels = bestCandidate ? appTargetLevels(bestCandidate, args.normalized) : null;
  const bestCandidateHasFullPlan = Boolean(
    bestCandidate?.entry != null &&
    bestLevels?.stop != null &&
    bestLevels?.target1 != null &&
    bestLevels?.target2 != null
  );
  const includeMemory = designerStatus === 'EXECUTABLE' || bestCandidateHasFullPlan;

  const lines = bestCandidate && designerStatus !== 'NO TRADE'
    ? bestCandidateHasFullPlan
      ? candidateCurrentDeskPlanLines(args, bestCandidate, args.normalized, designerStatus)
      : [
          ...compactGeneralAlertLines(args, bestCandidate, args.normalized, designerStatus),
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

  const defaultComponents = defaultOutcomeComponentsForSummary(args, designerStatus === 'NO TRADE' ? null : direction === 'LONG' || direction === 'SHORT' ? direction : null);
  const components = args.components || defaultComponents;
  const includeComponents = Boolean(components?.length);
  const payload: DiscordWebhookPayload = {
    username: 'Quant Desk',
    content: `${statusEmoji(finalStatus)} ${designerRecommendation.headlineRecommendation}`,
    embeds: [
      {
        title: bestCandidate && designerStatus !== 'NO TRADE' && bestCandidateHasFullPlan
          ? `${args.instrument} Current Desk Plan`
          : 'Compact Trade Plan Summary',
        description: professionalizeReportText(lines.join('\n')),
        color: statusColor(finalStatus),
        fields: [],
        footer: { text: '' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(includeComponents ? { components } : {}),
  };
  const maxMainText = args.attachments.chartPlan || args.attachments.priceLevelMap ? 1550 : 1900;
  if (bestCandidate && !bestCandidateHasFullPlan && designerStatus !== 'NO TRADE' && designerStatus !== 'EXECUTABLE' && flattenDiscordPayloadText(payload).length > maxMainText) {
    const shortLines = [
      `Status: ${statusLine(designerStatus, bestCandidate, args.normalized)}`,
      '',
      `Model: ${compactLine(model, 42)}`,
      `Entry: ${priceLine(bestCandidate.entry)} | Stop: ${priceLine(bestLevels?.stop ?? null)} | Risk: ${numberLine(bestCandidate.riskPoints)} pts`,
      `T1/T2: ${priceLine(bestLevels?.target1 ?? null)} / ${priceLine(bestLevels?.target2 ?? null)}`,
      ...(isFinitePrice(bestCandidate.activeRuleset?.htfLineInSand?.lineInSand)
        ? [`Line: ${priceLine(bestCandidate.activeRuleset?.htfLineInSand?.lineInSand)}`]
        : []),
      '',
      'Trigger:',
      compactLine(bestCandidate.requiredTrigger || bestCandidate.nextAction || 'Wait for completed 5M trigger.', 78),
      'No chase. Completed 5M proof + protected structure required.',
      '',
      'Invalid:',
      compactLine(bestCandidate.invalidation || args.normalized.invalidation || 'Invalidation unavailable.', 90),
      '',
      compactAttachmentLine(args.attachments, true),
      'Boundary: canExecute unchanged; no orders.',
    ];
    return {
      ...payload,
      embeds: [
        {
          ...payload.embeds[0],
          description: professionalizeReportText(shortLines.join('\n')),
        },
      ],
    };
  }
  return payload;
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
  const policy = classifyDiscordMessageText(mainText);
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
  const hasCurrentDeskPlanLevels =
    policy.category === 'current_desk_plan' &&
    /\bEntry:\s*\d+\.\d{2}\b/i.test(mainText) &&
    /\bStop:\s*\d+\.\d{2}\b/i.test(mainText) &&
    /\bT1:\s*\d+\.\d{2}\b/i.test(mainText) &&
    /\bT2:\s*\d+\.\d{2}\b/i.test(mainText);
  if (policy.requiresChartWhenLevelsPresent && hasCurrentDeskPlanLevels && validFiles.length === 0) {
    throw new Error('Discord payload blocked: Current Desk Plan with app-owned levels requires an attached chart.');
  }
  if (policy.requiresRagButtons && (!payload.components || payload.components.length === 0)) {
    throw new Error(`Discord payload blocked: ${policy.category} requires RAG outcome buttons.`);
  }
  const hasDeskPlaySingleChart = /watch chart attached|review(?:[- ]only)?(?: chart)? attached|chart:\s*(?:review|attached)|current desk plan/i.test(mainText);
  if (validFiles.length > 0 && validFiles.length < 2 && !hasDeskPlaySingleChart) {
    console.warn('Discord payload warning: only one trade-plan image attachment is present. Expected Chart Plan + Price Level Map when a candidate exists.');
  }
  if (validFiles.length > 0 && mainText.length > 1900) {
    throw new Error(`Discord payload blocked: trade-plan compact alert text is ${mainText.length} characters; keep image-backed trade alerts under 1900.`);
  }
  if (mainText.length > 1200) {
    console.warn(`Discord payload warning: compact alert text is ${mainText.length} characters; preferred normal output is under 1200.`);
  }
}
