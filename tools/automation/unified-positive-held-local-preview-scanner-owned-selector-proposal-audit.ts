import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type Recommendation =
  | 'advance_to_scanner_owned_dry_run_selector_contract'
  | 'hold_for_more_separator_research'
  | 'fix_missing_session_bounded_report';

interface SessionBoundedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
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
  sessionEntryHitTime: string | null;
  sessionStopHitTime: string | null;
  sessionT1HitTime: string | null;
  sessionT2HitTime: string | null;
  sessionMaximumFavorableExcursion: number | null;
  sessionMaximumAdverseExcursion: number | null;
  barsLoaded: number;
  barsAfterProof: number;
  blockers?: string[];
}

interface SessionBoundedReport {
  reportType?: string;
  rows?: unknown;
}

interface CohortSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  resolvedRows: number;
  sessionGrossOneMesPl: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
  t2HitRows: number;
  t1OnlyRows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  distinctDates: number;
  averageBarsAfterProof: number | null;
}

interface SelectorExample {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  outcome: string;
  pl: number | null;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  mfeR: number | null;
  maeR: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport {
  reportType: 'unified_positive_held_local_preview_scanner_owned_selector_proposal_audit';
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
  };
  source: {
    sessionBoundedReportPath: string | null;
    sourceReportType: string | null;
  };
  selector: {
    methodKey: string;
    setupType: string;
    session: string;
    direction: string;
    riskBand: string;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    selectorRows: number;
    selectorResolvedRows: number;
    selectorSessionGrossOneMesPl: number | null;
    selectorWinRateResolved: number | null;
    selectorAverageMfeR: number | null;
    selectorAverageMaeR: number | null;
    sameSessionSideNonTargetWinnerRows: number;
    sameSessionSideBlockedUnresolvedRows: number;
    selectorVsNonTargetWinnerPlRank: number | null;
    selectorOutperformsBlockedUnresolved: boolean;
    livePromotionAllowedRows: 0;
    recommendation: Recommendation;
  };
  selectorCohort: CohortSummary;
  sameModelSameSessionSideOtherRisk: CohortSummary;
  sameSessionSideNonTargetWinners: CohortSummary;
  sameSessionSideBlockedUnresolved: CohortSummary;
  topSelectorExamples: SelectorExample[];
  losingSelectorExamples: SelectorExample[];
  unresolvedSelectorExamples: SelectorExample[];
  blockerCounts: Array<{ blocker: string; rows: number }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SELECTOR_KEY = 'NoInstalledSetup|morning|SHORT|risk_8_to_16';

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

function asRows(report: SessionBoundedReport | null): SessionBoundedRow[] {
  return Array.isArray(report?.rows) ? report.rows as SessionBoundedRow[] : [];
}

function selectorParts(methodKey: string): { setupType: string; session: string; direction: string; riskBand: string } {
  const [setupType = '', session = '', direction = '', riskBand = ''] = methodKey.split('|');
  return { setupType, session, direction, riskBand };
}

function mfeR(row: SessionBoundedRow): number | null {
  return row.sessionMaximumFavorableExcursion !== null && row.riskPoints > 0
    ? row.sessionMaximumFavorableExcursion / row.riskPoints
    : null;
}

function maeR(row: SessionBoundedRow): number | null {
  return row.sessionMaximumAdverseExcursion !== null && row.riskPoints > 0
    ? row.sessionMaximumAdverseExcursion / row.riskPoints
    : null;
}

function summarize(key: string, rows: SessionBoundedRow[]): CohortSummary {
  const resolved = rows.filter((row) => row.sessionResolvedOneMesPl !== null);
  const winners = rows.filter((row) => row.sessionOutcomeBucket === 'winner').length;
  return {
    key,
    rows: rows.length,
    winners,
    losses: rows.filter((row) => row.sessionOutcomeBucket === 'loss').length,
    unresolved: rows.filter((row) => row.sessionOutcomeBucket === 'unresolved').length,
    blocked: rows.filter((row) => row.sessionOutcomeBucket === 'blocked').length,
    resolvedRows: resolved.length,
    sessionGrossOneMesPl: sum(rows.map((row) => row.sessionResolvedOneMesPl)),
    winRateResolved: resolved.length ? round(winners / resolved.length) : null,
    averageRiskPoints: avg(rows.map((row) => row.riskPoints)),
    averageMfeR: avg(rows.map(mfeR)),
    averageMaeR: avg(rows.map(maeR)),
    t2HitRows: rows.filter((row) => row.sessionOutcomeLabel === 't1_and_t2_hit').length,
    t1OnlyRows: rows.filter((row) => row.sessionOutcomeLabel === 't1_hit_only').length,
    noFillRows: rows.filter((row) => row.sessionOutcomeLabel === 'no_fill').length,
    noTargetOrStopRows: rows.filter((row) => row.sessionOutcomeLabel === 'no_target_or_stop_hit').length,
    distinctDates: new Set(rows.map((row) => row.tradeDate)).size,
    averageBarsAfterProof: avg(rows.map((row) => row.barsAfterProof)),
  };
}

function example(row: SessionBoundedRow): SelectorExample {
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    proofTime: row.proofTime,
    outcome: row.sessionOutcomeLabel,
    pl: row.sessionResolvedOneMesPl,
    entry: row.entry,
    stop: row.stop,
    t1: row.t1,
    t2: row.t2,
    riskPoints: row.riskPoints,
    mfeR: mfeR(row) === null ? null : round(mfeR(row) as number),
    maeR: maeR(row) === null ? null : round(maeR(row) as number),
  };
}

function blockerCounts(rows: SessionBoundedRow[]): Array<{ blocker: string; rows: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const blocker of row.blockers || []) counts.set(blocker, (counts.get(blocker) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([blocker, count]) => ({ blocker, rows: count }))
    .sort((a, b) => b.rows - a.rows || a.blocker.localeCompare(b.blocker));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function cohortRow(row: CohortSummary): string {
  return `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.sessionGrossOneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} | ${row.averageMfeR ?? '-'} | ${row.averageMaeR ?? '-'} | ${row.t2HitRows}/${row.t1OnlyRows} | ${row.noFillRows}/${row.noTargetOrStopRows} | ${row.distinctDates} |`;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport, 'markdown'>): string {
  return [
    '# Scanner-Owned Selector Proposal Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over a saved session-bounded validation report. It does not run the scanner, change ranking, post Discord, write Supabase, read live bridge data, or allow live promotion.',
    '',
    '## Selector',
    `- Method key: ${report.selector.methodKey}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Selector rows: ${report.summary.selectorRows}.`,
    `- Selector resolved rows: ${report.summary.selectorResolvedRows}.`,
    `- Selector same-session one-MES P/L: ${report.summary.selectorSessionGrossOneMesPl ?? '-'}.`,
    `- Selector win rate: ${report.summary.selectorWinRateResolved ?? '-'}.`,
    `- Selector avg MFE/MAE R: ${report.summary.selectorAverageMfeR ?? '-'}/${report.summary.selectorAverageMaeR ?? '-'}.`,
    `- Same-session side non-target winner rows: ${report.summary.sameSessionSideNonTargetWinnerRows}.`,
    `- Same-session side blocked/unresolved rows: ${report.summary.sameSessionSideBlockedUnresolvedRows}.`,
    `- Selector P/L rank versus non-target winner method groups: ${report.summary.selectorVsNonTargetWinnerPlRank ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Cohort Comparison',
    '| Cohort | Rows | W/L/U/B | P/L | Win Rate | Avg Risk | Avg MFE R | Avg MAE R | T2/T1-only | No-fill/Flat | Dates |',
    '|---|---:|---|---:|---:|---:|---:|---:|---|---|---:|',
    cohortRow(report.selectorCohort),
    cohortRow(report.sameModelSameSessionSideOtherRisk),
    cohortRow(report.sameSessionSideNonTargetWinners),
    cohortRow(report.sameSessionSideBlockedUnresolved),
    '',
    '## Top Selector Examples',
    '| Ticket | Date | Proof | Outcome | P/L | Entry | Stop | T1 | T2 | Risk | MFE R | MAE R |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...report.topSelectorExamples.map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.proofTime} | ${row.outcome} | ${row.pl ?? '-'} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.riskPoints} | ${row.mfeR ?? '-'} | ${row.maeR ?? '-'} |`),
    '',
    '## Losing Selector Examples',
    ...(report.losingSelectorExamples.length
      ? report.losingSelectorExamples.map((row) => `- ${row.ticketId}: ${row.outcome}, P/L ${row.pl ?? '-'}, entry ${row.entry}, stop ${row.stop}, risk ${row.riskPoints}.`)
      : ['- None.']),
    '',
    '## Unresolved Selector Examples',
    ...(report.unresolvedSelectorExamples.length
      ? report.unresolvedSelectorExamples.map((row) => `- ${row.ticketId}: ${row.outcome}, entry ${row.entry}, stop ${row.stop}, risk ${row.riskPoints}.`)
      : ['- None.']),
    '',
    '## Blocker Counts',
    ...(report.blockerCounts.length
      ? report.blockerCounts.map((row) => `- ${row.blocker}: ${row.rows}`)
      : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport(args: {
  sessionBoundedReportPath: string | null;
  sessionBoundedReport: SessionBoundedReport | null;
  selectorMethodKey?: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport {
  const methodKey = args.selectorMethodKey || DEFAULT_SELECTOR_KEY;
  const parts = selectorParts(methodKey);
  const rows = asRows(args.sessionBoundedReport);
  const selectorRows = rows.filter((row) => row.methodKey === methodKey);
  const sameModelSameSessionSideOtherRiskRows = rows.filter((row) =>
    row.setupType === parts.setupType &&
    row.session === parts.session &&
    row.direction === parts.direction &&
    row.methodKey !== methodKey);
  const sameSessionSideNonTargetWinnerRows = rows.filter((row) =>
    row.session === parts.session &&
    row.direction === parts.direction &&
    row.methodKey !== methodKey &&
    row.sessionOutcomeBucket === 'winner');
  const sameSessionSideBlockedUnresolvedRows = rows.filter((row) =>
    row.session === parts.session &&
    row.direction === parts.direction &&
    row.methodKey !== methodKey &&
    (row.sessionOutcomeBucket === 'blocked' || row.sessionOutcomeBucket === 'unresolved'));
  const selectorCohort = summarize(methodKey, selectorRows);
  const nonTargetMethodGroups = [...new Set(sameSessionSideNonTargetWinnerRows.map((row) => row.methodKey))]
    .map((key) => summarize(key, sameSessionSideNonTargetWinnerRows.filter((row) => row.methodKey === key)))
    .sort((a, b) => (b.sessionGrossOneMesPl ?? -999999) - (a.sessionGrossOneMesPl ?? -999999));
  const selectorVsNonTargetWinnerPlRank = selectorCohort.sessionGrossOneMesPl === null
    ? null
    : 1 + nonTargetMethodGroups.filter((group) => (group.sessionGrossOneMesPl ?? -999999) > (selectorCohort.sessionGrossOneMesPl ?? -999999)).length;
  const blockers = [
    !args.sessionBoundedReportPath ? 'missing session-bounded report path' : null,
    !args.sessionBoundedReport ? 'missing session-bounded report' : null,
    rows.length === 0 ? 'session-bounded report has no rows' : null,
    selectorRows.length === 0 ? `selector method key had no rows: ${methodKey}` : null,
  ].filter((item): item is string => Boolean(item));
  const selectorPassesThreshold =
    selectorCohort.rows >= 25 &&
    (selectorCohort.sessionGrossOneMesPl ?? 0) > 0 &&
    (selectorCohort.winRateResolved ?? 0) >= 0.75 &&
    (selectorCohort.averageMaeR ?? 999) <= 0.5 &&
    selectorVsNonTargetWinnerPlRank !== null &&
    selectorVsNonTargetWinnerPlRank <= 3;
  const recommendation: Recommendation = blockers.length
    ? 'fix_missing_session_bounded_report'
    : selectorPassesThreshold
      ? 'advance_to_scanner_owned_dry_run_selector_contract'
      : 'hold_for_more_separator_research';
  const base: Omit<UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_scanner_owned_selector_proposal_audit',
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
    },
    source: {
      sessionBoundedReportPath: args.sessionBoundedReportPath,
      sourceReportType: args.sessionBoundedReport?.reportType || null,
    },
    selector: {
      methodKey,
      setupType: parts.setupType,
      session: parts.session,
      direction: parts.direction,
      riskBand: parts.riskBand,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      selectorRows: selectorRows.length,
      selectorResolvedRows: selectorCohort.resolvedRows,
      selectorSessionGrossOneMesPl: selectorCohort.sessionGrossOneMesPl,
      selectorWinRateResolved: selectorCohort.winRateResolved,
      selectorAverageMfeR: selectorCohort.averageMfeR,
      selectorAverageMaeR: selectorCohort.averageMaeR,
      sameSessionSideNonTargetWinnerRows: sameSessionSideNonTargetWinnerRows.length,
      sameSessionSideBlockedUnresolvedRows: sameSessionSideBlockedUnresolvedRows.length,
      selectorVsNonTargetWinnerPlRank,
      selectorOutperformsBlockedUnresolved: (selectorCohort.sessionGrossOneMesPl ?? 0) > (sum(sameSessionSideBlockedUnresolvedRows.map((row) => row.sessionResolvedOneMesPl)) ?? 0),
      livePromotionAllowedRows: 0,
      recommendation,
    },
    selectorCohort,
    sameModelSameSessionSideOtherRisk: summarize(`${parts.setupType}|${parts.session}|${parts.direction}|other_risk`, sameModelSameSessionSideOtherRiskRows),
    sameSessionSideNonTargetWinners: summarize(`${parts.session}|${parts.direction}|non_target_winners`, sameSessionSideNonTargetWinnerRows),
    sameSessionSideBlockedUnresolved: summarize(`${parts.session}|${parts.direction}|blocked_unresolved`, sameSessionSideBlockedUnresolvedRows),
    topSelectorExamples: [...selectorRows]
      .filter((row) => row.sessionResolvedOneMesPl !== null)
      .sort((a, b) => (b.sessionResolvedOneMesPl ?? -999999) - (a.sessionResolvedOneMesPl ?? -999999))
      .slice(0, 12)
      .map(example),
    losingSelectorExamples: selectorRows
      .filter((row) => row.sessionOutcomeBucket === 'loss')
      .slice(0, 12)
      .map(example),
    unresolvedSelectorExamples: selectorRows
      .filter((row) => row.sessionOutcomeBucket === 'unresolved' || row.sessionOutcomeBucket === 'blocked')
      .slice(0, 12)
      .map(example),
    blockerCounts: blockerCounts(selectorRows),
    blockers,
    recommendations: blockers.length
      ? ['Generate or pass a session-bounded validation report before running selector proposal audit.']
      : recommendation === 'advance_to_scanner_owned_dry_run_selector_contract'
        ? [
          'Advance this exact selector to a scanner-owned dry-run contract only.',
          'Keep live promotion disabled until the dry-run proves one ticket per scanner slate and no Discord/canExecute side effects.',
          'Do not broaden this evidence to other Sweep directions, sessions, or risk bands yet.',
        ]
        : [
          'Hold runtime changes and mine a tighter pre-entry separator before proposing a scanner selector.',
          'Compare losing and unresolved selector rows before any ranking or eligibility change.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport(
  report: UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-scanner-owned-selector-proposal-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sessionBoundedReportPath = readFlag(args, '--session-bounded-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-session-bounded-profit-validation-\d+\.json$/);
  const selectorMethodKey = readFlag(args, '--selector-method-key') || DEFAULT_SELECTOR_KEY;
  const report = buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport({
    sessionBoundedReportPath,
    sessionBoundedReport: readJson<SessionBoundedReport>(sessionBoundedReportPath),
    selectorMethodKey,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorProposalAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
