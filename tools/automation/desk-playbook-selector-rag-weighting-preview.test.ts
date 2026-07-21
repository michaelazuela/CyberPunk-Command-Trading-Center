import assert from 'node:assert/strict';
import { buildDeskPlaybookRagWeightingPreviewReport } from './desk-playbook-selector-rag-weighting-preview';

const previewReport = {
  reportType: 'desk_playbook_selector_preview' as const,
  generatedAt: '2026-07-21T00:00:00.000Z',
  summary: {
    sourceWindows: 4,
    previewTickets: 4,
    noTradeWindows: 0,
    shortTickets: 2,
    longTickets: 2,
    currentRunArtifacts: 2,
    staleArtifacts: 0,
  },
  tickets: [
    {
      date: '2026-06-09',
      session: 'morning' as const,
      decision: 'watch' as const,
      direction: 'SHORT' as const,
      primaryModel: 'IntradayMssMicroContinuation',
      marketStory: 'high_raid_reversal_down',
      primaryPlan: { entry: 7441, stop: 7491.25, target1: 7365.75, target2: 7340.5, riskPoints: 50.25, proofTime: '10:25' },
      authority: { humanReviewOnly: true as const, canExecuteChanged: false as const, discordEligibleChanged: false as const, generatedFromSavedResearch: true as const },
    },
    {
      date: '2026-06-10',
      session: 'lunch' as const,
      decision: 'watch' as const,
      direction: 'LONG' as const,
      primaryModel: 'OpeningDriveFvgContinuation',
      marketStory: 'bullish_drive',
      primaryPlan: { entry: 7400, stop: 7390, target1: 7415, target2: 7420, riskPoints: 10, proofTime: '13:00' },
      authority: { humanReviewOnly: true as const, canExecuteChanged: false as const, discordEligibleChanged: false as const, generatedFromSavedResearch: true as const },
    },
    {
      date: '2026-06-11',
      session: 'morning' as const,
      decision: 'watch' as const,
      direction: 'LONG' as const,
      primaryModel: 'SweepMssFvgRetrace',
      marketStory: 'low_raid_reversal_up',
      primaryPlan: { entry: 7410, stop: 7400, target1: 7425, target2: 7430, riskPoints: 10, proofTime: '10:00' },
      authority: { humanReviewOnly: true as const, canExecuteChanged: false as const, discordEligibleChanged: false as const, generatedFromSavedResearch: true as const },
    },
    {
      date: '2026-06-12',
      session: 'lunch' as const,
      decision: 'watch' as const,
      direction: 'SHORT' as const,
      primaryModel: 'AfterLunchDriveFvgContinuation',
      marketStory: 'bearish_drive',
      primaryPlan: { entry: 7390, stop: 7400, target1: 7375, target2: 7370, riskPoints: 10, proofTime: '13:30' },
      authority: { humanReviewOnly: true as const, canExecuteChanged: false as const, discordEligibleChanged: false as const, generatedFromSavedResearch: true as const },
    },
  ],
};

const report = await buildDeskPlaybookRagWeightingPreviewReport({
  previewReportPath: 'diagnostic-reports/selector-preview.json',
  previewReport,
  ragMemoryRows: [
    { session_type: 'morning', setupType: 'IntradayMssMicroContinuation', direction: 'SHORT', trade_result: 'win', pnl_dollars: 250 },
    { session_type: 'morning', setupType: 'IntradayMssMicroContinuation', direction: 'SHORT', trade_result: 'win', pnl_dollars: 125 },
    { session_type: 'morning', setupType: 'IntradayMssMicroContinuation', direction: 'SHORT', trade_result: 'win', pnl_dollars: 75 },
    { session_type: 'lunch', setupType: 'OpeningDriveFvgContinuation', direction: 'LONG', trade_result: 'loss', pnl_dollars: -100 },
    { session_type: 'lunch', setupType: 'OpeningDriveFvgContinuation', direction: 'LONG', trade_result: 'loss', pnl_dollars: -120 },
    { session_type: 'lunch', setupType: 'OpeningDriveFvgContinuation', direction: 'LONG', trade_result: 'win', pnl_dollars: 50 },
    { session_type: 'morning', plan_source: 'SweepMssFvgRetrace', direction: 'LONG', outcome: 'win', pnl_dollars: 40 },
  ],
}, '2026-07-21T00:00:00.000Z');

assert.equal(report.reportType, 'desk_playbook_selector_rag_weighting_preview');
assert.equal(report.summary.sourcePreviewTickets, 4);
assert.equal(report.summary.weightedTickets, 4);
assert.equal(report.summary.boosted, 1);
assert.equal(report.summary.penalized, 1);
assert.equal(report.summary.insufficientMemory, 1);
assert.equal(report.summary.noMatchingMemory, 1);
assert.equal(report.summary.ragMemoryRowsRead, 7);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.usesRagAsAdvisoryWeightOnly, true);

const boosted = report.tickets.find((ticket) => ticket.primaryModel === 'IntradayMssMicroContinuation');
assert.equal(boosted?.ragAdjustment, 'boost');
assert.equal(boosted?.weightedDecision, 'watch_boosted');
assert.equal(boosted?.memoryStats.wins, 3);
assert.equal(boosted?.memoryStats.scratches, 0);

const penalized = report.tickets.find((ticket) => ticket.primaryModel === 'OpeningDriveFvgContinuation');
assert.equal(penalized?.ragAdjustment, 'penalty');
assert.equal(penalized?.weightedDecision, 'watch_caution');

const insufficient = report.tickets.find((ticket) => ticket.primaryModel === 'SweepMssFvgRetrace');
assert.equal(insufficient?.ragAdjustment, 'insufficient_memory');
assert.equal(insufficient?.memoryStats.completedRows, 1);

const noMemory = report.tickets.find((ticket) => ticket.primaryModel === 'AfterLunchDriveFvgContinuation');
assert.equal(noMemory?.ragAdjustment, 'no_matching_memory');
assert.match(report.markdown, /RAG Weighting Preview/);

console.log('Desk playbook selector RAG weighting preview verified.');
