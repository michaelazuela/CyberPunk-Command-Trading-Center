import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-changed-slate-miner';

type ChangedSlateReport = RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport;
type CaseRow = ChangedSlateReport['cases'][number];

interface CliOptions {
  changedSlateMiner: string;
  outDir: string;
  json: boolean;
}

interface RuleCandidate {
  ruleId: string;
  features: string[];
  rows: number;
  winners: number;
  losses: number;
  winRate: number;
  baselineTopOneMesPl: number | null;
  replacementOneMesPl: number | null;
  deltaIfSuppressedOneMesPl: number | null;
  recommendation: 'validate_keep_later_proof_candidate' | 'too_small_or_mixed';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_rule_miner';
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
    changedSlateMiner: string;
  };
  assumptions: {
    consumesSavedChangedSlateMinerOnly: true;
    minesNoLookaheadFeatureCombinations: true;
    outcomeUsedOnlyForResearchLabels: true;
    noLiveRuleInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    casesRead: number;
    ruleCandidates: number;
    validationCandidates: number;
    bestRuleId: string | null;
    bestRuleRows: number;
    bestRuleWinRate: number | null;
    bestRuleDeltaIfSuppressedOneMesPl: number | null;
    installableSeparatorFound: false;
    livePromotionAllowedRows: 0;
    recommendation: 'validate_best_keep_later_proof_candidate' | 'no_keep_later_proof_candidate' | 'fix_inputs';
  };
  rules: RuleCandidate[];
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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const changedSlateMiner = readFlag(argv, '--changed-slate-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-changed-slate-miner-\d+\.json$/);
  if (!changedSlateMiner) throw new Error('--changed-slate-miner is required.');
  return {
    changedSlateMiner: path.resolve(changedSlateMiner),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport['authority'] {
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

function replacementBucket(value: string | null): string {
  return value || 'no_replacement';
}

const FEATURE_BUILDERS: Array<[string, (row: CaseRow) => string]> = [
  ['session', (row) => row.session],
  ['direction', (row) => row.baselineDirection],
  ['ordinal', (row) => ordinalBucket(row.duplicateOrdinal)],
  ['age', (row) => ageBucket(row.minutesSinceCampaignFirst)],
  ['slate_size', (row) => slateSizeBucket(row.candidateRows)],
  ['replacement', (row) => replacementBucket(row.replacementSetupType)],
];

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 1) return items.map((item) => [item]);
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((tail) => [item, ...tail]));
}

function buildRule(featureSet: Array<[string, (row: CaseRow) => string]>, rows: CaseRow[]): RuleCandidate {
  const featureParts = featureSet.map(([feature, bucketFor]) => `${feature}:${bucketFor(rows[0])}`);
  const winners = rows.filter((row) => row.duplicateOutcomeClass === 'winner').length;
  const losses = rows.filter((row) => row.duplicateOutcomeClass === 'loss').length;
  const winRate = rows.length ? round(winners / rows.length) : 0;
  const deltaIfSuppressedOneMesPl = sum(rows.map((row) => row.deltaTopOneMesPl));
  const recommendation = rows.length >= MIN_ROWS && winRate >= MIN_WIN_RATE && (deltaIfSuppressedOneMesPl ?? 0) < 0
    ? 'validate_keep_later_proof_candidate'
    : 'too_small_or_mixed';
  return {
    ruleId: featureParts.join(' + '),
    features: featureParts,
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

function mineRules(cases: CaseRow[]): RuleCandidate[] {
  const rules: RuleCandidate[] = [];
  for (const size of [1, 2, 3]) {
    for (const featureSet of combinations(FEATURE_BUILDERS, size)) {
      const grouped = new Map<string, CaseRow[]>();
      for (const row of cases) {
        const key = featureSet.map(([feature, bucketFor]) => `${feature}:${bucketFor(row)}`).join(' + ');
        grouped.set(key, [...(grouped.get(key) || []), row]);
      }
      for (const rows of grouped.values()) rules.push(buildRule(featureSet, rows));
    }
  }
  return rules
    .filter((rule) => rule.rows >= 3)
    .sort((a, b) =>
      Number(b.recommendation === 'validate_keep_later_proof_candidate') - Number(a.recommendation === 'validate_keep_later_proof_candidate') ||
      (a.deltaIfSuppressedOneMesPl ?? 0) - (b.deltaIfSuppressedOneMesPl ?? 0) ||
      b.rows - a.rows ||
      b.winRate - a.winRate ||
      a.ruleId.localeCompare(b.ruleId));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Keep-Later-Proof Rule Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only no-lookahead rule miner. It consumes a saved changed-slate miner report only. It does not install a rule or change scanner-visible behavior.',
    '',
    '## Summary',
    `- Cases read: ${report.summary.casesRead}.`,
    `- Rule candidates: ${report.summary.ruleCandidates}.`,
    `- Validation candidates: ${report.summary.validationCandidates}.`,
    `- Best rule: ${report.summary.bestRuleId ?? '-'}.`,
    `- Best rows / win rate / suppression delta: ${report.summary.bestRuleRows}/${report.summary.bestRuleWinRate ?? '-'}/${report.summary.bestRuleDeltaIfSuppressedOneMesPl ?? '-'}.`,
    `- Installable separator found: ${report.summary.installableSeparatorFound}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Rules',
    '| Rule | Rows | Winners | Losses | Win Rate | Baseline P/L | Replacement P/L | Suppression Delta | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.rules.slice(0, 40).map((row) => `| ${row.ruleId} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.winRate} | ${row.baselineTopOneMesPl ?? '-'} | ${row.replacementOneMesPl ?? '-'} | ${row.deltaIfSuppressedOneMesPl ?? '-'} | ${row.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport(args: {
  changedSlateMinerPath: string;
  changedSlateMiner: ChangedSlateReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport {
  const cases = args.changedSlateMiner?.cases || [];
  const rules = mineRules(cases);
  const validationCandidates = rules.filter((rule) => rule.recommendation === 'validate_keep_later_proof_candidate');
  const best = validationCandidates[0] || null;
  const blockers = [
    !args.changedSlateMiner ? 'missing changed-slate miner report' : null,
    args.changedSlateMiner && args.changedSlateMiner.status !== 'pass' ? `changed-slate miner status ${args.changedSlateMiner.status}` : null,
    cases.length === 0 ? 'no changed-slate cases found' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : best
      ? 'validate_best_keep_later_proof_candidate'
      : 'no_keep_later_proof_candidate';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_rule_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { changedSlateMiner: args.changedSlateMinerPath },
    assumptions: {
      consumesSavedChangedSlateMinerOnly: true,
      minesNoLookaheadFeatureCombinations: true,
      outcomeUsedOnlyForResearchLabels: true,
      noLiveRuleInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      casesRead: cases.length,
      ruleCandidates: rules.length,
      validationCandidates: validationCandidates.length,
      bestRuleId: best?.ruleId || null,
      bestRuleRows: best?.rows || 0,
      bestRuleWinRate: best?.winRate ?? null,
      bestRuleDeltaIfSuppressedOneMesPl: best?.deltaIfSuppressedOneMesPl ?? null,
      installableSeparatorFound: false,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rules,
    blockers,
    recommendations: recommendation === 'validate_best_keep_later_proof_candidate'
      ? [
        'A research candidate exists for preserving later Sweep proof. Validate it on a broader/unseen package before any scanner-visible proposal.',
        'Do not install a rank boost or duplicate rule from this miner alone.',
      ]
      : recommendation === 'no_keep_later_proof_candidate'
        ? ['No keep-later-proof candidate survived the minimum row and win-rate thresholds. Keep mining before proposing live behavior.']
        : ['Fix input reports before using rule candidates.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-rule-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport({
    changedSlateMinerPath: options.changedSlateMiner,
    changedSlateMiner: readJson<ChangedSlateReport>(options.changedSlateMiner),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
