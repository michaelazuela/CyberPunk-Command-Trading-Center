import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport,
  type RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit';

type Direction = 'LONG' | 'SHORT';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ReplayPackageRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  firstSeenTime: string;
  lastSeenTime: string;
  occurrences: number;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  t1R: number | null;
  t2R: number | null;
  proofState: string;
  triageScore: number;
  sourceTapePath: string;
  barsSource: 'scanner_decision_tape_completed_5m' | 'missing';
  barsLoaded: number;
  barsAfterProof: number;
  firstBarTime: string | null;
  lastBarTime: string | null;
  outcomeInputStatus: 'ready_for_read_only_outcome_replay';
  blockers: [];
}

interface RealMetadataInput {
  artifactPath: string;
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_broader_daily_replay_package';
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
    auditDir: string;
    artifactPaths: string[];
  };
  assumptions: {
    savedSingleDayArtifactsOnly: true;
    latestArtifactPerDateOnly: true;
    usesCurrentProofSelectionSignalBuilder: true;
    usesScannerDecisionTapeCompleted5mOnly: true;
    dedupesEquivalentCandidateRows: true;
    missingBarsAreNotInvented: true;
    outcomeIsNotCalculatedInThisStep: true;
    livePromotionAllowed: false;
  };
  summary: {
    artifactsRead: number;
    artifactDates: number;
    metadataReportsFailed: number;
    realKeepLaterRowsRead: number;
    duplicateRowsSkipped: number;
    readyReplayRows: number;
    excludedMissingLevelRows: number;
    excludedInvalidGeometryRows: number;
    excludedMissingTapeRows: number;
    excludedMissingBarsAfterProofRows: number;
    modelGroups: number;
    sessionGroups: number;
    livePromotionAllowedRows: 0;
  };
  rows: ReplayPackageRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const SINGLE_DAY_ARTIFACT = /^raw-ohlc-scanner-artifacts-MES-(\d{4}-\d{2}-\d{2})-to-\1-\d+\.json$/;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = num(record.open);
  const high = num(record.high);
  const low = num(record.low);
  const close = num(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  const volume = num(record.volume);
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function levelR(direction: Direction, entry: number, stop: number, target: number): number | null {
  const risk = Math.abs(entry - stop);
  if (risk <= 0) return null;
  return direction === 'LONG' ? round((target - entry) / risk) : round((entry - target) / risk);
}

function stopValid(direction: Direction, entry: number, stop: number): boolean {
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function targetsValid(direction: Direction, entry: number, t1: number, t2: number): boolean {
  return direction === 'LONG' ? t1 > entry && t2 > entry : t1 < entry && t2 < entry;
}

function tapePath(auditDir: string, row: { tradeDate: string; session: string }): string {
  return path.join(auditDir, `scanner-decision-tape-${row.tradeDate}-MES-${row.session}.json`);
}

function loadDecisionTapeBars(sourceTapePath: string): OhlcBar[] {
  if (!fs.existsSync(sourceTapePath)) return [];
  const tape = readJson<Record<string, unknown>>(sourceTapePath);
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function latestSingleDayArtifacts(reportDir: string): string[] {
  if (!fs.existsSync(reportDir)) return [];
  const byDate = new Map<string, string>();
  for (const name of fs.readdirSync(reportDir)) {
    const match = name.match(SINGLE_DAY_ARTIFACT);
    if (!match) continue;
    const filePath = path.join(reportDir, name);
    const existing = byDate.get(match[1]);
    if (!existing || fs.statSync(filePath).mtimeMs > fs.statSync(existing).mtimeMs) byDate.set(match[1], filePath);
  }
  return [...byDate.values()].sort();
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport['authority'] {
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

function rowKey(row: {
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  completedBarTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
}): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    normalizeTime(row.completedBarTime) || row.completedBarTime,
    row.entry,
    row.stop,
    row.target1,
    row.target2,
  ].join('|');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Broader Daily Real-Row Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only package from saved single-day scanner artifacts and local scanner-decision tapes. It does not calculate outcomes, install rank consumers, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Artifacts read: ${report.summary.artifactsRead}.`,
    `- Artifact dates: ${report.summary.artifactDates}.`,
    `- Metadata reports failed: ${report.summary.metadataReportsFailed}.`,
    `- Real keep-later rows read: ${report.summary.realKeepLaterRowsRead}.`,
    `- Duplicate rows skipped: ${report.summary.duplicateRowsSkipped}.`,
    `- Ready replay rows: ${report.summary.readyReplayRows}.`,
    `- Excluded missing-level rows: ${report.summary.excludedMissingLevelRows}.`,
    `- Excluded invalid-geometry rows: ${report.summary.excludedInvalidGeometryRows}.`,
    `- Excluded missing-tape rows: ${report.summary.excludedMissingTapeRows}.`,
    `- Excluded missing-bars-after-proof rows: ${report.summary.excludedMissingBarsAfterProofRows}.`,
    `- Model groups: ${report.summary.modelGroups}.`,
    `- Session groups: ${report.summary.sessionGroups}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport(args: {
  reportDir?: string;
  auditDir?: string;
  artifactPaths?: string[];
  realMetadataReports?: RealMetadataInput[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const auditDir = path.resolve(args.auditDir || DEFAULT_AUDIT_DIR);
  const artifactPaths = (args.artifactPaths || latestSingleDayArtifacts(reportDir)).map((item) => path.resolve(item));
  const realInputs: RealMetadataInput[] = args.realMetadataReports || artifactPaths.map((artifactPath) => ({
    artifactPath,
    report: buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport({
      artifactPath,
      artifact: fs.existsSync(artifactPath) ? readJson<Record<string, unknown>>(artifactPath) : null,
    }),
  }));

  let realKeepLaterRowsRead = 0;
  let duplicateRowsSkipped = 0;
  let excludedMissingLevelRows = 0;
  let excludedInvalidGeometryRows = 0;
  let excludedMissingTapeRows = 0;
  let excludedMissingBarsAfterProofRows = 0;
  const seen = new Set<string>();
  const rows: ReplayPackageRow[] = [];

  for (const input of realInputs) {
    for (const source of input.report.rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof')) {
      realKeepLaterRowsRead += 1;
      const key = rowKey(source);
      if (seen.has(key)) {
        duplicateRowsSkipped += 1;
        continue;
      }
      seen.add(key);

      const tradeDate = str(source.tradeDate);
      const session = str(source.session);
      const setupType = str(source.setupType);
      const direction = source.direction === 'LONG' || source.direction === 'SHORT' ? source.direction : null;
      const proofTime = normalizeTime(source.completedBarTime);
      const entry = num(source.entry);
      const stop = num(source.stop);
      const t1 = num(source.target1);
      const t2 = num(source.target2);
      if (!tradeDate || !session || !setupType || !direction || !proofTime || entry === null || stop === null || t1 === null || t2 === null) {
        excludedMissingLevelRows += 1;
        continue;
      }
      if (!stopValid(direction, entry, stop) || !targetsValid(direction, entry, t1, t2)) {
        excludedInvalidGeometryRows += 1;
        continue;
      }
      const sourceTapePath = tapePath(auditDir, { tradeDate, session });
      const bars = loadDecisionTapeBars(sourceTapePath);
      if (!fs.existsSync(sourceTapePath) || bars.length === 0) {
        excludedMissingTapeRows += 1;
        continue;
      }
      const barsAfterProof = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)).length;
      if (barsAfterProof === 0) {
        excludedMissingBarsAfterProofRows += 1;
        continue;
      }
      const riskPoints = round(Math.abs(entry - stop));
      rows.push({
        ticketId: `${path.basename(input.artifactPath, '.json')}|${source.candidateKey}`,
        tradeDate,
        session,
        instrument: 'MES',
        setupType,
        direction,
        proofTime,
        firstSeenTime: proofTime,
        lastSeenTime: proofTime,
        occurrences: 1,
        entry,
        stop,
        t1,
        t2,
        riskPoints,
        t1R: levelR(direction, entry, stop, t1),
        t2R: levelR(direction, entry, stop, t2),
        proofState: 'broader_daily_real_metadata_keep_later_sweep_proof',
        triageScore: 0,
        sourceTapePath,
        barsSource: 'scanner_decision_tape_completed_5m',
        barsLoaded: bars.length,
        barsAfterProof,
        firstBarTime: bars[0]?.time || null,
        lastBarTime: bars[bars.length - 1]?.time || null,
        outcomeInputStatus: 'ready_for_read_only_outcome_replay',
        blockers: [],
      });
    }
  }

  const metadataReportsFailed = realInputs.filter((input) => input.report.status !== 'pass').length;
  const blockers = [
    artifactPaths.length === 0 && !args.realMetadataReports ? 'missing saved single-day scanner artifacts' : null,
    realKeepLaterRowsRead === 0 ? 'no keep_later_sweep_proof rows found across daily artifacts' : null,
    rows.length === 0 ? 'no broader daily real rows are ready for outcome replay' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_broader_daily_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, auditDir, artifactPaths },
    assumptions: {
      savedSingleDayArtifactsOnly: true,
      latestArtifactPerDateOnly: true,
      usesCurrentProofSelectionSignalBuilder: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      dedupesEquivalentCandidateRows: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      artifactsRead: realInputs.length,
      artifactDates: new Set(realInputs.map((input) => path.basename(input.artifactPath).match(SINGLE_DAY_ARTIFACT)?.[1] || input.artifactPath)).size,
      metadataReportsFailed,
      realKeepLaterRowsRead,
      duplicateRowsSkipped,
      readyReplayRows: rows.length,
      excludedMissingLevelRows,
      excludedInvalidGeometryRows,
      excludedMissingTapeRows,
      excludedMissingBarsAfterProofRows,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
    },
    rows: rows.sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}`)),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved single-day artifact or local scanner-decision tape coverage before outcome replay.']
      : [
        metadataReportsFailed
          ? 'Some daily artifacts produced no standalone proofSelectionSignal rows; keep that as coverage context, not a hard blocker.'
          : 'All daily metadata reports passed.',
        'Run read-only outcome replay on this broader daily package, then rerun slate/filter simulation before any runtime rank consumer.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const auditDir = path.resolve(readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowBroaderDailyReplayPackageReport({ reportDir, auditDir });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
