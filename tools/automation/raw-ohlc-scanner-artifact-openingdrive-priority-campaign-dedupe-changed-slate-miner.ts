import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run';

type FullSlateReport = RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport;
type FullSlateRow = FullSlateReport['rows'][number];
type FullSlateSlate = FullSlateReport['slates'][number];

interface CliOptions {
  fullSlateDryRun: string;
  outDir: string;
  json: boolean;
}

interface CaseRow {
  slateId: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  baselineTopTicketId: string;
  baselineDirection: string;
  replacementTicketId: string | null;
  replacementSetupType: string | null;
  candidateRows: number;
  duplicateOrdinal: number;
  minutesSinceCampaignFirst: number;
  baselineTopOneMesPl: number | null;
  replacementOneMesPl: number | null;
  deltaTopOneMesPl: number | null;
  duplicateOutcomeClass: 'winner' | 'loss' | 'unresolved';
}

interface FeatureBucket {
  feature: string;
  bucket: string;
  rows: number;
  duplicateWinners: number;
  duplicateLosses: number;
  baselineTopOneMesPl: number | null;
  replacementOneMesPl: number | null;
  deltaIfSuppressedOneMesPl: number | null;
  recommendation: 'keep_later_duplicate_proof' | 'suppress_duplicate_candidate' | 'mixed_do_not_install';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_changed_slate_miner';
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
    fullSlateDryRun: string;
  };
  assumptions: {
    consumesSavedFullSlateDryRunOnly: true;
    usesNoLookaheadBucketFieldsOnly: true;
    outcomeUsedOnlyForResearchLabels: true;
    duplicateSuppressionIsNotInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedFromSuppressedDuplicateSlates: number;
    duplicateWinnerRows: number;
    duplicateLossRows: number;
    baselineTopOneMesPl: number | null;
    replacementOneMesPl: number | null;
    deltaIfSuppressedOneMesPl: number | null;
    bestKeepBucket: string | null;
    bestSuppressBucket: string | null;
    installableSeparatorFound: false;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_duplicate_suppression_rejected' | 'needs_more_changed_slate_mining' | 'fix_inputs';
  };
  buckets: FeatureBucket[];
  cases: CaseRow[];
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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const fullSlateDryRun = readFlag(argv, '--full-slate-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run-\d+\.json$/);
  if (!fullSlateDryRun) throw new Error('--full-slate-dry-run is required.');
  return {
    fullSlateDryRun: path.resolve(fullSlateDryRun),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport['authority'] {
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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutesBetween(start: string, end: string): number {
  return Math.round((timeMs(end) - timeMs(start)) / 60000);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function outcomeClass(row: Pick<FullSlateRow, 'outcomeStatus' | 'outcomeLabel'>): CaseRow['duplicateOutcomeClass'] {
  if (row.outcomeStatus !== 'resolved') return 'unresolved';
  return row.outcomeLabel === 'stopped_before_t1' ? 'loss' : 'winner';
}

function duplicateOrdinals(rows: FullSlateRow[]): Map<string, number> {
  const byCampaign = new Map<string, FullSlateRow[]>();
  for (const row of rows) byCampaign.set(row.campaignId, [...(byCampaign.get(row.campaignId) || []), row]);
  const ordinals = new Map<string, number>();
  for (const group of byCampaign.values()) {
    [...group]
      .sort((a, b) => timeMs(a.eventTime) - timeMs(b.eventTime) || a.ticketId.localeCompare(b.ticketId))
      .forEach((row, index) => ordinals.set(row.ticketId, index + 1));
  }
  return ordinals;
}

function campaignFirstTimes(rows: FullSlateRow[]): Map<string, string> {
  const firstTimes = new Map<string, string>();
  for (const row of rows) {
    const current = firstTimes.get(row.campaignId);
    if (!current || timeMs(row.eventTime) < timeMs(current)) firstTimes.set(row.campaignId, row.eventTime);
  }
  return firstTimes;
}

function buildCases(report: FullSlateReport): CaseRow[] {
  const rowsByTicket = new Map(report.rows.map((row) => [row.ticketId, row]));
  const ordinals = duplicateOrdinals(report.rows);
  const firstTimes = campaignFirstTimes(report.rows);
  return report.slates
    .filter((slate) => slate.changedFromSuppressedSweepDuplicate)
    .flatMap((slate: FullSlateSlate) => {
      if (!slate.baselineTopTicketId) return [];
      const baseline = rowsByTicket.get(slate.baselineTopTicketId);
      if (!baseline) return [];
      const firstTime = firstTimes.get(baseline.campaignId) || baseline.eventTime;
      return [{
        slateId: slate.slateId,
        tradeDate: slate.tradeDate,
        session: slate.session,
        eventTime: slate.eventTime,
        baselineTopTicketId: baseline.ticketId,
        baselineDirection: baseline.direction,
        replacementTicketId: slate.dedupedTopTicketId,
        replacementSetupType: slate.dedupedTopSetupType,
        candidateRows: slate.candidateRows,
        duplicateOrdinal: ordinals.get(baseline.ticketId) || 1,
        minutesSinceCampaignFirst: minutesBetween(firstTime, baseline.eventTime),
        baselineTopOneMesPl: slate.baselineTopOneMesPl,
        replacementOneMesPl: slate.dedupedTopOneMesPl,
        deltaTopOneMesPl: slate.deltaTopOneMesPl,
        duplicateOutcomeClass: outcomeClass(baseline),
      }];
    });
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

function replacementBucket(value: string | null): string {
  return value || 'no_replacement';
}

function buildBucket(feature: string, bucket: string, rows: CaseRow[]): FeatureBucket {
  const baselineTopOneMesPl = sum(rows.map((row) => row.baselineTopOneMesPl));
  const replacementOneMesPl = sum(rows.map((row) => row.replacementOneMesPl));
  const deltaIfSuppressedOneMesPl = sum(rows.map((row) => row.deltaTopOneMesPl));
  const duplicateWinners = rows.filter((row) => row.duplicateOutcomeClass === 'winner').length;
  const duplicateLosses = rows.filter((row) => row.duplicateOutcomeClass === 'loss').length;
  const recommendation = (deltaIfSuppressedOneMesPl ?? 0) < 0 && duplicateWinners > duplicateLosses
    ? 'keep_later_duplicate_proof'
    : (deltaIfSuppressedOneMesPl ?? 0) > 0 && duplicateLosses > duplicateWinners
      ? 'suppress_duplicate_candidate'
      : 'mixed_do_not_install';
  return {
    feature,
    bucket,
    rows: rows.length,
    duplicateWinners,
    duplicateLosses,
    baselineTopOneMesPl,
    replacementOneMesPl,
    deltaIfSuppressedOneMesPl,
    recommendation,
  };
}

function groupedBuckets(cases: CaseRow[], feature: string, bucketFor: (row: CaseRow) => string): FeatureBucket[] {
  const groups = new Map<string, CaseRow[]>();
  for (const row of cases) {
    const bucket = bucketFor(row);
    groups.set(bucket, [...(groups.get(bucket) || []), row]);
  }
  return [...groups.entries()].map(([bucket, rows]) => buildBucket(feature, bucket, rows));
}

function buildBuckets(cases: CaseRow[]): FeatureBucket[] {
  return [
    ...groupedBuckets(cases, 'session', (row) => row.session),
    ...groupedBuckets(cases, 'direction', (row) => row.baselineDirection),
    ...groupedBuckets(cases, 'duplicate_ordinal', (row) => ordinalBucket(row.duplicateOrdinal)),
    ...groupedBuckets(cases, 'minutes_since_campaign_first', (row) => ageBucket(row.minutesSinceCampaignFirst)),
    ...groupedBuckets(cases, 'slate_size', (row) => slateSizeBucket(row.candidateRows)),
    ...groupedBuckets(cases, 'replacement_setup', (row) => replacementBucket(row.replacementSetupType)),
  ].sort((a, b) =>
    (a.deltaIfSuppressedOneMesPl ?? 0) - (b.deltaIfSuppressedOneMesPl ?? 0) ||
    b.rows - a.rows ||
    `${a.feature}:${a.bucket}`.localeCompare(`${b.feature}:${b.bucket}`));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Campaign Dedupe Changed-Slate Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only changed-slate miner. It consumes a saved full-slate dry-run report only. Outcomes label research buckets; no scanner-visible duplicate suppression is installed.',
    '',
    '## Summary',
    `- Changed from suppressed duplicate slates: ${report.summary.changedFromSuppressedDuplicateSlates}.`,
    `- Duplicate winners/losses: ${report.summary.duplicateWinnerRows}/${report.summary.duplicateLossRows}.`,
    `- Baseline/replacement P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.replacementOneMesPl ?? '-'}.`,
    `- Suppression delta: ${report.summary.deltaIfSuppressedOneMesPl ?? '-'}.`,
    `- Best keep bucket: ${report.summary.bestKeepBucket ?? '-'}.`,
    `- Best suppress bucket: ${report.summary.bestSuppressBucket ?? '-'}.`,
    `- Installable separator found: ${report.summary.installableSeparatorFound}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Buckets',
    '| Feature | Bucket | Rows | Winners | Losses | Baseline P/L | Replacement P/L | Suppression Delta | Recommendation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.buckets.map((row) => `| ${row.feature} | ${row.bucket} | ${row.rows} | ${row.duplicateWinners} | ${row.duplicateLosses} | ${row.baselineTopOneMesPl ?? '-'} | ${row.replacementOneMesPl ?? '-'} | ${row.deltaIfSuppressedOneMesPl ?? '-'} | ${row.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport(args: {
  fullSlateDryRunPath: string;
  fullSlateDryRun: FullSlateReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport {
  const cases = args.fullSlateDryRun ? buildCases(args.fullSlateDryRun) : [];
  const buckets = buildBuckets(cases);
  const baselineTopOneMesPl = sum(cases.map((row) => row.baselineTopOneMesPl));
  const replacementOneMesPl = sum(cases.map((row) => row.replacementOneMesPl));
  const deltaIfSuppressedOneMesPl = sum(cases.map((row) => row.deltaTopOneMesPl));
  const keepBuckets = buckets.filter((row) => row.recommendation === 'keep_later_duplicate_proof');
  const suppressBuckets = buckets.filter((row) => row.recommendation === 'suppress_duplicate_candidate');
  const blockers = [
    !args.fullSlateDryRun ? 'missing full-slate dry-run report' : null,
    args.fullSlateDryRun && args.fullSlateDryRun.status !== 'pass' ? `full-slate dry-run status ${args.fullSlateDryRun.status}` : null,
    cases.length === 0 ? 'no changed suppressed-duplicate slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : (deltaIfSuppressedOneMesPl ?? 0) < 0
      ? 'keep_duplicate_suppression_rejected'
      : 'needs_more_changed_slate_mining';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_changed_slate_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { fullSlateDryRun: args.fullSlateDryRunPath },
    assumptions: {
      consumesSavedFullSlateDryRunOnly: true,
      usesNoLookaheadBucketFieldsOnly: true,
      outcomeUsedOnlyForResearchLabels: true,
      duplicateSuppressionIsNotInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedFromSuppressedDuplicateSlates: cases.length,
      duplicateWinnerRows: cases.filter((row) => row.duplicateOutcomeClass === 'winner').length,
      duplicateLossRows: cases.filter((row) => row.duplicateOutcomeClass === 'loss').length,
      baselineTopOneMesPl,
      replacementOneMesPl,
      deltaIfSuppressedOneMesPl,
      bestKeepBucket: keepBuckets[0] ? `${keepBuckets[0].feature}:${keepBuckets[0].bucket}` : null,
      bestSuppressBucket: suppressBuckets[0] ? `${suppressBuckets[0].feature}:${suppressBuckets[0].bucket}` : null,
      installableSeparatorFound: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    buckets,
    cases,
    blockers,
    recommendations: recommendation === 'keep_duplicate_suppression_rejected'
      ? [
        'Do not install duplicate suppression. Changed-slate evidence says later duplicate Sweep proof is usually meaningful fresh proof, not stale visibility.',
        'Next phase should mine for a positive keep-later-proof rule, not a suppress-duplicates rule.',
      ]
      : recommendation === 'needs_more_changed_slate_mining'
        ? ['Keep mining changed slates before proposing any live-facing rank change.']
        : ['Fix input reports before using changed-slate buckets.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-changed-slate-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport({
    fullSlateDryRunPath: options.fullSlateDryRun,
    fullSlateDryRun: readJson<FullSlateReport>(options.fullSlateDryRun),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
