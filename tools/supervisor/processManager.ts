import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readRuntimeJsonSync, writeRuntimeJsonAtomicSync } from '../runtimeJson';
import { readQuantDeskMaintenanceStatus } from '../automation/quant-desk-maintenance';
import type { SupervisorChildService, SupervisorConfig } from './config';
import type { SupervisorLogger } from './logger';
import { buildSupervisorSpawnCommand, directScriptPathForNpmScript } from './spawnCommand';

export type ChildRuntimeStatus = 'disabled' | 'running' | 'external_running' | 'stopped' | 'missing' | 'launch_error';

export interface SupervisorServiceState {
  id: string;
  pid: number | null;
  startedAt: string | null;
  stdoutLog: string;
  stderrLog: string;
  status: ChildRuntimeStatus;
  error: string | null;
  restartCount: number;
  lastRestartAt: string | null;
  lastRestartReason: string | null;
  externalPids: number[];
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

function spawnCommandArgs(args: string[]): { file: string; args: string[] } {
  return buildSupervisorSpawnCommand(args);
}

export function readSupervisorState(logsDir: string): SupervisorState | null {
  const filePath = statePath(logsDir);
  const result = readRuntimeJsonSync<SupervisorState>(filePath);
  return result.value;
}

export function writeSupervisorState(config: SupervisorConfig, state: SupervisorState): void {
  writeRuntimeJsonAtomicSync(statePath(config.logsDir), { ...state, statePath: statePath(config.logsDir) });
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

export function isTrackedServiceProcessRunning(
  service: SupervisorChildService,
  pid: number | null | undefined,
  processes = listNodeProcesses(),
): boolean {
  if (!isProcessRunning(pid)) return false;
  if (process.platform !== 'win32') return true;
  if (processes.length === 0) return true;
  const processInfo = processes.find((item) => item.pid === pid);
  return Boolean(processInfo && serviceMatchesCommandLine(service, processInfo.commandLine));
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
    restartCount: 0,
    lastRestartAt: null,
    lastRestartReason: null,
    externalPids: [],
  };
}

function refreshState(config: SupervisorConfig, state: SupervisorState): SupervisorState {
  const byId = new Map(state.services.map((service) => [service.id, service]));
  const processes = listNodeProcesses();
  const external = findExternalServiceProcesses(config, processes);
  return {
    ...state,
    statePath: statePath(config.logsDir),
    services: config.childServices.map((service) => {
      const existing = byId.get(service.id) || serviceStateFromConfig(config, service);
      if (!service.enabled) return { ...existing, status: 'disabled', error: null };
      if (existing.status === 'launch_error') return existing;
      const externalPids = external.get(service.id) || [];
      const ownedRunning = isTrackedServiceProcessRunning(service, existing.pid, processes);
      const adoptableExternalPid = !ownedRunning && externalPids.length === 1 ? externalPids[0] : null;
      return {
        ...existing,
        pid: adoptableExternalPid || existing.pid,
        startedAt: adoptableExternalPid ? existing.startedAt || new Date().toISOString() : existing.startedAt,
        restartCount: existing.restartCount || 0,
        lastRestartAt: existing.lastRestartAt || null,
        lastRestartReason: existing.lastRestartReason || null,
        externalPids: adoptableExternalPid ? [] : externalPids,
        error: adoptableExternalPid ? null : existing.error,
        status: ownedRunning || adoptableExternalPid
          ? 'running'
          : existing.pid
            ? 'stopped'
            : externalPids.length
              ? 'external_running'
              : 'missing',
      };
    }),
  };
}

export interface SupervisorProcessInfo {
  pid: number;
  parentPid?: number | null;
  commandLine: string;
}

function normalizeCommandFragment(value: string): string {
  return value.replace(/\\/g, '/').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function serviceMatchesCommandLine(service: SupervisorChildService, commandLine: string): boolean {
  const normalizedCommandLine = normalizeCommandFragment(commandLine);
  const normalizedNpmScript = normalizeCommandFragment(service.npmScript);
  const directScriptPath = directScriptPathForNpmScript(service.npmScript);
  const normalizedDirectScriptPath = directScriptPath ? normalizeCommandFragment(directScriptPath) : null;
  const scriptMatches = normalizedCommandLine.includes(`run ${normalizedNpmScript}`)
    || normalizedCommandLine.includes(`run ${normalizeCommandFragment(service.npmScript.replace(/:/g, '\\:'))}`)
    || normalizedCommandLine.includes(normalizedNpmScript)
    || Boolean(normalizedDirectScriptPath && normalizedCommandLine.includes(normalizedDirectScriptPath));
  if (!scriptMatches) return false;
  return service.args.every((arg) => normalizedCommandLine.includes(normalizeCommandFragment(arg)));
}

function listNodeProcesses(): SupervisorProcessInfo[] {
  if (process.platform !== 'win32') return [];
  try {
    const raw = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|npm|cmd' } | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ProcessId: number; ParentProcessId?: number; CommandLine?: string } | Array<{ ProcessId: number; ParentProcessId?: number; CommandLine?: string }>;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .filter((row) => row.CommandLine)
      .map((row) => ({ pid: Number(row.ProcessId), parentPid: row.ParentProcessId ?? null, commandLine: String(row.CommandLine) }));
  } catch {
    return [];
  }
}

function expandOwnedProcessTree(ownedPids: Set<number>, processes: SupervisorProcessInfo[]): Set<number> {
  const allOwnedPids = new Set(ownedPids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const processInfo of processes) {
      if (processInfo.parentPid && allOwnedPids.has(processInfo.parentPid) && !allOwnedPids.has(processInfo.pid)) {
        allOwnedPids.add(processInfo.pid);
        changed = true;
      }
    }
  }
  return allOwnedPids;
}

export function findExternalServiceProcesses(config: SupervisorConfig, processes = listNodeProcesses()): Map<string, number[]> {
  const state = readSupervisorState(config.logsDir);
  const ownedPids = expandOwnedProcessTree(
    new Set((state?.services || []).map((service) => service.pid).filter((pid): pid is number => Boolean(pid))),
    processes,
  );
  const external = new Map<string, number[]>();

  for (const service of config.childServices) {
    const matches = processes
      .filter((processInfo) => !ownedPids.has(processInfo.pid) && serviceMatchesCommandLine(service, processInfo.commandLine));
    const matchingPids = new Set(matches.map((processInfo) => processInfo.pid));
    const pids = matches
      .filter((processInfo) => !processInfo.parentPid || !matchingPids.has(processInfo.parentPid))
      .map((processInfo) => processInfo.pid);
    external.set(service.id, pids);
  }
  return external;
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
  const maintenance = readQuantDeskMaintenanceStatus();
  if (maintenance.active) {
    const stoppedState = {
      ...state,
      supervisorPid: process.pid,
      statePath: statePath(config.logsDir),
      services: config.childServices.map((service) => ({
        ...(state.services.find((item) => item.id === service.id) || serviceStateFromConfig(config, service)),
        pid: null,
        startedAt: null,
        status: service.enabled ? 'stopped' as ChildRuntimeStatus : 'disabled' as ChildRuntimeStatus,
        error: service.enabled ? `Maintenance lock active: ${maintenance.reason}` : null,
      })),
    };
    writeSupervisorState(config, stoppedState);
    logger.log('info', 'Child service launch skipped because maintenance lock is active.', {
      lockPath: maintenance.path,
      reason: maintenance.reason,
    });
    return stoppedState;
  }

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
    if ((existing.externalPids || []).length && !isTrackedServiceProcessRunning(service, existing.pid)) {
      serviceStateById.set(service.id, {
        ...existing,
        status: 'external_running',
        error: 'External matching process detected. Supervisor did not start a duplicate or take ownership.',
      });
      logger.log('warn', 'External child service process detected; duplicate launch skipped.', {
        id: service.id,
        externalPids: existing.externalPids,
      });
      continue;
    }
    if (isTrackedServiceProcessRunning(service, existing.pid)) {
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
      child.unref();
      serviceStateById.set(service.id, {
        id: service.id,
        pid: child.pid || null,
        startedAt: new Date().toISOString(),
        stdoutLog,
        stderrLog,
        status: child.pid ? 'running' : 'launch_error',
        error: child.pid ? null : 'Process started without a PID.',
        restartCount: existing.restartCount || 0,
        lastRestartAt: existing.lastRestartAt || null,
        lastRestartReason: existing.lastRestartReason || null,
        externalPids: existing.externalPids || [],
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
        restartCount: existing.restartCount || 0,
        lastRestartAt: existing.lastRestartAt || null,
        lastRestartReason: existing.lastRestartReason || null,
        externalPids: existing.externalPids || [],
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

function canRestartService(config: SupervisorConfig, service: SupervisorServiceState, now: Date): { ok: boolean; reason: string } {
  if (!config.health.restartEnabled) return { ok: false, reason: 'restart disabled' };
  if (!service.pid) return { ok: false, reason: 'service was never owned by supervisor' };
  if (service.status !== 'stopped' && service.status !== 'launch_error') return { ok: false, reason: `status ${service.status} is not restartable` };
  if (service.restartCount >= config.health.maxRestartAttempts) return { ok: false, reason: 'max restart attempts reached' };
  if (service.lastRestartAt) {
    const elapsed = now.getTime() - new Date(service.lastRestartAt).getTime();
    if (elapsed < config.health.restartCooldownMs) return { ok: false, reason: 'restart cooldown active' };
  }
  if ((service.externalPids || []).length) return { ok: false, reason: 'external matching process detected' };
  return { ok: true, reason: 'owned child process is stopped' };
}

export function restartFailedOwnedServices(config: SupervisorConfig, logger: SupervisorLogger, now = new Date()): SupervisorState {
  const maintenance = readQuantDeskMaintenanceStatus();
  if (maintenance.active) {
    logger.log('info', 'Child service restart skipped because maintenance lock is active.', {
      lockPath: maintenance.path,
      reason: maintenance.reason,
    });
    return stopOwnedServices(config, logger);
  }
  let state = getSupervisorState(config);
  const byId = new Map(state.services.map((service) => [service.id, service]));

  for (const serviceConfig of config.childServices) {
    if (!serviceConfig.enabled) continue;
    const service = byId.get(serviceConfig.id);
    if (!service) continue;
    const restart = canRestartService(config, service, now);
    if (!restart.ok) continue;

    const restarted = launchSingleService(config, serviceConfig, {
      ...service,
      restartCount: service.restartCount + 1,
      lastRestartAt: now.toISOString(),
      lastRestartReason: restart.reason,
    }, logger);
    byId.set(serviceConfig.id, restarted);
    logger.log('warn', 'Child service restarted.', {
      id: serviceConfig.id,
      reason: restart.reason,
      restartCount: restarted.restartCount,
      pid: restarted.pid,
    });
  }

  state = { ...state, services: config.childServices.map((service) => byId.get(service.id) || serviceStateFromConfig(config, service)) };
  writeSupervisorState(config, state);
  return getSupervisorState(config);
}

function launchSingleService(
  config: SupervisorConfig,
  service: SupervisorChildService,
  previous: SupervisorServiceState,
  logger: SupervisorLogger,
): SupervisorServiceState {
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
    child.unref();
    return {
      ...previous,
      id: service.id,
      pid: child.pid || null,
      startedAt: new Date().toISOString(),
      stdoutLog,
      stderrLog,
      status: child.pid ? 'running' : 'launch_error',
      error: child.pid ? null : 'Process started without a PID.',
    };
  } catch (error) {
    logger.log('error', 'Child service restart failed.', { id: service.id, error: String(error) });
    return {
      ...previous,
      id: service.id,
      pid: null,
      stdoutLog,
      stderrLog,
      status: 'launch_error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function stopProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  process.kill(pid, 'SIGTERM');
}

export function stopOwnedServices(config: SupervisorConfig, logger?: SupervisorLogger): SupervisorState {
  const state = getSupervisorState(config);
  const stopped = state.services.map((service) => {
    let stopError: string | null = null;
    const serviceConfig = config.childServices.find((item) => item.id === service.id);
    const ownedProcessRunning = serviceConfig
      ? isTrackedServiceProcessRunning(serviceConfig, service.pid)
      : isProcessRunning(service.pid);
    if (service.pid && ownedProcessRunning) {
      try {
        stopProcessTree(service.pid);
        logger?.log('info', 'Child service stopped.', { id: service.id, pid: service.pid });
      } catch (error) {
        stopError = String(error);
        logger?.log('warn', 'Child service stop failed.', { id: service.id, pid: service.pid, error: String(error) });
      }
    }
    if (service.status === 'disabled' || service.status === 'external_running') return service;
    const stillRunning = serviceConfig
      ? isTrackedServiceProcessRunning(serviceConfig, service.pid)
      : isProcessRunning(service.pid);
    if (service.pid && stillRunning) {
      return {
        ...service,
        status: 'running' as ChildRuntimeStatus,
        error: stopError || 'Child service stop was requested, but the owned process is still running.',
      };
    }
    return { ...service, status: 'stopped' as ChildRuntimeStatus };
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
