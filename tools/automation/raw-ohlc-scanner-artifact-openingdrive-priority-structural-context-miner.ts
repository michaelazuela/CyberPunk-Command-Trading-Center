import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';
import type {
  UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport,
} from './unified-positive-held-local-preview-ready-replay-package';

interface CliOptions {
  minerReports: string[];
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

type MinerRow = RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport['rows'][number];

interface StructuralContextRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  priorityOneMesPl: number | null;
  priorityLoss: boolean;
  sourceTapePath: string | null;
  bestConditionalSetupType: string | null;
  candidateState: string | null;
  executionStatus: string | null;
  blockReason: string | null;
  targetRoomStatus: string | null;
  htfLineInSandStatus: string | null;
  timeframeMssStatus: string | null;
  riskAdvisoryStatus: string | null;
  activeCampaignLayerTags: string[];
  structuralTags: string[];
  blockers: string[];
}

interface FeatureRow {
  featureTag: string;
  rows: number;
  priorityLossRows: number;
  priorityNonLossRows: number;
  priorityOneMesPl: number | null;
  falseRejectPriorityNonLossRows: number;
  liveInitialRankInstallableNow: false;
  conclusion: 'candidate_needs_fresh_validation' | 'reject_initial_rank';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_context_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    minerReports: string[];
  };
  assumptions: {
    consumesSavedMinerReportsReplayPackagesAndScannerTapesOnly: true;
    usesProofTimeSnapshotOnly: true;
    noFutureOutcomeLabelsUsedForStructuralTags: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    minerReports: number;
    sourceRows: number;
    dedupedRows: number;
    rowsWithStructuralContext: number;
    priorityLossRows: number;
    priorityNonLossRows: number;
    candidateFeatureRows: number;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'queue_fresh_structural_validation' | 'do_not_install_structural_filter' | 'fix_inputs';
  };
  featureRows: FeatureRow[];
  rows: StructuralContextRow[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function matchingReportPaths(pattern: RegExp): string[] {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return [];
  return fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const minerReports = splitPaths(readFlag(argv, '--miner-reports')).map((item) => path.resolve(item));
  return {
    minerReports: minerReports.length
      ? minerReports
      : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner-\d+\.json$/).slice(0, 1),
    outDir,
    json: argv.includes('--json'),
  };
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function rowKey(row: MinerRow): string {
  return [
    row.priorityTicketId,
    row.tradeDate,
    row.session,
    row.proofTime,
    row.direction,
    row.prioritySetupType,
  ].join('|');
}

function packageRowsByTicket(rows: MinerRow[]): Map<string, UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport['rows'][number]> {
  const replayPackagePaths = [...new Set(rows.map((row) => row.replayPackagePath).filter((item): item is string => Boolean(item)))];
  const output = new Map<string, UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport['rows'][number]>();
  for (const replayPackagePath of replayPackagePaths) {
    if (!fs.existsSync(replayPackagePath)) continue;
    const report = readJson<UnifiedPositiveHeldLocalPreviewReadyReplayPackageReport>(replayPackagePath);
    for (const row of report.rows) output.set(row.ticketId, row);
  }
  return output;
}

function eventFor(sourceTapePath: string | null, proofTime: string): { event: Record<string, unknown> | null; blockers: string[] } {
  if (!sourceTapePath) return { event: null, blockers: ['missing source tape path'] };
  if (!fs.existsSync(sourceTapePath)) return { event: null, blockers: ['source tape path not found'] };
  const tape = readJson<Record<string, unknown>>(sourceTapePath);
  const event = asRecord(asRecord(tape.events)[proofTime]);
  if (Object.keys(event).length === 0) return { event: null, blockers: ['missing proof-time scanner event'] };
  return { event, blockers: [] };
}

function statusFor(event: Record<string, unknown> | null, row: MinerRow): Record<string, unknown> {
  const statuses = asArray(asRecord(event?.setupCandidateStatus).statuses).map(asRecord);
  return statuses.find((status) => status.setupType === row.prioritySetupType && status.direction === row.direction) ||
    statuses.find((status) => status.setupType === row.prioritySetupType) ||
    {};
}

function activeCampaignLayerTags(status: Record<string, unknown>): string[] {
  return asArray(asRecord(status.activeCampaign).evidenceLayers)
    .map(asRecord)
    .map((layer) => {
      const name = stringOrNull(layer.layer);
      const state = stringOrNull(layer.status);
      return name && state ? `campaign_${name}_${state}` : null;
    })
    .filter((tag): tag is string => Boolean(tag));
}

function structuralTags(args: {
  bestConditionalSetupType: string | null;
  candidateState: string | null;
  executionStatus: string | null;
  blockReason: string | null;
  targetRoomStatus: string | null;
  htfLineInSandStatus: string | null;
  timeframeMssStatus: string | null;
  riskAdvisoryStatus: string | null;
  activeCampaignLayerTags: string[];
}): string[] {
  return [...new Set([
    args.bestConditionalSetupType ? `best_conditional_${args.bestConditionalSetupType}` : null,
    args.candidateState ? `candidate_state_${args.candidateState}` : null,
    args.executionStatus ? `execution_status_${args.executionStatus}` : null,
    args.blockReason ? `block_reason_${args.blockReason}` : null,
    args.targetRoomStatus ? `target_room_${args.targetRoomStatus}` : null,
    args.htfLineInSandStatus ? `htf_line_in_sand_${args.htfLineInSandStatus}` : null,
    args.timeframeMssStatus ? `timeframe_mss_${args.timeframeMssStatus}` : null,
    args.riskAdvisoryStatus ? `risk_${args.riskAdvisoryStatus}` : null,
    ...args.activeCampaignLayerTags,
  ].filter((tag): tag is string => Boolean(tag)))];
}

function buildRows(minerRows: MinerRow[]): StructuralContextRow[] {
  const packageLookup = packageRowsByTicket(minerRows);
  return minerRows.map((row) => {
    const packageRow = packageLookup.get(row.priorityTicketId);
    const sourceTapePath = packageRow?.sourceTapePath || null;
    const loaded = eventFor(sourceTapePath, row.proofTime);
    const event = loaded.event;
    const status = statusFor(event, row);
    const activeRuleset = asRecord(status.activeRuleset);
    const targetRoom = asRecord(status.targetRoom);
    const scannerSummary = asRecord(event?.scannerSummary);
    const htfLineInSand = asRecord(activeRuleset.htfLineInSand);
    const timeframeMss = asRecord(activeRuleset.timeframeMss);
    const campaignTags = activeCampaignLayerTags(status);
    const base = {
      bestConditionalSetupType: stringOrNull(scannerSummary.bestConditionalSetupType),
      candidateState: stringOrNull(status.candidateState),
      executionStatus: stringOrNull(status.executionStatus),
      blockReason: stringOrNull(status.blockReason),
      targetRoomStatus: stringOrNull(targetRoom.targetRoomStatus),
      htfLineInSandStatus: stringOrNull(htfLineInSand.status),
      timeframeMssStatus: stringOrNull(timeframeMss.status),
      riskAdvisoryStatus: stringOrNull(status.riskAdvisoryStatus),
      activeCampaignLayerTags: campaignTags,
    };
    return {
      ticketId: row.priorityTicketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      prioritySetupType: row.prioritySetupType,
      priorityOneMesPl: row.priorityOneMesPl,
      priorityLoss: typeof row.priorityOneMesPl === 'number' && row.priorityOneMesPl < 0,
      sourceTapePath,
      ...base,
      structuralTags: structuralTags(base),
      blockers: [
        ...loaded.blockers,
        Object.keys(status).length === 0 ? 'missing matching priority setup status' : null,
      ].filter((item): item is string => Boolean(item)),
    };
  });
}

function buildFeatureRows(rows: StructuralContextRow[]): FeatureRow[] {
  const tags = [...new Set(rows.flatMap((row) => row.structuralTags))].sort();
  return tags.map((featureTag) => {
    const matching = rows.filter((row) => row.structuralTags.includes(featureTag));
    const priorityLossRows = matching.filter((row) => row.priorityLoss).length;
    const priorityNonLossRows = matching.length - priorityLossRows;
    return {
      featureTag,
      rows: matching.length,
      priorityLossRows,
      priorityNonLossRows,
      priorityOneMesPl: sum(matching.map((row) => row.priorityOneMesPl)),
      falseRejectPriorityNonLossRows: priorityNonLossRows,
      liveInitialRankInstallableNow: false as const,
      conclusion: priorityLossRows >= 2 && priorityNonLossRows === 0
        ? 'candidate_needs_fresh_validation' as const
        : 'reject_initial_rank' as const,
    };
  }).sort((a, b) => (
    b.priorityLossRows - a.priorityLossRows ||
    a.falseRejectPriorityNonLossRows - b.falseRejectPriorityNonLossRows ||
    a.featureTag.localeCompare(b.featureTag)
  ));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Structural Context Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only structural context miner. It consumes saved miner reports, saved replay packages, and saved scanner tapes only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Deduped rows: ${report.summary.dedupedRows}.`,
    `- Rows with structural context: ${report.summary.rowsWithStructuralContext}.`,
    `- Priority loss/non-loss rows: ${report.summary.priorityLossRows}/${report.summary.priorityNonLossRows}.`,
    `- Candidate structural feature rows: ${report.summary.candidateFeatureRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Feature Rows',
    ...report.featureRows.slice(0, 20).map((row) => `- ${row.featureTag}: rows ${row.rows}, losses ${row.priorityLossRows}, non-losses ${row.priorityNonLossRows}, P/L ${row.priorityOneMesPl}, conclusion ${row.conclusion}.`),
    '',
    '## Loss Rows',
    ...report.rows.filter((row) => row.priorityLoss).map((row) => `- ${row.tradeDate} ${row.proofTime}: P/L ${row.priorityOneMesPl}, best ${row.bestConditionalSetupType}, tags ${row.structuralTags.join(', ') || 'none'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport(args: {
  minerReports: string[];
  loadedReports: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport {
  const allRows = args.loadedReports.flatMap((report) => report.rows);
  const deduped = [...new Map(allRows.map((row) => [rowKey(row), row])).values()];
  const rows = buildRows(deduped).sort((a, b) => a.proofTime.localeCompare(b.proofTime));
  const featureRows = buildFeatureRows(rows);
  const blockers = [
    args.minerReports.length === 0 ? 'no miner reports supplied' : null,
    args.loadedReports.some((report) => report.status !== 'pass') ? 'one or more miner reports did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const candidateFeatureRows = featureRows.filter((row) => row.conclusion === 'candidate_needs_fresh_validation').length;
  const priorityLossRows = rows.filter((row) => row.priorityLoss).length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : candidateFeatureRows > 0
      ? 'queue_fresh_structural_validation'
      : 'do_not_install_structural_filter';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_context_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { minerReports: args.minerReports },
    assumptions: {
      consumesSavedMinerReportsReplayPackagesAndScannerTapesOnly: true,
      usesProofTimeSnapshotOnly: true,
      noFutureOutcomeLabelsUsedForStructuralTags: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      minerReports: args.loadedReports.length,
      sourceRows: allRows.length,
      dedupedRows: rows.length,
      rowsWithStructuralContext: rows.filter((row) => row.blockers.length === 0).length,
      priorityLossRows,
      priorityNonLossRows: rows.length - priorityLossRows,
      candidateFeatureRows,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    featureRows,
    rows,
    blockers,
    recommendations: recommendation === 'queue_fresh_structural_validation'
      ? ['Candidate structural tags remain research-only; validate on fresh unseen scanner artifacts before any scanner-visible rank penalty.']
      : recommendation === 'do_not_install_structural_filter'
        ? ['No structural tag cleanly separated priority losses from non-loss rows; do not install a scanner-visible structural filter.']
        : ['Fix miner report inputs before interpreting structural context output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerCli(
  options = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerArgs(),
): RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport {
  const loadedReports = options.minerReports.map((reportPath) =>
    readJson<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport>(reportPath));
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport({
    minerReports: options.minerReports,
    loadedReports,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const jsonPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  if (options.json) {
    console.log(JSON.stringify({
      status: report.status,
      jsonPath,
      summary: report.summary,
      featureRows: report.featureRows,
      blockers: report.blockers,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nSaved: ${jsonPath}`);
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerCli();
}
