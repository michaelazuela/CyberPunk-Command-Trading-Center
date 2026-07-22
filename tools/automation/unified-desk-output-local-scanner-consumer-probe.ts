import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputLocalScannerConsumerProbe,
  type UnifiedDeskOutputLocalScannerConsumerProbe,
  type UnifiedDeskOutputNormalScannerSnapshot,
} from '../../src/lib/unifiedDeskOutputLocalScannerConsumerProbe';
import type { UnifiedDeskOutputDisabledE2ERuntimeValidationReport } from '../../src/lib/unifiedDeskOutputDisabledScannerRuntime';

type SessionName = 'morning' | 'lunch';

interface ScannerDecisionTapeEvent {
  plan?: {
    canExecute?: boolean | null;
  } | null;
  deskPublishDecision?: {
    shouldPost?: boolean | null;
    canExecute?: boolean | null;
  } | null;
  discord?: {
    shouldSend?: boolean | null;
    publishDecision?: {
      shouldPost?: boolean | null;
      canExecute?: boolean | null;
    } | null;
  } | null;
}

interface ScannerDecisionTape {
  events?: Record<string, ScannerDecisionTapeEvent>;
}

interface ConsumerProbeReport {
  reportType: 'unified_desk_output_local_scanner_consumer_probe_report';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedScannerArtifactsOnly: true;
    readsSavedDisabledE2EReportOnly: true;
    writesDiagnosticArtifactsOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesNormalScannerOutput: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    scannerAuditDir: string;
    scannerDecisionTapePaths: string[];
    disabledE2EReportPath: string;
    instrument: string;
    tradeDate: string | null;
    sessions: SessionName[];
  };
  summary: {
    defaultStatus: 'disabled' | 'ready' | 'blocked';
    localPreviewStatus: 'disabled' | 'ready' | 'blocked';
    defaultScannerPreviewRows: number;
    localScannerPreviewRows: number;
    morningRows: number;
    lunchRows: number;
    normalScannerEventsRead: number;
    normalShouldPostRowsPreserved: number;
    normalCanExecuteTrueRowsPreserved: number;
    normalDiscordSendRowsPreserved: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_disabled_local_scanner_preview_render' | 'hold_for_local_scanner_consumer_probe_fix';
  };
  defaultProbe: UnifiedDeskOutputLocalScannerConsumerProbe;
  localProbe: UnifiedDeskOutputLocalScannerConsumerProbe;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  scannerAuditDir: string;
  outDir: string;
  disabledE2EReportPath: string | null;
  instrument: string;
  tradeDate: string | null;
  sessions: SessionName[];
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SCANNER_AUDIT_DIR = path.join(__dirname, 'discord-audit');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseSessions(value: string | null): SessionName[] {
  if (!value) return ['morning', 'lunch'];
  return value.split(',')
    .map((item) => item.trim())
    .filter((item): item is SessionName => item === 'morning' || item === 'lunch');
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    scannerAuditDir: readFlag(args, '--scanner-audit-dir') || DEFAULT_SCANNER_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    disabledE2EReportPath: readFlag(args, '--disabled-e2e-report'),
    instrument: readFlag(args, '--instrument') || 'MES',
    tradeDate: readFlag(args, '--trade-date'),
    sessions: parseSessions(readFlag(args, '--sessions')),
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function latestTapeFor(args: {
  scannerAuditDir: string;
  tradeDate: string | null;
  instrument: string;
  session: SessionName;
}): string | null {
  if (!fs.existsSync(args.scannerAuditDir)) return null;
  return fs.readdirSync(args.scannerAuditDir)
    .filter((name) => name.startsWith('scanner-decision-tape-') && name.endsWith(`-${args.instrument}-${args.session}.json`))
    .filter((name) => !args.tradeDate || name === `scanner-decision-tape-${args.tradeDate}-${args.instrument}-${args.session}.json`)
    .map((name) => path.join(args.scannerAuditDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function normalSnapshotFromTapes(tapePaths: string[]): UnifiedDeskOutputNormalScannerSnapshot {
  let scannerEventsRead = 0;
  let normalShouldPostRows = 0;
  let normalCanExecuteTrueRows = 0;
  let normalDiscordSendRows = 0;
  for (const tapePath of tapePaths) {
    const tape = readJson<ScannerDecisionTape>(tapePath);
    for (const event of Object.values(tape.events || {})) {
      scannerEventsRead += 1;
      const decision = event.deskPublishDecision || event.discord?.publishDecision || null;
      if (decision?.shouldPost) normalShouldPostRows += 1;
      if (event.discord?.shouldSend) normalDiscordSendRows += 1;
      if (decision?.canExecute || event.plan?.canExecute) normalCanExecuteTrueRows += 1;
    }
  }
  return {
    sourceOfTruth: 'normal_scanner_output_preserved',
    scannerEventsRead,
    normalShouldPostRows,
    normalCanExecuteTrueRows,
    normalDiscordSendRows,
  };
}

function buildMarkdown(report: Omit<ConsumerProbeReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Local Scanner Consumer Probe',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner consumer probe only. It reads saved scanner decision tapes plus the saved disabled E2E runtime report, then proves default-off and explicit-local-preview behavior beside preserved normal scanner output. It does not post Discord, write Supabase, read live bridge data, change normal scanner output, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Default status: ${report.summary.defaultStatus}.`,
    `- Local preview status: ${report.summary.localPreviewStatus}.`,
    `- Default scanner preview rows: ${report.summary.defaultScannerPreviewRows}.`,
    `- Local scanner preview rows: ${report.summary.localScannerPreviewRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Normal scanner events read: ${report.summary.normalScannerEventsRead}.`,
    `- Normal shouldPost rows preserved: ${report.summary.normalShouldPostRowsPreserved}.`,
    `- Normal canExecute=true rows preserved: ${report.summary.normalCanExecuteTrueRowsPreserved}.`,
    `- Normal Discord-send rows preserved: ${report.summary.normalDiscordSendRowsPreserved}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Scanner-runtime changed rows: ${report.summary.scannerRuntimeChangedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Preview Rows',
    '| Session | Model | Direction | Proof ET | Levels |',
    '|---|---|---|---:|---|',
    ...report.localProbe.preview.rows.map((row) => `| ${row.session} | ${row.model} | ${row.direction} | ${row.proofLine.replace('Completed 5M proof: ', '').replace(' ET.', '')} | ${row.levelLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputLocalScannerConsumerProbeReport(args: {
  scannerAuditDir: string;
  tapePaths: string[];
  disabledE2EReportPath: string;
  disabledE2EReport: UnifiedDeskOutputDisabledE2ERuntimeValidationReport | null;
  instrument: string;
  tradeDate: string | null;
  sessions: SessionName[];
}, generatedAt = new Date().toISOString()): ConsumerProbeReport {
  const normalScannerOutput = normalSnapshotFromTapes(args.tapePaths);
  const defaultProbe = buildUnifiedDeskOutputLocalScannerConsumerProbe({
    explicitLocalPreviewFlag: false,
    localHost: true,
    disabledE2EReport: args.disabledE2EReport,
    normalScannerOutput,
  });
  const localProbe = buildUnifiedDeskOutputLocalScannerConsumerProbe({
    explicitLocalPreviewFlag: true,
    localHost: true,
    disabledE2EReport: args.disabledE2EReport,
    normalScannerOutput,
  });
  const blockers = [
    args.tapePaths.length === args.sessions.length ? null : 'Missing one or more scanner decision tapes for requested sessions.',
    defaultProbe.status === 'disabled' ? null : `Default scanner consumer probe status is ${defaultProbe.status}.`,
    defaultProbe.summary.scannerPreviewRows === 0 ? null : 'Default scanner consumer probe produced preview rows.',
    localProbe.status === 'ready' ? null : `Explicit local scanner consumer probe status is ${localProbe.status}.`,
    localProbe.summary.scannerPreviewRows === 2 ? null : 'Explicit local scanner consumer probe did not produce exactly two preview rows.',
    localProbe.summary.morningRows === 1 ? null : 'Explicit local scanner consumer probe did not produce one morning row.',
    localProbe.summary.lunchRows === 1 ? null : 'Explicit local scanner consumer probe did not produce one lunch row.',
    localProbe.summary.discordPostRows === 0 ? null : 'Consumer probe produced Discord-post rows.',
    localProbe.summary.supabaseWriteRows === 0 ? null : 'Consumer probe produced Supabase-write rows.',
    localProbe.summary.liveSupabaseReadRows === 0 ? null : 'Consumer probe produced live-Supabase-read rows.',
    localProbe.summary.liveBridgeReadRows === 0 ? null : 'Consumer probe produced live-bridge-read rows.',
    localProbe.summary.canExecuteTrueRows === 0 ? null : 'Consumer probe produced canExecute=true rows.',
    localProbe.summary.canExecuteChangedRows === 0 ? null : 'Consumer probe changed canExecute.',
    localProbe.summary.tradingLogicChangedRows === 0 ? null : 'Consumer probe changed trading logic.',
    localProbe.summary.automatedOrderRows === 0 ? null : 'Consumer probe produced automated-order rows.',
    ...localProbe.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<ConsumerProbeReport, 'markdown'> = {
    reportType: 'unified_desk_output_local_scanner_consumer_probe_report',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedScannerArtifactsOnly: true,
      readsSavedDisabledE2EReportOnly: true,
      writesDiagnosticArtifactsOnly: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesNormalScannerOutput: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      scannerAuditDir: args.scannerAuditDir,
      scannerDecisionTapePaths: args.tapePaths,
      disabledE2EReportPath: args.disabledE2EReportPath,
      instrument: args.instrument,
      tradeDate: args.tradeDate,
      sessions: args.sessions,
    },
    summary: {
      defaultStatus: defaultProbe.status,
      localPreviewStatus: localProbe.status,
      defaultScannerPreviewRows: defaultProbe.summary.scannerPreviewRows,
      localScannerPreviewRows: localProbe.summary.scannerPreviewRows,
      morningRows: localProbe.summary.morningRows,
      lunchRows: localProbe.summary.lunchRows,
      normalScannerEventsRead: normalScannerOutput.scannerEventsRead,
      normalShouldPostRowsPreserved: normalScannerOutput.normalShouldPostRows,
      normalCanExecuteTrueRowsPreserved: normalScannerOutput.normalCanExecuteTrueRows,
      normalDiscordSendRowsPreserved: normalScannerOutput.normalDiscordSendRows,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_local_scanner_consumer_probe_fix' : 'ready_for_disabled_local_scanner_preview_render',
    },
    defaultProbe,
    localProbe,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputLocalScannerConsumerProbeReport(
  report: ConsumerProbeReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-local-scanner-consumer-probe-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-local-scanner-consumer-probe-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const scannerAuditDir = path.resolve(options.scannerAuditDir);
  const outDir = path.resolve(options.outDir);
  const tapePaths = options.sessions
    .map((session) => latestTapeFor({
      scannerAuditDir,
      tradeDate: options.tradeDate,
      instrument: options.instrument,
      session,
    }))
    .filter((item): item is string => Boolean(item));
  const disabledE2EReportPath = path.resolve(options.disabledE2EReportPath ||
    latestMatchingFile(outDir, /^unified-desk-output-disabled-e2e-runtime-validation-\d+\.json$/) ||
    '');
  if (!fs.existsSync(disabledE2EReportPath)) throw new Error('Missing Unified Desk Output disabled E2E runtime validation report path.');
  const report = buildUnifiedDeskOutputLocalScannerConsumerProbeReport({
    scannerAuditDir,
    tapePaths,
    disabledE2EReportPath,
    disabledE2EReport: readJson<UnifiedDeskOutputDisabledE2ERuntimeValidationReport>(disabledE2EReportPath),
    instrument: options.instrument,
    tradeDate: options.tradeDate,
    sessions: options.sessions,
  });
  const written = writeUnifiedDeskOutputLocalScannerConsumerProbeReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      previewRows: report.localProbe.preview.rows,
      blockers: report.blockers.slice(0, 20),
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
