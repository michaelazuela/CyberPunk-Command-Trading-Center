import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SetupCandidate } from '../../src/types';
import type {
  UnifiedPositiveFresh5mProofReport,
  UnifiedPositiveFresh5mProofRow,
} from './unified-positive-fresh-5m-proof-extractor';

type TicketStatus = 'simulated_review_ticket' | 'suppressed_duplicate' | 'blocked_not_eligible' | 'blocked_invalid_geometry';

export interface UnifiedPositiveReviewTicketSimulationTicket {
  ticketId: string;
  tradeDate: string;
  sessionType: UnifiedPositiveFresh5mProofRow['sessionType'];
  setupType: string;
  direction: SetupCandidate['direction'];
  sourceSnapshotId: string;
  sourceCandidateKey: string;
  suppressedDuplicateSnapshotIds: string[];
  duplicateRowsCollapsed: number;
  proofBarTime: string;
  proofType: UnifiedPositiveFresh5mProofRow['proofType'];
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  outcomeAdjustedScore: number | null;
  outcomeGrossOneMes: number;
  status: TicketStatus;
  canExecute: false;
  publishDiscord: false;
  reviewOnly: true;
  ticketText: {
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
    authority: string;
  };
}

export interface UnifiedPositiveReviewTicketSuppression {
  snapshotId: string;
  tradeDate: string | null;
  sessionType: UnifiedPositiveFresh5mProofRow['sessionType'];
  setupType: string;
  direction: SetupCandidate['direction'];
  reason: string;
  keptTicketId: string | null;
  status: TicketStatus;
}

export interface UnifiedPositiveReviewTicketRebuildSimulationReport {
  reportType: 'unified_positive_review_ticket_rebuild_simulation';
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
  };
  source: {
    freshProofReportPath: string | null;
  };
  summary: {
    freshProofRowsLoaded: number;
    eligibleFreshProofRows: number;
    simulatedReviewTickets: number;
    duplicateRowsSuppressed: number;
    blockedNotEligible: number;
    blockedInvalidGeometry: number;
    canExecuteFalseTickets: number;
    publishDiscordFalseTickets: number;
    reviewOnlyTickets: number;
  };
  tickets: UnifiedPositiveReviewTicketSimulationTicket[];
  suppressions: UnifiedPositiveReviewTicketSuppression[];
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

function roundNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function timeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function geometryValid(row: UnifiedPositiveFresh5mProofRow): boolean {
  if (row.entry === null || row.stop === null || row.target1 === null || row.target2 === null) return false;
  if (row.direction === 'LONG') return row.stop < row.entry && row.entry < row.target1 && row.target1 <= row.target2;
  if (row.direction === 'SHORT') return row.stop > row.entry && row.entry > row.target1 && row.target1 >= row.target2;
  return false;
}

function groupKey(row: UnifiedPositiveFresh5mProofRow): string {
  return [row.tradeDate || 'unknown', row.sessionType, row.setupType, row.direction].join('|');
}

function ticketIdFor(row: UnifiedPositiveFresh5mProofRow): string {
  return [
    row.tradeDate || 'unknown',
    row.sessionType,
    row.setupType,
    row.direction,
  ].join('-').replace(/[^A-Za-z0-9_-]+/g, '-');
}

function compareRows(a: UnifiedPositiveFresh5mProofRow, b: UnifiedPositiveFresh5mProofRow): number {
  return (b.outcomeAdjustedScore ?? -1) - (a.outcomeAdjustedScore ?? -1) ||
    timeMs(a.proofBarTime) - timeMs(b.proofBarTime) ||
    a.snapshotId.localeCompare(b.snapshotId);
}

function ticketText(row: UnifiedPositiveFresh5mProofRow, duplicateRowsCollapsed: number): UnifiedPositiveReviewTicketSimulationTicket['ticketText'] {
  const side = row.direction === 'LONG' ? 'long' : 'short';
  const duplicateNote = duplicateRowsCollapsed > 0
    ? ` ${duplicateRowsCollapsed} duplicate same-session row(s) were collapsed into this one review ticket.`
    : '';
  return {
    what: `${row.setupType} ${side} is eligible for human review after fresh completed 5M proof.${duplicateNote}`,
    where: `Entry ${row.entry}, stop ${row.stop}, T1 ${row.target1}, T2 ${row.target2}.`,
    when: `Fresh completed 5M ${row.proofType || 'proof'} printed at ${row.proofBarTime}.`,
    why: `Outcome overlay was positive and deterministic plan geometry was present before this simulation.`,
    invalidation: `Invalid below/above the protected 5M stop line at ${row.stop}; no automated order authority is granted.`,
    authority: 'Research-only simulated review ticket. 5M remains execution authority. HTF/outcome context supports review only. canExecute=false and publishDiscord=false.',
  };
}

function ticketForRow(row: UnifiedPositiveFresh5mProofRow, duplicates: UnifiedPositiveFresh5mProofRow[]): UnifiedPositiveReviewTicketSimulationTicket {
  if (row.tradeDate === null || row.entry === null || row.stop === null || row.target1 === null || row.target2 === null || row.proofBarTime === null) {
    throw new Error(`Cannot build ticket for incomplete row ${row.snapshotId}.`);
  }
  const riskPoints = roundNumber(Math.abs(row.entry - row.stop));
  return {
    ticketId: ticketIdFor(row),
    tradeDate: row.tradeDate,
    sessionType: row.sessionType,
    setupType: row.setupType,
    direction: row.direction,
    sourceSnapshotId: row.snapshotId,
    sourceCandidateKey: row.candidateKey,
    suppressedDuplicateSnapshotIds: duplicates.map((item) => item.snapshotId),
    duplicateRowsCollapsed: duplicates.length,
    proofBarTime: row.proofBarTime,
    proofType: row.proofType,
    entry: row.entry,
    stop: row.stop,
    target1: row.target1,
    target2: row.target2,
    riskPoints,
    outcomeAdjustedScore: row.outcomeAdjustedScore,
    outcomeGrossOneMes: roundNumber(row.outcomeGrossOneMes + duplicates.reduce((sum, item) => sum + item.outcomeGrossOneMes, 0)),
    status: 'simulated_review_ticket',
    canExecute: false,
    publishDiscord: false,
    reviewOnly: true,
    ticketText: ticketText(row, duplicates.length),
  };
}

function authority(): UnifiedPositiveReviewTicketRebuildSimulationReport['authority'] {
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
  };
}

function buildRecommendations(report: Omit<UnifiedPositiveReviewTicketRebuildSimulationReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Do not post these simulated tickets to Discord from this report.',
    'Keep canExecute=false. This proves human-review ticket shape only; it does not approve execution.',
  ];
  if (report.summary.simulatedReviewTickets > 0) {
    recommendations.push('Next phase should compare the simulated ticket set against live scanner ticket contracts before any scanner-visible wiring.');
  }
  if (report.summary.duplicateRowsSuppressed > 0) {
    recommendations.push('Keep same-session dedupe enabled so repeated research snapshots do not become Discord floods.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<UnifiedPositiveReviewTicketRebuildSimulationReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Review Ticket Rebuild Simulation',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Fresh-proof rows loaded: ${report.summary.freshProofRowsLoaded}.`,
    `- Eligible fresh-proof rows: ${report.summary.eligibleFreshProofRows}.`,
    `- Simulated review tickets: ${report.summary.simulatedReviewTickets}.`,
    `- Duplicate rows suppressed: ${report.summary.duplicateRowsSuppressed}.`,
    `- Blocked not eligible: ${report.summary.blockedNotEligible}.`,
    `- Blocked invalid geometry: ${report.summary.blockedInvalidGeometry}.`,
    '',
    '## Tickets',
    '| Ticket | Date | Session | Setup | Side | Entry | Stop | T1 | T2 | Risk | Proof | Duplicates |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|',
    ...report.tickets.map((ticket) => `| ${ticket.ticketId} | ${ticket.tradeDate} | ${ticket.sessionType} | ${ticket.setupType} | ${ticket.direction} | ${ticket.entry} | ${ticket.stop} | ${ticket.target1} | ${ticket.target2} | ${ticket.riskPoints} | ${ticket.proofBarTime} | ${ticket.duplicateRowsCollapsed} |`),
    '',
    '## Suppressions',
    ...(report.suppressions.length
      ? report.suppressions.map((item) => `- ${item.snapshotId}: ${item.status}; ${item.reason}`)
      : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveReviewTicketRebuildSimulationReport(args: {
  freshProofReport: UnifiedPositiveFresh5mProofReport;
  freshProofReportPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveReviewTicketRebuildSimulationReport {
  const eligible = args.freshProofReport.rows.filter((row) => row.reviewReadiness === 'eligible_after_fresh_5m_proof');
  const suppressions: UnifiedPositiveReviewTicketSuppression[] = [];
  for (const row of args.freshProofReport.rows) {
    if (row.reviewReadiness !== 'eligible_after_fresh_5m_proof') {
      suppressions.push({
        snapshotId: row.snapshotId,
        tradeDate: row.tradeDate,
        sessionType: row.sessionType,
        setupType: row.setupType,
        direction: row.direction,
        reason: row.blockers.join(', ') || row.proofStatus,
        keptTicketId: null,
        status: 'blocked_not_eligible',
      });
    } else if (!geometryValid(row) || !row.proofBarTime) {
      suppressions.push({
        snapshotId: row.snapshotId,
        tradeDate: row.tradeDate,
        sessionType: row.sessionType,
        setupType: row.setupType,
        direction: row.direction,
        reason: 'fresh proof row lacked deterministic ticket geometry or proof time',
        keptTicketId: null,
        status: 'blocked_invalid_geometry',
      });
    }
  }
  const groups = new Map<string, UnifiedPositiveFresh5mProofRow[]>();
  for (const row of eligible.filter((item) => geometryValid(item) && item.proofBarTime)) {
    const key = groupKey(row);
    const existing = groups.get(key) || [];
    existing.push(row);
    groups.set(key, existing);
  }
  const tickets: UnifiedPositiveReviewTicketSimulationTicket[] = [];
  for (const rows of groups.values()) {
    const sorted = [...rows].sort(compareRows);
    const kept = sorted[0];
    const duplicates = sorted.slice(1);
    const ticket = ticketForRow(kept, duplicates);
    tickets.push(ticket);
    for (const duplicate of duplicates) {
      suppressions.push({
        snapshotId: duplicate.snapshotId,
        tradeDate: duplicate.tradeDate,
        sessionType: duplicate.sessionType,
        setupType: duplicate.setupType,
        direction: duplicate.direction,
        reason: `duplicate same-session idea collapsed into ${ticket.ticketId}`,
        keptTicketId: ticket.ticketId,
        status: 'suppressed_duplicate',
      });
    }
  }
  tickets.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.sessionType.localeCompare(b.sessionType) || a.ticketId.localeCompare(b.ticketId));
  const reportBase: Omit<UnifiedPositiveReviewTicketRebuildSimulationReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_review_ticket_rebuild_simulation',
    generatedAt,
    authority: authority(),
    source: {
      freshProofReportPath: args.freshProofReportPath || null,
    },
    summary: {
      freshProofRowsLoaded: args.freshProofReport.rows.length,
      eligibleFreshProofRows: eligible.length,
      simulatedReviewTickets: tickets.length,
      duplicateRowsSuppressed: suppressions.filter((item) => item.status === 'suppressed_duplicate').length,
      blockedNotEligible: suppressions.filter((item) => item.status === 'blocked_not_eligible').length,
      blockedInvalidGeometry: suppressions.filter((item) => item.status === 'blocked_invalid_geometry').length,
      canExecuteFalseTickets: tickets.filter((ticket) => ticket.canExecute === false).length,
      publishDiscordFalseTickets: tickets.filter((ticket) => ticket.publishDiscord === false).length,
      reviewOnlyTickets: tickets.filter((ticket) => ticket.reviewOnly === true).length,
    },
    tickets,
    suppressions: suppressions.sort((a, b) => (a.tradeDate || '').localeCompare(b.tradeDate || '') || a.snapshotId.localeCompare(b.snapshotId)),
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveReviewTicketRebuildSimulationReport(
  report: UnifiedPositiveReviewTicketRebuildSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-review-ticket-rebuild-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveReviewTicketRebuildSimulationCli(args = process.argv.slice(2)): Promise<void> {
  const freshProofReportPath = readFlag(args, '--fresh-proof-report');
  if (!freshProofReportPath) throw new Error('Missing required --fresh-proof-report path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const freshProofReport = JSON.parse(fs.readFileSync(freshProofReportPath, 'utf8')) as UnifiedPositiveFresh5mProofReport;
  const report = buildUnifiedPositiveReviewTicketRebuildSimulationReport({ freshProofReport, freshProofReportPath });
  const paths = writeUnifiedPositiveReviewTicketRebuildSimulationReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveReviewTicketRebuildSimulationCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
