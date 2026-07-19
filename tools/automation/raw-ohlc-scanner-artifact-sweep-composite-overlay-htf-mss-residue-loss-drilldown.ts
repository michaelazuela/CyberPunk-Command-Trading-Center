import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];

interface CliOptions { broadValidation: string; packageSimulation: string; packageName: string; outDir: string; json: boolean }
interface Authority {
  readOnly: true; localOnly: true; researchOnly: true; postsDiscord: false; writesSupabase: false; readsLiveSupabase: false; readsLiveBridge: false; runsSetupScanner: false; changesScannerBehavior: false; changesTradingLogic: false; changesCanExecute: false; changesEntryStopTargets: false; changesRiskRules: false; changesBridgeBehavior: false; changesDiscordPosting: false; changesAppRuntime: false;
}
interface Bucket { feature: string; key: string; rows: number; winners: number; losses: number; unresolved: number; oneMesPl: number | null; lossShare: number }

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_loss_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: { reportDir: string; broadValidationPath: string; packageSimulationPath: string; packageName: string };
  assumptions: { savedReportsOnly: true; htfMssOnly: true; residueAfterPackageOnly: true; preEntryFeaturesOnly: true; promotionDisabled: true; noLiveRankInstalled: true; livePromotionAllowed: false };
  summary: { inputRows: number; packageRejectedRows: number; residueRows: number; residueLossRows: number; topResidueBucket: string | null; livePromotionAllowedRows: 0; recommendation: 'mine_residue_compounds' | 'prepare_research_only_proposal_update' | 'fix_inputs' };
  topResidueBuckets: Bucket[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const packageSimulation = readFlag(args, '--package-simulation');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!packageSimulation) throw new Error('--package-simulation is required.');
  return { broadValidation, packageSimulation, packageName: readFlag(args, '--package-name') || 'zero_winner_cost_all', outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T; }
function authority(): Authority {
  return { readOnly: true, localOnly: true, researchOnly: true, postsDiscord: false, writesSupabase: false, readsLiveSupabase: false, readsLiveBridge: false, runsSetupScanner: false, changesScannerBehavior: false, changesTradingLogic: false, changesCanExecute: false, changesEntryStopTargets: false, changesRiskRules: false, changesBridgeBehavior: false, changesDiscordPosting: false, changesAppRuntime: false };
}
function round(value: number): number { return Math.round(value * 100) / 100; }
function isWinner(row: Row): boolean { return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit'; }
function isLoss(row: Row): boolean { return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1'; }
function sum(rows: Row[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}
function riskBucket(riskPoints: number): string { if (riskPoints < 4) return 'risk_lt_4'; if (riskPoints < 8) return 'risk_4_to_8'; if (riskPoints < 16) return 'risk_8_to_16'; if (riskPoints < 24) return 'risk_16_to_24'; return 'risk_gte_24'; }
function fineRiskBucket(riskPoints: number): string { const lower = Math.floor(riskPoints / 4) * 4; return `risk_${lower}_to_${lower + 4}`; }
function timeBucket(proofTime: string): string { const hour = Number(proofTime.slice(11, 13)); return Number.isFinite(hour) ? `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59` : 'unknown'; }

function matchesScenarioName(row: Row, scenarioName: string): boolean {
  const key = scenarioName.includes(':') ? scenarioName.slice(scenarioName.indexOf(':') + 1) : scenarioName;
  const values = new Map([['session', row.session], ['direction', row.direction], ['timeBucket', timeBucket(row.proofTime)], ['riskBucket', riskBucket(row.riskPoints)], ['fineRiskBucket', fineRiskBucket(row.riskPoints)]]);
  return key.split('|').every((part) => {
    const [feature, expected] = part.split('=');
    return Boolean(feature && expected && values.get(feature) === expected);
  });
}

function bucket(rows: Row[], feature: string, keyFn: (row: Row) => string, totalLosses: number): Bucket[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) map.set(keyFn(row), [...(map.get(keyFn(row)) || []), row]);
  return [...map.entries()].map(([key, bucketRows]) => ({
    feature,
    key,
    rows: bucketRows.length,
    winners: bucketRows.filter(isWinner).length,
    losses: bucketRows.filter(isLoss).length,
    unresolved: bucketRows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(bucketRows),
    lossShare: totalLosses ? round(bucketRows.filter(isLoss).length / totalLosses) : 0,
  })).filter((item) => item.losses > 0).sort((a, b) => b.losses - a.losses || a.winners - b.winners || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport, 'markdown'>): string {
  return ['# HTF MSS Residue Loss Drilldown', '', `Status: ${report.status}`, '', 'Authority: local-only read-only residue drilldown. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.', '', '## Summary', `- Input rows: ${report.summary.inputRows}.`, `- Package rejected rows: ${report.summary.packageRejectedRows}.`, `- Residue rows: ${report.summary.residueRows}.`, `- Residue loss rows: ${report.summary.residueLossRows}.`, `- Top residue bucket: ${report.summary.topResidueBucket ?? '-'}.`, `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`, `- Recommendation: ${report.summary.recommendation}.`, '', '## Top Buckets', ...report.topResidueBuckets.slice(0, 12).map((item) => `- ${item.feature}:${item.key} rows ${item.rows}, W/L/U ${item.winners}/${item.losses}/${item.unresolved}, P/L ${item.oneMesPl ?? '-'}, lossShare ${item.lossShare}.`), '', '## Blockers', ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.'])].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport(args: {
  reportDir: string; broadValidationPath: string; packageSimulationPath: string; packageName: string; broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null; packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport {
  const rows = args.broadValidation?.selectedRows || [];
  const selectedPackage = args.packageSimulation?.packages.find((item) => item.name === args.packageName) || null;
  const rejectedRows = selectedPackage ? rows.filter((row) => selectedPackage.scenarioNames.some((scenario) => matchesScenarioName(row, scenario))) : [];
  const residue = selectedPackage ? rows.filter((row) => !selectedPackage.scenarioNames.some((scenario) => matchesScenarioName(row, scenario))) : rows;
  const residueLosses = residue.filter(isLoss).length;
  const topResidueBuckets = [
    ...bucket(residue, 'session', (row) => row.session, residueLosses),
    ...bucket(residue, 'direction', (row) => row.direction, residueLosses),
    ...bucket(residue, 'timeBucket', (row) => timeBucket(row.proofTime), residueLosses),
    ...bucket(residue, 'riskBucket', (row) => riskBucket(row.riskPoints), residueLosses),
    ...bucket(residue, 'fineRiskBucket', (row) => fineRiskBucket(row.riskPoints), residueLosses),
    ...bucket(residue, 'sessionDirectionTimeRisk', (row) => `${row.session}|${row.direction}|${timeBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`, residueLosses),
  ].filter((item) => item.losses >= 3).sort((a, b) => b.losses - a.losses || a.winners - b.winners).slice(0, 30);
  const blockers = [!args.broadValidation ? 'missing HTF-MSS broad validation report' : null, args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null, !args.packageSimulation ? 'missing HTF-MSS compound package simulation report' : null, args.packageSimulation && args.packageSimulation.status !== 'pass' ? `HTF-MSS compound package simulation status ${args.packageSimulation.status}` : null, !selectedPackage ? `package ${args.packageName} not found` : null].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_loss_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir: args.reportDir, broadValidationPath: args.broadValidationPath, packageSimulationPath: args.packageSimulationPath, packageName: args.packageName },
    assumptions: { savedReportsOnly: true, htfMssOnly: true, residueAfterPackageOnly: true, preEntryFeaturesOnly: true, promotionDisabled: true, noLiveRankInstalled: true, livePromotionAllowed: false },
    summary: { inputRows: rows.length, packageRejectedRows: rejectedRows.length, residueRows: residue.length, residueLossRows: residueLosses, topResidueBucket: topResidueBuckets[0] ? `${topResidueBuckets[0].feature}:${topResidueBuckets[0].key}` : null, livePromotionAllowedRows: 0, recommendation: blockers.length ? 'fix_inputs' : residueLosses === 0 ? 'prepare_research_only_proposal_update' : 'mine_residue_compounds' },
    topResidueBuckets,
    blockers,
    recommendations: blockers.length ? ['Fix saved report inputs before using this residue drilldown.'] : ['Mine compound pockets over the remaining selected-loss residue before any scanner-visible proposal.', 'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport(report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-loss-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport({ reportDir: options.outDir, broadValidationPath: options.broadValidation, packageSimulationPath: options.packageSimulation, packageName: options.packageName, broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null, packageSimulation: fs.existsSync(options.packageSimulation) ? readJson(options.packageSimulation) : null });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topResidueBuckets: report.topResidueBuckets.slice(0, 12), blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
