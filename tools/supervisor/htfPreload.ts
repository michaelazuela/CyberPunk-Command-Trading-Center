import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { SupervisorConfig } from './config';
import type { SupervisorLogger } from './logger';
import { buildWindowsSafeSpawnCommand } from './preWindowBackfill';

const REQUIRED_HTF_PRELOAD_TIMEFRAMES = ['5m', '15m', '60m', '120m', '240m'] as const;
type RequiredHtfPreloadTimeframe = typeof REQUIRED_HTF_PRELOAD_TIMEFRAMES[number];

export interface HtfPreloadResult {
  enabled: boolean;
  attempted: boolean;
  attempts: number;
  ok: boolean;
  assurance: HtfPreloadAssurance;
  command: string[];
  stdoutLog: string;
  stderrLog: string;
  reason: string;
}

export interface HtfPreloadAssurance {
  requiredTimeframes: RequiredHtfPreloadTimeframe[];
  reportedTimeframes: RequiredHtfPreloadTimeframe[];
  missingTimeframes: RequiredHtfPreloadTimeframe[];
  noBarsTimeframes: RequiredHtfPreloadTimeframe[];
  stderrWarning: boolean;
  ok: boolean;
  reason: string;
  operatorActions: string[];
}

export type HtfPreloadRunner = (
  command: string,
  args: string[],
  options: { cwd: string; timeout: number; stdoutLog: string; stderrLog: string },
) => { status: number | null; error?: Error | null };

function sleepSync(ms: number): void {
  if (ms <= 0) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function scannerArg(config: SupervisorConfig, name: string, fallback: string): string {
  const scanner = config.childServices.find((service) => service.id === 'scanner');
  const index = scanner?.args.indexOf(name) ?? -1;
  return index >= 0 && scanner?.args[index + 1] ? scanner.args[index + 1] : fallback;
}

export function buildHtfPreloadCommand(config: SupervisorConfig): { command: string; args: string[] } {
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
      String(config.htfPreload.days),
      '--delay-ms',
      String(config.htfPreload.delayMs),
    ],
  };
}

function readLog(pathname: string): string {
  try {
    return fs.existsSync(pathname) ? fs.readFileSync(pathname, 'utf8') : '';
  } catch {
    return '';
  }
}

function uniqueTimeframes(matches: Iterable<RequiredHtfPreloadTimeframe>): RequiredHtfPreloadTimeframe[] {
  const found = new Set(matches);
  return REQUIRED_HTF_PRELOAD_TIMEFRAMES.filter((timeframe) => found.has(timeframe));
}

function buildOperatorActions(input: {
  missingTimeframes: RequiredHtfPreloadTimeframe[];
  noBarsTimeframes: RequiredHtfPreloadTimeframe[];
  stderrWarning: boolean;
}): string[] {
  if (!input.missingTimeframes.length && !input.noBarsTimeframes.length && !input.stderrWarning) return [];
  const affected = uniqueTimeframes([...input.missingTimeframes, ...input.noBarsTimeframes]);
  return [
    'Confirm NinjaTrader is connected to the live/historical data provider and the active futures contract is selected.',
    `Load or refresh at least 30 calendar days of ${affected.length ? affected.join(', ') : '5m, 15m, 60m, 120m, and 240m'} history for the active bridge contract in NinjaTrader.`,
    'Run the supervisor HTF preload/backfill again, or restart Quant Desk Supervisor so it reruns the startup preload.',
    'If the provider still returns no bars, treat HTF structure as data-limited and do not promote HTF/MSS candidates until real bars are available.',
  ];
}

export function parseHtfPreloadAssurance(stdoutText: string, stderrText = ''): HtfPreloadAssurance {
  const combinedText = `${stdoutText}\n${stderrText}`;
  const reportedTimeframes = uniqueTimeframes(
    Array.from(
      combinedText.matchAll(/\[backfill\]\s+\d{4}-\d{2}-\d{2}\s+(5m|15m|60m|120m|240m):/g),
      (match) => match[1] as RequiredHtfPreloadTimeframe,
    ),
  );
  const noBarsTimeframes = uniqueTimeframes(
    Array.from(
      combinedText.matchAll(/\[backfill\]\s+\d{4}-\d{2}-\d{2}\s+(5m|15m|60m|120m|240m):\s+no bars returned\./g),
      (match) => match[1] as RequiredHtfPreloadTimeframe,
    ),
  );
  const missingTimeframes = REQUIRED_HTF_PRELOAD_TIMEFRAMES.filter((timeframe) => !reportedTimeframes.includes(timeframe));
  const stderrWarning = stderrText.trim().length > 0;
  const ok = missingTimeframes.length === 0 && noBarsTimeframes.length === 0 && !stderrWarning;
  const operatorActions = buildOperatorActions({ missingTimeframes, noBarsTimeframes, stderrWarning });
  const reason = ok
    ? 'HTF preload assurance saw backfill reports for 5m, 15m, 60m, 120m, and 240m with no no-bars warnings.'
    : [
      missingTimeframes.length ? `Missing timeframe report(s): ${missingTimeframes.join(', ')}.` : null,
      noBarsTimeframes.length ? `No bars returned for: ${noBarsTimeframes.join(', ')}.` : null,
      stderrWarning ? 'Backfill wrote warnings/errors to stderr.' : null,
      'Scanner will still block HTF promotion if coverage remains incomplete.',
      `Operator action: ${operatorActions.join(' ')}`,
    ].filter(Boolean).join(' ');

  return {
    requiredTimeframes: [...REQUIRED_HTF_PRELOAD_TIMEFRAMES],
    reportedTimeframes,
    missingTimeframes,
    noBarsTimeframes,
    stderrWarning,
    ok,
    reason,
    operatorActions,
  };
}

export const defaultHtfPreloadRunner: HtfPreloadRunner = (command, args, options) => {
  const stdout = fs.openSync(options.stdoutLog, 'a');
  const stderr = fs.openSync(options.stderrLog, 'a');
  try {
    const spawnCommand = buildWindowsSafeSpawnCommand(command, args);
    return spawnSync(spawnCommand.command, spawnCommand.args, {
      cwd: options.cwd,
      timeout: options.timeout,
      windowsHide: true,
      stdio: ['ignore', stdout, stderr],
    });
  } finally {
    fs.closeSync(stdout);
    fs.closeSync(stderr);
  }
};

export function runHtfPreloadStartup(
  config: SupervisorConfig,
  logger: SupervisorLogger,
  runner: HtfPreloadRunner = defaultHtfPreloadRunner,
): HtfPreloadResult {
  const defaultStdoutLog = path.join(config.logsDir, 'htf-preload.stdout.log');
  const defaultStderrLog = path.join(config.logsDir, 'htf-preload.stderr.log');
  const command = buildHtfPreloadCommand(config);
  const disabledAssurance: HtfPreloadAssurance = {
    requiredTimeframes: [...REQUIRED_HTF_PRELOAD_TIMEFRAMES],
    reportedTimeframes: [],
    missingTimeframes: [],
    noBarsTimeframes: [],
    stderrWarning: false,
    ok: true,
    reason: 'HTF preload assurance not run because startup preload is disabled.',
    operatorActions: [],
  };
  if (!config.htfPreload.enabled) {
    return {
      enabled: false,
      attempted: false,
      attempts: 0,
      ok: true,
      assurance: disabledAssurance,
      command: [command.command, ...command.args],
      stdoutLog: defaultStdoutLog,
      stderrLog: defaultStderrLog,
      reason: 'HTF preload disabled by SUPERVISOR_HTF_PRELOAD_ON_START.',
    };
  }

  fs.mkdirSync(config.logsDir, { recursive: true });
  logger.log('info', 'HTF preload startup backfill requested.', {
    days: config.htfPreload.days,
    delayMs: config.htfPreload.delayMs,
    timeoutMs: config.htfPreload.timeoutMs,
    maxAttempts: config.htfPreload.maxAttempts,
    retryDelayMs: config.htfPreload.retryDelayMs,
  });

  let finalResult: { status: number | null; error?: Error | null } = { status: null };
  let assurance = disabledAssurance;
  let stdoutLog = defaultStdoutLog;
  let stderrLog = defaultStderrLog;
  let attempts = 0;
  let ok = false;

  for (let attempt = 1; attempt <= config.htfPreload.maxAttempts; attempt += 1) {
    attempts = attempt;
    stdoutLog = config.htfPreload.maxAttempts === 1
      ? defaultStdoutLog
      : path.join(config.logsDir, `htf-preload.attempt-${attempt}.stdout.log`);
    stderrLog = config.htfPreload.maxAttempts === 1
      ? defaultStderrLog
      : path.join(config.logsDir, `htf-preload.attempt-${attempt}.stderr.log`);
    fs.writeFileSync(stdoutLog, '', 'utf8');
    fs.writeFileSync(stderrLog, '', 'utf8');
    logger.log('info', 'HTF preload attempt started.', { attempt, maxAttempts: config.htfPreload.maxAttempts, stdoutLog, stderrLog });
    finalResult = runner(command.command, command.args, {
      cwd: process.cwd(),
      timeout: config.htfPreload.timeoutMs,
      stdoutLog,
      stderrLog,
    });
    assurance = parseHtfPreloadAssurance(readLog(stdoutLog), readLog(stderrLog));
    ok = finalResult.status === 0 && assurance.ok;
    logger.log(ok ? 'info' : 'warn', ok ? 'HTF preload attempt passed assurance.' : 'HTF preload attempt did not pass assurance.', {
      attempt,
      maxAttempts: config.htfPreload.maxAttempts,
      exitStatus: finalResult.status,
      stdoutLog,
      stderrLog,
      assurance,
    });
    if (ok) break;
    if (attempt < config.htfPreload.maxAttempts) sleepSync(config.htfPreload.retryDelayMs);
  }

  const reason = ok
    ? `HTF preload completed before supervised services launched after ${attempts} attempt(s). ${assurance.reason}`
    : `HTF preload assurance did not pass after ${attempts} attempt(s) (${finalResult.error?.message || `exit ${finalResult.status ?? 'unknown'}`}; ${assurance.reason})`;
  logger.log(ok ? 'info' : 'warn', reason, { attempts, stdoutLog, stderrLog, assurance });
  return {
    enabled: true,
    attempted: true,
    attempts,
    ok,
    assurance,
    command: [command.command, ...command.args],
    stdoutLog,
    stderrLog,
    reason,
  };
}
