import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';

interface AuditRow {
  ticketId: string;
  tradeDate: string;
  session: 'morning';
  setupType: 'OpeningDriveFvgContinuation';
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  bucket: OutcomeBucket;
  label: OutcomeLabel;
  oneMesPl: number | null;
  storyVerdict: string;
  htfSufficiency: string;
  overnightHigh: number | null;
  overnightLow: number | null;
  raidedOvernightHigh: boolean;
  raidedOvernightLow: boolean;
  firstOvernightHighRaidTime: string | null;
  firstOvernightLowRaidTime: string | null;
  bullishDisplacementBeforeProof?: boolean;
  strongestBullishDisplacementTime?: string | null;
  strongestBullishDisplacementScore?: number | null;
  playStory: string;
}

interface OvernightAuditReport {
  rows?: AuditRow[];
}

interface ProposalRow extends AuditRow {
  dryRunEligible: boolean;
  dryRunBlockers: string[];
  proposedCandidateLane: 'overnight_low_raid_bullish_displacement_openingdrive_long';
  scannerVisibility: 'dry_run_review_only';
  wouldPublishLive: false;
  canExecuteChanged: false;
  deskRead: string;
}

interface GroupSummary {
  key: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  noFills: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  averageRiskPoints: number | null;
}

export interface OpeningDriveOvernightLowRaidDryRunProposalReport {
  reportType: 'unified_positive_held_local_preview_openingdrive_overnight_low_raid_dry_run_proposal';
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
    livePromotionAllowed: false;
  };
  source: {
    overnightAuditReportPath: string | null;
  };
  proposedLaneContract: {
    laneId: 'overnight_low_raid_bullish_displacement_openingdrive_long';
    modelFamily: 'OpeningDriveFvgContinuation';
    direction: 'LONG';
    requiresOvernightLowRaid: true;
    requiresBullishDisplacementBeforeProof: true;
    requiresDeterministicEntryStopTargets: true;
    requiresHtfSufficiencyNotDataLimited: true;
    preservesFiveMinuteExecutionAuthority: true;
    preservesCanExecute: true;
    dryRunOnly: true;
  };
  summary: {
    sourceRows: number;
    eligibleRows: number;
    blockedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    noFills: number;
    oneMesPl: number | null;
    winRateResolved: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'user_decision_required_before_any_implementation' | 'fix_missing_inputs' | 'insufficient_bullish_source_rows';
  };
  groups: GroupSummary[];
  eligibleRows: ProposalRow[];
  blockedRows: ProposalRow[];
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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function deterministicLongGeometry(row: AuditRow): boolean {
  return [row.entry, row.stop, row.t1, row.t2, row.riskPoints].every((value) => Number.isFinite(value)) &&
    row.riskPoints > 0 &&
    row.stop < row.entry &&
    row.t1 > row.entry &&
    row.t2 > row.entry;
}

function eligibilityBlockers(row: AuditRow): string[] {
  return [
    row.setupType !== 'OpeningDriveFvgContinuation' ? 'not OpeningDriveFvgContinuation' : null,
    row.direction !== 'LONG' ? 'not long direction' : null,
    !row.raidedOvernightLow ? 'missing overnight low raid' : null,
    !row.bullishDisplacementBeforeProof ? 'missing bullish displacement before proof' : null,
    row.htfSufficiency === 'data_limited' ? 'HTF data-limited' : null,
    !deterministicLongGeometry(row) ? 'missing deterministic entry/stop/T1/T2 geometry' : null,
  ].filter((item): item is string => Boolean(item));
}

function toProposalRow(row: AuditRow): ProposalRow {
  const dryRunBlockers = eligibilityBlockers(row);
  const dryRunEligible = dryRunBlockers.length === 0;
  return {
    ...row,
    dryRunEligible,
    dryRunBlockers,
    proposedCandidateLane: 'overnight_low_raid_bullish_displacement_openingdrive_long',
    scannerVisibility: 'dry_run_review_only',
    wouldPublishLive: false,
    canExecuteChanged: false,
    deskRead: dryRunEligible
      ? 'Dry-run candidate: RTH raided overnight low, printed bullish displacement before proof, and retained deterministic 5M entry/stop/targets. Outcome is reported separately and was not used for selection.'
      : `Blocked from dry-run lane: ${dryRunBlockers.join('; ')}.`,
  };
}

function summarizeGroup(key: string, rows: ProposalRow[]): GroupSummary {
  const resolved = rows.filter((row) => row.oneMesPl !== null);
  return {
    key,
    rows: rows.length,
    winners: rows.filter((row) => row.bucket === 'winner').length,
    losses: rows.filter((row) => row.bucket === 'loss').length,
    unresolved: rows.filter((row) => row.bucket === 'unresolved').length,
    noFills: rows.filter((row) => row.label === 'no_fill').length,
    oneMesPl: sum(rows.map((row) => row.oneMesPl)),
    winRateResolved: resolved.length ? round(rows.filter((row) => row.bucket === 'winner').length / resolved.length) : null,
    averageRiskPoints: avg(rows.map((row) => row.riskPoints)),
  };
}

function groupBy(rows: ProposalRow[], keyFor: (row: ProposalRow) => string): GroupSummary[] {
  const groups = new Map<string, ProposalRow[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()].map(([key, group]) => summarizeGroup(key, group));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<OpeningDriveOvernightLowRaidDryRunProposalReport, 'markdown'>): string {
  return [
    '# OpeningDrive Overnight Low Raid Dry-Run Proposal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research. This proposes a dry-run review lane only. It does not run setupScanner, publish Discord, write Supabase, change canExecute, or alter entry/stop/target/risk rules.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Eligible dry-run rows: ${report.summary.eligibleRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Eligible W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Eligible no-fill rows: ${report.summary.noFills}.`,
    `- Eligible one-MES P/L: ${report.summary.oneMesPl ?? '-'}.`,
    `- Eligible resolved win rate: ${report.summary.winRateResolved ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Groups',
    '| Group | Rows | W/L/U | No-Fill | P/L | Win Rate | Avg Risk |',
    '|---|---:|---|---:|---:|---:|---:|',
    ...report.groups.map((row) => `| ${escapeTable(row.key)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.noFills} | ${row.oneMesPl ?? '-'} | ${row.winRateResolved ?? '-'} | ${row.averageRiskPoints ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildOpeningDriveOvernightLowRaidDryRunProposalReport(args: {
  overnightAuditReportPath: string | null;
  overnightAuditReport: OvernightAuditReport | null;
}, generatedAt = new Date().toISOString()): OpeningDriveOvernightLowRaidDryRunProposalReport {
  const sourceRows = Array.isArray(args.overnightAuditReport?.rows) ? args.overnightAuditReport.rows : [];
  const blockers = [
    !args.overnightAuditReportPath ? 'missing overnight audit report path' : null,
    !args.overnightAuditReport ? 'missing overnight audit report' : null,
    sourceRows.length === 0 ? 'overnight audit report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const proposalRows = blockers.length ? [] : sourceRows.map(toProposalRow);
  const eligibleRows = proposalRows.filter((row) => row.dryRunEligible);
  const blockedRows = proposalRows.filter((row) => !row.dryRunEligible);
  const resolved = eligibleRows.filter((row) => row.oneMesPl !== null);
  const longSourceRows = sourceRows.filter((row) => row.direction === 'LONG').length;
  const recommendation = blockers.length
    ? 'fix_missing_inputs'
    : eligibleRows.length === 0 && longSourceRows === 0
      ? 'insufficient_bullish_source_rows'
      : 'user_decision_required_before_any_implementation';
  const base: Omit<OpeningDriveOvernightLowRaidDryRunProposalReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_openingdrive_overnight_low_raid_dry_run_proposal',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
      livePromotionAllowed: false,
    },
    source: {
      overnightAuditReportPath: args.overnightAuditReportPath,
    },
    proposedLaneContract: {
      laneId: 'overnight_low_raid_bullish_displacement_openingdrive_long',
      modelFamily: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      requiresOvernightLowRaid: true,
      requiresBullishDisplacementBeforeProof: true,
      requiresDeterministicEntryStopTargets: true,
      requiresHtfSufficiencyNotDataLimited: true,
      preservesFiveMinuteExecutionAuthority: true,
      preservesCanExecute: true,
      dryRunOnly: true,
    },
    summary: {
      sourceRows: sourceRows.length,
      eligibleRows: eligibleRows.length,
      blockedRows: blockedRows.length,
      winners: eligibleRows.filter((row) => row.bucket === 'winner').length,
      losses: eligibleRows.filter((row) => row.bucket === 'loss').length,
      unresolved: eligibleRows.filter((row) => row.bucket === 'unresolved').length,
      noFills: eligibleRows.filter((row) => row.label === 'no_fill').length,
      oneMesPl: sum(eligibleRows.map((row) => row.oneMesPl)),
      winRateResolved: resolved.length ? round(eligibleRows.filter((row) => row.bucket === 'winner').length / resolved.length) : null,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    groups: [
      summarizeGroup('eligible_dry_run_lane', eligibleRows),
      ...groupBy(eligibleRows, (row) => `story_${row.storyVerdict}`),
      ...groupBy(blockedRows, (row) => `blocked_${row.dryRunBlockers[0] || 'unknown'}`),
    ],
    eligibleRows,
    blockedRows,
    blockers,
    recommendations: blockers.length
      ? ['Provide the overnight raid/displacement audit before building the dry-run proposal.']
      : eligibleRows.length === 0
        ? [
            'The current source package does not prove a bullish overnight-low OpeningDrive lane.',
            'Keep the scanner metadata contract symmetric, but do not infer bullish edge from the short-only research package.',
          ]
        : [
            'This lane is ready for user review as a dry-run design only, not live implementation.',
            'If the user approves implementation later, install it as scanner-owned dry-run metadata first and preserve all normal 5M execution, protected stop, risk, and canExecute gates.',
          ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeOpeningDriveOvernightLowRaidDryRunProposalReport(
  report: OpeningDriveOvernightLowRaidDryRunProposalReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-openingdrive-overnight-low-raid-dry-run-proposal-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function runOpeningDriveOvernightLowRaidDryRunProposalCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const overnightAuditReportPath = readFlag(args, '--overnight-audit-report') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-openingdrive-overnight-raid-displacement-audit-\d+\.json$/);
  const report = buildOpeningDriveOvernightLowRaidDryRunProposalReport({
    overnightAuditReportPath,
    overnightAuditReport: readJson<OvernightAuditReport>(overnightAuditReportPath),
  });
  const paths = writeOpeningDriveOvernightLowRaidDryRunProposalReport(report, outDir);
  if (args.includes('--json')) {
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
    runOpeningDriveOvernightLowRaidDryRunProposalCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
