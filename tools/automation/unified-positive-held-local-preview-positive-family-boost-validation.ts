import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type BoostDecision = 'clean_boost_research_candidate' | 'isolated_boost_research_candidate' | 'reject_boost_for_now';

interface ModelSummary {
  setupType: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
  sameBarLosses: number;
  staleLosses: number;
  decision: BoostDecision;
  reason: string;
}

interface SlateSummary {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  topBeforeTicketId: string | null;
  topBeforeSetupType: string | null;
  topBeforeOneMesPl: number | null;
  topAfterTicketId: string | null;
  topAfterSetupType: string | null;
  topAfterOneMesPl: number | null;
  topChanged: boolean;
}

interface SimulationRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  scoreBefore: number;
  scoreAfter: number;
  rankBefore: number;
  rankAfter: number;
  boostApplied: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport {
  reportType: 'unified_positive_held_local_preview_positive_family_boost_validation';
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
    selectedSetupTypes: string[];
  };
  assumptions: {
    validationIsResearchOnly: true;
    boostIsHypotheticalOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    modelFamilyIsPreOutcomeFeature: true;
    noRankBoostInstalled: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  scoring: {
    positiveFamilyBoostPoints: number;
    baselineDoesNotUseOutcome: true;
  };
  summary: {
    sourceRows: number;
    positiveFamilyRows: number;
    boostCandidateModels: number;
    slates: number;
    topChangedSlates: number;
    topBeforeOneMesPl: number | null;
    topAfterOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    recommendedAction: 'broader_replay_validate_sweep_only' | 'broader_replay_validate_positive_families_separately' | 'reject_combined_boost_validate_segments' | 'reject_boost_for_now';
    livePromotionAllowedRows: 0;
  };
  models: ModelSummary[];
  slates: SlateSummary[];
  rows: SimulationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_POSITIVE_FAMILIES = ['SweepMssFvgRetrace', 'AfterLunchDriveFvgContinuation'];
const POSITIVE_FAMILY_BOOST_POINTS = 12;

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

function authority(): UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport['authority'] {
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

function modelDecision(args: { rows: number; winners: number; losses: number; oneMesPl: number | null }): Pick<ModelSummary, 'decision' | 'reason'> {
  if (args.rows >= 3 && args.winners >= 3 && args.losses === 0 && (args.oneMesPl ?? 0) > 0) {
    return {
      decision: 'clean_boost_research_candidate',
      reason: 'Selected package shows three or more winners, no stopped-before-T1 losses, and positive P/L.',
    };
  }
  if (args.rows >= 3 && args.winners > args.losses && (args.oneMesPl ?? 0) > 0) {
    return {
      decision: 'isolated_boost_research_candidate',
      reason: 'Selected package is positive, but losses remain, so validate separately before any boost.',
    };
  }
  return {
    decision: 'reject_boost_for_now',
    reason: 'Selected package is not clean enough for boost research.',
  };
}

function summarizeModel(setupType: string, rows: TimingRow[]): ModelSummary {
  const winners = rows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length;
  const losses = rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length;
  const unresolved = rows.filter((row) => row.outcomeBucket === 'unresolved').length;
  const oneMesPl = sum(rows.map((row) => row.resolvedOneMesPl));
  const decision = modelDecision({ rows: rows.length, winners, losses, oneMesPl });
  return {
    setupType,
    rows: rows.length,
    winners,
    losses,
    unresolved,
    oneMesPl,
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
    avgMfeR: avg(rows.map((row) => row.mfeR)),
    avgMaeR: avg(rows.map((row) => row.maeR)),
    sameBarLosses: rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1' && row.issueTags.includes('same_bar_entry')).length,
    staleLosses: rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1' && row.issueTags.includes('stale_entry_over_30m')).length,
    ...decision,
  };
}

function buildModelSummaries(rows: TimingRow[], positiveFamilies: Set<string>): ModelSummary[] {
  const grouped = new Map<string, TimingRow[]>();
  for (const row of rows.filter((item) => positiveFamilies.has(item.setupType))) {
    grouped.set(row.setupType, [...(grouped.get(row.setupType) || []), row]);
  }
  return [...grouped.entries()]
    .map(([setupType, groupRows]) => summarizeModel(setupType, groupRows))
    .sort((a, b) => (b.oneMesPl ?? 0) - (a.oneMesPl ?? 0));
}

function scoreBefore(row: TimingRow): number {
  const riskScore = row.riskPoints <= 8 ? 8 : row.riskPoints <= 14 ? 4 : 0;
  const fullPlanScore = row.entryHitTime ? 4 : 0;
  return 70 + riskScore + fullPlanScore;
}

function scoreAfter(row: TimingRow, boostModels: Set<string>): number {
  return scoreBefore(row) + (boostModels.has(row.setupType) ? POSITIVE_FAMILY_BOOST_POINTS : 0);
}

function compareRows(a: { row: TimingRow; score: number }, b: { row: TimingRow; score: number }): number {
  return b.score - a.score || a.row.tradeDate.localeCompare(b.row.tradeDate) || a.row.ticketId.localeCompare(b.row.ticketId);
}

function groupBySlate(rows: TimingRow[]): Map<string, TimingRow[]> {
  const groups = new Map<string, TimingRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function buildSimulation(rows: TimingRow[], boostModels: Set<string>): { rows: SimulationRow[]; slates: SlateSummary[] } {
  const simulationRows: SimulationRow[] = [];
  const slates: SlateSummary[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const before = slateRows.map((row) => ({ row, score: scoreBefore(row) })).sort(compareRows);
    const after = slateRows.map((row) => ({ row, score: scoreAfter(row, boostModels) })).sort(compareRows);
    const beforeRanks = new Map(before.map((item, index) => [item.row.ticketId, index + 1]));
    const afterRanks = new Map(after.map((item, index) => [item.row.ticketId, index + 1]));
    const topBefore = before[0]?.row || null;
    const topAfter = after[0]?.row || null;
    for (const row of slateRows) {
      simulationRows.push({
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        scoreBefore: scoreBefore(row),
        scoreAfter: scoreAfter(row, boostModels),
        rankBefore: beforeRanks.get(row.ticketId) ?? 0,
        rankAfter: afterRanks.get(row.ticketId) ?? 0,
        boostApplied: boostModels.has(row.setupType),
      });
    }
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      topBeforeTicketId: topBefore?.ticketId || null,
      topBeforeSetupType: topBefore?.setupType || null,
      topBeforeOneMesPl: topBefore?.resolvedOneMesPl ?? null,
      topAfterTicketId: topAfter?.ticketId || null,
      topAfterSetupType: topAfter?.setupType || null,
      topAfterOneMesPl: topAfter?.resolvedOneMesPl ?? null,
      topChanged: topBefore?.ticketId !== topAfter?.ticketId,
    });
  }
  return {
    rows: simulationRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.rankAfter - b.rankAfter),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function recommendedAction(models: ModelSummary[], delta: number | null): UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport['summary']['recommendedAction'] {
  const clean = models.filter((model) => model.decision === 'clean_boost_research_candidate');
  const isolated = models.filter((model) => model.decision === 'isolated_boost_research_candidate');
  if ((delta ?? 0) < 0 && (clean.length || isolated.length)) return 'reject_combined_boost_validate_segments';
  if (clean.some((model) => model.setupType === 'SweepMssFvgRetrace') && (delta ?? 0) >= 0 && isolated.length === 0) {
    return 'broader_replay_validate_sweep_only';
  }
  if (clean.length || isolated.length) return 'broader_replay_validate_positive_families_separately';
  return 'reject_boost_for_now';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Positive Family Boost Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only positive-family boost validation. It does not install boosts, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Positive-family rows: ${report.summary.positiveFamilyRows}.`,
    `- Boost candidate models: ${report.summary.boostCandidateModels}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Top changed slates: ${report.summary.topChangedSlates}.`,
    `- Top selection P/L before/after: ${report.summary.topBeforeOneMesPl ?? '-'} / ${report.summary.topAfterOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Models',
    '| Decision | Model | Rows | W/L/U | P/L | Avg Risk | Avg MFE R | Avg MAE R | Same-bar Losses | Stale Losses | Reason |',
    '|---|---|---:|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.models.map((row) => `| ${row.decision} | ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.avgMfeR ?? '-'} | ${row.avgMaeR ?? '-'} | ${row.sameBarLosses} | ${row.staleLosses} | ${escapeTable(row.reason)} |`),
    '',
    '## Changed Slates',
    '| Slate | Rows | Top Before | Model Before | P/L Before | Top After | Model After | P/L After |',
    '|---|---:|---|---|---:|---|---|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${escapeTable(row.topBeforeTicketId ?? '-')} | ${escapeTable(row.topBeforeSetupType ?? '-')} | ${row.topBeforeOneMesPl ?? '-'} | ${escapeTable(row.topAfterTicketId ?? '-')} | ${escapeTable(row.topAfterSetupType ?? '-')} | ${row.topAfterOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  selectedSetupTypes?: string[];
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport {
  const sourceRows = args.sourceProofTimingReport?.rows || [];
  const selectedSetupTypes = args.selectedSetupTypes?.length ? args.selectedSetupTypes : DEFAULT_POSITIVE_FAMILIES;
  const positiveFamilies = new Set(selectedSetupTypes);
  const models = buildModelSummaries(sourceRows, positiveFamilies);
  const boostModels = new Set(models.filter((model) => model.decision !== 'reject_boost_for_now').map((model) => model.setupType));
  const simulation = buildSimulation(sourceRows, boostModels);
  const topBeforeOneMesPl = sum(simulation.slates.map((row) => row.topBeforeOneMesPl));
  const topAfterOneMesPl = sum(simulation.slates.map((row) => row.topAfterOneMesPl));
  const delta = topBeforeOneMesPl === null || topAfterOneMesPl === null ? null : round(topAfterOneMesPl - topBeforeOneMesPl);
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    sourceRows.length === 0 ? 'no source/proof timing rows found' : null,
    models.length === 0 ? 'no positive-family rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = blockers.length ? 'reject_boost_for_now' : recommendedAction(models, delta);
  const base: Omit<UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_positive_family_boost_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      selectedSetupTypes,
    },
    assumptions: {
      validationIsResearchOnly: true,
      boostIsHypotheticalOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      modelFamilyIsPreOutcomeFeature: true,
      noRankBoostInstalled: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    scoring: {
      positiveFamilyBoostPoints: POSITIVE_FAMILY_BOOST_POINTS,
      baselineDoesNotUseOutcome: true,
    },
    summary: {
      sourceRows: sourceRows.length,
      positiveFamilyRows: sourceRows.filter((row) => positiveFamilies.has(row.setupType)).length,
      boostCandidateModels: boostModels.size,
      slates: simulation.slates.length,
      topChangedSlates: simulation.slates.filter((row) => row.topChanged).length,
      topBeforeOneMesPl,
      topAfterOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      recommendedAction: rec,
      livePromotionAllowedRows: 0,
    },
    models,
    slates: simulation.slates,
    rows: simulation.rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use positive-family boost validation until the source/proof timing report is present and passing.']
      : rec === 'reject_combined_boost_validate_segments'
        ? [
          'Reject a blanket positive-family boost for now because same-slate top selection worsened.',
          'Continue with segmented proof filters for SweepMssFvgRetrace and AfterLunchDriveFvgContinuation separately.',
          'Do not change live ranking, canExecute, Discord, Supabase, or entry/stop/target/risk from this diagnostic.',
        ]
        : rec === 'broader_replay_validate_positive_families_separately'
        ? [
          'Validate SweepMssFvgRetrace and AfterLunchDriveFvgContinuation in separate broader replay packages before any scanner-visible boost.',
          'Do not change live ranking, canExecute, Discord, Supabase, or entry/stop/target/risk from this diagnostic.',
        ]
        : rec === 'broader_replay_validate_sweep_only'
          ? ['Validate SweepMssFvgRetrace in a broader replay package before any scanner-visible boost.']
          : ['Reject positive-family boost for now.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport(
  report: UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-positive-family-boost-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const selectedSetupTypes = (readFlag(args, '--setup-types') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const report = buildUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? JSON.parse(fs.readFileSync(sourceProofTimingPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport
      : null,
    selectedSetupTypes,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationCli();
}
