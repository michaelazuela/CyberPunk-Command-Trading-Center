import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { FIVE_MODEL_PRODUCTION_SURFACE_FILE } from './nt-scanner';
import { buildScannerProductionSurfaceRedundancyReport } from './scanner-production-surface-redundancy-report';
import { runScannerUnifiedSurfaceRefresh } from './scanner-unified-surface-refresh';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-surface-redundancy-'));
const tempFiveModelSurfacePath = path.join(tempDir, '.five-model-production-scanner-surface.json');
const tempUnifiedSurfacePath = path.join(tempDir, '.unified-desk-output-production-scanner-surface.json');

await fs.copyFile(FIVE_MODEL_PRODUCTION_SURFACE_FILE, tempFiveModelSurfacePath);

const beforeReport = await buildScannerProductionSurfaceRedundancyReport({
  unifiedSurfaceFile: tempUnifiedSurfacePath,
  fiveModelSurfaceFile: tempFiveModelSurfacePath,
});

assert.equal(beforeReport.status, 'five_model_surface_not_redundant');
assert.equal((beforeReport.summary as { unifiedSurfaceActive: boolean }).unifiedSurfaceActive, false);
assert.equal((beforeReport.summary as { fiveModelSurfaceActive: boolean }).fiveModelSurfaceActive, true);

const refresh = await runScannerUnifiedSurfaceRefresh({
  writeRuntimeSurface: true,
  runtimeSurfacePath: tempUnifiedSurfacePath,
  outDir: tempDir,
}, '2026-07-30T04:25:00.000Z');

assert.equal(refresh.status, 'pass');
assert.equal(refresh.runtimeSurfaceWritten, true);

const afterReport = await buildScannerProductionSurfaceRedundancyReport({
  unifiedSurfaceFile: tempUnifiedSurfacePath,
  fiveModelSurfaceFile: tempFiveModelSurfacePath,
});

assert.equal(afterReport.status, 'five_model_surface_redundant');
assert.equal((afterReport.summary as { unifiedSurfaceActive: boolean }).unifiedSurfaceActive, true);
assert.equal((afterReport.summary as { fiveModelSurfaceActive: boolean }).fiveModelSurfaceActive, true);
assert.equal((afterReport.summary as { fiveModelSurfaceRedundant: boolean }).fiveModelSurfaceRedundant, true);
assert.deepEqual((afterReport.blockers as { unifiedSurface: string[] }).unifiedSurface, []);
assert.deepEqual((afterReport.blockers as { fiveModelSurface: string[] }).fiveModelSurface, []);
assert.equal((afterReport.authority as { postsDiscord: boolean }).postsDiscord, false);
assert.equal((afterReport.authority as { writesSupabase: boolean }).writesSupabase, false);
assert.equal((afterReport.authority as { readsLiveBridge: boolean }).readsLiveBridge, false);

console.log('scanner production surface redundancy report verified.');
