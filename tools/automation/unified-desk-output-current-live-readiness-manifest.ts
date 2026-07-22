import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedDeskOutputSelectionPolicyOrder } from '../../src/lib/unifiedDeskOutputGuardedScannerLane';

type SessionName = 'morning' | 'lunch';

interface GuardedLocalScannerLanePreviewReport {
  reportType: 'unified_desk_output_guarded_local_scanner_lane_preview';
  status: 'pass' | 'blocked';
  selectionPolicy: {
    enabledByDefault: false;
    state: 'APPROVED_DESK_PLAN';
    sessions: SessionName[];
    maxRowsPerSession: 1;
    order: UnifiedDeskOutputSelectionPolicyOrder;
    proposedPriority?: Record<SessionName, string[]> | null;
  };
  summary: {
    sourceCandidates: number;
    eligibleApprovedDeskPlanRows: number;
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    suppressedRows: number;
    surfaceRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    blockedRows: number;
    runtimeInstallAllowed: false;
    recommendation: 'ready_for_disabled_local_scanner_lane_preview' | 'hold_for_guarded_scanner_lane_fix';
  };
  selectedCandidates: Array<{
    cardId: string;
    date: string;
    session: SessionName;
    model: string;
    direction: 'LONG' | 'SHORT';
    proofTime: string;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
  }>;
  blockers: string[];
}

interface CurrentLiveReadinessManifestReport {
  reportType: 'unified_desk_output_current_live_readiness_manifest';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedGuardedPreviewOnly: true;
    writesManifestOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    runtimeInstallAllowed: false;
    automatedOrders: false;
  };
  source: {
    proposedPolicyPreviewPath: string;
    comparisonPolicyPreviewPath: string | null;
    proposedPolicy: 'proven_lane_priority_then_latest_proof';
    comparisonPolicy: 'latest_completed_5m_proof_per_session' | null;
  };
  runtimeGateContract: {
    commandExistsNow: false;
    proposedCommand: string;
    selectedPolicy: 'proven_lane_priority_then_latest_proof';
    enabledByDefault: false;
    scannerOwnedOnly: true;
    approvedDeskPlanOnly: true;
    maxRowsPerSession: 1;
    sessions: SessionName[];
    requiresFreshManifest: true;
    requiresFreshIdempotencyKey: true;
    requiresExplicitProductionApproval: true;
  };
  summary: {
    proposedPreviewPassed: boolean;
    comparisonPreviewPassed: boolean | null;
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    selectedPolicyChangedFromLatestProof: boolean | null;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    runtimeInstallAllowed: false;
    explicitApprovalPresent: false;
    readbackSteps: number;
    rollbackSteps: number;
    blockedRows: number;
    recommendation: 'ready_to_install_disabled_runtime_gate_manifest' | 'hold_for_current_live_readiness_manifest_fix';
  };
  selectedCandidates: GuardedLocalScannerLanePreviewReport['selectedCandidates'];
  comparisonCandidates: GuardedLocalScannerLanePreviewReport['selectedCandidates'];
  readbackSteps: string[];
  rollbackSteps: string[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  proposedPreviewPath: string | null;
  comparisonPreviewPath: string | null;
  outDir: string;
  json: boolean;
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    proposedPreviewPath: readFlag(args, '--proposed-preview'),
    comparisonPreviewPath: readFlag(args, '--comparison-preview'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestPreviewForPolicy(reportDir: string, policy: UnifiedDeskOutputSelectionPolicyOrder): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => /^unified-desk-output-guarded-local-scanner-lane-preview-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .find((filePath) => {
      try {
        return readJson<GuardedLocalScannerLanePreviewReport>(filePath).selectionPolicy?.order === policy;
      } catch {
        return false;
      }
    }) || null;
}

function sameCandidate(left: GuardedLocalScannerLanePreviewReport['selectedCandidates'][number], right: GuardedLocalScannerLanePreviewReport['selectedCandidates'][number]): boolean {
  return left.session === right.session &&
    left.model === right.model &&
    left.direction === right.direction &&
    left.proofTime === right.proofTime &&
    left.entry === right.entry &&
    left.stop === right.stop &&
    left.target1 === right.target1 &&
    left.target2 === right.target2;
}

function changedFromComparison(
  proposed: GuardedLocalScannerLanePreviewReport,
  comparison: GuardedLocalScannerLanePreviewReport | null,
): boolean | null {
  if (!comparison) return null;
  return proposed.selectedCandidates.some((candidate) => {
    const matchingSession = comparison.selectedCandidates.find((item) => item.session === candidate.session);
    return !matchingSession || !sameCandidate(candidate, matchingSession);
  });
}

function buildProposedCommand(policy: 'proven_lane_priority_then_latest_proof'): string {
  return [
    'npx tsx tools/automation/unified-desk-output-runtime-gate-manifest.ts',
    `--selection-policy ${policy}`,
    '--current-live-readiness-manifest <current-live-readiness-manifest-json>',
    '--disabled',
  ].join(' ');
}

function buildReadbackSteps(policy: 'proven_lane_priority_then_latest_proof'): string[] {
  return [
    `Confirm runtime gate uses selected policy ${policy}.`,
    'Confirm only APPROVED_DESK_PLAN rows are eligible.',
    'Confirm no more than one morning row and one lunch row can surface.',
    'Confirm selected rows match the manifest candidate ids before any Discord path is armed.',
    'Confirm canExecute remains false/internal unless existing deterministic gates separately approve.',
    'Confirm no Discord webhook call, Supabase write, live bridge read, trading-rule change, or automated order occurs during disabled runtime-gate validation.',
  ];
}

function buildRollbackSteps(): string[] {
  return [
    'Keep runtime gate disabled by default.',
    'Remove the runtime gate manifest from the launch command if any selected row mismatches.',
    'Return selector policy to latest_completed_5m_proof_per_session by omitting the opt-in policy flag.',
    'Preserve the manifest and failed preview artifacts for audit.',
  ];
}

function validatePreview(report: GuardedLocalScannerLanePreviewReport, expectedPolicy: UnifiedDeskOutputSelectionPolicyOrder, label: string): string[] {
  return [
    report.reportType === 'unified_desk_output_guarded_local_scanner_lane_preview'
      ? null
      : `${label} is not a guarded local scanner lane preview.`,
    report.status === 'pass' ? null : `${label} status is ${report.status}.`,
    report.selectionPolicy.order === expectedPolicy ? null : `${label} policy is ${report.selectionPolicy.order}, expected ${expectedPolicy}.`,
    report.selectionPolicy.enabledByDefault === false ? null : `${label} selection policy is enabled by default.`,
    report.selectionPolicy.state === 'APPROVED_DESK_PLAN' ? null : `${label} does not restrict to APPROVED_DESK_PLAN.`,
    report.selectionPolicy.maxRowsPerSession === 1 ? null : `${label} does not cap at one row per session.`,
    report.summary.selectedRows === 2 ? null : `${label} did not select exactly two rows.`,
    report.summary.morningRows === 1 ? null : `${label} did not select exactly one morning row.`,
    report.summary.lunchRows === 1 ? null : `${label} did not select exactly one lunch row.`,
    report.summary.discordPostRows === 0 ? null : `${label} has Discord-post rows.`,
    report.summary.supabaseWriteRows === 0 ? null : `${label} has Supabase-write rows.`,
    report.summary.liveSupabaseReadRows === 0 ? null : `${label} has live-Supabase-read rows.`,
    report.summary.liveBridgeReadRows === 0 ? null : `${label} has live-bridge-read rows.`,
    report.summary.canExecuteTrueRows === 0 ? null : `${label} has canExecute=true rows.`,
    report.summary.canExecuteChangedRows === 0 ? null : `${label} has canExecute changed rows.`,
    report.summary.tradingLogicChangedRows === 0 ? null : `${label} has trading-logic changed rows.`,
    report.summary.runtimeInstallAllowed === false ? null : `${label} allows runtime install.`,
    report.summary.blockedRows === 0 ? null : `${label} has blocked rows.`,
    ...report.blockers,
  ].filter((item): item is string => Boolean(item));
}

function buildMarkdown(report: Omit<CurrentLiveReadinessManifestReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Current Live Readiness Manifest',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local manifest only. It names the proposed selector policy for a future disabled runtime gate. It does not install runtime behavior, post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Proposed preview passed: ${report.summary.proposedPreviewPassed}.`,
    `- Comparison preview passed: ${report.summary.comparisonPreviewPassed}.`,
    `- Selected policy: ${report.runtimeGateContract.selectedPolicy}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Changed from latest proof: ${report.summary.selectedPolicyChangedFromLatestProof}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Explicit approval present: ${report.summary.explicitApprovalPresent}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proposed Command',
    '```powershell',
    report.runtimeGateContract.proposedCommand,
    '```',
    '',
    '## Selected Candidates',
    '| Session | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.selectedCandidates.map((candidate) => `| ${candidate.session} | ${candidate.model} | ${candidate.direction} | ${candidate.proofTime.slice(11, 16)} | ${candidate.entry} | ${candidate.stop} | ${candidate.target1} | ${candidate.target2} |`),
    '',
    '## Readback Steps',
    ...report.readbackSteps.map((step) => `- ${step}`),
    '',
    '## Rollback Steps',
    ...report.rollbackSteps.map((step) => `- ${step}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputCurrentLiveReadinessManifestReport(args: {
  proposedPreviewPath: string;
  proposedPreview: GuardedLocalScannerLanePreviewReport;
  comparisonPreviewPath: string | null;
  comparisonPreview: GuardedLocalScannerLanePreviewReport | null;
}, generatedAt = new Date().toISOString()): CurrentLiveReadinessManifestReport {
  const readbackSteps = buildReadbackSteps('proven_lane_priority_then_latest_proof');
  const rollbackSteps = buildRollbackSteps();
  const blockers = [
    ...validatePreview(args.proposedPreview, 'proven_lane_priority_then_latest_proof', 'Proposed policy preview'),
    ...(args.comparisonPreview
      ? validatePreview(args.comparisonPreview, 'latest_completed_5m_proof_per_session', 'Comparison policy preview')
      : ['Comparison latest-proof preview is missing.']),
  ];
  const changed = changedFromComparison(args.proposedPreview, args.comparisonPreview);
  const report: Omit<CurrentLiveReadinessManifestReport, 'markdown'> = {
    reportType: 'unified_desk_output_current_live_readiness_manifest',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedGuardedPreviewOnly: true,
      writesManifestOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      runtimeInstallAllowed: false,
      automatedOrders: false,
    },
    source: {
      proposedPolicyPreviewPath: args.proposedPreviewPath,
      comparisonPolicyPreviewPath: args.comparisonPreviewPath,
      proposedPolicy: 'proven_lane_priority_then_latest_proof',
      comparisonPolicy: args.comparisonPreview ? 'latest_completed_5m_proof_per_session' : null,
    },
    runtimeGateContract: {
      commandExistsNow: false,
      proposedCommand: buildProposedCommand('proven_lane_priority_then_latest_proof'),
      selectedPolicy: 'proven_lane_priority_then_latest_proof',
      enabledByDefault: false,
      scannerOwnedOnly: true,
      approvedDeskPlanOnly: true,
      maxRowsPerSession: 1,
      sessions: ['morning', 'lunch'],
      requiresFreshManifest: true,
      requiresFreshIdempotencyKey: true,
      requiresExplicitProductionApproval: true,
    },
    summary: {
      proposedPreviewPassed: args.proposedPreview.status === 'pass',
      comparisonPreviewPassed: args.comparisonPreview ? args.comparisonPreview.status === 'pass' : null,
      selectedRows: args.proposedPreview.summary.selectedRows,
      morningRows: args.proposedPreview.summary.morningRows,
      lunchRows: args.proposedPreview.summary.lunchRows,
      selectedPolicyChangedFromLatestProof: changed,
      discordPostRows: args.proposedPreview.summary.discordPostRows,
      supabaseWriteRows: args.proposedPreview.summary.supabaseWriteRows,
      liveSupabaseReadRows: args.proposedPreview.summary.liveSupabaseReadRows,
      liveBridgeReadRows: args.proposedPreview.summary.liveBridgeReadRows,
      canExecuteTrueRows: args.proposedPreview.summary.canExecuteTrueRows,
      canExecuteChangedRows: args.proposedPreview.summary.canExecuteChangedRows,
      tradingLogicChangedRows: args.proposedPreview.summary.tradingLogicChangedRows,
      runtimeInstallAllowed: false,
      explicitApprovalPresent: false,
      readbackSteps: readbackSteps.length,
      rollbackSteps: rollbackSteps.length,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_current_live_readiness_manifest_fix' : 'ready_to_install_disabled_runtime_gate_manifest',
    },
    selectedCandidates: args.proposedPreview.selectedCandidates,
    comparisonCandidates: args.comparisonPreview?.selectedCandidates || [],
    readbackSteps,
    rollbackSteps,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputCurrentLiveReadinessManifestReport(
  report: CurrentLiveReadinessManifestReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-current-live-readiness-manifest-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-current-live-readiness-manifest-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const proposedPreviewPath = path.resolve(options.proposedPreviewPath ||
    latestPreviewForPolicy(DEFAULT_REPORT_DIR, 'proven_lane_priority_then_latest_proof') ||
    '');
  if (!fs.existsSync(proposedPreviewPath)) throw new Error('Missing proven-lane-priority guarded preview path.');
  const comparisonPreviewPath = path.resolve(options.comparisonPreviewPath ||
    latestPreviewForPolicy(DEFAULT_REPORT_DIR, 'latest_completed_5m_proof_per_session') ||
    '');
  const comparisonPreview = fs.existsSync(comparisonPreviewPath)
    ? readJson<GuardedLocalScannerLanePreviewReport>(comparisonPreviewPath)
    : null;
  const report = buildUnifiedDeskOutputCurrentLiveReadinessManifestReport({
    proposedPreviewPath,
    proposedPreview: readJson<GuardedLocalScannerLanePreviewReport>(proposedPreviewPath),
    comparisonPreviewPath: comparisonPreview ? comparisonPreviewPath : null,
    comparisonPreview,
  });
  const written = writeUnifiedDeskOutputCurrentLiveReadinessManifestReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      runtimeGateContract: report.runtimeGateContract,
      selectedCandidates: report.selectedCandidates,
      blockers: report.blockers.slice(0, 20),
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
