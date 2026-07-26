import fs from 'node:fs';
import path from 'node:path';
import { TRADE_RULES, roundToTradeTick, stopOffsetPoints, targetsFromEntryStop } from '../../src/config/tradeRules';
import type { ApprovedDeskModelId } from '../../src/config/approvedDeskModels';

type Direction = 'LONG' | 'SHORT';

interface Args {
  previewDryRunJson: string;
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

interface PreviewRow {
  modelId: ApprovedDeskModelId;
  laneRole: 'primary_candidate_lane' | 'secondary_candidate_lane';
  date: string;
  session: 'morning' | 'lunch';
  direction: Direction;
  proofTime: string | null;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  pdfMatchedDollars: number;
  readiness: string;
}

interface PreviewDryRunReport {
  rows?: PreviewRow[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const previewDryRunJson = readFlag(argv, '--preview-dry-run-json');
  const marketBarsJson = readFlag(argv, '--market-bars-json');
  if (!previewDryRunJson) throw new Error('--preview-dry-run-json is required');
  if (!marketBarsJson) throw new Error('--market-bars-json is required');
  return {
    previewDryRunJson,
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

function readPreview(filePath: string): PreviewDryRunReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as PreviewDryRunReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function riskFor(direction: Direction, entry: number, stop: number): number | null {
  if (direction === 'LONG' && stop >= entry) return null;
  if (direction === 'SHORT' && stop <= entry) return null;
  return roundToTradeTick(Math.abs(entry - stop));
}

function variant(direction: Direction, name: string, entry: number, stop: number) {
  const roundedEntry = roundToTradeTick(entry);
  const roundedStop = roundToTradeTick(stop);
  const riskPoints = riskFor(direction, roundedEntry, roundedStop);
  const targets = targetsFromEntryStop(direction, roundedEntry, roundedStop);
  return {
    name,
    entry: roundedEntry,
    stop: roundedStop,
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

function geometryFor(row: PreviewRow, bars: MarketBar[]) {
  if (!row.proofTime || row.entry === null) return null;
  const proofIndex = bars.findIndex((bar) => bar.time === row.proofTime);
  if (proofIndex === -1) return null;
  const proof = bars[proofIndex];
  const prior = bars[proofIndex - 1] || null;
  const offset = stopOffsetPoints();
  const proofWickStop = row.direction === 'LONG'
    ? roundToTradeTick(proof.low - offset)
    : roundToTradeTick(proof.high + offset);
  const bodyOriginStop = row.direction === 'LONG'
    ? roundToTradeTick(proof.open - offset)
    : roundToTradeTick(proof.open + offset);
  const priorBarStop = prior
    ? row.direction === 'LONG'
      ? roundToTradeTick(prior.low - offset)
      : roundToTradeTick(prior.high + offset)
    : null;
  const immediateVariants = [
    variant(row.direction, 'candidate_entry_vs_proof_wick', row.entry, proofWickStop),
    variant(row.direction, 'candidate_entry_vs_body_origin', row.entry, bodyOriginStop),
    priorBarStop !== null ? variant(row.direction, 'candidate_entry_vs_prior_bar_extreme', row.entry, priorBarStop) : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const retestVariants = [
    variant(row.direction, 'required_retest_entry_vs_proof_wick', retestEntryForRisk(row.direction, proofWickStop), proofWickStop),
    variant(row.direction, 'required_retest_entry_vs_body_origin', retestEntryForRisk(row.direction, bodyOriginStop), bodyOriginStop),
  ];
  return {
    ...row,
    proofBar: proof,
    originalRiskPoints: row.riskPoints,
    immediateVariants,
    retestVariants,
    immediateRiskClean: immediateVariants.some((item) => item.riskClean),
    retestRiskClean: retestVariants.some((item) => item.riskClean),
    scannerInstallEligible: false,
    promotionEligible: false,
    discordEligible: false,
    executionApprovalEligible: false,
    canExecute: false,
  };
}

function money(rows: Array<{ pdfMatchedDollars: number }>): number {
  return Math.round(rows.reduce((sum, row) => sum + row.pdfMatchedDollars, 0) * 100) / 100;
}

export function buildFiveModelProtectedEntryGeometryMiner(args: Args) {
  const preview = readPreview(args.previewDryRunJson);
  const bars = loadFiveMinuteBars(args.marketBarsJson);
  const sourceRows = preview.rows || [];
  const geometryRows = sourceRows.map((row) => geometryFor(row, bars)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const immediateClean = geometryRows.filter((row) => row.immediateRiskClean);
  const retestClean = geometryRows.filter((row) => row.retestRiskClean);

  return {
    reportType: 'five_model_protected_entry_geometry_miner',
    generatedAt: new Date().toISOString(),
    authority: {
      localPreviewArtifactOnly: true,
      localMarketBarsArtifactOnly: true,
      noSetupRegistryChange: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
      noCanExecuteChange: true,
    },
    source: {
      previewDryRunJson: args.previewDryRunJson,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      sourceRows: sourceRows.length,
      bars5mLoaded: bars.length,
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
      ? 'research_possible_immediate_tight_geometry_prepare_disabled_surface_preview'
      : retestClean.length
        ? 'research_retest_entry_geometry_required_before_disabled_surface_preview'
        : 'do_not_wire_scanner_no_tight_geometry_under_current_risk_cap',
  };
}

function writeReport(report: ReturnType<typeof buildFiveModelProtectedEntryGeometryMiner>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `five-model-protected-entry-geometry-miner-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'five-model-protected-entry-geometry-miner.ts') {
  const args = parseArgs();
  const report = buildFiveModelProtectedEntryGeometryMiner(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
