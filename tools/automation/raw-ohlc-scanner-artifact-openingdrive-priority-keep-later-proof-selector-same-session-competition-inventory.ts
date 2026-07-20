import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface OverlayRow {
  slateId: string;
  proofTime: string;
  classLabel: 'winner' | 'problem';
  resolvedOneMesPl: number | null;
  overlaySelected: boolean;
  overlayReason: string;
}

interface OverlayReport {
  status?: string;
  overlayRows?: OverlayRow[];
}

interface CompetitionGroupRow {
  groupId: string;
  slateRows: number;
  winnerSlates: number;
  problemSlates: number;
  positiveLaneSlates: number;
  earliestSlateId: string;
  earliestClassLabel: 'winner' | 'problem';
  earliestResolvedOneMesPl: number | null;
  earliestPositiveLane: boolean;
  firstPositiveLaneSlateId: string | null;
  firstPositiveLaneClassLabel: 'winner' | 'problem' | null;
  firstPositiveLaneResolvedOneMesPl: number | null;
  containsMixedOutcomes: boolean;
  containsPositiveLaneAndEarlierProblem: boolean;
  competitionClass: 'single_slate' | 'already_clean_winner' | 'mixed_competition_actionable' | 'problem_only' | 'winner_only_multi';
  note: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_same_session_competition_inventory';
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
    overlaySimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    groupsByTradeDateAndSession: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    dateSessionGroups: number;
    singleSlateGroups: number;
    multiSlateGroups: number;
    mixedCompetitionGroups: number;
    actionableMixedCompetitionGroups: number;
    problemOnlyGroups: number;
    winnerOnlyMultiGroups: number;
    alreadyCleanWinnerGroups: number;
    groupsWithPositiveLaneAndEarlierProblem: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'mine_actionable_mixed_competition_groups' | 'no_runtime_rank_consumer_from_current_set' | 'fix_inputs';
  };
  competitionGroups: CompetitionGroupRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson(filePath: string | null): OverlayReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as OverlayReport;
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function groupId(row: OverlayRow): string {
  const [tradeDate, session] = row.slateId.split('|');
  return `${tradeDate}|${session}`;
}

function classify(args: {
  rows: OverlayRow[];
  earliest: OverlayRow;
  firstPositiveLane: OverlayRow | null;
  containsMixedOutcomes: boolean;
  containsPositiveLaneAndEarlierProblem: boolean;
}): CompetitionGroupRow['competitionClass'] {
  if (args.rows.length === 1) return 'single_slate';
  if (args.containsPositiveLaneAndEarlierProblem) return 'mixed_competition_actionable';
  if (args.earliest.classLabel === 'winner' && args.firstPositiveLane?.slateId === args.earliest.slateId) return 'already_clean_winner';
  if (args.containsMixedOutcomes) return 'mixed_competition_actionable';
  if (args.rows.every((row) => row.classLabel === 'problem')) return 'problem_only';
  return 'winner_only_multi';
}

function noteFor(row: CompetitionGroupRow): string {
  if (row.competitionClass === 'single_slate') return 'No same-session competition to rank.';
  if (row.competitionClass === 'already_clean_winner') return 'Positive lane is already earliest winner; overlay cannot improve this group.';
  if (row.competitionClass === 'mixed_competition_actionable') return 'This group has mixed outcomes; mine richer proof-time fields before any rank consumer.';
  if (row.competitionClass === 'problem_only') return 'All retained slates are problematic; needs exclusion/quality research, not ranking preference.';
  return 'Multiple retained winners; rank preference is not needed for win/loss separation here.';
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Same-Session Competition Inventory',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report competition inventory. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Date/session groups: ${report.summary.dateSessionGroups}.`,
    `- Single/multi-slate groups: ${report.summary.singleSlateGroups}/${report.summary.multiSlateGroups}.`,
    `- Mixed competition groups: ${report.summary.mixedCompetitionGroups}.`,
    `- Actionable mixed competition groups: ${report.summary.actionableMixedCompetitionGroups}.`,
    `- Problem-only groups: ${report.summary.problemOnlyGroups}.`,
    `- Winner-only multi groups: ${report.summary.winnerOnlyMultiGroups}.`,
    `- Already-clean winner groups: ${report.summary.alreadyCleanWinnerGroups}.`,
    `- Groups with positive lane and earlier problem: ${report.summary.groupsWithPositiveLaneAndEarlierProblem}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport(args: {
  reportDir?: string;
  overlaySimulationPath?: string | null;
  overlaySimulation?: OverlayReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const overlaySimulationPath = args.overlaySimulationPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-overlay-simulation-');
  const overlaySimulation = args.overlaySimulation ?? readJson(overlaySimulationPath);
  const groups = new Map<string, OverlayRow[]>();
  for (const row of overlaySimulation?.overlayRows || []) groups.set(groupId(row), [...(groups.get(groupId(row)) || []), row]);
  const competitionGroups: CompetitionGroupRow[] = [...groups.entries()].map(([id, rows]) => {
    const sorted = [...rows].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
    const earliest = sorted[0];
    const firstPositiveLane = sorted.find((row) => row.overlaySelected) || null;
    const containsMixedOutcomes = sorted.some((row) => row.classLabel === 'winner') && sorted.some((row) => row.classLabel === 'problem');
    const containsPositiveLaneAndEarlierProblem = Boolean(firstPositiveLane && sorted.some((row) => row.classLabel === 'problem' && timeMs(row.proofTime) < timeMs(firstPositiveLane.proofTime)));
    const base = {
      groupId: id,
      slateRows: sorted.length,
      winnerSlates: sorted.filter((row) => row.classLabel === 'winner').length,
      problemSlates: sorted.filter((row) => row.classLabel === 'problem').length,
      positiveLaneSlates: sorted.filter((row) => row.overlaySelected).length,
      earliestSlateId: earliest.slateId,
      earliestClassLabel: earliest.classLabel,
      earliestResolvedOneMesPl: earliest.resolvedOneMesPl,
      earliestPositiveLane: earliest.overlaySelected,
      firstPositiveLaneSlateId: firstPositiveLane?.slateId || null,
      firstPositiveLaneClassLabel: firstPositiveLane?.classLabel || null,
      firstPositiveLaneResolvedOneMesPl: firstPositiveLane?.resolvedOneMesPl ?? null,
      containsMixedOutcomes,
      containsPositiveLaneAndEarlierProblem,
      competitionClass: 'single_slate' as CompetitionGroupRow['competitionClass'],
      note: '',
    };
    const competitionClass = classify({ rows: sorted, earliest, firstPositiveLane, containsMixedOutcomes, containsPositiveLaneAndEarlierProblem });
    return { ...base, competitionClass, note: noteFor({ ...base, competitionClass, note: '' }) };
  }).sort((a, b) => a.groupId.localeCompare(b.groupId));
  const blockers = [
    !overlaySimulationPath ? 'missing positive-lane overlay simulation report path' : null,
    !overlaySimulation ? 'missing positive-lane overlay simulation report' : null,
    overlaySimulation && overlaySimulation.status !== 'pass' ? `positive-lane overlay simulation status ${overlaySimulation.status}` : null,
    competitionGroups.length === 0 ? 'overlay simulation has no rows to inventory' : null,
  ].filter((item): item is string => Boolean(item));
  const actionable = competitionGroups.filter((row) => row.competitionClass === 'mixed_competition_actionable').length;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_same_session_competition_inventory',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, overlaySimulationPath },
    assumptions: {
      savedReportsOnly: true,
      groupsByTradeDateAndSession: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      dateSessionGroups: competitionGroups.length,
      singleSlateGroups: competitionGroups.filter((row) => row.competitionClass === 'single_slate').length,
      multiSlateGroups: competitionGroups.filter((row) => row.slateRows > 1).length,
      mixedCompetitionGroups: competitionGroups.filter((row) => row.containsMixedOutcomes).length,
      actionableMixedCompetitionGroups: actionable,
      problemOnlyGroups: competitionGroups.filter((row) => row.problemSlates > 0 && row.winnerSlates === 0).length,
      winnerOnlyMultiGroups: competitionGroups.filter((row) => row.competitionClass === 'winner_only_multi').length,
      alreadyCleanWinnerGroups: competitionGroups.filter((row) => row.competitionClass === 'already_clean_winner').length,
      groupsWithPositiveLaneAndEarlierProblem: competitionGroups.filter((row) => row.containsPositiveLaneAndEarlierProblem).length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : actionable > 0
          ? 'mine_actionable_mixed_competition_groups'
          : 'no_runtime_rank_consumer_from_current_set',
    },
    competitionGroups,
    blockers,
    recommendations: blockers.length
      ? ['Fix overlay simulation input before same-session competition inventory.']
      : actionable > 0
        ? ['Mine actionable mixed competition groups for richer proof-time fields before any rank consumer.']
        : [
          'Do not install a runtime rank consumer from the current set; there are no actionable mixed competition groups for the positive-lane overlay.',
          'Next broaden the candidate source or mine problem-only groups for quality filters instead of rank preference.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSameSessionCompetitionInventoryReport({
    reportDir,
    overlaySimulationPath: readFlag(args, '--overlay-simulation') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-same-session-competition-inventory-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
