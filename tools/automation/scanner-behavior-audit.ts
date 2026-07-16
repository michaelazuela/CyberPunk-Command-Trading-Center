import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ScannerSession = 'morning' | 'lunch' | 'evening';

export interface ScannerBehaviorAuditRow {
  tradeDate: string;
  session: ScannerSession;
  completed5m: string;
  close: number | null;
  currentPrice: number | null;
  scannerState: string;
  selected: string;
  selectedDirection: string;
  deskPrimary: string;
  htfFvgReactionRoutingStatus: string;
  htfFvgReactionRoutingDirection: string;
  htfFvgReactionPhase4Enforcement: 'pass' | 'fail' | 'not_applicable';
  canExecute: boolean | null;
  visibilityMode: string;
  discordAction: string;
  currentRuleExpectedDiscordPost: boolean;
  currentRuleReason: string;
  staleReason: string | null;
  auditFlags: string[];
}

export interface ScannerBehaviorAuditReport {
  reportType: 'scanner_behavior_phase1_audit';
  generatedAt: string;
  tradeDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  sourceTapes: string[];
  summary: {
    tapesReviewed: number;
    eventsReviewed: number;
    currentRuleExpectedPosts: number;
    currentRuleSuppressions: number;
    canExecuteFalseExpectedPosts: number;
    reviewOrWatchExpectedPosts: number;
    staleOrNoChaseEvents: number;
    candidateDeskConflicts: number;
    htfFvgReactionRoutingEvents: number;
    htfFvgReactionRoutingConflicts: number;
    htfFvgReactionBoundaryDrift: number;
    phase4EnforcementFailures: number;
    dataQualityEvents: number;
    duplicateSuppressions: number;
  };
  rows: ScannerBehaviorAuditRow[];
  findings: string[];
  authority: {
    readOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntriesStopsTargets: false;
  };
  markdown: string;
}

interface ScannerBehaviorAuditOptions {
  tradeDate: string;
  instrument: string;
  sessions: ScannerSession[];
  auditDir: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const ALL_SESSIONS: ScannerSession[] = ['morning', 'lunch', 'evening'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function parseSessions(raw: string | null): ScannerSession[] {
  if (!raw || raw.toLowerCase() === 'all') return ALL_SESSIONS;
  const sessions = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  for (const session of sessions) {
    if (session !== 'morning' && session !== 'lunch' && session !== 'evening') {
      throw new Error('--sessions must contain morning,lunch,evening, or all.');
    }
  }
  return [...new Set(sessions)] as ScannerSession[];
}

export function parseScannerBehaviorAuditArgs(args = process.argv.slice(2)): ScannerBehaviorAuditOptions {
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    sessions: parseSessions(readFlag(args, '--sessions')),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: hasFlag(args, '--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = 'N/A'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function directionalValue(value: unknown): 'LONG' | 'SHORT' | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function formatTime(value: string): string {
  return value.match(/T(\d{2}:\d{2})/)?.[1] || value;
}

function formatNumber(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

function tapePath(options: ScannerBehaviorAuditOptions, session: ScannerSession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${options.tradeDate}-${options.instrument}-${session}.json`);
}

function selectedLabel(selected: Record<string, unknown>): string {
  const direction = stringValue(selected.direction, 'WAIT');
  const setupType = stringValue(selected.setupType, 'No setup');
  const status = stringValue(selected.executionStatus, stringValue(selected.detectedStatus, 'status unknown'));
  return `${direction} ${setupType} (${status})`;
}

function isDuplicateSuppressionText(value: string): boolean {
  return /duplicate|dedupe|durable\s+supabase\s+ledger|durable\s+ledger|already\s+sent|existing\s+discord\/campaign\s+record/i.test(value);
}

function auditFlags(args: {
  currentRuleExpectedDiscordPost: boolean;
  canExecute: boolean | null;
  visibilityMode: string;
  selectedDirection: string;
  deskPrimary: string;
  activeCampaignDirection: string;
  htfFvgReactionRoutingStatus: string;
  htfFvgReactionRoutingDirection: string;
  htfFvgReactionApprovalBoundary: Record<string, unknown>;
  currentRuleReason: string;
  staleReason: string | null;
}): string[] {
  const flags: string[] = [];
  const text = `${args.currentRuleReason} ${args.staleReason || ''} ${args.visibilityMode}`;
  const duplicateSuppressed = isDuplicateSuppressionText(text);
  const staleOrNoChase = !duplicateSuppressed && /stale|no chase|already|T1 was already reached/i.test(text);
  if (args.currentRuleExpectedDiscordPost) flags.push('current_rules_expect_post');
  if (args.canExecute === false) flags.push('canExecute_false');
  if (/POST_REVIEW|POST_WATCH|review|watch/i.test(args.visibilityMode)) flags.push('review_or_watch');
  if (staleOrNoChase) flags.push('stale_or_no_chase');
  if (duplicateSuppressed) flags.push('duplicate_suppression');
  if (/DATA_QUALITY|data quality|not usable/i.test(text)) flags.push('data_quality');
  const selectedPrimaryMismatch = args.selectedDirection !== 'N/A' &&
    args.deskPrimary !== 'N/A' &&
    args.deskPrimary !== 'WAIT' &&
    args.selectedDirection !== args.deskPrimary;
  const selectedMismatchIsHard = args.currentRuleExpectedDiscordPost && !staleOrNoChase && !duplicateSuppressed;
  if (
    selectedPrimaryMismatch &&
    selectedMismatchIsHard
  ) {
    flags.push('candidate_desk_conflict');
  } else if (selectedPrimaryMismatch) {
    flags.push('candidate_desk_warning');
  }
  const routedDirection = directionalValue(args.htfFvgReactionRoutingDirection);
  const activeRouting = args.htfFvgReactionRoutingStatus === 'routed_active_reaction' && routedDirection;
  if (activeRouting) {
    flags.push('htf_fvg_reaction_routing_active');
    if (args.deskPrimary !== routedDirection) flags.push('htf_fvg_reaction_primary_mismatch');
    const selectedRoutingMismatch = args.selectedDirection !== 'N/A' && args.selectedDirection !== routedDirection;
    if (selectedRoutingMismatch && selectedMismatchIsHard) {
      flags.push('htf_fvg_reaction_selected_conflict');
    } else if (selectedRoutingMismatch) {
      flags.push('htf_fvg_reaction_selected_warning');
    }
    if (args.activeCampaignDirection !== 'N/A' && args.activeCampaignDirection !== routedDirection) {
      flags.push('htf_fvg_reaction_campaign_conflict');
    }
    const boundary = args.htfFvgReactionApprovalBoundary;
    const boundaryChanged = [
      boundary.changesTradeApprovals,
      boundary.changesCanExecute,
      boundary.changesEntryStopTargets,
      boundary.changesRiskRules,
      boundary.changesRanking,
      boundary.createsNewModel,
    ].some((value) => value !== false);
    if (boundaryChanged) flags.push('htf_fvg_reaction_boundary_drift');
  }
  return flags;
}

function rowFromEvent(args: {
  tradeDate: string;
  session: ScannerSession;
  completed5m: string;
  event: Record<string, unknown>;
}): ScannerBehaviorAuditRow {
  const bar = asRecord(args.event.completed5m);
  const selected = asRecord(asRecord(args.event.setupCandidateStatus).selected);
  const plan = asRecord(args.event.plan);
  const visibility = asRecord(args.event.visibility);
  const deskPrimary = asRecord(asRecord(args.event.deskState).primaryDeskPlay);
  const htfFvgReactionRouting = asRecord(deskPrimary.htfFvgReactionRouting);
  const activeCampaign = asRecord(asRecord(args.event.candidateLifecycleTrace).activeCampaign);
  const discord = asRecord(args.event.discord);
  const canExecute = boolValue(plan.canExecute);
  const selectedDirection = stringValue(selected.direction);
  const deskPrimaryDirection = stringValue(deskPrimary.direction, 'WAIT');
  const activeCampaignDirection = stringValue(activeCampaign.direction);
  const htfFvgReactionRoutingStatus = stringValue(htfFvgReactionRouting.status);
  const htfFvgReactionRoutingDirection = stringValue(htfFvgReactionRouting.direction);
  const currentRuleReason = stringValue(discord.sendOrSuppressReason, 'reason unavailable');
  const duplicateSuppressed = isDuplicateSuppressionText(currentRuleReason);
  const currentRuleExpectedDiscordPost = discord.shouldSend === true && !duplicateSuppressed;
  const visibilityMode = stringValue(visibility.visibilityMode, 'N/A');
  const staleReason = typeof args.event.staleReason === 'string' && args.event.staleReason.trim()
    ? args.event.staleReason
    : null;
  const flags = auditFlags({
    currentRuleExpectedDiscordPost,
    canExecute,
    visibilityMode,
    selectedDirection,
    deskPrimary: deskPrimaryDirection,
    activeCampaignDirection,
    htfFvgReactionRoutingStatus,
    htfFvgReactionRoutingDirection,
    htfFvgReactionApprovalBoundary: asRecord(htfFvgReactionRouting.approvalBoundary),
    currentRuleReason,
    staleReason,
  });
  const htfFvgReactionPhase4Enforcement = flags.includes('htf_fvg_reaction_routing_active')
    ? flags.some((flag) => flag.startsWith('htf_fvg_reaction_') && flag !== 'htf_fvg_reaction_routing_active' && flag !== 'htf_fvg_reaction_selected_warning')
      ? 'fail'
      : 'pass'
    : 'not_applicable';

  return {
    tradeDate: args.tradeDate,
    session: args.session,
    completed5m: args.completed5m,
    close: numberValue(bar.close),
    currentPrice: numberValue(args.event.currentPrice),
    scannerState: stringValue(args.event.scannerState, 'unknown'),
    selected: selectedLabel(selected),
    selectedDirection,
    deskPrimary: deskPrimaryDirection,
    htfFvgReactionRoutingStatus,
    htfFvgReactionRoutingDirection,
    htfFvgReactionPhase4Enforcement,
    canExecute,
    visibilityMode,
    discordAction: currentRuleExpectedDiscordPost ? 'post' : 'suppress',
    currentRuleExpectedDiscordPost,
    currentRuleReason,
    staleReason,
    auditFlags: flags,
  };
}

function findingsFor(summary: ScannerBehaviorAuditReport['summary']): string[] {
  const findings: string[] = [];
  if (summary.canExecuteFalseExpectedPosts > 0) {
    findings.push(`${summary.canExecuteFalseExpectedPosts} current-rule expected post(s) had canExecute=false; verify they are explicitly review/watch/map, not executable trade cards.`);
  }
  if (summary.reviewOrWatchExpectedPosts > 0) {
    findings.push(`${summary.reviewOrWatchExpectedPosts} current-rule expected post(s) were review/watch visibility modes; Phase 2 should classify report family and cadence.`);
  }
  if (summary.staleOrNoChaseEvents > 0) {
    findings.push(`${summary.staleOrNoChaseEvents} event(s) carried stale/no-chase language; Phase 3 should verify stale plans cannot surface as actionable Discord cards.`);
  }
  if (summary.candidateDeskConflicts > 0) {
    findings.push(`${summary.candidateDeskConflicts} event(s) had selected candidate direction opposing the primary DeskState; Phase 4 should enforce clearer trader-facing language if needed.`);
  }
  if (summary.phase4EnforcementFailures > 0) {
    findings.push(`Phase 4 enforcement failed on ${summary.phase4EnforcementFailures} event(s): active HTF FVG reaction routing conflicted with primary, selected, campaign, or approval-boundary metadata.`);
  } else if (summary.htfFvgReactionRoutingEvents > 0) {
    findings.push(`Phase 4 enforcement passed on ${summary.htfFvgReactionRoutingEvents} active HTF FVG reaction routing event(s).`);
  }
  if (summary.htfFvgReactionBoundaryDrift > 0) {
    findings.push(`${summary.htfFvgReactionBoundaryDrift} event(s) showed HTF FVG reaction routing boundary drift; routing must remain communication-only.`);
  }
  if (summary.duplicateSuppressions > 0) {
    findings.push(`${summary.duplicateSuppressions} event(s) were suppressed by duplicate/dedupe logic; Phase 2 should confirm this is reducing noise as intended.`);
  }
  if (!findings.length) {
    findings.push('No immediate post/suppress risk detected from current decision tapes. Continue with Phase 2 cadence-family audit before changing behavior.');
  }
  findings.push('Read-only audit only. Do not change canExecute, entries, stops, targets, risk gates, setup definitions, or scanner ranking from this report.');
  return findings;
}

function markdownFor(report: Omit<ScannerBehaviorAuditReport, 'markdown'>): string {
  const lines = [
    `# Scanner Behavior Phase 1 Audit - ${report.instrument} ${report.tradeDate}`,
    '',
    'Read-only replay audit from scanner decision tapes. This report does not post Discord, change scanner state, approve execution, or change trading logic.',
    '',
    '## Summary',
    `- Tapes reviewed: ${report.summary.tapesReviewed}`,
    `- Events reviewed: ${report.summary.eventsReviewed}`,
    `- Current-rule expected posts: ${report.summary.currentRuleExpectedPosts}`,
    `- Current-rule suppressions: ${report.summary.currentRuleSuppressions}`,
    `- canExecute=false expected posts: ${report.summary.canExecuteFalseExpectedPosts}`,
    `- Review/watch expected posts: ${report.summary.reviewOrWatchExpectedPosts}`,
    `- Stale/no-chase events: ${report.summary.staleOrNoChaseEvents}`,
    `- Candidate/DeskState conflicts: ${report.summary.candidateDeskConflicts}`,
    `- HTF FVG reaction routing events: ${report.summary.htfFvgReactionRoutingEvents}`,
    `- HTF FVG reaction routing conflicts: ${report.summary.htfFvgReactionRoutingConflicts}`,
    `- HTF FVG reaction boundary drift: ${report.summary.htfFvgReactionBoundaryDrift}`,
    `- Phase 4 enforcement failures: ${report.summary.phase4EnforcementFailures}`,
    `- Data-quality events: ${report.summary.dataQualityEvents}`,
    `- Duplicate suppressions: ${report.summary.duplicateSuppressions}`,
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Bar-by-Bar Table',
    '| Session | 5M ET | Close | Current | Scanner | Selected | Desk | HTF FVG Route | Phase 4 | canExecute | Visibility | Discord | Flags | Reason |',
    '| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...report.rows.map((row) => [
      row.session,
      formatTime(row.completed5m),
      formatNumber(row.close),
      formatNumber(row.currentPrice),
      row.scannerState,
      row.selected.replace(/\|/g, '/'),
      row.deskPrimary,
      row.htfFvgReactionRoutingStatus === 'N/A'
        ? 'N/A'
        : `${row.htfFvgReactionRoutingDirection} ${row.htfFvgReactionRoutingStatus}`.replace(/\|/g, '/'),
      row.htfFvgReactionPhase4Enforcement,
      row.canExecute === null ? 'N/A' : String(row.canExecute),
      row.visibilityMode,
      row.discordAction,
      row.auditFlags.join(', ') || 'none',
      row.currentRuleReason.replace(/\|/g, '/'),
    ].join(' | ')).map((line) => `| ${line} |`),
    '',
    '## Authority Boundary',
    '- Read-only: true',
    '- Posts Discord: false',
    '- Changes scanner state: false',
    '- Changes trading logic: false',
    '- Changes canExecute: false',
    '- Changes entries/stops/targets: false',
  ];
  return `${lines.join('\n')}\n`;
}

export async function buildScannerBehaviorAuditReport(options: ScannerBehaviorAuditOptions): Promise<ScannerBehaviorAuditReport> {
  const sourceTapes: string[] = [];
  const rows: ScannerBehaviorAuditRow[] = [];

  for (const session of options.sessions) {
    const sourceTape = tapePath(options, session);
    if (!existsSync(sourceTape)) continue;
    sourceTapes.push(sourceTape);
    const tape = JSON.parse(await fs.readFile(sourceTape, 'utf8')) as Record<string, unknown>;
    for (const [completed5m, raw] of Object.entries(asRecord(tape.events)).sort(([a], [b]) => a.localeCompare(b))) {
      rows.push(rowFromEvent({
        tradeDate: options.tradeDate,
        session,
        completed5m,
        event: asRecord(raw),
      }));
    }
  }

  const summary: ScannerBehaviorAuditReport['summary'] = {
    tapesReviewed: sourceTapes.length,
    eventsReviewed: rows.length,
    currentRuleExpectedPosts: rows.filter((row) => row.currentRuleExpectedDiscordPost).length,
    currentRuleSuppressions: rows.filter((row) => !row.currentRuleExpectedDiscordPost).length,
    canExecuteFalseExpectedPosts: rows.filter((row) => row.currentRuleExpectedDiscordPost && row.canExecute === false).length,
    reviewOrWatchExpectedPosts: rows.filter((row) => row.currentRuleExpectedDiscordPost && row.auditFlags.includes('review_or_watch')).length,
    staleOrNoChaseEvents: rows.filter((row) => row.auditFlags.includes('stale_or_no_chase')).length,
    candidateDeskConflicts: rows.filter((row) => row.auditFlags.includes('candidate_desk_conflict')).length,
    htfFvgReactionRoutingEvents: rows.filter((row) => row.auditFlags.includes('htf_fvg_reaction_routing_active')).length,
    htfFvgReactionRoutingConflicts: rows.filter((row) => row.auditFlags.some((flag) => (
      flag === 'htf_fvg_reaction_primary_mismatch' ||
      flag === 'htf_fvg_reaction_selected_conflict' ||
      flag === 'htf_fvg_reaction_campaign_conflict'
    ))).length,
    htfFvgReactionBoundaryDrift: rows.filter((row) => row.auditFlags.includes('htf_fvg_reaction_boundary_drift')).length,
    phase4EnforcementFailures: rows.filter((row) => row.htfFvgReactionPhase4Enforcement === 'fail').length,
    dataQualityEvents: rows.filter((row) => row.auditFlags.includes('data_quality')).length,
    duplicateSuppressions: rows.filter((row) => row.auditFlags.includes('duplicate_suppression')).length,
  };
  const reportWithoutMarkdown: Omit<ScannerBehaviorAuditReport, 'markdown'> = {
    reportType: 'scanner_behavior_phase1_audit',
    generatedAt: new Date().toISOString(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    auditDir: options.auditDir,
    outDir: options.outDir,
    sourceTapes,
    summary,
    rows,
    findings: findingsFor(summary),
    authority: {
      readOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntriesStopsTargets: false,
    },
  };
  return {
    ...reportWithoutMarkdown,
    markdown: markdownFor(reportWithoutMarkdown),
  };
}

async function main() {
  const options = parseScannerBehaviorAuditArgs();
  const report = await buildScannerBehaviorAuditReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const base = `scanner-behavior-phase1-${options.tradeDate}-${options.instrument}`;
  const jsonPath = path.join(options.outDir, `${base}.json`);
  const mdPath = path.join(options.outDir, `${base}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, report.markdown);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ jsonPath, mdPath, summary: report.summary, findings: report.findings }, null, 2)}\n`);
  } else {
    console.log(`Scanner behavior Phase 1 audit written: ${mdPath}`);
    console.log(`Events reviewed: ${report.summary.eventsReviewed}; current-rule posts: ${report.summary.currentRuleExpectedPosts}; suppressions: ${report.summary.currentRuleSuppressions}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
