import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type SessionName = 'morning' | 'lunch';
type RuntimePolicy = 'proven_lane_priority_then_latest_proof';

interface CurrentLiveReadinessManifestReport {
  reportType: 'unified_desk_output_current_live_readiness_manifest';
  generatedAt: string;
  status: 'pass' | 'blocked';
  runtimeGateContract: {
    commandExistsNow: false;
    selectedPolicy: RuntimePolicy;
    enabledByDefault: false;
    scannerOwnedOnly: true;
    approvedDeskPlanOnly: true;
    maxRowsPerSession: 1;
    sessions: SessionName[];
    requiresFreshManifest: true;
    requiresFreshIdempotencyKey: true;
    requiresExplicitProductionApproval: true;
  };
  summary: {
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    selectedPolicyChangedFromLatestProof: boolean | null;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    runtimeInstallAllowed: false;
    explicitApprovalPresent: false;
    blockedRows: number;
    recommendation: 'ready_to_install_disabled_runtime_gate_manifest' | 'hold_for_current_live_readiness_manifest_fix';
  };
  selectedCandidates: Array<{
    cardId: string;
    date: string;
    session: SessionName;
    model: string;
    direction: 'LONG' | 'SHORT';
    proofTime: string;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
  }>;
  blockers: string[];
}

interface RuntimeGateManifestReceipt {
  reportType: 'unified_desk_output_runtime_gate_manifest_disabled_receipt';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedCurrentLiveReadinessManifestOnly: true;
    validatesRuntimeGateContractOnly: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    currentLiveReadinessManifestPath: string;
    currentLiveReadinessManifestGeneratedAt: string;
  };
  request: {
    selectionPolicy: RuntimePolicy | string | null;
    idempotencyKey: string | null;
    disabledFlagPresent: boolean;
    explicitProductionApprovalPresent: false;
  };
  contract: {
    commandExistsNow: true;
    selectedPolicy: RuntimePolicy;
    enabledByDefault: false;
    scannerOwnedOnly: true;
    approvedDeskPlanOnly: true;
    maxRowsPerSession: 1;
    sessions: SessionName[];
    requiresFreshManifest: true;
    requiresFreshIdempotencyKey: true;
    requiresExplicitProductionApproval: true;
  };
  summary: {
    manifestPassed: boolean;
    selectionPolicyMatched: boolean;
    idempotencyKeyPresent: boolean;
    disabledFlagPresent: boolean;
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_disabled_runtime_gate_validation' | 'hold_for_runtime_gate_manifest_fix';
  };
  selectedCandidates: CurrentLiveReadinessManifestReport['selectedCandidates'];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  manifestPath: string | null;
  selectionPolicy: string | null;
  idempotencyKey: string | null;
  disabledFlagPresent: boolean;
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
    manifestPath: readFlag(args, '--current-live-readiness-manifest'),
    selectionPolicy: readFlag(args, '--selection-policy'),
    idempotencyKey: readFlag(args, '--idempotency-key'),
    disabledFlagPresent: args.includes('--disabled'),
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

function buildMarkdown(report: Omit<RuntimeGateManifestReceipt, 'markdown'>): string {
  return [
    '# Unified Desk Output Runtime Gate Manifest Disabled Receipt',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled runtime-gate contract only. It validates the selected policy, manifest, selected rows, and idempotency key. It does not install scanner runtime behavior, post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Manifest passed: ${report.summary.manifestPassed}.`,
    `- Selection policy matched: ${report.summary.selectionPolicyMatched}.`,
    `- Idempotency key present: ${report.summary.idempotencyKeyPresent}.`,
    `- Disabled flag present: ${report.summary.disabledFlagPresent}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Scanner-runtime changed rows: ${report.summary.scannerRuntimeChangedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selected Candidates',
    '| Session | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.selectedCandidates.map((candidate) => `| ${candidate.session} | ${candidate.model} | ${candidate.direction} | ${candidate.proofTime.slice(11, 16)} | ${candidate.entry} | ${candidate.stop} | ${candidate.target1} | ${candidate.target2} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputRuntimeGateManifestReceipt(args: {
  manifestPath: string;
  manifest: CurrentLiveReadinessManifestReport;
  selectionPolicy: string | null;
  idempotencyKey: string | null;
  disabledFlagPresent: boolean;
}, generatedAt = new Date().toISOString()): RuntimeGateManifestReceipt {
  const contract = args.manifest.runtimeGateContract;
  const policyMatched = args.selectionPolicy === contract?.selectedPolicy;
  const idempotencyKeyPresent = Boolean(args.idempotencyKey);
  const blockers = [
    args.manifest.reportType === 'unified_desk_output_current_live_readiness_manifest'
      ? null
      : 'Source manifest is not Unified Desk Output current live-readiness manifest.',
    args.manifest.status === 'pass' ? null : `Current live-readiness manifest status is ${args.manifest.status}.`,
    args.manifest.summary.recommendation === 'ready_to_install_disabled_runtime_gate_manifest'
      ? null
      : `Current live-readiness manifest recommendation is ${args.manifest.summary.recommendation}.`,
    contract?.selectedPolicy === 'proven_lane_priority_then_latest_proof' ? null : 'Manifest selected policy is not proven_lane_priority_then_latest_proof.',
    policyMatched ? null : `Requested selection policy ${args.selectionPolicy || '<missing>'} does not match manifest policy ${contract?.selectedPolicy || '<missing>'}.`,
    idempotencyKeyPresent ? null : 'Fresh idempotency key is required for disabled runtime-gate validation.',
    args.disabledFlagPresent ? null : 'Disabled runtime-gate flag is required.',
    contract?.enabledByDefault === false ? null : 'Runtime gate contract is enabled by default.',
    contract?.scannerOwnedOnly === true ? null : 'Runtime gate contract is not scanner-owned only.',
    contract?.approvedDeskPlanOnly === true ? null : 'Runtime gate contract does not restrict to Approved Desk Plan only.',
    contract?.maxRowsPerSession === 1 ? null : 'Runtime gate contract does not cap at one row per session.',
    contract?.sessions?.includes('morning') && contract?.sessions?.includes('lunch') ? null : 'Runtime gate contract does not include morning and lunch.',
    contract?.requiresFreshManifest === true ? null : 'Runtime gate contract does not require a fresh manifest.',
    contract?.requiresFreshIdempotencyKey === true ? null : 'Runtime gate contract does not require fresh idempotency.',
    contract?.requiresExplicitProductionApproval === true ? null : 'Runtime gate contract does not require explicit production approval.',
    args.manifest.summary.selectedRows === 2 ? null : 'Manifest did not select exactly two rows.',
    args.manifest.summary.morningRows === 1 ? null : 'Manifest did not select exactly one morning row.',
    args.manifest.summary.lunchRows === 1 ? null : 'Manifest did not select exactly one lunch row.',
    args.manifest.summary.discordPostRows === 0 ? null : 'Manifest has Discord-post rows.',
    args.manifest.summary.supabaseWriteRows === 0 ? null : 'Manifest has Supabase-write rows.',
    args.manifest.summary.liveSupabaseReadRows === 0 ? null : 'Manifest has live-Supabase-read rows.',
    args.manifest.summary.liveBridgeReadRows === 0 ? null : 'Manifest has live-bridge-read rows.',
    args.manifest.summary.canExecuteTrueRows === 0 ? null : 'Manifest has canExecute=true rows.',
    args.manifest.summary.canExecuteChangedRows === 0 ? null : 'Manifest has canExecute changed rows.',
    args.manifest.summary.tradingLogicChangedRows === 0 ? null : 'Manifest has trading-logic changed rows.',
    args.manifest.summary.runtimeInstallAllowed === false ? null : 'Manifest allows runtime install.',
    args.manifest.summary.explicitApprovalPresent === false ? null : 'Manifest already contains explicit production approval.',
    args.manifest.summary.blockedRows === 0 ? null : 'Manifest has blocked rows.',
    ...args.manifest.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<RuntimeGateManifestReceipt, 'markdown'> = {
    reportType: 'unified_desk_output_runtime_gate_manifest_disabled_receipt',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedCurrentLiveReadinessManifestOnly: true,
      validatesRuntimeGateContractOnly: true,
      runtimeGateEnabled: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      currentLiveReadinessManifestPath: args.manifestPath,
      currentLiveReadinessManifestGeneratedAt: args.manifest.generatedAt,
    },
    request: {
      selectionPolicy: args.selectionPolicy,
      idempotencyKey: args.idempotencyKey,
      disabledFlagPresent: args.disabledFlagPresent,
      explicitProductionApprovalPresent: false,
    },
    contract: {
      commandExistsNow: true,
      selectedPolicy: 'proven_lane_priority_then_latest_proof',
      enabledByDefault: false,
      scannerOwnedOnly: true,
      approvedDeskPlanOnly: true,
      maxRowsPerSession: 1,
      sessions: ['morning', 'lunch'],
      requiresFreshManifest: true,
      requiresFreshIdempotencyKey: true,
      requiresExplicitProductionApproval: true,
    },
    summary: {
      manifestPassed: args.manifest.status === 'pass',
      selectionPolicyMatched: policyMatched,
      idempotencyKeyPresent,
      disabledFlagPresent: args.disabledFlagPresent,
      selectedRows: args.manifest.summary.selectedRows,
      morningRows: args.manifest.summary.morningRows,
      lunchRows: args.manifest.summary.lunchRows,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_runtime_gate_manifest_fix' : 'ready_for_disabled_runtime_gate_validation',
    },
    selectedCandidates: args.manifest.selectedCandidates,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputRuntimeGateManifestReceipt(
  report: RuntimeGateManifestReceipt,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-runtime-gate-manifest-disabled-receipt-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-runtime-gate-manifest-disabled-receipt-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const manifestPath = path.resolve(options.manifestPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-current-live-readiness-manifest-\d+\.json$/) ||
    '');
  if (!fs.existsSync(manifestPath)) throw new Error('Missing Unified Desk Output current live-readiness manifest path.');
  const report = buildUnifiedDeskOutputRuntimeGateManifestReceipt({
    manifestPath,
    manifest: readJson<CurrentLiveReadinessManifestReport>(manifestPath),
    selectionPolicy: options.selectionPolicy,
    idempotencyKey: options.idempotencyKey,
    disabledFlagPresent: options.disabledFlagPresent,
  });
  const written = writeUnifiedDeskOutputRuntimeGateManifestReceipt(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      contract: report.contract,
      selectedCandidates: report.selectedCandidates,
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
