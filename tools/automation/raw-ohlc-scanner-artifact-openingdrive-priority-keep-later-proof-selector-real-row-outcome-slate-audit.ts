import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
}

interface SlateRow {
  slateId: string;
  rows: number;
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeStatus: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
}

interface JsonReport {
  status?: string;
  rows?: OutcomeRow[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_outcome_slate_audit';
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
    outcomePath: string | null;
  };
  assumptions: {
    savedOutcomeRowsOnly: true;
    earliestProofPerSlateNoLookahead: true;
    repeatedScannerSnapshotsAreNotIndependentTrades: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    outcomeRows: number;
    repeatedSnapshotRows: number;
    slateRows: number;
    resolvedSlates: number;
    unresolvedSlates: number;
    blockedSlates: number;
    stoppedBeforeT1Slates: number;
    t1OnlySlates: number;
    t1AndT2Slates: number;
    noTargetOrStopSlates: number;
    noFillSlates: number;
    earliestSlateGrossResolvedOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'analyze_losing_and_unresolved_slates_before_runtime_rank_consumer' | 'fix_inputs';
  };
  slateRows: SlateRow[];
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson(filePath: string | null): JsonReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonReport;
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slateId(row: OutcomeRow): string {
  return [row.tradeDate, row.session, row.setupType, row.direction].join('|');
}

function sumResolved(rows: SlateRow[]): number | null {
  const resolved = rows.filter((row) => typeof row.resolvedOneMesPl === 'number');
  if (!resolved.length) return null;
  return Math.round(resolved.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0) * 100) / 100;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Real-Row Outcome Slate Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-outcome slate audit. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Repeated snapshot rows: ${report.summary.repeatedSnapshotRows}.`,
    `- Slate rows: ${report.summary.slateRows}.`,
    `- Resolved slates: ${report.summary.resolvedSlates}.`,
    `- Unresolved slates: ${report.summary.unresolvedSlates}.`,
    `- Blocked slates: ${report.summary.blockedSlates}.`,
    `- T1-only slates: ${report.summary.t1OnlySlates}.`,
    `- T1-and-T2 slates: ${report.summary.t1AndT2Slates}.`,
    `- Stopped-before-T1 slates: ${report.summary.stoppedBeforeT1Slates}.`,
    `- No-target-or-stop slates: ${report.summary.noTargetOrStopSlates}.`,
    `- No-fill slates: ${report.summary.noFillSlates}.`,
    `- Earliest-slate gross resolved one-MES P/L: ${report.summary.earliestSlateGrossResolvedOneMesPl ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport(args: {
  reportDir?: string;
  outcomePath?: string | null;
  outcome?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const outcome = args.outcome ?? readJson(outcomePath);
  const outcomeRows = outcome?.rows || [];
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of outcomeRows) {
    groups.set(slateId(row), [...(groups.get(slateId(row)) || []), row]);
  }
  const slateRows: SlateRow[] = [...groups.entries()].map(([id, rows]) => {
    const selected = [...rows].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime))[0];
    return {
      slateId: id,
      rows: rows.length,
      selectedTicketId: selected.ticketId,
      tradeDate: selected.tradeDate,
      session: selected.session,
      setupType: selected.setupType,
      direction: selected.direction,
      proofTime: selected.proofTime,
      outcomeStatus: selected.outcomeStatus,
      outcomeLabel: selected.outcomeLabel,
      resolvedOneMesPl: selected.resolvedOneMesPl,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
  const blockers = [
    !outcomePath ? 'missing outcome report path' : null,
    !outcome ? 'missing outcome report' : null,
    outcome && outcome.status !== 'pass' ? `outcome report status ${outcome.status}` : null,
    outcomeRows.length === 0 ? 'outcome report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_outcome_slate_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, outcomePath },
    assumptions: {
      savedOutcomeRowsOnly: true,
      earliestProofPerSlateNoLookahead: true,
      repeatedScannerSnapshotsAreNotIndependentTrades: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      outcomeRows: outcomeRows.length,
      repeatedSnapshotRows: Math.max(0, outcomeRows.length - slateRows.length),
      slateRows: slateRows.length,
      resolvedSlates: slateRows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedSlates: slateRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedSlates: slateRows.filter((row) => row.outcomeStatus === 'blocked').length,
      stoppedBeforeT1Slates: slateRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      t1OnlySlates: slateRows.filter((row) => row.outcomeLabel === 't1_hit_only').length,
      t1AndT2Slates: slateRows.filter((row) => row.outcomeLabel === 't1_and_t2_hit').length,
      noTargetOrStopSlates: slateRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      noFillSlates: slateRows.filter((row) => row.outcomeLabel === 'no_fill').length,
      earliestSlateGrossResolvedOneMesPl: sumResolved(slateRows),
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'analyze_losing_and_unresolved_slates_before_runtime_rank_consumer',
    },
    slateRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix outcome report inputs before slate-level analysis.']
      : [
        'Use slate-level results, not raw repeated snapshot totals, for model-quality decisions.',
        'Analyze losing and unresolved earliest slates before any scanner-visible rank consumer.',
        'Keep runtime ranking disabled until a same-slate selector policy is proven.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const outcomePath = readFlag(args, '--outcome') || undefined;
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowOutcomeSlateAuditReport({ reportDir, outcomePath });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-outcome-slate-audit-${Date.now()}.json`);
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
