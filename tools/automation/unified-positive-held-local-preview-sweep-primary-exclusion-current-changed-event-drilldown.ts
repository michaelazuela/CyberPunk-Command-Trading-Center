import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-selection-impact-simulation';

interface CliOptions {
  selectionImpactSimulationPath: string | null;
  scannerPackageDir: string;
  outDir: string;
  json: boolean;
}

interface CandidateDetail {
  candidateKey: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  rankScore: number;
  canExecute: boolean | null;
}

interface ChangedEventDrilldown {
  eventKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  sourceFiles: string[];
  sourceEventFound: boolean;
  candidateRows: number;
  scannerSummary: {
    candidateCount: number | null;
    executableCount: number | null;
    conditionalCount: number | null;
    blockedCount: number | null;
    bestExecutableSetupType: string | null;
    bestConditionalSetupType: string | null;
  };
  scannerOwnedSelectedCandidateFields: string[];
  deskTicketFields: string[];
  publishDecisionFields: string[];
  baselineCandidate: CandidateDetail | null;
  simulatedCandidate: CandidateDetail | null;
  topReplacementIsraidReclaimEntryTriggerMissing: boolean;
  canExecuteChanged: boolean;
  tradeMathChanged: boolean;
  runtimeProposalReady: boolean;
  runtimeReadinessBlockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_changed_event_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
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
  };
  source: {
    selectionImpactSimulationPath: string | null;
    scannerPackageDir: string;
  };
  assumptions: {
    changedEventsOnly: true;
    validatesArtifactCoverageOnly: true;
    noRuntimeSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedEventsRead: number;
    changedEventsFoundInRawPackages: number;
    scannerOwnedSelectedCandidateFieldEvents: number;
    deskTicketFieldEvents: number;
    publishDecisionFieldEvents: number;
    runtimeProposalReadyEvents: number;
    raidReclaimEntryTriggerMissingReplacementEvents: number;
    canExecuteChangedEvents: number;
    tradeMathChangedEvents: number;
    runtimeInstallAllowed: false;
    recommendation: 'needs_scanner_owned_selection_artifact_join' | 'fix_missing_input_reports';
  };
  changedEvents: ChangedEventDrilldown[];
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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    selectionImpactSimulationPath: readFlag(args, '--selection-impact-simulation') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-current-selection-impact-simulation-\d+\.json$/),
    scannerPackageDir: readFlag(args, '--scanner-package-dir') || outDir,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function packageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return packageFiles(fullPath);
    return entry.isFile() && entry.name.startsWith('raw-ohlc-scanner-artifacts-') && entry.name.endsWith('.json') ? [fullPath] : [];
  }).sort();
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function keyHits(value: unknown, pattern: RegExp, prefix = '', hits: string[] = []): string[] {
  if (!value || typeof value !== 'object') return hits;
  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((item, index) => keyHits(item, pattern, `${prefix}[${index}]`, hits));
    return hits;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (pattern.test(key)) hits.push(childPath);
    if (child && typeof child === 'object') keyHits(child, pattern, childPath, hits);
  }
  return hits;
}

function candidateDetail(candidate: unknown, candidateKey: string): CandidateDetail | null {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const record = candidate as Record<string, unknown>;
  return {
    candidateKey,
    setupType: text(record.setupType) || 'UNKNOWN',
    direction: text(record.direction) || 'UNKNOWN',
    executionStatus: text(record.executionStatus) || 'missing',
    blockReason: text(record.blockReason),
    entry: numberOrNull(record.entry),
    stop: numberOrNull(record.stop),
    target1: numberOrNull(record.target1),
    target2: numberOrNull(record.target2),
    riskPoints: numberOrNull(record.riskPoints),
    rankScore: numberOrNull(record.rankScore) ?? -999999,
    canExecute: boolOrNull((record as { humanReview?: { canExecute?: unknown } }).humanReview?.canExecute),
  };
}

function candidateKey(args: {
  eventKey: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  rankScore: number;
}): string {
  return [
    args.eventKey,
    args.setupType,
    args.direction,
    args.executionStatus,
    args.blockReason || 'null',
    args.entry ?? 'null',
    args.stop ?? 'null',
    args.target1 ?? 'null',
    args.target2 ?? 'null',
    args.riskPoints ?? 'null',
    args.rankScore,
  ].join('|');
}

function detailKey(eventKey: string, detail: CandidateDetail): string {
  return candidateKey({
    eventKey,
    setupType: detail.setupType,
    direction: detail.direction,
    executionStatus: detail.executionStatus,
    blockReason: detail.blockReason,
    entry: detail.entry,
    stop: detail.stop,
    target1: detail.target1,
    target2: detail.target2,
    riskPoints: detail.riskPoints,
    rankScore: detail.rankScore,
  });
}

function eventKeyFor(event: { date?: unknown; session?: unknown; eventTime?: unknown }): string | null {
  const date = text(event.date);
  const session = text(event.session);
  const eventTime = text(event.eventTime);
  return date && session && eventTime ? `${date}|${session}|${eventTime}` : null;
}

function sourceEvents(dir: string, targetKeys: Set<string>): Map<string, { files: string[]; events: Record<string, unknown>[] }> {
  const found = new Map<string, { files: string[]; events: Record<string, unknown>[] }>();
  for (const file of packageFiles(dir)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    } catch {
      continue;
    }
    const events = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as { events?: unknown }).events : null;
    if (!events || typeof events !== 'object' || Array.isArray(events)) continue;
    for (const event of Object.values(events)) {
      if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
      const id = eventKeyFor(event as { date?: unknown; session?: unknown; eventTime?: unknown });
      if (!id || !targetKeys.has(id)) continue;
      const existing = found.get(id) || { files: [], events: [] };
      existing.files.push(file);
      existing.events.push(event as Record<string, unknown>);
      found.set(id, existing);
    }
  }
  return found;
}

function scannerSummary(event: Record<string, unknown> | null): ChangedEventDrilldown['scannerSummary'] {
  const summary = event?.scannerSummary && typeof event.scannerSummary === 'object' && !Array.isArray(event.scannerSummary)
    ? event.scannerSummary as Record<string, unknown>
    : {};
  return {
    candidateCount: numberOrNull(summary.candidateCount),
    executableCount: numberOrNull(summary.executableCount),
    conditionalCount: numberOrNull(summary.conditionalCount),
    blockedCount: numberOrNull(summary.blockedCount),
    bestExecutableSetupType: text(summary.bestExecutableSetupType),
    bestConditionalSetupType: text(summary.bestConditionalSetupType),
  };
}

function candidateDetails(event: Record<string, unknown> | null, eventKey: string): CandidateDetail[] {
  const statuses = event?.setupCandidateStatus &&
    typeof event.setupCandidateStatus === 'object' &&
    !Array.isArray(event.setupCandidateStatus) &&
    Array.isArray((event.setupCandidateStatus as { statuses?: unknown }).statuses)
    ? (event.setupCandidateStatus as { statuses: unknown[] }).statuses
    : [];
  return statuses.map((status) => {
    const rough = candidateDetail(status, '');
    return rough ? { ...rough, candidateKey: detailKey(eventKey, rough) } : null;
  }).filter((item): item is CandidateDetail => Boolean(item));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Current Changed-Event Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only changed-event artifact drilldown. It does not install runtime ranking behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Changed events read: ${report.summary.changedEventsRead}.`,
    `- Changed events found in raw packages: ${report.summary.changedEventsFoundInRawPackages}.`,
    `- Scanner-owned selected-candidate field events: ${report.summary.scannerOwnedSelectedCandidateFieldEvents}.`,
    `- DeskTicket field events: ${report.summary.deskTicketFieldEvents}.`,
    `- Publish-decision field events: ${report.summary.publishDecisionFieldEvents}.`,
    `- Runtime-proposal-ready events: ${report.summary.runtimeProposalReadyEvents}.`,
    `- raidReclaim EntryTriggerMissing replacement events: ${report.summary.raidReclaimEntryTriggerMissingReplacementEvents}.`,
    `- canExecute changed events: ${report.summary.canExecuteChangedEvents}.`,
    `- Trade math changed events: ${report.summary.tradeMathChangedEvents}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Events',
    '| Date | Session | Time | Baseline | Replacement | Scanner Selected Fields | DeskTicket Fields | Ready |',
    '|---|---|---|---|---|---:|---:|---|',
    ...report.changedEvents.map((event) => `| ${event.tradeDate} | ${event.session} | ${event.eventTime} | ${event.baselineCandidate?.setupType || '-'} ${event.baselineCandidate?.blockReason || ''} | ${event.simulatedCandidate?.setupType || '-'} ${event.simulatedCandidate?.blockReason || ''} | ${event.scannerOwnedSelectedCandidateFields.length} | ${event.deskTicketFields.length} | ${event.runtimeProposalReady} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport(args: {
  selectionImpactSimulationPath: string | null;
  selectionImpactSimulationReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport | null;
  scannerPackageDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport {
  const inputEvents = args.selectionImpactSimulationReport?.changedEvents || [];
  const targets = new Set(inputEvents.map((event) => event.eventKey));
  const sources = sourceEvents(args.scannerPackageDir, targets);
  const changedEvents = inputEvents.map((event): ChangedEventDrilldown => {
    const source = sources.get(event.eventKey);
    const sourceEvent = source?.events[0] || null;
    const candidates = candidateDetails(sourceEvent, event.eventKey);
    const baselineCandidate = candidates.find((candidate) => candidate.candidateKey === event.baselineTopCandidateKey) || null;
    const simulatedCandidate = candidates.find((candidate) => candidate.candidateKey === event.simulatedTopCandidateKey) || null;
    const scannerOwnedSelectedCandidateFields = sourceEvent ? keyHits(sourceEvent, /selectedCandidate|selected_candidate|selectedSetup|selectedPlan|primaryDeskPlay/i) : [];
    const deskTicketFields = sourceEvent ? keyHits(sourceEvent, /deskTicket|DeskTicket|ticket/i) : [];
    const publishDecisionFields = sourceEvent ? keyHits(sourceEvent, /DeskPublishDecision|publishDecision|publish/i) : [];
    const runtimeReadinessBlockers = [
      !sourceEvent ? 'changed event not found in current raw scanner packages' : null,
      scannerOwnedSelectedCandidateFields.length === 0 ? 'scanner-owned selected-candidate fields are absent from raw package event' : null,
      deskTicketFields.length === 0 ? 'DeskTicket fields are absent from raw package event' : null,
      publishDecisionFields.length === 0 ? 'DeskPublishDecision fields are absent from raw package event' : null,
      event.tradeMathChanged ? 'top trade math changes when exact invalid-stop Sweep row is excluded' : null,
    ].filter((item): item is string => Boolean(item));
    return {
      eventKey: event.eventKey,
      tradeDate: event.tradeDate,
      session: event.session,
      eventTime: event.eventTime,
      sourceFiles: source?.files || [],
      sourceEventFound: Boolean(sourceEvent),
      candidateRows: candidates.length,
      scannerSummary: scannerSummary(sourceEvent),
      scannerOwnedSelectedCandidateFields,
      deskTicketFields,
      publishDecisionFields,
      baselineCandidate,
      simulatedCandidate,
      topReplacementIsraidReclaimEntryTriggerMissing: simulatedCandidate?.setupType === 'raidReclaim' &&
        simulatedCandidate.blockReason === 'EntryTriggerMissing',
      canExecuteChanged: event.canExecuteChanged,
      tradeMathChanged: event.tradeMathChanged,
      runtimeProposalReady: runtimeReadinessBlockers.length === 0,
      runtimeReadinessBlockers,
    };
  });
  const blockers = [
    !args.selectionImpactSimulationPath ? 'missing selection impact simulation path' : null,
    !args.selectionImpactSimulationReport ? 'missing selection impact simulation report' : null,
    inputEvents.length === 0 ? 'selection impact simulation has no changed events' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_changed_event_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
    },
    source: {
      selectionImpactSimulationPath: args.selectionImpactSimulationPath,
      scannerPackageDir: args.scannerPackageDir,
    },
    assumptions: {
      changedEventsOnly: true,
      validatesArtifactCoverageOnly: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedEventsRead: inputEvents.length,
      changedEventsFoundInRawPackages: changedEvents.filter((event) => event.sourceEventFound).length,
      scannerOwnedSelectedCandidateFieldEvents: changedEvents.filter((event) => event.scannerOwnedSelectedCandidateFields.length > 0).length,
      deskTicketFieldEvents: changedEvents.filter((event) => event.deskTicketFields.length > 0).length,
      publishDecisionFieldEvents: changedEvents.filter((event) => event.publishDecisionFields.length > 0).length,
      runtimeProposalReadyEvents: changedEvents.filter((event) => event.runtimeProposalReady).length,
      raidReclaimEntryTriggerMissingReplacementEvents: changedEvents.filter((event) => event.topReplacementIsraidReclaimEntryTriggerMissing).length,
      canExecuteChangedEvents: changedEvents.filter((event) => event.canExecuteChanged).length,
      tradeMathChangedEvents: changedEvents.filter((event) => event.tradeMathChanged).length,
      runtimeInstallAllowed: false,
      recommendation: blockers.length ? 'fix_missing_input_reports' : 'needs_scanner_owned_selection_artifact_join',
    },
    changedEvents,
    blockers,
    recommendations: [
      'Keep the exact invalid-stop Sweep evidence research-only until a scanner-owned selected-candidate or DeskTicket artifact is joined.',
      'Do not install a runtime primary-selection exclusion from raw rankScore simulation alone because all changed events alter top trade math.',
      'Build the next join against scanner-owned selected-candidate, DeskTicket, or DeskPublishDecision artifacts before proposing any live-facing behavior change.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-current-changed-event-drilldown-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-current-changed-event-drilldown-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport({
    selectionImpactSimulationPath: options.selectionImpactSimulationPath,
    selectionImpactSimulationReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport>(options.selectionImpactSimulationPath),
    scannerPackageDir: options.scannerPackageDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentChangedEventDrilldownReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
