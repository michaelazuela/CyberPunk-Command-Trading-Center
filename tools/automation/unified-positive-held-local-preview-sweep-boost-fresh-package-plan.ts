import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport,
} from './unified-positive-held-local-preview-sweep-boost-fresh-validation-readiness';

interface PackageRequirement {
  name: string;
  required: true;
  satisfied: boolean;
  evidencePath: string | null;
}

export interface UnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport {
  reportType: 'unified_positive_held_local_preview_sweep_boost_fresh_package_plan';
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
    readinessPath: string | null;
  };
  lockedBoundary: {
    guardFeature: string | null;
    latestLockedEndDate: string | null;
    minimumFreshArtifactEndDateExclusive: string | null;
  };
  selectedCandidate: {
    artifactPath: string | null;
    startDate: string | null;
    endDate: string | null;
    complete: boolean;
    missing: string[];
  };
  requirements: PackageRequirement[];
  nextCommands: string[];
  summary: {
    readinessStatus: string | null;
    freshValidationReady: boolean;
    requirementsSatisfied: number;
    requirementsTotal: number;
    missingRequirements: number;
    recommendation: 'run_locked_validation' | 'build_fresh_unseen_package' | 'fix_readiness_inputs';
    livePromotionAllowedRows: 0;
  };
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport['authority'] {
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

function commandPlan(report: UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport | null): string[] {
  const bestCandidate = report?.candidates.find((candidate) => candidate.complete) || null;
  if (bestCandidate && report?.summary.freshValidationReady) {
    return [
      'npm run diagnostic:held-local-preview-positive-family-boost-validation -- --source-proof-timing <fresh-source-proof-timing-report> --model-family SweepMssFvgRetrace --json',
      'npm run diagnostic:held-local-preview-sweep-boost-guarded-selection-simulation -- --boost-validation <fresh-boost-validation-report> --guard-miner <locked-guard-miner-report> --period fresh --json',
      'npm run diagnostic:held-local-preview-sweep-boost-guarded-validation-contract -- --train-simulation <locked-train-simulation> --test-simulation <fresh-guarded-simulation> --json',
    ];
  }
  return [
    'npm run diagnostic:bridge-fresh-package-ready-gate -- --boundary-audit <fresh-bridge-boundary-audit> --json',
    `npm run research:raw-ohlc-scanner-artifacts -- --market-bars-json <fresh-market-bars-json> --start-date <date-after-${report?.lockedEvidence.latestLockedEndDate || 'locked-end'}> --end-date <fresh-date> --instrument MES --sessions morning,lunch --json`,
    'npx tsx tools/automation/raw-ohlc-scanner-artifact-replay-package.ts -- --scanner-artifact <fresh-raw-scanner-artifact> --json',
    'npm run diagnostic:held-local-preview-replay-package-outcome -- --replay-package <fresh-replay-package> --json',
    'npm run diagnostic:held-local-preview-replay-package-source-proof-timing -- --replay-package-outcome <fresh-outcome-report> --json',
    'npm run diagnostic:held-local-preview-sweep-boost-fresh-validation-readiness -- --validation-contract <locked-validation-contract> --json',
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Boost Fresh Package Plan',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only package planning. It does not generate data, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Boundary',
    `- Guard feature: ${report.lockedBoundary.guardFeature || '-'}.`,
    `- Latest locked end date: ${report.lockedBoundary.latestLockedEndDate || '-'}.`,
    `- Fresh artifact must end after: ${report.lockedBoundary.minimumFreshArtifactEndDateExclusive || '-'}.`,
    '',
    '## Selected Candidate',
    `- Artifact: ${report.selectedCandidate.artifactPath || '-'}.`,
    `- Range: ${report.selectedCandidate.startDate || '-'} to ${report.selectedCandidate.endDate || '-'}.`,
    `- Complete: ${report.selectedCandidate.complete}.`,
    `- Missing: ${report.selectedCandidate.missing.join(', ') || '-'}.`,
    '',
    '## Requirements',
    ...report.requirements.map((item) => `- ${item.name}: ${item.satisfied ? 'satisfied' : 'missing'}${item.evidencePath ? ` (${item.evidencePath})` : ''}.`),
    '',
    '## Next Commands',
    ...report.nextCommands.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport(args: {
  reportDir?: string;
  readinessPath?: string | null;
  readinessReport?: UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const readinessPath = args.readinessPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-sweep-boost-fresh-validation-readiness-\d+\.json$/);
  const readiness = args.readinessReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport>(readinessPath);
  const selectedCandidate = readiness?.candidates.find((candidate) => candidate.complete) || readiness?.candidates.at(-1) || null;
  const requirements: PackageRequirement[] = [
    {
      name: 'fresh raw scanner artifact ending after locked evidence',
      required: true,
      satisfied: Boolean(selectedCandidate?.artifactPath),
      evidencePath: selectedCandidate?.artifactPath || null,
    },
    {
      name: 'fresh replay package',
      required: true,
      satisfied: Boolean(selectedCandidate?.replayPackagePath),
      evidencePath: selectedCandidate?.replayPackagePath || null,
    },
    {
      name: 'fresh outcome report',
      required: true,
      satisfied: Boolean(selectedCandidate?.outcomePath),
      evidencePath: selectedCandidate?.outcomePath || null,
    },
    {
      name: 'fresh source/proof timing report',
      required: true,
      satisfied: Boolean(selectedCandidate?.sourceProofTimingPath),
      evidencePath: selectedCandidate?.sourceProofTimingPath || null,
    },
  ];
  const blockers = [
    !readinessPath && !args.readinessReport ? 'missing readiness report path' : null,
    !readiness ? 'missing readiness report' : null,
    readiness && readiness.status !== 'pass' ? `readiness status ${readiness.status}` : null,
    readiness && !readiness.lockedEvidence.latestLockedEndDate ? 'readiness report missing locked end date' : null,
  ].filter((item): item is string => Boolean(item));
  const requirementsSatisfied = requirements.filter((item) => item.satisfied).length;
  const ready = blockers.length === 0 && Boolean(readiness?.summary.freshValidationReady) && requirementsSatisfied === requirements.length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_boost_fresh_package_plan',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, readinessPath },
    lockedBoundary: {
      guardFeature: readiness?.lockedEvidence.guardFeature || null,
      latestLockedEndDate: readiness?.lockedEvidence.latestLockedEndDate || null,
      minimumFreshArtifactEndDateExclusive: readiness?.lockedEvidence.latestLockedEndDate || null,
    },
    selectedCandidate: {
      artifactPath: selectedCandidate?.artifactPath || null,
      startDate: selectedCandidate?.startDate || null,
      endDate: selectedCandidate?.endDate || null,
      complete: Boolean(selectedCandidate?.complete),
      missing: selectedCandidate?.missing || requirements.filter((item) => !item.satisfied).map((item) => item.name),
    },
    requirements,
    nextCommands: commandPlan(readiness),
    summary: {
      readinessStatus: readiness?.status || null,
      freshValidationReady: Boolean(readiness?.summary.freshValidationReady),
      requirementsSatisfied,
      requirementsTotal: requirements.length,
      missingRequirements: requirements.length - requirementsSatisfied,
      recommendation: blockers.length ? 'fix_readiness_inputs' : ready ? 'run_locked_validation' : 'build_fresh_unseen_package',
      livePromotionAllowedRows: 0,
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the readiness audit before planning the fresh package.']
      : ready
        ? [
          'Run the locked validation sequence against the complete fresh unseen package.',
          'Keep the Sweep guarded boost research-only until validation remains positive.',
        ]
        : [
          'Build the missing fresh package artifacts before any Sweep guarded boost proposal.',
          'Do not reuse the locked July train/test reports as fresh proof.',
          'Do not change scanner-visible ranking while freshValidationReady is false.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport(
  report: UnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-boost-fresh-package-plan-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanCli(args = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport({
    reportDir: outDir,
    readinessPath: readFlag(args, '--readiness'),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanCli();
}
