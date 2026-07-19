import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-model-tag-crosstab';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-original-top-drilldown';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-outcome-comparison';

interface CliOptions {
  originalTopDrilldown: string;
  outcomeComparison: string;
  modelTagCrosstab: string;
  outDir: string;
  json: boolean;
}

interface SimulationRow {
  slateId: string;
  tradeDate: string;
  session: string;
  originalTopTicketId: string;
  originalTopSetupType: string | null;
  originalEvidenceClass: string;
  originalSourceTags: string[];
  replacementTopTicketId: string | null;
  replacementTopSetupType: string | null;
  replacementCoverageStatus: 'ready_for_replay_package' | 'blocked' | 'missing';
  replacementOutcomeStatus: 'resolved' | 'unresolved' | 'blocked' | 'missing';
  replacementOutcomeLabel: string;
  replacementResolvedOneMesPl: number | null;
  selectedByHtfMssOnlyOverlay: boolean;
  selectionBlockers: string[];
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_only_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport['authority'];
  source: {
    reportDir: string;
    originalTopDrilldownPath: string;
    outcomeComparisonPath: string;
    modelTagCrosstabPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnlySimulation: true;
    outcomeIsNotRecomputed: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  selectionRule: {
    originalEvidenceClass: 'no_chase_or_stale_original';
    replacementSetupType: 'HtfDisplacementMssContinuation';
    replacementCoverageStatus: 'ready_for_replay_package';
    promotionDisabled: true;
  };
  summary: {
    changedSlates: number;
    selectedRows: number;
    selectedResolvedRows: number;
    selectedUnresolvedRows: number;
    selectedBlockedRows: number;
    selectedResolvedGrossOneMesPl: number | null;
    rejectedRows: number;
    rejectedNonHtfMssRows: number;
    rejectedNoCoverageRows: number;
    rejectedOriginalEvidenceRows: number;
    selectedNoChaseRows: number;
    selectedLateDayRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_research_only' | 'fix_inputs' | 'prepare_promotion_disabled_live_proposal';
  };
  rows: SimulationRow[];
  blockers: string[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationArgs(args = process.argv.slice(2)): CliOptions {
  const originalTopDrilldown = readFlag(args, '--original-top-drilldown');
  const outcomeComparison = readFlag(args, '--outcome-comparison');
  const modelTagCrosstab = readFlag(args, '--model-tag-crosstab');
  if (!originalTopDrilldown) throw new Error('--original-top-drilldown is required.');
  if (!outcomeComparison) throw new Error('--outcome-comparison is required.');
  if (!modelTagCrosstab) throw new Error('--model-tag-crosstab is required.');
  return {
    originalTopDrilldown,
    outcomeComparison,
    modelTagCrosstab,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport['authority'] {
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

function selectionBlockers(args: {
  originalEvidenceClass: string;
  replacementSetupType: string | null;
  replacementCoverageStatus: SimulationRow['replacementCoverageStatus'];
}): string[] {
  return [
    args.originalEvidenceClass !== 'no_chase_or_stale_original' ? `original evidence ${args.originalEvidenceClass}` : null,
    args.replacementSetupType !== 'HtfDisplacementMssContinuation' ? `replacement setup ${args.replacementSetupType || 'missing'}` : null,
    args.replacementCoverageStatus !== 'ready_for_replay_package' ? `replacement coverage ${args.replacementCoverageStatus}` : null,
  ].filter((item): item is string => Boolean(item));
}

function buildRows(args: {
  originalTopDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport | null;
  outcomeComparison: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport | null;
}): SimulationRow[] {
  const originalBySlate = new Map((args.originalTopDrilldown?.rows || []).map((row) => [row.slateId, row]));
  return (args.outcomeComparison?.rows || []).map((comparisonRow) => {
    const originalRow = originalBySlate.get(comparisonRow.slateId);
    const blockers = selectionBlockers({
      originalEvidenceClass: originalRow?.evidenceClass || 'missing_original_evidence',
      replacementSetupType: comparisonRow.negativeTopSetupType,
      replacementCoverageStatus: comparisonRow.replacementCoverageStatus,
    });
    return {
      slateId: comparisonRow.slateId,
      tradeDate: comparisonRow.tradeDate,
      session: comparisonRow.session,
      originalTopTicketId: originalRow?.originalTopTicketId || comparisonRow.overlayTopTicketId || 'missing',
      originalTopSetupType: originalRow?.originalTopSetupType || comparisonRow.overlayTopSetupType,
      originalEvidenceClass: originalRow?.evidenceClass || 'missing_original_evidence',
      originalSourceTags: originalRow?.originalSourceTags || [],
      replacementTopTicketId: comparisonRow.negativeTopTicketId,
      replacementTopSetupType: comparisonRow.negativeTopSetupType,
      replacementCoverageStatus: comparisonRow.replacementCoverageStatus,
      replacementOutcomeStatus: comparisonRow.replacementOutcomeStatus,
      replacementOutcomeLabel: comparisonRow.replacementOutcomeLabel,
      replacementResolvedOneMesPl: comparisonRow.replacementResolvedOneMesPl,
      selectedByHtfMssOnlyOverlay: blockers.length === 0,
      selectionBlockers: blockers,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport, 'markdown'>): string {
  return [
    '# Raw-OHLC HTF MSS-Only Overlay Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only HTF-MSS-only overlay simulation over saved reports. It does not recompute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Selected resolved/unresolved/blocked: ${report.summary.selectedResolvedRows} / ${report.summary.selectedUnresolvedRows} / ${report.summary.selectedBlockedRows}.`,
    `- Selected resolved gross one-MES P/L: ${report.summary.selectedResolvedGrossOneMesPl ?? '-'}.`,
    `- Rejected rows: ${report.summary.rejectedRows}.`,
    `- Rejected non-HTF-MSS rows: ${report.summary.rejectedNonHtfMssRows}.`,
    `- Rejected no-coverage rows: ${report.summary.rejectedNoCoverageRows}.`,
    `- Selected no-chase/late-day rows: ${report.summary.selectedNoChaseRows} / ${report.summary.selectedLateDayRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selected Rows',
    '| Slate | Original | Replacement | Outcome | P/L | Tags |',
    '|---|---|---|---|---:|---|',
    ...report.rows.filter((row) => row.selectedByHtfMssOnlyOverlay).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.originalTopTicketId)} | ${escapeTable(row.replacementTopTicketId ?? '-')} | ${row.replacementOutcomeLabel} | ${row.replacementResolvedOneMesPl ?? '-'} | ${escapeTable(row.originalSourceTags.join(', ') || '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport(args: {
  reportDir: string;
  originalTopDrilldownPath: string;
  outcomeComparisonPath: string;
  modelTagCrosstabPath: string;
  originalTopDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport | null;
  outcomeComparison: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport | null;
  modelTagCrosstab: RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport {
  const rows = buildRows(args);
  const selectedRows = rows.filter((row) => row.selectedByHtfMssOnlyOverlay);
  const blockers = [
    !args.originalTopDrilldown ? 'missing original-top drilldown report' : null,
    !args.outcomeComparison ? 'missing outcome comparison report' : null,
    !args.modelTagCrosstab ? 'missing model/tag cross-tab report' : null,
    args.originalTopDrilldown && args.originalTopDrilldown.status !== 'pass' ? `original-top drilldown status ${args.originalTopDrilldown.status}` : null,
    args.outcomeComparison && args.outcomeComparison.status !== 'pass' ? `outcome comparison status ${args.outcomeComparison.status}` : null,
    args.modelTagCrosstab && args.modelTagCrosstab.status !== 'pass' ? `model/tag cross-tab status ${args.modelTagCrosstab.status}` : null,
    rows.length === 0 ? 'no changed-slate rows available' : null,
    args.modelTagCrosstab && args.modelTagCrosstab.summary.recommendation !== 'isolate_htf_mss_research_overlay'
      ? `model/tag recommendation ${args.modelTagCrosstab.summary.recommendation}`
      : null,
  ].filter((item): item is string => Boolean(item));
  const selectedResolvedPl = sum(selectedRows.map((row) => row.replacementResolvedOneMesPl));
  const recommendation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : selectedRows.length > 0 && (selectedResolvedPl ?? 0) > 0
      ? 'prepare_promotion_disabled_live_proposal'
      : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_only_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      originalTopDrilldownPath: args.originalTopDrilldownPath,
      outcomeComparisonPath: args.outcomeComparisonPath,
      modelTagCrosstabPath: args.modelTagCrosstabPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnlySimulation: true,
      outcomeIsNotRecomputed: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    selectionRule: {
      originalEvidenceClass: 'no_chase_or_stale_original',
      replacementSetupType: 'HtfDisplacementMssContinuation',
      replacementCoverageStatus: 'ready_for_replay_package',
      promotionDisabled: true,
    },
    summary: {
      changedSlates: rows.length,
      selectedRows: selectedRows.length,
      selectedResolvedRows: selectedRows.filter((row) => row.replacementOutcomeStatus === 'resolved').length,
      selectedUnresolvedRows: selectedRows.filter((row) => row.replacementOutcomeStatus === 'unresolved').length,
      selectedBlockedRows: selectedRows.filter((row) => row.replacementOutcomeStatus === 'blocked' || row.replacementOutcomeStatus === 'missing').length,
      selectedResolvedGrossOneMesPl: selectedResolvedPl,
      rejectedRows: rows.length - selectedRows.length,
      rejectedNonHtfMssRows: rows.filter((row) => row.selectionBlockers.some((blocker) => blocker.startsWith('replacement setup'))).length,
      rejectedNoCoverageRows: rows.filter((row) => row.selectionBlockers.some((blocker) => blocker.startsWith('replacement coverage'))).length,
      rejectedOriginalEvidenceRows: rows.filter((row) => row.selectionBlockers.some((blocker) => blocker.startsWith('original evidence'))).length,
      selectedNoChaseRows: selectedRows.filter((row) => row.originalSourceTags.includes('no_chase')).length,
      selectedLateDayRows: selectedRows.filter((row) => row.originalSourceTags.includes('late_day_after_1500')).length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this simulation.']
      : [
        'Treat this as a promotion-disabled research proposal candidate only; do not install scanner-visible ranking without a separate approval checkpoint.',
        'The next phase should convert this into a formal live-proposal document with promotion disabled, explicit guardrails, and regression tests proving no Discord/Supabase/bridge/canExecute behavior changes.',
        'Preserve canExecute, entry/stop/target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-only-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport({
    reportDir: options.outDir,
    originalTopDrilldownPath: options.originalTopDrilldown,
    outcomeComparisonPath: options.outcomeComparison,
    modelTagCrosstabPath: options.modelTagCrosstab,
    originalTopDrilldown: fs.existsSync(options.originalTopDrilldown) ? readJson(options.originalTopDrilldown) : null,
    outcomeComparison: fs.existsSync(options.outcomeComparison) ? readJson(options.outcomeComparison) : null,
    modelTagCrosstab: fs.existsSync(options.modelTagCrosstab) ? readJson(options.modelTagCrosstab) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
