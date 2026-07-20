import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseIntradayBlockerDispositionRollupReport } from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseIntradayInvalidStopLocationDrilldownReport } from './no-chase-intraday-invalid-stop-location-drilldown';
import type { NoChaseIntradayResidualRetestSwingDrilldownReport } from './no-chase-intraday-residual-retest-swing-drilldown';

type ClosureDisposition =
  | 'human_review_positive'
  | 'rejected_wide_risk'
  | 'keep_pending_trigger_blocked'
  | 'keep_missing_entry_blocked'
  | 'keep_retest_swing_blocked'
  | 'keep_invalid_stop_blocked'
  | 'unresolved';

interface CliOptions {
  dispositionRollup: string;
  residualRetestSwingDrilldown: string;
  invalidStopLocationDrilldown: string;
  outDir: string;
  json: boolean;
}

interface ClosureRow {
  caseId: string;
  tradeDate: string;
  sessionType: string;
  direction: string;
  sourceDisposition: string;
  closureDisposition: ClosureDisposition;
  evidence: string[];
  nextAction: string;
}

export interface NoChaseIntradayBlockerClosureRollupReport {
  reportType: 'no_chase_intraday_blocker_closure_rollup';
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
    dispositionRollupPath: string;
    residualRetestSwingDrilldownPath: string;
    invalidStopLocationDrilldownPath: string;
  };
  summary: {
    rowsChecked: number;
    humanReviewPositiveRows: number;
    rejectedWideRiskRows: number;
    keepPendingTriggerBlockedRows: number;
    keepMissingEntryBlockedRows: number;
    keepRetestSwingBlockedRows: number;
    keepInvalidStopBlockedRows: number;
    unresolvedRows: number;
    openResearchRows: number;
    canExecuteTrueRows: 0;
    livePromotionAllowedRows: 0;
    liveFixRecommended: false;
    nextRecommendedPhase: 'broader_candidate_intake' | 'fix_inputs';
  };
  rows: ClosureRow[];
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
  const dispositionRollup = readFlag(args, '--disposition-rollup');
  const residualRetestSwingDrilldown = readFlag(args, '--residual-retest-swing-drilldown');
  const invalidStopLocationDrilldown = readFlag(args, '--invalid-stop-location-drilldown');
  if (!dispositionRollup) throw new Error('--disposition-rollup is required.');
  if (!residualRetestSwingDrilldown) throw new Error('--residual-retest-swing-drilldown is required.');
  if (!invalidStopLocationDrilldown) throw new Error('--invalid-stop-location-drilldown is required.');
  return {
    dispositionRollup,
    residualRetestSwingDrilldown,
    invalidStopLocationDrilldown,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function closureFor(args: {
  row: NoChaseIntradayBlockerDispositionRollupReport['rows'][number];
  residualByCase: Map<string, NoChaseIntradayResidualRetestSwingDrilldownReport['rows'][number]>;
  invalidByCase: Map<string, NoChaseIntradayInvalidStopLocationDrilldownReport['rows'][number]>;
}): ClosureRow {
  const evidence: string[] = [...(args.row.evidence || [])];
  let closureDisposition: ClosureDisposition = 'unresolved';
  let nextAction = 'Needs follow-up research before any conclusion.';

  if (args.row.disposition === 'converted_to_human_review') {
    closureDisposition = 'human_review_positive';
    nextAction = 'Keep as the one researched human-review positive; no live behavior change from this closure.';
  } else if (args.row.disposition === 'rejected_by_wide_risk_simulation') {
    closureDisposition = 'rejected_wide_risk';
    nextAction = 'Keep blocked/rejected; wide-risk simulation did not support a live fallback.';
  } else if (args.row.disposition === 'keep_pending_trigger_blocked') {
    closureDisposition = 'keep_pending_trigger_blocked';
    nextAction = 'Keep blocked; completed 5M trigger/retest proof is still required.';
  } else if (args.row.disposition === 'keep_missing_entry_blocked') {
    closureDisposition = 'keep_missing_entry_blocked';
    nextAction = 'Keep blocked; stop-only evidence must not create an entry.';
  } else if (args.row.disposition === 'needs_retest_swing_residual_research') {
    const residual = args.residualByCase.get(args.row.caseId);
    if (residual && residual.disposition !== 'risk_valid_probe_found') {
      closureDisposition = 'keep_retest_swing_blocked';
      evidence.push(`Residual retest-swing drilldown disposition=${residual.disposition}; firstRiskValidSwing=${residual.firstRiskValidSwing ? 'present' : 'none'}.`);
      nextAction = 'Keep blocked; residual retest-swing evidence did not produce a risk-valid positive probe.';
    }
  } else if (args.row.disposition === 'needs_invalid_stop_location_research') {
    const invalid = args.invalidByCase.get(args.row.caseId);
    if (invalid?.disposition === 'confirmed_stale_invalidated_stop') {
      closureDisposition = 'keep_invalid_stop_blocked';
      evidence.push('Invalid-stop drilldown confirmed stale/invalidated stop geometry.');
      nextAction = 'Keep blocked; stale invalidated stops cannot be reused as entry or ticket source.';
    }
  }

  return {
    caseId: args.row.caseId,
    tradeDate: args.row.tradeDate,
    sessionType: args.row.sessionType,
    direction: args.row.direction,
    sourceDisposition: args.row.disposition,
    closureDisposition,
    evidence,
    nextAction,
  };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
}

function buildMarkdown(report: Omit<NoChaseIntradayBlockerClosureRollupReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Blocker Closure Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved-report closure only. No scanner, Discord, Supabase, live bridge, canExecute, or trading-rule changes.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Human-review positives: ${report.summary.humanReviewPositiveRows}.`,
    `- Rejected wide-risk rows: ${report.summary.rejectedWideRiskRows}.`,
    `- Keep pending-trigger blocked: ${report.summary.keepPendingTriggerBlockedRows}.`,
    `- Keep missing-entry blocked: ${report.summary.keepMissingEntryBlockedRows}.`,
    `- Keep retest-swing blocked: ${report.summary.keepRetestSwingBlockedRows}.`,
    `- Keep invalid-stop blocked: ${report.summary.keepInvalidStopBlockedRows}.`,
    `- Open research rows: ${report.summary.openResearchRows}.`,
    `- Live fix recommended: ${report.summary.liveFixRecommended}.`,
    `- Next recommended phase: ${report.summary.nextRecommendedPhase}.`,
    '',
    '## Rows',
    '| Case | Source | Closure | Next Action |',
    '|---|---|---|---|',
    ...report.rows.map((row) => `| ${markdownCell(row.caseId)} | ${row.sourceDisposition} | ${row.closureDisposition} | ${markdownCell(row.nextAction)} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayBlockerClosureRollupReport(args: {
  dispositionRollupPath: string;
  residualRetestSwingDrilldownPath: string;
  invalidStopLocationDrilldownPath: string;
  dispositionRollup: NoChaseIntradayBlockerDispositionRollupReport;
  residualRetestSwingDrilldown: NoChaseIntradayResidualRetestSwingDrilldownReport;
  invalidStopLocationDrilldown: NoChaseIntradayInvalidStopLocationDrilldownReport;
}, generatedAt = new Date().toISOString()): NoChaseIntradayBlockerClosureRollupReport {
  const residualByCase = new Map(args.residualRetestSwingDrilldown.rows.map((row) => [row.caseId, row]));
  const invalidByCase = new Map(args.invalidStopLocationDrilldown.rows.map((row) => [row.caseId, row]));
  const rows = args.dispositionRollup.rows.map((row) => closureFor({ row, residualByCase, invalidByCase }));
  const unresolvedRows = rows.filter((row) => row.closureDisposition === 'unresolved').length;
  const blockers = [
    unresolvedRows ? `${unresolvedRows} no-chase Intraday blocker row(s) remain unresolved by closure rollup` : null,
    args.residualRetestSwingDrilldown.status !== 'pass' ? 'residual retest-swing drilldown did not pass' : null,
    args.invalidStopLocationDrilldown.status !== 'pass' ? 'invalid-stop-location drilldown did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<NoChaseIntradayBlockerClosureRollupReport, 'markdown'> = {
    reportType: 'no_chase_intraday_blocker_closure_rollup',
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
      dispositionRollupPath: args.dispositionRollupPath,
      residualRetestSwingDrilldownPath: args.residualRetestSwingDrilldownPath,
      invalidStopLocationDrilldownPath: args.invalidStopLocationDrilldownPath,
    },
    summary: {
      rowsChecked: rows.length,
      humanReviewPositiveRows: rows.filter((row) => row.closureDisposition === 'human_review_positive').length,
      rejectedWideRiskRows: rows.filter((row) => row.closureDisposition === 'rejected_wide_risk').length,
      keepPendingTriggerBlockedRows: rows.filter((row) => row.closureDisposition === 'keep_pending_trigger_blocked').length,
      keepMissingEntryBlockedRows: rows.filter((row) => row.closureDisposition === 'keep_missing_entry_blocked').length,
      keepRetestSwingBlockedRows: rows.filter((row) => row.closureDisposition === 'keep_retest_swing_blocked').length,
      keepInvalidStopBlockedRows: rows.filter((row) => row.closureDisposition === 'keep_invalid_stop_blocked').length,
      unresolvedRows,
      openResearchRows: unresolvedRows,
      canExecuteTrueRows: 0,
      livePromotionAllowedRows: 0,
      liveFixRecommended: false,
      nextRecommendedPhase: blockers.length ? 'fix_inputs' : 'broader_candidate_intake',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix unresolved closure inputs before proposing the next research phase.']
      : [
        'Close the current Intraday no-chase blocker loop; the evidence does not support loosening canExecute or promoting missing-entry/stale-stop rows.',
        'Next narrow phase should mine a fresh broader candidate intake package rather than continuing to reprocess these same blockers.',
        'Keep all runtime behavior unchanged until a separate approval-gated live proposal proves itself.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayBlockerClosureRollupReport(
  report: NoChaseIntradayBlockerClosureRollupReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-blocker-closure-rollup-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayBlockerClosureRollupCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayBlockerClosureRollupReport({
    dispositionRollupPath: options.dispositionRollup,
    residualRetestSwingDrilldownPath: options.residualRetestSwingDrilldown,
    invalidStopLocationDrilldownPath: options.invalidStopLocationDrilldown,
    dispositionRollup: readJson<NoChaseIntradayBlockerDispositionRollupReport>(options.dispositionRollup),
    residualRetestSwingDrilldown: readJson<NoChaseIntradayResidualRetestSwingDrilldownReport>(options.residualRetestSwingDrilldown),
    invalidStopLocationDrilldown: readJson<NoChaseIntradayInvalidStopLocationDrilldownReport>(options.invalidStopLocationDrilldown),
  });
  const paths = writeNoChaseIntradayBlockerClosureRollupReport(report, options.outDir);
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
    runNoChaseIntradayBlockerClosureRollupCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
