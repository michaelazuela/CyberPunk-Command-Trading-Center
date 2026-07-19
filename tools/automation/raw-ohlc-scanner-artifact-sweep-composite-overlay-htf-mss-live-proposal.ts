import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-only-simulation';

interface CliOptions {
  htfMssSimulation: string;
  outDir: string;
  json: boolean;
}

interface ProposalCriterion {
  name: string;
  required: boolean;
  value: string;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_live_proposal';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport['authority'];
  source: {
    reportDir: string;
    htfMssSimulationPath: string;
  };
  assumptions: {
    savedSimulationOnly: true;
    proposalOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  proposal: {
    name: 'promotion_disabled_htf_mss_only_overlay_candidate';
    purpose: string;
    scannerVisibleNow: false;
    requiresFutureApprovalGate: true;
    rollbackPath: string;
    criteria: ProposalCriterion[];
    prohibitedChanges: string[];
    requiredFutureProof: string[];
  };
  summary: {
    simulationSelectedRows: number;
    simulationSelectedResolvedRows: number;
    simulationSelectedUnresolvedRows: number;
    simulationSelectedResolvedGrossOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'keep_research_only' | 'ready_for_approval_checkpoint' | 'fix_inputs';
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalArgs(args = process.argv.slice(2)): CliOptions {
  const htfMssSimulation = readFlag(args, '--htf-mss-simulation');
  if (!htfMssSimulation) throw new Error('--htf-mss-simulation is required.');
  return {
    htfMssSimulation,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport, 'markdown'>): string {
  return [
    '# Promotion-Disabled HTF MSS-Only Overlay Proposal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only proposal package. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Evidence',
    `- Selected rows: ${report.summary.simulationSelectedRows}.`,
    `- Selected resolved/unresolved: ${report.summary.simulationSelectedResolvedRows} / ${report.summary.simulationSelectedUnresolvedRows}.`,
    `- Selected resolved gross one-MES P/L: ${report.summary.simulationSelectedResolvedGrossOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Selection Criteria',
    ...report.proposal.criteria.map((criterion) => `- ${criterion.name}: ${criterion.value}`),
    '',
    '## Prohibited Changes',
    ...report.proposal.prohibitedChanges.map((item) => `- ${item}`),
    '',
    '## Required Future Proof',
    ...report.proposal.requiredFutureProof.map((item) => `- ${item}`),
    '',
    '## Recommendation',
    `- ${report.summary.recommendation}`,
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport(args: {
  reportDir: string;
  htfMssSimulationPath: string;
  htfMssSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport {
  const blockers = [
    !args.htfMssSimulation ? 'missing HTF-MSS simulation report' : null,
    args.htfMssSimulation && args.htfMssSimulation.status !== 'pass' ? `HTF-MSS simulation status ${args.htfMssSimulation.status}` : null,
    args.htfMssSimulation && args.htfMssSimulation.summary.recommendation !== 'prepare_promotion_disabled_live_proposal'
      ? `HTF-MSS simulation recommendation ${args.htfMssSimulation.summary.recommendation}`
      : null,
    args.htfMssSimulation && args.htfMssSimulation.summary.livePromotionAllowedRows !== 0
      ? `HTF-MSS simulation live promotion rows ${args.htfMssSimulation.summary.livePromotionAllowedRows}`
      : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_live_proposal',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      htfMssSimulationPath: args.htfMssSimulationPath,
    },
    assumptions: {
      savedSimulationOnly: true,
      proposalOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    proposal: {
      name: 'promotion_disabled_htf_mss_only_overlay_candidate',
      purpose: 'Document a future approval-gated research overlay candidate that may prefer replay-covered HTF displacement MSS replacement rows over no-chase/stale original tops.',
      scannerVisibleNow: false,
      requiresFutureApprovalGate: true,
      rollbackPath: 'No runtime rollback is required for this package because no scanner-visible behavior is installed. If a future approved implementation is added, rollback must remove only that overlay module/script wiring and preserve current deterministic gates.',
      criteria: [
        { name: 'original top evidence', required: true, value: 'no_chase_or_stale_original' },
        { name: 'replacement setup', required: true, value: 'HtfDisplacementMssContinuation' },
        { name: 'replacement coverage', required: true, value: 'ready_for_replay_package' },
        { name: 'promotion mode', required: true, value: 'disabled until separate approval checkpoint' },
        { name: 'execution authority', required: true, value: '5M deterministic gates remain unchanged' },
      ],
      prohibitedChanges: [
        'Do not loosen canExecute.',
        'Do not change entry, stop, T1, T2, risk, invalidation, or target-room math.',
        'Do not change Discord posting or Supabase persistence.',
        'Do not read live bridge data or repair/write market data.',
        'Do not make HTF context execution authority.',
        'Do not broaden this to FVG, Sweep, TurtleSoup, or Intraday MSS without separate replay evidence.',
      ],
      requiredFutureProof: [
        'A separate approval checkpoint before any scanner-visible implementation.',
        'Regression tests proving livePromotionAllowedRows remains 0 until explicitly enabled.',
        'Regression tests proving Discord/Supabase/bridge/canExecute/entry-stop-target-risk behavior is unchanged.',
        'A replay comparison after implementation using the same saved report set.',
        'A rollback note naming the exact future files to remove if the overlay is rejected.',
      ],
    },
    summary: {
      simulationSelectedRows: args.htfMssSimulation?.summary.selectedRows || 0,
      simulationSelectedResolvedRows: args.htfMssSimulation?.summary.selectedResolvedRows || 0,
      simulationSelectedUnresolvedRows: args.htfMssSimulation?.summary.selectedUnresolvedRows || 0,
      simulationSelectedResolvedGrossOneMesPl: args.htfMssSimulation?.summary.selectedResolvedGrossOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'ready_for_approval_checkpoint',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved HTF-MSS-only simulation before using this proposal package.']
      : [
        'Use this as the formal handoff for a future approval-gated implementation phase.',
        'Do not install scanner-visible behavior until the approval checkpoint is explicit.',
        'Keep promotion disabled and preserve deterministic trading gates.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-live-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport({
    reportDir: options.outDir,
    htfMssSimulationPath: options.htfMssSimulation,
    htfMssSimulation: fs.existsSync(options.htfMssSimulation) ? readJson(options.htfMssSimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
