import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DeskTicket } from '../../src/lib/localScannerEngine';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';

type InspectionStatus = 'pass' | 'fail';

export interface UnifiedPositiveHeldLocalInspectionRow {
  ticketId: string;
  sourceSnapshotId: string;
  session: 'morning' | 'lunch' | 'evening' | null;
  setupType: string;
  direction: string;
  status: 'inspectable_held_local_ticket' | 'blocked';
  normalDeskOutput: {
    shouldPost: false;
    publishDiscord: false;
    canExecute: false;
  };
  heldLocalTicket: Pick<
    DeskTicket,
    'state' | 'primaryDirection' | 'lineInSand' | 'triggerCondition' | 'entry' | 'stop' | 't1' | 't2' | 'invalidation' | 'invalidationText' | 'htfStatus' | 'htfStory' | 'notes'
  > | null;
  boundaries: {
    reviewOnly: boolean | null;
    humanReviewOnly: boolean | null;
    noAutomatedOrders: boolean | null;
    shouldPost: boolean | null;
    publishDiscord: boolean | null;
    canExecute: boolean | null;
    changesDiscordPosting: boolean | null;
    dryRunZeroLivePublishBehaviorChange: boolean;
  };
  deskText: {
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
  } | null;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalInspectionSurfaceReport {
  reportType: 'unified_positive_held_local_inspection_surface';
  generatedAt: string;
  status: InspectionStatus;
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
    heldLocalAdapterPath: string | null;
    dryRunReplayPath: string | null;
  };
  summary: {
    adapterRowsLoaded: number;
    dryRunRowsLoaded: number;
    inspectableTickets: number;
    blockedRows: number;
    normalShouldPostFalseRows: number;
    heldLocalShouldPostFalseRows: number;
    normalCanExecuteFalseRows: number;
    heldLocalCanExecuteFalseRows: number;
    normalPublishDiscordFalseRows: number;
    heldLocalPublishDiscordFalseRows: number;
  };
  rows: UnifiedPositiveHeldLocalInspectionRow[];
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

function authority(): UnifiedPositiveHeldLocalInspectionSurfaceReport['authority'] {
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

function price(value: number | null): string {
  return Number.isFinite(value) ? value.toFixed(2) : 'not set';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/');
}

function deskTextFor(ticket: DeskTicket, setupType: string): UnifiedPositiveHeldLocalInspectionRow['deskText'] {
  return {
    what: `${setupType} ${ticket.primaryDirection} held-local ACTIVE_REVIEW ticket.`,
    where: `Line ${price(ticket.lineInSand)}; entry ${price(ticket.entry)}; stop ${price(ticket.stop)}; T1 ${price(ticket.t1)}; T2 ${price(ticket.t2)}.`,
    when: ticket.triggerCondition,
    why: ticket.htfStory,
    invalidation: ticket.invalidationText,
  };
}

function rowForAdapter(
  row: UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number],
  dryRunReplay: UnifiedPositiveScannerDryRunReplayReport,
): UnifiedPositiveHeldLocalInspectionRow {
  const replayRow = dryRunReplay.rows.find((item) => item.ticketId === row.ticketId) || null;
  const artifact = row.artifact;
  const ticket = artifact?.deskTicket || null;
  const blockers = [
    dryRunReplay.status !== 'pass' ? `dry-run replay status ${dryRunReplay.status}` : null,
    !replayRow ? 'missing dry-run replay row' : null,
    replayRow && replayRow.session !== row.session ? 'dry-run replay session metadata mismatch' : null,
    replayRow && !replayRow.comparison.zeroLivePublishBehaviorChange ? 'dry-run replay did not preserve zero live publish behavior change' : null,
    row.adapterStatus !== 'held_local_artifact_created' ? `adapter status ${row.adapterStatus}` : null,
    !artifact ? 'missing held-local artifact' : null,
    ticket?.state !== 'ACTIVE_REVIEW' ? 'held-local ticket is not ACTIVE_REVIEW' : null,
    artifact?.deskPublishDecision.shouldPost !== false ? 'held-local shouldPost is not false' : null,
    artifact?.publishDiscord !== false ? 'held-local publishDiscord is not false' : null,
    artifact?.canExecute !== false ? 'held-local canExecute is not false' : null,
    replayRow?.normalDeskOutput.shouldPost !== false ? 'normal output shouldPost is not false' : null,
    replayRow?.normalDeskOutput.publishDiscord !== false ? 'normal output publishDiscord is not false' : null,
    replayRow?.normalDeskOutput.canExecute !== false ? 'normal output canExecute is not false' : null,
  ].filter((item): item is string => Boolean(item));
  return {
    ticketId: row.ticketId,
    sourceSnapshotId: row.sourceSnapshotId,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    status: blockers.length ? 'blocked' : 'inspectable_held_local_ticket',
    normalDeskOutput: {
      shouldPost: false,
      publishDiscord: false,
      canExecute: false,
    },
    heldLocalTicket: ticket
      ? {
          state: ticket.state,
          primaryDirection: ticket.primaryDirection,
          lineInSand: ticket.lineInSand,
          triggerCondition: ticket.triggerCondition,
          entry: ticket.entry,
          stop: ticket.stop,
          t1: ticket.t1,
          t2: ticket.t2,
          invalidation: ticket.invalidation,
          invalidationText: ticket.invalidationText,
          htfStatus: ticket.htfStatus,
          htfStory: ticket.htfStory,
          notes: ticket.notes,
        }
      : null,
    boundaries: {
      reviewOnly: artifact?.reviewOnly ?? null,
      humanReviewOnly: ticket?.humanReviewOnly ?? null,
      noAutomatedOrders: ticket?.noAutomatedOrders ?? null,
      shouldPost: artifact?.deskPublishDecision.shouldPost ?? null,
      publishDiscord: artifact?.publishDiscord ?? null,
      canExecute: artifact?.canExecute ?? null,
      changesDiscordPosting: artifact?.approvalBoundary.changesDiscordPosting ?? null,
      dryRunZeroLivePublishBehaviorChange: replayRow?.comparison.zeroLivePublishBehaviorChange === true,
    },
    deskText: ticket ? deskTextFor(ticket, row.setupType) : null,
    blockers,
  };
}

function buildRecommendations(report: Omit<UnifiedPositiveHeldLocalInspectionSurfaceReport, 'recommendations' | 'markdown'>): string[] {
  if (report.status === 'fail') {
    return [
      'Do not expose these tickets in any scanner-visible surface until every inspection row passes local-only boundary checks.',
    ];
  }
  return [
    'These tickets are inspectable as local-only ACTIVE_REVIEW artifacts with production posting disabled.',
    'Next narrow phase can add a guarded scanner option that writes this local inspection artifact during replay only; live Discord/Supabase remains behind a separate approval gate.',
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalInspectionSurfaceReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Inspection Surface',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only inspection. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Adapter rows loaded: ${report.summary.adapterRowsLoaded}.`,
    `- Dry-run rows loaded: ${report.summary.dryRunRowsLoaded}.`,
    `- Inspectable tickets: ${report.summary.inspectableTickets}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Normal shouldPost=false rows: ${report.summary.normalShouldPostFalseRows}.`,
    `- Held-local shouldPost=false rows: ${report.summary.heldLocalShouldPostFalseRows}.`,
    `- Normal canExecute=false rows: ${report.summary.normalCanExecuteFalseRows}.`,
    `- Held-local canExecute=false rows: ${report.summary.heldLocalCanExecuteFalseRows}.`,
    `- Normal publishDiscord=false rows: ${report.summary.normalPublishDiscordFalseRows}.`,
    `- Held-local publishDiscord=false rows: ${report.summary.heldLocalPublishDiscordFalseRows}.`,
    '',
    '## Tickets',
    '| Ticket | Session | Setup | Side | Status | Entry | Stop | T1 | T2 | Trigger | Invalidation | Blockers |',
    '|---|---|---|---|---|---:|---:|---:|---:|---|---|---|',
    ...report.rows.map((row) => {
      const ticket = row.heldLocalTicket;
      return `| ${row.ticketId} | ${row.session ?? '-'} | ${row.setupType} | ${row.direction} | ${row.status} | ${price(ticket?.entry ?? null)} | ${price(ticket?.stop ?? null)} | ${price(ticket?.t1 ?? null)} | ${price(ticket?.t2 ?? null)} | ${escapeTable(row.deskText?.when || '-')} | ${escapeTable(row.deskText?.invalidation || '-')} | ${escapeTable(row.blockers.join(', ') || '-')} |`;
    }),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveHeldLocalInspectionSurfaceReport(args: {
  heldLocalAdapter: UnifiedPositiveHeldLocalTicketAdapterReport;
  dryRunReplay: UnifiedPositiveScannerDryRunReplayReport;
  heldLocalAdapterPath?: string | null;
  dryRunReplayPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalInspectionSurfaceReport {
  const rows = args.heldLocalAdapter.rows.map((row) => rowForAdapter(row, args.dryRunReplay));
  const reportBase: Omit<UnifiedPositiveHeldLocalInspectionSurfaceReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_inspection_surface',
    generatedAt,
    status: rows.every((row) => row.status === 'inspectable_held_local_ticket') ? 'pass' : 'fail',
    authority: authority(),
    source: {
      heldLocalAdapterPath: args.heldLocalAdapterPath || null,
      dryRunReplayPath: args.dryRunReplayPath || null,
    },
    summary: {
      adapterRowsLoaded: args.heldLocalAdapter.rows.length,
      dryRunRowsLoaded: args.dryRunReplay.rows.length,
      inspectableTickets: rows.filter((row) => row.status === 'inspectable_held_local_ticket').length,
      blockedRows: rows.filter((row) => row.status === 'blocked').length,
      normalShouldPostFalseRows: rows.filter((row) => row.normalDeskOutput.shouldPost === false).length,
      heldLocalShouldPostFalseRows: rows.filter((row) => row.boundaries.shouldPost === false).length,
      normalCanExecuteFalseRows: rows.filter((row) => row.normalDeskOutput.canExecute === false).length,
      heldLocalCanExecuteFalseRows: rows.filter((row) => row.boundaries.canExecute === false).length,
      normalPublishDiscordFalseRows: rows.filter((row) => row.normalDeskOutput.publishDiscord === false).length,
      heldLocalPublishDiscordFalseRows: rows.filter((row) => row.boundaries.publishDiscord === false).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveHeldLocalInspectionSurfaceReport(
  report: UnifiedPositiveHeldLocalInspectionSurfaceReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-inspection-surface-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalInspectionSurfaceCli(args = process.argv.slice(2)): Promise<void> {
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter');
  const dryRunReplayPath = readFlag(args, '--dry-run-replay');
  if (!heldLocalAdapterPath) throw new Error('Missing required --held-local-adapter path.');
  if (!dryRunReplayPath) throw new Error('Missing required --dry-run-replay path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const heldLocalAdapter = JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport;
  const dryRunReplay = JSON.parse(fs.readFileSync(dryRunReplayPath, 'utf8')) as UnifiedPositiveScannerDryRunReplayReport;
  const report = buildUnifiedPositiveHeldLocalInspectionSurfaceReport({
    heldLocalAdapter,
    dryRunReplay,
    heldLocalAdapterPath,
    dryRunReplayPath,
  });
  const paths = writeUnifiedPositiveHeldLocalInspectionSurfaceReport(report, outDir);
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
  runUnifiedPositiveHeldLocalInspectionSurfaceCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
