import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildSummaryPayload,
  isDuplicateForReviewMode,
  postResearchReviewSummaryWithChartArtifacts,
  selectDiscordChartAttachments,
  shouldPostResearchReviewSummaryCharts,
} from './research-discord-review-post';
import type { ResearchReviewChartReport } from './research-review-chart-report';

function chartReport(averageResearchQualityScore: number | null, base = path.join('tools', 'automation', 'research-review-charts', 'research-review-chart-report-fixture')): ResearchReviewChartReport {
  return {
    generatedAt: '2026-05-30T01:00:00.000Z',
    from: '2026-01-01',
    to: '2026-05-29',
    instrument: 'MES',
    reviewPackPath: 'tools/automation/research-review-packs/fixture.json',
    summaryJsonPath: `${base}.json`,
    summaryMarkdownPath: `${base}.md`,
    chartPaths: {
      riskScoreBySample: `${base}-research-quality-score.png`,
      countByBlockReason: `${base}-block-reasons.png`,
      countBySetupType: `${base}-setup-types.png`,
      executableVsNonExecutable: `${base}-execution-counts.png`,
      reviewedSamplesByDate: `${base}-samples-by-date.png`,
    },
    svgChartPaths: {
      riskScoreBySample: `${base}-research-quality-score.svg`,
      countByBlockReason: `${base}-block-reasons.svg`,
      countBySetupType: `${base}-setup-types.svg`,
      executableVsNonExecutable: `${base}-execution-counts.svg`,
      reviewedSamplesByDate: `${base}-samples-by-date.svg`,
    },
    visualization: {
      sourceLabel: 'fixture.json',
      generatedAt: '2026-05-30T01:00:00.000Z',
      instrument: 'MES',
      rows: [{
        sampleId: 'fixture-001',
        timestamp: '2026-05-29 10:00',
        setupName: 'Time-Window Liquidity Delivery',
        direction: 'LONG',
        decision: 'keep_advisory',
        executableStatus: 'review_only',
        blockReason: 'Research-only historical review.',
        researchQualityScore: averageResearchQualityScore,
        researchQualityLabel: averageResearchQualityScore === null ? 'Unavailable' : 'Moderate',
        riskPoints: null,
        riskScore: averageResearchQualityScore,
        riskLabel: averageResearchQualityScore === null ? 'Unavailable' : 'Moderate',
        entryCandidate: null,
        stopCandidate: null,
        targetArea: 'Not provided',
        humanReviewStatus: 'pending',
        agentAssessmentStatus: 'not_recorded',
        chartEvidenceStatus: 'chart_unknown',
        chartPngPath: null,
        chartSvgPath: null,
        chartReportPath: null,
        estimatedGrossContractPnlStatus: 'not_recorded',
        estimatedGrossContractPnlLabel: 'Not recorded',
        session: 'Unspecified',
        instrument: 'MES',
        sourcePath: null,
        replayCutoff: null,
        raw: {},
      }],
      summary: {
        totalReviewedSamples: 30,
        executableCount: 0,
        nonExecutableCount: 30,
        mostCommonBlockReason: 'Research-only historical review.',
        averageResearchQualityScore,
        averageRiskScore: averageResearchQualityScore,
        samplesWithChartEvidence: 0,
        samplesWithEstimatedGrossContractPnl: 0,
      },
      researchQualityScoreBySample: [{
        sampleId: 'fixture-001',
        timestamp: '2026-05-29 10:00',
        researchQualityScore: averageResearchQualityScore,
        researchQualityLabel: averageResearchQualityScore === null ? 'Unavailable' : 'Moderate',
      }],
      riskScoreBySample: [{
        sampleId: 'fixture-001',
        timestamp: '2026-05-29 10:00',
        riskScore: averageResearchQualityScore,
        riskLabel: averageResearchQualityScore === null ? 'Unavailable' : 'Moderate',
      }],
      countByBlockReason: [{ name: 'Research-only historical review.', count: 30 }],
      countBySetupType: [{ name: 'Time-Window Liquidity Delivery', count: 18 }],
      warnings: averageResearchQualityScore === null ? ['Average Research Quality Score is unavailable.'] : [],
    },
  };
}

const missingRiskReport = chartReport(null);
assert.deepEqual(selectDiscordChartAttachments(missingRiskReport), [
  missingRiskReport.chartPaths.countByBlockReason,
  missingRiskReport.chartPaths.countBySetupType,
  missingRiskReport.chartPaths.executableVsNonExecutable,
  missingRiskReport.chartPaths.reviewedSamplesByDate,
]);

const scoredReport = chartReport(82);
assert.equal(selectDiscordChartAttachments(scoredReport)[0], scoredReport.chartPaths.riskScoreBySample);
assert.equal(shouldPostResearchReviewSummaryCharts({ withPriceActionCards: false, postSummaryCharts: false }), true);
assert.equal(shouldPostResearchReviewSummaryCharts({ withPriceActionCards: true, postSummaryCharts: false }), false);
assert.equal(shouldPostResearchReviewSummaryCharts({ withPriceActionCards: true, postSummaryCharts: true }), true);
assert.equal(isDuplicateForReviewMode({
  packHash: 'legacy',
  reviewPackPath: 'review.json',
  sampleId: 'sample-001',
  discordMessageId: 'message-1',
  discordChannelId: 'channel-1',
  postedAt: '2026-05-30T20:00:00.000Z',
  labelOptions: ['keep_advisory', 'reject'],
  advisoryOnly: true,
  reviewed: false,
}, true), false);
assert.equal(isDuplicateForReviewMode({
  packHash: 'price-action',
  reviewPackPath: 'review.json',
  sampleId: 'sample-001',
  discordMessageId: 'message-1',
  discordChannelId: 'channel-1',
  postedAt: '2026-05-30T20:00:00.000Z',
  labelOptions: ['approved_for_future_model_candidate_review', 'not_approved_for_future_model_candidate_review'],
  advisoryOnly: true,
  reviewed: false,
}, true), true);
assert.equal(isDuplicateForReviewMode({
  packHash: 'legacy',
  reviewPackPath: 'review.json',
  sampleId: 'sample-001',
  discordMessageId: 'message-1',
  discordChannelId: 'channel-1',
  postedAt: '2026-05-30T20:00:00.000Z',
  labelOptions: ['keep_advisory', 'reject'],
  advisoryOnly: true,
  reviewed: false,
}, false), true);

const payload = buildSummaryPayload({
  from: '2026-01-01',
  to: '2026-05-29',
  symbol: 'MES',
  reviewPackPath: 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-30.json',
  manifestPath: 'tools/automation/research-review-packs/latest-review-pack.json',
  chartReport: missingRiskReport,
});
assert.ok(payload.content.length < 2000);
assert.ok(payload.content.includes('Research Review Only'));
assert.ok(payload.content.includes('Average Research Quality Score'));
assert.ok(payload.content.includes('Research Quality Score labels: Unavailable: 1'));
assert.ok(payload.content.includes('Primary workflow: CLI -> review pack -> latest manifest -> local chart artifacts -> Discord review attachments.'));
assert.ok(payload.content.includes('Local chart artifact folder: research-review-charts'));
assert.ok(payload.content.includes('research-review-chart-report-fixture-research-quality-score.png'));
assert.ok(!payload.content.includes('research-review-dashboard'));
assert.ok(!payload.content.includes('Average risk score'));

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const tempDir = mkdtempSync(path.join(tmpdir(), 'research-discord-review-post-'));
const uploadReport = chartReport(null, path.join(tempDir, 'fixture'));
for (const file of Object.values(uploadReport.chartPaths)) writeFileSync(file, '<svg>Research Review Only</svg>', 'utf8');
console.warn = () => undefined;

let fetchCalls = 0;
globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
  fetchCalls += 1;
  if (fetchCalls === 1) {
    assert.ok(init?.body instanceof FormData, 'first summary attempt should use multipart attachments');
    return new Response('upload failed', { status: 400 });
  }
  assert.equal(typeof init?.body, 'string', 'fallback summary should be JSON text only');
  const body = JSON.parse(init?.body as string) as { content: string };
  assert.ok(body.content.includes('Chart upload warning'));
  assert.ok(body.content.includes('Research Review Only'));
  return new Response(JSON.stringify({ id: 'summary-message-1' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}) as typeof fetch;

try {
  const result = await postResearchReviewSummaryWithChartArtifacts({
    channelId: 'test-channel',
    token: 'test-token',
    from: '2026-01-01',
    to: '2026-05-29',
    symbol: 'MES',
    reviewPackPath: 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-30.json',
    manifestPath: 'tools/automation/research-review-packs/latest-review-pack.json',
    chartReport: uploadReport,
  });
  assert.equal(result.messagePosted, true);
  assert.equal(result.chartArtifactsUploaded, false);
  assert.ok(result.chartUploadFailure?.includes('Discord research review post failed'));
  assert.equal(fetchCalls, 2);
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('Research Discord review post summary/upload behavior verified.');
