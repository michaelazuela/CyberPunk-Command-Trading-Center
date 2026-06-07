import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
  type NinjaBridgeTimeframe,
} from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';
import {
  runBridgeDiagnosticReplay,
  type BridgeDiagnosticReplayInput,
  type DiagnosticDirection,
} from '../../src/agents/bridgeDiagnosticReplayAgent';
import { loadScannerAuditHistory } from './scanner-audit-import';
import { SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS } from './nt-scanner';

type BarTimestampMode = 'open' | 'close';
type BarTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';

export interface DiagnosticReplayCliOptions {
  date: string;
  instrument: 'MES' | 'MNQ';
  bridgeInstrument: string;
  from: string;
  to: string;
  direction: DiagnosticDirection;
  bridgeUrl: string;
  barTimestampMode: BarTimestampMode;
  barTimeZone: BarTimeZoneMode;
  out: string | null;
  pretty: boolean;
  json: boolean;
  auditDir: string;
}

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

const DEFAULT_BRIDGE_URL = process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_AUDIT_DIR = join(__dirname, 'discord-audit');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return null;
  return value;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function requireOption(value: string | null, flag: string): string {
  if (!value) throw new Error(`Missing required option ${flag}`);
  return value;
}

function assertClock(value: string, flag: string): string {
  if (!/^\d{2}:\d{2}$/.test(value)) throw new Error(`${flag} must use HH:mm format.`);
  return value;
}

export function parseDiagnosticReplayArgs(args = process.argv.slice(2)): DiagnosticReplayCliOptions {
  const date = requireOption(readFlag(args, '--date'), '--date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date must use YYYY-MM-DD format.');
  const instrument = requireOption(readFlag(args, '--instrument'), '--instrument').toUpperCase();
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  const direction = (readFlag(args, '--direction') || 'AUTO').toUpperCase();
  if (direction !== 'LONG' && direction !== 'SHORT' && direction !== 'AUTO') {
    throw new Error('--direction must be LONG, SHORT, or AUTO.');
  }
  const timestampMode = (readFlag(args, '--bar-timestamp-mode') || 'close').toLowerCase();
  if (timestampMode !== 'open' && timestampMode !== 'close') {
    throw new Error('--bar-timestamp-mode must be open or close.');
  }
  const timeZone = (readFlag(args, '--bar-time-zone') || 'eastern').toLowerCase();
  if (timeZone !== 'eastern' && timeZone !== 'central' && timeZone !== 'pacific' && timeZone !== 'local') {
    throw new Error('--bar-time-zone must be eastern, central, pacific, or local.');
  }
  return {
    date,
    instrument,
    bridgeInstrument: requireOption(readFlag(args, '--bridge-instrument'), '--bridge-instrument'),
    from: assertClock(requireOption(readFlag(args, '--from'), '--from'), '--from'),
    to: assertClock(requireOption(readFlag(args, '--to'), '--to'), '--to'),
    direction,
    bridgeUrl: readFlag(args, '--bridge-url') || DEFAULT_BRIDGE_URL,
    barTimestampMode: timestampMode,
    barTimeZone: timeZone,
    out: readFlag(args, '--out'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
  };
}

function timeframeMinutes(timeframe: NinjaBridgeTimeframe): number {
  if (timeframe === '1m') return 1;
  if (timeframe === '5m') return 5;
  if (timeframe === '15m') return 15;
  if (timeframe === '60m' || timeframe === '1h') return 60;
  if (timeframe === '120m' || timeframe === '2h') return 120;
  if (timeframe === '240m' || timeframe === '4h') return 240;
  return 5;
}

function completedBars(
  bars: NinjaBridgeBar[],
  timeframe: NinjaBridgeTimeframe,
  timestampMode: BarTimestampMode,
  timeZone: BarTimeZoneMode,
  now = new Date(),
): NinjaBridgeBar[] {
  const minutes = timeframeMinutes(timeframe);
  return bars.filter((bar) => {
    const parsed = parseBridgeTime(bar.time, timeZone);
    if (!parsed) return false;
    const completedAt = timestampMode === 'close'
      ? parsed.getTime()
      : parsed.getTime() + minutes * 60_000;
    return completedAt <= now.getTime();
  });
}

async function fetchBars(args: DiagnosticReplayCliOptions, timeframe: NinjaBridgeTimeframe, from: string, to: string): Promise<NinjaBridgeBar[]> {
  try {
    const response = await getNinjaHistoricalBars({
      instrument: args.bridgeInstrument,
      timeframe,
      from,
      to,
      limit: 2000,
      baseUrl: args.bridgeUrl,
    });
    return completedBars(response.bars || [], timeframe, args.barTimestampMode, args.barTimeZone);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[diagnostic:replay] ${timeframe} unavailable: ${message}`);
    return [];
  }
}

function buildIso(date: string, clock: string): string {
  return `${date}T${clock}:00`;
}

function calendarDateBefore(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function buildReplayInput(options: DiagnosticReplayCliOptions): Promise<BridgeDiagnosticReplayInput> {
  const from = buildIso(options.date, options.from);
  const to = buildIso(options.date, options.to);
  const contextFrom = buildIso(calendarDateBefore(options.date, SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS), '00:00');
  const bars5m = await fetchBars(options, '5m', from, to);
  const bars5mContext = await fetchBars(options, '5m', contextFrom, to);
  const bars15m = await fetchBars(options, '15m', contextFrom, to);
  const bars60m = await fetchBars(options, '60m', contextFrom, to);
  const bars120m = await fetchBars(options, '120m', contextFrom, to);
  const bars240m = await fetchBars(options, '240m', contextFrom, to);
  const auditHistory = await loadScannerAuditHistory(options.auditDir);

  return {
    tradeDate: options.date,
    instrument: options.instrument,
    session: 'morning',
    bars5m,
    bars5mContext,
    bars15m,
    bars30m: [],
    bars60m,
    bars120m,
    bars240m,
    barsDaily: [],
    replayWindow: { from: options.from, to: options.to },
    suspectedMoveDirection: options.direction,
    scannerAlertSent: null,
    scannerAlertReason: auditHistory.warnings.length ? auditHistory.warnings.join(' | ') : null,
    scannerAuditEvents: auditHistory.events,
  };
}

function formatPretty(report: ReturnType<typeof runBridgeDiagnosticReplay>): string {
  const lines = [
    `Classification: ${report.finalClassification}`,
    `Label: ${report.classificationLabel}`,
    `Date/Instrument: ${report.tradeDate} ${report.instrument}`,
    `Replay Window: ${report.replayWindow.from}-${report.replayWindow.to}`,
    `HTF: ${report.higherTimeframeConfirmation}`,
    `15M: ${report.fifteenMinuteConfirmation}`,
    `5M: ${report.fiveMinuteReview.summary}`,
    `FVG Bounds: ${report.fvgBounds.map((zone) => `${zone.sourceTimeframe} ${zone.direction} ${zone.lower}-${zone.upper} @ ${zone.formedAt}`).join('; ') || 'none'}`,
    `Pullback: ${report.pullbackReview.status} - ${report.pullbackReview.summary}`,
    `Scanner: ${report.scannerAlertReview.reason}`,
    `Scanner audit: ${report.scannerAuditContext.scannerAuditStatus} - ${report.scannerAuditContext.summary}`,
    `Recommendation: ${report.newPlanRecommendation.recommendationType} - ${report.newPlanRecommendation.reason}`,
    `Data boundary: Review requests ${SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS} calendar days of structured context for 15M/1H/2H/4H and is bounded to currently available completed bars.`,
    `Authority: diagnostic only; no rules changed; no trade approval created.`,
  ];
  return lines.join('\n');
}

function writeReport(path: string, report: ReturnType<typeof runBridgeDiagnosticReplay>): string {
  const resolved = resolve(path);
  const file = extname(resolved)
    ? resolved
    : join(resolved, `diagnostic-replay-${report.tradeDate}-${report.instrument}-${Date.now()}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return file;
}

export async function runDiagnosticReplayCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseDiagnosticReplayArgs(rawArgs);
  const input = await buildReplayInput(options);
  const report = runBridgeDiagnosticReplay(input);

  if (options.out) {
    const file = writeReport(options.out, report);
    console.log(`Diagnostic report saved: ${file}`);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.pretty) {
    console.log(formatPretty(report));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/diagnostic-replay.ts')) {
  runDiagnosticReplayCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
