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

function chartContext(latestClose: number) {
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
          { index: 0, timestamp: '2026-08-27T16:45:00-04:00', open: 7681, high: 7740, low: 7671, close: 7734, direction: 'bullish', confidence: 'High' },
          { index: 1, timestamp: '2026-08-30T10:15:00-04:00', open: 7710, high: 7712, low: 7678.25, close: latestClose, direction: latestClose >= 7680 ? 'bullish' : 'bearish', confidence: 'High' },
        ],
        fvgZones: [
          { direction: 'LONG', lower: 7679.5, upper: 7682.5, midpoint: 7681, formedAt: '2026-08-27T16:45:00-04:00', formedCandleIndex: 0, impulseQualified: true, confidence: 'High' },
          { direction: 'SHORT', lower: 7723.25, upper: 7725.25, midpoint: 7724.25, formedAt: '2026-08-28T13:30:00-04:00', formedCandleIndex: 22, impulseQualified: true, confidence: 'High' },
        ],
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

function deskStateFor(latestClose: number) {
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
    chartContext: chartContext(latestClose),
  });
}

const defended = deskStateFor(7692.75);
assert.equal(defended.primaryDeskPlay.direction, 'WAIT');
assert.equal(defended.primaryDeskPlay.retainedBossZones.bullBoss?.lower, 7679.5);
assert.equal(defended.primaryDeskPlay.retainedBossZones.bullBoss?.upper, 7682.5);
assert.equal(defended.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'defended');
assert.match(defended.primaryDeskPlay.retainedBossZones.bullBoss?.stateReason || '', /wick-through is treated as defense/i);
assert.equal(defended.primaryDeskPlay.retainedBossZones.bearBoss?.lower, 7723.25);
assert.equal(defended.primaryDeskPlay.retainedBossZones.approvalBoundary.changesCanExecute, false);

const invalidated = deskStateFor(7678.75);
assert.equal(invalidated.primaryDeskPlay.retainedBossZones.bullBoss?.state, 'invalidated');
assert.match(invalidated.primaryDeskPlay.retainedBossZones.bullBoss?.stateReason || '', /accepted below/i);
assert.equal(invalidated.primaryDeskPlay.retainedBossZones.approvalBoundary.changesTradeApprovals, false);

console.log('retained boss-zone ledger loopback test passed');
