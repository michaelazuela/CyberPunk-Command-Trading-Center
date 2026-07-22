import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';
type VisibleDeskOutputState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

interface SelectedCandidate {
  setupType: string;
  direction: Direction;
  eventTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  rankScore: number;
  outcome?: {
    status: string;
    pnl: number;
    r: number;
    filled: boolean;
  };
}

interface DayByDayRow {
  date: string;
  session: SessionName;
  movement: string;
  completeCandidateCount: number;
  bestOverall: SelectedCandidate | null;
  bestMovementMatch: SelectedCandidate | null;
  selected: SelectedCandidate | null;
}

interface DayByDayReport {
  reportType: string;
  generatedAt: string;
  rows: DayByDayRow[];
}

interface SessionRecommendation {
  session: SessionName;
  primaryLane: string | null;
  supportingLanes: string[];
}

interface LaneComparisonReport {
  reportType: string;
  generatedAt: string;
  sessionRecommendations: SessionRecommendation[];
}

interface DeskOutputRow {
  date: string;
  session: SessionName;
  visibleState: VisibleDeskOutputState;
  model: string;
  direction: Direction;
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  movement: string;
  primaryLane: string;
  supportingModels: string[];
  sourceCandidateRole: 'primary_lane' | 'supporting_lane';
  deskLanguage: {
    headline: string;
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
    authority: string;
  };
  canExecuteVisible: false;
  canExecuteChanged: false;
  livePromotionAllowed: false;
}

interface UnifiedDeskOutputSelectorPreviewReport {
  reportType: 'unified_desk_output_selector_preview';
  generatedAt: string;
  authority: {
    localOnly: true;
    researchOnly: true;
    visibleOutputsOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    installsRuntimeAdapter: false;
    automatedOrders: false;
  };
  source: {
    dayByDayReportPath: string;
    laneComparisonReportPath: string;
    sourceRows: number;
  };
  contract: {
    visibleStates: VisibleDeskOutputState[];
    hiddenInternalStates: string[];
    morningMaxVisibleOutputs: 1;
    lunchMaxVisibleOutputs: 1;
    approvedPlanRequiresPrimaryLane: true;
    formingReadAllowsSupportingLane: true;
    silentWhenNoUsefulCandidate: true;
    noHumanReviewWording: true;
  };
  summary: {
    sourceRows: number;
    visibleOutputRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    silentRows: number;
    morningApprovedRows: number;
    lunchApprovedRows: number;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    runtimeInstallAllowed: false;
    recommendation: 'ready_for_local_scanner_builder_preview' | 'hold_for_primary_lane_evidence';
  };
  rows: DeskOutputRow[];
  markdown: string;
}

interface CliOptions {
  dayByDayReportPath: string | null;
  laneComparisonReportPath: string | null;
  outDir: string;
  json: boolean;
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    dayByDayReportPath: readFlag(args, '--day-by-day-report'),
    laneComparisonReportPath: readFlag(args, '--lane-comparison-report'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
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

function sessionRecommendation(report: LaneComparisonReport, session: SessionName): SessionRecommendation {
  return report.sessionRecommendations.find((item) => item.session === session) || {
    session,
    primaryLane: null,
    supportingLanes: [],
  };
}

function hasCompleteGeometry(candidate: SelectedCandidate | null): candidate is SelectedCandidate {
  return Boolean(candidate) &&
    typeof candidate?.entry === 'number' &&
    typeof candidate.stop === 'number' &&
    typeof candidate.target1 === 'number' &&
    typeof candidate.target2 === 'number' &&
    typeof candidate.riskPoints === 'number';
}

function candidateForOutput(row: DayByDayRow, recommendation: SessionRecommendation): {
  candidate: SelectedCandidate | null;
  visibleState: VisibleDeskOutputState | null;
  role: DeskOutputRow['sourceCandidateRole'] | null;
} {
  const primaryLane = recommendation.primaryLane;
  const candidates = [row.selected, row.bestMovementMatch, row.bestOverall].filter(hasCompleteGeometry);
  const primaryCandidate = candidates.find((candidate) => candidate.setupType === primaryLane) || null;
  if (primaryCandidate) {
    return { candidate: primaryCandidate, visibleState: 'APPROVED_DESK_PLAN', role: 'primary_lane' };
  }
  const supportingCandidate = candidates.find((candidate) => (
    recommendation.supportingLanes.includes(candidate.setupType) || candidate.setupType !== primaryLane
  )) || null;
  if (supportingCandidate) {
    return { candidate: supportingCandidate, visibleState: 'FORMING_DESK_READ', role: 'supporting_lane' };
  }
  return { candidate: null, visibleState: null, role: null };
}

function buildLanguage(args: {
  state: VisibleDeskOutputState;
  row: DayByDayRow;
  candidate: SelectedCandidate;
  primaryLane: string;
  supportingModels: string[];
}): DeskOutputRow['deskLanguage'] {
  const proof = args.candidate.eventTime.slice(11, 16);
  if (args.state === 'APPROVED_DESK_PLAN') {
    return {
      headline: `Approved Desk Plan: ${args.candidate.setupType} ${args.candidate.direction}`,
      what: `${args.row.session} primary lane is complete: ${args.candidate.setupType} ${args.candidate.direction}.`,
      where: `Entry ${args.candidate.entry}, stop ${args.candidate.stop}, T1 ${args.candidate.target1}, T2 ${args.candidate.target2}.`,
      when: `Completed 5M proof time ${proof} ET.`,
      why: `Session movement=${args.row.movement}; primary lane=${args.primaryLane}; supporting models=${args.supportingModels.join(', ') || 'none'}.`,
      invalidation: `Invalid if price violates the protected 5M stop line at ${args.candidate.stop}.`,
      authority: 'Decision-support desk plan only. No automated orders. canExecute remains internal/audit-only and unchanged.',
    };
  }
  return {
    headline: `Forming Desk Read: ${args.candidate.setupType} ${args.candidate.direction}`,
    what: `${args.row.session} has a valid supporting setup forming, but the primary approved lane is not complete in this saved window.`,
    where: `Reference geometry from supporting setup: entry ${args.candidate.entry}, stop ${args.candidate.stop}, T1 ${args.candidate.target1}, T2 ${args.candidate.target2}.`,
    when: `Supporting completed 5M proof time ${proof} ET.`,
    why: `Session movement=${args.row.movement}; waiting for primary lane=${args.primaryLane} to become the approved desk plan.`,
    invalidation: `Supporting read is invalid if price violates the protected 5M stop line at ${args.candidate.stop}.`,
    authority: 'Anticipation layer only. It prepares the trader for a possible plan; it does not approve execution or place orders.',
  };
}

function buildRows(dayByDayReport: DayByDayReport, laneReport: LaneComparisonReport): DeskOutputRow[] {
  const output: DeskOutputRow[] = [];
  for (const row of dayByDayReport.rows) {
    const recommendation = sessionRecommendation(laneReport, row.session);
    if (!recommendation.primaryLane) continue;
    const selected = candidateForOutput(row, recommendation);
    if (!selected.candidate || !selected.visibleState || !selected.role) continue;
    const supportingModels = [
      ...new Set([
        ...recommendation.supportingLanes,
        row.selected?.setupType,
        row.bestMovementMatch?.setupType,
        row.bestOverall?.setupType,
      ].filter((item): item is string => Boolean(item) && item !== selected.candidate?.setupType)),
    ];
    output.push({
      date: row.date,
      session: row.session,
      visibleState: selected.visibleState,
      model: selected.candidate.setupType,
      direction: selected.candidate.direction,
      proofTime: selected.candidate.eventTime,
      entry: selected.candidate.entry,
      stop: selected.candidate.stop,
      target1: selected.candidate.target1,
      target2: selected.candidate.target2,
      riskPoints: selected.candidate.riskPoints,
      movement: row.movement,
      primaryLane: recommendation.primaryLane,
      supportingModels,
      sourceCandidateRole: selected.role,
      deskLanguage: buildLanguage({
        state: selected.visibleState,
        row,
        candidate: selected.candidate,
        primaryLane: recommendation.primaryLane,
        supportingModels,
      }),
      canExecuteVisible: false,
      canExecuteChanged: false,
      livePromotionAllowed: false,
    });
  }
  return output;
}

function buildMarkdown(report: Omit<UnifiedDeskOutputSelectorPreviewReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Selector Preview',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: local-only output contract preview. No Discord posts, no Supabase writes, no bridge reads, no scanner behavior changes, no trading-rule changes, no canExecute changes, and no automated orders.',
    '',
    '## Contract',
    '- Visible feed states: APPROVED_DESK_PLAN and FORMING_DESK_READ.',
    '- Hidden internal states stay internal: wait, no trade, missed/no chase, blocked, data-limited, canExecute audit.',
    '- If no useful candidate exists, the visible feed stays silent.',
    '- No legacy review-ticket wording is emitted by this preview.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Visible output rows: ${report.summary.visibleOutputRows}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadRows}.`,
    `- Silent rows: ${report.summary.silentRows}.`,
    `- Morning approved rows: ${report.summary.morningApprovedRows}.`,
    `- Lunch approved rows: ${report.summary.lunchApprovedRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Outputs',
    '| Date | Session | State | Model | Direction | Proof ET | Entry | Stop | T1 | T2 | Primary Lane |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---|',
    ...report.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.visibleState} | ${row.model} | ${row.direction} | ${row.proofTime.slice(11, 16)} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} | ${row.primaryLane} |`),
  ].join('\n');
}

export function buildUnifiedDeskOutputSelectorPreviewReport(args: {
  dayByDayReport: DayByDayReport;
  dayByDayReportPath: string;
  laneComparisonReport: LaneComparisonReport;
  laneComparisonReportPath: string;
}, generatedAt = new Date().toISOString()): UnifiedDeskOutputSelectorPreviewReport {
  const rows = buildRows(args.dayByDayReport, args.laneComparisonReport);
  const sourceRows = args.dayByDayReport.rows.length;
  const approvedRows = rows.filter((row) => row.visibleState === 'APPROVED_DESK_PLAN');
  const formingRows = rows.filter((row) => row.visibleState === 'FORMING_DESK_READ');
  const report: Omit<UnifiedDeskOutputSelectorPreviewReport, 'markdown'> = {
    reportType: 'unified_desk_output_selector_preview',
    generatedAt,
    authority: {
      localOnly: true,
      researchOnly: true,
      visibleOutputsOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      installsRuntimeAdapter: false,
      automatedOrders: false,
    },
    source: {
      dayByDayReportPath: args.dayByDayReportPath,
      laneComparisonReportPath: args.laneComparisonReportPath,
      sourceRows,
    },
    contract: {
      visibleStates: ['FORMING_DESK_READ', 'APPROVED_DESK_PLAN'],
      hiddenInternalStates: ['WAIT', 'NO_TRADE', 'MISSED_NO_CHASE', 'BLOCKED', 'DATA_LIMITED', 'CAN_EXECUTE_AUDIT'],
      morningMaxVisibleOutputs: 1,
      lunchMaxVisibleOutputs: 1,
      approvedPlanRequiresPrimaryLane: true,
      formingReadAllowsSupportingLane: true,
      silentWhenNoUsefulCandidate: true,
      noHumanReviewWording: true,
    },
    summary: {
      sourceRows,
      visibleOutputRows: rows.length,
      approvedDeskPlanRows: approvedRows.length,
      formingDeskReadRows: formingRows.length,
      silentRows: sourceRows - rows.length,
      morningApprovedRows: approvedRows.filter((row) => row.session === 'morning').length,
      lunchApprovedRows: approvedRows.filter((row) => row.session === 'lunch').length,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      runtimeInstallAllowed: false,
      recommendation: approvedRows.length > 0 ? 'ready_for_local_scanner_builder_preview' : 'hold_for_primary_lane_evidence',
    },
    rows,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputSelectorPreviewReport(report: UnifiedDeskOutputSelectorPreviewReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-selector-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-selector-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const dayByDayReportPath = path.resolve(options.dayByDayReportPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^ytd-full-scanner-day-by-day-market-move-best-model-map-\d+\.json$/) ||
    '');
  const laneComparisonReportPath = path.resolve(options.laneComparisonReportPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^ytd-session-lane-comparison-report-\d+\.json$/) ||
    '');
  if (!fs.existsSync(dayByDayReportPath)) throw new Error('Missing YTD day-by-day report path.');
  if (!fs.existsSync(laneComparisonReportPath)) throw new Error('Missing YTD lane comparison report path.');
  const report = buildUnifiedDeskOutputSelectorPreviewReport({
    dayByDayReport: readJson<DayByDayReport>(dayByDayReportPath),
    dayByDayReportPath,
    laneComparisonReport: readJson<LaneComparisonReport>(laneComparisonReportPath),
    laneComparisonReportPath,
  });
  const written = writeUnifiedDeskOutputSelectorPreviewReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: 'pass', summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
