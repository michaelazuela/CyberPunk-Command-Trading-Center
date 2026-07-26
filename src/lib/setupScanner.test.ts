import assert from 'node:assert/strict';
import { SetupType } from '../types';
import {
  buildCompletedFiveMinuteProofSelectionSignals,
  computeZoneOverlap,
  getScannedSetupTypes,
  scanSetupCandidates,
} from './setupScanner';

assert.deepEqual(computeZoneOverlap(10, 20, 15, 25), {
  valid: true,
  low: 15,
  high: 20,
});

assert.deepEqual(computeZoneOverlap(10, 12, 15, 25), {
  valid: false,
  low: null,
  high: null,
});

const scan = scanSetupCandidates({
  sessionType: 'morning',
  contextText: 'Any saved text must not create a model while blank-slate mode is active.',
});

assert.deepEqual(scan.candidates, []);
assert.equal(scan.bestExecutableCandidate, null);
assert.equal(scan.bestConditionalCandidate, null);
assert.deepEqual(getScannedSetupTypes(), []);
assert.deepEqual(buildCompletedFiveMinuteProofSelectionSignals([
  {
    candidateKey: 'old-row',
    setupType: SetupType.NoSetup,
    direction: 'LONG',
    sessionType: 'morning',
    completedBarTime: '2026-07-25T09:30:00.000Z',
  },
]), {});

console.log('setupScanner blank-slate contract verified');
