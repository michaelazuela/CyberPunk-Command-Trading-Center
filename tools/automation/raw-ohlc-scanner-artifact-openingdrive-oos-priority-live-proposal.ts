import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-broader-priority-validation';

interface CliOptions {
  validation: string;
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

export interface RawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_priority_live_proposal';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    validationPath: string;
  };
  proposedBehavior: {
    behaviorName: 'same_event_same_direction_sweep_htf_priority_over_openingdrive';
    scannerVisibleInstallAllowedNow: false;
    requiredFutureApproval: true;
    rankingIntent: string;
    eligiblePriorityModels: Array<'SweepMssFvgRetrace' | 'HtfDisplacementMssContinuation'>;
    requiredConditions: string[];
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

export function parseRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const validation = readFlag(args, '--validation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-broader-priority-validation-\d+\.json$/);
  if (!validation) throw new Error('--validation is required.');
  return { validation, outDir, json: args.includes('--json') };
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Sweep/HTF Priority Live Proposal',
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
    '',
    '## Required Conditions',
    ...report.proposedBehavior.requiredConditions.map((item) => `- ${item}`),
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

export function buildRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport(args: {
  validationPath: string;
  validation: RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport {
  const validation = args.validation;
  const gates = [
    gate('validation_passed', validation?.status === 'pass', `validation status ${validation?.status ?? 'missing'}`),
    gate('proposal_recommended', validation?.summary.recommendation === 'prepare_research_only_live_proposal', `recommendation ${validation?.summary.recommendation ?? 'missing'}`),
    gate('minimum_comparable_events', (validation?.summary.comparableEvents ?? 0) >= 10, `comparable events ${validation?.summary.comparableEvents ?? 'missing'}`),
    gate('priority_zero_losses', validation?.summary.priorityLosses === 0, `priority losses ${validation?.summary.priorityLosses ?? 'missing'}`),
    gate('positive_delta', (validation?.summary.deltaOneMesPl ?? 0) > 0, `delta ${validation?.summary.deltaOneMesPl ?? 'missing'}`),
    gate('priority_wins_majority', (validation?.summary.priorityBetterRows ?? 0) > (validation?.summary.openingDriveBetterOrEqualRows ?? 0), `priority/openingdrive ${validation?.summary.priorityBetterRows ?? 'missing'}/${validation?.summary.openingDriveBetterOrEqualRows ?? 'missing'}`),
  ];
  const failedGateCount = gates.filter((item) => !item.passed).length;
  const blockers = [
    !validation ? 'missing broader priority validation report' : null,
    ...gates.filter((item) => !item.passed).map((item) => `gate failed: ${item.name} (${item.detail})`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_priority_live_proposal',
    generatedAt,
    status: failedGateCount === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: { validationPath: args.validationPath },
    proposedBehavior: {
      behaviorName: 'same_event_same_direction_sweep_htf_priority_over_openingdrive',
      scannerVisibleInstallAllowedNow: false,
      requiredFutureApproval: true,
      rankingIntent: 'When OpeningDriveFvgContinuation and a clean same-direction SweepMssFvgRetrace or HtfDisplacementMssContinuation candidate exist at the same proof event, prefer the Sweep/HTF candidate in research ranking before OpeningDrive.',
      eligiblePriorityModels: ['SweepMssFvgRetrace', 'HtfDisplacementMssContinuation'],
      requiredConditions: [
        'same trade date',
        'same session',
        'same completed 5M proof time',
        'same direction',
        'both candidates already produced by existing deterministic scanner/proof gates',
        'priority candidate has no executionStatus=Blocked or known invalid-stop state',
        'OpeningDrive candidate remains valid and is not removed; it is only lower priority for the same event',
      ],
      disallowedInputs: [
        'outcome labels, P/L, MFE, or MAE',
        'tradeDate/date bucket as a selector beyond same-event collision grouping',
        'Discord/RAG button feedback',
        'Gemini/advisory narrative',
        'HTF context by itself without completed 5M execution proof',
      ],
      unchangedBoundaries: [
        '5M remains execution authority.',
        'HTF remains map/support/caution, not execution by itself.',
        'canExecute, entry, stop, targets, risk, invalidation, and session gates remain unchanged.',
        'No Discord posting, Supabase schema, bridge behavior, or automated execution changes are made by this proposal.',
      ],
    },
    implementationPlan: {
      likelyFiles: ['src/lib/unifiedDeskCandidateBook.ts', 'src/lib/setupScanner.ts', 'src/lib/unifiedDeskCandidateBook.test.ts', 'src/lib/setupScanner.test.ts', 'docs/PROJECT_STATUS.md'],
      testFiles: ['src/lib/unifiedDeskCandidateBook.test.ts', 'src/lib/setupScanner.test.ts'],
      rollbackPlan: 'Revert the single future implementation commit that applies the same-event priority overlay. This proposal itself has no runtime rollback requirement.',
      verificationCommands: ['npx tsc --noEmit --pretty false', 'npm run guard:no-firebase', 'npm run guard:architecture', 'npm run guard:schema', 'npm run lint', 'npm run build', 'npm run test', 'git diff --check'],
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
        'Keep the implementation as a same-event priority overlay only; do not remove OpeningDrive.',
        'Do not change canExecute, entry, stop, targets, risk, Discord, Supabase, bridge behavior, or automated execution.',
      ]
      : ['Do not implement the priority overlay until readiness gates pass.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-priority-live-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosPriorityLiveProposalReport({
    validationPath: options.validation,
    validation: fs.existsSync(options.validation)
      ? readJson<RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport>(options.validation)
      : null,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, readiness: report.readiness, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
