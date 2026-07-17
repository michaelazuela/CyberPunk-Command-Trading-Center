import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';

type ModelDecision = 'keep_strict_research_only' | 'candidate_for_filter_research' | 'insufficient_evidence';

interface PriorSetupEvidence {
  setupType: string;
  source: 'formal_replay_gap_analysis' | 'missing';
  count: number;
  grossOneMes: number | null;
}

interface ReviewedSetupEvidence {
  setupType: string;
  source: 'held_local_ohlc_outcome' | 'missing';
  count: number;
  grossOneMes: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewModelDecisionRow {
  setupType: string;
  priorNonStrict: PriorSetupEvidence;
  reviewedHeldLocal: ReviewedSetupEvidence;
  decision: ModelDecision;
  removeModel: false;
  broadenLiveBehavior: false;
  changeCanExecute: false;
  recommendation: string;
  reason: string;
}

export interface UnifiedPositiveHeldLocalPreviewModelDecisionReport {
  reportType: 'unified_positive_held_local_preview_model_decision';
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
    formalReplayPath: string | null;
    ohlcOutcomePath: string | null;
  };
  summary: {
    modelsReviewed: number;
    removeModelRecommendations: 0;
    strictResearchOnlyRecommendations: number;
    candidateFilterResearchRecommendations: number;
    insufficientEvidenceRecommendations: number;
    livePromotionAllowedRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewModelDecisionRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const MODELS = ['TurtleSoup', 'SweepMssFvgRetrace'] as const;

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function authority(): UnifiedPositiveHeldLocalPreviewModelDecisionReport['authority'] {
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

function priorEvidence(formalReplayReport: Record<string, unknown> | null, setupType: string): PriorSetupEvidence {
  const bySetup = asRecord(asRecord(formalReplayReport?.gapAnalysis).bySetup);
  const row = asRecord(bySetup[setupType]);
  const grossOneMes = numberOrNull(row.grossOneMes);
  const count = numberOrNull(row.count) || 0;
  return {
    setupType,
    source: grossOneMes === null && count === 0 ? 'missing' : 'formal_replay_gap_analysis',
    count,
    grossOneMes,
  };
}

function reviewedEvidence(ohlcOutcomeReport: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null, setupType: string): ReviewedSetupEvidence {
  const rows = (ohlcOutcomeReport?.rows || []).filter((row) => row.setupType === setupType);
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => value !== null);
  return {
    setupType,
    source: rows.length ? 'held_local_ohlc_outcome' : 'missing',
    count: rows.length,
    grossOneMes: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100 : null,
  };
}

function decisionFor(prior: PriorSetupEvidence, reviewed: ReviewedSetupEvidence): Pick<UnifiedPositiveHeldLocalPreviewModelDecisionRow, 'decision' | 'recommendation' | 'reason'> {
  if (prior.source === 'missing' && reviewed.source === 'missing') {
    return {
      decision: 'insufficient_evidence',
      recommendation: 'Do not remove or broaden the model; collect durable replay evidence first.',
      reason: 'No durable prior or reviewed held-local outcome evidence was found.',
    };
  }
  if ((prior.grossOneMes ?? 0) < 0 && (reviewed.grossOneMes ?? 0) > 0) {
    return {
      decision: 'candidate_for_filter_research',
      recommendation: 'Keep the model strict and research the filter that separated reviewed held-local winners from the broad non-strict losing bucket.',
      reason: `Prior non-strict evidence is negative (${prior.grossOneMes}) but reviewed held-local evidence is positive (${reviewed.grossOneMes}). That argues against deletion and against broadening.`,
    };
  }
  if ((prior.grossOneMes ?? 0) < 0) {
    return {
      decision: 'keep_strict_research_only',
      recommendation: 'Keep the model strict; do not broaden or remove it from this evidence alone.',
      reason: `Prior non-strict evidence is negative (${prior.grossOneMes}) and reviewed held-local evidence does not yet prove a positive filter.`,
    };
  }
  return {
    decision: 'keep_strict_research_only',
    recommendation: 'Keep the model under existing strict gates; no live behavior change is justified.',
    reason: 'Evidence does not justify deletion, broadening, or a canExecute change.',
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewModelDecisionReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Model Decision',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research decision summary. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, remove models, broaden models, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Models reviewed: ${report.summary.modelsReviewed}.`,
    `- Remove-model recommendations: ${report.summary.removeModelRecommendations}.`,
    `- Strict research-only recommendations: ${report.summary.strictResearchOnlyRecommendations}.`,
    `- Candidate filter-research recommendations: ${report.summary.candidateFilterResearchRecommendations}.`,
    `- Insufficient evidence recommendations: ${report.summary.insufficientEvidenceRecommendations}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Setup | Prior Count | Prior P/L | Reviewed Count | Reviewed P/L | Decision | Recommendation |',
    '|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.setupType)} | ${row.priorNonStrict.count} | ${row.priorNonStrict.grossOneMes ?? '-'} | ${row.reviewedHeldLocal.count} | ${row.reviewedHeldLocal.grossOneMes ?? '-'} | ${row.decision} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewModelDecisionReport(args: {
  formalReplayPath: string | null;
  formalReplayReport: Record<string, unknown> | null;
  ohlcOutcomePath: string | null;
  ohlcOutcomeReport: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewModelDecisionReport {
  const rows = MODELS.map((setupType) => {
    const prior = priorEvidence(args.formalReplayReport, setupType);
    const reviewed = reviewedEvidence(args.ohlcOutcomeReport, setupType);
    const decision = decisionFor(prior, reviewed);
    return {
      setupType,
      priorNonStrict: prior,
      reviewedHeldLocal: reviewed,
      ...decision,
      removeModel: false as const,
      broadenLiveBehavior: false as const,
      changeCanExecute: false as const,
    };
  });
  const blockers = [
    !args.formalReplayPath ? 'missing formal replay path' : null,
    !args.formalReplayReport ? 'missing formal replay report' : null,
    !args.ohlcOutcomePath ? 'missing OHLC outcome path' : null,
    !args.ohlcOutcomeReport ? 'missing OHLC outcome report' : null,
    args.ohlcOutcomeReport && args.ohlcOutcomeReport.status !== 'pass' ? `OHLC outcome status ${args.ohlcOutcomeReport.status}` : null,
    args.ohlcOutcomeReport && args.ohlcOutcomeReport.summary.livePromotionAllowedRows !== 0 ? `OHLC outcome has ${args.ohlcOutcomeReport.summary.livePromotionAllowedRows} live-promotion rows` : null,
    ...rows.flatMap((row) => [
      row.removeModel !== false ? `${row.setupType} removeModel is not false` : null,
      row.broadenLiveBehavior !== false ? `${row.setupType} broadenLiveBehavior is not false` : null,
      row.changeCanExecute !== false ? `${row.setupType} changeCanExecute is not false` : null,
    ]),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewModelDecisionReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_model_decision',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      formalReplayPath: args.formalReplayPath,
      ohlcOutcomePath: args.ohlcOutcomePath,
    },
    summary: {
      modelsReviewed: rows.length,
      removeModelRecommendations: 0,
      strictResearchOnlyRecommendations: rows.filter((row) => row.decision === 'keep_strict_research_only').length,
      candidateFilterResearchRecommendations: rows.filter((row) => row.decision === 'candidate_for_filter_research').length,
      insufficientEvidenceRecommendations: rows.filter((row) => row.decision === 'insufficient_evidence').length,
      livePromotionAllowedRows: args.ohlcOutcomeReport?.summary.livePromotionAllowedRows || 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not make model decisions until the formal replay and OHLC outcome reports both load cleanly.']
      : ['Do not remove TurtleSoup or SweepMssFvgRetrace from this evidence. Keep both strict and research the reviewed-row filter before any live behavior change.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewModelDecisionReport(
  report: UnifiedPositiveHeldLocalPreviewModelDecisionReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-model-decision-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewModelDecisionCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const formalReplayPath = readFlag(args, '--formal-replay') || latestMatchingFile(outDir, /^formal-replay-research-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const ohlcOutcomePath = readFlag(args, '--ohlc-outcome') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-ohlc-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewModelDecisionReport({
    formalReplayPath,
    formalReplayReport: formalReplayPath && fs.existsSync(formalReplayPath)
      ? JSON.parse(fs.readFileSync(formalReplayPath, 'utf8')) as Record<string, unknown>
      : null,
    ohlcOutcomePath,
    ohlcOutcomeReport: ohlcOutcomePath && fs.existsSync(ohlcOutcomePath)
      ? JSON.parse(fs.readFileSync(ohlcOutcomePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewModelDecisionReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewModelDecisionCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
