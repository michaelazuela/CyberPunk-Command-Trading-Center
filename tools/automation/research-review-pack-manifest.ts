import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

export interface LatestReviewPackManifestInput {
  reviewPackPath: string;
  pack: Pick<ResearchSampleReviewPack, 'generatedAt' | 'instrument' | 'concept' | 'selectedSampleCount'>;
  sourceAgent: string;
  manifestPath?: string;
  updatedAt?: string;
}

export interface LatestReviewPackManifest {
  reportType: 'latest_research_review_pack_manifest';
  packPath: string;
  packFile: string;
  generatedAt: string;
  instrument: string;
  session: string;
  scope: string;
  sampleCount: number;
  sourceAgent: string;
  reviewPackId: string;
  updatedAt: string;
}

export function buildLatestReviewPackManifest(input: LatestReviewPackManifestInput): LatestReviewPackManifest {
  const resolvedPackPath = path.resolve(input.reviewPackPath);
  const packPath = path.relative(process.cwd(), resolvedPackPath).replace(/\\/g, '/');
  const packFile = path.basename(resolvedPackPath);
  return {
    reportType: 'latest_research_review_pack_manifest',
    packPath,
    packFile,
    generatedAt: input.pack.generatedAt,
    instrument: input.pack.instrument,
    session: 'research-review',
    scope: String(input.pack.concept),
    sampleCount: input.pack.selectedSampleCount,
    sourceAgent: input.sourceAgent,
    reviewPackId: packFile.replace(/\.json$/i, ''),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

export function writeLatestReviewPackManifest(input: LatestReviewPackManifestInput): LatestReviewPackManifest {
  const manifest = buildLatestReviewPackManifest(input);
  const manifestPath = input.manifestPath || path.join(path.dirname(path.resolve(input.reviewPackPath)), 'latest-review-pack.json');
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}
