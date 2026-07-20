import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  summary?: {
    bestPositiveCandidate?: string | null;
    bestNegativeCandidate?: string | null;
  };
  joinedRows?: JoinedRow[];
}

interface SlateRow {
  slateId: string;
  rows: number;
  baselineTicketId: string | null;
  baselineOutcomeLabel: string | null;
  baselineOneMesPl: number | null;
  simulatedTicketId: string | null;
  simulatedOutcomeLabel: string | null;
  simulatedOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_full_day_scanner_field_selection_simulation';
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
  };
  assumptions: {
    savedReportsOnly: true;
    selectionSimulationOnly: true;
    baselineUsesEarliestProofPerSlate: true;
    simulatedUsesScannerOwnedFieldsOnly: true;
    outcomesUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  scoring: {
    positiveCandidate: string | null;
    negativeCandidate: string | null;
    positiveBoostPoints: number;
    negativePenaltyPoints: number;
  };
  summary: {
    joinedRows: number;
    slates: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_on_broader_scanner_fields' | 'keep_research_only' | 'fix_inputs';
  };
  slates: SlateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const POSITIVE_BOOST_POINTS = 100;
const NEGATIVE_PENALTY_POINTS = 100;

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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function parseCandidate(candidate: string | null | undefined): { feature: string; value: string } | null {
  if (!candidate) return null;
  const index = candidate.indexOf('=');
  if (index <= 0) return null;
  return { feature: candidate.slice(0, index), value: candidate.slice(index + 1) };
}

function matches(row: JoinedRow, candidate: { feature: string; value: string } | null): boolean {
  return Boolean(candidate && row.fields[candidate.feature] === candidate.value);
}

function score(row: JoinedRow, positive: { feature: string; value: string } | null, negative: { feature: string; value: string } | null): number {
  return (matches(row, positive) ? POSITIVE_BOOST_POINTS : 0) - (matches(row, negative) ? NEGATIVE_PENALTY_POINTS : 0);
}

function isTarget(row: JoinedRow): boolean {
  return row.setupType === 'SweepMssFvgRetrace' && row.session === 'lunch' && row.direction === 'SHORT';
}

function groupBySlate(rows: JoinedRow[]): Map<string, JoinedRow[]> {
  const groups = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function compareProof(a: JoinedRow, b: JoinedRow): number {
  return a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId);
}

function compareSimulated(positive: { feature: string; value: string } | null, negative: { feature: string; value: string } | null) {
  return (a: JoinedRow, b: JoinedRow): number => (
    score(b, positive, negative) - score(a, positive, negative)
    || compareProof(a, b)
  );
}

function buildSlates(rows: JoinedRow[], positive: { feature: string; value: string } | null, negative: { feature: string; value: string } | null): SlateRow[] {
  return [...groupBySlate(rows).entries()].map(([slateId, slateRows]) => {
    const baseline = [...slateRows].sort(compareProof)[0] || null;
    const simulated = [...slateRows].sort(compareSimulated(positive, negative))[0] || null;
    return {
      slateId,
      rows: slateRows.length,
      baselineTicketId: baseline?.ticketId || null,
      baselineOutcomeLabel: baseline?.outcomeLabel || null,
      baselineOneMesPl: baseline?.resolvedOneMesPl ?? null,
      simulatedTicketId: simulated?.ticketId || null,
      simulatedOutcomeLabel: simulated?.outcomeLabel || null,
      simulatedOneMesPl: simulated?.resolvedOneMesPl ?? null,
      topChanged: Boolean(baseline && simulated && baseline.ticketId !== simulated.ticketId),
      deltaOneMesPl: typeof baseline?.resolvedOneMesPl === 'number' && typeof simulated?.resolvedOneMesPl === 'number'
        ? round(simulated.resolvedOneMesPl - baseline.resolvedOneMesPl)
        : null,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function authority(): RawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep lunch SHORT Full-Day Scanner Field Selection Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact selection simulation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/simulated top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport(args: {
  reportDir?: string;
  scannerFieldMinerPath?: string | null;
  scannerFieldMiner?: ScannerFieldMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const scannerFieldMinerPath = args.scannerFieldMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-scanner-field-miner-');
  const scannerFieldMiner = args.scannerFieldMiner ?? readJson<ScannerFieldMinerReport>(scannerFieldMinerPath);
  const positiveCandidate = scannerFieldMiner?.summary?.bestPositiveCandidate || null;
  const negativeCandidate = scannerFieldMiner?.summary?.bestNegativeCandidate || null;
  const positive = parseCandidate(positiveCandidate);
  const negative = parseCandidate(negativeCandidate);
  const joinedRows = (scannerFieldMiner?.joinedRows || []).filter(isTarget);
  const slates = buildSlates(joinedRows, positive, negative);
  const baselineTopOneMesPl = sum(slates.map((slate) => slate.baselineOneMesPl));
  const simulatedTopOneMesPl = sum(slates.map((slate) => slate.simulatedOneMesPl));
  const delta = sum(slates.map((slate) => slate.deltaOneMesPl));
  const blockers = [
    !scannerFieldMinerPath && !args.scannerFieldMiner ? 'missing scanner field miner path' : null,
    !scannerFieldMiner ? 'missing scanner field miner report' : null,
    scannerFieldMiner && scannerFieldMiner.status !== 'pass' ? `scanner field miner status ${scannerFieldMiner.status}` : null,
    !positive ? 'missing parseable positive candidate' : null,
    !negative ? 'missing parseable negative candidate' : null,
    joinedRows.length === 0 ? 'no SweepMssFvgRetrace lunch SHORT joined scanner rows found' : null,
    slates.length === 0 ? 'no lunch SHORT slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const proposalWorthValidating = !blockers.length && typeof delta === 'number' && delta > 0 && slates.some((slate) => slate.topChanged);
  const base: Omit<RawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_full_day_scanner_field_selection_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, scannerFieldMinerPath },
    assumptions: {
      savedReportsOnly: true,
      selectionSimulationOnly: true,
      baselineUsesEarliestProofPerSlate: true,
      simulatedUsesScannerOwnedFieldsOnly: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    scoring: {
      positiveCandidate,
      negativeCandidate,
      positiveBoostPoints: POSITIVE_BOOST_POINTS,
      negativePenaltyPoints: NEGATIVE_PENALTY_POINTS,
    },
    summary: {
      joinedRows: joinedRows.length,
      slates: slates.length,
      changedSlates: slates.filter((slate) => slate.topChanged).length,
      baselineTopOneMesPl,
      simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : proposalWorthValidating ? 'validate_on_broader_scanner_fields' : 'keep_research_only',
    },
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved scanner-field miner input before selection simulation.']
      : proposalWorthValidating
        ? ['Validate the same scanner-field candidates on the broader scanner-field set before any live-facing proposal.']
        : ['Keep the scanner-field buckets research-only; this simulation did not prove top-selection improvement.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport({
    reportDir,
    scannerFieldMinerPath: readFlag(args, '--scanner-field-miner') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-scanner-field-selection-simulation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, scoring: report.scoring, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
