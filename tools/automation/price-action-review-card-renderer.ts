import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PriceActionReviewBar, PriceActionReviewCardModel } from '../../src/agents/priceActionReviewCardAgent';
import { renderHtmlToApprovedPng, validatePngFile } from './render-html-to-png';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PRICE_ACTION_REVIEW_CARD_WIDTH = 1536;
export const PRICE_ACTION_REVIEW_CARD_HEIGHT = 1024;
export const DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR = path.join(__dirname, 'research-review-charts', 'price-action-review-cards');
const LOGO_PATH = path.resolve(__dirname, '../../brand-assets/x-profile/YourMomsTrader-X-avatar-800x800.png');

export interface PriceActionReviewCardRenderInput {
  model: PriceActionReviewCardModel;
  outputPath?: string;
  outputDir?: string;
  filePrefix?: string;
}

export interface PriceActionReviewChartMetadata {
  timeframe: '5m' | '15m';
  barsRendered: number;
  xAxisLabelsRendered: boolean;
  yAxisLabelsRendered: boolean;
  priceRange: { min: number; max: number } | null;
  timeRange: { from: string; to: string } | null;
  overlayLevelsAttempted: number;
  overlayLevelsRendered: number;
  candleRangeCoveragePct: number;
  labelCollisionRisk: 'low' | 'medium' | 'high';
}

export interface PriceActionReviewCardRenderMetadata {
  outputPath: string;
  renderedPng: boolean;
  renderedSvg: false;
  mainChart: PriceActionReviewChartMetadata;
  contextChart: PriceActionReviewChartMetadata;
  visualQuality: 'pass' | 'warn' | 'fail';
  cardAttachable: boolean;
  directionConsistency: 'pass' | 'fail' | 'unknown';
  candleRangeCoveragePct: number;
  labelCollisionRisk: 'low' | 'medium' | 'high';
  chartWithheldReason?: string;
  warnings: string[];
}

export interface PriceActionReviewCardRenderResult extends PriceActionReviewCardRenderMetadata {
  outputPath: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'price-action-review-card';
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parsePriceLabel(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function directionFromModel(model: PriceActionReviewCardModel): 'LONG' | 'SHORT' | 'UNKNOWN' {
  const direction = model.directionWindowLabel.split('/')[0]?.trim().toUpperCase();
  if (direction === 'LONG') return 'LONG';
  if (direction === 'SHORT') return 'SHORT';
  return 'UNKNOWN';
}

function priceLabel(value: string): string {
  const parsed = parsePriceLabel(value);
  return parsed === null ? escapeHtml(value) : parsed.toFixed(2);
}

function visibleTime(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] || value.slice(11, 16) || value;
}

function uniqueTickIndexes(length: number, requested: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const count = Math.min(length, requested);
  return [...new Set(Array.from({ length: count }, (_, index) => Math.round((index / (count - 1)) * (length - 1))))];
}

function priceTicks(low: number, high: number, count: number): number[] {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return [];
  if (Math.abs(high - low) < 0.01) return [low];
  return Array.from({ length: count }, (_, index) => high - ((high - low) / (count - 1)) * index);
}

function labelCollisionRisk(positions: number[], compact = false): 'low' | 'medium' | 'high' {
  if (positions.length < 2) return 'low';
  const sorted = [...positions].sort((left, right) => left - right);
  const minGap = sorted.slice(1).reduce((smallest, value, index) => Math.min(smallest, Math.abs(value - sorted[index])), Number.POSITIVE_INFINITY);
  if (minGap < (compact ? 8 : 12)) return 'high';
  if (minGap < (compact ? 14 : 24)) return 'medium';
  return 'low';
}

function chartSvg(args: {
  title: string;
  timeframe: '5m' | '15m';
  bars: PriceActionReviewBar[];
  levels: Array<{ label: string; value: string; color: string }>;
  width: number;
  height: number;
  compact?: boolean;
}): { html: string; metadata: PriceActionReviewChartMetadata; warnings: string[] } {
  const { width, height } = args;
  const left = args.compact ? 50 : 74;
  const right = args.compact ? 94 : 146;
  const top = args.compact ? 42 : 58;
  const bottom = args.compact ? 44 : 64;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const bars = args.bars.filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(isPrice));
  const levelPrices = args.levels.map((level) => parsePriceLabel(level.value)).filter((value): value is number => value !== null);
  const prices = [
    ...bars.flatMap((bar) => [bar.high, bar.low]),
    ...levelPrices,
  ];
  const candlePrices = bars.flatMap((bar) => [bar.high, bar.low]);
  const candleLow = candlePrices.length ? Math.min(...candlePrices) : null;
  const candleHigh = candlePrices.length ? Math.max(...candlePrices) : null;
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 1;
  const padding = Math.max(1, (max - min) * 0.14);
  const low = min - padding;
  const high = max + padding;
  const y = (price: number) => top + ((high - price) / Math.max(0.01, high - low)) * chartHeight;
  const x = (index: number) => left + (bars.length <= 1 ? chartWidth / 2 : (index / (bars.length - 1)) * chartWidth);
  const candleWidth = args.compact ? 9 : 18;
  const warnings: string[] = [];
  if (bars.length < 2) warnings.push(`Insufficient ${args.timeframe} bars for reliable axis rendering.`);
  const yTickValues = priceTicks(low, high, args.compact ? 3 : 5);
  const xTickIndexes = uniqueTickIndexes(bars.length, args.compact ? 2 : 4);
  const grid = yTickValues.map((price) => {
    const gy = y(price);
    return [
      `<line x1="${left}" y1="${gy}" x2="${left + chartWidth}" y2="${gy}" stroke="rgba(148,163,184,0.16)" stroke-width="1" />`,
      `<text x="${left - 10}" y="${gy + 4}" class="price-axis" text-anchor="end">${price.toFixed(2)}</text>`,
    ].join('');
  }).join('');
  const candles = bars.map((bar, index) => {
    const bullish = bar.close >= bar.open;
    const color = bullish ? '#22c55e' : '#ef4444';
    const cx = x(index);
    const bodyTop = y(Math.max(bar.open, bar.close));
    const bodyBottom = y(Math.min(bar.open, bar.close));
    return [
      `<line x1="${cx}" y1="${y(bar.high)}" x2="${cx}" y2="${y(bar.low)}" stroke="${color}" stroke-width="2" />`,
      `<rect x="${cx - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${Math.max(3, bodyBottom - bodyTop)}" rx="2" fill="${color}" />`,
    ].join('');
  }).join('');
  let renderedLevels = 0;
  const levelPositions: number[] = [];
  const levels = args.levels.map((level, index) => {
    const price = parsePriceLabel(level.value);
    if (price === null) return '';
    renderedLevels += 1;
    const ly = y(price);
    levelPositions.push(ly);
    const labelY = Math.max(top + 14, Math.min(top + chartHeight - 6, ly - 4 + index * 2));
    return [
      `<line x1="${left}" y1="${ly}" x2="${left + chartWidth}" y2="${ly}" stroke="${level.color}" stroke-width="2" stroke-dasharray="8 7" opacity="0.9" />`,
      `<text x="${left + chartWidth + 10}" y="${labelY}" class="axis-label" fill="${level.color}">${escapeHtml(level.label)} ${price.toFixed(2)}</text>`,
    ].join('');
  }).join('');
  const times = bars.length ? [
    ...xTickIndexes.map((index) => {
      const labelX = x(index);
      const anchor = index === 0 ? 'start' : index === bars.length - 1 ? 'end' : 'middle';
      return `<text x="${labelX}" y="${height - 18}" class="time" text-anchor="${anchor}">${escapeHtml(visibleTime(bars[index].time))}</text>`;
    }),
  ].join('') : `<text x="${left}" y="${top + 36}" class="empty">No valid provided bars available.</text>`;

  const html = `
    <svg class="chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(args.title)}">
      <style>
        .chart-title { fill: #f8fafc; font: 800 ${args.compact ? 15 : 25}px Arial, sans-serif; letter-spacing: 0; }
        .axis-label { font: 800 ${args.compact ? 10 : 14}px Arial, sans-serif; letter-spacing: 0; }
        .price-axis { fill: #cbd5e1; font: 800 ${args.compact ? 9 : 12}px Arial, sans-serif; letter-spacing: 0; }
        .time { fill: #cbd5e1; font: 800 ${args.compact ? 9 : 12}px Arial, sans-serif; letter-spacing: 0; }
        .empty { fill: #f97316; font: 700 16px Arial, sans-serif; letter-spacing: 0; }
      </style>
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#0b1018" stroke="rgba(56,189,248,0.22)" />
      <text x="${left}" y="${args.compact ? 28 : 38}" class="chart-title">${escapeHtml(args.title)}</text>
      ${grid}
      ${levels}
      ${candles}
      ${times}
    </svg>
  `;
  return {
    html,
    metadata: {
      timeframe: args.timeframe,
      barsRendered: bars.length,
      xAxisLabelsRendered: xTickIndexes.length > 0,
      yAxisLabelsRendered: yTickValues.length > 0,
      priceRange: prices.length ? { min: low, max: high } : null,
      timeRange: bars.length ? { from: bars[0].time, to: bars[bars.length - 1].time } : null,
      overlayLevelsAttempted: args.levels.length,
      overlayLevelsRendered: renderedLevels,
      candleRangeCoveragePct: candleLow !== null && candleHigh !== null
        ? ((candleHigh - candleLow) / Math.max(0.01, high - low)) * 100
        : 0,
      labelCollisionRisk: labelCollisionRisk(levelPositions, args.compact),
    },
    warnings,
  };
}

function evaluateDirectionConsistency(model: PriceActionReviewCardModel): { status: 'pass' | 'fail' | 'unknown'; warning?: string } {
  const direction = directionFromModel(model);
  const entry = parsePriceLabel(model.hypotheticalEntryLabel);
  const stop = parsePriceLabel(model.hypotheticalStopLossLabel);
  const t1 = parsePriceLabel(model.hypotheticalT1Label);
  const t2 = parsePriceLabel(model.hypotheticalT2Label);
  if (direction === 'UNKNOWN' || entry === null || stop === null || t1 === null || t2 === null) {
    return { status: 'unknown', warning: 'Overlay direction check could not be completed because direction or overlay levels are unavailable.' };
  }
  const valid = direction === 'LONG'
    ? stop < entry && t1 >= entry && t2 >= t1
    : stop > entry && t1 <= entry && t2 <= t1;
  if (!valid) return { status: 'fail', warning: `Overlay direction check failed for ${direction} sample.` };
  return { status: 'pass' };
}

function evaluateVisualQuality(args: {
  model: PriceActionReviewCardModel;
  mainChart: PriceActionReviewChartMetadata;
  contextChart: PriceActionReviewChartMetadata;
  warnings: string[];
}): Pick<PriceActionReviewCardRenderMetadata, 'visualQuality' | 'cardAttachable' | 'directionConsistency' | 'candleRangeCoveragePct' | 'labelCollisionRisk' | 'chartWithheldReason' | 'warnings'> {
  const warnings = [...args.warnings];
  const direction = evaluateDirectionConsistency(args.model);
  if (direction.warning) warnings.push(direction.warning);
  const coverage = args.mainChart.candleRangeCoveragePct;
  const collisionRisk = args.mainChart.labelCollisionRisk === 'high' || args.contextChart.labelCollisionRisk === 'high'
    ? 'high'
    : args.mainChart.labelCollisionRisk === 'medium' || args.contextChart.labelCollisionRisk === 'medium'
      ? 'medium'
      : 'low';
  const failReasons: string[] = [];
  if (direction.status === 'fail') failReasons.push(direction.warning || 'Overlay direction check failed.');
  if (coverage > 0 && coverage < 35) failReasons.push(`Candle range occupies ${coverage.toFixed(1)}% of the plotted 5M y-axis after overlay levels.`);
  if (collisionRisk === 'high') failReasons.push('Overlay label collision risk is high.');
  if (failReasons.length) {
    const reason = `Price action card withheld: ${failReasons.join(' ')}`;
    return {
      visualQuality: 'fail',
      cardAttachable: false,
      directionConsistency: direction.status,
      candleRangeCoveragePct: coverage,
      labelCollisionRisk: collisionRisk,
      chartWithheldReason: reason,
      warnings: [reason, ...warnings],
    };
  }
  const warn = direction.status === 'unknown' || collisionRisk === 'medium' || (coverage > 0 && coverage < 50);
  return {
    visualQuality: warn ? 'warn' : 'pass',
    cardAttachable: true,
    directionConsistency: direction.status,
    candleRangeCoveragePct: coverage,
    labelCollisionRisk: collisionRisk,
    warnings,
  };
}

function metric(label: string, value: string, tone = 'neutral'): string {
  return `<div class="metric ${tone}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function row(label: string, value: string): string {
  return `<div class="info-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function phraseLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function logoDataUri(): string {
  if (!existsSync(LOGO_PATH)) return '';
  const bytes = readFileSync(LOGO_PATH);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

export function buildPriceActionReviewCardRenderDocument(model: PriceActionReviewCardModel): { html: string; metadata: Omit<PriceActionReviewCardRenderMetadata, 'outputPath' | 'renderedPng' | 'renderedSvg'> } {
  const logoUrl = logoDataUri() || pathToFileURL(LOGO_PATH).toString();
  const levels = [
    { label: 'Entry', value: model.hypotheticalEntryLabel, color: '#22c55e' },
    { label: 'Stop', value: model.hypotheticalStopLossLabel, color: '#ef4444' },
    { label: 'T1', value: model.hypotheticalT1Label, color: '#facc15' },
    { label: 'T2', value: model.hypotheticalT2Label, color: '#38bdf8' },
  ];
  const warnings = model.warnings.length
    ? model.warnings.slice(0, 3).map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')
    : '<li>No missing-data warnings for provided Phase 2 inputs.</li>';
  const mainChart = chartSvg({ title: '5M Price Action - Research Review Window', timeframe: '5m', bars: model.bars5m, levels, width: 1034, height: 500 });
  const contextChart = chartSvg({ title: '15M Context', timeframe: '15m', bars: model.bars15m, levels: levels.slice(0, 2), width: 350, height: 158, compact: true });
  const quality = evaluateVisualQuality({
    model,
    mainChart: mainChart.metadata,
    contextChart: contextChart.metadata,
    warnings: [...model.warnings, ...mainChart.warnings, ...contextChart.warnings],
  });

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        width: ${PRICE_ACTION_REVIEW_CARD_WIDTH}px;
        height: ${PRICE_ACTION_REVIEW_CARD_HEIGHT}px;
        overflow: hidden;
        background: #05070b;
        color: #f8fafc;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        padding: 40px;
        background:
          radial-gradient(circle at 18% 0%, rgba(56,189,248,0.12), transparent 26%),
          linear-gradient(135deg, #05070b 0%, #0b111b 55%, #05070b 100%);
      }
      .card {
        position: relative;
        width: 100%;
        height: 100%;
        border: 1px solid rgba(56,189,248,0.32);
        background: rgba(5, 9, 14, 0.94);
        overflow: hidden;
      }
      .watermark {
        position: absolute;
        left: 190px;
        top: 410px;
        transform: rotate(-18deg);
        font-size: 96px;
        font-weight: 900;
        color: rgba(255,255,255,0.025);
        letter-spacing: 4px;
        white-space: nowrap;
        pointer-events: none;
      }
      .header {
        position: relative;
        display: flex;
        gap: 20px;
        align-items: center;
        padding: 26px 30px 20px 30px;
        border-bottom: 1px solid rgba(148,163,184,0.22);
      }
      .logo {
        width: 70px;
        height: 70px;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid rgba(56,189,248,0.42);
        flex: 0 0 auto;
      }
      .headline {
        flex: 1 1 auto;
        min-width: 0;
      }
      .brand {
        color: #38bdf8;
        font-size: 16px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }
      .title {
        margin-top: 7px;
        font-size: 32px;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1.12;
        max-width: 930px;
      }
      .meta {
        width: 310px;
        color: #dbeafe;
        font-size: 14px;
        line-height: 1.45;
        font-weight: 700;
        display: grid;
        grid-template-columns: 84px 1fr;
        gap: 4px 10px;
        padding: 12px 14px;
        border: 1px solid rgba(56,189,248,0.24);
        background: rgba(8, 15, 26, 0.72);
      }
      .meta span {
        color: #7dd3fc;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .meta strong {
        color: #f8fafc;
        overflow-wrap: anywhere;
      }
      .body {
        position: relative;
        display: grid;
        grid-template-columns: 1fr 350px;
        gap: 20px;
        padding: 22px 26px 18px 26px;
      }
      .main-chart {
        height: 500px;
        border: 1px solid rgba(148,163,184,0.18);
        background: rgba(2,6,12,0.55);
      }
      .side {
        display: grid;
        grid-template-rows: 158px 1fr;
        gap: 16px;
      }
      .panel {
        border: 1px solid rgba(148,163,184,0.18);
        background: rgba(15,23,42,0.62);
        padding: 16px;
      }
      .panel-title {
        color: #38bdf8;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.4px;
        margin-bottom: 12px;
      }
      .info-row, .metric {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
        min-height: 34px;
        border-bottom: 1px solid rgba(148,163,184,0.10);
      }
      .info-row span, .metric span {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.2px;
        flex: 0 0 auto;
      }
      .info-row strong, .metric strong {
        color: #f8fafc;
        font-size: 15px;
        font-weight: 800;
        overflow-wrap: anywhere;
        text-align: right;
        line-height: 1.25;
      }
      .metric.green strong { color: #22c55e; }
      .metric.red strong { color: #ef4444; }
      .metric.gold strong { color: #facc15; }
      .metric.cyan strong { color: #38bdf8; }
      .level-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 10px;
      }
      .state-grid {
        display: grid;
        grid-template-columns: 0.85fr 0.85fr 0.9fr 1.4fr;
        gap: 10px;
      }
      .level-grid .metric, .state-grid .metric {
        display: block;
        min-height: 58px;
        padding: 9px 12px;
        border: 1px solid rgba(148,163,184,0.14);
        background: rgba(2, 6, 12, 0.36);
      }
      .level-grid .metric span, .state-grid .metric span {
        display: block;
        margin-bottom: 6px;
      }
      .level-grid .metric strong, .state-grid .metric strong {
        display: block;
        text-align: left;
        font-size: 15px;
        line-height: 1.2;
      }
      .bottom {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 18px;
        padding: 0 26px;
        height: 122px;
      }
      .bottom > .panel {
        height: 122px;
        overflow: hidden;
      }
      .warning-list {
        margin: 12px 0 0 0;
        padding-left: 16px;
        color: #fbbf24;
        font-size: 11px;
        line-height: 1.35;
        font-weight: 700;
      }
      .footer {
        position: absolute;
        left: 26px;
        right: 26px;
        bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(148,163,184,0.22);
        padding-top: 14px;
        color: #cbd5e1;
        font-size: 15px;
        font-weight: 800;
      }
      .footer strong { color: #22c55e; }
    </style>
  </head>
  <body>
    <section class="card">
      <div class="watermark">YourMomsTrader</div>
      <header class="header">
        <img class="logo" src="${logoUrl}" />
        <div class="headline">
          <div class="brand">YourMomsTrader Research Review</div>
          <div class="title">${escapeHtml(model.headerText)}</div>
        </div>
        <div class="meta">
          <span>Symbol</span><strong>${escapeHtml(model.symbol)}</strong>
          <span>Contract</span><strong>${escapeHtml(model.contract)}</strong>
          <span>Date / Time</span><strong>${escapeHtml(model.dateTimeLabel)}</strong>
          <span>Sample</span><strong>${escapeHtml(model.sampleId)}</strong>
        </div>
      </header>
      <main class="body">
        <div class="main-chart">
          ${mainChart.html}
        </div>
        <aside class="side">
          ${contextChart.html}
          <section class="panel">
            <div class="panel-title">Review Rail</div>
            ${row('Concept', model.conceptLabel)}
            ${row('Direction / Window', model.directionWindowLabel)}
            ${row('Agent Recommendation', model.agentRecommendationLabel)}
            ${row('Approved', model.approvedDisplay)}
          </section>
        </aside>
      </main>
      <section class="bottom">
        <section class="panel">
          <div class="panel-title">Hypothetical Overlay Levels</div>
          <div class="level-grid">
            ${metric('Entry', priceLabel(model.hypotheticalEntryLabel), 'green')}
            ${metric('Stop Loss', priceLabel(model.hypotheticalStopLossLabel), 'red')}
            ${metric('Target', priceLabel(model.hypotheticalTargetLabel), 'gold')}
            ${metric('Take Profit', priceLabel(model.hypotheticalTakeProfitLabel), 'cyan')}
            ${metric('T1', priceLabel(model.hypotheticalT1Label), 'gold')}
            ${metric('T2', priceLabel(model.hypotheticalT2Label), 'cyan')}
          </div>
        </section>
        <section class="panel">
          <div class="panel-title">Review State</div>
          <div class="state-grid">
            ${metric('Execute', model.hypotheticalExecuteStatus)}
            ${metric('Trade Alert', model.hypotheticalTradeAlertStatus)}
            ${metric('Buy/Sell Now', model.hypotheticalBuySellDisplay)}
            ${metric('Outcome', phraseLabel(model.outcomeLabel))}
          </div>
          <ul class="warning-list">${warnings}</ul>
        </section>
      </section>
      <footer class="footer">
        <span><strong>Research Review Only</strong> | ${escapeHtml(model.footerText)}</span>
        <span>PNG artifact only</span>
      </footer>
    </section>
  </body>
</html>`;
  return {
    html,
    metadata: {
      mainChart: mainChart.metadata,
      contextChart: contextChart.metadata,
      visualQuality: quality.visualQuality,
      cardAttachable: quality.cardAttachable,
      directionConsistency: quality.directionConsistency,
      candleRangeCoveragePct: quality.candleRangeCoveragePct,
      labelCollisionRisk: quality.labelCollisionRisk,
      ...(quality.chartWithheldReason ? { chartWithheldReason: quality.chartWithheldReason } : {}),
      warnings: quality.warnings,
    },
  };
}

export function buildPriceActionReviewCardHtmlForTest(model: PriceActionReviewCardModel): string {
  return buildPriceActionReviewCardRenderDocument(model).html;
}

function defaultOutputPath(input: PriceActionReviewCardRenderInput): string {
  const prefix = input.filePrefix || `price-action-review-card-${input.model.symbol}-${input.model.sampleId}`;
  return path.join(input.outputDir || DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR, `${safeFilePart(prefix)}.png`);
}

export async function renderPriceActionReviewCard(input: PriceActionReviewCardRenderInput): Promise<string> {
  return (await renderPriceActionReviewCardWithMetadata(input)).outputPath;
}

export async function renderPriceActionReviewCardWithMetadata(input: PriceActionReviewCardRenderInput): Promise<PriceActionReviewCardRenderResult> {
  const outputPath = path.resolve(input.outputPath || defaultOutputPath(input));
  const document = buildPriceActionReviewCardRenderDocument(input.model);
  const rendered = await renderHtmlToApprovedPng({
    html: document.html,
    outputPath,
    viewport: { width: PRICE_ACTION_REVIEW_CARD_WIDTH, height: PRICE_ACTION_REVIEW_CARD_HEIGHT },
    expectedWidth: PRICE_ACTION_REVIEW_CARD_WIDTH,
    expectedHeight: PRICE_ACTION_REVIEW_CARD_HEIGHT,
    minBytes: 20_000,
    failureLabel: 'PriceActionReviewCard render',
  });
  const verification = await validatePngFile(rendered, {
    expectedWidth: PRICE_ACTION_REVIEW_CARD_WIDTH,
    expectedHeight: PRICE_ACTION_REVIEW_CARD_HEIGHT,
    minBytes: 20_000,
  });
  if (verification.ok === false) throw new Error(`PriceActionReviewCard PNG validation failed: ${verification.reason}`);
  return {
    outputPath: rendered,
    renderedPng: true,
    renderedSvg: false,
    mainChart: document.metadata.mainChart,
    contextChart: document.metadata.contextChart,
    visualQuality: document.metadata.visualQuality,
    cardAttachable: document.metadata.cardAttachable,
    directionConsistency: document.metadata.directionConsistency,
    candleRangeCoveragePct: document.metadata.candleRangeCoveragePct,
    labelCollisionRisk: document.metadata.labelCollisionRisk,
    ...(document.metadata.chartWithheldReason ? { chartWithheldReason: document.metadata.chartWithheldReason } : {}),
    warnings: document.metadata.warnings,
  };
}
