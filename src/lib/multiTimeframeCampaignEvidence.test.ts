import assert from 'node:assert/strict';
import { buildMultiTimeframeCampaignEvidence, findFirstFiveMinuteCampaignStructureTrigger } from './multiTimeframeCampaignEvidence';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 100 };
}

function bearishCampaignBars(timeframe: string): NinjaBridgeBar[] {
  return [
    bar(`2026-06-04T${timeframe}:00`, 101, 103, 100, 102),
    bar(`2026-06-04T${timeframe}:15`, 102, 104, 101, 103),
    bar(`2026-06-04T${timeframe}:30`, 103, 105, 102, 104),
    bar(`2026-06-04T${timeframe}:45`, 104, 104.5, 101, 101.25),
    bar(`2026-06-05T09:45:00`, 101.25, 101.5, 94, 95),
    bar(`2026-06-05T10:00:00`, 95.25, 96, 92, 93),
  ];
}

{
  const campaign = buildMultiTimeframeCampaignEvidence({
    barsByTimeframe: {
      '15M': bearishCampaignBars('08'),
      '60M': bearishCampaignBars('07'),
      '120M': bearishCampaignBars('06'),
      '240M': bearishCampaignBars('04'),
    },
    asOfTimestamp: '2026-06-05T10:00:00',
    coverage: [
      { timeframe: '15M', barsLoaded: 100, rangeStart: '2026-05-06T00:00:00', rangeEnd: '2026-06-05T10:00:00', sufficient: true, minimumExpected: '30 calendar days' },
      { timeframe: '60M', barsLoaded: 100, rangeStart: '2026-05-06T00:00:00', rangeEnd: '2026-06-05T10:00:00', sufficient: true, minimumExpected: '30 calendar days' },
      { timeframe: '120M', barsLoaded: 100, rangeStart: '2026-05-06T00:00:00', rangeEnd: '2026-06-05T10:00:00', sufficient: true, minimumExpected: '30 calendar days' },
      { timeframe: '240M', barsLoaded: 100, rangeStart: '2026-05-06T00:00:00', rangeEnd: '2026-06-05T10:00:00', sufficient: true, minimumExpected: '30 calendar days' },
    ],
  });
  assert.equal(campaign.reliability, 'sufficient');
  assert.equal(campaign.campaignDirection, 'SHORT');
  assert.equal(campaign.fifteenMinuteAlignment, 'aligned');
  assert.ok(campaign.timeframes.some((item) => item.timeframe === '15M' && item.shortSupport > 0));
}

{
  const trigger = findFirstFiveMinuteCampaignStructureTrigger({
    direction: 'SHORT',
    fromTimestamp: '2026-06-05T10:00:00',
    bars5m: [
      bar('2026-06-05T09:40:00', 100, 102, 99, 101),
      bar('2026-06-05T09:45:00', 101, 103, 100, 102),
      bar('2026-06-05T09:50:00', 102, 102.25, 98, 99),
      bar('2026-06-05T09:55:00', 99, 101, 97.5, 100),
      bar('2026-06-05T10:00:00', 100, 100.5, 98.5, 99.5),
      bar('2026-06-05T10:05:00', 99.5, 100, 96, 96.75),
      bar('2026-06-05T10:10:00', 96.75, 97, 95, 95.5),
    ],
  });
  assert.equal(trigger.status, 'found');
  assert.equal(trigger.direction, 'SHORT');
  assert.equal(trigger.timestamp, '2026-06-05T10:05:00');
  assert.equal(trigger.canExecute, false);
}

{
  const trigger = findFirstFiveMinuteCampaignStructureTrigger({
    direction: 'LONG',
    fromTimestamp: '2026-06-05T10:00:00',
    bars5m: [
      bar('2026-06-05T09:40:00', 100, 101, 98, 99),
      bar('2026-06-05T09:45:00', 99, 100, 97, 98),
      bar('2026-06-05T09:50:00', 98, 102, 97.75, 101),
      bar('2026-06-05T09:55:00', 101, 101.5, 99, 100),
      bar('2026-06-05T10:00:00', 100, 101, 99.5, 100.5),
      bar('2026-06-05T10:05:00', 100.5, 103, 100.25, 102.5),
    ],
  });
  assert.equal(trigger.status, 'found');
  assert.equal(trigger.direction, 'LONG');
  assert.equal(trigger.timestamp, '2026-06-05T10:05:00');
  assert.equal(trigger.canExecute, false);
}

console.log('Multi-timeframe campaign evidence audit verified.');
