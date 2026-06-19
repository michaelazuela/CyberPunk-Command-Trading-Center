import path from 'node:path';
import { cleanupRuntimeJsonTempFilesSync } from '../runtimeJson';

const DEFAULT_OLDER_THAN_MS = 6 * 60 * 60 * 1000;

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const prefix = `--${name}=`;
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function defaultRuntimeDirs(cwd = process.cwd()): string[] {
  return [
    path.resolve(cwd, 'logs', 'supervisor'),
    path.resolve(cwd, 'tools', 'automation'),
    path.resolve(cwd, 'tools', 'automation', 'discord-audit'),
  ];
}

const apply = hasArg('apply');
const olderThanMs = numberArg('older-than-ms', DEFAULT_OLDER_THAN_MS);
const extraDirs = process.argv
  .filter((arg) => arg.startsWith('--dir='))
  .map((arg) => path.resolve(arg.slice('--dir='.length)));
const dirs = extraDirs.length ? extraDirs : defaultRuntimeDirs();

const result = cleanupRuntimeJsonTempFilesSync({
  dirs,
  olderThanMs,
  dryRun: !apply,
});

process.stdout.write(`${JSON.stringify({
  ...result,
  mode: apply ? 'apply' : 'preview',
  boundaries: {
    deletesOnlyRuntimeJsonTempFiles: true,
    startsProcesses: false,
    stopsProcesses: false,
    postsDiscord: false,
    changesTradingLogic: false,
    changesScannerBehavior: false,
    changesCanExecute: false,
  },
}, null, 2)}\n`);

if (result.errorCount > 0) process.exitCode = 1;
