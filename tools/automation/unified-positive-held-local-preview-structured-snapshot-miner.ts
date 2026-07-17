import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport,
} from './unified-positive-held-local-preview-structural-field-inventory';

type StructuralRow = UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport['rows'][number];

interface SnapshotRow {
  rowId: string;
  setupType: string;
  session: string;
  direction: string;
  outcomeBucket: StructuralRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  proofTime: string | null;
  eventTime: string | null;
  sourceFile: string | null;
  selectedSetupType: string | null;
  selectedDirection: string | null;
  selectedRankScore: number | null;
  selectedDecisionQualityScore: number | null;
  selectedModelConfidenceScore: number | null;
  modelCandidateFound: boolean;
  modelCandidateState: string | null;
  modelCandidateExecutionStatus: string | null;
  modelCandidateVisibilityMode: string | null;
  modelCandidateRankScore: number | null;
  modelCandidateDecisionQualityScore: number | null;
  modelCandidateModelConfidenceScore: number | null;
  modelCandidateMissingEvidenceCount: number;
  modelCandidateHasFullPlanLevels: boolean | null;
  modelCandidateFilteredOutReason: string | null;
  fvgRetestEvidence: boolean;
  noChaseEvidence: boolean;
  protectedStopEvidence: boolean;
  targetRoomEvidence: boolean;
  entryTriggerPendingEvidence: boolean;
  staleEvidence: boolean;
  selectedMatchesReviewedModel: boolean;
  htfContextStatus: string | null;
  htfClassification: string | null;
  htfDrawDirection: string | null;
  htfFiveMinuteDirection: string | null;
  htfFiveMinuteStatus: string | null;
  htfFiveMinuteTriggerConfirmed: boolean | null;
  htfAlignedTimeframes: number;
  htfConflictingTimeframes: number;
  htfNeutralTimeframes: number;
  scorecardStrongCount: number;
  scorecardPartialCount: number;
  scorecardWeakCount: number;
  historyCoverageSufficient: boolean | null;
  blockers: string[];
}

interface FeatureSummary {
  featureId: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossResolvedOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport {
  reportType: 'unified_positive_held_local_preview_structured_snapshot_miner';
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
    structuralFieldInventoryPath: string | null;
    auditDir: string;
  };
  assumptions: {
    usesProofTimeSnapshotObjectsOnly: true;
    excludesFuturePathEvidenceAsFeatures: true;
    miningIsResearchOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    minedRows: number;
    blockedRows: number;
    featureSummaries: number;
    livePromotionAllowedRows: 0;
  };
  features: FeatureSummary[];
  rows: SnapshotRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');

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

function authority(): UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['authority'] {
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function loadTapeEvent(auditDir: string, sourceFile: string | null, proofTime: string | null): { event: Record<string, unknown> | null; eventTime: string | null; blockers: string[] } {
  if (!sourceFile) return { event: null, eventTime: null, blockers: ['missing source file'] };
  const filePath = path.isAbsolute(sourceFile) ? sourceFile : path.join(auditDir, sourceFile);
  if (!fs.existsSync(filePath)) return { event: null, eventTime: null, blockers: ['missing local scanner decision tape'] };
  const tape = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const events = Object.entries(asRecord(tape.events))
    .map(([key, value]) => ({ time: normalizeTime(asRecord(value).time) || normalizeTime(key), event: asRecord(value) }))
    .filter((item) => item.time)
    .sort((a, b) => timeMs(a.time) - timeMs(b.time));
  if (events.length === 0) return { event: null, eventTime: null, blockers: ['scanner decision tape has no events'] };
  const proof = timeMs(proofTime);
  const selected = events.find((item) => timeMs(item.time) >= proof) || events[events.length - 1];
  return { event: selected.event, eventTime: selected.time || null, blockers: [] };
}

function textBag(...values: unknown[]): string {
  return values.flatMap((value) => {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value && typeof value === 'object') return [JSON.stringify(value)];
    return value === null || value === undefined ? [] : [String(value)];
  }).join(' ').toLowerCase();
}

function scorecardCounts(event: Record<string, unknown>): { strong: number; partial: number; weak: number } {
  const scorecard = asArray(asRecord(event.confidence).scorecard).map(asRecord);
  return {
    strong: scorecard.filter((item) => stringOrNull(item.status) === 'strong').length,
    partial: scorecard.filter((item) => stringOrNull(item.status) === 'partial').length,
    weak: scorecard.filter((item) => ['weak', 'blocked'].includes(stringOrNull(item.status) || '')).length,
  };
}

function timeframeSummary(htfState: Record<string, unknown>, direction: string): { aligned: number; conflicting: number; neutral: number } {
  const normalizedDirection = direction.toLowerCase();
  const states = asArray(htfState.timeframeStates ?? htfState.timeframeStack).map(asRecord);
  return {
    aligned: states.filter((state) => stringOrNull(state.direction)?.toLowerCase() === normalizedDirection).length,
    conflicting: states.filter((state) => {
      const stateDirection = stringOrNull(state.direction)?.toLowerCase();
      return stateDirection && stateDirection !== 'neutral' && stateDirection !== normalizedDirection;
    }).length,
    neutral: states.filter((state) => (stringOrNull(state.direction) || 'neutral').toLowerCase() === 'neutral').length,
  };
}

function hasSufficientHistory(event: Record<string, unknown>): boolean | null {
  const coverage = asArray(event.historyCoverage).map(asRecord);
  if (!coverage.length) return null;
  return coverage.every((item) => boolOrNull(item.sufficient) === true);
}

function matchingModelCandidate(row: StructuralRow, event: Record<string, unknown>): Record<string, unknown> {
  const statuses = asArray(asRecord(event.setupCandidateStatus).statuses).map(asRecord);
  return statuses.find((candidate) =>
    stringOrNull(candidate.setupType) === row.setupType &&
    stringOrNull(candidate.direction) === row.direction
  ) || {};
}

function buildRow(row: StructuralRow, auditDir: string): SnapshotRow {
  const loaded = loadTapeEvent(auditDir, row.sourceFile, row.proofTime);
  const event = loaded.event || {};
  const setupStatus = asRecord(event.setupCandidateStatus);
  const selected = asRecord(setupStatus.selected);
  const modelCandidate = matchingModelCandidate(row, event);
  const selectedSetupType = stringOrNull(selected.setupType);
  const selectedDirection = stringOrNull(selected.direction);
  const candidateText = textBag(
    modelCandidate.missingEvidence,
    modelCandidate.requiredTrigger,
    modelCandidate.nextTrigger,
    modelCandidate.blockReason,
    modelCandidate.filteredOutReason,
    asRecord(event.setupCandidateStatus).missingProofSummary,
    event.staleReason,
  );
  const htfState = asRecord(asRecord(asRecord(event.facts).mss).htfState);
  const fiveMinuteState = asRecord(htfState.fiveMinuteState);
  const timeframeCounts = timeframeSummary(htfState, row.direction);
  const scorecard = scorecardCounts(event);
  const modelCandidateFound = Object.keys(modelCandidate).length > 0;
  const blockers = [
    ...loaded.blockers,
    loaded.event ? null : 'missing proof-time event',
    modelCandidateFound ? null : 'reviewed model candidate not present in proof-time status list',
  ].filter((item): item is string => Boolean(item));
  return {
    rowId: row.rowId,
    setupType: row.setupType,
    session: row.session,
    direction: row.direction,
    outcomeBucket: row.outcomeBucket,
    resolvedOneMesPl: row.resolvedOneMesPl,
    proofTime: row.proofTime,
    eventTime: loaded.eventTime,
    sourceFile: row.sourceFile,
    selectedSetupType,
    selectedDirection,
    selectedRankScore: numberOrNull(selected.rankScore),
    selectedDecisionQualityScore: numberOrNull(selected.decisionQualityScore),
    selectedModelConfidenceScore: numberOrNull(selected.modelConfidenceScore),
    modelCandidateFound,
    modelCandidateState: stringOrNull(modelCandidate.candidateState),
    modelCandidateExecutionStatus: stringOrNull(modelCandidate.executionStatus),
    modelCandidateVisibilityMode: stringOrNull(modelCandidate.visibilityMode),
    modelCandidateRankScore: numberOrNull(modelCandidate.rankScore),
    modelCandidateDecisionQualityScore: numberOrNull(modelCandidate.decisionQualityScore),
    modelCandidateModelConfidenceScore: numberOrNull(modelCandidate.modelConfidenceScore),
    modelCandidateMissingEvidenceCount: asArray(modelCandidate.missingEvidence).length,
    modelCandidateHasFullPlanLevels: boolOrNull(modelCandidate.hasFullPlanLevels),
    modelCandidateFilteredOutReason: stringOrNull(modelCandidate.filteredOutReason),
    fvgRetestEvidence: /\bfvg\b|fair value gap|retest|mitigation/.test(candidateText),
    noChaseEvidence: /no chase|do not chase|stale/.test(candidateText),
    protectedStopEvidence: /protected.*stop|structure stop|stop.*unproven|invalidstoplocation/.test(candidateText),
    targetRoomEvidence: /target room|minimum 2\.0r|before 1r|external liquidity target|60%/.test(candidateText),
    entryTriggerPendingEvidence: /entrytriggerpending|trigger pending|fresh completed 5m.*not confirmed/.test(candidateText),
    staleEvidence: /stale|already traded through|invalidated/.test(candidateText),
    selectedMatchesReviewedModel: selectedSetupType === row.setupType && selectedDirection === row.direction,
    htfContextStatus: stringOrNull(asRecord(htfState.htfContextSufficiency).overallStatus),
    htfClassification: stringOrNull(htfState.classification),
    htfDrawDirection: stringOrNull(htfState.drawDirection),
    htfFiveMinuteDirection: stringOrNull(fiveMinuteState.direction),
    htfFiveMinuteStatus: stringOrNull(fiveMinuteState.status),
    htfFiveMinuteTriggerConfirmed: boolOrNull(htfState.fiveMinuteMssTriggerConfirmed),
    htfAlignedTimeframes: timeframeCounts.aligned,
    htfConflictingTimeframes: timeframeCounts.conflicting,
    htfNeutralTimeframes: timeframeCounts.neutral,
    scorecardStrongCount: scorecard.strong,
    scorecardPartialCount: scorecard.partial,
    scorecardWeakCount: scorecard.weak,
    historyCoverageSufficient: hasSufficientHistory(event),
    blockers,
  };
}

function featureIds(row: SnapshotRow): string[] {
  return [
    `selectedMatchesReviewedModel=${row.selectedMatchesReviewedModel}`,
    `modelCandidateFound=${row.modelCandidateFound}`,
    `modelCandidateState=${row.modelCandidateState ?? 'unknown'}`,
    `modelCandidateExecutionStatus=${row.modelCandidateExecutionStatus ?? 'unknown'}`,
    `modelCandidateVisibilityMode=${row.modelCandidateVisibilityMode ?? 'unknown'}`,
    `modelCandidateFilteredOutReason=${row.modelCandidateFilteredOutReason ?? 'none'}`,
    `modelCandidateHasFullPlanLevels=${row.modelCandidateHasFullPlanLevels ?? 'unknown'}`,
    `missingEvidenceCount=${row.modelCandidateMissingEvidenceCount}`,
    `fvgRetestEvidence=${row.fvgRetestEvidence}`,
    `noChaseEvidence=${row.noChaseEvidence}`,
    `protectedStopEvidence=${row.protectedStopEvidence}`,
    `targetRoomEvidence=${row.targetRoomEvidence}`,
    `entryTriggerPendingEvidence=${row.entryTriggerPendingEvidence}`,
    `staleEvidence=${row.staleEvidence}`,
    `htfContextStatus=${row.htfContextStatus ?? 'unknown'}`,
    `htfClassification=${row.htfClassification ?? 'unknown'}`,
    `htfDrawDirection=${row.htfDrawDirection ?? 'unknown'}`,
    `htfFiveMinuteDirection=${row.htfFiveMinuteDirection ?? 'unknown'}`,
    `htfFiveMinuteStatus=${row.htfFiveMinuteStatus ?? 'unknown'}`,
    `htfFiveMinuteTriggerConfirmed=${row.htfFiveMinuteTriggerConfirmed ?? 'unknown'}`,
    `htfAlignedTimeframes=${row.htfAlignedTimeframes}`,
    `htfConflictingTimeframes=${row.htfConflictingTimeframes}`,
    `htfNeutralTimeframes=${row.htfNeutralTimeframes}`,
    `scorecardStrongCount=${row.scorecardStrongCount}`,
    `scorecardPartialCount=${row.scorecardPartialCount}`,
    `scorecardWeakCount=${row.scorecardWeakCount}`,
    `historyCoverageSufficient=${row.historyCoverageSufficient ?? 'unknown'}`,
  ].map((id) => `${row.setupType}|${id}`);
}

function buildFeatureSummaries(rows: SnapshotRow[]): FeatureSummary[] {
  const groups = new Map<string, SnapshotRow[]>();
  for (const row of rows) {
    for (const id of featureIds(row)) groups.set(id, [...(groups.get(id) || []), row]);
  }
  return [...groups.entries()]
    .map(([featureId, group]) => ({
      featureId,
      rows: group.length,
      winners: group.filter((row) => row.outcomeBucket === 'winner').length,
      losses: group.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: group.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
    }))
    .filter((feature) => !/unknown$/.test(feature.featureId))
    .sort((a, b) => b.rows - a.rows || (b.grossResolvedOneMesPl ?? 0) - (a.grossResolvedOneMesPl ?? 0) || a.featureId.localeCompare(b.featureId));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Structured Snapshot Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only miner over proof-time scanner snapshot objects. It does not use future path evidence as a feature, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Mined rows: ${report.summary.minedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Feature summaries: ${report.summary.featureSummaries}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Top Feature Summaries',
    '| Feature | Rows | W/L/U | P/L |',
    '|---|---:|---|---:|',
    ...report.features.slice(0, 90).map((row) => `| ${escapeTable(row.featureId)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport(args: {
  reportDir: string;
  structuralFieldInventoryPath: string | null;
  structuralFieldInventoryReport: UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport {
  const sourceRows = args.structuralFieldInventoryReport?.rows || [];
  const rows = sourceRows.map((row) => buildRow(row, args.auditDir));
  const features = buildFeatureSummaries(rows);
  const blockers = [
    !args.structuralFieldInventoryPath ? 'missing structural field inventory path' : null,
    !args.structuralFieldInventoryReport ? 'missing structural field inventory report' : null,
    args.structuralFieldInventoryReport && args.structuralFieldInventoryReport.status !== 'pass' ? `structural field inventory status ${args.structuralFieldInventoryReport.status}` : null,
    sourceRows.length === 0 ? 'no structural inventory source rows found' : null,
    rows.some((row) => row.blockers.length > 0) ? 'one or more rows could not be mined from local proof-time scanner snapshot objects' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_structured_snapshot_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      structuralFieldInventoryPath: args.structuralFieldInventoryPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      usesProofTimeSnapshotObjectsOnly: true,
      excludesFuturePathEvidenceAsFeatures: true,
      miningIsResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      minedRows: rows.length,
      blockedRows: rows.filter((row) => row.blockers.length > 0).length,
      featureSummaries: features.length,
      livePromotionAllowedRows: 0,
    },
    features,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not classify or rank from structured snapshot mining until all source rows join cleanly to local proof-time snapshots.']
      : [
        'Use these structured snapshot feature summaries to choose the next no-lookahead classifier pass.',
        'Do not install a live scanner filter or rank overlay from this mining pass alone.',
        'Keep future path evidence out of candidate features; use realized P/L only for retrospective reporting.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport(
  report: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-structured-snapshot-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const structuralFieldInventoryPath = readFlag(args, '--structural-field-inventory') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structural-field-inventory-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport({
    reportDir: outDir,
    structuralFieldInventoryPath,
    structuralFieldInventoryReport: structuralFieldInventoryPath && fs.existsSync(structuralFieldInventoryPath)
      ? JSON.parse(fs.readFileSync(structuralFieldInventoryPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuralFieldInventoryReport
      : null,
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
