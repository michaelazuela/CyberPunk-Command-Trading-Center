import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type Recommendation =
  | 'advance_to_scanner_owned_local_preview_contract'
  | 'hold_for_timing_or_collision_refinement'
  | 'fix_missing_session_bounded_report';

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

interface SlateDecision {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  direction: Direction;
  firstProofTime: string;
  lastProofTime: string;
  selectedOutcomeBucket: OutcomeBucket;
  selectedOutcomeLabel: string;
  selectedOneMesPl: number | null;
  selectedR: number | null;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  rawRowsInSlate: number;
  duplicateRowsSuppressed: number;
  staleRowsSuppressed: number;
  collisionRows: number;
  collisionWinningRows: number;
  collisionMethodKeys: string[];
  mfeR: number | null;
  maeR: number | null;
}

interface CohortSummary {
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  resolvedRows: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
  averageMfeR: number | null;
  averageMaeR: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport {
  reportType: 'unified_positive_held_local_preview_scanner_owned_selector_dry_run_contract';
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
  contract: {
    selectorMethodKey: string;
    staleMinutes: number;
    collisionWindowMinutes: number;
    oneTicketPerSlate: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    selectorRawRows: number;
    dryRunSlateRows: number;
    duplicateRowsSuppressed: number;
    staleRowsSuppressed: number;
    collisionRows: number;
    collisionWinningRows: number;
    rawSelectorOneMesPl: number | null;
    dryRunOneMesPl: number | null;
    dryRunVsRawDeltaOneMesPl: number | null;
    dryRunWinRateResolved: number | null;
    dryRunAverageMfeR: number | null;
    dryRunAverageMaeR: number | null;
    livePromotionAllowedRows: 0;
    recommendation: Recommendation;
  };
  dryRunCohort: CohortSummary;
  rawSelectorCohort: CohortSummary;
  selectedSlates: SlateDecision[];
  losingSlates: SlateDecision[];
  unresolvedSlates: SlateDecision[];
  collisionMethodCounts: Array<{ methodKey: string; rows: number; winners: number }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SELECTOR_KEY = 'SweepMssFvgRetrace|morning|SHORT|risk_8_to_16';
const DEFAULT_STALE_MINUTES = 20;
const DEFAULT_COLLISION_WINDOW_MINUTES = 10;

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

function rowsFrom(report: SessionBoundedReport | null): SessionBoundedRow[] {
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
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    row.entry,
    row.stop,
    row.t1,
    row.t2,
  ].join('|');
}

function summarizeRows(rows: SessionBoundedRow[]): CohortSummary {
  const resolved = rows.filter((row) => row.sessionResolvedOneMesPl !== null);
  const winners = rows.filter((row) => row.sessionOutcomeBucket === 'winner').length;
  return {
    rows: rows.length,
    winners,
    losses: rows.filter((row) => row.sessionOutcomeBucket === 'loss').length,
    unresolved: rows.filter((row) => row.sessionOutcomeBucket === 'unresolved').length,
    blocked: rows.filter((row) => row.sessionOutcomeBucket === 'blocked').length,
    resolvedRows: resolved.length,
    oneMesPl: sum(rows.map((row) => row.sessionResolvedOneMesPl)),
    winRateResolved: resolved.length ? round(winners / resolved.length) : null,
    averageRiskPoints: avg(rows.map((row) => row.riskPoints)),
    averageMfeR: avg(rows.map(mfeR)),
    averageMaeR: avg(rows.map(maeR)),
  };
}

function summarizeSlates(slates: SlateDecision[]): CohortSummary {
  const resolved = slates.filter((row) => row.selectedOneMesPl !== null);
  const winners = slates.filter((row) => row.selectedOutcomeBucket === 'winner').length;
  return {
    rows: slates.length,
    winners,
    losses: slates.filter((row) => row.selectedOutcomeBucket === 'loss').length,
    unresolved: slates.filter((row) => row.selectedOutcomeBucket === 'unresolved').length,
    blocked: slates.filter((row) => row.selectedOutcomeBucket === 'blocked').length,
    resolvedRows: resolved.length,
    oneMesPl: sum(slates.map((row) => row.selectedOneMesPl)),
    winRateResolved: resolved.length ? round(winners / resolved.length) : null,
    averageRiskPoints: avg(slates.map((row) => row.riskPoints)),
    averageMfeR: avg(slates.map((row) => row.mfeR)),
    averageMaeR: avg(slates.map((row) => row.maeR)),
  };
}

function groupBy<T>(items: T[], keyFor: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(keyFor(item), [...(groups.get(keyFor(item)) || []), item]);
  return groups;
}

function collisionCounts(slates: SlateDecision[]): Array<{ methodKey: string; rows: number; winners: number }> {
  const counts = new Map<string, { rows: number; winners: number }>();
  for (const slate of slates) {
    for (const key of slate.collisionMethodKeys) {
      const current = counts.get(key) || { rows: 0, winners: 0 };
      counts.set(key, {
        rows: current.rows + 1,
        winners: current.winners + (slate.collisionWinningRows > 0 ? 1 : 0),
      });
    }
  }
  return [...counts.entries()]
    .map(([methodKey, value]) => ({ methodKey, ...value }))
    .sort((a, b) => b.rows - a.rows || a.methodKey.localeCompare(b.methodKey));
}

function buildSlateDecision(args: {
  key: string;
  rows: SessionBoundedRow[];
  allRows: SessionBoundedRow[];
  staleMinutes: number;
  collisionWindowMinutes: number;
}): SlateDecision {
  const sorted = [...args.rows].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
  const selected = sorted[0];
  const last = sorted[sorted.length - 1];
  const staleRows = sorted.filter((row) => minutesBetween(selected.proofTime, row.proofTime) > args.staleMinutes);
  const collisions = args.allRows.filter((row) =>
    row.tradeDate === selected.tradeDate &&
    row.session === selected.session &&
    row.direction === selected.direction &&
    row.methodKey !== selected.methodKey &&
    minutesBetween(selected.proofTime, row.proofTime) <= args.collisionWindowMinutes);
  return {
    slateKey: args.key,
    selectedTicketId: selected.ticketId,
    tradeDate: selected.tradeDate,
    session: selected.session,
    direction: selected.direction,
    firstProofTime: selected.proofTime,
    lastProofTime: last.proofTime,
    selectedOutcomeBucket: selected.sessionOutcomeBucket,
    selectedOutcomeLabel: selected.sessionOutcomeLabel,
    selectedOneMesPl: selected.sessionResolvedOneMesPl,
    selectedR: selected.sessionResolvedR,
    entry: selected.entry,
    stop: selected.stop,
    t1: selected.t1,
    t2: selected.t2,
    riskPoints: selected.riskPoints,
    rawRowsInSlate: sorted.length,
    duplicateRowsSuppressed: Math.max(0, sorted.length - 1),
    staleRowsSuppressed: staleRows.length,
    collisionRows: collisions.length,
    collisionWinningRows: collisions.filter((row) => row.sessionOutcomeBucket === 'winner').length,
    collisionMethodKeys: [...new Set(collisions.map((row) => row.methodKey))].sort(),
    mfeR: mfeR(selected) === null ? null : round(mfeR(selected) as number),
    maeR: maeR(selected) === null ? null : round(maeR(selected) as number),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport, 'markdown'>): string {
  return [
    '# Scanner-Owned Selector Dry-Run Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only dry run from saved session-bounded validation rows. It does not run the live scanner, publish Discord, write Supabase, read the live bridge, or change trading behavior.',
    '',
    '## Contract',
    `- Selector: ${report.contract.selectorMethodKey}.`,
    `- One ticket per slate: ${report.contract.oneTicketPerSlate}.`,
    `- Stale window: ${report.contract.staleMinutes} minutes.`,
    `- Collision window: ${report.contract.collisionWindowMinutes} minutes.`,
    `- Live promotion allowed: ${report.contract.livePromotionAllowed}.`,
    '',
    '## Summary',
    `- Raw selector rows: ${report.summary.selectorRawRows}.`,
    `- Dry-run slate rows: ${report.summary.dryRunSlateRows}.`,
    `- Duplicate rows suppressed: ${report.summary.duplicateRowsSuppressed}.`,
    `- Stale rows suppressed: ${report.summary.staleRowsSuppressed}.`,
    `- Collision rows noted: ${report.summary.collisionRows}; winning collisions: ${report.summary.collisionWinningRows}.`,
    `- Raw selector one-MES P/L: ${report.summary.rawSelectorOneMesPl ?? '-'}.`,
    `- Dry-run one-MES P/L: ${report.summary.dryRunOneMesPl ?? '-'}.`,
    `- Dry-run delta vs raw: ${report.summary.dryRunVsRawDeltaOneMesPl ?? '-'}.`,
    `- Dry-run win rate: ${report.summary.dryRunWinRateResolved ?? '-'}.`,
    `- Dry-run avg MFE/MAE R: ${report.summary.dryRunAverageMfeR ?? '-'}/${report.summary.dryRunAverageMaeR ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selected Slates',
    '| Ticket | Date | Proof | Outcome | P/L | Entry | Stop | T1 | T2 | Risk | Raw Rows | Dupes | Stale | Collisions |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...report.selectedSlates.slice(0, 24).map((row) => `| ${escapeTable(row.selectedTicketId)} | ${row.tradeDate} | ${row.firstProofTime} | ${row.selectedOutcomeLabel} | ${row.selectedOneMesPl ?? '-'} | ${row.entry} | ${row.stop} | ${row.t1} | ${row.t2} | ${row.riskPoints} | ${row.rawRowsInSlate} | ${row.duplicateRowsSuppressed} | ${row.staleRowsSuppressed} | ${row.collisionRows} |`),
    '',
    '## Collision Method Counts',
    ...(report.collisionMethodCounts.length
      ? report.collisionMethodCounts.map((row) => `- ${row.methodKey}: ${row.rows} slate overlaps, ${row.winners} with at least one winning collision.`)
      : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport(args: {
  sessionBoundedReportPath: string | null;
  sessionBoundedReport: SessionBoundedReport | null;
  selectorMethodKey?: string;
  staleMinutes?: number;
  collisionWindowMinutes?: number;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport {
  const selectorMethodKey = args.selectorMethodKey || DEFAULT_SELECTOR_KEY;
  const staleMinutes = args.staleMinutes ?? DEFAULT_STALE_MINUTES;
  const collisionWindowMinutes = args.collisionWindowMinutes ?? DEFAULT_COLLISION_WINDOW_MINUTES;
  const rows = rowsFrom(args.sessionBoundedReport);
  const selectorRows = rows
    .filter((row) => row.methodKey === selectorMethodKey)
    .sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
  const slates = [...groupBy(selectorRows, slateKey).entries()]
    .map(([key, slateRows]) => buildSlateDecision({
      key,
      rows: slateRows,
      allRows: rows,
      staleMinutes,
      collisionWindowMinutes,
    }))
    .sort((a, b) => timeMs(a.firstProofTime) - timeMs(b.firstProofTime));
  const rawCohort = summarizeRows(selectorRows);
  const dryRunCohort = summarizeSlates(slates);
  const blockers = [
    !args.sessionBoundedReportPath ? 'missing session-bounded report path' : null,
    !args.sessionBoundedReport ? 'missing session-bounded report' : null,
    rows.length === 0 ? 'session-bounded report has no rows' : null,
    selectorRows.length === 0 ? `selector method key had no rows: ${selectorMethodKey}` : null,
  ].filter((item): item is string => Boolean(item));
  const dryRunPasses =
    slates.length >= 3 &&
    (dryRunCohort.oneMesPl ?? 0) > 0 &&
    (dryRunCohort.winRateResolved ?? 0) >= 0.6 &&
    (dryRunCohort.averageMaeR ?? 999) <= 0.75 &&
    slates.filter((row) => row.collisionWinningRows > 0).length <= Math.ceil(slates.length * 0.75);
  const recommendation: Recommendation = blockers.length
    ? 'fix_missing_session_bounded_report'
    : dryRunPasses
      ? 'advance_to_scanner_owned_local_preview_contract'
      : 'hold_for_timing_or_collision_refinement';
  const duplicateRowsSuppressed = slates.reduce((total, row) => total + row.duplicateRowsSuppressed, 0);
  const staleRowsSuppressed = slates.reduce((total, row) => total + row.staleRowsSuppressed, 0);
  const collisionRows = slates.reduce((total, row) => total + row.collisionRows, 0);
  const collisionWinningRows = slates.reduce((total, row) => total + row.collisionWinningRows, 0);
  const base: Omit<UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_scanner_owned_selector_dry_run_contract',
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
    contract: {
      selectorMethodKey,
      staleMinutes,
      collisionWindowMinutes,
      oneTicketPerSlate: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      selectorRawRows: selectorRows.length,
      dryRunSlateRows: slates.length,
      duplicateRowsSuppressed,
      staleRowsSuppressed,
      collisionRows,
      collisionWinningRows,
      rawSelectorOneMesPl: rawCohort.oneMesPl,
      dryRunOneMesPl: dryRunCohort.oneMesPl,
      dryRunVsRawDeltaOneMesPl: rawCohort.oneMesPl === null || dryRunCohort.oneMesPl === null ? null : round(dryRunCohort.oneMesPl - rawCohort.oneMesPl),
      dryRunWinRateResolved: dryRunCohort.winRateResolved,
      dryRunAverageMfeR: dryRunCohort.averageMfeR,
      dryRunAverageMaeR: dryRunCohort.averageMaeR,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    dryRunCohort,
    rawSelectorCohort: rawCohort,
    selectedSlates: slates,
    losingSlates: slates.filter((row) => row.selectedOutcomeBucket === 'loss'),
    unresolvedSlates: slates.filter((row) => row.selectedOutcomeBucket === 'unresolved' || row.selectedOutcomeBucket === 'blocked'),
    collisionMethodCounts: collisionCounts(slates),
    blockers,
    recommendations: blockers.length
      ? ['Generate or pass a session-bounded validation report before running the dry-run contract.']
      : recommendation === 'advance_to_scanner_owned_local_preview_contract'
        ? [
          'Advance only to a local preview contract that emits one scanner-owned review proposal per slate.',
          'Keep live promotion disabled and require another replay check before any scanner ranking or Discord behavior changes.',
          'Carry collision method keys as notes; do not let them create extra executable tickets.',
        ]
        : [
          'Do not promote the selector yet; refine timing, stale expiry, or collision separation first.',
          'Inspect losing and unresolved slates before any runtime selector proposal.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport(
  report: UnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-scanner-owned-selector-dry-run-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sessionBoundedReportPath = readFlag(args, '--session-bounded-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-session-bounded-profit-validation-\d+\.json$/);
  const selectorMethodKey = readFlag(args, '--selector-method-key') || DEFAULT_SELECTOR_KEY;
  const staleMinutes = Number(readFlag(args, '--stale-minutes') || DEFAULT_STALE_MINUTES);
  const collisionWindowMinutes = Number(readFlag(args, '--collision-window-minutes') || DEFAULT_COLLISION_WINDOW_MINUTES);
  const report = buildUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport({
    sessionBoundedReportPath,
    sessionBoundedReport: readJson<SessionBoundedReport>(sessionBoundedReportPath),
    selectorMethodKey,
    staleMinutes,
    collisionWindowMinutes,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewScannerOwnedSelectorDryRunContractCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
