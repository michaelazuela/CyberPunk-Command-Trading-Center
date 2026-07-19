import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport,
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-outcome-join';

interface CliOptions {
  outcomeJoin: string;
  outDir: string;
  json: boolean;
}

type SeparatorDimension =
  | 'selectorDecision'
  | 'setupType'
  | 'direction'
  | 'sessionType'
  | 'setupType|selectorDecision'
  | 'setupType|direction'
  | 'sessionType|setupType';

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorBucket {
  dimension: SeparatorDimension;
  value: string;
  joinedGroups: number;
  shadowRows: number;
  outcomeEvidenceCount: number;
  positiveGroups: number;
  negativeGroups: number;
  mixedGroups: number;
  grossOneMesPl: number;
  avgOneMesPlPerGroup: number;
  winLossEvidenceRatio: number | null;
  recommendation: 'candidate_positive_separator' | 'candidate_negative_separator' | 'mixed_or_underpowered';
  sampleKeys: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_separator_miner';
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
    outcomeJoinPath: string;
  };
  summary: {
    joinedRowsStudied: number;
    noEvidenceRowsExcluded: number;
    buckets: number;
    positiveSeparatorCandidates: number;
    negativeSeparatorCandidates: number;
    mixedOrUnderpoweredBuckets: number;
    grossStudiedOneMesPl: number;
    recommendation: 'expand_outcome_coverage_before_live_proposal' | 'review_candidate_separators' | 'fix_inputs';
  };
  buckets: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorBucket[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MIN_GROUPS_FOR_SEPARATOR = 3;
const MIN_EVIDENCE_FOR_SEPARATOR = 10;

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
  const outcomeJoin = readFlag(args, '--outcome-join') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-outcome-join-\d+\.json$/);
  if (!outcomeJoin) throw new Error('--outcome-join is required.');
  return {
    outcomeJoin: path.resolve(outcomeJoin),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport['authority'] {
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

function dimensionValue(row: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow, dimension: SeparatorDimension): string {
  if (dimension === 'setupType|selectorDecision') return `${row.setupType}|${row.selectorDecision}`;
  if (dimension === 'setupType|direction') return `${row.setupType}|${row.direction}`;
  if (dimension === 'sessionType|setupType') return `${row.sessionType}|${row.setupType}`;
  return String(row[dimension]);
}

function sampleKey(row: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow): string {
  return `${row.tradeDate}|${row.sessionType}|${row.setupType}|${row.direction}|${row.selectorDecision}`;
}

function bucketRecommendation(args: {
  joinedGroups: number;
  outcomeEvidenceCount: number;
  positiveGroups: number;
  negativeGroups: number;
  grossOneMesPl: number;
}): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorBucket['recommendation'] {
  const enoughEvidence = args.joinedGroups >= MIN_GROUPS_FOR_SEPARATOR && args.outcomeEvidenceCount >= MIN_EVIDENCE_FOR_SEPARATOR;
  if (!enoughEvidence) return 'mixed_or_underpowered';
  if (args.grossOneMesPl > 0 && args.negativeGroups === 0 && args.positiveGroups > 0) return 'candidate_positive_separator';
  if (args.grossOneMesPl < 0 && args.positiveGroups === 0 && args.negativeGroups > 0) return 'candidate_negative_separator';
  return 'mixed_or_underpowered';
}

function buildBucket(args: {
  dimension: SeparatorDimension;
  value: string;
  rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow[];
}): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorBucket {
  const wins = args.rows.reduce((sum, row) => sum + row.wins, 0);
  const losses = args.rows.reduce((sum, row) => sum + row.losses, 0);
  const grossOneMesPl = round(args.rows.reduce((sum, row) => sum + row.grossOneMesPl, 0));
  const outcomeEvidenceCount = args.rows.reduce((sum, row) => sum + row.outcomeEvidenceCount, 0);
  const joinedGroups = args.rows.length;
  const positiveGroups = args.rows.filter((row) => row.outcomeClassification === 'positive').length;
  const negativeGroups = args.rows.filter((row) => row.outcomeClassification === 'negative').length;
  const mixedGroups = args.rows.filter((row) => row.outcomeClassification === 'mixed').length;
  return {
    dimension: args.dimension,
    value: args.value,
    joinedGroups,
    shadowRows: args.rows.reduce((sum, row) => sum + row.shadowRows, 0),
    outcomeEvidenceCount,
    positiveGroups,
    negativeGroups,
    mixedGroups,
    grossOneMesPl,
    avgOneMesPlPerGroup: joinedGroups ? round(grossOneMesPl / joinedGroups) : 0,
    winLossEvidenceRatio: losses ? round(wins / losses) : wins ? wins : null,
    recommendation: bucketRecommendation({
      joinedGroups,
      outcomeEvidenceCount,
      positiveGroups,
      negativeGroups,
      grossOneMesPl,
    }),
    sampleKeys: args.rows.slice(0, 5).map(sampleKey),
  };
}

function buildBuckets(rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow[]): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorBucket[] {
  const dimensions: SeparatorDimension[] = [
    'selectorDecision',
    'setupType',
    'direction',
    'sessionType',
    'setupType|selectorDecision',
    'setupType|direction',
    'sessionType|setupType',
  ];
  const buckets: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorBucket[] = [];
  for (const dimension of dimensions) {
    const grouped = new Map<string, RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow[]>();
    for (const row of rows) {
      const value = dimensionValue(row, dimension);
      grouped.set(value, [...(grouped.get(value) || []), row]);
    }
    for (const [value, groupRows] of grouped) buckets.push(buildBucket({ dimension, value, rows: groupRows }));
  }
  return buckets.sort((a, b) =>
    b.outcomeEvidenceCount - a.outcomeEvidenceCount ||
    b.joinedGroups - a.joinedGroups ||
    b.grossOneMesPl - a.grossOneMesPl ||
    a.dimension.localeCompare(b.dimension) ||
    a.value.localeCompare(b.value)
  );
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Separator Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only separator miner. It consumes a saved outcome-join report only. It does not install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Joined rows studied: ${report.summary.joinedRowsStudied}.`,
    `- No-evidence rows excluded: ${report.summary.noEvidenceRowsExcluded}.`,
    `- Buckets: ${report.summary.buckets}.`,
    `- Positive separator candidates: ${report.summary.positiveSeparatorCandidates}.`,
    `- Negative separator candidates: ${report.summary.negativeSeparatorCandidates}.`,
    `- Mixed/underpowered buckets: ${report.summary.mixedOrUnderpoweredBuckets}.`,
    `- Gross studied one-MES P/L: ${report.summary.grossStudiedOneMesPl}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Buckets',
    '| Dimension | Value | Groups | Shadow Rows | Evidence | Pos | Neg | Mixed | P/L | Avg/Group | W/L Evidence | Recommendation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.buckets.map((bucket) => `| ${bucket.dimension} | ${bucket.value} | ${bucket.joinedGroups} | ${bucket.shadowRows} | ${bucket.outcomeEvidenceCount} | ${bucket.positiveGroups} | ${bucket.negativeGroups} | ${bucket.mixedGroups} | ${bucket.grossOneMesPl} | ${bucket.avgOneMesPlPerGroup} | ${bucket.winLossEvidenceRatio ?? '-'} | ${bucket.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport(args: {
  outcomeJoinPath: string;
  outcomeJoin: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport {
  const rows = args.outcomeJoin?.rows || [];
  const joinedRows = rows.filter((row) => row.outcomeEvidenceCount > 0);
  const buckets = buildBuckets(joinedRows);
  const blockers = [
    !args.outcomeJoin ? 'missing outcome join report' : null,
    args.outcomeJoin && args.outcomeJoin.status !== 'pass' ? `outcome join status ${args.outcomeJoin.status}` : null,
    !joinedRows.length ? 'no joined outcome rows to mine' : null,
  ].filter((item): item is string => Boolean(item));
  const positiveSeparatorCandidates = buckets.filter((bucket) => bucket.recommendation === 'candidate_positive_separator').length;
  const negativeSeparatorCandidates = buckets.filter((bucket) => bucket.recommendation === 'candidate_negative_separator').length;
  const needsCoverage = Boolean(args.outcomeJoin && args.outcomeJoin.summary.unmatchedGroups > args.outcomeJoin.summary.joinedGroups);
  const recommendation = blockers.length
    ? 'fix_inputs'
    : needsCoverage || !positiveSeparatorCandidates
      ? 'expand_outcome_coverage_before_live_proposal'
      : 'review_candidate_separators';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_separator_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      outcomeJoinPath: args.outcomeJoinPath,
    },
    summary: {
      joinedRowsStudied: joinedRows.length,
      noEvidenceRowsExcluded: rows.length - joinedRows.length,
      buckets: buckets.length,
      positiveSeparatorCandidates,
      negativeSeparatorCandidates,
      mixedOrUnderpoweredBuckets: buckets.filter((bucket) => bucket.recommendation === 'mixed_or_underpowered').length,
      grossStudiedOneMesPl: round(joinedRows.reduce((sum, row) => sum + row.grossOneMesPl, 0)),
      recommendation,
    },
    buckets,
    blockers,
    recommendations: recommendation === 'review_candidate_separators'
      ? [
        'Review candidate separators manually and replay against expanded coverage before any scanner-visible proposal.',
        'Keep selector disabled until a separate approval checkpoint proposes live behavior.',
      ]
      : recommendation === 'expand_outcome_coverage_before_live_proposal'
        ? [
          'Expand outcome coverage for unmatched shadow groups before treating any separator as stable.',
          'Use candidate buckets only as research hints; do not install ranking from this report.',
        ]
        : ['Fix or regenerate the outcome join input before continuing.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-separator-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport({
    outcomeJoinPath: options.outcomeJoin,
    outcomeJoin: fs.existsSync(options.outcomeJoin)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport>(options.outcomeJoin)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowSeparatorMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
