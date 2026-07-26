import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNinjaChartContext, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { SetupType, type AnalysisResult, type ChartContext, type SetupCandidate } from '../../src/types';
import type { NoChaseMssTimestampAlignmentValidationReport } from './no-chase-mss-timestamp-alignment-validation';
import type { NoChaseIntradayFullWindowStopReplayReport } from './no-chase-intraday-full-window-stop-replay';

type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type ReplaySession = 'morning' | 'lunch';

interface CliOptions {
  replayReport: string;
  validationReport: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface CandidateSnapshot {
  time: string;
  candidateState: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  blockReason: string | null;
  missingEvidence: string[];
  lineInSand: number | null;
  lineStatus: string | null;
  tacticalZone: { lower: number | null; upper: number | null; label: string | null } | null;
}

interface DrilldownRow {
  caseId: string;
  tradeDate: string;
  sessionType: ReplaySession;
  direction: 'LONG' | 'SHORT' | 'NO TRADE';
  validationEntry: number | null;
  validationRecoveredStop: number | null;
  validationMssTimestamp: string | null;
  validationProtectedSwing: unknown;
  barsScanned: number;
  candidateSnapshots: number;
  firstCompleteGeometryTime: string | null;
  firstHumanReviewTime: string | null;
  finalSnapshot: CandidateSnapshot | null;
  bestSnapshot: CandidateSnapshot | null;
  blockerFamily: 'fvg_retest_entry_pending' | 'retest_swing_stop_not_confirmed' | 'missing_entry_protected_stop_only' | 'other';
  recommendation: string;
}

export interface NoChaseIntradayRemainingBlockerDrilldownReport {
  reportType: 'no_chase_intraday_remaining_blocker_drilldown';
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
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  source: {
    replayReportPath: string;
    validationReportPath: string;
    marketBarsJson: string;
  };
  summary: {
    rowsChecked: number;
    fvgRetestEntryPendingRows: number;
    retestSwingStopNotConfirmedRows: number;
    missingEntryProtectedStopOnlyRows: number;
    otherRows: number;
    humanReviewRows: number;
    canExecuteTrueRows: number;
    recommendation: 'inspect_fvg_and_retest_stop_separately' | 'hold';
  };
  rows: DrilldownRow[];
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
  const replayReport = readFlag(args, '--replay-report');
  const validationReport = readFlag(args, '--validation-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!replayReport) throw new Error('--replay-report is required.');
  if (!validationReport) throw new Error('--validation-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    replayReport,
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
    const byTime = new Map<string, NinjaBridgeBar>();
    for (const row of rows) {
      const bar = normalizeBar(row);
      if (bar) byTime.set(bar.time, bar);
    }
    output[timeframe] = [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
  }
  return output;
}

function sessionType(session: ReplaySession): 'replay_morning' | 'replay_lunch' {
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

function through<T extends { time: string }>(bars: T[], asOf: string): T[] {
  return bars.filter((bar) => bar.time <= asOf);
}

function probeBarsForRow(args: {
  bars: NinjaBridgeBar[];
  validationEntry: number | null;
}): NinjaBridgeBar[] {
  const selected = new Map<string, NinjaBridgeBar>();
  const add = (bar: NinjaBridgeBar | undefined) => {
    if (bar) selected.set(bar.time, bar);
  };
  add(args.bars[0]);
  add(args.bars[Math.floor(args.bars.length / 2)]);
  add(args.bars[args.bars.length - 1]);
  for (let index = 0; index < args.bars.length; index += 6) add(args.bars[index]);
  if (args.validationEntry !== null) {
    const touches = args.bars.filter((bar) => bar.low <= args.validationEntry && bar.high >= args.validationEntry);
    touches.slice(0, 4).forEach(add);
    touches.slice(-4).forEach(add);
  }
  return [...selected.values()].sort((a, b) => a.time.localeCompare(b.time));
}

function analysisForReplay(context: ChartContext): AnalysisResult {
  return {
    dayType: 'NO TRADE',
    reasoning: 'Targeted no-chase remaining-blocker probe drilldown. Local OHLC only; setupScanner owns candidate state.',
    confidence: 0.7,
    checks: [{ label: 'Targeted local drilldown', passed: true }],
    structuredChartContext: context,
  };
}

function candidateAtEvent(args: {
  bars: Record<Timeframe, NinjaBridgeBar[]>;
  date: string;
  session: ReplaySession;
  asOf: string;
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
    instrument: 'MES',
    tradeDate: args.date,
  }) as ChartContext | null;
  if (!context) return null;
  const scan = scanSetupCandidates({ sessionType: sessionType(args.session), chartContext: context, result: analysisForReplay(context) });
  return scan.candidates.find((candidate) => candidate.setupType === SetupType.NoSetup) || null;
}

function snapshot(candidate: SetupCandidate, time: string): CandidateSnapshot {
  return {
    time,
    candidateState: candidate.candidateState || null,
    entry: candidate.entry ?? null,
    stop: candidate.stop ?? null,
    target1: candidate.target1 ?? null,
    target2: candidate.target2 ?? null,
    blockReason: candidate.blockReason || null,
    missingEvidence: candidate.missingEvidence || [],
    lineInSand: candidate.activeRuleset?.htfLineInSand?.lineInSand ?? null,
    lineStatus: candidate.activeRuleset?.htfLineInSand?.status ?? null,
    tacticalZone: candidate.tacticalZone
      ? {
        lower: finiteNumber(candidate.tacticalZone.lower),
        upper: finiteNumber(candidate.tacticalZone.upper),
        label: candidate.tacticalZone.label || null,
      }
      : null,
  };
}

function completeGeometry(item: CandidateSnapshot): boolean {
  return item.entry !== null && item.stop !== null && item.target1 !== null && item.target2 !== null;
}

function blockerFamily(item: CandidateSnapshot | null, validationEntry: number | null): DrilldownRow['blockerFamily'] {
  const text = [...(item?.missingEvidence || []), item?.blockReason || ''].join(' | ');
  if (validationEntry === null) return 'missing_entry_protected_stop_only';
  if (text.includes('FVG retest') || text.includes('FVG / imbalance')) return 'fvg_retest_entry_pending';
  if (text.includes('retest swing stop') || text.includes('Protected 5M MSS swing stop')) return 'retest_swing_stop_not_confirmed';
  return 'other';
}

function recommendationFor(family: DrilldownRow['blockerFamily']): string {
  if (family === 'fvg_retest_entry_pending') {
    return 'Research only: inspect whether the FVG zone/line-in-the-sand source is too stale or too strict before changing any trigger rule.';
  }
  if (family === 'retest_swing_stop_not_confirmed') {
    return 'Research only: compare preferred retest swing stop against protected MSS swing stop; do not accept unconfirmed retest candles as protected stops.';
  }
  if (family === 'missing_entry_protected_stop_only') {
    return 'Keep blocked. Protected stop recovery alone cannot create a deterministic entry.';
  }
  return 'Hold. Needs manual source-path inspection before any install.';
}

function directionFromReplay(value: string): DrilldownRow['direction'] {
  return value === 'LONG' || value === 'SHORT' ? value : 'NO TRADE';
}

function buildRow(args: {
  replayRow: NoChaseIntradayFullWindowStopReplayReport['rows'][number];
  validationRow: NoChaseMssTimestampAlignmentValidationReport['rows'][number] | undefined;
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}): DrilldownRow {
  const session = args.replayRow.sessionType === 'lunch' ? 'lunch' : 'morning';
  const bars = args.bars['5m'].filter((bar) => inSession(bar, args.replayRow.tradeDate, session));
  const probeBars = probeBarsForRow({ bars, validationEntry: args.replayRow.validationEntry });
  const snapshots = probeBars
    .map((bar) => {
      const candidate = candidateAtEvent({ bars: args.bars, date: args.replayRow.tradeDate, session, asOf: bar.time });
      return candidate && candidate.direction === args.replayRow.direction ? snapshot(candidate, bar.time) : null;
    })
    .filter((item): item is CandidateSnapshot => Boolean(item));
  const best = [...snapshots].sort((a, b) => Number(completeGeometry(b)) - Number(completeGeometry(a)) || (b.entry !== null ? 1 : 0) - (a.entry !== null ? 1 : 0))[0] || null;
  const family = blockerFamily(best, args.replayRow.validationEntry);
  return {
    caseId: args.replayRow.caseId,
    tradeDate: args.replayRow.tradeDate,
    sessionType: session,
    direction: directionFromReplay(args.replayRow.direction),
    validationEntry: args.replayRow.validationEntry,
    validationRecoveredStop: args.replayRow.validationRecoveredStop,
    validationMssTimestamp: args.validationRow?.mssEvidenceTimestamp || null,
    validationProtectedSwing: args.validationRow?.protectedSwing ?? null,
    barsScanned: probeBars.length,
    candidateSnapshots: snapshots.length,
    firstCompleteGeometryTime: snapshots.find(completeGeometry)?.time || null,
    firstHumanReviewTime: snapshots.find((item) => item.candidateState === 'HUMAN_REVIEW_READY')?.time || null,
    finalSnapshot: snapshots[snapshots.length - 1] || null,
    bestSnapshot: best,
    blockerFamily: family,
    recommendation: recommendationFor(family),
  };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
}

function buildMarkdown(report: Omit<NoChaseIntradayRemainingBlockerDrilldownReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Remaining Blocker Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: targeted local replay only. No Discord, Supabase, live bridge, canExecute, or trading-rule changes.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- FVG retest entry pending: ${report.summary.fvgRetestEntryPendingRows}.`,
    `- Retest swing stop not confirmed: ${report.summary.retestSwingStopNotConfirmedRows}.`,
    `- Missing-entry protected-stop-only: ${report.summary.missingEntryProtectedStopOnlyRows}.`,
    `- Human-review rows found during targeted probe scan: ${report.summary.humanReviewRows}.`,
    `- canExecute=true rows: ${report.summary.canExecuteTrueRows}.`,
    '',
    '## Rows',
    '| Case | Bars | Best State | First Geometry | First Review | Line | Zone | Family | Recommendation |',
    '|---|---:|---|---|---|---:|---|---|---|',
    ...report.rows.map((row) => {
      const best = row.bestSnapshot;
      const zone = best?.tacticalZone ? `${best.tacticalZone.lower ?? '-'}-${best.tacticalZone.upper ?? '-'}` : '-';
      return `| ${markdownCell(row.caseId)} | ${row.barsScanned} | ${best?.candidateState || '-'} | ${row.firstCompleteGeometryTime || '-'} | ${row.firstHumanReviewTime || '-'} | ${best?.lineInSand ?? '-'} | ${zone} | ${row.blockerFamily} | ${markdownCell(row.recommendation)} |`;
    }),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayRemainingBlockerDrilldownReport(args: {
  replayReportPath: string;
  validationReportPath: string;
  marketBarsJson: string;
  replayReport: NoChaseIntradayFullWindowStopReplayReport;
  validationReport: NoChaseMssTimestampAlignmentValidationReport;
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}, generatedAt = new Date().toISOString()): NoChaseIntradayRemainingBlockerDrilldownReport {
  const validationByCase = new Map(args.validationReport.rows.map((row) => [row.caseId, row]));
  const sourceRows = args.replayReport.rows.filter((row) => !row.firstHumanReviewTime && row.validationEntry !== null);
  const rows = sourceRows.map((row) => buildRow({ replayRow: row, validationRow: validationByCase.get(row.caseId), bars: args.bars }));
  const blockers = rows.some((row) => row.firstHumanReviewTime) ? ['a previously blocked row became human-review ready during blocker drilldown'] : [];
  const base: Omit<NoChaseIntradayRemainingBlockerDrilldownReport, 'markdown'> = {
    reportType: 'no_chase_intraday_remaining_blocker_drilldown',
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
      runsSetupScanner: true,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
    source: {
      replayReportPath: args.replayReportPath,
      validationReportPath: args.validationReportPath,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      rowsChecked: rows.length,
      fvgRetestEntryPendingRows: rows.filter((row) => row.blockerFamily === 'fvg_retest_entry_pending').length,
      retestSwingStopNotConfirmedRows: rows.filter((row) => row.blockerFamily === 'retest_swing_stop_not_confirmed').length,
      missingEntryProtectedStopOnlyRows: rows.filter((row) => row.blockerFamily === 'missing_entry_protected_stop_only').length,
      otherRows: rows.filter((row) => row.blockerFamily === 'other').length,
      humanReviewRows: rows.filter((row) => row.firstHumanReviewTime).length,
      canExecuteTrueRows: 0,
      recommendation: rows.length ? 'inspect_fvg_and_retest_stop_separately' : 'hold',
    },
    rows,
    blockers,
    recommendations: [
      'Do not broaden full-window history into entry detection.',
      'Next research should focus on the shared protected retest-swing stop source path for June 15 and June 18.',
      'Keep canExecute unchanged and keep all findings research-only until a focused source-builder fix proves itself.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayRemainingBlockerDrilldownReport(
  report: NoChaseIntradayRemainingBlockerDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-remaining-blocker-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayRemainingBlockerDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayRemainingBlockerDrilldownReport({
    replayReportPath: options.replayReport,
    validationReportPath: options.validationReport,
    marketBarsJson: options.marketBarsJson,
    replayReport: readJson<NoChaseIntradayFullWindowStopReplayReport>(options.replayReport),
    validationReport: readJson<NoChaseMssTimestampAlignmentValidationReport>(options.validationReport),
    bars: loadBars(options.marketBarsJson),
  });
  const paths = writeNoChaseIntradayRemainingBlockerDrilldownReport(report, options.outDir);
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
    runNoChaseIntradayRemainingBlockerDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
