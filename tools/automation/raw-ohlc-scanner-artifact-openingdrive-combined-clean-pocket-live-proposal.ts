import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-approval-contract';

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

export interface RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_live_proposal';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    approvalContractPath: string;
  };
  proposedBehavior: {
    model: 'OpeningDriveFvgContinuation';
    overlayName: 'openingdrive_combined_clean_pocket_preference';
    scannerVisibleInstallAllowedNow: false;
    requiredFutureApproval: true;
    rankingIntent: string;
    selectors: string[];
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
    decision: 'ready_for_explicit_implementation_approval' | 'not_ready';
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

export function parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const approvalContract = readFlag(args, '--approval-contract') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-approval-contract-\d+\.json$/);
  if (!approvalContract) throw new Error('--approval-contract is required.');
  return { approvalContract, outDir, json: args.includes('--json') };
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

function readinessGate(name: string, passed: boolean, detail: string): ReadinessGate {
  return { name, passed, detail };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport, 'markdown'>): string {
  return [
    '# OpeningDrive Combined Clean-Pocket Live Proposal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only live-proposal artifact. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Proposed Behavior',
    `- Overlay: ${report.proposedBehavior.overlayName}.`,
    `- Model: ${report.proposedBehavior.model}.`,
    `- Install allowed now: ${report.proposedBehavior.scannerVisibleInstallAllowedNow}.`,
    `- Future approval required: ${report.proposedBehavior.requiredFutureApproval}.`,
    `- Intent: ${report.proposedBehavior.rankingIntent}`,
    '',
    '## Selectors',
    ...report.proposedBehavior.selectors.map((item) => `- ${item}`),
    '',
    '## Unchanged Boundaries',
    ...report.proposedBehavior.unchangedBoundaries.map((item) => `- ${item}`),
    '',
    '## Readiness',
    `- Decision: ${report.readiness.decision}.`,
    `- Failed gates: ${report.readiness.failedGateCount}.`,
    '| Gate | Passed | Detail |',
    '|---|---|---|',
    ...report.readiness.gates.map((item) => `| ${item.name} | ${item.passed} | ${item.detail} |`),
    '',
    '## Implementation Files',
    ...report.implementationPlan.likelyFiles.map((item) => `- ${item}`),
    '',
    '## Verification Commands',
    ...report.implementationPlan.verificationCommands.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport(args: {
  approvalContractPath: string;
  approvalContract: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport {
  const contract = args.approvalContract;
  const gates = [
    readinessGate('approval_contract_passed', contract?.status === 'pass', `contract status ${contract?.status ?? 'missing'}`),
    readinessGate('contract_decision_research_proposal_only', contract?.summary.decision === 'approved_for_research_proposal_only', `contract decision ${contract?.summary.decision ?? 'missing'}`),
    readinessGate('target_loss_free', contract?.summary.targetLosses === 0, `target losses ${contract?.summary.targetLosses ?? 'missing'}`),
    readinessGate('positive_deltas', Boolean(contract && (contract.summary.deltaVsFineRiskOnlyOneMesPl ?? 0) > 0 && (contract.summary.deltaVsBroadBaselineOneMesPl ?? 0) > 0), `delta fine/broad ${contract?.summary.deltaVsFineRiskOnlyOneMesPl ?? 'missing'}/${contract?.summary.deltaVsBroadBaselineOneMesPl ?? 'missing'}`),
    readinessGate('live_promotion_zero', contract?.summary.livePromotionAllowedRows === 0, `live promotion rows ${contract?.summary.livePromotionAllowedRows ?? 'missing'}`),
    readinessGate('future_approval_required', contract?.proposedScannerVisibleBehavior.requiredFutureApproval === true && contract.proposedScannerVisibleBehavior.implementationAllowedNow === false, 'contract requires future approval and disallows implementation now'),
  ];
  const failedGateCount = gates.filter((gate) => !gate.passed).length;
  const blockers = [
    !contract ? 'missing approval contract report' : null,
    ...gates.filter((gate) => !gate.passed).map((gate) => `gate failed: ${gate.name} (${gate.detail})`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_live_proposal',
    generatedAt,
    status: failedGateCount === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: {
      approvalContractPath: args.approvalContractPath,
    },
    proposedBehavior: {
      model: 'OpeningDriveFvgContinuation',
      overlayName: 'openingdrive_combined_clean_pocket_preference',
      scannerVisibleInstallAllowedNow: false,
      requiredFutureApproval: true,
      rankingIntent: 'Prefer OpeningDriveFvgContinuation review candidates that match the approved combined clean-pocket package after existing deterministic candidate construction and proof gates have already succeeded.',
      selectors: [
        'fine_risk_24_to_32',
        'tight_long_risk_4_to_8 rows matching live-usable zero-loss bucket criteria from the approval chain',
      ],
      disallowedInputs: [
        'tradeDate/date buckets',
        'outcome labels or one-MES P/L',
        'Discord/RAG button labels',
        'Gemini/advisory text',
      ],
      unchangedBoundaries: [
        '5M remains execution authority.',
        'HTF remains context/support/caution, not execution by itself.',
        'canExecute, entry, stop, target, invalidation, risk, and session gates remain deterministic and unchanged.',
        'No Discord posting, Supabase schema, bridge behavior, automated execution, or live scanner service behavior changes are made by this proposal artifact.',
      ],
    },
    implementationPlan: {
      likelyFiles: [
        'src/lib/setupScanner.ts',
        'src/lib/unifiedDeskCandidateBook.ts',
        'tools/automation/raw-ohlc scanner artifact/replay tests only as needed for regression proof',
        'docs/PROJECT_STATUS.md',
      ],
      testFiles: [
        'src/lib/setupScanner.test.ts',
        'src/lib/unifiedDeskCandidateBook.test.ts',
        'focused OpeningDrive overlay regression test to be added in the implementation phase',
      ],
      rollbackPlan: 'Revert the single implementation commit that adds the OpeningDrive overlay. Because this proposal changes no runtime files, rollback is currently unnecessary.',
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
      decision: failedGateCount === 0 ? 'ready_for_explicit_implementation_approval' : 'not_ready',
      gates,
    },
    blockers,
    recommendations: failedGateCount === 0
      ? [
        'Ready for explicit implementation approval as a separate scanner-visible ranking phase.',
        'Implementation must remain an overlay after existing deterministic gates; it must not loosen canExecute or change entry/stop/target/risk math.',
        'Do not install from this proposal artifact alone.',
      ]
      : [
        'Do not implement scanner-visible ranking until readiness gates pass.',
        'Fix the approval contract chain first.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport(
  report: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-live-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport({
    approvalContractPath: options.approvalContract,
    approvalContract: fs.existsSync(options.approvalContract)
      ? readJson<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport>(options.approvalContract)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, readiness: report.readiness, proposedBehavior: report.proposedBehavior, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
