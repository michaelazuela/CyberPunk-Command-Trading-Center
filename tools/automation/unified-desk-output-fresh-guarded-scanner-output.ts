import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

interface CliOptions {
  selectorPreviewPath: string | null;
  guardedLaneAuditPath: string | null;
  outDir: string;
  json: boolean;
}

interface SelectorPreviewReport {
  reportType: 'unified_desk_output_selector_preview';
  generatedAt: string;
  rows: Array<Record<string, unknown>>;
}

interface GuardedLaneInstallAudit {
  reportType: 'unified_desk_output_discord_guarded_live_lane_contract';
  status: 'pass' | 'blocked';
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
    selectorPreviewPath: readFlag(args, '--selector-preview'),
    guardedLaneAuditPath: readFlag(args, '--guarded-lane-audit'),
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

function buildMarkdown(report: FreshGuardedScannerOutputReport): string {
  return [
    '# Unified Desk Output Fresh Guarded Scanner Output',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-selector refresh only. It refreshes scanner-owned builder, disabled runtime adapter, live-gate readiness, and guarded local lane artifacts. It does not post Discord, write Supabase, read live bridge data, change scanner runtime behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Selector rows: ${report.summary.selectorRows}.`,
    `- Builder rows: ${report.summary.builderRows}.`,
    `- Disabled runtime cards: ${report.summary.disabledRuntimeCards}.`,
    `- Readiness candidates: ${report.summary.readinessCandidates}.`,
    `- Eligible Approved Desk Plan rows: ${report.summary.eligibleApprovedDeskPlanRows}.`,
    `- Guarded selected rows: ${report.summary.guardedSelectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Suppressed rows: ${report.summary.suppressedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selected Candidates',
    '| Date | Session | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.selectedCandidates.map((candidate) => `| ${candidate.date} | ${candidate.session} | ${candidate.model} | ${candidate.direction} | ${candidate.proofTime.slice(11, 16)} | ${candidate.entry} | ${candidate.stop} | ${candidate.target1} | ${candidate.target2} |`),
    '',
    '## Artifacts',
    `- Builder preview: ${report.artifacts.builderPreviewJsonPath}`,
    `- Disabled runtime adapter: ${report.artifacts.disabledRuntimeAdapterJsonPath}`,
    `- Live-gate readiness: ${report.artifacts.liveGateReadinessJsonPath}`,
    `- Guarded local lane: ${report.artifacts.guardedLocalLaneJsonPath}`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

interface FreshGuardedScannerOutputReport {
  reportType: 'unified_desk_output_fresh_guarded_scanner_output';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedSelectorPreviewOnly: true;
    readsSavedGuardedLaneContractOnly: true;
    refreshesLocalScannerArtifactsOnly: true;
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
    selectorPreviewPath: string;
    guardedLaneAuditPath: string;
  };
  artifacts: {
    builderPreviewJsonPath: string;
    disabledRuntimeAdapterJsonPath: string;
    liveGateReadinessJsonPath: string;
    guardedLocalLaneJsonPath: string;
  };
  summary: {
    selectorRows: number;
    builderRows: number;
    disabledRuntimeCards: number;
    readinessCandidates: number;
    eligibleApprovedDeskPlanRows: number;
    guardedSelectedRows: number;
    morningRows: number;
    lunchRows: number;
    suppressedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    runtimeInstallAllowed: false;
    blockedRows: number;
    recommendation: 'fresh_guarded_scanner_output_ready' | 'hold_for_fresh_guarded_scanner_output_fix';
  };
  selectedCandidates: Array<{
    cardId: string;
    date: string;
    session: 'morning' | 'lunch';
    model: string;
    direction: 'LONG' | 'SHORT';
    proofTime: string;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
  }>;
  blockers: string[];
  markdown: string;
}

export function buildUnifiedDeskOutputFreshGuardedScannerOutputReport(args: {
  selectorPreviewPath: string;
  selectorPreviewReport: SelectorPreviewReport;
  guardedLaneAuditPath: string;
  guardedLaneAuditReport: GuardedLaneInstallAudit;
  outDir: string;
}, generatedAt = new Date().toISOString()): FreshGuardedScannerOutputReport {
  const builderPreview = buildUnifiedDeskOutputLocalScannerBuilderPreviewReport({
    selectorPreviewPath: args.selectorPreviewPath,
    selectorPreviewReport: args.selectorPreviewReport as unknown as Parameters<typeof buildUnifiedDeskOutputLocalScannerBuilderPreviewReport>[0]['selectorPreviewReport'],
  }, generatedAt);
  const builderWritten = writeUnifiedDeskOutputLocalScannerBuilderPreviewReport(builderPreview, args.outDir);

  const disabledRuntime = buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport({
    builderPreviewPath: builderWritten.jsonPath,
    builderPreviewReport: builderPreview as Parameters<typeof buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport>[0]['builderPreviewReport'],
  }, generatedAt);
  const disabledWritten = writeUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport(disabledRuntime, args.outDir);

  const readiness = buildUnifiedDeskOutputLiveGateReadinessAuditReport({
    disabledAdapterPreviewPath: disabledWritten.jsonPath,
    disabledAdapterPreviewReport: disabledRuntime as Parameters<typeof buildUnifiedDeskOutputLiveGateReadinessAuditReport>[0]['disabledAdapterPreviewReport'],
  }, generatedAt);
  const readinessWritten = writeUnifiedDeskOutputLiveGateReadinessAuditReport(readiness, args.outDir);

  const guardedLane = buildUnifiedDeskOutputGuardedScannerLanePreview({
    guardedLaneContract: args.guardedLaneAuditReport as Parameters<typeof buildUnifiedDeskOutputGuardedScannerLanePreview>[0]['guardedLaneContract'],
    readinessReport: readiness as Parameters<typeof buildUnifiedDeskOutputGuardedScannerLanePreview>[0]['readinessReport'],
  });
  const guardedWritten = writeUnifiedDeskOutputGuardedLocalScannerLanePreview(guardedLane, args.outDir);

  const blockers = [
    args.selectorPreviewReport.reportType === 'unified_desk_output_selector_preview'
      ? null
      : 'Source report is not the Unified Desk Output selector preview.',
    args.guardedLaneAuditReport.reportType === 'unified_desk_output_discord_guarded_live_lane_contract'
      ? null
      : 'Source report is not the guarded live-lane contract.',
    args.guardedLaneAuditReport.status === 'pass' ? null : `Guarded live-lane contract status is ${args.guardedLaneAuditReport.status}.`,
    builderPreview.blockers.length ? `Builder preview blockers: ${builderPreview.blockers.slice(0, 5).join('; ')}` : null,
    disabledRuntime.blockers.length ? `Disabled runtime blockers: ${disabledRuntime.blockers.slice(0, 5).join('; ')}` : null,
    readiness.blockers.length ? `Live-gate readiness blockers: ${readiness.blockers.slice(0, 5).join('; ')}` : null,
    guardedLane.blockers.length ? `Guarded local lane blockers: ${guardedLane.blockers.slice(0, 5).join('; ')}` : null,
  ].filter((item): item is string => Boolean(item));

  const base: Omit<FreshGuardedScannerOutputReport, 'markdown'> = {
    reportType: 'unified_desk_output_fresh_guarded_scanner_output',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedSelectorPreviewOnly: true,
      readsSavedGuardedLaneContractOnly: true,
      refreshesLocalScannerArtifactsOnly: true,
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
      selectorPreviewPath: args.selectorPreviewPath,
      guardedLaneAuditPath: args.guardedLaneAuditPath,
    },
    artifacts: {
      builderPreviewJsonPath: builderWritten.jsonPath,
      disabledRuntimeAdapterJsonPath: disabledWritten.jsonPath,
      liveGateReadinessJsonPath: readinessWritten.jsonPath,
      guardedLocalLaneJsonPath: guardedWritten.jsonPath,
    },
    summary: {
      selectorRows: args.selectorPreviewReport.rows.length,
      builderRows: builderPreview.summary.builderRows,
      disabledRuntimeCards: disabledRuntime.summary.disabledRuntimeCards,
      readinessCandidates: readiness.candidates.length,
      eligibleApprovedDeskPlanRows: guardedLane.summary.eligibleApprovedDeskPlanRows,
      guardedSelectedRows: guardedLane.summary.selectedRows,
      morningRows: guardedLane.summary.morningRows,
      lunchRows: guardedLane.summary.lunchRows,
      suppressedRows: guardedLane.summary.suppressedRows,
      discordPostRows: guardedLane.summary.discordPostRows,
      supabaseWriteRows: guardedLane.summary.supabaseWriteRows,
      liveSupabaseReadRows: guardedLane.summary.liveSupabaseReadRows,
      liveBridgeReadRows: guardedLane.summary.liveBridgeReadRows,
      canExecuteTrueRows: guardedLane.summary.canExecuteTrueRows,
      canExecuteChangedRows: guardedLane.summary.canExecuteChangedRows,
      tradingLogicChangedRows: guardedLane.summary.tradingLogicChangedRows,
      runtimeInstallAllowed: false,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_fresh_guarded_scanner_output_fix' : 'fresh_guarded_scanner_output_ready',
    },
    selectedCandidates: guardedLane.selectedCandidates.map((candidate) => ({
      cardId: candidate.cardId,
      date: candidate.date,
      session: candidate.session,
      model: candidate.model,
      direction: candidate.direction,
      proofTime: candidate.proofTime,
      entry: candidate.entry,
      stop: candidate.stop,
      target1: candidate.target1,
      target2: candidate.target2,
    })),
    blockers,
  };
  return { ...base, markdown: buildMarkdown(base as FreshGuardedScannerOutputReport) };
}

export function writeUnifiedDeskOutputFreshGuardedScannerOutputReport(
  report: FreshGuardedScannerOutputReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-fresh-guarded-scanner-output-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-fresh-guarded-scanner-output-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const selectorPreviewPath = path.resolve(options.selectorPreviewPath ||
    latestMatchingFile(outDir, /^unified-desk-output-selector-preview-\d+\.json$/) ||
    '');
  if (!fs.existsSync(selectorPreviewPath)) throw new Error('Missing Unified Desk Output selector preview path.');
  const guardedLaneAuditPath = path.resolve(options.guardedLaneAuditPath ||
    latestMatchingFile(outDir, /^unified-desk-output-discord-guarded-live-lane-install-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(guardedLaneAuditPath)) throw new Error('Missing Unified Desk Output guarded live-lane install audit path.');
  const report = buildUnifiedDeskOutputFreshGuardedScannerOutputReport({
    selectorPreviewPath,
    selectorPreviewReport: readJson<SelectorPreviewReport>(selectorPreviewPath),
    guardedLaneAuditPath,
    guardedLaneAuditReport: readJson<GuardedLaneInstallAudit>(guardedLaneAuditPath),
    outDir,
  });
  const written = writeUnifiedDeskOutputFreshGuardedScannerOutputReport(report, outDir);
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
