import fs from 'node:fs';
import path from 'node:path';
import type { SupervisorConfig } from './config';
import type { SupervisorState } from './processManager';
import { isProcessRunning } from './processManager';

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

export async function checkBridgeHealth(bridgeUrl: string): Promise<SupervisorHealthCheck> {
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
    const parsed = await response.json().catch(() => null) as { ok?: boolean; defaultInstrument?: string } | null;
    return {
      id: 'bridge',
      label: 'NinjaTrader bridge',
      status: parsed?.ok === false ? 'fail' : 'ok',
      message: parsed?.ok === false ? 'Bridge reported not OK.' : 'Bridge health endpoint is reachable.',
      details: { defaultInstrument: parsed?.defaultInstrument || null },
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
    'QUANT_DESK_SCANNER_WEBHOOK_URL',
    'SCANNER_DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL',
    'DISCORD_OUTCOME_BASE_URL',
    'DISCORD_OUTCOME_SECRET',
  ].filter((key) => Boolean(env[key]));

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
  ];

  for (const service of state.services) {
    const required = service.status === 'running';
    checks.push({
      id: `${service.id}_process`,
      label: `${service.id} process`,
      status: service.status === 'running' && service.pid && isProcessRunning(service.pid)
        ? 'ok'
        : service.status === 'disabled'
          ? 'ok'
          : service.status === 'external_running'
            ? 'warn'
            : 'warn',
      message: service.status === 'running' && service.pid && isProcessRunning(service.pid)
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

  checks.push(await checkBridgeHealth(config.health.bridgeUrl));

  return {
    status: worstStatus(checks),
    generatedAt: now.toISOString(),
    checks,
  };
}
