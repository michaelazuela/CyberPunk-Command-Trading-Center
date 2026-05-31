import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  createResearchDiscordStateEntry,
  PRICE_ACTION_REVIEW_LABELS,
  type ResearchDiscordReviewState,
} from './researchDiscordReviewQueueAgent';
import {
  handleResearchDiscordReviewInteraction,
  parseResearchDiscordReviewCustomId,
  researchOnlySafetyFailureResponse,
  validateResearchDiscordInteractionUser,
} from './researchDiscordReviewInteractionAgent';
import type { ResearchSampleReviewPack } from './researchSampleReviewAgent';
import { calculateEstimatedGrossContractPnl } from '../lib/futuresContractMetadata';
import {
  parseResearchDiscordInteractionsArgs,
  runResearchDiscordInteractionsCli,
} from '../../tools/automation/research-discord-interactions';
import { buildModelCandidateReviewLedger } from '../../tools/automation/model-candidate-ledger';

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
    estimatedGrossContractPnl: calculateEstimatedGrossContractPnl({ outcome: null, sampleSymbol: 'MES' }),
  });
  const state: ResearchDiscordReviewState = {
    reportType: 'research_discord_review_state',
    updatedAt: '2026-05-29T20:00:00.000Z',
    entries: [entry],
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

function writeStateForSample(
  statePath: string,
  reviewPackPath: string,
  sampleId: string,
  packHash = 'packhash001',
  labelOptions?: ResearchDiscordReviewState['entries'][number]['labelOptions'],
): ResearchDiscordReviewState {
  const entry = createResearchDiscordStateEntry({
    packHash,
    reviewPackPath,
    sampleId,
    discordMessageId: 'message-1',
    discordChannelId: 'channel-1',
    postedAt: '2026-05-29T20:00:00.000Z',
    labelOptions,
  });
  const state: ResearchDiscordReviewState = {
    reportType: 'research_discord_review_state',
    updatedAt: '2026-05-29T20:00:00.000Z',
    entries: [entry],
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}

function writeStateForSamples(
  statePath: string,
  reviewPackPath: string,
  samples: Array<{ sampleId: string; packHash: string; messageId?: string }>,
  labelOptions?: ResearchDiscordReviewState['entries'][number]['labelOptions'],
): ResearchDiscordReviewState {
  const state: ResearchDiscordReviewState = {
    reportType: 'research_discord_review_state',
    updatedAt: '2026-05-29T20:00:00.000Z',
    entries: samples.map((sample) => createResearchDiscordStateEntry({
      packHash: sample.packHash,
      reviewPackPath,
      sampleId: sample.sampleId,
      discordMessageId: sample.messageId || `${sample.sampleId}-message`,
      discordChannelId: 'channel-1',
      postedAt: '2026-05-29T20:00:00.000Z',
      labelOptions,
    })),
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
const parsedApprovedCustomId = parseResearchDiscordReviewCustomId('research_review|packhash001|false_run_liquidity_fade-001|approved_for_future_model_candidate_review');
assert.equal(parsedApprovedCustomId.label, 'approved_for_future_model_candidate_review');
const parsedApprovedAliasCustomId = parseResearchDiscordReviewCustomId('research_review|packhash001|false_run_liquidity_fade-001|approved');
assert.equal(parsedApprovedAliasCustomId.label, 'approved_for_future_model_candidate_review');
const parsedNotApprovedAliasCustomId = parseResearchDiscordReviewCustomId('research_review|packhash001|false_run_liquidity_fade-001|not_approved');
assert.equal(parsedNotApprovedAliasCustomId.label, 'not_approved_for_future_model_candidate_review');
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
assert.equal(legacyReviewedPack.samples[0].estimatedGrossContractPnl?.rootSymbol, 'MES');
assert.equal(readFileSync(legacyResult.reviewedMarkdownPath as string, 'utf8').includes('Estimated Gross Contract P/L, 1 Contract'), true);
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
assert.ok(model1Review005.responseContent.includes('label is not allowed'));
assert.equal(existsSync(join(realPackTempDir, 'research-sample-review-MES-all-2026-05-29.reviewed.json')), true);

const turtleStatePath = join(realPackTempDir, 'discord-review-state-turtle.json');
writeStateForSample(turtleStatePath, realPackTempPath, 'time_window_liquidity_delivery-005', 'packhash005');
const turtleReview005 = clickSample005(turtleStatePath, 'possible_turtle_soup_mapping_review');
assert.equal(turtleReview005.ok, false);
assert.ok(turtleReview005.responseContent.includes('label is not allowed'));

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
  messageComponents: [{ type: 1, components: [{ type: 2, style: 3, label: 'Candidate Label Review', custom_id: customId }] }],
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
assert.ok(result.responseContent.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(result.messageUpdate?.content.includes('Reviewed: Candidate Label Review by Michael'));
assert.equal((result.messageUpdate?.components?.[0].components[0] as { disabled?: boolean }).disabled, true);

const reviewedPack = JSON.parse(readFileSync(result.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
const reviewedSample = reviewedPack.samples[0];
assert.equal(reviewedSample.humanInspectionLabel, 'new_model_candidate_review');
assert.equal(reviewedSample.humanConfidence, 'medium');
assert.equal(reviewedSample.humanReason, 'This may be worth reviewing for possible formal candidate labeling later.');
assert.ok(reviewedSample.humanNotes?.includes('Discord user ID: user-1'));
assert.ok(reviewedSample.humanNotes?.includes('Discord username: Michael'));
assert.ok(reviewedSample.humanNotes?.includes('Discord channel ID: channel-1'));
assert.ok(reviewedSample.humanNotes?.includes('Discord message ID: message-1'));
assert.ok(reviewedSample.humanNotes?.includes('Selected label: Candidate Label Review (new_model_candidate_review)'));
assert.ok(reviewedSample.humanNotes?.includes('Label category: watchlist'));
assert.ok(reviewedSample.humanNotes?.includes('Counts toward formal candidate gates: no'));
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
  customId: 'research_review|packhash001|false_run_liquidity_fade-001|keep_advisory',
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

const approvedPackPath = join(temp, 'approved-price-action-review-pack.json');
const approvedStatePath = join(temp, 'approved-price-action-state.json');
writeFileSync(approvedPackPath, `${JSON.stringify(fixturePack(), null, 2)}\n`, 'utf8');
const approvedState = writeStateForSample(approvedStatePath, approvedPackPath, 'false_run_liquidity_fade-001', 'packhash901', PRICE_ACTION_REVIEW_LABELS);
approvedState.entries[0].chartPngPath = join(temp, 'price-action-review-card-false_run_liquidity_fade-001.png');
approvedState.entries[0].chartSvgPath = join(temp, 'audit-chart-false_run_liquidity_fade-001.svg');
approvedState.entries[0].chartReportPath = join(temp, 'research-review-chart-report.md');
approvedState.entries[0].sourceReviewCard = 'Discord PriceActionReviewCard post';
writeFileSync(approvedStatePath, `${JSON.stringify(approvedState, null, 2)}\n`, 'utf8');
const approvedCustomId = 'research_review|packhash901|false_run_liquidity_fade-001|approved';
const approvedResult = handleResearchDiscordReviewInteraction({
  customId: approvedCustomId,
  statePath: approvedStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
  reviewedAt: '2026-05-29T22:40:00.000Z',
  messageContent: '[RESEARCH SAMPLE REVIEW] false_run_liquidity_fade-001',
});
assert.equal(approvedResult.ok, true);
assert.equal(approvedResult.selectedLabel, 'approved_for_future_model_candidate_review');
assert.ok(approvedResult.responseContent.includes('Human review: Approve for Candidate Review'));
assert.ok(approvedResult.responseContent.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(approvedResult.messageUpdate?.content.includes('Reviewed: Approve for Candidate Review by Michael'));
const approvedPack = JSON.parse(readFileSync(approvedResult.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
assert.equal(approvedPack.samples[0].humanInspectionLabel, 'approved_for_future_model_candidate_review');
assert.equal(approvedPack.samples[0].humanReason, 'Human approves this reviewed sample as evidence for future formal model-candidate review/backtest.');
assert.equal(approvedPack.samples[0].finalReviewLabel, 'approved_for_future_model_candidate_review');
assert.equal(approvedPack.samples[0].reviewEvidence?.evidenceStatus, 'chart_available');
assert.equal(approvedPack.samples[0].reviewEvidence?.chartPngPath, approvedState.entries[0].chartPngPath);
assert.equal(approvedPack.samples[0].reviewEvidence?.chartSvgPath, approvedState.entries[0].chartSvgPath);
assert.equal(approvedPack.samples[0].reviewEvidence?.chartReportPath, approvedState.entries[0].chartReportPath);
assert.equal(approvedPack.samples[0].agentAssessment?.boundary, 'research_only_not_execution_authority');
assert.equal(approvedPack.samples[0].agentAssessment?.chartEvidenceAvailable, true);
assert.equal(approvedPack.samples[0].agentAssessment?.chartReportReference, approvedState.entries[0].chartReportPath);
assert.ok(approvedPack.samples[0].agentAssessment?.evidenceChecked.includes('Reviewed JSON'));
assert.ok(approvedPack.samples[0].agentAssessment?.evidenceChecked.some((item) => item.includes(approvedState.entries[0].chartPngPath as string)));
assert.ok(approvedPack.samples[0].agentAssessment?.evidenceChecked.some((item) => item.includes(approvedState.entries[0].chartSvgPath as string)));
assert.ok(approvedPack.samples[0].agentAssessment?.evidenceChecked.some((item) => item.includes(approvedState.entries[0].chartReportPath as string)));
assert.equal(approvedPack.samples[0].advisoryOnly, true);
assert.equal(approvedPack.samples[0].agentApprovalBoundary.agentApprovesTrade, false);
assert.equal(approvedPack.samples[0].agentApprovalBoundary.agentChangesRules, false);
assert.equal(approvedPack.samples[0].agentApprovalBoundary.agentCreatesEntry, false);
assert.equal(approvedPack.samples[0].agentApprovalBoundary.agentCreatesTargets, false);
assert.equal(approvedPack.samples[0].agentApprovalBoundary.agentPromotesModel, false);
assert.ok(!/"entry"|"stop"|"stopLoss"|"target"|"targets"|"T1"|"T2"|"riskReward"|"canExecute"|"ragPayload"|"journalPayload"/.test(JSON.stringify(approvedPack)));

const notApprovedPackPath = join(temp, 'not-approved-price-action-review-pack.json');
const notApprovedStatePath = join(temp, 'not-approved-price-action-state.json');
writeFileSync(notApprovedPackPath, `${JSON.stringify(fixturePack(), null, 2)}\n`, 'utf8');
const notApprovedState = writeStateForSample(notApprovedStatePath, notApprovedPackPath, 'false_run_liquidity_fade-002', 'packhash902', PRICE_ACTION_REVIEW_LABELS);
notApprovedState.entries[0].chartWithheld = true;
notApprovedState.entries[0].chartWithheldReason = 'Price action card withheld: missing bar data for sample window.';
notApprovedState.entries[0].chartPngPath = join(temp, 'withheld-price-action-review-card.png');
writeFileSync(notApprovedStatePath, `${JSON.stringify(notApprovedState, null, 2)}\n`, 'utf8');
const notApprovedResult = handleResearchDiscordReviewInteraction({
  customId: 'research_review|packhash902|false_run_liquidity_fade-002|not_approved',
  statePath: notApprovedStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
  reviewedAt: '2026-05-29T22:45:00.000Z',
});
assert.equal(notApprovedResult.ok, true);
assert.ok(notApprovedResult.responseContent.includes('Human review: Not Approved for Candidate Review'));
assert.ok(notApprovedResult.responseContent.includes('Research-only. This does not approve execution, change rules, or create trades.'));
const notApprovedPack = JSON.parse(readFileSync(notApprovedResult.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
const notApprovedSample = notApprovedPack.samples.find((item) => item.sampleId === 'false_run_liquidity_fade-002');
assert.equal(notApprovedSample?.humanInspectionLabel, 'not_approved_for_future_model_candidate_review');
assert.equal(notApprovedSample?.humanReason, 'Human does not approve this sample as evidence for future formal model-candidate review/backtest.');
assert.equal(notApprovedSample?.agentAssessment?.status, 'unclear_insufficient_evidence');
assert.equal(notApprovedSample?.agentAssessment?.researchUsefulness, 'needs_chart');
assert.equal(notApprovedSample?.agentAssessment?.chartEvidenceAvailable, false);
assert.equal(notApprovedSample?.reviewEvidence?.chartWithheld, true);
assert.equal(notApprovedSample?.reviewEvidence?.evidenceStatus, 'chart_withheld');
assert.equal(notApprovedSample?.reviewEvidence?.chartPngPath, notApprovedState.entries[0].chartPngPath);
assert.equal(notApprovedSample?.advisoryOnly, true);
assert.equal(notApprovedSample?.agentApprovalBoundary.agentApprovesTrade, false);

const phase5bDir = join(temp, 'phase5b-merge');
mkdirSync(phase5bDir, { recursive: true });
const phase5bPack = fixturePack();
phase5bPack.samples = phase5bPack.samples.map((sample, index) => ({
  ...sample,
  sampleId: index === 0 ? 'final_hour_liquidity_draw-030' : 'final_hour_liquidity_draw-027',
  date: '2026-05-13',
  time: index === 0 ? '15:45' : '15:15',
  concept: 'final_hour_liquidity_draw',
  conceptTitle: 'Final-Hour Liquidity Draw',
  direction: 'LONG',
  window: '3:15-3:45 NY',
  agentReason: 'Research-only final-hour liquidity draw review sample.',
}));
const phase5bPackPath = join(phase5bDir, 'research-sample-review-MES-all-2026-05-31.json');
const phase5bStatePath = join(phase5bDir, 'discord-review-state.json');
writeFileSync(phase5bPackPath, `${JSON.stringify(phase5bPack, null, 2)}\n`, 'utf8');
const phase5bState = writeStateForSamples(phase5bStatePath, phase5bPackPath, [
  { sampleId: 'final_hour_liquidity_draw-030', packHash: 'phase5b030' },
  { sampleId: 'final_hour_liquidity_draw-027', packHash: 'phase5b027' },
], PRICE_ACTION_REVIEW_LABELS);
for (const entry of phase5bState.entries) {
  entry.chartPngPath = join(phase5bDir, `price-action-review-card-${entry.sampleId}.png`);
  entry.chartSvgPath = join(phase5bDir, `research-review-chart-report-${entry.sampleId}.svg`);
  entry.chartReportPath = join(phase5bDir, 'research-review-chart-report-MES-2026-01-01-to-2026-05-31.md');
  entry.sourceReviewCard = 'Discord PriceActionReviewCard post';
}
writeFileSync(phase5bStatePath, `${JSON.stringify(phase5bState, null, 2)}\n`, 'utf8');

const approved030 = handleResearchDiscordReviewInteraction({
  customId: 'research_review|phase5b030|final_hour_liquidity_draw-030|approved',
  statePath: phase5bStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-030',
  reviewedAt: '2026-05-31T04:14:19.660Z',
});
assert.equal(approved030.ok, true);
assert.equal(approved030.selectedLabel, 'approved_for_future_model_candidate_review');

const notApproved027 = handleResearchDiscordReviewInteraction({
  customId: 'research_review|phase5b027|final_hour_liquidity_draw-027|not_approved',
  statePath: phase5bStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-027',
  reviewedAt: '2026-05-31T04:15:53.786Z',
});
assert.equal(notApproved027.ok, true);
assert.equal(notApproved027.selectedLabel, 'not_approved_for_future_model_candidate_review');
assert.equal(notApproved027.reviewedPackPath, approved030.reviewedPackPath);

const mergedPhase5bPack = JSON.parse(readFileSync(notApproved027.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
const merged030 = mergedPhase5bPack.samples.find((sample) => sample.sampleId === 'final_hour_liquidity_draw-030');
const merged027 = mergedPhase5bPack.samples.find((sample) => sample.sampleId === 'final_hour_liquidity_draw-027');
assert.equal(merged030?.humanInspectionLabel, 'approved_for_future_model_candidate_review');
assert.equal(merged027?.humanInspectionLabel, 'not_approved_for_future_model_candidate_review');
assert.equal(merged030?.agentAssessment?.boundary, 'research_only_not_execution_authority');
assert.equal(merged027?.agentAssessment?.boundary, 'research_only_not_execution_authority');
assert.equal(merged030?.agentAssessment?.chartEvidenceAvailable, true);
assert.equal(merged027?.agentAssessment?.chartEvidenceAvailable, true);
assert.equal(merged030?.reviewEvidence?.chartPngPath, phase5bState.entries[0].chartPngPath);
assert.equal(merged027?.reviewEvidence?.chartPngPath, phase5bState.entries[1].chartPngPath);
assert.equal(merged030?.reviewEvidence?.chartSvgPath, phase5bState.entries[0].chartSvgPath);
assert.equal(merged027?.reviewEvidence?.chartReportPath, phase5bState.entries[1].chartReportPath);
assert.equal(mergedPhase5bPack.samples.filter((sample) => sample.humanInspectionLabel !== null).length, 2);
const mergedPhase5bMarkdown = readFileSync(notApproved027.reviewedMarkdownPath as string, 'utf8');
assert.ok(mergedPhase5bMarkdown.includes('final_hour_liquidity_draw-030'));
assert.ok(mergedPhase5bMarkdown.includes('final_hour_liquidity_draw-027'));
assert.ok(mergedPhase5bMarkdown.includes('Agent Assessment:'));
assert.ok(mergedPhase5bMarkdown.includes('Boundary: research_only_not_execution_authority'));
assert.ok(mergedPhase5bMarkdown.includes('Chart/Report:'));
assert.ok(mergedPhase5bMarkdown.includes('Evidence Status:'));
assert.ok(mergedPhase5bMarkdown.includes('PNG:'));
assert.ok(mergedPhase5bMarkdown.includes('Report:'));
assert.ok(!/"entry"|"stop"|"stopLoss"|"target"|"targets"|"T1"|"T2"|"riskReward"|"canExecute"|"ragPayload"|"journalPayload"/.test(JSON.stringify(mergedPhase5bPack)));

const phase5bLedgerOut = join(phase5bDir, 'ledger-out');
const phase5bLedger = await buildModelCandidateReviewLedger({
  from: '2026-01-01',
  to: '2026-05-31',
  symbol: 'MES',
  reviewPackDir: phase5bDir,
  outcomeReportDir: join(phase5bDir, 'outcomes'),
  chartDir: join(phase5bDir, 'charts'),
  outDir: phase5bLedgerOut,
  pretty: true,
  json: false,
  thresholds: { minimumReviewedSamples: 10, minimumApprovalRate: 0.7 },
});
assert.equal(phase5bLedger.summary.reviewedSamplesFound, 2);
assert.equal(phase5bLedger.summary.approvedCount, 1);
assert.equal(phase5bLedger.summary.notApprovedCount, 1);
assert.equal(phase5bLedger.entries.some((entry) => entry.sampleId === 'final_hour_liquidity_draw-030'), true);
assert.equal(phase5bLedger.entries.some((entry) => entry.sampleId === 'final_hour_liquidity_draw-027'), true);

const update030 = handleResearchDiscordReviewInteraction({
  customId: 'research_review|phase5b030|final_hour_liquidity_draw-030|not_approved',
  statePath: phase5bStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-030',
  reviewedAt: '2026-05-31T04:20:00.000Z',
});
assert.equal(update030.ok, true);
assert.equal(update030.selectedLabel, 'not_approved_for_future_model_candidate_review');
const updatedPhase5bPack = JSON.parse(readFileSync(update030.reviewedPackPath as string, 'utf8')) as ResearchSampleReviewPack;
const updated030Samples = updatedPhase5bPack.samples.filter((sample) => sample.sampleId === 'final_hour_liquidity_draw-030');
assert.equal(updated030Samples.length, 1);
assert.equal(updated030Samples[0].humanInspectionLabel, 'not_approved_for_future_model_candidate_review');
assert.equal(updated030Samples[0].reviewEvidence?.evidenceStatus, 'chart_available');
assert.equal(updated030Samples[0].reviewEvidence?.chartPngPath, phase5bState.entries[0].chartPngPath);
assert.equal(updated030Samples[0].reviewEvidence?.chartSvgPath, phase5bState.entries[0].chartSvgPath);
assert.equal(updated030Samples[0].reviewEvidence?.chartReportPath, phase5bState.entries[0].chartReportPath);
assert.equal(updated030Samples[0].agentAssessment?.boundary, 'research_only_not_execution_authority');
assert.equal(updatedPhase5bPack.samples.find((sample) => sample.sampleId === 'final_hour_liquidity_draw-027')?.humanInspectionLabel, 'not_approved_for_future_model_candidate_review');
assert.equal(updatedPhase5bPack.samples.filter((sample) => sample.humanInspectionLabel !== null).length, 2);

const disallowedPriceActionLabel = handleResearchDiscordReviewInteraction({
  customId: 'research_review|packhash902|false_run_liquidity_fade-002|keep_advisory',
  statePath: notApprovedStatePath,
  user: { id: 'user-1', username: 'Michael' },
  channelId: 'channel-1',
  messageId: 'message-1',
});
assert.equal(disallowedPriceActionLabel.ok, false);
assert.ok(disallowedPriceActionLabel.responseContent.includes('already reviewed') || disallowedPriceActionLabel.responseContent.includes('not allowed'));

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
