import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-approval-contract';

interface CliOptions {
  approvalContract: string;
  outDir: string;
  json: boolean;
}

interface Authority {
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
}

interface ReadinessGate {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_live_proposal';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    approvalContractPath: string;
    bestSelectorId: string | null;
  };
  proposedBehavior: {
    behaviorName: 'openingdrive_keep_long_or_lunch_else_replacement_selector';
    scannerVisibleInstallAllowedNow: false;
    requiredFutureApproval: true;
    rankingIntent: string;
    integrationPoint: {
      file: 'src/lib/unifiedDeskCandidateBook.ts';
      functionName: 'buildUnifiedDeskCandidateBook';
      adjacentHelper: 'openingDriveSameEventPriorityPenalty';
      phase: 'candidate ordering after deterministic candidates exist';
    };
    selectorRules: string[];
    requiredLiveFields: string[];
    missingLiveMetadataContract: string[];
    disallowedInputs: string[];
    unchangedBoundaries: string[];
  };
  implementationPlan: {
    likelyFiles: string[];
    testFiles: string[];
    rollbackPlan: string;
    verificationCommands: string[];
  };
  readiness: {
    failedGateCount: number;
    decision: 'ready_for_contract_only_collision_metadata_phase' | 'not_ready';
    gates: ReadinessGate[];
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
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalArgs(
  args = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const approvalContract = readFlag(args, '--approval-contract') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-approval-contract-\d+\.json$/);
  if (!approvalContract) throw new Error('--approval-contract is required.');
  return { approvalContract: path.resolve(approvalContract), outDir, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
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

function gate(name: string, passed: boolean, detail: string): ReadinessGate {
  return { name, passed, detail };
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Live Proposal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only live-proposal artifact. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Proposed Behavior',
    `- Behavior: ${report.proposedBehavior.behaviorName}.`,
    `- Install allowed now: ${report.proposedBehavior.scannerVisibleInstallAllowedNow}.`,
    `- Future approval required: ${report.proposedBehavior.requiredFutureApproval}.`,
    `- Intent: ${report.proposedBehavior.rankingIntent}`,
    `- Integration point: ${report.proposedBehavior.integrationPoint.file} / ${report.proposedBehavior.integrationPoint.functionName}.`,
    '',
    '## Selector Rules',
    ...report.proposedBehavior.selectorRules.map((item) => `- ${item}`),
    '',
    '## Missing Metadata Contract',
    ...report.proposedBehavior.missingLiveMetadataContract.map((item) => `- ${item}`),
    '',
    '## Disallowed Inputs',
    ...report.proposedBehavior.disallowedInputs.map((item) => `- ${item}`),
    '',
    '## Readiness',
    `- Decision: ${report.readiness.decision}.`,
    `- Failed gates: ${report.readiness.failedGateCount}.`,
    '| Gate | Passed | Detail |',
    '|---|---|---|',
    ...report.readiness.gates.map((item) => `| ${item.name} | ${item.passed} | ${item.detail} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport(args: {
  approvalContractPath: string;
  approvalContract: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport {
  const contract = args.approvalContract;
  const gates = [
    gate('approval_contract_passed', contract?.status === 'pass', `contract status ${contract?.status ?? 'missing'}`),
    gate('selector_matches_research_winner', contract?.summary.bestSelectorId === 'keep_long_or_lunch_else_replacement', `best selector ${contract?.summary.bestSelectorId ?? 'missing'}`),
    gate('positive_delta_vs_keep_all', (contract?.summary.deltaVsKeepAllOneMesPl ?? 0) > 0, `delta vs keep-all ${contract?.summary.deltaVsKeepAllOneMesPl ?? 'missing'}`),
    gate('positive_delta_vs_replace_all', (contract?.summary.deltaVsReplaceAllOneMesPl ?? 0) > 0, `delta vs replace-all ${contract?.summary.deltaVsReplaceAllOneMesPl ?? 'missing'}`),
    gate('approval_boundary_clean', contract?.summary.approvalBoundaryClean === true, `approval boundary clean ${contract?.summary.approvalBoundaryClean ?? 'missing'}`),
    gate('live_install_still_disabled', contract?.approvalBoundary.liveInstallAllowed === false && contract.approvalBoundary.scannerVisibleChangeAllowed === false, 'contract disallows live install and scanner-visible change'),
    gate('proposal_chain_recommended', contract?.summary.recommendation === 'selector_contract_ready_for_live_proposal_phase', `recommendation ${contract?.summary.recommendation ?? 'missing'}`),
  ];
  const failedGateCount = gates.filter((item) => !item.passed).length;
  const blockers = [
    !contract ? 'missing selector approval contract report' : null,
    ...gates.filter((item) => !item.passed).map((item) => `gate failed: ${item.name} (${item.detail})`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_live_proposal',
    generatedAt,
    status: failedGateCount === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: {
      approvalContractPath: args.approvalContractPath,
      bestSelectorId: contract?.summary.bestSelectorId || null,
    },
    proposedBehavior: {
      behaviorName: 'openingdrive_keep_long_or_lunch_else_replacement_selector',
      scannerVisibleInstallAllowedNow: false,
      requiredFutureApproval: true,
      rankingIntent: 'In a future approval-gated phase, resolve only duplicate/collision ranking slates by keeping later Sweep proof for LONG or lunch cases, otherwise preferring the replacement candidate. This would run after deterministic candidates already exist and would not create execution authority.',
      integrationPoint: {
        file: 'src/lib/unifiedDeskCandidateBook.ts',
        functionName: 'buildUnifiedDeskCandidateBook',
        adjacentHelper: 'openingDriveSameEventPriorityPenalty',
        phase: 'candidate ordering after deterministic candidates exist',
      },
      selectorRules: [
        'If the two-candidate duplicate slate is LONG, keep the later NoInstalledSetup proof candidate.',
        'If the two-candidate duplicate slate is lunch, keep the later NoInstalledSetup proof candidate.',
        'Otherwise prefer the replacement candidate for the same duplicate slate.',
        'Only apply to candidates already built by deterministic scanner/proof gates.',
      ],
      requiredLiveFields: [
        'setupType',
        'direction',
        'sessionType',
        'completed 5M proof time',
        'candidate key',
        'candidate family',
        'executionStatus/blockReason',
        'ranking score before selector',
      ],
      missingLiveMetadataContract: [
        'duplicate/campaign group id shared by the competing candidates',
        'proof order inside the duplicate/campaign group',
        'proof age from first group candidate',
        'replacement candidate identity for the same group',
        'research-to-live parity test proving the group can be reconstructed without replay-only fields',
      ],
      disallowedInputs: [
        'outcome labels, P/L, MFE, or MAE',
        'trade date or calendar bucket as a selector',
        'Discord/RAG button feedback',
        'Gemini/advisory narrative',
        'HTF context as execution authority without completed 5M proof',
      ],
      unchangedBoundaries: [
        '5M remains execution authority.',
        'HTF remains map/support/caution, not execution by itself.',
        'canExecute, entry, stop, targets, risk, invalidation, and session gates remain unchanged.',
        'No Discord posting, Supabase schema, bridge behavior, or automated execution changes are made by this proposal.',
      ],
    },
    implementationPlan: {
      likelyFiles: [
        'src/lib/unifiedDeskCandidateBook.ts',
        'src/lib/unifiedDeskCandidateBook.test.ts',
        'tools/automation/research parity fixture/test for duplicate/campaign grouping',
        'docs/PROJECT_STATUS.md',
      ],
      testFiles: [
        'src/lib/unifiedDeskCandidateBook.test.ts',
        'focused duplicate/campaign metadata parity test',
        'focused selector disabled-boundary regression test',
      ],
      rollbackPlan: 'This proposal has no runtime rollback requirement. A future implementation must be reversible by removing only the collision metadata/selector overlay commit.',
      verificationCommands: [
        'npx tsc --noEmit --pretty false',
        'npm run guard:no-firebase',
        'npm run guard:architecture',
        'npm run guard:schema',
        'npm run lint',
        'npm run build',
        'npm run test',
        'git diff --check',
      ],
    },
    readiness: {
      failedGateCount,
      decision: failedGateCount === 0 ? 'ready_for_contract_only_collision_metadata_phase' : 'not_ready',
      gates,
    },
    blockers,
    recommendations: failedGateCount === 0
      ? [
        'Do not install scanner-visible selector behavior yet.',
        'Next narrow phase should add a contract-only duplicate/campaign collision metadata surface in the unified candidate book and prove it is side-effect free.',
        'After metadata parity passes, run a disabled shadow overlay comparison before any scanner-visible ranking change.',
      ]
      : ['Do not proceed until the selector approval contract chain passes.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-live-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport({
    approvalContractPath: options.approvalContract,
    approvalContract: fs.existsSync(options.approvalContract)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport>(options.approvalContract)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, readiness: report.readiness, proposedBehavior: report.proposedBehavior, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorLiveProposalCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
