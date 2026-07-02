import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cleanupRuntimeJsonTempFilesSync,
  readRuntimeJson,
  readRuntimeJsonSync,
  writeRuntimeJsonAtomic,
  writeRuntimeJsonAtomicSync,
} from './runtimeJson';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quant-desk-runtime-json-'));

try {
  const syncFile = path.join(tempDir, 'sync-state.json');
  writeRuntimeJsonAtomicSync(syncFile, { version: 1, status: 'ok' });
  assert.deepEqual(readRuntimeJsonSync(syncFile), {
    value: { version: 1, status: 'ok' },
    source: 'primary',
    error: null,
    validationStatus: 'not_checked',
    validationError: null,
  });

  writeRuntimeJsonAtomicSync(syncFile, { version: 2, status: 'updated' });
  assert.deepEqual(readRuntimeJsonSync(`${syncFile}.bak`).value, { version: 1, status: 'ok' });
  fs.writeFileSync(syncFile, '{bad json', 'utf8');
  const recoveredSync = readRuntimeJsonSync<{ version: number; status: string }>(syncFile);
  assert.equal(recoveredSync.source, 'backup');
  assert.deepEqual(recoveredSync.value, { version: 1, status: 'ok' });
  assert.equal(recoveredSync.validationStatus, 'not_checked');

  writeRuntimeJsonAtomicSync(syncFile, { version: 3, status: 'valid' });
  writeRuntimeJsonAtomicSync(syncFile, { version: 4, status: 'backup-valid' });
  fs.writeFileSync(syncFile, JSON.stringify({ status: 'missing-version' }), 'utf8');
  const schemaRecoveredSync = readRuntimeJsonSync<{ version: number; status: string }>(
    syncFile,
    (value) => typeof value.version === 'number' ? null : 'version must be a number',
  );
  assert.equal(schemaRecoveredSync.source, 'backup');
  assert.equal(schemaRecoveredSync.validationStatus, 'valid');
  assert.deepEqual(schemaRecoveredSync.value, { version: 3, status: 'valid' });

  const asyncFile = path.join(tempDir, 'async-state.json');
  await writeRuntimeJsonAtomic(asyncFile, { version: 1, status: 'ok' });
  await writeRuntimeJsonAtomic(asyncFile, { version: 2, status: 'updated' });
  fs.writeFileSync(asyncFile, '{bad json', 'utf8');
  const recoveredAsync = await readRuntimeJson<{ version: number; status: string }>(asyncFile);
  assert.equal(recoveredAsync.source, 'backup');
  assert.deepEqual(recoveredAsync.value, { version: 1, status: 'ok' });
  assert.equal(recoveredAsync.validationStatus, 'not_checked');

  await writeRuntimeJsonAtomic(asyncFile, { version: 3, status: 'valid' });
  await writeRuntimeJsonAtomic(asyncFile, { version: 4, status: 'backup-valid' });
  fs.writeFileSync(asyncFile, JSON.stringify({ status: 'missing-version' }), 'utf8');
  const schemaRecoveredAsync = await readRuntimeJson<{ version: number; status: string }>(
    asyncFile,
    (value) => typeof value.version === 'number' ? null : 'version must be a number',
  );
  assert.equal(schemaRecoveredAsync.source, 'backup');
  assert.equal(schemaRecoveredAsync.validationStatus, 'valid');
  assert.deepEqual(schemaRecoveredAsync.value, { version: 3, status: 'valid' });

  const missing = readRuntimeJsonSync(path.join(tempDir, 'missing.json'));
  assert.equal(missing.source, 'missing');
  assert.equal(missing.value, null);
  assert.equal(missing.validationStatus, 'not_checked');

  const missingWithValidator = readRuntimeJsonSync<{ version: number }>(
    path.join(tempDir, 'missing-with-validator.json'),
    (value) => typeof value.version === 'number' ? null : 'version must be a number',
  );
  assert.equal(missingWithValidator.source, 'missing');
  assert.equal(missingWithValidator.validationStatus, 'not_checked');

  const cleanupDir = path.join(tempDir, 'cleanup');
  fs.mkdirSync(cleanupDir, { recursive: true });
  const oldTemp = path.join(cleanupDir, 'state.json.tmp-123-456-abcdef');
  const youngTemp = path.join(cleanupDir, 'young.json.tmp-123-456-fedcba');
  const ignored = path.join(cleanupDir, 'state.json.tmp-not-a-runtime-file');
  fs.writeFileSync(oldTemp, '{}', 'utf8');
  fs.writeFileSync(youngTemp, '{}', 'utf8');
  fs.writeFileSync(ignored, '{}', 'utf8');
  const now = new Date('2026-06-19T12:00:00.000Z');
  const oldDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const youngDate = new Date(now.getTime() - 30 * 1000);
  fs.utimesSync(oldTemp, oldDate, oldDate);
  fs.utimesSync(youngTemp, youngDate, youngDate);
  fs.utimesSync(ignored, oldDate, oldDate);

  const previewCleanup = cleanupRuntimeJsonTempFilesSync({
    dirs: [cleanupDir],
    olderThanMs: 60 * 60 * 1000,
    now,
    dryRun: true,
  });
  assert.equal(previewCleanup.dryRun, true);
  assert.equal(previewCleanup.matched.length, 1);
  assert.equal(previewCleanup.matched[0].removed, false);
  assert.equal(fs.existsSync(oldTemp), true);
  assert.equal(fs.existsSync(youngTemp), true);
  assert.equal(fs.existsSync(ignored), true);

  const appliedCleanup = cleanupRuntimeJsonTempFilesSync({
    dirs: [cleanupDir],
    olderThanMs: 60 * 60 * 1000,
    now,
    dryRun: false,
  });
  assert.equal(appliedCleanup.removedCount, 1);
  assert.equal(fs.existsSync(oldTemp), false);
  assert.equal(fs.existsSync(youngTemp), true);
  assert.equal(fs.existsSync(ignored), true);

  const retrySyncFile = path.join(tempDir, 'retry-sync-state.json');
  const originalRenameSync = fs.renameSync;
  let syncRenameFailures = 0;
  fs.renameSync = ((oldPath: fs.PathLike, newPath: fs.PathLike) => {
    if (String(newPath) === retrySyncFile && syncRenameFailures < 2) {
      syncRenameFailures += 1;
      const error = new Error('simulated locked destination') as NodeJS.ErrnoException;
      error.code = 'EPERM';
      throw error;
    }
    return originalRenameSync(oldPath, newPath);
  }) as typeof fs.renameSync;
  try {
    writeRuntimeJsonAtomicSync(retrySyncFile, { version: 1, status: 'retried' });
  } finally {
    fs.renameSync = originalRenameSync;
  }
  assert.equal(syncRenameFailures, 2);
  assert.deepEqual(readRuntimeJsonSync(retrySyncFile).value, { version: 1, status: 'retried' });

  const retryAsyncFile = path.join(tempDir, 'retry-async-state.json');
  const originalRename = fs.promises.rename;
  let asyncRenameFailures = 0;
  fs.promises.rename = (async (oldPath: fs.PathLike, newPath: fs.PathLike) => {
    if (String(newPath) === retryAsyncFile && asyncRenameFailures < 2) {
      asyncRenameFailures += 1;
      const error = new Error('simulated locked destination') as NodeJS.ErrnoException;
      error.code = 'EBUSY';
      throw error;
    }
    return originalRename.call(fs.promises, oldPath, newPath);
  }) as typeof fs.promises.rename;
  try {
    await writeRuntimeJsonAtomic(retryAsyncFile, { version: 1, status: 'retried' });
  } finally {
    fs.promises.rename = originalRename;
  }
  assert.equal(asyncRenameFailures, 2);
  assert.deepEqual((await readRuntimeJson(retryAsyncFile)).value, { version: 1, status: 'retried' });
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('runtimeJson tests passed.');
