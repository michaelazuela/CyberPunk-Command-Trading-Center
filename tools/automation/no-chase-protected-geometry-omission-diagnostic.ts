import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook, type UnifiedDeskCandidateBookItem } from '../../src/lib/unifiedDeskCandidateBook';
import type { SetupCandidate } from '../../src/types';
import type { NoChaseOhlcProofExtractorReport, NoChaseOhlcProofCase } from './no-chase-ohlc-proof-extractor';
import {
  loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir,
  type UnifiedDeskCandidateDiagnosticSnapshot,
} from './unified-desk-candidate-book-diagnostic';

interface CliOptions {
  proofReport: string;
  auditDir: string;
  startDate: string | null;
  endDate: string | null;
  outDir: string;
  json: boolean;
}

type MissingPlanOmissionClass =
  | 'source_candidate_never_built_full_geometry'
  | 'unified_book_mapping_lost_geometry'
  | 'source_geometry_directionally_invalid'
  | 'snapshot_or_candidate_missing';

type RecommendedNextFix =
  | 'inspect_intraday_candidate_builder_plan_geometry'
  | 'inspect_unified_book_mapping'
  | 'inspect_invalid_source_geometry'
  | 'recover_missing_saved_snapshots';

interface PlanFields {
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
}

export interface NoChaseProtectedGeometryOmissionDiagnosticReport {
  reportType: 'no_chase_protected_geometry_omission_diagnostic';
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
    proofReportPath: string;
    auditDir: string;
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    proofOnlyMissingPlanRows: number;
    snapshotsJoinedRows: number;
    snapshotsMissingRows: number;
    sourceNeverBuiltFullGeometryRows: number;
    unifiedMappingLostGeometryRows: number;
    sourceInvalidGeometryRows: number;
    sourceMissingEntryRows: number;
    sourceMissingStopRows: number;
    sourceMissingTargetsRows: number;
    sourceEntryOnlyRows: number;
    sourceStopOnlyRows: number;
    sourceNoEntryStopRows: number;
    canExecuteChangedRows: 0;
    publishDiscordRows: 0;
    livePromotionAllowedRows: 0;
    recommendedNextFix: RecommendedNextFix;
  };
  rows: Array<{
    caseId: string;
    tradeDate: string;
    sessionType: string;
    setupType: string;
    direction: string;
    firstNoChaseSnapshotId: string;
    firstNoChaseTime: string | null;
    proofBarTime: string | null;
    snapshotFound: boolean;
    matchedCandidateKey: string | null;
    itemState: UnifiedDeskCandidateBookItem['state'] | null;
    itemTradingModelState: UnifiedDeskCandidateBookItem['tradingModelState'] | null;
    sourceFields: PlanFields;
    unifiedItemFields: PlanFields;
    sourceMissingFields: string[];
    unifiedMissingFields: string[];
    sourceGeometryValid: boolean | null;
    unifiedGeometryValid: boolean | null;
    omissionClass: MissingPlanOmissionClass;
    recommendedNextAction: RecommendedNextFix;
    canExecute: false;
    publishDiscord: false;
    livePromotionAllowed: false;
  }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseProtectedGeometryOmissionDiagnosticArgs(args = process.argv.slice(2)): CliOptions {
  const proofReport = readFlag(args, '--proof-report');
  if (!proofReport) throw new Error('--proof-report is required.');
  return {
    proofReport,
    auditDir: readFlag(args, '--audit-dir') || readFlag(args, '--input-dir') || DEFAULT_AUDIT_DIR,
    startDate: readFlag(args, '--start-date'),
    endDate: readFlag(args, '--end-date'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function finitePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function planFieldsFromCandidate(candidate: SetupCandidate | null | undefined): PlanFields {
  return {
    entry: finitePrice(candidate?.entry),
    stop: finitePrice(candidate?.stop),
    target1: finitePrice(candidate?.target1),
    target2: finitePrice(candidate?.target2),
    riskPoints: typeof candidate?.riskPoints === 'number' && Number.isFinite(candidate.riskPoints) ? candidate.riskPoints : null,
  };
}

function planFieldsFromItem(item: UnifiedDeskCandidateBookItem | null | undefined): PlanFields {
  return {
    entry: item?.entry ?? null,
    stop: item?.stop ?? null,
    target1: item?.target1 ?? null,
    target2: item?.target2 ?? null,
    riskPoints: item?.riskPoints ?? null,
  };
}

function missingFields(fields: PlanFields): string[] {
  return [
    fields.entry === null ? 'entry' : null,
    fields.stop === null ? 'stop' : null,
    fields.target1 === null ? 'target1' : null,
    fields.target2 === null ? 'target2' : null,
  ].filter((item): item is string => Boolean(item));
}

function geometryValid(direction: string, fields: PlanFields): boolean | null {
  if (fields.entry === null || fields.stop === null) return null;
  if (direction === 'LONG') return fields.stop < fields.entry;
  if (direction === 'SHORT') return fields.stop > fields.entry;
  return null;
}

function authority(): NoChaseProtectedGeometryOmissionDiagnosticReport['authority'] {
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

function snapshotIndex(snapshots: UnifiedDeskCandidateDiagnosticSnapshot[]): Map<string, UnifiedDeskCandidateDiagnosticSnapshot> {
  return new Map(snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
}

function matchedNoChaseItem(row: NoChaseOhlcProofCase, snapshot: UnifiedDeskCandidateDiagnosticSnapshot | null): UnifiedDeskCandidateBookItem | null {
  if (!snapshot) return null;
  const book = buildUnifiedDeskCandidateBook({
    candidates: snapshot.candidates,
    sessionType: snapshot.sessionType,
    completedBarTime: snapshot.completedBarTime,
  });
  return book.candidates.find((item) =>
    item.setupType === row.setupType &&
    item.direction === row.direction &&
    item.state === 'no_chase'
  ) || book.candidates.find((item) =>
    item.setupType === row.setupType &&
    item.direction === row.direction
  ) || null;
}

function classify(args: {
  snapshotFound: boolean;
  sourceMissing: string[];
  unifiedMissing: string[];
  sourceGeometryValid: boolean | null;
}): MissingPlanOmissionClass {
  if (!args.snapshotFound) return 'snapshot_or_candidate_missing';
  if (args.sourceGeometryValid === false) return 'source_geometry_directionally_invalid';
  if (!args.sourceMissing.length && args.unifiedMissing.length) return 'unified_book_mapping_lost_geometry';
  return 'source_candidate_never_built_full_geometry';
}

function nextAction(omissionClass: MissingPlanOmissionClass): RecommendedNextFix {
  if (omissionClass === 'unified_book_mapping_lost_geometry') return 'inspect_unified_book_mapping';
  if (omissionClass === 'source_geometry_directionally_invalid') return 'inspect_invalid_source_geometry';
  if (omissionClass === 'snapshot_or_candidate_missing') return 'recover_missing_saved_snapshots';
  return 'inspect_intraday_candidate_builder_plan_geometry';
}

function buildRows(args: {
  proofReport: NoChaseOhlcProofExtractorReport | null;
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[];
}): NoChaseProtectedGeometryOmissionDiagnosticReport['rows'] {
  const bySnapshotId = snapshotIndex(args.snapshots);
  return (args.proofReport?.cases || [])
    .filter((row) => row.reviewClassification === 'proof_only_missing_plan_fields')
    .map((row) => {
      const snapshot = bySnapshotId.get(row.firstNoChaseSnapshotId) || null;
      const item = matchedNoChaseItem(row, snapshot);
      const sourceFields = planFieldsFromCandidate(item?.sourceCandidate);
      const unifiedItemFields = planFieldsFromItem(item);
      const sourceMissing = missingFields(sourceFields);
      const unifiedMissing = missingFields(unifiedItemFields);
      const sourceGeometry = geometryValid(row.direction, sourceFields);
      const unifiedGeometry = geometryValid(row.direction, unifiedItemFields);
      const omissionClass = classify({
        snapshotFound: Boolean(snapshot && item),
        sourceMissing,
        unifiedMissing,
        sourceGeometryValid: sourceGeometry,
      });
      return {
        caseId: row.caseId,
        tradeDate: row.tradeDate,
        sessionType: row.sessionType,
        setupType: row.setupType,
        direction: row.direction,
        firstNoChaseSnapshotId: row.firstNoChaseSnapshotId,
        firstNoChaseTime: row.firstNoChaseTime,
        proofBarTime: row.proofBarTime,
        snapshotFound: Boolean(snapshot && item),
        matchedCandidateKey: item?.candidateKey || null,
        itemState: item?.state || null,
        itemTradingModelState: item?.tradingModelState || null,
        sourceFields,
        unifiedItemFields,
        sourceMissingFields: sourceMissing,
        unifiedMissingFields: unifiedMissing,
        sourceGeometryValid: sourceGeometry,
        unifiedGeometryValid: unifiedGeometry,
        omissionClass,
        recommendedNextAction: nextAction(omissionClass),
        canExecute: false as const,
        publishDiscord: false as const,
        livePromotionAllowed: false as const,
      };
    });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<NoChaseProtectedGeometryOmissionDiagnosticReport, 'markdown'>): string {
  return [
    '# No-Chase Protected Geometry Omission Diagnostic',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report research only. It reads proof reports and saved scanner snapshots only; it does not create tickets, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Proof-only missing-plan rows: ${report.summary.proofOnlyMissingPlanRows}.`,
    `- Snapshots joined/missing: ${report.summary.snapshotsJoinedRows}/${report.summary.snapshotsMissingRows}.`,
    `- Source never built full geometry: ${report.summary.sourceNeverBuiltFullGeometryRows}.`,
    `- Unified mapping lost geometry: ${report.summary.unifiedMappingLostGeometryRows}.`,
    `- Source invalid geometry: ${report.summary.sourceInvalidGeometryRows}.`,
    `- Source missing entry/stop/targets: ${report.summary.sourceMissingEntryRows}/${report.summary.sourceMissingStopRows}/${report.summary.sourceMissingTargetsRows}.`,
    `- Source entry-only/stop-only/no-entry-stop rows: ${report.summary.sourceEntryOnlyRows}/${report.summary.sourceStopOnlyRows}/${report.summary.sourceNoEntryStopRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Discord publish rows: ${report.summary.publishDiscordRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommended next fix: ${report.summary.recommendedNextFix}.`,
    '',
    '## Rows',
    '| Case | Source Missing | Unified Missing | Source Geometry | Class | Next |',
    '|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.caseId)} | ${escapeTable(row.sourceMissingFields.join(', ') || '-')} | ${escapeTable(row.unifiedMissingFields.join(', ') || '-')} | ${row.sourceGeometryValid ?? '-'} | ${row.omissionClass} | ${row.recommendedNextAction} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseProtectedGeometryOmissionDiagnosticReport(args: {
  proofReportPath: string;
  auditDir: string;
  startDate?: string | null;
  endDate?: string | null;
  proofReport: NoChaseOhlcProofExtractorReport | null;
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[];
}, generatedAt = new Date().toISOString()): NoChaseProtectedGeometryOmissionDiagnosticReport {
  const rows = buildRows({ proofReport: args.proofReport, snapshots: args.snapshots });
  const sourceNeverRows = rows.filter((row) => row.omissionClass === 'source_candidate_never_built_full_geometry').length;
  const mappingRows = rows.filter((row) => row.omissionClass === 'unified_book_mapping_lost_geometry').length;
  const invalidRows = rows.filter((row) => row.omissionClass === 'source_geometry_directionally_invalid').length;
  const missingSnapshotRows = rows.filter((row) => row.omissionClass === 'snapshot_or_candidate_missing').length;
  const joinedRows = rows.filter((row) => row.snapshotFound);
  const blockers = [
    !args.proofReport ? 'missing no-chase OHLC proof report' : null,
    args.proofReport && args.proofReport.reportType !== 'no_chase_ohlc_proof_extractor' ? `unexpected reportType ${args.proofReport.reportType}` : null,
    args.proofReport && args.proofReport.summary.proofOnlyMissingPlanFields !== rows.length ? 'proof report missing-plan summary does not match rows' : null,
    missingSnapshotRows > 0 ? 'one or more proof-only rows could not join to a saved no-chase snapshot/candidate' : null,
    rows.some((row) => row.canExecute !== false) ? 'one or more rows changed canExecute' : null,
    rows.some((row) => row.publishDiscord !== false) ? 'one or more rows enabled Discord publishing' : null,
    rows.some((row) => row.livePromotionAllowed !== false) ? 'one or more rows allowed live promotion' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendedNextFix: RecommendedNextFix = missingSnapshotRows > 0
    ? 'recover_missing_saved_snapshots'
    : mappingRows > 0
      ? 'inspect_unified_book_mapping'
      : invalidRows > 0
        ? 'inspect_invalid_source_geometry'
        : 'inspect_intraday_candidate_builder_plan_geometry';
  const base: Omit<NoChaseProtectedGeometryOmissionDiagnosticReport, 'markdown'> = {
    reportType: 'no_chase_protected_geometry_omission_diagnostic',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      proofReportPath: args.proofReportPath,
      auditDir: args.auditDir,
      startDate: args.startDate || null,
      endDate: args.endDate || null,
    },
    summary: {
      proofOnlyMissingPlanRows: rows.length,
      snapshotsJoinedRows: joinedRows.length,
      snapshotsMissingRows: missingSnapshotRows,
      sourceNeverBuiltFullGeometryRows: sourceNeverRows,
      unifiedMappingLostGeometryRows: mappingRows,
      sourceInvalidGeometryRows: invalidRows,
      sourceMissingEntryRows: joinedRows.filter((row) => row.sourceMissingFields.includes('entry')).length,
      sourceMissingStopRows: joinedRows.filter((row) => row.sourceMissingFields.includes('stop')).length,
      sourceMissingTargetsRows: joinedRows.filter((row) => row.sourceMissingFields.includes('target1') || row.sourceMissingFields.includes('target2')).length,
      sourceEntryOnlyRows: joinedRows.filter((row) => row.sourceFields.entry !== null && row.sourceFields.stop === null).length,
      sourceStopOnlyRows: joinedRows.filter((row) => row.sourceFields.entry === null && row.sourceFields.stop !== null).length,
      sourceNoEntryStopRows: joinedRows.filter((row) => row.sourceFields.entry === null && row.sourceFields.stop === null).length,
      canExecuteChangedRows: 0,
      publishDiscordRows: 0,
      livePromotionAllowedRows: 0,
      recommendedNextFix,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved proof-report or scanner-snapshot joins before using this diagnostic.']
      : [
        'Do not use proof-close/window-extreme reconstruction; replay rejected that path.',
        mappingRows > 0
          ? 'Inspect unified desk candidate book mapping for dropped plan fields before touching model builders.'
          : 'Inspect the Intraday MSS no-chase candidate builder/source field path; missing geometry originates before unified ranking.',
        'Keep canExecute, Discord posting, Supabase persistence, scanner visibility, bridge behavior, and trading logic unchanged.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseProtectedGeometryOmissionDiagnosticReport(
  report: NoChaseProtectedGeometryOmissionDiagnosticReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-protected-geometry-omission-diagnostic-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseProtectedGeometryOmissionDiagnosticCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseProtectedGeometryOmissionDiagnosticArgs(args);
  const proofReport = fs.existsSync(options.proofReport)
    ? readJson<NoChaseOhlcProofExtractorReport>(options.proofReport)
    : null;
  const snapshots = fs.existsSync(options.auditDir)
    ? loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(options.auditDir, {
      startDate: options.startDate,
      endDate: options.endDate,
    })
    : [];
  const report = buildNoChaseProtectedGeometryOmissionDiagnosticReport({
    proofReportPath: options.proofReport,
    auditDir: options.auditDir,
    startDate: options.startDate,
    endDate: options.endDate,
    proofReport,
    snapshots,
  });
  const paths = writeNoChaseProtectedGeometryOmissionDiagnosticReport(report, options.outDir);
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
    runNoChaseProtectedGeometryOmissionDiagnosticCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
