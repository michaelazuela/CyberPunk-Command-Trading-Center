import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown';

interface CliOptions {
  blockerDrilldown: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

interface MatchingPathRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  snapshotId: string | null;
  executionStatus: string | null;
  detectedStatus: string | null;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  requiredTrigger: string | null;
  nextAction: string | null;
  missingEvidence: string[];
  evidence: string[];
  activeRulesetBlockers: string[];
  decisionQualityHardBlocker: string | null;
  pathState:
    | 'waiting_for_entry_trigger'
    | 'invalidated_without_replayable_entry'
    | 'missing_target_geometry_after_trigger'
    | 'unclassified_missing_geometry'
    | 'missing_matching_candidate';
  replayUse:
    | 'do_not_replay_until_fresh_entry'
    | 'do_not_replay_stale_invalidated_plan'
    | 'inspect_target_generation'
    | 'manual_inspection_required';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_level_generation_path_diagnostic';
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
    reportDir: string;
    blockerDrilldownPath: string | null;
    auditDir: string;
  };
  assumptions: {
    readsSavedBlockerDrilldownAndSnapshotsOnly: true;
    levelGenerationPathOnly: true;
    noRowsRepaired: true;
    livePromotionAllowed: false;
  };
  summary: {
    rows: number;
    waitingForEntryTriggerRows: number;
    invalidatedWithoutReplayableEntryRows: number;
    missingTargetGeometryAfterTriggerRows: number;
    unclassifiedRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'keep_blocked_until_fresh_entry_or_valid_stop'
      | 'inspect_target_generation'
      | 'manual_snapshot_inspection'
      | 'fix_inputs';
  };
  rows: MatchingPathRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');

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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const blockerDrilldown = readFlag(args, '--blocker-drilldown') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown-\d+\.json$/);
  if (!blockerDrilldown) throw new Error('--blocker-drilldown is required.');
  return {
    blockerDrilldown: path.resolve(blockerDrilldown),
    auditDir: path.resolve(readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function snapshotPath(auditDir: string, snapshotId: string): string {
  return path.join(auditDir, `${snapshotId}.json`);
}

function matchingCandidate(args: {
  auditDir: string;
  snapshotId: string | null;
  setupType: string;
  direction: string;
}): Record<string, unknown> | null {
  if (!args.snapshotId) return null;
  const file = snapshotPath(args.auditDir, args.snapshotId);
  if (!fs.existsSync(file)) return null;
  const root = asRecord(readJson<unknown>(file));
  const candidates = asRecord(root.normalizedPlan).setupCandidates;
  if (!Array.isArray(candidates)) return null;
  return candidates
    .map(asRecord)
    .find((candidate) => candidate.setupType === args.setupType && candidate.direction === args.direction) || null;
}

function activeRulesetBlockers(candidate: Record<string, unknown>): string[] {
  const activeRuleset = asRecord(candidate.activeRuleset);
  return Object.values(activeRuleset).flatMap((ruleset) => stringArray(asRecord(ruleset).blockers));
}

function hasPositiveLevel(value: unknown): boolean {
  const numberValue = numberOrNull(value);
  return numberValue !== null && numberValue > 0;
}

function classify(candidate: Record<string, unknown> | null): Pick<MatchingPathRow, 'pathState' | 'replayUse'> {
  if (!candidate) {
    return { pathState: 'missing_matching_candidate', replayUse: 'manual_inspection_required' };
  }
  const blockReason = stringOrNull(candidate.blockReason);
  const hasEntry = hasPositiveLevel(candidate.entry);
  const hasTargets = hasPositiveLevel(candidate.target1) && hasPositiveLevel(candidate.target2);
  if (blockReason === 'InvalidStopLocation') {
    return { pathState: 'invalidated_without_replayable_entry', replayUse: 'do_not_replay_stale_invalidated_plan' };
  }
  if (blockReason === 'EntryTriggerMissing' && !hasEntry) {
    return { pathState: 'waiting_for_entry_trigger', replayUse: 'do_not_replay_until_fresh_entry' };
  }
  if (hasEntry && !hasTargets) {
    return { pathState: 'missing_target_geometry_after_trigger', replayUse: 'inspect_target_generation' };
  }
  return { pathState: 'unclassified_missing_geometry', replayUse: 'manual_inspection_required' };
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport['authority'] {
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

function buildRow(args: {
  drilldownRow: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport['rows'][number];
  auditDir: string;
}): MatchingPathRow {
  const candidate = matchingCandidate({
    auditDir: args.auditDir,
    snapshotId: args.drilldownRow.snapshotId,
    setupType: args.drilldownRow.setupType,
    direction: args.drilldownRow.direction,
  });
  const classification = classify(candidate);
  return {
    ticketId: args.drilldownRow.ticketId,
    tradeDate: args.drilldownRow.tradeDate,
    session: args.drilldownRow.session,
    setupType: args.drilldownRow.setupType,
    direction: args.drilldownRow.direction,
    snapshotId: args.drilldownRow.snapshotId,
    executionStatus: candidate ? stringOrNull(candidate.executionStatus) : null,
    detectedStatus: candidate ? stringOrNull(candidate.detectedStatus) : null,
    blockReason: candidate ? stringOrNull(candidate.blockReason) : null,
    entry: candidate ? numberOrNull(candidate.entry) : null,
    stop: candidate ? numberOrNull(candidate.stop) : null,
    target1: candidate ? numberOrNull(candidate.target1) : null,
    target2: candidate ? numberOrNull(candidate.target2) : null,
    requiredTrigger: candidate ? stringOrNull(candidate.requiredTrigger) : null,
    nextAction: candidate ? stringOrNull(candidate.nextAction) : null,
    missingEvidence: candidate ? stringArray(candidate.missingEvidence) : [],
    evidence: candidate ? stringArray(candidate.evidence) : [],
    activeRulesetBlockers: candidate ? activeRulesetBlockers(candidate) : [],
    decisionQualityHardBlocker: candidate ? stringOrNull(candidate.decisionQualityHardBlocker) : null,
    ...classification,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Missing Level-Generation Path Diagnostic',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only level-generation path diagnostic. It consumes saved blocker drilldown and saved scanner snapshots only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, repair rows, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Rows: ${report.summary.rows}.`,
    `- Waiting-for-entry-trigger rows: ${report.summary.waitingForEntryTriggerRows}.`,
    `- Invalidated-without-replayable-entry rows: ${report.summary.invalidatedWithoutReplayableEntryRows}.`,
    `- Missing-target-geometry-after-trigger rows: ${report.summary.missingTargetGeometryAfterTriggerRows}.`,
    `- Unclassified rows: ${report.summary.unclassifiedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Block Reason | Entry | Stop | T1 | T2 | Path State | Replay Use |',
    '|---|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.blockReason ?? '-'} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} | ${row.pathState} | ${row.replayUse} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport(args: {
  blockerDrilldownPath: string | null;
  blockerDrilldown: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport {
  const rows = (args.blockerDrilldown?.rows || []).map((row) => buildRow({ drilldownRow: row, auditDir: args.auditDir }));
  const blockers = [
    !args.blockerDrilldownPath ? 'missing blocker drilldown path' : null,
    !args.blockerDrilldown ? 'missing blocker drilldown report' : null,
    args.blockerDrilldown && args.blockerDrilldown.status !== 'pass' ? `blocker drilldown status ${args.blockerDrilldown.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const waitingForEntryTriggerRows = rows.filter((row) => row.pathState === 'waiting_for_entry_trigger').length;
  const invalidatedWithoutReplayableEntryRows = rows.filter((row) => row.pathState === 'invalidated_without_replayable_entry').length;
  const missingTargetGeometryAfterTriggerRows = rows.filter((row) => row.pathState === 'missing_target_geometry_after_trigger').length;
  const unclassifiedRows = rows.filter((row) => row.pathState === 'unclassified_missing_geometry' || row.pathState === 'missing_matching_candidate').length;
  const recommendationValue = blockers.length ? 'fix_inputs'
    : missingTargetGeometryAfterTriggerRows > 0 ? 'inspect_target_generation'
      : unclassifiedRows > 0 ? 'manual_snapshot_inspection'
        : 'keep_blocked_until_fresh_entry_or_valid_stop';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_level_generation_path_diagnostic',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      blockerDrilldownPath: args.blockerDrilldownPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      readsSavedBlockerDrilldownAndSnapshotsOnly: true,
      levelGenerationPathOnly: true,
      noRowsRepaired: true,
      livePromotionAllowed: false,
    },
    summary: {
      rows: rows.length,
      waitingForEntryTriggerRows,
      invalidatedWithoutReplayableEntryRows,
      missingTargetGeometryAfterTriggerRows,
      unclassifiedRows,
      livePromotionAllowedRows: 0,
      recommendation: recommendationValue,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved blocker drilldown input before using this diagnostic.']
      : ['Keep these blocked rows out of replay/ranking until a fresh entry trigger or valid protected stop exists in saved deterministic fields.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-level-generation-path-diagnostic-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport({
    blockerDrilldownPath: options.blockerDrilldown,
    blockerDrilldown: fs.existsSync(options.blockerDrilldown)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport>(options.blockerDrilldown)
      : null,
    auditDir: options.auditDir,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, rows: report.rows }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
