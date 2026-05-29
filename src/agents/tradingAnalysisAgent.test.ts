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
  tradeAlertRecords: [{ state: 'Executable', sentAt: '2026-05-29T10:00:00Z' }],
  researchNotes: [{
    researchTitle: 'ICT Final-Hour Liquidity Draw Research',
    status: 'research_only',
    candidateName: 'Final-Hour ICT-Style Liquidity Draw Watchlist',
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
  }],
});

assert.equal(report.reportType, 'weekly_trading_intelligence');
assert.equal(report.counts.confirmedMissedApprovedTrades, 1);
assert.equal(report.counts.alreadyTriggeredNoFreshEntry, 1);
assert.equal(report.counts.ictStyleWatchlistOnlyEvents, 1);
assert.equal(report.counts.watchlists, 1);
assert.equal(report.counts.healthReady, 1);
assert.equal(report.counts.healthDegraded, 1);
assert.equal(report.counts.healthBlocked, 1);
assert.equal(report.recommendations.automaticRuleChangesRecommended, false);
assert.equal(report.approvalBoundary.weeklyReportRunsDiagnostics, false);
assert.equal(report.discordPayload.embeds.length, 0);
assert.equal('components' in report.discordPayload, false);
assert.equal('files' in report.discordPayload, false);
assert.ok(!/Trade now|Entry confirmed|ApprovedTrade/i.test(report.discordMessage));
assert.ok(report.discordMessage.includes('No rule changes'));
assert.ok(report.discordMessage.includes('Executive Summary:'));
assert.ok(report.discordMessage.includes('Key Story:'));
assert.ok(report.discordMessage.includes('Research Desk:'));
assert.ok(report.discordMessage.includes('Final-Hour ICT-Style Liquidity Draw Watchlist'));
assert.ok(report.discordMessage.includes('False-Run Liquidity Fade Near Highs Watchlist'));
assert.ok(report.discordMessage.includes([
  '- False-Run Liquidity Fade Near Highs Watchlist',
  '  Status: research-only / not executable',
  '  Idea: Fade a run toward ATH or major buy-side liquidity when price fails to sustain and begins drawing toward sell-side liquidity.',
  '  Taxonomy: If sweep + reclaim exists, evaluate through existing Turtle Soup; otherwise keep as advisory research.',
  '  Next step: Collect 20-30 bridge-backed examples before any rule review.',
  '  Rule change: none.',
].join('\n')));
assert.ok(report.discordMessage.includes([
  '- Final-Hour ICT-Style Liquidity Draw Watchlist',
  '  Status: research-only / not executable',
  '  Idea: Late-day draw toward clean buy-side liquidity during 3:15-3:45 ET.',
  '  Next step: Collect 20-30 bridge-backed examples before rule review.',
  '  Rule change: none.',
].join('\n')));
assert.ok(report.discordMessage.includes('research-only / not executable'));
assert.ok(report.discordMessage.includes('Human Review Queue:'));
assert.ok(!/^Entry:|^Stop:|^T1:|^T2:|Trade now|Entry confirmed|model promotion recommended/im.test(report.discordMessage));

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
const auditDir = join(temp, 'discord-audit');
const researchDir = join(temp, 'research');
mkdirSync(diagnosticDir, { recursive: true });
mkdirSync(auditDir, { recursive: true });
mkdirSync(researchDir, { recursive: true });
writeFileSync(join(diagnosticDir, 'diagnostic.json'), JSON.stringify({
  finalClassification: 'C_UNAPPROVED_ICT_FVG_WATCHLIST',
  instrument: 'MES',
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
  candidates: [{ setupType: 'TurtleSoup', direction: 'LONG', executionStatus: 'Conditional' }],
  attachments: { chartMarkup: 'chart.png', priceLevelMap: 'map.png' },
}));
writeFileSync(join(auditDir, 'health.json'), JSON.stringify({
  health: { status: 'DEGRADED', warnings: ['Macro calendar unavailable'] },
  instrument: 'MES',
}));
writeFileSync(join(researchDir, 'ict-note.md'), readFileSync('docs/research/ict-final-hour-liquidity-draw-research.md', 'utf8'));
writeFileSync(join(researchDir, 'false-run-note.md'), readFileSync('docs/research/false-run-liquidity-fade-near-highs-research.md', 'utf8'));

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
  auditDir,
  researchDir,
  stateFile: join(temp, 'state.json'),
});
assert.equal(collected.diagnosticReports?.length, 1);
assert.equal(collected.watchlistRecords?.length, 1);
assert.equal(collected.tradeAlertRecords?.length, 1);
assert.equal(collected.healthEvents?.length, 1);
assert.equal(collected.researchNotes?.length, 2);
assert.ok(collected.researchNotes?.some((note) => note.candidateName === 'False-Run Liquidity Fade Near Highs Watchlist' && note.taxonomyNote?.includes('Turtle Soup')));
assert.ok((collected.auditEvents?.length || 0) >= 3);

const newsletterSkip = await publishWeeklyTradingNewsletter({
  weekEnding: '2026-05-29',
  instrument: 'MES',
  discord: true,
  dryRun: true,
  diagnosticDir,
  auditDir,
  researchDir,
  stateFile: join(temp, 'newsletter-state.json'),
});
assert.equal(newsletterSkip.sent, false);
assert.equal(newsletterSkip.skippedReason, 'Dry run.');
assert.ok(newsletterSkip.report.discordMessage.includes('[WEEKLY TRADING INTELLIGENCE] MES'));
assert.ok(newsletterSkip.report.discordMessage.includes('Research Desk:'));
assert.ok(newsletterSkip.report.discordMessage.includes('research-only / not executable'));
assert.ok(newsletterSkip.report.discordMessage.includes('False-Run Liquidity Fade Near Highs Watchlist'));
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
