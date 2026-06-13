import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHtfLiquidityDrawState,
  formatHtfContextSufficiencyMarkdownLines,
  type HtfLiquidityDrawState,
} from '../../src/lib/htfLiquidityDrawEngine';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { runBridgeDiagnosticReplay } from '../../src/agents/bridgeDiagnosticReplayAgent';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { runTradeDecisionPipeline } from '../../src/lib/tradeDecisionPipeline';
import { normalizeTradePlan } from '../../src/lib/tradePlan';
import { buildMultiTimeframeMssEvidenceLayer } from '../../src/lib/timeframeMssEvidence';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupType,
  TradeDecisionStatus,
  type AnalysisResult,
  type ChartContext,
  type SetupCandidate,
} from '../../src/types';

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
export const JUNE_ONE_REGRESSION_JSON = join(REPORT_DIR, 'htf-mss-june-1-regression.json');
export const JUNE_ONE_REGRESSION_MD = join(REPORT_DIR, 'htf-mss-june-1-regression.md');

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

function padContextBars(seed: NinjaBridgeBar[], timeframe: '5m' | '15m' | '60m' | '120m' | '240m'): NinjaBridgeBar[] {
  const targetCount = timeframe === '240m' ? 180 : 520;
  const stepMinutes = timeframe === '240m' ? 240 : timeframe === '60m' ? 90 : timeframe === '15m' ? 90 : 90;
  const fillerCount = Math.max(0, targetCount - seed.length);
  const start = new Date('2026-05-01T00:00:00-04:00').getTime();
  const filler = Array.from({ length: fillerCount }, (_, index) => {
    const time = new Date(start + index * stepMinutes * 60 * 1000).toISOString();
    const base = 7600 + (index % 4) * 0.25;
    return bar(time, base, base + 1, base - 1, index % 2 === 0 ? base + 0.25 : base - 0.25);
  });
  return [...filler, ...seed];
}

export function juneOneBullishFiveMinuteBars(): NinjaBridgeBar[] {
  return [
    bar('2026-06-01T13:25:00-04:00', 7604.00, 7605.25, 7601.75, 7602.25),
    bar('2026-06-01T13:30:00-04:00', 7602.25, 7603.25, 7597.25, 7598.50),
    bar('2026-06-01T13:35:00-04:00', 7598.50, 7600.25, 7594.00, 7595.25),
    bar('2026-06-01T13:40:00-04:00', 7595.25, 7598.25, 7588.25, 7597.50),
    bar('2026-06-01T13:45:00-04:00', 7597.50, 7602.50, 7595.75, 7600.75),
    bar('2026-06-01T13:50:00-04:00', 7600.75, 7606.75, 7599.25, 7604.50),
    bar('2026-06-01T13:55:00-04:00', 7604.50, 7624.75, 7604.00, 7623.75),
    bar('2026-06-01T14:00:00-04:00', 7623.75, 7626.25, 7621.75, 7624.25),
    bar('2026-06-01T14:05:00-04:00', 7624.25, 7626.75, 7622.50, 7625.25),
    bar('2026-06-01T14:10:00-04:00', 7625.25, 7627.25, 7623.75, 7625.75),
    bar('2026-06-01T14:15:00-04:00', 7625.75, 7627.50, 7624.25, 7626.00),
  ];
}

function bullishPotentialBars(timeframe: '15m' | '60m' | '120m' | '240m'): NinjaBridgeBar[] {
  const prefix =
    timeframe === '15m'
      ? ['12:00', '12:15', '12:30', '12:45', '13:00', '13:15']
      : timeframe === '60m'
        ? ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00']
        : timeframe === '120m'
          ? ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00']
          : ['00:00', '04:00', '08:00', '12:00', '13:00', '14:00'];
  return padContextBars([
    bar(`2026-06-01T${prefix[0]}:00-04:00`, 7600, 7601, 7599, 7600),
    bar(`2026-06-01T${prefix[1]}:00-04:00`, 7600, 7601, 7598, 7599),
    bar(`2026-06-01T${prefix[2]}:00-04:00`, 7599, 7600, 7597, 7598),
    bar(`2026-06-01T${prefix[3]}:00-04:00`, 7598, 7599, 7596, 7597),
    bar(`2026-06-01T${prefix[4]}:00-04:00`, 7597, 7599, 7595, 7598),
    bar(`2026-06-01T${prefix[5]}:00-04:00`, 7598, 7600, 7596, 7599),
  ], timeframe);
}

function buildHtfState(): HtfLiquidityDrawState {
  return buildHtfLiquidityDrawState({
    bars4H: bullishPotentialBars('240m'),
    bars2H: bullishPotentialBars('120m'),
    bars1H: bullishPotentialBars('60m'),
    bars15M: bullishPotentialBars('15m'),
    bars5M: padContextBars(juneOneBullishFiveMinuteBars(), '5m'),
    externalBuySideLiquidityTarget: 'prior RTH high / London high / full ETH high 7611.75, 7622.50, 7632.75',
    chartTimestamp: '2026-06-01T14:10:00-04:00',
  });
}

function baseChartContext(overrides: Partial<ChartContext> = {}): ChartContext {
  const htfLiquidityDrawState = buildHtfState();
  const bars5M = padContextBars(juneOneBullishFiveMinuteBars(), '5m');
  const bars15M = bullishPotentialBars('15m');
  const bars60M = bullishPotentialBars('60m');
  const bars120M = bullishPotentialBars('120m');
  const bars240M = bullishPotentialBars('240m');
  return {
    sessionType: 'replay_lunch',
    instrument: 'MES',
    tradeDate: '2026-06-01',
    timeframe: '5m',
    screenshotRole: '5m_execution',
    chartTimestamp: '2026-06-01T14:10:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7625.25,
      activeSwingHigh: 7628,
      activeSwingLow: 7588.25,
      priorDayHigh: 7611.75,
      previousDayHigh: 7611.75,
      londonHigh: 7622.5,
      overnightHigh: 7632.75,
      nearestResistance: 7632.75,
      nearestSupport: 7588.25,
    },
    timeframeMssEvidence: buildMultiTimeframeMssEvidenceLayer({
      barsByTimeframe: {
        '5M': bars5M,
        '15M': bars15M,
        '60M': bars60M,
        '120M': bars120M,
        '240M': bars240M,
      },
      asOfTimestamp: '2026-06-01T14:10:00-04:00',
      barTimestampMode: 'open',
      barTimeZone: 'eastern',
    }),
    htfLiquidityDrawState,
    targetObjectives: [
      {
        label: 'Prior RTH high / London high / full ETH high',
        price: 7632.75,
        direction: 'LONG',
        source: 'app',
        type: 'liquidity_pool',
        confidence: 'High',
        score: 95,
        reason: 'External buy-side liquidity remains the draw after sell-side raid/reclaim.',
      },
    ],
    candles: juneOneBullishFiveMinuteBars().map((item, index) => ({
      index,
      timestamp: item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      direction: item.close > item.open ? 'bullish' : item.close < item.open ? 'bearish' : 'doji',
      bodyQuality: index === 6 || index === 7 ? 'large' : 'normal',
      isExpansion: index === 6 || index === 7,
      confidence: 'High',
    })),
    marketStructure: {
      trend: 'bullish',
      higherHigh: true,
      higherLow: true,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: true,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: 'bullish',
      expansionCandlePresent: true,
      rejectionWickPresent: false,
      breatherCandlePresent: true,
      reclaimCandlePresent: true,
      pullbackPresent: true,
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    },
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: true,
      pullbackIntoFvg: false,
      fvgReclaimed: false,
      notes: ['Focused June 1 regression fixture: sell-side raid, reclaim, confirmed bullish 5M MSS, then post-MSS digestion.'],
    },
    screenshotQuality: 'High',
    levelReadConfidence: 'High',
    candleReadConfidence: 'High',
    structureReadConfidence: 'High',
    setupReadConfidence: 'High',
    riskReadConfidence: 'High',
    entryStopConfidence: 'High',
    proposedEntry: null,
    proposedStop: null,
    riskPoints: null,
    riskStatus: 'Unknown',
    entryConfirmed: false,
    stopConfirmed: false,
    requiresManualConfirmation: true,
    extractionWarnings: {
      screenshotUnclear: false,
      priceLabelsUnreadable: false,
      timeframeUnverified: false,
      levelsUnclear: false,
      manualEntryStopRequired: true,
      messages: ['Regression candidate intentionally omits final entry/stop to prove candidate status is not execution approval.'],
    },
    marketContext:
      'June 1 focused replay: HTF bullish/non-conflicting draw, sell-side raid/reclaim, 15M potential support, confirmed 5M bullish MSS, external buy-side liquidity draw.',
    ...overrides,
  };
}

function baseAnalysis(chartContext: ChartContext): AnalysisResult {
  return {
    dayType: 'LONG',
    reasoning: 'HTF bullish draw after sell-side raid/reclaim; 5M bullish MSS confirms but final gates still control execution.',
    confidence: 0.85,
    checks: [],
    current_rule_analysis: {
      summary: 'Focused June 1 regression fixture built from structured OHLC.',
      setup_detected: 'HTF Draw Continuation After Raid/Reclaim',
      rule_category: 'APP_OWNED_HTF_MSS_REPLAY',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'PENDING_TRIGGER',
      entry_trigger: 'Clean retest or defined reclaim trigger after confirmed 5M MSS.',
      no_trade_reason: null,
      base_confidence: 'High',
    },
    structuredChartContext: chartContext,
  };
}

function candidateSummary(candidate: SetupCandidate | null) {
  if (!candidate) return null;
  return {
    setupType: candidate.setupType,
    scenarioLabel: candidate.scenarioLabel,
    pathway: candidate.pathway,
    direction: candidate.direction,
    candidateState: candidate.candidateState,
    detectedStatus: candidate.detectedStatus,
    executionStatus: candidate.executionStatus,
    blockReason: candidate.blockReason,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    requiredTrigger: candidate.requiredTrigger,
    nextAction: candidate.nextAction,
    evidence: candidate.evidence,
    missingEvidence: candidate.missingEvidence,
  };
}

export function buildJuneOneRegressionReport() {
  const candidateContext = baseChartContext();
  const candidateAnalysis = baseAnalysis(candidateContext);
  const scan = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: candidateContext, result: null });
  const htfCandidate = scan.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null;
  const candidatePipeline = runTradeDecisionPipeline({
    result: candidateAnalysis,
    sessionType: 'replay_lunch',
    instrument: 'MES',
    tradeDate: '2026-06-01',
  });
  const candidateNormalized = normalizeTradePlan(candidateAnalysis, 'MES', 'replay_lunch');

  const fullGateContext = baseChartContext({
    keyLevels: {
      ...baseChartContext().keyLevels,
      currentPrice: 7608,
      activeSwingHigh: 7610,
      activeSwingLow: 7604,
    },
    proposedEntry: 7608,
    proposedStop: 7604,
    riskPoints: 4,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
    extractionWarnings: {
      screenshotUnclear: false,
      priceLabelsUnreadable: false,
      timeframeUnverified: false,
      levelsUnclear: false,
      manualEntryStopRequired: false,
      messages: [],
    },
  });
  const fullGateAnalysis = baseAnalysis(fullGateContext);
  const fullGateScan = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: fullGateContext, result: null });
  const fullGatePipeline = runTradeDecisionPipeline({
    result: fullGateAnalysis,
    sessionType: 'replay_lunch',
    instrument: 'MES',
    tradeDate: '2026-06-01',
  });
  const fullGateNormalized = normalizeTradePlan(fullGateAnalysis, 'MES', 'replay_lunch');

  const riskTooWideContext = baseChartContext({
    keyLevels: {
      ...baseChartContext().keyLevels,
      currentPrice: 7608,
      activeSwingHigh: 7610,
      activeSwingLow: 7588,
    },
    proposedEntry: 7608,
    proposedStop: 7588,
    riskPoints: 20,
    riskStatus: 'RiskTooWide',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
  });
  const riskTooWidePipeline = runTradeDecisionPipeline({
    result: baseAnalysis(riskTooWideContext),
    sessionType: 'replay_lunch',
    instrument: 'MES',
    tradeDate: '2026-06-01',
  });

  const diagnostic = runBridgeDiagnosticReplay({
    tradeDate: '2026-06-01',
    instrument: 'MES',
    session: 'replay_lunch',
    bars5m: juneOneBullishFiveMinuteBars(),
    bars15m: bullishPotentialBars('15m'),
    bars60m: bullishPotentialBars('60m'),
    bars240m: bullishPotentialBars('240m'),
    replayWindow: { from: '13:25', to: '14:15' },
    suspectedMoveDirection: 'LONG',
    scannerSelectedCandidate: htfCandidate,
    scannerState: htfCandidate?.executionStatus || null,
    scannerAlertSent: false,
    scannerAlertReason: 'Focused local regression; no live Discord posting.',
  });

  const state = candidateContext.htfLiquidityDrawState!;
  return {
    reportType: 'htf_mss_june_1_regression',
    instrument: 'MES',
    tradeDate: '2026-06-01',
    replayWindow: { from: '13:25', to: '14:15', timezone: 'America/New_York' },
    replayDataSource: 'new_focused_fixture',
    chartReportPath: null,
    boundary: 'diagnostic_replay_only_not_execution_authority',
    htfLiquidityDrawState: {
      classification: state.classification,
      planDirection: state.planDirection,
      drawDirection: state.drawDirection,
      macroContext: state.macroContext,
      raidState: state.raidState,
      reclaimStatus: state.reclaimStatus,
      fiveMinuteMssTriggerConfirmed: state.fiveMinuteMssTriggerConfirmed,
      fiveMinuteMssConfirmationType: state.fiveMinuteMssConfirmationType,
      fifteenMinuteConfirmationStatus: state.fifteenMinuteConfirmationStatus,
      postShiftState: state.postShiftState,
      externalLiquidityTarget: state.externalLiquidityTarget,
      activeScanWindow: state.activeScanWindow,
      confidence: state.confidence,
      blockers: state.blockers,
      htfContextSufficiency: state.htfContextSufficiency,
      htfContextDataLimited: state.htfContextDataLimited,
      timeframeCoverage: state.timeframeCoverage,
      classificationReliability: state.classificationReliability,
      classificationReason: state.classificationReason,
      timeframeStack: state.timeframeStack.map((item) => ({
        timeframe: item.timeframe,
        direction: item.direction,
        status: item.status,
        lifecycleState: item.lifecycleState,
        confidence: item.confidence,
      })),
      createsTradingPlanCandidate: state.createsTradingPlanCandidate,
      approvesExecution: state.approvesExecution,
    },
    setupDetection: {
      candidateDetected: Boolean(htfCandidate),
      setupType: htfCandidate?.setupType || null,
      label: htfCandidate?.scenarioLabel || null,
      direction: htfCandidate?.direction || null,
      candidate: candidateSummary(htfCandidate),
      notMisclassifiedAsBearishContinuation:
        state.planDirection === 'LONG' &&
        state.fiveMinuteState.direction === 'bullish' &&
        state.postShiftState !== 'opposite_mss_confirmed',
    },
    finalGateResult: {
      candidateOnly: {
        status: candidatePipeline.status,
        canExecute: candidateNormalized.canExecute,
        finalPlanEntry: candidatePipeline.finalTradePlan.entry,
        finalPlanStop: candidatePipeline.finalTradePlan.stop,
        noTradeReason: candidatePipeline.noTradeReason,
        bestConditionalSetupType: candidatePipeline.opportunitySelection?.bestConditionalCandidate?.setupType || null,
        bestExecutableSetupType: candidatePipeline.opportunitySelection?.bestExecutableCandidate?.setupType || null,
      },
      fullDeterministicGatesPass: {
        scannerCandidate: candidateSummary(fullGateScan.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        status: fullGatePipeline.status,
        canExecute: fullGateNormalized.canExecute,
        setupType: fullGatePipeline.finalTradePlan.setupType,
        entry: fullGatePipeline.finalTradePlan.entry,
        stop: fullGatePipeline.finalTradePlan.stop,
        target1: fullGatePipeline.finalTradePlan.target1,
        target2: fullGatePipeline.finalTradePlan.target2,
        noTradeReason: fullGatePipeline.noTradeReason,
        auditTrail: fullGatePipeline.auditTrail.map((step) => ({
          step: step.step,
          status: step.status,
          message: step.message,
          noTradeReason: step.noTradeReason || null,
        })),
        bestExecutableCandidate: candidateSummary(fullGatePipeline.opportunitySelection?.bestExecutableCandidate || null),
        bestConditionalCandidate: candidateSummary(fullGatePipeline.opportunitySelection?.bestConditionalCandidate || null),
      },
      riskTooWideCheck: {
        status: riskTooWidePipeline.status,
        noTradeReason: riskTooWidePipeline.noTradeReason,
        bestConditionalBlockReason: riskTooWidePipeline.opportunitySelection?.bestConditionalCandidate?.blockReason || null,
      },
    },
    diagnosticReplay: {
      finalClassification: diagnostic.finalClassification,
      htfMssDiagnostics: diagnostic.htfMssDiagnostics,
      tradePlanFeasibility: diagnostic.tradePlanFeasibility,
      approvalBoundary: diagnostic.approvalBoundary,
    },
    wordingGuard: {
      safeNonExecutableTerms: ['candidate', 'pending', 'conditional', 'blocked', 'no executable trade'],
      restrictedActiveCommandWordingOmitted: true,
    },
  };
}

function renderMarkdown(report: ReturnType<typeof buildJuneOneRegressionReport>): string {
  const diag = report.htfLiquidityDrawState;
  const candidateOnly = report.finalGateResult.candidateOnly;
  const full = report.finalGateResult.fullDeterministicGatesPass;
  const risk = report.finalGateResult.riskTooWideCheck;
  return [
    '# HTF/MSS June 1 Regression Replay',
    '',
    'Boundary: diagnostic_replay_only_not_execution_authority',
    '',
    'This focused replay is a local regression diagnostic. It does not introduce broker execution, does not change trading rules, and does not bypass app-owned final gates.',
    '',
    '## Replay Scope',
    `- Instrument: ${report.instrument}`,
    `- Date: ${report.tradeDate}`,
    `- Window: ${report.replayWindow.from}-${report.replayWindow.to} ${report.replayWindow.timezone}`,
    `- Data source: ${report.replayDataSource}`,
    `- Active Scan Window: ${diag.activeScanWindow}`,
    '',
    ...formatHtfContextSufficiencyMarkdownLines({
      htfContextSufficiency: diag.htfContextSufficiency,
      classificationReliability: diag.classificationReliability,
    }),
    '',
    `- Classification Reason: ${diag.classificationReason}`,
    '',
    '## HTF/MSS Classification',
    `- Classification: ${diag.classification}`,
    `- Plan Direction: ${diag.planDirection}`,
    `- Draw Direction: ${diag.drawDirection}`,
    `- Macro Context: ${diag.macroContext}`,
    `- Raid State: ${diag.raidState}`,
    `- Reclaim Status: ${diag.reclaimStatus}`,
    `- 15M Status: ${diag.fifteenMinuteConfirmationStatus}`,
    `- 5M Confirmed: ${diag.fiveMinuteMssTriggerConfirmed}`,
    `- 5M Confirmation Type: ${diag.fiveMinuteMssConfirmationType}`,
    `- Post-Shift State: ${diag.postShiftState}`,
    `- External Liquidity Target: ${diag.externalLiquidityTarget}`,
    `- Confidence: ${diag.confidence}`,
    '',
    '## Timeframe Stack',
    '| Timeframe | Direction | Status | Lifecycle | Confidence |',
    '|---|---|---|---|---:|',
    ...diag.timeframeStack.map((item) => `| ${item.timeframe} | ${item.direction} | ${item.status} | ${item.lifecycleState} | ${item.confidence} |`),
    '',
    '## Setup Candidate Result',
    `- Candidate Detected: ${report.setupDetection.candidateDetected ? 'Yes' : 'No'}`,
    `- Setup Type: ${report.setupDetection.setupType}`,
    `- Label: ${report.setupDetection.label}`,
    `- Direction: ${report.setupDetection.direction}`,
    `- Not Bearish Continuation: ${report.setupDetection.notMisclassifiedAsBearishContinuation ? 'Yes' : 'No'}`,
    '',
    '## Final Gate Result',
    `- Candidate-only Status: ${candidateOnly.status}`,
    `- Candidate-only canExecute: ${candidateOnly.canExecute}`,
    `- Candidate-only Entry: ${candidateOnly.finalPlanEntry ?? 'Not defined'}`,
    `- Candidate-only Stop: ${candidateOnly.finalPlanStop ?? 'Not defined'}`,
    `- Full Deterministic Gates Status: ${full.status}`,
    `- Full Deterministic Gates canExecute: ${full.canExecute}`,
    `- Full Gate Targets: T1 ${full.target1 ?? 'N/A'} / T2 ${full.target2 ?? 'N/A'}`,
    `- RiskTooWide Status: ${risk.status}`,
    `- RiskTooWide Reason: ${risk.noTradeReason}`,
    '',
    '## Diagnostic Replay',
    `- Final Classification: ${report.diagnosticReplay.finalClassification}`,
    `- htfMssDiagnostics Present: ${report.diagnosticReplay.htfMssDiagnostics ? 'Yes' : 'No'}`,
    `- Diagnostic Approves Trade: ${report.diagnosticReplay.approvalBoundary.diagnosticApprovesTrade}`,
    `- Diagnostic Changes Rules: ${report.diagnosticReplay.approvalBoundary.diagnosticChangesRules}`,
    '',
    '## Safety',
    '- Candidate status does not equal execution approval.',
    '- ApprovedTrade does not appear in this regression shell; existing deterministic pipeline tests cover approval only after full gates pass.',
    '- External liquidity remains draw/management context.',
    '- T1/T2 remain app-computed R targets.',
    '- No live Discord post was sent.',
    '- No broker execution was introduced.',
    '',
  ].join('\n');
}

export function writeJuneOneRegressionArtifacts(outDir = REPORT_DIR): { jsonPath: string; markdownPath: string; report: ReturnType<typeof buildJuneOneRegressionReport> } {
  const report = buildJuneOneRegressionReport();
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'htf-mss-june-1-regression.json');
  const markdownPath = join(outDir, 'htf-mss-june-1-regression.md');
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, renderMarkdown(report), 'utf8');
  return { jsonPath, markdownPath, report };
}

export function runJuneOneRegressionCli(): void {
  const { jsonPath, markdownPath, report } = writeJuneOneRegressionArtifacts();
  console.log(`June 1 HTF/MSS regression report saved: ${jsonPath}`);
  console.log(`June 1 HTF/MSS regression markdown saved: ${markdownPath}`);
  console.log(`Classification: ${report.htfLiquidityDrawState.classification}`);
  console.log(`Setup: ${report.setupDetection.setupType} ${report.setupDetection.direction}`);
  console.log(`Candidate-only canExecute: ${report.finalGateResult.candidateOnly.canExecute}`);
  console.log(`Full-gates status: ${report.finalGateResult.fullDeterministicGatesPass.status}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runJuneOneRegressionCli();
}
