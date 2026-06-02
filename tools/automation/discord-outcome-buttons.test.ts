import assert from 'node:assert/strict';
import { buildOutcomeComponents, discordWebhookUrlForPayload } from './discord-outcome-buttons';

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
  assert.deepEqual(labels(longComponents), ['Long T1 Hit', 'Long T2 Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);
  assert.ok(!labels(longComponents).includes('Short T1 Hit'));
  assert.ok(!labels(longComponents).includes('Short T2 Hit'));
  assert.ok(urls(longComponents).every((url) => url.startsWith('https://quant-desk.example/api/discord-outcome?t=')));
  assert.ok(urls(longComponents).every((url) => !/5320|5316|entry|stop|target|riskPoints|canExecute/i.test(url)));
  const longPayloads = urls(longComponents).map(decodeOutcomePayload);
  assert.equal(longPayloads[0].dir, 'LONG');
  assert.equal(longPayloads[0].tt, true);
  assert.equal(longPayloads[0].pp, true);
  assert.equal(longPayloads[0].hit, 'T1');
  assert.equal(longPayloads[1].hit, 'T2');
  assert.equal(longPayloads[2].hit, 'STOP');
  assert.equal('pm' in longPayloads[0], false);
  assert.equal(longPayloads[5].tr, 'missed_trade');
  assert.equal(longPayloads[5].tt, false);
  assert.equal(longPayloads[5].pp, false);
  assert.equal(longPayloads[4].tr, 'no_trade');
  assert.equal(longPayloads[4].dir, 'NONE');
  assert.equal(longPayloads[4].pp, false);
  assert.equal('pm' in longPayloads[4], false);
  assert.ok(urls(longComponents).every((url) => url.length <= 512), 'Discord link button URLs must stay within Discord limits.');

  const shortComponents = buildOutcomeComponents({ ...baseArgs, direction: 'SHORT' });
  assert.deepEqual(labels(shortComponents), ['Short T1 Hit', 'Short T2 Hit', 'Short Stopped', 'Scratch', 'No Trade', 'Missed']);
  assert.ok(!labels(shortComponents).includes('Long T1 Hit'));
  assert.ok(!labels(shortComponents).includes('Long T2 Hit'));
  assert.ok(urls(shortComponents).every((url) => url.startsWith('https://quant-desk.example/api/discord-outcome?t=')));

  assert.equal(buildOutcomeComponents({ ...baseArgs, direction: null }), undefined);
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook', longComponents), 'https://discord.example/webhook?with_components=true&wait=true');
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
