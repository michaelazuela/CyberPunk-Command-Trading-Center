import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook } from '../../src/lib/unifiedDeskCandidateBook';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../../src/types';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport,
} from './unified-positive-held-local-preview-model-family-broad-replay';

type ReplayRow = UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport['rows'][number];

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  executionStatus: string;
  blockReason: string | null;
  modelPriority: number;
  proofPriority: number;
  triageScore: number;
}

interface AuditRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: ReplayRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  installedState: string | null;
  installedRank: number | null;
  installedScore: number | null;
  canExecute: boolean | null;
  invalidStopSweepPenaltyCandidate: boolean;
  validSameSlateRows: number;
  validSameSlateRowsAbove: number;
  primaryDeskIdea: boolean;
  entryPreserved: boolean;
  stopPreserved: boolean;
  target1Preserved: boolean;
  target2Preserved: boolean;
  riskPreserved: boolean;
}

interface SlateAudit {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  invalidStopSweepRows: number;
  validRows: number;
  primaryRowId: string | null;
  primarySetupType: string | null;
  primaryInvalidStopSweep: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport {
  reportType: 'unified_positive_held_local_preview_model_family_installed_penalty_audit';
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
    modelFamilyBroadReplayPath: string | null;
    intakeTriagePath: string | null;
  };
  assumptions: {
    readsSavedDiagnosticsOnly: true;
    usesInstalledUnifiedDeskCandidateBookScoring: true;
    invalidStopSweepRowsMustRemainBlocked: true;
    outcomesUsedOnlyForAuditLabels: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    replayRowsRead: number;
    auditedRows: number;
    slates: number;
    invalidStopSweepRows: number;
    invalidStopSweepRowsBlocked: number;
    invalidStopSweepCanExecuteTrueRows: number;
    invalidStopSweepPrimaryRows: number;
    invalidStopSweepRowsWithValidAlternativeAbove: number;
    entryStopTargetRiskDriftRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'installed_penalty_protects_selection_continue_builder_source_audit'
      | 'installed_penalty_insufficient_keep_research_only'
      | 'fix_missing_input_reports';
  };
  slates: SlateAudit[];
  rows: AuditRow[];
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
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport['authority'] {
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

function readIntakeRows(report: Record<string, unknown> | null): IntakeRow[] {
  return Array.isArray(report?.rows) ? report.rows as IntakeRow[] : [];
}

function setupTypeFrom(value: string): SetupType {
  return (Object.values(SetupType) as string[]).includes(value) ? value as SetupType : SetupType.NoSetup;
}

function executionStatusFrom(value: string): ExecutionStatus {
  return (Object.values(ExecutionStatus) as string[]).includes(value) ? value as ExecutionStatus : ExecutionStatus.Conditional;
}

function blockReasonFrom(value: string | null | undefined): NoTradeReason | null {
  return value && (Object.values(NoTradeReason) as string[]).includes(value) ? value as NoTradeReason : null;
}

function candidateFrom(row: ReplayRow, intake: IntakeRow | undefined): SetupCandidate {
  return {
    setupType: setupTypeFrom(row.setupType),
    scenarioLabel: row.rowId,
    direction: row.direction === 'SHORT' ? 'SHORT' : row.direction === 'LONG' ? 'LONG' : 'NO TRADE',
    detectedStatus: row.outcomeBucket === 'blocked' ? SetupCandidateStatus.Blocked : SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: intake?.modelPriority ?? 50,
    entry: intake?.entry ?? null,
    stop: intake?.stop ?? null,
    target1: intake?.target1 ?? null,
    target2: intake?.target2 ?? null,
    riskPoints: intake?.riskPoints ?? row.riskPoints,
    modelConfidenceScore: intake?.modelPriority ?? null,
    decisionQualityScore: intake?.triageScore ?? intake?.proofPriority ?? null,
    evidence: [`Saved broad replay audit row ${row.rowId}.`],
    missingEvidence: blockReasonFrom(intake?.blockReason) ? [intake?.blockReason as string] : [],
    executionStatus: executionStatusFrom(intake?.executionStatus || (row.outcomeBucket === 'blocked' ? 'Blocked' : 'Conditional')),
    blockReason: blockReasonFrom(intake?.blockReason),
    requiredTrigger: intake?.blockReason === 'EntryTriggerPending' ? 'Wait for completed 5M proof.' : null,
    nextAction: 'Installed penalty audit only; no live execution authority.',
    reducedRiskPlan: null,
  };
}

function candidateKey(row: ReplayRow, intake: IntakeRow | undefined, index: number): string {
  const line = Number.isFinite(Number(intake?.entry)) ? Number(intake?.entry).toFixed(2) : 'no-line';
  return `${row.setupType}|${row.rowId}|${row.direction}|${line}|${index}`;
}

function isInvalidStopSweep(row: ReplayRow, intake: IntakeRow | undefined): boolean {
  return row.setupType === 'NoInstalledSetup' &&
    (intake?.executionStatus || '') === 'Blocked' &&
    (intake?.blockReason || '') === 'InvalidStopLocation';
}

function buildAudit(args: {
  replayRows: ReplayRow[];
  intakeRows: IntakeRow[];
}): { rows: AuditRow[]; slates: SlateAudit[] } {
  const intakeById = new Map(args.intakeRows.map((row) => [row.intakeId, row]));
  const slates = new Map<string, ReplayRow[]>();
  for (const row of args.replayRows) {
    const key = `${row.tradeDate}|${row.session}`;
    slates.set(key, [...(slates.get(key) || []), row]);
  }

  const auditRows: AuditRow[] = [];
  const slateRows: SlateAudit[] = [];
  for (const [slateId, rows] of slates) {
    const candidates = rows.map((row) => candidateFrom(row, intakeById.get(row.rowId)));
    const book = buildUnifiedDeskCandidateBook({
      sessionType: rows[0]?.session === 'lunch' ? 'replay_lunch' : 'replay_morning',
      candidates,
    });
    const itemByKey = new Map(book.candidates.map((item) => [item.candidateKey, item]));
    const invalidRows = rows.filter((row) => isInvalidStopSweep(row, intakeById.get(row.rowId)));
    const primary = book.primaryDeskIdea;
    const [tradeDate, session] = slateId.split('|');
    slateRows.push({
      slateId,
      tradeDate,
      session,
      rows: rows.length,
      invalidStopSweepRows: invalidRows.length,
      validRows: rows.length - invalidRows.length,
      primaryRowId: primary?.sourceCandidate.scenarioLabel || null,
      primarySetupType: primary?.setupType || null,
      primaryInvalidStopSweep: Boolean(primary && primary.setupType === SetupType.NoSetup && primary.sourceCandidate.blockReason === NoTradeReason.InvalidStopLocation),
    });
    rows.forEach((row, index) => {
      const intake = intakeById.get(row.rowId);
      const key = candidateKey(row, intake, index);
      const item = itemByKey.get(key) || null;
      const invalidStopSweepPenaltyCandidate = isInvalidStopSweep(row, intake);
      const validSameSlateRows = book.candidates.filter((candidate) => (
        candidate.candidateKey !== key &&
        candidate.state !== 'blocked' &&
        candidate.state !== 'no_trade' &&
        candidate.entry !== null &&
        candidate.stop !== null &&
        candidate.target1 !== null &&
        candidate.target2 !== null
      ));
      auditRows.push({
        rowId: row.rowId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        installedState: item?.state || null,
        installedRank: item?.rank || null,
        installedScore: item?.score || null,
        canExecute: item?.canExecute ?? null,
        invalidStopSweepPenaltyCandidate,
        validSameSlateRows: validSameSlateRows.length,
        validSameSlateRowsAbove: item ? validSameSlateRows.filter((candidate) => candidate.rank < item.rank).length : 0,
        primaryDeskIdea: primary?.candidateKey === key,
        entryPreserved: (item?.entry ?? null) === (intake?.entry ?? null),
        stopPreserved: (item?.stop ?? null) === (intake?.stop ?? null),
        target1Preserved: (item?.target1 ?? null) === (intake?.target1 ?? null),
        target2Preserved: (item?.target2 ?? null) === (intake?.target2 ?? null),
        riskPreserved: (item?.riskPoints ?? null) === (intake?.riskPoints ?? row.riskPoints ?? null),
      });
    });
  }
  return {
    rows: auditRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.rowId.localeCompare(b.rowId)),
    slates: slateRows.sort((a, b) => a.slateId.localeCompare(b.slateId)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Model-Family Installed Penalty Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only audit through installed unified desk candidate book scoring. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, install filters, remove models, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Replay rows read: ${report.summary.replayRowsRead}.`,
    `- Audited rows: ${report.summary.auditedRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Invalid-stop Sweep rows: ${report.summary.invalidStopSweepRows}.`,
    `- Invalid-stop Sweep rows blocked: ${report.summary.invalidStopSweepRowsBlocked}.`,
    `- Invalid-stop Sweep canExecute=true rows: ${report.summary.invalidStopSweepCanExecuteTrueRows}.`,
    `- Invalid-stop Sweep primary rows: ${report.summary.invalidStopSweepPrimaryRows}.`,
    `- Invalid-stop Sweep rows with valid alternative above: ${report.summary.invalidStopSweepRowsWithValidAlternativeAbove}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Invalid Sweep Rows',
    '| Date | Session | Direction | State | Rank | Score | Valid Alternatives Above | Primary |',
    '|---|---|---|---|---:|---:|---:|---|',
    ...report.rows
      .filter((row) => row.invalidStopSweepPenaltyCandidate)
      .map((row) => `| ${row.tradeDate} | ${row.session} | ${row.direction} | ${row.installedState || '-'} | ${row.installedRank ?? '-'} | ${row.installedScore ?? '-'} | ${row.validSameSlateRowsAbove} | ${row.primaryDeskIdea ? 'yes' : 'no'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${escapeTable(item)}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport(args: {
  reportDir: string;
  modelFamilyBroadReplayPath: string | null;
  modelFamilyBroadReplayReport: UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: Record<string, unknown> | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport {
  const replayRows = args.modelFamilyBroadReplayReport?.rows || [];
  const intakeRows = readIntakeRows(args.intakeTriageReport);
  const audit = buildAudit({ replayRows, intakeRows });
  const invalidRows = audit.rows.filter((row) => row.invalidStopSweepPenaltyCandidate);
  const entryStopTargetRiskDriftRows = audit.rows.filter((row) => !row.entryPreserved || !row.stopPreserved || !row.target1Preserved || !row.target2Preserved || !row.riskPreserved).length;
  const blockers = [
    !args.modelFamilyBroadReplayPath ? 'missing model-family broad replay path' : null,
    !args.modelFamilyBroadReplayReport ? 'missing model-family broad replay report' : null,
    args.modelFamilyBroadReplayReport && args.modelFamilyBroadReplayReport.status !== 'pass' ? `model-family broad replay status ${args.modelFamilyBroadReplayReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    replayRows.length === 0 ? 'model-family broad replay report has no rows' : null,
    invalidRows.some((row) => row.canExecute === true) ? 'invalid-stop Sweep row had canExecute true' : null,
    entryStopTargetRiskDriftRows ? `${entryStopTargetRiskDriftRows} rows drifted entry/stop/target/risk in audit mapping` : null,
  ].filter((item): item is string => Boolean(item));
  const invalidStopSweepPrimaryRows = invalidRows.filter((row) => row.primaryDeskIdea).length;
  const invalidStopSweepRowsWithValidAlternativeAbove = invalidRows.filter((row) => row.validSameSlateRowsAbove > 0).length;
  const recommendation: UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport['summary']['recommendation'] = blockers.length
    ? 'fix_missing_input_reports'
    : invalidStopSweepPrimaryRows === 0 && invalidRows.every((row) => row.installedState === 'blocked')
      ? 'installed_penalty_protects_selection_continue_builder_source_audit'
      : 'installed_penalty_insufficient_keep_research_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_model_family_installed_penalty_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      modelFamilyBroadReplayPath: args.modelFamilyBroadReplayPath,
      intakeTriagePath: args.intakeTriagePath,
    },
    assumptions: {
      readsSavedDiagnosticsOnly: true,
      usesInstalledUnifiedDeskCandidateBookScoring: true,
      invalidStopSweepRowsMustRemainBlocked: true,
      outcomesUsedOnlyForAuditLabels: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      replayRowsRead: replayRows.length,
      auditedRows: audit.rows.length,
      slates: audit.slates.length,
      invalidStopSweepRows: invalidRows.length,
      invalidStopSweepRowsBlocked: invalidRows.filter((row) => row.installedState === 'blocked').length,
      invalidStopSweepCanExecuteTrueRows: invalidRows.filter((row) => row.canExecute === true).length,
      invalidStopSweepPrimaryRows,
      invalidStopSweepRowsWithValidAlternativeAbove,
      entryStopTargetRiskDriftRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates: audit.slates,
    rows: audit.rows,
    blockers,
    recommendations: blockers.length
      ? ['Repair saved-report inputs before using installed penalty audit output.']
      : [
        'Installed unified candidate book scoring keeps invalid-stop Sweep rows blocked and non-executable in this saved-report audit.',
        'Continue with source-builder audit before any live-facing suppression, boost, canExecute, or model eligibility change.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport(
  report: UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-model-family-installed-penalty-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const modelFamilyBroadReplayPath = readFlag(args, '--model-family-broad-replay') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-broad-replay-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport({
    reportDir: outDir,
    modelFamilyBroadReplayPath,
    modelFamilyBroadReplayReport: modelFamilyBroadReplayPath && fs.existsSync(modelFamilyBroadReplayPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport>(modelFamilyBroadReplayPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<Record<string, unknown>>(intakeTriagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
