import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport,
} from './unified-positive-held-local-preview-model-family-broad-replay';

type Direction = 'LONG' | 'SHORT';

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  firstSeenTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  sourceFile: string;
  triageDecision: string;
}

interface GeometryDrilldownRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  triageDecision: string;
  firstSeenTime: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  sourceFile: string | null;
  blockers: string[];
  geometryIssue:
    | 'long_stop_not_below_entry'
    | 'long_target_not_above_entry'
    | 'short_stop_not_above_entry'
    | 'short_target_not_below_entry'
    | 'missing_intake_row'
    | 'unknown_blocker';
}

interface GeometryGroup {
  groupId: string;
  setupType: string;
  direction: Direction | 'mixed';
  session: string | 'mixed';
  geometryIssue: GeometryDrilldownRow['geometryIssue'];
  rows: number;
}

export interface UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport {
  reportType: 'unified_positive_held_local_preview_model_family_geometry_drilldown';
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
    geometryDrilldownOnly: true;
    rowLevelBlockedDoesNotEqualModelRemoval: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    replayRowsRead: number;
    blockedRows: number;
    rowsWithIntakeMatch: number;
    rowsMissingIntakeMatch: number;
    longStopNotBelowEntryRows: number;
    shortStopNotAboveEntryRows: number;
    targetDirectionIssueRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'inspect_source_geometry_for_blocked_rows_before_sweep_rank_decision'
      | 'no_invalid_geometry_rows_to_drill_down'
      | 'fix_missing_input_reports';
  };
  groups: GeometryGroup[];
  rows: GeometryDrilldownRow[];
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
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport['authority'] {
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

function geometryIssue(row: IntakeRow | null, blockers: string[]): GeometryDrilldownRow['geometryIssue'] {
  if (!row) return 'missing_intake_row';
  if (row.direction === 'LONG') {
    if (row.stop >= row.entry) return 'long_stop_not_below_entry';
    if (row.target1 <= row.entry || row.target2 <= row.entry) return 'long_target_not_above_entry';
  } else {
    if (row.stop <= row.entry) return 'short_stop_not_above_entry';
    if (row.target1 >= row.entry || row.target2 >= row.entry) return 'short_target_not_below_entry';
  }
  if (blockers.some((blocker) => blocker.toLowerCase().includes('target geometry'))) {
    return row.direction === 'LONG' ? 'long_target_not_above_entry' : 'short_target_not_below_entry';
  }
  return 'unknown_blocker';
}

function toDrilldownRows(
  replayReport: UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport | null,
  intakeRows: IntakeRow[],
): GeometryDrilldownRow[] {
  const intakeById = new Map(intakeRows.map((row) => [row.intakeId, row]));
  return (replayReport?.rows || [])
    .filter((row) => row.outcomeBucket === 'blocked')
    .map((row) => {
      const intake = intakeById.get(row.rowId) || null;
      const direction = (intake?.direction || row.direction) as Direction;
      return {
        rowId: row.rowId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction,
        triageDecision: row.triageDecision,
        firstSeenTime: intake?.firstSeenTime || null,
        entry: intake?.entry ?? null,
        stop: intake?.stop ?? null,
        target1: intake?.target1 ?? null,
        target2: intake?.target2 ?? null,
        riskPoints: intake?.riskPoints ?? row.riskPoints ?? null,
        sourceFile: intake?.sourceFile || null,
        blockers: row.blockers,
        geometryIssue: geometryIssue(intake, row.blockers),
      };
    });
}

function groupRows(rows: GeometryDrilldownRow[]): GeometryGroup[] {
  const groups = new Map<string, GeometryDrilldownRow[]>();
  for (const row of rows) {
    const key = `${row.setupType}|${row.direction}|${row.session}|${row.geometryIssue}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([groupId, group]) => {
    const [setupType, direction, session, geometryIssue] = groupId.split('|');
    return {
      groupId,
      setupType,
      direction: direction as Direction,
      session,
      geometryIssue: geometryIssue as GeometryGroup['geometryIssue'],
      rows: group.length,
    };
  }).sort((a, b) => b.rows - a.rows || a.groupId.localeCompare(b.groupId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Model-Family Geometry Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only geometry drilldown from saved replay and intake reports. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, install filters, remove models, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Replay rows read: ${report.summary.replayRowsRead}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Intake matches: ${report.summary.rowsWithIntakeMatch}.`,
    `- Missing intake matches: ${report.summary.rowsMissingIntakeMatch}.`,
    `- Long stop not below entry rows: ${report.summary.longStopNotBelowEntryRows}.`,
    `- Short stop not above entry rows: ${report.summary.shortStopNotAboveEntryRows}.`,
    `- Target direction issue rows: ${report.summary.targetDirectionIssueRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Model | Direction | Session | Issue | Rows |',
    '|---|---|---|---|---:|',
    ...report.groups.map((row) => `| ${escapeTable(row.setupType)} | ${row.direction} | ${row.session} | ${row.geometryIssue} | ${row.rows} |`),
    '',
    '## Rows',
    '| Date | Session | Model | Dir | Entry | Stop | T1 | T2 | Issue | Source |',
    '|---|---|---|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.session} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} | ${row.geometryIssue} | ${escapeTable(row.sourceFile || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport(args: {
  reportDir: string;
  modelFamilyBroadReplayPath: string | null;
  modelFamilyBroadReplayReport: UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: Record<string, unknown> | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport {
  const intakeRows = readIntakeRows(args.intakeTriageReport);
  const rows = toDrilldownRows(args.modelFamilyBroadReplayReport, intakeRows);
  const groups = groupRows(rows);
  const rowsMissingIntakeMatch = rows.filter((row) => row.geometryIssue === 'missing_intake_row').length;
  const blockers = [
    !args.modelFamilyBroadReplayPath ? 'missing model-family broad replay path' : null,
    !args.modelFamilyBroadReplayReport ? 'missing model-family broad replay report' : null,
    args.modelFamilyBroadReplayReport && args.modelFamilyBroadReplayReport.status !== 'pass' ? `model-family broad replay status ${args.modelFamilyBroadReplayReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    rowsMissingIntakeMatch ? `${rowsMissingIntakeMatch} blocked rows missing intake match` : null,
  ].filter((item): item is string => Boolean(item));
  const replayRowsRead = args.modelFamilyBroadReplayReport?.rows.length || 0;
  const blockedRows = rows.length;
  const recommendation: UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport['summary']['recommendation'] = blockers.length
    ? 'fix_missing_input_reports'
    : blockedRows
      ? 'inspect_source_geometry_for_blocked_rows_before_sweep_rank_decision'
      : 'no_invalid_geometry_rows_to_drill_down';
  const base: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_model_family_geometry_drilldown',
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
      geometryDrilldownOnly: true,
      rowLevelBlockedDoesNotEqualModelRemoval: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      replayRowsRead,
      blockedRows,
      rowsWithIntakeMatch: rows.length - rowsMissingIntakeMatch,
      rowsMissingIntakeMatch,
      longStopNotBelowEntryRows: rows.filter((row) => row.geometryIssue === 'long_stop_not_below_entry').length,
      shortStopNotAboveEntryRows: rows.filter((row) => row.geometryIssue === 'short_stop_not_above_entry').length,
      targetDirectionIssueRows: rows.filter((row) => row.geometryIssue === 'long_target_not_above_entry' || row.geometryIssue === 'short_target_not_below_entry').length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Repair the local saved-report inputs before using geometry drilldown output.']
      : blockedRows
        ? [
          'Treat these as source-geometry quality rows, not model-removal evidence.',
          'Do not install a Sweep boost, penalty, filter, canExecute change, or model removal until source geometry is traced and same-slate validation passes.',
        ]
        : ['No invalid geometry rows were present in the model-family broad replay report.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-model-family-geometry-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const modelFamilyBroadReplayPath = readFlag(args, '--model-family-broad-replay') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-broad-replay-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport({
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
  const paths = writeUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewModelFamilyGeometryDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
