import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-proposal-update';

interface CliOptions {
  proposalUpdate: string;
  outDir: string;
  json: boolean;
}

interface ApprovalGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport['authority'];
  source: {
    reportDir: string;
    proposalUpdatePath: string;
  };
  assumptions: {
    savedProposalUpdateOnly: true;
    contractOnly: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    promotionDisabled: true;
  };
  approvalContract: {
    name: 'htf_mss_two_separator_approval_contract';
    approvalRequiredBeforeImplementation: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    gates: ApprovalGate[];
    requiredRegressionCommands: string[];
    implementationInvariants: string[];
    rollbackContract: string[];
  };
  summary: {
    proposalReady: boolean;
    proposalSelectedRows: number;
    proposalSelectedWinners: number;
    proposalSelectedLosses: number;
    proposalSelectedUnresolved: number;
    proposalSelectedOneMesPl: number | null;
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractArgs(args = process.argv.slice(2)): CliOptions {
  const proposalUpdate = readFlag(args, '--proposal-update');
  if (!proposalUpdate) throw new Error('--proposal-update is required.');
  return {
    proposalUpdate,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport, 'markdown'>): string {
  return [
    '# HTF MSS Two-Separator Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval contract. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Contract State',
    `- Implementation allowed now: ${report.approvalContract.implementationAllowedNow}.`,
    `- Scanner-visible install allowed now: ${report.approvalContract.scannerVisibleInstallAllowedNow}.`,
    `- Approval required before implementation: ${report.approvalContract.approvalRequiredBeforeImplementation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Proposal Evidence',
    `- Proposal ready: ${report.summary.proposalReady}.`,
    `- Selected rows W/L/U: ${report.summary.proposalSelectedWinners}/${report.summary.proposalSelectedLosses}/${report.summary.proposalSelectedUnresolved}.`,
    `- Selected one-MES P/L: ${report.summary.proposalSelectedOneMesPl ?? '-'}.`,
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

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport(args: {
  reportDir: string;
  proposalUpdatePath: string;
  proposalUpdate: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport {
  const proposal = args.proposalUpdate;
  const proposalReady = Boolean(proposal && proposal.status === 'pass' && proposal.summary.recommendation === 'ready_for_approval_contract');
  const gates: ApprovalGate[] = [
    {
      name: 'proposal_update_status_pass',
      required: true,
      status: proposal?.status === 'pass' ? 'pass' : 'fail',
      proof: proposal ? `proposal update status ${proposal.status}` : 'proposal update report missing',
    },
    {
      name: 'proposal_update_ready_for_contract',
      required: true,
      status: proposal?.summary.recommendation === 'ready_for_approval_contract' ? 'pass' : 'fail',
      proof: proposal ? `proposal update recommendation ${proposal.summary.recommendation}` : 'proposal update report missing',
    },
    {
      name: 'zero_selected_losses_preserved',
      required: true,
      status: proposal?.summary.simulationSelectedLosses === 0 && proposal?.summary.simulationSelectedWinners === 62 ? 'pass' : 'fail',
      proof: proposal ? `selected winners/losses ${proposal.summary.simulationSelectedWinners}/${proposal.summary.simulationSelectedLosses}` : 'proposal update report missing',
    },
    {
      name: 'promotion_still_disabled',
      required: true,
      status: proposal?.proposalUpdate.scannerVisibleNow === false && proposal?.summary.livePromotionAllowedRows === 0 ? 'pass' : 'fail',
      proof: proposal ? `scannerVisibleNow ${proposal.proposalUpdate.scannerVisibleNow}, livePromotionAllowedRows ${proposal.summary.livePromotionAllowedRows}` : 'proposal update report missing',
    },
    {
      name: 'future_approval_gate_required',
      required: true,
      status: proposal?.proposalUpdate.requiresFutureApprovalGate === true ? 'pass' : 'fail',
      proof: proposal ? `requiresFutureApprovalGate ${proposal.proposalUpdate.requiresFutureApprovalGate}` : 'proposal update report missing',
    },
    {
      name: 'live_authority_flags_locked_off',
      required: true,
      status: proposal?.authority.changesScannerBehavior === false
        && proposal.authority.changesTradingLogic === false
        && proposal.authority.changesCanExecute === false
        && proposal.authority.changesEntryStopTargets === false
        && proposal.authority.changesRiskRules === false
        && proposal.authority.postsDiscord === false
        && proposal.authority.writesSupabase === false
        && proposal.authority.readsLiveBridge === false
        ? 'pass'
        : 'fail',
      proof: 'scanner/trading/canExecute/entry-stop-target/risk/Discord/Supabase/bridge flags must remain false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !proposal ? 'missing HTF-MSS two-separator proposal update report' : null,
    ...failedGates.map((gate) => `approval gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      proposalUpdatePath: args.proposalUpdatePath,
    },
    assumptions: {
      savedProposalUpdateOnly: true,
      contractOnly: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      promotionDisabled: true,
    },
    approvalContract: {
      name: 'htf_mss_two_separator_approval_contract',
      approvalRequiredBeforeImplementation: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      gates,
      requiredRegressionCommands: [
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-proposal-update.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-approval-contract.test.ts',
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
        'HTF context remains map/support/caution only and cannot approve execution.',
        '5M completed proof remains the execution authority for trigger, protected stop, risk, invalidation, and target room.',
        'canExecute must not be loosened, removed, or replaced by confidence ranking.',
        'Discord posting, Supabase persistence, NinjaTrader bridge behavior, and scanner runtime cadence must remain unchanged unless separately approved.',
        'Entry, stop, T1, T2, risk, invalidation, target-room, and session-window math must remain deterministic and app-owned.',
        'The candidate family remains HtfDisplacementMssContinuation only; no FVG/Sweep/TurtleSoup/Intraday/OpeningDrive/AfterLunch broadening from this contract.',
      ],
      rollbackContract: [
        'Any future approved implementation must name exact files changed before install.',
        'Rollback must remove only the future two-separator overlay module/script wiring.',
        'Rollback must preserve deterministic scanner, canExecute, Discord, Supabase, bridge, entry/stop/target/risk behavior.',
        'Post-rollback verification must rerun the full required regression command set.',
      ],
    },
    summary: {
      proposalReady,
      proposalSelectedRows: proposal?.summary.simulationSelectedRows || 0,
      proposalSelectedWinners: proposal?.summary.simulationSelectedWinners || 0,
      proposalSelectedLosses: proposal?.summary.simulationSelectedLosses || 0,
      proposalSelectedUnresolved: proposal?.summary.simulationSelectedUnresolved || 0,
      proposalSelectedOneMesPl: proposal?.summary.simulationSelectedOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      failedGateCount: failedGates.length,
      recommendation: blockers.length ? 'fix_inputs' : 'await_explicit_approval_or_broaden_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the proposal update before using this approval contract.']
      : [
        'Keep this as the approval gate before any scanner-visible implementation.',
        'If approval is not explicit, broaden saved-report validation and keep live behavior unchanged.',
        'If approval becomes explicit, implement one small phase with this contract and full verification passing before commit.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport({
    reportDir: options.outDir,
    proposalUpdatePath: options.proposalUpdate,
    proposalUpdate: fs.existsSync(options.proposalUpdate) ? readJson(options.proposalUpdate) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
