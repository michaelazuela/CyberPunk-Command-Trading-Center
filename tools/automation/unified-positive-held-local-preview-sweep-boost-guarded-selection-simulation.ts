import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport } from './unified-positive-held-local-preview-positive-family-boost-validation';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport } from './unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner';

type Period = 'train' | 'test';

interface SlateSelection {
  slateId: string;
  topBeforeTicketId: string | null;
  topBeforeSetupType: string | null;
  topBeforeOneMesPl: number | null;
  rawBoostTicketId: string | null;
  rawBoostSetupType: string | null;
  rawBoostOneMesPl: number | null;
  guardedTicketId: string | null;
  guardedSetupType: string | null;
  guardedOneMesPl: number | null;
  revertedByGuard: boolean;
  guardedFeatureMatched: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport {
  reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_selection_simulation';
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
    boostValidationPath: string | null;
    guardMinerPath: string | null;
    period: Period;
    guardFeature: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    rawBoostRemainsHypothetical: true;
    guardIsHypotheticalOnly: true;
    usesOutcomeOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    slates: number;
    rawChangedSlates: number;
    revertedByGuard: number;
    revertedImprovedSlates: number;
    revertedWorsenedSlates: number;
    revertedSameSlates: number;
    baselineOneMesPl: number | null;
    rawBoostOneMesPl: number | null;
    guardedOneMesPl: number | null;
    rawBoostDeltaOneMesPl: number | null;
    guardedDeltaOneMesPl: number | null;
    guardImprovementOverRawOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'fresh_validate_guard_before_live' | 'reject_guard_for_now' | 'fix_inputs';
  };
  slates: SlateSelection[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP = 'SweepMssFvgRetrace';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport['authority'] {
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

function delta(after: number | null, before: number | null): number | null {
  return typeof after === 'number' && typeof before === 'number' ? round(after - before) : null;
}

function bucket(value: number | null): 'improved' | 'worsened' | 'same' {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return 'same';
  return value > 0 ? 'improved' : 'worsened';
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Boost Guarded Selection Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report guarded selection simulation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Period: ${report.source.period}.`,
    `- Guard feature: ${report.source.guardFeature || '-'}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Raw changed slates: ${report.summary.rawChangedSlates}.`,
    `- Reverted by guard: ${report.summary.revertedByGuard}.`,
    `- Reverted improved/worsened/same: ${report.summary.revertedImprovedSlates}/${report.summary.revertedWorsenedSlates}/${report.summary.revertedSameSlates}.`,
    `- Baseline/raw/guarded P/L: ${report.summary.baselineOneMesPl ?? '-'} / ${report.summary.rawBoostOneMesPl ?? '-'} / ${report.summary.guardedOneMesPl ?? '-'}.`,
    `- Raw/guarded delta: ${report.summary.rawBoostDeltaOneMesPl ?? '-'} / ${report.summary.guardedDeltaOneMesPl ?? '-'}.`,
    `- Guard improvement over raw: ${report.summary.guardImprovementOverRawOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport(args: {
  reportDir?: string;
  boostValidationPath?: string | null;
  guardMinerPath?: string | null;
  boostValidationReport?: UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport | null;
  guardMinerReport?: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport | null;
  period?: Period;
  guardFeature?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const boostValidationPath = args.boostValidationPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-positive-family-boost-validation-\d+\.json$/);
  const guardMinerPath = args.guardMinerPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner-\d+\.json$/);
  const boostValidationReport = args.boostValidationReport ?? readJson<UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport>(boostValidationPath);
  const guardMinerReport = args.guardMinerReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport>(guardMinerPath);
  const period = args.period || 'test';
  const guardFeature = args.guardFeature ?? guardMinerReport?.summary.bestCandidateFeature ?? null;
  const guardedIds = new Set(
    (guardMinerReport?.rows || [])
      .filter((row) => row.period === period && guardFeature && row.features.includes(guardFeature))
      .map((row) => row.ticketId),
  );
  const slates = (boostValidationReport?.slates || []).map((slate) => {
    const guardedFeatureMatched = Boolean(slate.topAfterTicketId && guardedIds.has(slate.topAfterTicketId));
    const revertedByGuard = Boolean(
      slate.topChanged &&
      slate.topAfterSetupType === SWEEP &&
      guardedFeatureMatched,
    );
    return {
      slateId: slate.slateId,
      topBeforeTicketId: slate.topBeforeTicketId,
      topBeforeSetupType: slate.topBeforeSetupType,
      topBeforeOneMesPl: slate.topBeforeOneMesPl,
      rawBoostTicketId: slate.topAfterTicketId,
      rawBoostSetupType: slate.topAfterSetupType,
      rawBoostOneMesPl: slate.topAfterOneMesPl,
      guardedTicketId: revertedByGuard ? slate.topBeforeTicketId : slate.topAfterTicketId,
      guardedSetupType: revertedByGuard ? slate.topBeforeSetupType : slate.topAfterSetupType,
      guardedOneMesPl: revertedByGuard ? slate.topBeforeOneMesPl : slate.topAfterOneMesPl,
      revertedByGuard,
      guardedFeatureMatched,
    };
  });
  const reverted = slates.filter((slate) => slate.revertedByGuard);
  const baselineOneMesPl = sum(slates.map((slate) => slate.topBeforeOneMesPl));
  const rawBoostOneMesPl = sum(slates.map((slate) => slate.rawBoostOneMesPl));
  const guardedOneMesPl = sum(slates.map((slate) => slate.guardedOneMesPl));
  const rawBoostDeltaOneMesPl = delta(rawBoostOneMesPl, baselineOneMesPl);
  const guardedDeltaOneMesPl = delta(guardedOneMesPl, baselineOneMesPl);
  const guardImprovementOverRawOneMesPl = delta(guardedOneMesPl, rawBoostOneMesPl);
  const blockers = [
    !boostValidationPath && !args.boostValidationReport ? 'missing boost validation path' : null,
    !guardMinerPath && !args.guardMinerReport ? 'missing guard miner path' : null,
    !boostValidationReport ? 'missing boost validation report' : null,
    !guardMinerReport ? 'missing guard miner report' : null,
    boostValidationReport && boostValidationReport.status !== 'pass' ? `boost validation status ${boostValidationReport.status}` : null,
    guardMinerReport && guardMinerReport.status !== 'pass' ? `guard miner status ${guardMinerReport.status}` : null,
    boostValidationReport && (boostValidationReport.source.selectedSetupTypes.length !== 1 || boostValidationReport.source.selectedSetupTypes[0] !== SWEEP) ? `expected Sweep-only boost validation, got ${boostValidationReport.source.selectedSetupTypes.join(',') || 'none'}` : null,
    !guardFeature ? 'missing guard feature' : null,
    slates.length === 0 ? 'no slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = blockers.length
    ? 'fix_inputs'
    : (guardedDeltaOneMesPl ?? -Infinity) > (rawBoostDeltaOneMesPl ?? -Infinity) && (guardedDeltaOneMesPl ?? 0) > 0
      ? 'fresh_validate_guard_before_live'
      : 'reject_guard_for_now';
  const revertedBuckets = reverted.map((slate) => bucket(delta(slate.rawBoostOneMesPl, slate.topBeforeOneMesPl)));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_selection_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, boostValidationPath, guardMinerPath, period, guardFeature },
    assumptions: {
      savedReportsOnly: true,
      rawBoostRemainsHypothetical: true,
      guardIsHypotheticalOnly: true,
      usesOutcomeOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      slates: slates.length,
      rawChangedSlates: (boostValidationReport?.slates || []).filter((slate) => slate.topChanged).length,
      revertedByGuard: reverted.length,
      revertedImprovedSlates: revertedBuckets.filter((item) => item === 'improved').length,
      revertedWorsenedSlates: revertedBuckets.filter((item) => item === 'worsened').length,
      revertedSameSlates: revertedBuckets.filter((item) => item === 'same').length,
      baselineOneMesPl,
      rawBoostOneMesPl,
      guardedOneMesPl,
      rawBoostDeltaOneMesPl,
      guardedDeltaOneMesPl,
      guardImprovementOverRawOneMesPl,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: rec,
    },
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix boost validation and guard-miner inputs before guarded selection simulation.']
      : rec === 'fresh_validate_guard_before_live'
        ? [
          'Guarded Sweep selection improves the saved-report package, but it remains research-only until fresh validation.',
          'Do not install a raw Sweep boost or guard from this report alone.',
          'Keep canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, and live ranking unchanged.',
        ]
        : [
          'Reject this guard for now because guarded selection did not improve over raw Sweep boost.',
          'Keep canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, and live ranking unchanged.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport(
  report: UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationCli(args = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const periodFlag = readFlag(args, '--period');
  const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport({
    reportDir: outDir,
    boostValidationPath: readFlag(args, '--boost-validation'),
    guardMinerPath: readFlag(args, '--guard-miner'),
    period: periodFlag === 'train' ? 'train' : 'test',
    guardFeature: readFlag(args, '--guard-feature') || undefined,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationCli();
}
