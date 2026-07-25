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
  UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport,
} from './unified-positive-held-local-preview-valid-review-separator-diagnostic';

type InstalledRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];
type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];

interface SimulationRow {
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
  riskPoints: number | null;
  proofToEntryMinutes: number | null;
  outcomeBucket: TimingRow['outcomeBucket'] | 'missing_timing';
  resolvedOneMesPl: number | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  rankBefore: number;
  rankAfter: number;
  wasTopBefore: boolean;
  isTopAfter: boolean;
  penaltyApplied: boolean;
  falseWinnerDemotion: boolean;
  livePromotionAllowed: false;
}

interface SlateSummary {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  topBeforeTicketId: string | null;
  topBeforeSetupType: string | null;
  topBeforeOneMesPl: number | null;
  topAfterTicketId: string | null;
  topAfterSetupType: string | null;
  topAfterOneMesPl: number | null;
  topChanged: boolean;
  penalizedTopBefore: boolean;
  penalizedTopAfter: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport {
  reportType: 'unified_positive_held_local_preview_raidReclaim_extreme_risk_rank_simulation';
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
    separatorDiagnosticPath: string | null;
  };
  assumptions: {
    simulationIsResearchOnly: true;
    penaltyUsesPreEntryRiskOnly: true;
    outcomeUsedForEvaluationOnly: true;
    noRankPenaltyInstalled: true;
    noHardBlockInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  scoring: {
    setupType: 'raidReclaim';
    riskThresholdPoints: 15;
    penaltyPoints: number;
    baselineUsesInstalledScore: true;
  };
  summary: {
    installedRows: number;
    joinedRows: number;
    slates: number;
    penalizedRows: number;
    penalizedTopBeforeSlates: number;
    penalizedTopAfterSlates: number;
    topChangedSlates: number;
    topBeforeOneMesPl: number | null;
    topAfterOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    falseWinnerDemotions: number;
    canExecuteFalseRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'continue_research_only_extreme_risk_penalty'
      | 'review_note_only'
      | 'reject_extreme_risk_penalty'
      | 'reject_missing_source';
  };
  rows: SimulationRow[];
  slates: SlateSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const RISK_THRESHOLD_POINTS = 15;
const PENALTY_POINTS = 12;

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

function authority(): UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport['authority'] {
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

function isReviewCandidate(row: InstalledRow): boolean {
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

function shouldPenalize(row: InstalledRow, timing: TimingRow | undefined): boolean {
  return isReviewCandidate(row) &&
    row.setupType === 'raidReclaim' &&
    typeof timing?.riskPoints === 'number' &&
    timing.riskPoints > RISK_THRESHOLD_POINTS;
}

function scoreAfter(row: InstalledRow, timing: TimingRow | undefined): number | null {
  if (typeof row.installedScore !== 'number') return null;
  return row.installedScore - (shouldPenalize(row, timing) ? PENALTY_POINTS : 0);
}

function compareByScore(a: SimulationRow, b: SimulationRow, key: 'scoreBefore' | 'scoreAfter'): number {
  return (b[key] ?? Number.NEGATIVE_INFINITY) - (a[key] ?? Number.NEGATIVE_INFINITY) ||
    Number(isReviewLike(b)) - Number(isReviewLike(a)) ||
    a.ticketId.localeCompare(b.ticketId);
}

function isReviewLike(row: SimulationRow): boolean {
  return row.candidateBookState === 'human_review' &&
    row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending';
}

function joinedRows(installedRows: InstalledRow[], timingRows: TimingRow[]): SimulationRow[] {
  const timingByTicket = new Map(timingRows.map((row) => [row.ticketId, row]));
  return installedRows.map((row) => {
    const timing = timingByTicket.get(row.ticketId);
    const after = scoreAfter(row, timing);
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
      riskPoints: timing?.riskPoints ?? null,
      proofToEntryMinutes: timing?.proofToEntryMinutes ?? null,
      outcomeBucket: timing?.outcomeBucket ?? 'missing_timing',
      resolvedOneMesPl: timing?.resolvedOneMesPl ?? null,
      scoreBefore: row.installedScore,
      scoreAfter: after,
      rankBefore: 0,
      rankAfter: 0,
      wasTopBefore: false,
      isTopAfter: false,
      penaltyApplied: shouldPenalize(row, timing),
      falseWinnerDemotion: false,
      livePromotionAllowed: false,
    };
  });
}

function simulate(rows: SimulationRow[]): { rows: SimulationRow[]; slates: SlateSummary[] } {
  const groups = new Map<string, SimulationRow[]>();
  for (const row of rows) {
    groups.set(row.slateId, [...(groups.get(row.slateId) || []), row]);
  }
  const simulatedRows: SimulationRow[] = [];
  const slates: SlateSummary[] = [];
  for (const [slateId, slateRows] of groups) {
    const before = [...slateRows].sort((a, b) => compareByScore(a, b, 'scoreBefore'));
    const after = [...slateRows].sort((a, b) => compareByScore(a, b, 'scoreAfter'));
    const beforeRanks = new Map(before.map((row, index) => [row.ticketId, index + 1]));
    const afterRanks = new Map(after.map((row, index) => [row.ticketId, index + 1]));
    const topBefore = before[0] || null;
    const topAfter = after[0] || null;
    for (const row of slateRows) {
      const rankBefore = beforeRanks.get(row.ticketId) ?? 0;
      const rankAfter = afterRanks.get(row.ticketId) ?? 0;
      const wasTopBefore = topBefore?.ticketId === row.ticketId;
      const isTopAfter = topAfter?.ticketId === row.ticketId;
      simulatedRows.push({
        ...row,
        rankBefore,
        rankAfter,
        wasTopBefore,
        isTopAfter,
        falseWinnerDemotion: row.penaltyApplied && rankAfter > rankBefore && row.outcomeBucket === 'winner_t1_t2',
      });
    }
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      topBeforeTicketId: topBefore?.ticketId || null,
      topBeforeSetupType: topBefore?.setupType || null,
      topBeforeOneMesPl: topBefore?.resolvedOneMesPl ?? null,
      topAfterTicketId: topAfter?.ticketId || null,
      topAfterSetupType: topAfter?.setupType || null,
      topAfterOneMesPl: topAfter?.resolvedOneMesPl ?? null,
      topChanged: topBefore?.ticketId !== topAfter?.ticketId,
      penalizedTopBefore: Boolean(topBefore?.penaltyApplied),
      penalizedTopAfter: Boolean(topAfter?.penaltyApplied),
    });
  }
  return {
    rows: simulatedRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.rankAfter - b.rankAfter),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function recommendation(args: {
  blockers: string[];
  penalizedRows: number;
  topSelectionDeltaOneMesPl: number | null;
  falseWinnerDemotions: number;
  penalizedTopAfterSlates: number;
  penalizedTopBeforeSlates: number;
}): UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport['summary']['recommendation'] {
  if (args.blockers.length) return 'reject_missing_source';
  if (args.penalizedRows === 0) return 'reject_extreme_risk_penalty';
  if ((args.topSelectionDeltaOneMesPl ?? 0) > 0 && args.falseWinnerDemotions <= 1 && args.penalizedTopAfterSlates < args.penalizedTopBeforeSlates) {
    return 'continue_research_only_extreme_risk_penalty';
  }
  if ((args.topSelectionDeltaOneMesPl ?? 0) >= 0) return 'review_note_only';
  return 'reject_extreme_risk_penalty';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview raidReclaim Extreme-Risk Rank Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only rank simulation. It does not install rank penalties, remove raidReclaim, hard-block a setup, post Discord, write Supabase, read live bridge data, run setupScanner, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Penalized raidReclaim risk > 15 rows: ${report.summary.penalizedRows}.`,
    `- Penalized top before/after: ${report.summary.penalizedTopBeforeSlates}/${report.summary.penalizedTopAfterSlates}.`,
    `- Top changed slates: ${report.summary.topChangedSlates}.`,
    `- Top P/L before/after: ${report.summary.topBeforeOneMesPl ?? '-'}/${report.summary.topAfterOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- False winner demotions: ${report.summary.falseWinnerDemotions}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Rows | Top Before | Setup Before | P/L Before | Top After | Setup After | P/L After |',
    '|---|---:|---|---|---:|---|---|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${escapeTable(row.topBeforeTicketId ?? '-')} | ${row.topBeforeSetupType ?? '-'} | ${row.topBeforeOneMesPl ?? '-'} | ${escapeTable(row.topAfterTicketId ?? '-')} | ${row.topAfterSetupType ?? '-'} | ${row.topAfterOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport(args: {
  reportDir: string;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  separatorDiagnosticPath: string | null;
  separatorDiagnosticReport: UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport {
  const installedRows = args.installedScoreComparisonReport?.rows || [];
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const baseRows = joinedRows(installedRows, timingRows);
  const { rows, slates } = simulate(baseRows);
  const topBeforeOneMesPl = sum(slates.map((row) => row.topBeforeOneMesPl));
  const topAfterOneMesPl = sum(slates.map((row) => row.topAfterOneMesPl));
  const topSelectionDeltaOneMesPl = topBeforeOneMesPl === null || topAfterOneMesPl === null ? null : round(topAfterOneMesPl - topBeforeOneMesPl);
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
    !args.separatorDiagnosticPath ? 'missing separator diagnostic path' : null,
    !args.separatorDiagnosticReport ? 'missing separator diagnostic report' : null,
    args.separatorDiagnosticReport && args.separatorDiagnosticReport.status !== 'pass'
      ? `separator diagnostic status ${args.separatorDiagnosticReport.status}`
      : null,
    args.separatorDiagnosticReport &&
      !args.separatorDiagnosticReport.topCautionBuckets.some((row) => row.key === 'raidReclaim|risk_extreme_over_15')
      ? 'separator diagnostic did not identify raidReclaim|risk_extreme_over_15 caution bucket'
      : null,
    installedRows.length === 0 ? 'no installed-score rows found' : null,
    timingRows.length === 0 ? 'no source/proof timing rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const penalizedRows = rows.filter((row) => row.penaltyApplied);
  const rec = recommendation({
    blockers,
    penalizedRows: penalizedRows.length,
    topSelectionDeltaOneMesPl,
    falseWinnerDemotions: rows.filter((row) => row.falseWinnerDemotion).length,
    penalizedTopAfterSlates: slates.filter((row) => row.penalizedTopAfter).length,
    penalizedTopBeforeSlates: slates.filter((row) => row.penalizedTopBefore).length,
  });
  const base: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_raidReclaim_extreme_risk_rank_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
      sourceProofTimingPath: args.sourceProofTimingPath,
      separatorDiagnosticPath: args.separatorDiagnosticPath,
    },
    assumptions: {
      simulationIsResearchOnly: true,
      penaltyUsesPreEntryRiskOnly: true,
      outcomeUsedForEvaluationOnly: true,
      noRankPenaltyInstalled: true,
      noHardBlockInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    scoring: {
      setupType: 'raidReclaim',
      riskThresholdPoints: RISK_THRESHOLD_POINTS,
      penaltyPoints: PENALTY_POINTS,
      baselineUsesInstalledScore: true,
    },
    summary: {
      installedRows: installedRows.length,
      joinedRows: rows.length,
      slates: slates.length,
      penalizedRows: penalizedRows.length,
      penalizedTopBeforeSlates: slates.filter((row) => row.penalizedTopBefore).length,
      penalizedTopAfterSlates: slates.filter((row) => row.penalizedTopAfter).length,
      topChangedSlates: slates.filter((row) => row.topChanged).length,
      topBeforeOneMesPl,
      topAfterOneMesPl,
      topSelectionDeltaOneMesPl,
      falseWinnerDemotions: rows.filter((row) => row.falseWinnerDemotion).length,
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      livePromotionAllowedRows: 0,
      recommendation: rec,
    },
    rows,
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Do not use extreme-risk simulation until installed score, timing, and separator reports all pass.']
      : rec === 'continue_research_only_extreme_risk_penalty'
        ? [
          'Continue research only with a raidReclaim risk-width rank penalty candidate; do not install live behavior yet.',
          'Review any false winner demotion manually before proposing scanner-visible behavior.',
        ]
        : rec === 'review_note_only'
          ? ['Use raidReclaim extreme-risk as a review-note hypothesis only; rank effect is not strong enough.']
          : ['Reject raidReclaim extreme-risk rank penalty for now.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport(
  report: UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-raidReclaim-extreme-risk-rank-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const separatorDiagnosticPath = readFlag(args, '--separator-diagnostic') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-valid-review-separator-diagnostic-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport({
    reportDir: outDir,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    separatorDiagnosticPath,
    separatorDiagnosticReport: separatorDiagnosticPath && fs.existsSync(separatorDiagnosticPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport>(separatorDiagnosticPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
