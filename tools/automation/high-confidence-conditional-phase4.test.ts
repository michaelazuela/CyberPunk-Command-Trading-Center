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
import { buildDeliveryVisibilityReport } from '../supervisor/deliveryVisibility';
import { flattenDiscordPayloadText } from './discord-alert-format';
import { assertDiscordOutcomeEndpointSecretReady, discordOutcomeSecretKeyId } from './discord-outcome-buttons';
import {
  prepareLiveScannerDiscordAlertArtifacts,
  scannerDiscordWebhookUrlForPost,
} from './nt-scanner';
import { verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

type Direction = 'LONG' | 'SHORT';

type Phase4Case = {
  label: string;
  session: 'morning' | 'lunch';
  setupType: SetupType;
  scenarioLabel: string;
  direction: Direction;
  executionStatus: ExecutionStatus.Conditional | ExecutionStatus.Executable;
  canExecute: boolean;
  score: number;
  state: 'Approved' | 'TriggerPending';
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  currentPrice: number;
  completedAt: string;
};

const loopsArg = process.argv.find((arg) => arg.startsWith('--loops='));
const loops = Math.max(1, Math.min(8, Number(loopsArg?.split('=')[1] || 3)));
const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;

const phase4Cases: Phase4Case[] = [
  {
    label: 'Morning short high-confidence conditional live dry-run',
    session: 'morning',
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Failed Breakout Reversal',
    direction: 'SHORT',
    executionStatus: ExecutionStatus.Executable,
    canExecute: false,
    score: 98,
    state: 'TriggerPending',
    entry: 7483,
    stop: 7491.5,
    target1: 7470.25,
    target2: 7466,
    riskPoints: 8.5,
    currentPrice: 7482.25,
    completedAt: '2026-06-23T14:25:00.000Z',
  },
  {
    label: 'Lunch long execution-approved live dry-run',
    session: 'lunch',
    setupType: SetupType.HtfDisplacementFvgContinuation,
    scenarioLabel: 'HTF Displacement FVG Continuation',
    direction: 'LONG',
    executionStatus: ExecutionStatus.Executable,
    canExecute: true,
    score: 91,
    state: 'Approved',
    entry: 7451.25,
    stop: 7446.25,
    target1: 7458.75,
    target2: 7461.25,
    riskPoints: 5,
    currentPrice: 7451.5,
    completedAt: '2026-06-23T18:25:00.000Z',
  },
];

function fmt(price: number): string {
  return price.toFixed(2);
}

function buildCandles(item: Phase4Case): NonNullable<ChartContext['candles']> {
  const isLong = item.direction === 'LONG';
  const risk = Math.abs(item.entry - item.stop);
  return Array.from({ length: 48 }, (_, index) => {
    const phase = index / 47;
    const drift = isLong
      ? -risk * 0.7 + phase * risk * 2.1
      : risk * 0.7 - phase * risk * 2.1;
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

function buildCandidate(item: Phase4Case): SetupCandidate {
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
      'Phase 4 validates supervisor visibility and dry-run delivery state without Discord posting.',
    ],
    missingEvidence: item.canExecute ? [] : ['Completed 5M proof still controls execution approval.'],
    requiredTrigger: item.canExecute
      ? 'Execution approval still comes from the app-owned pipeline and completed 5M proof.'
      : 'Publish as high-confidence conditional only; completed 5M proof and canExecute still control execution.',
    nextAction: item.canExecute
      ? 'Execution-approved plan may be shown with app-owned levels only.'
      : 'High-confidence conditional plan must remain visible with complete levels; no automated orders.',
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
      evidence: 'Structured OHLC fixture for Phase 4 dry-run validation.',
    },
  } as SetupCandidate;
}

function chartContext(item: Phase4Case): Partial<ChartContext> {
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

function confidence(item: Phase4Case): ScannerConfidenceBreakdown {
  return {
    score: item.score,
    qualifiedReasons: [`${item.label} fixture qualified for Phase 4 dry-run supervisor validation.`],
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

function assertPayloadLevels(text: string, item: Phase4Case): void {
  assert.ok(text.includes(`Entry: ${fmt(item.entry)}`), `${item.label} missing Entry`);
  assert.ok(text.includes(`Stop: ${fmt(item.stop)}`), `${item.label} missing Stop`);
  assert.ok(text.includes(`T1: ${fmt(item.target1)}`), `${item.label} missing T1`);
  assert.ok(text.includes(`T2: ${fmt(item.target2)}`), `${item.label} missing T2`);
  assert.doesNotMatch(text, /\bEntry:\s*pending\b|\bStop:\s*pending\b|\bT1:\s*pending\b|\bT2:\s*pending\b/i, item.label);
}

async function validateScannerCard(item: Phase4Case, loopIndex: number, rootDir: string): Promise<{
  alertKey: string;
  auditLogPath: string;
  renderedFiles: string[];
}> {
  const selected = buildCandidate(item);
  const outputDir = path.join(rootDir, `loop-${loopIndex}`, item.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase());
  const auditDir = path.join(outputDir, 'audit');
  const planVersionId = `PHASE4-${loopIndex}-${item.session.toUpperCase()}-${item.direction}-${item.score}`;
  const result = await prepareLiveScannerDiscordAlertArtifacts({
    session: item.session,
    tradeDate: '2026-06-23',
    config: { instrument: 'MES' },
    state: item.state,
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
      time: item.completedAt,
      open: item.currentPrice,
      high: item.currentPrice + 1.25,
      low: item.currentPrice - 1.25,
      close: item.currentPrice,
      volume: 1000,
    },
    scoringTimestamp: item.completedAt,
    scoringTimestampSource: 'Phase 4 dry-run supervisor fixture completed 5M',
    windowLabel: item.session === 'morning' ? 'Morning Setup Scanner' : 'Lunch/PM Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['Phase 4 target cascade is audit-only.'],
      targetRoomPoor: false,
      reason: 'Phase 4 target cascade is audit-only.',
    },
    alertReason: 'Phase 4 dry-run supervisor loop validation.',
    planVersionId,
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
  assert.ok(/decision support|no automated orders|not execution approval/i.test(text), `${item.label} missing decision-support language:\n${text}`);
  assert.ok(!/Trade now|market order|automated orders were placed|bypass canExecute/i.test(text), `${item.label} leaked execution language`);
  if (!item.canExecute) {
    assert.ok(!/Primary:\s*WAIT/i.test(text), `${item.label} regressed to WAIT primary despite complete promoted levels`);
    assert.ok(text.includes('HIGH-CONFIDENCE CONDITIONAL') || text.includes('canExecute still required'), `${item.label} missing conditional status`);
    assert.ok(text.includes('not execution approval') || text.includes('canExecute still required'), `${item.label} missing conditional authority boundary`);
  }

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

  const alertKey = `2026-06-23|MES|${item.session}|${item.direction}|${item.setupType}|${fmt(item.entry)}|${item.state}|${loopIndex}`;
  return { alertKey, auditLogPath: result.auditLogPath, renderedFiles: [result.chartMarkup, result.levelMap] };
}

async function validateDeliveryVisibility(rootDir: string, delivered: Array<{
  item: Phase4Case;
  alertKey: string;
  auditLogPath: string;
  loopIndex: number;
}>): Promise<void> {
  const auditDir = path.join(rootDir, 'supervisor-audit');
  await fsPromises.mkdir(auditDir, { recursive: true });
  const sent: Record<string, unknown> = {};
  const alertDeliveries: Record<string, unknown> = {};

  for (const record of delivered) {
    const auditCopyPath = path.join(auditDir, path.basename(record.auditLogPath));
    await fsPromises.copyFile(record.auditLogPath, auditCopyPath);
    const sentAt = new Date(Date.parse(record.item.completedAt) + record.loopIndex * 1000).toISOString();
    sent[record.alertKey] = {
      state: record.item.state,
      confidence: record.item.score,
      sentAt,
    };
    alertDeliveries[record.alertKey] = {
      alertKey: record.alertKey,
      planVersionId: `PHASE4-${record.loopIndex}-${record.item.session.toUpperCase()}-${record.item.direction}-${record.item.score}`,
      instrument: 'MES',
      tradeDate: '2026-06-23',
      session: record.item.session,
      state: record.item.state,
      confidence: record.item.score,
      deliveryStatus: 'sent',
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      httpStatus: 200,
      discordMessageId: `phase4-dry-run-${record.loopIndex}-${record.item.direction.toLowerCase()}`,
      attemptedAt: new Date(Date.parse(sentAt) - 500).toISOString(),
      sentAt,
      auditLogPath: auditCopyPath,
      stale: false,
      retryEligible: false,
    };
  }

  const statePath = path.join(rootDir, '.nt-scanner-state.json');
  const gapLedgerPath = path.join(rootDir, '.market-data-gap-events.json');
  const heartbeatPath = path.join(rootDir, 'candle-recorder-heartbeat.json');
  await fsPromises.writeFile(gapLedgerPath, '[]', 'utf8');
  await fsPromises.writeFile(heartbeatPath, JSON.stringify({
    status: 'ok',
    updatedAt: '2026-06-23T18:26:00.000Z',
    latestCompleted5m: '2026-06-23T18:25:00.000Z',
    barsProcessed: 1200,
    warning: null,
    error: null,
  }, null, 2), 'utf8');
  await fsPromises.writeFile(statePath, JSON.stringify({
    sent,
    alertDeliveries,
    watchlistSent: {},
    lastCompleted5mBySession: {
      '2026-06-23:morning': '2026-06-23T14:25:00.000Z',
      '2026-06-23:lunch': '2026-06-23T18:25:00.000Z',
    },
    lastMarketMapRefreshBySession: {
      '2026-06-23:morning': '2026-06-23T14:24:00.000Z',
      '2026-06-23:lunch': '2026-06-23T18:24:00.000Z',
    },
    lastHealthStatus: 'READY',
  }, null, 2), 'utf8');

  const report = buildDeliveryVisibilityReport({
    scannerStatePath: statePath,
    auditDir,
    marketDataGapLedgerPath: gapLedgerPath,
    recorderHeartbeatPath: heartbeatPath,
    now: new Date('2026-06-23T18:26:30.000Z'),
    staleAfterMs: 180_000,
    recentAuditLimit: 16,
  });

  assert.equal(report.status, 'ok');
  assert.equal(report.stateReadable, true);
  assert.equal(report.boundaries.readOnly, true);
  assert.equal(report.boundaries.postsDiscord, false);
  assert.equal(report.boundaries.changesScannerState, false);
  assert.equal(report.boundaries.changesTradingLogic, false);
  assert.equal(report.failedDeliveries.length, 0);
  assert.equal(report.pendingDeliveries.length, 0);
  assert.equal(report.skippedDeliveries.length, 0);
  assert.deepEqual(report.staleDataBlockers, []);
  assert.equal(report.lastDelivery?.deliveryStatus, 'sent');
  assert.equal(report.lastDelivery?.webhookSource, 'QUANT_DESK_SCANNER_WEBHOOK_URL');
  assert.ok(report.lastDiscordSend?.discordMessageId?.startsWith('phase4-dry-run-'));
  assert.ok(report.lastAlert?.alertKey.includes('|MES|'));
  assert.ok(report.recentAuditFiles.length >= delivered.length);
  assert.equal(JSON.stringify(report).includes('"canExecute":true'), false, 'supervisor visibility must not leak executable internals');
}

const originalFetch = globalThis.fetch;
const keycheckCalls: string[] = [];
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'phase-4-test-secret';
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
  const rootDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'phase4-supervisor-dry-run-'));
  const delivered: Array<{ item: Phase4Case; alertKey: string; auditLogPath: string; loopIndex: number }> = [];
  const renderedFiles: string[] = [];
  for (let loopIndex = 1; loopIndex <= loops; loopIndex += 1) {
    for (const item of phase4Cases) {
      const result = await validateScannerCard(item, loopIndex, rootDir);
      delivered.push({ item, alertKey: result.alertKey, auditLogPath: result.auditLogPath, loopIndex });
      renderedFiles.push(...result.renderedFiles);
    }
    await validateDeliveryVisibility(rootDir, delivered);
  }

  assert.equal(keycheckCalls.length, loops * phase4Cases.length, 'each dry-run card must validate outcome endpoint keycheck');
  console.log(`Phase 4 supervisor dry-run validation passed: ${phase4Cases.length} cards x ${loops} loop(s), ${renderedFiles.length} rendered artifacts.`);
  console.log(`Phase 4 artifact root: ${rootDir}`);
  console.log(`Phase 4 sample chart: ${renderedFiles[0]}`);
  console.log(`Phase 4 sample level map: ${renderedFiles[1]}`);
} finally {
  globalThis.fetch = originalFetch;
  if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
  if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
}
