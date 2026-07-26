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
  };
  joinedRows?: JoinedRow[];
}

interface CautionPocketDrilldownReport {
  status?: string;
  summary?: {
    bestCautionCandidate?: string | null;
  };
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

export interface RawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_caution_pocket_selection_validation';
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
    cautionPocketDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    selectionValidationOnly: true;
    baselineUsesEarliestProofPerSlate: true;
    simulatedUsesScannerOwnedFieldsOnly: true;
    outcomesUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  scoring: {
    positiveCandidate: string | null;
    cautionCandidate: string | null;
    positiveBoostPoints: number;
    cautionPenaltyPoints: number;
  };
  summary: {
    joinedRows: number;
    cautionRows: number;
    slates: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    changedResolvedDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'keep_research_only' | 'validate_on_broader_history' | 'fix_inputs';
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
const CAUTION_PENALTY_POINTS = 100;

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

function parseCandidate(candidate: string | null | undefined): { feature: string; value: string } | null {
  if (!candidate) return null;
  const index = candidate.indexOf('=');
  if (index <= 0) return null;
  return { feature: candidate.slice(0, index), value: candidate.slice(index + 1) };
}

function matches(row: JoinedRow, candidate: { feature: string; value: string } | null): boolean {
  return Boolean(candidate && row.fields[candidate.feature] === candidate.value);
}

function isTarget(row: JoinedRow): boolean {
  return row.setupType === 'NoInstalledSetup' && row.session === 'lunch' && row.direction === 'LONG';
}

function isCautionPocket(row: JoinedRow): boolean {
  return row.fields.hasNoChaseMissingEvidence === 'true' || row.fields.htfLineInSandStatus === 'blocked';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function score(row: JoinedRow, positive: { feature: string; value: string } | null, caution: { feature: string; value: string } | null): number {
  return (matches(row, positive) ? POSITIVE_BOOST_POINTS : 0)
    - (isCautionPocket(row) && matches(row, caution) ? CAUTION_PENALTY_POINTS : 0);
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

function compareSimulated(positive: { feature: string; value: string } | null, caution: { feature: string; value: string } | null) {
  return (a: JoinedRow, b: JoinedRow): number => (
    score(b, positive, caution) - score(a, positive, caution)
    || compareProof(a, b)
  );
}

function buildSlates(rows: JoinedRow[], positive: { feature: string; value: string } | null, caution: { feature: string; value: string } | null): SlateRow[] {
  return [...groupBySlate(rows).entries()].map(([slateId, slateRows]) => {
    const baseline = [...slateRows].sort(compareProof)[0] || null;
    const simulated = [...slateRows].sort(compareSimulated(positive, caution))[0] || null;
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

function authority(): RawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch LONG Caution Pocket Selection Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact selection validation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Joined/caution rows: ${report.summary.joinedRows}/${report.summary.cautionRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/simulated top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Changed resolved delta: ${report.summary.changedResolvedDeltaOneMesPl ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport(args: {
  reportDir?: string;
  scannerFieldMinerPath?: string | null;
  cautionPocketDrilldownPath?: string | null;
  scannerFieldMiner?: ScannerFieldMinerReport | null;
  cautionPocketDrilldown?: CautionPocketDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const scannerFieldMinerPath = args.scannerFieldMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-scanner-field-miner-');
  const cautionPocketDrilldownPath = args.cautionPocketDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-long-blocked-caution-pocket-drilldown-');
  const scannerFieldMiner = args.scannerFieldMiner ?? readJson<ScannerFieldMinerReport>(scannerFieldMinerPath);
  const cautionPocketDrilldown = args.cautionPocketDrilldown ?? readJson<CautionPocketDrilldownReport>(cautionPocketDrilldownPath);
  const positiveCandidate = scannerFieldMiner?.summary?.bestPositiveCandidate || null;
  const cautionCandidate = cautionPocketDrilldown?.summary?.bestCautionCandidate || null;
  const positive = parseCandidate(positiveCandidate);
  const caution = parseCandidate(cautionCandidate);
  const joinedRows = (scannerFieldMiner?.joinedRows || []).filter(isTarget);
  const slates = buildSlates(joinedRows, positive, caution);
  const changed = slates.filter((slate) => slate.topChanged);
  const baselineTopOneMesPl = sum(slates.map((slate) => slate.baselineOneMesPl));
  const simulatedTopOneMesPl = sum(slates.map((slate) => slate.simulatedOneMesPl));
  const delta = sum(slates.map((slate) => slate.deltaOneMesPl));
  const changedResolvedDelta = sum(changed.map((slate) => slate.deltaOneMesPl));
  const blockers = [
    !scannerFieldMinerPath && !args.scannerFieldMiner ? 'missing scanner field miner path' : null,
    !cautionPocketDrilldownPath && !args.cautionPocketDrilldown ? 'missing caution pocket drilldown path' : null,
    !scannerFieldMiner ? 'missing scanner field miner report' : null,
    !cautionPocketDrilldown ? 'missing caution pocket drilldown report' : null,
    scannerFieldMiner && scannerFieldMiner.status !== 'pass' ? `scanner field miner status ${scannerFieldMiner.status}` : null,
    cautionPocketDrilldown && cautionPocketDrilldown.status !== 'pass' ? `caution pocket drilldown status ${cautionPocketDrilldown.status}` : null,
    !positive ? 'missing parseable positive candidate' : null,
    !caution ? 'missing parseable caution candidate' : null,
    joinedRows.length === 0 ? 'no NoInstalledSetup lunch LONG joined scanner rows found' : null,
    slates.length === 0 ? 'no lunch LONG slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const proposalWorthValidating = !blockers.length && typeof delta === 'number' && delta > 0 && changed.length > 0;
  const base: Omit<RawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_caution_pocket_selection_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, scannerFieldMinerPath, cautionPocketDrilldownPath },
    assumptions: {
      savedReportsOnly: true,
      selectionValidationOnly: true,
      baselineUsesEarliestProofPerSlate: true,
      simulatedUsesScannerOwnedFieldsOnly: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    scoring: {
      positiveCandidate,
      cautionCandidate,
      positiveBoostPoints: POSITIVE_BOOST_POINTS,
      cautionPenaltyPoints: CAUTION_PENALTY_POINTS,
    },
    summary: {
      joinedRows: joinedRows.length,
      cautionRows: joinedRows.filter(isCautionPocket).length,
      slates: slates.length,
      changedSlates: changed.length,
      baselineTopOneMesPl,
      simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      changedResolvedDeltaOneMesPl: changedResolvedDelta,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : proposalWorthValidating ? 'validate_on_broader_history' : 'keep_research_only',
    },
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved scanner-field miner/caution drilldown inputs before selection validation.']
      : proposalWorthValidating
        ? ['Validate this caution-pocket selection behavior on broader history before any live-facing proposal.']
        : ['Keep the caution-pocket candidate research-only; this selection validation did not improve top selection.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchLongCautionPocketSelectionValidationReport({
    reportDir,
    scannerFieldMinerPath: readFlag(args, '--scanner-field-miner') || undefined,
    cautionPocketDrilldownPath: readFlag(args, '--caution-pocket-drilldown') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-long-caution-pocket-selection-validation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, scoring: report.scoring, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
