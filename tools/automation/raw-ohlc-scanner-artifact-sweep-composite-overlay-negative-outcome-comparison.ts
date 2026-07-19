import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-replacement-coverage';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

interface CliOptions {
  negativeSimulationReport: string;
  replacementCoverageReport: string;
  replacementOutcomeReport: string;
  outDir: string;
  json: boolean;
}

interface ComparisonRow {
  slateId: string;
  tradeDate: string;
  session: string;
  overlayTopTicketId: string | null;
  overlayTopSetupType: string | null;
  overlayTopOneMesPl: number | null;
  negativeTopTicketId: string | null;
  negativeTopSetupType: string | null;
  negativeTopOneMesPlBeforeReplay: number | null;
  replacementCoverageStatus: 'ready_for_replay_package' | 'blocked' | 'missing';
  replacementBlockers: string[];
  replacementOutcomeStatus: 'resolved' | 'unresolved' | 'blocked' | 'missing';
  replacementOutcomeLabel: string;
  replacementResolvedOneMesPl: number | null;
  bothSidesResolvedDeltaOneMesPl: number | null;
  evidenceClass:
    | 'both_sides_resolved'
    | 'replacement_resolved_original_missing'
    | 'replacement_unresolved_original_missing'
    | 'replacement_blocked_or_missing';
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_outcome_comparison';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['authority'];
  source: {
    reportDir: string;
    negativeSimulationReportPath: string;
    replacementCoverageReportPath: string;
    replacementOutcomeReportPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    outcomeIsNotRecomputed: true;
    comparisonOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlates: number;
    replacementCoverageReadySlates: number;
    replacementCoverageBlockedSlates: number;
    replacementOutcomeRows: number;
    replacementResolvedRows: number;
    replacementUnresolvedRows: number;
    replacementBlockedRows: number;
    replacementResolvedGrossOneMesPl: number | null;
    bothSidesResolvedRows: number;
    bothSidesResolvedDeltaOneMesPl: number | null;
    replacementResolvedOriginalMissingRows: number;
    replacementUnresolvedOriginalMissingRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_research_only' | 'fix_inputs' | 'prepare_next_research_delta_package';
  };
  rows: ComparisonRow[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonArgs(args = process.argv.slice(2)): CliOptions {
  const negativeSimulationReport = readFlag(args, '--negative-simulation-report');
  const replacementCoverageReport = readFlag(args, '--replacement-coverage-report');
  const replacementOutcomeReport = readFlag(args, '--replacement-outcome-report');
  if (!negativeSimulationReport) throw new Error('--negative-simulation-report is required.');
  if (!replacementCoverageReport) throw new Error('--replacement-coverage-report is required.');
  if (!replacementOutcomeReport) throw new Error('--replacement-outcome-report is required.');
  return {
    negativeSimulationReport,
    replacementCoverageReport,
    replacementOutcomeReport,
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

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['authority'] {
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildRows(args: {
  negativeSimulationReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport | null;
  replacementCoverageReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport | null;
  replacementOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}): ComparisonRow[] {
  const coverageByTicket = new Map((args.replacementCoverageReport?.rows || []).map((row) => [row.ticketId, row]));
  const outcomeByTicket = new Map((args.replacementOutcomeReport?.rows || []).map((row) => [row.ticketId, row]));
  return (args.negativeSimulationReport?.slates || [])
    .filter((slate) => slate.topChanged)
    .map((slate) => {
      const coverage = slate.negativeTopTicketId ? coverageByTicket.get(slate.negativeTopTicketId) : null;
      const outcome = slate.negativeTopTicketId ? outcomeByTicket.get(slate.negativeTopTicketId) : null;
      const replacementResolvedOneMesPl = outcome?.resolvedOneMesPl ?? null;
      const replacementOutcomeStatus: ComparisonRow['replacementOutcomeStatus'] = outcome?.outcomeStatus || 'missing';
      const bothDelta = slate.overlayTopOneMesPl !== null && replacementResolvedOneMesPl !== null
        ? round(replacementResolvedOneMesPl - slate.overlayTopOneMesPl)
        : null;
      const replacementCoverageStatus: ComparisonRow['replacementCoverageStatus'] = coverage?.coverageStatus || 'missing';
      const evidenceClass: ComparisonRow['evidenceClass'] = bothDelta !== null
        ? 'both_sides_resolved'
        : !coverage || coverage.coverageStatus === 'blocked' || !outcome
          ? 'replacement_blocked_or_missing'
          : replacementResolvedOneMesPl !== null && slate.overlayTopOneMesPl === null
            ? 'replacement_resolved_original_missing'
            : 'replacement_unresolved_original_missing';
      return {
        slateId: slate.slateId,
        tradeDate: slate.tradeDate,
        session: slate.session,
        overlayTopTicketId: slate.overlayTopTicketId,
        overlayTopSetupType: slate.overlayTopSetupType,
        overlayTopOneMesPl: slate.overlayTopOneMesPl,
        negativeTopTicketId: slate.negativeTopTicketId,
        negativeTopSetupType: slate.negativeTopSetupType,
        negativeTopOneMesPlBeforeReplay: slate.negativeTopOneMesPl,
        replacementCoverageStatus,
        replacementBlockers: coverage?.blockers || ['missing replacement coverage row'],
        replacementOutcomeStatus,
        replacementOutcomeLabel: outcome?.outcomeLabel || 'missing',
        replacementResolvedOneMesPl,
        bothSidesResolvedDeltaOneMesPl: bothDelta,
        evidenceClass,
      };
    })
    .sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Negative Overlay Outcome Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only comparison over saved negative simulation, replacement coverage, and outcome reports. It does not recompute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Replacement coverage ready/blocked: ${report.summary.replacementCoverageReadySlates} / ${report.summary.replacementCoverageBlockedSlates}.`,
    `- Replacement resolved/unresolved/blocked rows: ${report.summary.replacementResolvedRows} / ${report.summary.replacementUnresolvedRows} / ${report.summary.replacementBlockedRows}.`,
    `- Replacement resolved gross one-MES P/L: ${report.summary.replacementResolvedGrossOneMesPl ?? '-'}.`,
    `- Both-side resolved rows: ${report.summary.bothSidesResolvedRows}.`,
    `- Both-side resolved delta: ${report.summary.bothSidesResolvedDeltaOneMesPl ?? '-'}.`,
    `- Replacement-resolved/original-missing rows: ${report.summary.replacementResolvedOriginalMissingRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Slate | Overlay Top | Overlay P/L | Replacement Top | Coverage | Outcome | Replacement P/L | Evidence Class |',
    '|---|---|---:|---|---|---|---:|---|',
    ...report.rows.slice(0, 80).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.overlayTopTicketId ?? '-')} | ${row.overlayTopOneMesPl ?? '-'} | ${escapeTable(row.negativeTopTicketId ?? '-')} | ${row.replacementCoverageStatus} | ${row.replacementOutcomeLabel} | ${row.replacementResolvedOneMesPl ?? '-'} | ${row.evidenceClass} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport(args: {
  reportDir: string;
  negativeSimulationReportPath: string;
  replacementCoverageReportPath: string;
  replacementOutcomeReportPath: string;
  negativeSimulationReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport | null;
  replacementCoverageReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeReplacementCoverageReport | null;
  replacementOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport {
  const rows = buildRows(args);
  const bothRows = rows.filter((row) => row.evidenceClass === 'both_sides_resolved');
  const blockers = [
    !args.negativeSimulationReport ? 'missing negative simulation report' : null,
    !args.replacementCoverageReport ? 'missing replacement coverage report' : null,
    !args.replacementOutcomeReport ? 'missing replacement outcome report' : null,
    args.negativeSimulationReport && args.negativeSimulationReport.status !== 'pass' ? `negative simulation report status ${args.negativeSimulationReport.status}` : null,
    args.replacementCoverageReport && args.replacementCoverageReport.status !== 'pass' ? `replacement coverage report status ${args.replacementCoverageReport.status}` : null,
    args.replacementOutcomeReport && args.replacementOutcomeReport.status !== 'pass' ? `replacement outcome report status ${args.replacementOutcomeReport.status}` : null,
    rows.length === 0 ? 'no changed slates available for comparison' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : bothRows.length
      ? 'prepare_next_research_delta_package'
      : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_outcome_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      negativeSimulationReportPath: args.negativeSimulationReportPath,
      replacementCoverageReportPath: args.replacementCoverageReportPath,
      replacementOutcomeReportPath: args.replacementOutcomeReportPath,
    },
    assumptions: {
      savedReportsOnly: true,
      outcomeIsNotRecomputed: true,
      comparisonOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlates: rows.length,
      replacementCoverageReadySlates: rows.filter((row) => row.replacementCoverageStatus === 'ready_for_replay_package').length,
      replacementCoverageBlockedSlates: rows.filter((row) => row.replacementCoverageStatus !== 'ready_for_replay_package').length,
      replacementOutcomeRows: args.replacementOutcomeReport?.rows?.length || 0,
      replacementResolvedRows: rows.filter((row) => row.replacementOutcomeStatus === 'resolved').length,
      replacementUnresolvedRows: rows.filter((row) => row.replacementOutcomeStatus === 'unresolved').length,
      replacementBlockedRows: rows.filter((row) => row.replacementOutcomeStatus === 'blocked').length,
      replacementResolvedGrossOneMesPl: sum(rows.map((row) => row.replacementResolvedOneMesPl)),
      bothSidesResolvedRows: bothRows.length,
      bothSidesResolvedDeltaOneMesPl: sum(bothRows.map((row) => row.bothSidesResolvedDeltaOneMesPl)),
      replacementResolvedOriginalMissingRows: rows.filter((row) => row.evidenceClass === 'replacement_resolved_original_missing').length,
      replacementUnresolvedOriginalMissingRows: rows.filter((row) => row.evidenceClass === 'replacement_unresolved_original_missing').length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this comparison.']
      : [
        'Keep this research-only: replacement-side evidence improved, but original overlay tops are still missing outcomes on these changed slates.',
        'Do not install scanner-visible ranking until a follow-up package can produce reliable both-side or no-chase-blocked comparison evidence.',
        'Preserve canExecute, entry/stop/target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-outcome-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport({
    reportDir: options.outDir,
    negativeSimulationReportPath: options.negativeSimulationReport,
    replacementCoverageReportPath: options.replacementCoverageReport,
    replacementOutcomeReportPath: options.replacementOutcomeReport,
    negativeSimulationReport: fs.existsSync(options.negativeSimulationReport) ? readJson(options.negativeSimulationReport) : null,
    replacementCoverageReport: fs.existsSync(options.replacementCoverageReport) ? readJson(options.replacementCoverageReport) : null,
    replacementOutcomeReport: fs.existsSync(options.replacementOutcomeReport) ? readJson(options.replacementOutcomeReport) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
