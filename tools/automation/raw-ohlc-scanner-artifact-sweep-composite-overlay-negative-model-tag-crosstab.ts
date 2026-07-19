import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-original-top-drilldown';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-outcome-comparison';

interface CliOptions {
  originalTopDrilldown: string;
  outcomeComparison: string;
  outDir: string;
  json: boolean;
}

interface CrossTabRow {
  key: string;
  originalEvidenceClass: string;
  replacementSetupType: string;
  replacementOutcomeLabel: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedOrMissingRows: number;
  replacementResolvedGrossOneMesPl: number | null;
  slateIds: string[];
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_model_tag_crosstab';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport['authority'];
  source: {
    reportDir: string;
    originalTopDrilldownPath: string;
    outcomeComparisonPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    crossTabOnly: true;
    outcomeIsNotRecomputed: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlates: number;
    joinedRows: number;
    groups: number;
    htfMssRows: number;
    htfMssResolvedRows: number;
    htfMssResolvedGrossOneMesPl: number | null;
    nonHtfMssResolvedGrossOneMesPl: number | null;
    noChaseOrStaleRows: number;
    targetRoomOrEntryPendingRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_research_only' | 'fix_inputs' | 'isolate_htf_mss_research_overlay';
  };
  rows: CrossTabRow[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabArgs(args = process.argv.slice(2)): CliOptions {
  const originalTopDrilldown = readFlag(args, '--original-top-drilldown');
  const outcomeComparison = readFlag(args, '--outcome-comparison');
  if (!originalTopDrilldown) throw new Error('--original-top-drilldown is required.');
  if (!outcomeComparison) throw new Error('--outcome-comparison is required.');
  return {
    originalTopDrilldown,
    outcomeComparison,
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

function buildRows(args: {
  originalTopDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport | null;
  outcomeComparison: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport | null;
}): CrossTabRow[] {
  const originalBySlate = new Map((args.originalTopDrilldown?.rows || []).map((row) => [row.slateId, row]));
  const joined = (args.outcomeComparison?.rows || []).map((comparisonRow) => ({
    comparisonRow,
    originalRow: originalBySlate.get(comparisonRow.slateId),
  })).filter((row) => row.originalRow);
  const groups = new Map<string, typeof joined>();
  for (const row of joined) {
    const key = [
      row.originalRow?.evidenceClass || 'missing_original_evidence',
      row.comparisonRow.negativeTopSetupType || 'UnknownSetup',
      row.comparisonRow.replacementOutcomeLabel || 'missing',
    ].join('|');
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const [originalEvidenceClass, replacementSetupType, replacementOutcomeLabel] = key.split('|');
    return {
      key,
      originalEvidenceClass,
      replacementSetupType,
      replacementOutcomeLabel,
      rows: groupRows.length,
      resolvedRows: groupRows.filter((row) => row.comparisonRow.replacementOutcomeStatus === 'resolved').length,
      unresolvedRows: groupRows.filter((row) => row.comparisonRow.replacementOutcomeStatus === 'unresolved').length,
      blockedOrMissingRows: groupRows.filter((row) => row.comparisonRow.replacementOutcomeStatus === 'blocked' || row.comparisonRow.replacementOutcomeStatus === 'missing').length,
      replacementResolvedGrossOneMesPl: sum(groupRows.map((row) => row.comparisonRow.replacementResolvedOneMesPl)),
      slateIds: groupRows.map((row) => row.comparisonRow.slateId).sort(),
    };
  }).sort((a, b) => b.rows - a.rows || a.key.localeCompare(b.key));
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Negative Overlay Model/Tag Cross-Tab',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only cross-tab over saved original-top and outcome comparison reports. It does not recompute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Groups: ${report.summary.groups}.`,
    `- HTF MSS rows/resolved/P&L: ${report.summary.htfMssRows} / ${report.summary.htfMssResolvedRows} / ${report.summary.htfMssResolvedGrossOneMesPl ?? '-'}.`,
    `- Non-HTF MSS resolved P&L: ${report.summary.nonHtfMssResolvedGrossOneMesPl ?? '-'}.`,
    `- No-chase/stale original rows: ${report.summary.noChaseOrStaleRows}.`,
    `- Target-room/entry-pending original rows: ${report.summary.targetRoomOrEntryPendingRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Original Evidence | Replacement Setup | Replacement Outcome | Rows | Resolved | Unresolved | Blocked/Missing | Replacement P/L |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.rows.map((row) => `| ${escapeTable(row.originalEvidenceClass)} | ${escapeTable(row.replacementSetupType)} | ${escapeTable(row.replacementOutcomeLabel)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.blockedOrMissingRows} | ${row.replacementResolvedGrossOneMesPl ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport(args: {
  reportDir: string;
  originalTopDrilldownPath: string;
  outcomeComparisonPath: string;
  originalTopDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport | null;
  outcomeComparison: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOutcomeComparisonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport {
  const rows = buildRows(args);
  const htfRows = rows.filter((row) => row.replacementSetupType === 'HtfDisplacementMssContinuation');
  const nonHtfRows = rows.filter((row) => row.replacementSetupType !== 'HtfDisplacementMssContinuation');
  const htfPl = sum(htfRows.map((row) => row.replacementResolvedGrossOneMesPl));
  const nonHtfPl = sum(nonHtfRows.map((row) => row.replacementResolvedGrossOneMesPl));
  const blockers = [
    !args.originalTopDrilldown ? 'missing original-top drilldown report' : null,
    !args.outcomeComparison ? 'missing outcome comparison report' : null,
    args.originalTopDrilldown && args.originalTopDrilldown.status !== 'pass' ? `original-top drilldown status ${args.originalTopDrilldown.status}` : null,
    args.outcomeComparison && args.outcomeComparison.status !== 'pass' ? `outcome comparison status ${args.outcomeComparison.status}` : null,
    rows.length === 0 ? 'no joined changed-slate rows available' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : (htfPl ?? 0) > 0 && (nonHtfPl ?? 0) <= 0
      ? 'isolate_htf_mss_research_overlay'
      : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_model_tag_crosstab',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      originalTopDrilldownPath: args.originalTopDrilldownPath,
      outcomeComparisonPath: args.outcomeComparisonPath,
    },
    assumptions: {
      savedReportsOnly: true,
      crossTabOnly: true,
      outcomeIsNotRecomputed: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlates: args.outcomeComparison?.summary.changedSlates || 0,
      joinedRows: rows.reduce((total, row) => total + row.rows, 0),
      groups: rows.length,
      htfMssRows: htfRows.reduce((total, row) => total + row.rows, 0),
      htfMssResolvedRows: htfRows.reduce((total, row) => total + row.resolvedRows, 0),
      htfMssResolvedGrossOneMesPl: htfPl,
      nonHtfMssResolvedGrossOneMesPl: nonHtfPl,
      noChaseOrStaleRows: rows.filter((row) => row.originalEvidenceClass === 'no_chase_or_stale_original').reduce((total, row) => total + row.rows, 0),
      targetRoomOrEntryPendingRows: rows.filter((row) => row.originalEvidenceClass === 'target_room_or_entry_pending_original').reduce((total, row) => total + row.rows, 0),
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this cross-tab.']
      : [
        'Use this as research-only model/tag evidence; do not install scanner-visible ranking from this report alone.',
        'If the HTF MSS replacement group remains the only positive resolved bucket, the next phase should isolate HTF-MSS-only overlay behavior with promotion disabled.',
        'Preserve canExecute, entry/stop/target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-model-tag-crosstab-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport({
    reportDir: options.outDir,
    originalTopDrilldownPath: options.originalTopDrilldown,
    outcomeComparisonPath: options.outcomeComparison,
    originalTopDrilldown: fs.existsSync(options.originalTopDrilldown) ? readJson(options.originalTopDrilldown) : null,
    outcomeComparison: fs.existsSync(options.outcomeComparison) ? readJson(options.outcomeComparison) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
