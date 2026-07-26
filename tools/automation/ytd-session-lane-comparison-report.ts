import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';
type HtfTrend = 'bullish' | 'bearish' | 'flat' | 'data_limited';

interface CandidateOutcome {
  status: string;
  pnl: number;
  r: number;
  filled: boolean;
}

interface SelectedCandidate {
  setupType: string;
  direction: Direction;
  eventTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  rankScore: number;
  modelConfidenceScore: number | null;
  outcome: CandidateOutcome;
}

interface HtfStats {
  trend: HtfTrend;
  net: number | null;
  range: number | null;
  bars: number;
}

interface DayByDayRow {
  date: string;
  session: SessionName;
  movement: string;
  htf: Record<'15m' | '60m' | '120m' | '240m', HtfStats>;
  completeCandidateCount: number;
  selected: SelectedCandidate | null;
}

interface DayByDayReport {
  reportType: string;
  generatedAt: string;
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

interface LaneSummary extends Bucket {
  session: SessionName;
  setupType: string;
  resolvedRows: number;
  winRateResolved: number | null;
  noFillRate: number;
  unresolvedRate: number;
  storyMatchRows: number;
  storyMatchRate: number;
  avgProofMinute: number | null;
  avgProofTime: string | null;
  avgRiskPoints: number | null;
  avgRankScore: number | null;
  htfAlignment: Record<string, Bucket>;
  movement: Record<string, Bucket>;
}

interface SessionRecommendation {
  session: SessionName;
  primaryLane: string | null;
  contextLanes: string[];
  reason: string;
}

interface LaneComparisonReport {
  reportType: 'ytd_session_lane_comparison_report';
  generatedAt: string;
  authority: {
    researchOnly: true;
    changesTradingRules: false;
    changesCanExecute: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    scannerAdapterInstalled: false;
  };
  source: {
    dayByDayReportPath: string;
    sourceReportType: string;
    sourceGeneratedAt: string;
    sourceRows: number;
  };
  lanesBySession: Record<SessionName, string[]>;
  laneSummaries: LaneSummary[];
  sessionRecommendations: SessionRecommendation[];
  adapterReadiness: {
    status: 'proposal_ready_not_installed';
    morningTicketCap: 1;
    lunchTicketCap: 1;
    contextLabelsOnly: true;
    canExecuteUntouched: true;
    discordSupabaseBridgeUntouched: true;
  };
  reportMarkdown: string;
}

interface CliOptions {
  dayByDayReport: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

const LANES_BY_SESSION: Record<SessionName, string[]> = {
  morning: ['NoInstalledSetup', 'NoInstalledSetup', 'NoInstalledSetup'],
  lunch: ['NoInstalledSetup', 'NoInstalledSetup'],
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    dayByDayReport: readFlag(args, '--day-by-day-report'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestReportPath(dir: string): string {
  const matches = fs.readdirSync(dir)
    .filter((name) => /^ytd-full-scanner-day-by-day-market-move-best-model-map-\d+\.json$/.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!matches[0]) throw new Error(`No YTD day-by-day mapper reports found in ${dir}`);
  return matches[0];
}

function emptyBucket(): Bucket {
  return { count: 0, pnl: 0, wins: 0, losses: 0, noFill: 0, unresolved: 0 };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function statusBucket(status: string | undefined): keyof Pick<Bucket, 'wins' | 'losses' | 'noFill' | 'unresolved'> {
  if (status === 't2_hit' || status === 't1_then_stop') return 'wins';
  if (status === 'stopped_before_t1') return 'losses';
  if (status === 'no_fill') return 'noFill';
  return 'unresolved';
}

function movementDirection(movement: string): Direction | null {
  if (movement === 'bearish_drive' || movement === 'high_raid_reversal_down') return 'SHORT';
  if (movement === 'bullish_drive' || movement === 'low_raid_reversal_up') return 'LONG';
  return null;
}

function minuteOfDay(time: string): number | null {
  const match = time.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinute(minute: number | null): string | null {
  if (minute === null) return null;
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function htfAlignment(row: DayByDayRow): string {
  if (!row.selected) return 'none';
  const wanted: HtfTrend = row.selected.direction === 'LONG' ? 'bullish' : 'bearish';
  const trends = (['15m', '60m', '120m', '240m'] as const).map((timeframe) => row.htf[timeframe]?.trend || 'data_limited');
  if (trends.includes('data_limited')) return 'data_limited';
  const aligned = trends.filter((trend) => trend === wanted).length;
  const counter = trends.filter((trend) => trend !== wanted && trend !== 'flat').length;
  if (aligned >= 3) return 'aligned';
  if (counter >= 3) return 'counter';
  return 'mixed';
}

function addBucket(bucket: Bucket, outcome: CandidateOutcome | undefined): void {
  bucket.count += 1;
  bucket.pnl = round(bucket.pnl + (outcome?.pnl || 0));
  bucket[statusBucket(outcome?.status)] += 1;
}

function addNestedBucket(target: Record<string, Bucket>, key: string, outcome: CandidateOutcome | undefined): void {
  const bucket = target[key] || (target[key] = emptyBucket());
  addBucket(bucket, outcome);
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? round(numerator / denominator) : 0;
}

function buildLaneSummary(session: SessionName, setupType: string, rows: DayByDayRow[]): LaneSummary {
  const summary: LaneSummary = {
    ...emptyBucket(),
    session,
    setupType,
    resolvedRows: 0,
    winRateResolved: null,
    noFillRate: 0,
    unresolvedRate: 0,
    storyMatchRows: 0,
    storyMatchRate: 0,
    avgProofMinute: null,
    avgProofTime: null,
    avgRiskPoints: null,
    avgRankScore: null,
    htfAlignment: {},
    movement: {},
  };
  const proofMinutes: number[] = [];
  const riskPoints: number[] = [];
  const rankScores: number[] = [];

  for (const row of rows) {
    const selected = row.selected;
    const outcome = selected?.outcome;
    addBucket(summary, outcome);
    addNestedBucket(summary.htfAlignment, htfAlignment(row), outcome);
    addNestedBucket(summary.movement, row.movement, outcome);
    const desiredDirection = movementDirection(row.movement);
    if (desiredDirection && selected?.direction === desiredDirection) summary.storyMatchRows += 1;
    const proofMinute = selected ? minuteOfDay(selected.eventTime) : null;
    if (proofMinute !== null) proofMinutes.push(proofMinute);
    if (typeof selected?.riskPoints === 'number') riskPoints.push(selected.riskPoints);
    if (typeof selected?.rankScore === 'number') rankScores.push(selected.rankScore);
  }

  summary.resolvedRows = summary.wins + summary.losses;
  summary.winRateResolved = summary.resolvedRows > 0 ? rate(summary.wins, summary.resolvedRows) : null;
  summary.noFillRate = rate(summary.noFill, summary.count);
  summary.unresolvedRate = rate(summary.unresolved, summary.count);
  summary.storyMatchRate = rate(summary.storyMatchRows, summary.count);
  summary.avgProofMinute = proofMinutes.length ? Math.round(proofMinutes.reduce((sum, item) => sum + item, 0) / proofMinutes.length) : null;
  summary.avgProofTime = formatMinute(summary.avgProofMinute);
  summary.avgRiskPoints = riskPoints.length ? round(riskPoints.reduce((sum, item) => sum + item, 0) / riskPoints.length) : null;
  summary.avgRankScore = rankScores.length ? round(rankScores.reduce((sum, item) => sum + item, 0) / rankScores.length) : null;
  return summary;
}

function laneScore(summary: LaneSummary): number {
  const winRate = summary.winRateResolved ?? 0;
  return summary.pnl + (winRate * 500) + (summary.storyMatchRate * 250) - (summary.unresolvedRate * 350) - (summary.noFillRate * 150);
}

function buildRecommendation(session: SessionName, summaries: LaneSummary[]): SessionRecommendation {
  const sorted = [...summaries]
    .filter((summary) => summary.session === session && summary.count > 0)
    .sort((a, b) => laneScore(b) - laneScore(a));
  const primary = sorted[0] || null;
  const context = sorted.slice(1).map((summary) => summary.setupType);
  const reason = primary
    ? `${primary.setupType} leads ${session} by combined realized P/L, resolved win quality, story match, and unresolved/no-fill drag. Context lanes should be context notes until a separate adapter gate approves them.`
    : `No ${session} lane had selected rows in the source report.`;
  return {
    session,
    primaryLane: primary?.setupType || null,
    contextLanes: context,
    reason,
  };
}

function buildMarkdown(report: Omit<LaneComparisonReport, 'reportMarkdown'>): string {
  const rows = report.laneSummaries.map((summary) => (
    `| ${summary.session} | ${summary.setupType} | ${summary.count} | $${summary.pnl} | ${summary.wins}/${summary.losses}/${summary.noFill}/${summary.unresolved} | ${summary.winRateResolved ?? '-'} | ${summary.storyMatchRows}/${summary.count} | ${summary.avgProofTime || '-'} | ${summary.avgRiskPoints ?? '-'} |`
  )).join('\n');
  const recommendations = report.sessionRecommendations.map((item) => (
    `- ${item.session}: primary=${item.primaryLane || 'none'}; context=${item.contextLanes.join(', ') || 'none'}. ${item.reason}`
  )).join('\n');
  return [
    '# YTD Session Lane Comparison Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only. No scanner adapter installed, no Discord posts, no Supabase writes, no bridge reads, no trading-rule changes, and no canExecute changes.',
    '',
    `Source: ${report.source.dayByDayReportPath}`,
    `Source rows: ${report.source.sourceRows}`,
    '',
    '## Lane Scoreboard',
    '',
    '| Session | Lane | Rows | One-MES P/L | W/L/NoFill/Unresolved | Resolved Win Rate | Story Match | Avg Proof | Avg Risk Points |',
    '|---|---|---:|---:|---|---:|---|---:|---:|',
    rows,
    '',
    '## Adapter Readiness',
    '',
    '- Status: proposal_ready_not_installed',
    '- Morning cap: one scanner-owned human-review ticket.',
    '- Lunch cap: one scanner-owned human-review ticket.',
    '- Context labels: notes/context only.',
    '- canExecute: untouched.',
    '- Discord/Supabase/bridge: untouched.',
    '',
    '## Recommendation',
    '',
    recommendations,
  ].join('\n');
}

export function buildYtdSessionLaneComparisonReport(args: {
  dayByDayReport: DayByDayReport;
  dayByDayReportPath: string;
}, generatedAt = new Date().toISOString()): LaneComparisonReport {
  const laneSummaries = (Object.entries(LANES_BY_SESSION) as Array<[SessionName, string[]]>).flatMap(([session, lanes]) => (
    lanes.map((setupType) => buildLaneSummary(
      session,
      setupType,
      args.dayByDayReport.rows.filter((row) => row.session === session && row.selected?.setupType === setupType),
    ))
  ));
  const report: Omit<LaneComparisonReport, 'reportMarkdown'> = {
    reportType: 'ytd_session_lane_comparison_report',
    generatedAt,
    authority: {
      researchOnly: true,
      changesTradingRules: false,
      changesCanExecute: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      scannerAdapterInstalled: false,
    },
    source: {
      dayByDayReportPath: args.dayByDayReportPath,
      sourceReportType: args.dayByDayReport.reportType,
      sourceGeneratedAt: args.dayByDayReport.generatedAt,
      sourceRows: args.dayByDayReport.rows.length,
    },
    lanesBySession: LANES_BY_SESSION,
    laneSummaries,
    sessionRecommendations: [
      buildRecommendation('morning', laneSummaries),
      buildRecommendation('lunch', laneSummaries),
    ],
    adapterReadiness: {
      status: 'proposal_ready_not_installed',
      morningTicketCap: 1,
      lunchTicketCap: 1,
      contextLabelsOnly: true,
      canExecuteUntouched: true,
      discordSupabaseBridgeUntouched: true,
    },
  };
  return { ...report, reportMarkdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const inputPath = path.resolve(options.dayByDayReport || latestReportPath(DEFAULT_REPORT_DIR));
  const outDir = path.resolve(options.outDir);
  const dayByDayReport = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as DayByDayReport;
  const report = buildYtdSessionLaneComparisonReport({ dayByDayReport, dayByDayReportPath: inputPath });
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `ytd-session-lane-comparison-report-${stamp}.json`);
  const mdPath = path.join(outDir, `ytd-session-lane-comparison-report-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.reportMarkdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    sourceRows: report.source.sourceRows,
    laneSummaries: report.laneSummaries.map((summary) => ({
      session: summary.session,
      setupType: summary.setupType,
      count: summary.count,
      pnl: summary.pnl,
      wins: summary.wins,
      losses: summary.losses,
      noFill: summary.noFill,
      unresolved: summary.unresolved,
      winRateResolved: summary.winRateResolved,
      storyMatchRate: summary.storyMatchRate,
    })),
    sessionRecommendations: report.sessionRecommendations,
    adapterReadiness: report.adapterReadiness,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
