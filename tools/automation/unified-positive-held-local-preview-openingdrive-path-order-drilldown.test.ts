import assert from 'node:assert/strict';
import { buildOpeningDrivePathOrderDrilldownReport } from './unified-positive-held-local-preview-openingdrive-path-order-drilldown';

function bar(time: string, open: number, high: number, low: number, close: number) {
  return { time, open, high, low, close, volume: 1 };
}

const baseSlate = {
  slateKey: 'clean-stop',
  selectedTicketId: '2026-06-17-morning-NoInstalledSetup-SHORT-20260617T100500',
  tradeDate: '2026-06-17',
  proofTime: '2026-06-17T10:05:00',
  direction: 'SHORT' as const,
  entry: 100,
  stop: 104,
  t1: 94,
  t2: 92,
  riskPoints: 4,
  outcomeBucket: 'loss',
  outcomeLabel: 'stopped_before_t1',
  oneMesPl: -20,
  mfeR: 2.5,
  maeR: 1,
  outcomePathWarning: 'Loss row reached 2.5R MFE.',
};

const report = buildOpeningDrivePathOrderDrilldownReport({
  htfStoryReportPath: 'htf-story.json',
  htfStoryReport: {
    slateStories: [
      baseSlate,
      {
        ...baseSlate,
        slateKey: 'winner',
        selectedTicketId: '2026-06-17-morning-NoInstalledSetup-SHORT-20260617T104000',
        proofTime: '2026-06-17T10:40:00',
        outcomeBucket: 'winner',
        outcomeLabel: 't1_and_t2_hit',
        outcomePathWarning: null,
      },
    ],
  },
  htfSourcePath: 'htf-source.json',
  htfSource: {
    bars: {
      '5m': [
        bar('2026-06-17T10:05:00', 102, 102, 99, 100),
        bar('2026-06-17T10:10:00', 100, 101, 98, 100),
        bar('2026-06-17T10:15:00', 100, 104.25, 99, 104),
        bar('2026-06-17T10:20:00', 104, 105, 90, 92),
        bar('2026-06-17T10:40:00', 102, 102, 99, 100),
        bar('2026-06-17T10:45:00', 100, 101, 93, 94),
        bar('2026-06-17T10:50:00', 94, 95, 91, 92),
      ],
    },
  },
  tradeDate: '2026-06-17',
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectedSlates, 2);
assert.equal(report.summary.pathWarningSlates, 1);
assert.equal(report.summary.cleanStopBeforeTargets, 1);
assert.equal(report.summary.cleanTargetBeforeStop, 1);
assert.equal(report.summary.sameBarAmbiguous, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const cleanStop = report.rows.find((row) => row.slateKey === 'clean-stop');
assert.ok(cleanStop);
assert.equal(cleanStop.pathConclusion, 'clean_stop_before_targets');
assert.equal(cleanStop.firstStopHitTime, '2026-06-17T10:15:00');
assert.equal(cleanStop.firstT1HitTime, '2026-06-17T10:20:00');
assert.equal(cleanStop.maximumFavorableBeforeStopR, 0.5);
assert.equal(cleanStop.maximumFavorableAfterStopR, 2.5);

const ambiguous = buildOpeningDrivePathOrderDrilldownReport({
  htfStoryReportPath: 'htf-story.json',
  htfStoryReport: {
    slateStories: [baseSlate],
  },
  htfSourcePath: 'htf-source.json',
  htfSource: {
    bars: {
      '5m': [
        bar('2026-06-17T10:05:00', 102, 102, 99, 100),
        bar('2026-06-17T10:10:00', 100, 105, 93, 104),
      ],
    },
  },
  tradeDate: '2026-06-17',
}, '2026-07-20T00:01:00.000Z');

assert.equal(ambiguous.summary.sameBarAmbiguous, 1);
assert.equal(ambiguous.summary.recommendation, 'hold_for_lower_timeframe_path_data');
assert.equal(ambiguous.rows[0].pathConclusion, 'same_bar_ambiguous');

console.log('OpeningDrive path-order drilldown verified.');
