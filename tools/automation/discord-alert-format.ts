import { roundToTradeTick, targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { candidateTargetReactionObjective } from '../../src/lib/localScannerEngine';
import { NoTradeReason, SetupType, TradeDecisionStatus, type SetupCandidate } from '../../src/types';
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
import { buildOutcomeComponents, loadCanonicalDiscordOutcomeSecretFromEnvLocal } from './discord-outcome-buttons';
import { assertDiscordArtifactsPassLint } from './discord-artifact-lint';

export { BANNED_ACTIVE_DISCORD_ALERT_TEXT } from './discord-artifact-lint';

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
  bestLongPlan?: CompactDeskLifecyclePlan | null;
  bestShortPlan?: CompactDeskLifecyclePlan | null;
  selectedCandidate?: CompactDeskLifecyclePlan | null;
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
    htfFvgReactionMemory?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | string | null;
      activeReaction?: {
        sourceOfTruth?: string;
        direction?: 'LONG' | 'SHORT' | string;
        timeframe?: string | null;
        lower?: number | null;
        upper?: number | null;
        midpoint?: number | null;
        formedAt?: string | null;
        state?: string | null;
        latestReaction?: {
          timestamp?: string | null;
          state?: string | null;
          close?: number | null;
          evidence?: string | null;
        } | null;
      } | null;
      childConfirmation?: {
        direction?: 'LONG' | 'SHORT' | string;
        timeframe?: string | null;
        lower?: number | null;
        upper?: number | null;
        midpoint?: number | null;
        formedAt?: string | null;
        state?: string | null;
        evidence?: string[];
      } | null;
      parentZones?: Array<{
        direction?: 'LONG' | 'SHORT' | string;
        timeframe?: string | null;
        lower?: number | null;
        upper?: number | null;
        midpoint?: number | null;
        formedAt?: string | null;
        confidence?: string | null;
        state?: string | null;
        latestReaction?: {
          timestamp?: string | null;
          state?: string | null;
          close?: number | null;
          evidence?: string | null;
        } | null;
        lifecycle?: {
          state?: string | null;
          touchCount?: number | null;
          latestTouchAt?: string | null;
          deepestMitigationPercent?: number | null;
        } | null;
      }>;
      summary?: string | null;
      parentStackSummary?: string | null;
    } | null;
    htfFvgReactionRouting?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      status?: string | null;
      lineInSand?: number | null;
      lineLabel?: string | null;
      lifecycleState?: string | null;
      standDown?: string | null;
      reason?: string | null;
    } | null;
    htfFvgMicroMssProof?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      htfFvgProof?: {
        status?: string | null;
        timeframe?: string | null;
        zoneLower?: number | null;
        zoneUpper?: number | null;
        lifecycleState?: string | null;
        evidence?: string[];
      } | null;
      fiveMinuteTriggerProof?: {
        status?: string | null;
        lineInSand?: number | null;
        evidence?: string[];
      } | null;
      protectedSwingProof?: {
        status?: string | null;
        stop?: number | null;
        evidence?: string[];
      } | null;
      promotionReadiness?: string | null;
      summary?: string | null;
    } | null;
    htfFvgParentReactionWatch?: {
      sourceOfTruth?: string;
      eligible?: boolean;
      direction?: 'LONG' | 'SHORT' | string;
      lineInSand?: number | null;
      lineLabel?: string | null;
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
      status?: string | null;
      requiredProof?: string | null;
      reason?: string | null;
      standDown?: string | null;
      approvalBoundary?: {
        changesTradeApprovals?: boolean;
        changesCanExecute?: boolean;
        changesEntryStopTargets?: boolean;
        changesRiskRules?: boolean;
        changesRanking?: boolean;
        createsNewModel?: boolean;
      } | null;
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
    freshReentryWatch?: {
      sourceOfTruth?: string;
      eligible?: boolean;
      direction?: 'LONG' | 'SHORT' | string;
      lineInSand?: number | null;
      requiredProof?: string | null;
      reason?: string | null;
      staleEntryReason?: string | null;
      oldEntry?: number | null;
      oldStop?: number | null;
      oldTarget1?: number | null;
      oldTarget2?: number | null;
      parentZone?: {
        timeframe?: string | null;
        lower?: number | null;
        upper?: number | null;
        state?: string | null;
      } | null;
      childZone?: {
        lower?: number | null;
        upper?: number | null;
        entry?: number | null;
        stop?: number | null;
        target1?: number | null;
        target2?: number | null;
      } | null;
      nextStep?: string | null;
      levelsStatus?: string | null;
    } | null;
    freshReentryCandidates?: {
      sourceOfTruth?: string;
      approvalStatus?: string;
      direction?: 'LONG' | 'SHORT' | string | null;
      blockers?: string[];
      bestCandidate?: {
        direction?: 'LONG' | 'SHORT' | string;
        status?: string;
        source?: string;
        entry?: number | null;
        stop?: number | null;
        target1?: number | null;
        target2?: number | null;
        riskPoints?: number | null;
        lineInSand?: number | null;
        invalidation?: string | null;
        requiredTrigger?: string | null;
        nextAction?: string | null;
        approvalStatus?: string;
      } | null;
      riskImpact?: {
        oldEntry?: number | null;
        oldStop?: number | null;
        oldRiskPoints?: number | null;
        bestEntry?: number | null;
        bestStop?: number | null;
        bestRiskPoints?: number | null;
        riskDeltaPoints?: number | null;
      } | null;
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
    counterStructureConditional?: {
      sourceOfTruth?: string;
      counterStructureConditional?: boolean;
      candidateDirection?: 'LONG' | 'SHORT' | 'WAIT' | string;
      htfBackdropSummary?: string | null;
      lowerTimeframeStateSummary?: string | null;
      whyShown?: string | null;
      requiredTrigger?: string | null;
      standDown?: string | null;
    } | null;
    mtfPrimarySideArbitration?: {
      sourceOfTruth?: string;
      mtfPrimarySide?: 'LONG' | 'SHORT' | 'WAIT' | 'DATA_LIMITED' | 'UNKNOWN' | string;
      mtfHtfSide?: 'LONG' | 'SHORT' | 'WAIT' | 'DATA_LIMITED' | 'UNKNOWN' | string;
      mtfLowerTimeframeSide?: 'LONG' | 'SHORT' | 'WAIT' | 'DATA_LIMITED' | 'UNKNOWN' | string;
      mtfArbitrationStatus?: string | null;
      candidateRole?: string | null;
      candidateDirection?: 'LONG' | 'SHORT' | 'WAIT' | string;
      arbitrationReason?: string | null;
      requiredProofToPromote?: string | null;
      standDownCondition?: string | null;
    } | null;
    htfTargetToLinePromotion?: {
      sourceOfTruth?: string;
      direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
      primaryMapSide?: 'LONG' | 'SHORT' | 'WAIT' | 'DATA_LIMITED' | 'UNKNOWN' | string;
      currentReactionLine?: number | null;
      currentReactionLabel?: string | null;
      mainLineInSand?: number | null;
      nextHtfLine?: number | null;
      nextHtfLineLabel?: string | null;
      acceptanceRule?: string | null;
      failureRule?: string | null;
      standDownCondition?: string | null;
      noChase?: string | null;
      appTargetsComplete?: boolean;
      reviewOnly?: boolean;
    } | null;
    sameSideCampaignStack?: {
      sourceOfTruth?: string;
      campaignStackId?: string;
      campaignDirection?: 'LONG' | 'SHORT' | string;
      campaignStackMembers?: Array<{
        candidateKey?: string;
        setupType?: string;
        scenarioLabel?: string | null;
        role?: string;
        roleReason?: string;
        decisionQualityScore?: number | null;
        modelConfidenceScore?: number | null;
        rankScore?: number | null;
        entry?: number | null;
        stop?: number | null;
        target1?: number | null;
        target2?: number | null;
        riskPoints?: number | null;
        staleEntryReason?: string | null;
      }>;
      sharedReactionZone?: {
        lower?: number | null;
        upper?: number | null;
        label?: string | null;
      } | null;
      sharedLineInSand?: number | null;
      stackReason?: string | null;
      stackStatus?: string | null;
      leadTacticalPlanKey?: string | null;
      campaignThesisKey?: string | null;
      supportingEvidenceKeys?: string[];
      staleLeadReason?: string | null;
      freshEntryStatus?: string | null;
      managementInstruction?: string | null;
      standDownCondition?: string | null;
      antiDrift?: {
        sameSideCandidatesGrouped?: boolean;
        leadTacticalPlanPreserved?: boolean;
        staleEntryCannotPresentAsFresh?: boolean;
        oppositeSideRequiresCompleted5mFailureProof?: boolean;
        appTargetsFromLeadTacticalPlanOnly?: boolean;
      };
    } | null;
    sameSideCampaignStacks?: unknown[];
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

interface CompactDeskLifecyclePlan {
  direction?: 'LONG' | 'SHORT' | 'WAIT' | string;
  scenarioLabel?: string | null;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  riskPoints?: number | null;
  lineInSand?: number | null;
  nextTrigger?: string | null;
  requiredTrigger?: string | null;
  invalidation?: string | null;
  missingEvidence?: string[];
  hasFullPlanLevels?: boolean;
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
  displayStatus?: string;
  displayLabel?: string;
  displayAction?: string;
  displayReason?: string;
  missingProof?: string[];
}

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

function appTargetLevels(candidate: SetupCandidate, _normalized: CompactNormalizedPlan): { stop: number | null; target1: number | null; target2: number | null } {
  const stop = typeof candidate.stop === 'number' && Number.isFinite(candidate.stop) ? candidate.stop : null;
  const computed = targetsFromEntryStop(candidate.direction, candidate.entry, stop);
  return {
    stop,
    target1: computed.target1,
    target2: computed.target2,
  };
}

export interface CanonicalTraderTicketLevels {
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  source: 'candidate' | 'desk_play';
}

export interface CanonicalTraderTicket {
  direction: 'LONG' | 'SHORT' | 'WAIT';
  setupLabel: string;
  lineInSand: number | null;
  levels: CanonicalTraderTicketLevels | null;
  levelsStatus: 'complete' | 'watch_only' | 'suppressed_stale_or_no_chase' | 'invalid_orientation';
  reason: string;
}

function directionallyValidLevels(
  direction: 'LONG' | 'SHORT',
  levels: { entry?: number | null; stop?: number | null; target1?: number | null; target2?: number | null },
): CanonicalTraderTicketLevels | null {
  const entry = isFinitePrice(levels.entry) ? roundToTradeTick(levels.entry) : null;
  const stop = isFinitePrice(levels.stop) ? roundToTradeTick(levels.stop) : null;
  const target1 = isFinitePrice(levels.target1) ? roundToTradeTick(levels.target1) : null;
  const target2 = isFinitePrice(levels.target2) ? roundToTradeTick(levels.target2) : null;
  if (entry === null || stop === null || target1 === null || target2 === null) return null;
  const valid = direction === 'LONG'
    ? stop < entry && target1 > entry && target2 > target1
    : stop > entry && target1 < entry && target2 < target1;
  if (!valid) return null;
  return {
    entry,
    stop,
    target1,
    target2,
    riskPoints: roundToTradeTick(Math.abs(entry - stop)),
    source: 'candidate',
  };
}

function directionFromDeskState(
  candidate: SetupCandidate | null | undefined,
  deskState?: CompactDeskStateForDiscord | null,
): 'LONG' | 'SHORT' | 'WAIT' {
  if (candidate?.direction === 'LONG' || candidate?.direction === 'SHORT') return candidate.direction;
  const playDirection = deskState?.primaryDeskPlay?.direction;
  return playDirection === 'LONG' || playDirection === 'SHORT' ? playDirection : 'WAIT';
}

function canonicalLineInSand(args: {
  direction: 'LONG' | 'SHORT' | 'WAIT';
  candidate?: SetupCandidate | null;
  deskState?: CompactDeskStateForDiscord | null;
}): number | null {
  if (args.direction === 'LONG' || args.direction === 'SHORT') {
    const play = args.deskState?.primaryDeskPlay;
    if (play) {
      const playLine = deskPlayLineForDirection(play, args.direction);
      if (isFinitePrice(playLine)) return playLine;
    }
  }
  if (args.candidate && args.candidate.direction !== 'NO TRADE') {
    const candidateLine = candidateLineInSand(args.candidate);
    if (isFinitePrice(candidateLine)) return candidateLine;
    if (isFinitePrice(args.candidate.entry)) return args.candidate.entry;
  }
  return isFinitePrice(args.deskState?.lineInSand) ? args.deskState!.lineInSand! : null;
}

function canonicalCandidateLevels(
  candidate: SetupCandidate | null | undefined,
  normalized: CompactNormalizedPlan,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): CanonicalTraderTicketLevels | null {
  if (!candidate || (direction !== 'LONG' && direction !== 'SHORT') || candidate.direction !== direction) return null;
  const appLevels = appTargetLevels(candidate, normalized);
  return directionallyValidLevels(direction, {
    entry: candidate.entry,
    stop: appLevels.stop,
    target1: appLevels.target1,
    target2: appLevels.target2,
  });
}

export function buildCanonicalTraderTicket(args: {
  candidate?: SetupCandidate | null;
  normalized?: CompactNormalizedPlan | null;
  deskState?: CompactDeskStateForDiscord | null;
  currentPrice?: number | null;
  suppressLevels?: boolean;
  suppressReason?: string | null;
}): CanonicalTraderTicket {
  const candidate = args.candidate || null;
  const normalized = args.normalized || {};
  const direction = directionFromDeskState(candidate, args.deskState || null);
  const lineInSand = canonicalLineInSand({ direction, candidate, deskState: args.deskState || null });
  const setupLabel = candidate?.setupType || args.deskState?.primaryDeskPlay?.title || 'DeskState';
  if (args.suppressLevels) {
    return {
      direction,
      setupLabel,
      lineInSand,
      levels: null,
      levelsStatus: 'suppressed_stale_or_no_chase',
      reason: args.suppressReason || 'Prior levels are stale/no-chase; wait for fresh completed 5M proof.',
    };
  }
  const candidateLevels = canonicalCandidateLevels(candidate, normalized, direction);
  if (candidate && direction !== 'WAIT' && candidate.direction === direction && !candidateLevels) {
    return {
      direction,
      setupLabel,
      lineInSand,
      levels: null,
      levelsStatus: 'invalid_orientation',
      reason: 'Candidate levels are incomplete or directionally invalid for the active side.',
    };
  }
  return {
    direction,
    setupLabel,
    lineInSand,
    levels: candidateLevels,
    levelsStatus: candidateLevels ? 'complete' : 'watch_only',
    reason: candidateLevels
      ? 'Canonical trader ticket uses one coherent candidate level package.'
      : 'No complete app-owned entry/stop/T1/T2 package is available for this side.',
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
  const decisionBand = deskPlayCrossedDecisionBand(longAbove !== null || shortBelow !== null
    ? { ...(play || {}), longAbove, shortBelow }
    : play);
  const nextLine = decisionBand
    ? `Decision band ${decisionBand.label}: long only above ${priceLine(decisionBand.high)} / short only below ${priceLine(decisionBand.low)}`
    : [
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
  if (
    normalized.decisionStatus === TradeDecisionStatus.NoTrade ||
    normalized.decisionStatus === TradeDecisionStatus.OutsideRules
  ) return false;
  if (candidate.decisionQualityHardBlocker) return false;
  if (candidate.targetRoom?.targetRoomStatus === 'blocked_before_t1') return false;
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

function htfFvgReactionCandidateLines(candidate: SetupCandidate): string[] {
  if (candidate.setupType !== SetupType.IntradayMssMicroContinuation) return [];
  const sourceText = [
    candidate.scenarioLabel,
    candidate.activeRuleset?.htfLineInSand?.lineReason,
    candidate.activeRuleset?.htfLineInSand?.requiredClose,
    ...(candidate.activeRuleset?.htfLineInSand?.evidence || []),
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
    candidate.requiredTrigger,
    candidate.nextAction,
  ].filter(Boolean).join(' ');
  if (!/HTF|FVG|fair value gap|parent FVG|15M|60M|120M|240M|1H|2H|4H/i.test(sourceText)) return [];
  const timeframes = [
    /\b15M\b|\b15\s*MIN/i.test(sourceText) ? '15M' : null,
    /\b60M\b|\b1H\b|\b60\s*MIN/i.test(sourceText) ? '60M' : null,
    /\b120M\b|\b2H\b|\b120\s*MIN/i.test(sourceText) ? '120M' : null,
    /\b240M\b|\b4H\b|\b240\s*MIN/i.test(sourceText) ? '240M' : null,
  ].filter((value): value is string => Boolean(value));
  const line = candidate.activeRuleset?.htfLineInSand?.lineInSand ?? null;
  const direction = candidate.direction === 'LONG' || candidate.direction === 'SHORT' ? candidate.direction : null;
  const lineText = direction && isFinitePrice(line)
    ? `${direction === 'LONG' ? 'LONG ABOVE' : 'SHORT BELOW'} ${priceLine(line)}`
    : 'line pending';
  return [
    `HTF FVG: ${timeframes.length ? timeframes.join('/') : 'HTF'}; ${lineText}; 5M controls.`,
  ];
}

function htfFvgMicroMssProofCandidateLines(args: CompactDiscordSummaryArgs, candidate: SetupCandidate): string[] {
  if (candidate.setupType !== SetupType.IntradayMssMicroContinuation) return [];
  const proof = args.deskState?.primaryDeskPlay?.htfFvgMicroMssProof;
  if (!proof || proof.direction !== candidate.direction) return [];
  const htf = proof.htfFvgProof;
  const trigger = proof.fiveMinuteTriggerProof;
  const swing = proof.protectedSwingProof;
  const zone = isFinitePrice(htf?.zoneLower) && isFinitePrice(htf?.zoneUpper)
    ? `${compactLine(htf?.timeframe || 'HTF', 8)} ${zoneRangeLine(htf?.zoneLower, htf?.zoneUpper)}`
    : compactLine(htf?.timeframe || 'HTF', 8);
  const line = isFinitePrice(trigger?.lineInSand)
    ? `${candidate.direction === 'SHORT' ? 'SHORT BELOW' : 'LONG ABOVE'} ${priceLine(trigger?.lineInSand)}`
    : 'line pending';
  const stop = isFinitePrice(swing?.stop) ? priceLine(swing?.stop) : 'pending';
  return [
    'Proof Check:',
    `HTF FVG proof: ${compactLine(String(htf?.status || 'missing').replace(/_/g, ' '), 18)} (${zone}${htf?.lifecycleState ? `; ${compactLine(String(htf.lifecycleState).replace(/_/g, ' '), 24)}` : ''})`,
    `5M trigger proof: ${compactLine(String(trigger?.status || 'missing').replace(/_/g, ' '), 18)}; ${line}`,
    `Protected 5M swing proof: ${compactLine(String(swing?.status || 'pending').replace(/_/g, ' '), 20)}; stop ${stop}`,
    `Promotion: ${compactLine(String(proof.promotionReadiness || 'watch_only').replace(/_/g, ' '), 34)}`,
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
    ...htfFvgReactionCandidateLines(candidate),
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
    ...htfFvgReactionCandidateLines(candidate),
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
    'Invalid:',
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
    `Invalid: ${invalidInstruction(invalidation, 'primary invalidation is not available.')}`,
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
  source: 'normalized_candidate' | 'protected_5m_review_path' | 'same_side_campaign_lead';
  noChase: boolean;
}

function deskPlayProtectedSwingBasis(args: {
  side: 'LONG' | 'SHORT';
  levels: { stop: number; source?: DeskPlayPlanningLevels['source'] };
  play?: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null;
}): { swing: number; stop: number; label: string } {
  const mappedSwing = deskPlayFiveMinuteProtectedStructure(args.play);
  const swing = isFinitePrice(mappedSwing) ? mappedSwing : args.levels.stop;
  const sideLabel = args.side === 'LONG' ? 'swing low' : 'swing high';
  const sourceLabel = args.levels.source === 'protected_5m_review_path'
    ? 'protected 5M'
    : 'priced 5M/structure';
  return {
    swing,
    stop: args.levels.stop,
    label: `${sourceLabel} ${sideLabel}`,
  };
}

function deskPlayPricedStopLines(args: {
  side: 'LONG' | 'SHORT';
  levels: { stop: number; source?: DeskPlayPlanningLevels['source'] };
  play?: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null;
}): string[] {
  const basis = deskPlayProtectedSwingBasis(args);
  return [
    `Stop: ${priceLine(basis.stop)} | Protected 5M swing: ${priceLine(basis.swing)} (${basis.label})`,
  ];
}

function deskPlayWatchOnlyNoPricedStopLines(side: 'LONG' | 'SHORT'): string[] {
  const swingSide = side === 'LONG' ? 'swing low' : 'swing high';
  return [
    `WATCH ONLY: no priced stop; protected 5M ${swingSide} price is not confirmed.`,
  ];
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
  const stack = play?.sameSideCampaignStack;
  const stackMembers = Array.isArray(stack?.campaignStackMembers) ? stack!.campaignStackMembers : [];
  const stackLead = stack?.campaignDirection === direction
    ? stackMembers.find((member) => member.candidateKey === stack.leadTacticalPlanKey) || null
    : null;
  if (
    stackLead &&
    isFinitePrice(stackLead.entry) &&
    isFinitePrice(stackLead.stop) &&
    isFinitePrice(stackLead.target1) &&
    isFinitePrice(stackLead.target2)
  ) {
    const riskPoints = Math.abs(stackLead.entry - stackLead.stop);
    const targetsAreValid = direction === 'LONG'
      ? stackLead.target2 > stackLead.target1 && stackLead.target1 > stackLead.entry
      : stackLead.target2 < stackLead.target1 && stackLead.target1 < stackLead.entry;
    if (riskPoints > 0 && targetsAreValid) {
      const zone = stack.sharedReactionZone &&
        isFinitePrice(stack.sharedReactionZone.lower) &&
        isFinitePrice(stack.sharedReactionZone.upper)
        ? { low: stack.sharedReactionZone.lower, high: stack.sharedReactionZone.upper }
        : deskPlayEntryZone(direction, stackLead.entry, riskPoints);
      const current = isFinitePrice(currentPrice) ? currentPrice : null;
      return {
        entry: stackLead.entry,
        stop: stackLead.stop,
        target1: stackLead.target1,
        target2: stackLead.target2,
        riskPoints,
        entryZoneLow: zone.low,
        entryZoneHigh: zone.high,
        source: 'same_side_campaign_lead',
        noChase: current !== null && (direction === 'LONG' ? current > zone.high : current < zone.low),
      };
    }
  }
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

function deskPlaySideArmingState(args: {
  side: 'LONG' | 'SHORT';
  line: number | null;
  currentPrice?: number | null;
  canExecute?: boolean | null;
}): { armed: boolean; reason: string | null } {
  if (args.canExecute === true) return { armed: true, reason: null };
  if (!isFinitePrice(args.line) || !isFinitePrice(args.currentPrice)) return { armed: true, reason: null };
  const buffer = TRADE_RULES.targetModel.tickSize;
  if (args.side === 'SHORT' && args.currentPrice > args.line + buffer) {
    return {
      armed: false,
      reason: `No short plan yet. Current ${priceLine(args.currentPrice)} is above the line ${priceLine(args.line)}; short requires a completed 5M close below ${priceLine(args.line)}.`,
    };
  }
  if (args.side === 'LONG' && args.currentPrice < args.line - buffer) {
    return {
      armed: false,
      reason: `No long plan yet. Current ${priceLine(args.currentPrice)} is below the line ${priceLine(args.line)}; long requires a completed 5M close above ${priceLine(args.line)}.`,
    };
  }
  return { armed: true, reason: null };
}

function deskPlayIsNoChaseReview(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT',
): boolean {
  const bias = direction === 'LONG' ? play.longBias : play.shortBias;
  const readiness = String(bias?.tradeReadiness?.status || bias?.tradeReadiness?.displayStatus || bias?.executableConsideration?.status || '').replace(/_/g, ' ');
  const stackStatus = String(play.sameSideCampaignStack?.freshEntryStatus || play.sameSideCampaignStack?.stackStatus || '').replace(/_/g, ' ');
  const activeZoneStatus = String(play.activeTacticalZone?.state || '').replace(/_/g, ' ');
  return /no chase|missed|management/i.test(`${readiness} ${stackStatus} ${activeZoneStatus}`);
}

function deskPlayHeadlineLabel(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT' | 'WAIT'): string {
  const play = args.deskState?.primaryDeskPlay;
  if ((direction === 'LONG' || direction === 'SHORT') || !play || (play.direction !== 'LONG' && play.direction !== 'SHORT')) {
    return deskPlayPrimaryLabel(play, direction);
  }
  const line = deskPlayLineForDirection(play, play.direction);
  const arming = deskPlaySideArmingState({
    side: play.direction,
    line,
    currentPrice: args.currentPrice,
    canExecute: args.deskState?.canExecute,
  });
  if (!arming.armed) {
    return deskPlayIsNoChaseReview(play, play.direction)
      ? `${play.direction} REVIEW / NO CHASE`
      : `WAIT / ${play.direction} ${play.direction === 'SHORT' ? 'BELOW' : 'ABOVE'} ${priceLine(line)}`;
  }
  return deskPlayPrimaryLabel(play, direction);
}

function deskPlayCompletedFiveMinuteLabel(args: CompactDiscordSummaryArgs): string | null {
  const candidates = [
    args.planVersionId,
    args.deskState?.primaryDeskPlay?.freshReentryCandidates?.bestCandidate?.requiredTrigger,
    args.deskState?.primaryDeskPlay?.freshReentryCandidates?.bestCandidate?.nextAction,
    args.deskState?.primaryDeskPlay?.freshReentryWatch?.requiredProof,
    args.deskState?.primaryDeskPlay?.freshReentryWatch?.nextStep,
    args.deskState?.primaryDeskPlay?.nextTrigger,
    args.deskState?.nextTrigger,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
  for (const value of candidates) {
    const isoMatch = value.match(/20\d{2}-\d{2}-\d{2}T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?/);
    if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]} ET`;
    const textMatch = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\s*ET\b/i);
    if (textMatch) return `${textMatch[1].padStart(2, '0')}:${textMatch[2]} ET`;
  }
  return null;
}

function deskPlaySnapshotLines(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT' | 'WAIT', line: number | null): string[] {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) return [];
  const displayDirection = direction === 'LONG' || direction === 'SHORT'
    ? direction
    : play.direction === 'LONG' || play.direction === 'SHORT'
    ? play.direction
    : 'WAIT';
  if (displayDirection !== 'LONG' && displayDirection !== 'SHORT') return [];
  const completed5m = deskPlayCompletedFiveMinuteLabel(args);
  const noChase = deskPlayIsNoChaseReview(play, displayDirection);
  const sideWord = displayDirection === 'SHORT' ? 'below' : 'above';
  const retestWord = displayDirection === 'SHORT' ? 'retest/rejection' : 'retest/hold';
  const freshStatus = noChase
    ? `Fresh-entry status: NO FRESH ${displayDirection} ENTRY / NO CHASE.`
    : `Fresh-entry status: waiting for completed 5M proof ${sideWord} ${priceLine(line)}.`;
  return [
    'Desk Snapshot:',
    `Completed 5M: ${completed5m || 'latest closed candle from scanner'}.`,
    `${displayDirection} line in the sand: ${priceLine(line)}.`,
    freshStatus,
    `Next proof: fresh completed 5M ${retestWord} ${sideWord} ${priceLine(line)} before a new ${displayDirection.toLowerCase()} plan.`,
  ];
}

function deskPlayCrossedDecisionBand(
  play: Pick<NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>, 'longAbove' | 'shortBelow'> | null | undefined,
): { low: number; high: number; label: string; lines: string[] } | null {
  const longAbove = isFinitePrice(play?.longAbove) ? play!.longAbove! : null;
  const shortBelow = isFinitePrice(play?.shortBelow) ? play!.shortBelow! : null;
  if (longAbove === null || shortBelow === null || longAbove > shortBelow) return null;
  const low = Math.min(longAbove, shortBelow);
  const high = Math.max(longAbove, shortBelow);
  const label = Math.abs(high - low) < 0.0001
    ? priceLine(low)
    : `${priceLine(low)}-${priceLine(high)}`;
  return {
    low,
    high,
    label,
    lines: [
      `Decision Band: ${label} - CONFLICT / BATTLE ZONE / WAIT.`,
      `Long trigger: completed 5M close above ${priceLine(high)}.`,
      `Short trigger: completed 5M close below ${priceLine(low)}.`,
      'Inside the band: no fresh entry; wait for one side to confirm.',
    ],
  };
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

function deskPlayReadinessDisplayLine(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  side: 'LONG' | 'SHORT' | 'WAIT',
  reviewOnly: boolean,
  hasLevels: boolean,
  highConfidenceConditional = false,
): string {
  const readiness = side === 'LONG'
    ? play.longBias?.tradeReadiness
    : side === 'SHORT'
    ? play.shortBias?.tradeReadiness
    : null;
  if (readiness?.displayLabel || readiness?.displayStatus) {
    const label = readiness.displayLabel || readiness.displayStatus || readiness.label || 'REVIEW MAP';
    const action = readiness.displayAction || readiness.action || readiness.displayReason || readiness.reason || '';
    const actionText = compactInstruction(action, '');
    return actionText ? `${label} - ${actionText}` : label;
  }
  const zone = play.activeTacticalZone?.direction === side ? play.activeTacticalZone : null;
  const cascade = play.htfFvgCascade?.direction === side ? play.htfFvgCascade : null;
  const parentReaction = play.htfFvgReactionMemory?.activeReaction?.direction === side
    ? play.htfFvgReactionMemory.activeReaction
    : null;
  if (zone && (cascade || parentReaction)) {
    const actionText = compactInstruction(zone.nextTrigger || cascade?.childExecutionZone?.triggerNeeded, 'wait for completed 5M proof.');
    return `HTF FVG ACTIVE - WAITING 5M REJECTION - ${actionText}`;
  }
  if (play.htfFvgParentReactionWatch?.direction === side) {
    const actionText = compactInstruction(
      play.htfFvgParentReactionWatch.requiredProof,
      'wait for same-direction completed 5M child proof.',
    );
    return `HTF PARENT ACTIVE - WAITING 5M CHILD PROOF - ${actionText}`;
  }
  return deskPlayReadinessStatus(reviewOnly, hasLevels, highConfidenceConditional);
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
  const chartRunner = firstMeaningfulExtension(candidate.direction, levels.target2, [
    candidate.target2,
    targetPlan?.liquidityTarget1?.price,
    targetPlan?.nearestLiquidityTarget?.price,
    targetPlan?.liquidityTarget2?.price,
    targetPlan?.liquidityRunnerTarget?.price,
    targetPlan?.runnerTarget?.price,
  ]);
  const chartExtension = firstMeaningfulExtension(candidate.direction, chartRunner || levels.target2, [
    targetPlan?.liquidityRunnerTarget?.price,
    targetPlan?.runnerTarget?.price,
  ]);
  if (chartRunner || chartExtension) {
    return `HTF target: ${priceLine(chartRunner)} / runner ${priceLine(chartExtension)}`;
  }
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

function candidateLeftActiveTacticalZone(args: CompactDiscordSummaryArgs, candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate || candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return false;
  const direction = candidate.direction;
  const candidateZone = candidate.tacticalZone?.direction === direction ? candidate.tacticalZone : null;
  const deskZone = args.deskState?.primaryDeskPlay?.activeTacticalZone?.direction === direction
    ? args.deskState.primaryDeskPlay.activeTacticalZone
    : null;
  const activeZone = candidateZone || deskZone;
  const lower = isFinitePrice(activeZone?.lower) ? activeZone.lower : null;
  const upper = isFinitePrice(activeZone?.upper) ? activeZone.upper : null;
  const current = isFinitePrice(args.currentPrice) ? args.currentPrice : null;
  return lower !== null && upper !== null && current !== null && (current < lower || current > upper);
}

function candidateCurrentDeskPlanLines(args: CompactDiscordSummaryArgs, candidate: SetupCandidate, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string[] {
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
  const candidateZone = candidate.tacticalZone?.direction === direction ? candidate.tacticalZone : null;
  const deskZone = args.deskState?.primaryDeskPlay?.activeTacticalZone?.direction === direction
    ? args.deskState.primaryDeskPlay.activeTacticalZone
    : null;
  const activeZone = candidateZone || deskZone;
  const activeZoneLower = isFinitePrice(activeZone?.lower) ? activeZone.lower : null;
  const activeZoneUpper = isFinitePrice(activeZone?.upper) ? activeZone.upper : null;
  const currentPrice = isFinitePrice(args.currentPrice) ? args.currentPrice : null;
  const currentVsZone = activeZoneLower !== null && activeZoneUpper !== null && currentPrice !== null
    ? currentPrice < activeZoneLower
      ? { state: 'below' as const, distance: activeZoneLower - currentPrice }
      : currentPrice > activeZoneUpper
        ? { state: 'above' as const, distance: currentPrice - activeZoneUpper }
        : { state: 'inside' as const, distance: 0 }
    : null;
  const counterStructureLines = counterStructureConditionalLines({
    play: args.deskState?.primaryDeskPlay,
    direction,
    activeZoneLower,
    activeZoneUpper,
    lineInSand,
  });
  const entryLabel = counterStructureLines.length ? 'Conditional entry reference' : 'Entry';
  const activeZoneLeftBehind = status !== 'EXECUTABLE' && Boolean(currentVsZone && currentVsZone.state !== 'inside');
  const canonicalTicket = buildCanonicalTraderTicket({
    candidate,
    normalized,
    deskState: args.deskState,
    currentPrice: args.currentPrice,
    suppressLevels: activeZoneLeftBehind,
    suppressReason: 'Prior tactical zone already left; wait for fresh completed 5M proof.',
  });
  const levels = canonicalTicket.levels;
  const conditionalLevelLines = (): string[] => {
    if ((status === 'EXECUTABLE' || !currentVsZone || currentVsZone.state === 'inside') && levels) {
      return [
        ...(currentVsZone?.state === 'inside' ? [
          `Entry zone: ${zoneRangeLine(activeZoneLower, activeZoneUpper)}`,
          `Current: ${priceLine(currentPrice)} (inside zone)`,
        ] : []),
        `${entryLabel}: ${priceLine(levels.entry)}`,
        `Stop: ${priceLine(levels.stop)}`,
        `T1: ${priceLine(levels.target1)}`,
        `T2: ${priceLine(levels.target2)}`,
      ];
    }
    if (!levels && (!currentVsZone || currentVsZone.state === 'inside')) {
      return [
        'WATCH ONLY:',
        `Entry: completed 5M close ${triggerWord.toLowerCase()} ${priceLine(lineInSand)}`,
        direction === 'LONG'
          ? 'Stop: no priced stop yet; protected 5M swing low is not confirmed.'
          : 'Stop: no priced stop yet; protected 5M swing high is not confirmed.',
        'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
      ];
    }
    const noEntryInstruction = direction === 'SHORT'
      ? currentVsZone.state === 'above'
        ? 'Entry status: NO FRESH ENTRY - current price is above the active short zone; wait for a new completed 5M setup or migrated line.'
        : 'Entry status: NO FRESH ENTRY / NO CHASE - price is already below the active short zone; wait for a new completed 5M retest/rejection.'
      : currentVsZone.state === 'below'
        ? 'Entry status: NO FRESH ENTRY - current price is below the active long zone; wait for a new completed 5M setup or migrated line.'
        : 'Entry status: NO FRESH ENTRY / NO CHASE - price is already above the active long zone; wait for a new completed 5M retest/hold.';
    return [
      `Prior retest zone: ${zoneRangeLine(activeZoneLower, activeZoneUpper)}`,
      `Current: ${priceLine(currentPrice)} (${numberLine(currentVsZone.distance)} pts ${currentVsZone.state} zone)`,
      noEntryInstruction,
      `Fresh trigger required: new completed 5M retest/rejection or migrated line ${direction === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}.`,
      'Fresh levels: pending new 5M structure; do not use prior entry/stop/T1/T2 for a new trade.',
    ];
  };
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
    discordPromotionDecisionLine(candidate, normalized, status),
    `Bias: ${biasEmoji(direction === 'LONG' ? 'BULL' : 'BEAR')} ${candidateBiasSummary(candidate)}`,
    ...(candidateHtfContextLine(candidate) ? [candidateHtfContextLine(candidate)!] : []),
    ...htfFvgReactionCandidateLines(candidate),
    ...htfFvgMicroMssProofCandidateLines(args, candidate),
    `Line in the Sand: ${priceLine(lineInSand)}`,
    `Trigger: completed 5M close ${triggerWord.toLowerCase()} ${priceLine(lineInSand)}`,
    `Why: ${direction} ${triggerWord.toLowerCase()} ${priceLine(lineInSand)}; ${compactInstruction(candidate.requiredTrigger || candidate.nextAction, `completed 5M acceptance ${triggerWord.toLowerCase()} ${priceLine(lineInSand)}.`)}`,
    `Invalid: ${invalidInstruction(candidate.invalidation, levels ? `${invalidWord} ${priceLine(levels.stop)}.` : 'wait for priced protected 5M structure stop.')}`,
    `Opposite Scenario: stand down on ${standDownInstruction(candidate.invalidation, levels ? `completed acceptance ${invalidWord} ${priceLine(levels.stop)}.` : 'completed opposite-side acceptance through the active line.')}`,
    '',
    ...counterStructureLines,
    ...(counterStructureLines.length ? [''] : []),
    activeZoneLeftBehind
      ? `${direction} ${triggerWord} ${priceLine(lineInSand)}: NO FRESH ENTRY - prior tactical zone already left.`
      : sideBreakoutLabel(direction, triggerWord, lineInSand),
    ...(referenceOnly ? [
      'Tactical levels - not execution approval.',
      'Sniper watch: 1M timing only; 5M close/hold required.',
      ...conditionalLevelLines(),
      'Reason not executable: HTF/data context is limited; canExecute remains false.',
    ] : [
      ...conditionalLevelLines(),
    ]),
    '',
    ...(activeZoneLeftBehind
      ? ['Fresh invalidation/targets: pending after new completed 5M proof.']
      : levels ? [
          `Invalid ${invalidWord}: ${priceLine(levels.stop)}`,
          candidateHtfTargetLine(candidate, levels),
        ] : ['Fresh invalidation/targets: pending until protected 5M stop confirms.']),
    '',
    'Decision support only. No automated orders.',
    '',
    `Status: ${statusText}`,
    deskPlayChartStatusLine({
      hasChart: args.attachments.chartPlan,
      hasLevels: Boolean(levels),
    }),
  ];
}

function deskPlayChartStatusLine(args: {
  hasChart: boolean;
  hasLevels: boolean;
}): string {
  if (args.hasChart && args.hasLevels) return 'Chart: attached to Discord post.';
  if (args.hasChart) return 'Chart: attached to Discord post; trade remains watch-only until priced stop/T1/T2 confirm.';
  if (args.hasLevels) return 'Chart: missing; app-owned levels require chart before Discord post.';
  return 'Chart: not attached; watch-only until app-owned levels confirm.';
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

function invalidInstruction(value: string | null | undefined, fallback: string): string {
  return compactInstruction(value, fallback)
    .replace(/^invalid(?:ation)?\s*:\s*/i, '')
    .replace(/^invalid\s+if\s+/i, '')
    .replace(/^invalid\s+/i, '');
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

function counterStructureConditionalLines(args: {
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']> | null | undefined;
  direction: 'LONG' | 'SHORT';
  activeZoneLower?: number | null;
  activeZoneUpper?: number | null;
  lineInSand?: number | null;
}): string[] {
  const counter = args.play?.counterStructureConditional;
  if (!counter?.counterStructureConditional) return [];
  if (counter.candidateDirection && counter.candidateDirection !== args.direction) return [];
  const arbitration = args.play?.mtfPrimarySideArbitration || null;
  const htf = compactInstruction(counter.htfBackdropSummary, 'HTF context supports review only.');
  const lower = compactInstruction(counter.lowerTimeframeStateSummary, 'lower timeframes are mixed/conflicted.');
  const trigger = compactInstruction(
    arbitration?.requiredProofToPromote || counter.requiredTrigger,
    args.direction === 'SHORT'
      ? `completed 5M rejects/holds below ${priceLine(args.lineInSand)}.`
      : `completed 5M reclaims/holds above ${priceLine(args.lineInSand)}.`,
  );
  const standDown = compactInstruction(
    arbitration?.standDownCondition || counter.standDown,
    args.direction === 'SHORT'
      ? `completed 5M accepts above ${priceLine(args.activeZoneUpper ?? args.lineInSand)}.`
      : `completed 5M accepts below ${priceLine(args.activeZoneLower ?? args.lineInSand)}.`,
  );
  const zoneText = args.activeZoneLower !== null && args.activeZoneLower !== undefined &&
    args.activeZoneUpper !== null && args.activeZoneUpper !== undefined
    ? zoneRangeLine(args.activeZoneLower, args.activeZoneUpper)
    : priceLine(args.lineInSand);
  const lowerSide = args.direction === 'SHORT' ? 'bullish/range/conflict' : 'bearish/range/conflict';
  const action = args.direction === 'SHORT'
    ? `SHORT only if completed 5M rejects/holds below ${zoneText}.`
    : `LONG only if completed 5M reclaims/holds above ${zoneText}.`;
  const noChase = args.direction === 'SHORT'
    ? 'No chase if price is already below the zone or near/past T1.'
    : 'No chase if price is already above the zone or near/past T1.';
  const primary = String(arbitration?.mtfPrimarySide || 'WAIT').toUpperCase();
  const role = String(arbitration?.candidateRole || 'failure_scenario').replace(/_/g, ' ');
  return [
    'Counter-Structure Conditional Map:',
    `Primary map: ${primary}.`,
    `Candidate role: ${role}.`,
    'Counter-structure failure scenario; completed 5M proof required before this can become the main play.',
    `${args.direction} context comes from ${htf}.`,
    `1H/15M/5M are ${lower || lowerSide}, so this is not an immediate ${args.direction.toLowerCase()}.`,
    `Why shown: ${compactInstruction(arbitration?.arbitrationReason || counter.whyShown, 'structured evidence is meaningful, but execution still needs completed 5M proof.')}`,
    `Main line in the sand: ${zoneText}.`,
    action,
    `Trigger: ${trigger}`,
    `Stand down: ${standDown}`,
    noChase,
    'Review only. Not execution approval.',
  ];
}

function deskPlayLineDisplayLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
  activeLine: number | null,
): string[] {
  if (direction !== 'LONG' && direction !== 'SHORT') return [`Line in the Sand: ${priceLine(activeLine)}`];
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
  return [`Line in the Sand: ${priceLine(activeLine)}`];
}

function deskPlayTargetToLinePromotionLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  if (direction !== 'LONG' && direction !== 'SHORT') return [];
  const promotion = play.htfTargetToLinePromotion;
  if (
    promotion?.direction === direction &&
    isFinitePrice(promotion.currentReactionLine) &&
    isFinitePrice(promotion.nextHtfLine)
  ) {
    return [
      'HTF Target-to-Line Review Map:',
      `Primary map: ${String(promotion.primaryMapSide || direction).toUpperCase()}.`,
      `Current reaction / decision line: ${compactLine(promotion.currentReactionLabel || 'HTF/session reaction', 46)} ${priceLine(promotion.currentReactionLine)}.`,
      `Main line in the sand: ${priceLine(promotion.mainLineInSand)}.`,
      `Next HTF line: ${priceLine(promotion.nextHtfLine)} (${compactLine(promotion.nextHtfLineLabel || 'next structured line', 42)}).`,
      `Acceptance: ${compactInstruction(promotion.acceptanceRule, `completed 5M/15M acceptance promotes ${priceLine(promotion.nextHtfLine)}.`)}`,
      `Reaction / failure: ${compactInstruction(promotion.failureRule, 'failure keeps the opposing context active.')}`,
      `No chase: ${compactInstruction(promotion.noChase, 'wait for fresh completed 5M/15M proof; review only, not execution approval.')}`,
      `Stand down: ${standDownInstruction(promotion.standDownCondition, 'active HTF reaction map failed.')}`,
      'App targets remain separate from HTF/session target or runner levels.',
      'Review only. Not execution approval.',
    ];
  }
  const transition = play.levelTransition || null;
  const reaction = isFinitePrice(transition?.targetReactionLevel)
    ? transition.targetReactionLevel
    : isFinitePrice(play.targetReactionLevel)
      ? play.targetReactionLevel
      : null;
  if (!isFinitePrice(reaction)) return [];
  const activeLine = isFinitePrice(play.lineInSand)
    ? play.lineInSand
    : direction === 'LONG' && isFinitePrice(play.longBias?.lineInSand)
      ? play.longBias!.lineInSand!
      : direction === 'SHORT' && isFinitePrice(play.shortBias?.lineInSand)
        ? play.shortBias!.lineInSand!
        : null;
  if (
    isFinitePrice(activeLine) &&
    (direction === 'LONG' ? reaction < activeLine - 0.0001 : reaction > activeLine + 0.0001)
  ) {
    return [];
  }
  const nextLine = direction === 'LONG'
    ? isFinitePrice(transition?.longAbove) ? transition.longAbove : isFinitePrice(play.longAbove) ? play.longAbove : null
    : isFinitePrice(transition?.shortBelow) ? transition.shortBelow : isFinitePrice(play.shortBelow) ? play.shortBelow : null;
  const nextLineIsValid = isFinitePrice(nextLine) &&
    (direction === 'LONG' ? nextLine > reaction + 0.0001 : nextLine < reaction - 0.0001);
  if (!nextLineIsValid) return [];
  const acceptWord = direction === 'LONG' ? 'above' : 'below';
  const failWord = direction === 'LONG' ? 'below' : 'above';
  const opposing = direction === 'LONG' ? 'SHORT' : 'LONG';
  const label = compactLine(transition?.targetReactionLabel || play.targetReactionLabel || 'HTF/session reaction', 46);
  return [
    'Target-to-Line Map:',
    `Decision line / reaction: ${label} ${priceLine(reaction)}.`,
    `Acceptance ${acceptWord} ${priceLine(reaction)} -> Next HTF line ${priceLine(nextLine)}.`,
    `Reaction / failure: failure ${failWord} ${priceLine(reaction)} keeps ${opposing} context active.`,
    `No chase: ${compactInstruction(transition?.targetManagementInstruction || play.noChase, 'wait for completed 5M/15M acceptance; review only, not execution approval.')}`,
  ];
}

function sameSideCampaignMemberLabel(
  member: NonNullable<NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>['sameSideCampaignStack']>['campaignStackMembers'][number] | null | undefined,
): string {
  if (!member) return 'N/A';
  return compactLine(member.scenarioLabel || member.setupType || member.candidateKey || 'candidate', 54);
}

function deskPlaySameSideCampaignStackLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  if (direction !== 'LONG' && direction !== 'SHORT') return [];
  const stack = play.sameSideCampaignStack;
  if (!stack || stack.campaignDirection !== direction) return [];
  const members = Array.isArray(stack.campaignStackMembers) ? stack.campaignStackMembers : [];
  if (!members.length || !stack.campaignStackId) return [];
  const lead = members.find((member) => member.candidateKey === stack.leadTacticalPlanKey) || null;
  const thesis = members.find((member) => member.candidateKey === stack.campaignThesisKey) || null;
  const support = members
    .filter((member) => member.candidateKey !== lead?.candidateKey && member.candidateKey !== thesis?.candidateKey)
    .map((member) => sameSideCampaignMemberLabel(member))
    .slice(0, 3);
  const zone = stack.sharedReactionZone && isFinitePrice(stack.sharedReactionZone.lower) && isFinitePrice(stack.sharedReactionZone.upper)
    ? `${priceLine(stack.sharedReactionZone.lower)}-${priceLine(stack.sharedReactionZone.upper)}`
    : 'pending';
  const status = compactLine(String(stack.stackStatus || stack.freshEntryStatus || 'forming').replace(/_/g, ' '), 32);
  const leadHasLevels = Boolean(
    lead &&
    isFinitePrice(lead.entry) &&
    isFinitePrice(lead.stop) &&
    isFinitePrice(lead.target1) &&
    isFinitePrice(lead.target2)
  );
  const fresh = String(stack.freshEntryStatus || '').replace(/_/g, ' ');
  const noChaseOrManagement = /no chase|management/i.test(fresh) || /no_chase|management/i.test(String(stack.stackStatus || ''));
  return [
    'Same-Side Campaign Stack:',
    `Campaign: ${direction} (${status}).`,
    `Campaign ID: ${compactLine(stack.campaignStackId, 92)}`,
    `Lead tactical plan: ${sameSideCampaignMemberLabel(lead)}.`,
    `Campaign thesis: ${sameSideCampaignMemberLabel(thesis)}.`,
    ...(support.length ? [`Supporting evidence: ${support.join(' | ')}.`] : []),
    `Reaction / entry zone: ${zone}.`,
    ...(leadHasLevels ? [
      `Lead Entry: ${priceLine(lead!.entry)} | Stop: ${priceLine(lead!.stop)} | Risk: ${numberLine(lead!.riskPoints)} pts`,
      `App Targets: T1 ${priceLine(lead!.target1)} | T2 ${priceLine(lead!.target2)}`,
    ] : [
      'Lead Entry/Stop/T1/T2: pending - no stale/generated levels shown.',
    ]),
    `Fresh-entry status: ${fresh || status}.`,
    ...(noChaseOrManagement ? [
      `No chase / management: ${compactInstruction(stack.managementInstruction, 'If already in, manage; if not in, wait for a fresh pullback/retest.')}`,
    ] : [
      'Fresh entry remains tied to completed 5M proof and the lead tactical plan.',
    ]),
    `Stand down: ${standDownInstruction(stack.standDownCondition, 'completed 5M campaign failure or lead invalidation.')}`,
    'Review only. Not execution approval. canExecute remains unchanged.',
  ];
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

function deskPlayHtfFvgReactionMemoryLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const routing = play.htfFvgReactionRouting;
  const memory = play.htfFvgReactionMemory;
  const active = memory?.activeReaction;
  const child = memory?.childConfirmation;
  const displayDirection = direction === 'LONG' || direction === 'SHORT'
    ? direction
    : routing?.direction === 'LONG' || routing?.direction === 'SHORT'
    ? routing.direction
    : active?.direction === 'LONG' || active?.direction === 'SHORT'
    ? active.direction
    : null;
  if (!displayDirection) return [];
  if (!active || active.direction !== displayDirection) return [];
  const parentState = compactLine(String(active.state || 'watch').replace(/_/g, ' '), 24);
  const reactionState = compactLine(String(active.latestReaction?.state || active.state || 'reaction').replace(/_/g, ' '), 24);
  const childState = compactLine(String(child?.state || 'waiting_for_child_5m_proof').replace(/_/g, ' '), 34);
  const parentLine = `HTF parent reaction: ${compactLine(active.timeframe || 'HTF', 8)} ${zoneRangeLine(active.lower, active.upper)} (${parentState}; close ${priceLine(active.latestReaction?.close)})`;
  const childLine = child?.state === 'child_fvg_confirmed'
    ? `5M child proof: ${zoneRangeLine(child.lower, child.upper)} (${childState})`
    : `5M child proof: ${childState}`;
  const routeLine = routing?.status === 'routed_active_reaction'
    ? `Routing: ${displayDirection} surfaced from HTF parent reaction + 5M child proof. Defended HTF FVG routing is active.`
    : `Routing: ${compactLine(routing?.reason || memory?.summary || 'HTF FVG memory is context only.', 96)}`;
  const stackLine = memory?.parentStackSummary
    ? compactLine(memory.parentStackSummary, 118)
    : null;
  const lineLabel = routing?.lineLabel
    ? compactLine(routing.lineLabel, 96)
    : isFinitePrice(routing?.lineInSand)
    ? `${displayDirection === 'SHORT' ? 'SHORT BELOW' : 'LONG ABOVE'} ${priceLine(routing?.lineInSand)}`
    : null;
  const lifecycleLine = routing?.lifecycleState
    ? `Lifecycle: ${compactLine(String(routing.lifecycleState).replace(/_/g, ' '), 32)}`
    : null;
  const standDown = routing?.standDown
    ? compactLine(routing.standDown, 108)
    : null;
  const acceptanceLine = isFinitePrice(routing?.lineInSand)
    ? `${displayDirection === 'SHORT' ? 'Acceptance below' : 'Acceptance above'} ${priceLine(routing?.lineInSand)} is the next review trigger; 5M still controls execution.`
    : `Acceptance ${displayDirection === 'SHORT' ? 'below' : 'above'} the defended boundary is the next review trigger; 5M still controls execution.`;
  return [
    'Defended HTF FVG Reaction Memory:',
    parentLine,
    `Reaction: ${reactionState}${active.latestReaction?.timestamp ? ` at ${compactLine(active.latestReaction.timestamp, 28)}` : ''}`,
    childLine,
    ...(lineLabel ? [`Line in the Sand: ${lineLabel}`, `Decision line: ${lineLabel}`] : []),
    acceptanceLine,
    ...(lifecycleLine ? [lifecycleLine] : []),
    ...(stackLine ? [stackLine] : []),
    routeLine,
    ...(standDown ? [`Stand down: ${standDown}`] : []),
    'Boundary: communication/routing only; no canExecute, stop, target, risk, or approval change.',
    'Review only / Not execution approval. 5M still controls execution.',
  ];
}

function deskPlayHtfFvgMicroMssProofLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const proof = play.htfFvgMicroMssProof;
  const displayDirection = direction === 'LONG' || direction === 'SHORT' ? direction : null;
  if (!proof || !displayDirection || proof.direction !== displayDirection) return [];
  const htf = proof.htfFvgProof;
  const trigger = proof.fiveMinuteTriggerProof;
  const swing = proof.protectedSwingProof;
  const zone = isFinitePrice(htf?.zoneLower) && isFinitePrice(htf?.zoneUpper)
    ? `${compactLine(htf?.timeframe || 'HTF', 8)} ${zoneRangeLine(htf?.zoneLower, htf?.zoneUpper)}`
    : compactLine(htf?.timeframe || 'HTF', 8);
  const line = isFinitePrice(trigger?.lineInSand)
    ? `${displayDirection === 'SHORT' ? 'SHORT BELOW' : 'LONG ABOVE'} ${priceLine(trigger?.lineInSand)}`
    : 'line pending';
  const stop = isFinitePrice(swing?.stop) ? priceLine(swing?.stop) : 'pending';
  return [
    'Proof Check:',
    `HTF FVG proof: ${compactLine(String(htf?.status || 'missing').replace(/_/g, ' '), 18)} (${zone}${htf?.lifecycleState ? `; ${compactLine(String(htf.lifecycleState).replace(/_/g, ' '), 24)}` : ''})`,
    `5M trigger proof: ${compactLine(String(trigger?.status || 'missing').replace(/_/g, ' '), 18)}; ${line}`,
    `Protected 5M swing proof: ${compactLine(String(swing?.status || 'pending').replace(/_/g, ' '), 20)}; stop ${stop}`,
    `Promotion: ${compactLine(String(proof.promotionReadiness || 'watch_only').replace(/_/g, ' '), 34)}`,
    ...(proof.summary ? [compactLine(proof.summary, 118)] : []),
  ];
}

function deskPlayHtfFvgParentZoneStackLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const displayDirection = direction === 'LONG' || direction === 'SHORT' ? direction : null;
  if (!displayDirection) return [];
  const zones = (play.htfFvgReactionMemory?.parentZones || [])
    .filter((zone) => zone.direction === displayDirection && isFinitePrice(zone.lower) && isFinitePrice(zone.upper))
    .slice(0, 3);
  if (!zones.length) return [];
  return [
    'HTF FVG Parent Zones:',
    ...zones.map((zone) => {
      const state = compactLine(String(zone.state || zone.lifecycle?.state || 'mapped').replace(/_/g, ' '), 20);
      const confidence = zone.confidence ? `; ${zone.confidence}` : '';
      const touchText = isFinitePrice(zone.lifecycle?.touchCount)
        ? `; touches ${numberLine(zone.lifecycle?.touchCount)}`
        : '';
      const closeText = isFinitePrice(zone.latestReaction?.close)
        ? `; reaction close ${priceLine(zone.latestReaction?.close)}`
        : '';
      return `${compactLine(zone.timeframe || 'HTF', 8)} ${zoneRangeLine(zone.lower, zone.upper)} (${state}${confidence}${touchText}${closeText})`;
    }),
  ];
}

function deskPlayHtfFvgParentReactionWatchLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const watch = play.htfFvgParentReactionWatch;
  if (!watch?.eligible) return [];
  const watchDirection = watch.direction === 'LONG' || watch.direction === 'SHORT' ? watch.direction : null;
  if (!watchDirection) return [];
  const sideNote = direction === 'LONG' || direction === 'SHORT'
    ? watchDirection === direction
      ? 'same-side HTF parent reaction'
      : `opposing HTF parent reaction while primary map is ${direction}`
    : 'HTF parent reaction';
  const parent = watch.parentZone;
  const parentLine = parent
    ? `Parent FVG: ${compactLine(parent.timeframe || 'HTF', 8)} ${zoneRangeLine(parent.lower, parent.upper)} (${compactLine(String(parent.state || 'watch').replace(/_/g, ' '), 24)})`
    : 'Parent FVG: active parent zone mapped; exact bounds unavailable.';
  const lineLabel = watch.lineLabel
    ? compactLine(watch.lineLabel, 96)
    : isFinitePrice(watch.lineInSand)
    ? `${watchDirection === 'SHORT' ? 'SHORT BELOW' : 'LONG ABOVE'} ${priceLine(watch.lineInSand)}`
    : `${watchDirection} watch line pending`;
  return [
    'HTF Parent FVG Reaction Watch:',
    `${lineLabel} (${sideNote}).`,
    parentLine,
    `Required proof: ${compactInstruction(watch.requiredProof, 'wait for same-direction completed 5M child proof before any fresh conditional plan.')}`,
    `Reason: ${compactLine(watch.reason || 'HTF parent reaction is visible; 5M child confirmation is missing.', 108)}`,
    ...(watch.standDown ? [compactLine(watch.standDown, 108)] : []),
    'Boundary: review-only communication; no canExecute, stop, target, risk, ranking, or approval change.',
  ];
}

function deskPlayFreshReentryWatchLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const watch = play.freshReentryWatch;
  const displayDirection = direction === 'LONG' || direction === 'SHORT' ? direction : null;
  if (!displayDirection || !watch?.eligible || watch.direction !== displayDirection || !isFinitePrice(watch.lineInSand)) return [];
  const line = watch.lineInSand as number;
  const parent = watch.parentZone;
  const parentLine = parent && isFinitePrice(parent.lower) && isFinitePrice(parent.upper)
    ? `Parent FVG still active: ${compactLine(parent.timeframe || 'HTF', 8)} ${zoneRangeLine(parent.lower, parent.upper)} (${compactLine(String(parent.state || 'mapped').replace(/_/g, ' '), 18)}).`
    : null;
  const oldLevels = isFinitePrice(watch.oldEntry) || isFinitePrice(watch.oldStop) || isFinitePrice(watch.oldTarget1) || isFinitePrice(watch.oldTarget2)
    ? `Old missed levels: entry ${priceLine(watch.oldEntry)}, stop ${priceLine(watch.oldStop)}, T1 ${priceLine(watch.oldTarget1)}, T2 ${priceLine(watch.oldTarget2)} - management/history only.`
    : null;
  return [
    'Fresh Re-entry Watch:',
    `${displayDirection} watch line: ${priceLine(line)}.`,
    `Required proof: ${compactInstruction(watch.requiredProof, `completed 5M close/hold ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(line)}.`)}`,
    'Fresh entry/stop/T1/T2: pending new 5M structure; do not reuse old missed levels.',
    ...(parentLine ? [parentLine] : []),
    ...(oldLevels ? [oldLevels] : []),
    `Why: ${compactInstruction(watch.reason, 'old entry is missed, but HTF reaction remains active.')}`,
    `Next: ${compactInstruction(watch.nextStep, 'wait for fresh deterministic app-owned levels after completed 5M proof.')}`,
  ];
}

function deskPlayFreshReentryCandidateLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const set = play.freshReentryCandidates;
  const best = set?.bestCandidate;
  const displayDirection = direction === 'LONG' || direction === 'SHORT' ? direction : null;
  if (
    !displayDirection ||
    set?.approvalStatus !== 'approved_discord_conditional_display' ||
    best?.direction !== displayDirection ||
    best.status !== 'ready_for_owner_review' ||
    !isFinitePrice(best.entry) ||
    !isFinitePrice(best.stop) ||
    !isFinitePrice(best.target1) ||
    !isFinitePrice(best.target2)
  ) {
    return [];
  }
  const risk = isFinitePrice(best.riskPoints) ? `${numberLine(best.riskPoints)} pts` : 'N/A';
  const oldRisk = isFinitePrice(set.riskImpact?.oldRiskPoints) ? `${numberLine(set.riskImpact?.oldRiskPoints)} pts` : 'N/A';
  const riskDelta = isFinitePrice(set.riskImpact?.riskDeltaPoints)
    ? `${numberLine(set.riskImpact?.riskDeltaPoints)} pts`
    : 'N/A';
  return [
    'Fresh Re-entry Conditional Plan:',
    `${displayDirection} ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(best.lineInSand)}.`,
    `Entry: ${priceLine(best.entry)} | Stop: ${priceLine(best.stop)} | Risk: ${risk}`,
    `T1: ${priceLine(best.target1)} | T2: ${priceLine(best.target2)}`,
    `Trigger: ${compactInstruction(best.requiredTrigger, 'fresh completed 5M acceptance plus retest/hold.')}`,
    `Invalid: ${invalidInstruction(best.invalidation, `through protected stop ${priceLine(best.stop)}.`)}`,
    `Risk change vs old missed plan: ${oldRisk} -> ${risk} (${riskDelta}).`,
    'Status: approved for Discord conditional-plan display only; canExecute and execution approval unchanged.',
  ];
}

function deskPlayFreshReentryDisplayLines(
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>,
  direction: 'LONG' | 'SHORT' | 'WAIT',
): string[] {
  const candidateLines = deskPlayFreshReentryCandidateLines(play, direction);
  return candidateLines.length ? candidateLines : deskPlayFreshReentryWatchLines(play, direction);
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
      `Trigger: ${compactInstruction(waitTrigger, 'wait for one primary side with completed 5M proof.')}`,
      'Invalid: N/A until a primary side is active.',
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
    `Trigger: ${compactInstruction(nextTrigger, `completed 5M acceptance ${triggerWord} ${priceLine(args.lineInSand)}.`)}`,
    `Invalid: ${invalidInstruction(invalidation, 'primary invalidation is not available.')}`,
    deskPlayStandDownLine(args),
  ];
}

function deskPlayLifecyclePlanForSide(
  deskState: CompactDeskStateForDiscord | undefined,
  side: 'LONG' | 'SHORT',
): CompactDeskLifecyclePlan | null {
  const direct = side === 'LONG' ? deskState?.bestLongPlan : deskState?.bestShortPlan;
  if (direct?.direction === side) return direct;
  const selected = deskState?.selectedCandidate;
  return selected?.direction === side ? selected : null;
}

function deskPlayLifecycleLevels(plan: CompactDeskLifecyclePlan | null): DeskPlayPlanningLevels | null {
  if (!plan || plan.direction !== 'LONG' && plan.direction !== 'SHORT') return null;
  const entry = isFinitePrice(plan.entry) ? plan.entry : null;
  const stop = isFinitePrice(plan.stop) ? plan.stop : null;
  const target1 = isFinitePrice(plan.target1) ? plan.target1 : null;
  const target2 = isFinitePrice(plan.target2) ? plan.target2 : null;
  const computed = targetsFromEntryStop(plan.direction, entry, stop);
  const t1 = target1 ?? computed.target1;
  const t2 = target2 ?? computed.target2;
  const riskPoints = isFinitePrice(plan.riskPoints) ? plan.riskPoints : computed.riskPoints;
  const sideValid = plan.direction === 'LONG'
    ? isFinitePrice(entry) && isFinitePrice(stop) && stop < entry
    : isFinitePrice(entry) && isFinitePrice(stop) && stop > entry;
  const targetsValid = plan.direction === 'LONG'
    ? isFinitePrice(t1) && isFinitePrice(t2) && t1 > entry! && t2 > t1
    : isFinitePrice(t1) && isFinitePrice(t2) && t1 < entry! && t2 < t1;
  if (!sideValid || !targetsValid || !isFinitePrice(riskPoints)) return null;
  const zone = deskPlayEntryZone(plan.direction, entry!, riskPoints!);
  return {
    entry: entry!,
    stop: stop!,
    target1: t1!,
    target2: t2!,
    riskPoints: riskPoints!,
    entryZoneLow: zone.low,
    entryZoneHigh: zone.high,
    source: 'normalized_candidate',
    noChase: false,
  };
}

function deskPlayBattleSideLines(args: {
  side: 'LONG' | 'SHORT';
  line: number | null;
  deskState?: CompactDeskStateForDiscord;
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>;
  normalized: CompactNormalizedPlan;
  currentPrice?: number | null;
  compactPending?: boolean;
}): string[] {
  const sideWord = args.side === 'LONG' ? 'above' : 'below';
  const sideLabel = `${args.side} ${args.side === 'LONG' ? 'ABOVE' : 'BELOW'} ${priceLine(args.line)}`;
  const plan = deskPlayLifecyclePlanForSide(args.deskState, args.side);
  const levels =
    deskPlayLifecycleLevels(plan) ||
    deskPlayDecisionMapLevels(args.normalized, args.side, args.line, args.play, args.currentPrice);
  const trigger = compactInstruction(
    plan?.requiredTrigger || plan?.nextTrigger,
    `completed 5M close + hold/retest ${sideWord} ${priceLine(args.line)}.`,
  );
  const invalidationFallback = args.side === 'LONG'
    ? 'completed 5M failure back below the line or protected swing.'
    : 'completed 5M failure back above the line or protected swing.';
  const invalidation = compactInstruction(plan?.invalidation, invalidationFallback);
  return [
    `${sideLabel}:`,
    `Trigger: ${trigger}`,
    ...(levels
      ? [
          `Entry: ${priceLine(levels.entry)} | Risk: ${numberLine(levels.riskPoints)} pts`,
          ...deskPlayPricedStopLines({ side: args.side, levels, play: args.play }),
          `T1: ${priceLine(levels.target1)} | T2: ${priceLine(levels.target2)}`,
          `Invalid ${args.side === 'LONG' ? 'below' : 'above'}: ${priceLine(levels.stop)}`,
        ]
      : args.compactPending
        ? [
            `Entry: completed 5M close ${sideWord} ${priceLine(args.line)}`,
            ...deskPlayWatchOnlyNoPricedStopLines(args.side),
            'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
          ]
        : [
            `Entry: completed 5M close ${sideWord} ${priceLine(args.line)}`,
            ...deskPlayWatchOnlyNoPricedStopLines(args.side),
            'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
            `Invalid: ${invalidInstruction(invalidation, 'primary invalidation is not available.')}`,
          ]),
  ];
}

function deskPlayBattlePlanLines(args: {
  play: NonNullable<CompactDeskStateForDiscord['primaryDeskPlay']>;
  deskState?: CompactDeskStateForDiscord;
  normalized: CompactNormalizedPlan;
  currentPrice?: number | null;
}): string[] {
  const transition = args.play.levelTransition;
  const longLine = isFinitePrice(transition?.longAbove)
    ? transition!.longAbove!
    : deskPlayLineForDirection(args.play, 'LONG');
  const shortLine = isFinitePrice(transition?.shortBelow)
    ? transition!.shortBelow!
    : deskPlayLineForDirection(args.play, 'SHORT');
  if (!isFinitePrice(longLine) && !isFinitePrice(shortLine)) return [];
  const longLevels = deskPlayLifecycleLevels(deskPlayLifecyclePlanForSide(args.deskState, 'LONG')) ||
    deskPlayDecisionMapLevels(args.normalized, 'LONG', longLine, args.play, args.currentPrice);
  const shortLevels = deskPlayLifecycleLevels(deskPlayLifecyclePlanForSide(args.deskState, 'SHORT')) ||
    deskPlayDecisionMapLevels(args.normalized, 'SHORT', shortLine, args.play, args.currentPrice);
  const exactlyOneSideHasLevels = Boolean(longLevels) !== Boolean(shortLevels);
  return [
    'Battle Plan:',
    `Current: ${priceLine(args.currentPrice)} | No chase inside the battle zone.`,
    ...(isFinitePrice(longLine)
      ? deskPlayBattleSideLines({
          side: 'LONG',
          line: longLine,
          deskState: args.deskState,
          play: args.play,
          normalized: args.normalized,
          currentPrice: args.currentPrice,
          compactPending: exactlyOneSideHasLevels && !longLevels,
        })
      : []),
    ...(isFinitePrice(shortLine)
      ? deskPlayBattleSideLines({
          side: 'SHORT',
          line: shortLine,
          deskState: args.deskState,
          play: args.play,
          normalized: args.normalized,
          currentPrice: args.currentPrice,
          compactPending: exactlyOneSideHasLevels && !shortLevels,
        })
      : []),
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
      'Line in the Sand: N/A',
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
  const decisionBand = deskPlayCrossedDecisionBand(play);
  const compactSidePlanLines = (side: 'LONG' | 'SHORT', lineOverride?: number | null): string[] => {
    const line = isFinitePrice(lineOverride) ? lineOverride : deskPlayLineForDirection(play, side);
    const arming = deskPlaySideArmingState({
      side,
      line,
      currentPrice: args.currentPrice,
      canExecute: args.deskState?.canExecute,
    });
    const levels = arming.armed
      ? deskPlayDecisionMapLevels(args.normalized, side, line, play, args.currentPrice)
      : null;
    const triggerWord = side === 'LONG' ? 'above' : 'below';
    return [
      arming.armed ? `${side} Plan:` : `WAIT / ${side} ${side === 'SHORT' ? 'BELOW' : 'ABOVE'} ${priceLine(line)}:`,
      sideBreakoutLabel(side, side === 'LONG' ? 'ABOVE' : 'BELOW', line),
      arming.reason,
      `${side} if completed 5M closes ${triggerWord} ${priceLine(line)} and holds/retests.`,
      levels
        ? `Entry: ${priceLine(levels.entry)}`
        : `Entry: completed 5M close ${triggerWord} ${priceLine(line)}`,
      ...(levels ? deskPlayPricedStopLines({ side, levels, play }) : deskPlayWatchOnlyNoPricedStopLines(side)),
      levels
        ? `T1: ${priceLine(levels.target1)} | T2: ${priceLine(levels.target2)}`
        : 'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
      levels
        ? `Invalid ${side === 'LONG' ? 'below' : 'above'}: ${priceLine(levels.stop)}`
        : null,
    ].filter((line): line is string => Boolean(line));
  };
  const compactActionableDeskPlanLines = (): string[] => {
    const primaryLabel = deskPlayHeadlineLabel(args, direction);
    const displayDirection = direction === 'LONG' || direction === 'SHORT'
      ? direction
      : play.direction === 'LONG' || play.direction === 'SHORT'
      ? play.direction
      : 'WAIT';
    const primarySafety = displayDirection === 'LONG' || displayDirection === 'SHORT'
      ? sidePresentationSafety(displayDirection)
      : { reviewOnly: false, reason: null, highConfidenceConditional: false };
    const line = displayDirection === 'LONG' || displayDirection === 'SHORT'
      ? deskPlayLineForDirection(play, displayDirection)
      : play.lineInSand ?? deskPlayLineForDirection(play, 'LONG');
    const longTriggerLine = decisionBand?.high ?? deskPlayLineForDirection(play, 'LONG');
    const shortTriggerLine = decisionBand?.low ?? deskPlayLineForDirection(play, 'SHORT');
    const htfRows = deskPlayHtfLineRows(play, args.currentPrice);
    const usefulHtfRows = htfRows.filter((row) => !/UNKNOWN;\s*changes at N\/A/i.test(row));
    const primaryArming = displayDirection === 'LONG' || displayDirection === 'SHORT'
      ? deskPlaySideArmingState({
          side: displayDirection,
          line,
          currentPrice: args.currentPrice,
          canExecute: args.deskState?.canExecute,
        })
      : { armed: true, reason: null };
    const activeLevels = (displayDirection === 'LONG' || displayDirection === 'SHORT') && primaryArming.armed
      ? deskPlayDecisionMapLevels(args.normalized, displayDirection, line, play, args.currentPrice)
      : null;
    const battleHasLevels = Boolean(
      deskPlayLifecycleLevels(deskPlayLifecyclePlanForSide(args.deskState, 'LONG')) ||
      deskPlayLifecycleLevels(deskPlayLifecyclePlanForSide(args.deskState, 'SHORT')),
    );
    const hasAnyLevels = Boolean(
      activeLevels ||
      battleHasLevels ||
      deskPlayDecisionMapLevels(args.normalized, 'LONG', longTriggerLine, play, args.currentPrice) ||
      deskPlayDecisionMapLevels(args.normalized, 'SHORT', shortTriggerLine, play, args.currentPrice),
    );
    const htfContext = `HTF Context: ${args.deskState?.htfContextStatus || 'unknown'} / ${play.htfProtectedStructureMap?.reliability || 'unknown'}; 5M executes.`;
    const failedText = /FAILED/i.test(primaryLabel)
      ? `${play.direction === 'LONG' || play.direction === 'SHORT' ? `${play.direction} failed.` : 'Primary side failed.'} Price is inside a decision zone, not a clean entry.`
      : direction === 'WAIT'
      ? 'WAIT. Price needs a completed 5M close/hold before any fresh plan.'
      : `${direction} conditional; wait for 5M.`;
    const lineText = priceLine(line);
    const noTradeText = decisionBand
      ? `Inside ${decisionBand.label} = no fresh entry. No chase.`
      : 'Wait for 5M proof + protected stop/targets/canExecute.';
    const lineDisplayLines = deskPlayLineDisplayLines(play, displayDirection, line);
    const snapshotLines = deskPlaySnapshotLines(args, direction, line);
    const htfTargetLine = deskPlayHtfTargetLine(play);
    const runnerLine = deskPlayRunnerLine(play);
    const battlePlanLines = deskPlayBattlePlanLines({
      play,
      deskState: args.deskState,
      normalized: args.normalized,
      currentPrice: args.currentPrice,
    });
    const statusLine = primarySafety.highConfidenceConditional
      ? 'Status: High-confidence conditional trade plan; armed only after the named completed 5M condition.'
      : primarySafety.reviewOnly
      ? `Status: Review levels only - not executable; ${primarySafety.reason || 'completed 5M proof missing'}. Wait for completed 5M trigger + canExecute.`
      : args.deskState?.canExecute === true
      ? 'Status: App-owned canExecute=true; execution gates still control.'
      : 'Status: Review only until 5M trigger + canExecute.';
    const directionalLines = displayDirection === 'LONG' || displayDirection === 'SHORT'
      ? compactSidePlanLines(displayDirection, line)
      : [
          ...compactSidePlanLines('LONG', longTriggerLine),
          '',
          ...compactSidePlanLines('SHORT', shortTriggerLine),
        ];
    return [
      `Primary: ${primaryPlanLabel(primaryLabel)}`,
      deskPlayDecisionClassLine(primarySafety),
      ...snapshotLines,
      ...(direction === 'WAIT' ? [`Read:${failedText}`] : []),
      `Bias: ${deskPlayBiasSummary(play, direction, args.currentPrice)}`,
      ...battlePlanLines,
      ...deskPlayHtfRegimeLines(play, displayDirection),
      ...lineDisplayLines,
      ...deskPlayActiveTacticalZoneLines(play, displayDirection),
      ...deskPlaySameSideCampaignStackLines(play, displayDirection),
      ...deskPlayFreshReentryDisplayLines(play, displayDirection),
      ...(displayDirection === 'LONG' || displayDirection === 'SHORT'
        ? [
            `Map Side: ${deskPlaySideStrength(play, displayDirection)}`,
            `Conflict: ${deskPlayConflictSummary(play, displayDirection, primarySafety.reason)}`,
            `Readiness: ${deskPlayReadinessDisplayLine(play, displayDirection, primarySafety.reviewOnly, Boolean(activeLevels), primarySafety.highConfidenceConditional)}`,
            ...(primaryArming.armed || !primaryArming.reason ? [] : [primaryArming.reason]),
            ...(primarySafety.highConfidenceConditional
              ? ['High-confidence conditional trade plan - wait on the named completed 5M condition.']
              : primarySafety.reviewOnly
              ? [
                  'Review levels only - not an executable trade plan.',
                  ...(primarySafety.reason ? [`Reason: ${primarySafety.reason}.`] : []),
                ]
              : []),
          ]
        : [
            'Map Side: WAIT N/A',
            `Conflict: ${deskPlayConflictSummary(play, 'WAIT')}`,
            'Readiness: review map - wait',
          ]),
      ...(battlePlanLines.length ? [] : deskPlayMainInstructionLines({
        play,
        deskState: args.deskState,
        direction: displayDirection,
        lineInSand: line,
      })),
      ...deskPlayTargetToLinePromotionLines(play, displayDirection),
      '',
      ...(battlePlanLines.length ? [] : directionalLines),
      '',
      ...(!battlePlanLines.length && (displayDirection === 'LONG' || displayDirection === 'SHORT')
          ? [
            `${displayDirection === 'LONG' ? 'Short' : 'Long'} Scenario:`,
            displayDirection === 'LONG'
              ? sideBreakoutLabel('SHORT', 'BELOW', shortTriggerLine)
              : sideBreakoutLabel('LONG', 'ABOVE', longTriggerLine),
            displayDirection === 'LONG'
              ? `Short only if completed 5M candle closes below ${priceLine(shortTriggerLine)}.`
              : `Long only if completed 5M candle closes above ${priceLine(longTriggerLine)}.`,
            '',
          ]
        : []),
      ...(direction === 'WAIT' && !battlePlanLines.length ? [`No Trade: ${noTradeText}`] : []),
      ...(decisionBand ? decisionBand.lines : []),
      ...deskPlayFvgDecisionZoneLines(play),
      ...deskPlayHtfFvgParentReactionWatchLines(play, displayDirection),
      ...deskPlayHtfFvgReactionMemoryLines(play, displayDirection),
      ...deskPlayHtfFvgParentZoneStackLines(play, displayDirection),
      ...deskPlayHtfFvgCascadeLines(play, displayDirection),
      ...(hasAnyLevels ? [] : ['No active LONG/SHORT plan with complete app-owned levels.']),
      ...(usefulHtfRows.length ? ['HTF Lines:', ...usefulHtfRows] : []),
      ...(/N\/A \/ runner N\/A/i.test(htfTargetLine) ? [] : [htfTargetLine]),
      ...(/Runner: N\/A/i.test(runnerLine) ? [] : [runnerLine]),
      ...(direction === 'WAIT' ? [htfContext] : []),
      deskPlayBottomLineLine(direction),
      statusLine,
      deskPlayChartStatusLine({
        hasChart: args.attachments.chartPlan,
        hasLevels: hasAnyLevels,
      }),
    ];
  };
  return compactActionableDeskPlanLines();
}

function deskPlayHasCompletePlanningLevels(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT'): boolean {
  const play = args.deskState?.primaryDeskPlay;
  if (!play) return false;
  const line = deskPlayLineForDirection(play, direction);
  const arming = deskPlaySideArmingState({
    side: direction,
    line,
    currentPrice: args.currentPrice,
    canExecute: args.deskState?.canExecute,
  });
  if (!arming.armed) return false;
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
  const headline = deskPlayHeadlineLabel(args, direction);
  const payload: DiscordWebhookPayload = {
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
  const maxMainText = args.attachments.chartPlan || args.attachments.priceLevelMap ? 1600 : 1900;
  if (flattenDiscordPayloadText(payload).length <= maxMainText) return payload;
  const fallbackPayload: DiscordWebhookPayload = {
    ...payload,
    embeds: [
      {
        ...payload.embeds[0],
        description: professionalizeReportText(lines.join('\n')),
      },
    ],
  };
  if (flattenDiscordPayloadText(fallbackPayload).length <= maxMainText) return fallbackPayload;
  return fallbackPayload;
}

function scannerDeskPlayFallbackLines(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT' | 'WAIT'): string[] {
  const play = args.deskState?.primaryDeskPlay;
  const candidate = args.candidates[0] || null;
  const candidateDirection = candidate?.direction === 'LONG' || candidate?.direction === 'SHORT' ? candidate.direction : null;
  const playDirection = play?.direction === 'LONG' || play?.direction === 'SHORT' ? play.direction : null;
  const displayDirection = direction === 'WAIT' ? playDirection || candidateDirection || 'WAIT' : direction;
  const freshBest = play?.freshReentryCandidates?.approvalStatus === 'approved_discord_conditional_display' &&
    play.freshReentryCandidates.bestCandidate?.status === 'ready_for_owner_review' &&
    play.freshReentryCandidates.bestCandidate.direction === displayDirection
    ? play.freshReentryCandidates.bestCandidate
    : null;
  const freshLevels = freshBest &&
    isFinitePrice(freshBest.entry) &&
    isFinitePrice(freshBest.stop) &&
    isFinitePrice(freshBest.target1) &&
    isFinitePrice(freshBest.target2)
    ? {
        entry: freshBest.entry,
        stop: freshBest.stop,
        target1: freshBest.target1,
        target2: freshBest.target2,
      }
    : null;
  const candidateLevels = candidate ? appTargetLevels(candidate, args.normalized) : null;
  const status = reportStatus(candidate, args.normalized, args.statusOverride || args.decisionOverride);
  const lineInSand = freshBest?.lineInSand ??
    candidate?.activeRuleset?.htfLineInSand?.lineInSand ??
    (displayDirection === 'LONG' || displayDirection === 'SHORT' ? deskPlayLineForDirection(play, displayDirection) : play?.lineInSand) ??
    null;
  const levels = displayDirection === 'LONG' || displayDirection === 'SHORT'
    ? freshLevels ||
      deskPlayDecisionMapLevels(args.normalized, displayDirection, lineInSand, play, args.currentPrice) ||
      (candidate &&
      candidateLevels &&
      isFinitePrice(candidate.entry) &&
      isFinitePrice(candidateLevels.stop) &&
      isFinitePrice(candidateLevels.target1) &&
      isFinitePrice(candidateLevels.target2)
        ? {
        entry: candidate.entry,
        stop: candidateLevels.stop,
        target1: candidateLevels.target1,
        target2: candidateLevels.target2,
      } : null)
    : null;
  const invalidWord = displayDirection === 'SHORT' ? 'above' : 'below';
  const parentZone = play?.htfFvgCascade?.parentZone;
  const reaction = play?.targetReactionLevel;
  const decisionBand = deskPlayCrossedDecisionBand(play);
  const statusText = isHighConfidenceConditionalCandidate(candidate, args.normalized)
    ? 'High-confidence conditional; arms only after named completed 5M proof + app-owned canExecute.'
    : status === 'EXECUTABLE'
      ? 'Executable only while completed 5M trigger + canExecute remain true.'
      : 'Review only until 5M trigger + canExecute.';
  return [
    `${args.instrument} Current Desk Plan`,
    '',
    `Primary: ${primaryPlanLabel(deskPlayPrimaryLabel(play, direction))}`,
    discordPromotionDecisionLine(candidate, args.normalized, status),
    `HTF context: ${args.deskState?.htfContextStatus || 'unknown'} / ${play?.htfProtectedStructureMap?.reliability || 'unknown'}.`,
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayHtfRegimeLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayLineDisplayLines(play, displayDirection, lineInSand)
      : [`Line in the Sand: ${priceLine(lineInSand)}`]),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayTargetToLinePromotionLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlaySameSideCampaignStackLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayActiveTacticalZoneLines(play, displayDirection)
      : []),
    ...(play
      ? deskPlayHtfFvgParentReactionWatchLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayHtfFvgReactionMemoryLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayHtfFvgMicroMssProofLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayHtfFvgParentZoneStackLines(play, displayDirection)
      : []),
    ...(play ? deskPlayHtfFvgCascadeLines(play, displayDirection) : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayFreshReentryDisplayLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? [
          `Map Side: ${deskPlaySideStrength(play, displayDirection)}`,
          `Conflict: ${deskPlayConflictSummary(play, displayDirection)}`,
          `Readiness: ${deskPlayReadinessDisplayLine(
            play,
            displayDirection,
            status !== 'EXECUTABLE' && Boolean(levels),
            Boolean(levels),
            isHighConfidenceConditionalCandidate(candidate, args.normalized),
          )}`,
        ]
      : []),
    ...(play ? ['HTF Lines:', ...deskPlayHtfLineRows(play, args.currentPrice)] : []),
    ...(play && deskPlayFvgDecisionZoneLines(play).length ? deskPlayFvgDecisionZoneLines(play) : []),
    `Line in the Sand: ${priceLine(lineInSand)}`,
    ...(decisionBand
      ? [
          'Trigger: completed 5M close outside the battle zone.',
          'Overall play: CONFLICT / BATTLE ZONE / WAIT for completed 5M close outside the band.',
          ...decisionBand.lines,
        ]
      : [
          displayDirection === 'LONG' || displayDirection === 'SHORT'
            ? `Trigger: completed 5M close ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}.`
            : 'Trigger: wait for one completed 5M side to confirm.',
          displayDirection === 'LONG' || displayDirection === 'SHORT'
            ? `Overall play: ${displayDirection} ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}.`
            : 'Overall play: WAIT for one side to confirm.',
          displayDirection === 'LONG' || displayDirection === 'SHORT'
            ? sideBreakoutLabel(displayDirection, displayDirection === 'SHORT' ? 'BELOW' : 'ABOVE', lineInSand)
            : 'WAIT - no active breakout line.',
          ...(play?.longAbove != null && displayDirection !== 'LONG' ? [sideBreakoutLabel('LONG', 'ABOVE', play.longAbove)] : []),
          ...(play?.shortBelow != null && displayDirection !== 'SHORT' ? [sideBreakoutLabel('SHORT', 'BELOW', play.shortBelow)] : []),
        ]),
    'Trade Plan:',
    levels
      ? `Entry: ${priceLine(levels.entry)}`
      : `Entry: completed 5M close ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}`,
    ...(levels && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayPricedStopLines({ side: displayDirection, levels, play })
      : displayDirection === 'LONG' || displayDirection === 'SHORT'
        ? deskPlayWatchOnlyNoPricedStopLines(displayDirection)
        : ['Stop: N/A']),
    levels ? `T1: ${priceLine(levels.target1)} | T2: ${priceLine(levels.target2)}` : 'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
    ...(levels ? [] : ['No active LONG/SHORT plan with complete app-owned levels.']),
    `Trigger detail: ${compactInstruction(
      ((displayDirection === 'LONG' || displayDirection === 'SHORT') && play?.activeTacticalZone?.direction === displayDirection
        ? play.activeTacticalZone.nextTrigger
        : null) ||
      freshBest?.requiredTrigger ||
      freshBest?.nextAction ||
      candidate?.requiredTrigger ||
      candidate?.nextAction ||
      play?.nextTrigger,
      `completed 5M acceptance ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}.`,
    )}`,
    `Invalid: ${invalidInstruction(freshBest?.invalidation || candidate?.invalidation || play?.invalidation, `${invalidWord} ${priceLine(levels?.stop ?? null)}.`)}`,
    `Opposite Scenario: stand down on ${standDownInstruction(freshBest?.invalidation || candidate?.invalidation || play?.invalidation, `completed acceptance ${invalidWord} ${priceLine(levels?.stop ?? lineInSand)}.`)}`,
    ...(parentZone && isFinitePrice(parentZone.lower) && isFinitePrice(parentZone.upper)
      ? [`HTF FVG: ${parentZone.timeframe || 'HTF'} ${priceLine(parentZone.lower)}-${priceLine(parentZone.upper)} (${parentZone.state || 'mapped'}).`]
      : []),
    ...(isFinitePrice(reaction)
      ? [`Reaction: ${compactLine(play?.targetReactionLabel || 'HTF/session level', 36)} ${priceLine(reaction)}.`]
      : []),
    '',
    'Decision support only. No automated orders.',
    `Status: ${statusText}`,
    deskPlayChartStatusLine({
      hasChart: args.attachments.chartPlan,
      hasLevels: Boolean(levels?.entry != null && levels?.stop != null && levels?.target1 != null && levels?.target2 != null),
    }),
  ];
}

function scannerDeskPlayUltraFallbackLines(args: CompactDiscordSummaryArgs, direction: 'LONG' | 'SHORT' | 'WAIT'): string[] {
  const play = args.deskState?.primaryDeskPlay;
  const candidate = args.candidates[0] || null;
  const candidateDirection = candidate?.direction === 'LONG' || candidate?.direction === 'SHORT' ? candidate.direction : null;
  const playDirection = play?.direction === 'LONG' || play?.direction === 'SHORT' ? play.direction : null;
  const displayDirection = direction === 'WAIT' ? playDirection || candidateDirection || 'WAIT' : direction;
  const freshBest = play?.freshReentryCandidates?.approvalStatus === 'approved_discord_conditional_display' &&
    play.freshReentryCandidates.bestCandidate?.status === 'ready_for_owner_review' &&
    play.freshReentryCandidates.bestCandidate.direction === displayDirection
    ? play.freshReentryCandidates.bestCandidate
    : null;
  const freshLevels = freshBest &&
    isFinitePrice(freshBest.entry) &&
    isFinitePrice(freshBest.stop) &&
    isFinitePrice(freshBest.target1) &&
    isFinitePrice(freshBest.target2)
    ? {
        entry: freshBest.entry,
        stop: freshBest.stop,
        target1: freshBest.target1,
        target2: freshBest.target2,
      }
    : null;
  const lineInSand = freshBest?.lineInSand ??
    candidate?.activeRuleset?.htfLineInSand?.lineInSand ??
    (displayDirection === 'LONG' || displayDirection === 'SHORT' ? deskPlayLineForDirection(play, displayDirection) : play?.lineInSand) ??
    null;
  const candidateLevels = candidate ? appTargetLevels(candidate, args.normalized) : null;
  const levels = displayDirection === 'LONG' || displayDirection === 'SHORT'
    ? freshLevels ||
      deskPlayDecisionMapLevels(args.normalized, displayDirection, lineInSand, play, args.currentPrice) ||
      (candidate &&
      candidateLevels &&
      isFinitePrice(candidate.entry) &&
      isFinitePrice(candidateLevels.stop) &&
      isFinitePrice(candidateLevels.target1) &&
      isFinitePrice(candidateLevels.target2)
        ? {
        entry: candidate.entry,
        stop: candidateLevels.stop,
        target1: candidateLevels.target1,
        target2: candidateLevels.target2,
      } : null)
    : null;
  const parentZone = play?.htfFvgCascade?.parentZone;
  const activeReaction = play?.htfFvgReactionMemory?.activeReaction;
  const childConfirmation = play?.htfFvgReactionMemory?.childConfirmation;
  const reaction = play?.targetReactionLevel;
  const activeLine = play?.activeTacticalLine;
  const activeZone = play?.activeTacticalZone?.direction === displayDirection ? play.activeTacticalZone : null;
  const activeZoneText = activeZone && isFinitePrice(activeZone.lower) && isFinitePrice(activeZone.upper)
    ? zoneRangeLine(activeZone.lower, activeZone.upper)
    : null;
  const status = reportStatus(candidate, args.normalized, args.statusOverride || args.decisionOverride);
  const decisionBand = deskPlayCrossedDecisionBand(play);
  const sideLine = displayDirection === 'SHORT'
    ? sideBreakoutLabel('SHORT', 'BELOW', lineInSand)
    : displayDirection === 'LONG'
      ? sideBreakoutLabel('LONG', 'ABOVE', lineInSand)
      : 'WAIT - no active breakout line.';
  return [
    `${args.instrument} Current Desk Plan`,
    `Primary: ${primaryPlanLabel(deskPlayPrimaryLabel(play, direction))}`,
    freshBest
      ? 'Decision: FRESH RE-ENTRY CONDITIONAL - completed 5M proof + canExecute required.'
      : isHighConfidenceConditionalCandidate(candidate, args.normalized)
      ? 'Decision: HIGH-CONFIDENCE CONDITIONAL - completed 5M proof + canExecute required.'
      : statusLine(reportStatus(candidate, args.normalized, args.statusOverride || args.decisionOverride), candidate, args.normalized),
    `HTF: ${args.deskState?.htfContextStatus || 'unknown'} / ${play?.htfProtectedStructureMap?.reliability || 'unknown'}.`,
    ...(parentZone && isFinitePrice(parentZone.lower) && isFinitePrice(parentZone.upper)
      ? [`Parent FVG: ${parentZone.timeframe || 'HTF'} ${priceLine(parentZone.lower)}-${priceLine(parentZone.upper)} (${parentZone.state || 'mapped'}).`]
      : []),
    ...(activeReaction && isFinitePrice(activeReaction.lower) && isFinitePrice(activeReaction.upper)
      ? [`HTF FVG Reaction Memory: ${activeReaction.timeframe || 'HTF'} ${priceLine(activeReaction.lower)}-${priceLine(activeReaction.upper)} ${String(activeReaction.state || 'mapped').replace(/_/g, ' ')}; 5M ${String(childConfirmation?.state || 'waiting').replace(/_/g, ' ')}.`]
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayHtfFvgParentZoneStackLines(play, displayDirection).slice(0, 3)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayFreshReentryCandidateLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT') && !freshBest && play.freshReentryWatch?.eligible
      ? [
          `Fresh Re-entry Watch: ${displayDirection} ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(play.freshReentryWatch.lineInSand)}.`,
          `Fresh levels: pending new 5M structure; old levels are management/history only.`,
        ]
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayTargetToLinePromotionLines(play, displayDirection)
      : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayHtfRegimeLines(play, displayDirection)
      : []),
    ...(activeLine && isFinitePrice(activeLine.originalLine)
      ? [`Original campaign line: ${priceLine(activeLine.originalLine)}`]
      : []),
    ...(activeLine && isFinitePrice(activeLine.activeLine)
      ? [`Active tactical line: ${priceLine(activeLine.activeLine)}`]
      : []),
    ...(activeZoneText ? [`Active tactical zone: ${activeZoneText}`] : []),
    ...(activeZoneText && activeZone?.migrated && isFinitePrice(activeZone.migratedFromLine)
      ? [`Zone migration: ${priceLine(activeZone.migratedFromLine)} -> ${activeZoneText}; fresh decision area, not execution approval.`]
      : []),
    ...(activeZone?.noChase ? [`Zone no chase: ${compactInstruction(activeZone.noChase, 'do not chase away from the active tactical zone.')}`] : []),
    ...(play && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlaySameSideCampaignStackLines(play, displayDirection).slice(0, 9)
      : []),
    `Line in the Sand: ${priceLine(lineInSand)}`,
    ...(decisionBand
      ? [
          'Trigger: completed 5M close outside the battle zone.',
          'Overall play: CONFLICT / BATTLE ZONE / WAIT for completed 5M close outside the band.',
          ...decisionBand.lines,
        ]
      : [
          displayDirection === 'LONG' || displayDirection === 'SHORT'
            ? `Trigger: completed 5M close ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}.`
            : 'Trigger: wait for one completed 5M side to confirm.',
          displayDirection === 'LONG' || displayDirection === 'SHORT'
            ? `Overall play: ${displayDirection} ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}.`
            : 'Overall play: WAIT for one side to confirm.',
          sideLine,
          ...(play?.shortBelow != null && displayDirection !== 'SHORT' ? [sideBreakoutLabel('SHORT', 'BELOW', play.shortBelow)] : []),
          ...(play?.longAbove != null && displayDirection !== 'LONG' ? [sideBreakoutLabel('LONG', 'ABOVE', play.longAbove)] : []),
        ]),
    'Trade Plan:',
    levels
      ? `Entry: ${priceLine(levels.entry)}`
      : `Entry: completed 5M close ${displayDirection === 'SHORT' ? 'below' : 'above'} ${priceLine(lineInSand)}`,
    ...(levels && (displayDirection === 'LONG' || displayDirection === 'SHORT')
      ? deskPlayPricedStopLines({ side: displayDirection, levels, play })
      : displayDirection === 'LONG' || displayDirection === 'SHORT'
        ? deskPlayWatchOnlyNoPricedStopLines(displayDirection)
        : ['Stop: N/A']),
    levels ? `T1: ${priceLine(levels.target1)} | T2: ${priceLine(levels.target2)}` : 'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
    `Trigger detail: ${compactInstruction(activeZone?.nextTrigger || freshBest?.requiredTrigger || freshBest?.nextAction || candidate?.requiredTrigger || candidate?.nextAction || play?.nextTrigger, 'wait for completed 5M proof.' ).slice(0, 170)}`,
    `Invalid: ${invalidInstruction(freshBest?.invalidation || candidate?.invalidation || play?.invalidation, `through ${priceLine(levels?.stop ?? lineInSand)}.`).slice(0, 130)}`,
    ...(isFinitePrice(reaction) ? [`Reaction: ${compactLine(play?.targetReactionLabel || 'HTF/session level', 34)} ${priceLine(reaction)}.`] : []),
    `Status: ${status === 'EXECUTABLE' ? 'Executable only while completed 5M trigger + canExecute remain true.' : 'Review only until 5M trigger + canExecute.'}`,
    'Decision support only. No automated orders.',
    deskPlayChartStatusLine({
      hasChart: args.attachments.chartPlan,
      hasLevels: Boolean(levels?.entry != null && levels?.stop != null && levels?.target1 != null && levels?.target2 != null),
    }),
  ];
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

  const activeZoneLeftBehind = designerStatus !== 'EXECUTABLE' && candidateLeftActiveTacticalZone(args, bestCandidate);
  const defaultComponents = activeZoneLeftBehind
    ? undefined
    : defaultOutcomeComponentsForSummary(args, designerStatus === 'NO TRADE' ? null : direction === 'LONG' || direction === 'SHORT' ? direction : null);
  const components = activeZoneLeftBehind ? undefined : args.components || defaultComponents;
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
  const mainText = flattenDiscordPayloadText(payload);
  assertDiscordArtifactsPassLint({ payload, text: mainText, files });
  for (const embed of payload.embeds) {
    if (embed.title.length > 256) throw new Error('Discord payload blocked: embed title exceeds 256 characters.');
    if ((embed.description || '').length > 4096) throw new Error('Discord payload blocked: embed description exceeds 4096 characters.');
    if (embed.fields.length > 25) throw new Error('Discord payload blocked: embed has more than 25 fields.');
    for (const field of embed.fields) {
      if (field.name.length > 256) throw new Error('Discord payload blocked: embed field name exceeds 256 characters.');
      if (field.value.length > 1024) throw new Error('Discord payload blocked: embed field value exceeds 1024 characters.');
    }
  }
}
