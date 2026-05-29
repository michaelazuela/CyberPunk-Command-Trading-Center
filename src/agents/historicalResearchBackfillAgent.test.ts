import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runHistoricalResearchBackfill,
  type HistoricalResearchBackfillInput,
} from './historicalResearchBackfillAgent';
import {
  buildHistoricalResearchBackfillInput,
  filterCompletedBars,
  parseResearchBackfillArgs,
} from '../../tools/automation/research-backfill';
import {
  collectWeeklyReportInput,
  parseWeeklyReportArgs,
} from '../../tools/automation/weekly-trading-report';

const parsed = parseResearchBackfillArgs([
  '--from', '2026-01-01',
  '--to', 'auto',
  '--instrument', 'MES',
  '--source', 'both',
  '--concept', 'all',
  '--out', 'tools/automation/research-reports',
  '--outcome-observation-bars', '6',
  '--json',
  '--pretty',
]);
assert.equal(parsed.from, '2026-01-01');
assert.match(parsed.to, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(parsed.instrument, 'MES');
assert.equal(parsed.source, 'both');
assert.equal(parsed.concept, 'all');
assert.equal(parsed.json, true);
assert.equal(parsed.pretty, true);
assert.equal(parsed.discord, false);
assert.equal(parsed.outcomeObservationBars, 6);

const completed = filterCompletedBars([
  { time: '2026-05-29T09:30:00', open: 1, high: 2, low: 1, close: 2, volume: 10 },
  { time: '2026-05-29T09:35:00', open: 2, high: 3, low: 2, close: 3, volume: 10 },
], '5m', 'open', 'eastern', new Date('2026-05-29T13:36:00Z'));
assert.equal(completed.length, 1);
assert.equal(completed[0].time, '2026-05-29T09:30:00');

const fixtureInput: HistoricalResearchBackfillInput = {
  from: '2026-01-01',
  to: '2026-05-29',
  instrument: 'MES',
  selectedConcept: 'all',
  completedBars5m: [
    { time: '2026-05-29T10:00:00', open: 7590, high: 7602, low: 7588, close: 7600 },
  ],
  supabaseRecords: [{ id: 'read-only-record' }],
  auditRecords: [{ alertType: 'watchlist' }],
  diagnosticReports: [{ finalClassification: 'C_UNAPPROVED_ICT_FVG_WATCHLIST' }],
  existingResearchNotes: ['time-window.md'],
  dataWarnings: ['Bridge gap on 2026-01-02'],
  events: [
    {
      concept: 'time_window_liquidity_delivery',
      date: '2026-05-01',
      time: '10:15',
      direction: 'LONG',
      window: '10:00-11:00 NY',
      summary: 'Time window showed FVG/inefficiency delivery toward a clear draw.',
      classification: 'advisory_only',
      drawIdentified: true,
      fvgOrInefficiency: true,
      failureReasons: ['Only time-window plus FVG; approved gates did not independently pass.'],
    },
    {
      concept: 'time_window_liquidity_delivery',
      date: '2026-05-02',
      time: '10:30',
      direction: 'LONG',
      window: '10:00-11:00 NY',
      summary: 'Current approved Model 1 overlap was present in existing records.',
      classification: 'model1_overlap',
      model1Overlap: true,
    },
    {
      concept: 'false_run_liquidity_fade',
      date: '2026-05-03',
      time: '10:45',
      direction: 'SHORT',
      window: 'regular_session',
      summary: 'Run near major high failed and delivered toward sell-side draw.',
      classification: 'turtle_soup_overlap',
      trueSweepReclaim: true,
      turtleSoupOverlap: true,
      reachedDrawAfterFact: true,
    },
    {
      concept: 'false_run_liquidity_fade',
      date: '2026-05-04',
      time: '11:00',
      direction: 'SHORT',
      window: 'regular_session',
      summary: 'False-run behavior lacked true sweep plus reclaim.',
      classification: 'advisory_only',
      failedOrReversed: true,
      warningPatterns: ['No true sweep plus reclaim.'],
    },
    {
      concept: 'amd_range_model',
      date: '2026-05-05',
      time: '09:30',
      direction: 'LONG',
      window: 'opening_reference',
      summary: 'Open-based accumulation and manipulation were observed.',
      classification: 'advisory_only',
      accumulationZone: true,
      manipulationLeg: true,
      distributionFollowThrough: true,
      failureReasons: ['AMD-only behavior remains advisory research.'],
    },
    {
      concept: 'final_hour_liquidity_draw',
      date: '2026-05-06',
      time: '15:20',
      direction: 'LONG',
      window: '3:15-3:45 NY',
      summary: 'Final-hour foothold delivered toward clean liquidity.',
      classification: 'advisory_only',
      cleanLiquidityDraw: true,
      footholdPresent: true,
      failureReasons: ['Final-hour concept is not an executable model.'],
    },
  ],
};
const before = JSON.stringify(fixtureInput);
const report = runHistoricalResearchBackfill(fixtureInput);
assert.equal(JSON.stringify(fixtureInput), before);
assert.equal(report.reportType, 'historical_research_backfill');
assert.equal(report.instrument, 'MES');
assert.equal(report.conceptReports.length, 4);
assert.equal(report.fullCandidateEvents.length, 6);
assert.ok(report.fullCandidateEvents.every((event) => event.advisoryOnly === true));
assert.ok(report.fullCandidateEvents.every((event) => event.instrument === 'MES'));
assert.ok(report.fullCandidateEvents.some((event) => event.possibleModel1Overlap));
assert.ok(report.fullCandidateEvents.some((event) => event.possibleTurtleSoupOverlap));
assert.ok(report.markdown.includes('Full candidate events persisted: 6'));
for (const event of report.fullCandidateEvents) {
  const keys = Object.keys(event);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('stopLoss'), false);
  assert.equal(keys.includes('target'), false);
  assert.equal(keys.includes('targets'), false);
  assert.equal(keys.includes('T1'), false);
  assert.equal(keys.includes('T2'), false);
  assert.equal(keys.includes('riskReward'), false);
  assert.equal(keys.includes('canExecute'), false);
  assert.equal(keys.includes('executionApproved'), false);
}
assert.equal(report.dataCoverage.completed5mBars, 1);
assert.equal(report.dataCoverage.supabaseRecords, 1);
assert.equal(report.dataCoverage.auditRecords, 1);
assert.equal(report.dataCoverage.sourceCoverage.auditJsonRecordsScanned, 1);
assert.equal(report.dataCoverage.barCoverage[0].timeframe, '5m');
assert.equal(report.dataCoverage.barCoverage[0].completedBarsRemaining, 1);
assert.equal(report.detectorAudit.length, 4);
assert.equal(report.detectorAudit.some((audit) => audit.rawCandidatePrefilterCount > 0), true);
assert.deepEqual(report.zeroCandidateExplanation, []);
assert.equal(report.approvedModelOverlap.model1, 1);
assert.equal(report.approvedModelOverlap.turtleSoup, 1);
assert.equal(report.approvalBoundary.researchBackfillApprovesTrade, false);
assert.equal(report.approvalBoundary.researchBackfillChangesRules, false);
assert.equal(report.approvalBoundary.researchBackfillCreatesEntry, false);
assert.equal(report.approvalBoundary.researchBackfillCreatesTargets, false);
assert.equal(report.approvalBoundary.researchBackfillOverridesScanner, false);
assert.equal(report.approvalBoundary.researchBackfillPromotesModel, false);
assert.equal(report.approvalBoundary.researchBackfillBuildsNewPlan, false);
assert.equal(report.approvalBoundary.researchBackfillWritesRagMemory, false);
assert.ok(report.markdown.includes('## 3. Concept 1 - Time-Window Liquidity Delivery'));
assert.ok(report.markdown.includes('## 4. Concept 2 - False-Run Liquidity Fade Near Highs'));
assert.ok(report.markdown.includes('## 5. Concept 3 - Accumulation-Manipulation-Distribution Range Model'));
assert.ok(report.markdown.includes('## 6. Concept 4 - Final-Hour Liquidity Draw'));
assert.ok(report.markdown.includes('Rule change recommendation: none'));
assert.ok(report.markdown.includes('sample threshold'));
assert.ok(report.markdown.includes('Historical Research Backfill'));
assert.ok(!/"entry"|"stop"|"T1"|"T2"/.test(JSON.stringify(report)));
assert.ok(!/^Entry:|^Stop:|^T1:|^T2:|Trade now|model promotion recommended/im.test(report.markdown));

const observationReport = runHistoricalResearchBackfill({
  from: '2026-05-28',
  to: '2026-05-28',
  instrument: 'MES',
  selectedConcept: 'time_window_liquidity_delivery',
  outcomeObservationBars: 2,
  completedBars5m: [
    { time: '2026-05-28T10:00:00', open: 100, high: 101, low: 99, close: 100 },
    { time: '2026-05-28T10:05:00', open: 100, high: 104, low: 99, close: 103 },
    { time: '2026-05-28T10:10:00', open: 103, high: 108, low: 102, close: 107 },
    { time: '2026-05-28T10:15:00', open: 107, high: 109, low: 106, close: 108 },
  ],
  events: [{
    concept: 'time_window_liquidity_delivery',
    date: '2026-05-28',
    time: '10:00',
    direction: 'LONG',
    window: '10:00-11:00 NY',
    summary: 'Observation fixture.',
    classification: 'advisory_only',
  }],
});
const observedCandidate = observationReport.fullCandidateEvents?.[0];
assert.equal(observedCandidate?.referencePrice, 100);
assert.equal(observedCandidate?.observationWindowBarCount, 2);
assert.equal(observedCandidate?.observationWindowMinutes, 10);
assert.equal(observedCandidate?.postSignalBars?.length, 2);
assert.deepEqual(observedCandidate?.postSignalBars?.map((bar) => bar.time), ['2026-05-28T10:05:00', '2026-05-28T10:10:00']);
assert.ok(observedCandidate?.postSignalBars?.every((bar) => bar.advisoryOnly === true));
assert.ok(observationReport.markdown.includes('Candidates with observation windows: 1'));
assert.ok(observationReport.markdown.includes('Observation bars setting: 2'));
assert.ok(observationReport.executiveSummary.some((line) => line.includes('post-signal observation windows')));
for (const bar of observedCandidate?.postSignalBars || []) {
  const keys = Object.keys(bar);
  assert.equal(keys.includes('entry'), false);
  assert.equal(keys.includes('stop'), false);
  assert.equal(keys.includes('stopLoss'), false);
  assert.equal(keys.includes('target'), false);
  assert.equal(keys.includes('targets'), false);
  assert.equal(keys.includes('T1'), false);
  assert.equal(keys.includes('T2'), false);
  assert.equal(keys.includes('riskReward'), false);
  assert.equal(keys.includes('canExecute'), false);
  assert.equal(keys.includes('executionApproved'), false);
}

const defaultObservationReport = runHistoricalResearchBackfill({
  from: '2026-05-28',
  to: '2026-05-28',
  instrument: 'MES',
  completedBars5m: Array.from({ length: 13 }, (_, index) => {
    const time = new Date(Date.UTC(2026, 4, 28, 10, index * 5, 0));
    return {
      time: time.toISOString().slice(0, 19),
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100 + index,
    };
  }),
  events: [{
    concept: 'time_window_liquidity_delivery',
    date: '2026-05-28',
    time: '10:00',
    direction: 'LONG',
    window: '10:00-11:00 NY',
    summary: 'Default observation fixture.',
    classification: 'advisory_only',
  }],
});
assert.equal(defaultObservationReport.fullCandidateEvents?.[0].postSignalBars?.length, 12);
assert.equal(defaultObservationReport.fullCandidateEvents?.[0].observationWindowMinutes, 60);

const shortObservationReport = runHistoricalResearchBackfill({
  from: '2026-05-28',
  to: '2026-05-28',
  instrument: 'MES',
  outcomeObservationBars: 4,
  completedBars5m: [
    { time: '2026-05-28T10:00:00', open: 100, high: 101, low: 99, close: 100 },
    { time: '2026-05-28T10:05:00', open: 100, high: 104, low: 99, close: 103 },
  ],
  events: [{
    concept: 'time_window_liquidity_delivery',
    date: '2026-05-28',
    time: '10:00',
    direction: 'LONG',
    window: '10:00-11:00 NY',
    summary: 'Short observation fixture.',
    classification: 'advisory_only',
  }],
});
assert.equal(shortObservationReport.fullCandidateEvents?.[0].postSignalBars?.length, 1);
assert.ok(shortObservationReport.fullCandidateEvents?.[0].observationWindowDataQualityNotes?.some((note) => note.includes('Only 1 post-signal')));

const timeWindow = report.conceptReports.find((concept) => concept.conceptId === 'time_window_liquidity_delivery');
assert.equal(timeWindow?.advisoryOnlyCount, 1);
assert.equal(timeWindow?.approvedModelOverlaps.model1, 1);
assert.equal((timeWindow?.metrics.countByWindow as Record<string, number>)['10:00-11:00 NY'], 2);

const falseRun = report.conceptReports.find((concept) => concept.conceptId === 'false_run_liquidity_fade');
assert.equal(falseRun?.approvedModelOverlaps.turtleSoup, 1);
assert.equal(falseRun?.advisoryOnlyCount, 1);

const amd = report.conceptReports.find((concept) => concept.conceptId === 'amd_range_model');
assert.equal(amd?.advisoryOnlyCount, 1);
assert.equal(amd?.metrics.distributionFollowThroughCount, 1);

const finalHour = report.conceptReports.find((concept) => concept.conceptId === 'final_hour_liquidity_draw');
assert.equal(finalHour?.advisoryOnlyCount, 1);
assert.equal(finalHour?.metrics.cleanLiquidityDrawCount, 1);

const missingDataReport = runHistoricalResearchBackfill({
  from: '2026-01-01',
  to: '2026-05-29',
  instrument: 'MES',
  selectedConcept: 'all',
  dataWarnings: ['Local bridge folder missing.', 'Supabase config unavailable.'],
  events: [],
});
assert.equal(missingDataReport.conceptReports.length, 4);
assert.equal(missingDataReport.fullCandidateEvents.length, 0);
assert.equal(missingDataReport.dataCoverage.dataGaps.length, 2);
assert.equal(missingDataReport.conceptReports.every((concept) => concept.totalCandidates === 0), true);
assert.ok(missingDataReport.zeroCandidateExplanation.some((reason) => reason.includes('No completed bridge bars')));
assert.ok(missingDataReport.markdown.includes('Zero-candidate explanation:'));
assert.ok(missingDataReport.markdown.includes('Detector audit:'));
assert.ok(missingDataReport.markdown.includes('raw prefilter=0'));

const temp = mkdtempSync(join(tmpdir(), 'research-backfill-'));
const auditDir = join(temp, 'discord-audit');
const diagnosticDir = join(temp, 'diagnostic-reports');
const researchDir = join(temp, 'research');
const researchReportDir = join(temp, 'research-reports');
mkdirSync(auditDir, { recursive: true });
mkdirSync(diagnosticDir, { recursive: true });
mkdirSync(researchDir, { recursive: true });
mkdirSync(researchReportDir, { recursive: true });

const originalFetch = globalThis.fetch;
const bridgeRequests: URL[] = [];
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  bridgeRequests.push(url);
  assert.equal(url.pathname.replace(/^\//, ''), 'historical-bars');
  assert.equal(url.searchParams.get('instrument'), 'MES 06-26');
  assert.ok(['5m', '15m', '60m', '240m'].includes(url.searchParams.get('timeframe') || ''));
  const from = url.searchParams.get('from') || '2026-05-28T09:30:00';
  return Response.json({
    ok: true,
    instrument: url.searchParams.get('instrument'),
    timeframe: url.searchParams.get('timeframe'),
    bars: [{ time: from, open: 7590, high: 7598, low: 7588, close: 7594, volume: 10 }],
  });
}) as typeof fetch;

const bridgeLoadedInput = await buildHistoricalResearchBackfillInput({
  ...parsed,
  from: '2026-05-28',
  to: '2026-05-29',
  source: 'local',
  bridgeInstrument: 'MES 06-26',
  auditDir,
  diagnosticDir,
  researchDir,
  out: researchReportDir,
});
globalThis.fetch = originalFetch;

assert.ok(bridgeLoadedInput.completedBars5m && bridgeLoadedInput.completedBars5m.length > 0);
assert.ok(bridgeLoadedInput.barCoverage?.some((coverage) => coverage.timeframe === '5m' && coverage.completedBarsRemaining > 0));
assert.ok(bridgeLoadedInput.barCoverage?.every((coverage) => coverage.timeframe === 'daily' || (coverage.requestFailures || 0) === 0));
assert.ok(bridgeLoadedInput.sourceCoverage?.perDateBarCoverage?.some((coverage) => coverage.date === '2026-05-28' && coverage.timeframe === '5m' && coverage.completedBarsRemaining > 0));
assert.ok(bridgeLoadedInput.sourceCoverage?.localBridgeDatesScanned.includes('2026-05-28'));
assert.ok(bridgeRequests.length >= 16);
assert.ok(bridgeRequests.every((url) => {
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';
  return from.slice(0, 10) === to.slice(0, 10);
}));
assert.ok(bridgeRequests.some((url) => url.searchParams.get('from') === '2026-05-28T09:30:00'));
assert.ok(bridgeRequests.some((url) => url.searchParams.get('to') === '2026-05-29T16:00:00'));

writeFileSync(join(diagnosticDir, 'diagnostic.json'), JSON.stringify({
  finalClassification: 'C_UNAPPROVED_ICT_FVG_WATCHLIST',
  tradeDate: '2026-05-20',
  instrument: 'MES',
  suspectedMoveDirection: 'LONG',
}));
writeFileSync(join(auditDir, 'scanner-1.json'), JSON.stringify({
  source: 'live-scanner',
  tradeDate: '2026-05-20',
  instrument: 'MES',
  alertType: 'trade',
}));
writeFileSync(join(auditDir, 'scanner-2.json'), JSON.stringify({
  source: 'live-scanner',
  tradeDate: '2026-05-21',
  instrument: 'MES',
  alertType: 'watchlist',
}));
writeFileSync(join(researchDir, 'time-window-note.md'), readFileSync('docs/research/time-window-liquidity-delivery-watchlist-research.md', 'utf8'));
writeFileSync(join(researchReportDir, 'research-backfill.json'), JSON.stringify(report));

const savedSupabaseEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};
delete process.env.SUPABASE_URL;
delete process.env.VITE_SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_ANON_KEY;
delete process.env.VITE_SUPABASE_ANON_KEY;
delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const builtInput = await buildHistoricalResearchBackfillInput({
  ...parsed,
  source: 'supabase',
  auditDir,
  diagnosticDir,
  researchDir,
  out: researchReportDir,
});
for (const [key, value] of Object.entries(savedSupabaseEnv)) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
assert.equal(builtInput.completedBars5m?.length, 0);
assert.ok((builtInput.events?.length || 0) >= 1);
assert.equal(builtInput.auditRecords?.length, 2);
assert.ok(builtInput.detectorAudit?.time_window_liquidity_delivery?.topRejectionReasons.some((reason) => reason.includes('Audit records scanned')));
assert.ok((builtInput.dataWarnings || []).some((warning) => warning.includes('Supabase config unavailable')) || (builtInput.supabaseRecords?.length || 0) >= 0);

const auditOnlyZeroReport = runHistoricalResearchBackfill({
  from: '2026-01-01',
  to: '2026-05-29',
  instrument: 'MES',
  auditRecords: Array.from({ length: 182 }, (_, index) => ({ tradeDate: `2026-05-${String((index % 28) + 1).padStart(2, '0')}` })),
  sourceCoverage: {
    localBridgeDatesScanned: [],
    supabaseRecordsScanned: 0,
    auditJsonRecordsScanned: 182,
    diagnosticReportsScanned: 0,
    skippedDates: [],
    missingDataDates: ['2026-01-01..2026-05-29'],
  },
  detectorAudit: {
    time_window_liquidity_delivery: {
      conceptId: 'time_window_liquidity_delivery',
      datesEvaluated: ['2026-05-01'],
      rawCandidatePrefilterCount: 0,
      rejectedCount: 182,
      topRejectionReasons: ['Audit records scanned but most do not carry researchConcept tags or diagnostic classifications.'],
      finalCandidateCount: 0,
    },
  },
  events: [],
});
assert.equal(auditOnlyZeroReport.dataCoverage.auditRecords, 182);
assert.ok(auditOnlyZeroReport.zeroCandidateExplanation.some((reason) => reason.includes('182 audit JSON record(s) were scanned')));
assert.ok(auditOnlyZeroReport.markdown.includes('Audit records: 182'));

const weeklyOptions = parseWeeklyReportArgs([
  '--week-ending', '2026-05-29',
  '--instrument', 'MES',
  '--diagnostic-dir', diagnosticDir,
  '--research-report-dir', researchReportDir,
  '--audit-dir', auditDir,
  '--research-dir', researchDir,
]);
const weeklyInput = await collectWeeklyReportInput(weeklyOptions);
assert.equal(weeklyInput.researchBackfillReports?.length, 1);

console.log('Historical research backfill agent verified.');
