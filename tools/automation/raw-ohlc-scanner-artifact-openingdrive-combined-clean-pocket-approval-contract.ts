import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation';

type ContractDecision = 'approved_for_research_proposal_only' | 'rejected' | 'fix_inputs';

interface CliOptions {
  simulation: string;
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

interface Gate {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_approval_contract';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    simulationPath: string;
  };
  assumptions: {
    savedSimulationOnly: true;
    approvalContractOnly: true;
    targetScenario: 'fine_risk_plus_all_live_zero_loss_tight_buckets';
    dateBucketsDisallowed: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  summary: {
    targetRows: number;
    targetWinners: number;
    targetLosses: number;
    targetOtherResolved: number;
    targetUnresolved: number;
    targetOneMesPl: number | null;
    deltaVsFineRiskOnlyOneMesPl: number | null;
    deltaVsBroadBaselineOneMesPl: number | null;
    addedTightLongRows: number;
    addedTightLongWinners: number;
    addedTightLongLosses: number;
    livePromotionAllowedRows: 0;
    failedGateCount: number;
    decision: ContractDecision;
  };
  gates: Gate[];
  proposedScannerVisibleBehavior: {
    model: 'OpeningDriveFvgContinuation';
    proposedPackage: 'fine_risk_plus_all_live_zero_loss_tight_buckets';
    implementationAllowedNow: false;
    requiredFutureApproval: true;
    description: string;
  };
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_SCENARIO = 'fine_risk_plus_all_live_zero_loss_tight_buckets';

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

export function parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const simulation = readFlag(args, '--simulation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation-\d+\.json$/);
  if (!simulation) throw new Error('--simulation is required.');
  return { simulation, outDir, json: args.includes('--json') };
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

function gate(name: string, passed: boolean, detail: string): Gate {
  return { name, passed, detail };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Combined Clean-Pocket Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval contract. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Target scenario: ${report.assumptions.targetScenario}.`,
    `- Rows W/L/O/U: ${report.summary.targetWinners}/${report.summary.targetLosses}/${report.summary.targetOtherResolved}/${report.summary.targetUnresolved}.`,
    `- One-MES P/L: ${report.summary.targetOneMesPl ?? '-'}.`,
    `- Delta vs fine-risk-only: ${report.summary.deltaVsFineRiskOnlyOneMesPl ?? '-'}.`,
    `- Delta vs broad baseline: ${report.summary.deltaVsBroadBaselineOneMesPl ?? '-'}.`,
    `- Added tight-long rows W/L: ${report.summary.addedTightLongRows} ${report.summary.addedTightLongWinners}/${report.summary.addedTightLongLosses}.`,
    `- Failed gates: ${report.summary.failedGateCount}.`,
    `- Decision: ${report.summary.decision}.`,
    '',
    '## Gates',
    '| Gate | Passed | Detail |',
    '|---|---|---|',
    ...report.gates.map((item) => `| ${item.name} | ${item.passed} | ${item.detail} |`),
    '',
    '## Proposed Future Behavior',
    `- ${report.proposedScannerVisibleBehavior.description}`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport(args: {
  simulationPath: string;
  simulation: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport {
  const targetScenario = args.simulation?.scenarios.find((scenario) => scenario.scenario === TARGET_SCENARIO) || null;
  const gates = [
    gate('simulation_status_pass', args.simulation?.status === 'pass', `simulation status is ${args.simulation?.status ?? 'missing'}`),
    gate('authority_locked_read_only', Boolean(args.simulation?.authority.readOnly && args.simulation.authority.researchOnly && !args.simulation.authority.changesTradingLogic && !args.simulation.authority.changesCanExecute), 'simulation authority remains read-only/research-only and cannot change trading logic or canExecute'),
    gate('target_scenario_exists', Boolean(targetScenario), `target scenario ${TARGET_SCENARIO} ${targetScenario ? 'exists' : 'missing'}`),
    gate('target_has_rows', Boolean(targetScenario && targetScenario.rows > 0), `target rows ${targetScenario?.rows ?? 0}`),
    gate('target_zero_losses', Boolean(targetScenario && targetScenario.losses === 0), `target losses ${targetScenario?.losses ?? '-'}`),
    gate('target_added_no_tight_long_losses', Boolean(targetScenario && targetScenario.addedTightLongRows > 0 && targetScenario.addedTightLongLosses === 0), `added tight-long rows/losses ${targetScenario?.addedTightLongRows ?? 0}/${targetScenario?.addedTightLongLosses ?? '-'}`),
    gate('positive_delta_vs_fine_risk_only', Boolean(targetScenario && (targetScenario.deltaVsFineRiskOnlyOneMesPl ?? 0) > 0), `delta ${targetScenario?.deltaVsFineRiskOnlyOneMesPl ?? '-'}`),
    gate('positive_delta_vs_broad_baseline', Boolean(targetScenario && (targetScenario.deltaVsBroadBaselineOneMesPl ?? 0) > 0), `delta ${targetScenario?.deltaVsBroadBaselineOneMesPl ?? '-'}`),
    gate('date_buckets_disallowed', args.simulation?.assumptions.dateBucketsAreResearchContextOnly === true && args.simulation.assumptions.onlyLiveUsableNoLookaheadBuckets === true, 'simulation asserts date buckets are research context only and package uses live-usable no-lookahead buckets'),
    gate('live_promotion_zero', Boolean(targetScenario && targetScenario.livePromotionAllowedRows === 0 && args.simulation?.assumptions.livePromotionAllowed === false), `live promotion rows ${targetScenario?.livePromotionAllowedRows ?? '-'}`),
  ];
  const failedGateCount = gates.filter((item) => !item.passed).length;
  const blockers = [
    !args.simulation ? 'missing combined clean-pocket simulation report' : null,
    ...gates.filter((item) => !item.passed).map((item) => `gate failed: ${item.name} (${item.detail})`),
  ].filter((item): item is string => Boolean(item));
  const decision: ContractDecision = !args.simulation
    ? 'fix_inputs'
    : failedGateCount === 0
      ? 'approved_for_research_proposal_only'
      : 'rejected';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_approval_contract',
    generatedAt,
    status: failedGateCount === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: {
      simulationPath: args.simulationPath,
    },
    assumptions: {
      savedSimulationOnly: true,
      approvalContractOnly: true,
      targetScenario: TARGET_SCENARIO,
      dateBucketsDisallowed: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    summary: {
      targetRows: targetScenario?.rows ?? 0,
      targetWinners: targetScenario?.winners ?? 0,
      targetLosses: targetScenario?.losses ?? 0,
      targetOtherResolved: targetScenario?.otherResolved ?? 0,
      targetUnresolved: targetScenario?.unresolved ?? 0,
      targetOneMesPl: targetScenario?.oneMesPl ?? null,
      deltaVsFineRiskOnlyOneMesPl: targetScenario?.deltaVsFineRiskOnlyOneMesPl ?? null,
      deltaVsBroadBaselineOneMesPl: targetScenario?.deltaVsBroadBaselineOneMesPl ?? null,
      addedTightLongRows: targetScenario?.addedTightLongRows ?? 0,
      addedTightLongWinners: targetScenario?.addedTightLongWinners ?? 0,
      addedTightLongLosses: targetScenario?.addedTightLongLosses ?? 0,
      livePromotionAllowedRows: 0,
      failedGateCount,
      decision,
    },
    gates,
    proposedScannerVisibleBehavior: {
      model: 'OpeningDriveFvgContinuation',
      proposedPackage: TARGET_SCENARIO,
      implementationAllowedNow: false,
      requiredFutureApproval: true,
      description: 'Future proposal would prefer OpeningDriveFvgContinuation candidates that match fine_risk_24_to_32 or the validated live-usable tight-long zero-loss buckets; it would not use date buckets, loosen canExecute, or change entry/stop/target/risk math.',
    },
    blockers,
    recommendations: decision === 'approved_for_research_proposal_only'
      ? [
        'Contract passed for research proposal only; scanner-visible implementation still requires a separate explicit approval-gated phase.',
        'Next phase may build a live-proposal/readiness artifact that states the exact ranking overlay and collision behavior without installing it.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading rules from this contract.',
      ]
      : [
        'Do not advance the combined clean-pocket package until failed gates are resolved.',
        'Leave live scanner behavior unchanged.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport(
  report: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport({
    simulationPath: options.simulation,
    simulation: fs.existsSync(options.simulation)
      ? readJson<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport>(options.simulation)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, gates: report.gates, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketApprovalContractCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
