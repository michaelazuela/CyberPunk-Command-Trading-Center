import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

type SegmentKind =
  | 'candle_direction'
  | 'candle_body_quality'
  | 'candle_close_location'
  | 'candle_range'
  | 'rank_bucket'
  | 'confidence'
  | 'target_room_status'
  | 'timeframe_mss_status'
  | 'htf_line_status'
  | 'htf_line_obstacle'
  | 'evidence_tag'
  | 'missing_tag'
  | 'session_direction'
  | 'session_direction_rank'
  | 'session_direction_candle_rank'
  | 'session_direction_candle_target'
  | 'session_direction_htf_target'
  | 'session_direction_confidence_rank_target'
  | 'session_evidence_tag'
  | 'direction_evidence_tag'
  | 'session_direction_evidence_tag'
  | 'session_direction_evidence_candle'
  | 'session_direction_evidence_target'
  | 'session_direction_missing_target'
  | 'direction_htf_line_target'
  | 'session_direction_htf_line_missing'
  | 'session_direction_candle';

interface CliOptions {
  trainArtifacts: string[];
  trainOutcomeReports: string[];
  testArtifacts: string[];
  testOutcomeReports: string[];
  minRowsPerPeriod: number;
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
  volume?: number;
}

interface CandidateShape {
  setupType?: string;
  direction?: string;
  detectedStatus?: string;
  executionStatus?: string;
  blockReason?: string | null;
  confidence?: string;
  rankScore?: number;
  riskPoints?: number | null;
  targetRoom?: {
    targetRoomStatus?: string;
    obstacleBeforeT1?: boolean;
    t2ExtensionObstructed?: boolean;
  };
  evidence?: string[];
  missingEvidence?: string[];
  activeRuleset?: {
    timeframeMss?: {
      status?: string;
    };
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

interface SnapshotRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  candleDirection: string;
  candleBodyQuality: string;
  candleCloseLocation: string;
  candleRangeBucket: string;
  rankBucket: string;
  confidence: string;
  targetRoomStatus: string;
  timeframeMssStatus: string;
  htfLineStatus: string;
  htfLineObstacle: string;
  evidenceTags: string[];
  missingTags: string[];
  outcomeStatus: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
}

interface SegmentSummary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
}

interface Segment {
  kind: SegmentKind;
  key: string;
  train: SegmentSummary;
  test: SegmentSummary;
  verdict:
    | 'research_candidate_zero_loss_transfer'
    | 'latest_positive_train_loss_bearing'
    | 'latest_positive_train_weak'
    | 'train_positive_latest_weak'
    | 'caution_or_insufficient';
  reason: string;
  score: number;
}

export interface RawOhlcScannerArtifactSweepSnapshotFieldMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_snapshot_field_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    trainArtifacts: string[];
    trainOutcomeReports: string[];
    testArtifacts: string[];
    testOutcomeReports: string[];
    minRowsPerPeriod: number;
    setupType: 'NoInstalledSetup';
  };
  assumptions: {
    consumesExistingRawScannerArtifactsAndOutcomeReportsOnly: true;
    extractsPreEntrySnapshotTagsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    trainSnapshotRows: number;
    testSnapshotRows: number;
    zeroLossTransferSegments: number;
    latestPositiveTrainLossBearingSegments: number;
    latestPositiveTrainWeakSegments: number;
    livePromotionAllowedRows: 0;
    recommendation: 'fresh_replay_validate_zero_loss_snapshot_segments' | 'mine_composite_snapshot_fields' | 'fix_inputs';
  };
  zeroLossTransferSegments: Segment[];
  latestPositiveTrainLossBearingSegments: Segment[];
  latestPositiveTrainWeakSegments: Segment[];
  cautionSegments: Segment[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP_TYPE = 'NoInstalledSetup';

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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
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

export function parseRawOhlcScannerArtifactSweepSnapshotFieldMinerArgs(args = process.argv.slice(2)): CliOptions {
  const minRows = Number(readFlag(args, '--min-rows-per-period') || 5);
  return {
    trainArtifacts: splitPaths(readFlag(args, '--train-artifacts')),
    trainOutcomeReports: splitPaths(readFlag(args, '--train-outcome-reports')),
    testArtifacts: splitPaths(readFlag(args, '--test-artifacts')),
    testOutcomeReports: splitPaths(readFlag(args, '--test-outcome-reports')),
    minRowsPerPeriod: Number.isFinite(minRows) && minRows > 0 ? minRows : 5,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function eventTime(eventKey: string, event: ArtifactEventShape): string {
  return normalizeTime(event.eventTime) || normalizeTime(eventKey) || eventKey;
}

function ticketId(event: ArtifactEventShape, candidate: CandidateShape, time: string): string {
  return [
    event.date || time.slice(0, 10),
    event.session || 'unknown',
    candidate.setupType || 'UnknownSetup',
    candidate.direction || 'UNKNOWN',
    time.replace(/[^0-9T]/g, '').slice(0, 15),
  ].join('-');
}

function candleDirection(bar: OhlcBar): string {
  if (bar.close > bar.open) return 'bullish_close';
  if (bar.close < bar.open) return 'bearish_close';
  return 'doji_close';
}

function candleBodyQuality(bar: OhlcBar): string {
  const range = Math.max(bar.high - bar.low, 0);
  if (range <= 0) return 'body_unknown';
  const ratio = Math.abs(bar.close - bar.open) / range;
  if (ratio >= 0.7) return 'body_strong';
  if (ratio >= 0.4) return 'body_moderate';
  return 'body_small';
}

function candleCloseLocation(bar: OhlcBar): string {
  const range = Math.max(bar.high - bar.low, 0);
  if (range <= 0) return 'close_location_unknown';
  const location = (bar.close - bar.low) / range;
  if (location >= 0.75) return 'close_upper_quartile';
  if (location <= 0.25) return 'close_lower_quartile';
  return 'close_middle_half';
}

function candleRangeBucket(bar: OhlcBar): string {
  const range = Math.max(bar.high - bar.low, 0);
  if (range < 4) return 'range_lt_4';
  if (range < 8) return 'range_4_to_8';
  if (range < 16) return 'range_8_to_16';
  return 'range_gte_16';
}

function rankBucket(value: unknown): string {
  const rank = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(rank)) return 'rank_unknown';
  if (rank < 120) return 'rank_lt_120';
  if (rank < 180) return 'rank_120_to_179';
  if (rank < 240) return 'rank_180_to_239';
  return 'rank_gte_240';
}

function tagList(values: string[] | undefined): string[] {
  const text = (values || []).join(' | ').toLowerCase();
  return [
    text.includes('liquidity sweep confirmed') ? 'has_liquidity_sweep' : null,
    text.includes('reclaim after sweep confirmed') ? 'has_reclaim' : null,
    text.includes('displacement confirmed') ? 'has_displacement' : null,
    text.includes('market structure shift confirmed') ? 'has_mss' : null,
    text.includes('fair value gap') || text.includes('imbalance') ? 'has_fvg_or_imbalance' : null,
    text.includes('retrace into fvg confirmed') ? 'has_fvg_retrace' : null,
    text.includes('entry inside fvg') ? 'has_entry_inside_fvg' : null,
    text.includes('tier a displacement') ? 'has_tier_a_displacement' : null,
    text.includes('tier b displacement') ? 'has_tier_b_displacement' : null,
    text.includes('session narrative: reversal') ? 'session_reversal' : null,
    text.includes('session narrative: chop') ? 'session_chop' : null,
    text.includes('big-picture structure is bearish') ? 'big_picture_bearish' : null,
    text.includes('big-picture structure is bullish') ? 'big_picture_bullish' : null,
    text.includes('full 30-day htf context gate satisfied') ? 'htf_30d_sufficient' : null,
    text.includes('failed htf auction supports') ? 'failed_htf_auction_support' : null,
    text.includes('risk exceeds standard limit') ? 'risk_exceeds_standard_limit' : null,
    text.includes('premium/discount alignment') ? 'premium_discount_alignment' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function missingTagList(values: string[] | undefined): string[] {
  const text = (values || []).join(' | ').toLowerCase();
  return [
    text.includes('fair value gap') || text.includes('imbalance') ? 'missing_fvg_or_imbalance' : null,
    text.includes('retrace into fvg') ? 'missing_fvg_retrace' : null,
    text.includes('entry inside fvg') ? 'missing_entry_inside_fvg' : null,
    text.includes('clean 1.5r path unavailable') ? 'missing_clean_1_5r_path' : null,
    text.includes('opening range context') ? 'opening_range_context' : null,
    text.includes('avoid shorts in discount') ? 'avoid_shorts_in_discount' : null,
    text.includes('avoid longs in premium') ? 'avoid_longs_in_premium' : null,
    text.includes('opposing completed 5m') ? 'opposing_5m_mss' : null,
    text.includes('no chase') ? 'no_chase_line_in_sand' : null,
    text.includes('chop/consolidation no-trade') ? 'chop_no_trade' : null,
    text.includes('nearest obstacle sits before') ? 'obstacle_before_1r' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function outcomeById(reports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[]): Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number]> {
  return new Map(reports.flatMap((report) => report.rows || []).map((row) => [row.ticketId, row]));
}

function buildRows(artifacts: ArtifactShape[], outcomes: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[]): SnapshotRow[] {
  const outcomesById = outcomeById(outcomes);
  const rows: SnapshotRow[] = [];
  for (const artifact of artifacts) {
    for (const [eventKey, event] of Object.entries(artifact.events || {})) {
      const time = eventTime(eventKey, event);
      const bar = event.completed5m;
      if (!bar) continue;
      for (const candidate of event.setupCandidateStatus?.statuses || []) {
        if (candidate.setupType !== SETUP_TYPE) continue;
        if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') continue;
        const id = ticketId(event, candidate, time);
        const outcome = outcomesById.get(id);
        rows.push({
          ticketId: id,
          tradeDate: event.date || time.slice(0, 10),
          session: event.session || 'unknown',
          setupType: SETUP_TYPE,
          direction: candidate.direction,
          proofTime: time,
          candleDirection: candleDirection(bar),
          candleBodyQuality: candleBodyQuality(bar),
          candleCloseLocation: candleCloseLocation(bar),
          candleRangeBucket: candleRangeBucket(bar),
          rankBucket: rankBucket(candidate.rankScore),
          confidence: candidate.confidence || 'confidence_unknown',
          targetRoomStatus: candidate.targetRoom?.targetRoomStatus || 'target_room_unknown',
          timeframeMssStatus: candidate.activeRuleset?.timeframeMss?.status || 'timeframe_mss_unknown',
          htfLineStatus: candidate.activeRuleset?.htfLineInSand?.status || 'htf_line_unknown',
          htfLineObstacle: `${candidate.activeRuleset?.htfLineInSand?.obstacleSource || 'obstacle_source_unknown'}:${candidate.activeRuleset?.htfLineInSand?.obstacleType || 'obstacle_type_unknown'}`,
          evidenceTags: tagList(candidate.evidence),
          missingTags: missingTagList(candidate.missingEvidence),
          outcomeStatus: outcome?.outcomeStatus || 'missing',
          outcomeLabel: outcome?.outcomeLabel || 'missing',
          resolvedOneMesPl: outcome?.resolvedOneMesPl ?? null,
        });
      }
    }
  }
  return rows;
}

function isWinner(row: SnapshotRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: SnapshotRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: SnapshotRow[]): SegmentSummary {
  const winners = rows.filter(isWinner).length;
  const losses = rows.filter(isLoss).length;
  const otherResolved = rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length;
  const unresolved = rows.filter((row) => row.outcomeStatus !== 'resolved').length;
  const resolved = winners + losses + otherResolved;
  return {
    rows: rows.length,
    winners,
    losses,
    otherResolved,
    unresolved,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
    winRateResolved: resolved ? round(winners / resolved) : null,
  };
}

function isPositive(summary: SegmentSummary, minRows: number): boolean {
  return summary.rows >= minRows && (summary.oneMesPl ?? 0) > 0 && summary.winners > summary.losses && (summary.winRateResolved ?? 0) >= 0.6;
}

function segmentValues(row: SnapshotRow): Array<{ kind: SegmentKind; key: string }> {
  const sessionDirection = `${row.session}|${row.direction}`;
  const candleShape = `${row.candleDirection}|${row.candleCloseLocation}`;
  const htfLine = `${row.htfLineStatus}|${row.htfLineObstacle}`;
  return [
    { kind: 'candle_direction', key: row.candleDirection },
    { kind: 'candle_body_quality', key: row.candleBodyQuality },
    { kind: 'candle_close_location', key: row.candleCloseLocation },
    { kind: 'candle_range', key: row.candleRangeBucket },
    { kind: 'rank_bucket', key: row.rankBucket },
    { kind: 'confidence', key: row.confidence },
    { kind: 'target_room_status', key: row.targetRoomStatus },
    { kind: 'timeframe_mss_status', key: row.timeframeMssStatus },
    { kind: 'htf_line_status', key: row.htfLineStatus },
    { kind: 'htf_line_obstacle', key: row.htfLineObstacle },
    { kind: 'session_direction', key: sessionDirection },
    { kind: 'session_direction_rank', key: `${sessionDirection}|${row.rankBucket}` },
    { kind: 'session_direction_candle', key: `${sessionDirection}|${candleShape}` },
    { kind: 'session_direction_candle_rank', key: `${sessionDirection}|${candleShape}|${row.rankBucket}` },
    { kind: 'session_direction_candle_target', key: `${sessionDirection}|${candleShape}|${row.targetRoomStatus}` },
    { kind: 'session_direction_htf_target', key: `${sessionDirection}|${htfLine}|${row.targetRoomStatus}` },
    { kind: 'session_direction_confidence_rank_target', key: `${sessionDirection}|${row.confidence}|${row.rankBucket}|${row.targetRoomStatus}` },
    { kind: 'direction_htf_line_target', key: `${row.direction}|${htfLine}|${row.targetRoomStatus}` },
    ...row.evidenceTags.flatMap((tag) => [
      { kind: 'evidence_tag' as const, key: tag },
      { kind: 'session_evidence_tag' as const, key: `${row.session}|${tag}` },
      { kind: 'direction_evidence_tag' as const, key: `${row.direction}|${tag}` },
      { kind: 'session_direction_evidence_tag' as const, key: `${row.session}|${row.direction}|${tag}` },
      { kind: 'session_direction_evidence_candle' as const, key: `${sessionDirection}|${tag}|${candleShape}` },
      { kind: 'session_direction_evidence_target' as const, key: `${sessionDirection}|${tag}|${row.targetRoomStatus}` },
    ]),
    ...row.missingTags.flatMap((tag) => [
      { kind: 'missing_tag' as const, key: tag },
      { kind: 'session_direction_missing_target' as const, key: `${sessionDirection}|${tag}|${row.targetRoomStatus}` },
      { kind: 'session_direction_htf_line_missing' as const, key: `${sessionDirection}|${htfLine}|${tag}` },
    ]),
  ];
}

function segmentMap(rows: SnapshotRow[]): Map<string, { kind: SegmentKind; key: string; rows: SnapshotRow[] }> {
  const map = new Map<string, { kind: SegmentKind; key: string; rows: SnapshotRow[] }>();
  for (const row of rows) {
    for (const segment of segmentValues(row)) {
      const id = `${segment.kind}:${segment.key}`;
      const existing = map.get(id);
      if (existing) existing.rows.push(row);
      else map.set(id, { ...segment, rows: [row] });
    }
  }
  return map;
}

function classify(train: SegmentSummary, test: SegmentSummary, minRows: number): Pick<Segment, 'verdict' | 'reason' | 'score'> {
  const trainPositive = isPositive(train, minRows);
  const testPositive = isPositive(test, minRows);
  const score = round((test.oneMesPl ?? 0) * 2 + (train.oneMesPl ?? 0) + (test.winners - test.losses) * 20 + (train.winners - train.losses) * 8 - (train.unresolved + test.unresolved) * 5);
  if (trainPositive && testPositive && train.losses === 0 && test.losses === 0) {
    return { verdict: 'research_candidate_zero_loss_transfer', reason: 'snapshot segment is positive and zero-loss in both train and latest test', score };
  }
  if (testPositive && trainPositive && train.losses > 0) {
    return { verdict: 'latest_positive_train_loss_bearing', reason: 'latest snapshot segment is positive, but train period still has stopped-before-T1 losses', score };
  }
  if (testPositive && !trainPositive) {
    return { verdict: 'latest_positive_train_weak', reason: 'latest snapshot segment is positive, but train is weak, absent, or below minimum sample', score };
  }
  if (trainPositive && !testPositive) {
    return { verdict: 'train_positive_latest_weak', reason: 'train snapshot segment was positive but did not hold up in latest test', score };
  }
  return { verdict: 'caution_or_insufficient', reason: 'segment is mixed, loss-bearing, unresolved, or below minimum sample', score };
}

function buildSegments(trainRows: SnapshotRow[], testRows: SnapshotRow[], minRows: number): Segment[] {
  const train = segmentMap(trainRows);
  const test = segmentMap(testRows);
  const ids = [...new Set([...train.keys(), ...test.keys()])].sort();
  return ids.map((id) => {
    const trainSegment = train.get(id);
    const testSegment = test.get(id);
    const kind = (trainSegment?.kind || testSegment?.kind) as SegmentKind;
    const key = trainSegment?.key || testSegment?.key || id.split(':').slice(1).join(':');
    const trainSummary = summarize(trainSegment?.rows || []);
    const testSummary = summarize(testSegment?.rows || []);
    return { kind, key, train: trainSummary, test: testSummary, ...classify(trainSummary, testSummary, minRows) };
  }).sort((a, b) => b.score - a.score || b.test.rows - a.test.rows || b.train.rows - a.train.rows || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function segmentRow(row: Segment): string {
  return `| ${row.kind} | ${escapeTable(row.key)} | ${row.train.rows} | ${row.train.winners}/${row.train.losses}/${row.train.otherResolved}/${row.train.unresolved} | ${row.train.oneMesPl ?? '-'} | ${row.test.rows} | ${row.test.winners}/${row.test.losses}/${row.test.otherResolved}/${row.test.unresolved} | ${row.test.oneMesPl ?? '-'} | ${row.score} | ${row.verdict} | ${escapeTable(row.reason)} |`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepSnapshotFieldMinerReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Sweep Snapshot Field Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only raw scanner snapshot research. It consumes saved artifacts and outcome reports only; it does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Snapshot train/test rows: ${report.summary.trainSnapshotRows}/${report.summary.testSnapshotRows}.`,
    `- Zero-loss transfer segments: ${report.summary.zeroLossTransferSegments}.`,
    `- Latest-positive train-loss-bearing segments: ${report.summary.latestPositiveTrainLossBearingSegments}.`,
    `- Latest-positive train-weak segments: ${report.summary.latestPositiveTrainWeakSegments}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Zero-Loss Transfer Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.zeroLossTransferSegments.map(segmentRow),
    '',
    '## Latest Positive / Train Loss-Bearing Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.latestPositiveTrainLossBearingSegments.map(segmentRow),
    '',
    '## Latest Positive / Train Weak Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.latestPositiveTrainWeakSegments.map(segmentRow),
    '',
    '## Caution Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.cautionSegments.slice(0, 30).map(segmentRow),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepSnapshotFieldMinerReport(args: {
  reportDir: string;
  trainArtifactPaths: string[];
  trainArtifacts: ArtifactShape[];
  trainOutcomeReportPaths: string[];
  trainOutcomeReports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[];
  testArtifactPaths: string[];
  testArtifacts: ArtifactShape[];
  testOutcomeReportPaths: string[];
  testOutcomeReports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[];
  minRowsPerPeriod?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepSnapshotFieldMinerReport {
  const minRowsPerPeriod = args.minRowsPerPeriod ?? 5;
  const trainRows = buildRows(args.trainArtifacts, args.trainOutcomeReports).filter((row) => row.outcomeStatus !== 'missing');
  const testRows = buildRows(args.testArtifacts, args.testOutcomeReports).filter((row) => row.outcomeStatus !== 'missing');
  const segments = buildSegments(trainRows, testRows, minRowsPerPeriod);
  const zeroLossTransferSegments = segments.filter((segment) => segment.verdict === 'research_candidate_zero_loss_transfer');
  const latestPositiveTrainLossBearingSegments = segments.filter((segment) => segment.verdict === 'latest_positive_train_loss_bearing');
  const latestPositiveTrainWeakSegments = segments.filter((segment) => segment.verdict === 'latest_positive_train_weak');
  const cautionSegments = segments.filter((segment) => segment.verdict === 'train_positive_latest_weak' || segment.verdict === 'caution_or_insufficient');
  const blockers = [
    args.trainArtifacts.length === 0 ? 'missing train raw scanner artifacts' : null,
    args.testArtifacts.length === 0 ? 'missing test raw scanner artifacts' : null,
    args.trainOutcomeReports.length === 0 ? 'missing train outcome reports' : null,
    args.testOutcomeReports.length === 0 ? 'missing test outcome reports' : null,
    trainRows.length === 0 ? 'no train Sweep snapshot rows joined to outcomes' : null,
    testRows.length === 0 ? 'no latest/test Sweep snapshot rows joined to outcomes' : null,
    ...args.trainOutcomeReports.map((report, index) => report.status !== 'pass' ? `train outcome report ${args.trainOutcomeReportPaths[index]} status ${report.status}` : null),
    ...args.testOutcomeReports.map((report, index) => report.status !== 'pass' ? `test outcome report ${args.testOutcomeReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepSnapshotFieldMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_snapshot_field_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      trainArtifacts: args.trainArtifactPaths,
      trainOutcomeReports: args.trainOutcomeReportPaths,
      testArtifacts: args.testArtifactPaths,
      testOutcomeReports: args.testOutcomeReportPaths,
      minRowsPerPeriod,
      setupType: SETUP_TYPE,
    },
    assumptions: {
      consumesExistingRawScannerArtifactsAndOutcomeReportsOnly: true,
      extractsPreEntrySnapshotTagsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      trainSnapshotRows: trainRows.length,
      testSnapshotRows: testRows.length,
      zeroLossTransferSegments: zeroLossTransferSegments.length,
      latestPositiveTrainLossBearingSegments: latestPositiveTrainLossBearingSegments.length,
      latestPositiveTrainWeakSegments: latestPositiveTrainWeakSegments.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : zeroLossTransferSegments.length
          ? 'fresh_replay_validate_zero_loss_snapshot_segments'
          : 'mine_composite_snapshot_fields',
    },
    zeroLossTransferSegments,
    latestPositiveTrainLossBearingSegments,
    latestPositiveTrainWeakSegments,
    cautionSegments,
    blockers,
    recommendations: blockers.length
      ? ['Fix raw artifact/outcome inputs before using snapshot findings.']
      : [
        zeroLossTransferSegments.length
          ? 'Treat zero-loss snapshot segments as research candidates only; validate on fresh replay before scanner-visible behavior.'
          : 'Single snapshot tags still do not isolate a zero-loss transferable Sweep segment; mine composite pre-entry tags next.',
        'Do not use outcome path, MFE, MAE, or future bars as live selector inputs.',
        'Preserve canExecute, 5M execution authority, protected stops, target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepSnapshotFieldMinerReport(
  report: RawOhlcScannerArtifactSweepSnapshotFieldMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-snapshot-field-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepSnapshotFieldMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepSnapshotFieldMinerArgs(args);
  const report = buildRawOhlcScannerArtifactSweepSnapshotFieldMinerReport({
    reportDir: options.outDir,
    trainArtifactPaths: options.trainArtifacts,
    trainArtifacts: options.trainArtifacts.map((filePath) => readJson<ArtifactShape>(filePath)),
    trainOutcomeReportPaths: options.trainOutcomeReports,
    trainOutcomeReports: options.trainOutcomeReports.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(filePath)),
    testArtifactPaths: options.testArtifacts,
    testArtifacts: options.testArtifacts.map((filePath) => readJson<ArtifactShape>(filePath)),
    testOutcomeReportPaths: options.testOutcomeReports,
    testOutcomeReports: options.testOutcomeReports.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(filePath)),
    minRowsPerPeriod: options.minRowsPerPeriod,
  });
  const paths = writeRawOhlcScannerArtifactSweepSnapshotFieldMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...paths,
      status: report.status,
      summary: report.summary,
      zeroLossTransferSegments: report.zeroLossTransferSegments.slice(0, 10),
      latestPositiveTrainLossBearingSegments: report.latestPositiveTrainLossBearingSegments.slice(0, 10),
      latestPositiveTrainWeakSegments: report.latestPositiveTrainWeakSegments.slice(0, 10),
      blockers: report.blockers,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepSnapshotFieldMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
