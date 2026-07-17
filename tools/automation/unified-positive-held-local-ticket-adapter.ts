import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHeldLocalReviewTicketArtifact,
  type HeldLocalReviewTicketArtifact,
} from '../../src/lib/localScannerEngine';
import type { SetupType } from '../../src/types';
import type { UnifiedPositiveDeskTicketContractComparisonReport } from './unified-positive-desk-ticket-contract-comparison';

export interface UnifiedPositiveHeldLocalTicketAdapterRow {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  adapterStatus: 'held_local_artifact_created' | 'blocked_contract_gap';
  artifact: HeldLocalReviewTicketArtifact | null;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalTicketAdapterReport {
  reportType: 'unified_positive_held_local_ticket_adapter';
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
    contractComparisonPath: string | null;
  };
  summary: {
    comparisonRowsLoaded: number;
    heldLocalArtifactsCreated: number;
    blockedContractGapRows: number;
    shouldPostFalseArtifacts: number;
    canExecuteFalseArtifacts: number;
    publishDiscordFalseArtifacts: number;
  };
  rows: UnifiedPositiveHeldLocalTicketAdapterRow[];
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

function rowForComparison(row: UnifiedPositiveDeskTicketContractComparisonReport['rows'][number]): UnifiedPositiveHeldLocalTicketAdapterRow {
  if (row.compatibilityStatus !== 'compatible_held_local') {
    return {
      ticketId: row.ticketId,
      sourceSnapshotId: row.sourceSnapshotId,
      setupType: row.setupType,
      direction: row.direction,
      adapterStatus: 'blocked_contract_gap',
      artifact: null,
      blockers: row.blockers.length ? row.blockers : ['contract comparison row was not compatible_held_local'],
    };
  }
  const ticket = row.simulatedDeskTicket;
  if (
    row.direction !== 'LONG' &&
    row.direction !== 'SHORT'
  ) {
    return {
      ticketId: row.ticketId,
      sourceSnapshotId: row.sourceSnapshotId,
      setupType: row.setupType,
      direction: row.direction,
      adapterStatus: 'blocked_contract_gap',
      artifact: null,
      blockers: ['held-local adapter requires LONG or SHORT direction'],
    };
  }
  if (ticket.entry === null || ticket.stop === null || ticket.t1 === null || ticket.t2 === null) {
    return {
      ticketId: row.ticketId,
      sourceSnapshotId: row.sourceSnapshotId,
      setupType: row.setupType,
      direction: row.direction,
      adapterStatus: 'blocked_contract_gap',
      artifact: null,
      blockers: ['DeskTicket comparison row has incomplete entry/stop/T1/T2 levels'],
    };
  }
  const artifact = buildHeldLocalReviewTicketArtifact({
    ticketId: row.ticketId,
    setupType: row.setupType as SetupType,
    direction: row.direction,
    sourceCandidateKey: ticket.sourceCandidateKey || row.sourceSnapshotId,
    entry: ticket.entry,
    stop: ticket.stop,
    target1: ticket.t1,
    target2: ticket.t2,
    proofTime: row.simulatedPublishDecision.triggerCondition || 'completed 5M proof',
    triggerCondition: ticket.triggerCondition,
    invalidationText: ticket.invalidationText,
    htfStory: ticket.htfStory,
    notes: row.notes,
  });
  return {
    ticketId: row.ticketId,
    sourceSnapshotId: row.sourceSnapshotId,
    setupType: row.setupType,
    direction: row.direction,
    adapterStatus: 'held_local_artifact_created',
    artifact,
    blockers: [],
  };
}

function authority(): UnifiedPositiveHeldLocalTicketAdapterReport['authority'] {
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

function buildRecommendations(report: Omit<UnifiedPositiveHeldLocalTicketAdapterReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Do not post held-local artifacts to Discord from this report.',
    'Keep these artifacts as scanner-owned dry-run evidence until a separate live wiring gate is approved.',
  ];
  if (report.summary.heldLocalArtifactsCreated > 0) {
    recommendations.push('Next phase can add a scanner dry-run replay that emits these artifacts beside normal DeskState output without changing publish behavior.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalTicketAdapterReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Ticket Adapter',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Comparison rows loaded: ${report.summary.comparisonRowsLoaded}.`,
    `- Held-local artifacts created: ${report.summary.heldLocalArtifactsCreated}.`,
    `- Blocked contract-gap rows: ${report.summary.blockedContractGapRows}.`,
    `- shouldPost=false artifacts: ${report.summary.shouldPostFalseArtifacts}.`,
    `- canExecute=false artifacts: ${report.summary.canExecuteFalseArtifacts}.`,
    `- publishDiscord=false artifacts: ${report.summary.publishDiscordFalseArtifacts}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Status | shouldPost | canExecute | publishDiscord | Blockers |',
    '|---|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.setupType} | ${row.direction} | ${row.adapterStatus} | ${row.artifact?.deskPublishDecision.shouldPost ?? '-'} | ${row.artifact?.canExecute ?? '-'} | ${row.artifact?.publishDiscord ?? '-'} | ${row.blockers.join(', ') || '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveHeldLocalTicketAdapterReport(args: {
  contractComparison: UnifiedPositiveDeskTicketContractComparisonReport;
  contractComparisonPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalTicketAdapterReport {
  const rows = args.contractComparison.rows.map(rowForComparison);
  const reportBase: Omit<UnifiedPositiveHeldLocalTicketAdapterReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_ticket_adapter',
    generatedAt,
    authority: authority(),
    source: {
      contractComparisonPath: args.contractComparisonPath || null,
    },
    summary: {
      comparisonRowsLoaded: args.contractComparison.rows.length,
      heldLocalArtifactsCreated: rows.filter((row) => row.adapterStatus === 'held_local_artifact_created').length,
      blockedContractGapRows: rows.filter((row) => row.adapterStatus === 'blocked_contract_gap').length,
      shouldPostFalseArtifacts: rows.filter((row) => row.artifact?.deskPublishDecision.shouldPost === false).length,
      canExecuteFalseArtifacts: rows.filter((row) => row.artifact?.canExecute === false).length,
      publishDiscordFalseArtifacts: rows.filter((row) => row.artifact?.publishDiscord === false).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveHeldLocalTicketAdapterReport(
  report: UnifiedPositiveHeldLocalTicketAdapterReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-ticket-adapter-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalTicketAdapterCli(args = process.argv.slice(2)): Promise<void> {
  const contractComparisonPath = readFlag(args, '--contract-comparison');
  if (!contractComparisonPath) throw new Error('Missing required --contract-comparison path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const contractComparison = JSON.parse(fs.readFileSync(contractComparisonPath, 'utf8')) as UnifiedPositiveDeskTicketContractComparisonReport;
  const report = buildUnifiedPositiveHeldLocalTicketAdapterReport({ contractComparison, contractComparisonPath });
  const paths = writeUnifiedPositiveHeldLocalTicketAdapterReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.summary.blockedContractGapRows > 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveHeldLocalTicketAdapterCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
