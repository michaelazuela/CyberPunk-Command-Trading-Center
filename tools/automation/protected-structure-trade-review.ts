import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { targetsFromEntryStop } from '../../src/config/tradeRules';
import { getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type ChartCandleFact,
  type ChartContext,
  type DecisionQualityScoreItem,
  type SetupCandidate,
} from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe } from './market-data-store';
import { renderChartMarkup } from './chart-markup-renderer';
import {
  assertDiscordOutcomeEndpointSecretReady,
  buildOutcomeComponents,
  discordWebhookUrlForPayload,
  loadCanonicalDiscordOutcomeSecretFromEnvLocal,
} from './discord-outcome-buttons';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });
loadCanonicalDiscordOutcomeSecretFromEnvLocal(process.cwd(), { warnOnOverride: true });

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_OVERLAY = path.resolve(
  path.dirname(__filename),
  'replay-diagnostics',
  'phase-10k-protected-structure-overlay-2026-06-08-to-2026-06-12.json',
);
const DEFAULT_OUTPUT_ROOT = path.resolve('reports/protected-structure-review/2026-06-08-to-2026-06-12');
const MES_DOLLARS_PER_POINT = 5;

type Direction = 'LONG' | 'SHORT';

interface OverlayBias {
  bias: 'BULL' | 'BEAR';
  confirm: number;
  protect: number;
}

interface OverlaySegment {
  date: string;
  dir: Direction;
  start: string;
  end: string;
  count: number;
  first: {
    time: string;
    close: number;
    bias5: OverlayBias;
    bias15: OverlayBias;
  };
}

interface OverlayReport {
  totals: { evaluatedBars: number; confirmed: number; long: number; short: number; wait: number };
  segments: OverlaySegment[];
}

export interface TradeReviewOptions {
  overlayPath?: string;
  outputRoot?: string;
  instrument?: string;
  bridgeInstrument?: string;
  timeframe?: NinjaBridgeTimeframe;
  marketTimeframe?: MarketBarTimeframe;
  from?: string;
  to?: string;
  renderCharts?: boolean;
  postDiscord?: boolean;
  dryRun?: boolean;
}

interface LoadedReviewBars {
  bars: NinjaBridgeBar[];
  chartBars: NinjaBridgeBar[];
  cacheBars: number;
  bridgeBars: number;
  source: 'market_bars' | 'market_bars_bridge_repair' | 'ninjatrader_bridge' | 'missing';
  cacheUnavailableReason: string | null;
}

interface ReviewCampaignRow {
  id: number;
  date: string;
  direction: Direction;
  start: string;
  end: string;
  confirmations: number;
  firstClose: number;
  lineInSand: number;
  entry: number;
  stop: number;
  riskPoints: number;
  target1: number;
  target2: number;
  oneContractRiskDollars: number;
  oneContractT1Dollars: number;
  oneContractT2Dollars: number;
  bias5: OverlayBias;
  bias15: OverlayBias;
  quality: ProtectedStructureTradeQuality;
  status: 'REVIEW ONLY - not execution approval';
  chart: string | null;
  discordMessageId: string | null;
}

export type ProtectedStructureTradeQualityLabel =
  | 'A_REVIEW'
  | 'B_REVIEW'
  | 'CAUTION'
  | 'LOW_QUALITY_REVIEW';

export interface ProtectedStructureTradeQuality {
  sourceOfTruth: 'phase_10l_protected_structure_trade_quality';
  label: ProtectedStructureTradeQualityLabel;
  score: number;
  summary: string;
  flags: {
    tightStop: boolean;
    wideStop: boolean;
    extendedFromEntry: boolean;
    poorEntryLocation: boolean;
    betterEntryNeeded: boolean;
    sparseConfirmation: boolean;
    lateDayRunnerRisk: boolean;
    fridayRunnerRisk: boolean;
    tacticalStopInside15mStructure: boolean;
  };
  findings: string[];
  management: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
  };
  scorecard: DecisionQualityScoreItem[];
}

interface ReviewSourceSummary {
  bars5m: number;
  cacheBars: number;
  bridgeBars: number;
  source: LoadedReviewBars['source'];
  cacheUnavailableReason: string | null;
  firstBar: string | null;
  lastBar: string | null;
}

const RAW_OHLC_KEYS = new Set(['bars', 'candles', 'rawBars', 'chartContext']);

function parseArgs(argv: string[]): TradeReviewOptions {
  const options: TradeReviewOptions = {};
  for (const arg of argv) {
    if (arg === '--no-charts') {
      options.renderCharts = false;
      continue;
    }
    if (arg === '--post-discord') {
      options.postDiscord = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) throw new Error(`Unknown argument: ${arg}`);
    const [, key, value] = match;
    if (key === 'overlay') options.overlayPath = value;
    else if (key === 'output') options.outputRoot = value;
    else if (key === 'instrument') options.instrument = value;
    else if (key === 'bridge-instrument') options.bridgeInstrument = value;
    else if (key === 'from') options.from = value;
    else if (key === 'to') options.to = value;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function normalizeBridgeTime(value: string): string {
  return value.replace(/\.(\d{3})\d+/, '.$1');
}

function timeMs(value: string): number {
  const normalized = normalizeBridgeTime(value);
  if (normalized.includes('Z') || /[+-]\d\d:?\d\d$/.test(normalized)) return Date.parse(normalized);
  return Date.parse(`${normalized}-04:00`);
}

function fmt(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toFixed(2) : 'N/A';
}

function mergeBars(...groups: NinjaBridgeBar[][]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  for (const group of groups) {
    for (const bar of group) {
      if (!bar?.time) continue;
      byTime.set(normalizeBridgeTime(bar.time), { ...bar, time: normalizeBridgeTime(bar.time) });
    }
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

async function loadReviewBars(options: Required<Pick<TradeReviewOptions, 'bridgeInstrument' | 'timeframe' | 'marketTimeframe' | 'from' | 'to'>>): Promise<LoadedReviewBars> {
  const config = loadMarketDataConfig();
  const cached = config
    ? await fetchCachedMarketBars({
      instrument: options.bridgeInstrument,
      timeframe: options.marketTimeframe,
      from: options.from,
      to: options.to,
      config,
      limit: 20000,
    }).catch(() => [] as NinjaBridgeBar[])
    : [];
  const bridge = await getNinjaHistoricalBars({
    instrument: options.bridgeInstrument,
    timeframe: options.timeframe,
    from: options.from,
    to: options.to,
    limit: 20000,
  }).catch(() => ({ ok: false, bars: [] as NinjaBridgeBar[] }));
  const bridgeBars = bridge.ok && Array.isArray(bridge.bars) ? bridge.bars : [];
  const bars = mergeBars(cached, bridgeBars);
  const source = cached.length && bridgeBars.length
    ? 'market_bars_bridge_repair'
    : cached.length
      ? 'market_bars'
      : bridgeBars.length
        ? 'ninjatrader_bridge'
        : 'missing';
  return {
    bars,
    chartBars: bridgeBars.length ? mergeBars(bridgeBars) : bars,
    cacheBars: cached.length,
    bridgeBars: bridgeBars.length,
    source,
    cacheUnavailableReason: config ? null : 'SUPABASE market_bars credentials unavailable; used NinjaTrader bridge historical-bars fallback.',
  };
}

function lineInSand(segment: OverlaySegment): number {
  const values = [segment.first.bias5.protect, segment.first.bias15.protect].filter(Number.isFinite);
  return segment.dir === 'LONG' ? Math.min(...values) : Math.max(...values);
}

function entryReference(segment: OverlaySegment): number {
  return segment.first.bias5.confirm;
}

function protectedStop(segment: OverlaySegment): number {
  return segment.first.bias5.protect;
}

function reviewLevels(segment: OverlaySegment) {
  const entry = entryReference(segment);
  const stop = protectedStop(segment);
  const targets = targetsFromEntryStop(segment.dir, entry, stop);
  if (!Number.isFinite(targets.target1) || !Number.isFinite(targets.target2)) {
    throw new Error(`Could not compute app-owned targets for ${segment.date} ${segment.start} ${segment.dir}.`);
  }
  const riskPoints = Math.abs(entry - stop);
  return {
    entry,
    stop,
    riskPoints,
    target1: targets.target1 as number,
    target2: targets.target2 as number,
    oneContractRiskDollars: riskPoints * MES_DOLLARS_PER_POINT,
    oneContractT1Dollars: riskPoints * 1.5 * MES_DOLLARS_PER_POINT,
    oneContractT2Dollars: riskPoints * 2 * MES_DOLLARS_PER_POINT,
  };
}

function directionExtensionFromEntry(segment: OverlaySegment, entry: number): number {
  return segment.dir === 'LONG'
    ? segment.first.close - entry
    : entry - segment.first.close;
}

function etMinutes(value: string): number {
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isFriday(date: string): boolean {
  return new Date(`${date}T12:00:00-04:00`).getUTCDay() === 5;
}

function qualityStatus(score: number, max: number): DecisionQualityScoreItem['status'] {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.55) return 'partial';
  if (ratio > 0) return 'weak';
  return 'blocked';
}

function scoreItem(label: string, score: number, max: number, note: string): DecisionQualityScoreItem {
  const safeScore = Math.max(0, Math.min(max, Math.round(score)));
  return {
    label,
    score: safeScore,
    max,
    status: qualityStatus(safeScore, max),
    note,
  };
}

function qualityLabelFromScore(score: number): ProtectedStructureTradeQualityLabel {
  if (score >= 82) return 'A_REVIEW';
  if (score >= 68) return 'B_REVIEW';
  if (score >= 50) return 'CAUTION';
  return 'LOW_QUALITY_REVIEW';
}

export function buildProtectedStructureTradeQuality(
  segment: OverlaySegment,
  levels = reviewLevels(segment),
): ProtectedStructureTradeQuality {
  const extensionPoints = directionExtensionFromEntry(segment, levels.entry);
  const extensionR = levels.riskPoints > 0 ? extensionPoints / levels.riskPoints : 0;
  const fiveToFifteenStopGap = segment.dir === 'LONG'
    ? levels.stop - segment.first.bias15.protect
    : segment.first.bias15.protect - levels.stop;
  const startMinutes = etMinutes(segment.start);
  const endMinutes = etMinutes(segment.end);
  const tightStop = levels.riskPoints < 10;
  const wideStop = levels.riskPoints > 25;
  const extendedFromEntry = extensionR >= 0.7 || extensionPoints >= 15;
  const severeExtensionFromEntry = extensionR >= 1 || extensionPoints >= 25;
  const poorEntryLocation = extensionR >= 0.5 || extensionPoints >= 10;
  const betterEntryNeeded = wideStop || poorEntryLocation;
  const sparseConfirmation = segment.count <= 2;
  const lateDayRunnerRisk = endMinutes >= 15 * 60 || startMinutes >= 14 * 60 + 30;
  const fridayRunnerRisk = isFriday(segment.date) && endMinutes >= 12 * 60;
  const tacticalStopInside15mStructure = fiveToFifteenStopGap > Math.max(5, levels.riskPoints * 0.25);

  let score = 100;
  if (tightStop) score -= 16;
  if (wideStop) score -= 14;
  if (extendedFromEntry) score -= severeExtensionFromEntry ? 35 : 25;
  else if (poorEntryLocation) score -= 10;
  if (sparseConfirmation) score -= 12;
  if (lateDayRunnerRisk) score -= 8;
  if (fridayRunnerRisk) score -= 10;
  if (tacticalStopInside15mStructure) score -= 12;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const findings = [
    tightStop ? `Tactical stop is tight at ${fmt(levels.riskPoints)} pts; use extra caution around noise/retest failure.` : null,
    wideStop ? `Wide protected stop at ${fmt(levels.riskPoints)} pts; better entry or pullback improves risk quality.` : null,
    extendedFromEntry ? `First aligned close was already ${fmt(extensionPoints)} pts (${fmt(extensionR)}R) beyond entry reference; missed/chase risk is live.` : null,
    !extendedFromEntry && poorEntryLocation ? `Entry was not ideal: first aligned close was ${fmt(extensionPoints)} pts (${fmt(extensionR)}R) beyond entry reference.` : null,
    sparseConfirmation ? `Only ${segment.count} confirming 5M bars; treat as early proof, not mature campaign structure.` : null,
    tacticalStopInside15mStructure ? `5M stop is inside wider 15M protected structure by ${fmt(fiveToFifteenStopGap)} pts; 15M failure line may matter more for bias.` : null,
    lateDayRunnerRisk ? 'Late-day campaign: manage faster and avoid assuming full runner delivery into the close.' : null,
    fridayRunnerRisk ? 'Friday/near-close runner risk: T2 or larger objectives may not have enough session time.' : null,
  ].filter((value): value is string => Boolean(value));

  const management = [
    betterEntryNeeded ? 'Prefer pullback/retest before treating the review map as actionable.' : 'Entry location acceptable for review if completed 5M proof/retest appears.',
    tightStop ? 'Do not use the tight 5M stop as proof of high quality by itself.' : null,
    wideStop ? 'Reduce expectations or wait for a tighter protected 5M structure before using full risk.' : null,
    extendedFromEntry ? 'If price already left the line, mark it missed/review instead of chasing.' : null,
    tacticalStopInside15mStructure ? 'Respect the wider 15M protected line as the bias-failure reference.' : null,
    lateDayRunnerRisk || fridayRunnerRisk ? 'Take T1 seriously; do not require T2/runner before market close.' : null,
  ].filter((value): value is string => Boolean(value));

  const label = qualityLabelFromScore(score);
  const scorecard = [
    scoreItem(`${segment.dir} Quality`, score, 100, `${label}. ${findings[0] || 'Protected 15M+5M structure is aligned.'}`),
    scoreItem('Entry Location', Math.max(0, 25 - Math.round(Math.max(0, extensionR) * 20)), 25, `Extension from entry: ${fmt(extensionPoints)} pts / ${fmt(extensionR)}R.`),
    scoreItem('Stop Quality', tightStop || wideStop ? 12 : 25, 25, `Risk width: ${fmt(levels.riskPoints)} pts.`),
    scoreItem('Confirmation Depth', sparseConfirmation ? 8 : 15, 15, `${segment.count} confirming completed 5M bars.`),
    scoreItem('Session Delivery', lateDayRunnerRisk || fridayRunnerRisk ? 8 : 15, 15, `${segment.start.slice(11, 16)}-${segment.end.slice(11, 16)} ET.`),
    scoreItem('HTF Protection', tacticalStopInside15mStructure ? 10 : 20, 20, tacticalStopInside15mStructure ? '5M stop is inside wider 15M structure.' : '5M stop and 15M structure are compatible.'),
  ];

  return {
    sourceOfTruth: 'phase_10l_protected_structure_trade_quality',
    label,
    score,
    summary: `${label.replace(/_/g, ' ')} ${score}/100`,
    flags: {
      tightStop,
      wideStop,
    extendedFromEntry,
      poorEntryLocation,
      betterEntryNeeded,
      sparseConfirmation,
      lateDayRunnerRisk,
      fridayRunnerRisk,
      tacticalStopInside15mStructure,
    },
    findings,
    management,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
    },
    scorecard,
  };
}

function chartCandlesForSegment(bars: NinjaBridgeBar[], segment: OverlaySegment): ChartCandleFact[] {
  const campaignStart = timeMs(segment.start);
  const start = Math.max(timeMs(`${segment.date}T09:00:00-04:00`), campaignStart - 60 * 60 * 1000);
  const end = timeMs(`${segment.date}T16:00:00-04:00`);
  return bars
    .filter((bar) => {
      const t = timeMs(bar.time);
      return t >= start && t <= end;
    })
    .map((bar, index) => {
      const range = Math.max(0.25, bar.high - bar.low);
      return {
        index,
        timestamp: normalizeBridgeTime(bar.time),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        direction: bar.close > bar.open ? 'bullish' : bar.close < bar.open ? 'bearish' : 'doji',
        confidence: 'High',
        bodyRatio: Math.abs(bar.close - bar.open) / range,
        closeLocation: (bar.close - bar.low) / range,
      };
    });
}

function candidateForSegment(segment: OverlaySegment, quality = buildProtectedStructureTradeQuality(segment)): SetupCandidate {
  const line = lineInSand(segment);
  const levels = reviewLevels(segment);
  return {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'Protected 15M + 5M Trend Confirmation',
    pathway: 'intraday_mss_micro_continuation',
    direction: segment.dir,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 7,
    entry: levels.entry,
    stop: levels.stop,
    target1: levels.target1,
    target2: levels.target2,
    riskPoints: levels.riskPoints,
    modelConfidenceScore: 78,
    decisionQualityScore: quality.score,
    decisionQualityScorecard: quality.scorecard,
    decisionQualityRecommendation: quality.management[0] || 'Review only. Wait for completed 5M proof and app-owned gates.',
    levelContextSummary: `${segment.dir} review map: 15M and 5M protected structure aligned. Quality: ${quality.summary}.`,
    invalidation: segment.dir === 'LONG'
      ? `Changes BEAR below protected structure ${fmt(line)}.`
      : `Changes BULL above protected structure ${fmt(line)}.`,
    evidence: [
      `5M ${segment.first.bias5.bias} confirm ${fmt(segment.first.bias5.confirm)} / protect ${fmt(segment.first.bias5.protect)}`,
      `15M ${segment.first.bias15.bias} confirm ${fmt(segment.first.bias15.confirm)} / protect ${fmt(segment.first.bias15.protect)}`,
      `First aligned close ${fmt(segment.first.close)} at ${segment.first.time}`,
      `Phase 10L quality: ${quality.summary}`,
      ...quality.findings,
    ],
    missingEvidence: ['Executable model trigger/retest still required by app gates.', ...quality.management],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M execution model trigger/retest; protected 5M stop; app risk/target/canExecute gates.',
    nextAction: `Review only. ${segment.dir} remains the desk direction while protected structure holds.`,
    reducedRiskPlan: null,
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: true,
      reason: 'Protected 15M+5M trend confirmation review map; not execution approval.',
    },
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'passed',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: segment.dir,
        lineInSand: line,
        lineReason: `${segment.dir} protected-structure line; bias changes if this level fails.`,
        requiredClose: segment.dir === 'LONG' ? `Hold above ${fmt(line)}` : `Hold below ${fmt(line)}`,
        obstacleType: null,
        obstacleSource: null,
        evidence: [],
        blockers: [],
      },
      timeframeMss: {
        applied: true,
        status: 'passed',
        required: 'aligned_confirmed_5m_mss',
        appliesToAllModels: true,
        affectsExecution: false,
        evidence: ['15M and 5M protected-structure bias aligned.'],
        blockers: [],
      },
    },
  };
}

function planVersionId(row: Pick<ReviewCampaignRow, 'date' | 'id' | 'direction'>): string {
  return `protected-structure-review-${row.date}-${String(row.id).padStart(2, '0')}-${row.direction.toLowerCase()}`;
}

function discordPayloadForRow(row: ReviewCampaignRow) {
  const title = `[PROTECTED STRUCTURE REVIEW] MES ${row.direction} #${row.id}`;
  const content = [
    `${title} | ${row.date} ${row.start.slice(11, 16)}-${row.end.slice(11, 16)} ET`,
    'Status: REVIEW ONLY - NOT EXECUTION APPROVAL',
    '',
    `${row.direction} review plan`,
    `Quality: ${row.quality.summary}`,
    `Entry ref: ${fmt(row.entry)}`,
    `Protected 5M stop: ${fmt(row.stop)}`,
    `Risk: ${fmt(row.riskPoints)} pts / $${fmt(row.oneContractRiskDollars)} per 1 MES`,
    `T1: ${fmt(row.target1)} / +$${fmt(row.oneContractT1Dollars)} per 1 MES`,
    `T2: ${fmt(row.target2)} / +$${fmt(row.oneContractT2Dollars)} per 1 MES`,
    '',
    `5M: ${row.bias5.bias} confirm ${fmt(row.bias5.confirm)} / protect ${fmt(row.bias5.protect)}`,
    `15M: ${row.bias15.bias} confirm ${fmt(row.bias15.confirm)} / protect ${fmt(row.bias15.protect)}`,
    `HTF line in sand: ${fmt(row.lineInSand)}`,
    ...(row.quality.findings.length ? ['', 'Quality flags:', ...row.quality.findings.slice(0, 3).map((item) => `- ${item}`)] : []),
    ...(row.quality.management.length ? ['', 'Management:', ...row.quality.management.slice(0, 3).map((item) => `- ${item}`)] : []),
    '',
    'Learning buttons record trader outcome only. They do not approve trades, place orders, or change rules.',
  ].join('\n');
  return {
    content,
    embeds: [
      {
        title,
        description: 'Protected 15M+5M trend confirmation review map. App-owned math, review only.',
        color: row.direction === 'LONG' ? 0x22c55e : 0xf97316,
        fields: [
          { name: 'Plan', value: `Entry ${fmt(row.entry)} | Stop ${fmt(row.stop)} | T1 ${fmt(row.target1)} | T2 ${fmt(row.target2)}`, inline: false },
          { name: '1 MES', value: `Risk $${fmt(row.oneContractRiskDollars)} | T1 +$${fmt(row.oneContractT1Dollars)} | T2 +$${fmt(row.oneContractT2Dollars)}`, inline: false },
          { name: '10L Quality', value: `${row.quality.summary}\n${row.quality.management.slice(0, 2).join('\n') || 'No added quality warnings.'}`, inline: false },
          { name: 'Boundary', value: 'Review only. canExecute unchanged. No automated orders.', inline: false },
        ],
        footer: { text: 'Quant Desk • Protected Structure Review • RAG learning buttons' },
        timestamp: new Date().toISOString(),
      },
    ],
    components: buildOutcomeComponents({
      planVersionId: planVersionId(row),
      sessionType: row.start.slice(11, 16) >= '12:00' ? 'lunch' : 'morning',
      tradeDate: row.date,
      instrument: 'MES',
      direction: row.direction,
    }),
  };
}

async function postDiscordReviewRow(row: ReviewCampaignRow, dryRun: boolean): Promise<string | null> {
  const payload = discordPayloadForRow(row);
  const files = row.chart ? [path.resolve(row.chart)] : [];
  if (dryRun) {
    console.log(JSON.stringify({ ...payload, files }, null, 2));
    return null;
  }
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is required to post protected-structure review charts.');
  await assertDiscordOutcomeEndpointSecretReady(payload.components);
  const url = discordWebhookUrlForPayload(webhookUrl, payload.components);
  const payloadWithImage = files[0] && payload.embeds[0]
    ? {
      ...payload,
      embeds: [
        {
          ...payload.embeds[0],
          image: { url: `attachment://${path.basename(files[0])}` },
        },
        ...payload.embeds.slice(1),
      ],
    }
    : payload;
  const response = files.length
    ? await (async () => {
      const form = new FormData();
      form.append('payload_json', JSON.stringify(payloadWithImage));
      for (const [index, file] of files.entries()) {
        const bytes = await fs.readFile(file);
        form.append(`files[${index}]`, new Blob([bytes], { type: 'image/png' }), path.basename(file));
      }
      return fetch(url, { method: 'POST', body: form });
    })()
    : await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithImage),
    });
  if (!response.ok) throw new Error(`Discord webhook failed (${response.status}).`);
  const bodyText = await response.text().catch(() => '');
  if (!bodyText.trim()) return null;
  try {
    const parsed = JSON.parse(bodyText);
    return typeof parsed?.id === 'string' ? parsed.id : null;
  } catch {
    return null;
  }
}

function chartContextForSegment(segment: OverlaySegment, bars: NinjaBridgeBar[]): Partial<ChartContext> {
  return {
    candles: chartCandlesForSegment(bars, segment),
    marketStructure: { trend: segment.dir === 'LONG' ? 'bullish' : 'bearish' } as any,
    multiTimeframeContext: {
      alignment: {
        alignedDirection: segment.dir,
        executionBias: segment.dir,
        macroBias: segment.dir,
        sessionBias: segment.dir,
        liquidityBias: segment.dir,
        conflicts: [],
        notes: ['Protected 15M and 5M structure aligned.'],
        summary: `${segment.dir} protected-structure alignment.`,
      },
    } as any,
    sessionStory: {
      summary: `${segment.dir} review map from protected 15M+5M structure.`,
    } as any,
  };
}

function markdownForReport(summary: {
  createdAt: string;
  instrument: string;
  bridgeInstrument: string;
  source: ReviewSourceSummary;
  totals: OverlayReport['totals'];
  campaigns: ReviewCampaignRow[];
}): string {
  const lines = [
    '# Protected Structure Trend Confirmation - Trade-by-Trade Review',
    '',
    `Created: ${summary.createdAt}`,
    `Instrument: ${summary.instrument} (${summary.bridgeInstrument})`,
    `5M candles: ${summary.source.bars5m} from ${summary.source.firstBar} to ${summary.source.lastBar}`,
    `Source: ${summary.source.source} (cache ${summary.source.cacheBars}, bridge ${summary.source.bridgeBars})`,
    'Boundary: review desk direction only; canExecute and execution gates unchanged.',
    '',
    `Totals: ${summary.totals.confirmed} aligned bars across ${summary.campaigns.length} distinct campaigns (${summary.totals.long} LONG bars / ${summary.totals.short} SHORT bars).`,
    '',
  ];
  for (const row of summary.campaigns) {
    lines.push(
      `## ${row.id}. ${row.date} ${row.direction} (${row.start.slice(11, 16)}-${row.end.slice(11, 16)} ET)`,
      `- Status: ${row.status}`,
      `- Confirmations: ${row.confirmations} completed 5M bars`,
      `- 10L quality: ${row.quality.summary}`,
      `- First aligned close: ${fmt(row.firstClose)}`,
      `- Line in the sand: ${fmt(row.lineInSand)}`,
      `- Entry ref: ${fmt(row.entry)}`,
      `- Protected 5M stop: ${fmt(row.stop)}`,
      `- Risk: ${fmt(row.riskPoints)} pts / $${fmt(row.oneContractRiskDollars)} per 1 MES`,
      `- T1: ${fmt(row.target1)} / +$${fmt(row.oneContractT1Dollars)} per 1 MES`,
      `- T2: ${fmt(row.target2)} / +$${fmt(row.oneContractT2Dollars)} per 1 MES`,
      `- 5M: ${row.bias5.bias} | confirm ${fmt(row.bias5.confirm)} | protected ${fmt(row.bias5.protect)}`,
      `- 15M: ${row.bias15.bias} | confirm ${fmt(row.bias15.confirm)} | protected ${fmt(row.bias15.protect)}`,
      `- Quality flags: ${row.quality.findings.length ? row.quality.findings.join(' ') : 'None.'}`,
      `- Management: ${row.quality.management.join(' ')}`,
      `- Chart: ${row.chart || 'not rendered'}`,
      `- Discord message id: ${row.discordMessageId || 'not posted'}`,
      '',
    );
  }
  return lines.join('\n');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeRawOhlcBar(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const hasTime = typeof value.time === 'string' || typeof value.timestamp === 'string';
  return hasTime
    && typeof value.open === 'number'
    && typeof value.high === 'number'
    && typeof value.low === 'number'
    && typeof value.close === 'number';
}

export function assertProtectedStructureReviewReportIsCompact(value: unknown, pathLabel = 'report'): void {
  if (Array.isArray(value)) {
    if (value.some(looksLikeRawOhlcBar)) {
      throw new Error(`Protected-structure review report must not include raw OHLC bars at ${pathLabel}.`);
    }
    value.forEach((entry, index) => assertProtectedStructureReviewReportIsCompact(entry, `${pathLabel}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${pathLabel}.${key}`;
    if (RAW_OHLC_KEYS.has(key) && child !== null && child !== undefined) {
      throw new Error(`Protected-structure review report must not include raw ${key} data at ${childPath}.`);
    }
    assertProtectedStructureReviewReportIsCompact(child, childPath);
  }
}

export async function generateProtectedStructureTradeReview(options: TradeReviewOptions = {}) {
  const overlayPath = path.resolve(options.overlayPath || DEFAULT_OVERLAY);
  const outputRoot = path.resolve(options.outputRoot || DEFAULT_OUTPUT_ROOT);
  const chartsDir = path.join(outputRoot, 'charts');
  const instrument = options.instrument || 'MES';
  const bridgeInstrument = options.bridgeInstrument || 'MES 06-26';
  const timeframe = options.timeframe || '5m';
  const marketTimeframe = options.marketTimeframe || '5m';
  const from = options.from || '2026-06-08T00:00:00-04:00';
  const to = options.to || '2026-06-12T16:00:00-04:00';
  const renderCharts = options.renderCharts !== false;
  const postDiscord = options.postDiscord === true;
  const dryRun = options.dryRun === true;

  const overlay = JSON.parse(await fs.readFile(overlayPath, 'utf8')) as OverlayReport;
  const loaded = await loadReviewBars({ bridgeInstrument, timeframe, marketTimeframe, from, to });
  if (!loaded.bars.length) throw new Error('Protected-structure trade review could not load market bars from market_bars or NinjaTrader bridge.');

  await fs.mkdir(outputRoot, { recursive: true });
  if (renderCharts) {
    await fs.rm(chartsDir, { recursive: true, force: true });
    await fs.mkdir(chartsDir, { recursive: true });
  }

  const campaigns: ReviewCampaignRow[] = [];
  for (let index = 0; index < overlay.segments.length; index += 1) {
    const segment = overlay.segments[index];
    const line = lineInSand(segment);
    const levels = reviewLevels(segment);
    const quality = buildProtectedStructureTradeQuality(segment, levels);
    const chart = renderCharts
      ? await renderChartMarkup({
        chartContext: chartContextForSegment(segment, loaded.chartBars),
        candidate: candidateForSegment(segment, quality),
        instrument,
        tradeDate: segment.date,
        sessionLabel: 'Morning Desk Review',
        renderMode: 'desk_play_context',
        contextLine: line,
        contextLabel: `${segment.dir} line`,
        outputDir: chartsDir,
        filePrefix: `${String(index + 1).padStart(2, '0')}-${segment.date}-${segment.dir.toLowerCase()}-${segment.start.slice(11, 16).replace(':', '')}`,
      })
      : null;
    const row: ReviewCampaignRow = {
      id: index + 1,
      date: segment.date,
      direction: segment.dir,
      start: segment.start,
      end: segment.end,
      confirmations: segment.count,
      firstClose: segment.first.close,
      lineInSand: line,
      ...levels,
      bias5: segment.first.bias5,
      bias15: segment.first.bias15,
      quality,
      status: 'REVIEW ONLY - not execution approval',
      chart: chart ? path.relative(process.cwd(), chart) : null,
      discordMessageId: null,
    };
    if (postDiscord) {
      row.discordMessageId = await postDiscordReviewRow(row, dryRun);
    }
    campaigns.push(row);
  }

  const source: ReviewSourceSummary = {
    bars5m: loaded.bars.length,
    cacheBars: loaded.cacheBars,
    bridgeBars: loaded.bridgeBars,
    source: loaded.source,
    cacheUnavailableReason: loaded.cacheUnavailableReason,
    firstBar: loaded.bars[0]?.time || null,
    lastBar: loaded.bars[loaded.bars.length - 1]?.time || null,
  };
  const summary = {
    reportType: 'protected_structure_trend_confirmation_trade_by_trade_review',
    createdAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    source,
    ruleBoundary: 'Protected 15M+5M alignment produces review desk direction only; canExecute and execution gates unchanged.',
    totals: overlay.totals,
    campaigns,
  };
  assertProtectedStructureReviewReportIsCompact(summary);
  const jsonPath = path.join(outputRoot, 'trade-by-trade-review.json');
  const markdownPath = path.join(outputRoot, 'trade-by-trade-review.md');
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2));
  await fs.writeFile(markdownPath, markdownForReport({
    createdAt: summary.createdAt,
    instrument,
    bridgeInstrument,
    source,
    totals: overlay.totals,
    campaigns,
  }));
  return {
    outputRoot,
    jsonPath,
    markdownPath,
    campaigns: campaigns.length,
    charts: campaigns.filter((row) => row.chart).length,
    discordPosted: campaigns.filter((row) => row.discordMessageId).length,
    discordDryRun: postDiscord && dryRun,
    source,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  generateProtectedStructureTradeReview(parseArgs(process.argv.slice(2)))
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
