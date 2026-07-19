import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation';
import type {
  RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';
import type {
  RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-tight-long-lane-miner';

type OutcomeBucket = 'winner' | 'loss' | 'other_resolved' | 'unresolved';

interface CliOptions {
  freshReplayPackage: string;
  slateDryRun: string;
  tightLongMiner: string;
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

interface Summary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
}

interface CollisionRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  selector: string;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
  installedDisposition: 'retained_by_overlay' | 'added_back_clean_pocket' | 'removed_by_overlay';
  outcomeBucket: OutcomeBucket;
}

export interface RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_installed_collision_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    freshReplayPackagePath: string;
    slateDryRunPath: string;
    tightLongMinerPath: string;
    simulationPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    installedOverlayAlreadyExists: true;
    auditOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    baselineRows: number;
    installedRows: number;
    retainedRows: number;
    addedBackRows: number;
    removedRows: number;
    removedWinners: number;
    removedLosses: number;
    removedUnresolved: number;
    installedLosses: number;
    installedUnresolved: number;
    installedOneMesPl: number | null;
    baselineOneMesPl: number | null;
    deltaVsBaselineOneMesPl: number | null;
    collisionRisk: 'low_saved_set_risk' | 'needs_more_replay';
    recommendation: 'continue_to_research_collision_oos' | 'pause_and_investigate';
  };
  baselineSummary: Summary;
  installedSummary: Summary;
  addedBackSummary: Summary;
  removedSummary: Summary;
  rows: CollisionRow[];
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

export function parseRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const freshReplayPackage = readFlag(args, '--fresh-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-\d+\.json$/);
  const slateDryRun = readFlag(args, '--slate-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run-\d+\.json$/);
  const tightLongMiner = readFlag(args, '--tight-long-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-tight-long-lane-miner-\d+\.json$/);
  const simulation = readFlag(args, '--simulation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation-\d+\.json$/);
  if (!freshReplayPackage) throw new Error('--fresh-replay-package is required.');
  if (!slateDryRun) throw new Error('--slate-dry-run is required.');
  if (!tightLongMiner) throw new Error('--tight-long-miner is required.');
  if (!simulation) throw new Error('--simulation is required.');
  return { freshReplayPackage, slateDryRun, tightLongMiner, simulation, outDir, json: args.includes('--json') };
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function outcomeBucket(row: { outcomeStatus: string; outcomeLabel: string }): OutcomeBucket {
  if (row.outcomeStatus !== 'resolved') return 'unresolved';
  if (row.outcomeLabel === 't1_and_t2_hit') return 'winner';
  if (row.outcomeLabel === 'stopped_before_t1') return 'loss';
  return 'other_resolved';
}

function sum(rows: Array<{ oneMesPl: number | null }>): number | null {
  const values = rows.map((row) => row.oneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function summarize(rows: Array<{ outcomeStatus: string; outcomeLabel: string; oneMesPl: number | null }>): Summary {
  return {
    rows: rows.length,
    winners: rows.filter((row) => outcomeBucket(row) === 'winner').length,
    losses: rows.filter((row) => outcomeBucket(row) === 'loss').length,
    otherResolved: rows.filter((row) => outcomeBucket(row) === 'other_resolved').length,
    unresolved: rows.filter((row) => outcomeBucket(row) === 'unresolved').length,
    oneMesPl: sum(rows),
  };
}

function hourBucket(proofTime: string): string {
  const hour = new Date(proofTime).getHours().toString().padStart(2, '0');
  return `${hour}:00-${hour}:59`;
}

function minuteBucket(proofTime: string): string {
  return new Date(proofTime).getMinutes().toString().padStart(2, '0');
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 5) return 'risk_4_to_5';
  if (riskPoints < 6) return 'risk_5_to_6';
  if (riskPoints < 7) return 'risk_6_to_7';
  return 'risk_7_to_8';
}

function fineRiskBucket(riskPoints: number): string {
  const lower = Math.floor(riskPoints * 2) / 2;
  const upper = lower + 0.5;
  return `risk_${lower.toFixed(1)}_to_${upper.toFixed(1)}`;
}

function rowBucketValue(row: { proofTime: string; riskPoints: number }, bucketType: string): string | null {
  if (bucketType === 'hourBucket') return hourBucket(row.proofTime);
  if (bucketType === 'minuteBucket') return minuteBucket(row.proofTime);
  if (bucketType === 'riskBucket') return riskBucket(row.riskPoints);
  if (bucketType === 'fineRiskBucket') return fineRiskBucket(row.riskPoints);
  if (bucketType === 'hourBucket|riskBucket') return `${hourBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`;
  return null;
}

function installedRowsFromReports(
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null,
  slateDryRun: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport | null,
  tightLongMiner: RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport | null,
): CollisionRow[] {
  if (!freshReplayPackage || !slateDryRun || !tightLongMiner) return [];
  const fineRows = freshReplayPackage.selectedRows
    .filter((row) => row.selector === 'fine_risk_24_to_32')
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      selector: row.selector,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      outcomeStatus: row.outcomeStatus,
      oneMesPl: row.oneMesPl,
      installedDisposition: 'retained_by_overlay' as const,
      outcomeBucket: outcomeBucket(row),
    }));
  const liveBuckets = tightLongMiner.zeroLossBuckets.filter((bucket) => bucket.liveUsable);
  const tightRows = slateDryRun.changedRows
    .filter((row) => row.slateAction === 'removed_by_fine_risk' && row.selector === 'tight_long_risk_4_to_8')
    .filter((row) => liveBuckets.some((bucket) => rowBucketValue(row, bucket.bucketType) === bucket.key))
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      selector: row.selector,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      outcomeStatus: row.outcomeStatus,
      oneMesPl: row.oneMesPl,
      installedDisposition: 'added_back_clean_pocket' as const,
      outcomeBucket: outcomeBucket(row),
    }));
  const seen = new Set<string>();
  return [...fineRows, ...tightRows].filter((row) => {
    if (seen.has(row.ticketId)) return false;
    seen.add(row.ticketId);
    return true;
  });
}

function delta(a: number | null, b: number | null): number | null {
  return typeof a === 'number' && typeof b === 'number' ? round(a - b) : null;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive Installed Collision Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only installed-collision audit. It uses saved reports only, does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Baseline rows: ${report.summary.baselineRows}.`,
    `- Installed overlay rows: ${report.summary.installedRows}.`,
    `- Retained / added back / removed: ${report.summary.retainedRows}/${report.summary.addedBackRows}/${report.summary.removedRows}.`,
    `- Installed W/L/O/U: ${report.installedSummary.winners}/${report.installedSummary.losses}/${report.installedSummary.otherResolved}/${report.installedSummary.unresolved}.`,
    `- Removed W/L/U: ${report.summary.removedWinners}/${report.summary.removedLosses}/${report.summary.removedUnresolved}.`,
    `- One-MES P/L baseline/installed/delta: ${report.summary.baselineOneMesPl ?? '-'}/${report.summary.installedOneMesPl ?? '-'}/${report.summary.deltaVsBaselineOneMesPl ?? '-'}.`,
    `- Collision risk: ${report.summary.collisionRisk}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport(args: {
  freshReplayPackagePath: string;
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
  slateDryRunPath: string;
  slateDryRun: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport | null;
  tightLongMinerPath: string;
  tightLongMiner: RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport | null;
  simulationPath: string;
  simulation: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport {
  const baseline = args.freshReplayPackage?.selectedRows || [];
  const scenario = args.simulation?.scenarios.find((item) => item.scenario === TARGET_SCENARIO) || null;
  const installed = installedRowsFromReports(args.freshReplayPackage, args.slateDryRun, args.tightLongMiner);
  const installedIds = new Set(installed.map((row) => row.ticketId));
  const removed = baseline.filter((row) => !installedIds.has(row.ticketId));
  const addedBack = installed.filter((row) => row.installedDisposition === 'added_back_clean_pocket');
  const retained = installed.filter((row) => row.installedDisposition === 'retained_by_overlay');
  const rows: CollisionRow[] = [
    ...retained,
    ...addedBack,
    ...removed.map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      selector: row.selector,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      outcomeStatus: row.outcomeStatus,
      oneMesPl: row.oneMesPl,
      installedDisposition: 'removed_by_overlay' as const,
      outcomeBucket: outcomeBucket(row),
    })),
  ];
  const baselineSummary = summarize(baseline);
  const installedSummary = summarize(installed);
  const addedBackSummary = summarize(addedBack);
  const removedSummary = summarize(removed);
  const blockers = [
    args.freshReplayPackage?.status !== 'pass' ? `fresh replay package status ${args.freshReplayPackage?.status ?? 'missing'}` : null,
    args.slateDryRun?.status !== 'pass' ? `slate dry-run status ${args.slateDryRun?.status ?? 'missing'}` : null,
    args.tightLongMiner?.status !== 'pass' ? `tight-long miner status ${args.tightLongMiner?.status ?? 'missing'}` : null,
    args.simulation?.status !== 'pass' ? `combined clean-pocket simulation status ${args.simulation?.status ?? 'missing'}` : null,
    !scenario ? `missing target scenario ${TARGET_SCENARIO}` : null,
    scenario && !scenario.lossFree ? 'target scenario is not loss-free' : null,
    scenario && scenario.livePromotionAllowedRows !== 0 ? 'target scenario has live-promotion rows' : null,
    installedSummary.losses > 0 ? `installed overlay saved set has ${installedSummary.losses} loss rows` : null,
    installed.length === 0 ? 'installed overlay row set is empty' : null,
  ].filter((item): item is string => Boolean(item));
  const collisionRisk = blockers.length === 0 && installedSummary.losses === 0 && removedSummary.losses > 0
    ? 'low_saved_set_risk'
    : 'needs_more_replay';
  const recommendation = collisionRisk === 'low_saved_set_risk'
    ? 'continue_to_research_collision_oos'
    : 'pause_and_investigate';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_installed_collision_audit',
    generatedAt,
    status: blockers.length === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: {
      freshReplayPackagePath: args.freshReplayPackagePath,
      slateDryRunPath: args.slateDryRunPath,
      tightLongMinerPath: args.tightLongMinerPath,
      simulationPath: args.simulationPath,
    },
    assumptions: {
      savedReportsOnly: true,
      installedOverlayAlreadyExists: true,
      auditOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      baselineRows: baseline.length,
      installedRows: installed.length,
      retainedRows: retained.length,
      addedBackRows: addedBack.length,
      removedRows: removed.length,
      removedWinners: removedSummary.winners,
      removedLosses: removedSummary.losses,
      removedUnresolved: removedSummary.unresolved,
      installedLosses: installedSummary.losses,
      installedUnresolved: installedSummary.unresolved,
      installedOneMesPl: installedSummary.oneMesPl,
      baselineOneMesPl: baselineSummary.oneMesPl,
      deltaVsBaselineOneMesPl: delta(installedSummary.oneMesPl, baselineSummary.oneMesPl),
      collisionRisk,
      recommendation,
    },
    baselineSummary,
    installedSummary,
    addedBackSummary,
    removedSummary,
    rows,
    blockers,
    recommendations: recommendation === 'continue_to_research_collision_oos'
      ? [
        'Continue with an out-of-sample/replay collision audit before broadening the overlay to any other model family.',
        'Keep canExecute, entry, stop, targets, risk, Discord, Supabase, and bridge behavior unchanged.',
      ]
      : [
        'Pause further scanner-visible work and inspect blocker rows before any additional install.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-installed-collision-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveInstalledCollisionAuditReport({
    freshReplayPackagePath: options.freshReplayPackage,
    freshReplayPackage: readJson(options.freshReplayPackage),
    slateDryRunPath: options.slateDryRun,
    slateDryRun: readJson(options.slateDryRun),
    tightLongMinerPath: options.tightLongMiner,
    tightLongMiner: readJson(options.tightLongMiner),
    simulationPath: options.simulation,
    simulation: readJson(options.simulation),
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
