import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-live-proposal';
import type {
  RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-separator-miner';

interface CliOptions {
  separatorMiner: string;
  combinedLiveProposal: string | null;
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

interface GuardGate {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_no_promotion_guard';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    separatorMinerPath: string;
    combinedLiveProposalPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    guardOnly: true;
    lowRiskBroadPromotionDisallowed: true;
    lowRiskExclusionDisallowedWithAvailableFields: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  decision: {
    lowRiskBroadPromotion: 'blocked';
    lowRiskExclusion: 'blocked';
    lowRiskAllowedUse: 'research_context_only';
    preserveProposalLineage: 'combined_clean_pocket_without_low_risk_selector';
  };
  summary: {
    startingWinners: number;
    startingLosses: number;
    zeroWinnerCostLiveUsableScenarios: number;
    combinedProposalIncludesLowRisk: boolean;
    failedGateCount: number;
    livePromotionAllowedRows: 0;
    recommendation: 'preserve_no_promotion_guard' | 'fix_inputs';
  };
  gates: GuardGate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const LOW_RISK_SELECTOR = 'low_risk_lt_4';

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

export function parseRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const separatorMiner = readFlag(args, '--separator-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-low-risk-loss-separator-miner-\d+\.json$/);
  const combinedLiveProposal = readFlag(args, '--combined-live-proposal') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-live-proposal-\d+\.json$/);
  if (!separatorMiner) throw new Error('--separator-miner is required.');
  return { separatorMiner, combinedLiveProposal, outDir, json: args.includes('--json') };
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

function gate(name: string, passed: boolean, detail: string): GuardGate {
  return { name, passed, detail };
}

function proposalIncludesLowRisk(proposal: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport | null): boolean {
  return Boolean(proposal?.proposedBehavior.selectors.some((selector) => selector.includes(LOW_RISK_SELECTOR) || selector.includes('risk_lt_4')));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport, 'markdown'>): string {
  return [
    '# OpeningDrive Low-Risk No-Promotion Guard',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only guard artifact. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Decision',
    `- Low-risk broad promotion: ${report.decision.lowRiskBroadPromotion}.`,
    `- Low-risk exclusion: ${report.decision.lowRiskExclusion}.`,
    `- Allowed use: ${report.decision.lowRiskAllowedUse}.`,
    `- Preserve lineage: ${report.decision.preserveProposalLineage}.`,
    '',
    '## Summary',
    `- Starting W/L: ${report.summary.startingWinners}/${report.summary.startingLosses}.`,
    `- Zero-winner-cost live-usable scenarios: ${report.summary.zeroWinnerCostLiveUsableScenarios}.`,
    `- Combined proposal includes low-risk: ${report.summary.combinedProposalIncludesLowRisk}.`,
    `- Failed gates: ${report.summary.failedGateCount}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Gates',
    '| Gate | Passed | Detail |',
    '|---|---|---|',
    ...report.gates.map((item) => `| ${item.name} | ${item.passed} | ${item.detail} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport(args: {
  separatorMinerPath: string;
  separatorMiner: RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport | null;
  combinedLiveProposalPath?: string | null;
  combinedLiveProposal?: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport {
  const miner = args.separatorMiner;
  const proposal = args.combinedLiveProposal || null;
  const includesLowRisk = proposalIncludesLowRisk(proposal);
  const gates = [
    gate('separator_miner_passed', miner?.status === 'pass', `separator miner status ${miner?.status ?? 'missing'}`),
    gate('separator_miner_rejects_low_risk_filter', miner?.summary.recommendation === 'do_not_filter_low_risk_with_available_fields', `separator recommendation ${miner?.summary.recommendation ?? 'missing'}`),
    gate('no_zero_winner_cost_live_usable_separator', miner?.summary.zeroWinnerCostLiveUsableScenarios === 0, `zero-winner-cost live scenarios ${miner?.summary.zeroWinnerCostLiveUsableScenarios ?? 'missing'}`),
    gate('low_risk_has_loss_residue', Boolean(miner && miner.summary.startingLosses > 0), `starting losses ${miner?.summary.startingLosses ?? 'missing'}`),
    gate('low_risk_live_promotion_zero', miner?.summary.livePromotionAllowedRows === 0, `live promotion rows ${miner?.summary.livePromotionAllowedRows ?? 'missing'}`),
    gate('combined_proposal_excludes_low_risk', !includesLowRisk, `combined proposal includes low-risk ${includesLowRisk}`),
  ];
  const failedGateCount = gates.filter((item) => !item.passed).length;
  const blockers = [
    !miner ? 'missing low-risk separator miner report' : null,
    ...gates.filter((item) => !item.passed).map((item) => `gate failed: ${item.name} (${item.detail})`),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_no_promotion_guard',
    generatedAt,
    status: failedGateCount === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: {
      separatorMinerPath: args.separatorMinerPath,
      combinedLiveProposalPath: args.combinedLiveProposalPath || null,
    },
    assumptions: {
      savedReportsOnly: true,
      guardOnly: true,
      lowRiskBroadPromotionDisallowed: true,
      lowRiskExclusionDisallowedWithAvailableFields: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    decision: {
      lowRiskBroadPromotion: 'blocked',
      lowRiskExclusion: 'blocked',
      lowRiskAllowedUse: 'research_context_only',
      preserveProposalLineage: 'combined_clean_pocket_without_low_risk_selector',
    },
    summary: {
      startingWinners: miner?.summary.startingWinners || 0,
      startingLosses: miner?.summary.startingLosses || 0,
      zeroWinnerCostLiveUsableScenarios: miner?.summary.zeroWinnerCostLiveUsableScenarios || 0,
      combinedProposalIncludesLowRisk: includesLowRisk,
      failedGateCount,
      livePromotionAllowedRows: 0,
      recommendation: failedGateCount === 0 ? 'preserve_no_promotion_guard' : 'fix_inputs',
    },
    gates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved guard inputs before relying on the low-risk no-promotion decision.']
      : [
        'Do not promote low-risk broadly with the available fields.',
        'Do not install a low-risk exclusion; available live-usable separators reject too many winners.',
        'Keep low-risk as research context only unless a future independent approval chain proves a cleaner live-usable separator.',
        'Preserve the combined clean-pocket proposal lineage without adding low_risk_lt_4 to scanner-visible selectors.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport(
  report: RawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-low-risk-no-promotion-guard-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardArgs(args);
  const proposalPath = options.combinedLiveProposal;
  const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport({
    separatorMinerPath: options.separatorMiner,
    separatorMiner: fs.existsSync(options.separatorMiner)
      ? readJson<RawOhlcScannerArtifactOpeningDriveLowRiskLossSeparatorMinerReport>(options.separatorMiner)
      : null,
    combinedLiveProposalPath: proposalPath,
    combinedLiveProposal: proposalPath && fs.existsSync(proposalPath)
      ? readJson<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketLiveProposalReport>(proposalPath)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, decision: report.decision, summary: report.summary, gates: report.gates, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveLowRiskNoPromotionGuardCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
