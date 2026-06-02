import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHtfLiquidityDrawState, type HtfLiquidityDrawState } from '../../src/lib/htfLiquidityDrawEngine';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { runBridgeDiagnosticReplay } from '../../src/agents/bridgeDiagnosticReplayAgent';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { runTradeDecisionPipeline } from '../../src/lib/tradeDecisionPipeline';
import { normalizeTradePlan } from '../../src/lib/tradePlan';
import { compactDiscordSummary, flattenDiscordPayloadText } from './discord-alert-format';
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
export const PHASE_5B_BEARISH_JSON = join(REPORT_DIR, 'htf-mss-phase-5b-bearish-symmetry.json');
export const PHASE_5B_BEARISH_MD = join(REPORT_DIR, 'htf-mss-phase-5b-bearish-symmetry.md');
export const PHASE_5B_GATES_JSON = join(REPORT_DIR, 'htf-mss-phase-5b-approval-gates.json');
export const PHASE_5B_GATES_MD = join(REPORT_DIR, 'htf-mss-phase-5b-approval-gates.md');

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

export function phase5bBearishFiveMinuteBars(): NinjaBridgeBar[] {
  return [
    bar('2026-06-02T13:25:00-04:00', 7608.00, 7610.00, 7606.00, 7609.00),
    bar('2026-06-02T13:30:00-04:00', 7609.00, 7612.00, 7608.00, 7611.00),
    bar('2026-06-02T13:35:00-04:00', 7611.00, 7614.00, 7610.00, 7613.00),
    bar('2026-06-02T13:40:00-04:00', 7613.00, 7622.00, 7612.00, 7613.50),
    bar('2026-06-02T13:45:00-04:00', 7613.50, 7614.50, 7608.00, 7610.00),
    bar('2026-06-02T13:50:00-04:00', 7610.00, 7611.00, 7604.00, 7606.00),
    bar('2026-06-02T13:55:00-04:00', 7606.00, 7606.50, 7586.00, 7588.00),
    bar('2026-06-02T14:00:00-04:00', 7588.00, 7590.00, 7585.00, 7587.50),
    bar('2026-06-02T14:05:00-04:00', 7587.50, 7589.00, 7585.50, 7587.00),
    bar('2026-06-02T14:10:00-04:00', 7587.00, 7588.50, 7585.25, 7586.75),
  ];
}

function bearishPotentialBars(timeframe: '15m' | '60m' | '240m'): NinjaBridgeBar[] {
  const prefix =
    timeframe === '15m'
      ? ['12:00', '12:15', '12:30', '12:45', '13:00', '13:15']
      : timeframe === '60m'
        ? ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00']
        : ['00:00', '04:00', '08:00', '12:00', '13:00', '14:00'];
  return [
    bar(`2026-06-02T${prefix[0]}:00-04:00`, 7610, 7611, 7609, 7610),
    bar(`2026-06-02T${prefix[1]}:00-04:00`, 7610, 7612, 7609, 7611),
    bar(`2026-06-02T${prefix[2]}:00-04:00`, 7611, 7613, 7610, 7612),
    bar(`2026-06-02T${prefix[3]}:00-04:00`, 7612, 7614, 7611, 7613),
    bar(`2026-06-02T${prefix[4]}:00-04:00`, 7613, 7615, 7612, 7614),
    bar(`2026-06-02T${prefix[5]}:00-04:00`, 7614, 7616, 7613, 7614.5),
  ];
}

function buildBearishHtfState(chartTimestamp = '2026-06-02T14:10:00-04:00'): HtfLiquidityDrawState {
  return buildHtfLiquidityDrawState({
    bars4H: bearishPotentialBars('240m'),
    bars1H: bearishPotentialBars('60m'),
    bars15M: bearishPotentialBars('15m'),
    bars5M: phase5bBearishFiveMinuteBars(),
    externalSellSideLiquidityTarget: 'prior RTH low / London low / full ETH low 7580.00, 7576.00',
    chartTimestamp,
  });
}

function candlesFromBars(bars: NinjaBridgeBar[]) {
  return bars.map((item, index) => ({
    index,
    timestamp: item.time,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    direction: item.close > item.open ? 'bullish' as const : item.close < item.open ? 'bearish' as const : 'doji' as const,
    bodyQuality: index === 6 ? 'large' as const : 'normal' as const,
    isExpansion: index === 6,
    confidence: 'High' as const,
  }));
}

function baseBearishChartContext(overrides: Partial<ChartContext> = {}): ChartContext {
  const htfLiquidityDrawState = buildBearishHtfState();
  const bars5m = phase5bBearishFiveMinuteBars();
  return {
    sessionType: 'replay_lunch',
    instrument: 'MES',
    tradeDate: '2026-06-02',
    timeframe: '5m',
    screenshotRole: '5m_execution',
    chartTimestamp: '2026-06-02T14:10:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7586.75,
      activeSwingHigh: 7622,
      activeSwingLow: 7585.25,
      priorDayLow: 7580,
      previousDayLow: 7580,
      londonLow: 7578,
      overnightLow: 7576,
      nearestSupport: 7576,
      nearestResistance: 7622,
    },
    htfLiquidityDrawState,
    targetObjectives: [
      {
        label: 'Prior RTH low / London low / full ETH low',
        price: 7576,
        direction: 'SHORT',
        source: 'app',
        type: 'liquidity_pool',
        confidence: 'High',
        score: 95,
        reason: 'External sell-side liquidity remains the draw after buy-side raid/rejection.',
      },
    ],
    candles: candlesFromBars(bars5m),
    marketStructure: {
      trend: 'bearish',
      higherHigh: false,
      higherLow: false,
      lowerHigh: true,
      lowerLow: true,
      marketStructureShift: true,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: 'bearish',
      expansionCandlePresent: true,
      rejectionWickPresent: true,
      breatherCandlePresent: true,
      reclaimCandlePresent: true,
      pullbackPresent: true,
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: true,
    },
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: true,
      pullbackIntoFvg: false,
      fvgReclaimed: false,
      notes: ['Phase 5B bearish fixture: buy-side raid, rejection, confirmed bearish 5M MSS, then post-MSS digestion.'],
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
      messages: ['Phase 5B candidate-only fixture intentionally omits final entry/stop.'],
    },
    marketContext:
      'Phase 5B focused replay: HTF bearish/non-conflicting draw, buy-side raid/rejection, 15M potential support, confirmed 5M bearish MSS, external sell-side liquidity draw.',
    ...overrides,
  };
}

function baseAnalysis(chartContext: ChartContext, direction: 'LONG' | 'SHORT' = 'SHORT'): AnalysisResult {
  return {
    dayType: direction,
    reasoning: direction === 'SHORT'
      ? 'HTF bearish draw after buy-side raid/rejection; 5M bearish MSS confirms but final gates still control execution.'
      : 'HTF bullish draw after sell-side raid/reclaim; 5M bullish MSS confirms but final gates still control execution.',
    confidence: 0.86,
    checks: [],
    current_rule_analysis: {
      summary: 'Focused Phase 5B regression fixture built from structured OHLC.',
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

function pipelineCase(chartContext: ChartContext, direction: 'LONG' | 'SHORT' = 'SHORT') {
  const analysis = baseAnalysis(chartContext, direction);
  const pipeline = runTradeDecisionPipeline({
    result: analysis,
    sessionType: chartContext.sessionType,
    instrument: 'MES',
    tradeDate: chartContext.tradeDate,
  });
  const normalized = normalizeTradePlan(analysis, 'MES', chartContext.sessionType);
  return {
    status: pipeline.status,
    canExecute: normalized.canExecute,
    noTradeReason: pipeline.noTradeReason,
    finalPlan: {
      direction: pipeline.finalTradePlan.direction,
      setupType: pipeline.finalTradePlan.setupType,
      entry: pipeline.finalTradePlan.entry,
      stop: pipeline.finalTradePlan.stop,
      target1: pipeline.finalTradePlan.target1,
      target2: pipeline.finalTradePlan.target2,
      risk: pipeline.finalTradePlan.risk.riskPoints,
    },
    auditTrail: pipeline.auditTrail.map((step) => ({
      step: step.step,
      status: step.status,
      message: step.message,
      noTradeReason: step.noTradeReason || null,
    })),
    bestExecutableCandidate: candidateSummary(pipeline.opportunitySelection?.bestExecutableCandidate || null),
    bestConditionalCandidate: candidateSummary(pipeline.opportunitySelection?.bestConditionalCandidate || null),
    blockedCandidates: (pipeline.opportunitySelection?.blockedCandidates || []).map(candidateSummary),
  };
}

export function buildPhase5bBearishSymmetryReport() {
  const chartContext = baseBearishChartContext();
  const scan = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext, result: null });
  const htfCandidate = scan.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null;
  const pipeline = pipelineCase(chartContext);
  const diagnostic = runBridgeDiagnosticReplay({
    tradeDate: '2026-06-02',
    instrument: 'MES',
    session: 'replay_lunch',
    bars5m: phase5bBearishFiveMinuteBars(),
    bars15m: bearishPotentialBars('15m'),
    bars60m: bearishPotentialBars('60m'),
    bars240m: bearishPotentialBars('240m'),
    replayWindow: { from: '13:25', to: '14:10' },
    suspectedMoveDirection: 'SHORT',
    scannerSelectedCandidate: htfCandidate,
    scannerState: htfCandidate?.executionStatus || null,
    scannerAlertSent: false,
    scannerAlertReason: 'Focused local regression; no live Discord posting.',
  });
  const state = chartContext.htfLiquidityDrawState!;
  return {
    reportType: 'htf_mss_phase_5b_bearish_symmetry',
    instrument: 'MES',
    tradeDate: '2026-06-02',
    replayWindow: { from: '13:25', to: '14:10', timezone: 'America/New_York' },
    replayDataSource: 'new_focused_fixture',
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
      notMisclassifiedAsBullishContinuation:
        state.planDirection === 'SHORT' &&
        state.fiveMinuteState.direction === 'bearish' &&
        state.postShiftState !== 'opposite_mss_confirmed',
    },
    finalGateResult: {
      candidateOnly: pipeline,
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

export function buildPhase5bApprovalGatesReport() {
  const missingEntryContext = baseBearishChartContext({
    proposedEntry: null,
    proposedStop: 7592,
    riskPoints: null,
    riskStatus: 'Unknown',
    entryConfirmed: false,
    stopConfirmed: true,
    requiresManualConfirmation: true,
  });
  const missingStopContext = baseBearishChartContext({
    proposedEntry: 7596,
    proposedStop: null,
    riskPoints: null,
    riskStatus: 'Unknown',
    entryConfirmed: true,
    stopConfirmed: false,
    requiresManualConfirmation: true,
  });
  const missingTargetContext = baseBearishChartContext({
    keyLevels: {
      currentPrice: 7586.75,
      nearestSupport: null,
      nearestResistance: 7622,
    },
    targetObjectives: [],
    htfLiquidityDrawState: buildHtfLiquidityDrawState({
      bars4H: bearishPotentialBars('240m'),
      bars1H: bearishPotentialBars('60m'),
      bars15M: bearishPotentialBars('15m'),
      bars5M: phase5bBearishFiveMinuteBars(),
      chartTimestamp: '2026-06-02T14:10:00-04:00',
    }),
  });
  const missingTriggerContext = baseBearishChartContext({
    htfLiquidityDrawState: {
      ...buildBearishHtfState(),
      classification: 'MSS_TRIGGER_PENDING',
      fiveMinuteMssTriggerConfirmed: false,
      fiveMinuteMssConfirmationType: 'unknown',
      fiveMinuteState: {
        ...buildBearishHtfState().fiveMinuteState,
        status: 'pending_confirm',
        lifecycleState: 'mss_trigger_pending',
      },
      confidence: 68,
    },
  });
  const outsideWindowContext = baseBearishChartContext({
    chartTimestamp: '2026-06-02T09:45:00-04:00',
    htfLiquidityDrawState: buildBearishHtfState('2026-06-02T09:45:00-04:00'),
    proposedEntry: 7596,
    proposedStop: 7600,
    riskPoints: 4,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
  });
  const riskTooWideContext = baseBearishChartContext({
    proposedEntry: 7596,
    proposedStop: 7612,
    riskPoints: 16,
    riskStatus: 'RiskTooWide',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
  });
  const scannerReadyContext = baseBearishChartContext({
    proposedEntry: 7596,
    proposedStop: 7600,
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

  const scannerReadyScan = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: scannerReadyContext, result: null });
  const scannerReadyCandidate = scannerReadyScan.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null;
  const statusOverridePayload = compactDiscordSummary({
    session: 'lunch',
    tradeDate: '2026-06-02',
    instrument: 'MES',
    planVersionId: 'phase-5b-status-override',
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.ApprovedTrade,
      decision: 'SHORT',
      noTradeReason: NoTradeReason.EntryTriggerPending,
      invalidation: 'Status override guard fixture.',
    },
    candidates: scannerReadyCandidate ? [scannerReadyCandidate] : [],
    attachments: { chartPlan: false, priceLevelMap: false },
    statusOverride: 'Executable',
  });
  const statusOverrideText = flattenDiscordPayloadText(statusOverridePayload);
  const scannerReadyPipeline = pipelineCase(scannerReadyContext);

  const fullGateStatus =
    scannerReadyCandidate?.executionStatus === ExecutionStatus.Executable &&
    scannerReadyPipeline.status === TradeDecisionStatus.ApprovedTrade
      ? 'approved_through_existing_pipeline'
      : 'scanner_ready_but_final_replay_shell_not_approved';

  return {
    reportType: 'htf_mss_phase_5b_approval_gates',
    instrument: 'MES',
    tradeDate: '2026-06-02',
    replayDataSource: 'new_focused_fixture',
    boundary: 'diagnostic_replay_only_not_execution_authority',
    cases: {
      riskTooWide: {
        description: 'HTF/MSS-valid candidate with RiskTooWide remains non-executable.',
        scanCandidate: candidateSummary(scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: riskTooWideContext, result: null }).candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        pipeline: pipelineCase(riskTooWideContext),
      },
      missingEntry: {
        description: 'HTF/MSS-valid candidate with missing entry remains non-executable.',
        scanCandidate: candidateSummary(scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: missingEntryContext, result: null }).candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        pipeline: pipelineCase(missingEntryContext),
      },
      missingStop: {
        description: 'HTF/MSS-valid candidate with missing stop remains non-executable.',
        scanCandidate: candidateSummary(scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: missingStopContext, result: null }).candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        pipeline: pipelineCase(missingStopContext),
      },
      missingTarget: {
        description: 'HTF/MSS-valid state without external target does not create the HTF reversal-delivery candidate.',
        scanCandidate: candidateSummary(scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: missingTargetContext, result: null }).candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        pipeline: pipelineCase(missingTargetContext),
      },
      missingTrigger: {
        description: '5M pending MSS cannot create a reversal-delivery candidate.',
        scanCandidate: candidateSummary(scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: missingTriggerContext, result: null }).candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        pipeline: pipelineCase(missingTriggerContext),
      },
      outsideWindow: {
        description: 'Outside active setup scan window remains non-executable.',
        scanCandidate: candidateSummary(scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: outsideWindowContext, result: null }).candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid) || null),
        pipeline: pipelineCase(outsideWindowContext),
      },
      scannerReady: {
        description: 'All scanner candidate fields are present; final replay shell still reports whether deterministic final pipeline approved.',
        scanCandidate: candidateSummary(scannerReadyCandidate),
        pipeline: scannerReadyPipeline,
        fullGateStatus,
        documentedLimitation: fullGateStatus === 'scanner_ready_but_final_replay_shell_not_approved'
          ? 'No shortcut was added. The replay shell records scanner-ready candidate fields, while the existing final pipeline remains the only approval authority.'
          : null,
      },
      statusOverrideGuard: {
        description: 'Discord-style status override cannot say executable when canExecute is false.',
        text: statusOverrideText,
        containsExecutableCommand: /EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(statusOverrideText),
      },
    },
    safety: {
      brokerExecutionAdded: false,
      riskGateBypassed: false,
      scannerBehaviorChanged: false,
      bridgeBehaviorChanged: false,
      liveDiscordPosted: false,
      canExecuteBypassed: false,
      externalLiquidityReplacesTargets: false,
      t1T2RemainAppComputedRTargets: true,
    },
  };
}

function renderBearishMarkdown(report: ReturnType<typeof buildPhase5bBearishSymmetryReport>): string {
  const diag = report.htfLiquidityDrawState;
  return [
    '# HTF/MSS Phase 5B Bearish Symmetry Replay',
    '',
    'Boundary: diagnostic_replay_only_not_execution_authority',
    '',
    'This focused replay is local diagnostic coverage only. It does not post to Discord, place orders, or bypass app-owned final gates.',
    '',
    '## Replay Scope',
    `- Instrument: ${report.instrument}`,
    `- Date: ${report.tradeDate}`,
    `- Window: ${report.replayWindow.from}-${report.replayWindow.to} ${report.replayWindow.timezone}`,
    `- Data source: ${report.replayDataSource}`,
    `- Active Scan Window: ${diag.activeScanWindow}`,
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
    `- Not Bullish Continuation: ${report.setupDetection.notMisclassifiedAsBullishContinuation ? 'Yes' : 'No'}`,
    `- Candidate-only canExecute: ${report.finalGateResult.candidateOnly.canExecute}`,
    `- Candidate-only Status: ${report.finalGateResult.candidateOnly.status}`,
    '',
    '## Diagnostic Replay',
    `- Final Classification: ${report.diagnosticReplay.finalClassification}`,
    `- htfMssDiagnostics Present: ${report.diagnosticReplay.htfMssDiagnostics ? 'Yes' : 'No'}`,
    `- Diagnostic Approves Trade: ${report.diagnosticReplay.approvalBoundary.diagnosticApprovesTrade}`,
    '',
    '## Safety',
    '- Candidate status does not equal execution approval.',
    '- External liquidity remains draw/management context.',
    '- T1/T2 remain app-computed R targets.',
    '- No live Discord post was sent.',
    '- No broker execution was introduced.',
    '',
  ].join('\n');
}

function renderGatesMarkdown(report: ReturnType<typeof buildPhase5bApprovalGatesReport>): string {
  const lines = [
    '# HTF/MSS Phase 5B Approval-Gate Replay Coverage',
    '',
    'Boundary: diagnostic_replay_only_not_execution_authority',
    '',
    'This report proves candidate creation stays separate from executable approval. It does not loosen gates.',
    '',
    '## Gate Cases',
  ];
  for (const [name, gateCase] of Object.entries(report.cases)) {
    const candidate = 'scanCandidate' in gateCase ? gateCase.scanCandidate : null;
    const pipeline = 'pipeline' in gateCase ? gateCase.pipeline : null;
    lines.push(
      '',
      `### ${name}`,
      `- Description: ${gateCase.description}`,
      `- Scan Candidate: ${candidate?.setupType || 'None'}`,
      `- Candidate Execution: ${candidate?.executionStatus || 'N/A'}`,
      `- Candidate Blocker: ${candidate?.blockReason || 'None'}`,
      `- Pipeline Status: ${pipeline?.status || 'N/A'}`,
      `- canExecute: ${pipeline?.canExecute ?? 'N/A'}`,
      `- NoTrade Reason: ${pipeline?.noTradeReason || 'None'}`
    );
    if ('fullGateStatus' in gateCase) lines.push(`- Full Gate Status: ${gateCase.fullGateStatus}`);
    if ('containsExecutableCommand' in gateCase) lines.push(`- Contains Executable Command: ${gateCase.containsExecutableCommand}`);
  }
  lines.push(
    '',
    '## Safety',
    `- Broker Execution Added: ${report.safety.brokerExecutionAdded}`,
    `- Risk Gate Bypassed: ${report.safety.riskGateBypassed}`,
    `- Scanner Behavior Changed: ${report.safety.scannerBehaviorChanged}`,
    `- Bridge Behavior Changed: ${report.safety.bridgeBehaviorChanged}`,
    `- Live Discord Posted: ${report.safety.liveDiscordPosted}`,
    `- canExecute Bypassed: ${report.safety.canExecuteBypassed}`,
    `- External Liquidity Replaces Targets: ${report.safety.externalLiquidityReplacesTargets}`,
    `- T1/T2 Remain App-Computed R Targets: ${report.safety.t1T2RemainAppComputedRTargets}`,
    ''
  );
  return lines.join('\n');
}

export function writePhase5bRegressionArtifacts(outDir = REPORT_DIR) {
  mkdirSync(outDir, { recursive: true });
  const bearish = buildPhase5bBearishSymmetryReport();
  const gates = buildPhase5bApprovalGatesReport();
  const bearishJsonPath = join(outDir, 'htf-mss-phase-5b-bearish-symmetry.json');
  const bearishMarkdownPath = join(outDir, 'htf-mss-phase-5b-bearish-symmetry.md');
  const gatesJsonPath = join(outDir, 'htf-mss-phase-5b-approval-gates.json');
  const gatesMarkdownPath = join(outDir, 'htf-mss-phase-5b-approval-gates.md');
  writeFileSync(bearishJsonPath, `${JSON.stringify(bearish, null, 2)}\n`, 'utf8');
  writeFileSync(bearishMarkdownPath, renderBearishMarkdown(bearish), 'utf8');
  writeFileSync(gatesJsonPath, `${JSON.stringify(gates, null, 2)}\n`, 'utf8');
  writeFileSync(gatesMarkdownPath, renderGatesMarkdown(gates), 'utf8');
  return { bearishJsonPath, bearishMarkdownPath, gatesJsonPath, gatesMarkdownPath, bearish, gates };
}

export function runPhase5bRegressionCli(): void {
  const { bearishJsonPath, bearishMarkdownPath, gatesJsonPath, gatesMarkdownPath, bearish, gates } = writePhase5bRegressionArtifacts();
  console.log(`Phase 5B bearish replay saved: ${bearishJsonPath}`);
  console.log(`Phase 5B bearish markdown saved: ${bearishMarkdownPath}`);
  console.log(`Phase 5B approval gates saved: ${gatesJsonPath}`);
  console.log(`Phase 5B approval gates markdown saved: ${gatesMarkdownPath}`);
  console.log(`Bearish setup: ${bearish.setupDetection.setupType} ${bearish.setupDetection.direction}`);
  console.log(`RiskTooWide canExecute: ${gates.cases.riskTooWide.pipeline.canExecute}`);
  console.log(`Scanner-ready final status: ${gates.cases.scannerReady.fullGateStatus}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runPhase5bRegressionCli();
}
