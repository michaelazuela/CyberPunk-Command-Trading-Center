import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type StaleArtifactClassification =
  | 'keep_canonical'
  | 'keep_regression_fixture'
  | 'keep_research_or_rag'
  | 'archive_legacy_generated'
  | 'delete_temp_backup'
  | 'review_required';

export type StaleArtifactAction = 'keep' | 'archive' | 'delete' | 'review';

export interface StaleArtifactCleanupOptions {
  rootDir: string;
  dryRun: boolean;
  apply: boolean;
  archiveDir: string;
  jsonOut?: string | null;
  sinceCurrentFormat: string;
}

export interface StaleArtifactInventoryItem {
  path: string;
  absolutePath: string;
  classification: StaleArtifactClassification;
  reason: string;
  lastModifiedTime: string;
  size: number;
  matchedRule: string;
  action: StaleArtifactAction;
  archivePath?: string | null;
}

export interface StaleArtifactArchiveManifestEntry {
  sourcePath: string;
  archivePath: string;
  classification: StaleArtifactClassification;
  reason: string;
  size: number;
  lastModifiedTime: string;
}

export interface StaleArtifactCleanupReport {
  reportType: 'stale_artifact_cleanup_inventory';
  generatedAt: string;
  authority: {
    dryRunDefault: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    deletesOnlyPerFileClassifiedArtifacts: true;
  };
  rootDir: string;
  mode: 'dry_run' | 'apply';
  sinceCurrentFormat: string;
  archiveDir: string;
  filesInspected: string[];
  counts: Record<StaleArtifactClassification, number>;
  actions: Record<StaleArtifactAction, number>;
  items: StaleArtifactInventoryItem[];
  archiveManifestPath: string | null;
  jsonOutPath: string | null;
  warnings: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_ARCHIVE_DIR = path.join(REPO_ROOT, 'tools', 'automation', 'stale-artifact-archive');
const DEFAULT_SINCE_CURRENT_FORMAT = '2026-06-28T00:00:00.000Z';

const CLASSIFICATIONS: StaleArtifactClassification[] = [
  'keep_canonical',
  'keep_regression_fixture',
  'keep_research_or_rag',
  'archive_legacy_generated',
  'delete_temp_backup',
  'review_required',
];

const ARTIFACT_ROOTS = [
  'tools/automation/discord-audit',
  'tools/automation/chart-markups',
  'tools/automation/diagnostic-reports',
  'tools/automation/live-desk-observer-reports',
  'tools/automation/replay-diagnostics',
  'logs/supervisor',
];

const PROTECTED_ROOTS = [
  'tests/fixtures',
  'src',
  'docs',
  'supabase',
];

const RESEARCH_OR_RAG_PATTERNS = [
  /^tools\/automation\/research-/i,
  /^tools\/automation\/.*rag/i,
  /^logs\/research/i,
  /^reports\/research/i,
];

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function isUnder(relativePath: string, root: string): boolean {
  return relativePath === root || relativePath.startsWith(`${root}/`);
}

function shouldSkipDir(relativePath: string): boolean {
  return relativePath === '.git' ||
    relativePath === 'node_modules' ||
    relativePath === 'dist' ||
    relativePath === 'coverage' ||
    relativePath.includes('/node_modules/') ||
    relativePath.includes('/stale-artifact-archive/');
}

function walkFiles(rootDir: string): string[] {
  const files: string[] = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    const relativeDir = normalizeRelative(rootDir, dir);
    if (relativeDir && shouldSkipDir(relativeDir)) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = normalizeRelative(rootDir, fullPath);
      if (entry.isDirectory()) {
        if (!shouldSkipDir(relative)) stack.push(fullPath);
        continue;
      }
      if (entry.isFile()) files.push(fullPath);
    }
  }
  return files.sort((a, b) => normalizeRelative(rootDir, a).localeCompare(normalizeRelative(rootDir, b)));
}

function isGeneratedArtifactPath(relativePath: string): boolean {
  return ARTIFACT_ROOTS.some((root) => isUnder(relativePath, root)) ||
    /^tools\/automation\/\.nt-scanner-state\.json(\.bak)?$/i.test(relativePath) ||
    /^tools\/automation\/\.market-data-gap-events\.json(\.bak)?$/i.test(relativePath);
}

function generatedArtifactRule(relativePath: string): string | null {
  if (/^tools\/automation\/discord-audit\/scanner-decision-tape-.+\.json$/i.test(relativePath)) return 'scanner-decision-tape';
  if (/^tools\/automation\/discord-audit\/discord-receipt-.+\.json$/i.test(relativePath)) return 'discord-receipt';
  if (/^tools\/automation\/discord-audit\/scanner-.+\.json$/i.test(relativePath)) return 'scanner-discord-audit';
  if (/^tools\/automation\/chart-markups\/.+\.(png|txt|html)$/i.test(relativePath)) return 'chart-markup-render';
  if (/^logs\/supervisor\/.+\.json$/i.test(relativePath)) return 'supervisor-generated-report';
  if (/^tools\/automation\/(diagnostic-reports|live-desk-observer-reports|replay-diagnostics)\/.+$/i.test(relativePath)) return 'automation-generated-report';
  if (/^tools\/automation\/\.[^/]+\.json$/i.test(relativePath)) return 'local-runtime-state';
  return null;
}

function isTempBackupArtifact(relativePath: string): boolean {
  return isGeneratedArtifactPath(relativePath) && /\.(bak|tmp|temp)$/i.test(relativePath);
}

function isProtectedCanonical(relativePath: string): boolean {
  return PROTECTED_ROOTS.some((root) => isUnder(relativePath, root)) ||
    /^package(-lock)?\.json$/i.test(relativePath) ||
    /^AGENTS\.md$/i.test(relativePath);
}

function isRegressionFixture(relativePath: string): boolean {
  return /\.test\.(ts|tsx|js|jsx)$/i.test(relativePath) ||
    /fixture|regression/i.test(relativePath) ||
    /^tools\/automation\/discord-alert-format\.test\.ts$/i.test(relativePath);
}

function isResearchOrRag(relativePath: string): boolean {
  return RESEARCH_OR_RAG_PATTERNS.some((pattern) => pattern.test(relativePath));
}

export function isCurrentProofEligibleArtifactPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return !(
    /\/stale-artifact-archive\//i.test(normalized) ||
    /\/archive\//i.test(normalized) ||
    /\/archived\//i.test(normalized) ||
    /\.legacy\./i.test(normalized) ||
    /\.bak$/i.test(normalized) ||
    /\.tmp$/i.test(normalized)
  );
}

function classify(relativePath: string, stat: fs.Stats, sinceMs: number): Omit<StaleArtifactInventoryItem, 'path' | 'absolutePath' | 'lastModifiedTime' | 'size' | 'archivePath'> {
  if (isProtectedCanonical(relativePath)) {
    return {
      classification: 'keep_canonical',
      reason: 'Source, docs, migrations, or canonical project files are protected from artifact cleanup.',
      matchedRule: 'protected-canonical-root',
      action: 'keep',
    };
  }
  if (isRegressionFixture(relativePath)) {
    return {
      classification: 'keep_regression_fixture',
      reason: 'Tests and regression fixtures are protected; they prove old bugs cannot return.',
      matchedRule: 'protected-regression-fixture',
      action: 'keep',
    };
  }
  if (isResearchOrRag(relativePath)) {
    return {
      classification: 'keep_research_or_rag',
      reason: 'Research and RAG records are learning artifacts and must not be purged by generated-artifact cleanup.',
      matchedRule: 'protected-research-rag',
      action: 'keep',
    };
  }
  if (isTempBackupArtifact(relativePath)) {
    return {
      classification: 'delete_temp_backup',
      reason: 'Generated temp/backup artifact under a known runtime artifact location.',
      matchedRule: 'generated-temp-backup',
      action: 'delete',
    };
  }
  const generatedRule = generatedArtifactRule(relativePath);
  if (generatedRule && stat.mtimeMs < sinceMs) {
    return {
      classification: 'archive_legacy_generated',
      reason: 'Generated artifact predates the current Discord/chart level-format contract and should not be used as current proof.',
      matchedRule: generatedRule,
      action: 'archive',
    };
  }
  if (generatedRule) {
    return {
      classification: 'review_required',
      reason: 'Generated artifact is current-format-age or runtime state; keep in place unless operator explicitly reviews it.',
      matchedRule: generatedRule,
      action: 'review',
    };
  }
  return {
    classification: 'review_required',
    reason: 'File is outside known generated-artifact cleanup rules.',
    matchedRule: 'unclassified',
    action: 'review',
  };
}

function archivePathFor(options: StaleArtifactCleanupOptions, relativePath: string): string {
  return path.join(options.archiveDir, relativePath);
}

function assertSafeActionPath(rootDir: string, filePath: string): void {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(filePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Refusing to act outside rootDir: ${resolvedPath}`);
  }
}

function ensureNoOverwrite(filePath: string): void {
  if (fs.existsSync(filePath)) throw new Error(`Refusing to overwrite existing archive file: ${filePath}`);
}

function renderMarkdown(report: Omit<StaleArtifactCleanupReport, 'markdown'>): string {
  return [
    '# Stale Artifact Cleanup Inventory',
    '',
    `Mode: ${report.mode}`,
    `Root: ${report.rootDir}`,
    `Since current format: ${report.sinceCurrentFormat}`,
    `Archive dir: ${report.archiveDir}`,
    '',
    'Authority: generated-artifact hygiene only. This does not post Discord, write Supabase, change scanner state, change trading logic, change canExecute, or change entry/stop/target math.',
    '',
    '## Counts',
    ...CLASSIFICATIONS.map((classification) => `- ${classification}: ${report.counts[classification]}`),
    '',
    '## Actions',
    `- keep: ${report.actions.keep}`,
    `- archive: ${report.actions.archive}`,
    `- delete: ${report.actions.delete}`,
    `- review: ${report.actions.review}`,
    '',
    '## Warnings',
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ['- None.']),
    '',
    '## Candidate Items',
    '| Action | Classification | File | Rule | Reason |',
    '| --- | --- | --- | --- | --- |',
    ...report.items.map((item) => `| ${item.action} | ${item.classification} | ${item.path} | ${item.matchedRule} | ${item.reason.replace(/\|/g, '\\|')} |`),
    '',
  ].join('\n');
}

export function buildStaleArtifactInventory(options: StaleArtifactCleanupOptions): StaleArtifactCleanupReport {
  const rootDir = path.resolve(options.rootDir);
  const sinceMs = Date.parse(options.sinceCurrentFormat);
  if (!Number.isFinite(sinceMs)) throw new Error(`Invalid --since-current-format: ${options.sinceCurrentFormat}`);
  const files = walkFiles(rootDir);
  const items = files.map((absolutePath) => {
    const stat = fs.statSync(absolutePath);
    const relative = normalizeRelative(rootDir, absolutePath);
    const base = classify(relative, stat, sinceMs);
    return {
      path: relative,
      absolutePath,
      ...base,
      lastModifiedTime: stat.mtime.toISOString(),
      size: stat.size,
      archivePath: base.action === 'archive' ? archivePathFor(options, relative) : null,
    };
  });
  const counts = Object.fromEntries(CLASSIFICATIONS.map((classification) => [
    classification,
    items.filter((item) => item.classification === classification).length,
  ])) as Record<StaleArtifactClassification, number>;
  const actions = {
    keep: items.filter((item) => item.action === 'keep').length,
    archive: items.filter((item) => item.action === 'archive').length,
    delete: items.filter((item) => item.action === 'delete').length,
    review: items.filter((item) => item.action === 'review').length,
  };
  const reportWithoutMarkdown: Omit<StaleArtifactCleanupReport, 'markdown'> = {
    reportType: 'stale_artifact_cleanup_inventory',
    generatedAt: new Date().toISOString(),
    authority: {
      dryRunDefault: true,
      postsDiscord: false,
      writesSupabase: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      deletesOnlyPerFileClassifiedArtifacts: true,
    },
    rootDir,
    mode: options.apply ? 'apply' : 'dry_run',
    sinceCurrentFormat: options.sinceCurrentFormat,
    archiveDir: path.resolve(options.archiveDir),
    filesInspected: files.map((filePath) => normalizeRelative(rootDir, filePath)),
    counts,
    actions,
    items,
    archiveManifestPath: null,
    jsonOutPath: options.jsonOut ? path.resolve(options.jsonOut) : null,
    warnings: [],
  };
  return { ...reportWithoutMarkdown, markdown: renderMarkdown(reportWithoutMarkdown) };
}

export function applyStaleArtifactCleanup(report: StaleArtifactCleanupReport): StaleArtifactCleanupReport {
  const manifestEntries: StaleArtifactArchiveManifestEntry[] = [];
  const warnings = [...report.warnings];
  for (const item of report.items) {
    if (item.action !== 'archive' && item.action !== 'delete') continue;
    assertSafeActionPath(report.rootDir, item.absolutePath);
    if (item.action === 'archive') {
      if (!item.archivePath) throw new Error(`Archive item missing archivePath: ${item.path}`);
      fs.mkdirSync(path.dirname(item.archivePath), { recursive: true });
      ensureNoOverwrite(item.archivePath);
      fs.renameSync(item.absolutePath, item.archivePath);
      manifestEntries.push({
        sourcePath: item.path,
        archivePath: path.relative(report.rootDir, item.archivePath).replace(/\\/g, '/'),
        classification: item.classification,
        reason: item.reason,
        size: item.size,
        lastModifiedTime: item.lastModifiedTime,
      });
    } else if (item.action === 'delete') {
      fs.unlinkSync(item.absolutePath);
    }
  }
  let archiveManifestPath: string | null = null;
  if (manifestEntries.length > 0) {
    fs.mkdirSync(report.archiveDir, { recursive: true });
    archiveManifestPath = path.join(report.archiveDir, `stale-artifact-archive-manifest-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    ensureNoOverwrite(archiveManifestPath);
    fs.writeFileSync(archiveManifestPath, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      rootDir: report.rootDir,
      authority: report.authority,
      entries: manifestEntries,
    }, null, 2)}\n`, 'utf8');
  } else if (report.actions.archive > 0) {
    warnings.push('Archive action was requested but no archive entries were moved.');
  }
  const updated: Omit<StaleArtifactCleanupReport, 'markdown'> = {
    ...report,
    archiveManifestPath,
    warnings,
  };
  return { ...updated, markdown: renderMarkdown(updated) };
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

export function parseStaleArtifactCleanupArgs(args = process.argv.slice(2)): StaleArtifactCleanupOptions {
  const apply = args.includes('--apply');
  return {
    rootDir: path.resolve(readFlag(args, '--root') || REPO_ROOT),
    dryRun: !apply,
    apply,
    archiveDir: path.resolve(readFlag(args, '--archive-dir') || DEFAULT_ARCHIVE_DIR),
    jsonOut: readFlag(args, '--json-out'),
    sinceCurrentFormat: readFlag(args, '--since-current-format') || DEFAULT_SINCE_CURRENT_FORMAT,
  };
}

function writeJsonOut(report: StaleArtifactCleanupReport): void {
  if (!report.jsonOutPath) return;
  fs.mkdirSync(path.dirname(report.jsonOutPath), { recursive: true });
  fs.writeFileSync(report.jsonOutPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(): Promise<void> {
  const options = parseStaleArtifactCleanupArgs();
  let report = buildStaleArtifactInventory(options);
  if (options.apply) report = applyStaleArtifactCleanup(report);
  writeJsonOut(report);
  if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else console.log(report.markdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
