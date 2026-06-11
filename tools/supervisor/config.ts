import path from 'node:path';

export type SupervisorConfigStatus = 'valid' | 'invalid';

export interface SupervisorChildService {
  id: string;
  label: string;
  npmScript: string;
  args: string[];
  enabled: boolean;
}

export interface SupervisorHealthConfig {
  bridgeUrl: string;
  monitorIntervalMs: number;
  logStaleAfterMs: number;
  restartEnabled: boolean;
  restartCooldownMs: number;
  maxRestartAttempts: number;
}

export interface SupervisorHtfPreloadConfig {
  enabled: boolean;
  days: number;
  delayMs: number;
  timeoutMs: number;
  maxAttempts: number;
  retryDelayMs: number;
}

export interface SupervisorPreWindowBackfillConfig {
  enabled: boolean;
  days: number;
  delayMs: number;
  timeoutMs: number;
  morningStartEt: string;
  morningEndEt: string;
  lunchStartEt: string;
  lunchEndEt: string;
}

export interface SupervisorConfig {
  host: string;
  port: number;
  statusPath: string;
  logsDir: string;
  childServices: SupervisorChildService[];
  health: SupervisorHealthConfig;
  htfPreload: SupervisorHtfPreloadConfig;
  preWindowBackfill: SupervisorPreWindowBackfillConfig;
}

export interface SupervisorConfigResult {
  config: SupervisorConfig;
  status: SupervisorConfigStatus;
  errors: string[];
}

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8797;
const DEFAULT_STATUS_PATH = '/status';

function csvIncludes(raw: string | undefined, serviceId: string, fallback: boolean): boolean {
  if (!raw) return fallback;
  const requested = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return requested.includes(serviceId);
}

export function buildDefaultChildServices(env: NodeJS.ProcessEnv = process.env): SupervisorChildService[] {
  const instrument = env.SUPERVISOR_INSTRUMENT?.trim() || 'MES';
  const bridgeInstrument = env.SUPERVISOR_BRIDGE_INSTRUMENT?.trim() || instrument;
  const bridgeUrl = env.NINJATRADER_BRIDGE_URL?.trim() || env.SUPERVISOR_BRIDGE_URL?.trim() || 'http://127.0.0.1:8765';
  const pollSeconds = env.SUPERVISOR_POLL_SECONDS?.trim() || '60';
  const barTimeZone = env.SUPERVISOR_BAR_TIME_ZONE?.trim() || 'eastern';
  const recorderHeartbeatPath = env.SUPERVISOR_RECORDER_HEARTBEAT_PATH?.trim() || path.resolve(process.cwd(), 'logs', 'supervisor', 'candle-recorder-heartbeat.json');
  const enabledServices = env.SUPERVISOR_SERVICES;

  return [
    {
      id: 'companion-proxy',
      label: 'NinjaTrader companion proxy',
      npmScript: 'nt:companion',
      args: [],
      enabled: csvIncludes(enabledServices, 'companion-proxy', false),
    },
    {
      id: 'candle-recorder',
      label: 'Market candle recorder',
      npmScript: 'nt:candle-recorder',
      args: [
        '--instrument', instrument,
        '--bridge-instrument', bridgeInstrument,
        '--bridge-url', bridgeUrl,
        '--poll-seconds', pollSeconds,
        '--bar-time-zone', barTimeZone,
        '--heartbeat-path', recorderHeartbeatPath,
      ],
      enabled: csvIncludes(enabledServices, 'candle-recorder', true),
    },
    {
      id: 'scanner',
      label: 'Local setup scanner',
      npmScript: 'nt:scanner',
      args: [
        '--instrument', instrument,
        '--bridge-instrument', bridgeInstrument,
        '--bridge-url', bridgeUrl,
        '--poll-seconds', pollSeconds,
        '--bar-time-zone', barTimeZone,
      ],
      enabled: csvIncludes(enabledServices, 'scanner', true),
    },
    {
      id: 'discord-alerts',
      label: 'Discord alert scheduler',
      npmScript: 'nt:discord-alerts',
      args: [],
      enabled: csvIncludes(enabledServices, 'discord-alerts', false),
    },
  ];
}

function numberEnv(raw: string | undefined, fallback: number, name: string, errors: string[]): number {
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    errors.push(`${name} must be a positive number.`);
    return fallback;
  }
  return value;
}

function boolEnv(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function parsePort(raw: string | undefined): { port: number; error: string | null } {
  if (!raw) return { port: DEFAULT_PORT, error: null };
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { port: DEFAULT_PORT, error: 'SUPERVISOR_PORT must be an integer from 1 through 65535.' };
  }
  return { port, error: null };
}

function normalizeStatusPath(raw: string | undefined): { statusPath: string; error: string | null } {
  if (!raw) return { statusPath: DEFAULT_STATUS_PATH, error: null };
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) {
    return { statusPath: DEFAULT_STATUS_PATH, error: 'SUPERVISOR_STATUS_PATH must start with /.' };
  }
  return { statusPath: trimmed, error: null };
}

export function loadSupervisorConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
): SupervisorConfigResult {
  const errors: string[] = [];
  const host = env.SUPERVISOR_HOST?.trim() || DEFAULT_HOST;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    errors.push('SUPERVISOR_HOST must be 127.0.0.1 or localhost for Phase 3.');
  }

  const parsedPort = parsePort(env.SUPERVISOR_PORT);
  if (parsedPort.error) errors.push(parsedPort.error);

  const parsedStatusPath = normalizeStatusPath(env.SUPERVISOR_STATUS_PATH);
  if (parsedStatusPath.error) errors.push(parsedStatusPath.error);

  const logsDir = env.SUPERVISOR_LOGS_DIR?.trim()
    ? path.resolve(cwd, env.SUPERVISOR_LOGS_DIR.trim())
    : path.resolve(cwd, 'logs', 'supervisor');
  const bridgeUrl = env.NINJATRADER_BRIDGE_URL?.trim() || env.SUPERVISOR_BRIDGE_URL?.trim() || 'http://127.0.0.1:8765';

  return {
    config: {
      host,
      port: parsedPort.port,
      statusPath: parsedStatusPath.statusPath,
      logsDir,
      childServices: buildDefaultChildServices(env),
      health: {
        bridgeUrl,
        monitorIntervalMs: numberEnv(env.SUPERVISOR_MONITOR_INTERVAL_MS, 15_000, 'SUPERVISOR_MONITOR_INTERVAL_MS', errors),
        logStaleAfterMs: numberEnv(env.SUPERVISOR_LOG_STALE_AFTER_MS, 180_000, 'SUPERVISOR_LOG_STALE_AFTER_MS', errors),
        restartEnabled: boolEnv(env.SUPERVISOR_RESTART_ENABLED, true),
        restartCooldownMs: numberEnv(env.SUPERVISOR_RESTART_COOLDOWN_MS, 60_000, 'SUPERVISOR_RESTART_COOLDOWN_MS', errors),
        maxRestartAttempts: numberEnv(env.SUPERVISOR_MAX_RESTART_ATTEMPTS, 3, 'SUPERVISOR_MAX_RESTART_ATTEMPTS', errors),
      },
      htfPreload: {
        enabled: boolEnv(env.SUPERVISOR_HTF_PRELOAD_ON_START, true),
        days: numberEnv(env.SUPERVISOR_HTF_PRELOAD_DAYS, 30, 'SUPERVISOR_HTF_PRELOAD_DAYS', errors),
        delayMs: numberEnv(env.SUPERVISOR_HTF_PRELOAD_DELAY_MS, 50, 'SUPERVISOR_HTF_PRELOAD_DELAY_MS', errors),
        timeoutMs: numberEnv(env.SUPERVISOR_HTF_PRELOAD_TIMEOUT_MS, 180_000, 'SUPERVISOR_HTF_PRELOAD_TIMEOUT_MS', errors),
        maxAttempts: Math.max(1, Math.floor(numberEnv(env.SUPERVISOR_HTF_PRELOAD_MAX_ATTEMPTS, 3, 'SUPERVISOR_HTF_PRELOAD_MAX_ATTEMPTS', errors))),
        retryDelayMs: numberEnv(env.SUPERVISOR_HTF_PRELOAD_RETRY_DELAY_MS, 15_000, 'SUPERVISOR_HTF_PRELOAD_RETRY_DELAY_MS', errors),
      },
      preWindowBackfill: {
        enabled: boolEnv(env.SUPERVISOR_PRE_WINDOW_BACKFILL_ENABLED, true),
        days: numberEnv(env.SUPERVISOR_PRE_WINDOW_BACKFILL_DAYS, 2, 'SUPERVISOR_PRE_WINDOW_BACKFILL_DAYS', errors),
        delayMs: numberEnv(env.SUPERVISOR_PRE_WINDOW_BACKFILL_DELAY_MS, 50, 'SUPERVISOR_PRE_WINDOW_BACKFILL_DELAY_MS', errors),
        timeoutMs: numberEnv(env.SUPERVISOR_PRE_WINDOW_BACKFILL_TIMEOUT_MS, 180_000, 'SUPERVISOR_PRE_WINDOW_BACKFILL_TIMEOUT_MS', errors),
        morningStartEt: env.SUPERVISOR_MORNING_BACKFILL_START_ET?.trim() || '09:45',
        morningEndEt: env.SUPERVISOR_MORNING_BACKFILL_END_ET?.trim() || '10:00',
        lunchStartEt: env.SUPERVISOR_LUNCH_BACKFILL_START_ET?.trim() || '11:45',
        lunchEndEt: env.SUPERVISOR_LUNCH_BACKFILL_END_ET?.trim() || '12:00',
      },
    },
    status: errors.length ? 'invalid' : 'valid',
    errors,
  };
}
