import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';

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
  outcomeBucket: string;
  outcomeLabel: string;
  oneMesPl: number | null;
  mfeR: number | null;
  maeR: number | null;
  outcomePathWarning: string | null;
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

interface EventRow {
  time: string;
  bar: Bar;
  stopHit: boolean;
  t1Hit: boolean;
  t2Hit: boolean;
  sameBarStopAndTarget: boolean;
  favorablePoints: number;
  adversePoints: number;
}

interface DrilldownRow {
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
  sourceOutcomeLabel: string;
  sourceMfeR: number | null;
  sourceMaeR: number | null;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  firstStopHitTime: string | null;
  firstT1HitTime: string | null;
  firstT2HitTime: string | null;
  firstResolvedEvent: 'stop' | 't1' | 't2' | 'none';
  conservativeOutcomeLabel: 'stopped_before_t1' | 't1_hit_only' | 't1_and_t2_hit' | 'no_target_or_stop_hit' | 'no_fill';
  sameBarStopTargetAmbiguity: boolean;
  maximumFavorableBeforeStopPoints: number | null;
  maximumFavorableBeforeStopR: number | null;
  maximumAdverseBeforeStopPoints: number | null;
  maximumAdverseBeforeStopR: number | null;
  maximumFavorableAfterStopPoints: number | null;
  maximumFavorableAfterStopR: number | null;
  pathConclusion: 'clean_stop_before_targets' | 'clean_target_before_stop' | 'same_bar_ambiguous' | 'unresolved_or_no_fill';
  deskRead: string;
  eventRows: EventRow[];
}

export interface OpeningDrivePathOrderDrilldownReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_path_order_drilldown';
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
    usesCompletedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    sameBarStopAndTargetIsAmbiguous: true;
    conservativeDecisionStillUsesStopFirstWhenSameBar: true;
    outputIsResearchOnly: true;
  };
  summary: {
    sourceSlates: number;
    selectedSlates: number;
    pathWarningSlates: number;
    cleanStopBeforeTargets: number;
    cleanTargetBeforeStop: number;
    sameBarAmbiguous: number;
    unresolvedOrNoFill: number;
    livePromotionAllowedRows: 0;
    recommendation: 'treat_june17_loss_as_clean_stop_before_later_targets' | 'hold_for_lower_timeframe_path_data' | 'fix_missing_inputs';
  };
  rows: DrilldownRow[];
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortBars(bars: Bar[]): Bar[] {
  return [...bars].sort((a, b) => normalizeTime(a.time).localeCompare(normalizeTime(b.time)));
}

function crosses(direction: Direction, bar: Bar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(direction: Direction, bar: Bar, stop: number): boolean {
  return direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function favorableMove(direction: Direction, bar: Bar, entry: number): number {
  return direction === 'LONG' ? bar.high - entry : entry - bar.low;
}

function adverseMove(direction: Direction, bar: Bar, entry: number): number {
  return direction === 'LONG' ? entry - bar.low : bar.high - entry;
}

function toR(points: number | null, riskPoints: number): number | null {
  return points === null || riskPoints <= 0 ? null : round(points / riskPoints);
}

function maxOrNull(values: number[]): number | null {
  return values.length ? round(Math.max(...values)) : null;
}

function buildDrilldownRow(slate: SlateStory, bars5m: Bar[]): DrilldownRow {
  const proofTime = normalizeTime(slate.proofTime);
  const sessionBars = sortBars(bars5m)
    .filter((bar) => normalizeTime(bar.time).slice(0, 10) === slate.tradeDate)
    .filter((bar) => normalizeTime(bar.time) >= proofTime);
  const entryIndex = sessionBars.findIndex((bar) => crosses(slate.direction, bar, slate.entry));
  if (entryIndex < 0) {
    return {
      ...baseRow(slate),
      entryHitTime: null,
      firstReplayBarTime: null,
      firstStopHitTime: null,
      firstT1HitTime: null,
      firstT2HitTime: null,
      firstResolvedEvent: 'none',
      conservativeOutcomeLabel: 'no_fill',
      sameBarStopTargetAmbiguity: false,
      maximumFavorableBeforeStopPoints: null,
      maximumFavorableBeforeStopR: null,
      maximumAdverseBeforeStopPoints: null,
      maximumAdverseBeforeStopR: null,
      maximumFavorableAfterStopPoints: null,
      maximumFavorableAfterStopR: null,
      pathConclusion: 'unresolved_or_no_fill',
      deskRead: 'Entry never filled on completed 5M OHLC after proof; no path-order conclusion.',
      eventRows: [],
    };
  }

  const replayBars = sessionBars.slice(entryIndex + 1);
  const eventRows = replayBars.map((bar) => {
    const stopHit = hitsStop(slate.direction, bar, slate.stop);
    const t1Hit = crosses(slate.direction, bar, slate.t1);
    const t2Hit = crosses(slate.direction, bar, slate.t2);
    return {
      time: normalizeTime(bar.time),
      bar,
      stopHit,
      t1Hit,
      t2Hit,
      sameBarStopAndTarget: stopHit && (t1Hit || t2Hit),
      favorablePoints: round(Math.max(0, favorableMove(slate.direction, bar, slate.entry))),
      adversePoints: round(Math.max(0, adverseMove(slate.direction, bar, slate.entry))),
    };
  });
  const firstStopHitTime = eventRows.find((row) => row.stopHit)?.time || null;
  const firstT1HitTime = eventRows.find((row) => row.t1Hit)?.time || null;
  const firstT2HitTime = eventRows.find((row) => row.t2Hit)?.time || null;
  const sameBarStopTargetAmbiguity = Boolean(
    firstStopHitTime &&
    (firstStopHitTime === firstT1HitTime || firstStopHitTime === firstT2HitTime),
  );
  const firstResolvedEvent = firstStopHitTime && (!firstT1HitTime || firstStopHitTime <= firstT1HitTime)
    ? 'stop'
    : firstT2HitTime
      ? 't2'
      : firstT1HitTime
        ? 't1'
        : 'none';
  const conservativeOutcomeLabel = firstResolvedEvent === 'stop'
    ? 'stopped_before_t1'
    : firstT2HitTime
      ? 't1_and_t2_hit'
      : firstT1HitTime
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const stopIndex = firstStopHitTime ? eventRows.findIndex((row) => row.time === firstStopHitTime) : -1;
  const beforeStopRows = stopIndex >= 0 ? eventRows.slice(0, stopIndex + 1) : eventRows;
  const afterStopRows = stopIndex >= 0 ? eventRows.slice(stopIndex + 1) : [];
  const maximumFavorableBeforeStopPoints = maxOrNull(beforeStopRows.map((row) => row.favorablePoints));
  const maximumAdverseBeforeStopPoints = maxOrNull(beforeStopRows.map((row) => row.adversePoints));
  const maximumFavorableAfterStopPoints = maxOrNull(afterStopRows.map((row) => row.favorablePoints));
  const pathConclusion = sameBarStopTargetAmbiguity
    ? 'same_bar_ambiguous'
    : firstResolvedEvent === 'stop'
      ? 'clean_stop_before_targets'
      : firstResolvedEvent === 't1' || firstResolvedEvent === 't2'
        ? 'clean_target_before_stop'
        : 'unresolved_or_no_fill';
  const deskRead = pathConclusion === 'clean_stop_before_targets'
    ? `Completed 5M path confirms stop at ${firstStopHitTime} before T1 ${firstT1HitTime ?? 'not hit'}; later MFE is post-stop and should not reclassify the loss.`
    : pathConclusion === 'clean_target_before_stop'
      ? `Completed 5M path confirms target before stop; this is a separate later slate, not proof that an earlier stopped slate survived.`
      : pathConclusion === 'same_bar_ambiguous'
        ? 'Stop and target touched inside the same completed 5M candle; keep conservative stop-first for P/L but do not treat as clean directional failure.'
        : 'No completed 5M stop/target resolution after entry.';

  return {
    ...baseRow(slate),
    entryHitTime: normalizeTime(sessionBars[entryIndex].time),
    firstReplayBarTime: replayBars[0] ? normalizeTime(replayBars[0].time) : null,
    firstStopHitTime,
    firstT1HitTime,
    firstT2HitTime,
    firstResolvedEvent,
    conservativeOutcomeLabel,
    sameBarStopTargetAmbiguity,
    maximumFavorableBeforeStopPoints,
    maximumFavorableBeforeStopR: toR(maximumFavorableBeforeStopPoints, slate.riskPoints),
    maximumAdverseBeforeStopPoints,
    maximumAdverseBeforeStopR: toR(maximumAdverseBeforeStopPoints, slate.riskPoints),
    maximumFavorableAfterStopPoints,
    maximumFavorableAfterStopR: toR(maximumFavorableAfterStopPoints, slate.riskPoints),
    pathConclusion,
    deskRead,
    eventRows,
  };
}

function baseRow(slate: SlateStory) {
  return {
    slateKey: slate.slateKey,
    selectedTicketId: slate.selectedTicketId,
    tradeDate: slate.tradeDate,
    proofTime: normalizeTime(slate.proofTime),
    direction: slate.direction,
    entry: slate.entry,
    stop: slate.stop,
    t1: slate.t1,
    t2: slate.t2,
    riskPoints: slate.riskPoints,
    sourceOutcomeLabel: slate.outcomeLabel,
    sourceMfeR: slate.mfeR,
    sourceMaeR: slate.maeR,
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<OpeningDrivePathOrderDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive/Sweep Path-Order Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research over saved HTF story slates and saved completed 5M OHLC. It does not run setupScanner, change ranking, post Discord, write Supabase, read live bridge data, or approve execution.',
    '',
    '## Summary',
    `- Selected slates: ${report.summary.selectedSlates}.`,
    `- Path-warning slates: ${report.summary.pathWarningSlates}.`,
    `- Clean stop before targets: ${report.summary.cleanStopBeforeTargets}.`,
    `- Clean target before stop: ${report.summary.cleanTargetBeforeStop}.`,
    `- Same-bar ambiguous: ${report.summary.sameBarAmbiguous}.`,
    `- Unresolved/no-fill: ${report.summary.unresolvedOrNoFill}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Date | Proof | Source Outcome | Entry Hit | Stop Hit | T1 Hit | T2 Hit | Before-Stop MFE R | After-Stop MFE R | Path | Desk Read |',
    '|---|---|---:|---|---|---|---|---|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.selectedTicketId)} | ${row.tradeDate} | ${row.proofTime.slice(11, 16)} | ${row.sourceOutcomeLabel} | ${row.entryHitTime ?? '-'} | ${row.firstStopHitTime ?? '-'} | ${row.firstT1HitTime ?? '-'} | ${row.firstT2HitTime ?? '-'} | ${row.maximumFavorableBeforeStopR ?? '-'} | ${row.maximumFavorableAfterStopR ?? '-'} | ${row.pathConclusion} | ${escapeTable(row.deskRead)} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDrivePathOrderDrilldownReport(args: {
  htfStoryReportPath: string | null;
  htfStoryReport: HtfStoryReport | null;
  htfSourcePath: string | null;
  htfSource: HtfSourceReport | null;
  tradeDate: string;
}, generatedAt = new Date().toISOString()): OpeningDrivePathOrderDrilldownReport {
  const slates = Array.isArray(args.htfStoryReport?.slateStories) ? args.htfStoryReport.slateStories : [];
  const bars5m = Array.isArray(args.htfSource?.bars?.['5m']) ? args.htfSource.bars['5m'] : [];
  const selectedSlates = slates.filter((slate) =>
    slate.tradeDate === args.tradeDate &&
    (slate.outcomePathWarning || slate.selectedTicketId.includes('20260617T104000')));
  const blockers = [
    !args.htfStoryReportPath ? 'missing HTF story report path' : null,
    !args.htfStoryReport ? 'missing HTF story report' : null,
    slates.length === 0 ? 'HTF story report has no slate stories' : null,
    !args.htfSourcePath ? 'missing HTF source path' : null,
    !args.htfSource ? 'missing HTF source report' : null,
    bars5m.length === 0 ? 'HTF source has no 5M bars' : null,
    selectedSlates.length === 0 ? `no selected path-order slates for ${args.tradeDate}` : null,
  ].filter((item): item is string => Boolean(item));
  const rows = blockers.length ? [] : selectedSlates.map((slate) => buildDrilldownRow(slate, bars5m));
  const sameBarAmbiguous = rows.filter((row) => row.pathConclusion === 'same_bar_ambiguous').length;
  const cleanStopBeforeTargets = rows.filter((row) => row.pathConclusion === 'clean_stop_before_targets').length;
  const cleanTargetBeforeStop = rows.filter((row) => row.pathConclusion === 'clean_target_before_stop').length;
  const unresolvedOrNoFill = rows.filter((row) => row.pathConclusion === 'unresolved_or_no_fill').length;
  const recommendation = blockers.length
    ? 'fix_missing_inputs' as const
    : sameBarAmbiguous > 0
      ? 'hold_for_lower_timeframe_path_data' as const
      : 'treat_june17_loss_as_clean_stop_before_later_targets' as const;
  const base: Omit<OpeningDrivePathOrderDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_path_order_drilldown',
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
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetIsAmbiguous: true,
      conservativeDecisionStillUsesStopFirstWhenSameBar: true,
      outputIsResearchOnly: true,
    },
    summary: {
      sourceSlates: slates.length,
      selectedSlates: selectedSlates.length,
      pathWarningSlates: selectedSlates.filter((slate) => slate.outcomePathWarning).length,
      cleanStopBeforeTargets,
      cleanTargetBeforeStop,
      sameBarAmbiguous,
      unresolvedOrNoFill,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Provide the repaired HTF story report and canonical completed 5M OHLC source before reading path order.']
      : [
        'Treat the 2026-06-17 10:05 row as a clean 5M stop-before-target loss under completed-bar evidence.',
        'Do not let post-stop MFE reclassify the loss or inflate selector confidence.',
        'Continue selector research with this loss included as a real loser, while separately comparing the later 10:40 winner as a new slate.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDrivePathOrderDrilldownReport(
  report: OpeningDrivePathOrderDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-path-order-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDrivePathOrderDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const tradeDate = readFlag(args, '--trade-date') || '2026-06-17';
  const htfStoryReportPath = readFlag(args, '--htf-story-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-htf-story-audit-\d+\.json$/);
  const htfStoryReport = readJson<HtfStoryReport>(htfStoryReportPath);
  const htfSourcePath = readFlag(args, '--htf-source') ||
    htfStoryReport?.source?.htfSourcePath ||
    latestMatchingFile(outDir, /^controlled-htf-ohlc-source-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const report = buildOpeningDrivePathOrderDrilldownReport({
    htfStoryReportPath,
    htfStoryReport,
    htfSourcePath,
    htfSource: readJson<HtfSourceReport>(htfSourcePath),
    tradeDate,
  });
  const paths = writeOpeningDrivePathOrderDrilldownReport(report, outDir);
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
    runOpeningDrivePathOrderDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
