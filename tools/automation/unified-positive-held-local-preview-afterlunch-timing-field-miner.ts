import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type Verdict = 'positive_candidate' | 'caution_candidate' | 'mixed_or_too_small';

interface FieldBucket {
  bucketId: string;
  field: string;
  value: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
  winnerRate: number;
  lossRate: number;
  verdict: Verdict;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_timing_field_miner';
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
    savedReportsOnly: true;
    afterLunchOnly: true;
    knownAtPlanFieldsOnly: true;
    outcomeFieldsUsedOnlyForResearchLabels: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    rows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    fieldBuckets: number;
    positiveCandidates: number;
    cautionCandidates: number;
    bestPositiveCandidate: string | null;
    bestCautionCandidate: string | null;
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
const SETUP = 'AfterLunchDriveFvgContinuation';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, prefix: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => prefix.test(name))
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

function proofHour(row: TimingRow): string {
  return row.proofTime.slice(11, 13);
}

function features(row: TimingRow): Record<string, string> {
  return {
    direction: row.direction,
    session: row.session,
    proofHour: proofHour(row),
    riskBucket: riskBucket(row),
  };
}

function isWinner(row: TimingRow): boolean {
  return row.outcomeBucket === 'winner_t1_t2';
}

function isLoss(row: TimingRow): boolean {
  return row.outcomeBucket === 'loss_stopped_before_t1';
}

function verdictFor(args: { rows: number; winnerRate: number; lossRate: number; gross: number | null }): Verdict {
  if (args.rows >= 10 && args.winnerRate >= 0.85 && (args.gross ?? 0) > 0) return 'positive_candidate';
  if (args.rows >= 10 && args.lossRate >= 0.25) return 'caution_candidate';
  return 'mixed_or_too_small';
}

function buildBuckets(rows: TimingRow[]): FieldBucket[] {
  const groups = new Map<string, TimingRow[]>();
  for (const row of rows) {
    for (const [field, value] of Object.entries(features(row))) {
      const bucketId = `${field}=${value}`;
      groups.set(bucketId, [...(groups.get(bucketId) || []), row]);
    }
  }
  return [...groups.entries()].map(([bucketId, group]) => {
    const index = bucketId.indexOf('=');
    const winners = group.filter(isWinner).length;
    const losses = group.filter(isLoss).length;
    const gross = sum(group.map((row) => row.resolvedOneMesPl));
    const winnerRate = round(winners / group.length);
    const lossRate = round(losses / group.length);
    return {
      bucketId,
      field: bucketId.slice(0, index),
      value: bucketId.slice(index + 1),
      rows: group.length,
      winners,
      losses,
      unresolved: group.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: gross,
      winnerRate,
      lossRate,
      verdict: verdictFor({ rows: group.length, winnerRate, lossRate, gross }),
    };
  }).sort((a, b) => (
    Number(b.verdict === 'positive_candidate') - Number(a.verdict === 'positive_candidate')
    || Number(b.verdict === 'caution_candidate') - Number(a.verdict === 'caution_candidate')
    || b.rows - a.rows
    || b.winnerRate - a.winnerRate
    || a.bucketId.localeCompare(b.bucketId)
  ));
}

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport['authority'] {
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Timing Field Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report field miner. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Rows: ${report.summary.rows}.`,
    `- Winners/losses/unresolved: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Positive/caution candidates: ${report.summary.positiveCandidates}/${report.summary.cautionCandidates}.`,
    `- Best positive candidate: ${report.summary.bestPositiveCandidate ?? '-'}.`,
    `- Best caution candidate: ${report.summary.bestCautionCandidate ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Candidate Buckets',
    ...report.buckets
      .filter((row) => row.verdict !== 'mixed_or_too_small')
      .map((row) => `- ${row.bucketId}: ${row.rows} rows; W/L/U ${row.winners}/${row.losses}/${row.unresolved}; P/L ${row.grossResolvedOneMesPl ?? '-'}; verdict ${row.verdict}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport(args: {
  reportDir?: string;
  sourceProofTimingPath?: string | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const rows = (sourceProofTimingReport?.rows || []).filter((row) => row.setupType === SETUP);
  const buckets = buildBuckets(rows);
  const positive = buckets.filter((row) => row.verdict === 'positive_candidate');
  const caution = buckets.filter((row) => row.verdict === 'caution_candidate');
  const blockers = [
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    rows.length === 0 ? 'no AfterLunchDriveFvgContinuation timing rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_timing_field_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, sourceProofTimingPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      knownAtPlanFieldsOnly: true,
      outcomeFieldsUsedOnlyForResearchLabels: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      rows: rows.length,
      winners: rows.filter(isWinner).length,
      losses: rows.filter(isLoss).length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      fieldBuckets: buckets.length,
      positiveCandidates: positive.length,
      cautionCandidates: caution.length,
      bestPositiveCandidate: positive[0]?.bucketId || null,
      bestCautionCandidate: caution[0]?.bucketId || null,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : positive.length || caution.length ? 'validate_candidates_in_selection_simulation' : 'keep_research_only',
    },
    buckets,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved source/proof timing input before AfterLunch timing mining.']
      : ['Validate AfterLunch timing candidates in no-lookahead selection simulation before any scanner-visible behavior.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport({
    reportDir,
    sourceProofTimingPath: readFlag(args, '--source-proof-timing') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `unified-positive-held-local-preview-afterlunch-timing-field-miner-${Date.now()}.json`);
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
