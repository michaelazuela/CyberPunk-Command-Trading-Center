import { targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
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
  noTradeReason?: string | null;
  invalidation?: string | null;
  t1?: number | null;
  t2?: number | null;
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

function numberLine(value: number | null | undefined, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'N/A';
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

function compactTargetLadderLines(candidate: SetupCandidate, normalized: CompactNormalizedPlan): string[] {
  const appTargets = appTargetLevels(candidate, normalized);
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
  return [
    'Targets:',
    `T1: ${priceLine(appTargets.target1)} - scale/secure`,
    `T2: ${priceLine(appTargets.target2)} - base exit`,
    ...(runner ? [`Runner: ${priceLine(runner)} - extension if T2 clears`] : []),
    ...(stretch ? [`Stretch: ${priceLine(stretch)} - trail only if structure keeps delivering`] : []),
  ];
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

function reportStatus(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): DiscordDecisionStatus {
  const effectiveCanExecute = getEffectiveCanExecute(normalized);
  if (effectiveCanExecute) return 'EXECUTABLE';
  if (normalized.decision === 'NO TRADE' && !candidate) return 'NO TRADE';
  const status = compactSessionDecisionLabel(candidate, normalized, override).toLowerCase();
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'NO TRADE';
  if (status.includes('approved') || status.includes('executable')) return effectiveCanExecute ? 'EXECUTABLE' : 'CONDITIONAL';
  if (status.includes('blocked') || status.includes('no trade') || status.includes('notrade')) return 'NO TRADE';
  if (status.includes('conditional')) return 'CONDITIONAL';
  return 'WAIT';
}

function statusLine(status: DiscordDecisionStatus, candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  if (status === 'EXECUTABLE') return 'EXECUTABLE - verify completed 5M trigger before trader action';
  if (status === 'CONDITIONAL') return 'WAIT - normalized plan not executable; fresh completed 5M required';
  if (status === 'NO TRADE') return `NO TRADE - ${normalized.noTradeReason || candidate?.blockReason || 'no active executable plan'}`;
  return 'WAIT - app-owned pipeline has not approved execution';
}

function compactActionText(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string {
  if (status === 'NO TRADE') return 'Stand down. Recheck at next scheduled scan.';
  if (!candidate) return 'Stand down. No active plan candidate.';
  if (candidate.failedPlanReversal?.staleOrNoFreshEntry || candidate.candidateState === 'NO_FRESH_ENTRY') {
    return 'Failed-plan reversal is stale. Do not chase. Wait for a new completed 5M trigger/retest.';
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
    ...(blockerLine ? [blockerLine] : []),
    'Boundary: decision support only; not execution approval.',
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
      candidate.candidateState === 'MSS_CONTINUATION_RETEST_PENDING'
      ? [`Trigger State: ${candidate.candidateState}`]
      : []),
    ...failedPlanReversalLines(candidate),
    `Entry: ${priceLine(candidate.entry)}`,
    `Stop: ${priceLine(levels.stop)}`,
    `Risk: ${numberLine(candidate.riskPoints)} pts / N/A`,
    ...(riskAboveStandard ? [
      'Risk Advisory: Above standard',
      'Risk exceeds standard limit. Human final decision required.',
    ] : []),
    '',
    ...compactTargetLadderLines(candidate, normalized),
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
    `Max risk: ${numberLine(score.maxAllowedRiskPoints)} pts`,
    `Risk Score: ${score.score}/100 - ${score.label}`,
    `Reason: ${compactRiskScoreReason(score)}`,
    'Manual: Risk exceeds standard limit. Human final decision required.',
    'Watch: Fresh 5M trigger/retest only. Do not chase.',
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
    'Similar: 0',
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
  if (attachments.chartPlan) return 'Details: Chart Plan attached. Price Level Map unavailable.';
  if (attachments.priceLevelMap) return 'Details: Price Level Map attached. Chart Plan unavailable.';
  return 'Details: Visual attachments unavailable — review local logs before action.';
}

export function compactDiscordSummary(args: CompactDiscordSummaryArgs): DiscordWebhookPayload {
  const bestCandidate = args.candidates[0] || null;
  const effectiveCanExecute = getEffectiveCanExecute(args.normalized);
  const requestedStatus = args.statusOverride || args.normalized.decisionStatus || (effectiveCanExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait);
  const finalStatus = !effectiveCanExecute && (requestedStatus === TradeDecisionStatus.ApprovedTrade || requestedStatus === 'Approved' || requestedStatus === 'Executable')
    ? TradeDecisionStatus.Wait
    : requestedStatus;
  const direction = compactTradeDirection(bestCandidate, args.normalized);
  const decision = compactSessionDecisionLabel(bestCandidate, args.normalized, args.decisionOverride);
  const designerStatus = reportStatus(bestCandidate, args.normalized, args.statusOverride || args.decisionOverride);
  const model = bestCandidate ? professionalCandidateModelLabel(bestCandidate) : 'No approved model candidate';
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

  const lines = bestCandidate && designerStatus !== 'NO TRADE'
    ? [
        designerRecommendation.headlineRecommendation,
        `Status: ${statusLine(designerStatus, bestCandidate, args.normalized)}`,
        '',
        ...compactPlanLines(bestCandidate, args.normalized),
        '',
        ...riskLines,
        ...(riskLines.length ? [''] : []),
        ...htfLines,
        ...(htfLines.length ? [''] : []),
        'Invalidation:',
        bestCandidate.invalidation || args.normalized.invalidation || 'Invalidation not available. Do not act without protected structure.',
        '',
        ...memoryLines(),
        '',
        'Action:',
        designerRecommendation.actionLine,
        '',
        compactAttachmentLine(args.attachments, true),
        'Decision support only. No automated orders.',
      ]
    : [
        designerRecommendation.headlineRecommendation,
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
        'Decision support only. No automated orders.',
      ];

  const includeComponents = Boolean(args.components);
  return {
    username: 'Quant Desk',
    content: `${statusEmoji(finalStatus)} ${designerRecommendation.headlineRecommendation} | ${args.tradeDate} | ID: \`${args.planVersionId}\``,
    embeds: [
      {
        title: 'Compact Trade Plan Summary',
        description: professionalizeReportText(lines.join('\n')),
        color: statusColor(finalStatus),
        fields: [],
        footer: { text: 'Quant Desk • Decision support' },
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
  if (validFiles.length > 0 && validFiles.length < 2) {
    console.warn('Discord payload warning: only one trade-plan image attachment is present. Expected Chart Plan + Price Level Map when a candidate exists.');
  }
  if (mainText.length > 1200) {
    console.warn(`Discord payload warning: compact alert text is ${mainText.length} characters; preferred normal output is under 1200.`);
  }
}
