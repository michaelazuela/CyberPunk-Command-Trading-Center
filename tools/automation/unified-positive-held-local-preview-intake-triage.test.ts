import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewIntakeTriageReport,
} from './unified-positive-held-local-preview-intake-triage';

const intakeReport = {
  reportType: 'unified_positive_held_local_preview_reviewed_case_intake',
  status: 'pass',
  rows: [
    {
      intakeId: '2026-06-16-morning-raidReclaim-LONG',
      tradeDate: '2026-06-16',
      session: 'morning',
      instrument: 'MES',
      setupType: 'raidReclaim',
      direction: 'LONG',
      firstSeenTime: '2026-06-16T09:55:00.0000000',
      lastSeenTime: '2026-06-16T09:55:00.0000000',
      occurrences: 1,
      entry: 7625.5,
      stop: 7621.5,
      target1: 7634.25,
      target2: 7636.5,
      riskPoints: 4,
      candidateState: 'HUMAN_REVIEW_READY',
      executionStatus: 'Conditional',
      detectedStatus: 'Conditional',
      blockReason: null,
      sourceFile: 'scanner-decision-tape-2026-06-16-MES-morning.json',
      intakeDecision: 'already_processed',
    },
    {
      intakeId: '2026-06-09-morning-OpeningDriveFvgContinuation-SHORT',
      tradeDate: '2026-06-09',
      session: 'morning',
      instrument: 'MES',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'SHORT',
      firstSeenTime: '2026-06-09T10:00:00.0000000',
      lastSeenTime: '2026-06-09T10:50:00.0000000',
      occurrences: 8,
      entry: 7472.75,
      stop: 7491.25,
      target1: 7445,
      target2: 7435.75,
      riskPoints: 18.5,
      candidateState: 'OPENING_OBSERVATION_ARMED',
      executionStatus: 'Conditional',
      detectedStatus: 'Possible',
      blockReason: 'EntryTriggerPending',
      sourceFile: 'scanner-decision-tape-2026-06-09-MES-morning.json',
      intakeDecision: 'candidate_for_review_intake',
    },
    {
      intakeId: '2026-06-10-morning-OpeningDriveFvgContinuation-LONG',
      tradeDate: '2026-06-10',
      session: 'morning',
      instrument: 'MES',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      firstSeenTime: '2026-06-10T10:05:00.0000000',
      lastSeenTime: '2026-06-10T10:25:00.0000000',
      occurrences: 3,
      entry: 7341.875,
      stop: 7335,
      target1: 7352.25,
      target2: 7355.75,
      riskPoints: 6.875,
      candidateState: 'OPENING_OBSERVATION_ARMED',
      executionStatus: 'Conditional',
      detectedStatus: 'Possible',
      blockReason: null,
      sourceFile: 'scanner-decision-tape-2026-06-10-MES-morning.json',
      intakeDecision: 'candidate_for_review_intake',
    },
    {
      intakeId: '2026-06-18-lunch-AfterLunchDriveFvgContinuation-SHORT',
      tradeDate: '2026-06-18',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      firstSeenTime: '2026-06-18T13:00:00.0000000',
      lastSeenTime: '2026-06-18T13:30:00.0000000',
      occurrences: 5,
      entry: 7510,
      stop: 7522,
      target1: 7492,
      target2: 7486,
      riskPoints: 12,
      candidateState: 'AFTER_LUNCH_DRIVE_ARMED',
      executionStatus: 'Conditional',
      detectedStatus: 'Possible',
      blockReason: null,
      sourceFile: 'scanner-decision-tape-2026-06-18-MES-lunch.json',
      intakeDecision: 'candidate_for_review_intake',
    },
    {
      intakeId: '2026-06-09-lunch-IntradayMssMicroContinuation-SHORT',
      tradeDate: '2026-06-09',
      session: 'lunch',
      instrument: 'MES',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'SHORT',
      firstSeenTime: '2026-06-09T12:30:00.0000000',
      lastSeenTime: '2026-06-09T12:35:00.0000000',
      occurrences: 2,
      entry: 7295,
      stop: 7364,
      target1: 7191.5,
      target2: 7157,
      riskPoints: 69,
      candidateState: 'HUMAN_REVIEW_READY',
      executionStatus: 'Conditional',
      detectedStatus: 'Conditional',
      blockReason: null,
      sourceFile: 'scanner-decision-tape-2026-06-09-MES-lunch.json',
      intakeDecision: 'candidate_for_review_intake',
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewIntakeTriageReport({
  reportDir: 'diagnostic-reports',
  intakeReportPath: 'intake.json',
  intakeReport,
  maxReplayPackageRows: 3,
  maxRowsPerModel: 1,
}, '2026-07-17T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_intake_triage');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.intakeRowsRead, 5);
assert.equal(report.summary.newIntakeCandidates, 4);
assert.equal(report.summary.alreadyProcessedReferenceRows, 1);
assert.equal(report.summary.selectedReplayPackageRows, 3);
assert.equal(report.summary.heldForLaterBatchRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.selectedReplayPackage.filter((row) => row.setupType === 'OpeningDriveFvgContinuation').length, 1);
assert.ok(report.selectedReplayPackage.some((row) => row.setupType === 'AfterLunchDriveFvgContinuation'));
assert.ok(report.selectedReplayPackage.every((row) => row.triageDecision === 'selected_for_replay_package'));
assert.equal(
  report.rows.find((row) => row.intakeId === '2026-06-16-morning-raidReclaim-LONG')?.triageDecision,
  'already_processed_reference',
);
assert.match(report.markdown, /Selected replay package rows: 3/);

const blockedTopAlternative = buildUnifiedPositiveHeldLocalPreviewIntakeTriageReport({
  reportDir: 'diagnostic-reports',
  intakeReportPath: 'intake.json',
  intakeReport: {
    reportType: 'unified_positive_held_local_preview_reviewed_case_intake',
    status: 'pass',
    rows: [
      {
        intakeId: '2026-06-12-morning-SweepMssFvgRetrace-LONG',
        tradeDate: '2026-06-12',
        session: 'morning',
        instrument: 'MES',
        setupType: 'SweepMssFvgRetrace',
        direction: 'LONG',
        firstSeenTime: '2026-06-12T10:10:00.0000000',
        lastSeenTime: '2026-06-12T11:55:00.0000000',
        occurrences: 18,
        entry: 7395,
        stop: 7432,
        target1: 7450.5,
        target2: 7470,
        riskPoints: 37,
        candidateState: null,
        executionStatus: 'Blocked',
        detectedStatus: 'Blocked',
        blockReason: 'InvalidStopLocation',
        sourceFile: 'scanner-decision-tape-2026-06-12-MES-morning.json',
        intakeDecision: 'candidate_for_review_intake',
      },
      {
        intakeId: '2026-06-12-morning-SweepMssFvgRetrace-SHORT',
        tradeDate: '2026-06-12',
        session: 'morning',
        instrument: 'MES',
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT',
        firstSeenTime: '2026-06-12T10:00:00.0000000',
        lastSeenTime: '2026-06-12T11:45:00.0000000',
        occurrences: 3,
        entry: 7413.25,
        stop: 7444.25,
        target1: 7366.75,
        target2: 7281,
        riskPoints: 31,
        candidateState: null,
        executionStatus: 'Conditional',
        detectedStatus: 'Possible',
        blockReason: 'EntryTriggerPending',
        sourceFile: 'scanner-decision-tape-2026-06-12-MES-morning.json',
        intakeDecision: 'candidate_for_review_intake',
      },
    ],
  },
  maxReplayPackageRows: 2,
  maxRowsPerModel: 1,
}, '2026-07-17T00:00:30.000Z');

assert.equal(blockedTopAlternative.status, 'pass');
assert.equal(blockedTopAlternative.summary.selectedReplayPackageRows, 2);
assert.ok(blockedTopAlternative.selectedReplayPackage.some((row) => row.intakeId === '2026-06-12-morning-SweepMssFvgRetrace-LONG'));
assert.ok(blockedTopAlternative.selectedReplayPackage.some((row) => row.intakeId === '2026-06-12-morning-SweepMssFvgRetrace-SHORT'));
assert.match(
  blockedTopAlternative.rows.find((row) => row.intakeId === '2026-06-12-morning-SweepMssFvgRetrace-SHORT')?.triageReason || '',
  /blocked-top alternate triage/,
);

const missing = buildUnifiedPositiveHeldLocalPreviewIntakeTriageReport({
  reportDir: 'diagnostic-reports',
  intakeReportPath: null,
  intakeReport: null,
}, '2026-07-17T00:01:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('no reviewed-case intake report found'));
assert.ok(missing.blockers.includes('reviewed-case intake report has no rows'));

console.log('unified positive held-local preview intake triage verified.');
