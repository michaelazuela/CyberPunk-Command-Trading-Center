import assert from 'node:assert/strict';
import {
  BANNED_ACTIVE_DISCORD_ALERT_TEXT,
  compactAttachmentLine,
  compactDiscordSummary,
  flattenDiscordPayloadText,
  morningWatchlistDiscordSummary,
  scannerHealthDiscordSummary,
  shouldSendScannerHealthAlert,
  validateDiscordPayload,
} from './discord-alert-format';
import { buildOutcomeComponents } from './discord-outcome-buttons';
import { classifyDiscordMessageText, discordMessagePolicy } from './discord-message-policy';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../../src/types';
import { evaluateScannerHealth } from '../../src/agents/scannerHealthAgent';
import type { HtfLiquidityDrawState } from '../../src/lib/htfLiquidityDrawEngine';

const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

assert.equal(discordMessagePolicy('current_desk_plan').requiresChartWhenLevelsPresent, true);
assert.equal(discordMessagePolicy('current_desk_plan').requiresRagButtons, true);
assert.equal(discordMessagePolicy('watchlist').requiresRagButtons, false);
assert.equal(discordMessagePolicy('operational_health').purgeAfterMinutes, 15);
assert.equal(discordMessagePolicy('operational_health').mayDeleteAfterRecovery, true);
assert.equal(classifyDiscordMessageText('[SUPERVISOR] Bridge Unreachable').category, 'operational_health');
assert.equal(classifyDiscordMessageText('MES Current Desk Plan').category, 'current_desk_plan');
assert.equal(classifyDiscordMessageText('[AM WATCHLIST] MES - LONG DEVELOPING').category, 'watchlist');
assert.equal(classifyDiscordMessageText('[AM WATCH] MES - LONG WATCH FORMING').category, 'watchlist');
assert.equal(classifyDiscordMessageText('MES End-of-Day Market Recap - 2026-06-19').category, 'daily_weekly_summary');

function sampleCandidate(direction: 'LONG' | 'SHORT' = 'LONG'): SetupCandidate {
  return {
    setupType: SetupType.LiquiditySweep,
    scenarioLabel: 'Liquidity sweep reclaim',
    direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: direction === 'LONG' ? 5320 : 5328,
    stop: direction === 'LONG' ? 5316 : 5332,
    target1: direction === 'LONG' ? 5326 : 5322,
    target2: direction === 'LONG' ? 5328 : 5320,
    riskPoints: 4,
    targetObjectivePlan: {
      objectives: [],
      obstacleTarget1: null,
      liquidityTarget1: {
        label: 'NY premarket high',
        price: direction === 'LONG' ? 5329 : 5318,
        source: 'ny_premarket',
        type: 'high',
        direction,
        confidence: 'High',
        score: 80,
        reason: 'Real session liquidity.',
      },
      liquidityTarget2: null,
      liquidityRunnerTarget: null,
      nearestLiquidityTarget: null,
      nearestObstacleTarget: null,
      runnerTarget: null,
      targetQuality: 'clear_path',
      targetModel: 'actual_r_with_structural_context',
      notes: [],
    },
    invalidation: 'Invalid if price violates protected structure.',
    entryClarity: 90,
    stopClarity: 90,
    targetClarity: 90,
    levelContextScore: 18,
    evidence: ['Sweep confirmed', 'Reclaim confirmed'],
    missingEvidence: ['Score breakdown should remain out of Discord main text'],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Wait for completed 5M reclaim close.',
    nextAction: 'Wait for trigger.',
    reducedRiskPlan: null,
    decisionQualityScore: 84,
    decisionQualityRecommendation: 'Full audit detail belongs in logs.',
    decisionQualityScorecard: [
      { label: 'Trigger clarity', score: 20, max: 20, status: 'strong', note: 'Do not print this full scorecard.' },
    ],
  };
}

function htfStateFixture(dataLimited = false): Pick<HtfLiquidityDrawState, 'htfContextSufficiency' | 'classificationReliability'> {
  return {
    htfContextSufficiency: {
      overallStatus: dataLimited ? 'data_limited' : 'sufficient',
      dataLimited,
      blockers: dataLimited ? ['4H context below minimum'] : [],
      notes: [],
      timeframeCoverage: [
        {
          timeframe: '4H',
          barsLoaded: dataLimited ? 4 : 22,
          rangeStart: '2026-05-25T00:00:00-04:00',
          rangeEnd: '2026-06-01T14:00:00-04:00',
          minimumExpectedDescription: '30 calendar days when available.',
          minimumSatisfied: !dataLimited,
          status: dataLimited ? 'data_limited' : 'sufficient',
        },
        {
          timeframe: '1H',
          barsLoaded: dataLimited ? 8 : 62,
          rangeStart: '2026-05-25T00:00:00-04:00',
          rangeEnd: '2026-06-01T14:00:00-04:00',
          minimumExpectedDescription: '30 calendar days when available.',
          minimumSatisfied: !dataLimited,
          status: dataLimited ? 'data_limited' : 'sufficient',
        },
        {
          timeframe: '15M',
          barsLoaded: dataLimited ? 16 : 86,
          rangeStart: '2026-05-30T00:00:00-04:00',
          rangeEnd: '2026-06-01T14:00:00-04:00',
          minimumExpectedDescription: '30 calendar days when available.',
          minimumSatisfied: !dataLimited,
          status: dataLimited ? 'data_limited' : 'sufficient',
        },
        {
          timeframe: '5M',
          barsLoaded: 43,
          rangeStart: '2026-06-01T12:00:00-04:00',
          rangeEnd: '2026-06-01T15:30:00-04:00',
          minimumExpectedDescription: '30 calendar days when available; active setup-scan window remains the execution trigger authority.',
          minimumSatisfied: true,
          status: 'sufficient',
        },
      ],
    },
    classificationReliability: dataLimited ? 'data_limited' : 'structural',
  };
}

function assertCompactPayload(payload: ReturnType<typeof compactDiscordSummary>, files: string[]) {
  validateDiscordPayload(payload, files);
  const text = flattenDiscordPayloadText(payload);
  assert.ok(text.length < 1200, `expected compact payload under 1200 chars, got ${text.length}`);
  for (const marker of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
    assert.ok(!text.toLowerCase().includes(marker.toLowerCase()), `compact payload leaked old long-form marker: ${marker}`);
  }
  assert.ok(!/Missing rea\.\.\.|Qualified rea\.\.\.|Target casc\.\.\.|Audit det\.\.\.|Counte\.\.\.|Audit detail|\{"/i.test(text));
  assert.ok(text.includes('Compact Trade Plan Summary') || text.includes('Current Desk Plan'));
  assert.ok(text.includes('Status:'));
  if (text.includes('Current Desk Plan')) {
    assert.ok(!text.includes('Memory:'));
    assert.ok(!text.includes('Details:'));
    assert.ok(!text.includes('Action:'));
  } else {
    assert.ok(text.includes('Memory:'));
    assert.ok(text.includes('History: Neutral'));
    assert.ok(text.includes('Warning: none'));
    assert.ok(text.includes('Action:'));
    assert.ok(text.includes('Details: Chart + Level Map attached.'));
  }
  assert.ok(!/Memory:[\s\S]*approve/i.test(text), 'memory display must not imply approval');
}

function assertNoExecutablePayloadKeys(value: unknown) {
  const forbiddenKeys = new Set(['canExecute', 'entry', 'stop', 't1', 't2', 'T1', 'T2', 'setupType', 'riskPoints', 'noTradeReason']);
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    for (const key of Object.keys(node as Record<string, unknown>)) {
      assert.ok(!forbiddenKeys.has(key), `formatter payload leaked executable object key: ${key}`);
      visit((node as Record<string, unknown>)[key]);
    }
  };
  visit(value);
}

const normalized = {
  canExecute: false,
  decisionStatus: TradeDecisionStatus.ConditionalTrade,
  decision: 'LONG',
  noTradeReason: null,
  invalidation: 'Invalid if protected structure fails.',
};

const morningCandidate = sampleCandidate('LONG');
const morningCandidateBefore = JSON.stringify(morningCandidate);
const morning = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'MORNING-TEST',
  normalized,
  candidates: [morningCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Morning',
  windowLabel: '09:15-12:00 ET',
  deskState: {
    marketMode: 'human_review_ready',
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    lineInSand: 5320,
    nextTrigger: 'Completed 5M shift through the reaction level, then retest/hold.',
    invalidation: 'Invalid if protected structure fails.',
    canExecute: false,
    primaryDeskPlay: {
      direction: 'LONG',
      title: 'LONG desk play',
      summary: 'Long remains primary after reaction-level reclaim.',
      lineInSand: 5320,
      longAbove: 5320,
      shortBelow: 5316,
      targetReactionLevel: 5329,
      targetReactionLabel: 'NY premarket high',
      targetReactionReason: 'Real session liquidity.',
      nextTrigger: 'Completed 5M shift through the reaction level, then retest/hold.',
      invalidation: 'Invalid if protected structure fails.',
      noChase: 'No chase. Wait for completed 5M proof.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
    },
  },
  components: buildOutcomeComponents({
    planVersionId: 'MORNING-TEST',
    sessionType: 'morning',
    tradeDate: '2026-05-26',
    instrument: 'MES',
    direction: 'LONG',
  }),
});
assertCompactPayload(morning, ['chart-plan.png', 'price-level-map.png']);
assert.equal(JSON.stringify(morningCandidate), morningCandidateBefore, 'formatter must not mutate the original candidate');
assertNoExecutablePayloadKeys(morning);
assert.ok(morning.content?.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));
const morningText = flattenDiscordPayloadText(morning);
assert.ok(morningText.includes('MES Current Desk Plan'));
assert.ok(morningText.includes('Primary: 🐂 LONG'));
assert.ok(morningText.includes('Line in sand: 5329.00'));
assert.ok(morningText.includes('Overall play: LONG above 5329.00.'));
assert.ok(morningText.includes('Next trigger:'));
assert.ok(morningText.includes('Invalidation:'));
assert.ok(morningText.includes('Stand down:'));
assert.ok(!morningText.includes('Stand down: Invalid if'));
assert.ok(morningText.includes('LONG ABOVE 5329.00'));
assert.ok(morningText.includes('Entry: 5320.00'));
assert.ok(morningText.includes('Stop: 5316.00'));
assert.ok(morningText.includes('T1: 5326.00'));
assert.ok(morningText.includes('T2: 5328.00'));
assert.ok(morningText.includes('Invalid below: 5316.00'));
assert.ok(morningText.includes('HTF target: 5329.00 / runner N/A'));
assert.ok(morningText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(morningText.includes('Chart: attached.'));
assert.ok(!morningText.includes('Targets:'));
assert.ok(!morningText.includes('Trigger:'));
assert.ok(!morningText.includes('HTF Runner Map:'));
assert.ok(!morningText.includes('HTF reaction:'));
assert.deepEqual((morning.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);

const watchCandidate = {
  ...sampleCandidate('SHORT'),
  entry: null,
  stop: null,
  target1: null,
  target2: null,
  riskPoints: null,
  requiredTrigger: 'Completed 5M close below 7320.25 required before short review.',
  invalidation: 'Invalid if price reclaims 7320.25 on a completed 5M close.',
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
  evidence: ['HTF failed auction plus 15M/5M structure shifting lower.'],
} as SetupCandidate;
const watchPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'WATCH-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: watchCandidate.invalidation,
  },
  candidates: [watchCandidate],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Morning Setup Scanner',
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'POST_WATCH',
    discordAction: 'post_watch',
    lineInSand: 7320.25,
    nextTrigger: watchCandidate.requiredTrigger,
    invalidation: watchCandidate.invalidation,
    canExecute: false,
  },
  components: buildOutcomeComponents({
    planVersionId: 'WATCH-TEST',
    sessionType: 'morning',
    tradeDate: '2026-05-26',
    instrument: 'MES',
    direction: 'SHORT',
  }),
});
const watchText = flattenDiscordPayloadText(watchPayload);
assert.ok(watchPayload.content?.includes('[AM WATCH] MES - SHORT WATCH FORMING'));
assert.equal(watchPayload.components, undefined);
assert.ok(watchText.includes('WATCH - NOT EXECUTION APPROVAL'));
assert.ok(watchText.includes('Line in the sand: 7320.25'));
assert.ok(watchText.includes('Trigger: Completed 5M close below 7320.25 required before short review.'));
assert.ok(watchText.includes('No chase.'));
assert.ok(!/^Entry:/m.test(watchText));
assert.ok(!/^Stop:/m.test(watchText));
assert.ok(!/^T1:/m.test(watchText));
assert.ok(!/^T2:/m.test(watchText));
assert.ok(!/Long T1 Hit|Short T1 Hit|Stopped|Scratch/.test(JSON.stringify(watchPayload)));

const deskPlayLongCandidate = {
  ...sampleCandidate('LONG'),
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'ICT Model 1 Long: Sweep Reclaim Imbalance Retrace',
  entry: 7312,
  stop: 7271.75,
  target1: 7400,
  target2: 7420,
  riskPoints: 40.25,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Entry only on retrace into bullish imbalance 7281.75-7342 after sweep, reclaim, displacement, and bullish structure shift.',
  invalidation: 'Invalid if price trades below the sweep low structure stop near 7271.75.',
} as SetupCandidate;
const deskPlayPayload = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-06-11',
  instrument: 'MES',
  planVersionId: 'LUNCH-DESK-PLAY-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    decision: 'NO TRADE',
    noTradeReason: 'Blocked setup did not meet educational Discord threshold.',
    invalidation: null,
    setupCandidates: [deskPlayLongCandidate],
  },
  candidates: [deskPlayLongCandidate],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Lunch/PM Setup Scan',
  currentPrice: 7350,
  components: buildOutcomeComponents({
    planVersionId: 'LUNCH-DESK-PLAY-TEST',
    sessionType: 'lunch',
    tradeDate: '2026-06-11',
    instrument: 'MES',
    direction: 'LONG',
  }),
  deskState: {
    marketMode: 'no_trade',
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    lineInSand: 7342,
    nextTrigger: 'Entry only on retrace into bullish imbalance 7281.75-7342 after sweep, reclaim, displacement, and bullish structure shift.',
    invalidation: null,
    canExecute: false,
    primaryDeskPlay: {
      direction: 'LONG',
      trendConfirmation: {
        sourceOfTruth: 'scanner_protected_structure_trend_confirmation',
        direction: 'LONG',
        status: 'aligned',
        supportingTimeframes: ['15M', '5M'],
        lineInSand: 7271.75,
        confirmation: '15M and 5M protected structure are BULL now; changes BEAR below 7271.75 on completed close+hold.',
        summary: 'Desk Direction: LONG. Trend confirmation: 15M+5M protected structure aligned; changes BEAR below 7271.75.',
      },
      title: 'LONG desk play',
      summary: 'LONG remains primary while its line/trigger holds. Opposite side stays visible as countertrend_review.',
      lineInSand: 7342,
      longAbove: 7342,
      shortBelow: 7303.5,
      targetReactionLevel: 7288.25,
      targetReactionLabel: 'London Session Low',
      targetReactionReason: 'Real session liquidity where short delivery can stall or reverse.',
      levelTransition: {
        sourceOfTruth: 'scanner_level_transition_map',
        targetReactionLevel: 7288.25,
        targetReactionLabel: 'London Session Low',
        targetReactionReason: 'Real session liquidity where short delivery can stall or reverse.',
        longAbove: 7342,
        shortBelow: 7303.5,
        profitProtectionInstruction: 'Treat London Session Low 7288.25 as the target/reaction decision area.',
        targetManagementInstruction: 'Management: take T1 seriously; cap expectation at T2 into HTF/session structure unless completed 5M acceptance clears it. Reversal risk is live.',
        nextStructureInstruction: 'After a protected completed 5M market-structure shift, use LONG above 7342.00 / SHORT below 7303.50 as the next line-in-the-sand map.',
      },
      htfObjectiveLadder: {
        sourceOfTruth: 'scanner_htf_objective_ladder',
        direction: 'LONG',
        appTarget1: 7372.5,
        appTarget2: 7392.5,
        reaction: {
          kind: 'reaction',
          label: 'London Session Low',
          price: 7288.25,
          source: 'london',
          rMultiple: null,
          instruction: 'Reaction zone: take T1/T2 seriously and protect if 5M rejects.',
        },
        nextDraw: {
          kind: 'next_draw',
          label: 'Prior RTH high',
          price: 7410,
          source: 'previous_rth',
          rMultiple: 2.4,
          instruction: 'Next draw after app targets; runner only if completed 5M acceptance continues.',
        },
        runner: {
          kind: 'runner',
          label: 'Full ETH high',
          price: 7428.75,
          source: 'eth',
          rMultiple: 2.9,
          instruction: 'Runner objective; trail only after T2 clears with completed 5M acceptance.',
        },
        extension: null,
        objectives: [],
        managementInstruction: 'App T1/T2 remain tactical. Use the HTF ladder for management only: protect at reaction zones; hold runners only after completed 5M acceptance beyond T2.',
      },
      htfProtectedStructureMap: {
        sourceOfTruth: 'scanner_htf_protected_structure_map',
        reliability: 'structural',
        rows: [
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '4H',
            bias: 'BULL',
            protectedStructure: 7271.75,
            confirmationLine: 7342,
            target: 7428.75,
            targetLabel: 'Full ETH high 7428.75',
            confidence: 78,
            status: 'confirmed_mss',
            note: 'protected 7271.75; confirm 7342.00; target 7428.75',
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '2H',
            bias: 'BULL',
            protectedStructure: 7288.25,
            confirmationLine: 7342,
            target: 7410,
            targetLabel: 'Prior RTH high 7410.00',
            confidence: 72,
            status: 'confirmed_mss',
            note: 'protected 7288.25; confirm 7342.00; target 7410.00',
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '1H',
            bias: 'NEUTRAL',
            protectedStructure: 7303.5,
            confirmationLine: 7342,
            target: null,
            targetLabel: null,
            confidence: 51,
            status: 'conflicting_mss',
            note: 'protected 7303.50; confirm 7342.00; target not mapped',
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '15M',
            bias: 'BULL',
            protectedStructure: 7342,
            confirmationLine: 7342,
            target: 7410,
            targetLabel: 'Prior RTH high 7410.00',
            confidence: 69,
            status: 'confirmed_mss',
            note: 'protected 7342.00; confirm 7342.00; target 7410.00',
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '5M',
            bias: 'BULL',
            protectedStructure: 7271.75,
            confirmationLine: 7342,
            target: 7392.5,
            targetLabel: 'App T2 7392.50',
            confidence: 82,
            status: 'confirmed_mss',
            note: 'protected 7271.75; confirm 7342.00; target 7392.50',
          },
        ],
        summary: 'HTF protected structure rows are scanner-owned context only.',
      },
      nextTrigger: 'Completed 5M pullback must hold above 7342 and reclaim the retest.',
      invalidation: 'Completed 5M acceptance below 7342 damages the long continuation play.',
      noChase: 'No chase. Wait for completed 5M proof, retest/hold, protected structure, and normal app-owned gates.',
      htfConflict: true,
      countertrendWarning: 'SHORT evidence is counter-HTF/review-only until completed 5M confirmation proves the reversal path.',
      discordEligible: true,
      longBias: {
        state: 'primary',
        scenarioLabel: 'ICT Model 1 Long: Sweep Reclaim Imbalance Retrace',
        decisionQualityScore: 82,
        modelConfidenceScore: 79,
        lineInSand: 7342,
        lineConfidence: {
          score: 82,
          label: 'high',
          reason: 'Line is backed by scanner-owned setup evidence and app-owned planning levels.',
        },
        htfReactionContext: {
          reactionLevel: 7342,
          reactionLabel: '15M bullish imbalance top',
          reactionReason: '15M imbalance retest can react if reclaim holds.',
          sourceTimeframes: ['15M'],
          strength: 'moderate',
          whyItMayReact: '15M imbalance retest can react if reclaim holds.',
        },
        nextTrigger: 'Entry only on retrace into bullish imbalance 7281.75-7342 after sweep, reclaim, displacement, and bullish structure shift.',
        tradeReadiness: {
          sourceOfTruth: 'scanner_trade_readiness_routing',
          direction: 'LONG',
          status: 'wait_for_pullback_or_new_5m_structure',
          label: 'WAIT FOR BETTER ENTRY',
          action: 'Wait for pullback/retest or new protected 5M MSS before execution consideration.',
          reason: 'Approved model route exists, but current entry quality still needs proof.',
          missingProof: ['Completed 5M trigger/retest proof is not mapped.'],
        },
        reason: 'Long retest continuation remains primary.',
        blockers: ['EntryTriggerPending'],
      },
      shortBias: {
        state: 'countertrend_review',
        scenarioLabel: 'Bearish Turtle Soup Reversal',
        decisionQualityScore: 58,
        modelConfidenceScore: 61,
        lineInSand: 7303.5,
        lineConfidence: {
          score: 58,
          label: 'medium',
          reason: 'Structured evidence exists, but opposing HTF/MSS context keeps this line review-only.',
        },
        htfReactionContext: {
          reactionLevel: 7288.25,
          reactionLabel: 'London Session Low',
          reactionReason: 'Real session liquidity where short delivery can stall or reverse.',
          sourceTimeframes: ['15M', '60M', '120M'],
          strength: 'strong',
          whyItMayReact: 'Real session liquidity where short delivery can stall or reverse.',
        },
        nextTrigger: 'Bearish Turtle Soup requires completed 5M acceptance below 7303.50.',
        tradeReadiness: {
          sourceOfTruth: 'scanner_trade_readiness_routing',
          direction: 'SHORT',
          status: 'not_aligned',
          label: 'NOT ALIGNED',
          action: 'Keep visible as review/context only.',
          reason: 'SHORT is not supported by aligned protected 15M+5M structure this cycle.',
          missingProof: ['15M and 5M protected structure are not aligned for this side.'],
        },
        reason: 'Short is counter-HTF review only.',
        blockers: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
      },
    },
  },
});
const deskPlayText = flattenDiscordPayloadText(deskPlayPayload);
assert.ok(deskPlayPayload.content?.includes('[PM DESK PLAY] MES - WAIT / LONG REVIEW'));
assert.deepEqual((deskPlayPayload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);
assert.ok(deskPlayText.includes('MES Current Desk Plan'));
assert.ok(deskPlayText.includes('Primary: 🛑 WAIT / 🐂 LONG REVIEW'));
assert.ok(deskPlayText.includes('Bias: 🧭 HTF protected structure rows are scanner-owned context only.'));
assert.ok(deskPlayText.includes('Line in sand: 7342.00'));
assert.ok(deskPlayText.includes('Overall play: LONG above 7342.00.'));
assert.ok(deskPlayText.includes('Next trigger:'));
assert.ok(deskPlayText.includes('Invalidation:'));
assert.ok(deskPlayText.includes('Stand down:'));
assert.ok(!deskPlayText.includes('Stand down: Invalid if'));
assert.ok(deskPlayText.includes('Map Side: LONG 82/100 high'));
assert.ok(deskPlayText.includes('Map Role: review map'));
assert.ok(deskPlayText.includes('Opposing Side: SHORT 58/100 medium'));
assert.ok(deskPlayText.includes('Opposing Role: context only'));
assert.ok(deskPlayText.includes('Conflict: parent context opposes map'));
assert.ok(deskPlayText.includes('Readiness: review map - levels pending'));
assert.ok(deskPlayText.includes('LONG ABOVE 7342.00'));
assert.ok(deskPlayText.includes('Entry: pending'));
assert.ok(deskPlayText.includes('Stop: pending'));
assert.ok(deskPlayText.includes('T1: pending'));
assert.ok(deskPlayText.includes('T2: pending'));
const longPrimarySection = [
  'Primary: 🛑 WAIT / 🐂 LONG REVIEW',
  'Line in sand: 7342.00',
  'LONG ABOVE 7342.00',
  'Entry: pending',
  'Status: Review only until 5M trigger + canExecute.',
].map((line) => deskPlayText.indexOf(line));
assert.ok(longPrimarySection.every((index) => index >= 0), 'expected compact LONG Desk Plan section');
assert.deepEqual([...longPrimarySection].sort((a, b) => a - b), longPrimarySection, 'primary LONG Desk Plan must keep bias, line, levels, and status in order');
assert.ok(!deskPlayText.includes('Entry ref: 7312.00'));
assert.ok(!deskPlayText.includes('Stop: 7271.75'));
assert.ok(!deskPlayText.includes('Risk: 40.25 pts'));
assert.ok(!deskPlayText.includes('T1: 7372.50'));
assert.ok(!deskPlayText.includes('T2: 7392.50'));
assert.ok(deskPlayText.includes('HTF target: 7410.00 / runner 7428.75'));
assert.ok(deskPlayText.includes('Bottom line: HTF map only; 5M proof + canExecute. No chase'));
assert.ok(deskPlayText.includes('Chart: attached; levels pending.'));
assert.ok(!deskPlayText.includes('Boundary: approvals unchanged.'));
assert.ok(!deskPlayText.includes('Current Play:'));
assert.ok(!deskPlayText.includes('HTF/Structure:'));
assert.ok(!deskPlayText.includes('Decision Map:'));
assert.ok(!deskPlayText.includes('Level Transition:'));
assert.ok(!deskPlayText.includes('HTF Bias Lines'));
assert.ok(!deskPlayText.includes('Desk Direction'));
assert.ok(/Long T1 Hit|Long Stopped|Scratch|Missed/.test(JSON.stringify(deskPlayPayload)));

const decisionMapShortCandidate = sampleCandidate('SHORT');
decisionMapShortCandidate.entry = 7339.75;
decisionMapShortCandidate.stop = 7350.25;
decisionMapShortCandidate.target1 = null;
decisionMapShortCandidate.target2 = null;
decisionMapShortCandidate.riskPoints = null;
const deskPlayDecisionMapPayload = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-06-11',
  instrument: 'MES',
  planVersionId: 'LUNCH-DESK-PLAY-DECISION-MAP-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'Review only until completed trigger/retest.',
    invalidation: null,
    setupCandidates: [decisionMapShortCandidate],
  },
  candidates: [decisionMapShortCandidate],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Lunch/PM Setup Scan',
  currentPrice: 7360,
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'post_review',
    lineInSand: 7342,
    nextTrigger: 'Bearish Failed Breakout Reversal: buy-side sweep above 7437.5, reclaim back below the swept high, then reject on the retest.',
    invalidation: 'Completed 5M reclaim above protected structure cancels the short review.',
    canExecute: false,
    primaryDeskPlay: {
      direction: 'SHORT',
      title: 'SHORT review below line in the sand',
      summary: 'Short review is visible only if completed 5M structure accepts below the line.',
      lineInSand: 7342,
      longAbove: null,
      shortBelow: 7342,
      nextTrigger: 'Bearish Failed Breakout Reversal: buy-side sweep above 7437.5, reclaim back below the swept high, then reject on the retest.',
      invalidation: 'Completed 5M reclaim above 7342.00 pauses the short review.',
      noChase: 'No chase. Wait for completed 5M proof, retest/hold, protected structure, and normal app-owned gates.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      htfProtectedStructureMap: {
        sourceOfTruth: 'scanner_htf_protected_structure_map',
        reliability: 'structural',
        rows: [
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '4H',
            bias: 'CONFLICT',
            protectedStructure: 7377.5,
            confirmationLine: 7423.75,
            target: 7460,
            targetLabel: '4H buy-side pool 7460.00',
            confidence: 35,
            status: 'conflicting_mss',
            note: 'protected 7377.50; confirm 7423.75; target 7460.00',
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '15M',
            bias: 'BEAR',
            protectedStructure: 7440.25,
            confirmationLine: 7342,
            target: 7318.75,
            targetLabel: '15M sell-side pool 7318.75',
            confidence: 66,
            status: 'confirmed_mss',
            note: 'protected 7440.25; confirm 7342.00; target 7318.75',
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '5M',
            bias: 'BEAR',
            protectedStructure: 7350.25,
            confirmationLine: 7342,
            target: 7318.75,
            targetLabel: 'App T2 7318.75',
            confidence: 72,
            status: 'confirmed_mss',
            note: 'protected 7350.25; confirm 7342.00; target 7318.75',
          },
        ],
        summary: 'HTF protected structure rows are scanner-owned context only.',
      },
      shortBias: {
        state: 'review',
        scenarioLabel: 'Short below line in the sand',
        lineInSand: 7342,
        nextTrigger: 'Completed 5M close below 7342.00, then failed retest.',
        tradeReadiness: {
          sourceOfTruth: 'scanner_trade_readiness_routing',
          direction: 'SHORT',
          status: 'execution_candidate',
          label: 'EXECUTION CANDIDATE',
          action: 'Hand to the existing canExecute gate; this layer does not approve execution.',
          reason: 'Approved model route has complete scanner-owned levels and proof metadata.',
          missingProof: [],
        },
        reason: 'Short review has app-owned entry/stop math available.',
        blockers: ['canExecute=false'],
      },
    },
  },
});
const deskPlayDecisionMapText = flattenDiscordPayloadText(deskPlayDecisionMapPayload);
assert.ok(deskPlayDecisionMapPayload.content?.includes('[PM DESK PLAY] MES - WAIT'));
assert.ok(deskPlayDecisionMapText.includes('MES Current Desk Plan'));
assert.ok(deskPlayDecisionMapText.includes('Primary: 🛑 WAIT'));
assert.ok(deskPlayDecisionMapText.includes('Bias:'));
assert.ok(deskPlayDecisionMapText.includes('Line in sand: 7342.00'));
assert.ok(deskPlayDecisionMapText.includes('Map Side: SHORT N/A unavailable'));
assert.ok(deskPlayDecisionMapText.includes('Map Role: review map'));
assert.ok(deskPlayDecisionMapText.includes('Opposing Side: LONG N/A unavailable'));
assert.ok(deskPlayDecisionMapText.includes('Opposing Role: context only'));
assert.ok(deskPlayDecisionMapText.includes('Readiness: review map - wait'));
assert.ok(deskPlayDecisionMapText.includes('No active LONG/SHORT plan with complete app-owned levels.'));
assert.ok(deskPlayDecisionMapText.includes('Bottom line: HTF map only; 5M proof + canExecute. No chase'));
assert.ok(deskPlayDecisionMapText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(deskPlayDecisionMapText.includes('Chart: not attached; waiting on app-owned levels.'));
assert.ok(!deskPlayDecisionMapText.includes('HTF Bias Lines'));
assert.ok(!deskPlayDecisionMapText.includes('Review Map:'));
assert.ok(!deskPlayDecisionMapText.includes('Entry 7339.75 | Stop 7350.25 | T1 7324.00 | T2 7318.75'));
const waitMapShortRow = [
  'Primary: 🛑 WAIT',
  'Line in sand: 7342.00',
  'No active LONG/SHORT plan with complete app-owned levels.',
  'Status: Review only until 5M trigger + canExecute.',
].map((line) => deskPlayDecisionMapText.indexOf(line));
assert.ok(waitMapShortRow.every((index) => index >= 0), 'expected concise WAIT Desk Plan');
assert.deepEqual([...waitMapShortRow].sort((a, b) => a - b), waitMapShortRow, 'WAIT Desk Plan must keep primary, line, plan state, and status in order');
assert.ok(!deskPlayDecisionMapText.includes('Bearish Failed Breakout Reversal'));
assert.ok(!deskPlayDecisionMapText.includes('reclaim back below t...'));
assert.ok(!deskPlayDecisionMapText.includes('Need: protected 5M shift + canExecute.'));
assert.equal(deskPlayDecisionMapText.includes('No HTF-supported directional play is confirmed'), false);
assert.equal(deskPlayDecisionMapText.includes('Status: review-only map; no HTF-supported active play.'), false);
assert.ok(!deskPlayDecisionMapPayload.content?.includes('[PM DESK PLAY] MES - SHORT'));

const dataLimitedReferenceCandidate = sampleCandidate('SHORT');
dataLimitedReferenceCandidate.entry = 7525;
dataLimitedReferenceCandidate.stop = 7533;
dataLimitedReferenceCandidate.target1 = null;
dataLimitedReferenceCandidate.target2 = null;
dataLimitedReferenceCandidate.riskPoints = null;
dataLimitedReferenceCandidate.activeRuleset = {
  ...dataLimitedReferenceCandidate.activeRuleset,
  htfLineInSand: {
    ...(dataLimitedReferenceCandidate.activeRuleset?.htfLineInSand || {}),
    applied: true,
    status: 'passed',
    required: 'completed_5m_or_15m_close_beyond_htf_line',
    appliesToAllModels: true,
    affectsExecution: false,
    direction: 'SHORT',
    lineInSand: 7525,
    lineReason: 'Reference 5M short trigger line.',
    obstacleType: 'support',
    obstacleSource: 'app',
    requiredClose: 'Completed 5M close below 7525.00.',
    evidence: ['Reference 5M short trigger line.'],
    blockers: [],
  },
};
const dataLimitedDeskPlayPayload = compactDiscordSummary({
  session: 'evening',
  tradeDate: '2026-06-21',
  instrument: 'MES',
  planVersionId: 'EVENING-DATA-LIMITED-REFERENCE-MAP-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'HTF readiness gate is data-limited; review levels only.',
    invalidation: null,
    setupCandidates: [dataLimitedReferenceCandidate],
  },
  candidates: [dataLimitedReferenceCandidate],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Evening Setup Scan',
  currentPrice: 7526,
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'post_review',
    lineInSand: 7525,
    nextTrigger: 'Completed 5M close below 7525.00, then retest/hold.',
    invalidation: 'Completed 5M reclaim above 7533.00 cancels the short review map.',
    canExecute: false,
    htfContextStatus: 'insufficient',
    dataQualityStatus: 'data_limited',
    primaryDeskPlay: {
      direction: 'SHORT',
      title: 'SHORT review below line in the sand',
      summary: 'Short review remains reference-only while HTF data is limited.',
      lineInSand: 7525,
      longAbove: 7538.25,
      shortBelow: 7525,
      nextTrigger: 'Completed 5M close below 7525.00, then retest/hold.',
      invalidation: 'Completed 5M reclaim above 7533.00 cancels the short review map.',
      noChase: 'No chase. Wait for completed 5M proof, retest/hold, protected structure, and normal app-owned gates.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      htfProtectedStructureMap: {
        sourceOfTruth: 'scanner_htf_protected_structure_map',
        reliability: 'data_limited',
        rows: [
          { sourceOfTruth: 'scanner_htf_protected_structure_map', timeframe: '5M', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7533, confirmationLine: 7525, target: 7509, targetLabel: 'Tactical T2 7509.00', confidence: 70, status: 'confirmed_mss', note: '5M tactical structure only' },
        ],
        summary: 'HTF data-limited; context only.',
      },
      shortBias: {
        state: 'primary',
        scenarioLabel: 'Short reference map',
        decisionQualityScore: 72,
        lineInSand: 7525,
        lineConfidence: { score: 72, label: 'medium', reason: 'Completed 5M reference line is available.' },
        nextTrigger: 'Completed 5M close below 7525.00, then retest/hold.',
        tradeReadiness: {
          sourceOfTruth: 'scanner_trade_readiness_routing',
          direction: 'SHORT',
          status: 'data_limited',
          label: 'DATA LIMITED',
          action: 'Show reference map only.',
          reason: 'HTF promotion blocked while 4H context is incomplete.',
          missingProof: ['4H structured OHLC context is incomplete.'],
        },
        reason: 'Short reference map is visible, not executable.',
        blockers: ['HTF data-limited'],
      },
      longBias: {
        state: 'secondary',
        scenarioLabel: 'Long reclaim reference',
        decisionQualityScore: 45,
        lineInSand: 7538.25,
        reason: 'Long requires reclaim.',
        blockers: ['No completed 5M reclaim.'],
      },
    },
  },
});
const dataLimitedDeskPlayText = flattenDiscordPayloadText(dataLimitedDeskPlayPayload);
assert.ok(dataLimitedDeskPlayText.includes('MES Current Desk Plan'));
assert.ok(dataLimitedDeskPlayText.includes('Primary: 🐻 SHORT'));
assert.ok(dataLimitedDeskPlayText.includes('SHORT BELOW 7525.00'));
assert.ok(dataLimitedDeskPlayText.includes('Tactical levels - not execution approval.'));
assert.ok(dataLimitedDeskPlayText.includes('Sniper watch: 1M timing only; 5M close/hold required.'));
assert.ok(dataLimitedDeskPlayText.includes('Entry: 7525.00'));
assert.ok(dataLimitedDeskPlayText.includes('Stop: 7533.00'));
assert.ok(dataLimitedDeskPlayText.includes('T1: 7513.00'));
assert.ok(dataLimitedDeskPlayText.includes('T2: 7509.00'));
assert.ok(dataLimitedDeskPlayText.includes('Reason not executable: HTF/data context is limited; canExecute remains false.'));
assert.ok(dataLimitedDeskPlayText.includes('Status: Review only; HTF context is data-limited.'));
assert.ok(!/^Entry: pending$/m.test(dataLimitedDeskPlayText));
assert.ok(!/^Stop: pending$/m.test(dataLimitedDeskPlayText));

const detachedLongCandidate = sampleCandidate('LONG');
detachedLongCandidate.entry = 7426.5;
detachedLongCandidate.stop = 7408.25;
detachedLongCandidate.target1 = null;
detachedLongCandidate.target2 = null;
detachedLongCandidate.riskPoints = null;
const wrongSideShortCandidate = sampleCandidate('SHORT');
wrongSideShortCandidate.entry = 7441;
wrongSideShortCandidate.stop = 7433;
wrongSideShortCandidate.target1 = null;
wrongSideShortCandidate.target2 = null;
wrongSideShortCandidate.riskPoints = null;
const invalidDeskMapPayload = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-06-12',
  instrument: 'MES',
  planVersionId: 'LUNCH-DESK-PLAY-INVALID-LEVELS-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'Review only until completed trigger/retest.',
    invalidation: null,
    setupCandidates: [detachedLongCandidate, wrongSideShortCandidate],
  },
  candidates: [detachedLongCandidate, wrongSideShortCandidate],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Lunch/PM Setup Scan',
  currentPrice: 7440,
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    lineInSand: 7437.5,
    canExecute: false,
    primaryDeskPlay: {
      direction: 'SHORT',
      title: 'WAIT review map',
      summary: 'Two-sided map until completed structure confirms.',
      lineInSand: 7437.5,
      longAbove: 7410,
      shortBelow: 7437.5,
      nextTrigger: 'Wait for completed 5M proof.',
      invalidation: 'Protected structure must hold.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      shortBias: {
        state: 'review',
        scenarioLabel: 'Short below line in the sand',
        lineInSand: 7437.5,
        nextTrigger: 'Completed 5M close below 7437.50, then failed retest.',
        reason: 'Review only.',
        blockers: ['canExecute=false'],
      },
      longBias: {
        state: 'review',
        scenarioLabel: 'Long above line in the sand',
        lineInSand: 7410,
        nextTrigger: 'Completed 5M close above 7410.00, then hold retest.',
        reason: 'Review only.',
        blockers: ['canExecute=false'],
      },
    },
  },
});
const invalidDeskMapText = flattenDiscordPayloadText(invalidDeskMapPayload);
assert.ok(invalidDeskMapText.includes('Primary: 🛑 WAIT'));
assert.ok(invalidDeskMapText.includes('Line in sand: 7437.50'));
assert.ok(invalidDeskMapText.includes('No active LONG/SHORT plan with complete app-owned levels.'));
assert.ok(!invalidDeskMapText.includes('LONG ABOVE 7410.00 | Entry 7426.50'));
assert.ok(!invalidDeskMapText.includes('SHORT BELOW 7437.50 | Entry 7441.00'));
assert.ok(!invalidDeskMapText.includes('Stop 7433.00 | T1 7429.00 | T2 7425.00'));

const pullbackReviewCandidate = sampleCandidate('LONG');
pullbackReviewCandidate.setupType = SetupType.TurtleSoup;
pullbackReviewCandidate.entry = 7432.5;
pullbackReviewCandidate.stop = 7414.75;
pullbackReviewCandidate.target1 = 7470;
pullbackReviewCandidate.target2 = 7480;
pullbackReviewCandidate.riskPoints = 17.75;
const pullbackReferenceDeskMapPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-23',
  instrument: 'MES',
  planVersionId: 'MORNING-DESK-PLAY-PULLBACK-REFERENCE-LEVELS',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: 'Review only until completed 5M proof.',
    invalidation: null,
    entry: pullbackReviewCandidate.entry,
    stop: pullbackReviewCandidate.stop,
    t1: pullbackReviewCandidate.target1,
    t2: pullbackReviewCandidate.target2,
    setupCandidates: [pullbackReviewCandidate],
  },
  candidates: [pullbackReviewCandidate],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Morning Setup Scan',
  currentPrice: 7462.5,
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    lineInSand: 7436.25,
    canExecute: false,
    primaryDeskPlay: {
      direction: 'LONG',
      title: 'LONG desk play',
      summary: 'Desk Direction: LONG. Opposing parent structure keeps this review-only.',
      lineInSand: 7436.25,
      activeTacticalLine: {
        direction: 'LONG',
        originalLine: 7436.25,
        activeLine: 7454.5,
        migrated: true,
        supportingTimeframes: ['15M', '5M'],
        reason: 'Active tactical line migrated from original campaign line 7436.25 to 7454.50 using 15M+5M protected-structure confirmation.',
        nextTrigger: 'Use 7454.50 as the active tactical line: completed 5M hold/retest above that line is required before fresh execution consideration.',
        standDown: 'Stand down from fresh LONG entries if completed 5M acceptance returns below 7454.50; manage any earlier plan separately.',
      },
      activeTacticalZone: {
        sourceOfTruth: 'scanner_active_tactical_zone',
        direction: 'LONG',
        lower: 7466.25,
        upper: 7470.75,
        anchorLine: 7454.5,
        migratedFromLine: 7454.5,
        migrated: true,
        zoneLabel: '5M tactical pullback / retest zone',
        sourceTimeframe: '5M',
        state: 'moved_away',
        reason: 'Fresh tactical decision area migrated from active line 7454.50 to 7466.25-7470.75 from scanner-owned trigger/zone context.',
        nextTrigger: 'Active tactical zone 7466.25-7470.75: completed 5M hold/reclaim above the zone required before fresh execution consideration.',
        standDown: 'Fresh LONG stand down on completed 5M acceptance below 7466.25.',
        noChase: 'No chase away from 7466.25-7470.75. If price has already expanded beyond the zone, treat as management-only until a fresh completed 5M setup forms.',
      },
      longAbove: 7436.25,
      shortBelow: null,
      nextTrigger: 'Wait for completed 5M hold/retest above 7436.25.',
      invalidation: 'Stand down if price accepts back below 7436.25.',
      htfConflict: true,
      countertrendWarning: 'Parent context opposes map.',
      discordEligible: true,
      longBias: {
        state: 'primary',
        scenarioLabel: 'Long failed auction review',
        decisionQualityScore: 59,
        lineInSand: 7436.25,
        reason: 'Structured review levels are visible, but HTF context opposes.',
        blockers: ['canExecute=false'],
      },
      shortBias: {
        state: 'not_present',
        scenarioLabel: null,
        decisionQualityScore: null,
        lineInSand: null,
        reason: 'No short candidate is present.',
        blockers: [],
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7520.5, confirmationLine: 7583 },
          { timeframe: '2H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7513.25, confirmationLine: 7568.5 },
          { timeframe: '1H', bias: 'CONFLICT', currentBias: 'RANGE', protectedStructure: 7437.25, confirmationLine: 7513.5 },
          { timeframe: '15M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7423.75, confirmationLine: 7454.5 },
          { timeframe: '5M', bias: 'CONFLICT', currentBias: 'BULL', protectedStructure: 7414.75, confirmationLine: 7436.25 },
        ],
      },
    },
  },
});
const pullbackReferenceDeskMapText = flattenDiscordPayloadText(pullbackReferenceDeskMapPayload);
assert.ok(pullbackReferenceDeskMapText.includes('Original campaign line: 7436.25'));
assert.ok(pullbackReferenceDeskMapText.includes('Active tactical line: 7454.50'));
assert.ok(pullbackReferenceDeskMapText.includes('Active tactical zone: 7466.25-7470.75'));
assert.ok(pullbackReferenceDeskMapText.includes('Zone migration: 7454.50 -> 7466.25-7470.75; fresh decision area, not execution approval.'));
assert.ok(pullbackReferenceDeskMapText.includes('Zone no chase: No chase away from 7466.25-7470.75.'));
assert.ok(pullbackReferenceDeskMapText.includes('HTF regime: 4H BEAR / 2H BEAR / 1H RANGE / 15M BULL / 5M BULL'));
assert.ok(pullbackReferenceDeskMapText.includes('Overall play: LONG above 7454.50.'));
assert.ok(pullbackReferenceDeskMapText.includes('Next trigger: Active tactical zone 7466.25-7470.75'));
assert.ok(pullbackReferenceDeskMapText.includes('LONG ABOVE 7454.50'));
assert.ok(pullbackReferenceDeskMapText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(pullbackReferenceDeskMapText.includes('Entry: 7432.50'));
assert.ok(pullbackReferenceDeskMapText.includes('Stop: 7414.75'));
assert.ok(pullbackReferenceDeskMapText.includes('T1: 7459.25'));
assert.ok(pullbackReferenceDeskMapText.includes('T2: 7468.00'));
assert.ok(!pullbackReferenceDeskMapText.includes('LONG ABOVE 7436.25\nEntry: pending'));
assert.ok(!pullbackReferenceDeskMapText.includes('Chart: attached; levels pending.'));

const projectedDeskPlayPayload = compactDiscordSummary({
  session: 'evening',
  tradeDate: '2026-06-14',
  instrument: 'MES',
  planVersionId: 'EVENING-DESK-PLAY-PROJECTED-LEVELS-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'Review only until completed trigger/retest.',
    invalidation: null,
    setupCandidates: [],
  },
  candidates: [],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Evening Setup Scan',
  currentPrice: 7579.25,
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    lineInSand: 7570,
    canExecute: false,
    primaryDeskPlay: {
      direction: 'WAIT',
      title: 'Evening Desk Play',
      summary: 'Review-only two-sided map.',
      lineInSand: 7570,
      longAbove: 7570,
      shortBelow: 7570,
      nextTrigger: 'LONG above 7570.00 / SHORT below 7570.00; completed 5M close/retest only.',
      invalidation: 'Protected structure must hold.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      htfProtectedStructureMap: {
        sourceOfTruth: 'scanner_htf_protected_structure_map',
        reliability: 'structural',
        rows: [
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '5M',
            bias: 'BULL',
            protectedStructure: 7567.5,
            confirmationLine: 7570,
            target: 7575,
            targetLabel: 'App T2 7575.00',
            confidence: 72,
            status: 'confirmed_mss',
            note: 'protected 7567.50; confirm 7570.00; target 7575.00',
          },
        ],
        summary: 'HTF protected structure rows are scanner-owned context only.',
      },
      longBias: {
        state: 'review',
        scenarioLabel: 'Long above line in the sand',
        lineInSand: 7570,
        nextTrigger: 'Completed 5M close above 7570.00, then hold retest.',
        reason: 'LONG is the aligned review path.',
        blockers: ['canExecute=false'],
      },
      shortBias: {
        state: 'review',
        scenarioLabel: 'Short below line in the sand',
        lineInSand: 7570,
        nextTrigger: 'Completed 5M close below 7570.00, then failed retest.',
        reason: 'SHORT is context only.',
        blockers: ['canExecute=false'],
      },
    },
  },
});
const projectedDeskPlayText = flattenDiscordPayloadText(projectedDeskPlayPayload);
assert.ok(projectedDeskPlayText.includes('Primary: 🛑 WAIT'));
assert.ok(projectedDeskPlayText.includes('Line in sand: 7570.00'));
assert.ok(projectedDeskPlayText.includes('Map Side: WAIT N/A'));
assert.ok(projectedDeskPlayText.includes('Map Role: no active directional map'));
assert.ok(projectedDeskPlayText.includes('Opposing Side: N/A'));
assert.ok(projectedDeskPlayText.includes('Opposing Role: context unavailable'));
assert.ok(projectedDeskPlayText.includes('Conflict: no confirmed active side'));
assert.ok(projectedDeskPlayText.includes('HTF Lines:'));
assert.ok(projectedDeskPlayText.includes('LONG ABOVE 7570.00'));
assert.ok(projectedDeskPlayText.includes('SHORT BELOW 7570.00'));
assert.ok(projectedDeskPlayText.includes('No active LONG/SHORT plan with complete app-owned levels.'));
assert.ok(!projectedDeskPlayText.includes('Entry 7570.00-7571.00 | Stop 7567.50 | T1 7573.75 | T2 7575.00'));
assert.ok(!projectedDeskPlayText.includes('NO CHASE: retest/new 5M'));
assert.ok(!projectedDeskPlayText.includes('LONG ABOVE 7570.00 | levels pending'));
assert.ok(projectedDeskPlayText.length < 2000, `expected projected Desk Play payload under Discord limit, got ${projectedDeskPlayText.length}`);

const waitDeskMapWithCandidate = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-12',
  instrument: 'MES',
  planVersionId: 'AM-WAIT-DESK-MAP-WITH-CANDIDATE-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid below protected structure.',
    setupCandidates: [detachedLongCandidate],
  },
  candidates: [detachedLongCandidate],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Morning Setup Scan',
  currentPrice: 7415,
  deskState: {
    marketMode: 'human_review_ready',
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    lineInSand: 7407.25,
    nextTrigger: 'LONG above 7407.25 only after completed 5M proof.',
    invalidation: 'Invalid below protected structure.',
    canExecute: false,
    primaryDeskPlay: {
      direction: 'WAIT',
      title: 'WAIT - desk play not confirmed',
      summary: 'No HTF-supported directional play is confirmed from scanner-owned lifecycle state.',
      lineInSand: 7407.25,
      longAbove: 7407.25,
      shortBelow: 7400,
      nextTrigger: 'LONG above 7407.25 / SHORT below 7400.00; completed 5M close/retest only.',
      invalidation: 'Protected structure must hold.',
      htfConflict: true,
      countertrendWarning: 'LONG is pressing into bearish HTF/session structure. Treat T1/T2 as management.',
      discordEligible: true,
      longBias: {
        state: 'countertrend_review',
        scenarioLabel: 'Long review only',
        lineInSand: 7407.25,
        nextTrigger: 'Completed 5M close above 7407.25, then hold retest.',
        reason: 'Review only; primary desk state is WAIT.',
        blockers: ['canExecute=false'],
      },
      shortBias: {
        state: 'secondary',
        scenarioLabel: 'Short review below line',
        lineInSand: 7400,
        nextTrigger: 'Completed 5M close below 7400.00, then failed retest.',
        reason: 'Review only.',
        blockers: ['canExecute=false'],
      },
    },
  },
});
const waitDeskMapWithCandidateText = flattenDiscordPayloadText(waitDeskMapWithCandidate);
assert.ok(waitDeskMapWithCandidate.content?.includes('[AM DESK PLAY] MES - WAIT'));
assert.ok(!waitDeskMapWithCandidate.content?.includes('[AM REVIEW] MES - LONG'));
assert.ok(waitDeskMapWithCandidateText.includes('Primary: 🛑 WAIT'));
assert.ok(waitDeskMapWithCandidateText.includes('Line in sand: 7407.25'));
assert.ok(waitDeskMapWithCandidateText.includes('No active LONG/SHORT plan with complete app-owned levels.'));
assert.ok(waitDeskMapWithCandidateText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(!waitDeskMapWithCandidateText.includes('Review Map:'));

const deskPlaySupportedShortPayload = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-06-11',
  instrument: 'MES',
  planVersionId: 'LUNCH-DESK-PLAY-SUPPORTED-SHORT-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'Review only until completed trigger/retest.',
    invalidation: null,
    setupCandidates: [decisionMapShortCandidate],
  },
  candidates: [decisionMapShortCandidate],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Lunch/PM Setup Scan',
  components: buildOutcomeComponents({
    planVersionId: 'LUNCH-DESK-PLAY-SUPPORTED-SHORT-TEST',
    sessionType: 'lunch',
    tradeDate: '2026-06-11',
    instrument: 'MES',
    direction: 'SHORT',
  }),
  deskState: {
    marketMode: 'watching',
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    lineInSand: 7342,
    nextTrigger: 'Completed 5M acceptance below 7342.00, then retest failure.',
    invalidation: 'Completed 5M reclaim above protected structure cancels the short review.',
    canExecute: false,
    primaryDeskPlay: {
      direction: 'SHORT',
      title: 'SHORT review below line in the sand',
      summary: 'Short review is visible only if completed 5M structure accepts below the line.',
      lineInSand: 7342,
      longAbove: null,
      shortBelow: 7342,
      nextTrigger: 'Completed 5M close below 7342.00, then failed retest.',
      invalidation: 'Completed 5M reclaim above 7342.00 pauses the short review.',
      noChase: 'No chase. Wait for completed 5M proof, retest/hold, protected structure, and normal app-owned gates.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      shortBias: {
        state: 'primary',
        scenarioLabel: 'Short below line in the sand',
        lineInSand: 7342,
        nextTrigger: 'Completed 5M close below 7342.00, then failed retest.',
        reason: 'Short review has explicit completed HTF support and app-owned entry/stop math available.',
        blockers: ['canExecute=false'],
      },
    },
  },
});
const deskPlaySupportedShortText = flattenDiscordPayloadText(deskPlaySupportedShortPayload);
assert.ok(deskPlaySupportedShortPayload.content?.includes('[PM DESK PLAY] MES - SHORT'));
assert.ok(deskPlaySupportedShortText.includes('MES Current Desk Plan'));
assert.ok(deskPlaySupportedShortText.includes('Primary: 🐻 SHORT'));
assert.ok(deskPlaySupportedShortText.includes('Line in sand: 7342.00'));
assert.ok(deskPlaySupportedShortText.includes('Map Side: SHORT N/A unavailable'));
assert.ok(deskPlaySupportedShortText.includes('Map Role: review map'));
assert.ok(deskPlaySupportedShortText.includes('Opposing Side: LONG N/A unavailable'));
assert.ok(deskPlaySupportedShortText.includes('Opposing Role: context only'));
assert.ok(deskPlaySupportedShortText.includes('Conflict: none flagged'));
assert.ok(deskPlaySupportedShortText.includes('Readiness: review map - wait'));
assert.ok(deskPlaySupportedShortText.includes('SHORT BELOW 7342.00'));
assert.ok(deskPlaySupportedShortText.includes('Entry: 7339.75'));
assert.ok(deskPlaySupportedShortText.includes('Stop: 7350.25'));
assert.ok(deskPlaySupportedShortText.includes('T1: 7324.00'));
assert.ok(deskPlaySupportedShortText.includes('T2: 7318.75'));
assert.ok(deskPlaySupportedShortText.includes('Invalid above: 7350.25'));
assert.ok(deskPlaySupportedShortText.includes('Bottom line: HTF frames SHORT; needs 5M proof, stop, risk, canExecute. No chase'));
assert.ok(deskPlaySupportedShortText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(deskPlaySupportedShortText.includes('Chart: attached.'));
assert.ok(!deskPlaySupportedShortText.includes('Boundary: approvals unchanged.'));
assert.ok(!/EXECUTABLE -|Trade now/i.test(deskPlaySupportedShortText));
assert.throws(
  () => validateDiscordPayload(deskPlaySupportedShortPayload, []),
  /Current Desk Plan with app-owned levels requires an attached chart/,
);
validateDiscordPayload(deskPlaySupportedShortPayload, ['desk-plan-chart.png']);

const deskPlayPendingShortMapPayload = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-06-16',
  instrument: 'MES',
  planVersionId: 'LUNCH-DESK-PLAY-PENDING-SHORT-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    decision: 'NO TRADE',
    noTradeReason: 'Short map only; protected 5M stop and app targets are incomplete.',
    invalidation: null,
    setupCandidates: [],
  },
  candidates: [],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Scanner',
  windowLabel: 'Lunch/PM Setup Scan',
  deskState: {
    marketMode: 'conditional',
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    lineInSand: 7600,
    nextTrigger: 'Completed 5M close and hold below 7600.00 required before short review can build levels.',
    invalidation: null,
    canExecute: false,
    primaryDeskPlay: {
      direction: 'SHORT',
      title: 'SHORT map below line in the sand',
      summary: 'SHORT is primary map context, but execution levels are incomplete.',
      lineInSand: 7600,
      longAbove: 7610,
      shortBelow: 7600,
      fvgDecisionZone: {
        sourceOfTruth: 'scanner_htf_fvg_decision_zone',
        direction: 'SHORT',
        lineInSand: 7600,
        zoneLabel: '60M FVG / imbalance decision zone',
        sourceTimeframe: '60M',
        state: 'retest_required',
        whyItMatters: '7600.00 matters because it is the 60M bearish FVG lower boundary and active short line in the sand.',
        holdCondition: 'Short context needs completed 5M hold/rejection below 7600.00.',
        foldCondition: 'Fold: completed acceptance above 7600.00 turns this FVG into support/long management context.',
        managementInstruction: 'FVG is a reaction/management zone only. It does not approve execution without completed 5M proof and canExecute.',
        noChase: 'No chase inside or beyond the FVG. Wait for completed 5M close/hold/retest proof.',
      },
      htfFvgCascade: {
        sourceOfTruth: 'scanner_htf_fvg_cascade_parent_zone_routing',
        direction: 'SHORT',
        parentZone: {
          sourceOfTruth: 'scanner_htf_fvg_parent_zone',
          direction: 'SHORT',
          timeframe: '60M',
          lower: 7596,
          upper: 7604,
          midpoint: 7600,
          label: '60M bearish FVG parent zone',
          state: 'retest_required',
          evidence: '60M bearish FVG from structured OHLC facts.',
        },
        childExecutionZone: {
          sourceOfTruth: 'scanner_htf_fvg_child_execution_zone',
          direction: 'SHORT',
          timeframe: '5M',
          source: 'parent_htf_zone_with_5m_trigger',
          lower: 7596,
          upper: 7604,
          anchorLine: 7600,
          entry: null,
          stop: null,
          target1: null,
          target2: null,
          triggerNeeded: 'Use the 60M parent FVG; wait for completed 5M rejection below 7600.00.',
        },
        routingSummary: 'HTF-first routing: 60M parent FVG frames the map; completed 5M proof supplies execution.',
        standDown: 'Stand down on completed 5M acceptance above parent zone 7604.00.',
      },
      nextTrigger: 'Completed 5M close and hold below 7600.00 required before short review can build levels.',
      invalidation: null,
      noChase: 'No chase. Wait for completed 5M proof and protected structure.',
      htfConflict: true,
      countertrendWarning: 'Review only.',
      discordEligible: true,
      htfProtectedStructureMap: {
        sourceOfTruth: 'scanner_htf_protected_structure_map',
        reliability: 'data_limited',
        summary: 'HTF map only.',
        rows: [
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '4H',
            bias: 'BEAR',
            currentBias: 'BEAR',
            biasChangeLine: 7684,
            protectedStructure: 7641,
            confirmationLine: 7684,
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '2H',
            bias: 'CONFLICT',
            currentBias: 'RANGE',
            biasChangeLine: 7651.5,
            protectedStructure: 7591,
            confirmationLine: 7651.5,
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '1H',
            bias: 'BULL',
            currentBias: 'BULL',
            biasChangeLine: 7437.25,
            protectedStructure: 7437.25,
            confirmationLine: 7513.5,
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '15M',
            bias: 'BEAR',
            currentBias: 'BEAR',
            biasChangeLine: 7627.5,
            protectedStructure: 7617.25,
            confirmationLine: 7627.5,
          },
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map',
            timeframe: '5M',
            bias: 'BEAR',
            currentBias: 'BEAR',
            biasChangeLine: 7627.5,
            protectedStructure: 7619.25,
            confirmationLine: 7627.5,
          },
        ],
      },
      shortBias: {
        state: 'primary',
        scenarioLabel: 'Short below 7600 map',
        lineInSand: 7600,
        nextTrigger: 'Completed 5M close and hold below 7600.00 required before short review can build levels.',
        reason: 'Short side is the primary map, but not a complete plan.',
        blockers: ['Entry, protected 5M stop, T1, or T2 is missing.'],
      },
      longBias: {
        state: 'countertrend_review',
        scenarioLabel: 'Long above 7610 review',
        lineInSand: 7610,
        nextTrigger: 'Only review after completed 5M reclaim.',
        reason: 'Opposite side remains context only.',
        blockers: ['Countertrend review only.'],
      },
    },
  },
});
const pendingShortMapText = flattenDiscordPayloadText(deskPlayPendingShortMapPayload);
assert.ok(deskPlayPendingShortMapPayload.content?.includes('[PM DESK PLAY] MES - WAIT / SHORT REVIEW'));
assert.ok(!deskPlayPendingShortMapPayload.content?.includes('MES - SHORT |'));
assert.ok(pendingShortMapText.includes('Primary: 🛑 WAIT / 🐻 SHORT REVIEW'));
assert.ok(pendingShortMapText.includes('Map Side: SHORT N/A unavailable'));
assert.ok(pendingShortMapText.includes('Opposing Side: LONG N/A unavailable'));
assert.ok(pendingShortMapText.includes('Conflict: HTF data-limited; context only'));
assert.ok(pendingShortMapText.includes('Readiness: review map - levels pending'));
assert.ok(pendingShortMapText.includes('⚖️ 2H: RANGE; bull above 7651.50 / bear below 7591.00'));
assert.ok(pendingShortMapText.includes('FVG Decision Zone:'));
assert.ok(pendingShortMapText.includes('60M FVG / imbalance decision zone: 7600.00 (retest required)'));
assert.ok(pendingShortMapText.includes('Hold: Short context needs completed 5M hold/rejection below 7600.00.'));
assert.ok(pendingShortMapText.includes('Fold: completed acceptance above 7600.00 turns this FVG into support/long management context.'));
assert.ok(pendingShortMapText.includes('FVG is a reaction/management zone only.'));
assert.ok(pendingShortMapText.includes('HTF FVG Cascade:'));
assert.ok(pendingShortMapText.includes('Parent FVG: 60M 7596.00-7604.00'));
assert.ok(pendingShortMapText.includes('5M route: parent zone + 5M trigger 7596.00-7604.00.'));
assert.ok(pendingShortMapText.includes('Trigger: Use the 60M parent FVG; wait for completed 5M rejection below 7600.00.'));
assert.ok(pendingShortMapText.includes('Stand down on completed 5M acceptance above parent zone 7604.00.'));
assert.ok(pendingShortMapText.includes('SHORT BELOW 7600.00'));
assert.ok(pendingShortMapText.includes('LONG ABOVE 7610.00'));
assert.equal((pendingShortMapText.match(/^Entry: pending$/gm) || []).length, 2);
assert.ok(pendingShortMapText.includes('No active LONG/SHORT plan with complete app-owned levels.'));
assert.ok(!/Entry: 7615\.75|Stop: 7598\.50|T1: 7641\.75|T2: 7650\.25/.test(pendingShortMapText));

const deskPlayWideReviewCandidate = sampleCandidate('SHORT');
deskPlayWideReviewCandidate.setupType = SetupType.IntradayMssMicroContinuation;
deskPlayWideReviewCandidate.entry = 7581.25;
deskPlayWideReviewCandidate.stop = 7600.5;
deskPlayWideReviewCandidate.target1 = 7552.5;
deskPlayWideReviewCandidate.target2 = 7542.75;
deskPlayWideReviewCandidate.riskPoints = 19.25;
deskPlayWideReviewCandidate.executionStatus = ExecutionStatus.Conditional;
deskPlayWideReviewCandidate.blockReason = null;
deskPlayWideReviewCandidate.requiredTrigger = 'Completed 5M close below 7591.00 required before short continuation is active.';
deskPlayWideReviewCandidate.invalidation = 'Invalid if price reclaims above the protected 5M MSS swing stop near 7600.50.';
const deskPlayWideReviewPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-17',
  instrument: 'MES',
  planVersionId: 'MORNING-WIDE-REVIEW-DESK-PLAY',
  normalized: { ...normalized, decision: 'SHORT', setupCandidates: [deskPlayWideReviewCandidate] },
  candidates: [deskPlayWideReviewCandidate],
  attachments: { chartPlan: true, priceLevelMap: false },
  sourceLabel: 'Morning',
  windowLabel: '09:15-12:00 ET',
  currentPrice: 7597.75,
  deskState: {
    marketMode: 'human_review_ready',
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    lineInSand: 7591,
    nextTrigger: 'Completed 5M close below 7591.00 required before short continuation is active.',
    invalidation: 'Invalid if price reclaims above the protected 5M MSS swing stop near 7600.50.',
    canExecute: false,
    primaryDeskPlay: {
      direction: 'SHORT',
      title: 'SHORT desk map',
      summary: 'Short side is the primary review map.',
      lineInSand: 7591,
      longAbove: 7610,
      shortBelow: 7591,
      targetReactionLevel: 7580,
      targetReactionLabel: 'Reaction level',
      targetReactionReason: 'Nearby reaction context.',
      nextTrigger: 'Completed 5M close below 7591.00 required before short continuation is active.',
      invalidation: 'Invalid if price reclaims above the protected 5M MSS swing stop near 7600.50.',
      noChase: 'No chase. Wait for completed 5M proof.',
      htfConflict: false,
      countertrendWarning: null,
      discordEligible: true,
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', currentBias: 'BEAR', biasChangeLine: 7627.5, protectedStructure: 7600.5 },
        ],
      },
      shortBias: {
        state: 'primary',
        scenarioLabel: 'Intraday MSS Micro Continuation',
        decisionQualityScore: 44,
        lineInSand: 7591,
        reason: 'Short review levels are scanner-owned.',
        blockers: ['canExecute=false'],
      },
      longBias: {
        state: 'countertrend_review',
        scenarioLabel: 'Countertrend long review',
        lineInSand: 7610,
        reason: 'Opposite side context only.',
        blockers: ['Countertrend review only.'],
      },
    },
  },
});
const deskPlayWideReviewText = flattenDiscordPayloadText(deskPlayWideReviewPayload);
assert.ok(deskPlayWideReviewText.includes('MES Current Desk Plan'));
assert.ok(deskPlayWideReviewText.includes('Map Side: SHORT 44/100 low'));
assert.ok(deskPlayWideReviewText.includes('Map Role: review map'));
assert.ok(deskPlayWideReviewText.includes('Opposing Side: LONG N/A unavailable'));
assert.ok(deskPlayWideReviewText.includes('Opposing Role: context only'));
assert.ok(deskPlayWideReviewText.includes('Conflict: side quality is low'));
assert.ok(deskPlayWideReviewText.includes('Readiness: watch only - do not execute'));
assert.ok(deskPlayWideReviewText.includes('SHORT BELOW 7591.00'), deskPlayWideReviewText);
assert.ok(deskPlayWideReviewText.includes('Review levels only - not an executable trade plan.'), deskPlayWideReviewText);
assert.ok(deskPlayWideReviewText.includes('Entry: 7581.25'), deskPlayWideReviewText);
assert.ok(deskPlayWideReviewText.includes('Stop: 7600.50'));
assert.ok(deskPlayWideReviewText.includes('T1: 7552.50'));
assert.ok(deskPlayWideReviewText.includes('T2: 7542.75'));
assert.ok(deskPlayWideReviewText.includes('Reason: side quality is low.'));
assert.ok(deskPlayWideReviewText.includes('Bottom line: HTF frames SHORT; needs 5M proof, stop, risk, canExecute. No chase'));
assert.ok(deskPlayWideReviewText.includes('Status: Review levels only - not executable; side quality is low. Wait for completed 5M trigger + canExecute.'));
assert.ok(deskPlayWideReviewPayload.content?.includes('[AM DESK PLAY] MES - SHORT'));
assert.ok(deskPlayWideReviewText.includes('Chart: attached.'));

const lunch = compactDiscordSummary({
  session: 'lunch',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'LUNCH-TEST',
  normalized: { ...normalized, decision: 'SHORT' },
  candidates: [sampleCandidate('SHORT')],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Lunch',
  windowLabel: '12:00-16:00 ET',
  components: buildOutcomeComponents({
    planVersionId: 'LUNCH-TEST',
    sessionType: 'lunch',
    tradeDate: '2026-05-26',
    instrument: 'MES',
    direction: 'SHORT',
  }),
});
assertCompactPayload(lunch, ['chart-plan.png', 'price-level-map.png']);
assert.ok(lunch.content?.includes('[PM REVIEW] MES - SHORT CONDITIONAL / NO FRESH ENTRY'));
assert.deepEqual((lunch.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Short T1 Hit', 'Short T2 Hit', 'Short Runner Hit', 'Short Stretch Hit', 'Short Stopped', 'Scratch', 'No Trade', 'Missed']);
assert.ok(!JSON.stringify(lunch.components).includes('Long T1 Hit'));

const eveningMissedCandidate = sampleCandidate('LONG');
eveningMissedCandidate.setupType = SetupType.TurtleSoup;
eveningMissedCandidate.scenarioLabel = 'Bullish Turtle Soup Reversal - normalized plan not executable';
eveningMissedCandidate.entry = 7552.5;
eveningMissedCandidate.stop = 7546.5;
eveningMissedCandidate.target1 = 7565;
eveningMissedCandidate.target2 = 7570;
eveningMissedCandidate.riskPoints = 6;
eveningMissedCandidate.modelConfidenceScore = 85;
eveningMissedCandidate.requiredTrigger = 'Bullish Turtle Soup: sell-side sweep below 7548.5, reclaim back above the swept low, then confirm upward rejection or expansion.';
eveningMissedCandidate.nextAction = 'Preferred plan: take only the reclaim-confirmed reversal or the retrace after expansion; do not chase the first reversal candle. Risk exceeds standard limit. Human final decision required. Normalized app-owned plan is not executable. Wait for a fresh completed 5M trigger/retest before human review.';
eveningMissedCandidate.invalidation = 'Invalid if price trades below the sweep wick structure stop near 7546.5.';
const eveningMissed = compactDiscordSummary({
  session: 'evening',
  tradeDate: '2026-06-14',
  instrument: 'MES',
  planVersionId: 'EVENING-MISSED-LENGTH',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: eveningMissedCandidate.invalidation,
  },
  candidates: [eveningMissedCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  windowLabel: '18:45-22:15 ET',
  components: buildOutcomeComponents({
    planVersionId: 'EVENING-MISSED-LENGTH',
    sessionType: 'evening',
    tradeDate: '2026-06-14',
    instrument: 'MES',
    direction: 'LONG',
  }),
});
validateDiscordPayload(eveningMissed, ['chart-plan.png', 'price-level-map.png']);
const eveningMissedText = flattenDiscordPayloadText(eveningMissed);
assert.ok(eveningMissedText.length < 1200, `expected evening missed payload under 1200 chars, got ${eveningMissedText.length}`);
assert.ok(eveningMissedText.includes('MES Current Desk Plan'));
assert.ok(eveningMissedText.includes('Primary: 🐂 LONG'));
assert.ok(eveningMissedText.includes('Entry: 7552.50'));
assert.ok(eveningMissedText.includes('Stop: 7546.50'));
assert.ok(eveningMissedText.includes('T1: 7561.50'));
assert.ok(eveningMissedText.includes('T2: 7564.50'));
assert.ok(eveningMissedText.includes('Status: Risk review only; standard risk gate not clean.'));
assert.ok(!eveningMissedText.includes('Trigger:'));
assert.ok(!eveningMissedText.includes('No chase. Wait for completed 5M proof and protected structure.'));

const extensionCandidate = sampleCandidate('LONG');
extensionCandidate.entry = 7603.25;
extensionCandidate.stop = 7599;
extensionCandidate.riskPoints = 4.25;
extensionCandidate.target1 = 7611.75;
extensionCandidate.target2 = 7620;
extensionCandidate.modelConfidenceScore = 98;
extensionCandidate.targetObjectivePlan = {
  ...extensionCandidate.targetObjectivePlan!,
  liquidityTarget1: { ...extensionCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Lunch/PM high', price: 7604.75 },
  liquidityTarget2: { ...extensionCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'London high', price: 7610.5 },
  liquidityRunnerTarget: { ...extensionCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Full ETH high', price: 7632.75 },
};
const extensionPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  planVersionId: 'TARGET-LADDER-TEST',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
    t1: 7609.75,
    t2: 7611.75,
  },
  candidates: [extensionCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
validateDiscordPayload(extensionPayload, ['chart-plan.png', 'price-level-map.png']);
const extensionText = flattenDiscordPayloadText(extensionPayload);
assert.ok(extensionText.includes('MES Current Desk Plan'));
assert.ok(extensionText.includes('Primary: 🐂 LONG'));
assert.ok(extensionText.includes('Entry: 7603.25'));
assert.ok(extensionText.includes('Stop: 7599.00'));
assert.ok(extensionText.includes('T1: 7609.75'));
assert.ok(extensionText.includes('T2: 7611.75'));
assert.ok(extensionText.includes('HTF target: 7632.75 / runner N/A'));
assert.ok(!extensionText.includes('Confidence: 98/100'));
assert.ok(!extensionText.includes('HTF Runner Map:'));
assert.ok(!extensionText.includes('Mgmt: App T1/T2 tactical'));

const insideLongTargetCandidate = sampleCandidate('LONG');
insideLongTargetCandidate.entry = 7407;
insideLongTargetCandidate.stop = 7396.75;
insideLongTargetCandidate.target1 = 7422.5;
insideLongTargetCandidate.target2 = 7427.5;
insideLongTargetCandidate.targetObjectivePlan = {
  ...insideLongTargetCandidate.targetObjectivePlan!,
  nearestLiquidityTarget: { ...insideLongTargetCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Inside long liquidity', price: 7425 },
  liquidityTarget1: { ...insideLongTargetCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Inside long liquidity', price: 7425 },
  liquidityTarget2: { ...insideLongTargetCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Inside long runner', price: 7426.5 },
  liquidityRunnerTarget: null,
  runnerTarget: null,
};
const insideLongPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-12',
  instrument: 'MES',
  planVersionId: 'TARGET-LADDER-INSIDE-LONG',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
    t1: 7422.5,
    t2: 7427.5,
  },
  candidates: [insideLongTargetCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
const insideLongText = flattenDiscordPayloadText(insideLongPayload);
assert.equal(/Runner: Inside long/i.test(insideLongText), false);

const insideShortTargetCandidate = sampleCandidate('SHORT');
insideShortTargetCandidate.entry = 7401.5;
insideShortTargetCandidate.stop = 7425;
insideShortTargetCandidate.target1 = 7366.25;
insideShortTargetCandidate.target2 = 7354.5;
insideShortTargetCandidate.targetObjectivePlan = {
  ...insideShortTargetCandidate.targetObjectivePlan!,
  nearestLiquidityTarget: { ...insideShortTargetCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Inside short liquidity', price: 7360 },
  liquidityTarget1: { ...insideShortTargetCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Inside short liquidity', price: 7360 },
  liquidityTarget2: { ...insideShortTargetCandidate.targetObjectivePlan!.liquidityTarget1!, label: 'Inside short runner', price: 7358 },
  liquidityRunnerTarget: null,
  runnerTarget: null,
};
const insideShortPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-12',
  instrument: 'MES',
  planVersionId: 'TARGET-LADDER-INSIDE-SHORT',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
    t1: 7366.25,
    t2: 7354.5,
  },
  candidates: [insideShortTargetCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
const insideShortText = flattenDiscordPayloadText(insideShortPayload);
assert.equal(/Runner: Inside short/i.test(insideShortText), false);

const scanner = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'SCANNER-TEST',
  normalized,
  candidates: [sampleCandidate('LONG')],
  attachments: { chartPlan: true, priceLevelMap: true, auditLogPath: 'discord-audit/scanner.json' },
  sourceLabel: 'Scanner',
  windowLabel: 'Morning Setup Scanner',
  scoreOverride: 86,
  decisionOverride: 'Conditional',
  statusOverride: 'Conditional',
});
assertCompactPayload(scanner, ['chart-plan.png', 'price-level-map.png']);
assert.ok(scanner.content?.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));

const scannerHtfOppositionCandidate = sampleCandidate('SHORT');
scannerHtfOppositionCandidate.activeRuleset = {
  timeframeMss: {
    applied: true,
    status: 'blocked',
    required: 'aligned_confirmed_5m_mss',
    appliesToAllModels: true,
    affectsExecution: false,
    evidence: ['Active timeframe MSS context aligned on 15M, 240M.'],
    blockers: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
  },
  htfLineInSand: {
    applied: true,
    status: 'blocked',
    required: 'completed_5m_or_15m_close_beyond_htf_line',
    appliesToAllModels: true,
    affectsExecution: false,
    direction: 'SHORT',
    lineInSand: 7302.75,
    lineReason: 'Nearest structured HTF/session support or downside objective in the trade path.',
    requiredClose: 'Completed 5M or 15M close below 7302.75 required before short continuation is active.',
    obstacleType: 'imbalance_zone',
    obstacleSource: 'rth_morning',
    evidence: ['HTF/session line 7302.75 is management context.'],
    blockers: ['No chase: wait for completed proof below HTF/session support.'],
  },
};
const scannerHtfOppositionPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-11',
  instrument: 'MES',
  planVersionId: 'SCANNER-HTF-OPPOSITION',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerHtfOppositionCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Conditional',
});
const scannerHtfOppositionText = flattenDiscordPayloadText(scannerHtfOppositionPayload);
assert.ok(scannerHtfOppositionText.includes('MES Current Desk Plan'));
assert.ok(scannerHtfOppositionText.includes('Bias: 🐻 SHORT into bullish HTF/session structure; manage at reaction level.'));
assert.ok(!scannerHtfOppositionText.includes('HTF Caution:'));
assert.ok(!scannerHtfOppositionText.includes('Treat T1/T2 as management'));

const scannerHtfOppositionExecutableCandidate = sampleCandidate('SHORT');
scannerHtfOppositionExecutableCandidate.activeRuleset = scannerHtfOppositionCandidate.activeRuleset;
scannerHtfOppositionExecutableCandidate.executionStatus = ExecutionStatus.Executable;
const scannerHtfOppositionExecutablePayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-16',
  instrument: 'MES',
  planVersionId: 'SCANNER-HTF-OPPOSITION-EXECUTABLE',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerHtfOppositionExecutableCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
validateDiscordPayload(scannerHtfOppositionExecutablePayload, ['chart-plan.png', 'price-level-map.png']);
const scannerHtfOppositionExecutableText = flattenDiscordPayloadText(scannerHtfOppositionExecutablePayload);
assert.ok(scannerHtfOppositionExecutablePayload.content?.startsWith('🟡 '));
assert.ok(scannerHtfOppositionExecutablePayload.content?.includes('[AM REVIEW] MES - SHORT CONDITIONAL / NO FRESH ENTRY'));
assert.ok(scannerHtfOppositionExecutableText.includes('MES Current Desk Plan'));
assert.ok(scannerHtfOppositionExecutableText.includes('Status: Review only; HTF opposes this side.'));
assert.ok(!scannerHtfOppositionExecutableText.includes('Status: EXECUTABLE'));
assert.ok(!scannerHtfOppositionExecutableText.includes('Executable only while completed 5M trigger + canExecute remain true.'));
assert.ok(!scannerHtfOppositionExecutableText.includes('Plan:'));
assert.ok(!scannerHtfOppositionExecutableText.includes('HTF Runner Map:'));
assert.ok(!scannerHtfOppositionExecutableText.includes('Memory:'));

const scannerReadyCandidate = sampleCandidate('LONG');
scannerReadyCandidate.setupType = SetupType.HtfDrawContinuationAfterRaid;
scannerReadyCandidate.scenarioLabel = 'HTF Draw Continuation After Raid/Reclaim';
scannerReadyCandidate.executionStatus = ExecutionStatus.Executable;
scannerReadyCandidate.candidateState = 'MSS_HOLD_CONFIRMED';
scannerReadyCandidate.evidence = [
  'HTF Draw Continuation After Raid/Reclaim candidate detected. Execution still requires deterministic entry, stop, target, risk, and final pipeline gates.',
];
scannerReadyCandidate.nextAction = 'Execution still requires final app-owned gates.';
scannerReadyCandidate.htfLiquidityDrawState = htfStateFixture(false) as HtfLiquidityDrawState;
const scannerReadyPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-01',
  instrument: 'MES',
  planVersionId: 'HTF-SCANNER-READY',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerReadyCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Executable',
});
validateDiscordPayload(scannerReadyPayload, ['chart-plan.png', 'price-level-map.png']);
const scannerReadyText = flattenDiscordPayloadText(scannerReadyPayload);
assert.ok(scannerReadyText.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));
assert.ok(scannerReadyText.includes('MES Current Desk Plan'));
assert.ok(scannerReadyText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(scannerReadyText.includes('HTF context: sufficient; reliability structural.'));
assert.ok(!scannerReadyText.includes('Trigger State: MSS_HOLD_CONFIRMED'));
assert.ok(!scannerReadyText.includes('HTF Context:'));
assert.ok(!scannerReadyText.includes('Minimum: 30 calendar days when available'));
assert.ok(!scannerReadyText.includes('Usage: structural confirmation allowed'));
assert.ok(scannerReadyPayload.content?.startsWith('🟡'), 'canExecute=false must prevent green executable Discord status even with override');
assert.equal(/APPROVED|EXECUTABLE/i.test(scannerReadyPayload.content || ''), false, 'normalized canExecute=false must not allow approved/executable headline text');
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(scannerReadyText), false);

const openingDriveHumanReviewCandidate = sampleCandidate('SHORT');
openingDriveHumanReviewCandidate.setupType = SetupType.OpeningDriveFvgContinuation;
openingDriveHumanReviewCandidate.scenarioLabel = 'Opening Drive FVG Continuation';
openingDriveHumanReviewCandidate.executionStatus = ExecutionStatus.Conditional;
openingDriveHumanReviewCandidate.candidateState = 'HUMAN_REVIEW_READY';
openingDriveHumanReviewCandidate.entry = 7518;
openingDriveHumanReviewCandidate.stop = 7522;
openingDriveHumanReviewCandidate.target1 = 7512;
openingDriveHumanReviewCandidate.target2 = 7510;
openingDriveHumanReviewCandidate.requiredTrigger = 'Human-review short: 15M bearish opening displacement, completed 5M bearish MSS/displacement, bearish 5M FVG retest/mitigation during 10:00-11:00 ET.';
openingDriveHumanReviewCandidate.humanReview = {
  status: 'HumanReviewReady',
  canExecute: false,
  requiresTraderConfirmation: true,
  discordTradePlanEligible: true,
  reason: 'Opening-drive FVG continuation is structurally qualified for human review.',
};
const openingDrivePayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-05',
  instrument: 'MES',
  planVersionId: 'OPENING-DRIVE-FVG-HUMAN-REVIEW',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [openingDriveHumanReviewCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Conditional',
});
validateDiscordPayload(openingDrivePayload, ['chart-plan.png', 'price-level-map.png']);
const openingDriveText = flattenDiscordPayloadText(openingDrivePayload);
assert.ok(openingDriveText.includes('Status: Human review only; trader confirmation + canExecute required.'));
assert.ok(!openingDriveText.includes('Review: HumanReviewReady'));
assert.ok(!openingDriveText.includes('Human review required. Decision-support plan only.'));
assert.ok(!openingDriveText.includes('Trader must confirm entry before action.'));
assert.ok(openingDriveText.includes('Entry: 7518.00'));
assert.ok(openingDriveText.includes('Stop: 7522.00'));
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(openingDriveText), false);

const scannerRetestPendingCandidate = sampleCandidate('SHORT');
scannerRetestPendingCandidate.setupType = SetupType.HtfDisplacementMssContinuation;
scannerRetestPendingCandidate.scenarioLabel = 'HTF Displacement + 5M MSS Continuation';
scannerRetestPendingCandidate.executionStatus = ExecutionStatus.Conditional;
scannerRetestPendingCandidate.candidateState = 'MSS_CONTINUATION_RETEST_PENDING';
scannerRetestPendingCandidate.requiredTrigger = 'Fresh short requires completed 5M retest/rejection below the decision level, or a new completed 5M bearish continuation close.';
scannerRetestPendingCandidate.nextAction = 'MSS_CONTINUATION_RETEST_PENDING. Wait for completed 5M retest/rejection below the decision level.';
const scannerRetestPendingPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-05',
  instrument: 'MES',
  planVersionId: 'HTF-MSS-RETEST-PENDING',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerRetestPendingCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
validateDiscordPayload(scannerRetestPendingPayload, ['chart-plan.png', 'price-level-map.png']);
const scannerRetestPendingText = flattenDiscordPayloadText(scannerRetestPendingPayload);
assert.ok(scannerRetestPendingText.includes('MES Current Desk Plan'));
assert.ok(scannerRetestPendingText.includes('Next trigger:'));
assert.ok(scannerRetestPendingText.includes('completed 5M retest/rejection below the decision level'));
assert.ok(scannerRetestPendingText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.ok(!scannerRetestPendingText.includes('Trigger State: MSS_CONTINUATION_RETEST_PENDING'));
assert.ok(scannerRetestPendingText.length < 1400, `expected retest-pending scanner payload under 1400 chars, got ${scannerRetestPendingText.length}`);
assert.equal(/EXECUTABLE -|Trade now|Entry confirmed|Take the trade|Enter now|Sell now|Trade approved/i.test(scannerRetestPendingText), false);

const dataLimitedScannerCandidate = sampleCandidate('LONG');
dataLimitedScannerCandidate.setupType = SetupType.HtfDrawContinuationAfterRaid;
dataLimitedScannerCandidate.scenarioLabel = 'HTF Draw Continuation After Raid/Reclaim';
dataLimitedScannerCandidate.executionStatus = ExecutionStatus.Conditional;
dataLimitedScannerCandidate.htfLiquidityDrawState = htfStateFixture(true) as HtfLiquidityDrawState;
dataLimitedScannerCandidate.requiredTrigger = 'Wait for sufficient HTF context and completed 5M trigger.';
const dataLimitedScannerPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-01',
  instrument: 'MES',
  planVersionId: 'HTF-DATA-LIMITED',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [dataLimitedScannerCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
});
validateDiscordPayload(dataLimitedScannerPayload, ['chart-plan.png', 'price-level-map.png']);
const dataLimitedScannerText = flattenDiscordPayloadText(dataLimitedScannerPayload);
assert.ok(dataLimitedScannerText.includes('MES Current Desk Plan'));
assert.ok(dataLimitedScannerText.includes('Bias: 🐂 HTF data-limited; use 5M execution proof only.'));
assert.ok(dataLimitedScannerText.includes('HTF context: insufficient; reliability data_limited.'));
assert.ok(!dataLimitedScannerText.includes('HTF Context:'));
assert.ok(!dataLimitedScannerText.includes('Minimum: 30 calendar days when available'));
assert.ok(!dataLimitedScannerText.includes('Candidate Promotion: blocked by data-limited HTF context'));
assert.equal(/HTF conflict confirmed|Bullish structure confirmed|Bearish structure confirmed|Candidate ready|structural confirmation allowed/i.test(dataLimitedScannerText), false);
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(dataLimitedScannerText), false);

const failedPlanReversalCandidate = sampleCandidate('SHORT');
failedPlanReversalCandidate.setupType = SetupType.FailedPlanReversal;
failedPlanReversalCandidate.scenarioLabel = 'Failed Plan Reversal';
failedPlanReversalCandidate.pathway = 'failed_plan_reversal';
failedPlanReversalCandidate.candidateState = 'OPPOSITE_SIDE_TRIGGER_CONFIRMED';
failedPlanReversalCandidate.executionStatus = ExecutionStatus.Executable;
failedPlanReversalCandidate.entry = 7517.75;
failedPlanReversalCandidate.stop = 7520.75;
failedPlanReversalCandidate.target1 = 7513.25;
failedPlanReversalCandidate.target2 = 7511.75;
failedPlanReversalCandidate.riskPoints = 3;
failedPlanReversalCandidate.riskAdvisoryStatus = 'RISK_WITHIN_STANDARD_LIMIT';
failedPlanReversalCandidate.failedPlanReversal = {
  source: 'ninjatrader_ohlc',
  boundary: 'opposite_side_review_only_not_execution_authority',
  originalPlanDirection: 'LONG',
  oppositeDirection: 'SHORT',
  failedDecisionLevel: 7518,
  failedDecisionLevelRole: 'short_side_resistance',
  failedPlanEvidence: ['Long plan failed below 7518.'],
  htfStackStatus: 'full_confirmation',
  timeframeConfirmations: [
    { timeframe: '15M', direction: 'SHORT', status: 'confirmed', evidence: ['15M bearish MSS.'] },
    { timeframe: '1H', direction: 'SHORT', status: 'confirmed', evidence: ['1H bearish MSS.'] },
    { timeframe: '2H', direction: 'SHORT', status: 'confirmed', evidence: ['2H bearish structure.'] },
    { timeframe: '4H', direction: 'SHORT', status: 'confirmed', evidence: ['4H bearish structure.'] },
    { timeframe: '5M', direction: 'SHORT', status: 'confirmed', evidence: ['5M trigger confirmed.'] },
  ],
  fiveMinuteTriggerStatus: 'confirmed',
  decisionState: 'OPPOSITE_SIDE_TRIGGER_CONFIRMED',
  freshTriggerRequired: true,
  staleOrNoFreshEntry: false,
  reasons: ['Fresh 5M retest confirmed.'],
  blockers: [],
  createsCandidate: true,
  approvesExecution: false,
};
const failedPlanPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-05',
  instrument: 'MES',
  planVersionId: 'FAILED-PLAN-REVERSAL',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'SHORT',
    noTradeReason: null,
    invalidation: 'Invalid if price reclaims above failed decision level.',
  },
  candidates: [failedPlanReversalCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Executable',
});
validateDiscordPayload(failedPlanPayload, ['chart-plan.png', 'price-level-map.png']);
const failedPlanText = flattenDiscordPayloadText(failedPlanPayload);
assert.ok(failedPlanPayload.content?.includes('[AM REVIEW] MES - SHORT CONDITIONAL / NO FRESH ENTRY'));
assert.ok(failedPlanText.includes('MES Current Desk Plan'));
assert.ok(failedPlanText.includes('Primary: 🐻 SHORT'));
assert.ok(failedPlanText.includes('Entry: 7517.75'));
assert.ok(failedPlanText.includes('Stop: 7520.75'));
assert.ok(failedPlanText.includes('T1: 7513.25'));
assert.ok(failedPlanText.includes('T2: 7511.75'));
assert.ok(!failedPlanText.includes('Failed Plan Reversal:'));
assert.ok(!failedPlanText.includes('Boundary: decision support only; not execution approval.'));
assert.equal(/EXECUTABLE -|Trade now|Take the trade|Trade approved/i.test(failedPlanText), false);

const rawConditionalCanExecutePayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-01',
  instrument: 'MES',
  planVersionId: 'RAW-CONDITIONAL-CANEXECUTE',
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    decision: 'LONG',
    noTradeReason: null,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [scannerReadyCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  statusOverride: 'Executable',
});
validateDiscordPayload(rawConditionalCanExecutePayload, ['chart-plan.png', 'price-level-map.png']);
const rawConditionalText = flattenDiscordPayloadText(rawConditionalCanExecutePayload);
assert.ok(rawConditionalCanExecutePayload.content?.startsWith('🟡'), 'ConditionalTrade with raw canExecute=true must remain yellow/non-executable');
assert.ok(rawConditionalText.includes('Status: Review only until 5M trigger + canExecute.'));
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(rawConditionalText), false);

const riskTooWideCandidate = sampleCandidate('LONG');
riskTooWideCandidate.setupType = SetupType.TurtleSoup;
riskTooWideCandidate.scenarioLabel = 'Turtle Soup LONG';
riskTooWideCandidate.entry = 7597;
riskTooWideCandidate.stop = 7588.75;
riskTooWideCandidate.target1 = 7620;
riskTooWideCandidate.target2 = 7620;
riskTooWideCandidate.riskPoints = 8.25;
riskTooWideCandidate.blockReason = NoTradeReason.RiskTooWide;
riskTooWideCandidate.executionStatus = ExecutionStatus.Conditional;
riskTooWideCandidate.requiredTrigger = 'Wait for a fresh completed 5M retest that keeps risk inside limits.';
riskTooWideCandidate.nextAction = 'Manual decision only. Do not chase the reclaim candle.';
riskTooWideCandidate.evidence = [
  'Sell-side sweep at 10:50.',
  'Reclaim at 10:55.',
  'HTF stack aligned LONG: 4H / 1H / 15M / 5M.',
  'Target room toward 7620.',
];
const riskTooWideBefore = JSON.stringify(riskTooWideCandidate);
const riskTooWidePayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  planVersionId: 'RISK-WIDE-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: NoTradeReason.RiskTooWide,
    invalidation: 'Invalid if protected structure fails.',
  },
  candidates: [riskTooWideCandidate],
  attachments: { chartPlan: true, priceLevelMap: true },
  sourceLabel: 'Scanner',
  decisionOverride: 'Conditional',
  statusOverride: 'Conditional',
  components: buildOutcomeComponents({
    planVersionId: 'RISK-WIDE-TEST',
    sessionType: 'morning',
    tradeDate: '2026-05-29',
    instrument: 'MES',
    direction: 'LONG',
  }),
});
validateDiscordPayload(riskTooWidePayload, ['chart-plan.png', 'price-level-map.png']);
assert.equal(JSON.stringify(riskTooWideCandidate), riskTooWideBefore, 'risk advisory formatter must not mutate the candidate');
const riskTooWideText = flattenDiscordPayloadText(riskTooWidePayload);
assert.ok(riskTooWideText.includes('MES Current Desk Plan'));
assert.ok(riskTooWideText.includes('Status: Risk review only; standard risk gate not clean.'));
assert.ok(!riskTooWideText.includes('Risk Advisory:'));
assert.ok(!riskTooWideText.includes('Risk Score:'));
assert.ok(!riskTooWideText.includes('Risk exceeds standard limit. Human final decision required.'));
assert.equal(riskTooWideText.includes('Not app-approved executable.'), false);
assert.ok(!riskTooWideText.includes('Do not chase'));
assert.ok(!/ApprovedTrade|Trade now|Entry confirmed/i.test(riskTooWideText));
assert.ok(riskTooWidePayload.components);
assert.deepEqual(
  (riskTooWidePayload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)),
  ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']
);

const noTrade = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-05-26',
  instrument: 'MES',
  planVersionId: 'NO-TRADE-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    decision: 'WAIT',
    noTradeReason: 'No completed 5M trigger inside the active window.',
    invalidation: null,
  },
  candidates: [],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Morning',
});
validateDiscordPayload(noTrade, []);
const noTradeText = flattenDiscordPayloadText(noTrade);
assert.ok(noTradeText.includes('[AM REVIEW] MES - NO TRADE'));
assert.ok(noTradeText.includes('Reason: No completed 5M trigger inside the active window.'));
assert.ok(noTradeText.includes('Key Levels:'));
assert.ok(noTradeText.includes('Action:'));
assert.ok(noTradeText.includes('Stand down. Recheck at next scheduled scan.'));
assert.ok(!noTradeText.includes('Plan:'));

const conditionalReplayCandidate = sampleCandidate('SHORT');
conditionalReplayCandidate.setupType = SetupType.IntradayMssMicroContinuation;
conditionalReplayCandidate.scenarioLabel = 'Intraday MSS Micro Continuation';
conditionalReplayCandidate.entry = 7362.5;
conditionalReplayCandidate.stop = null;
conditionalReplayCandidate.target1 = null;
conditionalReplayCandidate.target2 = null;
conditionalReplayCandidate.riskPoints = null;
conditionalReplayCandidate.requiredTrigger = 'Human-review short: completed bearish 5M MSS plus bearish 15M MSS/displacement context, then completed close-through/retest below 7384.00.';
conditionalReplayCandidate.nextAction = 'Intraday MSS micro-continuation watch. No chase. Completed 5M bearish MSS close-through/retest confirmed; protected stop still required.';
conditionalReplayCandidate.missingEvidence = ['Protected 5M retest swing stop is not confirmed.'];
conditionalReplayCandidate.activeRuleset = {
  htfLineInSand: {
    applied: true,
    status: 'passed',
    required: 'completed_5m_or_15m_close_beyond_htf_line',
    appliesToAllModels: true,
    affectsExecution: false,
    direction: 'SHORT',
    lineInSand: 7384,
    lineReason: 'Completed 5M close-through/retest below bearish MSS line.',
    requiredClose: 'Short needs a completed 5M close/retest hold below 7384.00.',
    obstacleType: 'swing',
    obstacleSource: 'ninjatrader',
    evidence: ['Line in the sand came from OHLC-derived 5M structure.'],
    blockers: [],
  },
};
const conditionalReplayPayload = compactDiscordSummary({
  session: 'morning',
  tradeDate: '2026-06-09',
  instrument: 'MES',
  planVersionId: 'CONDITIONAL-REPLAY-TEST',
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    decision: 'NO TRADE',
    noTradeReason: null,
    invalidation: 'Do not execute until entry and protected stop are defined.',
  },
  candidates: [conditionalReplayCandidate],
  attachments: { chartPlan: false, priceLevelMap: false },
  sourceLabel: 'Morning',
});
validateDiscordPayload(conditionalReplayPayload, []);
const conditionalReplayText = flattenDiscordPayloadText(conditionalReplayPayload);
assert.ok(conditionalReplayText.includes('[AM REVIEW] MES - SHORT CONDITIONAL / NO FRESH ENTRY'));
assert.ok(conditionalReplayText.includes('Line in the Sand:'));
assert.ok(conditionalReplayText.includes('7384.00'));
assert.ok(conditionalReplayText.includes('Missing Proof:'));
assert.ok(conditionalReplayText.includes('Protected 5M structure stop not confirmed.'));
assert.ok(conditionalReplayText.includes('Protected 5M retest swing stop is not confirmed.'));
assert.ok(conditionalReplayText.includes('No chase. Wait for completed 5M proof and protected structure.'));
assert.ok(!conditionalReplayText.includes('No active plan candidate available.'));
assert.ok(!conditionalReplayText.includes('Stand down. Recheck at next scheduled scan.'));
assert.ok(!/EXECUTABLE -|Trade now|Entry confirmed/i.test(conditionalReplayText));

const watchlist = morningWatchlistDiscordSummary({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  watchlist: {
    watchlistDetected: true,
    watchlistType: 'morning_continuation_watchlist',
    direction: 'LONG',
    status: 'WATCH_ONLY',
    canExecute: false,
    freshEntryAvailable: false,
    tradeAlertEligible: false,
    reason: 'Strong bullish continuation is developing, but no fresh entry remains under current approved rules.',
    noChaseWarning: true,
    requiredNextCondition: 'Wait for a completed 5M pullback or retest that passes existing approved rules.',
    memoryEligible: true,
    evidence: ['Strong bullish displacement detected after the open.'],
    missingEvidence: ['No safe fresh structure stop is available from this watchlist event.'],
    auditWarnings: ['Advisory only.'],
    approvalBoundary: {
      watchlistApprovesTrade: false,
      watchlistChangesRules: false,
      watchlistCreatesEntry: false,
      watchlistCreatesTargets: false,
      watchlistOverridesScanner: false,
    },
  },
});
validateDiscordPayload(watchlist, []);
const watchlistText = flattenDiscordPayloadText(watchlist);
assert.ok(watchlistText.includes('[AM WATCHLIST] MES - LONG DEVELOPING'));
assert.ok(watchlistText.includes('WATCH ONLY - NO FRESH ENTRY'));
assert.ok(watchlistText.includes('DO NOT CHASE'));
assert.ok(watchlistText.includes('Wait for a completed 5M pullback or retest that passes existing current rules.'));
assert.ok(watchlistText.includes('Watch only. No entry until current rules confirm.'));
assert.ok(!/^Entry:/m.test(watchlistText));
assert.ok(!/^Stop:/m.test(watchlistText));
assert.ok(!/^T1:/m.test(watchlistText));
assert.ok(!/^T2:/m.test(watchlistText));
assert.ok(!/Risk:|R\/R|risk\/reward ladder/i.test(watchlistText));
assert.ok(!/Approved|Executable|Trade now|Entry confirmed/i.test(watchlistText));
assert.equal(watchlist.components, undefined);
assert.equal(JSON.stringify(watchlist).includes('Win'), false);
assert.equal(JSON.stringify(watchlist).includes('Loss'), false);
assert.equal(JSON.stringify(watchlist).includes('Scratch'), false);

assert.equal(shouldSendScannerHealthAlert('READY', 'READY'), false);
assert.equal(shouldSendScannerHealthAlert('DEGRADED', 'DEGRADED'), false);
assert.equal(shouldSendScannerHealthAlert('BLOCKED', 'BLOCKED'), false);
assert.equal(shouldSendScannerHealthAlert('READY', 'DEGRADED'), true);
assert.equal(shouldSendScannerHealthAlert('DEGRADED', 'BLOCKED'), true);
assert.equal(shouldSendScannerHealthAlert('BLOCKED', 'READY'), true);
assert.equal(shouldSendScannerHealthAlert(null, 'READY'), false);
assert.equal(shouldSendScannerHealthAlert(undefined, 'DEGRADED'), true);
assert.equal(shouldSendScannerHealthAlert(undefined, 'BLOCKED'), true);

const healthBase = {
  config: {
    appInstrument: 'MES',
    bridgeInstrument: 'MES 06-26',
    timestampMode: 'close',
    barTimeZone: 'eastern',
    discordEnabled: true,
    dryRun: false,
    macroCalendarEnabled: true,
    maxStaleBarMinutes: 10,
  },
  bridgeHealth: { ok: true, defaultInstrument: 'MES 06-26' },
  bridgeReachable: true,
  latestCompleted5mBar: { time: '2026-05-28T10:00:00-04:00', open: 7500, high: 7510, low: 7498, close: 7508, volume: 1000 },
  barStaleness: { stale: false, latestTime: '2026-05-28T10:00:00-04:00', ageMinutes: 2, maxAllowedMinutes: 10, reason: null },
  discordWebhookConfigured: true,
  marketMapStatus: { loaded: true, usableBars: 400, fallbackBridgeDataAvailable: true },
  completedFiveMinuteBarAssurance: {
    status: 'ready' as const,
    message: 'Completed 5M Bar Assurance Gate ready: latest completed 5M bar is usable.',
    latestCompletedTime: '2026-05-28T10:00:00-04:00',
    expectedCompletedTime: '2026-05-28T10:00:00-04:00',
    sourceSummary: 'live 5M bars=30; history 5M=6000 from market_bars_bridge_repair',
    recoverySteps: [],
  },
  scannerStateFileStatus: { status: 'ok' as const },
  macroCalendarStatus: { enabled: true, loaded: true },
};

const readyHealth = evaluateScannerHealth(healthBase);
const readyHealthBefore = JSON.stringify(readyHealth);
const readyHealthPayload = scannerHealthDiscordSummary({
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  dryRun: false,
  report: readyHealth,
});
validateDiscordPayload(readyHealthPayload, []);
const readyHealthText = flattenDiscordPayloadText(readyHealthPayload);
assert.ok(readyHealthText.includes('[SCANNER HEALTH] MES - READY'));
assert.ok(readyHealthText.includes('Status: Alerts can be trusted'));
assert.ok(readyHealthText.includes('Action: Scanner recovered. Trade/watchlist alerts may resume.'));
assert.equal(JSON.stringify(readyHealth), readyHealthBefore);

const degradedHealth = evaluateScannerHealth({
  ...healthBase,
  macroCalendarStatus: { enabled: true, unavailable: true, message: 'Macro calendar unavailable' },
});
const degradedPayload = scannerHealthDiscordSummary({
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  dryRun: false,
  report: degradedHealth,
});
validateDiscordPayload(degradedPayload, []);
const degradedText = flattenDiscordPayloadText(degradedPayload);
assert.ok(degradedText.includes('[SCANNER HEALTH] MES - DEGRADED'));
assert.ok(degradedText.includes('Status: Alerts allowed with caution'));
assert.ok(degradedText.includes('Warnings:'));
assert.ok(degradedText.includes('Macro calendar unavailable'));
assert.ok(degradedText.includes('Action: Scanner continues. Review warnings if alerts look unusual.'));

const blockedHealth = evaluateScannerHealth({
  ...healthBase,
  bridgeReachable: false,
  bridgeHealth: { ok: false, error: 'Bridge unreachable' },
  latestCompleted5mBar: null,
  barStaleness: { stale: true, latestTime: null, ageMinutes: null, maxAllowedMinutes: 10, reason: 'Latest completed 5M candle is stale' },
});
const blockedPayload = scannerHealthDiscordSummary({
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  dryRun: false,
  report: blockedHealth,
});
validateDiscordPayload(blockedPayload, []);
const blockedText = flattenDiscordPayloadText(blockedPayload);
assert.ok(blockedText.includes('[SCANNER HEALTH] MES - BLOCKED'));
assert.ok(blockedText.includes('Status: Trade/watchlist alerts suppressed'));
assert.ok(blockedText.includes('Blocking reasons:'));
assert.ok(blockedText.includes('Bridge unreachable'));
assert.ok(blockedText.includes('Action: Fix NinjaTrader/bridge/data issue, then restart or wait for recovery.'));

for (const payload of [readyHealthPayload, degradedPayload, blockedPayload]) {
  const text = flattenDiscordPayloadText(payload);
  assert.equal(payload.components, undefined);
  assert.ok(!/^Entry:/m.test(text));
  assert.ok(!/^Stop:/m.test(text));
  assert.ok(!/^T1:/m.test(text));
  assert.ok(!/^T2:/m.test(text));
  assert.ok(!/risk\/reward ladder|Win|Loss|Scratch|ApprovedTrade|Executable trade|Trade now|Entry confirmed/i.test(text));
}

assert.equal(
  compactAttachmentLine({ chartPlan: true, priceLevelMap: false }, true),
  'Details: Chart attached; Level Map unavailable.'
);
assert.equal(
  compactAttachmentLine({ chartPlan: false, priceLevelMap: true }, true),
  'Details: Price Level Map attached. Chart Plan unavailable.'
);
assert.equal(
  compactAttachmentLine({ chartPlan: false, priceLevelMap: false }, true),
  'Details: Visuals unavailable; review local logs before action.'
);
assert.equal(
  compactAttachmentLine({ chartPlan: false, priceLevelMap: false }, false),
  'Details: Visual attachments not generated because no active plan candidate was available.'
);

const originalConsoleWarn = console.warn;
const capturedSingleChartWarnings: string[] = [];
console.warn = (...args: unknown[]) => {
  capturedSingleChartWarnings.push(args.map(String).join(' '));
};
try {
  validateDiscordPayload({
    username: 'Quant Desk',
    content: 'MES Current Desk Plan',
    embeds: [{
      title: 'MES Current Desk Plan',
      description: [
        'Primary: 🛑 WAIT',
        'Bias: No HTF-supported directional play confirmed.',
        'Line in sand: 7410.00',
        '',
        'LONG ABOVE 7410.00',
        'Entry: pending',
        'Stop: pending',
        'T1: pending',
        'T2: pending',
        '',
        'Invalid below: pending',
        'HTF target: N/A / runner N/A',
        '',
        'Status: Review only until 5M trigger + canExecute.',
        'Chart: attached.',
      ].join('\n'),
      color: 0,
      fields: [],
      footer: { text: 'Quant Desk' },
      timestamp: new Date().toISOString(),
    }],
    components: buildOutcomeComponents({
      planVersionId: 'CURRENT-DESK-PLAN-SINGLE-CHART-TEST',
      sessionType: 'morning',
      tradeDate: '2026-06-15',
      instrument: 'MES',
      direction: null,
    }),
  }, ['desk-play-chart.png']);
} finally {
  console.warn = originalConsoleWarn;
}
assert.equal(capturedSingleChartWarnings.length, 0);

assert.throws(() => validateDiscordPayload({
  username: 'Quant Desk',
  content: 'Bad payload',
  embeds: [{
    title: 'Compact Trade Plan Summary',
    description: 'Missing rea...',
    color: 0,
    fields: [],
    footer: { text: 'Quant Desk' },
    timestamp: new Date().toISOString(),
  }],
}), /truncation artifact/);

for (const marker of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
  assert.throws(() => validateDiscordPayload({
    username: 'Quant Desk',
    content: 'Bad payload',
    embeds: [{
      title: 'Compact Trade Plan Summary',
      description: `Old report leaked into the compact alert:\n${marker}`,
      color: 0,
      fields: [],
      footer: { text: 'Quant Desk' },
      timestamp: new Date().toISOString(),
    }],
  }), /old long-form scanner card section/);
}

assert.throws(() => validateDiscordPayload({
  username: 'Quant Desk',
  content: 'Bad payload',
  embeds: [{
    title: 'Compact Trade Plan Summary',
    description: 'Counte...',
    color: 0,
    fields: [],
    footer: { text: 'Quant Desk' },
    timestamp: new Date().toISOString(),
  }],
}), /truncation artifact/);

console.log('Discord compact alert formatter verified.');

if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
