import { execFileSync } from 'node:child_process';

export function readEnvWithUserFallback(key: string, env: NodeJS.ProcessEnv = process.env): string {
  const processValue = env[key]?.trim();
  if (processValue) return processValue;
  if (env !== process.env || process.platform !== 'win32') return '';
  try {
    const escapedKey = key.replace(/'/g, "''");
    return execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `[Environment]::GetEnvironmentVariable('${escapedKey}', 'User')`,
    ], {
      encoding: 'utf8',
      timeout: 2_000,
      windowsHide: true,
    }).trim();
  } catch {
    return '';
  }
}
