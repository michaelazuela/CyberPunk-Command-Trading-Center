import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveFineRiskValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-validation';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';

interface CliOptions {
  lowRiskValidation: string;
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

type SplitSummary = RawOhlcScannerArtifactOpeningDriveFineRiskValidationReport['splitSummaries'][number];

export interface RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    lowRiskValidationPath: string;
    freshReplayPackagePath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    contractOnly: true;
    validatesLowRiskResearchLaneOnly: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    promotionDisabled: true;
  };
  proposedResearchBoundary: {
    setupType: 'OpeningDriveFvgContinuation';
    selector: 'low_risk_lt_4';
    scannerVisibleNow: false;
    requiresFutureApprovalGate: true;
    proposedLaterBehavior: string;
  };
  approvalContract: {
    name: 'openingdrive_low_risk_approval_contract';
    approvalRequiredBeforeImplementation: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    gates: ApprovalGate[];
    requiredRegressionCommands: string[];
    implementationInvariants: string[];
    rollbackContract: string[];
  };
  summary: {
    validationRows: number;
    lowRiskRows: number;
    lowRiskWinners: number;
    lowRiskLosses: number;
    lowRiskOtherResolved: number;
    lowRiskUnresolved: number;
    lowRiskOneMesPl: number | null;
    validationLowRiskRows: number;
    validationLowRiskLosses: number;
    freshPackageLowRiskRows: number;
    freshPackageLowRiskLosses: number;
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
const LOW_RISK_BUCKET = 'risk_lt_4';
const LOW_RISK_SELECTOR = 'low_risk_lt_4';

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

export function parseRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const lowRiskValidation = readFlag(args, '--low-risk-validation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fine-risk-validation-\d+\.json$/);
  const freshReplayPackage = readFlag(args, '--fresh-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-\d+\.json$/);
  if (!lowRiskValidation) throw new Error('--low-risk-validation is required.');
  if (!freshReplayPackage) throw new Error('--fresh-replay-package is required.');
  return { lowRiskValidation, freshReplayPackage, outDir, json: args.includes('--json') };
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

function split(report: RawOhlcScannerArtifactOpeningDriveFineRiskValidationReport | null, name: SplitSummary['split']): SplitSummary | null {
  return report?.splitSummaries.find((row) => row.split === name) || null;
}

function lowRiskSelectorSummary(report: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null) {
  return (report?.selectorSummaries || []).find((row) => row.selector === LOW_RISK_SELECTOR) || null;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Low-Risk Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval contract. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Evidence',
    `- Low-risk W/L/O/U: ${report.summary.lowRiskWinners}/${report.summary.lowRiskLosses}/${report.summary.lowRiskOtherResolved}/${report.summary.lowRiskUnresolved}.`,
    `- Low-risk one-MES P/L: ${report.summary.lowRiskOneMesPl ?? '-'}.`,
    `- Validation low-risk rows/losses: ${report.summary.validationLowRiskRows}/${report.summary.validationLowRiskLosses}.`,
    `- Fresh package low-risk rows/losses: ${report.summary.freshPackageLowRiskRows}/${report.summary.freshPackageLowRiskLosses}.`,
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

export function buildRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport(args: {
  lowRiskValidationPath: string;
  lowRiskValidation: RawOhlcScannerArtifactOpeningDriveFineRiskValidationReport | null;
  freshReplayPackagePath: string;
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport {
  const validation = args.lowRiskValidation;
  const fresh = args.freshReplayPackage;
  const all = split(validation, 'all');
  const validationSplit = split(validation, 'validation');
  const freshLowRisk = lowRiskSelectorSummary(fresh);
  const gates: ApprovalGate[] = [
    {
      name: 'low_risk_validation_status_pass',
      required: true,
      status: validation?.status === 'pass' ? 'pass' : 'fail',
      proof: validation ? `validation status ${validation.status}` : 'validation missing',
    },
    {
      name: 'low_risk_candidate_bucket',
      required: true,
      status: validation?.candidate.featureValue === LOW_RISK_BUCKET ? 'pass' : 'fail',
      proof: validation ? `candidate ${validation.candidate.featureValue}` : 'validation missing',
    },
    {
      name: 'low_risk_validated_for_more_research',
      required: true,
      status: validation?.summary.validationDecision === 'validated_for_more_research' ? 'pass' : 'fail',
      proof: validation ? `validation decision ${validation.summary.validationDecision}` : 'validation missing',
    },
    {
      name: 'low_risk_zero_losses_positive_pl',
      required: true,
      status: (all?.matchingRows || 0) > 0 && all?.matchingLosses === 0 && (all?.matchingOneMesPl ?? 0) > 0 ? 'pass' : 'fail',
      proof: all ? `rows ${all.matchingRows}, losses ${all.matchingLosses}, oneMesPl ${all.matchingOneMesPl}` : 'all split missing',
    },
    {
      name: 'validation_split_zero_losses',
      required: true,
      status: (validationSplit?.matchingRows || 0) > 0 && validationSplit?.matchingLosses === 0 ? 'pass' : 'fail',
      proof: validationSplit ? `validation rows ${validationSplit.matchingRows}, losses ${validationSplit.matchingLosses}` : 'validation split missing',
    },
    {
      name: 'fresh_package_low_risk_selector_present',
      required: true,
      status: (freshLowRisk?.rows || 0) > 0 && freshLowRisk?.losses === 0 ? 'pass' : 'fail',
      proof: freshLowRisk ? `fresh low-risk rows ${freshLowRisk.rows}, losses ${freshLowRisk.losses}` : 'fresh low-risk selector missing',
    },
    {
      name: 'promotion_still_disabled',
      required: true,
      status: validation?.summary.livePromotionAllowedRows === 0 && fresh?.summary.livePromotionAllowedRows === 0 ? 'pass' : 'fail',
      proof: `validation live rows ${validation?.summary.livePromotionAllowedRows ?? 'missing'}, fresh live rows ${fresh?.summary.livePromotionAllowedRows ?? 'missing'}`,
    },
    {
      name: 'live_authority_flags_locked_off',
      required: true,
      status: validation?.authority.changesScannerBehavior === false
        && validation.authority.changesTradingLogic === false
        && validation.authority.changesCanExecute === false
        && validation.authority.changesEntryStopTargets === false
        && validation.authority.changesRiskRules === false
        && validation.authority.postsDiscord === false
        && validation.authority.writesSupabase === false
        && validation.authority.readsLiveBridge === false
        ? 'pass'
        : 'fail',
      proof: 'scanner/trading/canExecute/entry-stop-target/risk/Discord/Supabase/bridge flags must remain false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !validation ? 'missing OpeningDrive low-risk validation report' : null,
    !fresh ? 'missing OpeningDrive fresh replay package report' : null,
    ...failedGates.map((gate) => `approval gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      lowRiskValidationPath: args.lowRiskValidationPath,
      freshReplayPackagePath: args.freshReplayPackagePath,
    },
    assumptions: {
      savedReportsOnly: true,
      contractOnly: true,
      validatesLowRiskResearchLaneOnly: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      promotionDisabled: true,
    },
    proposedResearchBoundary: {
      setupType: 'OpeningDriveFvgContinuation',
      selector: LOW_RISK_SELECTOR,
      scannerVisibleNow: false,
      requiresFutureApprovalGate: true,
      proposedLaterBehavior: 'Consider a future scanner-visible OpeningDrive review-ranking rule only for low_risk_lt_4 after explicit approval and regression proof.',
    },
    approvalContract: {
      name: 'openingdrive_low_risk_approval_contract',
      approvalRequiredBeforeImplementation: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      gates,
      requiredRegressionCommands: [
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-fine-risk-validation.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-low-risk-approval-contract.test.ts',
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
        'OpeningDrive low_risk_lt_4 evidence must not promote broad OpeningDrive, risk_4_to_8, or fine_risk_24_to_32 behavior.',
        'Discord posting, Supabase persistence, NinjaTrader bridge behavior, and scanner runtime cadence must remain unchanged unless separately approved.',
        'No realized outcome P/L or future outcome labels may be used as live scoring input.',
      ],
      rollbackContract: [
        'Any future approved implementation must name exact files changed before install.',
        'Rollback must remove only the future OpeningDrive low-risk ranking/proposal wiring.',
        'Rollback must preserve deterministic scanner, canExecute, Discord, Supabase, bridge, entry/stop/target/risk behavior.',
        'Post-rollback verification must rerun the full required regression command set.',
      ],
    },
    summary: {
      validationRows: validation?.summary.sourceRows || 0,
      lowRiskRows: all?.matchingRows || 0,
      lowRiskWinners: all?.matchingWinners || 0,
      lowRiskLosses: all?.matchingLosses || 0,
      lowRiskOtherResolved: all?.matchingOtherResolved || 0,
      lowRiskUnresolved: all?.matchingUnresolved || 0,
      lowRiskOneMesPl: all?.matchingOneMesPl ?? null,
      validationLowRiskRows: validationSplit?.matchingRows || 0,
      validationLowRiskLosses: validationSplit?.matchingLosses || 0,
      freshPackageLowRiskRows: freshLowRisk?.rows || 0,
      freshPackageLowRiskLosses: freshLowRisk?.losses || 0,
      livePromotionAllowedRows: 0,
      failedGateCount: failedGates.length,
      recommendation: blockers.length ? 'fix_inputs' : 'await_explicit_approval_or_broaden_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the low-risk validation or fresh replay package before using this approval contract.']
      : [
        'Use this as a research-only approval contract before any scanner-visible OpeningDrive low-risk install.',
        'Keep broad OpeningDrive, Discord, Supabase, bridge, canExecute, entry, stop, target, and risk behavior unchanged.',
        'If approval is not explicit, broaden saved-report validation and leave live behavior unchanged.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport(
  report: RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-low-risk-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport({
    lowRiskValidationPath: options.lowRiskValidation,
    lowRiskValidation: fs.existsSync(options.lowRiskValidation) ? readJson(options.lowRiskValidation) : null,
    freshReplayPackagePath: options.freshReplayPackage,
    freshReplayPackage: fs.existsSync(options.freshReplayPackage) ? readJson(options.freshReplayPackage) : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
