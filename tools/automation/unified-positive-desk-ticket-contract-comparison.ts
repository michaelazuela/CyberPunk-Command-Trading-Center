import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DeskPublishDecision, DeskTicket } from '../../src/lib/localScannerEngine';
import type { SetupType } from '../../src/types';
import type {
  UnifiedPositiveReviewTicketRebuildSimulationReport,
  UnifiedPositiveReviewTicketSimulationTicket,
} from './unified-positive-review-ticket-rebuild-simulation';

type CompatibilityStatus = 'compatible_held_local' | 'blocked_contract_gap';

export interface UnifiedPositiveDeskTicketContractRow {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: UnifiedPositiveReviewTicketSimulationTicket['direction'];
  compatibilityStatus: CompatibilityStatus;
  compatibleWithDeskTicket: boolean;
  compatibleWithDeskPublishDecision: boolean;
  shouldPostRemainsFalse: true;
  canExecuteRemainsFalse: true;
  publishDiscordRemainsFalse: true;
  simulatedDeskTicket: DeskTicket;
  simulatedPublishDecision: DeskPublishDecision;
  blockers: string[];
  notes: string[];
}

export interface UnifiedPositiveDeskTicketContractComparisonReport {
  reportType: 'unified_positive_desk_ticket_contract_comparison';
  generatedAt: string;
  authority: {
    readOnly: true;
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
    reviewTicketSimulationPath: string | null;
  };
  summary: {
    simulatedTicketsLoaded: number;
    compatibleHeldLocalTickets: number;
    blockedContractGapTickets: number;
    deskTicketCompatible: number;
    deskPublishDecisionCompatible: number;
    shouldPostFalseRows: number;
    canExecuteFalseRows: number;
    publishDiscordFalseRows: number;
  };
  rows: UnifiedPositiveDeskTicketContractRow[];
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

function hasDirectionallyValidPlan(ticket: Pick<UnifiedPositiveReviewTicketSimulationTicket, 'direction' | 'entry' | 'stop' | 'target1' | 'target2'>): boolean {
  if (ticket.direction === 'LONG') return ticket.stop < ticket.entry && ticket.entry < ticket.target1 && ticket.target1 < ticket.target2;
  if (ticket.direction === 'SHORT') return ticket.stop > ticket.entry && ticket.entry > ticket.target1 && ticket.target1 > ticket.target2;
  return false;
}

function buildDeskTicketProjection(ticket: UnifiedPositiveReviewTicketSimulationTicket): DeskTicket {
  return {
    sourceOfTruth: 'scanner_single_active_desk_ticket',
    state: 'ACTIVE_REVIEW',
    primaryDirection: ticket.direction === 'LONG' || ticket.direction === 'SHORT' ? ticket.direction : 'WAIT',
    lineInSand: ticket.entry,
    triggerCondition: ticket.ticketText.when,
    entry: ticket.entry,
    stop: ticket.stop,
    t1: ticket.target1,
    t2: ticket.target2,
    invalidation: ticket.stop,
    invalidationText: ticket.ticketText.invalidation,
    htfStatus: 'sufficient',
    htfStory: 'Research simulation: HTF/outcome context supports review only; 5M remains execution authority.',
    oppositeScenario: null,
    sourceCandidateKey: ticket.sourceCandidateKey,
    humanReviewOnly: true,
    noAutomatedOrders: true,
    displayBoundary: 'trader_facing_ticket_only_can_execute_internal',
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
    notes: [
      ticket.ticketText.what,
      ticket.ticketText.where,
      ticket.ticketText.authority,
    ],
  };
}

function buildHeldPublishDecisionProjection(ticket: UnifiedPositiveReviewTicketSimulationTicket, deskTicket: DeskTicket): DeskPublishDecision {
  return {
    sourceOfTruth: 'scanner_desk_publish_decision',
    action: 'POST_REVIEW',
    discordAction: 'post_review',
    shouldPost: false,
    reason: 'Read-only simulation proves DeskTicket compatibility only; live Discord posting remains disabled until a separate scanner-owned wiring phase.',
    displaySource: 'desk_ticket',
    candidateKey: ticket.sourceCandidateKey,
    direction: deskTicket.primaryDirection,
    setupType: null,
    lineInSand: deskTicket.lineInSand,
    triggerCondition: deskTicket.triggerCondition,
    entry: deskTicket.entry,
    stop: deskTicket.stop,
    t1: deskTicket.t1,
    t2: deskTicket.t2,
    invalidation: deskTicket.invalidation,
    invalidationText: deskTicket.invalidationText,
    hasCompletePlan: true,
    humanReviewOnly: true,
    canExecute: false,
    noChaseState: false,
    htfContextStatus: deskTicket.htfStatus,
    dataQualityStatus: 'ok',
    discordReason: 'Held local by simulation. No Discord post.',
    managementWarnings: ['Simulation only: no Discord post and no execution approval.'],
    driftBlocker: null,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
  };
}

function compatibilityBlockers(ticket: UnifiedPositiveReviewTicketSimulationTicket, deskTicket: DeskTicket, decision: DeskPublishDecision): string[] {
  const blockers: string[] = [];
  if (!hasDirectionallyValidPlan(ticket)) blockers.push('directionally invalid entry/stop/T1/T2 geometry');
  if (deskTicket.sourceOfTruth !== 'scanner_single_active_desk_ticket') blockers.push('DeskTicket sourceOfTruth mismatch');
  if (deskTicket.state !== 'ACTIVE_REVIEW') blockers.push('DeskTicket state is not ACTIVE_REVIEW');
  if (deskTicket.humanReviewOnly !== true) blockers.push('DeskTicket humanReviewOnly boundary missing');
  if (deskTicket.noAutomatedOrders !== true) blockers.push('DeskTicket noAutomatedOrders boundary missing');
  if (deskTicket.displayBoundary !== 'trader_facing_ticket_only_can_execute_internal') blockers.push('DeskTicket display boundary mismatch');
  if (decision.sourceOfTruth !== 'scanner_desk_publish_decision') blockers.push('DeskPublishDecision sourceOfTruth mismatch');
  if (decision.shouldPost !== false) blockers.push('DeskPublishDecision shouldPost must remain false in this comparison');
  if (decision.canExecute !== false) blockers.push('DeskPublishDecision canExecute must remain false');
  if (ticket.publishDiscord !== false) blockers.push('source simulation publishDiscord must remain false');
  if (ticket.reviewOnly !== true) blockers.push('source simulation reviewOnly boundary missing');
  if (ticket.canExecute !== false) blockers.push('source simulation canExecute must remain false');
  return blockers;
}

function rowForTicket(ticket: UnifiedPositiveReviewTicketSimulationTicket): UnifiedPositiveDeskTicketContractRow {
  const simulatedDeskTicket = buildDeskTicketProjection(ticket);
  const simulatedPublishDecision = buildHeldPublishDecisionProjection(ticket, simulatedDeskTicket);
  const blockers = compatibilityBlockers(ticket, simulatedDeskTicket, simulatedPublishDecision);
  const compatibleWithDeskTicket = blockers.every((item) => !item.startsWith('DeskTicket') && !item.includes('geometry'));
  const compatibleWithDeskPublishDecision = blockers.every((item) => !item.startsWith('DeskPublishDecision'));
  return {
    ticketId: ticket.ticketId,
    sourceSnapshotId: ticket.sourceSnapshotId,
    setupType: ticket.setupType,
    direction: ticket.direction,
    compatibilityStatus: blockers.length ? 'blocked_contract_gap' : 'compatible_held_local',
    compatibleWithDeskTicket,
    compatibleWithDeskPublishDecision,
    shouldPostRemainsFalse: true,
    canExecuteRemainsFalse: true,
    publishDiscordRemainsFalse: true,
    simulatedDeskTicket,
    simulatedPublishDecision: {
      ...simulatedPublishDecision,
      setupType: ticket.setupType as SetupType,
    },
    blockers,
    notes: [
      'DeskTicket projection is shape-compatible with the scanner-owned public ticket contract.',
      'DeskPublishDecision projection is intentionally held local; this phase does not enable Discord posting.',
    ],
  };
}

function authority(): UnifiedPositiveDeskTicketContractComparisonReport['authority'] {
  return {
    readOnly: true,
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

function buildRecommendations(report: Omit<UnifiedPositiveDeskTicketContractComparisonReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Do not post these tickets from this comparison report. It proves contract compatibility only.',
    'Keep the next phase inside scanner-owned DeskState/DeskTicket construction, not Discord formatter ownership.',
  ];
  if (report.summary.compatibleHeldLocalTickets > 0) {
    recommendations.push('Next narrow phase can add a dry-run scanner-owned adapter for these review tickets, still with publishDiscord=false.');
  }
  if (report.summary.blockedContractGapTickets > 0) {
    recommendations.push('Resolve contract gaps before any scanner-visible wiring.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<UnifiedPositiveDeskTicketContractComparisonReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive DeskTicket Contract Comparison',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Simulated tickets loaded: ${report.summary.simulatedTicketsLoaded}.`,
    `- Compatible held-local tickets: ${report.summary.compatibleHeldLocalTickets}.`,
    `- Blocked contract-gap tickets: ${report.summary.blockedContractGapTickets}.`,
    `- DeskTicket compatible: ${report.summary.deskTicketCompatible}.`,
    `- DeskPublishDecision compatible: ${report.summary.deskPublishDecisionCompatible}.`,
    `- shouldPost=false rows: ${report.summary.shouldPostFalseRows}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Status | Entry | Stop | T1 | T2 | shouldPost | Blockers |',
    '|---|---|---|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.setupType} | ${row.direction} | ${row.compatibilityStatus} | ${row.simulatedDeskTicket.entry} | ${row.simulatedDeskTicket.stop} | ${row.simulatedDeskTicket.t1} | ${row.simulatedDeskTicket.t2} | ${row.simulatedPublishDecision.shouldPost} | ${row.blockers.join(', ') || '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveDeskTicketContractComparisonReport(args: {
  reviewTicketSimulation: UnifiedPositiveReviewTicketRebuildSimulationReport;
  reviewTicketSimulationPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveDeskTicketContractComparisonReport {
  const rows = args.reviewTicketSimulation.tickets.map(rowForTicket);
  const reportBase: Omit<UnifiedPositiveDeskTicketContractComparisonReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_desk_ticket_contract_comparison',
    generatedAt,
    authority: authority(),
    source: {
      reviewTicketSimulationPath: args.reviewTicketSimulationPath || null,
    },
    summary: {
      simulatedTicketsLoaded: args.reviewTicketSimulation.tickets.length,
      compatibleHeldLocalTickets: rows.filter((row) => row.compatibilityStatus === 'compatible_held_local').length,
      blockedContractGapTickets: rows.filter((row) => row.compatibilityStatus === 'blocked_contract_gap').length,
      deskTicketCompatible: rows.filter((row) => row.compatibleWithDeskTicket).length,
      deskPublishDecisionCompatible: rows.filter((row) => row.compatibleWithDeskPublishDecision).length,
      shouldPostFalseRows: rows.filter((row) => row.simulatedPublishDecision.shouldPost === false).length,
      canExecuteFalseRows: rows.filter((row) => row.simulatedPublishDecision.canExecute === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.publishDiscordRemainsFalse).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveDeskTicketContractComparisonReport(
  report: UnifiedPositiveDeskTicketContractComparisonReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-desk-ticket-contract-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveDeskTicketContractComparisonCli(args = process.argv.slice(2)): Promise<void> {
  const reviewTicketSimulationPath = readFlag(args, '--review-ticket-simulation');
  if (!reviewTicketSimulationPath) throw new Error('Missing required --review-ticket-simulation path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const reviewTicketSimulation = JSON.parse(fs.readFileSync(reviewTicketSimulationPath, 'utf8')) as UnifiedPositiveReviewTicketRebuildSimulationReport;
  const report = buildUnifiedPositiveDeskTicketContractComparisonReport({ reviewTicketSimulation, reviewTicketSimulationPath });
  const paths = writeUnifiedPositiveDeskTicketContractComparisonReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.summary.blockedContractGapTickets > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveDeskTicketContractComparisonCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
