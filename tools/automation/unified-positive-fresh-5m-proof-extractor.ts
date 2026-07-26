import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SetupCandidate } from '../../src/types';
import {
  loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir,
  type UnifiedDeskCandidateDiagnosticSnapshot,
} from './unified-desk-candidate-book-diagnostic';
import type {
  UnifiedPositiveCandidateRebuildAuditReport,
  UnifiedPositiveCandidateRebuildAuditRow,
} from './unified-positive-candidate-rebuild-audit';

type ReplaySession = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch' | 'replay_evening';
type FreshProofStatus =
  | 'fresh_5m_proof_found'
  | 'invalidated_before_proof'
  | 'target_reached_before_proof'
  | 'no_fresh_5m_proof'
  | 'missing_future_bars'
  | 'missing_snapshot'
  | 'missing_plan_geometry'
  | 'not_in_scope';
type FreshProofType = 'completed_5m_close_through_entry' | 'completed_5m_retest_reentry';
type FiveMinuteSource = 'local_market_bars_json' | 'scanner_decision_tape_completed_5m' | 'missing';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface UnifiedPositiveFresh5mProofRow {
  snapshotId: string;
  tradeDate: string | null;
  sessionType: ReplaySession;
  candidateKey: string;
  setupType: string;
  direction: SetupCandidate['direction'];
  completedBarTime: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  outcomeAdjustedScore: number | null;
  outcomeGrossOneMes: number;
  barsChecked: number;
  proofStatus: FreshProofStatus;
  proofType: FreshProofType | null;
  proofBarTime: string | null;
  proofBar: OhlcBar | null;
  blockingBarTime: string | null;
  blockingBar: OhlcBar | null;
  reviewReadiness: 'eligible_after_fresh_5m_proof' | 'still_blocked';
  blockers: string[];
  canExecute: false;
  publishDiscord: false;
  recommendation: string;
}

export interface UnifiedPositiveFresh5mProofReport {
  reportType: 'unified_positive_fresh_5m_proof_extractor';
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
  source: {
    positiveRebuildAuditPath: string | null;
    auditDir: string;
    marketBarsJson: string | null;
    startDate: string | null;
    endDate: string | null;
    instrument: string;
    tolerancePoints: number;
  };
  summary: {
    positiveRowsLoaded: number;
    proofScopeRows: number;
    freshProofFound: number;
    eligibleAfterFresh5mProof: number;
    invalidatedBeforeProof: number;
    targetReachedBeforeProof: number;
    noFresh5mProof: number;
    missingFutureBars: number;
    missingSnapshot: number;
    missingPlanGeometry: number;
    notInScope: number;
    canExecuteFalseRows: number;
    publishDiscordFalseRows: number;
    fiveMinuteBarsLoaded: number;
    fiveMinuteSource: FiveMinuteSource;
  };
  rows: UnifiedPositiveFresh5mProofRow[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_INSTRUMENT = 'MES';
const DEFAULT_TOLERANCE_POINTS = 0.25;
const TARGET_SETUPS = new Set(['historicalReview', 'NoInstalledSetup']);
const SESSIONS: Array<'morning' | 'lunch' | 'evening'> = ['morning', 'lunch', 'evening'];
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

function uniqueSortedBars(bars: OhlcBar[]): OhlcBar[] {
  const byTime = new Map<string, OhlcBar>();
  for (const bar of bars) byTime.set(bar.time, bar);
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
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
        // Malformed local tape files simply leave proof blocked in this read-only extractor.
      }
    }
  }
  return uniqueSortedBars(bars);
}

function loadFiveMinuteBars(args: {
  auditDir: string;
  instrument: string;
  startDate: string;
  endDate: string;
  marketBarsJson: string | null;
}): { bars: OhlcBar[]; source: FiveMinuteSource } {
  const local = loadLocalMarketBars5m(args.marketBarsJson);
  if (local.length) return { bars: local, source: 'local_market_bars_json' };
  const tape = loadDecisionTape5m(args);
  return { bars: tape, source: tape.length ? 'scanner_decision_tape_completed_5m' : 'missing' };
}

function hasDirectionalGeometry(row: UnifiedPositiveCandidateRebuildAuditRow): boolean {
  const { entry, stop, target1, target2 } = row.existingPlan;
  if (entry === null || stop === null || target1 === null || target2 === null) return false;
  if (row.direction === 'LONG') return stop < entry && entry < target1 && target1 <= target2;
  if (row.direction === 'SHORT') return stop > entry && entry > target1 && target1 >= target2;
  return false;
}

function futureBars(args: {
  bars: OhlcBar[];
  tradeDate: string;
  sessionType: ReplaySession;
  completedBarTime: string | null;
}): OhlcBar[] {
  const cutoff = timeMs(args.completedBarTime);
  return args.bars.filter((bar) =>
    inSession(bar, args.tradeDate, args.sessionType) &&
    (!cutoff || timeMs(bar.time) > cutoff)
  );
}

function touchedStop(bar: OhlcBar, direction: SetupCandidate['direction'], stop: number): boolean {
  if (direction === 'LONG') return bar.low <= stop;
  if (direction === 'SHORT') return bar.high >= stop;
  return false;
}

function touchedTarget1(bar: OhlcBar, direction: SetupCandidate['direction'], target1: number): boolean {
  if (direction === 'LONG') return bar.high >= target1;
  if (direction === 'SHORT') return bar.low <= target1;
  return false;
}

function proofTypeForBar(args: {
  bar: OhlcBar;
  previousBar: OhlcBar | null;
  direction: SetupCandidate['direction'];
  entry: number;
  tolerancePoints: number;
}): FreshProofType | null {
  if (args.direction === 'LONG') {
    if (args.bar.low <= args.entry + args.tolerancePoints && args.bar.close > args.entry) return 'completed_5m_retest_reentry';
    if (args.previousBar && args.previousBar.close < args.entry && args.bar.close > args.entry) return 'completed_5m_close_through_entry';
  }
  if (args.direction === 'SHORT') {
    if (args.bar.high >= args.entry - args.tolerancePoints && args.bar.close < args.entry) return 'completed_5m_retest_reentry';
    if (args.previousBar && args.previousBar.close > args.entry && args.bar.close < args.entry) return 'completed_5m_close_through_entry';
  }
  return null;
}

function extractFreshProof(args: {
  bars: OhlcBar[];
  row: UnifiedPositiveCandidateRebuildAuditRow;
  tolerancePoints: number;
}): Pick<UnifiedPositiveFresh5mProofRow, 'proofStatus' | 'proofType' | 'proofBarTime' | 'proofBar' | 'blockingBarTime' | 'blockingBar'> {
  const { entry, stop, target1 } = args.row.existingPlan;
  if (entry === null || stop === null || target1 === null) {
    return {
      proofStatus: 'missing_plan_geometry',
      proofType: null,
      proofBarTime: null,
      proofBar: null,
      blockingBarTime: null,
      blockingBar: null,
    };
  }
  let previousBar: OhlcBar | null = null;
  for (const bar of args.bars) {
    if (touchedStop(bar, args.row.direction, stop)) {
      return {
        proofStatus: 'invalidated_before_proof',
        proofType: null,
        proofBarTime: null,
        proofBar: null,
        blockingBarTime: bar.time,
        blockingBar: bar,
      };
    }
    if (touchedTarget1(bar, args.row.direction, target1)) {
      return {
        proofStatus: 'target_reached_before_proof',
        proofType: null,
        proofBarTime: null,
        proofBar: null,
        blockingBarTime: bar.time,
        blockingBar: bar,
      };
    }
    const proofType = proofTypeForBar({
      bar,
      previousBar,
      direction: args.row.direction,
      entry,
      tolerancePoints: args.tolerancePoints,
    });
    if (proofType) {
      return {
        proofStatus: 'fresh_5m_proof_found',
        proofType,
        proofBarTime: bar.time,
        proofBar: bar,
        blockingBarTime: null,
        blockingBar: null,
      };
    }
    previousBar = bar;
  }
  return {
    proofStatus: 'no_fresh_5m_proof',
    proofType: null,
    proofBarTime: null,
    proofBar: null,
    blockingBarTime: null,
    blockingBar: null,
  };
}

function recommendationFor(row: Pick<UnifiedPositiveFresh5mProofRow, 'proofStatus' | 'setupType'>): string {
  if (row.proofStatus === 'fresh_5m_proof_found') {
    return `${row.setupType} has fresh completed 5M proof after the stale/no-chase point. Keep it research-only, then feed it into a later review-ticket rebuild pass with canExecute=false.`;
  }
  if (row.proofStatus === 'invalidated_before_proof') return 'The protected stop was touched before fresh 5M proof appeared. Do not rebuild this stale candidate.';
  if (row.proofStatus === 'target_reached_before_proof') return 'T1 was touched before fresh 5M proof appeared. Treat it as a missed/no-chase positive, not a fresh ticket.';
  if (row.proofStatus === 'missing_future_bars') return 'No later completed 5M bars were available in the local research source for this session.';
  if (row.proofStatus === 'missing_snapshot') return 'The source scanner snapshot was not found, so completed-bar cutoff cannot be trusted.';
  if (row.proofStatus === 'missing_plan_geometry') return 'Deterministic entry/stop/T1/T2 geometry is missing or invalid; do not infer levels from outcome hindsight.';
  if (row.proofStatus === 'not_in_scope') return 'Not part of the historicalReview/Sweep positive proof-capture phase.';
  return 'Positive overlay remains blocked because no fresh completed 5M proof appeared after the stale/no-chase point.';
}

function blockersFor(status: FreshProofStatus): string[] {
  if (status === 'fresh_5m_proof_found') return [];
  if (status === 'invalidated_before_proof') return ['protected stop touched before fresh 5M proof'];
  if (status === 'target_reached_before_proof') return ['T1 touched before fresh 5M proof'];
  if (status === 'missing_future_bars') return ['missing future completed 5M bars'];
  if (status === 'missing_snapshot') return ['missing source scanner snapshot'];
  if (status === 'missing_plan_geometry') return ['missing or invalid deterministic plan geometry'];
  if (status === 'not_in_scope') return ['row not in historicalReview/Sweep proof scope'];
  return ['no fresh completed 5M proof after stale/no-chase point'];
}

function authority(): UnifiedPositiveFresh5mProofReport['authority'] {
  return {
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
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveFresh5mProofReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Fresh 5M Proof Extractor',
    '',
    'Authority: read-only research. It reads local artifacts only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Positive rows loaded: ${report.summary.positiveRowsLoaded}.`,
    `- Proof-scope rows: ${report.summary.proofScopeRows}.`,
    `- Fresh 5M proof found: ${report.summary.freshProofFound}.`,
    `- Eligible after fresh 5M proof: ${report.summary.eligibleAfterFresh5mProof}.`,
    `- Invalidated before proof: ${report.summary.invalidatedBeforeProof}.`,
    `- T1 reached before proof: ${report.summary.targetReachedBeforeProof}.`,
    `- No fresh 5M proof: ${report.summary.noFresh5mProof}.`,
    `- Missing future bars: ${report.summary.missingFutureBars}.`,
    `- 5M source: ${report.summary.fiveMinuteSource}; bars=${report.summary.fiveMinuteBarsLoaded}.`,
    '',
    '## Rows',
    '| Date | Session | Setup | Side | Completed Bar | Entry | Stop | T1 | Bars | Status | Proof Time | Blockers |',
    '|---|---|---|---|---|---:|---:|---:|---:|---|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate || '-'} | ${row.sessionType} | ${row.setupType} | ${row.direction} | ${row.completedBarTime || '-'} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.barsChecked} | ${row.proofStatus} | ${row.proofBarTime || '-'} | ${row.blockers.join(', ') || '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

function buildRecommendations(report: Omit<UnifiedPositiveFresh5mProofReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Do not wire these rows directly to scanner-visible tickets. This extractor is proof capture only.',
    'Preserve canExecute=false and Discord publishing disabled for every row.',
  ];
  if (report.summary.eligibleAfterFresh5mProof > 0) {
    recommendations.push('Carry only eligible_after_fresh_5m_proof rows into a later review-ticket rebuild simulation.');
  }
  if (report.summary.invalidatedBeforeProof + report.summary.targetReachedBeforeProof > 0) {
    recommendations.push('Keep rows blocked when stop or T1 was touched before proof; those are missed-trade/no-chase cases, not fresh entries.');
  }
  if (report.summary.noFresh5mProof + report.summary.missingFutureBars > 0) {
    recommendations.push('For rows still missing proof, review whether the model needs a clearer completed-5M re-entry rule rather than relaxing proof requirements.');
  }
  return recommendations;
}

export function buildUnifiedPositiveFresh5mProofReport(args: {
  positiveRebuildAudit: UnifiedPositiveCandidateRebuildAuditReport;
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[];
  fiveMinuteBars: OhlcBar[];
  fiveMinuteSource?: FiveMinuteSource;
  positiveRebuildAuditPath?: string | null;
  auditDir: string;
  marketBarsJson?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  instrument?: string;
  tolerancePoints?: number;
}, generatedAt = new Date().toISOString()): UnifiedPositiveFresh5mProofReport {
  const tolerancePoints = args.tolerancePoints ?? DEFAULT_TOLERANCE_POINTS;
  const snapshotIndex = new Map(args.snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
  const rows = args.positiveRebuildAudit.rows.map((sourceRow) => {
    const inScope = sourceRow.rebuildClassification === 'needs_fresh_5m_proof' && TARGET_SETUPS.has(sourceRow.setupType);
    const snapshot = snapshotIndex.get(sourceRow.snapshotId);
    const completedBarTime = snapshot?.completedBarTime || null;
    const geometryValid = hasDirectionalGeometry(sourceRow);
    const bars = inScope && snapshot && sourceRow.tradeDate
      ? futureBars({
        bars: args.fiveMinuteBars,
        tradeDate: sourceRow.tradeDate,
        sessionType: sourceRow.sessionType,
        completedBarTime,
      })
      : [];
    let proof = extractFreshProof({ bars, row: sourceRow, tolerancePoints });
    if (!inScope) {
      proof = { proofStatus: 'not_in_scope', proofType: null, proofBarTime: null, proofBar: null, blockingBarTime: null, blockingBar: null };
    } else if (!snapshot) {
      proof = { proofStatus: 'missing_snapshot', proofType: null, proofBarTime: null, proofBar: null, blockingBarTime: null, blockingBar: null };
    } else if (!geometryValid) {
      proof = { proofStatus: 'missing_plan_geometry', proofType: null, proofBarTime: null, proofBar: null, blockingBarTime: null, blockingBar: null };
    } else if (!bars.length) {
      proof = { proofStatus: 'missing_future_bars', proofType: null, proofBarTime: null, proofBar: null, blockingBarTime: null, blockingBar: null };
    }
    const reviewReadiness = proof.proofStatus === 'fresh_5m_proof_found'
      ? 'eligible_after_fresh_5m_proof'
      : 'still_blocked';
    const row: UnifiedPositiveFresh5mProofRow = {
      snapshotId: sourceRow.snapshotId,
      tradeDate: sourceRow.tradeDate,
      sessionType: sourceRow.sessionType,
      candidateKey: sourceRow.candidateKey,
      setupType: sourceRow.setupType,
      direction: sourceRow.direction,
      completedBarTime,
      entry: sourceRow.existingPlan.entry,
      stop: sourceRow.existingPlan.stop,
      target1: sourceRow.existingPlan.target1,
      target2: sourceRow.existingPlan.target2,
      outcomeAdjustedScore: sourceRow.outcomeAdjustedScore,
      outcomeGrossOneMes: sourceRow.outcomeGrossOneMes,
      barsChecked: bars.length,
      proofStatus: proof.proofStatus,
      proofType: proof.proofType,
      proofBarTime: proof.proofBarTime,
      proofBar: proof.proofBar,
      blockingBarTime: proof.blockingBarTime,
      blockingBar: proof.blockingBar,
      reviewReadiness,
      blockers: blockersFor(proof.proofStatus),
      canExecute: false,
      publishDiscord: false,
      recommendation: recommendationFor({ proofStatus: proof.proofStatus, setupType: sourceRow.setupType }),
    };
    return row;
  });
  const withoutRecommendationsAndMarkdown: Omit<UnifiedPositiveFresh5mProofReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_fresh_5m_proof_extractor',
    generatedAt,
    authority: authority(),
    source: {
      positiveRebuildAuditPath: args.positiveRebuildAuditPath || null,
      auditDir: args.auditDir,
      marketBarsJson: args.marketBarsJson || null,
      startDate: args.startDate || null,
      endDate: args.endDate || null,
      instrument: args.instrument || DEFAULT_INSTRUMENT,
      tolerancePoints,
    },
    summary: {
      positiveRowsLoaded: args.positiveRebuildAudit.rows.length,
      proofScopeRows: rows.filter((row) => row.proofStatus !== 'not_in_scope').length,
      freshProofFound: rows.filter((row) => row.proofStatus === 'fresh_5m_proof_found').length,
      eligibleAfterFresh5mProof: rows.filter((row) => row.reviewReadiness === 'eligible_after_fresh_5m_proof').length,
      invalidatedBeforeProof: rows.filter((row) => row.proofStatus === 'invalidated_before_proof').length,
      targetReachedBeforeProof: rows.filter((row) => row.proofStatus === 'target_reached_before_proof').length,
      noFresh5mProof: rows.filter((row) => row.proofStatus === 'no_fresh_5m_proof').length,
      missingFutureBars: rows.filter((row) => row.proofStatus === 'missing_future_bars').length,
      missingSnapshot: rows.filter((row) => row.proofStatus === 'missing_snapshot').length,
      missingPlanGeometry: rows.filter((row) => row.proofStatus === 'missing_plan_geometry').length,
      notInScope: rows.filter((row) => row.proofStatus === 'not_in_scope').length,
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.publishDiscord === false).length,
      fiveMinuteBarsLoaded: args.fiveMinuteBars.length,
      fiveMinuteSource: args.fiveMinuteSource || 'missing',
    },
    rows,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveFresh5mProofReport(
  report: UnifiedPositiveFresh5mProofReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-fresh-5m-proof-extractor-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveFresh5mProofCli(args = process.argv.slice(2)): Promise<void> {
  const positiveRebuildAuditPath = readFlag(args, '--positive-rebuild-audit');
  if (!positiveRebuildAuditPath) throw new Error('Missing required --positive-rebuild-audit path.');
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const startDate = readFlag(args, '--start-date') || '2026-06-01';
  const endDate = readFlag(args, '--end-date') || '2026-07-02';
  const marketBarsJson = readFlag(args, '--market-bars-json');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const instrument = readFlag(args, '--instrument') || DEFAULT_INSTRUMENT;
  const tolerancePoints = finiteNumber(readFlag(args, '--tolerance-points')) ?? DEFAULT_TOLERANCE_POINTS;
  const positiveRebuildAudit = JSON.parse(fs.readFileSync(positiveRebuildAuditPath, 'utf8')) as UnifiedPositiveCandidateRebuildAuditReport;
  const snapshots = loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(auditDir, { startDate, endDate });
  const fiveMinute = loadFiveMinuteBars({ auditDir, instrument, startDate, endDate, marketBarsJson });
  const report = buildUnifiedPositiveFresh5mProofReport({
    positiveRebuildAudit,
    snapshots,
    fiveMinuteBars: fiveMinute.bars,
    fiveMinuteSource: fiveMinute.source,
    positiveRebuildAuditPath,
    auditDir,
    marketBarsJson,
    startDate,
    endDate,
    instrument,
    tolerancePoints,
  });
  const paths = writeUnifiedPositiveFresh5mProofReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveFresh5mProofCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
