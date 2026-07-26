import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-dry-run';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  dryRunPath: string | null;
  scannerPackageDir: string;
  outDir: string;
  json: boolean;
}

interface PackageSlate {
  slateId: string;
  tradeDate: string;
  session: string;
  direction: Direction | null;
  baselinePrimaryRowId: string | null;
  packageMatches: number;
  packageFiles: string[];
  executionStatusRows: number;
  blockReasonRows: number;
  invalidStopLocationRows: number;
  executableRows: number;
  conditionalRows: number;
  blockedRows: number;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_artifact_package_metadata_audit';
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
    dryRunPath: string | null;
    scannerPackageDir: string;
  };
  assumptions: {
    savedPackagesOnly: true;
    metadataAuditOnly: true;
    noRuntimeSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlatesFromDryRun: number;
    packageFilesRead: number;
    packageRowsMatched: number;
    changedSlatesCoveredByPackage: number;
    changedSlatesWithExecutionStatus: number;
    changedSlatesWithBlockReason: number;
    changedSlatesWithInvalidStopLocation: number;
    changedSlatesMissingPackageCoverage: number;
    exactRuntimeProposalReady: false;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'backfill_missing_raw_artifact_package_coverage'
      | 'do_not_install_runtime_missing_full_exact_coverage'
      | 'fix_missing_input_reports';
  };
  slates: PackageSlate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    dryRunPath: readFlag(args, '--dry-run') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-dry-run-\d+\.json$/),
    scannerPackageDir: readFlag(args, '--scanner-package-dir') || outDir,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport['authority'] {
  return {
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
  };
}

function scannerPackageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return scannerPackageFiles(fullPath);
    return entry.isFile() && entry.name.startsWith('raw-ohlc-scanner-artifacts-') && entry.name.endsWith('.json') ? [fullPath] : [];
  }).sort();
}

function directionFromRowId(rowId: string | null): Direction | null {
  if (!rowId) return null;
  if (rowId.includes('-LONG')) return 'LONG';
  if (rowId.includes('-SHORT')) return 'SHORT';
  return null;
}

function makeSlates(dryRun: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport | null): PackageSlate[] {
  return (dryRun?.slates || [])
    .filter((slate) => slate.topChanged && slate.baselinePrimaryInvalidStopSweep)
    .map((slate) => ({
      slateId: slate.slateId,
      tradeDate: slate.tradeDate,
      session: slate.session,
      direction: directionFromRowId(slate.baselinePrimaryRowId),
      baselinePrimaryRowId: slate.baselinePrimaryRowId,
      packageMatches: 0,
      packageFiles: [],
      executionStatusRows: 0,
      blockReasonRows: 0,
      invalidStopLocationRows: 0,
      executableRows: 0,
      conditionalRows: 0,
      blockedRows: 0,
    }));
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function eventsFromPackage(value: unknown): unknown[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const events = (value as { events?: unknown }).events;
  return events && typeof events === 'object' && !Array.isArray(events) ? Object.values(events) : [];
}

function candidatesFromEvent(value: unknown): unknown[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const event = value as { setupCandidateStatus?: { statuses?: unknown } };
  return Array.isArray(event.setupCandidateStatus?.statuses) ? event.setupCandidateStatus.statuses : [];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Scanner Artifact Package Metadata Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved raw scanner package audit. It does not run setupScanner, install ranking behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates from dry-run: ${report.summary.changedSlatesFromDryRun}.`,
    `- Package files read: ${report.summary.packageFilesRead}.`,
    `- Package rows matched: ${report.summary.packageRowsMatched}.`,
    `- Changed slates covered by package: ${report.summary.changedSlatesCoveredByPackage}.`,
    `- Changed slates with executionStatus: ${report.summary.changedSlatesWithExecutionStatus}.`,
    `- Changed slates with blockReason: ${report.summary.changedSlatesWithBlockReason}.`,
    `- Changed slates with InvalidStopLocation: ${report.summary.changedSlatesWithInvalidStopLocation}.`,
    `- Changed slates missing package coverage: ${report.summary.changedSlatesMissingPackageCoverage}.`,
    `- Exact runtime proposal ready: ${report.summary.exactRuntimeProposalReady}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Slates',
    '| Date | Session | Direction | Matches | Files | Exec Status | Block Reason | InvalidStopLocation |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.slates.map((slate) => `| ${slate.tradeDate} | ${slate.session} | ${slate.direction || '-'} | ${slate.packageMatches} | ${slate.packageFiles.length} | ${slate.executionStatusRows} | ${slate.blockReasonRows} | ${slate.invalidStopLocationRows} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport(args: {
  dryRunPath: string | null;
  dryRunReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport | null;
  scannerPackageDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport {
  const slates = makeSlates(args.dryRunReport);
  const files = scannerPackageFiles(args.scannerPackageDir);
  let packageRowsMatched = 0;
  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    } catch {
      continue;
    }
    for (const event of eventsFromPackage(parsed)) {
      const record = event as { date?: unknown; session?: unknown; eventTime?: unknown };
      for (const slate of slates) {
        if (text(record.date) !== slate.tradeDate || text(record.session) !== slate.session) continue;
        for (const candidateValue of candidatesFromEvent(event)) {
          if (!candidateValue || typeof candidateValue !== 'object' || Array.isArray(candidateValue)) continue;
          const candidate = candidateValue as Record<string, unknown>;
          if (text(candidate.setupType) !== 'NoInstalledSetup' || text(candidate.direction) !== slate.direction) continue;
          packageRowsMatched += 1;
          slate.packageMatches += 1;
          const fileName = path.basename(file);
          if (!slate.packageFiles.includes(fileName)) slate.packageFiles.push(fileName);
          const executionStatus = text(candidate.executionStatus);
          const blockReason = text(candidate.blockReason);
          if (executionStatus) slate.executionStatusRows += 1;
          if (blockReason) slate.blockReasonRows += 1;
          if (blockReason === 'InvalidStopLocation') slate.invalidStopLocationRows += 1;
          if (executionStatus === 'Executable') slate.executableRows += 1;
          if (executionStatus === 'Conditional') slate.conditionalRows += 1;
          if (executionStatus === 'Blocked') slate.blockedRows += 1;
        }
      }
    }
  }
  const changedSlatesCoveredByPackage = slates.filter((slate) => slate.packageMatches > 0).length;
  const changedSlatesWithExecutionStatus = slates.filter((slate) => slate.executionStatusRows > 0).length;
  const changedSlatesWithBlockReason = slates.filter((slate) => slate.blockReasonRows > 0).length;
  const changedSlatesWithInvalidStopLocation = slates.filter((slate) => slate.invalidStopLocationRows > 0).length;
  const changedSlatesMissingPackageCoverage = slates.length - changedSlatesCoveredByPackage;
  const blockers = [
    !args.dryRunPath ? 'missing dry-run path' : null,
    !args.dryRunReport ? 'missing dry-run report' : null,
    args.dryRunReport && args.dryRunReport.status !== 'pass' ? `dry-run status ${args.dryRunReport.status}` : null,
    slates.length === 0 ? 'dry-run has no changed invalid-stop Sweep primary slates' : null,
    files.length === 0 ? 'no raw scanner artifact package files found' : null,
    changedSlatesMissingPackageCoverage ? `${changedSlatesMissingPackageCoverage} changed slates are missing raw scanner package coverage` : null,
    changedSlatesWithInvalidStopLocation !== slates.length ? 'not every changed slate has package-level InvalidStopLocation proof' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport['summary']['recommendation'] = !args.dryRunPath || !args.dryRunReport || !files.length || !slates.length
    ? 'fix_missing_input_reports'
    : changedSlatesMissingPackageCoverage
      ? 'backfill_missing_raw_artifact_package_coverage'
      : 'do_not_install_runtime_missing_full_exact_coverage';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_artifact_package_metadata_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      dryRunPath: args.dryRunPath,
      scannerPackageDir: args.scannerPackageDir,
    },
    assumptions: {
      savedPackagesOnly: true,
      metadataAuditOnly: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlatesFromDryRun: slates.length,
      packageFilesRead: files.length,
      packageRowsMatched,
      changedSlatesCoveredByPackage,
      changedSlatesWithExecutionStatus,
      changedSlatesWithBlockReason,
      changedSlatesWithInvalidStopLocation,
      changedSlatesMissingPackageCoverage,
      exactRuntimeProposalReady: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates: slates.sort((a, b) => a.slateId.localeCompare(b.slateId)),
    blockers,
    recommendations: [
      'Do not install the runtime primary-selection exclusion until raw artifact package coverage exists for every changed slate and every excluded row has exact InvalidStopLocation proof.',
      'Next narrow phase should backfill/regenerate missing raw scanner artifact packages for the uncovered changed slates only.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport({
    dryRunPath: options.dryRunPath,
    dryRunReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport>(options.dryRunPath),
    scannerPackageDir: options.scannerPackageDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
