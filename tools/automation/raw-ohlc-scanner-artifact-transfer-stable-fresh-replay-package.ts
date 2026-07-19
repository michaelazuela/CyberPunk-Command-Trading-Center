import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  RawOhlcScannerArtifactTransferStableValidationPackageReport,
} from './raw-ohlc-scanner-artifact-transfer-stable-validation-package';

interface CliOptions {
  validationPackage: string | null;
  sourceReplayPackages: string[];
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

type ReplayRow = UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function matchingFiles(reportDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort();
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

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageReport['authority'] {
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

export function parseRawOhlcScannerArtifactTransferStableFreshReplayPackageArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const explicitSourcePackages = splitPaths(readFlag(args, '--source-replay-packages'));
  return {
    validationPackage: readFlag(args, '--validation-package') ||
      latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-transfer-stable-validation-package-\d+\.json$/),
    sourceReplayPackages: explicitSourcePackages.length
      ? explicitSourcePackages
      : matchingFiles(outDir, /^raw-ohlc-scanner-artifact-replay-package-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Transfer-Stable Fresh Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay package rebuilt from saved validation tickets and saved raw-OHLC replay package rows. It does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selected rows read: ${report.summary.selectedRowsRead}.`,
    `- Replay package rows: ${report.summary.replayPackageRows}.`,
    `- Ready rows: ${report.summary.readyRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Model groups: ${report.summary.modelGroups}.`,
    `- Session groups: ${report.summary.sessionGroups}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

function indexRows(reports: UnifiedPositiveHeldLocalPreviewReplayPackageReport[]): Map<string, ReplayRow> {
  const byTicket = new Map<string, ReplayRow>();
  for (const row of reports.flatMap((report) => report.rows || [])) {
    if (!byTicket.has(row.ticketId)) byTicket.set(row.ticketId, row);
  }
  return byTicket;
}

function cloneRow(row: ReplayRow): ReplayRow {
  return {
    ...row,
    riskPoints: round(Math.abs(row.entry - row.stop)),
    blockers: [...row.blockers],
  };
}

export function buildRawOhlcScannerArtifactTransferStableFreshReplayPackageReport(args: {
  reportDir: string;
  validationPackagePath: string | null;
  validationPackage: RawOhlcScannerArtifactTransferStableValidationPackageReport | null;
  sourceReplayPackagePaths: string[];
  sourceReplayPackages: UnifiedPositiveHeldLocalPreviewReplayPackageReport[];
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  const requestedTickets = new Set((args.validationPackage?.validationRows || []).map((row) => row.ticketId));
  const indexed = indexRows(args.sourceReplayPackages);
  const rows = [...requestedTickets]
    .map((ticketId) => indexed.get(ticketId))
    .filter((row): row is ReplayRow => Boolean(row))
    .map(cloneRow)
    .sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.setupType}-${a.direction}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.setupType}-${b.direction}`));
  const foundTickets = new Set(rows.map((row) => row.ticketId));
  const missingTickets = [...requestedTickets].filter((ticketId) => !foundTickets.has(ticketId)).sort();
  const blockers = [
    !args.validationPackagePath ? 'missing validation package path' : null,
    !args.validationPackage ? 'missing validation package' : null,
    args.validationPackage && args.validationPackage.status !== 'pass' ? `validation package status ${args.validationPackage.status}` : null,
    args.sourceReplayPackages.length === 0 ? 'missing source replay packages' : null,
    ...args.sourceReplayPackages.map((report, index) => report.status !== 'pass' ? `source replay package ${args.sourceReplayPackagePaths[index]} status ${report.status}` : null),
    requestedTickets.size === 0 ? 'validation package has no validation rows' : null,
    rows.length === 0 ? 'no validation tickets matched source replay package rows' : null,
    ...missingTickets.map((ticketId) => `${ticketId}: missing source replay package row`),
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      triageReportPath: args.validationPackagePath,
      auditDir: args.reportDir,
    },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: requestedTickets.size,
      replayPackageRows: rows.length,
      readyRows: rows.filter((row) => row.outcomeInputStatus === 'ready_for_read_only_outcome_replay').length,
      blockedRows: rows.filter((row) => row.outcomeInputStatus === 'blocked').length,
      directionallyInvalidGeometryRows: rows.filter((row) => row.blockers.includes('directionally invalid entry-to-stop geometry')).length,
      modelGroups: new Set(rows.map((row) => row.setupType)).size,
      sessionGroups: new Set(rows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run fresh outcome replay until every validation ticket maps to a ready saved source replay row.']
      : ['Run the existing read-only OHLC outcome replay over this package, then compare fresh outcomes against the validation manifest before any scanner-visible proposal.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactTransferStableFreshReplayPackageReport(
  report: UnifiedPositiveHeldLocalPreviewReplayPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-transfer-stable-fresh-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactTransferStableFreshReplayPackageCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactTransferStableFreshReplayPackageArgs(args);
  const report = buildRawOhlcScannerArtifactTransferStableFreshReplayPackageReport({
    reportDir: options.outDir,
    validationPackagePath: options.validationPackage,
    validationPackage: options.validationPackage && fs.existsSync(options.validationPackage)
      ? readJson<RawOhlcScannerArtifactTransferStableValidationPackageReport>(options.validationPackage)
      : null,
    sourceReplayPackagePaths: options.sourceReplayPackages,
    sourceReplayPackages: options.sourceReplayPackages.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(filePath)),
  });
  const paths = writeRawOhlcScannerArtifactTransferStableFreshReplayPackageReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactTransferStableFreshReplayPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
