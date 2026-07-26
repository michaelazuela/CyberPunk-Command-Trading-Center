import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  evaluateFiveModelScannerVisibilityGate,
  type FiveModelScannerVisibilityContractReport,
} from '../../src/lib/fiveModelScannerVisibilityGate';

type ReportStatus = 'pass' | 'blocked';

interface GateProofReport {
  reportType: 'five_model_scanner_visibility_gate_proof';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedVisibilityContractOnly: true;
    writesDiagnosticArtifactsOnly: true;
    installsRuntimeAdapter: false;
    defaultDisabled: true;
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
    visibilityContractPath: string;
  };
  summary: {
    defaultGateStatus: 'disabled' | 'allowed' | 'blocked';
    defaultScannerVisibilityAllowed: boolean;
    explicitGateStatus: 'disabled' | 'allowed' | 'blocked';
    explicitScannerVisibilityAllowed: boolean;
    explicitCandidateRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_scanner_visibility_wiring_preview' | 'hold_for_five_model_visibility_gate_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  visibilityContractPath: string | null;
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

function buildMarkdown(report: Omit<GateProofReport, 'markdown'>): string {
  return [
    '# Five Model Scanner Visibility Gate Proof',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-contract gate proof only. It evaluates the default-off scanner visibility gate and writes diagnostics. It does not install runtime behavior, expose scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Default gate status: ${report.summary.defaultGateStatus}.`,
    `- Default scanner visibility allowed: ${report.summary.defaultScannerVisibilityAllowed}.`,
    `- Explicit gate status: ${report.summary.explicitGateStatus}.`,
    `- Explicit scanner visibility allowed: ${report.summary.explicitScannerVisibilityAllowed}.`,
    `- Explicit candidate rows: ${report.summary.explicitCandidateRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelScannerVisibilityGateProofReport(args: {
  visibilityContractPath: string;
  visibilityContract: FiveModelScannerVisibilityContractReport;
}, generatedAt = new Date().toISOString()): GateProofReport {
  const defaultDecision = evaluateFiveModelScannerVisibilityGate({
    explicitProductionApproval: false,
    contract: args.visibilityContract,
  });
  const explicitDecision = evaluateFiveModelScannerVisibilityGate({
    explicitProductionApproval: true,
    contract: args.visibilityContract,
  });
  const blockers = [
    defaultDecision.status === 'disabled' ? null : 'Default gate did not stay disabled.',
    defaultDecision.scannerVisibilityAllowed === false ? null : 'Default gate allowed scanner visibility.',
    defaultDecision.candidates.length === 0 ? null : 'Default gate returned candidates.',
    explicitDecision.status === 'allowed' ? null : 'Explicit gate did not allow clean contract candidates.',
    explicitDecision.scannerVisibilityAllowed ? null : 'Explicit gate did not mark scanner visibility allowed.',
    explicitDecision.candidates.length === args.visibilityContract.summary.candidateRows ? null : 'Explicit gate candidate count does not match contract.',
    explicitDecision.publishDiscord === false ? null : 'Explicit gate would post Discord.',
    explicitDecision.writesSupabase === false ? null : 'Explicit gate would write Supabase.',
    explicitDecision.readsLiveSupabase === false ? null : 'Explicit gate would read live Supabase.',
    explicitDecision.readsLiveBridge === false ? null : 'Explicit gate would read live bridge.',
    explicitDecision.canExecute === false ? null : 'Explicit gate has canExecute=true.',
    explicitDecision.changesTradingLogic === false ? null : 'Explicit gate changes trading logic.',
    explicitDecision.changesCanExecute === false ? null : 'Explicit gate changes canExecute.',
    explicitDecision.automatedOrders === false ? null : 'Explicit gate has automated orders.',
    ...explicitDecision.blockers,
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<GateProofReport, 'markdown'> = {
    reportType: 'five_model_scanner_visibility_gate_proof',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedVisibilityContractOnly: true,
      writesDiagnosticArtifactsOnly: true,
      installsRuntimeAdapter: false,
      defaultDisabled: true,
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
      visibilityContractPath: args.visibilityContractPath,
    },
    summary: {
      defaultGateStatus: defaultDecision.status,
      defaultScannerVisibilityAllowed: defaultDecision.scannerVisibilityAllowed,
      explicitGateStatus: explicitDecision.status,
      explicitScannerVisibilityAllowed: explicitDecision.scannerVisibilityAllowed,
      explicitCandidateRows: explicitDecision.candidates.length,
      approvedDeskPlanRows: explicitDecision.candidates.filter((candidate) => candidate.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: explicitDecision.candidates.filter((candidate) => candidate.stateLabel === 'Forming Desk Read').length,
      discordPostRows: explicitDecision.publishDiscord ? 1 : 0,
      supabaseWriteRows: explicitDecision.writesSupabase ? 1 : 0,
      liveSupabaseReadRows: explicitDecision.readsLiveSupabase ? 1 : 0,
      liveBridgeReadRows: explicitDecision.readsLiveBridge ? 1 : 0,
      canExecuteTrueRows: explicitDecision.canExecute ? 1 : 0,
      tradingLogicChangedRows: explicitDecision.changesTradingLogic ? 1 : 0,
      automatedOrderRows: explicitDecision.automatedOrders ? 1 : 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_scanner_visibility_wiring_preview'
        : 'hold_for_five_model_visibility_gate_fix',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelScannerVisibilityGateProofReport(
  report: GateProofReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-scanner-visibility-gate-proof-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-scanner-visibility-gate-proof-${stamp}.md`);
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
  if (!fs.existsSync(visibilityContractPath)) throw new Error(`Missing five-model visibility contract artifact: ${visibilityContractPath}`);
  const report = buildFiveModelScannerVisibilityGateProofReport({
    visibilityContractPath,
    visibilityContract: readJson<FiveModelScannerVisibilityContractReport>(visibilityContractPath),
  });
  const written = writeFiveModelScannerVisibilityGateProofReport(report, outDir);
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
