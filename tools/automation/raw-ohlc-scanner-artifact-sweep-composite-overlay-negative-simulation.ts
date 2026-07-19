import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-dry-run';
import type { RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-source-context-drilldown';

interface CliOptions {
  overlayReport: string;
  sourceContextReport: string;
  noChasePenalty: number;
  lateDayPenalty: number;
  targetRoomPenalty: number;
  entryTriggerPendingPenalty: number;
  outDir: string;
  json: boolean;
}

interface SimRow {
  slateId: string;
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  baselineScore: number;
  overlayScore: number;
  negativePenalty: number;
  negativeOverlayScore: number;
  baselineRank: number;
  overlayRank: number;
  negativeOverlayRank: number;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  sourceTags: string[];
  penalized: boolean;
}

interface SimSlate {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  overlayTopTicketId: string | null;
  overlayTopSetupType: string | null;
  overlayTopOneMesPl: number | null;
  negativeTopTicketId: string | null;
  negativeTopSetupType: string | null;
  negativeTopOneMesPl: number | null;
  topChanged: boolean;
  changedFromKnownWinner: boolean;
  changedAwayFromPenalizedMissingOutcome: boolean;
  deltaOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport['authority'];
  source: {
    reportDir: string;
    overlayReportPath: string;
    sourceContextReportPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    negativeOverlaySimulationOnly: true;
    outcomeUsedForEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  scoring: {
    noChasePenalty: number;
    lateDayPenalty: number;
    targetRoomBlockedBeforeT1Penalty: number;
    entryTriggerPendingPenalty: number;
  };
  summary: {
    sourceRows: number;
    slates: number;
    penalizedRows: number;
    changedSlates: number;
    changedFromKnownWinnerSlates: number;
    changedAwayFromPenalizedMissingOutcomeSlates: number;
    overlayTopOneMesPl: number | null;
    negativeTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    missingOutcomeTopRowsBefore: number;
    missingOutcomeTopRowsAfter: number;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_research_only' | 'reject_negative_overlay_for_now' | 'prepare_research_live_proposal_with_promotion_disabled' | 'fix_inputs';
  };
  rows: SimRow[];
  slates: SimSlate[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const overlayReport = readFlag(args, '--overlay-report');
  const sourceContextReport = readFlag(args, '--source-context-report');
  if (!overlayReport) throw new Error('--overlay-report is required.');
  if (!sourceContextReport) throw new Error('--source-context-report is required.');
  return {
    overlayReport,
    sourceContextReport,
    noChasePenalty: numericFlag(args, '--no-chase-penalty', 35),
    lateDayPenalty: numericFlag(args, '--late-day-penalty', 15),
    targetRoomPenalty: numericFlag(args, '--target-room-penalty', 30),
    entryTriggerPendingPenalty: numericFlag(args, '--entry-trigger-pending-penalty', 20),
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function numericFlag(args: string[], flag: string, fallback: number): number {
  const parsed = Number(readFlag(args, flag) || fallback);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
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

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport['authority'] {
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

function sourceTagMap(sourceContextReport: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport | null): Map<string, string[]> {
  return new Map((sourceContextReport?.rows || []).map((row) => [row.ticketId, row.sourceTags || []]));
}

function penalty(tags: string[], scoring: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport['scoring']): number {
  return [
    tags.includes('no_chase') ? scoring.noChasePenalty : 0,
    tags.includes('late_day_after_1500') ? scoring.lateDayPenalty : 0,
    tags.includes('target_room_blocked_before_t1') ? scoring.targetRoomBlockedBeforeT1Penalty : 0,
    tags.includes('entry_trigger_pending') ? scoring.entryTriggerPendingPenalty : 0,
  ].reduce((total, value) => total + value, 0);
}

function compareRows(a: SimRow, b: SimRow, scoreKey: 'overlayScore' | 'negativeOverlayScore'): number {
  return b[scoreKey] - a[scoreKey] ||
    Number(b.resolvedOneMesPl !== null) - Number(a.resolvedOneMesPl !== null) ||
    a.ticketId.localeCompare(b.ticketId);
}

function buildRows(args: {
  overlayReport: RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport | null;
  sourceContextReport: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport | null;
  scoring: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport['scoring'];
}): SimRow[] {
  const tagsByTicket = sourceTagMap(args.sourceContextReport);
  return (args.overlayReport?.rows || []).map((row) => {
    const sourceTags = tagsByTicket.get(row.ticketId) || [];
    const negativePenalty = penalty(sourceTags, args.scoring);
    return {
      slateId: row.slateId,
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      baselineScore: row.baselineScore,
      overlayScore: row.overlayScore,
      negativePenalty,
      negativeOverlayScore: round(row.overlayScore - negativePenalty),
      baselineRank: row.baselineRank,
      overlayRank: row.overlayRank,
      negativeOverlayRank: 0,
      outcomeLabel: row.outcomeLabel,
      resolvedOneMesPl: row.resolvedOneMesPl,
      sourceTags,
      penalized: negativePenalty > 0,
    };
  });
}

function buildSlates(rows: SimRow[]): { rows: SimRow[]; slates: SimSlate[] } {
  const groups = new Map<string, SimRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.slateId);
    if (existing) existing.push(row);
    else groups.set(row.slateId, [row]);
  }
  const rankedRows: SimRow[] = [];
  const slates: SimSlate[] = [];
  for (const [slateId, slateRows] of groups) {
    const overlay = [...slateRows].sort((a, b) => compareRows(a, b, 'overlayScore'));
    const negative = [...slateRows].sort((a, b) => compareRows(a, b, 'negativeOverlayScore'));
    negative.forEach((row, index) => { row.negativeOverlayRank = index + 1; });
    rankedRows.push(...slateRows);
    const overlayTop = overlay[0] || null;
    const negativeTop = negative[0] || null;
    const topChanged = overlayTop?.ticketId !== negativeTop?.ticketId;
    const delta = overlayTop && negativeTop && overlayTop.resolvedOneMesPl !== null && negativeTop.resolvedOneMesPl !== null
      ? round(negativeTop.resolvedOneMesPl - overlayTop.resolvedOneMesPl)
      : null;
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      overlayTopTicketId: overlayTop?.ticketId || null,
      overlayTopSetupType: overlayTop?.setupType || null,
      overlayTopOneMesPl: overlayTop?.resolvedOneMesPl ?? null,
      negativeTopTicketId: negativeTop?.ticketId || null,
      negativeTopSetupType: negativeTop?.setupType || null,
      negativeTopOneMesPl: negativeTop?.resolvedOneMesPl ?? null,
      topChanged,
      changedFromKnownWinner: topChanged && (overlayTop?.outcomeLabel === 't1_and_t2_hit' || overlayTop?.outcomeLabel === 't1_hit_only'),
      changedAwayFromPenalizedMissingOutcome: topChanged && Boolean(overlayTop?.penalized) && overlayTop?.resolvedOneMesPl === null,
      deltaOneMesPl: delta,
    });
  }
  return {
    rows: rankedRows.sort((a, b) => a.slateId.localeCompare(b.slateId) || a.negativeOverlayRank - b.negativeOverlayRank),
    slates: slates.sort((a, b) => a.slateId.localeCompare(b.slateId)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Sweep Composite Overlay Negative Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only negative overlay simulation over saved reports. It does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Penalized rows: ${report.summary.penalizedRows}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Changed from known winner slates: ${report.summary.changedFromKnownWinnerSlates}.`,
    `- Changed away from penalized missing-outcome slates: ${report.summary.changedAwayFromPenalizedMissingOutcomeSlates}.`,
    `- Overlay/negative top P/L: ${report.summary.overlayTopOneMesPl ?? '-'} / ${report.summary.negativeTopOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Missing outcome top rows before/after: ${report.summary.missingOutcomeTopRowsBefore} / ${report.summary.missingOutcomeTopRowsAfter}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Overlay Top | Overlay Model | Overlay P/L | Negative Top | Negative Model | Negative P/L | Delta |',
    '|---|---|---|---:|---|---|---:|---:|',
    ...report.slates.filter((row) => row.topChanged).slice(0, 50).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.overlayTopTicketId ?? '-')} | ${escapeTable(row.overlayTopSetupType ?? '-')} | ${row.overlayTopOneMesPl ?? '-'} | ${escapeTable(row.negativeTopTicketId ?? '-')} | ${escapeTable(row.negativeTopSetupType ?? '-')} | ${row.negativeTopOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport(args: {
  reportDir: string;
  overlayReportPath: string;
  sourceContextReportPath: string;
  overlayReport: RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport | null;
  sourceContextReport: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport | null;
  scoring: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport['scoring'];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport {
  const rows = buildRows({
    overlayReport: args.overlayReport,
    sourceContextReport: args.sourceContextReport,
    scoring: args.scoring,
  });
  const overlay = buildSlates(rows);
  const changedSlates = overlay.slates.filter((slate) => slate.topChanged);
  const changedFromKnownWinner = changedSlates.filter((slate) => slate.changedFromKnownWinner).length;
  const changedAwayFromMissing = changedSlates.filter((slate) => slate.changedAwayFromPenalizedMissingOutcome).length;
  const delta = sum(overlay.slates.map((slate) => slate.deltaOneMesPl));
  const blockers = [
    !args.overlayReport ? 'missing overlay report' : null,
    !args.sourceContextReport ? 'missing source-context report' : null,
    args.overlayReport && args.overlayReport.status !== 'pass' ? `overlay report status ${args.overlayReport.status}` : null,
    args.sourceContextReport && args.sourceContextReport.status !== 'pass' ? `source-context report status ${args.sourceContextReport.status}` : null,
    rows.length === 0 ? 'no overlay rows available for simulation' : null,
  ].filter((item): item is string => Boolean(item));
  const missingAfter = overlay.slates.filter((slate) => slate.negativeTopOneMesPl === null).length;
  const recommendation: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : changedFromKnownWinner > 0
      ? 'reject_negative_overlay_for_now'
      : changedAwayFromMissing > 0 && (delta ?? 0) >= 0 && missingAfter === 0
        ? 'prepare_research_live_proposal_with_promotion_disabled'
        : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      overlayReportPath: args.overlayReportPath,
      sourceContextReportPath: args.sourceContextReportPath,
    },
    assumptions: {
      savedReportsOnly: true,
      negativeOverlaySimulationOnly: true,
      outcomeUsedForEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    scoring: args.scoring,
    summary: {
      sourceRows: rows.length,
      slates: overlay.slates.length,
      penalizedRows: rows.filter((row) => row.penalized).length,
      changedSlates: changedSlates.length,
      changedFromKnownWinnerSlates: changedFromKnownWinner,
      changedAwayFromPenalizedMissingOutcomeSlates: changedAwayFromMissing,
      overlayTopOneMesPl: sum(overlay.slates.map((slate) => slate.overlayTopOneMesPl)),
      negativeTopOneMesPl: sum(overlay.slates.map((slate) => slate.negativeTopOneMesPl)),
      topSelectionDeltaOneMesPl: delta,
      missingOutcomeTopRowsBefore: overlay.slates.filter((slate) => slate.overlayTopOneMesPl === null).length,
      missingOutcomeTopRowsAfter: missingAfter,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows: overlay.rows,
    slates: overlay.slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved overlay/source-context inputs before using negative overlay findings.']
      : [
        'Treat this as ranking research only; do not install live rank behavior from this report alone.',
        'If a live proposal is prepared, keep promotion disabled and require a separate approval checkpoint.',
        'Preserve canExecute, entry/stop/target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport({
    reportDir: options.outDir,
    overlayReportPath: options.overlayReport,
    sourceContextReportPath: options.sourceContextReport,
    overlayReport: fs.existsSync(options.overlayReport) ? readJson<RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport>(options.overlayReport) : null,
    sourceContextReport: fs.existsSync(options.sourceContextReport) ? readJson<RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport>(options.sourceContextReport) : null,
    scoring: {
      noChasePenalty: options.noChasePenalty,
      lateDayPenalty: options.lateDayPenalty,
      targetRoomBlockedBeforeT1Penalty: options.targetRoomPenalty,
      entryTriggerPendingPenalty: options.entryTriggerPendingPenalty,
    },
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayNegativeSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
