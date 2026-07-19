import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-live-proposal';

interface CliOptions {
  proposal: string;
  outDir: string;
  json: boolean;
}

interface ApprovalGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport['authority'];
  source: {
    reportDir: string;
    proposalPath: string;
  };
  assumptions: {
    savedProposalOnly: true;
    contractOnly: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    promotionDisabled: true;
  };
  approvalContract: {
    name: 'htf_mss_overlay_approval_regression_contract';
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
    proposalSelectedResolvedRows: number;
    proposalSelectedUnresolvedRows: number;
    proposalSelectedResolvedGrossOneMesPl: number | null;
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractArgs(args = process.argv.slice(2)): CliOptions {
  const proposal = readFlag(args, '--proposal');
  if (!proposal) throw new Error('--proposal is required.');
  return {
    proposal,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport, 'markdown'>): string {
  return [
    '# HTF MSS Overlay Approval Regression Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only contract. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Contract State',
    `- Implementation allowed now: ${report.approvalContract.implementationAllowedNow}.`,
    `- Scanner-visible install allowed now: ${report.approvalContract.scannerVisibleInstallAllowedNow}.`,
    `- Approval required before implementation: ${report.approvalContract.approvalRequiredBeforeImplementation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Proposal Evidence',
    `- Proposal ready: ${report.summary.proposalReady}.`,
    `- Selected rows: ${report.summary.proposalSelectedRows}.`,
    `- Selected resolved/unresolved: ${report.summary.proposalSelectedResolvedRows} / ${report.summary.proposalSelectedUnresolvedRows}.`,
    `- Selected resolved gross one-MES P/L: ${report.summary.proposalSelectedResolvedGrossOneMesPl ?? '-'}.`,
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

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport(args: {
  reportDir: string;
  proposalPath: string;
  proposal: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport {
  const proposalReady = Boolean(args.proposal && args.proposal.status === 'pass' && args.proposal.summary.recommendation === 'ready_for_approval_checkpoint');
  const gates: ApprovalGate[] = [
    {
      name: 'proposal_status_pass',
      required: true,
      status: args.proposal?.status === 'pass' ? 'pass' : 'fail',
      proof: args.proposal ? `proposal status ${args.proposal.status}` : 'proposal report missing',
    },
    {
      name: 'proposal_recommends_approval_checkpoint',
      required: true,
      status: args.proposal?.summary.recommendation === 'ready_for_approval_checkpoint' ? 'pass' : 'fail',
      proof: args.proposal ? `proposal recommendation ${args.proposal.summary.recommendation}` : 'proposal report missing',
    },
    {
      name: 'promotion_still_disabled',
      required: true,
      status: args.proposal?.proposal.scannerVisibleNow === false && args.proposal?.summary.livePromotionAllowedRows === 0 ? 'pass' : 'fail',
      proof: args.proposal ? `scannerVisibleNow ${args.proposal.proposal.scannerVisibleNow}, livePromotionAllowedRows ${args.proposal.summary.livePromotionAllowedRows}` : 'proposal report missing',
    },
    {
      name: 'live_authority_flags_locked_off',
      required: true,
      status: args.proposal?.authority.changesScannerBehavior === false
        && args.proposal.authority.changesTradingLogic === false
        && args.proposal.authority.changesCanExecute === false
        && args.proposal.authority.changesEntryStopTargets === false
        && args.proposal.authority.changesRiskRules === false
        && args.proposal.authority.postsDiscord === false
        && args.proposal.authority.writesSupabase === false
        && args.proposal.authority.readsLiveBridge === false
        ? 'pass'
        : 'fail',
      proof: 'scanner/trading/canExecute/entry-stop-target/risk/Discord/Supabase/bridge flags must remain false',
    },
    {
      name: 'explicit_future_approval_required',
      required: true,
      status: args.proposal?.proposal.requiresFutureApprovalGate === true ? 'pass' : 'fail',
      proof: args.proposal ? `requiresFutureApprovalGate ${args.proposal.proposal.requiresFutureApprovalGate}` : 'proposal report missing',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !args.proposal ? 'missing HTF-MSS proposal report' : null,
    ...failedGates.map((gate) => `approval gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      proposalPath: args.proposalPath,
    },
    assumptions: {
      savedProposalOnly: true,
      contractOnly: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      promotionDisabled: true,
    },
    approvalContract: {
      name: 'htf_mss_overlay_approval_regression_contract',
      approvalRequiredBeforeImplementation: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      gates,
      requiredRegressionCommands: [
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-live-proposal.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-approval-contract.test.ts',
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
        'HTF context remains map/support/caution only; it must not become execution authority.',
        '5M completed proof remains mandatory for entry trigger, protected stop, risk, invalidation, and target room.',
        'canExecute must not be loosened, surfaced as trader instruction, or replaced by confidence ranking.',
        'Discord posting, Supabase persistence, bridge reads/repairs, and scanner runtime cadence must remain unchanged unless separately approved.',
        'Entry, stop, T1, T2, risk, invalidation, and target-room math must remain deterministic and app-owned.',
        'The overlay candidate may only cover original top no-chase/stale rows replaced by HtfDisplacementMssContinuation with replay-package coverage.',
      ],
      rollbackContract: [
        'Any future approved implementation must name exact files changed before install.',
        'Rollback must remove only the future overlay module/script wiring.',
        'Rollback must preserve deterministic scanner, canExecute, Discord, Supabase, bridge, entry/stop/target/risk behavior.',
        'Post-rollback verification must rerun the full required regression command set.',
      ],
    },
    summary: {
      proposalReady,
      proposalSelectedRows: args.proposal?.summary.simulationSelectedRows || 0,
      proposalSelectedResolvedRows: args.proposal?.summary.simulationSelectedResolvedRows || 0,
      proposalSelectedUnresolvedRows: args.proposal?.summary.simulationSelectedUnresolvedRows || 0,
      proposalSelectedResolvedGrossOneMesPl: args.proposal?.summary.simulationSelectedResolvedGrossOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      failedGateCount: failedGates.length,
      recommendation: blockers.length ? 'fix_inputs' : 'await_explicit_approval_or_broaden_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the proposal package before using this approval contract.']
      : [
        'Keep this as the approval-gate contract before any scanner-visible implementation.',
        'If approval is not explicit, broaden saved-report validation to additional days and leave live behavior unchanged.',
        'If approval becomes explicit, implement in one small phase with the required regression contract passing before commit.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport({
    reportDir: options.outDir,
    proposalPath: options.proposal,
    proposal: fs.existsSync(options.proposal) ? readJson(options.proposal) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
