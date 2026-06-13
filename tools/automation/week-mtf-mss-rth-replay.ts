import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';
import { buildTimeframeMssEvidence } from '../../src/lib/timeframeMssEvidence';
import type { BridgeBarTimestampMode, BridgeBarTimeZoneMode, MssEvidenceTimeframe, TimeframeMssEvidence } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
const DEFAULT_JSON = join(REPORT_DIR, 'week-mtf-mss-rth-replay-2026-06-01-to-2026-06-05.json');
const DEFAULT_MD = join(REPORT_DIR, 'week-mtf-mss-rth-replay-2026-06-01-to-2026-06-05.md');

type TimeframeKey = '5m' | '15m' | '60m' | '120m' | '240m';

const TIMEFRAMES: Array<{ bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; evidence: MssEvidenceTimeframe }> = [
  { bridge: '5m', market: '5m', evidence: '5M' },
  { bridge: '15m', market: '15m', evidence: '15M' },
  { bridge: '60m', market: '60m', evidence: '60M' },
  { bridge: '120m', market: '120m', evidence: '120M' },
  { bridge: '240m', market: '240m', evidence: '240M' },
];

const PRELOAD_FROM = '2026-05-02T00:00:00-04:00';
const RTH_FROM = '2026-06-01T09:30:00-04:00';
const RTH_TO = '2026-06-05T16:00:00-04:00';
const TRADE_DATES = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];
const BAR_TIMESTAMP_MODE: BridgeBarTimestampMode = 'open';
const BAR_TIME_ZONE: BridgeBarTimeZoneMode = 'eastern';

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function timestampMs(value: string): number {
  return parseBridgeTime(value, BAR_TIME_ZONE)?.getTime() ?? Number.NaN;
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function validBar(bar: NinjaBridgeBar): boolean {
  return Boolean(
    bar &&
    typeof bar.time === 'string' &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close),
  );
}

function mergeBars(...sources: NinjaBridgeBar[][]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  for (const source of sources) {
    for (const bar of source) {
      if (validBar(bar)) byTime.set(normalizeTime(bar.time), { ...bar, time: normalizeTime(bar.time) });
    }
  }
  return [...byTime.values()].sort((a, b) => timestampMs(a.time) - timestampMs(b.time));
}

function dateOnly(value: string): string | null {
  return normalizeTime(value).slice(0, 10) || null;
}

function minutesEt(value: string): number | null {
  const match = normalizeTime(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isRthWeekTimestamp(value: string): boolean {
  const date = dateOnly(value);
  const minutes = minutesEt(value);
  return Boolean(date && TRADE_DATES.includes(date) && minutes !== null && minutes >= 9 * 60 + 30 && minutes <= 16 * 60);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function eachBridgeFetchDate(): string[] {
  const dates: string[] = [];
  for (let cursor = '2026-05-02'; cursor <= '2026-06-05'; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

async function fetchBridgeSegmented(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const chunks: NinjaBridgeBar[][] = [];
  const failures: string[] = [];
  let requests = 0;

  for (const date of eachBridgeFetchDate()) {
    const from = `${date}T00:00:00-04:00`;
    const to = date === '2026-06-05' ? RTH_TO : `${addDays(date, 1)}T00:00:00-04:00`;
    requests += 1;
    try {
      const response = await getNinjaHistoricalBars({
        instrument: args.bridgeInstrument,
        timeframe: args.timeframe,
        from,
        to,
        limit: 5000,
        baseUrl: args.bridgeUrl,
      });
      if (!response.ok) {
        failures.push(`${args.timeframe} ${from} to ${to}: ${response.error || 'bridge returned not ok'}`);
        continue;
      }
      chunks.push(response.bars || []);
    } catch (error) {
      failures.push(`${args.timeframe} ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { bars: mergeBars(...chunks), requests, failures };
}

async function loadTimeframeBars(args: {
  bridgeUrl: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: typeof TIMEFRAMES[number];
}) {
  const config = loadMarketDataConfig();
  const cached = config
    ? await fetchCachedMarketBars({
      instrument: args.bridgeInstrument,
      timeframe: args.timeframe.market,
      from: PRELOAD_FROM,
      to: RTH_TO,
      config,
      limit: 20000,
    }).catch(() => [])
    : [];

  const bridge = await fetchBridgeSegmented({
    bridgeUrl: args.bridgeUrl,
    bridgeInstrument: args.bridgeInstrument,
    timeframe: args.timeframe.bridge,
  });

  if (config && bridge.bars.length) {
    await upsertMarketBars({
      bars: bridge.bars,
      instrument: args.instrument,
      bridgeInstrument: args.bridgeInstrument,
      timeframe: args.timeframe.market,
      config,
    }).catch(() => ({ upserted: 0 }));
  }

  const bars = bridge.bars.length ? mergeBars(bridge.bars) : mergeBars(cached);
  return {
    timeframe: args.timeframe.market as TimeframeKey,
    evidenceTimeframe: args.timeframe.evidence,
    bars,
    cacheBars: cached.length,
    bridgeBars: bridge.bars.length,
    bridgeRequests: bridge.requests,
    bridgeFailures: bridge.failures,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
    source: cached.length && bridge.bars.length ? 'market_bars_read_ninjatrader_repair_preferred' : bridge.bars.length ? 'ninjatrader_historical_bars' : cached.length ? 'market_bars' : 'missing',
  };
}

function scanEvents(timeframe: MssEvidenceTimeframe, bars: NinjaBridgeBar[]) {
  const confirmed: TimeframeMssEvidence[] = [];
  const displacementOnly: TimeframeMssEvidence[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < bars.length; index += 1) {
    const asOf = bars[index].time;
    if (!isRthWeekTimestamp(asOf)) continue;
    const evidence = buildTimeframeMssEvidence({
      timeframe,
      bars: bars.slice(0, index + 1),
      asOfTimestamp: asOf,
      barTimestampMode: BAR_TIMESTAMP_MODE,
      barTimeZone: BAR_TIME_ZONE,
    });
    if (normalizeTime(evidence.evidenceTimestamp || '') !== normalizeTime(asOf)) continue;
    const key = `${evidence.timeframe}|${evidence.status}|${evidence.direction}|${normalizeTime(evidence.evidenceTimestamp || '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (evidence.status === 'confirmed_mss') confirmed.push(evidence);
    if (evidence.status === 'displacement_without_mss') displacementOnly.push(evidence);
  }

  return { confirmed, displacementOnly };
}

function legacyRange(bar: NinjaBridgeBar): number {
  return Math.max(0, bar.high - bar.low);
}

function legacyBody(bar: NinjaBridgeBar): number {
  return Math.abs(bar.close - bar.open);
}

function legacyAverage(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function legacyRoundRatio(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100;
}

function legacyClampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function legacyDisplacementDirection(bar: NinjaBridgeBar): 'bullish' | 'bearish' | null {
  if (bar.close > bar.open) return 'bullish';
  if (bar.close < bar.open) return 'bearish';
  return null;
}

function legacyDisplacementQuality(bars: NinjaBridgeBar[], index: number): TimeframeMssEvidence['displacementQuality'] {
  const bar = bars[index];
  const candleRange = bar ? legacyRange(bar) : 0;
  const direction = bar ? legacyDisplacementDirection(bar) : null;
  if (!bar || !direction || candleRange <= 0) {
    return { present: false, direction: null, score: 0, bodyToRange: null, closeLocation: null, rangeExpansion: null };
  }

  const bodyToRange = legacyBody(bar) / candleRange;
  const closeLocation = direction === 'bullish'
    ? (bar.close - bar.low) / candleRange
    : (bar.high - bar.close) / candleRange;
  const avgRange = legacyAverage(bars.slice(Math.max(0, index - 8), index).map(legacyRange).filter((value) => value > 0));
  const rangeExpansion = avgRange > 0 ? candleRange / avgRange : 1;
  const score = legacyClampScore((bodyToRange * 45) + (closeLocation * 35) + (Math.min(rangeExpansion, 2) / 2 * 20));
  return {
    present: bodyToRange >= 0.5 && closeLocation >= 0.65 && rangeExpansion >= 1.15,
    direction,
    score,
    bodyToRange: legacyRoundRatio(bodyToRange),
    closeLocation: legacyRoundRatio(closeLocation),
    rangeExpansion: legacyRoundRatio(rangeExpansion),
  };
}

function legacyPriorStructureLevel(bars: NinjaBridgeBar[], index: number, direction: 'bullish' | 'bearish'): number | null {
  const prior = bars.slice(Math.max(0, index - 6), index);
  if (prior.length < 2) return null;
  return direction === 'bullish'
    ? Math.max(...prior.map((bar) => bar.high))
    : Math.min(...prior.map((bar) => bar.low));
}

function legacyEvidenceRow(timeframe: MssEvidenceTimeframe, bars: NinjaBridgeBar[], index: number): Record<string, unknown> | null {
  const quality = legacyDisplacementQuality(bars, index);
  if (!quality.present || !quality.direction) return null;
  const direction = quality.direction;
  const level = legacyPriorStructureLevel(bars, index, direction);
  const didBreakStructure = level !== null && (direction === 'bullish' ? bars[index].close > level : bars[index].close < level);
  return {
    timeframe,
    direction,
    status: didBreakStructure ? 'confirmed_mss' : 'displacement_without_mss',
    evidenceTimestamp: bars[index].time,
    completedBarStatus: 'completed',
    displacementScore: quality.score,
    bodyToRange: quality.bodyToRange,
    closeLocation: quality.closeLocation,
    rangeExpansion: quality.rangeExpansion,
    breaksStructure: didBreakStructure,
    confidence: legacyClampScore(quality.score + (didBreakStructure ? 10 : -10)),
    blockers: didBreakStructure ? [] : [`${timeframe}: legacy heuristic displacement detected, but close did not break recent prior range.`],
  };
}

function scanLegacyHeuristicEvents(timeframe: MssEvidenceTimeframe, bars: NinjaBridgeBar[]) {
  const confirmedMss: Record<string, unknown>[] = [];
  const displacementWithoutMss: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < bars.length; index += 1) {
    const asOf = bars[index].time;
    if (!isRthWeekTimestamp(asOf)) continue;
    const row = legacyEvidenceRow(timeframe, bars.slice(0, index + 1), index);
    if (!row) continue;
    const key = `${row.timeframe}|${row.status}|${row.direction}|${normalizeTime(String(row.evidenceTimestamp || ''))}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (row.status === 'confirmed_mss') confirmedMss.push(row);
    if (row.status === 'displacement_without_mss') displacementWithoutMss.push(row);
  }
  return { confirmedMss, displacementWithoutMss };
}

function evidenceRow(item: TimeframeMssEvidence): Record<string, unknown> {
  return {
    timeframe: item.timeframe,
    direction: item.direction,
    status: item.status,
    evidenceTimestamp: item.evidenceTimestamp,
    completedBarStatus: item.completedBarStatus,
    displacementScore: item.displacementQuality.score,
    bodyToRange: item.displacementQuality.bodyToRange,
    closeLocation: item.displacementQuality.closeLocation,
    rangeExpansion: item.displacementQuality.rangeExpansion,
    breaksStructure: item.breaksStructure,
    structureBreak: item.structureBreak || null,
    confidence: item.confidence,
    blockers: item.blockers,
  };
}

function eventKey(event: Record<string, unknown>): string {
  return `${event.timeframe}|${event.evidenceTimestamp}|${event.direction}|${event.status}`;
}

function compareLegacyToStructural(legacyEvents: any[], structuralEvents: any[]) {
  return legacyEvents.map((legacy) => {
    const structural = structuralEvents.find((item) => item.timeframe === legacy.timeframe) || { confirmedMss: [], displacementWithoutMss: [] };
    const legacyConfirmedKeys = new Set(legacy.confirmedMss.map(eventKey));
    const structuralConfirmedKeys = new Set(structural.confirmedMss.map(eventKey));
    return {
      timeframe: legacy.timeframe,
      legacyConfirmedMss: legacy.confirmedMss.length,
      structuralConfirmedMss: structural.confirmedMss.length,
      confirmedDelta: structural.confirmedMss.length - legacy.confirmedMss.length,
      legacyDisplacementWithoutMss: legacy.displacementWithoutMss.length,
      structuralDisplacementWithoutMss: structural.displacementWithoutMss.length,
      displacementDelta: structural.displacementWithoutMss.length - legacy.displacementWithoutMss.length,
      legacyOnlyConfirmedMss: legacy.confirmedMss.filter((event: Record<string, unknown>) => !structuralConfirmedKeys.has(eventKey(event))),
      structuralOnlyConfirmedMss: structural.confirmedMss.filter((event: Record<string, unknown>) => !legacyConfirmedKeys.has(eventKey(event))),
    };
  });
}

function isAcceptedStructuralOnlyPromotion(event: Record<string, unknown>): boolean {
  const structureBreak = event.structureBreak as Record<string, unknown> | null | undefined;
  const direction = event.direction;
  const priorDirection = structureBreak?.priorStructureDirection;
  const expectedPrior = direction === 'bullish' ? 'bearish' : direction === 'bearish' ? 'bullish' : null;
  return Boolean(
    event.status === 'confirmed_mss' &&
    event.breaksStructure === true &&
    structureBreak?.type === 'mss' &&
    Number.isFinite(structureBreak.brokenLevel) &&
    typeof structureBreak.brokenSwingTimestamp === 'string' &&
    priorDirection === expectedPrior,
  );
}

function buildActiveRuleAcceptanceReview(comparison: any[]) {
  const timeframeReviews = comparison.map((item) => {
    const structuralOnlyAccepted = item.structuralOnlyConfirmedMss.filter(isAcceptedStructuralOnlyPromotion);
    const structuralOnlyNeedsReview = item.structuralOnlyConfirmedMss.filter((event: Record<string, unknown>) => !isAcceptedStructuralOnlyPromotion(event));
    return {
      timeframe: item.timeframe,
      legacyOnlyConfirmedMss: item.legacyOnlyConfirmedMss.length,
      legacyOnlyIntentionalDemotions: item.legacyOnlyConfirmedMss.length,
      structuralOnlyConfirmedMss: item.structuralOnlyConfirmedMss.length,
      structuralOnlyAcceptedPromotions: structuralOnlyAccepted.length,
      structuralOnlyNeedsReview: structuralOnlyNeedsReview.length,
      accepted: structuralOnlyNeedsReview.length === 0,
      rationale: [
        'legacy_only_demotions_lacked_completed_close_through_confirmed_opposite_swing_structure',
        'structural_only_promotions_required_structureBreak_type_mss_and_opposite_prior_swing_direction',
      ],
      needsReviewEvents: structuralOnlyNeedsReview,
    };
  });
  const totals = timeframeReviews.reduce(
    (sum, item) => ({
      legacyOnlyIntentionalDemotions: sum.legacyOnlyIntentionalDemotions + item.legacyOnlyIntentionalDemotions,
      structuralOnlyAcceptedPromotions: sum.structuralOnlyAcceptedPromotions + item.structuralOnlyAcceptedPromotions,
      structuralOnlyNeedsReview: sum.structuralOnlyNeedsReview + item.structuralOnlyNeedsReview,
    }),
    { legacyOnlyIntentionalDemotions: 0, structuralOnlyAcceptedPromotions: 0, structuralOnlyNeedsReview: 0 },
  );
  const activeRuleImpactAccepted = totals.structuralOnlyNeedsReview === 0;
  return {
    status: activeRuleImpactAccepted ? 'accepted_for_active_ruleset' : 'needs_human_review',
    activeRuleImpactAccepted,
    reviewedAt: new Date().toISOString(),
    reviewBasis: [
      'Legacy-only confirmed MSS events are intentional active-rule demotions because they were confirmed by the recent-range displacement heuristic but not by completed close-through of confirmed swing structure with opposite prior swing direction.',
      'Structural-only confirmed MSS events are accepted only when structureBreak.type is mss, breaksStructure is true, the broken swing level is present, and the prior swing structure direction is opposite the MSS direction.',
      'Displacement remains quality/supporting evidence. A structural MSS with weak displacement is accepted as MSS evidence with lower confidence, not as standalone trade approval.',
      'No narrative, screenshots, Gemini text, Discord text, or manual OHLC reconstruction was used.',
    ],
    totals,
    timeframeReviews,
  };
}

function renderMarkdown(report: any): string {
  const confirmed = report.mssEvents.flatMap((entry: any) => entry.confirmedMss.map((event: any) => ({ timeframe: entry.timeframe, ...event })));
  const displacementOnly = report.mssEvents.flatMap((entry: any) => entry.displacementWithoutMss.map((event: any) => ({ timeframe: entry.timeframe, ...event })));
  const comparison = report.legacyHeuristicComparison || [];
  const acceptance = report.activeRuleAcceptanceReview || null;
  const acceptanceTotals = acceptance?.totals || {};
  return [
    '# Week Multi-Timeframe MSS RTH Replay',
    '',
    `Instrument: ${report.instrument} (${report.bridgeInstrument})`,
    `Window: ${report.window.rthFrom} to ${report.window.rthTo}`,
    `Preload: ${report.window.preloadFrom} to ${report.window.rthTo}`,
    `Data boundary: ${report.boundary}`,
    `Timestamp mode: ${report.timestampMode.timeZone}/${report.timestampMode.barTimestampMode}`,
    '',
    '## Data Coverage',
    '| Timeframe | Source | Bars | Cache | Bridge | Range Start | Range End | Bridge Failures |',
    '|---|---|---:|---:|---:|---|---|---:|',
    ...report.coverage.map((item: any) => `| ${item.timeframe} | ${item.source} | ${item.barsLoaded} | ${item.cacheBars} | ${item.bridgeBars} | ${item.rangeStart || 'N/A'} | ${item.rangeEnd || 'N/A'} | ${item.bridgeFailures.length} |`),
    '',
    '## Confirmed MSS Events',
    confirmed.length
      ? '| Timeframe | Time | Direction | Score | Body/Range | Close Location | Range Expansion | Confidence |'
      : 'No confirmed MSS events found inside the requested RTH window.',
    ...(confirmed.length ? [
      '|---|---|---|---:|---:|---:|---:|---:|',
      ...confirmed.map((item: any) => `| ${item.timeframe} | ${item.evidenceTimestamp} | ${item.direction} | ${item.displacementScore} | ${item.bodyToRange ?? 'N/A'} | ${item.closeLocation ?? 'N/A'} | ${item.rangeExpansion ?? 'N/A'} | ${item.confidence} |`),
    ] : []),
    '',
    '## Displacement Without MSS',
    displacementOnly.length
      ? '| Timeframe | Time | Direction | Score | Blockers |'
      : 'No displacement-without-MSS events found inside the requested RTH window.',
    ...(displacementOnly.length ? [
      '|---|---|---|---:|---|',
      ...displacementOnly.map((item: any) => `| ${item.timeframe} | ${item.evidenceTimestamp} | ${item.direction} | ${item.displacementScore} | ${(item.blockers || []).join(' ') || 'N/A'} |`),
    ] : []),
    '',
    '## Legacy Heuristic vs Swing-Structure Comparison',
    '| Timeframe | Legacy Confirmed | Structural Confirmed | Delta | Legacy Disp Only | Structural Disp Only | Delta |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...comparison.map((item: any) => `| ${item.timeframe} | ${item.legacyConfirmedMss} | ${item.structuralConfirmedMss} | ${item.confirmedDelta} | ${item.legacyDisplacementWithoutMss} | ${item.structuralDisplacementWithoutMss} | ${item.displacementDelta} |`),
    '',
    'Structural-only confirmed MSS events are listed in the JSON report under `legacyHeuristicComparison[].structuralOnlyConfirmedMss`.',
    'Legacy-only confirmed MSS events are listed in the JSON report under `legacyHeuristicComparison[].legacyOnlyConfirmedMss`.',
    '',
    '## Active Rule Acceptance Review',
    `Status: ${acceptance?.status || 'not_reviewed'}`,
    `Active-rule impact accepted: ${acceptance?.activeRuleImpactAccepted === true ? 'Yes' : 'No'}`,
    `Legacy-only intentional demotions: ${acceptanceTotals.legacyOnlyIntentionalDemotions ?? 0}`,
    `Structural-only accepted promotions: ${acceptanceTotals.structuralOnlyAcceptedPromotions ?? 0}`,
    `Unresolved structural-only review events: ${acceptanceTotals.structuralOnlyNeedsReview ?? 0}`,
    '',
    '| Timeframe | Legacy-Only Intentional Demotions | Structural-Only Accepted Promotions | Unresolved Review Events |',
    '|---|---:|---:|---:|',
    ...((acceptance?.timeframeReviews || []).map((item: any) => `| ${item.timeframe} | ${item.legacyOnlyIntentionalDemotions} | ${item.structuralOnlyAcceptedPromotions} | ${item.structuralOnlyNeedsReview} |`)),
    '',
    'Review basis: legacy-only events are accepted as intentional demotions because they did not meet completed swing-structure MSS. Structural-only events are accepted only when the explicit structureBreak audit proves a completed close-through MSS against opposite prior swing structure.',
    '',
    '## Authority',
    '- OHLC-derived evidence only.',
    '- No screenshot or narrative reconstruction was used.',
    '- This replay does not approve trades, change scanner behavior, post to Discord, or place orders.',
  ].join('\n');
}

async function main() {
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const instrument = argValue('instrument') || 'MES';
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const jsonPath = resolve(argValue('json') || DEFAULT_JSON);
  const mdPath = resolve(argValue('md') || DEFAULT_MD);

  mkdirSync(REPORT_DIR, { recursive: true });

  const loaded = [];
  for (const timeframe of TIMEFRAMES) {
    loaded.push(await loadTimeframeBars({ bridgeUrl, instrument, bridgeInstrument, timeframe }));
  }

  const mssEvents = loaded.map((item) => {
    const events = scanEvents(item.evidenceTimeframe, item.bars);
    return {
      timeframe: item.evidenceTimeframe,
      confirmedMss: events.confirmed.map(evidenceRow),
      displacementWithoutMss: events.displacementOnly.map(evidenceRow),
    };
  });
  const legacyHeuristicEvents = loaded.map((item) => ({
    timeframe: item.evidenceTimeframe,
    ...scanLegacyHeuristicEvents(item.evidenceTimeframe, item.bars),
  }));
  const legacyHeuristicComparison = compareLegacyToStructural(legacyHeuristicEvents, mssEvents);
  const activeRuleAcceptanceReview = buildActiveRuleAcceptanceReview(legacyHeuristicComparison);

  const report = {
    reportType: 'week_mtf_mss_rth_replay',
    createdAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    bridgeUrl,
    window: {
      rthFrom: RTH_FROM,
      rthTo: RTH_TO,
      preloadFrom: PRELOAD_FROM,
      tradeDates: TRADE_DATES,
      rthSession: '09:30-16:00 America/New_York',
    },
    timestampMode: {
      barTimestampMode: BAR_TIMESTAMP_MODE,
      timeZone: BAR_TIME_ZONE,
    },
    boundary: 'ohlc_replay_only_not_trade_approval',
    sourcePolicy: {
      readMarketBarsFirst: true,
      repairFromNinjaTraderHistoricalBars: true,
      narrativeFallbackUsed: false,
      screenshotFallbackUsed: false,
    },
    coverage: loaded.map((item) => ({
      timeframe: item.evidenceTimeframe,
      source: item.source,
      barsLoaded: item.bars.length,
      cacheBars: item.cacheBars,
      bridgeBars: item.bridgeBars,
      bridgeRequests: item.bridgeRequests,
      rangeStart: item.rangeStart,
      rangeEnd: item.rangeEnd,
      bridgeFailures: item.bridgeFailures,
    })),
    mssEvents,
    legacyHeuristicEvents,
    legacyHeuristicComparison,
    activeRuleAcceptanceReview,
    totals: {
      confirmedMss: mssEvents.reduce((sum, item) => sum + item.confirmedMss.length, 0),
      displacementWithoutMss: mssEvents.reduce((sum, item) => sum + item.displacementWithoutMss.length, 0),
      legacyConfirmedMss: legacyHeuristicEvents.reduce((sum, item) => sum + item.confirmedMss.length, 0),
      legacyDisplacementWithoutMss: legacyHeuristicEvents.reduce((sum, item) => sum + item.displacementWithoutMss.length, 0),
    },
    authority: {
      changesTradeLogic: false,
      approvesExecution: false,
      changesScannerBehavior: false,
      changesBridgeBehavior: false,
      changesDiscordBehavior: false,
    },
  };

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, `${renderMarkdown(report)}\n`);

  console.log(`Week MTF MSS replay complete: confirmedMss=${report.totals.confirmedMss}, displacementWithoutMss=${report.totals.displacementWithoutMss}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
