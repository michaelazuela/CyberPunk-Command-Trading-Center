import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';

interface SessionBoundedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  methodKey: string;
  riskBand: string;
  sessionOutcomeBucket: OutcomeBucket;
  sessionOutcomeLabel: string;
  sessionResolvedOneMesPl: number | null;
  sessionResolvedR: number | null;
  sessionMaximumFavorableExcursion: number | null;
  sessionMaximumAdverseExcursion: number | null;
}

interface SourceReport {
  reportType?: string;
  rows?: unknown;
}

interface Slate {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  direction: Direction;
  riskBand: string;
  methodKey: string;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: string;
  oneMesPl: number | null;
  r: number | null;
  mfeR: number | null;
  maeR: number | null;
  rawRowsInSlate: number;
  duplicateRowsSuppressed: number;
  hasCollision: boolean;
  hasSweepCollision: boolean;
  hasHtfCollision: boolean;
  collisionMethodKeys: string[];
}

interface GroupSummary {
  key: string;
  slates: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  resolvedSlates: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
  duplicateRowsSuppressed: number;
  collisionSlates: number;
  sweepCollisionSlates: number;
  htfCollisionSlates: number;
  distinctDates: number;
}

export interface UnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_slate_edge_audit';
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
    changesDiscordPosting: false;
    changesAppRuntime: false;
    livePromotionAllowed: false;
  };
  source: {
    sessionBoundedReportPath: string | null;
    sourceReportType: string | null;
  };
  summary: {
    sourceRows: number;
    openingDriveRawRows: number;
    openingDriveSlateRows: number;
    duplicateRowsSuppressed: number;
    rawOpeningDriveOneMesPl: number | null;
    slateOpeningDriveOneMesPl: number | null;
    slateOpeningDriveWinRateResolved: number | null;
    livePromotionAllowedRows: 0;
    bestStandaloneGroupKey: string | null;
    bestWithSweepGroupKey: string | null;
    recommendation: 'advance_best_overlap_story_to_htf_daily_review' | 'hold_for_model_refinement' | 'fix_missing_session_bounded_report';
  };
  allOpeningDrive: GroupSummary;
  byMethod: GroupSummary[];
  bySessionDirection: GroupSummary[];
  standaloneVsCollision: GroupSummary[];
  sweepOverlap: GroupSummary[];
  topGroups: GroupSummary[];
  dailySlates: Slate[];
  topSlates: Slate[];
  losingSlates: Slate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_MODEL = 'OpeningDriveFvgContinuation';
const COLLISION_WINDOW_MINUTES = 10;

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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function rowsFrom(report: SourceReport | null): SessionBoundedRow[] {
  return Array.isArray(report?.rows) ? report.rows as SessionBoundedRow[] : [];
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutesBetween(a: string, b: string): number {
  return Math.abs(timeMs(a) - timeMs(b)) / 60000;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function ratio(points: number | null, riskPoints: number): number | null {
  return points !== null && riskPoints > 0 ? points / riskPoints : null;
}

function slateKey(row: SessionBoundedRow): string {
  return [row.tradeDate, row.session, row.setupType, row.direction, row.entry, row.stop, row.t1, row.t2].join('|');
}

function groupBy<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return groups;
}

function buildSlate(key: string, rows: SessionBoundedRow[], allRows: SessionBoundedRow[]): Slate {
  const sorted = [...rows].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
  const selected = sorted[0];
  const collisions = allRows.filter((row) =>
    row.tradeDate === selected.tradeDate &&
    row.session === selected.session &&
    row.direction === selected.direction &&
    row.setupType !== TARGET_MODEL &&
    minutesBetween(selected.proofTime, row.proofTime) <= COLLISION_WINDOW_MINUTES);
  const collisionMethodKeys = [...new Set(collisions.map((row) => row.methodKey))].sort();
  return {
    slateKey: key,
    selectedTicketId: selected.ticketId,
    tradeDate: selected.tradeDate,
    session: selected.session,
    direction: selected.direction,
    riskBand: selected.riskBand,
    methodKey: selected.methodKey,
    proofTime: selected.proofTime,
    entry: selected.entry,
    stop: selected.stop,
    t1: selected.t1,
    t2: selected.t2,
    riskPoints: selected.riskPoints,
    outcomeBucket: selected.sessionOutcomeBucket,
    outcomeLabel: selected.sessionOutcomeLabel,
    oneMesPl: selected.sessionResolvedOneMesPl,
    r: selected.sessionResolvedR,
    mfeR: ratio(selected.sessionMaximumFavorableExcursion, selected.riskPoints) === null ? null : round(ratio(selected.sessionMaximumFavorableExcursion, selected.riskPoints) as number),
    maeR: ratio(selected.sessionMaximumAdverseExcursion, selected.riskPoints) === null ? null : round(ratio(selected.sessionMaximumAdverseExcursion, selected.riskPoints) as number),
    rawRowsInSlate: sorted.length,
    duplicateRowsSuppressed: Math.max(0, sorted.length - 1),
    hasCollision: collisionMethodKeys.length > 0,
    hasSweepCollision: collisionMethodKeys.some((item) => item.startsWith('SweepMssFvgRetrace|')),
    hasHtfCollision: collisionMethodKeys.some((item) => item.startsWith('HtfDisplacement')),
    collisionMethodKeys,
  };
}

function summarize(key: string, slates: Slate[]): GroupSummary {
  const resolved = slates.filter((row) => row.oneMesPl !== null);
  const winners = slates.filter((row) => row.outcomeBucket === 'winner').length;
  return {
    key,
    slates: slates.length,
    winners,
    losses: slates.filter((row) => row.outcomeBucket === 'loss').length,
    unresolved: slates.filter((row) => row.outcomeBucket === 'unresolved').length,
    blocked: slates.filter((row) => row.outcomeBucket === 'blocked').length,
    resolvedSlates: resolved.length,
    oneMesPl: sum(slates.map((row) => row.oneMesPl)),
    winRateResolved: resolved.length ? round(winners / resolved.length) : null,
    averageRiskPoints: avg(slates.map((row) => row.riskPoints)),
    averageMfeR: avg(slates.map((row) => row.mfeR)),
    averageMaeR: avg(slates.map((row) => row.maeR)),
    duplicateRowsSuppressed: slates.reduce((total, row) => total + row.duplicateRowsSuppressed, 0),
    collisionSlates: slates.filter((row) => row.hasCollision).length,
    sweepCollisionSlates: slates.filter((row) => row.hasSweepCollision).length,
    htfCollisionSlates: slates.filter((row) => row.hasHtfCollision).length,
    distinctDates: new Set(slates.map((row) => row.tradeDate)).size,
  };
}

function summarizeGroups(slates: Slate[], keyFor: (row: Slate) => string): GroupSummary[] {
  return [...groupBy(slates, keyFor).entries()]
    .map(([key, group]) => summarize(key, group))
    .sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function groupTable(groups: GroupSummary[], limit = 12): string[] {
  return [
    '| Group | Slates | W/L/U/B | P/L | Win Rate | Avg Risk | Avg MFE R | Avg MAE R | Dupes | Sweep Overlap | HTF Overlap | Dates |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...groups.slice(0, limit).map((row) => `| ${escapeTable(row.key)} | ${row.slates} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} | ${row.duplicateRowsSuppressed} | ${row.sweepCollisionSlates} | ${row.htfCollisionSlates} | ${row.distinctDates} |`),
  ];
}

function slateTable(slates: Slate[], limit = 20): string[] {
  return [
    '| Date | Time | Side | Risk Band | Result | P/L | Entry | Stop | T1 | T2 | MFE R | MAE R | Sweep | HTF |',
    '|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...slates.slice(0, limit).map((row) => `| ${row.tradeDate} | ${row.proofTime.slice(11, 16)} | ${row.direction} | ${row.riskBand} | ${row.outcomeLabel} | ${row.oneMesPl ?? '-'} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.mfeR ?? '-'} | ${row.maeR ?? '-'} | ${row.hasSweepCollision ? 'yes' : 'no'} | ${row.hasHtfCollision ? 'yes' : 'no'} |`),
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive Slate Edge Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved session-bounded validation rows. It does not run the scanner, change ranking, post Discord, write Supabase, read the bridge, or approve execution.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- OpeningDrive raw rows: ${report.summary.openingDriveRawRows}.`,
    `- OpeningDrive slate rows: ${report.summary.openingDriveSlateRows}.`,
    `- Duplicate rows suppressed: ${report.summary.duplicateRowsSuppressed}.`,
    `- Raw OpeningDrive P/L: ${report.summary.rawOpeningDriveOneMesPl ?? '-'}.`,
    `- Slate OpeningDrive P/L: ${report.summary.slateOpeningDriveOneMesPl ?? '-'}.`,
    `- Slate win rate: ${report.summary.slateOpeningDriveWinRateResolved ?? '-'}.`,
    `- Best standalone group: ${report.summary.bestStandaloneGroupKey ?? '-'}.`,
    `- Best with-Sweep group: ${report.summary.bestWithSweepGroupKey ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Groups',
    ...groupTable(report.topGroups),
    '',
    '## Sweep Overlap',
    ...groupTable(report.sweepOverlap),
    '',
    '## Daily Slates',
    ...slateTable(report.dailySlates, 30),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport(args: {
  sessionBoundedReportPath: string | null;
  sessionBoundedReport: SourceReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport {
  const rows = rowsFrom(args.sessionBoundedReport);
  const openingDriveRows = rows.filter((row) => row.setupType === TARGET_MODEL);
  const slates = [...groupBy(openingDriveRows, slateKey).entries()]
    .map(([key, group]) => buildSlate(key, group, rows))
    .sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
  const allOpeningDrive = summarize('all_openingdrive_slate_based', slates);
  const standaloneGroups = summarizeGroups(slates.filter((row) => !row.hasCollision), (row) => `${row.methodKey}|standalone`);
  const sweepGroups = summarizeGroups(slates.filter((row) => row.hasSweepCollision), (row) => `${row.methodKey}|with_sweep_overlap`);
  const bestStandalone = standaloneGroups.find((row) => row.slates >= 2 && (row.oneMesPl ?? 0) > 0) || null;
  const bestWithSweep = sweepGroups.find((row) => row.slates >= 2 && (row.oneMesPl ?? 0) > 0) || null;
  const blockers = [
    !args.sessionBoundedReportPath ? 'missing session-bounded report path' : null,
    !args.sessionBoundedReport ? 'missing session-bounded report' : null,
    rows.length === 0 ? 'session-bounded report has no rows' : null,
    openingDriveRows.length === 0 ? 'session-bounded report has no OpeningDriveFvgContinuation rows' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_missing_session_bounded_report' as const
    : (allOpeningDrive.oneMesPl ?? 0) > 0 && (allOpeningDrive.winRateResolved ?? 0) >= 0.5
      ? 'advance_best_overlap_story_to_htf_daily_review' as const
      : 'hold_for_model_refinement' as const;
  const byMethod = summarizeGroups(slates, (row) => row.methodKey);
  const standaloneVsCollision = [
    ...summarizeGroups(slates.filter((row) => !row.hasCollision), (row) => `${row.methodKey}|standalone`),
    ...summarizeGroups(slates.filter((row) => row.hasCollision), (row) => `${row.methodKey}|with_collision`),
  ].sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999));
  const sweepOverlap = [
    ...summarizeGroups(slates.filter((row) => row.hasSweepCollision), (row) => `${row.methodKey}|with_sweep_overlap`),
    ...summarizeGroups(slates.filter((row) => !row.hasSweepCollision), (row) => `${row.methodKey}|no_sweep_overlap`),
  ].sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999));
  const base: Omit<UnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_slate_edge_audit',
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
      changesRiskRules: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
      livePromotionAllowed: false,
    },
    source: {
      sessionBoundedReportPath: args.sessionBoundedReportPath,
      sourceReportType: args.sessionBoundedReport?.reportType || null,
    },
    summary: {
      sourceRows: rows.length,
      openingDriveRawRows: openingDriveRows.length,
      openingDriveSlateRows: slates.length,
      duplicateRowsSuppressed: slates.reduce((total, row) => total + row.duplicateRowsSuppressed, 0),
      rawOpeningDriveOneMesPl: sum(openingDriveRows.map((row) => row.sessionResolvedOneMesPl)),
      slateOpeningDriveOneMesPl: allOpeningDrive.oneMesPl,
      slateOpeningDriveWinRateResolved: allOpeningDrive.winRateResolved,
      livePromotionAllowedRows: 0,
      bestStandaloneGroupKey: bestStandalone?.key || null,
      bestWithSweepGroupKey: bestWithSweep?.key || null,
      recommendation,
    },
    allOpeningDrive,
    byMethod,
    bySessionDirection: summarizeGroups(slates, (row) => `${row.session}|${row.direction}`),
    standaloneVsCollision,
    sweepOverlap,
    topGroups: [...byMethod, ...standaloneVsCollision, ...sweepOverlap].sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999)).slice(0, 18),
    dailySlates: slates,
    topSlates: [...slates].filter((row) => row.oneMesPl !== null).sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999)).slice(0, 16),
    losingSlates: slates.filter((row) => row.outcomeBucket === 'loss'),
    blockers,
    recommendations: blockers.length
      ? ['Generate or pass a session-bounded validation report before running the OpeningDrive slate audit.']
      : [
        'Do not treat raw OpeningDrive rows as edge; slate-based results are the valid research lens.',
        'Compare OpeningDrive with Sweep overlap against OpeningDrive standalone before local-preview behavior.',
        'Next step should add HTF daily story for the best overlap days instead of changing runtime ranking.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport(
  report: UnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-slate-edge-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sessionBoundedReportPath = readFlag(args, '--session-bounded-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-session-bounded-profit-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport({
    sessionBoundedReportPath,
    sessionBoundedReport: readJson<SourceReport>(sessionBoundedReportPath),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditReport(report, outDir);
  if (args.includes('--json')) {
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
    runUnifiedPositiveHeldLocalPreviewOpeningDriveSlateEdgeAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
