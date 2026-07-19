import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-audit';

interface CliOptions {
  runtimeSignalAudit: string;
  outDir: string;
  json: boolean;
}

interface ContractGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

interface ProposedSignalField {
  field: string;
  type: string;
  requiredForRuntimeSelector: boolean;
  sourceAuthority: string;
  forbiddenSources: string[];
  purpose: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport['authority'];
  source: {
    reportDir: string;
    runtimeSignalAuditPath: string | null;
  };
  assumptions: {
    contractOnly: true;
    noRuntimeChangeInstalled: true;
    noScannerVisibleSelectionInstalled: true;
    livePromotionAllowed: false;
  };
  proposedContract: {
    contractName: 'scanner_owned_same_completed_5m_proof_selector_signal';
    owner: 'setupScanner';
    consumer: 'rankSetupCandidate_future_approval_only';
    candidateField: 'proofSelectionSignal';
    allowedSetupScope: ['SweepMssFvgRetrace'];
    allowedSelectorDecision: ['keep_later_sweep_proof'];
    requiredFields: ProposedSignalField[];
    invariantFields: {
      changesCanExecute: false;
      changesEntryStopTargets: false;
      changesRiskRules: false;
      usesOutcomeData: false;
      usesResearchLabels: false;
      usesGeminiAdvisoryText: false;
      usesLiveBridgeReadsInsideRanker: false;
      scannerVisibleInstallAllowedByThisContract: false;
    };
    likelyFutureFilesToModify: string[];
    filesOutOfScope: string[];
    rollbackPath: string[];
  };
  approvalGates: ContractGate[];
  summary: {
    signalAuditStatus: string | null;
    signalAuditRecommendation: string | null;
    signalAuditRuntimeInstallBlockedByMissingLiveSignal: boolean | null;
    contractReadyForTypeOnlyProposal: boolean;
    scannerVisibleRuntimeInstallAllowedByThisReport: false;
    recommendation: 'draft_type_only_scanner_signal_next' | 'fix_inputs';
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const runtimeSignalAudit = readFlag(args, '--runtime-signal-audit') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-audit-\d+\.json$/);
  if (!runtimeSignalAudit) throw new Error('--runtime-signal-audit is required.');
  return {
    runtimeSignalAudit: path.resolve(runtimeSignalAudit),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport['authority'] {
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

function proposedFields(): ProposedSignalField[] {
  return [
    {
      field: 'proofSelectionSignal.status',
      type: "'same_completed_5m_proof_collision' | 'not_applicable'",
      requiredForRuntimeSelector: true,
      sourceAuthority: 'setupScanner app-owned grouping of completed 5M proof candidates',
      forbiddenSources: ['research diagnostic JSON', 'RAG labels', 'Discord button outcomes', 'Gemini/advisory text'],
      purpose: 'State whether the candidate belongs to a same-completed-5M proof collision group.',
    },
    {
      field: 'proofSelectionSignal.selectorDecision',
      type: "'keep_later_sweep_proof' | 'prefer_replacement' | 'not_applicable'",
      requiredForRuntimeSelector: true,
      sourceAuthority: 'setupScanner app-owned deterministic collision selector',
      forbiddenSources: ['research artifact selectorDecision', 'outcome/P/L labels', 'manual notes'],
      purpose: 'Carry the app-owned selector decision without using research labels as live inputs.',
    },
    {
      field: 'proofSelectionSignal.completedBarTime',
      type: 'string | null',
      requiredForRuntimeSelector: true,
      sourceAuthority: 'completed 5M candidate proof timestamp already known by setupScanner',
      forbiddenSources: ['incomplete bar timestamps', 'visual screenshot text'],
      purpose: 'Ensure the selector only compares candidates from the same completed 5M proof.',
    },
    {
      field: 'proofSelectionSignal.groupKey',
      type: 'string',
      requiredForRuntimeSelector: true,
      sourceAuthority: 'session + completedBarTime + direction from scanner-owned fields',
      forbiddenSources: ['saved research slate keys'],
      purpose: 'Make same-proof grouping auditable and reproducible.',
    },
    {
      field: 'proofSelectionSignal.groupSize',
      type: 'number',
      requiredForRuntimeSelector: true,
      sourceAuthority: 'setupScanner candidate group count',
      forbiddenSources: ['post-trade outcome count'],
      purpose: 'Prevent singleton candidates from receiving a collision selector preference.',
    },
  ];
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Sweep Keep-Later-Proof Runtime Signal Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only contract. It does not add runtime fields, install selector behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Runtime signal audit status: ${report.summary.signalAuditStatus ?? '-'}.`,
    `- Runtime signal audit recommendation: ${report.summary.signalAuditRecommendation ?? '-'}.`,
    `- Runtime install blocked by missing live signal: ${report.summary.signalAuditRuntimeInstallBlockedByMissingLiveSignal ?? '-'}.`,
    `- Contract ready for type-only proposal: ${report.summary.contractReadyForTypeOnlyProposal}.`,
    `- Scanner-visible runtime install allowed by this report: ${report.summary.scannerVisibleRuntimeInstallAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Contract',
    `- Field: ${report.proposedContract.candidateField}.`,
    `- Owner: ${report.proposedContract.owner}.`,
    `- Consumer: ${report.proposedContract.consumer}.`,
    `- Allowed setup scope: ${report.proposedContract.allowedSetupScope.join(', ')}.`,
    `- Allowed selector decision: ${report.proposedContract.allowedSelectorDecision.join(', ')}.`,
    '',
    '## Required Fields',
    ...report.proposedContract.requiredFields.map((field) => `- ${field.field}: ${field.type}; source=${field.sourceAuthority}; purpose=${field.purpose}`),
    '',
    '## Approval Gates',
    ...report.approvalGates.map((gate) => `- ${gate.name}: ${gate.status} - ${gate.proof}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport(args: {
  runtimeSignalAuditPath: string | null;
  runtimeSignalAudit: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport {
  const audit = args.runtimeSignalAudit;
  const gates: ContractGate[] = [
    {
      name: 'runtime_signal_audit_passed',
      required: true,
      status: audit?.status === 'pass' ? 'pass' : 'fail',
      proof: audit ? `runtime signal audit status ${audit.status}` : 'runtime signal audit missing',
    },
    {
      name: 'audit_recommends_scanner_owned_contract',
      required: true,
      status: audit?.summary.recommendation === 'add_scanner_owned_live_signal_contract_before_runtime_ranking' ? 'pass' : 'fail',
      proof: audit ? `runtime signal audit recommendation ${audit.summary.recommendation}` : 'runtime signal audit missing',
    },
    {
      name: 'audit_blocks_runtime_install_due_to_missing_live_signal',
      required: true,
      status: audit?.summary.runtimeInstallBlockedByMissingLiveSignal === true ? 'pass' : 'fail',
      proof: audit ? `runtimeInstallBlockedByMissingLiveSignal ${audit.summary.runtimeInstallBlockedByMissingLiveSignal}` : 'runtime signal audit missing',
    },
    {
      name: 'audit_live_outputs_remain_disabled',
      required: true,
      status: audit?.summary.safeRuntimeInstallAllowedNow === false
        && audit.authority.changesScannerBehavior === false
        && audit.authority.changesTradingLogic === false
        && audit.authority.changesCanExecute === false
        ? 'pass'
        : 'fail',
      proof: audit ? `safeRuntimeInstallAllowedNow/scanner/trading/canExecute ${audit.summary.safeRuntimeInstallAllowedNow}/${audit.authority.changesScannerBehavior}/${audit.authority.changesTradingLogic}/${audit.authority.changesCanExecute}` : 'runtime signal audit missing',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !args.runtimeSignalAuditPath ? 'missing runtime signal audit path' : null,
    !audit ? 'missing runtime signal audit report' : null,
    ...failedGates.map((gate) => `runtime signal contract gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const contractReadyForTypeOnlyProposal = blockers.length === 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      runtimeSignalAuditPath: args.runtimeSignalAuditPath,
    },
    assumptions: {
      contractOnly: true,
      noRuntimeChangeInstalled: true,
      noScannerVisibleSelectionInstalled: true,
      livePromotionAllowed: false,
    },
    proposedContract: {
      contractName: 'scanner_owned_same_completed_5m_proof_selector_signal',
      owner: 'setupScanner',
      consumer: 'rankSetupCandidate_future_approval_only',
      candidateField: 'proofSelectionSignal',
      allowedSetupScope: ['SweepMssFvgRetrace'],
      allowedSelectorDecision: ['keep_later_sweep_proof'],
      requiredFields: proposedFields(),
      invariantFields: {
        changesCanExecute: false,
        changesEntryStopTargets: false,
        changesRiskRules: false,
        usesOutcomeData: false,
        usesResearchLabels: false,
        usesGeminiAdvisoryText: false,
        usesLiveBridgeReadsInsideRanker: false,
        scannerVisibleInstallAllowedByThisContract: false,
      },
      likelyFutureFilesToModify: [
        'src/types.ts',
        'src/lib/setupScanner.ts',
        'src/lib/setupScanner.test.ts',
        'docs/PROJECT_STATUS.md',
      ],
      filesOutOfScope: [
        'src/lib/tradeDecisionPipeline.ts',
        'src/lib/liveDiscordPostEligibility.ts',
        'tools/automation/nt-scanner.ts',
        'Supabase migrations or schema files',
        'Discord posting, button, or formatter files',
        'NinjaTrader bridge/recorder/backfill files',
      ],
      rollbackPath: [
        'Remove the proofSelectionSignal type-only field if the type-only proposal fails.',
        'Remove any setupScanner candidate metadata builder from the future implementation commit.',
        'Rerun setupScanner/tradeDecisionPipeline tests and full guard checks.',
      ],
    },
    approvalGates: gates,
    summary: {
      signalAuditStatus: audit?.status || null,
      signalAuditRecommendation: audit?.summary.recommendation || null,
      signalAuditRuntimeInstallBlockedByMissingLiveSignal: audit?.summary.runtimeInstallBlockedByMissingLiveSignal ?? null,
      contractReadyForTypeOnlyProposal,
      scannerVisibleRuntimeInstallAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'draft_type_only_scanner_signal_next',
    },
    blockers,
    recommendations: [
      'Next chunk should be type-only: add the proposed optional proofSelectionSignal shape to SetupCandidate with no scanner population and no ranking consumer.',
      'After type-only proof passes, add a scanner-owned dry-run metadata builder that reports the signal without changing rank order.',
      'Do not install scanner-visible ranking until a separate dry-run proves the live signal is populated from app-owned completed 5M proof fields.',
    ],
  };
  return {
    ...base,
    markdown: buildMarkdown(base),
  };
}

function runCli(): void {
  const options = parseArgs();
  const audit = readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalAuditReport>(options.runtimeSignalAudit);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport({
    runtimeSignalAuditPath: options.runtimeSignalAudit,
    runtimeSignalAudit: audit,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-contract-${Date.now()}.json`);
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
