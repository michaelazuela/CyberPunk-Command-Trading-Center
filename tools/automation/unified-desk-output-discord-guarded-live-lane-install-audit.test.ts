import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordGuardedLiveLaneContract } from '../../src/lib/unifiedDeskOutputDiscordGuardedLiveLane';

const report = buildUnifiedDeskOutputDiscordGuardedLiveLaneContract({
  reportType: 'unified_desk_output_discord_post_receipt_audit',
  status: 'pass',
  summary: {
    receiptAccepted: true,
    webhookCallRows: 1,
    publishDiscordRows: 1,
    realPostAllowedRows: 1,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    payloadPreviewCompared: true,
  },
  blockers: [],
});

assert.equal(report.status, 'pass');
assert.equal(report.lane.enabledByDefault, false);
assert.equal(report.lane.maxPostsPerSession, 1);
assert.equal(report.authority.postsDiscordNow, false);
assert.equal(report.authority.webhookCallRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_disabled_guarded_live_lane_wiring');
