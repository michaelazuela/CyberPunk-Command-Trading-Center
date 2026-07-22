import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputCurrentScannerFeedAdapterReport,
  writeUnifiedDeskOutputCurrentScannerFeedAdapterReport,
} from './unified-desk-output-current-scanner-feed-adapter';
import {
  buildUnifiedDeskOutputLocalScannerBuilderPreviewReport,
  writeUnifiedDeskOutputLocalScannerBuilderPreviewReport,
} from './unified-desk-output-local-scanner-builder-preview';
import {
  buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport,
  writeUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport,
} from './unified-desk-output-disabled-runtime-adapter-preview';
import {
  buildUnifiedDeskOutputLiveGateReadinessAuditReport,
  writeUnifiedDeskOutputLiveGateReadinessAuditReport,
} from './unified-desk-output-live-gate-readiness-audit';
import {
  buildUnifiedDeskOutputGuardedScannerLanePreview,
} from '../../src/lib/unifiedDeskOutputGuardedScannerLane';
import {
  writeUnifiedDeskOutputGuardedLocalScannerLanePreview,
} from './unified-desk-output-guarded-local-scanner-lane-preview';
import {
  buildUnifiedDeskOutputCurrentLiveReadinessManifestReport,
  writeUnifiedDeskOutputCurrentLiveReadinessManifestReport,
} from './unified-desk-output-current-live-readiness-manifest';
import {
  buildUnifiedDeskOutputRuntimeGateManifestReceipt,
  writeUnifiedDeskOutputRuntimeGateManifestReceipt,
} from './unified-desk-output-runtime-gate-manifest';

type SessionName = 'morning' | 'lunch';

interface DisabledE2ERuntimeValidationReport {
  reportType: 'unified_desk_output_disabled_e2e_runtime_validation';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedScannerArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
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
    scannerAuditDir: string;
    scannerDecisionTapePaths: string[];
    instrument: string;
    tradeDate: string | null;
    sessions: SessionName[];
    selectedPolicy: 'proven_lane_priority_then_latest_proof';
    idempotencyKey: string;
  };
  artifacts: Record<string, string | null>;
  summary: {
    scannerTapeFilesRead: number;
    scannerEventsRead: number;
    selectorRows: number;
    builderRows: number;
    disabledRuntimeCards: number;
    readinessCandidates: number;
    latestProofSelectedRows: number;
    provenLaneSelectedRows: number;
    manifestSelectedRows: number;
    runtimeReceiptSelectedRows: number;
    morningRows: number;
    lunchRows: number;
    changedFromLatestProof: boolean | null;
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
    recommendation: 'ready_for_disabled_scanner_runtime_wiring' | 'hold_for_disabled_e2e_runtime_validation_fix';
  };
  selectedCandidates: Array<Record<string, unknown>>;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  scannerAuditDir: string;
  outDir: string;
  instrument: string;
  tradeDate: string | null;
  sessions: SessionName[];
  idempotencyKey: string | null;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SCANNER_AUDIT_DIR = path.join(__dirname, 'discord-audit');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseSessions(value: string | null): SessionName[] {
  if (!value) return ['morning', 'lunch'];
  return value.split(',')
    .map((item) => item.trim())
    .filter((item): item is SessionName => item === 'morning' || item === 'lunch');
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    scannerAuditDir: readFlag(args, '--scanner-audit-dir') || DEFAULT_SCANNER_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    instrument: readFlag(args, '--instrument') || 'MES',
    tradeDate: readFlag(args, '--trade-date'),
    sessions: parseSessions(readFlag(args, '--sessions')),
    idempotencyKey: readFlag(args, '--idempotency-key'),
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestTapeFor(args: {
  scannerAuditDir: string;
  tradeDate: string | null;
  instrument: string;
  session: SessionName;
}): string | null {
  if (!fs.existsSync(args.scannerAuditDir)) return null;
  return fs.readdirSync(args.scannerAuditDir)
    .filter((name) => name.startsWith('scanner-decision-tape-') && name.endsWith(`-${args.instrument}-${args.session}.json`))
    .filter((name) => !args.tradeDate || name === `scanner-decision-tape-${args.tradeDate}-${args.instrument}-${args.session}.json`)
    .map((name) => path.join(args.scannerAuditDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function buildMarkdown(report: Omit<DisabledE2ERuntimeValidationReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Disabled E2E Runtime Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-scanner-artifact validation only. It refreshes the chain from scanner decision tape to selector preview, builder preview, disabled runtime adapter, live-gate readiness, guarded policy previews, current live-readiness manifest, and disabled runtime-gate receipt. It does not install scanner runtime behavior, post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Scanner tape files read: ${report.summary.scannerTapeFilesRead}.`,
    `- Scanner events read: ${report.summary.scannerEventsRead}.`,
    `- Selector rows: ${report.summary.selectorRows}.`,
    `- Builder rows: ${report.summary.builderRows}.`,
    `- Disabled runtime cards: ${report.summary.disabledRuntimeCards}.`,
    `- Readiness candidates: ${report.summary.readinessCandidates}.`,
    `- Latest-proof selected rows: ${report.summary.latestProofSelectedRows}.`,
    `- Proven-lane selected rows: ${report.summary.provenLaneSelectedRows}.`,
    `- Manifest selected rows: ${report.summary.manifestSelectedRows}.`,
    `- Runtime receipt selected rows: ${report.summary.runtimeReceiptSelectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Changed from latest proof: ${report.summary.changedFromLatestProof}.`,
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
    ...report.selectedCandidates.map((candidate) => `| ${candidate.session} | ${candidate.model} | ${candidate.direction} | ${String(candidate.proofTime).slice(11, 16)} | ${candidate.entry} | ${candidate.stop} | ${candidate.target1} | ${candidate.target2} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

function countSideEffects(...reports: any[]): {
  discordPostRows: number;
  supabaseWriteRows: number;
  liveSupabaseReadRows: number;
  liveBridgeReadRows: number;
  canExecuteTrueRows: number;
  canExecuteChangedRows: number;
  tradingLogicChangedRows: number;
} {
  return reports.reduce((acc, report) => {
    const summary = report?.summary || {};
    acc.discordPostRows += summary.discordPostRows || summary.adapterShouldPostDiscordRows || summary.discordPostNowRows || 0;
    acc.supabaseWriteRows += summary.supabaseWriteRows || summary.adapterWritesSupabaseRows || summary.supabaseWriteNowRows || 0;
    acc.liveSupabaseReadRows += summary.liveSupabaseReadRows || 0;
    acc.liveBridgeReadRows += summary.liveBridgeReadRows || summary.adapterReadsLiveBridgeRows || summary.liveBridgeReadNowRows || 0;
    acc.canExecuteTrueRows += summary.canExecuteTrueRows || summary.publishCanExecuteTrueRows || summary.adapterCanExecuteTrueRows || 0;
    acc.canExecuteChangedRows += summary.canExecuteChangedRows || 0;
    acc.tradingLogicChangedRows += summary.tradingLogicChangedRows || 0;
    return acc;
  }, {
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
  });
}

export function writeUnifiedDeskOutputDisabledE2ERuntimeValidationReport(
  report: DisabledE2ERuntimeValidationReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-disabled-e2e-runtime-validation-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-disabled-e2e-runtime-validation-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

export function buildUnifiedDeskOutputDisabledE2ERuntimeValidationReport(args: {
  scannerAuditDir: string;
  tapePaths: string[];
  instrument: string;
  tradeDate: string | null;
  sessions: SessionName[];
  idempotencyKey: string;
  outDir: string;
}, generatedAt = new Date().toISOString()): DisabledE2ERuntimeValidationReport {
  const blockers: string[] = [];
  if (!args.idempotencyKey) blockers.push('Fresh idempotency key is required.');
  if (args.tapePaths.length !== args.sessions.length) blockers.push('Missing one or more scanner decision tapes for requested sessions.');

  const scannerFeed = buildUnifiedDeskOutputCurrentScannerFeedAdapterReport({
    scannerAuditDir: args.scannerAuditDir,
    tapePaths: args.tapePaths,
    instrument: args.instrument,
    sessions: args.sessions,
  });
  const scannerFeedWritten = writeUnifiedDeskOutputCurrentScannerFeedAdapterReport(scannerFeed, args.outDir);
  if (!scannerFeedWritten.selectorPreviewJsonPath) blockers.push('Current scanner feed adapter did not write a selector preview.');

  const selectorPreviewReport = scannerFeedWritten.selectorPreviewJsonPath
    ? readJson<any>(scannerFeedWritten.selectorPreviewJsonPath)
    : { reportType: 'unified_desk_output_selector_preview', generatedAt, rows: [] };
  const builderPreview = buildUnifiedDeskOutputLocalScannerBuilderPreviewReport({
    selectorPreviewPath: scannerFeedWritten.selectorPreviewJsonPath || '<missing-selector-preview>',
    selectorPreviewReport,
  });
  const builderPreviewWritten = writeUnifiedDeskOutputLocalScannerBuilderPreviewReport(builderPreview as any, args.outDir);

  const disabledRuntime = buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport({
    builderPreviewPath: builderPreviewWritten.jsonPath,
    builderPreviewReport: builderPreview as any,
  });
  const disabledRuntimeWritten = writeUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport(disabledRuntime as any, args.outDir);

  const readiness = buildUnifiedDeskOutputLiveGateReadinessAuditReport({
    disabledAdapterPreviewPath: disabledRuntimeWritten.jsonPath,
    disabledAdapterPreviewReport: disabledRuntime as any,
  });
  const readinessWritten = writeUnifiedDeskOutputLiveGateReadinessAuditReport(readiness as any, args.outDir);
  const guardedLaneContractName = latestGuardedLaneContractName(args.outDir);
  const guardedLaneContract = guardedLaneContractName
    ? readJson<any>(path.join(args.outDir, guardedLaneContractName))
    : null;
  if (!guardedLaneContract) blockers.push('Missing guarded live-lane contract artifact in output directory.');

  const latestProofPreview = buildUnifiedDeskOutputGuardedScannerLanePreview({
    guardedLaneContract,
    readinessReport: readiness as any,
    selectionPolicyOrder: 'latest_completed_5m_proof_per_session',
  });
  const latestProofWritten = writeUnifiedDeskOutputGuardedLocalScannerLanePreview(latestProofPreview, args.outDir);

  const provenLanePreview = buildUnifiedDeskOutputGuardedScannerLanePreview({
    guardedLaneContract,
    readinessReport: readiness as any,
    selectionPolicyOrder: 'proven_lane_priority_then_latest_proof',
  });
  const provenLaneWritten = writeUnifiedDeskOutputGuardedLocalScannerLanePreview(provenLanePreview, args.outDir);

  const liveManifest = buildUnifiedDeskOutputCurrentLiveReadinessManifestReport({
    proposedPreviewPath: provenLaneWritten.jsonPath,
    proposedPreview: provenLanePreview as any,
    comparisonPreviewPath: latestProofWritten.jsonPath,
    comparisonPreview: latestProofPreview as any,
  });
  const liveManifestWritten = writeUnifiedDeskOutputCurrentLiveReadinessManifestReport(liveManifest as any, args.outDir);

  const runtimeReceipt = buildUnifiedDeskOutputRuntimeGateManifestReceipt({
    manifestPath: liveManifestWritten.jsonPath,
    manifest: liveManifest as any,
    selectionPolicy: 'proven_lane_priority_then_latest_proof',
    idempotencyKey: args.idempotencyKey,
    disabledFlagPresent: true,
  });
  const runtimeReceiptWritten = writeUnifiedDeskOutputRuntimeGateManifestReceipt(runtimeReceipt as any, args.outDir);

  const sideEffects = countSideEffects(
    scannerFeed,
    builderPreview,
    disabledRuntime,
    readiness,
    latestProofPreview,
    provenLanePreview,
    liveManifest,
    runtimeReceipt,
  );
  const allBlockers = [
    ...blockers,
    ...scannerFeed.blockers,
    ...builderPreview.blockers,
    ...disabledRuntime.blockers,
    ...readiness.blockers,
    ...latestProofPreview.blockers,
    ...provenLanePreview.blockers,
    ...liveManifest.blockers,
    ...runtimeReceipt.blockers,
    sideEffects.discordPostRows === 0 ? null : 'E2E validation produced Discord-post rows.',
    sideEffects.supabaseWriteRows === 0 ? null : 'E2E validation produced Supabase-write rows.',
    sideEffects.liveSupabaseReadRows === 0 ? null : 'E2E validation produced live-Supabase-read rows.',
    sideEffects.liveBridgeReadRows === 0 ? null : 'E2E validation produced live-bridge-read rows.',
    sideEffects.canExecuteTrueRows === 0 ? null : 'E2E validation produced canExecute=true rows.',
    sideEffects.canExecuteChangedRows === 0 ? null : 'E2E validation changed canExecute.',
    sideEffects.tradingLogicChangedRows === 0 ? null : 'E2E validation changed trading logic.',
    runtimeReceipt.summary.runtimeGateEnabled === false ? null : 'Runtime gate was enabled.',
  ].filter((item): item is string => Boolean(item));
  const report: Omit<DisabledE2ERuntimeValidationReport, 'markdown'> = {
    reportType: 'unified_desk_output_disabled_e2e_runtime_validation',
    generatedAt,
    status: allBlockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedScannerArtifactsOnly: true,
      writesDiagnosticArtifactsOnly: true,
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
      scannerAuditDir: args.scannerAuditDir,
      scannerDecisionTapePaths: args.tapePaths,
      instrument: args.instrument,
      tradeDate: args.tradeDate,
      sessions: args.sessions,
      selectedPolicy: 'proven_lane_priority_then_latest_proof',
      idempotencyKey: args.idempotencyKey,
    },
    artifacts: {
      currentScannerFeedAdapterJsonPath: scannerFeedWritten.jsonPath,
      selectorPreviewJsonPath: scannerFeedWritten.selectorPreviewJsonPath,
      builderPreviewJsonPath: builderPreviewWritten.jsonPath,
      disabledRuntimeAdapterJsonPath: disabledRuntimeWritten.jsonPath,
      liveGateReadinessJsonPath: readinessWritten.jsonPath,
      latestProofGuardedPreviewJsonPath: latestProofWritten.jsonPath,
      provenLaneGuardedPreviewJsonPath: provenLaneWritten.jsonPath,
      currentLiveReadinessManifestJsonPath: liveManifestWritten.jsonPath,
      runtimeGateReceiptJsonPath: runtimeReceiptWritten.jsonPath,
    },
    summary: {
      scannerTapeFilesRead: scannerFeed.summary.scannerTapeFilesRead,
      scannerEventsRead: scannerFeed.summary.scannerEventsRead,
      selectorRows: scannerFeed.summary.selectorRows,
      builderRows: builderPreview.summary.builderRows,
      disabledRuntimeCards: disabledRuntime.summary.disabledRuntimeCards,
      readinessCandidates: readiness.candidates.length,
      latestProofSelectedRows: latestProofPreview.summary.selectedRows,
      provenLaneSelectedRows: provenLanePreview.summary.selectedRows,
      manifestSelectedRows: liveManifest.summary.selectedRows,
      runtimeReceiptSelectedRows: runtimeReceipt.summary.selectedRows,
      morningRows: runtimeReceipt.summary.morningRows,
      lunchRows: runtimeReceipt.summary.lunchRows,
      changedFromLatestProof: liveManifest.summary.selectedPolicyChangedFromLatestProof,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: runtimeReceipt.summary.scannerRuntimeChangedRows,
      discordPostRows: sideEffects.discordPostRows,
      supabaseWriteRows: sideEffects.supabaseWriteRows,
      liveSupabaseReadRows: sideEffects.liveSupabaseReadRows,
      liveBridgeReadRows: sideEffects.liveBridgeReadRows,
      canExecuteTrueRows: sideEffects.canExecuteTrueRows,
      canExecuteChangedRows: sideEffects.canExecuteChangedRows,
      tradingLogicChangedRows: sideEffects.tradingLogicChangedRows,
      automatedOrderRows: runtimeReceipt.summary.automatedOrderRows,
      blockedRows: allBlockers.length,
      recommendation: allBlockers.length ? 'hold_for_disabled_e2e_runtime_validation_fix' : 'ready_for_disabled_scanner_runtime_wiring',
    },
    selectedCandidates: runtimeReceipt.selectedCandidates,
    blockers: allBlockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

function latestGuardedLaneContractName(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => /^unified-desk-output-discord-guarded-live-lane-install-audit-\d+\.json$/.test(name))
    .sort((a, b) => fs.statSync(path.join(reportDir, b)).mtimeMs - fs.statSync(path.join(reportDir, a)).mtimeMs)[0] || null;
}

async function main(): Promise<void> {
  const options = parseArgs();
  const scannerAuditDir = path.resolve(options.scannerAuditDir);
  const outDir = path.resolve(options.outDir);
  const tapePaths = options.sessions
    .map((session) => latestTapeFor({
      scannerAuditDir,
      tradeDate: options.tradeDate,
      instrument: options.instrument,
      session,
    }))
    .filter((item): item is string => Boolean(item));
  const idempotencyKey = options.idempotencyKey ||
    `unified-desk-output:disabled-e2e-runtime:${options.tradeDate || new Date().toISOString().slice(0, 10)}:${Date.now()}`;
  const report = buildUnifiedDeskOutputDisabledE2ERuntimeValidationReport({
    scannerAuditDir,
    tapePaths,
    instrument: options.instrument,
    tradeDate: options.tradeDate,
    sessions: options.sessions,
    idempotencyKey,
    outDir,
  });
  const written = writeUnifiedDeskOutputDisabledE2ERuntimeValidationReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      selectedCandidates: report.selectedCandidates,
      artifacts: report.artifacts,
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
