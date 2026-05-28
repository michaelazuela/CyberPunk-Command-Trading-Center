import { targetsFromEntryStop } from '../../src/config/tradeRules';
import { TradeDecisionStatus, type SetupCandidate } from '../../src/types';
import {
  assertDiscordReportDesignerIsAdvisoryOnly,
  designDiscordVisualReport,
  type DiscordDecisionStatus,
  type MemoryHistoricalSupport,
  type ReportDirection,
} from '../../src/agents/discordReportDesignerAgent';
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

function candidateLevels(candidate: SetupCandidate): { stop: number | null; target1: number | null; target2: number | null } {
  const stop = typeof candidate.stop === 'number' && Number.isFinite(candidate.stop) ? candidate.stop : null;
  const computed = targetsFromEntryStop(candidate.direction, candidate.entry, stop);
  return {
    stop,
    target1: typeof candidate.target1 === 'number' && Number.isFinite(candidate.target1) ? candidate.target1 : computed.target1,
    target2: typeof candidate.target2 === 'number' && Number.isFinite(candidate.target2) ? candidate.target2 : computed.target2,
  };
}

function compactSessionDecisionLabel(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): string {
  if (override) return override;
  if (candidate?.executionStatus) return candidate.executionStatus;
  if (normalized.canExecute) return 'Executable';
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'Blocked';
  return 'Conditional';
}

function compactTradeDirection(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): ReportDirection {
  if (candidate?.direction && candidate.direction !== 'NO TRADE') return candidate.direction;
  return normalized.decision === 'LONG' || normalized.decision === 'SHORT' ? normalized.decision : 'WAIT';
}

function reportStatus(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): DiscordDecisionStatus {
  const status = compactSessionDecisionLabel(candidate, normalized, override).toLowerCase();
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'NO TRADE';
  if (status.includes('approved') || status.includes('executable')) return 'EXECUTABLE';
  if (status.includes('blocked') || status.includes('no trade') || status.includes('notrade')) return 'NO TRADE';
  if (status.includes('conditional')) return 'CONDITIONAL';
  return 'WAIT';
}

function statusLine(status: DiscordDecisionStatus, candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  if (status === 'EXECUTABLE') return 'EXECUTABLE - verify completed 5M trigger before trader action';
  if (status === 'CONDITIONAL') return 'WAIT - trigger not confirmed';
  if (status === 'NO TRADE') return `NO TRADE - ${normalized.noTradeReason || candidate?.blockReason || 'no active executable plan'}`;
  return 'WAIT - app-owned pipeline has not approved execution';
}

function compactActionText(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, status: DiscordDecisionStatus): string {
  if (status === 'NO TRADE') return 'Stand down. Recheck at next scheduled scan.';
  if (!candidate) return 'Stand down. No active plan candidate.';
  if (status === 'EXECUTABLE') return 'Verify completed 5M trigger, protected stop, target room, and invalidation before trader action.';
  if (candidate.executionStatus === 'Blocked') return `Stand down. ${candidate.blockReason || normalized.noTradeReason || 'Required gate failed.'}`;
  return candidate.requiredTrigger || candidate.nextAction || 'Wait for completed 5M trigger. No early entry.';
}

function compactPlanLines(candidate: SetupCandidate): string[] {
  const levels = candidateLevels(candidate);
  return [
    'Plan:',
    `Entry: ${priceLine(candidate.entry)}`,
    `Stop: ${priceLine(levels.stop)}`,
    `T1: ${priceLine(levels.target1)}`,
    `T2: ${priceLine(levels.target2)}`,
    `Risk: ${numberLine(candidate.riskPoints)} pts / N/A`,
  ];
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
    'Similar setups: 0',
    'Historical support: Neutral',
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
  if (attachments.chartPlan && attachments.priceLevelMap) return 'Details: See attached Chart Plan + Price Level Map.';
  if (attachments.chartPlan) return 'Details: Chart Plan attached. Price Level Map unavailable.';
  if (attachments.priceLevelMap) return 'Details: Price Level Map attached. Chart Plan unavailable.';
  return 'Details: Visual attachments unavailable — review local logs before action.';
}

export function compactDiscordSummary(args: CompactDiscordSummaryArgs): DiscordWebhookPayload {
  const bestCandidate = args.candidates[0] || null;
  const finalStatus = args.statusOverride || args.normalized.decisionStatus || (args.normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait);
  const direction = compactTradeDirection(bestCandidate, args.normalized);
  const decision = compactSessionDecisionLabel(bestCandidate, args.normalized, args.decisionOverride);
  const designerStatus = reportStatus(bestCandidate, args.normalized, args.statusOverride || args.decisionOverride);
  const model = bestCandidate ? professionalCandidateModelLabel(bestCandidate) : 'No approved model candidate';
  const reportKind = designerStatus === 'NO TRADE' ? 'REVIEW' : 'PLAN';
  const sessionLabel = sessionShortLabel(args.session);
  const headlineDirection = designerStatus === 'NO TRADE' ? 'NO TRADE' : direction;
  const headlineStatus = designerStatus === 'NO TRADE' ? '' : ` ${decision.toUpperCase()}`;
  const headline = `[${sessionLabel} ${reportKind}] ${args.instrument} - ${headlineDirection}${headlineStatus}`;
  const levels = bestCandidate ? candidateLevels(bestCandidate) : { stop: null, target1: null, target2: null };
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

  const lines = bestCandidate && designerStatus !== 'NO TRADE'
    ? [
        designerRecommendation.headlineRecommendation,
        `Status: ${statusLine(designerStatus, bestCandidate, args.normalized)}`,
        '',
        ...compactPlanLines(bestCandidate),
        '',
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

  return {
    username: 'Quant Desk',
    content: `${statusEmoji(finalStatus)} ${designerRecommendation.headlineRecommendation} | ${args.tradeDate}\nPlan ID: \`${args.planVersionId}\``,
    embeds: [
      {
        title: 'Compact Trade Plan Summary',
        description: professionalizeReportText(lines.join('\n')),
        color: statusColor(finalStatus),
        fields: [],
        footer: { text: 'Quant Desk • App-Owned Trade Pipeline • Chart Plan + Price Level Map when available' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(args.components ? { components: args.components } : {}),
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
