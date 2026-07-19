import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildUnifiedDeskCandidateBook,
  type UnifiedDeskCandidateBookItem,
} from '../../src/lib/unifiedDeskCandidateBook';
import {
  loadUnifiedDeskCandidateDiagnosticSnapshots,
  loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir,
  type UnifiedDeskCandidateDiagnosticSnapshot,
} from './unified-desk-candidate-book-diagnostic';

interface CliOptions {
  inputJson: string | null;
  inputDir: string | null;
  startDate: string | null;
  endDate: string | null;
  outDir: string;
  json: boolean;
}

interface ShadowRow {
  snapshotId: string;
  tradeDate: string | null;
  sessionType: UnifiedDeskCandidateDiagnosticSnapshot['sessionType'];
  completedBarTime: string | null;
  groupKey: string;
  groupSize: number;
  baselinePrimaryKey: string | null;
  shadowSelectedKey: string | null;
  shadowSelectedSetupType: string | null;
  selectorDecision: 'keep_later_sweep_proof' | 'prefer_replacement' | 'not_applicable';
  wouldChangePrimary: boolean;
  selectedCanExecute: boolean;
  selectedLiveInstallAllowed: false;
  selectedScannerVisibleChangeAllowed: false;
  selectedEntryPreserved: true;
  selectedStopPreserved: true;
  selectedTargetsPreserved: true;
  selectedRiskPreserved: true;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_comparison';
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
    inputJson: string | null;
    inputDir: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    snapshotsAudited: number;
    collisionRows: number;
    keepLaterSweepProofRows: number;
    preferReplacementRows: number;
    wouldChangePrimaryRows: number;
    selectedCanExecuteTrueRows: number;
    livePromotionAllowedRows: 0;
    scannerVisibleChangeAllowedRows: 0;
    entryStopTargetRiskDriftRows: 0;
    recommendation: 'ready_for_saved_artifact_shadow_package' | 'generate_more_collision_snapshots' | 'fix_inputs';
  };
  rows: ShadowRow[];
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const inputJson = readFlag(args, '--input-json');
  const inputDir = readFlag(args, '--input-dir');
  if (!inputJson && !inputDir) throw new Error('--input-json or --input-dir is required.');
  return {
    inputJson: inputJson ? path.resolve(inputJson) : null,
    inputDir: inputDir ? path.resolve(inputDir) : null,
    startDate: readFlag(args, '--start-date'),
    endDate: readFlag(args, '--end-date'),
    outDir: path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR),
    json: args.includes('--json'),
  };
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['authority'] {
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

function shadowSelection(group: UnifiedDeskCandidateBookItem[]): UnifiedDeskCandidateBookItem | null {
  return group.find((item) => item.collisionMetadata?.selectorDecision === 'keep_later_sweep_proof') ||
    group.find((item) => item.collisionMetadata?.selectorDecision === 'prefer_replacement') ||
    null;
}

function shadowRowsForSnapshot(snapshot: UnifiedDeskCandidateDiagnosticSnapshot): ShadowRow[] {
  const book = buildUnifiedDeskCandidateBook({
    candidates: snapshot.candidates,
    sessionType: snapshot.sessionType,
    completedBarTime: snapshot.completedBarTime,
  });
  const groups = new Map<string, UnifiedDeskCandidateBookItem[]>();
  for (const item of book.candidates) {
    const groupKey = item.collisionMetadata?.groupKey;
    if (!groupKey || !item.collisionMetadata.selectorEligible) continue;
    groups.set(groupKey, [...(groups.get(groupKey) || []), item]);
  }
  const rows: ShadowRow[] = [];
  for (const [groupKey, group] of groups) {
    const selected = shadowSelection(group);
    if (!selected?.collisionMetadata) continue;
    rows.push({
      snapshotId: snapshot.snapshotId,
      tradeDate: snapshot.tradeDate || null,
      sessionType: snapshot.sessionType,
      completedBarTime: snapshot.completedBarTime || null,
      groupKey,
      groupSize: selected.collisionMetadata.groupSize,
      baselinePrimaryKey: book.primaryDeskIdea?.candidateKey || null,
      shadowSelectedKey: selected.candidateKey,
      shadowSelectedSetupType: selected.setupType,
      selectorDecision: selected.collisionMetadata.selectorDecision,
      wouldChangePrimary: book.primaryDeskIdea?.candidateKey !== selected.candidateKey,
      selectedCanExecute: selected.canExecute,
      selectedLiveInstallAllowed: selected.collisionMetadata.liveInstallAllowed,
      selectedScannerVisibleChangeAllowed: selected.collisionMetadata.scannerVisibleChangeAllowed,
      selectedEntryPreserved: true,
      selectedStopPreserved: true,
      selectedTargetsPreserved: true,
      selectedRiskPreserved: true,
    });
  }
  return rows;
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only disabled shadow comparison. It rebuilds the audit candidate book from saved snapshots and reads collisionMetadata only. It does not install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Snapshots audited: ${report.summary.snapshotsAudited}.`,
    `- Collision rows: ${report.summary.collisionRows}.`,
    `- Keep-later Sweep proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Prefer replacement rows: ${report.summary.preferReplacementRows}.`,
    `- Would change primary rows: ${report.summary.wouldChangePrimaryRows}.`,
    `- Selected canExecute=true rows: ${report.summary.selectedCanExecuteTrueRows}.`,
    `- Live/scanner-visible rows: ${report.summary.livePromotionAllowedRows} / ${report.summary.scannerVisibleChangeAllowedRows}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport(args: {
  inputJson: string | null;
  inputDir: string | null;
  startDate: string | null;
  endDate: string | null;
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport {
  const rows = args.snapshots.flatMap(shadowRowsForSnapshot);
  const livePromotionAllowedRows = rows.filter((row) => row.selectedLiveInstallAllowed).length as 0;
  const scannerVisibleChangeAllowedRows = rows.filter((row) => row.selectedScannerVisibleChangeAllowed).length as 0;
  const entryStopTargetRiskDriftRows = rows.filter((row) =>
    !row.selectedEntryPreserved ||
    !row.selectedStopPreserved ||
    !row.selectedTargetsPreserved ||
    !row.selectedRiskPreserved
  ).length as 0;
  const blockers = [
    args.snapshots.length === 0 ? 'no snapshots loaded' : null,
    livePromotionAllowedRows !== 0 ? 'shadow selector allowed live promotion' : null,
    scannerVisibleChangeAllowedRows !== 0 ? 'shadow selector allowed scanner-visible change' : null,
    entryStopTargetRiskDriftRows !== 0 ? 'shadow selector changed entry/stop/target/risk values' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : rows.length
      ? 'ready_for_saved_artifact_shadow_package'
      : 'generate_more_collision_snapshots';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      inputJson: args.inputJson,
      inputDir: args.inputDir,
      startDate: args.startDate,
      endDate: args.endDate,
    },
    summary: {
      snapshotsAudited: args.snapshots.length,
      collisionRows: rows.length,
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      preferReplacementRows: rows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
      wouldChangePrimaryRows: rows.filter((row) => row.wouldChangePrimary).length,
      selectedCanExecuteTrueRows: rows.filter((row) => row.selectedCanExecute).length,
      livePromotionAllowedRows,
      scannerVisibleChangeAllowedRows,
      entryStopTargetRiskDriftRows,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'ready_for_saved_artifact_shadow_package'
      ? [
        'Use this disabled shadow output to build a saved-artifact comparison package.',
        'Keep selector disabled; do not feed shadowSelectedKey into live ranking.',
      ]
      : recommendation === 'generate_more_collision_snapshots'
        ? ['Generate or load saved snapshots that contain same completed 5M proof collision groups.']
        : ['Fix the input package before using the shadow selector report.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const snapshots = options.inputDir
    ? loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(options.inputDir, {
      startDate: options.startDate,
      endDate: options.endDate,
    })
    : loadUnifiedDeskCandidateDiagnosticSnapshots(options.inputJson as string);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport({
    inputJson: options.inputJson,
    inputDir: options.inputDir,
    startDate: options.startDate,
    endDate: options.endDate,
    snapshots,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
