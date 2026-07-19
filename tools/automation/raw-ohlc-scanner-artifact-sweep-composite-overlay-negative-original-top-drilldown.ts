import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-coverage-drilldown';
import type { RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-source-context-drilldown';

interface CliOptions {
  negativeSimulationReport: string;
  coverageReport: string;
  sourceContextReport: string;
  outDir: string;
  json: boolean;
}

interface DrilldownRow {
  slateId: string;
  tradeDate: string;
  session: string;
  originalTopTicketId: string;
  originalTopSetupType: string | null;
  replacementTopTicketId: string | null;
  replacementTopSetupType: string | null;
  originalOverlayScore: number | null;
  originalNegativePenalty: number | null;
  originalNegativeOverlayScore: number | null;
  originalCoverageStatus: 'ready_for_replay_package' | 'blocked' | 'missing';
  originalCoverageBlockers: string[];
  originalSourceTags: string[];
  originalOutcomeLabel: string | null;
  originalFavorableR: number | null;
  originalAdverseR: number | null;
  evidenceClass:
    | 'no_chase_or_stale_original'
    | 'target_room_or_entry_pending_original'
    | 'incomplete_levels_original'
    | 'ready_but_unresolved_original'
    | 'missing_original_evidence';
}

interface TagSummary {
  tag: string;
  rows: number;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_original_top_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport['authority'];
  source: {
    reportDir: string;
    negativeSimulationReportPath: string;
    coverageReportPath: string;
    sourceContextReportPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    originalTopEvidenceOnly: true;
    outcomeIsNotRecomputed: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlates: number;
    originalTopRefs: number;
    originalCoverageReadyRows: number;
    originalCoverageBlockedRows: number;
    originalCoverageMissingRows: number;
    originalSourceTaggedRows: number;
    noChaseRows: number;
    lateDayRows: number;
    targetRoomBlockedRows: number;
    entryTriggerPendingRows: number;
    incompleteLevelRows: number;
    readyButUnresolvedRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_research_only' | 'fix_inputs' | 'use_as_negative_evidence_research_only';
  };
  tagSummaries: TagSummary[];
  rows: DrilldownRow[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const negativeSimulationReport = readFlag(args, '--negative-simulation-report');
  const coverageReport = readFlag(args, '--coverage-report');
  const sourceContextReport = readFlag(args, '--source-context-report');
  if (!negativeSimulationReport) throw new Error('--negative-simulation-report is required.');
  if (!coverageReport) throw new Error('--coverage-report is required.');
  if (!sourceContextReport) throw new Error('--source-context-report is required.');
  return {
    negativeSimulationReport,
    coverageReport,
    sourceContextReport,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport['authority'] {
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

function evidenceClass(row: Omit<DrilldownRow, 'evidenceClass'>): DrilldownRow['evidenceClass'] {
  if (row.originalSourceTags.includes('no_chase') || row.originalSourceTags.includes('late_day_after_1500')) {
    return 'no_chase_or_stale_original';
  }
  if (row.originalSourceTags.includes('target_room_blocked_before_t1') || row.originalSourceTags.includes('entry_trigger_pending')) {
    return 'target_room_or_entry_pending_original';
  }
  if (row.originalCoverageBlockers.some((blocker) => /^missing (entry|stop|T1|T2)$/.test(blocker))) {
    return 'incomplete_levels_original';
  }
  if (row.originalCoverageStatus === 'ready_for_replay_package') return 'ready_but_unresolved_original';
  return 'missing_original_evidence';
}

function buildRows(args: {
  negativeSimulationReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport | null;
  coverageReport: RawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownReport | null;
  sourceContextReport: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport | null;
}): DrilldownRow[] {
  const simRowsByTicket = new Map((args.negativeSimulationReport?.rows || []).map((row) => [row.ticketId, row]));
  const coverageByTicket = new Map((args.coverageReport?.rows || []).map((row) => [row.ticketId, row]));
  const sourceByTicket = new Map((args.sourceContextReport?.rows || []).map((row) => [row.ticketId, row]));
  return (args.negativeSimulationReport?.slates || [])
    .filter((slate) => slate.topChanged && Boolean(slate.overlayTopTicketId))
    .map((slate) => {
      const originalTicket = slate.overlayTopTicketId as string;
      const simRow = simRowsByTicket.get(originalTicket);
      const coverageRow = coverageByTicket.get(originalTicket);
      const sourceRow = sourceByTicket.get(originalTicket);
      const base: Omit<DrilldownRow, 'evidenceClass'> = {
        slateId: slate.slateId,
        tradeDate: slate.tradeDate,
        session: slate.session,
        originalTopTicketId: originalTicket,
        originalTopSetupType: slate.overlayTopSetupType,
        replacementTopTicketId: slate.negativeTopTicketId,
        replacementTopSetupType: slate.negativeTopSetupType,
        originalOverlayScore: simRow?.overlayScore ?? null,
        originalNegativePenalty: simRow?.negativePenalty ?? null,
        originalNegativeOverlayScore: simRow?.negativeOverlayScore ?? null,
        originalCoverageStatus: coverageRow?.coverageStatus || 'missing',
        originalCoverageBlockers: coverageRow?.blockers || ['missing original coverage row'],
        originalSourceTags: sourceRow?.sourceTags || simRow?.sourceTags || [],
        originalOutcomeLabel: sourceRow?.outcomeLabel || null,
        originalFavorableR: sourceRow?.favorableR ?? null,
        originalAdverseR: sourceRow?.adverseR ?? null,
      };
      return { ...base, evidenceClass: evidenceClass(base) };
    })
    .sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function tagSummaries(rows: DrilldownRow[]): TagSummary[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.originalSourceTags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].map(([tag, tagRows]) => ({ tag, rows: tagRows })).sort((a, b) => b.rows - a.rows || a.tag.localeCompare(b.tag));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Negative Overlay Original-Top Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only original-top evidence drilldown over saved reports. It does not recompute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Original coverage ready/blocked/missing: ${report.summary.originalCoverageReadyRows} / ${report.summary.originalCoverageBlockedRows} / ${report.summary.originalCoverageMissingRows}.`,
    `- Source-tagged original rows: ${report.summary.originalSourceTaggedRows}.`,
    `- No-chase rows: ${report.summary.noChaseRows}.`,
    `- Late-day rows: ${report.summary.lateDayRows}.`,
    `- Target-room blocked rows: ${report.summary.targetRoomBlockedRows}.`,
    `- Entry-trigger-pending rows: ${report.summary.entryTriggerPendingRows}.`,
    `- Incomplete-level rows: ${report.summary.incompleteLevelRows}.`,
    `- Ready-but-unresolved rows: ${report.summary.readyButUnresolvedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Tags',
    ...report.tagSummaries.map((row) => `- ${row.tag}: ${row.rows}`),
    '',
    '## Rows',
    '| Slate | Original Top | Model | Coverage | Tags | Outcome | Fav R | Adv R | Evidence Class | Replacement |',
    '|---|---|---|---|---|---|---:|---:|---|---|',
    ...report.rows.slice(0, 80).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.originalTopTicketId)} | ${escapeTable(row.originalTopSetupType ?? '-')} | ${row.originalCoverageStatus} | ${escapeTable(row.originalSourceTags.join(', ') || '-')} | ${row.originalOutcomeLabel ?? '-'} | ${row.originalFavorableR ?? '-'} | ${row.originalAdverseR ?? '-'} | ${row.evidenceClass} | ${escapeTable(row.replacementTopTicketId ?? '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport(args: {
  reportDir: string;
  negativeSimulationReportPath: string;
  coverageReportPath: string;
  sourceContextReportPath: string;
  negativeSimulationReport: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport | null;
  coverageReport: RawOhlcScannerArtifactSweepCompositeOverlayCoverageDrilldownReport | null;
  sourceContextReport: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport {
  const rows = buildRows(args);
  const blockers = [
    !args.negativeSimulationReport ? 'missing negative simulation report' : null,
    !args.coverageReport ? 'missing coverage report' : null,
    !args.sourceContextReport ? 'missing source-context report' : null,
    args.negativeSimulationReport && args.negativeSimulationReport.status !== 'pass' ? `negative simulation report status ${args.negativeSimulationReport.status}` : null,
    args.coverageReport && args.coverageReport.status !== 'pass' ? `coverage report status ${args.coverageReport.status}` : null,
    args.sourceContextReport && args.sourceContextReport.status !== 'pass' ? `source-context report status ${args.sourceContextReport.status}` : null,
    rows.length === 0 ? 'no changed original top rows available' : null,
  ].filter((item): item is string => Boolean(item));
  const readyButUnresolvedRows = rows.filter((row) => row.evidenceClass === 'ready_but_unresolved_original').length;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_original_top_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      negativeSimulationReportPath: args.negativeSimulationReportPath,
      coverageReportPath: args.coverageReportPath,
      sourceContextReportPath: args.sourceContextReportPath,
    },
    assumptions: {
      savedReportsOnly: true,
      originalTopEvidenceOnly: true,
      outcomeIsNotRecomputed: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlates: rows.length,
      originalTopRefs: rows.length,
      originalCoverageReadyRows: rows.filter((row) => row.originalCoverageStatus === 'ready_for_replay_package').length,
      originalCoverageBlockedRows: rows.filter((row) => row.originalCoverageStatus === 'blocked').length,
      originalCoverageMissingRows: rows.filter((row) => row.originalCoverageStatus === 'missing').length,
      originalSourceTaggedRows: rows.filter((row) => row.originalSourceTags.length > 0).length,
      noChaseRows: rows.filter((row) => row.originalSourceTags.includes('no_chase')).length,
      lateDayRows: rows.filter((row) => row.originalSourceTags.includes('late_day_after_1500')).length,
      targetRoomBlockedRows: rows.filter((row) => row.originalSourceTags.includes('target_room_blocked_before_t1')).length,
      entryTriggerPendingRows: rows.filter((row) => row.originalSourceTags.includes('entry_trigger_pending')).length,
      incompleteLevelRows: rows.filter((row) => row.evidenceClass === 'incomplete_levels_original').length,
      readyButUnresolvedRows,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : rows.some((row) => row.evidenceClass === 'no_chase_or_stale_original' || row.evidenceClass === 'target_room_or_entry_pending_original')
          ? 'use_as_negative_evidence_research_only'
          : 'keep_research_only',
    },
    tagSummaries: tagSummaries(rows),
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this drilldown.']
      : [
        'Use this as research-only evidence explaining why the original top was displaced; do not install scanner-visible ranking from this report alone.',
        'Original tops with no-chase, late-day, target-room, or entry-pending evidence can support a later negative/review-note proposal only after a separate approval checkpoint.',
        'Preserve canExecute, entry/stop/target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-original-top-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport({
    reportDir: options.outDir,
    negativeSimulationReportPath: options.negativeSimulationReport,
    coverageReportPath: options.coverageReport,
    sourceContextReportPath: options.sourceContextReport,
    negativeSimulationReport: fs.existsSync(options.negativeSimulationReport) ? readJson(options.negativeSimulationReport) : null,
    coverageReport: fs.existsSync(options.coverageReport) ? readJson(options.coverageReport) : null,
    sourceContextReport: fs.existsSync(options.sourceContextReport) ? readJson(options.sourceContextReport) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayNegativeOriginalTopDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
