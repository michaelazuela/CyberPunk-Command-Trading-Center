import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  artifact: string;
  outDir: string;
  json: boolean;
}

interface CandidateRow {
  eventTime: string;
  tradeDate: string;
  session: string;
  completedBarTime: string;
  proofGroupKey: string;
  setupType: string;
  direction: string | null;
  candidateState: string | null;
  humanReviewStatus: string | null;
  confidenceScore: number | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  deterministicLevelsValid: boolean;
}

interface CollisionGroup {
  proofGroupKey: string;
  eventTime: string;
  tradeDate: string;
  session: string;
  completedBarTime: string;
  groupSize: number;
  setupTypes: string[];
  hasOpeningDrive: boolean;
  hasSweep: boolean;
  hasIntradayMssMicro: boolean;
  hasAfterLunchDrive: boolean;
  validLevelRows: number;
  rows: CandidateRow[];
}

interface PairSummary {
  pair: string;
  groups: number;
  candidateRows: number;
  validLevelRows: number;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_artifact_collision_miner';
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
    artifactPath: string | null;
  };
  assumptions: {
    savedArtifactsOnly: true;
    noSyntheticCompanionRowsAdded: true;
    proofKeySource: 'event.completed5m.time';
    scannerVisiblePopulationAllowedByThisReport: false;
    rankConsumerAllowedByThisReport: false;
  };
  summary: {
    eventsScanned: number;
    candidateRowsScanned: number;
    naturalCollisionGroups: number;
    naturalCollisionCandidateRows: number;
    openingDriveSweepGroups: number;
    openingDriveSweepCandidateRows: number;
    afterLunchSweepGroups: number;
    intradayOpeningDriveSweepGroups: number;
    groupsWithValidLevels: number;
    missingCompletedProofGroups: number;
    readyForPopulationMetadataInstallEvidence: boolean;
    scannerVisiblePopulationAllowedByThisReport: false;
    recommendation: 'real_artifact_collision_coverage_supports_population_metadata_checkpoint' | 'gather_more_real_artifacts' | 'fix_inputs';
  };
  pairSummary: PairSummary[];
  groups: CollisionGroup[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const TARGET_SETUPS = new Set([
  'NoInstalledSetup',
  'NoInstalledSetup',
  'NoInstalledSetup',
  'NoInstalledSetup',
]);

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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const artifact = readFlag(args, '--artifact') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifacts-MES-.*-\d+\.json$/);
  if (!artifact) throw new Error('--artifact is required.');
  return {
    artifact: path.resolve(artifact),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport['authority'] {
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

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function deterministicLevelsValid(row: Pick<CandidateRow, 'direction' | 'entry' | 'stop' | 'target1' | 'target2' | 'riskPoints'>): boolean {
  const values = [row.entry, row.stop, row.target1, row.target2, row.riskPoints];
  if (!values.every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)) return false;
  return row.direction === 'LONG'
    ? row.stop! < row.entry! && row.target1! > row.entry! && row.target2! > row.entry!
    : row.direction === 'SHORT' && row.stop! > row.entry! && row.target1! < row.entry! && row.target2! < row.entry!;
}

function normalizeCandidate(args: {
  eventTime: string;
  tradeDate: string;
  session: string;
  completedBarTime: string;
  proofGroupKey: string;
  status: Record<string, unknown>;
}): CandidateRow | null {
  const setupType = typeof args.status.setupType === 'string' ? args.status.setupType : null;
  if (!setupType || !TARGET_SETUPS.has(setupType)) return null;
  const row: CandidateRow = {
    eventTime: args.eventTime,
    tradeDate: args.tradeDate,
    session: args.session,
    completedBarTime: args.completedBarTime,
    proofGroupKey: args.proofGroupKey,
    setupType,
    direction: typeof args.status.direction === 'string' ? args.status.direction : null,
    candidateState: typeof args.status.candidateState === 'string' ? args.status.candidateState : null,
    humanReviewStatus: typeof (args.status.humanReview as Record<string, unknown> | undefined)?.status === 'string'
      ? String((args.status.humanReview as Record<string, unknown>).status)
      : null,
    confidenceScore: num(args.status.modelConfidenceScore),
    entry: num(args.status.entry),
    stop: num(args.status.stop),
    target1: num(args.status.target1),
    target2: num(args.status.target2),
    riskPoints: num(args.status.riskPoints),
    deterministicLevelsValid: false,
  };
  row.deterministicLevelsValid = deterministicLevelsValid(row);
  return row;
}

function eventValues(artifact: Record<string, unknown>): Record<string, unknown>[] {
  const events = artifact.events;
  if (Array.isArray(events)) return events as Record<string, unknown>[];
  if (events && typeof events === 'object') return Object.values(events as Record<string, unknown>) as Record<string, unknown>[];
  return [];
}

function mineGroups(artifact: Record<string, unknown>): { eventsScanned: number; candidateRows: CandidateRow[]; groups: CollisionGroup[]; missingCompletedProofGroups: number } {
  const events = eventValues(artifact);
  const candidateRows: CandidateRow[] = [];
  let missingCompletedProofGroups = 0;
  for (const event of events) {
    const eventTime = typeof event.eventTime === 'string' ? event.eventTime : '';
    const tradeDate = typeof event.date === 'string' ? event.date : (typeof event.tradeDate === 'string' ? event.tradeDate : 'unknown');
    const session = typeof event.session === 'string' ? event.session : 'unknown';
    const completedBarTime = typeof (event.completed5m as Record<string, unknown> | undefined)?.time === 'string'
      ? String((event.completed5m as Record<string, unknown>).time)
      : '';
    const statuses = (event.setupCandidateStatus as Record<string, unknown> | undefined)?.statuses;
    if (!Array.isArray(statuses)) continue;
    if (!completedBarTime) missingCompletedProofGroups += 1;
    const proofGroupKey = `${tradeDate}|${session}|${completedBarTime || eventTime}`;
    for (const status of statuses) {
      if (!status || typeof status !== 'object') continue;
      const row = normalizeCandidate({
        eventTime,
        tradeDate,
        session,
        completedBarTime: completedBarTime || eventTime,
        proofGroupKey,
        status: status as Record<string, unknown>,
      });
      if (row) candidateRows.push(row);
    }
  }
  const grouped = new Map<string, CandidateRow[]>();
  for (const row of candidateRows) {
    grouped.set(row.proofGroupKey, [...(grouped.get(row.proofGroupKey) || []), row]);
  }
  const groups = [...grouped.entries()].map(([proofGroupKey, rows]) => {
    const setupTypes = [...new Set(rows.map((row) => row.setupType))].sort();
    return {
      proofGroupKey,
      eventTime: rows[0]?.eventTime || '',
      tradeDate: rows[0]?.tradeDate || 'unknown',
      session: rows[0]?.session || 'unknown',
      completedBarTime: rows[0]?.completedBarTime || '',
      groupSize: rows.length,
      setupTypes,
      hasOpeningDrive: setupTypes.includes('NoInstalledSetup'),
      hasSweep: setupTypes.includes('NoInstalledSetup'),
      hasIntradayMssMicro: setupTypes.includes('NoInstalledSetup'),
      hasAfterLunchDrive: setupTypes.includes('NoInstalledSetup'),
      validLevelRows: rows.filter((row) => row.deterministicLevelsValid).length,
      rows,
    };
  }).filter((group) => group.setupTypes.length > 1 && group.groupSize > 1)
    .sort((a, b) => a.proofGroupKey.localeCompare(b.proofGroupKey));
  return { eventsScanned: events.length, candidateRows, groups, missingCompletedProofGroups };
}

function pairSummary(groups: CollisionGroup[]): PairSummary[] {
  const pairs: Array<[string, (group: CollisionGroup) => boolean]> = [
    ['NoInstalledSetup+NoInstalledSetup', (group) => group.hasOpeningDrive && group.hasSweep],
    ['NoInstalledSetup+NoInstalledSetup', (group) => group.hasAfterLunchDrive && group.hasSweep],
    ['NoInstalledSetup+NoInstalledSetup+NoInstalledSetup', (group) => group.hasIntradayMssMicro && group.hasOpeningDrive && group.hasSweep],
  ];
  return pairs.map(([pair, predicate]) => {
    const matching = groups.filter(predicate);
    return {
      pair,
      groups: matching.length,
      candidateRows: matching.reduce((sum, group) => sum + group.groupSize, 0),
      validLevelRows: matching.reduce((sum, group) => sum + group.validLevelRows, 0),
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Real-Artifact Collision Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only saved-artifact miner. It does not run setupScanner, install scanner-visible population, add a rank consumer, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Events scanned: ${report.summary.eventsScanned}.`,
    `- Candidate rows scanned: ${report.summary.candidateRowsScanned}.`,
    `- Natural collision groups: ${report.summary.naturalCollisionGroups}.`,
    `- OpeningDrive + Sweep groups: ${report.summary.openingDriveSweepGroups}.`,
    `- AfterLunch + Sweep groups: ${report.summary.afterLunchSweepGroups}.`,
    `- Intraday + OpeningDrive + Sweep groups: ${report.summary.intradayOpeningDriveSweepGroups}.`,
    `- Groups with valid deterministic levels: ${report.summary.groupsWithValidLevels}.`,
    `- Missing completed proof groups: ${report.summary.missingCompletedProofGroups}.`,
    `- Ready for population metadata install evidence: ${report.summary.readyForPopulationMetadataInstallEvidence}.`,
    `- Scanner-visible population allowed by this report: ${report.summary.scannerVisiblePopulationAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Pair Summary',
    '| Pair | Groups | Candidate Rows | Valid Level Rows |',
    '|---|---:|---:|---:|',
    ...report.pairSummary.map((row) => `| ${row.pair} | ${row.groups} | ${row.candidateRows} | ${row.validLevelRows} |`),
    '',
    '## Sample Groups',
    '| Proof Group | Date | Session | Completed 5M | Types | Rows | Valid Level Rows |',
    '|---|---|---|---|---|---:|---:|',
    ...report.groups.slice(0, 25).map((group) => `| ${group.proofGroupKey.replace(/\|/g, '/')} | ${group.tradeDate} | ${group.session} | ${group.completedBarTime} | ${group.setupTypes.join(', ')} | ${group.groupSize} | ${group.validLevelRows} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport(args: {
  artifactPath: string | null;
  artifact: Record<string, unknown> | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport {
  const mined = args.artifact ? mineGroups(args.artifact) : { eventsScanned: 0, candidateRows: [], groups: [], missingCompletedProofGroups: 0 };
  const openingDriveSweepGroups = mined.groups.filter((group) => group.hasOpeningDrive && group.hasSweep);
  const afterLunchSweepGroups = mined.groups.filter((group) => group.hasAfterLunchDrive && group.hasSweep);
  const intradayOpeningDriveSweepGroups = mined.groups.filter((group) => group.hasIntradayMssMicro && group.hasOpeningDrive && group.hasSweep);
  const groupsWithValidLevels = mined.groups.filter((group) => group.validLevelRows > 0).length;
  const blockers = [
    !args.artifactPath ? 'missing artifact path' : null,
    !args.artifact ? 'missing artifact report' : null,
    mined.eventsScanned === 0 ? 'no events found in artifact' : null,
    mined.candidateRows.length === 0 ? 'no scoped candidate rows found in artifact' : null,
    mined.groups.length === 0 ? 'no natural same-proof candidate groups found in artifact' : null,
    openingDriveSweepGroups.length === 0 ? 'no natural NoInstalledSetup + NoInstalledSetup groups found' : null,
  ].filter((item): item is string => Boolean(item));
  const readyForPopulationMetadataInstallEvidence = blockers.length === 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_artifact_collision_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      artifactPath: args.artifactPath,
    },
    assumptions: {
      savedArtifactsOnly: true,
      noSyntheticCompanionRowsAdded: true,
      proofKeySource: 'event.completed5m.time',
      scannerVisiblePopulationAllowedByThisReport: false,
      rankConsumerAllowedByThisReport: false,
    },
    summary: {
      eventsScanned: mined.eventsScanned,
      candidateRowsScanned: mined.candidateRows.length,
      naturalCollisionGroups: mined.groups.length,
      naturalCollisionCandidateRows: mined.groups.reduce((sum, group) => sum + group.groupSize, 0),
      openingDriveSweepGroups: openingDriveSweepGroups.length,
      openingDriveSweepCandidateRows: openingDriveSweepGroups.reduce((sum, group) => sum + group.groupSize, 0),
      afterLunchSweepGroups: afterLunchSweepGroups.length,
      intradayOpeningDriveSweepGroups: intradayOpeningDriveSweepGroups.length,
      groupsWithValidLevels,
      missingCompletedProofGroups: mined.missingCompletedProofGroups,
      readyForPopulationMetadataInstallEvidence,
      scannerVisiblePopulationAllowedByThisReport: false,
      recommendation: blockers.length
        ? (mined.eventsScanned === 0 || mined.candidateRows.length === 0 ? 'fix_inputs' : 'gather_more_real_artifacts')
        : 'real_artifact_collision_coverage_supports_population_metadata_checkpoint',
    },
    pairSummary: pairSummary(mined.groups),
    groups: mined.groups,
    blockers,
    recommendations: blockers.length
      ? ['Gather more saved raw scanner artifacts before any scanner-visible metadata population install.']
      : [
        'Natural same-completed-5M proof groups exist in saved scanner artifacts without synthetic companion rows.',
        'This supports a metadata-only scanner population checkpoint, still with rank consumers disabled.',
        'Do not install ranking, Discord, Supabase, bridge, canExecute, or entry/stop/target/risk changes from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealArtifactCollisionMinerReport({
    artifactPath: options.artifact,
    artifact: fs.existsSync(options.artifact) ? readJson<Record<string, unknown>>(options.artifact) : null,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-artifact-collision-miner-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runCli();
}
