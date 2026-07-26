import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SetupType, type SetupCandidate } from '../../src/types';
import type { NoChaseIntradayGeometryBlockerClassifierReport } from './no-chase-intraday-geometry-blocker-classifier';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Swing {
  type: 'high' | 'low';
  price: number;
  time: string;
  index: number;
}

interface CliOptions {
  classifierReport: string;
  marketBarsJson: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

export interface NoChaseMssTimestampAlignmentValidationReport {
  reportType: 'no_chase_mss_timestamp_alignment_validation';
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
    classifierReportPath: string;
    marketBarsJson: string;
    auditDir: string;
  };
  summary: {
    timestampBlockedRows: number;
    mssTimestampMatchedRows: number;
    protectedSwingFoundRows: number;
    validStopRecoveredRows: number;
    stillMissingEntryRows: number;
    stillBlockedRows: number;
    canExecuteChangedRows: 0;
    publishDiscordRows: 0;
    livePromotionAllowedRows: 0;
    recommendedNextFix: 'validate_source_builder_ohlc_alignment_fallback' | 'hold_timestamp_repair';
  };
  rows: Array<{
    caseId: string;
    tradeDate: string;
    sessionType: string;
    direction: string;
    entry: number | null;
    mssEvidenceTimestamp: string | null;
    mssTimestampMatched: boolean;
    matchedBarIndex: number;
    protectedSwing: Swing | null;
    recoveredStop: number | null;
    recoveredStopDirectionallyValid: boolean | null;
    stillBlockedReason: string | null;
    canExecute: false;
    publishDiscord: false;
    livePromotionAllowed: false;
  }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TICK_SIZE = 0.25;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseMssTimestampAlignmentValidationArgs(args = process.argv.slice(2)): CliOptions {
  const classifierReport = readFlag(args, '--classifier-report');
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!classifierReport) throw new Error('--classifier-report is required.');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    classifierReport,
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
  const time = normalizeTime(record.time ?? record.timestamp ?? record.candle_time_et);
  const open = numberOrNull(record.open);
  const high = numberOrNull(record.high);
  const low = numberOrNull(record.low);
  const close = numberOrNull(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  return { time, open, high, low, close };
}

function loadFiveMinuteBars(marketBarsJson: string): OhlcBar[] {
  const raw = readJson<unknown>(marketBarsJson);
  const grouped = asRecord(asRecord(raw).bars || asRecord(raw).timeframes || raw);
  const rows = Array.isArray(grouped['5m'])
    ? grouped['5m'] as unknown[]
    : Array.isArray(raw)
      ? raw.filter((row) => asRecord(row).timeframe === '5m')
      : [];
  const byTime = new Map<string, OhlcBar>();
  for (const bar of rows.map(normalizeBar)) {
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

function sourceCandidate(snapshotId: string, auditDir: string, direction: string): SetupCandidate | null {
  const file = path.join(auditDir, `${snapshotId}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = readJson<unknown>(file);
  const candidates = asRecord(asRecord(raw).normalizedPlan).setupCandidates;
  if (!Array.isArray(candidates)) return null;
  return (candidates as SetupCandidate[]).find((candidate) =>
    candidate.setupType === SetupType.NoSetup &&
    candidate.direction === direction &&
    (candidate.missingEvidence || []).join(' ').includes('timestamp does not align')
  ) || null;
}

function extractMssTimestamp(candidate: SetupCandidate | null): string | null {
  const evidence = candidate?.activeRuleset?.timeframeMss?.evidence || [];
  const match = evidence.join(' ').match(/completed at ([0-9T:.\-]+)/);
  return normalizeTime(match?.[1]?.replace(/\.$/, ''));
}

function confirmedSwings(bars: OhlcBar[], strength = 1): Swing[] {
  const swings: Swing[] = [];
  for (let index = strength; index < bars.length - strength; index += 1) {
    const candle = bars[index];
    const left = bars.slice(index - strength, index);
    const right = bars.slice(index + 1, index + strength + 1);
    if (left.every((bar) => candle.high > bar.high) && right.every((bar) => candle.high > bar.high)) {
      swings.push({ type: 'high', price: candle.high, time: candle.time, index });
    }
    if (left.every((bar) => candle.low < bar.low) && right.every((bar) => candle.low < bar.low)) {
      swings.push({ type: 'low', price: candle.low, time: candle.time, index });
    }
  }
  return swings;
}

function authority(): NoChaseMssTimestampAlignmentValidationReport['authority'] {
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<NoChaseMssTimestampAlignmentValidationReport, 'markdown'>): string {
  return [
    '# No-Chase MSS Timestamp Alignment Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report research only. It validates canonical 5M OHLC timestamp alignment and protected swing availability without changing scanner behavior, trading rules, canExecute, Discord, Supabase, bridge behavior, or plan math.',
    '',
    '## Summary',
    `- Timestamp-blocked rows: ${report.summary.timestampBlockedRows}.`,
    `- MSS timestamp matched rows: ${report.summary.mssTimestampMatchedRows}.`,
    `- Protected swing found rows: ${report.summary.protectedSwingFoundRows}.`,
    `- Valid stop recovered rows: ${report.summary.validStopRecoveredRows}.`,
    `- Still missing entry rows: ${report.summary.stillMissingEntryRows}.`,
    `- Still blocked rows: ${report.summary.stillBlockedRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Discord publish rows: ${report.summary.publishDiscordRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommended next fix: ${report.summary.recommendedNextFix}.`,
    '',
    '## Rows',
    '| Case | MSS Time | Swing | Recovered Stop | Valid | Still Blocked |',
    '|---|---|---|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.caseId)} | ${row.mssEvidenceTimestamp || '-'} | ${row.protectedSwing ? `${row.protectedSwing.type} ${row.protectedSwing.price} @ ${row.protectedSwing.time}` : '-'} | ${row.recoveredStop ?? '-'} | ${row.recoveredStopDirectionallyValid ?? '-'} | ${escapeTable(row.stillBlockedReason || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

interface NoChaseProtectedGeometryLike {
  rows: Array<{ caseId: string; firstNoChaseSnapshotId: string; tradeDate: string; sessionType: string; direction: string }>;
}

export function buildNoChaseMssTimestampAlignmentValidationReportFromReports(args: {
  classifierReportPath: string;
  marketBarsJson: string;
  auditDir: string;
  classifierReport: NoChaseIntradayGeometryBlockerClassifierReport | null;
  omissionRows: NoChaseProtectedGeometryLike['rows'];
  bars: OhlcBar[];
}, generatedAt = new Date().toISOString()): NoChaseMssTimestampAlignmentValidationReport {
  const omissionByCase = new Map(args.omissionRows.map((row) => [row.caseId, row]));
  const rows = (args.classifierReport?.rows || [])
    .filter((row) => row.blockerFamily === 'mss_timestamp_alignment_stop_blocked')
    .map((row) => {
      const omission = omissionByCase.get(row.caseId);
      const candidate = omission ? sourceCandidate(omission.firstNoChaseSnapshotId, args.auditDir, row.direction) : null;
      const mssTime = extractMssTimestamp(candidate);
      const dayBars = args.bars.filter((bar) => bar.time.slice(0, 10) === row.tradeDate);
      const matchedBarIndex = mssTime ? dayBars.findIndex((bar) => bar.time === mssTime) : -1;
      const swingType: Swing['type'] = row.direction === 'LONG' ? 'low' : 'high';
      const protectedSwing = matchedBarIndex >= 0
        ? confirmedSwings(dayBars).filter((swing) => swing.type === swingType && swing.index < matchedBarIndex).at(-1) || null
        : null;
      const recoveredStop = protectedSwing
        ? row.direction === 'LONG'
          ? protectedSwing.price - TICK_SIZE
          : protectedSwing.price + TICK_SIZE
        : null;
      const valid = recoveredStop !== null && row.entry !== null
        ? row.direction === 'LONG'
          ? recoveredStop < row.entry
          : recoveredStop > row.entry
        : null;
      const stillBlockedReason = !omission
        ? 'missing omission row for classifier case'
        : !mssTime
          ? 'missing parsed MSS evidence timestamp'
          : matchedBarIndex < 0
            ? 'MSS evidence timestamp not found in canonical 5M bars'
            : !protectedSwing
              ? 'no confirmed protected swing before MSS timestamp'
              : row.entry === null
                ? 'entry still missing; stop recovery alone cannot form a deterministic plan'
                : valid !== true
                  ? 'recovered stop is not directionally valid against entry'
                  : null;
      return {
        caseId: row.caseId,
        tradeDate: row.tradeDate,
        sessionType: row.sessionType,
        direction: row.direction,
        entry: row.entry,
        mssEvidenceTimestamp: mssTime,
        mssTimestampMatched: matchedBarIndex >= 0,
        matchedBarIndex,
        protectedSwing,
        recoveredStop,
        recoveredStopDirectionallyValid: valid,
        stillBlockedReason,
        canExecute: false as const,
        publishDiscord: false as const,
        livePromotionAllowed: false as const,
      };
    });
  const blockers = [
    !args.classifierReport ? 'missing no-chase intraday geometry blocker classifier report' : null,
    rows.length === 0 ? 'no timestamp-alignment blocker rows available to validate' : null,
    rows.some((row) => row.canExecute !== false) ? 'one or more rows changed canExecute' : null,
    rows.some((row) => row.publishDiscord !== false) ? 'one or more rows enabled Discord publishing' : null,
    rows.some((row) => row.livePromotionAllowed !== false) ? 'one or more rows allowed live promotion' : null,
  ].filter((item): item is string => Boolean(item));
  const validStopRecoveredRows = rows.filter((row) => row.recoveredStopDirectionallyValid === true).length;
  const base: Omit<NoChaseMssTimestampAlignmentValidationReport, 'markdown'> = {
    reportType: 'no_chase_mss_timestamp_alignment_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      classifierReportPath: args.classifierReportPath,
      marketBarsJson: args.marketBarsJson,
      auditDir: args.auditDir,
    },
    summary: {
      timestampBlockedRows: rows.length,
      mssTimestampMatchedRows: rows.filter((row) => row.mssTimestampMatched).length,
      protectedSwingFoundRows: rows.filter((row) => row.protectedSwing !== null).length,
      validStopRecoveredRows,
      stillMissingEntryRows: rows.filter((row) => row.stillBlockedReason?.includes('entry still missing')).length,
      stillBlockedRows: rows.filter((row) => row.stillBlockedReason !== null).length,
      canExecuteChangedRows: 0,
      publishDiscordRows: 0,
      livePromotionAllowedRows: 0,
      recommendedNextFix: validStopRecoveredRows > 0 ? 'validate_source_builder_ohlc_alignment_fallback' : 'hold_timestamp_repair',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix timestamp-alignment validation inputs before considering a source-builder fallback.']
      : [
        'Validate a source-builder OHLC alignment fallback in tests before any live scanner behavior change.',
        'Only rows with recovered directionally valid stops and existing entries are candidates for a future guarded source fix.',
        'Rows still missing entry remain blocked; do not create tickets from stop recovery alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseMssTimestampAlignmentValidationReport(
  report: NoChaseMssTimestampAlignmentValidationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-mss-timestamp-alignment-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

function latestOmissionReport(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => /^no-chase-protected-geometry-omission-diagnostic-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function runNoChaseMssTimestampAlignmentValidationCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseMssTimestampAlignmentValidationArgs(args);
  const classifierReport = fs.existsSync(options.classifierReport)
    ? readJson<NoChaseIntradayGeometryBlockerClassifierReport>(options.classifierReport)
    : null;
  const omissionPath = readFlag(args, '--omission-report') || latestOmissionReport(options.outDir);
  const omissionRows = omissionPath && fs.existsSync(omissionPath)
    ? readJson<NoChaseProtectedGeometryLike>(omissionPath).rows
    : [];
  const report = buildNoChaseMssTimestampAlignmentValidationReportFromReports({
    classifierReportPath: options.classifierReport,
    marketBarsJson: options.marketBarsJson,
    auditDir: options.auditDir,
    classifierReport,
    omissionRows,
    bars: fs.existsSync(options.marketBarsJson) ? loadFiveMinuteBars(options.marketBarsJson) : [],
  });
  const paths = writeNoChaseMssTimestampAlignmentValidationReport(report, options.outDir);
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
    runNoChaseMssTimestampAlignmentValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
