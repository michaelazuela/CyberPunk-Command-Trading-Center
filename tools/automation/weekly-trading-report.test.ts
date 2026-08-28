import assert from 'node:assert/strict';
import { discordWebhookWaitUrl } from './weekly-trading-report';

assert.equal(
  discordWebhookWaitUrl('https://discord.example/webhook'),
  'https://discord.example/webhook?wait=true',
);

assert.equal(
  discordWebhookWaitUrl('https://discord.example/webhook?thread_id=123'),
  'https://discord.example/webhook?thread_id=123&wait=true',
);

console.log('Weekly trading report Discord receipt helpers verified.');
