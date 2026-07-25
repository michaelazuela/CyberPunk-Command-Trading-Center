import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run';

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_live_proposal';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    proposalOnly: true;
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
    freshScannerOverlayDryRunPath: string | null;
  };
  approvalGate: {
    requiredBeforeLiveInstall: true;
    reason: 'model_ranking_change';
    explicitUserApprovalRequired: true;
  };
  proposedLiveBoundary: {
    primaryBoundary: 'src/lib/unifiedDeskCandidateBook.ts::scoreForCandidate';
    secondaryBoundary: 'src/lib/tradeDecisionPipeline.ts::finalSelectionSort';
    preferredBoundary: 'audit_book_first_then_pipeline_only_after_regression';
    prohibitedBoundaries: string[];
  };
  proposedRule: {
    setupType: 'SweepMssFvgRetrace';
    appliesOnlyWhen: {
      executionStatus: 'Blocked';
      blockReason: 'InvalidStopLocation';
    };
    penaltyPoints: number;
    preservesValidSweepLead: true;
    preservesraidReclaim: true;
    preservesModelAvailability: true;
    preservesCanExecute: true;
  };
  evidence: {
    overlayStatus: string | null;
    recommendedAction: string | null;
    sourceRows: number;
    sweepRows: number;
    validSweepLeadRows: number;
    invalidStopSweepPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    changedSlates: number;
    topSelectionDeltaOneMesPl: number | null;
    scannerDryRunRows: number;
    scannerZeroLivePublishBehaviorChangeRows: number;
    scannerBlockedRows: number;
    livePromotionAllowedRows: number;
  };
  requiredTests: string[];
  rollbackPlan: string[];
  nonGoals: string[];
  blockers: string[];
  recommendation: 'approval_ready_for_narrow_live_rank_penalty' | 'keep_research_only' | 'reject_live_proposal';
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const PENALTY_POINTS = 18;

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    proposalOnly: true,
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

function evidenceFrom(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport | null,
): UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport['evidence'] {
  return {
    overlayStatus: report?.status || null,
    recommendedAction: report?.summary.recommendedAction || null,
    sourceRows: report?.summary.sourceRows || 0,
    sweepRows: report?.summary.sweepRows || 0,
    validSweepLeadRows: report?.summary.validSweepLeadRows || 0,
    invalidStopSweepPenaltyRows: report?.summary.invalidStopSweepPenaltyRows || 0,
    validSweepLeadRowsPenalized: report?.summary.validSweepLeadRowsPenalized || 0,
    changedSlates: report?.summary.changedSlates || 0,
    topSelectionDeltaOneMesPl: report?.summary.topSelectionDeltaOneMesPl ?? null,
    scannerDryRunRows: report?.summary.scannerDryRunRows || 0,
    scannerZeroLivePublishBehaviorChangeRows: report?.summary.scannerZeroLivePublishBehaviorChangeRows || 0,
    scannerBlockedRows: report?.summary.scannerBlockedRows || 0,
    livePromotionAllowedRows: report?.summary.livePromotionAllowedRows || 0,
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Live Proposal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only proposal. It does not install a rank penalty, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Proposal',
    `- Primary boundary: ${report.proposedLiveBoundary.primaryBoundary}.`,
    `- Secondary boundary: ${report.proposedLiveBoundary.secondaryBoundary}.`,
    `- Preferred install path: ${report.proposedLiveBoundary.preferredBoundary}.`,
    `- Proposed rule: apply a ${report.proposedRule.penaltyPoints}-point rank penalty only to SweepMssFvgRetrace rows with executionStatus=${report.proposedRule.appliesOnlyWhen.executionStatus} and blockReason=${report.proposedRule.appliesOnlyWhen.blockReason}.`,
    '- raidReclaim and SweepMssFvgRetrace model availability remain unchanged.',
    '- canExecute remains a final compatibility/execution flag and is not created or loosened by this rule.',
    '',
    '## Evidence',
    `- Overlay status: ${report.evidence.overlayStatus ?? '-'}.`,
    `- Recommended action: ${report.evidence.recommendedAction ?? '-'}.`,
    `- Source rows: ${report.evidence.sourceRows}.`,
    `- Sweep rows: ${report.evidence.sweepRows}.`,
    `- Valid Sweep lead rows: ${report.evidence.validSweepLeadRows}.`,
    `- Invalid-stop Sweep penalty rows: ${report.evidence.invalidStopSweepPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.evidence.validSweepLeadRowsPenalized}.`,
    `- Changed slates: ${report.evidence.changedSlates}.`,
    `- Top-selection delta: ${report.evidence.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Scanner dry-run zero-live-publish rows: ${report.evidence.scannerZeroLivePublishBehaviorChangeRows}/${report.evidence.scannerDryRunRows}.`,
    '',
    '## Approval Gate',
    `- Required before live install: ${report.approvalGate.requiredBeforeLiveInstall}.`,
    `- Reason: ${report.approvalGate.reason}.`,
    '',
    '## Required Tests',
    ...report.requiredTests.map((item) => `- ${item}`),
    '',
    '## Rollback',
    ...report.rollbackPlan.map((item) => `- ${item}`),
    '',
    '## Non-Goals',
    ...report.nonGoals.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    `Recommendation: ${report.recommendation}`,
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport(args: {
  reportDir: string;
  freshScannerOverlayDryRunPath: string | null;
  freshScannerOverlayDryRunReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport {
  const evidence = evidenceFrom(args.freshScannerOverlayDryRunReport);
  const blockers = [
    !args.freshScannerOverlayDryRunPath ? 'missing fresh scanner overlay dry-run path' : null,
    !args.freshScannerOverlayDryRunReport ? 'missing fresh scanner overlay dry-run report' : null,
    evidence.overlayStatus !== 'pass' ? `fresh scanner overlay dry-run status ${evidence.overlayStatus ?? 'missing'}` : null,
    evidence.recommendedAction !== 'research_overlay_candidate_ready_for_live_proposal'
      ? `fresh scanner overlay dry-run action ${evidence.recommendedAction ?? 'missing'}`
      : null,
    evidence.validSweepLeadRowsPenalized !== 0 ? 'valid Conditional/EntryTriggerPending Sweep rows would be penalized' : null,
    evidence.invalidStopSweepPenaltyRows <= 0 ? 'no invalid-stop Sweep penalty rows were proven' : null,
    evidence.changedSlates <= 0 ? 'no top-selection slates changed' : null,
    (evidence.topSelectionDeltaOneMesPl ?? -1) < 0 ? 'overlay worsened top-selection P/L' : null,
    evidence.scannerDryRunRows <= 0 ? 'scanner dry-run proof is missing' : null,
    evidence.scannerDryRunRows !== evidence.scannerZeroLivePublishBehaviorChangeRows ? 'scanner dry-run would change live publish behavior' : null,
    evidence.scannerBlockedRows !== 0 ? 'scanner dry-run has blocked rows' : null,
    evidence.livePromotionAllowedRows !== 0 ? 'live promotion rows must remain zero in proposal proof' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length ? 'reject_live_proposal' : 'approval_ready_for_narrow_live_rank_penalty';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_live_proposal',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      freshScannerOverlayDryRunPath: args.freshScannerOverlayDryRunPath,
    },
    approvalGate: {
      requiredBeforeLiveInstall: true,
      reason: 'model_ranking_change',
      explicitUserApprovalRequired: true,
    },
    proposedLiveBoundary: {
      primaryBoundary: 'src/lib/unifiedDeskCandidateBook.ts::scoreForCandidate',
      secondaryBoundary: 'src/lib/tradeDecisionPipeline.ts::finalSelectionSort',
      preferredBoundary: 'audit_book_first_then_pipeline_only_after_regression',
      prohibitedBoundaries: [
        'Do not change setup eligibility in src/lib/setupScanner.ts.',
        'Do not remove SweepMssFvgRetrace or raidReclaim from the primary model registry.',
        'Do not change canExecute, entry, stop, target, risk, bridge, Discord, or Supabase behavior.',
        'Do not use realized outcome P/L as live scoring input.',
      ],
    },
    proposedRule: {
      setupType: 'SweepMssFvgRetrace',
      appliesOnlyWhen: {
        executionStatus: 'Blocked',
        blockReason: 'InvalidStopLocation',
      },
      penaltyPoints: PENALTY_POINTS,
      preservesValidSweepLead: true,
      preservesraidReclaim: true,
      preservesModelAvailability: true,
      preservesCanExecute: true,
    },
    evidence,
    requiredTests: [
      'npx tsx src/lib/unifiedDeskCandidateBook.test.ts',
      'npx tsx src/lib/tradeDecisionPipeline.test.ts',
      'npx tsx src/lib/setupScanner.test.ts',
      'npx tsx tools/automation/unified-positive-held-local-preview-sweep-penalty-live-proposal.test.ts',
      'npx tsx tools/automation/unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run.test.ts',
      'npm run diagnostic:held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run -- <same evidence paths> --json',
      'npm run guard:no-firebase',
      'npm run guard:architecture',
      'npm run guard:schema',
      'npm run lint',
      'npm run build',
      'npm run test',
      'git diff --check',
    ],
    rollbackPlan: [
      'Remove the invalid-stop Sweep penalty helper or feature flag from the ranking boundary.',
      'Re-run unifiedDeskCandidateBook, tradeDecisionPipeline, setupScanner, full guards, lint, build, test, and git diff --check.',
      'Confirm the selected-candidate output returns to the pre-install baseline and Discord/Supabase/bridge behavior remains unchanged.',
    ],
    nonGoals: [
      'No raidReclaim removal.',
      'No SweepMssFvgRetrace removal.',
      'No canExecute removal or loosening.',
      'No target, stop, entry, risk, session, bridge, Supabase, Discord, or automated execution change.',
      'No live use of realized P/L or future outcome labels.',
    ],
    blockers,
    recommendation,
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-live-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const freshScannerOverlayDryRunPath = readFlag(args, '--fresh-scanner-overlay-dry-run') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport({
    reportDir: outDir,
    freshScannerOverlayDryRunPath,
    freshScannerOverlayDryRunReport: freshScannerOverlayDryRunPath && fs.existsSync(freshScannerOverlayDryRunPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport>(freshScannerOverlayDryRunPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, recommendation: report.recommendation, evidence: report.evidence }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
