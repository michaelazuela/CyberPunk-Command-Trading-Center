import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveDashboardReviewPackSource } from './reviewPackDashboardSource';
import { writeLatestReviewPackManifest } from '../../tools/automation/research-review-pack-manifest';

const pack = {
  reportType: 'research_sample_review_pack',
  generatedAt: '2026-05-31T01:00:00.000Z',
  instrument: 'MES',
  samples: [{ sampleId: 'sample-001' }],
};

const validManifest = {
  reportType: 'latest_research_review_pack_manifest',
  packPath: 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-31.json',
  packFile: 'research-sample-review-MES-all-2026-05-31.json',
  generatedAt: '2026-05-31T01:00:00.000Z',
  instrument: 'MES',
  sampleCount: 1,
  sourceAgent: 'researchSampleReviewAgent',
  reviewPackId: 'research-sample-review-MES-all-2026-05-31',
};

const resolved = resolveDashboardReviewPackSource({
  manifest: validManifest,
  packModules: {
    '../../tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-31.json': pack,
  },
});
assert.equal(resolved.reviewData, pack);
assert.equal(resolved.selectedPackLabel, validManifest.packPath);
assert.equal(resolved.instrument, 'MES');
assert.equal(resolved.sampleCount, 1);
assert.equal(resolved.sourceAgent, 'researchSampleReviewAgent');
assert.deepEqual(resolved.warnings, []);

const missingManifest = resolveDashboardReviewPackSource({ manifest: null, packModules: {} });
assert.equal(missingManifest.reviewData, null);
assert.ok(missingManifest.warnings.some((warning) => warning.includes('missing or malformed')));

const malformedManifest = resolveDashboardReviewPackSource({ manifest: { reportType: 'latest_research_review_pack_manifest' }, packModules: {} });
assert.equal(malformedManifest.reviewData, null);
assert.ok(malformedManifest.warnings.some((warning) => warning.includes('packPath or packFile')));

const missingPack = resolveDashboardReviewPackSource({ manifest: validManifest, packModules: {} });
assert.equal(missingPack.reviewData, null);
assert.ok(missingPack.warnings.some((warning) => warning.includes('was not found')));

const tempDir = mkdtempSync(path.join(tmpdir(), 'latest-review-pack-manifest-'));
try {
  const reviewPackPath = path.join(tempDir, 'research-sample-review-MES-all-2026-05-31.json');
  const manifest = writeLatestReviewPackManifest({
    reviewPackPath,
    pack: {
      generatedAt: '2026-05-31T01:00:00.000Z',
      instrument: 'MES',
      concept: 'all',
      selectedSampleCount: 3,
    },
    sourceAgent: 'researchSampleReviewAgent',
    updatedAt: '2026-05-31T01:05:00.000Z',
  });
  const written = JSON.parse(readFileSync(path.join(tempDir, 'latest-review-pack.json'), 'utf8'));
  assert.equal(written.reportType, 'latest_research_review_pack_manifest');
  assert.equal(written.packFile, 'research-sample-review-MES-all-2026-05-31.json');
  assert.equal(written.sampleCount, 3);
  assert.equal(written.sourceAgent, 'researchSampleReviewAgent');
  assert.equal(manifest.reviewPackId, 'research-sample-review-MES-all-2026-05-31');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('Review pack dashboard source resolver verified.');
