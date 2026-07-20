import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport,
} from './unified-positive-held-local-preview-model-family-geometry-drilldown';

type Direction = 'LONG' | 'SHORT';

interface DrilldownRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  firstSeenTime: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  sourceFile: string | null;
  geometryIssue: string;
}

interface TapeCandidate {
  eventTime: string;
  setupType: string;
  direction: Direction;
  detectedStatus: string | null;
  executionStatus: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  blockReason: string | null;
}

interface SourceTraceRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  geometryIssue: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  sourceFile: string | null;
  sourceTapeFound: boolean;
  exactBadSetupStatusEvents: number;
  firstExactBadSetupStatusTime: string | null;
  exactBadBlockReasons: string[];
  sameDirectionCandidates: number;
  validSameDirectionAfterFirstSeenEvents: number;
  firstValidSameDirectionAfterFirstSeen: TapeCandidate | null;
  sourceConclusion:
    | 'bad_geometry_present_in_setup_status'
    | 'bad_geometry_not_found_in_setup_status'
    | 'missing_source_tape';
}

interface SourceTraceGroup {
  groupId: string;
  setupType: string;
  direction: Direction | 'mixed';
  session: string | 'mixed';
  sourceConclusion: SourceTraceRow['sourceConclusion'];
  rows: number;
}

export interface UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport {
  reportType: 'unified_positive_held_local_preview_model_family_geometry_source_trace';
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
    geometryDrilldownPath: string | null;
    auditDir: string;
  };
  assumptions: {
    readsSavedDiagnosticsAndLocalTapesOnly: true;
    sourceTraceOnly: true;
    setupStatusPresenceDoesNotApproveExecution: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    drilldownRowsRead: number;
    tracedRows: number;
    sourceTapeFoundRows: number;
    badGeometryPresentInSetupStatusRows: number;
    badGeometryNotFoundRows: number;
    missingSourceTapeRows: number;
    rowsWithLaterValidSameDirectionCandidate: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'inspect_sweep_candidate_builder_invalid_stop_source'
      | 'inspect_replay_or_intake_mapping'
      | 'fix_missing_source_tapes'
      | 'no_rows_to_trace';
  };
  groups: SourceTraceGroup[];
  rows: SourceTraceRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport['authority'] {
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

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameNumber(a: number | null, b: number | null): boolean {
  return a !== null && b !== null && Math.abs(a - b) < 0.0001;
}

function geometryValid(candidate: TapeCandidate): boolean {
  if (candidate.entry === null || candidate.stop === null || candidate.target1 === null || candidate.target2 === null) {
    return false;
  }
  return candidate.direction === 'LONG'
    ? candidate.stop < candidate.entry && candidate.target1 > candidate.entry && candidate.target2 > candidate.entry
    : candidate.stop > candidate.entry && candidate.target1 < candidate.entry && candidate.target2 < candidate.entry;
}

function normalizeCandidate(eventTime: string, value: unknown): TapeCandidate | null {
  const record = asRecord(value);
  const setupType = typeof record.setupType === 'string' ? record.setupType : null;
  const direction = record.direction === 'LONG' || record.direction === 'SHORT' ? record.direction : null;
  if (!setupType || !direction) return null;
  return {
    eventTime,
    setupType,
    direction,
    detectedStatus: typeof record.detectedStatus === 'string' ? record.detectedStatus : null,
    executionStatus: typeof record.executionStatus === 'string' ? record.executionStatus : null,
    entry: numberOrNull(record.entry),
    stop: numberOrNull(record.stop),
    target1: numberOrNull(record.target1),
    target2: numberOrNull(record.target2),
    riskPoints: numberOrNull(record.riskPoints),
    blockReason: typeof record.blockReason === 'string' ? record.blockReason : null,
  };
}

function loadTapeCandidates(auditDir: string, sourceFile: string | null): TapeCandidate[] | null {
  if (!sourceFile) return null;
  const filePath = path.isAbsolute(sourceFile) ? sourceFile : path.join(auditDir, sourceFile);
  if (!fs.existsSync(filePath)) return null;
  const tape = readJson<Record<string, unknown>>(filePath);
  const candidates: TapeCandidate[] = [];
  for (const [eventKey, eventValue] of Object.entries(asRecord(tape.events))) {
    const event = asRecord(eventValue);
    const eventTime = normalizeTime(event.time) || normalizeTime(eventKey) || eventKey;
    const statuses = asRecord(asRecord(event.setupCandidateStatus).statuses);
    const statusValues = Array.isArray(asRecord(event.setupCandidateStatus).statuses)
      ? asRecord(event.setupCandidateStatus).statuses as unknown[]
      : Object.values(statuses);
    for (const status of statusValues) {
      const candidate = normalizeCandidate(eventTime, status);
      if (candidate) candidates.push(candidate);
    }
  }
  return candidates.sort((a, b) => timeMs(a.eventTime) - timeMs(b.eventTime));
}

function traceRow(row: DrilldownRow, auditDir: string): SourceTraceRow {
  const candidates = loadTapeCandidates(auditDir, row.sourceFile);
  if (!candidates) {
    return {
      rowId: row.rowId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      geometryIssue: row.geometryIssue,
      entry: row.entry,
      stop: row.stop,
      target1: row.target1,
      target2: row.target2,
      sourceFile: row.sourceFile,
      sourceTapeFound: false,
      exactBadSetupStatusEvents: 0,
      firstExactBadSetupStatusTime: null,
      exactBadBlockReasons: [],
      sameDirectionCandidates: 0,
      validSameDirectionAfterFirstSeenEvents: 0,
      firstValidSameDirectionAfterFirstSeen: null,
      sourceConclusion: 'missing_source_tape',
    };
  }
  const sameDirection = candidates.filter((candidate) => (
    candidate.setupType === row.setupType && candidate.direction === row.direction
  ));
  const exactBad = sameDirection.filter((candidate) => (
    sameNumber(candidate.entry, row.entry) &&
    sameNumber(candidate.stop, row.stop) &&
    !geometryValid(candidate)
  ));
  const validAfter = sameDirection.filter((candidate) => (
    timeMs(candidate.eventTime) >= timeMs(row.firstSeenTime) && geometryValid(candidate)
  ));
  const exactBadBlockReasons = [...new Set(exactBad.map((candidate) => candidate.blockReason || 'none'))].sort();
  return {
    rowId: row.rowId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    geometryIssue: row.geometryIssue,
    entry: row.entry,
    stop: row.stop,
    target1: row.target1,
    target2: row.target2,
    sourceFile: row.sourceFile,
    sourceTapeFound: true,
    exactBadSetupStatusEvents: exactBad.length,
    firstExactBadSetupStatusTime: exactBad[0]?.eventTime || null,
    exactBadBlockReasons,
    sameDirectionCandidates: sameDirection.length,
    validSameDirectionAfterFirstSeenEvents: validAfter.length,
    firstValidSameDirectionAfterFirstSeen: validAfter[0] || null,
    sourceConclusion: exactBad.length
      ? 'bad_geometry_present_in_setup_status'
      : 'bad_geometry_not_found_in_setup_status',
  };
}

function groupRows(rows: SourceTraceRow[]): SourceTraceGroup[] {
  const groups = new Map<string, SourceTraceRow[]>();
  for (const row of rows) {
    const key = `${row.setupType}|${row.direction}|${row.session}|${row.sourceConclusion}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([groupId, group]) => {
    const [setupType, direction, session, sourceConclusion] = groupId.split('|');
    return {
      groupId,
      setupType,
      direction: direction as Direction,
      session,
      sourceConclusion: sourceConclusion as SourceTraceGroup['sourceConclusion'],
      rows: group.length,
    };
  }).sort((a, b) => b.rows - a.rows || a.groupId.localeCompare(b.groupId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Model-Family Geometry Source Trace',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source trace from saved geometry drilldown and scanner decision tapes. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, install filters, remove models, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Drilldown rows read: ${report.summary.drilldownRowsRead}.`,
    `- Traced rows: ${report.summary.tracedRows}.`,
    `- Source tape found rows: ${report.summary.sourceTapeFoundRows}.`,
    `- Bad geometry present in setup status rows: ${report.summary.badGeometryPresentInSetupStatusRows}.`,
    `- Bad geometry not found rows: ${report.summary.badGeometryNotFoundRows}.`,
    `- Missing source tape rows: ${report.summary.missingSourceTapeRows}.`,
    `- Rows with later valid same-direction candidate: ${report.summary.rowsWithLaterValidSameDirectionCandidate}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Model | Direction | Session | Conclusion | Rows |',
    '|---|---|---|---|---:|',
    ...report.groups.map((row) => `| ${escapeTable(row.setupType)} | ${row.direction} | ${row.session} | ${row.sourceConclusion} | ${row.rows} |`),
    '',
    '## Rows',
    '| Date | Session | Dir | Entry | Stop | Exact Bad Events | First Bad Time | Later Valid Same Dir | Block Reasons | Source |',
    '|---|---|---|---:|---:|---:|---|---:|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.session} | ${row.direction} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.exactBadSetupStatusEvents} | ${row.firstExactBadSetupStatusTime || '-'} | ${row.validSameDirectionAfterFirstSeenEvents} | ${escapeTable(row.exactBadBlockReasons.join(', ') || '-')} | ${escapeTable(row.sourceFile || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport(args: {
  reportDir: string;
  geometryDrilldownPath: string | null;
  geometryDrilldownReport: UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport {
  const drilldownRows = (args.geometryDrilldownReport?.rows || []) as DrilldownRow[];
  const rows = drilldownRows.map((row) => traceRow(row, args.auditDir));
  const groups = groupRows(rows);
  const blockers = [
    !args.geometryDrilldownPath ? 'missing geometry drilldown path' : null,
    !args.geometryDrilldownReport ? 'missing geometry drilldown report' : null,
    args.geometryDrilldownReport && args.geometryDrilldownReport.status !== 'pass' ? `geometry drilldown status ${args.geometryDrilldownReport.status}` : null,
    drilldownRows.length === 0 ? 'geometry drilldown report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const missingSourceTapeRows = rows.filter((row) => row.sourceConclusion === 'missing_source_tape').length;
  const badGeometryPresentInSetupStatusRows = rows.filter((row) => row.sourceConclusion === 'bad_geometry_present_in_setup_status').length;
  const badGeometryNotFoundRows = rows.filter((row) => row.sourceConclusion === 'bad_geometry_not_found_in_setup_status').length;
  const recommendation: UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport['summary']['recommendation'] = blockers.length
    ? 'fix_missing_source_tapes'
    : rows.length === 0
      ? 'no_rows_to_trace'
      : missingSourceTapeRows
        ? 'fix_missing_source_tapes'
        : badGeometryPresentInSetupStatusRows
          ? 'inspect_sweep_candidate_builder_invalid_stop_source'
          : 'inspect_replay_or_intake_mapping';
  const base: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_model_family_geometry_source_trace',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      geometryDrilldownPath: args.geometryDrilldownPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      readsSavedDiagnosticsAndLocalTapesOnly: true,
      sourceTraceOnly: true,
      setupStatusPresenceDoesNotApproveExecution: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      drilldownRowsRead: drilldownRows.length,
      tracedRows: rows.length,
      sourceTapeFoundRows: rows.filter((row) => row.sourceTapeFound).length,
      badGeometryPresentInSetupStatusRows,
      badGeometryNotFoundRows,
      missingSourceTapeRows,
      rowsWithLaterValidSameDirectionCandidate: rows.filter((row) => row.validSameDirectionAfterFirstSeenEvents > 0).length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Repair local saved-report or tape inputs before using source-trace output.']
      : badGeometryPresentInSetupStatusRows
        ? [
          'Inspect the SweepMssFvgRetrace candidate builder path that emits InvalidStopLocation with wrong-side stops.',
          'Do not treat these source-quality rows as evidence to remove Sweep or loosen canExecute.',
          'Keep any candidate-builder repair separate from rank/boost decisions and verify with same-slate replay.',
        ]
        : ['Bad geometry was not present in setup status; inspect replay/intake mapping before changing scanner code.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport(
  report: UnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-model-family-geometry-source-trace-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const geometryDrilldownPath = readFlag(args, '--geometry-drilldown') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-geometry-drilldown-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport({
    reportDir: outDir,
    geometryDrilldownPath,
    geometryDrilldownReport: geometryDrilldownPath && fs.existsSync(geometryDrilldownPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport>(geometryDrilldownPath)
      : null,
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewModelFamilyGeometrySourceTraceCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
