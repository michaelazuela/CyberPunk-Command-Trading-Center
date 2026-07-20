import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-afterlunch-proof-context-enrichment';

type EnrichedRow = UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport['rows'][number];

interface SeparatorRow {
  separatorId: string;
  featureSet: string;
  featureValue: string;
  usesFuturePathEvidence: boolean;
  evaluatedRows: number;
  selectedRows: number;
  selectedWinners: number;
  selectedLosses: number;
  selectedUnresolved: number;
  rejectedWinners: number;
  rejectedLosses: number;
  selectedOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  selectedAdverseNoRows: number;
  selectedAdverseYesRows: number;
  adverseNoCoverage: number;
  decision: 'research_candidate' | 'lookahead_rejected' | 'rejected_for_now';
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_adverse_no_lookahead_separator';
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
    proofContextEnrichmentPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    excludesOutcomeMfeMaeFromCandidateFeatures: true;
    adverseNoIsFuturePathEvidence: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    adverseNoRows: number;
    adverseYesRows: number;
    separatorsEvaluated: number;
    researchCandidates: number;
    lookaheadRejectedSeparators: number;
    topResearchCandidateId: string | null;
    adverseNoIdentifiableWithoutLookahead: boolean;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_preentry_proxy_on_fresh_replay' | 'do_not_use_adverse_no_as_filter' | 'fix_inputs';
  };
  separators: SeparatorRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport['authority'] {
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

function isWinner(row: EnrichedRow): boolean {
  return String(row.outcomeBucket).startsWith('winner');
}

function isLoss(row: EnrichedRow): boolean {
  return String(row.outcomeBucket).startsWith('loss');
}

function hasAdverse(row: EnrichedRow): boolean {
  return row.issueTags.includes('adverse_excursion_at_or_over_1r');
}

function riskBucket(riskPoints: number): string {
  if (riskPoints <= 6) return '<=6';
  if (riskPoints <= 8) return '6.25-8';
  if (riskPoints <= 10) return '8.25-10';
  if (riskPoints <= 12) return '10.25-12';
  return '>12';
}

function proofHour(row: EnrichedRow): string {
  return row.proofTime.slice(11, 13);
}

function allowedFeatures(row: EnrichedRow): Array<{ set: string; value: string }> {
  const risk = riskBucket(row.riskPoints);
  const hour = proofHour(row);
  const rank = row.firstValidProof ? 'first' : 'later';
  return [
    { set: 'risk', value: risk },
    { set: 'proofHour', value: hour },
    { set: 'proofRank', value: rank },
    { set: 'direction', value: row.direction },
    { set: 'changedSlate', value: String(row.changedSlateRow) },
    { set: 'risk+hour', value: `${risk}|${hour}` },
    { set: 'risk+rank', value: `${risk}|${rank}` },
    { set: 'risk+direction', value: `${risk}|${row.direction}` },
    { set: 'hour+direction', value: `${hour}|${row.direction}` },
  ];
}

function buildSeparator(rows: EnrichedRow[], featureSet: string, featureValue: string, usesFuturePathEvidence: boolean): SeparatorRow | null {
  const selected = usesFuturePathEvidence
    ? rows.filter((row) => !hasAdverse(row))
    : rows.filter((row) => allowedFeatures(row).some((feature) => feature.set === featureSet && feature.value === featureValue));
  const rejected = rows.filter((row) => !selected.includes(row));
  if (selected.length === 0 || rejected.length === 0) return null;
  const adverseNoRows = rows.filter((row) => !hasAdverse(row)).length;
  const selectedAdverseNoRows = selected.filter((row) => !hasAdverse(row)).length;
  const selectedLosses = selected.filter(isLoss).length;
  const selectedWinners = selected.filter(isWinner).length;
  const decision = usesFuturePathEvidence
    ? 'lookahead_rejected'
    : selected.length >= 5 && selectedWinners >= 5 && selectedLosses === 0
      ? 'research_candidate'
      : 'rejected_for_now';
  return {
    separatorId: `${featureSet}:${featureValue}`,
    featureSet,
    featureValue,
    usesFuturePathEvidence,
    evaluatedRows: rows.length,
    selectedRows: selected.length,
    selectedWinners,
    selectedLosses,
    selectedUnresolved: selected.filter((row) => !isWinner(row) && !isLoss(row)).length,
    rejectedWinners: rejected.filter(isWinner).length,
    rejectedLosses: rejected.filter(isLoss).length,
    selectedOneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    selectedAdverseNoRows,
    selectedAdverseYesRows: selected.filter(hasAdverse).length,
    adverseNoCoverage: adverseNoRows ? round(selectedAdverseNoRows / adverseNoRows) : 0,
    decision,
  };
}

function buildSeparators(rows: EnrichedRow[]): SeparatorRow[] {
  const seen = new Set<string>();
  const candidates: SeparatorRow[] = [];
  const lookahead = buildSeparator(rows, 'futurePath', 'adverse_no', true);
  if (lookahead) candidates.push(lookahead);
  for (const row of rows) {
    for (const feature of allowedFeatures(row)) {
      const key = `${feature.set}|${feature.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const separator = buildSeparator(rows, feature.set, feature.value, false);
      if (separator) candidates.push(separator);
    }
  }
  return candidates.sort((a, b) => {
    if (a.decision !== b.decision) {
      const order = { research_candidate: 0, lookahead_rejected: 1, rejected_for_now: 2 };
      return order[a.decision] - order[b.decision];
    }
    return (b.selectedOneMesPl ?? 0) - (a.selectedOneMesPl ?? 0) || b.selectedRows - a.selectedRows;
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Adverse No-Lookahead Separator',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only separator diagnostic. Candidate features exclude outcome, MFE, MAE, and adverse-path labels. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change trading logic, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Adverse no/yes rows: ${report.summary.adverseNoRows}/${report.summary.adverseYesRows}.`,
    `- Research candidates: ${report.summary.researchCandidates}.`,
    `- Lookahead rejected separators: ${report.summary.lookaheadRejectedSeparators}.`,
    `- Top research candidate: ${report.summary.topResearchCandidateId ?? '-'}.`,
    `- Adverse:no identifiable without lookahead: ${report.summary.adverseNoIdentifiableWithoutLookahead}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Separators',
    '| Decision | Feature | Rows | W/L/U | P/L | Rejected W/L | Adverse No/Yes Selected | Adverse No Coverage | Lookahead |',
    '|---|---|---:|---|---:|---|---|---:|---|',
    ...report.separators.slice(0, 40).map((row) => `| ${row.decision} | ${escapeTable(`${row.featureSet}=${row.featureValue}`)} | ${row.selectedRows} | ${row.selectedWinners}/${row.selectedLosses}/${row.selectedUnresolved} | ${row.selectedOneMesPl ?? '-'} | ${row.rejectedWinners}/${row.rejectedLosses} | ${row.selectedAdverseNoRows}/${row.selectedAdverseYesRows} | ${row.adverseNoCoverage} | ${row.usesFuturePathEvidence} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport(args: {
  reportDir?: string;
  proofContextEnrichmentPath?: string | null;
  proofContextEnrichmentReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const proofContextEnrichmentPath = args.proofContextEnrichmentPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-context-enrichment-');
  const proofContextEnrichmentReport = args.proofContextEnrichmentReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport>(proofContextEnrichmentPath);
  const rows = proofContextEnrichmentReport?.rows || [];
  const separators = buildSeparators(rows);
  const researchCandidates = separators.filter((row) => row.decision === 'research_candidate');
  const lookaheadRejected = separators.filter((row) => row.decision === 'lookahead_rejected');
  const adverseNoRows = rows.filter((row) => !hasAdverse(row)).length;
  const blockers = [
    !proofContextEnrichmentPath && !args.proofContextEnrichmentReport ? 'missing AfterLunch proof-context enrichment path' : null,
    !proofContextEnrichmentReport ? 'missing AfterLunch proof-context enrichment report' : null,
    proofContextEnrichmentReport && proofContextEnrichmentReport.status !== 'pass' ? `AfterLunch proof-context enrichment status ${proofContextEnrichmentReport.status}` : null,
    rows.length === 0 ? 'no AfterLunch proof-context rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const adverseNoIdentifiableWithoutLookahead = researchCandidates.some((row) => row.adverseNoCoverage === 1 && row.selectedAdverseYesRows === 0);
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_adverse_no_lookahead_separator',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, proofContextEnrichmentPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      excludesOutcomeMfeMaeFromCandidateFeatures: true,
      adverseNoIsFuturePathEvidence: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: rows.length,
      adverseNoRows,
      adverseYesRows: rows.filter(hasAdverse).length,
      separatorsEvaluated: separators.length,
      researchCandidates: researchCandidates.length,
      lookaheadRejectedSeparators: lookaheadRejected.length,
      topResearchCandidateId: researchCandidates[0]?.separatorId || null,
      adverseNoIdentifiableWithoutLookahead,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : researchCandidates.length
          ? 'validate_preentry_proxy_on_fresh_replay'
          : 'do_not_use_adverse_no_as_filter',
    },
    separators,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved proof-context enrichment input before separator review.']
      : [
        'Do not use adverse:no directly; it is future-path evidence and is explicitly rejected as a live filter.',
        'Use only proof-time proxy candidates for fresh replay validation before any scanner-visible change.',
        'No canExecute, Discord, Supabase, setupScanner, entry, stop, target, risk, or live ranking behavior is changed by this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport({
    reportDir,
    proofContextEnrichmentPath: readFlag(args, '--proof-context-enrichment') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-adverse-no-lookahead-separator-${Date.now()}`;
  const jsonPath = path.join(reportDir, `${base}.json`);
  const markdownPath = path.join(reportDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ jsonPath, markdownPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
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
