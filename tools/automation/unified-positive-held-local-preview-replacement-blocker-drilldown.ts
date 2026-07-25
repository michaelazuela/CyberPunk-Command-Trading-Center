import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport,
} from './unified-positive-held-local-preview-raidReclaim-extreme-risk-companion-filter';

type InstalledRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];
type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];
type OutcomeRow = UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number];

interface ReplacementRow {
  ticketId: string;
  slateId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  candidateBookState: string | null;
  executionStatus: string | null;
  blockReason: string | null;
  installedScore: number | null;
  outcomeBucket: string;
  outcomeLabel: string | null;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  entryHitTime: string | null;
  barsAfterProof: number | null;
  blockers: string[];
  geometryValid: boolean | null;
  replacementViable: boolean;
  failureClass:
    | 'directionally_invalid_entry_stop_geometry'
    | 'not_human_review_state'
    | 'blocked_or_missing_timing'
    | 'missing_outcome_row'
    | 'viable_replacement';
}

export interface UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport {
  reportType: 'unified_positive_held_local_preview_replacement_blocker_drilldown';
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
    companionFilterPath: string | null;
    installedScoreComparisonPath: string | null;
    sourceProofTimingPath: string | null;
    replayPackageOutcomePath: string | null;
  };
  assumptions: {
    researchOnly: true;
    readsSavedDiagnosticsOnly: true;
    replacementMustBeHumanReviewAndGeometryValid: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    changedSlateReplacementRows: number;
    viableReplacementRows: number;
    directionallyInvalidGeometryRows: number;
    notHumanReviewStateRows: number;
    blockedOrMissingTimingRows: number;
    missingOutcomeRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'fix_replacement_geometry_source_before_rank_changes'
      | 'fresh_validate_viable_replacements'
      | 'reject_missing_source';
  };
  rows: ReplacementRow[];
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport['authority'] {
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

function geometryValid(direction: string, entry: number | null, stop: number | null): boolean | null {
  if (entry === null || stop === null) return null;
  if (direction === 'LONG') return stop < entry;
  if (direction === 'SHORT') return stop > entry;
  return null;
}

function isHumanReview(row: InstalledRow | undefined): boolean {
  return row?.canExecute === false &&
    row.candidateBookState === 'human_review' &&
    row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending' &&
    row.entryPreserved &&
    row.stopPreserved &&
    row.target1Preserved &&
    row.target2Preserved &&
    row.riskPreserved;
}

function failureClass(args: {
  installed: InstalledRow | undefined;
  timing: TimingRow | undefined;
  outcome: OutcomeRow | undefined;
  geometry: boolean | null;
}): ReplacementRow['failureClass'] {
  if (!args.outcome) return 'missing_outcome_row';
  if (args.geometry === false) return 'directionally_invalid_entry_stop_geometry';
  if (!isHumanReview(args.installed)) return 'not_human_review_state';
  if (!args.timing || args.timing.outcomeBucket === 'blocked') return 'blocked_or_missing_timing';
  return 'viable_replacement';
}

function buildRows(args: {
  companion: UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport | null;
  installed: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
  timing: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}): ReplacementRow[] {
  const installedByTicket = new Map((args.installed?.rows || []).map((row) => [row.ticketId, row]));
  const timingByTicket = new Map((args.timing?.rows || []).map((row) => [row.ticketId, row]));
  const outcomeByTicket = new Map((args.outcome?.rows || []).map((row) => [row.ticketId, row]));
  const replacementTicketIds = [...new Set((args.companion?.changedSlates || []).map((row) => row.topAfterTicketId))];
  return replacementTicketIds.map((ticketId) => {
    const installed = installedByTicket.get(ticketId);
    const timing = timingByTicket.get(ticketId);
    const outcome = outcomeByTicket.get(ticketId);
    const direction = installed?.direction || timing?.direction || outcome?.direction || 'unknown';
    const geometry = geometryValid(direction, outcome?.entry ?? null, outcome?.stop ?? null);
    const cls = failureClass({ installed, timing, outcome, geometry });
    return {
      ticketId,
      slateId: installed ? `${installed.tradeDate}|${installed.session}` : timing ? `${timing.tradeDate}|${timing.session}` : 'unknown',
      tradeDate: installed?.tradeDate || timing?.tradeDate || outcome?.tradeDate || 'unknown',
      session: installed?.session || timing?.session || outcome?.session || 'unknown',
      setupType: installed?.setupType || timing?.setupType || outcome?.setupType || 'unknown',
      direction,
      candidateBookState: installed?.candidateBookState || null,
      executionStatus: installed?.executionStatus || null,
      blockReason: installed?.blockReason || null,
      installedScore: installed?.installedScore ?? null,
      outcomeBucket: timing?.outcomeBucket ?? 'missing_timing',
      outcomeLabel: outcome?.outcomeLabel || timing?.outcomeLabel || null,
      entry: outcome?.entry ?? null,
      stop: outcome?.stop ?? null,
      riskPoints: outcome?.riskPoints ?? timing?.riskPoints ?? null,
      proofTime: outcome?.proofTime ?? timing?.proofTime ?? null,
      entryHitTime: outcome?.entryHitTime ?? timing?.entryHitTime ?? null,
      barsAfterProof: outcome?.barsAfterProof ?? null,
      blockers: outcome?.blockers || [],
      geometryValid: geometry,
      replacementViable: cls === 'viable_replacement',
      failureClass: cls,
    };
  }).sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.ticketId.localeCompare(b.ticketId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Replacement Blocker Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replacement autopsy. It reads saved diagnostics only and does not install ranking behavior, remove models, hard-block setups, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Replacement rows: ${report.summary.changedSlateReplacementRows}.`,
    `- Viable replacements: ${report.summary.viableReplacementRows}.`,
    `- Directionally invalid geometry rows: ${report.summary.directionallyInvalidGeometryRows}.`,
    `- Not human-review state rows: ${report.summary.notHumanReviewStateRows}.`,
    `- Blocked/missing timing rows: ${report.summary.blockedOrMissingTimingRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | State | Outcome | Entry | Stop | Risk | Geometry | Failure |',
    '|---|---|---|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.candidateBookState ?? '-'} / ${row.executionStatus ?? '-'} / ${row.blockReason ?? '-'} | ${row.outcomeBucket} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.riskPoints ?? '-'} | ${row.geometryValid ?? '-'} | ${row.failureClass} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport(args: {
  reportDir: string;
  companionFilterPath: string | null;
  companionFilterReport: UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport | null;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  replayPackageOutcomePath: string | null;
  replayPackageOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport {
  const rows = buildRows({
    companion: args.companionFilterReport,
    installed: args.installedScoreComparisonReport,
    timing: args.sourceProofTimingReport,
    outcome: args.replayPackageOutcomeReport,
  });
  const blockers = [
    !args.companionFilterPath ? 'missing companion-filter path' : null,
    !args.companionFilterReport ? 'missing companion-filter report' : null,
    args.companionFilterReport && args.companionFilterReport.status !== 'pass' ? `companion-filter status ${args.companionFilterReport.status}` : null,
    !args.installedScoreComparisonPath ? 'missing installed-score comparison path' : null,
    !args.installedScoreComparisonReport ? 'missing installed-score comparison report' : null,
    args.installedScoreComparisonReport && args.installedScoreComparisonReport.status !== 'pass' ? `installed-score comparison status ${args.installedScoreComparisonReport.status}` : null,
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.replayPackageOutcomePath ? 'missing replay-package outcome path' : null,
    !args.replayPackageOutcomeReport ? 'missing replay-package outcome report' : null,
    rows.length === 0 ? 'no replacement rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const directionallyInvalidGeometryRows = rows.filter((row) => row.failureClass === 'directionally_invalid_entry_stop_geometry').length;
  const notHumanReviewStateRows = rows.filter((row) => row.failureClass === 'not_human_review_state').length;
  const blockedOrMissingTimingRows = rows.filter((row) => row.failureClass === 'blocked_or_missing_timing').length;
  const missingOutcomeRows = rows.filter((row) => row.failureClass === 'missing_outcome_row').length;
  const viableReplacementRows = rows.filter((row) => row.replacementViable).length;
  const recommendation = blockers.length ? 'reject_missing_source'
    : directionallyInvalidGeometryRows > 0 ? 'fix_replacement_geometry_source_before_rank_changes'
      : viableReplacementRows > 0 ? 'fresh_validate_viable_replacements'
        : 'fix_replacement_geometry_source_before_rank_changes';
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replacement_blocker_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      companionFilterPath: args.companionFilterPath,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
      sourceProofTimingPath: args.sourceProofTimingPath,
      replayPackageOutcomePath: args.replayPackageOutcomePath,
    },
    assumptions: {
      researchOnly: true,
      readsSavedDiagnosticsOnly: true,
      replacementMustBeHumanReviewAndGeometryValid: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      changedSlateReplacementRows: rows.length,
      viableReplacementRows,
      directionallyInvalidGeometryRows,
      notHumanReviewStateRows,
      blockedOrMissingTimingRows,
      missingOutcomeRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use replacement blocker drilldown until all source reports are present.']
      : directionallyInvalidGeometryRows > 0
        ? [
          'Do not use these replacement rows as rank-improvement proof.',
          'Investigate why Sweep/FVG replacement candidates carry directionally invalid entry/stop geometry before any ranking change.',
        ]
        : ['Fresh-validate viable replacements on regenerated replay artifacts before any scanner-visible ranking proposal.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-replacement-blocker-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const companionFilterPath = readFlag(args, '--companion-filter') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-raidReclaim-extreme-risk-companion-filter-\d+\.json$/);
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const replayPackageOutcomePath = readFlag(args, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport({
    reportDir: outDir,
    companionFilterPath,
    companionFilterReport: companionFilterPath && fs.existsSync(companionFilterPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport>(companionFilterPath)
      : null,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    replayPackageOutcomePath,
    replayPackageOutcomeReport: replayPackageOutcomePath && fs.existsSync(replayPackageOutcomePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(replayPackageOutcomePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, rows: report.rows }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewReplacementBlockerDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
