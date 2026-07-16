import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ScannerDiscordFamily =
  | 'trade_alert'
  | 'desk_play'
  | 'reversal_watch'
  | 'morning_htf_desk_map'
  | 'end_of_day_market_recap'
  | 'watchlist'
  | 'window_start'
  | 'health'
  | 'data_quality'
  | 'unknown';

interface ScannerDiscordFamilyAuditOptions {
  tradeDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  since: string | null;
  currentRiskSince: string | null;
  json: boolean;
}

export interface ScannerDiscordFamilyReceiptRow {
  fileName: string;
  kind: ScannerDiscordFamily;
  tradeDate: string | null;
  instrument: string | null;
  session: string | null;
  postedAt: string | null;
  planVersionId: string | null;
  key: string | null;
  messageIdPresent: boolean;
  webhookSource: string | null;
  httpStatus: number | null;
  ragReceiptAttached: boolean | null;
  cadenceKey: string;
  familyRole: string;
}

export interface ScannerDiscordFamilySummary {
  kind: ScannerDiscordFamily;
  session: string;
  count: number;
  currentRiskCount: number;
  historicalPreCadenceFixCount: number;
  firstPostedAt: string | null;
  lastPostedAt: string | null;
  minSpacingMinutes: number | null;
  burstCountUnderFiveMinutes: number;
  currentRiskBurstCountUnderFiveMinutes: number;
  uniqueCadenceKeys: number;
}

export interface ScannerDiscordFamilyAuditReport {
  reportType: 'scanner_discord_family_phase2_audit';
  generatedAt: string;
  tradeDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  since: string | null;
  currentRiskSince: string | null;
  receiptCount: number;
  summaries: ScannerDiscordFamilySummary[];
  rows: ScannerDiscordFamilyReceiptRow[];
  findings: string[];
  authority: {
    readOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesDiscordCadence: false;
    changesTradingLogic: false;
    changesCanExecute: false;
  };
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_CURRENT_RISK_SINCE = '2026-07-16T02:49:52.000Z';

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

export function parseScannerDiscordFamilyAuditArgs(args = process.argv.slice(2)): ScannerDiscordFamilyAuditOptions {
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    since: readFlag(args, '--since'),
    currentRiskSince: readFlag(args, '--current-risk-since') || DEFAULT_CURRENT_RISK_SINCE,
    json: hasFlag(args, '--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function parseMs(value: string | null): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function validSinceMs(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) throw new Error(`--since must be a valid date/time. Received: ${value}`);
  return ms;
}

function familyRole(kind: ScannerDiscordFamily): string {
  switch (kind) {
    case 'trade_alert':
      return 'primary executable/conditional trade alert receipt';
    case 'desk_play':
      return 'current desk map/review plan refresh';
    case 'reversal_watch':
      return 'watch-only tactical reversal update';
    case 'morning_htf_desk_map':
      return 'once-per-morning higher-timeframe map';
    case 'end_of_day_market_recap':
      return 'learning/reporting recap';
    case 'watchlist':
      return 'advisory watchlist';
    case 'data_quality':
      return 'operational data-quality notice';
    case 'window_start':
      return 'operational scanner window heartbeat';
    case 'health':
      return 'operational health notice';
    default:
      return 'unknown receipt family';
  }
}

function knownKind(value: string | null): ScannerDiscordFamily {
  if (
    value === 'trade_alert' ||
    value === 'desk_play' ||
    value === 'reversal_watch' ||
    value === 'morning_htf_desk_map' ||
    value === 'end_of_day_market_recap' ||
    value === 'watchlist' ||
    value === 'window_start' ||
    value === 'health' ||
    value === 'data_quality'
  ) return value;
  return 'unknown';
}

function cadenceKeyFor(key: string | null, planVersionId: string | null): string {
  const raw = key || planVersionId || 'unknown';
  return raw
    .replace(/:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?/g, ':<completed5m>')
    .replace(/-\d{6}(?=-|$)/g, '-<clock>');
}

function receiptRow(fileName: string, value: unknown): ScannerDiscordFamilyReceiptRow | null {
  const record = asRecord(value);
  if (record.source !== 'live-scanner-discord-receipt') return null;
  const discordMessage = asRecord(record.discordMessage);
  const kind = knownKind(stringOrNull(record.kind));
  const key = stringOrNull(record.key);
  const planVersionId = stringOrNull(record.planVersionId);
  return {
    fileName,
    kind,
    tradeDate: stringOrNull(record.tradeDate),
    instrument: stringOrNull(record.instrument),
    session: stringOrNull(record.session),
    postedAt: stringOrNull(discordMessage.postedAt),
    planVersionId,
    key,
    messageIdPresent: Boolean(stringOrNull(discordMessage.messageId)),
    webhookSource: stringOrNull(discordMessage.webhookSource),
    httpStatus: numberOrNull(discordMessage.httpStatus),
    ragReceiptAttached: boolOrNull(discordMessage.ragReceiptAttached),
    cadenceKey: cadenceKeyFor(key, planVersionId),
    familyRole: familyRole(kind),
  };
}

function summarize(rows: ScannerDiscordFamilyReceiptRow[], currentRiskSinceMs: number | null): ScannerDiscordFamilySummary[] {
  const groups = new Map<string, ScannerDiscordFamilyReceiptRow[]>();
  for (const row of rows) {
    const groupKey = `${row.kind}|${row.session || 'unknown'}`;
    groups.set(groupKey, [...(groups.get(groupKey) || []), row]);
  }
  return [...groups.entries()]
    .map(([groupKey, groupRows]) => {
      const [kind, session] = groupKey.split('|') as [ScannerDiscordFamily, string];
      const sorted = [...groupRows].sort((a, b) => parseMs(a.postedAt) - parseMs(b.postedAt));
      const spacings = sorted.slice(1)
        .map((row, index) => (parseMs(row.postedAt) - parseMs(sorted[index].postedAt)) / 60_000)
        .filter((value) => Number.isFinite(value) && value >= 0);
      const currentRiskRows = currentRiskSinceMs === null
        ? sorted
        : sorted.filter((row) => parseMs(row.postedAt) >= currentRiskSinceMs);
      const currentRiskSpacings = currentRiskRows.slice(1)
        .map((row, index) => (parseMs(row.postedAt) - parseMs(currentRiskRows[index].postedAt)) / 60_000)
        .filter((value) => Number.isFinite(value) && value >= 0);
      return {
        kind,
        session,
        count: sorted.length,
        currentRiskCount: currentRiskRows.length,
        historicalPreCadenceFixCount: sorted.length - currentRiskRows.length,
        firstPostedAt: sorted[0]?.postedAt || null,
        lastPostedAt: sorted[sorted.length - 1]?.postedAt || null,
        minSpacingMinutes: spacings.length ? Math.min(...spacings) : null,
        burstCountUnderFiveMinutes: spacings.filter((value) => value < 5).length,
        currentRiskBurstCountUnderFiveMinutes: currentRiskSpacings.filter((value) => value < 5).length,
        uniqueCadenceKeys: new Set(sorted.map((row) => row.cadenceKey)).size,
      };
    })
    .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
}

function findingsFor(summaries: ScannerDiscordFamilySummary[], rows: ScannerDiscordFamilyReceiptRow[]): string[] {
  const findings: string[] = [];
  const deskPlayCount = summaries
    .filter((summary) => summary.kind === 'desk_play')
    .reduce((sum, summary) => sum + summary.currentRiskCount, 0);
  const reversalWatchCount = summaries
    .filter((summary) => summary.kind === 'reversal_watch')
    .reduce((sum, summary) => sum + summary.currentRiskCount, 0);
  const historicalPreCadenceFixCount = summaries.reduce((sum, summary) => sum + summary.historicalPreCadenceFixCount, 0);
  const bursty = summaries.filter((summary) => summary.currentRiskBurstCountUnderFiveMinutes > 0);
  if (historicalPreCadenceFixCount > 0) {
    findings.push(`${historicalPreCadenceFixCount} pre-cadence-fix historical receipt(s) retained for evidence and excluded from current flooding risk findings.`);
  }
  if (deskPlayCount > 0) findings.push(`${deskPlayCount} current-risk Desk Play receipt(s) found. This is the current-desk-map family most likely to create perceived flooding.`);
  if (reversalWatchCount > 0) findings.push(`${reversalWatchCount} Reversal Watch receipt(s) found. Verify these remain watch-only and do not look like primary executable trade calls.`);
  for (const summary of bursty) {
    findings.push(`${summary.kind}/${summary.session} had ${summary.currentRiskBurstCountUnderFiveMinutes} current-risk under-five-minute spacing interval(s); Phase 3 should inspect whether cadence should consolidate those posts.`);
  }
  const missingMessageId = rows.filter((row) => !row.messageIdPresent).length;
  if (missingMessageId > 0) findings.push(`${missingMessageId} receipt row(s) lacked a Discord message id; receipt persistence should be reviewed.`);
  if (!findings.length) findings.push('No secondary Discord family cadence risk detected from receipt files for this date.');
  findings.push('Read-only audit only. Do not change Discord cadence, canExecute, entries, stops, targets, risk gates, setup definitions, or scanner ranking from this report.');
  return findings;
}

function formatTime(value: string | null): string {
  if (!value) return 'N/A';
  return value.match(/T(\d{2}:\d{2})/)?.[1] || value;
}

function formatSpacing(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(1);
}

function markdownFor(report: Omit<ScannerDiscordFamilyAuditReport, 'markdown'>): string {
  const lines = [
    `# Scanner Discord Family Phase 2 Audit - ${report.instrument} ${report.tradeDate}`,
    '',
    'Read-only receipt-family audit. This report does not post Discord, change scanner state, change Discord cadence, approve execution, or change trading logic.',
    ...(report.since ? ['', `Since filter: ${report.since}`] : []),
    ...(report.currentRiskSince ? ['', `Current-risk baseline: ${report.currentRiskSince}. Older receipts remain listed as historical evidence but are excluded from current flooding risk findings.`] : []),
    '',
    '## Summary By Family',
    '| Kind | Session | Count | Current risk | Historical pre-fix | First | Last | Min spacing min | All <5m bursts | Current <5m bursts | Unique cadence keys |',
    '| --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: |',
    ...report.summaries.map((summary) => `| ${summary.kind} | ${summary.session} | ${summary.count} | ${summary.currentRiskCount} | ${summary.historicalPreCadenceFixCount} | ${formatTime(summary.firstPostedAt)} | ${formatTime(summary.lastPostedAt)} | ${formatSpacing(summary.minSpacingMinutes)} | ${summary.burstCountUnderFiveMinutes} | ${summary.currentRiskBurstCountUnderFiveMinutes} | ${summary.uniqueCadenceKeys} |`),
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Receipts',
    '| Posted | Kind | Session | Plan | Webhook | HTTP | RAG receipt | Role | Key |',
    '| --- | --- | --- | --- | --- | ---: | --- | --- | --- |',
    ...report.rows.map((row) => `| ${formatTime(row.postedAt)} | ${row.kind} | ${row.session || 'N/A'} | ${(row.planVersionId || 'N/A').replace(/\|/g, '/')} | ${row.webhookSource || 'N/A'} | ${row.httpStatus ?? 'N/A'} | ${row.ragReceiptAttached === null ? 'N/A' : row.ragReceiptAttached} | ${row.familyRole.replace(/\|/g, '/')} | ${(row.key || 'N/A').replace(/\|/g, '/')} |`),
    '',
    '## Authority Boundary',
    '- Read-only: true',
    '- Posts Discord: false',
    '- Changes scanner state: false',
    '- Changes Discord cadence: false',
    '- Changes trading logic: false',
    '- Changes canExecute: false',
  ];
  return `${lines.join('\n')}\n`;
}

export async function buildScannerDiscordFamilyAuditReport(options: ScannerDiscordFamilyAuditOptions): Promise<ScannerDiscordFamilyAuditReport> {
  const rows: ScannerDiscordFamilyReceiptRow[] = [];
  const sinceMs = validSinceMs(options.since);
  const currentRiskSinceMs = validSinceMs(options.currentRiskSince);
  if (existsSync(options.auditDir)) {
    const entries = await fs.readdir(options.auditDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.startsWith('discord-receipt-') || !entry.name.endsWith('.json')) continue;
      const filePath = path.join(options.auditDir, entry.name);
      const parsed = JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
      const row = receiptRow(entry.name, parsed);
      if (!row) continue;
      if (row.tradeDate !== options.tradeDate || row.instrument !== options.instrument) continue;
      if (sinceMs !== null && parseMs(row.postedAt) < sinceMs) continue;
      rows.push(row);
    }
  }
  rows.sort((a, b) => parseMs(a.postedAt) - parseMs(b.postedAt));
  const summaries = summarize(rows, currentRiskSinceMs);
  const reportWithoutMarkdown: Omit<ScannerDiscordFamilyAuditReport, 'markdown'> = {
    reportType: 'scanner_discord_family_phase2_audit',
    generatedAt: new Date().toISOString(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    auditDir: options.auditDir,
    outDir: options.outDir,
    since: options.since,
    currentRiskSince: options.currentRiskSince,
    receiptCount: rows.length,
    summaries,
    rows,
    findings: findingsFor(summaries, rows),
    authority: {
      readOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesDiscordCadence: false,
      changesTradingLogic: false,
      changesCanExecute: false,
    },
  };
  return {
    ...reportWithoutMarkdown,
    markdown: markdownFor(reportWithoutMarkdown),
  };
}

async function main() {
  const options = parseScannerDiscordFamilyAuditArgs();
  const report = await buildScannerDiscordFamilyAuditReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const base = `scanner-discord-family-phase2-${options.tradeDate}-${options.instrument}`;
  const jsonPath = path.join(options.outDir, `${base}.json`);
  const mdPath = path.join(options.outDir, `${base}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, report.markdown);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ jsonPath, mdPath, since: report.since, currentRiskSince: report.currentRiskSince, receiptCount: report.receiptCount, summaries: report.summaries, findings: report.findings }, null, 2)}\n`);
  } else {
    console.log(`Scanner Discord family Phase 2 audit written: ${mdPath}`);
    console.log(`Receipts reviewed: ${report.receiptCount}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
