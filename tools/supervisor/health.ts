import fs from 'node:fs';
import path from 'node:path';
import { readRuntimeJsonSync } from '../runtimeJson';
import type { SupervisorConfig } from './config';
import type { SupervisorState } from './processManager';
import { isProcessRunning, isTrackedServiceProcessRunning } from './processManager';
import { readEnvWithUserFallback } from './env';

export type SupervisorHealthLevel = 'ok' | 'warn' | 'fail';

export interface SupervisorHealthCheck {
  id: string;
  label: string;
  status: SupervisorHealthLevel;
  message: string;
  details?: Record<string, unknown>;
}

export interface SupervisorHealthReport {
  status: SupervisorHealthLevel;
  generatedAt: string;
  checks: SupervisorHealthCheck[];
}

function worstStatus(checks: SupervisorHealthCheck[]): SupervisorHealthLevel {
  if (checks.some((check) => check.status === 'fail')) return 'fail';
  if (checks.some((check) => check.status === 'warn')) return 'warn';
  return 'ok';
}

function fileAgeMs(filePath: string, now: Date): number | null {
  try {
    const stat = fs.statSync(filePath);
    return now.getTime() - stat.mtimeMs;
  } catch {
    return null;
  }
}

function logCheck(args: {
  id: string;
  label: string;
  filePath: string | null;
  staleAfterMs: number;
  now: Date;
  required: boolean;
}): SupervisorHealthCheck {
  if (!args.filePath) {
    return {
      id: args.id,
      label: args.label,
      status: args.required ? 'warn' : 'ok',
      message: args.required ? 'No log path is available yet.' : 'Service disabled; log freshness is not required.',
    };
  }
  const age = fileAgeMs(args.filePath, args.now);
  if (age === null) {
    return {
      id: args.id,
      label: args.label,
      status: args.required ? 'warn' : 'ok',
      message: args.required ? 'Log file has not been created yet.' : 'Service disabled; log file is optional.',
      details: { filePath: args.filePath },
    };
  }
  const stale = age > args.staleAfterMs;
  return {
    id: args.id,
    label: args.label,
    status: stale && args.required ? 'warn' : 'ok',
    message: stale && args.required ? 'Log file is stale.' : 'Log file is fresh enough.',
    details: { filePath: args.filePath, ageMs: Math.round(age), staleAfterMs: args.staleAfterMs },
  };
}

export async function checkBridgeHealth(bridgeUrl: string, configuredBridgeInstrument: string | null = null): Promise<SupervisorHealthCheck> {
  try {
    const response = await fetch(`${bridgeUrl.replace(/\/+$/, '')}/health`, { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) {
      return {
        id: 'bridge',
        label: 'NinjaTrader bridge',
        status: 'fail',
        message: `Bridge health endpoint returned HTTP ${response.status}.`,
      };
    }
    const parsed = await response.json().catch(() => null) as { ok?: boolean; defaultInstrument?: string; readOnly?: boolean; version?: string } | null;
    const defaultInstrument = parsed?.defaultInstrument || null;
    const configuredRoot = configuredBridgeInstrument?.trim().split(/\s+/)[0] || null;
    const defaultRoot = defaultInstrument?.trim().split(/\s+/)[0] || null;
    const contractMismatch = Boolean(
      configuredBridgeInstrument &&
      defaultInstrument &&
      configuredBridgeInstrument.trim() !== defaultInstrument.trim() &&
      configuredRoot !== defaultRoot,
    );
    return {
      id: 'bridge',
      label: 'NinjaTrader bridge',
      status: parsed?.ok === false ? 'fail' : contractMismatch ? 'warn' : 'ok',
      message: parsed?.ok === false
        ? 'Bridge reported not OK.'
        : contractMismatch
          ? 'Bridge default instrument does not match the configured scanner contract root.'
          : 'Bridge health endpoint is reachable.',
      details: {
        defaultInstrument,
        configuredBridgeInstrument,
        readOnly: parsed?.readOnly ?? null,
        version: parsed?.version || null,
        contractMismatch,
      },
    };
  } catch (error) {
    return {
      id: 'bridge',
      label: 'NinjaTrader bridge',
      status: 'fail',
      message: `Bridge health endpoint is not reachable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function discordConfigCheck(env: NodeJS.ProcessEnv): SupervisorHealthCheck {
  const configuredKeys = [
    'SUPERVISOR_DISCORD_WEBHOOK_URL',
    'QUANT_DESK_HEALTH_WEBHOOK_URL',
    'SYSTEM_ALERTS_DISCORD_WEBHOOK_URL',
    'QUANT_DESK_SYSTEM_ALERTS_WEBHOOK_URL',
    'QUANT_DESK_SCANNER_WEBHOOK_URL',
    'SCANNER_DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL',
    'DISCORD_OUTCOME_BASE_URL',
    'DISCORD_OUTCOME_SECRET',
  ].filter((key) => Boolean(readEnvWithUserFallback(key, env)));

  return {
    id: 'discord_config',
    label: 'Discord config',
    status: configuredKeys.length ? 'ok' : 'warn',
    message: configuredKeys.length
      ? 'Discord-related environment keys are present. Values are not printed.'
      : 'No Discord-related environment keys detected. This is a configuration warning only.',
    details: { configuredKeys },
  };
}

function activeContractCheck(config: SupervisorConfig): SupervisorHealthCheck {
  const scanner = config.childServices.find((service) => service.id === 'scanner');
  const bridgeInstrumentIndex = scanner?.args.indexOf('--bridge-instrument') ?? -1;
  const bridgeInstrument = bridgeInstrumentIndex >= 0 ? scanner?.args[bridgeInstrumentIndex + 1] : null;
  return {
    id: 'active_contract',
    label: 'Active contract',
    status: bridgeInstrument ? 'ok' : 'warn',
    message: bridgeInstrument ? 'Supervisor has a configured bridge instrument.' : 'Bridge instrument is not configured.',
    details: { bridgeInstrument },
  };
}

function etTimeParts(now: Date): { minutes: number; weekday: string } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    weekday: String(parts.weekday || ''),
  };
}

function isAfterFinalScannerCloseOrWeekend(now: Date): boolean {
  const parts = etTimeParts(now);
  return parts.weekday === 'Sat' ||
    (parts.weekday === 'Sun' && parts.minutes < (18 * 60 + 45)) ||
    (parts.weekday === 'Fri' && parts.minutes >= (18 * 60 + 45)) ||
    parts.minutes >= (22 * 60 + 15);
}

export function isFuturesDailyMaintenanceBreak(now: Date): boolean {
  const parts = etTimeParts(now);
  return parts.minutes >= (17 * 60) && parts.minutes < (18 * 60);
}

function configuredBridgeInstrument(config: SupervisorConfig): string | null {
  const scanner = config.childServices.find((service) => service.id === 'scanner');
  const bridgeInstrumentIndex = scanner?.args.indexOf('--bridge-instrument') ?? -1;
  return bridgeInstrumentIndex >= 0 ? scanner?.args[bridgeInstrumentIndex + 1] || null : null;
}

function stateFileCheck(now: Date, staleAfterMs: number): SupervisorHealthCheck {
  const filePath = path.resolve(process.cwd(), 'tools', 'automation', '.nt-scanner-state.json');
  const age = fileAgeMs(filePath, now);
  if (age === null) {
    return {
      id: 'scanner_state_file',
      label: 'Scanner state file',
      status: 'warn',
      message: 'Scanner state file is not present yet.',
      details: { filePath },
    };
  }
  return {
    id: 'scanner_state_file',
    label: 'Scanner state file',
    status: age > staleAfterMs ? 'warn' : 'ok',
    message: age > staleAfterMs ? 'Scanner state file has not changed recently.' : 'Scanner state file was updated recently.',
    details: { filePath, ageMs: Math.round(age), staleAfterMs },
  };
}

function recorderHeartbeatCheck(config: SupervisorConfig, now: Date): SupervisorHealthCheck {
  const recorder = config.childServices.find((service) => service.id === 'candle-recorder');
  const heartbeatArgIndex = recorder?.args.indexOf('--heartbeat-path') ?? -1;
  const heartbeatPath = heartbeatArgIndex >= 0 && recorder?.args[heartbeatArgIndex + 1]
    ? recorder.args[heartbeatArgIndex + 1]
    : path.resolve(process.cwd(), 'logs', 'supervisor', 'candle-recorder-heartbeat.json');
  const read = readRuntimeJsonSync<{
    status?: 'ok' | 'warn' | 'error';
    updatedAt?: string;
    latestCompleted5m?: string | null;
    barsProcessed?: number;
    warning?: string | null;
    error?: string | null;
  }>(heartbeatPath);
  const parsed = read.value;
  if (parsed) {
    const updatedAt = parsed.updatedAt ? new Date(parsed.updatedAt) : null;
    const ageMs = updatedAt ? now.getTime() - updatedAt.getTime() : Number.POSITIVE_INFINITY;
    const stale = !Number.isFinite(ageMs) || ageMs > config.health.logStaleAfterMs;
    const badStatus = parsed.status === 'error';
    const maintenanceBreakStaleBarWarning = !stale && parsed.status === 'warn' && isFuturesDailyMaintenanceBreak(now);
    const afterCloseStaleBarWarning = !stale && parsed.status === 'warn' && isAfterFinalScannerCloseOrWeekend(now);
    const expectedPausedLatest5mWarning = maintenanceBreakStaleBarWarning || afterCloseStaleBarWarning;
    return {
      id: 'recorder_heartbeat',
      label: 'Recorder heartbeat',
      status: badStatus ? 'fail' : stale || (parsed.status === 'warn' && !expectedPausedLatest5mWarning) ? 'warn' : 'ok',
      message: badStatus
        ? `Recorder heartbeat reported an error: ${parsed.error || 'unknown error'}`
        : stale
          ? 'Recorder heartbeat is stale.'
          : maintenanceBreakStaleBarWarning
            ? `Recorder heartbeat is fresh; latest completed 5M is paused during the 5:00-6:00 PM ET futures maintenance break (${parsed.latestCompleted5m || 'unknown'}).`
          : afterCloseStaleBarWarning
            ? `Recorder heartbeat is fresh; latest completed 5M is paused after the 10:15 PM ET scanner close (${parsed.latestCompleted5m || 'unknown'}).`
          : parsed.status === 'warn'
            ? `Recorder heartbeat reported a warning: ${parsed.warning || 'unknown warning'}`
            : 'Recorder heartbeat is fresh.',
      details: {
        heartbeatPath,
        recoveredFromBackup: read.source === 'backup',
        updatedAt: parsed.updatedAt || null,
        ageMs: Number.isFinite(ageMs) ? Math.round(ageMs) : null,
        latestCompleted5m: parsed.latestCompleted5m || null,
        barsProcessed: parsed.barsProcessed ?? null,
        expectedMarketPause: maintenanceBreakStaleBarWarning
          ? 'futures_maintenance_break'
          : afterCloseStaleBarWarning
            ? 'scanner_closed'
            : null,
      },
    };
  }
  return {
    id: 'recorder_heartbeat',
    label: 'Recorder heartbeat',
    status: 'warn',
    message: 'Recorder heartbeat file is not available yet.',
    details: { heartbeatPath, error: read.error },
  };
}

export async function buildHealthReport(
  config: SupervisorConfig,
  state: SupervisorState,
  now = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<SupervisorHealthReport> {
  const supervisorRunning = isProcessRunning(state.supervisorPid);
  const checks: SupervisorHealthCheck[] = [
    {
      id: 'supervisor_process',
      label: 'Supervisor process',
      status: supervisorRunning ? 'ok' : 'fail',
      message: supervisorRunning
        ? 'Supervisor daemon process is running.'
        : 'Supervisor daemon process is not running; child services may still be alive from a prior supervisor session.',
      details: { pid: state.supervisorPid },
    },
    activeContractCheck(config),
    discordConfigCheck(env),
    stateFileCheck(now, config.health.logStaleAfterMs),
    recorderHeartbeatCheck(config, now),
  ];

  for (const service of state.services) {
    const required = service.status === 'running';
    const serviceConfig = config.childServices.find((item) => item.id === service.id);
    const ownedProcessRunning = serviceConfig
      ? isTrackedServiceProcessRunning(serviceConfig, service.pid)
      : isProcessRunning(service.pid);
    checks.push({
      id: `${service.id}_process`,
      label: `${service.id} process`,
      status: service.status === 'running' && service.pid && ownedProcessRunning
        ? 'ok'
        : service.status === 'disabled'
          ? 'ok'
          : service.status === 'external_running'
            ? 'warn'
            : 'warn',
      message: service.status === 'running' && service.pid && ownedProcessRunning
        ? 'Owned child process is running.'
        : service.status === 'disabled'
          ? 'Service is disabled.'
          : service.status === 'external_running' || service.externalPids.length
            ? 'External matching process detected; supervisor did not take ownership.'
            : 'Owned child process is not running.',
      details: { pid: service.pid, externalPids: service.externalPids },
    });
    checks.push(logCheck({
      id: `${service.id}_stdout_log`,
      label: `${service.id} stdout log`,
      filePath: service.stdoutLog,
      staleAfterMs: config.health.logStaleAfterMs,
      now,
      required,
    }));
  }

  checks.push(await checkBridgeHealth(config.health.bridgeUrl, configuredBridgeInstrument(config)));

  return {
    status: worstStatus(checks),
    generatedAt: now.toISOString(),
    checks,
  };
}
