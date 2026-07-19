import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

interface CliOptions {
  replayPackage: string;
  outcomeReport: string;
  outDir: string;
  json: boolean;
}

interface CandidateShape {
  setupType?: string;
  direction?: string;
  detectedStatus?: string;
  executionStatus?: string;
  blockReason?: string | null;
  rankScore?: number;
  targetRoom?: {
    targetRoomStatus?: string;
    obstacleBeforeT1?: boolean;
    targetRoomReason?: string;
  };
  evidence?: string[];
  missingEvidence?: string[];
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  setupCandidateStatus?: {
    statuses?: CandidateShape[];
  };
}

interface ArtifactShape {
  events?: Record<string, ArtifactEventShape>;
}

interface DrilldownRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeLabel: string;
  favorableR: number | null;
  adverseR: number | null;
  rankBucket: string;
  proofState: string;
  sourceTags: string[];
  targetRoomStatus: string;
  missingEvidenceCount: number;
}

interface TagSummary {
  tag: string;
  rows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  avgFavorableR: number | null;
  avgAdverseR: number | null;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_source_context_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: UnifiedPositiveHeldLocalPreviewReplayPackageReport['authority'];
  source: {
    reportDir: string;
    replayPackagePath: string;
    outcomeReportPath: string;
  };
  assumptions: {
    savedReplayPackageAndOutcomeOnly: true;
    savedScannerArtifactsOnly: true;
    outcomeIsNotRecomputed: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    replayRows: number;
    outcomeRows: number;
    joinedRows: number;
    noChaseTaggedRows: number;
    targetRoomBlockedRows: number;
    entryTriggerPendingRows: number;
    lateDayRows: number;
    noMissingEvidenceRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'use_as_negative_or_review_note_evidence_only' | 'fix_inputs';
  };
  rows: DrilldownRow[];
  tagSummaries: TagSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const replayPackage = readFlag(args, '--replay-package');
  const outcomeReport = readFlag(args, '--outcome-report');
  if (!replayPackage) throw new Error('--replay-package is required.');
  if (!outcomeReport) throw new Error('--outcome-report is required.');
  return {
    replayPackage,
    outcomeReport,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function ticketId(eventKey: string, event: ArtifactEventShape, candidate: CandidateShape): string {
  const proofTime = normalizeTime(event.eventTime) || normalizeTime(eventKey) || eventKey;
  return [
    event.date || proofTime.slice(0, 10),
    event.session || 'unknown',
    candidate.setupType || 'UnknownSetup',
    candidate.direction || 'UNKNOWN',
    proofTime.replace(/[^0-9T]/g, '').slice(0, 15),
  ].join('-');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function authority(): UnifiedPositiveHeldLocalPreviewReplayPackageReport['authority'] {
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

function candidateIndex(replayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null): Map<string, CandidateShape> {
  const index = new Map<string, CandidateShape>();
  const artifactPaths = [...new Set((replayPackage?.rows || []).map((row) => row.sourceTapePath).filter(Boolean))];
  for (const artifactPath of artifactPaths) {
    if (!fs.existsSync(artifactPath)) continue;
    const artifact = readJson<ArtifactShape>(artifactPath);
    for (const [eventKey, event] of Object.entries(artifact.events || {})) {
      for (const candidate of event.setupCandidateStatus?.statuses || []) {
        index.set(ticketId(eventKey, event, candidate), candidate);
      }
    }
  }
  return index;
}

function rankBucket(value: number): string {
  if (!Number.isFinite(value)) return 'rank_unknown';
  if (value < 220) return 'rank_lt_220';
  if (value < 250) return 'rank_220_to_249';
  if (value < 270) return 'rank_250_to_269';
  return 'rank_gte_270';
}

function proofHour(ticketIdValue: string): number | null {
  const match = ticketIdValue.match(/T(\d{2})(\d{2})(\d{2})$/);
  return match ? Number(match[1]) : null;
}

function tagsFor(row: UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number], candidate: CandidateShape | undefined): string[] {
  const missing = (candidate?.missingEvidence || []).join(' | ').toLowerCase();
  const evidence = (candidate?.evidence || []).join(' | ').toLowerCase();
  const targetRoomStatus = candidate?.targetRoom?.targetRoomStatus || 'target_room_unknown';
  return [
    missing.includes('no chase') ? 'no_chase' : null,
    targetRoomStatus === 'blocked_before_t1' || candidate?.targetRoom?.obstacleBeforeT1 ? 'target_room_blocked_before_t1' : null,
    row.proofState.includes('EntryTriggerPending') ? 'entry_trigger_pending' : null,
    proofHour(row.ticketId) !== null && (proofHour(row.ticketId) as number) >= 15 ? 'late_day_after_1500' : null,
    evidence.includes('fvg') ? 'has_fvg_evidence' : null,
    evidence.includes('mss') ? 'has_mss_evidence' : null,
    (candidate?.missingEvidence || []).length === 0 ? 'no_missing_evidence' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function buildRows(args: {
  replayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}): DrilldownRow[] {
  const outcomes = new Map((args.outcomeReport?.rows || []).map((row) => [row.ticketId, row]));
  const candidates = candidateIndex(args.replayPackage);
  return (args.replayPackage?.rows || []).map((row) => {
    const outcome = outcomes.get(row.ticketId);
    const candidate = candidates.get(row.ticketId);
    const favorableR = outcome?.maximumFavorableExcursion === null || !outcome || outcome.riskPoints <= 0
      ? null
      : round((outcome.maximumFavorableExcursion as number) / outcome.riskPoints);
    const adverseR = outcome?.maximumAdverseExcursion === null || !outcome || outcome.riskPoints <= 0
      ? null
      : round((outcome.maximumAdverseExcursion as number) / outcome.riskPoints);
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      outcomeLabel: outcome?.outcomeLabel || 'missing_outcome',
      favorableR,
      adverseR,
      rankBucket: rankBucket(row.triageScore),
      proofState: row.proofState,
      sourceTags: tagsFor(row, candidate),
      targetRoomStatus: candidate?.targetRoom?.targetRoomStatus || 'target_room_unknown',
      missingEvidenceCount: candidate?.missingEvidence?.length || 0,
    };
  }).sort((a, b) => `${a.tradeDate}-${a.session}-${a.ticketId}`.localeCompare(`${b.tradeDate}-${b.session}-${b.ticketId}`));
}

function tagSummaries(rows: DrilldownRow[]): TagSummary[] {
  const tags = new Map<string, DrilldownRow[]>();
  for (const row of rows) {
    for (const tag of row.sourceTags) {
      const existing = tags.get(tag);
      if (existing) existing.push(row);
      else tags.set(tag, [row]);
    }
  }
  return [...tags.entries()].map(([tag, tagRows]) => ({
    tag,
    rows: tagRows.length,
    noFillRows: tagRows.filter((row) => row.outcomeLabel === 'no_fill').length,
    noTargetOrStopRows: tagRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
    avgFavorableR: avg(tagRows.map((row) => row.favorableR)),
    avgAdverseR: avg(tagRows.map((row) => row.adverseR)),
  })).sort((a, b) => b.rows - a.rows || a.tag.localeCompare(b.tag));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Overlay Missing-Top Source Context Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source-context drilldown over saved replay/outcome/scanner artifacts. It does not recompute outcomes, run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- No-chase tagged rows: ${report.summary.noChaseTaggedRows}.`,
    `- Target-room blocked rows: ${report.summary.targetRoomBlockedRows}.`,
    `- Entry-trigger-pending rows: ${report.summary.entryTriggerPendingRows}.`,
    `- Late-day rows: ${report.summary.lateDayRows}.`,
    `- No-missing-evidence rows: ${report.summary.noMissingEvidenceRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Tags',
    '| Tag | Rows | No Fill | No Target/Stop | Avg Fav R | Avg Adv R |',
    '|---|---:|---:|---:|---:|---:|',
    ...report.tagSummaries.map((item) => `| ${escapeTable(item.tag)} | ${item.rows} | ${item.noFillRows} | ${item.noTargetOrStopRows} | ${item.avgFavorableR ?? '-'} | ${item.avgAdverseR ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport(args: {
  reportDir: string;
  replayPackagePath: string;
  outcomeReportPath: string;
  replayPackage: UnifiedPositiveHeldLocalPreviewReplayPackageReport | null;
  outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport {
  const rows = buildRows({ replayPackage: args.replayPackage, outcomeReport: args.outcomeReport });
  const blockers = [
    !args.replayPackage ? 'missing replay package' : null,
    !args.outcomeReport ? 'missing outcome report' : null,
    args.replayPackage && args.replayPackage.status !== 'pass' ? `replay package status ${args.replayPackage.status}` : null,
    args.outcomeReport && args.outcomeReport.status !== 'pass' ? `outcome report status ${args.outcomeReport.status}` : null,
    rows.length === 0 ? 'no joined rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_source_context_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replayPackagePath: args.replayPackagePath,
      outcomeReportPath: args.outcomeReportPath,
    },
    assumptions: {
      savedReplayPackageAndOutcomeOnly: true,
      savedScannerArtifactsOnly: true,
      outcomeIsNotRecomputed: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      replayRows: args.replayPackage?.rows.length || 0,
      outcomeRows: args.outcomeReport?.rows.length || 0,
      joinedRows: rows.length,
      noChaseTaggedRows: rows.filter((row) => row.sourceTags.includes('no_chase')).length,
      targetRoomBlockedRows: rows.filter((row) => row.sourceTags.includes('target_room_blocked_before_t1')).length,
      entryTriggerPendingRows: rows.filter((row) => row.sourceTags.includes('entry_trigger_pending')).length,
      lateDayRows: rows.filter((row) => row.sourceTags.includes('late_day_after_1500')).length,
      noMissingEvidenceRows: rows.filter((row) => row.sourceTags.includes('no_missing_evidence')).length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'use_as_negative_or_review_note_evidence_only',
    },
    rows,
    tagSummaries: tagSummaries(rows),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved replay/outcome/scanner artifact inputs before using this drilldown.']
      : [
        'Use no-chase, target-room blocked-before-T1, and late-day tags as negative/review-note evidence only.',
        'Do not promote unresolved missing-top rows from this source-context evidence.',
        'Preserve canExecute, scanner ranking, Discord/Supabase/bridge behavior, and entry/stop/target/risk math.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-source-context-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport({
    reportDir: options.outDir,
    replayPackagePath: options.replayPackage,
    outcomeReportPath: options.outcomeReport,
    replayPackage: fs.existsSync(options.replayPackage) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(options.replayPackage) : null,
    outcomeReport: fs.existsSync(options.outcomeReport) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.outcomeReport) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlaySourceContextDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
