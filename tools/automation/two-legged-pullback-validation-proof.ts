import fs from 'node:fs';
import path from 'node:path';

type Direction = 'LONG' | 'SHORT';
type SessionName = 'morning' | 'lunch' | 'evening';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type OutcomeStatus = 'T2_HIT' | 'T1_HIT' | 'STOP_HIT' | 'SESSION_CLOSE' | 'NO_FUTURE_BARS' | 'AMBIGUOUS';

interface MarketBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface Args {
  marketBarsJson: string;
  candidatePack: string | null;
  startDate: string;
  endDate: string;
  instrument: 'MES' | 'MNQ';
  sessions: SessionName[];
  json: boolean;
}

interface CandidateRow {
  date: string;
  session: SessionName;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  oneMesDollars: number;
  outcome: OutcomeStatus;
  outcomeTime: string | null;
  maxFavorableExcursionPoints: number;
  maxAdverseExcursionPoints: number;
  htfContext: 'support' | 'caution' | 'conflict' | 'data_limited';
  htfBarsLoaded: Record<Timeframe, number>;
  evidence: string[];
}

interface SelectorLaneSummary {
  lane: string;
  description: string;
  rawRows: number;
  firstPerWindowRows: number;
  rawOneMesDollars: number;
  firstPerWindowOneMesDollars: number;
  targets: number;
  stops: number;
  sessionClose: number;
  noFutureBars: number;
}

const POINT_VALUE_BY_INSTRUMENT: Record<Args['instrument'], number> = {
  MES: 5,
  MNQ: 2,
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const marketBarsJson = readFlag(argv, '--market-bars-json');
  if (!marketBarsJson) throw new Error('--market-bars-json is required');
  const sessions = (readFlag(argv, '--sessions') || 'morning,lunch,evening')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as SessionName[];
  if (!sessions.every((session) => ['morning', 'lunch', 'evening'].includes(session))) {
    throw new Error('--sessions may include only morning,lunch,evening');
  }
  const instrument = (readFlag(argv, '--instrument') || 'MES') as Args['instrument'];
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ');
  return {
    marketBarsJson,
    candidatePack: readFlag(argv, '--candidate-pack'),
    startDate: readFlag(argv, '--start-date') || '2026-06-08',
    endDate: readFlag(argv, '--end-date') || '2026-06-26',
    instrument,
    sessions,
    json: argv.includes('--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function validBar(value: unknown): value is MarketBar {
  const row = asRecord(value);
  return (
    typeof row.time === 'string' &&
    ['open', 'high', 'low', 'close'].every((key) => typeof row[key] === 'number' && Number.isFinite(row[key]))
  );
}

function loadBars(filePath: string): Record<Timeframe, MarketBar[]> {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const grouped = asRecord(root.bars || root.timeframes || root);
  return {
    '5m': (Array.isArray(grouped['5m']) ? grouped['5m'] : []).filter(validBar).sort(sortByTime),
    '15m': (Array.isArray(grouped['15m']) ? grouped['15m'] : []).filter(validBar).sort(sortByTime),
    '60m': (Array.isArray(grouped['60m']) ? grouped['60m'] : []).filter(validBar).sort(sortByTime),
    '120m': (Array.isArray(grouped['120m']) ? grouped['120m'] : []).filter(validBar).sort(sortByTime),
    '240m': (Array.isArray(grouped['240m']) ? grouped['240m'] : []).filter(validBar).sort(sortByTime),
  };
}

function loadCandidateName(candidatePack: string | null): string {
  if (!candidatePack) return 'Two-Legged Pullback Continuation';
  const root = JSON.parse(fs.readFileSync(candidatePack, 'utf8')) as Record<string, unknown>;
  const candidate = asRecord(root.candidate || root.primaryCandidate || root);
  const name = candidate.name || candidate.modelName || root.name;
  return typeof name === 'string' && name.trim() ? name : 'Two-Legged Pullback Continuation';
}

function sortByTime(left: MarketBar, right: MarketBar): number {
  return left.time.localeCompare(right.time);
}

function barDate(bar: MarketBar): string {
  return bar.time.slice(0, 10);
}

function barMinutes(bar: MarketBar): number {
  const match = /T(\d{2}):(\d{2})/.exec(bar.time);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function inDateRange(bar: MarketBar, startDate: string, endDate: string): boolean {
  const date = barDate(bar);
  return date >= startDate && date <= endDate;
}

function inSession(bar: MarketBar, session: SessionName): boolean {
  const minutes = barMinutes(bar);
  if (session === 'morning') return minutes >= 9 * 60 + 15 && minutes <= 12 * 60;
  if (session === 'lunch') return minutes >= 12 * 60 && minutes <= 16 * 60;
  return minutes >= 18 * 60 + 45 && minutes <= 22 * 60 + 15;
}

function roundToTick(value: number): number {
  return Math.round(value * 4) / 4;
}

function closesDirection(bar: MarketBar, direction: Direction): boolean {
  return direction === 'LONG' ? bar.close > bar.open : bar.close < bar.open;
}

function impulseDirection(bars: MarketBar[], index: number): Direction | null {
  const lookback = bars.slice(Math.max(0, index - 7), Math.max(0, index - 3));
  const preProof = bars[index - 1];
  if (lookback.length < 3 || !preProof) return null;
  const baseClose = lookback[0].close;
  const delta = preProof.close - baseClose;
  if (delta >= 4) return 'LONG';
  if (delta <= -4) return 'SHORT';
  return null;
}

function counterLegExtremes(window: MarketBar[], direction: Direction): number[] {
  const extremes: number[] = [];
  let inLeg = false;
  let extreme: number | null = null;

  for (let index = 1; index < window.length; index += 1) {
    const current = window[index];
    const previous = window[index - 1];
    const counter =
      direction === 'LONG'
        ? current.close < previous.close || current.close < current.open
        : current.close > previous.close || current.close > current.open;

    if (counter && !inLeg) {
      inLeg = true;
      extreme = direction === 'LONG' ? current.low : current.high;
    } else if (counter && extreme !== null) {
      extreme = direction === 'LONG' ? Math.min(extreme, current.low) : Math.max(extreme, current.high);
    } else if (!counter && inLeg) {
      if (extreme !== null) extremes.push(extreme);
      inLeg = false;
      extreme = null;
    }
  }

  if (inLeg && extreme !== null) extremes.push(extreme);
  return extremes;
}

function hasTwoLegPullback(window: MarketBar[], direction: Direction): boolean {
  const extremes = counterLegExtremes(window, direction);
  if (extremes.length < 2) return false;
  const lastTwo = extremes.slice(-2);
  return direction === 'LONG'
    ? lastTwo[1] <= lastTwo[0] + 1.5
    : lastTwo[1] >= lastTwo[0] - 1.5;
}

function hasCompletedProof(bars: MarketBar[], index: number, direction: Direction): boolean {
  const proof = bars[index];
  const previous = bars[index - 1];
  if (!proof || !previous || !closesDirection(proof, direction)) return false;
  if (direction === 'LONG') return proof.close > previous.high || proof.close > Math.max(previous.close, proof.open) + 1;
  return proof.close < previous.low || proof.close < Math.min(previous.close, proof.open) - 1;
}

function protectedStop(window: MarketBar[], direction: Direction): number | null {
  if (!window.length) return null;
  const raw = direction === 'LONG'
    ? Math.min(...window.map((bar) => bar.low))
    : Math.max(...window.map((bar) => bar.high));
  if (!Number.isFinite(raw)) return null;
  return roundToTick(direction === 'LONG' ? raw - 0.25 : raw + 0.25);
}

function htfContextFor(args: {
  bars: Record<Timeframe, MarketBar[]>;
  date: string;
  time: string;
  direction: Direction;
}): CandidateRow['htfContext'] {
  const loaded = (['15m', '60m', '120m', '240m'] as Timeframe[]).map((timeframe) =>
    args.bars[timeframe].filter((bar) => bar.time <= args.time && barDate(bar) >= args.date.slice(0, 8)).length
  );
  if (loaded.some((count) => count < 4)) return 'data_limited';

  let support = 0;
  let conflict = 0;
  for (const timeframe of ['15m', '60m', '120m', '240m'] as Timeframe[]) {
    const recent = args.bars[timeframe].filter((bar) => bar.time <= args.time).slice(-8);
    if (recent.length < 4) continue;
    const delta = recent.at(-1)!.close - recent[0].open;
    if (Math.abs(delta) < 1) continue;
    if ((delta > 0 && args.direction === 'LONG') || (delta < 0 && args.direction === 'SHORT')) support += 1;
    else conflict += 1;
  }

  if (support >= 2 && conflict === 0) return 'support';
  if (conflict >= 2 && support === 0) return 'conflict';
  return 'caution';
}

function outcomeFor(args: {
  direction: Direction;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  futureBars: MarketBar[];
  pointValue: number;
}): Pick<CandidateRow, 'outcome' | 'outcomeTime' | 'oneMesDollars' | 'maxFavorableExcursionPoints' | 'maxAdverseExcursionPoints'> {
  let maxFavorable = 0;
  let maxAdverse = 0;
  if (args.futureBars.length === 0) {
    return {
      outcome: 'NO_FUTURE_BARS',
      outcomeTime: null,
      oneMesDollars: 0,
      maxFavorableExcursionPoints: 0,
      maxAdverseExcursionPoints: 0,
    };
  }

  for (const bar of args.futureBars) {
    const favorable = args.direction === 'LONG' ? bar.high - args.entry : args.entry - bar.low;
    const adverse = args.direction === 'LONG' ? args.entry - bar.low : bar.high - args.entry;
    maxFavorable = Math.max(maxFavorable, favorable);
    maxAdverse = Math.max(maxAdverse, adverse);

    const stopHit = args.direction === 'LONG' ? bar.low <= args.stop : bar.high >= args.stop;
    const t1Hit = args.direction === 'LONG' ? bar.high >= args.target1 : bar.low <= args.target1;
    const t2Hit = args.direction === 'LONG' ? bar.high >= args.target2 : bar.low <= args.target2;
    if (stopHit && (t1Hit || t2Hit)) {
      return {
        outcome: 'AMBIGUOUS',
        outcomeTime: bar.time,
        oneMesDollars: 0,
        maxFavorableExcursionPoints: roundToTick(maxFavorable),
        maxAdverseExcursionPoints: roundToTick(maxAdverse),
      };
    }
    if (t2Hit) {
      return {
        outcome: 'T2_HIT',
        outcomeTime: bar.time,
        oneMesDollars: roundToTick(Math.abs(args.target2 - args.entry)) * args.pointValue,
        maxFavorableExcursionPoints: roundToTick(maxFavorable),
        maxAdverseExcursionPoints: roundToTick(maxAdverse),
      };
    }
    if (t1Hit) {
      return {
        outcome: 'T1_HIT',
        outcomeTime: bar.time,
        oneMesDollars: roundToTick(Math.abs(args.target1 - args.entry)) * args.pointValue,
        maxFavorableExcursionPoints: roundToTick(maxFavorable),
        maxAdverseExcursionPoints: roundToTick(maxAdverse),
      };
    }
    if (stopHit) {
      return {
        outcome: 'STOP_HIT',
        outcomeTime: bar.time,
        oneMesDollars: -roundToTick(Math.abs(args.entry - args.stop)) * args.pointValue,
        maxFavorableExcursionPoints: roundToTick(maxFavorable),
        maxAdverseExcursionPoints: roundToTick(maxAdverse),
      };
    }
  }

  const closeBar = args.futureBars.at(-1)!;
  const sessionClosePoints = args.direction === 'LONG' ? closeBar.close - args.entry : args.entry - closeBar.close;
  return {
    outcome: 'SESSION_CLOSE',
    outcomeTime: closeBar.time,
    oneMesDollars: roundToTick(sessionClosePoints) * args.pointValue,
    maxFavorableExcursionPoints: roundToTick(maxFavorable),
    maxAdverseExcursionPoints: roundToTick(maxAdverse),
  };
}

function groupBy<T>(rows: T[], keyFor: (row: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = keyFor(row);
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});
}

function firstRowsByWindow(rows: CandidateRow[]): CandidateRow[] {
  return Object.values(groupBy(rows, (row) => `${row.date}|${row.session}`))
    .map((items) => items.sort((left, right) => left.proofTime.localeCompare(right.proofTime))[0])
    .filter(Boolean);
}

function summarizeLane(lane: string, description: string, rows: CandidateRow[]): SelectorLaneSummary {
  const firstPerWindow = firstRowsByWindow(rows);
  return {
    lane,
    description,
    rawRows: rows.length,
    firstPerWindowRows: firstPerWindow.length,
    rawOneMesDollars: rows.reduce((sum, row) => sum + row.oneMesDollars, 0),
    firstPerWindowOneMesDollars: firstPerWindow.reduce((sum, row) => sum + row.oneMesDollars, 0),
    targets: firstPerWindow.filter((row) => row.outcome === 'T1_HIT' || row.outcome === 'T2_HIT').length,
    stops: firstPerWindow.filter((row) => row.outcome === 'STOP_HIT').length,
    sessionClose: firstPerWindow.filter((row) => row.outcome === 'SESSION_CLOSE').length,
    noFutureBars: firstPerWindow.filter((row) => row.outcome === 'NO_FUTURE_BARS').length,
  };
}

function selectorLanes(rows: CandidateRow[]): SelectorLaneSummary[] {
  const lunchRows = rows.filter((row) => row.session === 'lunch');
  const htfNotConflict = (row: CandidateRow) => row.htfContext !== 'conflict' && row.htfContext !== 'data_limited';
  const reasonableRisk30 = (row: CandidateRow) => row.riskPoints <= 30;
  const tightRisk20 = (row: CandidateRow) => row.riskPoints <= 20;
  const shortOnly = (row: CandidateRow) => row.direction === 'SHORT';
  const longOnly = (row: CandidateRow) => row.direction === 'LONG';
  const htfSupport = (row: CandidateRow) => row.htfContext === 'support';
  const htfCaution = (row: CandidateRow) => row.htfContext === 'caution';
  return [
    summarizeLane('all_rows', 'Every raw validation row across selected sessions.', rows),
    summarizeLane('lunch_only', 'Lunch only, no added filter.', lunchRows),
    summarizeLane('lunch_htf_not_conflict', 'Lunch only, HTF context cannot be conflict or data-limited.', lunchRows.filter(htfNotConflict)),
    summarizeLane('lunch_htf_not_conflict_max_risk_30', 'Lunch only, HTF not conflict, protected 5M risk <= 30 points.', lunchRows.filter((row) => htfNotConflict(row) && reasonableRisk30(row))),
    summarizeLane('lunch_htf_not_conflict_max_risk_20', 'Lunch only, HTF not conflict, protected 5M risk <= 20 points.', lunchRows.filter((row) => htfNotConflict(row) && tightRisk20(row))),
    summarizeLane('lunch_short_htf_not_conflict_max_risk_30', 'Lunch shorts only, HTF not conflict, protected 5M risk <= 30 points.', lunchRows.filter((row) => shortOnly(row) && htfNotConflict(row) && reasonableRisk30(row))),
    summarizeLane('lunch_short_htf_support_max_risk_30', 'Lunch shorts only, HTF support only, protected 5M risk <= 30 points.', lunchRows.filter((row) => shortOnly(row) && htfSupport(row) && reasonableRisk30(row))),
    summarizeLane('lunch_short_htf_caution_max_risk_30', 'Lunch shorts only, HTF caution only, protected 5M risk <= 30 points.', lunchRows.filter((row) => shortOnly(row) && htfCaution(row) && reasonableRisk30(row))),
    summarizeLane('lunch_long_htf_not_conflict_max_risk_30', 'Lunch longs only, HTF not conflict, protected 5M risk <= 30 points.', lunchRows.filter((row) => longOnly(row) && htfNotConflict(row) && reasonableRisk30(row))),
  ];
}

export function buildTwoLeggedPullbackValidationProof(args: Args) {
  const bars = loadBars(args.marketBarsJson);
  const candidateName = loadCandidateName(args.candidatePack);
  const rows: CandidateRow[] = [];
  const blocked: Record<string, number> = {
    insufficientHistory: 0,
    noImpulseDirection: 0,
    noTwoLegPullback: 0,
    noCompletedProof: 0,
    noProtectedStop: 0,
    invalidRisk: 0,
  };
  let barsEvaluated = 0;

  for (const session of args.sessions) {
    const evaluationBars = bars['5m'].filter((bar) => inDateRange(bar, args.startDate, args.endDate) && inSession(bar, session));
    for (const currentBar of evaluationBars) {
      const date = barDate(currentBar);
      const sessionBars = bars['5m'].filter((bar) => barDate(bar) === date && inSession(bar, session));
      const index = sessionBars.findIndex((bar) => bar.time === currentBar.time);
      if (index < 6) {
        blocked.insufficientHistory += 1;
        continue;
      }
      barsEvaluated += 1;
      const direction = impulseDirection(sessionBars, index);
      if (!direction) {
        blocked.noImpulseDirection += 1;
        continue;
      }
      const pullbackWindow = sessionBars.slice(Math.max(0, index - 8), index);
      if (!hasTwoLegPullback(pullbackWindow, direction)) {
        blocked.noTwoLegPullback += 1;
        continue;
      }
      if (!hasCompletedProof(sessionBars, index, direction)) {
        blocked.noCompletedProof += 1;
        continue;
      }
      const stop = protectedStop(pullbackWindow, direction);
      if (stop === null) {
        blocked.noProtectedStop += 1;
        continue;
      }
      const entry = roundToTick(currentBar.close);
      const riskPoints = roundToTick(direction === 'LONG' ? entry - stop : stop - entry);
      if (!Number.isFinite(riskPoints) || riskPoints <= 0) {
        blocked.invalidRisk += 1;
        continue;
      }
      const target1 = roundToTick(direction === 'LONG' ? entry + riskPoints * 1.5 : entry - riskPoints * 1.5);
      const target2 = roundToTick(direction === 'LONG' ? entry + riskPoints * 2 : entry - riskPoints * 2);
      const futureBars = sessionBars.slice(index + 1);
      const outcome = outcomeFor({
        direction,
        entry,
        stop,
        target1,
        target2,
        futureBars,
        pointValue: POINT_VALUE_BY_INSTRUMENT[args.instrument],
      });
      rows.push({
        date,
        session,
        direction,
        proofTime: currentBar.time,
        entry,
        stop,
        target1,
        target2,
        riskPoints,
        htfContext: htfContextFor({ bars, date, time: currentBar.time, direction }),
        htfBarsLoaded: {
          '5m': bars['5m'].filter((bar) => bar.time <= currentBar.time).length,
          '15m': bars['15m'].filter((bar) => bar.time <= currentBar.time).length,
          '60m': bars['60m'].filter((bar) => bar.time <= currentBar.time).length,
          '120m': bars['120m'].filter((bar) => bar.time <= currentBar.time).length,
          '240m': bars['240m'].filter((bar) => bar.time <= currentBar.time).length,
        },
        evidence: [
          `Replay-only ${direction} impulse detected before pullback.`,
          'Two countertrend pullback legs were present before proof.',
          `Completed 5M proof candle closed at ${entry}.`,
          `Stop uses nearest protected 5M pullback structure at ${stop}.`,
          'HTF context is recorded as map/support/caution only and does not approve the candidate.',
        ],
        ...outcome,
      });
    }
  }

  const firstPerWindow = firstRowsByWindow(rows);
  const byOutcome = groupBy(rows, (row) => row.outcome);
  const bySession = Object.fromEntries(
    Object.entries(groupBy(rows, (row) => row.session)).map(([session, items]) => [
      session,
      {
        candidates: items.length,
        oneMesDollars: items.reduce((sum, row) => sum + row.oneMesDollars, 0),
        winners: items.filter((row) => row.outcome === 'T1_HIT' || row.outcome === 'T2_HIT').length,
        losers: items.filter((row) => row.outcome === 'STOP_HIT').length,
      },
    ])
  );

  return {
    reportType: 'two_legged_pullback_continuation_validation_proof',
    generatedAt: new Date().toISOString(),
    authority: {
      validationOnly: true,
      localFileOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
      noTradingRuleChange: true,
    },
    source: {
      candidateName,
      candidatePack: args.candidatePack,
      marketBarsJson: args.marketBarsJson,
      startDate: args.startDate,
      endDate: args.endDate,
      instrument: args.instrument,
      sessions: args.sessions,
    },
    summary: {
      bars5mLoaded: bars['5m'].length,
      bars15mLoaded: bars['15m'].length,
      bars60mLoaded: bars['60m'].length,
      bars120mLoaded: bars['120m'].length,
      bars240mLoaded: bars['240m'].length,
      barsEvaluated,
      candidateRows: rows.length,
      firstPerWindowRows: firstPerWindow.length,
      byOutcome: Object.fromEntries(Object.entries(byOutcome).map(([outcome, items]) => [outcome, items.length])),
      allRowsOneMesDollars: rows.reduce((sum, row) => sum + row.oneMesDollars, 0),
      firstPerWindowOneMesDollars: firstPerWindow.reduce((sum, row) => sum + row.oneMesDollars, 0),
      blocked,
      bySession,
    },
    selectorLanes: selectorLanes(rows),
    firstPerWindow,
    rows,
  };
}

function markdownReport(report: ReturnType<typeof buildTwoLeggedPullbackValidationProof>): string {
  const lines = [
    `# ${report.source.candidateName} Validation Proof`,
    '',
    'Validation-only proof. No scanner wiring, Discord post, Supabase read/write, bridge read, execution approval, or trading-rule change.',
    '',
    '## Summary',
    '',
    `- Range: ${report.source.startDate} to ${report.source.endDate}`,
    `- Instrument: ${report.source.instrument}`,
    `- Sessions: ${report.source.sessions.join(', ')}`,
    `- 5M bars evaluated: ${report.summary.barsEvaluated}`,
    `- Candidate rows: ${report.summary.candidateRows}`,
    `- First candidate per day/session rows: ${report.summary.firstPerWindowRows}`,
    `- All-row one-MES P/L: $${report.summary.allRowsOneMesDollars.toFixed(2)}`,
    `- First-per-window one-MES P/L: $${report.summary.firstPerWindowOneMesDollars.toFixed(2)}`,
    `- Outcomes: ${JSON.stringify(report.summary.byOutcome)}`,
    '',
    '## First Candidate Per Day/Session',
    '',
    '| Date | Session | Direction | Proof | Entry | Stop | T1 | T2 | Risk | Outcome | $MES | HTF |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |',
    ...report.firstPerWindow.map((row) =>
      `| ${row.date} | ${row.session} | ${row.direction} | ${row.proofTime.slice(11, 16)} | ${row.entry.toFixed(2)} | ${row.stop.toFixed(2)} | ${row.target1.toFixed(2)} | ${row.target2.toFixed(2)} | ${row.riskPoints.toFixed(2)} | ${row.outcome} | ${row.oneMesDollars.toFixed(2)} | ${row.htfContext} |`
    ),
    '',
    '## Selector Lane Comparison',
    '',
    '| Lane | Raw Rows | First/Window | First/Window $MES | Targets | Stops | Session Close | No Future Bars |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...report.selectorLanes.map((lane) =>
      `| ${lane.lane} | ${lane.rawRows} | ${lane.firstPerWindowRows} | ${lane.firstPerWindowOneMesDollars.toFixed(2)} | ${lane.targets} | ${lane.stops} | ${lane.sessionClose} | ${lane.noFutureBars} |`
    ),
    '',
    '## Blocked Counts',
    '',
    ...Object.entries(report.summary.blocked).map(([reason, count]) => `- ${reason}: ${count}`),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function writeReports(report: ReturnType<typeof buildTwoLeggedPullbackValidationProof>): { jsonPath: string; markdownPath: string } {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const base = `two-legged-pullback-validation-proof-${report.source.instrument}-${report.source.startDate}-to-${report.source.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, markdownReport(report));
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'two-legged-pullback-validation-proof.ts') {
  const args = parseArgs();
  const report = buildTwoLeggedPullbackValidationProof(args);
  const output = writeReports(report);
  const result = {
    status: 'pass',
    output,
    summary: report.summary,
  };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Wrote ${output.jsonPath}`);
    console.log(`Wrote ${output.markdownPath}`);
    console.log(JSON.stringify(report.summary, null, 2));
  }
}
