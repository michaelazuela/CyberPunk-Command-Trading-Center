import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ChartContext, ExecutionStatus, NoTradeReason, SetupCandidate, SetupType } from '../../src/types';
import { rankSetupCandidate, scanSetupCandidates } from '../../src/lib/setupScanner';

interface CliOptions {
  outDir: string;
  json: boolean;
}

interface ComparisonRow {
  contextId: string;
  candidateKey: string;
  setupType: SetupType;
  direction: SetupCandidate['direction'];
  signalInstalled: boolean;
  selectorDecision: NonNullable<SetupCandidate['proofSelectionSignal']>['selectorDecision'] | null;
  installedRank: number;
  strippedRank: number;
  installedExecutionStatus: ExecutionStatus;
  strippedExecutionStatus: ExecutionStatus;
  installedBlockReason: NoTradeReason | null;
  strippedBlockReason: NoTradeReason | null;
  installedDiscordEligible: boolean | null;
  strippedDiscordEligible: boolean | null;
  installedHumanCanExecute: false | null;
  strippedHumanCanExecute: false | null;
  installedEntry: number | null | undefined;
  strippedEntry: number | null | undefined;
  installedStop: number | null | undefined;
  strippedStop: number | null | undefined;
  installedTarget1: number | null | undefined;
  strippedTarget1: number | null | undefined;
  installedTarget2: number | null | undefined;
  strippedTarget2: number | null | undefined;
  installedRiskPoints: number | null | undefined;
  strippedRiskPoints: number | null | undefined;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_installed_metadata_comparison_audit';
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
    runsSetupScanner: true;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  assumptions: {
    installedMetadataAuditOnly: true;
    comparesInstalledOutputToMetadataStrippedOutput: true;
    rankConsumerDisabled: true;
    scannerVisiblePopulationInstalled: true;
    scannerVisiblePopulationAllowedByThisReport: false;
  };
  summary: {
    contextsScanned: number;
    candidatesCompared: number;
    signalInstalledRows: number;
    keepLaterSweepProofRows: number;
    rankScoreChangedRows: number;
    rankOrderChangedContexts: number;
    executionStatusChangedRows: number;
    blockReasonChangedRows: number;
    discordEligibilityChangedRows: number;
    humanCanExecuteChangedRows: number;
    entryStopTargetRiskChangedRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'installed_metadata_is_inert_prepare_next_rank_consumer_research' | 'fix_installed_metadata_population';
  };
  rows: ComparisonRow[];
  blockers: string[];
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    outDir: path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR),
    json: args.includes('--json'),
  };
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: true,
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

function syntheticContext(args: {
  sessionType: ChartContext['sessionType'];
  direction: 'LONG' | 'SHORT';
  timestamp: string;
  entry: number;
  stop: number;
  target: number;
}): ChartContext {
  const bullish = args.direction === 'LONG';
  return {
    sessionType: args.sessionType,
    chartTimestamp: args.timestamp,
    marketContext: 'Installed metadata comparison audit context.',
    keyLevels: {
      currentPrice: args.entry,
      activeSwingLow: bullish ? args.stop : args.target,
      activeSwingHigh: bullish ? args.target : args.stop,
      overnightHigh: Math.max(args.stop, args.target) + 10,
      overnightLow: Math.min(args.stop, args.target) - 10,
      nearestSupport: bullish ? args.stop : args.target,
      nearestResistance: bullish ? args.target : args.stop,
    },
    marketStructure: {
      trend: bullish ? 'bullish' : 'bearish',
      higherHigh: bullish,
      higherLow: bullish,
      lowerHigh: !bullish,
      lowerLow: !bullish,
      marketStructureShift: true,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: bullish ? 'bullish' : 'bearish',
      expansionCandlePresent: true,
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: true,
      pullbackPresent: true,
      closeAboveKeyLevel: bullish,
      closeBelowKeyLevel: !bullish,
    },
    candles: [{
      index: 0,
      timestamp: args.timestamp,
      open: bullish ? args.entry - 3 : args.entry + 3,
      high: bullish ? args.entry + 1 : args.stop,
      low: bullish ? args.stop : args.entry - 1,
      close: args.entry,
      direction: bullish ? 'bullish' : 'bearish',
      bodyQuality: 'large',
      isExpansion: true,
      confidence: 'High',
    }],
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: true,
      pullbackIntoFvg: true,
      fvgReclaimed: true,
    },
    fvgZones: [{
      direction: args.direction,
      upper: bullish ? args.entry + 0.75 : args.stop - 1,
      lower: bullish ? args.stop + 1 : args.entry - 0.75,
      midpoint: args.entry,
      formedAt: args.timestamp,
      formedCandleIndex: 0,
      filledPercent: 50,
      impulseQualified: true,
      confidence: 'High',
    }],
  } as ChartContext;
}

function stripSignal(candidate: SetupCandidate): SetupCandidate {
  return { ...candidate, proofSelectionSignal: null };
}

function orderKeys(candidates: SetupCandidate[]): string[] {
  return candidates.map((candidate) => `${candidate.setupType}:${candidate.direction}:${candidate.executionStatus}:${candidate.blockReason ?? 'none'}`);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Installed Metadata Comparison Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only installed metadata comparison audit. It runs setupScanner locally and compares current output to in-memory metadata-stripped output. It does not post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Contexts scanned: ${report.summary.contextsScanned}.`,
    `- Candidates compared: ${report.summary.candidatesCompared}.`,
    `- Signal-installed rows: ${report.summary.signalInstalledRows}.`,
    `- keep_later_sweep_proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Rank score changed rows: ${report.summary.rankScoreChangedRows}.`,
    `- Rank order changed contexts: ${report.summary.rankOrderChangedContexts}.`,
    `- Execution status changed rows: ${report.summary.executionStatusChangedRows}.`,
    `- Block reason changed rows: ${report.summary.blockReasonChangedRows}.`,
    `- Discord eligibility changed rows: ${report.summary.discordEligibilityChangedRows}.`,
    `- Human canExecute changed rows: ${report.summary.humanCanExecuteChangedRows}.`,
    `- Entry/stop/target/risk changed rows: ${report.summary.entryStopTargetRiskChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport(
  generatedAt = new Date().toISOString()
): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport {
  const contexts = [
    { contextId: '2026-07-01_morning_long', sessionType: 'morning' as const, context: syntheticContext({ sessionType: 'morning', direction: 'LONG', timestamp: '2026-07-01T10:05:00-04:00', entry: 7603.25, stop: 7599, target: 7620 }) },
    { contextId: '2026-07-02_lunch_short', sessionType: 'lunch' as const, context: syntheticContext({ sessionType: 'lunch', direction: 'SHORT', timestamp: '2026-07-02T13:05:00-04:00', entry: 7582.75, stop: 7590, target: 7574.75 }) },
  ];
  const rows: ComparisonRow[] = [];
  let rankOrderChangedContexts = 0;

  for (const fixture of contexts) {
    const scan = scanSetupCandidates({ sessionType: fixture.sessionType, chartContext: fixture.context, result: null });
    const stripped = scan.candidates.map(stripSignal).sort((a, b) => rankSetupCandidate(b) - rankSetupCandidate(a));
    if (orderKeys(scan.candidates).join('|') !== orderKeys(stripped).join('|')) {
      rankOrderChangedContexts += 1;
    }
    scan.candidates.forEach((candidate, index) => {
      const strippedCandidate = stripped[index];
      rows.push({
        contextId: fixture.contextId,
        candidateKey: `${fixture.contextId}:${index}:${candidate.setupType}:${candidate.direction}`,
        setupType: candidate.setupType,
        direction: candidate.direction,
        signalInstalled: Boolean(candidate.proofSelectionSignal),
        selectorDecision: candidate.proofSelectionSignal?.selectorDecision || null,
        installedRank: rankSetupCandidate(candidate),
        strippedRank: rankSetupCandidate(strippedCandidate),
        installedExecutionStatus: candidate.executionStatus,
        strippedExecutionStatus: strippedCandidate.executionStatus,
        installedBlockReason: candidate.blockReason,
        strippedBlockReason: strippedCandidate.blockReason,
        installedDiscordEligible: candidate.humanReview?.discordTradePlanEligible ?? null,
        strippedDiscordEligible: strippedCandidate.humanReview?.discordTradePlanEligible ?? null,
        installedHumanCanExecute: candidate.humanReview?.canExecute ?? null,
        strippedHumanCanExecute: strippedCandidate.humanReview?.canExecute ?? null,
        installedEntry: candidate.entry,
        strippedEntry: strippedCandidate.entry,
        installedStop: candidate.stop,
        strippedStop: strippedCandidate.stop,
        installedTarget1: candidate.target1,
        strippedTarget1: strippedCandidate.target1,
        installedTarget2: candidate.target2,
        strippedTarget2: strippedCandidate.target2,
        installedRiskPoints: candidate.riskPoints,
        strippedRiskPoints: strippedCandidate.riskPoints,
      });
    });
  }

  const rankScoreChangedRows = rows.filter((row) => row.installedRank !== row.strippedRank).length;
  const executionStatusChangedRows = rows.filter((row) => row.installedExecutionStatus !== row.strippedExecutionStatus).length;
  const blockReasonChangedRows = rows.filter((row) => row.installedBlockReason !== row.strippedBlockReason).length;
  const discordEligibilityChangedRows = rows.filter((row) => row.installedDiscordEligible !== row.strippedDiscordEligible).length;
  const humanCanExecuteChangedRows = rows.filter((row) => row.installedHumanCanExecute !== row.strippedHumanCanExecute).length;
  const entryStopTargetRiskChangedRows = rows.filter((row) =>
    row.installedEntry !== row.strippedEntry ||
    row.installedStop !== row.strippedStop ||
    row.installedTarget1 !== row.strippedTarget1 ||
    row.installedTarget2 !== row.strippedTarget2 ||
    row.installedRiskPoints !== row.strippedRiskPoints
  ).length;
  const signalInstalledRows = rows.filter((row) => row.signalInstalled).length;
  const blockers = [
    signalInstalledRows === 0 ? 'no proofSelectionSignal rows were installed in scanner output' : null,
    rankScoreChangedRows ? `${rankScoreChangedRows} row(s) changed rank score when metadata was stripped` : null,
    rankOrderChangedContexts ? `${rankOrderChangedContexts} context(s) changed rank order when metadata was stripped` : null,
    executionStatusChangedRows ? `${executionStatusChangedRows} row(s) changed execution status when metadata was stripped` : null,
    blockReasonChangedRows ? `${blockReasonChangedRows} row(s) changed block reason when metadata was stripped` : null,
    discordEligibilityChangedRows ? `${discordEligibilityChangedRows} row(s) changed Discord eligibility when metadata was stripped` : null,
    humanCanExecuteChangedRows ? `${humanCanExecuteChangedRows} row(s) changed human canExecute when metadata was stripped` : null,
    entryStopTargetRiskChangedRows ? `${entryStopTargetRiskChangedRows} row(s) changed entry/stop/target/risk when metadata was stripped` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_installed_metadata_comparison_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    assumptions: {
      installedMetadataAuditOnly: true,
      comparesInstalledOutputToMetadataStrippedOutput: true,
      rankConsumerDisabled: true,
      scannerVisiblePopulationInstalled: true,
      scannerVisiblePopulationAllowedByThisReport: false,
    },
    summary: {
      contextsScanned: contexts.length,
      candidatesCompared: rows.length,
      signalInstalledRows,
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      rankScoreChangedRows,
      rankOrderChangedContexts,
      executionStatusChangedRows,
      blockReasonChangedRows,
      discordEligibilityChangedRows,
      humanCanExecuteChangedRows,
      entryStopTargetRiskChangedRows,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_installed_metadata_population' : 'installed_metadata_is_inert_prepare_next_rank_consumer_research',
    },
    rows,
    blockers,
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorInstalledMetadataComparisonAuditReport();
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-installed-metadata-comparison-audit-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
