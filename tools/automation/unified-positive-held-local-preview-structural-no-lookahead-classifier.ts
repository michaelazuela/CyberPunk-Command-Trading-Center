import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport,
} from './unified-positive-held-local-preview-structural-field-inventory';

type StructuralRow = UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport['rows'][number];

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

export interface UnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport {
  reportType: 'unified_positive_held_local_preview_structural_no_lookahead_classifier';
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
    structuralFieldInventoryPath: string | null;
  };
  assumptions: {
    usesProofTimeStructuralFieldsOnly: true;
    excludesUniformAndUnknownFields: true;
    excludesFuturePathEvidence: true;
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

function authority(): UnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport['authority'] {
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

function featureValues(row: StructuralRow): Array<{ name: string; value: string }> {
  return [
    { name: 'confidenceBucket', value: row.confidenceBucket },
    { name: 'mentionsFvg', value: String(row.mentionsFvg) },
    { name: 'mentionsRetest', value: String(row.mentionsRetest) },
    { name: 'mentionsMss', value: String(row.mentionsMss) },
    { name: 'mentionsNoChase', value: String(row.mentionsNoChase) },
    { name: 'hasProtectedStopBlocker', value: String(row.hasProtectedStopBlocker) },
    { name: 'hasTargetRoomBlocker', value: String(row.hasTargetRoomBlocker) },
    { name: 'hasEntryTriggerPending', value: String(row.hasEntryTriggerPending) },
    { name: 'hasStaleInvalidation', value: String(row.hasStaleInvalidation) },
    { name: 'fvg_retest', value: `${row.mentionsFvg}_${row.mentionsRetest}` },
    { name: 'mss_entryPending', value: `${row.mentionsMss}_${row.hasEntryTriggerPending}` },
    { name: 'noChase_stale', value: `${row.mentionsNoChase}_${row.hasStaleInvalidation}` },
    { name: 'proofBlockers', value: `${row.hasProtectedStopBlocker}_${row.hasTargetRoomBlocker}_${row.hasEntryTriggerPending}` },
  ].filter((feature) => !/unknown/i.test(feature.value));
}

function buildClassifier(setupType: string, featureName: string, featureValue: string, setupRows: StructuralRow[]): ClassifierRow | null {
  const kept = setupRows.filter((row) => featureValues(row).some((feature) => feature.name === featureName && feature.value === featureValue));
  const rejected = setupRows.filter((row) => !kept.includes(row));
  if (kept.length === 0 || rejected.length === 0) return null;
  const keptWinners = kept.filter((row) => row.outcomeBucket === 'winner').length;
  const keptLosses = kept.filter((row) => row.outcomeBucket === 'loss').length;
  const rejectedWinners = rejected.filter((row) => row.outcomeBucket === 'winner').length;
  const rejectedLosses = rejected.filter((row) => row.outcomeBucket === 'loss').length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const score = round((keptOneMesPl ?? 0) + (rejectedLosses * 12) - (rejectedWinners * 45) - (keptLosses * 10));
  const decision = keptWinners >= 3 &&
    keptLosses <= keptWinners &&
    rejectedWinners <= 2 &&
    rejectedLosses > 0 &&
    (keptOneMesPl ?? 0) > 0
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
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    falseRejectWinnerRows: rejectedWinners,
    score,
    decision,
  };
}

function buildClassifiers(rows: StructuralRow[]): ClassifierRow[] {
  const bySetup = new Map<string, StructuralRow[]>();
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Structural No-Lookahead Classifier',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only structural classifier. Features use proof-time structural inventory only and exclude future path evidence. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
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
    ...report.classifiers.slice(0, 60).map((row) => `| ${row.decision} | ${escapeTable(`${row.featureName}=${row.featureValue}`)} | ${escapeTable(row.setupType)} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.falseRejectWinnerRows} | ${row.score} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport(args: {
  reportDir: string;
  structuralFieldInventoryPath: string | null;
  structuralFieldInventoryReport: UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport {
  const sourceRows = args.structuralFieldInventoryReport?.rows || [];
  const classifiers = buildClassifiers(sourceRows).slice(0, 120);
  const accepted = classifiers.filter((row) => row.decision === 'candidate_for_more_research');
  const blockers = [
    !args.structuralFieldInventoryPath ? 'missing structural field inventory path' : null,
    !args.structuralFieldInventoryReport ? 'missing structural field inventory report' : null,
    args.structuralFieldInventoryReport && args.structuralFieldInventoryReport.status !== 'pass' ? `structural field inventory status ${args.structuralFieldInventoryReport.status}` : null,
    sourceRows.length === 0 ? 'no structural inventory source rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_structural_no_lookahead_classifier',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      structuralFieldInventoryPath: args.structuralFieldInventoryPath,
    },
    assumptions: {
      usesProofTimeStructuralFieldsOnly: true,
      excludesUniformAndUnknownFields: true,
      excludesFuturePathEvidence: true,
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
      ? ['Do not use classifier output until structural inventory loads cleanly.']
      : accepted.length
        ? ['Treat accepted structural classifiers only as research leads. Validate on a fresh replay package before any scanner-visible behavior change.']
        : ['No structural no-lookahead classifier was strong enough. Mine deeper structured object fields rather than installing a live rank/filter change.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport(
  report: UnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-structural-no-lookahead-classifier-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const structuralFieldInventoryPath = readFlag(args, '--structural-field-inventory') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structural-field-inventory-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport({
    reportDir: outDir,
    structuralFieldInventoryPath,
    structuralFieldInventoryReport: structuralFieldInventoryPath && fs.existsSync(structuralFieldInventoryPath)
      ? JSON.parse(fs.readFileSync(structuralFieldInventoryPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewStructuralNoLookaheadClassifierCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
