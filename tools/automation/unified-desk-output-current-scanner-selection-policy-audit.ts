import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedDeskOutputVisibilityCandidate,
  UnifiedDeskOutputVisibilityReadinessReport,
} from '../../src/lib/unifiedDeskOutputScannerVisibilityAdapter';

type SessionName = 'morning' | 'lunch';

interface PolicySelection {
  policy: 'latest_completed_5m_proof_per_session' | 'proven_lane_priority_then_latest_proof';
  selectedCandidates: UnifiedDeskOutputVisibilityCandidate[];
}

interface PolicyComparisonRow {
  session: SessionName;
  latestProof: CandidateSummary | null;
  provenLanePriority: CandidateSummary | null;
  changedSelection: boolean;
  reason: string;
}

interface CandidateSummary {
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
  riskPoints: number;
  modelPriority: number;
}

interface SelectionPolicyAuditReport {
  reportType: 'unified_desk_output_current_scanner_selection_policy_audit';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedReadinessAuditOnly: true;
    comparesSelectionPolicyOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    readinessAuditPath: string;
  };
  policies: {
    baseline: 'latest_completed_5m_proof_per_session';
    proposed: 'proven_lane_priority_then_latest_proof';
    proposedPriority: Record<SessionName, string[]>;
  };
  summary: {
    sourceCandidates: number;
    eligibleApprovedDeskPlanRows: number;
    latestProofSelectedRows: number;
    proposedPrioritySelectedRows: number;
    changedSessionSelections: number;
    discordPostRows: 0;
    supabaseWriteRows: 0;
    liveSupabaseReadRows: 0;
    liveBridgeReadRows: 0;
    canExecuteTrueRows: number;
    canExecuteChangedRows: 0;
    tradingLogicChangedRows: 0;
    runtimeInstallAllowed: false;
    blockedRows: number;
    recommendation: 'review_policy_before_runtime_install' | 'hold_for_selection_policy_audit_fix';
  };
  comparisons: PolicyComparisonRow[];
  modelCounts: Array<{ session: SessionName; model: string; count: number }>;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  readinessAuditPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

const PROPOSED_PRIORITY: Record<SessionName, string[]> = {
  morning: [
    'OpeningDriveFvgContinuation',
    'SweepMssFvgRetrace',
    'IntradayMssMicroContinuation',
    'RaidReclaimReversal',
    'IntradayMssMicroContinuation',
    'SweepMssFvgRetrace',
    'raidReclaim',
  ],
  lunch: [
    'AfterLunchDriveFvgContinuation',
    'SweepMssFvgRetrace',
    'IntradayMssMicroContinuation',
    'RaidReclaimReversal',
    'IntradayMssMicroContinuation',
    'SweepMssFvgRetrace',
    'raidReclaim',
  ],
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    readinessAuditPath: readFlag(args, '--readiness-audit'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
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

function sortedLatestFirst(candidates: UnifiedDeskOutputVisibilityCandidate[]): UnifiedDeskOutputVisibilityCandidate[] {
  return [...candidates].sort((left, right) => {
    const timeCompare = right.proofTime.localeCompare(left.proofTime);
    return timeCompare || left.cardId.localeCompare(right.cardId);
  });
}

function priorityFor(session: SessionName, model: string): number {
  const index = PROPOSED_PRIORITY[session].indexOf(model);
  return index >= 0 ? index : PROPOSED_PRIORITY[session].length;
}

function sortedByProvenLanePriority(candidates: UnifiedDeskOutputVisibilityCandidate[]): UnifiedDeskOutputVisibilityCandidate[] {
  return [...candidates].sort((left, right) => {
    const priorityCompare = priorityFor(left.session, left.model) - priorityFor(right.session, right.model);
    if (priorityCompare !== 0) return priorityCompare;
    const timeCompare = right.proofTime.localeCompare(left.proofTime);
    return timeCompare || left.cardId.localeCompare(right.cardId);
  });
}

function selectOne(args: {
  candidates: UnifiedDeskOutputVisibilityCandidate[];
  policy: PolicySelection['policy'];
}): PolicySelection {
  const sessions: SessionName[] = ['morning', 'lunch'];
  const selectedCandidates = sessions.flatMap((session) => {
    const candidates = args.candidates.filter((candidate) => candidate.session === session);
    const sorted = args.policy === 'latest_completed_5m_proof_per_session'
      ? sortedLatestFirst(candidates)
      : sortedByProvenLanePriority(candidates);
    return sorted[0] ? [sorted[0]] : [];
  });
  return {
    policy: args.policy,
    selectedCandidates,
  };
}

function summarize(candidate: UnifiedDeskOutputVisibilityCandidate | undefined): CandidateSummary | null {
  if (!candidate) return null;
  return {
    cardId: candidate.cardId,
    date: candidate.date,
    session: candidate.session,
    model: candidate.model,
    direction: candidate.direction,
    proofTime: candidate.proofTime,
    entry: candidate.entry,
    stop: candidate.stop,
    target1: candidate.target1,
    target2: candidate.target2,
    riskPoints: candidate.riskPoints,
    modelPriority: priorityFor(candidate.session, candidate.model),
  };
}

function buildReason(latest: CandidateSummary | null, proposed: CandidateSummary | null): string {
  if (!latest && !proposed) return 'No eligible Approved Desk Plan candidate exists for this session.';
  if (!latest || !proposed) return 'One policy selected a row and the other did not.';
  if (latest.cardId === proposed.cardId) return 'Both policies select the same scanner-owned row.';
  return `Latest-proof selects ${latest.model} at ${latest.proofTime.slice(11, 16)} ET; proposed priority selects ${proposed.model} at ${proposed.proofTime.slice(11, 16)} ET because its model priority is higher.`;
}

function modelCounts(candidates: UnifiedDeskOutputVisibilityCandidate[]): SelectionPolicyAuditReport['modelCounts'] {
  const counts = new Map<string, { session: SessionName; model: string; count: number }>();
  for (const candidate of candidates) {
    const key = `${candidate.session}|${candidate.model}`;
    const existing = counts.get(key) || { session: candidate.session, model: candidate.model, count: 0 };
    existing.count += 1;
    counts.set(key, existing);
  }
  return [...counts.values()].sort((left, right) => {
    const sessionCompare = left.session.localeCompare(right.session);
    return sessionCompare || left.model.localeCompare(right.model);
  });
}

function buildMarkdown(report: Omit<SelectionPolicyAuditReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Current Scanner Selection Policy Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved readiness-audit comparison only. It does not install a selector policy, post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Source candidates: ${report.summary.sourceCandidates}.`,
    `- Eligible Approved Desk Plan rows: ${report.summary.eligibleApprovedDeskPlanRows}.`,
    `- Latest-proof selected rows: ${report.summary.latestProofSelectedRows}.`,
    `- Proposed-priority selected rows: ${report.summary.proposedPrioritySelectedRows}.`,
    `- Changed session selections: ${report.summary.changedSessionSelections}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Policy Comparison',
    '| Session | Latest Proof | Proposed Priority | Changed | Reason |',
    '|---|---|---|---|---|',
    ...report.comparisons.map((row) => `| ${row.session} | ${row.latestProof ? `${row.latestProof.model} ${row.latestProof.direction} ${row.latestProof.proofTime.slice(11, 16)}` : '-' } | ${row.provenLanePriority ? `${row.provenLanePriority.model} ${row.provenLanePriority.direction} ${row.provenLanePriority.proofTime.slice(11, 16)}` : '-'} | ${row.changedSelection ? 'yes' : 'no'} | ${row.reason} |`),
    '',
    '## Model Counts',
    '| Session | Model | Rows |',
    '|---|---|---:|',
    ...report.modelCounts.map((row) => `| ${row.session} | ${row.model} | ${row.count} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputCurrentScannerSelectionPolicyAuditReport(args: {
  readinessAuditPath: string;
  readinessReport: UnifiedDeskOutputVisibilityReadinessReport;
}, generatedAt = new Date().toISOString()): SelectionPolicyAuditReport {
  const eligible = args.readinessReport.candidates
    .filter((candidate) => candidate.state === 'APPROVED_DESK_PLAN');
  const latest = selectOne({ candidates: eligible, policy: 'latest_completed_5m_proof_per_session' });
  const proposed = selectOne({ candidates: eligible, policy: 'proven_lane_priority_then_latest_proof' });
  const comparisons: PolicyComparisonRow[] = (['morning', 'lunch'] as SessionName[]).map((session) => {
    const latestSummary = summarize(latest.selectedCandidates.find((candidate) => candidate.session === session));
    const proposedSummary = summarize(proposed.selectedCandidates.find((candidate) => candidate.session === session));
    return {
      session,
      latestProof: latestSummary,
      provenLanePriority: proposedSummary,
      changedSelection: latestSummary?.cardId !== proposedSummary?.cardId,
      reason: buildReason(latestSummary, proposedSummary),
    };
  });
  const blockers = [
    args.readinessReport.reportType === 'unified_desk_output_live_gate_readiness_audit'
      ? null
      : 'Source report is not the live-gate readiness audit.',
    args.readinessReport.status === 'pass' ? null : `Live-gate readiness audit status is ${args.readinessReport.status}.`,
    args.readinessReport.summary.discordPostNowRows === 0 ? null : 'Readiness audit has Discord post rows.',
    args.readinessReport.summary.supabaseWriteNowRows === 0 ? null : 'Readiness audit has Supabase write rows.',
    args.readinessReport.summary.liveBridgeReadNowRows === 0 ? null : 'Readiness audit has live bridge read rows.',
    args.readinessReport.summary.canExecuteTrueRows === 0 ? null : 'Readiness audit has canExecute=true rows.',
    args.readinessReport.summary.canExecuteChangedRows === 0 ? null : 'Readiness audit has canExecute changed rows.',
    args.readinessReport.summary.tradingLogicChangedRows === 0 ? null : 'Readiness audit has trading-logic changed rows.',
    args.readinessReport.summary.blockedRows === 0 ? null : 'Readiness audit has blocked rows.',
    eligible.length > 0 ? null : 'No eligible Approved Desk Plan rows available for policy comparison.',
    ...args.readinessReport.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<SelectionPolicyAuditReport, 'markdown'> = {
    reportType: 'unified_desk_output_current_scanner_selection_policy_audit',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedReadinessAuditOnly: true,
      comparesSelectionPolicyOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      readinessAuditPath: args.readinessAuditPath,
    },
    policies: {
      baseline: 'latest_completed_5m_proof_per_session',
      proposed: 'proven_lane_priority_then_latest_proof',
      proposedPriority: PROPOSED_PRIORITY,
    },
    summary: {
      sourceCandidates: args.readinessReport.candidates.length,
      eligibleApprovedDeskPlanRows: eligible.length,
      latestProofSelectedRows: latest.selectedCandidates.length,
      proposedPrioritySelectedRows: proposed.selectedCandidates.length,
      changedSessionSelections: comparisons.filter((row) => row.changedSelection).length,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: args.readinessReport.summary.canExecuteTrueRows,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      runtimeInstallAllowed: false,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_selection_policy_audit_fix' : 'review_policy_before_runtime_install',
    },
    comparisons,
    modelCounts: modelCounts(eligible),
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputCurrentScannerSelectionPolicyAuditReport(
  report: SelectionPolicyAuditReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-current-scanner-selection-policy-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-current-scanner-selection-policy-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const readinessAuditPath = path.resolve(options.readinessAuditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-live-gate-readiness-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(readinessAuditPath)) throw new Error('Missing Unified Desk Output live-gate readiness audit path.');
  const report = buildUnifiedDeskOutputCurrentScannerSelectionPolicyAuditReport({
    readinessAuditPath,
    readinessReport: readJson<UnifiedDeskOutputVisibilityReadinessReport>(readinessAuditPath),
  });
  const written = writeUnifiedDeskOutputCurrentScannerSelectionPolicyAuditReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      comparisons: report.comparisons,
      modelCounts: report.modelCounts,
      blockers: report.blockers,
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
