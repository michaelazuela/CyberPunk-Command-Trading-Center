import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactOpeningDriveCandidateValidationReport } from './raw-ohlc-scanner-artifact-openingdrive-candidate-validation';
import type { RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport } from './raw-ohlc-scanner-artifact-openingdrive-combined-selector';

interface CliOptions {
  candidateValidation: string;
  combinedSelector: string;
  outDir: string;
  json: boolean;
}

interface Authority {
  readOnly: true; localOnly: true; researchOnly: true; postsDiscord: false; writesSupabase: false; readsLiveSupabase: false; readsLiveBridge: false; runsSetupScanner: false; changesScannerBehavior: false; changesTradingLogic: false; changesCanExecute: false; changesEntryStopTargets: false; changesRiskRules: false; changesBridgeBehavior: false; changesDiscordPosting: false; changesAppRuntime: false;
}

export interface RawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_pivot_readiness_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: { reportDir: string; candidateValidationPath: string; combinedSelectorPath: string };
  assumptions: { savedReportsOnly: true; openingDriveOnly: true; pivotReadinessOnly: true; promotionDisabled: true; noLiveRankInstalled: true; livePromotionAllowed: false };
  summary: {
    candidateValidationDecision: string | null;
    selectorSelectedRows: number;
    selectorSelectedLosses: number;
    selectorSelectedWinners: number;
    selectorSelectedOtherResolved: number;
    selectorSelectedOneMesPl: number | null;
    selectorRejectedLosses: number;
    sampleSizeReady: boolean;
    livePromotionAllowedRows: 0;
    recommendation: 'build_fresh_openingdrive_replay_package' | 'prepare_research_only_proposal_update' | 'fix_inputs';
  };
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const MIN_READY_SELECTED_ROWS = 5;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditArgs(args = process.argv.slice(2)): CliOptions {
  const candidateValidation = readFlag(args, '--candidate-validation');
  const combinedSelector = readFlag(args, '--combined-selector');
  if (!candidateValidation) throw new Error('--candidate-validation is required.');
  if (!combinedSelector) throw new Error('--combined-selector is required.');
  return { candidateValidation, combinedSelector, outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T; }
function authority(): Authority { return { readOnly: true, localOnly: true, researchOnly: true, postsDiscord: false, writesSupabase: false, readsLiveSupabase: false, readsLiveBridge: false, runsSetupScanner: false, changesScannerBehavior: false, changesTradingLogic: false, changesCanExecute: false, changesEntryStopTargets: false, changesRiskRules: false, changesBridgeBehavior: false, changesDiscordPosting: false, changesAppRuntime: false }; }

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive Pivot Readiness Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only pivot readiness audit. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Candidate validation decision: ${report.summary.candidateValidationDecision ?? '-'}.`,
    `- Selector selected rows: ${report.summary.selectorSelectedRows}.`,
    `- Selector selected W/L/O: ${report.summary.selectorSelectedWinners}/${report.summary.selectorSelectedLosses}/${report.summary.selectorSelectedOtherResolved}.`,
    `- Selector selected one-MES P/L: ${report.summary.selectorSelectedOneMesPl ?? '-'}.`,
    `- Selector rejected losses: ${report.summary.selectorRejectedLosses}.`,
    `- Sample size ready: ${report.summary.sampleSizeReady}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport(args: {
  reportDir: string;
  candidateValidationPath: string;
  combinedSelectorPath: string;
  candidateValidation: RawOhlcScannerArtifactOpeningDriveCandidateValidationReport | null;
  combinedSelector: RawOhlcScannerArtifactOpeningDriveCombinedSelectorReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport {
  const selected = args.combinedSelector?.summary.selectedSummary;
  const rejected = args.combinedSelector?.summary.rejectedSummary;
  const sampleSizeReady = (args.combinedSelector?.summary.selectedRows || 0) >= MIN_READY_SELECTED_ROWS;
  const blockers = [
    !args.candidateValidation ? 'missing OpeningDrive candidate validation report' : null,
    args.candidateValidation && args.candidateValidation.status !== 'pass' ? `OpeningDrive candidate validation status ${args.candidateValidation.status}` : null,
    !args.combinedSelector ? 'missing OpeningDrive combined selector report' : null,
    args.combinedSelector && args.combinedSelector.status !== 'pass' ? `OpeningDrive combined selector status ${args.combinedSelector.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const cleanButThin = !blockers.length && selected?.losses === 0 && (selected?.oneMesPl ?? 0) > 0 && !sampleSizeReady;
  const ready = !blockers.length && selected?.losses === 0 && (selected?.oneMesPl ?? 0) > 0 && sampleSizeReady;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_pivot_readiness_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir: args.reportDir, candidateValidationPath: args.candidateValidationPath, combinedSelectorPath: args.combinedSelectorPath },
    assumptions: { savedReportsOnly: true, openingDriveOnly: true, pivotReadinessOnly: true, promotionDisabled: true, noLiveRankInstalled: true, livePromotionAllowed: false },
    summary: {
      candidateValidationDecision: args.candidateValidation?.summary.validationDecision || null,
      selectorSelectedRows: args.combinedSelector?.summary.selectedRows || 0,
      selectorSelectedLosses: selected?.losses || 0,
      selectorSelectedWinners: selected?.winners || 0,
      selectorSelectedOtherResolved: selected?.otherResolved || 0,
      selectorSelectedOneMesPl: selected?.oneMesPl ?? null,
      selectorRejectedLosses: rejected?.losses || 0,
      sampleSizeReady,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : ready ? 'prepare_research_only_proposal_update' : 'build_fresh_openingdrive_replay_package',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix saved OpeningDrive report inputs before using this pivot readiness audit.']
      : [
        cleanButThin
          ? 'OpeningDrive is the right pivot candidate, but the clean selector sample is too thin. Build a fresh replay package before any proposal.'
          : ready
            ? 'OpeningDrive has enough clean selected rows for a research-only proposal update, still promotion-disabled.'
            : 'OpeningDrive needs a stronger separator before any proposal update.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk changes from this audit.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport(report: RawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-pivot-readiness-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport({
    reportDir: options.outDir,
    candidateValidationPath: options.candidateValidation,
    combinedSelectorPath: options.combinedSelector,
    candidateValidation: fs.existsSync(options.candidateValidation) ? readJson(options.candidateValidation) : null,
    combinedSelector: fs.existsSync(options.combinedSelector) ? readJson(options.combinedSelector) : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDrivePivotReadinessAuditCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
