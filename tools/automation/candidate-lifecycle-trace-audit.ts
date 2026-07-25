import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  resolveScannerWindow,
} from '../../src/lib/localScannerEngine';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type SetupCandidate,
} from '../../src/types';

export interface CandidateLifecycleTraceAuditFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface Phase9BCandidateLifecycleTraceAuditReport {
  reportType: 'phase_9b_candidate_lifecycle_trace_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRanking: false;
  };
  rootDir: string;
  filesScanned: string[];
  status: 'pass' | 'fail';
  summary: {
    fixtureCandidates: number;
    createdCandidates: number;
    filteredCandidates: number;
    hasHighestRankedCandidate: boolean;
    hasBestLongPlan: boolean;
    hasBestShortPlan: boolean;
    hasSelectedCandidate: boolean;
    hasDiscordDecision: boolean;
    missingProofItems: number;
    hasNextTrigger: boolean;
  };
  checks: string[];
  findings: CandidateLifecycleTraceAuditFinding[];
  markdown: string;
}

function authority(): Phase9BCandidateLifecycleTraceAuditReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRanking: false,
  };
}

function finding(checkId: string, reason: string, evidence: string[]): CandidateLifecycleTraceAuditFinding {
  return { checkId, reason, evidence };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/lib/localScannerEngine.ts',
    'src/lib/localScannerEngine.test.ts',
    'tools/automation/new-project-workflow-loopback.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
}

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'Lifecycle audit long conditional with complete levels',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 98,
    entry: 7469.75,
    stop: 7459.75,
    target1: 7484.75,
    target2: 7489.75,
    riskPoints: 10,
    invalidation: 'Invalid below protected 5M swing low.',
    rankScore: 97,
    evidence: ['Sweep reclaimed', 'MSS confirmed', 'FVG retrace available'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M close above 7469.75, then retest holds.',
    nextAction: 'Wait for completed 5M proof.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function buildFixtureTrace() {
  const selected = candidate();
  const lowerRankedShort = candidate({
    setupType: SetupType.RaidReclaimReversal,
    scenarioLabel: 'Lifecycle audit short watch missing levels',
    direction: 'SHORT',
    priority: 95,
    rankScore: 72,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    missingEvidence: ['Completed 5M reclaim close missing.'],
    missingLevels: [
      {
        key: 'entry',
        label: 'Entry trigger',
        reason: 'No completed 5M close through the line in the sand.',
        source: '5m_execution',
        requiredFor: 'entry',
      },
    ],
    requiredTrigger: 'Completed 5M close below 7450.00, then failed retest.',
    nextAction: 'Wait for reclaim failure.',
    executionStatus: ExecutionStatus.Conditional,
  });
  const blockedCandidate = candidate({
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'Lifecycle audit blocked data-limited candidate',
    direction: 'LONG',
    priority: 97,
    rankScore: 65,
    executionStatus: ExecutionStatus.Blocked,
    blockReason: NoTradeReason.MissingRequiredContext,
    missingEvidence: ['HTF context is data-limited; 30-day preload is incomplete.'],
    requiredTrigger: 'Do not promote until HTF preload is repaired.',
    nextAction: 'Repair HTF context first.',
  });

  return buildCandidateLifecycleTrace({
    candidates: [selected, lowerRankedShort, blockedCandidate],
    selectedCandidate: selected,
    state: 'Conditional',
    window: resolveScannerWindow(new Date('2026-06-26T10:05:00-04:00')),
    alertDecision: { shouldSend: false, reason: 'Discord duplicate suppressed by durable ledger.' },
    canExecute: false,
    dataQualityBlocker: null,
    staleReason: null,
  });
}

function buildFindings() {
  const trace = buildFixtureTrace();
  const findings: CandidateLifecycleTraceAuditFinding[] = [];

  if (trace.sourceOfTruth !== 'scanner_candidate_lifecycle_trace') {
    findings.push(finding('source_of_truth', 'Candidate lifecycle trace sourceOfTruth changed.', [String(trace.sourceOfTruth)]));
  }
  if (trace.candidateCount !== 3 || trace.createdCandidates.length !== 3) {
    findings.push(finding('created_candidates', 'Trace does not report every created candidate.', [
      `candidateCount=${trace.candidateCount}`,
      `createdCandidates=${trace.createdCandidates.length}`,
    ]));
  }
  if (!trace.highestRankedCandidate || trace.highestRankedCandidate.setupType !== SetupType.SweepMssFvgRetrace) {
    findings.push(finding('highest_ranked_candidate', 'Trace does not identify the highest-ranked candidate.', [
      String(trace.highestRankedCandidate?.setupType ?? 'none'),
    ]));
  }
  if (!trace.selectedCandidate || !trace.selectedCandidate.selected || trace.selectedCandidateKey !== trace.selectedCandidate.candidateKey) {
    findings.push(finding('selected_candidate', 'Trace does not identify the selected candidate and selected key consistently.', [
      `selectedKey=${trace.selectedCandidateKey ?? 'none'}`,
      `selected=${String(trace.selectedCandidate?.selected ?? false)}`,
    ]));
  }
  if (!trace.bestLongPlan || trace.bestLongPlan.direction !== 'LONG') {
    findings.push(finding('best_directional_plans', 'Trace does not identify the best long plan.', [
      String(trace.bestLongPlan?.direction ?? 'none'),
    ]));
  }
  if (!trace.bestShortPlan || trace.bestShortPlan.direction !== 'SHORT') {
    findings.push(finding('best_directional_plans', 'Trace does not identify the best short plan.', [
      String(trace.bestShortPlan?.direction ?? 'none'),
    ]));
  }
  if (trace.filteredOutCandidates.length !== 2) {
    findings.push(finding('filtered_candidates', 'Trace does not report filtered-out candidates.', [
      `filtered=${trace.filteredOutCandidates.length}`,
    ]));
  }
  if (!trace.filteredOutCandidates.some((item) => item.filteredOutReason?.includes('missing full entry'))) {
    findings.push(finding('filtered_reason', 'Trace does not preserve missing-level filtered reason.', []));
  }
  if (!trace.filteredOutCandidates.some((item) => item.filteredOutReason?.includes(NoTradeReason.MissingRequiredContext))) {
    findings.push(finding('filtered_reason', 'Trace does not preserve blocked/data-limited filtered reason.', []));
  }
  if (trace.discordDecision.shouldSend !== false || !trace.discordDecision.reason.includes('duplicate')) {
    findings.push(finding('discord_decision', 'Trace does not copy the existing Discord send/suppress decision.', [
      JSON.stringify(trace.discordDecision),
    ]));
  }
  if (!trace.missingProofSummary.includes('Completed 5M reclaim close missing.')) {
    findings.push(finding('missing_proof', 'Trace missing proof summary does not include lower-ranked missing 5M proof.', trace.missingProofSummary));
  }
  if (!trace.missingProofSummary.includes('HTF context is data-limited; 30-day preload is incomplete.')) {
    findings.push(finding('missing_proof', 'Trace missing proof summary does not include blocked HTF data-quality proof.', trace.missingProofSummary));
  }
  if (!trace.nextTrigger?.includes('Completed 5M close above 7469.75')) {
    findings.push(finding('next_trigger', 'Trace does not expose the selected candidate next trigger.', [String(trace.nextTrigger ?? 'none')]));
  }
  if (!trace.notes.some((note) => note.includes('does not rerank'))) {
    findings.push(finding('authority_boundary', 'Trace notes no longer state that it does not rerank candidates.', trace.notes));
  }

  return findings;
}

function buildSummary(): Phase9BCandidateLifecycleTraceAuditReport['summary'] {
  const trace = buildFixtureTrace();
  return {
    fixtureCandidates: 3,
    createdCandidates: trace.createdCandidates.length,
    filteredCandidates: trace.filteredOutCandidates.length,
    hasHighestRankedCandidate: Boolean(trace.highestRankedCandidate),
    hasBestLongPlan: Boolean(trace.bestLongPlan),
    hasBestShortPlan: Boolean(trace.bestShortPlan),
    hasSelectedCandidate: Boolean(trace.selectedCandidate),
    hasDiscordDecision: Boolean(trace.discordDecision.reason),
    missingProofItems: trace.missingProofSummary.length,
    hasNextTrigger: Boolean(trace.nextTrigger),
  };
}

function buildMarkdown(report: Omit<Phase9BCandidateLifecycleTraceAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 9B Candidate Lifecycle Trace Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, change ranking, or change entry/stop/target math.',
    '',
    `Fixture candidates: ${report.summary.fixtureCandidates}; created: ${report.summary.createdCandidates}; filtered: ${report.summary.filteredCandidates}.`,
    `Coverage flags: highest=${report.summary.hasHighestRankedCandidate}; bestLong=${report.summary.hasBestLongPlan}; bestShort=${report.summary.hasBestShortPlan}; selected=${report.summary.hasSelectedCandidate}; discordDecision=${report.summary.hasDiscordDecision}; nextTrigger=${report.summary.hasNextTrigger}; missingProofItems=${report.summary.missingProofItems}.`,
    '',
    'Checks:',
    ...report.checks.map((check) => `- ${check}`),
  ];
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.checkId}: ${item.reason}`);
  } else {
    lines.push('', 'Findings: none.');
  }
  return lines.join('\n');
}

export function buildPhase9BCandidateLifecycleTraceAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9BCandidateLifecycleTraceAuditReport {
  const findings = buildFindings();
  const reportWithoutMarkdown = {
    reportType: 'phase_9b_candidate_lifecycle_trace_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' as const : 'pass' as const,
    summary: buildSummary(),
    checks: [
      'Lifecycle trace reports every created candidate in the scanner cycle.',
      'Lifecycle trace identifies the highest-ranked candidate without changing rank order.',
      'Lifecycle trace identifies best long, best short, and selected candidate state.',
      'Lifecycle trace reports filtered candidates with explicit missing-level, blocked, or stale reasons.',
      'Lifecycle trace copies the existing Discord send/suppress decision instead of making a new one.',
      'Lifecycle trace summarizes missing proof and next trigger for trader-facing explanation.',
      'Lifecycle trace remains metadata only and does not change trading logic, canExecute, ranking, or level math.',
    ],
    findings,
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildPhase9BCandidateLifecycleTraceAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
