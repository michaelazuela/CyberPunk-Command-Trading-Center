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
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../../src/types';
import { evaluateScannerHealth } from '../../src/agents/scannerHealthAgent';
import type { HtfLiquidityDrawState } from '../../src/lib/htfLiquidityDrawEngine';

const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

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
  assert.ok(text.includes('Compact Trade Plan Summary'));
  assert.ok(text.includes('Status:'));
  assert.ok(text.includes('Memory:'));
  assert.ok(text.includes('History: Neutral'));
  assert.ok(text.includes('Warning: none'));
  assert.ok(text.includes('Action:'));
  assert.ok(text.includes('Details: Chart + Level Map attached.'));
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
assert.ok(flattenDiscordPayloadText(morning).includes('Risk: 4.00 pts / N/A'));
assert.ok(flattenDiscordPayloadText(morning).includes('Targets:'));
assert.ok(flattenDiscordPayloadText(morning).includes('T1: 5326.00 - scale/secure'));
assert.ok(flattenDiscordPayloadText(morning).includes('T2: 5328.00 - base exit'));
assert.ok(flattenDiscordPayloadText(morning).includes('Runner: 5329.00 - extension if T2 clears'));
assert.ok(flattenDiscordPayloadText(morning).includes('HTF reaction: NY premarket high 5329.00'));
assert.ok(flattenDiscordPayloadText(morning).includes('Next 5M map: LONG above 5320.00 / SHORT below 5316.00.'));
assert.ok(flattenDiscordPayloadText(morning).includes('Invalidation:'));
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
        reason: 'Short is counter-HTF review only.',
        blockers: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
      },
    },
  },
});
const deskPlayText = flattenDiscordPayloadText(deskPlayPayload);
assert.ok(deskPlayPayload.content?.includes('[PM DESK PLAY] MES - LONG'));
assert.deepEqual((deskPlayPayload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)), ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);
assert.ok(deskPlayText.includes('Scanner Desk Play'));
assert.ok(deskPlayText.includes('Status: REVIEW ONLY - NOT EXECUTION'));
assert.ok(deskPlayText.includes('HTF Bias Lines'));
assert.ok(deskPlayText.includes('4H: BULL now | line 7271.75 | changes BEAR below 7271.75 | confirm close+hold below | target 7428.75'));
assert.ok(deskPlayText.includes('2H: BULL now | line 7288.25 | changes BEAR below 7288.25 | confirm close+hold below | target 7410.00'));
assert.ok(deskPlayText.includes('1H: BULL now | line 7303.50 | changes BEAR below 7303.50 | confirm close+hold below | target N/A'));
assert.ok(deskPlayText.includes('15M: BULL now | line 7342.00 | changes BEAR below 7342.00 | confirm close+hold below | target 7410.00'));
assert.ok(deskPlayText.includes('5M: BULL now | line 7271.75 | changes BEAR below 7271.75 | confirm close+hold below | target 7392.50'));
assert.ok(deskPlayText.includes('Reliability: structural; 5M still controls execution.'));
assert.ok(deskPlayText.includes('SHORT: Manage, do not press'));
assert.ok(deskPlayText.includes('Short ran into HTF support: 7288.25'));
assert.ok(deskPlayText.includes('Confidence: 58/100 medium'));
assert.ok(deskPlayText.includes('HTF reaction: London Session Low 7288.25 | 15M/60M/120M | strength strong'));
assert.ok(deskPlayText.includes('Take profit into 7288.25'));
assert.ok(deskPlayText.includes('No fresh short unless price accepts below 7303.50'));
assert.ok(deskPlayText.includes('LONG ABOVE 7342.00'));
assert.ok(deskPlayText.includes('Confidence: 82/100 high'));
assert.ok(deskPlayText.includes('HTF reaction: 15M bullish imbalance top 7342.00 | 15M | strength moderate'));
assert.ok(deskPlayText.includes('Levels withheld until scanner-owned entry and protected 5M stop proof exist.'));
assert.ok(!deskPlayText.includes('Entry ref: 7312.00'));
assert.ok(!deskPlayText.includes('Stop: 7271.75'));
assert.ok(!deskPlayText.includes('Risk: 40.25 pts'));
assert.ok(!deskPlayText.includes('T1: 7372.50'));
assert.ok(!deskPlayText.includes('T2: 7392.50'));
assert.ok(deskPlayText.includes('HTF Runner Map'));
assert.ok(deskPlayText.includes('App targets: T1 7372.50 / T2 7392.50'));
assert.ok(deskPlayText.includes('Next draw: Prior RTH high 7410.00 2.4R'));
assert.ok(deskPlayText.includes('Runner: Full ETH high 7428.75 2.9R'));
assert.ok(deskPlayText.includes('App T1/T2 remain tactical'));
assert.ok(deskPlayText.includes('Trigger:'));
assert.ok(deskPlayText.includes('Trigger: completed 5M close/retest above 7342.00.'));
assert.ok(deskPlayText.includes('Invalid:'));
assert.ok(deskPlayText.includes('Invalid: LONG fails below 7342.00'));
assert.ok(deskPlayText.includes('Chart: watch chart attached; levels withheld until protected structure is proven.'));
assert.ok(deskPlayText.includes('Boundary: no approval/canExecute change.'));
assert.ok(!deskPlayText.includes('Current Play:'));
assert.ok(!deskPlayText.includes('HTF/Structure:'));
assert.ok(!deskPlayText.includes('Decision Map:'));
assert.ok(!deskPlayText.includes('Level Transition:'));
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
    discordAction: 'hold',
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
        reason: 'Short review has app-owned entry/stop math available.',
        blockers: ['canExecute=false'],
      },
    },
  },
});
const deskPlayDecisionMapText = flattenDiscordPayloadText(deskPlayDecisionMapPayload);
assert.ok(deskPlayDecisionMapPayload.content?.includes('[PM DESK PLAY] MES - WAIT'));
assert.ok(deskPlayDecisionMapText.includes('HTF Bias Lines'));
assert.ok(deskPlayDecisionMapText.includes('4H: BEAR now | line 7423.75 | changes BULL above 7423.75 | confirm close+hold above | target 7460.00'));
assert.ok(deskPlayDecisionMapText.includes('15M: BEAR now | line 7440.25 | changes BULL above 7440.25 | confirm close+hold above | target 7318.75'));
assert.ok(deskPlayDecisionMapText.includes('5M: BULL now | line 7350.25 | changes BEAR below 7350.25 | confirm close+hold below | target 7318.75'));
assert.ok(deskPlayDecisionMapText.includes('Review Map:'));
assert.ok(deskPlayDecisionMapText.includes('SHORT BELOW 7342.00 | Entry 7339.75 | Stop 7350.25 | T1 7324.00 | T2 7318.75'));
assert.ok(deskPlayDecisionMapText.includes('Trigger: LONG above 7342.00 / SHORT below 7342.00; completed 5M close/retest only.'));
assert.ok(!deskPlayDecisionMapText.includes('Bearish Failed Breakout Reversal'));
assert.ok(!deskPlayDecisionMapText.includes('reclaim back below t...'));
assert.ok(deskPlayDecisionMapText.includes('Need: protected 5M shift + canExecute.'));
assert.equal(deskPlayDecisionMapText.includes('No HTF-supported directional play is confirmed'), false);
assert.equal(deskPlayDecisionMapText.includes('Status: review-only map; no HTF-supported active play.'), false);
assert.ok(!deskPlayDecisionMapPayload.content?.includes('[PM DESK PLAY] MES - SHORT'));

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
assert.ok(invalidDeskMapText.includes('LONG ABOVE 7410.00 | levels pending'));
assert.ok(invalidDeskMapText.includes('SHORT BELOW 7437.50 | levels pending'));
assert.ok(!invalidDeskMapText.includes('LONG ABOVE 7410.00 | Entry 7426.50'));
assert.ok(!invalidDeskMapText.includes('SHORT BELOW 7437.50 | Entry 7441.00'));
assert.ok(!invalidDeskMapText.includes('Stop 7433.00 | T1 7429.00 | T2 7425.00'));

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
assert.ok(deskPlaySupportedShortText.includes('SHORT BELOW 7342.00'));
assert.ok(deskPlaySupportedShortText.includes('Entry ref: 7339.75'));
assert.ok(deskPlaySupportedShortText.includes('Stop: 7350.25'));
assert.ok(deskPlaySupportedShortText.includes('Risk: 10.50 pts'));
assert.ok(deskPlaySupportedShortText.includes('T1: 7324.00'));
assert.ok(deskPlaySupportedShortText.includes('T2: 7318.75'));
assert.ok(deskPlaySupportedShortText.includes('Boundary: no approval/canExecute change.'));
assert.ok(!/EXECUTABLE -|Trade now/i.test(deskPlaySupportedShortText));

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
assert.ok(extensionText.includes('Confidence: 98/100'));
assert.ok(extensionText.includes('T1: 7609.75 - scale/secure'));
assert.ok(extensionText.includes('T2: 7611.75 - base exit'));
assert.ok(extensionText.includes('HTF Runner Map:'));
assert.ok(extensionText.includes('Next draw: Full ETH high 7632.75'));
assert.ok(extensionText.includes('Runner: 7620.00 - extension if T2 clears'));
assert.ok(extensionText.includes('Extension: Full ETH high 7632.75'));
assert.ok(extensionText.includes('Mgmt: App T1/T2 tactical; runner needs 5M acceptance beyond T2.'));

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
assert.ok(scannerHtfOppositionText.includes('HTF Caution:'));
assert.ok(scannerHtfOppositionText.includes('SHORT is pressing into bullish HTF/session structure'));
assert.ok(scannerHtfOppositionText.includes('Treat T1/T2 as management'));
assert.ok(scannerHtfOppositionText.includes('HTF/session reaction line 7302.75'));

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
assert.ok(scannerReadyText.includes('WAIT - fresh completed 5M required'));
assert.ok(scannerReadyText.includes('Trigger State: MSS_HOLD_CONFIRMED'));
assert.ok(scannerReadyText.includes('HTF Context:'));
assert.ok(scannerReadyText.includes('Status: sufficient | Reliability: structural'));
assert.ok(scannerReadyText.includes('Minimum: 30 calendar days when available'));
assert.ok(scannerReadyText.includes('Usage: structural confirmation allowed'));
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
assert.ok(openingDriveText.includes('HUMAN REVIEW READY - decision-support plan only; trader confirmation required'));
assert.ok(openingDriveText.includes('Review: HumanReviewReady'));
assert.ok(openingDriveText.includes('Human review required. Decision-support plan only.'));
assert.ok(openingDriveText.includes('Trader must confirm entry before action.'));
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
assert.ok(scannerRetestPendingText.includes('Trigger State: MSS_CONTINUATION_RETEST_PENDING'));
assert.ok(scannerRetestPendingText.includes('completed 5M retest/rejection below the decision level'));
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
assert.ok(dataLimitedScannerText.includes('HTF Context:'));
assert.ok(dataLimitedScannerText.includes('Status: partial | Reliability: data_limited'));
assert.ok(dataLimitedScannerText.includes('Minimum: 30 calendar days when available'));
assert.ok(dataLimitedScannerText.includes('Usage: context only; not structural confirmation'));
assert.ok(dataLimitedScannerText.includes('Candidate Promotion: blocked by data-limited HTF context'));
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
assert.ok(failedPlanText.includes('Failed Plan Reversal:'));
assert.ok(failedPlanText.includes('State: OPPOSITE_SIDE_TRIGGER_CONFIRMED | Level: 7518.00'));
assert.ok(failedPlanText.includes('LONG -> SHORT | HTF: full_confirmation | 5M: confirmed'));
assert.ok(failedPlanText.includes('TF: 15M SHORT confirmed | 1H SHORT confirmed | 2H SHORT confirmed | 4H SHORT confirmed | 5M SHORT confirmed'));
assert.ok(failedPlanText.includes('Boundary: decision support only; not execution approval.'));
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
assert.ok(rawConditionalText.includes('WAIT - fresh completed 5M required'));
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
assert.ok(riskTooWideText.includes('Risk Advisory:'));
assert.ok(riskTooWideText.includes('Decision: WAIT | App plan review: NO | canExecute: false'));
assert.ok(riskTooWideText.includes('Risk State: RISK_ABOVE_STANDARD_LIMIT'));
assert.ok(riskTooWideText.includes('Risk Score:'));
assert.ok(riskTooWideText.includes('Risk exceeds standard limit. Human final decision required.'));
assert.equal(riskTooWideText.includes('Not app-approved executable.'), false);
assert.ok(riskTooWideText.includes('Do not chase'));
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
