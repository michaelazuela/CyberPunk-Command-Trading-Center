import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseOhlcProofCase, NoChaseOhlcProofExtractorReport } from './no-chase-ohlc-proof-extractor';

interface CliOptions {
  proofReport: string;
  outDir: string;
  json: boolean;
}

type MissingPlanNextFix =
  | 'derive_targets_from_existing_entry_stop'
  | 'mine_protected_5m_entry_stop_geometry'
  | 'hold_no_chase_missing_plan_rows';

export interface NoChaseMissingPlanFieldDrilldownReport {
  reportType: 'no_chase_missing_plan_field_drilldown';
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
    proofReportPath: string;
  };
  summary: {
    proofOnlyMissingPlanRows: number;
    missingEntryRows: number;
    missingStopRows: number;
    missingTargetRows: number;
    entryAndStopPresentTargetOnlyRows: number;
    missingEntryOrStopRows: number;
    intradayRows: number;
    afterLunchRows: number;
    morningRows: number;
    lunchRows: number;
    completedCloseThroughRows: number;
    completedRetestHoldRows: number;
    noImmediateTicketRows: number;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    recommendedNextFix: MissingPlanNextFix;
  };
  rows: Array<{
    caseId: string;
    tradeDate: string;
    sessionType: string;
    setupType: string;
    direction: string;
    firstNoChaseTime: string | null;
    proofType: NoChaseOhlcProofCase['proofType'];
    proofBarTime: string | null;
    entryPresent: boolean;
    stopPresent: boolean;
    targetsPresent: boolean;
    missingFields: string[];
    targetOnlyDerivable: boolean;
    requiresProtectedEntryStopMiner: boolean;
    recommendation: string;
  }>;
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

export function parseNoChaseMissingPlanFieldDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const proofReport = readFlag(args, '--proof-report');
  if (!proofReport) throw new Error('--proof-report is required.');
  return {
    proofReport,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): NoChaseMissingPlanFieldDrilldownReport['authority'] {
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

function present(value: number | null): boolean {
  return Number.isFinite(value);
}

function missingFieldsFor(row: NoChaseOhlcProofCase): string[] {
  return [
    present(row.entry) ? null : 'entry',
    present(row.stop) ? null : 'stop',
    present(row.target1) ? null : 'target1',
    present(row.target2) ? null : 'target2',
  ].filter((item): item is string => Boolean(item));
}

function recommendationFor(args: {
  targetOnlyDerivable: boolean;
  requiresProtectedEntryStopMiner: boolean;
}): string {
  if (args.targetOnlyDerivable) {
    return 'Entry and stop are present; targets could be research-rebuilt from deterministic 1.5R/2R math in a separate validation pass.';
  }
  if (args.requiresProtectedEntryStopMiner) {
    return 'Do not create a ticket yet. Mine protected 5M entry/stop geometry first, then derive targets only after entry and stop are valid.';
  }
  return 'Keep blocked until the source artifact exposes enough deterministic plan fields.';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<NoChaseMissingPlanFieldDrilldownReport, 'markdown'>): string {
  return [
    '# No-Chase Missing Plan Field Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report research only. It does not create tickets, wire scanner behavior, post Discord, write Supabase, read live data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Proof-only missing-plan rows: ${report.summary.proofOnlyMissingPlanRows}.`,
    `- Missing entry rows: ${report.summary.missingEntryRows}.`,
    `- Missing stop rows: ${report.summary.missingStopRows}.`,
    `- Missing target rows: ${report.summary.missingTargetRows}.`,
    `- Entry+stop present, targets-only missing: ${report.summary.entryAndStopPresentTargetOnlyRows}.`,
    `- Missing entry or stop rows: ${report.summary.missingEntryOrStopRows}.`,
    `- Intraday / AfterLunch rows: ${report.summary.intradayRows}/${report.summary.afterLunchRows}.`,
    `- Morning / Lunch rows: ${report.summary.morningRows}/${report.summary.lunchRows}.`,
    `- Close-through / Retest-hold proof rows: ${report.summary.completedCloseThroughRows}/${report.summary.completedRetestHoldRows}.`,
    `- Immediate ticket rows: ${report.summary.proofOnlyMissingPlanRows - report.summary.noImmediateTicketRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommended next fix: ${report.summary.recommendedNextFix}.`,
    '',
    '## Rows',
    '| Case | Proof | Entry | Stop | Targets | Missing | Target-only Derivable | Protected Miner Needed | Recommendation |',
    '|---|---|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.caseId)} | ${row.proofType || '-'} @ ${row.proofBarTime || '-'} | ${row.entryPresent} | ${row.stopPresent} | ${row.targetsPresent} | ${row.missingFields.join(', ') || '-'} | ${row.targetOnlyDerivable} | ${row.requiresProtectedEntryStopMiner} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseMissingPlanFieldDrilldownReport(args: {
  proofReportPath: string;
  proofReport: NoChaseOhlcProofExtractorReport | null;
}, generatedAt = new Date().toISOString()): NoChaseMissingPlanFieldDrilldownReport {
  const missingCases = (args.proofReport?.cases || [])
    .filter((row) => row.reviewClassification === 'proof_only_missing_plan_fields');
  const rows = missingCases.map((row) => {
    const entryPresent = present(row.entry);
    const stopPresent = present(row.stop);
    const targetsPresent = present(row.target1) && present(row.target2);
    const missingFields = missingFieldsFor(row);
    const targetOnlyDerivable = entryPresent && stopPresent && !targetsPresent;
    const requiresProtectedEntryStopMiner = !entryPresent || !stopPresent;
    return {
      caseId: row.caseId,
      tradeDate: row.tradeDate,
      sessionType: row.sessionType,
      setupType: row.setupType,
      direction: row.direction,
      firstNoChaseTime: row.firstNoChaseTime,
      proofType: row.proofType,
      proofBarTime: row.proofBarTime,
      entryPresent,
      stopPresent,
      targetsPresent,
      missingFields,
      targetOnlyDerivable,
      requiresProtectedEntryStopMiner,
      recommendation: recommendationFor({ targetOnlyDerivable, requiresProtectedEntryStopMiner }),
    };
  });
  const blockers = [
    !args.proofReport ? 'missing no-chase OHLC proof report' : null,
    args.proofReport && args.proofReport.reportType !== 'no_chase_ohlc_proof_extractor' ? `unexpected reportType ${args.proofReport.reportType}` : null,
    args.proofReport && args.proofReport.summary.proofOnlyMissingPlanFields !== rows.length ? 'proof report missing-plan summary does not match rows' : null,
    rows.some((row) => row.missingFields.length === 0) ? 'one or more rows has no missing fields' : null,
  ].filter((item): item is string => Boolean(item));
  const targetOnlyRows = rows.filter((row) => row.targetOnlyDerivable).length;
  const missingEntryOrStopRows = rows.filter((row) => row.requiresProtectedEntryStopMiner).length;
  const recommendedNextFix: MissingPlanNextFix = targetOnlyRows > 0
    ? 'derive_targets_from_existing_entry_stop'
    : missingEntryOrStopRows > 0
      ? 'mine_protected_5m_entry_stop_geometry'
      : 'hold_no_chase_missing_plan_rows';
  const base: Omit<NoChaseMissingPlanFieldDrilldownReport, 'markdown'> = {
    reportType: 'no_chase_missing_plan_field_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      proofReportPath: args.proofReportPath,
    },
    summary: {
      proofOnlyMissingPlanRows: rows.length,
      missingEntryRows: rows.filter((row) => row.missingFields.includes('entry')).length,
      missingStopRows: rows.filter((row) => row.missingFields.includes('stop')).length,
      missingTargetRows: rows.filter((row) => row.missingFields.includes('target1') || row.missingFields.includes('target2')).length,
      entryAndStopPresentTargetOnlyRows: targetOnlyRows,
      missingEntryOrStopRows,
      intradayRows: rows.filter((row) => row.setupType === 'IntradayMssMicroContinuation').length,
      afterLunchRows: rows.filter((row) => row.setupType === 'AfterLunchDriveFvgContinuation').length,
      morningRows: rows.filter((row) => row.sessionType === 'morning').length,
      lunchRows: rows.filter((row) => row.sessionType === 'lunch').length,
      completedCloseThroughRows: rows.filter((row) => row.proofType === 'completed_5m_close_through').length,
      completedRetestHoldRows: rows.filter((row) => row.proofType === 'completed_5m_retest_hold').length,
      noImmediateTicketRows: rows.length,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      recommendedNextFix,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix proof-report input before using missing-plan drilldown results.']
      : [
        'Do not turn proof-only rows into tickets from this report.',
        targetOnlyRows
          ? 'Run a target-only derivation validation for rows that already have entry and stop.'
          : 'Target math alone does not solve this bucket; build a protected 5M entry/stop geometry miner next.',
        'Keep canExecute, Discord posting, Supabase persistence, scanner visibility, and trading logic unchanged.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseMissingPlanFieldDrilldownReport(
  report: NoChaseMissingPlanFieldDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-missing-plan-field-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseMissingPlanFieldDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseMissingPlanFieldDrilldownArgs(args);
  const report = buildNoChaseMissingPlanFieldDrilldownReport({
    proofReportPath: options.proofReport,
    proofReport: fs.existsSync(options.proofReport) ? readJson(options.proofReport) : null,
  });
  const paths = writeNoChaseMissingPlanFieldDrilldownReport(report, options.outDir);
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
    runNoChaseMissingPlanFieldDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
