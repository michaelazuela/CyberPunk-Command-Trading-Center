import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport, RawOhlcScannerArtifactSameBarSeparatorRow } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

type SameBarRow = RawOhlcScannerArtifactSameBarSeparatorRow;
type Selector = 'low_risk_lt_4' | 'tight_long_risk_4_to_8' | 'fine_risk_24_to_32';

interface CliOptions {
  reportDir: string;
  setupType: string;
  json: boolean;
}

interface Authority {
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
}

interface BucketSummary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface ReplayRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  riskPoints: number;
  selector: Selector;
  outcomeLabel: SameBarRow['outcomeLabel'];
  outcomeStatus: SameBarRow['outcomeStatus'];
  oneMesPl: number | null;
  sourceReportPath: string;
}

export interface RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    setupType: string;
    samebarReportPaths: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    openingDriveOnly: true;
    aggregatesSameBarSeparatorReports: true;
    dedupesByTicketId: true;
    oneSelectedRowPerProofEvent: true;
    candidateUsesNoLookaheadFieldsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  selectorPolicy: {
    proofEventKey: 'tradeDate|session|proofTime';
    firstPriority: 'low_risk_lt_4';
    secondPriority: 'tight_long_risk_4_to_8';
    thirdPriority: 'fine_risk_24_to_32';
    tieBreak: 'lowest_risk_points';
    minReadySelectedRows: 5;
  };
  summary: {
    sourceReports: number;
    sourceRows: number;
    dedupedRows: number;
    proofEvents: number;
    selectedRows: number;
    rejectedRows: number;
    collisionEvents: number;
    selectedSummary: BucketSummary;
    rejectedSummary: BucketSummary;
    sampleSizeReady: boolean;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_only_proposal_update' | 'mine_openingdrive_separator' | 'fix_inputs';
  };
  selectorSummaries: Array<BucketSummary & { selector: Selector }>;
  selectedRows: ReplayRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';
const MIN_READY_SELECTED_ROWS = 5;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveFreshReplayPackageArgs(args = process.argv.slice(2)): CliOptions {
  return {
    reportDir: readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(rows: SameBarRow[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function avg(rows: SameBarRow[]): number | null {
  const values = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function isWinner(row: SameBarRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: SameBarRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: SameBarRow[]): BucketSummary {
  return {
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    avgRiskPoints: avg(rows),
  };
}

function riskBucket(row: SameBarRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  return 'risk_gte_16';
}

function fineRiskBucket(row: SameBarRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 6) return 'risk_4_to_6';
  if (row.riskPoints < 8) return 'risk_6_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  if (row.riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function selector(row: SameBarRow): Selector | null {
  if (riskBucket(row) === 'risk_lt_4') return 'low_risk_lt_4';
  if (row.direction.toUpperCase() === 'LONG' && riskBucket(row) === 'risk_4_to_8') return 'tight_long_risk_4_to_8';
  if (fineRiskBucket(row) === 'risk_24_to_32') return 'fine_risk_24_to_32';
  return null;
}

function priority(row: SameBarRow): number {
  const selected = selector(row);
  if (selected === 'low_risk_lt_4') return 1;
  if (selected === 'tight_long_risk_4_to_8') return 2;
  return 3;
}

function proofEventKey(row: SameBarRow): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}`;
}

function loadReports(reportDir: string): Array<{ filePath: string; report: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport }> {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/.test(name))
    .map((name) => {
      const filePath = path.join(reportDir, name);
      return { filePath, report: readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath) };
    })
    .filter((item) => item.report.status === 'pass')
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function dedupe(rows: Array<SameBarRow & { sourceReportPath: string }>): Array<SameBarRow & { sourceReportPath: string }> {
  const byTicket = new Map<string, SameBarRow & { sourceReportPath: string }>();
  for (const row of rows) {
    const existing = byTicket.get(row.ticketId);
    if (!existing || row.sourceReportPath.localeCompare(existing.sourceReportPath) > 0) byTicket.set(row.ticketId, row);
  }
  return [...byTicket.values()].sort((a, b) => `${a.tradeDate}|${a.proofTime}|${a.ticketId}`.localeCompare(`${b.tradeDate}|${b.proofTime}|${b.ticketId}`));
}

function selectRows(rows: Array<SameBarRow & { sourceReportPath: string }>): {
  selectedRows: Array<SameBarRow & { sourceReportPath: string }>;
  rejectedRows: Array<SameBarRow & { sourceReportPath: string }>;
  collisionEvents: number;
} {
  const groups = new Map<string, Array<SameBarRow & { sourceReportPath: string }>>();
  for (const row of rows) groups.set(proofEventKey(row), [...(groups.get(proofEventKey(row)) || []), row]);
  const selectedTicketIds = new Set<string>();
  let collisionEvents = 0;
  for (const groupRows of groups.values()) {
    const matches = groupRows.filter((row) => selector(row));
    if (!matches.length) continue;
    if (matches.length > 1) collisionEvents += 1;
    const [best] = matches.sort((a, b) => priority(a) - priority(b) || a.riskPoints - b.riskPoints || a.ticketId.localeCompare(b.ticketId));
    selectedTicketIds.add(best.ticketId);
  }
  return {
    selectedRows: rows.filter((row) => selectedTicketIds.has(row.ticketId)),
    rejectedRows: rows.filter((row) => !selectedTicketIds.has(row.ticketId)),
    collisionEvents,
  };
}

function toReplayRow(row: SameBarRow & { sourceReportPath: string }): ReplayRow {
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    direction: row.direction,
    riskPoints: row.riskPoints,
    selector: selector(row) || 'fine_risk_24_to_32',
    outcomeLabel: row.outcomeLabel,
    outcomeStatus: row.outcomeStatus,
    oneMesPl: row.resolvedOneMesPl,
    sourceReportPath: row.sourceReportPath,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport, 'markdown'>): string {
  return [
    '# OpeningDrive Fresh Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only fresh replay package. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source reports: ${report.summary.sourceReports}.`,
    `- Source/deduped rows: ${report.summary.sourceRows}/${report.summary.dedupedRows}.`,
    `- Proof events: ${report.summary.proofEvents}.`,
    `- Selected/rejected rows: ${report.summary.selectedRows}/${report.summary.rejectedRows}.`,
    `- Selected W/L/O/U: ${report.summary.selectedSummary.winners}/${report.summary.selectedSummary.losses}/${report.summary.selectedSummary.otherResolved}/${report.summary.selectedSummary.unresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedSummary.oneMesPl ?? '-'}.`,
    `- Rejected losses: ${report.summary.rejectedSummary.losses}.`,
    `- Sample size ready: ${report.summary.sampleSizeReady}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selector Buckets',
    '| Selector | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.selectorSummaries.map((row) => `| ${row.selector} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport(args: {
  reportDir: string;
  setupType: string;
  reports: Array<{ filePath: string; report: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport {
  const sourceRows = args.reports.flatMap((item) =>
    item.report.rows
      .filter((row) => row.setupType === args.setupType)
      .map((row) => ({ ...row, sourceReportPath: item.filePath })),
  );
  const dedupedRows = dedupe(sourceRows);
  const selection = selectRows(dedupedRows);
  const selectedSummary = summarize(selection.selectedRows);
  const rejectedSummary = summarize(selection.rejectedRows);
  const sampleSizeReady = selection.selectedRows.length >= MIN_READY_SELECTED_ROWS;
  const blockers = [
    !args.reports.length ? 'no same-bar separator reports found' : null,
    !sourceRows.length ? `no rows found for ${args.setupType}` : null,
  ].filter((item): item is string => Boolean(item));
  const ready = !blockers.length && sampleSizeReady && selectedSummary.losses === 0 && (selectedSummary.oneMesPl ?? 0) > 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      setupType: args.setupType,
      samebarReportPaths: args.reports.map((item) => item.filePath),
    },
    assumptions: {
      savedReportsOnly: true,
      openingDriveOnly: true,
      aggregatesSameBarSeparatorReports: true,
      dedupesByTicketId: true,
      oneSelectedRowPerProofEvent: true,
      candidateUsesNoLookaheadFieldsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    selectorPolicy: {
      proofEventKey: 'tradeDate|session|proofTime',
      firstPriority: 'low_risk_lt_4',
      secondPriority: 'tight_long_risk_4_to_8',
      thirdPriority: 'fine_risk_24_to_32',
      tieBreak: 'lowest_risk_points',
      minReadySelectedRows: MIN_READY_SELECTED_ROWS,
    },
    summary: {
      sourceReports: args.reports.length,
      sourceRows: sourceRows.length,
      dedupedRows: dedupedRows.length,
      proofEvents: new Set(dedupedRows.map(proofEventKey)).size,
      selectedRows: selection.selectedRows.length,
      rejectedRows: selection.rejectedRows.length,
      collisionEvents: selection.collisionEvents,
      selectedSummary,
      rejectedSummary,
      sampleSizeReady,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : ready ? 'prepare_research_only_proposal_update' : 'mine_openingdrive_separator',
    },
    selectorSummaries: (['low_risk_lt_4', 'tight_long_risk_4_to_8', 'fine_risk_24_to_32'] as Selector[]).map((item) => ({
      selector: item,
      ...summarize(selection.selectedRows.filter((row) => selector(row) === item)),
    })),
    selectedRows: selection.selectedRows.map(toReplayRow),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved same-bar report inputs before using this OpeningDrive replay package.']
      : [
        ready
          ? 'OpeningDrive selected sample is clean and ready for a research-only proposal update; keep promotion disabled until approval contract proves safety.'
          : 'OpeningDrive selected sample is not clean enough or not large enough; mine a stronger separator before any proposal update.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk changes from this package.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport(report: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport, outDir = DEFAULT_REPORT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveFreshReplayPackageCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveFreshReplayPackageArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport({
    reportDir: options.reportDir,
    setupType: options.setupType,
    reports: loadReports(options.reportDir),
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport(report, options.reportDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, selectorSummaries: report.selectorSummaries, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveFreshReplayPackageCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
