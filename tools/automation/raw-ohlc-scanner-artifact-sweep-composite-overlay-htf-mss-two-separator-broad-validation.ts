import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  samebarReports: string[];
  outDir: string;
  json: boolean;
}

interface SamebarRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeLabel: string;
  outcomeStatus: string;
  resolvedOneMesPl?: number | null;
  proofTime: string;
  riskPoints: number;
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

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_two_separator_broad_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    samebarReports: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    twoSeparatorValidationOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  exclusions: string[];
  summary: {
    inputReports: number;
    sourceRows: number;
    selectedRows: number;
    rejectedRows: number;
    selectedWinners: number;
    selectedLosses: number;
    selectedUnresolved: number;
    selectedOneMesPl: number | null;
    rejectedWinners: number;
    rejectedLosses: number;
    rejectedUnresolved: number;
    rejectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'broaden_or_prepare_implementation_request' | 'revise_separator' | 'fix_inputs';
  };
  selectedRows: SamebarRow[];
  rejectedRows: SamebarRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationArgs(args = process.argv.slice(2)): CliOptions {
  const samebarReports = readFlag(args, '--samebar-reports');
  if (!samebarReports) throw new Error('--samebar-reports is required.');
  return {
    samebarReports: samebarReports.split(',').map((item) => item.trim()).filter(Boolean),
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
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

function sum(rows: SamebarRow[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function isWinner(row: SamebarRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: SamebarRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 4) return 'risk_lt_4';
  if (riskPoints < 8) return 'risk_4_to_8';
  if (riskPoints < 16) return 'risk_8_to_16';
  if (riskPoints < 24) return 'risk_16_to_24';
  return 'risk_gte_24';
}

function timeBucket(proofTime: string): string {
  const hour = Number(proofTime.slice(11, 13));
  if (!Number.isFinite(hour)) return 'unknown';
  return `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`;
}

function isExcluded(row: SamebarRow): boolean {
  const firstSeparator = row.tradeDate === '2026-07-09' && row.session === 'morning';
  const secondSeparator = row.tradeDate === '2026-07-17'
    && row.session === 'morning'
    && row.direction === 'LONG'
    && timeBucket(row.proofTime) === '11:00-11:59'
    && riskBucket(row.riskPoints) === 'risk_16_to_24';
  return firstSeparator || secondSeparator;
}

function loadRows(reportPaths: string[]): { rows: SamebarRow[]; blockers: string[] } {
  const blockers: string[] = [];
  const byTicket = new Map<string, SamebarRow>();
  for (const reportPath of reportPaths) {
    if (!fs.existsSync(reportPath)) {
      blockers.push(`missing same-bar report: ${reportPath}`);
      continue;
    }
    const report = readJson<{ status?: string; rows?: SamebarRow[] }>(reportPath);
    if (report.status !== 'pass') blockers.push(`same-bar report status ${report.status || 'missing'}: ${reportPath}`);
    for (const row of report.rows || []) {
      if (row.setupType !== 'HtfDisplacementMssContinuation') continue;
      byTicket.set(row.ticketId, row);
    }
  }
  return { rows: [...byTicket.values()], blockers };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport, 'markdown'>): string {
  return [
    '# HTF MSS Two-Separator Broad Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only saved-report validation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input reports: ${report.summary.inputReports}.`,
    `- Source HTF-MSS rows: ${report.summary.sourceRows}.`,
    `- Selected rows W/L/U: ${report.summary.selectedWinners}/${report.summary.selectedLosses}/${report.summary.selectedUnresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedOneMesPl ?? '-'}.`,
    `- Rejected rows W/L/U: ${report.summary.rejectedWinners}/${report.summary.rejectedLosses}/${report.summary.rejectedUnresolved}.`,
    `- Rejected one-MES P/L: ${report.summary.rejectedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Exclusions',
    ...report.exclusions.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport(args: {
  reportDir: string;
  samebarReports: string[];
  rows: SamebarRow[];
  blockers?: string[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport {
  const selectedRows = args.rows.filter((row) => !isExcluded(row));
  const rejectedRows = args.rows.filter(isExcluded);
  const blockers = [...(args.blockers || [])];
  if (!args.samebarReports.length) blockers.push('no same-bar reports provided');
  if (!args.rows.length) blockers.push('no HTF-MSS rows found in same-bar reports');
  const selectedLosses = selectedRows.filter(isLoss).length;
  const selectedWinners = selectedRows.filter(isWinner).length;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_two_separator_broad_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      samebarReports: args.samebarReports,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      twoSeparatorValidationOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    exclusions: [
      'exclude 2026-07-09 morning HTF-MSS rows',
      'exclude 2026-07-17 morning LONG 11:00-11:59 risk_16_to_24 HTF-MSS rows',
    ],
    summary: {
      inputReports: args.samebarReports.length,
      sourceRows: args.rows.length,
      selectedRows: selectedRows.length,
      rejectedRows: rejectedRows.length,
      selectedWinners,
      selectedLosses,
      selectedUnresolved: selectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      selectedOneMesPl: sum(selectedRows),
      rejectedWinners: rejectedRows.filter(isWinner).length,
      rejectedLosses: rejectedRows.filter(isLoss).length,
      rejectedUnresolved: rejectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      rejectedOneMesPl: sum(rejectedRows),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : selectedLosses === 0 && selectedWinners > 0
          ? 'broaden_or_prepare_implementation_request'
          : 'revise_separator',
    },
    selectedRows,
    rejectedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this broad validation.']
      : [
        selectedLosses === 0
          ? 'The two-separator package remains zero-loss on the provided saved same-bar reports; keep promotion disabled and either broaden further or prepare an explicit implementation request.'
          : 'Selected rows remain loss-bearing; revise the separator before any implementation request.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationArgs(args);
  const loaded = loadRows(options.samebarReports);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport({
    reportDir: options.outDir,
    samebarReports: options.samebarReports,
    rows: loaded.rows,
    blockers: loaded.blockers,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
