import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseModelCandidateWeeklyBriefArgs,
  renderModelCandidateWeeklyBrief,
  sendModelCandidateWeeklyBrief,
} from './model-candidate-weekly-brief';
import type { ModelCandidateReviewLedger } from './model-candidate-ledger';

function advisoryEvidence(sampleCount: number, approved: number, notApproved: number, warnings: number, adverseFirst = 0): ModelCandidateReviewLedger['conceptSummaries'][number]['modelCandidateAdvisoryEvidence'] {
  return {
    sampleCount,
    humanApprovedCount: approved,
    humanNotApprovedCount: notApproved,
    humanApprovalRate: sampleCount ? approved / sampleCount : undefined,
    agentAssessmentSummary: {
      agreesWithHuman: approved,
      partiallyAgreesWithHuman: 0,
      disagreesWithHuman: notApproved,
      unclearInsufficientEvidence: 0,
    },
    reviewEvidenceSummary: {
      samplesWithChartEvidence: Math.max(0, sampleCount - warnings),
      samplesWithExactPngPath: Math.max(0, sampleCount - warnings),
      samplesWithExactReportPath: Math.max(0, sampleCount - warnings),
      samplesMissingCharts: warnings,
      samplesWithUnknownCharts: 0,
      samplesWithWithheldCharts: 0,
    },
    estimatedGrossContractPnlSummary: {
      rootSymbol: 'MES',
      sampleCountWithPnl: Math.max(0, sampleCount - warnings),
      sampleCountMissingPnl: warnings,
      avgHypotheticalOutcomeDollars: 40,
      status: warnings ? 'partial' : 'available',
    },
    missingDataWarningCount: warnings,
    adverseFirstContradictionCount: adverseFirst,
    boundary: 'research_only_not_execution_authority',
  };
}

function ledgerFixture(overrides: Partial<ModelCandidateReviewLedger> = {}): ModelCandidateReviewLedger {
  const base: ModelCandidateReviewLedger = {
    reportType: 'model_candidate_review_ledger',
    generatedAt: '2026-05-30T20:00:00.000Z',
    from: '2026-05-25',
    to: '2026-05-29',
    symbol: 'MES',
    advisoryOnly: true,
    safety: {
      researchOnly: true,
      approvesExecution: false,
      changesRules: false,
      createsTrades: false,
      writesRag: false,
      writesJournal: false,
      message: 'Research-only. This does not approve execution, change rules, or create trades.',
    },
    thresholds: {
      minimumReviewedSamples: 10,
      minimumApprovalRate: 0.7,
    },
    summary: {
      reviewedSamplesFound: 24,
      approvedCount: 15,
      notApprovedCount: 9,
      ignoredLegacyReviewedSamples: 2,
      conceptsReviewed: 3,
      candidateReviewRecommendedConcepts: 1,
    },
    entries: [
      {
        sampleId: 'twld-001',
        concept: 'time_window_liquidity_delivery',
        conceptTitle: 'Time-Window Liquidity Delivery',
        symbol: 'MES',
        contract: 'MES 06-26',
        date: '2026-05-28',
        time: '10:00',
        direction: 'LONG',
        window: 'morning',
        agentRecommendation: 'Recommended: future model-candidate review',
        humanApprovalState: 'approved_for_future_model_candidate_review',
        ledgerStatus: 'candidate_watchlist',
        humanReason: 'Useful evidence.',
        humanNotes: null,
        chartArtifactPath: 'price-action-review-card-MES-twld-001.png',
        outcomeMathSummary: {
          outcomeClassification: 'favorable_continuation',
          firstMeaningfulMove: 'favorable',
          favorableThresholdOneTouched: true,
          favorableThresholdTwoTouched: true,
          adverseThresholdTouched: false,
          hypotheticalOutcomeLabel: 'favorable_continuation',
        },
        warningState: {
          warnings: [],
          missingChartArtifact: false,
          missingOutcomeMath: false,
        },
        sourceReviewPackPath: 'review-pack.json',
        reviewedOutputPath: 'review-pack.reviewed.json',
        reviewedAt: '2026-05-29T20:00:00.000Z',
        researchOnlyBoundary: {
          advisoryOnly: true,
          approvesExecution: false,
          changesRules: false,
          createsOrders: false,
          writesRag: false,
          writesJournal: false,
        },
      },
      {
        sampleId: 'frlf-001',
        concept: 'false_run_liquidity_fade',
        conceptTitle: 'False-Run Liquidity Fade Near Highs',
        symbol: 'MES',
        contract: 'MES 06-26',
        date: '2026-05-28',
        time: '11:00',
        direction: 'SHORT',
        window: 'morning',
        agentRecommendation: 'Recommended: reject',
        humanApprovalState: 'not_approved_for_future_model_candidate_review',
        ledgerStatus: 'insufficient_evidence',
        humanReason: 'Weak follow-through.',
        humanNotes: null,
        chartArtifactPath: null,
        outcomeMathSummary: {
          outcomeClassification: null,
          firstMeaningfulMove: null,
          favorableThresholdOneTouched: null,
          favorableThresholdTwoTouched: null,
          adverseThresholdTouched: null,
          hypotheticalOutcomeLabel: null,
        },
        warningState: {
          warnings: ['Missing chart artifact.'],
          missingChartArtifact: true,
          missingOutcomeMath: true,
        },
        sourceReviewPackPath: 'review-pack.json',
        reviewedOutputPath: 'review-pack.reviewed.json',
        reviewedAt: '2026-05-29T20:05:00.000Z',
        researchOnlyBoundary: {
          advisoryOnly: true,
          approvesExecution: false,
          changesRules: false,
          createsOrders: false,
          writesRag: false,
          writesJournal: false,
        },
      },
    ],
    conceptSummaries: [
      {
        concept: 'time_window_liquidity_delivery',
        conceptTitle: 'Time-Window Liquidity Delivery',
        totalSamplesReviewed: 10,
        humanApprovedCount: 8,
        humanNotApprovedCount: 2,
        approvalRate: 0.8,
        agentRecommendationDistribution: { 'Recommended: future model-candidate review': 10 },
        directionDistribution: { LONG: 7, SHORT: 3 },
        timeWindowDistribution: { morning: 10 },
        outcomeSummary: { favorable_continuation: 7, neutral: 3 },
        chartAvailabilityCount: 10,
        missingDataWarningsCount: 0,
        candidateReadinessStatus: 'candidate_review_recommended',
        deskRecommendation: 'Desk recommendation: candidate review recommended. Human final decision required before any model promotion or implementation.',
        modelCandidateAdvisoryEvidence: advisoryEvidence(10, 8, 2, 0),
      },
      {
        concept: 'accumulation_manipulation_distribution',
        conceptTitle: 'Accumulation-Manipulation-Distribution Range Model',
        totalSamplesReviewed: 4,
        humanApprovedCount: 3,
        humanNotApprovedCount: 1,
        approvalRate: 0.75,
        agentRecommendationDistribution: { 'Recommended: continue tracking': 4 },
        directionDistribution: { LONG: 2, SHORT: 2 },
        timeWindowDistribution: { morning: 4 },
        outcomeSummary: { favorable_continuation: 2, neutral: 2 },
        chartAvailabilityCount: 3,
        missingDataWarningsCount: 1,
        candidateReadinessStatus: 'insufficient_evidence',
        deskRecommendation: 'Desk recommendation: insufficient evidence. Human final decision required before any model promotion or implementation.',
        modelCandidateAdvisoryEvidence: advisoryEvidence(4, 3, 1, 1),
      },
      {
        concept: 'false_run_liquidity_fade',
        conceptTitle: 'False-Run Liquidity Fade Near Highs',
        totalSamplesReviewed: 10,
        humanApprovedCount: 2,
        humanNotApprovedCount: 8,
        approvalRate: 0.2,
        agentRecommendationDistribution: { 'Recommended: reject': 10 },
        directionDistribution: { SHORT: 10 },
        timeWindowDistribution: { morning: 10 },
        outcomeSummary: { adverse_first: 6, neutral: 4 },
        chartAvailabilityCount: 8,
        missingDataWarningsCount: 2,
        candidateReadinessStatus: 'reject_or_deprioritize',
        deskRecommendation: 'Desk recommendation: reject or deprioritize. Human final decision required before any model promotion or implementation.',
        modelCandidateAdvisoryEvidence: advisoryEvidence(10, 2, 8, 2, 6),
      },
    ],
    warnings: [],
    outputPaths: {
      jsonPath: 'model-candidate-review-ledger.json',
      markdownPath: 'model-candidate-review-ledger.md',
    },
  };
  return { ...base, ...overrides };
}

const newsletter = renderModelCandidateWeeklyBrief(ledgerFixture());
assert.ok(newsletter.includes('Quant Desk Weekly Research Brief'));
assert.ok(newsletter.includes('**Desk Summary**'));
assert.ok(newsletter.includes('**Model Candidate Watchlist**'));
assert.ok(newsletter.includes('Time-Window Liquidity Delivery'));
assert.ok(newsletter.includes('Desk recommendation: Move to formal model-candidate backtest. Human final decision required.'));
assert.ok(newsletter.includes('**Needs More Evidence**'));
assert.ok(newsletter.includes('Accumulation-Manipulation-Distribution Range Model'));
assert.ok(newsletter.includes('Desk recommendation: Continue collecting samples.'));
assert.ok(newsletter.includes('**Rejected / Deprioritized**'));
assert.ok(newsletter.includes('False-Run Liquidity Fade Near Highs'));
assert.ok(newsletter.includes('Desk recommendation: Reject / deprioritize unless new evidence improves the read.'));
assert.ok(newsletter.includes('**Notable Price Action Lessons**'));
assert.ok(newsletter.includes('Research-only. This does not approve execution, change rules, or create trades.'));
assert.ok(newsletter.includes('Human final decision required before any model promotion or implementation.'));
assert.ok(newsletter.includes('Desk recommendation only. Human final decision required before any model promotion, backtest task, or implementation work.'));
assert.ok(!/\b(activate model|trade live|add to scanner immediately|execution approved|can execute|place order|order action)\b/i.test(newsletter));

const emptyNewsletter = renderModelCandidateWeeklyBrief(ledgerFixture({
  summary: {
    reviewedSamplesFound: 0,
    approvedCount: 0,
    notApprovedCount: 0,
    ignoredLegacyReviewedSamples: 0,
    conceptsReviewed: 0,
    candidateReviewRecommendedConcepts: 0,
  },
  entries: [],
  conceptSummaries: [],
}));
assert.ok(emptyNewsletter.includes('No new Approved / Not Approved model-candidate reviews were found this week.'));
assert.ok(emptyNewsletter.includes('Continue reviewing PriceActionReviewCards to build the candidate ledger.'));

const parsed = parseModelCandidateWeeklyBriefArgs([
  '--from', '2026-01-01',
  '--to', 'today',
  '--symbol', 'MES',
  '--dry-run',
  '--pretty',
  '--force',
  '--state-path', 'fixture-state.json',
]);
assert.equal(parsed.from, '2026-01-01');
assert.match(parsed.to, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(parsed.symbol, 'MES');
assert.equal(parsed.dryRun, true);
assert.equal(parsed.force, true);

const temp = mkdtempSync(path.join(tmpdir(), 'model-candidate-weekly-brief-'));
const reviewPackDir = path.join(temp, 'research-review-packs');
const outcomeReportDir = path.join(temp, 'research-outcome-reports');
const chartDir = path.join(temp, 'research-review-charts', 'price-action-review-cards');
const ledgerOutDir = path.join(temp, 'model-candidate-ledger');
const statePath = path.join(temp, 'model-candidate-weekly-brief-state.json');
mkdirSync(reviewPackDir, { recursive: true });
mkdirSync(outcomeReportDir, { recursive: true });
mkdirSync(chartDir, { recursive: true });
mkdirSync(ledgerOutDir, { recursive: true });

let fetchCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  fetchCalls += 1;
  return new Response(JSON.stringify({ id: 'discord-message-1' }), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

const originalToken = process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
const originalChannel = process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;
delete process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
delete process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;

const dryRunResult = await sendModelCandidateWeeklyBrief({
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  dryRun: true,
  force: false,
  pretty: true,
  json: false,
  statePath,
  reviewPackDir,
  outcomeReportDir,
  chartDir,
  ledgerOutDir,
  thresholds: {
    minimumReviewedSamples: 10,
    minimumApprovalRate: 0.7,
  },
});
assert.equal(dryRunResult.posted, false);
assert.equal(dryRunResult.skippedReason, 'Dry-run; no Discord post made.');
assert.equal(fetchCalls, 0);
assert.equal(existsSync(dryRunResult.ledger.outputPaths.jsonPath), true);

const missingConfigResult = await sendModelCandidateWeeklyBrief({
  ...dryRunResult.ledger,
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  dryRun: false,
  force: true,
  pretty: true,
  json: false,
  statePath,
  reviewPackDir,
  outcomeReportDir,
  chartDir,
  ledgerOutDir,
  thresholds: {
    minimumReviewedSamples: 10,
    minimumApprovalRate: 0.7,
  },
});
assert.equal(missingConfigResult.posted, false);
assert.ok(missingConfigResult.skippedReason?.includes('Missing Discord configuration'));
assert.deepEqual(missingConfigResult.missingDiscordConfig.sort(), ['RESEARCH_REVIEW_DISCORD_BOT_TOKEN', 'RESEARCH_REVIEW_DISCORD_CHANNEL_ID'].sort());

writeFileSync(statePath, `${JSON.stringify({
  reportType: 'model_candidate_weekly_brief_state',
  updatedAt: '2026-05-30T20:00:00.000Z',
  postedBriefs: {
    'MES|2026-01-01|2026-05-30': {
      postedAt: '2026-05-30T20:00:00.000Z',
      messageId: 'previous-message',
      dryRun: false,
      ledgerPath: 'model-candidate-review-ledger.json',
    },
  },
}, null, 2)}\n`, 'utf8');
const duplicateResult = await sendModelCandidateWeeklyBrief({
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  dryRun: false,
  force: false,
  pretty: true,
  json: false,
  statePath,
  reviewPackDir,
  outcomeReportDir,
  chartDir,
  ledgerOutDir,
  thresholds: {
    minimumReviewedSamples: 10,
    minimumApprovalRate: 0.7,
  },
});
assert.equal(duplicateResult.posted, false);
assert.equal(duplicateResult.skippedReason, 'Already posted.');
assert.equal(duplicateResult.messageId, 'previous-message');
assert.equal(fetchCalls, 0);

process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN = 'test-token';
process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID = 'test-channel';
const forcedResult = await sendModelCandidateWeeklyBrief({
  from: '2026-01-01',
  to: '2026-05-30',
  symbol: 'MES',
  dryRun: false,
  force: true,
  pretty: true,
  json: false,
  statePath,
  reviewPackDir,
  outcomeReportDir,
  chartDir,
  ledgerOutDir,
  thresholds: {
    minimumReviewedSamples: 10,
    minimumApprovalRate: 0.7,
  },
});
assert.equal(forcedResult.posted, true);
assert.equal(forcedResult.messageId, 'discord-message-1');
assert.equal(fetchCalls, 1);
assert.ok(readFileSync(statePath, 'utf8').includes('discord-message-1'));

globalThis.fetch = originalFetch;
if (originalToken === undefined) delete process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
else process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN = originalToken;
if (originalChannel === undefined) delete process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;
else process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID = originalChannel;

console.log('Model candidate weekly brief verified.');
