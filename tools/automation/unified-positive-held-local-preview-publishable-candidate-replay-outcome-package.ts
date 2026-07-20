import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';

interface PublishableCandidateRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofState: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  triageScore: number;
  occurrences: number;
  sourceFile: string;
  publishShouldPost: boolean;
  publishHasCompletePlan: boolean;
  publishCanExecute: boolean;
  publishableReviewCandidate: boolean;
  outcomeBucket: string | null;
  outcomeLabel: string | null;
  resolvedOneMesPl: number | null;
  entryHitTime: string | null;
  blockers: string[];
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface GroupSummary {
  groupId: string;
  setupType: string;
  tradeDate: string | null;
  session: string | null;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  grossResolvedOneMesPl: number | null;
}

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofState: string;
  triageScore: number;
  occurrences: number;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  sourceTapePath: string;
  barsLoaded: number;
  barsAfterProof: number;
  firstBarTime: string | null;
  lastBarTime: string | null;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: OutcomeLabel;
  resolvedOneMesPl: number | null;
  resolvedR: number | null;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  intrabarAmbiguity: boolean;
  joinedOutcomeBucket: string | null;
  joinedOutcomeLabel: string | null;
  joinedResolvedOneMesPl: number | null;
  joinedEntryHitTime: string | null;
  joinedOutcomeMatchesReplay: boolean | null;
  publishCanExecute: boolean;
  livePromotionAllowed: false;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport {
  reportType: 'unified_positive_held_local_preview_publishable_candidate_replay_outcome_package';
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
    usesSavedScannerDecisionTapesOnly: true;
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
    candidateMinerPath: string | null;
    auditDir: string;
  };
  assumptions: {
    selectedRowsComeFromPublishableCandidateMiner: true;
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    sameBarStopAndTargetUsesConservativeStopFirst: true;
    outcomeIsResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    selectedRowsRead: number;
    packageRows: number;
    rowsWithLocalTapeBars: number;
    rowsWithBarsAfterProof: number;
    publishCanExecuteTrueRows: number;
    resolvedRows: number;
    winnerRows: number;
    lossRows: number;
    unresolvedRows: number;
    blockedRows: number;
    noFillRows: number;
    noTargetOrStopRows: number;
    t1OnlyRows: number;
    t1AndT2Rows: number;
    stoppedBeforeT1Rows: number;
    grossResolvedOneMesPl: number | null;
    joinedOutcomeComparedRows: number;
    joinedOutcomeMatchRows: number;
    joinedOutcomeMismatchRows: number;
    modelGroups: GroupSummary[];
    daySessionModelGroups: GroupSummary[];
    livePromotionAllowedRows: 0;
    recommendation: 'use_as_research_evidence_for_next_rank_overlay' | 'refresh_missing_local_tape_evidence' | 'fix_missing_candidate_miner_report';
  };
  rows: OutcomeRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const POINT_VALUE = 5;

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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function selectedRows(report: { selectedReplayPackage?: unknown } | null): PublishableCandidateRow[] {
  return Array.isArray(report?.selectedReplayPackage)
    ? report.selectedReplayPackage as PublishableCandidateRow[]
    : [];
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
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  const volume = numberOrNull(record.volume);
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
}

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumResolved(rows: Pick<OutcomeRow, 'resolvedOneMesPl'>[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => value !== null);
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function tapePath(auditDir: string, sourceFile: string): string {
  return path.isAbsolute(sourceFile) ? sourceFile : path.join(auditDir, sourceFile);
}

function loadTapeBars(sourceTapePath: string): OhlcBar[] {
  if (!fs.existsSync(sourceTapePath)) return [];
  const tape = JSON.parse(fs.readFileSync(sourceTapePath, 'utf8')) as Record<string, unknown>;
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function directionallyValid(direction: Direction, entry: number, stop: number): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function targetsDirectionallyValid(direction: Direction, entry: number, t1: number, t2: number): boolean {
  return direction === 'LONG' ? t1 > entry && t2 > entry : t1 < entry && t2 < entry;
}

function crosses(direction: Direction, bar: OhlcBar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(direction: Direction, bar: OhlcBar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(direction: Direction, bar: OhlcBar, entry: number): number {
  return direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(direction: Direction, bar: OhlcBar, entry: number): number {
  return direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function joinedOutcomeMatches(row: OutcomeRow): boolean | null {
  if (!row.joinedOutcomeBucket || !row.joinedOutcomeLabel) return null;
  if (row.joinedOutcomeBucket === 'unresolved') return row.outcomeBucket === 'unresolved' && row.joinedOutcomeLabel === row.outcomeLabel;
  if (row.joinedOutcomeBucket === 'winner' || row.joinedOutcomeBucket === 'loss') {
    return row.joinedOutcomeBucket === row.outcomeBucket &&
      row.joinedOutcomeLabel === row.outcomeLabel &&
      row.joinedResolvedOneMesPl === row.resolvedOneMesPl;
  }
  return row.joinedOutcomeBucket === row.outcomeBucket && row.joinedOutcomeLabel === row.outcomeLabel;
}

function buildOutcomeRow(candidate: PublishableCandidateRow, auditDir: string): OutcomeRow {
  const sourceTapePath = tapePath(auditDir, candidate.sourceFile);
  const bars = loadTapeBars(sourceTapePath);
  const proofTime = normalizeTime(candidate.entryHitTime) || null;
  const entry = candidate.entry;
  const stop = candidate.stop;
  const t1 = candidate.target1;
  const t2 = candidate.target2;
  const riskPoints = entry === null || stop === null ? null : round(Math.abs(entry - stop));
  const barsAfterProof = proofTime ? bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length : bars.length;
  const blockers = [
    !candidate.publishableReviewCandidate ? 'candidate miner did not mark row publishable' : null,
    !candidate.publishHasCompletePlan ? 'candidate miner publish decision lacks complete plan' : null,
    !candidate.publishShouldPost ? 'candidate miner publish decision would not post' : null,
    candidate.publishCanExecute ? 'candidate miner publish decision unexpectedly canExecute=true' : null,
    entry === null ? 'missing entry' : null,
    stop === null ? 'missing stop' : null,
    t1 === null ? 'missing T1' : null,
    t2 === null ? 'missing T2' : null,
    entry !== null && stop !== null && riskPoints !== null && riskPoints <= 0 ? 'missing positive entry-to-stop risk' : null,
    entry !== null && stop !== null && !directionallyValid(candidate.direction, entry, stop)
      ? 'directionally invalid entry-to-stop geometry'
      : null,
    entry !== null && t1 !== null && t2 !== null && !targetsDirectionallyValid(candidate.direction, entry, t1, t2)
      ? 'directionally invalid target geometry'
      : null,
    !fs.existsSync(sourceTapePath) ? 'missing scanner decision tape' : null,
    bars.length === 0 ? 'missing completed 5M bars from scanner decision tape' : null,
    barsAfterProof === 0 ? 'missing completed 5M bars at or after proof/entry time' : null,
    ...candidate.blockers.map((blocker) => `candidate miner blocker: ${blocker}`),
  ].filter((item): item is string => Boolean(item));

  const blockedBase = {
    ticketId: candidate.intakeId,
    tradeDate: candidate.tradeDate,
    session: candidate.session,
    setupType: candidate.setupType,
    direction: candidate.direction,
    proofState: candidate.proofState,
    triageScore: candidate.triageScore,
    occurrences: candidate.occurrences,
    entry,
    stop,
    t1,
    t2,
    riskPoints,
    proofTime,
    sourceTapePath,
    barsLoaded: bars.length,
    barsAfterProof,
    firstBarTime: bars[0]?.time || null,
    lastBarTime: bars[bars.length - 1]?.time || null,
    joinedOutcomeBucket: candidate.outcomeBucket,
    joinedOutcomeLabel: candidate.outcomeLabel,
    joinedResolvedOneMesPl: candidate.resolvedOneMesPl,
    joinedEntryHitTime: candidate.entryHitTime,
    publishCanExecute: candidate.publishCanExecute,
    livePromotionAllowed: false as const,
  };

  if (blockers.length || entry === null || stop === null || t1 === null || t2 === null || riskPoints === null) {
    const row: OutcomeRow = {
      ...blockedBase,
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      resolvedR: null,
      entryHitTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      intrabarAmbiguity: false,
      joinedOutcomeMatchesReplay: null,
      blockers,
    };
    return row;
  }

  const eligibleBars = bars.filter((bar) => !proofTime || timeMs(bar.time) >= timeMs(proofTime));
  const entryHitIndex = eligibleBars.findIndex((bar) => crosses(candidate.direction, bar, entry));
  if (entryHitIndex < 0) {
    const row: OutcomeRow = {
      ...blockedBase,
      outcomeBucket: 'unresolved',
      outcomeLabel: 'no_fill',
      resolvedOneMesPl: null,
      resolvedR: null,
      entryHitTime: null,
      stopHitTime: null,
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      intrabarAmbiguity: false,
      joinedOutcomeMatchesReplay: null,
      blockers: [],
    };
    return { ...row, joinedOutcomeMatchesReplay: joinedOutcomeMatches(row) };
  }

  const entryHitTime = eligibleBars[entryHitIndex].time;
  const replayBars = eligibleBars.slice(entryHitIndex + 1);
  let stopHitTime: string | null = null;
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let maximumFavorableExcursion = 0;
  let maximumAdverseExcursion = 0;
  let intrabarAmbiguity = false;

  for (const bar of replayBars) {
    maximumFavorableExcursion = Math.max(maximumFavorableExcursion, favorableMove(candidate.direction, bar, entry));
    maximumAdverseExcursion = Math.max(maximumAdverseExcursion, adverseMove(candidate.direction, bar, entry));
    const stopHit = hitsStop(candidate.direction, bar, stop);
    const t1Hit = crosses(candidate.direction, bar, t1);
    const t2Hit = crosses(candidate.direction, bar, t2);
    if (stopHit && (t1Hit || t2Hit)) intrabarAmbiguity = true;
    if (!stopHitTime && stopHit) stopHitTime = bar.time;
    if (!t1HitTime && t1Hit) t1HitTime = bar.time;
    if (!t2HitTime && t2Hit) t2HitTime = bar.time;
  }

  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || timeMs(stopHitTime) <= timeMs(t1HitTime)));
  const outcomeLabel: OutcomeLabel = stopBeforeT1
    ? 'stopped_before_t1'
    : t2HitTime
      ? 't1_and_t2_hit'
      : t1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = outcomeLabel === 'stopped_before_t1'
    ? stop
    : outcomeLabel === 't1_and_t2_hit'
      ? t2
      : outcomeLabel === 't1_hit_only'
        ? t1
        : null;
  const resolvedOneMesPl = exit === null ? null : pointsToPl(candidate.direction, entry, exit);
  const row: OutcomeRow = {
    ...blockedBase,
    outcomeBucket: resolvedOneMesPl === null ? 'unresolved' : outcomeLabel === 'stopped_before_t1' ? 'loss' : 'winner',
    outcomeLabel,
    resolvedOneMesPl,
    resolvedR: resolvedOneMesPl === null ? null : round(resolvedOneMesPl / (riskPoints * POINT_VALUE)),
    entryHitTime,
    stopHitTime,
    t1HitTime,
    t2HitTime,
    maximumFavorableExcursion: round(maximumFavorableExcursion),
    maximumAdverseExcursion: round(maximumAdverseExcursion),
    intrabarAmbiguity,
    joinedOutcomeMatchesReplay: null,
    blockers: [],
  };
  return { ...row, joinedOutcomeMatchesReplay: joinedOutcomeMatches(row) };
}

function groupRows(rows: OutcomeRow[], mode: 'model' | 'daySessionModel'): GroupSummary[] {
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const key = mode === 'model' ? row.setupType : `${row.tradeDate}|${row.session}|${row.setupType}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([groupId, group]) => {
    const [tradeDate, session, setupType] = mode === 'model' ? [null, null, groupId] : groupId.split('|');
    return {
      groupId,
      tradeDate,
      session,
      setupType,
      rows: group.length,
      winners: group.filter((row) => row.outcomeBucket === 'winner').length,
      losses: group.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: group.filter((row) => row.outcomeBucket === 'unresolved').length,
      blocked: group.filter((row) => row.outcomeBucket === 'blocked').length,
      grossResolvedOneMesPl: sumResolved(group),
    };
  }).sort((a, b) => a.groupId.localeCompare(b.groupId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport, 'markdown'>): string {
  return [
    '# Publishable Candidate Replay Outcome Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only outcome package from saved publishable candidates and completed 5M scanner decision tapes. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change runtime behavior.',
    '',
    '## Summary',
    `- Selected rows read: ${report.summary.selectedRowsRead}.`,
    `- Package rows: ${report.summary.packageRows}.`,
    `- Local tape rows: ${report.summary.rowsWithLocalTapeBars}.`,
    `- Rows with bars after proof: ${report.summary.rowsWithBarsAfterProof}.`,
    `- Publish canExecute true rows: ${report.summary.publishCanExecuteTrueRows}.`,
    `- W/L/U/B: ${report.summary.winnerRows}/${report.summary.lossRows}/${report.summary.unresolvedRows}/${report.summary.blockedRows}.`,
    `- T1+T2/T1-only/stopped/no-fill/no-target-stop: ${report.summary.t1AndT2Rows}/${report.summary.t1OnlyRows}/${report.summary.stoppedBeforeT1Rows}/${report.summary.noFillRows}/${report.summary.noTargetOrStopRows}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Joined outcome comparison: compared=${report.summary.joinedOutcomeComparedRows}, matches=${report.summary.joinedOutcomeMatchRows}, mismatches=${report.summary.joinedOutcomeMismatchRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Model Groups',
    '| Model | Rows | W/L/U/B | P/L |',
    '|---|---:|---|---:|',
    ...report.summary.modelGroups.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Day / Session / Model Groups',
    '| Date | Session | Model | Rows | W/L/U/B | P/L |',
    '|---|---|---|---:|---|---:|',
    ...report.summary.daySessionModelGroups.map((row) => `| ${row.tradeDate || '-'} | ${row.session || '-'} | ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Rows',
    '| Ticket | Setup | Session | Side | Outcome | P/L | Entry Hit | Stop | T1 | T2 | MFE | MAE | Joined Match |',
    '|---|---|---|---|---|---:|---|---|---|---|---:|---:|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${escapeTable(row.session)} | ${row.direction} | ${row.outcomeLabel} | ${row.resolvedOneMesPl ?? '-'} | ${row.entryHitTime ?? '-'} | ${row.stopHitTime ?? '-'} | ${row.t1HitTime ?? '-'} | ${row.t2HitTime ?? '-'} | ${row.maximumFavorableExcursion ?? '-'} | ${row.maximumAdverseExcursion ?? '-'} | ${row.joinedOutcomeMatchesReplay ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport(args: {
  candidateMinerPath: string | null;
  candidateMinerReport: { selectedReplayPackage?: unknown } | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport {
  const selected = selectedRows(args.candidateMinerReport);
  const rows = selected.map((row) => buildOutcomeRow(row, args.auditDir));
  const joinedCompared = rows.filter((row) => row.joinedOutcomeMatchesReplay !== null);
  const blockers = [
    !args.candidateMinerPath ? 'missing publishable candidate miner path' : null,
    !args.candidateMinerReport ? 'missing publishable candidate miner report' : null,
    selected.length === 0 ? 'candidate miner report has no selected replay package rows' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_publishable_candidate_replay_outcome_package',
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
      usesSavedScannerDecisionTapesOnly: true,
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
      candidateMinerPath: args.candidateMinerPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      selectedRowsComeFromPublishableCandidateMiner: true,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      outcomeIsResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: selected.length,
      packageRows: rows.length,
      rowsWithLocalTapeBars: rows.filter((row) => row.barsLoaded > 0).length,
      rowsWithBarsAfterProof: rows.filter((row) => row.barsAfterProof > 0).length,
      publishCanExecuteTrueRows: rows.filter((row) => row.publishCanExecute).length,
      resolvedRows: rows.filter((row) => row.outcomeBucket === 'winner' || row.outcomeBucket === 'loss').length,
      winnerRows: rows.filter((row) => row.outcomeBucket === 'winner').length,
      lossRows: rows.filter((row) => row.outcomeBucket === 'loss').length,
      unresolvedRows: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      blockedRows: rows.filter((row) => row.outcomeBucket === 'blocked').length,
      noFillRows: rows.filter((row) => row.outcomeLabel === 'no_fill').length,
      noTargetOrStopRows: rows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      t1OnlyRows: rows.filter((row) => row.outcomeLabel === 't1_hit_only').length,
      t1AndT2Rows: rows.filter((row) => row.outcomeLabel === 't1_and_t2_hit').length,
      stoppedBeforeT1Rows: rows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      grossResolvedOneMesPl: sumResolved(rows),
      joinedOutcomeComparedRows: joinedCompared.length,
      joinedOutcomeMatchRows: joinedCompared.filter((row) => row.joinedOutcomeMatchesReplay).length,
      joinedOutcomeMismatchRows: joinedCompared.filter((row) => row.joinedOutcomeMatchesReplay === false).length,
      modelGroups: groupRows(rows, 'model'),
      daySessionModelGroups: groupRows(rows, 'daySessionModel'),
      livePromotionAllowedRows: 0,
      recommendation: !args.candidateMinerPath || !args.candidateMinerReport
        ? 'fix_missing_candidate_miner_report'
        : blockers.length
          ? 'refresh_missing_local_tape_evidence'
          : 'use_as_research_evidence_for_next_rank_overlay',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this package for rank-overlay research until missing local tape or geometry blockers are cleared.']
      : [
        'Use this selected-24 outcome package as research evidence only.',
        'Keep Discord, Supabase, bridge behavior, canExecute, ranking, entry, stop, target, and risk unchanged until a separate approved runtime proposal exists.',
        'Next narrow phase should compare the resolved selected-24 rows against the remaining publishable unresolved rows to separate model edge from missing outcome coverage.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport(
  report: UnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-publishable-candidate-replay-outcome-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const candidateMinerPath = readFlag(args, '--candidate-miner') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-publishable-candidate-miner-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport({
    candidateMinerPath,
    candidateMinerReport: readJson<{ selectedReplayPackage?: unknown }>(candidateMinerPath),
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport(report, outDir);
  if (args.includes('--json')) {
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
    runUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
