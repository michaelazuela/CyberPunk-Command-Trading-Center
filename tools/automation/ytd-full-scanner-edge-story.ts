import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';

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
  authority?: Record<string, unknown>;
  provenanceSummary?: {
    artifactDates: number;
    currentRunCount: number;
    staleCount: number;
  };
  aggregate?: Record<string, unknown>;
  rows: DayByDayRow[];
}

interface EdgeStoryRow {
  rank: number;
  date: string;
  session: SessionName;
  movement: string;
  model: string;
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
  htfAlignment: 'aligned' | 'mixed' | 'counter' | 'data_limited';
  htfStory: string;
  raidStory: string;
  reason: string;
}

interface EdgeStoryReport {
  reportType: 'ytd_full_scanner_edge_story';
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
  };
  summary: {
    sourceRows: number;
    winningRows: number;
    topRows: number;
    totalTopOneMesPl: number;
    strongestModel: string | null;
    strongestMovement: string | null;
  };
  topStories: EdgeStoryRow[];
  modelRollup: Record<string, { rows: number; oneMesPl: number }>;
  movementRollup: Record<string, { rows: number; oneMesPl: number }>;
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

function timeOnly(value: string): string {
  return value.slice(11, 16);
}

function directionWord(direction: Direction): 'bullish' | 'bearish' {
  return direction === 'LONG' ? 'bullish' : 'bearish';
}

function htfAlignment(row: DayByDayRow, direction: Direction): EdgeStoryRow['htfAlignment'] {
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
  return raids.length ? raids.join(', ') : 'no major overnight/prior-day raid flagged';
}

function rowReason(row: DayByDayRow, selected: SelectedCandidate, alignment: EdgeStoryRow['htfAlignment']): string {
  const parts = [
    `${row.movement} session selected ${selected.setupType} ${selected.direction}`,
    `HTF ${alignment}`,
    raidStory(row),
  ];
  if (selected.levelContextSummary) parts.push(selected.levelContextSummary);
  return parts.join(' | ');
}

function addRollup(target: Record<string, { rows: number; oneMesPl: number }>, key: string, pnl: number): void {
  target[key] ||= { rows: 0, oneMesPl: 0 };
  target[key].rows += 1;
  target[key].oneMesPl = round(target[key].oneMesPl + pnl);
}

function bestRollupKey(rollup: Record<string, { rows: number; oneMesPl: number }>): string | null {
  return Object.entries(rollup).sort((a, b) => b[1].oneMesPl - a[1].oneMesPl)[0]?.[0] || null;
}

function buildMarkdown(report: Omit<EdgeStoryReport, 'markdown'>): string {
  const table = report.topStories.map((row) => (
    `| ${row.rank} | ${row.date} | ${row.session} | ${row.movement} | ${row.model} | ${row.direction} | ${row.proofTime} | ${row.entry}/${row.stop}/${row.target1}/${row.target2} | ${row.outcome} | ${row.oneMesPl} | ${row.htfAlignment} | ${row.htfStory} | ${row.raidStory} |`
  )).join('\n');
  return [
    '# YTD Full Scanner Edge Story',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only saved-report extraction. It does not run setupScanner, post Discord, write Supabase, change canExecute, or change trading rules.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Winning rows: ${report.summary.winningRows}.`,
    `- Top stories: ${report.summary.topRows}.`,
    `- Top-story one-MES P/L: $${report.summary.totalTopOneMesPl}.`,
    `- Strongest model in top stories: ${report.summary.strongestModel || 'none'}.`,
    `- Strongest movement in top stories: ${report.summary.strongestMovement || 'none'}.`,
    '',
    '## Top Edge Stories',
    '',
    '| Rank | Date | Session | Market Move | Model | Dir | Proof | Entry/Stop/T1/T2 | Outcome | One-MES P/L | HTF | HTF Story | Raid Story |',
    '|---:|---|---|---|---|---|---|---|---|---:|---|---|---|',
    table,
  ].join('\n');
}

export function buildYtdFullScannerEdgeStoryReport(args: {
  dayByDayReportPath: string;
  report?: DayByDayReport;
  top?: number;
}, generatedAt = new Date().toISOString()): EdgeStoryReport {
  const sourceReport = args.report ?? JSON.parse(fs.readFileSync(args.dayByDayReportPath, 'utf8')) as DayByDayReport;
  const top = args.top ?? 20;
  const winners = sourceReport.rows
    .filter((row) => row.selected && row.selected.outcome.pnl > 0)
    .map((row) => {
      const selected = row.selected as SelectedCandidate;
      const alignment = htfAlignment(row, selected.direction);
      return {
        date: row.date,
        session: row.session,
        movement: row.movement,
        model: selected.setupType,
        direction: selected.direction,
        proofTime: timeOnly(selected.eventTime),
        entry: selected.entry,
        stop: selected.stop,
        target1: selected.target1,
        target2: selected.target2,
        riskPoints: selected.riskPoints,
        outcome: selected.outcome.status,
        oneMesPl: round(selected.outcome.pnl),
        r: selected.outcome.r ?? null,
        htfAlignment: alignment,
        htfStory: htfStory(row),
        raidStory: raidStory(row),
        reason: rowReason(row, selected, alignment),
      };
    })
    .sort((a, b) => b.oneMesPl - a.oneMesPl);
  const topStories = winners.slice(0, top).map((row, index) => ({ ...row, rank: index + 1 }));
  const modelRollup: EdgeStoryReport['modelRollup'] = {};
  const movementRollup: EdgeStoryReport['movementRollup'] = {};
  for (const story of topStories) {
    addRollup(modelRollup, story.model, story.oneMesPl);
    addRollup(movementRollup, story.movement, story.oneMesPl);
  }
  const report: Omit<EdgeStoryReport, 'markdown'> = {
    reportType: 'ytd_full_scanner_edge_story',
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
    },
    summary: {
      sourceRows: sourceReport.rows.length,
      winningRows: winners.length,
      topRows: topStories.length,
      totalTopOneMesPl: round(topStories.reduce((sum, row) => sum + row.oneMesPl, 0)),
      strongestModel: bestRollupKey(modelRollup),
      strongestMovement: bestRollupKey(movementRollup),
    },
    topStories,
    modelRollup,
    movementRollup,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const dayByDayReportPath = path.resolve(readFlag(process.argv, '--day-by-day-report') || latestDayByDayReport(reportDir) || '');
  const top = Number(readFlag(process.argv, '--top') || 20);
  if (!dayByDayReportPath || !fs.existsSync(dayByDayReportPath)) {
    throw new Error(`Missing day-by-day report. Pass --day-by-day-report or place one in ${reportDir}.`);
  }
  const report = buildYtdFullScannerEdgeStoryReport({ dayByDayReportPath, top });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `ytd-full-scanner-edge-story-${stamp}.json`);
  const mdPath = path.join(reportDir, `ytd-full-scanner-edge-story-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.markdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    summary: report.summary,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
