import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CloseoutRow {
  ticketId: string;
  tradeDate: string;
  session: 'morning';
  setupType: 'NoInstalledSetup';
  direction: Direction;
  riskBand: string;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  bucket: OutcomeBucket;
  label: OutcomeLabel;
  oneMesPl: number | null;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  storyVerdict: string;
  htfSufficiency: string;
}

interface CloseoutReport {
  reportType?: string;
  source?: {
    htfSourcePath?: string | null;
  };
  rows?: CloseoutRow[];
}

interface HtfSourceReport {
  reportType?: string;
  bars?: {
    '5m'?: Bar[];
  };
}

interface AuditRow extends CloseoutRow {
  overnightHigh: number | null;
  overnightLow: number | null;
  overnightBars: number;
  preProofBars: number;
  raidedOvernightHigh: boolean;
  raidedOvernightLow: boolean;
  firstOvernightHighRaidTime: string | null;
  firstOvernightLowRaidTime: string | null;
  bearishDisplacementBeforeProof: boolean;
  bullishDisplacementBeforeProof: boolean;
  strongestBearishDisplacementTime: string | null;
  strongestBearishDisplacementScore: number | null;
  strongestBullishDisplacementTime: string | null;
  strongestBullishDisplacementScore: number | null;
  playStory:
    | 'buy_side_raid_bearish_displacement_short'
    | 'sell_side_raid_bearish_continuation_short'
    | 'two_sided_raid_bearish_resolution_short'
    | 'bearish_displacement_without_overnight_raid'
    | 'overnight_raid_without_bearish_displacement'
    | 'no_overnight_raid_or_displacement';
}

interface GroupSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  noFills: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
}

export interface OpeningDriveOvernightRaidDisplacementAuditReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_overnight_raid_displacement_audit';
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
    correctedCloseoutReportPath: string | null;
    htfSourcePath: string | null;
  };
  assumptions: {
    overnightWindowEt: 'prior_18_00_to_trade_date_09_30';
    preProofWindowEt: 'trade_date_09_30_to_proof_inclusive';
    usesCompletedFiveMinuteBarsOnly: true;
    displacementUsesBodyRangeQuality: true;
    htfContextIsContextOnly: true;
    outputIsResearchOnly: true;
  };
  summary: {
    sourceRows: number;
    auditRows: number;
    rowsWithOvernightContext: number;
    buySideRaidBearishDisplacementRows: number;
    sellSideRaidBearishContinuationRows: number;
    twoSidedRaidBearishResolutionRows: number;
    bearishDisplacementWithoutRaidRows: number;
    correctedOneMesPl: number | null;
    bestGroupKey: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'review_best_overnight_story_with_user_before_implementation' | 'fix_missing_inputs';
  };
  groups: GroupSummary[];
  rows: AuditRow[];
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

function normalizeTime(value: string): string {
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(normalizeTime(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
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

function barsBetween(bars: Bar[], fromInclusive: string, toExclusive: string): Bar[] {
  const from = timeMs(fromInclusive);
  const to = timeMs(toExclusive);
  return [...bars]
    .filter((bar) => timeMs(bar.time) >= from && timeMs(bar.time) < to)
    .sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function displacementScore(bar: Bar, avgRange: number, direction: Direction): number {
  const range = Math.max(0, bar.high - bar.low);
  if (range <= 0 || avgRange <= 0) return 0;
  const body = Math.abs(bar.close - bar.open);
  const bodyToRange = body / range;
  const rangeMultiple = range / avgRange;
  const closeLocation = direction === 'SHORT'
    ? (bar.close - bar.low) / range
    : (bar.high - bar.close) / range;
  const directionOk = direction === 'SHORT' ? bar.close < bar.open : bar.close > bar.open;
  if (!directionOk || bodyToRange < 0.55 || closeLocation > 0.35 || rangeMultiple < 1.15) return 0;
  return round((bodyToRange * 2) + rangeMultiple + (1 - closeLocation));
}

function strongestDisplacement(bars: Bar[], direction: Direction): { time: string | null; score: number | null } {
  const ranges = bars.map((bar) => Math.max(0, bar.high - bar.low)).filter((range) => range > 0);
  const avgRange = avg(ranges) || 0;
  let best = { time: null as string | null, score: null as number | null };
  for (const bar of bars) {
    const score = displacementScore(bar, avgRange, direction);
    if (score > (best.score || 0)) best = { time: normalizeTime(bar.time), score };
  }
  return best;
}

function classifyPlay(row: {
  raidedOvernightHigh: boolean;
  raidedOvernightLow: boolean;
  bearishDisplacementBeforeProof: boolean;
}): AuditRow['playStory'] {
  if (row.raidedOvernightHigh && row.raidedOvernightLow && row.bearishDisplacementBeforeProof) return 'two_sided_raid_bearish_resolution_short';
  if (row.raidedOvernightHigh && row.bearishDisplacementBeforeProof) return 'buy_side_raid_bearish_displacement_short';
  if (row.raidedOvernightLow && row.bearishDisplacementBeforeProof) return 'sell_side_raid_bearish_continuation_short';
  if (row.bearishDisplacementBeforeProof) return 'bearish_displacement_without_overnight_raid';
  if (row.raidedOvernightHigh || row.raidedOvernightLow) return 'overnight_raid_without_bearish_displacement';
  return 'no_overnight_raid_or_displacement';
}

function buildAuditRow(row: CloseoutRow, bars5m: Bar[]): AuditRow {
  const overnightBars = barsBetween(bars5m, `${addDays(row.tradeDate, -1)}T18:00:00`, `${row.tradeDate}T09:30:00`);
  const preProofBars = barsBetween(bars5m, `${row.tradeDate}T09:30:00`, `${row.proofTime.slice(0, 16)}:01`);
  const overnightHigh = overnightBars.length ? Math.max(...overnightBars.map((bar) => bar.high)) : null;
  const overnightLow = overnightBars.length ? Math.min(...overnightBars.map((bar) => bar.low)) : null;
  const highRaid = overnightHigh === null ? null : preProofBars.find((bar) => bar.high > overnightHigh);
  const lowRaid = overnightLow === null ? null : preProofBars.find((bar) => bar.low < overnightLow);
  const bearish = strongestDisplacement(preProofBars, 'SHORT');
  const bullish = strongestDisplacement(preProofBars, 'LONG');
  const raidedOvernightHigh = Boolean(highRaid);
  const raidedOvernightLow = Boolean(lowRaid);
  const bearishDisplacementBeforeProof = (bearish.score || 0) > 0;
  return {
    ...row,
    overnightHigh,
    overnightLow,
    overnightBars: overnightBars.length,
    preProofBars: preProofBars.length,
    raidedOvernightHigh,
    raidedOvernightLow,
    firstOvernightHighRaidTime: highRaid ? normalizeTime(highRaid.time) : null,
    firstOvernightLowRaidTime: lowRaid ? normalizeTime(lowRaid.time) : null,
    bearishDisplacementBeforeProof,
    bullishDisplacementBeforeProof: (bullish.score || 0) > 0,
    strongestBearishDisplacementTime: bearish.time,
    strongestBearishDisplacementScore: bearish.score,
    strongestBullishDisplacementTime: bullish.time,
    strongestBullishDisplacementScore: bullish.score,
    playStory: classifyPlay({ raidedOvernightHigh, raidedOvernightLow, bearishDisplacementBeforeProof }),
  };
}

function summarizeGroup(key: string, rows: AuditRow[]): GroupSummary {
  const resolved = rows.filter((row) => row.oneMesPl !== null);
  return {
    key,
    rows: rows.length,
    winners: rows.filter((row) => row.bucket === 'winner').length,
    losses: rows.filter((row) => row.bucket === 'loss').length,
    unresolved: rows.filter((row) => row.bucket === 'unresolved').length,
    noFills: rows.filter((row) => row.label === 'no_fill').length,
    oneMesPl: sum(rows.map((row) => row.oneMesPl)),
    winRateResolved: resolved.length ? round(rows.filter((row) => row.bucket === 'winner').length / resolved.length) : null,
    averageRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function groupBy(rows: AuditRow[], keyFor: (row: AuditRow) => string): GroupSummary[] {
  const groups = new Map<string, AuditRow[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()].map(([key, group]) => summarizeGroup(key, group));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<OpeningDriveOvernightRaidDisplacementAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep Overnight Raid + Displacement Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over corrected OpeningDrive/Sweep outcomes and saved completed 5M OHLC. Overnight/HTF context is map/support/caution only; this does not approve execution or change scanner behavior.',
    '',
    '## Summary',
    `- Audit rows: ${report.summary.auditRows}.`,
    `- Rows with overnight context: ${report.summary.rowsWithOvernightContext}.`,
    `- Buy-side raid + bearish displacement rows: ${report.summary.buySideRaidBearishDisplacementRows}.`,
    `- Sell-side raid + bearish continuation rows: ${report.summary.sellSideRaidBearishContinuationRows}.`,
    `- Two-sided raid + bearish resolution rows: ${report.summary.twoSidedRaidBearishResolutionRows}.`,
    `- Bearish displacement without raid rows: ${report.summary.bearishDisplacementWithoutRaidRows}.`,
    `- Corrected one-MES P/L: ${report.summary.correctedOneMesPl ?? '-'}.`,
    `- Best group: ${report.summary.bestGroupKey ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Groups',
    '| Group | Rows | W/L/U | No-Fill | P/L | Win Rate | Avg Risk |',
    '|---|---:|---|---:|---:|---:|---:|',
    ...report.groups.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.noFills} | ${row.oneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} |`),
    '',
    '## Rows',
    '| Date | Proof | Story | ONH | ONL | Raid H | Raid L | Bear Disp | Outcome | P/L | Entry/Stop/T1/T2 |',
    '|---|---:|---|---:|---:|---|---|---|---|---:|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.proofTime.slice(11, 16)} | ${row.playStory} | ${row.overnightHigh ?? '-'} | ${row.overnightLow ?? '-'} | ${row.firstOvernightHighRaidTime ?? '-'} | ${row.firstOvernightLowRaidTime ?? '-'} | ${row.strongestBearishDisplacementTime ?? '-'} (${row.strongestBearishDisplacementScore ?? '-'}) | ${row.label} | ${row.oneMesPl ?? '-'} | ${row.entry}/${row.stop}/${row.t1}/${row.t2} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveOvernightRaidDisplacementAuditReport(args: {
  correctedCloseoutReportPath: string | null;
  correctedCloseoutReport: CloseoutReport | null;
  htfSourcePath: string | null;
  htfSource: HtfSourceReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveOvernightRaidDisplacementAuditReport {
  const sourceRows = Array.isArray(args.correctedCloseoutReport?.rows) ? args.correctedCloseoutReport.rows : [];
  const bars5m = Array.isArray(args.htfSource?.bars?.['5m']) ? args.htfSource.bars['5m'] : [];
  const blockers = [
    !args.correctedCloseoutReportPath ? 'missing corrected closeout report path' : null,
    !args.correctedCloseoutReport ? 'missing corrected closeout report' : null,
    sourceRows.length === 0 ? 'corrected closeout report has no rows' : null,
    !args.htfSourcePath ? 'missing HTF source path' : null,
    !args.htfSource ? 'missing HTF source report' : null,
    bars5m.length === 0 ? 'HTF source has no 5M bars' : null,
  ].filter((item): item is string => Boolean(item));
  const rows = blockers.length ? [] : sourceRows.map((row) => buildAuditRow(row, bars5m));
  const groups = [
    summarizeGroup('all_corrected_openingdrive_sweep_short', rows),
    ...groupBy(rows, (row) => `play_${row.playStory}`),
    ...groupBy(rows, (row) => `story_${row.storyVerdict}`),
  ];
  const bestGroup = groups
    .filter((row) => row.key.startsWith('play_') && row.rows >= 2)
    .sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999))[0] || null;
  const base: Omit<OpeningDriveOvernightRaidDisplacementAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_overnight_raid_displacement_audit',
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
    source: {
      correctedCloseoutReportPath: args.correctedCloseoutReportPath,
      htfSourcePath: args.htfSourcePath,
    },
    assumptions: {
      overnightWindowEt: 'prior_18_00_to_trade_date_09_30',
      preProofWindowEt: 'trade_date_09_30_to_proof_inclusive',
      usesCompletedFiveMinuteBarsOnly: true,
      displacementUsesBodyRangeQuality: true,
      htfContextIsContextOnly: true,
      outputIsResearchOnly: true,
    },
    summary: {
      sourceRows: sourceRows.length,
      auditRows: rows.length,
      rowsWithOvernightContext: rows.filter((row) => row.overnightBars > 0).length,
      buySideRaidBearishDisplacementRows: rows.filter((row) => row.playStory === 'buy_side_raid_bearish_displacement_short').length,
      sellSideRaidBearishContinuationRows: rows.filter((row) => row.playStory === 'sell_side_raid_bearish_continuation_short').length,
      twoSidedRaidBearishResolutionRows: rows.filter((row) => row.playStory === 'two_sided_raid_bearish_resolution_short').length,
      bearishDisplacementWithoutRaidRows: rows.filter((row) => row.playStory === 'bearish_displacement_without_overnight_raid').length,
      correctedOneMesPl: sum(rows.map((row) => row.oneMesPl)),
      bestGroupKey: bestGroup?.key || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_missing_inputs' : 'review_best_overnight_story_with_user_before_implementation',
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Provide corrected OpeningDrive closeout and completed 5M OHLC source before overnight raid analysis.']
      : [
        'Review the best overnight raid/displacement story with the user before any implementation decision.',
        'Do not promote overnight raid or displacement as execution authority; it can only become context/ranking support after user approval.',
        'Any later implementation must still require completed 5M trigger, protected stop, risk, target room, and canExecute gates.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveOvernightRaidDisplacementAuditReport(
  report: OpeningDriveOvernightRaidDisplacementAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-overnight-raid-displacement-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveOvernightRaidDisplacementAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const correctedCloseoutReportPath = readFlag(args, '--corrected-closeout-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-corrected-outcome-closeout-\d+\.json$/);
  const correctedCloseoutReport = readJson<CloseoutReport>(correctedCloseoutReportPath);
  const htfSourcePath = readFlag(args, '--htf-source') ||
    correctedCloseoutReport?.source?.htfSourcePath ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildOpeningDriveOvernightRaidDisplacementAuditReport({
    correctedCloseoutReportPath,
    correctedCloseoutReport,
    htfSourcePath,
    htfSource: readJson<HtfSourceReport>(htfSourcePath),
  });
  const paths = writeOpeningDriveOvernightRaidDisplacementAuditReport(report, outDir);
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
    runOpeningDriveOvernightRaidDisplacementAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
