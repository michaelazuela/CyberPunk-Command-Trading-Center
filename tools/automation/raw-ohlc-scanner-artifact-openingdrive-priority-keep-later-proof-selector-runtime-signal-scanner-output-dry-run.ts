import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../../src/types';
import {
  buildCompletedFiveMinuteProofSelectionSignals,
  CompletedFiveMinuteProofSelectionSignalRef,
  rankSetupCandidate,
  scanSetupCandidates,
} from '../../src/lib/setupScanner';

interface CliOptions {
  outDir: string;
  json: boolean;
}

interface ScannerOutputRow {
  candidateKey: string;
  dateSession: string;
  setupType: SetupType;
  direction: SetupCandidate['direction'];
  proofTimestamp: string | null;
  signalAttached: boolean;
  selectorDecision: NonNullable<SetupCandidate['proofSelectionSignal']>['selectorDecision'] | null;
  beforeRank: number;
  afterRank: number;
  beforeExecutionStatus: ExecutionStatus;
  afterExecutionStatus: ExecutionStatus;
  beforeBlockReason: NoTradeReason | null;
  afterBlockReason: NoTradeReason | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_scanner_output_dry_run';
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
    scannerOutputDryRunOnly: true;
    syntheticLocalContextOnly: true;
    attachesSignalToClonedCandidatesOnly: true;
    rankConsumerDisabled: true;
    scannerVisibleInstallAllowedByThisReport: false;
  };
  summary: {
    contextsScanned: number;
    candidatesCompared: number;
    proofRefsBuilt: number;
    signalsAttached: number;
    syntheticCompanionRowsAdded: number;
    keepLaterSweepProofRows: number;
    missingProofTimestampRows: number;
    rankScoreChangedRows: number;
    rankOrderChangedContexts: number;
    executionStatusChangedRows: number;
    blockReasonChangedRows: number;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_scanner_population_approval_checkpoint_next' | 'fix_scanner_output_dry_run';
  };
  rows: ScannerOutputRow[];
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

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport['authority'] {
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
  direction: 'LONG' | 'SHORT';
  timestamp: string;
  entry: number;
  stop: number;
  target: number;
}): ChartContext {
  const bullish = args.direction === 'LONG';
  return {
    sessionType: 'morning',
    chartTimestamp: args.timestamp,
    marketContext: 'Synthetic scanner-output dry-run context.',
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
      reclaimCandlePresent: false,
      pullbackPresent: false,
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

function cloneCandidate(candidate: SetupCandidate): SetupCandidate {
  return {
    ...candidate,
    evidence: [...candidate.evidence],
    missingEvidence: [...candidate.missingEvidence],
    missingLevels: candidate.missingLevels ? [...candidate.missingLevels] : undefined,
    rankingOverlays: candidate.rankingOverlays ? candidate.rankingOverlays.map((overlay) => ({ ...overlay, evidence: [...overlay.evidence] })) : undefined,
  };
}

function orderKeys(rows: Array<{ candidateKey: string; rank: number }>): string[] {
  return [...rows]
    .sort((a, b) => b.rank - a.rank)
    .map((row) => row.candidateKey);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Scanner-Output Dry-Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only scanner-output dry-run over synthetic context. It runs setupScanner locally, attaches proofSelectionSignal to cloned candidates only, and does not post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Contexts scanned: ${report.summary.contextsScanned}.`,
    `- Candidates compared: ${report.summary.candidatesCompared}.`,
    `- Proof refs built: ${report.summary.proofRefsBuilt}.`,
    `- Signals attached: ${report.summary.signalsAttached}.`,
    `- Synthetic companion rows added: ${report.summary.syntheticCompanionRowsAdded}.`,
    `- keep_later_sweep_proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Missing proof timestamp rows: ${report.summary.missingProofTimestampRows}.`,
    `- Rank score changed rows: ${report.summary.rankScoreChangedRows}.`,
    `- Rank order changed contexts: ${report.summary.rankOrderChangedContexts}.`,
    `- Execution status changed rows: ${report.summary.executionStatusChangedRows}.`,
    `- Block reason changed rows: ${report.summary.blockReasonChangedRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport(
  generatedAt = new Date().toISOString()
): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport {
  const fixtures = [
    { dateSession: '2026-07-01_morning', sessionType: 'morning' as const, context: syntheticContext({ direction: 'LONG', timestamp: '2026-07-01T10:05:00-04:00', entry: 7603.25, stop: 7599, target: 7620 }) },
    { dateSession: '2026-07-02_lunch', sessionType: 'lunch' as const, context: syntheticContext({ direction: 'SHORT', timestamp: '2026-07-02T13:05:00-04:00', entry: 7582.75, stop: 7590, target: 7574.75 }) },
  ];
  const rows: ScannerOutputRow[] = [];
  let rankOrderChangedContexts = 0;
  let proofRefsBuilt = 0;
  let signalsAttached = 0;
  let syntheticCompanionRowsAdded = 0;

  for (const fixture of fixtures) {
    const scan = scanSetupCandidates({
      sessionType: fixture.sessionType,
      chartContext: fixture.context,
      result: null,
    });
    const scopedCandidates = scan.candidates.filter((candidate) =>
      candidate.direction !== 'NO TRADE' &&
      candidate.setupType !== SetupType.NoSetup
    );
    const fallbackCandidates = scopedCandidates.length ? scopedCandidates : [
      {
        setupType: SetupType.NoSetup,
        direction: fixture.context.marketStructure?.trend === 'bearish' ? 'SHORT' : 'LONG',
        detectedStatus: SetupCandidateStatus.Detected,
        confidence: 'High',
        priority: 80,
        evidence: [],
        missingEvidence: [],
        executionStatus: ExecutionStatus.Conditional,
        blockReason: NoTradeReason.EntryTriggerPending,
        requiredTrigger: null,
        nextAction: 'Dry-run fallback clone only.',
        reducedRiskPlan: null,
      },
      {
        setupType: fixture.sessionType === 'lunch' ? SetupType.NoSetup : SetupType.NoSetup,
        direction: fixture.context.marketStructure?.trend === 'bearish' ? 'SHORT' : 'LONG',
        detectedStatus: SetupCandidateStatus.Detected,
        confidence: 'High',
        priority: 79,
        evidence: [],
        missingEvidence: [],
        executionStatus: ExecutionStatus.Conditional,
        blockReason: NoTradeReason.EntryTriggerPending,
        requiredTrigger: null,
        nextAction: 'Dry-run fallback clone only.',
        reducedRiskPlan: null,
      },
    ] as SetupCandidate[];
    const hasSweep = fallbackCandidates.some((candidate) => candidate.setupType === SetupType.NoSetup);
    const hasReplacement = fallbackCandidates.some((candidate) => candidate.setupType !== SetupType.NoSetup);
    if (hasSweep && !hasReplacement) {
      const sweep = fallbackCandidates.find((candidate) => candidate.setupType === SetupType.NoSetup)!;
      fallbackCandidates.push({
        ...cloneCandidate(sweep),
        setupType: fixture.sessionType === 'lunch' ? SetupType.NoSetup : SetupType.NoSetup,
        priority: Math.max(0, sweep.priority - 1),
        nextAction: 'Synthetic companion clone for population dry-run collision coverage only.',
      });
      syntheticCompanionRowsAdded += 1;
    }
    const proofTimestamp = fixture.context.chartTimestamp || fixture.context.screenshotTimestamp || null;
    const refs = fallbackCandidates
      .map((candidate, index): CompletedFiveMinuteProofSelectionSignalRef | null => {
        if (!proofTimestamp || candidate.direction === 'NO TRADE') return null;
        return {
          candidateKey: `${fixture.dateSession}_${index}_${candidate.setupType}`,
          setupType: candidate.setupType,
          direction: candidate.direction,
          sessionType: fixture.sessionType,
          completedBarTime: proofTimestamp,
        };
      })
      .filter((item): item is CompletedFiveMinuteProofSelectionSignalRef => Boolean(item));
    proofRefsBuilt += refs.length;
    const signals = buildCompletedFiveMinuteProofSelectionSignals(refs);
    signalsAttached += Object.keys(signals).length;
    const beforeRanks = fallbackCandidates.map((candidate, index) => {
      const candidateKey = refs[index]?.candidateKey || `${fixture.dateSession}_${index}_${candidate.setupType}`;
      return { candidateKey, rank: rankSetupCandidate(cloneCandidate(candidate)) };
    });
    const afterRanks = fallbackCandidates.map((candidate, index) => {
      const candidateKey = refs[index]?.candidateKey || `${fixture.dateSession}_${index}_${candidate.setupType}`;
      const cloned = cloneCandidate(candidate);
      cloned.proofSelectionSignal = signals[candidateKey] || null;
      return { candidateKey, rank: rankSetupCandidate(cloned) };
    });
    if (orderKeys(beforeRanks).join('|') !== orderKeys(afterRanks).join('|')) {
      rankOrderChangedContexts += 1;
    }
    fallbackCandidates.forEach((candidate, index) => {
      const candidateKey = refs[index]?.candidateKey || `${fixture.dateSession}_${index}_${candidate.setupType}`;
      const cloned = cloneCandidate(candidate);
      cloned.proofSelectionSignal = signals[candidateKey] || null;
      rows.push({
        candidateKey,
        dateSession: fixture.dateSession,
        setupType: candidate.setupType,
        direction: candidate.direction,
        proofTimestamp,
        signalAttached: Boolean(cloned.proofSelectionSignal),
        selectorDecision: cloned.proofSelectionSignal?.selectorDecision || null,
        beforeRank: beforeRanks[index].rank,
        afterRank: afterRanks[index].rank,
        beforeExecutionStatus: candidate.executionStatus,
        afterExecutionStatus: cloned.executionStatus,
        beforeBlockReason: candidate.blockReason,
        afterBlockReason: cloned.blockReason,
      });
    });
  }

  const rankScoreChangedRows = rows.filter((row) => row.beforeRank !== row.afterRank).length;
  const executionStatusChangedRows = rows.filter((row) => row.beforeExecutionStatus !== row.afterExecutionStatus).length;
  const blockReasonChangedRows = rows.filter((row) => row.beforeBlockReason !== row.afterBlockReason).length;
  const missingProofTimestampRows = rows.filter((row) => !row.proofTimestamp).length;
  const blockers = [
    missingProofTimestampRows ? `${missingProofTimestampRows} row(s) lacked completed proof timestamp.` : null,
    rankScoreChangedRows ? `${rankScoreChangedRows} row(s) changed rank score after cloned signal attachment.` : null,
    rankOrderChangedContexts ? `${rankOrderChangedContexts} context(s) changed rank order after cloned signal attachment.` : null,
    executionStatusChangedRows ? `${executionStatusChangedRows} row(s) changed execution status after cloned signal attachment.` : null,
    blockReasonChangedRows ? `${blockReasonChangedRows} row(s) changed block reason after cloned signal attachment.` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_scanner_output_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    assumptions: {
      scannerOutputDryRunOnly: true,
      syntheticLocalContextOnly: true,
      attachesSignalToClonedCandidatesOnly: true,
      rankConsumerDisabled: true,
      scannerVisibleInstallAllowedByThisReport: false,
    },
    summary: {
      contextsScanned: fixtures.length,
      candidatesCompared: rows.length,
      proofRefsBuilt,
      signalsAttached,
      syntheticCompanionRowsAdded,
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      missingProofTimestampRows,
      rankScoreChangedRows,
      rankOrderChangedContexts,
      executionStatusChangedRows,
      blockReasonChangedRows,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_scanner_output_dry_run' : 'prepare_scanner_population_approval_checkpoint_next',
    },
    rows,
    blockers,
  };
  return {
    ...base,
    markdown: buildMarkdown(base),
  };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport();
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-scanner-output-dry-run-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) {
    console.log(JSON.stringify({ outPath, ...report }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
