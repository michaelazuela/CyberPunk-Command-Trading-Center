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

interface EnrichedCaseRow extends CaseRow {
  fullSlateReport: string;
  sourceRange: string;
  sourceRangeKind: 'single_day' | 'multi_day' | 'unknown';
}

interface GroupRow {
  groupId: string;
  feature: string;
  bucket: string;
  rows: number;
  winners: number;
  losses: number;
  winRate: number | null;
  baselineTopOneMesPl: number | null;
  replacementOneMesPl: number | null;
  deltaIfSuppressedOneMesPl: number | null;
  recommendation: 'keep_later_proof_candidate' | 'replacement_better_candidate' | 'mixed_or_too_small';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_companion_drilldown';
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
    filtersToValidatedRuleRowsOnly: true;
    minesNoLookaheadCompanionFields: true;
    outcomeUsedOnlyForResearchLabels: true;
    noLiveRuleInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    fullSlateReports: number;
    cases: number;
    groupRows: number;
    keepCandidateGroups: number;
    replacementBetterGroups: number;
    bestKeepGroup: string | null;
    bestReplacementBetterGroup: string | null;
    installableSeparatorFound: false;
    livePromotionAllowedRows: 0;
    recommendation: 'review_keep_and_reject_companions' | 'no_companion_signal' | 'fix_inputs';
  };
  groups: GroupRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MIN_ROWS = 10;
const MIN_WIN_RATE = 0.75;

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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownArgs(
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

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport['authority'] {
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

function sourceRangeFrom(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport): string {
  const file = path.basename(report.source.scannerArtifact);
  const match = file.match(/MES-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})-/);
  return match ? `${match[1]}..${match[2]}` : 'unknown';
}

function sourceRangeKind(range: string): EnrichedCaseRow['sourceRangeKind'] {
  if (range === 'unknown') return 'unknown';
  const [start, end] = range.split('..');
  return start && end && start === end ? 'single_day' : 'multi_day';
}

function matchesRule(row: CaseRow, ruleId: string): boolean {
  return ruleId.split(' + ').every((part) => {
    const [feature, bucket] = part.split(':');
    if (feature === 'session') return row.session === bucket;
    if (feature === 'direction') return row.baselineDirection === bucket;
    if (feature === 'ordinal') return ordinalBucket(row.duplicateOrdinal) === bucket;
    if (feature === 'age') return ageBucket(row.minutesSinceCampaignFirst) === bucket;
    if (feature === 'slate_size') return (row.candidateRows === 2 ? 'two_candidate_slate' : row.candidateRows <= 1 ? 'solo_slate' : 'three_plus_candidate_slate') === bucket;
    if (feature === 'replacement') return (row.replacementSetupType || 'no_replacement') === bucket;
    return false;
  });
}

function buildCases(validationReport: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport): EnrichedCaseRow[] {
  const ruleId = validationReport.summary.ruleId;
  if (!ruleId) return [];
  return validationReport.source.fullSlateReports.flatMap((fullSlateReportPath) => {
    const fullSlate = readJson<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport>(fullSlateReportPath);
    const changedSlate = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport({
      fullSlateDryRunPath: fullSlateReportPath,
      fullSlateDryRun: fullSlate,
    });
    const sourceRange = sourceRangeFrom(fullSlate);
    return changedSlate.cases.filter((row) => matchesRule(row, ruleId)).map((row) => ({
      ...row,
      fullSlateReport: fullSlateReportPath,
      sourceRange,
      sourceRangeKind: sourceRangeKind(sourceRange),
    }));
  });
}

function buildGroup(feature: string, bucket: string, rows: EnrichedCaseRow[]): GroupRow {
  const winners = rows.filter((row) => row.duplicateOutcomeClass === 'winner').length;
  const losses = rows.filter((row) => row.duplicateOutcomeClass === 'loss').length;
  const winRate = rows.length ? round(winners / rows.length) : null;
  const deltaIfSuppressedOneMesPl = sum(rows.map((row) => row.deltaTopOneMesPl));
  const recommendation = rows.length >= MIN_ROWS && (winRate ?? 0) >= MIN_WIN_RATE && (deltaIfSuppressedOneMesPl ?? 0) < 0
    ? 'keep_later_proof_candidate'
    : rows.length >= MIN_ROWS && (deltaIfSuppressedOneMesPl ?? 0) > 0
      ? 'replacement_better_candidate'
      : 'mixed_or_too_small';
  return {
    groupId: `${feature}:${bucket}`,
    feature,
    bucket,
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

function grouped(cases: EnrichedCaseRow[], feature: string, bucketFor: (row: EnrichedCaseRow) => string): GroupRow[] {
  const groups = new Map<string, EnrichedCaseRow[]>();
  for (const row of cases) {
    const bucket = bucketFor(row);
    groups.set(bucket, [...(groups.get(bucket) || []), row]);
  }
  return [...groups.entries()].map(([bucket, rows]) => buildGroup(feature, bucket, rows));
}

function buildGroups(cases: EnrichedCaseRow[]): GroupRow[] {
  return [
    ...grouped(cases, 'source_range_kind', (row) => row.sourceRangeKind),
    ...grouped(cases, 'source_range', (row) => row.sourceRange),
    ...grouped(cases, 'trade_date', (row) => row.tradeDate),
    ...grouped(cases, 'session', (row) => row.session),
    ...grouped(cases, 'direction', (row) => row.baselineDirection),
    ...grouped(cases, 'ordinal', (row) => ordinalBucket(row.duplicateOrdinal)),
    ...grouped(cases, 'age', (row) => ageBucket(row.minutesSinceCampaignFirst)),
    ...grouped(cases, 'replacement', (row) => row.replacementSetupType || 'no_replacement'),
  ].sort((a, b) =>
    Number(b.recommendation === 'keep_later_proof_candidate') - Number(a.recommendation === 'keep_later_proof_candidate') ||
    Number(b.recommendation === 'replacement_better_candidate') - Number(a.recommendation === 'replacement_better_candidate') ||
    Math.abs(b.deltaIfSuppressedOneMesPl ?? 0) - Math.abs(a.deltaIfSuppressedOneMesPl ?? 0) ||
    b.rows - a.rows ||
    a.groupId.localeCompare(b.groupId));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Keep-Later-Proof Companion Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only companion-field drilldown over saved reports. No scanner-visible rule is installed.',
    '',
    '## Summary',
    `- Full-slate reports: ${report.summary.fullSlateReports}.`,
    `- Cases: ${report.summary.cases}.`,
    `- Keep candidate groups: ${report.summary.keepCandidateGroups}.`,
    `- Replacement-better groups: ${report.summary.replacementBetterGroups}.`,
    `- Best keep group: ${report.summary.bestKeepGroup ?? '-'}.`,
    `- Best replacement-better group: ${report.summary.bestReplacementBetterGroup ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Group | Rows | Winners | Losses | Win Rate | Baseline P/L | Replacement P/L | Suppression Delta | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.groups.slice(0, 60).map((row) => `| ${row.groupId} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.winRate ?? '-'} | ${row.baselineTopOneMesPl ?? '-'} | ${row.replacementOneMesPl ?? '-'} | ${row.deltaIfSuppressedOneMesPl ?? '-'} | ${row.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport(args: {
  validationReportPath: string;
  validationReport: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport {
  const cases = args.validationReport ? buildCases(args.validationReport) : [];
  const groups = buildGroups(cases);
  const keepGroups = groups.filter((row) => row.recommendation === 'keep_later_proof_candidate');
  const rejectGroups = groups.filter((row) => row.recommendation === 'replacement_better_candidate');
  const blockers = [
    !args.validationReport ? 'missing validation report' : null,
    args.validationReport && args.validationReport.status !== 'pass' ? `validation report status ${args.validationReport.status}` : null,
    args.validationReport && !args.validationReport.summary.ruleId ? 'validation report has no rule id' : null,
    cases.length === 0 ? 'no validated rule cases found' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : keepGroups.length || rejectGroups.length
      ? 'review_keep_and_reject_companions'
      : 'no_companion_signal';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_companion_drilldown',
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
      filtersToValidatedRuleRowsOnly: true,
      minesNoLookaheadCompanionFields: true,
      outcomeUsedOnlyForResearchLabels: true,
      noLiveRuleInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      fullSlateReports: args.validationReport?.source.fullSlateReports.length || 0,
      cases: cases.length,
      groupRows: groups.length,
      keepCandidateGroups: keepGroups.length,
      replacementBetterGroups: rejectGroups.length,
      bestKeepGroup: keepGroups[0]?.groupId || null,
      bestReplacementBetterGroup: rejectGroups[0]?.groupId || null,
      installableSeparatorFound: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    groups,
    blockers,
    recommendations: recommendation === 'review_keep_and_reject_companions'
      ? [
        'Review the keep and replacement-better companion groups before proposing any scanner-visible selector.',
        'If a proposal is made, it must stay approval-boundary clean and avoid canExecute, Discord, Supabase, bridge, entry, stop, target, or risk changes.',
      ]
      : recommendation === 'no_companion_signal'
        ? ['No no-lookahead companion field separated the two-candidate set. Keep this research-only.']
        : ['Fix validation inputs before interpreting companion groups.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-companion-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofCompanionDrilldownReport({
    validationReportPath: options.validationReport,
    validationReport: readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofValidationReport>(options.validationReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
