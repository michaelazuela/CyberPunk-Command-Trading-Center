import assert from 'node:assert/strict';
import {
  resolveActiveMssReplayDateRange,
  validateActiveMssReplayArgs,
} from './thirty-day-active-mss-plan-replay';

assert.deepEqual(
  resolveActiveMssReplayDateRange(['--evaluate-from', '2026-06-08', '--evaluate-to', '2026-06-12']),
  { evaluateFrom: '2026-06-08', evaluateTo: '2026-06-12' },
);

assert.deepEqual(
  resolveActiveMssReplayDateRange(['--from', '2026-06-08', '--to', '2026-06-12']),
  { evaluateFrom: '2026-06-08', evaluateTo: '2026-06-12' },
);

assert.deepEqual(
  resolveActiveMssReplayDateRange(['--from=2026-06-08', '--to=2026-06-12']),
  { evaluateFrom: '2026-06-08', evaluateTo: '2026-06-12' },
);

assert.doesNotThrow(() => validateActiveMssReplayArgs(['--allow-heavy-replay=true']));

assert.throws(
  () => validateActiveMssReplayArgs(['--start', '2026-06-08']),
  /Unknown active-MSS replay option\(s\): --start/,
);

console.log('Active MSS replay CLI argument guard verified.');
