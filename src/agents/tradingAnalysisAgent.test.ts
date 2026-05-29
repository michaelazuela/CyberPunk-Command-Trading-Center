import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildWeeklyTradingAnalysisReport } from './tradingAnalysisAgent';
import {
  collectWeeklyReportInput,
  parseWeeklyReportArgs,
  publishWeeklyTradingNewsletter,
  shouldSendWeeklyDiscordReport,
  weeklyReportKey,
} from '../../tools/automation/weekly-trading-report';
import {
  loadDiscordAuditHistory,
  loadHealthAuditHistory,
  loadWatchlistAuditHistory,
  normalizeScannerAuditRecord,
} from '../../tools/automation/scanner-audit-import';

const report = buildWeeklyTradingAnalysisReport({
  weekEnding: '2026-05-29',
  instrument: 'MES',
  diagnosticReports: [
    {
      finalClassification: 'A_VALID_APPROVED_NO_ALERT',
      instrument: 'MES',
      scannerAlertReview: { reason: 'No alert state was written.' } as never,
    },
    {
      finalClassification: 'B_APPROVED_ALREADY_TRIGGERED',
      instrument: 'MES',
      newPlanRecommendation: { reason: 'No fresh entry remained.' } as never,
    },
    {
      finalClassification: 'C_UNAPPROVED_ICT_FVG_WATCHLIST',
      instrument: 'MES',
      newPlanRecommendation: { reason: 'ICT-style component only.' } as never,
    },
  ],
  watchlistRecords: [
    {
      memoryType: 'watchlist_context',
      watchlistType: 'morning_continuation_watchlist',
      instrument: 'MES',
      status: 'WATCH_ONLY',
    },
  ],
  healthEvents: [
    { status: 'READY', summary: 'OK' },
    { status: 'DEGRADED', summary: 'Macro unavailable' },
    { status: 'BLOCKED', summary: 'Bridge stale' },
  ],
  tradeAlertRecords: [{ state: 'Executable', sentAt: '2026-05-29T10:00:00Z', sent: true }],
  researchBackfillReports: [{
    reportType: 'historical_research_backfill',
    instrument: 'MES',
    conceptReports: [{
      conceptId: 'time_window_liquidity_delivery',
      title: 'Time-Window Liquidity Delivery',
      totalCandidates: 3,
      datesReviewed: { from: '2026-05-28', to: '2026-05-28' },
      dataGaps: [],
      classificationCounts: { model1Overlap: 0, turtleSoupOverlap: 0, advisoryOnly: 3 },
      approvedModelOverlaps: { model1: 0, turtleSoup: 0 },
      advisoryOnlyCount: 3,
      commonReasons: [],
      sampleEvents: [],
      sampleThreshold: { minimum: 20, current: 3, met: false },
      metrics: {},
      recommendation: 'continue_collecting',
      ruleChangeRecommendation: 'none',
    }],
    approvedModelOverlap: { model1: 0, turtleSoup: 0, total: 0 },
  }],
  researchNotes: [{
    researchTitle: 'Final-Hour Liquidity Draw Research',
    status: 'research_only',
    candidateName: 'Final-Hour Liquidity Draw Watchlist',
    primaryIdea: 'Late-day draw toward clean buy-side liquidity during 3:15-3:45 ET.',
    recommendedNextStep: 'Collect 20-30 bridge-backed examples before rule review.',
    approvalBoundarySummary: 'Research only: no rules, entries, stops, targets, alerts, or model promotion.',
    includeInWeeklyNewsletter: true,
  }, {
    researchTitle: 'False-Run Liquidity Fade Near Highs Research',
    status: 'research_only',
    candidateName: 'False-Run Liquidity Fade Near Highs Watchlist',
    primaryIdea: 'Fade a run toward ATH or major buy-side liquidity when price fails to sustain and begins drawing toward sell-side liquidity.',
    taxonomyNote: 'If sweep + reclaim exists, evaluate through existing Turtle Soup; otherwise keep as advisory research.',
    recommendedNextStep: 'Collect 20-30 bridge-backed examples before any rule review.',
    ruleChange: 'none',
    approvalBoundarySummary: 'Research only: no rules, entries, stops, targets, alerts, or model promotion.',
    includeInWeeklyNewsletter: true,
  }, {
    researchTitle: 'Time-Window Liquidity Delivery Research',
    status: 'research_only',
    candidateName: 'Time-Window Liquidity Delivery Watchlist',
    primaryIdea: 'Study FVG/inefficiency delivery toward liquidity during defined market windows.',
    taxonomyNote: 'If Model 1 or Turtle Soup gates pass, classify through existing approved models; otherwise keep as advisory research.',
    recommendedNextStep: 'Collect 20-30 bridge-backed examples per window before any rule review.',
    ruleChange: 'none',
    approvalBoundarySummary: 'Research only: no rules, entries, stops, targets, alerts, or model promotion.',
    includeInWeeklyNewsletter: true,
  }, {
    researchTitle: 'Accumulation-Manipulation-Distribution Range Model Research',
    status: 'research_only',
    candidateName: 'Accumulation–Manipulation–Distribution Range Model Watchlist',
    primaryIdea: 'Study open-based accumulation, liquidity manipulation, and later distribution behavior.',
    taxonomyNote: 'If Model 1 or Turtle Soup gates pass, classify through existing approved models; otherwise keep as advisory research.',
    recommendedNextStep: 'Collect 20-30 bridge-backed examples before any rule review.',
    ruleChange: 'none',
    approvalBoundarySummary: 'Research only: no rules, entries, stops, targets, alerts, or model promotion.',
    includeInWeeklyNewsletter: true,
  }],
});

assert.equal(report.reportType, 'weekly_trading_intelligence');
assert.equal(report.counts.confirmedMissedApprovedTrades, 1);
assert.equal(report.counts.alreadyTriggeredNoFreshEntry, 1);
assert.equal(report.counts.ictStyleWatchlistOnlyEvents, 1);
assert.equal(report.counts.tradeAlertsSent, 1);
assert.equal(report.counts.tradeAuditEvents, 1);
assert.equal(report.counts.watchlists, 1);
assert.equal(report.counts.healthReady, 1);
assert.equal(report.counts.healthDegraded, 1);
assert.equal(report.counts.healthBlocked, 1);
assert.equal(report.recommendations.automaticRuleChangesRecommended, false);
assert.equal(report.approvalBoundary.weeklyReportRunsDiagnostics, false);
assert.equal(report.discordPayload.embeds.length, 0);
assert.equal('components' in report.discordPayload, false);
assert.equal('files' in report.discordPayload, false);
assert.ok(report.discordPayload.content.length <= 1900);
assert.notEqual(report.discordPayload.content, report.discordMessage);
assert.ok(report.discordPayload.content.includes('[WEEKLY TRADING INTELLIGENCE] MES'));
assert.ok(report.discordPayload.content.includes('Summary:'));
assert.ok(report.discordPayload.content.includes('Trade alerts sent: 1'));
assert.ok(report.discordPayload.content.includes('Trade audit events: 1'));
assert.ok(!report.discordPayload.content.includes('Trade alerts: 1'));
assert.ok(report.discordPayload.content.includes('Research Desk:'));
assert.ok(report.discordPayload.content.includes('- AMD Range Model: research-only'));
assert.ok(report.discordPayload.content.includes('Research Backfill:\nReports: 1 | Candidates: 3 | Promotions: 0'));
assert.ok(report.discordPayload.content.includes('Authority:\nRead-only. No rule changes, entries, stops, targets, or model promotion.'));
assert.ok(!report.discordPayload.content.includes('Taxonomy:'));
assert.ok(!report.discordPayload.content.includes('Fade a run toward ATH or major buy-side liquidity when price fails to sustain'));
assert.ok(!/^Entry:|^Stop:|^T1:|^T2:/im.test(report.discordPayload.content));
assert.ok(!/Trade now|Entry confirmed|ApprovedTrade/i.test(report.discordMessage));
assert.ok(report.discordMessage.includes('No rule changes'));
assert.ok(report.discordMessage.includes('Executive Summary:'));
assert.ok(report.discordMessage.includes('Trade alerts sent: 1'));
assert.ok(report.discordMessage.includes('Trade audit events: 1'));
assert.ok(!report.discordMessage.includes('Trade alerts: 1'));
assert.ok(!report.discordMessage.includes('ICT-style'));
assert.ok(!report.discordMessage.includes('Advisory research-only events: 1'));
assert.ok(report.discordMessage.includes('Live advisory watchlist alerts: 1'));
assert.ok(report.discordMessage.includes('Key Story:'));
assert.ok(report.discordMessage.includes('Research Desk:'));
assert.ok(report.discordMessage.includes('Research Backfill:'));
assert.ok(report.discordMessage.includes([
  'Research Backfill:',
  '- Reports scanned: 1',
  '- Research candidates: 3',
  '- Advisory-only events: 3',
  '- Approved model overlaps: 0',
  '- Executable model promotions: 0',
  '- Rule change: none',
].join('\n')));
assert.ok(report.discordMessage.includes('What We Learned: Watchlists improved awareness without creating trade authority.'));
assert.ok(report.discordMessage.includes('Final-Hour Liquidity Draw Watchlist'));
assert.ok(!report.discordMessage.includes('Final-Hour ICT-Style Liquidity Draw Watchlist'));
assert.ok(report.discordMessage.includes('False-Run Liquidity Fade Near Highs Watchlist'));
assert.ok(report.discordMessage.includes('Time-Window Liquidity Delivery Watchlist'));
assert.ok(report.discordMessage.includes('Accumulation–Manipulation–Distribution Range Model Watchlist'));
assert.ok(report.discordMessage.includes([
  '- False-Run Liquidity Fade Near Highs Watchlist',
  '  Status: research-only / not executable',
  '  Idea: Fade a run toward ATH or major buy-side liquidity when price fails to sustain and begins drawing toward sell-side liquidity.',
  '  Taxonomy: If sweep + reclaim exists, evaluate through existing Turtle Soup; otherwise keep as advisory research.',
  '  Next step: Collect 20-30 bridge-backed examples before any rule review.',
  '  Rule change: none.',
].join('\n')));
assert.ok(report.discordMessage.includes([
  '- Final-Hour Liquidity Draw Watchlist',
  '  Status: research-only / not executable',
  '  Idea: Late-day draw toward clean buy-side liquidity during 3:15-3:45 ET.',
  '  Next step: Collect 20-30 bridge-backed examples before rule review.',
  '  Rule change: none.',
].join('\n')));
assert.ok(report.discordMessage.includes([
  '- Time-Window Liquidity Delivery Watchlist',
  '  Status: research-only / not executable',
  '  Idea: Study FVG/inefficiency delivery toward liquidity during defined market windows.',
  '  Taxonomy: If Model 1 or Turtle Soup gates pass, classify through existing approved models; otherwise keep as advisory research.',
  '  Next step: Collect 20-30 bridge-backed examples per window before any rule review.',
  '  Rule change: none.',
].join('\n')));
assert.ok(report.discordMessage.includes([
  '- Accumulation–Manipulation–Distribution Range Model Watchlist',
  '  Status: research-only / not executable',
  '  Idea: Study open-based accumulation, liquidity manipulation, and later distribution behavior.',
  '  Taxonomy: If Model 1 or Turtle Soup gates pass, classify through existing approved models; otherwise keep as advisory research.',
  '  Next step: Collect 20-30 bridge-backed examples before any rule review.',
  '  Rule change: none.',
].join('\n')));
assert.ok(report.discordMessage.includes('research-only / not executable'));
assert.ok(report.discordMessage.includes('Human Review Queue:'));
assert.ok(!/^Entry:|^Stop:|^T1:|^T2:|Trade now|Entry confirmed|model promotion recommended/im.test(report.discordMessage));

const zeroWatchlistReport = buildWeeklyTradingAnalysisReport({
  weekEnding: '2026-05-29',
  instrument: 'MES',
  diagnosticReports: [],
  watchlistRecords: [],
  healthEvents: [{ status: 'READY', summary: 'OK' }],
  tradeAlertRecords: [],
});
assert.ok(zeroWatchlistReport.discordMessage.includes('Watchlist alerts: 0'));
assert.ok(zeroWatchlistReport.discordMessage.includes('Trade alerts sent: 0'));
assert.ok(zeroWatchlistReport.discordMessage.includes('Trade audit events: 0'));
assert.ok(zeroWatchlistReport.discordMessage.includes('Live advisory watchlist alerts: 0'));
assert.ok(zeroWatchlistReport.discordMessage.includes('What We Learned: No watchlist alerts fired this week. Continue collecting data.'));
assert.ok(zeroWatchlistReport.discordMessage.includes('Research Backfill:\n- Reports scanned: 0\n- Research candidates: 0\n- Advisory-only events: 0\n- Rule change: none'));
assert.ok(!zeroWatchlistReport.discordMessage.includes('Advisory research-only events: 0'));
assert.ok(!zeroWatchlistReport.discordMessage.includes('What We Learned: Watchlists improved awareness without creating trade authority.'));
assert.ok(zeroWatchlistReport.discordPayload.content.length <= 1900);
assert.ok(zeroWatchlistReport.discordPayload.content.includes('Research Backfill:\nReports: 0 | Candidates: 0 | Promotions: 0'));

const oversizedNewsletter = buildWeeklyTradingAnalysisReport({
  weekEnding: '2026-05-29',
  instrument: 'MES',
  tradeAlertRecords: Array.from({ length: 181 }, () => ({ state: 'Executable' })),
  watchlistRecords: [],
  researchBackfillReports: [{
    reportType: 'historical_research_backfill',
    instrument: 'MES',
    conceptReports: Array.from({ length: 12 }, (_, index) => ({
      conceptId: 'final_hour_liquidity_draw',
      title: `Long Research Concept ${index}`,
      totalCandidates: 50,
      datesReviewed: { from: '2026-01-01', to: '2026-05-29' },
      dataGaps: [],
      classificationCounts: { model1Overlap: 0, turtleSoupOverlap: 0, advisoryOnly: 50 },
      advisoryOnlyCount: 50,
      approvedModelOverlaps: { model1: 0, turtleSoup: 0 },
      commonReasons: [],
      sampleEvents: [],
      sampleThreshold: { minimum: 20, current: 50, met: true },
      metrics: {},
      recommendation: 'review_manually',
      ruleChangeRecommendation: 'none',
    })),
    approvedModelOverlap: { model1: 0, turtleSoup: 0, total: 0 },
  }],
  researchNotes: Array.from({ length: 30 }, (_, index) => ({
    researchTitle: `Research Note ${index}`,
    status: 'research_only',
    candidateName: `Very Long Research Watchlist Title ${index} With Extra Words That Should Not Blow Up Discord`,
    primaryIdea: 'This local pretty-only description is intentionally long and should not appear in compact Discord content.',
    taxonomyNote: 'This taxonomy paragraph should stay out of compact Discord content.',
    recommendedNextStep: 'Keep collecting examples.',
    ruleChange: 'none',
    includeInWeeklyNewsletter: true,
  })),
});
assert.ok(oversizedNewsletter.discordPayload.content.length <= 1900);
assert.ok(oversizedNewsletter.discordPayload.content.length <= 2000);
assert.ok(oversizedNewsletter.discordPayload.content.includes('Trade alerts sent: unknown'));
assert.ok(oversizedNewsletter.discordPayload.content.includes('Trade audit events: 181'));
assert.ok(!oversizedNewsletter.discordPayload.content.includes('Trade alerts: 181'));
assert.ok(oversizedNewsletter.discordMessage.includes('Trade audit events are available; sent-alert count requires explicit sent flag.'));
assert.ok(oversizedNewsletter.discordPayload.content.includes('Research candidates: 600'));
assert.ok(oversizedNewsletter.discordPayload.content.includes('Advisory-only: 600'));
assert.ok(oversizedNewsletter.discordPayload.content.includes('Reports: 1 | Candidates: 600 | Promotions: 0'));
assert.ok(!oversizedNewsletter.discordPayload.content.includes('This taxonomy paragraph'));
assert.ok(!/^Entry:|^Stop:|^T1:|^T2:/im.test(oversizedNewsletter.discordPayload.content));

const parsed = parseWeeklyReportArgs([
  '--week-ending', '2026-05-29',
  '--instrument', 'MES',
  '--discord', 'false',
  '--out', 'tools/automation/weekly-reports',
  '--pretty',
]);
assert.equal(parsed.weekEnding, '2026-05-29');
assert.equal(parsed.instrument, 'MES');
assert.equal(parsed.discord, false);
assert.equal(parsed.pretty, true);
assert.equal(parsed.dryRun, false);

const state = { sent: {} as Record<string, string> };
assert.equal(shouldSendWeeklyDiscordReport(state, report), true);
state.sent[weeklyReportKey(report)] = '2026-05-29T20:00:00Z';
assert.equal(shouldSendWeeklyDiscordReport(state, report), false);

const temp = mkdtempSync(join(tmpdir(), 'weekly-report-'));
const diagnosticDir = join(temp, 'diagnostic-reports');
const researchReportDir = join(temp, 'research-reports');
const auditDir = join(temp, 'discord-audit');
const researchDir = join(temp, 'research');
mkdirSync(diagnosticDir, { recursive: true });
mkdirSync(researchReportDir, { recursive: true });
mkdirSync(auditDir, { recursive: true });
mkdirSync(researchDir, { recursive: true });
writeFileSync(join(diagnosticDir, 'diagnostic.json'), JSON.stringify({
  finalClassification: 'C_UNAPPROVED_ICT_FVG_WATCHLIST',
  instrument: 'MES',
}));
writeFileSync(join(researchReportDir, 'research-backfill.json'), JSON.stringify({
  reportType: 'historical_research_backfill',
  instrument: 'MES',
  from: '2026-01-01',
  to: '2026-05-29',
  executiveSummary: ['Research-only backfill summary.'],
  conceptReports: [{
    conceptId: 'final_hour_liquidity_draw',
    title: 'Final-Hour Liquidity Draw',
    totalCandidates: 2,
    advisoryOnlyCount: 2,
    approvedModelOverlaps: { model1: 0, turtleSoup: 0 },
  }],
  approvedModelOverlap: { model1: 0, turtleSoup: 0, total: 0 },
}));
writeFileSync(join(auditDir, 'watchlist.json'), JSON.stringify({
  watchlistType: 'morning_continuation_watchlist',
  instrument: 'MES',
  status: 'WATCH_ONLY',
}));
writeFileSync(join(auditDir, 'scanner.json'), JSON.stringify({
  source: 'live-scanner',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  state: 'Conditional',
  discordSent: true,
  candidates: [{ setupType: 'TurtleSoup', direction: 'LONG', executionStatus: 'Conditional' }],
  attachments: { chartMarkup: 'chart.png', priceLevelMap: 'map.png' },
}));
writeFileSync(join(auditDir, 'health.json'), JSON.stringify({
  health: { status: 'DEGRADED', warnings: ['Macro calendar unavailable'] },
  instrument: 'MES',
}));
writeFileSync(join(researchDir, 'ict-note.md'), readFileSync('docs/research/ict-final-hour-liquidity-draw-research.md', 'utf8'));
writeFileSync(join(researchDir, 'false-run-note.md'), readFileSync('docs/research/false-run-liquidity-fade-near-highs-research.md', 'utf8'));
writeFileSync(join(researchDir, 'time-window-note.md'), readFileSync('docs/research/time-window-liquidity-delivery-watchlist-research.md', 'utf8'));
writeFileSync(join(researchDir, 'amd-note.md'), readFileSync('docs/research/accumulation-manipulation-distribution-range-model-research.md', 'utf8'));

const missingHistory = await loadDiscordAuditHistory(join(temp, 'missing-audit-folder'));
assert.equal(missingHistory.events.length, 0);
assert.equal(missingHistory.warnings.length, 1);

const normalizedTradeAudit = normalizeScannerAuditRecord({
  source: 'live-scanner',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  state: 'Executable',
  candidates: [{ setupType: 'TurtleSoup', direction: 'LONG', executionStatus: 'Executable' }],
  attachments: { chartMarkup: 'chart.png' },
}, join(auditDir, 'scanner.json'));
assert.equal(normalizedTradeAudit.alertType, 'trade');
assert.equal(normalizedTradeAudit.candidateSetupType, 'TurtleSoup');
assert.equal(normalizedTradeAudit.attachmentsGenerated, true);

const watchlistHistory = await loadWatchlistAuditHistory(auditDir);
assert.equal(watchlistHistory.events.length, 1);
const healthHistory = await loadHealthAuditHistory(auditDir);
assert.equal(healthHistory.events.length, 1);

const collected = await collectWeeklyReportInput({
  ...parsed,
  diagnosticDir,
  researchReportDir,
  auditDir,
  researchDir,
  stateFile: join(temp, 'state.json'),
});
assert.equal(collected.diagnosticReports?.length, 1);
assert.equal(collected.researchBackfillReports?.length, 1);
assert.equal(collected.watchlistRecords?.length, 1);
assert.equal(collected.tradeAlertRecords?.length, 1);
assert.equal(collected.healthEvents?.length, 1);
assert.equal(collected.researchNotes?.length, 4);
assert.ok(collected.researchNotes?.some((note) => note.candidateName === 'Final-Hour Liquidity Draw Watchlist'));
assert.equal(collected.researchNotes?.some((note) => note.candidateName.includes('ICT')), false);
assert.ok(collected.researchNotes?.some((note) => note.candidateName === 'False-Run Liquidity Fade Near Highs Watchlist' && note.taxonomyNote?.includes('Turtle Soup')));
assert.ok(collected.researchNotes?.some((note) => note.candidateName === 'Time-Window Liquidity Delivery Watchlist' && note.taxonomyNote?.includes('Model 1 or Turtle Soup')));
assert.ok(collected.researchNotes?.some((note) => note.candidateName === 'Accumulation–Manipulation–Distribution Range Model Watchlist' && note.taxonomyNote?.includes('Model 1 or Turtle Soup')));
assert.ok((collected.auditEvents?.length || 0) >= 3);

const newsletterSkip = await publishWeeklyTradingNewsletter({
  weekEnding: '2026-05-29',
  instrument: 'MES',
  discord: true,
  dryRun: true,
  diagnosticDir,
  researchReportDir,
  auditDir,
  researchDir,
  stateFile: join(temp, 'newsletter-state.json'),
});
assert.equal(newsletterSkip.sent, false);
assert.equal(newsletterSkip.skippedReason, 'Dry run.');
assert.ok(newsletterSkip.report.discordMessage.includes('[WEEKLY TRADING INTELLIGENCE] MES'));
assert.ok(newsletterSkip.report.discordMessage.includes('Research Desk:'));
assert.ok(newsletterSkip.report.discordMessage.includes('Research Backfill:'));
assert.ok(newsletterSkip.report.discordMessage.includes('Live advisory watchlist alerts: 1'));
assert.ok(newsletterSkip.report.discordMessage.includes('Trade alerts sent: 1'));
assert.ok(newsletterSkip.report.discordMessage.includes('Trade audit events: 1'));
assert.ok(newsletterSkip.report.discordPayload.content.includes('Trade alerts sent: 1'));
assert.ok(newsletterSkip.report.discordPayload.content.includes('Trade audit events: 1'));
assert.ok(!newsletterSkip.report.discordPayload.content.includes('Trade alerts: 1'));
assert.ok(newsletterSkip.report.discordMessage.includes('Reports scanned: 1'));
assert.ok(newsletterSkip.report.discordMessage.includes('Research candidates: 2'));
assert.ok(newsletterSkip.report.discordMessage.includes('Advisory-only events: 2'));
assert.ok(newsletterSkip.report.discordMessage.includes('Executable model promotions: 0'));
assert.ok(!newsletterSkip.report.discordMessage.includes('ICT-style'));
assert.ok(newsletterSkip.report.discordMessage.includes('research-only / not executable'));
assert.ok(newsletterSkip.report.discordMessage.includes('Final-Hour Liquidity Draw Watchlist'));
assert.ok(!newsletterSkip.report.discordMessage.includes('Final-Hour ICT-Style Liquidity Draw Watchlist'));
assert.ok(newsletterSkip.report.discordMessage.includes('False-Run Liquidity Fade Near Highs Watchlist'));
assert.ok(newsletterSkip.report.discordMessage.includes('Time-Window Liquidity Delivery Watchlist'));
assert.ok(newsletterSkip.report.discordMessage.includes('Accumulation–Manipulation–Distribution Range Model Watchlist'));
assert.ok(newsletterSkip.report.discordMessage.includes('Rule change: none.'));
assert.ok(!/^Entry:|^Stop:|^T1:|^T2:/im.test(newsletterSkip.report.discordMessage));

const immutableInput = {
  weekEnding: '2026-05-29',
  instrument: 'MES',
  diagnosticReports: [{ finalClassification: 'D_NO_VALID_SETUP' as const, instrument: 'MES' }],
};
const before = JSON.stringify(immutableInput);
buildWeeklyTradingAnalysisReport(immutableInput);
assert.equal(JSON.stringify(immutableInput), before);

console.log('Weekly trading analysis agent verified.');
