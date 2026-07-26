import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';
type ReadinessState = 'awaiting_explicit_discord_execution' | 'ready_for_final_receipt_handoff' | 'hold_for_install_fix';
type ArtifactPathOption =
  | 'activationPath'
  | 'scannerReadbackPath'
  | 'discordPreviewPath'
  | 'launchChecklistPath'
  | 'oneRowManifestPath'
  | 'disabledSenderPath'
  | 'closeoutPath';

interface SourceReport {
  reportType?: string;
  status?: string;
  closeoutState?: string;
  selectedCandidate?: {
    candidateId?: string;
    sourceCardId?: string;
    idempotencyKey?: string;
    approvalPhrase?: string;
  } | null;
  source?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface ArtifactSpec {
  label: string;
  optionName: ArtifactPathOption;
  reportType: string;
  expectedStatus: string;
}

interface FiveModelInstallReadinessAuditReport {
  reportType: 'five_model_install_readiness_audit';
  generatedAt: string;
  status: ReportStatus;
  readinessState: ReadinessState;
  authority: {
    localOnly: true;
    readsDiagnosticArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
    postsDiscord: false;
    webhookCalls: 0;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    printsSecretValues: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: Record<string, string | null>;
  selectedCandidate: {
    candidateId: string | null;
    sourceCardId: string | null;
    idempotencyKey: string | null;
    approvalPhrase: string | null;
  };
  requirementAudit: Array<{
    requirement: string;
    evidence: string;
    status: 'proven' | 'waiting' | 'blocked';
  }>;
  summary: {
    artifactsChecked: number;
    artifactsPassed: number;
    scannerSurfaceRows: number;
    scannerReadbackRows: number;
    discordPreviewPayloads: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    candidateSelectedRows: number;
    payloadSelectedRows: number;
    productionReceiptAcceptedRows: number;
    discordPostRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: ReadinessState;
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  activationPath: string | null;
  scannerReadbackPath: string | null;
  discordPreviewPath: string | null;
  launchChecklistPath: string | null;
  oneRowManifestPath: string | null;
  disabledSenderPath: string | null;
  closeoutPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

const ARTIFACT_SPECS: ArtifactSpec[] = [
  {
    label: 'Production scanner surface activation',
    optionName: 'activationPath',
    reportType: 'five_model_production_scanner_surface_activation',
    expectedStatus: 'active',
  },
  {
    label: 'Production scanner readback',
    optionName: 'scannerReadbackPath',
    reportType: 'five_model_production_scanner_readback',
    expectedStatus: 'pass',
  },
  {
    label: 'Discord dry-run preview',
    optionName: 'discordPreviewPath',
    reportType: 'five_model_discord_dry_run_preview',
    expectedStatus: 'pass',
  },
  {
    label: 'Launch checklist',
    optionName: 'launchChecklistPath',
    reportType: 'five_model_launch_checklist',
    expectedStatus: 'pass',
  },
  {
    label: 'One-row rehearsal manifest',
    optionName: 'oneRowManifestPath',
    reportType: 'five_model_discord_one_row_rehearsal_manifest',
    expectedStatus: 'pass',
  },
  {
    label: 'Disabled sender',
    optionName: 'disabledSenderPath',
    reportType: 'five_model_discord_one_row_production_rehearsal_disabled_sender',
    expectedStatus: 'pass',
  },
  {
    label: 'Production rehearsal closeout',
    optionName: 'closeoutPath',
    reportType: 'five_model_discord_production_rehearsal_closeout',
    expectedStatus: 'pass',
  },
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    activationPath: readFlag(args, '--activation'),
    scannerReadbackPath: readFlag(args, '--scanner-readback'),
    discordPreviewPath: readFlag(args, '--discord-preview'),
    launchChecklistPath: readFlag(args, '--launch-checklist'),
    oneRowManifestPath: readFlag(args, '--one-row-manifest'),
    disabledSenderPath: readFlag(args, '--disabled-sender'),
    closeoutPath: readFlag(args, '--closeout'),
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
        return readJson<SourceReport>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function sideEffectBlockers(label: string, report: SourceReport): string[] {
  return [
    numberValue(report.summary?.discordPostRows) === 0 ? null : `${label} has Discord-post rows.`,
    numberValue(report.summary?.webhookCallRows) === 0 ? null : `${label} has webhook-call rows.`,
    numberValue(report.summary?.supabaseWriteRows) === 0 ? null : `${label} has Supabase-write rows.`,
    numberValue(report.summary?.liveSupabaseReadRows) === 0 ? null : `${label} has live Supabase read rows.`,
    numberValue(report.summary?.liveBridgeReadRows) === 0 ? null : `${label} has live bridge read rows.`,
    numberValue(report.summary?.canExecuteTrueRows) === 0 ? null : `${label} has canExecute=true rows.`,
    numberValue(report.summary?.canExecuteChangedRows) === 0 ? null : `${label} changed canExecute.`,
    numberValue(report.summary?.tradingLogicChangedRows) === 0 ? null : `${label} changed trading logic.`,
    numberValue(report.summary?.automatedOrderRows) === 0 ? null : `${label} has automated-order rows.`,
    ...(report.blockers || []),
  ].filter((item): item is string => Boolean(item));
}

function validateArtifact(spec: ArtifactSpec, filePath: string | null, report: SourceReport | null): string[] {
  if (!filePath || !report) return [`${spec.label} artifact is missing.`];
  return [
    report.reportType === spec.reportType ? null : `${spec.label} report type is ${report.reportType || '<missing>'}.`,
    report.status === spec.expectedStatus ? null : `${spec.label} status is ${report.status || '<missing>'}.`,
    ...sideEffectBlockers(spec.label, report),
  ].filter((item): item is string => Boolean(item));
}

function buildRequirementAudit(args: {
  blockers: string[];
  closeout: SourceReport;
  closeoutState: ReadinessState;
  manifestPath: string | null;
  disabledSenderPath: string | null;
  closeoutPath: string | null;
}): FiveModelInstallReadinessAuditReport['requirementAudit'] {
  const baseStatus = args.blockers.length ? 'blocked' : 'proven';
  return [
    {
      requirement: 'Five-model scanner surface is active and scanner-readable.',
      evidence: 'Production scanner surface activation plus scanner readback artifacts.',
      status: baseStatus,
    },
    {
      requirement: 'Discord payloads are rendered as dry-run previews before any webhook call.',
      evidence: 'Discord dry-run preview artifact and launch checklist.',
      status: baseStatus,
    },
    {
      requirement: 'Exactly one production rehearsal candidate is fixed by candidate id and idempotency key.',
      evidence: args.manifestPath || '<missing manifest>',
      status: baseStatus,
    },
    {
      requirement: 'Production sender is installed but disabled unless the exact approval gate is supplied.',
      evidence: args.disabledSenderPath || '<missing disabled sender>',
      status: baseStatus,
    },
    {
      requirement: 'Closeout runbook proves the next state without making a webhook call.',
      evidence: args.closeoutPath || '<missing closeout>',
      status: baseStatus,
    },
    {
      requirement: 'One real Discord rehearsal receipt and receipt audit.',
      evidence: args.closeout.closeoutState === 'ready_for_final_handoff'
        ? 'Closeout includes passing receipt audit.'
        : 'Closeout is waiting for explicit one-row Discord execution.',
      status: args.blockers.length
        ? 'blocked'
        : args.closeoutState === 'ready_for_final_receipt_handoff'
          ? 'proven'
          : 'waiting',
    },
  ];
}

function buildMarkdown(report: Omit<FiveModelInstallReadinessAuditReport, 'markdown'>): string {
  return [
    '# Five Model Install Readiness Audit',
    '',
    `Status: ${report.status}`,
    `Readiness state: ${report.readinessState}`,
    '',
    'Authority: local readiness audit only. It reads saved diagnostics and writes diagnostics. It does not post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Candidate',
    `- Candidate: ${report.selectedCandidate.candidateId || 'none'}.`,
    `- Source card: ${report.selectedCandidate.sourceCardId || 'none'}.`,
    `- Idempotency key: ${report.selectedCandidate.idempotencyKey || 'none'}.`,
    '',
    '## Requirements',
    ...report.requirementAudit.map((item) => `- ${item.status}: ${item.requirement} Evidence: ${item.evidence}`),
    '',
    '## Summary',
    `- Artifacts checked: ${report.summary.artifactsChecked}.`,
    `- Artifacts passed: ${report.summary.artifactsPassed}.`,
    `- Scanner surface rows: ${report.summary.scannerSurfaceRows}.`,
    `- Scanner readback rows: ${report.summary.scannerReadbackRows}.`,
    `- Discord preview payloads: ${report.summary.discordPreviewPayloads}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Payload selected rows: ${report.summary.payloadSelectedRows}.`,
    `- Production receipt accepted rows: ${report.summary.productionReceiptAcceptedRows}.`,
    `- This audit Discord-post rows: ${report.summary.discordPostRows}.`,
    `- This audit webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelInstallReadinessAuditReport(args: {
  sources: Record<string, string | null>;
  reports: Record<string, SourceReport | null>;
}, generatedAt = new Date().toISOString()): FiveModelInstallReadinessAuditReport {
  const reports = args.reports;
  const activation = reports.activationPath || {};
  const scannerReadback = reports.scannerReadbackPath || {};
  const discordPreview = reports.discordPreviewPath || {};
  const manifest = reports.oneRowManifestPath || {};
  const closeout = reports.closeoutPath || {};
  const blockers = ARTIFACT_SPECS.flatMap((spec) =>
    validateArtifact(spec, args.sources[spec.optionName], reports[spec.optionName] || null),
  );
  const closeoutState: ReadinessState = closeout.closeoutState === 'ready_for_final_handoff'
    ? 'ready_for_final_receipt_handoff'
    : closeout.closeoutState === 'awaiting_explicit_discord_execution'
      ? 'awaiting_explicit_discord_execution'
      : 'hold_for_install_fix';
  if (!blockers.length && closeoutState === 'hold_for_install_fix') {
    blockers.push(`Closeout state is ${closeout.closeoutState || '<missing>'}.`);
  }
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const selectedCandidate = manifest.selectedCandidate || closeout.selectedCandidate || null;
  const report: Omit<FiveModelInstallReadinessAuditReport, 'markdown'> = {
    reportType: 'five_model_install_readiness_audit',
    generatedAt,
    status,
    readinessState: status === 'pass' ? closeoutState : 'hold_for_install_fix',
    authority: {
      localOnly: true,
      readsDiagnosticArtifactsOnly: true,
      writesDiagnosticArtifactsOnly: true,
      postsDiscord: false,
      webhookCalls: 0,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      printsSecretValues: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: args.sources,
    selectedCandidate: {
      candidateId: selectedCandidate?.candidateId || null,
      sourceCardId: selectedCandidate?.sourceCardId || null,
      idempotencyKey: selectedCandidate?.idempotencyKey || null,
      approvalPhrase: selectedCandidate?.approvalPhrase || null,
    },
    requirementAudit: buildRequirementAudit({
      blockers,
      closeout,
      closeoutState,
      manifestPath: args.sources.oneRowManifestPath,
      disabledSenderPath: args.sources.disabledSenderPath,
      closeoutPath: args.sources.closeoutPath,
    }),
    summary: {
      artifactsChecked: ARTIFACT_SPECS.length,
      artifactsPassed: status === 'pass' ? ARTIFACT_SPECS.length : 0,
      scannerSurfaceRows: status === 'pass' ? numberValue(activation.summary?.selectedRows) : 0,
      scannerReadbackRows: status === 'pass' ? numberValue(scannerReadback.summary?.selectedRows) : 0,
      discordPreviewPayloads: status === 'pass' ? numberValue(discordPreview.summary?.previewPayloads) : 0,
      approvedDeskPlanRows: status === 'pass' ? numberValue(activation.summary?.approvedDeskPlanRows) : 0,
      formingDeskReadRows: status === 'pass' ? numberValue(activation.summary?.formingDeskReadRows) : 0,
      candidateSelectedRows: status === 'pass' ? numberValue(manifest.summary?.candidateSelectedRows) : 0,
      payloadSelectedRows: status === 'pass' ? numberValue(manifest.summary?.payloadSelectedRows) : 0,
      productionReceiptAcceptedRows: status === 'pass' && closeoutState === 'ready_for_final_receipt_handoff' ? 1 : 0,
      discordPostRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass' ? closeoutState : 'hold_for_install_fix',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelInstallReadinessAuditReport(
  report: FiveModelInstallReadinessAuditReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-install-readiness-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-install-readiness-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const sources = Object.fromEntries(ARTIFACT_SPECS.map((spec) => {
    const supplied = options[spec.optionName];
    const latest = latestReportByType(outDir, spec.reportType);
    const resolved = supplied || latest;
    return [spec.optionName, resolved ? path.resolve(resolved) : null];
  })) as Record<string, string | null>;
  const reports = Object.fromEntries(ARTIFACT_SPECS.map((spec) => {
    const filePath = sources[spec.optionName];
    return [spec.optionName, filePath && fs.existsSync(filePath) ? readJson<SourceReport>(filePath) : null];
  })) as Record<string, SourceReport | null>;
  const report = buildFiveModelInstallReadinessAuditReport({ sources, reports });
  const written = writeFiveModelInstallReadinessAuditReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      readinessState: report.readinessState,
      selectedCandidate: report.selectedCandidate,
      summary: report.summary,
      requirementAudit: report.requirementAudit,
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
