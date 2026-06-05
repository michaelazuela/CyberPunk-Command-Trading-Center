import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { SupervisorChildService, SupervisorConfig } from './config';
import type { SupervisorLogger } from './logger';

export type ChildRuntimeStatus = 'disabled' | 'running' | 'stopped' | 'missing' | 'launch_error';

export interface SupervisorServiceState {
  id: string;
  pid: number | null;
  startedAt: string | null;
  stdoutLog: string;
  stderrLog: string;
  status: ChildRuntimeStatus;
  error: string | null;
}

export interface SupervisorState {
  supervisorPid: number;
  startedAt: string;
  statePath: string;
  services: SupervisorServiceState[];
}

function statePath(logsDir: string): string {
  return path.join(logsDir, 'supervisor-state.json');
}

function logPath(logsDir: string, serviceId: string, stream: 'stdout' | 'stderr'): string {
  return path.join(logsDir, `${serviceId}.${stream}.log`);
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function quoteWindowsArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function spawnCommandArgs(args: string[]): { file: string; args: string[] } {
  if (process.platform !== 'win32') return { file: npmCommand(), args };
  return {
    file: 'cmd.exe',
    args: ['/d', '/s', '/c', [npmCommand(), ...args].map(quoteWindowsArg).join(' ')],
  };
}

export function readSupervisorState(logsDir: string): SupervisorState | null {
  const filePath = statePath(logsDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SupervisorState;
  } catch {
    return null;
  }
}

export function writeSupervisorState(config: SupervisorConfig, state: SupervisorState): void {
  fs.mkdirSync(config.logsDir, { recursive: true });
  fs.writeFileSync(statePath(config.logsDir), JSON.stringify({ ...state, statePath: statePath(config.logsDir) }, null, 2), 'utf8');
}

export function isProcessRunning(pid: number | null | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function serviceStateFromConfig(config: SupervisorConfig, service: SupervisorChildService): SupervisorServiceState {
  return {
    id: service.id,
    pid: null,
    startedAt: null,
    stdoutLog: logPath(config.logsDir, service.id, 'stdout'),
    stderrLog: logPath(config.logsDir, service.id, 'stderr'),
    status: service.enabled ? 'missing' : 'disabled',
    error: null,
  };
}

function refreshState(config: SupervisorConfig, state: SupervisorState): SupervisorState {
  const byId = new Map(state.services.map((service) => [service.id, service]));
  return {
    ...state,
    statePath: statePath(config.logsDir),
    services: config.childServices.map((service) => {
      const existing = byId.get(service.id) || serviceStateFromConfig(config, service);
      if (!service.enabled) return { ...existing, status: 'disabled', error: null };
      if (existing.status === 'launch_error') return existing;
      return {
        ...existing,
        status: isProcessRunning(existing.pid) ? 'running' : existing.pid ? 'stopped' : 'missing',
      };
    }),
  };
}

export function getSupervisorState(config: SupervisorConfig): SupervisorState {
  const existing = readSupervisorState(config.logsDir);
  const base: SupervisorState = existing || {
    supervisorPid: process.pid,
    startedAt: new Date().toISOString(),
    statePath: statePath(config.logsDir),
    services: config.childServices.map((service) => serviceStateFromConfig(config, service)),
  };
  return refreshState(config, base);
}

export function launchEnabledServices(config: SupervisorConfig, logger: SupervisorLogger): SupervisorState {
  let state = getSupervisorState(config);

  state = {
    ...state,
    supervisorPid: process.pid,
    statePath: statePath(config.logsDir),
  };

  const serviceStateById = new Map(state.services.map((service) => [service.id, service]));

  for (const service of config.childServices) {
    const existing = serviceStateById.get(service.id) || serviceStateFromConfig(config, service);
    if (!service.enabled) {
      serviceStateById.set(service.id, { ...existing, status: 'disabled', error: null });
      continue;
    }
    if (isProcessRunning(existing.pid)) {
      serviceStateById.set(service.id, { ...existing, status: 'running', error: null });
      continue;
    }

    const stdoutLog = logPath(config.logsDir, service.id, 'stdout');
    const stderrLog = logPath(config.logsDir, service.id, 'stderr');
    const stdout = fs.openSync(stdoutLog, 'a');
    const stderr = fs.openSync(stderrLog, 'a');
    const args = ['run', service.npmScript, ...(service.args.length ? ['--', ...service.args] : [])];
    const command = spawnCommandArgs(args);

    try {
      const child = spawn(command.file, command.args, {
        cwd: process.cwd(),
        detached: false,
        windowsHide: true,
        stdio: ['ignore', stdout, stderr],
      });
      serviceStateById.set(service.id, {
        id: service.id,
        pid: child.pid || null,
        startedAt: new Date().toISOString(),
        stdoutLog,
        stderrLog,
        status: child.pid ? 'running' : 'launch_error',
        error: child.pid ? null : 'Process started without a PID.',
      });
      logger.log('info', 'Child service launched.', { id: service.id, npmScript: service.npmScript, pid: child.pid });
    } catch (error) {
      serviceStateById.set(service.id, {
        id: service.id,
        pid: null,
        startedAt: null,
        stdoutLog,
        stderrLog,
        status: 'launch_error',
        error: error instanceof Error ? error.message : String(error),
      });
      logger.log('error', 'Child service launch failed.', { id: service.id, error: String(error) });
    }
  }

  const nextState: SupervisorState = {
    ...state,
    services: config.childServices.map((service) => serviceStateById.get(service.id) || serviceStateFromConfig(config, service)),
  };
  writeSupervisorState(config, nextState);
  return getSupervisorState(config);
}

function stopProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  process.kill(pid, 'SIGTERM');
}

export function stopOwnedServices(config: SupervisorConfig, logger?: SupervisorLogger): SupervisorState {
  const state = getSupervisorState(config);
  const stopped = state.services.map((service) => {
    if (service.pid && isProcessRunning(service.pid)) {
      try {
        stopProcessTree(service.pid);
        logger?.log('info', 'Child service stopped.', { id: service.id, pid: service.pid });
      } catch (error) {
        logger?.log('warn', 'Child service stop failed.', { id: service.id, pid: service.pid, error: String(error) });
      }
    }
    return { ...service, status: service.status === 'disabled' ? 'disabled' : 'stopped' as ChildRuntimeStatus };
  });
  const nextState = { ...state, services: stopped };
  writeSupervisorState(config, nextState);
  return nextState;
}

export function stopSupervisorProcess(config: SupervisorConfig, logger?: SupervisorLogger): void {
  const state = readSupervisorState(config.logsDir);
  if (!state?.supervisorPid || state.supervisorPid === process.pid || !isProcessRunning(state.supervisorPid)) return;
  try {
    logger?.log('info', 'Supervisor process stop requested.', { pid: state.supervisorPid });
    stopProcessTree(state.supervisorPid);
  } catch (error) {
    logger?.log('warn', 'Supervisor process stop failed.', { pid: state.supervisorPid, error: String(error) });
  }
}
