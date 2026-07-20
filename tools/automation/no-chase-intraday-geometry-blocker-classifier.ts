import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SetupCandidate } from '../../src/types';
import type { NoChaseProtectedGeometryOmissionDiagnosticReport } from './no-chase-protected-geometry-omission-diagnostic';

interface CliOptions {
  omissionReport: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

type BlockerFamily =
  | 'pending_fvg_retest_entry'
  | 'pending_close_through_retest_entry'
  | 'mss_timestamp_alignment_stop_blocked'
  | 'retest_swing_stop_not_confirmed'
  | 'invalid_stop_location'
  | 'unclassified';

type RecommendedNextFix =
  | 'validate_mss_timestamp_alignment_repair'
  | 'validate_retest_swing_stop_rule'
  | 'hold_pending_trigger_rows'
  | 'inspect_invalid_stop_location_rows'
  | 'manual_source_review';

export interface NoChaseIntradayGeometryBlockerClassifierReport {
  reportType: 'no_chase_intraday_geometry_blocker_classifier';
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
    omissionReportPath: string;
    auditDir: string;
  };
  summary: {
    rowsClassified: number;
    pendingFvgRetestEntryRows: number;
    pendingCloseThroughRetestEntryRows: number;
    mssTimestampAlignmentStopBlockedRows: number;
    retestSwingStopNotConfirmedRows: number;
    invalidStopLocationRows: number;
    unclassifiedRows: number;
    entryOnlyRows: number;
    stopOnlyRows: number;
    noEntryStopRows: number;
    canExecuteChangedRows: 0;
    publishDiscordRows: 0;
    livePromotionAllowedRows: 0;
    recommendedNextFix: RecommendedNextFix;
  };
  rows: Array<{
    caseId: string;
    tradeDate: string;
    sessionType: string;
    direction: string;
    entry: number | null;
    stop: number | null;
    target1: number | null;
    target2: number | null;
    candidateState: string | null;
    detectedStatus: string | null;
    executionStatus: string | null;
    blockReason: string | null;
    blockerFamily: BlockerFamily;
    recommendedNextAction: RecommendedNextFix;
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

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseIntradayGeometryBlockerClassifierArgs(args = process.argv.slice(2)): CliOptions {
  const omissionReport = readFlag(args, '--omission-report');
  if (!omissionReport) throw new Error('--omission-report is required.');
  return {
    omissionReport,
    auditDir: readFlag(args, '--audit-dir') || readFlag(args, '--input-dir') || DEFAULT_AUDIT_DIR,
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

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function sourceCandidate(row: NoChaseProtectedGeometryOmissionDiagnosticReport['rows'][number], auditDir: string): SetupCandidate | null {
  const file = path.join(auditDir, `${row.firstNoChaseSnapshotId}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = readJson<unknown>(file);
  const candidates = asRecord(asRecord(raw).normalizedPlan).setupCandidates;
  if (!Array.isArray(candidates)) return null;
  return (candidates as SetupCandidate[]).find((candidate) =>
    candidate.setupType === row.setupType &&
    candidate.direction === row.direction &&
    [
      candidate.requiredTrigger,
      candidate.nextAction,
      ...(candidate.evidence || []),
      ...(candidate.missingEvidence || []),
    ].join(' ').includes('Intraday')
  ) || (candidates as SetupCandidate[]).find((candidate) =>
    candidate.setupType === row.setupType &&
    candidate.direction === row.direction
  ) || null;
}

function candidateText(candidate: SetupCandidate | null): string {
  if (!candidate) return '';
  return [
    candidate.blockReason,
    candidate.requiredTrigger,
    candidate.nextAction,
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
  ].filter(Boolean).join(' ');
}

function blockerFamily(candidate: SetupCandidate | null): BlockerFamily {
  const text = candidateText(candidate);
  if (/InvalidStopLocation|Candidate invalidated|traded through the structure stop/i.test(text)) return 'invalid_stop_location';
  if (/MSS evidence timestamp does not align/i.test(text)) return 'mss_timestamp_alignment_stop_blocked';
  if (/retest (?:low|high) is not a confirmed protected 5M swing/i.test(text)) return 'retest_swing_stop_not_confirmed';
  if (/completed 5M candle alignment is still required|close-through campaign watch active|Wait for a completed 5M reclaim\/hold|Wait for a completed 5M rejection\/hold/i.test(text)) return 'pending_close_through_retest_entry';
  if (/micro-continuation pending|wait for a completed 5M candle to retest/i.test(text)) return 'pending_fvg_retest_entry';
  return 'unclassified';
}

function nextAction(family: BlockerFamily): RecommendedNextFix {
  if (family === 'mss_timestamp_alignment_stop_blocked') return 'validate_mss_timestamp_alignment_repair';
  if (family === 'retest_swing_stop_not_confirmed') return 'validate_retest_swing_stop_rule';
  if (family === 'invalid_stop_location') return 'inspect_invalid_stop_location_rows';
  if (family === 'pending_fvg_retest_entry' || family === 'pending_close_through_retest_entry') return 'hold_pending_trigger_rows';
  return 'manual_source_review';
}

function authority(): NoChaseIntradayGeometryBlockerClassifierReport['authority'] {
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

function recommendedNextFix(rows: NoChaseIntradayGeometryBlockerClassifierReport['rows']): RecommendedNextFix {
  const count = (family: BlockerFamily) => rows.filter((row) => row.blockerFamily === family).length;
  if (count('mss_timestamp_alignment_stop_blocked') >= count('retest_swing_stop_not_confirmed') && count('mss_timestamp_alignment_stop_blocked') > 0) {
    return 'validate_mss_timestamp_alignment_repair';
  }
  if (count('retest_swing_stop_not_confirmed') > 0) return 'validate_retest_swing_stop_rule';
  if (count('invalid_stop_location') > 0) return 'inspect_invalid_stop_location_rows';
  if (count('pending_fvg_retest_entry') + count('pending_close_through_retest_entry') > 0) return 'hold_pending_trigger_rows';
  return 'manual_source_review';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<NoChaseIntradayGeometryBlockerClassifierReport, 'markdown'>): string {
  return [
    '# No-Chase Intraday Geometry Blocker Classifier',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report research only. It classifies saved Intraday MSS no-chase blocker text and does not change scanner behavior, trading rules, canExecute, Discord, Supabase, bridge behavior, or plan math.',
    '',
    '## Summary',
    `- Rows classified: ${report.summary.rowsClassified}.`,
    `- Pending FVG retest entry: ${report.summary.pendingFvgRetestEntryRows}.`,
    `- Pending close-through/retest entry: ${report.summary.pendingCloseThroughRetestEntryRows}.`,
    `- MSS timestamp alignment stop blocked: ${report.summary.mssTimestampAlignmentStopBlockedRows}.`,
    `- Retest swing stop not confirmed: ${report.summary.retestSwingStopNotConfirmedRows}.`,
    `- Invalid stop location: ${report.summary.invalidStopLocationRows}.`,
    `- Unclassified: ${report.summary.unclassifiedRows}.`,
    `- Entry-only/stop-only/no-entry-stop: ${report.summary.entryOnlyRows}/${report.summary.stopOnlyRows}/${report.summary.noEntryStopRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Discord publish rows: ${report.summary.publishDiscordRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommended next fix: ${report.summary.recommendedNextFix}.`,
    '',
    '## Rows',
    '| Case | Entry | Stop | Blocker Family | Next |',
    '|---|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.caseId)} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.blockerFamily} | ${row.recommendedNextAction} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseIntradayGeometryBlockerClassifierReport(args: {
  omissionReportPath: string;
  auditDir: string;
  omissionReport: NoChaseProtectedGeometryOmissionDiagnosticReport | null;
}, generatedAt = new Date().toISOString()): NoChaseIntradayGeometryBlockerClassifierReport {
  const rows = (args.omissionReport?.rows || []).map((row) => {
    const candidate = sourceCandidate(row, args.auditDir);
    const family = blockerFamily(candidate);
    return {
      caseId: row.caseId,
      tradeDate: row.tradeDate,
      sessionType: row.sessionType,
      direction: row.direction,
      entry: numberOrNull(candidate?.entry),
      stop: numberOrNull(candidate?.stop),
      target1: numberOrNull(candidate?.target1),
      target2: numberOrNull(candidate?.target2),
      candidateState: stringOrNull(candidate?.candidateState),
      detectedStatus: stringOrNull(candidate?.detectedStatus),
      executionStatus: stringOrNull(candidate?.executionStatus),
      blockReason: stringOrNull(candidate?.blockReason),
      blockerFamily: family,
      recommendedNextAction: nextAction(family),
      canExecute: false as const,
      publishDiscord: false as const,
      livePromotionAllowed: false as const,
    };
  });
  const blockers = [
    !args.omissionReport ? 'missing no-chase protected geometry omission report' : null,
    args.omissionReport && args.omissionReport.reportType !== 'no_chase_protected_geometry_omission_diagnostic' ? `unexpected reportType ${args.omissionReport.reportType}` : null,
    rows.length === 0 ? 'no omission rows available to classify' : null,
    rows.some((row) => row.blockerFamily === 'unclassified') ? 'one or more rows could not be classified from saved blocker text' : null,
    rows.some((row) => row.canExecute !== false) ? 'one or more rows changed canExecute' : null,
    rows.some((row) => row.publishDiscord !== false) ? 'one or more rows enabled Discord publishing' : null,
    rows.some((row) => row.livePromotionAllowed !== false) ? 'one or more rows allowed live promotion' : null,
  ].filter((item): item is string => Boolean(item));
  const fix = recommendedNextFix(rows);
  const base: Omit<NoChaseIntradayGeometryBlockerClassifierReport, 'markdown'> = {
    reportType: 'no_chase_intraday_geometry_blocker_classifier',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      omissionReportPath: args.omissionReportPath,
      auditDir: args.auditDir,
    },
    summary: {
      rowsClassified: rows.length,
      pendingFvgRetestEntryRows: rows.filter((row) => row.blockerFamily === 'pending_fvg_retest_entry').length,
      pendingCloseThroughRetestEntryRows: rows.filter((row) => row.blockerFamily === 'pending_close_through_retest_entry').length,
      mssTimestampAlignmentStopBlockedRows: rows.filter((row) => row.blockerFamily === 'mss_timestamp_alignment_stop_blocked').length,
      retestSwingStopNotConfirmedRows: rows.filter((row) => row.blockerFamily === 'retest_swing_stop_not_confirmed').length,
      invalidStopLocationRows: rows.filter((row) => row.blockerFamily === 'invalid_stop_location').length,
      unclassifiedRows: rows.filter((row) => row.blockerFamily === 'unclassified').length,
      entryOnlyRows: rows.filter((row) => row.entry !== null && row.stop === null).length,
      stopOnlyRows: rows.filter((row) => row.entry === null && row.stop !== null).length,
      noEntryStopRows: rows.filter((row) => row.entry === null && row.stop === null).length,
      canExecuteChangedRows: 0,
      publishDiscordRows: 0,
      livePromotionAllowedRows: 0,
      recommendedNextFix: fix,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix classifier coverage before proposing a source-path change.']
      : [
        'Hold pending-trigger rows; they are doing their job and should not be promoted.',
        fix === 'validate_mss_timestamp_alignment_repair'
          ? 'Next research should validate whether 5M MSS timestamp alignment can be repaired from completed OHLC without weakening bar-close proof.'
          : 'Next research should validate the dominant protected-stop blocker before any source-builder change.',
        'Do not loosen canExecute, remove models, post Discord, write Supabase, or reconstruct entry/stop from proof-close geometry.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseIntradayGeometryBlockerClassifierReport(
  report: NoChaseIntradayGeometryBlockerClassifierReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-intraday-geometry-blocker-classifier-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseIntradayGeometryBlockerClassifierCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseIntradayGeometryBlockerClassifierArgs(args);
  const omissionReport = fs.existsSync(options.omissionReport)
    ? readJson<NoChaseProtectedGeometryOmissionDiagnosticReport>(options.omissionReport)
    : null;
  const report = buildNoChaseIntradayGeometryBlockerClassifierReport({
    omissionReportPath: options.omissionReport,
    auditDir: options.auditDir,
    omissionReport,
  });
  const paths = writeNoChaseIntradayGeometryBlockerClassifierReport(report, options.outDir);
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
    runNoChaseIntradayGeometryBlockerClassifierCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
