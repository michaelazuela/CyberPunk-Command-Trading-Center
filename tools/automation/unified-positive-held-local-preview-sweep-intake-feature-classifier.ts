import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewIntakeTriageReport,
} from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];

interface JoinedSweepRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  proofToEntryMinutes: number | null;
  issueTags: string[];
  intakeFound: boolean;
  executionStatus: string;
  detectedStatus: string;
  blockReason: string;
  proofState: string;
  riskQuality: string;
  triageDecision: string;
  occurrences: number | null;
  modelPriority: number | null;
  proofPriority: number | null;
}

interface ClassifierRow {
  classifierId: string;
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
  scannerVisibleEligible: false;
  decision: 'candidate_for_broader_replay_validation' | 'rejected_for_now';
  recommendation: string;
}

export interface UnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport {
  reportType: 'unified_positive_held_local_preview_sweep_intake_feature_classifier';
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
    intakeTriagePath: string | null;
  };
  assumptions: {
    sweepOnly: true;
    usesIntakeAndProofTimingFieldsOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    classifierIsResearchOnly: true;
    noLiveFilterInstalled: true;
    noRankBoostInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    sweepRows: number;
    joinedRows: number;
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
const SWEEP_SETUP = 'NoInstalledSetup';

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport['authority'] {
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

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function riskBucket(points: number): string {
  if (points <= 8) return 'risk_lte_8';
  if (points <= 12) return 'risk_8_to_12';
  if (points <= 16) return 'risk_12_to_16';
  return 'risk_gt_16';
}

function occurrenceBucket(occurrences: number | null): string {
  if (occurrences === null) return 'occurrences_unknown';
  if (occurrences <= 5) return 'occurrences_lte_5';
  if (occurrences <= 20) return 'occurrences_6_to_20';
  return 'occurrences_gt_20';
}

function proofToEntryBucket(minutes: number | null): string {
  if (minutes === null) return 'entry_unfilled';
  if (minutes === 0) return 'entry_same_bar';
  if (minutes <= 15) return 'entry_1_to_15m';
  if (minutes <= 30) return 'entry_16_to_30m';
  return 'entry_gt_30m';
}

function priorityBucket(value: number | null, prefix: string): string {
  if (value === null) return `${prefix}_unknown`;
  if (value < 50) return `${prefix}_lt_50`;
  if (value < 75) return `${prefix}_50_to_74`;
  return `${prefix}_gte_75`;
}

function isWinner(row: JoinedSweepRow): boolean {
  return row.outcomeBucket === 'winner_t1_t2';
}

function isLoss(row: JoinedSweepRow): boolean {
  return row.outcomeBucket === 'loss_stopped_before_t1';
}

function isUnresolved(row: JoinedSweepRow): boolean {
  return row.outcomeBucket === 'unresolved';
}

function joinRows(timingRows: TimingRow[], intakeRows: IntakeRow[]): JoinedSweepRow[] {
  const intakeById = new Map<string, IntakeRow>(intakeRows.map((row) => [row.intakeId, row]));
  return timingRows
    .filter((row) => row.setupType === SWEEP_SETUP)
    .map((row) => {
      const intake = intakeById.get(row.ticketId);
      return {
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        direction: row.direction,
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        riskPoints: row.riskPoints,
        proofToEntryMinutes: row.proofToEntryMinutes,
        issueTags: row.issueTags,
        intakeFound: Boolean(intake),
        executionStatus: stringValue(intake?.executionStatus, 'execution_unknown'),
        detectedStatus: stringValue(intake?.detectedStatus, 'detected_unknown'),
        blockReason: stringValue(intake?.blockReason, 'block_none'),
        proofState: stringValue(intake?.proofState, 'proof_unknown'),
        riskQuality: stringValue(intake?.riskQuality, 'risk_quality_unknown'),
        triageDecision: stringValue(intake?.triageDecision, 'triage_unknown'),
        occurrences: numberOrNull(intake?.occurrences),
        modelPriority: numberOrNull(intake?.modelPriority),
        proofPriority: numberOrNull(intake?.proofPriority),
      };
    });
}

function featureValues(row: JoinedSweepRow): Array<{ name: string; value: string }> {
  const risk = riskBucket(row.riskPoints);
  const entry = proofToEntryBucket(row.proofToEntryMinutes);
  const occurrences = occurrenceBucket(row.occurrences);
  return [
    { name: 'session', value: row.session },
    { name: 'direction', value: row.direction },
    { name: 'executionStatus', value: row.executionStatus },
    { name: 'detectedStatus', value: row.detectedStatus },
    { name: 'blockReason', value: row.blockReason },
    { name: 'proofState', value: row.proofState },
    { name: 'riskQuality', value: row.riskQuality },
    { name: 'triageDecision', value: row.triageDecision },
    { name: 'riskBucket', value: risk },
    { name: 'occurrenceBucket', value: occurrences },
    { name: 'proofToEntryBucket', value: entry },
    { name: 'modelPriorityBucket', value: priorityBucket(row.modelPriority, 'model_priority') },
    { name: 'proofPriorityBucket', value: priorityBucket(row.proofPriority, 'proof_priority') },
    { name: 'session_direction', value: `${row.session}_${row.direction}` },
    { name: 'status_blockReason', value: `${row.executionStatus}_${row.blockReason}` },
    { name: 'risk_entryBucket', value: `${risk}_${entry}` },
    { name: 'block_entryBucket', value: `${row.blockReason}_${entry}` },
    { name: 'risk_occurrenceBucket', value: `${risk}_${occurrences}` },
  ];
}

function classifierDecision(args: {
  keptRows: number;
  keptWinners: number;
  keptLosses: number;
  rejectedWinners: number;
  rejectedLosses: number;
  keptOneMesPl: number | null;
}): ClassifierRow['decision'] {
  return args.keptRows >= 5 &&
    args.keptWinners >= 3 &&
    args.keptLosses < args.keptWinners &&
    args.rejectedLosses >= 3 &&
    args.rejectedWinners <= args.keptWinners &&
    (args.keptOneMesPl ?? 0) > 0
    ? 'candidate_for_broader_replay_validation'
    : 'rejected_for_now';
}

function buildClassifier(featureName: string, featureValue: string, rows: JoinedSweepRow[]): ClassifierRow | null {
  const kept = rows.filter((row) => featureValues(row).some((feature) => feature.name === featureName && feature.value === featureValue));
  const rejected = rows.filter((row) => !kept.includes(row));
  if (kept.length === 0 || rejected.length === 0) return null;
  const keptWinners = kept.filter(isWinner).length;
  const keptLosses = kept.filter(isLoss).length;
  const rejectedWinners = rejected.filter(isWinner).length;
  const rejectedLosses = rejected.filter(isLoss).length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const score = round((keptOneMesPl ?? 0) + (rejectedLosses * 16) - (rejectedWinners * 42) - (keptLosses * 10));
  const decision = classifierDecision({
    keptRows: kept.length,
    keptWinners,
    keptLosses,
    rejectedWinners,
    rejectedLosses,
    keptOneMesPl,
  });
  return {
    classifierId: `NoInstalledSetup_${featureName}_${featureValue}`,
    featureName,
    featureValue,
    evaluatedRows: rows.length,
    keptRows: kept.length,
    rejectedRows: rejected.length,
    keptWinners,
    keptLosses,
    keptUnresolved: kept.filter(isUnresolved).length,
    rejectedWinners,
    rejectedLosses,
    rejectedUnresolved: rejected.filter(isUnresolved).length,
    keptOneMesPl,
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    falseRejectWinnerRows: rejectedWinners,
    score,
    scannerVisibleEligible: false,
    decision,
    recommendation: decision === 'candidate_for_broader_replay_validation'
      ? 'Research lead only. Validate this intake feature on a fresh replay package before any scanner-visible behavior change.'
      : 'Reject for now. This intake feature is too broad, cuts too many winners, or does not isolate enough losses.',
  };
}

function buildClassifiers(rows: JoinedSweepRow[]): ClassifierRow[] {
  const seen = new Set<string>();
  const classifiers: ClassifierRow[] = [];
  for (const row of rows) {
    for (const feature of featureValues(row)) {
      const key = `${feature.name}|${feature.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const classifier = buildClassifier(feature.name, feature.value, rows);
      if (classifier) classifiers.push(classifier);
    }
  }
  return classifiers.sort((a, b) => {
    if (a.decision !== b.decision) return a.decision === 'candidate_for_broader_replay_validation' ? -1 : 1;
    return b.score - a.score || a.falseRejectWinnerRows - b.falseRejectWinnerRows || b.keptRows - a.keptRows;
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Intake Feature Classifier',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only Sweep intake feature classifier. It does not install filters or boosts, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Sweep rows: ${report.summary.sweepRows}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Classifiers evaluated: ${report.summary.classifiersEvaluated}.`,
    `- Accepted classifiers: ${report.summary.acceptedClassifiers}.`,
    `- Top classifier: ${report.summary.topClassifierId ?? '-'}.`,
    '',
    '## Classifiers',
    '| Decision | Feature | Kept | Rejected | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | False-Reject Winners | Score | Scanner Visible Eligible | Recommendation |',
    '|---|---|---:|---:|---|---|---:|---:|---:|---:|---|---|',
    ...report.classifiers.slice(0, 80).map((row) => `| ${row.decision} | ${escapeTable(`${row.featureName}=${row.featureValue}`)} | ${row.keptRows} | ${row.rejectedRows} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.falseRejectWinnerRows} | ${row.score} | ${row.scannerVisibleEligible} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport {
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const intakeRows = args.intakeTriageReport?.rows || [];
  const joinedRows = joinRows(timingRows, intakeRows);
  const classifiers = buildClassifiers(joinedRows).slice(0, 120);
  const accepted = classifiers.filter((row) => row.decision === 'candidate_for_broader_replay_validation');
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    timingRows.length === 0 ? 'no source/proof timing rows found' : null,
    joinedRows.length === 0 ? 'no NoInstalledSetup rows joined' : null,
    joinedRows.some((row) => !row.intakeFound) ? 'one or more Sweep rows did not join to intake triage' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_intake_feature_classifier',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      intakeTriagePath: args.intakeTriagePath,
    },
    assumptions: {
      sweepOnly: true,
      usesIntakeAndProofTimingFieldsOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      classifierIsResearchOnly: true,
      noLiveFilterInstalled: true,
      noRankBoostInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: timingRows.length,
      sweepRows: timingRows.filter((row) => row.setupType === SWEEP_SETUP).length,
      joinedRows: joinedRows.length,
      classifiersEvaluated: classifiers.length,
      acceptedClassifiers: accepted.length,
      rejectedClassifiers: classifiers.length - accepted.length,
      topClassifierId: accepted[0]?.classifierId || null,
      livePromotionAllowedRows: 0,
    },
    classifiers,
    blockers,
    recommendations: blockers.length
      ? ['Do not use Sweep intake classifier output until source/proof timing rows join cleanly to intake triage.']
      : accepted.length
        ? [
          'Treat accepted classifiers as research leads only; validate against a fresh replay package before scanner-visible behavior changes.',
          'Do not install any canExecute, rank, Discord, Supabase, bridge, entry, stop, target, risk, or model-removal change from this diagnostic.',
        ]
        : [
          'No intake/proof-timing feature is strong enough for live-facing behavior. Mine scanner-tape structured snapshots next.',
          'Do not use outcome-path adverse excursion as a live filter.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport(
  report: UnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-intake-feature-classifier-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
