import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SetupCandidateLike {
  setupType?: string;
  direction?: string;
  eventTime?: string;
  executionStatus?: string | null;
  candidateState?: string | null;
  confidence?: string | null;
  priority?: number | null;
  rankScore?: number | null;
  modelConfidenceScore?: number | null;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  riskPoints?: number | null;
  canExecute?: boolean | null;
  discordTradePlanEligible?: boolean | null;
  blockReason?: string | null;
  levelContextSummary?: string | null;
}

interface ScannerArtifactEvent {
  eventTime: string;
  date: string;
  session: SessionName | string;
  completed5m?: OhlcBar;
  setupCandidateStatus?: {
    statuses?: SetupCandidateLike[];
  };
}

interface RawScannerArtifactPackage {
  reportType?: string;
  generatedAt?: string;
  startDate?: string;
  endDate?: string;
  instrument?: string;
  artifactPath?: string;
  events?: Record<string, ScannerArtifactEvent>;
}

interface SessionStats {
  open: number;
  high: number;
  low: number;
  close: number;
  range: number;
  net: number;
  midpoint: number;
  trend: 'bullish' | 'bearish' | 'flat';
  bars: number;
}

interface HtfStats {
  trend: 'bullish' | 'bearish' | 'flat' | 'data_limited';
  net: number | null;
  range: number | null;
  bars: number;
}

interface CandidateOutcome {
  status: 't2_hit' | 't1_then_stop' | 'stopped_before_t1' | 'no_fill' | 'filled_unresolved_by_session_end';
  exitTime?: string;
  pnl: number;
  r: number;
  filled: boolean;
}

interface SelectedCandidate {
  setupType: string;
  direction: Direction;
  eventTime: string;
  executionStatus: string | null;
  candidateState: string | null;
  confidence: string | null;
  rankScore: number;
  modelConfidenceScore: number | null;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  canExecute: boolean | null;
  discordTradePlanEligible: boolean | null;
  blockReason: string | null;
  outcome: CandidateOutcome;
  levelContextSummary: string | null;
}

interface DayByDayRow {
  date: string;
  session: SessionName;
  movement: string;
  sessionStats: SessionStats | null;
  raids: Record<string, boolean>;
  priorTradingDate: string | null;
  htf: Record<'15m' | '60m' | '120m' | '240m', HtfStats>;
  completeCandidateCount: number;
  bestOverall: SelectedCandidate | null;
  bestMovementMatch: SelectedCandidate | null;
  selected: SelectedCandidate | null;
}

interface DayByDayReport {
  reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map';
  generatedAt: string;
  authority: {
    researchOnly: true;
    exactScannerArtifacts: true;
    projectionMapperUsedForSelection: false;
    changesTradingRules: false;
    changesCanExecute: false;
    postsDiscord: false;
    writesSupabase: false;
  };
  source: {
    canonicalOhlc: string | null;
    provenance: string;
  };
  provenanceSummary: {
    artifactDates: number;
    currentRunCount: number;
    staleCount: number;
  };
  aggregate: Record<string, unknown>;
  rows: DayByDayRow[];
  reportMarkdown: string;
}

interface CliOptions {
  artifactDir: string;
  marketBarsJson: string | null;
  baseDayByDayReport: string | null;
  startDate: string | null;
  endDate: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MES_DOLLARS_PER_POINT = 5;
const HTF_TIMEFRAMES: Array<Exclude<Timeframe, '5m'>> = ['15m', '60m', '120m', '240m'];
const SESSION_WINDOWS: Record<SessionName, { start: number; end: number }> = {
  morning: { start: 9 * 60 + 15, end: 12 * 60 },
  lunch: { start: 12 * 60, end: 16 * 60 },
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    artifactDir: readFlag(args, '--artifact-dir') || DEFAULT_REPORT_DIR,
    marketBarsJson: readFlag(args, '--market-bars-json'),
    baseDayByDayReport: readFlag(args, '--base-day-by-day-report'),
    startDate: readFlag(args, '--start-date'),
    endDate: readFlag(args, '--end-date'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return { time, open, high, low, close, volume: finiteNumber(record.volume) ?? undefined };
}

function loadMarketBars(inputJson: string | null): Record<Timeframe, OhlcBar[]> {
  const output: Record<Timeframe, OhlcBar[]> = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  if (!inputJson) return output;
  const root = JSON.parse(fs.readFileSync(inputJson, 'utf8')) as Record<string, unknown>;
  const grouped = (root.bars || root.timeframes || root) as Record<string, unknown>;
  for (const timeframe of Object.keys(output) as Timeframe[]) {
    const rows = Array.isArray(grouped[timeframe]) ? grouped[timeframe] as unknown[] : [];
    output[timeframe] = rows.map(normalizeBar).filter((bar): bar is OhlcBar => Boolean(bar))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
  return output;
}

function minuteOfDay(time: string): number | null {
  const match = time.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function dateText(time: string): string {
  return time.slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function sessionBarsFromEvents(events: ScannerArtifactEvent[], session: SessionName): OhlcBar[] {
  return events
    .filter((event) => event.session === session)
    .map((event) => normalizeBar(event.completed5m))
    .filter((bar): bar is OhlcBar => Boolean(bar))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function sessionStats(bars: OhlcBar[]): SessionStats | null {
  if (!bars.length) return null;
  const open = bars[0].open;
  const close = bars[bars.length - 1].close;
  const high = Math.max(...bars.map((bar) => bar.high));
  const low = Math.min(...bars.map((bar) => bar.low));
  const net = round(close - open);
  return {
    open,
    high,
    low,
    close,
    range: round(high - low),
    net,
    midpoint: round((high + low) / 2),
    trend: net > 0 ? 'bullish' : net < 0 ? 'bearish' : 'flat',
    bars: bars.length,
  };
}

function tradingDatesWithRthBars(bars5m: OhlcBar[]): string[] {
  const dates = new Set<string>();
  for (const bar of bars5m) {
    const minute = minuteOfDay(bar.time);
    if (minute !== null && minute >= SESSION_WINDOWS.morning.start && minute <= SESSION_WINDOWS.lunch.end) {
      dates.add(dateText(bar.time));
    }
  }
  return [...dates].sort();
}

function previousTradingDate(date: string, tradingDates: string[]): string | null {
  return tradingDates.filter((item) => item < date).at(-1) || null;
}

function barsBetween(bars: OhlcBar[], from: string, to: string): OhlcBar[] {
  return bars.filter((bar) => bar.time >= from && bar.time <= to);
}

function rangeStats(bars: OhlcBar[]): { high: number; low: number } | null {
  if (!bars.length) return null;
  return {
    high: Math.max(...bars.map((bar) => bar.high)),
    low: Math.min(...bars.map((bar) => bar.low)),
  };
}

function raidsForSession(args: {
  date: string;
  sessionStats: SessionStats | null;
  priorTradingDate: string | null;
  bars5m: OhlcBar[];
}): Record<string, boolean> {
  if (!args.sessionStats) {
    return { overnightHighRaid: false, overnightLowRaid: false, priorHighRaid: false, priorLowRaid: false };
  }
  const overnight = rangeStats(barsBetween(
    args.bars5m,
    `${addDays(args.date, -1)}T18:00:00`,
    `${args.date}T09:10:00`,
  ));
  const prior = args.priorTradingDate
    ? rangeStats(args.bars5m.filter((bar) => {
      const minute = minuteOfDay(bar.time);
      return dateText(bar.time) === args.priorTradingDate
        && minute !== null
        && minute >= SESSION_WINDOWS.morning.start
        && minute <= SESSION_WINDOWS.lunch.end;
    }))
    : null;
  return {
    overnightHighRaid: Boolean(overnight && args.sessionStats.high > overnight.high),
    overnightLowRaid: Boolean(overnight && args.sessionStats.low < overnight.low),
    priorHighRaid: Boolean(prior && args.sessionStats.high > prior.high),
    priorLowRaid: Boolean(prior && args.sessionStats.low < prior.low),
  };
}

function movementDirection(movement: string): Direction | null {
  if (movement === 'high_raid_reversal_down' || movement === 'bearish_drive') return 'SHORT';
  if (movement === 'low_raid_reversal_up' || movement === 'bullish_drive') return 'LONG';
  return null;
}

function classifyMovement(stats: SessionStats | null, raids: Record<string, boolean>): string {
  if (!stats) return 'no_data';
  const highRaid = raids.overnightHighRaid || raids.priorHighRaid;
  const lowRaid = raids.overnightLowRaid || raids.priorLowRaid;
  if (highRaid && lowRaid) return 'two_sided_liquidity_range';
  if (highRaid && stats.close < stats.midpoint) return 'high_raid_reversal_down';
  if (lowRaid && stats.close > stats.midpoint) return 'low_raid_reversal_up';
  if (stats.range > 0 && stats.net >= stats.range * 0.35) return 'bullish_drive';
  if (stats.range > 0 && stats.net <= -stats.range * 0.35) return 'bearish_drive';
  return 'balanced_range';
}

function htfStatsFor(timeframeBars: OhlcBar[], throughTime: string): HtfStats {
  const bars = timeframeBars.filter((bar) => bar.time <= throughTime).slice(-30);
  if (bars.length < 30) return { trend: 'data_limited', net: null, range: null, bars: bars.length };
  const net = round(bars[bars.length - 1].close - bars[0].open);
  const high = Math.max(...bars.map((bar) => bar.high));
  const low = Math.min(...bars.map((bar) => bar.low));
  return {
    trend: net > 0 ? 'bullish' : net < 0 ? 'bearish' : 'flat',
    net,
    range: round(high - low),
    bars: bars.length,
  };
}

function htfForSession(bars: Record<Timeframe, OhlcBar[]>, sessionBars: OhlcBar[], date: string, session: SessionName): DayByDayRow['htf'] {
  const through = sessionBars.at(-1)?.time || `${date}T${session === 'morning' ? '12:00:00' : '16:00:00'}`;
  return {
    '15m': htfStatsFor(bars['15m'], through),
    '60m': htfStatsFor(bars['60m'], through),
    '120m': htfStatsFor(bars['120m'], through),
    '240m': htfStatsFor(bars['240m'], through),
  };
}

function hasCompletePlan(candidate: SetupCandidateLike): candidate is SetupCandidateLike & {
  setupType: string;
  direction: Direction;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
} {
  return typeof candidate.setupType === 'string'
    && (candidate.direction === 'LONG' || candidate.direction === 'SHORT')
    && finiteNumber(candidate.entry) !== null
    && finiteNumber(candidate.stop) !== null
    && finiteNumber(candidate.target1) !== null
    && finiteNumber(candidate.target2) !== null
    && finiteNumber(candidate.riskPoints) !== null;
}

function candidateEventTime(event: ScannerArtifactEvent, candidate: SetupCandidateLike): string {
  return normalizeTime(candidate.eventTime) || event.eventTime;
}

function candidateRank(candidate: SetupCandidateLike): number {
  const rankScore = finiteNumber(candidate.rankScore);
  if (rankScore !== null) return rankScore;
  const priority = finiteNumber(candidate.priority) ?? 0;
  const modelConfidence = finiteNumber(candidate.modelConfidenceScore) ?? 0;
  return round(priority + modelConfidence);
}

function futureBarsAfter(sessionBars: OhlcBar[], eventTime: string): OhlcBar[] {
  return sessionBars.filter((bar) => bar.time >= eventTime);
}

function outcomeForCandidate(candidate: {
  direction: Direction;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
}, futureBars: OhlcBar[]): CandidateOutcome {
  let filled = false;
  let t1Hit = false;
  for (const bar of futureBars) {
    if (!filled) {
      filled = candidate.direction === 'LONG'
        ? bar.low <= candidate.entry && bar.high >= candidate.entry
        : bar.high >= candidate.entry && bar.low <= candidate.entry;
      if (!filled) continue;
    }
    const stopHit = candidate.direction === 'LONG' ? bar.low <= candidate.stop : bar.high >= candidate.stop;
    const currentT1Hit = candidate.direction === 'LONG' ? bar.high >= candidate.target1 : bar.low <= candidate.target1;
    const t2Hit = candidate.direction === 'LONG' ? bar.high >= candidate.target2 : bar.low <= candidate.target2;
    if (t2Hit) {
      const points = (Math.abs(candidate.target1 - candidate.entry) + Math.abs(candidate.target2 - candidate.entry)) / 2;
      return { status: 't2_hit', exitTime: bar.time, pnl: round(points * MES_DOLLARS_PER_POINT), r: round(points / Math.abs(candidate.entry - candidate.stop)), filled: true };
    }
    if (currentT1Hit) t1Hit = true;
    if (stopHit && t1Hit) {
      const points = (Math.abs(candidate.target1 - candidate.entry) - Math.abs(candidate.entry - candidate.stop)) / 2;
      return { status: 't1_then_stop', exitTime: bar.time, pnl: round(points * MES_DOLLARS_PER_POINT), r: round(points / Math.abs(candidate.entry - candidate.stop)), filled: true };
    }
    if (stopHit) {
      const points = Math.abs(candidate.entry - candidate.stop);
      return { status: 'stopped_before_t1', exitTime: bar.time, pnl: round(-points * MES_DOLLARS_PER_POINT), r: -1, filled: true };
    }
  }
  return filled
    ? { status: 'filled_unresolved_by_session_end', pnl: 0, r: 0, filled: true }
    : { status: 'no_fill', pnl: 0, r: 0, filled: false };
}

function candidatesForSession(events: ScannerArtifactEvent[], sessionBars: OhlcBar[]): SelectedCandidate[] {
  const output: SelectedCandidate[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    for (const candidate of event.setupCandidateStatus?.statuses || []) {
      if (!hasCompletePlan(candidate)) continue;
      const eventTime = candidateEventTime(event, candidate);
      const key = [
        candidate.setupType,
        candidate.direction,
        eventTime,
        candidate.entry,
        candidate.stop,
        candidate.target1,
        candidate.target2,
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const outcome = outcomeForCandidate(candidate, futureBarsAfter(sessionBars, eventTime));
      output.push({
        setupType: candidate.setupType,
        direction: candidate.direction,
        eventTime,
        executionStatus: candidate.executionStatus ?? null,
        candidateState: candidate.candidateState ?? null,
        confidence: candidate.confidence ?? null,
        rankScore: candidateRank(candidate),
        modelConfidenceScore: finiteNumber(candidate.modelConfidenceScore),
        entry: candidate.entry,
        stop: candidate.stop,
        target1: candidate.target1,
        target2: candidate.target2,
        riskPoints: candidate.riskPoints,
        canExecute: typeof candidate.canExecute === 'boolean' ? candidate.canExecute : null,
        discordTradePlanEligible: typeof candidate.discordTradePlanEligible === 'boolean' ? candidate.discordTradePlanEligible : null,
        blockReason: candidate.blockReason ?? null,
        outcome,
        levelContextSummary: candidate.levelContextSummary ?? null,
      });
    }
  }
  return output.sort((a, b) => b.rankScore - a.rankScore || a.eventTime.localeCompare(b.eventTime));
}

function buildRowsForArtifact(args: {
  artifact: RawScannerArtifactPackage;
  bars: Record<Timeframe, OhlcBar[]>;
  tradingDates: string[];
}): DayByDayRow[] {
  const events = Object.values(args.artifact.events || {}).sort((a, b) => a.eventTime.localeCompare(b.eventTime));
  const date = args.artifact.startDate || events[0]?.date || 'unknown';
  return (['morning', 'lunch'] as SessionName[]).map((session) => {
    const sessionEvents = events.filter((event) => event.session === session);
    const sessionBars = sessionBarsFromEvents(events, session);
    const stats = sessionStats(sessionBars);
    const priorTradingDate = previousTradingDate(date, args.tradingDates);
    const raids = raidsForSession({ date, sessionStats: stats, priorTradingDate, bars5m: args.bars['5m'] });
    const movement = classifyMovement(stats, raids);
    const candidates = candidatesForSession(sessionEvents, sessionBars);
    const desiredDirection = movementDirection(movement);
    const bestOverall = candidates[0] || null;
    const bestMovementMatch = desiredDirection ? candidates.find((candidate) => candidate.direction === desiredDirection) || null : null;
    return {
      date,
      session,
      movement,
      sessionStats: stats,
      raids,
      priorTradingDate,
      htf: htfForSession(args.bars, sessionBars, date, session),
      completeCandidateCount: candidates.length,
      bestOverall,
      bestMovementMatch,
      selected: bestMovementMatch || bestOverall,
    };
  });
}

function latestArtifactByDate(artifactDir: string, startDate: string | null, endDate: string | null): RawScannerArtifactPackage[] {
  if (!fs.existsSync(artifactDir)) return [];
  const byDate = new Map<string, { path: string; mtime: number }>();
  for (const name of fs.readdirSync(artifactDir)) {
    const match = name.match(/^raw-ohlc-scanner-artifacts-MES-(\d{4}-\d{2}-\d{2})-to-\1-\d+\.json$/);
    if (!match) continue;
    const date = match[1];
    if (startDate && date < startDate) continue;
    if (endDate && date > endDate) continue;
    const fullPath = path.join(artifactDir, name);
    const mtime = fs.statSync(fullPath).mtimeMs;
    const existing = byDate.get(date);
    if (!existing || mtime > existing.mtime) byDate.set(date, { path: fullPath, mtime });
  }
  return [...byDate.values()]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((item) => JSON.parse(fs.readFileSync(item.path, 'utf8')) as RawScannerArtifactPackage);
}

function rollupRows(rows: DayByDayRow[]): Record<string, unknown> {
  const bucket = () => ({ count: 0, pnl: 0, wins: 0, losses: 0, noFill: 0, unresolved: 0 });
  const add = (target: Record<string, ReturnType<typeof bucket>>, key: string, row: DayByDayRow) => {
    const item = target[key] || (target[key] = bucket());
    item.count += 1;
    const outcome = row.selected?.outcome;
    item.pnl = round(item.pnl + (outcome?.pnl || 0));
    if (!outcome) item.unresolved += 1;
    else if (outcome.status === 't2_hit' || outcome.status === 't1_then_stop') item.wins += 1;
    else if (outcome.status === 'stopped_before_t1') item.losses += 1;
    else if (outcome.status === 'no_fill') item.noFill += 1;
    else item.unresolved += 1;
  };
  const byModel: Record<string, ReturnType<typeof bucket>> = {};
  const bySession: Record<string, ReturnType<typeof bucket>> = {};
  const byMovement: Record<string, ReturnType<typeof bucket>> = {};
  const statusCounts: Record<string, number> = {};
  for (const row of rows) {
    const status = row.selected?.outcome.status || 'no_complete_candidate';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    add(byModel, row.selected?.setupType || 'no_complete_candidate', row);
    add(bySession, row.session, row);
    add(byMovement, row.movement, row);
  }
  return {
    totalWindows: rows.length,
    windowsWithCompleteCandidates: rows.filter((row) => row.completeCandidateCount > 0).length,
    selectedPnl: round(rows.reduce((sum, row) => sum + (row.selected?.outcome.pnl || 0), 0)),
    byModel,
    bySession,
    byMovement,
    statusCounts,
  };
}

function buildMarkdown(report: Omit<DayByDayReport, 'reportMarkdown'>): string {
  const rows = report.rows.map((row) => {
    const selected = row.selected;
    return `| ${row.date} | ${row.session} | ${row.movement} | ${selected?.setupType || 'none'} | ${selected?.direction || '-'} | ${selected?.eventTime.slice(11, 16) || '-'} | ${selected ? `${selected.entry}/${selected.stop}/${selected.target1}/${selected.target2}` : '-'} | ${selected?.outcome.status || '-'} | ${selected?.outcome.pnl ?? '-'} | ${row.completeCandidateCount} |`;
  }).join('\n');
  const aggregate = report.aggregate as { totalWindows: number; windowsWithCompleteCandidates: number; selectedPnl: number; statusCounts: Record<string, number> };
  return [
    '# YTD Full Scanner Day-by-Day Market Move / Best Model Map',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only. Selection uses exact full scanner replay artifacts where provided, not the fast projection mapper. No Discord posts, no Supabase writes, no trading-rule changes, no canExecute changes.',
    '',
    `Provenance: ${report.provenanceSummary.artifactDates} daily scanner artifacts, ${report.provenanceSummary.currentRunCount} current-run, ${report.provenanceSummary.staleCount} stale.`,
    '',
    '## Aggregate',
    '',
    `- Windows: ${aggregate.totalWindows}`,
    `- Windows with complete deterministic candidates: ${aggregate.windowsWithCompleteCandidates}`,
    `- Selected one-MES P/L, half-at-T1/half-at-T2 research math: $${aggregate.selectedPnl}`,
    `- Status counts: ${Object.entries(aggregate.statusCounts).map(([key, value]) => `${key}=${value}`).join(', ')}`,
    '',
    '## Day Tape',
    '',
    '| Date | Session | Market Move | Selected Model | Dir | Proof | Entry/Stop/T1/T2 | Outcome | One-MES P/L | Complete Candidates |',
    '|---|---|---|---|---|---|---|---|---:|---:|',
    rows,
  ].join('\n');
}

export function buildYtdFullScannerDayByDayMarketMoveBestModelMap(args: {
  artifacts: RawScannerArtifactPackage[];
  marketBars?: Record<Timeframe, OhlcBar[]>;
  canonicalOhlc?: string | null;
  baseReport?: DayByDayReport | null;
}, generatedAt = new Date().toISOString()): DayByDayReport {
  const marketBars = args.marketBars || { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  const tradingDates = tradingDatesWithRthBars(marketBars['5m']);
  const replacementRows = args.artifacts.flatMap((artifact) => buildRowsForArtifact({ artifact, bars: marketBars, tradingDates }));
  const replacementDates = new Set(replacementRows.map((row) => row.date));
  const baseRows = args.baseReport?.rows.filter((row) => !replacementDates.has(row.date)) || [];
  const sessionOrder: Record<SessionName, number> = { morning: 0, lunch: 1 };
  const rows = [...baseRows, ...replacementRows].sort((a, b) => (
    a.date.localeCompare(b.date) || sessionOrder[a.session] - sessionOrder[b.session]
  ));
  const report: Omit<DayByDayReport, 'reportMarkdown'> = {
    reportType: 'ytd_full_scanner_day_by_day_market_move_best_model_map',
    generatedAt,
    authority: {
      researchOnly: true,
      exactScannerArtifacts: true,
      projectionMapperUsedForSelection: false,
      changesTradingRules: false,
      changesCanExecute: false,
      postsDiscord: false,
      writesSupabase: false,
    },
    source: {
      canonicalOhlc: args.canonicalOhlc || args.baseReport?.source?.canonicalOhlc || null,
      provenance: 'local raw scanner artifact mapper',
    },
    provenanceSummary: {
      artifactDates: new Set(args.artifacts.map((artifact) => artifact.startDate || '')).size,
      currentRunCount: new Set(args.artifacts.map((artifact) => artifact.startDate || '')).size,
      staleCount: 0,
    },
    aggregate: rollupRows(rows),
    rows,
  };
  return { ...report, reportMarkdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const artifactDir = path.resolve(options.artifactDir);
  const outDir = path.resolve(options.outDir);
  const artifacts = latestArtifactByDate(artifactDir, options.startDate, options.endDate);
  const marketBars = loadMarketBars(options.marketBarsJson);
  const baseReport = options.baseDayByDayReport
    ? JSON.parse(fs.readFileSync(options.baseDayByDayReport, 'utf8')) as DayByDayReport
    : null;
  const report = buildYtdFullScannerDayByDayMarketMoveBestModelMap({
    artifacts,
    marketBars,
    canonicalOhlc: options.marketBarsJson,
    baseReport,
  });
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `ytd-full-scanner-day-by-day-market-move-best-model-map-${stamp}.json`);
  const mdPath = path.join(outDir, `ytd-full-scanner-day-by-day-market-move-best-model-map-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.reportMarkdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    summary: report.aggregate,
    replacementArtifactDates: report.provenanceSummary.artifactDates,
    sourceRows: report.rows.length,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
