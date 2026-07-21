import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SlateStory {
  slateKey: string;
  selectedTicketId: string;
  tradeDate: string;
  proofTime: string;
  direction: Direction;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: string;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  sweepCollision: boolean;
  storyVerdict: 'supported_short' | 'mixed_short' | 'caution_short' | 'data_limited';
  tactical15m60mContextVerdict: string;
}

interface HtfStoryReport {
  reportType?: string;
  source?: {
    htfSourcePath?: string | null;
  };
  slateStories?: SlateStory[];
}

interface HtfSourceReport {
  reportType?: string;
  bars?: {
    '5m'?: Bar[];
  };
}

interface TimingRow {
  noFillTicketId: string;
  tradeDate: string;
  noFillProofTime: string;
  noFillEntry: number;
  noFillStop: number;
  noFillT1: number;
  noFillT2: number;
  noFillRiskPoints: number;
  noFillStoryVerdict: string;
  originalEntryHitAfterProof: boolean;
  originalEntryFirstHitTime: string | null;
  laterSlateCount: number;
  laterFilledSlateCount: number;
  laterResolvedSlateCount: number;
  laterWinnerSlateCount: number;
  firstLaterFilledTicketId: string | null;
  firstLaterFilledProofTime: string | null;
  firstLaterFilledEntry: number | null;
  firstLaterFilledRiskPoints: number | null;
  firstLaterFilledOutcomeLabel: string | null;
  firstLaterFilledOneMesPl: number | null;
  firstLaterWinnerTicketId: string | null;
  firstLaterWinnerProofTime: string | null;
  firstLaterWinnerEntry: number | null;
  firstLaterWinnerRiskPoints: number | null;
  firstLaterWinnerOneMesPl: number | null;
  minutesToFirstLaterFill: number | null;
  minutesToFirstLaterWinner: number | null;
  entryDeltaToFirstLaterWinner: number | null;
  riskDeltaToFirstLaterWinner: number | null;
  timingClassification: 'wait_for_later_reentry_helped' | 'no_later_entry_help' | 'original_entry_later_traded' | 'ambiguous_later_fill_only';
  deskRead: string;
}

interface GroupSummary {
  key: string;
  rows: number;
  laterWinnerRows: number;
  originalEntryLaterTradedRows: number;
  averageMinutesToFirstLaterWinner: number | null;
  averageEntryDeltaToFirstLaterWinner: number | null;
  averageRiskDeltaToFirstLaterWinner: number | null;
  laterWinnerOneMesPl: number | null;
}

export interface OpeningDriveNoFillTimingAuditReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_no_fill_timing_audit';
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
    livePromotionAllowed: false;
  };
  source: {
    htfStoryReportPath: string | null;
    htfSourcePath: string | null;
  };
  assumptions: {
    sameDateOnly: true;
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    laterRowsAreResearchEvidenceOnly: true;
    outputIsResearchOnly: true;
  };
  summary: {
    sourceSlates: number;
    noFillRows: number;
    noFillRowsWithLaterWinner: number;
    noFillRowsWithOriginalEntryLaterTraded: number;
    noFillRowsWithoutLaterHelp: number;
    laterWinnerOneMesPl: number | null;
    averageMinutesToFirstLaterWinner: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'advance_later_reentry_proof_selector_contract' | 'do_not_use_no_fill_timing_until_more_evidence' | 'fix_missing_inputs';
  };
  groups: GroupSummary[];
  rows: TimingRow[];
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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeTime(value: string): string {
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string): number {
  const parsed = Date.parse(normalizeTime(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function minutesBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const diff = (timeMs(to) - timeMs(from)) / 60000;
  return Number.isFinite(diff) ? Math.round(diff * 100) / 100 : null;
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

function levelTraded(bar: Bar, level: number): boolean {
  return bar.low <= level && bar.high >= level;
}

function barsForDateAfter(bars: Bar[], tradeDate: string, proofTime: string): Bar[] {
  const proof = timeMs(proofTime);
  return [...bars]
    .filter((bar) => normalizeTime(bar.time).slice(0, 10) === tradeDate)
    .filter((bar) => timeMs(bar.time) >= proof)
    .sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function firstEntryHitTime(row: Pick<SlateStory, 'direction' | 'entry' | 'tradeDate' | 'proofTime'>, bars5m: Bar[]): string | null {
  const hit = barsForDateAfter(bars5m, row.tradeDate, row.proofTime).find((bar) => levelTraded(bar, row.entry));
  return hit ? normalizeTime(hit.time) : null;
}

function buildTimingRow(noFill: SlateStory, allRows: SlateStory[], bars5m: Bar[]): TimingRow {
  const laterSlates = allRows
    .filter((row) => row.tradeDate === noFill.tradeDate)
    .filter((row) => row.direction === noFill.direction && row.sweepCollision)
    .filter((row) => timeMs(row.proofTime) > timeMs(noFill.proofTime))
    .sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
  const laterFilled = laterSlates.filter((row) => row.outcomeLabel !== 'no_fill');
  const laterResolved = laterFilled.filter((row) => row.outcomeBucket === 'winner' || row.outcomeBucket === 'loss');
  const laterWinners = laterFilled.filter((row) => row.outcomeBucket === 'winner');
  const firstLaterFilled = laterFilled[0] || null;
  const firstLaterWinner = laterWinners[0] || null;
  const originalEntryFirstHitTime = firstEntryHitTime(noFill, bars5m);
  const originalEntryHitAfterProof = Boolean(originalEntryFirstHitTime);
  const timingClassification = originalEntryHitAfterProof
    ? 'original_entry_later_traded'
    : firstLaterWinner
      ? 'wait_for_later_reentry_helped'
      : firstLaterFilled
        ? 'ambiguous_later_fill_only'
        : 'no_later_entry_help';
  const deskRead = timingClassification === 'wait_for_later_reentry_helped'
    ? 'First proof did not fill; later same-date proof created the tradable winning slate. Treat this as timing/re-entry evidence, not a failed direction.'
    : timingClassification === 'original_entry_later_traded'
      ? 'Original entry later traded on completed 5M OHLC, so no-fill status needs deeper source/timing review before selector use.'
      : timingClassification === 'ambiguous_later_fill_only'
        ? 'Later same-date slate filled but did not produce a winning outcome; timing helped fill quality but not proven edge.'
        : 'No later same-date filled slate was available; do not promote this no-fill pattern.';
  return {
    noFillTicketId: noFill.selectedTicketId,
    tradeDate: noFill.tradeDate,
    noFillProofTime: normalizeTime(noFill.proofTime),
    noFillEntry: noFill.entry,
    noFillStop: noFill.stop,
    noFillT1: noFill.t1,
    noFillT2: noFill.t2,
    noFillRiskPoints: noFill.riskPoints,
    noFillStoryVerdict: noFill.storyVerdict,
    originalEntryHitAfterProof,
    originalEntryFirstHitTime,
    laterSlateCount: laterSlates.length,
    laterFilledSlateCount: laterFilled.length,
    laterResolvedSlateCount: laterResolved.length,
    laterWinnerSlateCount: laterWinners.length,
    firstLaterFilledTicketId: firstLaterFilled?.selectedTicketId || null,
    firstLaterFilledProofTime: firstLaterFilled ? normalizeTime(firstLaterFilled.proofTime) : null,
    firstLaterFilledEntry: firstLaterFilled?.entry ?? null,
    firstLaterFilledRiskPoints: firstLaterFilled?.riskPoints ?? null,
    firstLaterFilledOutcomeLabel: firstLaterFilled?.outcomeLabel || null,
    firstLaterFilledOneMesPl: firstLaterFilled?.oneMesPl ?? null,
    firstLaterWinnerTicketId: firstLaterWinner?.selectedTicketId || null,
    firstLaterWinnerProofTime: firstLaterWinner ? normalizeTime(firstLaterWinner.proofTime) : null,
    firstLaterWinnerEntry: firstLaterWinner?.entry ?? null,
    firstLaterWinnerRiskPoints: firstLaterWinner?.riskPoints ?? null,
    firstLaterWinnerOneMesPl: firstLaterWinner?.oneMesPl ?? null,
    minutesToFirstLaterFill: minutesBetween(noFill.proofTime, firstLaterFilled?.proofTime || null),
    minutesToFirstLaterWinner: minutesBetween(noFill.proofTime, firstLaterWinner?.proofTime || null),
    entryDeltaToFirstLaterWinner: firstLaterWinner ? round(firstLaterWinner.entry - noFill.entry) : null,
    riskDeltaToFirstLaterWinner: firstLaterWinner ? round(firstLaterWinner.riskPoints - noFill.riskPoints) : null,
    timingClassification,
    deskRead,
  };
}

function summarizeGroup(key: string, rows: TimingRow[]): GroupSummary {
  return {
    key,
    rows: rows.length,
    laterWinnerRows: rows.filter((row) => row.laterWinnerSlateCount > 0).length,
    originalEntryLaterTradedRows: rows.filter((row) => row.originalEntryHitAfterProof).length,
    averageMinutesToFirstLaterWinner: avg(rows.map((row) => row.minutesToFirstLaterWinner)),
    averageEntryDeltaToFirstLaterWinner: avg(rows.map((row) => row.entryDeltaToFirstLaterWinner)),
    averageRiskDeltaToFirstLaterWinner: avg(rows.map((row) => row.riskDeltaToFirstLaterWinner)),
    laterWinnerOneMesPl: sum(rows.map((row) => row.firstLaterWinnerOneMesPl)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<OpeningDriveNoFillTimingAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep No-Fill Timing Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved HTF story slates and saved completed 5M OHLC. It does not run setupScanner, change ranking, post Discord, write Supabase, read live bridge data, or approve execution.',
    '',
    '## Summary',
    `- No-fill rows: ${report.summary.noFillRows}.`,
    `- No-fill rows with later winner: ${report.summary.noFillRowsWithLaterWinner}.`,
    `- No-fill rows where original entry later traded: ${report.summary.noFillRowsWithOriginalEntryLaterTraded}.`,
    `- No-fill rows without later help: ${report.summary.noFillRowsWithoutLaterHelp}.`,
    `- Later winner first-match P/L: ${report.summary.laterWinnerOneMesPl ?? '-'}.`,
    `- Avg minutes to first later winner: ${report.summary.averageMinutesToFirstLaterWinner ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Group | Rows | Later Winner Rows | Original Entry Later Traded | Avg Min To Winner | Avg Entry Delta | Avg Risk Delta | Later Winner P/L |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...report.groups.map((row) => `| ${row.key} | ${row.rows} | ${row.laterWinnerRows} | ${row.originalEntryLaterTradedRows} | ${row.averageMinutesToFirstLaterWinner ?? '-'} | ${row.averageEntryDeltaToFirstLaterWinner ?? '-'} | ${row.averageRiskDeltaToFirstLaterWinner ?? '-'} | ${row.laterWinnerOneMesPl ?? '-'} |`),
    '',
    '## Rows',
    '| No-Fill Ticket | Date | Proof | Entry | Risk | Original Entry Hit | Later Winner | Min To Winner | Entry Delta | Risk Delta | Classification | Desk Read |',
    '|---|---|---:|---:|---:|---|---|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.noFillTicketId)} | ${row.tradeDate} | ${row.noFillProofTime.slice(11, 16)} | ${row.noFillEntry} | ${row.noFillRiskPoints} | ${row.originalEntryFirstHitTime ?? '-'} | ${row.firstLaterWinnerTicketId ? escapeTable(row.firstLaterWinnerTicketId) : '-'} | ${row.minutesToFirstLaterWinner ?? '-'} | ${row.entryDeltaToFirstLaterWinner ?? '-'} | ${row.riskDeltaToFirstLaterWinner ?? '-'} | ${row.timingClassification} | ${escapeTable(row.deskRead)} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveNoFillTimingAuditReport(args: {
  htfStoryReportPath: string | null;
  htfStoryReport: HtfStoryReport | null;
  htfSourcePath: string | null;
  htfSource: HtfSourceReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveNoFillTimingAuditReport {
  const slates = Array.isArray(args.htfStoryReport?.slateStories) ? args.htfStoryReport.slateStories : [];
  const bars5m = Array.isArray(args.htfSource?.bars?.['5m']) ? args.htfSource.bars['5m'] : [];
  const targetSlates = slates.filter((row) => row.direction === 'SHORT' && row.sweepCollision);
  const noFillRows = targetSlates.filter((row) => row.outcomeLabel === 'no_fill');
  const blockers = [
    !args.htfStoryReportPath ? 'missing HTF story report path' : null,
    !args.htfStoryReport ? 'missing HTF story report' : null,
    slates.length === 0 ? 'HTF story report has no slate stories' : null,
    !args.htfSourcePath ? 'missing HTF source path' : null,
    !args.htfSource ? 'missing HTF source report' : null,
    bars5m.length === 0 ? 'HTF source has no 5M bars' : null,
  ].filter((item): item is string => Boolean(item));
  const rows = blockers.length ? [] : noFillRows.map((row) => buildTimingRow(row, targetSlates, bars5m));
  const groups = [
    summarizeGroup('all_no_fill', rows),
    summarizeGroup('wait_for_later_reentry_helped', rows.filter((row) => row.timingClassification === 'wait_for_later_reentry_helped')),
    summarizeGroup('original_entry_later_traded', rows.filter((row) => row.timingClassification === 'original_entry_later_traded')),
    summarizeGroup('no_later_entry_help', rows.filter((row) => row.timingClassification === 'no_later_entry_help')),
    summarizeGroup('ambiguous_later_fill_only', rows.filter((row) => row.timingClassification === 'ambiguous_later_fill_only')),
  ].filter((row) => row.rows > 0 || row.key === 'all_no_fill');
  const noFillRowsWithLaterWinner = rows.filter((row) => row.laterWinnerSlateCount > 0).length;
  const recommendation = blockers.length
    ? 'fix_missing_inputs' as const
    : noFillRowsWithLaterWinner > 0 && rows.every((row) => !row.originalEntryHitAfterProof)
      ? 'advance_later_reentry_proof_selector_contract' as const
      : 'do_not_use_no_fill_timing_until_more_evidence' as const;
  const base: Omit<OpeningDriveNoFillTimingAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_no_fill_timing_audit',
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
      changesBridgeBehavior: false,
      changesDiscordPosting: false,
      changesAppRuntime: false,
      livePromotionAllowed: false,
    },
    source: {
      htfStoryReportPath: args.htfStoryReportPath,
      htfSourcePath: args.htfSourcePath,
    },
    assumptions: {
      sameDateOnly: true,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      laterRowsAreResearchEvidenceOnly: true,
      outputIsResearchOnly: true,
    },
    summary: {
      sourceSlates: slates.length,
      noFillRows: rows.length,
      noFillRowsWithLaterWinner,
      noFillRowsWithOriginalEntryLaterTraded: rows.filter((row) => row.originalEntryHitAfterProof).length,
      noFillRowsWithoutLaterHelp: rows.filter((row) => row.timingClassification === 'no_later_entry_help').length,
      laterWinnerOneMesPl: sum(rows.map((row) => row.firstLaterWinnerOneMesPl)),
      averageMinutesToFirstLaterWinner: avg(rows.map((row) => row.minutesToFirstLaterWinner)),
      livePromotionAllowedRows: 0,
      recommendation,
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Provide the repaired HTF story report and canonical completed 5M OHLC source before reading no-fill timing.']
      : [
        'Do not treat first-proof no-fill rows as failed direction.',
        'If later same-date proof wins while original entry never trades, model the next selector proposal as a later re-entry proof contract, not a boost to first proof.',
        'Keep all output research-only until a scanner-owned dry-run proves one ticket per later proof slate.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveNoFillTimingAuditReport(
  report: OpeningDriveNoFillTimingAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-no-fill-timing-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveNoFillTimingAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const htfStoryReportPath = readFlag(args, '--htf-story-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-htf-story-audit-\d+\.json$/);
  const htfStoryReport = readJson<HtfStoryReport>(htfStoryReportPath);
  const htfSourcePath = readFlag(args, '--htf-source') ||
    htfStoryReport?.source?.htfSourcePath ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildOpeningDriveNoFillTimingAuditReport({
    htfStoryReportPath,
    htfStoryReport,
    htfSourcePath,
    htfSource: readJson<HtfSourceReport>(htfSourcePath),
  });
  const paths = writeOpeningDriveNoFillTimingAuditReport(report, outDir);
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
    runOpeningDriveNoFillTimingAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
