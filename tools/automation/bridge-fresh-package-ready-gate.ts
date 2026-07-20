import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BridgeFreshPackageDataBoundaryAuditReport } from './bridge-fresh-package-data-boundary-audit';

type ReadyGateStatus = 'pass' | 'fail';

export interface BridgeFreshPackageReadyGateReport {
  reportType: 'bridge_fresh_package_ready_gate';
  generatedAt: string;
  status: ReadyGateStatus;
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    reportDir: string;
    boundaryAuditPath: string | null;
  };
  summary: {
    boundaryAuditStatus: BridgeFreshPackageDataBoundaryAuditReport['status'] | null;
    readyForMarketBarsJsonExport: boolean;
    allRequestedTimeframesCompleted: boolean;
    likelyCause: BridgeFreshPackageDataBoundaryAuditReport['summary']['likelyCause'] | null;
    recommendation: BridgeFreshPackageDataBoundaryAuditReport['summary']['recommendation'] | null;
    generatorAllowed: boolean;
    livePromotionAllowedRows: 0;
  };
  nextAllowedCommand: string | null;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_GENERATOR_COMMAND = 'npm run research:raw-ohlc-scanner-artifacts -- --market-bars-json <fresh-market-bars-json> --start-date <date-after-2026-07-17> --end-date <fresh-date> --instrument MES --sessions morning,lunch --json';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): BridgeFreshPackageReadyGateReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesBridgeBehavior: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function buildMarkdown(report: Omit<BridgeFreshPackageReadyGateReport, 'markdown'>): string {
  return [
    '# Bridge Fresh Package Ready Gate',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: saved-report-only local diagnostic. It does not read the live bridge, post Discord, write Supabase, change bridge behavior, change scanner behavior, change canExecute, or change trade math.',
    '',
    '## Source',
    `- Boundary audit: ${report.source.boundaryAuditPath || '-'}.`,
    '',
    '## Summary',
    `- Boundary audit status: ${report.summary.boundaryAuditStatus || '-'}.`,
    `- Ready for market-bars JSON export: ${report.summary.readyForMarketBarsJsonExport}.`,
    `- All requested timeframes completed: ${report.summary.allRequestedTimeframesCompleted}.`,
    `- Generator allowed: ${report.summary.generatorAllowed}.`,
    `- Likely cause: ${report.summary.likelyCause || '-'}.`,
    `- Recommendation: ${report.summary.recommendation || '-'}.`,
    '',
    '## Next Allowed Command',
    report.nextAllowedCommand ? `- ${report.nextAllowedCommand}` : '- None. The raw scanner artifact generator is blocked until the boundary audit is ready.',
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildBridgeFreshPackageReadyGateReport(args: {
  reportDir?: string;
  boundaryAuditPath?: string | null;
  boundaryAudit: BridgeFreshPackageDataBoundaryAuditReport | null;
  generatorCommand?: string;
}, generatedAt = new Date().toISOString()): BridgeFreshPackageReadyGateReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const boundary = args.boundaryAudit;
  const boundaryReady = Boolean(
    boundary &&
    boundary.status === 'pass' &&
    boundary.summary.readyForMarketBarsJsonExport &&
    boundary.summary.allRequestedTimeframesCompleted,
  );
  const blockers = [
    !boundary ? 'missing bridge fresh-package data-boundary audit report' : null,
    boundary && boundary.status !== 'pass' ? `boundary audit status is ${boundary.status}` : null,
    boundary && !boundary.summary.readyForMarketBarsJsonExport ? 'boundary audit says market-bars JSON export is not ready' : null,
    boundary && !boundary.summary.allRequestedTimeframesCompleted ? 'boundary audit says one or more requested timeframes lack completed historical bars' : null,
    boundary && !boundaryReady && boundary.summary.likelyCause ? `likely cause: ${boundary.summary.likelyCause}` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<BridgeFreshPackageReadyGateReport, 'markdown'> = {
    reportType: 'bridge_fresh_package_ready_gate',
    generatedAt,
    status: boundaryReady ? 'pass' : 'fail',
    authority: authority(),
    source: {
      reportDir,
      boundaryAuditPath: args.boundaryAuditPath || null,
    },
    summary: {
      boundaryAuditStatus: boundary?.status || null,
      readyForMarketBarsJsonExport: Boolean(boundary?.summary.readyForMarketBarsJsonExport),
      allRequestedTimeframesCompleted: Boolean(boundary?.summary.allRequestedTimeframesCompleted),
      likelyCause: boundary?.summary.likelyCause || null,
      recommendation: boundary?.summary.recommendation || null,
      generatorAllowed: boundaryReady,
      livePromotionAllowedRows: 0,
    },
    nextAllowedCommand: boundaryReady ? args.generatorCommand || DEFAULT_GENERATOR_COMMAND : null,
    blockers,
    recommendations: boundaryReady
      ? [
        'Proceed with the raw scanner artifact generator using the verified fresh market-bars JSON.',
        'Keep the generated package research-only until replay, outcome, and source/proof timing checks pass.',
      ]
      : [
        boundary?.summary.recommendation === 'load_ninjatrader_history'
          ? 'Load NinjaTrader historical data for the active contract and requested morning/lunch validation window, then rerun the boundary audit and this gate.'
          : 'Fix the boundary audit blocker, then rerun this gate before generating fresh scanner artifacts.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeBridgeFreshPackageReadyGateReport(
  report: BridgeFreshPackageReadyGateReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `bridge-fresh-package-ready-gate-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runBridgeFreshPackageReadyGateCli(rawArgs = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(rawArgs, '--out-dir') || DEFAULT_REPORT_DIR);
  const boundaryAuditPath = readFlag(rawArgs, '--boundary-audit') ||
    latestMatchingFile(outDir, /^bridge-fresh-package-data-boundary-audit-\d+\.json$/);
  const report = buildBridgeFreshPackageReadyGateReport({
    reportDir: outDir,
    boundaryAuditPath,
    boundaryAudit: readJson<BridgeFreshPackageDataBoundaryAuditReport>(boundaryAuditPath),
    generatorCommand: readFlag(rawArgs, '--generator-command') || undefined,
  });
  const paths = writeBridgeFreshPackageReadyGateReport(report, outDir);
  if (rawArgs.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers, nextAllowedCommand: report.nextAllowedCommand }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runBridgeFreshPackageReadyGateCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
