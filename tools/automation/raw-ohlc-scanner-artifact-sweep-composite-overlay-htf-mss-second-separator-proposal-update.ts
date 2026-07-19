import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-simulation';

interface CliOptions {
  secondSeparatorSimulation: string;
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

interface ExclusionCriterion {
  name: string;
  value: string;
  source: string;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_proposal_update';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    secondSeparatorSimulationPath: string;
  };
  assumptions: {
    savedSimulationOnly: true;
    proposalUpdateOnly: true;
    htfMssOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  proposalUpdate: {
    name: 'promotion_disabled_htf_mss_two_separator_candidate';
    scannerVisibleNow: false;
    requiresFutureApprovalGate: true;
    purpose: string;
    selectionCriteria: string[];
    exclusionCriteria: ExclusionCriterion[];
    prohibitedChanges: string[];
    requiredFutureProof: string[];
  };
  summary: {
    simulationSelectedRows: number;
    simulationSelectedWinners: number;
    simulationSelectedLosses: number;
    simulationSelectedUnresolved: number;
    simulationSelectedOneMesPl: number | null;
    simulationTotalRejectedRows: number;
    simulationTotalRejectedWinners: number;
    simulationTotalRejectedLosses: number;
    simulationTotalRejectedUnresolved: number;
    simulationTotalRejectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'ready_for_approval_contract' | 'fix_inputs';
  };
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateArgs(args = process.argv.slice(2)): CliOptions {
  const secondSeparatorSimulation = readFlag(args, '--second-separator-simulation');
  if (!secondSeparatorSimulation) throw new Error('--second-separator-simulation is required.');
  return {
    secondSeparatorSimulation,
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport, 'markdown'>): string {
  return [
    '# HTF MSS Two-Separator Proposal Update',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only proposal update. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Evidence',
    `- Selected rows W/L/U: ${report.summary.simulationSelectedWinners}/${report.summary.simulationSelectedLosses}/${report.summary.simulationSelectedUnresolved}.`,
    `- Selected one-MES P/L: ${report.summary.simulationSelectedOneMesPl ?? '-'}.`,
    `- Total rejected rows W/L/U: ${report.summary.simulationTotalRejectedWinners}/${report.summary.simulationTotalRejectedLosses}/${report.summary.simulationTotalRejectedUnresolved}.`,
    `- Total rejected one-MES P/L: ${report.summary.simulationTotalRejectedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Exclusion Criteria',
    ...report.proposalUpdate.exclusionCriteria.map((criterion) => `- ${criterion.name}: ${criterion.value} (${criterion.source})`),
    '',
    '## Prohibited Changes',
    ...report.proposalUpdate.prohibitedChanges.map((item) => `- ${item}`),
    '',
    '## Required Future Proof',
    ...report.proposalUpdate.requiredFutureProof.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendation',
    `- ${report.summary.recommendation}`,
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport(args: {
  reportDir: string;
  secondSeparatorSimulationPath: string;
  secondSeparatorSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport {
  const simulation = args.secondSeparatorSimulation;
  const second = simulation?.secondSeparator;
  const blockers = [
    !simulation ? 'missing HTF-MSS second-separator simulation report' : null,
    simulation && simulation.status !== 'pass' ? `HTF-MSS second-separator simulation status ${simulation.status}` : null,
    simulation && simulation.summary.recommendation !== 'prepare_research_only_proposal_update'
      ? `HTF-MSS second-separator simulation recommendation ${simulation.summary.recommendation}`
      : null,
    simulation && simulation.summary.livePromotionAllowedRows !== 0
      ? `HTF-MSS second-separator simulation live promotion rows ${simulation.summary.livePromotionAllowedRows}`
      : null,
    simulation && simulation.summary.selectedLosses !== 0 ? `HTF-MSS second-separator selected losses ${simulation.summary.selectedLosses}` : null,
    !second ? 'missing derived second separator' : null,
  ].filter((item): item is string => Boolean(item));
  const exclusionCriteria: ExclusionCriterion[] = [
    {
      name: 'first separator caution exclusion',
      value: 'exclude date_session:2026-07-09|morning from the HTF-MSS selected set',
      source: 'first separator simulation rejected the July 9 morning stopped-before-T1 pocket',
    },
    {
      name: 'second separator selected-loss exclusion',
      value: second
        ? `exclude ${second.tradeDate} ${second.session} ${second.direction} ${second.timeBucket} ${second.riskBucket}`
        : 'missing',
      source: 'second separator simulation removed all remaining selected stopped-before-T1 losses',
    },
  ];
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_proposal_update',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      secondSeparatorSimulationPath: args.secondSeparatorSimulationPath,
    },
    assumptions: {
      savedSimulationOnly: true,
      proposalUpdateOnly: true,
      htfMssOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    proposalUpdate: {
      name: 'promotion_disabled_htf_mss_two_separator_candidate',
      scannerVisibleNow: false,
      requiresFutureApprovalGate: true,
      purpose: 'Document a future approval-gated HTF displacement MSS candidate selector that keeps the zero-selected-loss saved-report package and rejects the two identified stopped-before-T1 pockets.',
      selectionCriteria: [
        'Model family remains HtfDisplacementMssContinuation only.',
        'Candidate must already satisfy existing deterministic 5M proof, protected stop, risk, target-room, invalidation, and session gates.',
        'HTF remains context/support/caution only and must not become execution authority.',
        'Any scanner-visible implementation must stay disabled until a separate approval contract passes.',
      ],
      exclusionCriteria,
      prohibitedChanges: [
        'Do not loosen canExecute.',
        'Do not change scanner runtime ranking or publication behavior from this package.',
        'Do not change Discord posting, Supabase persistence, or NinjaTrader bridge behavior.',
        'Do not change entry, stop, T1, T2, risk, invalidation, target-room, or session-window math.',
        'Do not broaden to FVG, Sweep, TurtleSoup, Intraday MSS, OpeningDrive, or AfterLunchDrive without separate replay evidence.',
      ],
      requiredFutureProof: [
        'A separate approval contract consuming this proposal update.',
        'A replay comparison proving the package still selects 62 winners, 0 losses, and 13 unresolved on the saved HTF-MSS set.',
        'Regression proof that scannerVisibleNow remains false and livePromotionAllowedRows remains 0 until explicit approval.',
        'Full project verification before any future implementation commit.',
      ],
    },
    summary: {
      simulationSelectedRows: simulation?.summary.selectedRows || 0,
      simulationSelectedWinners: simulation?.summary.selectedWinners || 0,
      simulationSelectedLosses: simulation?.summary.selectedLosses || 0,
      simulationSelectedUnresolved: simulation?.summary.selectedUnresolved || 0,
      simulationSelectedOneMesPl: simulation?.summary.selectedOneMesPl ?? null,
      simulationTotalRejectedRows: simulation?.summary.totalRejectedRows || 0,
      simulationTotalRejectedWinners: simulation?.summary.totalRejectedWinners || 0,
      simulationTotalRejectedLosses: simulation?.summary.totalRejectedLosses || 0,
      simulationTotalRejectedUnresolved: simulation?.summary.totalRejectedUnresolved || 0,
      simulationTotalRejectedOneMesPl: simulation?.summary.totalRejectedOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'ready_for_approval_contract',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the second-separator simulation before using this proposal update.']
      : [
        'Use this as the research-only handoff for an approval-contract phase.',
        'Keep scanner-visible implementation disabled until a separate approval contract passes.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-proposal-update-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport({
    reportDir: options.outDir,
    secondSeparatorSimulationPath: options.secondSeparatorSimulation,
    secondSeparatorSimulation: fs.existsSync(options.secondSeparatorSimulation) ? readJson(options.secondSeparatorSimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
