import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildFailedPlanReversalPhase8AuditReport,
  renderFailedPlanReversalPhase8AuditMarkdown,
} from './failed-plan-reversal-phase8-audit';

const auditDir = path.join(os.tmpdir(), `failed-plan-reversal-phase8-${Date.now()}`);
await fs.mkdir(auditDir, { recursive: true });

await fs.writeFile(path.join(auditDir, 'scanner-morning-2026-06-02-MES-MORNING-20260602-140348.json'), `${JSON.stringify({
  source: 'live-scanner',
  session: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  state: 'Executable',
  planVersionId: 'MORNING-20260602-140348',
  candidate: { direction: 'LONG', entry: 7603.25, stop: 7599, target1: 7609.75, target2: 7611.75 },
  normalizedPlan: { canExecute: true, decisionStatus: 'ApprovedTrade' },
}, null, 2)}\n`, 'utf8');

await fs.writeFile(path.join(auditDir, 'scanner-decision-tape-2026-06-02-MES-morning.json'), `${JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  session: 'morning',
  twoHourCoverage: {
    available: true,
    sufficient: true,
    barsLoaded: 120,
    source: 'market_bars_bridge_repair',
    warning: null,
  },
  events: {
    '2026-06-02T10:05:00.0000000': {
      failedPlanReversal: { present: false },
      historyCoverage: [
        { timeframe: '5m', sufficient: true, barsLoaded: 6000, source: 'market_bars_bridge_repair', warning: null },
        { timeframe: '120m', sufficient: true, barsLoaded: 120, source: 'market_bars_bridge_repair', warning: null },
      ],
    },
  },
}, null, 2)}\n`, 'utf8');

await fs.writeFile(path.join(auditDir, 'scanner-decision-tape-2026-06-03-MES-morning.json'), `${JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-03',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-03T10:15:00.0000000': {
      failedPlanReversal: {
        present: true,
        state: 'FAILED_LONG_TO_BEARISH_MSS_CONFIRMED',
        approvesExecution: false,
      },
      twoHourCoverage: { available: false, sufficient: false, barsLoaded: 0, source: 'missing', warning: '120M missing.' },
    },
  },
}, null, 2)}\n`, 'utf8');

const report = await buildFailedPlanReversalPhase8AuditReport({
  auditDir,
  instrument: 'MES',
  dates: ['2026-06-02', '2026-06-03', '2026-06-05'],
});

assert.equal(report.reportType, 'failed_plan_reversal_phase8_audit');
assert.equal(report.boundary, 'diagnostic_replay_only_not_execution_authority');
assert.equal(report.totals.scannerAuditCount, 1);
assert.equal(report.totals.approvedExecutableAuditCount, 1);
assert.equal(report.totals.decisionTapeCount, 2);
assert.equal(report.totals.failedPlanReversalEventCount, 1);
assert.equal(report.totals.datesWithTwoHourCoverage, 1);
assert.equal(report.totals.datesMissingTwoHourCoverage, 2);
assert.equal(report.totals.datesRequiringRegeneration, 2);
assert.equal(report.totals.datesWithFreshTwoHourValidation, 0);
assert.equal(report.authority.approvesExecution, false);
assert.equal(report.authority.changesTradingRules, false);
const june2 = report.summaries.find((item) => item.date === '2026-06-02');
assert.equal(june2?.regenerationRequired, false);
assert.equal(june2?.freshTwoHourValidation.attempted, false);
const june3 = report.summaries.find((item) => item.date === '2026-06-03');
assert.equal(june3?.failedPlanReversalEventCount, 1);
assert.equal(june3?.twoHourCoverage[0]?.available, false);
assert.equal(june3?.regenerationRequired, true);
assert.ok(june3?.regenerationReason?.includes('missing live scanner audit'));
assert.ok(june3?.regenerationReason?.includes('missing 120M / 2H coverage'));
assert.ok(june3?.recommendedReplayCommand.includes('--dates 2026-06-03'));
const recent = report.summaries.find((item) => item.date === '2026-06-05');
assert.ok(recent?.warnings.some((warning) => warning.includes('no live scanner audit files')));
assert.ok(recent?.warnings.some((warning) => warning.includes('no 120M / 2H coverage')));
assert.equal(recent?.regenerationRequired, true);

const markdown = renderFailedPlanReversalPhase8AuditMarkdown(report);
assert.ok(markdown.includes('Failed-Plan Reversal Phase 8 Audit'));
assert.ok(markdown.includes('diagnostic_replay_only_not_execution_authority'));
assert.ok(markdown.includes('This report validates scanner/audit evidence only'));
assert.ok(markdown.includes('Fresh Replay Requirement'));
assert.ok(markdown.includes('Regenerate a fresh replay/live-style audit after 120M bridge/cache support is active'));
assert.ok(!markdown.includes('approved for execution'));

console.log('Failed-plan reversal Phase 8 audit verified.');
