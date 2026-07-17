import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ReviewedCaseIntakeCandidate {
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
  nextAction: string;
}

export interface UnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport {
  reportType: 'unified_positive_held_local_preview_reviewed_case_intake';
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
    decisionTapeDir: string;
    sourceProofFilterPaths: string[];
    decisionTapePaths: string[];
    currentTradeDate: string;
    includeCurrentTradeDate: boolean;
  };
  summary: {
    knownProcessedTickets: number;
    decisionTapeFilesScanned: number;
    decisionTapeEventsScanned: number;
    historicalHeldCompleteCandidates: number;
    newReviewIntakeCandidates: number;
    alreadyProcessedCandidates: number;
    currentTradeDateCandidatesExcluded: number;
    executableCandidatesIgnored: number;
    incompletePlanCandidatesIgnored: number;
    livePromotionAllowedRows: 0;
  };
  rows: ReviewedCaseIntakeCandidate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_DECISION_TAPE_DIR = path.join(__dirname, 'discord-audit');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function matchingFiles(dir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(dir, name))
    .sort((a, b) => a.localeCompare(b));
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function authority(): UnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport['authority'] {
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

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function rows(report: Record<string, unknown>): Array<Record<string, unknown>> {
  return Array.isArray(report.rows) ? report.rows as Array<Record<string, unknown>> : [];
}

function normalizedDirection(value: unknown): 'LONG' | 'SHORT' | null {
  if (value === 'LONG' || value === 'SHORT') return value;
  return null;
}

function defaultTradeDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function candidateIntakeId(args: {
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
}): string {
  return `${args.tradeDate}-${args.session}-${args.setupType}-${args.direction}`;
}

function knownProcessedTickets(sourceProofFilterReports: Record<string, unknown>[]): Set<string> {
  const known = new Set<string>();
  sourceProofFilterReports.forEach((report) => {
    rows(report)
      .filter((row) => row.decision === 'accepted_for_research_validation')
      .forEach((row) => {
        const rowId = stringValue(row.rowId);
        if (rowId) known.add(rowId);
      });
  });
  return known;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function statusRows(event: Record<string, unknown>): Array<Record<string, unknown>> {
  const setupCandidateStatus = asObject(event.setupCandidateStatus);
  return Array.isArray(setupCandidateStatus?.statuses)
    ? setupCandidateStatus.statuses as Array<Record<string, unknown>>
    : [];
}

function isExecutableCandidate(row: Record<string, unknown>): boolean {
  return row.executionStatus === 'Executable';
}

function hasCompletePlan(row: Record<string, unknown>): boolean {
  return numberValue(row.entry) !== null &&
    numberValue(row.stop) !== null &&
    numberValue(row.target1) !== null &&
    numberValue(row.target2) !== null &&
    numberValue(row.riskPoints) !== null;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Reviewed Case Intake',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only replay-discovery diagnostic. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Known processed tickets: ${report.summary.knownProcessedTickets}.`,
    `- Decision tape files scanned: ${report.summary.decisionTapeFilesScanned}.`,
    `- Decision tape events scanned: ${report.summary.decisionTapeEventsScanned}.`,
    `- Historical held complete candidates: ${report.summary.historicalHeldCompleteCandidates}.`,
    `- New review intake candidates: ${report.summary.newReviewIntakeCandidates}.`,
    `- Already processed candidates: ${report.summary.alreadyProcessedCandidates}.`,
    `- Current trade-date candidates excluded: ${report.summary.currentTradeDateCandidatesExcluded}.`,
    `- Executable candidates ignored: ${report.summary.executableCandidatesIgnored}.`,
    `- Incomplete plan candidates ignored: ${report.summary.incompletePlanCandidatesIgnored}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Intake ID | Setup | Side | First Seen | Last Seen | Occurrences | Entry | Stop | T1 | T2 | State | Decision |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.intakeId} | ${row.setupType} | ${row.direction} | ${row.firstSeenTime} | ${row.lastSeenTime} | ${row.occurrences} | ${row.entry} | ${row.stop} | ${row.target1} | ${row.target2} | ${row.candidateState ?? '-'} | ${row.intakeDecision} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport(args: {
  reportDir: string;
  decisionTapeDir: string;
  sourceProofFilterPaths: string[];
  sourceProofFilterReports: Record<string, unknown>[];
  decisionTapePaths: string[];
  decisionTapeReports: Record<string, unknown>[];
  currentTradeDate?: string;
  includeCurrentTradeDate?: boolean;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport {
  const currentTradeDate = args.currentTradeDate || defaultTradeDate();
  const includeCurrentTradeDate = args.includeCurrentTradeDate === true;
  const known = knownProcessedTickets(args.sourceProofFilterReports);
  const candidateMap = new Map<string, ReviewedCaseIntakeCandidate>();
  let decisionTapeEventsScanned = 0;
  let currentTradeDateCandidatesExcluded = 0;
  let executableCandidatesIgnored = 0;
  let incompletePlanCandidatesIgnored = 0;

  args.decisionTapeReports.forEach((report, index) => {
    const tradeDate = stringValue(report.tradeDate);
    const session = stringValue(report.session);
    const instrument = stringValue(report.instrument) || 'MES';
    const sourceFile = path.basename(args.decisionTapePaths[index] || 'scanner-decision-tape.json');
    const events = asObject(report.events);
    if (!tradeDate || !session || !events) return;

    Object.entries(events).forEach(([eventTime, rawEvent]) => {
      const event = asObject(rawEvent);
      if (!event) return;
      decisionTapeEventsScanned += 1;

      statusRows(event).forEach((status) => {
        if (tradeDate >= currentTradeDate && !includeCurrentTradeDate) {
          currentTradeDateCandidatesExcluded += 1;
          return;
        }
        if (isExecutableCandidate(status)) {
          executableCandidatesIgnored += 1;
          return;
        }
        if (!hasCompletePlan(status)) {
          incompletePlanCandidatesIgnored += 1;
          return;
        }

        const setupType = stringValue(status.setupType);
        const direction = normalizedDirection(status.direction);
        const entry = numberValue(status.entry);
        const stop = numberValue(status.stop);
        const target1 = numberValue(status.target1);
        const target2 = numberValue(status.target2);
        const riskPoints = numberValue(status.riskPoints);
        if (!setupType || !direction || entry === null || stop === null || target1 === null || target2 === null || riskPoints === null) return;

        const intakeId = candidateIntakeId({ tradeDate, session, setupType, direction });
        const existing = candidateMap.get(intakeId);
        if (existing) {
          existing.lastSeenTime = eventTime;
          existing.occurrences += 1;
          return;
        }
        const alreadyProcessed = known.has(intakeId);
        candidateMap.set(intakeId, {
          intakeId,
          tradeDate,
          session,
          instrument,
          setupType,
          direction,
          firstSeenTime: eventTime,
          lastSeenTime: eventTime,
          occurrences: 1,
          entry,
          stop,
          target1,
          target2,
          riskPoints,
          candidateState: stringValue(status.candidateState),
          executionStatus: stringValue(status.executionStatus),
          detectedStatus: stringValue(status.detectedStatus),
          blockReason: stringValue(status.blockReason),
          sourceFile,
          intakeDecision: alreadyProcessed ? 'already_processed' : 'candidate_for_review_intake',
          nextAction: alreadyProcessed
            ? 'Already processed through the reviewed source/proof chain.'
            : 'Create a local reviewed preview/replay row before any rank-overlay or scanner-visible consideration.',
        });
      });
    });
  });

  const allRows = [...candidateMap.values()].sort((a, b) => a.intakeId.localeCompare(b.intakeId));
  const newRows = allRows.filter((row) => row.intakeDecision === 'candidate_for_review_intake');
  const blockers = [
    args.sourceProofFilterPaths.length === 0 ? 'no source/proof filter reports found for processed-ticket comparison' : null,
    args.decisionTapePaths.length === 0 ? 'no scanner decision tape files found for replay discovery' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_reviewed_case_intake',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      decisionTapeDir: args.decisionTapeDir,
      sourceProofFilterPaths: args.sourceProofFilterPaths,
      decisionTapePaths: args.decisionTapePaths,
      currentTradeDate,
      includeCurrentTradeDate,
    },
    summary: {
      knownProcessedTickets: known.size,
      decisionTapeFilesScanned: args.decisionTapePaths.length,
      decisionTapeEventsScanned,
      historicalHeldCompleteCandidates: allRows.length,
      newReviewIntakeCandidates: newRows.length,
      alreadyProcessedCandidates: allRows.length - newRows.length,
      currentTradeDateCandidatesExcluded,
      executableCandidatesIgnored,
      incompletePlanCandidatesIgnored,
      livePromotionAllowedRows: 0,
    },
    rows: allRows,
    blockers,
    recommendations: blockers.length
      ? ['Do not continue replay-discovery expansion until local source/proof reports and scanner decision tapes are available.']
      : newRows.length === 0
        ? ['No new historical held complete candidates were found. Broaden the intake source set only with another read-only local artifact family.']
        : ['Build reviewed preview/replay rows for the new intake candidates, then run outcome/source-proof validation before rank overlay expansion.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport(
  report: UnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-reviewed-case-intake-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const decisionTapeDir = readFlag(args, '--decision-tape-dir') || DEFAULT_DECISION_TAPE_DIR;
  const currentTradeDate = readFlag(args, '--current-trade-date') || defaultTradeDate();
  const includeCurrentTradeDate = args.includes('--include-current-trade-date');
  const sourceProofFilterPaths = matchingFiles(outDir, /^unified-positive-held-local-preview-source-proof-filter-\d+\.json$/);
  const decisionTapePaths = matchingFiles(decisionTapeDir, /^scanner-decision-tape-\d{4}-\d{2}-\d{2}-[A-Z]+-[a-z_]+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport({
    reportDir: outDir,
    decisionTapeDir,
    sourceProofFilterPaths,
    sourceProofFilterReports: sourceProofFilterPaths.map(readJson),
    decisionTapePaths,
    decisionTapeReports: decisionTapePaths.map(readJson),
    currentTradeDate,
    includeCurrentTradeDate,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewReviewedCaseIntakeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
