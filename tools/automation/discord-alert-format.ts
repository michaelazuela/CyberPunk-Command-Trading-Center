import { targetsFromEntryStop } from '../../src/config/tradeRules';
import { scannerAlertQualityFromScore } from '../../src/lib/localScannerEngine';
import { TradeDecisionStatus, type SetupCandidate } from '../../src/types';
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

function moneyLine(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'N/A';
}

function sessionDisplayName(session: CompactDiscordSession): string {
  return session === 'morning' ? 'Morning' : 'Lunch';
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

function candidateConfidenceScore(candidate: SetupCandidate): number {
  if (typeof candidate.decisionQualityScore === 'number') return candidate.decisionQualityScore;
  const base =
    candidate.executionStatus === 'Executable' ? 55 :
    candidate.executionStatus === 'Conditional' ? 42 :
    candidate.executionStatus === 'Blocked' ? 35 :
    20;
  const confidence =
    candidate.confidence === 'High' ? 15 :
    candidate.confidence === 'Medium' ? 8 :
    2;
  const trigger = candidate.requiredTrigger ? 8 : 0;
  const stop = candidate.stop ? 8 : 0;
  const target = candidate.target1 && candidate.target2 ? 8 : 0;
  const context = candidate.levelContextScore ? Math.min(6, Math.round(candidate.levelContextScore / 4)) : 0;
  return Math.max(0, Math.min(100, Math.round(base + confidence + trigger + stop + target + context)));
}

function compactSessionDecisionLabel(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan, override?: string | null): string {
  if (override) return override;
  if (candidate?.executionStatus) return candidate.executionStatus;
  if (normalized.canExecute) return 'Executable';
  if (normalized.decisionStatus === TradeDecisionStatus.NoTrade || normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'Blocked';
  return 'Conditional';
}

function compactTradeDirection(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  if (candidate?.direction && candidate.direction !== 'NO TRADE') return candidate.direction;
  return normalized.decision === 'LONG' || normalized.decision === 'SHORT' ? normalized.decision : 'WAIT';
}

function compactLevelsLine(candidate: SetupCandidate | null): string {
  if (!candidate) return 'Levels: no active candidate levels available.';
  const levels = candidateLevels(candidate);
  const liquidityTarget =
    candidate.targetObjectivePlan?.liquidityTarget1 ||
    candidate.targetObjectivePlan?.nearestLiquidityTarget ||
    candidate.targetObjectivePlan?.liquidityRunnerTarget ||
    null;
  return [
    `Entry ${moneyLine(candidate.entry)}`,
    `Stop ${moneyLine(levels.stop)}`,
    `T1 ${moneyLine(levels.target1)}`,
    `T2 ${moneyLine(levels.target2)}`,
    `Liquidity ${moneyLine(liquidityTarget?.price)}`,
  ].join(' | ');
}

function compactActionLine(candidate: SetupCandidate | null, normalized: CompactNormalizedPlan): string {
  if (!candidate) return 'Action: no trade plan candidate. Keep this as market mapping only.';
  if (candidate.executionStatus === 'Executable') return 'Action: verify completed 5M trigger, protected stop, and target room before acting.';
  if (candidate.executionStatus === 'Blocked') return `Action: blocked. ${candidate.blockReason || normalized.noTradeReason || 'Required gate failed.'}`;
  return `Action: wait. ${candidate.requiredTrigger || candidate.nextAction || 'Confirmation still required.'}`;
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
  const score = typeof args.scoreOverride === 'number' ? args.scoreOverride : bestCandidate ? candidateConfidenceScore(bestCandidate) : null;
  const scoreLabel = score === null ? 'N/A' : `${score}/100`;
  const quality = score === null ? null : scannerAlertQualityFromScore(score).label;
  const model = bestCandidate ? professionalCandidateModelLabel(bestCandidate) : 'No approved model candidate';
  const sourceLabel = args.sourceLabel || sessionDisplayName(args.session);
  const windowLine = args.windowLabel ? `Window: ${args.windowLabel}` : `Session: ${sessionDisplayName(args.session)}`;
  const lines = [
    `**${direction} ${sourceLabel} Alert - ${decision}**`,
    `Model: ${model}`,
    `Score: ${scoreLabel}${quality ? ` | ${quality}` : ''}`,
    compactLevelsLine(bestCandidate),
    compactActionLine(bestCandidate, args.normalized),
    windowLine,
    compactAttachmentLine(args.attachments, Boolean(bestCandidate)),
  ];

  return {
    username: 'Quant Desk',
    content: `${statusEmoji(finalStatus)} Quant Desk ${sourceLabel} Alert | ${args.instrument} | ${args.tradeDate}\nPlan ID: \`${args.planVersionId}\``,
    embeds: [
      {
        title: 'Compact Trade Plan Summary',
        description: professionalizeReportText(`${lines.join('\n')}\n\nDecision support only. No automated orders.`),
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
  if (mainText.includes('Missing rea...') || mainText.includes('Qualified rea...') || mainText.includes('Target casc...') || mainText.includes('Audit det...')) {
    throw new Error('Discord payload blocked: truncation artifact detected in main alert text.');
  }
  if (/(\bMissing reasons|\bQualified reasons|\bTarget cascade|\bAudit detail|\bScore breakdown)/i.test(mainText)) {
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
