import fs from 'node:fs/promises';
import path from 'node:path';
import { TradeDecisionStatus, type SetupCandidate } from '../../src/types';
import { DISCORD_TRADE_PLAN_VISUAL_CONTRACT } from './discord-visual-contract';

export type SchedulerReplayProvenanceMode = 'live_scanner_audit' | 'post_facto_scheduler_replay';
export type SchedulerReplayProvenanceStatus =
  | 'clear'
  | 'blocked_contradicts_live_executable'
  | 'blocked_post_facto_trade_plan_not_canonical'
  | 'allowed_post_facto';

export interface ExecutableScannerAuditSummary {
  auditFile: string;
  createdAt: string | null;
  planVersionId: string | null;
  tradeDate: string | null;
  session: string | null;
  instrument: string | null;
  direction: string | null;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
  candidate: SetupCandidate | null;
  normalizedPlan: Record<string, unknown> | null;
  attachments: {
    chartMarkup: string | null;
    priceLevelMap: string | null;
    renderContract: string | null;
    generatedBy: string | null;
    generatedAt: string | null;
    planVersionId: string | null;
  };
}

export interface SchedulerReplayProvenanceResult {
  mode: SchedulerReplayProvenanceMode;
  status: SchedulerReplayProvenanceStatus;
  note: string;
  liveExecutableAudits: ExecutableScannerAuditSummary[];
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function scannerAuditCanExecute(audit: any): boolean {
  return audit?.source === 'live-scanner'
    && audit?.normalizedPlan?.canExecute === true
    && audit?.normalizedPlan?.decisionStatus === TradeDecisionStatus.ApprovedTrade;
}

function scannerAuditSummary(auditFile: string, audit: any): ExecutableScannerAuditSummary {
  const normalized = audit?.normalizedPlan && typeof audit.normalizedPlan === 'object'
    ? audit.normalizedPlan as Record<string, unknown>
    : null;
  const candidate = audit?.candidate && typeof audit.candidate === 'object'
    ? audit.candidate as SetupCandidate
    : null;
  return {
    auditFile,
    createdAt: readString(audit?.createdAt),
    planVersionId: readString(audit?.planVersionId),
    tradeDate: readString(audit?.tradeDate),
    session: readString(audit?.session),
    instrument: readString(audit?.instrument),
    direction: readString(normalized?.decision) || readString(candidate?.direction) || null,
    entry: readNumber(normalized?.entry) ?? readNumber(candidate?.entry),
    stop: readNumber(normalized?.stop) ?? readNumber(candidate?.stop),
    t1: readNumber(normalized?.t1),
    t2: readNumber(normalized?.t2),
    riskPoints: readNumber(normalized?.riskPoints) ?? readNumber(candidate?.riskPoints),
    candidate,
    normalizedPlan: normalized,
    attachments: {
      chartMarkup: readString(audit?.attachments?.chartMarkup),
      priceLevelMap: readString(audit?.attachments?.priceLevelMap),
      renderContract: readString(audit?.attachments?.renderContract),
      generatedBy: readString(audit?.attachments?.generatedBy),
      generatedAt: readString(audit?.attachments?.generatedAt),
      planVersionId: readString(audit?.attachments?.planVersionId),
    },
  };
}

export function validateExecutableScannerAuditVisualsForRepost(audit: ExecutableScannerAuditSummary): string[] {
  const files = [audit.attachments.chartMarkup, audit.attachments.priceLevelMap].filter((file): file is string => Boolean(file));
  if (files.length !== 2) {
    throw new Error('Scanner audit repost blocked: executable trade-plan reposts require both current chart markup and price level map attachments.');
  }
  if (audit.attachments.renderContract !== DISCORD_TRADE_PLAN_VISUAL_CONTRACT) {
    throw new Error(`Scanner audit repost blocked: chart attachments are missing the current visual render contract (${DISCORD_TRADE_PLAN_VISUAL_CONTRACT}). Regenerate the chart attachments before reposting.`);
  }
  if (audit.attachments.generatedBy !== 'chart-markup-renderer') {
    throw new Error('Scanner audit repost blocked: chart attachments are missing chart-markup-renderer provenance.');
  }
  if (audit.attachments.planVersionId !== audit.planVersionId) {
    throw new Error('Scanner audit repost blocked: chart attachment provenance does not match the live scanner audit planVersionId.');
  }
  return files;
}

export async function loadExecutableScannerAuditSummaries(args: {
  auditDir: string;
  tradeDate: string;
  instrument: string;
  session: string;
}): Promise<ExecutableScannerAuditSummary[]> {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(args.auditDir);
  } catch {
    return [];
  }

  const summaries: ExecutableScannerAuditSummary[] = [];
  for (const name of entries) {
    if (!name.startsWith(`scanner-${args.session}-${args.tradeDate}-${args.instrument}-`) || !name.endsWith('.json')) {
      continue;
    }
    const auditFile = path.join(args.auditDir, name);
    let audit: any;
    try {
      audit = JSON.parse(await fs.readFile(auditFile, 'utf8'));
    } catch {
      continue;
    }
    if (!scannerAuditCanExecute(audit)) continue;
    summaries.push(scannerAuditSummary(auditFile, audit));
  }

  return summaries.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return aTime - bTime;
  });
}

export async function loadExecutableScannerAuditFromFile(auditFile: string): Promise<ExecutableScannerAuditSummary> {
  const audit = JSON.parse(await fs.readFile(auditFile, 'utf8'));
  if (!scannerAuditCanExecute(audit)) {
    throw new Error('Scanner audit repost blocked: audit is not a live executable scanner audit.');
  }
  return scannerAuditSummary(auditFile, audit);
}

export async function evaluateSchedulerReplayProvenance(args: {
  auditDir: string;
  tradeDate: string;
  instrument: string;
  session: string;
  normalizedPlan: { canExecute?: boolean; decisionStatus?: string; noTradeReason?: string | null };
  candidateCount?: number;
  allowPostFactoSummary: boolean;
}): Promise<SchedulerReplayProvenanceResult> {
  const liveExecutableAudits = await loadExecutableScannerAuditSummaries({
    auditDir: args.auditDir,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
  });
  const schedulerSaysNoTrade = args.normalizedPlan.canExecute !== true
    && (args.normalizedPlan.decisionStatus === TradeDecisionStatus.NoTrade || Boolean(args.normalizedPlan.noTradeReason));
  const contradictsLiveExecutable = schedulerSaysNoTrade && liveExecutableAudits.length > 0;
  const sessionCanCarryTradePlan = args.session === 'morning' || args.session === 'lunch';
  const hasPostFactoTradeCandidate = sessionCanCarryTradePlan && (args.candidateCount || 0) > 0;

  if (hasPostFactoTradeCandidate) {
    return {
      mode: 'post_facto_scheduler_replay',
      status: 'blocked_post_facto_trade_plan_not_canonical',
      liveExecutableAudits,
      note: 'Manual scheduler replay blocked: post-facto morning/lunch trade-plan cards may not rebuild side, line, entry, stop, or targets. Use --repost-scanner-audit with an exact scanner-owned DeskPublishDecision/audit record, or run the live scanner path.',
    };
  }

  if (contradictsLiveExecutable && !args.allowPostFactoSummary) {
    return {
      mode: 'post_facto_scheduler_replay',
      status: 'blocked_contradicts_live_executable',
      liveExecutableAudits,
      note: 'Manual scheduler replay blocked: a live executable scanner audit exists for this session. Use --repost-scanner-audit to repost the exact live record, or --allow-post-facto-summary to publish a clearly labeled replay summary.',
    };
  }

  return {
    mode: 'post_facto_scheduler_replay',
    status: contradictsLiveExecutable ? 'allowed_post_facto' : 'clear',
    liveExecutableAudits,
    note: contradictsLiveExecutable
      ? 'Post-facto scheduler replay allowed by explicit flag. Live scanner audit remains the historical source of truth.'
      : 'Post-facto scheduler replay summary. Live scanner audits remain the historical source of truth when present.',
  };
}

export function provenanceLines(result: SchedulerReplayProvenanceResult): string[] {
  const lines = [
    'Provenance:',
    result.mode === 'live_scanner_audit'
      ? 'Source: live scanner audit.'
      : 'Source: post-facto scheduler replay summary.',
    result.note,
  ];
  const latest = result.liveExecutableAudits[result.liveExecutableAudits.length - 1];
  if (latest) {
    lines.push(`Live source: ${latest.planVersionId || path.basename(latest.auditFile)} | ${latest.direction || 'UNKNOWN'} | Entry ${latest.entry ?? 'N/A'} | Stop ${latest.stop ?? 'N/A'}.`);
  }
  return lines;
}
