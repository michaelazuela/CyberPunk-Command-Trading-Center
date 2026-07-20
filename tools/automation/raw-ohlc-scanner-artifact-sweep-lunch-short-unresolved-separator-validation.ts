import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ResearchAction = 'exclude_from_positive_rank_training' | 'keep_as_unresolved_review_note' | 'inspect_saved_inputs';
type Prediction = 'predicted_review_note' | 'predicted_exclusion' | 'unclassified';

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  researchAction: ResearchAction;
  scannerFields: Record<string, string>;
}

interface DrilldownReport {
  status?: string;
  rows?: DrilldownRow[];
}

interface SeparatorMinerReport {
  status?: string;
  summary?: {
    bestReviewNoteCandidate?: string | null;
    bestExclusionCandidate?: string | null;
  };
}

interface ValidationRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  actualAction: ResearchAction;
  prediction: Prediction;
  matchedCandidate: string | null;
  correct: boolean | null;
}

export interface RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_unresolved_separator_validation';
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
    separatorMinerPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    scannerOwnedFieldsOnly: true;
    validationOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  candidates: {
    reviewNoteCandidate: string | null;
    exclusionCandidate: string | null;
  };
  summary: {
    rows: number;
    classifiedRows: number;
    unclassifiedRows: number;
    correctClassifiedRows: number;
    falseReviewRows: number;
    falseExclusionRows: number;
    coverageShare: number;
    classifiedAccuracyShare: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'keep_research_only_low_coverage' | 'validate_on_broader_history' | 'fix_inputs';
  };
  rows: ValidationRow[];
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseCandidate(candidate: string | null | undefined): { field: string; value: string } | null {
  if (!candidate) return null;
  const index = candidate.indexOf('=');
  if (index <= 0) return null;
  return { field: candidate.slice(0, index), value: candidate.slice(index + 1) };
}

function matches(row: DrilldownRow, candidate: { field: string; value: string } | null): boolean {
  return Boolean(candidate && row.scannerFields?.[candidate.field] === candidate.value);
}

function predict(row: DrilldownRow, reviewCandidate: { field: string; value: string } | null, exclusionCandidate: { field: string; value: string } | null): Pick<ValidationRow, 'prediction' | 'matchedCandidate'> {
  const reviewMatch = matches(row, reviewCandidate);
  const exclusionMatch = matches(row, exclusionCandidate);
  if (reviewMatch && !exclusionMatch) return { prediction: 'predicted_review_note', matchedCandidate: `${reviewCandidate?.field}=${reviewCandidate?.value}` };
  if (exclusionMatch && !reviewMatch) return { prediction: 'predicted_exclusion', matchedCandidate: `${exclusionCandidate?.field}=${exclusionCandidate?.value}` };
  return { prediction: 'unclassified', matchedCandidate: null };
}

function isCorrect(row: Pick<ValidationRow, 'prediction' | 'actualAction'>): boolean | null {
  if (row.prediction === 'unclassified') return null;
  if (row.prediction === 'predicted_review_note') return row.actualAction === 'keep_as_unresolved_review_note';
  return row.actualAction === 'exclude_from_positive_rank_training';
}

function authority(): RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch SHORT Unresolved Separator Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report separator validation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Rows: ${report.summary.rows}.`,
    `- Classified/unclassified: ${report.summary.classifiedRows}/${report.summary.unclassifiedRows}.`,
    `- Correct classified rows: ${report.summary.correctClassifiedRows}.`,
    `- False review / false exclusion rows: ${report.summary.falseReviewRows}/${report.summary.falseExclusionRows}.`,
    `- Coverage / classified accuracy: ${report.summary.coverageShare}/${report.summary.classifiedAccuracyShare ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport(args: {
  reportDir?: string;
  unresolvedDrilldownPath?: string | null;
  separatorMinerPath?: string | null;
  unresolvedDrilldown?: DrilldownReport | null;
  separatorMiner?: SeparatorMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const unresolvedDrilldownPath = args.unresolvedDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-slate-drilldown-');
  const separatorMinerPath = args.separatorMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-separator-miner-');
  const unresolvedDrilldown = args.unresolvedDrilldown ?? readJson<DrilldownReport>(unresolvedDrilldownPath);
  const separatorMiner = args.separatorMiner ?? readJson<SeparatorMinerReport>(separatorMinerPath);
  const reviewNoteCandidate = separatorMiner?.summary?.bestReviewNoteCandidate || null;
  const exclusionCandidate = separatorMiner?.summary?.bestExclusionCandidate || null;
  const review = parseCandidate(reviewNoteCandidate);
  const exclusion = parseCandidate(exclusionCandidate);
  const rows = (unresolvedDrilldown?.rows || []).map((row) => {
    const prediction = predict(row, review, exclusion);
    const validationRow: ValidationRow = {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      proofTime: row.proofTime,
      actualAction: row.researchAction,
      prediction: prediction.prediction,
      matchedCandidate: prediction.matchedCandidate,
      correct: null,
    };
    return { ...validationRow, correct: isCorrect(validationRow) };
  });
  const classified = rows.filter((row) => row.prediction !== 'unclassified');
  const correctClassifiedRows = classified.filter((row) => row.correct === true).length;
  const falseReviewRows = rows.filter((row) => row.prediction === 'predicted_review_note' && row.actualAction !== 'keep_as_unresolved_review_note').length;
  const falseExclusionRows = rows.filter((row) => row.prediction === 'predicted_exclusion' && row.actualAction !== 'exclude_from_positive_rank_training').length;
  const blockers = [
    !unresolvedDrilldownPath && !args.unresolvedDrilldown ? 'missing unresolved drilldown path' : null,
    !separatorMinerPath && !args.separatorMiner ? 'missing separator miner path' : null,
    !unresolvedDrilldown ? 'missing unresolved drilldown report' : null,
    !separatorMiner ? 'missing separator miner report' : null,
    unresolvedDrilldown && unresolvedDrilldown.status !== 'pass' ? `unresolved drilldown status ${unresolvedDrilldown.status}` : null,
    separatorMiner && separatorMiner.status !== 'pass' ? `separator miner status ${separatorMiner.status}` : null,
    !review ? 'missing parseable review-note candidate' : null,
    !exclusion ? 'missing parseable exclusion candidate' : null,
    rows.length === 0 ? 'no unresolved rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const coverageShare = rows.length ? round(classified.length / rows.length) : 0;
  const classifiedAccuracyShare = classified.length ? round(correctClassifiedRows / classified.length) : null;
  const highQualityButThin = !blockers.length && falseReviewRows === 0 && falseExclusionRows === 0 && coverageShare < 0.5;
  const base: Omit<RawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_unresolved_separator_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, unresolvedDrilldownPath, separatorMinerPath },
    assumptions: {
      savedReportsOnly: true,
      scannerOwnedFieldsOnly: true,
      validationOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    candidates: { reviewNoteCandidate, exclusionCandidate },
    summary: {
      rows: rows.length,
      classifiedRows: classified.length,
      unclassifiedRows: rows.length - classified.length,
      correctClassifiedRows,
      falseReviewRows,
      falseExclusionRows,
      coverageShare,
      classifiedAccuracyShare,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : highQualityButThin ? 'keep_research_only_low_coverage' : 'validate_on_broader_history',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved unresolved drilldown/separator miner inputs before validation.']
      : highQualityButThin
        ? ['Keep the candidates research-only because coverage is too low for a scanner-visible proposal.']
        : ['Validate candidates on broader history before any scanner-visible behavior proposal.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport({
    reportDir,
    unresolvedDrilldownPath: readFlag(args, '--unresolved-drilldown') || undefined,
    separatorMinerPath: readFlag(args, '--separator-miner') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-separator-validation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, candidates: report.candidates, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
