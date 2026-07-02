import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export type RuntimeJsonReadSource = 'primary' | 'backup' | 'missing' | 'invalid';
export type RuntimeJsonValidationStatus = 'valid' | 'invalid' | 'not_checked';
export type RuntimeJsonValidator<T> = (value: T) => string | null;

export interface RuntimeJsonTempCleanupEntry {
  filePath: string;
  ageMs: number;
  removed: boolean;
  error: string | null;
}

export interface RuntimeJsonTempCleanupResult {
  dryRun: boolean;
  olderThanMs: number;
  scannedDirs: string[];
  matched: RuntimeJsonTempCleanupEntry[];
  removedCount: number;
  errorCount: number;
}

export interface RuntimeJsonReadResult<T> {
  value: T | null;
  source: RuntimeJsonReadSource;
  error: string | null;
  validationStatus: RuntimeJsonValidationStatus;
  validationError: string | null;
}

function backupPath(filePath: string): string {
  return `${filePath}.bak`;
}

function tempPath(filePath: string): string {
  return `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRuntimeJsonTempFile(fileName: string): boolean {
  return /\.json\.tmp-\d+-\d+-[a-f0-9]+$/i.test(fileName);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT');
}

function isIgnorableSyncError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'EPERM');
}

function isRetryableReplaceError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  return ['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(String((error as { code?: unknown }).code));
}

function retryDelayMs(attempt: number): number {
  return Math.min(250, 25 * (attempt + 1));
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function replaceRuntimeJsonSync(tmp: string, filePath: string, attempts = 8): void {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      fs.renameSync(tmp, filePath);
      return;
    } catch (error) {
      if (!isRetryableReplaceError(error) || attempt === attempts - 1) throw error;
      sleepSync(retryDelayMs(attempt));
    }
  }
}

async function replaceRuntimeJson(tmp: string, filePath: string, attempts = 8): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fsp.rename(tmp, filePath);
      return;
    } catch (error) {
      if (!isRetryableReplaceError(error) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
    }
  }
}

function checkedValue<T>(
  value: T,
  source: RuntimeJsonReadSource,
  readError: string | null,
  validate?: RuntimeJsonValidator<T>,
): RuntimeJsonReadResult<T> {
  const validationError = validate ? validate(value) : null;
  if (validationError) {
    return {
      value: null,
      source: 'invalid',
      error: validationError,
      validationStatus: 'invalid',
      validationError,
    };
  }
  return {
    value,
    source,
    error: readError,
    validationStatus: validate ? 'valid' : 'not_checked',
    validationError: null,
  };
}

export function readRuntimeJsonSync<T>(filePath: string, validate?: RuntimeJsonValidator<T>): RuntimeJsonReadResult<T> {
  try {
    const primary = checkedValue(JSON.parse(fs.readFileSync(filePath, 'utf8')) as T, 'primary', null, validate);
    if (primary.validationStatus === 'invalid') throw new Error(primary.validationError || 'Runtime JSON schema validation failed.');
    return primary;
  } catch (primaryError) {
    try {
      return checkedValue(JSON.parse(fs.readFileSync(backupPath(filePath), 'utf8')) as T, 'backup', formatError(primaryError), validate);
    } catch {
      return {
        value: null,
        source: isMissingFileError(primaryError) ? 'missing' : 'invalid',
        error: isMissingFileError(primaryError) ? null : formatError(primaryError),
        validationStatus: isMissingFileError(primaryError) || !validate ? 'not_checked' : 'invalid',
        validationError: validate && !isMissingFileError(primaryError) ? formatError(primaryError) : null,
      };
    }
  }
}

export async function readRuntimeJson<T>(filePath: string, validate?: RuntimeJsonValidator<T>): Promise<RuntimeJsonReadResult<T>> {
  try {
    const primary = checkedValue(JSON.parse(await fsp.readFile(filePath, 'utf8')) as T, 'primary', null, validate);
    if (primary.validationStatus === 'invalid') throw new Error(primary.validationError || 'Runtime JSON schema validation failed.');
    return primary;
  } catch (primaryError) {
    try {
      return checkedValue(JSON.parse(await fsp.readFile(backupPath(filePath), 'utf8')) as T, 'backup', formatError(primaryError), validate);
    } catch {
      return {
        value: null,
        source: isMissingFileError(primaryError) ? 'missing' : 'invalid',
        error: isMissingFileError(primaryError) ? null : formatError(primaryError),
        validationStatus: isMissingFileError(primaryError) || !validate ? 'not_checked' : 'invalid',
        validationError: validate && !isMissingFileError(primaryError) ? formatError(primaryError) : null,
      };
    }
  }
}

export function writeRuntimeJsonAtomicSync(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = tempPath(filePath);
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(tmp, payload, 'utf8');
  const handle = fs.openSync(tmp, 'r');
  try {
    try {
      fs.fsyncSync(handle);
    } catch (error) {
      if (!isIgnorableSyncError(error)) throw error;
    }
  } finally {
    fs.closeSync(handle);
  }
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath(filePath));
  }
  try {
    replaceRuntimeJsonSync(tmp, filePath);
  } catch (error) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // Best-effort cleanup only; preserve the original write error.
    }
    throw error;
  }
}

export async function writeRuntimeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = tempPath(filePath);
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  const handle = await fsp.open(tmp, 'w');
  try {
    await handle.writeFile(payload, 'utf8');
    try {
      await handle.sync();
    } catch (error) {
      if (!isIgnorableSyncError(error)) throw error;
    }
  } finally {
    await handle.close();
  }
  try {
    await fsp.copyFile(filePath, backupPath(filePath));
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
  try {
    await replaceRuntimeJson(tmp, filePath);
  } catch (error) {
    try {
      await fsp.rm(tmp, { force: true });
    } catch {
      // Best-effort cleanup only; preserve the original write error.
    }
    throw error;
  }
}

export function cleanupRuntimeJsonTempFilesSync(args: {
  dirs: string[];
  olderThanMs: number;
  now?: Date;
  dryRun?: boolean;
}): RuntimeJsonTempCleanupResult {
  const now = args.now || new Date();
  const dryRun = args.dryRun !== false;
  const scannedDirs = [...new Set(args.dirs.map((dir) => path.resolve(dir)))];
  const matched: RuntimeJsonTempCleanupEntry[] = [];

  for (const dir of scannedDirs) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !isRuntimeJsonTempFile(entry.name)) continue;
      const filePath = path.join(dir, entry.name);
      try {
        const stat = fs.statSync(filePath);
        const ageMs = Math.max(0, now.getTime() - stat.mtimeMs);
        if (ageMs < args.olderThanMs) continue;
        if (!dryRun) fs.rmSync(filePath, { force: true });
        matched.push({ filePath, ageMs: Math.round(ageMs), removed: !dryRun, error: null });
      } catch (error) {
        matched.push({
          filePath,
          ageMs: 0,
          removed: false,
          error: formatError(error),
        });
      }
    }
  }

  return {
    dryRun,
    olderThanMs: args.olderThanMs,
    scannedDirs,
    matched,
    removedCount: matched.filter((item) => item.removed).length,
    errorCount: matched.filter((item) => item.error).length,
  };
}
