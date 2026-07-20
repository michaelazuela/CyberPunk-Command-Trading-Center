import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport,
  type JoinedRow,
} from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';

type Segment = 'blocked_no_chase' | 'not_applicable_no_no_chase' | 'other';

interface SegmentRow {
  segment: Segment;
  rows: number;
  winnerRows: number;
  problemRows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  stoppedRows: number;
  unresolvedRows: number;
  grossResolvedOneMesPl: number;
  winnerRate: number;
  problemRate: number;
}

export interface RawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_nochase_split_validation';
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
    replayPackagePath: string | null;
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    validatesCompositePreentrySplitOnly: true;
    outcomesUsedOnlyForResearchLabels: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    joinedRows: number;
    blockedNoChaseRows: number;
    notApplicableNoNoChaseRows: number;
    blockedNoChaseProblemRate: number;
    notApplicableNoNoChaseWinnerRate: number;
    grossDeltaOneMesPl: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'prepare_research_only_rank_simulation' | 'keep_as_review_note' | 'fix_inputs';
  };
  segmentRows: SegmentRow[];
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function isWinner(row: JoinedRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: JoinedRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function segmentFor(row: JoinedRow): Segment {
  if (row.fields.htfLineInSandStatus === 'blocked' && row.fields.hasNoChaseMissingEvidence === 'true') return 'blocked_no_chase';
  if (row.fields.htfLineInSandStatus === 'not_applicable' && row.fields.hasNoChaseMissingEvidence === 'false') return 'not_applicable_no_no_chase';
  return 'other';
}

function authority(): RawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport['authority'] {
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

function segmentStats(rows: JoinedRow[]): SegmentRow[] {
  const segments: Segment[] = ['blocked_no_chase', 'not_applicable_no_no_chase', 'other'];
  return segments.map((segment) => {
    const matched = rows.filter((row) => segmentFor(row) === segment);
    const winnerRows = matched.filter(isWinner).length;
    const problemRows = matched.filter(isProblem).length;
    const grossResolvedOneMesPl = round(matched.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0));
    return {
      segment,
      rows: matched.length,
      winnerRows,
      problemRows,
      noFillRows: matched.filter((row) => row.outcomeLabel === 'no_fill').length,
      noTargetOrStopRows: matched.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      stoppedRows: matched.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      unresolvedRows: matched.filter((row) => row.outcomeStatus === 'unresolved').length,
      grossResolvedOneMesPl,
      winnerRate: matched.length ? round(winnerRows / matched.length) : 0,
      problemRate: matched.length ? round(problemRows / matched.length) : 0,
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG No-Chase Split Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact/outcome validation. It validates a composite pre-entry split only; it does not install rank behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Blocked/no-chase rows: ${report.summary.blockedNoChaseRows} at problem rate ${report.summary.blockedNoChaseProblemRate}.`,
    `- Not-applicable/no-no-chase rows: ${report.summary.notApplicableNoNoChaseRows} at winner rate ${report.summary.notApplicableNoNoChaseWinnerRate}.`,
    `- Gross one-MES P/L delta: ${report.summary.grossDeltaOneMesPl}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Segments',
    '| Segment | Rows | Winners | Problems | No Fill | No Target/Stop | Stopped | Unresolved | P/L | Winner Rate | Problem Rate |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...report.segmentRows.map((row) => `| ${row.segment} | ${row.rows} | ${row.winnerRows} | ${row.problemRows} | ${row.noFillRows} | ${row.noTargetOrStopRows} | ${row.stoppedRows} | ${row.unresolvedRows} | ${row.grossResolvedOneMesPl} | ${row.winnerRate} | ${row.problemRate} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport(args: {
  reportDir?: string;
  replayPackagePath?: string | null;
  outcomePath?: string | null;
  joinedRows?: JoinedRow[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const preentry = args.joinedRows
    ? null
    : buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport({
      reportDir,
      replayPackagePath: args.replayPackagePath,
      outcomePath: args.outcomePath,
    }, generatedAt);
  const joinedRows = args.joinedRows || preentry?.joinedRows || [];
  const segmentRows = segmentStats(joinedRows);
  const blockedNoChase = segmentRows.find((row) => row.segment === 'blocked_no_chase') || null;
  const notApplicable = segmentRows.find((row) => row.segment === 'not_applicable_no_no_chase') || null;
  const blockers = [
    preentry && preentry.status !== 'pass' ? `pre-entry miner status ${preentry.status}` : null,
    joinedRows.length === 0 ? 'no joined Sweep morning LONG rows available' : null,
    !blockedNoChase || blockedNoChase.rows < 8 ? 'blocked/no-chase segment too small' : null,
    !notApplicable || notApplicable.rows < 8 ? 'not-applicable/no-no-chase segment too small' : null,
  ].filter((item): item is string => Boolean(item));
  const grossDelta = round((notApplicable?.grossResolvedOneMesPl || 0) - (blockedNoChase?.grossResolvedOneMesPl || 0));
  const strongEnough = Boolean(
    blockedNoChase
    && notApplicable
    && blockedNoChase.problemRate >= 0.7
    && notApplicable.winnerRate >= 0.7
    && grossDelta > 0,
  );
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_nochase_split_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      replayPackagePath: args.replayPackagePath || preentry?.source.replayPackagePath || null,
      outcomePath: args.outcomePath || preentry?.source.outcomePath || null,
    },
    assumptions: {
      savedReportsOnly: true,
      validatesCompositePreentrySplitOnly: true,
      outcomesUsedOnlyForResearchLabels: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      joinedRows: joinedRows.length,
      blockedNoChaseRows: blockedNoChase?.rows || 0,
      notApplicableNoNoChaseRows: notApplicable?.rows || 0,
      blockedNoChaseProblemRate: blockedNoChase?.problemRate || 0,
      notApplicableNoNoChaseWinnerRate: notApplicable?.winnerRate || 0,
      grossDeltaOneMesPl: grossDelta,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : strongEnough
          ? 'prepare_research_only_rank_simulation'
          : 'keep_as_review_note',
    },
    segmentRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix joined row inputs before validating the no-chase split.']
      : strongEnough
        ? ['Next run a research-only rank simulation using the no-chase/HTF line split. Do not install runtime behavior from this report alone.']
        : ['Keep the no-chase/HTF line split as a review note until a stronger simulation proves ranking value.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport({
    reportDir,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-nochase-split-validation-${Date.now()}.json`);
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
