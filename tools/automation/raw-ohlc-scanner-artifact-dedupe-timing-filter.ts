import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';

type OutcomeRow = UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow;
type TimingDecision =
  | 'selected_campaign_lead'
  | 'excluded_same_bar_entry'
  | 'excluded_duplicate_campaign_row'
  | 'isolated_stale_sweep'
  | 'blocked_or_unresolved';

interface CliOptions {
  replayPackageOutcome: string;
  outDir: string;
  json: boolean;
  allowSameBarModels: Set<string>;
}

interface CampaignSummary {
  campaignId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  rows: number;
  selectedRows: number;
  sameBarExcludedRows: number;
  duplicateCampaignRows: number;
  staleSweepIsolatedRows: number;
  unresolvedOrBlockedRows: number;
  grossSelectedOneMesPl: number | null;
  firstProofTime: string;
  lastProofTime: string;
  selectedTicketId: string | null;
}

export interface RawOhlcScannerArtifactDedupeTimingFilterRow {
  ticketId: string;
  campaignId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeLabel: OutcomeRow['outcomeLabel'];
  outcomeStatus: OutcomeRow['outcomeStatus'];
  resolvedOneMesPl: number | null;
  proofTime: string;
  entryHitTime: string | null;
  proofToEntryMinutes: number | null;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  timingDecision: TimingDecision;
  decisionReasons: string[];
}

export interface RawOhlcScannerArtifactDedupeTimingFilterReport {
  reportType: 'raw_ohlc_scanner_artifact_dedupe_timing_filter';
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
    replayPackageOutcomePath: string | null;
  };
  assumptions: {
    oneMesPointValue: 5;
    campaignKeyUsesExactModelDirectionAndLevels: true;
    sameBarEntriesAreExcludedUnlessModelAllowlisted: true;
    staleSweepThresholdMinutes: 30;
    staleSweepRowsAreIsolatedNotRejected: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputRows: number;
    campaigns: number;
    selectedCampaignRows: number;
    sameBarExcludedRows: number;
    duplicateCampaignRows: number;
    staleSweepIsolatedRows: number;
    unresolvedOrBlockedRows: number;
    selectedWinners: number;
    selectedLosses: number;
    selectedUnresolved: number;
    grossSelectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
  };
  campaignSummaries: CampaignSummary[];
  rows: RawOhlcScannerArtifactDedupeTimingFilterRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const STALE_SWEEP_THRESHOLD_MINUTES = 30;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readMultiFlag(args: string[], flag: string): string[] {
  return args.flatMap((arg, index) => {
    if (arg === flag && args[index + 1] && !args[index + 1].startsWith('--')) return [args[index + 1]];
    const prefix = `${flag}=`;
    return arg.startsWith(prefix) ? [arg.slice(prefix.length)] : [];
  });
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

export function parseRawOhlcScannerArtifactDedupeTimingFilterArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const replayPackageOutcome = readFlag(args, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  if (!replayPackageOutcome) throw new Error('--replay-package-outcome is required.');
  return {
    replayPackageOutcome,
    outDir,
    json: args.includes('--json'),
    allowSameBarModels: new Set(readMultiFlag(args, '--allow-same-bar-model')),
  };
}

function authority(): RawOhlcScannerArtifactDedupeTimingFilterReport['authority'] {
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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function proofToEntryMinutes(row: OutcomeRow): number | null {
  if (!row.entryHitTime) return null;
  const minutes = (timeMs(row.entryHitTime) - timeMs(row.proofTime)) / 60000;
  return Number.isFinite(minutes) ? round(minutes) : null;
}

function levelKey(value: number): string {
  return value.toFixed(2);
}

function baseCampaignKey(row: OutcomeRow): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    levelKey(row.entry),
    levelKey(row.stop),
    levelKey(row.t1),
    levelKey(row.t2),
  ].join('|');
}

function buildCampaignIds(rows: OutcomeRow[]): Map<string, string> {
  const sorted = [...rows].sort((a, b) => `${baseCampaignKey(a)}|${a.proofTime}`.localeCompare(`${baseCampaignKey(b)}|${b.proofTime}`));
  const counters = new Map<string, number>();
  const lastTimeByBase = new Map<string, string>();
  const ids = new Map<string, string>();
  for (const row of sorted) {
    const base = baseCampaignKey(row);
    const lastTime = lastTimeByBase.get(base);
    if (!lastTime || timeMs(row.proofTime) - timeMs(lastTime) > STALE_SWEEP_THRESHOLD_MINUTES * 60000) {
      counters.set(base, (counters.get(base) || 0) + 1);
    }
    lastTimeByBase.set(base, row.proofTime);
    ids.set(row.ticketId, `${base}|campaign-${counters.get(base) || 1}`);
  }
  return ids;
}

function isFullDelivery(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function rowDecision(row: OutcomeRow, minutes: number | null, allowSameBarModels: Set<string>): {
  timingDecision: TimingDecision;
  decisionReasons: string[];
} {
  if (row.outcomeStatus !== 'resolved') {
    return { timingDecision: 'blocked_or_unresolved', decisionReasons: [`outcome status ${row.outcomeStatus}`] };
  }
  if (row.setupType === 'SweepMssFvgRetrace' && minutes !== null && minutes > STALE_SWEEP_THRESHOLD_MINUTES) {
    return {
      timingDecision: 'isolated_stale_sweep',
      decisionReasons: [`Sweep proof-to-entry ${minutes}m exceeds ${STALE_SWEEP_THRESHOLD_MINUTES}m research threshold`],
    };
  }
  if (minutes === 0 && !allowSameBarModels.has(row.setupType)) {
    return {
      timingDecision: 'excluded_same_bar_entry',
      decisionReasons: ['same-bar entry is excluded from campaign-level proof unless model is explicitly allowlisted'],
    };
  }
  return { timingDecision: 'selected_campaign_lead', decisionReasons: ['earliest eligible resolved row in campaign'] };
}

function buildRows(args: {
  outcomeRows: OutcomeRow[];
  allowSameBarModels: Set<string>;
}): RawOhlcScannerArtifactDedupeTimingFilterRow[] {
  const campaignIds = buildCampaignIds(args.outcomeRows);
  const rows = args.outcomeRows
    .map((row) => {
      const minutes = proofToEntryMinutes(row);
      const decision = rowDecision(row, minutes, args.allowSameBarModels);
      return {
        ticketId: row.ticketId,
        campaignId: campaignIds.get(row.ticketId) || `${baseCampaignKey(row)}|campaign-1`,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcomeLabel: row.outcomeLabel,
        outcomeStatus: row.outcomeStatus,
        resolvedOneMesPl: row.resolvedOneMesPl,
        proofTime: row.proofTime,
        entryHitTime: row.entryHitTime,
        proofToEntryMinutes: minutes,
        entry: row.entry,
        stop: row.stop,
        t1: row.t1,
        t2: row.t2,
        riskPoints: row.riskPoints,
        timingDecision: decision.timingDecision,
        decisionReasons: decision.decisionReasons,
      };
    })
    .sort((a, b) => `${a.campaignId}|${a.proofTime}|${a.ticketId}`.localeCompare(`${b.campaignId}|${b.proofTime}|${b.ticketId}`));

  const selectedByCampaign = new Set<string>();
  return rows.map((row) => {
    if (row.timingDecision !== 'selected_campaign_lead') return row;
    if (selectedByCampaign.has(row.campaignId)) {
      return {
        ...row,
        timingDecision: 'excluded_duplicate_campaign_row',
        decisionReasons: ['later duplicate row in the same model/direction/level campaign'],
      };
    }
    selectedByCampaign.add(row.campaignId);
    return row;
  });
}

function buildCampaignSummaries(rows: RawOhlcScannerArtifactDedupeTimingFilterRow[]): CampaignSummary[] {
  const grouped = new Map<string, RawOhlcScannerArtifactDedupeTimingFilterRow[]>();
  for (const row of rows) grouped.set(row.campaignId, [...(grouped.get(row.campaignId) || []), row]);
  return [...grouped.entries()]
    .map(([campaignId, campaignRows]) => {
      const selected = campaignRows.filter((row) => row.timingDecision === 'selected_campaign_lead');
      const ordered = [...campaignRows].sort((a, b) => a.proofTime.localeCompare(b.proofTime));
      return {
        campaignId,
        tradeDate: ordered[0].tradeDate,
        session: ordered[0].session,
        setupType: ordered[0].setupType,
        direction: ordered[0].direction,
        rows: campaignRows.length,
        selectedRows: selected.length,
        sameBarExcludedRows: campaignRows.filter((row) => row.timingDecision === 'excluded_same_bar_entry').length,
        duplicateCampaignRows: campaignRows.filter((row) => row.timingDecision === 'excluded_duplicate_campaign_row').length,
        staleSweepIsolatedRows: campaignRows.filter((row) => row.timingDecision === 'isolated_stale_sweep').length,
        unresolvedOrBlockedRows: campaignRows.filter((row) => row.timingDecision === 'blocked_or_unresolved').length,
        grossSelectedOneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
        firstProofTime: ordered[0].proofTime,
        lastProofTime: ordered[ordered.length - 1].proofTime,
        selectedTicketId: selected[0]?.ticketId || null,
      };
    })
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.setupType}-${a.direction}-${a.firstProofTime}`.localeCompare(`${b.tradeDate}-${b.session}-${b.setupType}-${b.direction}-${b.firstProofTime}`));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactDedupeTimingFilterReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Dedupe Timing Filter',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only campaign dedupe/timing filter. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Input rows: ${report.summary.inputRows}.`,
    `- Campaigns: ${report.summary.campaigns}.`,
    `- Selected campaign rows: ${report.summary.selectedCampaignRows}.`,
    `- Same-bar excluded rows: ${report.summary.sameBarExcludedRows}.`,
    `- Duplicate campaign rows: ${report.summary.duplicateCampaignRows}.`,
    `- Stale Sweep isolated rows: ${report.summary.staleSweepIsolatedRows}.`,
    `- Unresolved or blocked rows: ${report.summary.unresolvedOrBlockedRows}.`,
    `- Selected winners/losses/unresolved: ${report.summary.selectedWinners}/${report.summary.selectedLosses}/${report.summary.selectedUnresolved}.`,
    `- Gross selected one-MES P/L: ${report.summary.grossSelectedOneMesPl ?? 'not available'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Campaigns',
    '| Date | Session | Setup | Side | Rows | Selected | Same-Bar Excluded | Duplicate Rows | Stale Sweep | Unresolved/Blocked | Selected P/L | First Proof | Last Proof |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|',
    ...report.campaignSummaries.map((row) => `| ${row.tradeDate} | ${escapeTable(row.session)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.rows} | ${row.selectedRows} | ${row.sameBarExcludedRows} | ${row.duplicateCampaignRows} | ${row.staleSweepIsolatedRows} | ${row.unresolvedOrBlockedRows} | ${row.grossSelectedOneMesPl ?? '-'} | ${row.firstProofTime} | ${row.lastProofTime} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactDedupeTimingFilterReport(args: {
  reportDir: string;
  replayPackageOutcomePath: string | null;
  replayPackageOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
  allowSameBarModels?: Set<string>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactDedupeTimingFilterReport {
  const outcomeRows = args.replayPackageOutcomeReport?.rows || [];
  const rows = buildRows({ outcomeRows, allowSameBarModels: args.allowSameBarModels || new Set() });
  const campaignSummaries = buildCampaignSummaries(rows);
  const selected = rows.filter((row) => row.timingDecision === 'selected_campaign_lead');
  const blockers = [
    !args.replayPackageOutcomePath ? 'missing replay package outcome path' : null,
    !args.replayPackageOutcomeReport ? 'missing replay package outcome report' : null,
    args.replayPackageOutcomeReport && args.replayPackageOutcomeReport.summary.livePromotionAllowedRows !== 0
      ? `outcome report has ${args.replayPackageOutcomeReport.summary.livePromotionAllowedRows} live-promotion rows`
      : null,
    outcomeRows.length === 0 ? 'no outcome rows evaluated' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactDedupeTimingFilterReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_dedupe_timing_filter',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replayPackageOutcomePath: args.replayPackageOutcomePath,
    },
    assumptions: {
      oneMesPointValue: 5,
      campaignKeyUsesExactModelDirectionAndLevels: true,
      sameBarEntriesAreExcludedUnlessModelAllowlisted: true,
      staleSweepThresholdMinutes: STALE_SWEEP_THRESHOLD_MINUTES,
      staleSweepRowsAreIsolatedNotRejected: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputRows: outcomeRows.length,
      campaigns: campaignSummaries.length,
      selectedCampaignRows: selected.length,
      sameBarExcludedRows: rows.filter((row) => row.timingDecision === 'excluded_same_bar_entry').length,
      duplicateCampaignRows: rows.filter((row) => row.timingDecision === 'excluded_duplicate_campaign_row').length,
      staleSweepIsolatedRows: rows.filter((row) => row.timingDecision === 'isolated_stale_sweep').length,
      unresolvedOrBlockedRows: rows.filter((row) => row.timingDecision === 'blocked_or_unresolved').length,
      selectedWinners: selected.filter((row) => row.outcomeLabel === 't1_and_t2_hit').length,
      selectedLosses: selected.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      selectedUnresolved: selected.filter((row) => row.outcomeStatus !== 'resolved').length,
      grossSelectedOneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
      livePromotionAllowedRows: 0,
    },
    campaignSummaries,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use campaign-level findings until the local replay outcome report is complete.']
      : [
        'Use campaign-level selected rows for the next research comparison instead of repeated 5M event rows.',
        'Keep same-bar entries and stale Sweep rows out of live-facing rank decisions until an explicit model-specific timing rule is proven.',
        'No live promotion, Discord posting, Supabase write, canExecute change, or trading-rule change is recommended from this filter alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactDedupeTimingFilterReport(
  report: RawOhlcScannerArtifactDedupeTimingFilterReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-dedupe-timing-filter-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactDedupeTimingFilterCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactDedupeTimingFilterArgs(args);
  const report = buildRawOhlcScannerArtifactDedupeTimingFilterReport({
    reportDir: options.outDir,
    replayPackageOutcomePath: options.replayPackageOutcome,
    replayPackageOutcomeReport: fs.existsSync(options.replayPackageOutcome)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.replayPackageOutcome)
      : null,
    allowSameBarModels: options.allowSameBarModels,
  });
  const paths = writeRawOhlcScannerArtifactDedupeTimingFilterReport(report, options.outDir);
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
    runRawOhlcScannerArtifactDedupeTimingFilterCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
