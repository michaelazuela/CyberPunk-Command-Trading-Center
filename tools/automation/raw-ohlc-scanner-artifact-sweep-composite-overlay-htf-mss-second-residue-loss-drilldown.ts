import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-package-simulation';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];

interface CliOptions {
  broadValidation: string;
  packageSimulation: string;
  residuePackageSimulation: string;
  packageName: string;
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

interface Bucket {
  feature: string;
  key: string;
  scope: 'pre_entry_candidate' | 'regime_diagnostic';
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  lossShare: number;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_loss_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    packageSimulationPath: string;
    residuePackageSimulationPath: string;
    packageName: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    secondResidueAfterPackageOnly: true;
    preEntryFeaturesOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputRows: number;
    packageRejectedRows: number;
    secondResidueRows: number;
    secondResidueLossRows: number;
    topPreEntryBucket: string | null;
    topRegimeBucket: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'mine_second_residue_compounds' | 'prepare_research_only_proposal_update' | 'fix_inputs';
  };
  topPreEntryBuckets: Bucket[];
  topRegimeBuckets: Bucket[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const packageSimulation = readFlag(args, '--package-simulation');
  const residuePackageSimulation = readFlag(args, '--residue-package-simulation');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!packageSimulation) throw new Error('--package-simulation is required.');
  if (!residuePackageSimulation) throw new Error('--residue-package-simulation is required.');
  return {
    broadValidation,
    packageSimulation,
    residuePackageSimulation,
    packageName: readFlag(args, '--package-name') || 'base_plus_zero_winner_residue_all',
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
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

function isWinner(row: Row): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Row): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: Row[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 4) return 'risk_lt_4';
  if (riskPoints < 8) return 'risk_4_to_8';
  if (riskPoints < 16) return 'risk_8_to_16';
  if (riskPoints < 24) return 'risk_16_to_24';
  return 'risk_gte_24';
}

function fineRiskBucket(riskPoints: number): string {
  const lower = Math.floor(riskPoints / 4) * 4;
  return `risk_${lower}_to_${lower + 4}`;
}

function timeBucket(proofTime: string): string {
  const hour = Number(proofTime.slice(11, 13));
  return Number.isFinite(hour) ? `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59` : 'unknown';
}

function scenarioKeyFromName(name: string): string {
  return name.includes(':') ? name.slice(name.indexOf(':') + 1) : name;
}

function matchesKey(row: Row, key: string): boolean {
  const values = new Map([
    ['session', row.session],
    ['direction', row.direction],
    ['timeBucket', timeBucket(row.proofTime)],
    ['riskBucket', riskBucket(row.riskPoints)],
    ['fineRiskBucket', fineRiskBucket(row.riskPoints)],
  ]);
  return key.split('|').every((part) => {
    const [feature, expected] = part.split('=');
    return Boolean(feature && expected && values.get(feature) === expected);
  });
}

function collect(rows: Row[], totalLosses: number, feature: string, scope: Bucket['scope'], keyFn: (row: Row) => string): Bucket[] {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) grouped.set(keyFn(row), [...(grouped.get(keyFn(row)) || []), row]);
  return [...grouped.entries()]
    .map(([key, bucketRows]) => ({
      feature,
      key,
      scope,
      rows: bucketRows.length,
      winners: bucketRows.filter(isWinner).length,
      losses: bucketRows.filter(isLoss).length,
      unresolved: bucketRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      oneMesPl: sum(bucketRows),
      lossShare: totalLosses ? round(bucketRows.filter(isLoss).length / totalLosses) : 0,
    }))
    .filter((bucket) => bucket.losses > 0)
    .sort((a, b) => b.losses - a.losses || a.winners - b.winners || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport, 'markdown'>): string {
  return [
    '# HTF MSS Second Residue Loss Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only second-residue drilldown. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input rows: ${report.summary.inputRows}.`,
    `- Package rejected rows: ${report.summary.packageRejectedRows}.`,
    `- Second residue rows: ${report.summary.secondResidueRows}.`,
    `- Second residue loss rows: ${report.summary.secondResidueLossRows}.`,
    `- Top pre-entry bucket: ${report.summary.topPreEntryBucket ?? '-'}.`,
    `- Top regime bucket: ${report.summary.topRegimeBucket ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Pre-Entry Buckets',
    ...report.topPreEntryBuckets.slice(0, 12).map((item) => `- ${item.feature}:${item.key} rows ${item.rows}, W/L/U ${item.winners}/${item.losses}/${item.unresolved}, P/L ${item.oneMesPl ?? '-'}, lossShare ${item.lossShare}.`),
    '',
    '## Top Regime Buckets',
    ...report.topRegimeBuckets.slice(0, 8).map((item) => `- ${item.feature}:${item.key} rows ${item.rows}, W/L/U ${item.winners}/${item.losses}/${item.unresolved}, P/L ${item.oneMesPl ?? '-'}, lossShare ${item.lossShare}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport(args: {
  reportDir: string;
  broadValidationPath: string;
  packageSimulationPath: string;
  residuePackageSimulationPath: string;
  packageName: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residuePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport {
  const rows = args.broadValidation?.selectedRows || [];
  const selectedPackage = args.residuePackageSimulation?.packages.find((item) => item.name === args.packageName) || null;
  const basePackage = selectedPackage ? args.packageSimulation?.packages.find((item) => item.name === selectedPackage.basePackageName) || null : null;
  const packageKeys = [
    ...(basePackage?.scenarioNames || []).map(scenarioKeyFromName),
    ...(selectedPackage?.residueScenarioNames || []).map(scenarioKeyFromName),
  ];
  const rejectedRows = selectedPackage ? rows.filter((row) => packageKeys.some((key) => matchesKey(row, key))) : [];
  const secondResidueRows = selectedPackage ? rows.filter((row) => !packageKeys.some((key) => matchesKey(row, key))) : rows;
  const secondResidueLossRows = secondResidueRows.filter(isLoss).length;
  const topPreEntryBuckets = [
    ...collect(secondResidueRows, secondResidueLossRows, 'session', 'pre_entry_candidate', (row) => row.session),
    ...collect(secondResidueRows, secondResidueLossRows, 'direction', 'pre_entry_candidate', (row) => row.direction),
    ...collect(secondResidueRows, secondResidueLossRows, 'timeBucket', 'pre_entry_candidate', (row) => timeBucket(row.proofTime)),
    ...collect(secondResidueRows, secondResidueLossRows, 'riskBucket', 'pre_entry_candidate', (row) => riskBucket(row.riskPoints)),
    ...collect(secondResidueRows, secondResidueLossRows, 'fineRiskBucket', 'pre_entry_candidate', (row) => fineRiskBucket(row.riskPoints)),
    ...collect(secondResidueRows, secondResidueLossRows, 'sessionDirectionTimeRisk', 'pre_entry_candidate', (row) => `${row.session}|${row.direction}|${timeBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`),
  ].filter((item) => item.losses >= 3).sort((a, b) => b.losses - a.losses || a.winners - b.winners || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0)).slice(0, 30);
  const topRegimeBuckets = [
    ...collect(secondResidueRows, secondResidueLossRows, 'tradeDate', 'regime_diagnostic', (row) => row.tradeDate),
    ...collect(secondResidueRows, secondResidueLossRows, 'dateSession', 'regime_diagnostic', (row) => `${row.tradeDate}|${row.session}`),
  ].filter((item) => item.losses >= 3).sort((a, b) => b.losses - a.losses || a.winners - b.winners).slice(0, 20);
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.packageSimulation ? 'missing HTF-MSS compound package simulation report' : null,
    args.packageSimulation && args.packageSimulation.status !== 'pass' ? `HTF-MSS compound package simulation status ${args.packageSimulation.status}` : null,
    !args.residuePackageSimulation ? 'missing HTF-MSS residue package simulation report' : null,
    args.residuePackageSimulation && args.residuePackageSimulation.status !== 'pass' ? `HTF-MSS residue package simulation status ${args.residuePackageSimulation.status}` : null,
    args.residuePackageSimulation && args.residuePackageSimulation.summary.recommendation !== 'continue_feature_search'
      ? `HTF-MSS residue package simulation recommendation ${args.residuePackageSimulation.summary.recommendation}`
      : null,
    !selectedPackage ? `residue package ${args.packageName} not found` : null,
    selectedPackage && !basePackage ? `base package ${selectedPackage.basePackageName} not found` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_loss_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      packageSimulationPath: args.packageSimulationPath,
      residuePackageSimulationPath: args.residuePackageSimulationPath,
      packageName: args.packageName,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      secondResidueAfterPackageOnly: true,
      preEntryFeaturesOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputRows: rows.length,
      packageRejectedRows: rejectedRows.length,
      secondResidueRows: secondResidueRows.length,
      secondResidueLossRows,
      topPreEntryBucket: topPreEntryBuckets[0] ? `${topPreEntryBuckets[0].feature}:${topPreEntryBuckets[0].key}` : null,
      topRegimeBucket: topRegimeBuckets[0] ? `${topRegimeBuckets[0].feature}:${topRegimeBuckets[0].key}` : null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : secondResidueLossRows === 0 ? 'prepare_research_only_proposal_update' : 'mine_second_residue_compounds',
    },
    topPreEntryBuckets,
    topRegimeBuckets,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this second-residue drilldown.']
      : [
        'Mine second-residue compound pockets over the remaining selected losses before any scanner-visible proposal.',
        'Use regime buckets only as research context; do not use tradeDate/dateSession as live filters.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-loss-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    packageSimulationPath: options.packageSimulation,
    residuePackageSimulationPath: options.residuePackageSimulation,
    packageName: options.packageName,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    packageSimulation: fs.existsSync(options.packageSimulation) ? readJson(options.packageSimulation) : null,
    residuePackageSimulation: fs.existsSync(options.residuePackageSimulation) ? readJson(options.residuePackageSimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topPreEntryBuckets: report.topPreEntryBuckets.slice(0, 12), topRegimeBuckets: report.topRegimeBuckets.slice(0, 8), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
