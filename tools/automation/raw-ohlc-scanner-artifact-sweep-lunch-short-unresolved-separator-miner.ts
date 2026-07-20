import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ResearchAction = 'exclude_from_positive_rank_training' | 'keep_as_unresolved_review_note' | 'inspect_saved_inputs';
type SeparatorDecision = 'candidate_for_no_lookahead_validation' | 'research_only_context' | 'reject_for_now';

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  cause: string;
  researchAction: ResearchAction;
  scannerFields: Record<string, string>;
}

interface DrilldownReport {
  status?: string;
  rows?: DrilldownRow[];
}

interface FieldBucket {
  bucketId: string;
  field: string;
  value: string;
  rows: number;
  reviewNoteRows: number;
  exclusionRows: number;
  inspectInputRows: number;
  reviewNoteShare: number;
  exclusionShare: number;
  tradeDates: string[];
  causes: Record<string, number>;
  decision: SeparatorDecision;
  recommendation: string;
}

export interface RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_unresolved_separator_miner';
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
    unresolvedDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    scannerOwnedFieldsOnly: true;
    outcomeClassificationUsedOnlyAsResearchLabel: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    sourceRows: number;
    reviewNoteRows: number;
    exclusionRows: number;
    inspectInputRows: number;
    fieldBuckets: number;
    reviewNoteCandidates: number;
    exclusionCandidates: number;
    bestReviewNoteCandidate: string | null;
    bestExclusionCandidate: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_candidates_in_selection_simulation' | 'keep_research_only' | 'fix_inputs';
  };
  buckets: FieldBucket[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MIN_CANDIDATE_ROWS = 3;

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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function decisionFor(bucket: Pick<FieldBucket, 'rows' | 'reviewNoteRows' | 'exclusionRows' | 'inspectInputRows'>): SeparatorDecision {
  if (bucket.inspectInputRows > 0) return 'research_only_context';
  if (bucket.rows >= MIN_CANDIDATE_ROWS && (bucket.reviewNoteRows === 0 || bucket.exclusionRows === 0)) return 'candidate_for_no_lookahead_validation';
  if (bucket.reviewNoteRows >= MIN_CANDIDATE_ROWS || bucket.exclusionRows >= MIN_CANDIDATE_ROWS) return 'research_only_context';
  return 'reject_for_now';
}

function recommendationFor(bucket: Pick<FieldBucket, 'decision' | 'exclusionRows'>): string {
  if (bucket.decision === 'candidate_for_no_lookahead_validation') {
    return bucket.exclusionRows === 0
      ? 'Candidate review-note separator. Validate with no-lookahead selection simulation before any rank proposal.'
      : 'Candidate exclusion separator. Validate with no-lookahead selection simulation before any positive-training or rank proposal.';
  }
  if (bucket.decision === 'research_only_context') return 'Research-only context. Not clean enough for behavior proposal.';
  return 'Reject for now. Too sparse or mixed.';
}

function buildBuckets(rows: DrilldownRow[]): FieldBucket[] {
  const groups = new Map<string, DrilldownRow[]>();
  for (const row of rows) {
    for (const [field, value] of Object.entries(row.scannerFields || {})) {
      const bucketId = `${field}=${value}`;
      groups.set(bucketId, [...(groups.get(bucketId) || []), row]);
    }
  }
  return [...groups.entries()].map(([bucketId, group]) => {
    const [field, ...valueParts] = bucketId.split('=');
    const reviewNoteRows = group.filter((row) => row.researchAction === 'keep_as_unresolved_review_note').length;
    const exclusionRows = group.filter((row) => row.researchAction === 'exclude_from_positive_rank_training').length;
    const inspectInputRows = group.filter((row) => row.researchAction === 'inspect_saved_inputs').length;
    const base: Omit<FieldBucket, 'decision' | 'recommendation'> = {
      bucketId,
      field,
      value: valueParts.join('='),
      rows: group.length,
      reviewNoteRows,
      exclusionRows,
      inspectInputRows,
      reviewNoteShare: round(reviewNoteRows / group.length),
      exclusionShare: round(exclusionRows / group.length),
      tradeDates: [...new Set(group.map((row) => row.tradeDate))].sort(),
      causes: countBy(group.map((row) => row.cause)),
    };
    const decision = decisionFor(base);
    return { ...base, decision, recommendation: recommendationFor({ ...base, decision }) };
  }).sort((a, b) => (
    Number(b.decision === 'candidate_for_no_lookahead_validation') - Number(a.decision === 'candidate_for_no_lookahead_validation')
    || b.rows - a.rows
    || b.reviewNoteShare - a.reviewNoteShare
    || a.bucketId.localeCompare(b.bucketId)
  ));
}

function authority(): RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch SHORT Unresolved Separator Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report scanner-field miner. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Review-note / exclusion / inspect-input rows: ${report.summary.reviewNoteRows}/${report.summary.exclusionRows}/${report.summary.inspectInputRows}.`,
    `- Field buckets: ${report.summary.fieldBuckets}.`,
    `- Review-note candidates: ${report.summary.reviewNoteCandidates}.`,
    `- Exclusion candidates: ${report.summary.exclusionCandidates}.`,
    `- Best review-note candidate: ${report.summary.bestReviewNoteCandidate ?? '-'}.`,
    `- Best exclusion candidate: ${report.summary.bestExclusionCandidate ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Candidate Buckets',
    ...report.buckets
      .filter((row) => row.decision === 'candidate_for_no_lookahead_validation')
      .map((row) => `- ${row.bucketId}: rows ${row.rows}; review/exclude ${row.reviewNoteRows}/${row.exclusionRows}; dates ${row.tradeDates.join(', ')}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport(args: {
  reportDir?: string;
  unresolvedDrilldownPath?: string | null;
  unresolvedDrilldown?: DrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const unresolvedDrilldownPath = args.unresolvedDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-slate-drilldown-');
  const unresolvedDrilldown = args.unresolvedDrilldown ?? readJson<DrilldownReport>(unresolvedDrilldownPath);
  const rows = unresolvedDrilldown?.rows || [];
  const buckets = buildBuckets(rows);
  const reviewNoteCandidates = buckets.filter((row) => row.decision === 'candidate_for_no_lookahead_validation' && row.exclusionRows === 0);
  const exclusionCandidates = buckets.filter((row) => row.decision === 'candidate_for_no_lookahead_validation' && row.reviewNoteRows === 0);
  const bestReviewNoteCandidate = reviewNoteCandidates[0]?.bucketId || null;
  const bestExclusionCandidate = exclusionCandidates[0]?.bucketId || null;
  const blockers = [
    !unresolvedDrilldownPath && !args.unresolvedDrilldown ? 'missing unresolved drilldown path' : null,
    !unresolvedDrilldown ? 'missing unresolved drilldown report' : null,
    unresolvedDrilldown && unresolvedDrilldown.status !== 'pass' ? `unresolved drilldown status ${unresolvedDrilldown.status}` : null,
    rows.length === 0 ? 'unresolved drilldown has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const hasCandidate = reviewNoteCandidates.length > 0 || exclusionCandidates.length > 0;
  const base: Omit<RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_unresolved_separator_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, unresolvedDrilldownPath },
    assumptions: {
      savedReportsOnly: true,
      scannerOwnedFieldsOnly: true,
      outcomeClassificationUsedOnlyAsResearchLabel: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      sourceRows: rows.length,
      reviewNoteRows: rows.filter((row) => row.researchAction === 'keep_as_unresolved_review_note').length,
      exclusionRows: rows.filter((row) => row.researchAction === 'exclude_from_positive_rank_training').length,
      inspectInputRows: rows.filter((row) => row.researchAction === 'inspect_saved_inputs').length,
      fieldBuckets: buckets.length,
      reviewNoteCandidates: reviewNoteCandidates.length,
      exclusionCandidates: exclusionCandidates.length,
      bestReviewNoteCandidate,
      bestExclusionCandidate,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : hasCandidate ? 'validate_candidates_in_selection_simulation' : 'keep_research_only',
    },
    buckets,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved unresolved drilldown input before mining separators.']
      : hasCandidate
        ? ['Validate candidate separators with a no-lookahead selection simulation before any live-facing proposal.']
        : ['Keep unresolved separator mining research-only; no clean scanner-owned separator was found.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport({
    reportDir,
    unresolvedDrilldownPath: readFlag(args, '--unresolved-drilldown') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-separator-miner-${Date.now()}.json`);
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
