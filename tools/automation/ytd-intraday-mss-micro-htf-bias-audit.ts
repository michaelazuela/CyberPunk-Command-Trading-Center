import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';
type HtfAlignment = 'aligned' | 'mixed' | 'counter' | 'data_limited';

interface SelectedCandidate {
  setupType: string;
  direction: Direction;
  eventTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  outcome: {
    status: string;
    pnl: number;
    r?: number;
    exitTime?: string;
  };
  levelContextSummary?: string | null;
}

interface DayByDayRow {
  date: string;
  session: SessionName;
  movement: string;
  htf: Record<string, { trend: string; bars?: number }>;
  raids: Record<string, boolean>;
  completeCandidateCount: number;
  selected: SelectedCandidate | null;
}

interface DayByDayReport {
  reportType: string;
  generatedAt: string;
  source?: { canonicalOhlc?: string };
  provenanceSummary?: {
    artifactDates: number;
    currentRunCount: number;
    staleCount: number;
  };
  rows: DayByDayRow[];
}

interface Bucket {
  count: number;
  pnl: number;
  wins: number;
  losses: number;
  noFill: number;
  unresolved: number;
}

interface StoryRow {
  date: string;
  session: SessionName;
  movement: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  outcome: string;
  oneMesPl: number;
  r: number | null;
  htfAlignment: HtfAlignment;
  htfStory: string;
  raidStory: string;
}

export interface YtdIntradayMssMicroHtfBiasAuditReport {
  reportType: 'ytd_intraday_mss_micro_htf_bias_audit';
  generatedAt: string;
  authority: {
    researchOnly: true;
    readsSavedDiagnosticReportOnly: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
  };
  source: {
    dayByDayReportPath: string;
    canonicalOhlc: string | null;
    sourceRows: number;
    sourceDateStart: string | null;
    sourceDateEnd: string | null;
    sourceDates: number;
    provenanceSummary: DayByDayReport['provenanceSummary'] | null;
  };
  summary: {
    selectedRows: number;
    pnl: number;
    wins: number;
    losses: number;
    noFill: number;
    unresolved: number;
    bestHtfAlignment: string | null;
    bestMovement: string | null;
    bestSession: string | null;
  };
  bySession: Record<string, Bucket>;
  byDirection: Record<string, Bucket>;
  byMovement: Record<string, Bucket>;
  byHtfAlignment: Record<string, Bucket>;
  rows: StoryRow[];
  topRows: StoryRow[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MODEL = 'IntradayMssMicroContinuation';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestDayByDayReport(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith('ytd-full-scanner-day-by-day-market-move-best-model-map-') && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function dateRange(rows: DayByDayRow[]): { start: string | null; end: string | null; dates: number } {
  const dates = [...new Set(rows.map((row) => row.date))].sort();
  return { start: dates[0] || null, end: dates[dates.length - 1] || null, dates: dates.length };
}

function directionWord(direction: Direction): 'bullish' | 'bearish' {
  return direction === 'LONG' ? 'bullish' : 'bearish';
}

function htfAlignment(row: DayByDayRow, direction: Direction): HtfAlignment {
  const trends = ['15m', '60m', '120m', '240m'].map((tf) => row.htf?.[tf]?.trend || 'data_limited');
  if (trends.some((trend) => trend === 'data_limited')) return 'data_limited';
  const wanted = directionWord(direction);
  const aligned = trends.filter((trend) => trend === wanted).length;
  const counter = trends.filter((trend) => trend !== wanted && trend !== 'flat').length;
  if (aligned >= 3) return 'aligned';
  if (counter >= 3) return 'counter';
  return 'mixed';
}

function htfStory(row: DayByDayRow): string {
  return ['15m', '60m', '120m', '240m']
    .map((tf) => `${tf}:${row.htf?.[tf]?.trend || 'data_limited'}`)
    .join(', ');
}

function raidStory(row: DayByDayRow): string {
  const raids = Object.entries(row.raids || {})
    .filter(([, active]) => active)
    .map(([key]) => key);
  return raids.length ? raids.join(', ') : 'none';
}

function emptyBucket(): Bucket {
  return { count: 0, pnl: 0, wins: 0, losses: 0, noFill: 0, unresolved: 0 };
}

function addBucket(target: Record<string, Bucket>, key: string, selected: SelectedCandidate): void {
  const bucket = target[key] || (target[key] = emptyBucket());
  bucket.count += 1;
  bucket.pnl = round(bucket.pnl + (selected.outcome.pnl || 0));
  if (selected.outcome.status === 't2_hit' || selected.outcome.status === 't1_then_stop') bucket.wins += 1;
  else if (selected.outcome.status === 'stopped_before_t1') bucket.losses += 1;
  else if (selected.outcome.status === 'no_fill') bucket.noFill += 1;
  else bucket.unresolved += 1;
}

function bestKey(rollup: Record<string, Bucket>): string | null {
  return Object.entries(rollup).sort((a, b) => b[1].pnl - a[1].pnl)[0]?.[0] || null;
}

function buildMarkdown(report: Omit<YtdIntradayMssMicroHtfBiasAuditReport, 'markdown'>): string {
  const table = report.topRows.map((row, index) => (
    `| ${index + 1} | ${row.date} | ${row.session} | ${row.movement} | ${row.direction} | ${row.proofTime.slice(11, 16)} | ${row.entry}/${row.stop}/${row.target1}/${row.target2} | ${row.outcome} | ${row.oneMesPl} | ${row.htfAlignment} | ${row.htfStory} | ${row.raidStory} |`
  )).join('\n');
  return [
    '# YTD Intraday MSS Micro HTF Bias Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only saved-report extraction. It does not run setupScanner, post Discord, write Supabase, change canExecute, or change trading rules.',
    '',
    '## Coverage',
    `- Source report: ${report.source.dayByDayReportPath}`,
    `- Canonical OHLC: ${report.source.canonicalOhlc || 'unknown'}`,
    `- Dates: ${report.source.sourceDateStart || 'unknown'} through ${report.source.sourceDateEnd || 'unknown'} (${report.source.sourceDates} dates, ${report.source.sourceRows} morning/lunch windows).`,
    '',
    '## Summary',
    `- Selected Intraday MSS Micro windows: ${report.summary.selectedRows}.`,
    `- One-MES P/L: $${report.summary.pnl}.`,
    `- Wins/losses/no-fill/unresolved: ${report.summary.wins}/${report.summary.losses}/${report.summary.noFill}/${report.summary.unresolved}.`,
    `- Best HTF alignment bucket: ${report.summary.bestHtfAlignment || 'none'}.`,
    `- Best movement bucket: ${report.summary.bestMovement || 'none'}.`,
    `- Best session bucket: ${report.summary.bestSession || 'none'}.`,
    '',
    '## Top Rows',
    '',
    '| # | Date | Session | Market Move | Dir | Proof | Entry/Stop/T1/T2 | Outcome | One-MES P/L | HTF | HTF Story | Raid Story |',
    '|---:|---|---|---|---|---|---|---|---:|---|---|---|',
    table,
  ].join('\n');
}

export function buildYtdIntradayMssMicroHtfBiasAuditReport(args: {
  dayByDayReportPath: string;
  report?: DayByDayReport;
  top?: number;
}, generatedAt = new Date().toISOString()): YtdIntradayMssMicroHtfBiasAuditReport {
  const sourceReport = args.report ?? JSON.parse(fs.readFileSync(args.dayByDayReportPath, 'utf8')) as DayByDayReport;
  const selectedRows = sourceReport.rows.filter((row) => row.selected?.setupType === MODEL);
  const bySession: Record<string, Bucket> = {};
  const byDirection: Record<string, Bucket> = {};
  const byMovement: Record<string, Bucket> = {};
  const byHtfAlignment: Record<string, Bucket> = {};
  const rows: StoryRow[] = selectedRows.map((row) => {
    const selected = row.selected as SelectedCandidate;
    const alignment = htfAlignment(row, selected.direction);
    addBucket(bySession, row.session, selected);
    addBucket(byDirection, selected.direction, selected);
    addBucket(byMovement, row.movement, selected);
    addBucket(byHtfAlignment, alignment, selected);
    return {
      date: row.date,
      session: row.session,
      movement: row.movement,
      direction: selected.direction,
      proofTime: selected.eventTime,
      entry: selected.entry,
      stop: selected.stop,
      target1: selected.target1,
      target2: selected.target2,
      riskPoints: selected.riskPoints,
      outcome: selected.outcome.status,
      oneMesPl: round(selected.outcome.pnl || 0),
      r: selected.outcome.r ?? null,
      htfAlignment: alignment,
      htfStory: htfStory(row),
      raidStory: raidStory(row),
    };
  });
  const range = dateRange(sourceReport.rows);
  const topRows = [...rows].sort((a, b) => b.oneMesPl - a.oneMesPl).slice(0, args.top ?? 30);
  const report: Omit<YtdIntradayMssMicroHtfBiasAuditReport, 'markdown'> = {
    reportType: 'ytd_intraday_mss_micro_htf_bias_audit',
    generatedAt,
    authority: {
      researchOnly: true,
      readsSavedDiagnosticReportOnly: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
    },
    source: {
      dayByDayReportPath: args.dayByDayReportPath,
      canonicalOhlc: sourceReport.source?.canonicalOhlc || null,
      sourceRows: sourceReport.rows.length,
      sourceDateStart: range.start,
      sourceDateEnd: range.end,
      sourceDates: range.dates,
      provenanceSummary: sourceReport.provenanceSummary || null,
    },
    summary: {
      selectedRows: rows.length,
      pnl: round(rows.reduce((sum, row) => sum + row.oneMesPl, 0)),
      wins: rows.filter((row) => row.outcome === 't2_hit' || row.outcome === 't1_then_stop').length,
      losses: rows.filter((row) => row.outcome === 'stopped_before_t1').length,
      noFill: rows.filter((row) => row.outcome === 'no_fill').length,
      unresolved: rows.filter((row) => !['t2_hit', 'stopped_before_t1', 't1_then_stop', 'no_fill'].includes(row.outcome)).length,
      bestHtfAlignment: bestKey(byHtfAlignment),
      bestMovement: bestKey(byMovement),
      bestSession: bestKey(bySession),
    },
    bySession,
    byDirection,
    byMovement,
    byHtfAlignment,
    rows,
    topRows,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const dayByDayReportPath = path.resolve(readFlag(process.argv, '--day-by-day-report') || latestDayByDayReport(reportDir) || '');
  const top = Number(readFlag(process.argv, '--top') || 30);
  if (!dayByDayReportPath || !fs.existsSync(dayByDayReportPath)) {
    throw new Error(`Missing day-by-day report. Pass --day-by-day-report or place one in ${reportDir}.`);
  }
  const report = buildYtdIntradayMssMicroHtfBiasAuditReport({ dayByDayReportPath, top });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `ytd-intraday-mss-micro-htf-bias-audit-${stamp}.json`);
  const mdPath = path.join(reportDir, `ytd-intraday-mss-micro-htf-bias-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.markdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    summary: report.summary,
    source: report.source,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
