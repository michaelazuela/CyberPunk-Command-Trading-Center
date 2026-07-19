import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-source-discovery';

const authority = {
  readOnly: true,
  localOnly: true,
  researchOnly: true,
  postsDiscord: false,
  writesSupabase: false,
  readsLiveSupabase: false,
  readsLiveBridge: false,
  runsSetupScanner: false,
  changesScannerBehavior: false,
  changesTradingLogic: false,
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesRiskRules: false,
  changesBridgeBehavior: false,
  changesDiscordPosting: false,
  changesAppRuntime: false,
} as const;

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-source-discovery-'));
const baselinePath = path.join(tmp, 'raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-1.json');
const outcomePath = path.join(tmp, 'unified-positive-held-local-preview-replay-package-outcome-2.json');
const samebarPath = path.join(tmp, 'raw-ohlc-scanner-artifact-samebar-separator-drilldown-3.json');

writeJson(baselinePath, {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { samebarReports: [] },
  summary: {
    comparableEvents: 13,
    installedPrioritySelectedRows: 13,
    installedOpeningDriveSelectedRows: 0,
    canExecuteTrueRows: 0,
    approvalBoundaryDriftRows: 0,
    priorityLosses: 0,
    openingDriveLosses: 2,
    openingDriveOneMesPl: 934.39,
    priorityOneMesPl: 2300,
    deltaOneMesPl: 1365.61,
    recommendation: 'source_artifacts_match_installed_priority_overlay',
    livePromotionAllowedRows: 0,
  },
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
});

writeJson(outcomePath, {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T01:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: tmp, replayPackagePath: 'package.json' },
  assumptions: {},
  summary: {
    livePromotionAllowedRows: 0,
  },
  rows: [{ ticketId: 'ticket-1' }],
  blockers: [],
  recommendations: [],
  markdown: '',
});

const baselineTime = Date.now() - 2000;
const outcomeTime = Date.now() - 1000;
fs.utimesSync(baselinePath, baselineTime / 1000, baselineTime / 1000);
fs.utimesSync(outcomePath, outcomeTime / 1000, outcomeTime / 1000);

const pending = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport({
  reportDir: tmp,
  baselineReportPath: baselinePath,
  baselineReport: JSON.parse(fs.readFileSync(baselinePath, 'utf8')),
}, '2026-07-19T02:00:00.000Z');

assert.equal(pending.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_source_discovery');
assert.equal(pending.status, 'pass');
assert.equal(pending.authority.changesTradingLogic, false);
assert.equal(pending.authority.readsLiveBridge, false);
assert.equal(pending.summary.outcomeReportsAfterBaseline, 1);
assert.equal(pending.summary.pendingOutcomeReports, 1);
assert.equal(pending.summary.convertedOutcomeReports, 0);
assert.equal(pending.summary.samebarReportsAfterBaseline, 0);
assert.equal(pending.summary.broadeningAllowedNow, false);
assert.equal(pending.summary.recommendation, 'convert_pending_outcomes_to_samebar_reports');
assert.match(pending.rows[0].suggestedCommand || '', /raw-ohlc-scanner-artifact-samebar-separator-drilldown/);

writeJson(samebarPath, {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-19T01:05:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: tmp, replayPackageOutcomePath: outcomePath },
  assumptions: {},
  summary: {},
  modelSummaries: [],
  timeBuckets: [],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
});
fs.utimesSync(samebarPath, Date.now() / 1000, Date.now() / 1000);

const converted = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport({
  reportDir: tmp,
  baselineReportPath: baselinePath,
  baselineReport: JSON.parse(fs.readFileSync(baselinePath, 'utf8')),
}, '2026-07-19T02:05:00.000Z');

assert.equal(converted.summary.pendingOutcomeReports, 0);
assert.equal(converted.summary.convertedOutcomeReports, 1);
assert.equal(converted.summary.samebarReportsAfterBaseline, 1);
assert.equal(converted.summary.recommendation, 'rerun_fresh_observation_monitor');

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryArgs([
  '--report-dir',
  'reports',
  '--baseline-report',
  'baseline.json',
  '--json',
]);
assert.equal(parsed.reportDir, 'reports');
assert.equal(parsed.baselineReport, 'baseline.json');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive priority fresh source discovery verified.');
