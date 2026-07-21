import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';

interface TimeframeStory {
  timeframe: string;
  sufficiency: string;
  shortContext: 'support' | 'caution' | 'neutral' | 'data_limited';
  recentTrend: string;
  entryRangePercentile: number | null;
}

interface SlateStory {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  proofTime: string;
  direction: Direction;
  riskBand: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: string;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  sweepCollision: boolean;
  htfCollisionFromSlate: boolean;
  session: {
    openingDriveDirection: string;
    sweptNyPremarketHigh: boolean;
    brokeNyPremarketLow: boolean;
    entryInEthPercentile: number | null;
  };
  timeframeStories: TimeframeStory[];
  tactical15m60mContextVerdict: string;
  storyVerdict: 'supported_short' | 'mixed_short' | 'caution_short' | 'data_limited';
}

interface HtfStoryReport {
  reportType?: string;
  slateStories?: SlateStory[];
}

interface GroupSummary {
  key: string;
  slates: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  oneMesPl: number | null;
  averageRiskPoints: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
  averageProofMinute: number | null;
  nyPremarketLowBreakRate: number | null;
  nyPremarketHighSweepRate: number | null;
  bearishOpeningDriveRate: number | null;
  averageEntryEthPercentile: number | null;
  averageHtfSupportCount: number | null;
  averageHtfCautionCount: number | null;
}

interface ComparisonRow extends GroupSummary {
  read: string;
}

export interface OpeningDriveWinnerUnresolvedComparisonReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_winner_unresolved_comparison';
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
    livePromotionAllowed: false;
  };
  source: {
    htfStoryReportPath: string | null;
  };
  assumptions: {
    unresolvedRowsAreNotWinsOrLosses: true;
    htfStoryIsContextOnly: true;
    outputIsResearchOnly: true;
  };
  summary: {
    sourceSlates: number;
    comparisonSlates: number;
    winners: number;
    losses: number;
    unresolved: number;
    mixedCautionWinnerSlates: number;
    mixedCautionWinnerOneMesPl: number | null;
    unresolvedNoFillSlates: number;
    unresolvedNoTargetSlates: number;
    livePromotionAllowedRows: 0;
    recommendation: 'advance_no_fill_vs_later_winner_selector_timing_audit' | 'hold_for_more_resolved_samples' | 'fix_missing_inputs';
  };
  outcomeGroups: GroupSummary[];
  verdictGroups: GroupSummary[];
  comparisonRows: ComparisonRow[];
  unresolvedRows: SlateStory[];
  mixedCautionWinners: SlateStory[];
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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
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

function rate(values: boolean[]): number | null {
  return values.length ? round(values.filter(Boolean).length / values.length) : null;
}

function proofMinute(proofTime: string): number | null {
  const match = proofTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function htfSupportCount(row: SlateStory): number {
  return row.timeframeStories.filter((story) => story.shortContext === 'support').length;
}

function htfCautionCount(row: SlateStory): number {
  return row.timeframeStories.filter((story) => story.shortContext === 'caution').length;
}

function summarize(key: string, rows: SlateStory[]): GroupSummary {
  return {
    key,
    slates: rows.length,
    winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
    losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
    unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
    blocked: rows.filter((row) => row.outcomeBucket === 'blocked').length,
    oneMesPl: sum(rows.map((row) => row.oneMesPl)),
    averageRiskPoints: avg(rows.map((row) => row.riskPoints)),
    averageMfeR: avg(rows.map((row) => row.mfeR)),
    averageMaeR: avg(rows.map((row) => row.maeR)),
    averageProofMinute: avg(rows.map((row) => proofMinute(row.proofTime))),
    nyPremarketLowBreakRate: rate(rows.map((row) => row.session.brokeNyPremarketLow)),
    nyPremarketHighSweepRate: rate(rows.map((row) => row.session.sweptNyPremarketHigh)),
    bearishOpeningDriveRate: rate(rows.map((row) => row.session.openingDriveDirection === 'bearish')),
    averageEntryEthPercentile: avg(rows.map((row) => row.session.entryInEthPercentile)),
    averageHtfSupportCount: avg(rows.map(htfSupportCount)),
    averageHtfCautionCount: avg(rows.map(htfCautionCount)),
  };
}

function groupBy(rows: SlateStory[], keyFor: (row: SlateStory) => string): GroupSummary[] {
  const groups = new Map<string, SlateStory[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()].map(([key, group]) => summarize(key, group));
}

function readComparison(group: GroupSummary): string {
  if (group.key === 'mixed_or_caution_winners') {
    return 'Winners in mixed/caution HTF were mostly upper-range short opportunities. HTF caution did not reject edge by itself.';
  }
  if (group.key === 'unresolved_no_fill') {
    return 'No-fill rows are mainly timing/price-missed evidence, not failed direction evidence.';
  }
  if (group.key === 'unresolved_no_target') {
    return 'No-target rows filled but did not resolve inside the session; compare proof timing and risk before any selector rule.';
  }
  if (group.key === 'clean_loss') {
    return 'The only loss remains valid after path-order drilldown and must stay in validation.';
  }
  return 'Reference comparison bucket.';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function groupTable(groups: GroupSummary[]): string[] {
  return [
    '| Group | Slates | W/L/U/B | P/L | Avg Risk | Avg MFE R | Avg MAE R | Avg Proof Min | NY Low Break | NY High Sweep | Bearish OD | Avg ETH % | HTF Support | HTF Caution |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...groups.map((row) => `| ${escapeTable(row.key)} | ${row.slates} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oneMesPl ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} | ${row.averageProofMinute ?? '-'} | ${row.nyPremarketLowBreakRate ?? '-'} | ${row.nyPremarketHighSweepRate ?? '-'} | ${row.bearishOpeningDriveRate ?? '-'} | ${row.averageEntryEthPercentile ?? '-'} | ${row.averageHtfSupportCount ?? '-'} | ${row.averageHtfCautionCount ?? '-'} |`),
  ];
}

function buildMarkdown(report: Omit<OpeningDriveWinnerUnresolvedComparisonReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep Winner vs Unresolved Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved HTF story slates. It does not run setupScanner, change ranking, post Discord, write Supabase, read live bridge data, or approve execution.',
    '',
    '## Summary',
    `- Comparison slates: ${report.summary.comparisonSlates}.`,
    `- W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Mixed/caution winners: ${report.summary.mixedCautionWinnerSlates}; P/L: ${report.summary.mixedCautionWinnerOneMesPl ?? '-'}.`,
    `- Unresolved no-fill/no-target: ${report.summary.unresolvedNoFillSlates}/${report.summary.unresolvedNoTargetSlates}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Comparison Buckets',
    ...groupTable(report.comparisonRows),
    '',
    '## Verdict Groups',
    ...groupTable(report.verdictGroups),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveWinnerUnresolvedComparisonReport(args: {
  htfStoryReportPath: string | null;
  htfStoryReport: HtfStoryReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveWinnerUnresolvedComparisonReport {
  const slates = Array.isArray(args.htfStoryReport?.slateStories) ? args.htfStoryReport.slateStories : [];
  const comparisonSlates = slates.filter((row) => row.direction === 'SHORT' && row.sweepCollision);
  const unresolvedRows = comparisonSlates.filter((row) => row.outcomeBucket === 'unresolved');
  const mixedCautionWinners = comparisonSlates.filter((row) =>
    row.outcomeBucket === 'winner' && (row.storyVerdict === 'mixed_short' || row.storyVerdict === 'caution_short'));
  const cleanLossRows = comparisonSlates.filter((row) => row.outcomeBucket === 'loss');
  const comparisonRows: ComparisonRow[] = [
    { ...summarize('mixed_or_caution_winners', mixedCautionWinners), read: readComparison({ ...summarize('mixed_or_caution_winners', mixedCautionWinners) }) },
    { ...summarize('unresolved_no_fill', unresolvedRows.filter((row) => row.outcomeLabel === 'no_fill')), read: readComparison({ ...summarize('unresolved_no_fill', unresolvedRows.filter((row) => row.outcomeLabel === 'no_fill')) }) },
    { ...summarize('unresolved_no_target', unresolvedRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit')), read: readComparison({ ...summarize('unresolved_no_target', unresolvedRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit')) }) },
    { ...summarize('clean_loss', cleanLossRows), read: readComparison({ ...summarize('clean_loss', cleanLossRows) }) },
  ];
  const blockers = [
    !args.htfStoryReportPath ? 'missing HTF story report path' : null,
    !args.htfStoryReport ? 'missing HTF story report' : null,
    slates.length === 0 ? 'HTF story report has no slate stories' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_missing_inputs' as const
    : mixedCautionWinners.length >= 6 && unresolvedRows.length >= 6
      ? 'advance_no_fill_vs_later_winner_selector_timing_audit' as const
      : 'hold_for_more_resolved_samples' as const;
  const base: Omit<OpeningDriveWinnerUnresolvedComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_winner_unresolved_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
      livePromotionAllowed: false,
    },
    source: { htfStoryReportPath: args.htfStoryReportPath },
    assumptions: {
      unresolvedRowsAreNotWinsOrLosses: true,
      htfStoryIsContextOnly: true,
      outputIsResearchOnly: true,
    },
    summary: {
      sourceSlates: slates.length,
      comparisonSlates: comparisonSlates.length,
      winners: comparisonSlates.filter((row) => row.outcomeBucket === 'winner').length,
      losses: comparisonSlates.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: unresolvedRows.length,
      mixedCautionWinnerSlates: mixedCautionWinners.length,
      mixedCautionWinnerOneMesPl: sum(mixedCautionWinners.map((row) => row.oneMesPl)),
      unresolvedNoFillSlates: unresolvedRows.filter((row) => row.outcomeLabel === 'no_fill').length,
      unresolvedNoTargetSlates: unresolvedRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    outcomeGroups: groupBy(comparisonSlates, (row) => row.outcomeBucket),
    verdictGroups: groupBy(comparisonSlates, (row) => row.storyVerdict),
    comparisonRows,
    unresolvedRows,
    mixedCautionWinners,
    blockers,
    recommendations: blockers.length
      ? ['Provide the repaired OpeningDrive/Sweep HTF story report before comparing winner and unresolved rows.']
      : [
        'Do not hard-filter mixed/caution HTF context; the strongest resolved winners include those buckets.',
        'Treat no-fill unresolved rows as timing/re-entry candidates, not directional failures.',
        'Next research should isolate no-fill versus later-valid-entry timing before any scanner-owned selector proposal.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveWinnerUnresolvedComparisonReport(
  report: OpeningDriveWinnerUnresolvedComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-winner-unresolved-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveWinnerUnresolvedComparisonCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const htfStoryReportPath = readFlag(args, '--htf-story-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-htf-story-audit-\d+\.json$/);
  const report = buildOpeningDriveWinnerUnresolvedComparisonReport({
    htfStoryReportPath,
    htfStoryReport: readJson<HtfStoryReport>(htfStoryReportPath),
  });
  const paths = writeOpeningDriveWinnerUnresolvedComparisonReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runOpeningDriveWinnerUnresolvedComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
