import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type TriageDecision = 'selected_for_replay_package' | 'held_for_later_batch' | 'already_processed_reference';

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  firstSeenTime: string;
  lastSeenTime: string;
  occurrences: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  candidateState: string | null;
  executionStatus: string | null;
  detectedStatus: string | null;
  blockReason: string | null;
  sourceFile: string;
  intakeDecision: 'candidate_for_review_intake' | 'already_processed';
}

interface TriageRow extends IntakeRow {
  proofState: string;
  modelPriority: number;
  proofPriority: number;
  occurrencePriority: number;
  riskQuality: 'tight' | 'normal' | 'wide' | 'extreme';
  triageScore: number;
  triageDecision: TriageDecision;
  triageReason: string;
}

interface TriageGroup {
  setupType: string;
  session: string;
  proofState: string;
  candidates: number;
  selected: number;
}

export interface UnifiedPositiveHeldLocalPreviewIntakeTriageReport {
  reportType: 'unified_positive_held_local_preview_intake_triage';
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
    intakeReportPath: string | null;
    maxReplayPackageRows: number;
    maxRowsPerModel: number;
  };
  summary: {
    intakeRowsRead: number;
    newIntakeCandidates: number;
    alreadyProcessedReferenceRows: number;
    selectedReplayPackageRows: number;
    heldForLaterBatchRows: number;
    modelGroups: number;
    proofStateGroups: number;
    livePromotionAllowedRows: 0;
  };
  groups: TriageGroup[];
  rows: TriageRow[];
  selectedReplayPackage: TriageRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_MAX_REPLAY_PACKAGE_ROWS = 24;
const DEFAULT_MAX_ROWS_PER_MODEL = 4;

const MODEL_PRIORITY: Record<string, number> = {
  OpeningDriveFvgContinuation: 100,
  AfterLunchDriveFvgContinuation: 95,
  IntradayMssMicroContinuation: 90,
  SweepMssFvgRetrace: 78,
  RaidReclaimReversal: 76,
};

const PROOF_PRIORITY: Record<string, number> = {
  human_review_ready: 100,
  opening_observation_armed: 86,
  after_lunch_drive_armed: 84,
  mss_hold_confirmed: 82,
  mss_continuation_retest_pending: 72,
  mss_hold_trigger_pending: 68,
  no_fresh_entry: 40,
  scanner_held_complete: 55,
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function matchingFiles(dir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function authority(): UnifiedPositiveHeldLocalPreviewIntakeTriageReport['authority'] {
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

function asRows(report: Record<string, unknown>): IntakeRow[] {
  return Array.isArray(report.rows) ? report.rows as IntakeRow[] : [];
}

function proofState(row: IntakeRow): string {
  if (row.candidateState === 'HUMAN_REVIEW_READY') return 'human_review_ready';
  if (row.candidateState === 'OPENING_OBSERVATION_ARMED') return 'opening_observation_armed';
  if (row.candidateState === 'AFTER_LUNCH_DRIVE_ARMED') return 'after_lunch_drive_armed';
  if (row.candidateState === 'MSS_HOLD_CONFIRMED') return 'mss_hold_confirmed';
  if (row.candidateState === 'MSS_CONTINUATION_RETEST_PENDING') return 'mss_continuation_retest_pending';
  if (row.candidateState === 'MSS_HOLD_TRIGGER_PENDING') return 'mss_hold_trigger_pending';
  if (row.candidateState === 'NO_FRESH_ENTRY') return 'no_fresh_entry';
  return 'scanner_held_complete';
}

function riskQuality(riskPoints: number): TriageRow['riskQuality'] {
  if (riskPoints <= 6) return 'tight';
  if (riskPoints <= 20) return 'normal';
  if (riskPoints <= 45) return 'wide';
  return 'extreme';
}

function riskScore(quality: TriageRow['riskQuality']): number {
  if (quality === 'tight') return 12;
  if (quality === 'normal') return 18;
  if (quality === 'wide') return 6;
  return -20;
}

function occurrencePriority(occurrences: number): number {
  return Math.min(20, Math.max(0, occurrences));
}

function triageScore(row: IntakeRow, state: string, quality: TriageRow['riskQuality']): number {
  return (MODEL_PRIORITY[row.setupType] ?? 50) +
    (PROOF_PRIORITY[state] ?? 45) +
    occurrencePriority(row.occurrences) +
    riskScore(quality);
}

function groupKey(row: Pick<TriageRow, 'setupType' | 'session' | 'proofState'>): string {
  return `${row.setupType}|${row.session}|${row.proofState}`;
}

function slateKey(row: Pick<TriageRow, 'tradeDate' | 'session'>): string {
  return `${row.tradeDate}|${row.session}`;
}

function isInvalidStopBlocked(row: TriageRow): boolean {
  return row.executionStatus === 'Blocked' && row.blockReason === 'InvalidStopLocation';
}

function isValidReplayAlternative(row: TriageRow): boolean {
  return row.triageDecision !== 'already_processed_reference' &&
    row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending' &&
    row.proofState === 'scanner_held_complete';
}

function buildGroups(rows: TriageRow[]): TriageGroup[] {
  const groups = new Map<string, TriageGroup>();
  rows
    .filter((row) => row.triageDecision !== 'already_processed_reference')
    .forEach((row) => {
      const key = groupKey(row);
      const existing = groups.get(key) || {
        setupType: row.setupType,
        session: row.session,
        proofState: row.proofState,
        candidates: 0,
        selected: 0,
      };
      existing.candidates += 1;
      if (row.triageDecision === 'selected_for_replay_package') existing.selected += 1;
      groups.set(key, existing);
    });
  return [...groups.values()]
    .sort((a, b) => b.selected - a.selected || b.candidates - a.candidates || a.setupType.localeCompare(b.setupType));
}

function selectRows(rows: TriageRow[], maxReplayPackageRows: number, maxRowsPerModel: number): {
  selectedIds: Set<string>;
  blockedTopAlternativeIds: Set<string>;
} {
  const selected = new Set<string>();
  const blockedTopAlternativeIds = new Set<string>();
  const perModel = new Map<string, number>();
  const candidates = rows
    .filter((row) => row.triageDecision !== 'already_processed_reference')
    .sort((a, b) => b.triageScore - a.triageScore || b.occurrences - a.occurrences || a.intakeId.localeCompare(b.intakeId));

  for (const row of candidates) {
    if (selected.size >= maxReplayPackageRows) break;
    const modelCount = perModel.get(row.setupType) || 0;
    if (modelCount >= maxRowsPerModel) continue;
    selected.add(row.intakeId);
    perModel.set(row.setupType, modelCount + 1);
  }

  const selectedRows = (): TriageRow[] => rows.filter((row) => selected.has(row.intakeId));
  const lowestReplaceableSelected = (): TriageRow | null => selectedRows()
    .filter((row) => !isInvalidStopBlocked(row) && !blockedTopAlternativeIds.has(row.intakeId))
    .sort((a, b) => a.triageScore - b.triageScore || a.occurrences - b.occurrences || b.intakeId.localeCompare(a.intakeId))[0] || null;

  for (const blockedRow of selectedRows().filter(isInvalidStopBlocked)) {
    const alternative = candidates
      .filter((row) => !selected.has(row.intakeId))
      .filter((row) => slateKey(row) === slateKey(blockedRow))
      .filter(isValidReplayAlternative)
      .sort((a, b) => b.triageScore - a.triageScore || b.occurrences - a.occurrences || a.intakeId.localeCompare(b.intakeId))[0];
    if (!alternative) continue;
    if (selected.size < maxReplayPackageRows) {
      selected.add(alternative.intakeId);
      blockedTopAlternativeIds.add(alternative.intakeId);
      continue;
    }
    const replacement = lowestReplaceableSelected();
    if (!replacement) continue;
    selected.delete(replacement.intakeId);
    selected.add(alternative.intakeId);
    blockedTopAlternativeIds.add(alternative.intakeId);
  }

  return { selectedIds: selected, blockedTopAlternativeIds };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewIntakeTriageReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Intake Triage',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only intake triage. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Intake rows read: ${report.summary.intakeRowsRead}.`,
    `- New intake candidates: ${report.summary.newIntakeCandidates}.`,
    `- Already processed reference rows: ${report.summary.alreadyProcessedReferenceRows}.`,
    `- Selected replay package rows: ${report.summary.selectedReplayPackageRows}.`,
    `- Held for later batch rows: ${report.summary.heldForLaterBatchRows}.`,
    `- Model groups: ${report.summary.modelGroups}.`,
    `- Proof-state groups: ${report.summary.proofStateGroups}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Selected Replay Package',
    '| Intake ID | Setup | Session | Side | State | Occurrences | Risk | Score |',
    '|---|---|---|---|---|---:|---:|---:|',
    ...report.selectedReplayPackage.map((row) => `| ${row.intakeId} | ${row.setupType} | ${row.session} | ${row.direction} | ${row.proofState} | ${row.occurrences} | ${row.riskPoints} | ${row.triageScore} |`),
    '',
    '## Top Groups',
    '| Setup | Session | Proof State | Candidates | Selected |',
    '|---|---|---|---:|---:|',
    ...report.groups.slice(0, 30).map((group) => `| ${group.setupType} | ${group.session} | ${group.proofState} | ${group.candidates} | ${group.selected} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewIntakeTriageReport(args: {
  reportDir: string;
  intakeReportPath: string | null;
  intakeReport: Record<string, unknown> | null;
  maxReplayPackageRows?: number;
  maxRowsPerModel?: number;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewIntakeTriageReport {
  const maxReplayPackageRows = args.maxReplayPackageRows || DEFAULT_MAX_REPLAY_PACKAGE_ROWS;
  const maxRowsPerModel = args.maxRowsPerModel || DEFAULT_MAX_ROWS_PER_MODEL;
  const intakeRows = args.intakeReport ? asRows(args.intakeReport) : [];
  const triageRows: TriageRow[] = intakeRows.map((row) => {
    const state = proofState(row);
    const quality = riskQuality(row.riskPoints);
    const score = triageScore(row, state, quality);
    return {
      ...row,
      proofState: state,
      modelPriority: MODEL_PRIORITY[row.setupType] ?? 50,
      proofPriority: PROOF_PRIORITY[state] ?? 45,
      occurrencePriority: occurrencePriority(row.occurrences),
      riskQuality: quality,
      triageScore: score,
      triageDecision: row.intakeDecision === 'already_processed'
        ? 'already_processed_reference'
        : 'held_for_later_batch',
      triageReason: row.intakeDecision === 'already_processed'
        ? 'Already processed through source/proof validation; retained only as reference.'
        : 'Held until selected into a small replay package.',
    };
  });
  const selection = selectRows(triageRows, maxReplayPackageRows, maxRowsPerModel);
  triageRows.forEach((row) => {
    if (selection.selectedIds.has(row.intakeId)) {
      row.triageDecision = 'selected_for_replay_package';
      row.triageReason = selection.blockedTopAlternativeIds.has(row.intakeId)
        ? 'Selected by read-only blocked-top alternate triage so a valid same-slate candidate can be compared against an InvalidStopLocation row; this is not live ranking or execution approval.'
        : 'Selected by read-only triage for the next replay/outcome package; this is not live ranking or execution approval.';
    }
  });
  const selectedReplayPackage = triageRows
    .filter((row) => row.triageDecision === 'selected_for_replay_package')
    .sort((a, b) => b.triageScore - a.triageScore || a.intakeId.localeCompare(b.intakeId));
  const newRows = triageRows.filter((row) => row.intakeDecision === 'candidate_for_review_intake');
  const alreadyProcessedRows = triageRows.filter((row) => row.intakeDecision === 'already_processed');
  const blockers = [
    !args.intakeReportPath ? 'no reviewed-case intake report found' : null,
    intakeRows.length === 0 ? 'reviewed-case intake report has no rows' : null,
    selectedReplayPackage.length === 0 && newRows.length > 0 ? 'triage selected no replay package rows' : null,
  ].filter((item): item is string => Boolean(item));
  const groups = buildGroups(triageRows);
  const proofStates = new Set(newRows.map((row) => row.proofState));
  const base: Omit<UnifiedPositiveHeldLocalPreviewIntakeTriageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_intake_triage',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      intakeReportPath: args.intakeReportPath,
      maxReplayPackageRows,
      maxRowsPerModel,
    },
    summary: {
      intakeRowsRead: intakeRows.length,
      newIntakeCandidates: newRows.length,
      alreadyProcessedReferenceRows: alreadyProcessedRows.length,
      selectedReplayPackageRows: selectedReplayPackage.length,
      heldForLaterBatchRows: newRows.length - selectedReplayPackage.length,
      modelGroups: new Set(newRows.map((row) => row.setupType)).size,
      proofStateGroups: proofStates.size,
      livePromotionAllowedRows: 0,
    },
    groups,
    rows: triageRows.sort((a, b) => b.triageScore - a.triageScore || a.intakeId.localeCompare(b.intakeId)),
    selectedReplayPackage,
    blockers,
    recommendations: blockers.length
      ? ['Do not run replay packaging until a valid reviewed-case intake report exists and triage selects rows.']
      : selectedReplayPackage.length === 0
        ? ['No replay package rows selected. Broaden only the local read-only intake source set, not live scanner behavior.']
        : ['Build a read-only replay/outcome package for selected rows, then validate source/proof before any rank overlay expansion.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewIntakeTriageReport(
  report: UnifiedPositiveHeldLocalPreviewIntakeTriageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-intake-triage-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewIntakeTriageCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const intakeReportPath = readFlag(args, '--intake-report') ||
    matchingFiles(outDir, /^unified-positive-held-local-preview-reviewed-case-intake-\d+\.json$/)[0] ||
    null;
  const maxReplayPackageRows = numberFlag(args, '--max-replay-package-rows', DEFAULT_MAX_REPLAY_PACKAGE_ROWS);
  const maxRowsPerModel = numberFlag(args, '--max-rows-per-model', DEFAULT_MAX_ROWS_PER_MODEL);
  const report = buildUnifiedPositiveHeldLocalPreviewIntakeTriageReport({
    reportDir: outDir,
    intakeReportPath,
    intakeReport: intakeReportPath ? readJson(intakeReportPath) : null,
    maxReplayPackageRows,
    maxRowsPerModel,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewIntakeTriageReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewIntakeTriageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
