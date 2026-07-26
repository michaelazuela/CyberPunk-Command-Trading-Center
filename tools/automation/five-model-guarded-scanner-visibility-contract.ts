import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';
type DeskSession = 'morning' | 'lunch' | 'evening';
type DeskStateLabel = 'Approved Desk Plan' | 'Forming Desk Read';
type Direction = 'LONG' | 'SHORT';

interface AdapterRow {
  adapterId: string;
  sourceCardId: string;
  date: string;
  session: DeskSession;
  stateLabel: DeskStateLabel;
  model: string;
  direction: Direction;
  display: {
    headline: string;
    levelLine: string;
    proofLine: string;
    authorityLine: string;
  };
  runtimeGateEnabled: false;
  productionGoLiveApproved: false;
  scannerRuntimeWired: false;
  scannerVisibleNow: false;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesScannerBehavior?: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  automatedOrders: false;
}

interface AdapterPreviewReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  adapterRows?: AdapterRow[];
  blockers?: string[];
}

interface BrowserPreviewReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface VisibilityContractCandidate {
  contractId: string;
  sourceAdapterId: string;
  date: string;
  session: DeskSession;
  stateLabel: DeskStateLabel;
  model: string;
  direction: Direction;
  headline: string;
  levelLine: string;
  proofLine: string;
  scannerVisibilityIfExplicitlyApproved: true;
  discordRequiresSeparateApproval: true;
  supabaseRequiresSeparateApproval: true;
  bridgeReadsRemainDisabled: true;
  canExecuteRemainsExistingDeterministicGate: true;
  automatedOrdersRemainDisabled: true;
}

interface FiveModelGuardedScannerVisibilityContractReport {
  reportType: 'five_model_guarded_scanner_visibility_contract';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedUiAdapterOnly: true;
    readsSavedBrowserProofOnly: true;
    writesDiagnosticArtifactsOnly: true;
    installsRuntimeAdapter: false;
    defaultDisabled: true;
    explicitProductionApprovalRequired: true;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWired: false;
    scannerVisibleNow: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    uiAdapterPreviewPath: string;
    browserAdapterPreviewPath: string;
  };
  gateContract: {
    allowedStates: DeskStateLabel[];
    allowedSessions: DeskSession[];
    explicitProductionApprovalRequired: true;
    scannerVisibilityOnlyCanBeConsideredNext: true;
    discordRequiresSeparateApproval: true;
    supabaseRequiresSeparateApproval: true;
    bridgeReadsRemainDisabled: true;
    canExecuteMustRemainExistingDeterministicGate: true;
    automatedOrdersRemainDisabled: true;
  };
  summary: {
    sourceAdapterRows: number;
    browserRenderedRows: number;
    candidateRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWiredRows: number;
    scannerVisibleNowRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_explicit_production_scanner_visibility_decision' | 'hold_for_five_model_visibility_contract_fix';
  };
  candidates: VisibilityContractCandidate[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  uiAdapterPath: string | null;
  browserAdapterPath: string | null;
  outDir: string;
  json: boolean;
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
  return {
    uiAdapterPath: readFlag(args, '--ui-adapter'),
    browserAdapterPath: readFlag(args, '--browser-adapter'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestReportByType(reportDir: string, reportType: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .find((filePath) => {
      try {
        return readJson<Record<string, unknown>>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function hasBlockedWording(row: AdapterRow): boolean {
  return [
    row.display.headline,
    row.display.levelLine,
    row.display.proofLine,
    row.display.authorityLine,
  ].some((value) => /human[- ]review|no chase|missed|no[- ]trade/i.test(value));
}

function rowComplete(row: AdapterRow): boolean {
  return Boolean(row.adapterId && row.date && row.session && row.stateLabel && row.model && row.direction &&
    row.display.headline && row.display.levelLine && row.display.proofLine && row.display.authorityLine);
}

function toCandidate(row: AdapterRow): VisibilityContractCandidate {
  return {
    contractId: `five-model-visibility-contract|${row.adapterId}`,
    sourceAdapterId: row.adapterId,
    date: row.date,
    session: row.session,
    stateLabel: row.stateLabel,
    model: row.model,
    direction: row.direction,
    headline: row.display.headline,
    levelLine: row.display.levelLine,
    proofLine: row.display.proofLine,
    scannerVisibilityIfExplicitlyApproved: true,
    discordRequiresSeparateApproval: true,
    supabaseRequiresSeparateApproval: true,
    bridgeReadsRemainDisabled: true,
    canExecuteRemainsExistingDeterministicGate: true,
    automatedOrdersRemainDisabled: true,
  };
}

function buildMarkdown(report: Omit<FiveModelGuardedScannerVisibilityContractReport, 'markdown'>): string {
  return [
    '# Five Model Guarded Scanner Visibility Contract',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-artifact contract only. It defines the explicit production scanner-visibility gate but does not install runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Gate Contract',
    '- Scanner visibility requires explicit production approval.',
    '- Allowed states: Approved Desk Plan and Forming Desk Read.',
    '- Discord posting requires a separate approval gate.',
    '- Supabase persistence requires a separate approval gate.',
    '- Bridge reads remain disabled in this contract.',
    '- canExecute remains the existing deterministic gate.',
    '- Automated orders remain disabled.',
    '',
    '## Summary',
    `- Source adapter rows: ${report.summary.sourceAdapterRows}.`,
    `- Browser rendered rows: ${report.summary.browserRenderedRows}.`,
    `- Candidate rows: ${report.summary.candidateRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Production go-live approved: ${report.summary.productionGoLiveApproved}.`,
    `- Scanner-runtime wired rows: ${report.summary.scannerRuntimeWiredRows}.`,
    `- Scanner-visible now rows: ${report.summary.scannerVisibleNowRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Candidate Sample',
    '| Date | Session | State | Model | Direction | Levels | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.candidates.slice(0, 40).map((candidate) => `| ${candidate.date} | ${candidate.session} | ${candidate.stateLabel} | ${candidate.model} | ${candidate.direction} | ${candidate.levelLine} | ${candidate.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelGuardedScannerVisibilityContractReport(args: {
  uiAdapterPreviewPath: string;
  uiAdapterPreview: AdapterPreviewReport;
  browserAdapterPreviewPath: string;
  browserAdapterPreview: BrowserPreviewReport;
}, generatedAt = new Date().toISOString()): FiveModelGuardedScannerVisibilityContractReport {
  const adapterRows = args.uiAdapterPreview.adapterRows || [];
  const candidates = adapterRows.map(toCandidate);
  const blockers = [
    args.uiAdapterPreview.reportType === 'five_model_disabled_scanner_ui_adapter_preview' ? null : 'UI adapter report type is invalid.',
    args.uiAdapterPreview.status === 'pass' ? null : 'UI adapter report is not pass.',
    args.browserAdapterPreview.reportType === 'five_model_disabled_scanner_ui_browser_adapter_preview' ? null : 'Browser adapter report type is invalid.',
    args.browserAdapterPreview.status === 'pass' ? null : 'Browser adapter report is not pass.',
    adapterRows.length === numberValue(args.uiAdapterPreview.summary?.adaptedRows) ? null : 'UI adapter rows do not match adapter summary.',
    adapterRows.length === numberValue(args.browserAdapterPreview.summary?.renderedRows) ? null : 'Browser rendered rows do not match adapter rows.',
    adapterRows.length > 0 ? null : 'No adapter rows are available for the visibility contract.',
    numberValue(args.uiAdapterPreview.summary?.runtimeGateEnabled) === 0 ? null : 'UI adapter runtime gate is enabled.',
    numberValue(args.browserAdapterPreview.summary?.runtimeGateEnabled) === 0 ? null : 'Browser adapter runtime gate is enabled.',
    numberValue(args.uiAdapterPreview.summary?.productionGoLiveApproved) === 0 ? null : 'UI adapter has production go-live approved.',
    numberValue(args.browserAdapterPreview.summary?.productionGoLiveApproved) === 0 ? null : 'Browser adapter has production go-live approved.',
    numberValue(args.uiAdapterPreview.summary?.scannerRuntimeWiredRows) === 0 ? null : 'UI adapter has scanner-runtime wired rows.',
    numberValue(args.browserAdapterPreview.summary?.scannerRuntimeWiredRows) === 0 ? null : 'Browser adapter has scanner-runtime wired rows.',
    numberValue(args.uiAdapterPreview.summary?.scannerVisibleRows) === 0 ? null : 'UI adapter has scanner-visible rows.',
    numberValue(args.browserAdapterPreview.summary?.productionScannerVisibleRows) === 0 ? null : 'Browser adapter has production scanner-visible rows.',
    numberValue(args.uiAdapterPreview.summary?.discordPostRows) === 0 ? null : 'UI adapter has Discord-post rows.',
    numberValue(args.browserAdapterPreview.summary?.discordPostRows) === 0 ? null : 'Browser adapter has Discord-post rows.',
    numberValue(args.uiAdapterPreview.summary?.supabaseWriteRows) === 0 ? null : 'UI adapter has Supabase-write rows.',
    numberValue(args.browserAdapterPreview.summary?.supabaseWriteRows) === 0 ? null : 'Browser adapter has Supabase-write rows.',
    numberValue(args.uiAdapterPreview.summary?.liveSupabaseReadRows) === 0 ? null : 'UI adapter has live Supabase read rows.',
    numberValue(args.browserAdapterPreview.summary?.liveSupabaseReadRows) === 0 ? null : 'Browser adapter has live Supabase read rows.',
    numberValue(args.uiAdapterPreview.summary?.liveBridgeReadRows) === 0 ? null : 'UI adapter has live bridge read rows.',
    numberValue(args.browserAdapterPreview.summary?.liveBridgeReadRows) === 0 ? null : 'Browser adapter has live bridge read rows.',
    numberValue(args.uiAdapterPreview.summary?.canExecuteTrueRows) === 0 ? null : 'UI adapter has canExecute=true rows.',
    numberValue(args.browserAdapterPreview.summary?.canExecuteTrueRows) === 0 ? null : 'Browser adapter has canExecute=true rows.',
    numberValue(args.uiAdapterPreview.summary?.tradingLogicChangedRows) === 0 ? null : 'UI adapter changed trading logic.',
    numberValue(args.browserAdapterPreview.summary?.tradingLogicChangedRows) === 0 ? null : 'Browser adapter changed trading logic.',
    numberValue(args.uiAdapterPreview.summary?.automatedOrderRows) === 0 ? null : 'UI adapter has automated-order rows.',
    numberValue(args.browserAdapterPreview.summary?.automatedOrderRows) === 0 ? null : 'Browser adapter has automated-order rows.',
    ...adapterRows.flatMap((row) => [
      rowComplete(row) ? null : `${row.adapterId || '<missing>'} is missing display contract fields.`,
      hasBlockedWording(row) ? `${row.adapterId} contains blocked status wording.` : null,
      row.scannerRuntimeWired ? `${row.adapterId} has scanner runtime wired.` : null,
      row.scannerVisibleNow ? `${row.adapterId} is already production scanner-visible.` : null,
      row.publishDiscord ? `${row.adapterId} would post Discord.` : null,
      row.writesSupabase ? `${row.adapterId} would write Supabase.` : null,
      row.readsLiveSupabase ? `${row.adapterId} would read live Supabase.` : null,
      row.readsLiveBridge ? `${row.adapterId} would read live bridge.` : null,
      row.canExecute ? `${row.adapterId} has canExecute=true.` : null,
      row.changesTradingLogic ? `${row.adapterId} changes trading logic.` : null,
      row.automatedOrders ? `${row.adapterId} has automated orders.` : null,
    ]),
    ...(args.uiAdapterPreview.blockers || []),
    ...(args.browserAdapterPreview.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const visibleCandidates = blockers.length ? [] : candidates;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelGuardedScannerVisibilityContractReport, 'markdown'> = {
    reportType: 'five_model_guarded_scanner_visibility_contract',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedUiAdapterOnly: true,
      readsSavedBrowserProofOnly: true,
      writesDiagnosticArtifactsOnly: true,
      installsRuntimeAdapter: false,
      defaultDisabled: true,
      explicitProductionApprovalRequired: true,
      runtimeGateEnabled: false,
      productionGoLiveApproved: false,
      scannerRuntimeWired: false,
      scannerVisibleNow: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      uiAdapterPreviewPath: args.uiAdapterPreviewPath,
      browserAdapterPreviewPath: args.browserAdapterPreviewPath,
    },
    gateContract: {
      allowedStates: ['Approved Desk Plan', 'Forming Desk Read'],
      allowedSessions: ['morning', 'lunch', 'evening'],
      explicitProductionApprovalRequired: true,
      scannerVisibilityOnlyCanBeConsideredNext: true,
      discordRequiresSeparateApproval: true,
      supabaseRequiresSeparateApproval: true,
      bridgeReadsRemainDisabled: true,
      canExecuteMustRemainExistingDeterministicGate: true,
      automatedOrdersRemainDisabled: true,
    },
    summary: {
      sourceAdapterRows: adapterRows.length,
      browserRenderedRows: numberValue(args.browserAdapterPreview.summary?.renderedRows),
      candidateRows: visibleCandidates.length,
      approvedDeskPlanRows: visibleCandidates.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleCandidates.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleCandidates.filter((row) => row.session === 'morning').length,
      lunchRows: visibleCandidates.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleCandidates.filter((row) => row.session === 'evening').length,
      runtimeGateEnabled: false,
      productionGoLiveApproved: false,
      scannerRuntimeWiredRows: adapterRows.filter((row) => row.scannerRuntimeWired).length,
      scannerVisibleNowRows: adapterRows.filter((row) => row.scannerVisibleNow).length,
      discordPostRows: adapterRows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: adapterRows.filter((row) => row.writesSupabase).length,
      liveSupabaseReadRows: adapterRows.filter((row) => row.readsLiveSupabase).length,
      liveBridgeReadRows: adapterRows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: adapterRows.filter((row) => row.canExecute).length,
      tradingLogicChangedRows: adapterRows.filter((row) => row.changesTradingLogic).length,
      automatedOrderRows: adapterRows.filter((row) => row.automatedOrders).length,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_explicit_production_scanner_visibility_decision'
        : 'hold_for_five_model_visibility_contract_fix',
    },
    candidates: visibleCandidates,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelGuardedScannerVisibilityContractReport(
  report: FiveModelGuardedScannerVisibilityContractReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-guarded-scanner-visibility-contract-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-guarded-scanner-visibility-contract-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const uiAdapterPath = path.resolve(options.uiAdapterPath ||
    latestReportByType(outDir, 'five_model_disabled_scanner_ui_adapter_preview') ||
    '');
  const browserAdapterPath = path.resolve(options.browserAdapterPath ||
    latestReportByType(outDir, 'five_model_disabled_scanner_ui_browser_adapter_preview') ||
    '');
  if (!fs.existsSync(uiAdapterPath)) throw new Error(`Missing five-model UI adapter artifact: ${uiAdapterPath}`);
  if (!fs.existsSync(browserAdapterPath)) throw new Error(`Missing five-model browser adapter artifact: ${browserAdapterPath}`);
  const report = buildFiveModelGuardedScannerVisibilityContractReport({
    uiAdapterPreviewPath: uiAdapterPath,
    uiAdapterPreview: readJson<AdapterPreviewReport>(uiAdapterPath),
    browserAdapterPreviewPath: browserAdapterPath,
    browserAdapterPreview: readJson<BrowserPreviewReport>(browserAdapterPath),
  });
  const written = writeFiveModelGuardedScannerVisibilityContractReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      blockers: report.blockers.slice(0, 20),
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
