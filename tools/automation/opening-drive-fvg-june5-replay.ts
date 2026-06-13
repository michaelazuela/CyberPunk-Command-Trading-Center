import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { normalizeTradePlan } from '../../src/lib/tradePlan';
import { SetupType, TradeDecisionStatus, type AnalysisResult, type ChartContext } from '../../src/types';
import { compactDiscordSummary } from './discord-alert-format';
import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe } from './market-data-store';
import {
  buildMultiTimeframeCampaignEvidence,
  findFirstFiveMinuteCampaignStructureTrigger,
  type CampaignCoverageFact,
} from '../../src/lib/multiTimeframeCampaignEvidence';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type TimeframeKey = '5m' | '15m' | '60m' | '120m' | '240m';

const REPORT_JSON = resolve('tools/automation/replay-diagnostics/june-5-opening-drive-fvg-current-code-replay.json');
const REPORT_MD = resolve('tools/automation/replay-diagnostics/june-5-opening-drive-fvg-current-code-replay.md');
const TIMEFRAMES: Array<{ bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; key: TimeframeKey }> = [
  { bridge: '5m', market: '5m', key: '5m' },
  { bridge: '15m', market: '15m', key: '15m' },
  { bridge: '60m', market: '60m', key: '60m' },
  { bridge: '120m', market: '120m', key: '120m' },
  { bridge: '240m', market: '240m', key: '240m' },
];

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string): number {
  return new Date(`${normalizeTime(value)}-04:00`).getTime();
}

function minutesEt(value: string): number | null {
  const match = normalizeTime(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

async function fetchBridgeSegmented(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  fromDate: string;
  toDate: string;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const bars: NinjaBridgeBar[] = [];
  const failures: string[] = [];
  let requests = 0;
  for (let date = args.fromDate; date <= args.toDate; date = addDays(date, 1)) {
    const nextDate = addDays(date, 1);
    const from = `${date}T00:00:00-04:00`;
    const to = nextDate > args.toDate ? `${args.toDate}T16:00:00-04:00` : `${nextDate}T00:00:00-04:00`;
    requests += 1;
    try {
      const response = await getNinjaHistoricalBars({
        instrument: args.bridgeInstrument,
        timeframe: args.timeframe,
        from,
        to,
        limit: 2000,
        baseUrl: args.bridgeUrl,
      });
      if (response.ok && Array.isArray(response.bars)) bars.push(...response.bars);
      else failures.push(`${args.timeframe} ${from} to ${to}: ${response.error || 'bridge returned not ok'}`);
    } catch (error) {
      failures.push(`${args.timeframe} ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { bars: mergeBars(bars), requests, failures };
}

async function loadTimeframe(args: {
  bridgeUrl: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: { bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; key: TimeframeKey };
  preloadDate: string;
  tradeDate: string;
}) {
  const from = `${args.preloadDate}T00:00:00-04:00`;
  const to = `${args.tradeDate}T16:00:00-04:00`;
  const config = loadMarketDataConfig();
  const cached = config
    ? await fetchCachedMarketBars({
      instrument: args.bridgeInstrument,
      timeframe: args.timeframe.market,
      from,
      to,
      config,
      limit: 12000,
    }).catch(() => [])
    : [];
  const bridge = await fetchBridgeSegmented({
    bridgeUrl: args.bridgeUrl,
    bridgeInstrument: args.bridgeInstrument,
    timeframe: args.timeframe.bridge,
    fromDate: args.preloadDate,
    toDate: args.tradeDate,
  });
  const bars = mergeBars(cached, bridge.bars);
  return {
    timeframe: args.timeframe.key,
    bars,
    cacheBars: cached.length,
    bridgeBars: bridge.bars.length,
    bridgeRequests: bridge.requests,
    bridgeFailures: bridge.failures,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
    source: cached.length && bridge.bars.length ? 'market_bars_read_ninjatrader_repair' : bridge.bars.length ? 'ninjatrader_historical_bars' : cached.length ? 'market_bars' : 'missing',
  };
}

function through(bars: NinjaBridgeBar[], timestamp: string): NinjaBridgeBar[] {
  const end = timeMs(timestamp);
  return bars.filter((bar) => timeMs(bar.time) <= end);
}

function sameDateThrough(bars: NinjaBridgeBar[], timestamp: string): NinjaBridgeBar[] {
  const date = normalizeTime(timestamp).slice(0, 10);
  return through(bars, timestamp).filter((bar) => normalizeTime(bar.time).slice(0, 10) === date);
}

function sameDateRange(bars: NinjaBridgeBar[], tradeDate: string, endTimestamp: string): NinjaBridgeBar[] {
  const end = timeMs(endTimestamp);
  return bars.filter((bar) => normalizeTime(bar.time).slice(0, 10) === tradeDate && timeMs(bar.time) <= end);
}

function campaignTimeframeKey(timeframe: TimeframeKey): CampaignCoverageFact['timeframe'] {
  if (timeframe === '5m') return '5M';
  if (timeframe === '15m') return '15M';
  if (timeframe === '60m') return '60M';
  if (timeframe === '120m') return '120M';
  return '240M';
}

function campaignCoverageFacts(args: {
  loaded: Array<{ timeframe: TimeframeKey; bars: NinjaBridgeBar[] }>;
  asOfTimestamp: string;
  preloadDate: string;
}): CampaignCoverageFact[] {
  const preloadStart = timeMs(`${args.preloadDate}T00:00:00`);
  const asOf = timeMs(args.asOfTimestamp);
  return args.loaded.map((item) => {
    const bars = through(item.bars, args.asOfTimestamp);
    const rangeStart = bars[0]?.time || null;
    const rangeEnd = bars[bars.length - 1]?.time || null;
    const sufficient = Boolean(bars.length && rangeStart && rangeEnd && timeMs(rangeStart) <= preloadStart && timeMs(rangeEnd) <= asOf);
    return {
      timeframe: campaignTimeframeKey(item.timeframe),
      barsLoaded: bars.length,
      rangeStart,
      rangeEnd,
      sufficient,
      minimumExpected: `30 calendar days through ${normalizeTime(args.asOfTimestamp)}`,
    };
  });
}

function analysisForContext(context: ChartContext): AnalysisResult {
  return {
    dayType: context.htfLiquidityDrawState?.planDirection === 'SHORT' ? 'SHORT' : context.htfLiquidityDrawState?.planDirection === 'LONG' ? 'LONG' : 'NO TRADE',
    reasoning: 'Slim Opening Drive FVG OHLC replay. Existing scanner and final pipeline decide plan state.',
    confidence: 0.7,
    checks: [{ label: 'NinjaTrader OHLC imported', passed: true }],
    structuredChartContext: context,
    current_rule_analysis: {
      summary: 'Replay context from NinjaTrader OHLC. Not a live alert and not broker execution.',
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_REPLAY',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'PENDING_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
  };
}

function candidateSummary(candidate: any) {
  if (!candidate) return null;
  return {
    setupType: candidate.setupType,
    scenarioLabel: candidate.scenarioLabel,
    pathway: candidate.pathway,
    direction: candidate.direction,
    executionStatus: candidate.executionStatus,
    candidateState: candidate.candidateState,
    humanReview: candidate.humanReview || null,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    blockReason: candidate.blockReason,
    modelConfidenceScore: candidate.modelConfidenceScore,
    evidence: (candidate.evidence || []).slice(0, 14),
    missingEvidence: (candidate.missingEvidence || []).slice(0, 14),
    requiredTrigger: candidate.requiredTrigger,
    nextAction: candidate.nextAction,
  };
}

function campaignAlignedCandidateAudit(rows: any[], direction: 'LONG' | 'SHORT' | null) {
  if (!direction) {
    return {
      direction: null,
      firstHumanReviewReady: null,
      lowestRiskHumanReviewReady: null,
      notes: ['No actionable campaign direction was available for candidate alignment.'],
    };
  }
  const alignedReady = rows
    .filter((row) =>
      row.candidate?.direction === direction &&
      row.candidate?.humanReview?.status === 'HumanReviewReady'
    )
    .sort((a, b) => timeMs(a.timestamp) - timeMs(b.timestamp));
  const lowestRisk = alignedReady
    .filter((row) => typeof row.candidate?.riskPoints === 'number' && Number.isFinite(row.candidate.riskPoints))
    .sort((a, b) => a.candidate.riskPoints - b.candidate.riskPoints)[0] || null;
  const summarize = (row: any | null) => row ? {
    timestamp: row.timestamp,
    setupType: row.candidate.setupType,
    state: row.candidate.candidateState,
    direction: row.candidate.direction,
    entry: row.candidate.entry,
    stop: row.candidate.stop,
    target1: row.candidate.target1,
    target2: row.candidate.target2,
    riskPoints: row.candidate.riskPoints,
    canExecute: false,
    requiresTraderConfirmation: row.candidate.humanReview?.requiresTraderConfirmation === true,
  } : null;
  return {
    direction,
    firstHumanReviewReady: summarize(alignedReady[0] || null),
    lowestRiskHumanReviewReady: summarize(lowestRisk),
    notes: [
      'Campaign-aligned candidates are human-review-only and do not approve execution.',
      'Lowest risk is informational; risk policy and trader confirmation remain required.',
    ],
  };
}

function discordPreview(args: {
  sessionType: 'replay_morning';
  tradeDate: string;
  instrument: 'MES' | 'MNQ';
  normalized: ReturnType<typeof normalizeTradePlan>;
  candidate: any;
}) {
  const payload = compactDiscordSummary({
    session: 'morning',
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    planVersionId: `JUNE5-OPENING-DRIVE-FVG-${normalizeTime(args.candidate?.humanReview?.status || 'review')}`,
    normalized: {
      ...args.normalized,
      canExecute: false,
      decision: args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT' ? args.candidate.direction : args.normalized.decision,
      t1: typeof args.candidate?.target1 === 'number' ? args.candidate.target1 : args.normalized.t1,
      t2: typeof args.candidate?.target2 === 'number' ? args.candidate.target2 : args.normalized.t2,
      invalidation: args.candidate?.invalidation || args.normalized.invalidation,
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
    },
    candidates: [args.candidate],
    attachments: { chartPlan: false, priceLevelMap: false },
    sourceLabel: 'Scanner',
    windowLabel: 'Opening Drive FVG 09:30-11:00 ET',
    statusOverride: 'Conditional',
  });
  const serialized = JSON.stringify(payload);
  return {
    content: payload.content || '',
    embedTitle: payload.embeds?.[0]?.title || null,
    embedDescription: payload.embeds?.[0]?.description || null,
    containsHumanReviewReady: serialized.includes('HUMAN REVIEW READY'),
    containsTraderConfirmation: serialized.includes('Trader must confirm entry before action.'),
    containsCanExecuteTrue: serialized.includes('canExecute: true'),
  };
}

function buildMarkdown(report: any): string {
  const rows = report.openingDriveCandidates || [];
  return [
    '# June 5 Opening Drive FVG Current-Code Replay',
    '',
    `Instrument: ${report.instrument} (${report.bridgeInstrument})`,
    `Window: ${report.window.evaluateFrom} to ${report.window.evaluateTo}`,
    `Preload: ${report.window.preloadFrom} to ${report.window.evaluateTo}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Summary',
    `- 5M bars evaluated: ${report.totals.evaluated5mBars}`,
    `- Opening Drive candidates observed: ${report.totals.openingDriveCandidates}`,
    `- Human Review Ready candidates: ${report.totals.humanReviewReady}`,
    `- Final ApprovedTrade + effective canExecute: ${report.totals.finalApprovedCanExecute}`,
    `- Errors: ${report.totals.errors}`,
    '',
    '## Data Coverage',
    '| Timeframe | Source | Bars | Cache | Bridge | Requests | Range Start | Range End | Failures |',
    '|---|---|---:|---:|---:|---:|---|---|---:|',
    ...report.coverage.map((item: any) => `| ${item.timeframe} | ${item.source} | ${item.barsLoaded} | ${item.cacheBars} | ${item.bridgeBars} | ${item.bridgeRequests} | ${item.rangeStart || 'N/A'} | ${item.rangeEnd || 'N/A'} | ${item.bridgeFailures.length} |`),
    '',
    '## Opening Drive Candidates',
    rows.length
      ? '| Time | State | Direction | Entry | Stop | T1 | T2 | canExecute | Trader Confirmation | Discord Ready |'
      : 'No Opening Drive FVG candidates were found.',
    ...(rows.length ? [
      '|---|---|---|---:|---:|---:|---:|---|---|---|',
      ...rows.map((row: any) => `| ${row.timestamp} | ${row.candidate?.candidateState || 'N/A'} | ${row.candidate?.direction || 'N/A'} | ${row.candidate?.entry ?? 'N/A'} | ${row.candidate?.stop ?? 'N/A'} | ${row.candidate?.target1 ?? 'N/A'} | ${row.candidate?.target2 ?? 'N/A'} | ${row.candidate?.humanReview?.canExecute === false ? 'false' : 'N/A'} | ${row.candidate?.humanReview?.requiresTraderConfirmation === true ? 'true' : 'N/A'} | ${row.discordPreview?.containsHumanReviewReady ? 'yes' : 'no'} |`),
    ] : []),
    '',
    '## Phase 5A Campaign Audit',
    report.multiTimeframeCampaignAudit
      ? `Campaign by 10:00 ET: ${report.multiTimeframeCampaignAudit.campaignDirection} (${report.multiTimeframeCampaignAudit.reliability}, confidence ${report.multiTimeframeCampaignAudit.campaignConfidence}/100, 15M ${report.multiTimeframeCampaignAudit.fifteenMinuteAlignment})`
      : 'Campaign audit was not produced.',
    ...(report.multiTimeframeCampaignAudit ? [
      '| Timeframe | MSS | MSS Direction | MSS Time | Displacement | Support L/S |',
      '|---|---|---|---|---|---:|',
      ...report.multiTimeframeCampaignAudit.timeframes.map((item: any) => `| ${item.timeframe} | ${item.mss.status} | ${item.mss.direction} | ${item.mss.evidenceTimestamp || 'N/A'} | ${item.latestDisplacement.present ? `${item.latestDisplacement.direction} ${item.latestDisplacement.timestamp}` : 'none'} | ${item.longSupport}/${item.shortSupport} |`),
    ] : []),
    '',
    '## Phase 5B 5M Trigger Audit',
    report.fiveMinuteCampaignTriggerAudit
      ? `First fresh 5M structure trigger after 10:00 ET: ${report.fiveMinuteCampaignTriggerAudit.status}${report.fiveMinuteCampaignTriggerAudit.timestamp ? ` at ${report.fiveMinuteCampaignTriggerAudit.timestamp}` : ''}, direction ${report.fiveMinuteCampaignTriggerAudit.direction}, entry ${report.fiveMinuteCampaignTriggerAudit.entry ?? 'N/A'}, stop ${report.fiveMinuteCampaignTriggerAudit.stop ?? 'N/A'}, risk ${report.fiveMinuteCampaignTriggerAudit.riskPoints ?? 'N/A'} (${report.fiveMinuteCampaignTriggerAudit.riskStatus}).`
      : '5M trigger audit was not produced because campaign direction was not actionable.',
    report.campaignAlignedCandidateAudit?.firstHumanReviewReady
      ? `First campaign-aligned human-review candidate: ${report.campaignAlignedCandidateAudit.firstHumanReviewReady.timestamp}, entry ${report.campaignAlignedCandidateAudit.firstHumanReviewReady.entry}, stop ${report.campaignAlignedCandidateAudit.firstHumanReviewReady.stop}, risk ${report.campaignAlignedCandidateAudit.firstHumanReviewReady.riskPoints}.`
      : 'No campaign-aligned human-review candidate was found.',
    report.campaignAlignedCandidateAudit?.lowestRiskHumanReviewReady
      ? `Lowest-risk campaign-aligned human-review candidate: ${report.campaignAlignedCandidateAudit.lowestRiskHumanReviewReady.timestamp}, entry ${report.campaignAlignedCandidateAudit.lowestRiskHumanReviewReady.entry}, stop ${report.campaignAlignedCandidateAudit.lowestRiskHumanReviewReady.stop}, risk ${report.campaignAlignedCandidateAudit.lowestRiskHumanReviewReady.riskPoints}.`
      : 'No lower-risk campaign-aligned human-review candidate was found.',
    '',
    '## Authority',
    '- Uses market_bars first, then segmented NinjaTrader historical repair.',
    '- Uses structured OHLC only. No narrative reconstruction or screenshot fallback.',
    '- Does not post Discord, modify bridge behavior, or approve broker execution.',
  ].join('\n');
}

async function main() {
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const instrument = (argValue('instrument') || 'MES') === 'MNQ' ? 'MNQ' : 'MES';
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const tradeDate = argValue('trade-date') || '2026-06-05';
  const preloadDate = argValue('preload-date') || '2026-05-06';
  const jsonPath = resolve(argValue('json') || REPORT_JSON);
  const mdPath = resolve(argValue('md') || REPORT_MD);
  mkdirSync(resolve('tools/automation/replay-diagnostics'), { recursive: true });

  const loaded = await Promise.all(TIMEFRAMES.map((timeframe) => loadTimeframe({
    bridgeUrl,
    instrument,
    bridgeInstrument,
    timeframe,
    preloadDate,
    tradeDate,
  })));
  const barsByTimeframe = Object.fromEntries(loaded.map((item) => [item.timeframe, item.bars])) as Record<TimeframeKey, NinjaBridgeBar[]>;
  const campaignAsOfTimestamp = `${tradeDate}T10:00:00`;
  const multiTimeframeCampaignAudit = buildMultiTimeframeCampaignEvidence({
    barsByTimeframe: {
      '15M': through(barsByTimeframe['15m'], campaignAsOfTimestamp),
      '60M': through(barsByTimeframe['60m'], campaignAsOfTimestamp),
      '120M': through(barsByTimeframe['120m'], campaignAsOfTimestamp),
      '240M': through(barsByTimeframe['240m'], campaignAsOfTimestamp),
    },
    asOfTimestamp: campaignAsOfTimestamp,
    coverage: campaignCoverageFacts({ loaded, asOfTimestamp: campaignAsOfTimestamp, preloadDate }),
    barTimestampMode: 'open',
    barTimeZone: 'eastern',
  });
  const campaignTradeDirection = multiTimeframeCampaignAudit.campaignDirection === 'LONG' || multiTimeframeCampaignAudit.campaignDirection === 'SHORT'
    ? multiTimeframeCampaignAudit.campaignDirection
    : null;
  const fiveMinuteCampaignTriggerAudit = campaignTradeDirection
    ? findFirstFiveMinuteCampaignStructureTrigger({
      bars5m: sameDateRange(barsByTimeframe['5m'], tradeDate, `${tradeDate}T12:00:00`),
      direction: campaignTradeDirection,
      fromTimestamp: campaignAsOfTimestamp,
    })
    : null;
  const evaluationBars = barsByTimeframe['5m'].filter((bar) => {
    const date = normalizeTime(bar.time).slice(0, 10);
    const minutes = minutesEt(bar.time);
    return date === tradeDate && minutes !== null && minutes >= 9 * 60 + 30 && minutes < 11 * 60;
  });

  const openingDriveCandidates: any[] = [];
  const errors: string[] = [];
  let finalApprovedCanExecute = 0;
  let humanReviewReady = 0;

  for (const bar of evaluationBars) {
    const context = buildNinjaChartContext({
      bars5m: sameDateThrough(barsByTimeframe['5m'], bar.time),
      htfBars5m: through(barsByTimeframe['5m'], bar.time),
      bars15m: through(barsByTimeframe['15m'], bar.time),
      bars60m: through(barsByTimeframe['60m'], bar.time),
      bars120m: through(barsByTimeframe['120m'], bar.time),
      bars240m: through(barsByTimeframe['240m'], bar.time),
      sessionType: 'replay_morning',
      instrument,
      tradeDate,
      barTimestampMode: 'open',
      barTimeZone: 'eastern',
    }) as ChartContext | null;
    if (!context) {
      errors.push(`${bar.time}: buildNinjaChartContext returned null.`);
      continue;
    }
    const analysis = analysisForContext(context);
    const scan = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: analysis });
    const normalized = normalizeTradePlan(analysis, instrument, 'replay_morning');
    const candidate = scan.candidates.find((item) =>
      item.setupType === SetupType.OpeningDriveFvgContinuation &&
      item.detectedStatus !== 'NotDetected'
    );
    if (!candidate) continue;
    if (candidate.humanReview?.status === 'HumanReviewReady') humanReviewReady += 1;
    openingDriveCandidates.push({
      timestamp: bar.time,
      chartTimestamp: context.chartTimestamp,
      candidate: candidateSummary(candidate),
      fvgZones: (context.fvgZones || []).filter((zone) => zone.direction === candidate.direction).slice(0, 5),
      latest5mCandles: (context.candles || []).slice(-8),
      timeframeMssEvidence: context.timeframeMssEvidence ? Object.values(context.timeframeMssEvidence.timeframes).map((item) => ({
        timeframe: item.timeframe,
        direction: item.direction,
        status: item.status,
        evidenceTimestamp: item.evidenceTimestamp,
        completedBarStatus: item.completedBarStatus,
        confidence: item.confidence,
      })) : [],
      discordPreview: candidate.humanReview?.status === 'HumanReviewReady'
        ? discordPreview({ sessionType: 'replay_morning', tradeDate, instrument, normalized, candidate })
        : null,
      finalGateResult: {
        status: candidate.executionStatus,
        canExecute: false,
        humanReviewStatus: candidate.humanReview?.status || null,
        finalPlanEntry: candidate.entry,
        finalPlanStop: candidate.stop,
        target1: candidate.target1,
        target2: candidate.target2,
        boundary: 'opening_drive_candidate_human_review_only',
      },
    });
  }

  const campaignAlignedAudit = campaignAlignedCandidateAudit(openingDriveCandidates, campaignTradeDirection);
  const report = {
    reportType: 'slim_opening_drive_fvg_current_code_replay',
    createdAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    bridgeUrl,
    window: {
      evaluateFrom: `${tradeDate}T09:30:00-04:00`,
      evaluateTo: `${tradeDate}T11:00:00-04:00`,
      preloadFrom: `${preloadDate}T00:00:00-04:00`,
    },
    sourcePolicy: {
      readMarketBarsFirst: true,
      repairFromNinjaTraderHistoricalBars: true,
      segmentedBridgeRepairDays: 1,
      narrativeFallbackUsed: false,
      screenshotFallbackUsed: false,
    },
    boundary: 'ohlc_replay_human_review_only_not_execution_authority',
    phase5: {
      enabled: true,
      scope: 'Phase 5A + 5B audit only',
      activeModelChanged: false,
      supportingLayerOnly: true,
    },
    coverage: loaded.map((item) => ({
      timeframe: item.timeframe,
      source: item.source,
      barsLoaded: item.bars.length,
      cacheBars: item.cacheBars,
      bridgeBars: item.bridgeBars,
      bridgeRequests: item.bridgeRequests,
      rangeStart: item.rangeStart,
      rangeEnd: item.rangeEnd,
      bridgeFailures: item.bridgeFailures,
    })),
    multiTimeframeCampaignAudit,
    fiveMinuteCampaignTriggerAudit,
    campaignAlignedCandidateAudit: campaignAlignedAudit,
    totals: {
      evaluated5mBars: evaluationBars.length,
      openingDriveCandidates: openingDriveCandidates.length,
      humanReviewReady,
      finalApprovedCanExecute,
      errors: errors.length,
    },
    openingDriveCandidates,
    errors,
    authority: {
      changesTradeLogic: false,
      approvesExecution: false,
      changesScannerBehavior: false,
      changesBridgeBehavior: false,
      changesDiscordBehavior: false,
    },
  };
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(mdPath, `${buildMarkdown(report)}\n`);
  console.log(`Opening Drive FVG replay complete: evaluated5mBars=${evaluationBars.length}, openingDriveCandidates=${openingDriveCandidates.length}, humanReviewReady=${humanReviewReady}, finalApprovedCanExecute=${finalApprovedCanExecute}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
