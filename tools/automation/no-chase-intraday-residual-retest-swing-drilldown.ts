import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRADE_RULES, targetsFromEntryStop } from '../../src/config/tradeRules';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import type { NoChaseIntradayBlockerDispositionRollupReport } from './no-chase-intraday-blocker-disposition-rollup';
import type { NoChaseProtectedGeometryOmissionDiagnosticReport } from './no-chase-protected-geometry-omission-diagnostic';

type Direction = 'LONG' | 'SHORT';
type ReplaySession = 'morning' | 'lunch';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type Outcome = 'T2_HIT' | 'T1_HIT_OPEN_RUNNER' | 'T1_THEN_STOP' | 'STOP_HIT' | 'AMBIGUOUS' | 'NO_FILL' | 'BLOCKED';

interface CliOptions {
  dispositionRollup: string;
  omissionReport: string;
  auditDir: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface CandidateSnapshotFields {
  snapshotId: string;
  firstNoChaseTime: string;
  proofBarTime: string | null;
  entry: number | null;
  decisionLevel: number | null;
  candidateState: string | null;
  blockReason: string | null;
  missingEvidence: string[];
}

interface SwingProbe {
  swingTime: string;
  confirmedAt: string;
  price: number;
  stop: number;
  riskPoints: number | null;
  maxRiskPass: boolean;
  target1: number | null;
  target2: number | null;
  outcome: Outcome;
  outcomeTime: string | null;
  oneMesGross: number;
}

interface DrilldownRow {
  caseId: string;
  tradeDate: string;
  sessionType: ReplaySession;
  direction: Direction;
  snapshot: CandidateSnapshotFields | null;
  sessionBars: number;
  candidateSwings: number;
  firstConfirmedSwing: SwingProbe | null;
  firstRiskValidSwing: SwingProbe | null;
  bestOutcomeSwing: SwingProbe | null;
  disposition: 'no_source_snapshot' | 'entry_missing' | 'decision_level_missing' | 'no_confirmed_retest_swing' | 'risk_valid_probe_found' | 'wide_or_losing_probe_only';
  recommendation: string;
}

export interface NoChaseIntradayResidualRetestSwingDrilldownReport {
  reportType: 'no_chase_intraday_residual_retest_swing_drilldown';
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
    usesHypotheticalGeometry: true;
  };
  source: {
    dispositionRollupPath: string;
    omissionReportPath: string;
    auditDir: string;
    marketBarsJson: string;
  };
  summary: {
    rowsChecked: number;
    noSourceSnapshotRows: number;
    entryMissingRows: number;
    decisionLevelMissingRows: number;
    noConfirmedRetestSwingRows: number;
    riskValidProbeRows: number;
    wideOrLosingProbeOnlyRows: number;
    winningRiskValidRows: number;
    losingRiskValidRows: number;
    oneMesGrossRiskValid: number;
    canExecuteTrueRows: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'candidate_for_source_builder_probe' | 'keep_blocked' | 'fix_inputs';
  };
  rows: DrilldownRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const dispositionRollup = readFlag(args, '--disposition-rollup');
  const omissionReport = readFlag(args, '--omission-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!dispositionRollup) throw new Error('--disposition-rollup is required.');
  if (!omissionReport) throw new Error('--omission-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    dispositionRollup,
    omissionReport,
    marketBarsJson,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
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

function normalizeBar(value: unknown): NinjaBridgeBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  return { time, open, high, low, close, volume: finiteNumber(record.volume) ?? 0 };
}

function loadBars(file: string): Record<Timeframe, NinjaBridgeBar[]> {
  const raw = readJson<unknown>(file);
  const grouped = asRecord(asRecord(raw).bars || asRecord(raw).timeframes || raw);
  const output: Record<Timeframe, NinjaBridgeBar[]> = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  for (const timeframe of TIMEFRAMES) {
    const rows = Array.isArray(grouped[timeframe]) ? grouped[timeframe] as unknown[] : [];
    output[timeframe] = rows.map(normalizeBar).filter((bar): bar is NinjaBridgeBar => Boolean(bar)).sort((a, b) => a.time.localeCompare(b.time));
  }
  return output;
}

function minutes(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function inSession(bar: NinjaBridgeBar, date: string, session: ReplaySession): boolean {
  if (bar.time.slice(0, 10) !== date) return false;
  const minute = minutes(bar.time);
  if (minute === null) return false;
  if (session === 'morning') return minute >= 9 * 60 + 15 && minute < 12 * 60;
  return minute >= 12 * 60 && minute < 16 * 60;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToTick(value: number): number {
  return Math.round(value / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function directionFrom(value: string): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function replayOutcome(args: {
  direction: Direction;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  confirmedAt: string | null;
  bars: NinjaBridgeBar[];
}): Pick<SwingProbe, 'outcome' | 'outcomeTime' | 'oneMesGross'> {
  if (args.entry === null || args.stop === null || args.target1 === null || args.target2 === null || !args.confirmedAt) {
    return { outcome: 'BLOCKED', outcomeTime: null, oneMesGross: 0 };
  }
  const futureBars = args.bars.filter((bar) => bar.time > args.confirmedAt);
  if (!futureBars.some((bar) => bar.low <= args.entry! && bar.high >= args.entry!)) {
    return { outcome: 'NO_FILL', outcomeTime: null, oneMesGross: 0 };
  }
  const fillIndex = futureBars.findIndex((bar) => bar.low <= args.entry! && bar.high >= args.entry!);
  const afterFill = futureBars.slice(fillIndex + 1);
  const isLong = args.direction === 'LONG';
  const stopRisk = Math.abs(args.entry - args.stop) * 5;
  const target1Profit = Math.abs(args.target1 - args.entry) * 5;
  const target2Profit = Math.abs(args.target2 - args.entry) * 5;
  let target1Hit = false;
  for (const bar of afterFill) {
    const hitStop = isLong ? bar.low <= args.stop : bar.high >= args.stop;
    const hitT1 = isLong ? bar.high >= args.target1 : bar.low <= args.target1;
    const hitT2 = isLong ? bar.high >= args.target2 : bar.low <= args.target2;
    if (!target1Hit && hitStop && (hitT1 || hitT2)) return { outcome: 'AMBIGUOUS', outcomeTime: bar.time, oneMesGross: 0 };
    if (hitT2) return { outcome: 'T2_HIT', outcomeTime: bar.time, oneMesGross: roundCurrency(target2Profit) };
    if (hitT1) target1Hit = true;
    if (hitStop) {
      return target1Hit
        ? { outcome: 'T1_THEN_STOP', outcomeTime: bar.time, oneMesGross: roundCurrency(target1Profit) }
        : { outcome: 'STOP_HIT', outcomeTime: bar.time, oneMesGross: roundCurrency(-stopRisk) };
    }
  }
  return target1Hit
    ? { outcome: 'T1_HIT_OPEN_RUNNER', outcomeTime: afterFill.find((bar) => isLong ? bar.high >= args.target1! : bar.low <= args.target1!)?.time || null, oneMesGross: roundCurrency(target1Profit) }
    : { outcome: 'NO_FILL', outcomeTime: null, oneMesGross: 0 };
}

function candidateSnapshot(args: {
  row: NoChaseProtectedGeometryOmissionDiagnosticReport['rows'][number];
  auditDir: string;
}): CandidateSnapshotFields | null {
  const file = path.join(args.auditDir, `${args.row.firstNoChaseSnapshotId}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = readJson<unknown>(file);
  const candidates = asRecord(asRecord(raw).normalizedPlan).setupCandidates;
  const source = Array.isArray(candidates)
    ? candidates.map(asRecord).find((candidate) => candidate.setupType === args.row.setupType && candidate.direction === args.row.direction)
    : null;
  const activeRuleset = asRecord(source?.activeRuleset);
  const line = finiteNumber(asRecord(activeRuleset.htfLineInSand).lineInSand);
  return {
    snapshotId: args.row.firstNoChaseSnapshotId,
    firstNoChaseTime: normalizeTime(args.row.firstNoChaseTime) || args.row.firstNoChaseTime,
    proofBarTime: normalizeTime(args.row.proofBarTime),
    entry: finiteNumber(source?.entry ?? asRecord(args.row.sourceFields).entry),
    decisionLevel: line,
    candidateState: typeof source?.candidateState === 'string' ? source.candidateState : null,
    blockReason: typeof source?.blockReason === 'string' ? source.blockReason : null,
    missingEvidence: Array.isArray(source?.missingEvidence) ? source.missingEvidence.filter((item): item is string => typeof item === 'string') : [],
  };
}

function findRetestSwingProbes(args: {
  direction: Direction;
  entry: number | null;
  decisionLevel: number | null;
  sessionBars: NinjaBridgeBar[];
  notBefore: string;
}): SwingProbe[] {
  if (args.entry === null || args.decisionLevel === null) return [];
  const tick = TRADE_RULES.targetModel.tickSize;
  const tolerance = tick;
  const probes: SwingProbe[] = [];
  for (let index = 1; index < args.sessionBars.length - 1; index += 1) {
    const left = args.sessionBars[index - 1];
    const candle = args.sessionBars[index];
    const right = args.sessionBars[index + 1];
    if (right.time <= args.notBefore) continue;
    const isSwing = args.direction === 'LONG'
      ? candle.low <= args.decisionLevel + tolerance && candle.low < left.low && candle.low < right.low
      : candle.high >= args.decisionLevel - tolerance && candle.high > left.high && candle.high > right.high;
    if (!isSwing) continue;
    const price = args.direction === 'LONG' ? candle.low : candle.high;
    const stop = roundToTick(args.direction === 'LONG' ? price - tick : price + tick);
    const targets = targetsFromEntryStop(args.direction, args.entry, stop);
    const maxRiskPass = targets.riskPoints !== null && targets.riskPoints <= TRADE_RULES.maxRiskPoints;
    const outcome = replayOutcome({
      direction: args.direction,
      entry: args.entry,
      stop,
      target1: targets.target1,
      target2: targets.target2,
      confirmedAt: right.time,
      bars: args.sessionBars,
    });
    probes.push({
      swingTime: candle.time,
      confirmedAt: right.time,
      price,
      stop,
      riskPoints: targets.riskPoints,
      maxRiskPass,
      target1: targets.target1,
      target2: targets.target2,
      outcome: outcome.outcome,
      outcomeTime: outcome.outcomeTime,
      oneMesGross: outcome.oneMesGross,
    });
  }
  return probes;
}

function rowRecommendation(row: DrilldownRow): string {
  if (row.disposition === 'risk_valid_probe_found') {
    return 'Research-only source-builder probe is justified: a later completed 5M retest swing exists with max-risk-valid geometry. Validate broader coverage before scanner behavior changes.';
  }
  if (row.disposition === 'wide_or_losing_probe_only') {
    return 'Keep blocked for now. A retest swing appears, but the max-risk/outcome profile is not strong enough for a live-facing source-builder change.';
  }
  if (row.disposition === 'no_confirmed_retest_swing') {
    return 'Keep blocked. No later completed protected 5M retest swing was found from saved OHLC.';
  }
  return 'Fix inputs or source snapshot coverage before proposing any behavior change.';
}

function buildRow(args: {
  dispositionRow: NoChaseIntradayBlockerDispositionRollupReport['rows'][number];
  omissionRow: NoChaseProtectedGeometryOmissionDiagnosticReport['rows'][number] | undefined;
  auditDir: string;
  bars5m: NinjaBridgeBar[];
}): DrilldownRow {
  const direction = directionFrom(args.dispositionRow.direction);
  const sessionType = args.dispositionRow.sessionType === 'morning' ? 'morning' : 'lunch';
  const sessionBars = args.bars5m.filter((bar) => inSession(bar, args.dispositionRow.tradeDate, sessionType));
  const snapshot = args.omissionRow && direction ? candidateSnapshot({ row: args.omissionRow, auditDir: args.auditDir }) : null;
  const probes = direction && snapshot
    ? findRetestSwingProbes({
      direction,
      entry: snapshot.entry,
      decisionLevel: snapshot.decisionLevel,
      sessionBars,
      notBefore: snapshot.proofBarTime || snapshot.firstNoChaseTime,
    })
    : [];
  const riskValid = probes.filter((probe) => probe.maxRiskPass);
  const bestOutcomeSwing = [...riskValid].sort((a, b) => b.oneMesGross - a.oneMesGross)[0] || null;
  let disposition: DrilldownRow['disposition'] = 'no_source_snapshot';
  if (snapshot?.entry === null) disposition = 'entry_missing';
  else if (snapshot?.decisionLevel === null) disposition = 'decision_level_missing';
  else if (!probes.length) disposition = 'no_confirmed_retest_swing';
  else if (riskValid.some((probe) => probe.oneMesGross > 0)) disposition = 'risk_valid_probe_found';
  else disposition = 'wide_or_losing_probe_only';
  const row: DrilldownRow = {
    caseId: args.dispositionRow.caseId,
    tradeDate: args.dispositionRow.tradeDate,
    sessionType,
    direction: direction || 'LONG',
    snapshot,
    sessionBars: sessionBars.length,
    candidateSwings: probes.length,
    firstConfirmedSwing: probes[0] || null,
    firstRiskValidSwing: riskValid[0] || null,
    bestOutcomeSwing,
    disposition,
    recommendation: '',
  };
  return { ...row, recommendation: rowRecommendation(row) };
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, '/');
}

function buildMarkdown(report: Omit<NoChaseIntradayResidualRetestSwingDrilldownReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Residual Retest-Swing Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved OHLC research only. No scanner behavior, Discord, Supabase, live bridge, canExecute, or trading-rule changes.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Risk-valid probe rows: ${report.summary.riskValidProbeRows}.`,
    `- Wide/losing probe only rows: ${report.summary.wideOrLosingProbeOnlyRows}.`,
    `- No confirmed retest swing rows: ${report.summary.noConfirmedRetestSwingRows}.`,
    `- One-MES gross on winning risk-valid probes: $${report.summary.oneMesGrossRiskValid.toFixed(2)}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Case | Entry | Line | Swings | First Risk-Valid Stop | Outcome | One MES | Disposition |',
    '|---|---:|---:|---:|---:|---|---:|---|',
    ...report.rows.map((row) => {
      const probe = row.firstRiskValidSwing;
      return `| ${markdownCell(row.caseId)} | ${row.snapshot?.entry ?? '-'} | ${row.snapshot?.decisionLevel ?? '-'} | ${row.candidateSwings} | ${probe?.stop ?? '-'} | ${probe ? `${probe.outcome}${probe.outcomeTime ? ` @ ${probe.outcomeTime}` : ''}` : '-'} | $${(probe?.oneMesGross || 0).toFixed(2)} | ${row.disposition} |`;
    }),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayResidualRetestSwingDrilldownReport(args: {
  dispositionRollupPath: string;
  omissionReportPath: string;
  auditDir: string;
  marketBarsJson: string;
  dispositionRollup: NoChaseIntradayBlockerDispositionRollupReport;
  omissionReport: NoChaseProtectedGeometryOmissionDiagnosticReport;
  bars: Record<Timeframe, NinjaBridgeBar[]>;
}, generatedAt = new Date().toISOString()): NoChaseIntradayResidualRetestSwingDrilldownReport {
  const omissionByCase = new Map(args.omissionReport.rows.map((row) => [row.caseId, row]));
  const sourceRows = args.dispositionRollup.rows.filter((row) => row.disposition === 'needs_retest_swing_residual_research');
  const rows = sourceRows.map((row) => buildRow({ dispositionRow: row, omissionRow: omissionByCase.get(row.caseId), auditDir: args.auditDir, bars5m: args.bars['5m'] }));
  const blockers = [
    rows.some((row) => row.disposition === 'no_source_snapshot') ? 'one or more residual rows could not load the source snapshot' : null,
    rows.some((row) => row.disposition === 'decision_level_missing') ? 'one or more residual rows are missing line-in-the-sand/decision-level metadata' : null,
  ].filter((item): item is string => Boolean(item));
  const winningRiskValid = rows.filter((row) => (row.firstRiskValidSwing?.oneMesGross || 0) > 0);
  const losingRiskValid = rows.filter((row) => (row.firstRiskValidSwing?.oneMesGross || 0) < 0);
  const base: Omit<NoChaseIntradayResidualRetestSwingDrilldownReport, 'markdown'> = {
    reportType: 'no_chase_intraday_residual_retest_swing_drilldown',
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
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      usesHypotheticalGeometry: true,
    },
    source: {
      dispositionRollupPath: args.dispositionRollupPath,
      omissionReportPath: args.omissionReportPath,
      auditDir: args.auditDir,
      marketBarsJson: args.marketBarsJson,
    },
    summary: {
      rowsChecked: rows.length,
      noSourceSnapshotRows: rows.filter((row) => row.disposition === 'no_source_snapshot').length,
      entryMissingRows: rows.filter((row) => row.disposition === 'entry_missing').length,
      decisionLevelMissingRows: rows.filter((row) => row.disposition === 'decision_level_missing').length,
      noConfirmedRetestSwingRows: rows.filter((row) => row.disposition === 'no_confirmed_retest_swing').length,
      riskValidProbeRows: rows.filter((row) => row.disposition === 'risk_valid_probe_found').length,
      wideOrLosingProbeOnlyRows: rows.filter((row) => row.disposition === 'wide_or_losing_probe_only').length,
      winningRiskValidRows: winningRiskValid.length,
      losingRiskValidRows: losingRiskValid.length,
      oneMesGrossRiskValid: roundCurrency(winningRiskValid.reduce((sum, row) => sum + (row.firstRiskValidSwing?.oneMesGross || 0), 0)),
      canExecuteTrueRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : winningRiskValid.length > 0
          ? 'candidate_for_source_builder_probe'
          : 'keep_blocked',
    },
    rows,
    blockers,
    recommendations: winningRiskValid.length > 0
      ? [
        'Run a broader source-builder probe on these residual rows before any scanner-visible change.',
        'Keep canExecute false and keep this human-review-only; the probe only proves later completed 5M retest-swing geometry may exist.',
        'Do not use this to promote missing-entry rows or pending-trigger rows.',
      ]
      : [
        'Keep residual retest-swing-stop rows blocked from the current evidence.',
        'Move to invalid-stop-location research next if no risk-valid positive probe exists.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayResidualRetestSwingDrilldownReport(
  report: NoChaseIntradayResidualRetestSwingDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-residual-retest-swing-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayResidualRetestSwingDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildNoChaseIntradayResidualRetestSwingDrilldownReport({
    dispositionRollupPath: options.dispositionRollup,
    omissionReportPath: options.omissionReport,
    auditDir: options.auditDir,
    marketBarsJson: options.marketBarsJson,
    dispositionRollup: readJson<NoChaseIntradayBlockerDispositionRollupReport>(options.dispositionRollup),
    omissionReport: readJson<NoChaseProtectedGeometryOmissionDiagnosticReport>(options.omissionReport),
    bars: loadBars(options.marketBarsJson),
  });
  const paths = writeNoChaseIntradayResidualRetestSwingDrilldownReport(report, options.outDir);
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
    runNoChaseIntradayResidualRetestSwingDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
