import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type ChartContext, type SetupCandidate } from '../../src/types';
import { buildChartMarkupHtmlForTest, buildPriceLevelMapHtmlForTest, renderChartMarkup, renderPriceLevelMap, resolveChartMarkerAnchorFacts, verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

const outputDir = path.join(os.tmpdir(), `chart-markup-renderer-${Date.now()}`);

const candles = Array.from({ length: 48 }, (_, index) => {
  const base = index < 18 ? 7084 - index * 0.35 : 7077 + (index - 18) * 0.45;
  const open = base;
  const close = index % 5 === 0 ? base - 0.35 : base + 0.35;
  return {
    index,
    timestamp: `2026-05-22T${String(9 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
    open,
    high: Math.max(open, close) + 0.6,
    low: Math.min(open, close) - 0.6,
    close,
    direction: close >= open ? 'bullish' as const : 'bearish' as const,
    confidence: 'High' as const,
  };
});

const chartContext: Partial<ChartContext> = {
  candles,
  fvgZones: [{
    direction: 'LONG',
    lower: 7079.25,
    upper: 7081.5,
    midpoint: 7080.375,
    confidence: 'High',
  }],
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'LONG',
    level: 7077.25,
    sweptLevelLabel: 'Sell-side liquidity',
    reclaimed: true,
    timestamp: candles[18].timestamp,
    confidence: 'High',
  }],
  reclaimEvents: [{
    direction: 'LONG',
    reclaimedLevel: 7077.25,
    levelLabel: 'Sell-side liquidity',
    timestamp: candles[22].timestamp,
    candleIndex: 22,
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'LONG',
    candleIndex: 30,
    timestamp: candles[30].timestamp,
    open: candles[30].open,
    high: candles[30].high,
    low: candles[30].low,
    close: candles[30].close,
    bodyPoints: Math.abs(candles[30].close - candles[30].open),
    rangePoints: candles[30].high - candles[30].low,
    confidence: 'High',
  }],
  marketStructure: {
    trend: 'bullish',
    higherHigh: true,
    higherLow: true,
    lowerHigh: false,
    lowerLow: false,
    marketStructureShift: true,
    chopRangeCondition: false,
  },
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: {} as any,
    oneHour: {} as any,
    fifteenMinute: {} as any,
    fiveMinute: {} as any,
    alignment: {
      macroBias: 'LONG',
      sessionBias: 'LONG',
      liquidityBias: 'LONG',
      executionBias: 'LONG',
      alignedDirection: 'LONG',
      conflicts: [],
      notes: ['Bullish alignment.'],
      summary: 'Bullish alignment.',
    } as any,
    targetMap: {
      levelsToWatch: [],
    },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  },
};

const candidate: SetupCandidate = {
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Sweep -> MSS -> FVG Retrace',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Possible,
  confidence: 'Medium',
  priority: 10,
  entry: 7080.25,
  stop: 7075.25,
  target1: 7086.5,
  target2: 7092.25,
  riskPoints: 5,
  targetObjectivePlan: {
    targetQuality: 'clear_path',
    targetModel: 'actual_r_with_structural_context',
    objectives: [],
    notes: [],
    obstacleTarget1: {
      label: 'Opening range reaction zone',
      price: 7084.75,
      direction: 'LONG',
      source: 'rth_morning',
      type: 'imbalance_zone',
      confidence: 'Medium',
      score: 64,
      reason: 'Reaction zone before liquidity.',
    },
    liquidityTarget1: {
      label: 'Buy-side liquidity',
      price: 7095.25,
      direction: 'LONG',
      source: 'london',
      type: 'high',
      confidence: 'High',
      score: 90,
      reason: 'Buy-side liquidity above entry.',
    },
    liquidityTarget2: {
      label: 'Prior session high',
      price: 7098.5,
      direction: 'LONG',
      source: 'previous_rth',
      type: 'high',
      confidence: 'High',
      score: 86,
      reason: 'Second real liquidity objective.',
    },
    liquidityRunnerTarget: {
      label: 'Runner high',
      price: 7101.25,
      direction: 'LONG',
      source: 'current_window',
      type: 'high',
      confidence: 'Medium',
      score: 72,
      reason: 'Runner objective if T2 clears.',
    },
  },
  invalidation: 'Invalid below sweep low.',
  entryClarity: 1,
  stopClarity: 1,
  targetClarity: 1,
  proximityScore: 1,
  levelContextScore: 12,
  evidence: ['Liquidity sweep confirmed', 'Reclaim after sweep confirmed', 'Displacement confirmed', 'Market structure shift confirmed', 'Fair value gap / imbalance entry model'],
  missingEvidence: [],
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Wait for 5M retrace into FVG.',
  nextAction: 'Wait for 5M trigger.',
  reducedRiskPlan: null,
  decisionQualityScore: 78,
  decisionQualityRecommendation: 'Conditional: wait for trigger.',
};

try {
  const missingCandidateChart = await renderChartMarkup({
    chartContext,
    candidate: null,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'missing-candidate',
  });
  assert.equal(missingCandidateChart, null);
  const missingCandidateLevelMap = await renderPriceLevelMap({
    chartContext,
    candidate: null,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'missing-candidate',
  });
  assert.equal(missingCandidateLevelMap, null);

  const candidateBeforeRender = JSON.stringify(candidate);
  const chartHtml = buildChartMarkupHtmlForTest({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(JSON.stringify(candidate), candidateBeforeRender, 'chart renderer must not mutate the input candidate');
  assert.ok(chartHtml.includes('[AM PLAN] MES - LONG CONDITIONAL'));
  assert.ok(chartHtml.includes('Action: wait for 5M trigger'));
  assert.ok(chartHtml.includes('Risk: <tspan fill="#f8fafc">5.00 pts</tspan>'));
  assert.ok(chartHtml.includes('Contracts: <tspan fill="#f8fafc">N/A</tspan>'));
  assert.ok(chartHtml.includes('T1: <tspan fill="#facc15">1.5R</tspan>'));
  assert.ok(chartHtml.includes('T2: <tspan fill="#facc15">2.0R</tspan>'));
  assert.ok(chartHtml.includes('LONG ENTRY ZONE'));
  assert.ok(chartHtml.includes('7080.25'));
  assert.ok(chartHtml.includes('7075.25'));
  assert.ok(chartHtml.includes('7087.75'));
  assert.ok(chartHtml.includes('7090.25'));
  assert.ok(chartHtml.includes('7092.25'));
  assert.ok(!chartHtml.includes('canExecute'));
  assert.ok(!chartHtml.includes('noTradeReason'));

  const earlyMorningCandles = Array.from({ length: 20 }, (_, index) => {
    const totalMinutes = 8 * 60 + 30 + index * 5;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const base = 7600 + index * 0.25;
    return {
      index,
      timestamp: `2026-06-02T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-04:00`,
      open: base,
      high: base + 0.75,
      low: base - 0.75,
      close: base + 0.25,
      direction: 'bullish' as const,
      confidence: 'High' as const,
    };
  });
  const earlyMorningHtml = buildChartMarkupHtmlForTest({
    chartContext: { ...chartContext, candles: earlyMorningCandles },
    candidate: {
      ...candidate,
      entry: 7603.25,
      stop: 7599,
      target1: 7611.75,
      target2: 7620,
      riskPoints: 4.25,
    },
    instrument: 'MES',
    tradeDate: '2026-06-02',
    sessionLabel: 'morning',
  });
  assert.ok(!earlyMorningHtml.includes('>08:30<'), 'AM chart card should not waste visual room on 08:30 when 09:00 context is available.');
  assert.ok(earlyMorningHtml.includes('>09:00<'), 'AM chart card should start visible time labels at 09:00 when possible.');
  assert.ok(earlyMorningHtml.includes('>10:05<'), 'AM chart card should keep the latest completed candle visible.');
  assert.equal(earlyMorningHtml.includes('>10:00<') && earlyMorningHtml.includes('>10:05<'), false, 'Adjacent final time labels must not overlap.');
  assert.ok(earlyMorningHtml.includes('width="610"'), 'Entry-zone band should stop before the protected price-axis gutter.');
  assert.ok(!earlyMorningHtml.includes('x2="1408"'), 'Chart grid/level lines should not draw into the protected price-axis gutter.');
  assert.ok(earlyMorningHtml.includes('class="axis"'), 'Price-axis labels should still render.');
  assert.ok(earlyMorningHtml.includes('<text x="1418"'), 'Price-axis labels should stay in the fixed right-side rail.');

  const june10MorningCandles = [
    ...Array.from({ length: 22 }, (_, index) => {
      const totalMinutes = 9 * 60 + index * 5;
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const base = index < 8 ? 7350 + index * 0.35 : 7366 + (index - 8) * 1.2;
      const open = index === 7 ? 7352 : base;
      const close = index === 7 ? 7338.5 : index === 8 ? 7366.5 : base + (index % 3 === 0 ? -0.5 : 0.75);
      return {
        index,
        timestamp: `2026-06-10T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-04:00`,
        open,
        high: Math.max(open, close) + 2,
        low: index === 7 ? 7335 : Math.min(open, close) - 2,
        close,
        direction: close >= open ? 'bullish' as const : 'bearish' as const,
        confidence: 'High' as const,
      };
    }),
    {
      index: 999,
      timestamp: '2026-06-10T23:55:00-04:00',
      open: 7370,
      high: 7378,
      low: 7368,
      close: 7372.5,
      direction: 'bullish' as const,
      confidence: 'High' as const,
    },
  ];
  const june10Candidate: SetupCandidate = {
    ...candidate,
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Bullish Turtle Soup Reversal - normalized plan not executable',
    direction: 'LONG',
    entry: 7366.5,
    stop: 7335,
    target1: 7413.75,
    target2: 7429.5,
    riskPoints: 31.5,
    targetObjectivePlan: {
      ...candidate.targetObjectivePlan,
      obstacleTarget1: {
        label: 'Opening decision line',
        price: 7367.5,
        direction: 'LONG',
        source: 'rth_morning',
        type: 'imbalance_zone',
        confidence: 'Medium',
        score: 64,
        reason: 'Reaction zone before liquidity.',
      },
      liquidityTarget1: {
        label: 'Runner high',
        price: 7450,
        direction: 'LONG',
        source: 'rth_morning',
        type: 'high',
        confidence: 'High',
        score: 86,
        reason: 'Runner objective if T2 clears.',
      },
      liquidityRunnerTarget: {
        label: 'Stretch high',
        price: 7632.75,
        direction: 'LONG',
        source: 'ninjatrader',
        type: 'high',
        confidence: 'Medium',
        score: 70,
        reason: 'Stretch objective only; not app target validation.',
      },
    },
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
  };
  const june10Context: Partial<ChartContext> = {
    ...chartContext,
    candles: june10MorningCandles,
    fvgZones: [],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7338.25,
      sweptLevelLabel: 'Sell-side liquidity',
      reclaimed: true,
      timestamp: june10MorningCandles[7].timestamp,
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'LONG',
      reclaimedLevel: 7338.25,
      levelLabel: 'Sell-side liquidity',
      timestamp: june10MorningCandles[8].timestamp,
      candleIndex: 8,
      confidence: 'High',
    }],
  };
  const june10Html = buildChartMarkupHtmlForTest({
    chartContext: june10Context,
    candidate: june10Candidate,
    instrument: 'MES',
    tradeDate: '2026-06-10',
    sessionLabel: 'morning',
  });
  assert.ok(!june10Html.includes('Data Error'), 'A stale optional stretch target must not poison app-owned T1/T2 validation.');
  assert.ok(june10Html.includes('Review Required — Extension target is outside the current chart window.'));
  assert.ok(june10Html.includes('7413.75'), 'App-owned 1.5R T1 should remain visible when optional stretch is far away.');
  assert.ok(june10Html.includes('7429.50'), 'App-owned 2.0R T2 should remain visible when optional stretch is far away.');
  assert.ok(!june10Html.includes('7632.75'), 'Far stretch target should be kept out of the execution chart scale.');
  assert.ok(!june10Html.includes('>23:55<'), 'AM chart card must not pull late-session candles into the right edge.');
  assert.ok(june10Html.includes('>10:45<'), 'AM chart card should keep the latest morning completed candle visible.');

  const june10LevelMapHtml = buildPriceLevelMapHtmlForTest({
    chartContext: june10Context,
    candidate: june10Candidate,
    instrument: 'MES',
    tradeDate: '2026-06-10',
    sessionLabel: 'morning',
  });
  assert.ok(!june10LevelMapHtml.includes('Data Error'), 'Level map must keep app targets valid when only optional extension context is far away.');
  assert.ok(june10LevelMapHtml.includes('T1 1.5R'));
  assert.ok(june10LevelMapHtml.includes('T2 2.0R'));
  assert.ok(june10LevelMapHtml.includes('7413.75'));
  assert.ok(june10LevelMapHtml.includes('7429.50'));
  assert.ok(!june10LevelMapHtml.includes('<text x="256"') || !june10LevelMapHtml.includes('HTF EXT'), 'Far stretch should not render as a plotted level row.');

  const levelMapHtml = buildPriceLevelMapHtmlForTest({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(JSON.stringify(candidate), candidateBeforeRender, 'level map renderer must not mutate the input candidate');
  assert.ok(levelMapHtml.includes('[AM PLAN] MES - LONG CONDITIONAL'));
  assert.ok(levelMapHtml.includes('Action: wait for 5M trigger'));
  assert.ok(levelMapHtml.includes('pending trigger'));
  assert.ok(levelMapHtml.includes('ENTRY WAIT'));
  assert.ok(levelMapHtml.includes('STOP'));
  assert.ok(levelMapHtml.includes('T1 1.5R'));
  assert.ok(levelMapHtml.includes('T2 2.0R'));
  assert.ok(levelMapHtml.includes('HTF RUNNER'));
  assert.ok(levelMapHtml.includes('HTF EXT'));
  assert.ok(levelMapHtml.includes('OBSTACLE'));
  assert.ok(levelMapHtml.includes('Risk 5.00 pts | Dollars N/A | Contracts N/A'));
  assert.ok(levelMapHtml.includes('Obstacle 7084.75'));
  assert.ok(levelMapHtml.includes('HTF Runner 7092.25'));
  assert.ok(levelMapHtml.includes('HTF Ext 7101.25'));
  assert.ok(!levelMapHtml.includes('canExecute'));
  assert.ok(!levelMapHtml.includes('noTradeReason'));

  const noTradeCandidate: SetupCandidate = {
    ...candidate,
    direction: 'NO TRADE',
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    executionStatus: ExecutionStatus.NotDetected,
    blockReason: NoTradeReason.NoApprovedSetup,
  };
  const noTradeChart = await renderChartMarkup({
    chartContext,
    candidate: noTradeCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'no-trade',
  });
  assert.equal(noTradeChart, null, 'NO TRADE rendering must not invent entry/stop/target levels');
  const noTradeMap = await renderPriceLevelMap({
    chartContext,
    candidate: noTradeCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'no-trade',
  });
  assert.equal(noTradeMap, null, 'NO TRADE level map must not invent trade levels');

  const missingLevelsCandidate: SetupCandidate = {
    ...candidate,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
  };
  const missingLevelsHtml = buildChartMarkupHtmlForTest({
    chartContext,
    candidate: missingLevelsCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.ok(missingLevelsHtml.includes('Entry Zone: <tspan fill="#4ade80">N/A - N/A</tspan>'));
  assert.ok(missingLevelsHtml.includes('Stop: <tspan fill="#ef4444">N/A</tspan>'));
  assert.ok(missingLevelsHtml.includes('Risk: <tspan fill="#f97316">N/A</tspan>'));
  assert.ok(!missingLevelsHtml.includes('>0.00<'));
  assert.ok(!missingLevelsHtml.includes('0.00</tspan>'));

  const fullDeskReviewCandles = Array.from({ length: 85 }, (_, index) => {
    const hour = 9 + Math.floor(index / 12);
    const minute = (index % 12) * 5;
    const open = 7080 + index * 0.15;
    const close = open + (index % 2 === 0 ? 0.25 : -0.15);
    return {
      index,
      timestamp: `2026-05-22T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-04:00`,
      open,
      high: Math.max(open, close) + 0.5,
      low: Math.min(open, close) - 0.5,
      close,
      direction: close >= open ? 'bullish' as const : 'bearish' as const,
      confidence: 'High' as const,
    };
  });
  const deskReviewHtml = buildChartMarkupHtmlForTest({
    chartContext: { ...chartContext, candles: fullDeskReviewCandles },
    candidate: {
      ...missingLevelsCandidate,
      activeRuleset: {
        htfLineInSand: {
          applied: true,
          status: 'passed',
          required: 'completed_5m_or_15m_close_beyond_htf_line',
          appliesToAllModels: true,
          affectsExecution: false,
          direction: 'LONG',
          lineInSand: 7075,
          lineReason: 'Desk review line',
          requiredClose: 'Hold above 7075.00',
          obstacleType: null,
          obstacleSource: null,
          evidence: [],
          blockers: [],
        },
      },
    },
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'Morning Desk Review',
    renderMode: 'desk_play_context',
  });
  assert.ok(deskReviewHtml.includes('>16:00<'), 'desk-review charts must not clip campaigns at noon');
  const failedShortReviewHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext,
    candidate: {
      ...candidate,
      direction: 'SHORT',
      entry: 7581.25,
      stop: 7600.5,
      target1: 7552.5,
      target2: 7542.75,
      riskPoints: 19.25,
      decisionQualityScore: 44,
      decisionQualityScorecard: [
        { label: 'LONG Quality', score: 98, max: 100, status: 'strong', note: 'high' },
        { label: 'SHORT Quality', score: 44, max: 100, status: 'weak', note: 'low' },
      ],
    },
    instrument: 'MES',
    tradeDate: '2026-06-17',
    sessionLabel: 'Morning Desk Review',
    renderMode: 'desk_play_context',
    contextLine: 7591,
    contextLabel: 'Line in the sand',
  });
  assert.ok(failedShortReviewHtml.includes('SHORT FAILED'));
  assert.ok(failedShortReviewHtml.includes('WATCH ONLY'));
  assert.ok(failedShortReviewHtml.includes('LONG Watch - Not A Trade Plan'));
  assert.ok(failedShortReviewHtml.includes('Action: no execution'));
  assert.ok(failedShortReviewHtml.includes('DESK READINESS'));
  assert.ok(failedShortReviewHtml.includes('Primary Map: <tspan fill="#f8fafc">SHORT 44/100 low</tspan>'));
  assert.ok(failedShortReviewHtml.includes('Opposing Context: <tspan fill="#f8fafc">LONG 98/100 high</tspan>'));
  assert.ok(failedShortReviewHtml.includes('Execution: <tspan fill="#facc15">Review only / canExecute=false</tspan>'));
  assert.ok(failedShortReviewHtml.includes('Trigger: <tspan fill="#f8fafc">no execution</tspan>'));
  assert.ok(failedShortReviewHtml.includes('Risk: <tspan fill="#f8fafc">19.25 pts review</tspan>'));
  assert.ok(failedShortReviewHtml.includes('Targets: <tspan fill="#f8fafc">T1/T2 available</tspan>'));
  assert.ok(failedShortReviewHtml.includes('HTF Context: <tspan fill="#f8fafc">LONG</tspan>'));
  assert.ok(failedShortReviewHtml.includes('do not execute this side'));
  const morningTradePlanHtml = buildChartMarkupHtmlForTest({
    chartContext: { ...chartContext, candles: fullDeskReviewCandles },
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.ok(!morningTradePlanHtml.includes('>16:00<'), 'normal morning trade-plan charts should keep the morning crop');

  const output = await renderChartMarkup({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'test',
  });
  assert.ok(output);
  const stat = await fs.stat(output);
  assert.ok(stat.size > 20_000);
  const approvedFormat = await verifyApprovedDailyTradePlanRender(output);
  assert.deepEqual(approvedFormat, { ok: true });
  const longAnchors = resolveChartMarkerAnchorFacts({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(longAnchors.sweep?.candleIndex, 18);
  assert.equal(longAnchors.sweep?.price, candles[18].low);
  assert.equal(longAnchors.sweep?.source, 'event_timestamp');
  assert.ok(longAnchors.sweep.price <= 7077.25);
  assert.equal(longAnchors.reclaim?.candleIndex, 22);
  assert.equal(longAnchors.reclaim?.price, 7077.25);
  assert.equal(longAnchors.reclaim?.source, 'event_candle_index');
  assert.equal(longAnchors.displacement?.candleIndex, 30);
  assert.equal(longAnchors.displacement?.price, candles[30].close);
  const longFallbackAnchors = resolveChartMarkerAnchorFacts({
    chartContext: {
      ...chartContext,
      liquiditySweeps: [{
        type: 'sweep',
        direction: 'LONG',
        level: 7077.25,
        sweptLevelLabel: 'Sell-side liquidity',
        reclaimed: true,
        confidence: 'High',
      }],
      reclaimEvents: [{
        direction: 'LONG',
        reclaimedLevel: 7077.25,
        levelLabel: 'Sell-side liquidity',
        timestamp: candles[22].timestamp,
        confidence: 'High',
      }],
      displacementCandles: [{
        direction: 'LONG',
        candleIndex: 999,
        timestamp: candles[30].timestamp,
        open: candles[30].open,
        high: candles[30].high,
        low: candles[30].low,
        close: candles[30].close,
        bodyPoints: Math.abs(candles[30].close - candles[30].open),
        rangePoints: candles[30].high - candles[30].low,
        confidence: 'High',
      }],
    },
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(longFallbackAnchors.sweep?.candleIndex, 18);
  assert.equal(longFallbackAnchors.sweep?.source, 'crossed_swept_level');
  assert.equal(longFallbackAnchors.sweep?.price, candles[18].low);
  assert.equal(longFallbackAnchors.reclaim?.candleIndex, 22);
  assert.equal(longFallbackAnchors.reclaim?.source, 'event_timestamp');
  assert.equal(longFallbackAnchors.displacement?.candleIndex, 30);
  assert.equal(longFallbackAnchors.displacement?.source, 'event_timestamp');

  const shortCandles = Array.from({ length: 28 }, (_, index) => {
    const base = 7560 + Math.sin(index / 3) * 1.2 + index * 0.03;
    const open = index === 9 ? 7563.6 : base;
    const close = index === 9 ? 7564.4 : index === 12 ? 7564.4 : index === 18 ? 7558.4 : base - 0.2;
    return {
      index,
      timestamp: `2026-05-22T${String(10 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
      open,
      high: index === 9 ? 7565.75 : Math.max(open, close) + 0.35,
      low: Math.min(open, close) - 0.35,
      close,
      direction: close >= open ? 'bullish' as const : 'bearish' as const,
      confidence: 'High' as const,
    };
  });
  const shortContext: Partial<ChartContext> = {
    candles: shortCandles,
    fvgZones: [{ direction: 'SHORT', lower: 7563.69, upper: 7564.31, midpoint: 7564, confidence: 'High' }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7565,
      sweptLevelLabel: 'Buy-side liquidity',
      reclaimed: true,
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'SHORT',
      reclaimedLevel: 7565,
      levelLabel: 'Buy-side liquidity',
      timestamp: shortCandles[12].timestamp,
      candleIndex: 12,
      confidence: 'High',
    }],
    displacementCandles: [{
      direction: 'SHORT',
      candleIndex: 18,
      timestamp: shortCandles[18].timestamp,
      open: shortCandles[18].open,
      high: shortCandles[18].high,
      low: shortCandles[18].low,
      close: shortCandles[18].close,
      bodyPoints: Math.abs(shortCandles[18].close - shortCandles[18].open),
      rangePoints: shortCandles[18].high - shortCandles[18].low,
      confidence: 'High',
    }],
  };
  const shortCandidate: SetupCandidate = {
    ...candidate,
    direction: 'SHORT',
    entry: 7564,
    stop: 7566,
    target1: 7561,
    target2: 7558,
    targetObjectivePlan: {
      ...candidate.targetObjectivePlan,
      liquidityTarget1: {
        label: 'Sell-side liquidity',
        price: 7554,
        direction: 'SHORT',
        source: 'london',
        type: 'low',
        confidence: 'High',
        score: 90,
        reason: 'Sell-side liquidity below entry.',
      },
    },
  };
  const shortAnchors = resolveChartMarkerAnchorFacts({
    chartContext: shortContext,
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.equal(shortAnchors.sweep?.candleIndex, 9);
  assert.equal(shortAnchors.sweep?.price, shortCandles[9].high);
  assert.equal(shortAnchors.sweep?.source, 'crossed_swept_level');
  assert.ok(shortAnchors.sweep.price >= 7565);
  assert.equal(shortAnchors.reclaim?.candleIndex, 12);
  assert.equal(shortAnchors.reclaim?.price, 7565);
  assert.equal(shortAnchors.displacement?.candleIndex, 18);
  assert.equal(shortAnchors.displacement?.price, shortCandles[18].close);
  const shortOutput = await renderChartMarkup({
    chartContext: shortContext,
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'short-test',
  });
  assert.ok(shortOutput);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(shortOutput), { ok: true });
  const shortLevelMap = await renderPriceLevelMap({
    chartContext: shortContext,
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'short-test',
  });
  assert.ok(shortLevelMap);
  assert.match(path.basename(shortLevelMap), /level-map/);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(shortLevelMap), { ok: true });

  const missingAnchors = resolveChartMarkerAnchorFacts({
    chartContext: { candles: shortCandles, liquiditySweeps: [], reclaimEvents: [], displacementCandles: [] },
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.deepEqual(missingAnchors, { sweep: null, reclaim: null, displacement: null });
  const noCrossingSweepAnchors = resolveChartMarkerAnchorFacts({
    chartContext: {
      candles: shortCandles,
      liquiditySweeps: [{
        type: 'sweep',
        direction: 'SHORT',
        level: 9000,
        sweptLevelLabel: 'Buy-side liquidity',
        reclaimed: true,
        confidence: 'High',
      }],
      reclaimEvents: [],
      displacementCandles: [],
    },
    candidate: shortCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
  });
  assert.deepEqual(noCrossingSweepAnchors, { sweep: null, reclaim: null, displacement: null });

  const levelMap = await renderPriceLevelMap({
    chartContext,
    candidate,
    instrument: 'MES',
    tradeDate: '2026-05-22',
    sessionLabel: 'morning',
    outputDir,
    filePrefix: 'test',
  });
  assert.ok(levelMap);
  assert.match(path.basename(levelMap), /level-map/);
  const levelMapFormat = await verifyApprovedDailyTradePlanRender(levelMap);
  assert.deepEqual(levelMapFormat, { ok: true });
  console.log('chart markup renderer tests passed');
} finally {
  await fs.rm(outputDir, { recursive: true, force: true });
}
