import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { targetsFromEntryStop, TRADE_RULES, roundToTradeTick, stopOffsetPoints } from '../../src/config/tradeRules';
import type { NoChaseOhlcProofCase, NoChaseOhlcProofExtractorReport } from './no-chase-ohlc-proof-extractor';

type ReplayOutcome = 'T2_HIT' | 'T1_THEN_STOP' | 'T1_HIT_OPEN_RUNNER' | 'STOP_HIT' | 'NO_FILL' | 'FILLED_OPEN' | 'AMBIGUOUS' | 'NOT_REPLAYED';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CliOptions {
  proofReport: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface ProposedGeometry {
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  entrySource: 'existing_artifact_entry' | 'proof_bar_close' | 'missing';
  stopSource: 'existing_artifact_stop' | 'protected_5m_window_extreme_plus_offset' | 'missing';
  geometryStatus: 'research_geometry_complete' | 'blocked';
  blockers: string[];
}

export interface NoChaseProtectedGeometryMinerReport {
  reportType: 'no_chase_protected_geometry_miner';
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
  };
  source: {
    proofReportPath: string;
    marketBarsJson: string;
  };
  summary: {
    missingPlanRows: number;
    geometryCompleteRows: number;
    geometryBlockedRows: number;
    maxRiskPassRows: number;
    maxRiskBlockedRows: number;
    replayedRows: number;
    replayWins: number;
    replayLosses: number;
    replayNoFill: number;
    replayFilledOpen: number;
    replayAmbiguous: number;
    replayGrossOneMes: number;
    canExecuteChangedRows: 0;
    publishDiscordRows: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'research_validate_geometry_filter' | 'do_not_use_geometry';
  };
  rows: Array<{
    caseId: string;
    tradeDate: string;
    sessionType: string;
    setupType: string;
    direction: 'LONG' | 'SHORT';
    firstNoChaseTime: string | null;
    proofBarTime: string | null;
    protectedWindowBars: number;
    proposedGeometry: ProposedGeometry;
    replayOutcome: ReplayOutcome;
    replayFillTime: string | null;
    replayOutcomeTime: string | null;
    replayOneMesGross: number;
    canExecute: false;
    publishDiscord: false;
    livePromotionAllowed: false;
    recommendation: string;
  }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const MES_DOLLARS_PER_POINT = 5;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseProtectedGeometryMinerArgs(args = process.argv.slice(2)): CliOptions {
  const proofReport = readFlag(args, '--proof-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!proofReport) throw new Error('--proof-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    proofReport,
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

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  const volume = finiteNumber(record.volume);
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
}

function timeMs(value: string | null | undefined): number {
  const normalized = normalizeTime(value);
  if (!normalized) return 0;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uniqueSortedBars(bars: OhlcBar[]): OhlcBar[] {
  const byTime = new Map<string, OhlcBar>();
  for (const bar of bars) byTime.set(bar.time, bar);
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function loadLocalMarketBars5m(marketBarsJson: string | null): OhlcBar[] {
  if (!marketBarsJson || !fs.existsSync(marketBarsJson)) return [];
  const raw = JSON.parse(fs.readFileSync(marketBarsJson, 'utf8')) as unknown;
  const root = asRecord(raw);
  const grouped = asRecord(root.bars || root.timeframes || root);
  const rows = Array.isArray(grouped['5m'])
    ? grouped['5m'] as unknown[]
    : Array.isArray(raw)
      ? raw.filter((row) => asRecord(row).timeframe === '5m')
      : [];
  return uniqueSortedBars(rows.map(normalizeBar).filter((bar): bar is OhlcBar => Boolean(bar)));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function authority(): NoChaseProtectedGeometryMinerReport['authority'] {
  return {
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
  };
}

function protectedWindowBars(row: NoChaseOhlcProofCase, bars: OhlcBar[]): OhlcBar[] {
  const start = timeMs(row.firstNoChaseTime) || timeMs(row.proofBarTime);
  const end = timeMs(row.proofBarTime);
  if (!start || !end) return [];
  return bars.filter((bar) => {
    const current = timeMs(bar.time);
    return current >= start && current <= end && bar.time.slice(0, 10) === row.tradeDate;
  });
}

function proposedGeometryFor(row: NoChaseOhlcProofCase, windowBars: OhlcBar[]): ProposedGeometry {
  const proofBar = normalizeBar(row.proofBar);
  const entry = Number.isFinite(row.entry)
    ? row.entry
    : proofBar
      ? roundToTradeTick(proofBar.close)
      : null;
  const entrySource = Number.isFinite(row.entry)
    ? 'existing_artifact_entry'
    : entry !== null
      ? 'proof_bar_close'
      : 'missing';
  let stop: number | null = Number.isFinite(row.stop) ? row.stop : null;
  let stopSource: ProposedGeometry['stopSource'] = stop !== null ? 'existing_artifact_stop' : 'missing';
  if (stop === null && windowBars.length) {
    const offset = stopOffsetPoints();
    stop = row.direction === 'LONG'
      ? roundToTradeTick(Math.min(...windowBars.map((bar) => bar.low)) - offset)
      : roundToTradeTick(Math.max(...windowBars.map((bar) => bar.high)) + offset);
    stopSource = 'protected_5m_window_extreme_plus_offset';
  }
  const targets = targetsFromEntryStop(row.direction, entry, stop);
  const blockers = [
    entry === null ? 'missing entry' : null,
    stop === null ? 'missing stop' : null,
    targets.target1 === null || targets.target2 === null || targets.riskPoints === null ? 'invalid target geometry' : null,
    targets.riskPoints !== null && targets.riskPoints > TRADE_RULES.maxRiskPoints ? `risk ${targets.riskPoints} exceeds max ${TRADE_RULES.maxRiskPoints}` : null,
  ].filter((item): item is string => Boolean(item));
  return {
    entry,
    stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    entrySource,
    stopSource,
    geometryStatus: blockers.length ? 'blocked' : 'research_geometry_complete',
    blockers,
  };
}

function replayOutcome(args: {
  row: NoChaseOhlcProofCase;
  geometry: ProposedGeometry;
  bars: OhlcBar[];
}): Pick<NoChaseProtectedGeometryMinerReport['rows'][number], 'replayOutcome' | 'replayFillTime' | 'replayOutcomeTime' | 'replayOneMesGross'> {
  const entry = args.geometry.entry;
  const stop = args.geometry.stop;
  const target1 = args.geometry.target1;
  const target2 = args.geometry.target2;
  if (args.geometry.geometryStatus !== 'research_geometry_complete' || entry === null || stop === null || target1 === null || target2 === null || !args.row.proofBarTime) {
    return { replayOutcome: 'NOT_REPLAYED', replayFillTime: null, replayOutcomeTime: null, replayOneMesGross: 0 };
  }
  const startIndex = args.bars.findIndex((bar) => bar.time === args.row.proofBarTime);
  const futureBars = args.bars.slice(Math.max(0, startIndex + 1)).filter((bar) => bar.time.slice(0, 10) === args.row.tradeDate);
  const proofClose = normalizeBar(args.row.proofBar)?.close ?? null;
  let filled = proofClose !== null && Math.abs(proofClose - entry) <= TRADE_RULES.targetModel.tickSize;
  let fillTime = filled ? args.row.proofBarTime : null;
  let t1Hit = false;
  let t1Time: string | null = null;
  for (const bar of futureBars) {
    if (!filled) {
      if (bar.low <= entry && bar.high >= entry) {
        filled = true;
        fillTime = bar.time;
      } else {
        continue;
      }
    }
    const stopHit = args.row.direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
    const t1Touched = args.row.direction === 'LONG' ? bar.high >= target1 : bar.low <= target1;
    const t2Touched = args.row.direction === 'LONG' ? bar.high >= target2 : bar.low <= target2;
    if (stopHit && (t1Touched || t2Touched)) {
      return { replayOutcome: 'AMBIGUOUS', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayOneMesGross: 0 };
    }
    if (t2Touched) {
      return { replayOutcome: 'T2_HIT', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayOneMesGross: roundCurrency(Math.abs(target2 - entry) * MES_DOLLARS_PER_POINT) };
    }
    if (t1Touched) {
      t1Hit = true;
      t1Time = t1Time || bar.time;
    }
    if (stopHit) {
      if (t1Hit) return { replayOutcome: 'T1_THEN_STOP', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayOneMesGross: roundCurrency(Math.abs(target1 - entry) * MES_DOLLARS_PER_POINT) };
      return { replayOutcome: 'STOP_HIT', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayOneMesGross: roundCurrency(-Math.abs(entry - stop) * MES_DOLLARS_PER_POINT) };
    }
  }
  if (t1Hit) return { replayOutcome: 'T1_HIT_OPEN_RUNNER', replayFillTime: fillTime, replayOutcomeTime: t1Time, replayOneMesGross: roundCurrency(Math.abs(target1 - entry) * MES_DOLLARS_PER_POINT) };
  return filled
    ? { replayOutcome: 'FILLED_OPEN', replayFillTime: fillTime, replayOutcomeTime: null, replayOneMesGross: 0 }
    : { replayOutcome: 'NO_FILL', replayFillTime: null, replayOutcomeTime: null, replayOneMesGross: 0 };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<NoChaseProtectedGeometryMinerReport, 'markdown'>): string {
  return [
    '# No-Chase Protected Geometry Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report research only. Proposed geometry is not a ticket, not scanner-visible, and cannot change canExecute, Discord, Supabase, bridge behavior, risk rules, or trading logic.',
    '',
    '## Summary',
    `- Missing-plan rows: ${report.summary.missingPlanRows}.`,
    `- Geometry complete/blocked: ${report.summary.geometryCompleteRows}/${report.summary.geometryBlockedRows}.`,
    `- Max-risk pass/blocked: ${report.summary.maxRiskPassRows}/${report.summary.maxRiskBlockedRows}.`,
    `- Replay wins/losses/no-fill/filled-open/ambiguous: ${report.summary.replayWins}/${report.summary.replayLosses}/${report.summary.replayNoFill}/${report.summary.replayFilledOpen}/${report.summary.replayAmbiguous}.`,
    `- Replay gross one-MES P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Discord publish rows: ${report.summary.publishDiscordRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Case | Entry | Stop | T1 | T2 | Risk | Geometry | Outcome | P/L | Blockers |',
    '|---|---:|---:|---:|---:|---:|---|---|---:|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.caseId)} | ${row.proposedGeometry.entry ?? '-'} | ${row.proposedGeometry.stop ?? '-'} | ${row.proposedGeometry.target1 ?? '-'} | ${row.proposedGeometry.target2 ?? '-'} | ${row.proposedGeometry.riskPoints ?? '-'} | ${row.proposedGeometry.geometryStatus} | ${row.replayOutcome} | $${row.replayOneMesGross.toFixed(2)} | ${escapeTable(row.proposedGeometry.blockers.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseProtectedGeometryMinerReport(args: {
  proofReportPath: string;
  marketBarsJson: string;
  proofReport: NoChaseOhlcProofExtractorReport | null;
  bars: OhlcBar[];
}, generatedAt = new Date().toISOString()): NoChaseProtectedGeometryMinerReport {
  const sourceRows = (args.proofReport?.cases || [])
    .filter((row) => row.reviewClassification === 'proof_only_missing_plan_fields');
  const rows = sourceRows.map((row) => {
    const windowBars = protectedWindowBars(row, args.bars);
    const geometry = proposedGeometryFor(row, windowBars);
    const replay = replayOutcome({ row, geometry, bars: args.bars });
    const positiveReplay = replay.replayOutcome === 'T2_HIT' || replay.replayOutcome === 'T1_THEN_STOP' || replay.replayOutcome === 'T1_HIT_OPEN_RUNNER';
    return {
      caseId: row.caseId,
      tradeDate: row.tradeDate,
      sessionType: row.sessionType,
      setupType: row.setupType,
      direction: row.direction,
      firstNoChaseTime: row.firstNoChaseTime,
      proofBarTime: row.proofBarTime,
      protectedWindowBars: windowBars.length,
      proposedGeometry: geometry,
      ...replay,
      canExecute: false as const,
      publishDiscord: false as const,
      livePromotionAllowed: false as const,
      recommendation: positiveReplay
        ? 'Research-positive geometry. Validate with a separate no-lookahead filter before any proposal.'
        : 'Do not promote. Use as geometry/filter evidence only.',
    };
  });
  const blockers = [
    !args.proofReport ? 'missing no-chase OHLC proof report' : null,
    !args.bars.length ? 'missing 5M market bars' : null,
    args.proofReport && args.proofReport.summary.proofOnlyMissingPlanFields !== sourceRows.length ? 'proof report missing-plan summary does not match rows' : null,
    rows.some((row) => row.canExecute !== false) ? 'one or more rows changed canExecute' : null,
    rows.some((row) => row.publishDiscord !== false) ? 'one or more rows enabled Discord publishing' : null,
    rows.some((row) => row.livePromotionAllowed !== false) ? 'one or more rows allowed live promotion' : null,
  ].filter((item): item is string => Boolean(item));
  const replayWins = rows.filter((row) => row.replayOutcome === 'T2_HIT' || row.replayOutcome === 'T1_THEN_STOP' || row.replayOutcome === 'T1_HIT_OPEN_RUNNER').length;
  const base: Omit<NoChaseProtectedGeometryMinerReport, 'markdown'> = {
    reportType: 'no_chase_protected_geometry_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      proofReportPath: args.proofReportPath,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      missingPlanRows: rows.length,
      geometryCompleteRows: rows.filter((row) => row.proposedGeometry.geometryStatus === 'research_geometry_complete').length,
      geometryBlockedRows: rows.filter((row) => row.proposedGeometry.geometryStatus === 'blocked').length,
      maxRiskPassRows: rows.filter((row) => row.proposedGeometry.geometryStatus === 'research_geometry_complete').length,
      maxRiskBlockedRows: rows.filter((row) => row.proposedGeometry.blockers.some((blocker) => blocker.includes('exceeds max'))).length,
      replayedRows: rows.filter((row) => row.replayOutcome !== 'NOT_REPLAYED').length,
      replayWins,
      replayLosses: rows.filter((row) => row.replayOutcome === 'STOP_HIT').length,
      replayNoFill: rows.filter((row) => row.replayOutcome === 'NO_FILL').length,
      replayFilledOpen: rows.filter((row) => row.replayOutcome === 'FILLED_OPEN').length,
      replayAmbiguous: rows.filter((row) => row.replayOutcome === 'AMBIGUOUS').length,
      replayGrossOneMes: roundCurrency(rows.reduce((sum, row) => sum + row.replayOneMesGross, 0)),
      canExecuteChangedRows: 0,
      publishDiscordRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: replayWins > 0 ? 'research_validate_geometry_filter' : 'do_not_use_geometry',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix proof-report or 5M market-bars inputs before using protected geometry mining.']
      : [
        'Keep every proposed geometry row research-only; do not create tickets from this miner.',
        'Use positive rows only to design a separate no-lookahead validation filter.',
        'Do not change canExecute, Discord posting, Supabase persistence, scanner visibility, or live trading logic.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseProtectedGeometryMinerReport(
  report: NoChaseProtectedGeometryMinerReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-protected-geometry-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseProtectedGeometryMinerCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseProtectedGeometryMinerArgs(args);
  const report = buildNoChaseProtectedGeometryMinerReport({
    proofReportPath: options.proofReport,
    marketBarsJson: options.marketBarsJson,
    proofReport: fs.existsSync(options.proofReport) ? readJson(options.proofReport) : null,
    bars: loadLocalMarketBars5m(options.marketBarsJson),
  });
  const paths = writeNoChaseProtectedGeometryMinerReport(report, options.outDir);
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
    runNoChaseProtectedGeometryMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
