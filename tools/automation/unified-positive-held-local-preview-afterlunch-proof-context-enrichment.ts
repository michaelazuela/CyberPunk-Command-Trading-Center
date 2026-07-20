import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport } from './unified-positive-held-local-preview-afterlunch-proof-context-queue';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type QueueRow = UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport['rows'][number];
type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];

interface EnrichedRow extends QueueRow {
  proofToEntryMinutes: number | null;
  entryHitTime: string | null;
  outcomeLabel: string;
  mfeR: number | null;
  maeR: number | null;
  issueTags: string[];
  contextTags: string[];
  enrichmentBlockers: string[];
}

interface BucketSummary {
  bucketId: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
  firstValidProofRows: number;
  changedSlateRows: number;
}

export interface UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_enrichment';
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
    queuePath: string | null;
    sourceProofTimingPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    afterLunchOnly: true;
    joinsQueueToSourceProofTiming: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    queueRows: number;
    enrichedRows: number;
    blockedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    highPriorityRows: number;
    firstValidProofRows: number;
    changedSlateRows: number;
    changedSlateFirstProofRows: number;
    changedSlateReplacementRows: number;
    changedSlateFirstProofPl: number | null;
    changedSlateReplacementTopPl: number | null;
    sameBarEntryRows: number;
    adverseExcursionRows: number;
    intrabarAmbiguityRows: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'preserve_first_valid_proof_research_only' | 'mine_next_structural_separator' | 'fix_inputs';
  };
  buckets: BucketSummary[];
  rows: EnrichedRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport['authority'] {
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

function isWinner(row: Pick<EnrichedRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('winner');
}

function isLoss(row: Pick<EnrichedRow, 'outcomeBucket'>): boolean {
  return String(row.outcomeBucket).startsWith('loss');
}

function riskBucket(riskPoints: number): string {
  if (riskPoints <= 6) return 'risk<=6';
  if (riskPoints <= 8) return 'risk6.25-8';
  if (riskPoints <= 10) return 'risk8.25-10';
  if (riskPoints <= 12) return 'risk10.25-12';
  return 'risk>12';
}

function proofEntryBucket(minutes: number | null): string {
  if (minutes === null) return 'proofEntry=unknown';
  if (minutes === 0) return 'proofEntry=same_bar';
  if (minutes <= 10) return 'proofEntry<=10m';
  if (minutes <= 30) return 'proofEntry<=30m';
  return 'proofEntry>30m';
}

function buildContextTags(queue: QueueRow, timing: TimingRow | null): string[] {
  const issueTags = timing?.issueTags || [];
  return [
    queue.firstValidProof ? 'first_valid_proof' : 'later_proof',
    queue.changedSlateRow ? 'changed_slate' : 'unchanged_slate',
    queue.changedSlateBaselineTop ? 'baseline_top' : null,
    queue.changedSlateSimulatedTop ? 'simulated_top' : null,
    `proof_rank_${queue.proofRankInSlate}`,
    riskBucket(queue.riskPoints),
    proofEntryBucket(timing?.proofToEntryMinutes ?? null),
    issueTags.includes('same_bar_entry') ? 'same_bar_entry' : null,
    issueTags.includes('adverse_excursion_at_or_over_1r') ? 'adverse_excursion_at_or_over_1r' : null,
    issueTags.includes('intrabar_ambiguity') ? 'intrabar_ambiguity' : null,
    isWinner(queue) ? 'winner' : null,
    isLoss(queue) ? 'loss' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function buildRows(queueRows: QueueRow[], timingRows: TimingRow[]): EnrichedRow[] {
  const timingByTicket = new Map(timingRows.map((row) => [row.ticketId, row]));
  return queueRows.map((queue) => {
    const timing = timingByTicket.get(queue.ticketId) || null;
    return {
      ...queue,
      proofToEntryMinutes: timing?.proofToEntryMinutes ?? null,
      entryHitTime: timing?.entryHitTime ?? null,
      outcomeLabel: timing?.outcomeLabel || String(queue.outcomeBucket),
      mfeR: timing?.mfeR ?? null,
      maeR: timing?.maeR ?? null,
      issueTags: timing?.issueTags || [],
      contextTags: buildContextTags(queue, timing),
      enrichmentBlockers: timing ? [] : ['missing source/proof timing row for queued ticket'],
    };
  });
}

function groupBy(rows: EnrichedRow[], toBucket: (row: EnrichedRow) => string): BucketSummary[] {
  const groups = new Map<string, EnrichedRow[]>();
  for (const row of rows) {
    const key = toBucket(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()]
    .map(([bucketId, group]) => ({
      bucketId,
      rows: group.length,
      winners: group.filter(isWinner).length,
      losses: group.filter(isLoss).length,
      unresolved: group.filter((row) => !isWinner(row) && !isLoss(row)).length,
      grossResolvedOneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
      avgMfeR: avg(group.map((row) => row.mfeR)),
      avgMaeR: avg(group.map((row) => row.maeR)),
      firstValidProofRows: group.filter((row) => row.firstValidProof).length,
      changedSlateRows: group.filter((row) => row.changedSlateRow).length,
    }))
    .sort((a, b) => (b.grossResolvedOneMesPl ?? 0) - (a.grossResolvedOneMesPl ?? 0) || b.rows - a.rows || a.bucketId.localeCompare(b.bucketId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview AfterLunch Proof-Context Enrichment',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report enrichment. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Queue/enriched rows: ${report.summary.queueRows}/${report.summary.enrichedRows}.`,
    `- Winners/losses/unresolved: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- Changed-slate first/replacement P/L: ${report.summary.changedSlateFirstProofPl ?? 'not available'}/${report.summary.changedSlateReplacementTopPl ?? 'not available'}.`,
    `- Same-bar/adverse/intrabar rows: ${report.summary.sameBarEntryRows}/${report.summary.adverseExcursionRows}/${report.summary.intrabarAmbiguityRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Buckets',
    '| Bucket | Rows | W/L/U | P/L | Avg MFE R | Avg MAE R | First Proof | Changed Slate |',
    '|---|---:|---|---:|---:|---:|---:|---:|',
    ...report.buckets.slice(0, 40).map((row) => `| ${escapeTable(row.bucketId)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.avgMfeR ?? '-'} | ${row.avgMaeR ?? '-'} | ${row.firstValidProofRows} | ${row.changedSlateRows} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport(args: {
  reportDir?: string;
  queuePath?: string | null;
  sourceProofTimingPath?: string | null;
  queueReport?: UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const queuePath = args.queuePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-afterlunch-proof-context-queue-');
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const queueReport = args.queueReport ?? readJson<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport>(queuePath);
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const timingRows = (sourceProofTimingReport?.rows || []).filter((row) => row.setupType === 'AfterLunchDriveFvgContinuation');
  const rows = buildRows(queueReport?.rows || [], timingRows);
  const changedFirst = rows.filter((row) => row.changedSlateBaselineTop);
  const changedReplacementTop = rows.filter((row) => row.changedSlateSimulatedTop);
  const blockers = [
    !queuePath && !args.queueReport ? 'missing AfterLunch proof-context queue path' : null,
    !queueReport ? 'missing AfterLunch proof-context queue report' : null,
    queueReport && queueReport.status !== 'pass' ? `AfterLunch proof-context queue status ${queueReport.status}` : null,
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    rows.length === 0 ? 'no queued AfterLunch rows found' : null,
    rows.some((row) => row.enrichmentBlockers.length > 0) ? 'one or more queued rows did not join to source/proof timing' : null,
  ].filter((item): item is string => Boolean(item));
  const firstProofPreserved = !blockers.length &&
    changedFirst.length > 0 &&
    changedReplacementTop.length > 0 &&
    (sum(changedFirst.map((row) => row.resolvedOneMesPl)) ?? 0) > (sum(changedReplacementTop.map((row) => row.resolvedOneMesPl)) ?? 0);
  const buckets = [
    ...groupBy(rows, (row) => `rank:${row.firstValidProof ? 'first_valid_proof' : 'later_proof'}`),
    ...groupBy(rows, (row) => `risk:${riskBucket(row.riskPoints)}`),
    ...groupBy(rows, (row) => `entry:${proofEntryBucket(row.proofToEntryMinutes)}`),
    ...groupBy(rows, (row) => `adverse:${row.issueTags.includes('adverse_excursion_at_or_over_1r') ? 'yes' : 'no'}`),
    ...groupBy(rows, (row) => `intrabar:${row.issueTags.includes('intrabar_ambiguity') ? 'yes' : 'no'}`),
  ];
  const base: Omit<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_enrichment',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, queuePath, sourceProofTimingPath },
    assumptions: {
      savedReportsOnly: true,
      afterLunchOnly: true,
      joinsQueueToSourceProofTiming: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      queueRows: queueReport?.rows.length || 0,
      enrichedRows: rows.length,
      blockedRows: rows.filter((row) => row.enrichmentBlockers.length > 0).length,
      winners: rows.filter(isWinner).length,
      losses: rows.filter(isLoss).length,
      unresolved: rows.filter((row) => !isWinner(row) && !isLoss(row)).length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      highPriorityRows: rows.filter((row) => row.enrichmentPriority >= 90).length,
      firstValidProofRows: rows.filter((row) => row.firstValidProof).length,
      changedSlateRows: rows.filter((row) => row.changedSlateRow).length,
      changedSlateFirstProofRows: changedFirst.length,
      changedSlateReplacementRows: rows.filter((row) => row.changedSlateRow && !row.changedSlateBaselineTop).length,
      changedSlateFirstProofPl: sum(changedFirst.map((row) => row.resolvedOneMesPl)),
      changedSlateReplacementTopPl: sum(changedReplacementTop.map((row) => row.resolvedOneMesPl)),
      sameBarEntryRows: rows.filter((row) => row.issueTags.includes('same_bar_entry')).length,
      adverseExcursionRows: rows.filter((row) => row.issueTags.includes('adverse_excursion_at_or_over_1r')).length,
      intrabarAmbiguityRows: rows.filter((row) => row.issueTags.includes('intrabar_ambiguity')).length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : firstProofPreserved ? 'preserve_first_valid_proof_research_only' : 'mine_next_structural_separator',
    },
    buckets,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved queue/source timing inputs before using AfterLunch proof-context enrichment.']
      : firstProofPreserved
        ? [
          'Research evidence still supports preserving the earliest valid AfterLunch proof over later tighter replacements in changed slates.',
          'Mine a structural separator next for adverse-excursion and intrabar-ambiguity rows before any scanner-visible behavior change.',
          'Do not install broad timing/risk boosts, canExecute changes, Discord changes, Supabase writes, or live ranking behavior from this report.',
        ]
        : [
          'No enough evidence to promote first-proof preservation from this enrichment alone; mine the next structural separator first.',
          'Do not install scanner-visible behavior from this report.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport({
    reportDir,
    queuePath: readFlag(args, '--queue') || undefined,
    sourceProofTimingPath: readFlag(args, '--source-proof-timing') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const base = `unified-positive-held-local-preview-afterlunch-proof-context-enrichment-${Date.now()}`;
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
