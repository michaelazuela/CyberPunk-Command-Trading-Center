import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run';

interface CliOptions {
  selectorDryRun: string;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_approval_contract';
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
    selectorDryRun: string;
    bestSelectorId: string | null;
  };
  approvalBoundary: {
    selectorIsResearchOnly: true;
    liveInstallAllowed: false;
    scannerVisibleChangeAllowed: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesDiscordPosting: false;
    changesSupabaseWrites: false;
    changesBridgeBehavior: false;
    requiresSeparateLiveProposalBeforeInstall: true;
  };
  summary: {
    bestSelectorId: string | null;
    bestSelectedOneMesPl: number | null;
    keepAllOneMesPl: number | null;
    replaceAllOneMesPl: number | null;
    deltaVsKeepAllOneMesPl: number | null;
    deltaVsReplaceAllOneMesPl: number | null;
    approvalBoundaryClean: boolean;
    livePromotionAllowedRows: 0;
    proposalReady: false;
    recommendation: 'selector_contract_ready_for_live_proposal_phase' | 'selector_contract_rejected' | 'fix_inputs';
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

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  return fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const selectorDryRun = readFlag(argv, '--selector-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-\d+\.json$/);
  if (!selectorDryRun) throw new Error('--selector-dry-run is required.');
  return {
    selectorDryRun: path.resolve(selectorDryRun),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport['authority'] {
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

function approvalBoundary(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport['approvalBoundary'] {
  return {
    selectorIsResearchOnly: true,
    liveInstallAllowed: false,
    scannerVisibleChangeAllowed: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesDiscordPosting: false,
    changesSupabaseWrites: false,
    changesBridgeBehavior: false,
    requiresSeparateLiveProposalBeforeInstall: true,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval-boundary contract. It does not install selector behavior.',
    '',
    '## Summary',
    `- Best selector: ${report.summary.bestSelectorId ?? '-'}.`,
    `- Selected / keep-all / replace-all P/L: ${report.summary.bestSelectedOneMesPl ?? '-'} / ${report.summary.keepAllOneMesPl ?? '-'} / ${report.summary.replaceAllOneMesPl ?? '-'}.`,
    `- Delta vs keep-all / replace-all: ${report.summary.deltaVsKeepAllOneMesPl ?? '-'} / ${report.summary.deltaVsReplaceAllOneMesPl ?? '-'}.`,
    `- Approval boundary clean: ${report.summary.approvalBoundaryClean}.`,
    `- Proposal ready: ${report.summary.proposalReady}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Locked Boundary',
    `- Live install allowed: ${report.approvalBoundary.liveInstallAllowed}.`,
    `- Scanner-visible change allowed: ${report.approvalBoundary.scannerVisibleChangeAllowed}.`,
    `- Changes canExecute: ${report.approvalBoundary.changesCanExecute}.`,
    `- Changes entry/stop/targets/risk: ${report.approvalBoundary.changesEntryStopTargets || report.approvalBoundary.changesRiskRules}.`,
    `- Changes Discord/Supabase/bridge: ${report.approvalBoundary.changesDiscordPosting || report.approvalBoundary.changesSupabaseWrites || report.approvalBoundary.changesBridgeBehavior}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport(args: {
  selectorDryRunPath: string;
  selectorDryRun: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport {
  const boundary = approvalBoundary();
  const best = args.selectorDryRun?.selectors.find((row) => row.selectorId === args.selectorDryRun?.summary.bestSelectorId) || null;
  const deltaVsKeepAllOneMesPl = best?.deltaVsKeepAllOneMesPl ?? null;
  const deltaVsReplaceAllOneMesPl = best?.deltaVsReplaceAllOneMesPl ?? null;
  const approvalBoundaryClean = Object.entries(boundary)
    .filter(([key]) => key.startsWith('changes'))
    .every(([, value]) => value === false) &&
    boundary.liveInstallAllowed === false &&
    boundary.scannerVisibleChangeAllowed === false;
  const blockers = [
    !args.selectorDryRun ? 'missing selector dry-run report' : null,
    args.selectorDryRun && args.selectorDryRun.status !== 'pass' ? `selector dry-run status ${args.selectorDryRun.status}` : null,
    !best ? 'best selector row not found' : null,
    best && (deltaVsKeepAllOneMesPl ?? 0) <= 0 ? 'best selector does not beat keep-all' : null,
    best && (deltaVsReplaceAllOneMesPl ?? 0) <= 0 ? 'best selector does not beat replace-all' : null,
    !approvalBoundaryClean ? 'approval boundary is not clean' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport['summary']['recommendation'] = blockers.length
    ? 'selector_contract_rejected'
    : 'selector_contract_ready_for_live_proposal_phase';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      selectorDryRun: args.selectorDryRunPath,
      bestSelectorId: args.selectorDryRun?.summary.bestSelectorId || null,
    },
    approvalBoundary: boundary,
    summary: {
      bestSelectorId: best?.selectorId || null,
      bestSelectedOneMesPl: best?.selectedOneMesPl ?? null,
      keepAllOneMesPl: best?.keepAllOneMesPl ?? null,
      replaceAllOneMesPl: best?.replaceAllOneMesPl ?? null,
      deltaVsKeepAllOneMesPl: deltaVsKeepAllOneMesPl === null ? null : round(deltaVsKeepAllOneMesPl),
      deltaVsReplaceAllOneMesPl: deltaVsReplaceAllOneMesPl === null ? null : round(deltaVsReplaceAllOneMesPl),
      approvalBoundaryClean,
      livePromotionAllowedRows: 0,
      proposalReady: false,
      recommendation,
    },
    blockers,
    recommendations: recommendation === 'selector_contract_ready_for_live_proposal_phase'
      ? [
        'The selector has enough research evidence for a separate live-proposal phase, not for direct installation.',
        'A future proposal must prove scanner-visible ranking changes without touching canExecute, Discord, Supabase, bridge, entry, stop, target, or risk behavior.',
      ]
      : ['Do not proceed to a live proposal until contract blockers are resolved.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorApprovalContractReport({
    selectorDryRunPath: options.selectorDryRun,
    selectorDryRun: readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunReport>(options.selectorDryRun),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
