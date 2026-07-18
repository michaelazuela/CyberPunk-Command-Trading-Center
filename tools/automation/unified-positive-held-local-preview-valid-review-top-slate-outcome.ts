import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

type InstalledRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];
type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];
type OutcomeBucket = TimingRow['outcomeBucket'] | 'missing_timing';

interface TopSlateOutcomeRow {
  slateId: string;
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  installedScore: number | null;
  outcomeBucket: OutcomeBucket;
  resolvedOneMesPl: number | null;
  riskPoints: number | null;
  proofToEntryMinutes: number | null;
  entryHitTime: string | null;
  validSweepLead: boolean;
  canExecute: false;
  livePromotionAllowed: false;
}

interface ModelOutcomeSummary {
  setupType: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  missingTiming: number;
  grossResolvedOneMesPl: number | null;
  avgWinnerRiskPoints: number | null;
  avgLossRiskPoints: number | null;
  avgWinnerProofToEntryMinutes: number | null;
  avgLossProofToEntryMinutes: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport {
  reportType: 'unified_positive_held_local_preview_valid_review_top_slate_outcome';
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
  };
  summary: {
    installedScoreRows: number;
    sourceProofTimingRows: number;
    slates: number;
    validReviewTopSlates: number;
    winners: number;
    losses: number;
    unresolved: number;
    blocked: number;
    missingTiming: number;
    grossResolvedOneMesPl: number | null;
    canExecuteFalseRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'mine_valid_review_winner_loss_separators'
      | 'reject_valid_review_top_slate_outcome';
  };
  modelOutcomes: ModelOutcomeSummary[];
  rows: TopSlateOutcomeRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport['authority'] {
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

function isValidReview(row: InstalledRow): boolean {
  return row.canExecute === false &&
    row.candidateBookState === 'human_review' &&
    row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending' &&
    row.entryPreserved &&
    row.stopPreserved &&
    row.target1Preserved &&
    row.target2Preserved &&
    row.riskPreserved;
}

function compareRows(a: InstalledRow, b: InstalledRow): number {
  return (b.installedScore ?? Number.NEGATIVE_INFINITY) - (a.installedScore ?? Number.NEGATIVE_INFINITY) ||
    Number(isValidReview(b)) - Number(isValidReview(a)) ||
    a.ticketId.localeCompare(b.ticketId);
}

function groupTopRows(rows: InstalledRow[]): InstalledRow[] {
  const groups = new Map<string, InstalledRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()]
    .map(([, groupRows]) => [...groupRows].sort(compareRows)[0])
    .filter((row): row is InstalledRow => Boolean(row))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session));
}

function buildRows(installedRows: InstalledRow[], timingRows: TimingRow[]): TopSlateOutcomeRow[] {
  const timingByTicket = new Map(timingRows.map((row) => [row.ticketId, row]));
  return groupTopRows(installedRows)
    .filter(isValidReview)
    .map((row) => {
      const timing = timingByTicket.get(row.ticketId);
      return {
        slateId: `${row.tradeDate}|${row.session}`,
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        installedScore: row.installedScore,
        outcomeBucket: timing?.outcomeBucket ?? 'missing_timing',
        resolvedOneMesPl: timing?.resolvedOneMesPl ?? null,
        riskPoints: timing?.riskPoints ?? null,
        proofToEntryMinutes: timing?.proofToEntryMinutes ?? null,
        entryHitTime: timing?.entryHitTime ?? null,
        validSweepLead: row.validSweepLead,
        canExecute: false,
        livePromotionAllowed: false,
      };
    });
}

function modelOutcomes(rows: TopSlateOutcomeRow[]): ModelOutcomeSummary[] {
  const groups = new Map<string, TopSlateOutcomeRow[]>();
  for (const row of rows) {
    groups.set(row.setupType, [...(groups.get(row.setupType) || []), row]);
  }
  return [...groups.entries()].map(([setupType, groupRows]) => {
    const winners = groupRows.filter((row) => row.outcomeBucket === 'winner_t1_t2');
    const losses = groupRows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1');
    return {
      setupType,
      rows: groupRows.length,
      winners: winners.length,
      losses: losses.length,
      unresolved: groupRows.filter((row) => row.outcomeBucket === 'unresolved').length,
      blocked: groupRows.filter((row) => row.outcomeBucket === 'blocked').length,
      missingTiming: groupRows.filter((row) => row.outcomeBucket === 'missing_timing').length,
      grossResolvedOneMesPl: sum(groupRows.map((row) => row.resolvedOneMesPl)),
      avgWinnerRiskPoints: avg(winners.map((row) => row.riskPoints)),
      avgLossRiskPoints: avg(losses.map((row) => row.riskPoints)),
      avgWinnerProofToEntryMinutes: avg(winners.map((row) => row.proofToEntryMinutes)),
      avgLossProofToEntryMinutes: avg(losses.map((row) => row.proofToEntryMinutes)),
    };
  }).sort((a, b) => (b.grossResolvedOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.grossResolvedOneMesPl ?? Number.NEGATIVE_INFINITY));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Valid Review Top Slate Outcome',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only valid-review top-slate outcome diagnostic. It reads saved diagnostic reports only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Slates: ${report.summary.slates}.`,
    `- Valid-review top slates: ${report.summary.validReviewTopSlates}.`,
    `- Winners/losses/unresolved/blocked/missing: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}/${report.summary.blocked}/${report.summary.missingTiming}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Model Outcomes',
    '| Setup | Rows | Winners | Losses | Unresolved | Blocked | Missing | Gross P/L | Avg Winner Risk | Avg Loss Risk | Avg Winner Proof->Entry | Avg Loss Proof->Entry |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...report.modelOutcomes.map((row) => `| ${row.setupType} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.unresolved} | ${row.blocked} | ${row.missingTiming} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.avgWinnerRiskPoints ?? '-'} | ${row.avgLossRiskPoints ?? '-'} | ${row.avgWinnerProofToEntryMinutes ?? '-'} | ${row.avgLossProofToEntryMinutes ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport(args: {
  reportDir: string;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport {
  const installedRows = args.installedScoreComparisonReport?.rows || [];
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const rows = buildRows(installedRows, timingRows);
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
    installedRows.length === 0 ? 'no installed-score rows found' : null,
    rows.length === 0 ? 'no valid-review top slates found' : null,
    rows.some((row) => row.outcomeBucket === 'missing_timing') ? 'one or more valid-review top rows are missing source/proof timing' : null,
  ].filter((item): item is string => Boolean(item));
  const outcomes = modelOutcomes(rows);
  const base: Omit<UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_valid_review_top_slate_outcome',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
      sourceProofTimingPath: args.sourceProofTimingPath,
    },
    summary: {
      installedScoreRows: installedRows.length,
      sourceProofTimingRows: timingRows.length,
      slates: new Set(installedRows.map((row) => `${row.tradeDate}|${row.session}`)).size,
      validReviewTopSlates: rows.length,
      winners: rows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length,
      losses: rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      blocked: rows.filter((row) => row.outcomeBucket === 'blocked').length,
      missingTiming: rows.filter((row) => row.outcomeBucket === 'missing_timing').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'reject_valid_review_top_slate_outcome' : 'mine_valid_review_winner_loss_separators',
    },
    modelOutcomes: outcomes,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not mine valid-review top-slate separators until source reports join cleanly.']
      : [
        'Mine no-lookahead separators across valid-review top rows: proof timing, risk width, setup family, session, direction, and no-fill behavior.',
        'Do not change live scanner behavior, canExecute, Discord, Supabase, bridge, entry, stop, target, or risk from this diagnostic alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport(
  report: UnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-valid-review-top-slate-outcome-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport({
    reportDir: outDir,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
