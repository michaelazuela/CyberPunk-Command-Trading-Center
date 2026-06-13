import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Bias = 'BULL' | 'BEAR';

interface OverlayBias {
  bias: Bias;
  confirm: number;
  protect: number;
}

interface OverlaySample {
  date: string;
  time: string;
  dir: 'LONG' | 'SHORT';
  bias5: OverlayBias;
  bias15: OverlayBias;
}

interface OverlayReport {
  reportType: string;
  window: { from: string; to: string; active: string };
  coverage: {
    bars5m: number;
    bars15m: number;
    range5m: string[];
    range15m: string[];
  };
  ruleUnderReview: string;
  totals: { evaluatedBars: number; confirmed: number; long: number; short: number; wait: number };
  byDate: Record<string, { total: number; long: number; short: number; wait: number; firstLong?: OverlaySample; firstShort?: OverlaySample }>;
  samples: OverlaySample[];
  authority: {
    changesTradeLogic: boolean;
    changesCanExecute: boolean;
    approvesExecution: boolean;
    changesScannerBehavior: boolean;
  };
}

const reportPath = resolve('tools/automation/replay-diagnostics/phase-10k-protected-structure-overlay-2026-06-08-to-2026-06-12.json');
const report = JSON.parse(readFileSync(reportPath, 'utf8')) as OverlayReport;

function expectedBias(direction: OverlaySample['dir']): Bias {
  return direction === 'LONG' ? 'BULL' : 'BEAR';
}

assert.equal(report.reportType, 'phase_10k_research_only_protected_structure_overlay');
assert.equal(report.window.from, '2026-06-08');
assert.equal(report.window.to, '2026-06-12');
assert.equal(report.window.active, '09:15-16:00 ET');
assert.ok(report.coverage.bars5m >= 1200, 'prior-week proof needs full 5M coverage');
assert.ok(report.coverage.bars15m >= 400, 'prior-week proof needs full 15M coverage');
assert.equal(report.totals.evaluatedBars, 410);
assert.equal(report.totals.confirmed, report.totals.long + report.totals.short);
assert.ok(report.totals.long > 0);
assert.ok(report.totals.short > 0);
assert.equal(report.authority.changesTradeLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.approvesExecution, false);
assert.equal(report.authority.changesScannerBehavior, false);

for (const sample of report.samples) {
  const bias = expectedBias(sample.dir);
  assert.equal(sample.bias5.bias, bias, `${sample.time} 5M bias must support ${sample.dir}`);
  assert.equal(sample.bias15.bias, bias, `${sample.time} 15M bias must support ${sample.dir}`);
}

const june12 = report.byDate['2026-06-12'];
assert.ok(june12, 'June 12 must remain in the protected-structure replay proof');
assert.equal(june12.firstLong?.time, '2026-06-12T11:00:00');
assert.equal(june12.firstLong?.dir, 'LONG');
assert.equal(june12.firstLong?.bias5.bias, 'BULL');
assert.equal(june12.firstLong?.bias15.bias, 'BULL');
assert.equal(june12.firstLong?.bias5.confirm, 7429);
assert.equal(june12.firstLong?.bias15.confirm, 7424.75);

console.log('Protected structure trend-confirmation prior-week replay verified.');
