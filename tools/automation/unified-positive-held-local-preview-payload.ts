import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalInspectionSurfaceReport } from './unified-positive-held-local-inspection-surface';
import type { UnifiedPositiveHeldLocalWordingGuardReport } from './unified-positive-held-local-wording-guard';
import type {
  UnifiedPositiveHeldLocalPreviewhistoricalReviewReviewNotePlacementSimulationReport,
} from './unified-positive-held-local-preview-raidReclaim-review-note-placement-simulation';

export interface UnifiedPositiveHeldLocalPreviewPayload {
  sourceOfTruth: 'scanner_owned_held_local_local_preview_payload';
  ticketId: string;
  sourceSnapshotId: string;
  session: 'morning' | 'lunch' | 'evening' | null;
  setupType: string;
  direction: string;
  state: 'ACTIVE_REVIEW';
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  reviewOnly: true;
  humanReviewOnly: true;
  noAutomatedOrders: true;
  title: string;
  sections: {
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
  };
  levels: {
    lineInSand: number | null;
    entry: number | null;
    stop: number | null;
    t1: number | null;
    t2: number | null;
  };
  htfStatus: string | null;
  notes: string[];
}

export interface UnifiedPositiveHeldLocalPreviewPayloadRow {
  ticketId: string;
  sourceSnapshotId: string;
  session: 'morning' | 'lunch' | 'evening' | null;
  setupType: string;
  direction: string;
  status: 'preview_payload_created' | 'blocked';
  payload: UnifiedPositiveHeldLocalPreviewPayload | null;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewPayloadReport {
  reportType: 'unified_positive_held_local_preview_payload';
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
  };
  source: {
    inspectionSurfacePath: string | null;
    wordingGuardPath: string | null;
    historicalReviewReviewNotePlacementSimulationPath: string | null;
  };
  summary: {
    inspectionRowsLoaded: number;
    previewPayloadsCreated: number;
    blockedRows: number;
    shouldPostFalsePayloads: number;
    canExecuteFalsePayloads: number;
    publishDiscordFalsePayloads: number;
    shouldDispatchFalsePayloads: number;
    writesSupabaseFalsePayloads: number;
    reviewNotePlacementAppliedPayloads: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewPayloadRow[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewPayloadReport['authority'] {
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
  };
}

function price(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toFixed(2) : 'not set';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/');
}

function blockersForRow(args: {
  row: UnifiedPositiveHeldLocalInspectionSurfaceReport['rows'][number];
  inspectionSurface: UnifiedPositiveHeldLocalInspectionSurfaceReport;
  wordingGuard: UnifiedPositiveHeldLocalWordingGuardReport;
}): string[] {
  const ticket = args.row.heldLocalTicket;
  return [
    args.inspectionSurface.status !== 'pass' ? `inspection surface status ${args.inspectionSurface.status}` : null,
    args.wordingGuard.status !== 'pass' ? `wording guard status ${args.wordingGuard.status}` : null,
    args.wordingGuard.findings.some((finding) => finding.ticketId === args.row.ticketId) ? 'wording guard finding exists for ticket' : null,
    args.row.status !== 'inspectable_held_local_ticket' ? `inspection row status ${args.row.status}` : null,
    !ticket ? 'missing held-local ticket' : null,
    ticket?.state !== 'ACTIVE_REVIEW' ? 'held-local ticket is not ACTIVE_REVIEW' : null,
    args.row.boundaries.reviewOnly !== true ? 'reviewOnly boundary is not true' : null,
    args.row.boundaries.humanReviewOnly !== true ? 'humanReviewOnly boundary is not true' : null,
    args.row.boundaries.noAutomatedOrders !== true ? 'noAutomatedOrders boundary is not true' : null,
    args.row.boundaries.shouldPost !== false ? 'shouldPost boundary is not false' : null,
    args.row.boundaries.publishDiscord !== false ? 'publishDiscord boundary is not false' : null,
    args.row.boundaries.canExecute !== false ? 'canExecute boundary is not false' : null,
    args.row.boundaries.changesDiscordPosting !== false ? 'changesDiscordPosting boundary is not false' : null,
    args.row.boundaries.dryRunZeroLivePublishBehaviorChange !== true ? 'dry-run zero live publish behavior change proof is missing' : null,
    !args.row.deskText ? 'missing desk text' : null,
  ].filter((item): item is string => Boolean(item));
}

function inferredSession(row: UnifiedPositiveHeldLocalInspectionSurfaceReport['rows'][number]): string | null {
  if (row.session) return row.session;
  const haystack = `${row.ticketId} ${row.sourceSnapshotId}`.toLowerCase();
  if (haystack.includes('morning')) return 'morning';
  if (haystack.includes('lunch')) return 'lunch';
  if (haystack.includes('evening')) return 'evening';
  return null;
}

function reviewNotePlacementsForRow(
  row: UnifiedPositiveHeldLocalInspectionSurfaceReport['rows'][number],
  placementSimulation: UnifiedPositiveHeldLocalPreviewhistoricalReviewReviewNotePlacementSimulationReport | null,
): string[] {
  if (!placementSimulation || placementSimulation.status !== 'pass' || row.setupType !== 'historicalReview') return [];
  const session = inferredSession(row);
  if (!session) return [];
  return placementSimulation.rows
    .filter((placement) => (
      placement.placement === 'held_local_preview_notes' &&
      placement.session === session &&
      placement.direction === row.direction &&
      placement.ticketVisibleAfter === true &&
      placement.suppressesTicket === false &&
      placement.changesRanking === false &&
      placement.changesCanExecute === false &&
      placement.changesEntryStopTargets === false &&
      placement.changesDiscordPosting === false &&
      placement.writesSupabase === false
    ))
    .map((placement) => placement.proposedNote);
}

function payloadForRow(
  row: UnifiedPositiveHeldLocalInspectionSurfaceReport['rows'][number],
  placementSimulation: UnifiedPositiveHeldLocalPreviewhistoricalReviewReviewNotePlacementSimulationReport | null,
): UnifiedPositiveHeldLocalPreviewPayload {
  const ticket = row.heldLocalTicket;
  if (!ticket || !row.deskText) throw new Error(`Cannot build preview payload for blocked row ${row.ticketId}.`);
  const reviewNotes = reviewNotePlacementsForRow(row, placementSimulation);
  return {
    sourceOfTruth: 'scanner_owned_held_local_local_preview_payload',
    ticketId: row.ticketId,
    sourceSnapshotId: row.sourceSnapshotId,
    session: row.session ?? null,
    setupType: row.setupType,
    direction: row.direction,
    state: 'ACTIVE_REVIEW',
    publishDiscord: false,
    shouldPost: false,
    canExecute: false,
    shouldDispatch: false,
    writesSupabase: false,
    reviewOnly: true,
    humanReviewOnly: true,
    noAutomatedOrders: true,
    title: `${row.setupType} ${row.direction} ACTIVE_REVIEW local preview`,
    sections: {
      what: row.deskText.what,
      where: row.deskText.where,
      when: row.deskText.when,
      why: row.deskText.why,
      invalidation: row.deskText.invalidation,
    },
    levels: {
      lineInSand: ticket.lineInSand,
      entry: ticket.entry,
      stop: ticket.stop,
      t1: ticket.t1,
      t2: ticket.t2,
    },
    htfStatus: ticket.htfStatus,
    notes: Array.from(new Set([...ticket.notes, ...reviewNotes])),
  };
}

function rowForInspection(args: {
  row: UnifiedPositiveHeldLocalInspectionSurfaceReport['rows'][number];
  inspectionSurface: UnifiedPositiveHeldLocalInspectionSurfaceReport;
  wordingGuard: UnifiedPositiveHeldLocalWordingGuardReport;
  placementSimulation: UnifiedPositiveHeldLocalPreviewhistoricalReviewReviewNotePlacementSimulationReport | null;
}): UnifiedPositiveHeldLocalPreviewPayloadRow {
  const blockers = blockersForRow(args);
  return {
    ticketId: args.row.ticketId,
    sourceSnapshotId: args.row.sourceSnapshotId,
    session: args.row.session ?? null,
    setupType: args.row.setupType,
    direction: args.row.direction,
    status: blockers.length ? 'blocked' : 'preview_payload_created',
    payload: blockers.length ? null : payloadForRow(args.row, args.placementSimulation),
    blockers,
  };
}

function buildRecommendations(report: Omit<UnifiedPositiveHeldLocalPreviewPayloadReport, 'recommendations' | 'markdown'>): string[] {
  if (report.status === 'fail') {
    return [
      'Do not expose held-local preview payloads until the inspection surface and wording guard both pass.',
    ];
  }
  return [
    'Preview payloads are local-only and explicitly non-dispatchable.',
    'Next narrow phase can add a local UI/Discord-shape rendering test from these payloads without posting to Discord or writing Supabase.',
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewPayloadReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Preview Payload',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only preview payload. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Inspection rows loaded: ${report.summary.inspectionRowsLoaded}.`,
    `- Preview payloads created: ${report.summary.previewPayloadsCreated}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- shouldPost=false payloads: ${report.summary.shouldPostFalsePayloads}.`,
    `- canExecute=false payloads: ${report.summary.canExecuteFalsePayloads}.`,
    `- publishDiscord=false payloads: ${report.summary.publishDiscordFalsePayloads}.`,
    `- shouldDispatch=false payloads: ${report.summary.shouldDispatchFalsePayloads}.`,
    `- writesSupabase=false payloads: ${report.summary.writesSupabaseFalsePayloads}.`,
    `- Review-note placement applied payloads: ${report.summary.reviewNotePlacementAppliedPayloads}.`,
    '',
    '## Payloads',
    '| Ticket | Session | Setup | Side | Status | Entry | Stop | T1 | T2 | shouldPost | canExecute | publishDiscord | shouldDispatch | Blockers |',
    '|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|',
    ...report.rows.map((row) => {
      const payload = row.payload;
      return `| ${row.ticketId} | ${row.session ?? '-'} | ${row.setupType} | ${row.direction} | ${row.status} | ${price(payload?.levels.entry)} | ${price(payload?.levels.stop)} | ${price(payload?.levels.t1)} | ${price(payload?.levels.t2)} | ${payload?.shouldPost ?? '-'} | ${payload?.canExecute ?? '-'} | ${payload?.publishDiscord ?? '-'} | ${payload?.shouldDispatch ?? '-'} | ${escapeTable(row.blockers.join(', ') || '-')} |`;
    }),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewPayloadReport(args: {
  inspectionSurface: UnifiedPositiveHeldLocalInspectionSurfaceReport;
  wordingGuard: UnifiedPositiveHeldLocalWordingGuardReport;
  placementSimulation?: UnifiedPositiveHeldLocalPreviewhistoricalReviewReviewNotePlacementSimulationReport | null;
  inspectionSurfacePath?: string | null;
  wordingGuardPath?: string | null;
  historicalReviewReviewNotePlacementSimulationPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewPayloadReport {
  const rows = args.inspectionSurface.rows.map((row) => rowForInspection({
    row,
    inspectionSurface: args.inspectionSurface,
    wordingGuard: args.wordingGuard,
    placementSimulation: args.placementSimulation || null,
  }));
  const reportBase: Omit<UnifiedPositiveHeldLocalPreviewPayloadReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_payload',
    generatedAt,
    status: rows.every((row) => row.status === 'preview_payload_created') ? 'pass' : 'fail',
    authority: authority(),
    source: {
      inspectionSurfacePath: args.inspectionSurfacePath || null,
      wordingGuardPath: args.wordingGuardPath || null,
      historicalReviewReviewNotePlacementSimulationPath: args.historicalReviewReviewNotePlacementSimulationPath || null,
    },
    summary: {
      inspectionRowsLoaded: args.inspectionSurface.rows.length,
      previewPayloadsCreated: rows.filter((row) => row.status === 'preview_payload_created').length,
      blockedRows: rows.filter((row) => row.status === 'blocked').length,
      shouldPostFalsePayloads: rows.filter((row) => row.payload?.shouldPost === false).length,
      canExecuteFalsePayloads: rows.filter((row) => row.payload?.canExecute === false).length,
      publishDiscordFalsePayloads: rows.filter((row) => row.payload?.publishDiscord === false).length,
      shouldDispatchFalsePayloads: rows.filter((row) => row.payload?.shouldDispatch === false).length,
      writesSupabaseFalsePayloads: rows.filter((row) => row.payload?.writesSupabase === false).length,
      reviewNotePlacementAppliedPayloads: rows.filter((row) => row.payload?.notes.some((note) => note.includes('lacks full plan-level proof'))).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveHeldLocalPreviewPayloadReport(
  report: UnifiedPositiveHeldLocalPreviewPayloadReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-payload-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalPreviewPayloadCli(args = process.argv.slice(2)): Promise<void> {
  const inspectionSurfacePath = readFlag(args, '--inspection-surface');
  const wordingGuardPath = readFlag(args, '--wording-guard');
  const historicalReviewReviewNotePlacementSimulationPath = readFlag(args, '--historicalReview-review-note-placement-simulation');
  if (!inspectionSurfacePath) throw new Error('Missing required --inspection-surface path.');
  if (!wordingGuardPath) throw new Error('Missing required --wording-guard path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const inspectionSurface = JSON.parse(fs.readFileSync(inspectionSurfacePath, 'utf8')) as UnifiedPositiveHeldLocalInspectionSurfaceReport;
  const wordingGuard = JSON.parse(fs.readFileSync(wordingGuardPath, 'utf8')) as UnifiedPositiveHeldLocalWordingGuardReport;
  const placementSimulation = historicalReviewReviewNotePlacementSimulationPath
    ? JSON.parse(fs.readFileSync(historicalReviewReviewNotePlacementSimulationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewhistoricalReviewReviewNotePlacementSimulationReport
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewPayloadReport({
    inspectionSurface,
    wordingGuard,
    placementSimulation,
    inspectionSurfacePath,
    wordingGuardPath,
    historicalReviewReviewNotePlacementSimulationPath,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewPayloadReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewPayloadCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
