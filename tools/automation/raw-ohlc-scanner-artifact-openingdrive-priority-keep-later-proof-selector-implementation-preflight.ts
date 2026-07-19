import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison';

interface CliOptions {
  dryRunComparison: string;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_implementation_preflight';
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
    reportDir: string;
    dryRunComparisonPath: string | null;
  };
  assumptions: {
    preflightOnly: true;
    noRuntimeAdapterInstalled: true;
    noLiveSelectorInstalled: true;
    requiresSeparateExplicitApprovalBeforeRuntimeChange: true;
    livePromotionAllowed: false;
  };
  summary: {
    dryRunStatus: string | null;
    dryRunRecommendation: string | null;
    changedSlates: number;
    sweepScopeRows: number;
    changedRowsGrossResolvedOneMesPl: number | null;
    invalidProposedRows: number;
    nonSweepChangedRows: number;
    missingOutcomeRows: number;
    blockedCarveoutRowsRemain: number;
    shouldPostRows: number;
    publishDiscordRows: number;
    canExecuteChangedRows: number;
    livePromotionAllowedRows: 0;
    implementationDraftEligible: boolean;
    runtimeInstallAllowed: false;
    recommendation:
      | 'draft_no_runtime_selector_adapter_contract_next'
      | 'keep_research_only'
      | 'fix_inputs';
  };
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const dryRunComparison = readFlag(args, '--dry-run-comparison') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison-\d+\.json$/);
  if (!dryRunComparison) throw new Error('--dry-run-comparison is required.');
  return {
    dryRunComparison: path.resolve(dryRunComparison),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Implementation Preflight',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only implementation preflight. It does not install selector behavior, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Dry-run status: ${report.summary.dryRunStatus ?? '-'}.`,
    `- Dry-run recommendation: ${report.summary.dryRunRecommendation ?? '-'}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Sweep-scope rows: ${report.summary.sweepScopeRows}.`,
    `- Changed rows gross one-MES P/L: ${report.summary.changedRowsGrossResolvedOneMesPl ?? 'not available'}.`,
    `- Invalid proposed rows: ${report.summary.invalidProposedRows}.`,
    `- Non-Sweep changed rows: ${report.summary.nonSweepChangedRows}.`,
    `- Missing outcome rows: ${report.summary.missingOutcomeRows}.`,
    `- Blocked carveout rows remain: ${report.summary.blockedCarveoutRowsRemain}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Implementation draft eligible: ${report.summary.implementationDraftEligible}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport(args: {
  dryRunComparisonPath: string | null;
  dryRunComparison: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport {
  const summary = args.dryRunComparison?.summary;
  const blockers = [
    !args.dryRunComparisonPath ? 'missing dry-run comparison path' : null,
    !args.dryRunComparison ? 'missing dry-run comparison report' : null,
    args.dryRunComparison && args.dryRunComparison.status !== 'pass' ? `dry-run comparison status ${args.dryRunComparison.status}` : null,
    summary && summary.recommendation !== 'dry_run_supports_sweep_only_guarded_selector_research' ? `dry-run recommendation is ${summary.recommendation}` : null,
    summary && summary.changedSlates <= 0 ? 'dry-run has no changed slates' : null,
    summary && summary.sweepScopeRows <= 0 ? 'dry-run has no Sweep-scope rows' : null,
    summary && summary.invalidProposedRows !== 0 ? `${summary.invalidProposedRows} invalid proposed rows` : null,
    summary && summary.nonSweepChangedRows !== 0 ? `${summary.nonSweepChangedRows} non-Sweep changed rows` : null,
    summary && summary.missingOutcomeRows !== 0 ? `${summary.missingOutcomeRows} changed rows missing outcome evidence` : null,
    summary && summary.blockedCarveoutRowsRemain !== 0 ? `${summary.blockedCarveoutRowsRemain} blocked carveout rows remain` : null,
    summary && summary.shouldPostRows !== 0 ? `${summary.shouldPostRows} shouldPost rows` : null,
    summary && summary.publishDiscordRows !== 0 ? `${summary.publishDiscordRows} publishDiscord rows` : null,
    summary && summary.canExecuteChangedRows !== 0 ? `${summary.canExecuteChangedRows} canExecute changed rows` : null,
    summary && summary.livePromotionAllowedRows !== 0 ? `${summary.livePromotionAllowedRows} live promotion rows` : null,
  ].filter((item): item is string => Boolean(item));
  const implementationDraftEligible = blockers.length === 0;
  const recommendation = blockers.length ? 'fix_inputs'
    : implementationDraftEligible ? 'draft_no_runtime_selector_adapter_contract_next'
      : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_implementation_preflight',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      dryRunComparisonPath: args.dryRunComparisonPath,
    },
    assumptions: {
      preflightOnly: true,
      noRuntimeAdapterInstalled: true,
      noLiveSelectorInstalled: true,
      requiresSeparateExplicitApprovalBeforeRuntimeChange: true,
      livePromotionAllowed: false,
    },
    summary: {
      dryRunStatus: args.dryRunComparison?.status || null,
      dryRunRecommendation: summary?.recommendation || null,
      changedSlates: summary?.changedSlates || 0,
      sweepScopeRows: summary?.sweepScopeRows || 0,
      changedRowsGrossResolvedOneMesPl: summary?.changedRowsGrossResolvedOneMesPl ?? null,
      invalidProposedRows: summary?.invalidProposedRows || 0,
      nonSweepChangedRows: summary?.nonSweepChangedRows || 0,
      missingOutcomeRows: summary?.missingOutcomeRows || 0,
      blockedCarveoutRowsRemain: summary?.blockedCarveoutRowsRemain || 0,
      shouldPostRows: summary?.shouldPostRows || 0,
      publishDiscordRows: summary?.publishDiscordRows || 0,
      canExecuteChangedRows: summary?.canExecuteChangedRows || 0,
      livePromotionAllowedRows: 0,
      implementationDraftEligible,
      runtimeInstallAllowed: false,
      recommendation,
    },
    blockers,
    recommendations: blockers.length
      ? ['Keep the guarded Sweep selector research-only until preflight blockers are cleared.']
      : ['Draft the no-runtime selector adapter contract next. Runtime install remains a separate explicit approval gate.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-implementation-preflight-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport({
    dryRunComparisonPath: options.dryRunComparison,
    dryRunComparison: fs.existsSync(options.dryRunComparison)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport>(options.dryRunComparison)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
