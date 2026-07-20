import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNinjaChartContext, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type AnalysisResult, type ChartContext, type SetupCandidate } from '../../src/types';
import type { NoChaseMssTimestampAlignmentValidationReport } from './no-chase-mss-timestamp-alignment-validation';

type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type ReplaySession = 'morning' | 'lunch';
type ReplaySessionType = 'replay_morning' | 'replay_lunch';

interface CliOptions {
  validationReport: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface ReplayRow {
  caseId: string;
  tradeDate: string;
  sessionType: ReplaySession;
  direction: string;
  validationEntry: number | null;
  validationRecoveredStop: number | null;
  eventsScanned: number;
  firstHumanReviewTime: string | null;
  firstHumanReviewEntry: number | null;
  firstHumanReviewStop: number | null;
  firstHumanReviewTarget1: number | null;
  firstHumanReviewTarget2: number | null;
  canExecute: boolean;
  publishDiscordEligible: boolean;
  replayOutcome: 'T2_HIT' | 'T1_HIT_OPEN_RUNNER' | 'T1_THEN_STOP' | 'STOP_HIT' | 'AMBIGUOUS' | 'FILLED_OPEN' | 'NO_FILL' | 'BLOCKED';
  replayOutcomeTime: string | null;
  oneMesGross: number;
  remainsBlockedReason: string | null;
}

export interface NoChaseIntradayFullWindowStopReplayReport {
  reportType: 'no_chase_intraday_full_window_stop_replay';
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
    runsSetupScanner: true;
    scannerRunMode: 'targeted_replay_only';
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
    validationReportPath: string;
    marketBarsJson: string;
  };
  summary: {
    rowsChecked: number;
    humanReviewRows: number;
    stillBlockedRows: number;
    missingEntryRowsStillBlocked: number;
    canExecuteTrueRows: number;
    publishDiscordEligibleRows: number;
    livePromotionAllowedRows: 0;
    oneMesGross: number;
    recommendation: 'fallback_helped_guarded_rows' | 'hold_and_inspect';
  };
  rows: ReplayRow[];
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
  const validationReport = readFlag(args, '--validation-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!validationReport) throw new Error('--validation-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
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

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
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
    const byTime = new Map<string, NinjaBridgeBar>();
    for (const row of rows) {
      const bar = normalizeBar(row);
      if (bar) byTime.set(bar.time, bar);
    }
    output[timeframe] = [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
  }
  return output;
}

function sessionType(session: ReplaySession): ReplaySessionType {
  return session === 'morning' ? 'replay_morning' : 'replay_lunch';
}

function minutes(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function inSession(bar: NinjaBridgeBar, date: string, session: ReplaySession): boolean {
  if (bar.time.slice(0, 10) !== date) return false;
  const minute = minutes(bar.time);
  if (minute === null) return false;
  if (session === 'morning') return minute >= 9 * 60 + 15 && minute < 12 * 60;
  return minute >= 12 * 60 && minute < 16 * 60;
}

function replayProbeBars(eventBars: NinjaBridgeBar[], entry: number | null): NinjaBridgeBar[] {
  if (!eventBars.length) return [];
  if (entry !== null) {
    const matches = eventBars.filter((bar) => Math.abs(bar.close - entry) <= 0.00001);
    if (matches.length) return matches.slice(0, 3);
  }
  return [eventBars[eventBars.length - 1]];
}

function through<T extends { time: string }>(bars: T[], asOf: string): T[] {
  return bars.filter((bar) => bar.time <= asOf);
}

function analysisForReplay(context: ChartContext): AnalysisResult {
  return {
    dayType: 'NO TRADE',
    reasoning: 'Targeted no-chase full-window stop replay. Local OHLC only; setupScanner owns candidate state.',
    confidence: 0.7,
    checks: [{ label: 'Targeted local replay', passed: true }],
    structuredChartContext: context,
  };
}

function candidateAtEvent(args: {
  bars: Record<Timeframe, NinjaBridgeBar[]>;
  date: string;
  session: ReplaySession;
  asOf: string;
  instrument: ChartContext['instrument'];
}): SetupCandidate | null {
  const activeBars5m = args.bars['5m'].filter((bar) => inSession(bar, args.date, args.session) && bar.time <= args.asOf);
  if (!activeBars5m.length) return null;
  const context = buildNinjaChartContext({
    bars5m: activeBars5m,
    htfBars5m: through(args.bars['5m'], args.asOf),
    bars15m: through(args.bars['15m'], args.asOf),
    bars60m: through(args.bars['60m'], args.asOf),
    bars120m: through(args.bars['120m'], args.asOf),
    bars240m: through(args.bars['240m'], args.asOf),
    sessionType: sessionType(args.session),
    instrument: args.instrument,
    tradeDate: args.date,
  }) as ChartContext | null;
  if (!context) return null;
  const scan = scanSetupCandidates({ sessionType: sessionType(args.session), chartContext: context, result: analysisForReplay(context) });
  return scan.candidates.find((candidate) => candidate.setupType === SetupType.IntradayMssMicroContinuation) || null;
}

function replayOutcome(args: {
  candidate: SetupCandidate | null;
  eventTime: string | null;
  bars5m: NinjaBridgeBar[];
}): Pick<ReplayRow, 'replayOutcome' | 'replayOutcomeTime' | 'oneMesGross'> {
  const candidate = args.candidate;
  if (!candidate || !args.eventTime || candidate.entry === null || candidate.stop === null || candidate.target1 === null || candidate.target2 === null) {
    return { replayOutcome: 'BLOCKED', replayOutcomeTime: null, oneMesGross: 0 };
  }

  const futureBars = args.bars5m.filter((bar) => bar.time > args.eventTime);
  if (!futureBars.length) return { replayOutcome: 'NO_FILL', replayOutcomeTime: null, oneMesGross: 0 };

  const isLong = candidate.direction === 'LONG';
  const stopRisk = Math.abs(candidate.entry - candidate.stop) * 5;
  const target1Profit = Math.abs(candidate.target1 - candidate.entry) * 5;
  const target2Profit = Math.abs(candidate.target2 - candidate.entry) * 5;
  let target1Hit = false;

  for (const bar of futureBars) {
    const hitStop = isLong ? bar.low <= candidate.stop : bar.high >= candidate.stop;
    const hitT1 = isLong ? bar.high >= candidate.target1 : bar.low <= candidate.target1;
    const hitT2 = isLong ? bar.high >= candidate.target2 : bar.low <= candidate.target2;

    if (!target1Hit && hitStop && (hitT1 || hitT2)) {
      return { replayOutcome: 'AMBIGUOUS', replayOutcomeTime: bar.time, oneMesGross: 0 };
    }
    if (hitT2) {
      return { replayOutcome: 'T2_HIT', replayOutcomeTime: bar.time, oneMesGross: roundCurrency(target2Profit) };
    }
    if (hitT1) target1Hit = true;
    if (hitStop) {
      return target1Hit
        ? { replayOutcome: 'T1_THEN_STOP', replayOutcomeTime: bar.time, oneMesGross: roundCurrency(target1Profit) }
        : { replayOutcome: 'STOP_HIT', replayOutcomeTime: bar.time, oneMesGross: roundCurrency(-stopRisk) };
    }
  }

  return target1Hit
    ? { replayOutcome: 'T1_HIT_OPEN_RUNNER', replayOutcomeTime: futureBars.find((bar) => isLong ? bar.high >= candidate.target1 : bar.low <= candidate.target1)?.time || null, oneMesGross: roundCurrency(target1Profit) }
    : { replayOutcome: 'FILLED_OPEN', replayOutcomeTime: null, oneMesGross: 0 };
}

function buildReplayRow(args: {
  validationRow: NoChaseMssTimestampAlignmentValidationReport['rows'][number];
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}): ReplayRow {
  const row = args.validationRow;
  const session = row.sessionType === 'lunch' ? 'lunch' : 'morning';
  const eventBars = args.bars['5m'].filter((bar) => inSession(bar, row.tradeDate, session));
  const probeBars = replayProbeBars(eventBars, row.entry);
  let firstHuman: { time: string; candidate: SetupCandidate } | null = null;
  let lastCandidate: SetupCandidate | null = null;
  for (const eventBar of probeBars) {
    const candidate = candidateAtEvent({
      bars: args.bars,
      date: row.tradeDate,
      session,
      asOf: eventBar.time,
      instrument: 'MES',
    });
    if (!candidate || candidate.direction !== row.direction) continue;
    lastCandidate = candidate;
    if (
      candidate.candidateState === 'HUMAN_REVIEW_READY' &&
      candidate.entry !== null &&
      candidate.stop !== null &&
      candidate.target1 !== null &&
      candidate.target2 !== null
    ) {
      firstHuman = { time: eventBar.time, candidate };
      break;
    }
  }
  const candidate = firstHuman?.candidate || lastCandidate;
  const outcome = replayOutcome({
    candidate: firstHuman?.candidate || null,
    eventTime: firstHuman?.time || null,
    bars5m: args.bars['5m'].filter((bar) => bar.time.slice(0, 10) === row.tradeDate),
  });
  return {
    caseId: row.caseId,
    tradeDate: row.tradeDate,
    sessionType: session,
    direction: row.direction,
    validationEntry: row.entry,
    validationRecoveredStop: row.recoveredStop,
    eventsScanned: probeBars.length,
    firstHumanReviewTime: firstHuman?.time || null,
    firstHumanReviewEntry: firstHuman?.candidate.entry ?? null,
    firstHumanReviewStop: firstHuman?.candidate.stop ?? null,
    firstHumanReviewTarget1: firstHuman?.candidate.target1 ?? null,
    firstHumanReviewTarget2: firstHuman?.candidate.target2 ?? null,
    canExecute: (firstHuman?.candidate.humanReview as { canExecute?: unknown } | undefined)?.canExecute === true,
    publishDiscordEligible: (firstHuman?.candidate.humanReview as { discordTradePlanEligible?: unknown } | undefined)?.discordTradePlanEligible === true,
    replayOutcome: outcome.replayOutcome,
    replayOutcomeTime: outcome.replayOutcomeTime,
    oneMesGross: outcome.oneMesGross,
    remainsBlockedReason: firstHuman
      ? null
      : row.entry === null
        ? 'entry still missing; full-window stop recovery alone must remain blocked'
        : candidate?.missingEvidence?.join(' | ') || candidate?.blockReason || 'no matching Intraday MSS candidate became human-review ready',
  };
}

function authority(): NoChaseIntradayFullWindowStopReplayReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: true,
    scannerRunMode: 'targeted_replay_only',
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

function buildMarkdown(report: Omit<NoChaseIntradayFullWindowStopReplayReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Full-Window Stop Replay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: targeted local replay only. It runs setupScanner from local OHLC and does not post Discord, write Supabase, read live bridge data, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Human-review rows: ${report.summary.humanReviewRows}.`,
    `- Still blocked rows: ${report.summary.stillBlockedRows}.`,
    `- Missing-entry rows still blocked: ${report.summary.missingEntryRowsStillBlocked}.`,
    `- canExecute=true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Discord-eligible rows: ${report.summary.publishDiscordEligibleRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- One-MES gross P/L: $${report.summary.oneMesGross.toFixed(2)}.`,
    '',
    '## Rows',
    '| Case | Scanned | First Human Review | Entry | Stop | T1 | T2 | Outcome | One MES Gross | Blocked Reason |',
    '|---|---:|---|---:|---:|---:|---:|---|---:|---|',
    ...report.rows.map((row) => `| ${markdownCell(row.caseId)} | ${row.eventsScanned} | ${row.firstHumanReviewTime || '-'} | ${row.firstHumanReviewEntry ?? '-'} | ${row.firstHumanReviewStop ?? '-'} | ${row.firstHumanReviewTarget1 ?? '-'} | ${row.firstHumanReviewTarget2 ?? '-'} | ${row.replayOutcome}${row.replayOutcomeTime ? ` @ ${row.replayOutcomeTime}` : ''} | $${row.oneMesGross.toFixed(2)} | ${markdownCell(row.remainsBlockedReason || '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayFullWindowStopReplayReport(args: {
  validationReportPath: string;
  marketBarsJson: string;
  validationReport: NoChaseMssTimestampAlignmentValidationReport;
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}, generatedAt = new Date().toISOString()): NoChaseIntradayFullWindowStopReplayReport {
  const rows = args.validationReport.rows.map((row) => buildReplayRow({ validationRow: row, bars: args.bars }));
  const humanReviewRows = rows.filter((row) => row.firstHumanReviewTime !== null).length;
  const blockers = [
    rows.length === 0 ? 'no validation rows available' : null,
    rows.some((row) => row.canExecute) ? 'one or more replay rows set canExecute true' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<NoChaseIntradayFullWindowStopReplayReport, 'markdown'> = {
    reportType: 'no_chase_intraday_full_window_stop_replay',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      validationReportPath: args.validationReportPath,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      rowsChecked: rows.length,
      humanReviewRows,
      stillBlockedRows: rows.filter((row) => row.firstHumanReviewTime === null).length,
      missingEntryRowsStillBlocked: rows.filter((row) => row.validationEntry === null && row.firstHumanReviewTime === null).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      publishDiscordEligibleRows: rows.filter((row) => row.publishDiscordEligible).length,
      livePromotionAllowedRows: 0,
      oneMesGross: roundCurrency(rows.reduce((sum, row) => sum + row.oneMesGross, 0)),
      recommendation: humanReviewRows > 0 ? 'fallback_helped_guarded_rows' : 'hold_and_inspect',
    },
    rows,
    blockers,
    recommendations: humanReviewRows > 0
      ? [
        'Use these targeted rows as the post-install impact proof for the full-window protected stop fallback.',
        'Keep the missing-entry case blocked; do not broaden full-window history into trigger/entry detection.',
        'Next narrow phase: compare outcome P/L for these newly review-ready rows against the original no-chase result.',
      ]
      : ['Hold the fallback and inspect why scanner replay did not recreate the saved proof rows.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayFullWindowStopReplayReport(
  report: NoChaseIntradayFullWindowStopReplayReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-full-window-stop-replay-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayFullWindowStopReplayCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayFullWindowStopReplayReport({
    validationReportPath: options.validationReport,
    marketBarsJson: options.marketBarsJson,
    validationReport: readJson<NoChaseMssTimestampAlignmentValidationReport>(options.validationReport),
    bars: loadBars(options.marketBarsJson),
  });
  const paths = writeNoChaseIntradayFullWindowStopReplayReport(report, options.outDir);
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
    runNoChaseIntradayFullWindowStopReplayCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
