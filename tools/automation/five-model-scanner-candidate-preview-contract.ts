import fs from 'node:fs';
import path from 'node:path';
import { getApprovedDeskModelDefinition, type ApprovedDeskModelId } from '../../src/config/approvedDeskModels';

type LaneRole = 'primary_candidate_lane' | 'secondary_candidate_lane' | 'context_only_lane' | 'not_selected_lane';

interface Args {
  comparisonJson: string;
  json: boolean;
}

interface ModelSummary {
  modelId: ApprovedDeskModelId;
  displayName: string;
  selectedRows: number;
  selectedDollars: number;
  tightRows: number;
  usableRows: number;
  sourceMatchedTrades: number | null;
}

interface ComparisonReport {
  summary?: {
    leadingModelId?: ApprovedDeskModelId | null;
    selectedOnlyCounts?: Partial<Record<ApprovedDeskModelId, number>>;
  };
  modelSummaries?: ModelSummary[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const comparisonJson = readFlag(argv, '--comparison-json');
  if (!comparisonJson) throw new Error('--comparison-json is required');
  return {
    comparisonJson,
    json: argv.includes('--json'),
  };
}

function readComparison(filePath: string): ComparisonReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ComparisonReport;
  return {
    ...root,
    modelSummaries: Array.isArray(root.modelSummaries) ? root.modelSummaries : [],
  };
}

function laneRoleFor(model: ModelSummary, leadingModelId: ApprovedDeskModelId | null, uniqueRows: number): LaneRole {
  if (model.selectedRows <= 0) return 'not_selected_lane';
  if (model.modelId === leadingModelId) return 'primary_candidate_lane';
  if (uniqueRows > 0) return 'secondary_candidate_lane';
  return 'context_only_lane';
}

export function buildFiveModelScannerCandidatePreviewContract(args: Args) {
  const comparison = readComparison(args.comparisonJson);
  const leadingModelId = comparison.summary?.leadingModelId || null;
  const selectedOnlyCounts = comparison.summary?.selectedOnlyCounts || {};
  const lanes = (comparison.modelSummaries || []).map((model) => {
    const uniqueRows = selectedOnlyCounts[model.modelId] || 0;
    const role = laneRoleFor(model, leadingModelId, uniqueRows);
    const definition = getApprovedDeskModelDefinition(model.modelId);
    return {
      modelId: model.modelId,
      displayName: model.displayName,
      role,
      selectedRows: model.selectedRows,
      selectedDollars: model.selectedDollars,
      uniqueSelectedRows: uniqueRows,
      tightRows: model.tightRows,
      usableRows: model.usableRows,
      sourceMatchedTrades: model.sourceMatchedTrades,
      replaySessionsAllowed: definition.approvedSessionsForReplay,
      productionSessionsEnabled: definition.productionSessionsEnabled,
      scannerCandidateEligible: false,
      promotionEligible: false,
      discordEligible: false,
      executionApprovalEligible: false,
      canExecuteEligible: false,
      candidatePreviewReason: role === 'primary_candidate_lane'
        ? 'Leading selected-dollar lane from five-model comparison; eligible for disabled local scanner-candidate preview only.'
        : role === 'secondary_candidate_lane'
          ? 'Adds unique selected rows; eligible for secondary disabled local scanner-candidate preview only.'
          : role === 'context_only_lane'
            ? 'Selected rows overlap other lanes; may annotate context only until unique edge is proven.'
            : 'No selected tight/usable rows in the comparison; do not preview as scanner candidate.',
    };
  });
  const primaryLanes = lanes.filter((lane) => lane.role === 'primary_candidate_lane');
  const secondaryLanes = lanes.filter((lane) => lane.role === 'secondary_candidate_lane');
  const contextOnlyLanes = lanes.filter((lane) => lane.role === 'context_only_lane');
  const notSelectedLanes = lanes.filter((lane) => lane.role === 'not_selected_lane');

  return {
    reportType: 'five_model_scanner_candidate_preview_contract',
    generatedAt: new Date().toISOString(),
    authority: {
      localComparisonArtifactOnly: true,
      disabledPreviewContractOnly: true,
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
      comparisonJson: args.comparisonJson,
    },
    summary: {
      lanes: lanes.length,
      primaryCandidateLanes: primaryLanes.length,
      secondaryCandidateLanes: secondaryLanes.length,
      contextOnlyLanes: contextOnlyLanes.length,
      notSelectedLanes: notSelectedLanes.length,
      scannerCandidateEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      canExecuteEligibleRows: 0,
      leadingModelId,
      primaryModelIds: primaryLanes.map((lane) => lane.modelId),
      secondaryModelIds: secondaryLanes.map((lane) => lane.modelId),
      contextOnlyModelIds: contextOnlyLanes.map((lane) => lane.modelId),
    },
    lanes,
    recommendation: primaryLanes.length
      ? 'build_disabled_local_scanner_candidate_preview_from_primary_and_secondary_lanes'
      : 'do_not_build_scanner_preview_until_a_primary_lane_exists',
  };
}

function writeReport(report: ReturnType<typeof buildFiveModelScannerCandidatePreviewContract>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `five-model-scanner-candidate-preview-contract-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'five-model-scanner-candidate-preview-contract.ts') {
  const args = parseArgs();
  const report = buildFiveModelScannerCandidatePreviewContract(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
