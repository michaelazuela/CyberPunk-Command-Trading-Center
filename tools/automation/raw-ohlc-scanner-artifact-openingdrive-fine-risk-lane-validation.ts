import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';

type Selector = 'fine_risk_24_to_32';

interface CliOptions {
  freshReplayPackage: string;
  outDir: string;
  minRows: number;
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

interface LaneRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  proofTime: string;
  direction: string;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
}

interface BucketSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

export interface RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_lane_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    freshReplayPackagePath: string;
    setupType: string | null;
  };
  assumptions: {
    readsFreshReplayPackageOnly: true;
    validatesFrozenSelectorOnly: true;
    candidateUsesNoLookaheadFieldsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  selector: {
    name: Selector;
    minRows: number;
  };
  summary: BucketSummary & {
    validationDecision: 'validated_for_research_proposal_candidate' | 'not_validated';
    livePromotionAllowedRows: 0;
  };
  daySummaries: BucketSummary[];
  sessionSummaries: BucketSummary[];
  modelSummaries: BucketSummary[];
  unresolvedRows: LaneRow[];
  selectedRows: LaneRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_MIN_ROWS = 10;
const SELECTOR: Selector = 'fine_risk_24_to_32';

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

export function parseRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const freshReplayPackage = readFlag(args, '--fresh-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-\d+\.json$/);
  const minRows = Number(readFlag(args, '--min-rows') || DEFAULT_MIN_ROWS);
  if (!freshReplayPackage) throw new Error('--fresh-replay-package is required.');
  if (!Number.isFinite(minRows) || minRows < 1) throw new Error('--min-rows must be a positive number.');
  return { freshReplayPackage, outDir, minRows, json: args.includes('--json') };
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

function sum(rows: LaneRow[]): number | null {
  const values = rows.map((row) => row.oneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function avg(rows: LaneRow[]): number | null {
  const values = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function isWinner(row: LaneRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: LaneRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(key: string, rows: LaneRow[]): BucketSummary {
  return {
    key,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    avgRiskPoints: avg(rows),
  };
}

function summarizeBy(rows: LaneRow[], keyFor: (row: LaneRow) => string): BucketSummary[] {
  const groups = new Map<string, LaneRow[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, groupRows]) => summarize(key, groupRows));
}

function toLaneRows(report: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport): LaneRow[] {
  return report.selectedRows
    .filter((row) => row.selector === SELECTOR)
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: report.source.setupType,
      proofTime: row.proofTime,
      direction: row.direction,
      riskPoints: row.riskPoints,
      outcomeLabel: String(row.outcomeLabel),
      outcomeStatus: String(row.outcomeStatus),
      oneMesPl: row.oneMesPl,
    }));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Fine-Risk Lane Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only fine-risk lane validation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selector: ${report.selector.name}.`,
    `- Rows: ${report.summary.rows}.`,
    `- W/L/O/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.otherResolved}/${report.summary.unresolved}.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? '-'}.`,
    `- Avg risk points: ${report.summary.avgRiskPoints ?? '-'}.`,
    `- Validation decision: ${report.summary.validationDecision}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## By Day',
    '| Day | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.daySummaries.map((row) => `| ${row.key} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## By Session',
    '| Session | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.sessionSummaries.map((row) => `| ${row.key} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport(args: {
  freshReplayPackagePath: string;
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
  minRows?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport {
  const minRows = args.minRows ?? DEFAULT_MIN_ROWS;
  const rows = args.freshReplayPackage ? toLaneRows(args.freshReplayPackage) : [];
  const summary = summarize(SELECTOR, rows);
  const blockers = [
    !args.freshReplayPackage ? 'missing OpeningDrive fresh replay package report' : null,
    args.freshReplayPackage && args.freshReplayPackage.status !== 'pass' ? `fresh replay package status ${args.freshReplayPackage.status}` : null,
    rows.length < minRows ? `fine-risk lane has ${rows.length} rows, below minimum ${minRows}` : null,
  ].filter((item): item is string => Boolean(item));
  const validationDecision = !blockers.length && summary.losses === 0 && (summary.oneMesPl ?? 0) > 0
    ? 'validated_for_research_proposal_candidate'
    : 'not_validated';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_lane_validation',
    generatedAt,
    status: args.freshReplayPackage ? 'pass' : 'fail',
    authority: authority(),
    source: {
      freshReplayPackagePath: args.freshReplayPackagePath,
      setupType: args.freshReplayPackage?.source.setupType || null,
    },
    assumptions: {
      readsFreshReplayPackageOnly: true,
      validatesFrozenSelectorOnly: true,
      candidateUsesNoLookaheadFieldsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    selector: {
      name: SELECTOR,
      minRows,
    },
    summary: {
      ...summary,
      validationDecision,
      livePromotionAllowedRows: 0,
    },
    daySummaries: summarizeBy(rows, (row) => row.tradeDate),
    sessionSummaries: summarizeBy(rows, (row) => row.session),
    modelSummaries: summarizeBy(rows, (row) => row.setupType),
    unresolvedRows: rows.filter((row) => row.outcomeStatus !== 'resolved'),
    selectedRows: rows,
    blockers,
    recommendations: validationDecision === 'validated_for_research_proposal_candidate'
      ? [
        'The OpeningDrive fine-risk lane is clean enough to draft a research-only proposal candidate.',
        'Keep scanner-visible behavior disabled until an approval contract compares this lane against rejected losses and collision priority.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, or trading rules from this validation.',
      ]
      : [
        'The OpeningDrive fine-risk lane is not ready for a proposal candidate.',
        'Mine additional proof-time structure before any live-facing change.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, or trading rules from this validation.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport(
  report: RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-fine-risk-lane-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationArgs(args);
  const freshReplayPackage = fs.existsSync(options.freshReplayPackage)
    ? readJson<RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport>(options.freshReplayPackage)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport({
    freshReplayPackagePath: options.freshReplayPackage,
    freshReplayPackage,
    minRows: options.minRows,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, daySummaries: report.daySummaries, sessionSummaries: report.sessionSummaries, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
