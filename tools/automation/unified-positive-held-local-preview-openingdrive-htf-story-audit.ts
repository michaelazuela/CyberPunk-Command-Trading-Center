import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type Timeframe = '15m' | '60m' | '120m' | '240m';
type Trend = 'bearish' | 'bullish' | 'neutral' | 'missing';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface OpeningDriveSlate {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  direction: Direction;
  riskBand: string;
  methodKey: string;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: string;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  hasSweepCollision: boolean;
  hasHtfCollision: boolean;
  collisionMethodKeys: string[];
}

interface OpeningDriveReport {
  reportType?: string;
  dailySlates?: OpeningDriveSlate[];
}

interface HtfSourceReport {
  reportType?: string;
  bars?: Partial<Record<'5m' | Timeframe, Bar[]>>;
}

interface AcquisitionReport {
  reportType?: string;
  canonicalMarketBarsPath?: string;
  coverage?: Array<{
    timeframe: '5m' | Timeframe;
    barsLoaded: number;
    rangeStart: string | null;
    rangeEnd: string | null;
    sufficient: boolean;
    warning: string | null;
  }>;
  summary?: {
    sufficientTimeframes?: string[];
    dataLimitedTimeframes?: string[];
    contractLegs?: string[];
  };
}

interface RangeStory {
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  trend: Trend;
  bars: number;
}

interface TimeframeStory {
  timeframe: Timeframe;
  sufficiency: 'sufficient' | 'data_limited' | 'missing';
  barsLoaded: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  warning: string | null;
  lookbackBarsBeforeProof: number;
  recentTrend: Trend;
  recentChangePoints: number | null;
  recentRangeHigh: number | null;
  recentRangeLow: number | null;
  entryRangePercentile: number | null;
  shortContext: 'support' | 'caution' | 'neutral' | 'data_limited';
  note: string;
}

interface SlateStory {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  proofTime: string;
  direction: Direction;
  riskBand: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: string;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  sweepCollision: boolean;
  htfCollisionFromSlate: boolean;
  session: {
    eth: RangeStory;
    asian: RangeStory;
    london: RangeStory;
    nyPremarket: RangeStory;
    openingDriveToProof: RangeStory;
    openingDriveDirection: Trend;
    sweptNyPremarketHigh: boolean;
    brokeNyPremarketLow: boolean;
    entryInEthPercentile: number | null;
  };
  timeframeStories: TimeframeStory[];
  tactical15m60mContextVerdict: 'supported_short_context' | 'mixed_short_context' | 'caution_short_context';
  storyVerdict: 'supported_short' | 'mixed_short' | 'caution_short' | 'data_limited';
  outcomePathWarning: string | null;
  storyNotes: string[];
}

interface GroupSummary {
  key: string;
  slates: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  oneMesPl: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
}

export interface OpeningDriveHtfStoryAuditReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_htf_story_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
    livePromotionAllowed: false;
  };
  source: {
    openingDriveReportPath: string | null;
    htfSourcePath: string | null;
    htfAcquisitionReportPath: string | null;
  };
  summary: {
    openingDriveSlates: number;
    targetMorningShortSweepSlates: number;
    targetResolvedSlates: number;
    targetOneMesPl: number | null;
    winners: number;
    losses: number;
    unresolved: number;
    blocked: number;
    supportedShortSlates: number;
    mixedShortSlates: number;
    cautionShortSlates: number;
    dataLimitedSlates: number;
    tacticalSupportedContextSlates: number;
    tacticalMixedContextSlates: number;
    tacticalCautionContextSlates: number;
    lossWithTargetMfeWarningSlates: number;
    livePromotionAllowedRows: 0;
    recommendation: 'advance_supported_short_story_to_selector_proposal_audit' | 'hold_for_more_htf_data' | 'fix_missing_inputs';
  };
  coverage: TimeframeStory[];
  byVerdict: GroupSummary[];
  slateStories: SlateStory[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TIMEFRAMES: Timeframe[] = ['15m', '60m', '120m', '240m'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function barsBetween(bars: Bar[], fromInclusive: string, toInclusive: string): Bar[] {
  const from = timeMs(fromInclusive);
  const to = timeMs(toInclusive);
  return bars.filter((bar) => {
    const time = timeMs(bar.time);
    return time >= from && time <= to;
  });
}

function barsBefore(bars: Bar[], proofTime: string): Bar[] {
  const proof = timeMs(proofTime);
  return bars.filter((bar) => timeMs(bar.time) <= proof);
}

function rangeStory(bars: Bar[]): RangeStory {
  if (!bars.length) return { high: null, low: null, open: null, close: null, trend: 'missing', bars: 0 };
  const high = Math.max(...bars.map((bar) => bar.high));
  const low = Math.min(...bars.map((bar) => bar.low));
  const open = bars[0].open;
  const close = bars[bars.length - 1].close;
  return {
    high: round(high),
    low: round(low),
    open: round(open),
    close: round(close),
    trend: trendFromChange(close - open, high - low),
    bars: bars.length,
  };
}

function trendFromChange(change: number, range: number): Trend {
  const threshold = Math.max(1, range * 0.08);
  if (change <= -threshold) return 'bearish';
  if (change >= threshold) return 'bullish';
  return 'neutral';
}

function percentile(value: number, low: number | null, high: number | null): number | null {
  if (low === null || high === null || high <= low) return null;
  return round((value - low) / (high - low));
}

function sortBars(bars: Bar[]): Bar[] {
  return [...bars].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function coverageFor(acquisition: AcquisitionReport | null, timeframe: Timeframe): AcquisitionReport['coverage'][number] | null {
  return acquisition?.coverage?.find((row) => row.timeframe === timeframe) || null;
}

function buildTimeframeStory(args: {
  timeframe: Timeframe;
  bars: Bar[];
  proofTime: string;
  entry: number;
  acquisition: AcquisitionReport | null;
}): TimeframeStory {
  const coverage = coverageFor(args.acquisition, args.timeframe);
  const beforeProof = sortBars(barsBefore(args.bars, args.proofTime));
  const recent = beforeProof.slice(args.timeframe === '15m' ? -16 : -8);
  const recentRange = rangeStory(recent);
  const lookbackRange = rangeStory(beforeProof.slice(-80));
  const recentChange = recent.length ? round(recent[recent.length - 1].close - recent[0].open) : null;
  const recentTrend = recent.length ? trendFromChange(recent[recent.length - 1].close - recent[0].open, (recentRange.high ?? 0) - (recentRange.low ?? 0)) : 'missing';
  const sufficiency = coverage ? coverage.sufficient ? 'sufficient' : 'data_limited' : beforeProof.length ? 'missing' : 'missing';
  const entryRangePercentile = percentile(args.entry, lookbackRange.low, lookbackRange.high);
  const shortContext = sufficiency === 'data_limited'
    ? 'data_limited'
    : recentTrend === 'bearish' || (entryRangePercentile !== null && entryRangePercentile >= 0.65)
      ? 'support'
      : recentTrend === 'bullish' && (entryRangePercentile === null || entryRangePercentile < 0.65)
        ? 'caution'
        : 'neutral';
  const note = shortContext === 'support'
    ? `${args.timeframe} supports the short map by ${recentTrend === 'bearish' ? 'recent bearish pressure' : 'upper-range entry location'}.`
    : shortContext === 'caution'
      ? `${args.timeframe} is caution for the short map: recent context is bullish without upper-range location.`
      : shortContext === 'data_limited'
        ? `${args.timeframe} is data-limited; use as map/context only, not structural confirmation.`
        : `${args.timeframe} is neutral for the short map.`;
  return {
    timeframe: args.timeframe,
    sufficiency,
    barsLoaded: coverage?.barsLoaded ?? args.bars.length,
    rangeStart: coverage?.rangeStart ?? (args.bars[0]?.time || null),
    rangeEnd: coverage?.rangeEnd ?? (args.bars.at(-1)?.time || null),
    warning: coverage?.warning ?? null,
    lookbackBarsBeforeProof: beforeProof.length,
    recentTrend,
    recentChangePoints: recentChange,
    recentRangeHigh: recentRange.high,
    recentRangeLow: recentRange.low,
    entryRangePercentile,
    shortContext,
    note,
  };
}

function buildSlateStory(args: {
  slate: OpeningDriveSlate;
  bars5m: Bar[];
  barsByTimeframe: Record<Timeframe, Bar[]>;
  acquisition: AcquisitionReport | null;
}): SlateStory {
  const previousDate = addDays(args.slate.tradeDate, -1);
  const eth = rangeStory(barsBetween(args.bars5m, `${previousDate}T18:00:00`, args.slate.proofTime));
  const asian = rangeStory(barsBetween(args.bars5m, `${previousDate}T18:00:00`, `${args.slate.tradeDate}T00:00:00`));
  const london = rangeStory(barsBetween(args.bars5m, `${args.slate.tradeDate}T00:00:00`, `${args.slate.tradeDate}T08:30:00`));
  const nyPremarket = rangeStory(barsBetween(args.bars5m, `${args.slate.tradeDate}T08:30:00`, `${args.slate.tradeDate}T09:30:00`));
  const openingDriveToProof = rangeStory(barsBetween(args.bars5m, `${args.slate.tradeDate}T09:30:00`, args.slate.proofTime));
  const timeframeStories = TIMEFRAMES.map((timeframe) => buildTimeframeStory({
    timeframe,
    bars: args.barsByTimeframe[timeframe],
    proofTime: args.slate.proofTime,
    entry: args.slate.entry,
    acquisition: args.acquisition,
  }));
  const dataLimitedCount = timeframeStories.filter((story) => story.sufficiency === 'data_limited').length;
  const supportCount = timeframeStories.filter((story) => story.shortContext === 'support').length;
  const cautionCount = timeframeStories.filter((story) => story.shortContext === 'caution').length;
  const tacticalStories = timeframeStories.filter((story) => story.timeframe === '15m' || story.timeframe === '60m');
  const tacticalSupportCount = tacticalStories.filter((story) => story.shortContext === 'support').length;
  const tacticalCautionCount = tacticalStories.filter((story) => story.shortContext === 'caution').length;
  const openingDriveDirection = openingDriveToProof.trend;
  const sweptNyPremarketHigh = nyPremarket.high !== null && openingDriveToProof.high !== null && openingDriveToProof.high > nyPremarket.high;
  const brokeNyPremarketLow = nyPremarket.low !== null && openingDriveToProof.low !== null && openingDriveToProof.low < nyPremarket.low;
  const storyVerdict = dataLimitedCount >= 2
    ? 'data_limited'
    : openingDriveDirection === 'bearish' && supportCount >= 2 && cautionCount === 0
      ? 'supported_short'
      : cautionCount >= 2
        ? 'caution_short'
        : 'mixed_short';
  const tactical15m60mContextVerdict = openingDriveDirection === 'bearish' && tacticalSupportCount >= 2 && tacticalCautionCount === 0
    ? 'supported_short_context' as const
    : tacticalCautionCount >= 1 && tacticalSupportCount === 0
      ? 'caution_short_context' as const
      : 'mixed_short_context' as const;
  const outcomePathWarning = args.slate.outcomeBucket === 'loss' && typeof args.slate.mfeR === 'number' && args.slate.mfeR >= 1.5
    ? `Loss row reached ${args.slate.mfeR}R MFE; review intrabar/path ordering before treating it as clean model failure.`
    : null;
  const storyNotes = [
    `Opening drive into proof was ${openingDriveDirection}; NY premarket low break=${brokeNyPremarketLow ? 'yes' : 'no'}, premarket high sweep=${sweptNyPremarketHigh ? 'yes' : 'no'}.`,
    `HTF map: ${supportCount} support, ${cautionCount} caution, ${dataLimitedCount} data-limited.`,
    `15M/60M tactical context: ${tactical15m60mContextVerdict}.`,
    ...(outcomePathWarning ? [outcomePathWarning] : []),
    ...timeframeStories.map((story) => story.note),
  ];
  return {
    slateKey: args.slate.slateKey,
    selectedTicketId: args.slate.selectedTicketId,
    tradeDate: args.slate.tradeDate,
    proofTime: args.slate.proofTime,
    direction: args.slate.direction,
    riskBand: args.slate.riskBand,
    entry: args.slate.entry,
    stop: args.slate.stop,
    t1: args.slate.t1,
    t2: args.slate.t2,
    riskPoints: args.slate.riskPoints,
    outcomeBucket: args.slate.outcomeBucket,
    outcomeLabel: args.slate.outcomeLabel,
    oneMesPl: args.slate.oneMesPl,
    mfeR: args.slate.mfeR,
    maeR: args.slate.maeR,
    sweepCollision: args.slate.hasSweepCollision,
    htfCollisionFromSlate: args.slate.hasHtfCollision,
    session: {
      eth,
      asian,
      london,
      nyPremarket,
      openingDriveToProof,
      openingDriveDirection,
      sweptNyPremarketHigh,
      brokeNyPremarketLow,
      entryInEthPercentile: percentile(args.slate.entry, eth.low, eth.high),
    },
    timeframeStories,
    tactical15m60mContextVerdict,
    storyVerdict,
    outcomePathWarning,
    storyNotes,
  };
}

function summarizeGroup(key: string, stories: SlateStory[]): GroupSummary {
  return {
    key,
    slates: stories.length,
    winners: stories.filter((row) => row.outcomeBucket === 'winner').length,
    losses: stories.filter((row) => row.outcomeBucket === 'loss').length,
    unresolved: stories.filter((row) => row.outcomeBucket === 'unresolved').length,
    blocked: stories.filter((row) => row.outcomeBucket === 'blocked').length,
    oneMesPl: sum(stories.map((row) => row.oneMesPl)),
    averageMfeR: avg(stories.map((row) => row.mfeR)),
    averageMaeR: avg(stories.map((row) => row.maeR)),
  };
}

function groupByVerdict(stories: SlateStory[]): GroupSummary[] {
  return ['supported_short', 'mixed_short', 'caution_short', 'data_limited']
    .map((key) => summarizeGroup(key, stories.filter((story) => story.storyVerdict === key)))
    .filter((group) => group.slates > 0);
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function slateTable(stories: SlateStory[], limit = 30): string[] {
  return [
    '| Date | Time | Result | P/L | Entry | Stop | T1 | T2 | Risk | Full HTF | 15M/60M | 15M | 60M | 120M | 240M | OD | NY Low Break | Warning |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|---|---|---|',
    ...stories.slice(0, limit).map((story) => {
      const storyByTf = new Map(story.timeframeStories.map((item) => [item.timeframe, item]));
      return `| ${story.tradeDate} | ${story.proofTime.slice(11, 16)} | ${story.outcomeLabel} | ${story.oneMesPl ?? '-'} | ${story.entry} | ${story.stop} | ${story.t1} | ${story.t2} | ${story.riskPoints} | ${story.storyVerdict} | ${story.tactical15m60mContextVerdict} | ${storyByTf.get('15m')?.shortContext ?? '-'} | ${storyByTf.get('60m')?.shortContext ?? '-'} | ${storyByTf.get('120m')?.shortContext ?? '-'} | ${storyByTf.get('240m')?.shortContext ?? '-'} | ${story.session.openingDriveDirection} | ${story.session.brokeNyPremarketLow ? 'yes' : 'no'} | ${escapeTable(story.outcomePathWarning || '-')} |`;
    }),
  ];
}

function buildMarkdown(report: Omit<OpeningDriveHtfStoryAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep Morning Short HTF Story Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved OpeningDrive slates and saved canonical HTF OHLC. It does not run the scanner, change ranking, post Discord, write Supabase, read the bridge, or approve execution.',
    '',
    '## Summary',
    `- Target OpeningDrive morning SHORT with Sweep-overlap slates: ${report.summary.targetMorningShortSweepSlates}.`,
    `- Resolved: ${report.summary.targetResolvedSlates}; W/L/U/B: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}/${report.summary.blocked}.`,
    `- Target one-MES P/L: ${report.summary.targetOneMesPl ?? '-'}.`,
    `- Story verdicts: supported=${report.summary.supportedShortSlates}, mixed=${report.summary.mixedShortSlates}, caution=${report.summary.cautionShortSlates}, data_limited=${report.summary.dataLimitedSlates}.`,
    `- 15M/60M tactical context: supported=${report.summary.tacticalSupportedContextSlates}, mixed=${report.summary.tacticalMixedContextSlates}, caution=${report.summary.tacticalCautionContextSlates}.`,
    `- Loss rows with target-MFE path warning: ${report.summary.lossWithTargetMfeWarningSlates}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## HTF Coverage',
    '| Timeframe | Sufficiency | Bars | Range Start | Range End | Warning |',
    '|---|---|---:|---|---|---|',
    ...report.coverage.map((row) => `| ${row.timeframe} | ${row.sufficiency} | ${row.barsLoaded} | ${row.rangeStart || '-'} | ${row.rangeEnd || '-'} | ${escapeTable(row.warning || '-')} |`),
    '',
    '## Story Groups',
    '| Verdict | Slates | W/L/U/B | P/L | Avg MFE R | Avg MAE R |',
    '|---|---:|---|---:|---:|---:|',
    ...report.byVerdict.map((row) => `| ${row.key} | ${row.slates} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oneMesPl ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} |`),
    '',
    '## Slate Stories',
    ...slateTable(report.slateStories, 40),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveHtfStoryAuditReport(args: {
  openingDriveReportPath: string | null;
  openingDriveReport: OpeningDriveReport | null;
  htfSourcePath: string | null;
  htfSource: HtfSourceReport | null;
  htfAcquisitionReportPath: string | null;
  htfAcquisitionReport: AcquisitionReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveHtfStoryAuditReport {
  const openingDriveSlates = Array.isArray(args.openingDriveReport?.dailySlates) ? args.openingDriveReport.dailySlates : [];
  const htfBars = args.htfSource?.bars || {};
  const bars5m = sortBars(htfBars['5m'] || []);
  const barsByTimeframe: Record<Timeframe, Bar[]> = {
    '15m': sortBars(htfBars['15m'] || []),
    '60m': sortBars(htfBars['60m'] || []),
    '120m': sortBars(htfBars['120m'] || []),
    '240m': sortBars(htfBars['240m'] || []),
  };
  const targetSlates = openingDriveSlates.filter((slate) =>
    slate.session === 'morning' &&
    slate.direction === 'SHORT' &&
    slate.hasSweepCollision);
  const blockers = [
    !args.openingDriveReportPath ? 'missing OpeningDrive slate audit report path' : null,
    !args.openingDriveReport ? 'missing OpeningDrive slate audit report' : null,
    openingDriveSlates.length === 0 ? 'OpeningDrive report has no daily slates' : null,
    !args.htfSourcePath ? 'missing HTF source path' : null,
    !args.htfSource ? 'missing HTF source report' : null,
    bars5m.length === 0 ? 'HTF source has no 5m bars for session story' : null,
    TIMEFRAMES.some((timeframe) => barsByTimeframe[timeframe].length === 0) ? 'HTF source is missing one or more 15m/60m/120m/240m bars' : null,
  ].filter((item): item is string => Boolean(item));
  const slateStories = blockers.length ? [] : targetSlates.map((slate) => buildSlateStory({
    slate,
    bars5m,
    barsByTimeframe,
    acquisition: args.htfAcquisitionReport,
  }));
  const coverage = TIMEFRAMES.map((timeframe) => buildTimeframeStory({
    timeframe,
    bars: barsByTimeframe[timeframe],
    proofTime: targetSlates[0]?.proofTime || `${openingDriveSlates[0]?.tradeDate || '2026-06-01'}T12:00:00`,
    entry: targetSlates[0]?.entry || openingDriveSlates[0]?.entry || 0,
    acquisition: args.htfAcquisitionReport,
  }));
  const byVerdict = groupByVerdict(slateStories);
  const dataLimitedSlates = slateStories.filter((story) => story.storyVerdict === 'data_limited').length;
  const recommendation = blockers.length
    ? 'fix_missing_inputs' as const
    : dataLimitedSlates >= Math.ceil(Math.max(1, slateStories.length) / 2)
      ? 'hold_for_more_htf_data' as const
      : 'advance_supported_short_story_to_selector_proposal_audit' as const;
  const base: Omit<OpeningDriveHtfStoryAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_htf_story_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
      livePromotionAllowed: false,
    },
    source: {
      openingDriveReportPath: args.openingDriveReportPath,
      htfSourcePath: args.htfSourcePath,
      htfAcquisitionReportPath: args.htfAcquisitionReportPath,
    },
    summary: {
      openingDriveSlates: openingDriveSlates.length,
      targetMorningShortSweepSlates: targetSlates.length,
      targetResolvedSlates: targetSlates.filter((slate) => slate.oneMesPl !== null).length,
      targetOneMesPl: sum(targetSlates.map((slate) => slate.oneMesPl)),
      winners: targetSlates.filter((slate) => slate.outcomeBucket === 'winner').length,
      losses: targetSlates.filter((slate) => slate.outcomeBucket === 'loss').length,
      unresolved: targetSlates.filter((slate) => slate.outcomeBucket === 'unresolved').length,
      blocked: targetSlates.filter((slate) => slate.outcomeBucket === 'blocked').length,
      supportedShortSlates: slateStories.filter((story) => story.storyVerdict === 'supported_short').length,
      mixedShortSlates: slateStories.filter((story) => story.storyVerdict === 'mixed_short').length,
      cautionShortSlates: slateStories.filter((story) => story.storyVerdict === 'caution_short').length,
      dataLimitedSlates,
      tacticalSupportedContextSlates: slateStories.filter((story) => story.tactical15m60mContextVerdict === 'supported_short_context').length,
      tacticalMixedContextSlates: slateStories.filter((story) => story.tactical15m60mContextVerdict === 'mixed_short_context').length,
      tacticalCautionContextSlates: slateStories.filter((story) => story.tactical15m60mContextVerdict === 'caution_short_context').length,
      lossWithTargetMfeWarningSlates: slateStories.filter((story) => story.outcomePathWarning).length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    coverage,
    byVerdict,
    slateStories,
    blockers,
    recommendations: blockers.length
      ? ['Pass both the OpeningDrive slate audit report and canonical HTF OHLC source before reading the HTF story.']
      : [
        'Do not promote from this report alone; it is descriptive HTF/session story over saved slates.',
        'Treat 120m/240m data-limited reads as context only until repaired.',
        'Use the supported/mixed/caution split to choose the next selector-proposal audit, not to change live ranking yet.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveHtfStoryAuditReport(
  report: OpeningDriveHtfStoryAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-htf-story-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveHtfStoryAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const openingDriveReportPath = readFlag(args, '--openingdrive-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-slate-edge-audit-\d+\.json$/);
  const htfAcquisitionReportPath = readFlag(args, '--htf-acquisition-report') ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-acquisition-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const htfAcquisitionReport = readJson<AcquisitionReport>(htfAcquisitionReportPath);
  const htfSourcePath = readFlag(args, '--htf-source') ||
    htfAcquisitionReport?.canonicalMarketBarsPath ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildOpeningDriveHtfStoryAuditReport({
    openingDriveReportPath,
    openingDriveReport: readJson<OpeningDriveReport>(openingDriveReportPath),
    htfSourcePath,
    htfSource: readJson<HtfSourceReport>(htfSourcePath),
    htfAcquisitionReportPath,
    htfAcquisitionReport,
  });
  const paths = writeOpeningDriveHtfStoryAuditReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runOpeningDriveHtfStoryAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
