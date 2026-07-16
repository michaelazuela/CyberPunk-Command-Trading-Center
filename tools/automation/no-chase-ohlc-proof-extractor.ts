import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook, type UnifiedDeskCandidateBookItem } from '../../src/lib/unifiedDeskCandidateBook';
import { SetupType, type SetupCandidate } from '../../src/types';
import { loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir, type UnifiedDeskCandidateDiagnosticSnapshot } from './unified-desk-candidate-book-diagnostic';

type ReplaySession = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch' | 'replay_evening';
type ProofSetup = SetupType.IntradayMssMicroContinuation | SetupType.AfterLunchDriveFvgContinuation;
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

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
  SetupType.IntradayMssMicroContinuation,
  SetupType.AfterLunchDriveFvgContinuation,
];
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];
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

function recommendationFor(item: Pick<NoChaseOhlcProofCase, 'proofStatus' | 'proofType'>): string {
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
    blocker: proofStatus === 'ohlc_proof_found' ? null : recommendationFor({ proofStatus, proofType: null }),
  };
  return { ...base, recommendation: recommendationFor(base) };
}

function buildRecommendations(report: Omit<NoChaseOhlcProofExtractorReport, 'recommendations' | 'markdown'>): string[] {
  const lines = [
    'This extractor is research-only. It must not create canExecute, Discord tickets, or scanner promotions.',
    'Keep TurtleSoup and SweepMssFvgRetrace out of scope for this phase.',
  ];
  if (report.summary.ohlcProofFound > 0) {
    lines.push('Review proof-found cases manually against chart context, then decide whether scanner artifact capture missed valid completed 5M proof.');
  } else {
    lines.push('No local OHLC proof was found for target no-chase cases; keep the current no-chase block intact.');
  }
  if (report.summary.fiveMinuteSource === 'scanner_decision_tape_completed_5m') {
    lines.push('Decision-tape OHLC is 5M-only; a stronger follow-up can use canonical market_bars JSON with HTF frames, still read-only.');
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
    `- 5M bars loaded: ${report.summary.fiveMinuteBarsLoaded} from ${report.summary.fiveMinuteSource}.`,
    '',
    '## Cases',
    '| Date | Session | Setup | Side | Ref | Ref Source | Future Bars | Status | Proof Type | Proof Time | Recommendation |',
    '|---|---|---|---|---:|---|---:|---|---|---|---|',
    ...report.cases.map((item) => `| ${item.tradeDate} | ${item.sessionType} | ${item.setupType} | ${item.direction} | ${item.referenceLevel ?? '-'} | ${item.referenceSource} | ${item.futureBarsChecked} | ${item.proofStatus} | ${item.proofType || '-'} | ${item.proofBarTime || '-'} | ${item.recommendation} |`),
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
      intradayCases: cases.filter((item) => item.setupType === SetupType.IntradayMssMicroContinuation).length,
      intradayProofFound: cases.filter((item) => item.setupType === SetupType.IntradayMssMicroContinuation && item.proofStatus === 'ohlc_proof_found').length,
      afterLunchCases: cases.filter((item) => item.setupType === SetupType.AfterLunchDriveFvgContinuation).length,
      afterLunchProofFound: cases.filter((item) => item.setupType === SetupType.AfterLunchDriveFvgContinuation && item.proofStatus === 'ohlc_proof_found').length,
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
