import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-installed-collision-audit';
import type {
  RawOhlcScannerArtifactTransferStableSelectorSimulationReport,
} from './raw-ohlc-scanner-artifact-transfer-stable-selector-simulation';
import type {
  RawOhlcScannerArtifactTransferStabilityMinerReport,
} from './raw-ohlc-scanner-artifact-transfer-stability-miner';

interface CliOptions {
  installedCollisionAudit: string;
  transferStableSelectorSimulation: string;
  transferStabilityMiner: string;
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

export interface RawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_readiness';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    installedCollisionAuditPath: string;
    transferStableSelectorSimulationPath: string;
    transferStabilityMinerPath: string;
  };
  assumptions: {
    consumesExistingLocalReportsOnly: true;
    readOnlyPostProcessor: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    installedAuditStatus: string | null;
    installedRows: number;
    installedLosses: number;
    installedDeltaVsBaselineOneMesPl: number | null;
    oosSourceRows: number;
    oosSelectedRows: number;
    oosSelectedLosses: number;
    transferStablePositiveBuckets: number;
    transferZeroLossStablePositiveBuckets: number;
    decision: 'saved_set_clean_oos_not_yet_validated' | 'oos_collision_validation_ready' | 'blocked';
    recommendation: 'build_new_oos_replay_collision_package' | 'continue_to_live_observation_audit' | 'fix_inputs';
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

export function parseRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedCollisionAudit = readFlag(args, '--installed-collision-audit') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-installed-collision-audit-\d+\.json$/);
  const transferStableSelectorSimulation = readFlag(args, '--transfer-stable-selector-simulation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-transfer-stable-selector-simulation-\d+\.json$/);
  const transferStabilityMiner = readFlag(args, '--transfer-stability-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-transfer-stability-miner-\d+\.json$/);
  if (!installedCollisionAudit) throw new Error('--installed-collision-audit is required.');
  if (!transferStableSelectorSimulation) throw new Error('--transfer-stable-selector-simulation is required.');
  if (!transferStabilityMiner) throw new Error('--transfer-stability-miner is required.');
  return { installedCollisionAudit, transferStableSelectorSimulation, transferStabilityMiner, outDir, json: args.includes('--json') };
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Collision Readiness',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only OOS readiness post-processor. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Saved installed rows/losses/delta: ${report.summary.installedRows}/${report.summary.installedLosses}/${report.summary.installedDeltaVsBaselineOneMesPl ?? '-'}.`,
    `- OOS source rows: ${report.summary.oosSourceRows}.`,
    `- OOS selected rows/losses: ${report.summary.oosSelectedRows}/${report.summary.oosSelectedLosses}.`,
    `- Transfer stable positive buckets: ${report.summary.transferStablePositiveBuckets}.`,
    `- Transfer zero-loss stable positive buckets: ${report.summary.transferZeroLossStablePositiveBuckets}.`,
    `- Decision: ${report.summary.decision}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport(args: {
  installedCollisionAuditPath: string;
  installedCollisionAudit: RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport | null;
  transferStableSelectorSimulationPath: string;
  transferStableSelectorSimulation: RawOhlcScannerArtifactTransferStableSelectorSimulationReport | null;
  transferStabilityMinerPath: string;
  transferStabilityMiner: RawOhlcScannerArtifactTransferStabilityMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport {
  const installed = args.installedCollisionAudit;
  const selector = args.transferStableSelectorSimulation;
  const miner = args.transferStabilityMiner;
  const blockers = [
    installed?.status !== 'pass' ? `installed collision audit status ${installed?.status ?? 'missing'}` : null,
    selector?.status !== 'pass' ? `transfer-stable selector simulation status ${selector?.status ?? 'missing'}` : null,
    miner?.status !== 'pass' ? `transfer stability miner status ${miner?.status ?? 'missing'}` : null,
    installed && installed.summary.installedLosses > 0 ? `installed saved-set audit has ${installed.summary.installedLosses} losses` : null,
    selector && selector.summary.selectedRows > 0 && selector.summary.selectedSummary.losses > 0 ? `OOS selector selected ${selector.summary.selectedSummary.losses} loss rows` : null,
  ].filter((item): item is string => Boolean(item));
  const oosSelectedRows = selector?.summary.selectedRows || 0;
  const decision = blockers.length
    ? 'blocked'
    : oosSelectedRows > 0
      ? 'oos_collision_validation_ready'
      : 'saved_set_clean_oos_not_yet_validated';
  const recommendation = decision === 'blocked'
    ? 'fix_inputs'
    : decision === 'oos_collision_validation_ready'
      ? 'continue_to_live_observation_audit'
      : 'build_new_oos_replay_collision_package';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_readiness',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      installedCollisionAuditPath: args.installedCollisionAuditPath,
      transferStableSelectorSimulationPath: args.transferStableSelectorSimulationPath,
      transferStabilityMinerPath: args.transferStabilityMinerPath,
    },
    assumptions: {
      consumesExistingLocalReportsOnly: true,
      readOnlyPostProcessor: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      installedAuditStatus: installed?.status || null,
      installedRows: installed?.summary.installedRows || 0,
      installedLosses: installed?.summary.installedLosses || 0,
      installedDeltaVsBaselineOneMesPl: installed?.summary.deltaVsBaselineOneMesPl ?? null,
      oosSourceRows: selector?.summary.sourceRows || 0,
      oosSelectedRows,
      oosSelectedLosses: selector?.summary.selectedSummary.losses || 0,
      transferStablePositiveBuckets: miner?.summary.stablePositiveBuckets || 0,
      transferZeroLossStablePositiveBuckets: miner?.summary.zeroLossStablePositiveBuckets || 0,
      decision,
      recommendation,
    },
    blockers,
    recommendations: recommendation === 'build_new_oos_replay_collision_package'
      ? [
        'The saved installed package is clean, but the existing transfer-stable OOS selector selected 0 rows. Build a dedicated OOS replay collision package before broadening or tuning.',
        'Keep OpeningDrive overlay unchanged and do not broaden to other model families from this readiness artifact.',
      ]
      : recommendation === 'continue_to_live_observation_audit'
        ? [
          'OOS selector selected rows without losses. Continue with live-observation audit only; no execution boundary changes.',
        ]
        : [
          'Fix source reports before using OOS readiness evidence.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-collision-readiness-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosCollisionReadinessReport({
    installedCollisionAuditPath: options.installedCollisionAudit,
    installedCollisionAudit: readJson(options.installedCollisionAudit),
    transferStableSelectorSimulationPath: options.transferStableSelectorSimulation,
    transferStableSelectorSimulation: readJson(options.transferStableSelectorSimulation),
    transferStabilityMinerPath: options.transferStabilityMiner,
    transferStabilityMiner: readJson(options.transferStabilityMiner),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nWrote ${jsonPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
