import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Verdict = 'winner_rescue_candidate' | 'caution_candidate' | 'mixed_or_too_small';

interface JoinedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeLabel: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  resolvedOneMesPl: number | null;
  fields: Record<string, string>;
}

interface ScannerFieldMinerReport {
  status?: string;
  joinedRows?: JoinedRow[];
}

interface FeatureStatRow {
  feature: string;
  value: string;
  totalRows: number;
  winnerRows: number;
  problemRows: number;
  unresolvedRows: number;
  grossResolvedOneMesPl: number;
  winnerRate: number;
  problemRate: number;
  verdict: Verdict;
}

export interface RawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_blocked_caution_pocket_drilldown';
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
    scannerFieldMinerPath: string | null;
    filter: {
      setupType: 'SweepMssFvgRetrace';
      session: 'lunch';
      direction: 'LONG';
      cautionPocket: 'hasNoChaseMissingEvidence=true OR htfLineInSandStatus=blocked';
    };
  };
  assumptions: {
    savedReportsOnly: true;
    drilldownOnly: true;
    usesScannerOwnedFieldsOnly: true;
    outcomesUsedOnlyForResearchLabels: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    joinedRows: number;
    cautionRows: number;
    winnerRows: number;
    problemRows: number;
    unresolvedRows: number;
    featureStats: number;
    winnerRescueCandidates: number;
    cautionCandidates: number;
    bestWinnerRescueCandidate: string | null;
    bestCautionCandidate: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_caution_pocket_separator' | 'keep_research_only' | 'fix_inputs';
  };
  featureStats: FeatureStatRow[];
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

function isTarget(row: JoinedRow): boolean {
  return row.setupType === 'SweepMssFvgRetrace' && row.session === 'lunch' && row.direction === 'LONG';
}

function isCautionPocket(row: JoinedRow): boolean {
  return row.fields.hasNoChaseMissingEvidence === 'true' || row.fields.htfLineInSandStatus === 'blocked';
}

function isWinner(row: JoinedRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: JoinedRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function verdictFor(args: { totalRows: number; winnerRate: number; problemRate: number; grossResolvedOneMesPl: number }): Verdict {
  if (args.totalRows >= 5 && args.winnerRate >= 0.65 && args.problemRate <= 0.35 && args.grossResolvedOneMesPl > 0) return 'winner_rescue_candidate';
  if (args.totalRows >= 5 && args.problemRate >= 0.65 && args.winnerRate <= 0.35) return 'caution_candidate';
  return 'mixed_or_too_small';
}

function buildFeatureStats(rows: JoinedRow[]): FeatureStatRow[] {
  const ignored = new Set(['hasNoChaseMissingEvidence', 'htfLineInSandStatus']);
  const groups = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    for (const [feature, value] of Object.entries(row.fields)) {
      if (ignored.has(feature)) continue;
      groups.set(`${feature}=${value}`, [...(groups.get(`${feature}=${value}`) || []), row]);
    }
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const separator = key.indexOf('=');
    const feature = key.slice(0, separator);
    const value = key.slice(separator + 1);
    const winnerRows = groupRows.filter(isWinner).length;
    const problemRows = groupRows.filter(isProblem).length;
    const grossResolvedOneMesPl = round(groupRows.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0));
    const winnerRate = round(winnerRows / groupRows.length);
    const problemRate = round(problemRows / groupRows.length);
    return {
      feature,
      value,
      totalRows: groupRows.length,
      winnerRows,
      problemRows,
      unresolvedRows: groupRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      grossResolvedOneMesPl,
      winnerRate,
      problemRate,
      verdict: verdictFor({ totalRows: groupRows.length, winnerRate, problemRate, grossResolvedOneMesPl }),
    };
  }).sort((a, b) => (
    Number(b.verdict === 'winner_rescue_candidate') - Number(a.verdict === 'winner_rescue_candidate')
    || Number(b.verdict === 'caution_candidate') - Number(a.verdict === 'caution_candidate')
    || b.winnerRate - a.winnerRate
    || b.problemRate - a.problemRate
    || b.totalRows - a.totalRows
    || a.feature.localeCompare(b.feature)
  ));
}

function authority(): RawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch LONG Blocked Caution Pocket Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Caution rows: ${report.summary.cautionRows}.`,
    `- Winner/problem/unresolved rows: ${report.summary.winnerRows} / ${report.summary.problemRows} / ${report.summary.unresolvedRows}.`,
    `- Winner-rescue/caution candidates: ${report.summary.winnerRescueCandidates} / ${report.summary.cautionCandidates}.`,
    `- Best winner-rescue candidate: ${report.summary.bestWinnerRescueCandidate || 'none'}.`,
    `- Best caution candidate: ${report.summary.bestCautionCandidate || 'none'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport(args: {
  reportDir?: string;
  scannerFieldMinerPath?: string | null;
  scannerFieldMiner?: ScannerFieldMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const scannerFieldMinerPath = args.scannerFieldMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-scanner-field-miner-');
  const scannerFieldMiner = args.scannerFieldMiner ?? readJson<ScannerFieldMinerReport>(scannerFieldMinerPath);
  const joinedRows = (scannerFieldMiner?.joinedRows || []).filter(isTarget);
  const cautionRows = joinedRows.filter(isCautionPocket);
  const featureStats = buildFeatureStats(cautionRows);
  const winnerRescueCandidates = featureStats.filter((row) => row.verdict === 'winner_rescue_candidate');
  const cautionCandidates = featureStats.filter((row) => row.verdict === 'caution_candidate');
  const blockers = [
    !scannerFieldMinerPath && !args.scannerFieldMiner ? 'missing scanner field miner path' : null,
    !scannerFieldMiner ? 'missing scanner field miner report' : null,
    scannerFieldMiner && scannerFieldMiner.status !== 'pass' ? `scanner field miner status ${scannerFieldMiner.status}` : null,
    joinedRows.length === 0 ? 'no SweepMssFvgRetrace lunch LONG joined scanner rows found' : null,
    cautionRows.length === 0 ? 'no blocked/no-chase caution rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_blocked_caution_pocket_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      scannerFieldMinerPath,
      filter: {
        setupType: 'SweepMssFvgRetrace',
        session: 'lunch',
        direction: 'LONG',
        cautionPocket: 'hasNoChaseMissingEvidence=true OR htfLineInSandStatus=blocked',
      },
    },
    assumptions: {
      savedReportsOnly: true,
      drilldownOnly: true,
      usesScannerOwnedFieldsOnly: true,
      outcomesUsedOnlyForResearchLabels: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      joinedRows: joinedRows.length,
      cautionRows: cautionRows.length,
      winnerRows: cautionRows.filter(isWinner).length,
      problemRows: cautionRows.filter(isProblem).length,
      unresolvedRows: cautionRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      featureStats: featureStats.length,
      winnerRescueCandidates: winnerRescueCandidates.length,
      cautionCandidates: cautionCandidates.length,
      bestWinnerRescueCandidate: winnerRescueCandidates[0] ? `${winnerRescueCandidates[0].feature}=${winnerRescueCandidates[0].value}` : null,
      bestCautionCandidate: cautionCandidates[0] ? `${cautionCandidates[0].feature}=${cautionCandidates[0].value}` : null,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : winnerRescueCandidates.length || cautionCandidates.length
          ? 'validate_caution_pocket_separator'
          : 'keep_research_only',
    },
    featureStats: featureStats.slice(0, 80),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved scanner-field miner input before blocked/no-chase caution pocket drilldown.']
      : winnerRescueCandidates.length || cautionCandidates.length
        ? ['Validate caution-pocket separator candidates before any scanner-visible behavior.']
        : ['No blocked/no-chase caution-pocket separator is strong enough from this pass.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchLongBlockedCautionPocketDrilldownReport({
    reportDir,
    scannerFieldMinerPath: readFlag(args, '--scanner-field-miner') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-long-blocked-caution-pocket-drilldown-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, topFeatureStats: report.featureStats.slice(0, 10), blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
