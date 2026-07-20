import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport,
} from './unified-positive-held-local-preview-afterlunch-adverse-no-lookahead-separator';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-afterlunch-proof-context-enrichment';

type SeparatorRow = UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport['separators'][number];
type EnrichedRow = UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport['rows'][number];

interface PackageRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: 'AfterLunchDriveFvgContinuation';
  direction: string;
  proofTime: string;
  riskPoints: number;
  proofRankInSlate: number;
  firstValidProof: boolean;
  changedSlateRow: boolean;
  matchedProxyIds: string[];
  outcomeBucket: string;
  resolvedOneMesPl: number | null;
  replayValidationStatus: 'queued_for_fresh_validation';
}

interface ProxySummary {
  proxyId: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_validation_package';
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
    separatorPath: string | null;
    proofContextEnrichmentPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    packagesResearchCandidatesOnly: true;
    excludesLookaheadRejectedSeparators: true;
    outcomeFieldsAreEvaluationOnly: true;
    noFreshReplayRunByThisReport: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    researchProxyCandidates: number;
    packageRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    oneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'run_fresh_replay_validation' | 'fix_inputs';
  };
  proxySummaries: ProxySummary[];
  rows: PackageRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport['authority'] {
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

function isWinner(row: { outcomeBucket: string }): boolean {
  return row.outcomeBucket.startsWith('winner');
}

function isLoss(row: { outcomeBucket: string }): boolean {
  return row.outcomeBucket.startsWith('loss');
}

function riskBucket(riskPoints: number): string {
  if (riskPoints <= 6) return '<=6';
  if (riskPoints <= 8) return '6.25-8';
  if (riskPoints <= 10) return '8.25-10';
  if (riskPoints <= 12) return '10.25-12';
  return '>12';
}

function featureValue(row: EnrichedRow, featureSet: string): string {
  const risk = riskBucket(row.riskPoints);
  const hour = row.proofTime.slice(11, 13);
  const rank = row.firstValidProof ? 'first' : 'later';
  if (featureSet === 'risk') return risk;
  if (featureSet === 'proofHour') return hour;
  if (featureSet === 'proofRank') return rank;
  if (featureSet === 'direction') return row.direction;
  if (featureSet === 'changedSlate') return String(row.changedSlateRow);
  if (featureSet === 'risk+hour') return `${risk}|${hour}`;
  if (featureSet === 'risk+rank') return `${risk}|${rank}`;
  if (featureSet === 'risk+direction') return `${risk}|${row.direction}`;
  if (featureSet === 'hour+direction') return `${hour}|${row.direction}`;
  return '';
}

function matchesProxy(row: EnrichedRow, proxy: SeparatorRow): boolean {
  return !proxy.usesFuturePathEvidence &&
    proxy.decision === 'research_candidate' &&
    featureValue(row, proxy.featureSet) === proxy.featureValue;
}

function toPackageRows(rows: EnrichedRow[], proxies: SeparatorRow[]): PackageRow[] {
  return rows.flatMap((row) => {
    const matchedProxyIds = proxies.filter((proxy) => matchesProxy(row, proxy)).map((proxy) => proxy.separatorId);
    if (!matchedProxyIds.length) return [];
    const packageRow: PackageRow = {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      proofTime: row.proofTime,
      riskPoints: row.riskPoints,
      proofRankInSlate: row.proofRankInSlate,
      firstValidProof: row.firstValidProof,
      changedSlateRow: row.changedSlateRow,
      matchedProxyIds,
      outcomeBucket: row.outcomeBucket,
      resolvedOneMesPl: row.resolvedOneMesPl,
      replayValidationStatus: 'queued_for_fresh_validation',
    };
    return [packageRow];
  }).sort((a, b) => `${a.tradeDate}|${a.proofTime}|${a.ticketId}`.localeCompare(`${b.tradeDate}|${b.proofTime}|${b.ticketId}`));
}

function summarizeProxy(proxy: SeparatorRow, rows: PackageRow[]): ProxySummary {
  const selected = rows.filter((row) => row.matchedProxyIds.includes(proxy.separatorId));
  return {
    proxyId: proxy.separatorId,
    rows: selected.length,
    winners: selected.filter(isWinner).length,
    losses: selected.filter(isLoss).length,
    unresolved: selected.filter((row) => !isWinner(row) && !isLoss(row)).length,
    oneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Time Proxy Validation Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation package. It packages proof-time research candidates only and does not run fresh replay, setupScanner, Discord, Supabase, bridge reads, canExecute changes, or trade math changes.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Research proxy candidates: ${report.summary.researchProxyCandidates}.`,
    `- Package rows: ${report.summary.packageRows}.`,
    `- Package W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Package one-MES P/L: ${report.summary.oneMesPl ?? 'not available'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proxy Summaries',
    '| Proxy | Rows | W/L/U | P/L |',
    '|---|---:|---|---:|',
    ...report.proxySummaries.map((row) => `| ${row.proxyId.replace(/\|/g, '/')} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport(args: {
  reportDir?: string;
  separatorPath?: string | null;
  proofContextEnrichmentPath?: string | null;
  separatorReport?: UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport | null;
  proofContextEnrichmentReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const separatorPath = args.separatorPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-adverse-no-lookahead-separator-');
  const proofContextEnrichmentPath = args.proofContextEnrichmentPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-context-enrichment-');
  const separatorReport = args.separatorReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport>(separatorPath);
  const enrichmentReport = args.proofContextEnrichmentReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport>(proofContextEnrichmentPath);
  const rows = enrichmentReport?.rows || [];
  const proxies = (separatorReport?.separators || []).filter((proxy) => proxy.decision === 'research_candidate' && !proxy.usesFuturePathEvidence);
  const packageRows = toPackageRows(rows, proxies);
  const blockers = [
    !separatorPath && !args.separatorReport ? 'missing AfterLunch no-lookahead separator path' : null,
    !separatorReport ? 'missing AfterLunch no-lookahead separator report' : null,
    separatorReport && separatorReport.status !== 'pass' ? `AfterLunch no-lookahead separator status ${separatorReport.status}` : null,
    !proofContextEnrichmentPath && !args.proofContextEnrichmentReport ? 'missing AfterLunch proof-context enrichment path' : null,
    !enrichmentReport ? 'missing AfterLunch proof-context enrichment report' : null,
    enrichmentReport && enrichmentReport.status !== 'pass' ? `AfterLunch proof-context enrichment status ${enrichmentReport.status}` : null,
    proxies.length === 0 ? 'no proof-time research proxy candidates found' : null,
    packageRows.length === 0 ? 'no rows matched proof-time research proxy candidates' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_validation_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, separatorPath, proofContextEnrichmentPath },
    assumptions: {
      savedReportsOnly: true,
      packagesResearchCandidatesOnly: true,
      excludesLookaheadRejectedSeparators: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshReplayRunByThisReport: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      researchProxyCandidates: proxies.length,
      packageRows: packageRows.length,
      winners: packageRows.filter(isWinner).length,
      losses: packageRows.filter(isLoss).length,
      unresolved: packageRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      oneMesPl: sum(packageRows.map((row) => row.resolvedOneMesPl)),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'run_fresh_replay_validation',
    },
    proxySummaries: proxies.map((proxy) => summarizeProxy(proxy, packageRows)),
    rows: packageRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved separator/enrichment inputs before building the validation package.']
      : [
        'Run fresh replay validation on this package before any scanner-visible proposal.',
        'Do not use outcome fields as candidate selection inputs; they are included only to measure the package.',
        'No live ranking, canExecute, Discord, Supabase, setupScanner, bridge, entry, stop, target, or risk behavior is changed.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport({
    reportDir,
    separatorPath: readFlag(args, '--separator') || undefined,
    proofContextEnrichmentPath: readFlag(args, '--proof-context-enrichment') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary, proxySummaries: report.proxySummaries, blockers: report.blockers }, null, 2));
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
