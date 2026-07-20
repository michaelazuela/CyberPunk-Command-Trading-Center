import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRADE_RULES, targetsFromEntryStop } from '../../src/config/tradeRules';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import type { NoChaseMssTimestampAlignmentValidationReport } from './no-chase-mss-timestamp-alignment-validation';
import type { NoChaseIntradayRemainingBlockerDrilldownReport } from './no-chase-intraday-remaining-blocker-drilldown';

type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface CliOptions {
  drilldownReport: string;
  validationReport: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

type SimOutcome = 'T2_HIT' | 'T1_HIT_OPEN_RUNNER' | 'T1_THEN_STOP' | 'STOP_HIT' | 'AMBIGUOUS' | 'FILLED_OPEN' | 'NO_FILL' | 'BLOCKED';

interface SimRow {
  caseId: string;
  tradeDate: string;
  sessionType: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT' | 'NO TRADE';
  entry: number | null;
  recoveredProtectedMssStop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  maxRiskPoints: number;
  maxRiskPass: boolean;
  directionallyValid: boolean;
  hypotheticalFillTime: string | null;
  outcome: SimOutcome;
  outcomeTime: string | null;
  oneMesGross: number;
  recommendation: 'do_not_install_wide_risk' | 'possible_human_review_only_probe' | 'keep_blocked';
  reason: string;
}

export interface NoChaseIntradayProtectedMssStopFallbackSimulationReport {
  reportType: 'no_chase_intraday_protected_mss_stop_fallback_simulation';
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
    usesHypotheticalGeometry: true;
  };
  source: {
    drilldownReportPath: string;
    validationReportPath: string;
    marketBarsJson: string;
  };
  summary: {
    rowsChecked: number;
    directionallyValidRows: number;
    maxRiskPassRows: number;
    wideRiskRows: number;
    winningRows: number;
    losingRows: number;
    oneMesGross: number;
    canExecuteTrueRows: 0;
    recommendation: 'do_not_install_as_live_fallback' | 'candidate_for_guarded_source_builder_probe' | 'hold';
  };
  rows: SimRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const drilldownReport = readFlag(args, '--drilldown-report');
  const validationReport = readFlag(args, '--validation-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!drilldownReport) throw new Error('--drilldown-report is required.');
  if (!validationReport) throw new Error('--validation-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    drilldownReport,
    validationReport,
    marketBarsJson,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): NinjaBridgeBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  return { time, open, high, low, close, volume: finiteNumber(record.volume) ?? 0 };
}

function loadBars(file: string): Record<Timeframe, NinjaBridgeBar[]> {
  const raw = readJson<unknown>(file);
  const grouped = asRecord(asRecord(raw).bars || asRecord(raw).timeframes || raw);
  const output: Record<Timeframe, NinjaBridgeBar[]> = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  for (const timeframe of TIMEFRAMES) {
    const rows = Array.isArray(grouped[timeframe]) ? grouped[timeframe] as unknown[] : [];
    output[timeframe] = rows.map(normalizeBar).filter((bar): bar is NinjaBridgeBar => Boolean(bar)).sort((a, b) => a.time.localeCompare(b.time));
  }
  return output;
}

function minutes(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function inSession(bar: NinjaBridgeBar, date: string, session: 'morning' | 'lunch'): boolean {
  if (bar.time.slice(0, 10) !== date) return false;
  const minute = minutes(bar.time);
  if (minute === null) return false;
  if (session === 'morning') return minute >= 9 * 60 + 15 && minute < 12 * 60;
  return minute >= 12 * 60 && minute < 16 * 60;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function firstFillTime(bars: NinjaBridgeBar[], entry: number | null): string | null {
  if (entry === null) return null;
  return bars.find((bar) => bar.low <= entry && bar.high >= entry)?.time || null;
}

function replayOutcome(args: {
  direction: 'LONG' | 'SHORT' | 'NO TRADE';
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  fillTime: string | null;
  bars: NinjaBridgeBar[];
}): Pick<SimRow, 'outcome' | 'outcomeTime' | 'oneMesGross'> {
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') return { outcome: 'BLOCKED', outcomeTime: null, oneMesGross: 0 };
  if (args.entry === null || args.stop === null || args.target1 === null || args.target2 === null || !args.fillTime) {
    return { outcome: 'BLOCKED', outcomeTime: null, oneMesGross: 0 };
  }
  const futureBars = args.bars.filter((bar) => bar.time > args.fillTime);
  if (!futureBars.length) return { outcome: 'NO_FILL', outcomeTime: null, oneMesGross: 0 };
  const isLong = args.direction === 'LONG';
  const stopRisk = Math.abs(args.entry - args.stop) * 5;
  const target1Profit = Math.abs(args.target1 - args.entry) * 5;
  const target2Profit = Math.abs(args.target2 - args.entry) * 5;
  let target1Hit = false;
  for (const bar of futureBars) {
    const hitStop = isLong ? bar.low <= args.stop : bar.high >= args.stop;
    const hitT1 = isLong ? bar.high >= args.target1 : bar.low <= args.target1;
    const hitT2 = isLong ? bar.high >= args.target2 : bar.low <= args.target2;
    if (!target1Hit && hitStop && (hitT1 || hitT2)) return { outcome: 'AMBIGUOUS', outcomeTime: bar.time, oneMesGross: 0 };
    if (hitT2) return { outcome: 'T2_HIT', outcomeTime: bar.time, oneMesGross: roundCurrency(target2Profit) };
    if (hitT1) target1Hit = true;
    if (hitStop) {
      return target1Hit
        ? { outcome: 'T1_THEN_STOP', outcomeTime: bar.time, oneMesGross: roundCurrency(target1Profit) }
        : { outcome: 'STOP_HIT', outcomeTime: bar.time, oneMesGross: roundCurrency(-stopRisk) };
    }
  }
  return target1Hit
    ? { outcome: 'T1_HIT_OPEN_RUNNER', outcomeTime: futureBars.find((bar) => isLong ? bar.high >= args.target1! : bar.low <= args.target1!)?.time || null, oneMesGross: roundCurrency(target1Profit) }
    : { outcome: 'FILLED_OPEN', outcomeTime: null, oneMesGross: 0 };
}

function directionFromReplay(value: string): SimRow['direction'] {
  return value === 'LONG' || value === 'SHORT' ? value : 'NO TRADE';
}

function buildRow(args: {
  drilldownRow: NoChaseIntradayRemainingBlockerDrilldownReport['rows'][number];
  bars5m: NinjaBridgeBar[];
}): SimRow {
  const direction = directionFromReplay(args.drilldownRow.direction);
  const entry = args.drilldownRow.validationEntry;
  const stop = args.drilldownRow.validationRecoveredStop;
  const targets = targetsFromEntryStop(direction, entry, stop);
  const directionallyValid = targets.riskPoints !== null;
  const maxRiskPass = targets.riskPoints !== null && targets.riskPoints <= TRADE_RULES.maxRiskPoints;
  const sessionBars = args.bars5m.filter((bar) => inSession(bar, args.drilldownRow.tradeDate, args.drilldownRow.sessionType));
  const fillTime = firstFillTime(sessionBars, entry);
  const outcome = replayOutcome({
    direction,
    entry,
    stop,
    target1: targets.target1,
    target2: targets.target2,
    fillTime,
    bars: sessionBars,
  });
  const recommendation: SimRow['recommendation'] = !directionallyValid || !fillTime
    ? 'keep_blocked'
    : maxRiskPass
      ? 'possible_human_review_only_probe'
      : 'do_not_install_wide_risk';
  return {
    caseId: args.drilldownRow.caseId,
    tradeDate: args.drilldownRow.tradeDate,
    sessionType: args.drilldownRow.sessionType,
    direction,
    entry,
    recoveredProtectedMssStop: stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    maxRiskPoints: TRADE_RULES.maxRiskPoints,
    maxRiskPass,
    directionallyValid,
    hypotheticalFillTime: fillTime,
    outcome: outcome.outcome,
    outcomeTime: outcome.outcomeTime,
    oneMesGross: outcome.oneMesGross,
    recommendation,
    reason: recommendation === 'do_not_install_wide_risk'
      ? `Recovered protected MSS stop creates ${targets.riskPoints?.toFixed(2) || 'unknown'} points of risk, above max ${TRADE_RULES.maxRiskPoints}. Keep as research/human-review context only.`
      : recommendation === 'possible_human_review_only_probe'
        ? 'Recovered protected MSS stop is directionally valid and within max risk in this hypothetical simulation.'
        : 'Recovered protected MSS stop fallback cannot form a complete directionally valid plan.',
  };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
}

function buildMarkdown(report: Omit<NoChaseIntradayProtectedMssStopFallbackSimulationReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Protected MSS Stop Fallback Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: research-only hypothetical geometry. No scanner behavior, Discord, Supabase, live bridge, canExecute, or trading-rule changes.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Directionally valid rows: ${report.summary.directionallyValidRows}.`,
    `- Max-risk pass rows: ${report.summary.maxRiskPassRows}.`,
    `- Wide-risk rows: ${report.summary.wideRiskRows}.`,
    `- One-MES gross P/L: $${report.summary.oneMesGross.toFixed(2)}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Case | Entry | Recovered Stop | Risk | T1 | T2 | Fill | Outcome | One MES Gross | Recommendation |',
    '|---|---:|---:|---:|---:|---:|---|---|---:|---|',
    ...report.rows.map((row) => `| ${markdownCell(row.caseId)} | ${row.entry ?? '-'} | ${row.recoveredProtectedMssStop ?? '-'} | ${row.riskPoints ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} | ${row.hypotheticalFillTime || '-'} | ${row.outcome}${row.outcomeTime ? ` @ ${row.outcomeTime}` : ''} | $${row.oneMesGross.toFixed(2)} | ${row.recommendation} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayProtectedMssStopFallbackSimulationReport(args: {
  drilldownReportPath: string;
  validationReportPath: string;
  marketBarsJson: string;
  drilldownReport: NoChaseIntradayRemainingBlockerDrilldownReport;
  validationReport: NoChaseMssTimestampAlignmentValidationReport;
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}, generatedAt = new Date().toISOString()): NoChaseIntradayProtectedMssStopFallbackSimulationReport {
  const sourceRows = args.drilldownReport.rows.filter((row) => row.blockerFamily === 'retest_swing_stop_not_confirmed');
  const rows = sourceRows.map((row) => buildRow({ drilldownRow: row, bars5m: args.bars['5m'] }));
  const wideRiskRows = rows.filter((row) => row.directionallyValid && !row.maxRiskPass).length;
  const base: Omit<NoChaseIntradayProtectedMssStopFallbackSimulationReport, 'markdown'> = {
    reportType: 'no_chase_intraday_protected_mss_stop_fallback_simulation',
    generatedAt,
    status: 'pass',
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
      usesHypotheticalGeometry: true,
    },
    source: {
      drilldownReportPath: args.drilldownReportPath,
      validationReportPath: args.validationReportPath,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      rowsChecked: rows.length,
      directionallyValidRows: rows.filter((row) => row.directionallyValid).length,
      maxRiskPassRows: rows.filter((row) => row.maxRiskPass).length,
      wideRiskRows,
      winningRows: rows.filter((row) => row.oneMesGross > 0).length,
      losingRows: rows.filter((row) => row.oneMesGross < 0).length,
      oneMesGross: roundCurrency(rows.reduce((sum, row) => sum + row.oneMesGross, 0)),
      canExecuteTrueRows: 0,
      recommendation: rows.length && wideRiskRows === 0 ? 'candidate_for_guarded_source_builder_probe' : rows.length ? 'do_not_install_as_live_fallback' : 'hold',
    },
    rows,
    blockers: [],
    recommendations: rows.length && wideRiskRows > 0
      ? [
        'Do not install recovered protected MSS stop as a live fallback yet; the tested rows are directionally valid but too wide for the max-risk gate.',
        'Keep the recovered protected MSS swing as research context or human-review note only unless a later narrowed entry reduces actual risk.',
        'Next narrow phase should inspect whether the entry source can legitimately move closer to the recovered protected MSS stop without using lookahead.',
      ]
      : ['Hold until there are retest-swing-stop blocked rows to simulate.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayProtectedMssStopFallbackSimulationReport(
  report: NoChaseIntradayProtectedMssStopFallbackSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-protected-mss-stop-fallback-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayProtectedMssStopFallbackSimulationCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayProtectedMssStopFallbackSimulationReport({
    drilldownReportPath: options.drilldownReport,
    validationReportPath: options.validationReport,
    marketBarsJson: options.marketBarsJson,
    drilldownReport: readJson<NoChaseIntradayRemainingBlockerDrilldownReport>(options.drilldownReport),
    validationReport: readJson<NoChaseMssTimestampAlignmentValidationReport>(options.validationReport),
    bars: loadBars(options.marketBarsJson),
  });
  const paths = writeNoChaseIntradayProtectedMssStopFallbackSimulationReport(report, options.outDir);
  if (options.json) {
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
    runNoChaseIntradayProtectedMssStopFallbackSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
