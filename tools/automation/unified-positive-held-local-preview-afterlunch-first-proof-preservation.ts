import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport } from './unified-positive-held-local-preview-afterlunch-changed-slate-drilldown';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport } from './unified-positive-held-local-preview-afterlunch-timing-selection-simulation';

type Recommendation = 'preserve_first_valid_proof_research_only' | 'needs_more_research' | 'fix_inputs';

export interface UnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_first_proof_preservation';
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
    reportDir: string;
    selectionSimulationPath: string | null;
    changedSlateDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    preservationConclusionOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    selectionChangedSlates: number;
    selectionDeltaOneMesPl: number | null;
    drilldownRows: number;
    baselineWinnerRows: number;
    simulatedWinnerRows: number;
    baselineBetterWinnerSlates: number;
    laterTighterWinnerReplacementRows: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: Recommendation;
  };
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport['authority'] {
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch First-Proof Preservation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report preservation validator. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Selection changed slates: ${report.summary.selectionChangedSlates}.`,
    `- Selection delta: ${report.summary.selectionDeltaOneMesPl ?? '-'}.`,
    `- Baseline/simulated winner rows: ${report.summary.baselineWinnerRows}/${report.summary.simulatedWinnerRows}.`,
    `- Baseline-better winner slates: ${report.summary.baselineBetterWinnerSlates}.`,
    `- Later tighter winner replacement rows: ${report.summary.laterTighterWinnerReplacementRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport(args: {
  reportDir?: string;
  selectionSimulationPath?: string | null;
  changedSlateDrilldownPath?: string | null;
  selectionSimulationReport?: UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport | null;
  changedSlateDrilldownReport?: UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const selectionSimulationPath = args.selectionSimulationPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-timing-selection-simulation-');
  const changedSlateDrilldownPath = args.changedSlateDrilldownPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-changed-slate-drilldown-');
  const selectionSimulationReport = args.selectionSimulationReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport>(selectionSimulationPath);
  const changedSlateDrilldownReport = args.changedSlateDrilldownReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport>(changedSlateDrilldownPath);
  const changedSlates = selectionSimulationReport?.slates.filter((slate) => slate.topChanged) || [];
  const baselineBetterWinnerSlates = changedSlates.filter((slate) => (
    slate.baselineOutcomeBucket === 'winner_t1_t2' &&
    slate.simulatedOutcomeBucket === 'winner_t1_t2' &&
    typeof slate.deltaOneMesPl === 'number' &&
    slate.deltaOneMesPl < 0
  )).length;
  const laterTighterWinnerReplacementRows = (changedSlateDrilldownReport?.rows || []).filter((row) => (
    row.simulatedTop &&
    row.outcomeBucket === 'winner_t1_t2' &&
    row.positiveHits.some((hit) => hit.startsWith('riskBucket='))
  )).length;
  const blockers = [
    !selectionSimulationPath && !args.selectionSimulationReport ? 'missing AfterLunch selection simulation path' : null,
    !changedSlateDrilldownPath && !args.changedSlateDrilldownReport ? 'missing AfterLunch changed-slate drilldown path' : null,
    !selectionSimulationReport ? 'missing AfterLunch selection simulation report' : null,
    !changedSlateDrilldownReport ? 'missing AfterLunch changed-slate drilldown report' : null,
    selectionSimulationReport && selectionSimulationReport.status !== 'pass' ? `AfterLunch selection simulation status ${selectionSimulationReport.status}` : null,
    changedSlateDrilldownReport && changedSlateDrilldownReport.status !== 'pass' ? `AfterLunch changed-slate drilldown status ${changedSlateDrilldownReport.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const preservationSupported = !blockers.length &&
    (selectionSimulationReport?.summary.topSelectionDeltaOneMesPl ?? 0) < 0 &&
    baselineBetterWinnerSlates === (selectionSimulationReport?.summary.changedSlates ?? -1) &&
    laterTighterWinnerReplacementRows > 0;
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_first_proof_preservation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, selectionSimulationPath, changedSlateDrilldownPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      preservationConclusionOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      selectionChangedSlates: selectionSimulationReport?.summary.changedSlates || 0,
      selectionDeltaOneMesPl: selectionSimulationReport?.summary.topSelectionDeltaOneMesPl ?? null,
      drilldownRows: changedSlateDrilldownReport?.summary.rows || 0,
      baselineWinnerRows: changedSlateDrilldownReport?.summary.baselineWinnerRows || 0,
      simulatedWinnerRows: changedSlateDrilldownReport?.summary.simulatedWinnerRows || 0,
      baselineBetterWinnerSlates,
      laterTighterWinnerReplacementRows,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : preservationSupported ? 'preserve_first_valid_proof_research_only' : 'needs_more_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix saved AfterLunch selection/drilldown inputs before preservation validation.']
      : preservationSupported
        ? ['Preserve earliest completed AfterLunch proof in research selection. Do not install broad proof-hour or risk-bucket boosts from this package.']
        : ['Keep researching; this package does not yet prove first-proof preservation as a separator.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport({
    reportDir,
    selectionSimulationPath: readFlag(args, '--selection-simulation') || undefined,
    changedSlateDrilldownPath: readFlag(args, '--changed-slate-drilldown') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-first-proof-preservation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
