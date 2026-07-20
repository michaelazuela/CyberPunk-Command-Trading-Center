import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-drilldown';

interface CliOptions {
  lossDrilldown: string;
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

type DrilldownRow = RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport['lossRows'][number];

interface Scenario {
  featureSet: string;
  key: string;
  liveUsable: boolean;
  rowsRejected: number;
  winnersRejected: number;
  lossesRejected: number;
  rejectedOneMesPl: number | null;
  rowsKept: number;
  winnersKept: number;
  lossesKept: number;
  keptOneMesPl: number | null;
  conclusion: 'candidate_zero_winner_cost' | 'reject_costs_winners' | 'research_context_only';
}

export interface RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_separator_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    lossDrilldownPath: string;
  };
  assumptions: {
    savedLossDrilldownOnly: true;
    lowRiskRowsOnly: true;
    testsPreEntryFieldsOnlyForLiveUsableScenarios: true;
    dateAndOutcomeTagsAreResearchContextOnly: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  summary: {
    lowRiskRows: number;
    startingWinners: number;
    startingLosses: number;
    zeroWinnerCostLiveUsableScenarios: number;
    bestLiveUsableScenario: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'queue_validation_for_zero_winner_cost_separator' | 'do_not_filter_low_risk_with_available_fields' | 'fix_inputs';
  };
  scenarios: Scenario[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

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

export function parseRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const lossDrilldown = readFlag(args, '--loss-drilldown') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-drilldown-\d+\.json$/);
  if (!lossDrilldown) throw new Error('--loss-drilldown is required.');
  return { lossDrilldown, outDir, json: args.includes('--json') };
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

function isWinner(row: DrilldownRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: DrilldownRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: DrilldownRow[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function minuteBucket(row: DrilldownRow): string {
  const date = new Date(row.proofTime);
  return Number.isNaN(date.getTime()) ? 'unknown' : date.getMinutes().toString().padStart(2, '0');
}

function keyFor(row: DrilldownRow, featureSet: string): string {
  const parts = featureSet.split('|');
  return parts.map((part) => {
    if (part === 'direction') return row.direction;
    if (part === 'hourBucket') return row.hourBucket;
    if (part === 'timeBucket') return row.timeBucket;
    if (part === 'minuteBucket') return minuteBucket(row);
    if (part === 'riskBucket') return row.riskBucket;
    if (part === 'tradeDate') return row.tradeDate;
    if (part === 'separatorTags') return row.separatorTags.join('|');
    return 'unknown';
  }).join('|');
}

function scenario(rows: DrilldownRow[], featureSet: string, key: string, liveUsable: boolean): Scenario {
  const rejected = rows.filter((row) => keyFor(row, featureSet) === key);
  const kept = rows.filter((row) => keyFor(row, featureSet) !== key);
  const winnersRejected = rejected.filter(isWinner).length;
  const lossesRejected = rejected.filter(isLoss).length;
  return {
    featureSet,
    key,
    liveUsable,
    rowsRejected: rejected.length,
    winnersRejected,
    lossesRejected,
    rejectedOneMesPl: sum(rejected),
    rowsKept: kept.length,
    winnersKept: kept.filter(isWinner).length,
    lossesKept: kept.filter(isLoss).length,
    keptOneMesPl: sum(kept),
    conclusion: !liveUsable
      ? 'research_context_only'
      : winnersRejected === 0 && lossesRejected > 0
        ? 'candidate_zero_winner_cost'
        : 'reject_costs_winners',
  };
}

function candidateScenarios(rows: DrilldownRow[]): Scenario[] {
  const liveFeatureSets = [
    'direction',
    'hourBucket',
    'timeBucket',
    'minuteBucket',
    'riskBucket',
    'direction|hourBucket',
    'direction|riskBucket',
    'hourBucket|riskBucket',
    'direction|hourBucket|riskBucket',
    'direction|hourBucket|minuteBucket|riskBucket',
  ];
  const researchOnlyFeatureSets = ['tradeDate', 'separatorTags', 'tradeDate|direction|hourBucket|riskBucket'];
  const all: Scenario[] = [];
  for (const featureSet of liveFeatureSets) {
    const keys = [...new Set(rows.filter(isLoss).map((row) => keyFor(row, featureSet)))];
    all.push(...keys.map((key) => scenario(rows, featureSet, key, true)));
  }
  for (const featureSet of researchOnlyFeatureSets) {
    const keys = [...new Set(rows.filter(isLoss).map((row) => keyFor(row, featureSet)))];
    all.push(...keys.map((key) => scenario(rows, featureSet, key, false)));
  }
  return all.sort((a, b) =>
    Number(b.conclusion === 'candidate_zero_winner_cost') - Number(a.conclusion === 'candidate_zero_winner_cost') ||
    b.lossesRejected - a.lossesRejected ||
    a.winnersRejected - b.winnersRejected ||
    b.rowsRejected - a.rowsRejected ||
    a.featureSet.localeCompare(b.featureSet),
  );
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Low-Risk Loss Separator Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only separator mining. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Starting W/L: ${report.summary.startingWinners}/${report.summary.startingLosses}.`,
    `- Zero-winner-cost live-usable scenarios: ${report.summary.zeroWinnerCostLiveUsableScenarios}.`,
    `- Best live-usable scenario: ${report.summary.bestLiveUsableScenario ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Scenarios',
    '| Feature Set | Key | Live Usable | Reject Rows | Reject W/L | Kept W/L | Kept P/L | Conclusion |',
    '|---|---|---|---:|---|---|---:|---|',
    ...report.scenarios.slice(0, 20).map((row) => `| ${row.featureSet} | ${row.key} | ${row.liveUsable} | ${row.rowsRejected} | ${row.winnersRejected}/${row.lossesRejected} | ${row.winnersKept}/${row.lossesKept} | ${row.keptOneMesPl ?? '-'} | ${row.conclusion} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport(args: {
  lossDrilldownPath: string;
  lossDrilldown: RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport {
  const rows = args.lossDrilldown ? [...args.lossDrilldown.winnerRows, ...args.lossDrilldown.lossRows] : [];
  const scenarios = candidateScenarios(rows);
  const zeroWinnerCost = scenarios.filter((item) => item.liveUsable && item.conclusion === 'candidate_zero_winner_cost');
  const bestLiveUsable = zeroWinnerCost[0] || null;
  const blockers = [
    !args.lossDrilldown ? 'missing low-risk loss drilldown report' : null,
    args.lossDrilldown && args.lossDrilldown.status !== 'pass' ? `loss drilldown status ${args.lossDrilldown.status}` : null,
    rows.length === 0 ? 'loss drilldown has no low-risk rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_loss_separator_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { lossDrilldownPath: args.lossDrilldownPath },
    assumptions: {
      savedLossDrilldownOnly: true,
      lowRiskRowsOnly: true,
      testsPreEntryFieldsOnlyForLiveUsableScenarios: true,
      dateAndOutcomeTagsAreResearchContextOnly: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    summary: {
      lowRiskRows: rows.length,
      startingWinners: rows.filter(isWinner).length,
      startingLosses: rows.filter(isLoss).length,
      zeroWinnerCostLiveUsableScenarios: zeroWinnerCost.length,
      bestLiveUsableScenario: bestLiveUsable ? `${bestLiveUsable.featureSet}=${bestLiveUsable.key}` : null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : bestLiveUsable
          ? 'queue_validation_for_zero_winner_cost_separator'
          : 'do_not_filter_low_risk_with_available_fields',
    },
    scenarios,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved loss-drilldown input before using this separator miner.']
      : [
        bestLiveUsable
          ? 'A zero-winner-cost pre-entry separator exists in this saved sample; validate out-of-sample before any proposal.'
          : 'No zero-winner-cost live-usable separator exists in available pre-entry fields; do not filter low-risk broadly from this evidence.',
        'Date and outcome/replay separator tags are research context only and cannot become live filters.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading-rule changes from this miner.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport(
  report: RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-separator-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport({
    lossDrilldownPath: options.lossDrilldown,
    lossDrilldown: fs.existsSync(options.lossDrilldown)
      ? readJson<RawOhlcScannerArtifactOpeningDriveLowRiskLossDrilldownReport>(options.lossDrilldown)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, scenarios: report.scenarios.slice(0, 20), blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
