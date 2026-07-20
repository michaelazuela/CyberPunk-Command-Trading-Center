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

interface SlateComparison {
  slateId: string;
  rows: number;
  matchedRows: number;
  baselineTicketId: string | null;
  baselineOutcomeBucket: string | null;
  baselineOneMesPl: number | null;
  selectorTicketId: string | null;
  selectorOutcomeBucket: string | null;
  selectorOneMesPl: number | null;
  selectorUsedFallback: boolean;
  topChanged: boolean;
  deltaOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_oos_slate_comparison';
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
    baselineUsesEarliestProofPerSlate: true;
    selectorUsesEarliestProxyMatchPerSlateElseBaseline: true;
    changedSlateProxyUnsupportedWithoutSelectionSimulation: true;
    outcomesUsedOnlyForEvaluation: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    rows: number;
    slates: number;
    slatesWithProxyMatch: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    selectorTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    changedResolvedDeltaOneMesPl: number | null;
    selectorChosenLosses: number;
    selectorMatchedLosses: number;
    livePromotionAllowedRows: 0;
    recommendation: 'do_not_install_rank_boost' | 'candidate_for_additional_slate_validation' | 'fix_inputs';
  };
  slates: SlateComparison[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport['authority'] {
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

function isLoss(row: Pick<TimingRow, 'outcomeBucket'>): boolean {
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
  return [...new Set(validationPackage?.rows.flatMap((row) => row.matchedProxyIds) || [])].sort();
}

function parseProxy(proxyId: string): { featureSet: string; featureValue: string } {
  const splitAt = proxyId.indexOf(':');
  return splitAt < 0
    ? { featureSet: proxyId, featureValue: '' }
    : { featureSet: proxyId.slice(0, splitAt), featureValue: proxyId.slice(splitAt + 1) };
}

function compareProof(a: TimingRow, b: TimingRow): number {
  return a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId);
}

function groupBySlate(rows: TimingRow[]): Map<string, TimingRow[]> {
  const groups = new Map<string, TimingRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}|${row.setupType}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function proofRanks(rows: TimingRow[]): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const group of groupBySlate(rows).values()) {
    [...group].sort(compareProof).forEach((row, index) => ranks.set(row.ticketId, index + 1));
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

function unsupportedProxyIds(proxyIdsList: string[], rows: TimingRow[]): string[] {
  return proxyIdsList.filter((proxyId) => {
    const proxy = parseProxy(proxyId);
    return !rows.some((row) => featureValue(row, proxy.featureSet, 1) !== null);
  });
}

function matchesProxy(row: TimingRow, proxies: string[], rank: number): boolean {
  return proxies.some((proxyId) => {
    const proxy = parseProxy(proxyId);
    return featureValue(row, proxy.featureSet, rank) === proxy.featureValue;
  });
}

function buildSlates(rows: TimingRow[], proxies: string[]): SlateComparison[] {
  const ranks = proofRanks(rows);
  return [...groupBySlate(rows).entries()].map(([slateId, slateRows]) => {
    const sorted = [...slateRows].sort(compareProof);
    const baseline = sorted[0] || null;
    const matched = sorted.filter((row) => matchesProxy(row, proxies, ranks.get(row.ticketId) || 1));
    const selector = matched[0] || baseline;
    return {
      slateId,
      rows: slateRows.length,
      matchedRows: matched.length,
      baselineTicketId: baseline?.ticketId || null,
      baselineOutcomeBucket: baseline?.outcomeBucket || null,
      baselineOneMesPl: baseline?.resolvedOneMesPl ?? null,
      selectorTicketId: selector?.ticketId || null,
      selectorOutcomeBucket: selector?.outcomeBucket || null,
      selectorOneMesPl: selector?.resolvedOneMesPl ?? null,
      selectorUsedFallback: matched.length === 0,
      topChanged: Boolean(baseline && selector && baseline.ticketId !== selector.ticketId),
      deltaOneMesPl: typeof baseline?.resolvedOneMesPl === 'number' && typeof selector?.resolvedOneMesPl === 'number'
        ? round(selector.resolvedOneMesPl - baseline.resolvedOneMesPl)
        : null,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Time Proxy OOS Slate Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only slate comparison. It reads saved validation and OOS source/proof timing reports only and does not run setupScanner, post Discord, write Supabase, read the bridge, install rank behavior, loosen canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Rows/slates: ${report.summary.rows}/${report.summary.slates}.`,
    `- Slates with proxy match: ${report.summary.slatesWithProxyMatch}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/selector top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.selectorTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Changed resolved delta: ${report.summary.changedResolvedDeltaOneMesPl ?? '-'}.`,
    `- Selector chosen/matched losses: ${report.summary.selectorChosenLosses}/${report.summary.selectorMatchedLosses}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Slates',
    '| Slate | Rows | Matches | Baseline | Selector | Fallback | Changed | Delta |',
    '|---|---:|---:|---|---|---|---|---:|',
    ...report.slates.map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${row.matchedRows} | ${row.baselineOutcomeBucket ?? '-'} ${row.baselineOneMesPl ?? '-'} | ${row.selectorOutcomeBucket ?? '-'} ${row.selectorOneMesPl ?? '-'} | ${row.selectorUsedFallback} | ${row.topChanged} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport(args: {
  reportDir?: string;
  validationPackagePath?: string | null;
  oosSourceProofTimingPath?: string | null;
  validationPackageReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport | null;
  oosSourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const validationPackagePath = args.validationPackagePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package-');
  const oosSourceProofTimingPath = args.oosSourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const validationPackage = args.validationPackageReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport>(validationPackagePath);
  const oosSourceProofTiming = args.oosSourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(oosSourceProofTimingPath);
  const proxies = proxyIds(validationPackage);
  const rows = (oosSourceProofTiming?.rows || []).filter((row) => row.setupType === SETUP);
  const slates = buildSlates(rows, proxies);
  const unsupported = unsupportedProxyIds(proxies, rows);
  const changed = slates.filter((slate) => slate.topChanged);
  const baselineTopOneMesPl = sum(slates.map((slate) => slate.baselineOneMesPl));
  const selectorTopOneMesPl = sum(slates.map((slate) => slate.selectorOneMesPl));
  const delta = baselineTopOneMesPl === null || selectorTopOneMesPl === null ? null : round(selectorTopOneMesPl - baselineTopOneMesPl);
  const matchedTicketIds = new Set(slates.flatMap((slate) => rows
    .filter((row) => `${row.tradeDate}|${row.session}|${row.setupType}` === slate.slateId)
    .filter((row) => matchesProxy(row, proxies, proofRanks(rows).get(row.ticketId) || 1))
    .map((row) => row.ticketId)));
  const selectorMatchedLosses = rows.filter((row) => matchedTicketIds.has(row.ticketId) && isLoss(row)).length;
  const blockers = [
    !validationPackagePath && !args.validationPackageReport ? 'missing AfterLunch proof-time proxy validation package path' : null,
    !validationPackage ? 'missing AfterLunch proof-time proxy validation package' : null,
    validationPackage && validationPackage.status !== 'pass' ? `AfterLunch proof-time proxy validation package status ${validationPackage.status}` : null,
    !oosSourceProofTimingPath && !args.oosSourceProofTimingReport ? 'missing OOS source/proof timing path' : null,
    !oosSourceProofTiming ? 'missing OOS source/proof timing report' : null,
    oosSourceProofTiming && oosSourceProofTiming.status !== 'pass' ? `OOS source/proof timing status ${oosSourceProofTiming.status}` : null,
    proxies.length === 0 ? 'no proxy IDs found in validation package' : null,
    rows.length === 0 ? 'no OOS AfterLunch source/proof timing rows found' : null,
    slates.every((slate) => slate.matchedRows === 0) ? 'no OOS AfterLunch slates had a proxy match' : null,
  ].filter((item): item is string => Boolean(item));
  const candidate = !blockers.length && (delta ?? 0) > 0 && selectorMatchedLosses === 0;
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_oos_slate_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, validationPackagePath, oosSourceProofTimingPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      baselineUsesEarliestProofPerSlate: true,
      selectorUsesEarliestProxyMatchPerSlateElseBaseline: true,
      changedSlateProxyUnsupportedWithoutSelectionSimulation: true,
      outcomesUsedOnlyForEvaluation: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      rows: rows.length,
      slates: slates.length,
      slatesWithProxyMatch: slates.filter((slate) => slate.matchedRows > 0).length,
      changedSlates: changed.length,
      baselineTopOneMesPl,
      selectorTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      changedResolvedDeltaOneMesPl: sum(changed.map((slate) => slate.deltaOneMesPl)),
      selectorChosenLosses: slates.filter((slate) => slate.selectorOutcomeBucket === 'loss_stopped_before_t1').length,
      selectorMatchedLosses,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : candidate ? 'candidate_for_additional_slate_validation' : 'do_not_install_rank_boost',
    },
    slates,
    unsupportedProxyIds: unsupported,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved validation/OOS source timing inputs before using this slate comparison.']
      : candidate
        ? [
          'Proxy selector improved OOS top selection in this slate comparison, but still requires broader validation before any scanner-visible proposal.',
          'No live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, or risk behavior is changed.',
        ]
        : [
          'Do not install the proof-time proxy as a rank boost: OOS slate selection did not improve versus earliest proof.',
          'Keep the selector as research/review evidence only unless a separate structural field proves a positive slate-level effect.',
          'No live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, or risk behavior is changed.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport({
    reportDir,
    validationPackagePath: readFlag(args, '--validation-package') || undefined,
    oosSourceProofTimingPath: readFlag(args, '--oos-source-proof-timing') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-proof-time-proxy-oos-slate-comparison-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary, unsupportedProxyIds: report.unsupportedProxyIds, blockers: report.blockers }, null, 2));
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
