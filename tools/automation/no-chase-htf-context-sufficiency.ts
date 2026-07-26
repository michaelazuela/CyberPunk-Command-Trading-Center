import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SetupType } from '../../src/types';
import type { NoChaseArtifactRebuildSimulationReport, NoChaseRebuiltHumanReviewArtifact } from './no-chase-artifact-rebuild-simulation';
import type { ControlledHtfOhlcAcquisitionReport } from './controlled-htf-ohlc-acquisition';

type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type Sufficiency = 'sufficient' | 'partial' | 'insufficient';

interface TimeframeCoverage {
  timeframe: Timeframe;
  barsLoaded: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  sufficientForArtifact: boolean;
  blocker: string | null;
}

export interface NoChaseHtfContextSufficiencyRow {
  artifactId: string;
  caseId: string;
  tradeDate: string;
  sessionType: NoChaseRebuiltHumanReviewArtifact['sessionType'];
  setupType: NoChaseRebuiltHumanReviewArtifact['setupType'];
  direction: NoChaseRebuiltHumanReviewArtifact['direction'];
  proofBarTime: string | null;
  requiredStartTime: string | null;
  requiredEndTime: string | null;
  sufficiency: Sufficiency;
  reliability: 'structured_context_available' | 'data_limited';
  canUseHtfForPromotionEvidence: false;
  canExecute: false;
  publishDiscord: false;
  timeframeCoverage: TimeframeCoverage[];
  blockers: string[];
  recommendation: string;
}

export interface NoChaseHtfContextSufficiencyReport {
  reportType: 'no_chase_htf_context_sufficiency';
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
    simulationReportPath: string | null;
    simulationReportGeneratedAt: string;
    htfCoverageReportPath: string | null;
    htfCoverageReportGeneratedAt: string;
    htfCoverageReportHadLiveReads: boolean;
    localReadOnlyThisRun: true;
    lookbackCalendarDays: number;
  };
  summary: {
    artifactsChecked: number;
    sufficientArtifacts: number;
    partialArtifacts: number;
    insufficientArtifacts: number;
    dataLimitedArtifacts: number;
    afterLunchSufficient: number;
    intradaySufficient: number;
    canExecuteFalseArtifacts: number;
    publishDiscordFalseArtifacts: number;
    htfPromotionEvidenceAllowed: number;
  };
  rows: NoChaseHtfContextSufficiencyRow[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLANK_SLATE_MODE = Object.values(SetupType).length === 1 && Object.values(SetupType)[0] === SetupType.NoSetup;
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string | null | undefined): number {
  const normalized = normalizeTime(value);
  if (!normalized) return 0;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDaysIso(value: string, days: number): string {
  const date = new Date(`${normalizeTime(value)}Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 19);
}

function authority(): NoChaseHtfContextSufficiencyReport['authority'] {
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

function coverageRowFor(report: ControlledHtfOhlcAcquisitionReport, timeframe: Timeframe): ControlledHtfOhlcAcquisitionReport['coverage'][number] | null {
  return report.coverage.find((row) => row.timeframe === timeframe) || null;
}

function timeframeCoverage(args: {
  htfReport: ControlledHtfOhlcAcquisitionReport;
  timeframe: Timeframe;
  requiredStartTime: string | null;
  requiredEndTime: string | null;
}): TimeframeCoverage {
  const coverage = coverageRowFor(args.htfReport, args.timeframe);
  const barsLoaded = finiteNumber(coverage?.barsLoaded) ?? 0;
  const rangeStart = normalizeTime(coverage?.rangeStart || null);
  const rangeEnd = normalizeTime(coverage?.rangeEnd || null);
  const hasCoverage = Boolean(args.requiredStartTime && args.requiredEndTime && rangeStart && rangeEnd && barsLoaded > 0);
  const coversWindow = hasCoverage &&
    timeMs(rangeStart) <= timeMs(args.requiredStartTime) &&
    timeMs(rangeEnd) >= timeMs(args.requiredEndTime);
  const blocker = coversWindow
    ? null
    : `Missing ${args.timeframe} 30-day structured OHLC coverage: required ${args.requiredStartTime || 'N/A'} to ${args.requiredEndTime || 'N/A'}, loaded ${barsLoaded} bars from ${rangeStart || 'N/A'} to ${rangeEnd || 'N/A'}.`;
  return {
    timeframe: args.timeframe,
    barsLoaded,
    rangeStart,
    rangeEnd,
    sufficientForArtifact: Boolean(coversWindow),
    blocker,
  };
}

function recommendationFor(row: Pick<NoChaseHtfContextSufficiencyRow, 'sufficiency'>): string {
  if (row.sufficiency === 'sufficient') {
    return 'Structured 30-day 5M/15M/60M/120M/240M context covers this artifact. Keep human-review only; HTF still cannot approve execution.';
  }
  if (row.sufficiency === 'partial') {
    return 'Some structured HTF context exists, but coverage is incomplete. Treat HTF as context only and do not use it for promotion evidence.';
  }
  return 'HTF context is data-limited. Do not treat this as structural confirmation or candidate-promotion evidence.';
}

function buildRow(args: {
  artifact: NoChaseRebuiltHumanReviewArtifact;
  htfReport: ControlledHtfOhlcAcquisitionReport;
  lookbackCalendarDays: number;
}): NoChaseHtfContextSufficiencyRow {
  const proofBarTime = normalizeTime(args.artifact.proof.proofBarTime);
  const requiredStartTime = proofBarTime ? addDaysIso(proofBarTime, -args.lookbackCalendarDays) : null;
  const requiredEndTime = proofBarTime;
  const coverages = TIMEFRAMES.map((timeframe) => timeframeCoverage({
    htfReport: args.htfReport,
    timeframe,
    requiredStartTime,
    requiredEndTime,
  }));
  const coveredCount = coverages.filter((item) => item.sufficientForArtifact).length;
  const sufficiency: Sufficiency = coveredCount === TIMEFRAMES.length
    ? 'sufficient'
    : coveredCount > 0
      ? 'partial'
      : 'insufficient';
  const blockers = coverages.flatMap((item) => item.blocker ? [item.blocker] : []);
  const base = {
    artifactId: args.artifact.artifactId,
    caseId: args.artifact.caseId,
    tradeDate: args.artifact.tradeDate,
    sessionType: args.artifact.sessionType,
    setupType: args.artifact.setupType,
    direction: args.artifact.direction,
    proofBarTime,
    requiredStartTime,
    requiredEndTime,
    sufficiency,
    reliability: sufficiency === 'sufficient' ? 'structured_context_available' as const : 'data_limited' as const,
    canUseHtfForPromotionEvidence: false as const,
    canExecute: false as const,
    publishDiscord: false as const,
    timeframeCoverage: coverages,
    blockers,
  };
  return { ...base, recommendation: recommendationFor(base) };
}

function buildRecommendations(report: Omit<NoChaseHtfContextSufficiencyReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'This report is read-only context sufficiency. It does not approve execution, create canExecute, post Discord, or wire scanner behavior.',
    '5M execution proof remains mandatory; HTF context is map/support/caution only.',
  ];
  if (report.summary.sufficientArtifacts > 0) {
    recommendations.push('Sufficient rows may advance to manual chart-context review only, still human-review-only.');
  }
  if (report.summary.dataLimitedArtifacts > 0) {
    recommendations.push('Data-limited rows require a controlled HTF data reload/backfill before any scanner-visible review-ticket discussion.');
  }
  return recommendations;
}

function buildMarkdown(report: Omit<NoChaseHtfContextSufficiencyReport, 'markdown'>): string {
  const lines = [
    '# No-Chase HTF Context Sufficiency',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Artifacts checked: ${report.summary.artifactsChecked}.`,
    `- Sufficient / partial / insufficient: ${report.summary.sufficientArtifacts}/${report.summary.partialArtifacts}/${report.summary.insufficientArtifacts}.`,
    `- Data-limited artifacts: ${report.summary.dataLimitedArtifacts}.`,
    `- AfterLunch sufficient: ${report.summary.afterLunchSufficient}.`,
    `- Intraday sufficient: ${report.summary.intradaySufficient}.`,
    `- canExecute=false artifacts: ${report.summary.canExecuteFalseArtifacts}.`,
    `- publishDiscord=false artifacts: ${report.summary.publishDiscordFalseArtifacts}.`,
    `- HTF promotion evidence allowed: ${report.summary.htfPromotionEvidenceAllowed}.`,
    '',
    '## Rows',
    '| Date | Session | Setup | Side | Proof Time | Required Start | Sufficiency | Reliability | 5M | 15M | 60M | 120M | 240M | Recommendation |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => {
      const tf = Object.fromEntries(row.timeframeCoverage.map((item) => [item.timeframe, item.sufficientForArtifact ? 'yes' : 'no'])) as Record<Timeframe, string>;
      return `| ${row.tradeDate} | ${row.sessionType} | ${row.setupType} | ${row.direction} | ${row.proofBarTime || '-'} | ${row.requiredStartTime || '-'} | ${row.sufficiency} | ${row.reliability} | ${tf['5m']} | ${tf['15m']} | ${tf['60m']} | ${tf['120m']} | ${tf['240m']} | ${row.recommendation} |`;
    }),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildNoChaseHtfContextSufficiencyReport(args: {
  simulationReport: NoChaseArtifactRebuildSimulationReport;
  htfReport: ControlledHtfOhlcAcquisitionReport;
  simulationReportPath?: string | null;
  htfCoverageReportPath?: string | null;
  lookbackCalendarDays?: number;
}, generatedAt = new Date().toISOString()): NoChaseHtfContextSufficiencyReport {
  const lookbackCalendarDays = args.lookbackCalendarDays ?? 30;
  const rows = args.simulationReport.artifacts.map((artifact) => buildRow({
    artifact,
    htfReport: args.htfReport,
    lookbackCalendarDays,
  }));
  const withoutRecommendationsAndMarkdown: Omit<NoChaseHtfContextSufficiencyReport, 'recommendations' | 'markdown'> = {
    reportType: 'no_chase_htf_context_sufficiency',
    generatedAt,
    authority: authority(),
    source: {
      simulationReportPath: args.simulationReportPath || null,
      simulationReportGeneratedAt: args.simulationReport.generatedAt,
      htfCoverageReportPath: args.htfCoverageReportPath || null,
      htfCoverageReportGeneratedAt: args.htfReport.generatedAt,
      htfCoverageReportHadLiveReads: Boolean(args.htfReport.summary.liveSupabaseReadAttempted || args.htfReport.summary.liveBridgeReadAttempted),
      localReadOnlyThisRun: true,
      lookbackCalendarDays,
    },
    summary: {
      artifactsChecked: rows.length,
      sufficientArtifacts: rows.filter((row) => row.sufficiency === 'sufficient').length,
      partialArtifacts: rows.filter((row) => row.sufficiency === 'partial').length,
      insufficientArtifacts: rows.filter((row) => row.sufficiency === 'insufficient').length,
      dataLimitedArtifacts: rows.filter((row) => row.reliability === 'data_limited').length,
      afterLunchSufficient: BLANK_SLATE_MODE ? 0 : rows.filter((row) => row.setupType === SetupType.NoSetup && row.sufficiency === 'sufficient').length,
      intradaySufficient: BLANK_SLATE_MODE ? 0 : rows.filter((row) => row.setupType === SetupType.NoSetup && row.sufficiency === 'sufficient').length,
      canExecuteFalseArtifacts: rows.filter((row) => row.canExecute === false).length,
      publishDiscordFalseArtifacts: rows.filter((row) => row.publishDiscord === false).length,
      htfPromotionEvidenceAllowed: rows.filter((row) => row.canUseHtfForPromotionEvidence).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeNoChaseHtfContextSufficiencyReport(report: NoChaseHtfContextSufficiencyReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-htf-context-sufficiency-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runNoChaseHtfContextSufficiencyCli(args = process.argv.slice(2)): Promise<void> {
  const simulationReportPath = readFlag(args, '--simulation-report');
  const htfCoverageReportPath = readFlag(args, '--htf-coverage-report');
  if (!simulationReportPath) throw new Error('Missing required --simulation-report path.');
  if (!htfCoverageReportPath) throw new Error('Missing required --htf-coverage-report path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const lookbackCalendarDays = Math.max(1, Math.trunc(Number(readFlag(args, '--lookback-days') || 30)));
  const simulationReport = JSON.parse(fs.readFileSync(simulationReportPath, 'utf8')) as NoChaseArtifactRebuildSimulationReport;
  const htfReport = JSON.parse(fs.readFileSync(htfCoverageReportPath, 'utf8')) as ControlledHtfOhlcAcquisitionReport;
  const report = buildNoChaseHtfContextSufficiencyReport({
    simulationReport,
    htfReport,
    simulationReportPath,
    htfCoverageReportPath,
    lookbackCalendarDays,
  });
  const paths = writeNoChaseHtfContextSufficiencyReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runNoChaseHtfContextSufficiencyCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
