import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  applyNewsMacroCaution,
  fetchMacroCalendarEvents,
  getNewsMacroCaution,
  loadMacroCalendarConfig,
  loadWeeklyVisualMacroCalendarConfig,
  type MacroCalendarConfig,
} from './macro-calendar';

const cacheFile = path.join(os.tmpdir(), `macro-calendar-test-${Date.now()}.json`);
const weeklyCacheFile = path.join(os.tmpdir(), `macro-calendar-weekly-test-${Date.now()}.json`);
const events = [
  {
    title: 'Core PCE Price Index m/m',
    country: 'USD',
    date: '2026-05-28T08:30:00-04:00',
    impact: 'High',
    forecast: '0.3%',
    previous: '0.3%',
  },
  {
    title: 'CB Consumer Confidence',
    country: 'USD',
    date: '2026-05-28T09:00:00-04:00',
    impact: 'Medium',
  },
  {
    title: 'Foreign CPI',
    country: 'EUR',
    date: '2026-05-28T09:15:00-04:00',
    impact: 'High',
  },
];

const config: MacroCalendarConfig = {
  sourceUrl: `data:application/json,${encodeURIComponent(JSON.stringify(events))}`,
  countries: ['USD'],
  impacts: ['High', 'Medium'],
  cautionBeforeMinutes: 15,
  cautionAfterMinutes: 15,
  cacheTtlMinutes: 360,
  cacheFile,
};

try {
  const fetched = await fetchMacroCalendarEvents(config, new Date('2026-05-24T12:00:00Z'));
  assert.equal(fetched.length, 2);
  assert.equal(fetched[0].title, 'Core PCE Price Index m/m');
  assert.equal(fetched[0].country, 'USD');
  assert.equal(fetched[0].impact, 'High');
  assert.equal(fetched[1].title, 'CB Consumer Confidence');
  assert.equal(fetched[1].impact, 'Medium');

  const weeklyConfig: MacroCalendarConfig = {
    ...config,
    impacts: ['High', 'Medium'],
    cacheFile: weeklyCacheFile,
  };
  const weeklyFetched = await fetchMacroCalendarEvents(weeklyConfig, new Date('2026-05-24T12:00:00Z'));
  assert.deepEqual(weeklyFetched.map((event) => event.title), [
    'Core PCE Price Index m/m',
    'CB Consumer Confidence',
  ]);

  const defaultConfig = loadMacroCalendarConfig();
  assert.deepEqual(defaultConfig.countries, ['USD']);
  assert.deepEqual(defaultConfig.impacts, ['High', 'Medium']);
  const weeklyVisualConfig = loadWeeklyVisualMacroCalendarConfig();
  assert.deepEqual(weeklyVisualConfig.countries, ['USD']);
  assert.deepEqual(weeklyVisualConfig.impacts, ['High', 'Medium']);

  const before = await getNewsMacroCaution(new Date('2026-05-28T08:20:00-04:00'), config);
  assert.equal(before.active, true);
  assert.equal(before.minutesUntil, 10);
  assert.equal(before.confirmedAfterRelease, false);
  assert.ok(before.eventLabel?.includes('USD High Impact'));

  const outside = await getNewsMacroCaution(new Date('2026-05-28T08:00:00-04:00'), config);
  assert.equal(outside.active, false);

  const mediumBefore = await getNewsMacroCaution(new Date('2026-05-28T08:50:00-04:00'), config);
  assert.equal(mediumBefore.active, true);
  assert.equal(mediumBefore.minutesUntil, 10);
  assert.ok(mediumBefore.eventLabel?.includes('USD Medium Impact'));

  const chart = await applyNewsMacroCaution({
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: true,
    },
  }, new Date('2026-05-28T08:40:00-04:00'), config);
  assert.equal(chart?.newsMacroCaution?.active, true);
  assert.equal(chart?.newsMacroCaution?.minutesAfter, 10);
  assert.equal(chart?.newsMacroCaution?.confirmedAfterRelease, true);

  console.log('macro calendar tests passed');
} finally {
  await fs.rm(cacheFile, { force: true });
  await fs.rm(weeklyCacheFile, { force: true });
}
