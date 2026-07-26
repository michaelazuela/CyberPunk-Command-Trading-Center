import assert from 'node:assert/strict';
import fs from 'node:fs';

type Direction = 'LONG' | 'SHORT';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FvgZone {
  timeframe: '60m' | '15m' | '5m';
  direction: Direction;
  formedAt: string;
  left: string;
  middle: string;
  lower: number;
  upper: number;
  midpoint: number;
}

const bars60m: Bar[] = [
  { time: '2026-06-23T00:00:00.0000000', open: 7533.5, high: 7535.25, low: 7496.5, close: 7509.25, volume: 58553 },
  { time: '2026-06-23T01:00:00.0000000', open: 7509.25, high: 7512, low: 7481.75, close: 7483.25, volume: 43224 },
  { time: '2026-06-23T02:00:00.0000000', open: 7483.5, high: 7488.25, low: 7465.5, close: 7468.5, volume: 28910 },
  { time: '2026-06-23T03:00:00.0000000', open: 7468.75, high: 7472.25, low: 7444.5, close: 7447, volume: 32290 },
  { time: '2026-06-23T04:00:00.0000000', open: 7447, high: 7455.5, low: 7428.5, close: 7434, volume: 32693 },
  { time: '2026-06-24T11:00:00.0000000', open: 7454.75, high: 7494.25, low: 7436.5, close: 7493.5, volume: 252476 },
  { time: '2026-06-24T12:00:00.0000000', open: 7493.5, high: 7496.5, low: 7474.5, close: 7480.25, volume: 175581 },
  { time: '2026-06-24T13:00:00.0000000', open: 7480.25, high: 7485.5, low: 7450.5, close: 7452.75, volume: 137339 },
  { time: '2026-06-24T14:00:00.0000000', open: 7453.25, high: 7461, low: 7407.75, close: 7418.25, volume: 125954 },
];

const bars15m: Bar[] = [
  { time: '2026-06-23T01:15:00.0000000', open: 7483.5, high: 7488.25, low: 7482.75, close: 7483.25, volume: 4948 },
  { time: '2026-06-23T01:30:00.0000000', open: 7483.25, high: 7484.5, low: 7474.25, close: 7477, volume: 7014 },
  { time: '2026-06-23T01:45:00.0000000', open: 7477, high: 7477.5, low: 7467.25, close: 7473.25, volume: 10216 },
  { time: '2026-06-24T12:00:00.0000000', open: 7481.5, high: 7489.75, low: 7474.5, close: 7480.25, volume: 41594 },
  { time: '2026-06-24T12:15:00.0000000', open: 7480.25, high: 7485.5, low: 7474.5, close: 7481.25, volume: 31352 },
  { time: '2026-06-24T12:30:00.0000000', open: 7481.5, high: 7485, low: 7476.5, close: 7477.5, volume: 23129 },
  { time: '2026-06-24T12:45:00.0000000', open: 7477.5, high: 7477.75, low: 7455, close: 7459.75, volume: 48926 },
  { time: '2026-06-24T13:00:00.0000000', open: 7459.5, high: 7464.5, low: 7450.5, close: 7452.75, volume: 33932 },
  { time: '2026-06-24T13:15:00.0000000', open: 7453.25, high: 7461, low: 7442, close: 7444, volume: 37405 },
  { time: '2026-06-24T13:30:00.0000000', open: 7444, high: 7447.75, low: 7415.75, close: 7416.75, volume: 52957 },
];

const bars5m: Bar[] = [
  { time: '2026-06-24T12:30:00.0000000', open: 7483.25, high: 7483.25, low: 7476.5, close: 7477.5, volume: 7764 },
  { time: '2026-06-24T12:35:00.0000000', open: 7477.5, high: 7477.75, low: 7471.5, close: 7473.25, volume: 11576 },
  { time: '2026-06-24T12:40:00.0000000', open: 7473, high: 7476, low: 7461.25, close: 7461.5, volume: 17105 },
  { time: '2026-06-24T12:45:00.0000000', open: 7461.5, high: 7462.25, low: 7455, close: 7459.75, volume: 20245 },
  { time: '2026-06-24T12:50:00.0000000', open: 7459.5, high: 7461.75, low: 7455.5, close: 7459.25, volume: 11085 },
  { time: '2026-06-24T12:55:00.0000000', open: 7459.5, high: 7464.5, low: 7454, close: 7454, volume: 11931 },
  { time: '2026-06-24T13:00:00.0000000', open: 7454.25, high: 7456.25, low: 7450.5, close: 7452.75, volume: 10916 },
  { time: '2026-06-24T13:05:00.0000000', open: 7453.25, high: 7461, low: 7451, close: 7460.25, volume: 9030 },
  { time: '2026-06-24T13:10:00.0000000', open: 7460.25, high: 7460.75, low: 7442.5, close: 7445.75, volume: 15494 },
  { time: '2026-06-24T13:15:00.0000000', open: 7445.75, high: 7450, low: 7442, close: 7444, volume: 12881 },
  { time: '2026-06-24T13:20:00.0000000', open: 7444, high: 7447.75, low: 7431, close: 7433.75, volume: 20967 },
  { time: '2026-06-24T13:25:00.0000000', open: 7433.75, high: 7434, low: 7425.75, close: 7426.75, volume: 18829 },
  { time: '2026-06-24T13:30:00.0000000', open: 7426.75, high: 7428, low: 7420.5, close: 7420.75, volume: 13854 },
];

function detectFvgZones(bars: Bar[], timeframe: FvgZone['timeframe']): FvgZone[] {
  const zones: FvgZone[] = [];
  for (let index = 2; index < bars.length; index += 1) {
    const left = bars[index - 2];
    const middle = bars[index - 1];
    const right = bars[index];
    if (left.high < right.low) {
      zones.push({
        timeframe,
        direction: 'LONG',
        formedAt: right.time,
        left: left.time,
        middle: middle.time,
        lower: left.high,
        upper: right.low,
        midpoint: (left.high + right.low) / 2,
      });
    }
    if (left.low > right.high) {
      zones.push({
        timeframe,
        direction: 'SHORT',
        formedAt: right.time,
        left: left.time,
        middle: middle.time,
        lower: right.high,
        upper: left.low,
        midpoint: (right.high + left.low) / 2,
      });
    }
  }
  return zones;
}

function zoneByBounds(zones: FvgZone[], direction: Direction, lower: number, upper: number): FvgZone {
  const zone = zones.find((item) =>
    item.direction === direction &&
    item.lower === lower &&
    item.upper === upper
  );
  assert.ok(zone, `expected ${direction} FVG ${lower}-${upper}`);
  return zone;
}

function touchedZone(bar: Bar, zone: Pick<FvgZone, 'lower' | 'upper'>): boolean {
  return bar.high >= zone.lower && bar.low <= zone.upper;
}

function eventAt(events: Record<string, any>, time: string): any {
  const event = events[time];
  assert.ok(event, `expected scanner event at ${time}`);
  return event;
}

function bestShort(event: any): any {
  return event.deskState?.bestShortPlan || event.candidateLifecycleTrace?.bestShortPlan;
}

const zones60m = detectFvgZones(bars60m, '60m');
const zones15m = detectFvgZones(bars15m, '15m');
const zones5m = detectFvgZones(bars5m, '5m');

const parent60Upper = zoneByBounds(zones60m, 'SHORT', 7488.25, 7496.5);
const parent60Mid = zoneByBounds(zones60m, 'SHORT', 7472.25, 7481.75);
const parent60Lower = zoneByBounds(zones60m, 'SHORT', 7455.5, 7465.5);
assert.equal(parent60Upper.formedAt, '2026-06-23T02:00:00.0000000');
assert.equal(parent60Mid.formedAt, '2026-06-23T03:00:00.0000000');
assert.equal(parent60Lower.formedAt, '2026-06-23T04:00:00.0000000');

const june24Retest60 = bars60m.find((bar) => bar.time === '2026-06-24T12:00:00.0000000')!;
assert.equal(touchedZone(june24Retest60, parent60Upper), true);
assert.equal(june24Retest60.high, 7496.5);
assert.equal(june24Retest60.close, 7480.25);

const june24Rejection60 = bars60m.find((bar) => bar.time === '2026-06-24T13:00:00.0000000')!;
assert.equal(touchedZone(june24Rejection60, parent60Mid), true);
assert.ok(june24Rejection60.close < parent60Mid.lower, '60M close must reject away from parent bearish FVG stack');

const fifteenMinuteParent = zoneByBounds(zones15m, 'SHORT', 7477.5, 7482.75);
const fifteenMinuteRejection = bars15m.find((bar) => bar.time === '2026-06-24T12:45:00.0000000')!;
assert.equal(touchedZone(fifteenMinuteRejection, fifteenMinuteParent), true);
assert.ok(fifteenMinuteRejection.close < fifteenMinuteParent.lower, '15M must close below same reaction shelf');

const child5m = zoneByBounds(zones5m, 'SHORT', 7476, 7476.5);
assert.equal(child5m.formedAt, '2026-06-24T12:40:00.0000000');
assert.equal(child5m.midpoint, 7476.25);

const closeBelow7463 = bars5m.find((bar) => bar.time === '2026-06-24T12:40:00.0000000')!;
assert.ok(closeBelow7463.close < 7463, '5M close below 7463 should be recognized as short activation proof');
const bearishMssConfirmation = bars5m.find((bar) => bar.time === '2026-06-24T13:10:00.0000000')!;
assert.equal(bearishMssConfirmation.close, 7445.75);
assert.ok(bearishMssConfirmation.close < 7453.25, '5M bearish continuation had already moved away by full alignment confirmation');

const tapePath = 'tools/automation/discord-audit/scanner-decision-tape-2026-06-24-MES-lunch.json';
const tape = JSON.parse(fs.readFileSync(tapePath, 'utf8'));
const events = tape.events || {};

const forming = eventAt(events, '2026-06-24T12:30:00.0000000');
const formingShort = bestShort(forming);
assert.equal(formingShort.setupType, 'NoInstalledSetup');
assert.equal(formingShort.direction, 'SHORT');
assert.equal(formingShort.entry, 7476.25);
assert.equal(formingShort.stop, 7485.75);
assert.equal(formingShort.target1, 7462);
assert.equal(formingShort.target2, 7457.25);
assert.equal(formingShort.lineInSand, 7463);
assert.match(formingShort.nextTrigger, /Completed 5M or 15M close below 7463\.00/);
assert.equal(formingShort.hasFullPlanLevels, true);

const fullAlignmentLate = eventAt(events, '2026-06-24T13:10:00.0000000');
assert.equal(fullAlignmentLate.deskState?.primaryDeskPlay?.direction, 'SHORT');
assert.match(fullAlignmentLate.deskState?.primaryDeskPlay?.trendConfirmation?.summary || '', /SHORT/);
assert.match(fullAlignmentLate.deskState?.suppressionReason || fullAlignmentLate.visibility?.suppressionReason || '', /LONG:15M5M-MSS/);

const laterNoChase = eventAt(events, '2026-06-24T13:15:00.0000000');
assert.equal(laterNoChase.deskState?.primaryDeskPlay?.direction, 'SHORT');
assert.match(bestShort(laterNoChase).missingEvidence.join(' '), /No chase: wait for a completed 5M or 15M close below 7425\.75/);

const pollutedSelection = eventAt(events, '2026-06-24T13:20:00.0000000');
assert.equal(pollutedSelection.deskState?.primaryDeskPlay?.trendConfirmation?.direction, 'SHORT');
assert.equal(pollutedSelection.deskState?.selectedCandidate?.direction, 'LONG');
assert.equal(pollutedSelection.deskState?.selectedCandidate?.setupType, 'NoInstalledSetup');
assert.equal(pollutedSelection.deskState?.primaryDeskPlay?.modelRouting?.shortModelFit?.status, 'best_fit');
assert.equal(pollutedSelection.deskState?.primaryDeskPlay?.modelRouting?.shortModelFit?.setupType, 'historicalReview');
assert.equal(pollutedSelection.deskState?.primaryDeskPlay?.approvalBoundary?.changesCanExecute, false);
assert.equal(pollutedSelection.deskState?.primaryDeskPlay?.approvalBoundary?.changesTradeApprovals, false);
assert.equal(pollutedSelection.deskState?.primaryDeskPlay?.approvalBoundary?.changesEntryStopTargets, false);

console.log('Phase 1 HTF FVG reaction proof passed: June 24 missed short had 60M parent bearish FVG reaction, 15M rejection, 5M short FVG, and scanner promotion/lifecycle drift without trading-logic changes.');
