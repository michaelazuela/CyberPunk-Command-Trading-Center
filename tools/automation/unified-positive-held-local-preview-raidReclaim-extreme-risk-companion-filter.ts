import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskRankSimulationReport,
} from './unified-positive-held-local-preview-raidReclaim-extreme-risk-rank-simulation';

type InstalledRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];
type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];

interface CandidateRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  slateId: string;
  executionStatus: string;
  blockReason: string;
  candidateBookState: string;
  canExecute: false;
  installedScore: number | null;
  riskPoints: number | null;
  proofToEntryMinutes: number | null;
  outcomeBucket: TimingRow['outcomeBucket'] | 'missing_timing';
  resolvedOneMesPl: number | null;
}

interface VariantSummary {
  variantId: string;
  description: string;
  penalizedRows: number;
  changedSlates: number;
  penalizedTopBeforeSlates: number;
  penalizedTopAfterSlates: number;
  changedSlatesWithValidReviewReplacement: number;
  changedSlatesWithBlockedOrMissingReplacement: number;
  falseTopWinnerDemotions: number;
  topBeforeOneMesPl: number | null;
  topAfterOneMesPl: number | null;
  topSelectionDeltaOneMesPl: number | null;
  recommendation: 'reject_for_blocked_replacement' | 'candidate_for_fresh_validation' | 'review_note_only' | 'reject_no_effect';
}

interface ChangedSlate {
  variantId: string;
  slateId: string;
  topBeforeTicketId: string;
  topBeforeSetupType: string;
  topBeforeOutcomeBucket: string;
  topBeforeOneMesPl: number | null;
  topAfterTicketId: string;
  topAfterSetupType: string;
  topAfterOutcomeBucket: string;
  topAfterOneMesPl: number | null;
  topAfterValidReview: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport {
  reportType: 'unified_positive_held_local_preview_historicalReview_extreme_risk_companion_filter';
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
    reportDir: string;
    installedScoreComparisonPath: string | null;
    sourceProofTimingPath: string | null;
    extremeRiskSimulationPath: string | null;
  };
  assumptions: {
    researchOnly: true;
    variantsUsePreEntryFieldsOnly: true;
    outcomeUsedForEvaluationOnly: true;
    replacementMustRemainValidReview: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    installedRows: number;
    joinedRows: number;
    variants: number;
    candidateVariants: number;
    rejectedBlockedReplacementVariants: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'do_not_install_extreme_risk_penalty'
      | 'fresh_validate_candidate_variant'
      | 'reject_missing_source';
  };
  variants: VariantSummary[];
  changedSlates: ChangedSlate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const PENALTY_POINTS = 12;

const VARIANTS = [
  {
    id: 'risk_gt_15',
    description: 'historicalReview riskPoints > 15',
    matches: (row: CandidateRow) => (row.riskPoints ?? 0) > 15,
  },
  {
    id: 'risk_gt_20',
    description: 'historicalReview riskPoints > 20',
    matches: (row: CandidateRow) => (row.riskPoints ?? 0) > 20,
  },
  {
    id: 'risk_gt_20_proof_0',
    description: 'historicalReview riskPoints > 20 and proofToEntryMinutes = 0',
    matches: (row: CandidateRow) => (row.riskPoints ?? 0) > 20 && row.proofToEntryMinutes === 0,
  },
  {
    id: 'risk_gte_23_proof_0',
    description: 'historicalReview riskPoints >= 23 and proofToEntryMinutes = 0',
    matches: (row: CandidateRow) => (row.riskPoints ?? 0) >= 23 && row.proofToEntryMinutes === 0,
  },
] as const;

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport['authority'] {
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

function isValidReview(row: CandidateRow): boolean {
  return row.canExecute === false &&
    row.candidateBookState === 'human_review' &&
    row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending';
}

function joinRows(installedRows: InstalledRow[], timingRows: TimingRow[]): CandidateRow[] {
  const timingByTicket = new Map(timingRows.map((row) => [row.ticketId, row]));
  return installedRows.map((row) => {
    const timing = timingByTicket.get(row.ticketId);
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      slateId: `${row.tradeDate}|${row.session}`,
      executionStatus: row.executionStatus,
      blockReason: row.blockReason,
      candidateBookState: row.candidateBookState,
      canExecute: false,
      installedScore: row.installedScore,
      riskPoints: timing?.riskPoints ?? null,
      proofToEntryMinutes: timing?.proofToEntryMinutes ?? null,
      outcomeBucket: timing?.outcomeBucket ?? 'missing_timing',
      resolvedOneMesPl: timing?.resolvedOneMesPl ?? null,
    };
  });
}

function compareRows(a: CandidateRow, b: CandidateRow, scoreFor: (row: CandidateRow) => number | null): number {
  return (scoreFor(b) ?? Number.NEGATIVE_INFINITY) - (scoreFor(a) ?? Number.NEGATIVE_INFINITY) ||
    Number(isValidReview(b)) - Number(isValidReview(a)) ||
    a.ticketId.localeCompare(b.ticketId);
}

function variantSummary(rows: CandidateRow[], variant: typeof VARIANTS[number]): { summary: VariantSummary; changed: ChangedSlate[] } {
  const groups = new Map<string, CandidateRow[]>();
  for (const row of rows) {
    groups.set(row.slateId, [...(groups.get(row.slateId) || []), row]);
  }
  const penalizes = (row: CandidateRow) => isValidReview(row) && row.setupType === 'historicalReview' && variant.matches(row);
  const scoreAfter = (row: CandidateRow) => row.installedScore === null ? null : row.installedScore - (penalizes(row) ? PENALTY_POINTS : 0);
  const changed: ChangedSlate[] = [];
  const topBeforePl: Array<number | null> = [];
  const topAfterPl: Array<number | null> = [];
  let penalizedTopBefore = 0;
  let penalizedTopAfter = 0;
  let falseTopWinnerDemotions = 0;
  for (const [slateId, slateRows] of groups) {
    const before = [...slateRows].sort((a, b) => compareRows(a, b, (row) => row.installedScore))[0];
    const after = [...slateRows].sort((a, b) => compareRows(a, b, scoreAfter))[0];
    if (!before || !after) continue;
    topBeforePl.push(before.resolvedOneMesPl);
    topAfterPl.push(after.resolvedOneMesPl);
    if (penalizes(before)) penalizedTopBefore += 1;
    if (penalizes(after)) penalizedTopAfter += 1;
    if (before.ticketId !== after.ticketId) {
      if (penalizes(before) && before.outcomeBucket === 'winner_t1_t2') falseTopWinnerDemotions += 1;
      changed.push({
        variantId: variant.id,
        slateId,
        topBeforeTicketId: before.ticketId,
        topBeforeSetupType: before.setupType,
        topBeforeOutcomeBucket: before.outcomeBucket,
        topBeforeOneMesPl: before.resolvedOneMesPl,
        topAfterTicketId: after.ticketId,
        topAfterSetupType: after.setupType,
        topAfterOutcomeBucket: after.outcomeBucket,
        topAfterOneMesPl: after.resolvedOneMesPl,
        topAfterValidReview: isValidReview(after) && after.outcomeBucket !== 'blocked' && after.outcomeBucket !== 'missing_timing',
      });
    }
  }
  const topBeforeOneMesPl = sum(topBeforePl);
  const topAfterOneMesPl = sum(topAfterPl);
  const topSelectionDeltaOneMesPl = topBeforeOneMesPl === null || topAfterOneMesPl === null ? null : round(topAfterOneMesPl - topBeforeOneMesPl);
  const changedSlatesWithBlockedOrMissingReplacement = changed.filter((row) => !row.topAfterValidReview).length;
  const recommendation: VariantSummary['recommendation'] =
    changed.length === 0 ? 'reject_no_effect'
      : changedSlatesWithBlockedOrMissingReplacement > 0 ? 'reject_for_blocked_replacement'
        : (topSelectionDeltaOneMesPl ?? 0) > 0 && falseTopWinnerDemotions === 0 ? 'candidate_for_fresh_validation'
          : 'review_note_only';
  return {
    summary: {
      variantId: variant.id,
      description: variant.description,
      penalizedRows: rows.filter(penalizes).length,
      changedSlates: changed.length,
      penalizedTopBeforeSlates: penalizedTopBefore,
      penalizedTopAfterSlates: penalizedTopAfter,
      changedSlatesWithValidReviewReplacement: changed.filter((row) => row.topAfterValidReview).length,
      changedSlatesWithBlockedOrMissingReplacement,
      falseTopWinnerDemotions,
      topBeforeOneMesPl,
      topAfterOneMesPl,
      topSelectionDeltaOneMesPl,
      recommendation,
    },
    changed,
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview historicalReview Extreme-Risk Companion Filter',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only companion-filter diagnostic. It tests hypotheses only and does not install ranking behavior, remove models, hard-block setups, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Variants',
    '| Variant | Penalized | Changed | Valid Replacements | Blocked/Missing Replacements | False Top Winners | Delta | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.variants.map((row) => `| ${row.variantId} | ${row.penalizedRows} | ${row.changedSlates} | ${row.changedSlatesWithValidReviewReplacement} | ${row.changedSlatesWithBlockedOrMissingReplacement} | ${row.falseTopWinnerDemotions} | ${row.topSelectionDeltaOneMesPl ?? '-'} | ${row.recommendation} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport(args: {
  reportDir: string;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  extremeRiskSimulationPath: string | null;
  extremeRiskSimulationReport: UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskRankSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport {
  const installedRows = args.installedScoreComparisonReport?.rows || [];
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const rows = joinRows(installedRows, timingRows);
  const results = VARIANTS.map((variant) => variantSummary(rows, variant));
  const variants = results.map((result) => result.summary);
  const changedSlates = results.flatMap((result) => result.changed);
  const blockers = [
    !args.installedScoreComparisonPath ? 'missing installed-score comparison path' : null,
    !args.installedScoreComparisonReport ? 'missing installed-score comparison report' : null,
    args.installedScoreComparisonReport && args.installedScoreComparisonReport.status !== 'pass'
      ? `installed-score comparison status ${args.installedScoreComparisonReport.status}`
      : null,
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass'
      ? `source/proof timing status ${args.sourceProofTimingReport.status}`
      : null,
    !args.extremeRiskSimulationPath ? 'missing extreme-risk simulation path' : null,
    !args.extremeRiskSimulationReport ? 'missing extreme-risk simulation report' : null,
    args.extremeRiskSimulationReport && args.extremeRiskSimulationReport.status !== 'pass'
      ? `extreme-risk simulation status ${args.extremeRiskSimulationReport.status}`
      : null,
    installedRows.length === 0 ? 'no installed-score rows found' : null,
    timingRows.length === 0 ? 'no source/proof timing rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const candidateVariants = variants.filter((row) => row.recommendation === 'candidate_for_fresh_validation').length;
  const rejectedBlockedReplacementVariants = variants.filter((row) => row.recommendation === 'reject_for_blocked_replacement').length;
  const recommendation = blockers.length ? 'reject_missing_source'
    : candidateVariants > 0 ? 'fresh_validate_candidate_variant'
      : 'do_not_install_extreme_risk_penalty';
  const base: Omit<UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_historicalReview_extreme_risk_companion_filter',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
      sourceProofTimingPath: args.sourceProofTimingPath,
      extremeRiskSimulationPath: args.extremeRiskSimulationPath,
    },
    assumptions: {
      researchOnly: true,
      variantsUsePreEntryFieldsOnly: true,
      outcomeUsedForEvaluationOnly: true,
      replacementMustRemainValidReview: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      installedRows: installedRows.length,
      joinedRows: rows.length,
      variants: variants.length,
      candidateVariants,
      rejectedBlockedReplacementVariants,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    variants,
    changedSlates,
    blockers,
    recommendations: blockers.length
      ? ['Do not use companion-filter output until all source reports pass.']
      : candidateVariants > 0
        ? ['Fresh-validate the candidate variant on regenerated replay artifacts before any scanner-visible proposal.']
        : [
          'Do not install a historicalReview extreme-risk rank penalty from this evidence.',
          'Treat wide-risk historicalReview as a human-review caution note until a valid replacement-positive separator is proven.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport(
  report: UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-raidReclaim-extreme-risk-companion-filter-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const extremeRiskSimulationPath = readFlag(args, '--extreme-risk-simulation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-raidReclaim-extreme-risk-rank-simulation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport({
    reportDir: outDir,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    extremeRiskSimulationPath,
    extremeRiskSimulationReport: extremeRiskSimulationPath && fs.existsSync(extremeRiskSimulationPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskRankSimulationReport>(extremeRiskSimulationPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, variants: report.variants }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskCompanionFilterCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
