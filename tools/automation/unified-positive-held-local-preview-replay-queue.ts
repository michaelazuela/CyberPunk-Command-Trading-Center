import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveGuardedScannerReplayReport } from './unified-positive-guarded-scanner-replay';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveHeldLocalPreviewDecisionSummaryReport } from './unified-positive-held-local-preview-decision-summary';
import type { UnifiedPositiveHeldLocalPreviewPayloadReport } from './unified-positive-held-local-preview-payload';

type Direction = 'LONG' | 'SHORT';

export interface UnifiedPositiveHeldLocalPreviewReplayQueueRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  sourceSnapshotId: string | null;
  replayStatus: 'ready_for_read_only_outcome_replay' | 'blocked';
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
  t1R: number | null;
  t2R: number | null;
  oneMesPlStatus: 'available' | 'not_available_in_local_artifacts';
  oneMesPl: number | null;
  evidence: {
    decisionQueued: boolean;
    adapterArtifactCreated: boolean;
    guardedReplayPass: boolean;
    previewPayloadPass: boolean;
    zeroLivePublishBehaviorChange: boolean;
    canExecute: false | null;
    publishDiscord: false | null;
    shouldPost: false | null;
    writesSupabase: false | null;
  };
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewReplayQueueReport {
  reportType: 'unified_positive_held_local_preview_replay_queue';
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
    decisionSummaryPath: string | null;
    heldLocalAdapterPath: string | null;
    guardedReplayPath: string | null;
    previewPayloadPath: string | null;
  };
  summary: {
    decisionRows: number;
    queuedRows: number;
    replayReadyRows: number;
    blockedRows: number;
    grossOneMesPlAvailableRows: number;
    grossOneMesPlUnavailableRows: number;
    grossOneMesPl: number | null;
    livePromotionAllowedRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewReplayQueueRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewReplayQueueReport['authority'] {
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseTicketId(ticketId: string): { tradeDate: string; session: string; setupType: string; direction: Direction } {
  const match = /^(\d{4}-\d{2}-\d{2})-([^-]+)-(.+)-(LONG|SHORT)$/.exec(ticketId);
  if (!match) {
    return {
      tradeDate: 'unknown',
      session: 'unknown',
      setupType: 'unknown',
      direction: 'LONG',
    };
  }
  return {
    tradeDate: match[1],
    session: match[2],
    setupType: match[3],
    direction: match[4] as Direction,
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const numeric = numberOrNull(value);
    if (numeric !== null) return numeric;
  }
  return null;
}

function plFromLocalArtifacts(...sources: Array<Record<string, unknown> | null | undefined>): number | null {
  for (const source of sources) {
    if (!source) continue;
    const direct = firstNumber(
      source.oneMesPl,
      source.oneMesProfitLoss,
      source.grossOneMesPl,
      source.pnl,
      source.pl,
    );
    if (direct !== null) return direct;
  }
  return null;
}

function levelR(args: {
  direction: Direction;
  entry: number | null;
  stop: number | null;
  target: number | null;
}): number | null {
  if (args.entry === null || args.stop === null || args.target === null) return null;
  const risk = Math.abs(args.entry - args.stop);
  if (risk <= 0) return null;
  return args.direction === 'LONG'
    ? round((args.target - args.entry) / risk)
    : round((args.entry - args.target) / risk);
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayQueueReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Replay Queue',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay queue evidence. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Decision rows: ${report.summary.decisionRows}.`,
    `- Queued rows: ${report.summary.queuedRows}.`,
    `- Replay-ready rows: ${report.summary.replayReadyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- One-MES P/L available rows: ${report.summary.grossOneMesPlAvailableRows}.`,
    `- One-MES P/L unavailable rows: ${report.summary.grossOneMesPlUnavailableRows}.`,
    `- Gross one-MES P/L: ${report.summary.grossOneMesPl ?? 'not available'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Ticket | Date | Session | Setup | Side | Replay Status | Entry | Stop | T1 | T2 | Risk | T1R | T2R | One-MES P/L | Blockers |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.replayStatus} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.t1 ?? '-'} | ${row.t2 ?? '-'} | ${row.riskPoints ?? '-'} | ${row.t1R ?? '-'} | ${row.t2R ?? '-'} | ${row.oneMesPl ?? row.oneMesPlStatus} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReplayQueueReport(args: {
  decisionSummaryPath: string | null;
  decisionSummaryReport: UnifiedPositiveHeldLocalPreviewDecisionSummaryReport | null;
  heldLocalAdapterPath: string | null;
  heldLocalAdapterReport: UnifiedPositiveHeldLocalTicketAdapterReport | null;
  guardedReplayPath: string | null;
  guardedReplayReport: UnifiedPositiveGuardedScannerReplayReport | null;
  previewPayloadPath: string | null;
  previewPayloadReport: UnifiedPositiveHeldLocalPreviewPayloadReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayQueueReport {
  const decisionRows = args.decisionSummaryReport?.rows || [];
  const queuedRows = decisionRows.filter((row) => row.decisionAction === 'queue_for_replay_research');
  const adapterByTicket = new Map((args.heldLocalAdapterReport?.rows || []).map((row) => [row.ticketId, row]));
  const payloadByTicket = new Map((args.previewPayloadReport?.rows || []).map((row) => [row.ticketId, row]));
  const guardedReplayPass = args.guardedReplayReport?.status === 'pass';
  const zeroLivePublishBehaviorChange = Boolean(
    args.guardedReplayReport?.summary.zeroLivePublishBehaviorChangeRows &&
    args.guardedReplayReport.summary.zeroLivePublishBehaviorChangeRows >= queuedRows.length,
  );

  const rows: UnifiedPositiveHeldLocalPreviewReplayQueueRow[] = queuedRows.map((decisionRow) => {
    const parsed = parseTicketId(decisionRow.ticketId);
    const adapterRow = adapterByTicket.get(decisionRow.ticketId);
    const payloadRow = payloadByTicket.get(decisionRow.ticketId);
    const artifact = adapterRow?.artifact || null;
    const payload = payloadRow?.payload || null;
    const direction = decisionRow.direction === 'SHORT' ? 'SHORT' : 'LONG';
    const entry = firstNumber(payload?.levels.entry, artifact?.deskTicket.entry, artifact?.deskPublishDecision.entry);
    const stop = firstNumber(payload?.levels.stop, artifact?.deskTicket.stop, artifact?.deskPublishDecision.stop);
    const t1 = firstNumber(payload?.levels.t1, artifact?.deskTicket.t1, artifact?.deskPublishDecision.t1);
    const t2 = firstNumber(payload?.levels.t2, artifact?.deskTicket.t2, artifact?.deskPublishDecision.t2);
    const riskPoints = entry !== null && stop !== null && Math.abs(entry - stop) > 0
      ? round(Math.abs(entry - stop))
      : null;
    const oneMesPl = plFromLocalArtifacts(
      decisionRow as unknown as Record<string, unknown>,
      adapterRow as unknown as Record<string, unknown>,
      artifact as unknown as Record<string, unknown>,
      payloadRow as unknown as Record<string, unknown>,
      payload as unknown as Record<string, unknown>,
    );
    const evidence = {
      decisionQueued: true,
      adapterArtifactCreated: adapterRow?.adapterStatus === 'held_local_artifact_created' && Boolean(artifact),
      guardedReplayPass,
      previewPayloadPass: args.previewPayloadReport?.status === 'pass' && payloadRow?.status === 'preview_payload_created' && Boolean(payload),
      zeroLivePublishBehaviorChange,
      canExecute: artifact?.canExecute === false && payload?.canExecute === false ? false as const : null,
      publishDiscord: artifact?.publishDiscord === false && payload?.publishDiscord === false ? false as const : null,
      shouldPost: artifact?.deskPublishDecision.shouldPost === false && payload?.shouldPost === false ? false as const : null,
      writesSupabase: payload?.writesSupabase === false ? false as const : null,
    };
    const blockers = [
      evidence.adapterArtifactCreated ? null : 'missing held-local adapter artifact',
      evidence.guardedReplayPass ? null : 'guarded scanner replay did not pass',
      evidence.previewPayloadPass ? null : 'preview payload did not pass',
      evidence.zeroLivePublishBehaviorChange ? null : 'zero live publish behavior change proof is missing',
      evidence.canExecute === false ? null : 'canExecute=false proof is missing',
      evidence.publishDiscord === false ? null : 'publishDiscord=false proof is missing',
      evidence.shouldPost === false ? null : 'shouldPost=false proof is missing',
      evidence.writesSupabase === false ? null : 'writesSupabase=false proof is missing',
      entry === null ? 'missing entry level' : null,
      stop === null ? 'missing stop level' : null,
      t1 === null ? 'missing T1 level' : null,
      t2 === null ? 'missing T2 level' : null,
      riskPoints === null ? 'missing positive entry-to-stop risk' : null,
      ...adapterRow?.blockers || [],
      ...payloadRow?.blockers || [],
    ].filter((item): item is string => Boolean(item));
    return {
      ticketId: decisionRow.ticketId,
      tradeDate: parsed.tradeDate,
      session: parsed.session,
      setupType: decisionRow.setupType || parsed.setupType,
      direction,
      sourceSnapshotId: adapterRow?.sourceSnapshotId || payloadRow?.sourceSnapshotId || null,
      replayStatus: blockers.length ? 'blocked' : 'ready_for_read_only_outcome_replay',
      entry,
      stop,
      t1,
      t2,
      riskPoints,
      t1R: levelR({ direction, entry, stop, target: t1 }),
      t2R: levelR({ direction, entry, stop, target: t2 }),
      oneMesPlStatus: oneMesPl === null ? 'not_available_in_local_artifacts' : 'available',
      oneMesPl,
      evidence,
      blockers,
    };
  });

  const grossOneMesPlValues = rows.map((row) => row.oneMesPl).filter((value): value is number => value !== null);
  const topLevelBlockers = [
    !args.decisionSummaryPath ? 'missing decision summary path' : null,
    !args.decisionSummaryReport ? 'missing decision summary report' : null,
    args.decisionSummaryReport && args.decisionSummaryReport.status !== 'pass' ? `decision summary status ${args.decisionSummaryReport.status}` : null,
    args.decisionSummaryReport && args.decisionSummaryReport.summary.livePromotionAllowedRows !== 0 ? `decision summary has ${args.decisionSummaryReport.summary.livePromotionAllowedRows} live-promotion rows` : null,
    !args.heldLocalAdapterPath ? 'missing held-local adapter path' : null,
    !args.heldLocalAdapterReport ? 'missing held-local adapter report' : null,
    !args.guardedReplayPath ? 'missing guarded replay path' : null,
    !args.guardedReplayReport ? 'missing guarded replay report' : null,
    args.guardedReplayReport && args.guardedReplayReport.status !== 'pass' ? `guarded replay status ${args.guardedReplayReport.status}` : null,
    !args.previewPayloadPath ? 'missing preview payload path' : null,
    !args.previewPayloadReport ? 'missing preview payload report' : null,
    args.previewPayloadReport && args.previewPayloadReport.status !== 'pass' ? `preview payload status ${args.previewPayloadReport.status}` : null,
    queuedRows.length === 0 ? 'no queued replay research rows found' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));

  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayQueueReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_queue',
    generatedAt,
    status: topLevelBlockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      decisionSummaryPath: args.decisionSummaryPath,
      heldLocalAdapterPath: args.heldLocalAdapterPath,
      guardedReplayPath: args.guardedReplayPath,
      previewPayloadPath: args.previewPayloadPath,
    },
    summary: {
      decisionRows: decisionRows.length,
      queuedRows: queuedRows.length,
      replayReadyRows: rows.filter((row) => row.replayStatus === 'ready_for_read_only_outcome_replay').length,
      blockedRows: rows.filter((row) => row.replayStatus === 'blocked').length,
      grossOneMesPlAvailableRows: rows.filter((row) => row.oneMesPlStatus === 'available').length,
      grossOneMesPlUnavailableRows: rows.filter((row) => row.oneMesPlStatus === 'not_available_in_local_artifacts').length,
      grossOneMesPl: grossOneMesPlValues.length ? round(grossOneMesPlValues.reduce((sum, value) => sum + value, 0)) : null,
      livePromotionAllowedRows: args.decisionSummaryReport?.summary.livePromotionAllowedRows || 0,
    },
    rows,
    blockers: topLevelBlockers,
    recommendations: topLevelBlockers.length
      ? ['Do not run outcome replay until the local replay queue evidence blockers are cleared.']
      : ['Replay queue is ready for the next read-only OHLC outcome pass; P/L is unavailable until an OHLC outcome runner is attached.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReplayQueueReport(
  report: UnifiedPositiveHeldLocalPreviewReplayQueueReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-replay-queue-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReplayQueueCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const decisionSummaryPath = readFlag(args, '--decision-summary') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-decision-summary-\d+\.json$/);
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter') || latestMatchingFile(outDir, /^unified-positive-held-local-ticket-adapter-\d+\.json$/);
  const guardedReplayPath = readFlag(args, '--guarded-replay') || latestMatchingFile(outDir, /^unified-positive-guarded-scanner-replay-\d+\.json$/);
  const previewPayloadPath = readFlag(args, '--preview-payload') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-payload-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReplayQueueReport({
    decisionSummaryPath,
    decisionSummaryReport: decisionSummaryPath && fs.existsSync(decisionSummaryPath)
      ? JSON.parse(fs.readFileSync(decisionSummaryPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewDecisionSummaryReport
      : null,
    heldLocalAdapterPath,
    heldLocalAdapterReport: heldLocalAdapterPath && fs.existsSync(heldLocalAdapterPath)
      ? JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport
      : null,
    guardedReplayPath,
    guardedReplayReport: guardedReplayPath && fs.existsSync(guardedReplayPath)
      ? JSON.parse(fs.readFileSync(guardedReplayPath, 'utf8')) as UnifiedPositiveGuardedScannerReplayReport
      : null,
    previewPayloadPath,
    previewPayloadReport: previewPayloadPath && fs.existsSync(previewPayloadPath)
      ? JSON.parse(fs.readFileSync(previewPayloadPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewPayloadReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReplayQueueReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewReplayQueueCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
