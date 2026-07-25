import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-collision-comparison';

interface CliOptions {
  comparison: string;
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

interface SimulationRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  originalTicketId: string;
  originalSetupType: 'OpeningDriveFvgContinuation';
  originalOneMesPl: number | null;
  simulatedTicketId: string;
  simulatedSetupType: string;
  simulatedOneMesPl: number | null;
  deltaOneMesPl: number | null;
  action: 'kept_openingdrive' | 'replaced_with_same_direction_sweep_or_htf';
}

export interface RawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_priority_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    comparisonPath: string;
  };
  assumptions: {
    consumesExistingComparisonOnly: true;
    sameEventOnly: true;
    sameDirectionOnly: true;
    sweepOrHtfCompetitorOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    originalRows: number;
    replacedRows: number;
    keptRows: number;
    originalOneMesPl: number | null;
    simulatedOneMesPl: number | null;
    deltaOneMesPl: number | null;
    selectedLossesBefore: number;
    simulatedLosses: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'validate_priority_rule_broader_oos' | 'keep_observing' | 'fix_inputs';
  };
  rows: SimulationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const PRIORITY_SET = new Set(['SweepMssFvgRetrace', 'IntradayMssMicroContinuation']);

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

export function parseRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const comparison = readFlag(args, '--comparison') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-collision-comparison-\d+\.json$/);
  if (!comparison) throw new Error('--comparison is required.');
  return { comparison, outDir, json: args.includes('--json') };
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

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function canReplace(row: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport['rows'][number]): boolean {
  return (
    row.collisionVerdict === 'selected_clean_but_competitor_better' &&
    row.bestCompetingDirection === row.selectedDirection &&
    Boolean(row.bestCompetingSetupType && PRIORITY_SET.has(row.bestCompetingSetupType)) &&
    typeof row.bestCompetingOneMesPl === 'number'
  );
}

function buildRows(report: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport | null): SimulationRow[] {
  return (report?.rows || []).map((row) => {
    const replace = canReplace(row);
    const simulatedOneMesPl = replace ? row.bestCompetingOneMesPl : row.selectedOneMesPl;
    const simulatedTicketId = replace ? row.bestCompetingTicketId || row.selectedTicketId : row.selectedTicketId;
    const simulatedSetupType = replace ? row.bestCompetingSetupType || 'UnknownSetup' : 'OpeningDriveFvgContinuation';
    return {
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      originalTicketId: row.selectedTicketId,
      originalSetupType: 'OpeningDriveFvgContinuation',
      originalOneMesPl: row.selectedOneMesPl,
      simulatedTicketId,
      simulatedSetupType,
      simulatedOneMesPl,
      deltaOneMesPl: typeof simulatedOneMesPl === 'number' && typeof row.selectedOneMesPl === 'number'
        ? round(simulatedOneMesPl - row.selectedOneMesPl)
        : null,
      action: replace ? 'replaced_with_same_direction_sweep_or_htf' : 'kept_openingdrive',
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Priority Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only priority simulation over saved collision comparison. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Original rows: ${report.summary.originalRows}.`,
    `- Replaced / kept rows: ${report.summary.replacedRows}/${report.summary.keptRows}.`,
    `- One-MES P/L original / simulated / delta: ${report.summary.originalOneMesPl ?? '-'}/${report.summary.simulatedOneMesPl ?? '-'}/${report.summary.deltaOneMesPl ?? '-'}.`,
    `- Losses before / simulated: ${report.summary.selectedLossesBefore}/${report.summary.simulatedLosses}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport(args: {
  comparisonPath: string;
  comparison: RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport {
  const rows = buildRows(args.comparison);
  const originalOneMesPl = sum(rows.map((row) => row.originalOneMesPl));
  const simulatedOneMesPl = sum(rows.map((row) => row.simulatedOneMesPl));
  const replacedRows = rows.filter((row) => row.action === 'replaced_with_same_direction_sweep_or_htf').length;
  const blockers = [
    !args.comparison ? 'missing comparison report' : null,
    args.comparison && args.comparison.status !== 'pass' ? `comparison status ${args.comparison.status}` : null,
    rows.length === 0 ? 'no comparison rows to simulate' : null,
    args.comparison && args.comparison.summary.selectedLosses > 0 ? `comparison selected losses ${args.comparison.summary.selectedLosses}` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : replacedRows > 0 && typeof originalOneMesPl === 'number' && typeof simulatedOneMesPl === 'number' && simulatedOneMesPl > originalOneMesPl
      ? 'validate_priority_rule_broader_oos'
      : 'keep_observing';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_priority_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { comparisonPath: args.comparisonPath },
    assumptions: {
      consumesExistingComparisonOnly: true,
      sameEventOnly: true,
      sameDirectionOnly: true,
      sweepOrHtfCompetitorOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      originalRows: rows.length,
      replacedRows,
      keptRows: rows.filter((row) => row.action === 'kept_openingdrive').length,
      originalOneMesPl,
      simulatedOneMesPl,
      deltaOneMesPl: typeof originalOneMesPl === 'number' && typeof simulatedOneMesPl === 'number'
        ? round(simulatedOneMesPl - originalOneMesPl)
        : null,
      selectedLossesBefore: args.comparison?.summary.selectedLosses || 0,
      simulatedLosses: 0,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'validate_priority_rule_broader_oos'
      ? [
        'Validate this same-event same-direction Sweep/HTF priority rule on broader OOS replay before any scanner-visible install.',
        'Do not remove OpeningDrive. The proposal is priority-only when a clean same-direction Sweep/HTF candidate exists at the same proof event.',
      ]
      : recommendation === 'keep_observing'
        ? ['Keep observing; this simulation did not produce a positive priority effect.']
        : ['Fix the input comparison report before using this simulation.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-priority-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosPrioritySimulationReport({
    comparisonPath: options.comparison,
    comparison: fs.existsSync(options.comparison)
      ? readJson<RawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport>(options.comparison)
      : null,
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
