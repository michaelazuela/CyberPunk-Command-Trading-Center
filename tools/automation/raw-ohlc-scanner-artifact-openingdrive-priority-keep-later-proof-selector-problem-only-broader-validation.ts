import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type Recommendation = 'reject_problem_only_combos_for_runtime' | 'validate_surviving_combos_on_fresh_artifacts' | 'fix_inputs';

interface MinerCombo {
  featureCombo: string;
  verdict: 'clean_problem_only_candidate' | 'contaminated_by_winners_or_mixed_groups';
  matchedProblemOnlyGroups: number;
}

interface MinerReport {
  status?: string;
  featureCombos?: MinerCombo[];
}

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  riskPoints: number;
  barsAfterProof: number;
  resolvedOneMesPl: number | null;
}

interface OutcomeReport {
  status?: string;
  rows?: OutcomeRow[];
}

interface ComboValidationRow {
  featureCombo: string;
  supported: boolean;
  unsupportedFields: string[];
  matchedRows: number;
  matchedWinnerRows: number;
  matchedProblemRows: number;
  matchedUnresolvedRows: number;
  matchedGrossResolvedOneMesPl: number;
  winnerContaminated: boolean;
  unresolvedContaminated: boolean;
  verdict: 'unsupported_on_broader_source' | 'survives_broader_validation' | 'fails_broader_validation';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_problem_only_broader_validation';
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
    minerPath: string | null;
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    validatesOnlySupportedProofTimeFields: true;
    unsupportedRowCountCombosAreNotInferred: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    broaderOutcomeRows: number;
    cleanMinerCombosRead: number;
    supportedCombos: number;
    unsupportedCombos: number;
    survivingCombos: number;
    failedCombos: number;
    topSurvivingCombo: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: Recommendation;
  };
  comboValidations: ComboValidationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SUPPORTED_FIELDS = new Set(['session', 'direction', 'riskBucket', 'proofWindow']);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function riskBucket(value: number): string {
  if (value < 10) return 'risk_lt_10';
  if (value < 15) return 'risk_10_to_15';
  if (value < 20) return 'risk_15_to_20';
  if (value < 25) return 'risk_20_to_25';
  return 'risk_gte_25';
}

function proofWindow(value: string): string {
  const hours = Number(value.slice(11, 13));
  const minutes = Number(value.slice(14, 16));
  const total = hours * 60 + minutes;
  if (!Number.isFinite(total)) return 'proof_unknown';
  if (total < 10 * 60) return 'proof_before_10';
  if (total < 12 * 60) return 'proof_10_to_12';
  if (total < 14 * 60) return 'proof_12_to_14';
  if (total < 15 * 60) return 'proof_14_to_15';
  return 'proof_after_15';
}

function featureValue(row: OutcomeRow, field: string): string {
  if (field === 'session') return row.session;
  if (field === 'direction') return row.direction;
  if (field === 'riskBucket') return riskBucket(row.riskPoints);
  if (field === 'proofWindow') return proofWindow(row.proofTime);
  return 'unsupported';
}

function parseCombo(combo: string): { field: string; value: string }[] {
  return combo.split('&').map((part) => {
    const [field, value] = part.split('=');
    return { field, value };
  });
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Problem-Only Combo Broader Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-outcome validation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Broader outcome rows: ${report.summary.broaderOutcomeRows}.`,
    `- Clean miner combos read: ${report.summary.cleanMinerCombosRead}.`,
    `- Supported/unsupported combos: ${report.summary.supportedCombos}/${report.summary.unsupportedCombos}.`,
    `- Surviving/failed combos: ${report.summary.survivingCombos}/${report.summary.failedCombos}.`,
    `- Top surviving combo: ${report.summary.topSurvivingCombo || 'none'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport(args: {
  reportDir?: string;
  minerPath?: string | null;
  outcomePath?: string | null;
  miner?: MinerReport | null;
  outcome?: OutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const minerPath = args.minerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-problem-only-quality-miner-');
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const miner = args.miner ?? readJson<MinerReport>(minerPath);
  const outcome = args.outcome ?? readJson<OutcomeReport>(outcomePath);
  const rows = outcome?.rows || [];
  const cleanCombos = (miner?.featureCombos || []).filter((combo) => combo.verdict === 'clean_problem_only_candidate');
  const comboValidations: ComboValidationRow[] = cleanCombos.map((combo): ComboValidationRow => {
    const parsed = parseCombo(combo.featureCombo);
    const unsupportedFields = parsed.map((part) => part.field).filter((field) => !SUPPORTED_FIELDS.has(field));
    if (unsupportedFields.length) {
      return {
        featureCombo: combo.featureCombo,
        supported: false,
        unsupportedFields,
        matchedRows: 0,
        matchedWinnerRows: 0,
        matchedProblemRows: 0,
        matchedUnresolvedRows: 0,
        matchedGrossResolvedOneMesPl: 0,
        winnerContaminated: false,
        unresolvedContaminated: false,
        verdict: 'unsupported_on_broader_source',
      };
    }
    const matchedRows = rows.filter((row) => parsed.every((part) => featureValue(row, part.field) === part.value));
    const matchedWinnerRows = matchedRows.filter(isWinner).length;
    const matchedProblemRows = matchedRows.filter(isProblem).length;
    const matchedUnresolvedRows = matchedRows.filter((row) => row.outcomeStatus === 'unresolved').length;
    const gross = matchedRows.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0);
    const winnerContaminated = matchedWinnerRows > 0;
    const unresolvedContaminated = matchedUnresolvedRows > 0;
    const verdict: ComboValidationRow['verdict'] = matchedRows.length > 0 && !winnerContaminated && !unresolvedContaminated
      ? 'survives_broader_validation'
      : 'fails_broader_validation';
    return {
      featureCombo: combo.featureCombo,
      supported: true,
      unsupportedFields: [],
      matchedRows: matchedRows.length,
      matchedWinnerRows,
      matchedProblemRows,
      matchedUnresolvedRows,
      matchedGrossResolvedOneMesPl: Math.round(gross * 100) / 100,
      winnerContaminated,
      unresolvedContaminated,
      verdict,
    };
  }).sort((a, b) => (
    Number(b.verdict === 'survives_broader_validation') - Number(a.verdict === 'survives_broader_validation')
    || b.matchedProblemRows - a.matchedProblemRows
    || a.featureCombo.localeCompare(b.featureCombo)
  ));
  const blockers = [
    !minerPath ? 'missing problem-only quality miner report path' : null,
    !outcomePath ? 'missing broader outcome report path' : null,
    !miner ? 'missing problem-only quality miner report' : null,
    !outcome ? 'missing broader outcome report' : null,
    miner && miner.status !== 'pass' ? `problem-only quality miner status ${miner.status}` : null,
    outcome && outcome.status !== 'pass' ? `broader outcome status ${outcome.status}` : null,
    cleanCombos.length === 0 ? 'quality miner has no clean problem-only combos' : null,
    rows.length === 0 ? 'broader outcome report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const supportedCombos = comboValidations.filter((row) => row.supported);
  const surviving = comboValidations.filter((row) => row.verdict === 'survives_broader_validation');
  const recommendation: Recommendation = blockers.length
    ? 'fix_inputs'
    : surviving.length
      ? 'validate_surviving_combos_on_fresh_artifacts'
      : 'reject_problem_only_combos_for_runtime';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_problem_only_broader_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, minerPath, outcomePath },
    assumptions: {
      savedReportsOnly: true,
      validatesOnlySupportedProofTimeFields: true,
      unsupportedRowCountCombosAreNotInferred: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      broaderOutcomeRows: rows.length,
      cleanMinerCombosRead: cleanCombos.length,
      supportedCombos: supportedCombos.length,
      unsupportedCombos: comboValidations.length - supportedCombos.length,
      survivingCombos: surviving.length,
      failedCombos: supportedCombos.filter((row) => row.verdict === 'fails_broader_validation').length,
      topSurvivingCombo: surviving[0]?.featureCombo || null,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation,
    },
    comboValidations: comboValidations.slice(0, 50),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved-report inputs before broader validation.']
      : surviving.length
        ? [
          'Keep surviving combos research-only and validate on fresh scanner artifacts before any scanner-visible penalty.',
          'Do not remove raidReclaim, Sweep, canExecute, or approved model gates from this evidence.',
        ]
        : [
          'Reject current problem-only combos for runtime use; broader validation shows winner/unresolved contamination or unsupported fields.',
          'Broaden source fields or mine a different separator before proposing live-facing behavior.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport({
    reportDir,
    minerPath: readFlag(args, '--miner') || undefined,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-problem-only-broader-validation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
