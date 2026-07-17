import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-broad-proof-context-enrichment';

type EnrichedRow = UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport['rows'][number];

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

export interface UnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport {
  reportType: 'unified_positive_held_local_preview_preentry_adverse_path_classifier';
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
    proofContextEnrichmentPath: string | null;
  };
  assumptions: {
    usesPreentryFactsOnly: true;
    excludesMfeMaeAndOutcomePathFromFeatures: true;
    classifierIsResearchOnly: true;
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

function authority(): UnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport['authority'] {
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

function riskBucket(points: number): string {
  if (points <= 7) return 'risk_lte_7';
  if (points <= 10) return 'risk_7_to_10';
  if (points <= 15) return 'risk_10_to_15';
  return 'risk_gt_15';
}

function occurrenceBucket(occurrences: number | null): string {
  if (occurrences === null) return 'occurrences_unknown';
  if (occurrences <= 1) return 'occurrences_1';
  if (occurrences <= 5) return 'occurrences_2_to_5';
  if (occurrences <= 15) return 'occurrences_6_to_15';
  return 'occurrences_gt_15';
}

function proofToEntryBucket(minutes: number | null): string {
  if (minutes === null) return 'entry_unfilled';
  if (minutes === 0) return 'entry_same_bar';
  if (minutes <= 10) return 'entry_1_to_10m';
  if (minutes <= 30) return 'entry_11_to_30m';
  return 'entry_gt_30m';
}

function featureValues(row: EnrichedRow): Array<{ name: string; value: string }> {
  const risk = riskBucket(row.riskPoints);
  const proofState = row.proofState || 'proof_unknown';
  const riskQuality = row.riskQuality || 'risk_quality_unknown';
  const entryBucket = proofToEntryBucket(row.proofToEntryMinutes);
  return [
    { name: 'session', value: row.session },
    { name: 'direction', value: row.direction },
    { name: 'proofState', value: proofState },
    { name: 'riskQuality', value: riskQuality },
    { name: 'riskBucket', value: risk },
    { name: 'occurrenceBucket', value: occurrenceBucket(row.occurrences) },
    { name: 'proofToEntryBucket', value: entryBucket },
    { name: 'session_direction', value: `${row.session}_${row.direction}` },
    { name: 'session_entryBucket', value: `${row.session}_${entryBucket}` },
    { name: 'direction_entryBucket', value: `${row.direction}_${entryBucket}` },
    { name: 'proof_riskQuality', value: `${proofState}_${riskQuality}` },
    { name: 'proof_entryBucket', value: `${proofState}_${entryBucket}` },
    { name: 'risk_entryBucket', value: `${risk}_${entryBucket}` },
  ];
}

function buildClassifier(setupType: string, featureName: string, featureValue: string, setupRows: EnrichedRow[]): ClassifierRow {
  const kept = setupRows.filter((row) => featureValues(row).some((feature) => feature.name === featureName && feature.value === featureValue));
  const rejected = setupRows.filter((row) => !kept.includes(row));
  const keptWinners = kept.filter((row) => row.outcomeBucket === 'winner').length;
  const keptLosses = kept.filter((row) => row.outcomeBucket === 'loss').length;
  const rejectedWinners = rejected.filter((row) => row.outcomeBucket === 'winner').length;
  const rejectedLosses = rejected.filter((row) => row.outcomeBucket === 'loss').length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const score = round((keptOneMesPl ?? 0) + (rejectedLosses * 12) - (rejectedWinners * 40) - (keptLosses * 10));
  const decision = kept.length < setupRows.length &&
    keptWinners >= 3 &&
    rejectedWinners <= 2 &&
    keptLosses <= keptWinners &&
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

function buildClassifiers(rows: EnrichedRow[]): ClassifierRow[] {
  const bySetup = new Map<string, EnrichedRow[]>();
  for (const row of rows) bySetup.set(row.setupType, [...(bySetup.get(row.setupType) || []), row]);
  const classifiers: ClassifierRow[] = [];
  for (const [setupType, setupRows] of bySetup.entries()) {
    const seen = new Set<string>();
    for (const row of setupRows) {
      for (const feature of featureValues(row)) {
        const key = `${feature.name}|${feature.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        classifiers.push(buildClassifier(setupType, feature.name, feature.value, setupRows));
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Pre-Entry Adverse-Path Classifier',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only pre-entry classifier search. Features exclude MFE, MAE, and future path evidence. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
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

export function buildUnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport(args: {
  reportDir: string;
  proofContextEnrichmentPath: string | null;
  proofContextEnrichmentReport: UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport {
  const sourceRows = args.proofContextEnrichmentReport?.rows || [];
  const classifiers = buildClassifiers(sourceRows).slice(0, 120);
  const accepted = classifiers.filter((row) => row.decision === 'candidate_for_more_research');
  const blockers = [
    !args.proofContextEnrichmentPath ? 'missing proof/context enrichment path' : null,
    !args.proofContextEnrichmentReport ? 'missing proof/context enrichment report' : null,
    args.proofContextEnrichmentReport && args.proofContextEnrichmentReport.status !== 'pass' ? `proof/context enrichment status ${args.proofContextEnrichmentReport.status}` : null,
    sourceRows.length === 0 ? 'no enrichment source rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_preentry_adverse_path_classifier',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      proofContextEnrichmentPath: args.proofContextEnrichmentPath,
    },
    assumptions: {
      usesPreentryFactsOnly: true,
      excludesMfeMaeAndOutcomePathFromFeatures: true,
      classifierIsResearchOnly: true,
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
      ? ['Do not use classifier output until proof/context enrichment loads cleanly.']
      : accepted.length
        ? ['Treat accepted classifiers only as research leads. Validate on a fresh package before any scanner-visible behavior change.']
        : ['No pre-entry classifier was strong enough. Continue mining richer pre-entry proof/context facts rather than using post-entry MFE/MAE as a live filter.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport(
  report: UnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-preentry-adverse-path-classifier-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const proofContextEnrichmentPath = readFlag(args, '--proof-context-enrichment') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-broad-proof-context-enrichment-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport({
    reportDir: outDir,
    proofContextEnrichmentPath,
    proofContextEnrichmentReport: proofContextEnrichmentPath && fs.existsSync(proofContextEnrichmentPath)
      ? JSON.parse(fs.readFileSync(proofContextEnrichmentPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewPreentryAdversePathClassifierCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
