import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  routeAiObserverModel,
  type AiObserverModelRoute,
  type AiObserverWorkload,
} from '../../src/lib/aiObserverModelRouter';

type SessionName = 'morning' | 'lunch' | 'evening';
type ObserverStatus = 'dry_run' | 'queued' | 'aligned' | 'caution' | 'mismatch' | 'data_limited' | 'unavailable';

interface AiTradeObserverOptions {
  tradeDate: string;
  tradeDateLocked: boolean;
  instrument: string;
  session: SessionName;
  sessionLocked: boolean;
  auditDir: string;
  outDir: string;
  statePath: string;
  endpointUrl: string | null;
  liveAiCall: boolean;
  postDiscord: boolean;
  watch: boolean;
  pollSeconds: number;
  maxEvents: number;
  json: boolean;
}

interface AiTradeObserverReview {
  sourceOfTruth: 'ai_trade_observer_review';
  eventKey: string;
  eventTime: string | null;
  status: ObserverStatus;
  modelRoute: AiObserverModelRoute;
  summary: string;
  evidence: string[];
  error: string | null;
  authorityBoundary: {
    observerApprovesTrade: false;
    observerChangesPlan: false;
    observerChangesCanExecute: false;
    observerBlocksDiscord: false;
    observerPostsOriginalTradePlan: false;
  };
}

interface AiTradeObserverReport {
  reportType: 'ai_trade_observer_report';
  generatedAt: string;
  tradeDate: string;
  instrument: string;
  session: SessionName;
  sourceTape: string;
  liveAiCall: boolean;
  postDiscord: boolean;
  reviews: AiTradeObserverReview[];
  authorityBoundary: {
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    blocksDiscord: false;
    placesOrders: false;
  };
}

interface ObserverState {
  reviewed: Record<string, string>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'ai-observer-reports');
const DEFAULT_STATE_PATH = path.join(__dirname, '.ai-trade-observer-state.json');

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

function boolFlag(args: string[], flag: string, fallback: boolean): boolean {
  const value = readFlag(args, flag);
  if (value === null) return hasFlag(args, flag) ? true : fallback;
  if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false;
  if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true;
  return fallback;
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function etSession(): SessionName {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const minutes = hour * 60 + minute;
  if (minutes >= 12 * 60 && minutes < 16 * 60) return 'lunch';
  if (minutes >= 18 * 60 + 45 || minutes < 2 * 60) return 'evening';
  return 'morning';
}

export function parseAiTradeObserverArgs(args = process.argv.slice(2)): AiTradeObserverOptions {
  const tradeDateFlag = readFlag(args, '--trade-date');
  const sessionFlag = readFlag(args, '--session');
  const rawSession = (sessionFlag || etSession()).toLowerCase();
  if (rawSession !== 'morning' && rawSession !== 'lunch' && rawSession !== 'evening') {
    throw new Error('--session must be morning, lunch, or evening.');
  }
  return {
    tradeDate: tradeDateFlag || etDate(),
    tradeDateLocked: Boolean(tradeDateFlag),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    session: rawSession,
    sessionLocked: Boolean(sessionFlag),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    statePath: readFlag(args, '--state-path') || DEFAULT_STATE_PATH,
    endpointUrl: readFlag(args, '--endpoint-url') || process.env.QUANT_DESK_AI_OBSERVER_ENDPOINT_URL || null,
    liveAiCall: boolFlag(args, '--live-ai-call', false),
    postDiscord: boolFlag(args, '--post-discord', false),
    watch: boolFlag(args, '--watch', false),
    pollSeconds: numberFlag(args, '--poll-seconds', 60),
    maxEvents: numberFlag(args, '--max-events', 5),
    json: hasFlag(args, '--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function tapePath(options: Pick<AiTradeObserverOptions, 'auditDir' | 'tradeDate' | 'instrument' | 'session'>): string {
  return path.join(options.auditDir, `scanner-decision-tape-${options.tradeDate}-${options.instrument}-${options.session}.json`);
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function workloadForEvent(event: Record<string, unknown>, trace: Record<string, unknown>): AiObserverWorkload {
  const gates = asRecord(trace.gates);
  const discord = asRecord(event.discord);
  const scannerState = stringValue(event.scannerState) || '';
  const delivery = stringValue(gates.delivery) || '';
  if (scannerState === 'Missed') return 'missed_trade_dispute';
  if (delivery === 'failed' || delivery === 'skipped' || gates.liveDiscordBoundary === 'blocked') return 'boundary_block_review';
  if (discord.shouldSend === true || boolValue(gates.humanReviewReady) || boolValue(gates.canExecute)) return 'live_plan_validation';
  return 'summary';
}

function routeInputForEvent(event: Record<string, unknown>, trace: Record<string, unknown>, userDisputed = false) {
  const gates = asRecord(trace.gates);
  const reasons = asRecord(trace.reasons);
  return {
    workload: workloadForEvent(event, trace),
    scannerSawCandidate: boolValue(gates.scannerSawCandidate),
    score: numberValue(reasons.score),
    visibilityPassed: boolValue(gates.visibilityPassed),
    liveDiscordBoundary: stringValue(gates.liveDiscordBoundary) === 'blocked'
      ? 'blocked' as const
      : stringValue(gates.liveDiscordBoundary) === 'passed'
        ? 'passed' as const
        : 'pending' as const,
    delivery: ['pending', 'sent', 'skipped', 'failed', 'failed_stale_no_retry', 'not_attempted'].includes(stringValue(gates.delivery) || '')
      ? stringValue(gates.delivery) as 'pending' | 'sent' | 'skipped' | 'failed' | 'failed_stale_no_retry' | 'not_attempted'
      : 'not_attempted' as const,
    canExecute: boolValue(gates.canExecute),
    humanReviewReady: boolValue(gates.humanReviewReady),
    staleReason: stringValue(reasons.staleReason),
    userDisputed,
  };
}

function validObserverEndpoint(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const pathName = url.pathname.replace(/\/+$/, '');
    return pathName.endsWith('/api/openai') || pathName.endsWith('/api/gemini') ? url : null;
  } catch {
    return null;
  }
}

function parseProviderText(body: unknown): string {
  const record = asRecord(body);
  if (typeof record.output_text === 'string') return record.output_text.trim();
  const output = Array.isArray(record.output) ? record.output : [];
  const responseText = output
    .flatMap((item) => {
      const itemRecord = asRecord(item);
      const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
      return content.map((part) => asRecord(part).text || '');
    })
    .join('');
  if (responseText.trim()) return responseText.trim();
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice.message);
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const firstCandidate = asRecord(candidates[0]);
  const content = asRecord(firstCandidate.content);
  const parts = Array.isArray(content.parts) ? content.parts : [];
  return String(
    record.text ||
    message.content ||
    parts.map((part) => asRecord(part).text || '').join('') ||
    '',
  ).trim();
}

async function callObserverEndpoint(args: {
  endpointUrl: string | null;
  route: AiObserverModelRoute;
  eventKey: string;
  event: Record<string, unknown>;
  trace: Record<string, unknown>;
}): Promise<Pick<AiTradeObserverReview, 'status' | 'summary' | 'evidence' | 'error'>> {
  const endpoint = validObserverEndpoint(args.endpointUrl);
  if (!endpoint) {
    return {
      status: 'unavailable',
      summary: 'AI observer endpoint is not configured. Expected a Cloudflare URL ending in /api/openai or /api/gemini.',
      evidence: [],
      error: 'missing_observer_endpoint',
    };
  }

  const prompt = [
    'You are the Quant Desk AI Observer. Review the scanner traffic-cop trace as advisory backup only.',
    'Return JSON only: {"status":"aligned|caution|mismatch|data_limited","summary":"...","evidence":["..."]}.',
    'You may flag conflicts, missing data, stale language, or a Discord boundary issue.',
    'You must not create trades, change entry/stop/targets, change canExecute, block Discord, or approve execution.',
    `Event key: ${args.eventKey}`,
    `Model route: ${JSON.stringify(args.route)}`,
    `Traffic-cop trace: ${JSON.stringify(args.trace)}`,
    `Scanner event: ${JSON.stringify(args.event)}`,
  ].join('\n\n');

  const isGemini = endpoint.pathname.replace(/\/+$/, '').endsWith('/api/gemini');
  const payload = isGemini
    ? {
        model: args.route.model,
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }
    : {
        model: args.route.model,
        reasoning: { effort: args.route.reasoningEffort },
        text: { format: { type: 'json_object' } },
        max_output_tokens: args.route.maxOutputTokens,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: 'You are an advisory-only trading plan consistency observer. JSON only.' }],
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
      };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        status: 'unavailable',
        summary: `AI observer endpoint returned HTTP ${response.status}. Scanner and Discord remain independent.`,
        evidence: [],
        error: `http_${response.status}`,
      };
    }
    const text = parseProviderText(body);
    const parsed = text ? JSON.parse(text) : asRecord(body);
    const status = ['aligned', 'caution', 'mismatch', 'data_limited'].includes(String(parsed.status))
      ? parsed.status as ObserverStatus
      : 'caution';
    return {
      status,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : 'AI observer returned advisory review.',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.filter((item: unknown): item is string => typeof item === 'string').slice(0, 6) : [],
      error: null,
    };
  } catch (error) {
    return {
      status: 'unavailable',
      summary: `AI observer unavailable: ${error instanceof Error ? error.message : String(error)}. Scanner and Discord remain independent.`,
      evidence: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function writeReport(report: AiTradeObserverReport, outDir: string): Promise<string> {
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `ai-trade-observer-${report.tradeDate}-${report.instrument}-${report.session}.json`);
  await fs.writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return file;
}

export async function buildAiTradeObserverReport(options: AiTradeObserverOptions): Promise<{ report: AiTradeObserverReport; reportPath: string }> {
  const sourceTape = tapePath(options);
  if (!existsSync(sourceTape)) throw new Error(`Scanner decision tape not found: ${sourceTape}`);
  const tape = await readJsonFile<Record<string, unknown>>(sourceTape, {});
  const events = asRecord(tape.events);
  const state = await readJsonFile<ObserverState>(options.statePath, { reviewed: {} });
  const pending = Object.entries(events)
    .filter(([eventKey, event]) => {
      if (state.reviewed[eventKey]) return false;
      const trace = asRecord(asRecord(event).trafficCopTrace);
      const gates = asRecord(trace.gates);
      return Boolean(trace.sourceOfTruth === 'scanner_traffic_cop_trace' && (gates.scannerSawCandidate || gates.delivery === 'failed' || gates.liveDiscordBoundary === 'blocked'));
    })
    .slice(-options.maxEvents);

  const reviews: AiTradeObserverReview[] = [];
  for (const [eventKey, eventValue] of pending) {
    const event = asRecord(eventValue);
    const trace = asRecord(event.trafficCopTrace);
    const route = routeAiObserverModel(routeInputForEvent(event, trace));
    const reviewPayload = options.liveAiCall
      ? await callObserverEndpoint({ endpointUrl: options.endpointUrl, route, eventKey, event, trace })
      : {
          status: 'dry_run' as ObserverStatus,
          summary: 'Dry-run observer review. Model route selected; no AI endpoint was called.',
          evidence: [route.routeReason],
          error: null,
        };
    reviews.push({
      sourceOfTruth: 'ai_trade_observer_review',
      eventKey,
      eventTime: stringValue(event.time),
      status: reviewPayload.status,
      modelRoute: route,
      summary: reviewPayload.summary,
      evidence: reviewPayload.evidence,
      error: reviewPayload.error,
      authorityBoundary: {
        observerApprovesTrade: false,
        observerChangesPlan: false,
        observerChangesCanExecute: false,
        observerBlocksDiscord: false,
        observerPostsOriginalTradePlan: false,
      },
    });
    state.reviewed[eventKey] = new Date().toISOString();
  }

  await fs.mkdir(path.dirname(options.statePath), { recursive: true });
  await fs.writeFile(options.statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

  const report: AiTradeObserverReport = {
    reportType: 'ai_trade_observer_report',
    generatedAt: new Date().toISOString(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    sourceTape,
    liveAiCall: options.liveAiCall,
    postDiscord: options.postDiscord,
    reviews,
    authorityBoundary: {
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      blocksDiscord: false,
      placesOrders: false,
    },
  };
  return { report, reportPath: await writeReport(report, options.outDir) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseAiTradeObserverArgs();
  do {
    const tradeDate = options.tradeDateLocked ? options.tradeDate : etDate();
    const session = options.sessionLocked ? options.session : etSession();
    const { report, reportPath } = await buildAiTradeObserverReport({
      ...options,
      tradeDate,
      session,
    });
    if (options.json && !options.watch) {
      console.log(JSON.stringify({ reportPath, ...report }, null, 2));
    } else {
      console.log(`[ai-observer] ${report.instrument} ${report.tradeDate} ${report.session}: reviewed=${report.reviews.length} liveAiCall=${report.liveAiCall} report=${reportPath}`);
    }
    if (!options.watch) break;
    await sleep(Math.max(15, options.pollSeconds) * 1000);
  } while (true);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(`[ai-observer] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
