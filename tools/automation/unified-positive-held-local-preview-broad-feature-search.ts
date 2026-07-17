import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport } from './unified-positive-held-local-preview-broad-risk-cap-validation';

type BroadRow = UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport['rows'][number];

interface FeatureCandidate {
  featureId: string;
  setupType: string;
  featureName: string;
  featureValue: string;
  evaluatedRows: number;
  keptRows: number;
  rejectedRows: number;
  keptWinners: number;
  rejectedWinners: number;
  keptLosses: number;
  rejectedLosses: number;
  keptUnresolved: number;
  rejectedUnresolved: number;
  keptOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  falseRejectWinnerRows: number;
  score: number;
  decision: 'candidate_for_more_research' | 'rejected_for_now';
}

export interface UnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport {
  reportType: 'unified_positive_held_local_preview_broad_feature_search';
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
    broadRiskCapValidationPath: string | null;
  };
  assumptions: {
    featureSearchIsResearchOnly: true;
    candidatesAreNotLiveFilters: true;
    unresolvedRowsAreNotWinsOrLosses: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    featureCandidatesEvaluated: number;
    acceptedCandidates: number;
    rejectedCandidates: number;
    topCandidateId: string | null;
    livePromotionAllowedRows: 0;
  };
  candidates: FeatureCandidate[];
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

function authority(): UnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport['authority'] {
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

function featureValues(row: BroadRow): Array<{ name: string; value: string }> {
  const bucket = riskBucket(row.riskPoints);
  return [
    { name: 'session', value: row.session },
    { name: 'direction', value: row.direction },
    { name: 'triageDecision', value: row.triageDecision },
    { name: 'riskBucket', value: bucket },
    { name: 'session_direction', value: `${row.session}_${row.direction}` },
    { name: 'session_riskBucket', value: `${row.session}_${bucket}` },
    { name: 'direction_riskBucket', value: `${row.direction}_${bucket}` },
  ];
}

function isWinner(row: BroadRow): boolean {
  return row.outcomeBucket === 'winner';
}

function isLoss(row: BroadRow): boolean {
  return row.outcomeBucket === 'loss';
}

function isUnresolved(row: BroadRow): boolean {
  return row.outcomeBucket === 'unresolved';
}

function isMarketFeature(featureName: string): boolean {
  return featureName !== 'triageDecision';
}

function buildCandidate(setupType: string, featureName: string, featureValue: string, setupRows: BroadRow[]): FeatureCandidate {
  const kept = setupRows.filter((row) => featureValues(row).some((feature) => feature.name === featureName && feature.value === featureValue));
  const rejected = setupRows.filter((row) => !kept.includes(row));
  const keptWinners = kept.filter(isWinner).length;
  const keptLosses = kept.filter(isLoss).length;
  const rejectedWinners = rejected.filter(isWinner).length;
  const rejectedLosses = rejected.filter(isLoss).length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const keptRows = kept.length;
  const winRate = keptRows ? keptWinners / keptRows : 0;
  const score = round((keptOneMesPl ?? 0) + (rejectedLosses * 12) - (rejectedWinners * 35) + (winRate * 25) - (keptLosses * 8));
  const decision = isMarketFeature(featureName) &&
    keptRows < setupRows.length &&
    keptWinners >= 3 &&
    rejectedWinners <= 2 &&
    (keptOneMesPl ?? 0) > 0
    ? 'candidate_for_more_research'
    : 'rejected_for_now';
  return {
    featureId: `${setupType}_${featureName}_${featureValue}`,
    setupType,
    featureName,
    featureValue,
    evaluatedRows: setupRows.length,
    keptRows,
    rejectedRows: rejected.length,
    keptWinners,
    rejectedWinners,
    keptLosses,
    rejectedLosses,
    keptUnresolved: kept.filter(isUnresolved).length,
    rejectedUnresolved: rejected.filter(isUnresolved).length,
    keptOneMesPl,
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    falseRejectWinnerRows: rejectedWinners,
    score,
    decision,
  };
}

function buildCandidates(rows: BroadRow[]): FeatureCandidate[] {
  const bySetup = new Map<string, BroadRow[]>();
  for (const row of rows) bySetup.set(row.setupType, [...(bySetup.get(row.setupType) || []), row]);
  const candidates: FeatureCandidate[] = [];
  for (const [setupType, setupRows] of bySetup.entries()) {
    const seen = new Set<string>();
    for (const row of setupRows) {
      for (const feature of featureValues(row)) {
        const key = `${feature.name}|${feature.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(buildCandidate(setupType, feature.name, feature.value, setupRows));
      }
    }
  }
  return candidates.sort((a, b) => {
    if (a.decision !== b.decision) return a.decision === 'candidate_for_more_research' ? -1 : 1;
    return b.score - a.score ||
      a.falseRejectWinnerRows - b.falseRejectWinnerRows ||
      (b.keptOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.keptOneMesPl ?? Number.NEGATIVE_INFINITY);
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Broad Feature Search',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only feature search. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Feature candidates evaluated: ${report.summary.featureCandidatesEvaluated}.`,
    `- Accepted candidates: ${report.summary.acceptedCandidates}.`,
    `- Rejected candidates: ${report.summary.rejectedCandidates}.`,
    `- Top candidate: ${report.summary.topCandidateId ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Top Candidates',
    '| Decision | Feature | Setup | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | False-Reject Winners | Score |',
    '|---|---|---|---|---|---:|---:|---:|---:|',
    ...report.candidates.slice(0, 40).map((row) => `| ${row.decision} | ${escapeTable(`${row.featureName}=${row.featureValue}`)} | ${row.setupType} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.falseRejectWinnerRows} | ${row.score} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport(args: {
  reportDir: string;
  broadRiskCapValidationPath: string | null;
  broadRiskCapValidationReport: UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport {
  const sourceRows = args.broadRiskCapValidationReport?.rows || [];
  const candidates = buildCandidates(sourceRows).slice(0, 80);
  const blockers = [
    !args.broadRiskCapValidationPath ? 'missing broad risk-cap validation path' : null,
    !args.broadRiskCapValidationReport ? 'missing broad risk-cap validation report' : null,
    args.broadRiskCapValidationReport && args.broadRiskCapValidationReport.status !== 'pass' ? `broad risk-cap validation status ${args.broadRiskCapValidationReport.status}` : null,
    sourceRows.length === 0 ? 'no broad validation source rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const accepted = candidates.filter((row) => row.decision === 'candidate_for_more_research');
  const base: Omit<UnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_broad_feature_search',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadRiskCapValidationPath: args.broadRiskCapValidationPath,
    },
    assumptions: {
      featureSearchIsResearchOnly: true,
      candidatesAreNotLiveFilters: true,
      unresolvedRowsAreNotWinsOrLosses: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      featureCandidatesEvaluated: candidates.length,
      acceptedCandidates: accepted.length,
      rejectedCandidates: candidates.length - accepted.length,
      topCandidateId: accepted[0]?.featureId || null,
      livePromotionAllowedRows: 0,
    },
    candidates,
    blockers,
    recommendations: blockers.length
      ? ['Do not use feature-search output until broad validation rows load cleanly.']
      : accepted.length
        ? ['Use accepted feature candidates only as research leads. Validate against a fresh replay package before any scanner-visible behavior changes.']
        : ['No low-false-reject feature candidate was found. Continue with richer proof/context features before considering live ranking changes.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport(
  report: UnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-broad-feature-search-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewBroadFeatureSearchCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const broadRiskCapValidationPath = readFlag(args, '--broad-risk-cap-validation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-broad-risk-cap-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport({
    reportDir: outDir,
    broadRiskCapValidationPath,
    broadRiskCapValidationReport: broadRiskCapValidationPath && fs.existsSync(broadRiskCapValidationPath)
      ? JSON.parse(fs.readFileSync(broadRiskCapValidationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewBroadFeatureSearchReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewBroadFeatureSearchCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
