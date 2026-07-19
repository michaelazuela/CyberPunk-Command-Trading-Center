import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface RetainedSlateFeatureRow {
  slateId: string;
  classLabel: 'winner' | 'problem';
  resolvedOneMesPl: number | null;
  features: Record<string, string>;
}

interface SeparatorMinerReport {
  status?: string;
  retainedSlateRows?: RetainedSlateFeatureRow[];
}

interface OverlayRow extends RetainedSlateFeatureRow {
  overlaySelected: boolean;
  overlayReason: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_positive_lane_overlay_simulation';
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
    separatorMinerPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    overlayIsPriorityBoostOnly: true;
    notAHardFilter: true;
    positiveLaneUnion: ['riskBucket=risk_lt_10', 'proofWindow=proof_14_to_15'];
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    retainedSlates: number;
    retainedWinnerSlates: number;
    retainedProblemSlates: number;
    retainedGrossResolvedOneMesPl: number | null;
    overlaySelectedSlates: number;
    overlaySelectedWinnerSlates: number;
    overlaySelectedProblemSlates: number;
    overlaySelectedGrossResolvedOneMesPl: number | null;
    overlayPrecision: number | null;
    baselinePrecision: number | null;
    overlayWinnerRecall: number | null;
    nonSelectedWinnerSlates: number;
    nonSelectedGrossResolvedOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_as_priority_boost_not_hard_filter' | 'fix_inputs';
  };
  overlayRows: OverlayRow[];
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

function readJson(filePath: string | null): SeparatorMinerReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SeparatorMinerReport;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumResolved(rows: Pick<RetainedSlateFeatureRow, 'resolvedOneMesPl'>[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number');
  return values.length ? round(values.reduce((sum, value) => sum + value, 0)) : null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return round(numerator / denominator);
}

function overlayReason(row: RetainedSlateFeatureRow): string | null {
  const reasons = [];
  if (row.features.riskBucket === 'risk_lt_10') reasons.push('riskBucket=risk_lt_10');
  if (row.features.proofWindow === 'proof_14_to_15') reasons.push('proofWindow=proof_14_to_15');
  return reasons.length ? reasons.join(';') : null;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Positive-Lane Overlay Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report overlay simulation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Retained winner/problem slates: ${report.summary.retainedWinnerSlates}/${report.summary.retainedProblemSlates}.`,
    `- Retained gross resolved one-MES P/L: ${report.summary.retainedGrossResolvedOneMesPl ?? '-'}.`,
    `- Overlay selected winner/problem slates: ${report.summary.overlaySelectedWinnerSlates}/${report.summary.overlaySelectedProblemSlates}.`,
    `- Overlay selected gross resolved one-MES P/L: ${report.summary.overlaySelectedGrossResolvedOneMesPl ?? '-'}.`,
    `- Baseline precision: ${report.summary.baselinePrecision ?? '-'}.`,
    `- Overlay precision: ${report.summary.overlayPrecision ?? '-'}.`,
    `- Overlay winner recall: ${report.summary.overlayWinnerRecall ?? '-'}.`,
    `- Non-selected winner slates: ${report.summary.nonSelectedWinnerSlates}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport(args: {
  reportDir?: string;
  separatorMinerPath?: string | null;
  separatorMiner?: SeparatorMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const separatorMinerPath = args.separatorMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-retained-residue-separator-miner-');
  const separatorMiner = args.separatorMiner ?? readJson(separatorMinerPath);
  const retainedRows = separatorMiner?.retainedSlateRows || [];
  const overlayRows: OverlayRow[] = retainedRows.map((row) => {
    const reason = overlayReason(row);
    return { ...row, overlaySelected: Boolean(reason), overlayReason: reason || 'not in positive-lane union' };
  });
  const selected = overlayRows.filter((row) => row.overlaySelected);
  const winners = overlayRows.filter((row) => row.classLabel === 'winner');
  const selectedWinners = selected.filter((row) => row.classLabel === 'winner');
  const nonSelectedWinners = overlayRows.filter((row) => !row.overlaySelected && row.classLabel === 'winner');
  const blockers = [
    !separatorMinerPath ? 'missing separator miner report path' : null,
    !separatorMiner ? 'missing separator miner report' : null,
    separatorMiner && separatorMiner.status !== 'pass' ? `separator miner status ${separatorMiner.status}` : null,
    retainedRows.length === 0 ? 'separator miner has no retained slate rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_positive_lane_overlay_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, separatorMinerPath },
    assumptions: {
      savedReportsOnly: true,
      overlayIsPriorityBoostOnly: true,
      notAHardFilter: true,
      positiveLaneUnion: ['riskBucket=risk_lt_10', 'proofWindow=proof_14_to_15'],
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      retainedSlates: overlayRows.length,
      retainedWinnerSlates: winners.length,
      retainedProblemSlates: overlayRows.filter((row) => row.classLabel === 'problem').length,
      retainedGrossResolvedOneMesPl: sumResolved(overlayRows),
      overlaySelectedSlates: selected.length,
      overlaySelectedWinnerSlates: selectedWinners.length,
      overlaySelectedProblemSlates: selected.filter((row) => row.classLabel === 'problem').length,
      overlaySelectedGrossResolvedOneMesPl: sumResolved(selected),
      overlayPrecision: ratio(selectedWinners.length, selected.length),
      baselinePrecision: ratio(winners.length, overlayRows.length),
      overlayWinnerRecall: ratio(selectedWinners.length, winners.length),
      nonSelectedWinnerSlates: nonSelectedWinners.length,
      nonSelectedGrossResolvedOneMesPl: sumResolved(nonSelectedWinners),
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'validate_as_priority_boost_not_hard_filter',
    },
    overlayRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix separator miner inputs before overlay simulation.']
      : [
        'Use the positive-lane union only as a research-side priority boost candidate; it is too narrow to be a hard filter.',
        'Validate whether low risk and 14:00-15:00 proof window improve top-slate selection when multiple retained slates compete.',
        'Keep runtime rank consumer disabled until a scanner-artifact top-selection simulation passes.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorPositiveLaneOverlaySimulationReport({
    reportDir,
    separatorMinerPath: readFlag(args, '--separator-miner') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-overlay-simulation-${Date.now()}.json`);
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
