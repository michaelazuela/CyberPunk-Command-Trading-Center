import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveCurrentBridgeInstrument } from './bridge-instrument-resolver';

const bridgeUrl = 'http://127.0.0.1:8765';
const beforeJuneRollover = new Date('2026-06-10T12:00:00Z');
const afterJuneRollover = new Date('2026-06-14T12:00:00Z');

const rootMes = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES',
  asOf: beforeJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MES 06-26' }),
});
assert.equal(rootMes.instrument, 'MES 06-26');
assert.equal(rootMes.source, 'bridge-health');
assert.ok(rootMes.warning?.includes('Resolved root instrument MES'));

const missingRequest = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MNQ',
  requestedBridgeInstrument: null,
  asOf: beforeJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MNQ 09-26' }),
});
assert.equal(missingRequest.instrument, 'MNQ 09-26');
assert.equal(missingRequest.source, 'bridge-health');

const fullContract = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES 12-26',
  asOf: afterJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MES DEC26' }),
});
assert.equal(fullContract.instrument, 'MES 12-26');
assert.equal(fullContract.source, 'configured-full-contract');
assert.equal(fullContract.warning, null);

const activeSepChartName = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES 06-26',
  asOf: afterJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MES SEP26' }),
});
assert.equal(activeSepChartName.instrument, 'MES 09-26');
assert.equal(activeSepChartName.source, 'bridge-health');
assert.ok(activeSepChartName.warning?.includes('differs from configured MES 06-26'));

const staleJuneHealth = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES',
  asOf: afterJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MES 06-26' }),
});
assert.equal(staleJuneHealth.instrument, 'MES 09-26');
assert.equal(staleJuneHealth.source, 'front-month-rollover');
assert.equal(staleJuneHealth.warning, null);

const staleConfiguredContract = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES 06-26',
  asOf: afterJuneRollover,
}, {
  getHealth: async () => {
    throw new Error('bridge offline');
  },
});
assert.equal(staleConfiguredContract.instrument, 'MES 09-26');
assert.equal(staleConfiguredContract.source, 'front-month-rollover');
assert.ok(staleConfiguredContract.warning?.includes('stale after rollover'));
assert.ok(staleConfiguredContract.warning?.includes('bridge offline'));
assert.ok(staleConfiguredContract.warning?.includes(`active front-month contract ${staleConfiguredContract.instrument}`));

const mismatchedHealth = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES',
  asOf: beforeJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MNQ 06-26' }),
});
assert.equal(mismatchedHealth.instrument, 'MES 06-26');
assert.equal(mismatchedHealth.source, 'configured-root-fallback');
assert.ok(mismatchedHealth.warning?.includes('does not match requested MES'));

const mismatchedHealthWithStaleConfiguredContract = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES 06-26',
  asOf: afterJuneRollover,
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MNQ 09-26' }),
});
assert.equal(mismatchedHealthWithStaleConfiguredContract.instrument, 'MES 09-26');
assert.equal(mismatchedHealthWithStaleConfiguredContract.source, 'front-month-rollover');
assert.ok(mismatchedHealthWithStaleConfiguredContract.warning?.includes('does not match requested MES'));
assert.ok(mismatchedHealthWithStaleConfiguredContract.warning?.includes(`active front-month contract ${mismatchedHealthWithStaleConfiguredContract.instrument}`));

const staleConfiguredContractWithoutMatchingHealth = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES 06-26',
  asOf: afterJuneRollover,
}, {
  getHealth: async () => ({ ok: false, defaultInstrument: '' }),
});
assert.equal(staleConfiguredContractWithoutMatchingHealth.instrument, 'MES 09-26');
assert.equal(staleConfiguredContractWithoutMatchingHealth.source, 'front-month-rollover');
assert.ok(staleConfiguredContractWithoutMatchingHealth.warning?.includes(`active front-month contract ${staleConfiguredContractWithoutMatchingHealth.instrument}`));

const healthFailure = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: '',
  asOf: beforeJuneRollover,
}, {
  getHealth: async () => {
    throw new Error('bridge offline');
  },
});
assert.equal(healthFailure.instrument, 'MES 06-26');
assert.equal(healthFailure.source, 'fallback');
assert.ok(healthFailure.warning?.includes('bridge offline'));

const recorderSource = fs.readFileSync(new URL('./candle-recorder.ts', import.meta.url), 'utf8');
assert.ok(
  recorderSource.includes('const requestedBridgeInstrument = argValue') &&
    recorderSource.includes('currentBridgeInstrument: bridgeInstrument') &&
    recorderSource.includes('bridgeInstrument = resolution.bridgeInstrument'),
  'candle recorder must refresh active bridge contract inside the polling loop while preserving the requested root instrument',
);

console.log('Bridge instrument resolver verified.');
