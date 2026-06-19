import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
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
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('runtimeJson tests passed.');
