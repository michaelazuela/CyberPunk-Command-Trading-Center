import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface CliOptions {
  setupScannerPath: string;
  typesPath: string;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_population_preflight';
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
    setupScannerPath: string;
    typesPath: string;
  };
  summary: {
    setupCandidateProofSelectionSignalFieldExists: boolean;
    setupCandidateTopLevelCompletedBarTimeExists: boolean;
    setupScannerBuilderExists: boolean;
    setupScannerBuilderExported: boolean;
    setupScannerPopulatesProofSelectionSignalInScanOutput: boolean;
    chartContextTimestampFieldExists: boolean;
    timeframeMssEvidenceTimestampFieldExists: boolean;
    safePopulationSourceAvailableForPreflight: boolean;
    scannerVisiblePopulationAllowedByThisReport: false;
    recommendation: 'draft_scanner_output_population_dry_run_next' | 'fix_inputs';
  };
  blockers: string[];
  notes: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    setupScannerPath: path.resolve(readFlag(args, '--setup-scanner') || path.join(REPO_ROOT, 'src', 'lib', 'setupScanner.ts')),
    typesPath: path.resolve(readFlag(args, '--types') || path.join(REPO_ROOT, 'src', 'types.ts')),
    outDir: path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR),
    json: args.includes('--json'),
  };
}

function extractInterfaceBlock(sourceText: string, interfaceName: string): string {
  const match = new RegExp(`export\\s+interface\\s+${interfaceName}\\b`).exec(sourceText);
  const start = match?.index ?? -1;
  if (start < 0) return '';
  const nextInterface = sourceText.indexOf('\nexport interface ', start + match![0].length);
  return sourceText.slice(start, nextInterface >= 0 ? nextInterface : undefined);
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Population Preflight',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source inspection. It does not run setupScanner, populate live candidates, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- SetupCandidate proofSelectionSignal field exists: ${report.summary.setupCandidateProofSelectionSignalFieldExists}.`,
    `- SetupCandidate top-level completedBarTime exists: ${report.summary.setupCandidateTopLevelCompletedBarTimeExists}.`,
    `- setupScanner builder exists/exported: ${report.summary.setupScannerBuilderExists}/${report.summary.setupScannerBuilderExported}.`,
    `- setupScanner populates proofSelectionSignal in scan output: ${report.summary.setupScannerPopulatesProofSelectionSignalInScanOutput}.`,
    `- ChartContext timestamp field exists: ${report.summary.chartContextTimestampFieldExists}.`,
    `- Timeframe MSS evidence timestamp field exists: ${report.summary.timeframeMssEvidenceTimestampFieldExists}.`,
    `- Safe population source available for preflight: ${report.summary.safePopulationSourceAvailableForPreflight}.`,
    `- Scanner-visible population allowed by this report: ${report.summary.scannerVisiblePopulationAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Notes',
    ...report.notes.map((note) => `- ${note}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport(args: {
  setupScannerText: string;
  typesText: string;
  setupScannerPath?: string;
  typesPath?: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport {
  const setupCandidateBlock = extractInterfaceBlock(args.typesText, 'SetupCandidate');
  const chartContextBlock = extractInterfaceBlock(args.typesText, 'ChartContext');
  const timeframeEvidenceBlock = extractInterfaceBlock(args.typesText, 'TimeframeMssEvidenceItem');
  const setupCandidateProofSelectionSignalFieldExists = /\bproofSelectionSignal\??\s*:/.test(setupCandidateBlock);
  const setupCandidateTopLevelCompletedBarTimeExists = /\bcompletedBarTime\??\s*:/.test(setupCandidateBlock);
  const setupScannerBuilderExists = args.setupScannerText.includes('buildCompletedFiveMinuteProofSelectionSignals');
  const setupScannerBuilderExported = args.setupScannerText.includes('export function buildCompletedFiveMinuteProofSelectionSignals');
  const setupScannerPopulatesProofSelectionSignalInScanOutput = /proofSelectionSignal\s*:/.test(args.setupScannerText.replace(/export function buildCompletedFiveMinuteProofSelectionSignals[\s\S]*?export function rankSetupCandidate/, 'export function rankSetupCandidate'));
  const chartContextTimestampFieldExists = /\bchartTimestamp\??\s*:/.test(chartContextBlock);
  const timeframeMssEvidenceTimestampFieldExists = /\btimestamp\??\s*:/.test(timeframeEvidenceBlock) || args.typesText.includes('timestamp?: string | null');
  const safePopulationSourceAvailableForPreflight = setupCandidateProofSelectionSignalFieldExists &&
    setupScannerBuilderExists &&
    chartContextTimestampFieldExists &&
    timeframeMssEvidenceTimestampFieldExists &&
    !setupScannerPopulatesProofSelectionSignalInScanOutput;
  const blockers = [
    !setupCandidateProofSelectionSignalFieldExists ? 'SetupCandidate proofSelectionSignal field is missing.' : null,
    !setupScannerBuilderExists ? 'setupScanner proofSelectionSignal builder is missing.' : null,
    setupScannerPopulatesProofSelectionSignalInScanOutput ? 'setupScanner already appears to populate proofSelectionSignal in scan output.' : null,
    !chartContextTimestampFieldExists ? 'ChartContext chartTimestamp field is missing.' : null,
    !timeframeMssEvidenceTimestampFieldExists ? 'Timeframe MSS evidence timestamp field is missing.' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_population_preflight',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      setupScannerPath: args.setupScannerPath || 'src/lib/setupScanner.ts',
      typesPath: args.typesPath || 'src/types.ts',
    },
    summary: {
      setupCandidateProofSelectionSignalFieldExists,
      setupCandidateTopLevelCompletedBarTimeExists,
      setupScannerBuilderExists,
      setupScannerBuilderExported,
      setupScannerPopulatesProofSelectionSignalInScanOutput,
      chartContextTimestampFieldExists,
      timeframeMssEvidenceTimestampFieldExists,
      safePopulationSourceAvailableForPreflight,
      scannerVisiblePopulationAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'draft_scanner_output_population_dry_run_next',
    },
    blockers,
    notes: [
      'Do not use research artifact selector labels as population input.',
      'Do not populate proofSelectionSignal from incomplete/live-wick bars.',
      'The next phase should be a scanner-output population dry-run only; rank consumers remain disabled.',
    ],
  };
  return {
    ...base,
    markdown: buildMarkdown(base),
  };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationPreflightReport({
    setupScannerText: fs.readFileSync(options.setupScannerPath, 'utf8'),
    typesText: fs.readFileSync(options.typesPath, 'utf8'),
    setupScannerPath: path.relative(REPO_ROOT, options.setupScannerPath).replace(/\\/g, '/'),
    typesPath: path.relative(REPO_ROOT, options.typesPath).replace(/\\/g, '/'),
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-population-preflight-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) {
    console.log(JSON.stringify({ outPath, ...report }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
