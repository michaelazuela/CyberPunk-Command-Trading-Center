import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildPriceActionReviewCardModel,
  type PriceActionReviewBar,
} from '../../src/agents/priceActionReviewCardAgent';
import {
  buildPriceActionReviewCardHtmlForTest,
  renderPriceActionReviewCard,
} from './price-action-review-card-renderer';

const outputDir = mkdtempSync(path.join(tmpdir(), 'price-action-review-card-'));

function bars5m(): PriceActionReviewBar[] {
  return Array.from({ length: 8 }, (_, index) => {
    const base = 7596 + index * 0.65;
    const open = base;
    const close = index % 3 === 0 ? base - 0.35 : base + 0.5;
    return {
      time: `2026-05-29T10:${String(index * 5).padStart(2, '0')}:00-04:00`,
      open,
      high: Math.max(open, close) + 0.85,
      low: Math.min(open, close) - 0.75,
      close,
      volume: 1000 + index,
    };
  });
}

function bars15m(): PriceActionReviewBar[] {
  return Array.from({ length: 3 }, (_, index) => {
    const base = 7594 + index * 1.8;
    return {
      time: `2026-05-29T10:${String(index * 15).padStart(2, '0')}:00-04:00`,
      open: base,
      high: base + 2.4,
      low: base - 1.2,
      close: base + 1.4,
      volume: 3000 + index,
    };
  });
}

function forbiddenExecutablePaths(value: unknown, current = 'value'): string[] {
  const forbidden = new Set([
    'entry',
    'stop',
    'stopLoss',
    'target',
    'targets',
    'T1',
    'T2',
    't1',
    't2',
    'riskReward',
    'canExecute',
    'orderInstructions',
    'tradeAlerts',
    'ragPayload',
    'journalPayload',
  ]);
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${current}.${key}`;
    if (forbidden.has(key)) paths.push(next);
    if (key === 'executionApproved' && child !== false) paths.push(next);
    paths.push(...forbiddenExecutablePaths(child, next));
  }
  return paths;
}

try {
  const model = buildPriceActionReviewCardModel({
    symbol: 'MES',
    contract: 'MES 06-26',
    dateRange: { from: '2026-01-01', to: '2026-05-29' },
    sample: {
      sampleId: 'time_window_liquidity_delivery-005',
      date: '2026-05-29',
      time: '10:00',
      conceptTitle: 'Time-Window Liquidity Delivery',
      direction: 'LONG',
      window: '10:00-11:00 NY',
      agentInspectionLabel: 'keep_advisory',
      advisoryOnly: true,
    },
    overlay: {
      hypotheticalReferencePrice: 7597,
      hypotheticalInvalidationReference: 7593,
      hypotheticalThresholdOne: 7601,
      hypotheticalThresholdTwo: 7605,
      firstResolvedEvent: 'neutral_no_resolution',
      hypotheticalOutcomeLabel: 'neutral_no_resolution',
      advisoryOnly: true,
      executionApproved: false,
    },
    bars5m: bars5m(),
    bars15m: bars15m(),
  });

  assert.equal(model.cardType, 'PriceActionReviewCard');
  assert.equal(model.researchOnly, true);
  assert.equal(model.advisoryOnly, true);
  assert.equal(model.executionApproved, false);
  assert.equal(model.headerText, 'Hypothetical Research Overlay — Not an approved live trade');
  assert.equal(model.footerText, 'Research-only. This does not approve execution, change rules, or create trades.');
  assert.equal(model.hypotheticalEntryLabel, '7597.00');
  assert.equal(model.hypotheticalStopLossLabel, '7593.00');
  assert.equal(model.hypotheticalTargetLabel, '7601.00');
  assert.equal(model.hypotheticalTakeProfitLabel, '7605.00');
  assert.equal(model.hypotheticalT1Label, '7601.00');
  assert.equal(model.hypotheticalT2Label, '7605.00');
  assert.equal(model.approvedDisplay, 'Pending Human Review');
  assert.equal(model.hypotheticalExecuteStatus, 'No');
  assert.equal(model.hypotheticalTradeAlertStatus, 'No');
  assert.equal(model.hypotheticalBuySellDisplay, 'Buy');
  assert.equal(model.warnings.some((warning) => warning.includes('Research-derived overlay fields were not fully available')), true);
  assert.deepEqual(forbiddenExecutablePaths(model), []);

  const shortModel = buildPriceActionReviewCardModel({
    symbol: 'MES',
    contract: 'MES 06-26',
    sample: {
      sampleId: 'short-sample',
      date: '2026-05-29',
      time: '10:30',
      conceptTitle: 'False-Run Liquidity Fade Near Highs',
      direction: 'SHORT',
      window: '10:00-11:00 NY',
      agentInspectionLabel: 'possible_turtle_soup_mapping_review',
      advisoryOnly: true,
    },
    overlay: {
      hypotheticalReferencePrice: 7600,
      hypotheticalInvalidationReference: 7604,
      hypotheticalThresholdOne: 7596,
      hypotheticalThresholdTwo: 7592,
      advisoryOnly: true,
      executionApproved: false,
    },
    bars5m: bars5m(),
    bars15m: bars15m(),
  });
  assert.equal(shortModel.hypotheticalBuySellDisplay, 'Sell');
  assert.equal(shortModel.hypotheticalEntryLabel, '7600.00');
  assert.equal(shortModel.hypotheticalStopLossLabel, '7604.00');

  const missingModel = buildPriceActionReviewCardModel({
    symbol: 'MES',
    contract: 'MES 06-26',
    sample: {
      sampleId: 'missing-overlay',
      date: '2026-05-29',
      time: '10:45',
      conceptTitle: 'Missing Overlay',
      direction: 'LONG',
      window: '10:00-11:00 NY',
      agentInspectionLabel: 'insufficient_context',
      advisoryOnly: true,
    },
    overlay: null,
    bars5m: [],
    bars15m: [],
  });
  assert.equal(missingModel.hypotheticalEntryLabel, 'Unavailable');
  assert.equal(missingModel.hypotheticalT1Label, 'Unavailable');
  assert.ok(missingModel.warnings.some((warning) => warning.includes('Unavailable hypothetical display field')));
  assert.ok(missingModel.warnings.some((warning) => warning.includes('No valid provided 5-minute bars')));
  assert.ok(missingModel.warnings.some((warning) => warning.includes('No valid provided 15-minute bars')));

  const html = buildPriceActionReviewCardHtmlForTest(model);
  assert.ok(html.includes('Hypothetical Research Overlay — Not an approved live trade'));
  assert.ok(html.includes('Research-only. This does not approve execution, change rules, or create trades.'));
  assert.ok(html.includes('Entry'));
  assert.ok(html.includes('Stop Loss'));
  assert.ok(html.includes('Target'));
  assert.ok(html.includes('Take Profit'));
  assert.ok(html.includes('Buy/Sell Now'));
  assert.ok(html.includes('Pending Human Review'));
  assert.ok(html.includes('PNG artifact only'));
  const forbiddenMethodLabel = ['I', 'C', 'T'].join('');
  assert.equal(html.replace(/data:image\/png;base64,[^"]+/g, '').includes(forbiddenMethodLabel), false);

  const output = await renderPriceActionReviewCard({
    model,
    outputDir,
    filePrefix: 'price-action-review-card-MES-2026-01-01-to-2026-05-29-time_window_liquidity_delivery-005',
  });
  assert.equal(path.extname(output), '.png');
  assert.equal(existsSync(output), true);
  assert.ok(statSync(output).size > 20_000);
  const png = readFileSync(output);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const generated = readdirSync(outputDir);
  assert.equal(generated.some((file) => file.toLowerCase().endsWith('.svg')), false);

  console.log(`PriceActionReviewCard renderer verified: ${output}`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
