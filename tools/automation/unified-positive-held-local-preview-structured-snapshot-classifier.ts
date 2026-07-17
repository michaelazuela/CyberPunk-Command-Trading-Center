import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';

type SnapshotRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['rows'][number];

interface ClassifierRow {
  classifierId: string;
  setupType: string;
  featureName: string;
  featureValue: string;
  evaluatedRows: number;
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
  falseRejectWinnerRows: number;
  score: number;
  decision: 'candidate_for_more_research' | 'rejected_for_now';
}

export interface UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_classifier';
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
    structuredSnapshotMinerPath: string | null;
  };
  assumptions: {
    usesProofTimeStructuredSnapshotFieldsOnly: true;
    excludesFuturePathEvidenceAsFeatures: true;
    candidatesAreNotLiveFilters: true;
    unresolvedRowsAreNotWinsOrLosses: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    classifiersEvaluated: number;
    acceptedClassifiers: number;
    rejectedClassifiers: number;
    topClassifierId: string | null;
    livePromotionAllowedRows: 0;
  };
  classifiers: ClassifierRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport['authority'] {
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

function featureValues(row: SnapshotRow): Array<{ name: string; value: string }> {
  return [
    { name: 'selectedMatchesReviewedModel', value: String(row.selectedMatchesReviewedModel) },
    { name: 'modelCandidateExecutionStatus', value: row.modelCandidateExecutionStatus ?? 'unknown' },
    { name: 'modelCandidateVisibilityMode', value: row.modelCandidateVisibilityMode ?? 'unknown' },
    { name: 'modelCandidateFilteredOutReason', value: row.modelCandidateFilteredOutReason ?? 'none' },
    { name: 'modelCandidateHasFullPlanLevels', value: String(row.modelCandidateHasFullPlanLevels ?? 'unknown') },
    { name: 'fvgRetestEvidence', value: String(row.fvgRetestEvidence) },
    { name: 'noChaseEvidence', value: String(row.noChaseEvidence) },
    { name: 'protectedStopEvidence', value: String(row.protectedStopEvidence) },
    { name: 'targetRoomEvidence', value: String(row.targetRoomEvidence) },
    { name: 'entryTriggerPendingEvidence', value: String(row.entryTriggerPendingEvidence) },
    { name: 'staleEvidence', value: String(row.staleEvidence) },
    { name: 'htfFiveMinuteTriggerConfirmed', value: String(row.htfFiveMinuteTriggerConfirmed ?? 'unknown') },
    { name: 'scorecardWeakCount', value: String(row.scorecardWeakCount) },
    { name: 'scorecardStrongCount', value: String(row.scorecardStrongCount) },
    { name: 'state_stop', value: `${row.modelCandidateExecutionStatus ?? 'unknown'}_${row.protectedStopEvidence}` },
    { name: 'stop_trigger', value: `${row.protectedStopEvidence}_${row.entryTriggerPendingEvidence}` },
    { name: 'stop_fullPlan', value: `${row.protectedStopEvidence}_${row.modelCandidateHasFullPlanLevels ?? 'unknown'}` },
    { name: 'weak_stop', value: `${row.scorecardWeakCount}_${row.protectedStopEvidence}` },
  ].filter((feature) => !/unknown/i.test(feature.value));
}

function buildClassifier(setupType: string, featureName: string, featureValue: string, setupRows: SnapshotRow[]): ClassifierRow | null {
  const kept = setupRows.filter((row) => featureValues(row).some((feature) => feature.name === featureName && feature.value === featureValue));
  const rejected = setupRows.filter((row) => !kept.includes(row));
  if (kept.length === 0 || rejected.length === 0) return null;
  const keptWinners = kept.filter((row) => row.outcomeBucket === 'winner').length;
  const keptLosses = kept.filter((row) => row.outcomeBucket === 'loss').length;
  const rejectedWinners = rejected.filter((row) => row.outcomeBucket === 'winner').length;
  const rejectedLosses = rejected.filter((row) => row.outcomeBucket === 'loss').length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const rejectedOneMesPl = sum(rejected.map((row) => row.resolvedOneMesPl));
  const score = round((keptOneMesPl ?? 0) + (rejectedLosses * 20) - (rejectedWinners * 55) - (keptLosses * 8));
  const decision = keptWinners >= 10 &&
    keptLosses < keptWinners &&
    (keptWinners - keptLosses) >= 10 &&
    rejectedLosses >= 5 &&
    rejectedWinners <= keptWinners &&
    (keptOneMesPl ?? 0) > 0 &&
    (rejectedOneMesPl ?? 0) < (keptOneMesPl ?? 0)
    ? 'candidate_for_more_research'
    : 'rejected_for_now';
  return {
    classifierId: `${setupType}_${featureName}_${featureValue}`,
    setupType,
    featureName,
    featureValue,
    evaluatedRows: setupRows.length,
    keptRows: kept.length,
    rejectedRows: rejected.length,
    keptWinners,
    keptLosses,
    keptUnresolved: kept.filter((row) => row.outcomeBucket === 'unresolved').length,
    rejectedWinners,
    rejectedLosses,
    rejectedUnresolved: rejected.filter((row) => row.outcomeBucket === 'unresolved').length,
    keptOneMesPl,
    rejectedOneMesPl,
    falseRejectWinnerRows: rejectedWinners,
    score,
    decision,
  };
}

function buildClassifiers(rows: SnapshotRow[]): ClassifierRow[] {
  const bySetup = new Map<string, SnapshotRow[]>();
  for (const row of rows) bySetup.set(row.setupType, [...(bySetup.get(row.setupType) || []), row]);
  const classifiers: ClassifierRow[] = [];
  for (const [setupType, setupRows] of bySetup.entries()) {
    const seen = new Set<string>();
    for (const row of setupRows) {
      for (const feature of featureValues(row)) {
        const key = `${feature.name}|${feature.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const classifier = buildClassifier(setupType, feature.name, feature.value, setupRows);
        if (classifier) classifiers.push(classifier);
      }
    }
  }
  return classifiers.sort((a, b) => {
    if (a.decision !== b.decision) return a.decision === 'candidate_for_more_research' ? -1 : 1;
    return b.score - a.score || a.falseRejectWinnerRows - b.falseRejectWinnerRows || b.keptRows - a.keptRows;
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Structured Snapshot Classifier',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only no-lookahead classifier over proof-time structured snapshot fields. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Classifiers evaluated: ${report.summary.classifiersEvaluated}.`,
    `- Accepted classifiers: ${report.summary.acceptedClassifiers}.`,
    `- Rejected classifiers: ${report.summary.rejectedClassifiers}.`,
    `- Top classifier: ${report.summary.topClassifierId ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Top Classifiers',
    '| Decision | Feature | Setup | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | False-Reject Winners | Score |',
    '|---|---|---|---|---|---:|---:|---:|---:|',
    ...report.classifiers.slice(0, 80).map((row) => `| ${row.decision} | ${escapeTable(`${row.featureName}=${row.featureValue}`)} | ${escapeTable(row.setupType)} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.falseRejectWinnerRows} | ${row.score} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport(args: {
  reportDir: string;
  structuredSnapshotMinerPath: string | null;
  structuredSnapshotMinerReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport {
  const sourceRows = args.structuredSnapshotMinerReport?.rows || [];
  const classifiers = buildClassifiers(sourceRows).slice(0, 160);
  const accepted = classifiers.filter((row) => row.decision === 'candidate_for_more_research');
  const blockers = [
    !args.structuredSnapshotMinerPath ? 'missing structured snapshot miner path' : null,
    !args.structuredSnapshotMinerReport ? 'missing structured snapshot miner report' : null,
    args.structuredSnapshotMinerReport && args.structuredSnapshotMinerReport.status !== 'pass' ? `structured snapshot miner status ${args.structuredSnapshotMinerReport.status}` : null,
    sourceRows.length === 0 ? 'no structured snapshot source rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_structured_snapshot_classifier',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      structuredSnapshotMinerPath: args.structuredSnapshotMinerPath,
    },
    assumptions: {
      usesProofTimeStructuredSnapshotFieldsOnly: true,
      excludesFuturePathEvidenceAsFeatures: true,
      candidatesAreNotLiveFilters: true,
      unresolvedRowsAreNotWinsOrLosses: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      classifiersEvaluated: classifiers.length,
      acceptedClassifiers: accepted.length,
      rejectedClassifiers: classifiers.length - accepted.length,
      topClassifierId: accepted[0]?.classifierId || null,
      livePromotionAllowedRows: 0,
    },
    classifiers,
    blockers,
    recommendations: blockers.length
      ? ['Do not use structured snapshot classifiers until the miner source report is complete and passing.']
      : accepted.length
        ? [
          'Treat accepted classifiers as research candidates only; validate against a broader replay package before scanner-visible behavior changes.',
          'Do not change canExecute, entry/stop/target/risk, Discord posting, Supabase writes, or scanner ranking from this phase alone.',
        ]
        : [
          'No structured snapshot classifier met the conservative acceptance gate.',
          'Mine deeper candidate geometry or add more reviewed rows before considering scanner-visible behavior.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport(
  report: UnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-structured-snapshot-classifier-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const structuredSnapshotMinerPath = readFlag(args, '--structured-snapshot-miner') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structured-snapshot-miner-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport({
    reportDir: outDir,
    structuredSnapshotMinerPath,
    structuredSnapshotMinerReport: structuredSnapshotMinerPath && fs.existsSync(structuredSnapshotMinerPath)
      ? JSON.parse(fs.readFileSync(structuredSnapshotMinerPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewStructuredSnapshotClassifierCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
