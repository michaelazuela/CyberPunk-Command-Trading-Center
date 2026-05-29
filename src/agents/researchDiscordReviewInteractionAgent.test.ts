import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createResearchDiscordStateEntry,
  type ResearchDiscordReviewState,
} from './researchDiscordReviewQueueAgent';
import {
  handleResearchDiscordReviewInteraction,
  parseResearchDiscordReviewCustomId,
  validateResearchDiscordInteractionUser,
} from './researchDiscordReviewInteractionAgent';
import type { ResearchSampleReviewPack } from './researchSampleReviewAgent';
import {
  parseResearchDiscordInteractionsArgs,
  runResearchDiscordInteractionsCli,
} from '../../tools/automation/research-discord-interactions';

function fixturePack(): ResearchSampleReviewPack {
  return {
    reportType: 'research_sample_review_pack',
    generatedAt: '2026-05-29T20:00:00.000Z',
    instrument: 'MES',
    concept: 'all',
    requestedSampleSize: 2,
    selectedSampleCount: 2,
    sourceReportPaths: ['fixture-backfill.json'],
    sampleSourceMode: 'full_candidate_events',
    executiveSummary: ['fixture'],
    conceptSummaries: [],
    sampleSelectionMethod: ['fixture'],
    samples: ['false_run_liquidity_fade-001', 'false_run_liquidity_fade-002'].map((sampleId) => ({
      sampleId,
      date: '2026-05-28',
      time: '10:00',
      concept: 'false_run_liquidity_fade',
      conceptTitle: 'False-Run Liquidity Fade Near Highs',
      direction: 'SHORT',
      window: 'regular_session',
      classification: 'advisory_only',
      advisoryOnly: true,
      summary: 'Research-only sample.',
      whyAdvisoryOnly: 'Research-only. Existing gates did not independently pass.',
      model1Overlap: false,
      turtleSoupOverlap: false,
      researchDetectorReason: 'fixture',
      warningFailureReason: 'fixture',
      dataQualityNotes: [],
      sampleSourceReportPath: 'fixture-backfill.json',
      agentInspectionLabel: 'keep_advisory',
      agentConfidence: 'medium',
      agentReason: 'fixture',
      agentEvidence: ['fixture'],
      agentConcerns: ['Research-only and cannot approve execution.'],
      agentRecommendedNextStep: 'continue_tracking',
      agentApprovalBoundary: {
        agentApprovesTrade: false,
        agentChangesRules: false,
        agentCreatesEntry: false,
        agentCreatesTargets: false,
        agentPromotesModel: false,
      },
      humanInspectionLabel: null,
      humanConfidence: null,
      humanReason: null,
      humanNotes: null,
      humanReviewedAt: null,
      humanReviewer: null,
      agentHumanAgreement: null,
      disagreementReason: null,
      finalReviewLabel: null,
      finalReviewNotes: null,
    })),
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

function writeFixtureState(statePath: string, reviewPackPath: string): ResearchDiscordReviewState {
  const entry = createResearchDiscordStateEntry({
    packHash: 'packhash001',
    reviewPackPath,
    sampleId: 'false_run_liquidity_fade-001',
    discordMessageId: 'message-1',
    discordChannelId: 'channel-1',
    postedAt: '2026-05-29T20:00:00.000Z',
  });
  const state: ResearchDiscordReviewState = {
    reportType: 'research_discord_review_state',
    updatedAt: '2026-05-29T20:00:00.000Z',
    entries: [entry],
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

const parsedCustomId = parseResearchDiscordReviewCustomId('research_review|packhash001|false_run_liquidity_fade-001|new_model_candidate_review');
assert.equal(parsedCustomId.namespace, 'research_review');
assert.equal(parsedCustomId.packHash, 'packhash001');
assert.equal(parsedCustomId.sampleId, 'false_run_liquidity_fade-001');
assert.equal(parsedCustomId.label, 'new_model_candidate_review');
assert.throws(() => parseResearchDiscordReviewCustomId('trade_review|packhash001|sample|keep_advisory'), /namespace/);
assert.throws(() => parseResearchDiscordReviewCustomId('research_review|packhash001|sample|approve_trade'), /Unsupported/);
validateResearchDiscordInteractionUser('user-1', ['user-1']);
assert.throws(() => validateResearchDiscordInteractionUser('user-2', ['user-1']), /not authorized/);

const temp = mkdtempSync(join(tmpdir(), 'research-discord-interactions-'));
const reviewPackPath = join(temp, 'review-pack.json');
const statePath = join(temp, 'discord-review-state.json');
const pack = fixturePack();
writeFileSync(reviewPackPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
writeFixtureState(statePath, reviewPackPath);
const originalPackText = readFileSync(reviewPackPath, 'utf8');
const customId = 'research_review|packhash001|false_run_liquidity_fade-001|new_model_candidate_review';

const missingMapping = handleResearchDiscordReviewInteraction({
  customId,
  statePath: join(temp, 'missing-state.json'),
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
});
assert.equal(missingMapping.ok, false);
assert.ok(missingMapping.responseContent.includes('No local state mapping'));

const unauthorized = handleResearchDiscordReviewInteraction({
  customId,
  statePath,
  user: { id: 'user-2', username: 'Other' },
  channelId: 'channel-1',
  messageId: 'message-1',
  allowedUserIds: ['user-1'],
});
assert.equal(unauthorized.ok, false);
assert.ok(unauthorized.responseContent.includes('not authorized'));

const missingSampleStatePath = join(temp, 'missing-sample-state.json');
const missingSampleEntry = createResearchDiscordStateEntry({
  packHash: 'packhash002',
  reviewPackPath,
  sampleId: 'missing-sample',
  discordMessageId: 'message-2',
  discordChannelId: 'channel-1',
});
writeFileSync(missingSampleStatePath, `${JSON.stringify({
  reportType: 'research_discord_review_state',
  updatedAt: '2026-05-29T20:00:00.000Z',
  entries: [missingSampleEntry],
}, null, 2)}\n`, 'utf8');
const missingSample = handleResearchDiscordReviewInteraction({
  customId: 'research_review|packhash002|missing-sample|keep_advisory',
  statePath: missingSampleStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-2',
});
assert.equal(missingSample.ok, false);
assert.ok(missingSample.responseContent.includes('Sample not found'));

const result = handleResearchDiscordReviewInteraction({
  customId,
  statePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
  allowedUserIds: ['user-1'],
  reviewedAt: '2026-05-29T22:30:00.000Z',
  messageContent: '[RESEARCH SAMPLE REVIEW] false_run_liquidity_fade-001',
  messageComponents: [{ type: 1, components: [{ type: 2, style: 3, label: 'New Model Candidate', custom_id: customId }] }],
});
assert.equal(result.ok, true);
assert.equal(result.status, 'reviewed');
assert.equal(result.sampleId, 'false_run_liquidity_fade-001');
assert.equal(result.selectedLabel, 'new_model_candidate_review');
assert.ok(result.reviewedPackPath?.endsWith('review-pack.reviewed.json'));
assert.ok(result.reviewedMarkdownPath?.endsWith('review-pack.reviewed.md'));
assert.equal(existsSync(result.reviewedPackPath as string), true);
assert.equal(existsSync(result.reviewedMarkdownPath as string), true);
assert.equal(readFileSync(reviewPackPath, 'utf8'), originalPackText);
assert.ok(result.responseContent.includes('Research-only. This does not approve execution.'));
assert.ok(result.messageUpdate?.content.includes('Reviewed: new_model_candidate_review by Michael'));
assert.equal((result.messageUpdate?.components?.[0].components[0] as { disabled?: boolean }).disabled, true);

const reviewedPack = JSON.parse(readFileSync(result.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
const reviewedSample = reviewedPack.samples[0];
assert.equal(reviewedSample.humanInspectionLabel, 'new_model_candidate_review');
assert.equal(reviewedSample.humanConfidence, 'medium');
assert.equal(reviewedSample.humanReason, 'Selected in Discord research review queue.');
assert.ok(reviewedSample.humanNotes?.includes('Discord user ID: user-1'));
assert.ok(reviewedSample.humanNotes?.includes('Discord username: Michael'));
assert.ok(reviewedSample.humanNotes?.includes('Discord channel ID: channel-1'));
assert.ok(reviewedSample.humanNotes?.includes('Discord message ID: message-1'));
assert.ok(reviewedSample.humanNotes?.includes('Selected label: new_model_candidate_review'));
assert.ok(reviewedSample.humanNotes?.includes('Advisory-only confirmation'));
assert.equal(reviewedSample.humanReviewedAt, '2026-05-29T22:30:00.000Z');
assert.equal(reviewedSample.humanReviewer, 'Michael');
assert.equal(reviewedSample.agentHumanAgreement, false);
assert.ok(reviewedSample.disagreementReason?.includes('Agent labeled this sample'));
assert.equal(reviewedSample.finalReviewLabel, 'new_model_candidate_review');
assert.ok(reviewedSample.finalReviewNotes?.includes('no execution approval'));
assert.equal(reviewedSample.advisoryOnly, true);
assert.equal(reviewedSample.agentApprovalBoundary.agentApprovesTrade, false);
assert.equal(reviewedSample.agentApprovalBoundary.agentChangesRules, false);
assert.equal(reviewedSample.agentApprovalBoundary.agentCreatesEntry, false);
assert.equal(reviewedSample.agentApprovalBoundary.agentCreatesTargets, false);
assert.equal(reviewedSample.agentApprovalBoundary.agentPromotesModel, false);
assert.equal(reviewedPack.samples[1].humanInspectionLabel, null);

const stateAfter = JSON.parse(readFileSync(statePath, 'utf8')) as ResearchDiscordReviewState;
assert.equal(stateAfter.entries[0].reviewed, true);
assert.equal(stateAfter.entries[0].reviewedAt, '2026-05-29T22:30:00.000Z');
assert.equal(stateAfter.entries[0].reviewedBy, 'user-1');
assert.equal(stateAfter.entries[0].selectedLabel, 'new_model_candidate_review');
assert.equal(stateAfter.entries[0].reviewedPackPath, result.reviewedPackPath);
assert.ok(!readFileSync(statePath, 'utf8').includes('test-token-secret'));

const duplicateSame = handleResearchDiscordReviewInteraction({
  customId,
  statePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
});
assert.equal(duplicateSame.ok, true);
assert.equal(duplicateSame.status, 'already_reviewed');
assert.ok(duplicateSame.responseContent.includes('already reviewed'));

const duplicateDifferentLabel = handleResearchDiscordReviewInteraction({
  customId: 'research_review|packhash001|false_run_liquidity_fade-001|reject',
  statePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
});
assert.equal(duplicateDifferentLabel.ok, false);
assert.ok(duplicateDifferentLabel.responseContent.includes('already reviewed'));

const duplicateDifferentUser = handleResearchDiscordReviewInteraction({
  customId,
  statePath,
  user: { id: 'user-2', username: 'Other' },
  channelId: 'channel-1',
  messageId: 'message-1',
});
assert.equal(duplicateDifferentUser.ok, false);
assert.ok(duplicateDifferentUser.responseContent.includes('already reviewed'));

const reviewedJson = JSON.stringify(reviewedPack);
assert.ok(!/"entry"|"stop"|"stopLoss"|"target"|"targets"|"T1"|"T2"|"riskReward"|"canExecute"/.test(reviewedJson));

const parsedArgs = parseResearchDiscordInteractionsArgs([
  '--simulate',
  '--custom-id', customId,
  '--discord-user-id', 'user-1',
  '--discord-username', 'Michael',
  '--state-path', statePath,
  '--port', '8788',
  '--pretty',
]);
assert.equal(parsedArgs.simulate, true);
assert.equal(parsedArgs.customId, customId);
assert.equal(parsedArgs.discordUserId, 'user-1');
assert.equal(parsedArgs.discordUsername, 'Michael');
assert.equal(parsedArgs.statePath, statePath);
assert.equal(parsedArgs.port, 8788);

const cliReviewPackPath = join(temp, 'cli-review-pack.json');
const cliStatePath = join(temp, 'cli-state.json');
writeFileSync(cliReviewPackPath, `${JSON.stringify(fixturePack(), null, 2)}\n`, 'utf8');
writeFixtureState(cliStatePath, cliReviewPackPath);
await runResearchDiscordInteractionsCli([
  '--simulate',
  '--custom-id', customId,
  '--discord-user-id', 'user-1',
  '--discord-username', 'Michael',
  '--state-path', cliStatePath,
  '--pretty',
]);
const cliReviewedPackPath = join(temp, 'cli-review-pack.reviewed.json');
assert.equal(existsSync(cliReviewedPackPath), true);
assert.equal(JSON.parse(readFileSync(cliReviewedPackPath, 'utf8')).samples[0].humanInspectionLabel, 'new_model_candidate_review');

console.log('Research Discord review interaction agent verified.');
