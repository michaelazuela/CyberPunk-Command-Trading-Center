import assert from 'node:assert/strict';
import {
  classifyActiveSetupScanWindowByEtMinutes,
  isMarketMappingWindowByEtMinutes,
  isIntradayMssMicroContinuationLateDayReviewByEtMinutes,
  MARKET_MAPPING_WINDOW,
  MODEL_SPECIFIC_TIME_WINDOWS,
  TIME_WINDOWS,
} from './timeWindows';

function minutes(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

assert.equal(TIME_WINDOWS.morning.openHour, 9);
assert.equal(TIME_WINDOWS.morning.openMinute, 15);
assert.equal(TIME_WINDOWS.morning.closeHour, 12);
assert.equal(TIME_WINDOWS.morning.closeMinute, 0);
assert.equal(TIME_WINDOWS.lunch.openHour, 12);
assert.equal(TIME_WINDOWS.lunch.openMinute, 0);
assert.equal(TIME_WINDOWS.lunch.closeHour, 16);
assert.equal(TIME_WINDOWS.lunch.closeMinute, 0);
assert.equal(MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.startHour, 15);
assert.equal(MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.endHour, 16);
assert.equal(MODEL_SPECIFIC_TIME_WINDOWS.intradayMssMicroContinuationLateDayReview.endMinute, 40);
assert.equal(MARKET_MAPPING_WINDOW.startHour, 9);
assert.equal(MARKET_MAPPING_WINDOW.startMinute, 15);
assert.equal(MARKET_MAPPING_WINDOW.endHour, 16);
assert.equal(MARKET_MAPPING_WINDOW.endMinute, 0);

assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('09:14')), 'OUTSIDE_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('09:15')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('09:59')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('10:00')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('11:14')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('11:30')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('11:59')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('12:00')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('13:00')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('14:30')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('15:29')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('15:30')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('15:59')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('16:00')), 'OUTSIDE_SETUP_SCAN');
assert.equal(isIntradayMssMicroContinuationLateDayReviewByEtMinutes(minutes('14:59')), false);
assert.equal(isIntradayMssMicroContinuationLateDayReviewByEtMinutes(minutes('15:00')), true);
assert.equal(isIntradayMssMicroContinuationLateDayReviewByEtMinutes(minutes('15:30')), true);
assert.equal(isIntradayMssMicroContinuationLateDayReviewByEtMinutes(minutes('16:40')), true);
assert.equal(isIntradayMssMicroContinuationLateDayReviewByEtMinutes(minutes('16:41')), false);
assert.equal(isMarketMappingWindowByEtMinutes(minutes('09:14')), false);
assert.equal(isMarketMappingWindowByEtMinutes(minutes('09:15')), true);
assert.equal(isMarketMappingWindowByEtMinutes(minutes('09:29')), true);
assert.equal(isMarketMappingWindowByEtMinutes(minutes('15:59')), true);
assert.equal(isMarketMappingWindowByEtMinutes(minutes('16:00')), false);

console.log('Active setup scan windows verified.');
