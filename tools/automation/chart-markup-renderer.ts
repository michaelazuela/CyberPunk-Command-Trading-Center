import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { ChartCandleFact, ChartContext, DecisionQualityScoreItem, DisplacementCandleFact, FvgZoneFact, LiquidityEventFact, ReclaimEventFact, SetupCandidate } from '../../src/types';
import { professionalCandidateModelLabel } from './professional-report-language';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'chart-markups');
const APPROVED_RENDER_WIDTH = 1536;
const APPROVED_RENDER_HEIGHT = 1024;
const LEVEL_MAP_SUFFIX = 'level-map';

export interface ChartMarkupRenderInput {
  chartContext: Partial<ChartContext> | null;
  candidate: SetupCandidate | null;
  instrument: string;
  tradeDate: string;
  sessionLabel: string;
  outputDir?: string;
  filePrefix?: string;
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function money(value?: number | null): string {
  return isPrice(value) ? value.toFixed(2) : 'N/A';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compact(value?: string | null, max = 78): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function validCandles(chartContext: Partial<ChartContext> | null): Array<Required<Pick<ChartCandleFact, 'index' | 'open' | 'high' | 'low' | 'close'>> & { timestamp?: string | null }> {
  return (chartContext?.candles || [])
    .filter((candle) => isPrice(candle.open) && isPrice(candle.high) && isPrice(candle.low) && isPrice(candle.close))
    .map((candle, fallbackIndex) => ({
      index: typeof candle.index === 'number' ? candle.index : fallbackIndex,
      open: candle.open as number,
      high: candle.high as number,
      low: candle.low as number,
      close: candle.close as number,
      timestamp: candle.timestamp || null,
    }))
    .slice(-90);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function matchingFvg(chartContext: Partial<ChartContext> | null, candidate: SetupCandidate): FvgZoneFact | null {
  const entry = candidate.entry;
  const zones = chartContext?.fvgZones || [];
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const matching = zones
    .filter((zone) => zone.direction === direction && isPrice(zone.lower) && isPrice(zone.upper))
    .filter((zone) => !isPrice(entry) || ((zone.lower as number) <= entry && entry <= (zone.upper as number)))
    .sort((a, b) => Math.abs(((a.midpoint || a.lower || 0) as number) - (entry || 0)) - Math.abs(((b.midpoint || b.lower || 0) as number) - (entry || 0)));
  return matching[0] || null;
}

function matchingSweep(chartContext: Partial<ChartContext> | null, candidate: SetupCandidate): LiquidityEventFact | null {
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const sweeps = [...(chartContext?.liquiditySweeps || []), ...(chartContext?.liquidityEvents || [])]
    .filter((event) => event.type === 'sweep' && isPrice(event.level));
  const preferred = sweeps.filter((event) => event.direction === direction);
  return preferred[preferred.length - 1] || sweeps[sweeps.length - 1] || null;
}

function matchingReclaim(chartContext: Partial<ChartContext> | null, candidate: SetupCandidate): ReclaimEventFact | null {
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const reclaims = (chartContext?.reclaimEvents || [])
    .filter((event) => event.direction === direction && isPrice(event.reclaimedLevel));
  return reclaims[reclaims.length - 1] || null;
}

function matchingDisplacement(chartContext: Partial<ChartContext> | null, candidate: SetupCandidate): DisplacementCandleFact | null {
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const displacements = (chartContext?.displacementCandles || [])
    .filter((event) => event.direction === direction);
  return displacements[displacements.length - 1] || null;
}

interface PlanRenderModel {
  candidate: SetupCandidate;
  candles: Array<Required<Pick<ChartCandleFact, 'index' | 'open' | 'high' | 'low' | 'close'>> & { timestamp?: string | null }>;
  direction: 'LONG' | 'SHORT';
  isLong: boolean;
  model: string;
  score: number | null;
  entry: number | null;
  entryLow: number | null;
  entryHigh: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  liquidity: number | null;
  sweep: number | null;
  risk: number | null;
  r1: number | null;
  r2: number | null;
  liquidityR: number | null;
  sweepEvent: LiquidityEventFact | null;
  reclaimEvent: ReclaimEventFact | null;
  displacementEvent: DisplacementCandleFact | null;
  displayStatus: string;
  validationSeverity: 'ok' | 'review' | 'error';
  validationMessages: string[];
  safeChartPrices: number[];
  contextBias: string;
  trendBias: string;
  narrative: string;
}

function nearlyEqual(a: number | null, b: number | null, tolerance = 0.01): boolean {
  return isPrice(a) && isPrice(b) && Math.abs(a - b) <= tolerance;
}

function rMultiple(direction: 'LONG' | 'SHORT', entry: number | null, stop: number | null, target: number | null): number | null {
  if (!isPrice(entry) || !isPrice(stop) || !isPrice(target)) return null;
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;
  const reward = direction === 'LONG' ? target - entry : entry - target;
  return reward / risk;
}

function targetLooksStale(price: number | null, candles: PlanRenderModel['candles'], risk: number | null): boolean {
  if (!isPrice(price) || candles.length < 3) return false;
  const candleHigh = Math.max(...candles.map((candle) => candle.high));
  const candleLow = Math.min(...candles.map((candle) => candle.low));
  const range = Math.max(1, candleHigh - candleLow);
  const mid = (candleHigh + candleLow) / 2;
  const maxDistance = Math.max(range * 2.5, (risk || 0) * 8, 20);
  return Math.abs(price - mid) > maxDistance;
}

function buildPlanRenderModel(input: ChartMarkupRenderInput): PlanRenderModel {
  const candidate = input.candidate;
  const candles = validCandles(input.chartContext);
  if (!candidate || candles.length < 3) {
    throw new Error('Chart markup requires a selected candidate and at least 3 valid candles.');
  }
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const isLong = direction === 'LONG';
  const model = professionalCandidateModelLabel(candidate);
  const score = candidate.decisionQualityScore ?? candidate.rankScore ?? null;
  const fvg = matchingFvg(input.chartContext, candidate);
  const sweepEvent = matchingSweep(input.chartContext, candidate);
  const reclaimEvent = matchingReclaim(input.chartContext, candidate);
  const displacementEvent = matchingDisplacement(input.chartContext, candidate);
  const entry = isPrice(candidate.entry) ? candidate.entry : null;
  const stop = isPrice(candidate.stop) ? candidate.stop : null;
  const t1 = isPrice(candidate.target1) ? candidate.target1 : null;
  const t2 = isPrice(candidate.target2) ? candidate.target2 : null;
  const liquidity = candidate.targetObjectivePlan?.liquidityTarget1?.price ||
    candidate.targetObjectivePlan?.nearestLiquidityTarget?.price ||
    candidate.targetObjectivePlan?.liquidityRunnerTarget?.price ||
    null;
  const risk = isPrice(entry) && isPrice(stop) ? Math.abs(entry - stop) : null;
  const entryLow = fvg && isPrice(fvg.lower) ? fvg.lower : isPrice(entry) && isPrice(risk) ? entry - risk * 0.25 : entry;
  const entryHigh = fvg && isPrice(fvg.upper) ? fvg.upper : isPrice(entry) && isPrice(risk) ? entry + risk * 0.25 : entry;
  const sweep = isPrice(sweepEvent?.level) ? sweepEvent.level : null;
  const contextBias = String(input.chartContext?.multiTimeframeContext?.alignment?.alignedDirection || input.chartContext?.marketStructure?.trend || 'unknown');
  const trendBias = String(input.chartContext?.multiTimeframeContext?.alignment?.executionBias || input.chartContext?.marketStructure?.trend || 'unknown');
  const narrative = compact(input.chartContext?.sessionStory?.summary || candidate.levelContextSummary || candidate.nextAction || 'Wait for completed 5M confirmation.', 34);

  const messages: string[] = [];
  if (!isPrice(entryLow) || !isPrice(entryHigh)) messages.push('Review Required — Entry zone missing.');
  if (!isPrice(stop)) messages.push('Review Required — Stop missing.');
  if (!isPrice(t1) || !isPrice(t2)) messages.push('Review Required — Target data missing.');
  if (nearlyEqual(t1, t2)) messages.push('Review Required — T1 and T2 are identical.');
  if (targetLooksStale(t1, candles, risk) || targetLooksStale(t2, candles, risk) || targetLooksStale(liquidity, candles, risk)) {
    messages.push('Target Data Error — Target appears stale or invalid.');
  }
  if (isPrice(entry) && isPrice(stop)) {
    if (direction === 'LONG' && stop >= entry) messages.push('Review Required — Stop is not below long entry.');
    if (direction === 'SHORT' && stop <= entry) messages.push('Review Required — Stop is not above short entry.');
  }
  if (isPrice(entryLow) && isPrice(entryHigh) && entryLow > entryHigh) {
    messages.push('Review Required — Entry zone bounds are reversed.');
  }

  const validationSeverity = messages.some((message) => message.includes('Data Error')) ? 'error' : messages.length ? 'review' : 'ok';
  const displayStatus = validationSeverity === 'error'
    ? 'Data Error'
    : validationSeverity === 'review'
      ? 'Review Required'
      : String(candidate.executionStatus || 'Conditional');
  const safeChartPrices = [
    ...candles.flatMap((candle) => [candle.high, candle.low]),
    entryLow,
    entryHigh,
    stop,
    sweep,
    ...(messages.some((message) => message.includes('Target Data Error')) ? [] : [t1, t2, liquidity]),
  ].filter(isPrice);

  return {
    candidate,
    candles,
    direction,
    isLong,
    model,
    score,
    entry,
    entryLow,
    entryHigh,
    stop,
    t1,
    t2,
    liquidity: isPrice(liquidity) ? liquidity : null,
    sweep,
    risk,
    r1: rMultiple(direction, entry, stop, t1),
    r2: rMultiple(direction, entry, stop, t2),
    liquidityR: rMultiple(direction, entry, stop, isPrice(liquidity) ? liquidity : null),
    sweepEvent,
    reclaimEvent,
    displacementEvent,
    displayStatus,
    validationSeverity,
    validationMessages: messages,
    safeChartPrices,
    contextBias,
    trendBias,
    narrative,
  };
}

function renderCandle(candle: Required<Pick<ChartCandleFact, 'open' | 'high' | 'low' | 'close'>>, x: number, y: (price: number) => number): string {
  const bullish = candle.close >= candle.open;
  const color = bullish ? '#4ade80' : '#ff453a';
  const bodyTop = y(Math.max(candle.open, candle.close));
  const bodyBottom = y(Math.min(candle.open, candle.close));
  const bodyHeight = Math.max(3, bodyBottom - bodyTop);
  return `
    <line x1="${x}" y1="${y(candle.high)}" x2="${x}" y2="${y(candle.low)}" stroke="${color}" stroke-width="2" />
    <rect x="${x - 5}" y="${bodyTop}" width="10" height="${bodyHeight}" fill="${color}" rx="1" />
  `;
}

function renderManagedLines(
  levels: Array<{ label: string; price: number | null | undefined; color: string; dash?: string; width?: number }>,
  y: (price: number) => number,
  x: { lineStart: number; lineEnd: number; text: number; pill: number },
): string {
  const valid = levels
    .filter((level): level is { label: string; price: number; color: string; dash?: string; width?: number } => isPrice(level.price))
    .map((level) => ({ ...level, rawY: y(level.price) }))
    .sort((a, b) => a.rawY - b.rawY);

  const minGap = 42;
  for (let index = 1; index < valid.length; index += 1) {
    if (valid[index].rawY - valid[index - 1].rawY < minGap) {
      valid[index].rawY = valid[index - 1].rawY + minGap;
    }
  }
  for (let index = valid.length - 2; index >= 0; index -= 1) {
    if (valid[index + 1].rawY > 890 && valid[index + 1].rawY - valid[index].rawY < minGap) {
      valid[index].rawY = valid[index + 1].rawY - minGap;
    }
  }

  return valid.map((level) => {
    const actualY = y(level.price);
    const labelY = Math.max(36, Math.min(890, level.rawY));
    const connector = Math.abs(labelY - actualY) > 3
      ? `<line x1="${x.lineEnd - 8}" y1="${actualY}" x2="${x.pill - 6}" y2="${labelY}" stroke="${level.color}" stroke-width="1.5" opacity=".65" />`
      : '';
    return `
      <line x1="${x.lineStart}" y1="${actualY}" x2="${x.lineEnd}" y2="${actualY}" stroke="${level.color}" stroke-width="${level.width || 2}" ${level.dash ? `stroke-dasharray="${level.dash}"` : ''} />
      ${connector}
      <text x="${x.text}" y="${labelY - 10}" text-anchor="end" class="line-label" fill="${level.color}">${escapeHtml(level.label)}</text>
      <rect x="${x.pill}" y="${labelY - 17}" width="94" height="34" rx="7" fill="${level.color}" opacity="0.92" />
      <text x="${x.pill + 47}" y="${labelY + 6}" text-anchor="middle" class="price-pill">${money(level.price)}</text>
    `;
  }).join('');
}

function qualityColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return '#3cff73';
  if (ratio >= 0.6) return '#facc15';
  if (ratio > 0) return '#ff8a1c';
  return '#ef4444';
}

function scorecardItem(scorecard: DecisionQualityScoreItem[], pattern: RegExp): DecisionQualityScoreItem | null {
  return scorecard.find((item) => pattern.test(item.label)) || null;
}

function normalizedScoreItem(label: string, score: number, max: number): DecisionQualityScoreItem {
  return {
    label,
    score: Math.max(0, Math.min(max, Math.round(score))),
    max,
    status: score >= max * 0.8 ? 'strong' : score > 0 ? 'partial' : 'blocked',
    note: '',
  };
}

function alertQualityBreakdown(candidate: SetupCandidate): DecisionQualityScoreItem[] {
  const scorecard = candidate.decisionQualityScorecard || [];
  const model = scorecardItem(scorecard, /approved model|model/i);
  const execution = scorecardItem(scorecard, /5M execution|execution|trigger/i);
  const liquidity = scorecardItem(scorecard, /liquidity/i);
  const structure = scorecardItem(scorecard, /structure/i);
  const risk = scorecardItem(scorecard, /risk|target/i);
  const session = scorecardItem(scorecard, /time window|session/i);

  return [
    normalizedScoreItem(
      'Structure',
      ((structure?.score || 0) + (liquidity?.score || 0)) * 20 / Math.max(1, (structure?.max || 0) + (liquidity?.max || 0)),
      20,
    ),
    normalizedScoreItem('Model', (model?.score || (candidate.setupType ? 16 : 0)) * 20 / Math.max(1, model?.max || 20), 20),
    normalizedScoreItem('Trigger', (execution?.score || (candidate.requiredTrigger ? 12 : 0)) * 15 / Math.max(1, execution?.max || 20), 15),
    normalizedScoreItem('Risk', (risk?.score || 0) * 20 / Math.max(1, risk?.max || 20), 20),
    normalizedScoreItem('Targets', (risk?.score || 0) * 15 / Math.max(1, risk?.max || 20), 15),
    normalizedScoreItem('Conditions', (session?.score || 0) * 10 / Math.max(1, session?.max || 5), 10),
  ];
}

function renderAlertQuality(candidate: SetupCandidate): string {
  const score = candidate.decisionQualityScore ?? candidate.rankScore ?? null;
  const items = alertQualityBreakdown(candidate);
  const row = (item: DecisionQualityScoreItem, x: number, y: number) => {
    const color = qualityColor(item.score, item.max);
    const width = Math.round(58 * Math.max(0, Math.min(1, item.max > 0 ? item.score / item.max : 0)));
    return `
      <text x="${x}" y="${y}" class="alert-row">${escapeHtml(item.label)}</text>
      <rect x="${x + 64}" y="${y - 6}" width="58" height="6" rx="3" fill="#33413b" />
      <rect x="${x + 64}" y="${y - 6}" width="${width}" height="6" rx="3" fill="${color}" />
      <text x="${x + 154}" y="${y}" text-anchor="end" class="alert-points" fill="${color}">${Math.round(item.score)}/${item.max}</text>
    `;
  };
  return `
    <rect x="24" y="486" width="392" height="132" rx="7" fill="#020807" stroke="#d5c018" stroke-width="1.5" opacity=".96" />
    <text x="38" y="513" class="alert-title">ALERT QUALITY</text>
    <text x="402" y="513" text-anchor="end" class="alert-total">${score == null ? 'N/A' : `${Math.round(score)}/100`}</text>
    <line x1="38" y1="525" x2="402" y2="525" stroke="#d5c018" stroke-opacity=".28" />
    <text x="38" y="541" class="alert-sub">Score supports the read. Validation still controls status.</text>
    ${row(items[0], 38, 565)}
    ${row(items[1], 38, 586)}
    ${row(items[2], 38, 607)}
    ${row(items[3], 232, 565)}
    ${row(items[4], 232, 586)}
    ${row(items[5], 232, 607)}
  `;
}

function statusColor(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('executable') || normalized.includes('qualified')) return '#22c55e';
  if (normalized.includes('conditional')) return '#facc15';
  if (normalized.includes('review')) return '#f97316';
  if (normalized.includes('blocked') || normalized.includes('error')) return '#ef4444';
  return '#38bdf8';
}

function renderRiskSummary(model: PlanRenderModel): string {
  const border = model.validationSeverity === 'error' ? '#ef4444' : model.validationSeverity === 'review' ? '#f97316' : '#64748b';
  const targetDataError = model.validationMessages.some((message) => message.includes('Target Data Error'));
  return `
    <rect x="24" y="252" width="392" height="214" rx="9" fill="#070b0f" stroke="${border}" stroke-width="1.5" opacity=".96" />
    <text x="220" y="283" text-anchor="middle" class="panel-text">RISK SUMMARY</text>
    <text x="46" y="318" class="small">Entry Zone: <tspan fill="#4ade80">${money(model.entryLow)} - ${money(model.entryHigh)}</tspan></text>
    <text x="46" y="350" class="small">Stop: <tspan fill="#ef4444">${money(model.stop)}</tspan></text>
    <text x="46" y="382" class="small">Risk: <tspan fill="${model.validationSeverity === 'ok' ? '#f8fafc' : '#f97316'}">${model.risk ? `~${model.risk.toFixed(2)} pts` : 'N/A'}</tspan></text>
    <text x="46" y="414" class="small">T1: <tspan fill="${targetDataError ? '#ef4444' : '#facc15'}">${money(model.t1)}${targetDataError ? ' requires review' : isPrice(model.r1) ? ` (${model.r1.toFixed(1)}R)` : ''}</tspan></text>
    <text x="46" y="442" class="small">T2: <tspan fill="${targetDataError ? '#ef4444' : '#facc15'}">${money(model.t2)}${targetDataError ? ' requires review' : isPrice(model.r2) ? ` (${model.r2.toFixed(1)}R)` : ''}</tspan></text>
    <text x="46" y="462" class="small">Liquidity: <tspan fill="${targetDataError ? '#ef4444' : '#2f8cff'}">${money(model.liquidity)}${targetDataError ? ' requires review' : isPrice(model.liquidityR) ? ` (${model.liquidityR.toFixed(1)}R)` : ''}</tspan></text>
  `;
}

function renderValidationNotice(model: PlanRenderModel): string {
  if (!model.validationMessages.length) return '';
  const color = model.validationSeverity === 'error' ? '#ef4444' : '#f97316';
  const primary = model.validationMessages.find((message) => message.includes('Data Error')) || model.validationMessages[0];
  const message = compact(primary, 74);
  return `
    <rect x="466" y="126" width="620" height="42" rx="7" fill="#130807" stroke="${color}" stroke-width="1.5" opacity=".94" />
    <text x="482" y="153" class="validation" fill="${color}">${escapeHtml(message)}</text>
  `;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface ChartMarkerAnchors {
  sweep: ChartPoint | null;
  reclaim: ChartPoint | null;
  displacement: ChartPoint | null;
}

export interface ChartMarkerAnchorFact {
  candleIndex: number;
  price: number;
  timestamp?: string | null;
  source: 'event_timestamp' | 'event_candle_index' | 'crossed_swept_level';
}

export interface ChartMarkerAnchorFacts {
  sweep: ChartMarkerAnchorFact | null;
  reclaim: ChartMarkerAnchorFact | null;
  displacement: ChartMarkerAnchorFact | null;
}

function labelPoint(anchor: ChartPoint, dx: number, dy: number, maxX = 1180): ChartPoint {
  return {
    x: clamp(anchor.x + dx, 472, maxX),
    y: clamp(anchor.y + dy, 190, 865),
  };
}

function spreadLabelPoints(points: Array<ChartPoint | null>, minimumGap = 78): Array<ChartPoint | null> {
  const keyed = points
    .map((point, index) => point ? { ...point, index } : null)
    .filter((point): point is ChartPoint & { index: number } => Boolean(point))
    .sort((a, b) => a.y - b.y);
  for (let index = 1; index < keyed.length; index += 1) {
    if (keyed[index].y - keyed[index - 1].y < minimumGap) {
      keyed[index].y = keyed[index - 1].y + minimumGap;
    }
  }
  for (let index = keyed.length - 1; index >= 0; index -= 1) {
    if (keyed[index].y > 850) {
      keyed[index].y = 850;
    }
    if (index > 0 && keyed[index].y - keyed[index - 1].y < minimumGap) {
      keyed[index - 1].y = keyed[index].y - minimumGap;
    }
  }
  const spread = [...points];
  for (const point of keyed) {
    spread[point.index] = { x: point.x, y: clamp(point.y, 190, 850) };
  }
  return spread;
}

function renderNarrativeMarkers(isLong: boolean, anchors: ChartMarkerAnchors): string {
  const color = isLong ? '#4ade80' : '#fb923c';
  const accent = isLong ? '#4ade80' : '#fb923c';
  const [displacementLabel, sweepLabel, reclaimLabel] = spreadLabelPoints([
    anchors.displacement ? labelPoint(anchors.displacement, isLong ? -210 : -130, isLong ? -44 : 70, isLong ? 1180 : 1260) : null,
    anchors.sweep ? labelPoint(anchors.sweep, 22, isLong ? 24 : 22) : null,
    anchors.reclaim ? labelPoint(anchors.reclaim, 52, isLong ? 84 : 92) : null,
  ]);
  const displacementMarkup = anchors.displacement && displacementLabel
    ? isLong
      ? `
        <text x="${displacementLabel.x}" y="${displacementLabel.y}" class="marker-num">③</text>
        <text x="${displacementLabel.x + 38}" y="${displacementLabel.y - 5}" class="marker-title" fill="${accent}">Displacement Up</text>
        <text x="${displacementLabel.x + 38}" y="${displacementLabel.y + 20}" class="marker-copy">Strong bullish move</text>
        <text x="${displacementLabel.x + 38}" y="${displacementLabel.y + 44}" class="marker-copy">creates imbalance</text>
        <line x1="${displacementLabel.x + 142}" y1="${displacementLabel.y + 18}" x2="${anchors.displacement.x}" y2="${anchors.displacement.y}" stroke="#f8fafc" stroke-width="2" marker-end="url(#whiteArrow)" />
      `
      : `
        <text x="${displacementLabel.x}" y="${displacementLabel.y}" class="marker-num">③</text>
        <text x="${displacementLabel.x + 38}" y="${displacementLabel.y - 5}" class="marker-title" fill="${accent}">Failure Down</text>
        <text x="${displacementLabel.x + 38}" y="${displacementLabel.y + 20}" class="marker-copy">Failed push lower</text>
        <text x="${displacementLabel.x + 38}" y="${displacementLabel.y + 44}" class="marker-copy">confirms rejection</text>
        <line x1="${displacementLabel.x + 142}" y1="${displacementLabel.y + 18}" x2="${anchors.displacement.x}" y2="${anchors.displacement.y}" stroke="#f8fafc" stroke-width="2" marker-end="url(#whiteArrow)" />
      `
    : '';
  const sweepMarkup = anchors.sweep && sweepLabel
    ? `
      <text x="${sweepLabel.x}" y="${sweepLabel.y}" class="sweep-num">①</text>
      <text x="${sweepLabel.x + 42}" y="${sweepLabel.y - 2}" class="sweep-title">${isLong ? 'Sweep' : 'Raid'}</text>
      <text x="${sweepLabel.x + 42}" y="${sweepLabel.y + 23}" class="annotation-copy">Liquidity taken</text>
      <line x1="${sweepLabel.x + 62}" y1="${sweepLabel.y - 24}" x2="${anchors.sweep.x}" y2="${anchors.sweep.y}" stroke="#f8fafc" stroke-width="2" marker-end="url(#whiteArrow)" />
    `
    : '';
  const reclaimMarkup = anchors.reclaim && reclaimLabel
    ? `
      <text x="${reclaimLabel.x}" y="${reclaimLabel.y}" class="marker-num">②</text>
      <text x="${reclaimLabel.x + 44}" y="${reclaimLabel.y - 2}" class="marker-title" fill="${color}">Reclaim</text>
      <text x="${reclaimLabel.x + 44}" y="${reclaimLabel.y + 23}" class="annotation-copy">Close back ${isLong ? 'above' : 'below'}</text>
      <line x1="${reclaimLabel.x + 28}" y1="${reclaimLabel.y - 22}" x2="${anchors.reclaim.x}" y2="${anchors.reclaim.y}" stroke="#f8fafc" stroke-width="2" marker-end="url(#whiteArrow)" />
    `
    : '';
  if (isLong) {
    return `
      ${displacementMarkup}
      ${sweepMarkup}
      ${reclaimMarkup}
    `;
  }
  return `
    ${displacementMarkup}
    ${sweepMarkup}
    ${reclaimMarkup}
  `;
}

function renderDirectionLogo(isLong: boolean): string {
  const accent = isLong ? '#27ff69' : '#f0a236';
  const deepAccent = isLong ? '#0f7a37' : '#8c521c';
  const shadow = isLong ? '#072b1c' : '#2b1707';
  const candles = isLong
    ? `
      <rect x="13" y="42" width="3" height="12" fill="#9cff8c" opacity=".9" />
      <rect x="20" y="36" width="3" height="18" fill="#73f46e" opacity=".9" />
      <rect x="27" y="30" width="3" height="24" fill="#48db66" opacity=".9" />
    `
    : `
      <rect x="35" y="32" width="3" height="22" fill="#f7c36a" opacity=".9" />
      <rect x="42" y="38" width="3" height="16" fill="#d9953a" opacity=".9" />
      <rect x="49" y="44" width="3" height="10" fill="#b97426" opacity=".9" />
    `;
  const mark = isLong
    ? `
      <path d="M14 25 L8 10 L25 17 C30 10 38 10 43 17 L60 10 L54 25 C58 35 52 49 40 54 L32 59 L24 54 C12 49 6 35 14 25 Z" fill="${deepAccent}" stroke="#b8ffb4" stroke-width="1.2" />
      <path d="M18 25 L27 18 L37 16 L47 25 L43 41 L32 48 L21 41 Z" fill="${accent}" opacity=".82" />
      <path d="M25 18 L28 38 L19 26 M37 16 L35 39 L47 26 M28 38 L32 48 L35 39" stroke="#ccffd1" stroke-width="1" opacity=".62" />
      <path d="M22 33 L29 36 M42 33 L35 36" stroke="#020403" stroke-width="2.5" stroke-linecap="round" />
    `
    : `
      <path d="M15 24 L13 12 L25 17 C29 13 35 13 39 17 L51 12 L49 24 C56 34 50 49 39 55 L32 59 L25 55 C14 49 8 34 15 24 Z" fill="${deepAccent}" stroke="#ffe0a5" stroke-width="1.2" />
      <path d="M18 25 L29 17 L40 18 L48 28 L44 42 L32 49 L20 42 Z" fill="${accent}" opacity=".82" />
      <path d="M29 17 L25 39 L18 25 M40 18 L38 39 L48 28 M25 39 L32 49 L38 39" stroke="#ffe7b8" stroke-width="1" opacity=".58" />
      <path d="M22 34 L29 36 M42 34 L35 36" stroke="#020403" stroke-width="2.5" stroke-linecap="round" />
      <path d="M27 45 L37 45" stroke="#020403" stroke-width="2.6" stroke-linecap="round" />
    `;
  return `
    <g transform="translate(470 29)">
      <circle cx="32" cy="32" r="34" fill="#dff9ff" opacity=".22" />
      <circle cx="32" cy="32" r="31" fill="#020807" stroke="#22d3ee" stroke-width="3.2" />
      <circle cx="32" cy="32" r="27" fill="${shadow}" opacity=".92" />
      <path d="M8 55 L58 8" stroke="#22d3ee" stroke-width="2.1" opacity=".8" />
      ${candles}
      ${mark}
      <text x="32" y="56" text-anchor="middle" font-size="8.5" font-weight="950" fill="#f8fafc" opacity=".9">YMT</text>
    </g>
  `;
}

function candleTimestampMatches(candleTimestamp: string | null | undefined, eventTimestamp: string | null | undefined): boolean {
  if (!candleTimestamp || !eventTimestamp) return false;
  return candleTimestamp.slice(0, 16) === eventTimestamp.slice(0, 16);
}

function candlePosition(candles: PlanRenderModel['candles'], candle: PlanRenderModel['candles'][number] | null, xStep: number, plotLeft: number): number | null {
  if (!candle) return null;
  const visibleIndex = candles.findIndex((item) => item.index === candle.index || item.timestamp === candle.timestamp);
  return visibleIndex >= 0 ? plotLeft + visibleIndex * xStep : null;
}

function candleForAnchorFact(candles: PlanRenderModel['candles'], fact: ChartMarkerAnchorFact | null): PlanRenderModel['candles'][number] | null {
  if (!fact) return null;
  return candles.find((candle) => candle.index === fact.candleIndex) || null;
}

function eventCandleByIndexOrTimestamp(
  candles: PlanRenderModel['candles'],
  candleIndex?: number | null,
  timestamp?: string | null,
): { candle: PlanRenderModel['candles'][number]; source: ChartMarkerAnchorFact['source'] } | null {
  if (typeof candleIndex === 'number') {
    const byIndex = candles.find((candle) => candle.index === candleIndex);
    if (byIndex) return { candle: byIndex, source: 'event_candle_index' };
  }
  if (timestamp) {
    const byTimestamp = candles.find((candle) => candleTimestampMatches(candle.timestamp, timestamp));
    if (byTimestamp) return { candle: byTimestamp, source: 'event_timestamp' };
  }
  return null;
}

function sweepAnchorFact(plan: PlanRenderModel): ChartMarkerAnchorFact | null {
  const direct = eventCandleByIndexOrTimestamp(plan.candles, null, plan.sweepEvent?.timestamp || null);
  if (direct && isPrice(plan.sweep)) {
    const wickExtreme = plan.isLong ? direct.candle.low : direct.candle.high;
    return {
      candleIndex: direct.candle.index,
      timestamp: direct.candle.timestamp || null,
      price: isPrice(wickExtreme) ? wickExtreme : plan.sweep,
      source: direct.source,
    };
  }
  if (!isPrice(plan.sweep)) return null;
  const crossed = plan.candles.find((candle) => plan.isLong ? candle.low <= (plan.sweep as number) : candle.high >= (plan.sweep as number));
  if (!crossed) return null;
  return {
    candleIndex: crossed.index,
    timestamp: crossed.timestamp || null,
    price: plan.isLong ? crossed.low : crossed.high,
    source: 'crossed_swept_level',
  };
}

function resolveMarkerAnchorFactsFromPlan(plan: PlanRenderModel): ChartMarkerAnchorFacts {
  const sweep = sweepAnchorFact(plan);
  const reclaimMatch = eventCandleByIndexOrTimestamp(plan.candles, plan.reclaimEvent?.candleIndex, plan.reclaimEvent?.timestamp || null);
  const reclaim = reclaimMatch && isPrice(plan.reclaimEvent?.reclaimedLevel)
    ? {
        candleIndex: reclaimMatch.candle.index,
        timestamp: reclaimMatch.candle.timestamp || null,
        price: plan.reclaimEvent.reclaimedLevel,
        source: reclaimMatch.source,
      }
    : null;
  const displacementMatch = eventCandleByIndexOrTimestamp(plan.candles, plan.displacementEvent?.candleIndex, plan.displacementEvent?.timestamp || null);
  const displacement = displacementMatch
    ? {
        candleIndex: displacementMatch.candle.index,
        timestamp: displacementMatch.candle.timestamp || null,
        price: isPrice(plan.displacementEvent?.close)
          ? plan.displacementEvent.close
          : plan.isLong
            ? displacementMatch.candle.close || displacementMatch.candle.high
            : displacementMatch.candle.close || displacementMatch.candle.low,
        source: displacementMatch.source,
      }
    : null;

  return {
    sweep,
    reclaim,
    displacement,
  };
}

export function resolveChartMarkerAnchorFacts(input: ChartMarkupRenderInput): ChartMarkerAnchorFacts {
  return resolveMarkerAnchorFactsFromPlan(buildPlanRenderModel(input));
}

function buildMarkerAnchors(
  plan: PlanRenderModel,
  xStep: number,
  plotLeft: number,
  y: (price: number) => number,
): ChartMarkerAnchors {
  const facts = resolveMarkerAnchorFactsFromPlan(plan);
  const toPoint = (fact: ChartMarkerAnchorFact | null): ChartPoint | null => {
    const candle = candleForAnchorFact(plan.candles, fact);
    const x = candlePosition(plan.candles, candle, xStep, plotLeft);
    return fact && isPrice(x) ? { x, y: y(fact.price) } : null;
  };
  return {
    sweep: toPoint(facts.sweep),
    reclaim: toPoint(facts.reclaim),
    displacement: toPoint(facts.displacement),
  };
}

function buildChartHtml(input: ChartMarkupRenderInput): string {
  const plan = buildPlanRenderModel(input);
  const {
    candidate,
    candles,
    direction,
    isLong,
    model,
    score,
    entryLow,
    entryHigh,
    stop,
    t1,
    t2,
    liquidity,
    sweep,
    safeChartPrices,
    contextBias,
    trendBias,
    narrative,
  } = plan;
  const prices = safeChartPrices;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pad = Math.max(1, (maxPrice - minPrice) * 0.12);
  const low = minPrice - pad;
  const high = maxPrice + pad;
  const width = APPROVED_RENDER_WIDTH;
  const height = APPROVED_RENDER_HEIGHT;
  const plot = { left: 450, top: 112, right: 1426, bottom: 914 };
  const xStep = (plot.right - plot.left) / Math.max(1, candles.length - 1);
  const y = (price: number) => plot.bottom - ((price - low) / (high - low)) * (plot.bottom - plot.top);
  const markerAnchors = buildMarkerAnchors(plan, xStep, plot.left, y);
  const visibleTimeLabels = candles
    .map((candle, index) => ({ candle, index }))
    .filter((_, index, source) => index === 0 || index === source.length - 1 || index % Math.max(1, Math.floor(source.length / 6)) === 0)
    .map(({ candle, index }) => {
      const raw = String(candle.timestamp || '');
      const time = raw.match(/T(\d{2}:\d{2})/)?.[1] || raw.match(/\b(\d{2}:\d{2})\b/)?.[1] || '';
      const labelX = clamp(plot.left + index * xStep, 486, 1376);
      return time
        ? `<text x="${labelX}" y="944" text-anchor="middle" class="time-axis">${escapeHtml(time)}</text>`
        : '';
    }).join('');
  const entryZone = isPrice(entryLow) && isPrice(entryHigh)
    ? `<rect x="758" y="${y(entryHigh)}" width="648" height="${Math.max(8, y(entryLow) - y(entryHigh))}" fill="${isLong ? '#22c55e' : '#f97316'}" opacity="0.27" stroke="${isLong ? '#4ade80' : '#fb923c'}" />
       <text x="1082" y="${(y(entryHigh) + y(entryLow)) / 2 - 4}" text-anchor="middle" class="zone-title">Entry / Imbalance Pullback</text>
       <text x="1082" y="${(y(entryHigh) + y(entryLow)) / 2 + 26}" text-anchor="middle" class="zone-sub">${money(entryLow)} - ${money(entryHigh)}</text>`
    : '';
  const priceTicks = Array.from({ length: 9 }, (_, index) => low + ((high - low) / 8) * index);
  const pathColor = isLong ? '#4ade80' : '#fb923c';
  const targetsValidForChart = !plan.validationMessages.some((message) => message.includes('Target Data Error'));
  const projectedPath = targetsValidForChart && isLong && isPrice(entryHigh) && isPrice(t2)
      ? `<polyline points="1160,${y(entryHigh)} 1236,${y(t1 || entryHigh)} 1284,${y(entryHigh)} 1326,${y(t2)}" fill="none" stroke="${pathColor}" stroke-width="3" stroke-dasharray="10 9" marker-end="url(#arrow)" />`
    : targetsValidForChart && !isLong && isPrice(entryLow) && isPrice(t2)
      ? `<polyline points="1160,${y(entryLow)} 1236,${y(t1 || entryLow)} 1284,${y(entryLow)} 1326,${y(t2)}" fill="none" stroke="${pathColor}" stroke-width="3" stroke-dasharray="10 9" marker-end="url(#arrow)" />`
      : '';
  const sweepLabel = isLong ? 'Sell-side sweep' : 'Buy-side sweep';
  const sameT1T2 = isPrice(t1) && isPrice(t2) && Math.abs(t1 - t2) < 0.01;
  const managedLines = renderManagedLines([
    { label: sweepLabel, price: sweep || null, color: '#f97316', dash: '8 7', width: 2.5 },
    { label: isLong ? 'Stop below sweep low' : 'Stop above sweep high', price: stop, color: '#ef4444', width: 3 },
    targetsValidForChart && sameT1T2
      ? { label: 'T1/T2 2.0R', price: t2, color: '#facc15', dash: '8 7', width: 2.5 }
      : { label: targetsValidForChart ? 'T1 1.5R' : '', price: targetsValidForChart ? t1 : null, color: '#facc15', dash: '8 7', width: 2.5 },
    sameT1T2 ? { label: '', price: null, color: '#facc15' } : { label: targetsValidForChart ? 'T2 2.0R' : '', price: targetsValidForChart ? t2 : null, color: '#facc15', dash: '8 7', width: 2.5 },
    { label: targetsValidForChart ? (isLong ? 'Buy-side liquidity' : 'Sell-side liquidity') : '', price: targetsValidForChart ? liquidity : null, color: '#2f8cff', width: 3 },
  ], y, { lineStart: 450, lineEnd: 1426, text: 1406, pill: 1422 });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #020403; font-family: Inter, Arial, sans-serif; color: #f8fafc; }
    .wrap { width: ${width}px; height: ${height}px; background:
      radial-gradient(circle at 75% 15%, rgba(34,197,94,.16), transparent 34%),
      linear-gradient(180deg, #030703 0%, #060907 100%); position: relative; overflow: hidden; }
    svg { width: ${width}px; height: ${height}px; display: block; }
    .title { font-size: 36px; font-weight: 900; letter-spacing: 1px; }
    .subtitle { font-size: 28px; font-weight: 800; fill: #4ade80; }
    .panel-title { font-size: 26px; font-weight: 900; fill: #f8fafc; }
    .panel-text { font-size: 18px; font-weight: 800; fill: #f8fafc; }
    .small { font-size: 17px; fill: #cbd5e1; }
    .line-label { font-size: 21px; font-weight: 850; }
    .price-pill { font-size: 22px; font-weight: 900; fill: white; }
    .zone-title { font-size: 28px; font-weight: 900; fill: #f8fafc; }
    .zone-sub { font-size: 23px; font-weight: 850; fill: #f8fafc; }
    .axis { fill: #e5e7eb; font-size: 20px; font-weight: 700; }
    .time-axis { fill: #f8fafc; font-size: 21px; font-weight: 800; }
    .context-title { font-size: 21px; fill: #f8fafc; letter-spacing: 1.5px; }
    .context-mini { font-size: 15px; fill: #f8fafc; font-weight: 850; }
    .context-value { font-size: 15px; fill: #4ade80; font-weight: 850; }
    .status-badge { font-size: 15px; font-weight: 950; fill: #020403; }
    .validation { font-size: 17px; font-weight: 900; }
    .marker-num { font-size: 35px; fill: #4ade80; font-weight: 900; }
    .marker-title { font-size: 20px; font-weight: 900; }
    .marker-copy { font-size: 17px; fill: #dbeafe; }
    .annotation-copy { font-size: 17px; fill: #dbeafe; }
    .sweep-num { font-size: 36px; fill: #f59e0b; font-weight: 900; }
    .sweep-title { font-size: 20px; fill: #f59e0b; font-weight: 900; }
    .alert-title { font-size: 18px; font-weight: 950; fill: #27ff69; letter-spacing: .6px; }
    .alert-total { font-size: 19px; font-weight: 950; fill: #facc15; }
    .alert-sub { font-size: 10px; fill: #cbd5e1; }
    .alert-row { font-size: 11px; fill: #f8fafc; font-weight: 900; }
    .alert-points { font-size: 11px; font-weight: 950; }
  </style>
</head>
<body>
<div class="wrap">
<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M2,2 L10,6 L2,10" fill="none" stroke="${pathColor}" stroke-width="2.5" />
    </marker>
    <marker id="whiteArrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M2,2 L10,6 L2,10" fill="none" stroke="#f8fafc" stroke-width="2.4" />
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
  ${Array.from({ length: 12 }, (_, index) => `<line x1="${plot.left + index * ((plot.right - plot.left) / 11)}" y1="${plot.top}" x2="${plot.left + index * ((plot.right - plot.left) / 11)}" y2="${plot.bottom}" stroke="#12201c" stroke-width="1" />`).join('')}
  ${priceTicks.map((price) => {
    const yy = y(price);
    return `<line x1="${plot.left}" y1="${yy}" x2="${plot.right}" y2="${yy}" stroke="#12201c" stroke-width="1" /><text x="${plot.right + 10}" y="${clamp(yy + 7, 38, 887)}" class="axis">${money(price)}</text>`;
  }).join('')}
  ${candles.map((candle, index) => renderCandle(candle, plot.left + index * xStep, y)).join('')}
  ${entryZone}
  ${managedLines}
  ${projectedPath}
  <line x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}" stroke="#e5e7eb" stroke-width="1.3" />
  ${visibleTimeLabels}
  <rect x="14" y="20" width="428" height="214" rx="9" fill="#050908" stroke="${statusColor(plan.displayStatus)}" stroke-width="2" opacity=".96" />
  <text x="32" y="58" class="panel-title">${escapeHtml(input.instrument)} • 5M CHART</text>
  <line x1="14" y1="78" x2="442" y2="78" stroke="#334155" />
  <rect x="32" y="94" width="160" height="30" rx="15" fill="${statusColor(plan.displayStatus)}" opacity=".92" />
  <text x="112" y="115" text-anchor="middle" class="status-badge">${escapeHtml(plan.displayStatus)}</text>
  <text x="210" y="115" class="panel-text">Score: <tspan fill="#facc15">${score == null ? 'N/A' : `${Math.round(score)}/100`}</tspan></text>
  <text x="32" y="150" class="panel-text">Model: <tspan fill="#4ade80">${escapeHtml(compact(model, 31))}</tspan></text>
  <line x1="32" y1="170" x2="424" y2="170" stroke="#334155" />
  <text x="32" y="196" class="context-mini">Higher TF: <tspan class="context-value">${escapeHtml(String(contextBias))}</tspan></text>
  <text x="236" y="196" class="context-mini">Bias: <tspan class="context-value">${escapeHtml(String(trendBias))}</tspan></text>
  <text x="32" y="222" class="context-mini">Narrative: <tspan class="context-value">${escapeHtml(narrative)}</tspan></text>
  ${renderRiskSummary(plan)}
  ${renderAlertQuality(candidate)}
  ${renderDirectionLogo(isLong)}
  <text x="558" y="62" class="title" fill="#f8fafc">${direction} PLAN</text>
  <text x="558" y="99" class="subtitle">${escapeHtml(model)}</text>
  <rect x="860" y="34" width="146" height="34" rx="17" fill="${statusColor(plan.displayStatus)}" opacity=".92" />
  <text x="933" y="57" text-anchor="middle" class="status-badge">${escapeHtml(plan.displayStatus)}</text>
  <line x1="464" y1="118" x2="932" y2="118" stroke="#166534" stroke-width="2" />
  ${renderValidationNotice(plan)}
  ${renderNarrativeMarkers(isLong, markerAnchors)}
  <rect x="16" y="956" width="1504" height="56" rx="9" fill="#070b0f" stroke="#64748b" />
  <text x="44" y="991" class="small">⚠ THIS IS A DECISION SUPPORT PLAN ONLY. Not financial advice. Not predictive. No automated orders. You are responsible for all final trading decisions.</text>
</svg>
</div>
</body>
</html>`;
}

function buildLevelMapHtml(input: ChartMarkupRenderInput): string {
  const plan = buildPlanRenderModel(input);
  const width = APPROVED_RENDER_WIDTH;
  const height = APPROVED_RENDER_HEIGHT;
  const isLong = plan.isLong;
  const accent = isLong ? '#4ade80' : '#fb923c';
  const pathColor = accent;
  const validTargets = !plan.validationMessages.some((message) => message.includes('Target Data Error'));
  const levelRows = [
    { key: 'liquidity', label: isLong ? 'Buy-side Liquidity' : 'Sell-side Liquidity', price: validTargets ? plan.liquidity : null, color: '#2f8cff' },
    { key: 't2', label: nearlyEqual(plan.t1, plan.t2) ? 'T1 / T2' : 'T2 / 2.0R', price: validTargets ? plan.t2 : null, color: '#facc15' },
    { key: 't1', label: 'T1 / 1.5R', price: validTargets && !nearlyEqual(plan.t1, plan.t2) ? plan.t1 : null, color: '#facc15' },
    { key: 'entryTop', label: isLong ? 'FVG Top' : 'Entry Top', price: plan.entryHigh, color: accent },
    { key: 'entryBottom', label: isLong ? 'FVG Bottom / Entry' : 'Entry Bottom', price: plan.entryLow, color: accent },
    { key: 'sweep', label: isLong ? 'Sell-side Sweep' : 'Buy-side Sweep', price: plan.sweep, color: '#f97316' },
    { key: 'stop', label: 'Stop Loss', price: plan.stop, color: '#ef4444' },
  ].filter((row): row is { key: string; label: string; price: number; color: string } => isPrice(row.price));
  const prices = levelRows.length
    ? levelRows.map((row) => row.price)
    : plan.safeChartPrices.length
      ? plan.safeChartPrices
      : plan.candles.flatMap((candle) => [candle.high, candle.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pad = Math.max(1, (maxPrice - minPrice) * 0.18);
  const low = minPrice - pad;
  const high = maxPrice + pad;
  const map = { left: 170, top: 190, right: 1230, bottom: 840 };
  const y = (price: number) => map.bottom - ((price - low) / (high - low)) * (map.bottom - map.top);
  const entryTopY = isPrice(plan.entryHigh) ? y(plan.entryHigh) : null;
  const entryBottomY = isPrice(plan.entryLow) ? y(plan.entryLow) : null;
  const stopY = isPrice(plan.stop) ? y(plan.stop) : null;
  const rewardEnd = validTargets && isPrice(plan.liquidity) ? y(plan.liquidity) : validTargets && isPrice(plan.t2) ? y(plan.t2) : null;
  const entryMid = isPrice(entryTopY) && isPrice(entryBottomY) ? (entryTopY + entryBottomY) / 2 : null;
  const riskZone = isPrice(entryMid) && isPrice(stopY)
    ? `<rect x="${map.left}" y="${Math.min(entryMid, stopY)}" width="${map.right - map.left}" height="${Math.max(8, Math.abs(stopY - entryMid))}" fill="#ef4444" opacity=".13" />`
    : '';
  const rewardZone = isPrice(entryMid) && isPrice(rewardEnd)
    ? `<rect x="${map.left}" y="${Math.min(entryMid, rewardEnd)}" width="${map.right - map.left}" height="${Math.max(8, Math.abs(rewardEnd - entryMid))}" fill="#facc15" opacity=".10" />`
    : '';
  const entryZone = isPrice(entryTopY) && isPrice(entryBottomY)
    ? `<rect x="${map.left}" y="${Math.min(entryTopY, entryBottomY)}" width="${map.right - map.left}" height="${Math.max(10, Math.abs(entryBottomY - entryTopY))}" fill="${accent}" opacity=".24" stroke="${accent}" stroke-width="2" />`
    : '';
  const validation = plan.validationMessages.length
    ? `<rect x="112" y="878" width="1312" height="54" rx="8" fill="#130807" stroke="${plan.validationSeverity === 'error' ? '#ef4444' : '#f97316'}" />
       <text x="768" y="912" text-anchor="middle" class="validation" fill="${plan.validationSeverity === 'error' ? '#ef4444' : '#f97316'}">${escapeHtml(compact(plan.validationMessages.find((message) => message.includes('Data Error')) || plan.validationMessages[0], 110))}</text>`
    : '';
  const positionedRows = levelRows
    .sort((a, b) => y(a.price) - y(b.price))
    .map((row) => ({ ...row, actualY: y(row.price), labelY: y(row.price) }));
  for (let index = 1; index < positionedRows.length; index += 1) {
    if (positionedRows[index].labelY - positionedRows[index - 1].labelY < 44) {
      positionedRows[index].labelY = positionedRows[index - 1].labelY + 44;
    }
  }
  for (let index = positionedRows.length - 2; index >= 0; index -= 1) {
    if (positionedRows[index + 1].labelY > map.bottom - 26 && positionedRows[index + 1].labelY - positionedRows[index].labelY < 44) {
      positionedRows[index].labelY = positionedRows[index + 1].labelY - 44;
    }
  }
  const rows = positionedRows.length
    ? positionedRows
    .map((row) => {
      const yy = row.actualY;
      const labelY = clamp(row.labelY, map.top + 30, map.bottom - 30);
      const connector = Math.abs(labelY - yy) > 3
        ? `<line x1="${map.right}" y1="${yy}" x2="${map.right + 24}" y2="${labelY}" stroke="${row.color}" stroke-width="1.5" opacity=".55" />`
        : '';
      return `
        <line x1="${map.left}" y1="${yy}" x2="${map.right}" y2="${yy}" stroke="${row.color}" stroke-width="2.5" ${row.key === 't1' || row.key === 't2' ? 'stroke-dasharray="8 7"' : ''} />
        ${connector}
        <text x="${map.left + 28}" y="${labelY - 12}" class="map-label" fill="${row.color}">${escapeHtml(row.label)}</text>
        <rect x="${map.right + 26}" y="${labelY - 20}" width="126" height="40" rx="7" fill="${row.color}" opacity=".92" />
        <text x="${map.right + 89}" y="${labelY + 7}" text-anchor="middle" class="map-price">${money(row.price)}</text>
      `;
    }).join('')
    : `
        <text x="768" y="492" text-anchor="middle" class="map-label" fill="#f97316">Price Level Map unavailable</text>
        <text x="768" y="534" text-anchor="middle" class="small">No validated entry, stop, target, sweep, or liquidity levels were available.</text>
      `;
  const rrNote = validTargets
    ? `Risk ${plan.risk ? plan.risk.toFixed(2) : 'N/A'} pts • T1 ${isPrice(plan.r1) ? plan.r1.toFixed(1) : 'N/A'}R • T2 ${isPrice(plan.r2) ? plan.r2.toFixed(1) : 'N/A'}R • Liquidity ${isPrice(plan.liquidityR) ? plan.liquidityR.toFixed(1) : 'N/A'}R`
    : 'Targets require validation before execution.';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { margin: 0; background: #020403; font-family: Inter, Arial, sans-serif; color: #f8fafc; }
    .wrap { width: ${width}px; height: ${height}px; background:
      radial-gradient(circle at 74% 18%, rgba(56,189,248,.13), transparent 34%),
      linear-gradient(180deg, #030703 0%, #060907 100%); overflow: hidden; }
    svg { width: ${width}px; height: ${height}px; display: block; }
    .title { font-size: 54px; font-weight: 950; letter-spacing: 1px; fill: #f8fafc; }
    .subtitle { font-size: 28px; font-weight: 850; fill: ${accent}; }
    .small { font-size: 21px; fill: #cbd5e1; font-weight: 750; }
    .map-label { font-size: 26px; font-weight: 950; }
    .map-price { font-size: 25px; font-weight: 950; fill: white; }
    .panel-title { font-size: 24px; font-weight: 950; fill: #f8fafc; }
    .validation { font-size: 22px; font-weight: 950; }
  </style>
</head>
<body>
<div class="wrap">
<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
  ${Array.from({ length: 12 }, (_, index) => `<line x1="${120 + index * 116}" y1="120" x2="${120 + index * 116}" y2="862" stroke="#12201c" stroke-width="1" />`).join('')}
  ${Array.from({ length: 8 }, (_, index) => `<line x1="112" y1="${190 + index * 92}" x2="1424" y2="${190 + index * 92}" stroke="#12201c" stroke-width="1" />`).join('')}
  ${renderDirectionLogo(isLong).replace('translate(470 29)', 'translate(112 42)')}
  <text x="202" y="88" class="title">${plan.direction} LEVEL MAP</text>
  <text x="204" y="126" class="subtitle">${escapeHtml(plan.model)}</text>
  <rect x="1114" y="50" width="286" height="50" rx="25" fill="${statusColor(plan.displayStatus)}" opacity=".92" />
  <text x="1257" y="83" text-anchor="middle" class="panel-title" fill="#020403">${escapeHtml(plan.displayStatus)}</text>
  <text x="204" y="162" class="small">${escapeHtml(input.instrument)} • ${escapeHtml(input.sessionLabel.toUpperCase())} • Same data as chart and risk summary</text>
  <rect x="${map.left}" y="${map.top}" width="${map.right - map.left}" height="${map.bottom - map.top}" rx="12" fill="#030807" stroke="#164e63" stroke-width="2" opacity=".94" />
  ${rewardZone}
  ${riskZone}
  ${entryZone}
  ${rows}
  <rect x="112" y="886" width="1312" height="54" rx="8" fill="#070b0f" stroke="#64748b" opacity=".9" />
  <text x="768" y="920" text-anchor="middle" class="small">${escapeHtml(rrNote)}</text>
  ${validation}
  <rect x="16" y="956" width="1504" height="56" rx="9" fill="#070b0f" stroke="#64748b" />
  <text x="768" y="991" text-anchor="middle" class="small">Decision Support Only • No automated orders • Levels must match the active app-owned trade plan</text>
</svg>
</div>
</body>
</html>`;
}

export async function verifyApprovedDailyTradePlanRender(outputPath: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const bytes = await fs.readFile(outputPath);
  if (bytes.length < 24) return { ok: false, reason: 'render file is too small' };
  const pngSignature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== pngSignature) {
    return { ok: false, reason: 'render is not a PNG file' };
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== APPROVED_RENDER_WIDTH || height !== APPROVED_RENDER_HEIGHT) {
    return { ok: false, reason: `render dimensions ${width}x${height} do not match approved ${APPROVED_RENDER_WIDTH}x${APPROVED_RENDER_HEIGHT}` };
  }
  if (bytes.length < 50_000) return { ok: false, reason: 'render file size is unexpectedly small' };
  return { ok: true };
}

export async function renderChartMarkup(input: ChartMarkupRenderInput): Promise<string | null> {
  if (!input.candidate || !input.chartContext?.candles?.length) return null;
  const outputDir = input.outputDir || DEFAULT_OUTPUT_DIR;
  await fs.mkdir(outputDir, { recursive: true });
  const safePrefix = (input.filePrefix || `${input.tradeDate}-${input.sessionLabel}-${input.candidate.direction}`).replace(/[^a-z0-9_-]+/gi, '-');
  const outputPath = path.join(outputDir, `${safePrefix}-${Date.now()}.png`);
  const html = buildChartHtml(input);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: APPROVED_RENDER_WIDTH, height: APPROVED_RENDER_HEIGHT }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
    const verification = await verifyApprovedDailyTradePlanRender(outputPath);
    if (verification.ok === false) {
      await fs.rm(outputPath, { force: true });
      throw new Error(`Approved daily trade plan render failed QA: ${verification.reason}`);
    }
    return outputPath;
  } finally {
    await browser.close();
  }
}

export async function renderPriceLevelMap(input: ChartMarkupRenderInput): Promise<string | null> {
  if (!input.candidate || !input.chartContext?.candles?.length) return null;
  const outputDir = input.outputDir || DEFAULT_OUTPUT_DIR;
  await fs.mkdir(outputDir, { recursive: true });
  const safePrefix = (input.filePrefix || `${input.tradeDate}-${input.sessionLabel}-${input.candidate.direction}`).replace(/[^a-z0-9_-]+/gi, '-');
  const outputPath = path.join(outputDir, `${safePrefix}-${LEVEL_MAP_SUFFIX}-${Date.now()}.png`);
  const html = buildLevelMapHtml(input);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: APPROVED_RENDER_WIDTH, height: APPROVED_RENDER_HEIGHT }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
    const verification = await verifyApprovedDailyTradePlanRender(outputPath);
    if (verification.ok === false) {
      await fs.rm(outputPath, { force: true });
      throw new Error(`Approved price level map render failed QA: ${verification.reason}`);
    }
    return outputPath;
  } finally {
    await browser.close();
  }
}
