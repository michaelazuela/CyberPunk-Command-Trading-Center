import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  strictReplayPackage: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

interface CandidateRecord {
  setupType?: string;
  direction?: string;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  riskPoints?: number | null;
  executionStatus?: string | null;
  detectedStatus?: string | null;
  blockReason?: string | null;
  canExecute?: boolean | null;
}

interface CandidateSummary {
  setupType: string;
  direction: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  executionStatus: string | null;
  detectedStatus: string | null;
  blockReason: string | null;
  geometryState: 'complete_valid' | 'complete_invalid' | 'placeholder_or_missing' | 'unsupported_direction';
}

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  snapshotId: string | null;
  blockedReplayEntry: number;
  blockedReplayStop: number;
  blockedReplayT1: number;
  blockedReplayT2: number;
  strictBlockers: string[];
  matchingCandidates: CandidateSummary[];
  validSameSetupSameDirectionCandidates: number;
  validSameSetupOppositeDirectionCandidates: number;
  validDifferentSetupSameDirectionCandidates: number;
  validExecutableCandidates: number;
  likelyCause:
    | 'matching_side_missing_levels'
    | 'matching_side_invalid_entry_stop'
    | 'valid_opposite_or_alternate_candidate_exists'
    | 'snapshot_missing_matching_candidate'
    | 'needs_manual_snapshot_inspection';
  recommendation: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_strict_blocker_drilldown';
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
    auditDir: string;
  };
  assumptions: {
    readsSavedStrictPackageAndSnapshotsOnly: true;
    blockedRowsAreNotRepaired: true;
    livePromotionAllowed: false;
  };
  summary: {
    blockedRows: number;
    matchingSideMissingLevelsRows: number;
    matchingSideInvalidEntryStopRows: number;
    validOppositeOrAlternateCandidateRows: number;
    missingMatchingCandidateRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'inspect_matching_side_level_generation'
      | 'inspect_candidate_selection_mapping'
      | 'no_blocked_rows'
      | 'fix_inputs';
  };
  rows: DrilldownRow[];
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
  const strictReplayPackage = readFlag(args, '--strict-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-replay-package-\d+\.json$/);
  if (!strictReplayPackage) throw new Error('--strict-replay-package is required.');
  return {
    strictReplayPackage: path.resolve(strictReplayPackage),
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

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function finitePositive(value: number | null): boolean {
  return value !== null && value > 0;
}

function geometryState(candidate: CandidateRecord): CandidateSummary['geometryState'] {
  const direction = candidate.direction;
  const entry = numberOrNull(candidate.entry);
  const stop = numberOrNull(candidate.stop);
  const target1 = numberOrNull(candidate.target1);
  const target2 = numberOrNull(candidate.target2);
  if (direction !== 'LONG' && direction !== 'SHORT') return 'unsupported_direction';
  if (!finitePositive(entry) || !finitePositive(stop) || !finitePositive(target1) || !finitePositive(target2)) return 'placeholder_or_missing';
  const valid = direction === 'LONG' ? stop < entry : stop > entry;
  return valid ? 'complete_valid' : 'complete_invalid';
}

function summarizeCandidate(candidate: CandidateRecord): CandidateSummary {
  return {
    setupType: typeof candidate.setupType === 'string' ? candidate.setupType : 'UNKNOWN',
    direction: typeof candidate.direction === 'string' ? candidate.direction : 'UNKNOWN',
    entry: numberOrNull(candidate.entry),
    stop: numberOrNull(candidate.stop),
    target1: numberOrNull(candidate.target1),
    target2: numberOrNull(candidate.target2),
    executionStatus: typeof candidate.executionStatus === 'string' ? candidate.executionStatus : null,
    detectedStatus: typeof candidate.detectedStatus === 'string' ? candidate.detectedStatus : null,
    blockReason: typeof candidate.blockReason === 'string' ? candidate.blockReason : null,
    geometryState: geometryState(candidate),
  };
}

function snapshotPath(auditDir: string, snapshotId: string): string {
  return path.join(auditDir, `${snapshotId}.json`);
}

function snapshotIdFromTicket(ticketId: string): string | null {
  const parts = ticketId.split('|');
  return parts[parts.length - 1] || null;
}

function candidatesFromSnapshot(auditDir: string, snapshotId: string | null): CandidateSummary[] {
  if (!snapshotId) return [];
  const file = snapshotPath(auditDir, snapshotId);
  if (!fs.existsSync(file)) return [];
  const root = asRecord(readJson<unknown>(file));
  const normalizedPlan = asRecord(root.normalizedPlan);
  const candidates = Array.isArray(normalizedPlan.setupCandidates) ? normalizedPlan.setupCandidates as CandidateRecord[] : [];
  return candidates.map(summarizeCandidate);
}

function isValid(candidate: CandidateSummary): boolean {
  return candidate.geometryState === 'complete_valid';
}

function likelyCause(args: {
  matchingCandidates: CandidateSummary[];
  validSameSetupOppositeDirectionCandidates: number;
  validDifferentSetupSameDirectionCandidates: number;
  strictBlockers: string[];
}): DrilldownRow['likelyCause'] {
  if (args.matchingCandidates.length === 0) return 'snapshot_missing_matching_candidate';
  if (args.matchingCandidates.some((candidate) => candidate.geometryState === 'complete_invalid')) return 'matching_side_invalid_entry_stop';
  if (args.matchingCandidates.some((candidate) => candidate.geometryState === 'placeholder_or_missing')) return 'matching_side_missing_levels';
  if (args.validSameSetupOppositeDirectionCandidates > 0 || args.validDifferentSetupSameDirectionCandidates > 0) return 'valid_opposite_or_alternate_candidate_exists';
  if (args.strictBlockers.some((blocker) => blocker.includes('directionally invalid'))) return 'matching_side_invalid_entry_stop';
  return 'needs_manual_snapshot_inspection';
}

function recommendation(cause: DrilldownRow['likelyCause']): string {
  if (cause === 'matching_side_missing_levels') return 'Inspect why the matching setup/direction produced placeholder levels before using it for replacement ranking.';
  if (cause === 'matching_side_invalid_entry_stop') return 'Inspect protected-stop selection for the matching setup/direction before using it for replacement ranking.';
  if (cause === 'valid_opposite_or_alternate_candidate_exists') return 'Treat the row as candidate-selection conflict research, not model-quality proof.';
  if (cause === 'snapshot_missing_matching_candidate') return 'Regenerate or inspect the source package mapping; the ticket points to a snapshot without the expected candidate.';
  return 'Manually inspect saved snapshot fields before proposing any live-facing selector behavior.';
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport['authority'] {
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

function buildRow(row: UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number], auditDir: string): DrilldownRow {
  const snapshotId = snapshotIdFromTicket(row.ticketId);
  const candidates = candidatesFromSnapshot(auditDir, snapshotId);
  const matchingCandidates = candidates.filter((candidate) => candidate.setupType === row.setupType && candidate.direction === row.direction);
  const validSameSetupSameDirectionCandidates = matchingCandidates.filter(isValid).length;
  const validSameSetupOppositeDirectionCandidates = candidates.filter((candidate) => candidate.setupType === row.setupType && candidate.direction !== row.direction && isValid(candidate)).length;
  const validDifferentSetupSameDirectionCandidates = candidates.filter((candidate) => candidate.setupType !== row.setupType && candidate.direction === row.direction && isValid(candidate)).length;
  const validExecutableCandidates = candidates.filter((candidate) => candidate.executionStatus === 'Executable' && isValid(candidate)).length;
  const cause = likelyCause({
    matchingCandidates,
    validSameSetupOppositeDirectionCandidates,
    validDifferentSetupSameDirectionCandidates,
    strictBlockers: row.blockers,
  });
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    snapshotId,
    blockedReplayEntry: row.entry,
    blockedReplayStop: row.stop,
    blockedReplayT1: row.t1,
    blockedReplayT2: row.t2,
    strictBlockers: row.blockers,
    matchingCandidates,
    validSameSetupSameDirectionCandidates,
    validSameSetupOppositeDirectionCandidates,
    validDifferentSetupSameDirectionCandidates,
    validExecutableCandidates,
    likelyCause: cause,
    recommendation: recommendation(cause),
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Missing Strict Blocker Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only strict blocker drilldown. It consumes a saved strict replay package and saved scanner snapshots only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Matching-side missing-level rows: ${report.summary.matchingSideMissingLevelsRows}.`,
    `- Matching-side invalid entry/stop rows: ${report.summary.matchingSideInvalidEntryStopRows}.`,
    `- Valid opposite/alternate candidate rows: ${report.summary.validOppositeOrAlternateCandidateRows}.`,
    `- Missing matching candidate rows: ${report.summary.missingMatchingCandidateRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Blockers | Matching Candidates | Valid Same Setup Opposite | Valid Alt Same Side | Executable Valid | Likely Cause |',
    '|---|---|---:|---:|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.strictBlockers.join(', ') || '-'} | ${row.matchingCandidates.length} | ${row.validSameSetupOppositeDirectionCandidates} | ${row.validDifferentSetupSameDirectionCandidates} | ${row.validExecutableCandidates} | ${row.likelyCause} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport(args: {
  strictReplayPackagePath: string | null;
  strictReplayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport {
  const rows = (args.strictReplayPackage?.rows || [])
    .filter((row) => row.outcomeInputStatus === 'blocked')
    .map((row) => buildRow(row, args.auditDir));
  const blockers = [
    !args.strictReplayPackagePath ? 'missing strict replay package path' : null,
    !args.strictReplayPackage ? 'missing strict replay package report' : null,
    args.strictReplayPackage && args.strictReplayPackage.summary.livePromotionAllowedRows !== 0 ? `strict package has ${args.strictReplayPackage.summary.livePromotionAllowedRows} live-promotion rows` : null,
  ].filter((item): item is string => Boolean(item));
  const matchingSideMissingLevelsRows = rows.filter((row) => row.likelyCause === 'matching_side_missing_levels').length;
  const matchingSideInvalidEntryStopRows = rows.filter((row) => row.likelyCause === 'matching_side_invalid_entry_stop').length;
  const validOppositeOrAlternateCandidateRows = rows.filter((row) =>
    row.validSameSetupOppositeDirectionCandidates > 0 || row.validDifferentSetupSameDirectionCandidates > 0
  ).length;
  const missingMatchingCandidateRows = rows.filter((row) => row.likelyCause === 'snapshot_missing_matching_candidate').length;
  const recommendationValue = blockers.length ? 'fix_inputs'
    : rows.length === 0 ? 'no_blocked_rows'
      : matchingSideMissingLevelsRows > 0 || matchingSideInvalidEntryStopRows > 0 ? 'inspect_matching_side_level_generation'
        : 'inspect_candidate_selection_mapping';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_strict_blocker_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      strictReplayPackagePath: args.strictReplayPackagePath,
      auditDir: args.auditDir,
    },
    assumptions: {
      readsSavedStrictPackageAndSnapshotsOnly: true,
      blockedRowsAreNotRepaired: true,
      livePromotionAllowed: false,
    },
    summary: {
      blockedRows: rows.length,
      matchingSideMissingLevelsRows,
      matchingSideInvalidEntryStopRows,
      validOppositeOrAlternateCandidateRows,
      missingMatchingCandidateRows,
      livePromotionAllowedRows: 0,
      recommendation: recommendationValue,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix or provide the saved strict replay package before using this drilldown.']
      : rows.length === 0
        ? ['No blocked strict rows remain in this package.']
        : ['Inspect matching-side level generation before treating blocked rows as raidReclaim or Sweep model-quality evidence.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport({
    strictReplayPackagePath: options.strictReplayPackage,
    strictReplayPackage: fs.existsSync(options.strictReplayPackage)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(options.strictReplayPackage)
      : null,
    auditDir: options.auditDir,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, rows: report.rows }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
