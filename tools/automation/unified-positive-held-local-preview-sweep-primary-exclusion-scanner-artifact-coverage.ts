import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-dry-run';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  dryRunPath: string | null;
  scannerReportDir: string;
  outDir: string;
  json: boolean;
}

interface ScannerMatch {
  file: string;
  ticketId: string | null;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  hasGeometry: boolean;
  directionallyInvalidStop: boolean;
  hasInvalidStopBlockReason: boolean;
  hasExecutionStatus: boolean;
  outcomeStatus: string | null;
  outcomeLabel: string | null;
}

interface SlateCoverage {
  slateId: string;
  tradeDate: string;
  session: string;
  baselinePrimaryRowId: string | null;
  baselineDirection: Direction | null;
  scannerMatches: number;
  files: string[];
  geometryRows: number;
  directionallyInvalidStopRows: number;
  invalidStopBlockReasonRows: number;
  executionStatusRows: number;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_artifact_coverage';
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
    scannerReportDir: string;
  };
  assumptions: {
    savedReportsOnly: true;
    coverageAuditOnly: true;
    scannerArtifactsMustCarryTheirOwnProof: true;
    noRuntimeSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlatesFromDryRun: number;
    scannerArtifactsRead: number;
    scannerRowsMatched: number;
    changedSlatesCovered: number;
    changedSlatesWithGeometry: number;
    changedSlatesWithDirectionallyInvalidStop: number;
    changedSlatesWithInvalidStopBlockReason: number;
    changedSlatesWithExecutionStatus: number;
    exactRuntimeProposalReady: false;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'do_not_install_runtime_missing_scanner_proof'
      | 'fix_missing_input_reports';
  };
  slates: SlateCoverage[];
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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const dryRunPath = readFlag(args, '--dry-run') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-dry-run-\d+\.json$/);
  return {
    dryRunPath,
    scannerReportDir: readFlag(args, '--scanner-report-dir') || outDir,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport['authority'] {
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

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDirection(value: unknown): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasText(value: unknown, pattern: RegExp): boolean {
  if (typeof value === 'string') return pattern.test(value);
  if (Array.isArray(value)) return value.some((item) => hasText(item, pattern));
  if (value && typeof value === 'object') return Object.values(value).some((item) => hasText(item, pattern));
  return false;
}

function scanArrays(value: unknown, output: unknown[][] = []): unknown[][] {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    if (value.some((item) => item && typeof item === 'object' && !Array.isArray(item))) output.push(value);
    return output;
  }
  for (const child of Object.values(value)) scanArrays(child, output);
  return output;
}

function scannerFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const direct = fs.readdirSync(dir, { withFileTypes: true });
  return direct.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return scannerFiles(fullPath);
    return entry.isFile() && entry.name.startsWith('raw-ohlc-scanner-artifact-') && entry.name.endsWith('.json')
      ? [fullPath]
      : [];
  }).sort();
}

function baselineDirection(rowId: string | null): Direction | null {
  if (!rowId) return null;
  if (rowId.includes('-LONG')) return 'LONG';
  if (rowId.includes('-SHORT')) return 'SHORT';
  return null;
}

function matchesSlate(row: Record<string, unknown>, slate: SlateCoverage): boolean {
  const tradeDate = stringValue(row.tradeDate) || stringValue(row.date) || stringValue(row.ticketId)?.slice(0, 10) || null;
  const session = stringValue(row.session);
  const setupType = stringValue(row.setupType);
  const direction = normalizeDirection(row.direction);
  return tradeDate === slate.tradeDate &&
    session === slate.session &&
    setupType === 'NoInstalledSetup' &&
    direction === slate.baselineDirection;
}

function toScannerMatch(filePath: string, row: Record<string, unknown>): ScannerMatch | null {
  const tradeDate = stringValue(row.tradeDate) || stringValue(row.date) || stringValue(row.ticketId)?.slice(0, 10) || null;
  const session = stringValue(row.session);
  const setupType = stringValue(row.setupType);
  const direction = normalizeDirection(row.direction);
  if (!tradeDate || !session || setupType !== 'NoInstalledSetup' || !direction) return null;
  const entry = finiteNumber(row.entry);
  const stop = finiteNumber(row.stop);
  const hasGeometry = entry !== null && stop !== null;
  return {
    file: path.basename(filePath),
    ticketId: stringValue(row.ticketId),
    tradeDate,
    session,
    setupType,
    direction,
    entry,
    stop,
    riskPoints: finiteNumber(row.riskPoints),
    hasGeometry,
    directionallyInvalidStop: hasGeometry && (direction === 'LONG' ? stop >= entry : stop <= entry),
    hasInvalidStopBlockReason: hasText(row, /InvalidStopLocation|invalid[_ -]?stop/i),
    hasExecutionStatus: Object.prototype.hasOwnProperty.call(row, 'executionStatus'),
    outcomeStatus: stringValue(row.outcomeStatus),
    outcomeLabel: stringValue(row.outcomeLabel),
  };
}

function buildSlateCoverage(dryRun: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport | null): SlateCoverage[] {
  return (dryRun?.slates || [])
    .filter((slate) => slate.topChanged && slate.baselinePrimaryInvalidStopSweep)
    .map((slate) => ({
      slateId: slate.slateId,
      tradeDate: slate.tradeDate,
      session: slate.session,
      baselinePrimaryRowId: slate.baselinePrimaryRowId,
      baselineDirection: baselineDirection(slate.baselinePrimaryRowId),
      scannerMatches: 0,
      files: [],
      geometryRows: 0,
      directionallyInvalidStopRows: 0,
      invalidStopBlockReasonRows: 0,
      executionStatusRows: 0,
    }));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Scanner Artifact Coverage',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved scanner-artifact coverage audit. It does not install runtime ranking, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates from dry-run: ${report.summary.changedSlatesFromDryRun}.`,
    `- Scanner artifacts read: ${report.summary.scannerArtifactsRead}.`,
    `- Scanner rows matched: ${report.summary.scannerRowsMatched}.`,
    `- Changed slates covered: ${report.summary.changedSlatesCovered}.`,
    `- Changed slates with geometry: ${report.summary.changedSlatesWithGeometry}.`,
    `- Changed slates with directionally invalid stop: ${report.summary.changedSlatesWithDirectionallyInvalidStop}.`,
    `- Changed slates with InvalidStopLocation/block-reason proof: ${report.summary.changedSlatesWithInvalidStopBlockReason}.`,
    `- Changed slates with executionStatus field: ${report.summary.changedSlatesWithExecutionStatus}.`,
    `- Exact runtime proposal ready: ${report.summary.exactRuntimeProposalReady}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Slate Coverage',
    '| Date | Session | Baseline Primary | Matches | Files | Geometry | Invalid Stop Geometry | Invalid Stop Reason | Execution Status |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|',
    ...report.slates.map((slate) => `| ${slate.tradeDate} | ${slate.session} | ${slate.baselinePrimaryRowId || '-'} | ${slate.scannerMatches} | ${slate.files.length} | ${slate.geometryRows} | ${slate.directionallyInvalidStopRows} | ${slate.invalidStopBlockReasonRows} | ${slate.executionStatusRows} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport(args: {
  dryRunPath: string | null;
  dryRunReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport | null;
  scannerReportDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport {
  const slates = buildSlateCoverage(args.dryRunReport);
  const files = scannerFiles(args.scannerReportDir);
  let scannerRowsMatched = 0;
  for (const file of files) {
    let report: unknown;
    try {
      report = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    } catch {
      continue;
    }
    for (const array of scanArrays(report)) {
      for (const item of array) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const row = item as Record<string, unknown>;
        for (const slate of slates) {
          if (!matchesSlate(row, slate)) continue;
          const match = toScannerMatch(file, row);
          if (!match) continue;
          scannerRowsMatched += 1;
          slate.scannerMatches += 1;
          if (!slate.files.includes(match.file)) slate.files.push(match.file);
          if (match.hasGeometry) slate.geometryRows += 1;
          if (match.directionallyInvalidStop) slate.directionallyInvalidStopRows += 1;
          if (match.hasInvalidStopBlockReason) slate.invalidStopBlockReasonRows += 1;
          if (match.hasExecutionStatus) slate.executionStatusRows += 1;
        }
      }
    }
  }
  const changedSlatesCovered = slates.filter((slate) => slate.scannerMatches > 0).length;
  const changedSlatesWithGeometry = slates.filter((slate) => slate.geometryRows > 0).length;
  const changedSlatesWithDirectionallyInvalidStop = slates.filter((slate) => slate.directionallyInvalidStopRows > 0).length;
  const changedSlatesWithInvalidStopBlockReason = slates.filter((slate) => slate.invalidStopBlockReasonRows > 0).length;
  const changedSlatesWithExecutionStatus = slates.filter((slate) => slate.executionStatusRows > 0).length;
  const blockers = [
    !args.dryRunPath ? 'missing dry-run path' : null,
    !args.dryRunReport ? 'missing dry-run report' : null,
    args.dryRunReport && args.dryRunReport.status !== 'pass' ? `dry-run status ${args.dryRunReport.status}` : null,
    slates.length === 0 ? 'dry-run has no changed invalid-stop Sweep primary slates' : null,
    files.length === 0 ? 'no raw scanner artifact reports found' : null,
    changedSlatesCovered !== slates.length ? `${slates.length - changedSlatesCovered} changed slates have no scanner artifact coverage` : null,
    changedSlatesWithInvalidStopBlockReason !== slates.length ? 'raw scanner artifacts do not carry exact InvalidStopLocation proof for every changed slate' : null,
    changedSlatesWithExecutionStatus !== slates.length ? 'raw scanner artifacts do not carry executionStatus for every changed slate' : null,
  ].filter((item): item is string => Boolean(item));
  const inputBlockers = blockers.some((blocker) => blocker.includes('missing') || blocker.includes('status') || blocker.includes('no raw scanner'));
  const recommendation: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport['summary']['recommendation'] = inputBlockers
    ? 'fix_missing_input_reports'
    : 'do_not_install_runtime_missing_scanner_proof';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_scanner_artifact_coverage',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      dryRunPath: args.dryRunPath,
      scannerReportDir: args.scannerReportDir,
    },
    assumptions: {
      savedReportsOnly: true,
      coverageAuditOnly: true,
      scannerArtifactsMustCarryTheirOwnProof: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlatesFromDryRun: slates.length,
      scannerArtifactsRead: files.length,
      scannerRowsMatched,
      changedSlatesCovered,
      changedSlatesWithGeometry,
      changedSlatesWithDirectionallyInvalidStop,
      changedSlatesWithInvalidStopBlockReason,
      changedSlatesWithExecutionStatus,
      exactRuntimeProposalReady: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates: slates.sort((a, b) => a.slateId.localeCompare(b.slateId)),
    blockers,
    recommendations: [
      'Do not install the primary-selection exclusion in runtime yet; saved scanner artifacts must expose the exact InvalidStopLocation/executionStatus proof first.',
      'Next narrow fix should add scanner-output metadata capture for blocked reason and execution status, audit-only, without changing ranking or trade math.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-coverage-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-coverage-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport({
    dryRunPath: options.dryRunPath,
    dryRunReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport>(options.dryRunPath),
    scannerReportDir: options.scannerReportDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactCoverageReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
