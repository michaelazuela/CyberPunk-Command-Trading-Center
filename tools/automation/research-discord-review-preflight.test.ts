import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildResearchDiscordReviewPreflightReport,
  parseResearchDiscordReviewPreflightArgs,
  renderResearchDiscordReviewPreflightReport,
  type ResearchDiscordReviewPreflightOptions,
} from './research-discord-review-preflight';
import type { WorkflowResult } from './research-discord-review-post';
import type { ResearchDiscordMessagePayload } from '../../src/agents/researchDiscordReviewQueueAgent';

const tempDir = mkdtempSync(path.join(tmpdir(), 'research-discord-review-preflight-'));
const pngPath = path.join(tempDir, 'price-action-review-card-fixture.png');
writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

function payload(labels = ['Approved', 'Not Approved']): ResearchDiscordMessagePayload {
  return {
    content: [
      '[PRICE ACTION REVIEW] time_window_liquidity_delivery-011',
      '',
      'Hypothetical Overlay:',
      'Entry: 7000',
      'Stop Loss: 6996',
      'T1: 7004',
      'T2: 7008',
      '',
      'Outcome Review:',
      'Would it have worked?: Partial',
      'Result: T1 hit',
      '',
      'Research-only. This does not approve execution, change rules, or create trades.',
    ].join('\n'),
    components: [{
      type: 1,
      components: labels.map((label, index) => ({
        type: 2,
        style: index === 0 ? 3 : 4,
        label,
        custom_id: `research_review|pack|sample|${index}`,
      })),
    }],
    allowed_mentions: { parse: [] },
  };
}

function workflow(overrides: Partial<WorkflowResult> = {}): WorkflowResult {
  return {
    from: '2026-01-01',
    to: '2026-05-30',
    symbol: 'MES',
    researchReportPath: 'tools/automation/research-reports/research-backfill-MES-2026-01-01-to-2026-05-30.json',
    reviewPackPath: 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-30.json',
    reviewedOutputPath: 'tools/automation/research-review-packs/research-sample-review-MES-all-2026-05-30.reviewed.json',
    outcomeReportPath: 'tools/automation/research-outcome-reports/research-outcome-math-MES-2026-05-30.json',
    statePath: 'tools/automation/research-review-packs/discord-review-state.json',
    samplesAvailable: 30,
    samplesSelected: 1,
    recommendationCounts: {},
    cardsPosted: 0,
    skippedDuplicates: 16,
    remainingBacklog: 13,
    dryRun: true,
    discordChannelId: null,
    publishResult: {
      reviewPackPath: 'review.json',
      outcomeReportPath: 'outcome.json',
      channelId: null,
      pendingSamplesFound: 14,
      samplesSelected: 1,
      messagesPosted: 0,
      dryRun: true,
      statePath: 'state.json',
      missingCredentials: [],
      packHash: 'pack',
      payloads: [payload()],
      advisoryOnlyConfirmed: true,
      activeContract: { instrument: 'MES 06-26', source: 'bridge-health', warnings: [], bridgeUrl: 'http://127.0.0.1:8765' },
      priceActionCards: [{
        sampleId: 'time_window_liquidity_delivery-011',
        pngPath,
        attached: true,
        postedTextOnly: false,
        chartWithheld: false,
        visualQuality: 'pass',
        cardAttachable: true,
        directionConsistency: 'pass',
        candleRangeCoveragePct: 70,
        labelCollisionRisk: 'low',
        mainChart: {
          timeframe: '5m',
          barsRendered: 7,
          xAxisLabelsRendered: true,
          yAxisLabelsRendered: true,
          priceRange: { min: 6990, max: 7010 },
          timeRange: { from: '2026-05-30T10:00:00', to: '2026-05-30T10:30:00' },
          overlayLevelsAttempted: 4,
          overlayLevelsRendered: 4,
          candleRangeCoveragePct: 70,
          labelCollisionRisk: 'low',
        },
        contextChart: {
          timeframe: '15m',
          barsRendered: 3,
          xAxisLabelsRendered: true,
          yAxisLabelsRendered: true,
          priceRange: { min: 6990, max: 7010 },
          timeRange: { from: '2026-05-30T09:45:00', to: '2026-05-30T10:30:00' },
          overlayLevelsAttempted: 0,
          overlayLevelsRendered: 0,
          candleRangeCoveragePct: 70,
          labelCollisionRisk: 'low',
        },
        skipped: false,
        warnings: [],
        dataSource: 'cache',
        resolvedContract: 'MES 06-26',
      }],
    },
    chartReport: {} as WorkflowResult['chartReport'],
    chartArtifactDir: 'tools/automation/research-review-charts',
    summaryMessagePosted: false,
    chartArtifactsUploaded: false,
    chartUploadFailure: null,
    summaryPostSkippedReason: 'Skipped because --with-price-action-cards is active.',
    activeContract: { instrument: 'MES 06-26', source: 'bridge-health', warnings: [], bridgeUrl: 'http://127.0.0.1:8765' },
    cardsAttached: 1,
    cardsWithheld: 0,
    textOnlyPosts: 0,
    invalidOverlays: 0,
    uploadFailures: 0,
    ...overrides,
  };
}

const options = parseResearchDiscordReviewPreflightArgs([
  '--from', '2026-01-01',
  '--to', 'today',
  '--symbol', 'MES',
  '--limit', '5',
  '--pretty',
]);
assert.equal(options.withPriceActionCards, true);
assert.equal(options.dryRun, true);
assert.equal(options.rawTo, 'today');
assert.match(options.to, /^\d{4}-\d{2}-\d{2}$/);

async function reportFor(result: WorkflowResult, env: Record<string, string | undefined> = {
  RESEARCH_REVIEW_DISCORD_BOT_TOKEN: 'configured',
  RESEARCH_REVIEW_DISCORD_CHANNEL_ID: 'configured',
}): Promise<ReturnType<typeof buildResearchDiscordReviewPreflightReport> extends Promise<infer T> ? T : never> {
  return buildResearchDiscordReviewPreflightReport(options, {
    env,
    runWorkflow: async () => result,
    getBridgeHealth: async () => ({ ok: true, readOnly: true, defaultInstrument: 'MES 06-26' }),
    fingerprintFile: async () => ({ exists: true, size: 10, modifiedMs: 1 }),
  });
}

const passReport = await reportFor(workflow());
assert.equal(passReport.status, 'PREFLIGHT PASS');
assert.equal(passReport.discordPreview.pngOnly, true);
assert.equal(passReport.discordPreview.buttons, 'Approved / Not Approved');
assert.equal(passReport.attachmentFilesReadable, true);
assert.equal(passReport.stateChanged, false);
assert.ok(renderResearchDiscordReviewPreflightReport(passReport).includes('Next live command: npm run research:discord-review:post'));

const warnWorkflow = workflow({
  cardsAttached: 0,
  cardsWithheld: 1,
});
warnWorkflow.publishResult.priceActionCards[0] = {
  ...warnWorkflow.publishResult.priceActionCards[0],
  attached: false,
  postedTextOnly: true,
  chartWithheld: true,
  chartWithheldReason: 'Price action card withheld: overlay direction check failed.',
  visualQuality: 'fail',
  cardAttachable: false,
  directionConsistency: 'fail',
};
const warnReport = await reportFor(warnWorkflow);
assert.equal(warnReport.status, 'PREFLIGHT WARN');
assert.ok(warnReport.warnings.some((warning) => warning.includes('withheld')));

const oldButtonWorkflow = workflow();
oldButtonWorkflow.publishResult.payloads = [payload(['Keep Advisory', 'Reject'])];
const oldButtonReport = await reportFor(oldButtonWorkflow);
assert.equal(oldButtonReport.status, 'PREFLIGHT FAIL');
assert.ok(oldButtonReport.failures.some((failure) => failure.includes('Approved / Not Approved')));

const badAttachedWorkflow = workflow();
badAttachedWorkflow.publishResult.priceActionCards[0] = {
  ...badAttachedWorkflow.publishResult.priceActionCards[0],
  visualQuality: 'fail',
  cardAttachable: false,
};
const badAttachedReport = await reportFor(badAttachedWorkflow);
assert.equal(badAttachedReport.status, 'PREFLIGHT FAIL');
assert.ok(badAttachedReport.failures.some((failure) => failure.includes('visually failed card')));

const missingConfigReport = await reportFor(workflow(), {});
assert.equal(missingConfigReport.status, 'PREFLIGHT FAIL');
assert.ok(missingConfigReport.failures.some((failure) => failure.includes('bot token')));

rmSync(tempDir, { recursive: true, force: true });
