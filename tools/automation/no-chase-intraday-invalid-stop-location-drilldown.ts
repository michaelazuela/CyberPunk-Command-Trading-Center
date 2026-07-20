import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import type { NoChaseIntradayBlockerDispositionRollupReport } from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseProtectedGeometryOmissionDiagnosticReport } from './no-chase-protected-geometry-omission-diagnostic';

type Direction = 'LONG' | 'SHORT';
type ReplaySession = 'morning' | 'lunch';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface CliOptions {
  dispositionRollup: string;
  omissionReport: string;
  auditDir: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface SnapshotFields {
  snapshotId: string;
  firstNoChaseTime: string;
  proofBarTime: string | null;
  entry: number | null;
  stop: number | null;
  decisionLevel: number | null;
  lineStatus: string | null;
  zoneLower: number | null;
  zoneUpper: number | null;
  candidateState: string | null;
  blockReason: string | null;
  missingEvidence: string[];
}

interface DrilldownRow {
  caseId: string;
  tradeDate: string;
  sessionType: ReplaySession;
  direction: Direction;
  snapshot: SnapshotFields | null;
  sessionBars: number;
  closeAtNoChase: number | null;
  closeAtProof: number | null;
  latestSessionClose: number | null;
  stopWrongSideOfZone: boolean;
  stopAlreadyTradedThroughAtNoChase: boolean;
  stopAlreadyTradedThroughAtProof: boolean;
  lineStillBlockedAtSnapshot: boolean;
  laterLineReclaimFound: boolean;
  disposition: 'no_source_snapshot' | 'missing_stop' | 'confirmed_stale_invalidated_stop' | 'needs_manual_review';
  recommendation: string;
}

export interface NoChaseIntradayInvalidStopLocationDrilldownReport {
  reportType: 'no_chase_intraday_invalid_stop_location_drilldown';
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
  };
  source: {
    dispositionRollupPath: string;
    omissionReportPath: string;
    auditDir: string;
    marketBarsJson: string;
  };
  summary: {
    rowsChecked: number;
    confirmedStaleInvalidatedStopRows: number;
    noSourceSnapshotRows: number;
    missingStopRows: number;
    manualReviewRows: number;
    stopWrongSideOfZoneRows: number;
    stopAlreadyTradedThroughRows: number;
    lineBlockedRows: number;
    canExecuteTrueRows: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_invalid_stop_rows_blocked' | 'fix_inputs' | 'manual_review';
  };
  rows: DrilldownRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const dispositionRollup = readFlag(args, '--disposition-rollup');
  const omissionReport = readFlag(args, '--omission-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!dispositionRollup) throw new Error('--disposition-rollup is required.');
  if (!omissionReport) throw new Error('--omission-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    dispositionRollup,
    omissionReport,
    marketBarsJson,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
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

function inSession(bar: NinjaBridgeBar, date: string, session: ReplaySession): boolean {
  if (bar.time.slice(0, 10) !== date) return false;
  const minute = minutes(bar.time);
  if (minute === null) return false;
  if (session === 'morning') return minute >= 9 * 60 + 15 && minute < 12 * 60;
  return minute >= 12 * 60 && minute < 16 * 60;
}

function directionFrom(value: string): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function closeAtOrBefore(bars: NinjaBridgeBar[], time: string | null): number | null {
  if (!time) return null;
  return [...bars].filter((bar) => bar.time <= time).at(-1)?.close ?? null;
}

function lineReclaimAfter(args: { bars: NinjaBridgeBar[]; direction: Direction; line: number | null; time: string | null }): boolean {
  if (args.line === null || !args.time) return false;
  return args.bars.some((bar) => bar.time > args.time && (args.direction === 'LONG' ? bar.close > args.line : bar.close < args.line));
}

function sourceSnapshot(args: {
  row: NoChaseProtectedGeometryOmissionDiagnosticReport['rows'][number];
  auditDir: string;
}): SnapshotFields | null {
  const file = path.join(args.auditDir, `${args.row.firstNoChaseSnapshotId}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = readJson<unknown>(file);
  const candidates = asRecord(asRecord(raw).normalizedPlan).setupCandidates;
  const source = Array.isArray(candidates)
    ? candidates.map(asRecord).find((candidate) => candidate.setupType === args.row.setupType && candidate.direction === args.row.direction)
    : null;
  const activeRuleset = asRecord(source?.activeRuleset);
  const lineRule = asRecord(activeRuleset.htfLineInSand);
  const zone = asRecord(source?.tacticalZone);
  return {
    snapshotId: args.row.firstNoChaseSnapshotId,
    firstNoChaseTime: normalizeTime(args.row.firstNoChaseTime) || args.row.firstNoChaseTime,
    proofBarTime: normalizeTime(args.row.proofBarTime),
    entry: finiteNumber(source?.entry ?? asRecord(args.row.sourceFields).entry),
    stop: finiteNumber(source?.stop ?? asRecord(args.row.sourceFields).stop),
    decisionLevel: finiteNumber(lineRule.lineInSand),
    lineStatus: typeof lineRule.status === 'string' ? lineRule.status : null,
    zoneLower: finiteNumber(zone.lower),
    zoneUpper: finiteNumber(zone.upper),
    candidateState: typeof source?.candidateState === 'string' ? source.candidateState : null,
    blockReason: typeof source?.blockReason === 'string' ? source.blockReason : null,
    missingEvidence: Array.isArray(source?.missingEvidence) ? source.missingEvidence.filter((item): item is string => typeof item === 'string') : [],
  };
}

function stopWrongSideOfZone(direction: Direction, snapshot: SnapshotFields | null): boolean {
  if (!snapshot || snapshot.stop === null || snapshot.zoneLower === null || snapshot.zoneUpper === null) return false;
  return direction === 'LONG'
    ? snapshot.stop >= snapshot.zoneLower
    : snapshot.stop <= snapshot.zoneUpper;
}

function tradedThrough(direction: Direction, stop: number | null, close: number | null): boolean {
  if (stop === null || close === null) return false;
  return direction === 'LONG' ? close <= stop : close >= stop;
}

function rowRecommendation(row: DrilldownRow): string {
  if (row.disposition === 'confirmed_stale_invalidated_stop') {
    return 'Keep blocked. The saved stop is stale/invalidated and cannot be reused to create an entry or ticket.';
  }
  if (row.disposition === 'missing_stop') return 'Keep blocked; no deterministic stop is available.';
  if (row.disposition === 'no_source_snapshot') return 'Fix saved snapshot coverage before researching this row.';
  return 'Manual review only; do not install scanner-visible behavior from this row.';
}

function buildRow(args: {
  dispositionRow: NoChaseIntradayBlockerDispositionRollupReport['rows'][number];
  omissionRow: NoChaseProtectedGeometryOmissionDiagnosticReport['rows'][number] | undefined;
  auditDir: string;
  bars5m: NinjaBridgeBar[];
}): DrilldownRow {
  const direction = directionFrom(args.dispositionRow.direction) || 'LONG';
  const sessionType = args.dispositionRow.sessionType === 'morning' ? 'morning' : 'lunch';
  const sessionBars = args.bars5m.filter((bar) => inSession(bar, args.dispositionRow.tradeDate, sessionType));
  const snapshot = args.omissionRow ? sourceSnapshot({ row: args.omissionRow, auditDir: args.auditDir }) : null;
  const closeAtNoChase = closeAtOrBefore(sessionBars, snapshot?.firstNoChaseTime || null);
  const closeAtProof = closeAtOrBefore(sessionBars, snapshot?.proofBarTime || null);
  const latestSessionClose = sessionBars.at(-1)?.close ?? null;
  const wrongSide = stopWrongSideOfZone(direction, snapshot);
  const throughAtNoChase = tradedThrough(direction, snapshot?.stop ?? null, closeAtNoChase);
  const throughAtProof = tradedThrough(direction, snapshot?.stop ?? null, closeAtProof);
  const lineBlocked = snapshot?.lineStatus === 'blocked';
  let disposition: DrilldownRow['disposition'] = 'needs_manual_review';
  if (!snapshot) disposition = 'no_source_snapshot';
  else if (snapshot.stop === null) disposition = 'missing_stop';
  else if (wrongSide || throughAtNoChase || throughAtProof) disposition = 'confirmed_stale_invalidated_stop';
  const row: DrilldownRow = {
    caseId: args.dispositionRow.caseId,
    tradeDate: args.dispositionRow.tradeDate,
    sessionType,
    direction,
    snapshot,
    sessionBars: sessionBars.length,
    closeAtNoChase,
    closeAtProof,
    latestSessionClose,
    stopWrongSideOfZone: wrongSide,
    stopAlreadyTradedThroughAtNoChase: throughAtNoChase,
    stopAlreadyTradedThroughAtProof: throughAtProof,
    lineStillBlockedAtSnapshot: lineBlocked,
    laterLineReclaimFound: lineReclaimAfter({ bars: sessionBars, direction, line: snapshot?.decisionLevel ?? null, time: snapshot?.firstNoChaseTime || null }),
    disposition,
    recommendation: '',
  };
  return { ...row, recommendation: rowRecommendation(row) };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
}

function buildMarkdown(report: Omit<NoChaseIntradayInvalidStopLocationDrilldownReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Invalid Stop Location Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved report/OHLC research only. No scanner behavior, Discord, Supabase, live bridge, canExecute, or trading-rule changes.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Confirmed stale invalidated stop rows: ${report.summary.confirmedStaleInvalidatedStopRows}.`,
    `- Stop wrong side of zone rows: ${report.summary.stopWrongSideOfZoneRows}.`,
    `- Stop already traded through rows: ${report.summary.stopAlreadyTradedThroughRows}.`,
    `- Line blocked rows: ${report.summary.lineBlockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Case | Stop | Zone | No-Chase Close | Proof Close | Wrong Side | Traded Through | Disposition |',
    '|---|---:|---|---:|---:|---|---|---|',
    ...report.rows.map((row) => `| ${markdownCell(row.caseId)} | ${row.snapshot?.stop ?? '-'} | ${row.snapshot?.zoneLower ?? '-'}-${row.snapshot?.zoneUpper ?? '-'} | ${row.closeAtNoChase ?? '-'} | ${row.closeAtProof ?? '-'} | ${row.stopWrongSideOfZone} | ${row.stopAlreadyTradedThroughAtNoChase || row.stopAlreadyTradedThroughAtProof} | ${row.disposition} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayInvalidStopLocationDrilldownReport(args: {
  dispositionRollupPath: string;
  omissionReportPath: string;
  auditDir: string;
  marketBarsJson: string;
  dispositionRollup: NoChaseIntradayBlockerDispositionRollupReport;
  omissionReport: NoChaseProtectedGeometryOmissionDiagnosticReport;
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}, generatedAt = new Date().toISOString()): NoChaseIntradayInvalidStopLocationDrilldownReport {
  const omissionByCase = new Map(args.omissionReport.rows.map((row) => [row.caseId, row]));
  const sourceRows = args.dispositionRollup.rows.filter((row) => row.disposition === 'needs_invalid_stop_location_research');
  const rows = sourceRows.map((row) => buildRow({ dispositionRow: row, omissionRow: omissionByCase.get(row.caseId), auditDir: args.auditDir, bars5m: args.bars['5m'] }));
  const blockers = [
    rows.some((row) => row.disposition === 'no_source_snapshot') ? 'one or more invalid-stop rows could not load the source snapshot' : null,
  ].filter((item): item is string => Boolean(item));
  const manual = rows.filter((row) => row.disposition === 'needs_manual_review').length;
  const base: Omit<NoChaseIntradayInvalidStopLocationDrilldownReport, 'markdown'> = {
    reportType: 'no_chase_intraday_invalid_stop_location_drilldown',
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
      runsSetupScanner: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
    source: {
      dispositionRollupPath: args.dispositionRollupPath,
      omissionReportPath: args.omissionReportPath,
      auditDir: args.auditDir,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      rowsChecked: rows.length,
      confirmedStaleInvalidatedStopRows: rows.filter((row) => row.disposition === 'confirmed_stale_invalidated_stop').length,
      noSourceSnapshotRows: rows.filter((row) => row.disposition === 'no_source_snapshot').length,
      missingStopRows: rows.filter((row) => row.disposition === 'missing_stop').length,
      manualReviewRows: manual,
      stopWrongSideOfZoneRows: rows.filter((row) => row.stopWrongSideOfZone).length,
      stopAlreadyTradedThroughRows: rows.filter((row) => row.stopAlreadyTradedThroughAtNoChase || row.stopAlreadyTradedThroughAtProof).length,
      lineBlockedRows: rows.filter((row) => row.lineStillBlockedAtSnapshot).length,
      canExecuteTrueRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : manual ? 'manual_review' : 'keep_invalid_stop_rows_blocked',
    },
    rows,
    blockers,
    recommendations: manual
      ? ['Do not install behavior; manually inspect rows that are not clearly stale invalidated stops.']
      : [
        'Keep invalid-stop-location rows blocked from this evidence.',
        'Do not reuse stale protected stops to synthesize missing entries.',
        'Next research should return to broader candidate intake or a separate narrowed entry-source study, not canExecute removal.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayInvalidStopLocationDrilldownReport(
  report: NoChaseIntradayInvalidStopLocationDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-invalid-stop-location-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayInvalidStopLocationDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayInvalidStopLocationDrilldownReport({
    dispositionRollupPath: options.dispositionRollup,
    omissionReportPath: options.omissionReport,
    auditDir: options.auditDir,
    marketBarsJson: options.marketBarsJson,
    dispositionRollup: readJson<NoChaseIntradayBlockerDispositionRollupReport>(options.dispositionRollup),
    omissionReport: readJson<NoChaseProtectedGeometryOmissionDiagnosticReport>(options.omissionReport),
    bars: loadBars(options.marketBarsJson),
  });
  const paths = writeNoChaseIntradayInvalidStopLocationDrilldownReport(report, options.outDir);
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
    runNoChaseIntradayInvalidStopLocationDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
