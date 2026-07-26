import fs from 'node:fs';
import path from 'node:path';
import { TRADE_RULES } from '../../src/config/tradeRules';
import type { ApprovedDeskModelId } from '../../src/config/approvedDeskModels';

type LaneRole = 'primary_candidate_lane' | 'secondary_candidate_lane' | 'context_only_lane' | 'not_selected_lane';

interface Args {
  previewContractJson: string;
  localPreview: boolean;
  json: boolean;
}

interface PreviewContractLane {
  modelId: ApprovedDeskModelId;
  displayName: string;
  role: LaneRole;
}

interface PreviewContractReport {
  source?: {
    comparisonJson?: string;
  };
  lanes?: PreviewContractLane[];
}

interface ComparisonReport {
  source?: Partial<Record<
    | 'liquidityRaidReclaimSelectorJson'
    | 'raidFailureDisplacementSelectorJson'
    | 'drivePullbackContinuationSelectorJson'
    | 'structureShiftContinuationSelectorJson'
    | 'failedBreakoutReversalSelectorJson',
    string | null
  >>;
}

interface SelectorRow {
  trade: {
    date: string;
    session: 'morning' | 'lunch';
    direction: 'LONG' | 'SHORT';
    entryTimeEt: string;
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
  };
  minutesBeforeEntry: number | null;
  entryDistancePoints: number | null;
}

interface SelectorReport {
  rows?: SelectorRow[];
}

const selectorSourceByModel: Record<ApprovedDeskModelId, keyof NonNullable<ComparisonReport['source']>> = {
  liquidity_raid_reclaim_reversal: 'liquidityRaidReclaimSelectorJson',
  raid_failure_displacement_reversal: 'raidFailureDisplacementSelectorJson',
  drive_pullback_continuation: 'drivePullbackContinuationSelectorJson',
  structure_shift_continuation: 'structureShiftContinuationSelectorJson',
  failed_breakout_reversal: 'failedBreakoutReversalSelectorJson',
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const previewContractJson = readFlag(argv, '--preview-contract-json');
  if (!previewContractJson) throw new Error('--preview-contract-json is required');
  return {
    previewContractJson,
    localPreview: argv.includes('--local-preview'),
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function selectedRows(filePath: string): SelectorRow[] {
  const report = readJson<SelectorReport>(filePath);
  return (Array.isArray(report.rows) ? report.rows : []).filter((row) => row.quality === 'tight' || row.quality === 'usable');
}

function readiness(row: SelectorRow): 'preview_ready' | 'held_by_risk' | 'missing_risk' {
  const risk = row.bestDetection?.riskPoints;
  if (typeof risk !== 'number' || !Number.isFinite(risk) || risk <= 0) return 'missing_risk';
  return risk <= TRADE_RULES.maxRiskPoints ? 'preview_ready' : 'held_by_risk';
}

export function buildFiveModelScannerCandidatePreviewDryRun(args: Args) {
  const contract = readJson<PreviewContractReport>(args.previewContractJson);
  const comparisonJson = contract.source?.comparisonJson;
  if (!comparisonJson) throw new Error('preview contract is missing source.comparisonJson');
  const comparison = readJson<ComparisonReport>(comparisonJson);
  const lanes = Array.isArray(contract.lanes) ? contract.lanes : [];
  const previewLaneRoles: LaneRole[] = ['primary_candidate_lane', 'secondary_candidate_lane'];
  const candidateLanes = lanes.filter((lane) => previewLaneRoles.includes(lane.role));
  const contextLanes = lanes.filter((lane) => lane.role === 'context_only_lane');
  const shapedRows = args.localPreview
    ? candidateLanes.flatMap((lane) => {
        const selectorPath = comparison.source?.[selectorSourceByModel[lane.modelId]];
        if (!selectorPath) return [];
        return selectedRows(selectorPath).map((row) => {
          const rowReadiness = readiness(row);
          return {
            modelId: lane.modelId,
            displayName: lane.displayName,
            laneRole: lane.role,
            date: row.trade.date,
            session: row.trade.session,
            direction: row.trade.direction,
            proofTime: row.bestDetection?.proofTime || null,
            entry: row.bestDetection?.entry ?? null,
            stop: row.bestDetection?.stop ?? null,
            target1: row.bestDetection?.target1 ?? null,
            target2: row.bestDetection?.target2 ?? null,
            riskPoints: row.bestDetection?.riskPoints ?? null,
            maxRiskPoints: TRADE_RULES.maxRiskPoints,
            htfContext: row.bestDetection?.htfContext || 'unknown',
            pdfEntryTimeEt: row.trade.entryTimeEt,
            pdfMatchedDollars: row.trade.dollars,
            minutesBeforeEntry: row.minutesBeforeEntry,
            entryDistancePoints: row.entryDistancePoints,
            readiness: rowReadiness,
            previewOnly: true,
            scannerInstallEligible: false,
            promotionEligible: false,
            discordEligible: false,
            executionApprovalEligible: false,
            canExecute: false,
          };
        });
      })
    : [];
  const readyRows = shapedRows.filter((row) => row.readiness === 'preview_ready');
  const heldByRiskRows = shapedRows.filter((row) => row.readiness === 'held_by_risk');

  return {
    reportType: 'five_model_scanner_candidate_preview_dry_run',
    generatedAt: new Date().toISOString(),
    authority: {
      localContractArtifactOnly: true,
      explicitLocalPreviewRequired: true,
      localPreviewRequested: args.localPreview,
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
      previewContractJson: args.previewContractJson,
      comparisonJson,
    },
    summary: {
      candidateLanes: candidateLanes.length,
      contextOnlyLanes: contextLanes.length,
      localPreviewRequested: args.localPreview,
      shapedPreviewRows: shapedRows.length,
      previewReadyRows: readyRows.length,
      heldByRiskRows: heldByRiskRows.length,
      maxRiskPoints: TRADE_RULES.maxRiskPoints,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      canExecuteTrueRows: 0,
    },
    contextOnlyLanes: contextLanes.map((lane) => ({
      modelId: lane.modelId,
      displayName: lane.displayName,
      note: 'Context-only in this disabled preview because selected rows overlap stronger lanes or add no unique selected edge.',
    })),
    rows: shapedRows,
    recommendation: readyRows.length
      ? 'continue_to_disabled_scanner_surface_adapter_preview'
      : 'do_not_build_scanner_surface_yet_preview_rows_are_absent_or_held_by_risk',
  };
}

function writeReport(report: ReturnType<typeof buildFiveModelScannerCandidatePreviewDryRun>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `five-model-scanner-candidate-preview-dry-run-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'five-model-scanner-candidate-preview-dry-run.ts') {
  const args = parseArgs();
  const report = buildFiveModelScannerCandidatePreviewDryRun(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
