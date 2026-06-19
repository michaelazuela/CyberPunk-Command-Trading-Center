import fs from 'node:fs';
import path from 'node:path';
import { readRuntimeJsonSync } from '../runtimeJson';

export type ScannerDeliveryStatus = 'sent' | 'failed' | 'pending' | 'skipped' | 'unknown';

export interface ScannerDeliveryRecord {
  alertKey: string;
  planVersionId: string | null;
  instrument: string | null;
  tradeDate: string | null;
  session: string | null;
  state: string | null;
  confidence: number | null;
  deliveryStatus: ScannerDeliveryStatus;
  webhookSource: string | null;
  httpStatus: number | null;
  discordMessageId: string | null;
  error: string | null;
  attemptedAt: string | null;
  sentAt: string | null;
  auditLogPath: string | null;
  stale: boolean | null;
  retryEligible: boolean | null;
}

export interface ScannerSentRecord {
  alertKey: string;
  state: string | null;
  confidence: number | null;
  sentAt: string | null;
}

export interface WatchlistRecord {
  key: string;
  direction: string | null;
  sentAt: string | null;
}

export interface AuditFileSummary {
  filePath: string;
  fileName: string;
  kind: 'scanner_audit' | 'decision_tape' | 'watchlist' | 'other';
  modifiedAt: string;
  ageMs: number;
  sizeBytes: number;
}

export interface DeliveryVisibilityReport {
  status: 'ok' | 'warn';
  generatedAt: string;
  scannerStatePath: string;
  auditDir: string;
  marketDataGapLedgerPath: string;
  recorderHeartbeatPath: string;
  stateReadable: boolean;
  stateError: string | null;
  lastAlert: ScannerSentRecord | null;
  lastDelivery: ScannerDeliveryRecord | null;
  lastDiscordSend: ScannerDeliveryRecord | null;
  failedDeliveries: ScannerDeliveryRecord[];
  pendingDeliveries: ScannerDeliveryRecord[];
  skippedDeliveries: ScannerDeliveryRecord[];
  lastWatchlist: WatchlistRecord | null;
  recentAuditFiles: AuditFileSummary[];
  recentDecisionTapes: AuditFileSummary[];
  staleDataBlockers: string[];
  pendingMarketDataGapSync: {
    count: number;
    oldestLocalRecordedAt: string | null;
    oldestAgeMs: number | null;
    staleCount: number;
  };
  boundaries: {
    readOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesTradingLogic: false;
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function parseDateMs(value: string | null): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function parseTradeDateMs(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? parseDateMs(`${match[1]}T00:00:00.000Z`) : parseDateMs(value);
}

function tradeDateFromKey(key: string): string | null {
  return key.match(/^(\d{4}-\d{2}-\d{2})[:|]/)?.[1] || null;
}

function latestTradeDate(state: Record<string, unknown>, now: Date): string | null {
  const dates = new Set<string>();
  for (const key of Object.keys(asRecord(state.lastCompleted5mBySession))) {
    const date = tradeDateFromKey(key);
    if (date) dates.add(date);
  }
  for (const key of Object.keys(asRecord(state.lastMarketMapRefreshBySession))) {
    const date = tradeDateFromKey(key);
    if (date) dates.add(date);
  }
  for (const key of Object.keys(asRecord(state.sent))) {
    const date = key.match(/^(\d{4}-\d{2}-\d{2})\|/)?.[1];
    if (date) dates.add(date);
  }
  const sorted = [...dates].sort((a, b) => parseTradeDateMs(b) - parseTradeDateMs(a));
  if (!sorted.length) return null;

  const nowDate = now.toISOString().slice(0, 10);
  const latest = sorted[0];
  const nowMs = parseTradeDateMs(nowDate);
  const latestMs = parseTradeDateMs(latest);
  const olderThanToday = latestMs < nowMs;
  const beforeRth = now.getUTCHours() < 14;
  return olderThanToday && beforeRth ? null : latest;
}

function etMinutes(now: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function isRthScannerFreshnessWindow(now: Date): boolean {
  const minutes = etMinutes(now);
  return minutes >= (9 * 60 + 15) && minutes < (16 * 60);
}

function deliveryStatus(value: unknown): ScannerDeliveryStatus {
  if (value === 'sent' || value === 'failed' || value === 'pending' || value === 'skipped') return value;
  return 'unknown';
}

function sortByRecentDate<T>(items: T[], getDate: (item: T) => string | null): T[] {
  return [...items].sort((a, b) => parseDateMs(getDate(b)) - parseDateMs(getDate(a)));
}

function toDelivery(alertKey: string, raw: unknown): ScannerDeliveryRecord {
  const record = asRecord(raw);
  const candidate = asRecord(record.candidate);
  return {
    alertKey,
    planVersionId: stringOrNull(record.planVersionId),
    instrument: stringOrNull(record.instrument),
    tradeDate: stringOrNull(record.tradeDate),
    session: stringOrNull(record.session),
    state: stringOrNull(record.state),
    confidence: numberOrNull(record.confidence),
    deliveryStatus: deliveryStatus(record.deliveryStatus),
    webhookSource: stringOrNull(record.webhookSource),
    httpStatus: numberOrNull(record.httpStatus),
    discordMessageId: stringOrNull(record.discordMessageId),
    error: stringOrNull(record.error),
    attemptedAt: stringOrNull(record.attemptedAt),
    sentAt: stringOrNull(record.sentAt),
    auditLogPath: stringOrNull(record.auditLogPath),
    stale: boolOrNull(record.stale),
    retryEligible: boolOrNull(record.retryEligible),
    // Touch candidate fields only to preserve visibility in future expansion without exposing executable claims.
    ...(Object.keys(candidate).length ? {} : {}),
  };
}

function isDryRunDelivery(delivery: ScannerDeliveryRecord): boolean {
  return delivery.webhookSource === 'dry_run';
}

function toSent(alertKey: string, raw: unknown): ScannerSentRecord {
  const record = asRecord(raw);
  return {
    alertKey,
    state: stringOrNull(record.state),
    confidence: numberOrNull(record.confidence),
    sentAt: stringOrNull(record.sentAt),
  };
}

function toWatchlist(key: string, raw: unknown): WatchlistRecord {
  const record = asRecord(raw);
  return {
    key,
    direction: stringOrNull(record.direction),
    sentAt: stringOrNull(record.sentAt),
  };
}

function auditKind(fileName: string): AuditFileSummary['kind'] {
  if (/scanner-decision-tape/i.test(fileName)) return 'decision_tape';
  if (/watchlist/i.test(fileName)) return 'watchlist';
  if (/scanner-/i.test(fileName)) return 'scanner_audit';
  return 'other';
}

function recentAuditFiles(auditDir: string, now: Date, limit: number): AuditFileSummary[] {
  if (!fs.existsSync(auditDir)) return [];
  return fs.readdirSync(auditDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => {
      const filePath = path.join(auditDir, entry.name);
      const stat = fs.statSync(filePath);
      return {
        filePath,
        fileName: entry.name,
        kind: auditKind(entry.name),
        modifiedAt: stat.mtime.toISOString(),
        ageMs: Math.max(0, Math.round(now.getTime() - stat.mtimeMs)),
        sizeBytes: stat.size,
      };
    })
    .sort((a, b) => parseDateMs(b.modifiedAt) - parseDateMs(a.modifiedAt))
    .slice(0, limit);
}

function latestEntry(entries: Array<{ key: string; value: string | null }>): { key: string; value: string | null } | null {
  return entries
    .filter((entry) => entry.value)
    .sort((a, b) => parseDateMs(b.value) - parseDateMs(a.value))[0] || null;
}

function recorderHeartbeatFreshness(heartbeatPath: string, now: Date, staleAfterMs: number): {
  fresh: boolean;
  latestCompleted5m: string | null;
} {
  const parsed = readRuntimeJsonSync<Record<string, unknown>>(heartbeatPath).value;
  if (!parsed) {
    return { fresh: false, latestCompleted5m: null };
  }
  const status = stringOrNull(parsed.status);
  const updatedAt = stringOrNull(parsed.updatedAt);
  const updatedAtMs = parseDateMs(updatedAt);
  const ageMs = updatedAtMs > 0 ? now.getTime() - updatedAtMs : Number.POSITIVE_INFINITY;
  return {
    fresh: status === 'ok' && Number.isFinite(ageMs) && ageMs <= staleAfterMs,
    latestCompleted5m: stringOrNull(parsed.latestCompleted5m),
  };
}

function staleBlockers(
  state: Record<string, unknown>,
  now: Date,
  staleAfterMs: number,
  recorderHeartbeat: { fresh: boolean; latestCompleted5m: string | null },
): string[] {
  const blockers: string[] = [];
  const scannerFreshnessWindowActive = isRthScannerFreshnessWindow(now);
  const lastHealthStatus = stringOrNull(state.lastHealthStatus);
  if (scannerFreshnessWindowActive && lastHealthStatus && lastHealthStatus !== 'READY') {
    blockers.push(`Scanner health status is ${lastHealthStatus}.`);
  }

  const activeTradeDate = scannerFreshnessWindowActive ? latestTradeDate(state, now) : null;
  let latestCompletedFresh = false;
  if (activeTradeDate) {
    const lastCompleted = Object.entries(asRecord(state.lastCompleted5mBySession))
      .map(([key, value]) => ({ key, value: stringOrNull(value) }))
      .filter((entry) => entry.value && tradeDateFromKey(entry.key) === activeTradeDate);
    const latestCompleted = latestEntry(lastCompleted);
    latestCompletedFresh = Boolean(latestCompleted && now.getTime() - parseDateMs(latestCompleted.value) <= staleAfterMs);
    if (latestCompleted && !latestCompletedFresh) {
      if (recorderHeartbeat.fresh && recorderHeartbeat.latestCompleted5m) {
        latestCompletedFresh = true;
      } else {
        blockers.push(`Latest completed 5M marker is stale: ${latestCompleted.key}.`);
      }
    }
  }

  if (activeTradeDate && !latestCompletedFresh) {
    const lastRefresh = Object.entries(asRecord(state.lastMarketMapRefreshBySession))
      .map(([key, value]) => ({ key, value: stringOrNull(value) }))
      .filter((entry) => entry.value && tradeDateFromKey(entry.key) === activeTradeDate);
    const latestRefresh = latestEntry(lastRefresh);
    if (latestRefresh && now.getTime() - parseDateMs(latestRefresh.value) > staleAfterMs) {
      blockers.push(`Latest market-map refresh is stale: ${latestRefresh.key}.`);
    }
  }

  return blockers;
}

function pendingMarketDataGapSyncSummary(ledgerPath: string, now: Date, staleAfterMs: number): DeliveryVisibilityReport['pendingMarketDataGapSync'] {
  let records: Array<Record<string, unknown>> = [];
  const parsed = readRuntimeJsonSync<unknown>(ledgerPath).value;
  records = Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];

  const pending = records.filter((record) => record.syncStatus === 'pending_supabase_sync');
  const pendingTimes = pending
    .map((record) => stringOrNull(record.localRecordedAt))
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, ms: parseDateMs(value) }))
    .filter((item) => item.ms > 0)
    .sort((a, b) => a.ms - b.ms);
  const oldest = pendingTimes[0] || null;
  const oldestAgeMs = oldest ? Math.max(0, now.getTime() - oldest.ms) : null;
  return {
    count: pending.length,
    oldestLocalRecordedAt: oldest?.value || null,
    oldestAgeMs,
    staleCount: pendingTimes.filter((item) => now.getTime() - item.ms > staleAfterMs).length,
  };
}

export function buildDeliveryVisibilityReport(args: {
  cwd?: string;
  scannerStatePath?: string;
  auditDir?: string;
  marketDataGapLedgerPath?: string;
  recorderHeartbeatPath?: string;
  now?: Date;
  staleAfterMs?: number;
  recentAuditLimit?: number;
} = {}): DeliveryVisibilityReport {
  const cwd = args.cwd || process.cwd();
  const now = args.now || new Date();
  const staleAfterMs = args.staleAfterMs ?? 180_000;
  const scannerStatePath = args.scannerStatePath || path.resolve(cwd, 'tools', 'automation', '.nt-scanner-state.json');
  const auditDir = args.auditDir || path.resolve(cwd, 'tools', 'automation', 'discord-audit');
  const marketDataGapLedgerPath = args.marketDataGapLedgerPath || path.resolve(cwd, 'tools', 'automation', '.market-data-gap-events.json');
  const recorderHeartbeatPath = args.recorderHeartbeatPath || path.resolve(cwd, 'logs', 'supervisor', 'candle-recorder-heartbeat.json');
  const recentFiles = recentAuditFiles(auditDir, now, args.recentAuditLimit ?? 8);

  let stateReadable = false;
  let stateError: string | null = null;
  let state: Record<string, unknown> = {};

  const stateRead = readRuntimeJsonSync<Record<string, unknown>>(scannerStatePath);
  if (stateRead.value) {
    state = stateRead.value;
    stateReadable = true;
    stateError = stateRead.source === 'backup' ? `Recovered from backup after primary read failed: ${stateRead.error || 'unknown error'}` : null;
  } else {
    stateError = stateRead.error;
  }

  const sent = sortByRecentDate(
    Object.entries(asRecord(state.sent)).map(([key, value]) => toSent(key, value)),
    (item) => item.sentAt,
  );
  const deliveries = sortByRecentDate(
    Object.entries(asRecord(state.alertDeliveries)).map(([key, value]) => toDelivery(key, value)),
    (item) => item.sentAt || item.attemptedAt,
  );
  const operationalDeliveries = deliveries.filter((delivery) => !isDryRunDelivery(delivery));
  const watchlists = sortByRecentDate(
    Object.entries(asRecord(state.watchlistSent)).map(([key, value]) => toWatchlist(key, value)),
    (item) => item.sentAt,
  );

  const failedDeliveries = operationalDeliveries.filter((delivery) => delivery.deliveryStatus === 'failed');
  const pendingDeliveries = operationalDeliveries.filter((delivery) => delivery.deliveryStatus === 'pending');
  const skippedDeliveries = operationalDeliveries.filter((delivery) => delivery.deliveryStatus === 'skipped');
  const heartbeatFreshness = recorderHeartbeatFreshness(recorderHeartbeatPath, now, staleAfterMs);
  const blockers = stateReadable ? staleBlockers(state, now, staleAfterMs, heartbeatFreshness) : ['Scanner state file is not readable.'];
  const pendingGapSync = pendingMarketDataGapSyncSummary(marketDataGapLedgerPath, now, staleAfterMs);
  if (pendingGapSync.staleCount > 0) {
    blockers.push(
      `Market data gap repair ledger has ${pendingGapSync.staleCount} pending Supabase sync item(s) older than ${Math.round(staleAfterMs / 60_000)} minutes; run npm run market-data:gaps:sync or restore Supabase connectivity.`,
    );
  }

  return {
    status: !stateReadable || failedDeliveries.length || pendingDeliveries.length || blockers.length ? 'warn' : 'ok',
    generatedAt: now.toISOString(),
    scannerStatePath,
    auditDir,
    marketDataGapLedgerPath,
    recorderHeartbeatPath,
    stateReadable,
    stateError,
    lastAlert: sent[0] || null,
    lastDelivery: operationalDeliveries[0] || null,
    lastDiscordSend: operationalDeliveries.find((delivery) => delivery.deliveryStatus === 'sent' && Boolean(delivery.discordMessageId)) || null,
    failedDeliveries,
    pendingDeliveries,
    skippedDeliveries,
    lastWatchlist: watchlists[0] || null,
    recentAuditFiles: recentFiles,
    recentDecisionTapes: recentFiles.filter((file) => file.kind === 'decision_tape'),
    staleDataBlockers: blockers,
    pendingMarketDataGapSync: pendingGapSync,
    boundaries: {
      readOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesTradingLogic: false,
    },
  };
}
