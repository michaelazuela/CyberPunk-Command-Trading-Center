import path from 'node:path';

export type SupervisorConfigStatus = 'valid' | 'invalid';

export interface SupervisorChildService {
  id: string;
  label: string;
  npmScript: string;
  args: string[];
  enabled: boolean;
}

export interface SupervisorConfig {
  host: string;
  port: number;
  statusPath: string;
  logsDir: string;
  childServices: SupervisorChildService[];
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
    errors.push('SUPERVISOR_HOST must be 127.0.0.1 or localhost for Phase 2.');
  }

  const parsedPort = parsePort(env.SUPERVISOR_PORT);
  if (parsedPort.error) errors.push(parsedPort.error);

  const parsedStatusPath = normalizeStatusPath(env.SUPERVISOR_STATUS_PATH);
  if (parsedStatusPath.error) errors.push(parsedStatusPath.error);

  const logsDir = env.SUPERVISOR_LOGS_DIR?.trim()
    ? path.resolve(cwd, env.SUPERVISOR_LOGS_DIR.trim())
    : path.resolve(cwd, 'logs', 'supervisor');

  return {
    config: {
      host,
      port: parsedPort.port,
      statusPath: parsedStatusPath.statusPath,
      logsDir,
      childServices: buildDefaultChildServices(env),
    },
    status: errors.length ? 'invalid' : 'valid',
    errors,
  };
}
