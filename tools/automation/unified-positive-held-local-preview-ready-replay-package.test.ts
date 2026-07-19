import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReadyReplayPackageReport,
  parseUnifiedPositiveHeldLocalPreviewReadyReplayPackageArgs,
} from './unified-positive-held-local-preview-ready-replay-package';

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

function row(ticketId: string, status: 'ready_for_read_only_outcome_replay' | 'blocked', blockers: string[] = []) {
  return {
    ticketId,
    tradeDate: '2026-07-19',
    session: 'morning',
    instrument: 'MES',
    setupType: ticketId.includes('OpeningDrive') ? 'OpeningDriveFvgContinuation' : 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-07-19T10:00:00',
    firstSeenTime: '2026-07-19T10:00:00',
    lastSeenTime: '2026-07-19T10:05:00',
    occurrences: 1,
    entry: 100,
    stop: 98,
    t1: 103,
    t2: 104,
    riskPoints: 2,
    t1R: 1.5,
    t2R: 2,
    proofState: 'human_review_ready',
    triageScore: 200,
    sourceTapePath: 'tape.json',
    barsSource: status === 'ready_for_read_only_outcome_replay' ? 'scanner_decision_tape_completed_5m' : 'missing',
    barsLoaded: status === 'ready_for_read_only_outcome_replay' ? 10 : 0,
    barsAfterProof: status === 'ready_for_read_only_outcome_replay' ? 8 : 0,
    firstBarTime: '2026-07-19T10:00:00',
    lastBarTime: '2026-07-19T10:40:00',
    outcomeInputStatus: status,
    blockers,
  };
}

const source = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'fail',
  authority,
  source: { reportDir: 'reports', triageReportPath: 'triage.json', auditDir: 'audit' },
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
    readyRows: 2,
    blockedRows: 1,
    directionallyInvalidGeometryRows: 1,
    modelGroups: 2,
    sessionGroups: 1,
    livePromotionAllowedRows: 0,
  },
  rows: [
    row('OpeningDrive-ready', 'ready_for_read_only_outcome_replay'),
    row('Sweep-ready', 'ready_for_read_only_outcome_replay'),
    row('blocked-bad-geometry', 'blocked', ['directionally invalid entry-to-stop geometry']),
  ],
  blockers: ['blocked-bad-geometry: directionally invalid entry-to-stop geometry'],
  recommendations: [],
  markdown: '',
} as any;

const report = buildUnifiedPositiveHeldLocalPreviewReadyReplayPackageReport({
  replayPackagePath: 'source-package.json',
  replayPackageReport: source,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.originalReplayPackageRows, 3);
assert.equal(report.summary.replayPackageRows, 2);
assert.equal(report.summary.readyRows, 2);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.excludedBlockedRows, 1);
assert.equal(report.summary.directionallyInvalidGeometryRows, 1);
assert.equal(report.rows.length, 2);
assert.equal(report.excludedRows.length, 1);
assert.equal(report.source.originalReplayPackagePath, 'source-package.json');
assert.match(report.markdown, /Ready Replay Package/);

const blocked = buildUnifiedPositiveHeldLocalPreviewReadyReplayPackageReport({
  replayPackagePath: 'empty.json',
  replayPackageReport: { ...source, rows: [], summary: { ...source.summary, livePromotionAllowedRows: 0 } },
}, '2026-07-19T00:02:00.000Z');
assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.includes('source package had no ready outcome replay rows'));

const parsed = parseUnifiedPositiveHeldLocalPreviewReadyReplayPackageArgs([
  '--replay-package',
  'source.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.replayPackagePath, 'source.json');
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('unified positive held-local preview ready replay package verified.');
