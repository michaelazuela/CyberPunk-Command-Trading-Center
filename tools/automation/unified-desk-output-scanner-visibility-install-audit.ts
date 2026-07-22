import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputScannerVisibilityModel,
  type UnifiedDeskOutputScannerVisibilityModel,
  type UnifiedDeskOutputVisibilityReadinessReport,
} from '../../src/lib/unifiedDeskOutputScannerVisibilityAdapter';

interface ScannerVisibilityInstallAuditReport {
  reportType: 'unified_desk_output_scanner_visibility_install_audit';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedReadinessAuditOnly: true;
    installsScannerVisibilityAdapter: true;
    scannerVisibleNow: boolean;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    readinessAuditPath: string;
    readinessStatus: 'pass' | 'blocked';
  };
  summary: {
    scannerVisibleCards: number;
    approvedDeskPlanCards: number;
    formingDeskReadCards: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    blockedRows: number;
    recommendation: 'scanner_visibility_installed_local_only' | 'hold_for_install_contract_fix';
  };
  model: UnifiedDeskOutputScannerVisibilityModel;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  readinessAuditPath: string | null;
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
    readinessAuditPath: readFlag(args, '--readiness-audit'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
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

function buildMarkdown(report: Omit<ScannerVisibilityInstallAuditReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Scanner Visibility Install Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner visibility install only. It exposes Unified Desk Output cards to the local scanner-facing model and does not post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Scanner-visible cards: ${report.summary.scannerVisibleCards}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanCards}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadCards}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Cards',
    '| Date | Session | State | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.model.cards.slice(0, 40).map((card) => `| ${card.date} | ${card.session} | ${card.state} | ${card.model} | ${card.direction} | ${card.proofTime.slice(11, 16)} | ${card.entry} | ${card.stop} | ${card.target1} | ${card.target2} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputScannerVisibilityInstallAuditReport(args: {
  readinessAuditPath: string;
  readinessAuditReport: UnifiedDeskOutputVisibilityReadinessReport;
}, generatedAt = new Date().toISOString()): ScannerVisibilityInstallAuditReport {
  const model = buildUnifiedDeskOutputScannerVisibilityModel({
    enabled: true,
    readinessReport: args.readinessAuditReport,
  });
  const blockers = [...model.blockers];
  const report: Omit<ScannerVisibilityInstallAuditReport, 'markdown'> = {
    reportType: 'unified_desk_output_scanner_visibility_install_audit',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedReadinessAuditOnly: true,
      installsScannerVisibilityAdapter: true,
      scannerVisibleNow: model.scannerVisibleNow,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      readinessAuditPath: args.readinessAuditPath,
      readinessStatus: args.readinessAuditReport.status,
    },
    summary: {
      scannerVisibleCards: model.cards.length,
      approvedDeskPlanCards: model.cards.filter((card) => card.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadCards: model.cards.filter((card) => card.state === 'FORMING_DESK_READ').length,
      discordPostRows: model.cards.filter((card) => card.publishDiscord || card.shouldPostDiscord || card.shouldDispatch).length,
      supabaseWriteRows: model.cards.filter((card) => card.writesSupabase).length,
      liveBridgeReadRows: model.cards.filter((card) => card.readsLiveBridge).length,
      canExecuteTrueRows: model.cards.filter((card) => card.canExecute).length,
      canExecuteChangedRows: model.cards.filter((card) => card.changesCanExecute || card.canExecuteChanged).length,
      tradingLogicChangedRows: model.cards.filter((card) => card.changesTradingLogic).length,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_install_contract_fix' : 'scanner_visibility_installed_local_only',
    },
    model,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputScannerVisibilityInstallAuditReport(report: ScannerVisibilityInstallAuditReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-scanner-visibility-install-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-scanner-visibility-install-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const readinessAuditPath = path.resolve(options.readinessAuditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-live-gate-readiness-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(readinessAuditPath)) throw new Error('Missing Unified Desk Output live-gate readiness audit path.');
  const report = buildUnifiedDeskOutputScannerVisibilityInstallAuditReport({
    readinessAuditPath,
    readinessAuditReport: readJson<UnifiedDeskOutputVisibilityReadinessReport>(readinessAuditPath),
  });
  const written = writeUnifiedDeskOutputScannerVisibilityInstallAuditReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
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
