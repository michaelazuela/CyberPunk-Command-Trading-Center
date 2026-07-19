import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface OverlayRow {
  slateId: string;
  proofTime: string;
  classLabel: 'winner' | 'problem';
  resolvedOneMesPl: number | null;
  overlaySelected: boolean;
  overlayReason: string;
}

interface OverlayReport {
  status?: string;
  overlayRows?: OverlayRow[];
}

interface SelectionRow {
  groupId: string;
  baselineSlateId: string;
  baselineClassLabel: 'winner' | 'problem';
  baselineResolvedOneMesPl: number | null;
  overlaySlateId: string;
  overlayClassLabel: 'winner' | 'problem';
  overlayResolvedOneMesPl: number | null;
  overlayReason: string;
  changedSelection: boolean;
  plDelta: number;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_positive_lane_top_selection_validation';
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
    overlaySimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    baselineSelectsEarliestRetainedSlatePerDateSession: true;
    overlayPrefersEarliestPositiveLaneSlateWhenPresent: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    dateSessionGroups: number;
    changedSelections: number;
    baselineWinnerSelections: number;
    overlayWinnerSelections: number;
    baselineGrossResolvedOneMesPl: number | null;
    overlayGrossResolvedOneMesPl: number | null;
    grossResolvedOneMesPlDelta: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'do_not_install_no_effect_runtime_boost' | 'fix_inputs';
  };
  selectionRows: SelectionRow[];
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

function readJson(filePath: string | null): OverlayReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as OverlayReport;
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumResolved(rows: Pick<SelectionRow, 'baselineResolvedOneMesPl' | 'overlayResolvedOneMesPl'>[], side: 'baseline' | 'overlay'): number | null {
  const key = side === 'baseline' ? 'baselineResolvedOneMesPl' : 'overlayResolvedOneMesPl';
  const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === 'number');
  return values.length ? round(values.reduce((sum, value) => sum + value, 0)) : null;
}

function delta(after: number | null, before: number | null): number | null {
  if (after === null || before === null) return null;
  return round(after - before);
}

function groupId(row: OverlayRow): string {
  const [tradeDate, session] = row.slateId.split('|');
  return `${tradeDate}|${session}`;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Positive-Lane Top Selection Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report top-selection validation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Date/session groups: ${report.summary.dateSessionGroups}.`,
    `- Changed selections: ${report.summary.changedSelections}.`,
    `- Baseline/overlay winner selections: ${report.summary.baselineWinnerSelections}/${report.summary.overlayWinnerSelections}.`,
    `- Baseline gross resolved one-MES P/L: ${report.summary.baselineGrossResolvedOneMesPl ?? '-'}.`,
    `- Overlay gross resolved one-MES P/L: ${report.summary.overlayGrossResolvedOneMesPl ?? '-'}.`,
    `- Gross resolved one-MES P/L delta: ${report.summary.grossResolvedOneMesPlDelta ?? '-'}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport(args: {
  reportDir?: string;
  overlaySimulationPath?: string | null;
  overlaySimulation?: OverlayReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const overlaySimulationPath = args.overlaySimulationPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-overlay-simulation-');
  const overlaySimulation = args.overlaySimulation ?? readJson(overlaySimulationPath);
  const groups = new Map<string, OverlayRow[]>();
  for (const row of overlaySimulation?.overlayRows || []) groups.set(groupId(row), [...(groups.get(groupId(row)) || []), row]);
  const selectionRows: SelectionRow[] = [...groups.entries()].map(([id, rows]) => {
    const sorted = [...rows].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
    const baseline = sorted[0];
    const overlay = sorted.find((row) => row.overlaySelected) || baseline;
    return {
      groupId: id,
      baselineSlateId: baseline.slateId,
      baselineClassLabel: baseline.classLabel,
      baselineResolvedOneMesPl: baseline.resolvedOneMesPl,
      overlaySlateId: overlay.slateId,
      overlayClassLabel: overlay.classLabel,
      overlayResolvedOneMesPl: overlay.resolvedOneMesPl,
      overlayReason: overlay.overlayReason,
      changedSelection: baseline.slateId !== overlay.slateId,
      plDelta: round((overlay.resolvedOneMesPl || 0) - (baseline.resolvedOneMesPl || 0)),
    };
  }).sort((a, b) => a.groupId.localeCompare(b.groupId));
  const baselineGross = sumResolved(selectionRows, 'baseline');
  const overlayGross = sumResolved(selectionRows, 'overlay');
  const blockers = [
    !overlaySimulationPath ? 'missing positive-lane overlay simulation report path' : null,
    !overlaySimulation ? 'missing positive-lane overlay simulation report' : null,
    overlaySimulation && overlaySimulation.status !== 'pass' ? `positive-lane overlay simulation status ${overlaySimulation.status}` : null,
    selectionRows.length === 0 ? 'overlay simulation has no rows to group' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_positive_lane_top_selection_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, overlaySimulationPath },
    assumptions: {
      savedReportsOnly: true,
      baselineSelectsEarliestRetainedSlatePerDateSession: true,
      overlayPrefersEarliestPositiveLaneSlateWhenPresent: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      dateSessionGroups: selectionRows.length,
      changedSelections: selectionRows.filter((row) => row.changedSelection).length,
      baselineWinnerSelections: selectionRows.filter((row) => row.baselineClassLabel === 'winner').length,
      overlayWinnerSelections: selectionRows.filter((row) => row.overlayClassLabel === 'winner').length,
      baselineGrossResolvedOneMesPl: baselineGross,
      overlayGrossResolvedOneMesPl: overlayGross,
      grossResolvedOneMesPlDelta: delta(overlayGross, baselineGross),
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'do_not_install_no_effect_runtime_boost',
    },
    selectionRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix overlay simulation input before top-selection validation.']
      : [
        'Do not install the positive-lane boost into runtime ranking from this evidence; it changed zero same-session selections.',
        'Next mine richer same-session competition fields or validate on a dataset where multiple retained candidates compete for top selection.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneTopSelectionValidationReport({
    reportDir,
    overlaySimulationPath: readFlag(args, '--overlay-simulation') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-top-selection-validation-${Date.now()}.json`);
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
