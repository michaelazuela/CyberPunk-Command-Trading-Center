import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport } from './unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation';

export interface UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport {
  reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_validation_contract';
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
    trainSimulationPath: string | null;
    testSimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    contractOnly: true;
    noRuntimeRankingChange: true;
    noLivePromotionAllowed: true;
  };
  summary: {
    guardFeature: string | null;
    trainGuardedDeltaOneMesPl: number | null;
    testGuardedDeltaOneMesPl: number | null;
    trainImprovementOverRawOneMesPl: number | null;
    testImprovementOverRawOneMesPl: number | null;
    researchContractReady: boolean;
    livePromotionAllowedRows: 0;
    recommendation: 'wait_for_fresh_unseen_artifact' | 'fix_inputs';
  };
  freshValidationRequirements: string[];
  commandTemplate: string[];
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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestMatchingFile(reportDir: string, period: 'train' | 'test'): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => /^unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .map((filePath) => ({ filePath, report: readJson<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport>(filePath) }))
    .filter((item) => item.report?.source.period === period)
    .sort((a, b) => fs.statSync(b.filePath).mtimeMs - fs.statSync(a.filePath).mtimeMs)[0]?.filePath || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport['authority'] {
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

function requirements(feature: string | null): string[] {
  return [
    'Use a fresh unseen raw scanner artifact and matching outcome report that were not used to mine the guard feature.',
    'Generate a fresh Sweep-only positive-family boost validation report for that unseen package.',
    'Generate a fresh Sweep collision drilldown and collision snapshot guard-miner report using the same guard feature.',
    `Run guarded selection with guard feature: ${feature || '<missing guard feature>'}.`,
    'Pass condition: guarded delta must be positive and greater than raw Sweep-only boost delta.',
    'Pass condition: reverted worsened slates must be greater than or equal to reverted improved slates.',
    'Pass condition: no Discord, Supabase, bridge, canExecute, entry, stop, target, risk, or live ranking behavior changes are made during validation.',
  ];
}

function commandTemplate(feature: string | null): string[] {
  return [
    'npm run diagnostic:held-local-preview-positive-family-boost-validation -- --source-proof-timing <fresh-source-proof-timing.json> --setup-types NoInstalledSetup --json',
    'npm run diagnostic:held-local-preview-sweep-boost-collision-drilldown -- --source-proof-timing <fresh-source-proof-timing.json> --boost-validation <fresh-sweep-boost-validation.json> --json',
    'npm run diagnostic:held-local-preview-sweep-boost-collision-snapshot-guard-miner -- --train-collision <locked-train-collision.json> --train-artifact <locked-train-artifact.json> --test-collision <fresh-collision.json> --test-artifact <fresh-raw-scanner-artifact.json> --json',
    `npm run diagnostic:held-local-preview-sweep-boost-guarded-selection-simulation -- --boost-validation <fresh-sweep-boost-validation.json> --guard-miner <fresh-guard-miner.json> --period test --guard-feature "${feature || '<guard-feature>'}" --json`,
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Boost Guarded Validation Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only contract report. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Guard feature: ${report.summary.guardFeature || '-'}.`,
    `- Train/test guarded delta: ${report.summary.trainGuardedDeltaOneMesPl ?? '-'} / ${report.summary.testGuardedDeltaOneMesPl ?? '-'}.`,
    `- Train/test improvement over raw: ${report.summary.trainImprovementOverRawOneMesPl ?? '-'} / ${report.summary.testImprovementOverRawOneMesPl ?? '-'}.`,
    `- Research contract ready: ${report.summary.researchContractReady}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Fresh Validation Requirements',
    ...report.freshValidationRequirements.map((item) => `- ${item}`),
    '',
    '## Command Template',
    ...report.commandTemplate.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport(args: {
  reportDir?: string;
  trainSimulationPath?: string | null;
  testSimulationPath?: string | null;
  trainSimulationReport?: UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport | null;
  testSimulationReport?: UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const trainSimulationPath = args.trainSimulationPath ?? latestMatchingFile(reportDir, 'train');
  const testSimulationPath = args.testSimulationPath ?? latestMatchingFile(reportDir, 'test');
  const train = args.trainSimulationReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport>(trainSimulationPath);
  const test = args.testSimulationReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport>(testSimulationPath);
  const feature = test?.source.guardFeature || train?.source.guardFeature || null;
  const blockers = [
    !trainSimulationPath && !args.trainSimulationReport ? 'missing train guarded selection simulation path' : null,
    !testSimulationPath && !args.testSimulationReport ? 'missing test guarded selection simulation path' : null,
    !train ? 'missing train guarded selection simulation report' : null,
    !test ? 'missing test guarded selection simulation report' : null,
    train && train.status !== 'pass' ? `train simulation status ${train.status}` : null,
    test && test.status !== 'pass' ? `test simulation status ${test.status}` : null,
    train && train.source.period !== 'train' ? `expected train period, got ${train.source.period}` : null,
    test && test.source.period !== 'test' ? `expected test period, got ${test.source.period}` : null,
    !feature ? 'missing guard feature' : null,
    train && (train.summary.guardedDeltaOneMesPl ?? 0) <= (train.summary.rawBoostDeltaOneMesPl ?? 0) ? 'train guarded delta does not beat raw boost delta' : null,
    test && (test.summary.guardedDeltaOneMesPl ?? 0) <= (test.summary.rawBoostDeltaOneMesPl ?? 0) ? 'test guarded delta does not beat raw boost delta' : null,
  ].filter((item): item is string => Boolean(item));
  const ready = blockers.length === 0;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_validation_contract',
    generatedAt,
    status: ready ? 'pass' : 'fail',
    authority: authority(),
    source: { reportDir, trainSimulationPath, testSimulationPath },
    assumptions: {
      savedReportsOnly: true,
      contractOnly: true,
      noRuntimeRankingChange: true,
      noLivePromotionAllowed: true,
    },
    summary: {
      guardFeature: feature,
      trainGuardedDeltaOneMesPl: train?.summary.guardedDeltaOneMesPl ?? null,
      testGuardedDeltaOneMesPl: test?.summary.guardedDeltaOneMesPl ?? null,
      trainImprovementOverRawOneMesPl: train?.summary.guardImprovementOverRawOneMesPl ?? null,
      testImprovementOverRawOneMesPl: test?.summary.guardImprovementOverRawOneMesPl ?? null,
      researchContractReady: ready,
      livePromotionAllowedRows: 0,
      recommendation: ready ? 'wait_for_fresh_unseen_artifact' : 'fix_inputs',
    },
    freshValidationRequirements: requirements(feature),
    commandTemplate: commandTemplate(feature),
    blockers,
    recommendations: ready
      ? [
        'Wait for a fresh unseen scanner artifact before proposing any live-facing Sweep guarded boost.',
        'Do not change canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, or live ranking from this contract.',
      ]
      : ['Fix the guarded selection train/test inputs before using this validation contract.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport(
  report: UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-boost-guarded-validation-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractCli(args = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport({
    reportDir: outDir,
    trainSimulationPath: readFlag(args, '--train-simulation'),
    testSimulationPath: readFlag(args, '--test-simulation'),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractCli();
}
