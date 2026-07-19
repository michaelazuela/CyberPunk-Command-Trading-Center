import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';

interface CliOptions {
  minerReports: string[];
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

type MinerRow = RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport['rows'][number];

interface ProfileFeatureRow {
  featureTag: string;
  featurePhase: 'initial_rank' | 'post_entry_research_only';
  rows: number;
  priorityLossRows: number;
  priorityNonLossRows: number;
  priorityOneMesPl: number | null;
  falseRejectPriorityNonLossRows: number;
  liveInitialRankInstallableNow: false;
  conclusion: 'reject_initial_rank' | 'research_review_note_only' | 'candidate_needs_fresh_validation';
}

interface ProfileRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  priorityOneMesPl: number | null;
  openingDriveOneMesPl: number | null;
  priorityLoss: boolean;
  priorityEntry: number | null;
  priorityStop: number | null;
  priorityRiskPoints: number;
  proofBarRangeR: number | null;
  proofBarBodyDirection: string;
  initialRankTags: string[];
  postEntryResearchTags: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_loss_profile';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    minerReports: string[];
  };
  assumptions: {
    consumesSavedMinerReportsOnly: true;
    dedupesRowsByPriorityTicket: true;
    separatesInitialRankFromPostEntrySignals: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    minerReports: number;
    sourceRows: number;
    dedupedRows: number;
    duplicateRowsRemoved: number;
    priorityLossRows: number;
    priorityNonLossRows: number;
    priorityOneMesPl: number | null;
    initialRankCandidateRows: number;
    postEntryResearchOnlyRows: number;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'do_not_install_initial_rank_filter' | 'queue_fresh_initial_rank_validation' | 'fix_inputs';
  };
  featureRows: ProfileFeatureRow[];
  rows: ProfileRow[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function matchingReportPaths(pattern: RegExp): string[] {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return [];
  return fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityLossProfileArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const minerReports = splitPaths(readFlag(argv, '--miner-reports')).map((item) => path.resolve(item));
  return {
    minerReports: minerReports.length
      ? minerReports
      : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner-\d+\.json$/).slice(0, 1),
    outDir,
    json: argv.includes('--json'),
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

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function minutesFromProofTime(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function rowKey(row: MinerRow): string {
  return [
    row.priorityTicketId,
    row.tradeDate,
    row.session,
    row.proofTime,
    row.direction,
    row.prioritySetupType,
    row.priorityEntry,
    row.priorityStop,
  ].join('|');
}

function initialRankTags(row: MinerRow): string[] {
  const minute = minutesFromProofTime(row.proofTime);
  return [...new Set([
    minute !== null && minute >= 620 ? 'proof_time_ge_1020' : null,
    minute !== null && minute >= 630 ? 'proof_time_ge_1030' : null,
    row.priorityRiskPoints >= 9 && row.priorityRiskPoints < 10 ? 'risk_points_9_to_10' : null,
    row.priorityRiskPoints >= 10 ? 'risk_points_ge_10' : null,
    row.proofBarRangeR !== null && row.proofBarRangeR >= 0.9 ? 'proof_bar_range_ge_0_9r' : null,
    row.proofBarRangeR !== null && row.proofBarRangeR >= 1 ? 'proof_bar_range_ge_1r' : null,
    ...row.immediateFeatureTags.filter((tag) => tag.startsWith('proof_bar_')),
  ].filter((tag): tag is string => Boolean(tag)))];
}

function postEntryResearchTags(row: MinerRow): string[] {
  return [...new Set(row.immediateFeatureTags.filter((tag) => tag.startsWith('first_replay_')))];
}

function profileRows(rows: MinerRow[]): ProfileRow[] {
  return rows.map((row) => ({
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    direction: row.direction,
    prioritySetupType: row.prioritySetupType,
    priorityOneMesPl: row.priorityOneMesPl,
    openingDriveOneMesPl: row.openingDriveOneMesPl,
    priorityLoss: typeof row.priorityOneMesPl === 'number' && row.priorityOneMesPl < 0,
    priorityEntry: row.priorityEntry,
    priorityStop: row.priorityStop,
    priorityRiskPoints: row.priorityRiskPoints,
    proofBarRangeR: row.proofBarRangeR,
    proofBarBodyDirection: row.proofBarBodyDirection,
    initialRankTags: initialRankTags(row),
    postEntryResearchTags: postEntryResearchTags(row),
  }));
}

function buildFeatureRows(rows: ProfileRow[]): ProfileFeatureRow[] {
  const entries = rows.flatMap((row) => [
    ...row.initialRankTags.map((featureTag) => ({ featureTag, featurePhase: 'initial_rank' as const, row })),
    ...row.postEntryResearchTags.map((featureTag) => ({ featureTag, featurePhase: 'post_entry_research_only' as const, row })),
  ]);
  const keys = [...new Set(entries.map((entry) => `${entry.featurePhase}|${entry.featureTag}`))].sort();
  return keys.map((key) => {
    const [featurePhase, featureTag] = key.split('|') as [ProfileFeatureRow['featurePhase'], string];
    const matching = entries.filter((entry) => entry.featurePhase === featurePhase && entry.featureTag === featureTag).map((entry) => entry.row);
    const priorityLossRows = matching.filter((row) => row.priorityLoss).length;
    const priorityNonLossRows = matching.length - priorityLossRows;
    const falseRejectPriorityNonLossRows = priorityNonLossRows;
    const conclusion: ProfileFeatureRow['conclusion'] = featurePhase === 'post_entry_research_only' && priorityLossRows > 0 && priorityNonLossRows === 0
      ? 'research_review_note_only'
      : featurePhase === 'initial_rank' && priorityLossRows >= 2 && falseRejectPriorityNonLossRows === 0
        ? 'candidate_needs_fresh_validation'
        : 'reject_initial_rank';
    return {
      featureTag,
      featurePhase,
      rows: matching.length,
      priorityLossRows,
      priorityNonLossRows,
      priorityOneMesPl: sum(matching.map((row) => row.priorityOneMesPl)),
      falseRejectPriorityNonLossRows,
      liveInitialRankInstallableNow: false as const,
      conclusion,
    };
  }).sort((a, b) => (
    b.priorityLossRows - a.priorityLossRows ||
    a.falseRejectPriorityNonLossRows - b.falseRejectPriorityNonLossRows ||
    a.featurePhase.localeCompare(b.featurePhase) ||
    a.featureTag.localeCompare(b.featureTag)
  ));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Loss Profile',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only profile over saved miner reports. It de-dupes by priority ticket and separates initial-rank evidence from post-entry-only evidence. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Deduped rows: ${report.summary.dedupedRows}.`,
    `- Priority loss/non-loss rows: ${report.summary.priorityLossRows}/${report.summary.priorityNonLossRows}.`,
    `- Priority P/L: ${report.summary.priorityOneMesPl}.`,
    `- Initial-rank candidates: ${report.summary.initialRankCandidateRows}.`,
    `- Post-entry research-only rows: ${report.summary.postEntryResearchOnlyRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Feature Rows',
    ...report.featureRows.slice(0, 20).map((row) => `- ${row.featureTag} (${row.featurePhase}): rows ${row.rows}, losses ${row.priorityLossRows}, non-losses ${row.priorityNonLossRows}, P/L ${row.priorityOneMesPl}, conclusion ${row.conclusion}.`),
    '',
    '## Loss Rows',
    ...report.rows.filter((row) => row.priorityLoss).map((row) => `- ${row.tradeDate} ${row.proofTime} ${row.prioritySetupType}: P/L ${row.priorityOneMesPl}, risk ${row.priorityRiskPoints}, proofRangeR ${row.proofBarRangeR}, initial tags ${row.initialRankTags.join(', ') || 'none'}, post-entry tags ${row.postEntryResearchTags.join(', ') || 'none'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport(args: {
  minerReports: string[];
  loadedReports: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport {
  const allRows = args.loadedReports.flatMap((report) => report.rows);
  const deduped = [...new Map(allRows.map((row) => [rowKey(row), row])).values()];
  const rows = profileRows(deduped).sort((a, b) => a.proofTime.localeCompare(b.proofTime));
  const featureRows = buildFeatureRows(rows);
  const blockers = [
    args.minerReports.length === 0 ? 'no miner reports supplied' : null,
    args.loadedReports.some((report) => report.status !== 'pass') ? 'one or more miner reports did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const initialRankCandidateRows = featureRows.filter((row) => row.conclusion === 'candidate_needs_fresh_validation').length;
  const postEntryResearchOnlyRows = featureRows.filter((row) => row.conclusion === 'research_review_note_only').length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : initialRankCandidateRows > 0
      ? 'queue_fresh_initial_rank_validation'
      : 'do_not_install_initial_rank_filter';
  const priorityLossRows = rows.filter((row) => row.priorityLoss).length;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_loss_profile',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { minerReports: args.minerReports },
    assumptions: {
      consumesSavedMinerReportsOnly: true,
      dedupesRowsByPriorityTicket: true,
      separatesInitialRankFromPostEntrySignals: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      minerReports: args.loadedReports.length,
      sourceRows: allRows.length,
      dedupedRows: rows.length,
      duplicateRowsRemoved: allRows.length - rows.length,
      priorityLossRows,
      priorityNonLossRows: rows.length - priorityLossRows,
      priorityOneMesPl: sum(rows.map((row) => row.priorityOneMesPl)),
      initialRankCandidateRows,
      postEntryResearchOnlyRows,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    featureRows,
    rows,
    blockers,
    recommendations: recommendation === 'queue_fresh_initial_rank_validation'
      ? ['Initial-rank candidate features exist, but they remain research-only until fresh validation proves they do not reject priority non-loss rows.']
      : recommendation === 'do_not_install_initial_rank_filter'
        ? [
          'Do not install an initial-rank loss filter from this evidence. Every pre-entry loss tag also appears on priority non-loss rows.',
          'Post-entry-only adverse tags may be useful as review notes or outcome learning, but they must not affect initial scanner publication.',
        ]
        : ['Fix miner report inputs before interpreting priority-loss profile output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityLossProfileCli(
  options = parseRawOhlcScannerArtifactOpeningDrivePriorityLossProfileArgs(),
): RawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport {
  const loadedReports = options.minerReports.map((reportPath) =>
    readJson<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport>(reportPath));
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport({
    minerReports: options.minerReports,
    loadedReports,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const jsonPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-loss-profile-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  if (options.json) {
    console.log(JSON.stringify({
      status: report.status,
      jsonPath,
      summary: report.summary,
      featureRows: report.featureRows,
      blockers: report.blockers,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nSaved: ${jsonPath}`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerArtifactOpeningDrivePriorityLossProfileCli();
}
