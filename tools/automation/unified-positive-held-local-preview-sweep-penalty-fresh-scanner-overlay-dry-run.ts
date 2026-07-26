import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport,
} from './unified-positive-held-local-preview-sweep-penalty-scanner-overlay-readiness';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];

interface OverlayCandidate {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  baselineScore: number;
  overlayScore: number;
  baselineRank: number;
  overlayRank: number;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
  overlayPenaltyApplied: boolean;
  normalScannerOutputPreserved: true;
  scannerVisibleEligible: false;
}

interface OverlaySlate {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopSetupType: string | null;
  baselineTopOneMesPl: number | null;
  overlayTopTicketId: string | null;
  overlayTopSetupType: string | null;
  overlayTopOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
  changedFromInvalidStopSweep: boolean;
  changedToProtectedDestination: boolean;
}

interface JoinedOverlayRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  proofToEntryMinutes: number | null;
  entryHitTime: string | null;
  modelPriority: number | null;
  proofPriority: number | null;
  executionStatus: string;
  blockReason: string;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_overlay_dry_run';
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
    sourceProofTimingPath: string | null;
    intakeTriagePath: string | null;
    readinessPath: string | null;
    scannerDryRunReplayPath: string | null;
  };
  assumptions: {
    freshOverlayDryRunOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    invalidStopSweepPenaltyOnly: true;
    normalScannerOutputPreserved: true;
    noOverlayInstalled: true;
    noLiveScannerRun: true;
    noLiveFilterInstalled: true;
    noRankPenaltyInstalled: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  scoring: {
    invalidStopSweepPenaltyPoints: number;
    baselineDoesNotUseOutcome: true;
  };
  summary: {
    sourceRows: number;
    joinedRows: number;
    sweepRows: number;
    validSweepLeadRows: number;
    invalidStopSweepPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    overlayPenaltyRows: number;
    slates: number;
    changedSlates: number;
    changedFromInvalidStopSweepSlates: number;
    changedToProtectedDestinationSlates: number;
    baselineTopOneMesPl: number | null;
    overlayTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    scannerDryRunRows: number;
    scannerZeroLivePublishBehaviorChangeRows: number;
    scannerBlockedRows: number;
    recommendedAction: 'research_overlay_candidate_ready_for_live_proposal' | 'keep_research_only' | 'reject_overlay_for_now';
    livePromotionAllowedRows: 0;
  };
  slates: OverlaySlate[];
  rows: OverlayCandidate[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP_SETUP = 'NoInstalledSetup';
const PENALTY_POINTS = 18;

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function validSweepLead(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  return row.setupType === SWEEP_SETUP && row.executionStatus === 'Conditional' && row.blockReason === 'EntryTriggerPending';
}

function invalidStopSweepPenaltyCandidate(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  return row.setupType === SWEEP_SETUP && row.executionStatus === 'Blocked' && row.blockReason === 'InvalidStopLocation';
}

function baseScore(row: {
  modelPriority: number | null;
  proofPriority: number | null;
  riskPoints: number;
  entryHitTime: string | null;
  proofToEntryMinutes: number | null;
}): number {
  const model = row.modelPriority ?? 50;
  const proof = row.proofPriority ?? 45;
  const risk = row.riskPoints <= 8 ? 10 : row.riskPoints <= 12 ? 6 : row.riskPoints <= 16 ? 2 : 0;
  const fill = row.entryHitTime ? 3 : 0;
  const timing = row.proofToEntryMinutes === null ? 0 : row.proofToEntryMinutes <= 15 ? 4 : row.proofToEntryMinutes <= 30 ? 1 : -3;
  return round(model + (proof * 0.45) + risk + fill + timing);
}

function joinedRows(timingRows: TimingRow[], intakeRows: IntakeRow[]): JoinedOverlayRow[] {
  const intakeById = new Map<string, IntakeRow>(intakeRows.map((row) => [row.intakeId, row]));
  return timingRows.map((row) => {
    const intake = intakeById.get(row.ticketId);
    const joined = {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      outcomeBucket: row.outcomeBucket,
      resolvedOneMesPl: row.resolvedOneMesPl,
      riskPoints: row.riskPoints,
      proofToEntryMinutes: row.proofToEntryMinutes,
      entryHitTime: row.entryHitTime,
      modelPriority: numberOrNull(intake?.modelPriority),
      proofPriority: numberOrNull(intake?.proofPriority),
      executionStatus: stringValue(intake?.executionStatus, 'execution_unknown'),
      blockReason: stringValue(intake?.blockReason, 'block_none'),
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: false,
    };
    return {
      ...joined,
      validSweepLead: validSweepLead(joined),
      invalidStopSweepPenaltyCandidate: invalidStopSweepPenaltyCandidate(joined),
    };
  });
}

function compareRows(a: { row: JoinedOverlayRow; score: number }, b: { row: JoinedOverlayRow; score: number }): number {
  return b.score - a.score || a.row.tradeDate.localeCompare(b.row.tradeDate) || a.row.ticketId.localeCompare(b.row.ticketId);
}

function groupBySlate(rows: JoinedOverlayRow[]): Map<string, JoinedOverlayRow[]> {
  const groups = new Map<string, JoinedOverlayRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function buildOverlay(rows: JoinedOverlayRow[]): { rows: OverlayCandidate[]; slates: OverlaySlate[] } {
  const outputRows: OverlayCandidate[] = [];
  const slates: OverlaySlate[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const baseline = slateRows.map((row) => ({ row, score: baseScore(row) })).sort(compareRows);
    const overlay = slateRows.map((row) => ({ row, score: round(baseScore(row) - (row.invalidStopSweepPenaltyCandidate ? PENALTY_POINTS : 0)) })).sort(compareRows);
    const baselineRanks = new Map(baseline.map((item, index) => [item.row.ticketId, index + 1]));
    const overlayRanks = new Map(overlay.map((item, index) => [item.row.ticketId, index + 1]));
    const baselineTop = baseline[0]?.row || null;
    const overlayTop = overlay[0]?.row || null;
    for (const row of slateRows) {
      const baselineScore = baseScore(row);
      outputRows.push({
        ...row,
        baselineScore,
        overlayScore: round(baselineScore - (row.invalidStopSweepPenaltyCandidate ? PENALTY_POINTS : 0)),
        baselineRank: baselineRanks.get(row.ticketId) ?? 0,
        overlayRank: overlayRanks.get(row.ticketId) ?? 0,
        overlayPenaltyApplied: row.invalidStopSweepPenaltyCandidate,
        normalScannerOutputPreserved: true,
        scannerVisibleEligible: false,
      });
    }
    const baselinePl = baselineTop?.resolvedOneMesPl ?? null;
    const overlayPl = overlayTop?.resolvedOneMesPl ?? null;
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      baselineTopTicketId: baselineTop?.ticketId || null,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopOneMesPl: baselinePl,
      overlayTopTicketId: overlayTop?.ticketId || null,
      overlayTopSetupType: overlayTop?.setupType || null,
      overlayTopOneMesPl: overlayPl,
      topChanged: baselineTop?.ticketId !== overlayTop?.ticketId,
      deltaOneMesPl: baselinePl === null || overlayPl === null ? null : round(overlayPl - baselinePl),
      changedFromInvalidStopSweep: Boolean(baselineTop?.invalidStopSweepPenaltyCandidate && baselineTop.ticketId !== overlayTop?.ticketId),
      changedToProtectedDestination: Boolean(overlayTop && (overlayTop.validSweepLead || overlayTop.setupType !== SWEEP_SETUP)),
    });
  }
  return {
    rows: outputRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.overlayRank - b.overlayRank),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Fresh Scanner Overlay Dry-Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only fresh scanner overlay dry-run. It does not install overlays, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Valid Sweep lead rows: ${report.summary.validSweepLeadRows}.`,
    `- Invalid-stop Sweep penalty rows: ${report.summary.invalidStopSweepPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- Overlay penalty rows: ${report.summary.overlayPenaltyRows}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Top selection P/L baseline/overlay: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.overlayTopOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Scanner zero-live-publish rows: ${report.summary.scannerZeroLivePublishBehaviorChangeRows}/${report.summary.scannerDryRunRows}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Changed Slates',
    '| Slate | Baseline Top | Baseline Model | Baseline P/L | Overlay Top | Overlay Model | Overlay P/L | Delta |',
    '|---|---|---|---:|---|---|---:|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.baselineTopTicketId ?? '-')} | ${escapeTable(row.baselineTopSetupType ?? '-')} | ${row.baselineTopOneMesPl ?? '-'} | ${escapeTable(row.overlayTopTicketId ?? '-')} | ${escapeTable(row.overlayTopSetupType ?? '-')} | ${row.overlayTopOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
  readinessPath: string | null;
  readinessReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport | null;
  scannerDryRunReplayPath: string | null;
  scannerDryRunReplayReport: UnifiedPositiveScannerDryRunReplayReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport {
  const sourceRows = args.sourceProofTimingReport?.rows || [];
  const intakeRows = args.intakeTriageReport?.rows || [];
  const joined = joinedRows(sourceRows, intakeRows);
  const overlay = buildOverlay(joined);
  const changed = overlay.slates.filter((row) => row.topChanged);
  const baselineTopOneMesPl = sum(overlay.slates.map((row) => row.baselineTopOneMesPl));
  const overlayTopOneMesPl = sum(overlay.slates.map((row) => row.overlayTopOneMesPl));
  const delta = baselineTopOneMesPl === null || overlayTopOneMesPl === null ? null : round(overlayTopOneMesPl - baselineTopOneMesPl);
  const validSweepLeadRowsPenalized = overlay.rows.filter((row) => row.validSweepLead && row.overlayPenaltyApplied).length;
  const scanner = args.scannerDryRunReplayReport;
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    !args.readinessPath ? 'missing scanner overlay readiness path' : null,
    !args.readinessReport ? 'missing scanner overlay readiness report' : null,
    args.readinessReport && args.readinessReport.status !== 'pass' ? `scanner overlay readiness status ${args.readinessReport.status}` : null,
    args.readinessReport && args.readinessReport.summary.recommendedAction !== 'ready_for_fresh_research_scanner_overlay_dry_run' ? `scanner overlay readiness action ${args.readinessReport.summary.recommendedAction}` : null,
    !args.scannerDryRunReplayPath ? 'missing scanner dry-run replay path' : null,
    !scanner ? 'missing scanner dry-run replay report' : null,
    scanner && scanner.status !== 'pass' ? `scanner dry-run replay status ${scanner.status}` : null,
    scanner && scanner.summary.blockedRows !== 0 ? 'scanner dry-run has blocked rows' : null,
    scanner && scanner.summary.pairedDryRunRows !== scanner.summary.zeroLivePublishBehaviorChangeRows ? 'scanner dry-run would change live publish behavior' : null,
    joined.length === 0 ? 'no joined scanner overlay rows' : null,
    validSweepLeadRowsPenalized > 0 ? 'valid Sweep lead row was penalized' : null,
    changed.some((row) => !row.changedFromInvalidStopSweep) ? 'one or more changed slates did not start from invalid-stop Sweep' : null,
    changed.some((row) => !row.changedToProtectedDestination) ? 'one or more changed slates did not land on a valid Sweep lead or alternate model' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = blockers.length ? 'reject_overlay_for_now' : (delta ?? 0) >= 0 && changed.length > 0 ? 'research_overlay_candidate_ready_for_live_proposal' : 'keep_research_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_overlay_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      intakeTriagePath: args.intakeTriagePath,
      readinessPath: args.readinessPath,
      scannerDryRunReplayPath: args.scannerDryRunReplayPath,
    },
    assumptions: {
      freshOverlayDryRunOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      invalidStopSweepPenaltyOnly: true,
      normalScannerOutputPreserved: true,
      noOverlayInstalled: true,
      noLiveScannerRun: true,
      noLiveFilterInstalled: true,
      noRankPenaltyInstalled: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    scoring: {
      invalidStopSweepPenaltyPoints: PENALTY_POINTS,
      baselineDoesNotUseOutcome: true,
    },
    summary: {
      sourceRows: sourceRows.length,
      joinedRows: joined.length,
      sweepRows: joined.filter((row) => row.setupType === SWEEP_SETUP).length,
      validSweepLeadRows: joined.filter((row) => row.validSweepLead).length,
      invalidStopSweepPenaltyRows: joined.filter((row) => row.invalidStopSweepPenaltyCandidate).length,
      validSweepLeadRowsPenalized,
      overlayPenaltyRows: overlay.rows.filter((row) => row.overlayPenaltyApplied).length,
      slates: overlay.slates.length,
      changedSlates: changed.length,
      changedFromInvalidStopSweepSlates: changed.filter((row) => row.changedFromInvalidStopSweep).length,
      changedToProtectedDestinationSlates: changed.filter((row) => row.changedToProtectedDestination).length,
      baselineTopOneMesPl,
      overlayTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      scannerDryRunRows: scanner?.summary.pairedDryRunRows || 0,
      scannerZeroLivePublishBehaviorChangeRows: scanner?.summary.zeroLivePublishBehaviorChangeRows || 0,
      scannerBlockedRows: scanner?.summary.blockedRows || 0,
      recommendedAction: rec,
      livePromotionAllowedRows: 0,
    },
    slates: overlay.slates,
    rows: overlay.rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this overlay dry-run until all blockers are cleared.']
      : rec === 'research_overlay_candidate_ready_for_live_proposal'
        ? [
          'Prepare a live-facing proposal for an invalid-stop Sweep rank penalty, but do not install it without separate approval.',
          'The proposal must preserve valid Conditional/EntryTriggerPending Sweep rows and all alternate model selection behavior proven here.',
        ]
        : ['Keep the invalid-stop Sweep penalty research-only and gather more overlay evidence.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const readinessPath = readFlag(args, '--readiness') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-scanner-overlay-readiness-\d+\.json$/);
  const scannerDryRunReplayPath = readFlag(args, '--scanner-dry-run-replay') || latestMatchingFile(outDir, /^unified-positive-scanner-dry-run-replay-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath) : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath) ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath) : null,
    readinessPath,
    readinessReport: readinessPath && fs.existsSync(readinessPath) ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport>(readinessPath) : null,
    scannerDryRunReplayPath,
    scannerDryRunReplayReport: scannerDryRunReplayPath && fs.existsSync(scannerDryRunReplayPath) ? readJson<UnifiedPositiveScannerDryRunReplayReport>(scannerDryRunReplayPath) : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
