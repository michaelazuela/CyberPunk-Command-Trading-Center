import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactJulyHtfReadyRollupReport } from './raw-ohlc-scanner-artifact-july-htf-ready-rollup';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-approval-contract';

interface CliOptions {
  julyRollup: string;
  approvalContract: string;
  outDir: string;
  json: boolean;
}

interface HtfMssBreadthRow {
  tradeDate: string;
  session: string;
  rows: number;
  resolvedRows: number;
  unresolvedRows: number;
  blockedRows: number;
  grossResolvedOneMesPl: number | null;
  evidenceClass: 'positive_resolved' | 'negative_resolved' | 'flat_or_unresolved';
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

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_breadth_validation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    julyRollupPath: string;
    approvalContractPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    breadthValidationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    proposalSelectedRows: number;
    proposalSelectedResolvedRows: number;
    proposalSelectedResolvedGrossOneMesPl: number | null;
    julyHtfMssRows: number;
    julyHtfMssResolvedRows: number;
    julyHtfMssUnresolvedRows: number;
    julyHtfMssBlockedRows: number;
    julyHtfMssGrossResolvedOneMesPl: number | null;
    julyHtfMssDaySessionGroups: number;
    positiveDaySessionGroups: number;
    negativeDaySessionGroups: number;
    flatOrUnresolvedDaySessionGroups: number;
    livePromotionAllowedRows: 0;
    recommendation: 'build_htf_mss_separator_before_live_approval' | 'validate_unresolved_htf_mss' | 'ready_for_approval_discussion' | 'fix_inputs';
  };
  htfMssDaySessionRows: HtfMssBreadthRow[];
  negativeRows: HtfMssBreadthRow[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationArgs(args = process.argv.slice(2)): CliOptions {
  const julyRollup = readFlag(args, '--july-rollup');
  const approvalContract = readFlag(args, '--approval-contract');
  if (!julyRollup) throw new Error('--july-rollup is required.');
  if (!approvalContract) throw new Error('--approval-contract is required.');
  return {
    julyRollup,
    approvalContract,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function addNullable(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return round((a || 0) + (b || 0));
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

function evidenceClass(value: number | null): HtfMssBreadthRow['evidenceClass'] {
  if (value === null || value === 0) return 'flat_or_unresolved';
  return value > 0 ? 'positive_resolved' : 'negative_resolved';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport, 'markdown'>): string {
  return [
    '# HTF MSS Breadth Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only breadth validation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Proposal selected rows/resolved/P&L: ${report.summary.proposalSelectedRows}/${report.summary.proposalSelectedResolvedRows}/${report.summary.proposalSelectedResolvedGrossOneMesPl ?? '-'}.`,
    `- July HTF-MSS rows/resolved/unresolved: ${report.summary.julyHtfMssRows}/${report.summary.julyHtfMssResolvedRows}/${report.summary.julyHtfMssUnresolvedRows}.`,
    `- July HTF-MSS gross resolved one-MES P/L: ${report.summary.julyHtfMssGrossResolvedOneMesPl ?? '-'}.`,
    `- Day/session groups positive/negative/flat: ${report.summary.positiveDaySessionGroups}/${report.summary.negativeDaySessionGroups}/${report.summary.flatOrUnresolvedDaySessionGroups}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## HTF-MSS Day/Session Rows',
    '| Date | Session | Rows | Resolved | Unresolved | P/L | Evidence |',
    '|---|---|---:|---:|---:|---:|---|',
    ...report.htfMssDaySessionRows.map((row) => `| ${row.tradeDate} | ${row.session} | ${row.rows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.evidenceClass} |`),
    '',
    '## Negative Rows',
    ...(report.negativeRows.length
      ? report.negativeRows.map((row) => `- ${row.tradeDate} ${escapeTable(row.session)}: ${row.grossResolvedOneMesPl}`)
      : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport(args: {
  reportDir: string;
  julyRollupPath: string;
  approvalContractPath: string;
  julyRollup: RawOhlcScannerArtifactJulyHtfReadyRollupReport | null;
  approvalContract: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport {
  const htfMssDaySessionRows = (args.julyRollup?.daySessionModelGroups || [])
    .filter((group) => group.setupType === 'HtfDisplacementMssContinuation')
    .map((group) => ({
      tradeDate: group.tradeDate,
      session: group.session,
      rows: group.rows,
      resolvedRows: group.resolvedRows,
      unresolvedRows: group.unresolvedRows,
      blockedRows: group.blockedRows,
      grossResolvedOneMesPl: group.grossResolvedOneMesPl,
      evidenceClass: evidenceClass(group.grossResolvedOneMesPl),
    }))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session));
  const negativeRows = htfMssDaySessionRows.filter((row) => row.evidenceClass === 'negative_resolved');
  const blockers = [
    !args.julyRollup ? 'missing July HTF-ready rollup' : null,
    args.julyRollup && args.julyRollup.status !== 'pass' ? `July HTF-ready rollup status ${args.julyRollup.status}` : null,
    !args.approvalContract ? 'missing HTF-MSS approval contract' : null,
    args.approvalContract && args.approvalContract.status !== 'pass' ? `HTF-MSS approval contract status ${args.approvalContract.status}` : null,
    args.approvalContract && args.approvalContract.summary.recommendation !== 'await_explicit_approval_or_broaden_research'
      ? `HTF-MSS approval contract recommendation ${args.approvalContract.summary.recommendation}`
      : null,
    htfMssDaySessionRows.length === 0 ? 'no July HTF-MSS day/session rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const julyHtfMssGrossResolvedOneMesPl = htfMssDaySessionRows.reduce((total, row) => addNullable(total, row.grossResolvedOneMesPl), null as number | null);
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_breadth_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      julyRollupPath: args.julyRollupPath,
      approvalContractPath: args.approvalContractPath,
    },
    assumptions: {
      savedReportsOnly: true,
      breadthValidationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      proposalSelectedRows: args.approvalContract?.summary.proposalSelectedRows || 0,
      proposalSelectedResolvedRows: args.approvalContract?.summary.proposalSelectedResolvedRows || 0,
      proposalSelectedResolvedGrossOneMesPl: args.approvalContract?.summary.proposalSelectedResolvedGrossOneMesPl ?? null,
      julyHtfMssRows: htfMssDaySessionRows.reduce((total, row) => total + row.rows, 0),
      julyHtfMssResolvedRows: htfMssDaySessionRows.reduce((total, row) => total + row.resolvedRows, 0),
      julyHtfMssUnresolvedRows: htfMssDaySessionRows.reduce((total, row) => total + row.unresolvedRows, 0),
      julyHtfMssBlockedRows: htfMssDaySessionRows.reduce((total, row) => total + row.blockedRows, 0),
      julyHtfMssGrossResolvedOneMesPl,
      julyHtfMssDaySessionGroups: htfMssDaySessionRows.length,
      positiveDaySessionGroups: htfMssDaySessionRows.filter((row) => row.evidenceClass === 'positive_resolved').length,
      negativeDaySessionGroups: negativeRows.length,
      flatOrUnresolvedDaySessionGroups: htfMssDaySessionRows.filter((row) => row.evidenceClass === 'flat_or_unresolved').length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : negativeRows.length > 0
          ? 'build_htf_mss_separator_before_live_approval'
          : htfMssDaySessionRows.some((row) => row.unresolvedRows > 0)
            ? 'validate_unresolved_htf_mss'
            : 'ready_for_approval_discussion',
    },
    htfMssDaySessionRows,
    negativeRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved rollup/contract inputs before using this breadth validation.']
      : [
        negativeRows.length > 0
          ? 'HTF-MSS is positive in aggregate but has loss-bearing day/session pockets; build a separator before any scanner-visible approval.'
          : 'HTF-MSS has no loss-bearing day/session pockets in this breadth set; keep promotion disabled until approval is explicit.',
        'Use session, direction, risk, proof timing, and HTF/proof source as the next separator fields.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, scanner runtime, entry, stop, target, risk, or live ranking from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-breadth-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport({
    reportDir: options.outDir,
    julyRollupPath: options.julyRollup,
    approvalContractPath: options.approvalContract,
    julyRollup: fs.existsSync(options.julyRollup) ? readJson(options.julyRollup) : null,
    approvalContract: fs.existsSync(options.approvalContract) ? readJson(options.approvalContract) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, negativeRows: report.negativeRows, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
