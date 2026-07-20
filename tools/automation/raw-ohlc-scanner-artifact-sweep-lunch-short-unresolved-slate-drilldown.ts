import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type UnresolvedCause = 'missing_input' | 'no_fill' | 'weak_follow_through' | 'near_t1_unresolved' | 'no_stop_no_target' | 'adverse_near_stop';
type ResearchAction = 'exclude_from_positive_rank_training' | 'keep_as_unresolved_review_note' | 'inspect_saved_inputs';

interface JoinedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  barsLoaded: number;
  barsAfterProof: number;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  sourceArtifactPath: string | null;
  fields: Record<string, string>;
}

interface ScannerFieldMinerReport {
  status?: string;
  joinedRows?: JoinedRow[];
}

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  barsLoaded: number;
  barsAfterProof: number;
  outcomeLabel: string;
  entryHitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  mfeR: number | null;
  maeR: number | null;
  pointsShortOfT1: number | null;
  cause: UnresolvedCause;
  researchAction: ResearchAction;
  diagnosticTags: string[];
  scannerFields: Record<string, string>;
  sourceArtifactPath: string | null;
}

interface PlanSignature {
  signatureId: string;
  rows: number;
  firstProofTime: string;
  lastProofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  causeCounts: Record<UnresolvedCause, number>;
  actionCounts: Record<ResearchAction, number>;
  maxMfeR: number | null;
  minPointsShortOfT1: number | null;
  dominantAction: ResearchAction;
}

export interface RawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_unresolved_slate_drilldown';
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
    scannerFieldMinerPath: string | null;
    targetDate: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    usesScannerFieldMinerOutcomeReplay: true;
    unresolvedRowsAreResearchNotesOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    unresolvedRows: number;
    planSignatures: number;
    missingInputRows: number;
    noFillRows: number;
    weakFollowThroughRows: number;
    nearT1UnresolvedRows: number;
    noStopNoTargetRows: number;
    adverseNearStopRows: number;
    keepAsReviewNoteRows: number;
    excludeFromPositiveRankTrainingRows: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'keep_unresolved_as_review_note' | 'exclude_unresolved_from_positive_training' | 'fix_inputs';
  };
  planSignatures: PlanSignature[];
  rows: DrilldownRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'SweepMssFvgRetrace';

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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function zeroCauseCounts(): Record<UnresolvedCause, number> {
  return {
    missing_input: 0,
    no_fill: 0,
    weak_follow_through: 0,
    near_t1_unresolved: 0,
    no_stop_no_target: 0,
    adverse_near_stop: 0,
  };
}

function zeroActionCounts(): Record<ResearchAction, number> {
  return {
    exclude_from_positive_rank_training: 0,
    keep_as_unresolved_review_note: 0,
    inspect_saved_inputs: 0,
  };
}

function isTarget(row: JoinedRow, targetDate: string | null): boolean {
  return row.setupType === SETUP
    && row.session === 'lunch'
    && row.direction === 'SHORT'
    && row.outcomeStatus === 'unresolved'
    && (!targetDate || row.tradeDate === targetDate);
}

function pointsShortOfT1(row: JoinedRow): number | null {
  const mfe = safeNumber(row.maximumFavorableExcursion);
  if (mfe === null) return null;
  return round(Math.max(0, Math.abs(row.t1 - row.entry) - mfe));
}

function classify(row: JoinedRow): { cause: UnresolvedCause; action: ResearchAction; tags: string[] } {
  const tags: string[] = [];
  const risk = safeNumber(row.riskPoints);
  const mfe = safeNumber(row.maximumFavorableExcursion);
  const mae = safeNumber(row.maximumAdverseExcursion);
  const shortT1 = pointsShortOfT1(row);
  const mfeR = mfe !== null && risk ? mfe / risk : null;
  const maeR = mae !== null && risk ? mae / risk : null;

  if (!risk || row.barsLoaded <= 0 || row.barsAfterProof <= 0) {
    return { cause: 'missing_input', action: 'inspect_saved_inputs', tags: ['incomplete_saved_replay_inputs'] };
  }
  if (!row.entryHitTime) {
    return { cause: 'no_fill', action: 'exclude_from_positive_rank_training', tags: ['entry_never_filled'] };
  }
  if ((mfeR ?? 0) < 0.5) {
    return { cause: 'weak_follow_through', action: 'exclude_from_positive_rank_training', tags: ['mfe_under_half_r'] };
  }
  if ((maeR ?? 0) >= 0.85) tags.push('adverse_near_stop');
  if (shortT1 !== null && shortT1 <= 1) {
    tags.push('near_t1_by_one_point_or_less');
    return {
      cause: tags.includes('adverse_near_stop') ? 'adverse_near_stop' : 'near_t1_unresolved',
      action: 'keep_as_unresolved_review_note',
      tags,
    };
  }
  return { cause: 'no_stop_no_target', action: 'exclude_from_positive_rank_training', tags };
}

function toDrilldownRow(row: JoinedRow): DrilldownRow {
  const risk = safeNumber(row.riskPoints);
  const mfe = safeNumber(row.maximumFavorableExcursion);
  const mae = safeNumber(row.maximumAdverseExcursion);
  const classification = classify(row);
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    proofTime: row.proofTime,
    entry: row.entry,
    stop: row.stop,
    t1: row.t1,
    t2: row.t2,
    riskPoints: row.riskPoints,
    barsLoaded: row.barsLoaded,
    barsAfterProof: row.barsAfterProof,
    outcomeLabel: row.outcomeLabel,
    entryHitTime: row.entryHitTime,
    maximumFavorableExcursion: mfe,
    maximumAdverseExcursion: mae,
    mfeR: mfe !== null && risk ? round(mfe / risk) : null,
    maeR: mae !== null && risk ? round(mae / risk) : null,
    pointsShortOfT1: pointsShortOfT1(row),
    cause: classification.cause,
    researchAction: classification.action,
    diagnosticTags: classification.tags,
    scannerFields: row.fields,
    sourceArtifactPath: row.sourceArtifactPath,
  };
}

function signatureFor(row: DrilldownRow): string {
  return [
    row.tradeDate,
    row.entry.toFixed(2),
    row.stop.toFixed(2),
    row.t1.toFixed(2),
    row.t2.toFixed(2),
  ].join('|');
}

function buildPlanSignatures(rows: DrilldownRow[]): PlanSignature[] {
  const groups = new Map<string, DrilldownRow[]>();
  for (const row of rows) groups.set(signatureFor(row), [...(groups.get(signatureFor(row)) || []), row]);
  return [...groups.entries()].map(([signatureId, group]) => {
    const causeCounts = zeroCauseCounts();
    const actionCounts = zeroActionCounts();
    for (const row of group) {
      causeCounts[row.cause] += 1;
      actionCounts[row.researchAction] += 1;
    }
    const maxMfeR = group.map((row) => row.mfeR).filter((value): value is number => value !== null).sort((a, b) => b - a)[0] ?? null;
    const minPointsShortOfT1 = group.map((row) => row.pointsShortOfT1).filter((value): value is number => value !== null).sort((a, b) => a - b)[0] ?? null;
    const dominantAction: ResearchAction = actionCounts.keep_as_unresolved_review_note >= actionCounts.exclude_from_positive_rank_training
      ? 'keep_as_unresolved_review_note'
      : 'exclude_from_positive_rank_training';
    return {
      signatureId,
      rows: group.length,
      firstProofTime: group.map((row) => row.proofTime).sort()[0],
      lastProofTime: group.map((row) => row.proofTime).sort().at(-1) || group[0].proofTime,
      entry: group[0].entry,
      stop: group[0].stop,
      t1: group[0].t1,
      t2: group[0].t2,
      riskPoints: group[0].riskPoints,
      causeCounts,
      actionCounts,
      maxMfeR,
      minPointsShortOfT1,
      dominantAction,
    };
  }).sort((a, b) => a.firstProofTime.localeCompare(b.firstProofTime));
}

function authority(): RawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch SHORT Unresolved Slate Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- Plan signatures: ${report.summary.planSignatures}.`,
    `- Missing/no-fill/weak/near-T1/no-stop-no-target/adverse-near-stop: ${report.summary.missingInputRows}/${report.summary.noFillRows}/${report.summary.weakFollowThroughRows}/${report.summary.nearT1UnresolvedRows}/${report.summary.noStopNoTargetRows}/${report.summary.adverseNearStopRows}.`,
    `- Keep as review note / exclude from positive training: ${report.summary.keepAsReviewNoteRows}/${report.summary.excludeFromPositiveRankTrainingRows}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Plan Signatures',
    ...report.planSignatures.map((row) => `- ${row.firstProofTime}-${row.lastProofTime}: rows ${row.rows}; risk ${row.riskPoints}; max MFE R ${row.maxMfeR ?? '-'}; short T1 ${row.minPointsShortOfT1 ?? '-'}; action ${row.dominantAction}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport(args: {
  reportDir?: string;
  scannerFieldMinerPath?: string | null;
  targetDate?: string | null;
  scannerFieldMiner?: ScannerFieldMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const scannerFieldMinerPath = args.scannerFieldMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-scanner-field-miner-');
  const scannerFieldMiner = args.scannerFieldMiner ?? readJson<ScannerFieldMinerReport>(scannerFieldMinerPath);
  const targetDate = args.targetDate ?? null;
  const rows = (scannerFieldMiner?.joinedRows || []).filter((row) => isTarget(row, targetDate)).map(toDrilldownRow);
  const planSignatures = buildPlanSignatures(rows);
  const blockers = [
    !scannerFieldMinerPath && !args.scannerFieldMiner ? 'missing scanner-field miner path' : null,
    !scannerFieldMiner ? 'missing scanner-field miner report' : null,
    scannerFieldMiner && scannerFieldMiner.status !== 'pass' ? `scanner-field miner status ${scannerFieldMiner.status}` : null,
    rows.length === 0 ? 'no unresolved SweepMssFvgRetrace lunch SHORT rows found' : null,
    ...rows.filter((row) => row.cause === 'missing_input').map((row) => `${row.ticketId}: missing saved replay input`),
  ].filter((item): item is string => Boolean(item));
  const keepAsReviewNoteRows = rows.filter((row) => row.researchAction === 'keep_as_unresolved_review_note').length;
  const excludeRows = rows.filter((row) => row.researchAction === 'exclude_from_positive_rank_training').length;
  const base: Omit<RawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_unresolved_slate_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, scannerFieldMinerPath, targetDate },
    assumptions: {
      savedReportsOnly: true,
      usesScannerFieldMinerOutcomeReplay: true,
      unresolvedRowsAreResearchNotesOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      unresolvedRows: rows.length,
      planSignatures: planSignatures.length,
      missingInputRows: rows.filter((row) => row.cause === 'missing_input').length,
      noFillRows: rows.filter((row) => row.cause === 'no_fill').length,
      weakFollowThroughRows: rows.filter((row) => row.cause === 'weak_follow_through').length,
      nearT1UnresolvedRows: rows.filter((row) => row.cause === 'near_t1_unresolved').length,
      noStopNoTargetRows: rows.filter((row) => row.cause === 'no_stop_no_target').length,
      adverseNearStopRows: rows.filter((row) => row.cause === 'adverse_near_stop').length,
      keepAsReviewNoteRows,
      excludeFromPositiveRankTrainingRows: excludeRows,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : excludeRows > keepAsReviewNoteRows
          ? 'exclude_unresolved_from_positive_training'
          : 'keep_unresolved_as_review_note',
    },
    planSignatures,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved scanner-field miner inputs before using unresolved slate drilldown.']
      : [
          'Keep unresolved lunch SHORT rows out of positive rank-training unless they resolve to T1/T2 in a later validated outcome pass.',
          'For near-T1 unresolved rows, preserve them as review notes instead of rank penalties; they did not prove a bad setup.',
          'Do not install any scanner-visible behavior from this report by itself.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport({
    reportDir,
    scannerFieldMinerPath: readFlag(args, '--scanner-field-miner') || undefined,
    targetDate: readFlag(args, '--target-date') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-slate-drilldown-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
