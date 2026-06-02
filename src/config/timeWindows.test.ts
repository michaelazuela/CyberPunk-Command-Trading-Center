import assert from 'node:assert/strict';
import {
  classifyActiveSetupScanWindowByEtMinutes,
  TIME_WINDOWS,
} from './timeWindows';

function minutes(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

assert.equal(TIME_WINDOWS.morning.openHour, 10);
assert.equal(TIME_WINDOWS.morning.openMinute, 0);
assert.equal(TIME_WINDOWS.morning.closeHour, 12);
assert.equal(TIME_WINDOWS.morning.closeMinute, 0);
assert.equal(TIME_WINDOWS.lunch.openHour, 12);
assert.equal(TIME_WINDOWS.lunch.openMinute, 0);
assert.equal(TIME_WINDOWS.lunch.closeHour, 15);
assert.equal(TIME_WINDOWS.lunch.closeMinute, 30);

assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('09:59')), 'OUTSIDE_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('10:00')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('11:14')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('11:30')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('11:59')), 'MORNING_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('12:00')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('13:00')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('14:30')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('15:29')), 'LUNCH_PM_SETUP_SCAN');
assert.equal(classifyActiveSetupScanWindowByEtMinutes(minutes('15:30')), 'OUTSIDE_SETUP_SCAN');

console.log('Active setup scan windows verified.');
