import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { ChartCandleFact, ChartContext, FvgZoneFact, LiquidityEventFact, SetupCandidate } from '../../src/types';
import { professionalCandidateModelLabel } from './professional-report-language';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'chart-markups');

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

function validCandles(chartContext: Partial<ChartContext> | null): Required<Pick<ChartCandleFact, 'index' | 'open' | 'high' | 'low' | 'close'>>[] {
  return (chartContext?.candles || [])
    .filter((candle) => isPrice(candle.open) && isPrice(candle.high) && isPrice(candle.low) && isPrice(candle.close))
    .map((candle, fallbackIndex) => ({
      index: typeof candle.index === 'number' ? candle.index : fallbackIndex,
      open: candle.open as number,
      high: candle.high as number,
      low: candle.low as number,
      close: candle.close as number,
    }))
    .slice(-90);
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

function renderLine(label: string, price: number | null | undefined, y: (price: number) => number, color: string, dash = '', width = 2): string {
  if (!isPrice(price)) return '';
  const yy = y(price);
  return `
    <line x1="64" y1="${yy}" x2="1510" y2="${yy}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''} />
    <text x="1470" y="${yy - 9}" text-anchor="end" class="line-label" fill="${color}">${escapeHtml(label)}</text>
    <rect x="1518" y="${yy - 17}" width="92" height="34" rx="7" fill="${color}" opacity="0.92" />
    <text x="1564" y="${yy + 6}" text-anchor="middle" class="price-pill">${money(price)}</text>
  `;
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

function buildChartHtml(input: ChartMarkupRenderInput): string {
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
  const sweep = matchingSweep(input.chartContext, candidate);
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
  const prices = [
    ...candles.flatMap((candle) => [candle.high, candle.low]),
    entryLow,
    entryHigh,
    stop,
    t1,
    t2,
    liquidity,
    sweep?.level,
  ].filter(isPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pad = Math.max(1, (maxPrice - minPrice) * 0.12);
  const low = minPrice - pad;
  const high = maxPrice + pad;
  const width = 1620;
  const height = 1060;
  const plot = { left: 64, top: 70, right: 1510, bottom: 905 };
  const xStep = (plot.right - plot.left) / Math.max(1, candles.length - 1);
  const y = (price: number) => plot.bottom - ((price - low) / (high - low)) * (plot.bottom - plot.top);
  const entryZone = isPrice(entryLow) && isPrice(entryHigh)
    ? `<rect x="790" y="${y(entryHigh)}" width="650" height="${Math.max(8, y(entryLow) - y(entryHigh))}" fill="${isLong ? '#22c55e' : '#f97316'}" opacity="0.27" stroke="${isLong ? '#4ade80' : '#fb923c'}" />
       <text x="1115" y="${(y(entryHigh) + y(entryLow)) / 2 - 4}" text-anchor="middle" class="zone-title">Entry / Imbalance Pullback</text>
       <text x="1115" y="${(y(entryHigh) + y(entryLow)) / 2 + 26}" text-anchor="middle" class="zone-sub">${money(entryLow)} - ${money(entryHigh)}</text>`
    : '';
  const priceTicks = Array.from({ length: 9 }, (_, index) => low + ((high - low) / 8) * index);
  const pathColor = isLong ? '#4ade80' : '#fb923c';
  const projectedPath = isLong && isPrice(entryHigh) && isPrice(t2)
    ? `<polyline points="1250,${y(entryHigh)} 1330,${y(t1 || entryHigh)} 1380,${y(entryHigh)} 1490,${y(t2)}" fill="none" stroke="${pathColor}" stroke-width="3" stroke-dasharray="10 9" marker-end="url(#arrow)" />`
    : !isLong && isPrice(entryLow) && isPrice(t2)
      ? `<polyline points="1250,${y(entryLow)} 1330,${y(t1 || entryLow)} 1380,${y(entryLow)} 1490,${y(t2)}" fill="none" stroke="${pathColor}" stroke-width="3" stroke-dasharray="10 9" marker-end="url(#arrow)" />`
      : '';
  const sweepLabel = isLong ? 'Sell-side sweep' : 'Buy-side sweep';
  const contextBias = input.chartContext?.multiTimeframeContext?.alignment?.alignedDirection || input.chartContext?.marketStructure?.trend || 'unknown';

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
    .title { font-size: 42px; font-weight: 900; letter-spacing: 1px; }
    .subtitle { font-size: 28px; font-weight: 800; fill: #4ade80; }
    .panel-title { font-size: 27px; font-weight: 900; }
    .panel-text { font-size: 23px; font-weight: 700; }
    .small { font-size: 19px; fill: #cbd5e1; }
    .line-label { font-size: 23px; font-weight: 850; }
    .price-pill { font-size: 22px; font-weight: 900; fill: white; }
    .zone-title { font-size: 30px; font-weight: 900; fill: #f8fafc; }
    .zone-sub { font-size: 25px; font-weight: 850; fill: #f8fafc; }
    .axis { fill: #e5e7eb; font-size: 20px; font-weight: 700; }
    .step { font-size: 21px; fill: #f8fafc; font-weight: 760; }
    .step-num { font-size: 22px; fill: #4ade80; font-weight: 900; }
  </style>
</head>
<body>
<div class="wrap">
<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M2,2 L10,6 L2,10" fill="none" stroke="${pathColor}" stroke-width="2.5" />
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
  ${Array.from({ length: 14 }, (_, index) => `<line x1="${plot.left + index * ((plot.right - plot.left) / 13)}" y1="${plot.top}" x2="${plot.left + index * ((plot.right - plot.left) / 13)}" y2="${plot.bottom}" stroke="#12201c" stroke-width="1" />`).join('')}
  ${priceTicks.map((price) => `<line x1="${plot.left}" y1="${y(price)}" x2="${plot.right}" y2="${y(price)}" stroke="#12201c" stroke-width="1" /><text x="${plot.right + 12}" y="${y(price) + 7}" class="axis">${money(price)}</text>`).join('')}
  ${candles.map((candle, index) => renderCandle(candle, plot.left + index * xStep, y)).join('')}
  ${entryZone}
  ${renderLine(sweepLabel, sweep?.level || null, y, '#f97316', '8 7', 2.5)}
  ${renderLine(isLong ? 'Stop below sweep low' : 'Stop above sweep high', stop, y, '#ef4444', '', 3)}
  ${renderLine('T1 1.5R', t1, y, '#facc15', '8 7', 2.5)}
  ${renderLine('T2 2.0R', t2, y, '#facc15', '8 7', 2.5)}
  ${renderLine(isLong ? 'Buy-side liquidity' : 'Sell-side liquidity', liquidity, y, '#2f8cff', '', 3)}
  ${projectedPath}
  <rect x="16" y="20" width="450" height="325" rx="12" fill="#050908" stroke="#22c55e" stroke-width="2" opacity=".96" />
  <text x="36" y="62" class="panel-title">${escapeHtml(input.instrument)} • 5M CHART</text>
  <line x1="16" y1="82" x2="466" y2="82" stroke="#334155" />
  <text x="42" y="122" class="panel-text">◎ Decision: <tspan fill="#4ade80">${escapeHtml(candidate.executionStatus)}</tspan></text>
  <text x="42" y="170" class="panel-text">↗ Model: <tspan fill="#4ade80">${escapeHtml(model)}</tspan></text>
  <text x="42" y="218" class="panel-text">★ Score: <tspan fill="#facc15">${score == null ? 'N/A' : `${Math.round(score)}/100`}</tspan></text>
  <text x="42" y="266" class="panel-text">◷ 5M execution chart</text>
  <text x="42" y="314" class="small">Decision support only. No automated orders.</text>
  <text x="585" y="62" class="title" fill="${isLong ? '#f8fafc' : '#f8fafc'}">${direction} PLAN</text>
  <text x="585" y="104" class="subtitle">${escapeHtml(model)}</text>
  <line x1="500" y1="128" x2="980" y2="128" stroke="#166534" stroke-width="2" />
  <text x="515" y="178" class="step-num">①</text><text x="548" y="178" class="step">Sweep</text>
  <text x="650" y="178" class="step-num">②</text><text x="683" y="178" class="step">Reclaim</text>
  <text x="800" y="178" class="step-num">③</text><text x="833" y="178" class="step">Structure shift</text>
  <text x="990" y="178" class="step-num">④</text><text x="1023" y="178" class="step">Entry zone</text>
  <rect x="26" y="640" width="260" height="178" rx="10" fill="#070b0f" stroke="#64748b" opacity=".92" />
  <text x="156" y="672" text-anchor="middle" class="panel-text">CONTEXT</text>
  <text x="46" y="715" class="small">• Higher structure: <tspan fill="#4ade80">${escapeHtml(String(contextBias))}</tspan></text>
  <text x="46" y="750" class="small">• Model: <tspan fill="#4ade80">${escapeHtml(model)}</tspan></text>
  <text x="46" y="785" class="small">• Session: <tspan fill="#4ade80">${escapeHtml(input.sessionLabel)}</tspan></text>
  <rect x="1138" y="718" width="330" height="214" rx="10" fill="#070b0f" stroke="#64748b" opacity=".94" />
  <text x="1303" y="750" text-anchor="middle" class="panel-text">RISK SUMMARY</text>
  <text x="1160" y="792" class="small">Entry: <tspan fill="#4ade80">${money(entryLow)} - ${money(entryHigh)}</tspan></text>
  <text x="1160" y="827" class="small">Stop: <tspan fill="#ef4444">${money(stop)}</tspan></text>
  <text x="1160" y="862" class="small">Risk: <tspan fill="#f8fafc">${risk ? `~${risk.toFixed(2)} pts` : 'N/A'}</tspan></text>
  <text x="1160" y="897" class="small">T2: <tspan fill="#facc15">${money(t2)}</tspan></text>
  <rect x="18" y="954" width="1584" height="56" rx="9" fill="#070b0f" stroke="#64748b" />
  <text x="44" y="990" class="small">⚠ THIS IS A DECISION SUPPORT PLAN ONLY. Not financial advice. Not predictive. No automated orders.</text>
</svg>
</div>
</body>
</html>`;
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
    const page = await browser.newPage({ viewport: { width: 1620, height: 1060 }, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
    return outputPath;
  } finally {
    await browser.close();
  }
}
