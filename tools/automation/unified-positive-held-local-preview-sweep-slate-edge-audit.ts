import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type Recommendation = 'advance_best_pocket_to_local_preview_only' | 'hold_for_model_refinement' | 'fix_missing_session_bounded_report';

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
  blockers?: string[];
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
  hasOpeningDriveCollision: boolean;
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
  openingDriveCollisionSlates: number;
  htfCollisionSlates: number;
  distinctDates: number;
}

export interface UnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport {
  reportType: 'unified_positive_held_local_preview_sweep_slate_edge_audit';
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
    sweepRawRows: number;
    sweepSlateRows: number;
    duplicateRowsSuppressed: number;
    rawSweepOneMesPl: number | null;
    slateSweepOneMesPl: number | null;
    slateSweepWinRateResolved: number | null;
    livePromotionAllowedRows: 0;
    bestStandaloneGroupKey: string | null;
    bestWithCollisionGroupKey: string | null;
    recommendation: Recommendation;
  };
  allSweep: GroupSummary;
  byMethod: GroupSummary[];
  bySessionDirection: GroupSummary[];
  byRiskBand: GroupSummary[];
  standaloneVsCollision: GroupSummary[];
  openingDriveOverlap: GroupSummary[];
  topGroups: GroupSummary[];
  topSlates: Slate[];
  losingSlates: Slate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_MODEL = 'SweepMssFvgRetrace';
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

function mfeR(row: Pick<SessionBoundedRow, 'sessionMaximumFavorableExcursion' | 'riskPoints'>): number | null {
  return row.sessionMaximumFavorableExcursion !== null && row.riskPoints > 0
    ? row.sessionMaximumFavorableExcursion / row.riskPoints
    : null;
}

function maeR(row: Pick<SessionBoundedRow, 'sessionMaximumAdverseExcursion' | 'riskPoints'>): number | null {
  return row.sessionMaximumAdverseExcursion !== null && row.riskPoints > 0
    ? row.sessionMaximumAdverseExcursion / row.riskPoints
    : null;
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
    mfeR: mfeR(selected) === null ? null : round(mfeR(selected) as number),
    maeR: maeR(selected) === null ? null : round(maeR(selected) as number),
    rawRowsInSlate: sorted.length,
    duplicateRowsSuppressed: Math.max(0, sorted.length - 1),
    hasCollision: collisionMethodKeys.length > 0,
    hasOpeningDriveCollision: collisionMethodKeys.some((item) => item.startsWith('OpeningDriveFvgContinuation|')),
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
    openingDriveCollisionSlates: slates.filter((row) => row.hasOpeningDriveCollision).length,
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
    '| Group | Slates | W/L/U/B | P/L | Win Rate | Avg Risk | Avg MFE R | Avg MAE R | Dupes | Collisions | Dates |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...groups.slice(0, limit).map((row) => `| ${escapeTable(row.key)} | ${row.slates} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} | ${row.duplicateRowsSuppressed} | ${row.collisionSlates} | ${row.distinctDates} |`),
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport, 'markdown'>): string {
  return [
    '# Sweep Slate Edge Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved session-bounded validation rows. It does not run the scanner, change ranking, post Discord, write Supabase, read the bridge, or approve execution.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Sweep raw rows: ${report.summary.sweepRawRows}.`,
    `- Sweep slate rows: ${report.summary.sweepSlateRows}.`,
    `- Duplicate rows suppressed: ${report.summary.duplicateRowsSuppressed}.`,
    `- Raw Sweep P/L: ${report.summary.rawSweepOneMesPl ?? '-'}.`,
    `- Slate Sweep P/L: ${report.summary.slateSweepOneMesPl ?? '-'}.`,
    `- Slate win rate: ${report.summary.slateSweepWinRateResolved ?? '-'}.`,
    `- Best standalone group: ${report.summary.bestStandaloneGroupKey ?? '-'}.`,
    `- Best with-collision group: ${report.summary.bestWithCollisionGroupKey ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Groups',
    ...groupTable(report.topGroups),
    '',
    '## By Method',
    ...groupTable(report.byMethod),
    '',
    '## Standalone Vs Collision',
    ...groupTable(report.standaloneVsCollision),
    '',
    '## OpeningDrive Overlap',
    ...groupTable(report.openingDriveOverlap),
    '',
    '## Top Slates',
    '| Ticket | Date | Session | Side | Risk Band | Outcome | P/L | Entry | Stop | T1 | T2 | Dupes | Collision |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.topSlates.map((row) => `| ${escapeTable(row.selectedTicketId)} | ${row.tradeDate} | ${row.session} | ${row.direction} | ${row.riskBand} | ${row.outcomeLabel} | ${row.oneMesPl ?? '-'} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.duplicateRowsSuppressed} | ${row.hasCollision ? 'yes' : 'no'} |`),
    '',
    '## Losing Slates',
    ...(report.losingSlates.length
      ? report.losingSlates.map((row) => `- ${row.selectedTicketId}: ${row.session} ${row.direction} ${row.riskBand}, P/L ${row.oneMesPl ?? '-'}, MFE/MAE ${row.mfeR ?? '-'}/${row.maeR ?? '-'}R.`)
      : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport(args: {
  sessionBoundedReportPath: string | null;
  sessionBoundedReport: SourceReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport {
  const rows = rowsFrom(args.sessionBoundedReport);
  const sweepRows = rows.filter((row) => row.setupType === TARGET_MODEL);
  const slates = [...groupBy(sweepRows, slateKey).entries()]
    .map(([key, group]) => buildSlate(key, group, rows))
    .sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
  const allSweep = summarize('all_sweep_slate_based', slates);
  const standaloneGroups = summarizeGroups(slates.filter((row) => !row.hasCollision), (row) => `${row.methodKey}|standalone`);
  const collisionGroups = summarizeGroups(slates.filter((row) => row.hasCollision), (row) => `${row.methodKey}|with_collision`);
  const bestStandalone = standaloneGroups.find((row) => row.slates >= 2 && (row.oneMesPl ?? 0) > 0) || null;
  const bestWithCollision = collisionGroups.find((row) => row.slates >= 2 && (row.oneMesPl ?? 0) > 0) || null;
  const blockers = [
    !args.sessionBoundedReportPath ? 'missing session-bounded report path' : null,
    !args.sessionBoundedReport ? 'missing session-bounded report' : null,
    rows.length === 0 ? 'session-bounded report has no rows' : null,
    sweepRows.length === 0 ? 'session-bounded report has no SweepMssFvgRetrace rows' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: Recommendation = blockers.length
    ? 'fix_missing_session_bounded_report'
    : (allSweep.oneMesPl ?? 0) > 0 && (allSweep.winRateResolved ?? 0) >= 0.5
      ? 'advance_best_pocket_to_local_preview_only'
      : 'hold_for_model_refinement';
  const rawSweepPl = sum(sweepRows.map((row) => row.sessionResolvedOneMesPl));
  const byMethod = summarizeGroups(slates, (row) => row.methodKey);
  const standaloneVsCollision = [
    ...summarizeGroups(slates.filter((row) => !row.hasCollision), (row) => `${row.methodKey}|standalone`),
    ...summarizeGroups(slates.filter((row) => row.hasCollision), (row) => `${row.methodKey}|with_collision`),
  ].sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_slate_edge_audit',
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
      sweepRawRows: sweepRows.length,
      sweepSlateRows: slates.length,
      duplicateRowsSuppressed: slates.reduce((total, row) => total + row.duplicateRowsSuppressed, 0),
      rawSweepOneMesPl: rawSweepPl,
      slateSweepOneMesPl: allSweep.oneMesPl,
      slateSweepWinRateResolved: allSweep.winRateResolved,
      livePromotionAllowedRows: 0,
      bestStandaloneGroupKey: bestStandalone?.key || null,
      bestWithCollisionGroupKey: bestWithCollision?.key || null,
      recommendation,
    },
    allSweep,
    byMethod,
    bySessionDirection: summarizeGroups(slates, (row) => `${row.session}|${row.direction}`),
    byRiskBand: summarizeGroups(slates, (row) => row.riskBand),
    standaloneVsCollision,
    openingDriveOverlap: [
      ...summarizeGroups(slates.filter((row) => row.hasOpeningDriveCollision), (row) => `${row.methodKey}|openingdrive_overlap`),
      ...summarizeGroups(slates.filter((row) => !row.hasOpeningDriveCollision), (row) => `${row.methodKey}|no_openingdrive_overlap`),
    ].sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999)),
    topGroups: [...byMethod, ...standaloneVsCollision].sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999)).slice(0, 16),
    topSlates: [...slates].filter((row) => row.oneMesPl !== null).sort((a, b) => (b.oneMesPl ?? -999999) - (a.oneMesPl ?? -999999)).slice(0, 16),
    losingSlates: slates.filter((row) => row.outcomeBucket === 'loss'),
    blockers,
    recommendations: blockers.length
      ? ['Generate or pass a session-bounded validation report before running the Sweep slate audit.']
      : [
        'Do not treat raw Sweep rows as edge; slate-based results are the valid research lens.',
        'Promote only the best slate-based Sweep pocket to local-preview research, not runtime behavior.',
        'Compare OpeningDrive-overlap versus standalone Sweep before deciding whether Sweep is independent or confirmation-dependent.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport(
  report: UnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-slate-edge-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sessionBoundedReportPath = readFlag(args, '--session-bounded-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-session-bounded-profit-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport({
    sessionBoundedReportPath,
    sessionBoundedReport: readJson<SourceReport>(sessionBoundedReportPath),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepSlateEdgeAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
