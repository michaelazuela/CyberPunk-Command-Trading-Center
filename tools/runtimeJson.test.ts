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
  });

  writeRuntimeJsonAtomicSync(syncFile, { version: 2, status: 'updated' });
  assert.deepEqual(readRuntimeJsonSync(`${syncFile}.bak`).value, { version: 1, status: 'ok' });
  fs.writeFileSync(syncFile, '{bad json', 'utf8');
  const recoveredSync = readRuntimeJsonSync<{ version: number; status: string }>(syncFile);
  assert.equal(recoveredSync.source, 'backup');
  assert.deepEqual(recoveredSync.value, { version: 1, status: 'ok' });

  const asyncFile = path.join(tempDir, 'async-state.json');
  await writeRuntimeJsonAtomic(asyncFile, { version: 1, status: 'ok' });
  await writeRuntimeJsonAtomic(asyncFile, { version: 2, status: 'updated' });
  fs.writeFileSync(asyncFile, '{bad json', 'utf8');
  const recoveredAsync = await readRuntimeJson<{ version: number; status: string }>(asyncFile);
  assert.equal(recoveredAsync.source, 'backup');
  assert.deepEqual(recoveredAsync.value, { version: 1, status: 'ok' });

  const missing = readRuntimeJsonSync(path.join(tempDir, 'missing.json'));
  assert.equal(missing.source, 'missing');
  assert.equal(missing.value, null);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('runtimeJson tests passed.');
