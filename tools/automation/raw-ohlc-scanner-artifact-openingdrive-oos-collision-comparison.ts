import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  oosPackage: string;
  samebarReports: string[];
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

interface CollisionComparisonRow {
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  selectedDirection: string;
  selectedRiskPoints: number;
  selectedOutcomeLabel: string;
  selectedOutcomeStatus: string;
  selectedOneMesPl: number | null;
  competingRows: number;
  competingSetupTypes: string[];
  competingLosses: number;
  competingWinners: number;
  bestCompetingTicketId: string | null;
  bestCompetingSetupType: string | null;
  bestCompetingDirection: string | null;
  bestCompetingOneMesPl: number | null;
  selectedVsBestCompetingDelta: number | null;
  collisionVerdict: 'selected_clean_best_available' | 'selected_clean_but_competitor_better' | 'selected_clean_no_competitor' | 'selected_needs_review';
}

export interface RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_comparison';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    oosPackagePath: string;
    samebarReports: string[];
  };
  assumptions: {
    consumesExistingOosPackageOnly: true;
    consumesExistingSameBarReportsOnly: true;
    comparesSameTradeDateSessionProofTime: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    selectedRows: number;
    selectedRowsWithCompetitors: number;
    selectedRowsWithoutCompetitors: number;
    selectedRowsBeatingCompetitors: number;
    selectedRowsLaggingBestCompetitor: number;
    selectedLosses: number;
    competingLosses: number;
    selectedOneMesPl: number | null;
    bestCompetingOneMesPl: number | null;
    deltaVsBestCompetingOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_installed_overlay_and_continue_live_observation' | 'inspect_competitor_collisions' | 'fix_inputs';
  };
  rows: CollisionComparisonRow[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const oosPackage = readFlag(args, '--oos-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package-\d+\.json$/);
  if (!oosPackage) throw new Error('--oos-package is required.');
  const samebarReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    oosPackage,
    samebarReports: samebarReports.length ? samebarReports : latestSamebarReportsFromOosPackage(oosPackage),
    outDir,
    json: args.includes('--json'),
  };
}

function latestSamebarReportsFromOosPackage(oosPackage: string): string[] {
  if (!fs.existsSync(oosPackage)) return [];
  const parsed = readJson<RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport>(oosPackage);
  return parsed.source?.samebarReports || [];
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

function isWinner(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function sameEventKey(row: Pick<RawOhlcScannerArtifactSameBarSeparatorRow, 'tradeDate' | 'session' | 'proofTime'>): string {
  return `${row.tradeDate}|${row.session}|${row.proofTime}`;
}

function bestByOneMesPl(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): RawOhlcScannerArtifactSameBarSeparatorRow | null {
  const resolved = rows
    .filter((row) => typeof row.resolvedOneMesPl === 'number' && Number.isFinite(row.resolvedOneMesPl))
    .sort((a, b) => (b.resolvedOneMesPl as number) - (a.resolvedOneMesPl as number));
  return resolved[0] || null;
}

function buildRows(args: {
  oosPackage: RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport | null;
  samebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}): CollisionComparisonRow[] {
  const allSamebarRows = args.samebarReports.flatMap((report) => report.rows || []);
  const rowsByEvent = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of allSamebarRows) {
    const key = sameEventKey(row);
    rowsByEvent.set(key, [...(rowsByEvent.get(key) || []), row]);
  }
  return (args.oosPackage?.selectedRows || []).map((selected) => {
    const eventRows = rowsByEvent.get(sameEventKey(selected)) || [];
    const competitors = eventRows.filter((row) => row.ticketId !== selected.ticketId);
    const bestCompetitor = bestByOneMesPl(competitors);
    const selectedPl = selected.oneMesPl;
    const bestCompetingPl = bestCompetitor?.resolvedOneMesPl ?? null;
    const delta = typeof selectedPl === 'number' && typeof bestCompetingPl === 'number'
      ? round(selectedPl - bestCompetingPl)
      : null;
    const collisionVerdict: CollisionComparisonRow['collisionVerdict'] = isLoss({
      outcomeStatus: selected.outcomeStatus as RawOhlcScannerArtifactSameBarSeparatorRow['outcomeStatus'],
      outcomeLabel: selected.outcomeLabel as RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'],
    })
      ? 'selected_needs_review'
      : competitors.length === 0
        ? 'selected_clean_no_competitor'
        : delta !== null && delta < 0
          ? 'selected_clean_but_competitor_better'
          : 'selected_clean_best_available';
    return {
      selectedTicketId: selected.ticketId,
      tradeDate: selected.tradeDate,
      session: selected.session,
      proofTime: selected.proofTime,
      selectedDirection: selected.direction,
      selectedRiskPoints: selected.riskPoints,
      selectedOutcomeLabel: selected.outcomeLabel,
      selectedOutcomeStatus: selected.outcomeStatus,
      selectedOneMesPl: selected.oneMesPl,
      competingRows: competitors.length,
      competingSetupTypes: [...new Set(competitors.map((row) => row.setupType))].sort(),
      competingLosses: competitors.filter(isLoss).length,
      competingWinners: competitors.filter(isWinner).length,
      bestCompetingTicketId: bestCompetitor?.ticketId || null,
      bestCompetingSetupType: bestCompetitor?.setupType || null,
      bestCompetingDirection: bestCompetitor?.direction || null,
      bestCompetingOneMesPl: bestCompetingPl,
      selectedVsBestCompetingDelta: delta,
      collisionVerdict,
    };
  }).sort((a, b) => `${a.tradeDate}-${a.session}-${a.proofTime}-${a.selectedTicketId}`.localeCompare(`${b.tradeDate}-${b.session}-${b.proofTime}-${b.selectedTicketId}`));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Collision Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only collision comparison over saved OOS package and same-bar reports. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- With / without same-event competitors: ${report.summary.selectedRowsWithCompetitors}/${report.summary.selectedRowsWithoutCompetitors}.`,
    `- Beating / lagging best competitor: ${report.summary.selectedRowsBeatingCompetitors}/${report.summary.selectedRowsLaggingBestCompetitor}.`,
    `- Selected losses / competing losses: ${report.summary.selectedLosses}/${report.summary.competingLosses}.`,
    `- One-MES P/L selected / best-competing / delta: ${report.summary.selectedOneMesPl ?? '-'}/${report.summary.bestCompetingOneMesPl ?? '-'}/${report.summary.deltaVsBestCompetingOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Selected | Time | Side | Risk | P/L | Competitors | Best Competitor | Delta | Verdict |',
    '|---|---|---|---:|---:|---:|---|---:|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.selectedTicketId)} | ${row.proofTime} | ${row.selectedDirection} | ${row.selectedRiskPoints} | ${row.selectedOneMesPl ?? '-'} | ${row.competingRows} | ${escapeTable(row.bestCompetingSetupType || '-')} | ${row.selectedVsBestCompetingDelta ?? '-'} | ${row.collisionVerdict} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport(args: {
  oosPackagePath: string;
  oosPackage: RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport | null;
  samebarReports: string[];
  samebarReportPayloads: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport {
  const rows = buildRows({ oosPackage: args.oosPackage, samebarReports: args.samebarReportPayloads });
  const selectedOneMesPl = sum(rows.map((row) => row.selectedOneMesPl));
  const bestCompetingOneMesPl = sum(rows.map((row) => row.bestCompetingOneMesPl));
  const selectedLosses = rows.filter((row) => row.selectedOutcomeStatus === 'resolved' && row.selectedOutcomeLabel === 'stopped_before_t1').length;
  const laggingRows = rows.filter((row) => row.collisionVerdict === 'selected_clean_but_competitor_better');
  const blockers = [
    !args.oosPackage ? 'missing OOS package report' : null,
    args.oosPackage && args.oosPackage.status !== 'pass' ? `OOS package status ${args.oosPackage.status}` : null,
    args.samebarReportPayloads.length === 0 ? 'missing same-bar reports' : null,
    args.samebarReportPayloads.some((report) => report.status !== 'pass') ? 'one or more same-bar reports did not pass' : null,
    rows.length === 0 ? 'no selected OOS OpeningDrive rows to compare' : null,
    selectedLosses > 0 ? `selected OOS rows include ${selectedLosses} loss rows` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : laggingRows.length > 0
      ? 'inspect_competitor_collisions'
      : 'keep_installed_overlay_and_continue_live_observation';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      oosPackagePath: args.oosPackagePath,
      samebarReports: args.samebarReports,
    },
    assumptions: {
      consumesExistingOosPackageOnly: true,
      consumesExistingSameBarReportsOnly: true,
      comparesSameTradeDateSessionProofTime: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRows: rows.length,
      selectedRowsWithCompetitors: rows.filter((row) => row.competingRows > 0).length,
      selectedRowsWithoutCompetitors: rows.filter((row) => row.competingRows === 0).length,
      selectedRowsBeatingCompetitors: rows.filter((row) => row.collisionVerdict === 'selected_clean_best_available').length,
      selectedRowsLaggingBestCompetitor: laggingRows.length,
      selectedLosses,
      competingLosses: rows.reduce((total, row) => total + row.competingLosses, 0),
      selectedOneMesPl,
      bestCompetingOneMesPl,
      deltaVsBestCompetingOneMesPl: typeof selectedOneMesPl === 'number' && typeof bestCompetingOneMesPl === 'number'
        ? round(selectedOneMesPl - bestCompetingOneMesPl)
        : null,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'keep_installed_overlay_and_continue_live_observation'
      ? [
        'OOS selected OpeningDrive rows were clean against same-event competitors. Keep the installed overlay unchanged and continue live/replay observation.',
        'Do not broaden this selector to other models from this small sample.',
      ]
      : recommendation === 'inspect_competitor_collisions'
        ? [
          'Inspect selected rows that lagged the best same-event competitor before further tuning.',
          'Keep the installed overlay unchanged until the collision row cause is known.',
        ]
        : [
          'Fix saved OOS package or same-bar inputs before using this comparison.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-collision-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport({
    oosPackagePath: options.oosPackage,
    oosPackage: fs.existsSync(options.oosPackage)
      ? readJson<RawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport>(options.oosPackage)
      : null,
    samebarReports: options.samebarReports,
    samebarReportPayloads: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nWrote ${jsonPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
