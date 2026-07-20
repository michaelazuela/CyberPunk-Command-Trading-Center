import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshReplayPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-fresh-replay-package';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';

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

function validationPackage(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport {
  return {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_validation_package',
    generatedAt: '2026-07-20T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      separatorPath: 'separator.json',
      proofContextEnrichmentPath: 'enrichment.json',
    },
    assumptions: {
      savedReportsOnly: true,
      packagesResearchCandidatesOnly: true,
      excludesLookaheadRejectedSeparators: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshReplayRunByThisReport: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: 3,
      researchProxyCandidates: 1,
      packageRows: 2,
      winners: 2,
      losses: 0,
      unresolved: 0,
      oneMesPl: 150,
      livePromotionAllowedRows: 0,
      recommendation: 'run_fresh_replay_validation',
    },
    proxySummaries: [],
    rows: [
      {
        ticketId: 'ticket-a',
        tradeDate: '2026-06-01',
        session: 'lunch',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'LONG',
        proofTime: '2026-06-01T12:35:00',
        riskPoints: 10,
        proofRankInSlate: 1,
        firstValidProof: true,
        changedSlateRow: true,
        matchedProxyIds: ['risk:10.25-12'],
        outcomeBucket: 'winner_t1_and_t2',
        resolvedOneMesPl: 100,
        replayValidationStatus: 'queued_for_fresh_validation',
      },
      {
        ticketId: 'ticket-b',
        tradeDate: '2026-06-02',
        session: 'lunch',
        setupType: 'AfterLunchDriveFvgContinuation',
        direction: 'SHORT',
        proofTime: '2026-06-02T12:45:00',
        riskPoints: 8,
        proofRankInSlate: 2,
        firstValidProof: false,
        changedSlateRow: false,
        matchedProxyIds: ['risk+hour:8.25-10|12'],
        outcomeBucket: 'winner_t1_only',
        resolvedOneMesPl: 50,
        replayValidationStatus: 'queued_for_fresh_validation',
      },
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function sourceReplayPackage(): UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  return {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt: '2026-07-20T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      triageReportPath: 'triage.json',
      auditDir: 'reports',
    },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: 3,
      replayPackageRows: 3,
      readyRows: 3,
      blockedRows: 0,
      directionallyInvalidGeometryRows: 0,
      modelGroups: 1,
      sessionGroups: 1,
      livePromotionAllowedRows: 0,
    },
    rows: [
      replayRow('ticket-a', 'LONG', 7500, 7490, 7515, 7520),
      replayRow('ticket-b', 'SHORT', 7520, 7528, 7508, 7504),
      replayRow('ticket-c', 'LONG', 7530, 7524, 7539, 7542),
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function replayRow(ticketId: string, direction: 'LONG' | 'SHORT', entry: number, stop: number, t1: number, t2: number): UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number] {
  return {
    ticketId,
    tradeDate: ticketId === 'ticket-a' ? '2026-06-01' : '2026-06-02',
    session: 'lunch',
    instrument: 'MES',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction,
    proofTime: ticketId === 'ticket-a' ? '2026-06-01T12:35:00' : '2026-06-02T12:45:00',
    firstSeenTime: ticketId === 'ticket-a' ? '2026-06-01T12:35:00' : '2026-06-02T12:45:00',
    lastSeenTime: ticketId === 'ticket-a' ? '2026-06-01T12:35:00' : '2026-06-02T12:45:00',
    occurrences: 1,
    entry,
    stop,
    t1,
    t2,
    riskPoints: Math.abs(entry - stop),
    t1R: 1.5,
    t2R: 2,
    proofState: 'Possible:Conditional:EntryTriggerPending',
    triageScore: 0,
    sourceTapePath: 'source-tape.json',
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 10,
    barsAfterProof: 5,
    firstBarTime: '2026-06-01T09:15:00',
    lastBarTime: '2026-06-02T15:55:00',
    outcomeInputStatus: 'ready_for_read_only_outcome_replay',
    blockers: [],
  };
}

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshReplayPackageReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  validationPackage: validationPackage(),
  sourceReplayPackagePaths: ['source.json'],
  sourceReplayPackages: [sourceReplayPackage()],
}, '2026-07-20T01:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectedRowsRead, 2);
assert.equal(report.summary.replayPackageRows, 2);
assert.equal(report.summary.readyRows, 2);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.deepEqual(report.rows.map((row) => row.ticketId), ['ticket-a', 'ticket-b']);
assert.equal(report.rows[0].entry, 7500);
assert.equal(report.rows[0].stop, 7490);
assert.equal(report.rows[0].t1, 7515);
assert.equal(report.rows[0].t2, 7520);
assert.equal(report.rows[0].sourceTapePath, 'source-tape.json');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesEntryStopTargets, false);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshReplayPackageReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  validationPackage: validationPackage(),
  sourceReplayPackagePaths: ['source.json'],
  sourceReplayPackages: [{ ...sourceReplayPackage(), rows: [replayRow('ticket-a', 'LONG', 7500, 7490, 7515, 7520)] }],
}, '2026-07-20T01:00:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.some((blocker) => blocker.includes('ticket-b: missing source replay package row')));

console.log('unified positive held-local AfterLunch proof-time proxy fresh replay package verified.');
