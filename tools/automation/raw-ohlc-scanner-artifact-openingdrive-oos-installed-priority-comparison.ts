import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook } from '../../src/lib/unifiedDeskCandidateBook';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../../src/types';
import type {
  RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-broader-priority-validation';

interface CliOptions {
  validation: string;
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

interface InstalledComparisonRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  prioritySetupType: string;
  installedPrimarySetupType: string | null;
  installedPrimaryTicketId: string | null;
  installedSelectedPriority: boolean;
  canExecuteTrueRows: number;
  approvalBoundaryClean: boolean;
  openingDriveScore: number | null;
  priorityScore: number | null;
}

export interface RawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_installed_priority_comparison';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    validationPath: string;
  };
  summary: {
    comparableEvents: number;
    installedPrioritySelectedRows: number;
    installedOpeningDriveSelectedRows: number;
    canExecuteTrueRows: number;
    approvalBoundaryDriftRows: number;
    proposalDeltaOneMesPl: number | null;
    proposalPriorityLosses: number;
    recommendation: 'installed_overlay_matches_oos_priority_proposal' | 'keep_researching_installed_overlay';
    livePromotionAllowedRows: 0;
  };
  rows: InstalledComparisonRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const validation = readFlag(args, '--validation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-broader-priority-validation-\d+\.json$/);
  if (!validation) throw new Error('--validation is required.');
  return { validation, outDir, json: args.includes('--json') };
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

function setupTypeFrom(value: string): SetupType {
  return (Object.values(SetupType) as string[]).includes(value) ? value as SetupType : SetupType.NoSetup;
}

function candidate(args: {
  setupType: SetupType;
  ticketId: string;
  direction: string;
  score: number;
  proofTime: string;
}): SetupCandidate {
  const direction = args.direction === 'SHORT' ? 'SHORT' : 'LONG';
  return {
    setupType: args.setupType,
    scenarioLabel: args.ticketId,
    direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'High',
    priority: args.score,
    entry: 100,
    stop: direction === 'LONG' ? 96 : 104,
    target1: direction === 'LONG' ? 106 : 94,
    target2: direction === 'LONG' ? 108 : 92,
    riskPoints: 4,
    modelConfidenceScore: args.score,
    decisionQualityScore: args.score,
    evidence: [`Completed 5M proof reference ${args.proofTime}.`],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M retest/re-entry proof confirmed.',
    nextAction: 'Installed OOS priority comparison only; no live execution authority.',
    reducedRiskPlan: null,
  };
}

function ticketFromCandidateKey(candidateKey: string | undefined | null): string | null {
  if (!candidateKey) return null;
  return candidateKey.split('|')[1] || null;
}

function sessionType(session: string): 'replay_morning' | 'replay_lunch' | 'replay_evening' {
  if (session === 'lunch') return 'replay_lunch';
  if (session === 'evening') return 'replay_evening';
  return 'replay_morning';
}

function buildRows(validation: RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport): InstalledComparisonRow[] {
  return validation.rows.map((row) => {
    const openingDrive = candidate({
      setupType: SetupType.OpeningDriveFvgContinuation,
      ticketId: row.openingDriveTicketId,
      direction: row.direction,
      score: 95,
      proofTime: row.proofTime,
    });
    const priority = candidate({
      setupType: setupTypeFrom(row.prioritySetupType),
      ticketId: row.priorityTicketId,
      direction: row.direction,
      score: 88,
      proofTime: row.proofTime,
    });
    const book = buildUnifiedDeskCandidateBook({
      sessionType: sessionType(row.session),
      completedBarTime: row.proofTime,
      candidates: [openingDrive, priority],
    });
    const openingDriveItem = book.candidates.find((item) => item.setupType === SetupType.OpeningDriveFvgContinuation);
    const priorityItem = book.candidates.find((item) => item.candidateKey.includes(row.priorityTicketId));
    const primary = book.primaryDeskIdea;
    const canExecuteTrueRows = book.candidates.filter((item) => item.canExecute).length;
    const approvalBoundaryClean = book.approvalBoundary.changesCanExecute === false &&
      book.approvalBoundary.changesEntryStopTargets === false &&
      book.approvalBoundary.changesRiskRules === false &&
      book.approvalBoundary.postsDiscord === false &&
      book.approvalBoundary.writesSupabase === false;
    return {
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      openingDriveTicketId: row.openingDriveTicketId,
      priorityTicketId: row.priorityTicketId,
      prioritySetupType: row.prioritySetupType,
      installedPrimarySetupType: primary?.setupType || null,
      installedPrimaryTicketId: ticketFromCandidateKey(primary?.candidateKey),
      installedSelectedPriority: primary?.candidateKey.includes(row.priorityTicketId) || false,
      canExecuteTrueRows,
      approvalBoundaryClean,
      openingDriveScore: openingDriveItem?.score ?? null,
      priorityScore: priorityItem?.score ?? null,
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport, 'markdown'>): string {
  return [
    '# OpeningDrive OOS Installed Priority Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only installed priority comparison. It reads saved OOS validation rows and calls the installed candidate-book ranking path only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Comparable events: ${report.summary.comparableEvents}.`,
    `- Installed priority / OpeningDrive selected rows: ${report.summary.installedPrioritySelectedRows}/${report.summary.installedOpeningDriveSelectedRows}.`,
    `- canExecute=true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Approval boundary drift rows: ${report.summary.approvalBoundaryDriftRows}.`,
    `- Proposal delta: ${report.summary.proposalDeltaOneMesPl ?? '-'}.`,
    `- Proposal priority losses: ${report.summary.proposalPriorityLosses}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport(args: {
  validationPath: string;
  validation: RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport {
  const validation = args.validation;
  const rows = validation ? buildRows(validation) : [];
  const canExecuteTrueRows = rows.reduce((sum, row) => sum + row.canExecuteTrueRows, 0);
  const approvalBoundaryDriftRows = rows.filter((row) => !row.approvalBoundaryClean).length;
  const installedPrioritySelectedRows = rows.filter((row) => row.installedSelectedPriority).length;
  const installedOpeningDriveSelectedRows = rows.length - installedPrioritySelectedRows;
  const blockers = [
    !validation ? 'missing broader priority validation report' : null,
    validation && validation.status !== 'pass' ? `broader priority validation status ${validation.status}` : null,
    rows.length === 0 ? 'no comparable validation rows' : null,
    installedOpeningDriveSelectedRows !== 0 ? `${installedOpeningDriveSelectedRows} rows still select OpeningDrive over priority candidate` : null,
    canExecuteTrueRows !== 0 ? `${canExecuteTrueRows} canExecute=true rows found` : null,
    approvalBoundaryDriftRows !== 0 ? `${approvalBoundaryDriftRows} rows changed approval boundary` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport['summary']['recommendation'] = blockers.length
    ? 'keep_researching_installed_overlay'
    : 'installed_overlay_matches_oos_priority_proposal';
  const base: Omit<RawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_installed_priority_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { validationPath: args.validationPath },
    summary: {
      comparableEvents: rows.length,
      installedPrioritySelectedRows,
      installedOpeningDriveSelectedRows,
      canExecuteTrueRows,
      approvalBoundaryDriftRows,
      proposalDeltaOneMesPl: validation?.summary.deltaOneMesPl ?? null,
      proposalPriorityLosses: validation?.summary.priorityLosses ?? 0,
      recommendation,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: recommendation === 'installed_overlay_matches_oos_priority_proposal'
      ? [
        'Installed candidate-book overlay reproduces the OOS same-event priority selection.',
        'Next phase should run a fresh read-only scanner-artifact selection comparison using saved artifacts only; do not touch tradeDecisionPipeline, Discord, Supabase, bridge behavior, or execution gates.',
      ]
      : ['Keep the installed overlay under review and do not broaden it until blockers are resolved.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-oos-installed-priority-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonArgs();
  const report = buildRawOhlcScannerArtifactOpeningDriveOosInstalledPriorityComparisonReport({
    validationPath: options.validation,
    validation: fs.existsSync(options.validation)
      ? readJson<RawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport>(options.validation)
      : null,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
