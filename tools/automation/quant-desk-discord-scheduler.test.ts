import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  buildDailyCloseBrief,
  buildWeeklyWrapBrief,
  collectReviewFacts,
  parseQuantDeskDiscordSchedulerArgs,
  sendScheduledReport,
} from './quant-desk-discord-scheduler';
import type { ResearchDiscordReviewState } from '../../src/agents/researchDiscordReviewQueueAgent';
import type { ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

const temp = mkdtempSync(join(tmpdir(), 'quant-desk-discord-scheduler-'));
const reviewPackDir = join(temp, 'research-review-packs');
const outcomeDir = join(temp, 'research-outcome-reports');
const validationDir = join(temp, 'research-validation-reports');
const modelCandidateLedgerDir = join(temp, 'model-candidate-ledger');
const modelCandidateChartDir = join(temp, 'research-review-charts', 'price-action-review-cards');
const statePath = join(temp, 'discord-report-state.json');
const reviewStatePath = join(reviewPackDir, 'discord-review-state.json');
const modelCandidateBriefStatePath = join(modelCandidateLedgerDir, 'model-candidate-weekly-brief-state.json');

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const pack: ResearchSampleReviewPack = {
  reportType: 'research_sample_review_pack',
  generatedAt: '2026-05-29T20:00:00.000Z',
  instrument: 'MES',
  concept: 'all',
  requestedSampleSize: 2,
  selectedSampleCount: 2,
  sourceReportPaths: [],
  sampleSourceMode: 'full_candidate_events',
  executiveSummary: [],
  conceptSummaries: [],
  sampleSelectionMethod: [],
  samples: [
    {
      sampleId: 'time_window_liquidity_delivery-001',
      date: '2026-05-29',
      time: '10:00',
      concept: 'time_window_liquidity_delivery',
      conceptTitle: 'Time-Window Liquidity Delivery',
      direction: 'LONG',
      window: 'morning',
      classification: 'advisory_only',
      advisoryOnly: true,
      summary: 'Research-only sample.',
      whyAdvisoryOnly: 'Human review required.',
      model1Overlap: false,
      historicalReversalOverlap: false,
      researchDetectorReason: 'Research detector only.',
      warningFailureReason: 'No executable approval.',
      dataQualityNotes: [],
      sampleSourceReportPath: 'source.json',
      agentInspectionLabel: 'keep_advisory',
      agentConfidence: 'medium',
      agentReason: 'Keep advisory for research tracking.',
      agentEvidence: [],
      agentConcerns: [],
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
    },
    {
      sampleId: 'false_run_liquidity_fade-001',
      date: '2026-05-29',
      time: '11:00',
      concept: 'false_run_liquidity_fade',
      conceptTitle: 'False-Run Liquidity Fade Near Highs',
      direction: 'SHORT',
      window: 'morning',
      classification: 'advisory_only',
      advisoryOnly: true,
      summary: 'Second research-only sample.',
      whyAdvisoryOnly: 'Human review required.',
      model1Overlap: false,
      historicalReversalOverlap: false,
      researchDetectorReason: 'Research detector only.',
      warningFailureReason: 'No executable approval.',
      dataQualityNotes: [],
      sampleSourceReportPath: 'source.json',
      agentInspectionLabel: 'reject',
      agentConfidence: 'medium',
      agentReason: 'Reject for research quality.',
      agentEvidence: [],
      agentConcerns: [],
      agentRecommendedNextStep: 'reject_sample',
      agentApprovalBoundary: {
        agentApprovesTrade: false,
        agentChangesRules: false,
        agentCreatesEntry: false,
        agentCreatesTargets: false,
        agentPromotesModel: false,
      },
      humanInspectionLabel: 'reject',
      humanConfidence: 'medium',
      humanReason: 'Reviewed.',
      humanNotes: 'Research-only.',
      humanReviewedAt: '2026-05-29T21:00:00.000Z',
      humanReviewer: 'user-1',
      agentHumanAgreement: true,
      disagreementReason: null,
      finalReviewLabel: 'reject',
      finalReviewNotes: 'Research-only.',
    },
  ],
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
  markdown: '',
};

const reviewState: ResearchDiscordReviewState = {
  reportType: 'research_discord_review_state',
  updatedAt: '2026-05-29T21:00:00.000Z',
  entries: [
    {
      packHash: 'packhash001',
      reviewPackPath: join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.json'),
      sampleId: 'time_window_liquidity_delivery-001',
      discordMessageId: 'message-1',
      discordChannelId: 'channel-1',
      postedAt: '2026-05-29T20:00:00.000Z',
      labelOptions: ['keep_advisory', 'reject', 'historical_mapping_review', 'historical_reversal_mapping_review', 'human_rule_review_queue', 'new_model_candidate_review', 'insufficient_context'],
      advisoryOnly: true,
      reviewed: false,
    },
    {
      packHash: 'packhash001',
      reviewPackPath: join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.json'),
      sampleId: 'false_run_liquidity_fade-001',
      discordMessageId: 'message-2',
      discordChannelId: 'channel-1',
      postedAt: '2026-05-29T20:05:00.000Z',
      labelOptions: ['keep_advisory', 'reject', 'historical_mapping_review', 'historical_reversal_mapping_review', 'human_rule_review_queue', 'new_model_candidate_review', 'insufficient_context'],
      advisoryOnly: true,
      reviewed: true,
      reviewedAt: '2026-05-29T21:00:00.000Z',
      reviewedBy: 'user-1',
      selectedLabel: 'reject',
      reviewedPackPath: join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.reviewed.json'),
    },
  ],
};

writeJson(join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.json'), pack);
writeJson(join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.reviewed.json'), pack);
writeJson(reviewStatePath, reviewState);
writeJson(join(outcomeDir, 'research-outcome-math-MES-2026-05-29.json'), { reportType: 'research_outcome_math' });
writeJson(join(validationDir, 'research-model-validation-2026-05-29.json'), { reportType: 'research_model_validation' });

const options = parseQuantDeskDiscordSchedulerArgs([
  '--once',
  'daily',
  '--dry-run',
  '--timezone',
  'America/Los_Angeles',
  '--state-path',
  statePath,
  '--review-state-path',
  reviewStatePath,
  '--review-pack-dir',
  reviewPackDir,
  '--outcome-report-dir',
  outcomeDir,
  '--validation-report-dir',
  validationDir,
  '--model-candidate-brief-state-path',
  modelCandidateBriefStatePath,
  '--model-candidate-ledger-out',
  modelCandidateLedgerDir,
  '--model-candidate-chart-dir',
  modelCandidateChartDir,
]);

const facts = await collectReviewFacts(options, {
  reportType: 'quant_desk_discord_report_state',
  updatedAt: '2026-05-29T21:00:00.000Z',
  lastRunAt: null,
  dailyReports: {},
  weeklyReports: {},
  startupReviewPublishes: {
    [join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.json')]: {
      checkedAt: '2026-05-29T21:05:00.000Z',
      reviewPackPath: join(reviewPackDir, 'research-sample-review-MES-all-2026-05-29.json'),
      messagesPosted: 0,
      skippedAsDuplicates: 2,
      dryRun: true,
    },
  },
}, '2026-05-29');
assert.equal(facts.generatedSamples, 2);
assert.equal(facts.postedCards, 2);
assert.equal(facts.duplicateSkipped, 2);
assert.equal(facts.humanReviewed, 1);
assert.equal(facts.labelCounts.reject, 1);

const dailyBrief = buildDailyCloseBrief(facts);
assert.ok(dailyBrief.includes('[QUANT DESK DAILY CLOSE BRIEF] 2026-05-29'));
assert.ok(dailyBrief.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(dailyBrief.includes('Skipped as duplicates: 2'));
assert.ok(!/canExecute|order instructions/i.test(dailyBrief));

const weeklyBrief = buildWeeklyWrapBrief(facts);
assert.ok(weeklyBrief.includes('[QUANT DESK WEEKLY WRAP-UP BRIEF]'));
assert.ok(weeklyBrief.includes('Human Rule Review Queue count: 0'));
assert.ok(weeklyBrief.includes('Research-only. This does not approve execution, change rules, or create trades.'));

const first = await sendScheduledReport('daily', options, true);
assert.equal(first.sent, true);
assert.equal(existsSync(statePath), true);
const second = await sendScheduledReport('daily', options, false);
assert.equal(second.sent, false);
assert.equal(second.skippedReason, 'Already posted.');
assert.ok(readFileSync(statePath, 'utf8').includes('quant_desk_discord_report_state'));

const weekly = await sendScheduledReport('weekly', options, true);
assert.equal(weekly.sent, true);
assert.ok(weekly.modelCandidateWeeklyBrief);
assert.equal(weekly.modelCandidateWeeklyBrief.posted, false);
assert.equal(weekly.modelCandidateWeeklyBrief.skippedReason, 'Dry-run; no Discord post made.');
assert.ok(weekly.modelCandidateWeeklyBrief.content.includes('Quant Desk Weekly Research Brief'));
assert.ok(weekly.modelCandidateWeeklyBrief.content.includes('No new Approved / Not Approved model-candidate reviews were found this week.'));
assert.ok(weekly.modelCandidateWeeklyBrief.content.includes('Research-only. This does not approve execution, change rules, or create trades.'));

console.log('Quant Desk Discord scheduler verified.');
