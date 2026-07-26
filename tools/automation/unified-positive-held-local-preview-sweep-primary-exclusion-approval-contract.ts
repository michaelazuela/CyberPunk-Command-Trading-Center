import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport,
} from './unified-positive-held-local-preview-model-family-installed-penalty-audit';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport,
} from './unified-positive-held-local-preview-model-family-valid-slate-simulation';

type ContractDecision = 'approved_for_research_dry_run_only' | 'keep_research_only' | 'fix_inputs';

interface Gate {
  name: string;
  passed: boolean;
  detail: string;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    reportDir: string;
    installedPenaltyAuditPath: string | null;
    validSlateSimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    approvalContractOnly: true;
    proposedBehaviorNotInstalled: true;
    blockedAuditVisibilityMustRemain: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  proposedScannerVisibleBehavior: {
    model: 'NoInstalledSetup';
    appliesOnlyWhen: {
      executionStatus: 'Blocked';
      blockReason: 'InvalidStopLocation';
    };
    proposedEffect: 'exclude_from_primary_desk_idea_selection_only';
    preservedEffects: string[];
    implementationAllowedNow: false;
    requiredFutureApproval: true;
  };
  summary: {
    invalidStopSweepRows: number;
    invalidStopSweepRowsBlocked: number;
    invalidStopSweepCanExecuteTrueRows: number;
    invalidStopSweepPrimaryRows: number;
    entryStopTargetRiskDriftRows: number;
    validOnlyChangedSlates: number;
    validOnlyTopSelectionDeltaOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    failedGateCount: number;
    decision: ContractDecision;
  };
  gates: Gate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function gate(name: string, passed: boolean, detail: string): Gate {
  return { name, passed, detail };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval contract. It does not install scanner-visible selection, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, remove models, or change entry/stop/target/risk math.',
    '',
    '## Proposed Behavior',
    `- Model: ${report.proposedScannerVisibleBehavior.model}.`,
    `- Applies only when executionStatus=${report.proposedScannerVisibleBehavior.appliesOnlyWhen.executionStatus} and blockReason=${report.proposedScannerVisibleBehavior.appliesOnlyWhen.blockReason}.`,
    `- Effect: ${report.proposedScannerVisibleBehavior.proposedEffect}.`,
    '- Blocked audit visibility remains; this is not a model removal or hard filter.',
    '- Future scanner dry-run and explicit approval are required before any live-facing install.',
    '',
    '## Summary',
    `- Invalid-stop Sweep rows: ${report.summary.invalidStopSweepRows}.`,
    `- Invalid-stop Sweep rows blocked: ${report.summary.invalidStopSweepRowsBlocked}.`,
    `- Invalid-stop Sweep canExecute=true rows: ${report.summary.invalidStopSweepCanExecuteTrueRows}.`,
    `- Invalid-stop Sweep primary rows: ${report.summary.invalidStopSweepPrimaryRows}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Valid-only changed slates: ${report.summary.validOnlyChangedSlates}.`,
    `- Valid-only top-selection delta: ${report.summary.validOnlyTopSelectionDeltaOneMesPl ?? '-'}.`,
    `- Failed gates: ${report.summary.failedGateCount}.`,
    `- Decision: ${report.summary.decision}.`,
    '',
    '## Gates',
    '| Gate | Pass | Detail |',
    '|---|---|---|',
    ...report.gates.map((item) => `| ${item.name} | ${item.passed ? 'yes' : 'no'} | ${item.detail.replace(/\|/g, '/')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport(args: {
  reportDir: string;
  installedPenaltyAuditPath: string | null;
  installedPenaltyAuditReport: UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport | null;
  validSlateSimulationPath: string | null;
  validSlateSimulationReport: UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport {
  const penalty = args.installedPenaltyAuditReport?.summary;
  const simulation = args.validSlateSimulationReport?.summary;
  const gates = [
    gate('input_reports_present', Boolean(args.installedPenaltyAuditReport && args.validSlateSimulationReport), 'Installed penalty audit and valid-slate simulation are both required.'),
    gate('input_reports_passed', args.installedPenaltyAuditReport?.status === 'pass' && args.validSlateSimulationReport?.status === 'pass', `installed=${args.installedPenaltyAuditReport?.status ?? 'missing'}, validSlate=${args.validSlateSimulationReport?.status ?? 'missing'}.`),
    gate('invalid_rows_remain_blocked', Boolean(penalty && penalty.invalidStopSweepRows > 0 && penalty.invalidStopSweepRows === penalty.invalidStopSweepRowsBlocked), `${penalty?.invalidStopSweepRowsBlocked ?? 0}/${penalty?.invalidStopSweepRows ?? 0} invalid-stop Sweep rows blocked.`),
    gate('no_invalid_rows_can_execute', (penalty?.invalidStopSweepCanExecuteTrueRows ?? 1) === 0, `${penalty?.invalidStopSweepCanExecuteTrueRows ?? 0} invalid-stop Sweep rows had canExecute=true.`),
    gate('levels_preserved', (penalty?.entryStopTargetRiskDriftRows ?? 1) === 0, `${penalty?.entryStopTargetRiskDriftRows ?? 0} entry/stop/target/risk drift rows.`),
    gate('primary_contamination_exists', (penalty?.invalidStopSweepPrimaryRows ?? 0) > 0, `${penalty?.invalidStopSweepPrimaryRows ?? 0} invalid-stop Sweep rows still became primary.`),
    gate('valid_only_research_non_negative', (simulation?.topSelectionDeltaOneMesPl ?? -1) >= 0, `valid-only same-slate delta ${simulation?.topSelectionDeltaOneMesPl ?? 'missing'}.`),
    gate('no_live_promotion', (penalty?.livePromotionAllowedRows ?? 1) === 0 && (simulation?.livePromotionAllowedRows ?? 1) === 0, `penalty=${penalty?.livePromotionAllowedRows ?? 'missing'}, validSlate=${simulation?.livePromotionAllowedRows ?? 'missing'}.`),
  ];
  const blockers = [
    !args.installedPenaltyAuditPath ? 'missing installed penalty audit path' : null,
    !args.installedPenaltyAuditReport ? 'missing installed penalty audit report' : null,
    !args.validSlateSimulationPath ? 'missing valid-slate simulation path' : null,
    !args.validSlateSimulationReport ? 'missing valid-slate simulation report' : null,
    ...gates.filter((item) => !item.passed).map((item) => `${item.name}: ${item.detail}`),
  ].filter((item): item is string => Boolean(item));
  const failedGateCount = gates.filter((item) => !item.passed).length;
  const decision: ContractDecision = blockers.length
    ? 'fix_inputs'
    : 'approved_for_research_dry_run_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      installedPenaltyAuditPath: args.installedPenaltyAuditPath,
      validSlateSimulationPath: args.validSlateSimulationPath,
    },
    assumptions: {
      savedReportsOnly: true,
      approvalContractOnly: true,
      proposedBehaviorNotInstalled: true,
      blockedAuditVisibilityMustRemain: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    proposedScannerVisibleBehavior: {
      model: 'NoInstalledSetup',
      appliesOnlyWhen: {
        executionStatus: 'Blocked',
        blockReason: 'InvalidStopLocation',
      },
      proposedEffect: 'exclude_from_primary_desk_idea_selection_only',
      preservedEffects: [
        'Blocked candidate remains available for audit and diagnostics.',
        'Valid NoInstalledSetup candidates remain rankable.',
        'historicalReview, AfterLunch, OpeningDrive, Intraday, and HTF families are not removed.',
        'canExecute, entry, stop, target, risk, Discord, Supabase, and bridge behavior remain unchanged.',
      ],
      implementationAllowedNow: false,
      requiredFutureApproval: true,
    },
    summary: {
      invalidStopSweepRows: penalty?.invalidStopSweepRows || 0,
      invalidStopSweepRowsBlocked: penalty?.invalidStopSweepRowsBlocked || 0,
      invalidStopSweepCanExecuteTrueRows: penalty?.invalidStopSweepCanExecuteTrueRows || 0,
      invalidStopSweepPrimaryRows: penalty?.invalidStopSweepPrimaryRows || 0,
      entryStopTargetRiskDriftRows: penalty?.entryStopTargetRiskDriftRows || 0,
      validOnlyChangedSlates: simulation?.changedSlates || 0,
      validOnlyTopSelectionDeltaOneMesPl: simulation?.topSelectionDeltaOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      failedGateCount,
      decision,
    },
    gates,
    blockers,
    recommendations: blockers.length
      ? ['Repair contract inputs before considering a primary-selection dry-run.']
      : [
        'Next phase may build a research-only scanner-output dry-run for primary-selection exclusion.',
        'Do not install runtime selection behavior until the dry-run proves zero live publish, canExecute, entry/stop/target/risk, Discord, Supabase, and bridge changes.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-primary-exclusion-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedPenaltyAuditPath = readFlag(args, '--installed-penalty-audit') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-installed-penalty-audit-\d+\.json$/);
  const validSlateSimulationPath = readFlag(args, '--valid-slate-simulation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-valid-slate-simulation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport({
    reportDir: outDir,
    installedPenaltyAuditPath,
    installedPenaltyAuditReport: installedPenaltyAuditPath && fs.existsSync(installedPenaltyAuditPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport>(installedPenaltyAuditPath)
      : null,
    validSlateSimulationPath,
    validSlateSimulationReport: validSlateSimulationPath && fs.existsSync(validSlateSimulationPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport>(validSlateSimulationPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
