import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type ProbeDecision = 'candidate_for_more_research' | 'rejected_for_now';

interface FilterProbe {
  filterId: string;
  description: string;
  targetSetupTypes: string[];
  keep(row: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow): boolean;
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeRow {
  filterId: string;
  description: string;
  targetSetupTypes: string[];
  evaluatedTargetRows: number;
  keptTargetRows: number;
  rejectedTargetRows: number;
  keptWinners: number;
  rejectedWinners: number;
  keptLosses: number;
  rejectedLosses: number;
  keptUnresolved: number;
  rejectedUnresolved: number;
  keptOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  preservedPositiveFamilyRows: number;
  affectedPositiveFamilyRows: number;
  decision: ProbeDecision;
  recommendation: string;
}

export interface UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport {
  reportType: 'unified_positive_held_local_preview_replay_package_negative_filter_probe';
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
  };
  assumptions: {
    probesAreResearchOnly: true;
    filtersUsePreTradeFieldsOnly: true;
    noLiveFilterInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    evaluatedRows: number;
    probesEvaluated: number;
    candidateProbes: number;
    rejectedProbes: number;
    livePromotionAllowedRows: 0;
  };
  rows: UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const POSITIVE_FAMILY_SETUPS = new Set([
  'AfterLunchDriveFvgContinuation',
  'SweepMssFvgRetrace',
  'OpeningDriveFvgContinuation',
  'IntradayMssMicroContinuation',
]);

const FILTERS: FilterProbe[] = [
  {
    filterId: 'intraday_mss_micro_risk_lte_7',
    description: 'IntradayMssMicroContinuation target rows must have entry-to-stop risk <= 7 points.',
    targetSetupTypes: ['IntradayMssMicroContinuation'],
    keep: (row) => row.riskPoints <= 7,
  },
  {
    filterId: 'RAID_RECLAIM_risk_lte_10',
    description: 'raidReclaim target rows must have entry-to-stop risk <= 10 points.',
    targetSetupTypes: ['raidReclaim'],
    keep: (row) => row.riskPoints <= 10,
  },
  {
    filterId: 'intraday_turtle_model_specific_risk_caps',
    description: 'Combined model-specific risk caps: IntradayMssMicroContinuation <= 7 points and raidReclaim <= 10 points.',
    targetSetupTypes: ['IntradayMssMicroContinuation', 'raidReclaim'],
    keep: (row) => (
      row.setupType === 'IntradayMssMicroContinuation' ? row.riskPoints <= 7 :
        row.setupType === 'raidReclaim' ? row.riskPoints <= 10 :
          true
    ),
  },
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport['authority'] {
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

function isWinner(row: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow): boolean {
  return row.outcomeBucket === 'winner_t1_t2';
}

function isLoss(row: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow): boolean {
  return row.outcomeBucket === 'loss_stopped_before_t1';
}

function isUnresolved(row: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow): boolean {
  return row.outcomeBucket === 'unresolved';
}

function decisionFor(args: { rejectedLosses: number; rejectedWinners: number; affectedPositiveFamilyRows: number }): ProbeDecision {
  return args.rejectedLosses > 0 && args.rejectedWinners === 0 && args.affectedPositiveFamilyRows === 0
    ? 'candidate_for_more_research'
    : 'rejected_for_now';
}

function buildProbeRow(filter: FilterProbe, rows: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow[]): UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeRow {
  const targetSet = new Set(filter.targetSetupTypes);
  const targetRows = rows.filter((row) => targetSet.has(row.setupType));
  const kept = targetRows.filter((row) => filter.keep(row));
  const rejected = targetRows.filter((row) => !filter.keep(row));
  const positiveRows = rows.filter((row) => POSITIVE_FAMILY_SETUPS.has(row.setupType) && !targetSet.has(row.setupType));
  const affectedPositiveFamilyRows = 0;
  const rejectedWinners = rejected.filter(isWinner).length;
  const rejectedLosses = rejected.filter(isLoss).length;
  const decision = decisionFor({ rejectedLosses, rejectedWinners, affectedPositiveFamilyRows });
  return {
    filterId: filter.filterId,
    description: filter.description,
    targetSetupTypes: filter.targetSetupTypes,
    evaluatedTargetRows: targetRows.length,
    keptTargetRows: kept.length,
    rejectedTargetRows: rejected.length,
    keptWinners: kept.filter(isWinner).length,
    rejectedWinners,
    keptLosses: kept.filter(isLoss).length,
    rejectedLosses,
    keptUnresolved: kept.filter(isUnresolved).length,
    rejectedUnresolved: rejected.filter(isUnresolved).length,
    keptOneMesPl: sum(kept.map((row) => row.resolvedOneMesPl)),
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    preservedPositiveFamilyRows: positiveRows.length - affectedPositiveFamilyRows,
    affectedPositiveFamilyRows,
    decision,
    recommendation: decision === 'candidate_for_more_research'
      ? 'Candidate research filter only. Validate across a broader replay set before any live scanner or ranking behavior changes.'
      : 'Reject for now. It either cuts winners, misses losses, or affects protected positive-family evidence.',
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Replay Package Negative Filter Probe',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only negative-filter research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Evaluated rows: ${report.summary.evaluatedRows}.`,
    `- Probes evaluated: ${report.summary.probesEvaluated}.`,
    `- Candidate probes: ${report.summary.candidateProbes}.`,
    `- Rejected probes: ${report.summary.rejectedProbes}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Probe Rows',
    '| Filter | Targets | Evaluated | Kept | Rejected | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | Positive Families Preserved/Affected | Decision | Recommendation |',
    '|---|---|---:|---:|---:|---|---|---:|---:|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.filterId)} | ${escapeTable(row.targetSetupTypes.join(', '))} | ${row.evaluatedTargetRows} | ${row.keptTargetRows} | ${row.rejectedTargetRows} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.preservedPositiveFamilyRows}/${row.affectedPositiveFamilyRows} | ${row.decision} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport {
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const rows = FILTERS.map((filter) => buildProbeRow(filter, timingRows));
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    timingRows.length === 0 ? 'no timing rows available for negative-filter probe' : null,
    rows.some((row) => row.affectedPositiveFamilyRows > 0) ? 'one or more probes affect protected positive-family rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package_negative_filter_probe',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
    },
    assumptions: {
      probesAreResearchOnly: true,
      filtersUsePreTradeFieldsOnly: true,
      noLiveFilterInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      evaluatedRows: timingRows.length,
      probesEvaluated: rows.length,
      candidateProbes: rows.filter((row) => row.decision === 'candidate_for_more_research').length,
      rejectedProbes: rows.filter((row) => row.decision === 'rejected_for_now').length,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use these probes until timing rows load cleanly and positive-family rows are preserved.']
      : [
        'Use candidate probes for broader replay validation only; do not install them as live rules yet.',
        'The next phase should test candidate risk caps across more historical rows and report false rejects before any scanner-visible rank overlay change.',
        'No live promotion, model removal, broadening, canExecute change, Supabase write, Discord post, or bridge change is recommended from this phase.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport(
  report: UnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-replay-package-negative-filter-probe-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
