import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';

type OutcomeBucket = 'winner_t1_t2' | 'loss_stopped_before_t1' | 'unresolved' | 'blocked';

interface TimingSummary {
  setupType: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  grossResolvedOneMesPl: number | null;
  avgWinnerProofToEntryMinutes: number | null;
  avgLossProofToEntryMinutes: number | null;
  avgWinnerRiskPoints: number | null;
  avgLossRiskPoints: number | null;
  avgWinnerMfeR: number | null;
  avgLossMfeR: number | null;
  avgWinnerMaeR: number | null;
  avgLossMaeR: number | null;
  sameBarEntryWinners: number;
  sameBarEntryLosses: number;
  staleEntryOver30MinuteWinners: number;
  staleEntryOver30MinuteLosses: number;
  recommendation: string;
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow['outcomeLabel'];
  resolvedOneMesPl: number | null;
  proofTime: string;
  entryHitTime: string | null;
  proofToEntryMinutes: number | null;
  riskPoints: number;
  mfeR: number | null;
  maeR: number | null;
  issueTags: string[];
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing';
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
    replayPackageOutcomePath: string | null;
  };
  assumptions: {
    usesReadOnlyOutcomeReportOnly: true;
    fullDeliveryWinnerMeansT1AndT2Hit: true;
    stoppedBeforeT1MeansTimingLoss: true;
    unresolvedRowsAreNotWinsOrLosses: true;
    staleEntryThresholdMinutes: 30;
    livePromotionAllowed: false;
  };
  summary: {
    evaluatedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    blocked: number;
    grossResolvedOneMesPl: number | null;
    positiveModelGroups: number;
    negativeModelGroups: number;
    unresolvedModelGroups: number;
    livePromotionAllowedRows: 0;
  };
  modelTiming: TimingSummary[];
  rows: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const STALE_ENTRY_THRESHOLD_MINUTES = 30;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length) : null;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function outcomeBucket(row: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow): OutcomeBucket {
  if (row.outcomeStatus === 'blocked') return 'blocked';
  if (row.outcomeLabel === 't1_and_t2_hit') return 'winner_t1_t2';
  if (row.outcomeLabel === 'stopped_before_t1') return 'loss_stopped_before_t1';
  return 'unresolved';
}

function proofToEntryMinutes(row: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow): number | null {
  if (!row.entryHitTime) return null;
  const minutes = (timeMs(row.entryHitTime) - timeMs(row.proofTime)) / 60000;
  return Number.isFinite(minutes) ? round(minutes) : null;
}

function toR(value: number | null, riskPoints: number): number | null {
  return value === null || riskPoints <= 0 ? null : round(value / riskPoints);
}

function issueTags(row: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow, minutes: number | null): string[] {
  const tags = [
    row.outcomeLabel === 't1_and_t2_hit' ? 'full_delivery' : null,
    row.outcomeLabel === 'stopped_before_t1' ? 'stopped_before_t1' : null,
    row.outcomeLabel === 'no_fill' ? 'no_fill' : null,
    row.outcomeLabel === 'no_target_or_stop_hit' ? 'no_target_or_stop_hit' : null,
    minutes === 0 ? 'same_bar_entry' : null,
    minutes !== null && minutes > STALE_ENTRY_THRESHOLD_MINUTES ? 'stale_entry_over_30m' : null,
    row.maximumAdverseExcursion !== null && row.riskPoints > 0 && row.maximumAdverseExcursion >= row.riskPoints ? 'adverse_excursion_at_or_over_1r' : null,
    row.intrabarAmbiguity ? 'intrabar_ambiguity' : null,
  ].filter((tag): tag is string => Boolean(tag));
  return tags.length ? tags : ['clean_research_row'];
}

function buildRow(row: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  const minutes = proofToEntryMinutes(row);
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    outcomeBucket: outcomeBucket(row),
    outcomeLabel: row.outcomeLabel,
    resolvedOneMesPl: row.resolvedOneMesPl,
    proofTime: row.proofTime,
    entryHitTime: row.entryHitTime,
    proofToEntryMinutes: minutes,
    riskPoints: row.riskPoints,
    mfeR: toR(row.maximumFavorableExcursion, row.riskPoints),
    maeR: toR(row.maximumAdverseExcursion, row.riskPoints),
    issueTags: issueTags(row, minutes),
  };
}

function modelRecommendation(args: {
  setupType: string;
  grossResolvedOneMesPl: number | null;
  winners: number;
  losses: number;
  unresolved: number;
}): string {
  if ((args.grossResolvedOneMesPl ?? 0) > 0 && args.losses === 0) {
    return 'Keep in research. This package shows positive full-delivery evidence with no stopped-before-T1 rows.';
  }
  if ((args.grossResolvedOneMesPl ?? 0) > 0) {
    return 'Keep in research. Positive package result, but isolate stopped-before-T1 timing before live-facing ranking.';
  }
  if (args.losses > args.winners) {
    return 'Do not remove from this batch alone. Needs a narrower proof/timing filter before any rank overlay expansion.';
  }
  if (args.unresolved > 0 && args.winners === 0) {
    return 'Do not rank higher yet. More filled evidence is required.';
  }
  return 'Hold for more evidence; no live behavior change is justified.';
}

function buildModelTiming(rows: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow[]): TimingSummary[] {
  const grouped = new Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow[]>();
  for (const row of rows) {
    grouped.set(row.setupType, [...(grouped.get(row.setupType) || []), row]);
  }
  return [...grouped.entries()]
    .map(([setupType, groupRows]) => {
      const winners = groupRows.filter((row) => row.outcomeBucket === 'winner_t1_t2');
      const losses = groupRows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1');
      const unresolved = groupRows.filter((row) => row.outcomeBucket === 'unresolved');
      const grossResolvedOneMesPl = sum(groupRows.map((row) => row.resolvedOneMesPl));
      return {
        setupType,
        rows: groupRows.length,
        winners: winners.length,
        losses: losses.length,
        unresolved: unresolved.length,
        blocked: groupRows.filter((row) => row.outcomeBucket === 'blocked').length,
        grossResolvedOneMesPl,
        avgWinnerProofToEntryMinutes: avg(winners.map((row) => row.proofToEntryMinutes)),
        avgLossProofToEntryMinutes: avg(losses.map((row) => row.proofToEntryMinutes)),
        avgWinnerRiskPoints: avg(winners.map((row) => row.riskPoints)),
        avgLossRiskPoints: avg(losses.map((row) => row.riskPoints)),
        avgWinnerMfeR: avg(winners.map((row) => row.mfeR)),
        avgLossMfeR: avg(losses.map((row) => row.mfeR)),
        avgWinnerMaeR: avg(winners.map((row) => row.maeR)),
        avgLossMaeR: avg(losses.map((row) => row.maeR)),
        sameBarEntryWinners: winners.filter((row) => row.issueTags.includes('same_bar_entry')).length,
        sameBarEntryLosses: losses.filter((row) => row.issueTags.includes('same_bar_entry')).length,
        staleEntryOver30MinuteWinners: winners.filter((row) => row.issueTags.includes('stale_entry_over_30m')).length,
        staleEntryOver30MinuteLosses: losses.filter((row) => row.issueTags.includes('stale_entry_over_30m')).length,
        recommendation: modelRecommendation({
          setupType,
          grossResolvedOneMesPl,
          winners: winners.length,
          losses: losses.length,
          unresolved: unresolved.length,
        }),
      };
    })
    .sort((a, b) => a.setupType.localeCompare(b.setupType));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Replay Package Source/Proof Timing',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source/proof timing validation. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Evaluated rows: ${report.summary.evaluatedRows}.`,
    `- Winners: ${report.summary.winners}.`,
    `- Losses: ${report.summary.losses}.`,
    `- Unresolved: ${report.summary.unresolved}.`,
    `- Blocked: ${report.summary.blocked}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- Positive model groups: ${report.summary.positiveModelGroups}.`,
    `- Negative model groups: ${report.summary.negativeModelGroups}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Model Timing',
    '| Setup | Rows | Winners | Losses | Unresolved | P/L | Avg Proof->Entry W/L | Avg Risk W/L | Avg MFE R W/L | Avg MAE R W/L | Same-Bar W/L | Stale>30 W/L | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|',
    ...report.modelTiming.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners} | ${row.losses} | ${row.unresolved} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.avgWinnerProofToEntryMinutes ?? '-'}/${row.avgLossProofToEntryMinutes ?? '-'} | ${row.avgWinnerRiskPoints ?? '-'}/${row.avgLossRiskPoints ?? '-'} | ${row.avgWinnerMfeR ?? '-'}/${row.avgLossMfeR ?? '-'} | ${row.avgWinnerMaeR ?? '-'}/${row.avgLossMaeR ?? '-'} | ${row.sameBarEntryWinners}/${row.sameBarEntryLosses} | ${row.staleEntryOver30MinuteWinners}/${row.staleEntryOver30MinuteLosses} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Rows',
    '| Ticket | Date | Session | Setup | Side | Bucket | Outcome | P/L | Proof->Entry Min | Risk | MFE R | MAE R | Tags |',
    '|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.outcomeBucket} | ${row.outcomeLabel} | ${row.resolvedOneMesPl ?? '-'} | ${row.proofToEntryMinutes ?? '-'} | ${row.riskPoints} | ${row.mfeR ?? '-'} | ${row.maeR ?? '-'} | ${escapeTable(row.issueTags.join(', '))} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport(args: {
  reportDir: string;
  replayPackageOutcomePath: string | null;
  replayPackageOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport {
  const outcomeRows = args.replayPackageOutcomeReport?.rows || [];
  const rows = outcomeRows.map(buildRow);
  const modelTiming = buildModelTiming(rows);
  const blockers = [
    !args.replayPackageOutcomePath ? 'missing replay package outcome path' : null,
    !args.replayPackageOutcomeReport ? 'missing replay package outcome report' : null,
    args.replayPackageOutcomeReport && args.replayPackageOutcomeReport.status !== 'pass' ? `replay package outcome status ${args.replayPackageOutcomeReport.status}` : null,
    rows.length === 0 ? 'no outcome rows evaluated' : null,
    rows.some((row) => row.outcomeBucket === 'blocked') ? 'one or more outcome rows are blocked' : null,
  ].filter((item): item is string => Boolean(item));
  const positiveModelGroups = modelTiming.filter((row) => (row.grossResolvedOneMesPl ?? 0) > 0).length;
  const negativeModelGroups = modelTiming.filter((row) => (row.grossResolvedOneMesPl ?? 0) < 0).length;
  const unresolvedModelGroups = modelTiming.filter((row) => row.unresolved > 0).length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replayPackageOutcomePath: args.replayPackageOutcomePath,
    },
    assumptions: {
      usesReadOnlyOutcomeReportOnly: true,
      fullDeliveryWinnerMeansT1AndT2Hit: true,
      stoppedBeforeT1MeansTimingLoss: true,
      unresolvedRowsAreNotWinsOrLosses: true,
      staleEntryThresholdMinutes: STALE_ENTRY_THRESHOLD_MINUTES,
      livePromotionAllowed: false,
    },
    summary: {
      evaluatedRows: rows.length,
      winners: rows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length,
      losses: rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      blocked: rows.filter((row) => row.outcomeBucket === 'blocked').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      positiveModelGroups,
      negativeModelGroups,
      unresolvedModelGroups,
      livePromotionAllowedRows: 0,
    },
    modelTiming,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use timing findings until the outcome report has no blockers.']
      : [
        'Keep the positive model families in research; do not remove or broaden models from this timing report alone.',
        'Use the negative model groups as the next narrow filter target: isolate proof-to-entry timing, same-bar entry, stale-entry, and MAE/R behavior before any scanner-visible rank overlay expansion.',
        'No live promotion, Discord posting, Supabase write, canExecute change, or trading-rule change is recommended from this phase.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport(
  report: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-replay-package-source-proof-timing-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const replayPackageOutcomePath = readFlag(args, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport({
    reportDir: outDir,
    replayPackageOutcomePath,
    replayPackageOutcomeReport: replayPackageOutcomePath && fs.existsSync(replayPackageOutcomePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(replayPackageOutcomePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
