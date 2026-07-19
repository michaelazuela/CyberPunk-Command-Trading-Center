import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-approval-contract';

type OutcomeRow = UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow;

interface CliOptions {
  replayPackageOutcome: string;
  approvalContract: string | null;
  setupType: string;
  outDir: string;
  json: boolean;
}

interface DaySessionModelRow {
  tradeDate: string;
  session: string;
  setupType: string;
  currentRows: number;
  currentLosses: number;
  currentOneMesPl: number | null;
  dedupedRows: number;
  dedupedLosses: number;
  dedupedOneMesPl: number | null;
  suppressedDuplicateRows: number;
  deltaOneMesPl: number | null;
}

interface ComparisonRow {
  ticketId: string;
  campaignId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  outcomeLabel: OutcomeRow['outcomeLabel'];
  outcomeStatus: OutcomeRow['outcomeStatus'];
  resolvedOneMesPl: number | null;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  dryRunDecision: 'selected_campaign_lead' | 'suppressed_duplicate_campaign_row' | 'not_target_setup';
  preservesEntryStopTargetRisk: true;
  changesCanExecute: false;
  changesDiscordPosting: false;
  livePromotionAllowed: false;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_dry_run_comparison';
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
    approvalContract: string | null;
    setupType: string;
  };
  assumptions: {
    consumesSavedFreshScannerOutcomeOnly: true;
    exactCampaignKeyUsesModelDirectionAndLevels: true;
    earliestResolvedRowIsCampaignLead: true;
    suppressesDuplicatesOnlyInsideExactCampaign: true;
    noScannerVisibleInstall: true;
    livePromotionAllowed: false;
  };
  summary: {
    currentRows: number;
    targetSetupRows: number;
    campaigns: number;
    currentLosses: number;
    currentOneMesPl: number | null;
    dedupedRows: number;
    dedupedLosses: number;
    dedupedOneMesPl: number | null;
    suppressedDuplicateRows: number;
    deltaOneMesPl: number | null;
    approvalContractSelectedRows: number | null;
    selectedRowsMatchApprovalContract: boolean | null;
    entryStopTargetRiskDriftRows: 0;
    canExecuteChangeRows: 0;
    discordPostingChangeRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation:
      | 'dry_run_supports_earliest_only_campaign_dedupe'
      | 'dry_run_needs_more_evidence'
      | 'fix_inputs';
  };
  daySessionModelRows: DaySessionModelRow[];
  rows: ComparisonRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'SweepMssFvgRetrace';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  return fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const replayPackageOutcome = readFlag(argv, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  if (!replayPackageOutcome) throw new Error('--replay-package-outcome is required.');
  return {
    replayPackageOutcome: path.resolve(replayPackageOutcome),
    approvalContract: readFlag(argv, '--approval-contract') ||
      latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-approval-contract-\d+\.json$/),
    setupType: readFlag(argv, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport['authority'] {
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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function levelKey(value: number): string {
  return value.toFixed(2);
}

function campaignId(row: Pick<OutcomeRow, 'tradeDate' | 'session' | 'setupType' | 'direction' | 'entry' | 'stop' | 't1' | 't2'>): string {
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

function isLoss(row: Pick<OutcomeRow, 'outcomeStatus' | 'outcomeLabel'>): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function buildRows(outcomeRows: OutcomeRow[], setupType: string): ComparisonRow[] {
  const selectedByCampaign = new Set<string>();
  return [...outcomeRows]
    .sort((a, b) => `${campaignId(a)}|${timeMs(a.proofTime)}|${a.ticketId}`.localeCompare(`${campaignId(b)}|${timeMs(b.proofTime)}|${b.ticketId}`))
    .map((row) => {
      const id = campaignId(row);
      let dryRunDecision: ComparisonRow['dryRunDecision'] = 'not_target_setup';
      if (row.setupType === setupType && row.outcomeStatus === 'resolved') {
        dryRunDecision = selectedByCampaign.has(id) ? 'suppressed_duplicate_campaign_row' : 'selected_campaign_lead';
        selectedByCampaign.add(id);
      }
      return {
        ticketId: row.ticketId,
        campaignId: id,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        proofTime: row.proofTime,
        outcomeLabel: row.outcomeLabel,
        outcomeStatus: row.outcomeStatus,
        resolvedOneMesPl: row.resolvedOneMesPl,
        entry: row.entry,
        stop: row.stop,
        t1: row.t1,
        t2: row.t2,
        riskPoints: row.riskPoints,
        dryRunDecision,
        preservesEntryStopTargetRisk: true,
        changesCanExecute: false,
        changesDiscordPosting: false,
        livePromotionAllowed: false,
      };
    });
}

function groupRows(rows: ComparisonRow[]): DaySessionModelRow[] {
  const grouped = new Map<string, ComparisonRow[]>();
  for (const row of rows) {
    if (row.dryRunDecision === 'not_target_setup') continue;
    const key = `${row.tradeDate}|${row.session}|${row.setupType}`;
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  return [...grouped.entries()]
    .map(([key, group]) => {
      const [tradeDate, session, setupType] = key.split('|');
      const deduped = group.filter((row) => row.dryRunDecision === 'selected_campaign_lead');
      const currentOneMesPl = sum(group.map((row) => row.resolvedOneMesPl));
      const dedupedOneMesPl = sum(deduped.map((row) => row.resolvedOneMesPl));
      return {
        tradeDate,
        session,
        setupType,
        currentRows: group.length,
        currentLosses: group.filter(isLoss).length,
        currentOneMesPl,
        dedupedRows: deduped.length,
        dedupedLosses: deduped.filter(isLoss).length,
        dedupedOneMesPl,
        suppressedDuplicateRows: group.filter((row) => row.dryRunDecision === 'suppressed_duplicate_campaign_row').length,
        deltaOneMesPl: currentOneMesPl === null || dedupedOneMesPl === null ? null : round(dedupedOneMesPl - currentOneMesPl),
      };
    })
    .sort((a, b) => `${a.tradeDate}|${a.session}|${a.setupType}`.localeCompare(`${b.tradeDate}|${b.session}|${b.setupType}`));
}

function approvalSelectedIds(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport | null): Set<string> | null {
  return report ? new Set(report.rows.map((row) => row.selectedTicketId).filter((value): value is string => Boolean(value))) : null;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Campaign Dedupe Dry-Run Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only dry run over saved fresh scanner outcome rows. It does not install scanner-visible dedupe, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Target setup: ${report.source.setupType}.`,
    `- Current target rows: ${report.summary.targetSetupRows}.`,
    `- Campaigns: ${report.summary.campaigns}.`,
    `- Current rows/losses/P/L: ${report.summary.targetSetupRows}/${report.summary.currentLosses}/${report.summary.currentOneMesPl}.`,
    `- Deduped rows/losses/P/L: ${report.summary.dedupedRows}/${report.summary.dedupedLosses}/${report.summary.dedupedOneMesPl}.`,
    `- Suppressed duplicate rows: ${report.summary.suppressedDuplicateRows}.`,
    `- Delta P/L: ${report.summary.deltaOneMesPl}.`,
    `- Selected rows match approval contract: ${report.summary.selectedRowsMatchApprovalContract ?? 'not checked'}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- canExecute/Discord change rows: ${report.summary.canExecuteChangeRows}/${report.summary.discordPostingChangeRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Day / Session / Model',
    '| Date | Session | Setup | Current Rows | Current Losses | Current P/L | Deduped Rows | Deduped Losses | Deduped P/L | Suppressed | Delta |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...report.daySessionModelRows.map((row) => `| ${row.tradeDate} | ${row.session} | ${row.setupType} | ${row.currentRows} | ${row.currentLosses} | ${row.currentOneMesPl ?? '-'} | ${row.dedupedRows} | ${row.dedupedLosses} | ${row.dedupedOneMesPl ?? '-'} | ${row.suppressedDuplicateRows} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport(args: {
  replayPackageOutcomePath: string;
  replayPackageOutcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
  approvalContractPath: string | null;
  approvalContract: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport | null;
  setupType: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport {
  const outcomeRows = args.replayPackageOutcome?.rows || [];
  const rows = buildRows(outcomeRows, args.setupType);
  const targetRows = rows.filter((row) => row.setupType === args.setupType && row.outcomeStatus === 'resolved');
  const selectedRows = rows.filter((row) => row.dryRunDecision === 'selected_campaign_lead');
  const approvalIds = approvalSelectedIds(args.approvalContract);
  const selectedIds = new Set(selectedRows.map((row) => row.ticketId));
  const currentOneMesPl = sum(targetRows.map((row) => row.resolvedOneMesPl));
  const dedupedOneMesPl = sum(selectedRows.map((row) => row.resolvedOneMesPl));
  const selectedRowsMatchApprovalContract = approvalIds ? sameSet(selectedIds, approvalIds) : null;
  const blockers = [
    !args.replayPackageOutcome ? 'missing replay package outcome report' : null,
    args.replayPackageOutcome && args.replayPackageOutcome.status !== 'pass' ? `replay package outcome status ${args.replayPackageOutcome.status}` : null,
    args.replayPackageOutcome && args.replayPackageOutcome.summary.livePromotionAllowedRows !== 0 ? 'replay package outcome allowed live promotion rows' : null,
    targetRows.length === 0 ? `no resolved ${args.setupType} rows found` : null,
    selectedRows.length === 0 ? `no selected ${args.setupType} campaign leads found` : null,
    args.approvalContract && args.approvalContract.status !== 'pass' ? `approval contract status ${args.approvalContract.status}` : null,
    selectedRowsMatchApprovalContract === false ? 'selected campaign leads do not match approval contract selected ticket IDs' : null,
    rows.some((row) => !row.preservesEntryStopTargetRisk) ? 'entry/stop/target/risk drift detected' : null,
    rows.some((row) => row.changesCanExecute) ? 'canExecute change detected' : null,
    rows.some((row) => row.changesDiscordPosting) ? 'Discord posting change detected' : null,
    rows.some((row) => row.livePromotionAllowed) ? 'live promotion row detected' : null,
  ].filter((item): item is string => Boolean(item));
  const deltaOneMesPl = currentOneMesPl === null || dedupedOneMesPl === null ? null : round(dedupedOneMesPl - currentOneMesPl);
  const recommendation = blockers.length
    ? 'fix_inputs'
    : (dedupedOneMesPl ?? 0) > 0 && (deltaOneMesPl ?? 0) > 0
      ? 'dry_run_supports_earliest_only_campaign_dedupe'
      : 'dry_run_needs_more_evidence';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_dry_run_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      replayPackageOutcome: args.replayPackageOutcomePath,
      approvalContract: args.approvalContractPath,
      setupType: args.setupType,
    },
    assumptions: {
      consumesSavedFreshScannerOutcomeOnly: true,
      exactCampaignKeyUsesModelDirectionAndLevels: true,
      earliestResolvedRowIsCampaignLead: true,
      suppressesDuplicatesOnlyInsideExactCampaign: true,
      noScannerVisibleInstall: true,
      livePromotionAllowed: false,
    },
    summary: {
      currentRows: outcomeRows.length,
      targetSetupRows: targetRows.length,
      campaigns: new Set(targetRows.map((row) => row.campaignId)).size,
      currentLosses: targetRows.filter(isLoss).length,
      currentOneMesPl,
      dedupedRows: selectedRows.length,
      dedupedLosses: selectedRows.filter(isLoss).length,
      dedupedOneMesPl,
      suppressedDuplicateRows: rows.filter((row) => row.dryRunDecision === 'suppressed_duplicate_campaign_row').length,
      deltaOneMesPl,
      approvalContractSelectedRows: approvalIds?.size ?? null,
      selectedRowsMatchApprovalContract,
      entryStopTargetRiskDriftRows: 0,
      canExecuteChangeRows: 0,
      discordPostingChangeRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    daySessionModelRows: groupRows(rows),
    rows,
    blockers,
    recommendations: recommendation === 'dry_run_supports_earliest_only_campaign_dedupe'
      ? [
        'Dry run supports earliest-only exact-campaign dedupe as research evidence.',
        'Do not install live scanner-visible dedupe yet. Next phase should test the same campaign collapse against full collision ranking so a duplicate row cannot hide a better non-Sweep model.',
      ]
      : recommendation === 'dry_run_needs_more_evidence'
        ? [
          'Keep campaign dedupe research-only. It did not prove a positive enough delta from saved scanner outcome rows.',
          'Next phase should inspect day/session loss rows before any scanner-visible proposal.',
        ]
        : ['Fix input reports before using this dry-run comparison.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-dry-run-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeDryRunComparisonReport({
    replayPackageOutcomePath: options.replayPackageOutcome,
    replayPackageOutcome: readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.replayPackageOutcome),
    approvalContractPath: options.approvalContract ? path.resolve(options.approvalContract) : null,
    approvalContract: options.approvalContract && fs.existsSync(options.approvalContract)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport>(options.approvalContract)
      : null,
    setupType: options.setupType,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
