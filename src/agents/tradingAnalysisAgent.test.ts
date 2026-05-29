import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildWeeklyTradingAnalysisReport } from './tradingAnalysisAgent';
import {
  collectWeeklyReportInput,
  parseWeeklyReportArgs,
  shouldSendWeeklyDiscordReport,
  weeklyReportKey,
} from '../../tools/automation/weekly-trading-report';

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

const state = { sent: {} as Record<string, string> };
assert.equal(shouldSendWeeklyDiscordReport(state, report), true);
state.sent[weeklyReportKey(report)] = '2026-05-29T20:00:00Z';
assert.equal(shouldSendWeeklyDiscordReport(state, report), false);

const temp = mkdtempSync(join(tmpdir(), 'weekly-report-'));
const diagnosticDir = join(temp, 'diagnostic-reports');
const auditDir = join(temp, 'discord-audit');
mkdirSync(diagnosticDir, { recursive: true });
mkdirSync(auditDir, { recursive: true });
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
  instrument: 'MES',
  state: 'Conditional',
}));

const collected = await collectWeeklyReportInput({
  ...parsed,
  diagnosticDir,
  auditDir,
  stateFile: join(temp, 'state.json'),
});
assert.equal(collected.diagnosticReports?.length, 1);
assert.equal(collected.watchlistRecords?.length, 1);
assert.equal(collected.tradeAlertRecords?.length, 1);

const immutableInput = {
  weekEnding: '2026-05-29',
  instrument: 'MES',
  diagnosticReports: [{ finalClassification: 'D_NO_VALID_SETUP' as const, instrument: 'MES' }],
};
const before = JSON.stringify(immutableInput);
buildWeeklyTradingAnalysisReport(immutableInput);
assert.equal(JSON.stringify(immutableInput), before);

console.log('Weekly trading analysis agent verified.');
