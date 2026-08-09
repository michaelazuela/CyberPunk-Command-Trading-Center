import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  FVG_RESEARCH_BOUNDARY,
  FVG_RESEARCH_MODEL_DEFINITIONS,
  FVG_RESEARCH_MODEL_FAMILY,
  type FvgResearchSubmodel,
} from './fvg-research-model-spec';

interface SourceReport {
  date: string;
  session: string;
  bridgeInstrument: string;
  boundary: string;
  traces: TraceRow[];
  fvgInventoryAtSessionStart?: InventoryItem[];
}

interface InventoryItem {
  direction: 'LONG' | 'SHORT';
  timeframe: string;
  statusAtReview: string;
  relationToPrice: string;
}

interface TraceRow {
  parentFvg: {
    direction: 'LONG' | 'SHORT';
    timeframe: string;
    createdAt: string;
    lower: number;
    upper: number;
  };
  eligible: boolean;
  parentDisplacementTime: string | null;
  parentFailureTime: string | null;
  firstReturnTime: string | null;
  wickDefenseTimes: string[];
  proofTime: string | null;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  target1: number | null;
  target2: number | null;
  outcome: string;
  outcomeTime: string | null;
  oneMesPnl: number | null;
  nearestLiquidity: { label: string; price: number } | null;
}

interface CleanTradeRow {
  date: string;
  session: string;
  submodel: FvgResearchSubmodel;
  direction: 'LONG' | 'SHORT';
  parentFvg: string;
  parentCreatedAt: string;
  parentDisplacementTime: string | null;
  firstReturnTime: string | null;
  wickDefenseTimes: string[];
  proofTime: string | null;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  target1: number | null;
  target2: number | null;
  outcome: string;
  outcomeTime: string | null;
  oneMesPnl: number | null;
  nearestLiquidity: string;
}

const SOURCE_FILES = [
  'tools/automation/replay-diagnostics/fvg-definition-lock-jan6-full-rth-v1.json',
  'tools/automation/replay-diagnostics/jan7-lunch-fvg-definition-lock-v1.json',
  'tools/automation/replay-diagnostics/fvg-definition-lock-jan13-full-rth-v1.json',
];

const OUTPUT_DIR = 'tools/automation/replay-diagnostics';
const OUTPUT_BASENAME = 'fvg-isolated-research-jan6-7-13-v1';

function formatZone(row: TraceRow): string {
  return `${row.parentFvg.lower.toFixed(2)}-${row.parentFvg.upper.toFixed(2)}`;
}

function classifySubmodel(row: TraceRow): FvgResearchSubmodel {
  if (row.parentFailureTime) {
    return 'FvgFailedAcceptanceReversal';
  }
  return 'FvgWickDefenseContinuation';
}

function readSource(file: string): SourceReport {
  const report = JSON.parse(readFileSync(file, 'utf8')) as SourceReport;
  if (report.boundary !== FVG_RESEARCH_BOUNDARY) {
    throw new Error(`${file} is not research-only. Found boundary: ${report.boundary}`);
  }
  return report;
}

function summarizeInventory(items: InventoryItem[] = []) {
  return {
    openAbove: items.filter(
      (item) => item.statusAtReview === 'open_untouched' && item.relationToPrice === 'above',
    ).length,
    openBelow: items.filter(
      (item) => item.statusAtReview === 'open_untouched' && item.relationToPrice === 'below',
    ).length,
    failedAbove: items.filter(
      (item) => item.statusAtReview === 'failed_inverted' && item.relationToPrice === 'above',
    ).length,
    failedBelow: items.filter(
      (item) => item.statusAtReview === 'failed_inverted' && item.relationToPrice === 'below',
    ).length,
  };
}

function buildRows(reports: SourceReport[]): CleanTradeRow[] {
  return reports.flatMap((report) =>
    report.traces
      .filter((trace) => trace.eligible)
      .map((trace) => ({
        date: report.date,
        session: report.session,
        submodel: classifySubmodel(trace),
        direction: trace.parentFvg.direction,
        parentFvg: formatZone(trace),
        parentCreatedAt: trace.parentFvg.createdAt,
        parentDisplacementTime: trace.parentDisplacementTime,
        firstReturnTime: trace.firstReturnTime,
        wickDefenseTimes: trace.wickDefenseTimes,
        proofTime: trace.proofTime,
        entry: trace.entry,
        stop: trace.stop,
        riskPoints: trace.riskPoints,
        target1: trace.target1,
        target2: trace.target2,
        outcome: trace.outcome,
        outcomeTime: trace.outcomeTime,
        oneMesPnl: trace.oneMesPnl,
        nearestLiquidity: trace.nearestLiquidity
          ? `${trace.nearestLiquidity.label} ${trace.nearestLiquidity.price.toFixed(2)}`
          : 'none',
      })),
  );
}

function money(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}$${value.toFixed(2)}`;
}

function points(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

function buildMarkdown(reports: SourceReport[], rows: CleanTradeRow[]): string {
  const totalPnl = rows.reduce((sum, row) => sum + (row.oneMesPnl ?? 0), 0);
  const winners = rows.filter((row) => (row.oneMesPnl ?? 0) > 0).length;
  const losers = rows.filter((row) => (row.oneMesPnl ?? 0) < 0).length;

  const lines: string[] = [
    '# FVG Isolated Research Report',
    '',
    `Family: ${FVG_RESEARCH_MODEL_FAMILY}`,
    `Boundary: ${FVG_RESEARCH_BOUNDARY}`,
    'Live systems touched: no',
    '',
    '## Isolated Model Definitions',
    '',
  ];

  for (const definition of FVG_RESEARCH_MODEL_DEFINITIONS) {
    lines.push(`### ${definition.submodel}`);
    lines.push(`Purpose: ${definition.purpose}`);
    lines.push(`Entry: ${definition.entry}`);
    lines.push(`Stop: ${definition.stop}`);
    lines.push(`Targets: ${definition.targets}`);
    lines.push('');
  }

  lines.push('## Proof Set Summary');
  lines.push('');
  lines.push(`Days reviewed: ${reports.map((report) => report.date).join(', ')}`);
  lines.push(`Eligible FVG-only rows: ${rows.length}`);
  lines.push(`Wins: ${winners}`);
  lines.push(`Losses: ${losers}`);
  lines.push(`One MES net: ${money(totalPnl)}`);
  lines.push('');

  lines.push('## Day Inventory Read');
  lines.push('');
  lines.push('| Date | Session | Instrument | Parent FVGs | Eligible | Open Above | Open Below | Failed Above | Failed Below |');
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const report of reports) {
    const inventory = summarizeInventory(report.fvgInventoryAtSessionStart);
    lines.push(
      `| ${report.date} | ${report.session} | ${report.bridgeInstrument} | ${report.traces.length} | ${report.traces.filter((trace) => trace.eligible).length} | ${inventory.openAbove} | ${inventory.openBelow} | ${inventory.failedAbove} | ${inventory.failedBelow} |`,
    );
  }
  lines.push('');

  lines.push('## Eligible Trade Rows');
  lines.push('');
  lines.push('| Date | Model | Side | Parent 15M FVG | Displacement | 5M Proof | Entry | Stop | Risk | T1 | T2 | Outcome | 1 MES P/L |');
  lines.push('|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|');
  for (const row of rows) {
    lines.push(
      `| ${row.date} | ${row.submodel} | ${row.direction} | ${row.parentFvg} | ${row.parentDisplacementTime ?? 'none'} | ${row.proofTime ?? 'none'} | ${points(row.entry)} | ${points(row.stop)} | ${points(row.riskPoints)} | ${points(row.target1)} | ${points(row.target2)} | ${row.outcome}${row.outcomeTime ? ` @ ${row.outcomeTime}` : ''} | ${money(row.oneMesPnl)} |`,
    );
  }
  lines.push('');

  lines.push('## Clean Read');
  lines.push('');
  lines.push('- Jan 6 supports the wick-defense continuation idea, but one row has wide risk and needs visual review before it becomes trusted model evidence.');
  lines.push('- Jan 7 lunch now catches the afternoon short because the parent displacement can be the 14:15 impulse candle inside the 14:30 FVG formation.');
  lines.push('- Jan 13 now keeps the 12:00/12:20 short evidence and blocks the 13:20 wide-risk same-parent row as management/re-entry context.');
  lines.push('- This report does not compare against old trading models. That is intentional: the FVG family is isolated first.');
  lines.push('');

  lines.push('## Next Gate');
  lines.push('');
  lines.push('Visually review the Jan 13 12:00/12:20 short evidence next, especially whether the protected 5M stop should stay near 7128 or use the wider visual structure near 7140. Do not expand January until that entry/stop read is locked.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function main() {
  const reports = SOURCE_FILES.map(readSource);
  const rows = buildRows(reports);
  const output = {
    family: FVG_RESEARCH_MODEL_FAMILY,
    boundary: FVG_RESEARCH_BOUNDARY,
    generatedAt: new Date().toISOString(),
    liveSystemsTouched: false,
    definitions: FVG_RESEARCH_MODEL_DEFINITIONS,
    sources: SOURCE_FILES,
    rows,
    summary: {
      eligibleRows: rows.length,
      wins: rows.filter((row) => (row.oneMesPnl ?? 0) > 0).length,
      losses: rows.filter((row) => (row.oneMesPnl ?? 0) < 0).length,
      oneMesNet: rows.reduce((sum, row) => sum + (row.oneMesPnl ?? 0), 0),
    },
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.json`), `${JSON.stringify(output, null, 2)}\n`);
  writeFileSync(path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.md`), buildMarkdown(reports, rows));

  console.log(`Wrote ${path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.json`)}`);
  console.log(`Wrote ${path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.md`)}`);
  console.log(JSON.stringify(output.summary, null, 2));
}

main();
