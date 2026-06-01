import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildHtfFirstAuditReport,
  buildHtfFirstCandidate,
  discoverTwldSupportedTimeframes,
} from './time-window-liquidity-delivery-htf-first';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

const outDir = mkdtempSync(path.join(tmpdir(), 'twld-htf-first-'));

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

const discovery = discoverTwldSupportedTimeframes();
assert.ok(discovery.codedSupportedTimeframes.includes('1m'));
assert.ok(discovery.codedSupportedTimeframes.includes('30m'));
assert.ok(discovery.codedSupportedTimeframes.includes('daily'));
assert.ok(discovery.codedSupportedTimeframes.includes('session'));
assert.ok(discovery.discoveredHigherTimeframes.includes('15m'));
assert.ok(discovery.discoveredHigherTimeframes.includes('30m'));
assert.ok(discovery.discoveredHigherTimeframes.includes('60m'));
assert.ok(discovery.discoveredHigherTimeframes.includes('240m'));
assert.ok(discovery.discoveredHigherTimeframes.includes('daily'));
assert.ok(!discovery.discoveredHigherTimeframes.includes('5m'));
assert.equal(discovery.executionTimeframe, '5m');
assert.equal(discovery.executionTimeframeRole, 'execution_only');

const bars5m = [
  bar('2026-01-01T09:30:00', 100, 106, 96, 103),
  bar('2026-01-01T10:00:00', 103, 109, 101, 108),
  bar('2026-01-01T15:55:00', 108, 121, 95, 119),
  bar('2026-01-02T03:00:00', 109, 110, 108, 109),
  bar('2026-01-02T09:30:00', 108, 109, 107, 108),
  bar('2026-01-02T09:35:00', 108, 109, 107, 108),
  bar('2026-01-02T10:00:00', 110, 112, 109, 111),
  bar('2026-01-02T10:05:00', 111, 114, 110, 113),
  bar('2026-01-02T10:10:00', 113, 118, 112, 117),
  bar('2026-01-02T10:15:00', 117, 122, 116, 121),
  bar('2026-01-02T10:20:00', 121, 123, 119, 120),
  bar('2026-01-02T11:00:00', 120, 121, 119, 120),
  bar('2026-01-02T14:00:00', 116, 117, 115, 116),
  bar('2026-01-02T14:05:00', 116, 117, 115, 116.5),
  bar('2026-01-02T14:10:00', 116.5, 117.5, 115.5, 116),
  bar('2026-01-02T15:00:00', 116, 117, 115, 116.25),
];
const bars15m = [
  bar('2026-01-01T09:30:00', 100, 111, 96, 109),
  bar('2026-01-01T15:45:00', 109, 121, 95, 119),
  bar('2026-01-02T09:30:00', 108, 110, 107, 109),
  bar('2026-01-02T09:45:00', 109, 112, 108, 111),
];
const bars60m = [
  bar('2026-01-01T09:00:00', 100, 120, 95, 118),
  bar('2026-01-02T09:00:00', 108, 113, 107, 111),
];
const bars240m = [
  bar('2026-01-01T08:00:00', 100, 122, 94, 119),
  bar('2026-01-02T08:00:00', 108, 114, 106, 112),
];

const amCandidate = buildHtfFirstCandidate({
  symbol: 'MES',
  date: '2026-01-02',
  window: 'AM',
  dayBars5m: bars5m.filter((item) => item.time.startsWith('2026-01-02')),
  allBefore5m: bars5m.filter((item) => item.time.startsWith('2026-01-01')),
  htfBarsByTimeframe: {
    '5m': bars5m,
    '15m': bars15m,
    '60m': bars60m,
    '240m': bars240m,
  },
  discovery,
});

assert.ok(amCandidate);
assert.equal(amCandidate.executionTimeframe, '5m');
assert.equal(amCandidate.executionTimeframeRole, 'execution_only');
assert.deepEqual(amCandidate.discoveredHigherTimeframes, discovery.discoveredHigherTimeframes);
assert.ok(amCandidate.availableDrawContextTimeframes.includes('15m'));
assert.ok(amCandidate.availableDrawContextTimeframes.includes('60m'));
assert.ok(amCandidate.availableDrawContextTimeframes.includes('240m'));
assert.equal(amCandidate.htfDrawContextPresent, true);
assert.ok(amCandidate.primaryDrawTimeframe !== '5m');
assert.ok(amCandidate.htfFirstBucket === 'priority_1_htf_draw_delivery_achieved' || amCandidate.htfFirstBucket === 'priority_3_htf_draw_delivery_not_observed');
assert.notEqual(amCandidate.htfFirstBucket, 'priority_5_no_valid_draw_or_noisy');
assertNoExecutableLedgerFields(amCandidate);

const pmCandidate = buildHtfFirstCandidate({
  symbol: 'MES',
  date: '2026-01-02',
  window: 'PM',
  dayBars5m: bars5m.filter((item) => item.time.startsWith('2026-01-02') && item.time.slice(11, 16) >= '14:00'),
  allBefore5m: [],
  htfBarsByTimeframe: {
    '5m': bars5m,
    '15m': [],
    '60m': [],
    '240m': [],
  },
  discovery,
});
assert.ok(pmCandidate);
assert.equal(pmCandidate.htfDrawContextPresent, false);
assert.ok(
  pmCandidate.htfFirstBucket === 'priority_4_execution_only_without_htf_draw' ||
  pmCandidate.htfFirstBucket === 'priority_5_no_valid_draw_or_noisy'
);

const report = buildHtfFirstAuditReport({
  options: {
    symbol: 'MES',
    from: '2026-01-01',
    to: '2026-01-02',
    outDir,
  },
  window: 'AM',
  barsByTimeframe: {
    '5m': bars5m,
    '15m': bars15m,
    '60m': bars60m,
    '240m': bars240m,
  },
  discovery,
});
assert.equal(report.reportType, 'time_window_liquidity_delivery_htf_first_audit');
assert.equal(report.boundary, 'research_only_not_execution_authority');
assert.ok(report.researchOnlyWarning.includes('Research-only'));
assert.ok(report.summary.candidateCount >= 1);
assert.ok(Object.keys(report.summary.bucketCounts).includes('priority_1_htf_draw_delivery_achieved'));
assert.ok(report.candidates.every((candidate) => candidate.executionTimeframeRole === 'execution_only'));
assertNoExecutableLedgerFields(report);

writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
assert.ok(existsSync(report.outputPaths.jsonPath));
assert.ok(readFileSync(report.outputPaths.jsonPath, 'utf8').includes('time_window_liquidity_delivery_htf_first_audit'));

console.log('Time-window liquidity-delivery HTF-first audit verified.');
