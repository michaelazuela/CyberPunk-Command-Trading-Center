import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  resolveDiscordRagPersistenceConfig,
  upsertDiscordAlertRagPayload,
} from './discord-rag-persistence';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Direction = 'LONG' | 'SHORT';
type Outcome = 'T2_HIT' | 'T1_HIT' | 'STOP_HIT' | 'AMBIGUOUS' | 'OPEN' | 'NO_PLAN';

interface Candle5m {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ScannerTapeEvent {
  time?: string;
  recordedAt?: string;
  completed5m?: Partial<Candle5m>;
  currentPrice?: number;
  setupCandidateStatus?: {
    selected?: {
      setupType?: string;
      scenarioLabel?: string | null;
      direction?: string;
      candidateState?: string | null;
      blockReason?: string | null;
      requiredTrigger?: string | null;
      nextAction?: string | null;
    } | null;
  };
  plan?: {
    planVersionId?: string;
    decision?: string;
    decisionStatus?: string;
    entry?: number | null;
    stop?: number | null;
    t1?: number | null;
    t2?: number | null;
    riskPoints?: number | null;
    canExecute?: boolean;
  };
  visibility?: {
    visibilityMode?: string;
    discordAction?: string;
    suppressionReason?: string | null;
    holdWithReason?: string | null;
  };
  deskState?: {
    lineInSand?: number | null;
    htfContextStatus?: string | null;
    dataQualityStatus?: string | null;
  };
}

interface ScannerDecisionTape {
  reportType?: string;
  tradeDate?: string;
  instrument?: string;
  session?: string;
  events?: Record<string, ScannerTapeEvent>;
}

export interface LearningCandidate {
  time: string;
  setupType: string;
  direction: Direction;
  candidateState: string | null;
  lineInSand: number | null;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcome: Outcome;
  outcomeTime: string | null;
  oneMesGross: number;
  discordAction: string | null;
  suppressionReason: string | null;
  lesson: string;
}

export interface SourceTapeQuality {
  status: 'usable' | 'data_limited';
  validCompleted5mBars: number;
  malformedCompleted5mBars: number;
  eventCount: number;
  maxGapMinutes: number | null;
  blockers: string[];
  warnings: string[];
}

export interface DailyBarByBarLearningExtract {
  reportType: 'daily_bar_by_bar_learning_extract';
  generatedAt: string;
  sourceTapePath: string;
  tradeDate: string;
  instrument: string;
  session: string;
  cadence: {
    postSessionReview: string;
    lessonUsage: string;
    liveRuleBoundary: string;
  };
  summary: {
    eventCount: number;
    candidateCount: number;
    bestCandidate: LearningCandidate | null;
    lessons: string[];
    sourceTapeQuality: SourceTapeQuality;
  };
  candidates: LearningCandidate[];
  ragPersistence?: {
    attempted: boolean;
    status: 'skipped_missing_env' | 'skipped_data_limited' | 'inserted' | 'updated' | 'failed';
    reason?: string;
    planVersionId?: string;
  };
}

const MES_DOLLARS_PER_POINT = 5;

function isDirection(value: unknown): value is Direction {
  return value === 'LONG' || value === 'SHORT';
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeCandle(value: Partial<Candle5m> | undefined): Candle5m | null {
  if (!value?.time) return null;
  const open = finiteNumber(value.open);
  const high = finiteNumber(value.high);
  const low = finiteNumber(value.low);
  const close = finiteNumber(value.close);
  if (open === null || high === null || low === null || close === null) return null;
  if (high < low || high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return { time: value.time, open, high, low, close, volume: finiteNumber(value.volume) ?? undefined };
}

function parseEtLikeTime(value: string): number | null {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const ms = Date.parse(normalized.replace(/\.0000000$/, ''));
  return Number.isFinite(ms) ? ms : null;
}

function evaluateSourceTapeQuality(args: {
  tape: ScannerDecisionTape;
  entries: Array<[string, ScannerTapeEvent]>;
  bars: Candle5m[];
}): SourceTapeQuality {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const eventCount = args.entries.length;
  const malformedCompleted5mBars = args.entries.filter(([, event]) => event.completed5m && !normalizeCandle(event.completed5m)).length;
  const validCompleted5mBars = args.bars.length;

  if (args.tape.reportType && args.tape.reportType !== 'scanner_decision_event_tape') {
    blockers.push(`Unexpected tape reportType=${args.tape.reportType}.`);
  }
  if (!args.tape.tradeDate || !args.tape.instrument || !args.tape.session) {
    blockers.push('Tape is missing tradeDate, instrument, or session.');
  }
  if (eventCount === 0) {
    blockers.push('Tape has no scanner events.');
  }
  if (eventCount > 0 && validCompleted5mBars === 0) {
    blockers.push('Tape has no valid completed 5M bars.');
  }
  if (malformedCompleted5mBars > 0) {
    blockers.push(`Tape has ${malformedCompleted5mBars} malformed completed 5M bar(s).`);
  }
  if (eventCount >= 4 && validCompleted5mBars / eventCount < 0.8) {
    blockers.push(`Only ${validCompleted5mBars}/${eventCount} events have valid completed 5M bars.`);
  }
  if (!args.entries.some(([, event]) => event.plan)) {
    blockers.push('Tape has no app-owned plan snapshots.');
  }
  if (!args.entries.some(([, event]) => event.visibility)) {
    blockers.push('Tape has no scanner visibility metadata.');
  }

  let maxGapMinutes: number | null = null;
  const sortedBarTimes = args.bars
    .map((bar) => parseEtLikeTime(bar.time))
    .filter((time): time is number => time !== null)
    .sort((a, b) => a - b);
  for (let index = 1; index < sortedBarTimes.length; index += 1) {
    const gapMinutes = (sortedBarTimes[index] - sortedBarTimes[index - 1]) / 60_000;
    maxGapMinutes = maxGapMinutes === null ? gapMinutes : Math.max(maxGapMinutes, gapMinutes);
  }
  if (maxGapMinutes !== null && maxGapMinutes > 10) {
    warnings.push(`Largest completed-5M tape gap is ${maxGapMinutes.toFixed(1)} minutes; review source continuity before using fine-grained lessons.`);
  }
  if (!args.tape.reportType) {
    warnings.push('Tape has no reportType; accepted only because required scanner fields are present.');
  }

  return {
    status: blockers.length ? 'data_limited' : 'usable',
    validCompleted5mBars,
    malformedCompleted5mBars,
    eventCount,
    maxGapMinutes,
    blockers,
    warnings,
  };
}

function outcomeForCandidate(candidate: {
  direction: Direction;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
}, futureBars: Candle5m[]): { outcome: Outcome; outcomeTime: string | null; oneMesGross: number } {
  for (const bar of futureBars) {
    const stopHit = candidate.direction === 'LONG' ? bar.low <= candidate.stop : bar.high >= candidate.stop;
    const t1Hit = candidate.direction === 'LONG' ? bar.high >= candidate.t1 : bar.low <= candidate.t1;
    const t2Hit = candidate.direction === 'LONG' ? bar.high >= candidate.t2 : bar.low <= candidate.t2;
    if (stopHit && (t1Hit || t2Hit)) {
      return { outcome: 'AMBIGUOUS', outcomeTime: bar.time, oneMesGross: 0 };
    }
    if (t2Hit) {
      const points = Math.abs(candidate.t2 - candidate.entry);
      return { outcome: 'T2_HIT', outcomeTime: bar.time, oneMesGross: points * MES_DOLLARS_PER_POINT };
    }
    if (t1Hit) {
      const points = Math.abs(candidate.t1 - candidate.entry);
      return { outcome: 'T1_HIT', outcomeTime: bar.time, oneMesGross: points * MES_DOLLARS_PER_POINT };
    }
    if (stopHit) {
      const points = Math.abs(candidate.entry - candidate.stop);
      return { outcome: 'STOP_HIT', outcomeTime: bar.time, oneMesGross: -points * MES_DOLLARS_PER_POINT };
    }
  }
  return { outcome: 'OPEN', outcomeTime: null, oneMesGross: 0 };
}

function lessonForCandidate(candidate: Omit<LearningCandidate, 'lesson'>): string {
  if (candidate.outcome === 'T1_HIT' || candidate.outcome === 'T2_HIT') {
    return `${candidate.direction} ${candidate.setupType} worked after completed 5M proof at ${candidate.time}; preserve the line ${candidate.lineInSand ?? 'unknown'} and protected stop ${candidate.stop}.`;
  }
  if (candidate.outcome === 'STOP_HIT') {
    return `${candidate.direction} ${candidate.setupType} failed after completed 5M proof at ${candidate.time}; review whether the line ${candidate.lineInSand ?? 'unknown'} was too late, too close to HTF resistance/support, or lacked retest quality.`;
  }
  if (candidate.outcome === 'AMBIGUOUS') {
    return `${candidate.direction} ${candidate.setupType} had same-candle stop/target ambiguity after ${candidate.time}; require tick/order proof before using it as a rule lesson.`;
  }
  return `${candidate.direction} ${candidate.setupType} remained unresolved after ${candidate.time}; keep as journal context, not a live-rule change.`;
}

function chooseBestCandidate(candidates: LearningCandidate[]): LearningCandidate | null {
  const ranked = [...candidates].sort((a, b) => {
    const outcomeRank = (candidate: LearningCandidate): number => {
      if (candidate.outcome === 'T2_HIT') return 4;
      if (candidate.outcome === 'T1_HIT') return 3;
      if (candidate.outcome === 'OPEN') return 2;
      if (candidate.outcome === 'AMBIGUOUS') return 1;
      if (candidate.outcome === 'STOP_HIT') return 0;
      return -1;
    };
    return outcomeRank(b) - outcomeRank(a)
      || b.oneMesGross - a.oneMesGross
      || a.time.localeCompare(b.time);
  });
  return ranked[0] || null;
}

function getDayOfWeek(tradeDate: string): string {
  const date = new Date(`${tradeDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getUTCDay()];
}

export function buildDailyBarByBarLearningExtract(args: {
  tape: ScannerDecisionTape;
  sourceTapePath: string;
  generatedAt?: string;
}): DailyBarByBarLearningExtract {
  const rawEvents = args.tape.events || {};
  const entries = Object.entries(rawEvents).sort(([a], [b]) => a.localeCompare(b));
  const bars = entries.map(([, event]) => normalizeCandle(event.completed5m)).filter((bar): bar is Candle5m => Boolean(bar));
  const sourceTapeQuality = evaluateSourceTapeQuality({ tape: args.tape, entries, bars });
  const candidates: LearningCandidate[] = [];
  const seen = new Set<string>();

  for (const [eventKey, event] of entries) {
    const plan = event.plan || {};
    const selected = event.setupCandidateStatus?.selected || {};
    const direction = isDirection(plan.decision) ? plan.decision : isDirection(selected.direction) ? selected.direction : null;
    const entry = finiteNumber(plan.entry);
    const stop = finiteNumber(plan.stop);
    const t1 = finiteNumber(plan.t1);
    const t2 = finiteNumber(plan.t2);
    const riskPoints = finiteNumber(plan.riskPoints) ?? (entry !== null && stop !== null ? Math.abs(entry - stop) : null);
    if (!direction || entry === null || stop === null || t1 === null || t2 === null || riskPoints === null) continue;

    const time = event.completed5m?.time || event.time || eventKey;
    const setupType = selected.setupType || 'unknown';
    const dedupeKey = [
      direction,
      setupType,
      entry.toFixed(2),
      stop.toFixed(2),
      t1.toFixed(2),
      t2.toFixed(2),
    ].join('|');
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const futureBars = bars.filter((bar) => bar.time.localeCompare(time) > 0);
    const resolved = outcomeForCandidate({ direction, entry, stop, t1, t2 }, futureBars);
    const candidateBase: Omit<LearningCandidate, 'lesson'> = {
      time,
      setupType,
      direction,
      candidateState: selected.candidateState || null,
      lineInSand: finiteNumber(event.deskState?.lineInSand),
      entry,
      stop,
      t1,
      t2,
      riskPoints,
      outcome: resolved.outcome,
      outcomeTime: resolved.outcomeTime,
      oneMesGross: Number(resolved.oneMesGross.toFixed(2)),
      discordAction: event.visibility?.discordAction || null,
      suppressionReason: event.visibility?.suppressionReason || event.visibility?.holdWithReason || null,
    };
    candidates.push({ ...candidateBase, lesson: lessonForCandidate(candidateBase) });
  }

  const bestCandidate = chooseBestCandidate(candidates);
  const lessons = [
    bestCandidate
      ? `Best reviewed campaign: ${bestCandidate.direction} ${bestCandidate.setupType} from ${bestCandidate.time}, outcome ${bestCandidate.outcome}${bestCandidate.outcomeTime ? ` at ${bestCandidate.outcomeTime}` : ''}.`
      : 'No priced candidate with entry/stop/T1/T2 was available for this session.',
    sourceTapeQuality.status === 'usable'
      ? 'Source tape quality: usable for post-session learning.'
      : `Source tape quality: data-limited; do not promote lesson. Blockers: ${sourceTapeQuality.blockers.join(' ')}`,
    'Review cadence: lessons are generated after each completed session and should be reviewed before the next active session, then summarized weekly before any rule change.',
    'Live-rule boundary: a lesson can propose a rule update, but it cannot change scanner approvals until backed by replay evidence and committed tests.',
  ];

  return {
    reportType: 'daily_bar_by_bar_learning_extract',
    generatedAt: args.generatedAt || new Date().toISOString(),
    sourceTapePath: args.sourceTapePath,
    tradeDate: args.tape.tradeDate || 'unknown',
    instrument: args.tape.instrument || 'MES',
    session: args.tape.session || 'unknown',
    cadence: {
      postSessionReview: 'Run after morning, lunch/PM, and evening sessions when a decision tape exists.',
      lessonUsage: 'Review before the next session and during weekly rule-review; do not auto-promote lessons into live rules.',
      liveRuleBoundary: 'RAG/lesson records are evidence for research only. Setup scanner, DeskTicket, risk, and canExecute remain deterministic.',
    },
    summary: {
      eventCount: entries.length,
      candidateCount: candidates.length,
      bestCandidate,
      lessons,
      sourceTapeQuality,
    },
    candidates,
  };
}

async function persistLearningExtractToRag(extract: DailyBarByBarLearningExtract): Promise<DailyBarByBarLearningExtract['ragPersistence']> {
  const resolved = resolveDiscordRagPersistenceConfig();
  const planVersionId = `LEARNING-${extract.tradeDate}-${extract.instrument}-${extract.session}`.toUpperCase();
  if (extract.summary.sourceTapeQuality.status !== 'usable') {
    return {
      attempted: false,
      status: 'skipped_data_limited',
      reason: extract.summary.sourceTapeQuality.blockers.join(' '),
      planVersionId,
    };
  }
  if (!resolved.config) {
    return {
      attempted: false,
      status: 'skipped_missing_env',
      reason: `Missing ${resolved.missing.join(', ')}`,
      planVersionId,
    };
  }
  try {
    const status = await upsertDiscordAlertRagPayload({
      config: resolved.config,
      planVersionId,
      payload: {
        source: 'daily_bar_by_bar_learning_extract',
        analysis_mode: 'live',
        session_type: extract.session,
        trade_date: extract.tradeDate,
        day_of_week: getDayOfWeek(extract.tradeDate),
        instrument: extract.instrument,
        trade_result: 'pending',
        outcome: 'no_trade',
        setup_quality_score: 0.5,
        embedding_text: [
          `Daily bar-by-bar learning extract for ${extract.session} ${extract.instrument} on ${extract.tradeDate}.`,
          ...extract.summary.lessons,
          extract.summary.bestCandidate
            ? `Best reviewed candidate: ${extract.summary.bestCandidate.direction} ${extract.summary.bestCandidate.setupType} entry ${extract.summary.bestCandidate.entry} stop ${extract.summary.bestCandidate.stop} T1 ${extract.summary.bestCandidate.t1} T2 ${extract.summary.bestCandidate.t2} outcome ${extract.summary.bestCandidate.outcome}.`
            : 'No priced candidate with entry, stop, T1, and T2 was available.',
          'Learning records are research context only and do not approve trades or change live rules.',
        ].join(' '),
        trade_plan_json: extract,
        notes: extract.summary.lessons.join('\n'),
      },
      errorLabel: 'Daily bar-by-bar learning RAG',
    });
    return { attempted: true, status, planVersionId };
  } catch (error) {
    return {
      attempted: true,
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
      planVersionId,
    };
  }
}

function argValue(name: string, fallback: string | null = null): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1] || fallback;
  return fallback;
}

async function main(): Promise<void> {
  const tapePath = argValue('tape');
  if (!tapePath) {
    throw new Error('Usage: tsx tools/automation/daily-bar-by-bar-learning-extract.ts --tape <scanner-decision-tape.json> [--out <file>] [--persist-rag]');
  }
  const resolvedTapePath = path.resolve(tapePath);
  const tape = JSON.parse(await fs.readFile(resolvedTapePath, 'utf8')) as ScannerDecisionTape;
  const extract = buildDailyBarByBarLearningExtract({ tape, sourceTapePath: resolvedTapePath });
  if (process.argv.includes('--persist-rag')) {
    extract.ragPersistence = await persistLearningExtractToRag(extract);
  }
  const outPath = argValue('out', path.join(path.dirname(resolvedTapePath), `daily-learning-${extract.tradeDate}-${extract.instrument}-${extract.session}.json`));
  if (!outPath) throw new Error('Output path could not be resolved.');
  const resolvedOutPath = path.resolve(outPath);
  await fs.mkdir(path.dirname(resolvedOutPath), { recursive: true });
  await fs.writeFile(resolvedOutPath, `${JSON.stringify(extract, null, 2)}\n`, 'utf8');
  console.log(`[daily-learning] wrote ${resolvedOutPath}`);
  console.log(`[daily-learning] candidates=${extract.summary.candidateCount} best=${extract.summary.bestCandidate ? `${extract.summary.bestCandidate.direction} ${extract.summary.bestCandidate.entry}` : 'none'}`);
  if (extract.ragPersistence) {
    console.log(`[daily-learning] rag=${extract.ragPersistence.status}${extract.ragPersistence.reason ? ` reason=${extract.ragPersistence.reason}` : ''}`);
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
