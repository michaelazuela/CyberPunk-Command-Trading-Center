import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export type RuntimeJsonReadSource = 'primary' | 'backup' | 'missing' | 'invalid';
export type RuntimeJsonValidationStatus = 'valid' | 'invalid' | 'not_checked';
export type RuntimeJsonValidator<T> = (value: T) => string | null;

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

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'ENOENT');
}

function isIgnorableSyncError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'EPERM');
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
  fs.renameSync(tmp, filePath);
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
  await fsp.rename(tmp, filePath);
}
