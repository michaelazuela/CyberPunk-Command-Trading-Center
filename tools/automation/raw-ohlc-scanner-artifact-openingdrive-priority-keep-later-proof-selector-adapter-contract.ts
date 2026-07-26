import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-implementation-preflight';

interface CliOptions {
  preflight: string;
  outDir: string;
  json: boolean;
}

interface ContractGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_adapter_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport['authority'];
  source: {
    reportDir: string;
    preflightPath: string;
  };
  assumptions: {
    savedPreflightOnly: true;
    contractOnly: true;
    noRuntimeAdapterInstalled: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    promotionDisabled: true;
  };
  adapterContract: {
    name: 'openingdrive_sweep_keep_later_proof_selector_adapter_contract';
    modelScope: 'NoInstalledSetup';
    selectorScope: 'keep_later_sweep_proof_only';
    approvalRequiredBeforeRuntimeImplementation: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    gates: ContractGate[];
    allowedInputs: string[];
    forbiddenOutputs: string[];
    requiredRegressionCommands: string[];
    implementationInvariants: string[];
    rollbackContract: string[];
  };
  summary: {
    preflightReady: boolean;
    changedSlates: number;
    sweepScopeRows: number;
    changedRowsGrossResolvedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    failedGateCount: number;
    recommendation: 'draft_saved_artifact_adapter_dry_run_next' | 'fix_inputs';
  };
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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const preflight = readFlag(args, '--preflight') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-implementation-preflight-\d+\.json$/);
  if (!preflight) throw new Error('--preflight is required.');
  return {
    preflight: path.resolve(preflight),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Sweep Keep-Later-Proof Selector Adapter Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only adapter contract. It does not install selector behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Contract State',
    `- Model scope: ${report.adapterContract.modelScope}.`,
    `- Selector scope: ${report.adapterContract.selectorScope}.`,
    `- Implementation allowed now: ${report.adapterContract.implementationAllowedNow}.`,
    `- Scanner-visible install allowed now: ${report.adapterContract.scannerVisibleInstallAllowedNow}.`,
    `- Approval required before runtime implementation: ${report.adapterContract.approvalRequiredBeforeRuntimeImplementation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Preflight Evidence',
    `- Preflight ready: ${report.summary.preflightReady}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Sweep-scope rows: ${report.summary.sweepScopeRows}.`,
    `- Changed rows gross one-MES P/L: ${report.summary.changedRowsGrossResolvedOneMesPl ?? '-'}.`,
    '',
    '## Contract Gates',
    ...report.adapterContract.gates.map((gate) => `- ${gate.name}: ${gate.status} - ${gate.proof}`),
    '',
    '## Allowed Inputs',
    ...report.adapterContract.allowedInputs.map((item) => `- ${item}`),
    '',
    '## Forbidden Outputs',
    ...report.adapterContract.forbiddenOutputs.map((item) => `- ${item}`),
    '',
    '## Required Regression Commands',
    ...report.adapterContract.requiredRegressionCommands.map((command) => `- ${command}`),
    '',
    '## Implementation Invariants',
    ...report.adapterContract.implementationInvariants.map((item) => `- ${item}`),
    '',
    '## Rollback Contract',
    ...report.adapterContract.rollbackContract.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendation',
    `- ${report.summary.recommendation}`,
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport(args: {
  reportDir: string;
  preflightPath: string;
  preflight: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport {
  const preflight = args.preflight;
  const preflightReady = Boolean(preflight && preflight.status === 'pass' && preflight.summary.recommendation === 'draft_no_runtime_selector_adapter_contract_next');
  const gates: ContractGate[] = [
    {
      name: 'preflight_status_pass',
      required: true,
      status: preflight?.status === 'pass' ? 'pass' : 'fail',
      proof: preflight ? `preflight status ${preflight.status}` : 'preflight report missing',
    },
    {
      name: 'preflight_recommends_contract',
      required: true,
      status: preflight?.summary.recommendation === 'draft_no_runtime_selector_adapter_contract_next' ? 'pass' : 'fail',
      proof: preflight ? `preflight recommendation ${preflight.summary.recommendation}` : 'preflight report missing',
    },
    {
      name: 'implementation_draft_eligible',
      required: true,
      status: preflight?.summary.implementationDraftEligible === true ? 'pass' : 'fail',
      proof: preflight ? `implementationDraftEligible ${preflight.summary.implementationDraftEligible}` : 'preflight report missing',
    },
    {
      name: 'runtime_install_still_blocked',
      required: true,
      status: preflight?.summary.runtimeInstallAllowed === false ? 'pass' : 'fail',
      proof: preflight ? `runtimeInstallAllowed ${preflight.summary.runtimeInstallAllowed}` : 'preflight report missing',
    },
    {
      name: 'sweep_evidence_present',
      required: true,
      status: (preflight?.summary.sweepScopeRows || 0) > 0 && (preflight?.summary.changedSlates || 0) > 0 ? 'pass' : 'fail',
      proof: preflight ? `sweepScopeRows ${preflight.summary.sweepScopeRows}, changedSlates ${preflight.summary.changedSlates}` : 'preflight report missing',
    },
    {
      name: 'strict_failure_counts_zero',
      required: true,
      status: preflight
        && preflight.summary.invalidProposedRows === 0
        && preflight.summary.nonSweepChangedRows === 0
        && preflight.summary.missingOutcomeRows === 0
        && preflight.summary.blockedCarveoutRowsRemain === 0
        ? 'pass'
        : 'fail',
      proof: preflight
        ? `invalid/nonSweep/missingOutcome/blockers ${preflight.summary.invalidProposedRows}/${preflight.summary.nonSweepChangedRows}/${preflight.summary.missingOutcomeRows}/${preflight.summary.blockedCarveoutRowsRemain}`
        : 'preflight report missing',
    },
    {
      name: 'live_outputs_locked_off',
      required: true,
      status: preflight
        && preflight.summary.shouldPostRows === 0
        && preflight.summary.publishDiscordRows === 0
        && preflight.summary.canExecuteChangedRows === 0
        && preflight.summary.livePromotionAllowedRows === 0
        ? 'pass'
        : 'fail',
      proof: preflight
        ? `shouldPost/publishDiscord/canExecute/livePromotion ${preflight.summary.shouldPostRows}/${preflight.summary.publishDiscordRows}/${preflight.summary.canExecuteChangedRows}/${preflight.summary.livePromotionAllowedRows}`
        : 'preflight report missing',
    },
    {
      name: 'authority_flags_locked_off',
      required: true,
      status: preflight?.authority.changesScannerBehavior === false
        && preflight.authority.changesTradingLogic === false
        && preflight.authority.changesCanExecute === false
        && preflight.authority.changesEntryStopTargets === false
        && preflight.authority.changesRiskRules === false
        && preflight.authority.postsDiscord === false
        && preflight.authority.writesSupabase === false
        && preflight.authority.readsLiveBridge === false
        && preflight.authority.changesAppRuntime === false
        ? 'pass'
        : 'fail',
      proof: 'scanner/trading/canExecute/entry-stop-target/risk/Discord/Supabase/bridge/runtime flags must remain false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !preflight ? 'missing implementation preflight report' : null,
    ...failedGates.map((gate) => `adapter contract gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_adapter_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      preflightPath: args.preflightPath,
    },
    assumptions: {
      savedPreflightOnly: true,
      contractOnly: true,
      noRuntimeAdapterInstalled: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      promotionDisabled: true,
    },
    adapterContract: {
      name: 'openingdrive_sweep_keep_later_proof_selector_adapter_contract',
      modelScope: 'NoInstalledSetup',
      selectorScope: 'keep_later_sweep_proof_only',
      approvalRequiredBeforeRuntimeImplementation: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      gates,
      allowedInputs: [
        'Saved strict-ready replay rows only.',
        'Saved dry-run/preflight summary fields only.',
        'Candidate setupType must be NoInstalledSetup.',
        'Candidate selector decision must be keep_later_sweep_proof.',
        'Candidate bars source must already be completed 5M scanner-decision tape evidence.',
        'Candidate must already have deterministic app-owned entry, protected stop, T1, T2, and outcome evidence in saved reports.',
      ],
      forbiddenOutputs: [
        'No Discord posts or publish flags.',
        'No Supabase reads, writes, migrations, or RAG updates.',
        'No NinjaTrader bridge reads, repairs, contract changes, or live history acquisition.',
        'No setupScanner runtime execution or scanner-visible ranking.',
        'No canExecute changes or trader-facing executable instruction changes.',
        'No entry, stop, target, risk, invalidation, target-room, or session-window math changes.',
        'No broadening to archived model families or any other model family.',
      ],
      requiredRegressionCommands: [
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-implementation-preflight.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-adapter-contract.test.ts',
        'npx tsc --noEmit --pretty false',
        'npm run guard:no-firebase',
        'npm run guard:architecture',
        'npm run guard:schema',
        'npm run lint',
        'npm run test',
        'npm run build',
        'git diff --check',
      ],
      implementationInvariants: [
        'The adapter contract is research-only and cannot be imported by app runtime or scanner runtime in this phase.',
        'NoInstalledSetup is the only model in scope.',
        'The adapter may prefer keep_later_sweep_proof only inside saved-artifact dry-run selection, not live scanner selection.',
        '5M completed proof remains execution authority; HTF remains context/support/caution only.',
        'canExecute remains internal/audit-only and must not be loosened or replaced by confidence ranking.',
        'All deterministic entry, protected stop, T1/T2, risk, invalidation, and target-room gates remain app-owned.',
      ],
      rollbackContract: [
        'Rollback removes only this research contract tool, test, package script, and status entry.',
        'No runtime rollback is required because no runtime behavior is installed.',
        'If a future runtime adapter is approved, it must be its own commit with a one-commit revert path.',
        'Post-rollback verification must rerun the required guard/check set.',
      ],
    },
    summary: {
      preflightReady,
      changedSlates: preflight?.summary.changedSlates || 0,
      sweepScopeRows: preflight?.summary.sweepScopeRows || 0,
      changedRowsGrossResolvedOneMesPl: preflight?.summary.changedRowsGrossResolvedOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      failedGateCount: failedGates.length,
      recommendation: blockers.length ? 'fix_inputs' : 'draft_saved_artifact_adapter_dry_run_next',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the preflight input before drafting any adapter dry-run.']
      : [
        'Use this contract as the boundary for the next saved-artifact adapter dry-run.',
        'Do not install scanner-visible selector behavior from this contract.',
        'Runtime selector/ranking changes remain a separate explicit approval gate.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-adapter-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport({
    reportDir: options.outDir,
    preflightPath: options.preflight,
    preflight: fs.existsSync(options.preflight)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport>(options.preflight)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
