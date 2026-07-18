import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport,
} from './unified-positive-held-local-preview-valid-review-top-slate-outcome';

type TopRow = UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport['rows'][number];
type BucketKind = 'setupType' | 'session' | 'direction' | 'riskBucket' | 'proofLatencyBucket' | 'setupRiskBucket' | 'setupLatencyBucket';

interface SeparatorBucket {
  kind: BucketKind;
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
  winRateResolved: number | null;
  avgRiskPoints: number | null;
  avgProofToEntryMinutes: number | null;
  recommendation: 'candidate_positive_selector' | 'neutral_observation' | 'candidate_caution_filter';
}

export interface UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport {
  reportType: 'unified_positive_held_local_preview_valid_review_separator_diagnostic';
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
    validReviewTopSlateOutcomePath: string | null;
  };
  assumptions: {
    outcomeUsedForEvaluationOnly: true;
    separatorFieldsArePreEntryOrModelMetadata: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    evaluatedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    candidatePositiveSelectorBuckets: number;
    candidateCautionFilterBuckets: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'review_candidate_selectors_before_install'
      | 'keep_research_only'
      | 'reject_valid_review_separator_diagnostic';
  };
  buckets: SeparatorBucket[];
  topPositiveBuckets: SeparatorBucket[];
  topCautionBuckets: SeparatorBucket[];
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

function authority(): UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport['authority'] {
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

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function riskBucket(riskPoints: number | null): string {
  if (riskPoints === null) return 'risk_missing';
  if (riskPoints <= 6) return 'risk_tight_0_to_6';
  if (riskPoints <= 10) return 'risk_clean_6_to_10';
  if (riskPoints <= 15) return 'risk_wide_10_to_15';
  return 'risk_extreme_over_15';
}

function proofLatencyBucket(minutes: number | null): string {
  if (minutes === null) return 'proof_no_fill_or_missing';
  if (minutes <= 3) return 'proof_fast_0_to_3';
  if (minutes <= 10) return 'proof_normal_4_to_10';
  if (minutes <= 20) return 'proof_slow_11_to_20';
  return 'proof_stale_over_20';
}

function bucketKey(row: TopRow, kind: BucketKind): string {
  if (kind === 'setupType') return row.setupType;
  if (kind === 'session') return row.session;
  if (kind === 'direction') return row.direction;
  if (kind === 'riskBucket') return riskBucket(row.riskPoints);
  if (kind === 'proofLatencyBucket') return proofLatencyBucket(row.proofToEntryMinutes);
  if (kind === 'setupRiskBucket') return `${row.setupType}|${riskBucket(row.riskPoints)}`;
  return `${row.setupType}|${proofLatencyBucket(row.proofToEntryMinutes)}`;
}

function recommendation(args: { rows: number; winners: number; losses: number; unresolved: number; gross: number | null; winRate: number | null }): SeparatorBucket['recommendation'] {
  if (args.rows < 3) return 'neutral_observation';
  if ((args.gross ?? 0) > 0 && (args.winRate ?? 0) >= 0.7 && args.losses <= args.winners / 3) return 'candidate_positive_selector';
  if (args.losses >= args.winners && (args.gross ?? 0) <= 0) return 'candidate_caution_filter';
  if (args.unresolved >= args.winners + args.losses && (args.gross ?? 0) <= 0) return 'candidate_caution_filter';
  return 'neutral_observation';
}

function buildBuckets(rows: TopRow[]): SeparatorBucket[] {
  const buckets: SeparatorBucket[] = [];
  const kinds: BucketKind[] = ['setupType', 'session', 'direction', 'riskBucket', 'proofLatencyBucket', 'setupRiskBucket', 'setupLatencyBucket'];
  for (const kind of kinds) {
    const groups = new Map<string, TopRow[]>();
    for (const row of rows) {
      const key = bucketKey(row, kind);
      groups.set(key, [...(groups.get(key) || []), row]);
    }
    for (const [key, groupRows] of groups) {
      const winners = groupRows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length;
      const losses = groupRows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length;
      const unresolved = groupRows.filter((row) => row.outcomeBucket === 'unresolved').length;
      const resolved = winners + losses;
      const gross = sum(groupRows.map((row) => row.resolvedOneMesPl));
      const winRate = resolved > 0 ? round(winners / resolved) : null;
      buckets.push({
        kind,
        key,
        rows: groupRows.length,
        winners,
        losses,
        unresolved,
        grossResolvedOneMesPl: gross,
        winRateResolved: winRate,
        avgRiskPoints: avg(groupRows.map((row) => row.riskPoints)),
        avgProofToEntryMinutes: avg(groupRows.map((row) => row.proofToEntryMinutes)),
        recommendation: recommendation({ rows: groupRows.length, winners, losses, unresolved, gross, winRate }),
      });
    }
  }
  return buckets.sort((a, b) =>
    (b.grossResolvedOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.grossResolvedOneMesPl ?? Number.NEGATIVE_INFINITY) ||
    b.rows - a.rows ||
    a.kind.localeCompare(b.kind) ||
    a.key.localeCompare(b.key)
  );
}

function formatBucket(row: SeparatorBucket): string {
  return `| ${row.kind} | ${row.key} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.unresolved} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.avgProofToEntryMinutes ?? '-'} | ${row.recommendation} |`;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Valid Review Separator Diagnostic',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only separator diagnostic. Outcomes evaluate buckets only; no live filter, rank change, canExecute change, Discord post, Supabase write, bridge read, or trade math change is installed.',
    '',
    '## Summary',
    `- Evaluated rows: ${report.summary.evaluatedRows}.`,
    `- Winners/losses/unresolved: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Candidate positive selector buckets: ${report.summary.candidatePositiveSelectorBuckets}.`,
    `- Candidate caution filter buckets: ${report.summary.candidateCautionFilterBuckets}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Positive Buckets',
    '| Kind | Key | Rows | Winners | Losses | Unresolved | Gross P/L | Win Rate | Avg Risk | Avg Proof->Entry | Recommendation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.topPositiveBuckets.map(formatBucket),
    '',
    '## Top Caution Buckets',
    '| Kind | Key | Rows | Winners | Losses | Unresolved | Gross P/L | Win Rate | Avg Risk | Avg Proof->Entry | Recommendation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.topCautionBuckets.map(formatBucket),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport(args: {
  reportDir: string;
  validReviewTopSlateOutcomePath: string | null;
  validReviewTopSlateOutcomeReport: UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport {
  const rows = args.validReviewTopSlateOutcomeReport?.rows || [];
  const buckets = buildBuckets(rows);
  const blockers = [
    !args.validReviewTopSlateOutcomePath ? 'missing valid-review top-slate outcome path' : null,
    !args.validReviewTopSlateOutcomeReport ? 'missing valid-review top-slate outcome report' : null,
    args.validReviewTopSlateOutcomeReport && args.validReviewTopSlateOutcomeReport.status !== 'pass'
      ? `valid-review top-slate outcome status ${args.validReviewTopSlateOutcomeReport.status}`
      : null,
    rows.length === 0 ? 'no valid-review top-slate rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const positive = buckets.filter((row) => row.recommendation === 'candidate_positive_selector');
  const caution = buckets.filter((row) => row.recommendation === 'candidate_caution_filter');
  const base: Omit<UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_valid_review_separator_diagnostic',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      validReviewTopSlateOutcomePath: args.validReviewTopSlateOutcomePath,
    },
    assumptions: {
      outcomeUsedForEvaluationOnly: true,
      separatorFieldsArePreEntryOrModelMetadata: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      evaluatedRows: rows.length,
      winners: rows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length,
      losses: rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      candidatePositiveSelectorBuckets: positive.length,
      candidateCautionFilterBuckets: caution.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'reject_valid_review_separator_diagnostic'
        : positive.length > 0 || caution.length > 0
          ? 'review_candidate_selectors_before_install'
          : 'keep_research_only',
    },
    buckets,
    topPositiveBuckets: positive.slice(0, 12),
    topCautionBuckets: caution
      .sort((a, b) => (a.grossResolvedOneMesPl ?? 0) - (b.grossResolvedOneMesPl ?? 0) || b.losses - a.losses)
      .slice(0, 12),
    blockers,
    recommendations: blockers.length
      ? ['Do not use separator findings until the valid-review top-slate outcome source passes.']
      : [
        'Review candidate positive and caution buckets as research hypotheses only.',
        'Before installing any scanner-visible rank change, validate the chosen separator on a fresh replay package and prove no canExecute, entry, stop, target, risk, Discord, Supabase, or bridge behavior changes.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport(
  report: UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-valid-review-separator-diagnostic-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const validReviewTopSlateOutcomePath = readFlag(args, '--valid-review-top-slate-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-valid-review-top-slate-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport({
    reportDir: outDir,
    validReviewTopSlateOutcomePath,
    validReviewTopSlateOutcomeReport: validReviewTopSlateOutcomePath && fs.existsSync(validReviewTopSlateOutcomePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport>(validReviewTopSlateOutcomePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
