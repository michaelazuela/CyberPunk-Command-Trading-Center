import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendResearchDiscordReviewState,
  buildPriceActionReviewMessageContent,
  buildResearchDiscordReviewQueue,
  buildResearchReviewCustomId,
  createResearchDiscordStateEntry,
  emptyResearchDiscordReviewState,
  PRICE_ACTION_REVIEW_LABELS,
  RESEARCH_REVIEW_LABELS,
  summarizeResearchDiscordReviewState,
} from './researchDiscordReviewQueueAgent';
import type { ResearchOutcomeMathReport } from './researchOutcomeMathAgent';
import type { ResearchReviewSample, ResearchSampleReviewPack } from './researchSampleReviewAgent';
import {
  parseResearchDiscordReviewArgs,
  publishResearchDiscordReview,
  runResearchDiscordReviewCli,
} from '../../tools/automation/research-discord-review';

const hypotheticalOverlaySummary = {
  favorableContinuationCount: 1,
  favorableContinuationRate: 1,
  partialFavorableCount: 0,
  partialFavorableRate: 0,
  adverseFirstCount: 0,
  adverseFirstRate: 0,
  neutralNoResolutionCount: 0,
  neutralNoResolutionRate: 0,
  ambiguousSameBarCount: 0,
  ambiguousSameBarRate: 0,
  insufficientDataCount: 0,
  insufficientDataRate: 0,
};

function sample(id: string, reviewed = false): ResearchReviewSample {
  return {
    sampleId: id,
    date: '2026-05-28',
    time: '10:00',
    concept: 'false_run_liquidity_fade',
    conceptTitle: 'False-Run Liquidity Fade Near Highs',
    direction: 'SHORT',
    window: 'regular_session',
    classification: 'advisory_only',
    advisoryOnly: true,
    summary: 'Price ran toward major buy-side liquidity and failed to sustain.',
    whyAdvisoryOnly: 'Research-only. Existing no installed model path and no installed model path gates did not independently pass.',
    model1Overlap: false,
    historicalReversalOverlap: false,
    researchDetectorReason: 'Research detector found context only.',
    warningFailureReason: 'No approved setup overlap.',
    dataQualityNotes: [],
    sampleSourceReportPath: 'fixture-backfill.json',
    agentInspectionLabel: 'keep_advisory',
    agentConfidence: 'medium',
    agentReason: 'Keep advisory until human review compares this against current approved gates.',
    agentEvidence: ['fixture'],
    agentConcerns: ['Agent inspection is research-only and cannot approve execution.'],
    agentRecommendedNextStep: 'continue_tracking',
    agentApprovalBoundary: {
      agentApprovesTrade: false,
      agentChangesRules: false,
      agentCreatesEntry: false,
      agentCreatesTargets: false,
      agentPromotesModel: false,
    },
    humanInspectionLabel: reviewed ? 'keep_advisory' : null,
    humanConfidence: reviewed ? 'medium' : null,
    humanReason: reviewed ? 'fixture' : null,
    humanNotes: reviewed ? 'fixture' : null,
    humanReviewedAt: reviewed ? '2026-05-29T20:00:00.000Z' : null,
    humanReviewer: reviewed ? 'Michael' : null,
    agentHumanAgreement: reviewed ? true : null,
    disagreementReason: null,
    finalReviewLabel: reviewed ? 'keep_advisory' : null,
    finalReviewNotes: reviewed ? 'Research-only final label.' : null,
  };
}

function reviewPack(): ResearchSampleReviewPack {
  return {
    reportType: 'research_sample_review_pack',
    generatedAt: '2026-05-29T20:00:00.000Z',
    instrument: 'MES',
    concept: 'all',
    requestedSampleSize: 3,
    selectedSampleCount: 3,
    sourceReportPaths: ['fixture-backfill.json'],
    sampleSourceMode: 'full_candidate_events',
    executiveSummary: ['fixture'],
    conceptSummaries: [],
    sampleSelectionMethod: ['fixture'],
    samples: [sample('false_run_liquidity_fade-001'), sample('false_run_liquidity_fade-002'), sample('false_run_liquidity_fade-003', true)],
    possibleExistingModelMappingReview: [],
    advisoryOnlyFindings: [],
    humanReviewQuestions: [],
    doNotChangeYetItems: [],
    approvalBoundary: {
      sampleReviewApprovesTrade: false,
      sampleReviewChangesRules: false,
      sampleReviewCreatesEntry: false,
      sampleReviewCreatesTargets: false,
      sampleReviewPromotesModel: false,
      sampleReviewWritesRagMemory: false,
    },
    markdown: '# fixture',
  };
}

function outcomeReport(): ResearchOutcomeMathReport {
  return {
    reportType: 'research_outcome_math',
    generatedAt: '2026-05-29T20:00:00.000Z',
    sourcePath: 'fixture-outcome.json',
    instrument: 'MES',
    advisoryOnly: true,
    executionApproved: false,
    thresholds: {
      thresholdOnePoints: 4,
      thresholdTwoPoints: 8,
      adverseThresholdPoints: 4,
      observationWindowBars: 12,
    },
    summary: {
      totalCandidates: 1,
      evaluatedCandidates: 1,
      insufficientDataCandidates: 0,
      thresholdOneTouchRate: 1,
      thresholdTwoTouchRate: 1,
      adverseThresholdTouchRate: 0,
      favorableFirstRate: 1,
      adverseFirstRate: 0,
      hypotheticalOverlay: hypotheticalOverlaySummary,
    },
    conceptSummaries: [],
    candidateOutcomes: [{
      candidateId: 'false_run_liquidity_fade-001',
      date: '2026-05-28',
      time: '10:00',
      instrument: 'MES',
      concept: 'false_run_liquidity_fade',
      direction: 'SHORT',
      window: 'regular_session',
      classification: 'advisory_only',
      advisoryOnly: true,
      observationWindowBars: 12,
      observationWindowMinutes: 60,
      referencePrice: 7600,
      maxFavorableExcursionPoints: 12,
      maxAdverseExcursionPoints: 2,
      maxFavorableExcursionTicks: 48,
      maxAdverseExcursionTicks: 8,
      timeToMaxFavorableBars: 4,
      timeToMaxAdverseBars: 1,
      timeToMaxFavorableMinutes: 20,
      timeToMaxAdverseMinutes: 5,
      thresholdOnePoints: 4,
      thresholdTwoPoints: 8,
      thresholdOneTouched: true,
      thresholdTwoTouched: true,
      adverseThresholdPoints: 4,
      adverseThresholdTouched: false,
      firstMeaningfulMove: 'favorable',
      outcomeClassification: 'favorable_continuation',
      hypotheticalOutcomeOverlay: {
        advisoryOnly: true,
        executionApproved: false,
        hypotheticalReferencePrice: 7600,
        hypotheticalInvalidationReference: 7604,
        hypotheticalThresholdOne: 7596,
        hypotheticalThresholdTwo: 7592,
        thresholdOnePoints: 4,
        thresholdTwoPoints: 8,
        adverseInvalidationPoints: 4,
        observationWindowBars: 12,
        firstResolvedEvent: 'favorable_threshold_two',
        hypotheticalOutcomeLabel: 'favorable_continuation',
        resolvedAtBarIndex: 3,
        resolvedAtTime: '2026-05-28T10:20:00',
        maxFavorableExcursionPoints: 12,
        maxAdverseExcursionPoints: 2,
        notes: [],
      },
      dataQualityNotes: [],
    }],
    markdown: '# fixture',
    approvalBoundary: {
      outcomeMathApprovesTrade: false,
      outcomeMathChangesRules: false,
      outcomeMathCreatesEntry: false,
      outcomeMathCreatesTargets: false,
      outcomeMathPromotesModel: false,
    },
  };
}

const pack = reviewPack();
const queue = buildResearchDiscordReviewQueue({
  reviewPack: pack,
  reviewPackPath: 'fixture-review-pack.json',
  outcomeReport: outcomeReport(),
  limit: 1,
});
assert.equal(queue.pendingSamplesFound, 2);
assert.equal(queue.selectedSamples, 1);
assert.equal(queue.items.length, 1);
assert.equal(queue.items[0].estimatedGrossContractPnl.rootSymbol, 'MES');
assert.equal(queue.items[0].estimatedGrossContractPnl.status, 'available');
assert.equal(queue.items[0].estimatedGrossContractPnl.hypotheticalOutcomeDollars, 40);
const payload = queue.items[0].payload;
assert.ok(payload.content.includes('false_run_liquidity_fade-001'));
assert.ok(payload.content.includes('Recommended: Keep Advisory'));
assert.ok(payload.content.includes('Suggested human action: Keep Advisory'));
assert.ok(payload.content.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(payload.content.includes('Max favorable excursion: 12'));
assert.ok(payload.content.includes('outcomeClassification: favorable_continuation'));
assert.ok(payload.content.includes('Hypothetical research overlay:'));
assert.ok(payload.content.includes('Reference price: 7600'));
assert.ok(payload.content.includes('Favorable threshold one: 7596'));
assert.ok(payload.content.includes('Adverse invalidation reference: 7604'));
assert.ok(payload.content.includes('Hypothetical outcome: favorable_continuation'));
assert.ok(payload.content.includes('Research-only. These are not entries, stops, or targets. This does not approve execution.'));
assert.equal(payload.components.length, 1);
const buttons = payload.components.flatMap((row) => row.components);
assert.deepEqual(buttons.map((button) => button.label), [
  'Keep Advisory',
  'Need Chart Evidence',
  'Need More Context',
  'Candidate Label Review',
  'Reject/Deprioritize',
]);
assert.ok(buttons.every((button) => button.custom_id.startsWith(`research_review|${queue.packHash}|`)));
assert.ok(buttons.every((button) => button.custom_id.includes('|false_run_liquidity_fade-001|')));
assert.ok(buttons.every((button) => RESEARCH_REVIEW_LABELS.some((label) => button.custom_id.endsWith(`|${label}`))));
assert.ok(buttons.every((button) => button.custom_id.length <= 100));
assert.ok(!buttons.some((button) => /approve trade|execute|take trade|valid setup|go live|greenlight|buy|sell/i.test(button.label)));
assert.ok(!/"entry"|"stop"|"T1"|"T2"|"canExecute"/.test(JSON.stringify(payload)));
assert.ok(buttons.some((button) => button.label === 'Candidate Label Review' && button.custom_id.endsWith('|new_model_candidate_review')));

const mismatchedOutcomeQueue = buildResearchDiscordReviewQueue({
  reviewPack: {
    ...pack,
    samples: [{
      ...pack.samples[0],
      sampleId: 'reused-generated-id-016',
      date: '2026-04-28',
      time: '10:00',
      direction: 'SHORT',
    }],
  },
  reviewPackPath: 'fixture-review-pack.json',
  outcomeReport: {
    ...outcomeReport(),
    candidateOutcomes: [{
      ...outcomeReport().candidateOutcomes[0],
      candidateId: 'reused-generated-id-016',
      date: '2026-01-08',
      time: '03:00',
      direction: 'LONG',
      concept: 'false_run_liquidity_fade',
    }],
  },
  limit: 1,
  buttonMode: 'future_model_candidate_review',
});
assert.equal(mismatchedOutcomeQueue.items[0].outcome, null);
assert.ok(mismatchedOutcomeQueue.items[0].payload.content.includes('Entry: Unavailable'));
assert.ok(mismatchedOutcomeQueue.items[0].payload.content.includes('Would it have worked?: Inconclusive'));
assert.equal(mismatchedOutcomeQueue.items[0].payload.content.includes('Would it have worked?: Yes'), false);

const priceActionButtonQueue = buildResearchDiscordReviewQueue({
  reviewPack: pack,
  reviewPackPath: 'fixture-review-pack.json',
  outcomeReport: outcomeReport(),
  limit: 1,
  buttonMode: 'future_model_candidate_review',
});
const priceActionContent = priceActionButtonQueue.items[0].payload.content;
assert.ok(priceActionContent.startsWith('[PRICE ACTION REVIEW] false_run_liquidity_fade-001'));
assert.ok(priceActionContent.includes('Concept: False-Run Liquidity Fade Near Highs'));
assert.ok(priceActionContent.includes('Date/Time: 2026-05-28 10:00'));
assert.ok(priceActionContent.includes('Direction: SHORT'));
assert.ok(priceActionContent.includes('Contract: detected contract pending'));
assert.ok(priceActionContent.includes('Hypothetical Overlay:'));
assert.ok(priceActionContent.includes('Entry: 7600'));
assert.ok(priceActionContent.includes('Stop Loss: 7604'));
assert.ok(priceActionContent.includes('T1: 7596'));
assert.ok(priceActionContent.includes('T2: 7592'));
assert.ok(priceActionContent.includes('Outcome Review:'));
assert.ok(priceActionContent.includes('Would it have worked?: Yes'));
assert.ok(priceActionContent.includes('Result: T2 hit'));
assert.ok(priceActionContent.includes('Agent view: Keep advisory until human review compares this against current approved gates.'));
assert.ok(priceActionContent.includes('Agent Recommendation:\nKeep Advisory - continue_observing'));
assert.ok(priceActionContent.includes('Apply a formal candidate label only if this is useful evidence for future model-candidate review/backtest.'));
assert.ok(priceActionContent.includes('Formal candidate labels do not approve live models, trades, or execution.'));
assert.ok(priceActionContent.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.equal(priceActionContent.includes('[RESEARCH SAMPLE REVIEW]'), false);
assert.equal(priceActionContent.includes('Suggested human action: Keep Advisory'), false);
const adverseFirstEvenWithLaterTargetContent = buildPriceActionReviewMessageContent(
  priceActionButtonQueue.items[0].sample,
  {
    ...priceActionButtonQueue.items[0].outcome!,
    thresholdOneTouched: true,
    thresholdTwoTouched: true,
    adverseThresholdTouched: true,
    firstMeaningfulMove: 'adverse',
    outcomeClassification: 'adverse_first',
    hypotheticalOutcomeOverlay: {
      ...priceActionButtonQueue.items[0].outcome!.hypotheticalOutcomeOverlay,
      firstResolvedEvent: 'adverse_invalidation',
      hypotheticalOutcomeLabel: 'adverse_first',
      resolvedAtBarIndex: 1,
      resolvedAtTime: '2026-05-28T10:10:00',
    },
  },
  'MES 06-26',
);
assert.ok(adverseFirstEvenWithLaterTargetContent.includes('Would it have worked?: No'));
assert.ok(adverseFirstEvenWithLaterTargetContent.includes('Result: Stop first'));
assert.equal(adverseFirstEvenWithLaterTargetContent.includes('Would it have worked?: Yes'), false);
assert.equal(adverseFirstEvenWithLaterTargetContent.includes('Result: T2 hit'), false);
const invalidOverlayContent = buildPriceActionReviewMessageContent(
  priceActionButtonQueue.items[0].sample,
  priceActionButtonQueue.items[0].outcome,
  'MES 06-26',
  'Price action card withheld: Overlay direction check failed for LONG sample.',
);
assert.ok(invalidOverlayContent.includes('Would it have worked?: Invalid overlay'));
assert.ok(invalidOverlayContent.includes('Result: Invalid overlay'));
assert.equal(invalidOverlayContent.includes('Would it have worked?: Yes'), false);
assert.equal(invalidOverlayContent.includes('Result: T2 hit'), false);
assert.ok(invalidOverlayContent.includes('Chart warning: Price action card withheld: Overlay direction check failed for LONG sample.'));
const priceActionButtons = priceActionButtonQueue.items[0].payload.components.flatMap((row) => row.components);
assert.deepEqual(priceActionButtons.map((button) => button.label), ['Approve for Candidate Review', 'Not Approved for Candidate Review']);
assert.deepEqual(priceActionButtons.map((button) => button.custom_id.split('|').at(-1)), ['approved', 'not_approved']);
assert.equal(priceActionButtons.some((button) => [
  'Keep Advisory',
  'Need Chart Evidence',
  'Need More Context',
  'Candidate Label Review',
  'Reject/Deprioritize',
].includes(button.label)), false);

const duplicateSkippedQueue = buildResearchDiscordReviewQueue({
  reviewPack: pack,
  reviewPackPath: 'fixture-review-pack.json',
  skipSampleIds: ['false_run_liquidity_fade-001'],
});
assert.equal(duplicateSkippedQueue.pendingSamplesFound, 1);
assert.equal(duplicateSkippedQueue.items[0].sample.sampleId, 'false_run_liquidity_fade-002');

const customId = buildResearchReviewCustomId(queue.packHash, 'sample with spaces!', 'keep_advisory');
assert.equal(customId, `research_review|${queue.packHash}|samplewithspaces|keep_advisory`);

const state = appendResearchDiscordReviewState(emptyResearchDiscordReviewState(), [
  createResearchDiscordStateEntry({
    packHash: queue.packHash,
    reviewPackPath: 'fixture-review-pack.json',
    sampleId: 'false_run_liquidity_fade-001',
    discordMessageId: '123',
    discordChannelId: 'channel-1',
    postedAt: '2026-05-29T20:00:00.000Z',
    chartPngPath: 'tools/automation/research-review-charts/price-action-review-card-fixture.png',
    chartSvgPath: 'tools/automation/research-review-charts/price-action-review-card-fixture.svg',
    chartReportPath: 'tools/automation/research-review-charts/research-review-chart-report-fixture.md',
    sourceReviewCard: 'Discord PriceActionReviewCard post',
    estimatedGrossContractPnl: queue.items[0].estimatedGrossContractPnl,
  }),
]);
assert.equal(state.entries.length, 1);
assert.equal(state.entries[0].advisoryOnly, true);
assert.equal(state.entries[0].reviewed, false);
assert.equal(state.entries[0].chartPngPath, 'tools/automation/research-review-charts/price-action-review-card-fixture.png');
assert.equal(state.entries[0].chartSvgPath, 'tools/automation/research-review-charts/price-action-review-card-fixture.svg');
assert.equal(state.entries[0].chartReportPath, 'tools/automation/research-review-charts/research-review-chart-report-fixture.md');
assert.equal(state.entries[0].sourceReviewCard, 'Discord PriceActionReviewCard post');
assert.equal(state.entries[0].estimatedGrossContractPnl?.rootSymbol, 'MES');
const stateSummary = summarizeResearchDiscordReviewState('state.json', state);
assert.equal(stateSummary.totalPostedSamples, 1);
assert.equal(stateSummary.pendingPostedSamples, 1);
assert.equal(stateSummary.advisoryOnlyConfirmed, true);

const parsed = parseResearchDiscordReviewArgs([
  '--review-pack', 'review.json',
  '--outcome-report', 'outcome.json',
  '--publish-pending',
  '--limit', '5',
  '--dry-run',
  '--state-path', 'state.json',
  '--pretty',
]);
assert.equal(parsed.reviewPack, 'review.json');
assert.equal(parsed.outcomeReport, 'outcome.json');
assert.equal(parsed.publishPending, true);
assert.equal(parsed.limit, 5);
assert.equal(parsed.dryRun, true);

const temp = mkdtempSync(join(tmpdir(), 'research-discord-review-'));
const reviewFile = join(temp, 'review.json');
const outcomeFile = join(temp, 'outcome.json');
const stateFile = join(temp, 'discord-review-state.json');
writeFileSync(reviewFile, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
writeFileSync(outcomeFile, `${JSON.stringify(outcomeReport(), null, 2)}\n`, 'utf8');

const savedEnv = {
  RESEARCH_REVIEW_DISCORD_BOT_TOKEN: process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN,
  RESEARCH_REVIEW_DISCORD_CHANNEL_ID: process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID,
};
delete process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
delete process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;

const dryRun = await publishResearchDiscordReview({
  reviewPack: reviewFile,
  outcomeReport: outcomeFile,
  publishPending: true,
  state: false,
  limit: 1,
  dryRun: true,
  writeDryRunState: false,
  statePath: stateFile,
  pretty: true,
  json: false,
});
assert.equal(dryRun.samplesSelected, 1);
assert.equal(dryRun.messagesPosted, 0);
assert.equal(dryRun.missingCredentials.length, 2);
assert.equal(existsSync(stateFile), false);

let renderedCardCount = 0;
let resolvedBarContract: string | undefined;
const pngFile = join(temp, 'price-action-review-card-fixture.png');
writeFileSync(pngFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const priceActionDryRun = await publishResearchDiscordReview({
  reviewPack: reviewFile,
  outcomeReport: outcomeFile,
  publishPending: true,
  state: false,
  limit: 1,
  dryRun: true,
  writeDryRunState: false,
  statePath: join(temp, 'price-action-dry-state.json'),
  pretty: true,
  json: false,
  withPriceActionCards: true,
  priceActionCards: {
    enabled: true,
    symbol: 'MES',
    bridgeInstrument: 'MES 09-26',
    bridgeUrl: 'http://127.0.0.1:8765',
    contractResolution: {
      instrument: 'MES 09-26',
      source: 'bridge-health',
      warnings: [],
      bridgeUrl: 'http://127.0.0.1:8765',
    },
    dateRange: { from: '2026-01-01', to: '2026-05-29' },
    resolveBars: async (_sample, options) => {
      resolvedBarContract = options.bridgeInstrument;
      return {
        bars5m: [
          { time: '2026-05-28T09:45:00', open: 7600, high: 7601, low: 7599, close: 7600.5 },
          { time: '2026-05-28T09:50:00', open: 7600.5, high: 7602, low: 7600, close: 7601.5 },
          { time: '2026-05-28T09:55:00', open: 7601.5, high: 7602, low: 7598, close: 7599 },
          { time: '2026-05-28T10:00:00', open: 7599, high: 7600, low: 7595, close: 7596 },
        ],
        bars15m: [
          { time: '2026-05-28T09:30:00', open: 7602, high: 7604, low: 7599, close: 7600 },
          { time: '2026-05-28T09:45:00', open: 7600, high: 7602, low: 7595, close: 7596 },
        ],
        dataSource: 'ninjatrader',
        sourceByTimeframe: { '5m': 'ninjatrader', '15m': 'ninjatrader' },
        warnings: [],
        resolvedWindow: {
          sampleTimestamp: '2026-05-28T10:00:00',
          fiveMinute: { timeframe: '5m', from: '2026-05-28T09:45:00', to: '2026-05-28T10:15:00' },
          fifteenMinute: { timeframe: '15m', from: '2026-05-28T09:30:00', to: '2026-05-28T10:30:00' },
        },
        resolvedContract: 'MES 09-26',
        symbol: 'MES',
        bridgeUrl: 'http://127.0.0.1:8765',
        timezone: 'eastern',
        advisoryOnly: true,
        executionApproved: false,
      };
    },
    renderCard: async (input) => {
      renderedCardCount += 1;
      assert.equal(input.model.contract, 'MES 09-26');
      return pngFile;
    },
  },
});
assert.equal(priceActionDryRun.priceActionCards.length, 1);
assert.equal(priceActionDryRun.priceActionCards[0].attached, true);
assert.equal(priceActionDryRun.priceActionCards[0].pngPath?.endsWith('.png'), true);
assert.ok(priceActionDryRun.payloads[0].content.includes('[PRICE ACTION REVIEW] false_run_liquidity_fade-001'));
assert.ok(priceActionDryRun.payloads[0].content.includes('Contract: MES 09-26'));
assert.equal(priceActionDryRun.payloads[0].content.includes('[RESEARCH SAMPLE REVIEW]'), false);
assert.equal(resolvedBarContract, 'MES 09-26');
assert.equal(renderedCardCount, 1);
const priceActionDryRunButtons = priceActionDryRun.payloads[0].components.flatMap((row) => row.components).map((button) => button.label);
assert.deepEqual(priceActionDryRunButtons, ['Approve for Candidate Review', 'Not Approved for Candidate Review']);

const duplicateSkippedCards = await publishResearchDiscordReview({
  reviewPack: reviewFile,
  outcomeReport: outcomeFile,
  publishPending: true,
  state: false,
  limit: 1,
  dryRun: true,
  writeDryRunState: false,
  statePath: join(temp, 'price-action-skip-state.json'),
  pretty: true,
  json: false,
  skipSampleIds: ['false_run_liquidity_fade-001'],
  withPriceActionCards: true,
  priceActionCards: {
    enabled: true,
    symbol: 'MES',
    bridgeInstrument: 'MES 09-26',
    contractResolution: {
      instrument: 'MES 09-26',
      source: 'bridge-health',
      warnings: [],
      bridgeUrl: 'http://127.0.0.1:8765',
    },
    resolveBars: priceActionDryRun.priceActionCards.length
      ? async (selectedSample) => {
          assert.equal(selectedSample.sampleId, 'false_run_liquidity_fade-002');
          return {
            bars5m: [],
            bars15m: [],
            dataSource: 'missing',
            sourceByTimeframe: { '5m': 'missing', '15m': 'missing' },
            warnings: ['fixture missing bars'],
            resolvedWindow: { sampleTimestamp: null, fiveMinute: null, fifteenMinute: null },
            resolvedContract: 'MES 09-26',
            symbol: 'MES',
            bridgeUrl: 'http://127.0.0.1:8765',
            timezone: 'eastern',
            advisoryOnly: true,
            executionApproved: false,
          };
        }
      : undefined,
  },
});
assert.equal(duplicateSkippedCards.samplesSelected, 1);
assert.equal(duplicateSkippedCards.priceActionCards[0].sampleId, 'false_run_liquidity_fade-002');
assert.equal(duplicateSkippedCards.priceActionCards[0].attached, false);
assert.ok(duplicateSkippedCards.priceActionCards[0].warnings.some((warning) => warning.includes('missing bar data')));

await assert.rejects(
  () => publishResearchDiscordReview({
    reviewPack: reviewFile,
    outcomeReport: null,
    publishPending: true,
    state: false,
    limit: 1,
    dryRun: false,
    writeDryRunState: false,
    statePath: stateFile,
    pretty: true,
    json: false,
  }),
  /Missing Discord research review configuration/,
);

process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN = 'test-token';
process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID = 'channel-1';
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  assert.ok(String((init?.headers as Record<string, string>).Authorization).startsWith('Bot '));
  assert.ok(String(init?.body).includes('Research-only. This does not approve execution, change rules, or create trades.'));
  return Response.json({ id: 'discord-message-1' });
}) as typeof fetch;

const posted = await publishResearchDiscordReview({
  reviewPack: reviewFile,
  outcomeReport: null,
  publishPending: true,
  state: false,
  limit: 1,
  dryRun: false,
  writeDryRunState: false,
  statePath: stateFile,
  pretty: true,
  json: false,
});
globalThis.fetch = originalFetch;
assert.equal(posted.messagesPosted, 1);
assert.equal(existsSync(stateFile), true);
const writtenState = JSON.parse(readFileSync(stateFile, 'utf8'));
assert.equal(writtenState.entries[0].discordMessageId, 'discord-message-1');
assert.equal(writtenState.entries[0].discordChannelId, 'channel-1');
assert.equal(writtenState.entries[0].advisoryOnly, true);

let attachmentFetchSeen = false;
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  assert.ok(init?.body instanceof FormData, 'price action card sample post should use multipart form data');
  const form = init.body as FormData;
  const payloadJson = String(form.get('payload_json'));
  const payloadObject = JSON.parse(payloadJson);
  const buttonLabels = payloadObject.components.flatMap((row: { components: Array<{ label: string }> }) => row.components.map((button) => button.label));
  assert.deepEqual(buttonLabels, ['Approve for Candidate Review', 'Not Approved for Candidate Review']);
  assert.equal(buttonLabels.includes('Keep Advisory'), false);
  assert.equal(buttonLabels.includes('Candidate Label Review'), false);
  assert.ok(payloadJson.includes('[PRICE ACTION REVIEW] false_run_liquidity_fade-001'));
  assert.ok(payloadJson.includes('Contract: MES 09-26'));
  assert.ok(payloadJson.includes('Hypothetical Overlay:'));
  assert.ok(payloadJson.includes('Outcome Review:'));
  assert.ok(payloadJson.includes('Agent Recommendation:'));
  assert.ok(payloadJson.includes('Apply a formal candidate label only if this is useful evidence for future model-candidate review/backtest.'));
  assert.ok(payloadJson.includes('Formal candidate labels do not approve live models, trades, or execution.'));
  assert.ok(payloadJson.includes('Research-only. This does not approve execution, change rules, or create trades.'));
  assert.equal(payloadJson.includes('"entry"'), false);
  const file = form.get('files[0]') as File;
  assert.equal(file.name.endsWith('.png'), true);
  assert.equal(file.name.endsWith('.svg'), false);
  attachmentFetchSeen = true;
  return Response.json({ id: 'discord-price-card-1' });
}) as typeof fetch;

const postedWithCard = await publishResearchDiscordReview({
  reviewPack: reviewFile,
  outcomeReport: outcomeFile,
  publishPending: true,
  state: false,
  limit: 1,
  dryRun: false,
  writeDryRunState: false,
  statePath: join(temp, 'price-action-live-state.json'),
  pretty: true,
  json: false,
  withPriceActionCards: true,
  priceActionCards: {
    enabled: true,
    symbol: 'MES',
    bridgeInstrument: 'MES 09-26',
    contractResolution: {
      instrument: 'MES 09-26',
      source: 'bridge-health',
      warnings: [],
      bridgeUrl: 'http://127.0.0.1:8765',
    },
    resolveBars: async () => ({
      bars5m: [
        { time: '2026-05-28T09:45:00', open: 7600, high: 7601, low: 7599, close: 7600.5 },
        { time: '2026-05-28T09:50:00', open: 7600.5, high: 7602, low: 7600, close: 7601.5 },
        { time: '2026-05-28T09:55:00', open: 7601.5, high: 7602, low: 7598, close: 7599 },
        { time: '2026-05-28T10:00:00', open: 7599, high: 7600, low: 7595, close: 7596 },
      ],
      bars15m: [
        { time: '2026-05-28T09:30:00', open: 7602, high: 7604, low: 7599, close: 7600 },
        { time: '2026-05-28T09:45:00', open: 7600, high: 7602, low: 7595, close: 7596 },
      ],
      dataSource: 'cache',
      sourceByTimeframe: { '5m': 'cache', '15m': 'cache' },
      warnings: [],
      resolvedWindow: {
        sampleTimestamp: '2026-05-28T10:00:00',
        fiveMinute: { timeframe: '5m', from: '2026-05-28T09:45:00', to: '2026-05-28T10:15:00' },
        fifteenMinute: { timeframe: '15m', from: '2026-05-28T09:30:00', to: '2026-05-28T10:30:00' },
      },
      resolvedContract: 'MES 09-26',
      symbol: 'MES',
      bridgeUrl: 'http://127.0.0.1:8765',
      timezone: 'eastern',
      advisoryOnly: true,
      executionApproved: false,
    }),
    renderCard: async () => pngFile,
  },
});
globalThis.fetch = originalFetch;
assert.equal(postedWithCard.messagesPosted, 1);
assert.equal(postedWithCard.priceActionCards[0].attached, true);
assert.equal(attachmentFetchSeen, true);
const priceActionState = JSON.parse(readFileSync(join(temp, 'price-action-live-state.json'), 'utf8'));
assert.deepEqual(priceActionState.entries[0].labelOptions, PRICE_ACTION_REVIEW_LABELS);

let withheldFetchSeen = false;
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  assert.equal(typeof init?.body, 'string', 'withheld chart post should be JSON text only');
  const payloadObject = JSON.parse(init?.body as string);
  const buttonLabels = payloadObject.components.flatMap((row: { components: Array<{ label: string }> }) => row.components.map((button) => button.label));
  assert.deepEqual(buttonLabels, ['Approve for Candidate Review', 'Not Approved for Candidate Review']);
  assert.ok(payloadObject.content.includes('Price action card withheld'));
  assert.ok(payloadObject.content.includes('Would it have worked?: Invalid overlay'));
  assert.ok(payloadObject.content.includes('Result: Invalid overlay'));
  assert.equal(payloadObject.content.includes('Would it have worked?: Yes'), false);
  assert.equal(payloadObject.content.includes('Result: T2 hit'), false);
  withheldFetchSeen = true;
  return Response.json({ id: 'discord-price-card-withheld-1' });
}) as typeof fetch;

const withheldCardPost = await publishResearchDiscordReview({
  reviewPack: reviewFile,
  outcomeReport: outcomeFile,
  publishPending: true,
  state: false,
  limit: 1,
  dryRun: false,
  writeDryRunState: false,
  statePath: join(temp, 'price-action-withheld-state.json'),
  pretty: true,
  json: false,
  withPriceActionCards: true,
  priceActionCards: {
    enabled: true,
    symbol: 'MES',
    bridgeInstrument: 'MES 09-26',
    contractResolution: {
      instrument: 'MES 09-26',
      source: 'bridge-health',
      warnings: [],
      bridgeUrl: 'http://127.0.0.1:8765',
    },
    resolveBars: async () => ({
      bars5m: [
        { time: '2026-05-28T09:45:00', open: 7600, high: 7601, low: 7599, close: 7600.5 },
        { time: '2026-05-28T09:50:00', open: 7600.5, high: 7602, low: 7600, close: 7601.5 },
      ],
      bars15m: [
        { time: '2026-05-28T09:30:00', open: 7602, high: 7604, low: 7599, close: 7600 },
        { time: '2026-05-28T09:45:00', open: 7600, high: 7602, low: 7595, close: 7596 },
      ],
      dataSource: 'cache',
      sourceByTimeframe: { '5m': 'cache', '15m': 'cache' },
      warnings: [],
      resolvedWindow: {
        sampleTimestamp: '2026-05-28T10:00:00',
        fiveMinute: { timeframe: '5m', from: '2026-05-28T09:45:00', to: '2026-05-28T10:15:00' },
        fifteenMinute: { timeframe: '15m', from: '2026-05-28T09:30:00', to: '2026-05-28T10:30:00' },
      },
      resolvedContract: 'MES 09-26',
      symbol: 'MES',
      bridgeUrl: 'http://127.0.0.1:8765',
      timezone: 'eastern',
      advisoryOnly: true,
      executionApproved: false,
    }),
    renderCardWithMetadata: async () => ({
      outputPath: pngFile,
      renderedPng: true,
      renderedSvg: false,
      visualQuality: 'fail',
      cardAttachable: false,
      directionConsistency: 'fail',
      candleRangeCoveragePct: 20,
      labelCollisionRisk: 'high',
      chartWithheldReason: 'Price action card withheld: Overlay direction check failed for LONG sample.',
      mainChart: {
        timeframe: '5m',
        barsRendered: 2,
        xAxisLabelsRendered: true,
        yAxisLabelsRendered: true,
        priceRange: { min: 7590, max: 7610 },
        timeRange: { from: '2026-05-28T09:45:00', to: '2026-05-28T09:50:00' },
        overlayLevelsAttempted: 4,
        overlayLevelsRendered: 4,
        candleRangeCoveragePct: 20,
        labelCollisionRisk: 'high',
      },
      contextChart: {
        timeframe: '15m',
        barsRendered: 2,
        xAxisLabelsRendered: true,
        yAxisLabelsRendered: true,
        priceRange: { min: 7590, max: 7610 },
        timeRange: { from: '2026-05-28T09:30:00', to: '2026-05-28T09:45:00' },
        overlayLevelsAttempted: 2,
        overlayLevelsRendered: 2,
        candleRangeCoveragePct: 20,
        labelCollisionRisk: 'low',
      },
      warnings: ['Price action card withheld: Overlay direction check failed for LONG sample.'],
    }),
  },
});
globalThis.fetch = originalFetch;
assert.equal(withheldCardPost.messagesPosted, 1);
assert.equal(withheldCardPost.priceActionCards[0].attached, false);
assert.equal(withheldCardPost.priceActionCards[0].chartWithheld, true);
assert.equal(withheldCardPost.priceActionCards[0].postedTextOnly, true);
assert.equal(withheldCardPost.priceActionCards[0].directionConsistency, 'fail');
assert.equal(withheldFetchSeen, true);
const withheldState = JSON.parse(readFileSync(join(temp, 'price-action-withheld-state.json'), 'utf8'));
assert.equal(withheldState.entries[0].postedTextOnly, true);
assert.equal(withheldState.entries[0].chartWithheld, true);
assert.ok(withheldState.entries[0].chartWithheldReason.includes('Overlay direction check failed'));

await runResearchDiscordReviewCli(['--state', '--state-path', stateFile, '--pretty']);
await runResearchDiscordReviewCli(['--review-pack', reviewFile, '--publish-pending', '--limit', '1', '--dry-run', '--pretty', '--state-path', join(temp, 'dry-state.json')]);

if (savedEnv.RESEARCH_REVIEW_DISCORD_BOT_TOKEN === undefined) {
  delete process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
} else {
  process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN = savedEnv.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
}
if (savedEnv.RESEARCH_REVIEW_DISCORD_CHANNEL_ID === undefined) {
  delete process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;
} else {
  process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID = savedEnv.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;
}

console.log('Research Discord review queue agent verified.');
