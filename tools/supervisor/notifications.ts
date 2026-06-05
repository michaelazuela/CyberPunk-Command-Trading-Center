import fs from 'node:fs';
import path from 'node:path';
import type { SupervisorStatusPayload } from './status';

export type SupervisorNotificationKind =
  | 'supervisor_ready'
  | 'scanner_down'
  | 'scanner_recovered'
  | 'recorder_down'
  | 'recorder_recovered'
  | 'bridge_unreachable'
  | 'bridge_recovered'
  | 'stale_5m_bars'
  | 'supervisor_self_heal'
  | 'child_restarted';

export interface SupervisorNotification {
  kind: SupervisorNotificationKind;
  title: string;
  description: string;
  severity: 'ok' | 'warn' | 'fail';
  dedupeKey: string;
  timestamp: string;
}

export interface SupervisorNotificationState {
  lastStatuses: Record<string, string>;
  lastSentAtByKey: Record<string, string>;
}

export interface SupervisorNotificationOptions {
  now?: Date;
  statePath?: string;
  webhookUrl?: string | null;
  dryRun?: boolean;
  staleCooldownMs?: number;
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface ScannerHistoryLine {
  timeframe: string;
  status: string;
  bars: string;
  from: string;
  to: string;
  source: string;
}

interface OperationalReportSummary {
  scannerHealth: string | null;
  scannerHistory: ScannerHistoryLine[];
  latestCompleted5m: string | null;
  marketMap: string | null;
  recorderCycle: string | null;
  recorderBars: string[];
}

const WEBHOOK_ENV_KEYS = [
  'SUPERVISOR_DISCORD_WEBHOOK_URL',
  'QUANT_DESK_HEALTH_WEBHOOK_URL',
  'QUANT_DESK_SCANNER_WEBHOOK_URL',
  'SCANNER_DISCORD_WEBHOOK_URL',
] as const;

const DEFAULT_STALE_COOLDOWN_MS = 4 * 60 * 60 * 1000;

export function resolveSupervisorDiscordWebhookUrl(env: NodeJS.ProcessEnv = process.env): { url: string | null; source: string | null } {
  for (const key of WEBHOOK_ENV_KEYS) {
    const value = env[key]?.trim();
    if (value) return { url: value, source: key };
  }
  return { url: null, source: null };
}

export function notificationStatePath(logsDir: string): string {
  return path.join(logsDir, 'supervisor-notifications-state.json');
}

export function readNotificationState(filePath: string): SupervisorNotificationState {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SupervisorNotificationState;
  } catch {
    return { lastStatuses: {}, lastSentAtByKey: {} };
  }
}

export function writeNotificationState(filePath: string, state: SupervisorNotificationState): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
}

function serviceStatus(status: SupervisorStatusPayload, id: string): string {
  return status.childServices.find((service) => service.id === id)?.status || 'missing';
}

function healthCheckStatus(status: SupervisorStatusPayload, id: string): string {
  return status.health?.checks.find((check) => check.id === id)?.status || 'unknown';
}

function stale5mBlockers(status: SupervisorStatusPayload): string[] {
  return (status.delivery?.staleDataBlockers || []).filter((blocker) => blocker.toLowerCase().includes('5m'));
}

function isReadyStatus(status: SupervisorStatusPayload): boolean {
  const monitoredServices = status.childServices.filter((service) => service.id === 'scanner' || service.id === 'candle-recorder');
  const externalDuplicates = monitoredServices.some((service) => service.externalPids.length > 0);
  return status.supervisor.status === 'ready' &&
    status.health?.status === 'ok' &&
    serviceStatus(status, 'scanner') === 'running' &&
    serviceStatus(status, 'candle-recorder') === 'running' &&
    healthCheckStatus(status, 'bridge') === 'ok' &&
    !externalDuplicates;
}

function hasLoadedOperationalReports(status: SupervisorStatusPayload): boolean {
  const summary = buildOperationalReportSummary(status);
  const requiredHistory = new Set(['5m', '15m', '60m', '240m']);
  const loadedHistory = summary.scannerHistory.filter((item) => requiredHistory.has(item.timeframe));
  return Boolean(summary.scannerHealth) &&
    Boolean(summary.latestCompleted5m) &&
    Boolean(summary.recorderCycle) &&
    loadedHistory.length === requiredHistory.size;
}

function shouldSendCooldown(state: SupervisorNotificationState, key: string, now: Date, cooldownMs: number): boolean {
  const lastSentAt = state.lastSentAtByKey[key];
  if (!lastSentAt) return true;
  const elapsed = now.getTime() - new Date(lastSentAt).getTime();
  return !Number.isFinite(elapsed) || elapsed >= cooldownMs;
}

function notification(args: {
  kind: SupervisorNotificationKind;
  title: string;
  description: string;
  severity: SupervisorNotification['severity'];
  dedupeKey?: string;
  now: Date;
}): SupervisorNotification {
  return {
    kind: args.kind,
    title: args.title,
    description: [
      args.description,
      '',
      'Operational status only. Not a trade alert. No action levels or outcome buttons are included.',
      'Decision support only. No automated orders.',
    ].join('\n'),
    severity: args.severity,
    dedupeKey: args.dedupeKey || args.kind,
    timestamp: args.now.toISOString(),
  };
}

export function buildSupervisorNotifications(
  status: SupervisorStatusPayload,
  previous: SupervisorNotificationState,
  now = new Date(),
  staleCooldownMs = DEFAULT_STALE_COOLDOWN_MS,
): { notifications: SupervisorNotification[]; nextState: SupervisorNotificationState } {
  const notifications: SupervisorNotification[] = [];
  const nextState: SupervisorNotificationState = {
    lastStatuses: { ...previous.lastStatuses },
    lastSentAtByKey: { ...previous.lastSentAtByKey },
  };

  if (
    isReadyStatus(status) &&
    hasLoadedOperationalReports(status) &&
    previous.lastStatuses[`supervisor_ready:${status.supervisor.pid}`] !== 'sent'
  ) {
    notifications.push(notification({
      kind: 'supervisor_ready',
      title: 'Quant Desk Supervisor Ready',
      description: [
        `Supervisor is ready and responding on ${status.config.host}.`,
        'Scanner is running under supervisor ownership.',
        'Recorder is running under supervisor ownership.',
        'Bridge health is reachable.',
        'No external duplicate scanner or recorder processes are reported.',
      ].join('\n'),
      severity: 'ok',
      dedupeKey: `supervisor_ready:${status.supervisor.pid}`,
      now,
    }));
    nextState.lastStatuses[`supervisor_ready:${status.supervisor.pid}`] = 'sent';
  }

  for (const serviceId of ['scanner', 'candle-recorder'] as const) {
    const current = serviceStatus(status, serviceId);
    const previousStatus = previous.lastStatuses[`service:${serviceId}`];
    const label = serviceId === 'scanner' ? 'Scanner' : 'Recorder';
    const down = current !== 'running';
    const wasDown = previousStatus && previousStatus !== 'running';

    if (down && previousStatus !== current) {
      notifications.push(notification({
        kind: serviceId === 'scanner' ? 'scanner_down' : 'recorder_down',
        title: `${label} Not Running`,
        description: `${label} service status is ${current}. Supervisor will restart only failed supervisor-owned child processes.`,
        severity: 'fail',
        now,
      }));
    }

    if (!down && wasDown) {
      notifications.push(notification({
        kind: serviceId === 'scanner' ? 'scanner_recovered' : 'recorder_recovered',
        title: `${label} Recovered`,
        description: `${label} service recovered and is running under supervisor ownership.`,
        severity: 'ok',
        now,
      }));
    }

    nextState.lastStatuses[`service:${serviceId}`] = current;
  }

  const bridge = healthCheckStatus(status, 'bridge');
  const previousBridge = previous.lastStatuses.bridge;
  if (bridge === 'fail' && previousBridge !== 'fail') {
    notifications.push(notification({
      kind: 'bridge_unreachable',
      title: 'Bridge Unreachable',
      description: 'NinjaTrader bridge health is failing or unreachable. Scanner health may block alerts until recovery.',
      severity: 'fail',
      now,
    }));
  }
  if (bridge === 'ok' && previousBridge === 'fail') {
    notifications.push(notification({
      kind: 'bridge_recovered',
      title: 'Bridge Recovered',
      description: 'NinjaTrader bridge health is reachable again.',
      severity: 'ok',
      now,
    }));
  }
  nextState.lastStatuses.bridge = bridge;

  const staleBlockers = stale5mBlockers(status);
  if (staleBlockers.length && shouldSendCooldown(previous, 'stale_5m_bars', now, staleCooldownMs)) {
    notifications.push(notification({
      kind: 'stale_5m_bars',
      title: 'Latest 5M Bars Stale',
      description: staleBlockers.slice(0, 2).join('\n'),
      severity: 'warn',
      now,
    }));
  }

  for (const service of status.childServices) {
    const previousRestartCount = Number(previous.lastStatuses[`restart:${service.id}`] || '0');
    if (service.restartCount > previousRestartCount) {
      notifications.push(notification({
        kind: 'child_restarted',
        title: `${service.label} Restarted`,
        description: `${service.label} was restarted by the supervisor. Reason: ${service.lastRestartReason || 'owned child process restart policy'}.`,
        severity: 'warn',
        dedupeKey: `child_restarted:${service.id}:${service.restartCount}`,
        now,
      }));
    }
    nextState.lastStatuses[`restart:${service.id}`] = String(service.restartCount);
  }

  for (const item of notifications) {
    nextState.lastSentAtByKey[item.dedupeKey] = now.toISOString();
  }

  return { notifications, nextState };
}

function colorFor(severity: SupervisorNotification['severity']): number {
  if (severity === 'ok') return 0x2ecc71;
  if (severity === 'warn') return 0xffa000;
  return 0xff4d4d;
}

function readTailLines(filePath: string | null | undefined, maxBytes = 64_000): string[] {
  if (!filePath) return [];
  try {
    const stat = fs.statSync(filePath);
    const start = Math.max(0, stat.size - maxBytes);
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(stat.size - start);
      fs.readSync(fd, buffer, 0, buffer.length, start);
      return buffer.toString('utf8').split(/\r?\n/).filter(Boolean);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return [];
  }
}

function cleanLogLine(line: string): string {
  return line.replace(/\u001b\[[0-9;]*m/g, '').trim();
}

function lastMatching(lines: string[], pattern: RegExp): string | null {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const cleaned = cleanLogLine(lines[index]);
    if (pattern.test(cleaned)) return cleaned;
  }
  return null;
}

function parseScannerHistory(lines: string[]): ScannerHistoryLine[] {
  const historyByTimeframe = new Map<string, ScannerHistoryLine>();
  const pattern = /^\[scanner-history\]\s+(\S+):\s+([^,]+),\s+(\d+)\s+bars,\s+(.+?)\s+to\s+(.+?),\s+source=([^,]+)/;
  for (const line of lines.map(cleanLogLine)) {
    const match = line.match(pattern);
    if (!match) continue;
    historyByTimeframe.set(match[1], {
      timeframe: match[1],
      status: match[2],
      bars: match[3],
      from: match[4],
      to: match[5],
      source: match[6],
    });
  }
  return ['5m', '15m', '60m', '240m']
    .map((timeframe) => historyByTimeframe.get(timeframe))
    .filter((line): line is ScannerHistoryLine => Boolean(line));
}

function buildOperationalReportSummary(status: SupervisorStatusPayload): OperationalReportSummary {
  const scannerLog = status.childServices.find((service) => service.id === 'scanner')?.stdoutLog;
  const recorderLog = status.childServices.find((service) => service.id === 'candle-recorder')?.stdoutLog;
  const scannerLines = readTailLines(scannerLog);
  const recorderLines = readTailLines(recorderLog);
  const marketMap = lastMatching(scannerLines, /^\[scanner\]\s+Market Mapping Mode:/);

  return {
    scannerHealth: lastMatching(scannerLines, /^\[scanner-health\]/),
    scannerHistory: parseScannerHistory(scannerLines),
    latestCompleted5m: marketMap?.match(/completed 5M ([^|]+)/)?.[1]?.trim() || null,
    marketMap,
    recorderCycle: lastMatching(recorderLines, /^\[market-cache\]\s+cycle complete:/),
    recorderBars: recorderLines
      .map(cleanLogLine)
      .filter((line) => /^\[market-cache\]\s+\S+:\s+upserted\s+\d+\s+bars\./.test(line))
      .slice(-4),
  };
}

function truncateField(value: string, limit = 1024): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3)}...`;
}

function buildOperationalReportFields(status?: SupervisorStatusPayload): DiscordEmbedField[] {
  if (!status) return [];
  const summary = buildOperationalReportSummary(status);
  const fields: DiscordEmbedField[] = [];
  const serviceLines = [
    `Health: ${status.health?.status || 'unknown'}`,
    `Scanner: ${serviceStatus(status, 'scanner')}`,
    `Recorder: ${serviceStatus(status, 'candle-recorder')}`,
    `Bridge: ${healthCheckStatus(status, 'bridge')}`,
    `Latest completed 5M: ${summary.latestCompleted5m || 'not reported yet'}`,
  ];
  fields.push({ name: 'Supervisor Status', value: serviceLines.join('\n'), inline: false });

  const historyLines = summary.scannerHistory.map((item) =>
    `${item.timeframe}: ${item.status}, ${item.bars} bars, ${item.from} to ${item.to}`
  );
  fields.push({
    name: 'Loaded History Reports',
    value: historyLines.length
      ? truncateField(historyLines.join('\n'))
      : 'Scanner history report has not appeared in the supervisor log yet.',
    inline: false,
  });

  const recorderLines = [
    ...summary.recorderBars,
    summary.recorderCycle || 'Recorder cache cycle has not completed in the supervisor log yet.',
  ];
  fields.push({ name: 'Market Cache Recorder', value: truncateField(recorderLines.join('\n')), inline: false });

  if (summary.scannerHealth || summary.marketMap) {
    fields.push({
      name: 'Scanner Report',
      value: truncateField([
        summary.scannerHealth,
        summary.marketMap?.replace(/\s+\|\s+positions .+$/, ''),
      ].filter(Boolean).join('\n')),
      inline: false,
    });
  }

  return fields;
}

export function buildSupervisorDiscordPayload(
  notification: SupervisorNotification,
  status?: SupervisorStatusPayload,
): Record<string, unknown> {
  return {
    username: 'Quant Desk',
    content: `[SUPERVISOR] ${notification.title}`,
    embeds: [
      {
        title: notification.title,
        description: notification.description,
        color: colorFor(notification.severity),
        fields: buildOperationalReportFields(status),
        footer: { text: 'Quant Desk • Supervisor health • Operational status only' },
        timestamp: notification.timestamp,
      },
    ],
  };
}

export async function sendSupervisorNotifications(
  status: SupervisorStatusPayload,
  options: SupervisorNotificationOptions = {},
): Promise<{ sent: number; skipped: number; notifications: SupervisorNotification[]; webhookConfigured: boolean }> {
  const now = options.now || new Date();
  const statePath = options.statePath || notificationStatePath(status.config.logsDir);
  const state = readNotificationState(statePath);
  const { notifications, nextState } = buildSupervisorNotifications(status, state, now, options.staleCooldownMs);
  writeNotificationState(statePath, nextState);

  const webhook = options.webhookUrl === undefined ? resolveSupervisorDiscordWebhookUrl().url : options.webhookUrl;
  if (!webhook || options.dryRun) {
    return { sent: 0, skipped: notifications.length, notifications, webhookConfigured: Boolean(webhook) };
  }

  let sent = 0;
  for (const item of notifications) {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSupervisorDiscordPayload(item, status)),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Supervisor Discord notification failed (${response.status}).`);
    sent += 1;
  }

  return { sent, skipped: notifications.length - sent, notifications, webhookConfigured: true };
}

export async function sendSupervisorSelfHealNotification(
  logsDir: string,
  options: SupervisorNotificationOptions = {},
): Promise<{ sent: number; skipped: number; notification: SupervisorNotification; webhookConfigured: boolean }> {
  const now = options.now || new Date();
  const notificationItem = notification({
    kind: 'supervisor_self_heal',
    title: 'Supervisor Self-Healed',
    description: 'Tray detected the supervisor status endpoint was unreachable and requested a local supervisor restart.',
    severity: 'warn',
    now,
  });
  const statePath = options.statePath || notificationStatePath(logsDir);
  const state = readNotificationState(statePath);
  state.lastSentAtByKey[notificationItem.dedupeKey] = now.toISOString();
  writeNotificationState(statePath, state);

  const webhook = options.webhookUrl === undefined ? resolveSupervisorDiscordWebhookUrl().url : options.webhookUrl;
  if (!webhook || options.dryRun) {
    return { sent: 0, skipped: 1, notification: notificationItem, webhookConfigured: Boolean(webhook) };
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSupervisorDiscordPayload(notificationItem)),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Supervisor self-heal Discord notification failed (${response.status}).`);
  return { sent: 1, skipped: 0, notification: notificationItem, webhookConfigured: true };
}
