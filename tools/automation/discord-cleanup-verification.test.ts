import assert from 'node:assert/strict';
import { validateDiscordPayload, type DiscordWebhookPayload } from './discord-alert-format';
import { buildOutcomeComponents } from './discord-outcome-buttons';
import { classifyDiscordMessageText } from './discord-message-policy';

const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

function currentDeskPlanPayload(withComponents: boolean): DiscordWebhookPayload {
  const payload: DiscordWebhookPayload = {
    username: 'Quant Desk',
    content: 'MES Current Desk Plan',
    embeds: [{
      title: 'MES Current Desk Plan',
      description: [
        'Primary: LONG',
        'Bias: 15M + 5M bullish, 1H supportive',
        'Line in sand: 7630.00',
        '',
        'LONG ABOVE 7630.00',
        'Entry: 7632.75',
        'Stop: 7622.50',
        'T1: 7648.25',
        'T2: 7653.50',
        '',
        'Invalid below: 7622.50',
        'HTF target: 7658.00 / runner 7672.00',
        '',
        'Status: Review only until 5M trigger + canExecute.',
        'Chart: attached.',
      ].join('\n'),
      color: 0x00a86b,
      fields: [],
      footer: { text: 'Quant Desk • Scanner DeskState play • Not execution approval' },
      timestamp: '2026-06-15T00:00:00.000Z',
    }],
  };
  if (withComponents) {
    payload.components = buildOutcomeComponents({
      planVersionId: 'DISCORD-CLEANUP-VERIFY',
      sessionType: 'morning',
      tradeDate: '2026-06-15',
      instrument: 'MES',
      direction: 'LONG',
    });
  }
  return payload;
}

const currentPlan = currentDeskPlanPayload(true);
assert.equal(classifyDiscordMessageText('MES Current Desk Plan').category, 'current_desk_plan');
assert.doesNotThrow(() => validateDiscordPayload(currentPlan, ['desk-plan.png']));

const missingButtons = currentDeskPlanPayload(false);
assert.throws(
  () => validateDiscordPayload(missingButtons, ['desk-plan.png']),
  /requires RAG outcome buttons/
);

const operationalPayload: DiscordWebhookPayload = {
  username: 'Quant Desk',
  content: '[SUPERVISOR] Bridge Unreachable',
  embeds: [{
    title: '[SUPERVISOR] Bridge Unreachable',
    description: 'Bridge health is down. This is an operational notice.',
    color: 0xff0000,
    fields: [],
    footer: { text: 'Quant Desk • Operational notice' },
    timestamp: '2026-06-15T00:00:00.000Z',
  }],
};
assert.equal(classifyDiscordMessageText(operationalPayload.content || '').category, 'operational_health');
assert.doesNotThrow(() => validateDiscordPayload(operationalPayload, []));

const watchPayload: DiscordWebhookPayload = {
  username: 'Quant Desk',
  content: '[AM WATCH] MES - LONG WATCH FORMING',
  embeds: [{
    title: '[AM WATCH] MES - LONG WATCH FORMING',
    description: 'Status: WATCH - NOT EXECUTION APPROVAL\nTrigger: completed 5M proof required.',
    color: 0xffa000,
    fields: [],
    footer: { text: 'Quant Desk • Scanner watch • Not execution approval' },
    timestamp: '2026-06-15T00:00:00.000Z',
  }],
};
assert.equal(classifyDiscordMessageText(watchPayload.content || '').category, 'watchlist');
assert.doesNotThrow(() => validateDiscordPayload(watchPayload, []));

if (previousOutcomeBaseUrl === undefined) {
  delete process.env.DISCORD_OUTCOME_BASE_URL;
} else {
  process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
}
if (previousOutcomeSecret === undefined) {
  delete process.env.DISCORD_OUTCOME_SECRET;
} else {
  process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
}

console.log('Discord cleanup verification passed.');
