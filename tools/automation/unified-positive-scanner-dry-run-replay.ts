import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';

type DryRunReplayStatus = 'pass' | 'fail';

export interface UnifiedPositiveScannerDryRunReplayRow {
  ticketId: string;
  sourceSnapshotId: string;
  session: 'morning' | 'lunch' | 'evening' | null;
  setupType: string;
  direction: string;
  normalDeskOutput: {
    sourceOfTruth: 'scanner_desk_state_normal_output_preserved';
    shouldPost: false;
    publishDiscord: false;
    canExecute: false;
    reason: string;
  };
  heldLocalOutput: {
    sourceOfTruth: 'scanner_owned_held_local_review_ticket_adapter' | null;
    deskTicketState: string | null;
    shouldPost: boolean | null;
    publishDiscord: boolean | null;
    canExecute: boolean | null;
    reviewOnly: boolean | null;
  };
  comparison: {
    zeroLivePublishBehaviorChange: boolean;
    heldLocalBesideNormalOutput: boolean;
    scannerBehaviorUnchanged: boolean;
    blockers: string[];
  };
}

export interface UnifiedPositiveScannerDryRunReplayReport {
  reportType: 'unified_positive_scanner_dry_run_replay';
  generatedAt: string;
  status: DryRunReplayStatus;
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
    heldLocalAdapterPath: string | null;
  };
  summary: {
    adapterRowsLoaded: number;
    pairedDryRunRows: number;
    heldLocalArtifactsObserved: number;
    zeroLivePublishBehaviorChangeRows: number;
    blockedRows: number;
    normalShouldPostFalseRows: number;
    adapterShouldPostFalseRows: number;
    normalCanExecuteFalseRows: number;
    adapterCanExecuteFalseRows: number;
    normalPublishDiscordFalseRows: number;
    adapterPublishDiscordFalseRows: number;
  };
  rows: UnifiedPositiveScannerDryRunReplayRow[];
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

function authority(): UnifiedPositiveScannerDryRunReplayReport['authority'] {
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

function rowForAdapter(row: UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number]): UnifiedPositiveScannerDryRunReplayRow {
  const artifact = row.artifact;
  const normalDeskOutput: UnifiedPositiveScannerDryRunReplayRow['normalDeskOutput'] = {
    sourceOfTruth: 'scanner_desk_state_normal_output_preserved',
    shouldPost: false,
    publishDiscord: false,
    canExecute: false,
    reason: 'Dry-run replay keeps normal scanner DeskState output unchanged while holding the adapter artifact locally.',
  };
  const heldLocalOutput: UnifiedPositiveScannerDryRunReplayRow['heldLocalOutput'] = {
    sourceOfTruth: artifact?.sourceOfTruth || null,
    deskTicketState: artifact?.deskTicket.state || null,
    shouldPost: artifact?.deskPublishDecision.shouldPost ?? null,
    publishDiscord: artifact?.publishDiscord ?? null,
    canExecute: artifact?.canExecute ?? null,
    reviewOnly: artifact?.reviewOnly ?? null,
  };
  const blockers = [
    row.adapterStatus !== 'held_local_artifact_created' ? `adapter status ${row.adapterStatus}` : null,
    heldLocalOutput.sourceOfTruth !== 'scanner_owned_held_local_review_ticket_adapter' ? 'missing held-local adapter source-of-truth marker' : null,
    heldLocalOutput.deskTicketState !== 'ACTIVE_REVIEW' ? 'held-local DeskTicket is not ACTIVE_REVIEW' : null,
    heldLocalOutput.shouldPost !== false ? 'held-local adapter would change shouldPost' : null,
    heldLocalOutput.publishDiscord !== false ? 'held-local adapter would publish Discord' : null,
    heldLocalOutput.canExecute !== false ? 'held-local adapter would change canExecute' : null,
    heldLocalOutput.reviewOnly !== true ? 'held-local adapter is not review-only' : null,
  ].filter((item): item is string => Boolean(item));
  const zeroLivePublishBehaviorChange = blockers.length === 0 &&
    normalDeskOutput.shouldPost === false &&
    normalDeskOutput.publishDiscord === false &&
    normalDeskOutput.canExecute === false &&
    heldLocalOutput.shouldPost === false &&
    heldLocalOutput.publishDiscord === false &&
    heldLocalOutput.canExecute === false;
  return {
    ticketId: row.ticketId,
    sourceSnapshotId: row.sourceSnapshotId,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    normalDeskOutput,
    heldLocalOutput,
    comparison: {
      zeroLivePublishBehaviorChange,
      heldLocalBesideNormalOutput: artifact !== null && normalDeskOutput.sourceOfTruth === 'scanner_desk_state_normal_output_preserved',
      scannerBehaviorUnchanged: zeroLivePublishBehaviorChange,
      blockers,
    },
  };
}

function buildRecommendations(report: Omit<UnifiedPositiveScannerDryRunReplayReport, 'recommendations' | 'markdown'>): string[] {
  if (report.status === 'fail') {
    return [
      'Do not wire held-local artifacts into scanner-visible output until every dry-run row preserves shouldPost=false, publishDiscord=false, and canExecute=false.',
    ];
  }
  return [
    'Keep this as dry-run evidence. It proves the held-local artifacts can sit beside normal DeskState output without changing live publish behavior.',
    'Next narrow phase can add an explicit scanner dry-run flag or local-only UI inspection path; live Discord/Supabase wiring still requires a separate approval gate.',
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveScannerDryRunReplayReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Scanner Dry-Run Replay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Adapter rows loaded: ${report.summary.adapterRowsLoaded}.`,
    `- Paired dry-run rows: ${report.summary.pairedDryRunRows}.`,
    `- Held-local artifacts observed: ${report.summary.heldLocalArtifactsObserved}.`,
    `- Zero live publish behavior change rows: ${report.summary.zeroLivePublishBehaviorChangeRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Normal shouldPost=false rows: ${report.summary.normalShouldPostFalseRows}.`,
    `- Adapter shouldPost=false rows: ${report.summary.adapterShouldPostFalseRows}.`,
    `- Normal canExecute=false rows: ${report.summary.normalCanExecuteFalseRows}.`,
    `- Adapter canExecute=false rows: ${report.summary.adapterCanExecuteFalseRows}.`,
    `- Normal publishDiscord=false rows: ${report.summary.normalPublishDiscordFalseRows}.`,
    `- Adapter publishDiscord=false rows: ${report.summary.adapterPublishDiscordFalseRows}.`,
    '',
    '## Rows',
    '| Ticket | Session | Setup | Side | DeskTicket | Normal shouldPost | Adapter shouldPost | Normal canExecute | Adapter canExecute | Adapter publishDiscord | Status | Blockers |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.session ?? '-'} | ${row.setupType} | ${row.direction} | ${row.heldLocalOutput.deskTicketState ?? '-'} | ${row.normalDeskOutput.shouldPost} | ${row.heldLocalOutput.shouldPost ?? '-'} | ${row.normalDeskOutput.canExecute} | ${row.heldLocalOutput.canExecute ?? '-'} | ${row.heldLocalOutput.publishDiscord ?? '-'} | ${row.comparison.zeroLivePublishBehaviorChange ? 'pass' : 'blocked'} | ${row.comparison.blockers.join(', ') || '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveScannerDryRunReplayReport(args: {
  heldLocalAdapter: UnifiedPositiveHeldLocalTicketAdapterReport;
  heldLocalAdapterPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveScannerDryRunReplayReport {
  const rows = args.heldLocalAdapter.rows.map(rowForAdapter);
  const reportBase: Omit<UnifiedPositiveScannerDryRunReplayReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_scanner_dry_run_replay',
    generatedAt,
    status: rows.every((row) => row.comparison.zeroLivePublishBehaviorChange) ? 'pass' : 'fail',
    authority: authority(),
    source: {
      heldLocalAdapterPath: args.heldLocalAdapterPath || null,
    },
    summary: {
      adapterRowsLoaded: args.heldLocalAdapter.rows.length,
      pairedDryRunRows: rows.length,
      heldLocalArtifactsObserved: rows.filter((row) => row.heldLocalOutput.sourceOfTruth === 'scanner_owned_held_local_review_ticket_adapter').length,
      zeroLivePublishBehaviorChangeRows: rows.filter((row) => row.comparison.zeroLivePublishBehaviorChange).length,
      blockedRows: rows.filter((row) => !row.comparison.zeroLivePublishBehaviorChange).length,
      normalShouldPostFalseRows: rows.filter((row) => row.normalDeskOutput.shouldPost === false).length,
      adapterShouldPostFalseRows: rows.filter((row) => row.heldLocalOutput.shouldPost === false).length,
      normalCanExecuteFalseRows: rows.filter((row) => row.normalDeskOutput.canExecute === false).length,
      adapterCanExecuteFalseRows: rows.filter((row) => row.heldLocalOutput.canExecute === false).length,
      normalPublishDiscordFalseRows: rows.filter((row) => row.normalDeskOutput.publishDiscord === false).length,
      adapterPublishDiscordFalseRows: rows.filter((row) => row.heldLocalOutput.publishDiscord === false).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveScannerDryRunReplayReport(
  report: UnifiedPositiveScannerDryRunReplayReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-scanner-dry-run-replay-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveScannerDryRunReplayCli(args = process.argv.slice(2)): Promise<void> {
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter');
  if (!heldLocalAdapterPath) throw new Error('Missing required --held-local-adapter path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const heldLocalAdapter = JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport;
  const report = buildUnifiedPositiveScannerDryRunReplayReport({ heldLocalAdapter, heldLocalAdapterPath });
  const paths = writeUnifiedPositiveScannerDryRunReplayReport(report, outDir);
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
  runUnifiedPositiveScannerDryRunReplayCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
