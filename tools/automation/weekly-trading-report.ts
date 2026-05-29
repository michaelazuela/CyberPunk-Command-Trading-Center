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
import {
  loadDiscordAuditHistory,
  loadHealthAuditHistory,
  loadWatchlistAuditHistory,
  type ScannerAuditEvent,
} from './scanner-audit-import';

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
  researchDir: string;
  stateFile: string;
  dryRun: boolean;
}

interface WeeklyReportState {
  sent: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DIAGNOSTIC_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_RESEARCH_DIR = path.resolve(__dirname, '../../docs/research');
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

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function requireDate(value: string | null): string {
  if (value === 'auto') return etDate();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('--week-ending must use YYYY-MM-DD format or auto.');
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
    researchDir: readFlag(args, '--research-dir') || DEFAULT_RESEARCH_DIR,
    stateFile: readFlag(args, '--state-file') || DEFAULT_STATE_FILE,
    dryRun: hasFlag(args, '--dry-run'),
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

async function readResearchSummaries(dir: string): Promise<NonNullable<WeeklyTradingAnalysisInput['researchNotes']>> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const summaries: NonNullable<WeeklyTradingAnalysisInput['researchNotes']> = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    try {
      const markdown = await fs.readFile(path.join(dir, entry.name), 'utf8');
      const match = markdown.match(/## (?:10|11)\. Weekly Newsletter Summary[\s\S]*?```json\s*([\s\S]*?)```/);
      if (!match?.[1]) continue;
      const parsed = JSON.parse(match[1]);
      if (parsed?.includeInWeeklyNewsletter === true && parsed?.status === 'research_only') {
        summaries.push({
          researchTitle: String(parsed.researchTitle || entry.name),
          status: 'research_only',
          candidateName: String(parsed.candidateName || parsed.researchTitle || entry.name),
          primaryIdea: String(parsed.primaryIdea || 'Research note only.'),
          taxonomyNote: parsed.taxonomyNote ? String(parsed.taxonomyNote) : undefined,
          recommendedNextStep: String(parsed.recommendedNextStep || 'Continue research collection.'),
          ruleChange: String(parsed.ruleChange || 'none'),
          approvalBoundarySummary: String(parsed.approvalBoundarySummary || 'Research only.'),
          includeInWeeklyNewsletter: true,
        });
      }
    } catch {
      continue;
    }
  }
  return summaries;
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
  const auditHistory = await loadDiscordAuditHistory(options.auditDir);
  const watchlistHistory = await loadWatchlistAuditHistory(options.auditDir);
  const healthHistory = await loadHealthAuditHistory(options.auditDir);
  const researchNotes = await readResearchSummaries(options.researchDir);
  const auditEvents = auditHistory.events.filter((event) => !event.instrument || event.instrument.toUpperCase() === options.instrument);
  return {
    weekEnding: options.weekEnding,
    instrument: options.instrument,
    diagnosticReports: diagnostics.filter(isDiagnosticReport).filter((item) => sameInstrument(item, options.instrument)) as WeeklyTradingAnalysisInput['diagnosticReports'],
    watchlistRecords: watchlistHistory.events.map(eventToWatchlistRecord) as WeeklyTradingAnalysisInput['watchlistRecords'],
    healthEvents: healthHistory.events.map(eventToHealthRecord),
    tradeAlertRecords: auditEvents.filter((event) => event.alertType === 'trade').map(eventToTradeAlertRecord),
    proofRecords: [],
    auditEvents,
    researchNotes,
    dataWarnings: auditHistory.warnings,
  };
}

function eventToWatchlistRecord(event: ScannerAuditEvent) {
  return {
    memoryType: 'watchlist_context',
    watchlistType: event.watchlistType || 'morning_continuation_watchlist',
    tradeDate: event.tradeDate || '',
    instrument: event.instrument || '',
    session: 'morning',
    direction: event.direction || 'NO TRADE',
    status: event.watchlistStatus || 'WATCH_ONLY',
    auditWarnings: event.auditWarnings,
  };
}

function eventToHealthRecord(event: ScannerAuditEvent) {
  return {
    status: event.healthStatus,
    summary: event.suppressionOrBlockReason,
    warnings: event.auditWarnings,
    blockingReasons: event.healthStatus === 'BLOCKED' && event.suppressionOrBlockReason ? [event.suppressionOrBlockReason] : [],
  };
}

function eventToTradeAlertRecord(event: ScannerAuditEvent) {
  return {
    state: event.scannerState,
    decision: event.direction,
    sentAt: event.alertTimestamp,
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
  const report = await buildWeeklyReportFromHistory(options);

  if (options.out) {
    console.log(`Weekly report saved: ${writeReport(options.out, report)}`);
  }

  if (options.discord) {
    const state = await readState(options.stateFile);
    if (shouldSendWeeklyDiscordReport(state, report)) {
      if (options.dryRun) {
        console.log(`Weekly Discord report dry-run: ${weeklyReportKey(report)}`);
      } else if (!process.env.DISCORD_WEBHOOK_URL) {
        console.log(`Weekly Discord report skipped; DISCORD_WEBHOOK_URL is not configured: ${weeklyReportKey(report)}`);
      } else {
        await postDiscordReport(report);
        state.sent[weeklyReportKey(report)] = new Date().toISOString();
        await writeState(options.stateFile, state);
        console.log(`Weekly Discord report sent: ${weeklyReportKey(report)}`);
      }
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

export async function buildWeeklyReportFromHistory(options: WeeklyReportCliOptions): Promise<WeeklyTradingAnalysisReport> {
  const input = await collectWeeklyReportInput(options);
  return buildWeeklyTradingAnalysisReport(input);
}

export async function publishWeeklyTradingNewsletter(options: {
  weekEnding: string;
  instrument: Instrument;
  discord: boolean;
  dryRun: boolean;
  diagnosticDir?: string;
  auditDir?: string;
  researchDir?: string;
  stateFile?: string;
}): Promise<{ report: WeeklyTradingAnalysisReport; sent: boolean; skippedReason: string | null }> {
  const cliOptions: WeeklyReportCliOptions = {
    weekEnding: options.weekEnding === 'auto' ? etDate() : options.weekEnding,
    instrument: options.instrument,
    discord: options.discord,
    out: null,
    pretty: true,
    json: false,
    diagnosticDir: options.diagnosticDir || DEFAULT_DIAGNOSTIC_DIR,
    auditDir: options.auditDir || DEFAULT_AUDIT_DIR,
    researchDir: options.researchDir || DEFAULT_RESEARCH_DIR,
    stateFile: options.stateFile || DEFAULT_STATE_FILE,
    dryRun: options.dryRun,
  };
  const report = await buildWeeklyReportFromHistory(cliOptions);
  if (!options.discord) return { report, sent: false, skippedReason: 'Discord disabled.' };
  const state = await readState(cliOptions.stateFile);
  if (!shouldSendWeeklyDiscordReport(state, report)) return { report, sent: false, skippedReason: 'Already sent.' };
  if (options.dryRun) return { report, sent: false, skippedReason: 'Dry run.' };
  if (!process.env.DISCORD_WEBHOOK_URL) return { report, sent: false, skippedReason: 'DISCORD_WEBHOOK_URL missing.' };
  await postDiscordReport(report);
  state.sent[weeklyReportKey(report)] = new Date().toISOString();
  await writeState(cliOptions.stateFile, state);
  return { report, sent: true, skippedReason: null };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/weekly-trading-report.ts')) {
  runWeeklyReportCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
