import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  replayPackageOutcome: string;
  setupType: string;
  outDir: string;
  json: boolean;
}

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  outcomeStatus: string;
  outcomeLabel: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  entryHitTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  resolvedOneMesPl: number | null;
}

type PolicyName = 'earliest_only' | 'earliest_plus_post_stop_reentry' | 'oracle_first_non_loss';

interface PolicySummary {
  policy: PolicyName;
  selectedRows: number;
  winners: number;
  losses: number;
  unresolved: number;
  grossOneMesPl: number | null;
}

interface CampaignRow {
  campaignId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  rows: number;
  firstProofTime: string;
  lastProofTime: string;
  earliestTicketId: string | null;
  earliestOutcomeLabel: string | null;
  earliestOneMesPl: number | null;
  postStopReentryTicketId: string | null;
  postStopReentryProofTime: string | null;
  postStopReentryOneMesPl: number | null;
  oracleFirstNonLossTicketId: string | null;
  oracleFirstNonLossOneMesPl: number | null;
  suppressibleDuplicateRows: number;
  hasStopThenLaterTarget: boolean;
  recommendation: 'no_reentry_needed' | 'review_post_stop_reentry_evidence' | 'loss_cluster_no_reentry';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_reentry_simulation';
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
    replayPackageOutcome: string;
    setupType: string;
  };
  assumptions: {
    consumesSavedReplayOutcomeOnly: true;
    campaignKeyUsesExactModelDirectionAndLevels: true;
    postStopReentryRequiresProofAfterStopHit: true;
    oracleFirstNonLossIsResearchOnlyHindsight: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputRows: number;
    setupRows: number;
    campaigns: number;
    campaignsWithDuplicateRows: number;
    suppressibleDuplicateRows: number;
    campaignsWithStopThenLaterTarget: number;
    campaignsWithPostStopReentry: number;
    earliestOnly: PolicySummary;
    earliestPlusPostStopReentry: PolicySummary;
    oracleFirstNonLoss: PolicySummary;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'keep_researching_reentry_policy' | 'do_not_install_reentry_policy' | 'fix_inputs';
  };
  campaigns: CampaignRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  const matches = fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const replayPackageOutcome = readFlag(argv, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  if (!replayPackageOutcome) throw new Error('--replay-package-outcome is required.');
  return {
    replayPackageOutcome: path.resolve(replayPackageOutcome),
    setupType: readFlag(argv, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport['authority'] {
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

function timeMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function levelKey(value: number): string {
  return value.toFixed(2);
}

function campaignId(row: OutcomeRow): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    levelKey(row.entry),
    levelKey(row.stop),
    levelKey(row.t1),
    levelKey(row.t2),
  ].join('|');
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isLoss(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function policySummary(policy: PolicyName, selected: OutcomeRow[]): PolicySummary {
  return {
    policy,
    selectedRows: selected.length,
    winners: selected.filter(isWinner).length,
    losses: selected.filter(isLoss).length,
    unresolved: selected.filter((row) => row.outcomeStatus !== 'resolved').length,
    grossOneMesPl: sum(selected.map((row) => row.resolvedOneMesPl)),
  };
}

function firstResolved(rows: OutcomeRow[]): OutcomeRow | null {
  return rows.find((row) => row.outcomeStatus === 'resolved') || null;
}

function firstNonLoss(rows: OutcomeRow[]): OutcomeRow | null {
  return rows.find((row) => row.outcomeStatus === 'resolved' && !isLoss(row)) || null;
}

function firstPostStopReentry(rows: OutcomeRow[], lead: OutcomeRow | null): OutcomeRow | null {
  if (!lead?.stopHitTime || !isLoss(lead)) return null;
  const stopMs = timeMs(lead.stopHitTime);
  return rows.find((row) =>
    row.ticketId !== lead.ticketId &&
    row.outcomeStatus === 'resolved' &&
    timeMs(row.proofTime) > stopMs) || null;
}

function hasStopThenLaterTarget(row: OutcomeRow | null): boolean {
  if (!row?.stopHitTime) return false;
  const stopMs = timeMs(row.stopHitTime);
  return Boolean((row.t1HitTime && timeMs(row.t1HitTime) > stopMs) || (row.t2HitTime && timeMs(row.t2HitTime) > stopMs));
}

function campaignRecommendation(lead: OutcomeRow | null, reentry: OutcomeRow | null): CampaignRow['recommendation'] {
  if (!lead || !isLoss(lead)) return 'no_reentry_needed';
  if (reentry) return 'review_post_stop_reentry_evidence';
  return 'loss_cluster_no_reentry';
}

function buildCampaignRows(rows: OutcomeRow[]): CampaignRow[] {
  const grouped = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const id = campaignId(row);
    const group = grouped.get(id) || [];
    group.push(row);
    grouped.set(id, group);
  }
  return [...grouped.entries()].map(([id, group]) => {
    const sorted = [...group].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
    const lead = firstResolved(sorted);
    const reentry = firstPostStopReentry(sorted, lead);
    const oracle = firstNonLoss(sorted);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return {
      campaignId: id,
      tradeDate: first.tradeDate,
      session: first.session,
      setupType: first.setupType,
      direction: first.direction,
      entry: first.entry,
      stop: first.stop,
      t1: first.t1,
      t2: first.t2,
      rows: sorted.length,
      firstProofTime: first.proofTime,
      lastProofTime: last.proofTime,
      earliestTicketId: lead?.ticketId || null,
      earliestOutcomeLabel: lead?.outcomeLabel || null,
      earliestOneMesPl: lead?.resolvedOneMesPl ?? null,
      postStopReentryTicketId: reentry?.ticketId || null,
      postStopReentryProofTime: reentry?.proofTime || null,
      postStopReentryOneMesPl: reentry?.resolvedOneMesPl ?? null,
      oracleFirstNonLossTicketId: oracle?.ticketId || null,
      oracleFirstNonLossOneMesPl: oracle?.resolvedOneMesPl ?? null,
      suppressibleDuplicateRows: Math.max(0, sorted.length - 1),
      hasStopThenLaterTarget: hasStopThenLaterTarget(lead),
      recommendation: campaignRecommendation(lead, reentry),
    };
  }).sort((a, b) => timeMs(a.firstProofTime) - timeMs(b.firstProofTime));
}

function selectedForPolicy(rows: OutcomeRow[], policy: PolicyName): OutcomeRow[] {
  const grouped = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const id = campaignId(row);
    const group = grouped.get(id) || [];
    group.push(row);
    grouped.set(id, group);
  }
  return [...grouped.values()].flatMap((group) => {
    const sorted = [...group].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
    const lead = firstResolved(sorted);
    if (!lead) return [];
    if (policy === 'earliest_only') return [lead];
    if (policy === 'oracle_first_non_loss') return [firstNonLoss(sorted) || lead];
    const reentry = firstPostStopReentry(sorted, lead);
    return reentry ? [lead, reentry] : [lead];
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Campaign Reentry Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research simulation. It consumes saved replay outcomes and does not change scanner behavior, canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk math, or live promotion.',
    '',
    '## Summary',
    '',
    `- Setup: ${report.source.setupType}.`,
    `- Campaigns: ${report.summary.campaigns}.`,
    `- Duplicate campaigns / suppressible rows: ${report.summary.campaignsWithDuplicateRows}/${report.summary.suppressibleDuplicateRows}.`,
    `- Stop-then-later-target campaigns: ${report.summary.campaignsWithStopThenLaterTarget}.`,
    `- Post-stop reentry campaigns: ${report.summary.campaignsWithPostStopReentry}.`,
    `- Earliest-only P/L: ${report.summary.earliestOnly.grossOneMesPl}.`,
    `- Earliest plus post-stop reentry P/L: ${report.summary.earliestPlusPostStopReentry.grossOneMesPl}.`,
    `- Oracle first non-loss P/L: ${report.summary.oracleFirstNonLoss.grossOneMesPl}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Campaigns Needing Review',
    '',
    ...report.campaigns
      .filter((row) => row.recommendation !== 'no_reentry_needed')
      .map((row) => `- ${row.tradeDate} ${row.session} ${row.direction} ${row.firstProofTime}-${row.lastProofTime}: rows ${row.rows}, earliest ${row.earliestOneMesPl}, reentry ${row.postStopReentryOneMesPl ?? 'none'}, ${row.recommendation}.`),
    '',
    '## Recommendations',
    '',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport(args: {
  replayPackageOutcomePath: string;
  setupType: string;
  replayPackageOutcome: { rows?: OutcomeRow[]; status?: string };
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport {
  const inputRows = Array.isArray(args.replayPackageOutcome.rows) ? args.replayPackageOutcome.rows : [];
  const setupRows = inputRows.filter((row) => row.setupType === args.setupType);
  const campaigns = buildCampaignRows(setupRows);
  const earliestOnly = policySummary('earliest_only', selectedForPolicy(setupRows, 'earliest_only'));
  const earliestPlusPostStopReentry = policySummary('earliest_plus_post_stop_reentry', selectedForPolicy(setupRows, 'earliest_plus_post_stop_reentry'));
  const oracleFirstNonLoss = policySummary('oracle_first_non_loss', selectedForPolicy(setupRows, 'oracle_first_non_loss'));
  const blockers = [
    args.replayPackageOutcome.status && args.replayPackageOutcome.status !== 'pass' ? 'replay package outcome report did not pass' : null,
    setupRows.length === 0 ? `no rows found for ${args.setupType}` : null,
  ].filter((item): item is string => Boolean(item));
  const campaignsWithPostStopReentry = campaigns.filter((row) => row.postStopReentryTicketId).length;
  const recommendation = blockers.length
    ? 'fix_inputs'
    : campaignsWithPostStopReentry > 0
      ? 'keep_researching_reentry_policy'
      : 'do_not_install_reentry_policy';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_reentry_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      replayPackageOutcome: args.replayPackageOutcomePath,
      setupType: args.setupType,
    },
    assumptions: {
      consumesSavedReplayOutcomeOnly: true,
      campaignKeyUsesExactModelDirectionAndLevels: true,
      postStopReentryRequiresProofAfterStopHit: true,
      oracleFirstNonLossIsResearchOnlyHindsight: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputRows: inputRows.length,
      setupRows: setupRows.length,
      campaigns: campaigns.length,
      campaignsWithDuplicateRows: campaigns.filter((row) => row.suppressibleDuplicateRows > 0).length,
      suppressibleDuplicateRows: campaigns.reduce((total, row) => total + row.suppressibleDuplicateRows, 0),
      campaignsWithStopThenLaterTarget: campaigns.filter((row) => row.hasStopThenLaterTarget).length,
      campaignsWithPostStopReentry,
      earliestOnly,
      earliestPlusPostStopReentry,
      oracleFirstNonLoss,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    campaigns,
    blockers,
    recommendations: recommendation === 'keep_researching_reentry_policy'
      ? [
        'Do not install live re-entry behavior from this research simulation.',
        'Next phase should inspect the post-stop re-entry campaign rows and confirm whether their proof is genuinely fresh completed 5M proof after the stop.',
        'Keep one scanner-owned ticket behavior unchanged until a separate approval contract proves no Discord, canExecute, entry, stop, target, or risk drift.',
      ]
      : ['Do not install a re-entry policy from this report.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-campaign-reentry-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport({
    replayPackageOutcomePath: options.replayPackageOutcome,
    setupType: options.setupType,
    replayPackageOutcome: readJson(options.replayPackageOutcome),
  });
  const paths = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${paths.jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
