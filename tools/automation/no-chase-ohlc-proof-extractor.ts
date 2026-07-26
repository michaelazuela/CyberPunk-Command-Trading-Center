import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook, type UnifiedDeskCandidateBookItem } from '../../src/lib/unifiedDeskCandidateBook';
import { SetupType, type SetupCandidate } from '../../src/types';
import { loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir, type UnifiedDeskCandidateDiagnosticSnapshot } from './unified-desk-candidate-book-diagnostic';

type ReplaySession = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch' | 'replay_evening';
type ProofSetup = SetupType.NoSetup | SetupType.NoSetup;
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type ReplayOutcome = 'T2_HIT' | 'T1_THEN_STOP' | 'T1_HIT_OPEN_RUNNER' | 'STOP_HIT' | 'NO_FILL' | 'FILLED_OPEN' | 'AMBIGUOUS' | 'NOT_REPLAYED';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface NoChaseObservation {
  snapshotId: string;
  tradeDate: string;
  sessionType: ReplaySession;
  completedBarTime: string | null;
  setupType: ProofSetup;
  direction: 'LONG' | 'SHORT';
  item: UnifiedDeskCandidateBookItem;
}

export interface NoChaseOhlcProofCase {
  caseId: string;
  tradeDate: string;
  sessionType: ReplaySession;
  setupType: ProofSetup;
  direction: 'LONG' | 'SHORT';
  firstNoChaseSnapshotId: string;
  firstNoChaseTime: string | null;
  noChaseCount: number;
  referenceLevel: number | null;
  referenceSource: 'htf_line_in_sand' | 'entry' | 'missing';
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  futureBarsChecked: number;
  proofStatus: 'ohlc_proof_found' | 'no_local_ohlc_proof' | 'missing_reference_level' | 'missing_future_bars';
  proofType: 'completed_5m_close_through' | 'completed_5m_retest_hold' | null;
  proofBarTime: string | null;
  proofBar: OhlcBar | null;
  reviewClassification: 'reviewable_full_plan' | 'proof_only_missing_plan_fields' | 'not_reviewable_no_ohlc_proof';
  reviewBlockers: string[];
  replayOutcome: ReplayOutcome;
  replayFillTime: string | null;
  replayOutcomeTime: string | null;
  replayPoints: number;
  replayOneMesGross: number;
  blocker: string | null;
  recommendation: string;
}

export interface NoChaseOhlcProofExtractorReport {
  reportType: 'no_chase_ohlc_proof_extractor';
  generatedAt: string;
  authority: {
    readOnly: true;
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
  };
  scope: {
    setupTypes: ProofSetup[];
    startDate: string | null;
    endDate: string | null;
    auditDir: string;
    marketBarsJson: string | null;
    tolerancePoints: number;
    sourcePreference: ['local_market_bars_json', 'scanner_decision_tape_completed_5m'];
  };
  summary: {
    snapshotsAudited: number;
    noChaseCases: number;
    ohlcProofFound: number;
    noLocalOhlcProof: number;
    missingReferenceLevel: number;
    missingFutureBars: number;
    intradayCases: number;
    intradayProofFound: number;
    afterLunchCases: number;
    afterLunchProofFound: number;
    reviewableFullPlan: number;
    proofOnlyMissingPlanFields: number;
    notReviewableNoOhlcProof: number;
    replayedFullPlanCases: number;
    replayWins: number;
    replayLosses: number;
    replayNoFill: number;
    replayAmbiguous: number;
    replayGrossOneMes: number;
    fiveMinuteBarsLoaded: number;
    fiveMinuteSource: 'local_market_bars_json' | 'scanner_decision_tape_completed_5m' | 'missing';
  };
  cases: NoChaseOhlcProofCase[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_SETUPS: ProofSetup[] = [
  SetupType.NoSetup,
  SetupType.NoSetup,
];
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const MES_DOLLARS_PER_POINT = 5;
const TRADE_TICK = 0.25;
const SESSIONS: ReplaySession[] = ['morning', 'lunch', 'evening'];
const SESSION_WINDOWS: Record<ReplaySession, { start: number; end: number }> = {
  morning: { start: 9 * 60 + 15, end: 12 * 60 },
  lunch: { start: 12 * 60, end: 16 * 60 },
  evening: { start: 18 * 60 + 45, end: 22 * 60 + 15 },
  replay_morning: { start: 9 * 60 + 15, end: 12 * 60 },
  replay_lunch: { start: 12 * 60, end: 16 * 60 },
  replay_evening: { start: 18 * 60 + 45, end: 22 * 60 + 15 },
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  const volume = finiteNumber(record.volume);
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
}

function timeMs(value: string | null | undefined): number {
  const normalized = normalizeTime(value);
  if (!normalized) return 0;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutesEt(time: string): number | null {
  const match = time.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function inSession(bar: OhlcBar, date: string, session: ReplaySession): boolean {
  if (bar.time.slice(0, 10) !== date) return false;
  const minutes = minutesEt(bar.time);
  if (minutes === null) return false;
  const window = SESSION_WINDOWS[session];
  return minutes >= window.start && minutes < window.end;
}

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function loadLocalMarketBars5m(marketBarsJson: string | null): OhlcBar[] {
  if (!marketBarsJson) return [];
  const raw = JSON.parse(fs.readFileSync(marketBarsJson, 'utf8')) as unknown;
  const root = asRecord(raw);
  const grouped = asRecord(root.bars || root.timeframes || root);
  const rows = Array.isArray(grouped['5m'])
    ? grouped['5m'] as unknown[]
    : Array.isArray(raw)
      ? raw.filter((row) => asRecord(row).timeframe === '5m')
      : [];
  return uniqueSortedBars(rows.map(normalizeBar).filter((bar): bar is OhlcBar => Boolean(bar)));
}

function decisionTapePath(auditDir: string, instrument: string, date: string, session: ReplaySession): string {
  const liveSession = session.replace(/^replay_/, '') as 'morning' | 'lunch' | 'evening';
  return path.join(auditDir, `scanner-decision-tape-${date}-${instrument}-${liveSession}.json`);
}

function loadDecisionTape5m(args: { auditDir: string; instrument: string; startDate: string; endDate: string }): OhlcBar[] {
  const bars: OhlcBar[] = [];
  for (const date of dateRange(args.startDate, args.endDate)) {
    for (const session of SESSIONS) {
      const file = decisionTapePath(args.auditDir, args.instrument, date, session);
      if (!fs.existsSync(file)) continue;
      try {
        const tape = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
        for (const event of Object.values(asRecord(asRecord(tape).events))) {
          const bar = normalizeBar(asRecord(event).completed5m);
          if (bar) bars.push(bar);
        }
      } catch {
        // Malformed tape files are ignored in this extractor; missing proof remains blocked.
      }
    }
  }
  return uniqueSortedBars(bars);
}

function uniqueSortedBars(bars: OhlcBar[]): OhlcBar[] {
  const byTime = new Map<string, OhlcBar>();
  for (const bar of bars) byTime.set(bar.time, bar);
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function loadFiveMinuteBars(args: {
  auditDir: string;
  instrument: string;
  startDate: string;
  endDate: string;
  marketBarsJson: string | null;
}): { bars: OhlcBar[]; source: NoChaseOhlcProofExtractorReport['summary']['fiveMinuteSource'] } {
  const local = loadLocalMarketBars5m(args.marketBarsJson);
  if (local.length) return { bars: local, source: 'local_market_bars_json' };
  const tape = loadDecisionTape5m(args);
  return { bars: tape, source: tape.length ? 'scanner_decision_tape_completed_5m' : 'missing' };
}

function observationKey(observation: Pick<NoChaseObservation, 'tradeDate' | 'sessionType' | 'setupType' | 'direction'>): string {
  return [observation.tradeDate, observation.sessionType, observation.setupType, observation.direction].join('|');
}

function compareObservation(a: NoChaseObservation, b: NoChaseObservation): number {
  return (a.completedBarTime || '').localeCompare(b.completedBarTime || '') ||
    a.snapshotId.localeCompare(b.snapshotId);
}

function noChaseObservations(snapshots: UnifiedDeskCandidateDiagnosticSnapshot[]): NoChaseObservation[] {
  const observations: NoChaseObservation[] = [];
  for (const snapshot of snapshots) {
    const book = buildUnifiedDeskCandidateBook({
      candidates: snapshot.candidates,
      sessionType: snapshot.sessionType,
      completedBarTime: snapshot.completedBarTime,
    });
    for (const item of book.candidates) {
      if (item.state !== 'no_chase') continue;
      if (!TARGET_SETUPS.includes(item.setupType as ProofSetup)) continue;
      if (item.direction !== 'LONG' && item.direction !== 'SHORT') continue;
      observations.push({
        snapshotId: snapshot.snapshotId,
        tradeDate: snapshot.tradeDate || 'unknown',
        sessionType: snapshot.sessionType,
        completedBarTime: snapshot.completedBarTime || null,
        setupType: item.setupType as ProofSetup,
        direction: item.direction,
        item,
      });
    }
  }
  return observations.sort(compareObservation);
}

function referenceLevel(candidate: SetupCandidate, item: UnifiedDeskCandidateBookItem): Pick<NoChaseOhlcProofCase, 'referenceLevel' | 'referenceSource'> {
  const line = finiteNumber(candidate.activeRuleset?.htfLineInSand?.lineInSand);
  if (line !== null) return { referenceLevel: line, referenceSource: 'htf_line_in_sand' };
  if (item.entry !== null) return { referenceLevel: item.entry, referenceSource: 'entry' };
  return { referenceLevel: null, referenceSource: 'missing' };
}

function barsAfterNoChase(args: {
  bars: OhlcBar[];
  tradeDate: string;
  sessionType: ReplaySession;
  firstNoChaseTime: string | null;
}): OhlcBar[] {
  const cutoff = timeMs(args.firstNoChaseTime);
  return args.bars.filter((bar) =>
    inSession(bar, args.tradeDate, args.sessionType) &&
    (!cutoff || timeMs(bar.time) > cutoff)
  );
}

function findProof(args: {
  bars: OhlcBar[];
  direction: 'LONG' | 'SHORT';
  referenceLevel: number;
  tolerancePoints: number;
}): Pick<NoChaseOhlcProofCase, 'proofType' | 'proofBarTime' | 'proofBar'> {
  let priorAccepted = false;
  for (const bar of args.bars) {
    if (args.direction === 'LONG') {
      if (!priorAccepted && bar.close > args.referenceLevel) {
        return { proofType: 'completed_5m_close_through', proofBarTime: bar.time, proofBar: bar };
      }
      if (priorAccepted && bar.low <= args.referenceLevel + args.tolerancePoints && bar.close > args.referenceLevel) {
        return { proofType: 'completed_5m_retest_hold', proofBarTime: bar.time, proofBar: bar };
      }
      priorAccepted = priorAccepted || bar.close > args.referenceLevel;
    } else {
      if (!priorAccepted && bar.close < args.referenceLevel) {
        return { proofType: 'completed_5m_close_through', proofBarTime: bar.time, proofBar: bar };
      }
      if (priorAccepted && bar.high >= args.referenceLevel - args.tolerancePoints && bar.close < args.referenceLevel) {
        return { proofType: 'completed_5m_retest_hold', proofBarTime: bar.time, proofBar: bar };
      }
      priorAccepted = priorAccepted || bar.close < args.referenceLevel;
    }
  }
  return { proofType: null, proofBarTime: null, proofBar: null };
}

function replayOutcomeForCase(args: {
  item: Pick<NoChaseOhlcProofCase, 'reviewClassification' | 'direction' | 'entry' | 'stop' | 'target1' | 'target2' | 'proofBarTime' | 'proofBar'>;
  bars: OhlcBar[];
}): Pick<NoChaseOhlcProofCase, 'replayOutcome' | 'replayFillTime' | 'replayOutcomeTime' | 'replayPoints' | 'replayOneMesGross'> {
  const item = args.item;
  if (
    item.reviewClassification !== 'reviewable_full_plan' ||
    item.entry === null ||
    item.stop === null ||
    item.target1 === null ||
    item.target2 === null ||
    !item.proofBarTime
  ) {
    return { replayOutcome: 'NOT_REPLAYED', replayFillTime: null, replayOutcomeTime: null, replayPoints: 0, replayOneMesGross: 0 };
  }
  const startIndex = args.bars.findIndex((bar) => bar.time === item.proofBarTime);
  const futureBars = args.bars.slice(Math.max(0, startIndex + 1));
  const proofClose = item.proofBar?.close ?? null;
  let filled = proofClose !== null && Math.abs(proofClose - item.entry) <= TRADE_TICK;
  let fillTime = filled ? item.proofBarTime : null;
  let t1Hit = false;
  let t1Time: string | null = null;
  for (const bar of futureBars) {
    if (!filled) {
      if (bar.low <= item.entry && bar.high >= item.entry) {
        filled = true;
        fillTime = bar.time;
      } else {
        continue;
      }
    }
    const stopHit = item.direction === 'LONG' ? bar.low <= item.stop : bar.high >= item.stop;
    const t1Touched = item.direction === 'LONG' ? bar.high >= item.target1 : bar.low <= item.target1;
    const t2Touched = item.direction === 'LONG' ? bar.high >= item.target2 : bar.low <= item.target2;
    if (stopHit && (t1Touched || t2Touched)) {
      return { replayOutcome: 'AMBIGUOUS', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayPoints: 0, replayOneMesGross: 0 };
    }
    if (t2Touched) {
      const points = Math.abs(item.target2 - item.entry);
      return { replayOutcome: 'T2_HIT', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayPoints: points, replayOneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
    }
    if (t1Touched) {
      t1Hit = true;
      t1Time = t1Time || bar.time;
    }
    if (stopHit) {
      if (t1Hit) {
        const points = Math.abs(item.target1 - item.entry);
        return { replayOutcome: 'T1_THEN_STOP', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayPoints: points, replayOneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
      }
      const points = -Math.abs(item.entry - item.stop);
      return { replayOutcome: 'STOP_HIT', replayFillTime: fillTime, replayOutcomeTime: bar.time, replayPoints: points, replayOneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
    }
  }
  if (t1Hit) {
    const points = Math.abs(item.target1 - item.entry);
    return { replayOutcome: 'T1_HIT_OPEN_RUNNER', replayFillTime: fillTime, replayOutcomeTime: t1Time, replayPoints: points, replayOneMesGross: roundCurrency(points * MES_DOLLARS_PER_POINT) };
  }
  return filled
    ? { replayOutcome: 'FILLED_OPEN', replayFillTime: fillTime, replayOutcomeTime: null, replayPoints: 0, replayOneMesGross: 0 }
    : { replayOutcome: 'NO_FILL', replayFillTime: null, replayOutcomeTime: null, replayPoints: 0, replayOneMesGross: 0 };
}

function planFieldBlockers(item: Pick<NoChaseOhlcProofCase, 'direction' | 'entry' | 'stop' | 'target1' | 'target2'>): string[] {
  const blockers: string[] = [];
  if (item.entry === null) blockers.push('missing entry');
  if (item.stop === null) blockers.push('missing stop');
  if (item.target1 === null) blockers.push('missing T1');
  if (item.target2 === null) blockers.push('missing T2');
  if (blockers.length) return blockers;
  if (item.direction === 'LONG') {
    if (!(item.stop < item.entry && item.entry < item.target1 && item.target1 <= item.target2)) {
      blockers.push('directionally invalid long entry/stop/target geometry');
    }
  } else if (!(item.stop > item.entry && item.entry > item.target1 && item.target1 >= item.target2)) {
    blockers.push('directionally invalid short entry/stop/target geometry');
  }
  return blockers;
}

function reviewClassificationFor(item: Pick<NoChaseOhlcProofCase, 'proofStatus' | 'direction' | 'entry' | 'stop' | 'target1' | 'target2'>): Pick<NoChaseOhlcProofCase, 'reviewClassification' | 'reviewBlockers'> {
  if (item.proofStatus !== 'ohlc_proof_found') {
    return { reviewClassification: 'not_reviewable_no_ohlc_proof', reviewBlockers: ['no local completed 5M OHLC proof'] };
  }
  const blockers = planFieldBlockers(item);
  return blockers.length
    ? { reviewClassification: 'proof_only_missing_plan_fields', reviewBlockers: blockers }
    : { reviewClassification: 'reviewable_full_plan', reviewBlockers: [] };
}

function recommendationFor(item: Pick<NoChaseOhlcProofCase, 'proofStatus' | 'proofType' | 'reviewClassification'>): string {
  if (item.reviewClassification === 'reviewable_full_plan') {
    return 'Local completed 5M OHLC proof and full plan fields are present. Eligible for manual replay review of scanner artifact rebuild only.';
  }
  if (item.reviewClassification === 'proof_only_missing_plan_fields') {
    return 'Local completed 5M OHLC proof exists, but the no-chase artifact is missing a full valid plan. Do not create a ticket without rebuild validation.';
  }
  if (item.proofStatus === 'ohlc_proof_found') {
    return 'Local completed 5M OHLC shows later proof. Investigate scanner artifact capture; do not wire live behavior from this extractor alone.';
  }
  if (item.proofStatus === 'missing_reference_level') return 'Candidate has no usable entry or line-in-the-sand reference. Keep no-chase blocked.';
  if (item.proofStatus === 'missing_future_bars') return 'No later completed 5M bars were available locally for this session. Keep blocked or approve a controlled data-load phase.';
  return 'No later completed 5M close-through or retest-hold proof was found locally. Keep no-chase blocked.';
}

function buildCase(args: {
  group: NoChaseObservation[];
  bars: OhlcBar[];
  tolerancePoints: number;
}): NoChaseOhlcProofCase {
  const first = args.group[0];
  const ref = referenceLevel(first.item.sourceCandidate, first.item);
  const futureBars = barsAfterNoChase({
    bars: args.bars,
    tradeDate: first.tradeDate,
    sessionType: first.sessionType,
    firstNoChaseTime: first.completedBarTime,
  });
  const proof = ref.referenceLevel === null
    ? { proofType: null, proofBarTime: null, proofBar: null }
    : findProof({
      bars: futureBars,
      direction: first.direction,
      referenceLevel: ref.referenceLevel,
      tolerancePoints: args.tolerancePoints,
    });
  const proofStatus: NoChaseOhlcProofCase['proofStatus'] = ref.referenceLevel === null
    ? 'missing_reference_level'
    : !futureBars.length
      ? 'missing_future_bars'
      : proof.proofType
        ? 'ohlc_proof_found'
        : 'no_local_ohlc_proof';
  const reviewInput = {
    proofStatus,
    direction: first.direction,
    entry: first.item.entry,
    stop: first.item.stop,
    target1: first.item.target1,
    target2: first.item.target2,
  };
  const review = reviewClassificationFor(reviewInput);
  const replay = replayOutcomeForCase({
    item: {
      reviewClassification: review.reviewClassification,
      direction: first.direction,
      entry: first.item.entry,
      stop: first.item.stop,
      target1: first.item.target1,
      target2: first.item.target2,
      proofBarTime: proof.proofBarTime,
      proofBar: proof.proofBar,
    },
    bars: futureBars,
  });
  const base = {
    caseId: observationKey(first),
    tradeDate: first.tradeDate,
    sessionType: first.sessionType,
    setupType: first.setupType,
    direction: first.direction,
    firstNoChaseSnapshotId: first.snapshotId,
    firstNoChaseTime: first.completedBarTime,
    noChaseCount: args.group.length,
    ...ref,
    entry: first.item.entry,
    stop: first.item.stop,
    target1: first.item.target1,
    target2: first.item.target2,
    futureBarsChecked: futureBars.length,
    proofStatus,
    proofType: proof.proofType,
    proofBarTime: proof.proofBarTime,
    proofBar: proof.proofBar,
    ...review,
    ...replay,
    blocker: proofStatus === 'ohlc_proof_found' ? null : recommendationFor({ proofStatus, proofType: null, reviewClassification: review.reviewClassification }),
  };
  return { ...base, recommendation: recommendationFor(base) };
}

function buildRecommendations(report: Omit<NoChaseOhlcProofExtractorReport, 'recommendations' | 'markdown'>): string[] {
  const lines = [
    'This extractor is research-only. It must not create canExecute, Discord tickets, or scanner promotions.',
    'Keep historicalReview and NoInstalledSetup out of scope for this phase.',
  ];
  if (report.summary.ohlcProofFound > 0) {
    lines.push('Review only proof-found cases classified as reviewable_full_plan before considering scanner artifact rebuild logic.');
  }
  if (report.summary.proofOnlyMissingPlanFields > 0) {
    lines.push('Proof-only cases with missing plan fields must not become tickets until scanner rebuild validation can produce entry, stop, T1, and T2.');
  } else {
    lines.push('No local OHLC proof was found for target no-chase cases; keep the current no-chase block intact.');
  }
  if (report.summary.fiveMinuteSource === 'scanner_decision_tape_completed_5m') {
    lines.push('Decision-tape OHLC is 5M-only; a stronger follow-up can use canonical market_bars JSON with HTF frames, still read-only.');
  }
  if (report.summary.replayedFullPlanCases > 0) {
    lines.push('Use replay P/L as research triage only; it excludes commissions/slippage and does not validate live execution approval.');
  }
  return lines;
}

function buildMarkdown(report: Omit<NoChaseOhlcProofExtractorReport, 'markdown'>): string {
  const lines = [
    '# No-Chase OHLC Proof Extractor',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Snapshots audited: ${report.summary.snapshotsAudited}.`,
    `- No-chase cases: ${report.summary.noChaseCases}.`,
    `- Local OHLC proof found: ${report.summary.ohlcProofFound}.`,
    `- No local OHLC proof: ${report.summary.noLocalOhlcProof}.`,
    `- Missing future bars: ${report.summary.missingFutureBars}.`,
    `- Missing reference level: ${report.summary.missingReferenceLevel}.`,
    `- Intraday MSS cases/proof found: ${report.summary.intradayCases}/${report.summary.intradayProofFound}.`,
    `- After-lunch FVG cases/proof found: ${report.summary.afterLunchCases}/${report.summary.afterLunchProofFound}.`,
    `- Reviewable full-plan cases: ${report.summary.reviewableFullPlan}.`,
    `- Proof-only missing-plan cases: ${report.summary.proofOnlyMissingPlanFields}.`,
    `- Not reviewable / no OHLC proof: ${report.summary.notReviewableNoOhlcProof}.`,
    `- Replayed full-plan cases: ${report.summary.replayedFullPlanCases}; wins/losses/no-fill/ambiguous: ${report.summary.replayWins}/${report.summary.replayLosses}/${report.summary.replayNoFill}/${report.summary.replayAmbiguous}.`,
    `- Replayed one-MES gross P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    `- 5M bars loaded: ${report.summary.fiveMinuteBarsLoaded} from ${report.summary.fiveMinuteSource}.`,
    '',
    '## Cases',
    '| Date | Session | Setup | Side | Ref | Status | Review Class | Proof Time | Replay Outcome | Replay P/L | Recommendation |',
    '|---|---|---|---|---:|---|---|---|---|---:|---|',
    ...report.cases.map((item) => `| ${item.tradeDate} | ${item.sessionType} | ${item.setupType} | ${item.direction} | ${item.referenceLevel ?? '-'} | ${item.proofStatus} | ${item.reviewClassification} | ${item.proofBarTime || '-'} | ${item.replayOutcome}${item.replayOutcomeTime ? ` @ ${item.replayOutcomeTime}` : ''} | $${item.replayOneMesGross.toFixed(2)} | ${item.recommendation} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildNoChaseOhlcProofExtractorReport(args: {
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[];
  bars: OhlcBar[];
  auditDir: string;
  marketBarsJson?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tolerancePoints?: number;
  fiveMinuteSource?: NoChaseOhlcProofExtractorReport['summary']['fiveMinuteSource'];
}, generatedAt = new Date().toISOString()): NoChaseOhlcProofExtractorReport {
  const tolerancePoints = args.tolerancePoints ?? 0.25;
  const observations = noChaseObservations(args.snapshots);
  const grouped = new Map<string, NoChaseObservation[]>();
  for (const observation of observations) {
    const key = observationKey(observation);
    grouped.set(key, [...(grouped.get(key) || []), observation]);
  }
  const cases = [...grouped.values()]
    .map((group) => buildCase({ group, bars: args.bars, tolerancePoints }))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.sessionType.localeCompare(b.sessionType) || a.setupType.localeCompare(b.setupType));
  const withoutRecommendationsAndMarkdown: Omit<NoChaseOhlcProofExtractorReport, 'recommendations' | 'markdown'> = {
    reportType: 'no_chase_ohlc_proof_extractor',
    generatedAt,
    authority: {
      readOnly: true,
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
    },
    scope: {
      setupTypes: TARGET_SETUPS,
      startDate: args.startDate || null,
      endDate: args.endDate || null,
      auditDir: args.auditDir,
      marketBarsJson: args.marketBarsJson || null,
      tolerancePoints,
      sourcePreference: ['local_market_bars_json', 'scanner_decision_tape_completed_5m'],
    },
    summary: {
      snapshotsAudited: args.snapshots.length,
      noChaseCases: cases.length,
      ohlcProofFound: cases.filter((item) => item.proofStatus === 'ohlc_proof_found').length,
      noLocalOhlcProof: cases.filter((item) => item.proofStatus === 'no_local_ohlc_proof').length,
      missingReferenceLevel: cases.filter((item) => item.proofStatus === 'missing_reference_level').length,
      missingFutureBars: cases.filter((item) => item.proofStatus === 'missing_future_bars').length,
      intradayCases: cases.filter((item) => item.setupType === SetupType.NoSetup).length,
      intradayProofFound: cases.filter((item) => item.setupType === SetupType.NoSetup && item.proofStatus === 'ohlc_proof_found').length,
      afterLunchCases: cases.filter((item) => item.setupType === SetupType.NoSetup).length,
      afterLunchProofFound: cases.filter((item) => item.setupType === SetupType.NoSetup && item.proofStatus === 'ohlc_proof_found').length,
      reviewableFullPlan: cases.filter((item) => item.reviewClassification === 'reviewable_full_plan').length,
      proofOnlyMissingPlanFields: cases.filter((item) => item.reviewClassification === 'proof_only_missing_plan_fields').length,
      notReviewableNoOhlcProof: cases.filter((item) => item.reviewClassification === 'not_reviewable_no_ohlc_proof').length,
      replayedFullPlanCases: cases.filter((item) => item.reviewClassification === 'reviewable_full_plan').length,
      replayWins: cases.filter((item) => item.reviewClassification === 'reviewable_full_plan' && /T1|T2/.test(item.replayOutcome)).length,
      replayLosses: cases.filter((item) => item.reviewClassification === 'reviewable_full_plan' && item.replayOutcome === 'STOP_HIT').length,
      replayNoFill: cases.filter((item) => item.reviewClassification === 'reviewable_full_plan' && item.replayOutcome === 'NO_FILL').length,
      replayAmbiguous: cases.filter((item) => item.reviewClassification === 'reviewable_full_plan' && item.replayOutcome === 'AMBIGUOUS').length,
      replayGrossOneMes: roundCurrency(cases
        .filter((item) => item.reviewClassification === 'reviewable_full_plan')
        .reduce((sum, item) => sum + item.replayOneMesGross, 0)),
      fiveMinuteBarsLoaded: args.bars.length,
      fiveMinuteSource: args.fiveMinuteSource || (args.bars.length ? 'local_market_bars_json' : 'missing'),
    },
    cases,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeNoChaseOhlcProofExtractorReport(report: NoChaseOhlcProofExtractorReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-ohlc-proof-extractor-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runNoChaseOhlcProofExtractorCli(args = process.argv.slice(2)): Promise<void> {
  const auditDir = readFlag(args, '--audit-dir') || readFlag(args, '--input-dir') || DEFAULT_AUDIT_DIR;
  const startDate = readFlag(args, '--start-date') || '2026-06-01';
  const endDate = readFlag(args, '--end-date') || '2026-07-02';
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const marketBarsJson = readFlag(args, '--market-bars-json');
  const tolerancePoints = finiteNumber(readFlag(args, '--tolerance-points')) ?? 0.25;
  const snapshots = loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(auditDir, { startDate, endDate });
  const loaded = loadFiveMinuteBars({ auditDir, instrument, startDate, endDate, marketBarsJson });
  const report = buildNoChaseOhlcProofExtractorReport({
    snapshots,
    bars: loaded.bars,
    auditDir,
    marketBarsJson,
    startDate,
    endDate,
    tolerancePoints,
    fiveMinuteSource: loaded.source,
  });
  const paths = writeNoChaseOhlcProofExtractorReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runNoChaseOhlcProofExtractorCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
