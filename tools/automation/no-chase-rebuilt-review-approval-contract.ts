import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseRebuiltReviewLiveProposalReport } from './no-chase-rebuilt-review-live-proposal';

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

export interface NoChaseRebuiltReviewApprovalContractReport {
  reportType: 'no_chase_rebuilt_review_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: NoChaseRebuiltReviewLiveProposalReport['authority'];
  source: {
    proposalPath: string;
  };
  assumptions: {
    savedProposalOnly: true;
    contractOnly: true;
    implementationAllowedNow: false;
    scannerVisibleInstallAllowedNow: false;
    humanReviewOnly: true;
    promotionDisabled: true;
  };
  approvalContract: {
    name: 'no_chase_rebuilt_review_approval_contract';
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
    simulatedArtifacts: number;
    htfSufficientArtifacts: number;
    completePlanArtifacts: number;
    canExecuteFalseArtifacts: number;
    publishDiscordFalseArtifacts: number;
    htfPromotionEvidenceAllowed: number;
    replayGrossOneMes: number;
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

export function parseNoChaseRebuiltReviewApprovalContractArgs(args = process.argv.slice(2)): CliOptions {
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

function authority(): NoChaseRebuiltReviewLiveProposalReport['authority'] {
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

function gate(name: string, status: boolean, proof: string): ApprovalGate {
  return { name, required: true, status: status ? 'pass' : 'fail', proof };
}

function buildMarkdown(report: Omit<NoChaseRebuiltReviewApprovalContractReport, 'markdown'>): string {
  return [
    '# No-Chase Rebuilt Review Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved-proposal-only approval contract. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Contract State',
    `- Implementation allowed now: ${report.approvalContract.implementationAllowedNow}.`,
    `- Scanner-visible install allowed now: ${report.approvalContract.scannerVisibleInstallAllowedNow}.`,
    `- Approval required before implementation: ${report.approvalContract.approvalRequiredBeforeImplementation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Evidence',
    `- Proposal ready: ${report.summary.proposalReady}.`,
    `- Simulated artifacts: ${report.summary.simulatedArtifacts}.`,
    `- HTF sufficient artifacts: ${report.summary.htfSufficientArtifacts}.`,
    `- Complete plan artifacts: ${report.summary.completePlanArtifacts}.`,
    `- canExecute=false artifacts: ${report.summary.canExecuteFalseArtifacts}.`,
    `- publishDiscord=false artifacts: ${report.summary.publishDiscordFalseArtifacts}.`,
    `- HTF promotion evidence allowed: ${report.summary.htfPromotionEvidenceAllowed}.`,
    `- Replay gross one-MES P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    '',
    '## Approval Gates',
    ...report.approvalContract.gates.map((item) => `- ${item.name}: ${item.status} - ${item.proof}`),
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

export function buildNoChaseRebuiltReviewApprovalContractReport(args: {
  proposalPath: string;
  proposal: NoChaseRebuiltReviewLiveProposalReport | null;
}, generatedAt = new Date().toISOString()): NoChaseRebuiltReviewApprovalContractReport {
  const proposal = args.proposal;
  const proposalReady = Boolean(proposal && proposal.status === 'pass' && proposal.summary.recommendation === 'ready_for_approval_checkpoint');
  const gates = [
    gate('proposal_status_pass', proposal?.status === 'pass', proposal ? `proposal status ${proposal.status}` : 'proposal report missing'),
    gate('proposal_recommends_approval_checkpoint', proposal?.summary.recommendation === 'ready_for_approval_checkpoint', proposal ? `proposal recommendation ${proposal.summary.recommendation}` : 'proposal report missing'),
    gate('exact_three_rebuilt_artifacts', proposal?.summary.simulatedArtifacts === 3, proposal ? `simulatedArtifacts ${proposal.summary.simulatedArtifacts}` : 'proposal report missing'),
    gate('all_artifacts_complete_plan', proposal?.summary.completePlanArtifacts === proposal?.summary.simulatedArtifacts, proposal ? `completePlanArtifacts ${proposal.summary.completePlanArtifacts}` : 'proposal report missing'),
    gate('all_artifacts_htf_sufficient', proposal?.summary.htfSufficientArtifacts === proposal?.summary.simulatedArtifacts, proposal ? `htfSufficientArtifacts ${proposal.summary.htfSufficientArtifacts}` : 'proposal report missing'),
    gate('human_review_only_boundaries_preserved', proposal?.summary.canExecuteFalseArtifacts === proposal?.summary.simulatedArtifacts && proposal?.summary.publishDiscordFalseArtifacts === proposal?.summary.simulatedArtifacts, proposal ? `canExecuteFalse ${proposal.summary.canExecuteFalseArtifacts}, publishDiscordFalse ${proposal.summary.publishDiscordFalseArtifacts}` : 'proposal report missing'),
    gate('htf_promotion_disabled', proposal?.summary.htfPromotionEvidenceAllowed === 0, proposal ? `htfPromotionEvidenceAllowed ${proposal.summary.htfPromotionEvidenceAllowed}` : 'proposal report missing'),
    gate('live_promotion_disabled', proposal?.proposal.scannerVisibleNow === false && proposal?.summary.livePromotionAllowedRows === 0, proposal ? `scannerVisibleNow ${proposal.proposal.scannerVisibleNow}, livePromotionAllowedRows ${proposal.summary.livePromotionAllowedRows}` : 'proposal report missing'),
    gate('authority_flags_locked_off', Boolean(proposal
      && proposal.authority.changesScannerBehavior === false
      && proposal.authority.changesTradingLogic === false
      && proposal.authority.changesCanExecute === false
      && proposal.authority.changesEntryStopTargets === false
      && proposal.authority.changesRiskRules === false
      && proposal.authority.postsDiscord === false
      && proposal.authority.writesSupabase === false
      && proposal.authority.readsLiveBridge === false), 'scanner/trading/canExecute/entry-stop-target/risk/Discord/Supabase/bridge flags must remain false'),
    gate('future_approval_required', proposal?.proposal.requiresFutureApprovalGate === true, proposal ? `requiresFutureApprovalGate ${proposal.proposal.requiresFutureApprovalGate}` : 'proposal report missing'),
  ];
  const failedGates = gates.filter((item) => item.required && item.status === 'fail');
  const blockers = [
    !proposal ? 'missing no-chase rebuilt review proposal report' : null,
    ...failedGates.map((item) => `approval gate failed: ${item.name}`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<NoChaseRebuiltReviewApprovalContractReport, 'markdown'> = {
    reportType: 'no_chase_rebuilt_review_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      proposalPath: args.proposalPath,
    },
    assumptions: {
      savedProposalOnly: true,
      contractOnly: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      humanReviewOnly: true,
      promotionDisabled: true,
    },
    approvalContract: {
      name: 'no_chase_rebuilt_review_approval_contract',
      approvalRequiredBeforeImplementation: true,
      implementationAllowedNow: false,
      scannerVisibleInstallAllowedNow: false,
      gates,
      requiredRegressionCommands: [
        'npx tsx tools/automation/no-chase-rebuilt-review-live-proposal.test.ts',
        'npx tsx tools/automation/no-chase-rebuilt-review-approval-contract.test.ts',
        'npx tsc --noEmit --pretty false',
        'npm run guard:no-firebase',
        'npm run guard:architecture',
        'npm run guard:schema',
        'npm run lint',
        'npm run build',
        'npm run test',
      ],
      implementationInvariants: [
        'Surface only the exact proposal-approved IntradayMssMicroContinuation and AfterLunchDriveFvgContinuation rebuilt rows unless a new proposal expands the set.',
        'Preserve canExecute=false and publishDiscord=false until a separate explicit scanner-visible approval phase changes them.',
        'Preserve deterministic 5M entry, protected stop, T1/T2, risk, invalidation, and target-room gates.',
        'HTF context remains support/caution/context only and cannot approve execution.',
        'Do not broaden to TurtleSoup, SweepMssFvgRetrace, OpeningDriveFvgContinuation, failed-plan reversal, or other model families without separate evidence.',
      ],
      rollbackContract: [
        'Remove only the future no-chase rebuilt review adapter/wiring if rejected.',
        'Keep proof extractor, rebuild pack, simulation, HTF sufficiency, and proposal reports for audit history.',
        'No Supabase rollback is expected from this contract because it writes no rows.',
      ],
    },
    summary: {
      proposalReady,
      simulatedArtifacts: proposal?.summary.simulatedArtifacts || 0,
      htfSufficientArtifacts: proposal?.summary.htfSufficientArtifacts || 0,
      completePlanArtifacts: proposal?.summary.completePlanArtifacts || 0,
      canExecuteFalseArtifacts: proposal?.summary.canExecuteFalseArtifacts || 0,
      publishDiscordFalseArtifacts: proposal?.summary.publishDiscordFalseArtifacts || 0,
      htfPromotionEvidenceAllowed: proposal?.summary.htfPromotionEvidenceAllowed || 0,
      replayGrossOneMes: proposal?.summary.replayGrossOneMes || 0,
      livePromotionAllowedRows: 0,
      failedGateCount: failedGates.length,
      recommendation: blockers.length ? 'fix_inputs' : 'await_explicit_approval_or_broaden_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the no-chase rebuilt review proposal before considering any implementation phase.']
      : [
        'The proposal is contract-ready, but implementation is still disabled.',
        'Use this as the approval-gated handoff for a future human-review-only adapter.',
        'Continue broader research if the goal is to expand beyond the three rebuilt artifacts.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseRebuiltReviewApprovalContractReport(report: NoChaseRebuiltReviewApprovalContractReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-rebuilt-review-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseRebuiltReviewApprovalContractCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseRebuiltReviewApprovalContractArgs(args);
  const report = buildNoChaseRebuiltReviewApprovalContractReport({
    proposalPath: options.proposal,
    proposal: fs.existsSync(options.proposal) ? readJson(options.proposal) : null,
  });
  const paths = writeNoChaseRebuiltReviewApprovalContractReport(report, options.outDir);
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
    runNoChaseRebuiltReviewApprovalContractCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
