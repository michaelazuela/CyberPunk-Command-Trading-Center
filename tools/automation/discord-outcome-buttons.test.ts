import assert from 'node:assert/strict';
import { buildOutcomeComponents, discordWebhookUrlForPayload } from './discord-outcome-buttons';
import { DISCORD_PROOF_PROMPT } from '../../src/agents/proofLearningAgent';

const previousBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousSecret = process.env.DISCORD_OUTCOME_SECRET;

process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

function labels(components: ReturnType<typeof buildOutcomeComponents>): string[] {
  return (components || []).flatMap((row) => row.components.map((component) => component.label));
}

function urls(components: ReturnType<typeof buildOutcomeComponents>): string[] {
  return (components || []).flatMap((row) => row.components.map((component) => component.url));
}

function decodeOutcomePayload(url: string): Record<string, any> {
  const token = new URL(url).searchParams.get('t');
  assert.ok(token);
  const [payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

try {
  const baseArgs = {
    planVersionId: 'PLAN-TEST',
    sessionType: 'morning' as const,
    tradeDate: '2026-05-26',
    instrument: 'MES' as const,
  };

  const longComponents = buildOutcomeComponents({ ...baseArgs, direction: 'LONG' });
  assert.deepEqual(labels(longComponents), ['Long Win', 'Long Loss', 'Scratch', 'Missed', 'No Trade']);
  assert.ok(!labels(longComponents).includes('Short Win'));
  assert.ok(!labels(longComponents).includes('Short Loss'));
  assert.ok(urls(longComponents).every((url) => url.startsWith('https://quant-desk.example/api/discord-outcome?t=')));
  assert.ok(urls(longComponents).every((url) => !/5320|5316|entry|stop|target|riskPoints|canExecute/i.test(url)));
  const longPayloads = urls(longComponents).map(decodeOutcomePayload);
  assert.equal(longPayloads[0].dir, 'LONG');
  assert.equal(longPayloads[0].tt, true);
  assert.equal(longPayloads[0].pp, true);
  assert.equal(longPayloads[0].pm, DISCORD_PROOF_PROMPT);
  assert.equal(longPayloads[3].tr, 'missed_trade');
  assert.equal(longPayloads[3].tt, false);
  assert.equal(longPayloads[3].pp, false);
  assert.equal(longPayloads[4].tr, 'no_trade');
  assert.equal(longPayloads[4].dir, 'NONE');
  assert.equal(longPayloads[4].pm, null);

  const shortComponents = buildOutcomeComponents({ ...baseArgs, direction: 'SHORT' });
  assert.deepEqual(labels(shortComponents), ['Short Win', 'Short Loss', 'Scratch', 'Missed', 'No Trade']);
  assert.ok(!labels(shortComponents).includes('Long Win'));
  assert.ok(!labels(shortComponents).includes('Long Loss'));
  assert.ok(urls(shortComponents).every((url) => url.startsWith('https://quant-desk.example/api/discord-outcome?t=')));

  assert.equal(buildOutcomeComponents({ ...baseArgs, direction: null }), undefined);
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook', longComponents), 'https://discord.example/webhook?with_components=true');
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook?wait=true', longComponents), 'https://discord.example/webhook?wait=true&with_components=true');
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook', undefined), 'https://discord.example/webhook');

  delete process.env.DISCORD_OUTCOME_SECRET;
  assert.equal(buildOutcomeComponents({ ...baseArgs, direction: 'LONG' }), undefined);

  console.log('Discord outcome button helper verified.');
} finally {
  if (previousBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousBaseUrl;
  if (previousSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousSecret;
}
