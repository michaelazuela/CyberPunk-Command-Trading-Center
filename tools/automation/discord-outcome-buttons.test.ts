import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertDiscordOutcomeEndpointSecretReady,
  buildOutcomeComponents,
  checkDiscordOutcomeEndpointSecret,
  discordOutcomeSecretKeyId,
  discordWebhookUrlForPayload,
  loadCanonicalDiscordOutcomeSecretFromEnvLocal,
  normalizeDiscordOutcomeSecret,
} from './discord-outcome-buttons';

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

function runtimeOutcomeButtonFiles(): string[] {
  const automationDir = path.resolve('tools/automation');
  return fs.readdirSync(automationDir)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .map((file) => path.join(automationDir, file))
    .filter((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      return source.includes("from './discord-outcome-buttons'")
        && (
          source.includes('buildOutcomeComponents')
          || source.includes('assertDiscordOutcomeEndpointSecretReady')
          || source.includes('checkDiscordOutcomeEndpointSecret')
        );
    });
}

try {
  const baseArgs = {
    planVersionId: 'PLAN-TEST',
    sessionType: 'morning' as const,
    tradeDate: '2026-05-26',
    instrument: 'MES' as const,
  };

  const longComponents = buildOutcomeComponents({ ...baseArgs, direction: 'LONG' });
  assert.deepEqual(labels(longComponents), ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);
  assert.ok(!labels(longComponents).includes('Short T1 Hit'));
  assert.ok(!labels(longComponents).includes('Short T2 Hit'));
  assert.ok(urls(longComponents).every((url) => url.startsWith('https://quant-desk.example/api/discord-outcome?t=')));
  const longPayloads = urls(longComponents).map(decodeOutcomePayload);
  assert.ok(longPayloads.every((payload) => !('entry' in payload)));
  assert.ok(longPayloads.every((payload) => !('stop' in payload)));
  assert.ok(longPayloads.every((payload) => !('target' in payload)));
  assert.ok(longPayloads.every((payload) => !('riskPoints' in payload)));
  assert.ok(longPayloads.every((payload) => !('canExecute' in payload)));
  assert.equal(normalizeDiscordOutcomeSecret('  "test-secret"  '), 'test-secret');
  assert.equal(longPayloads[0].kid, discordOutcomeSecretKeyId('test-secret'));
  assert.equal(discordOutcomeSecretKeyId('  "test-secret"  '), discordOutcomeSecretKeyId('test-secret'));
  assert.equal(longPayloads[0].dir, 'LONG');
  assert.equal(longPayloads[0].tt, true);
  assert.equal(longPayloads[0].pp, true);
  assert.equal(longPayloads[0].hit, 'T1');
  assert.equal(longPayloads[1].hit, 'T2');
  assert.equal(longPayloads[2].hit, 'RUNNER');
  assert.equal(longPayloads[2].o, 'long_runner_hit');
  assert.equal(longPayloads[3].hit, 'STRETCH');
  assert.equal(longPayloads[3].o, 'long_stretch_hit');
  assert.equal(longPayloads[4].hit, 'STOP');
  assert.equal('pm' in longPayloads[0], false);
  assert.equal(longPayloads[7].tr, 'missed_trade');
  assert.equal(longPayloads[7].tt, false);
  assert.equal(longPayloads[7].pp, false);
  assert.equal(longPayloads[6].tr, 'no_trade');
  assert.equal(longPayloads[6].dir, 'NONE');
  assert.equal(longPayloads[6].pp, false);
  assert.equal('pm' in longPayloads[6], false);
  assert.ok(urls(longComponents).every((url) => url.length <= 512), 'Discord link button URLs must stay within Discord limits.');

  const shortComponents = buildOutcomeComponents({ ...baseArgs, direction: 'SHORT' });
  assert.deepEqual(labels(shortComponents), ['Short T1 Hit', 'Short T2 Hit', 'Short Runner Hit', 'Short Stretch Hit', 'Short Stopped', 'Scratch', 'No Trade', 'Missed']);
  assert.ok(!labels(shortComponents).includes('Long T1 Hit'));
  assert.ok(!labels(shortComponents).includes('Long T2 Hit'));
  const shortPayloads = urls(shortComponents).map(decodeOutcomePayload);
  assert.equal(shortPayloads[2].dir, 'SHORT');
  assert.equal(shortPayloads[2].hit, 'RUNNER');
  assert.equal(shortPayloads[3].hit, 'STRETCH');
  assert.ok(urls(shortComponents).every((url) => url.startsWith('https://quant-desk.example/api/discord-outcome?t=')));

  const neutralComponents = buildOutcomeComponents({ ...baseArgs, direction: null });
  assert.deepEqual(labels(neutralComponents), ['No Trade', 'Missed']);
  const neutralPayloads = urls(neutralComponents).map(decodeOutcomePayload);
  assert.equal(neutralPayloads[0].dir, 'NONE');
  assert.equal(neutralPayloads[0].tr, 'no_trade');
  assert.equal(neutralPayloads[1].dir, 'NONE');
  assert.equal(neutralPayloads[1].tr, 'missed_trade');
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook', longComponents), 'https://discord.example/webhook?with_components=true&wait=true');
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook?wait=true', longComponents), 'https://discord.example/webhook?wait=true&with_components=true');
  assert.equal(discordWebhookUrlForPayload('https://discord.example/webhook', undefined), 'https://discord.example/webhook');

  const matchingFetch = (async (url: string | URL | Request) => {
    assert.equal(String(url), 'https://quant-desk.example/api/discord-outcome?keycheck=1');
    return new Response(JSON.stringify({
      ok: true,
      configured: true,
      activeKeyId: discordOutcomeSecretKeyId('test-secret'),
      acceptedKeyIds: [discordOutcomeSecretKeyId('test-secret')],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const matchingCheck = await checkDiscordOutcomeEndpointSecret(matchingFetch);
  assert.equal(matchingCheck.ok, true);
  assert.equal(matchingCheck.localKeyId, discordOutcomeSecretKeyId('test-secret'));
  await assertDiscordOutcomeEndpointSecretReady(longComponents, matchingFetch);

  const mismatchedFetch = (async () => new Response(JSON.stringify({
    ok: true,
    configured: true,
    activeKeyId: discordOutcomeSecretKeyId('different-secret'),
    acceptedKeyIds: [discordOutcomeSecretKeyId('different-secret')],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
  await assert.rejects(
    () => assertDiscordOutcomeEndpointSecretReady(longComponents, mismatchedFetch),
    /blocked before posting.*does not match deployed active key id/i,
  );
  await assert.doesNotReject(() => assertDiscordOutcomeEndpointSecretReady(undefined, mismatchedFetch));

  for (const filePath of runtimeOutcomeButtonFiles()) {
    const source = fs.readFileSync(filePath, 'utf8');
    assert.match(
      source,
      /loadCanonicalDiscordOutcomeSecretFromEnvLocal\s*\(/,
      `${path.relative(process.cwd(), filePath)} signs or preflights Discord outcome buttons without canonical .env.local secret loading`,
    );
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-outcome-secret-'));
  fs.writeFileSync(path.join(tempDir, '.env.local'), 'DISCORD_OUTCOME_SECRET=\"canonical-test-secret\"\n');
  process.env.DISCORD_OUTCOME_SECRET = 'stale-shell-secret';
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message?: unknown, ...rest: unknown[]) => {
    warnings.push([message, ...rest].map(String).join(' '));
  };
  let canonical: ReturnType<typeof loadCanonicalDiscordOutcomeSecretFromEnvLocal>;
  try {
    canonical = loadCanonicalDiscordOutcomeSecretFromEnvLocal(tempDir);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(canonical.loaded, true);
  assert.equal(canonical.source, '.env.local');
  assert.equal(canonical.previousKeyId, discordOutcomeSecretKeyId('stale-shell-secret'));
  assert.equal(canonical.keyId, discordOutcomeSecretKeyId('canonical-test-secret'));
  assert.equal(discordOutcomeSecretKeyId(process.env.DISCORD_OUTCOME_SECRET), discordOutcomeSecretKeyId('canonical-test-secret'));
  assert.deepEqual(warnings, []);
  process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

  delete process.env.DISCORD_OUTCOME_SECRET;
  assert.equal(buildOutcomeComponents({ ...baseArgs, direction: 'LONG' }), undefined);

  console.log('Discord outcome button helper verified.');
} finally {
  if (previousBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousBaseUrl;
  if (previousSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousSecret;
}
