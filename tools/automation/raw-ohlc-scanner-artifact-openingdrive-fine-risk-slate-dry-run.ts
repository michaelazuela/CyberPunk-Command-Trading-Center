import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';
import type {
  RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-approval-contract';

type Selector = 'fine_risk_24_to_32' | 'tight_long_risk_4_to_8';

interface CliOptions {
  freshReplayPackage: string;
  approvalContract: string;
  outDir: string;
  json: boolean;
}

interface Authority {
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
}

interface BucketSummary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface DryRunRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  selector: Selector;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
  slateAction: 'retained_by_fine_risk' | 'removed_by_fine_risk';
}

export interface RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_slate_dry_run';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    freshReplayPackagePath: string;
    approvalContractPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    dryRunOnly: true;
    baselineIsFreshReplaySelectedSet: true;
    proposedIsFineRiskOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  comparisonPolicy: {
    baseline: 'openingdrive_fresh_replay_selected_rows';
    proposed: 'retain_only_fine_risk_24_to_32';
    noLiveScoringUsed: true;
  };
  summary: {
    baselineRows: number;
    proposedRows: number;
    removedRows: number;
    retainedRows: number;
    changedSlates: number;
    baselineSummary: BucketSummary;
    proposedSummary: BucketSummary;
    removedSummary: BucketSummary;
    proposedDeltaOneMesPl: number | null;
    removedLosses: number;
    removedWinners: number;
    removedTightLongRows: number;
    removedFineRiskRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'approval_candidate_but_keep_research_only' | 'do_not_advance' | 'fix_inputs';
  };
  selectorSummaries: Array<BucketSummary & { selector: Selector; slateAction: 'baseline' | 'proposed' | 'removed' }>;
  changedRows: DryRunRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const FINE_SELECTOR: Selector = 'fine_risk_24_to_32';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const freshReplayPackage = readFlag(args, '--fresh-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-\d+\.json$/);
  const approvalContract = readFlag(args, '--approval-contract') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fine-risk-approval-contract-\d+\.json$/);
  if (!freshReplayPackage) throw new Error('--fresh-replay-package is required.');
  if (!approvalContract) throw new Error('--approval-contract is required.');
  return { freshReplayPackage, approvalContract, outDir, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(rows: DryRunRow[]): number | null {
  const values = rows.map((row) => row.oneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function avg(rows: DryRunRow[]): number | null {
  const values = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function isWinner(row: DryRunRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: DryRunRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: DryRunRow[]): BucketSummary {
  return {
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    avgRiskPoints: avg(rows),
  };
}

function toDryRunRows(
  report: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
): DryRunRow[] {
  return report.selectedRows.map((row) => ({
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    direction: row.direction,
    selector: row.selector,
    riskPoints: row.riskPoints,
    outcomeLabel: String(row.outcomeLabel),
    outcomeStatus: String(row.outcomeStatus),
    oneMesPl: row.oneMesPl,
    slateAction: row.selector === FINE_SELECTOR ? 'retained_by_fine_risk' : 'removed_by_fine_risk',
  }));
}

function selectorSummary(
  rows: DryRunRow[],
  selector: Selector,
  slateAction: 'baseline' | 'proposed' | 'removed',
): BucketSummary & { selector: Selector; slateAction: 'baseline' | 'proposed' | 'removed' } {
  return {
    selector,
    slateAction,
    ...summarize(rows.filter((row) => row.selector === selector)),
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport, 'markdown'>): string {
  return [
    '# OpeningDrive Fine-Risk Slate Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only slate dry run. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Baseline/proposed rows: ${report.summary.baselineRows}/${report.summary.proposedRows}.`,
    `- Retained/removed rows: ${report.summary.retainedRows}/${report.summary.removedRows}.`,
    `- Proposed W/L/O/U: ${report.summary.proposedSummary.winners}/${report.summary.proposedSummary.losses}/${report.summary.proposedSummary.otherResolved}/${report.summary.proposedSummary.unresolved}.`,
    `- Removed W/L/O/U: ${report.summary.removedSummary.winners}/${report.summary.removedSummary.losses}/${report.summary.removedSummary.otherResolved}/${report.summary.removedSummary.unresolved}.`,
    `- Baseline/proposed one-MES P/L: ${report.summary.baselineSummary.oneMesPl ?? '-'} / ${report.summary.proposedSummary.oneMesPl ?? '-'}.`,
    `- Proposed delta one-MES P/L: ${report.summary.proposedDeltaOneMesPl ?? '-'}.`,
    `- Removed tight-long rows/losses: ${report.summary.removedTightLongRows}/${report.summary.removedLosses}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selector Impact',
    '| Action | Selector | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---|---:|---|---:|---:|',
    ...report.selectorSummaries.map((row) => `| ${row.slateAction} | ${row.selector} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Changed Rows',
    '| Ticket | Date | Time | Direction | Selector | Risk | Outcome | P/L | Action |',
    '|---|---|---|---|---|---:|---|---:|---|',
    ...report.changedRows.slice(0, 40).map((row) => `| ${row.ticketId} | ${row.tradeDate} | ${row.proofTime} | ${row.direction} | ${row.selector} | ${row.riskPoints} | ${row.outcomeLabel} | ${row.oneMesPl ?? '-'} | ${row.slateAction} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport(args: {
  freshReplayPackagePath: string;
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
  approvalContractPath: string;
  approvalContract: RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport {
  const rows = args.freshReplayPackage ? toDryRunRows(args.freshReplayPackage) : [];
  const proposedRows = rows.filter((row) => row.selector === FINE_SELECTOR);
  const removedRows = rows.filter((row) => row.selector !== FINE_SELECTOR);
  const baselineSummary = summarize(rows);
  const proposedSummary = summarize(proposedRows);
  const removedSummary = summarize(removedRows);
  const proposedDeltaOneMesPl = baselineSummary.oneMesPl === null || proposedSummary.oneMesPl === null
    ? null
    : round(proposedSummary.oneMesPl - baselineSummary.oneMesPl);
  const blockers = [
    !args.freshReplayPackage ? 'missing OpeningDrive fresh replay package report' : null,
    args.freshReplayPackage && args.freshReplayPackage.status !== 'pass' ? `fresh replay package status ${args.freshReplayPackage.status}` : null,
    !args.approvalContract ? 'missing OpeningDrive fine-risk approval contract report' : null,
    args.approvalContract && args.approvalContract.status !== 'pass' ? `approval contract status ${args.approvalContract.status}` : null,
    args.approvalContract && args.approvalContract.summary.livePromotionAllowedRows !== 0 ? 'approval contract live promotion rows must remain zero' : null,
    proposedRows.length === 0 ? 'no fine-risk rows retained by proposed dry run' : null,
  ].filter((item): item is string => Boolean(item));
  const ready = !blockers.length && proposedSummary.losses === 0 && (proposedSummary.oneMesPl ?? 0) > 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_slate_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      freshReplayPackagePath: args.freshReplayPackagePath,
      approvalContractPath: args.approvalContractPath,
    },
    assumptions: {
      savedReportsOnly: true,
      dryRunOnly: true,
      baselineIsFreshReplaySelectedSet: true,
      proposedIsFineRiskOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    comparisonPolicy: {
      baseline: 'openingdrive_fresh_replay_selected_rows',
      proposed: 'retain_only_fine_risk_24_to_32',
      noLiveScoringUsed: true,
    },
    summary: {
      baselineRows: rows.length,
      proposedRows: proposedRows.length,
      removedRows: removedRows.length,
      retainedRows: proposedRows.length,
      changedSlates: removedRows.length,
      baselineSummary,
      proposedSummary,
      removedSummary,
      proposedDeltaOneMesPl,
      removedLosses: removedSummary.losses,
      removedWinners: removedSummary.winners,
      removedTightLongRows: removedRows.filter((row) => row.selector === 'tight_long_risk_4_to_8').length,
      removedFineRiskRows: removedRows.filter((row) => row.selector === FINE_SELECTOR).length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : ready ? 'approval_candidate_but_keep_research_only' : 'do_not_advance',
    },
    selectorSummaries: [
      selectorSummary(rows, 'tight_long_risk_4_to_8', 'baseline'),
      selectorSummary(rows, FINE_SELECTOR, 'baseline'),
      selectorSummary(proposedRows, FINE_SELECTOR, 'proposed'),
      selectorSummary(removedRows, 'tight_long_risk_4_to_8', 'removed'),
      selectorSummary(removedRows, FINE_SELECTOR, 'removed'),
    ],
    changedRows: rows.filter((row) => row.slateAction === 'removed_by_fine_risk'),
    blockers,
    recommendations: blockers.length
      ? ['Fix the fresh package or approval contract before using this dry-run comparison.']
      : ready
        ? [
          'Fine-risk-only retained set remains clean and profitable, but this is still research-only.',
          'The dry run would remove tight_long_risk_4_to_8 rows, including winners; do not install without explicit model-ranking approval.',
          'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading rules from this dry run.',
        ]
        : [
          'Fine-risk-only dry run is not clean enough to advance.',
          'Continue saved-report research and leave live behavior unchanged.',
          'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading rules from this dry run.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport(
  report: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport({
    freshReplayPackagePath: options.freshReplayPackage,
    freshReplayPackage: fs.existsSync(options.freshReplayPackage)
      ? readJson<RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport>(options.freshReplayPackage)
      : null,
    approvalContractPath: options.approvalContract,
    approvalContract: fs.existsSync(options.approvalContract)
      ? readJson<RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport>(options.approvalContract)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
