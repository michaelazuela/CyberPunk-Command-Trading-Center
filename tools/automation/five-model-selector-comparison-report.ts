import fs from 'node:fs';
import path from 'node:path';

type Quality = 'tight' | 'usable' | 'loose' | 'reject';

interface Args {
  liquidityRaidReclaimSelectorJson: string;
  raidFailureDisplacementSelectorJson: string;
  drivePullbackContinuationSelectorJson: string | null;
  structureShiftContinuationSelectorJson: string | null;
  json: boolean;
}

interface SelectorTrade {
  date: string;
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  entryTimeEt: string;
  entry: number;
  exit: number;
  dollars: number;
}

interface SelectorRow {
  trade: SelectorTrade;
  matched: boolean;
  quality: Quality;
  bestDetection: null | {
    proofTime: string | null;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
    riskPoints: number;
    htfContext: string;
  };
  minutesBeforeEntry: number | null;
  entryDistancePoints: number | null;
  candidateCount: number;
  scannerInstallEligible: false;
  promotionEligible: false;
  discordEligible: false;
  executionApprovalEligible: false;
}

interface SelectorReport {
  reportType: string;
  source?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  rows?: SelectorRow[];
}

interface ModelInput {
  modelId:
    | 'liquidity_raid_reclaim_reversal'
    | 'raid_failure_displacement_reversal'
    | 'drive_pullback_continuation'
    | 'structure_shift_continuation';
  displayName: string;
  filePath: string;
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const liquidityRaidReclaimSelectorJson = readFlag(argv, '--liquidity-raid-reclaim-selector-json');
  const raidFailureDisplacementSelectorJson = readFlag(argv, '--raid-failure-displacement-selector-json');
  const drivePullbackContinuationSelectorJson = readFlag(argv, '--drive-pullback-continuation-selector-json');
  const structureShiftContinuationSelectorJson = readFlag(argv, '--structure-shift-continuation-selector-json');
  if (!liquidityRaidReclaimSelectorJson) throw new Error('--liquidity-raid-reclaim-selector-json is required');
  if (!raidFailureDisplacementSelectorJson) throw new Error('--raid-failure-displacement-selector-json is required');
  return {
    liquidityRaidReclaimSelectorJson,
    raidFailureDisplacementSelectorJson,
    drivePullbackContinuationSelectorJson,
    structureShiftContinuationSelectorJson,
    json: argv.includes('--json'),
  };
}

function readSelector(filePath: string): SelectorReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SelectorReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function tradeKey(trade: SelectorTrade): string {
  return `${trade.date}|${trade.session}|${trade.direction}|${trade.entryTimeEt}|${trade.entry}|${trade.exit}`;
}

function money(rows: SelectorRow[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100;
}

function modelSummary(input: ModelInput, report: SelectorReport) {
  const rows = report.rows || [];
  const selected = rows.filter((row) => row.quality === 'tight' || row.quality === 'usable');
  const tight = rows.filter((row) => row.quality === 'tight');
  const usable = rows.filter((row) => row.quality === 'usable');
  const loose = rows.filter((row) => row.quality === 'loose');
  const rejected = rows.filter((row) => row.quality === 'reject');
  return {
    modelId: input.modelId,
    displayName: input.displayName,
    sourcePath: input.filePath,
    reportType: report.reportType,
    sourceProfitablePdfTrades: report.summary?.sourceProfitablePdfTrades ?? null,
    sourceMatchedTrades: report.summary?.sourceMatchedTrades ?? null,
    rows: rows.length,
    tightRows: tight.length,
    usableRows: usable.length,
    looseRows: loose.length,
    rejectRows: rejected.length,
    selectedRows: selected.length,
    selectedDollars: money(selected),
    looseDollars: money(loose),
    rejectedDollars: money(rejected),
    longSelectedRows: selected.filter((row) => row.trade.direction === 'LONG').length,
    shortSelectedRows: selected.filter((row) => row.trade.direction === 'SHORT').length,
    morningSelectedRows: selected.filter((row) => row.trade.session === 'morning').length,
    lunchSelectedRows: selected.filter((row) => row.trade.session === 'lunch').length,
    scannerInstallEligibleRows: selected.filter((row) => row.scannerInstallEligible).length,
    promotionEligibleRows: selected.filter((row) => row.promotionEligible).length,
    discordEligibleRows: selected.filter((row) => row.discordEligible).length,
    executionApprovalEligibleRows: selected.filter((row) => row.executionApprovalEligible).length,
  };
}

function selectedRows(report: SelectorReport): SelectorRow[] {
  return (report.rows || []).filter((row) => row.quality === 'tight' || row.quality === 'usable');
}

export function buildFiveModelSelectorComparisonReport(args: Args) {
  const inputs: ModelInput[] = [
    {
      modelId: 'liquidity_raid_reclaim_reversal',
      displayName: 'Liquidity Raid Reclaim Reversal',
      filePath: args.liquidityRaidReclaimSelectorJson,
    },
    {
      modelId: 'raid_failure_displacement_reversal',
      displayName: 'Raid Failure Displacement Reversal',
      filePath: args.raidFailureDisplacementSelectorJson,
    },
    ...(args.drivePullbackContinuationSelectorJson
      ? [{
          modelId: 'drive_pullback_continuation' as const,
          displayName: 'Drive Pullback Continuation',
          filePath: args.drivePullbackContinuationSelectorJson,
        }]
      : []),
    ...(args.structureShiftContinuationSelectorJson
      ? [{
          modelId: 'structure_shift_continuation' as const,
          displayName: 'Structure Shift Continuation',
          filePath: args.structureShiftContinuationSelectorJson,
        }]
      : []),
  ];
  const reports = inputs.map((input) => ({ input, report: readSelector(input.filePath) }));
  const summaries = reports.map(({ input, report }) => modelSummary(input, report));
  const selectedByModel = reports.map(({ input, report }) => ({
    modelId: input.modelId,
    rows: selectedRows(report),
  }));
  const keyToModels = new Map<string, Set<ModelInput['modelId']>>();
  selectedByModel.forEach(({ modelId, rows }) => {
    rows.forEach((row) => {
      const key = tradeKey(row.trade);
      const models = keyToModels.get(key) || new Set<ModelInput['modelId']>();
      models.add(modelId);
      keyToModels.set(key, models);
    });
  });
  const overlapKeys = [...keyToModels.entries()]
    .filter(([, modelIds]) => modelIds.size > 1)
    .map(([key]) => key);
  const selectedOnlyCounts = selectedByModel.reduce<Record<string, number>>((acc, item) => {
    acc[item.modelId] = item.rows.filter((row) => keyToModels.get(tradeKey(row.trade))?.size === 1).length;
    return acc;
  }, {});
  const firstOnly = selectedByModel[0]?.rows.filter((row) => keyToModels.get(tradeKey(row.trade))?.size === 1) || [];
  const secondOnly = selectedByModel[1]?.rows.filter((row) => keyToModels.get(tradeKey(row.trade))?.size === 1) || [];
  const thirdOnly = selectedByModel[2]?.rows.filter((row) => keyToModels.get(tradeKey(row.trade))?.size === 1) || [];
  const fourthOnly = selectedByModel[3]?.rows.filter((row) => keyToModels.get(tradeKey(row.trade))?.size === 1) || [];
  const winner = [...summaries].sort((a, b) =>
    b.selectedDollars - a.selectedDollars ||
    b.selectedRows - a.selectedRows ||
    b.tightRows - a.tightRows
  )[0];

  return {
    reportType: 'five_model_selector_comparison_report',
    generatedAt: new Date().toISOString(),
    authority: {
      localSelectorArtifactsOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
    },
    source: {
      liquidityRaidReclaimSelectorJson: args.liquidityRaidReclaimSelectorJson,
      raidFailureDisplacementSelectorJson: args.raidFailureDisplacementSelectorJson,
      drivePullbackContinuationSelectorJson: args.drivePullbackContinuationSelectorJson,
      structureShiftContinuationSelectorJson: args.structureShiftContinuationSelectorJson,
    },
    summary: {
      modelsCompared: summaries.length,
      sourceProfitablePdfTrades: summaries[0]?.sourceProfitablePdfTrades ?? null,
      selectedRowsTotal: summaries.reduce((sum, item) => sum + item.selectedRows, 0),
      selectedDollarsTotal: Math.round(summaries.reduce((sum, item) => sum + item.selectedDollars, 0) * 100) / 100,
      selectedOverlapRows: overlapKeys.length,
      liquidityRaidReclaimOnlyRows: firstOnly.length,
      raidFailureDisplacementOnlyRows: secondOnly.length,
      drivePullbackContinuationOnlyRows: thirdOnly.length,
      structureShiftContinuationOnlyRows: fourthOnly.length,
      selectedOnlyCounts,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      leadingModelId: winner?.modelId ?? null,
      leadingModelSelectedRows: winner?.selectedRows ?? 0,
      leadingModelSelectedDollars: winner?.selectedDollars ?? 0,
    },
    modelSummaries: summaries,
    overlap: overlapKeys,
    onlyLiquidityRaidReclaim: firstOnly.map((row) => row.trade),
    onlyRaidFailureDisplacement: secondOnly.map((row) => row.trade),
    onlyDrivePullbackContinuation: thirdOnly.map((row) => row.trade),
    onlyStructureShiftContinuation: fourthOnly.map((row) => row.trade),
    recommendation: winner?.modelId === 'raid_failure_displacement_reversal'
      ? 'prepare_replay_only_source_clause_miner_for_raid_failure_displacement_before_scanner_preview'
      : 'continue_replay_only_comparison_before_scanner_preview',
  };
}

function writeReport(report: ReturnType<typeof buildFiveModelSelectorComparisonReport>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `five-model-selector-comparison-report-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'five-model-selector-comparison-report.ts') {
  const args = parseArgs();
  const report = buildFiveModelSelectorComparisonReport(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
