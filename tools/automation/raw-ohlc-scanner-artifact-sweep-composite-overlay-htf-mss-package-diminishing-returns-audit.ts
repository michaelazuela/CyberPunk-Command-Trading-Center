import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-package-simulation';

interface CliOptions {
  compoundPackageSimulation: string;
  residuePackageSimulation: string;
  secondResiduePackageSimulation: string;
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

interface StepSummary {
  step: string;
  packageName: string;
  selectedLosses: number;
  selectedWinners: number;
  selectedUnresolved: number;
  selectedOneMesPl: number | null;
  rejectedLosses: number;
  rejectedWinners: number;
  rejectedOneMesPl: number | null;
  marginalSelectedLossReduction: number | null;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_package_diminishing_returns_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    compoundPackageSimulationPath: string;
    residuePackageSimulationPath: string;
    secondResiduePackageSimulationPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    packageChainAuditOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    stepsAudited: number;
    cleanPackageMarginalLossReductions: number[];
    latestCleanMarginalLossReduction: number | null;
    strongestPackageRejectedWinnerCost: number | null;
    strongestPackageSelectedLosses: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'halt_htf_mss_filter_mining_and_pivot' | 'continue_htf_mss_filter_search' | 'fix_inputs';
  };
  chain: StepSummary[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditArgs(args = process.argv.slice(2)): CliOptions {
  const compoundPackageSimulation = readFlag(args, '--compound-package-simulation');
  const residuePackageSimulation = readFlag(args, '--residue-package-simulation');
  const secondResiduePackageSimulation = readFlag(args, '--second-residue-package-simulation');
  if (!compoundPackageSimulation) throw new Error('--compound-package-simulation is required.');
  if (!residuePackageSimulation) throw new Error('--residue-package-simulation is required.');
  if (!secondResiduePackageSimulation) throw new Error('--second-residue-package-simulation is required.');
  return {
    compoundPackageSimulation,
    residuePackageSimulation,
    secondResiduePackageSimulation,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
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

function step(args: {
  stepName: string;
  packageName: string;
  item: { selectedLosses: number; selectedWinners: number; selectedUnresolved: number; selectedOneMesPl: number | null; rejectedLosses: number; rejectedWinners: number; rejectedOneMesPl: number | null } | null;
  priorSelectedLosses: number | null;
}): StepSummary | null {
  if (!args.item) return null;
  return {
    step: args.stepName,
    packageName: args.packageName,
    selectedLosses: args.item.selectedLosses,
    selectedWinners: args.item.selectedWinners,
    selectedUnresolved: args.item.selectedUnresolved,
    selectedOneMesPl: args.item.selectedOneMesPl,
    rejectedLosses: args.item.rejectedLosses,
    rejectedWinners: args.item.rejectedWinners,
    rejectedOneMesPl: args.item.rejectedOneMesPl,
    marginalSelectedLossReduction: args.priorSelectedLosses === null ? null : args.priorSelectedLosses - args.item.selectedLosses,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport, 'markdown'>): string {
  return [
    '# HTF MSS Package Diminishing Returns Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only package-chain audit. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Steps audited: ${report.summary.stepsAudited}.`,
    `- Clean package marginal loss reductions: ${report.summary.cleanPackageMarginalLossReductions.join(', ') || '-'}.`,
    `- Latest clean marginal loss reduction: ${report.summary.latestCleanMarginalLossReduction ?? '-'}.`,
    `- Strongest package selected losses: ${report.summary.strongestPackageSelectedLosses ?? '-'}.`,
    `- Strongest package rejected winner cost: ${report.summary.strongestPackageRejectedWinnerCost ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Chain',
    ...report.chain.map((item) => `- ${item.step}/${item.packageName}: selected W/L/U ${item.selectedWinners}/${item.selectedLosses}/${item.selectedUnresolved}, selected P/L ${item.selectedOneMesPl ?? '-'}; rejected W/L ${item.rejectedWinners}/${item.rejectedLosses}, rejected P/L ${item.rejectedOneMesPl ?? '-'}; marginal loss reduction ${item.marginalSelectedLossReduction ?? '-'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport(args: {
  reportDir: string;
  compoundPackageSimulationPath: string;
  residuePackageSimulationPath: string;
  secondResiduePackageSimulationPath: string;
  compoundPackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residuePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport | null;
  secondResiduePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport {
  const firstClean = args.compoundPackageSimulation?.packages.find((item) => item.name === 'zero_winner_cost_all') || null;
  const secondClean = args.residuePackageSimulation?.packages.find((item) => item.name === 'base_plus_zero_winner_residue_all') || null;
  const thirdClean = args.secondResiduePackageSimulation?.packages.find((item) => item.name === 'base_plus_second_zero_winner_all') || null;
  const strongest = args.secondResiduePackageSimulation?.packages.find((item) => item.name === args.secondResiduePackageSimulation?.summary.bestPackage) || null;
  const chain = [
    step({ stepName: 'first_clean_package', packageName: 'zero_winner_cost_all', item: firstClean, priorSelectedLosses: null }),
    step({ stepName: 'second_clean_package', packageName: 'base_plus_zero_winner_residue_all', item: secondClean, priorSelectedLosses: firstClean?.selectedLosses ?? null }),
    step({ stepName: 'third_clean_package', packageName: 'base_plus_second_zero_winner_all', item: thirdClean, priorSelectedLosses: secondClean?.selectedLosses ?? null }),
  ].filter((item): item is StepSummary => Boolean(item));
  const cleanPackageMarginalLossReductions = chain.map((item) => item.marginalSelectedLossReduction).filter((item): item is number => typeof item === 'number');
  const latestCleanMarginalLossReduction = cleanPackageMarginalLossReductions.at(-1) ?? null;
  const blockers = [
    !args.compoundPackageSimulation ? 'missing HTF-MSS compound package simulation report' : null,
    args.compoundPackageSimulation && args.compoundPackageSimulation.status !== 'pass' ? `HTF-MSS compound package simulation status ${args.compoundPackageSimulation.status}` : null,
    !args.residuePackageSimulation ? 'missing HTF-MSS residue package simulation report' : null,
    args.residuePackageSimulation && args.residuePackageSimulation.status !== 'pass' ? `HTF-MSS residue package simulation status ${args.residuePackageSimulation.status}` : null,
    !args.secondResiduePackageSimulation ? 'missing HTF-MSS second residue package simulation report' : null,
    args.secondResiduePackageSimulation && args.secondResiduePackageSimulation.status !== 'pass' ? `HTF-MSS second residue package simulation status ${args.secondResiduePackageSimulation.status}` : null,
    !firstClean ? 'first clean package not found' : null,
    !secondClean ? 'second clean package not found' : null,
    !thirdClean ? 'third clean package not found' : null,
  ].filter((item): item is string => Boolean(item));
  const shouldHalt = !blockers.length
    && latestCleanMarginalLossReduction !== null
    && latestCleanMarginalLossReduction <= 3
    && !args.secondResiduePackageSimulation?.summary.zeroSelectedLossPackage
    && (strongest?.rejectedWinners ?? 0) > 0;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_package_diminishing_returns_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      compoundPackageSimulationPath: args.compoundPackageSimulationPath,
      residuePackageSimulationPath: args.residuePackageSimulationPath,
      secondResiduePackageSimulationPath: args.secondResiduePackageSimulationPath,
    },
    assumptions: { savedReportsOnly: true, htfMssOnly: true, packageChainAuditOnly: true, promotionDisabled: true, noLiveRankInstalled: true, livePromotionAllowed: false },
    summary: {
      stepsAudited: chain.length,
      cleanPackageMarginalLossReductions,
      latestCleanMarginalLossReduction,
      strongestPackageRejectedWinnerCost: strongest?.rejectedWinners ?? null,
      strongestPackageSelectedLosses: strongest?.selectedLosses ?? null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : shouldHalt ? 'halt_htf_mss_filter_mining_and_pivot' : 'continue_htf_mss_filter_search',
    },
    chain,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved package reports before using this diminishing-returns audit.']
      : [
        shouldHalt
          ? 'Do not keep drilling HTF-MSS zero-winner packages right now; marginal clean loss removal is too small. Pivot to another reviewed model family or a richer pre-entry feature source.'
          : 'The clean package chain has not exhausted itself yet; continue research-only mining if the next step has a clear hypothesis.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk changes from this audit.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport(report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-package-diminishing-returns-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport({
    reportDir: options.outDir,
    compoundPackageSimulationPath: options.compoundPackageSimulation,
    residuePackageSimulationPath: options.residuePackageSimulation,
    secondResiduePackageSimulationPath: options.secondResiduePackageSimulation,
    compoundPackageSimulation: fs.existsSync(options.compoundPackageSimulation) ? readJson(options.compoundPackageSimulation) : null,
    residuePackageSimulation: fs.existsSync(options.residuePackageSimulation) ? readJson(options.residuePackageSimulation) : null,
    secondResiduePackageSimulation: fs.existsSync(options.secondResiduePackageSimulation) ? readJson(options.secondResiduePackageSimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, chain: report.chain, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
