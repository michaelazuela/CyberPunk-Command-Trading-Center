import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport } from './unified-positive-held-local-preview-afterlunch-timing-selection-simulation';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;

interface DrilldownRow {
  ticketId: string;
  slateId: string;
  proofTime: string;
  direction: string;
  riskPoints: number;
  riskBucket: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  baselineTop: boolean;
  simulatedTop: boolean;
  positiveHits: string[];
  cautionHits: string[];
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_changed_slate_drilldown';
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
    sourceProofTimingPath: string | null;
    selectionSimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchChangedSlatesOnly: true;
    outcomesUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    changedSlates: number;
    rows: number;
    baselineWinnerRows: number;
    simulatedWinnerRows: number;
    totalChangedDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'inspect_first_proof_preservation' | 'keep_research_only' | 'fix_inputs';
  };
  rows: DrilldownRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'NoInstalledSetup';

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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function riskBucket(row: TimingRow): string {
  if (row.riskPoints <= 6) return '<=6';
  if (row.riskPoints <= 8) return '6.25-8';
  if (row.riskPoints <= 10) return '8.25-10';
  if (row.riskPoints <= 12) return '10.25-12';
  return '>12';
}

function features(row: TimingRow): Record<string, string> {
  return {
    direction: row.direction,
    session: row.session,
    proofHour: row.proofTime.slice(11, 13),
    riskBucket: riskBucket(row),
  };
}

function candidateHits(row: TimingRow, candidates: string[]): string[] {
  const rowFeatures = features(row);
  return candidates.filter((candidate) => {
    const index = candidate.indexOf('=');
    if (index <= 0) return false;
    return rowFeatures[candidate.slice(0, index)] === candidate.slice(index + 1);
  });
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Changed-Slate Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report changed-slate drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Rows: ${report.summary.rows}.`,
    `- Baseline/simulated winner rows: ${report.summary.baselineWinnerRows}/${report.summary.simulatedWinnerRows}.`,
    `- Total changed delta: ${report.summary.totalChangedDeltaOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport(args: {
  reportDir?: string;
  sourceProofTimingPath?: string | null;
  selectionSimulationPath?: string | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  selectionSimulationReport?: UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const selectionSimulationPath = args.selectionSimulationPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-timing-selection-simulation-');
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const selectionSimulationReport = args.selectionSimulationReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport>(selectionSimulationPath);
  const changedSlates = (selectionSimulationReport?.slates || []).filter((slate) => slate.topChanged);
  const changedBySlate = new Map(changedSlates.map((slate) => [slate.slateId, slate]));
  const rows = (sourceProofTimingReport?.rows || [])
    .filter((row) => row.setupType === SETUP && changedBySlate.has(`${row.tradeDate}|${row.session}`))
    .map((row) => {
      const slateId = `${row.tradeDate}|${row.session}`;
      const slate = changedBySlate.get(slateId);
      return {
        ticketId: row.ticketId,
        slateId,
        proofTime: row.proofTime,
        direction: row.direction,
        riskPoints: row.riskPoints,
        riskBucket: riskBucket(row),
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        baselineTop: slate?.baselineTicketId === row.ticketId,
        simulatedTop: slate?.simulatedTicketId === row.ticketId,
        positiveHits: candidateHits(row, selectionSimulationReport?.scoring.positiveCandidates || []),
        cautionHits: candidateHits(row, selectionSimulationReport?.scoring.cautionCandidates || []),
      };
    }).sort((a, b) => a.slateId.localeCompare(b.slateId) || a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId));
  const blockers = [
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !selectionSimulationPath && !args.selectionSimulationReport ? 'missing AfterLunch selection simulation path' : null,
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    !selectionSimulationReport ? 'missing AfterLunch selection simulation report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    selectionSimulationReport && selectionSimulationReport.status !== 'pass' ? `AfterLunch selection simulation status ${selectionSimulationReport.status}` : null,
    changedSlates.length === 0 ? 'no changed AfterLunch slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const allChangedTopsAreWinners = changedSlates.every((slate) => slate.baselineOutcomeBucket === 'winner_t1_t2' && slate.simulatedOutcomeBucket === 'winner_t1_t2');
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_changed_slate_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, sourceProofTimingPath, selectionSimulationPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchChangedSlatesOnly: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      changedSlates: changedSlates.length,
      rows: rows.length,
      baselineWinnerRows: changedSlates.filter((slate) => slate.baselineOutcomeBucket === 'winner_t1_t2').length,
      simulatedWinnerRows: changedSlates.filter((slate) => slate.simulatedOutcomeBucket === 'winner_t1_t2').length,
      totalChangedDeltaOneMesPl: sum(changedSlates.map((slate) => slate.deltaOneMesPl)),
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : allChangedTopsAreWinners ? 'inspect_first_proof_preservation' : 'keep_research_only',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved source/proof and selection simulation inputs before changed-slate drilldown.']
      : allChangedTopsAreWinners
        ? ['Inspect first-proof preservation before any AfterLunch rank scoring. The selector replaced earlier winners with slightly lower-P/L later winners.']
        : ['Keep AfterLunch timing selection research-only and inspect changed slates for loss-avoidance evidence before any proposal.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport({
    reportDir,
    sourceProofTimingPath: readFlag(args, '--source-proof-timing') || undefined,
    selectionSimulationPath: readFlag(args, '--selection-simulation') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-changed-slate-drilldown-${Date.now()}.json`);
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
