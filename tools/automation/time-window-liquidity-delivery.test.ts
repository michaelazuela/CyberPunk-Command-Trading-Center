import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildTimeWindowLiquidityDeliveryAuditReport,
  classifyLiquidityDeliveryWindow,
  renderTimeWindowLiquidityDeliveryMarkdown,
  WINDOW_DEFINITIONS,
} from './time-window-liquidity-delivery';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const outDir = mkdtempSync(path.join(tmpdir(), 'time-window-liquidity-delivery-'));

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T03:00:00' }), 'london_liquidity_delivery_window');
assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T04:00:00' }), 'london_liquidity_delivery_window');
assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T10:00:00' }), 'am_liquidity_delivery_window');
assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T11:00:00' }), 'am_liquidity_delivery_window');
assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T14:00:00' }), 'pm_liquidity_delivery_window');
assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T15:00:00' }), 'pm_liquidity_delivery_window');
assert.equal(classifyLiquidityDeliveryWindow({ time: '2026-01-02T12:00:00' }), null);

assert.equal(WINDOW_DEFINITIONS.AM.fromClock, '10:00');
assert.equal(WINDOW_DEFINITIONS.AM.toClock, '11:00');
assert.equal(WINDOW_DEFINITIONS.LONDON.fromClock, '03:00');
assert.equal(WINDOW_DEFINITIONS.LONDON.toClock, '04:00');
assert.equal(WINDOW_DEFINITIONS.PM.fromClock, '14:00');
assert.equal(WINDOW_DEFINITIONS.PM.toClock, '15:00');
assert.equal(WINDOW_DEFINITIONS.PM.displayName, 'PM 2:00-3:00 NY');

const bars = [
  bar('2026-01-01T09:30:00', 100, 102, 98, 101),
  bar('2026-01-01T10:00:00', 101, 104, 100, 103),
  bar('2026-01-01T15:55:00', 103, 120, 95, 118),
  bar('2026-01-02T03:00:00', 109, 110, 108, 109),
  bar('2026-01-02T09:30:00', 108, 109, 107, 108),
  bar('2026-01-02T09:35:00', 108, 109, 107, 108),
  bar('2026-01-02T09:40:00', 108, 109, 107, 108),
  bar('2026-01-02T10:00:00', 105, 106, 104, 105),
  bar('2026-01-02T10:05:00', 105, 111, 104.5, 110.5),
  bar('2026-01-02T10:10:00', 110.5, 112, 110, 111.5),
  bar('2026-01-02T10:15:00', 111.5, 116, 111, 115),
  bar('2026-01-02T10:20:00', 115, 121, 114, 119),
  bar('2026-01-02T10:25:00', 119, 120.5, 116, 117),
  bar('2026-01-02T11:00:00', 117, 118, 116, 117),
];

const report = buildTimeWindowLiquidityDeliveryAuditReport({
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-02',
  window: 'AM',
  outDir,
  pretty: true,
  json: false,
}, bars);
const markdown = renderTimeWindowLiquidityDeliveryMarkdown(report);

assert.equal(report.reportType, 'time_window_liquidity_delivery_audit');
assert.equal(report.boundary, 'research_only_not_execution_authority');
assert.equal(report.researchOnlyWarning, 'Research-only. This report does not approve trades and does not create execution authority.');
assert.equal(report.windowDefinition.id, 'am_liquidity_delivery_window');
assert.ok(report.summary.candidateCount >= 1);
assert.ok(report.summary.fvgOrInefficiencyCount >= 1);
assert.equal(report.evidenceCollectionThreshold.minimumExamplesBeforeRuleReview, 20);
assert.equal(report.evidenceCollectionThreshold.preferredExamplesBeforeRuleReview, 30);
assert.equal(report.evidenceCollectionThreshold.readyForRuleReviewDiscussion, false);
assert.ok(report.candidates.every((candidate) => candidate.researchOnly));
assert.ok(report.candidates.every((candidate) => candidate.boundary === 'research_only_not_execution_authority'));
assert.ok(report.candidates.every((candidate) =>
  candidate.overlapClassification === 'model_1_overlap_possible' ||
  candidate.overlapClassification === 'turtle_soup_overlap_possible' ||
  candidate.overlapClassification === 'advisory_only_time_window_research'
));
assert.ok(markdown.includes('This report does not approve trades and does not create execution authority.'));
assert.ok(markdown.includes('20'));
assert.ok(markdown.includes('30'));
assert.ok(markdown.includes('## Sample Table'));
assertNoExecutableLedgerFields(report);
assert.ok(!/"entry"|"stop"|"target"|"targets"|"T1"|"T2"|"t1"|"t2"|"canExecute"|"tradeAlerts"|"alerts"/.test(JSON.stringify(report)));

const jsonPath = report.outputPaths.jsonPath;
const mdPath = report.outputPaths.markdownPath;
assert.ok(jsonPath.endsWith('time-window-liquidity-delivery-audit-MES-AM.json'));
assert.ok(mdPath.endsWith('time-window-liquidity-delivery-audit-MES-AM.md'));

// The builder itself is side-effect free; write behavior is exercised by the CLI in integration use.
assert.equal(existsSync(jsonPath), false);
assert.ok(!readFileSync('tools/automation/time-window-liquidity-delivery.ts', 'utf8').includes('postResearchDiscordReviewMessage'));

const pmReport = buildTimeWindowLiquidityDeliveryAuditReport({
  symbol: 'MES',
  from: '2026-01-01',
  to: '2026-01-02',
  window: 'PM',
  outDir,
  pretty: true,
  json: false,
}, [
  ...bars,
  bar('2026-01-02T13:55:00', 116, 117, 115, 116),
  bar('2026-01-02T14:00:00', 116, 117, 115, 116),
  bar('2026-01-02T14:05:00', 116, 118, 115.5, 117.5),
  bar('2026-01-02T14:10:00', 117.5, 119, 117, 118.5),
  bar('2026-01-02T15:00:00', 118.5, 120, 118, 119),
]);
const pmMarkdown = renderTimeWindowLiquidityDeliveryMarkdown(pmReport);
assert.equal(pmReport.windowDefinition.id, 'pm_liquidity_delivery_window');
assert.equal(pmReport.windowDefinition.displayName, 'PM 2:00-3:00 NY');
assert.ok(pmReport.outputPaths.jsonPath.endsWith('time-window-liquidity-delivery-audit-MES-PM.json'));
assert.ok(pmReport.outputPaths.markdownPath.endsWith('time-window-liquidity-delivery-audit-MES-PM.md'));
assert.notEqual(pmReport.outputPaths.jsonPath, report.outputPaths.jsonPath);
assert.ok(pmMarkdown.includes('Research-only'));
assertNoExecutableLedgerFields(pmReport);

console.log('Time-window liquidity-delivery audit verified.');
