import assert from 'node:assert/strict';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  TradeDecisionStatus,
  type ChartContext,
  type SetupCandidate,
} from '../../src/types';
import type { ScannerConfidenceBreakdown } from '../../src/lib/localScannerEngine';
import { flattenDiscordPayloadText } from './discord-alert-format';
import { assertDiscordOutcomeEndpointSecretReady, discordOutcomeSecretKeyId } from './discord-outcome-buttons';
import {
  prepareLiveScannerDiscordAlertArtifacts,
  scannerDiscordWebhookUrlForPost,
} from './nt-scanner';
import { verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

type Direction = 'LONG' | 'SHORT';

type Phase3Case = {
  label: string;
  session: 'morning' | 'lunch';
  setupType: SetupType;
  scenarioLabel: string;
  direction: Direction;
  executionStatus: ExecutionStatus.Conditional | ExecutionStatus.Executable;
  canExecute: boolean;
  score: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  currentPrice: number;
};

const loopsArg = process.argv.find((arg) => arg.startsWith('--loops='));
const loops = Math.max(1, Math.min(5, Number(loopsArg?.split('=')[1] || 2)));
const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;

const phase3Cases: Phase3Case[] = [
  {
    label: 'Morning short high-confidence conditional supervisor card',
    session: 'morning',
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Bearish Turtle Soup Reversal',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Executable,
    canExecute: false,
    score: 98,
    entry: 7483,
    stop: 7491.5,
    target1: 7470.25,
    target2: 7466,
    riskPoints: 8.5,
    currentPrice: 7482.25,
  },
  {
    label: 'Lunch short high-confidence conditional supervisor card',
    session: 'lunch',
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'ICT Model 1 Short: Sweep Reclaim Imbalance Retrace',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Conditional,
    canExecute: false,
    score: 93,
    entry: 7445.75,
    stop: 7452.5,
    target1: 7429.25,
    target2: 7428.75,
    riskPoints: 6.75,
    currentPrice: 7445.5,
  },
  {
    label: 'Lunch long execution-approved supervisor card',
    session: 'lunch',
    setupType: SetupType.HtfDisplacementFvgContinuation,
    scenarioLabel: 'HTF Displacement FVG Continuation',
    direction: 'LONG',
    executionStatus: ExecutionStatus.Executable,
    canExecute: true,
    score: 91,
    entry: 7451.25,
    stop: 7446.25,
    target1: 7458.75,
    target2: 7461.25,
    riskPoints: 5,
    currentPrice: 7451.5,
  },
];

function fmt(price: number): string {
  return price.toFixed(2);
}

function buildCandles(item: Phase3Case): NonNullable<ChartContext['candles']> {
  const isLong = item.direction === 'LONG';
  const risk = Math.abs(item.entry - item.stop);
  return Array.from({ length: 48 }, (_, index) => {
    const phase = index / 47;
    const drift = isLong
      ? -risk * 0.65 + phase * risk * 2.1
      : risk * 0.65 - phase * risk * 2.1;
    const open = item.entry + drift + Math.sin(index / 3) * 0.35;
    const close = open + (isLong ? 0.35 : -0.35) + Math.cos(index / 4) * 0.2;
    return {
      index,
      timestamp: `2026-06-23T${String(item.session === 'morning' ? 9 + Math.floor(index / 12) : 12 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
      open,
      high: Math.max(open, close, item.entry) + 0.85,
      low: Math.min(open, close, item.entry) - 0.85,
      close,
      direction: close >= open ? 'bullish' as const : 'bearish' as const,
      confidence: 'High' as const,
    };
  });
}

function candidate(item: Phase3Case): SetupCandidate {
  const zonePad = 1.25;
  const zoneOtherSide = item.entry + (item.direction === 'LONG' ? zonePad : -zonePad);
  return {
    setupType: item.setupType,
    scenarioLabel: item.scenarioLabel,
    direction: item.direction,
    detectedStatus: item.canExecute ? SetupCandidateStatus.Detected : SetupCandidateStatus.Conditional,
    executionStatus: item.executionStatus,
    confidence: 'High',
    priority: 98,
    rankScore: 250 + item.score / 10,
    decisionQualityScore: item.score,
    entry: item.entry,
    stop: item.stop,
    target1: item.target1,
    target2: item.target2,
    riskPoints: item.riskPoints,
    blockReason: item.canExecute ? null : NoTradeReason.EntryTriggerPending,
    evidence: [
      `${item.label} has app-owned entry, protected structure stop, T1, T2, and risk.`,
      'Structured OHLC context is present for chart and level-map rendering.',
    ],
    missingEvidence: item.canExecute ? [] : ['Completed 5M proof still controls execution approval.'],
    requiredTrigger: item.canExecute
      ? 'Execution approval still comes from the app-owned pipeline and completed 5M proof.'
      : 'Publish as high-confidence conditional only; completed 5M proof and canExecute still control execution.',
    nextAction: item.canExecute
      ? 'Execution-approved plan may be shown with app-owned levels only.'
      : 'High-confidence conditional plan must be visible with complete levels; no automated orders.',
    invalidation: item.direction === 'LONG'
      ? `Invalid below ${fmt(item.stop)}.`
      : `Invalid above ${fmt(item.stop)}.`,
    reducedRiskPlan: null,
    tacticalZone: {
      sourceOfTruth: 'ohlc_fvg_zone',
      direction: item.direction,
      lower: Math.min(item.entry, zoneOtherSide),
      upper: Math.max(item.entry, zoneOtherSide),
      midpoint: item.entry,
      label: `${item.direction} active tactical zone`,
      sourceTimeframe: '5M',
      confidence: 'High',
      evidence: 'Structured OHLC fixture for Phase 3 supervisor validation.',
    },
  } as SetupCandidate;
}

function chartContext(item: Phase3Case): Partial<ChartContext> {
  const candles = buildCandles(item);
  const zoneLower = Math.min(item.entry, item.entry + (item.direction === 'LONG' ? 1.25 : -1.25));
  const zoneUpper = Math.max(item.entry, item.entry + (item.direction === 'LONG' ? 1.25 : -1.25));
  return {
    candles,
    fvgZones: [{ direction: item.direction, lower: zoneLower, upper: zoneUpper, midpoint: item.entry, confidence: 'High' }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: item.direction,
      level: item.direction === 'LONG' ? item.entry - 2 : item.entry + 2,
      sweptLevelLabel: item.direction === 'LONG' ? 'Sell-side liquidity' : 'Buy-side liquidity',
      reclaimed: true,
      timestamp: candles[30].timestamp,
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: item.direction,
      reclaimedLevel: item.direction === 'LONG' ? item.entry - 2 : item.entry + 2,
      levelLabel: item.direction === 'LONG' ? 'Sell-side liquidity' : 'Buy-side liquidity',
      candleIndex: 30,
      timestamp: candles[30].timestamp,
      confidence: 'High',
    }],
    marketStructure: {
      trend: item.direction === 'LONG' ? 'bullish' : 'bearish',
      higherHigh: item.direction === 'LONG',
      higherLow: item.direction === 'LONG',
      lowerHigh: item.direction === 'SHORT',
      lowerLow: item.direction === 'SHORT',
      marketStructureShift: true,
      chopRangeCondition: false,
    },
  };
}

function confidence(item: Phase3Case): ScannerConfidenceBreakdown {
  return {
    score: item.score,
    qualifiedReasons: [`${item.label} fixture qualified for Phase 3 live delivery validation.`],
    missingReasons: item.canExecute ? [] : ['Completed 5M proof still controls execution approval.'],
    recommendation: item.canExecute
      ? 'Execution-approved publication path must show app-owned levels.'
      : 'High-confidence conditional publication path must show app-owned levels.',
    hardBlocker: null,
  };
}

function expectedButtonLabels(direction: Direction): string[] {
  const side = direction === 'LONG' ? 'Long' : 'Short';
  return [`${side} T1 Hit`, `${side} T2 Hit`, `${side} Runner Hit`, `${side} Stretch Hit`, `${side} Stopped`, 'Scratch', 'No Trade', 'Missed'];
}

function assertPayloadLevels(text: string, item: Phase3Case): void {
  assert.ok(text.includes(`Entry: ${fmt(item.entry)}`), `${item.label} missing Entry`);
  assert.ok(text.includes(`Stop: ${fmt(item.stop)}`), `${item.label} missing Stop`);
  assert.ok(text.includes(`T1: ${fmt(item.target1)}`), `${item.label} missing T1`);
  assert.ok(text.includes(`T2: ${fmt(item.target2)}`), `${item.label} missing T2`);
  assert.doesNotMatch(text, /\bEntry:\s*pending\b|\bStop:\s*pending\b|\bT1:\s*pending\b|\bT2:\s*pending\b/i, item.label);
}

async function validateSupervisorArtifact(item: Phase3Case, loopIndex: number, rootDir: string): Promise<string[]> {
  const selected = candidate(item);
  const outputDir = path.join(rootDir, `loop-${loopIndex}`, item.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  const auditDir = path.join(outputDir, 'audit');
  const result = await prepareLiveScannerDiscordAlertArtifacts({
    session: item.session,
    tradeDate: '2026-06-23',
    config: { instrument: 'MES' },
    state: item.canExecute ? 'Approved' : 'TriggerPending',
    confidence: confidence(item),
    candidate: selected,
    normalized: {
      canExecute: item.canExecute,
      decisionStatus: item.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.ConditionalTrade,
      decision: item.direction,
      noTradeReason: item.canExecute ? null : NoTradeReason.EntryTriggerPending,
      entry: item.entry,
      stop: item.stop,
      t1: item.target1,
      t2: item.target2,
      riskPoints: item.riskPoints,
      invalidation: selected.invalidation,
      setupCandidates: [selected],
      whyThisPlan: item.canExecute
        ? 'App-owned completed 5M pipeline approved this fixture.'
        : 'High-confidence conditional fixture; wait for completed 5M proof.',
    } as any,
    chartContext: chartContext(item) as ChartContext,
    currentPrice: item.currentPrice,
    completed5m: {
      time: `2026-06-23T${item.session === 'morning' ? '10:20:00.0000000' : '15:25:00.0000000'}`,
      open: item.currentPrice,
      high: item.currentPrice + 1.25,
      low: item.currentPrice - 1.25,
      close: item.currentPrice,
      volume: 1000,
    },
    scoringTimestamp: `2026-06-23T${item.session === 'morning' ? '10:20:00.0000000' : '15:25:00.0000000'}`,
    scoringTimestampSource: 'Phase 3 supervisor fixture completed 5M',
    windowLabel: item.session === 'morning' ? 'Morning Setup Scanner' : 'Lunch/PM Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['Phase 3 target cascade is audit-only.'],
      targetRoomPoor: false,
      reason: 'Phase 3 target cascade is audit-only.',
    },
    alertReason: 'Phase 3 live supervisor artifact validation.',
    planVersionId: `PHASE3-${loopIndex}-${item.session.toUpperCase()}-${item.direction}-${item.score}`,
    outputDir,
    auditDir,
  });

  assert.equal(result.files.length, 2, `${item.label} must attach chart and level map`);
  assert.ok(result.chartMarkup, `${item.label} missing chart markup`);
  assert.ok(result.levelMap, `${item.label} missing price level map`);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.chartMarkup), { ok: true }, `${item.label} chart render failed`);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.levelMap), { ok: true }, `${item.label} level map render failed`);

  const text = flattenDiscordPayloadText(result.payload);
  assertPayloadLevels(text, item);
  assert.ok(text.includes(item.direction), `${item.label} missing direction`);
  if (!item.canExecute) {
    assert.ok(!/Primary:\s*🛑?\s*WAIT/i.test(text), `${item.label} regressed to WAIT primary despite complete promoted levels`);
  }
  assert.ok(
    /decision support|no automated orders|not execution approval/i.test(text),
    `${item.label} missing decision-support language:\n${text}`,
  );
  if (!item.canExecute) {
    assert.ok(text.includes('HIGH-CONFIDENCE CONDITIONAL') || text.includes('canExecute still required'), `${item.label} missing conditional status`);
    assert.ok(text.includes('not execution approval') || text.includes('canExecute still required'), `${item.label} missing conditional authority boundary`);
  }
  assert.ok(!/Trade now|market order|automated orders were placed|bypass canExecute/i.test(text), `${item.label} leaked execution language`);

  const componentLabels = (result.payload.components || []).flatMap((row: any) => (row.components || []).map((component: any) => component.label));
  assert.deepEqual(componentLabels, expectedButtonLabels(item.direction), `${item.label} outcome buttons mismatch`);
  await assert.doesNotReject(() => assertDiscordOutcomeEndpointSecretReady(result.payload.components, globalThis.fetch));

  const webhookUrl = scannerDiscordWebhookUrlForPost('https://discord.com/api/webhooks/test/token', result.payload.components, true);
  assert.ok(webhookUrl.includes('with_components=true'), `${item.label} webhook URL must request components`);
  assert.ok(webhookUrl.includes('wait=true'), `${item.label} webhook URL must wait for message receipt`);

  const audit = JSON.parse(await fsPromises.readFile(result.auditLogPath, 'utf8'));
  assert.equal(audit.visibility.authority.canExecute, item.canExecute, `${item.label} audit canExecute mismatch`);
  assert.equal(audit.deskState.canExecute, item.canExecute, `${item.label} deskState canExecute mismatch`);
  assert.equal(audit.tradeDecisionMapAudit.tradingLogicChanged, false, `${item.label} must not mark trading logic changed`);
  assert.equal(audit.attachments.chartMarkup, result.chartMarkup, `${item.label} audit chart path mismatch`);
  assert.equal(audit.attachments.priceLevelMap, result.levelMap, `${item.label} audit level-map path mismatch`);
  return [result.chartMarkup, result.levelMap];
}

const originalFetch = globalThis.fetch;
const keycheckCalls: string[] = [];
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'phase-3-test-secret';
globalThis.fetch = (async (url: RequestInfo | URL) => {
  keycheckCalls.push(String(url));
  const activeKeyId = discordOutcomeSecretKeyId(process.env.DISCORD_OUTCOME_SECRET);
  return new Response(JSON.stringify({
    configured: true,
    activeKeyId,
    acceptedKeyIds: [activeKeyId].filter(Boolean),
    capabilities: {
      tradeOutcomeButtons: true,
      watchFeedbackResearch: true,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;

try {
  const rootDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'phase3-live-supervisor-'));
  const renderedFiles: string[] = [];
  for (let loopIndex = 1; loopIndex <= loops; loopIndex += 1) {
    for (const item of phase3Cases) {
      renderedFiles.push(...await validateSupervisorArtifact(item, loopIndex, rootDir));
    }
  }
  assert.equal(keycheckCalls.length, loops * phase3Cases.length, 'each supervisor card must validate outcome endpoint keycheck');
  console.log(`Phase 3 live supervisor validation passed: ${phase3Cases.length} cards x ${loops} loop(s), ${renderedFiles.length} rendered artifacts.`);
  console.log(`Phase 3 artifact root: ${rootDir}`);
  console.log(`Phase 3 sample chart: ${renderedFiles[0]}`);
  console.log(`Phase 3 sample level map: ${renderedFiles[1]}`);
} finally {
  globalThis.fetch = originalFetch;
  if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
  if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
}
