import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport } from './unified-positive-held-local-preview-afterlunch-timing-field-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type Recommendation = 'validate_on_broader_history' | 'keep_research_only' | 'fix_inputs';

interface Candidate {
  field: string;
  value: string;
}

interface SlateRow {
  slateId: string;
  rows: number;
  baselineTicketId: string | null;
  baselineOutcomeBucket: TimingRow['outcomeBucket'] | null;
  baselineOneMesPl: number | null;
  simulatedTicketId: string | null;
  simulatedOutcomeBucket: TimingRow['outcomeBucket'] | null;
  simulatedOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_timing_selection_simulation';
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
    fieldMinerPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    baselineUsesEarliestProofPerSlate: true;
    simulatedUsesKnownAtPlanFieldsOnly: true;
    outcomesUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  scoring: {
    positiveCandidates: string[];
    cautionCandidates: string[];
    positiveBoostPoints: number;
    cautionPenaltyPoints: number;
  };
  summary: {
    rows: number;
    slates: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    changedResolvedDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: Recommendation;
  };
  slates: SlateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'AfterLunchDriveFvgContinuation';
const POSITIVE_BOOST_POINTS = 100;
const CAUTION_PENALTY_POINTS = 100;

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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport['authority'] {
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

function parseCandidate(candidate: string): Candidate | null {
  const index = candidate.indexOf('=');
  if (index <= 0) return null;
  return { field: candidate.slice(0, index), value: candidate.slice(index + 1) };
}

function matches(row: TimingRow, candidate: Candidate): boolean {
  return features(row)[candidate.field] === candidate.value;
}

function score(row: TimingRow, positive: Candidate[], caution: Candidate[]): number {
  const positiveHits = positive.filter((candidate) => matches(row, candidate)).length;
  const cautionHits = caution.filter((candidate) => matches(row, candidate)).length;
  return (positiveHits * POSITIVE_BOOST_POINTS) - (cautionHits * CAUTION_PENALTY_POINTS);
}

function compareProof(a: TimingRow, b: TimingRow): number {
  return a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId);
}

function compareSimulated(positive: Candidate[], caution: Candidate[]) {
  return (a: TimingRow, b: TimingRow): number => (
    score(b, positive, caution) - score(a, positive, caution)
    || compareProof(a, b)
  );
}

function groupBySlate(rows: TimingRow[]): Map<string, TimingRow[]> {
  const groups = new Map<string, TimingRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function buildSlates(rows: TimingRow[], positive: Candidate[], caution: Candidate[]): SlateRow[] {
  return [...groupBySlate(rows).entries()].map(([slateId, slateRows]) => {
    const baseline = [...slateRows].sort(compareProof)[0] || null;
    const simulated = [...slateRows].sort(compareSimulated(positive, caution))[0] || null;
    return {
      slateId,
      rows: slateRows.length,
      baselineTicketId: baseline?.ticketId || null,
      baselineOutcomeBucket: baseline?.outcomeBucket || null,
      baselineOneMesPl: baseline?.resolvedOneMesPl ?? null,
      simulatedTicketId: simulated?.ticketId || null,
      simulatedOutcomeBucket: simulated?.outcomeBucket || null,
      simulatedOneMesPl: simulated?.resolvedOneMesPl ?? null,
      topChanged: Boolean(baseline && simulated && baseline.ticketId !== simulated.ticketId),
      deltaOneMesPl: typeof baseline?.resolvedOneMesPl === 'number' && typeof simulated?.resolvedOneMesPl === 'number'
        ? round(simulated.resolvedOneMesPl - baseline.resolvedOneMesPl)
        : null,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Timing Selection Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report AfterLunch timing selection simulation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Rows: ${report.summary.rows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/simulated top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Changed resolved delta: ${report.summary.changedResolvedDeltaOneMesPl ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport(args: {
  reportDir?: string;
  sourceProofTimingPath?: string | null;
  fieldMinerPath?: string | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  fieldMinerReport?: UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const fieldMinerPath = args.fieldMinerPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-timing-field-miner-');
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const fieldMinerReport = args.fieldMinerReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport>(fieldMinerPath);
  const rows = (sourceProofTimingReport?.rows || []).filter((row) => row.setupType === SETUP);
  const positiveCandidateIds = (fieldMinerReport?.buckets || []).filter((bucket) => bucket.verdict === 'positive_candidate').map((bucket) => bucket.bucketId);
  const cautionCandidateIds = (fieldMinerReport?.buckets || []).filter((bucket) => bucket.verdict === 'caution_candidate').map((bucket) => bucket.bucketId);
  const positive = positiveCandidateIds.map(parseCandidate).filter((candidate): candidate is Candidate => Boolean(candidate));
  const caution = cautionCandidateIds.map(parseCandidate).filter((candidate): candidate is Candidate => Boolean(candidate));
  const slates = buildSlates(rows, positive, caution);
  const changed = slates.filter((slate) => slate.topChanged);
  const baselineTopOneMesPl = sum(slates.map((slate) => slate.baselineOneMesPl));
  const simulatedTopOneMesPl = sum(slates.map((slate) => slate.simulatedOneMesPl));
  const delta = baselineTopOneMesPl === null || simulatedTopOneMesPl === null ? null : round(simulatedTopOneMesPl - baselineTopOneMesPl);
  const changedResolvedDelta = sum(changed.map((slate) => slate.deltaOneMesPl));
  const blockers = [
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !fieldMinerPath && !args.fieldMinerReport ? 'missing AfterLunch timing field miner path' : null,
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    !fieldMinerReport ? 'missing AfterLunch timing field miner report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    fieldMinerReport && fieldMinerReport.status !== 'pass' ? `AfterLunch timing field miner status ${fieldMinerReport.status}` : null,
    rows.length === 0 ? 'no AfterLunchDriveFvgContinuation source/proof rows found' : null,
    positive.length === 0 && caution.length === 0 ? 'no parseable positive or caution timing candidates found' : null,
  ].filter((item): item is string => Boolean(item));
  const improvesSelection = !blockers.length && typeof delta === 'number' && delta > 0 && changed.length > 0;
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_timing_selection_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, sourceProofTimingPath, fieldMinerPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      baselineUsesEarliestProofPerSlate: true,
      simulatedUsesKnownAtPlanFieldsOnly: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    scoring: {
      positiveCandidates: positiveCandidateIds,
      cautionCandidates: cautionCandidateIds,
      positiveBoostPoints: POSITIVE_BOOST_POINTS,
      cautionPenaltyPoints: CAUTION_PENALTY_POINTS,
    },
    summary: {
      rows: rows.length,
      slates: slates.length,
      changedSlates: changed.length,
      baselineTopOneMesPl,
      simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      changedResolvedDeltaOneMesPl: changedResolvedDelta,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : improvesSelection ? 'validate_on_broader_history' : 'keep_research_only',
    },
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved source/proof timing and AfterLunch timing field miner inputs before selection simulation.']
      : improvesSelection
        ? ['Validate the AfterLunch timing selector on broader/fresher history before any live-facing rank proposal.']
        : ['Keep AfterLunch timing buckets research-only until a selection simulation proves a positive top-selection delta.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport({
    reportDir,
    sourceProofTimingPath: readFlag(args, '--source-proof-timing') || undefined,
    fieldMinerPath: readFlag(args, '--field-miner') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-timing-selection-simulation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, scoring: report.scoring, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
