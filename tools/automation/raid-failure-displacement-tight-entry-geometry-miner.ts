import fs from 'node:fs';
import path from 'node:path';
import { TRADE_RULES, roundToTradeTick, stopOffsetPoints, targetsFromEntryStop } from '../../src/config/tradeRules';

type Direction = 'LONG' | 'SHORT';

interface Args {
  selectorJson: string;
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

interface SelectorRow {
  trade: {
    date: string;
    session: 'morning' | 'lunch';
    direction: Direction;
    entryTimeEt: string;
    entry: number;
    exit: number;
    dollars: number;
  };
  quality: 'tight' | 'usable' | 'loose' | 'reject';
  bestDetection: null | {
    proofTime: string | null;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
    riskPoints: number;
    htfContext: string;
    evidence?: string[];
  };
  minutesBeforeEntry: number | null;
  entryDistancePoints: number | null;
}

interface SelectorReport {
  rows?: SelectorRow[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const selectorJson = readFlag(argv, '--selector-json');
  const marketBarsJson = readFlag(argv, '--market-bars-json');
  if (!selectorJson) throw new Error('--selector-json is required');
  if (!marketBarsJson) throw new Error('--market-bars-json is required');
  return {
    selectorJson,
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

function readSelector(filePath: string): SelectorReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SelectorReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function hasEvidence(row: SelectorRow, phrase: string): boolean {
  return Boolean(row.bestDetection?.evidence?.some((line) => line.toLowerCase().includes(phrase)));
}

function clauseQualified(row: SelectorRow): boolean {
  const detection = row.bestDetection;
  return Boolean(
    detection &&
    (row.quality === 'tight' || row.quality === 'usable') &&
    detection.htfContext === 'support' &&
    hasEvidence(row, 'left imbalance') &&
    typeof row.minutesBeforeEntry === 'number' &&
    row.minutesBeforeEntry <= 20 &&
    typeof row.entryDistancePoints === 'number' &&
    row.entryDistancePoints <= 5
  );
}

function riskFor(direction: Direction, entry: number, stop: number): number | null {
  if (direction === 'LONG' && stop >= entry) return null;
  if (direction === 'SHORT' && stop <= entry) return null;
  return roundToTradeTick(Math.abs(entry - stop));
}

function variant(direction: Direction, name: string, entry: number, stop: number) {
  const riskPoints = riskFor(direction, entry, stop);
  const targets = targetsFromEntryStop(direction, entry, stop);
  return {
    name,
    entry: roundToTradeTick(entry),
    stop: roundToTradeTick(stop),
    riskPoints,
    riskClean: riskPoints !== null && riskPoints <= TRADE_RULES.maxRiskPoints,
    target1: targets.target1,
    target2: targets.target2,
  };
}

function retestEntryForRisk(direction: Direction, stop: number): number {
  return direction === 'LONG'
    ? roundToTradeTick(stop + TRADE_RULES.maxRiskPoints)
    : roundToTradeTick(stop - TRADE_RULES.maxRiskPoints);
}

function geometryFor(row: SelectorRow, bars: MarketBar[]) {
  const proofTime = row.bestDetection?.proofTime;
  if (!proofTime) return null;
  const proofIndex = bars.findIndex((bar) => bar.time === proofTime);
  if (proofIndex === -1) return null;
  const proof = bars[proofIndex];
  const prior = bars[proofIndex - 1] || null;
  const offset = stopOffsetPoints();
  const direction = row.trade.direction;
  const proofWickStop = direction === 'LONG'
    ? roundToTradeTick(proof.low - offset)
    : roundToTradeTick(proof.high + offset);
  const bodyOriginStop = direction === 'LONG'
    ? roundToTradeTick(proof.open - offset)
    : roundToTradeTick(proof.open + offset);
  const priorBarStop = prior
    ? direction === 'LONG'
      ? roundToTradeTick(prior.low - offset)
      : roundToTradeTick(prior.high + offset)
    : null;
  const immediateVariants = [
    variant(direction, 'proof_close_vs_proof_wick', proof.close, proofWickStop),
    variant(direction, 'proof_close_vs_displacement_body_origin', proof.close, bodyOriginStop),
    priorBarStop !== null ? variant(direction, 'proof_close_vs_prior_bar_extreme', proof.close, priorBarStop) : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const retestVariants = [
    variant(direction, 'required_retest_entry_vs_proof_wick', retestEntryForRisk(direction, proofWickStop), proofWickStop),
    variant(direction, 'required_retest_entry_vs_body_origin', retestEntryForRisk(direction, bodyOriginStop), bodyOriginStop),
  ];

  return {
    trade: row.trade,
    quality: row.quality,
    proofTime,
    proofBar: proof,
    immediateVariants,
    retestVariants,
    immediateRiskClean: immediateVariants.some((item) => item.riskClean),
    retestRiskClean: retestVariants.some((item) => item.riskClean),
  };
}

function money(rows: Array<{ trade: { dollars: number } }>): number {
  return Math.round(rows.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100;
}

export function buildRaidFailureDisplacementTightEntryGeometryMiner(args: Args) {
  const selector = readSelector(args.selectorJson);
  const bars = loadFiveMinuteBars(args.marketBarsJson);
  const qualified = (selector.rows || []).filter(clauseQualified);
  const geometryRows = qualified.map((row) => geometryFor(row, bars)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const immediateClean = geometryRows.filter((row) => row.immediateRiskClean);
  const retestClean = geometryRows.filter((row) => row.retestRiskClean);
  return {
    reportType: 'raid_failure_displacement_tight_entry_geometry_miner',
    generatedAt: new Date().toISOString(),
    authority: {
      localSelectorArtifactOnly: true,
      localMarketBarsArtifactOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
      noCanExecuteChange: true,
    },
    source: {
      selectorJson: args.selectorJson,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      sourceRows: selector.rows?.length || 0,
      bars5mLoaded: bars.length,
      clauseQualifiedRows: qualified.length,
      geometryRows: geometryRows.length,
      immediateRiskCleanRows: immediateClean.length,
      immediateRiskCleanDollars: money(immediateClean),
      retestRiskCleanRows: retestClean.length,
      retestRiskCleanDollars: money(retestClean),
      maxRiskPoints: TRADE_RULES.maxRiskPoints,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      canExecuteTrueRows: 0,
    },
    rows: geometryRows,
    recommendation: immediateClean.length
      ? 'research_possible_immediate_tight_geometry_prepare_preview_shadow_test'
      : retestClean.length
        ? 'research_retest_entry_geometry_required_before_scanner_preview'
        : 'do_not_wire_scanner_no_tight_geometry_under_current_risk_cap',
  };
}

function writeReport(report: ReturnType<typeof buildRaidFailureDisplacementTightEntryGeometryMiner>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `raid-failure-displacement-tight-entry-geometry-miner-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'raid-failure-displacement-tight-entry-geometry-miner.ts') {
  const args = parseArgs();
  const report = buildRaidFailureDisplacementTightEntryGeometryMiner(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
