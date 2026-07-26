import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepSnapshotFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-snapshot-field-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

type Direction = 'LONG' | 'SHORT';

interface CliOptions {
  snapshotMinerReport: string;
  scannerArtifacts: string[];
  outcomeReports: string[];
  boostPoints: number;
  outDir: string;
  json: boolean;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandidateShape {
  setupType?: string;
  direction?: string;
  detectedStatus?: string;
  executionStatus?: string;
  blockReason?: string | null;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  rankScore?: number;
  missingEvidence?: string[];
  activeRuleset?: {
    htfLineInSand?: {
      status?: string;
      obstacleType?: string | null;
      obstacleSource?: string | null;
    };
  };
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  completed5m?: OhlcBar;
  setupCandidateStatus?: {
    statuses?: CandidateShape[];
  };
}

interface ArtifactShape {
  reportType?: string;
  events?: Record<string, ArtifactEventShape>;
}

interface OverlayRow {
  slateId: string;
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  baselineScore: number;
  overlayScore: number;
  baselineRank: number;
  overlayRank: number;
  completeDeterministicLevels: boolean;
  validatedCompositeMatch: boolean;
  overlayBoostApplied: boolean;
  matchedSegmentKind: string | null;
  matchedSegmentKey: string | null;
  outcomeStatus: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  scannerVisibleEligible: false;
}

interface OverlaySlate {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopSetupType: string | null;
  baselineTopOneMesPl: number | null;
  overlayTopTicketId: string | null;
  overlayTopSetupType: string | null;
  overlayTopOneMesPl: number | null;
  topChanged: boolean;
  changedToValidatedCompositeSweep: boolean;
  changedFromKnownWinner: boolean;
  deltaOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_dry_run';
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
    snapshotMinerReportPath: string;
    scannerArtifactPaths: string[];
    outcomeReportPaths: string[];
  };
  assumptions: {
    savedArtifactsOnly: true;
    overlayDryRunOnly: true;
    outcomeUsedForEvaluationOnly: true;
    incompleteMatchesAreNotBoosted: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  scoring: {
    validatedCompositeSweepBoostPoints: number;
    baselineScoreSource: 'scanner_candidate_rankScore';
  };
  summary: {
    scannerArtifacts: number;
    outcomeReports: number;
    candidateRows: number;
    slates: number;
    validatedCompositeRows: number;
    incompleteCompositeMatchesNotBoosted: number;
    overlayBoostRows: number;
    changedSlates: number;
    changedToValidatedCompositeSweepSlates: number;
    changedFromKnownWinnerSlates: number;
    baselineTopOneMesPl: number | null;
    overlayTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    missingOutcomeTopRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_live_proposal_with_promotion_disabled' | 'keep_research_only' | 'reject_overlay_for_now' | 'fix_inputs';
  };
  rows: OverlayRow[];
  slates: OverlaySlate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP_TYPE = 'NoInstalledSetup';
const DEFAULT_BOOST_POINTS = 25;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlayDryRunArgs(args = process.argv.slice(2)): CliOptions {
  const snapshotMinerReport = readFlag(args, '--snapshot-miner-report');
  if (!snapshotMinerReport) throw new Error('--snapshot-miner-report is required.');
  const boostPoints = Number(readFlag(args, '--boost-points') || DEFAULT_BOOST_POINTS);
  return {
    snapshotMinerReport,
    scannerArtifacts: splitPaths(readFlag(args, '--scanner-artifacts')),
    outcomeReports: splitPaths(readFlag(args, '--outcome-reports')),
    boostPoints: Number.isFinite(boostPoints) ? boostPoints : DEFAULT_BOOST_POINTS,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function eventTime(eventKey: string, event: ArtifactEventShape): string {
  return normalizeTime(event.eventTime) || normalizeTime(eventKey) || eventKey;
}

function validDirection(value: unknown): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function ticketId(event: ArtifactEventShape, candidate: CandidateShape, proofTime: string): string {
  return [
    event.date || proofTime.slice(0, 10),
    event.session || 'unknown',
    candidate.setupType || 'UnknownSetup',
    candidate.direction || 'UNKNOWN',
    proofTime.replace(/[^0-9T]/g, '').slice(0, 15),
  ].join('-');
}

function candleDirection(bar: OhlcBar): string {
  if (bar.close > bar.open) return 'bullish_close';
  if (bar.close < bar.open) return 'bearish_close';
  return 'doji_close';
}

function candleCloseLocation(bar: OhlcBar): string {
  const range = Math.max(bar.high - bar.low, 0);
  if (range <= 0) return 'close_location_unknown';
  const location = (bar.close - bar.low) / range;
  if (location >= 0.75) return 'close_upper_quartile';
  if (location <= 0.25) return 'close_lower_quartile';
  return 'close_middle_half';
}

function rankBucket(value: unknown): string {
  const rank = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(rank)) return 'rank_unknown';
  if (rank < 120) return 'rank_lt_120';
  if (rank < 180) return 'rank_120_to_179';
  if (rank < 240) return 'rank_180_to_239';
  return 'rank_gte_240';
}

function missingTagList(values: string[] | undefined): string[] {
  const text = (values || []).join(' | ').toLowerCase();
  return [
    text.includes('opposing completed 5m') ? 'opposing_5m_mss' : null,
    text.includes('no chase') ? 'no_chase_line_in_sand' : null,
    text.includes('nearest obstacle sits before') ? 'obstacle_before_1r' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function candidateSegments(event: ArtifactEventShape, candidate: CandidateShape, bar: OhlcBar): Array<{ kind: string; key: string }> {
  const sessionDirection = `${event.session || 'unknown'}|${candidate.direction}`;
  const candleShape = `${candleDirection(bar)}|${candleCloseLocation(bar)}`;
  const htfLineStatus = candidate.activeRuleset?.htfLineInSand?.status || 'htf_line_unknown';
  const htfLineObstacle = `${candidate.activeRuleset?.htfLineInSand?.obstacleSource || 'obstacle_source_unknown'}:${candidate.activeRuleset?.htfLineInSand?.obstacleType || 'obstacle_type_unknown'}`;
  const htfLine = `${htfLineStatus}|${htfLineObstacle}`;
  return [
    { kind: 'session_direction_candle_rank', key: `${sessionDirection}|${candleShape}|${rankBucket(candidate.rankScore)}` },
    ...missingTagList(candidate.missingEvidence).map((tag) => ({
      kind: 'session_direction_htf_line_missing',
      key: `${sessionDirection}|${htfLine}|${tag}`,
    })),
  ];
}

function hasDirectionallyValidEntryStop(direction: Direction, entry: number, stop: number): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function completeDeterministicLevels(candidate: CandidateShape, direction: Direction): boolean {
  const entry = numberOrNull(candidate.entry);
  const stop = numberOrNull(candidate.stop);
  const t1 = numberOrNull(candidate.target1);
  const t2 = numberOrNull(candidate.target2);
  return entry !== null && stop !== null && t1 !== null && t2 !== null && hasDirectionallyValidEntryStop(direction, entry, stop);
}

function selectorSet(report: RawOhlcScannerArtifactSweepSnapshotFieldMinerReport | null): Set<string> {
  return new Set((report?.zeroLossTransferSegments || []).map((segment) => `${segment.kind}:${segment.key}`));
}

function outcomeById(reports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[]): Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number]> {
  return new Map(reports.flatMap((report) => report.rows || []).map((row) => [row.ticketId, row]));
}

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport['authority'] {
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

function buildRows(args: {
  artifacts: ArtifactShape[];
  selectors: Set<string>;
  outcomes: Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number]>;
  boostPoints: number;
}): { rows: OverlayRow[]; incompleteCompositeMatchesNotBoosted: number } {
  const rows: OverlayRow[] = [];
  let incompleteCompositeMatchesNotBoosted = 0;
  for (const artifact of args.artifacts) {
    for (const [eventKey, event] of Object.entries(artifact.events || {})) {
      const bar = event.completed5m;
      if (!bar) continue;
      const proofTime = eventTime(eventKey, event);
      const slateId = `${event.date || proofTime.slice(0, 10)}|${event.session || 'unknown'}|${proofTime}`;
      for (const candidate of event.setupCandidateStatus?.statuses || []) {
        const direction = validDirection(candidate.direction);
        if (!direction) continue;
        const id = ticketId(event, candidate, proofTime);
        const segments = candidateSegments(event, candidate, bar);
        const matched = segments.find((segment) => args.selectors.has(`${segment.kind}:${segment.key}`)) || null;
        const complete = completeDeterministicLevels(candidate, direction);
        const validatedCompositeMatch = candidate.setupType === SETUP_TYPE && Boolean(matched);
        if (validatedCompositeMatch && !complete) incompleteCompositeMatchesNotBoosted += 1;
        const boost = validatedCompositeMatch && complete ? args.boostPoints : 0;
        const baselineScore = numberOrNull(candidate.rankScore) ?? 0;
        const outcome = args.outcomes.get(id);
        rows.push({
          slateId,
          ticketId: id,
          tradeDate: event.date || proofTime.slice(0, 10),
          session: event.session || 'unknown',
          setupType: candidate.setupType || 'UnknownSetup',
          direction,
          baselineScore,
          overlayScore: round(baselineScore + boost),
          baselineRank: 0,
          overlayRank: 0,
          completeDeterministicLevels: complete,
          validatedCompositeMatch,
          overlayBoostApplied: boost > 0,
          matchedSegmentKind: matched?.kind || null,
          matchedSegmentKey: matched?.key || null,
          outcomeStatus: outcome?.outcomeStatus || 'missing',
          outcomeLabel: outcome?.outcomeLabel || 'missing',
          resolvedOneMesPl: outcome?.resolvedOneMesPl ?? null,
          scannerVisibleEligible: false,
        });
      }
    }
  }
  return { rows, incompleteCompositeMatchesNotBoosted };
}

function compareRows(a: OverlayRow, b: OverlayRow, scoreKey: 'baselineScore' | 'overlayScore'): number {
  return b[scoreKey] - a[scoreKey] ||
    Number(b.completeDeterministicLevels) - Number(a.completeDeterministicLevels) ||
    Number(b.validatedCompositeMatch) - Number(a.validatedCompositeMatch) ||
    a.ticketId.localeCompare(b.ticketId);
}

function buildSlates(rows: OverlayRow[]): { rows: OverlayRow[]; slates: OverlaySlate[] } {
  const groups = new Map<string, OverlayRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.slateId);
    if (existing) existing.push(row);
    else groups.set(row.slateId, [row]);
  }
  const rankedRows: OverlayRow[] = [];
  const slates: OverlaySlate[] = [];
  for (const [slateId, slateRows] of groups) {
    const baseline = [...slateRows].sort((a, b) => compareRows(a, b, 'baselineScore'));
    const overlay = [...slateRows].sort((a, b) => compareRows(a, b, 'overlayScore'));
    baseline.forEach((row, index) => { row.baselineRank = index + 1; });
    overlay.forEach((row, index) => { row.overlayRank = index + 1; });
    rankedRows.push(...slateRows);
    const baselineTop = baseline[0] || null;
    const overlayTop = overlay[0] || null;
    const topChanged = baselineTop?.ticketId !== overlayTop?.ticketId;
    const delta = baselineTop && overlayTop && baselineTop.resolvedOneMesPl !== null && overlayTop.resolvedOneMesPl !== null
      ? round(overlayTop.resolvedOneMesPl - baselineTop.resolvedOneMesPl)
      : null;
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      baselineTopTicketId: baselineTop?.ticketId || null,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopOneMesPl: baselineTop?.resolvedOneMesPl ?? null,
      overlayTopTicketId: overlayTop?.ticketId || null,
      overlayTopSetupType: overlayTop?.setupType || null,
      overlayTopOneMesPl: overlayTop?.resolvedOneMesPl ?? null,
      topChanged,
      changedToValidatedCompositeSweep: topChanged && Boolean(overlayTop?.validatedCompositeMatch),
      changedFromKnownWinner: topChanged && (baselineTop?.outcomeLabel === 't1_and_t2_hit' || baselineTop?.outcomeLabel === 't1_hit_only'),
      deltaOneMesPl: delta,
    });
  }
  return {
    rows: rankedRows.sort((a, b) => a.slateId.localeCompare(b.slateId) || a.overlayRank - b.overlayRank),
    slates: slates.sort((a, b) => a.slateId.localeCompare(b.slateId)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Sweep Composite Overlay Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only overlay simulation over saved scanner artifacts and saved outcome reports. It does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Candidate rows: ${report.summary.candidateRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Validated composite rows: ${report.summary.validatedCompositeRows}.`,
    `- Overlay boost rows: ${report.summary.overlayBoostRows}.`,
    `- Incomplete composite matches not boosted: ${report.summary.incompleteCompositeMatchesNotBoosted}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Changed to validated composite Sweep slates: ${report.summary.changedToValidatedCompositeSweepSlates}.`,
    `- Changed from known winner slates: ${report.summary.changedFromKnownWinnerSlates}.`,
    `- Top selection P/L baseline/overlay: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.overlayTopOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Missing outcome top rows: ${report.summary.missingOutcomeTopRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Baseline Top | Baseline Model | Baseline P/L | Overlay Top | Overlay Model | Overlay P/L | Delta |',
    '|---|---|---|---:|---|---|---:|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.baselineTopTicketId ?? '-')} | ${escapeTable(row.baselineTopSetupType ?? '-')} | ${row.baselineTopOneMesPl ?? '-'} | ${escapeTable(row.overlayTopTicketId ?? '-')} | ${escapeTable(row.overlayTopSetupType ?? '-')} | ${row.overlayTopOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayDryRunReport(args: {
  reportDir: string;
  snapshotMinerReportPath: string;
  snapshotMinerReport: RawOhlcScannerArtifactSweepSnapshotFieldMinerReport | null;
  scannerArtifactPaths: string[];
  scannerArtifacts: ArtifactShape[];
  outcomeReportPaths: string[];
  outcomeReports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[];
  boostPoints: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport {
  const selectors = selectorSet(args.snapshotMinerReport);
  const builtRows = buildRows({
    artifacts: args.scannerArtifacts,
    selectors,
    outcomes: outcomeById(args.outcomeReports),
    boostPoints: args.boostPoints,
  });
  const overlay = buildSlates(builtRows.rows);
  const baselineTops = overlay.slates.map((slate) => slate.baselineTopOneMesPl);
  const overlayTops = overlay.slates.map((slate) => slate.overlayTopOneMesPl);
  const missingOutcomeTopRows = overlay.slates.filter((slate) =>
    slate.baselineTopOneMesPl === null || slate.overlayTopOneMesPl === null).length;
  const topSelectionDelta = sum(overlay.slates.map((slate) => slate.deltaOneMesPl));
  const changedSlates = overlay.slates.filter((slate) => slate.topChanged);
  const blockers = [
    !args.snapshotMinerReport ? 'missing snapshot miner report' : null,
    args.snapshotMinerReport && args.snapshotMinerReport.status !== 'pass' ? `snapshot miner report status ${args.snapshotMinerReport.status}` : null,
    selectors.size === 0 ? 'snapshot miner report has no zero-loss transfer segments' : null,
    args.scannerArtifacts.length === 0 ? 'missing scanner artifacts' : null,
    args.outcomeReports.length === 0 ? 'missing outcome reports' : null,
    overlay.rows.length === 0 ? 'no candidate rows available for overlay simulation' : null,
    overlay.rows.some((row) => row.validatedCompositeMatch && !row.completeDeterministicLevels && row.overlayBoostApplied)
      ? 'incomplete validated composite match received overlay boost'
      : null,
  ].filter((item): item is string => Boolean(item));
  const changedToValidated = changedSlates.filter((slate) => slate.changedToValidatedCompositeSweep).length;
  const changedFromKnownWinner = changedSlates.filter((slate) => slate.changedFromKnownWinner).length;
  const rec: RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : changedFromKnownWinner > 0
      ? 'reject_overlay_for_now'
      : changedToValidated > 0 && (topSelectionDelta ?? 0) >= 0 && missingOutcomeTopRows === 0
        ? 'prepare_research_live_proposal_with_promotion_disabled'
        : 'keep_research_only';
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      snapshotMinerReportPath: args.snapshotMinerReportPath,
      scannerArtifactPaths: args.scannerArtifactPaths,
      outcomeReportPaths: args.outcomeReportPaths,
    },
    assumptions: {
      savedArtifactsOnly: true,
      overlayDryRunOnly: true,
      outcomeUsedForEvaluationOnly: true,
      incompleteMatchesAreNotBoosted: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    scoring: {
      validatedCompositeSweepBoostPoints: args.boostPoints,
      baselineScoreSource: 'scanner_candidate_rankScore',
    },
    summary: {
      scannerArtifacts: args.scannerArtifacts.length,
      outcomeReports: args.outcomeReports.length,
      candidateRows: overlay.rows.length,
      slates: overlay.slates.length,
      validatedCompositeRows: overlay.rows.filter((row) => row.validatedCompositeMatch).length,
      incompleteCompositeMatchesNotBoosted: builtRows.incompleteCompositeMatchesNotBoosted,
      overlayBoostRows: overlay.rows.filter((row) => row.overlayBoostApplied).length,
      changedSlates: changedSlates.length,
      changedToValidatedCompositeSweepSlates: changedToValidated,
      changedFromKnownWinnerSlates: changedFromKnownWinner,
      baselineTopOneMesPl: sum(baselineTops),
      overlayTopOneMesPl: sum(overlayTops),
      topSelectionDeltaOneMesPl: topSelectionDelta,
      missingOutcomeTopRows,
      livePromotionAllowedRows: 0,
      recommendation: rec,
    },
    rows: overlay.rows,
    slates: overlay.slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved snapshot/artifact/outcome inputs before using overlay findings.']
      : [
        'Treat this as ranking research only; do not install live rank behavior from this report alone.',
        'If a live proposal is prepared, keep promotion disabled and require complete deterministic levels before any candidate boost.',
        'Preserve canExecute, entry/stop/target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayDryRunReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayDryRunReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayDryRunCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayDryRunArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayDryRunReport({
    reportDir: options.outDir,
    snapshotMinerReportPath: options.snapshotMinerReport,
    snapshotMinerReport: fs.existsSync(options.snapshotMinerReport)
      ? readJson<RawOhlcScannerArtifactSweepSnapshotFieldMinerReport>(options.snapshotMinerReport)
      : null,
    scannerArtifactPaths: options.scannerArtifacts,
    scannerArtifacts: options.scannerArtifacts.map((filePath) => readJson<ArtifactShape>(filePath)),
    outcomeReportPaths: options.outcomeReports,
    outcomeReports: options.outcomeReports.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(filePath)),
    boostPoints: options.boostPoints,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayDryRunReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayDryRunCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
