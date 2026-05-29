import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createResearchDiscordStateEntry,
  type ResearchDiscordReviewState,
} from './researchDiscordReviewQueueAgent';
import {
  handleResearchDiscordReviewInteraction,
  parseResearchDiscordReviewCustomId,
  researchOnlySafetyFailureResponse,
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

function writeStateForSample(statePath: string, reviewPackPath: string, sampleId: string, packHash = 'packhash001'): ResearchDiscordReviewState {
  const entry = createResearchDiscordStateEntry({
    packHash,
    reviewPackPath,
    sampleId,
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

function writeOneSampleFixture(tempDir: string, packName: string, mutateSample?: (sample: Record<string, unknown>) => void): {
  reviewPackPath: string;
  statePath: string;
} {
  const pack = fixturePack();
  const sample = pack.samples[0] as unknown as Record<string, unknown>;
  mutateSample?.(sample);
  const reviewPackPath = join(tempDir, packName);
  const statePath = join(tempDir, `${packName.replace(/\.json$/i, '')}-state.json`);
  writeFileSync(reviewPackPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  writeFixtureState(statePath, reviewPackPath);
  return { reviewPackPath, statePath };
}

function click(statePathInput: string) {
  return handleResearchDiscordReviewInteraction({
    customId: 'research_review|packhash001|false_run_liquidity_fade-001|new_model_candidate_review',
    statePath: statePathInput,
    user: { id: 'user-1', username: 'Michael' },
    channelId: 'channel-1',
    messageId: 'message-1',
    reviewedAt: '2026-05-29T22:30:00.000Z',
  });
}

function clickSample005(statePathInput: string, label = 'keep_advisory') {
  return handleResearchDiscordReviewInteraction({
    customId: `research_review|packhash005|time_window_liquidity_delivery-005|${label}`,
    statePath: statePathInput,
    user: { id: 'user-1', username: 'Michael' },
    channelId: 'channel-1',
    messageId: 'message-1',
    reviewedAt: '2026-05-29T22:30:00.000Z',
  });
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

const legacyFixture = writeOneSampleFixture(temp, 'legacy-review-pack.json', (sample) => {
  delete sample.advisoryOnly;
});
const legacyOriginal = readFileSync(legacyFixture.reviewPackPath, 'utf8');
const legacyResult = click(legacyFixture.statePath);
assert.equal(legacyResult.ok, true);
assert.equal(existsSync(legacyResult.reviewedPackPath as string), true);
assert.equal(readFileSync(legacyFixture.reviewPackPath, 'utf8'), legacyOriginal);
const legacyReviewedPack = JSON.parse(readFileSync(legacyResult.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
assert.equal(legacyReviewedPack.samples[0].advisoryOnly, true);
assert.equal(legacyReviewedPack.samples[0].humanInspectionLabel, 'new_model_candidate_review');
assert.ok(!/"entry"|"stop"|"target"|"canExecute"/.test(JSON.stringify(legacyReviewedPack)));

for (const [packName, mutate] of [
  ['unsafe-advisory-false.json', (sample: Record<string, unknown>) => { sample.advisoryOnly = false; }],
  ['unsafe-can-execute.json', (sample: Record<string, unknown>) => { sample.canExecute = true; }],
  ['unsafe-entry.json', (sample: Record<string, unknown>) => { sample.entry = 7597; }],
] as const) {
  const unsafeFixture = writeOneSampleFixture(temp, packName, mutate);
  const unsafeOriginal = readFileSync(unsafeFixture.reviewPackPath, 'utf8');
  const unsafeResult = click(unsafeFixture.statePath);
  assert.equal(unsafeResult.ok, false);
  assert.equal(unsafeResult.responseContent, researchOnlySafetyFailureResponse());
  assert.equal(readFileSync(unsafeFixture.reviewPackPath, 'utf8'), unsafeOriginal);
  assert.equal(existsSync(unsafeResult.reviewedPackPath || join(temp, packName.replace(/\.json$/i, '.reviewed.json'))), false);
}

const realReviewPackSource = resolve('tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-29.json');
assert.equal(existsSync(realReviewPackSource), true);
const realPackTempDir = join(temp, 'real-pack-005');
mkdirSync(realPackTempDir, { recursive: true });
const realPackTempPath = join(realPackTempDir, 'research-sample-review-MES-all-2026-05-29.json');
const realStatePath = join(realPackTempDir, 'discord-review-state.json');
writeFileSync(realPackTempPath, readFileSync(realReviewPackSource, 'utf8'), 'utf8');
writeStateForSample(realStatePath, realPackTempPath, 'time_window_liquidity_delivery-005', 'packhash005');
const realPackOriginal = readFileSync(realPackTempPath, 'utf8');
const keepAdvisory005 = clickSample005(realStatePath);
assert.equal(keepAdvisory005.ok, true);
assert.equal(keepAdvisory005.sampleId, 'time_window_liquidity_delivery-005');
assert.equal(keepAdvisory005.selectedLabel, 'keep_advisory');
assert.equal(readFileSync(realPackTempPath, 'utf8'), realPackOriginal);
const reviewed005 = JSON.parse(readFileSync(keepAdvisory005.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
const reviewed005Sample = reviewed005.samples.find((sample) => sample.sampleId === 'time_window_liquidity_delivery-005');
assert.ok(reviewed005Sample);
assert.equal(reviewed005Sample.humanInspectionLabel, 'keep_advisory');
assert.equal(reviewed005Sample.advisoryOnly, true);
assert.equal(reviewed005Sample.agentApprovalBoundary.agentApprovesTrade, false);
assert.ok(!/"entry"|"stop"|"target"|"canExecute"/.test(JSON.stringify(reviewed005Sample)));

const model1StatePath = join(realPackTempDir, 'discord-review-state-model1.json');
writeStateForSample(model1StatePath, realPackTempPath, 'time_window_liquidity_delivery-005', 'packhash005');
const model1Review005 = clickSample005(model1StatePath, 'possible_model1_mapping_review');
assert.equal(model1Review005.ok, false);
assert.ok(model1Review005.responseContent.includes('Insufficient Context'));
assert.equal(existsSync(join(realPackTempDir, 'research-sample-review-MES-all-2026-05-29.reviewed.json')), true);

const turtleStatePath = join(realPackTempDir, 'discord-review-state-turtle.json');
writeStateForSample(turtleStatePath, realPackTempPath, 'time_window_liquidity_delivery-005', 'packhash005');
const turtleReview005 = clickSample005(turtleStatePath, 'possible_turtle_soup_mapping_review');
assert.equal(turtleReview005.ok, false);
assert.ok(turtleReview005.responseContent.includes('Insufficient Context'));

const missingActivePackStatePath = join(realPackTempDir, 'discord-review-state-missing-active-sample.json');
writeStateForSample(missingActivePackStatePath, realPackTempPath, 'missing-sample-999', 'packhash005');
const missingActivePackSample = handleResearchDiscordReviewInteraction({
  customId: 'research_review|packhash005|missing-sample-999|keep_advisory',
  statePath: missingActivePackStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
});
assert.equal(missingActivePackSample.ok, false);
assert.ok(missingActivePackSample.responseContent.includes('Sample not found in active review pack JSON'));
assert.ok(missingActivePackSample.responseContent.includes('No review was written'));

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
