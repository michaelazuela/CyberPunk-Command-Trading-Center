import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type PackageRow = UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport['rows'][number];
type SourceRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];

interface GroupSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface ComparisonRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  proofTime: string;
  riskPoints: number;
  matchedProxyIds: string[];
  outcomeBucket: string;
  resolvedOneMesPl: number | null;
  sourceOutcomeBucket: string | null;
  sourceResolvedOneMesPl: number | null;
  sourceMatch: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_source_comparison';
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
    validationPackagePath: string | null;
    sourceProofTimingPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    comparesPackageAgainstFullAfterLunchSource: true;
    outcomeFieldsAreEvaluationOnly: true;
    noFreshReplayRunByThisReport: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    packageRows: number;
    matchedPackageRows: number;
    missingSourceRows: number;
    packageWinners: number;
    packageLosses: number;
    packageUnresolved: number;
    packageOneMesPl: number | null;
    fullSourceWinners: number;
    fullSourceLosses: number;
    fullSourceUnresolved: number;
    fullSourceOneMesPl: number | null;
    excludedSourceRows: number;
    excludedSourceLosses: number;
    excludedSourceOneMesPl: number | null;
    packageCoveragePct: number;
    freshReplayValidated: false;
    livePromotionAllowedRows: 0;
    recommendation: 'build_fresh_outcome_replay_for_package' | 'fix_inputs';
  };
  byProxy: GroupSummary[];
  byDate: GroupSummary[];
  rows: ComparisonRow[];
  missingSourceRows: string[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'AfterLunchDriveFvgContinuation';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport['authority'] {
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

function isWinner(row: { outcomeBucket: string }): boolean {
  return row.outcomeBucket.startsWith('winner');
}

function isLoss(row: { outcomeBucket: string }): boolean {
  return row.outcomeBucket.startsWith('loss');
}

function buildComparisonRows(packageRows: PackageRow[], sourceRows: SourceRow[]): ComparisonRow[] {
  const sourceByTicket = new Map(sourceRows.map((row) => [row.ticketId, row]));
  return packageRows.map((row) => {
    const source = sourceByTicket.get(row.ticketId);
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      direction: row.direction,
      proofTime: row.proofTime,
      riskPoints: row.riskPoints,
      matchedProxyIds: row.matchedProxyIds,
      outcomeBucket: row.outcomeBucket,
      resolvedOneMesPl: row.resolvedOneMesPl,
      sourceOutcomeBucket: source?.outcomeBucket || null,
      sourceResolvedOneMesPl: source?.resolvedOneMesPl ?? null,
      sourceMatch: Boolean(source) &&
        source.outcomeBucket === row.outcomeBucket &&
        Math.abs((source.resolvedOneMesPl ?? 0) - (row.resolvedOneMesPl ?? 0)) < 0.01,
    };
  });
}

function summarize(key: string, rows: Array<PackageRow | SourceRow>): GroupSummary {
  return {
    key,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    unresolved: rows.filter((row) => !isWinner(row) && !isLoss(row)).length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function groupPackageRows(rows: PackageRow[], keyFn: (row: PackageRow) => string[]): GroupSummary[] {
  const groups = new Map<string, PackageRow[]>();
  for (const row of rows) {
    for (const key of keyFn(row)) groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()]
    .map(([key, groupRows]) => summarize(key, groupRows))
    .sort((a, b) => (b.oneMesPl ?? 0) - (a.oneMesPl ?? 0) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Time Proxy Source Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only comparison. It reads saved package/source reports only and does not run fresh replay, setupScanner, Discord, Supabase, bridge reads, canExecute changes, live ranking, or trade math changes.',
    '',
    '## Summary',
    `- Package/full source rows: ${report.summary.packageRows}/${report.summary.sourceRows}.`,
    `- Matched package rows: ${report.summary.matchedPackageRows}.`,
    `- Missing source rows: ${report.summary.missingSourceRows}.`,
    `- Package W/L/U and P/L: ${report.summary.packageWinners}/${report.summary.packageLosses}/${report.summary.packageUnresolved}, ${report.summary.packageOneMesPl ?? 'not available'}.`,
    `- Full source W/L/U and P/L: ${report.summary.fullSourceWinners}/${report.summary.fullSourceLosses}/${report.summary.fullSourceUnresolved}, ${report.summary.fullSourceOneMesPl ?? 'not available'}.`,
    `- Excluded source rows/losses/P&L: ${report.summary.excludedSourceRows}/${report.summary.excludedSourceLosses}/${report.summary.excludedSourceOneMesPl ?? 'not available'}.`,
    `- Package coverage: ${report.summary.packageCoveragePct}%.`,
    `- Fresh replay validated: ${report.summary.freshReplayValidated}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proxy Summary',
    '| Proxy | Rows | W/L/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.byProxy.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Date Summary',
    '| Date | Rows | W/L/U | P/L | Avg Risk |',
    '|---|---:|---|---:|---:|',
    ...report.byDate.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport(args: {
  reportDir?: string;
  validationPackagePath?: string | null;
  sourceProofTimingPath?: string | null;
  validationPackageReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const validationPackagePath = args.validationPackagePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package-');
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const validationPackage = args.validationPackageReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport>(validationPackagePath);
  const sourceProofTiming = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const packageRows = validationPackage?.rows || [];
  const sourceRows = (sourceProofTiming?.rows || []).filter((row) => row.setupType === SETUP);
  const packageIds = new Set(packageRows.map((row) => row.ticketId));
  const excludedSourceRows = sourceRows.filter((row) => !packageIds.has(row.ticketId));
  const rows = buildComparisonRows(packageRows, sourceRows);
  const missingSourceRows = rows.filter((row) => !row.sourceOutcomeBucket).map((row) => row.ticketId).sort();
  const blockers = [
    !validationPackagePath && !args.validationPackageReport ? 'missing AfterLunch proxy validation package path' : null,
    !validationPackage ? 'missing AfterLunch proxy validation package report' : null,
    validationPackage && validationPackage.status !== 'pass' ? `AfterLunch proxy validation package status ${validationPackage.status}` : null,
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !sourceProofTiming ? 'missing source/proof timing report' : null,
    sourceProofTiming && sourceProofTiming.status !== 'pass' ? `source/proof timing status ${sourceProofTiming.status}` : null,
    packageRows.length === 0 ? 'no package rows found' : null,
    sourceRows.length === 0 ? 'no AfterLunch source rows found' : null,
    ...missingSourceRows.map((ticketId) => `${ticketId}: missing source/proof timing row`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_source_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, validationPackagePath, sourceProofTimingPath },
    assumptions: {
      savedReportsOnly: true,
      comparesPackageAgainstFullAfterLunchSource: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshReplayRunByThisReport: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      packageRows: packageRows.length,
      matchedPackageRows: rows.filter((row) => row.sourceMatch).length,
      missingSourceRows: missingSourceRows.length,
      packageWinners: packageRows.filter(isWinner).length,
      packageLosses: packageRows.filter(isLoss).length,
      packageUnresolved: packageRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      packageOneMesPl: sum(packageRows.map((row) => row.resolvedOneMesPl)),
      fullSourceWinners: sourceRows.filter(isWinner).length,
      fullSourceLosses: sourceRows.filter(isLoss).length,
      fullSourceUnresolved: sourceRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      fullSourceOneMesPl: sum(sourceRows.map((row) => row.resolvedOneMesPl)),
      excludedSourceRows: excludedSourceRows.length,
      excludedSourceLosses: excludedSourceRows.filter(isLoss).length,
      excludedSourceOneMesPl: sum(excludedSourceRows.map((row) => row.resolvedOneMesPl)),
      packageCoveragePct: sourceRows.length ? round((packageRows.length / sourceRows.length) * 100) : 0,
      freshReplayValidated: false,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'build_fresh_outcome_replay_for_package',
    },
    byProxy: groupPackageRows(packageRows, (row) => row.matchedProxyIds),
    byDate: groupPackageRows(packageRows, (row) => [row.tradeDate]),
    rows,
    missingSourceRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved package/source inputs before using this comparison.']
      : [
        'Build an actual fresh outcome replay for the package rows before any scanner-visible proposal.',
        'This comparison proves package/source alignment only; it does not prove out-of-sample transfer.',
        'No live ranking, canExecute, Discord, Supabase, setupScanner, bridge, entry, stop, target, or risk behavior is changed.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport({
    reportDir,
    validationPackagePath: readFlag(args, '--validation-package') || undefined,
    sourceProofTimingPath: readFlag(args, '--source-proof-timing') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-proof-time-proxy-source-comparison-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary, byProxy: report.byProxy, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${jsonPath}`);
    console.log(`Report Markdown: ${markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
