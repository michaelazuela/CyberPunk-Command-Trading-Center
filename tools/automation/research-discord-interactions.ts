import dotenv from 'dotenv';
import express from 'express';
import nacl from 'tweetnacl';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleResearchDiscordReviewInteraction,
  researchOnlySafetyFailureResponse,
  type ResearchDiscordInteractionResult,
} from '../../src/agents/researchDiscordReviewInteractionAgent';
import {
  handleModelCandidateDecisionInteraction,
  type ModelCandidateDecisionInteractionResult,
} from './model-candidate-decisions';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

export interface ResearchDiscordInteractionsCliOptions {
  simulate: boolean;
  customId: string | null;
  discordUserId: string | null;
  discordUsername: string | null;
  statePath: string;
  modelCandidateLedgerPath: string;
  modelCandidateDecisionDir: string;
  port: number;
  pretty: boolean;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATE_PATH = path.join(__dirname, 'research-review-packs', 'discord-review-state.json');
const DEFAULT_MODEL_CANDIDATE_LEDGER_PATH = path.join(__dirname, 'model-candidate-ledger', 'model-candidate-review-ledger.json');
const DEFAULT_MODEL_CANDIDATE_DECISION_DIR = path.join(__dirname, 'model-candidate-decisions');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive number.`);
  return parsed;
}

function allowedUserIds(): string[] {
  return (process.env.RESEARCH_REVIEW_DISCORD_ALLOWED_USER_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function parseResearchDiscordInteractionsArgs(args = process.argv.slice(2)): ResearchDiscordInteractionsCliOptions {
  return {
    simulate: hasFlag(args, '--simulate'),
    customId: readFlag(args, '--custom-id'),
    discordUserId: readFlag(args, '--discord-user-id'),
    discordUsername: readFlag(args, '--discord-username'),
    statePath: readFlag(args, '--state-path') || process.env.RESEARCH_REVIEW_STATE_PATH || DEFAULT_STATE_PATH,
    modelCandidateLedgerPath: readFlag(args, '--model-candidate-ledger-path') || process.env.MODEL_CANDIDATE_LEDGER_PATH || DEFAULT_MODEL_CANDIDATE_LEDGER_PATH,
    modelCandidateDecisionDir: readFlag(args, '--model-candidate-decision-dir') || process.env.MODEL_CANDIDATE_DECISION_DIR || DEFAULT_MODEL_CANDIDATE_DECISION_DIR,
    port: numberFlag(args, '--port', Number.parseInt(process.env.RESEARCH_REVIEW_INTERACTION_PORT || '8787', 10) || 8787),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function renderResult(result: ResearchDiscordInteractionResult | ModelCandidateDecisionInteractionResult): string {
  return [
    '[RESEARCH DISCORD INTERACTION]',
    `Status: ${result.status}`,
    'sampleId' in result ? `Sample id: ${result.sampleId || 'n/a'}` : `Concept key: ${result.conceptKey || 'n/a'}`,
    'selectedLabel' in result ? `Selected label: ${result.selectedLabel || 'n/a'}` : `Decision: ${result.decision || 'n/a'}`,
    'reviewedPackPath' in result ? `Reviewed pack: ${result.reviewedPackPath || 'n/a'}` : `Decision JSON: ${result.decisionJsonPath || 'n/a'}`,
    'reviewedMarkdownPath' in result ? `Reviewed markdown: ${result.reviewedMarkdownPath || 'n/a'}` : `Decision Markdown: ${result.decisionMarkdownPath || 'n/a'}`,
    `OK: ${result.ok ? 'yes' : 'no'}`,
    '',
    result.responseContent,
  ].join('\n');
}

function discordEphemeral(content: string) {
  return {
    type: 4,
    data: {
      content,
      flags: 64,
      allowed_mentions: { parse: [] },
    },
  };
}

function verifyDiscordSignature(rawBody: Buffer, timestamp: string | undefined, signature: string | undefined, publicKey: string): boolean {
  if (!timestamp || !signature) return false;
  const message = Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]);
  return nacl.sign.detached.verify(
    new Uint8Array(message),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex'),
  );
}

async function editDiscordMessage(channelId: string | null, messageId: string | null, update: ResearchDiscordInteractionResult['messageUpdate']): Promise<void> {
  if (!channelId || !messageId || !update) return;
  const token = process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update),
  }).catch(() => undefined);
}

function interactionUser(payload: Record<string, unknown>): { id: string; username?: string | null } {
  const member = payload.member && typeof payload.member === 'object' ? payload.member as Record<string, unknown> : {};
  const userSource = member.user && typeof member.user === 'object'
    ? member.user as Record<string, unknown>
    : payload.user && typeof payload.user === 'object'
      ? payload.user as Record<string, unknown>
      : {};
  const id = typeof userSource.id === 'string' ? userSource.id : '';
  const username = typeof userSource.username === 'string' ? userSource.username : null;
  return { id, username };
}

function rawBodySaver(_req: express.Request, _res: express.Response, buffer: Buffer): void {
  (_req as express.Request & { rawBody?: Buffer }).rawBody = buffer;
}

async function startServer(options: ResearchDiscordInteractionsCliOptions): Promise<void> {
  const publicKey = process.env.RESEARCH_REVIEW_DISCORD_PUBLIC_KEY;
  if (!publicKey) throw new Error('RESEARCH_REVIEW_DISCORD_PUBLIC_KEY is required to start the real Discord interaction endpoint.');
  const app = express();
  app.use(express.json({ verify: rawBodySaver }));
  app.post('/interactions', async (req, res) => {
    try {
      const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody || Buffer.from(JSON.stringify(req.body));
      const valid = verifyDiscordSignature(
        rawBody,
        req.header('x-signature-timestamp'),
        req.header('x-signature-ed25519'),
        publicKey,
      );
      if (!valid) {
        console.warn('[research-discord-interactions] rejected request with invalid Discord signature.');
        res.status(401).send('invalid request signature');
        return;
      }

      const payload = req.body as Record<string, unknown>;
      if (payload.type === 1) {
        res.json({ type: 1 });
        return;
      }

      const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : {};
      const message = payload.message && typeof payload.message === 'object' ? payload.message as Record<string, unknown> : {};
      const customId = typeof data.custom_id === 'string' ? data.custom_id : '';
      const user = interactionUser(payload);
      const result = customId.startsWith('model_candidate_decision|')
        ? await handleModelCandidateDecisionInteraction({
          customId,
          ledgerPath: options.modelCandidateLedgerPath,
          decisionDir: options.modelCandidateDecisionDir,
          user,
        })
        : handleResearchDiscordReviewInteraction({
          customId,
          statePath: options.statePath,
          user,
          channelId: typeof payload.channel_id === 'string' ? payload.channel_id : null,
          messageId: typeof message.id === 'string' ? message.id : null,
          allowedUserIds: allowedUserIds(),
          messageContent: typeof message.content === 'string' ? message.content : null,
          messageComponents: Array.isArray(message.components) ? message.components as never : undefined,
        });
      if (!result.ok) console.warn(`[research-discord-interactions] interaction rejected: ${result.status}`);
      if ('messageUpdate' in result) {
        await editDiscordMessage(
          typeof payload.channel_id === 'string' ? payload.channel_id : null,
          typeof message.id === 'string' ? message.id : null,
          result.messageUpdate,
        );
      }
      res.json(discordEphemeral(result.responseContent));
    } catch (error) {
      console.error(`[research-discord-interactions] safe server error response: ${error instanceof Error ? error.message : String(error)}`);
      res.json(discordEphemeral(researchOnlySafetyFailureResponse()));
    }
  });
  await new Promise<void>((resolve) => {
    app.listen(options.port, () => resolve());
  });
  console.log(`[RESEARCH DISCORD INTERACTIONS] Listening on port ${options.port}`);
  console.log(`State path: ${path.resolve(options.statePath)}`);
  console.log('Authority: research-only. Button interactions do not approve execution.');
}

async function runSimulation(options: ResearchDiscordInteractionsCliOptions): Promise<ResearchDiscordInteractionResult | ModelCandidateDecisionInteractionResult> {
  if (!options.customId) throw new Error('--custom-id is required with --simulate.');
  if (!options.discordUserId) throw new Error('--discord-user-id is required with --simulate.');
  if (options.customId.startsWith('model_candidate_decision|')) {
    return handleModelCandidateDecisionInteraction({
      customId: options.customId,
      ledgerPath: options.modelCandidateLedgerPath,
      decisionDir: options.modelCandidateDecisionDir,
      user: {
        id: options.discordUserId,
        username: options.discordUsername,
      },
    });
  }
  return handleResearchDiscordReviewInteraction({
    customId: options.customId,
    statePath: options.statePath,
    user: {
      id: options.discordUserId,
      username: options.discordUsername,
    },
    channelId: process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID || 'simulation',
    messageId: 'simulation',
    allowedUserIds: allowedUserIds(),
  });
}

export async function runResearchDiscordInteractionsCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchDiscordInteractionsArgs(rawArgs);
  if (options.simulate) {
    const result = await runSimulation(options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    if (options.pretty) console.log(renderResult(result));
    return;
  }
  await startServer(options);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-discord-interactions.ts')) {
  runResearchDiscordInteractionsCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
