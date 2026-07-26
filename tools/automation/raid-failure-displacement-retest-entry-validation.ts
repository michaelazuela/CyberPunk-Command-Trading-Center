import fs from 'node:fs';
import path from 'node:path';

interface Args {
  geometryJson: string;
  marketBarsJson: string;
  json: boolean;
}

interface MarketBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface GeometryVariant {
  name: string;
  entry: number;
  stop: number;
  riskPoints: number | null;
  riskClean: boolean;
  target1: number | null;
  target2: number | null;
}

interface GeometryRow {
  trade: {
    date: string;
    session: 'morning' | 'lunch';
    direction: 'LONG' | 'SHORT';
    entryTimeEt: string;
    exitTimeEt: string;
    entry: number;
    exit: number;
    dollars: number;
  };
  quality: 'tight' | 'usable';
  proofTime: string;
  retestVariants: GeometryVariant[];
}

interface GeometryReport {
  rows?: GeometryRow[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const geometryJson = readFlag(argv, '--geometry-json');
  const marketBarsJson = readFlag(argv, '--market-bars-json');
  if (!geometryJson) throw new Error('--geometry-json is required');
  if (!marketBarsJson) throw new Error('--market-bars-json is required');
  return {
    geometryJson,
    marketBarsJson,
    json: argv.includes('--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function validBar(value: unknown): value is MarketBar {
  const row = asRecord(value);
  return (
    typeof row.time === 'string' &&
    ['open', 'high', 'low', 'close'].every((key) => typeof row[key] === 'number' && Number.isFinite(row[key]))
  );
}

function loadFiveMinuteBars(filePath: string): MarketBar[] {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const grouped = asRecord(root.bars || root.timeframes || root);
  return (Array.isArray(grouped['5m']) ? grouped['5m'] : []).filter(validBar);
}

function readGeometry(filePath: string): GeometryReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as GeometryReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function barsAfterProofThroughExit(bars: MarketBar[], row: GeometryRow): MarketBar[] {
  return bars.filter((bar) => bar.time > row.proofTime && bar.time <= row.trade.exitTimeEt);
}

function validateVariant(row: GeometryRow, variant: GeometryVariant, bars: MarketBar[]) {
  if (!variant.riskClean) {
    return {
      ...variant,
      touched: false,
      cleanTouch: false,
      ambiguousStopTouch: false,
      touchTime: null as string | null,
      touchBar: null as MarketBar | null,
    };
  }
  for (const bar of barsAfterProofThroughExit(bars, row)) {
    const touched = row.trade.direction === 'LONG' ? bar.low <= variant.entry : bar.high >= variant.entry;
    if (!touched) continue;
    const stopAlsoTouched = row.trade.direction === 'LONG' ? bar.low <= variant.stop : bar.high >= variant.stop;
    return {
      ...variant,
      touched: true,
      cleanTouch: !stopAlsoTouched,
      ambiguousStopTouch: stopAlsoTouched,
      touchTime: bar.time,
      touchBar: bar,
    };
  }
  return {
    ...variant,
    touched: false,
    cleanTouch: false,
    ambiguousStopTouch: false,
    touchTime: null as string | null,
    touchBar: null as MarketBar | null,
  };
}

function money(rows: Array<{ trade: { dollars: number } }>): number {
  return Math.round(rows.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100;
}

export function buildRaidFailureDisplacementRetestEntryValidation(args: Args) {
  const geometry = readGeometry(args.geometryJson);
  const bars = loadFiveMinuteBars(args.marketBarsJson);
  const rows = (geometry.rows || []).map((row) => {
    const variants = row.retestVariants.map((variant) => validateVariant(row, variant, bars));
    return {
      trade: row.trade,
      quality: row.quality,
      proofTime: row.proofTime,
      variants,
      anyTouch: variants.some((variant) => variant.touched),
      anyCleanTouch: variants.some((variant) => variant.cleanTouch),
      anyAmbiguousStopTouch: variants.some((variant) => variant.ambiguousStopTouch),
    };
  });
  const clean = rows.filter((row) => row.anyCleanTouch);
  const ambiguousOnly = rows.filter((row) => !row.anyCleanTouch && row.anyAmbiguousStopTouch);
  const noTouch = rows.filter((row) => !row.anyTouch);

  return {
    reportType: 'raid_failure_displacement_retest_entry_validation',
    generatedAt: new Date().toISOString(),
    authority: {
      localGeometryArtifactOnly: true,
      localMarketBarsArtifactOnly: true,
      validatesAfterProofOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
      noCanExecuteChange: true,
    },
    source: {
      geometryJson: args.geometryJson,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      geometryRows: geometry.rows?.length || 0,
      bars5mLoaded: bars.length,
      retestTouchedRows: rows.filter((row) => row.anyTouch).length,
      cleanRetestRows: clean.length,
      cleanRetestDollars: money(clean),
      ambiguousStopTouchRows: ambiguousOnly.length,
      ambiguousStopTouchDollars: money(ambiguousOnly),
      noRetestTouchRows: noTouch.length,
      noRetestTouchDollars: money(noTouch),
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      canExecuteTrueRows: 0,
    },
    rows,
    recommendation: clean.length
      ? 'research_retest_entry_has_clean_touches_prepare_preview_contract_update'
      : 'do_not_wire_scanner_retest_entry_did_not_cleanly_trigger',
  };
}

function writeReport(report: ReturnType<typeof buildRaidFailureDisplacementRetestEntryValidation>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `raid-failure-displacement-retest-entry-validation-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'raid-failure-displacement-retest-entry-validation.ts') {
  const args = parseArgs();
  const report = buildRaidFailureDisplacementRetestEntryValidation(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
