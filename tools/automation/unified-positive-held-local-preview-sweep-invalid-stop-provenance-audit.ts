import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package';

interface CliOptions {
  exactProofPackagePath: string | null;
  scannerPackageDir: string;
  sourceFile: string;
  outDir: string;
  json: boolean;
}

interface SourcePackageMetadata {
  file: string;
  generatedAt: string | null;
  reportType: string | null;
}

export interface UnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport {
  reportType: 'unified_positive_held_local_preview_sweep_invalid_stop_provenance_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    exactProofPackagePath: string | null;
    scannerPackageDir: string;
    sourceFile: string;
  };
  assumptions: {
    provenanceOnly: true;
    currentSourceInspectionOnly: true;
    noRuntimeSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    exactProofRows: number;
    rowsWithStopMissing: number;
    rowsWithDirectionallyInvalidStopGeometry: number;
    sourcePackageFiles: number;
    sourcePackageFirstGeneratedAt: string | null;
    sourcePackageLastGeneratedAt: string | null;
    currentSourceLatestCommit: string | null;
    currentSourceLatestCommitDate: string | null;
    currentSourceHasDetectIctModelOne: boolean;
    currentSourceRequiresSweepExtreme: boolean;
    currentSourceComputesDirectionalStop: boolean;
    currentSourceRequiresTargets: boolean;
    currentSourceHasMakeCandidateDirectionalGuard: boolean;
    currentSourceCanReturnMissingStopIctModelOne: boolean;
    currentSourceCanReturnWrongSideStopIctModelOne: boolean;
    runtimeFixJustified: false;
    recommendation: 'close_runtime_filter_and_refresh_replay_packages' | 'investigate_current_builder_reproduction' | 'fix_missing_input_reports';
  };
  sourcePackages: SourcePackageMetadata[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SOURCE_FILE = path.join(ROOT_DIR, 'src/lib/conditionalPlanBuilder.ts');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    exactProofPackagePath: readFlag(args, '--exact-proof-package') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package-\d+\.json$/),
    scannerPackageDir: readFlag(args, '--scanner-package-dir') || outDir,
    sourceFile: readFlag(args, '--source-file') || DEFAULT_SOURCE_FILE,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function generatedAtForPackage(scannerPackageDir: string, file: string): SourcePackageMetadata {
  const fullPath = path.join(scannerPackageDir, file);
  if (!fs.existsSync(fullPath)) return { file, generatedAt: null, reportType: null };
  try {
    const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8')) as { generatedAt?: unknown; reportType?: unknown };
    return {
      file,
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      reportType: typeof parsed.reportType === 'string' ? parsed.reportType : null,
    };
  } catch {
    return { file, generatedAt: null, reportType: null };
  }
}

function gitLatestForSource(sourceFile: string): { hash: string | null; date: string | null } {
  try {
    const relative = path.relative(ROOT_DIR, sourceFile);
    const output = execFileSync('git', ['log', '-1', '--format=%H|%cI', '--', relative], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const [hash, date] = output.split('|');
    return { hash: hash || null, date: date || null };
  } catch {
    return { hash: null, date: null };
  }
}

function sourceGuardSummary(sourceText: string): Pick<
  UnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport['summary'],
  | 'currentSourceHasDetectIctModelOne'
  | 'currentSourceRequiresSweepExtreme'
  | 'currentSourceComputesDirectionalStop'
  | 'currentSourceRequiresTargets'
  | 'currentSourceHasMakeCandidateDirectionalGuard'
  | 'currentSourceCanReturnMissingStopIctModelOne'
  | 'currentSourceCanReturnWrongSideStopIctModelOne'
> {
  const currentSourceHasDetectIctModelOne = /function\s+detectIctModelOne/.test(sourceText);
  const currentSourceRequiresSweepExtreme = /if\s*\(\s*!isPrice\(sweepExtreme\)\s*\)\s*continue;/.test(sourceText);
  const currentSourceComputesDirectionalStop = /const\s+stop\s*=\s*direction\s*===\s*'LONG'[\s\S]*?roundToTick\(sweepExtreme\s*-\s*tick\)[\s\S]*?roundToTick\(sweepExtreme\s*\+\s*tick\)/.test(sourceText);
  const currentSourceRequiresTargets = /const\s+appTargets\s*=\s*targetsFromEntryStop\(direction,\s*entry,\s*stop\);[\s\S]*?if\s*\(\s*!isPrice\(appTargets\.target1\)\s*\|\|\s*!isPrice\(appTargets\.target2\)\s*\)\s*continue;/.test(sourceText);
  const currentSourceHasMakeCandidateDirectionalGuard = /const\s+stopIsDirectionallyValid\s*=\s*hasDirectionallyValidStop\(input\.direction,\s*input\.entry,\s*structureStop\);[\s\S]*?stopIsDirectionallyValid\s*\?\s*input\.target1Override/.test(sourceText);
  return {
    currentSourceHasDetectIctModelOne,
    currentSourceRequiresSweepExtreme,
    currentSourceComputesDirectionalStop,
    currentSourceRequiresTargets,
    currentSourceHasMakeCandidateDirectionalGuard,
    currentSourceCanReturnMissingStopIctModelOne: !(
      currentSourceHasDetectIctModelOne &&
      currentSourceRequiresSweepExtreme &&
      currentSourceComputesDirectionalStop &&
      currentSourceRequiresTargets
    ),
    currentSourceCanReturnWrongSideStopIctModelOne: !(currentSourceComputesDirectionalStop && currentSourceHasMakeCandidateDirectionalGuard),
  };
}

function directionallyInvalid(row: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport['rows'][number]): boolean {
  if (row.entry === null || row.stop === null) return false;
  if (row.direction === 'LONG') return row.stop >= row.entry;
  if (row.direction === 'SHORT') return row.stop <= row.entry;
  return false;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport, 'markdown'>): string {
  return [
    '# Sweep Invalid-Stop Provenance Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only provenance audit. It does not run setupScanner, install runtime selection behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Exact proof rows: ${report.summary.exactProofRows}.`,
    `- Rows with missing stop: ${report.summary.rowsWithStopMissing}.`,
    `- Rows with directionally invalid stop: ${report.summary.rowsWithDirectionallyInvalidStopGeometry}.`,
    `- Source package files: ${report.summary.sourcePackageFiles}.`,
    `- Source package generatedAt range: ${report.summary.sourcePackageFirstGeneratedAt || '-'} to ${report.summary.sourcePackageLastGeneratedAt || '-'}.`,
    `- Current source latest commit: ${report.summary.currentSourceLatestCommit || '-'} at ${report.summary.currentSourceLatestCommitDate || '-'}.`,
    `- Current source has detectIctModelOne: ${report.summary.currentSourceHasDetectIctModelOne}.`,
    `- Current source requires sweep extreme: ${report.summary.currentSourceRequiresSweepExtreme}.`,
    `- Current source computes directional stop: ${report.summary.currentSourceComputesDirectionalStop}.`,
    `- Current source requires app targets: ${report.summary.currentSourceRequiresTargets}.`,
    `- Current source has makeCandidate directional guard: ${report.summary.currentSourceHasMakeCandidateDirectionalGuard}.`,
    `- Current source can return missing-stop ICT Model 1: ${report.summary.currentSourceCanReturnMissingStopIctModelOne}.`,
    `- Current source can return wrong-side-stop ICT Model 1: ${report.summary.currentSourceCanReturnWrongSideStopIctModelOne}.`,
    `- Runtime fix justified: ${report.summary.runtimeFixJustified}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport(args: {
  exactProofPackagePath: string | null;
  exactProofPackageReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport | null;
  scannerPackageDir: string;
  sourceFile: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport {
  const rows = args.exactProofPackageReport?.rows || [];
  const sourcePackages = [...new Set(rows.flatMap((row) => row.sourceFiles || []))]
    .sort()
    .map((file) => generatedAtForPackage(args.scannerPackageDir, file));
  const packageDates = sourcePackages.map((item) => item.generatedAt).filter((item): item is string => Boolean(item)).sort();
  const sourceText = fs.existsSync(args.sourceFile) ? fs.readFileSync(args.sourceFile, 'utf8') : '';
  const guardSummary = sourceGuardSummary(sourceText);
  const git = gitLatestForSource(args.sourceFile);
  const blockers = [
    !args.exactProofPackagePath ? 'missing exact proof package path' : null,
    !args.exactProofPackageReport ? 'missing exact proof package report' : null,
    rows.length === 0 ? 'exact proof package has no rows' : null,
    !fs.existsSync(args.sourceFile) ? 'conditionalPlanBuilder source file is missing' : null,
  ].filter((item): item is string => Boolean(item));
  const currentBuilderLooksGuarded = guardSummary.currentSourceHasDetectIctModelOne &&
    guardSummary.currentSourceRequiresSweepExtreme &&
    guardSummary.currentSourceComputesDirectionalStop &&
    guardSummary.currentSourceRequiresTargets &&
    guardSummary.currentSourceHasMakeCandidateDirectionalGuard;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_invalid_stop_provenance_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
    },
    source: {
      exactProofPackagePath: args.exactProofPackagePath,
      scannerPackageDir: args.scannerPackageDir,
      sourceFile: args.sourceFile,
    },
    assumptions: {
      provenanceOnly: true,
      currentSourceInspectionOnly: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      exactProofRows: rows.length,
      rowsWithStopMissing: rows.filter((row) => row.stop === null).length,
      rowsWithDirectionallyInvalidStopGeometry: rows.filter(directionallyInvalid).length,
      sourcePackageFiles: sourcePackages.length,
      sourcePackageFirstGeneratedAt: packageDates[0] || null,
      sourcePackageLastGeneratedAt: packageDates.at(-1) || null,
      currentSourceLatestCommit: git.hash,
      currentSourceLatestCommitDate: git.date,
      ...guardSummary,
      runtimeFixJustified: false,
      recommendation: blockers.length
        ? 'fix_missing_input_reports'
        : currentBuilderLooksGuarded
          ? 'close_runtime_filter_and_refresh_replay_packages'
          : 'investigate_current_builder_reproduction',
    },
    sourcePackages,
    blockers,
    recommendations: [
      currentBuilderLooksGuarded
        ? 'Do not change conditionalPlanBuilder from this evidence alone; current ICT Model 1 source requires sweep extreme, directional stop, and app targets before returning a candidate.'
        : 'Current source guard signatures are incomplete; reproduce through current buildConditionalPlans before any fix.',
      'Treat saved invalid-stop Sweep rows as package/provenance evidence until a current-code reproduction proves otherwise.',
      'Refresh replay/raw scanner packages before any runtime filter, rank change, or source-geometry code change is proposed.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport(report: UnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-invalid-stop-provenance-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-invalid-stop-provenance-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport({
    exactProofPackagePath: options.exactProofPackagePath,
    exactProofPackageReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport>(options.exactProofPackagePath),
    scannerPackageDir: options.scannerPackageDir,
    sourceFile: options.sourceFile,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepInvalidStopProvenanceAuditReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
