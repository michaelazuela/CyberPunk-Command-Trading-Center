import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ScannerSession = 'morning' | 'lunch' | 'evening';
type ParityStatus = 'pass' | 'blocked';
type FlowStageStatus = 'pass' | 'warn' | 'blocked' | 'not_comparable';

interface ReplayOptions {
  dates: string[];
  instrument: string;
  sessions: ScannerSession[];
  auditDir: string;
  outDir: string;
  json: boolean;
}

interface TapeEvent {
  time?: string | null;
  completed5m?: Record<string, unknown> | null;
  setupCandidateStatus?: {
    selected?: Record<string, unknown> | null;
  } | null;
  deskPublishDecision?: Record<string, unknown> | null;
  scannerDeskOutput?: Record<string, unknown> | null;
  discord?: {
    shouldSend?: boolean | null;
    publishDecision?: Record<string, unknown> | null;
  } | null;
  visibility?: Record<string, unknown> | null;
  deskState?: Record<string, unknown> | null;
}

interface ScannerDecisionTape {
  reportType?: string;
  tradeDate?: string;
  instrument?: string;
  session?: string;
  events?: Record<string, TapeEvent>;
}

export interface ScannerDeskOutputLiveFlowParityRow {
  tradeDate: string;
  session: ScannerSession;
  eventTime: string;
  hasCompleted5m: boolean;
  selectedModel: string | null;
  selectedDirection: string | null;
  oldTradeAlertShouldSend: boolean;
  deskPublishShouldPost: boolean;
  scannerOutputPresent: boolean;
  scannerOutputStatus: string | null;
  scannerOutputPublishToDiscord: boolean | null;
  scannerOutputOperatorCode: string | null;
  scannerOutputPipeline: string | null;
  scannerOutputAuthorityClean: boolean | null;
  tradeAlertParity: FlowStageStatus;
  deskPublishParity: FlowStageStatus;
  liveFlowDisposition: 'post_trade_alert' | 'post_desk_plan_or_review' | 'hold_local' | 'not_comparable';
  notes: string[];
}

export interface ScannerDeskOutputLiveFlowParityReplayReport {
  reportType: 'scanner_desk_output_live_flow_parity_replay';
  generatedAt: string;
  status: ParityStatus;
  source: {
    auditDir: string;
    dates: string[];
    instrument: string;
    sessions: ScannerSession[];
    sourceTapes: string[];
  };
  authority: {
    readOnly: true;
    readsSavedScannerArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    automatedOrders: false;
  };
  summary: {
    tapesReviewed: number;
    eventsReviewed: number;
    comparableRows: number;
    preContractRows: number;
    oldTradeAlertSendRows: number;
    deskPublishShouldPostRows: number;
    scannerOutputPublishRows: number;
    tradeAlertParityMismatchRows: number;
    deskPublishDivergenceRows: number;
    authorityViolationRows: number;
    blockingMismatchRows: number;
    nextRecommendedBranch: 'desk_play_pre_delivery_hold' | 'none_until_mismatches_are_fixed';
  };
  rows: ScannerDeskOutputLiveFlowParityRow[];
  blockers: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const ALL_SESSIONS: ScannerSession[] = ['morning', 'lunch', 'evening'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseCsv(raw: string | null): string[] {
  return (raw || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function parseSessions(raw: string | null): ScannerSession[] {
  if (!raw || raw.toLowerCase() === 'all') return ALL_SESSIONS;
  const sessions = parseCsv(raw.toLowerCase());
  for (const session of sessions) {
    if (session !== 'morning' && session !== 'lunch' && session !== 'evening') {
      throw new Error('--sessions must contain morning,lunch,evening, or all.');
    }
  }
  return [...new Set(sessions)] as ScannerSession[];
}

function etDate(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function parseScannerDeskOutputLiveFlowParityReplayArgs(args = process.argv.slice(2)): ReplayOptions {
  const dates = parseCsv(readFlag(args, '--dates'));
  return {
    dates: dates.length ? dates : [etDate(-1), etDate(0)],
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    sessions: parseSessions(readFlag(args, '--sessions')),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function eventTime(key: string, event: TapeEvent): string {
  const raw = event.time || stringOrNull(event.completed5m?.time) || key;
  return raw.replace('.0000000', '');
}

function candidateModel(event: TapeEvent): string | null {
  return stringOrNull(event.setupCandidateStatus?.selected?.setupType) ||
    stringOrNull(event.deskPublishDecision?.setupType) ||
    stringOrNull(event.discord?.publishDecision?.setupType) ||
    stringOrNull(event.scannerDeskOutput?.model);
}

function candidateDirection(event: TapeEvent): string | null {
  return stringOrNull(event.setupCandidateStatus?.selected?.direction) ||
    stringOrNull(event.deskPublishDecision?.direction) ||
    stringOrNull(event.discord?.publishDecision?.direction) ||
    stringOrNull(event.scannerDeskOutput?.direction);
}

function scannerOutputAuthorityClean(output: Record<string, unknown> | null): boolean | null {
  if (!output) return null;
  const authority = asRecord(output.authority);
  return authority.changesTradingLogic === false &&
    authority.changesCanExecute === false &&
    authority.changesEntryStopTargets === false &&
    authority.changesDiscordPolicy === false;
}

function rowFromEvent(args: {
  tradeDate: string;
  session: ScannerSession;
  key: string;
  event: TapeEvent;
}): ScannerDeskOutputLiveFlowParityRow {
  const output = asRecord(args.event.scannerDeskOutput);
  const outputPresent = Object.keys(output).length > 0;
  const oldTradeAlertShouldSend = boolValue(args.event.discord?.shouldSend);
  const publishDecision = asRecord(args.event.deskPublishDecision || args.event.discord?.publishDecision);
  const deskPublishShouldPost = boolValue(publishDecision.shouldPost);
  const outputPublish = outputPresent ? boolValue(output.publishToDiscord) : null;
  const authorityClean = outputPresent ? scannerOutputAuthorityClean(output) : null;
  const tradeAlertParity: FlowStageStatus = !outputPresent
    ? 'not_comparable'
    : outputPublish === oldTradeAlertShouldSend
      ? 'pass'
      : 'blocked';
  const deskPublishParity: FlowStageStatus = !outputPresent
    ? 'not_comparable'
    : outputPublish === deskPublishShouldPost
      ? 'pass'
      : deskPublishShouldPost
        ? 'warn'
        : 'pass';
  const notes: string[] = [];
  if (!outputPresent) notes.push('pre_contract_or_missing_scannerDeskOutput: saved row cannot prove unified-output parity.');
  if (tradeAlertParity === 'blocked') notes.push('blocking_mismatch: scannerDeskOutput.publishToDiscord disagrees with legacy trade_alert shouldSend.');
  if (deskPublishParity === 'warn') notes.push('desk_publish_divergence: DeskPublishDecision would post a desk-plan/review path while scannerDeskOutput publish flag follows legacy trade_alert.');
  if (authorityClean === false) notes.push('authority_violation: scannerDeskOutput authority flags are not clean.');

  const liveFlowDisposition = !outputPresent
    ? 'not_comparable'
    : outputPublish
      ? 'post_trade_alert'
      : deskPublishShouldPost
        ? 'post_desk_plan_or_review'
        : 'hold_local';

  return {
    tradeDate: args.tradeDate,
    session: args.session,
    eventTime: eventTime(args.key, args.event),
    hasCompleted5m: Boolean(args.event.completed5m),
    selectedModel: candidateModel(args.event),
    selectedDirection: candidateDirection(args.event),
    oldTradeAlertShouldSend,
    deskPublishShouldPost,
    scannerOutputPresent: outputPresent,
    scannerOutputStatus: outputPresent ? stringOrNull(output.status) : null,
    scannerOutputPublishToDiscord: outputPublish,
    scannerOutputOperatorCode: outputPresent ? stringOrNull(output.operatorCode) : null,
    scannerOutputPipeline: outputPresent ? stringOrNull(output.pipeline) : null,
    scannerOutputAuthorityClean: authorityClean,
    tradeAlertParity,
    deskPublishParity,
    liveFlowDisposition,
    notes,
  };
}

async function loadTape(filePath: string): Promise<ScannerDecisionTape> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as ScannerDecisionTape;
}

function tapePath(options: ReplayOptions, tradeDate: string, session: ScannerSession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${tradeDate}-${options.instrument}-${session}.json`);
}

function renderMarkdown(report: Omit<ScannerDeskOutputLiveFlowParityReplayReport, 'markdown'>): string {
  const lines = [
    '# Scanner Desk Output Live-Flow Parity Replay',
    '',
    `Status: ${report.status}`,
    `Dates: ${report.source.dates.join(', ')}`,
    `Instrument: ${report.source.instrument}`,
    `Sessions: ${report.source.sessions.join(', ')}`,
    '',
    'Read-only live-flow replay from saved scanner decision tapes. It follows: 5M candle -> selected candidate -> DeskPublishDecision -> scannerDeskOutput -> legacy trade-alert parity -> Discord boundary disposition. It does not post Discord, write Supabase, read live bridge data, change scanner state, change trading logic, change canExecute, or alter entry/stop/targets.',
    '',
    '## Summary',
    '',
    `- Tapes reviewed: ${report.summary.tapesReviewed}`,
    `- Events reviewed: ${report.summary.eventsReviewed}`,
    `- Comparable rows with scannerDeskOutput: ${report.summary.comparableRows}`,
    `- Pre-contract/not-comparable rows: ${report.summary.preContractRows}`,
    `- Legacy trade-alert send rows: ${report.summary.oldTradeAlertSendRows}`,
    `- DeskPublishDecision should-post rows: ${report.summary.deskPublishShouldPostRows}`,
    `- scannerDeskOutput publish rows: ${report.summary.scannerOutputPublishRows}`,
    `- Trade-alert parity mismatches: ${report.summary.tradeAlertParityMismatchRows}`,
    `- Desk publish divergences: ${report.summary.deskPublishDivergenceRows}`,
    `- Authority violations: ${report.summary.authorityViolationRows}`,
    `- Blocking mismatches: ${report.summary.blockingMismatchRows}`,
    `- Next recommended branch: ${report.summary.nextRecommendedBranch}`,
    '',
    '## Blocking Rows',
    '',
  ];
  const blockingRows = report.rows.filter((row) => row.tradeAlertParity === 'blocked' || row.scannerOutputAuthorityClean === false);
  if (!blockingRows.length) {
    lines.push('- None.');
  } else {
    for (const row of blockingRows) {
      lines.push(`- ${row.tradeDate} ${row.session} ${row.eventTime}: oldTradeAlert=${row.oldTradeAlertShouldSend}, scannerOutput=${row.scannerOutputPublishToDiscord}, status=${row.scannerOutputStatus}, notes=${row.notes.join('; ')}`);
    }
  }
  lines.push('', '## Desk Publish Divergences', '');
  const divergences = report.rows.filter((row) => row.deskPublishParity === 'warn').slice(0, 25);
  if (!divergences.length) {
    lines.push('- None.');
  } else {
    for (const row of divergences) {
      lines.push(`- ${row.tradeDate} ${row.session} ${row.eventTime}: ${row.selectedModel || 'N/A'} ${row.selectedDirection || 'N/A'}; DeskPublishDecision shouldPost=true while scannerDeskOutput publishToDiscord=false. Disposition=${row.liveFlowDisposition}.`);
    }
  }
  lines.push('', '## Sample Flow Rows', '', '| Date | Session | Time | Model | Side | Old alert | Desk post | Output | Status | Disposition |', '|---|---|---:|---|---|---:|---:|---:|---|---|');
  for (const row of report.rows.filter((item) => item.scannerOutputPresent).slice(-20)) {
    lines.push(`| ${row.tradeDate} | ${row.session} | ${row.eventTime.slice(11, 16)} | ${row.selectedModel || 'N/A'} | ${row.selectedDirection || 'N/A'} | ${row.oldTradeAlertShouldSend} | ${row.deskPublishShouldPost} | ${row.scannerOutputPublishToDiscord} | ${row.scannerOutputStatus || 'N/A'} | ${row.liveFlowDisposition} |`);
  }
  lines.push('', '## Blockers', '');
  if (!report.blockers.length) {
    lines.push('- None.');
  } else {
    lines.push(...report.blockers.map((blocker) => `- ${blocker}`));
  }
  return `${lines.join('\n')}\n`;
}

export async function buildScannerDeskOutputLiveFlowParityReplayReport(options: ReplayOptions): Promise<ScannerDeskOutputLiveFlowParityReplayReport> {
  const sourceTapes: string[] = [];
  const rows: ScannerDeskOutputLiveFlowParityRow[] = [];

  for (const tradeDate of options.dates) {
    for (const session of options.sessions) {
      const filePath = tapePath(options, tradeDate, session);
      if (!existsSync(filePath)) continue;
      sourceTapes.push(filePath);
      const tape = await loadTape(filePath);
      const events = Object.entries(tape.events || {})
        .sort((a, b) => eventTime(a[0], a[1]).localeCompare(eventTime(b[0], b[1])));
      for (const [key, event] of events) {
        rows.push(rowFromEvent({
          tradeDate: tape.tradeDate || tradeDate,
          session,
          key,
          event,
        }));
      }
    }
  }

  const summary: ScannerDeskOutputLiveFlowParityReplayReport['summary'] = {
    tapesReviewed: sourceTapes.length,
    eventsReviewed: rows.length,
    comparableRows: rows.filter((row) => row.scannerOutputPresent).length,
    preContractRows: rows.filter((row) => !row.scannerOutputPresent).length,
    oldTradeAlertSendRows: rows.filter((row) => row.oldTradeAlertShouldSend).length,
    deskPublishShouldPostRows: rows.filter((row) => row.deskPublishShouldPost).length,
    scannerOutputPublishRows: rows.filter((row) => row.scannerOutputPublishToDiscord).length,
    tradeAlertParityMismatchRows: rows.filter((row) => row.tradeAlertParity === 'blocked').length,
    deskPublishDivergenceRows: rows.filter((row) => row.deskPublishParity === 'warn').length,
    authorityViolationRows: rows.filter((row) => row.scannerOutputAuthorityClean === false).length,
    blockingMismatchRows: rows.filter((row) => row.tradeAlertParity === 'blocked' || row.scannerOutputAuthorityClean === false).length,
    nextRecommendedBranch: 'none_until_mismatches_are_fixed',
  };
  summary.nextRecommendedBranch = summary.blockingMismatchRows === 0
    ? 'desk_play_pre_delivery_hold'
    : 'none_until_mismatches_are_fixed';

  const blockers = [
    sourceTapes.length ? null : 'No scanner decision tapes were found for the requested dates/sessions.',
    summary.comparableRows > 0 ? null : 'No rows with scannerDeskOutput were found; replay cannot prove unified-output parity.',
    summary.tradeAlertParityMismatchRows === 0 ? null : `${summary.tradeAlertParityMismatchRows} rows disagree between legacy trade_alert shouldSend and scannerDeskOutput.publishToDiscord.`,
    summary.authorityViolationRows === 0 ? null : `${summary.authorityViolationRows} scannerDeskOutput rows have dirty authority flags.`,
  ].filter((item): item is string => Boolean(item));

  const reportWithoutMarkdown: Omit<ScannerDeskOutputLiveFlowParityReplayReport, 'markdown'> = {
    reportType: 'scanner_desk_output_live_flow_parity_replay',
    generatedAt: new Date().toISOString(),
    status: blockers.length ? 'blocked' : 'pass',
    source: {
      auditDir: options.auditDir,
      dates: options.dates,
      instrument: options.instrument,
      sessions: options.sessions,
      sourceTapes,
    },
    authority: {
      readOnly: true,
      readsSavedScannerArtifactsOnly: true,
      writesDiagnosticArtifactsOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    summary,
    rows,
    blockers,
  };
  const report = { ...reportWithoutMarkdown, markdown: renderMarkdown(reportWithoutMarkdown) };
  await fs.mkdir(options.outDir, { recursive: true });
  const stamp = Date.now();
  const base = path.join(options.outDir, `scanner-desk-output-live-flow-parity-${options.instrument}-${stamp}`);
  await fs.writeFile(`${base}.json`, JSON.stringify(report, null, 2));
  await fs.writeFile(`${base}.md`, report.markdown);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseScannerDeskOutputLiveFlowParityReplayArgs();
  buildScannerDeskOutputLiveFlowParityReplayReport(options)
    .then((report) => {
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log(report.markdown);
      }
      process.exitCode = report.status === 'pass' ? 0 : 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
