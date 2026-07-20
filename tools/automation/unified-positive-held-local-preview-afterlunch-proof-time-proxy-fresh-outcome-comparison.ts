import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';

interface ComparisonRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  expectedOutcomeBucket: string;
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

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_fresh_outcome_comparison';
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
    freshOutcomePath: string | null;
  };
  assumptions: {
    consumesSavedValidationAndFreshOutcomeReportsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noFreshMarketDataLoadedByComparison: true;
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
    recommendation: 'ready_for_out_of_sample_replay' | 'investigate_divergence' | 'fix_inputs';
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport['authority'] {
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

function expectedLabel(outcomeBucket: string): string {
  if (outcomeBucket === 'winner_t1_t2') return 't1_and_t2_hit';
  if (outcomeBucket === 'winner_t1_only') return 't1_hit_only';
  if (outcomeBucket.startsWith('loss')) return 'stopped_before_t1';
  if (outcomeBucket.includes('no_fill')) return 'no_fill';
  return outcomeBucket;
}

function outcomeMap(rows: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow[]): Map<string, UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow> {
  return new Map(rows.map((row) => [row.ticketId, row]));
}

function plMatches(expected: number | null, actual: number | null): boolean {
  if (expected === null || actual === null) return expected === actual;
  return Math.abs(expected - actual) < 0.01;
}

function comparisonRows(
  validationPackage: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport | null,
  freshOutcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null,
): ComparisonRow[] {
  const freshByTicket = outcomeMap(freshOutcome?.rows || []);
  return (validationPackage?.rows || []).map((expected) => {
    const actual = freshByTicket.get(expected.ticketId);
    const normalizedExpected = expectedLabel(expected.outcomeBucket);
    return {
      ticketId: expected.ticketId,
      tradeDate: expected.tradeDate,
      session: expected.session,
      setupType: expected.setupType,
      direction: expected.direction,
      expectedOutcomeBucket: expected.outcomeBucket,
      expectedOutcomeLabel: normalizedExpected,
      freshOutcomeLabel: actual?.outcomeLabel || null,
      expectedOneMesPl: expected.resolvedOneMesPl,
      freshOneMesPl: actual?.resolvedOneMesPl ?? null,
      matchesOutcome: normalizedExpected === actual?.outcomeLabel,
      matchesPl: plMatches(expected.resolvedOneMesPl, actual?.resolvedOneMesPl ?? null),
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Time Proxy Fresh Outcome Comparison',
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

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport(args: {
  reportDir?: string;
  validationPackagePath?: string | null;
  freshOutcomePath?: string | null;
  validationPackageReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport | null;
  freshOutcomeReport?: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const validationPackagePath = args.validationPackagePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package-');
  const freshOutcomePath = args.freshOutcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const validationPackage = args.validationPackageReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport>(validationPackagePath);
  const freshOutcome = args.freshOutcomeReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(freshOutcomePath);
  const rows = comparisonRows(validationPackage, freshOutcome);
  const missingFreshRows = rows.filter((row) => !row.freshOutcomeLabel).map((row) => row.ticketId).sort();
  const divergentRows = rows.filter((row) => !row.matchesOutcome || !row.matchesPl);
  const freshRows = freshOutcome?.rows || [];
  const blockers = [
    !validationPackagePath && !args.validationPackageReport ? 'missing AfterLunch proof-time proxy validation package path' : null,
    !validationPackage ? 'missing AfterLunch proof-time proxy validation package' : null,
    validationPackage && validationPackage.status !== 'pass' ? `AfterLunch proof-time proxy validation package status ${validationPackage.status}` : null,
    !freshOutcomePath && !args.freshOutcomeReport ? 'missing fresh outcome path' : null,
    !freshOutcome ? 'missing fresh outcome report' : null,
    freshOutcome && freshOutcome.status !== 'pass' ? `fresh outcome status ${freshOutcome.status}` : null,
    rows.length === 0 ? 'no validation rows to compare' : null,
    ...missingFreshRows.map((ticketId) => `${ticketId}: missing fresh outcome row`),
  ].filter((item): item is string => Boolean(item));
  const freshLosses = freshRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length;
  const freshUnresolved = freshRows.filter((row) => row.outcomeStatus === 'unresolved').length;
  const freshBlocked = freshRows.filter((row) => row.outcomeStatus === 'blocked').length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_fresh_outcome_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, validationPackagePath, freshOutcomePath },
    assumptions: {
      consumesSavedValidationAndFreshOutcomeReportsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshMarketDataLoadedByComparison: true,
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
          : 'ready_for_out_of_sample_replay',
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
        'Next proof should use out-of-sample/latest scanner artifacts; do not change live ranking from in-sample comparison alone.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport({
    reportDir,
    validationPackagePath: readFlag(args, '--validation-package') || undefined,
    freshOutcomePath: readFlag(args, '--fresh-outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-proof-time-proxy-fresh-outcome-comparison-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary, byModel: report.byModel, blockers: report.blockers }, null, 2));
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
