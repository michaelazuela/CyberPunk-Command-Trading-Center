import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Recommendation = 'focus_weakest_model_session_direction' | 'broaden_outcome_source' | 'fix_inputs';

interface OutcomeRow {
  setupType: string;
  session: string;
  direction: 'LONG' | 'SHORT';
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
}

interface OutcomeReport {
  status?: string;
  rows?: OutcomeRow[];
}

interface RollupRow {
  groupId: string;
  setupType: string;
  session: string;
  direction: 'LONG' | 'SHORT';
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  winnerRows: number;
  problemRows: number;
  stoppedRows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  grossResolvedOneMesPl: number;
  winnerRate: number;
  problemRate: number;
  researchPriority: 'weak_pocket' | 'strong_pocket' | 'mixed_watch';
}

export interface RawOhlcScannerArtifactModelSessionDirectionRollupReport {
  reportType: 'raw_ohlc_scanner_artifact_model_session_direction_rollup';
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
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    repeatedRowsAreResearchRowsNotIndependentLiveTrades: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    outcomeRows: number;
    groups: number;
    weakestGroupId: string | null;
    weakestProblemRate: number;
    strongestGroupId: string | null;
    strongestGrossResolvedOneMesPl: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: Recommendation;
  };
  rollupRows: RollupRow[];
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
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

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function priority(row: RollupRow): RollupRow['researchPriority'] {
  if (row.rows >= 20 && row.problemRate >= 0.5) return 'weak_pocket';
  if (row.rows >= 20 && row.winnerRate >= 0.7) return 'strong_pocket';
  return 'mixed_watch';
}

function authority(): RawOhlcScannerArtifactModelSessionDirectionRollupReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactModelSessionDirectionRollupReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Model/Session/Direction Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-outcome rollup. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Groups: ${report.summary.groups}.`,
    `- Weakest group: ${report.summary.weakestGroupId || 'none'} at problem rate ${report.summary.weakestProblemRate}.`,
    `- Strongest group: ${report.summary.strongestGroupId || 'none'} at gross resolved one-MES P/L ${report.summary.strongestGrossResolvedOneMesPl}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactModelSessionDirectionRollupReport(args: {
  reportDir?: string;
  outcomePath?: string | null;
  outcome?: OutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactModelSessionDirectionRollupReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const outcome = args.outcome ?? readJson<OutcomeReport>(outcomePath);
  const rows = outcome?.rows || [];
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const key = `${row.setupType}|${row.session}|${row.direction}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const rollupRows = [...groups.entries()].map(([groupId, groupRows]): RollupRow => {
    const [setupType, session, direction] = groupId.split('|') as [string, string, 'LONG' | 'SHORT'];
    const base: RollupRow = {
      groupId,
      setupType,
      session,
      direction,
      rows: groupRows.length,
      resolvedRows: groupRows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: groupRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      winnerRows: groupRows.filter(isWinner).length,
      problemRows: groupRows.filter(isProblem).length,
      stoppedRows: groupRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      noFillRows: groupRows.filter((row) => row.outcomeLabel === 'no_fill').length,
      noTargetOrStopRows: groupRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      grossResolvedOneMesPl: round(groupRows.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0)),
      winnerRate: round(groupRows.filter(isWinner).length / groupRows.length),
      problemRate: round(groupRows.filter(isProblem).length / groupRows.length),
      researchPriority: 'mixed_watch',
    };
    return { ...base, researchPriority: priority(base) };
  }).sort((a, b) => (
    Number(b.researchPriority === 'weak_pocket') - Number(a.researchPriority === 'weak_pocket')
    || b.problemRate - a.problemRate
    || a.groupId.localeCompare(b.groupId)
  ));
  const weakest = rollupRows.filter((row) => row.rows >= 20).sort((a, b) => b.problemRate - a.problemRate)[0] || null;
  const strongest = [...rollupRows].sort((a, b) => b.grossResolvedOneMesPl - a.grossResolvedOneMesPl)[0] || null;
  const blockers = [
    !outcomePath && !args.outcome ? 'missing outcome report path' : null,
    !outcome ? 'missing outcome report' : null,
    outcome && outcome.status !== 'pass' ? `outcome report status ${outcome.status}` : null,
    rows.length === 0 ? 'outcome report has no rows' : null,
    rollupRows.length === 0 ? 'no model/session/direction groups found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactModelSessionDirectionRollupReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_model_session_direction_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, outcomePath },
    assumptions: {
      savedReportsOnly: true,
      repeatedRowsAreResearchRowsNotIndependentLiveTrades: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      outcomeRows: rows.length,
      groups: rollupRows.length,
      weakestGroupId: weakest?.groupId || null,
      weakestProblemRate: weakest?.problemRate || 0,
      strongestGroupId: strongest?.groupId || null,
      strongestGrossResolvedOneMesPl: strongest?.grossResolvedOneMesPl || 0,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : weakest
          ? 'focus_weakest_model_session_direction'
          : 'broaden_outcome_source',
    },
    rollupRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved outcome input before model/session/direction rollup.']
      : [
        'Use this rollup only to pick the next research target; it is not a rank consumer.',
        weakest ? `Next drill into weakest group ${weakest.groupId} for proof-time and outcome-path causes.` : 'Broaden the outcome source before choosing a narrow model/session target.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactModelSessionDirectionRollupReport({
    reportDir,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-model-session-direction-rollup-${Date.now()}.json`);
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
