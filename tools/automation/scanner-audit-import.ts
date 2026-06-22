import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { DiagnosticScannerAuditEvent } from '../../src/agents/bridgeDiagnosticReplayAgent';
import type { DeskState } from '../../src/lib/localScannerEngine';

export type ScannerAuditEventType = 'trade' | 'watchlist' | 'health' | 'diagnostic' | 'unknown';

export interface ScannerAuditEvent extends DiagnosticScannerAuditEvent {
  alertTimestamp: string | null;
  marketTimestamp: string | null;
  tradeDate: string | null;
  instrument: string | null;
  session: string | null;
  alertType: ScannerAuditEventType;
  candidateSetupType: string | null;
  direction: string | null;
  scannerState: string | null;
  selectedCandidateDirection: string | null;
  selectedCandidateStatus: string | null;
  healthStatus: string | null;
  watchlistType: string | null;
  watchlistStatus: string | null;
  suppressionOrBlockReason: string | null;
  auditWarnings: string[];
  discordAlertSent: boolean | null;
  attachmentsGenerated: boolean;
  outcomeButtonsIncluded: boolean;
  ragOrSupabaseWriteAttempted: boolean;
  originalFilePath: string;
}

export interface ScannerAuditHistory {
  events: ScannerAuditEvent[];
  warnings: string[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function sentStatusOrNull(record: Record<string, unknown>): boolean | null {
  const explicit = [
    record.discordAlertSent,
    record.sent,
    record.discordSent,
    record.alertSent,
    record.payloadSent,
    record.posted,
  ].map(boolOrNull).find((value) => value !== null);
  if (explicit !== undefined) return explicit;
  const webhookStatus = stringOrNull(record.webhookStatus);
  if (!webhookStatus) return null;
  if (/^(sent|posted|success|succeeded|ok|200|204)$/i.test(webhookStatus)) return true;
  if (/^(failed|error|blocked|skipped)$/i.test(webhookStatus)) return false;
  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const found = stringOrNull(value);
    if (found) return found;
  }
  return null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function cloneRecord(record: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
}

function promotionReadinessForStage(stage: string | null): string {
  if (stage === 'market_mapping') return 'market_mapping_only';
  if (stage === 'watch') return 'watch_waiting_for_completed_5m';
  if (stage === 'conditional') return 'conditional_waiting_for_review_proof';
  if (stage === 'human_review_ready') return 'human_review_ready_waiting_for_existing_plan_gate';
  if (stage === 'posted_plan') return 'posted_plan_existing_gate_only';
  return 'blocked_or_no_trade';
}

function requiredPromotionProofForStage(stage: string | null): string[] {
  if (stage === 'watch') {
    return [
      'Completed 5M trigger or retest proof.',
      'Protected 5M structure stop.',
      'App-owned target room and invalidation proof.',
      'No-chase check when price is extended.',
    ];
  }
  if (stage === 'conditional') {
    return [
      'Confirmed entry, protected stop, T1, and T2 from the app-owned pipeline.',
      'Completed 5M hold/retest proof before human-review plan promotion.',
      'Normal session, risk, model, invalidation, and canExecute gates remain unchanged.',
    ];
  }
  if (stage === 'human_review_ready') {
    return [
      'Existing trade decision pipeline must approve any posted plan.',
      'canExecute remains false unless the existing deterministic gates already allowed it.',
    ];
  }
  if (stage === 'posted_plan') {
    return ['Posted plan must already have passed existing app-owned execution approval.'];
  }
  return [
    'Meaningful structured evidence must remain visible as watch, conditional, review, hold, no-trade, or data-quality blocker.',
  ];
}

function normalizeDeskStateForReplay(value: unknown): DeskState | null {
  const record = asRecord(value);
  if (record.sourceOfTruth !== 'scanner_desk_state') return null;
  const deskState = cloneRecord(record);
  const promotion = asRecord(deskState.promotion);
  if (promotion.sourceOfTruth === 'scanner_desk_state_promotion_path') {
    const stage = stringOrNull(promotion.currentStage) || 'no_trade';
    const requiredProof = Array.isArray(promotion.requiredProof) && promotion.requiredProof.length > 0
      ? promotion.requiredProof
      : requiredPromotionProofForStage(stage);
    const missingProof = Array.isArray(promotion.missingProof) ? promotion.missingProof : [];
    const blockedBy = Array.isArray(promotion.blockedBy) && promotion.blockedBy.length > 0
      ? promotion.blockedBy
      : missingProof.length > 0
        ? missingProof
        : requiredProof;
    promotion.promotionReadiness = stringOrNull(promotion.promotionReadiness) || promotionReadinessForStage(stage);
    promotion.requiredProof = requiredProof;
    promotion.missingProof = missingProof;
    promotion.blockedBy = blockedBy;
    promotion.approvalBoundary = {
      ...asRecord(promotion.approvalBoundary),
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    };
    deskState.promotion = promotion;
  }
  return deskState as unknown as DeskState;
}

function expandAuditJson(value: unknown, filePath: string): { value: unknown; filePath: string }[] {
  const record = asRecord(value);
  const events = asRecord(record.events);
  if (record.reportType !== 'scanner_decision_event_tape' || Object.keys(events).length === 0) {
    return [{ value, filePath }];
  }

  return Object.entries(events).map(([eventKey, eventValue]) => {
    const event = asRecord(eventValue);
    const discord = asRecord(event.discord);
    return {
      value: {
        ...event,
        source: 'live-scanner',
        tradeDate: record.tradeDate,
        instrument: record.instrument,
        session: record.session,
        createdAt: event.recordedAt || event.time || record.updatedAt || record.createdAt,
        marketTimestamp: event.time,
        timestamp: event.time,
        state: event.scannerState,
        scannerAlertReason: discord.sendOrSuppressReason,
        discordAlertSent: discord.shouldSend,
      },
      filePath: `${filePath}#${eventKey}`,
    };
  });
}

async function readJsonFiles(dir: string): Promise<{ value: unknown; filePath: string }[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const values: { value: unknown; filePath: string }[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(dir, entry.name);
    try {
      values.push(...expandAuditJson(JSON.parse(await fs.readFile(filePath, 'utf8')), filePath));
    } catch {
      values.push({ value: { auditWarnings: [`Could not parse ${entry.name}`] }, filePath });
    }
  }
  return values;
}

function candidateFrom(record: Record<string, unknown>): Record<string, unknown> {
  const selected = asRecord(record.selectedCandidate);
  const candidate = asRecord(record.candidate);
  const candidates = Array.isArray(record.candidates) ? record.candidates.map(asRecord) : [];
  return selected.setupType ? selected : candidate.setupType ? candidate : candidates[0] || {};
}

export function normalizeScannerAuditRecord(value: unknown, filePath: string): ScannerAuditEvent {
  const record = asRecord(value);
  const memory = asRecord(record.memory);
  const health = asRecord(record.health);
  const candidate = candidateFrom(record);
  const normalizedPlan = asRecord(record.normalizedPlan);
  const attachments = asRecord(record.attachments);
  const watchlistType = firstString(record.watchlistType, memory.watchlistType);
  const healthStatus = firstString(record.healthStatus, health.status, record.status);
  const diagnosticClassification = firstString(record.finalClassification);
  const source = firstString(record.source, record.job);
  const alertType: ScannerAuditEventType = diagnosticClassification
    ? 'diagnostic'
    : watchlistType
      ? 'watchlist'
      : healthStatus
        ? 'health'
        : source === 'live-scanner' || candidate.setupType || normalizedPlan.decisionStatus
          ? 'trade'
          : 'unknown';

  return {
    alertTimestamp: firstString(record.createdAt, record.sentAt, record.timestamp, record.lastHealthAlertSentAt),
    marketTimestamp: firstString(record.marketTimestamp),
    tradeDate: firstString(record.tradeDate, memory.tradeDate),
    instrument: firstString(record.instrument, memory.instrument),
    session: firstString(record.session, record.job, memory.session),
    alertType,
    candidateSetupType: firstString(candidate.setupType, record.setupType),
    direction: firstString(record.direction, memory.direction, candidate.direction, normalizedPlan.decision),
    scannerState: firstString(record.state, record.scannerState, record.alertState),
    selectedCandidateDirection: firstString(candidate.direction),
    selectedCandidateStatus: firstString(candidate.executionStatus, record.candidateStatus),
    healthStatus,
    watchlistType,
    watchlistStatus: firstString(record.watchlistStatus, memory.status, record.status),
    suppressionOrBlockReason: firstString(record.blockReason, candidate.blockReason, record.reason, record.scannerAlertReason),
    auditWarnings: [
      ...stringList(record.auditWarnings),
      ...stringList(record.scannerAuditWarnings),
      ...stringList(memory.auditWarnings),
      ...stringList(health.warnings),
    ],
    discordAlertSent: sentStatusOrNull(record),
    attachmentsGenerated: Boolean(attachments.chartMarkup || attachments.priceLevelMap || attachments.chartPlan || attachments.priceLevelMap),
    outcomeButtonsIncluded: JSON.stringify(record.components || '').includes('custom_id'),
    ragOrSupabaseWriteAttempted: Boolean(record.rag || record.ragSave || record.supabase || record.persistence || record.storage),
    deskState: normalizeDeskStateForReplay(record.deskState),
    originalFilePath: filePath,
  };
}

export async function loadDiscordAuditHistory(dir: string): Promise<ScannerAuditHistory> {
  if (!existsSync(dir)) return { events: [], warnings: [`Audit folder missing: ${dir}`] };
  const records = await readJsonFiles(dir);
  return {
    events: records.map((record) => normalizeScannerAuditRecord(record.value, record.filePath)),
    warnings: [],
  };
}

export async function loadScannerAuditHistory(dir: string): Promise<ScannerAuditHistory> {
  return loadDiscordAuditHistory(dir);
}

export async function loadWatchlistAuditHistory(dir: string): Promise<ScannerAuditHistory> {
  const history = await loadDiscordAuditHistory(dir);
  return {
    events: history.events.filter((event) => event.alertType === 'watchlist'),
    warnings: history.warnings,
  };
}

export async function loadHealthAuditHistory(dir: string): Promise<ScannerAuditHistory> {
  const history = await loadDiscordAuditHistory(dir);
  return {
    events: history.events.filter((event) => event.alertType === 'health'),
    warnings: history.warnings,
  };
}
