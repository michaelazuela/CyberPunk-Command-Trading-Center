import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-lane-validation';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';

interface CliOptions {
  laneValidation: string;
  freshReplayPackage: string;
  outDir: string;
  json: boolean;
}

interface ApprovalGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

interface Authority {
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
}

export interface RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    laneValidationPath: string;
    freshReplayPackagePath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    contractOnly: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    promotionDisabled: true;
  };
  proposedResearchBoundary: {
    setupType: 'OpeningDriveFvgContinuation';
    selector: 'fine_risk_24_to_32';
    scannerVisibleNow: false;
    requiresFutureApprovalGate: true;
    proposedLaterBehavior: string;
  };
  approvalContract: {
    name: 'openingdrive_fine_risk_approval_contract';
    approvalRequiredBeforeImplementation: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    gates: ApprovalGate[];
    requiredRegressionCommands: string[];
    implementationInvariants: string[];
    rollbackContract: string[];
  };
  summary: {
    laneRows: number;
    laneWinners: number;
    laneLosses: number;
    laneOtherResolved: number;
    laneUnresolved: number;
    laneOneMesPl: number | null;
    freshPackageRejectedLosses: number;
    freshPackageTightLongLosses: number;
    livePromotionAllowedRows: 0;
    failedGateCount: number;
    recommendation: 'await_explicit_approval_or_broaden_research' | 'fix_inputs';
  };
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const laneValidation = readFlag(args, '--lane-validation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fine-risk-lane-validation-\d+\.json$/);
  const freshReplayPackage = readFlag(args, '--fresh-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-\d+\.json$/);
  if (!laneValidation) throw new Error('--lane-validation is required.');
  if (!freshReplayPackage) throw new Error('--fresh-replay-package is required.');
  return { laneValidation, freshReplayPackage, outDir, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
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

function tightLongLosses(report: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null): number {
  return (report?.selectorSummaries || []).find((row) => row.selector === 'tight_long_risk_4_to_8')?.losses || 0;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Fine-Risk Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval contract. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Evidence',
    `- Lane rows W/L/O/U: ${report.summary.laneWinners}/${report.summary.laneLosses}/${report.summary.laneOtherResolved}/${report.summary.laneUnresolved}.`,
    `- Lane one-MES P/L: ${report.summary.laneOneMesPl ?? '-'}.`,
    `- Fresh package rejected losses: ${report.summary.freshPackageRejectedLosses}.`,
    `- Fresh package tight-long losses: ${report.summary.freshPackageTightLongLosses}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Proposed Later Boundary',
    `- Setup: ${report.proposedResearchBoundary.setupType}.`,
    `- Selector: ${report.proposedResearchBoundary.selector}.`,
    `- Scanner visible now: ${report.proposedResearchBoundary.scannerVisibleNow}.`,
    `- Requires future approval gate: ${report.proposedResearchBoundary.requiresFutureApprovalGate}.`,
    '',
    '## Approval Gates',
    ...report.approvalContract.gates.map((gate) => `- ${gate.name}: ${gate.status} - ${gate.proof}`),
    '',
    '## Required Regression Commands',
    ...report.approvalContract.requiredRegressionCommands.map((command) => `- ${command}`),
    '',
    '## Implementation Invariants',
    ...report.approvalContract.implementationInvariants.map((item) => `- ${item}`),
    '',
    '## Rollback Contract',
    ...report.approvalContract.rollbackContract.map((item) => `- ${item}`),
    '',
    '## Recommendation',
    `- ${report.summary.recommendation}`,
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport(args: {
  laneValidationPath: string;
  laneValidation: RawOhlcScannerArtifactOpeningDriveFineRiskLaneValidationReport | null;
  freshReplayPackagePath: string;
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport {
  const lane = args.laneValidation;
  const fresh = args.freshReplayPackage;
  const gates: ApprovalGate[] = [
    {
      name: 'lane_validation_status_pass',
      required: true,
      status: lane?.status === 'pass' ? 'pass' : 'fail',
      proof: lane ? `lane validation status ${lane.status}` : 'lane validation missing',
    },
    {
      name: 'lane_validated_for_research_proposal',
      required: true,
      status: lane?.summary.validationDecision === 'validated_for_research_proposal_candidate' ? 'pass' : 'fail',
      proof: lane ? `lane decision ${lane.summary.validationDecision}` : 'lane validation missing',
    },
    {
      name: 'lane_zero_losses_positive_pl',
      required: true,
      status: lane?.summary.losses === 0 && (lane?.summary.oneMesPl ?? 0) > 0 ? 'pass' : 'fail',
      proof: lane ? `losses ${lane.summary.losses}, oneMesPl ${lane.summary.oneMesPl}` : 'lane validation missing',
    },
    {
      name: 'fresh_package_status_pass',
      required: true,
      status: fresh?.status === 'pass' ? 'pass' : 'fail',
      proof: fresh ? `fresh package status ${fresh.status}` : 'fresh package missing',
    },
    {
      name: 'promotion_still_disabled',
      required: true,
      status: lane?.summary.livePromotionAllowedRows === 0 && fresh?.summary.livePromotionAllowedRows === 0 ? 'pass' : 'fail',
      proof: `lane live rows ${lane?.summary.livePromotionAllowedRows ?? 'missing'}, fresh live rows ${fresh?.summary.livePromotionAllowedRows ?? 'missing'}`,
    },
    {
      name: 'live_authority_flags_locked_off',
      required: true,
      status: lane?.authority.changesScannerBehavior === false
        && lane.authority.changesTradingLogic === false
        && lane.authority.changesCanExecute === false
        && lane.authority.changesEntryStopTargets === false
        && lane.authority.changesRiskRules === false
        && lane.authority.postsDiscord === false
        && lane.authority.writesSupabase === false
        && lane.authority.readsLiveBridge === false
        ? 'pass'
        : 'fail',
      proof: 'scanner/trading/canExecute/entry-stop-target/risk/Discord/Supabase/bridge flags must remain false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !lane ? 'missing OpeningDrive fine-risk lane validation report' : null,
    !fresh ? 'missing OpeningDrive fresh replay package report' : null,
    ...failedGates.map((gate) => `approval gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_fine_risk_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      laneValidationPath: args.laneValidationPath,
      freshReplayPackagePath: args.freshReplayPackagePath,
    },
    assumptions: {
      savedReportsOnly: true,
      contractOnly: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      promotionDisabled: true,
    },
    proposedResearchBoundary: {
      setupType: 'OpeningDriveFvgContinuation',
      selector: 'fine_risk_24_to_32',
      scannerVisibleNow: false,
      requiresFutureApprovalGate: true,
      proposedLaterBehavior: 'Consider a future scanner-visible OpeningDrive review ranking rule only for fine_risk_24_to_32 after explicit approval and regression proof.',
    },
    approvalContract: {
      name: 'openingdrive_fine_risk_approval_contract',
      approvalRequiredBeforeImplementation: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      gates,
      requiredRegressionCommands: [
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-fine-risk-lane-validation.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-fine-risk-approval-contract.test.ts',
        'npx tsc --noEmit --pretty false',
        'npm run guard:no-firebase',
        'npm run guard:architecture',
        'npm run guard:schema',
        'npm run lint',
        'npm run build',
        'npm run test',
        'git diff --check',
      ],
      implementationInvariants: [
        '5M remains execution authority for trigger, protected stop, risk, invalidation, and targets.',
        'HTF remains map/support/caution only and cannot approve execution.',
        'canExecute must not be removed, loosened, surfaced as trader instruction, or replaced by confidence ranking.',
        'OpeningDrive tight_long_risk_4_to_8 must not be promoted by this fine-risk contract.',
        'Discord posting, Supabase persistence, NinjaTrader bridge behavior, and scanner runtime cadence must remain unchanged unless separately approved.',
        'No realized outcome P/L or future outcome labels may be used as live scoring input.',
      ],
      rollbackContract: [
        'Any future approved implementation must name exact files changed before install.',
        'Rollback must remove only the future OpeningDrive fine-risk ranking/proposal wiring.',
        'Rollback must preserve deterministic scanner, canExecute, Discord, Supabase, bridge, entry/stop/target/risk behavior.',
        'Post-rollback verification must rerun the full required regression command set.',
      ],
    },
    summary: {
      laneRows: lane?.summary.rows || 0,
      laneWinners: lane?.summary.winners || 0,
      laneLosses: lane?.summary.losses || 0,
      laneOtherResolved: lane?.summary.otherResolved || 0,
      laneUnresolved: lane?.summary.unresolved || 0,
      laneOneMesPl: lane?.summary.oneMesPl ?? null,
      freshPackageRejectedLosses: fresh?.summary.rejectedSummary.losses || 0,
      freshPackageTightLongLosses: tightLongLosses(fresh),
      livePromotionAllowedRows: 0,
      failedGateCount: failedGates.length,
      recommendation: blockers.length ? 'fix_inputs' : 'await_explicit_approval_or_broaden_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the lane validation or fresh replay package before using this approval contract.']
      : [
        'Use this as a research-only approval contract before any scanner-visible OpeningDrive fine-risk install.',
        'Keep broad OpeningDrive, tight_long_risk_4_to_8, Discord, Supabase, bridge, canExecute, entry, stop, target, and risk behavior unchanged.',
        'If approval is not explicit, broaden saved-report validation and leave live behavior unchanged.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport(
  report: RawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-fine-risk-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport({
    laneValidationPath: options.laneValidation,
    laneValidation: fs.existsSync(options.laneValidation) ? readJson(options.laneValidation) : null,
    freshReplayPackagePath: options.freshReplayPackage,
    freshReplayPackage: fs.existsSync(options.freshReplayPackage) ? readJson(options.freshReplayPackage) : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveFineRiskApprovalContractCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
