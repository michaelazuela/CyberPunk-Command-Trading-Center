import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  buildTargetCascade,
  classifyScannerVisibility,
  parseBridgeTime,
  resolveScannerWindow,
  scoreScannerCandidate,
  selectScannerPlan,
  shouldSendScannerAlert,
  type ScannerState,
} from '../../src/lib/localScannerEngine';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { TradeDecisionStatus, type AnalysisResult, type ChartContext, type SetupCandidate, type TargetObjective } from '../../src/types';
import { flattenDiscordPayloadText } from './discord-alert-format';
import { resolveCurrentBridgeInstrument } from './bridge-instrument-resolver';
import { SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS, prepareLiveScannerDiscordAlertArtifacts } from './nt-scanner';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type ReplaySession = 'morning' | 'lunch';

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
const THIS_FILE = fileURLToPath(import.meta.url);
const TIMEFRAMES: NinjaBridgeTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];

// Replay must stay an audit wrapper around the live app-owned engines.
// Do not add replay-only setup rules or Discord eligibility rules here.

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1] && !process.argv[directIndex + 1].startsWith('--')) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`) || process.argv.includes(`--${name}=true`);
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timestampMs(value: string): number {
  return parseBridgeTime(value, 'eastern')?.getTime() ?? Number.NaN;
}

function validBar(bar: NinjaBridgeBar): boolean {
  return Boolean(
    bar &&
    typeof bar.time === 'string' &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close),
  );
}

function mergeBars(...sources: NinjaBridgeBar[][]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  for (const source of sources) {
    for (const bar of source) {
      if (validBar(bar)) byTime.set(normalizeTime(bar.time), { ...bar, time: normalizeTime(bar.time) });
    }
  }
  return [...byTime.values()].sort((a, b) => timestampMs(a.time) - timestampMs(b.time));
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value: string): string {
  return normalizeTime(value).slice(0, 10);
}

function minutesEt(value: string): number | null {
  const match = normalizeTime(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function barsThrough(bars: NinjaBridgeBar[], asOf: string): NinjaBridgeBar[] {
  const asOfMs = timestampMs(asOf);
  return bars.filter((bar) => timestampMs(bar.time) <= asOfMs);
}

function sameDateBarsThrough(bars: NinjaBridgeBar[], asOf: string): NinjaBridgeBar[] {
  const date = dateOnly(asOf);
  return barsThrough(bars, asOf).filter((bar) => dateOnly(bar.time) === date);
}

function replaySession(value: string): ReplaySession {
  const minutes = minutesEt(value) ?? 0;
  return minutes < 12 * 60 ? 'morning' : 'lunch';
}

function analysisForContext(context: ChartContext): AnalysisResult {
  return {
    dayType: context.htfLiquidityDrawState?.planDirection === 'SHORT' ? 'SHORT' : context.htfLiquidityDrawState?.planDirection === 'LONG' ? 'LONG' : 'NO TRADE',
    reasoning: 'Scanner day replay from NinjaTrader OHLC. Existing app-owned scanner and Discord eligibility rules decide visibility.',
    confidence: 0.7,
    checks: [{ label: 'NinjaTrader OHLC imported', passed: true }],
    structuredChartContext: context,
    current_rule_analysis: {
      summary: 'Replay context from NinjaTrader OHLC. Decision support only; no orders.',
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_REPLAY',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'PENDING_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
    sessionLog: {
      timestamp: context.chartTimestamp || null,
      instrument: context.instrument,
      final_bias: context.htfLiquidityDrawState?.planDirection || 'WAIT',
      confidence: 0.7,
      key_structural_level: String(context.keyLevels.currentPrice || ''),
      recalibration_status: 'scanner_day_replay',
    },
  };
}

async function fetchBars(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  from: string;
  to: string;
}): Promise<NinjaBridgeBar[]> {
  const chunks: NinjaBridgeBar[][] = [];
  for (let cursor = dateOnly(args.from); cursor <= dateOnly(args.to); cursor = addDays(cursor, 7)) {
    const next = addDays(cursor, 7);
    const from = cursor === dateOnly(args.from) ? args.from : `${cursor}T00:00:00-04:00`;
    const to = next > dateOnly(args.to) ? args.to : `${next}T00:00:00-04:00`;
    const response = await getNinjaHistoricalBars({
      instrument: args.bridgeInstrument,
      timeframe: args.timeframe,
      from,
      to,
      limit: 5000,
      baseUrl: args.bridgeUrl,
    });
    if (!response.ok) throw new Error(`${args.timeframe} fetch failed ${from} to ${to}: ${response.error || 'bridge returned not ok'}`);
    chunks.push(response.bars || []);
  }
  return mergeBars(...chunks);
}

function outcomeForPlan(candidate: SetupCandidate, afterBars: NinjaBridgeBar[]) {
  const entry = Number(candidate.entry);
  const stop = Number(candidate.stop);
  const target1 = Number(candidate.target1);
  const target2 = Number(candidate.target2);
  if (![entry, stop, target1, target2].every(Number.isFinite)) {
    return { status: 'levels_missing', entryTouchedAt: null, stopTouchedAt: null, target1TouchedAt: null, target2TouchedAt: null, firstTerminal: null };
  }

  let entryTouchedAt: string | null = null;
  let stopTouchedAt: string | null = null;
  let target1TouchedAt: string | null = null;
  let target2TouchedAt: string | null = null;
  let firstTerminal: 'stop' | 'target1' | 'target2' | null = null;

  for (const bar of afterBars) {
    const touchedEntry = candidate.direction === 'LONG'
      ? bar.low <= entry && bar.high >= entry
      : bar.high >= entry && bar.low <= entry;
    if (!entryTouchedAt && touchedEntry) entryTouchedAt = bar.time;
    if (!entryTouchedAt) continue;

    const hitStop = candidate.direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
    const hitT1 = candidate.direction === 'LONG' ? bar.high >= target1 : bar.low <= target1;
    const hitT2 = candidate.direction === 'LONG' ? bar.high >= target2 : bar.low <= target2;
    if (!stopTouchedAt && hitStop) stopTouchedAt = bar.time;
    if (!target1TouchedAt && hitT1) target1TouchedAt = bar.time;
    if (!target2TouchedAt && hitT2) target2TouchedAt = bar.time;
    if (!firstTerminal && (hitStop || hitT1 || hitT2)) {
      firstTerminal = hitStop ? 'stop' : hitT2 ? 'target2' : 'target1';
    }
  }

  return {
    status: !entryTouchedAt ? 'entry_not_touched' : target2TouchedAt ? 'target2_met' : target1TouchedAt ? 'target1_met' : stopTouchedAt ? 'stopped' : 'entry_touched_open',
    entryTouchedAt,
    stopTouchedAt,
    target1TouchedAt,
    target2TouchedAt,
    firstTerminal,
  };
}

function candidateSummary(candidate: SetupCandidate | null) {
  if (!candidate) return null;
  return {
    setupType: candidate.setupType,
    scenarioLabel: candidate.scenarioLabel,
    pathway: candidate.pathway,
    direction: candidate.direction,
    executionStatus: candidate.executionStatus,
    candidateState: candidate.candidateState,
    humanReview: candidate.humanReview || null,
    entry: candidate.entry ?? null,
    stop: candidate.stop ?? null,
    target1: candidate.target1 ?? null,
    target2: candidate.target2 ?? null,
    riskPoints: candidate.riskPoints ?? null,
    confidence: candidate.confidence ?? null,
    modelConfidenceScore: candidate.modelConfidenceScore ?? null,
    decisionQualityScore: candidate.decisionQualityScore ?? null,
    rankScore: candidate.rankScore ?? null,
    blockReason: candidate.blockReason ?? null,
    requiredTrigger: candidate.requiredTrigger ?? null,
    invalidation: candidate.invalidation ?? null,
    evidence: (candidate.evidence || []).slice(0, 14),
    missingEvidence: (candidate.missingEvidence || []).slice(0, 14),
  };
}

async function postDiscordPayload(payload: any, files: string[]): Promise<{ ok: boolean; status: number; text: string }> {
  const webhook = process.env.QUANT_DESK_SCANNER_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error('Missing QUANT_DESK_SCANNER_WEBHOOK_URL or DISCORD_WEBHOOK_URL.');
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  for (let index = 0; index < files.length; index += 1) {
    const bytes = await import('node:fs/promises').then((fs) => fs.readFile(files[index]));
    form.append(`files[${index}]`, new Blob([bytes]), files[index].split(/[\\/]/).pop() || `attachment-${index}.png`);
  }
  const response = await fetch(webhook, { method: 'POST', body: form });
  return { ok: response.ok, status: response.status, text: await response.text().catch(() => '') };
}

async function main() {
  const date = argValue('date', new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
  const instrument = argValue('instrument', 'MES').toUpperCase() === 'MNQ' ? 'MNQ' : 'MES';
  let bridgeInstrument = argValue('bridge-instrument', process.env.NINJATRADER_BRIDGE_INSTRUMENT || instrument);
  const bridgeUrl = argValue('bridge-url', process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765');
  const evaluateFromClock = argValue('from', '00:00');
  const evaluateToClock = argValue('to', '12:00');
  const outcomeToClock = argValue('outcome-to', '16:00');
  const postBest = hasFlag('post-best');
  const maxBars = Number(argValue('max-bars', '0'));

  const instrumentResolution = await resolveCurrentBridgeInstrument({
    bridgeUrl,
    appInstrument: instrument,
    requestedBridgeInstrument: bridgeInstrument,
    asOf: new Date(`${date}T12:00:00-04:00`),
  });
  bridgeInstrument = instrumentResolution.instrument;
  if (instrumentResolution.warning) console.warn(`[scanner-day-replay] ${instrumentResolution.warning}`);

  mkdirSync(REPORT_DIR, { recursive: true });
  const preloadDate = addDays(date, -SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS);
  const fetchTo = `${date}T${outcomeToClock}:00-04:00`;
  const preloadFrom = `${preloadDate}T00:00:00-04:00`;
  const loaded = new Map<NinjaBridgeTimeframe, NinjaBridgeBar[]>();
  for (const timeframe of TIMEFRAMES) {
    console.log(`[scanner-day-replay] loading ${timeframe} ${preloadFrom} -> ${fetchTo}`);
    loaded.set(timeframe, await fetchBars({ bridgeUrl, bridgeInstrument, timeframe, from: preloadFrom, to: fetchTo }));
    console.log(`[scanner-day-replay] loaded ${timeframe}: ${loaded.get(timeframe)?.length || 0} bars`);
  }

  const bars5m = loaded.get('5m') || [];
  const evalStartMs = timestampMs(`${date}T${evaluateFromClock}:00`);
  const evalEndMs = timestampMs(`${date}T${evaluateToClock}:00`);
  const allEvaluationBars = bars5m.filter((bar) => {
    const ms = timestampMs(bar.time);
    return Number.isFinite(ms) && ms >= evalStartMs && ms <= evalEndMs;
  });
  const evaluationBars = maxBars > 0 ? allEvaluationBars.slice(0, maxBars) : allEvaluationBars;
  console.log(`[scanner-day-replay] evaluating ${evaluationBars.length}/${allEvaluationBars.length} completed 5M bars`);
  const rows: any[] = [];
  const posts: any[] = [];

  for (let index = 0; index < evaluationBars.length; index += 1) {
    const bar = evaluationBars[index];
    if (index % 12 === 0) console.log(`[scanner-day-replay] evaluating ${index + 1}/${evaluationBars.length}: ${bar.time}`);
    const session = replaySession(bar.time);
    const context = buildNinjaChartContext({
      bars5m: sameDateBarsThrough(bars5m, bar.time),
      htfBars5m: barsThrough(bars5m, bar.time),
      bars15m: barsThrough(loaded.get('15m') || [], bar.time),
      bars60m: barsThrough(loaded.get('60m') || [], bar.time),
      bars120m: barsThrough(loaded.get('120m') || [], bar.time),
      bars240m: barsThrough(loaded.get('240m') || [], bar.time),
      sessionType: session,
      instrument,
      tradeDate: date,
      barTimestampMode: 'open',
      barTimeZone: 'eastern',
    }) as ChartContext | null;
    if (!context) continue;

    const analysis = analysisForContext(context);
    const scan = scanSetupCandidates({ sessionType: session, chartContext: context, result: analysis });
    const normalized = buildAppTradePlan(analysis, { sessionType: session, instrument, windowStatusOverride: 'active' });
    const currentPrice = Number.isFinite(bar.close) ? bar.close : context.keyLevels.currentPrice ?? null;
    const targetCascade = buildTargetCascade({
      candidate: scan.bestConditionalCandidate || scan.bestExecutableCandidate,
      objectives: (context.targetObjectives || []) as TargetObjective[],
      recentBars: barsThrough(bars5m, bar.time),
    });
    const selection = selectScannerPlan({
      normalized,
      currentPrice,
      latestCompletedBar: bar,
      targetCascade,
    });
    const candidate = selection.candidate;
    const window = resolveScannerWindow(parseBridgeTime(bar.time, 'eastern') || new Date(`${bar.time}-04:00`));
    const confidence = scoreScannerCandidate(
      candidate,
      window,
      currentPrice,
      context.multiTimeframeContext?.alignment?.alignedDirection === candidate?.direction,
      minutesEt(bar.time) ?? 0,
    );
    const alertDecision = shouldSendScannerAlert({
      state: selection.stateForAlert,
      confidence: confidence.score,
      window,
      candidate,
      stale: selection.stale.stale,
    });
    const canExecute = Boolean(normalized.canExecute);
    const lifecycle = buildCandidateLifecycleTrace({
      candidates: normalized.setupCandidates || scan.candidates,
      selectedCandidate: candidate,
      state: selection.stateForAlert,
      window,
      alertDecision,
      canExecute,
      staleReason: selection.stale.reason,
    });
    const visibility = classifyScannerVisibility({
      state: selection.stateForAlert,
      candidate,
      window,
      alertDecision,
      canExecute,
      staleReason: selection.stale.reason,
    });
    const deskState = buildDeskState({
      state: selection.stateForAlert,
      candidate,
      visibilityMetadata: visibility,
      candidateLifecycleTrace: lifecycle,
      targetCascade,
      htfLiquidityDrawState: context.htfLiquidityDrawState || null,
      currentPrice,
      canExecute,
      chartContext: context,
    });
    const afterBars = bars5m.filter((item) => timestampMs(item.time) >= timestampMs(bar.time));
    const outcome = candidate ? outcomeForPlan(candidate, afterBars) : null;
    const row = {
      timestamp: bar.time,
      session,
      windowLabel: window.label,
      scannerState: selection.stateForAlert,
      confidence: confidence.score,
      alertDecision,
      visibility: visibility.discordAction,
      canExecute,
      selectedCandidate: candidateSummary(candidate),
      scanBestConditional: candidateSummary(scan.bestConditionalCandidate),
      scanBestExecutable: candidateSummary(scan.bestExecutableCandidate),
      outcome,
      discordPreview: null as null | { text: string; files: string[]; auditLogPath: string },
    };

    if (alertDecision.shouldSend && candidate) {
      row.discordPreview = { text: 'eligible_not_rendered_first_pass', files: [], auditLogPath: '' };
      posts.push({ row, artifactInput: {
        session,
        tradeDate: date,
        config: { instrument },
        state: selection.stateForAlert as ScannerState,
        confidence,
        candidate,
        normalized,
        chartContext: context,
        currentPrice,
        completed5m: bar,
        scoringTimestamp: bar.time,
        scoringTimestampSource: 'scanner day replay completed 5M candle',
        windowLabel: window.label,
        staleReason: selection.stale.reason,
        scannerReviewStatus: selection.reviewStatus || 'scanner_day_replay',
        scannerAuditWarnings: selection.auditWarnings,
        targetCascade,
        alertReason: alertDecision.reason,
        visibilityMetadata: visibility,
        candidateLifecycleTrace: lifecycle,
        deskState,
        planVersionId: `REPLAY-${date}-${normalizeTime(bar.time).replace(/[:T-]/g, '')}`,
      } });
    }
    rows.push(row);
  }

  const postCandidates = posts.map((item) => item.row);
  const bestPost = postCandidates
    .slice()
    .sort((a, b) => b.confidence - a.confidence || timestampMs(a.timestamp) - timestampMs(b.timestamp))[0] || null;
  let discordPostResult: any = null;
  if (postBest && bestPost) {
    const selected = posts.find((item) => item.row.timestamp === bestPost.timestamp);
    if (selected) {
      const artifactDir = join(REPORT_DIR, `scanner-day-${date}-${normalizeTime(bestPost.timestamp).replace(/[:T]/g, '')}`);
      const artifacts = await prepareLiveScannerDiscordAlertArtifacts({
        ...selected.artifactInput,
        outputDir: join(artifactDir, 'images'),
        auditDir: join(artifactDir, 'audit'),
      });
      discordPostResult = await postDiscordPayload(artifacts.payload, artifacts.files);
      bestPost.discordPreview = {
        text: flattenDiscordPayloadText(artifacts.payload),
        files: artifacts.files,
        auditLogPath: artifacts.auditLogPath,
      };
    }
  }

  const report = {
    reportType: 'scanner_day_replay',
    createdAt: new Date().toISOString(),
    sourceFile: THIS_FILE,
    instrument,
    bridgeInstrument,
    bridgeUrl,
    replayWindow: { date, from: evaluateFromClock, to: evaluateToClock, outcomeTo: outcomeToClock },
    data: Object.fromEntries(TIMEFRAMES.map((timeframe) => {
      const bars = loaded.get(timeframe) || [];
      return [timeframe, { bars: bars.length, from: bars[0]?.time || null, to: bars[bars.length - 1]?.time || null }];
    })),
    totals: {
      evaluated5mBars: evaluationBars.length,
      selectedCandidates: rows.filter((row) => row.selectedCandidate).length,
      discordEligiblePlans: postCandidates.length,
      target1Met: postCandidates.filter((row) => row.outcome?.target1TouchedAt).length,
      target2Met: postCandidates.filter((row) => row.outcome?.target2TouchedAt).length,
      stopped: postCandidates.filter((row) => row.outcome?.stopTouchedAt && !row.outcome?.target1TouchedAt).length,
    },
    bestPost,
    discordPostResult,
    rows,
    boundary: {
      replayChangesRules: false,
      replayPlacesOrders: false,
      postsDiscord: postBest,
      decisionSupportOnly: true,
    },
  };
  const jsonPath = join(REPORT_DIR, `scanner-day-replay-${date}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    reportPath: jsonPath,
    totals: report.totals,
    bestPost: bestPost ? {
      timestamp: bestPost.timestamp,
      scannerState: bestPost.scannerState,
      confidence: bestPost.confidence,
      candidate: bestPost.selectedCandidate,
      outcome: bestPost.outcome,
    } : null,
    discordPostResult,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
