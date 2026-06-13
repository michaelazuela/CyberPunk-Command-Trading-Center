import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
  type NinjaBridgeTimeframe,
} from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';

type LiveSession = 'morning' | 'lunch';
type BarTimestampMode = 'open' | 'close';
type BarTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';

export interface FailedPlanReversalPhase8DateSummary {
  date: string;
  scannerAuditCount: number;
  approvedExecutableAuditCount: number;
  decisionTapeCount: number;
  decisionTapeEventCount: number;
  failedPlanReversalEventCount: number;
  twoHourCoverage: Array<{
    session: LiveSession;
    available: boolean;
    sufficient: boolean;
    barsLoaded: number;
    source: string;
    warning: string | null;
  }>;
  warnings: string[];
  regenerationRequired: boolean;
  regenerationReason: string | null;
  recommendedReplayCommand: string;
  freshTwoHourValidation: {
    attempted: boolean;
    available: boolean;
    sufficient: boolean;
    barsLoaded: number;
    rangeStart: string | null;
    rangeEnd: string | null;
    source: 'bridge_historical_120m_refresh' | 'not_attempted';
    warning: string | null;
  };
}

export interface FailedPlanReversalPhase8AuditReport {
  reportType: 'failed_plan_reversal_phase8_audit';
  generatedAt: string;
  instrument: string;
  dates: string[];
  auditDir: string;
  boundary: 'diagnostic_replay_only_not_execution_authority';
  summaries: FailedPlanReversalPhase8DateSummary[];
  totals: {
    scannerAuditCount: number;
    approvedExecutableAuditCount: number;
    decisionTapeCount: number;
    decisionTapeEventCount: number;
    failedPlanReversalEventCount: number;
    datesWithTwoHourCoverage: number;
    datesMissingTwoHourCoverage: number;
    datesRequiringRegeneration: number;
    datesWithFreshTwoHourValidation: number;
  };
  authority: {
    changesTradingRules: false;
    changesScannerBehavior: false;
    createsTrade: false;
    approvesExecution: false;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'replay-diagnostics');
const REQUIRED_LOOKBACK_DAYS = 30;
const MIN_120M_BARS = 80;

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

const DEFAULT_BRIDGE_URL = process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function splitDates(value: string | null): string[] {
  return (value || '2026-06-02,2026-06-03')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function commandDateRange(dates: string[]): { from: string; to: string } {
  const sorted = [...dates].sort();
  return {
    from: sorted[0] || '2026-06-02',
    to: sorted[sorted.length - 1] || sorted[0] || '2026-06-02',
  };
}

function buildIso(date: string, clock: string): string {
  return `${date}T${clock}:00`;
}

function calendarDateBefore(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function timeframeMinutes(timeframe: NinjaBridgeTimeframe): number {
  if (timeframe === '120m' || timeframe === '2h') return 120;
  if (timeframe === '240m' || timeframe === '4h') return 240;
  if (timeframe === '60m' || timeframe === '1h') return 60;
  if (timeframe === '15m') return 15;
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

async function freshTwoHourValidation(args: {
  date: string;
  bridgeInstrument: string;
  bridgeUrl: string;
  barTimestampMode: BarTimestampMode;
  barTimeZone: BarTimeZoneMode;
  enabled: boolean;
}): Promise<FailedPlanReversalPhase8DateSummary['freshTwoHourValidation']> {
  if (!args.enabled) {
    return {
      attempted: false,
      available: false,
      sufficient: false,
      barsLoaded: 0,
      rangeStart: null,
      rangeEnd: null,
      source: 'not_attempted',
      warning: null,
    };
  }
  const from = buildIso(calendarDateBefore(args.date, REQUIRED_LOOKBACK_DAYS), '00:00');
  const to = buildIso(args.date, '16:00');
  try {
    const response = await getNinjaHistoricalBars({
      instrument: args.bridgeInstrument,
      timeframe: '120m',
      from,
      to,
      limit: 2000,
      baseUrl: args.bridgeUrl,
    });
    const bars = completedBars(response.bars || [], '120m', args.barTimestampMode, args.barTimeZone);
    const first = bars[0]?.time || null;
    const last = bars[bars.length - 1]?.time || null;
    const sufficient = bars.length >= MIN_120M_BARS;
    return {
      attempted: true,
      available: bars.length > 0,
      sufficient,
      barsLoaded: bars.length,
      rangeStart: first,
      rangeEnd: last,
      source: 'bridge_historical_120m_refresh',
      warning: sufficient
        ? null
        : `Fresh 120M / 2H validation insufficient for ${args.date}: required at least ${MIN_120M_BARS} completed bars from ${from} to ${to}; loaded ${bars.length}.`,
    };
  } catch (error) {
    return {
      attempted: true,
      available: false,
      sufficient: false,
      barsLoaded: 0,
      rangeStart: null,
      rangeEnd: null,
      source: 'bridge_historical_120m_refresh',
      warning: `Fresh 120M / 2H validation failed for ${args.date}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' ? value as Record<string, any> : null;
}

async function readJson(file: string): Promise<Record<string, any> | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function auditIsApprovedExecutable(audit: Record<string, any>): boolean {
  return audit.source === 'live-scanner' &&
    (audit.state === 'Approved' || audit.state === 'Executable') &&
    audit.normalizedPlan?.canExecute === true;
}

function twoHourCoverageFromRaw(value: Record<string, any> | null, session: LiveSession): FailedPlanReversalPhase8DateSummary['twoHourCoverage'][number] | null {
  if (!value) return null;
  const direct = asRecord(value.twoHourCoverage);
  if (direct) {
    return {
      session,
      available: Boolean(direct.available),
      sufficient: Boolean(direct.sufficient),
      barsLoaded: Number(direct.barsLoaded || 0),
      source: String(direct.source || 'unknown'),
      warning: typeof direct.warning === 'string' ? direct.warning : null,
    };
  }
  const historyCoverage = Array.isArray(value.historyCoverage) ? value.historyCoverage : [];
  const record = historyCoverage.map(asRecord).find((item) => item?.timeframe === '120m');
  if (!record) return null;
  return {
    session,
    available: Number(record.barsLoaded || 0) > 0,
    sufficient: Boolean(record.sufficient),
    barsLoaded: Number(record.barsLoaded || 0),
    source: String(record.source || 'unknown'),
    warning: typeof record.warning === 'string' ? record.warning : null,
  };
}

function summarizeDecisionTape(tape: Record<string, any>, session: LiveSession): {
  eventCount: number;
  failedPlanReversalEventCount: number;
  twoHourCoverage: FailedPlanReversalPhase8DateSummary['twoHourCoverage'][number] | null;
} {
  const events = asRecord(tape.events) || {};
  const values = Object.values(events).map(asRecord).filter((item): item is Record<string, any> => Boolean(item));
  const failedPlanReversalEventCount = values.filter((event) => event.failedPlanReversal?.present === true).length;
  const coverage = twoHourCoverageFromRaw(tape, session) ||
    values.map((event) => twoHourCoverageFromRaw(event, session)).find(Boolean) ||
    null;
  return {
    eventCount: values.length,
    failedPlanReversalEventCount,
    twoHourCoverage: coverage,
  };
}

export async function buildFailedPlanReversalPhase8AuditReport(args: {
  auditDir?: string;
  instrument?: string;
  dates?: string[];
  refreshTwoHourFromBridge?: boolean;
  bridgeInstrument?: string;
  bridgeUrl?: string;
  barTimestampMode?: BarTimestampMode;
  barTimeZone?: BarTimeZoneMode;
}): Promise<FailedPlanReversalPhase8AuditReport> {
  const auditDir = args.auditDir || DEFAULT_AUDIT_DIR;
  const instrument = (args.instrument || 'MES').toUpperCase();
  const dates = args.dates?.length ? args.dates : ['2026-06-02', '2026-06-03'];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(auditDir);
  } catch {
    entries = [];
  }

  const summaries = await Promise.all(dates.map(async (date): Promise<FailedPlanReversalPhase8DateSummary> => {
    const scannerAuditNames = entries.filter((name) =>
      name.endsWith('.json') &&
      name.startsWith('scanner-') &&
      name.includes(`-${date}-${instrument}-`) &&
      !name.startsWith('scanner-decision-tape-')
    );
    const scannerAudits = (await Promise.all(scannerAuditNames.map((name) => readJson(path.join(auditDir, name)))))
      .filter((audit): audit is Record<string, any> => Boolean(audit));
    const decisionTapeNames = entries.filter((name) =>
      name.endsWith('.json') &&
      name.startsWith(`scanner-decision-tape-${date}-${instrument}-`)
    );
    const tapeSummaries = (await Promise.all(decisionTapeNames.map(async (name) => {
      const session = name.includes('-lunch.json') ? 'lunch' : 'morning';
      const tape = await readJson(path.join(auditDir, name));
      return tape ? summarizeDecisionTape(tape, session) : null;
    }))).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const twoHourCoverage = tapeSummaries.flatMap((item) => item.twoHourCoverage ? [item.twoHourCoverage] : []);
    const freshValidation = await freshTwoHourValidation({
      date,
      bridgeInstrument: args.bridgeInstrument || `${instrument} 06-26`,
      bridgeUrl: args.bridgeUrl || DEFAULT_BRIDGE_URL,
      barTimestampMode: args.barTimestampMode || 'open',
      barTimeZone: args.barTimeZone || 'eastern',
      enabled: Boolean(args.refreshTwoHourFromBridge),
    });
    const warnings = [
      ...(scannerAudits.length ? [] : [`${date}: no live scanner audit files found for ${instrument}.`]),
      ...(tapeSummaries.length ? [] : [`${date}: no scanner decision tape files found for ${instrument}.`]),
      ...(twoHourCoverage.some((item) => item.available)
        || freshValidation.sufficient ? []
        : [`${date}: no 120M / 2H coverage was found in decision tape artifacts.`]),
      ...(freshValidation.warning ? [freshValidation.warning] : []),
    ];
    const regenerationRequired =
      !scannerAudits.length ||
      !tapeSummaries.length ||
      !(twoHourCoverage.some((item) => item.available) || freshValidation.sufficient);
    const regenerationReason = regenerationRequired
      ? [
          !scannerAudits.length ? 'missing live scanner audit' : null,
          !tapeSummaries.length ? 'missing decision tape' : null,
          !(twoHourCoverage.some((item) => item.available) || freshValidation.sufficient) ? 'missing 120M / 2H coverage' : null,
        ].filter(Boolean).join('; ')
      : null;

    return {
      date,
      scannerAuditCount: scannerAudits.length,
      approvedExecutableAuditCount: scannerAudits.filter(auditIsApprovedExecutable).length,
      decisionTapeCount: tapeSummaries.length,
      decisionTapeEventCount: tapeSummaries.reduce((sum, item) => sum + item.eventCount, 0),
      failedPlanReversalEventCount: tapeSummaries.reduce((sum, item) => sum + item.failedPlanReversalEventCount, 0),
      twoHourCoverage,
      warnings,
      regenerationRequired,
      regenerationReason,
      recommendedReplayCommand: `npm run diagnostic:failed-plan-reversal-phase8 -- --instrument ${instrument} --dates ${date} --pretty`,
      freshTwoHourValidation: freshValidation,
    };
  }));

  return {
    reportType: 'failed_plan_reversal_phase8_audit',
    generatedAt: new Date().toISOString(),
    instrument,
    dates,
    auditDir,
    boundary: 'diagnostic_replay_only_not_execution_authority',
    summaries,
    totals: {
      scannerAuditCount: summaries.reduce((sum, item) => sum + item.scannerAuditCount, 0),
      approvedExecutableAuditCount: summaries.reduce((sum, item) => sum + item.approvedExecutableAuditCount, 0),
      decisionTapeCount: summaries.reduce((sum, item) => sum + item.decisionTapeCount, 0),
      decisionTapeEventCount: summaries.reduce((sum, item) => sum + item.decisionTapeEventCount, 0),
      failedPlanReversalEventCount: summaries.reduce((sum, item) => sum + item.failedPlanReversalEventCount, 0),
      datesWithTwoHourCoverage: summaries.filter((item) => item.twoHourCoverage.some((coverage) => coverage.available)).length,
      datesMissingTwoHourCoverage: summaries.filter((item) => !item.twoHourCoverage.some((coverage) => coverage.available)).length,
      datesRequiringRegeneration: summaries.filter((item) => item.regenerationRequired).length,
      datesWithFreshTwoHourValidation: summaries.filter((item) => item.freshTwoHourValidation.sufficient).length,
    },
    authority: {
      changesTradingRules: false,
      changesScannerBehavior: false,
      createsTrade: false,
      approvesExecution: false,
    },
  };
}

export function renderFailedPlanReversalPhase8AuditMarkdown(report: FailedPlanReversalPhase8AuditReport): string {
  const lines = [
    '# Failed-Plan Reversal Phase 8 Audit',
    '',
    `Boundary: ${report.boundary}`,
    '',
    'This report validates scanner/audit evidence only. It does not approve execution, place trades, or change trading rules.',
    '',
    '## Summary',
    `- Instrument: ${report.instrument}`,
    `- Dates: ${report.dates.join(', ')}`,
    `- Scanner audits: ${report.totals.scannerAuditCount}`,
    `- Approved/executable live audits: ${report.totals.approvedExecutableAuditCount}`,
    `- Decision tapes: ${report.totals.decisionTapeCount}`,
    `- Decision tape events: ${report.totals.decisionTapeEventCount}`,
    `- Failed-plan reversal events: ${report.totals.failedPlanReversalEventCount}`,
    `- Dates with 120M / 2H coverage in existing decision tapes: ${report.totals.datesWithTwoHourCoverage}`,
    `- Dates missing 120M / 2H coverage in existing decision tapes: ${report.totals.datesMissingTwoHourCoverage}`,
    `- Dates requiring fresh replay/live-style regeneration: ${report.totals.datesRequiringRegeneration}`,
    `- Dates with fresh bridge 120M / 2H validation: ${report.totals.datesWithFreshTwoHourValidation}`,
    '',
    '## Fresh Replay Requirement',
    'Old scanner audit files are immutable historical evidence. If they lack 120M / 2H coverage or decision-tape events, do not reinterpret them as complete. Regenerate a fresh replay/live-style audit after 120M bridge/cache support is active.',
    `- Suggested range command: npm run diagnostic:failed-plan-reversal-phase8 -- --instrument ${report.instrument} --dates ${report.dates.join(',')} --pretty`,
    '',
    '## Date Details',
    '| Date | Scanner Audits | Approved/Executable | Decision Tapes | Events | Failed-Plan Reversal Events | 120M Coverage | Regenerate | Warnings |',
    '|---|---:|---:|---:|---:|---:|---|---|---|',
    ...report.summaries.map((item) => {
      const coverage = item.twoHourCoverage.length
        ? item.twoHourCoverage.map((entry) => `${entry.session}: ${entry.sufficient ? 'sufficient' : entry.available ? 'partial' : 'missing'} (${entry.barsLoaded}, ${entry.source})`).join('<br>')
        : 'missing';
      const fresh = item.freshTwoHourValidation.attempted
        ? `${item.freshTwoHourValidation.sufficient ? 'sufficient' : item.freshTwoHourValidation.available ? 'partial' : 'missing'} (${item.freshTwoHourValidation.barsLoaded}, ${item.freshTwoHourValidation.source})`
        : 'not attempted';
      return `| ${item.date} | ${item.scannerAuditCount} | ${item.approvedExecutableAuditCount} | ${item.decisionTapeCount} | ${item.decisionTapeEventCount} | ${item.failedPlanReversalEventCount} | ${coverage}<br>Fresh: ${fresh} | ${item.regenerationRequired ? `Yes - ${item.regenerationReason}` : 'No'} | ${item.warnings.join('<br>') || 'none'} |`;
    }),
    '',
    'Authority: diagnostic only. Existing deterministic gates remain the only app-owned trade-plan authority.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const report = await buildFailedPlanReversalPhase8AuditReport({
    auditDir: readFlag(argv, '--audit-dir') || DEFAULT_AUDIT_DIR,
    instrument: readFlag(argv, '--instrument') || 'MES',
    dates: splitDates(readFlag(argv, '--dates')),
    refreshTwoHourFromBridge: hasFlag(argv, '--refresh-120m-from-bridge'),
    bridgeInstrument: readFlag(argv, '--bridge-instrument') || undefined,
    bridgeUrl: readFlag(argv, '--bridge-url') || undefined,
    barTimestampMode: (readFlag(argv, '--bar-timestamp-mode') as BarTimestampMode | null) || undefined,
    barTimeZone: (readFlag(argv, '--bar-time-zone') as BarTimeZoneMode | null) || undefined,
  });
  const outputDir = readFlag(argv, '--output-dir') || DEFAULT_OUTPUT_DIR;
  const range = commandDateRange(report.dates);
  await fs.mkdir(outputDir, { recursive: true });
  const slug = `${report.instrument}-${range.from}-to-${range.to}`;
  const jsonPath = path.join(outputDir, `failed-plan-reversal-phase8-audit-${slug}.json`);
  const mdPath = path.join(outputDir, `failed-plan-reversal-phase8-audit-${slug}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdPath, renderFailedPlanReversalPhase8AuditMarkdown(report), 'utf8');
  if (hasFlag(argv, '--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[FAILED PLAN REVERSAL PHASE 8 AUDIT]\nJSON: ${jsonPath}\nMarkdown: ${mdPath}\nDates: ${report.dates.join(', ')}\nFailed-plan reversal events: ${report.totals.failedPlanReversalEventCount}\nExisting decision-tape 120M dates missing: ${report.totals.datesMissingTwoHourCoverage}\nFresh bridge 120M dates sufficient: ${report.totals.datesWithFreshTwoHourValidation}\nBoundary: ${report.boundary}`);
    if (hasFlag(argv, '--pretty')) console.log(renderFailedPlanReversalPhase8AuditMarkdown(report));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/failed-plan-reversal-phase8-audit.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
