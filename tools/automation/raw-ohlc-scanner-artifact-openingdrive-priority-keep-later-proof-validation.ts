import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport,
  type RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-changed-slate-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-rule-miner';

type CaseRow = RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport['cases'][number];

interface CliOptions {
  keepRuleMiner: string;
  fullSlateReports: string[];
  outDir: string;
  json: boolean;
}

interface ValidationRow {
  fullSlateReport: string;
  ruleId: string;
  rows: number;
  winners: number;
  losses: number;
  winRate: number | null;
  baselineTopOneMesPl: number | null;
  replacementOneMesPl: number | null;
  deltaIfSuppressedOneMesPl: number | null;
  recommendation: 'validates_keep_later_proof' | 'too_small' | 'mixed_or_negative';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_validation';
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
    keepRuleMiner: string;
    fullSlateReports: string[];
  };
  assumptions: {
    consumesSavedReportsOnly: true;
    rebuildsChangedSlateCasesLocally: true;
    validatesNoLookaheadRuleOnly: true;
    outcomeUsedOnlyForResearchLabels: true;
    noLiveRuleInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    fullSlateReports: number;
    ruleId: string | null;
    validationRows: number;
    aggregateRows: number;
    aggregateWinners: number;
    aggregateLosses: number;
    aggregateWinRate: number | null;
    aggregateDeltaIfSuppressedOneMesPl: number | null;
    separateValidationReports: number;
    installableSeparatorFound: false;
    livePromotionAllowedRows: 0;
    recommendation: 'validate_on_broader_package_next' | 'candidate_holds_research_only' | 'candidate_rejected' | 'fix_inputs';
  };
  rows: ValidationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MIN_VALIDATION_ROWS = 10;
const MIN_WIN_RATE = 0.75;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  return fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function matchingFiles(outDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(outDir)) return [];
  return fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const keepRuleMiner = readFlag(argv, '--keep-rule-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-rule-miner-\d+\.json$/);
  if (!keepRuleMiner) throw new Error('--keep-rule-miner is required.');
  const fullSlateReports = splitPaths(readFlag(argv, '--full-slate-reports'));
  return {
    keepRuleMiner: path.resolve(keepRuleMiner),
    fullSlateReports: (fullSlateReports.length
      ? fullSlateReports
      : matchingFiles(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run-\d+\.json$/)
    ).map((item) => path.resolve(item)),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function featureValue(row: CaseRow, feature: string): string {
  if (feature === 'session') return row.session;
  if (feature === 'direction') return row.baselineDirection;
  if (feature === 'ordinal') {
    if (row.duplicateOrdinal <= 2) return 'ordinal_2';
    if (row.duplicateOrdinal <= 5) return 'ordinal_3_to_5';
    if (row.duplicateOrdinal <= 10) return 'ordinal_6_to_10';
    return 'ordinal_11_plus';
  }
  if (feature === 'age') {
    if (row.minutesSinceCampaignFirst <= 5) return 'age_0_to_5m';
    if (row.minutesSinceCampaignFirst <= 15) return 'age_6_to_15m';
    if (row.minutesSinceCampaignFirst <= 30) return 'age_16_to_30m';
    if (row.minutesSinceCampaignFirst <= 60) return 'age_31_to_60m';
    return 'age_61m_plus';
  }
  if (feature === 'slate_size') {
    if (row.candidateRows <= 1) return 'solo_slate';
    if (row.candidateRows === 2) return 'two_candidate_slate';
    return 'three_plus_candidate_slate';
  }
  if (feature === 'replacement') return row.replacementSetupType || 'no_replacement';
  return 'unknown';
}

function matchesRule(row: CaseRow, ruleId: string): boolean {
  return ruleId.split(' + ').every((part) => {
    const [feature, bucket] = part.split(':');
    return Boolean(feature && bucket) && featureValue(row, feature) === bucket;
  });
}

function validateRule(fullSlateReportPath: string, fullSlateReport: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport, ruleId: string): ValidationRow {
  const changedSlateReport = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport({
    fullSlateDryRunPath: fullSlateReportPath,
    fullSlateDryRun: fullSlateReport,
  });
  const rows = changedSlateReport.cases.filter((row) => matchesRule(row, ruleId));
  const winners = rows.filter((row) => row.duplicateOutcomeClass === 'winner').length;
  const losses = rows.filter((row) => row.duplicateOutcomeClass === 'loss').length;
  const winRate = rows.length ? round(winners / rows.length) : null;
  const deltaIfSuppressedOneMesPl = sum(rows.map((row) => row.deltaTopOneMesPl));
  const recommendation = rows.length < MIN_VALIDATION_ROWS
    ? 'too_small'
    : (winRate ?? 0) >= MIN_WIN_RATE && (deltaIfSuppressedOneMesPl ?? 0) < 0
      ? 'validates_keep_later_proof'
      : 'mixed_or_negative';
  return {
    fullSlateReport: fullSlateReportPath,
    ruleId,
    rows: rows.length,
    winners,
    losses,
    winRate,
    baselineTopOneMesPl: sum(rows.map((row) => row.baselineTopOneMesPl)),
    replacementOneMesPl: sum(rows.map((row) => row.replacementOneMesPl)),
    deltaIfSuppressedOneMesPl,
    recommendation,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Keep-Later-Proof Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation. It rebuilds changed-slate cases from saved full-slate reports and validates the discovered no-lookahead rule in memory only.',
    '',
    '## Summary',
    `- Full-slate reports: ${report.summary.fullSlateReports}.`,
    `- Rule: ${report.summary.ruleId ?? '-'}.`,
    `- Aggregate rows: ${report.summary.aggregateRows}.`,
    `- Aggregate winners/losses: ${report.summary.aggregateWinners}/${report.summary.aggregateLosses}.`,
    `- Aggregate win rate: ${report.summary.aggregateWinRate ?? '-'}.`,
    `- Aggregate suppression delta: ${report.summary.aggregateDeltaIfSuppressedOneMesPl ?? '-'}.`,
    `- Separate validation reports: ${report.summary.separateValidationReports}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Report | Rule | Rows | Winners | Losses | Win Rate | Baseline P/L | Replacement P/L | Suppression Delta | Recommendation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.rows.map((row) => `| ${path.basename(row.fullSlateReport)} | ${row.ruleId} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.winRate ?? '-'} | ${row.baselineTopOneMesPl ?? '-'} | ${row.replacementOneMesPl ?? '-'} | ${row.deltaIfSuppressedOneMesPl ?? '-'} | ${row.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport(args: {
  keepRuleMinerPath: string;
  keepRuleMiner: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport | null;
  fullSlateReports: Array<{ path: string; report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport | null }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport {
  const ruleId = args.keepRuleMiner?.summary.bestRuleId || null;
  const rows = ruleId
    ? args.fullSlateReports
      .filter((item): item is { path: string; report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport } => Boolean(item.report))
      .map((item) => validateRule(item.path, item.report, ruleId))
    : [];
  const aggregateRows = rows.reduce((total, row) => total + row.rows, 0);
  const aggregateWinners = rows.reduce((total, row) => total + row.winners, 0);
  const aggregateLosses = rows.reduce((total, row) => total + row.losses, 0);
  const aggregateDeltaIfSuppressedOneMesPl = sum(rows.map((row) => row.deltaIfSuppressedOneMesPl));
  const aggregateWinRate = aggregateRows ? round(aggregateWinners / aggregateRows) : null;
  const discoveryFullSlate = args.keepRuleMiner?.source.changedSlateMiner && fs.existsSync(args.keepRuleMiner.source.changedSlateMiner)
    ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport>(args.keepRuleMiner.source.changedSlateMiner).source.fullSlateDryRun
    : null;
  const separateValidationReports = rows.filter((row) => discoveryFullSlate && path.resolve(row.fullSlateReport).toLowerCase() !== path.resolve(discoveryFullSlate).toLowerCase()).length;
  const blockers = [
    !args.keepRuleMiner ? 'missing keep-later-proof rule miner report' : null,
    args.keepRuleMiner && args.keepRuleMiner.status !== 'pass' ? `keep-later-proof rule miner status ${args.keepRuleMiner.status}` : null,
    !ruleId ? 'missing best rule id' : null,
    args.fullSlateReports.length === 0 ? 'no full-slate reports supplied' : null,
    args.fullSlateReports.some((item) => !item.report) ? 'one or more full-slate reports could not be loaded' : null,
    rows.length === 0 ? 'no validation rows produced' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : separateValidationReports === 0
      ? 'validate_on_broader_package_next'
      : aggregateRows >= MIN_VALIDATION_ROWS && (aggregateWinRate ?? 0) >= MIN_WIN_RATE && (aggregateDeltaIfSuppressedOneMesPl ?? 0) < 0
        ? 'candidate_holds_research_only'
        : 'candidate_rejected';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      keepRuleMiner: args.keepRuleMinerPath,
      fullSlateReports: args.fullSlateReports.map((item) => item.path),
    },
    assumptions: {
      consumesSavedReportsOnly: true,
      rebuildsChangedSlateCasesLocally: true,
      validatesNoLookaheadRuleOnly: true,
      outcomeUsedOnlyForResearchLabels: true,
      noLiveRuleInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      fullSlateReports: args.fullSlateReports.length,
      ruleId,
      validationRows: rows.length,
      aggregateRows,
      aggregateWinners,
      aggregateLosses,
      aggregateWinRate,
      aggregateDeltaIfSuppressedOneMesPl,
      separateValidationReports,
      installableSeparatorFound: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'candidate_holds_research_only'
      ? [
        'The keep-later-proof candidate held on the supplied separate validation reports, but it remains research-only.',
        'Next phase may create a dry-run selector proposal with approval-boundary proof before any scanner-visible change.',
      ]
      : recommendation === 'validate_on_broader_package_next'
        ? [
          'Only the discovery full-slate report was available. Generate or supply broader full-slate reports before interpreting this as validation.',
          'Do not install a rank boost or duplicate rule from in-sample validation.',
        ]
        : recommendation === 'candidate_rejected'
          ? ['The keep-later-proof candidate did not hold on validation. Keep mining; do not install.']
          : ['Fix validation inputs before interpreting the candidate.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport({
    keepRuleMinerPath: options.keepRuleMiner,
    keepRuleMiner: readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport>(options.keepRuleMiner),
    fullSlateReports: options.fullSlateReports.map((reportPath) => ({
      path: reportPath,
      report: readJson<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport>(reportPath),
    })),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
