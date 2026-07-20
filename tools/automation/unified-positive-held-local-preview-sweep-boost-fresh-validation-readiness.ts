import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport } from './unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport } from './unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport } from './unified-positive-held-local-preview-sweep-boost-guarded-validation-contract';

interface ReportRef {
  filePath: string;
  reportType: string;
  status: string;
  source: Record<string, unknown>;
}

interface CandidatePackage {
  artifactPath: string;
  startDate: string;
  endDate: string;
  replayPackagePath: string | null;
  outcomePath: string | null;
  sourceProofTimingPath: string | null;
  complete: boolean;
  missing: string[];
}

export interface UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport {
  reportType: 'unified_positive_held_local_preview_sweep_boost_fresh_validation_readiness';
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
    validationContractPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    readinessAuditOnly: true;
    noFreshDataGeneration: true;
    noRuntimeRankingChange: true;
    livePromotionAllowed: false;
  };
  lockedEvidence: {
    guardFeature: string | null;
    trainArtifactPath: string | null;
    testArtifactPath: string | null;
    latestLockedEndDate: string | null;
  };
  summary: {
    rawArtifactsScanned: number;
    candidateArtifactsAfterLockedEnd: number;
    completeCandidatePackages: number;
    bestCandidateArtifactPath: string | null;
    freshValidationReady: boolean;
    livePromotionAllowedRows: 0;
    recommendation: 'run_fresh_validation_contract' | 'generate_fresh_unseen_saved_package' | 'fix_inputs';
  };
  candidates: CandidatePackage[];
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

function latestFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport['authority'] {
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

function normalize(filePath: string | null | undefined, reportDir: string): string | null {
  if (!filePath) return null;
  return path.resolve(path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath))
    .replace(/\\/g, '/')
    .replace(path.resolve(reportDir).replace(/\\/g, '/'), path.resolve(reportDir).replace(/\\/g, '/'));
}

function parseArtifactRange(filePath: string): { startDate: string; endDate: string } | null {
  const match = path.basename(filePath).match(/^raw-ohlc-scanner-artifacts-MES-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})-\d+\.json$/);
  return match ? { startDate: match[1], endDate: match[2] } : null;
}

function listReportRefs(reportDir: string): ReportRef[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .flatMap((filePath) => {
      try {
        const report = readJson<ReportRef>(filePath);
        return report?.reportType && report?.status ? [{ filePath, reportType: report.reportType, status: report.status, source: report.source || {} }] : [];
      } catch {
        return [];
      }
    });
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Boost Fresh Validation Readiness',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report readiness audit. It does not generate data, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Guard feature: ${report.lockedEvidence.guardFeature || '-'}.`,
    `- Latest locked end date: ${report.lockedEvidence.latestLockedEndDate || '-'}.`,
    `- Raw artifacts scanned: ${report.summary.rawArtifactsScanned}.`,
    `- Candidate artifacts after locked end: ${report.summary.candidateArtifactsAfterLockedEnd}.`,
    `- Complete candidate packages: ${report.summary.completeCandidatePackages}.`,
    `- Fresh validation ready: ${report.summary.freshValidationReady}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Candidates',
    '| Artifact | Range | Replay | Outcome | Source/Proof | Complete | Missing |',
    '|---|---|---|---|---|---|---|',
    ...report.candidates.map((item) => `| ${item.artifactPath.replace(/\|/g, '/')} | ${item.startDate} to ${item.endDate} | ${item.replayPackagePath ? 'yes' : 'no'} | ${item.outcomePath ? 'yes' : 'no'} | ${item.sourceProofTimingPath ? 'yes' : 'no'} | ${item.complete} | ${item.missing.join(', ') || '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport(args: {
  reportDir?: string;
  validationContractPath?: string | null;
  validationContractReport?: UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const validationContractPath = args.validationContractPath ?? latestFile(reportDir, /^unified-positive-held-local-preview-sweep-boost-guarded-validation-contract-\d+\.json$/);
  const validationContract = args.validationContractReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport>(validationContractPath);
  const testSimulation = readJson<UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport>(validationContract?.source.testSimulationPath || null);
  const guardMiner = readJson<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport>(testSimulation?.source.guardMinerPath || null);
  const trainArtifactPath = guardMiner?.source.trainArtifactPath || null;
  const testArtifactPath = guardMiner?.source.testArtifactPath || null;
  const lockedRanges = [trainArtifactPath, testArtifactPath].map((item) => item ? parseArtifactRange(item) : null).filter((item): item is { startDate: string; endDate: string } => Boolean(item));
  const latestLockedEndDate = lockedRanges.map((item) => item.endDate).sort().at(-1) || null;
  const refs = listReportRefs(reportDir);
  const rawArtifacts = fs.existsSync(reportDir)
    ? fs.readdirSync(reportDir)
      .filter((name) => /^raw-ohlc-scanner-artifacts-MES-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}-\d+\.json$/.test(name))
      .map((name) => path.join(reportDir, name))
    : [];
  const replayByArtifact = new Map<string, string>();
  const outcomeByReplay = new Map<string, string>();
  const timingByOutcome = new Map<string, string>();
  for (const ref of refs) {
    if (ref.reportType === 'unified_positive_held_local_preview_replay_package') {
      const artifact = normalize(ref.source.triageReportPath as string | undefined, reportDir);
      if (artifact) replayByArtifact.set(artifact, ref.filePath);
    }
    if (ref.reportType === 'unified_positive_held_local_preview_replay_package_outcome') {
      const replay = normalize(ref.source.replayPackagePath as string | undefined, reportDir);
      if (replay) outcomeByReplay.set(replay, ref.filePath);
    }
    if (ref.reportType === 'unified_positive_held_local_preview_replay_package_source_proof_timing') {
      const outcome = normalize(ref.source.replayPackageOutcomePath as string | undefined, reportDir);
      if (outcome) timingByOutcome.set(outcome, ref.filePath);
    }
  }
  const candidates = rawArtifacts
    .map((artifactPath) => ({ artifactPath, range: parseArtifactRange(artifactPath) }))
    .filter((item): item is { artifactPath: string; range: { startDate: string; endDate: string } } => Boolean(item.range))
    .filter((item) => latestLockedEndDate ? item.range.endDate > latestLockedEndDate : true)
    .map((item) => {
      const normalizedArtifact = normalize(item.artifactPath, reportDir);
      const replayPackagePath = normalizedArtifact ? replayByArtifact.get(normalizedArtifact) || null : null;
      const outcomePath = replayPackagePath ? outcomeByReplay.get(normalize(replayPackagePath, reportDir) || replayPackagePath) || null : null;
      const sourceProofTimingPath = outcomePath ? timingByOutcome.get(normalize(outcomePath, reportDir) || outcomePath) || null : null;
      const missing = [
        !replayPackagePath ? 'replay package' : null,
        !outcomePath ? 'outcome report' : null,
        !sourceProofTimingPath ? 'source/proof timing report' : null,
      ].filter((part): part is string => Boolean(part));
      return {
        artifactPath: item.artifactPath,
        startDate: item.range.startDate,
        endDate: item.range.endDate,
        replayPackagePath,
        outcomePath,
        sourceProofTimingPath,
        complete: missing.length === 0,
        missing,
      };
    }).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));
  const completeCandidates = candidates.filter((item) => item.complete);
  const blockers = [
    !validationContractPath && !args.validationContractReport ? 'missing validation contract path' : null,
    !validationContract ? 'missing validation contract report' : null,
    validationContract && validationContract.status !== 'pass' ? `validation contract status ${validationContract.status}` : null,
    !guardMiner ? 'missing guard miner report from validation contract chain' : null,
    !latestLockedEndDate ? 'missing locked artifact date range' : null,
  ].filter((item): item is string => Boolean(item));
  const ready = blockers.length === 0 && completeCandidates.length > 0;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_boost_fresh_validation_readiness',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, validationContractPath },
    assumptions: {
      savedReportsOnly: true,
      readinessAuditOnly: true,
      noFreshDataGeneration: true,
      noRuntimeRankingChange: true,
      livePromotionAllowed: false,
    },
    lockedEvidence: {
      guardFeature: validationContract?.summary.guardFeature || null,
      trainArtifactPath,
      testArtifactPath,
      latestLockedEndDate,
    },
    summary: {
      rawArtifactsScanned: rawArtifacts.length,
      candidateArtifactsAfterLockedEnd: candidates.length,
      completeCandidatePackages: completeCandidates.length,
      bestCandidateArtifactPath: completeCandidates.at(-1)?.artifactPath || null,
      freshValidationReady: ready,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : ready ? 'run_fresh_validation_contract' : 'generate_fresh_unseen_saved_package',
    },
    candidates,
    blockers,
    recommendations: blockers.length
      ? ['Fix the validation contract chain before checking fresh validation readiness.']
      : ready
        ? ['Run the locked fresh-validation contract command sequence against the newest complete unseen package.']
        : [
          'No complete fresh unseen saved package exists yet. Generate or wait for a later raw scanner artifact, replay package, outcome report, and source/proof timing report.',
          'Do not promote the Sweep guarded boost while freshValidationReady is false.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport(
  report: UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-boost-fresh-validation-readiness-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessCli(args = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport({
    reportDir: outDir,
    validationContractPath: readFlag(args, '--validation-contract'),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessCli();
}
