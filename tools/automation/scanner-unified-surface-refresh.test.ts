import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runScannerUnifiedSurfaceRefresh } from './scanner-unified-surface-refresh';
import { readUnifiedDeskOutputProductionScannerSurface } from './nt-scanner';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-unified-surface-refresh-'));
const runtimeSurfacePath = path.join(tempDir, '.unified-desk-output-production-scanner-surface.json');
const previousRuntimeSurface = {
  reportType: 'legacy_runtime_surface_fixture',
  status: 'stale',
  rows: [{ model: 'stale-model' }],
};

const dryRun = await runScannerUnifiedSurfaceRefresh({
  writeRuntimeSurface: false,
  runtimeSurfacePath,
  outDir: tempDir,
}, '2026-07-30T04:10:00.000Z');

assert.equal(dryRun.status, 'pass');
assert.equal(dryRun.mode, 'dry_run');
assert.equal(dryRun.runtimeSurfaceWritten, false);
assert.equal(dryRun.backupWritten, false);
assert.equal(dryRun.backupPath, null);
await assert.rejects(fs.stat(runtimeSurfacePath));

await fs.writeFile(runtimeSurfacePath, `${JSON.stringify(previousRuntimeSurface, null, 2)}\n`);

const writeRun = await runScannerUnifiedSurfaceRefresh({
  writeRuntimeSurface: true,
  runtimeSurfacePath,
  outDir: tempDir,
}, '2026-07-30T04:15:00.000Z');

assert.equal(writeRun.status, 'pass');
assert.equal(writeRun.mode, 'write_runtime_surface');
assert.equal(writeRun.runtimeSurfaceWritten, true);
assert.equal(writeRun.backupWritten, true);
assert.notEqual(writeRun.backupPath, null);

const backupContents = JSON.parse(await fs.readFile(writeRun.backupPath as string, 'utf8'));
assert.deepEqual(backupContents, previousRuntimeSurface);

const loadedSurface = await readUnifiedDeskOutputProductionScannerSurface(runtimeSurfacePath);
assert.notEqual(loadedSurface, null);
assert.equal(loadedSurface?.status, 'active');
assert.equal(loadedSurface?.summary.morningRows, 1);
assert.equal(loadedSurface?.summary.lunchRows, 1);
assert.equal(loadedSurface?.summary.discordPostRows, 0);
assert.equal(loadedSurface?.summary.supabaseWriteRows, 0);
assert.equal(loadedSurface?.summary.liveBridgeReadRows, 0);
assert.equal(loadedSurface?.summary.tradingLogicChangedRows, 0);
assert.equal(loadedSurface?.authority.postsDiscord, false);
assert.equal(loadedSurface?.authority.writesSupabase, false);
assert.equal(loadedSurface?.authority.readsLiveBridge, false);
assert.equal(loadedSurface?.authority.changesTradingLogic, false);
assert.equal(loadedSurface?.authority.changesCanExecute, false);
assert.equal(loadedSurface?.authority.canExecute, false);
assert.equal(loadedSurface?.authority.automatedOrders, false);

console.log('scanner unified surface refresh command verified.');
