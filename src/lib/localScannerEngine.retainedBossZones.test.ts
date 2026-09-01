import assert from 'node:assert/strict';
import { buildCandidateLifecycleTrace, buildDeskState, classifyScannerVisibility, type ScannerAlertDecision } from './localScannerEngine';

const alertDecision: ScannerAlertDecision = {
  shouldSend: false,
  reason: 'Loopback map-only check.',
};

function factSet(overrides: Record<string, unknown> = {}) {
  return {
    timeframe: '15m',
    role: 'session_structure',
    barCount: 120,
    high: 7790,
    low: 7670,
    open: 7688,
    close: 7692.75,
    midpoint: 7730,
    rangePoints: 120,
    trend: 'balanced',
    candles: [],
    fvgZones: [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    structuralLevels: [],
    confidence: 'High',
    notes: [],
    ...overrides,
  };
}

function explicitThreeDayFvgZones() {
  return [
    { direction: 'LONG', lower: 7679.5, upper: 7682.5, midpoint: 7681, formedAt: '2026-08-27T16:45:00-04:00', formedCandleIndex: 0, impulseQualified: true, confidence: 'High' },
    ...Array.from({ length: 12 }, (_, index) => {
      const lower = 7686.5 + index;
      return {
        direction: 'LONG',
        lower,
        upper: lower + 1,
        midpoint: lower + 0.5,
        formedAt: `2026-08-30T${String(1 + index).padStart(2, '0')}:00:00-04:00`,
        formedCandleIndex: 20 + index,
        impulseQualified: true,
        confidence: 'High',
      };
    }),
    { direction: 'SHORT', lower: 7723.25, upper: 7725.25, midpoint: 7724.25, formedAt: '2026-08-28T13:30:00-04:00', formedCandleIndex: 22, impulseQualified: true, confidence: 'High' },
  ];
}

function chartContext(latestClose: number, useExplicitFvgZones = true) {
  return {
    sessionType: 'lunch',
    instrument: 'MES',
    tradeDate: '2026-08-30',
    timeframe: '5m',
    screenshotUsability: 'usable',
    keyLevels: { currentPrice: latestClose },
    candles: [
      { index: 0, timestamp: '2026-08-30T10:15:00-04:00', open: 7690, high: 7698, low: 7678.25, close: latestClose, direction: latestClose >= 7680 ? 'bullish' : 'bearish', confidence: 'High' },
    ],
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      alignment: {
        macroBias: 'SHORT',
        sessionBias: 'SHORT',
        liquidityBias: 'SHORT',
        executionBias: 'SHORT',
        alignedDirection: 'SHORT',
        conflicts: [],
        notes: [],
      },
      fifteenMinute: factSet({
        timeframe: '15m',
        candles: [
          { index: 0, timestamp: '2026-08-27T16:15:00-04:00', open: 7673, high: 7679.5, low: 7671, close: 7678, direction: 'bullish', confidence: 'High' },
          { index: 1, timestamp: '2026-08-27T16:30:00-04:00', open: 7678, high: 7681, low: 7676, close: 7680, direction: 'bullish', confidence: 'High' },
          { index: 2, timestamp: '2026-08-27T16:45:00-04:00', open: 7681, high: 7740, low: 7682.5, close: 7734, direction: 'bullish', confidence: 'High' },
          { index: 3, timestamp: '2026-08-28T13:00:00-04:00', open: 7720, high: 7723.25, low: 7718, close: 7721, direction: 'bullish', confidence: 'High' },
          { index: 4, timestamp: '2026-08-28T13:15:00-04:00', open: 7721, high: 7722, low: 7719, close: 7720, direction: 'bearish', confidence: 'High' },
          { index: 5, timestamp: '2026-08-28T13:30:00-04:00', open: 7718, high: 7721, low: 7715, close: 7716, direction: 'bearish', confidence: 'High' },
          { index: 6, timestamp: '2026-08-30T10:15:00-04:00', open: 7710, high: 7712, low: 7678.25, close: latestClose, direction: latestClose >= 7680 ? 'bullish' : 'bearish', confidence: 'High' },
        ],
        fvgZones: useExplicitFvgZones ? explicitThreeDayFvgZones() : [],
      }),
      fiveMinute: factSet({
        timeframe: '5m',
        role: 'execution',
        candles: [
          { index: 0, timestamp: '2026-08-30T10:15:00-04:00', open: 7690, high: 7698, low: 7678.25, close: latestClose, direction: latestClose >= 7680 ? 'bullish' : 'bearish', confidence: 'High' },
        ],
      }),
      oneHour: factSet({ timeframe: '1h' }),
      fourHour: factSet({ timeframe: '4h', role: 'macro_context' }),
      targetMap: { liquidityTargets: [], imbalanceTargets: [], reactionZones: [], notes: [] },
    },
    marketContext: 'Loopback retained boss-zone map.',
  } as any;
}

function deskStateFor(latestClose: number, useExplicitFvgZones = true) {
  const visibilityMetadata = classifyScannerVisibility({
    state: 'NoTrade',
    candidate: null,
    alertDecision,
    canExecute: false,
  });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [],
    selectedCandidate: null,
    state: 'NoTrade',
    alertDecision,
    canExecute: false,
  });
  return buildDeskState({
    state: 'NoTrade',
    candidate: null,
    visibilityMetadata,
    candidateLifecycleTrace: lifecycle,
    currentPrice: latestClose,
    canExecute: false,
    chartContext: chartContext(latestClose, useExplicitFvgZones),
  });
}

const defended = deskStateFor(7692.75);
assert.equal(defended.primaryDeskPlay.direction, 'WAIT');
assert.equal(defended.primaryDeskPlay.retainedBossZones.bullBoss?.lower, 7679.5);
assert.equal(defended.primaryDeskPlay.retainedBossZones.bullBoss?.upper, 7682.5);
assert.equal(defended.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'defended');
assert.match(defended.primaryDeskPlay.retainedBossZones.bullBoss?.stateReason || '', /wick-through is treated as defense/i);
assert.equal(defended.primaryDeskPlay.retainedBossZones.bearBoss?.lower, 7723.25);
assert.ok(defended.primaryDeskPlay.retainedBossZones.activeMssProtectedBossZone);
assert.equal(defended.primaryDeskPlay.activeMssProtectedBossZone?.role, 'active_mss_protected_boss_zone');
assert.equal(defended.primaryDeskPlay.retainedBossZones.approvalBoundary.changesCanExecute, false);

const invalidated = deskStateFor(7678.75);
assert.equal(invalidated.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'invalidated');
assert.match(invalidated.primaryDeskPlay.retainedBossZones.bullBoss?.stateReason || '', /scanner reference price/i);
assert.equal(invalidated.primaryDeskPlay.retainedBossZones.approvalBoundary.changesTradeApprovals, false);

const derivedOnly = deskStateFor(7692.75, false);
assert.equal(derivedOnly.primaryDeskPlay.retainedBossZones.bullBoss?.lower, 7679.5);
assert.equal(derivedOnly.primaryDeskPlay.retainedBossZones.bullBoss?.upper, 7682.5);
assert.equal(derivedOnly.primaryDeskPlay.retainedBossZones.bullBoss?.formedAt, '2026-08-27T16:45:00-04:00');
assert.equal(derivedOnly.primaryDeskPlay.retainedBossZones.bullBoss?.sourceKind, 'strict_15m_fvg');
assert.equal(derivedOnly.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'defended');

const mssProtectedOriginChartContext = {
  sessionType: 'morning',
  instrument: 'MES',
  tradeDate: '2026-08-31',
  timeframe: '5m',
  screenshotUsability: 'usable',
  keyLevels: { currentPrice: 7696 },
  candles: [
    { index: 0, timestamp: '2026-08-31T09:45:00-04:00', open: 7692, high: 7698, low: 7683.5, close: 7696, direction: 'bullish', confidence: 'High' },
  ],
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    alignment: {
      macroBias: 'LONG',
      sessionBias: 'LONG',
      liquidityBias: 'LONG',
      executionBias: 'LONG',
      alignedDirection: 'LONG',
      conflicts: [],
      notes: [],
    },
    fifteenMinute: factSet({
      timeframe: '15m',
      candles: [
        { index: 0, timestamp: '2026-08-30T19:15:00-04:00', open: 7680, high: 7681, low: 7676, close: 7677, direction: 'bearish', confidence: 'High' },
        { index: 1, timestamp: '2026-08-30T19:30:00-04:00', open: 7677, high: 7684.25, low: 7675.5, close: 7679.75, direction: 'bullish', confidence: 'High' },
        { index: 2, timestamp: '2026-08-30T19:45:00-04:00', open: 7679.75, high: 7681, low: 7678, close: 7679, direction: 'bearish', confidence: 'High' },
        { index: 3, timestamp: '2026-08-30T20:00:00-04:00', open: 7684, high: 7740, low: 7683.5, close: 7734, direction: 'bullish', confidence: 'High' },
        { index: 4, timestamp: '2026-08-30T20:15:00-04:00', open: 7734, high: 7736, low: 7690, close: 7702, direction: 'bearish', confidence: 'High' },
        { index: 5, timestamp: '2026-08-30T20:30:00-04:00', open: 7702, high: 7704, low: 7682, close: 7696, direction: 'bearish', confidence: 'High' },
      ],
      fvgZones: [],
    }),
    fiveMinute: factSet({
      timeframe: '5m',
      role: 'execution',
      candles: [
        { index: 0, timestamp: '2026-08-31T09:45:00-04:00', open: 7692, high: 7698, low: 7683.5, close: 7696, direction: 'bullish', confidence: 'High' },
      ],
    }),
    oneHour: factSet({ timeframe: '1h' }),
    fourHour: factSet({ timeframe: '4h', role: 'macro_context' }),
    targetMap: { liquidityTargets: [], imbalanceTargets: [], reactionZones: [], notes: [] },
  },
  marketContext: 'Loopback 15M MSS-protected imbalance origin final boss.',
} as any;

const mssOriginVisibilityMetadata = classifyScannerVisibility({
  state: 'NoTrade',
  candidate: null,
  alertDecision,
  canExecute: false,
});
const mssOriginLifecycle = buildCandidateLifecycleTrace({
  candidates: [],
  selectedCandidate: null,
  state: 'NoTrade',
  alertDecision,
  canExecute: false,
});
const mssProtectedOrigin = buildDeskState({
  state: 'NoTrade',
  candidate: null,
  visibilityMetadata: mssOriginVisibilityMetadata,
  candidateLifecycleTrace: mssOriginLifecycle,
  currentPrice: 7696,
  canExecute: false,
  chartContext: mssProtectedOriginChartContext,
});
assert.equal(mssProtectedOrigin.primaryDeskPlay.retainedBossZones.bullBoss?.lower, 7679.75);
assert.equal(mssProtectedOrigin.primaryDeskPlay.retainedBossZones.bullBoss?.upper, 7683.5);
assert.equal(mssProtectedOrigin.primaryDeskPlay.retainedBossZones.bullBoss?.sourceKind, 'mss_protected_imbalance_origin');
assert.equal(mssProtectedOrigin.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'defended');
assert.match(mssProtectedOrigin.primaryDeskPlay.retainedBossZones.bullBoss?.sourceLabel || '', /15M MSS origin/i);
assert.equal(mssProtectedOrigin.primaryDeskPlay.retainedBossZones.approvalBoundary.changesCanExecute, false);
assert.equal(mssProtectedOrigin.canExecute, false);

const activeShortChartContext = {
  sessionType: 'evening',
  instrument: 'MES',
  tradeDate: '2026-08-30',
  timeframe: '5m',
  screenshotUsability: 'usable',
  keyLevels: { currentPrice: 7688 },
  candles: [
    { index: 0, timestamp: '2026-08-30T21:45:00-04:00', open: 7690, high: 7691, low: 7687.5, close: 7688, direction: 'bearish', confidence: 'High' },
  ],
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    alignment: {
      macroBias: 'SHORT',
      sessionBias: 'SHORT',
      liquidityBias: 'SHORT',
      executionBias: 'SHORT',
      alignedDirection: 'SHORT',
      conflicts: [],
      notes: [],
    },
    fifteenMinute: factSet({
      timeframe: '15m',
      candles: [
        { index: 0, timestamp: '2026-08-28T12:00:00-04:00', open: 7770, high: 7771, low: 7759.5, close: 7761, direction: 'bearish', confidence: 'High' },
        { index: 1, timestamp: '2026-08-30T20:00:00-04:00', open: 7710, high: 7712, low: 7705, close: 7706, direction: 'bearish', confidence: 'High' },
        { index: 2, timestamp: '2026-08-30T20:15:00-04:00', open: 7706, high: 7708, low: 7701, close: 7703, direction: 'bearish', confidence: 'High' },
        { index: 3, timestamp: '2026-08-30T20:30:00-04:00', open: 7699, high: 7702, low: 7690, close: 7692, direction: 'bearish', confidence: 'High' },
        { index: 4, timestamp: '2026-08-30T20:45:00-04:00', open: 7692, high: 7704, low: 7686, close: 7697, direction: 'bullish', confidence: 'High' },
        { index: 5, timestamp: '2026-08-30T21:00:00-04:00', open: 7697, high: 7698, low: 7688, close: 7688, direction: 'bearish', confidence: 'High' },
      ],
      fvgZones: [
        { direction: 'SHORT', lower: 7759.5, upper: 7771, midpoint: 7765.25, formedAt: '2026-08-28T12:00:00-04:00', formedCandleIndex: 0, impulseQualified: true, confidence: 'High' },
      ],
    }),
    fiveMinute: factSet({
      timeframe: '5m',
      role: 'execution',
      candles: [
        { index: 0, timestamp: '2026-08-30T21:45:00-04:00', open: 7690, high: 7691, low: 7687.5, close: 7688, direction: 'bearish', confidence: 'High' },
      ],
    }),
    oneHour: factSet({ timeframe: '1h' }),
    fourHour: factSet({ timeframe: '4h', role: 'macro_context' }),
    targetMap: { liquidityTargets: [], imbalanceTargets: [], reactionZones: [], notes: [] },
  },
  marketContext: 'Loopback active MSS-protected bear boss zone.',
} as any;

const shortVisibilityMetadata = classifyScannerVisibility({
  state: 'NoTrade',
  candidate: null,
  alertDecision,
  canExecute: false,
});
const shortLifecycle = buildCandidateLifecycleTrace({
  candidates: [],
  selectedCandidate: null,
  state: 'NoTrade',
  alertDecision,
  canExecute: false,
});
const activeShort = buildDeskState({
  state: 'NoTrade',
  candidate: null,
  visibilityMetadata: shortVisibilityMetadata,
  candidateLifecycleTrace: shortLifecycle,
  currentPrice: 7688,
  canExecute: false,
  chartContext: activeShortChartContext,
});
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.bearBoss?.lower, 7759.5);
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.activeMssProtectedBossZone?.direction, 'SHORT');
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.activeMssProtectedBossZone?.lower, 7702);
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.activeMssProtectedBossZone?.upper, 7705);
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.activeMssProtectedBossZone?.state, 'defended');
assert.equal(activeShort.primaryDeskPlay.activeMssProtectedBossZone?.role, 'active_mss_protected_boss_zone');
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBear?.direction, 'SHORT');
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBear?.role, 'final_boss_mss_zone');
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBear?.lower, 7701);
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBear?.upper, 7712);
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBear?.mssLine, 7701);
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.primaryBear?.state, 'defended');
assert.equal(activeShort.primaryDeskPlay.retainedBossZones.finalBossMssZones.bear.length, 1);

console.log('retained boss-zone ledger loopback test passed');
