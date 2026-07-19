import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-approval-checkpoint';

interface CliOptions {
  runtimeApprovalCheckpoint: string;
  setupScannerPath: string;
  typesPath: string;
  unifiedDeskCandidateBookPath: string;
  outDir: string;
  json: boolean;
}

export interface RuntimeSignalAuditSourceText {
  setupScannerText: string;
  typesText: string;
  unifiedDeskCandidateBookText: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport['authority'];
  source: {
    reportDir: string;
    runtimeApprovalCheckpointPath: string | null;
    setupScannerPath: string;
    typesPath: string;
    unifiedDeskCandidateBookPath: string;
  };
  assumptions: {
    auditOnly: true;
    noRuntimeChangeInstalled: true;
    noScannerVisibleSelectionInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    checkpointStatus: string | null;
    checkpointRecommendation: string | null;
    setupCandidateHasSelectorDecisionField: boolean;
    setupCandidateHasProofStateField: boolean;
    setupCandidateHasBarsSourceField: boolean;
    setupCandidateHasOutcomeInputStatusField: boolean;
    setupScannerConsumesKeepLaterSweepProof: boolean;
    setupScannerConsumesSelectorDecision: boolean;
    unifiedBookHasSelectorDecision: boolean;
    unifiedBookHasKeepLaterSweepProofDecision: boolean;
    unifiedBookSelectorAuditOnly: boolean;
    runtimeInstallBlockedByMissingLiveSignal: boolean;
    safeRuntimeInstallAllowedNow: false;
    recommendation: 'add_scanner_owned_live_signal_contract_before_runtime_ranking' | 'fix_inputs';
  };
  gaps: string[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const REPO_ROOT = path.resolve(__dirname, '..', '..');

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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const runtimeApprovalCheckpoint = readFlag(args, '--runtime-approval-checkpoint') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-approval-checkpoint-\d+\.json$/);
  if (!runtimeApprovalCheckpoint) throw new Error('--runtime-approval-checkpoint is required.');
  return {
    runtimeApprovalCheckpoint: path.resolve(runtimeApprovalCheckpoint),
    setupScannerPath: path.resolve(readFlag(args, '--setup-scanner') || path.join(REPO_ROOT, 'src', 'lib', 'setupScanner.ts')),
    typesPath: path.resolve(readFlag(args, '--types') || path.join(REPO_ROOT, 'src', 'types.ts')),
    unifiedDeskCandidateBookPath: path.resolve(readFlag(args, '--unified-desk-candidate-book') || path.join(REPO_ROOT, 'src', 'lib', 'unifiedDeskCandidateBook.ts')),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport['authority'] {
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

function extractSetupCandidateBlock(typesText: string): string {
  const start = typesText.indexOf('export interface SetupCandidate');
  if (start < 0) return '';
  const nextInterface = typesText.indexOf('\nexport interface ', start + 'export interface SetupCandidate'.length);
  return typesText.slice(start, nextInterface >= 0 ? nextInterface : undefined);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive Sweep Keep-Later-Proof Runtime Signal Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only audit. It does not install selector behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Runtime approval checkpoint status: ${report.summary.checkpointStatus ?? '-'}.`,
    `- Runtime approval checkpoint recommendation: ${report.summary.checkpointRecommendation ?? '-'}.`,
    `- SetupCandidate has selectorDecision field: ${report.summary.setupCandidateHasSelectorDecisionField}.`,
    `- SetupCandidate has proofState field: ${report.summary.setupCandidateHasProofStateField}.`,
    `- SetupCandidate has barsSource field: ${report.summary.setupCandidateHasBarsSourceField}.`,
    `- SetupCandidate has outcomeInputStatus field: ${report.summary.setupCandidateHasOutcomeInputStatusField}.`,
    `- setupScanner consumes keep_later_sweep_proof: ${report.summary.setupScannerConsumesKeepLaterSweepProof}.`,
    `- setupScanner consumes selectorDecision: ${report.summary.setupScannerConsumesSelectorDecision}.`,
    `- Unified book has selector decision: ${report.summary.unifiedBookHasSelectorDecision}.`,
    `- Unified book has keep_later_sweep_proof decision: ${report.summary.unifiedBookHasKeepLaterSweepProofDecision}.`,
    `- Unified book selector is audit-only: ${report.summary.unifiedBookSelectorAuditOnly}.`,
    `- Runtime install blocked by missing live signal: ${report.summary.runtimeInstallBlockedByMissingLiveSignal}.`,
    `- Safe runtime install allowed now: ${report.summary.safeRuntimeInstallAllowedNow}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Gaps',
    ...(report.gaps.length ? report.gaps.map((gap) => `- ${gap}`) : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport(args: {
  runtimeApprovalCheckpointPath: string | null;
  runtimeApprovalCheckpoint: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport | null;
  sourceText: RuntimeSignalAuditSourceText;
  setupScannerPath?: string;
  typesPath?: string;
  unifiedDeskCandidateBookPath?: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport {
  const checkpoint = args.runtimeApprovalCheckpoint;
  const setupCandidateBlock = extractSetupCandidateBlock(args.sourceText.typesText);
  const setupCandidateHasSelectorDecisionField = /\bselectorDecision\s*\??\s*:/.test(setupCandidateBlock);
  const setupCandidateHasProofStateField = /\bproofState\s*\??\s*:/.test(setupCandidateBlock);
  const setupCandidateHasBarsSourceField = /\bbarsSource\s*\??\s*:/.test(setupCandidateBlock);
  const setupCandidateHasOutcomeInputStatusField = /\boutcomeInputStatus\s*\??\s*:/.test(setupCandidateBlock);
  const setupScannerConsumesKeepLaterSweepProof = args.sourceText.setupScannerText.includes('keep_later_sweep_proof');
  const setupScannerConsumesSelectorDecision = /\bselectorDecision\b/.test(args.sourceText.setupScannerText);
  const unifiedBookHasSelectorDecision = /\bselectorDecision\b/.test(args.sourceText.unifiedDeskCandidateBookText);
  const unifiedBookHasKeepLaterSweepProofDecision = args.sourceText.unifiedDeskCandidateBookText.includes('keep_later_sweep_proof');
  const unifiedBookSelectorAuditOnly = args.sourceText.unifiedDeskCandidateBookText.includes('liveInstallAllowed: false') &&
    args.sourceText.unifiedDeskCandidateBookText.includes('scannerVisibleChangeAllowed: false');
  const checkpointValid = checkpoint?.status === 'pass' &&
    checkpoint.summary.recommendation === 'request_explicit_runtime_install_approval_or_continue_research';
  const runtimeLiveSignalAvailable = setupCandidateHasSelectorDecisionField ||
    setupCandidateHasProofStateField ||
    setupCandidateHasBarsSourceField ||
    setupCandidateHasOutcomeInputStatusField ||
    setupScannerConsumesKeepLaterSweepProof ||
    setupScannerConsumesSelectorDecision;
  const runtimeInstallBlockedByMissingLiveSignal = checkpointValid &&
    unifiedBookHasSelectorDecision &&
    unifiedBookHasKeepLaterSweepProofDecision &&
    unifiedBookSelectorAuditOnly &&
    !runtimeLiveSignalAvailable;
  const inputBlockers = [
    !args.runtimeApprovalCheckpointPath ? 'missing runtime approval checkpoint path' : null,
    !checkpoint ? 'missing runtime approval checkpoint report' : null,
    checkpoint && checkpoint.status !== 'pass' ? `runtime approval checkpoint status is ${checkpoint.status}` : null,
    checkpoint && checkpoint.summary.recommendation !== 'request_explicit_runtime_install_approval_or_continue_research'
      ? `runtime approval checkpoint recommendation is ${checkpoint.summary.recommendation}`
      : null,
    !setupCandidateBlock ? 'SetupCandidate interface was not found in types source' : null,
    !unifiedBookHasSelectorDecision ? 'unified desk candidate book selectorDecision was not found' : null,
    !unifiedBookHasKeepLaterSweepProofDecision ? 'unified desk candidate book keep_later_sweep_proof decision was not found' : null,
  ].filter((item): item is string => Boolean(item));
  const gaps = [
    !setupCandidateHasSelectorDecisionField ? 'SetupCandidate does not expose a scanner-owned selectorDecision field.' : null,
    !setupCandidateHasProofStateField ? 'SetupCandidate does not expose a scanner-owned proofState field.' : null,
    !setupCandidateHasBarsSourceField ? 'SetupCandidate does not expose a scanner-owned barsSource field.' : null,
    !setupCandidateHasOutcomeInputStatusField ? 'SetupCandidate does not expose a scanner-owned outcomeInputStatus field.' : null,
    !setupScannerConsumesKeepLaterSweepProof ? 'setupScanner does not consume keep_later_sweep_proof.' : null,
    unifiedBookSelectorAuditOnly ? 'unifiedDeskCandidateBook selector metadata is audit-only with live/scanner-visible flags locked false.' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = inputBlockers.length
    ? 'fix_inputs'
    : 'add_scanner_owned_live_signal_contract_before_runtime_ranking';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_audit',
    generatedAt,
    status: inputBlockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      runtimeApprovalCheckpointPath: args.runtimeApprovalCheckpointPath,
      setupScannerPath: args.setupScannerPath || 'src/lib/setupScanner.ts',
      typesPath: args.typesPath || 'src/types.ts',
      unifiedDeskCandidateBookPath: args.unifiedDeskCandidateBookPath || 'src/lib/unifiedDeskCandidateBook.ts',
    },
    assumptions: {
      auditOnly: true,
      noRuntimeChangeInstalled: true,
      noScannerVisibleSelectionInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      checkpointStatus: checkpoint?.status || null,
      checkpointRecommendation: checkpoint?.summary.recommendation || null,
      setupCandidateHasSelectorDecisionField,
      setupCandidateHasProofStateField,
      setupCandidateHasBarsSourceField,
      setupCandidateHasOutcomeInputStatusField,
      setupScannerConsumesKeepLaterSweepProof,
      setupScannerConsumesSelectorDecision,
      unifiedBookHasSelectorDecision,
      unifiedBookHasKeepLaterSweepProofDecision,
      unifiedBookSelectorAuditOnly,
      runtimeInstallBlockedByMissingLiveSignal,
      safeRuntimeInstallAllowedNow: false,
      recommendation,
    },
    gaps,
    blockers: inputBlockers,
    recommendations: [
      runtimeInstallBlockedByMissingLiveSignal
        ? 'Do not install runtime rank behavior yet; first define a scanner-owned live signal contract for same-completed-5M proof selection.'
        : 'Review runtime signal availability before any scanner-visible selector work.',
      'Keep the next chunk contract-only unless the scanner-owned proof signal is demonstrably available from app-owned fields.',
      'Do not use research artifact labels as live execution or rank inputs.',
    ],
  };
  return {
    ...base,
    markdown: buildMarkdown(base),
  };
}

function runCli(): void {
  const options = parseArgs();
  const checkpoint = readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport>(options.runtimeApprovalCheckpoint);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport({
    runtimeApprovalCheckpointPath: options.runtimeApprovalCheckpoint,
    runtimeApprovalCheckpoint: checkpoint,
    sourceText: {
      setupScannerText: fs.readFileSync(options.setupScannerPath, 'utf8'),
      typesText: fs.readFileSync(options.typesPath, 'utf8'),
      unifiedDeskCandidateBookText: fs.readFileSync(options.unifiedDeskCandidateBookPath, 'utf8'),
    },
    setupScannerPath: path.relative(REPO_ROOT, options.setupScannerPath).replace(/\\/g, '/'),
    typesPath: path.relative(REPO_ROOT, options.typesPath).replace(/\\/g, '/'),
    unifiedDeskCandidateBookPath: path.relative(REPO_ROOT, options.unifiedDeskCandidateBookPath).replace(/\\/g, '/'),
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-audit-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) {
    console.log(JSON.stringify({ outPath, ...report }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
