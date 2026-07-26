import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import type { ScannerConfidenceBreakdown } from '../../src/lib/localScannerEngine';
import { flattenDiscordPayloadText } from './discord-alert-format';
import { assertDiscordOutcomeEndpointSecretReady, discordOutcomeSecretKeyId } from './discord-outcome-buttons';
import {
  evaluateScannerPrimaryAlertPublishingGate,
  prepareLiveScannerDiscordAlertArtifacts,
  scannerDiscordWebhookUrlForPost,
} from './nt-scanner';
import { verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

type PhaseMode = 'alpha' | 'bravo' | 'all';

const mode = (process.argv.find((arg) => arg.startsWith('--phase='))?.split('=')[1] || 'all') as PhaseMode;
const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;

function loadTapeEvents(filePath: string): any[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Object.values(raw.events || {}).flat() as any[];
}

function eventAt(events: any[], time: string): any {
  const event = events.find((item) => item.time === time);
  assert.ok(event, `expected tape event at ${time}`);
  return event;
}

function selectedCandidateFromTape(event: any): SetupCandidate {
  const candidate = event.deskState?.selectedCandidate || event.setupCandidateStatus?.selected;
  assert.ok(candidate, `expected selected candidate at ${event.time}`);
  return candidate as SetupCandidate;
}

function assertCompleteLevels(candidate: SetupCandidate, label: string): void {
  for (const key of ['entry', 'stop', 'target1', 'target2'] as const) {
    assert.equal(typeof candidate[key], 'number', `${label} missing numeric ${key}`);
    assert.ok(Number.isFinite(candidate[key]), `${label} ${key} must be finite`);
  }
}

function runPrimaryGate(event: any, candidate: SetupCandidate) {
  return evaluateScannerPrimaryAlertPublishingGate({
    alertDecision: { shouldSend: true, reason: 'Phase 1 replay candidate qualified before DeskState publishing gate.' },
    deskState: event.deskState,
    candidate,
    normalizedCanExecute: Boolean(event.plan?.canExecute),
    state: event.scannerState,
    staleReason: null,
    scannerReviewStatus: null,
  });
}

function runAlpha(): void {
  const morning = loadTapeEvents('tools/automation/discord-audit/scanner-decision-tape-2026-06-23-MES-morning.json');
  const lunch = loadTapeEvents('tools/automation/discord-audit/scanner-decision-tape-2026-06-23-MES-lunch.json');

  const morningFresh = eventAt(morning, '2026-06-23T10:20:00.0000000');
  const morningCandidate = selectedCandidateFromTape(morningFresh);
  assert.equal(morningCandidate.direction, 'SHORT');
  assert.equal(morningCandidate.executionStatus, ExecutionStatus.Executable);
  assert.equal(morningCandidate.decisionQualityScore, 98);
  assertCompleteLevels(morningCandidate, 'morning 10:20');
  assert.equal(morningFresh.plan?.canExecute, false);
  const morningFreshDecision = runPrimaryGate(morningFresh, morningCandidate);
  assert.equal(morningFreshDecision.shouldSend, true);
  assert.match(morningFreshDecision.reason, /suppression bypassed for high-confidence conditional publication/);
  assert.match(morningFreshDecision.reason, /not execution approval/);
  assert.match(morningFreshDecision.reason, /canExecute still control execution/);

  const morningMissed = eventAt(morning, '2026-06-23T10:25:00.0000000');
  const morningMissedDecision = evaluateScannerPrimaryAlertPublishingGate({
    alertDecision: { shouldSend: true, reason: 'Phase 1 stale replay candidate qualified before DeskState publishing gate.' },
    deskState: morningMissed.deskState,
    candidate: selectedCandidateFromTape(morningMissed),
    normalizedCanExecute: Boolean(morningMissed.plan?.canExecute),
    state: morningMissed.scannerState,
    staleReason: 'no chase: preferred entry was missed',
    scannerReviewStatus: morningMissed.reviewStatus || null,
  });
  assert.equal(morningMissedDecision.shouldSend, false);
  assert.match(morningMissedDecision.reason, /stale\/no-chase review state/);

  const afternoonFresh = eventAt(lunch, '2026-06-23T15:25:00.0000000');
  const afternoonCandidate = selectedCandidateFromTape(afternoonFresh);
  assert.equal(afternoonCandidate.direction, 'SHORT');
  assert.equal(afternoonCandidate.executionStatus, ExecutionStatus.Conditional);
  assert.equal(afternoonCandidate.blockReason, NoTradeReason.EntryTriggerPending);
  assert.equal(afternoonCandidate.decisionQualityScore, 93);
  assertCompleteLevels(afternoonCandidate, 'afternoon 15:25');
  assert.equal(afternoonFresh.plan?.canExecute, false);
  const afternoonFreshDecision = runPrimaryGate(afternoonFresh, afternoonCandidate);
  assert.equal(afternoonFreshDecision.shouldSend, true);
  assert.match(afternoonFreshDecision.reason, /suppression bypassed for high-confidence conditional publication/);
  assert.match(afternoonFreshDecision.reason, /not execution approval/);
  assert.match(afternoonFreshDecision.reason, /canExecute still control execution/);

  console.log('Phase 1 Alpha replay contract passed: high-quality full-level candidates shall not be buried; stale/no-chase still blocks.');
}

function buildCandles(): NonNullable<ChartContext['candles']> {
  return Array.from({ length: 36 }, (_, index) => {
    const drift = index < 18 ? index * 0.55 : 9.9 - (index - 18) * 0.45;
    const open = 7435 + drift;
    const close = index >= 24 ? open - 0.75 : open + 0.4;
    return {
      index,
      timestamp: `2026-06-23T${String(12 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
      open,
      high: Math.max(open, close) + 0.9,
      low: Math.min(open, close) - 0.9,
      close,
      direction: close >= open ? 'bullish' as const : 'bearish' as const,
      confidence: 'High' as const,
    };
  });
}

async function runBravo(): Promise<void> {
  const originalFetch = globalThis.fetch;
  process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
  process.env.DISCORD_OUTCOME_SECRET = 'phase-1-test-secret';
  const calls: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), method: String(init?.method || 'GET') });
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
    const outputDir = path.join(os.tmpdir(), `phase1-bravo-${Date.now()}`);
    const auditDir = path.join(outputDir, 'audit');
    const candles = buildCandles();
    const candidate: SetupCandidate = {
      setupType: SetupType.NoSetup,
      scenarioLabel: 'ICT no installed model path Short: Sweep Reclaim Imbalance Retrace',
      direction: 'SHORT',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      confidence: 'High',
      priority: 96,
      rankScore: 257,
      decisionQualityScore: 93,
      entry: 7445.75,
      stop: 7452.5,
      target1: 7429.25,
      target2: 7428.75,
      riskPoints: 6.75,
      blockReason: NoTradeReason.EntryTriggerPending,
      evidence: ['Sweep/reclaim, displacement, MSS, and 5M FVG retrace are present.'],
      missingEvidence: ['Completed 5M trigger/retest proof still required.'],
      requiredTrigger: 'Entry only on retrace into bearish imbalance 7445-7446.5 after sweep, reclaim, displacement, and bearish structure shift.',
      nextAction: 'High-confidence conditional. Publish prominently; completed 5M proof and canExecute still control execution.',
      invalidation: 'Invalid if price trades above 7452.50.',
      reducedRiskPlan: null,
      tacticalZone: {
        sourceOfTruth: 'ohlc_fvg_zone',
        direction: 'SHORT',
        lower: 7445,
        upper: 7446.5,
        midpoint: 7445.75,
        label: '7445.00-7446.50 Imbalance Zone',
        sourceTimeframe: '5M',
        confidence: 'High',
        evidence: 'Structured OHLC FVG facts.',
      },
    } as SetupCandidate;
    const confidence: ScannerConfidenceBreakdown = {
      score: 93,
      qualifiedReasons: ['Phase 1 Bravo high-confidence conditional fixture.'],
      missingReasons: ['Completed 5M proof still controls execution.'],
      recommendation: 'Publish as high-confidence conditional only.',
      hardBlocker: null,
    };
    const chartContext: Partial<ChartContext> = {
      candles,
      fvgZones: [{ direction: 'SHORT', lower: 7445, upper: 7446.5, midpoint: 7445.75, confidence: 'High' }],
      liquiditySweeps: [{
        type: 'sweep',
        direction: 'SHORT',
        level: 7448.5,
        sweptLevelLabel: 'Buy-side liquidity',
        reclaimed: true,
        timestamp: candles[24].timestamp,
        confidence: 'High',
      }],
      reclaimEvents: [{
        direction: 'SHORT',
        reclaimedLevel: 7448.5,
        levelLabel: 'Buy-side liquidity',
        candleIndex: 24,
        timestamp: candles[24].timestamp,
        confidence: 'High',
      }],
      marketStructure: {
        trend: 'bearish',
        higherHigh: false,
        higherLow: false,
        lowerHigh: true,
        lowerLow: true,
        marketStructureShift: true,
        chopRangeCondition: false,
      },
    };

    const result = await prepareLiveScannerDiscordAlertArtifacts({
      session: 'lunch',
      tradeDate: '2026-06-23',
      config: { instrument: 'MES' },
      state: 'TriggerPending',
      confidence,
      candidate,
      normalized: {
        canExecute: false,
        decisionStatus: TradeDecisionStatus.ConditionalTrade,
        decision: 'SHORT',
        noTradeReason: NoTradeReason.EntryTriggerPending,
        entry: candidate.entry,
        stop: candidate.stop,
        t1: candidate.target1,
        t2: candidate.target2,
        riskPoints: candidate.riskPoints,
        invalidation: candidate.invalidation,
        setupCandidates: [candidate],
      } as any,
      chartContext: chartContext as ChartContext,
      currentPrice: 7445.5,
      completed5m: {
        time: '2026-06-23T15:25:00.0000000',
        open: 7444.75,
        high: 7446.25,
        low: 7442.25,
        close: 7445.5,
        volume: 1000,
      },
      scoringTimestamp: '2026-06-23T15:25:00.0000000',
      scoringTimestampSource: 'Phase 1 Bravo fixture completed 5M',
      windowLabel: 'Lunch/PM Setup Scanner',
      staleReason: null,
      targetCascade: {
        activeTarget: null,
        activeTimeframe: null,
        sweptTargets: [],
        promotedTarget: null,
        path: ['Phase 1 Bravo target cascade is audit-only.'],
        targetRoomPoor: false,
        reason: 'Phase 1 Bravo target cascade is audit-only.',
      },
      alertReason: 'Phase 1 Bravo forced live scanner alert path.',
      planVersionId: 'PHASE1-BRAVO-20260623-SHORT',
      outputDir,
      auditDir,
    });

    assert.equal(result.files.length, 2, 'supervisor delivery artifact must include chart and price-level map');
    assert.ok(result.chartMarkup);
    assert.ok(result.levelMap);
    assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.chartMarkup), { ok: true });
    assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.levelMap), { ok: true });

    const text = flattenDiscordPayloadText(result.payload);
    assert.ok(text.includes('HIGH-CONFIDENCE CONDITIONAL'));
    assert.ok(text.includes('Entry: 7445.75'));
    assert.ok(text.includes('Stop: 7452.50'));
    assert.ok(text.includes('T1: 7429.25'));
    assert.ok(text.includes('T2: 7428.75'));
    assert.ok(text.includes('not execution approval') || text.includes('canExecute still required'));
    assert.ok(!/Trade now|Entry confirmed|EXECUTION APPROVED/i.test(text));

    const componentLabels = (result.payload.components || []).flatMap((row: any) => (row.components || []).map((component: any) => component.label));
    assert.deepEqual(componentLabels, ['Short T1 Hit', 'Short T2 Hit', 'Short Runner Hit', 'Short Stretch Hit', 'Short Stopped', 'Scratch', 'No Trade', 'Missed']);
    await assert.doesNotReject(() => assertDiscordOutcomeEndpointSecretReady(result.payload.components, globalThis.fetch));
    assert.equal(calls.some((call) => call.url.includes('/api/discord-outcome?keycheck=1')), true);

    const webhookUrl = scannerDiscordWebhookUrlForPost('https://discord.com/api/webhooks/test/token', result.payload.components, true);
    assert.ok(webhookUrl.includes('with_components=true'));
    assert.ok(webhookUrl.includes('wait=true'));

    const audit = JSON.parse(await fsPromises.readFile(result.auditLogPath, 'utf8'));
    assert.equal(audit.visibility.visibilityMode, 'POST_CONDITIONAL');
    assert.equal(audit.visibility.authority.canExecute, false);
    assert.equal(audit.deskState.canExecute, false);
    assert.equal(audit.tradeDecisionMapAudit.tradingLogicChanged, false);
    assert.equal(audit.attachments.chartMarkup, result.chartMarkup);
    assert.equal(audit.attachments.priceLevelMap, result.levelMap);
    console.log('Phase 1 Bravo supervisor delivery contract passed: payload, chart, RAG buttons, keycheck, and audit boundary are valid.');
  } finally {
    globalThis.fetch = originalFetch;
    if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
    else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
    if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
    else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
  }
}

if (mode !== 'alpha' && mode !== 'bravo' && mode !== 'all') {
  throw new Error(`Unknown Phase 1 mode: ${mode}`);
}

if (mode === 'alpha' || mode === 'all') runAlpha();
if (mode === 'bravo' || mode === 'all') await runBravo();
