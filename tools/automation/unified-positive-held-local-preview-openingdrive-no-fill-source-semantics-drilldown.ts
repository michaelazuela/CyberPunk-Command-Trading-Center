import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface NoFillTimingRow {
  noFillTicketId: string;
  tradeDate: string;
  noFillProofTime: string;
  noFillEntry: number;
  noFillStop: number;
  noFillT1: number;
  noFillT2: number;
  noFillRiskPoints: number;
  originalEntryFirstHitTime: string | null;
}

interface NoFillTimingReport {
  reportType?: string;
  source?: {
    htfStoryReportPath?: string | null;
    htfSourcePath?: string | null;
  };
  rows?: NoFillTimingRow[];
}

interface HtfSourceReport {
  reportType?: string;
  bars?: {
    '5m'?: Bar[];
  };
}

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  proofBarTime: string | null;
  proofBarTouchesEntry: boolean;
  firstEntryHitInclusiveTime: string | null;
  firstEntryHitAfterProofBarTime: string | null;
  firstStopTouchBeforeInclusiveEntryTime: string | null;
  firstStopTouchBeforeAfterProofBarEntryTime: string | null;
  inclusiveEntryWouldFill: boolean;
  afterProofBarEntryWouldFill: boolean;
  sameProofBarEntryOnly: boolean;
  sourceLabelConflict: boolean;
  likelySourceSemantics:
    | 'proof_bar_excluded_no_fill_label'
    | 'entry_touched_after_proof_bar_label_conflict'
    | 'stop_touched_before_later_entry'
    | 'no_completed_5m_entry_touch'
    | 'ambiguous';
  deskRead: string;
}

interface Summary {
  sourceRows: number;
  drilldownRows: number;
  proofBarEntryTouchRows: number;
  afterProofBarEntryTouchRows: number;
  sameProofBarEntryOnlyRows: number;
  sourceLabelConflictRows: number;
  stopBeforeInclusiveEntryRows: number;
  stopBeforeAfterProofBarEntryRows: number;
  livePromotionAllowedRows: 0;
  recommendation:
    | 'fix_no_fill_outcome_semantics_before_selector_work'
    | 'keep_no_fill_rows_out_of_selector_until_more_evidence'
    | 'fix_missing_inputs';
}

export interface OpeningDriveNoFillSourceSemanticsDrilldownReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_no_fill_source_semantics_drilldown';
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
    livePromotionAllowed: false;
  };
  source: {
    noFillTimingReportPath: string | null;
    htfSourcePath: string | null;
  };
  assumptions: {
    usesCompletedFiveMinuteBarsOnly: true;
    inclusiveFillMeansProofBarCanFillEntry: true;
    afterProofBarFillMeansFirstTradableBarIsStrictlyAfterProof: true;
    missingBarsAreNotInvented: true;
    outputIsResearchOnly: true;
  };
  summary: Summary;
  rows: DrilldownRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeTime(value: string): string {
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(normalizeTime(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function levelTraded(bar: Bar, level: number): boolean {
  return bar.low <= level && bar.high >= level;
}

function stopTouched(direction: Direction, bar: Bar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function barsForDateAtOrAfter(bars: Bar[], tradeDate: string, proofTime: string): Bar[] {
  const proof = timeMs(proofTime);
  return [...bars]
    .filter((bar) => normalizeTime(bar.time).slice(0, 10) === tradeDate)
    .filter((bar) => timeMs(bar.time) >= proof)
    .sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function findFirstEntryHit(bars: Bar[], entry: number): Bar | null {
  return bars.find((bar) => levelTraded(bar, entry)) || null;
}

function findFirstStopBeforeEntry(direction: Direction, bars: Bar[], stop: number, entryHitTime: string | null): Bar | null {
  if (!entryHitTime) return null;
  return bars
    .filter((bar) => timeMs(bar.time) < timeMs(entryHitTime))
    .find((bar) => stopTouched(direction, bar, stop)) || null;
}

function classify(row: {
  inclusiveEntryWouldFill: boolean;
  afterProofBarEntryWouldFill: boolean;
  sameProofBarEntryOnly: boolean;
  firstStopTouchBeforeAfterProofBarEntryTime: string | null;
}): DrilldownRow['likelySourceSemantics'] {
  if (row.firstStopTouchBeforeAfterProofBarEntryTime) return 'stop_touched_before_later_entry';
  if (row.sameProofBarEntryOnly) return 'proof_bar_excluded_no_fill_label';
  if (row.afterProofBarEntryWouldFill) return 'entry_touched_after_proof_bar_label_conflict';
  if (!row.inclusiveEntryWouldFill) return 'no_completed_5m_entry_touch';
  return 'ambiguous';
}

function buildRow(row: NoFillTimingRow, bars5m: Bar[]): DrilldownRow {
  const direction: Direction = 'SHORT';
  const bars = barsForDateAtOrAfter(bars5m, row.tradeDate, row.noFillProofTime);
  const proofBar = bars.find((bar) => timeMs(bar.time) === timeMs(row.noFillProofTime)) || null;
  const afterProofBarBars = bars.filter((bar) => timeMs(bar.time) > timeMs(row.noFillProofTime));
  const inclusiveEntry = findFirstEntryHit(bars, row.noFillEntry);
  const afterProofBarEntry = findFirstEntryHit(afterProofBarBars, row.noFillEntry);
  const proofBarTouchesEntry = Boolean(proofBar && levelTraded(proofBar, row.noFillEntry));
  const inclusiveEntryTime = inclusiveEntry ? normalizeTime(inclusiveEntry.time) : null;
  const afterProofBarEntryTime = afterProofBarEntry ? normalizeTime(afterProofBarEntry.time) : null;
  const firstStopBeforeInclusive = findFirstStopBeforeEntry(direction, bars, row.noFillStop, inclusiveEntryTime);
  const firstStopBeforeAfterProofBar = findFirstStopBeforeEntry(direction, bars, row.noFillStop, afterProofBarEntryTime);
  const sameProofBarEntryOnly = proofBarTouchesEntry && !afterProofBarEntryTime;
  const sourceLabelConflict = Boolean(inclusiveEntryTime && !firstStopBeforeInclusive);
  const likelySourceSemantics = classify({
    inclusiveEntryWouldFill: Boolean(inclusiveEntryTime),
    afterProofBarEntryWouldFill: Boolean(afterProofBarEntryTime),
    sameProofBarEntryOnly,
    firstStopTouchBeforeAfterProofBarEntryTime: firstStopBeforeAfterProofBar ? normalizeTime(firstStopBeforeAfterProofBar.time) : null,
  });
  const deskRead = likelySourceSemantics === 'proof_bar_excluded_no_fill_label'
    ? 'Entry touched only on the proof bar. The no-fill label is explainable if the source replay requires the next completed bar before a limit can fill.'
    : likelySourceSemantics === 'entry_touched_after_proof_bar_label_conflict'
      ? 'Entry touched after the proof bar without a prior stop touch. The no-fill label conflicts with completed 5M OHLC and should be reconciled before selector work.'
      : likelySourceSemantics === 'stop_touched_before_later_entry'
        ? 'The stop level traded before a later entry touch. This may explain the no-fill/no-chase state as stale or invalidated before entry.'
        : likelySourceSemantics === 'no_completed_5m_entry_touch'
          ? 'Completed 5M OHLC never touched entry after proof. Treat the no-fill label as consistent.'
          : 'The source semantics remain ambiguous and need source-level replay review.';
  return {
    ticketId: row.noFillTicketId,
    tradeDate: row.tradeDate,
    proofTime: row.noFillProofTime,
    entry: row.noFillEntry,
    stop: row.noFillStop,
    t1: row.noFillT1,
    t2: row.noFillT2,
    riskPoints: row.noFillRiskPoints,
    proofBarTime: proofBar ? normalizeTime(proofBar.time) : null,
    proofBarTouchesEntry,
    firstEntryHitInclusiveTime: inclusiveEntryTime,
    firstEntryHitAfterProofBarTime: afterProofBarEntryTime,
    firstStopTouchBeforeInclusiveEntryTime: firstStopBeforeInclusive ? normalizeTime(firstStopBeforeInclusive.time) : null,
    firstStopTouchBeforeAfterProofBarEntryTime: firstStopBeforeAfterProofBar ? normalizeTime(firstStopBeforeAfterProofBar.time) : null,
    inclusiveEntryWouldFill: Boolean(inclusiveEntryTime),
    afterProofBarEntryWouldFill: Boolean(afterProofBarEntryTime),
    sameProofBarEntryOnly,
    sourceLabelConflict,
    likelySourceSemantics,
    deskRead,
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<OpeningDriveNoFillSourceSemanticsDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep No-Fill Source Semantics Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved no-fill timing rows and saved completed 5M OHLC. It does not run setupScanner, change ranking, post Discord, write Supabase, read live bridge data, or approve execution.',
    '',
    '## Summary',
    `- Drilldown rows: ${report.summary.drilldownRows}.`,
    `- Proof-bar entry touches: ${report.summary.proofBarEntryTouchRows}.`,
    `- After-proof-bar entry touches: ${report.summary.afterProofBarEntryTouchRows}.`,
    `- Same-proof-bar-only entry touches: ${report.summary.sameProofBarEntryOnlyRows}.`,
    `- Source label conflicts: ${report.summary.sourceLabelConflictRows}.`,
    `- Stop before inclusive entry: ${report.summary.stopBeforeInclusiveEntryRows}.`,
    `- Stop before after-proof-bar entry: ${report.summary.stopBeforeAfterProofBarEntryRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Proof | Entry | Stop | Proof Bar Touch | First Entry Inclusive | First Entry After Proof Bar | Stop Before Later Entry | Semantics | Desk Read |',
    '|---|---:|---:|---:|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.proofTime.slice(11, 16)} | ${row.entry} | ${row.stop} | ${row.proofBarTouchesEntry} | ${row.firstEntryHitInclusiveTime ?? '-'} | ${row.firstEntryHitAfterProofBarTime ?? '-'} | ${row.firstStopTouchBeforeAfterProofBarEntryTime ?? '-'} | ${row.likelySourceSemantics} | ${escapeTable(row.deskRead)} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveNoFillSourceSemanticsDrilldownReport(args: {
  noFillTimingReportPath: string | null;
  noFillTimingReport: NoFillTimingReport | null;
  htfSourcePath: string | null;
  htfSource: HtfSourceReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveNoFillSourceSemanticsDrilldownReport {
  const sourceRows = Array.isArray(args.noFillTimingReport?.rows) ? args.noFillTimingReport.rows : [];
  const bars5m = Array.isArray(args.htfSource?.bars?.['5m']) ? args.htfSource.bars['5m'] : [];
  const blockers = [
    !args.noFillTimingReportPath ? 'missing no-fill timing report path' : null,
    !args.noFillTimingReport ? 'missing no-fill timing report' : null,
    sourceRows.length === 0 ? 'no-fill timing report has no rows' : null,
    !args.htfSourcePath ? 'missing HTF source path' : null,
    !args.htfSource ? 'missing HTF source report' : null,
    bars5m.length === 0 ? 'HTF source has no 5M bars' : null,
  ].filter((item): item is string => Boolean(item));
  const rows = blockers.length ? [] : sourceRows.map((row) => buildRow(row, bars5m));
  const sourceLabelConflictRows = rows.filter((row) => row.sourceLabelConflict).length;
  const stopBeforeAfterProofBarEntryRows = rows.filter((row) => row.firstStopTouchBeforeAfterProofBarEntryTime).length;
  const recommendation = blockers.length
    ? 'fix_missing_inputs' as const
    : sourceLabelConflictRows > 0
      ? 'fix_no_fill_outcome_semantics_before_selector_work' as const
      : 'keep_no_fill_rows_out_of_selector_until_more_evidence' as const;
  const base: Omit<OpeningDriveNoFillSourceSemanticsDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_no_fill_source_semantics_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
      livePromotionAllowed: false,
    },
    source: {
      noFillTimingReportPath: args.noFillTimingReportPath,
      htfSourcePath: args.htfSourcePath,
    },
    assumptions: {
      usesCompletedFiveMinuteBarsOnly: true,
      inclusiveFillMeansProofBarCanFillEntry: true,
      afterProofBarFillMeansFirstTradableBarIsStrictlyAfterProof: true,
      missingBarsAreNotInvented: true,
      outputIsResearchOnly: true,
    },
    summary: {
      sourceRows: sourceRows.length,
      drilldownRows: rows.length,
      proofBarEntryTouchRows: rows.filter((row) => row.proofBarTouchesEntry).length,
      afterProofBarEntryTouchRows: rows.filter((row) => row.afterProofBarEntryWouldFill).length,
      sameProofBarEntryOnlyRows: rows.filter((row) => row.sameProofBarEntryOnly).length,
      sourceLabelConflictRows,
      stopBeforeInclusiveEntryRows: rows.filter((row) => row.firstStopTouchBeforeInclusiveEntryTime).length,
      stopBeforeAfterProofBarEntryRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Provide the no-fill timing report and completed 5M OHLC source before reconciling source semantics.']
      : [
        'Do not promote a later-entry selector from these no-fill rows.',
        'Reconcile the source outcome replay contract before using no-fill rows as training evidence.',
        'The next code fix, if any, should be outcome-label semantics only: align no-fill with the completed-5M fill rule or explicitly name proof-bar-excluded rows.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveNoFillSourceSemanticsDrilldownReport(
  report: OpeningDriveNoFillSourceSemanticsDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-no-fill-source-semantics-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveNoFillSourceSemanticsDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const noFillTimingReportPath = readFlag(args, '--no-fill-timing-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-no-fill-timing-audit-\d+\.json$/);
  const noFillTimingReport = readJson<NoFillTimingReport>(noFillTimingReportPath);
  const htfSourcePath = readFlag(args, '--htf-source') ||
    noFillTimingReport?.source?.htfSourcePath ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildOpeningDriveNoFillSourceSemanticsDrilldownReport({
    noFillTimingReportPath,
    noFillTimingReport,
    htfSourcePath,
    htfSource: readJson<HtfSourceReport>(htfSourcePath),
  });
  const paths = writeOpeningDriveNoFillSourceSemanticsDrilldownReport(report, outDir);
  if (args.includes('--json')) {
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
    runOpeningDriveNoFillSourceSemanticsDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
