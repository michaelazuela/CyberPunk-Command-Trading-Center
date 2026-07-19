import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-loss-separator-simulation';

type BroadRow = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number] & {
  mfeR?: number | null;
  maeR?: number | null;
  firstReplayBarTime?: string | null;
  stopHitTime?: string | null;
  t1HitTime?: string | null;
  t2HitTime?: string | null;
  separatorTags?: string[];
};

interface CliOptions {
  broadValidation: string;
  separatorSimulation: string;
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

interface FeatureBucket {
  feature: string;
  key: string;
  scope: 'pre_entry_candidate' | 'regime_diagnostic' | 'replay_outcome_research_only';
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  lossShare: number;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_feature_search';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    separatorSimulationPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    featureSearchOnly: true;
    outcomeFieldsResearchOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputSelectedRows: number;
    inputLossRows: number;
    preEntryBuckets: number;
    regimeDiagnosticBuckets: number;
    replayOutcomeResearchOnlyBuckets: number;
    topPreEntryCandidate: string | null;
    topReplayOnlySeparator: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'simulate_pre_entry_feature_candidates' | 'continue_feature_search' | 'fix_inputs';
  };
  topPreEntryCandidates: FeatureBucket[];
  topRegimeDiagnostics: FeatureBucket[];
  topReplayOutcomeResearchOnly: FeatureBucket[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const separatorSimulation = readFlag(args, '--separator-simulation');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!separatorSimulation) throw new Error('--separator-simulation is required.');
  return {
    broadValidation,
    separatorSimulation,
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

function isWinner(row: BroadRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: BroadRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: BroadRow[]): number | null {
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
  if (!Number.isFinite(hour)) return 'unknown';
  return `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`;
}

function mfeBucket(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'mfe_unknown';
  if (value < 0.5) return 'mfe_lt_0_5r';
  if (value < 1) return 'mfe_0_5_to_1r';
  if (value < 1.5) return 'mfe_1_to_1_5r';
  if (value < 2) return 'mfe_1_5_to_2r';
  return 'mfe_gte_2r';
}

function maeBucket(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'mae_unknown';
  if (value < 0.5) return 'mae_lt_0_5r';
  if (value < 1) return 'mae_0_5_to_1r';
  if (value < 2) return 'mae_1_to_2r';
  if (value < 4) return 'mae_2_to_4r';
  return 'mae_gte_4r';
}

function firstReplayEvent(row: BroadRow): string {
  if (row.firstReplayBarTime && row.stopHitTime && row.firstReplayBarTime === row.stopHitTime) return 'first_replay_bar_stop';
  if (row.firstReplayBarTime && row.t1HitTime && row.firstReplayBarTime === row.t1HitTime) return 'first_replay_bar_t1';
  if (row.firstReplayBarTime && row.t2HitTime && row.firstReplayBarTime === row.t2HitTime) return 'first_replay_bar_t2';
  return 'first_replay_bar_neutral';
}

function makeBucket(feature: string, key: string, scope: FeatureBucket['scope'], rows: BroadRow[], totalLosses: number): FeatureBucket {
  return {
    feature,
    key,
    scope,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    lossShare: totalLosses ? round(rows.filter(isLoss).length / totalLosses) : 0,
  };
}

function collectBuckets(rows: BroadRow[], totalLosses: number, feature: string, scope: FeatureBucket['scope'], keyFn: (row: BroadRow) => string | string[]): FeatureBucket[] {
  const grouped = new Map<string, BroadRow[]>();
  for (const row of rows) {
    const keys = keyFn(row);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      grouped.set(key, [...(grouped.get(key) || []), row]);
    }
  }
  return [...grouped.entries()]
    .map(([key, bucketRows]) => makeBucket(feature, key, scope, bucketRows, totalLosses))
    .filter((bucket) => bucket.losses > 0)
    .sort((a, b) => b.losses - a.losses || a.winners - b.winners || a.oneMesPl! - b.oneMesPl! || a.key.localeCompare(b.key));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport, 'markdown'>): string {
  return [
    '# HTF MSS Broad Feature Search',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only feature search. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input selected rows: ${report.summary.inputSelectedRows}.`,
    `- Input loss rows: ${report.summary.inputLossRows}.`,
    `- Top pre-entry candidate: ${report.summary.topPreEntryCandidate ?? '-'}.`,
    `- Top replay-only separator: ${report.summary.topReplayOnlySeparator ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Pre-Entry Candidates',
    ...report.topPreEntryCandidates.slice(0, 10).map((bucket) => `- ${bucket.feature}:${bucket.key} rows ${bucket.rows}, W/L/U ${bucket.winners}/${bucket.losses}/${bucket.unresolved}, P/L ${bucket.oneMesPl ?? '-'}, lossShare ${bucket.lossShare}.`),
    '',
    '## Replay/Outcome Research-Only Buckets',
    ...report.topReplayOutcomeResearchOnly.slice(0, 10).map((bucket) => `- ${bucket.feature}:${bucket.key} rows ${bucket.rows}, W/L/U ${bucket.winners}/${bucket.losses}/${bucket.unresolved}, P/L ${bucket.oneMesPl ?? '-'}, lossShare ${bucket.lossShare}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport(args: {
  reportDir: string;
  broadValidationPath: string;
  separatorSimulationPath: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  separatorSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport {
  const rows = (args.broadValidation?.selectedRows || []) as BroadRow[];
  const totalLosses = rows.filter(isLoss).length;
  const preEntryBuckets = [
    ...collectBuckets(rows, totalLosses, 'session', 'pre_entry_candidate', (row) => row.session),
    ...collectBuckets(rows, totalLosses, 'direction', 'pre_entry_candidate', (row) => row.direction),
    ...collectBuckets(rows, totalLosses, 'timeBucket', 'pre_entry_candidate', (row) => timeBucket(row.proofTime)),
    ...collectBuckets(rows, totalLosses, 'riskBucket', 'pre_entry_candidate', (row) => riskBucket(row.riskPoints)),
    ...collectBuckets(rows, totalLosses, 'fineRiskBucket', 'pre_entry_candidate', (row) => fineRiskBucket(row.riskPoints)),
    ...collectBuckets(rows, totalLosses, 'sessionDirectionTimeRisk', 'pre_entry_candidate', (row) => `${row.session}|${row.direction}|${timeBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`),
  ].filter((bucket) => bucket.losses >= 4);
  const regimeBuckets = [
    ...collectBuckets(rows, totalLosses, 'tradeDate', 'regime_diagnostic', (row) => row.tradeDate),
    ...collectBuckets(rows, totalLosses, 'dateSession', 'regime_diagnostic', (row) => `${row.tradeDate}|${row.session}`),
  ].filter((bucket) => bucket.losses >= 3);
  const replayOnlyBuckets = [
    ...collectBuckets(rows, totalLosses, 'mfeBucket', 'replay_outcome_research_only', (row) => mfeBucket(row.mfeR)),
    ...collectBuckets(rows, totalLosses, 'maeBucket', 'replay_outcome_research_only', (row) => maeBucket(row.maeR)),
    ...collectBuckets(rows, totalLosses, 'firstReplayEvent', 'replay_outcome_research_only', firstReplayEvent),
    ...collectBuckets(rows, totalLosses, 'separatorTag', 'replay_outcome_research_only', (row) => row.separatorTags?.length ? row.separatorTags : ['separator_tag_none']),
  ].filter((bucket) => bucket.losses >= 3);
  const rank = (a: FeatureBucket, b: FeatureBucket): number => b.losses - a.losses || a.winners - b.winners || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0);
  const topPreEntryCandidates = [...preEntryBuckets].sort(rank).slice(0, 25);
  const topRegimeDiagnostics = [...regimeBuckets].sort(rank).slice(0, 25);
  const topReplayOutcomeResearchOnly = [...replayOnlyBuckets].sort(rank).slice(0, 25);
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.separatorSimulation ? 'missing HTF-MSS broad loss separator simulation report' : null,
    args.separatorSimulation && args.separatorSimulation.status !== 'pass' ? `HTF-MSS broad loss separator simulation status ${args.separatorSimulation.status}` : null,
    args.separatorSimulation && args.separatorSimulation.summary.recommendation !== 'continue_feature_search'
      ? `HTF-MSS broad loss separator simulation recommendation ${args.separatorSimulation.summary.recommendation}`
      : null,
    !rows.length ? 'no broad selected rows available' : null,
    totalLosses === 0 ? 'no selected loss rows available' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_feature_search',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      separatorSimulationPath: args.separatorSimulationPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      featureSearchOnly: true,
      outcomeFieldsResearchOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputSelectedRows: rows.length,
      inputLossRows: totalLosses,
      preEntryBuckets: preEntryBuckets.length,
      regimeDiagnosticBuckets: regimeBuckets.length,
      replayOutcomeResearchOnlyBuckets: replayOnlyBuckets.length,
      topPreEntryCandidate: topPreEntryCandidates[0] ? `${topPreEntryCandidates[0].feature}:${topPreEntryCandidates[0].key}` : null,
      topReplayOnlySeparator: topReplayOutcomeResearchOnly[0] ? `${topReplayOutcomeResearchOnly[0].feature}:${topReplayOutcomeResearchOnly[0].key}` : null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : topPreEntryCandidates.length ? 'simulate_pre_entry_feature_candidates' : 'continue_feature_search',
    },
    topPreEntryCandidates,
    topRegimeDiagnostics,
    topReplayOutcomeResearchOnly,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this feature search.']
      : [
        'Simulate the top pre-entry candidates before any implementation request.',
        'Use replay/outcome buckets only to explain failures and guide feature discovery; do not use MFE/MAE/hit-time fields as live filters.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-feature-search-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    separatorSimulationPath: options.separatorSimulation,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    separatorSimulation: fs.existsSync(options.separatorSimulation) ? readJson(options.separatorSimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topPreEntryCandidates: report.topPreEntryCandidates.slice(0, 10), topReplayOutcomeResearchOnly: report.topReplayOutcomeResearchOnly.slice(0, 10), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
