import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-level-generation-path-diagnostic';

interface CliOptions {
  blockerDrilldown: string;
  levelPathDiagnostic: string;
  outDir: string;
  json: boolean;
}

type CarveoutClass =
  | 'fresh_entry_pending'
  | 'stale_invalidated'
  | 'target_generation_gap'
  | 'manual_inspection'
  | 'missing_matching_candidate';

interface CarveoutRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  snapshotId: string | null;
  pathState: string;
  replayUse: string;
  likelyCause: string | null;
  blockReason: string | null;
  carveoutClass: CarveoutClass;
  performanceCarveoutEligible: boolean;
  selectorProposalEligible: false;
  recommendedNextAction: string;
}

interface CarveoutGroup {
  carveoutClass: CarveoutClass;
  rows: number;
  setupTypes: Record<string, number>;
  performanceCarveoutEligibleRows: number;
  selectorProposalEligibleRows: 0;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_exclusion_carveout_miner';
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
    blockerDrilldownPath: string | null;
    levelPathDiagnosticPath: string | null;
  };
  assumptions: {
    consumesSavedResearchReportsOnly: true;
    excludedRowsAreNotRepaired: true;
    carveoutsAreResearchAccountingOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    excludedRows: number;
    performanceCarveoutEligibleRows: number;
    targetGenerationGapRows: number;
    manualInspectionRows: number;
    selectorProposalEligibleRows: 0;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'apply_research_accounting_carveouts_then_retest_readiness'
      | 'inspect_target_generation_before_retest'
      | 'manual_snapshot_inspection_before_retest'
      | 'fix_inputs';
  };
  groups: CarveoutGroup[];
  rows: CarveoutRow[];
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
  const blockerDrilldown = readFlag(args, '--blocker-drilldown') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown-\d+\.json$/);
  const levelPathDiagnostic = readFlag(args, '--level-path-diagnostic') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-level-generation-path-diagnostic-\d+\.json$/);
  if (!blockerDrilldown) throw new Error('--blocker-drilldown is required.');
  if (!levelPathDiagnostic) throw new Error('--level-path-diagnostic is required.');
  return {
    blockerDrilldown: path.resolve(blockerDrilldown),
    levelPathDiagnostic: path.resolve(levelPathDiagnostic),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport['authority'] {
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

function carveoutClass(pathState: string): CarveoutClass {
  if (pathState === 'waiting_for_entry_trigger') return 'fresh_entry_pending';
  if (pathState === 'invalidated_without_replayable_entry') return 'stale_invalidated';
  if (pathState === 'missing_target_geometry_after_trigger') return 'target_generation_gap';
  if (pathState === 'missing_matching_candidate') return 'missing_matching_candidate';
  return 'manual_inspection';
}

function recommendedNextAction(carveout: CarveoutClass): string {
  if (carveout === 'fresh_entry_pending') return 'Exclude from outcome performance until a fresh completed 5M entry trigger exists.';
  if (carveout === 'stale_invalidated') return 'Exclude from outcome performance as stale invalidated evidence, not as model-quality proof.';
  if (carveout === 'target_generation_gap') return 'Inspect deterministic target generation before using the row in selector evidence.';
  if (carveout === 'missing_matching_candidate') return 'Inspect source package mapping before using the row in selector evidence.';
  return 'Manually inspect saved snapshot fields before using the row in selector evidence.';
}

function buildRows(args: {
  blockerDrilldown: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport | null;
  levelPathDiagnostic: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport | null;
}): CarveoutRow[] {
  const drilldownByTicket = new Map((args.blockerDrilldown?.rows || []).map((row) => [row.ticketId, row]));
  return (args.levelPathDiagnostic?.rows || []).map((row) => {
    const drilldown = drilldownByTicket.get(row.ticketId);
    const carveout = carveoutClass(row.pathState);
    const performanceCarveoutEligible = carveout === 'fresh_entry_pending' || carveout === 'stale_invalidated';
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      snapshotId: row.snapshotId,
      pathState: row.pathState,
      replayUse: row.replayUse,
      likelyCause: drilldown?.likelyCause || null,
      blockReason: row.blockReason,
      carveoutClass: carveout,
      performanceCarveoutEligible,
      selectorProposalEligible: false,
      recommendedNextAction: recommendedNextAction(carveout),
    };
  });
}

function buildGroups(rows: CarveoutRow[]): CarveoutGroup[] {
  const byClass = new Map<CarveoutClass, CarveoutRow[]>();
  for (const row of rows) byClass.set(row.carveoutClass, [...(byClass.get(row.carveoutClass) || []), row]);
  return [...byClass.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([carveout, groupRows]) => {
    const setupTypes: Record<string, number> = {};
    for (const row of groupRows) setupTypes[row.setupType] = (setupTypes[row.setupType] || 0) + 1;
    return {
      carveoutClass: carveout,
      rows: groupRows.length,
      setupTypes,
      performanceCarveoutEligibleRows: groupRows.filter((row) => row.performanceCarveoutEligible).length,
      selectorProposalEligibleRows: 0,
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Exclusion Carveout Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only carveout miner. It consumes saved research reports only and does not install selector behavior, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Excluded rows: ${report.summary.excludedRows}.`,
    `- Performance-carveout eligible rows: ${report.summary.performanceCarveoutEligibleRows}.`,
    `- Target-generation gap rows: ${report.summary.targetGenerationGapRows}.`,
    `- Manual-inspection rows: ${report.summary.manualInspectionRows}.`,
    `- Selector-proposal eligible rows: ${report.summary.selectorProposalEligibleRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Groups',
    '| Carveout | Rows | Performance Carveout | Selector Proposal | Setup Types |',
    '|---|---:|---:|---:|---|',
    ...report.groups.map((group) => `| ${group.carveoutClass} | ${group.rows} | ${group.performanceCarveoutEligibleRows} | ${group.selectorProposalEligibleRows} | ${Object.entries(group.setupTypes).map(([setupType, count]) => `${setupType}: ${count}`).join(', ') || '-'} |`),
    '',
    '## Rows',
    '| Ticket | Path State | Class | Performance Carveout | Action |',
    '|---|---|---|---:|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.pathState} | ${row.carveoutClass} | ${row.performanceCarveoutEligible} | ${row.recommendedNextAction} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport(args: {
  blockerDrilldownPath: string | null;
  blockerDrilldown: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport | null;
  levelPathDiagnosticPath: string | null;
  levelPathDiagnostic: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport {
  const blockers = [
    !args.blockerDrilldownPath ? 'missing blocker drilldown path' : null,
    !args.blockerDrilldown ? 'missing blocker drilldown report' : null,
    args.blockerDrilldown && args.blockerDrilldown.status !== 'pass' ? `blocker drilldown status ${args.blockerDrilldown.status}` : null,
    !args.levelPathDiagnosticPath ? 'missing level path diagnostic path' : null,
    !args.levelPathDiagnostic ? 'missing level path diagnostic report' : null,
    args.levelPathDiagnostic && args.levelPathDiagnostic.status !== 'pass' ? `level path diagnostic status ${args.levelPathDiagnostic.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const rows = buildRows(args);
  const groups = buildGroups(rows);
  const targetGenerationGapRows = rows.filter((row) => row.carveoutClass === 'target_generation_gap').length;
  const manualInspectionRows = rows.filter((row) => row.carveoutClass === 'manual_inspection' || row.carveoutClass === 'missing_matching_candidate').length;
  const recommendation = blockers.length ? 'fix_inputs'
    : targetGenerationGapRows > 0 ? 'inspect_target_generation_before_retest'
      : manualInspectionRows > 0 ? 'manual_snapshot_inspection_before_retest'
        : 'apply_research_accounting_carveouts_then_retest_readiness';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_exclusion_carveout_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      blockerDrilldownPath: args.blockerDrilldownPath,
      levelPathDiagnosticPath: args.levelPathDiagnosticPath,
    },
    assumptions: {
      consumesSavedResearchReportsOnly: true,
      excludedRowsAreNotRepaired: true,
      carveoutsAreResearchAccountingOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      excludedRows: rows.length,
      performanceCarveoutEligibleRows: rows.filter((row) => row.performanceCarveoutEligible).length,
      targetGenerationGapRows,
      manualInspectionRows,
      selectorProposalEligibleRows: 0,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix source report inputs before mining carveouts.']
      : ['Use these carveouts for research accounting only, then rerun readiness. Do not install live selector behavior from this report alone.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-exclusion-carveout-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport({
    blockerDrilldownPath: options.blockerDrilldown,
    blockerDrilldown: fs.existsSync(options.blockerDrilldown)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport>(options.blockerDrilldown)
      : null,
    levelPathDiagnosticPath: options.levelPathDiagnostic,
    levelPathDiagnostic: fs.existsSync(options.levelPathDiagnostic)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport>(options.levelPathDiagnostic)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, groups: report.groups }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
