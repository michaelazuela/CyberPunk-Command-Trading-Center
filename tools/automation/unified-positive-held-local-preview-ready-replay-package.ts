import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageReport,
} from './unified-positive-held-local-preview-replay-package';

interface CliOptions {
  replayPackagePath: string | null;
  outDir: string;
  json: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport
  extends UnifiedPositiveHeldLocalPreviewReplayPackageReport {
  source: UnifiedPositiveHeldLocalPreviewReplayPackageReport['source'] & {
    originalReplayPackagePath: string | null;
  };
  summary: UnifiedPositiveHeldLocalPreviewReplayPackageReport['summary'] & {
    originalReplayPackageRows: number;
    excludedBlockedRows: number;
  };
  excludedRows: UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'];
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

export function parseUnifiedPositiveHeldLocalPreviewReadyReplayPackageArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    outDir,
    replayPackagePath: readFlag(args, '--replay-package') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-\d+\.json$/),
    json: args.includes('--json'),
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Ready Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only ready-row package filter. It consumes a saved replay package, keeps only rows already marked ready_for_read_only_outcome_replay, and excludes blocked rows. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Original rows: ${report.summary.originalReplayPackageRows}.`,
    `- Ready rows kept: ${report.summary.replayPackageRows}.`,
    `- Blocked rows excluded: ${report.summary.excludedBlockedRows}.`,
    `- Directionally invalid geometry rows excluded: ${report.summary.directionallyInvalidGeometryRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReadyReplayPackageReport(args: {
  replayPackagePath: string | null;
  replayPackageReport: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport {
  const sourceRows = args.replayPackageReport?.rows || [];
  const readyRows = sourceRows.filter((row) => row.outcomeInputStatus === 'ready_for_read_only_outcome_replay');
  const excludedRows = sourceRows.filter((row) => row.outcomeInputStatus !== 'ready_for_read_only_outcome_replay');
  const blockers = [
    !args.replayPackagePath ? 'missing source replay package path' : null,
    !args.replayPackageReport ? 'missing source replay package report' : null,
    args.replayPackageReport && args.replayPackageReport.summary.livePromotionAllowedRows !== 0 ? 'source package had live-promotion rows' : null,
    readyRows.length === 0 ? 'source package had no ready outcome replay rows' : null,
  ].filter((item): item is string => Boolean(item));
  const source = args.replayPackageReport?.source || { reportDir: '', triageReportPath: null, auditDir: '' };
  const authority = args.replayPackageReport?.authority || {
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
  } as const;
  const base: Omit<UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority,
    source: {
      ...source,
      originalReplayPackagePath: args.replayPackagePath,
    },
    assumptions: {
      selectedRowsComeFromReadOnlyTriage: true,
      usesScannerDecisionTapeCompleted5mOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsNotCalculatedInThisStep: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRowsRead: readyRows.length,
      replayPackageRows: readyRows.length,
      readyRows: readyRows.length,
      blockedRows: 0,
      directionallyInvalidGeometryRows: excludedRows.filter((row) => row.blockers.includes('directionally invalid entry-to-stop geometry')).length,
      modelGroups: new Set(readyRows.map((row) => row.setupType)).size,
      sessionGroups: new Set(readyRows.map((row) => row.session)).size,
      livePromotionAllowedRows: 0,
      originalReplayPackageRows: sourceRows.length,
      excludedBlockedRows: excludedRows.length,
    },
    rows: readyRows,
    excludedRows,
    blockers,
    recommendations: blockers.length
      ? ['Do not run outcome replay until the source package has ready rows and no live-promotion rows.']
      : [
        'Run the read-only outcome pass against this ready-row package.',
        'Investigate excluded blocked rows separately; do not repair or infer their levels inside this filter.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-ready-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseUnifiedPositiveHeldLocalPreviewReadyReplayPackageArgs();
  const replayPackageReport = options.replayPackagePath && fs.existsSync(options.replayPackagePath)
    ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(options.replayPackagePath)
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewReadyReplayPackageReport({
    replayPackagePath: options.replayPackagePath,
    replayPackageReport,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
