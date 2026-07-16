import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SetupType } from '../../src/types';
import type { NoChaseOhlcProofCase, NoChaseOhlcProofExtractorReport } from './no-chase-ohlc-proof-extractor';

type RebuildDecision = 'include_for_rebuild_review' | 'hold_for_filter_review' | 'exclude_until_revalidated';

export interface NoChaseArtifactRebuildPackRow {
  caseId: string;
  tradeDate: string;
  sessionType: NoChaseOhlcProofCase['sessionType'];
  setupType: NoChaseOhlcProofCase['setupType'];
  direction: NoChaseOhlcProofCase['direction'];
  sourceNoChaseSnapshotId: string;
  firstNoChaseTime: string | null;
  proofType: NoChaseOhlcProofCase['proofType'];
  proofBarTime: string | null;
  replayOutcome: NoChaseOhlcProofCase['replayOutcome'];
  replayFillTime: string | null;
  replayOutcomeTime: string | null;
  replayOneMesGross: number;
  deterministicPlan: {
    entry: number;
    stop: number;
    target1: number;
    target2: number;
  };
  rebuildDecision: RebuildDecision;
  canExecute: false;
  publishDiscord: false;
  recommendation: string;
}

export interface NoChaseArtifactRebuildPackReport {
  reportType: 'no_chase_artifact_rebuild_pack';
  generatedAt: string;
  authority: {
    readOnly: true;
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
  };
  source: {
    proofReportPath: string | null;
    proofReportGeneratedAt: string;
    proofReportFiveMinuteSource: NoChaseOhlcProofExtractorReport['summary']['fiveMinuteSource'];
  };
  summary: {
    sourceNoChaseCases: number;
    sourceReviewableFullPlan: number;
    sourceProofOnlyMissingPlanFields: number;
    sourceNotReviewableNoOhlcProof: number;
    rebuildPackRows: number;
    includeForRebuildReview: number;
    holdForFilterReview: number;
    excludeUntilRevalidated: number;
    afterLunchRows: number;
    afterLunchIncludeForReview: number;
    intradayRows: number;
    intradayIncludeForReview: number;
    replayWins: number;
    replayLosses: number;
    replayNoFill: number;
    replayFilledOpen: number;
    replayAmbiguous: number;
    replayGrossOneMes: number;
  };
  rows: NoChaseArtifactRebuildPackRow[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function authority(): NoChaseArtifactRebuildPackReport['authority'] {
  return {
    readOnly: true,
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
  };
}

function isPositiveReplay(caseItem: NoChaseOhlcProofCase): boolean {
  return caseItem.replayOutcome === 'T2_HIT' ||
    caseItem.replayOutcome === 'T1_THEN_STOP' ||
    caseItem.replayOutcome === 'T1_HIT_OPEN_RUNNER';
}

function rebuildDecisionFor(caseItem: NoChaseOhlcProofCase): RebuildDecision {
  if (isPositiveReplay(caseItem)) return 'include_for_rebuild_review';
  if (caseItem.replayOutcome === 'STOP_HIT' || caseItem.replayOutcome === 'AMBIGUOUS') return 'exclude_until_revalidated';
  return 'hold_for_filter_review';
}

function recommendationFor(caseItem: NoChaseOhlcProofCase, decision: RebuildDecision): string {
  if (decision === 'include_for_rebuild_review') {
    return 'Positive completed-5M replay. Rebuild as a research-only human-review candidate and compare against chart context before any live wiring.';
  }
  if (decision === 'exclude_until_revalidated') {
    return 'Replay hit stop or was ambiguous. Keep out of rebuild promotion unless a later filter explains the failure.';
  }
  return 'No-fill or unresolved fill. Keep in the pack as filter evidence, not as a rebuild promotion.';
}

function buildRow(caseItem: NoChaseOhlcProofCase): NoChaseArtifactRebuildPackRow | null {
  if (caseItem.reviewClassification !== 'reviewable_full_plan') return null;
  if (caseItem.entry === null || caseItem.stop === null || caseItem.target1 === null || caseItem.target2 === null) return null;
  const rebuildDecision = rebuildDecisionFor(caseItem);
  return {
    caseId: caseItem.caseId,
    tradeDate: caseItem.tradeDate,
    sessionType: caseItem.sessionType,
    setupType: caseItem.setupType,
    direction: caseItem.direction,
    sourceNoChaseSnapshotId: caseItem.firstNoChaseSnapshotId,
    firstNoChaseTime: caseItem.firstNoChaseTime,
    proofType: caseItem.proofType,
    proofBarTime: caseItem.proofBarTime,
    replayOutcome: caseItem.replayOutcome,
    replayFillTime: caseItem.replayFillTime,
    replayOutcomeTime: caseItem.replayOutcomeTime,
    replayOneMesGross: caseItem.replayOneMesGross,
    deterministicPlan: {
      entry: caseItem.entry,
      stop: caseItem.stop,
      target1: caseItem.target1,
      target2: caseItem.target2,
    },
    rebuildDecision,
    canExecute: false,
    publishDiscord: false,
    recommendation: recommendationFor(caseItem, rebuildDecision),
  };
}

function buildRecommendations(report: Omit<NoChaseArtifactRebuildPackReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Research-only rebuild pack. Do not post Discord, set canExecute, or wire scanner behavior from this artifact.',
    'Keep TurtleSoup and SweepMssFvgRetrace excluded; this pack only covers full-plan Intraday MSS and After-Lunch FVG no-chase cases.',
  ];
  if (report.summary.includeForRebuildReview > 0) {
    recommendations.push('Use include_for_rebuild_review rows as the only candidates for a later read-only scanner artifact rebuild simulation.');
  }
  if (report.summary.holdForFilterReview > 0) {
    recommendations.push('No-fill and filled-open rows should become filter research, not live tickets.');
  }
  if (report.summary.excludeUntilRevalidated > 0) {
    recommendations.push('Stopped or ambiguous rows must stay excluded unless a separate evidence pass identifies a deterministic filter.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<NoChaseArtifactRebuildPackReport, 'markdown'>): string {
  const lines = [
    '# No-Chase Artifact Rebuild Pack',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source no-chase cases: ${report.summary.sourceNoChaseCases}.`,
    `- Source reviewable full-plan cases: ${report.summary.sourceReviewableFullPlan}.`,
    `- Rebuild pack rows: ${report.summary.rebuildPackRows}.`,
    `- Include / hold / exclude: ${report.summary.includeForRebuildReview}/${report.summary.holdForFilterReview}/${report.summary.excludeUntilRevalidated}.`,
    `- AfterLunch rows/include: ${report.summary.afterLunchRows}/${report.summary.afterLunchIncludeForReview}.`,
    `- Intraday rows/include: ${report.summary.intradayRows}/${report.summary.intradayIncludeForReview}.`,
    `- Replay wins/losses/no-fill/filled-open/ambiguous: ${report.summary.replayWins}/${report.summary.replayLosses}/${report.summary.replayNoFill}/${report.summary.replayFilledOpen}/${report.summary.replayAmbiguous}.`,
    `- Replayed one-MES gross P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    '',
    '## Rows',
    '| Date | Session | Setup | Side | Entry | Stop | T1 | T2 | Proof Time | Replay Outcome | Replay P/L | Rebuild Decision |',
    '|---|---|---|---|---:|---:|---:|---:|---|---|---:|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.sessionType} | ${row.setupType} | ${row.direction} | ${row.deterministicPlan.entry} | ${row.deterministicPlan.stop} | ${row.deterministicPlan.target1} | ${row.deterministicPlan.target2} | ${row.proofBarTime || '-'} | ${row.replayOutcome}${row.replayOutcomeTime ? ` @ ${row.replayOutcomeTime}` : ''} | $${row.replayOneMesGross.toFixed(2)} | ${row.rebuildDecision} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildNoChaseArtifactRebuildPackReport(args: {
  proofReport: NoChaseOhlcProofExtractorReport;
  proofReportPath?: string | null;
}, generatedAt = new Date().toISOString()): NoChaseArtifactRebuildPackReport {
  const rows = args.proofReport.cases
    .map(buildRow)
    .filter((row): row is NoChaseArtifactRebuildPackRow => Boolean(row));
  const withoutRecommendationsAndMarkdown: Omit<NoChaseArtifactRebuildPackReport, 'recommendations' | 'markdown'> = {
    reportType: 'no_chase_artifact_rebuild_pack',
    generatedAt,
    authority: authority(),
    source: {
      proofReportPath: args.proofReportPath || null,
      proofReportGeneratedAt: args.proofReport.generatedAt,
      proofReportFiveMinuteSource: args.proofReport.summary.fiveMinuteSource,
    },
    summary: {
      sourceNoChaseCases: args.proofReport.summary.noChaseCases,
      sourceReviewableFullPlan: args.proofReport.summary.reviewableFullPlan,
      sourceProofOnlyMissingPlanFields: args.proofReport.summary.proofOnlyMissingPlanFields,
      sourceNotReviewableNoOhlcProof: args.proofReport.summary.notReviewableNoOhlcProof,
      rebuildPackRows: rows.length,
      includeForRebuildReview: rows.filter((row) => row.rebuildDecision === 'include_for_rebuild_review').length,
      holdForFilterReview: rows.filter((row) => row.rebuildDecision === 'hold_for_filter_review').length,
      excludeUntilRevalidated: rows.filter((row) => row.rebuildDecision === 'exclude_until_revalidated').length,
      afterLunchRows: rows.filter((row) => row.setupType === SetupType.AfterLunchDriveFvgContinuation).length,
      afterLunchIncludeForReview: rows.filter((row) => row.setupType === SetupType.AfterLunchDriveFvgContinuation && row.rebuildDecision === 'include_for_rebuild_review').length,
      intradayRows: rows.filter((row) => row.setupType === SetupType.IntradayMssMicroContinuation).length,
      intradayIncludeForReview: rows.filter((row) => row.setupType === SetupType.IntradayMssMicroContinuation && row.rebuildDecision === 'include_for_rebuild_review').length,
      replayWins: rows.filter((row) => row.rebuildDecision === 'include_for_rebuild_review').length,
      replayLosses: rows.filter((row) => row.replayOutcome === 'STOP_HIT').length,
      replayNoFill: rows.filter((row) => row.replayOutcome === 'NO_FILL').length,
      replayFilledOpen: rows.filter((row) => row.replayOutcome === 'FILLED_OPEN').length,
      replayAmbiguous: rows.filter((row) => row.replayOutcome === 'AMBIGUOUS').length,
      replayGrossOneMes: roundCurrency(rows.reduce((sum, row) => sum + row.replayOneMesGross, 0)),
    },
    rows,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeNoChaseArtifactRebuildPackReport(report: NoChaseArtifactRebuildPackReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-artifact-rebuild-pack-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runNoChaseArtifactRebuildPackCli(args = process.argv.slice(2)): Promise<void> {
  const proofReportPath = readFlag(args, '--proof-report');
  if (!proofReportPath) throw new Error('Missing required --proof-report path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const proofReport = JSON.parse(fs.readFileSync(proofReportPath, 'utf8')) as NoChaseOhlcProofExtractorReport;
  const report = buildNoChaseArtifactRebuildPackReport({ proofReport, proofReportPath });
  const paths = writeNoChaseArtifactRebuildPackReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runNoChaseArtifactRebuildPackCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
