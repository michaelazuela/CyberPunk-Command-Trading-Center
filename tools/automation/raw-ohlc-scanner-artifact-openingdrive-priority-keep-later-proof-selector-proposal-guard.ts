import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-readiness-summary';

interface CliOptions {
  readinessSummary: string;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_proposal_guard';
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
    readinessSummaryPath: string | null;
  };
  assumptions: {
    blocksLiveProposalWhenEvidenceExcluded: true;
    blocksLiveProposalWhenReadinessSaysContinueResearch: true;
    livePromotionAllowed: false;
  };
  summary: {
    proposalAllowed: false;
    strictReadyReplayRows: number;
    blockedRowsExcluded: number;
    waitingForEntryTriggerRows: number;
    invalidatedRows: number;
    readinessRecommendation: string | null;
    hardStopReasons: string[];
    livePromotionAllowedRows: 0;
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
  const readinessSummary = readFlag(args, '--readiness-summary') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-readiness-summary-\d+\.json$/);
  if (!readinessSummary) throw new Error('--readiness-summary is required.');
  return {
    readinessSummary: path.resolve(readinessSummary),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport['authority'] {
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

function hardStopReasons(summary: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport | null): string[] {
  if (!summary) return ['missing readiness summary'];
  return [
    summary.status !== 'pass' ? `readiness summary status ${summary.status}` : null,
    summary.summary.livePromotionAllowedRows !== 0 ? `readiness summary has ${summary.summary.livePromotionAllowedRows} live-promotion rows` : null,
    summary.summary.blockedRowsExcluded > 0 ? `${summary.summary.blockedRowsExcluded} blocked rows remain excluded from performance` : null,
    summary.summary.waitingForEntryTriggerRows > 0 ? `${summary.summary.waitingForEntryTriggerRows} rows are waiting for fresh entry trigger` : null,
    summary.summary.invalidatedRows > 0 ? `${summary.summary.invalidatedRows} rows are stale/invalidated` : null,
    summary.summary.recommendation !== 'prepare_sweep_only_guarded_proposal' ? `readiness recommendation is ${summary.summary.recommendation}` : null,
  ].filter((item): item is string => Boolean(item));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Proposal Guard',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only proposal guard. It does not install selector behavior, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Proposal allowed: ${report.summary.proposalAllowed}.`,
    `- Strict-ready replay rows: ${report.summary.strictReadyReplayRows}.`,
    `- Blocked rows excluded: ${report.summary.blockedRowsExcluded}.`,
    `- Waiting-for-entry-trigger rows: ${report.summary.waitingForEntryTriggerRows}.`,
    `- Invalidated rows: ${report.summary.invalidatedRows}.`,
    `- Readiness recommendation: ${report.summary.readinessRecommendation ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Hard Stops',
    ...(report.summary.hardStopReasons.length ? report.summary.hardStopReasons.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport(args: {
  readinessSummaryPath: string | null;
  readinessSummary: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport {
  const hardStops = hardStopReasons(args.readinessSummary);
  const blockers = [
    !args.readinessSummaryPath ? 'missing readiness summary path' : null,
    !args.readinessSummary ? 'missing readiness summary report' : null,
    ...hardStops,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_proposal_guard',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      readinessSummaryPath: args.readinessSummaryPath,
    },
    assumptions: {
      blocksLiveProposalWhenEvidenceExcluded: true,
      blocksLiveProposalWhenReadinessSaysContinueResearch: true,
      livePromotionAllowed: false,
    },
    summary: {
      proposalAllowed: false,
      strictReadyReplayRows: args.readinessSummary?.summary.strictReadyReplayRows || 0,
      blockedRowsExcluded: args.readinessSummary?.summary.blockedRowsExcluded || 0,
      waitingForEntryTriggerRows: args.readinessSummary?.summary.waitingForEntryTriggerRows || 0,
      invalidatedRows: args.readinessSummary?.summary.invalidatedRows || 0,
      readinessRecommendation: args.readinessSummary?.summary.recommendation || null,
      hardStopReasons: hardStops,
      livePromotionAllowedRows: 0,
    },
    blockers,
    recommendations: blockers.length
      ? ['Do not propose live selector behavior. Resolve or explicitly carve out excluded/no-entry/invalidated rows first with source/proof criteria.']
      : ['Proposal guard passed, but implementation would still require a separate explicit approval checkpoint.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-proposal-guard-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport({
    readinessSummaryPath: options.readinessSummary,
    readinessSummary: fs.existsSync(options.readinessSummary)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport>(options.readinessSummary)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
