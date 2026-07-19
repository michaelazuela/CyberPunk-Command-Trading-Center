import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

interface CliOptions {
  outcomeReport: string;
  outDir: string;
  json: boolean;
}

interface ClassifiedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  outcomeLabel: string;
  barsAfterProof: number;
  riskPoints: number;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  favorableR: number | null;
  adverseR: number | null;
  classLabel:
    | 'no_fill_late_or_unreached_entry'
    | 'entered_near_t1_but_unresolved'
    | 'entered_weak_followthrough'
    | 'entered_adverse_near_stop_but_unresolved'
    | 'resolved_or_blocked_not_classified';
}

interface GroupSummary {
  key: string;
  rows: number;
  noFillRows: number;
  nearT1Rows: number;
  weakFollowthroughRows: number;
  adverseNearStopRows: number;
  avgFavorableR: number | null;
  avgAdverseR: number | null;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_unresolved_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['authority'];
  source: {
    reportDir: string;
    outcomeReportPath: string;
  };
  assumptions: {
    savedOutcomeReportOnly: true;
    outcomeIsNotRecomputed: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    outcomeRows: number;
    unresolvedRows: number;
    noFillRows: number;
    enteredUnresolvedRows: number;
    nearT1Rows: number;
    weakFollowthroughRows: number;
    adverseNearStopRows: number;
    modelGroups: number;
    sessionGroups: number;
    livePromotionAllowedRows: 0;
    recommendation: 'do_not_use_missing_top_coverage_as_positive_evidence' | 'fix_inputs';
  };
  rows: ClassifiedRow[];
  modelGroups: GroupSummary[];
  daySessionModelGroups: GroupSummary[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const outcomeReport = readFlag(args, '--outcome-report');
  if (!outcomeReport) throw new Error('--outcome-report is required.');
  return {
    outcomeReport,
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

function avg(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
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

function classifyRow(row: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number]): ClassifiedRow {
  const favorableR = row.maximumFavorableExcursion === null || row.riskPoints <= 0 ? null : round(row.maximumFavorableExcursion / row.riskPoints);
  const adverseR = row.maximumAdverseExcursion === null || row.riskPoints <= 0 ? null : round(row.maximumAdverseExcursion / row.riskPoints);
  const classLabel: ClassifiedRow['classLabel'] = row.outcomeLabel === 'no_fill'
    ? 'no_fill_late_or_unreached_entry'
    : row.outcomeStatus !== 'unresolved'
      ? 'resolved_or_blocked_not_classified'
      : favorableR !== null && favorableR >= 1 && favorableR < 1.5
        ? 'entered_near_t1_but_unresolved'
        : adverseR !== null && adverseR >= 0.75
          ? 'entered_adverse_near_stop_but_unresolved'
          : 'entered_weak_followthrough';
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    outcomeLabel: row.outcomeLabel,
    barsAfterProof: row.barsAfterProof,
    riskPoints: row.riskPoints,
    maximumFavorableExcursion: row.maximumFavorableExcursion,
    maximumAdverseExcursion: row.maximumAdverseExcursion,
    favorableR,
    adverseR,
    classLabel,
  };
}

function groupRows(rows: ClassifiedRow[], keyOf: (row: ClassifiedRow) => string): GroupSummary[] {
  const groups = new Map<string, ClassifiedRow[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].map(([key, groupRowsValue]) => ({
    key,
    rows: groupRowsValue.length,
    noFillRows: groupRowsValue.filter((row) => row.classLabel === 'no_fill_late_or_unreached_entry').length,
    nearT1Rows: groupRowsValue.filter((row) => row.classLabel === 'entered_near_t1_but_unresolved').length,
    weakFollowthroughRows: groupRowsValue.filter((row) => row.classLabel === 'entered_weak_followthrough').length,
    adverseNearStopRows: groupRowsValue.filter((row) => row.classLabel === 'entered_adverse_near_stop_but_unresolved').length,
    avgFavorableR: avg(groupRowsValue.map((row) => row.favorableR)),
    avgAdverseR: avg(groupRowsValue.map((row) => row.adverseR)),
  })).sort((a, b) => b.rows - a.rows || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Overlay Missing-Top Unresolved Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only classification over a saved outcome report. It does not recompute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- No-fill rows: ${report.summary.noFillRows}.`,
    `- Entered unresolved rows: ${report.summary.enteredUnresolvedRows}.`,
    `- Near-T1 unresolved rows: ${report.summary.nearT1Rows}.`,
    `- Weak-followthrough unresolved rows: ${report.summary.weakFollowthroughRows}.`,
    `- Adverse-near-stop unresolved rows: ${report.summary.adverseNearStopRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Model Groups',
    '| Group | Rows | No Fill | Near T1 | Weak | Adverse Near Stop | Avg Fav R | Avg Adv R |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...report.modelGroups.map((group) => `| ${escapeTable(group.key)} | ${group.rows} | ${group.noFillRows} | ${group.nearT1Rows} | ${group.weakFollowthroughRows} | ${group.adverseNearStopRows} | ${group.avgFavorableR ?? '-'} | ${group.avgAdverseR ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport(args: {
  reportDir: string;
  outcomeReportPath: string;
  outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport {
  const rows = (args.outcomeReport?.rows || []).map(classifyRow);
  const unresolvedRows = rows.filter((row) => row.classLabel !== 'resolved_or_blocked_not_classified');
  const blockers = [
    !args.outcomeReport ? 'missing outcome report' : null,
    args.outcomeReport && args.outcomeReport.status !== 'pass' ? `outcome report status ${args.outcomeReport.status}` : null,
    rows.length === 0 ? 'outcome report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_unresolved_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      outcomeReportPath: args.outcomeReportPath,
    },
    assumptions: {
      savedOutcomeReportOnly: true,
      outcomeIsNotRecomputed: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      outcomeRows: rows.length,
      unresolvedRows: unresolvedRows.length,
      noFillRows: unresolvedRows.filter((row) => row.classLabel === 'no_fill_late_or_unreached_entry').length,
      enteredUnresolvedRows: unresolvedRows.filter((row) => row.classLabel !== 'no_fill_late_or_unreached_entry').length,
      nearT1Rows: unresolvedRows.filter((row) => row.classLabel === 'entered_near_t1_but_unresolved').length,
      weakFollowthroughRows: unresolvedRows.filter((row) => row.classLabel === 'entered_weak_followthrough').length,
      adverseNearStopRows: unresolvedRows.filter((row) => row.classLabel === 'entered_adverse_near_stop_but_unresolved').length,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'do_not_use_missing_top_coverage_as_positive_evidence',
    },
    rows,
    modelGroups: groupRows(rows, (row) => `${row.setupType}|${row.direction}`),
    daySessionModelGroups: groupRows(rows, (row) => `${row.tradeDate}|${row.session}|${row.setupType}|${row.direction}`),
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved outcome report input before using this drilldown.']
      : [
        'Do not treat these missing-top rows as positive evidence; the newly replayed rows did not resolve to T1/T2 or stop.',
        'Use this to narrow the next research pass toward stale/no-chase and target-room quality, not live rank promotion.',
        'Preserve canExecute, Discord/Supabase/bridge behavior, and entry/stop/target/risk math.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-unresolved-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport({
    reportDir: options.outDir,
    outcomeReportPath: options.outcomeReport,
    outcomeReport: fs.existsSync(options.outcomeReport)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.outcomeReport)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
