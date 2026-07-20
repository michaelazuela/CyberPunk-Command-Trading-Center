import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;

interface ProxyResult {
  proxyId: string;
  supported: boolean;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
}

interface ValidationRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  proofTime: string;
  proofRankInSlate: number;
  riskPoints: number;
  matchedProxyIds: string[];
  outcomeBucket: string;
  resolvedOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_oos_validation';
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
    oosSourceProofTimingPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    appliesDiscoveredProxyIdsToOosRows: true;
    changedSlateProxyUnsupportedWithoutSelectionSimulation: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    selectedRows: number;
    rejectedRows: number;
    sourceWinners: number;
    sourceLosses: number;
    sourceUnresolved: number;
    sourceOneMesPl: number | null;
    selectedWinners: number;
    selectedLosses: number;
    selectedUnresolved: number;
    selectedOneMesPl: number | null;
    rejectedLosses: number;
    rejectedOneMesPl: number | null;
    supportedProxyIds: number;
    unsupportedProxyIds: number;
    livePromotionAllowedRows: 0;
    recommendation: 'oos_selector_survives_research_only' | 'investigate_oos_losses' | 'fix_inputs';
  };
  proxyResults: ProxyResult[];
  rows: ValidationRow[];
  unsupportedProxyIds: string[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport['authority'] {
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
  return row.outcomeBucket === 'winner_t1_t2';
}

function isLoss(row: { outcomeBucket: string }): boolean {
  return row.outcomeBucket === 'loss_stopped_before_t1';
}

function riskBucket(riskPoints: number): string {
  if (riskPoints <= 6) return '<=6';
  if (riskPoints <= 8) return '6.25-8';
  if (riskPoints <= 10) return '8.25-10';
  if (riskPoints <= 12) return '10.25-12';
  return '>12';
}

function proxyIds(validationPackage: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport | null): string[] {
  const ids = validationPackage?.rows.flatMap((row) => row.matchedProxyIds) || [];
  return [...new Set(ids)].sort();
}

function parseProxy(proxyId: string): { featureSet: string; featureValue: string } {
  const splitAt = proxyId.indexOf(':');
  return splitAt < 0
    ? { featureSet: proxyId, featureValue: '' }
    : { featureSet: proxyId.slice(0, splitAt), featureValue: proxyId.slice(splitAt + 1) };
}

function proofRanks(rows: TimingRow[]): Map<string, number> {
  const grouped = new Map<string, TimingRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}|${row.setupType}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  const ranks = new Map<string, number>();
  for (const group of grouped.values()) {
    group
      .sort((a, b) => a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId))
      .forEach((row, index) => ranks.set(row.ticketId, index + 1));
  }
  return ranks;
}

function featureValue(row: TimingRow, featureSet: string, rank: number): string | null {
  const risk = riskBucket(row.riskPoints);
  const hour = row.proofTime.slice(11, 13);
  const proofRank = rank === 1 ? 'first' : 'later';
  if (featureSet === 'risk') return risk;
  if (featureSet === 'proofHour') return hour;
  if (featureSet === 'proofRank') return proofRank;
  if (featureSet === 'direction') return row.direction;
  if (featureSet === 'changedSlate') return null;
  if (featureSet === 'risk+hour') return `${risk}|${hour}`;
  if (featureSet === 'risk+rank') return `${risk}|${proofRank}`;
  if (featureSet === 'risk+direction') return `${risk}|${row.direction}`;
  if (featureSet === 'hour+direction') return `${hour}|${row.direction}`;
  return null;
}

function matchesProxy(row: TimingRow, proxyId: string, rank: number): boolean {
  const proxy = parseProxy(proxyId);
  return featureValue(row, proxy.featureSet, rank) === proxy.featureValue;
}

function buildRows(rows: TimingRow[], proxies: string[]): ValidationRow[] {
  const ranks = proofRanks(rows);
  return rows.flatMap((row) => {
    const rank = ranks.get(row.ticketId) || 1;
    const matchedProxyIds = proxies.filter((proxyId) => matchesProxy(row, proxyId, rank));
    if (!matchedProxyIds.length) return [];
    return [{
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      direction: row.direction,
      proofTime: row.proofTime,
      proofRankInSlate: rank,
      riskPoints: row.riskPoints,
      matchedProxyIds,
      outcomeBucket: row.outcomeBucket,
      resolvedOneMesPl: row.resolvedOneMesPl,
    }];
  }).sort((a, b) => `${a.tradeDate}|${a.proofTime}|${a.ticketId}`.localeCompare(`${b.tradeDate}|${b.proofTime}|${b.ticketId}`));
}

function summarizeProxy(proxyId: string, sourceRows: TimingRow[], selectedRows: ValidationRow[]): ProxyResult {
  const proxy = parseProxy(proxyId);
  const supported = sourceRows.some((row) => featureValue(row, proxy.featureSet, 1) !== null);
  const rows = selectedRows.filter((row) => row.matchedProxyIds.includes(proxyId));
  return {
    proxyId,
    supported,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    unresolved: rows.filter((row) => !isWinner(row) && !isLoss(row)).length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Time Proxy OOS Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only out-of-sample validation over saved source/proof timing rows. It does not run setupScanner, post Discord, write Supabase, read the bridge, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source/selected/rejected rows: ${report.summary.sourceRows}/${report.summary.selectedRows}/${report.summary.rejectedRows}.`,
    `- Source W/L/U and P/L: ${report.summary.sourceWinners}/${report.summary.sourceLosses}/${report.summary.sourceUnresolved}, ${report.summary.sourceOneMesPl ?? 'not available'}.`,
    `- Selected W/L/U and P/L: ${report.summary.selectedWinners}/${report.summary.selectedLosses}/${report.summary.selectedUnresolved}, ${report.summary.selectedOneMesPl ?? 'not available'}.`,
    `- Rejected losses/P&L: ${report.summary.rejectedLosses}/${report.summary.rejectedOneMesPl ?? 'not available'}.`,
    `- Supported/unsupported proxy IDs: ${report.summary.supportedProxyIds}/${report.summary.unsupportedProxyIds}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proxy Results',
    '| Proxy | Supported | Rows | W/L/U | P/L |',
    '|---|---|---:|---|---:|',
    ...report.proxyResults.map((row) => `| ${escapeTable(row.proxyId)} | ${row.supported} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport(args: {
  reportDir?: string;
  validationPackagePath?: string | null;
  oosSourceProofTimingPath?: string | null;
  validationPackageReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport | null;
  oosSourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const validationPackagePath = args.validationPackagePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package-');
  const oosSourceProofTimingPath = args.oosSourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const validationPackage = args.validationPackageReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport>(validationPackagePath);
  const oosSourceProofTiming = args.oosSourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(oosSourceProofTimingPath);
  const proxies = proxyIds(validationPackage);
  const sourceRows = (oosSourceProofTiming?.rows || []).filter((row) => row.setupType === SETUP);
  const rows = buildRows(sourceRows, proxies);
  const selectedIds = new Set(rows.map((row) => row.ticketId));
  const rejectedRows = sourceRows.filter((row) => !selectedIds.has(row.ticketId));
  const proxyResults = proxies.map((proxyId) => summarizeProxy(proxyId, sourceRows, rows));
  const unsupportedProxyIds = proxyResults.filter((row) => !row.supported).map((row) => row.proxyId);
  const blockers = [
    !validationPackagePath && !args.validationPackageReport ? 'missing AfterLunch proof-time proxy validation package path' : null,
    !validationPackage ? 'missing AfterLunch proof-time proxy validation package' : null,
    validationPackage && validationPackage.status !== 'pass' ? `AfterLunch proof-time proxy validation package status ${validationPackage.status}` : null,
    !oosSourceProofTimingPath && !args.oosSourceProofTimingReport ? 'missing OOS source/proof timing path' : null,
    !oosSourceProofTiming ? 'missing OOS source/proof timing report' : null,
    oosSourceProofTiming && oosSourceProofTiming.status !== 'pass' ? `OOS source/proof timing status ${oosSourceProofTiming.status}` : null,
    proxies.length === 0 ? 'no proxy IDs found in validation package' : null,
    sourceRows.length === 0 ? 'no OOS AfterLunch source/proof timing rows found' : null,
    rows.length === 0 ? 'no OOS AfterLunch rows matched supported proof-time proxy selectors' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_oos_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, validationPackagePath, oosSourceProofTimingPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      appliesDiscoveredProxyIdsToOosRows: true,
      changedSlateProxyUnsupportedWithoutSelectionSimulation: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      selectedRows: rows.length,
      rejectedRows: rejectedRows.length,
      sourceWinners: sourceRows.filter(isWinner).length,
      sourceLosses: sourceRows.filter(isLoss).length,
      sourceUnresolved: sourceRows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      sourceOneMesPl: sum(sourceRows.map((row) => row.resolvedOneMesPl)),
      selectedWinners: rows.filter(isWinner).length,
      selectedLosses: rows.filter(isLoss).length,
      selectedUnresolved: rows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      selectedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      rejectedLosses: rejectedRows.filter(isLoss).length,
      rejectedOneMesPl: sum(rejectedRows.map((row) => row.resolvedOneMesPl)),
      supportedProxyIds: proxyResults.filter((row) => row.supported).length,
      unsupportedProxyIds: unsupportedProxyIds.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : rows.some(isLoss) || rows.some((row) => !isWinner(row) && !isLoss(row))
          ? 'investigate_oos_losses'
          : 'oos_selector_survives_research_only',
    },
    proxyResults,
    rows,
    unsupportedProxyIds,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved validation/OOS source timing inputs before using this selector report.']
      : rows.some(isLoss) || rows.some((row) => !isWinner(row) && !isLoss(row))
        ? [
          'Investigate selected OOS losses or unresolved rows before any scanner-visible proposal.',
          'Do not install live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, or risk changes from this report.',
        ]
        : [
          'The supported proof-time proxy selectors survived this OOS source/proof timing set with no selected losses.',
          'Run one more slate-level comparison to prove whether selecting these rows improves top-candidate choice, because this report validates row quality only.',
          'Do not install live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, or risk changes from this report.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosValidationReport({
    reportDir,
    validationPackagePath: readFlag(args, '--validation-package') || undefined,
    oosSourceProofTimingPath: readFlag(args, '--oos-source-proof-timing') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-proof-time-proxy-oos-validation-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary, proxyResults: report.proxyResults, unsupportedProxyIds: report.unsupportedProxyIds, blockers: report.blockers }, null, 2));
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
