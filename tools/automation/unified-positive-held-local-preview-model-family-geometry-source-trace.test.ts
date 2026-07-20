import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport,
} from './unified-positive-held-local-preview-model-family-geometry-source-trace';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'model-family-geometry-source-trace-'));
const auditDir = path.join(tempRoot, 'discord-audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-05-MES-lunch.json'), JSON.stringify({
  events: {
    a: {
      time: '2026-06-05T12:00:00.0000000',
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'LONG',
            detectedStatus: 'Blocked',
            executionStatus: 'Blocked',
            entry: 100,
            stop: 101,
            target1: 104,
            target2: 106,
            riskPoints: 1,
            blockReason: 'InvalidStopLocation',
          },
        ],
      },
    },
    b: {
      time: '2026-06-05T12:05:00.0000000',
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'LONG',
            detectedStatus: 'Conditional',
            executionStatus: 'Conditional',
            entry: 102,
            stop: 99,
            target1: 106.5,
            target2: 108,
            riskPoints: 3,
            blockReason: 'EntryTriggerPending',
          },
        ],
      },
    },
  },
}, null, 2));

const geometryDrilldownReport = {
  status: 'pass',
  rows: [
    {
      rowId: 'bad-long',
      tradeDate: '2026-06-05',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      firstSeenTime: '2026-06-05T12:00:00',
      entry: 100,
      stop: 101,
      target1: 104,
      target2: 106,
      sourceFile: 'scanner-decision-tape-2026-06-05-MES-lunch.json',
      geometryIssue: 'long_stop_not_below_entry',
    },
    {
      rowId: 'missing-tape',
      tradeDate: '2026-06-06',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      firstSeenTime: '2026-06-06T09:30:00',
      entry: 200,
      stop: 198,
      target1: 195,
      target2: 192,
      sourceFile: 'missing.json',
      geometryIssue: 'short_stop_not_above_entry',
    },
  ],
};

const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport({
  reportDir: tempRoot,
  geometryDrilldownPath: 'geometry.json',
  geometryDrilldownReport: geometryDrilldownReport as never,
  auditDir,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_model_family_geometry_source_trace');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.drilldownRowsRead, 2);
assert.equal(report.summary.sourceTapeFoundRows, 1);
assert.equal(report.summary.badGeometryPresentInSetupStatusRows, 1);
assert.equal(report.summary.missingSourceTapeRows, 1);
assert.equal(report.summary.rowsWithLaterValidSameDirectionCandidate, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].exactBadSetupStatusEvents, 1);
assert.equal(report.rows[0].exactBadBlockReasons[0], 'InvalidStopLocation');
assert.equal(report.rows[0].validSameDirectionAfterFirstSeenEvents, 1);
assert.equal(report.rows[0].sourceConclusion, 'bad_geometry_present_in_setup_status');
assert.equal(report.rows[1].sourceConclusion, 'missing_source_tape');
assert.match(report.markdown, /candidate builder/);

const missing = buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport({
  reportDir: tempRoot,
  geometryDrilldownPath: null,
  geometryDrilldownReport: null,
  auditDir,
}, '2026-07-20T00:00:01.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing geometry drilldown path'));

console.log('unified positive held-local model-family geometry source trace verified.');
