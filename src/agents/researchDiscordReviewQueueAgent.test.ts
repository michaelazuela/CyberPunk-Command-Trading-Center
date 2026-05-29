import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendResearchDiscordReviewState,
  buildResearchDiscordReviewQueue,
  buildResearchReviewCustomId,
  createResearchDiscordStateEntry,
  emptyResearchDiscordReviewState,
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
    whyAdvisoryOnly: 'Research-only. Existing Model 1 and Turtle Soup gates did not independently pass.',
    model1Overlap: false,
    turtleSoupOverlap: false,
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
const payload = queue.items[0].payload;
assert.ok(payload.content.includes('false_run_liquidity_fade-001'));
assert.ok(payload.content.includes('Research-only. This does not approve execution.'));
assert.ok(payload.content.includes('Max favorable excursion: 12'));
assert.ok(payload.content.includes('outcomeClassification: favorable_continuation'));
assert.equal(payload.components.length, 2);
const buttons = payload.components.flatMap((row) => row.components);
assert.deepEqual(buttons.map((button) => button.label), [
  'Keep Advisory',
  'Reject',
  'Model 1 Review',
  'Turtle Soup Review',
  'Human Rule Review Queue',
  'Insufficient Context',
]);
assert.ok(buttons.every((button) => button.custom_id.startsWith(`research_review|${queue.packHash}|`)));
assert.ok(buttons.every((button) => button.custom_id.includes('|false_run_liquidity_fade-001|')));
assert.ok(buttons.every((button) => RESEARCH_REVIEW_LABELS.some((label) => button.custom_id.endsWith(`|${label}`))));
assert.ok(buttons.every((button) => button.custom_id.length <= 100));
assert.ok(!buttons.some((button) => /approve trade|execute|take trade|valid setup|go live|greenlight|buy|sell/i.test(button.label)));
assert.ok(!/"entry"|"stop"|"T1"|"T2"|"canExecute"/.test(JSON.stringify(payload)));

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
  }),
]);
assert.equal(state.entries.length, 1);
assert.equal(state.entries[0].advisoryOnly, true);
assert.equal(state.entries[0].reviewed, false);
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
  assert.ok(String(init?.body).includes('Research-only. This does not approve execution.'));
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
