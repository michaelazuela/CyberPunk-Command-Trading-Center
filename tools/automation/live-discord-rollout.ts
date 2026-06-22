import path from 'path';
import { fileURLToPath } from 'url';

export type LiveDiscordRolloutInstrument = 'MES' | 'MNQ';
export type LiveDiscordRolloutSession = 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';

export interface LiveDiscordRolloutOptions {
  date: string;
  instrument: LiveDiscordRolloutInstrument;
  session: LiveDiscordRolloutSession;
  bridgeInstrument: string;
  from: string;
  to: string;
  auditDir: string;
}

export interface LiveDiscordRolloutChecklist {
  sourceOfTruth: 'phase_11c_live_discord_rollout_checklist';
  dryRunValidationCommand: string;
  diagnosticReplayCommand: string;
  livePostCommand: string;
  receiptVerificationSteps: string[];
  rollbackSteps: string[];
  requiredEvidenceBeforeLivePost: string[];
  authorityBoundary: {
    readOnlyChecklist: true;
    postsDiscord: false;
    changesTradingLogic: false;
    changesScannerBehavior: false;
    changesDiscordSendBehavior: false;
    changesBridgeBehavior: false;
    changesCanExecute: false;
    createsTradeApproval: false;
    requiresHumanOperatorBeforeLivePost: true;
  };
}

export interface ParsedLiveDiscordRolloutCli {
  options: LiveDiscordRolloutOptions;
  json: boolean;
  pretty: boolean;
}

const DEFAULT_AUDIT_DIR = 'tools/automation/discord-audit';
const VALID_SESSIONS = new Set<LiveDiscordRolloutSession>(['morning', 'lunch', 'replay_morning', 'replay_lunch']);
const VALID_INSTRUMENTS = new Set<LiveDiscordRolloutInstrument>(['MES', 'MNQ']);

function shellQuote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function argValue(args: string[], name: string): string | null {
  const flag = `--${name}`;
  const exact = args.indexOf(flag);
  if (exact >= 0) return args[exact + 1] || null;
  const prefix = `${flag}=`;
  const prefixed = args.find((arg) => arg.startsWith(prefix));
  return prefixed ? prefixed.slice(prefix.length) : null;
}

function hasArg(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

function requireArg(args: string[], name: string): string {
  const value = argValue(args, name);
  if (!value) throw new Error(`Missing required --${name}.`);
  return value;
}

function validateDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid --date ${value}. Use YYYY-MM-DD.`);
  }
}

function validateTime(name: string, value: string): void {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error(`Invalid --${name} ${value}. Use HH:mm in Eastern market time.`);
  }
}

export function parseLiveDiscordRolloutArgs(args: string[]): ParsedLiveDiscordRolloutCli {
  const date = requireArg(args, 'date');
  const session = requireArg(args, 'session') as LiveDiscordRolloutSession;
  const bridgeInstrument = requireArg(args, 'bridge-instrument');
  const from = requireArg(args, 'from');
  const to = requireArg(args, 'to');
  const instrument = (argValue(args, 'instrument') || 'MES').toUpperCase() as LiveDiscordRolloutInstrument;
  const auditDir = argValue(args, 'audit-dir') || DEFAULT_AUDIT_DIR;

  validateDate(date);
  validateTime('from', from);
  validateTime('to', to);
  if (!VALID_SESSIONS.has(session)) {
    throw new Error(`Invalid --session ${session}. Use morning, lunch, replay_morning, or replay_lunch.`);
  }
  if (!VALID_INSTRUMENTS.has(instrument)) {
    throw new Error(`Invalid --instrument ${instrument}. Use MES or MNQ.`);
  }

  return {
    options: { date, instrument, session, bridgeInstrument, from, to, auditDir },
    json: hasArg(args, 'json'),
    pretty: hasArg(args, 'pretty') || !hasArg(args, 'json'),
  };
}

export function buildLiveDiscordRolloutChecklist(options: LiveDiscordRolloutOptions): LiveDiscordRolloutChecklist {
  const baseScannerArgs = [
    '--instrument',
    options.instrument,
    '--bridge-instrument',
    shellQuote(options.bridgeInstrument),
    '--bar-time-zone',
    'eastern',
    '--once',
  ].join(' ');
  const replayArgs = [
    '--date',
    options.date,
    '--instrument',
    options.instrument,
    '--session',
    options.session,
    '--bridge-instrument',
    shellQuote(options.bridgeInstrument),
    '--from',
    options.from,
    '--to',
    options.to,
    '--direction',
    'AUTO',
    '--audit-dir',
    options.auditDir,
    '--pretty',
  ].join(' ');

  return {
    sourceOfTruth: 'phase_11c_live_discord_rollout_checklist',
    dryRunValidationCommand: `npm run nt:scanner -- ${baseScannerArgs} --dry-run`,
    diagnosticReplayCommand: `npm run diagnostic:replay -- ${replayArgs}`,
    livePostCommand: `npm run nt:scanner -- ${baseScannerArgs} --live-discord-policy-confirmed`,
    receiptVerificationSteps: [
      `Review the newest ${options.auditDir}/discord-receipt-*.json receipt for the active ${options.instrument} ${options.session} post.`,
      'Confirm delivery.status is posted, delivery.webhookSource is not phase11_boundary, and the payload includes scanner-owned DeskState visibility metadata.',
      'Confirm the matching scanner decision tape and replay report remain present for the same trade date, instrument, session, and market-time window.',
    ],
    rollbackSteps: [
      'Remove the --live-discord-policy-confirmed flag from the scanner command.',
      'Unset QUANT_DESK_LIVE_DISCORD_POLICY_CONFIRMED if it was set for the shell or supervisor environment.',
      `Return to dry-run validation with: npm run nt:scanner -- ${baseScannerArgs} --dry-run`,
      'If a receipt shows phase11_boundary, keep live posting disabled and rerun diagnostic replay before the next operator review.',
    ],
    requiredEvidenceBeforeLivePost: [
      'Fresh active-window dry scan completed for the same instrument and bridge contract.',
      'Diagnostic replay passed against the generated scanner audit history for the same date, session, and market-time window.',
      'Scanner health is READY, bridge instrument is resolved, completed 5M data is fresh, and HTF context is present.',
      'DeskState visibility metadata, decision tape path, audit path, and validated Discord payload are present.',
      'Human operator explicitly approves the one live-post command for the current window.',
    ],
    authorityBoundary: {
      readOnlyChecklist: true,
      postsDiscord: false,
      changesTradingLogic: false,
      changesScannerBehavior: false,
      changesDiscordSendBehavior: false,
      changesBridgeBehavior: false,
      changesCanExecute: false,
      createsTradeApproval: false,
      requiresHumanOperatorBeforeLivePost: true,
    },
  };
}

export function formatLiveDiscordRolloutChecklist(checklist: LiveDiscordRolloutChecklist): string {
  return [
    'Phase 11C Live Discord Rollout Checklist',
    `Source: ${checklist.sourceOfTruth}`,
    '',
    '1. Dry scan validation',
    checklist.dryRunValidationCommand,
    '',
    '2. Diagnostic replay',
    checklist.diagnosticReplayCommand,
    '',
    '3. Controlled live post command',
    checklist.livePostCommand,
    '',
    '4. Receipt verification',
    ...checklist.receiptVerificationSteps.map((step) => `- ${step}`),
    '',
    '5. Rollback',
    ...checklist.rollbackSteps.map((step) => `- ${step}`),
    '',
    'Authority boundary',
    JSON.stringify(checklist.authorityBoundary, null, 2),
  ].join('\n');
}

export function liveDiscordRolloutUsage(): string {
  return [
    'Usage:',
    '  npm run nt:live-discord-rollout -- --date YYYY-MM-DD --instrument MES --session lunch --bridge-instrument "MES 09-26" --from 12:00 --to 15:50 --pretty',
    '',
    'Required:',
    '  --date YYYY-MM-DD',
    '  --session morning|lunch|replay_morning|replay_lunch',
    '  --bridge-instrument "MES 09-26"',
    '  --from HH:mm',
    '  --to HH:mm',
    '',
    'Optional:',
    '  --instrument MES|MNQ',
    `  --audit-dir ${DEFAULT_AUDIT_DIR}`,
    '  --json',
    '  --pretty',
  ].join('\n');
}

const thisFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedFile === thisFile) {
  try {
    const args = process.argv.slice(2);
    if (hasArg(args, 'help') || hasArg(args, 'h')) {
      console.log(liveDiscordRolloutUsage());
      process.exit(0);
    }
    const parsed = parseLiveDiscordRolloutArgs(args);
    const checklist = buildLiveDiscordRolloutChecklist(parsed.options);
    console.log(parsed.json ? JSON.stringify(checklist, null, 2) : formatLiveDiscordRolloutChecklist(checklist));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[nt:live-discord-rollout] ${message}`);
    console.error(liveDiscordRolloutUsage());
    process.exit(1);
  }
}
