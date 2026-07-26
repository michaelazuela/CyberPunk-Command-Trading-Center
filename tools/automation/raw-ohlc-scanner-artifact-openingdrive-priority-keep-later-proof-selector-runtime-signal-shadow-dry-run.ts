import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../../src/types';
import {
  buildCompletedFiveMinuteProofSelectionSignals,
  CompletedFiveMinuteProofSelectionSignalRef,
  rankSetupCandidate,
} from '../../src/lib/setupScanner';

interface CliOptions {
  outDir: string;
  json: boolean;
}

interface ShadowRow {
  candidateKey: string;
  setupType: SetupType;
  beforeRank: number;
  afterRank: number;
  beforeExecutionStatus: ExecutionStatus;
  afterExecutionStatus: ExecutionStatus;
  beforeBlockReason: NoTradeReason | null;
  afterBlockReason: NoTradeReason | null;
  selectorDecision: NonNullable<SetupCandidate['proofSelectionSignal']>['selectorDecision'] | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_shadow_dry_run';
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
  assumptions: {
    shadowDryRunOnly: true;
    attachesSignalToClonedCandidatesOnly: true;
    noRuntimeChangeInstalled: true;
    scannerVisibleInstallAllowedByThisReport: false;
  };
  summary: {
    rowsCompared: number;
    signalsAttached: number;
    keepLaterSweepProofRows: number;
    rankOrderChanged: boolean;
    rankScoreChangedRows: number;
    executionStatusChangedRows: number;
    blockReasonChangedRows: number;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_scanner_population_preflight_next' | 'fix_shadow_dry_run';
  };
  rows: ShadowRow[];
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

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport['authority'] {
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

function candidate(args: {
  setupType: SetupType;
  direction: 'LONG' | 'SHORT';
  priority: number;
  riskPoints: number;
  executionStatus?: ExecutionStatus;
  blockReason?: NoTradeReason | null;
}): SetupCandidate {
  return {
    setupType: args.setupType,
    direction: args.direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: args.priority,
    riskPoints: args.riskPoints,
    entryClarity: 8,
    stopClarity: 8,
    targetClarity: 8,
    proximityScore: 8,
    evidence: [],
    missingEvidence: [],
    executionStatus: args.executionStatus || ExecutionStatus.Conditional,
    blockReason: args.blockReason ?? NoTradeReason.EntryTriggerPending,
    requiredTrigger: null,
    nextAction: 'Shadow dry-run only.',
    reducedRiskPlan: null,
  };
}

function orderKeys(rows: Array<{ candidateKey: string; rank: number }>): string[] {
  return [...rows]
    .sort((a, b) => b.rank - a.rank)
    .map((row) => row.candidateKey);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Shadow Dry-Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only shadow dry-run. It attaches signals to cloned candidates only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Rows compared: ${report.summary.rowsCompared}.`,
    `- Signals attached: ${report.summary.signalsAttached}.`,
    `- keep_later_sweep_proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Rank order changed: ${report.summary.rankOrderChanged}.`,
    `- Rank score changed rows: ${report.summary.rankScoreChangedRows}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport(
  generatedAt = new Date().toISOString()
): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport {
  const candidates: Record<string, SetupCandidate> = {
    'sweep-long': candidate({ setupType: SetupType.NoSetup, direction: 'LONG', priority: 82, riskPoints: 4.5 }),
    'opening-long': candidate({ setupType: SetupType.NoSetup, direction: 'LONG', priority: 78, riskPoints: 4.25 }),
    'sweep-short-lunch': candidate({ setupType: SetupType.NoSetup, direction: 'SHORT', priority: 80, riskPoints: 4.75 }),
    'after-lunch-short': candidate({ setupType: SetupType.NoSetup, direction: 'SHORT', priority: 79, riskPoints: 4.5 }),
  };
  const refs: CompletedFiveMinuteProofSelectionSignalRef[] = [
    { candidateKey: 'sweep-long', setupType: SetupType.NoSetup, direction: 'LONG', sessionType: 'morning', completedBarTime: '2026-07-01T14:05:00.000Z' },
    { candidateKey: 'opening-long', setupType: SetupType.NoSetup, direction: 'LONG', sessionType: 'morning', completedBarTime: '2026-07-01T14:05:00.000Z' },
    { candidateKey: 'sweep-short-lunch', setupType: SetupType.NoSetup, direction: 'SHORT', sessionType: 'lunch', completedBarTime: '2026-07-01T17:05:00.000Z' },
    { candidateKey: 'after-lunch-short', setupType: SetupType.NoSetup, direction: 'SHORT', sessionType: 'lunch', completedBarTime: '2026-07-01T17:05:00.000Z' },
  ];
  const signals = buildCompletedFiveMinuteProofSelectionSignals(refs);
  const beforeRanks = Object.fromEntries(Object.entries(candidates).map(([candidateKey, value]) => [
    candidateKey,
    rankSetupCandidate({ ...value }),
  ]));
  const afterCandidates = Object.fromEntries(Object.entries(candidates).map(([candidateKey, value]) => [
    candidateKey,
    { ...value, proofSelectionSignal: signals[candidateKey] },
  ])) as Record<string, SetupCandidate>;
  const afterRanks = Object.fromEntries(Object.entries(afterCandidates).map(([candidateKey, value]) => [
    candidateKey,
    rankSetupCandidate({ ...value }),
  ]));
  const rows = Object.keys(candidates).map((candidateKey): ShadowRow => ({
    candidateKey,
    setupType: candidates[candidateKey].setupType,
    beforeRank: beforeRanks[candidateKey],
    afterRank: afterRanks[candidateKey],
    beforeExecutionStatus: candidates[candidateKey].executionStatus,
    afterExecutionStatus: afterCandidates[candidateKey].executionStatus,
    beforeBlockReason: candidates[candidateKey].blockReason,
    afterBlockReason: afterCandidates[candidateKey].blockReason,
    selectorDecision: afterCandidates[candidateKey].proofSelectionSignal?.selectorDecision || null,
  }));
  const beforeOrder = orderKeys(Object.entries(beforeRanks).map(([candidateKey, rank]) => ({ candidateKey, rank })));
  const afterOrder = orderKeys(Object.entries(afterRanks).map(([candidateKey, rank]) => ({ candidateKey, rank })));
  const rankOrderChanged = beforeOrder.join('|') !== afterOrder.join('|');
  const rankScoreChangedRows = rows.filter((row) => row.beforeRank !== row.afterRank).length;
  const executionStatusChangedRows = rows.filter((row) => row.beforeExecutionStatus !== row.afterExecutionStatus).length;
  const blockReasonChangedRows = rows.filter((row) => row.beforeBlockReason !== row.afterBlockReason).length;
  const blockers = [
    rankOrderChanged ? 'rank order changed after attaching proofSelectionSignal to cloned candidates' : null,
    rankScoreChangedRows ? `${rankScoreChangedRows} rank score row(s) changed after attaching proofSelectionSignal` : null,
    executionStatusChangedRows ? `${executionStatusChangedRows} execution status row(s) changed after attaching proofSelectionSignal` : null,
    blockReasonChangedRows ? `${blockReasonChangedRows} block reason row(s) changed after attaching proofSelectionSignal` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_shadow_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    assumptions: {
      shadowDryRunOnly: true,
      attachesSignalToClonedCandidatesOnly: true,
      noRuntimeChangeInstalled: true,
      scannerVisibleInstallAllowedByThisReport: false,
    },
    summary: {
      rowsCompared: rows.length,
      signalsAttached: Object.keys(signals).length,
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      rankOrderChanged,
      rankScoreChangedRows,
      executionStatusChangedRows,
      blockReasonChangedRows,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_shadow_dry_run' : 'prepare_scanner_population_preflight_next',
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
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalShadowDryRunReport();
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-shadow-dry-run-${Date.now()}.json`);
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
