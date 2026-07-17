import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildHeldLocalReviewTicketArtifact } from '../../src/lib/localScannerEngine';
import { SetupType } from '../../src/types';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import { buildUnifiedPositiveGuardedScannerReplayReport } from './unified-positive-guarded-scanner-replay';

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guarded-scanner-replay-'));
const artifact = buildHeldLocalReviewTicketArtifact({
  ticketId: 'fixture-ticket',
  setupType: SetupType.TurtleSoup,
  direction: 'LONG',
  sourceCandidateKey: 'TurtleSoup|fixture|LONG|100.00|0',
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  proofTime: '2026-07-01T10:05:00',
  triggerCondition: 'Fresh completed 5M retest/re-entry proof.',
  invalidationText: 'Invalid at 96.',
});

const adapterReport = {
  reportType: 'unified_positive_held_local_ticket_adapter',
  generatedAt: '2026-07-16T00:00:00.000Z',
  authority: {
    readOnly: true,
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
  },
  source: {
    contractComparisonPath: 'comparison.json',
  },
  summary: {
    comparisonRowsLoaded: 1,
    heldLocalArtifactsCreated: 1,
    blockedContractGapRows: 0,
    shouldPostFalseArtifacts: 1,
    canExecuteFalseArtifacts: 1,
    publishDiscordFalseArtifacts: 1,
  },
  rows: [
    {
      ticketId: 'fixture-ticket',
      sourceSnapshotId: 'scanner-fixture',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      adapterStatus: 'held_local_artifact_created',
      artifact,
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalTicketAdapterReport;

const blocked = buildUnifiedPositiveGuardedScannerReplayReport({
  heldLocalAdapter: adapterReport,
  heldLocalAdapterPath: 'adapter.json',
  outDir,
  explicitGuardEnabled: false,
}, '2026-07-16T00:01:00.000Z');

assert.equal(blocked.reportType, 'unified_positive_guarded_scanner_replay');
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.authority.localOnly, true);
assert.equal(blocked.authority.postsDiscord, false);
assert.equal(blocked.authority.writesSupabase, false);
assert.equal(blocked.authority.readsLiveBridge, false);
assert.equal(blocked.authority.runsLiveSetupScanner, false);
assert.equal(blocked.authority.changesScannerBehavior, false);
assert.equal(blocked.authority.changesCanExecute, false);
assert.equal(blocked.authority.changesDiscordPosting, false);
assert.equal(blocked.summary.explicitGuardEnabled, false);
assert.equal(blocked.summary.dryRunReplayStatus, null);
assert.equal(blocked.summary.inspectionStatus, null);
assert.equal(blocked.output.dryRunReplayJsonPath, null);
assert.equal(blocked.output.inspectionJsonPath, null);
assert.ok(blocked.blockers.includes('Missing required --enable-held-local-inspection guard flag.'));

const report = buildUnifiedPositiveGuardedScannerReplayReport({
  heldLocalAdapter: adapterReport,
  heldLocalAdapterPath: 'adapter.json',
  outDir,
  explicitGuardEnabled: true,
}, '2026-07-16T00:02:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.explicitGuardEnabled, true);
assert.equal(report.summary.dryRunReplayStatus, 'pass');
assert.equal(report.summary.inspectionStatus, 'pass');
assert.equal(report.summary.heldLocalTickets, 1);
assert.equal(report.summary.zeroLivePublishBehaviorChangeRows, 1);
assert.equal(report.summary.inspectableTickets, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.blockers.length, 0);
assert.ok(report.output.dryRunReplayJsonPath);
assert.ok(report.output.inspectionJsonPath);
assert.equal(fs.existsSync(report.output.dryRunReplayJsonPath || ''), true);
assert.equal(fs.existsSync(report.output.inspectionJsonPath || ''), true);
assert.match(report.markdown, /Production Discord\/Supabase publishing remains disabled/);

console.log('unified positive guarded scanner replay verified.');
