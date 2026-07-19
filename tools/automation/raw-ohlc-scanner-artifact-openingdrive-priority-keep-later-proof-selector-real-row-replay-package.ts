import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

interface JsonReport {
  status?: string;
  rows?: Record<string, unknown>[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_replay_package';
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
    realMetadataReplayPath: string | null;
  };
  assumptions: {
    savedRealMetadataRowsOnly: true;
    usesScannerDecisionTapeCompleted5mOnly: true;
    missingBarsAreNotInvented: true;
    outcomeIsNotCalculatedInThisStep: true;
    livePromotionAllowed: false;
  };
  summary: {
    realKeepLaterRowsRead: number;
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

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
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

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Real-Row Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay package from saved real metadata rows and local scanner-decision tapes. It does not calculate outcomes, install rank consumers, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Real keep-later rows read: ${report.summary.realKeepLaterRowsRead}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport(args: {
  reportDir?: string;
  auditDir?: string;
  realMetadataReplayPath?: string | null;
  realMetadataReplay?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const auditDir = path.resolve(args.auditDir || DEFAULT_AUDIT_DIR);
  const realPath = args.realMetadataReplayPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit-');
  const real = args.realMetadataReplay ?? (realPath && fs.existsSync(realPath) ? readJson<JsonReport>(realPath) : null);
  const realRows = (real?.rows || []).filter((row) => row.selectorDecision === 'keep_later_sweep_proof');
  let excludedMissingLevelRows = 0;
  let excludedInvalidGeometryRows = 0;
  let excludedMissingTapeRows = 0;
  let excludedMissingBarsAfterProofRows = 0;
  const rows: ReplayPackageRow[] = [];
  for (const source of realRows) {
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
      ticketId: str(source.candidateKey) || `${tradeDate}|${session}|${setupType}|${direction}|${proofTime}`,
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
      proofState: 'real_metadata_keep_later_sweep_proof',
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
  const blockers = [
    !realPath ? 'missing real-metadata replay audit report' : null,
    !real ? 'missing real-metadata replay audit data' : null,
    real && real.status !== 'pass' ? `real-metadata replay status ${real.status}` : null,
    realRows.length === 0 ? 'real-metadata replay has no keep_later_sweep_proof rows' : null,
    rows.length === 0 ? 'no real keep-later rows are ready for outcome replay' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, auditDir, realMetadataReplayPath: realPath },
    assumptions: {
      savedRealMetadataRowsOnly: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      realKeepLaterRowsRead: realRows.length,
      readyReplayRows: rows.length,
      excludedMissingLevelRows,
      excludedInvalidGeometryRows,
      excludedMissingTapeRows,
      excludedMissingBarsAfterProofRows,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run outcome replay until the real-row replay package has ready rows.']
      : ['Run read-only outcome replay on this same-date real-row package; keep runtime ranking disabled.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const auditDir = path.resolve(readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowReplayPackageReport({ reportDir, auditDir });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-replay-package-${Date.now()}.json`);
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
