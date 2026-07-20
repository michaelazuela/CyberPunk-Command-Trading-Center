import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport,
} from './unified-positive-held-local-preview-model-family-installed-penalty-audit';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport,
} from './unified-positive-held-local-preview-sweep-primary-exclusion-approval-contract';

type AuditRow = UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport['rows'][number];

interface DryRunSlate {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselinePrimaryRowId: string | null;
  baselinePrimaryInvalidStopSweep: boolean;
  simulatedPrimaryRowId: string | null;
  simulatedPrimaryInvalidStopSweep: boolean;
  topChanged: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_dry_run';
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
    approvalContractPath: string | null;
    installedPenaltyAuditPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    dryRunOnly: true;
    excludesOnlyPrimarySelectionNotAuditVisibility: true;
    noLiveFilterInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    auditRowsRead: number;
    slates: number;
    invalidStopSweepRows: number;
    invalidStopSweepCanExecuteTrueRows: number;
    baselineInvalidStopSweepPrimarySlates: number;
    simulatedInvalidStopSweepPrimarySlates: number;
    changedSlates: number;
    blockedAuditRowsPreserved: number;
    entryStopTargetRiskDriftRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'dry_run_supports_primary_exclusion_proposal'
      | 'dry_run_needs_more_research'
      | 'fix_missing_input_reports';
  };
  slates: DryRunSlate[];
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport['authority'] {
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

function isInvalidStopSweep(row: AuditRow): boolean {
  return Boolean(row.invalidStopSweepPenaltyCandidate);
}

function groupSlates(rows: AuditRow[]): DryRunSlate[] {
  const groups = new Map<string, AuditRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([slateId, slateRows]) => {
    const [tradeDate, session] = slateId.split('|');
    const baselinePrimary = slateRows.find((row) => row.primaryDeskIdea) || null;
    const simulatedPrimary = [...slateRows]
      .filter((row) => !isInvalidStopSweep(row))
      .sort((a, b) => (a.installedRank ?? 9999) - (b.installedRank ?? 9999) || (b.installedScore ?? -9999) - (a.installedScore ?? -9999))[0] || null;
    return {
      slateId,
      tradeDate,
      session,
      rows: slateRows.length,
      baselinePrimaryRowId: baselinePrimary?.rowId || null,
      baselinePrimaryInvalidStopSweep: Boolean(baselinePrimary && isInvalidStopSweep(baselinePrimary)),
      simulatedPrimaryRowId: simulatedPrimary?.rowId || null,
      simulatedPrimaryInvalidStopSweep: Boolean(simulatedPrimary && isInvalidStopSweep(simulatedPrimary)),
      topChanged: (baselinePrimary?.rowId || null) !== (simulatedPrimary?.rowId || null),
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only dry-run from saved audit reports. It does not install scanner-visible behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, remove models, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Audit rows read: ${report.summary.auditRowsRead}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Invalid-stop Sweep rows: ${report.summary.invalidStopSweepRows}.`,
    `- Invalid-stop Sweep canExecute=true rows: ${report.summary.invalidStopSweepCanExecuteTrueRows}.`,
    `- Baseline invalid-stop Sweep primary slates: ${report.summary.baselineInvalidStopSweepPrimarySlates}.`,
    `- Simulated invalid-stop Sweep primary slates: ${report.summary.simulatedInvalidStopSweepPrimarySlates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Blocked audit rows preserved: ${report.summary.blockedAuditRowsPreserved}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Date | Session | Baseline Primary | Simulated Primary |',
    '|---|---|---|---|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${row.tradeDate} | ${row.session} | ${row.baselinePrimaryRowId || '-'} | ${row.simulatedPrimaryRowId || '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport(args: {
  reportDir: string;
  approvalContractPath: string | null;
  approvalContractReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport | null;
  installedPenaltyAuditPath: string | null;
  installedPenaltyAuditReport: UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport {
  const rows = args.installedPenaltyAuditReport?.rows || [];
  const slates = groupSlates(rows);
  const invalidRows = rows.filter(isInvalidStopSweep);
  const entryStopTargetRiskDriftRows = args.installedPenaltyAuditReport?.summary.entryStopTargetRiskDriftRows || 0;
  const simulatedInvalidStopSweepPrimarySlates = slates.filter((row) => row.simulatedPrimaryInvalidStopSweep).length;
  const blockers = [
    !args.approvalContractPath ? 'missing approval contract path' : null,
    !args.approvalContractReport ? 'missing approval contract report' : null,
    args.approvalContractReport && args.approvalContractReport.status !== 'pass' ? `approval contract status ${args.approvalContractReport.status}` : null,
    !args.installedPenaltyAuditPath ? 'missing installed penalty audit path' : null,
    !args.installedPenaltyAuditReport ? 'missing installed penalty audit report' : null,
    args.installedPenaltyAuditReport && args.installedPenaltyAuditReport.status !== 'pass' ? `installed penalty audit status ${args.installedPenaltyAuditReport.status}` : null,
    rows.length === 0 ? 'installed penalty audit has no rows' : null,
    invalidRows.some((row) => row.canExecute === true) ? 'invalid-stop Sweep row had canExecute true' : null,
    entryStopTargetRiskDriftRows ? `${entryStopTargetRiskDriftRows} entry/stop/target/risk drift rows` : null,
    simulatedInvalidStopSweepPrimarySlates ? `${simulatedInvalidStopSweepPrimarySlates} invalid-stop Sweep primary slates remain after dry-run` : null,
  ].filter((item): item is string => Boolean(item));
  const baselineInvalidStopSweepPrimarySlates = slates.filter((row) => row.baselinePrimaryInvalidStopSweep).length;
  const recommendation: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport['summary']['recommendation'] = blockers.length
    ? 'fix_missing_input_reports'
    : baselineInvalidStopSweepPrimarySlates > 0
      ? 'dry_run_supports_primary_exclusion_proposal'
      : 'dry_run_needs_more_research';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      approvalContractPath: args.approvalContractPath,
      installedPenaltyAuditPath: args.installedPenaltyAuditPath,
    },
    assumptions: {
      savedReportsOnly: true,
      dryRunOnly: true,
      excludesOnlyPrimarySelectionNotAuditVisibility: true,
      noLiveFilterInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      auditRowsRead: rows.length,
      slates: slates.length,
      invalidStopSweepRows: invalidRows.length,
      invalidStopSweepCanExecuteTrueRows: invalidRows.filter((row) => row.canExecute === true).length,
      baselineInvalidStopSweepPrimarySlates,
      simulatedInvalidStopSweepPrimarySlates,
      changedSlates: slates.filter((row) => row.topChanged).length,
      blockedAuditRowsPreserved: invalidRows.filter((row) => row.installedState === 'blocked').length,
      entryStopTargetRiskDriftRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Repair dry-run inputs before considering any scanner-visible proposal.']
      : [
        'Dry-run supports excluding only blocked InvalidStopLocation Sweep rows from primary selection.',
        'Do not install live behavior until this is validated against scanner-output artifacts and explicit approval is given.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-primary-exclusion-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const approvalContractPath = readFlag(args, '--approval-contract') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-approval-contract-\d+\.json$/);
  const installedPenaltyAuditPath = readFlag(args, '--installed-penalty-audit') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-family-installed-penalty-audit-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport({
    reportDir: outDir,
    approvalContractPath,
    approvalContractReport: approvalContractPath && fs.existsSync(approvalContractPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionApprovalContractReport>(approvalContractPath)
      : null,
    installedPenaltyAuditPath,
    installedPenaltyAuditReport: installedPenaltyAuditPath && fs.existsSync(installedPenaltyAuditPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewModelFamilyInstalledPenaltyAuditReport>(installedPenaltyAuditPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionDryRunCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
