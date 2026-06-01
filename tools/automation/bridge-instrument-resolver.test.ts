import assert from 'node:assert/strict';
import { resolveCurrentBridgeInstrument } from './bridge-instrument-resolver';

const bridgeUrl = 'http://127.0.0.1:8765';

const rootMes = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES',
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
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MNQ 09-26' }),
});
assert.equal(missingRequest.instrument, 'MNQ 09-26');
assert.equal(missingRequest.source, 'bridge-health');

const fullContract = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES 12-26',
}, {
  getHealth: async () => {
    throw new Error('should not call health for full contract');
  },
});
assert.equal(fullContract.instrument, 'MES 12-26');
assert.equal(fullContract.source, 'configured-full-contract');
assert.equal(fullContract.warning, null);

const mismatchedHealth = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: 'MES',
}, {
  getHealth: async () => ({ ok: true, defaultInstrument: 'MNQ 06-26' }),
});
assert.equal(mismatchedHealth.instrument, 'MES');
assert.equal(mismatchedHealth.source, 'configured-root-fallback');
assert.ok(mismatchedHealth.warning?.includes('does not match requested MES'));

const healthFailure = await resolveCurrentBridgeInstrument({
  bridgeUrl,
  appInstrument: 'MES',
  requestedBridgeInstrument: '',
}, {
  getHealth: async () => {
    throw new Error('bridge offline');
  },
});
assert.equal(healthFailure.instrument, 'MES 06-26');
assert.equal(healthFailure.source, 'fallback');
assert.ok(healthFailure.warning?.includes('bridge offline'));

console.log('Bridge instrument resolver verified.');
