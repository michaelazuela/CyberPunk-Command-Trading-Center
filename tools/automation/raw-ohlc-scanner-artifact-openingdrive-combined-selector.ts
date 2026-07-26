import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactSameBarAllowlistProbeReport } from './raw-ohlc-scanner-artifact-samebar-allowlist-probe';

interface CliOptions {
  samebarSeparatorReport: string;
  setupType: string;
  outDir: string;
  json: boolean;
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

interface SelectedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  riskPoints: number;
  selector: 'tight_long_risk_4_to_8' | 'fine_risk_24_to_32';
  outcomeLabel: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'];
  oneMesPl: number | null;
}

interface SelectorSummary extends BucketSummary {
  selector: SelectedRow['selector'];
}

export interface RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_selector';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'];
  source: {
    reportDir: string;
    samebarSeparatorReportPath: string | null;
    setupType: string;
  };
  assumptions: {
    readOnlyPostProcessor: true;
    usesExistingSameBarSeparatorRowsOnly: true;
    combinesValidatedResearchLeadsOnly: true;
    oneSelectedRowPerProofEvent: true;
    candidateUsesNoLookaheadFieldsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    livePromotionAllowed: false;
  };
  selectorPolicy: {
    proofEventKey: 'tradeDate|session|proofTime';
    firstPriority: 'tight_long_risk_4_to_8';
    secondPriority: 'fine_risk_24_to_32';
    tieBreak: 'lowest_risk_points';
  };
  summary: {
    sourceRows: number;
    proofEvents: number;
    selectedRows: number;
    rejectedRows: number;
    collisionEvents: number;
    selectedSummary: BucketSummary;
    rejectedSummary: BucketSummary;
    livePromotionAllowedRows: 0;
  };
  selectorSummaries: SelectorSummary[];
  selectedRows: SelectedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';

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

export function parseRawOhlcScannerArtifactOpeningDriveCombinedSelectorArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarSeparatorReport = readFlag(args, '--samebar-separator-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/);
  if (!samebarSeparatorReport) throw new Error('--samebar-separator-report is required.');
  return {
    samebarSeparatorReport,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    json: args.includes('--json'),
  };
}

function authority(): RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): BucketSummary {
  return {
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  return 'risk_gte_16';
}

function fineRiskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 6) return 'risk_4_to_6';
  if (row.riskPoints < 8) return 'risk_6_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  if (row.riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function selector(row: RawOhlcScannerArtifactSameBarSeparatorRow): SelectedRow['selector'] | null {
  if (row.direction.toUpperCase() === 'LONG' && riskBucket(row) === 'risk_4_to_8') return 'tight_long_risk_4_to_8';
  if (fineRiskBucket(row) === 'risk_24_to_32') return 'fine_risk_24_to_32';
  return null;
}

function priority(row: RawOhlcScannerArtifactSameBarSeparatorRow): number {
  return selector(row) === 'tight_long_risk_4_to_8' ? 1 : 2;
}

function proofEventKey(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}`;
}

function selectRows(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): {
  selectedRows: RawOhlcScannerArtifactSameBarSeparatorRow[];
  rejectedRows: RawOhlcScannerArtifactSameBarSeparatorRow[];
  collisionEvents: number;
} {
  const groups = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
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

function toSelectedRow(row: RawOhlcScannerArtifactSameBarSeparatorRow): SelectedRow {
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    direction: row.direction,
    riskPoints: row.riskPoints,
    selector: selector(row) || 'fine_risk_24_to_32',
    outcomeLabel: row.outcomeLabel,
    oneMesPl: row.resolvedOneMesPl,
  };
}

function selectorSummaries(selectedRows: RawOhlcScannerArtifactSameBarSeparatorRow[]): SelectorSummary[] {
  const selectors: SelectedRow['selector'][] = ['tight_long_risk_4_to_8', 'fine_risk_24_to_32'];
  return selectors.map((item) => ({
    selector: item,
    ...summarize(selectedRows.filter((row) => selector(row) === item)),
  }));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport, 'markdown'>): string {
  return [
    '# Raw OHLC OpeningDrive Combined Selector',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only combined selector. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows/proof events: ${report.summary.sourceRows}/${report.summary.proofEvents}.`,
    `- Selected/rejected rows: ${report.summary.selectedRows}/${report.summary.rejectedRows}.`,
    `- Selected W/L/O/U: ${report.summary.selectedSummary.winners}/${report.summary.selectedSummary.losses}/${report.summary.selectedSummary.otherResolved}/${report.summary.selectedSummary.unresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedSummary.oneMesPl ?? 'not available'}.`,
    `- Rejected W/L/O/U: ${report.summary.rejectedSummary.winners}/${report.summary.rejectedSummary.losses}/${report.summary.rejectedSummary.otherResolved}/${report.summary.rejectedSummary.unresolved}.`,
    `- Collision events: ${report.summary.collisionEvents}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Selector Buckets',
    '| Selector | Rows | W/L/O/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.selectorSummaries.map((row) => `| ${row.selector} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Selected Rows',
    '| Ticket | Date | Time | Direction | Risk | Selector | Outcome | P/L |',
    '|---|---|---|---|---:|---|---|---:|',
    ...report.selectedRows.slice(0, 40).map((row) => `| ${escapeTable(row.ticketId)} | ${row.tradeDate} | ${row.proofTime} | ${row.direction} | ${row.riskPoints} | ${row.selector} | ${escapeTable(String(row.outcomeLabel))} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveCombinedSelectorReport(args: {
  reportDir: string;
  samebarSeparatorReportPath: string | null;
  samebarSeparatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport | null;
  setupType: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport {
  const rows = (args.samebarSeparatorReport?.rows || []).filter((row) => row.setupType === args.setupType);
  const selection = selectRows(rows);
  const blockers = [
    !args.samebarSeparatorReportPath ? 'missing same-bar separator report path' : null,
    !args.samebarSeparatorReport ? 'missing same-bar separator report' : null,
    args.samebarSeparatorReport && args.samebarSeparatorReport.status !== 'pass' ? `same-bar separator status ${args.samebarSeparatorReport.status}` : null,
    rows.length === 0 ? `no same-bar rows found for ${args.setupType}` : null,
  ].filter((item): item is string => Boolean(item));
  const selectedSummary = summarize(selection.selectedRows);
  const rejectedSummary = summarize(selection.rejectedRows);
  const base: Omit<RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_selector',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      samebarSeparatorReportPath: args.samebarSeparatorReportPath,
      setupType: args.setupType,
    },
    assumptions: {
      readOnlyPostProcessor: true,
      usesExistingSameBarSeparatorRowsOnly: true,
      combinesValidatedResearchLeadsOnly: true,
      oneSelectedRowPerProofEvent: true,
      candidateUsesNoLookaheadFieldsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      livePromotionAllowed: false,
    },
    selectorPolicy: {
      proofEventKey: 'tradeDate|session|proofTime',
      firstPriority: 'tight_long_risk_4_to_8',
      secondPriority: 'fine_risk_24_to_32',
      tieBreak: 'lowest_risk_points',
    },
    summary: {
      sourceRows: rows.length,
      proofEvents: new Set(rows.map(proofEventKey)).size,
      selectedRows: selection.selectedRows.length,
      rejectedRows: selection.rejectedRows.length,
      collisionEvents: selection.collisionEvents,
      selectedSummary,
      rejectedSummary,
      livePromotionAllowedRows: 0,
    },
    selectorSummaries: selectorSummaries(selection.selectedRows),
    selectedRows: selection.selectedRows.map(toSelectedRow),
    blockers,
    recommendations: blockers.length
      ? ['Do not use combined OpeningDrive selector until the same-bar source report loads cleanly.']
      : [
        selectedSummary.losses === 0
          ? 'The combined research selector stayed clean in this sample; next validate on a fresh replay package before scanner-visible use.'
          : 'The combined research selector is loss-bearing; do not promote it without a stronger separator.',
        rejectedSummary.losses > 0
          ? 'The remaining rejected population still contains stopped-before-T1 losses, so broad OpeningDrive same-bar promotion remains unsafe.'
          : 'The remaining rejected population has no stopped-before-T1 rows in this sample, but still needs independent validation.',
        'No Discord, Supabase, NinjaTrader bridge, canExecute, entry/stop/target/risk, or trading-rule change is approved by this selector.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveCombinedSelectorReport(
  report: RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-combined-selector-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveCombinedSelectorCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveCombinedSelectorArgs(args);
  const samebarSeparatorReport = fs.existsSync(options.samebarSeparatorReport)
    ? readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(options.samebarSeparatorReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDriveCombinedSelectorReport({
    reportDir: options.outDir,
    samebarSeparatorReportPath: options.samebarSeparatorReport,
    samebarSeparatorReport,
    setupType: options.setupType,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveCombinedSelectorReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, selectorSummaries: report.selectorSummaries, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDriveCombinedSelectorCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
