export interface LatestReviewPackManifest {
  reportType?: string;
  packPath?: string;
  packFile?: string;
  generatedAt?: string;
  instrument?: string;
  session?: string;
  scope?: string;
  sampleCount?: number;
  sourceAgent?: string;
  reviewPackId?: string;
  packId?: string;
  updatedAt?: string;
}

export interface DashboardReviewPackSource {
  reviewData: unknown | null;
  sourceLabel: string;
  selectedPackLabel: string;
  generatedAt: string | null;
  instrument: string | null;
  sampleCount: number | null;
  sourceAgent: string | null;
  reviewPackId: string | null;
  warnings: string[];
}

type ReviewPackModuleLoader = () => Promise<unknown>;

const defaultManifestModules = typeof import.meta.glob === 'function'
  ? import.meta.glob('../../tools/automation/research-review-packs/latest-review-pack.json', { eager: true, import: 'default' }) as Record<string, unknown>
  : {};
const defaultPackModuleLoaders = typeof import.meta.glob === 'function'
  ? import.meta.glob('../../tools/automation/research-review-packs/research-sample-review-*.json', { import: 'default' }) as Record<string, ReviewPackModuleLoader>
  : {};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function basename(value: string): string {
  const normalized = normalizePath(value);
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function firstModuleValue(modules: Record<string, unknown>): unknown | null {
  const firstKey = Object.keys(modules).sort()[0];
  return firstKey ? modules[firstKey] : null;
}

function validateManifest(value: unknown): { manifest: LatestReviewPackManifest | null; warnings: string[] } {
  const record = asRecord(value);
  if (!record) return { manifest: null, warnings: ['Latest review pack manifest is missing or malformed.'] };
  if (record.reportType && record.reportType !== 'latest_research_review_pack_manifest') {
    return { manifest: null, warnings: ['Latest review pack manifest has an unsupported reportType.'] };
  }
  const packPath = stringValue(record.packPath);
  const packFile = stringValue(record.packFile);
  if (!packPath && !packFile) {
    return { manifest: null, warnings: ['Latest review pack manifest does not identify a packPath or packFile.'] };
  }
  return {
    manifest: {
      reportType: stringValue(record.reportType) || undefined,
      packPath: packPath || undefined,
      packFile: packFile || undefined,
      generatedAt: stringValue(record.generatedAt) || undefined,
      instrument: stringValue(record.instrument) || undefined,
      session: stringValue(record.session) || undefined,
      scope: stringValue(record.scope) || undefined,
      sampleCount: numberValue(record.sampleCount) ?? undefined,
      sourceAgent: stringValue(record.sourceAgent) || undefined,
      reviewPackId: stringValue(record.reviewPackId) || undefined,
      packId: stringValue(record.packId) || undefined,
      updatedAt: stringValue(record.updatedAt) || undefined,
    },
    warnings: [],
  };
}

function findPackModule(packModules: Record<string, unknown>, manifest: LatestReviewPackManifest): { label: string; data: unknown | null } {
  const selected = manifest.packPath || manifest.packFile || '';
  const normalizedSelected = normalizePath(selected);
  const selectedBase = basename(normalizedSelected);
  for (const [modulePath, data] of Object.entries(packModules)) {
    const normalizedModulePath = normalizePath(modulePath);
    if (
      normalizedModulePath.endsWith(normalizedSelected) ||
      basename(normalizedModulePath) === selectedBase
    ) {
      return { label: normalizedSelected, data };
    }
  }
  return { label: normalizedSelected || 'No review pack selected', data: null };
}

async function findPackModuleFromLoaders(
  packModuleLoaders: Record<string, ReviewPackModuleLoader>,
  manifest: LatestReviewPackManifest,
): Promise<{ label: string; data: unknown | null }> {
  const selected = manifest.packPath || manifest.packFile || '';
  const normalizedSelected = normalizePath(selected);
  const selectedBase = basename(normalizedSelected);
  for (const [modulePath, loader] of Object.entries(packModuleLoaders)) {
    const normalizedModulePath = normalizePath(modulePath);
    if (
      normalizedModulePath.endsWith(normalizedSelected) ||
      basename(normalizedModulePath) === selectedBase
    ) {
      return { label: normalizedSelected, data: await loader() };
    }
  }
  return { label: normalizedSelected || 'No review pack selected', data: null };
}

function buildDashboardReviewPackSource(
  manifest: LatestReviewPackManifest,
  warnings: string[],
  selected: { label: string; data: unknown | null },
): DashboardReviewPackSource {
  const packRecord = asRecord(selected.data);
  const selectedWarnings = [...warnings];
  if (!selected.data) {
    selectedWarnings.push(`Selected review pack was not found by the dashboard bundle: ${selected.label}`);
  } else if (!packRecord || !Array.isArray(packRecord.samples)) {
    selectedWarnings.push(`Selected review pack is malformed or does not contain samples: ${selected.label}`);
  }

  return {
    reviewData: selected.data,
    sourceLabel: selected.label,
    selectedPackLabel: selected.label,
    generatedAt: manifest.generatedAt || stringValue(packRecord?.generatedAt),
    instrument: manifest.instrument || stringValue(packRecord?.instrument),
    sampleCount: manifest.sampleCount ?? (Array.isArray(packRecord?.samples) ? packRecord.samples.length : null),
    sourceAgent: manifest.sourceAgent || null,
    reviewPackId: manifest.reviewPackId || manifest.packId || null,
    warnings: selectedWarnings,
  };
}

export function resolveDashboardReviewPackSource(args: {
  manifest?: unknown;
  packModules?: Record<string, unknown>;
  manifestModules?: Record<string, unknown>;
} = {}): DashboardReviewPackSource {
  const manifestInput = args.manifest !== undefined
    ? args.manifest
    : firstModuleValue(args.manifestModules || defaultManifestModules);
  const { manifest, warnings } = validateManifest(manifestInput);
  if (!manifest) {
    return {
      reviewData: null,
      sourceLabel: 'Latest review pack manifest',
      selectedPackLabel: 'No review pack selected',
      generatedAt: null,
      instrument: null,
      sampleCount: null,
      sourceAgent: null,
      reviewPackId: null,
      warnings,
    };
  }

  const packModules = args.packModules || {};
  const selected = findPackModule(packModules, manifest);
  return buildDashboardReviewPackSource(manifest, warnings, selected);
}

export async function resolveDashboardReviewPackSourceAsync(args: {
  manifest?: unknown;
  packModules?: Record<string, unknown>;
  packModuleLoaders?: Record<string, ReviewPackModuleLoader>;
  manifestModules?: Record<string, unknown>;
} = {}): Promise<DashboardReviewPackSource> {
  const manifestInput = args.manifest !== undefined
    ? args.manifest
    : firstModuleValue(args.manifestModules || defaultManifestModules);
  const { manifest, warnings } = validateManifest(manifestInput);
  if (!manifest) {
    return {
      reviewData: null,
      sourceLabel: 'Latest review pack manifest',
      selectedPackLabel: 'No review pack selected',
      generatedAt: null,
      instrument: null,
      sampleCount: null,
      sourceAgent: null,
      reviewPackId: null,
      warnings,
    };
  }

  if (args.packModules) {
    return buildDashboardReviewPackSource(manifest, warnings, findPackModule(args.packModules, manifest));
  }

  const selected = await findPackModuleFromLoaders(args.packModuleLoaders || defaultPackModuleLoaders, manifest);
  return buildDashboardReviewPackSource(manifest, warnings, selected);
}
/// <reference types="vite/client" />
