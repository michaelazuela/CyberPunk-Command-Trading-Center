import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type SegmentSource = 'pre_trade' | 'proof_timing' | 'replay_outcome';
type SegmentDecision = 'candidate_for_segment_replay' | 'research_only_separator' | 'rejected_for_now';

interface SweepSegment {
  segmentId: string;
  description: string;
  source: SegmentSource;
  keep(row: TimingRow): boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepSegmentFilterRow {
  segmentId: string;
  description: string;
  source: SegmentSource;
  evaluatedRows: number;
  keptRows: number;
  rejectedRows: number;
  keptWinners: number;
  rejectedWinners: number;
  keptLosses: number;
  rejectedLosses: number;
  keptUnresolved: number;
  rejectedUnresolved: number;
  keptOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  deltaVsAllOneMesPl: number | null;
  falseRejectWinnerRows: number;
  scannerVisibleEligible: false;
  decision: SegmentDecision;
  recommendation: string;
}

export interface UnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport {
  reportType: 'unified_positive_held_local_preview_sweep_segment_filter';
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
    sourceProofTimingPath: string | null;
  };
  assumptions: {
    sweepOnly: true;
    filtersAreResearchOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveFilterInstalled: true;
    noRankBoostInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    sweepRows: number;
    sweepWinners: number;
    sweepLosses: number;
    sweepUnresolved: number;
    sweepOneMesPl: number | null;
    segmentsEvaluated: number;
    segmentReplayCandidates: number;
    researchOnlySeparators: number;
    rejectedSegments: number;
    bestSegmentId: string | null;
    livePromotionAllowedRows: 0;
  };
  rows: UnifiedPositiveHeldLocalPreviewSweepSegmentFilterRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP_SETUP = 'SweepMssFvgRetrace';

const SEGMENTS: SweepSegment[] = [
  {
    segmentId: 'session_lunch',
    description: 'Keep Sweep rows from lunch only.',
    source: 'pre_trade',
    keep: (row) => row.session === 'lunch',
  },
  {
    segmentId: 'session_lunch_or_evening',
    description: 'Keep Sweep rows from lunch or evening only.',
    source: 'pre_trade',
    keep: (row) => row.session === 'lunch' || row.session === 'evening',
  },
  {
    segmentId: 'direction_short',
    description: 'Keep Sweep short rows only.',
    source: 'pre_trade',
    keep: (row) => row.direction === 'SHORT',
  },
  {
    segmentId: 'risk_lte_12',
    description: 'Keep Sweep rows with entry-to-stop risk <= 12 points.',
    source: 'pre_trade',
    keep: (row) => row.riskPoints <= 12,
  },
  {
    segmentId: 'risk_lte_16',
    description: 'Keep Sweep rows with entry-to-stop risk <= 16 points.',
    source: 'pre_trade',
    keep: (row) => row.riskPoints <= 16,
  },
  {
    segmentId: 'lunch_short_risk_lte_12',
    description: 'Keep lunch short Sweep rows with entry-to-stop risk <= 12 points.',
    source: 'pre_trade',
    keep: (row) => row.session === 'lunch' && row.direction === 'SHORT' && row.riskPoints <= 12,
  },
  {
    segmentId: 'entry_within_15_minutes',
    description: 'Keep Sweep rows that filled within 15 minutes of proof.',
    source: 'proof_timing',
    keep: (row) => row.proofToEntryMinutes !== null && row.proofToEntryMinutes <= 15,
  },
  {
    segmentId: 'not_stale_over_30_minutes',
    description: 'Keep Sweep rows without stale entry over 30 minutes.',
    source: 'proof_timing',
    keep: (row) => !row.issueTags.includes('stale_entry_over_30m'),
  },
  {
    segmentId: 'has_entry_fill',
    description: 'Keep Sweep rows with an entry fill in the replay outcome.',
    source: 'proof_timing',
    keep: (row) => row.entryHitTime !== null,
  },
  {
    segmentId: 'same_bar_entry',
    description: 'Keep same-bar Sweep entry rows for timing isolation.',
    source: 'proof_timing',
    keep: (row) => row.issueTags.includes('same_bar_entry'),
  },
  {
    segmentId: 'not_same_bar_entry',
    description: 'Keep non-same-bar Sweep entry rows for timing isolation.',
    source: 'proof_timing',
    keep: (row) => !row.issueTags.includes('same_bar_entry'),
  },
  {
    segmentId: 'no_adverse_excursion_over_1r',
    description: 'Keep Sweep rows that did not show replay adverse excursion at or over 1R.',
    source: 'replay_outcome',
    keep: (row) => !row.issueTags.includes('adverse_excursion_at_or_over_1r'),
  },
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport['authority'] {
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

function isWinner(row: TimingRow): boolean {
  return row.outcomeBucket === 'winner_t1_t2';
}

function isLoss(row: TimingRow): boolean {
  return row.outcomeBucket === 'loss_stopped_before_t1';
}

function isUnresolved(row: TimingRow): boolean {
  return row.outcomeBucket === 'unresolved';
}

function decisionFor(args: {
  segment: SweepSegment;
  keptRows: number;
  rejectedRows: number;
  keptWinners: number;
  rejectedWinners: number;
  rejectedLosses: number;
  keptOneMesPl: number | null;
  deltaVsAllOneMesPl: number | null;
}): SegmentDecision {
  if (args.segment.source === 'replay_outcome' && args.rejectedLosses > args.rejectedWinners) return 'research_only_separator';
  if (
    args.segment.source !== 'replay_outcome' &&
    args.keptRows >= 5 &&
    args.rejectedRows > 0 &&
    args.keptWinners >= 3 &&
    args.rejectedWinners === 0 &&
    (args.keptOneMesPl ?? 0) > 0 &&
    (args.deltaVsAllOneMesPl ?? 0) >= 0
  ) {
    return 'candidate_for_segment_replay';
  }
  return 'rejected_for_now';
}

function recommendationFor(decision: SegmentDecision, source: SegmentSource): string {
  if (decision === 'candidate_for_segment_replay') {
    return 'Research candidate only. Replay this segment against broader history before any scanner-visible rank or filter behavior changes.';
  }
  if (decision === 'research_only_separator') {
    return source === 'replay_outcome'
      ? 'Research-only separator. Use it to mine pre-entry features; do not install it as a live filter because it depends on replay outcome path.'
      : 'Research-only separator. Keep investigating before any live-facing behavior changes.';
  }
  return 'Reject for now. It either cuts winners, does not improve P/L, or is too broad for a surgical filter.';
}

function buildSegmentRow(segment: SweepSegment, sweepRows: TimingRow[], allOneMesPl: number | null): UnifiedPositiveHeldLocalPreviewSweepSegmentFilterRow {
  const kept = sweepRows.filter((row) => segment.keep(row));
  const rejected = sweepRows.filter((row) => !segment.keep(row));
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const deltaVsAllOneMesPl = allOneMesPl === null || keptOneMesPl === null ? null : round(keptOneMesPl - allOneMesPl);
  const rejectedWinners = rejected.filter(isWinner).length;
  const rejectedLosses = rejected.filter(isLoss).length;
  const decision = decisionFor({
    segment,
    keptRows: kept.length,
    rejectedRows: rejected.length,
    keptWinners: kept.filter(isWinner).length,
    rejectedWinners,
    rejectedLosses,
    keptOneMesPl,
    deltaVsAllOneMesPl,
  });
  return {
    segmentId: segment.segmentId,
    description: segment.description,
    source: segment.source,
    evaluatedRows: sweepRows.length,
    keptRows: kept.length,
    rejectedRows: rejected.length,
    keptWinners: kept.filter(isWinner).length,
    rejectedWinners,
    keptLosses: kept.filter(isLoss).length,
    rejectedLosses,
    keptUnresolved: kept.filter(isUnresolved).length,
    rejectedUnresolved: rejected.filter(isUnresolved).length,
    keptOneMesPl,
    rejectedOneMesPl: sum(rejected.map((row) => row.resolvedOneMesPl)),
    deltaVsAllOneMesPl,
    falseRejectWinnerRows: rejectedWinners,
    scannerVisibleEligible: false,
    decision,
    recommendation: recommendationFor(decision, segment.source),
  };
}

function sortRows(rows: UnifiedPositiveHeldLocalPreviewSweepSegmentFilterRow[]): UnifiedPositiveHeldLocalPreviewSweepSegmentFilterRow[] {
  const order: Record<SegmentDecision, number> = {
    candidate_for_segment_replay: 0,
    research_only_separator: 1,
    rejected_for_now: 2,
  };
  return [...rows].sort((a, b) => {
    if (a.decision !== b.decision) return order[a.decision] - order[b.decision];
    return (b.deltaVsAllOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.deltaVsAllOneMesPl ?? Number.NEGATIVE_INFINITY) ||
      b.rejectedLosses - a.rejectedLosses ||
      a.falseRejectWinnerRows - b.falseRejectWinnerRows ||
      a.segmentId.localeCompare(b.segmentId);
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Segment Filter',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only Sweep segment research. It does not install filters or boosts, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Sweep rows: ${report.summary.sweepRows}.`,
    `- Sweep W/L/U: ${report.summary.sweepWinners}/${report.summary.sweepLosses}/${report.summary.sweepUnresolved}.`,
    `- Sweep P/L: ${report.summary.sweepOneMesPl ?? '-'}.`,
    `- Segment replay candidates: ${report.summary.segmentReplayCandidates}.`,
    `- Research-only separators: ${report.summary.researchOnlySeparators}.`,
    `- Best segment: ${report.summary.bestSegmentId ?? '-'}.`,
    '',
    '## Segments',
    '| Decision | Segment | Source | Kept | Rejected | Kept W/L/U | Rejected W/L/U | Kept P/L | Delta vs All | False Reject Winners | Scanner Visible Eligible | Recommendation |',
    '|---|---|---|---:|---:|---|---|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.decision} | ${escapeTable(row.segmentId)} | ${row.source} | ${row.keptRows} | ${row.rejectedRows} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.deltaVsAllOneMesPl ?? '-'} | ${row.falseRejectWinnerRows} | ${row.scannerVisibleEligible} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport {
  const sourceRows = args.sourceProofTimingReport?.rows || [];
  const sweepRows = sourceRows.filter((row) => row.setupType === SWEEP_SETUP);
  const sweepOneMesPl = sum(sweepRows.map((row) => row.resolvedOneMesPl));
  const rows = sortRows(SEGMENTS.map((segment) => buildSegmentRow(segment, sweepRows, sweepOneMesPl)));
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    sourceRows.length === 0 ? 'no source/proof timing rows found' : null,
    sweepRows.length === 0 ? 'no SweepMssFvgRetrace rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_segment_filter',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
    },
    assumptions: {
      sweepOnly: true,
      filtersAreResearchOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveFilterInstalled: true,
      noRankBoostInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      sweepRows: sweepRows.length,
      sweepWinners: sweepRows.filter(isWinner).length,
      sweepLosses: sweepRows.filter(isLoss).length,
      sweepUnresolved: sweepRows.filter(isUnresolved).length,
      sweepOneMesPl,
      segmentsEvaluated: rows.length,
      segmentReplayCandidates: rows.filter((row) => row.decision === 'candidate_for_segment_replay').length,
      researchOnlySeparators: rows.filter((row) => row.decision === 'research_only_separator').length,
      rejectedSegments: rows.filter((row) => row.decision === 'rejected_for_now').length,
      bestSegmentId: rows[0]?.segmentId || null,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use Sweep segment output until source/proof timing rows load cleanly.']
      : [
        'Do not install a Sweep rank boost or hard filter from this report.',
        'If a segment is candidate_for_segment_replay, validate it against a broader replay package before any scanner-visible change.',
        'If the best separator is replay_outcome, mine its pre-entry structured features next instead of using outcome path as a live filter.',
        'No canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or live ranking behavior changes are recommended from this phase.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport(
  report: UnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-segment-filter-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepSegmentFilterCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewSweepSegmentFilterCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
