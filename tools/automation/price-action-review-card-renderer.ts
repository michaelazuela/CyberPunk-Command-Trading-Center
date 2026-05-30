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

function priceLabel(value: string): string {
  const parsed = parsePriceLabel(value);
  return parsed === null ? escapeHtml(value) : parsed.toFixed(2);
}

function visibleTime(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] || value.slice(11, 16) || value;
}

function chartSvg(args: {
  title: string;
  bars: PriceActionReviewBar[];
  levels: Array<{ label: string; value: string; color: string }>;
  width: number;
  height: number;
  compact?: boolean;
}): string {
  const { width, height } = args;
  const left = args.compact ? 36 : 60;
  const right = args.compact ? 92 : 138;
  const top = args.compact ? 42 : 58;
  const bottom = args.compact ? 36 : 54;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const bars = args.bars.filter((bar) => [bar.open, bar.high, bar.low, bar.close].every(isPrice));
  const levelPrices = args.levels.map((level) => parsePriceLabel(level.value)).filter((value): value is number => value !== null);
  const prices = [
    ...bars.flatMap((bar) => [bar.high, bar.low]),
    ...levelPrices,
  ];
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 1;
  const padding = Math.max(1, (max - min) * 0.14);
  const low = min - padding;
  const high = max + padding;
  const y = (price: number) => top + ((high - price) / Math.max(0.01, high - low)) * chartHeight;
  const x = (index: number) => left + (bars.length <= 1 ? chartWidth / 2 : (index / (bars.length - 1)) * chartWidth);
  const candleWidth = args.compact ? 9 : 18;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const gy = top + (chartHeight / 4) * index;
    return `<line x1="${left}" y1="${gy}" x2="${left + chartWidth}" y2="${gy}" stroke="rgba(148,163,184,0.16)" stroke-width="1" />`;
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
  const levels = args.levels.map((level, index) => {
    const price = parsePriceLabel(level.value);
    if (price === null) return '';
    const ly = y(price);
    const labelY = Math.max(top + 14, Math.min(top + chartHeight - 6, ly - 4 + index * 2));
    return [
      `<line x1="${left}" y1="${ly}" x2="${left + chartWidth}" y2="${ly}" stroke="${level.color}" stroke-width="2" stroke-dasharray="8 7" opacity="0.9" />`,
      `<text x="${left + chartWidth + 10}" y="${labelY}" class="axis-label" fill="${level.color}">${escapeHtml(level.label)} ${price.toFixed(2)}</text>`,
    ].join('');
  }).join('');
  const times = bars.length ? [
    `<text x="${left}" y="${height - 14}" class="time">${escapeHtml(visibleTime(bars[0].time))}</text>`,
    `<text x="${left + chartWidth}" y="${height - 14}" class="time end">${escapeHtml(visibleTime(bars[bars.length - 1].time))}</text>`,
  ].join('') : `<text x="${left}" y="${top + 36}" class="empty">No valid provided bars available.</text>`;

  return `
    <svg class="chart-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(args.title)}">
      <style>
        .chart-title { fill: #f8fafc; font: 800 ${args.compact ? 15 : 25}px Arial, sans-serif; letter-spacing: 0; }
        .axis-label { font: 800 ${args.compact ? 10 : 14}px Arial, sans-serif; letter-spacing: 0; }
        .time { fill: #94a3b8; font: 600 ${args.compact ? 10 : 12}px Arial, sans-serif; letter-spacing: 0; }
        .end { text-anchor: end; }
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

export function buildPriceActionReviewCardHtmlForTest(model: PriceActionReviewCardModel): string {
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

  return `<!doctype html>
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
          ${chartSvg({ title: '5M Price Action - Research Review Window', bars: model.bars5m, levels, width: 1034, height: 500 })}
        </div>
        <aside class="side">
          ${chartSvg({ title: '15M Context', bars: model.bars15m, levels: levels.slice(0, 2), width: 350, height: 158, compact: true })}
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
}

function defaultOutputPath(input: PriceActionReviewCardRenderInput): string {
  const prefix = input.filePrefix || `price-action-review-card-${input.model.symbol}-${input.model.sampleId}`;
  return path.join(input.outputDir || DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR, `${safeFilePart(prefix)}.png`);
}

export async function renderPriceActionReviewCard(input: PriceActionReviewCardRenderInput): Promise<string> {
  const outputPath = path.resolve(input.outputPath || defaultOutputPath(input));
  const rendered = await renderHtmlToApprovedPng({
    html: buildPriceActionReviewCardHtmlForTest(input.model),
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
  return rendered;
}
