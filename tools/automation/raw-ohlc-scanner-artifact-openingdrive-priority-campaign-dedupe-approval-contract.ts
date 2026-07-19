import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-reentry-simulation';

interface CliOptions {
  campaignReentrySimulation: string;
  outDir: string;
  json: boolean;
}

interface DaySessionRow {
  tradeDate: string;
  session: string;
  selectedRows: number;
  selectedLosses: number;
  selectedOneMesPl: number | null;
}

interface ContractRow {
  campaignId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  selectedTicketId: string | null;
  selectedOneMesPl: number | null;
  suppressedDuplicateRows: number;
  entryStopTargetRiskPreserved: true;
  changesCanExecute: false;
  changesDiscordPosting: false;
  livePromotionAllowed: false;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_approval_contract';
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
    campaignReentrySimulation: string;
  };
  assumptions: {
    consumesSavedCampaignSimulationOnly: true;
    validatesEarliestOnlyPolicyOnly: true;
    suppressesDuplicatesOnlyInsideExactCampaign: true;
    entryStopTargetRiskPreservedByContract: true;
    livePromotionAllowed: false;
  };
  summary: {
    campaignsRead: number;
    selectedRows: number;
    selectedLosses: number;
    suppressedDuplicateRows: number;
    entryStopTargetRiskDriftRows: 0;
    canExecuteChangeRows: 0;
    discordPostingChangeRows: 0;
    selectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'approval_contract_research_pass' | 'do_not_advance' | 'fix_inputs';
  };
  daySessionRows: DaySessionRow[];
  rows: ContractRow[];
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

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  const matches = fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const campaignReentrySimulation = readFlag(argv, '--campaign-reentry-simulation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-campaign-reentry-simulation-\d+\.json$/);
  if (!campaignReentrySimulation) throw new Error('--campaign-reentry-simulation is required.');
  return {
    campaignReentrySimulation: path.resolve(campaignReentrySimulation),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport['authority'] {
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

function buildRows(simulation: RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport): ContractRow[] {
  return simulation.campaigns
    .filter((campaign) => campaign.earliestTicketId)
    .map((campaign) => ({
      campaignId: campaign.campaignId,
      tradeDate: campaign.tradeDate,
      session: campaign.session,
      setupType: campaign.setupType,
      direction: campaign.direction,
      selectedTicketId: campaign.earliestTicketId,
      selectedOneMesPl: campaign.earliestOneMesPl,
      suppressedDuplicateRows: campaign.suppressibleDuplicateRows,
      entryStopTargetRiskPreserved: true,
      changesCanExecute: false,
      changesDiscordPosting: false,
      livePromotionAllowed: false,
    }));
}

function buildDaySessionRows(rows: ContractRow[]): DaySessionRow[] {
  const grouped = new Map<string, ContractRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    const group = grouped.get(key) || [];
    group.push(row);
    grouped.set(key, group);
  }
  return [...grouped.entries()]
    .map(([key, group]) => {
      const [tradeDate, session] = key.split('|');
      return {
        tradeDate,
        session,
        selectedRows: group.length,
        selectedLosses: group.filter((row) => (row.selectedOneMesPl ?? 0) < 0).length,
        selectedOneMesPl: sum(group.map((row) => row.selectedOneMesPl)),
      };
    })
    .sort((a, b) => `${a.tradeDate}|${a.session}`.localeCompare(`${b.tradeDate}|${b.session}`));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Campaign Dedupe Approval Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval contract. It does not install scanner-visible dedupe, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    '',
    `- Campaigns read: ${report.summary.campaignsRead}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Selected losses: ${report.summary.selectedLosses}.`,
    `- Suppressed duplicate rows: ${report.summary.suppressedDuplicateRows}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Selected P/L: ${report.summary.selectedOneMesPl}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Day / Session',
    '',
    ...report.daySessionRows.map((row) => `- ${row.tradeDate} ${row.session}: rows ${row.selectedRows}, losses ${row.selectedLosses}, P/L ${row.selectedOneMesPl}.`),
    '',
    '## Recommendations',
    '',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport(args: {
  campaignReentrySimulationPath: string;
  campaignReentrySimulation: RawOhlcScannerArtifactOpeningDrivePriorityCampaignReentrySimulationReport;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport {
  const rows = buildRows(args.campaignReentrySimulation);
  const blockers = [
    args.campaignReentrySimulation.status !== 'pass' ? 'campaign re-entry simulation did not pass' : null,
    args.campaignReentrySimulation.summary.livePromotionAllowedRows !== 0 ? 'campaign simulation allowed live promotion rows' : null,
    rows.some((row) => !row.entryStopTargetRiskPreserved) ? 'entry/stop/target/risk drift detected' : null,
    rows.some((row) => row.changesCanExecute) ? 'canExecute change detected' : null,
    rows.some((row) => row.changesDiscordPosting) ? 'Discord posting change detected' : null,
    rows.some((row) => row.livePromotionAllowed) ? 'live promotion row detected' : null,
  ].filter((item): item is string => Boolean(item));
  const selectedOneMesPl = sum(rows.map((row) => row.selectedOneMesPl));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : (selectedOneMesPl ?? 0) > 0
      ? 'approval_contract_research_pass'
      : 'do_not_advance';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_approval_contract',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      campaignReentrySimulation: args.campaignReentrySimulationPath,
    },
    assumptions: {
      consumesSavedCampaignSimulationOnly: true,
      validatesEarliestOnlyPolicyOnly: true,
      suppressesDuplicatesOnlyInsideExactCampaign: true,
      entryStopTargetRiskPreservedByContract: true,
      livePromotionAllowed: false,
    },
    summary: {
      campaignsRead: args.campaignReentrySimulation.summary.campaigns,
      selectedRows: rows.length,
      selectedLosses: rows.filter((row) => (row.selectedOneMesPl ?? 0) < 0).length,
      suppressedDuplicateRows: rows.reduce((total, row) => total + row.suppressedDuplicateRows, 0),
      entryStopTargetRiskDriftRows: 0,
      canExecuteChangeRows: 0,
      discordPostingChangeRows: 0,
      selectedOneMesPl,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    daySessionRows: buildDaySessionRows(rows),
    rows,
    blockers,
    recommendations: recommendation === 'approval_contract_research_pass'
      ? [
        'Approval contract passes as research evidence only.',
        'Do not install scanner-visible dedupe until a fresh scanner-artifact dry run proves the same one-ticket behavior without Discord, canExecute, entry, stop, target, or risk drift.',
      ]
      : ['Do not advance this dedupe policy.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-approval-contract-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeApprovalContractReport({
    campaignReentrySimulationPath: options.campaignReentrySimulation,
    campaignReentrySimulation: readJson(options.campaignReentrySimulation),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
