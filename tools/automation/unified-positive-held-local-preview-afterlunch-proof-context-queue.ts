import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport } from './unified-positive-held-local-preview-afterlunch-changed-slate-drilldown';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;

interface QueueRow {
  queueId: string;
  ticketId: string;
  slateId: string;
  tradeDate: string;
  session: string;
  setupType: 'AfterLunchDriveFvgContinuation';
  direction: string;
  proofTime: string;
  proofRankInSlate: number;
  firstValidProof: boolean;
  changedSlateRow: boolean;
  changedSlateBaselineTop: boolean;
  changedSlateSimulatedTop: boolean;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  enrichmentPriority: number;
  enrichmentReason: string;
  runtimeRankConsumerAllowed: false;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_queue';
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
    sourceProofTimingPath: string | null;
    changedSlateDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    queueOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    sourceRows: number;
    queueRows: number;
    slates: number;
    firstValidProofRows: number;
    changedSlateRows: number;
    highPriorityRows: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'run_afterlunch_specific_proof_context_enrichment' | 'fix_inputs';
  };
  rows: QueueRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'AfterLunchDriveFvgContinuation';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport['authority'] {
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

function groupBySlate(rows: TimingRow[]): Map<string, TimingRow[]> {
  const groups = new Map<string, TimingRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function buildQueueRows(rows: TimingRow[], drilldown: UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport | null): QueueRow[] {
  const changedByTicket = new Map((drilldown?.rows || []).map((row) => [row.ticketId, row]));
  const queued: QueueRow[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const sorted = [...slateRows].sort((a, b) => a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId));
    sorted.forEach((row, index) => {
      const changed = changedByTicket.get(row.ticketId);
      const firstValidProof = index === 0;
      const changedSlateRow = Boolean(changed);
      const enrichmentPriority = firstValidProof && changedSlateRow ? 100 : changedSlateRow ? 90 : firstValidProof ? 75 : 40;
      const reason = firstValidProof && changedSlateRow
        ? 'first_valid_proof_in_changed_slate'
        : changedSlateRow
          ? 'changed_slate_comparison_row'
          : firstValidProof
            ? 'first_valid_proof_in_slate'
            : 'later_afterlunch_proof_context';
      queued.push({
        queueId: `${slateId}|${row.ticketId}`,
        ticketId: row.ticketId,
        slateId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: SETUP,
        direction: row.direction,
        proofTime: row.proofTime,
        proofRankInSlate: index + 1,
        firstValidProof,
        changedSlateRow,
        changedSlateBaselineTop: changed?.baselineTop || false,
        changedSlateSimulatedTop: changed?.simulatedTop || false,
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        riskPoints: row.riskPoints,
        enrichmentPriority,
        enrichmentReason: reason,
        runtimeRankConsumerAllowed: false,
      });
    });
  }
  return queued.sort((a, b) => b.enrichmentPriority - a.enrichmentPriority || a.tradeDate.localeCompare(b.tradeDate) || a.proofRankInSlate - b.proofRankInSlate || a.ticketId.localeCompare(b.ticketId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Context Queue',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report enrichment queue. It does not fetch data, install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Queue rows: ${report.summary.queueRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- First valid proof rows: ${report.summary.firstValidProofRows}.`,
    `- Changed-slate rows: ${report.summary.changedSlateRows}.`,
    `- High-priority rows: ${report.summary.highPriorityRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport(args: {
  reportDir?: string;
  sourceProofTimingPath?: string | null;
  changedSlateDrilldownPath?: string | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  changedSlateDrilldownReport?: UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const changedSlateDrilldownPath = args.changedSlateDrilldownPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-changed-slate-drilldown-');
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const changedSlateDrilldownReport = args.changedSlateDrilldownReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport>(changedSlateDrilldownPath);
  const sourceRows = (sourceProofTimingReport?.rows || []).filter((row) => row.setupType === SETUP);
  const rows = buildQueueRows(sourceRows, changedSlateDrilldownReport || null);
  const blockers = [
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    sourceRows.length === 0 ? 'no AfterLunchDriveFvgContinuation source/proof timing rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_queue',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, sourceProofTimingPath, changedSlateDrilldownPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      queueOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      queueRows: rows.length,
      slates: groupBySlate(sourceRows).size,
      firstValidProofRows: rows.filter((row) => row.firstValidProof).length,
      changedSlateRows: rows.filter((row) => row.changedSlateRow).length,
      highPriorityRows: rows.filter((row) => row.enrichmentPriority >= 90).length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'run_afterlunch_specific_proof_context_enrichment',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved source/proof timing input before building the AfterLunch proof-context queue.']
      : [
        'Use this queue as the input for AfterLunch-specific proof-context enrichment.',
        'Prioritize changed-slate first-proof and replacement rows before mining structural proof-quality fields.',
        'Do not install broad timing/risk boosts or live-facing ranking behavior from the queue itself.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport({
    reportDir,
    sourceProofTimingPath: readFlag(args, '--source-proof-timing') || undefined,
    changedSlateDrilldownPath: readFlag(args, '--changed-slate-drilldown') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-proof-context-queue-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
