import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildWeeklyTradingAnalysisReport,
  type WeeklyTradingAnalysisInput,
  type WeeklyTradingAnalysisReport,
} from '../../src/agents/tradingAnalysisAgent';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

export interface WeeklyReportCliOptions {
  weekEnding: string;
  instrument: Instrument;
  discord: boolean;
  out: string | null;
  pretty: boolean;
  json: boolean;
  diagnosticDir: string;
  auditDir: string;
  stateFile: string;
}

interface WeeklyReportState {
  sent: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DIAGNOSTIC_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_STATE_FILE = path.join(__dirname, '.weekly-trading-report-state.json');

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

function boolValue(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function requireDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('--week-ending must use YYYY-MM-DD format.');
  return value;
}

export function parseWeeklyReportArgs(args = process.argv.slice(2)): WeeklyReportCliOptions {
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  return {
    weekEnding: requireDate(readFlag(args, '--week-ending')),
    instrument,
    discord: boolValue(readFlag(args, '--discord'), false),
    out: readFlag(args, '--out'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    diagnosticDir: readFlag(args, '--diagnostic-dir') || DEFAULT_DIAGNOSTIC_DIR,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    stateFile: readFlag(args, '--state-file') || DEFAULT_STATE_FILE,
  };
}

async function readJsonFiles(dir: string): Promise<unknown[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const values: unknown[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try {
      values.push(JSON.parse(await fs.readFile(path.join(dir, entry.name), 'utf8')));
    } catch {
      values.push({ readError: `Could not parse ${entry.name}` });
    }
  }
  return values;
}

function sameInstrument(value: unknown, instrument: string): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return String(record.instrument || '').toUpperCase() === instrument;
}

function isDiagnosticReport(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && 'finalClassification' in value);
}

function isWatchlistRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const memory = record.memory && typeof record.memory === 'object'
    ? record.memory as Record<string, unknown>
    : null;
  return record.watchlistType === 'morning_continuation_watchlist' ||
    memory?.watchlistType === 'morning_continuation_watchlist';
}

function isTradeAlertAudit(value: unknown): boolean {
  return Boolean(value && typeof value === 'object' && (value as Record<string, unknown>).source === 'live-scanner');
}

function watchlistFromAudit(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  return record.memory || record.watchlist || record;
}

export async function collectWeeklyReportInput(options: WeeklyReportCliOptions): Promise<WeeklyTradingAnalysisInput> {
  const diagnostics = await readJsonFiles(options.diagnosticDir);
  const audits = await readJsonFiles(options.auditDir);
  return {
    weekEnding: options.weekEnding,
    instrument: options.instrument,
    diagnosticReports: diagnostics.filter(isDiagnosticReport).filter((item) => sameInstrument(item, options.instrument)) as WeeklyTradingAnalysisInput['diagnosticReports'],
    watchlistRecords: audits.filter(isWatchlistRecord).map(watchlistFromAudit) as WeeklyTradingAnalysisInput['watchlistRecords'],
    healthEvents: audits
      .filter((item) => item && typeof item === 'object' && 'health' in item)
      .map((item) => (item as Record<string, unknown>).health as WeeklyTradingAnalysisInput['healthEvents'][number]),
    tradeAlertRecords: audits.filter(isTradeAlertAudit).filter((item) => sameInstrument(item, options.instrument)) as WeeklyTradingAnalysisInput['tradeAlertRecords'],
    proofRecords: [],
  };
}

async function readState(file: string): Promise<WeeklyReportState> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as WeeklyReportState;
  } catch {
    return { sent: {} };
  }
}

async function writeState(file: string, state: WeeklyReportState): Promise<void> {
  mkdirSync(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function weeklyReportKey(report: Pick<WeeklyTradingAnalysisReport, 'weekEnding' | 'instrument'>): string {
  return `${report.instrument}:${report.weekEnding}`;
}

export function shouldSendWeeklyDiscordReport(state: WeeklyReportState, report: Pick<WeeklyTradingAnalysisReport, 'weekEnding' | 'instrument'>): boolean {
  return !state.sent[weeklyReportKey(report)];
}

async function postDiscordReport(report: WeeklyTradingAnalysisReport): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is required for --discord true.');
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report.discordPayload),
  });
  if (!response.ok) throw new Error(`Discord webhook failed (${response.status}): ${await response.text()}`);
}

function writeReport(out: string, report: WeeklyTradingAnalysisReport): string {
  const resolved = path.resolve(out);
  const file = path.extname(resolved)
    ? resolved
    : path.join(resolved, `weekly-trading-report-${report.weekEnding}-${report.instrument}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return file;
}

export async function runWeeklyReportCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseWeeklyReportArgs(rawArgs);
  const input = await collectWeeklyReportInput(options);
  const report = buildWeeklyTradingAnalysisReport(input);

  if (options.out) {
    console.log(`Weekly report saved: ${writeReport(options.out, report)}`);
  }

  if (options.discord) {
    const state = await readState(options.stateFile);
    if (shouldSendWeeklyDiscordReport(state, report)) {
      await postDiscordReport(report);
      state.sent[weeklyReportKey(report)] = new Date().toISOString();
      await writeState(options.stateFile, state);
      console.log(`Weekly Discord report sent: ${weeklyReportKey(report)}`);
    } else {
      console.log(`Weekly Discord report already sent: ${weeklyReportKey(report)}`);
    }
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.pretty) {
    console.log(report.discordMessage);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/weekly-trading-report.ts')) {
  runWeeklyReportCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
