import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  evaluateFiveModelScannerVisibilityGate,
  type FiveModelScannerVisibilityContractReport,
} from '../../src/lib/fiveModelScannerVisibilityGate';

type ReportStatus = 'pass' | 'blocked';

interface GateProofReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface WiringPreviewRow {
  wiringId: string;
  contractId: string;
  date: string;
  session: 'morning' | 'lunch' | 'evening';
  stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
  model: string;
  direction: 'LONG' | 'SHORT';
  headline: string;
  levelLine: string;
  proofLine: string;
  scannerVisibleIfWiredAfterExplicitApproval: true;
  productionScannerVisibleNow: false;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  automatedOrders: false;
}

interface WiringPreviewReport {
  reportType: 'five_model_scanner_visibility_wiring_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedVisibilityContractOnly: true;
    readsSavedGateProofOnly: true;
    writesDiagnosticArtifactsOnly: true;
    installsRuntimeAdapter: false;
    scannerRuntimeWired: false;
    productionScannerVisibleNow: false;
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
    visibilityContractPath: string;
    gateProofPath: string;
  };
  summary: {
    contractCandidateRows: number;
    gateProofExplicitCandidateRows: number;
    wiringPreviewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    scannerRuntimeWiredRows: number;
    productionScannerVisibleNowRows: number;
    scannerVisibleIfWiredRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    canExecuteChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_scanner_visibility_surface_preview' | 'hold_for_five_model_wiring_preview_fix';
  };
  rows: WiringPreviewRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  visibilityContractPath: string | null;
  gateProofPath: string | null;
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
    visibilityContractPath: readFlag(args, '--visibility-contract'),
    gateProofPath: readFlag(args, '--gate-proof'),
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

function toWiringRow(candidate: FiveModelScannerVisibilityContractReport['candidates'][number]): WiringPreviewRow {
  return {
    wiringId: `five-model-scanner-visibility-wiring|${candidate.contractId}`,
    contractId: candidate.contractId,
    date: candidate.date,
    session: candidate.session,
    stateLabel: candidate.stateLabel,
    model: candidate.model,
    direction: candidate.direction,
    headline: candidate.headline,
    levelLine: candidate.levelLine,
    proofLine: candidate.proofLine,
    scannerVisibleIfWiredAfterExplicitApproval: true,
    productionScannerVisibleNow: false,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    automatedOrders: false,
  };
}

function hasBlockedWording(row: WiringPreviewRow): boolean {
  return [row.headline, row.levelLine, row.proofLine].some((value) =>
    /human[- ]review|no chase|missed|no[- ]trade/i.test(value)
  );
}

function buildMarkdown(report: Omit<WiringPreviewReport, 'markdown'>): string {
  return [
    '# Five Model Scanner Visibility Wiring Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local wiring preview only. It reads the saved visibility contract and gate proof, then lists the rows that would be handed to scanner visibility after explicit approval. It does not install runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Contract candidate rows: ${report.summary.contractCandidateRows}.`,
    `- Gate-proof explicit candidate rows: ${report.summary.gateProofExplicitCandidateRows}.`,
    `- Wiring preview rows: ${report.summary.wiringPreviewRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Scanner-runtime wired rows: ${report.summary.scannerRuntimeWiredRows}.`,
    `- Production scanner-visible-now rows: ${report.summary.productionScannerVisibleNowRows}.`,
    `- Scanner-visible-if-wired rows: ${report.summary.scannerVisibleIfWiredRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Preview Rows',
    '| Date | Session | State | Model | Direction | Levels | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelScannerVisibilityWiringPreviewReport(args: {
  visibilityContractPath: string;
  visibilityContract: FiveModelScannerVisibilityContractReport;
  gateProofPath: string;
  gateProof: GateProofReport;
}, generatedAt = new Date().toISOString()): WiringPreviewReport {
  const explicitDecision = evaluateFiveModelScannerVisibilityGate({
    explicitProductionApproval: true,
    contract: args.visibilityContract,
  });
  const rows = explicitDecision.status === 'allowed' ? explicitDecision.candidates.map(toWiringRow) : [];
  const blockers = [
    args.visibilityContract.reportType === 'five_model_guarded_scanner_visibility_contract' ? null : 'Visibility contract report type is invalid.',
    args.visibilityContract.status === 'pass' ? null : 'Visibility contract is not pass.',
    args.gateProof.reportType === 'five_model_scanner_visibility_gate_proof' ? null : 'Gate proof report type is invalid.',
    args.gateProof.status === 'pass' ? null : 'Gate proof is not pass.',
    args.gateProof.summary?.defaultScannerVisibilityAllowed === false ? null : 'Gate proof default path allowed scanner visibility.',
    args.gateProof.summary?.explicitGateStatus === 'allowed' ? null : 'Gate proof explicit path is not allowed.',
    explicitDecision.status === 'allowed' ? null : 'Explicit gate decision is not allowed.',
    rows.length === args.visibilityContract.summary.candidateRows ? null : 'Wiring rows do not match contract candidate rows.',
    rows.length === numberValue(args.gateProof.summary?.explicitCandidateRows) ? null : 'Wiring rows do not match gate-proof explicit rows.',
    rows.length > 0 ? null : 'No rows are available for scanner visibility wiring preview.',
    rows.filter((row) => row.productionScannerVisibleNow).length === 0 ? null : 'Rows are already production scanner-visible.',
    rows.filter((row) => row.publishDiscord).length === 0 ? null : 'Rows would post Discord.',
    rows.filter((row) => row.writesSupabase).length === 0 ? null : 'Rows would write Supabase.',
    rows.filter((row) => row.readsLiveSupabase).length === 0 ? null : 'Rows would read live Supabase.',
    rows.filter((row) => row.readsLiveBridge).length === 0 ? null : 'Rows would read live bridge.',
    rows.filter((row) => row.canExecute).length === 0 ? null : 'Rows include canExecute=true.',
    rows.filter((row) => row.changesTradingLogic).length === 0 ? null : 'Rows would change trading logic.',
    rows.filter((row) => row.changesCanExecute).length === 0 ? null : 'Rows would change canExecute.',
    rows.filter((row) => row.automatedOrders).length === 0 ? null : 'Rows include automated orders.',
    rows.filter(hasBlockedWording).length === 0 ? null : 'Rows contain blocked status wording.',
    ...explicitDecision.blockers,
    ...(args.visibilityContract.blockers || []),
    ...(args.gateProof.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const visibleRows = blockers.length ? [] : rows;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<WiringPreviewReport, 'markdown'> = {
    reportType: 'five_model_scanner_visibility_wiring_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedVisibilityContractOnly: true,
      readsSavedGateProofOnly: true,
      writesDiagnosticArtifactsOnly: true,
      installsRuntimeAdapter: false,
      scannerRuntimeWired: false,
      productionScannerVisibleNow: false,
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
      visibilityContractPath: args.visibilityContractPath,
      gateProofPath: args.gateProofPath,
    },
    summary: {
      contractCandidateRows: args.visibilityContract.summary.candidateRows,
      gateProofExplicitCandidateRows: numberValue(args.gateProof.summary?.explicitCandidateRows),
      wiringPreviewRows: visibleRows.length,
      approvedDeskPlanRows: visibleRows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleRows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleRows.filter((row) => row.session === 'morning').length,
      lunchRows: visibleRows.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleRows.filter((row) => row.session === 'evening').length,
      scannerRuntimeWiredRows: 0,
      productionScannerVisibleNowRows: visibleRows.filter((row) => row.productionScannerVisibleNow).length,
      scannerVisibleIfWiredRows: visibleRows.filter((row) => row.scannerVisibleIfWiredAfterExplicitApproval).length,
      discordPostRows: visibleRows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: visibleRows.filter((row) => row.writesSupabase).length,
      liveSupabaseReadRows: visibleRows.filter((row) => row.readsLiveSupabase).length,
      liveBridgeReadRows: visibleRows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: visibleRows.filter((row) => row.canExecute).length,
      tradingLogicChangedRows: visibleRows.filter((row) => row.changesTradingLogic).length,
      canExecuteChangedRows: visibleRows.filter((row) => row.changesCanExecute).length,
      automatedOrderRows: visibleRows.filter((row) => row.automatedOrders).length,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_local_scanner_visibility_surface_preview'
        : 'hold_for_five_model_wiring_preview_fix',
    },
    rows: visibleRows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelScannerVisibilityWiringPreviewReport(
  report: WiringPreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-scanner-visibility-wiring-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-scanner-visibility-wiring-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const visibilityContractPath = path.resolve(options.visibilityContractPath ||
    latestReportByType(outDir, 'five_model_guarded_scanner_visibility_contract') ||
    '');
  const gateProofPath = path.resolve(options.gateProofPath ||
    latestReportByType(outDir, 'five_model_scanner_visibility_gate_proof') ||
    '');
  if (!fs.existsSync(visibilityContractPath)) throw new Error(`Missing five-model visibility contract artifact: ${visibilityContractPath}`);
  if (!fs.existsSync(gateProofPath)) throw new Error(`Missing five-model gate proof artifact: ${gateProofPath}`);
  const report = buildFiveModelScannerVisibilityWiringPreviewReport({
    visibilityContractPath,
    visibilityContract: readJson<FiveModelScannerVisibilityContractReport>(visibilityContractPath),
    gateProofPath,
    gateProof: readJson<GateProofReport>(gateProofPath),
  });
  const written = writeFiveModelScannerVisibilityWiringPreviewReport(report, outDir);
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
