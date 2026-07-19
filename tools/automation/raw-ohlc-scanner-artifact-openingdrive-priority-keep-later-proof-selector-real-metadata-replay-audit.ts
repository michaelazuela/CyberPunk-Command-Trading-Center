import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SetupType } from '../../src/types';
import {
  buildCompletedFiveMinuteProofSelectionSignals,
  CompletedFiveMinuteProofSelectionSignalRef,
} from '../../src/lib/setupScanner';

interface CliOptions {
  artifact: string;
  outDir: string;
  json: boolean;
}

interface ReplayRow {
  candidateKey: string;
  eventTime: string;
  tradeDate: string;
  session: string;
  setupType: SetupType;
  direction: 'LONG' | 'SHORT';
  completedBarTime: string;
  selectorDecision: string;
  groupSize: number;
  competingSetupTypes: SetupType[];
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  deterministicLevelsValid: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_metadata_replay_audit';
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
  source: { artifactPath: string | null; reportDir: string };
  assumptions: {
    savedArtifactsOnly: true;
    usesCurrentProofSelectionSignalBuilder: true;
    noRankConsumerInstalled: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    eventsScanned: number;
    refsBuilt: number;
    signalRows: number;
    collisionSignalRows: number;
    keepLaterSweepProofRows: number;
    preferReplacementRows: number;
    keepLaterRowsWithValidLevels: number;
    missingCompletedProofGroups: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'real_metadata_replay_supports_rank_consumer_research_only' | 'fix_inputs';
  };
  rows: ReplayRow[];
  blockers: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_SETUPS = new Set<string>([
  SetupType.OpeningDriveFvgContinuation,
  SetupType.AfterLunchDriveFvgContinuation,
  SetupType.IntradayMssMicroContinuation,
  SetupType.SweepMssFvgRetrace,
]);

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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const artifact = readFlag(args, '--artifact') || latestMatchingFile(outDir, /^raw-ohlc-scanner-artifacts-MES-.*-\d+\.json$/);
  if (!artifact) throw new Error('--artifact is required.');
  return { artifact: path.resolve(artifact), outDir, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function levelsValid(row: Pick<ReplayRow, 'direction' | 'entry' | 'stop' | 'target1' | 'target2' | 'riskPoints'>): boolean {
  const values = [row.entry, row.stop, row.target1, row.target2, row.riskPoints];
  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)) return false;
  return row.direction === 'LONG'
    ? row.stop! < row.entry! && row.target1! > row.entry! && row.target2! > row.entry!
    : row.stop! > row.entry! && row.target1! < row.entry! && row.target2! < row.entry!;
}

function eventValues(artifact: Record<string, unknown>): Record<string, unknown>[] {
  const events = artifact.events;
  if (Array.isArray(events)) return events as Record<string, unknown>[];
  if (events && typeof events === 'object') return Object.values(events as Record<string, unknown>) as Record<string, unknown>[];
  return [];
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport['authority'] {
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

function mine(artifact: Record<string, unknown> | null): {
  eventsScanned: number;
  refs: CompletedFiveMinuteProofSelectionSignalRef[];
  sourceRows: Map<string, Omit<ReplayRow, 'selectorDecision' | 'groupSize' | 'competingSetupTypes'>>;
  missingCompletedProofGroups: number;
} {
  const events = artifact ? eventValues(artifact) : [];
  const refs: CompletedFiveMinuteProofSelectionSignalRef[] = [];
  const sourceRows = new Map<string, Omit<ReplayRow, 'selectorDecision' | 'groupSize' | 'competingSetupTypes'>>();
  let missingCompletedProofGroups = 0;
  for (const event of events) {
    const eventTime = typeof event.eventTime === 'string' ? event.eventTime : '';
    const tradeDate = typeof event.date === 'string' ? event.date : 'unknown';
    const session = typeof event.session === 'string' ? event.session : 'unknown';
    const completedBarTime = typeof (event.completed5m as Record<string, unknown> | undefined)?.time === 'string'
      ? String((event.completed5m as Record<string, unknown>).time)
      : '';
    if (!completedBarTime) missingCompletedProofGroups += 1;
    const statuses = (event.setupCandidateStatus as Record<string, unknown> | undefined)?.statuses;
    if (!Array.isArray(statuses) || !completedBarTime) continue;
    statuses.forEach((status, index) => {
      if (!status || typeof status !== 'object') return;
      const row = status as Record<string, unknown>;
      const setupType = row.setupType as SetupType;
      const direction = row.direction === 'LONG' ? 'LONG' : row.direction === 'SHORT' ? 'SHORT' : null;
      if (!TARGET_SETUPS.has(setupType) || !direction) return;
      const candidateKey = `${eventTime}:${index}:${setupType}:${direction}`;
      refs.push({
        candidateKey,
        setupType,
        direction,
        sessionType: session === 'lunch' ? 'lunch' : 'morning',
        completedBarTime,
      });
      const baseRow: Omit<ReplayRow, 'selectorDecision' | 'groupSize' | 'competingSetupTypes'> = {
        candidateKey,
        eventTime,
        tradeDate,
        session,
        setupType,
        direction,
        completedBarTime,
        entry: num(row.entry),
        stop: num(row.stop),
        target1: num(row.target1),
        target2: num(row.target2),
        riskPoints: num(row.riskPoints),
        deterministicLevelsValid: false,
      };
      sourceRows.set(candidateKey, { ...baseRow, deterministicLevelsValid: levelsValid(baseRow) });
    });
  }
  return { eventsScanned: events.length, refs, sourceRows, missingCompletedProofGroups };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Real Metadata Replay Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact replay through the current proofSelectionSignal builder. It does not install rank consumers, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Events scanned: ${report.summary.eventsScanned}.`,
    `- Refs built: ${report.summary.refsBuilt}.`,
    `- Signal rows: ${report.summary.signalRows}.`,
    `- Collision signal rows: ${report.summary.collisionSignalRows}.`,
    `- keep_later_sweep_proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- prefer_replacement rows: ${report.summary.preferReplacementRows}.`,
    `- keep_later rows with valid levels: ${report.summary.keepLaterRowsWithValidLevels}.`,
    `- Missing completed proof groups: ${report.summary.missingCompletedProofGroups}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport(args: {
  artifactPath: string | null;
  artifact: Record<string, unknown> | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport {
  const mined = mine(args.artifact);
  const signals = buildCompletedFiveMinuteProofSelectionSignals(mined.refs);
  const rows: ReplayRow[] = Object.entries(signals).map(([candidateKey, signal]) => ({
    ...mined.sourceRows.get(candidateKey)!,
    selectorDecision: signal.selectorDecision,
    groupSize: signal.groupSize,
    competingSetupTypes: signal.competingSetupTypes,
  })).filter((row) => Boolean(row.candidateKey));
  const keepLaterRows = rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof');
  const blockers = [
    !args.artifactPath ? 'missing artifact path' : null,
    !args.artifact ? 'missing artifact report' : null,
    mined.eventsScanned === 0 ? 'no events scanned' : null,
    rows.length === 0 ? 'no signal rows built' : null,
    keepLaterRows.length === 0 ? 'no keep_later_sweep_proof rows produced by current builder' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_metadata_replay_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { artifactPath: args.artifactPath, reportDir: DEFAULT_REPORT_DIR },
    assumptions: {
      savedArtifactsOnly: true,
      usesCurrentProofSelectionSignalBuilder: true,
      noRankConsumerInstalled: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      eventsScanned: mined.eventsScanned,
      refsBuilt: mined.refs.length,
      signalRows: rows.length,
      collisionSignalRows: rows.filter((row) => row.groupSize > 1).length,
      keepLaterSweepProofRows: keepLaterRows.length,
      preferReplacementRows: rows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
      keepLaterRowsWithValidLevels: keepLaterRows.filter((row) => row.deterministicLevelsValid).length,
      missingCompletedProofGroups: mined.missingCompletedProofGroups,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'real_metadata_replay_supports_rank_consumer_research_only',
    },
    rows,
    blockers,
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport({
    artifactPath: options.artifact,
    artifact: fs.existsSync(options.artifact) ? readJson<Record<string, unknown>>(options.artifact) : null,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
