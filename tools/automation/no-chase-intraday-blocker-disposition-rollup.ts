import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseIntradayFullWindowStopReplayReport } from './no-chase-intraday-full-window-stop-replay';
import type { NoChaseIntradayGeometryBlockerClassifierReport } from './no-chase-intraday-geometry-blocker-classifier';
import type { NoChaseIntradayProtectedMssStopFallbackSimulationReport } from './no-chase-intraday-protected-mss-stop-fallback-simulation';
import type { NoChaseIntradayRemainingBlockerDrilldownReport } from './no-chase-intraday-remaining-blocker-drilldown';

type BlockerFamily =
  | 'pending_fvg_retest_entry'
  | 'pending_close_through_retest_entry'
  | 'mss_timestamp_alignment_stop_blocked'
  | 'retest_swing_stop_not_confirmed'
  | 'invalid_stop_location'
  | 'unclassified';

type Disposition =
  | 'converted_to_human_review'
  | 'rejected_by_wide_risk_simulation'
  | 'keep_pending_trigger_blocked'
  | 'keep_missing_entry_blocked'
  | 'needs_retest_swing_residual_research'
  | 'needs_invalid_stop_location_research'
  | 'unresolved';

interface CliOptions {
  classifierReport: string;
  fullWindowReplayReport: string;
  remainingDrilldownReport: string;
  protectedStopFallbackSimulation: string;
  outDir: string;
  json: boolean;
}

interface DispositionRow {
  caseId: string;
  tradeDate: string;
  sessionType: string;
  direction: string;
  blockerFamily: BlockerFamily;
  disposition: Disposition;
  evidence: string[];
  nextAction: string;
}

export interface NoChaseIntradayBlockerDispositionRollupReport {
  reportType: 'no_chase_intraday_blocker_disposition_rollup';
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
  };
  source: {
    classifierReportPath: string;
    fullWindowReplayReportPath: string;
    remainingDrilldownReportPath: string;
    protectedStopFallbackSimulationPath: string;
  };
  summary: {
    rowsChecked: number;
    convertedToHumanReviewRows: number;
    rejectedByWideRiskRows: number;
    keepPendingTriggerBlockedRows: number;
    keepMissingEntryBlockedRows: number;
    needsRetestSwingResidualResearchRows: number;
    needsInvalidStopLocationResearchRows: number;
    unresolvedRows: number;
    canExecuteTrueRows: number;
    livePromotionAllowedRows: number;
    nextRecommendedFamily: 'retest_swing_stop_not_confirmed' | 'invalid_stop_location' | 'none';
  };
  rows: DispositionRow[];
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const classifierReport = readFlag(args, '--classifier-report');
  const fullWindowReplayReport = readFlag(args, '--full-window-replay-report');
  const remainingDrilldownReport = readFlag(args, '--remaining-drilldown-report');
  const protectedStopFallbackSimulation = readFlag(args, '--protected-stop-fallback-simulation');
  if (!classifierReport) throw new Error('--classifier-report is required.');
  if (!fullWindowReplayReport) throw new Error('--full-window-replay-report is required.');
  if (!remainingDrilldownReport) throw new Error('--remaining-drilldown-report is required.');
  if (!protectedStopFallbackSimulation) throw new Error('--protected-stop-fallback-simulation is required.');
  return {
    classifierReport,
    fullWindowReplayReport,
    remainingDrilldownReport,
    protectedStopFallbackSimulation,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asFamily(value: unknown): BlockerFamily {
  return value === 'pending_fvg_retest_entry' ||
    value === 'pending_close_through_retest_entry' ||
    value === 'mss_timestamp_alignment_stop_blocked' ||
    value === 'retest_swing_stop_not_confirmed' ||
    value === 'invalid_stop_location'
    ? value
    : 'unclassified';
}

function dispositionFor(args: {
  row: NoChaseIntradayGeometryBlockerClassifierReport['rows'][number];
  replayByCase: Map<string, NoChaseIntradayFullWindowStopReplayReport['rows'][number]>;
  drilldownByCase: Map<string, NoChaseIntradayRemainingBlockerDrilldownReport['rows'][number]>;
  fallbackByCase: Map<string, NoChaseIntradayProtectedMssStopFallbackSimulationReport['rows'][number]>;
}): DispositionRow {
  const family = asFamily(args.row.blockerFamily);
  const replay = args.replayByCase.get(args.row.caseId);
  const drilldown = args.drilldownByCase.get(args.row.caseId);
  const fallback = args.fallbackByCase.get(args.row.caseId);
  const evidence: string[] = [];
  let disposition: Disposition = 'unresolved';
  let nextAction = 'Needs follow-up research.';

  if (replay?.firstHumanReviewTime) {
    disposition = 'converted_to_human_review';
    evidence.push(`Full-window replay produced human-review ticket at ${replay.firstHumanReviewTime}.`);
    evidence.push(`Outcome=${replay.replayOutcome}; oneMesGross=${replay.oneMesGross}.`);
    nextAction = 'Keep installed fallback guarded; no further work for this row.';
  } else if (replay && replay.validationEntry === null) {
    disposition = 'keep_missing_entry_blocked';
    evidence.push('Full-window replay kept row blocked because entry is still missing.');
    nextAction = 'Keep blocked; stop recovery alone must not create an entry.';
  } else if (fallback?.recommendation === 'do_not_install_wide_risk') {
    disposition = 'rejected_by_wide_risk_simulation';
    evidence.push(`Fallback simulation rejected row: risk=${fallback.riskPoints}, maxRisk=${fallback.maxRiskPoints}, outcome=${fallback.outcome}.`);
    nextAction = 'Keep blocked; do not install recovered protected MSS stop as a live fallback.';
  } else if (family === 'pending_fvg_retest_entry' || family === 'pending_close_through_retest_entry') {
    disposition = 'keep_pending_trigger_blocked';
    evidence.push('Classifier says trigger/retest is still pending.');
    nextAction = 'Hold unless a separate no-lookahead trigger proof study is requested.';
  } else if (family === 'invalid_stop_location') {
    disposition = 'needs_invalid_stop_location_research';
    evidence.push('Classifier found invalid stop location and this family has not been researched yet.');
    nextAction = 'Run narrow invalid-stop-location drilldown.';
  } else if (family === 'retest_swing_stop_not_confirmed') {
    disposition = 'needs_retest_swing_residual_research';
    evidence.push('Classifier found retest swing stop blocker and this row was not covered by the latest residual drilldown/fallback simulation.');
    nextAction = 'Run residual retest-swing-stop drilldown before invalid-stop rows.';
  } else if (drilldown?.blockerFamily === 'retest_swing_stop_not_confirmed') {
    disposition = 'rejected_by_wide_risk_simulation';
    evidence.push('Retest swing stop blocker was drilled down; fallback simulation did not produce a live-safe fix.');
    nextAction = 'Keep blocked.';
  }

  return {
    caseId: args.row.caseId,
    tradeDate: args.row.tradeDate,
    sessionType: args.row.sessionType,
    direction: args.row.direction,
    blockerFamily: family,
    disposition,
    evidence,
    nextAction,
  };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
}

function buildMarkdown(report: Omit<NoChaseIntradayBlockerDispositionRollupReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Blocker Disposition Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved-report rollup only. No scanner, Discord, Supabase, live bridge, canExecute, or trading-rule changes.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Converted to human-review: ${report.summary.convertedToHumanReviewRows}.`,
    `- Rejected by wide-risk simulation: ${report.summary.rejectedByWideRiskRows}.`,
    `- Keep pending-trigger blocked: ${report.summary.keepPendingTriggerBlockedRows}.`,
    `- Keep missing-entry blocked: ${report.summary.keepMissingEntryBlockedRows}.`,
    `- Needs residual retest-swing research: ${report.summary.needsRetestSwingResidualResearchRows}.`,
    `- Needs invalid-stop-location research: ${report.summary.needsInvalidStopLocationResearchRows}.`,
    `- Unresolved: ${report.summary.unresolvedRows}.`,
    `- Next recommended family: ${report.summary.nextRecommendedFamily}.`,
    '',
    '## Rows',
    '| Case | Family | Disposition | Next Action |',
    '|---|---|---|---|',
    ...report.rows.map((row) => `| ${markdownCell(row.caseId)} | ${row.blockerFamily} | ${row.disposition} | ${markdownCell(row.nextAction)} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayBlockerDispositionRollupReport(args: {
  classifierReportPath: string;
  fullWindowReplayReportPath: string;
  remainingDrilldownReportPath: string;
  protectedStopFallbackSimulationPath: string;
  classifierReport: NoChaseIntradayGeometryBlockerClassifierReport;
  fullWindowReplayReport: NoChaseIntradayFullWindowStopReplayReport;
  remainingDrilldownReport: NoChaseIntradayRemainingBlockerDrilldownReport;
  protectedStopFallbackSimulation: NoChaseIntradayProtectedMssStopFallbackSimulationReport;
}, generatedAt = new Date().toISOString()): NoChaseIntradayBlockerDispositionRollupReport {
  const replayByCase = new Map(args.fullWindowReplayReport.rows.map((row) => [row.caseId, row]));
  const drilldownByCase = new Map(args.remainingDrilldownReport.rows.map((row) => [row.caseId, row]));
  const fallbackByCase = new Map(args.protectedStopFallbackSimulation.rows.map((row) => [row.caseId, row]));
  const rows = args.classifierReport.rows.map((row) => dispositionFor({ row, replayByCase, drilldownByCase, fallbackByCase }));
  const blockers = [
    rows.some((row) => row.disposition === 'unresolved') ? 'one or more classifier rows remain unresolved by the rollup' : null,
  ].filter((item): item is string => Boolean(item));
  const residualRetestRows = rows.filter((row) => row.disposition === 'needs_retest_swing_residual_research').length;
  const invalidStopRows = rows.filter((row) => row.disposition === 'needs_invalid_stop_location_research').length;
  const base: Omit<NoChaseIntradayBlockerDispositionRollupReport, 'markdown'> = {
    reportType: 'no_chase_intraday_blocker_disposition_rollup',
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
    },
    source: {
      classifierReportPath: args.classifierReportPath,
      fullWindowReplayReportPath: args.fullWindowReplayReportPath,
      remainingDrilldownReportPath: args.remainingDrilldownReportPath,
      protectedStopFallbackSimulationPath: args.protectedStopFallbackSimulationPath,
    },
    summary: {
      rowsChecked: rows.length,
      convertedToHumanReviewRows: rows.filter((row) => row.disposition === 'converted_to_human_review').length,
      rejectedByWideRiskRows: rows.filter((row) => row.disposition === 'rejected_by_wide_risk_simulation').length,
      keepPendingTriggerBlockedRows: rows.filter((row) => row.disposition === 'keep_pending_trigger_blocked').length,
      keepMissingEntryBlockedRows: rows.filter((row) => row.disposition === 'keep_missing_entry_blocked').length,
      needsRetestSwingResidualResearchRows: residualRetestRows,
      needsInvalidStopLocationResearchRows: invalidStopRows,
      unresolvedRows: rows.filter((row) => row.disposition === 'unresolved').length,
      canExecuteTrueRows: rows.filter((row) => args.classifierReport.rows.find((source) => source.caseId === row.caseId)?.canExecute).length,
      livePromotionAllowedRows: rows.filter((row) => args.classifierReport.rows.find((source) => source.caseId === row.caseId)?.livePromotionAllowed).length,
      nextRecommendedFamily: residualRetestRows > 0 ? 'retest_swing_stop_not_confirmed' : invalidStopRows > 0 ? 'invalid_stop_location' : 'none',
    },
    rows,
    blockers,
    recommendations: residualRetestRows > 0
      ? [
        'Next narrow phase should inspect residual retest-swing-stop rows not covered by the last drilldown.',
        'Do not revisit the rejected protected MSS stop fallback unless new entry proof appears.',
        'Keep pending-trigger rows blocked; no completed 5M entry proof means no ticket.',
      ]
      : invalidStopRows > 0
        ? [
          'Next narrow phase should inspect invalid-stop-location rows only.',
          'Do not revisit the rejected protected MSS stop fallback unless new entry proof appears.',
          'Keep pending-trigger rows blocked; no completed 5M entry proof means no ticket.',
        ]
      : ['No remaining classifier family is ready for a source-builder fix from the current evidence.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayBlockerDispositionRollupReport(
  report: NoChaseIntradayBlockerDispositionRollupReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-blocker-disposition-rollup-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayBlockerDispositionRollupCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayBlockerDispositionRollupReport({
    classifierReportPath: options.classifierReport,
    fullWindowReplayReportPath: options.fullWindowReplayReport,
    remainingDrilldownReportPath: options.remainingDrilldownReport,
    protectedStopFallbackSimulationPath: options.protectedStopFallbackSimulation,
    classifierReport: readJson<NoChaseIntradayGeometryBlockerClassifierReport>(options.classifierReport),
    fullWindowReplayReport: readJson<NoChaseIntradayFullWindowStopReplayReport>(options.fullWindowReplayReport),
    remainingDrilldownReport: readJson<NoChaseIntradayRemainingBlockerDrilldownReport>(options.remainingDrilldownReport),
    protectedStopFallbackSimulation: readJson<NoChaseIntradayProtectedMssStopFallbackSimulationReport>(options.protectedStopFallbackSimulation),
  });
  const paths = writeNoChaseIntradayBlockerDispositionRollupReport(report, options.outDir);
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
    runNoChaseIntradayBlockerDispositionRollupCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
