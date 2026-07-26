import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputGuardedScannerLanePreview } from './unifiedDeskOutputGuardedScannerLane';

const preview = buildUnifiedDeskOutputGuardedScannerLanePreview({
  guardedLaneContract: {
    status: 'pass',
    lane: { enabledByDefault: false, maxPostsPerSession: 1 },
  },
  readinessReport: {
    candidates: [
      {
        cardId: 'saved-row',
        model: 'saved-model-name',
        session: 'morning',
        state: 'APPROVED_DESK_PLAN',
      },
    ],
  },
});

assert.equal(preview.status, 'blocked');
assert.equal(preview.summary.selectedRows, 0);
assert.equal(preview.summary.suppressedRows, 1);
assert.deepEqual(preview.selectedCandidates, []);
assert.equal(preview.authority.postsDiscord, false);
assert.equal(preview.authority.webhookCallRows, 0);
assert.equal(preview.authority.writesSupabase, false);
assert.equal(preview.authority.readsLiveBridge, false);
assert.equal(preview.summary.runtimeInstallAllowed, false);

console.log('unifiedDeskOutputGuardedScannerLane blank-slate contract verified');
