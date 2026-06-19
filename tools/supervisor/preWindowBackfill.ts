import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { readRuntimeJsonSync, writeRuntimeJsonAtomicSync } from '../runtimeJson';
import type { SupervisorConfig } from './config';
import type { SupervisorLogger } from './logger';

export type PreWindowBackfillSession = 'morning' | 'lunch' | 'evening';

export interface PreWindowBackfillRun {
  session: PreWindowBackfillSession;
  tradeDate: string;
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  exitStatus: number | null;
  stdoutLog: string;
  stderrLog: string;
  command: string[];
  reason: string;
}

export interface PreWindowBackfillState {
  runs: Record<string, PreWindowBackfillRun>;
}

export interface PreWindowBackfillResult {
  enabled: boolean;
  attempted: boolean;
  due: boolean;
  run: PreWindowBackfillRun | null;
  reason: string;
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function quoteWindowsArg(value: string): string {
  if (value && !/\s|"/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildWindowsSafeSpawnCommand(command: string, args: string[]): { command: string; args: string[] } {
  if (process.platform !== 'win32') return { command, args };
  return {
    command: 'cmd.exe',
    args: ['/d', '/c', [command, ...args.map(quoteWindowsArg)].join(' ')],
  };
}

function statePath(logsDir: string): string {
  return path.join(logsDir, 'pre-window-backfill-state.json');
}

export function readPreWindowBackfillState(logsDir: string): PreWindowBackfillState {
  return readRuntimeJsonSync<PreWindowBackfillState>(statePath(logsDir)).value || { runs: {} };
}

function writePreWindowBackfillState(logsDir: string, state: PreWindowBackfillState): void {
  writeRuntimeJsonAtomicSync(statePath(logsDir), state);
}

function scannerArg(config: SupervisorConfig, name: string, fallback: string): string {
  const scanner = config.childServices.find((service) => service.id === 'scanner');
  const index = scanner?.args.indexOf(name) ?? -1;
  return index >= 0 && scanner?.args[index + 1] ? scanner.args[index + 1] : fallback;
}

function etParts(now: Date): { tradeDate: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    tradeDate: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseEtMinutes(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function dueSession(config: SupervisorConfig, now: Date): { session: PreWindowBackfillSession; tradeDate: string } | null {
  const current = etParts(now);
  const morningStart = parseEtMinutes(config.preWindowBackfill.morningStartEt);
  const morningEnd = parseEtMinutes(config.preWindowBackfill.morningEndEt);
  const lunchStart = parseEtMinutes(config.preWindowBackfill.lunchStartEt);
  const lunchEnd = parseEtMinutes(config.preWindowBackfill.lunchEndEt);
  const eveningStart = parseEtMinutes(config.preWindowBackfill.eveningStartEt);
  const eveningEnd = parseEtMinutes(config.preWindowBackfill.eveningEndEt);

  if (current.minutes >= morningStart && current.minutes < morningEnd) {
    return { session: 'morning', tradeDate: current.tradeDate };
  }
  if (current.minutes >= lunchStart && current.minutes < lunchEnd) {
    return { session: 'lunch', tradeDate: current.tradeDate };
  }
  if (current.minutes >= eveningStart && current.minutes < eveningEnd) {
    return { session: 'evening', tradeDate: current.tradeDate };
  }
  return null;
}

export function buildPreWindowBackfillCommand(config: SupervisorConfig): { command: string; args: string[] } {
  const instrument = scannerArg(config, '--instrument', 'MES');
  const bridgeInstrument = scannerArg(config, '--bridge-instrument', instrument);
  const bridgeUrl = scannerArg(config, '--bridge-url', config.health.bridgeUrl);
  return {
    command: npmCommand(),
    args: [
      'run',
      'nt:backfill',
      '--',
      '--instrument',
      instrument,
      '--bridge-instrument',
      bridgeInstrument,
      '--bridge-url',
      bridgeUrl,
      '--days',
      String(config.preWindowBackfill.days),
      '--delay-ms',
      String(config.preWindowBackfill.delayMs),
    ],
  };
}

export function runPreWindowBackfillIfDue(
  config: SupervisorConfig,
  logger: SupervisorLogger,
  now = new Date(),
): PreWindowBackfillResult {
  if (!config.preWindowBackfill.enabled) {
    return { enabled: false, attempted: false, due: false, run: null, reason: 'Pre-window backfill disabled.' };
  }

  const due = dueSession(config, now);
  if (!due) {
    return { enabled: true, attempted: false, due: false, run: null, reason: 'No pre-window backfill window is active.' };
  }

  const state = readPreWindowBackfillState(config.logsDir);
  const runKey = `${due.tradeDate}:${due.session}`;
  const priorRun = state.runs[runKey];
  if (priorRun?.ok) {
    return {
      enabled: true,
      attempted: false,
      due: true,
      run: priorRun,
      reason: `Pre-window ${due.session} backfill already passed for ${due.tradeDate}.`,
    };
  }

  fs.mkdirSync(config.logsDir, { recursive: true });
  const command = buildPreWindowBackfillCommand(config);
  const stdoutLog = path.join(config.logsDir, `pre-window-backfill.${due.session}.${due.tradeDate}.stdout.log`);
  const stderrLog = path.join(config.logsDir, `pre-window-backfill.${due.session}.${due.tradeDate}.stderr.log`);
  const stdout = fs.openSync(stdoutLog, 'a');
  const stderr = fs.openSync(stderrLog, 'a');
  const startedAt = now.toISOString();

  logger.log('info', 'Pre-window market-data backfill started.', {
    session: due.session,
    tradeDate: due.tradeDate,
    days: config.preWindowBackfill.days,
    stdoutLog,
    stderrLog,
  });

  let result: { status: number | null; error?: Error | null };
  try {
    const spawnCommand = buildWindowsSafeSpawnCommand(command.command, command.args);
    result = spawnSync(spawnCommand.command, spawnCommand.args, {
      cwd: process.cwd(),
      timeout: config.preWindowBackfill.timeoutMs,
      windowsHide: true,
      stdio: ['ignore', stdout, stderr],
    });
  } finally {
    fs.closeSync(stdout);
    fs.closeSync(stderr);
  }

  const run: PreWindowBackfillRun = {
    session: due.session,
    tradeDate: due.tradeDate,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: result.status === 0,
    exitStatus: result.status,
    stdoutLog,
    stderrLog,
    command: [command.command, ...command.args],
    reason: result.status === 0
      ? 'Pre-window cache repair completed.'
      : `Pre-window cache repair failed safely (${result.error?.message || `exit ${result.status ?? 'unknown'}`}).`,
  };

  state.runs[runKey] = run;
  writePreWindowBackfillState(config.logsDir, state);
  logger.log(run.ok ? 'info' : 'warn', run.reason, { ...run });

  return {
    enabled: true,
    attempted: true,
    due: true,
    run,
    reason: run.reason,
  };
}
