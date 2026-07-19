import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type {
  UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport,
} from './unified-positive-held-local-preview-ready-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  sourceSelectionReports: string[];
  outDir: string;
  json: boolean;
}

interface Authority {
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
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

interface MinedEventRow {
  sourceSelectionReport: string;
  replayPackagePath: string | null;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  openingDriveOneMesPl: number | null;
  priorityOneMesPl: number | null;
  installedDeltaOneMesPl: number | null;
  priorityUnderperformed: boolean;
  priorityBetter: boolean;
  priorityEntry: number | null;
  priorityStop: number | null;
  priorityRiskPoints: number;
  proofBarTime: string | null;
  proofBarRangeR: number | null;
  proofBarBodyDirection: 'bullish' | 'bearish' | 'doji' | 'missing';
  proofBarCloseThroughEntry: boolean | null;
  firstReplayBarTime: string | null;
  firstReplayAdverseR: number | null;
  firstReplayFavorableR: number | null;
  firstReplayCloseThroughEntry: boolean | null;
  firstReplayCloseAdverse: boolean | null;
  immediateFeatureTags: string[];
  blockers: string[];
}

interface FeatureRow {
  featureTag: string;
  rows: number;
  priorityUnderperformanceRows: number;
  priorityBetterRows: number;
  priorityEqualRows: number;
  falseRejectPriorityBetterRows: number;
  separatorType: 'candidate_no_lookahead' | 'mixed' | 'not_separator';
  liveInitialRankInstallableNow: false;
}

type ReplayPackageRowWithPath = UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport['rows'][number] & {
  replayPackagePath: string;
};

export interface RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    sourceSelectionReports: string[];
  };
  assumptions: {
    consumesSavedSourceSelectionReportsOnly: true;
    consumesSavedSameBarReportsOnly: true;
    consumesSavedReplayPackageAndTapeOnly: true;
    usesCompletedFiveMinuteBarsOnly: true;
    noFutureOutcomeLabelsUsedForFeatureTags: true;
    firstReplayBarFeaturesArePostEntryResearchOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    eventRows: number;
    rowsWithTapeFeatures: number;
    priorityUnderperformanceRows: number;
    priorityBetterRows: number;
    candidateFeatureRows: number;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'validate_no_lookahead_feature_on_fresh_rows' | 'continue_observation' | 'fix_inputs';
  };
  featureRows: FeatureRow[];
  rows: MinedEventRow[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function matchingFiles(reportDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerArgs(
  args = process.argv.slice(2),
): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceSelectionReports = splitPaths(readFlag(args, '--source-selection-reports'));
  return {
    sourceSelectionReports: sourceSelectionReports.length
      ? sourceSelectionReports
      : matchingFiles(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
}

function authority(): Authority {
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = numberOrNull(record.open);
  const high = numberOrNull(record.high);
  const low = numberOrNull(record.low);
  const close = numberOrNull(record.close);
  const volume = numberOrNull(record.volume);
  if (!time || open === null || high === null || low === null || close === null) return null;
  return { time, open, high, low, close, volume };
}

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function bodyDirection(bar: OhlcBar | null): MinedEventRow['proofBarBodyDirection'] {
  if (!bar) return 'missing';
  if (bar.close > bar.open) return 'bullish';
  if (bar.close < bar.open) return 'bearish';
  return 'doji';
}

function directionFrom(value: string): Direction {
  return value === 'SHORT' ? 'SHORT' : 'LONG';
}

function closeThroughEntry(direction: Direction, bar: OhlcBar | null, entry: number | null): boolean | null {
  if (!bar || entry === null) return null;
  return direction === 'LONG' ? bar.close >= entry : bar.close <= entry;
}

function adverseMove(direction: Direction, bar: OhlcBar | null, entry: number | null): number | null {
  if (!bar || entry === null) return null;
  return direction === 'LONG' ? Math.max(0, entry - bar.low) : Math.max(0, bar.high - entry);
}

function favorableMove(direction: Direction, bar: OhlcBar | null, entry: number | null): number | null {
  if (!bar || entry === null) return null;
  return direction === 'LONG' ? Math.max(0, bar.high - entry) : Math.max(0, entry - bar.low);
}

function toR(points: number | null, riskPoints: number): number | null {
  return points === null || riskPoints <= 0 ? null : round(points / riskPoints);
}

function loadTapeBars(sourceTapePath: string | null | undefined): OhlcBar[] {
  if (!sourceTapePath || !fs.existsSync(sourceTapePath)) return [];
  const tape = readJson<Record<string, unknown>>(sourceTapePath);
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function samebarRowsByTicket(reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[]): Map<string, RawOhlcScannerArtifactSameBarSeparatorRow> {
  return new Map(reports.flatMap((report) => report.rows || []).map((row) => [row.ticketId, row]));
}

function loadReplayPackageRows(outcomeReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[]): Map<string, ReplayPackageRowWithPath> {
  const replayPackagePaths = [...new Set(outcomeReports.map((report) => report.source.replayPackageOutcomePath).filter((item): item is string => Boolean(item)))]
    .map((outcomePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(outcomePath).source.replayPackagePath)
    .filter((item): item is string => Boolean(item));
  const rows = replayPackagePaths.flatMap((replayPackagePath) => {
    const report = readJson<UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport>(replayPackagePath);
    return report.rows.map((row) => ({ ...row, replayPackagePath }));
  });
  return new Map(rows.map((row) => [row.ticketId, row]));
}

function immediateFeatureTags(args: {
  direction: Direction;
  proofBar: OhlcBar | null;
  firstReplayBar: OhlcBar | null;
  entry: number | null;
  proofBarCloseThroughEntry: boolean | null;
  firstReplayCloseThroughEntry: boolean | null;
  firstReplayCloseAdverse: boolean | null;
  proofBarRangeR: number | null;
  firstReplayAdverseR: number | null;
  firstReplayFavorableR: number | null;
}): string[] {
  const tags = [
    args.proofBar ? `proof_bar_${bodyDirection(args.proofBar)}` : 'missing_proof_bar',
    args.proofBarCloseThroughEntry === false ? 'proof_bar_failed_close_through_entry' : null,
    args.proofBarCloseThroughEntry === true ? 'proof_bar_closed_through_entry' : null,
    args.proofBarRangeR !== null && args.proofBarRangeR >= 0.5 ? 'proof_bar_range_ge_0_5r' : null,
    args.proofBarRangeR !== null && args.proofBarRangeR >= 1 ? 'proof_bar_range_ge_1r' : null,
    args.firstReplayBar ? `first_replay_bar_${bodyDirection(args.firstReplayBar)}` : 'missing_first_replay_bar',
    args.firstReplayCloseThroughEntry === false ? 'first_replay_failed_close_through_entry' : null,
    args.firstReplayCloseThroughEntry === true ? 'first_replay_closed_through_entry' : null,
    args.firstReplayCloseAdverse === true ? 'first_replay_close_adverse' : null,
    args.firstReplayAdverseR !== null && args.firstReplayAdverseR >= 0.25 ? 'first_replay_adverse_ge_0_25r' : null,
    args.firstReplayAdverseR !== null && args.firstReplayAdverseR >= 0.5 ? 'first_replay_adverse_ge_0_5r' : null,
    args.firstReplayFavorableR !== null && args.firstReplayFavorableR >= 0.25 ? 'first_replay_favorable_ge_0_25r' : null,
    args.firstReplayFavorableR !== null && args.firstReplayFavorableR >= 0.5 ? 'first_replay_favorable_ge_0_5r' : null,
  ].filter((tag): tag is string => Boolean(tag));
  return tags.length ? tags : ['no_immediate_feature'];
}

function buildRows(loadedReports: Array<{
  path: string;
  report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}>): MinedEventRow[] {
  return loadedReports.flatMap((loaded) => {
    const byTicket = samebarRowsByTicket(loaded.samebarReports);
    const replayPackageRows = loadReplayPackageRows(loaded.samebarReports);
    return loaded.report.rows.flatMap((row) => {
      if (!row.installedSelectedPriority) return [];
      const openingDrive = byTicket.get(row.openingDriveTicketId);
      const priority = byTicket.get(row.priorityTicketId);
      const priorityReplay = replayPackageRows.get(row.priorityTicketId);
      if (!openingDrive || !priority) return [];
      const direction = directionFrom(row.direction);
      const entry = numberOrNull(priorityReplay?.entry);
      const stop = numberOrNull(priorityReplay?.stop);
      const riskPoints = priorityReplay?.riskPoints || priority.riskPoints;
      const bars = loadTapeBars(priorityReplay?.sourceTapePath);
      const proofTime = normalizeTime(priorityReplay?.proofTime) || priority.proofTime;
      const proofBar = bars.find((bar) => bar.time === proofTime) || null;
      const firstReplayBar = priority.firstReplayBarTime
        ? bars.find((bar) => bar.time === priority.firstReplayBarTime) || null
        : null;
      const proofBarCloseThroughEntry = closeThroughEntry(direction, proofBar, entry);
      const firstReplayCloseThroughEntry = closeThroughEntry(direction, firstReplayBar, entry);
      const firstReplayCloseAdverse = firstReplayBar && entry !== null
        ? direction === 'LONG' ? firstReplayBar.close < entry : firstReplayBar.close > entry
        : null;
      const proofBarRangeR = proofBar && riskPoints > 0 ? round((proofBar.high - proofBar.low) / riskPoints) : null;
      const firstReplayAdverseR = toR(adverseMove(direction, firstReplayBar, entry), riskPoints);
      const firstReplayFavorableR = toR(favorableMove(direction, firstReplayBar, entry), riskPoints);
      const installedDeltaOneMesPl = typeof row.deltaOneMesPl === 'number' ? row.deltaOneMesPl : null;
      const blockers = [
        !priorityReplay ? 'missing replay package row for priority ticket' : null,
        priorityReplay && !priorityReplay.sourceTapePath ? 'missing source tape path' : null,
        priorityReplay && bars.length === 0 ? 'missing completed 5M tape bars' : null,
        priorityReplay && !proofBar ? 'missing proof bar in tape' : null,
      ].filter((item): item is string => Boolean(item));
      return [{
        sourceSelectionReport: loaded.path,
        replayPackagePath: priorityReplay?.replayPackagePath || null,
        tradeDate: row.tradeDate,
        session: row.session,
        proofTime,
        direction: row.direction,
        prioritySetupType: row.prioritySetupType,
        openingDriveTicketId: row.openingDriveTicketId,
        priorityTicketId: row.priorityTicketId,
        openingDriveOneMesPl: openingDrive.resolvedOneMesPl,
        priorityOneMesPl: priority.resolvedOneMesPl,
        installedDeltaOneMesPl,
        priorityUnderperformed: typeof installedDeltaOneMesPl === 'number' && installedDeltaOneMesPl < 0,
        priorityBetter: typeof installedDeltaOneMesPl === 'number' && installedDeltaOneMesPl > 0,
        priorityEntry: entry,
        priorityStop: stop,
        priorityRiskPoints: riskPoints,
        proofBarTime: proofBar?.time || null,
        proofBarRangeR,
        proofBarBodyDirection: bodyDirection(proofBar),
        proofBarCloseThroughEntry,
        firstReplayBarTime: firstReplayBar?.time || null,
        firstReplayAdverseR,
        firstReplayFavorableR,
        firstReplayCloseThroughEntry,
        firstReplayCloseAdverse,
        immediateFeatureTags: immediateFeatureTags({
          direction,
          proofBar,
          firstReplayBar,
          entry,
          proofBarCloseThroughEntry,
          firstReplayCloseThroughEntry,
          firstReplayCloseAdverse,
          proofBarRangeR,
          firstReplayAdverseR,
          firstReplayFavorableR,
        }),
        blockers,
      }];
    });
  });
}

function buildFeatureRows(rows: MinedEventRow[]): FeatureRow[] {
  const tags = [...new Set(rows.flatMap((row) => row.immediateFeatureTags))].sort();
  return tags.map((featureTag) => {
    const matching = rows.filter((row) => row.immediateFeatureTags.includes(featureTag));
    const priorityUnderperformanceRows = matching.filter((row) => row.priorityUnderperformed).length;
    const priorityBetterRows = matching.filter((row) => row.priorityBetter).length;
    const priorityEqualRows = matching.length - priorityUnderperformanceRows - priorityBetterRows;
    const separatorType: FeatureRow['separatorType'] = priorityUnderperformanceRows > 0 && priorityBetterRows === 0
      ? 'candidate_no_lookahead'
      : priorityUnderperformanceRows > 0 ? 'mixed' : 'not_separator';
    return {
      featureTag,
      rows: matching.length,
      priorityUnderperformanceRows,
      priorityBetterRows,
      priorityEqualRows,
      falseRejectPriorityBetterRows: priorityBetterRows,
      separatorType,
      liveInitialRankInstallableNow: false as const,
    };
  }).sort((a, b) => b.priorityUnderperformanceRows - a.priorityUnderperformanceRows || a.priorityBetterRows - b.priorityBetterRows || a.featureTag.localeCompare(b.featureTag));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority No-Lookahead Feature Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only no-lookahead feature miner. It consumes saved source-selection, same-bar, replay package, and scanner decision tape artifacts only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Event rows: ${report.summary.eventRows}.`,
    `- Rows with tape features: ${report.summary.rowsWithTapeFeatures}.`,
    `- Priority better / underperformed rows: ${report.summary.priorityBetterRows}/${report.summary.priorityUnderperformanceRows}.`,
    `- Candidate no-lookahead feature rows: ${report.summary.candidateFeatureRows}.`,
    `- Live initial-rank feature rows: ${report.summary.liveInitialRankFeatureRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Feature Rows',
    ...report.featureRows.map((row) => `- ${row.featureTag}: rows ${row.rows}, underperformed/better/equal ${row.priorityUnderperformanceRows}/${row.priorityBetterRows}/${row.priorityEqualRows}, type ${row.separatorType}, liveInitialRankInstallableNow ${row.liveInitialRankInstallableNow}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport(args: {
  sourceSelectionReports: string[];
  loadedReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
    samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport {
  const rows = buildRows(args.loadedReports);
  const featureRows = buildFeatureRows(rows);
  const blockers = [
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
    args.loadedReports.some((loaded) => loaded.report.status !== 'pass') ? 'one or more source-selection reports did not pass' : null,
    args.loadedReports.some((loaded) => loaded.samebarReports.some((report) => report.status !== 'pass')) ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no installed priority rows with matching same-bar rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const candidateFeatureRows = featureRows.filter((row) => row.separatorType === 'candidate_no_lookahead').length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : candidateFeatureRows > 0
      ? 'validate_no_lookahead_feature_on_fresh_rows'
      : 'continue_observation';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { sourceSelectionReports: args.sourceSelectionReports },
    assumptions: {
      consumesSavedSourceSelectionReportsOnly: true,
      consumesSavedSameBarReportsOnly: true,
      consumesSavedReplayPackageAndTapeOnly: true,
      usesCompletedFiveMinuteBarsOnly: true,
      noFutureOutcomeLabelsUsedForFeatureTags: true,
      firstReplayBarFeaturesArePostEntryResearchOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      eventRows: rows.length,
      rowsWithTapeFeatures: rows.filter((row) => row.blockers.length === 0).length,
      priorityUnderperformanceRows: rows.filter((row) => row.priorityUnderperformed).length,
      priorityBetterRows: rows.filter((row) => row.priorityBetter).length,
      candidateFeatureRows,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    featureRows,
    rows,
    blockers,
    recommendations: recommendation === 'validate_no_lookahead_feature_on_fresh_rows'
      ? [
        'Candidate no-lookahead features exist in saved rows, but they remain research-only until validated on fresh scanner artifacts.',
        'Do not install for live initial ranking because first-replay-bar features are only known after the proof/entry bar completes.',
      ]
      : recommendation === 'continue_observation'
        ? ['No no-lookahead separator emerged from saved rows; continue collecting fresh observations.']
        : ['Fix source inputs before interpreting no-lookahead feature output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function loadSourceSelectionReport(filePath: string) {
  const report = readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(filePath);
  return {
    path: filePath,
    report,
    samebarReports: report.source.samebarReports.map((samebarPath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(samebarPath)),
  };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport({
    sourceSelectionReports: options.sourceSelectionReports,
    loadedReports: options.sourceSelectionReports.map(loadSourceSelectionReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, featureRows: report.featureRows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
