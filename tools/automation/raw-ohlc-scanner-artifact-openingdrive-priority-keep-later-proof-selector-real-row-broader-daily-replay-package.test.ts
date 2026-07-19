import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-broader-daily-replay-package-'));
const reportDir = path.join(root, 'reports');
const auditDir = path.join(root, 'audit');
fs.mkdirSync(reportDir, { recursive: true });
fs.mkdirSync(auditDir, { recursive: true });

function writeTape(date: string, session: string): void {
  fs.writeFileSync(path.join(auditDir, `scanner-decision-tape-${date}-MES-${session}.json`), JSON.stringify({
    events: {
      a: { completed5m: { time: `${date}T09:30:00`, open: 100, high: 101, low: 99, close: 100.5 } },
      b: { completed5m: { time: `${date}T09:35:00`, open: 100.5, high: 102, low: 100, close: 101.5 } },
    },
  }));
}

function metadataReport(rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport['rows']): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_metadata_replay_audit',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority: {
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
    },
    source: { artifactPath: null, reportDir },
    assumptions: {
      savedArtifactsOnly: true,
      usesCurrentProofSelectionSignalBuilder: true,
      noRankConsumerInstalled: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      eventsScanned: 1,
      refsBuilt: rows.length,
      signalRows: rows.length,
      collisionSignalRows: rows.length,
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      preferReplacementRows: 0,
      keepLaterRowsWithValidLevels: rows.filter((row) => row.deterministicLevelsValid).length,
      missingCompletedProofGroups: 0,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: 'real_metadata_replay_supports_rank_consumer_research_only',
    },
    rows,
    blockers: [],
    markdown: '',
  };
}

function row(overrides: Partial<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport['rows'][number]> = {}): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport['rows'][number] {
  return {
    candidateKey: 'candidate-1',
    eventTime: '2026-07-06T09:30:00',
    tradeDate: '2026-07-06',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace' as RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport['rows'][number]['setupType'],
    direction: 'LONG',
    completedBarTime: '2026-07-06T09:30:00',
    selectorDecision: 'keep_later_sweep_proof',
    groupSize: 2,
    competingSetupTypes: [],
    entry: 100,
    stop: 98,
    target1: 103,
    target2: 104,
    riskPoints: 2,
    deterministicLevelsValid: true,
    ...overrides,
  };
}

writeTape('2026-07-06', 'morning');
writeTape('2026-07-07', 'morning');

const valid = row();
const duplicate = row({ candidateKey: 'candidate-duplicate' });
const missingLevel = row({ candidateKey: 'missing-level', tradeDate: '2026-07-07', entry: null });
const invalidGeometry = row({ candidateKey: 'invalid-geometry', tradeDate: '2026-07-07', stop: 101 });
const missingTape = row({ candidateKey: 'missing-tape', tradeDate: '2026-07-08' });
const nonKeepLater = row({ candidateKey: 'prefer', selectorDecision: 'prefer_replacement' });

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport({
  reportDir,
  auditDir,
  artifactPaths: [
    path.join(reportDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-06-to-2026-07-06-1.json'),
    path.join(reportDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-07-to-2026-07-07-1.json'),
  ],
  realMetadataReports: [
    { artifactPath: path.join(reportDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-06-to-2026-07-06-1.json'), report: metadataReport([valid, duplicate, nonKeepLater]) },
    { artifactPath: path.join(reportDir, 'raw-ohlc-scanner-artifacts-MES-2026-07-07-to-2026-07-07-1.json'), report: metadataReport([missingLevel, invalidGeometry, missingTape]) },
  ],
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.artifactsRead, 2);
assert.equal(report.summary.realKeepLaterRowsRead, 5);
assert.equal(report.summary.duplicateRowsSkipped, 1);
assert.equal(report.summary.readyReplayRows, 1);
assert.equal(report.summary.excludedMissingLevelRows, 1);
assert.equal(report.summary.excludedInvalidGeometryRows, 1);
assert.equal(report.summary.excludedMissingTapeRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].outcomeInputStatus, 'ready_for_read_only_outcome_replay');
assert.match(report.markdown, /Broader Daily Real-Row Replay Package/);

console.log('OpeningDrive proofSelectionSignal broader daily real-row replay package verified.');
