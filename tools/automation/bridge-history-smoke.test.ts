import assert from 'node:assert/strict';
import {
  diagnoseCompletedBars,
  formatBridgeHistorySmokeReport,
  parseBridgeHistorySmokeArgs,
  runBridgeHistorySmoke,
} from './bridge-history-smoke';

const parsed = parseBridgeHistorySmokeArgs([
  '--instrument', 'MES',
  '--bridge-instrument', 'MES 06-26',
  '--date', '2026-05-28',
  '--from', '10:00',
  '--to', '12:00',
  '--timeframes', '5m,15m,60m,120m,240m',
  '--pretty',
]);

assert.equal(parsed.instrument, 'MES');
assert.equal(parsed.bridgeInstrument, 'MES 06-26');
assert.equal(parsed.date, '2026-05-28');
assert.deepEqual(parsed.timeframes, ['5m', '15m', '60m', '120m', '240m']);
assert.equal(parsed.pretty, true);

const filterDiagnostics = diagnoseCompletedBars([
  { time: '2026-05-28T09:30:00', open: 10, high: 12, low: 9, close: 11, volume: 1 },
  { time: '2026-05-28T09:35:00', open: 10, high: 9, low: 11, close: 10, volume: 1 },
  { time: 'not-a-time', open: 10, high: 12, low: 9, close: 11, volume: 1 },
  { time: '2026-05-29T09:35:00', open: 10, high: 12, low: 9, close: 11, volume: 1 },
], '5m', 'open', 'eastern', new Date('2026-05-28T14:36:00Z'));
assert.equal(filterDiagnostics.rawBarCount, 4);
assert.equal(filterDiagnostics.completedBarCount, 1);
assert.equal(filterDiagnostics.invalidOhlcCount, 1);
assert.equal(filterDiagnostics.invalidTimestampCount, 1);
assert.equal(filterDiagnostics.filteredIncompleteCount, 1);

const originalFetch = globalThis.fetch;
const requests: string[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  requests.push(url);
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname.replace(/^\//, '');

  if (path === 'health') {
    return Response.json({ ok: true, name: 'test-bridge' });
  }

  if (path === 'bars') {
    return Response.json({
      ok: true,
      instrument: parsedUrl.searchParams.get('instrument'),
      timeframe: '5m',
      count: 1,
      bars: [{ time: '2026-05-29T10:00:00', open: 10, high: 12, low: 9, close: 11, volume: 1 }],
    });
  }

  if (path === 'historical-bars') {
    return Response.json({
      ok: true,
      instrument: parsedUrl.searchParams.get('instrument'),
      timeframe: parsedUrl.searchParams.get('timeframe'),
      count: 0,
      bars: [],
    });
  }

  return Response.json({ ok: false, error: 'Unknown endpoint' }, { status: 404 });
}) as typeof fetch;

const zeroReport = await runBridgeHistorySmoke(parsed);
globalThis.fetch = originalFetch;

assert.equal(zeroReport.reportType, 'bridge_history_smoke');
assert.equal(zeroReport.liveRecentBarsAvailable, true);
assert.equal(zeroReport.historicalBarsAvailable, false);
assert.equal(zeroReport.completedBarsAvailable, false);
assert.equal(zeroReport.likelyCause, 'ninjatrader_history_not_loaded');
assert.equal(zeroReport.timeframeResults.length, 5);
assert.ok(zeroReport.timeframeResults.every((result) => result.aliasAttempts.length > 0));
assert.ok(requests.some((url) => url.includes('historical-bars')));
assert.ok(requests.some((url) => url.includes('timeframe=5M')));
assert.ok(zeroReport.approvalBoundary.diagnosticChangesTradingRules === false);
assert.ok(zeroReport.approvalBoundary.diagnosticChangesBridgeBehavior === false);
assert.ok(formatBridgeHistorySmokeReport(zeroReport).includes('Likely cause: ninjatrader_history_not_loaded'));

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const parsedUrl = new URL(String(input));
  const path = parsedUrl.pathname.replace(/^\//, '');
  if (path === 'health') return Response.json({ ok: true });
  if (path === 'bars') return Response.json({ ok: true, bars: [] });
  if (path === 'historical-bars') {
    return Response.json({
      ok: true,
      bars: [{ time: '2099-06-01T10:00:00', open: 10, high: 12, low: 9, close: 11, volume: 1 }],
    });
  }
  return Response.json({ ok: false }, { status: 404 });
}) as typeof fetch;

const filteredReport = await runBridgeHistorySmoke({
  ...parsed,
  timeframes: ['5m'],
});
globalThis.fetch = originalFetch;

assert.equal(filteredReport.historicalBarsAvailable, true);
assert.equal(filteredReport.completedBarsAvailable, false);
assert.equal(filteredReport.likelyCause, 'completed_bar_filter_removed_all');
assert.equal(filteredReport.timeframeResults[0].rawBarCount, 1);
assert.equal(filteredReport.timeframeResults[0].completedBarCount, 0);
assert.equal(filteredReport.timeframeResults[0].filteredIncompleteCount, 1);

console.log('Bridge history smoke test verified.');
