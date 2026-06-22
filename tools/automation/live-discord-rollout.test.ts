import assert from 'node:assert/strict';

import {
  buildLiveDiscordRolloutChecklist,
  formatLiveDiscordRolloutChecklist,
  parseLiveDiscordRolloutArgs,
} from './live-discord-rollout';

const parsed = parseLiveDiscordRolloutArgs([
  '--date',
  '2026-06-22',
  '--instrument',
  'MES',
  '--session',
  'lunch',
  '--bridge-instrument',
  'MES 09-26',
  '--from',
  '12:00',
  '--to',
  '15:50',
  '--pretty',
]);

assert.equal(parsed.options.date, '2026-06-22');
assert.equal(parsed.options.instrument, 'MES');
assert.equal(parsed.options.session, 'lunch');
assert.equal(parsed.options.bridgeInstrument, 'MES 09-26');
assert.equal(parsed.pretty, true);

const checklist = buildLiveDiscordRolloutChecklist(parsed.options);
assert.equal(checklist.sourceOfTruth, 'phase_11c_live_discord_rollout_checklist');
assert.match(checklist.dryRunValidationCommand, /npm run nt:scanner/);
assert.match(checklist.dryRunValidationCommand, /--dry-run/);
assert.match(checklist.diagnosticReplayCommand, /npm run diagnostic:replay/);
assert.match(checklist.diagnosticReplayCommand, /--audit-dir tools\/automation\/discord-audit/);
assert.match(checklist.livePostCommand, /--live-discord-policy-confirmed/);
assert.ok(checklist.rollbackSteps.some((step) => step.includes('QUANT_DESK_LIVE_DISCORD_POLICY_CONFIRMED')));
assert.ok(checklist.rollbackSteps.some((step) => step.includes('--dry-run')));
assert.ok(checklist.receiptVerificationSteps.some((step) => step.includes('discord-receipt-*.json')));
assert.ok(checklist.requiredEvidenceBeforeLivePost.some((step) => step.includes('Diagnostic replay passed')));
assert.equal(checklist.authorityBoundary.postsDiscord, false);
assert.equal(checklist.authorityBoundary.changesTradingLogic, false);
assert.equal(checklist.authorityBoundary.changesScannerBehavior, false);
assert.equal(checklist.authorityBoundary.changesDiscordSendBehavior, false);
assert.equal(checklist.authorityBoundary.changesBridgeBehavior, false);
assert.equal(checklist.authorityBoundary.changesCanExecute, false);
assert.equal(checklist.authorityBoundary.createsTradeApproval, false);
assert.equal(checklist.authorityBoundary.requiresHumanOperatorBeforeLivePost, true);

assert.throws(
  () => parseLiveDiscordRolloutArgs(['--date', '2026-06-22', '--session', 'close']),
  /Missing required --bridge-instrument|Invalid --session/,
);

const formatted = formatLiveDiscordRolloutChecklist(checklist);
assert.match(formatted, /Phase 11C Live Discord Rollout Checklist/);
assert.match(formatted, /phase_11c_live_discord_rollout_checklist/);
assert.match(formatted, /"postsDiscord": false/);
assert.match(formatted, /"changesCanExecute": false/);

const eveningChecklist = buildLiveDiscordRolloutChecklist({
  date: '2026-06-22',
  instrument: 'MES',
  session: 'evening',
  bridgeInstrument: 'MES 09-26',
  from: '18:45',
  to: '19:05',
  auditDir: 'tools/automation/discord-audit',
});
assert.match(eveningChecklist.diagnosticReplayCommand, /--session evening/);
assert.match(eveningChecklist.dryRunValidationCommand, /--dry-run/);
assert.match(eveningChecklist.livePostCommand, /--live-discord-policy-confirmed/);

console.log('live-discord-rollout tests passed');
