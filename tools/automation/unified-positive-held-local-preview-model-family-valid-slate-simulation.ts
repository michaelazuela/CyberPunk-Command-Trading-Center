import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport,
} from './unified-positive-held-local-preview-model-family-broad-replay';

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  firstSeenTime: string;
  occurrences: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  executionStatus: string;
  blockReason: string | null;
  triageScore: number;
  triageDecision: string;
}

type ReplayRow = UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport['rows'][number];

interface JoinedRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  firstSeenTime: string | null;
  occurrences: number;
  triageScore: number;
  executionStatus: string | null;
  blockReason: string | null;
  outcomeBucket: ReplayRow['outcomeBucket'];
  outcomeLabel: ReplayRow['outcomeLabel'];
  resolvedOneMesPl: number | null;
  blockedGeometry: boolean;
  baselineRank: number;
  validOnlyRank: number | null;
  scannerVisibleEligible: false;
}

interface SlateSummary {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  validRows: number;
  blockedGeometryRows: number;
  baselineTopRowId: string | null;
  baselineTopSetupType: string | null;
  baselineTopOutcomeBucket: ReplayRow['outcomeBucket'] | null;
  baselineTopOneMesPl: number | null;
  baselineTopBlockedGeometry: boolean | null;
  validOnlyTopRowId: string | null;
  validOnlyTopSetupType: string | null;
  validOnlyTopOutcomeBucket: ReplayRow['outcomeBucket'] | null;
  validOnlyTopOneMesPl: number | null;
  topChanged: boolean;
  changedFromBlockedGeometryToValidCandidate: boolean;
  deltaOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport {
  reportType: 'unified_positive_held_local_preview_model_family_valid_slate_simulation';
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
    modelFamilyBroadReplayPath: string | null;
    intakeTriagePath: string | null;
  };
  assumptions: {
    readsSavedDiagnosticsOnly: true;
    baselineUsesKnownAtSelectionTriageScore: true;
    validOnlyExcludesRowLevelBlockedGeometry: true;
    outcomesUsedOnlyForEvaluation: true;
    noLiveFilterInstalled: true;
    noRankBoostInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    replayRowsRead: number;
    joinedRows: number;
    slates: number;
    changedSlates: number;
    baselineBlockedGeometryTopSlates: number;
    changedFromBlockedGeometryToValidCandidateSlates: number;
    baselineTopOneMesPl: number | null;
    validOnlyTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'valid_only_research_improves_selection_continue_to_source_fix'
      | 'valid_only_research_neutral_keep_research_only'
      | 'valid_only_research_worsens_selection_reject_filter'
      | 'fix_missing_input_reports';
  };
  slates: SlateSummary[];
  rows: JoinedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport['authority'] {
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

function readIntakeRows(report: Record<string, unknown> | null): IntakeRow[] {
  return Array.isArray(report?.rows) ? report.rows as IntakeRow[] : [];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function sortRows(rows: JoinedRow[]): JoinedRow[] {
  return [...rows].sort((a, b) => (
    b.triageScore - a.triageScore ||
    b.occurrences - a.occurrences ||
    (a.firstSeenTime || '').localeCompare(b.firstSeenTime || '') ||
    a.rowId.localeCompare(b.rowId)
  ));
}

function joinRows(
  replayReport: UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport | null,
  intakeRows: IntakeRow[],
): JoinedRow[] {
  const intakeById = new Map(intakeRows.map((row) => [row.intakeId, row]));
  const rows = (replayReport?.rows || []).map((row) => {
    const intake = intakeById.get(row.rowId);
    return {
      rowId: row.rowId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      firstSeenTime: intake?.firstSeenTime || null,
      occurrences: intake?.occurrences || 0,
      triageScore: intake?.triageScore || 0,
      executionStatus: intake?.executionStatus || null,
      blockReason: intake?.blockReason || null,
      outcomeBucket: row.outcomeBucket,
      outcomeLabel: row.outcomeLabel,
      resolvedOneMesPl: row.resolvedOneMesPl,
      blockedGeometry: row.outcomeBucket === 'blocked',
      baselineRank: 0,
      validOnlyRank: null,
      scannerVisibleEligible: false as const,
    };
  });
  const rankedBySlate = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    rankedBySlate.set(key, [...(rankedBySlate.get(key) || []), row]);
  }
  const rankedRows: JoinedRow[] = [];
  for (const slateRows of rankedBySlate.values()) {
    const baseline = sortRows(slateRows);
    const validOnly = sortRows(slateRows.filter((row) => !row.blockedGeometry));
    const validRankById = new Map(validOnly.map((row, index) => [row.rowId, index + 1]));
    baseline.forEach((row, index) => {
      rankedRows.push({
        ...row,
        baselineRank: index + 1,
        validOnlyRank: validRankById.get(row.rowId) || null,
      });
    });
  }
  return sortRows(rankedRows);
}

function buildSlates(rows: JoinedRow[]): SlateSummary[] {
  const groups = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([slateId, slateRows]) => {
    const [tradeDate, session] = slateId.split('|');
    const baselineTop = sortRows(slateRows)[0] || null;
    const validOnlyTop = sortRows(slateRows.filter((row) => !row.blockedGeometry))[0] || null;
    const topChanged = (baselineTop?.rowId || null) !== (validOnlyTop?.rowId || null);
    return {
      slateId,
      tradeDate,
      session,
      rows: slateRows.length,
      validRows: slateRows.filter((row) => !row.blockedGeometry).length,
      blockedGeometryRows: slateRows.filter((row) => row.blockedGeometry).length,
      baselineTopRowId: baselineTop?.rowId || null,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopOutcomeBucket: baselineTop?.outcomeBucket || null,
      baselineTopOneMesPl: baselineTop?.resolvedOneMesPl ?? null,
      baselineTopBlockedGeometry: baselineTop?.blockedGeometry ?? null,
      validOnlyTopRowId: validOnlyTop?.rowId || null,
      validOnlyTopSetupType: validOnlyTop?.setupType || null,
      validOnlyTopOutcomeBucket: validOnlyTop?.outcomeBucket || null,
      validOnlyTopOneMesPl: validOnlyTop?.resolvedOneMesPl ?? null,
      topChanged,
      changedFromBlockedGeometryToValidCandidate: Boolean(topChanged && baselineTop?.blockedGeometry && validOnlyTop),
      deltaOneMesPl: baselineTop?.resolvedOneMesPl !== null && baselineTop?.resolvedOneMesPl !== undefined && validOnlyTop?.resolvedOneMesPl !== null && validOnlyTop?.resolvedOneMesPl !== undefined
        ? round(validOnlyTop.resolvedOneMesPl - baselineTop.resolvedOneMesPl)
        : null,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Model-Family Valid Slate Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only same-slate simulation from saved broad replay and intake triage reports. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, install filters, remove models, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Replay rows read: ${report.summary.replayRowsRead}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline blocked-geometry top slates: ${report.summary.baselineBlockedGeometryTopSlates}.`,
    `- Changed from blocked geometry to valid candidate slates: ${report.summary.changedFromBlockedGeometryToValidCandidateSlates}.`,
    `- Baseline top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'}.`,
    `- Valid-only top one-MES P/L: ${report.summary.validOnlyTopOneMesPl ?? '-'}.`,
    `- Top-selection delta one-MES P/L: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Date | Session | Baseline Top | Baseline P/L | Valid Top | Valid P/L | Delta |',
    '|---|---|---|---:|---|---:|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${row.tradeDate} | ${row.session} | ${escapeTable(row.baselineTopRowId || '-')} | ${row.baselineTopOneMesPl ?? '-'} | ${escapeTable(row.validOnlyTopRowId || '-')} | ${row.validOnlyTopOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport(args: {
  reportDir: string;
  modelFamilyBroadReplayPath: string | null;
  modelFamilyBroadReplayReport: UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: Record<string, unknown> | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport {
  const intakeRows = readIntakeRows(args.intakeTriageReport);
  const rows = joinRows(args.modelFamilyBroadReplayReport, intakeRows);
  const slates = buildSlates(rows);
  const blockers = [
    !args.modelFamilyBroadReplayPath ? 'missing model-family broad replay path' : null,
    !args.modelFamilyBroadReplayReport ? 'missing model-family broad replay report' : null,
    args.modelFamilyBroadReplayReport && args.modelFamilyBroadReplayReport.status !== 'pass' ? `model-family broad replay status ${args.modelFamilyBroadReplayReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    rows.length === 0 ? 'no joined replay rows' : null,
  ].filter((item): item is string => Boolean(item));
  const baselineTopOneMesPl = sum(slates.map((row) => row.baselineTopOneMesPl));
  const validOnlyTopOneMesPl = sum(slates.map((row) => row.validOnlyTopOneMesPl));
  const topSelectionDeltaOneMesPl = baselineTopOneMesPl !== null && validOnlyTopOneMesPl !== null
    ? round(validOnlyTopOneMesPl - baselineTopOneMesPl)
    : null;
  const recommendation: UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport['summary']['recommendation'] = blockers.length
    ? 'fix_missing_input_reports'
    : topSelectionDeltaOneMesPl !== null && topSelectionDeltaOneMesPl > 0
      ? 'valid_only_research_improves_selection_continue_to_source_fix'
      : topSelectionDeltaOneMesPl !== null && topSelectionDeltaOneMesPl < 0
        ? 'valid_only_research_worsens_selection_reject_filter'
        : 'valid_only_research_neutral_keep_research_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_model_family_valid_slate_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      modelFamilyBroadReplayPath: args.modelFamilyBroadReplayPath,
      intakeTriagePath: args.intakeTriagePath,
    },
    assumptions: {
      readsSavedDiagnosticsOnly: true,
      baselineUsesKnownAtSelectionTriageScore: true,
      validOnlyExcludesRowLevelBlockedGeometry: true,
      outcomesUsedOnlyForEvaluation: true,
      noLiveFilterInstalled: true,
      noRankBoostInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      replayRowsRead: args.modelFamilyBroadReplayReport?.rows.length || 0,
      joinedRows: rows.length,
      slates: slates.length,
      changedSlates: slates.filter((row) => row.topChanged).length,
      baselineBlockedGeometryTopSlates: slates.filter((row) => row.baselineTopBlockedGeometry).length,
      changedFromBlockedGeometryToValidCandidateSlates: slates.filter((row) => row.changedFromBlockedGeometryToValidCandidate).length,
      baselineTopOneMesPl,
      validOnlyTopOneMesPl,
      topSelectionDeltaOneMesPl,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Repair saved-report inputs before using valid-slate simulation output.']
      : [
        'Use this as research-only evidence for clean-candidate package selection.',
        'Do not install a live filter, boost, penalty, canExecute change, model removal, or entry/stop/target/risk change from this report alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport(
  report: UnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-model-family-valid-slate-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const modelFamilyBroadReplayPath = readFlag(args, '--model-family-broad-replay') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-broad-replay-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport({
    reportDir: outDir,
    modelFamilyBroadReplayPath,
    modelFamilyBroadReplayReport: modelFamilyBroadReplayPath && fs.existsSync(modelFamilyBroadReplayPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport>(modelFamilyBroadReplayPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<Record<string, unknown>>(intakeTriagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewModelFamilyValidSlateSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
