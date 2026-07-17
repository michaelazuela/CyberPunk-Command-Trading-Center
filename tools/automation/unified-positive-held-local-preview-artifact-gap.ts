import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Stage =
  | 'decision_summary_queued'
  | 'replay_queue_ready'
  | 'ohlc_outcome_resolved'
  | 'source_proof_accepted';

interface TicketCoverage {
  ticketId: string;
  setupType: string | null;
  direction: string | null;
  stages: Record<Stage, boolean>;
  sourceFiles: string[];
  missingNextStage: Stage | null;
}

export interface UnifiedPositiveHeldLocalPreviewArtifactGapReport {
  reportType: 'unified_positive_held_local_preview_artifact_gap';
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
    reportDir: string;
    decisionSummaryPaths: string[];
    replayQueuePaths: string[];
    ohlcOutcomePaths: string[];
    sourceProofFilterPaths: string[];
  };
  summary: {
    uniqueTickets: number;
    decisionSummaryQueuedTickets: number;
    replayQueueReadyTickets: number;
    ohlcOutcomeResolvedTickets: number;
    sourceProofAcceptedTickets: number;
    ticketsMissingReplayQueueReady: number;
    ticketsMissingOhlcOutcomeResolved: number;
    ticketsMissingSourceProofAccepted: number;
    additionalReviewedSourceProofPositiveTickets: number;
    livePromotionAllowedRows: 0;
  };
  rows: TicketCoverage[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const STAGES: Stage[] = [
  'decision_summary_queued',
  'replay_queue_ready',
  'ohlc_outcome_resolved',
  'source_proof_accepted',
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function matchingFiles(reportDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function asRows(report: Record<string, unknown>): Array<Record<string, unknown>> {
  return Array.isArray(report.rows) ? report.rows as Array<Record<string, unknown>> : [];
}

function authority(): UnifiedPositiveHeldLocalPreviewArtifactGapReport['authority'] {
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

function emptyStages(): Record<Stage, boolean> {
  return {
    decision_summary_queued: false,
    replay_queue_ready: false,
    ohlc_outcome_resolved: false,
    source_proof_accepted: false,
  };
}

function fileLabel(filePath: string): string {
  return path.basename(filePath);
}

function ensureTicket(map: Map<string, TicketCoverage>, ticketId: string, setupType: unknown, direction: unknown): TicketCoverage {
  const existing = map.get(ticketId);
  if (existing) {
    existing.setupType ||= typeof setupType === 'string' ? setupType : null;
    existing.direction ||= typeof direction === 'string' ? direction : null;
    return existing;
  }
  const row = {
    ticketId,
    setupType: typeof setupType === 'string' ? setupType : null,
    direction: typeof direction === 'string' ? direction : null,
    stages: emptyStages(),
    sourceFiles: [],
    missingNextStage: null,
  };
  map.set(ticketId, row);
  return row;
}

function markStage(args: {
  map: Map<string, TicketCoverage>;
  ticketId: unknown;
  setupType: unknown;
  direction: unknown;
  stage: Stage;
  filePath: string;
}): void {
  if (typeof args.ticketId !== 'string' || !args.ticketId) return;
  const ticket = ensureTicket(args.map, args.ticketId, args.setupType, args.direction);
  ticket.stages[args.stage] = true;
  const label = fileLabel(args.filePath);
  if (!ticket.sourceFiles.includes(label)) ticket.sourceFiles.push(label);
}

function missingNextStage(stages: Record<Stage, boolean>): Stage | null {
  return STAGES.find((stage) => !stages[stage]) || null;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewArtifactGapReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Artifact Gap',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only artifact coverage diagnostic. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Unique tickets: ${report.summary.uniqueTickets}.`,
    `- Decision-summary queued: ${report.summary.decisionSummaryQueuedTickets}.`,
    `- Replay-queue ready: ${report.summary.replayQueueReadyTickets}.`,
    `- OHLC outcome resolved: ${report.summary.ohlcOutcomeResolvedTickets}.`,
    `- Source/proof accepted: ${report.summary.sourceProofAcceptedTickets}.`,
    `- Additional reviewed source/proof-positive tickets: ${report.summary.additionalReviewedSourceProofPositiveTickets}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Queued | Replay Ready | Outcome | Source/Proof | Missing Next |',
    '|---|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.setupType ?? '-'} | ${row.direction ?? '-'} | ${row.stages.decision_summary_queued} | ${row.stages.replay_queue_ready} | ${row.stages.ohlc_outcome_resolved} | ${row.stages.source_proof_accepted} | ${row.missingNextStage ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewArtifactGapReport(args: {
  reportDir: string;
  decisionSummaryPaths: string[];
  decisionSummaryReports: Record<string, unknown>[];
  replayQueuePaths: string[];
  replayQueueReports: Record<string, unknown>[];
  ohlcOutcomePaths: string[];
  ohlcOutcomeReports: Record<string, unknown>[];
  sourceProofFilterPaths: string[];
  sourceProofFilterReports: Record<string, unknown>[];
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewArtifactGapReport {
  const tickets = new Map<string, TicketCoverage>();

  args.decisionSummaryReports.forEach((report, index) => {
    asRows(report)
      .filter((row) => row.decisionAction === 'queue_for_replay_research')
      .forEach((row) => markStage({
        map: tickets,
        ticketId: row.ticketId,
        setupType: row.setupType,
        direction: row.direction,
        stage: 'decision_summary_queued',
        filePath: args.decisionSummaryPaths[index] || 'decision-summary',
      }));
  });

  args.replayQueueReports.forEach((report, index) => {
    asRows(report)
      .filter((row) => row.replayStatus === 'ready_for_read_only_outcome_replay')
      .forEach((row) => markStage({
        map: tickets,
        ticketId: row.ticketId,
        setupType: row.setupType,
        direction: row.direction,
        stage: 'replay_queue_ready',
        filePath: args.replayQueuePaths[index] || 'replay-queue',
      }));
  });

  args.ohlcOutcomeReports.forEach((report, index) => {
    asRows(report)
      .filter((row) => row.outcomeStatus === 'resolved' && typeof row.resolvedOneMesPl === 'number' && row.resolvedOneMesPl > 0)
      .forEach((row) => markStage({
        map: tickets,
        ticketId: row.ticketId,
        setupType: row.setupType,
        direction: row.direction,
        stage: 'ohlc_outcome_resolved',
        filePath: args.ohlcOutcomePaths[index] || 'ohlc-outcome',
      }));
  });

  args.sourceProofFilterReports.forEach((report, index) => {
    asRows(report)
      .filter((row) => row.decision === 'accepted_for_research_validation')
      .forEach((row) => markStage({
        map: tickets,
        ticketId: row.rowId,
        setupType: row.setupType,
        direction: row.direction,
        stage: 'source_proof_accepted',
        filePath: args.sourceProofFilterPaths[index] || 'source-proof-filter',
      }));
  });

  const rows = [...tickets.values()]
    .map((row) => ({ ...row, missingNextStage: missingNextStage(row.stages) }))
    .sort((a, b) => a.ticketId.localeCompare(b.ticketId));
  const sourceProofAccepted = rows.filter((row) => row.stages.source_proof_accepted);
  const readyForSourceProof = rows.filter((row) => row.stages.decision_summary_queued &&
    row.stages.replay_queue_ready &&
    row.stages.ohlc_outcome_resolved &&
    !row.stages.source_proof_accepted);
  const blockers = [
    !args.decisionSummaryPaths.length ? 'no decision-summary reports found' : null,
    !args.replayQueuePaths.length ? 'no replay-queue reports found' : null,
    !args.ohlcOutcomePaths.length ? 'no OHLC outcome reports found' : null,
    !args.sourceProofFilterPaths.length ? 'no source/proof filter reports found' : null,
    rows.length === 0 ? 'no reviewed artifact tickets found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewArtifactGapReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_artifact_gap',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      decisionSummaryPaths: args.decisionSummaryPaths,
      replayQueuePaths: args.replayQueuePaths,
      ohlcOutcomePaths: args.ohlcOutcomePaths,
      sourceProofFilterPaths: args.sourceProofFilterPaths,
    },
    summary: {
      uniqueTickets: rows.length,
      decisionSummaryQueuedTickets: rows.filter((row) => row.stages.decision_summary_queued).length,
      replayQueueReadyTickets: rows.filter((row) => row.stages.replay_queue_ready).length,
      ohlcOutcomeResolvedTickets: rows.filter((row) => row.stages.ohlc_outcome_resolved).length,
      sourceProofAcceptedTickets: sourceProofAccepted.length,
      ticketsMissingReplayQueueReady: rows.filter((row) => !row.stages.replay_queue_ready).length,
      ticketsMissingOhlcOutcomeResolved: rows.filter((row) => !row.stages.ohlc_outcome_resolved).length,
      ticketsMissingSourceProofAccepted: rows.filter((row) => !row.stages.source_proof_accepted).length,
      additionalReviewedSourceProofPositiveTickets: readyForSourceProof.length,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not expand ranking until the local artifact chain exists for decision summary, replay queue, OHLC outcome, and source/proof filter.']
      : readyForSourceProof.length === 0
        ? ['No additional reviewed source/proof-positive tickets are waiting in local artifacts. Create or ingest new reviewed cases before changing scanner-visible behavior.']
        : ['Run the source/proof filter over the missing complete tickets before rerunning rank overlay expansion.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewArtifactGapReport(
  report: UnifiedPositiveHeldLocalPreviewArtifactGapReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-artifact-gap-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewArtifactGapCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const decisionSummaryPaths = matchingFiles(outDir, /^unified-positive-held-local-preview-decision-summary-\d+\.json$/);
  const replayQueuePaths = matchingFiles(outDir, /^unified-positive-held-local-preview-replay-queue-\d+\.json$/);
  const ohlcOutcomePaths = matchingFiles(outDir, /^unified-positive-held-local-preview-ohlc-outcome-\d+\.json$/);
  const sourceProofFilterPaths = matchingFiles(outDir, /^unified-positive-held-local-preview-source-proof-filter-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewArtifactGapReport({
    reportDir: outDir,
    decisionSummaryPaths,
    decisionSummaryReports: decisionSummaryPaths.map(readJson),
    replayQueuePaths,
    replayQueueReports: replayQueuePaths.map(readJson),
    ohlcOutcomePaths,
    ohlcOutcomeReports: ohlcOutcomePaths.map(readJson),
    sourceProofFilterPaths,
    sourceProofFilterReports: sourceProofFilterPaths.map(readJson),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewArtifactGapReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewArtifactGapCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
