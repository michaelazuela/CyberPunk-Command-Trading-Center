import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { loadSupervisorConfig } from './config';
import { buildHealthReport, type SupervisorHealthLevel } from './health';
import { getSupervisorState, isProcessRunning, type SupervisorState } from './processManager';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

export interface RuntimeProcessInfo {
  pid: number;
  parentPid: number | null;
  commandLine: string;
}

export interface StartupTaskAudit {
  taskName: string;
  installed: boolean;
  state: string | null;
  taskPath: string | null;
  execute: string | null;
  arguments: string | null;
  workingDirectory: string | null;
  multipleInstances: string | null;
  restartCount: number | null;
  restartInterval: string | null;
  healthy: boolean;
  issues: string[];
}

export interface RuntimeServiceAudit {
  id: string;
  label: string;
  enabled: boolean;
  status: string;
  ownedPid: number | null;
  ownedPidRunning: boolean;
  processTreePids: number[];
  externalPids: number[];
  duplicateRisk: boolean;
  stdoutLog: string | null;
  stderrLog: string | null;
}

export interface SupervisorRuntimeAudit {
  generatedAt: string;
  supervisor: {
    pid: number;
    running: boolean;
    statusEndpoint: string;
    logsDir: string;
  };
  services: RuntimeServiceAudit[];
  startupTask: StartupTaskAudit;
  health: {
    status: SupervisorHealthLevel;
    bridgeStatus: string | null;
    scannerStateStatus: string | null;
    recorderHeartbeatStatus: string | null;
  };
  summary: {
    status: 'ok' | 'warn' | 'fail';
    duplicateProcessesDetected: boolean;
    startupTaskHealthy: boolean;
    bridgeReachable: boolean;
    recommendedAction: string;
  };
  boundaries: {
    readOnly: true;
    stopsProcesses: false;
    startsProcesses: false;
    repairsState: false;
    postsDiscord: false;
    changesTradingLogic: false;
    changesScannerBehavior: false;
    changesCanExecute: false;
  };
}

function isDirectCliEntrypoint(): boolean {
  return Boolean(process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
}

function listWindowsProcesses(): RuntimeProcessInfo[] {
  if (process.platform !== 'win32') return [];
  try {
    const raw = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|npm|cmd|powershell|wscript' } | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress",
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { ProcessId: number; ParentProcessId?: number; CommandLine?: string } | Array<{ ProcessId: number; ParentProcessId?: number; CommandLine?: string }>;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .filter((row) => row.CommandLine)
      .map((row) => ({
        pid: Number(row.ProcessId),
        parentPid: row.ParentProcessId ?? null,
        commandLine: String(row.CommandLine),
      }));
  } catch {
    return [];
  }
}

function processTree(rootPid: number | null, processes: RuntimeProcessInfo[]): number[] {
  if (!rootPid) return [];
  const owned = new Set<number>([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const processInfo of processes) {
      if (processInfo.parentPid && owned.has(processInfo.parentPid) && !owned.has(processInfo.pid)) {
        owned.add(processInfo.pid);
        changed = true;
      }
    }
  }
  return [...owned].sort((a, b) => a - b);
}

function taskNameFromEnv(): string {
  return process.env.QUANT_DESK_STARTUP_TASK_NAME?.trim() || 'Quant Desk Local Supervisor';
}

function readStartupTaskAudit(root: string, taskName = taskNameFromEnv()): StartupTaskAudit {
  const fallback: StartupTaskAudit = {
    taskName,
    installed: false,
    state: null,
    taskPath: null,
    execute: null,
    arguments: null,
    workingDirectory: null,
    multipleInstances: null,
    restartCount: null,
    restartInterval: null,
    healthy: false,
    issues: ['Startup task is not installed.'],
  };
  if (process.platform !== 'win32') {
    return { ...fallback, issues: ['Startup task audit is Windows-only.'] };
  }

  try {
    const escapedTaskName = taskName.replace(/'/g, "''");
    const raw = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$task = Get-ScheduledTask -TaskName '${escapedTaskName}' -ErrorAction SilentlyContinue; if (-not $task) { '{}' } else { [ordered]@{ TaskName = $task.TaskName; State = [string]$task.State; TaskPath = $task.TaskPath; Execute = $task.Actions[0].Execute; Arguments = $task.Actions[0].Arguments; WorkingDirectory = $task.Actions[0].WorkingDirectory; MultipleInstances = [string]$task.Settings.MultipleInstances; RestartCount = $task.Settings.RestartCount; RestartInterval = [string]$task.Settings.RestartInterval } | ConvertTo-Json -Compress }`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    const parsed = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    if (!parsed.TaskName) return fallback;
    const execute = typeof parsed.Execute === 'string' ? parsed.Execute : null;
    const args = typeof parsed.Arguments === 'string' ? parsed.Arguments : null;
    const workingDirectory = typeof parsed.WorkingDirectory === 'string' ? parsed.WorkingDirectory : null;
    const multipleInstances = typeof parsed.MultipleInstances === 'string' ? parsed.MultipleInstances : null;
    const issues: string[] = [];
    if (!execute?.toLowerCase().endsWith('wscript.exe')) issues.push('Startup task should launch wscript.exe.');
    if (!args?.includes('Launch-QuantDeskSupervisorTray.vbs')) issues.push('Startup task should launch Launch-QuantDeskSupervisorTray.vbs.');
    if (workingDirectory && path.resolve(workingDirectory) !== path.resolve(root)) issues.push('Startup task working directory does not match project root.');
    if (multipleInstances !== 'IgnoreNew') issues.push('Startup task should use MultipleInstances IgnoreNew.');
    return {
      taskName,
      installed: true,
      state: typeof parsed.State === 'string' ? parsed.State : null,
      taskPath: typeof parsed.TaskPath === 'string' ? parsed.TaskPath : null,
      execute,
      arguments: args,
      workingDirectory,
      multipleInstances,
      restartCount: typeof parsed.RestartCount === 'number' ? parsed.RestartCount : null,
      restartInterval: typeof parsed.RestartInterval === 'string' ? parsed.RestartInterval : null,
      healthy: issues.length === 0,
      issues,
    };
  } catch (error) {
    return { ...fallback, issues: [`Startup task audit failed: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

function healthStatusById(state: SupervisorRuntimeAudit['health'], key: keyof SupervisorRuntimeAudit['health']): string | null {
  return state[key] === undefined ? null : String(state[key]);
}

function summaryStatus(args: {
  healthStatus: SupervisorHealthLevel;
  duplicateProcessesDetected: boolean;
  startupTaskHealthy: boolean;
  bridgeReachable: boolean;
}): SupervisorRuntimeAudit['summary']['status'] {
  if (args.healthStatus === 'fail' || !args.bridgeReachable) return 'fail';
  if (args.healthStatus === 'warn' || args.duplicateProcessesDetected || !args.startupTaskHealthy) return 'warn';
  return 'ok';
}

export async function buildSupervisorRuntimeAudit(now = new Date()): Promise<SupervisorRuntimeAudit> {
  const configResult = loadSupervisorConfig();
  const config = configResult.config;
  const state: SupervisorState = getSupervisorState(config);
  const health = await buildHealthReport(config, state, now);
  const checks = new Map(health.checks.map((check) => [check.id, check]));
  const processes = listWindowsProcesses();
  const services = state.services.map((service) => {
    const serviceConfig = config.childServices.find((item) => item.id === service.id);
    return {
      id: service.id,
      label: serviceConfig?.label || service.id,
      enabled: Boolean(serviceConfig?.enabled),
      status: service.status,
      ownedPid: service.pid,
      ownedPidRunning: isProcessRunning(service.pid),
      processTreePids: processTree(service.pid, processes),
      externalPids: service.externalPids || [],
      duplicateRisk: (service.externalPids || []).length > 0,
      stdoutLog: service.stdoutLog || null,
      stderrLog: service.stderrLog || null,
    };
  });
  const startupTask = readStartupTaskAudit(process.cwd());
  const bridgeStatus = checks.get('bridge')?.status || null;
  const healthSummary = {
    status: health.status,
    bridgeStatus,
    scannerStateStatus: checks.get('scanner_state_file')?.status || null,
    recorderHeartbeatStatus: checks.get('recorder_heartbeat')?.status || null,
  };
  const duplicateProcessesDetected = services.some((service) => service.duplicateRisk);
  const bridgeReachable = bridgeStatus === 'ok';
  const status = summaryStatus({
    healthStatus: health.status,
    duplicateProcessesDetected,
    startupTaskHealthy: startupTask.healthy,
    bridgeReachable,
  });
  return {
    generatedAt: now.toISOString(),
    supervisor: {
      pid: state.supervisorPid,
      running: isProcessRunning(state.supervisorPid),
      statusEndpoint: `http://${config.host}:${config.port}${config.statusPath}`,
      logsDir: config.logsDir,
    },
    services,
    startupTask,
    health: healthSummary,
    summary: {
      status,
      duplicateProcessesDetected,
      startupTaskHealthy: startupTask.healthy,
      bridgeReachable,
      recommendedAction: status === 'ok'
        ? 'No action needed.'
        : duplicateProcessesDetected
          ? 'Run the next repair phase after review; this audit is read-only and did not stop duplicate processes.'
          : !startupTask.healthy
            ? 'Review or reinstall the Quant Desk startup task.'
            : !bridgeReachable
              ? 'Start NinjaTrader and confirm the QuantDeskBridge AddOn is running.'
              : 'Review supervisor health details.',
    },
    boundaries: {
      readOnly: true,
      stopsProcesses: false,
      startsProcesses: false,
      repairsState: false,
      postsDiscord: false,
      changesTradingLogic: false,
      changesScannerBehavior: false,
      changesCanExecute: false,
    },
  };
}

if (isDirectCliEntrypoint()) {
  const audit = await buildSupervisorRuntimeAudit();
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  if (audit.summary.status === 'fail') process.exitCode = 1;
}
