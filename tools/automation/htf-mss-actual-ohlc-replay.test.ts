import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildActualOhlcReplayReport,
  buildReadinessReport,
  loadHistoricalOhlcFromJson,
  validateHistoricalBars,
  writeActualOhlcReplayArtifacts,
} from './htf-mss-actual-ohlc-replay';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

const bars5m = [
  bar('2026-06-01T13:25:00-04:00', 7604.00, 7605.25, 7601.75, 7602.25),
  bar('2026-06-01T13:30:00-04:00', 7602.25, 7603.25, 7597.25, 7598.50),
  bar('2026-06-01T13:35:00-04:00', 7598.50, 7600.25, 7594.00, 7595.25),
  bar('2026-06-01T13:40:00-04:00', 7595.25, 7598.25, 7588.25, 7597.50),
  bar('2026-06-01T13:45:00-04:00', 7597.50, 7602.50, 7595.75, 7600.75),
  bar('2026-06-01T13:50:00-04:00', 7600.75, 7606.75, 7599.25, 7604.50),
  bar('2026-06-01T13:55:00-04:00', 7604.50, 7624.75, 7604.00, 7623.75),
  bar('2026-06-01T14:00:00-04:00', 7623.75, 7626.25, 7621.75, 7624.25),
  bar('2026-06-01T14:05:00-04:00', 7624.25, 7626.75, 7622.50, 7625.25),
  bar('2026-06-01T14:10:00-04:00', 7625.25, 7627.25, 7623.75, 7625.75),
];

function potentialBars(timeframe: '15m' | '60m' | '120m' | '240m'): NinjaBridgeBar[] {
  const times =
    timeframe === '15m'
      ? ['12:00', '12:15', '12:30', '12:45', '13:00', '13:15']
      : timeframe === '60m'
        ? ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00']
        : timeframe === '120m'
          ? ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00']
          : ['00:00', '04:00', '08:00', '12:00', '13:00', '14:00'];
  return [
    bar(`2026-06-01T${times[0]}:00-04:00`, 7600, 7601, 7599, 7600),
    bar(`2026-06-01T${times[1]}:00-04:00`, 7600, 7601, 7598, 7599),
    bar(`2026-06-01T${times[2]}:00-04:00`, 7599, 7600, 7597, 7598),
    bar(`2026-06-01T${times[3]}:00-04:00`, 7598, 7599, 7596, 7597),
    bar(`2026-06-01T${times[4]}:00-04:00`, 7597, 7599, 7595, 7598),
    bar(`2026-06-01T${times[5]}:00-04:00`, 7598, 7600, 7596, 7599),
  ];
}

const tempDir = mkdtempSync(join(tmpdir(), 'htf-mss-actual-ohlc-'));
const fixturePath = join(tempDir, 'june-1-bars.json');
writeFileSync(fixturePath, JSON.stringify({
  instrument: 'MES',
  date: '2026-06-01',
  bars5m: [bars5m[1], bars5m[0], bars5m[1], ...bars5m.slice(2)],
  bars15m: potentialBars('15m'),
  bars60m: potentialBars('60m'),
  bars120m: potentialBars('120m'),
  bars240m: potentialBars('240m'),
}, null, 2));

const loaded = loadHistoricalOhlcFromJson(fixturePath);
assert.equal(loaded.ok, true);
assert.equal(loaded.source, 'json_file');
assert.equal(loaded.barCounts['5m'], bars5m.length);
assert.equal(loaded.duplicateTimestamps['5m'].length, 1);
assert.equal(loaded.bars.bars5m[0].time, '2026-06-01T13:25:00-04:00');
assert.equal(loaded.timezone, 'America/New_York');
assert.equal(loaded.timeframeRanges['240m'].from, '2026-06-01T00:00:00-04:00');
assert.ok(loaded.insufficientLookback.some((item) => item.includes('240m')));

const actualReport = buildActualOhlcReplayReport(loaded);
assert.equal(actualReport.reportType, 'htf_mss_june_1_actual_ohlc_replay');
assert.equal(actualReport.boundary, 'actual_ohlc_replay_only_not_execution_authority');
assert.equal(actualReport.htfLiquidityDrawState.timeframeStack.length, 5);
assert.equal(actualReport.diagnosticReplay.htfMssDiagnostics.approvesExecution, false);
assert.ok(actualReport.timeframeMssEvidenceDiagnostics);
assert.equal(actualReport.timeframeMssEvidenceDiagnostics?.boundary, 'evidence_only_not_approval_or_execution_authority');
assert.equal(actualReport.timeframeMssEvidenceDiagnostics?.approvesExecution, false);
assert.equal(actualReport.timeframeMssEvidenceDiagnostics?.changesTradeLogic, false);
assert.ok(actualReport.timeframeMssEvidenceDiagnostics?.timeframes.some((item) => item.timeframe === '120M'));
assert.ok(actualReport.activeTimeframeMssRulesetDiagnostics);
assert.equal(actualReport.activeTimeframeMssRulesetDiagnostics.appliesToAllModels, true);
assert.ok(actualReport.activeTimeframeMssRulesetDiagnostics.summary.includes('Active MSS ruleset'));
assert.equal(actualReport.diagnosticReplay.timeframeMssEvidenceDiagnostics.approvesExecution, false);
assert.equal(actualReport.diagnosticReplay.timeframeMssEvidenceDiagnostics.changesTradeLogic, false);
assert.ok(actualReport.diagnosticReplay.activeTimeframeMssRulesetDiagnostics.summary.includes('Active MSS ruleset'));
assert.equal(actualReport.safeWording.noBrokerExecution, true);
assert.equal(actualReport.safeWording.externalLiquidityIsContextOnly, true);
assert.equal(actualReport.safeWording.t1T2AreAppComputedRTargets, true);
assert.equal(actualReport.finalGateResult.canExecute, false);
assert.equal(actualReport.finalGateResult.approvedTradeOnlyAfterDeterministicGates, true);
assert.ok('timeframeRanges' in actualReport);
assert.ok('insufficientLookback' in actualReport);
assert.ok('htfContextSufficiency' in actualReport);
assert.ok('classificationReliability' in actualReport);
assert.equal(actualReport.htfContextSufficiency.overallStatus, 'data_limited');
assert.equal(actualReport.htfContextDataLimited, true);
assert.equal(actualReport.classificationReliability, 'data_limited');
assert.ok(actualReport.timeframeCoverage.some((coverage) => coverage.timeframe === '4H' && coverage.status === 'data_limited'));
assert.ok(actualReport.classificationReason.includes('HTF context is data-limited') || actualReport.classificationReason.includes('5M bullish MSS confirmed'));
assert.ok(actualReport.htfLiquidityDrawState.htfContextDataLimited);
assert.equal(actualReport.htfLiquidityDrawState.classificationReliability, 'data_limited');
assert.ok(actualReport.htfLiquidityDrawState.timeframeCoverage.every((coverage) => coverage.minimumExpectedDescription.length > 0));
assert.ok(actualReport.diagnosticReplay.htfMssDiagnostics.htfContextDataLimited);
assert.equal(actualReport.diagnosticReplay.htfMssDiagnostics.classificationReliability, 'data_limited');

const invalidValidation = validateHistoricalBars({
  bars5m: [bar('2026-06-01T12:00:00-04:00', 10, 9, 11, 10)],
  bars15m: potentialBars('15m'),
  bars60m: potentialBars('60m'),
  bars120m: potentialBars('120m'),
  bars240m: potentialBars('240m'),
});
assert.equal(invalidValidation.ok, false);
assert.ok(invalidValidation.blockers.some((item) => item.includes('invalid OHLC bounds')));

const missingTimeframe = validateHistoricalBars({
  bars5m,
  bars15m: [],
  bars60m: potentialBars('60m'),
  bars120m: potentialBars('120m'),
  bars240m: potentialBars('240m'),
});
assert.equal(missingTimeframe.ok, false);
assert.ok(missingTimeframe.blockers.some((item) => item.includes('15m: no valid bars loaded')));
assert.ok(missingTimeframe.insufficientLookback.some((item) => item.includes('240m')));

const noOffsetPath = join(tempDir, 'no-offset-bars.json');
writeFileSync(noOffsetPath, JSON.stringify({
  bars5m: [bar('2026-06-01T12:00:00', 10, 11, 9, 10.5)],
  bars15m: potentialBars('15m'),
  bars60m: potentialBars('60m'),
  bars120m: potentialBars('120m'),
  bars240m: potentialBars('240m'),
}, null, 2));
const noOffset = loadHistoricalOhlcFromJson(noOffsetPath);
assert.equal(noOffset.ok, true);
assert.ok(noOffset.warnings.some((item) => item.includes('treated as America/New_York')));

const readiness = buildActualOhlcReplayReport({
  ...loaded,
  ok: false,
  blockers: ['5m: no valid bars loaded.'],
  barCounts: { '5m': 0, '15m': 0, '60m': 0, '120m': 0, '240m': 0 },
});
assert.equal(readiness.reportType, 'htf_mss_june_1_actual_ohlc_readiness');
assert.equal(readiness.replayClaimMade, false);
assert.ok(readiness.requiredStatement.includes('did not claim actual-data replay success'));

const explicitReadiness = buildReadinessReport();
assert.equal(explicitReadiness.actualBarsFound, false);
assert.ok(explicitReadiness.rerun.some((item) => item.includes('htf-mss-actual-ohlc-replay.ts')));

const artifacts = writeActualOhlcReplayArtifacts(actualReport, tempDir);
const artifactMarkdown = readFileSync(artifacts.markdownPath, 'utf8');
assert.ok(artifactMarkdown.includes('# HTF/MSS June 1 Actual OHLC Replay'));
assert.ok(artifactMarkdown.includes('Candidate status does not equal executable approval.'));
assert.ok(artifactMarkdown.includes('Ranges: 5M='));
assert.ok(artifactMarkdown.includes('## HTF Context Sufficiency'));
assert.ok(artifactMarkdown.includes('Status: partial'));
assert.ok(artifactMarkdown.includes('Reliability: data_limited'));
assert.ok(artifactMarkdown.includes('HTF Usage: context only; not structural confirmation'));
assert.ok(artifactMarkdown.includes('Candidate Promotion: blocked by data-limited HTF context'));
assert.ok(artifactMarkdown.includes('Minimum Expected'));
assert.ok(artifactMarkdown.includes('Data-Limited Blockers'));
assert.ok(artifactMarkdown.includes('## Timeframe MSS Evidence'));
assert.ok(artifactMarkdown.includes('Boundary: evidence_only_not_approval_or_execution_authority. Approves execution: false. Changes trade logic: false.'));
assert.equal(/HTF conflict confirmed|Bullish structure confirmed|Bearish structure confirmed|Candidate ready/i.test(artifactMarkdown), false);
assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(artifactMarkdown), false);

const readinessArtifacts = writeActualOhlcReplayArtifacts(readiness, tempDir);
const readinessMarkdown = readFileSync(readinessArtifacts.markdownPath, 'utf8');
assert.ok(readinessMarkdown.includes('# HTF/MSS June 1 Actual OHLC Readiness'));
assert.ok(readinessMarkdown.includes('Actual June 1 historical OHLC bars were not available.'));

console.log('HTF/MSS actual OHLC replay loader and readiness path verified.');
