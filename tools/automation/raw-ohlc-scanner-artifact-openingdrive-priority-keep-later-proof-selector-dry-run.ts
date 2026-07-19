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
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-validation';

type CaseRow = RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport['cases'][number];

interface CliOptions {
  validationReport: string;
  outDir: string;
  json: boolean;
}

interface SelectorRow {
  selectorId: string;
  rows: number;
  keepRows: number;
  replacementRows: number;
  selectedOneMesPl: number | null;
  keepAllOneMesPl: number | null;
  replaceAllOneMesPl: number | null;
  deltaVsKeepAllOneMesPl: number | null;
  deltaVsReplaceAllOneMesPl: number | null;
  recommendation: 'best_research_candidate' | 'loses_to_keep_all' | 'loses_to_replace_all' | 'benchmark';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_dry_run';
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
    validationReport: string;
    ruleId: string | null;
    fullSlateReports: string[];
  };
  assumptions: {
    consumesSavedValidationAndFullSlateReportsOnly: true;
    simulatesSelectionOnly: true;
    usesNoLookaheadCompanionFieldsOnly: true;
    outcomeUsedOnlyForResearchLabels: true;
    noLiveRuleInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    cases: number;
    selectors: number;
    bestSelectorId: string | null;
    bestSelectedOneMesPl: number | null;
    keepAllOneMesPl: number | null;
    replaceAllOneMesPl: number | null;
    bestDeltaVsKeepAllOneMesPl: number | null;
    installableSeparatorFound: false;
    livePromotionAllowedRows: 0;
    recommendation: 'selector_candidate_research_only' | 'keep_all_remains_best' | 'fix_inputs';
  };
  selectors: SelectorRow[];
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

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  return fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const validationReport = readFlag(argv, '--validation-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-validation-\d+\.json$/);
  if (!validationReport) throw new Error('--validation-report is required.');
  return {
    validationReport: path.resolve(validationReport),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport['authority'] {
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

function ordinalBucket(value: number): string {
  if (value <= 2) return 'ordinal_2';
  if (value <= 5) return 'ordinal_3_to_5';
  if (value <= 10) return 'ordinal_6_to_10';
  return 'ordinal_11_plus';
}

function ageBucket(value: number): string {
  if (value <= 5) return 'age_0_to_5m';
  if (value <= 15) return 'age_6_to_15m';
  if (value <= 30) return 'age_16_to_30m';
  if (value <= 60) return 'age_31_to_60m';
  return 'age_61m_plus';
}

function slateSizeBucket(value: number): string {
  if (value <= 1) return 'solo_slate';
  if (value === 2) return 'two_candidate_slate';
  return 'three_plus_candidate_slate';
}

function matchesRule(row: CaseRow, ruleId: string): boolean {
  return ruleId.split(' + ').every((part) => {
    const [feature, bucket] = part.split(':');
    if (feature === 'session') return row.session === bucket;
    if (feature === 'direction') return row.baselineDirection === bucket;
    if (feature === 'ordinal') return ordinalBucket(row.duplicateOrdinal) === bucket;
    if (feature === 'age') return ageBucket(row.minutesSinceCampaignFirst) === bucket;
    if (feature === 'slate_size') return slateSizeBucket(row.candidateRows) === bucket;
    if (feature === 'replacement') return (row.replacementSetupType || 'no_replacement') === bucket;
    return false;
  });
}

function buildCases(validationReport: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport): CaseRow[] {
  const ruleId = validationReport.summary.ruleId;
  if (!ruleId) return [];
  return validationReport.source.fullSlateReports.flatMap((fullSlateReportPath) => {
    const fullSlate = readJson<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport>(fullSlateReportPath);
    const changedSlate = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport({
      fullSlateDryRunPath: fullSlateReportPath,
      fullSlateDryRun: fullSlate,
    });
    return changedSlate.cases.filter((row) => matchesRule(row, ruleId));
  });
}

const SELECTORS: Array<[string, (row: CaseRow) => 'keep' | 'replacement']> = [
  ['benchmark_keep_all_later_sweep', () => 'keep'],
  ['benchmark_replace_all', () => 'replacement'],
  ['keep_long_else_replacement', (row) => row.baselineDirection === 'LONG' ? 'keep' : 'replacement'],
  ['keep_lunch_else_replacement', (row) => row.session === 'lunch' ? 'keep' : 'replacement'],
  ['keep_long_or_lunch_else_replacement', (row) => row.baselineDirection === 'LONG' || row.session === 'lunch' ? 'keep' : 'replacement'],
  ['replace_short_morning_intraday_or_late_else_keep', (row) => {
    const age = ageBucket(row.minutesSinceCampaignFirst);
    const lateProof = age === 'age_31_to_60m' || age === 'age_61m_plus' || ordinalBucket(row.duplicateOrdinal) === 'ordinal_11_plus';
    return row.baselineDirection === 'SHORT' || row.session === 'morning' || row.replacementSetupType === 'IntradayMssMicroContinuation' || lateProof
      ? 'replacement'
      : 'keep';
  }],
  ['keep_early_mid_not_intraday_replacement', (row) => {
    const age = ageBucket(row.minutesSinceCampaignFirst);
    const earlyMid = age === 'age_0_to_5m' || age === 'age_16_to_30m' || ordinalBucket(row.duplicateOrdinal) !== 'ordinal_11_plus';
    return earlyMid && row.replacementSetupType !== 'IntradayMssMicroContinuation' ? 'keep' : 'replacement';
  }],
];

function buildSelectorRow(selectorId: string, choose: (row: CaseRow) => 'keep' | 'replacement', cases: CaseRow[], keepAllOneMesPl: number | null, replaceAllOneMesPl: number | null): SelectorRow {
  const picks = cases.map((row) => ({ row, pick: choose(row) }));
  const selectedOneMesPl = sum(picks.map(({ row, pick }) => pick === 'keep' ? row.baselineTopOneMesPl : row.replacementOneMesPl));
  const deltaVsKeepAllOneMesPl = selectedOneMesPl === null || keepAllOneMesPl === null ? null : round(selectedOneMesPl - keepAllOneMesPl);
  const deltaVsReplaceAllOneMesPl = selectedOneMesPl === null || replaceAllOneMesPl === null ? null : round(selectedOneMesPl - replaceAllOneMesPl);
  return {
    selectorId,
    rows: cases.length,
    keepRows: picks.filter((item) => item.pick === 'keep').length,
    replacementRows: picks.filter((item) => item.pick === 'replacement').length,
    selectedOneMesPl,
    keepAllOneMesPl,
    replaceAllOneMesPl,
    deltaVsKeepAllOneMesPl,
    deltaVsReplaceAllOneMesPl,
    recommendation: selectorId.startsWith('benchmark_')
      ? 'benchmark'
      : (deltaVsKeepAllOneMesPl ?? 0) > 0 && (deltaVsReplaceAllOneMesPl ?? 0) > 0
        ? 'best_research_candidate'
        : (deltaVsKeepAllOneMesPl ?? 0) < 0
          ? 'loses_to_keep_all'
          : 'loses_to_replace_all',
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Keep-Later-Proof Selector Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selector simulation. No scanner-visible behavior is installed.',
    '',
    '## Summary',
    `- Cases: ${report.summary.cases}.`,
    `- Best selector: ${report.summary.bestSelectorId ?? '-'}.`,
    `- Best selected P/L: ${report.summary.bestSelectedOneMesPl ?? '-'}.`,
    `- Keep-all / replace-all P/L: ${report.summary.keepAllOneMesPl ?? '-'} / ${report.summary.replaceAllOneMesPl ?? '-'}.`,
    `- Best delta vs keep-all: ${report.summary.bestDeltaVsKeepAllOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selectors',
    '| Selector | Rows | Keep | Replace | Selected P/L | Keep-All P/L | Replace-All P/L | Delta vs Keep | Delta vs Replace | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.selectors.map((row) => `| ${row.selectorId} | ${row.rows} | ${row.keepRows} | ${row.replacementRows} | ${row.selectedOneMesPl ?? '-'} | ${row.keepAllOneMesPl ?? '-'} | ${row.replaceAllOneMesPl ?? '-'} | ${row.deltaVsKeepAllOneMesPl ?? '-'} | ${row.deltaVsReplaceAllOneMesPl ?? '-'} | ${row.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport(args: {
  validationReportPath: string;
  validationReport: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport {
  const cases = args.validationReport ? buildCases(args.validationReport) : [];
  const keepAllOneMesPl = sum(cases.map((row) => row.baselineTopOneMesPl));
  const replaceAllOneMesPl = sum(cases.map((row) => row.replacementOneMesPl));
  const selectors = SELECTORS
    .map(([selectorId, choose]) => buildSelectorRow(selectorId, choose, cases, keepAllOneMesPl, replaceAllOneMesPl))
    .sort((a, b) =>
      Number(b.recommendation === 'best_research_candidate') - Number(a.recommendation === 'best_research_candidate') ||
      (b.selectedOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.selectedOneMesPl ?? Number.NEGATIVE_INFINITY) ||
      a.selectorId.localeCompare(b.selectorId));
  const best = selectors.find((row) => !row.selectorId.startsWith('benchmark_')) || null;
  const blockers = [
    !args.validationReport ? 'missing validation report' : null,
    args.validationReport && args.validationReport.status !== 'pass' ? `validation report status ${args.validationReport.status}` : null,
    args.validationReport && !args.validationReport.summary.ruleId ? 'validation report has no rule id' : null,
    cases.length === 0 ? 'no validated cases found' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : best && (best.deltaVsKeepAllOneMesPl ?? 0) > 0
      ? 'selector_candidate_research_only'
      : 'keep_all_remains_best';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      validationReport: args.validationReportPath,
      ruleId: args.validationReport?.summary.ruleId || null,
      fullSlateReports: args.validationReport?.source.fullSlateReports || [],
    },
    assumptions: {
      consumesSavedValidationAndFullSlateReportsOnly: true,
      simulatesSelectionOnly: true,
      usesNoLookaheadCompanionFieldsOnly: true,
      outcomeUsedOnlyForResearchLabels: true,
      noLiveRuleInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      cases: cases.length,
      selectors: selectors.length,
      bestSelectorId: best?.selectorId || null,
      bestSelectedOneMesPl: best?.selectedOneMesPl ?? null,
      keepAllOneMesPl,
      replaceAllOneMesPl,
      bestDeltaVsKeepAllOneMesPl: best?.deltaVsKeepAllOneMesPl ?? null,
      installableSeparatorFound: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    selectors,
    blockers,
    recommendations: recommendation === 'selector_candidate_research_only'
      ? [
        'A selector outperformed keep-all in this dry run, but it remains research-only.',
        'Next phase should validate the best selector on non-overlapping packages and prove approval-boundary cleanliness before any proposal.',
      ]
      : recommendation === 'keep_all_remains_best'
        ? ['Keep-all later Sweep proof remains the best tested policy. Do not install replacement routing.']
        : ['Fix selector dry-run inputs before interpreting results.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport({
    validationReportPath: options.validationReport,
    validationReport: readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport>(options.validationReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, selectors: report.selectors, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
