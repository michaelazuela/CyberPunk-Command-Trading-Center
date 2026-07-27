import fs from 'node:fs';
import path from 'node:path';

type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface MarketBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface PromptRow {
  proofTime: string;
  model: 'StructureShiftContinuation';
  direction: 'SHORT';
  entry: number;
  stop: number | null;
  outcomeLabel: string;
  outcomePrice: number;
  dollars: number;
}

const DEFAULT_MARKET_BARS_JSON = 'tools/automation/diagnostic-reports/controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-1784594514789.json';

const PROMPT_ROWS: PromptRow[] = [
  {
    proofTime: '2026-06-24T12:40:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7461.5,
    stop: 7487.5,
    outcomeLabel: 'T1',
    outcomePrice: 7425.25,
    dollars: 181.25,
  },
  {
    proofTime: '2026-06-24T12:45:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7459.75,
    stop: 7485.75,
    outcomeLabel: 'T1',
    outcomePrice: 7420.75,
    dollars: 195,
  },
  {
    proofTime: '2026-06-24T12:50:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7459.25,
    stop: 7485.75,
    outcomeLabel: 'T1',
    outcomePrice: 7419.5,
    dollars: 198.75,
  },
  {
    proofTime: '2026-06-24T12:55:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7459.25,
    stop: 7485.25,
    outcomeLabel: 'T1',
    outcomePrice: 7420.25,
    dollars: 195,
  },
  {
    proofTime: '2026-06-24T13:00:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7452.75,
    stop: 7484.75,
    outcomeLabel: 'T1',
    outcomePrice: 7404.75,
    dollars: 240,
  },
  {
    proofTime: '2026-06-24T13:05:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7452.75,
    stop: 7483.5,
    outcomeLabel: 'T1',
    outcomePrice: 7406.75,
    dollars: 230,
  },
  {
    proofTime: '2026-06-24T13:10:00',
    model: 'StructureShiftContinuation',
    direction: 'SHORT',
    entry: 7445.5,
    stop: 7478,
    outcomeLabel: 'Session close',
    outcomePrice: 7426.75,
    dollars: 93.75,
  },
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
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
    '5m': (Array.isArray(grouped['5m']) ? grouped['5m'] : []).filter(validBar),
    '15m': (Array.isArray(grouped['15m']) ? grouped['15m'] : []).filter(validBar),
    '60m': (Array.isArray(grouped['60m']) ? grouped['60m'] : []).filter(validBar),
    '120m': (Array.isArray(grouped['120m']) ? grouped['120m'] : []).filter(validBar),
    '240m': (Array.isArray(grouped['240m']) ? grouped['240m'] : []).filter(validBar),
  };
}

function minutes(time: string): number {
  const match = /T(\d{2}):(\d{2})/.exec(time);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function hhmm(time: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(time);
  return match ? `${match[1]}:${match[2]}` : time;
}

function dayBars(bars: MarketBar[], date = '2026-06-24'): MarketBar[] {
  return bars.filter((bar) => bar.time.startsWith(date));
}

function between(bars: MarketBar[], start: string, end: string): MarketBar[] {
  return bars.filter((bar) => bar.time >= start && bar.time <= end);
}

function activeBarAtOrBefore(bars: MarketBar[], time: string): MarketBar | null {
  return [...bars].reverse().find((bar) => bar.time <= time) || null;
}

function firstShortTouch(bars: MarketBar[], afterTime: string, price: number): string | null {
  return bars.find((bar) => bar.time >= afterTime && bar.low <= price)?.time || null;
}

function firstStopTouch(bars: MarketBar[], afterTime: string, stop: number | null): string | null {
  if (stop === null) return null;
  return bars.find((bar) => bar.time >= afterTime && bar.high >= stop)?.time || null;
}

function points(entry: number, exit: number): number {
  return Math.round((entry - exit) * 100) / 100;
}

function dollars(entry: number, exit: number): number {
  return Math.round(points(entry, exit) * 5 * 100) / 100;
}

function bodyPoints(bar: MarketBar): number {
  return Math.round(Math.abs(bar.close - bar.open) * 100) / 100;
}

function rangePoints(bar: MarketBar): number {
  return Math.round((bar.high - bar.low) * 100) / 100;
}

function findPriorLowBreak(bars5m: MarketBar[], row: PromptRow): number | null {
  const prior = bars5m.filter((bar) => bar.time < row.proofTime && minutes(bar.time) >= 12 * 60 + 30);
  if (prior.length < 2) return null;
  return Math.min(...prior.map((bar) => bar.low));
}

function rowWhy(row: PromptRow, bars5m: MarketBar[]): string {
  if (row.proofTime === '2026-06-24T12:40:00') {
    return 'First lunch-window bearish 5M structure shift: price left the 12:25-12:30 balance, broke the 7476.50/7471.50 local structure sequence, and closed heavy at 7461.50.';
  }
  if (row.proofTime === '2026-06-24T13:05:00') {
    return 'This was the only pause/retest-style row: price bounced into 7461.00 but stayed below the broken 7461.25-7464.50 structure area, then the next candle flushed lower.';
  }
  const priorLow = findPriorLowBreak(bars5m, row);
  return `Continuation proof: the completed 5M candle accepted below prior lunch structure${priorLow !== null ? ` near ${priorLow.toFixed(2)}` : ''} while HTF/15M context still supported the short.`;
}

export function buildJune24StructureShiftWinnerStory(marketBarsJson = DEFAULT_MARKET_BARS_JSON) {
  const bars = loadBars(marketBarsJson);
  const bars5m = dayBars(bars['5m']);
  const storyBars5m = between(bars5m, '2026-06-24T12:25:00', '2026-06-24T15:20:00');
  const htf = {
    fourHour: activeBarAtOrBefore(dayBars(bars['240m']), '2026-06-24T13:10:00'),
    twoHour: activeBarAtOrBefore(dayBars(bars['120m']), '2026-06-24T13:10:00'),
    oneHour: activeBarAtOrBefore(dayBars(bars['60m']), '2026-06-24T13:10:00'),
    fifteenMinute: activeBarAtOrBefore(dayBars(bars['15m']), '2026-06-24T13:10:00'),
  };
  const displacement15m = activeBarAtOrBefore(dayBars(bars['15m']), '2026-06-24T12:45:00');
  const rows = PROMPT_ROWS.map((row) => {
    const candle = bars5m.find((bar) => bar.time === row.proofTime) || null;
    const targetHitTime = firstShortTouch(storyBars5m, row.proofTime, row.outcomePrice);
    const stopHitTime = firstStopTouch(storyBars5m, row.proofTime, row.stop);
    const observedDollars = dollars(row.entry, row.outcomePrice);
    return {
      ...row,
      timeEt: hhmm(row.proofTime),
      candle,
      targetHitTime,
      stopHitTime,
      points: points(row.entry, row.outcomePrice),
      observedDollars,
      dollarsMatchesPrompt: Math.abs(observedDollars - row.dollars) < 0.01,
      fiveWs: {
        who: `MES lunch ${row.model} ${row.direction}.`,
        what: `${row.direction} from ${row.entry.toFixed(2)} with stop ${row.stop?.toFixed(2) ?? 'unconfirmed'} and ${row.outcomeLabel} ${row.outcomePrice.toFixed(2)} for one-MES ${row.dollars >= 0 ? '+' : ''}$${row.dollars.toFixed(2)}.`,
        when: `Completed 5M proof at ${hhmm(row.proofTime)} ET; outcome touched ${targetHitTime ? `${hhmm(targetHitTime)} ET` : 'not before the saved session close window'}.`,
        where: `Inside the June 24 lunch sell program, below the 7485.50-7487.50 failed upper structure and moving toward the 7425/7420/7407 downside shelf.`,
        why: rowWhy(row, bars5m),
      },
      classification: row.proofTime === '2026-06-24T12:40:00'
        ? 'initial_parent_move_trigger'
        : row.proofTime === '2026-06-24T13:05:00'
          ? 'pause_retest_continuation'
          : 'repeated_parent_move_continuation',
    };
  });

  return {
    reportType: 'june24_structure_shift_winner_story',
    generatedAt: new Date().toISOString(),
    authority: {
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
      marketBarsJson,
      selectedRows: 'user_selected_structure_shift_continuation_winners',
      date: '2026-06-24',
      session: 'lunch',
    },
    parentMove: {
      thesis: 'One bearish lunch parent move, expressed as repeated StructureShiftContinuation short rows after 5M structure kept accepting lower.',
      htfStory: [
        htf.fourHour
          ? `4H map: active 12:00 candle opened ${htf.fourHour.open}, rejected under ${htf.fourHour.high}, and traded down toward ${htf.fourHour.low}; it was context support, not execution authority.`
          : '4H map: unavailable in source artifact.',
        htf.oneHour
          ? `1H structure: 12:00 opened ${htf.oneHour.open}, failed above ${htf.oneHour.high}, and closed bearish at ${htf.oneHour.close}; 13:00 continued lower.`
          : '1H structure: unavailable in source artifact.',
        displacement15m
          ? `15M displacement: ${hhmm(displacement15m.time)} candle moved from ${displacement15m.open} to ${displacement15m.close}, range ${rangePoints(displacement15m)} pts, body ${bodyPoints(displacement15m)} pts, closing near the low after rejecting 7477.75.`
          : '15M displacement: unavailable in source artifact.',
        '5M execution: the sell program started with lower closes at 12:30, 12:35, and 12:40, then kept confirming below broken local lows.',
      ],
      deskRead: 'The short worked because the market did not reclaim the broken lunch structure. It accepted below it, paused once, then expanded into the 7425/7420 shelf and later the 7407/7404 area.',
      caution: 'These are not seven independent edge proofs. They are one parent bearish move with repeated continuation timestamps; the 13:05 pause/retest row is the cleanest add-on style lesson.',
    },
    summary: {
      rows: rows.length,
      totalPromptDollars: Math.round(rows.reduce((sum, row) => sum + row.dollars, 0) * 100) / 100,
      initialTriggers: rows.filter((row) => row.classification === 'initial_parent_move_trigger').length,
      retestContinuations: rows.filter((row) => row.classification === 'pause_retest_continuation').length,
      repeatedContinuations: rows.filter((row) => row.classification === 'repeated_parent_move_continuation').length,
      rowsWithTargetTouch: rows.filter((row) => row.targetHitTime).length,
      rowsWithStopTouchBeforeTarget: rows.filter((row) => row.stopHitTime && (!row.targetHitTime || row.stopHitTime < row.targetHitTime)).length,
    },
    rows,
    lesson: {
      modelBehavior: 'StructureShiftContinuation worked when the lunch window shifted bearish, HTF/15M context supported the short, and completed 5M candles kept accepting below broken structure.',
      preserve: 'Preserve HTF/15M context as map/support, require completed 5M proof, and prefer continuation entries after either fresh structure break or failed retest of the broken structure.',
      doNotOverfit: 'Do not count every repeated lower-close row as a separate standalone model edge. Treat the first trigger and clean retest/add-on separately.',
    },
  };
}

export function renderJune24StructureShiftWinnerStoryMarkdown(report: ReturnType<typeof buildJune24StructureShiftWinnerStory>): string {
  const lines: string[] = [];
  lines.push('# June 24 Structure Shift Continuation Winner Story');
  lines.push('');
  lines.push('Authority: read-only forensic research. No scanner wiring, no Discord post, no Supabase read/write, no bridge read, no execution approval, and no trading-rule change.');
  lines.push('');
  lines.push('## Parent Move');
  lines.push(report.parentMove.thesis);
  lines.push('');
  for (const item of report.parentMove.htfStory) lines.push(`- ${item}`);
  lines.push('');
  lines.push(`Desk read: ${report.parentMove.deskRead}`);
  lines.push('');
  lines.push(`Caution: ${report.parentMove.caution}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Rows reviewed: ${report.summary.rows}`);
  lines.push(`- One-MES prompt P/L total: $${report.summary.totalPromptDollars.toFixed(2)}`);
  lines.push(`- Initial parent trigger rows: ${report.summary.initialTriggers}`);
  lines.push(`- Pause/retest continuation rows: ${report.summary.retestContinuations}`);
  lines.push(`- Repeated parent-move continuation rows: ${report.summary.repeatedContinuations}`);
  lines.push(`- Rows whose outcome price touched in saved 5M path: ${report.summary.rowsWithTargetTouch}`);
  lines.push(`- Rows with stop touched before target: ${report.summary.rowsWithStopTouchBeforeTarget}`);
  lines.push('');
  lines.push('## 5 Ws By Winning Row');
  for (const row of report.rows) {
    lines.push('');
    lines.push(`### ${row.timeEt} ET - ${row.classification}`);
    lines.push(`- Who: ${row.fiveWs.who}`);
    lines.push(`- What: ${row.fiveWs.what}`);
    lines.push(`- When: ${row.fiveWs.when}`);
    lines.push(`- Where: ${row.fiveWs.where}`);
    lines.push(`- Why: ${row.fiveWs.why}`);
    if (row.candle) {
      lines.push(`- 5M candle: O ${row.candle.open} / H ${row.candle.high} / L ${row.candle.low} / C ${row.candle.close}, volume ${row.candle.volume ?? 'N/A'}.`);
    }
    lines.push(`- Validation: computed one-MES P/L from entry to outcome is $${row.observedDollars.toFixed(2)}; prompt match=${row.dollarsMatchesPrompt ? 'yes' : 'no'}.`);
  }
  lines.push('');
  lines.push('## Lesson');
  lines.push(`- Model behavior: ${report.lesson.modelBehavior}`);
  lines.push(`- Preserve: ${report.lesson.preserve}`);
  lines.push(`- Do not overfit: ${report.lesson.doNotOverfit}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function writeReport(report: ReturnType<typeof buildJune24StructureShiftWinnerStory>) {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `june24-structure-shift-winner-story-${stamp}.json`);
  const mdPath = path.join(outDir, `june24-structure-shift-winner-story-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderJune24StructureShiftWinnerStoryMarkdown(report));
  return { jsonPath, mdPath };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'june24-structure-shift-winner-story.ts') {
  const marketBarsJson = readFlag(process.argv.slice(2), '--market-bars-json') || DEFAULT_MARKET_BARS_JSON;
  const report = buildJune24StructureShiftWinnerStory(marketBarsJson);
  const output = writeReport(report);
  const result = {
    status: 'pass',
    output,
    summary: report.summary,
    lesson: report.lesson,
  };
  console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : `Wrote ${output.mdPath}`);
}
