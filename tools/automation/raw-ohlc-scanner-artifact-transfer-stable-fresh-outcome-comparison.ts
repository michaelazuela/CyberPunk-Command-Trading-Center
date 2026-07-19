import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactTransferStableValidationPackageReport,
} from './raw-ohlc-scanner-artifact-transfer-stable-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';

interface CliOptions {
  validationPackage: string | null;
  freshOutcome: string | null;
  outDir: string;
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

interface ComparisonRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  expectedOutcomeLabel: string;
  freshOutcomeLabel: string | null;
  expectedOneMesPl: number | null;
  freshOneMesPl: number | null;
  matchesOutcome: boolean;
  matchesPl: boolean;
  freshOutcomeStatus: string | null;
}

interface ModelSummary {
  setupType: string;
  rows: number;
  exactMatches: number;
  divergences: number;
  freshLosses: number;
  freshUnresolved: number;
  freshBlocked: number;
  freshOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_fresh_outcome_comparison';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    validationPackagePath: string | null;
    freshOutcomePath: string | null;
  };
  assumptions: {
    consumesExistingValidationAndFreshOutcomeReportsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noFreshMarketDataLoaded: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    validationRows: number;
    freshOutcomeRows: number;
    matchedRows: number;
    missingFreshRows: number;
    exactMatches: number;
    divergences: number;
    freshLosses: number;
    freshUnresolved: number;
    freshBlocked: number;
    freshOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'ready_for_latest_artifact_replay' | 'investigate_divergence' | 'fix_inputs';
  };
  byModel: ModelSummary[];
  divergentRows: ComparisonRow[];
  missingFreshRows: string[];
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
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

export function parseRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    validationPackage: readFlag(args, '--validation-package') ||
      latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-transfer-stable-validation-package-\d+\.json$/),
    freshOutcome: readFlag(args, '--fresh-outcome') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
}

function outcomeMap(rows: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[]): Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow> {
  return new Map(rows.map((row) => [row.ticketId, row]));
}

function plMatches(expected: number | null, actual: number | null): boolean {
  if (expected === null || actual === null) return expected === actual;
  return Math.abs(expected - actual) < 0.01;
}

function buildComparisonRows(
  validationPackage: RawOhlcScannerArtifactTransferStableValidationPackageReport | null,
  freshOutcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null,
): ComparisonRow[] {
  const freshByTicket = outcomeMap(freshOutcome?.rows || []);
  return (validationPackage?.validationRows || []).map((expected) => {
    const actual = freshByTicket.get(expected.ticketId);
    const matchesOutcome = expected.outcomeLabel === actual?.outcomeLabel;
    const matchesPl = plMatches(expected.oneMesPl, actual?.resolvedOneMesPl ?? null);
    return {
      ticketId: expected.ticketId,
      tradeDate: expected.tradeDate,
      session: expected.session,
      setupType: expected.setupType,
      direction: expected.direction,
      expectedOutcomeLabel: expected.outcomeLabel,
      freshOutcomeLabel: actual?.outcomeLabel || null,
      expectedOneMesPl: expected.oneMesPl,
      freshOneMesPl: actual?.resolvedOneMesPl ?? null,
      matchesOutcome,
      matchesPl,
      freshOutcomeStatus: actual?.outcomeStatus || null,
    };
  });
}

function modelSummaries(rows: ComparisonRow[]): ModelSummary[] {
  const groups = new Map<string, ComparisonRow[]>();
  for (const row of rows) groups.set(row.setupType, [...(groups.get(row.setupType) || []), row]);
  return [...groups.entries()]
    .map(([setupType, groupRows]) => ({
      setupType,
      rows: groupRows.length,
      exactMatches: groupRows.filter((row) => row.matchesOutcome && row.matchesPl).length,
      divergences: groupRows.filter((row) => !row.matchesOutcome || !row.matchesPl).length,
      freshLosses: groupRows.filter((row) => row.freshOutcomeLabel === 'stopped_before_t1').length,
      freshUnresolved: groupRows.filter((row) => row.freshOutcomeStatus === 'unresolved').length,
      freshBlocked: groupRows.filter((row) => row.freshOutcomeStatus === 'blocked').length,
      freshOneMesPl: sum(groupRows.map((row) => row.freshOneMesPl)),
    }))
    .sort((a, b) => a.setupType.localeCompare(b.setupType));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Transfer-Stable Fresh Outcome Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only comparison. It reads saved validation and fresh outcome reports only and does not run setupScanner, post Discord, write Supabase, read the bridge, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Validation/fresh rows: ${report.summary.validationRows}/${report.summary.freshOutcomeRows}.`,
    `- Matched/missing rows: ${report.summary.matchedRows}/${report.summary.missingFreshRows}.`,
    `- Exact matches/divergences: ${report.summary.exactMatches}/${report.summary.divergences}.`,
    `- Fresh losses/unresolved/blocked: ${report.summary.freshLosses}/${report.summary.freshUnresolved}/${report.summary.freshBlocked}.`,
    `- Fresh one-MES P/L: ${report.summary.freshOneMesPl ?? 'not available'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Model Summary',
    '| Model | Rows | Exact | Divergences | Fresh L/U/B | Fresh P/L |',
    '|---|---:|---:|---:|---|---:|',
    ...report.byModel.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.exactMatches} | ${row.divergences} | ${row.freshLosses}/${row.freshUnresolved}/${row.freshBlocked} | ${row.freshOneMesPl ?? '-'} |`),
    '',
    '## Divergences',
    '| Ticket | Expected | Fresh | Expected P/L | Fresh P/L |',
    '|---|---|---|---:|---:|',
    ...report.divergentRows.map((row) => `| ${escapeTable(row.ticketId)} | ${row.expectedOutcomeLabel} | ${row.freshOutcomeLabel ?? '-'} | ${row.expectedOneMesPl ?? '-'} | ${row.freshOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport(args: {
  reportDir: string;
  validationPackagePath: string | null;
  validationPackage: RawOhlcScannerArtifactTransferStableValidationPackageReport | null;
  freshOutcomePath: string | null;
  freshOutcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport {
  const rows = buildComparisonRows(args.validationPackage, args.freshOutcome);
  const missingFreshRows = rows.filter((row) => !row.freshOutcomeLabel).map((row) => row.ticketId).sort();
  const divergentRows = rows.filter((row) => !row.matchesOutcome || !row.matchesPl);
  const freshRows = args.freshOutcome?.rows || [];
  const blockers = [
    !args.validationPackagePath ? 'missing validation package path' : null,
    !args.validationPackage ? 'missing validation package' : null,
    args.validationPackage && args.validationPackage.status !== 'pass' ? `validation package status ${args.validationPackage.status}` : null,
    !args.freshOutcomePath ? 'missing fresh outcome path' : null,
    !args.freshOutcome ? 'missing fresh outcome report' : null,
    args.freshOutcome && args.freshOutcome.status !== 'pass' ? `fresh outcome status ${args.freshOutcome.status}` : null,
    rows.length === 0 ? 'no validation rows to compare' : null,
    ...missingFreshRows.map((ticketId) => `${ticketId}: missing fresh outcome row`),
  ].filter((item): item is string => Boolean(item));
  const freshLosses = freshRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length;
  const freshUnresolved = freshRows.filter((row) => row.outcomeStatus === 'unresolved').length;
  const freshBlocked = freshRows.filter((row) => row.outcomeStatus === 'blocked').length;
  const base: Omit<RawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_transfer_stable_fresh_outcome_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      validationPackagePath: args.validationPackagePath,
      freshOutcomePath: args.freshOutcomePath,
    },
    assumptions: {
      consumesExistingValidationAndFreshOutcomeReportsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshMarketDataLoaded: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      validationRows: rows.length,
      freshOutcomeRows: freshRows.length,
      matchedRows: rows.length - missingFreshRows.length,
      missingFreshRows: missingFreshRows.length,
      exactMatches: rows.filter((row) => row.matchesOutcome && row.matchesPl).length,
      divergences: divergentRows.length,
      freshLosses,
      freshUnresolved,
      freshBlocked,
      freshOneMesPl: sum(freshRows.map((row) => row.resolvedOneMesPl)),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : divergentRows.length || freshLosses || freshUnresolved || freshBlocked
          ? 'investigate_divergence'
          : 'ready_for_latest_artifact_replay',
    },
    byModel: modelSummaries(rows),
    divergentRows,
    missingFreshRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix comparison inputs before using this as selector evidence.']
      : [
        divergentRows.length === 0
          ? 'Validation outcomes match fresh OHLC replay outcomes ticket-by-ticket.'
          : 'Investigate divergent validation rows before any scanner-visible proposal.',
        'Next proof should use a latest/out-of-sample scanner artifact package; do not change live ranking from comparison alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport(
  report: RawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-transfer-stable-fresh-outcome-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonArgs(args);
  const report = buildRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport({
    reportDir: options.outDir,
    validationPackagePath: options.validationPackage,
    validationPackage: options.validationPackage && fs.existsSync(options.validationPackage)
      ? readJson<RawOhlcScannerArtifactTransferStableValidationPackageReport>(options.validationPackage)
      : null,
    freshOutcomePath: options.freshOutcome,
    freshOutcome: options.freshOutcome && fs.existsSync(options.freshOutcome)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.freshOutcome)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, byModel: report.byModel, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
