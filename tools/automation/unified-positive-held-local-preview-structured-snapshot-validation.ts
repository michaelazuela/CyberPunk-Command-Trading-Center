import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport,
} from './unified-positive-held-local-preview-structured-snapshot-classifier';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';

type SnapshotRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['rows'][number];
type ClassifierRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport['classifiers'][number];

interface BucketSummary {
  bucketId: string;
  classifierId: string;
  bucket: 'kept' | 'rejected';
  session: string;
  tradeDate: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
}

interface ClassifierValidation {
  classifierId: string;
  setupType: string;
  featureName: string;
  featureValue: string;
  keptRows: number;
  rejectedRows: number;
  keptWinners: number;
  keptLosses: number;
  keptUnresolved: number;
  rejectedWinners: number;
  rejectedLosses: number;
  rejectedUnresolved: number;
  keptOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  keptSessionsPositive: number;
  keptSessionsNegative: number;
  rejectedSessionsPositive: number;
  rejectedSessionsNegative: number;
  decision: 'candidate_for_broader_replay_validation' | 'reject_for_now';
  reason: string;
}

export interface UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_validation';
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
    structuredSnapshotClassifierPath: string | null;
    structuredSnapshotMinerPath: string | null;
  };
  assumptions: {
    validatesAcceptedResearchClassifiersOnly: true;
    usesRetrospectiveOutcomeOnlyForReporting: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    acceptedClassifiersRead: number;
    validatedClassifiers: number;
    candidatesForBroaderReplayValidation: number;
    bucketSummaries: number;
    livePromotionAllowedRows: 0;
  };
  validations: ClassifierValidation[];
  buckets: BucketSummary[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport['authority'] {
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

function tradeDate(row: SnapshotRow): string {
  return /^\d{4}-\d{2}-\d{2}/.test(row.rowId) ? row.rowId.slice(0, 10) : 'unknown';
}

function featureValue(row: SnapshotRow, featureName: string): string {
  const values: Record<string, string> = {
    selectedMatchesReviewedModel: String(row.selectedMatchesReviewedModel),
    modelCandidateExecutionStatus: row.modelCandidateExecutionStatus ?? 'unknown',
    modelCandidateVisibilityMode: row.modelCandidateVisibilityMode ?? 'unknown',
    modelCandidateFilteredOutReason: row.modelCandidateFilteredOutReason ?? 'none',
    modelCandidateHasFullPlanLevels: String(row.modelCandidateHasFullPlanLevels ?? 'unknown'),
    fvgRetestEvidence: String(row.fvgRetestEvidence),
    noChaseEvidence: String(row.noChaseEvidence),
    protectedStopEvidence: String(row.protectedStopEvidence),
    targetRoomEvidence: String(row.targetRoomEvidence),
    entryTriggerPendingEvidence: String(row.entryTriggerPendingEvidence),
    staleEvidence: String(row.staleEvidence),
    htfFiveMinuteTriggerConfirmed: String(row.htfFiveMinuteTriggerConfirmed ?? 'unknown'),
    scorecardWeakCount: String(row.scorecardWeakCount),
    scorecardStrongCount: String(row.scorecardStrongCount),
    state_stop: `${row.modelCandidateExecutionStatus ?? 'unknown'}_${row.protectedStopEvidence}`,
    stop_trigger: `${row.protectedStopEvidence}_${row.entryTriggerPendingEvidence}`,
    stop_fullPlan: `${row.protectedStopEvidence}_${row.modelCandidateHasFullPlanLevels ?? 'unknown'}`,
    weak_stop: `${row.scorecardWeakCount}_${row.protectedStopEvidence}`,
  };
  return values[featureName] ?? 'unsupported';
}

function summarizeBucket(classifier: ClassifierRow, bucket: BucketSummary['bucket'], rows: SnapshotRow[]): BucketSummary[] {
  const groups = new Map<string, SnapshotRow[]>();
  for (const row of rows) {
    const key = `${row.session}|${tradeDate(row)}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, group]) => {
    const [session, date] = key.split('|');
    return {
      bucketId: `${classifier.classifierId}|${bucket}|${session}|${date}`,
      classifierId: classifier.classifierId,
      bucket,
      session,
      tradeDate: date,
      rows: group.length,
      winners: group.filter((row) => row.outcomeBucket === 'winner').length,
      losses: group.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: group.filter((row) => row.outcomeBucket === 'unresolved').length,
      oneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
    };
  });
}

function validateClassifier(classifier: ClassifierRow, rows: SnapshotRow[]): { validation: ClassifierValidation; buckets: BucketSummary[] } {
  const setupRows = rows.filter((row) => row.setupType === classifier.setupType);
  const kept = setupRows.filter((row) => featureValue(row, classifier.featureName) === classifier.featureValue);
  const rejected = setupRows.filter((row) => !kept.includes(row));
  const buckets = [
    ...summarizeBucket(classifier, 'kept', kept),
    ...summarizeBucket(classifier, 'rejected', rejected),
  ];
  const keptSessionBuckets = buckets.filter((bucket) => bucket.bucket === 'kept' && bucket.oneMesPl !== null);
  const rejectedSessionBuckets = buckets.filter((bucket) => bucket.bucket === 'rejected' && bucket.oneMesPl !== null);
  const keptWinners = kept.filter((row) => row.outcomeBucket === 'winner').length;
  const keptLosses = kept.filter((row) => row.outcomeBucket === 'loss').length;
  const rejectedLosses = rejected.filter((row) => row.outcomeBucket === 'loss').length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const rejectedOneMesPl = sum(rejected.map((row) => row.resolvedOneMesPl));
  const keptSessionsPositive = keptSessionBuckets.filter((bucket) => (bucket.oneMesPl ?? 0) > 0).length;
  const keptSessionsNegative = keptSessionBuckets.filter((bucket) => (bucket.oneMesPl ?? 0) < 0).length;
  const rejectedSessionsNegative = rejectedSessionBuckets.filter((bucket) => (bucket.oneMesPl ?? 0) < 0).length;
  const candidate = keptWinners > keptLosses &&
    rejectedLosses >= keptLosses &&
    (keptOneMesPl ?? 0) > 0 &&
    (rejectedOneMesPl ?? 0) < 0 &&
    keptSessionsPositive >= keptSessionsNegative;
  return {
    validation: {
      classifierId: classifier.classifierId,
      setupType: classifier.setupType,
      featureName: classifier.featureName,
      featureValue: classifier.featureValue,
      keptRows: kept.length,
      rejectedRows: rejected.length,
      keptWinners,
      keptLosses,
      keptUnresolved: kept.filter((row) => row.outcomeBucket === 'unresolved').length,
      rejectedWinners: rejected.filter((row) => row.outcomeBucket === 'winner').length,
      rejectedLosses,
      rejectedUnresolved: rejected.filter((row) => row.outcomeBucket === 'unresolved').length,
      keptOneMesPl,
      rejectedOneMesPl,
      keptSessionsPositive,
      keptSessionsNegative,
      rejectedSessionsPositive: rejectedSessionBuckets.filter((bucket) => (bucket.oneMesPl ?? 0) > 0).length,
      rejectedSessionsNegative,
      decision: candidate ? 'candidate_for_broader_replay_validation' : 'reject_for_now',
      reason: candidate
        ? 'Kept bucket remains positive while rejected bucket is negative across session/day summary.'
        : 'Session/day validation did not preserve a clean enough kept-vs-rejected split.',
    },
    buckets,
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Structured Snapshot Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation of accepted research classifiers. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Accepted classifiers read: ${report.summary.acceptedClassifiersRead}.`,
    `- Validated classifiers: ${report.summary.validatedClassifiers}.`,
    `- Candidates for broader replay validation: ${report.summary.candidatesForBroaderReplayValidation}.`,
    `- Bucket summaries: ${report.summary.bucketSummaries}.`,
    '',
    '## Validations',
    '| Decision | Classifier | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | Kept +/- sessions | Rejected +/- sessions |',
    '|---|---|---|---|---:|---:|---|---|',
    ...report.validations.map((row) => `| ${row.decision} | ${escapeTable(row.classifierId)} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.keptSessionsPositive}/${row.keptSessionsNegative} | ${row.rejectedSessionsPositive}/${row.rejectedSessionsNegative} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport(args: {
  reportDir: string;
  structuredSnapshotClassifierPath: string | null;
  structuredSnapshotClassifierReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport | null;
  structuredSnapshotMinerPath: string | null;
  structuredSnapshotMinerReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport {
  const rows = args.structuredSnapshotMinerReport?.rows || [];
  const accepted = (args.structuredSnapshotClassifierReport?.classifiers || []).filter((row) => row.decision === 'candidate_for_more_research');
  const validationResults = accepted.map((classifier) => validateClassifier(classifier, rows));
  const validations = validationResults.map((result) => result.validation);
  const buckets = validationResults.flatMap((result) => result.buckets);
  const blockers = [
    !args.structuredSnapshotClassifierPath ? 'missing structured snapshot classifier path' : null,
    !args.structuredSnapshotClassifierReport ? 'missing structured snapshot classifier report' : null,
    args.structuredSnapshotClassifierReport && args.structuredSnapshotClassifierReport.status !== 'pass' ? `structured snapshot classifier status ${args.structuredSnapshotClassifierReport.status}` : null,
    !args.structuredSnapshotMinerPath ? 'missing structured snapshot miner path' : null,
    !args.structuredSnapshotMinerReport ? 'missing structured snapshot miner report' : null,
    args.structuredSnapshotMinerReport && args.structuredSnapshotMinerReport.status !== 'pass' ? `structured snapshot miner status ${args.structuredSnapshotMinerReport.status}` : null,
    rows.length === 0 ? 'no structured snapshot source rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const candidateCount = validations.filter((row) => row.decision === 'candidate_for_broader_replay_validation').length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_structured_snapshot_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      structuredSnapshotClassifierPath: args.structuredSnapshotClassifierPath,
      structuredSnapshotMinerPath: args.structuredSnapshotMinerPath,
    },
    assumptions: {
      validatesAcceptedResearchClassifiersOnly: true,
      usesRetrospectiveOutcomeOnlyForReporting: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      acceptedClassifiersRead: accepted.length,
      validatedClassifiers: validations.length,
      candidatesForBroaderReplayValidation: candidateCount,
      bucketSummaries: buckets.length,
      livePromotionAllowedRows: 0,
    },
    validations,
    buckets,
    blockers,
    recommendations: blockers.length
      ? ['Do not use validation output until classifier and miner source reports are present and passing.']
      : candidateCount
        ? [
          'Promote only the candidate validation questions into a broader replay package; do not install live filters from this diagnostic.',
          'Keep historicalReview enabled while validating whether blocked protected-stop states should be ranked lower or held for stricter review.',
        ]
        : ['No accepted classifier survived session/day validation; add more reviewed rows before any scanner-visible change.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport(
  report: UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-structured-snapshot-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const structuredSnapshotClassifierPath = readFlag(args, '--structured-snapshot-classifier') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structured-snapshot-classifier-\d+\.json$/);
  const structuredSnapshotMinerPath = readFlag(args, '--structured-snapshot-miner') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structured-snapshot-miner-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport({
    reportDir: outDir,
    structuredSnapshotClassifierPath,
    structuredSnapshotClassifierReport: structuredSnapshotClassifierPath && fs.existsSync(structuredSnapshotClassifierPath)
      ? JSON.parse(fs.readFileSync(structuredSnapshotClassifierPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport
      : null,
    structuredSnapshotMinerPath,
    structuredSnapshotMinerReport: structuredSnapshotMinerPath && fs.existsSync(structuredSnapshotMinerPath)
      ? JSON.parse(fs.readFileSync(structuredSnapshotMinerPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
