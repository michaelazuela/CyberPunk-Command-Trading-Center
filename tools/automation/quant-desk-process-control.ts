import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  clearQuantDeskMaintenanceLock,
  createQuantDeskMaintenanceLock,
  readQuantDeskMaintenanceStatus,
  type QuantDeskMaintenanceStatus,
} from './quant-desk-maintenance';

export interface QuantDeskProcessInfo {
  pid: number;
  parentPid: number | null;
  name: string;
  commandLine: string;
}

export interface QuantDeskStopAllReport {
  generatedAt: string;
  cwd: string;
  maintenance: QuantDeskMaintenanceStatus;
  matchedProcesses: QuantDeskProcessInfo[];
  stoppedPids: number[];
  failedStops: Array<{ pid: number; error: string }>;
  remainingProcesses: QuantDeskProcessInfo[];
  supervisorPortListening: boolean;
  ok: boolean;
}

const QUANT_DESK_SCRIPT_PATTERNS = [
  'supervisor:start',
  'supervisor:stop',
  'tools/supervisor/index.ts',
  'nt:candle-recorder',
  'tools/automation/candle-recorder.ts',
  'nt:scanner',
  'tools/automation/nt-scanner.ts',
  'nt:backfill',
  'tools/automation/backfill-market-bars.ts',
  'nt:discord-alerts',
  'tools/automation/discord-scheduler.ts',
];

function normalizeCommandLine(value: string): string {
  return value.replace(/\\/g, '/').toLowerCase();
}

export function isQuantDeskAutomationCommandLine(commandLine: string, cwd = process.cwd()): boolean {
  const normalized = normalizeCommandLine(commandLine);
  const normalizedCwd = normalizeCommandLine(path.resolve(cwd));
  const hasKnownScript = QUANT_DESK_SCRIPT_PATTERNS.some((pattern) => normalized.includes(pattern.toLowerCase()));
  if (!hasKnownScript) return false;
  return normalized.includes(normalizedCwd) || normalized.includes('supervisor:start') || normalized.includes('supervisor:stop');
}

function parseProcessRows(raw: string): QuantDeskProcessInfo[] {
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as
    | { ProcessId: number; ParentProcessId?: number; Name?: string; CommandLine?: string }
    | Array<{ ProcessId: number; ParentProcessId?: number; Name?: string; CommandLine?: string }>;
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .filter((row) => row.CommandLine)
    .map((row) => ({
      pid: Number(row.ProcessId),
      parentPid: typeof row.ParentProcessId === 'number' ? row.ParentProcessId : null,
      name: String(row.Name || ''),
      commandLine: String(row.CommandLine || ''),
    }));
}

export function listSystemProcesses(): QuantDeskProcessInfo[] {
  if (process.platform !== 'win32') return [];
  try {
    const raw = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|npm|cmd|powershell|pwsh' } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress",
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return parseProcessRows(raw);
  } catch {
    return [];
  }
}

function expandProcessTree(pids: Set<number>, processes: QuantDeskProcessInfo[]): Set<number> {
  const expanded = new Set(pids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const processInfo of processes) {
      if (processInfo.parentPid && expanded.has(processInfo.parentPid) && !expanded.has(processInfo.pid)) {
        expanded.add(processInfo.pid);
        changed = true;
      }
    }
  }
  return expanded;
}

export function findQuantDeskAutomationProcesses(args: {
  cwd?: string;
  processes?: QuantDeskProcessInfo[];
  currentPid?: number;
} = {}): QuantDeskProcessInfo[] {
  const cwd = args.cwd || process.cwd();
  const currentPid = args.currentPid ?? process.pid;
  const processes = args.processes || listSystemProcesses();
  const directMatches = processes
    .filter((processInfo) => processInfo.pid !== currentPid)
    .filter((processInfo) => isQuantDeskAutomationCommandLine(processInfo.commandLine, cwd));
  const pids = expandProcessTree(new Set(directMatches.map((item) => item.pid)), processes);
  return processes
    .filter((processInfo) => processInfo.pid !== currentPid && pids.has(processInfo.pid))
    .sort((a, b) => b.pid - a.pid);
}

function supervisorPortListening(port = 8797): boolean {
  if (process.platform !== 'win32') return false;
  try {
    const raw = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `@(Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }).Count`,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return Number(raw) > 0;
  } catch {
    return false;
  }
}

function stopProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  process.kill(pid, 'SIGTERM');
}

export function stopAllQuantDeskAutomation(args: {
  cwd?: string;
  createLock?: boolean;
  reason?: string;
  currentPid?: number;
  processes?: QuantDeskProcessInfo[];
} = {}): QuantDeskStopAllReport {
  const cwd = path.resolve(args.cwd || process.cwd());
  const maintenance = args.createLock === false
    ? readQuantDeskMaintenanceStatus({ cwd })
    : createQuantDeskMaintenanceLock({
      cwd,
      reason: args.reason || 'Stop-all requested; Quant Desk automation intentionally stopped.',
      owner: 'quant-desk-stop-all',
      action: 'stop-all',
    });
  const initialProcesses = args.processes || listSystemProcesses();
  const matchedProcesses = findQuantDeskAutomationProcesses({ cwd, processes: initialProcesses, currentPid: args.currentPid });
  const stoppedPids: number[] = [];
  const failedStops: Array<{ pid: number; error: string }> = [];

  for (const processInfo of matchedProcesses) {
    try {
      stopProcessTree(processInfo.pid);
      stoppedPids.push(processInfo.pid);
    } catch (error) {
      failedStops.push({ pid: processInfo.pid, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const remainingProcesses = findQuantDeskAutomationProcesses({ cwd, currentPid: args.currentPid });
  const portListening = supervisorPortListening();
  return {
    generatedAt: new Date().toISOString(),
    cwd,
    maintenance,
    matchedProcesses,
    stoppedPids,
    failedStops,
    remainingProcesses,
    supervisorPortListening: portListening,
    ok: failedStops.length === 0 && remainingProcesses.length === 0 && !portListening,
  };
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const direct = process.argv.indexOf(`--${name}`);
  if (direct >= 0 && process.argv[direct + 1]) return process.argv[direct + 1];
  const matched = process.argv.find((item) => item.startsWith(`--${name}=`));
  return matched ? matched.slice(name.length + 3) : null;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/quant-desk-process-control.ts')) {
  const command = process.argv[2] || 'status';
  let output: unknown;
  if (command === 'stop-all') {
    output = stopAllQuantDeskAutomation({
      createLock: !hasFlag('no-lock'),
      reason: argValue('reason') || undefined,
    });
  } else if (command === 'maintenance:on') {
    output = createQuantDeskMaintenanceLock({
      reason: argValue('reason') || 'Manual Quant Desk maintenance mode.',
      owner: 'quant-desk-cli',
      action: 'maintenance:on',
    });
  } else if (command === 'maintenance:off') {
    output = clearQuantDeskMaintenanceLock();
  } else if (command === 'maintenance:status') {
    output = readQuantDeskMaintenanceStatus();
  } else if (command === 'status') {
    output = {
      generatedAt: new Date().toISOString(),
      maintenance: readQuantDeskMaintenanceStatus(),
      processes: findQuantDeskAutomationProcesses(),
      supervisorPortListening: supervisorPortListening(),
    };
  } else {
    process.stderr.write('Usage: tsx tools/automation/quant-desk-process-control.ts [status|stop-all|maintenance:on|maintenance:off|maintenance:status]\n');
    process.exitCode = 1;
  }
  if (output) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
