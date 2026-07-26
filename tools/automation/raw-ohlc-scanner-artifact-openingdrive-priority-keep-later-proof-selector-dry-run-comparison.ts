import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-carveout-adjusted-readiness';

interface CliOptions {
  strictReplayPackage: string;
  outcome: string;
  adjustedReadiness: string;
  outDir: string;
  json: boolean;
}

type StrictReplayRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number];

interface DryRunSlate {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTicketId: string | null;
  baselineSetupType: string | null;
  baselineSelectorDecision: string | null;
  baselineScore: number | null;
  proposedTicketId: string | null;
  proposedSetupType: string | null;
  proposedSelectorDecision: string | null;
  proposedScore: number | null;
  selectedCandidateChanged: boolean;
  changeReason: string | null;
  proposedStrictReadySourceProofPositive: boolean;
  proposedDeterministicLevelsValid: boolean;
  proposedOutcomeLabel: string | null;
  proposedOneMesPl: number | null;
  livePromotionAllowed: false;
}

interface ChangedPnlRow {
  tradeDate: string;
  session: string;
  setupType: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedRows: number;
  grossResolvedOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_dry_run_comparison';
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
    strictReplayPackagePath: string | null;
    outcomePath: string | null;
    adjustedReadinessPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    baselineIsHighestSavedStrictReadyScoreByDateSession: true;
    proposedSelectorScope: 'NoInstalledSetup_keep_later_sweep_proof_only';
    noLiveSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    slates: number;
    strictReplayRows: number;
    sweepScopeRows: number;
    changedSlates: number;
    unchangedSlates: number;
    changedRowsWithOutcomeEvidence: number;
    changedRowsGrossResolvedOneMesPl: number | null;
    invalidProposedRows: number;
    nonSweepChangedRows: number;
    missingOutcomeRows: number;
    blockedCarveoutRowsRemain: number;
    proposalGuardRecommendation: string | null;
    shouldPostRows: 0;
    publishDiscordRows: 0;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'dry_run_supports_sweep_only_guarded_selector_research'
      | 'dry_run_neutral_keep_research_only'
      | 'reject_dry_run';
  };
  changedPnlByDaySessionModel: ChangedPnlRow[];
  slates: DryRunSlate[];
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const strictReplayPackage = readFlag(args, '--strict-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-replay-package-\d+\.json$/);
  const outcome = readFlag(args, '--outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  const adjustedReadiness = readFlag(args, '--adjusted-readiness') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-carveout-adjusted-readiness-\d+\.json$/);
  if (!strictReplayPackage) throw new Error('--strict-replay-package is required.');
  if (!outcome) throw new Error('--outcome is required.');
  if (!adjustedReadiness) throw new Error('--adjusted-readiness is required.');
  return {
    strictReplayPackage: path.resolve(strictReplayPackage),
    outcome: path.resolve(outcome),
    adjustedReadiness: path.resolve(adjustedReadiness),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport['authority'] {
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

function selectorDecision(ticketId: string): string | null {
  const parts = ticketId.split('|');
  return parts.length >= 5 ? parts[4] : null;
}

function slateKey(row: Pick<StrictReplayRow, 'tradeDate' | 'session'>): string {
  return `${row.tradeDate}|${row.session}`;
}

function baselineScore(row: StrictReplayRow): number {
  return row.triageScore;
}

function proposedScore(row: StrictReplayRow): number {
  return row.triageScore + (selectorDecision(row.ticketId) === 'keep_later_sweep_proof' ? 25 : 0);
}

function deterministicLevelsValid(row: StrictReplayRow): boolean {
  const levels = [row.entry, row.stop, row.t1, row.t2, row.riskPoints];
  if (!levels.every((value) => Number.isFinite(value) && value > 0)) return false;
  return row.direction === 'LONG' ? row.stop < row.entry && row.t1 > row.entry && row.t2 > row.entry : row.stop > row.entry && row.t1 < row.entry && row.t2 < row.entry;
}

function isSweepScope(row: StrictReplayRow): boolean {
  return row.setupType === 'NoInstalledSetup' &&
    selectorDecision(row.ticketId) === 'keep_later_sweep_proof' &&
    row.outcomeInputStatus === 'ready_for_read_only_outcome_replay' &&
    row.proofState.includes('keep_later_sweep_proof') &&
    row.barsSource === 'scanner_decision_tape_completed_5m' &&
    row.barsAfterProof > 0 &&
    deterministicLevelsValid(row);
}

function outcomeByTicket(outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null): Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow> {
  return new Map((outcome?.rows || []).map((row) => [row.ticketId, row]));
}

function pickTop(rows: StrictReplayRow[], scoreFn: (row: StrictReplayRow) => number): StrictReplayRow | null {
  return [...rows].sort((a, b) => scoreFn(b) - scoreFn(a) || a.ticketId.localeCompare(b.ticketId))[0] || null;
}

function buildSlates(args: {
  strictReplayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}): DryRunSlate[] {
  const outcomeMap = outcomeByTicket(args.outcome);
  const groups = new Map<string, StrictReplayRow[]>();
  for (const row of args.strictReplayPackage?.rows || []) {
    groups.set(slateKey(row), [...(groups.get(slateKey(row)) || []), row]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, rows]) => {
    const baseline = pickTop(rows, baselineScore);
    const proposed = pickTop(rows.filter(isSweepScope), proposedScore) || baseline;
    const proposedOutcome = proposed ? outcomeMap.get(proposed.ticketId) || null : null;
    const selectedCandidateChanged = Boolean(baseline && proposed && baseline.ticketId !== proposed.ticketId);
    const proposedStrictReadySourceProofPositive = Boolean(proposed && isSweepScope(proposed));
    const proposedDeterministicLevelsValid = Boolean(proposed && deterministicLevelsValid(proposed));
    return {
      slateId: id,
      tradeDate: rows[0]?.tradeDate || 'unknown',
      session: rows[0]?.session || 'unknown',
      rows: rows.length,
      baselineTicketId: baseline?.ticketId || null,
      baselineSetupType: baseline?.setupType || null,
      baselineSelectorDecision: baseline ? selectorDecision(baseline.ticketId) : null,
      baselineScore: baseline ? baselineScore(baseline) : null,
      proposedTicketId: proposed?.ticketId || null,
      proposedSetupType: proposed?.setupType || null,
      proposedSelectorDecision: proposed ? selectorDecision(proposed.ticketId) : null,
      proposedScore: proposed ? proposedScore(proposed) : null,
      selectedCandidateChanged,
      changeReason: selectedCandidateChanged ? 'NoInstalledSetup keep-later-proof candidate outranks baseline within saved strict-ready slate.' : null,
      proposedStrictReadySourceProofPositive,
      proposedDeterministicLevelsValid,
      proposedOutcomeLabel: proposedOutcome?.outcomeLabel || null,
      proposedOneMesPl: proposedOutcome?.resolvedOneMesPl ?? null,
      livePromotionAllowed: false,
    };
  });
}

function changedPnl(slates: DryRunSlate[]): ChangedPnlRow[] {
  const grouped = new Map<string, DryRunSlate[]>();
  for (const slate of slates.filter((row) => row.selectedCandidateChanged)) {
    const key = `${slate.tradeDate}|${slate.session}|${slate.proposedSetupType || 'UNKNOWN'}`;
    grouped.set(key, [...(grouped.get(key) || []), slate]);
  }
  return [...grouped.entries()].map(([key, rows]) => {
    const [tradeDate, session, setupType] = key.split('|');
    const resolved = rows.filter((row) => row.proposedOneMesPl !== null);
    return {
      tradeDate,
      session,
      setupType,
      rows: rows.length,
      resolvedRows: resolved.length,
      unresolvedRows: rows.length - resolved.length,
      blockedRows: 0,
      grossResolvedOneMesPl: resolved.length ? round(resolved.reduce((sum, row) => sum + (row.proposedOneMesPl || 0), 0)) : null,
    };
  }).sort((a, b) => `${a.tradeDate}-${a.session}-${a.setupType}`.localeCompare(`${b.tradeDate}-${b.session}-${b.setupType}`));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Dry-Run Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only dry-run comparison. It consumes saved reports only and does not install selector behavior, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Slates: ${report.summary.slates}.`,
    `- Strict replay rows: ${report.summary.strictReplayRows}.`,
    `- Sweep scope rows: ${report.summary.sweepScopeRows}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Changed rows with outcome evidence: ${report.summary.changedRowsWithOutcomeEvidence}.`,
    `- Changed rows gross one-MES P/L: ${report.summary.changedRowsGrossResolvedOneMesPl ?? 'not available'}.`,
    `- Invalid proposed rows: ${report.summary.invalidProposedRows}.`,
    `- Non-Sweep changed rows: ${report.summary.nonSweepChangedRows}.`,
    `- Missing outcome rows: ${report.summary.missingOutcomeRows}.`,
    `- Blocked carveout rows remain: ${report.summary.blockedCarveoutRowsRemain}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed P/L By Day / Session / Model',
    '| Date | Session | Setup | Rows | Resolved | Unresolved | Blocked | Gross One-MES P/L |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.changedPnlByDaySessionModel.map((row) => `| ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.blockedRows} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Changed Slates',
    '| Slate | Baseline | Proposed | Proposed Outcome | Proposed P/L | Reason |',
    '|---|---|---|---|---:|---|',
    ...report.slates.filter((row) => row.selectedCandidateChanged).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.baselineTicketId || '-')} | ${escapeTable(row.proposedTicketId || '-')} | ${row.proposedOutcomeLabel || '-'} | ${row.proposedOneMesPl ?? '-'} | ${escapeTable(row.changeReason || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport(args: {
  strictReplayPackagePath: string | null;
  strictReplayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  outcomePath: string | null;
  outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
  adjustedReadinessPath: string | null;
  adjustedReadiness: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport {
  const slates = buildSlates({ strictReplayPackage: args.strictReplayPackage, outcome: args.outcome });
  const changed = slates.filter((row) => row.selectedCandidateChanged);
  const pnlRows = changedPnl(slates);
  const sweepScopeRows = (args.strictReplayPackage?.rows || []).filter(isSweepScope).length;
  const missingOutcomeRows = changed.filter((row) => row.proposedOutcomeLabel === null).length;
  const invalidProposedRows = changed.filter((row) => !row.proposedStrictReadySourceProofPositive || !row.proposedDeterministicLevelsValid).length;
  const nonSweepChangedRows = changed.filter((row) => row.proposedSetupType !== 'NoInstalledSetup').length;
  const blockedCarveoutRowsRemain = args.adjustedReadiness?.summary.adjustedBlockedRowsExcluded || args.adjustedReadiness?.summary.blockedRowsExcluded || 0;
  const grossChanged = pnlRows
    .map((row) => row.grossResolvedOneMesPl)
    .filter((value): value is number => value !== null)
    .reduce((sum, value) => sum + value, 0);
  const blockers = [
    !args.strictReplayPackagePath ? 'missing strict replay package path' : null,
    !args.strictReplayPackage ? 'missing strict replay package report' : null,
    args.strictReplayPackage && args.strictReplayPackage.status !== 'pass' ? `strict replay package status ${args.strictReplayPackage.status}` : null,
    !args.outcomePath ? 'missing outcome path' : null,
    !args.outcome ? 'missing outcome report' : null,
    args.outcome && args.outcome.status !== 'pass' ? `outcome status ${args.outcome.status}` : null,
    !args.adjustedReadinessPath ? 'missing adjusted readiness path' : null,
    !args.adjustedReadiness ? 'missing adjusted readiness report' : null,
    args.adjustedReadiness && args.adjustedReadiness.status !== 'pass' ? `adjusted readiness status ${args.adjustedReadiness.status}` : null,
    args.adjustedReadiness && args.adjustedReadiness.summary.recommendation !== 'prepare_sweep_only_guarded_proposal' ? `adjusted readiness recommendation is ${args.adjustedReadiness.summary.recommendation}` : null,
    blockedCarveoutRowsRemain > 0 ? `${blockedCarveoutRowsRemain} blocked carveout rows remain` : null,
    sweepScopeRows === 0 ? 'no NoInstalledSetup keep-later-proof strict-ready rows found' : null,
    invalidProposedRows > 0 ? `${invalidProposedRows} changed proposed rows failed strict/source/level validation` : null,
    nonSweepChangedRows > 0 ? `${nonSweepChangedRows} changed proposed rows are not NoInstalledSetup` : null,
    missingOutcomeRows > 0 ? `${missingOutcomeRows} changed proposed rows lack outcome evidence` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length ? 'reject_dry_run'
    : changed.length > 0 ? 'dry_run_supports_sweep_only_guarded_selector_research'
      : 'dry_run_neutral_keep_research_only';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_dry_run_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      strictReplayPackagePath: args.strictReplayPackagePath,
      outcomePath: args.outcomePath,
      adjustedReadinessPath: args.adjustedReadinessPath,
    },
    assumptions: {
      savedReportsOnly: true,
      baselineIsHighestSavedStrictReadyScoreByDateSession: true,
      proposedSelectorScope: 'NoInstalledSetup_keep_later_sweep_proof_only',
      noLiveSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      slates: slates.length,
      strictReplayRows: args.strictReplayPackage?.rows.length || 0,
      sweepScopeRows,
      changedSlates: changed.length,
      unchangedSlates: slates.length - changed.length,
      changedRowsWithOutcomeEvidence: changed.length - missingOutcomeRows,
      changedRowsGrossResolvedOneMesPl: grossChanged ? round(grossChanged) : null,
      invalidProposedRows,
      nonSweepChangedRows,
      missingOutcomeRows,
      blockedCarveoutRowsRemain,
      proposalGuardRecommendation: args.adjustedReadiness?.summary.recommendation || null,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    changedPnlByDaySessionModel: pnlRows,
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Do not draft or install selector behavior until dry-run blockers are cleared.']
      : recommendation === 'dry_run_supports_sweep_only_guarded_selector_research'
        ? ['Dry-run supports a separate guarded Sweep-only selector implementation proposal, still requiring explicit approval before runtime changes.']
        : ['Dry-run is neutral; keep the selector research-only and broaden evidence before runtime changes.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport({
    strictReplayPackagePath: options.strictReplayPackage,
    strictReplayPackage: fs.existsSync(options.strictReplayPackage) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(options.strictReplayPackage) : null,
    outcomePath: options.outcome,
    outcome: fs.existsSync(options.outcome) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.outcome) : null,
    adjustedReadinessPath: options.adjustedReadiness,
    adjustedReadiness: fs.existsSync(options.adjustedReadiness) ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorCarveoutAdjustedReadinessReport>(options.adjustedReadiness) : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
