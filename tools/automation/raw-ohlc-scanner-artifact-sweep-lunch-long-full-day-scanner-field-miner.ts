import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type Verdict = 'positive_candidate' | 'negative_candidate' | 'mixed_or_too_small';

interface ReplayPackageRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  occurrences?: number;
  riskPoints: number | null;
  proofState?: string;
}

interface ReplayPackageReport {
  status?: string;
  source?: { artifactPaths?: string[] };
  rows?: ReplayPackageRow[];
}

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofTime: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  riskPoints?: number | null;
}

interface FullDayRollupReport {
  status?: string;
  rows?: OutcomeRow[];
}

export interface JoinedRow extends OutcomeRow {
  fields: Record<string, string>;
}

interface FeatureStatRow {
  feature: string;
  value: string;
  totalRows: number;
  winnerRows: number;
  problemRows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  stoppedRows: number;
  unresolvedRows: number;
  grossResolvedOneMesPl: number;
  winnerRate: number;
  problemRate: number;
  verdict: Verdict;
}

export interface RawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_full_day_scanner_field_miner';
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
    fullDayRollupPath: string | null;
    replayPackagePath: string | null;
    filter: {
      setupType: 'NoInstalledSetup';
      session: 'lunch';
      direction: 'LONG';
    };
  };
  assumptions: {
    savedReportsOnly: true;
    joinsByReplayTicketId: true;
    usesScannerOwnedFieldsOnly: true;
    outcomesUsedOnlyForResearchLabels: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    outcomeRows: number;
    filteredOutcomeRows: number;
    joinedRows: number;
    featureStats: number;
    positiveCandidates: number;
    negativeCandidates: number;
    bestPositiveCandidate: string | null;
    bestNegativeCandidate: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_scanner_field_candidates' | 'no_scanner_field_candidate' | 'fix_inputs';
  };
  featureStats: FeatureStatRow[];
  joinedRows: JoinedRow[];
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

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function events(artifact: Record<string, unknown>): Record<string, unknown>[] {
  const raw = artifact.events;
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === 'object') return Object.values(raw as Record<string, unknown>) as Record<string, unknown>[];
  return [];
}

function valueAt(record: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((current, key) => (
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)[key]
      : null
  ), record);
}

function str(value: unknown): string | null {
  if (typeof value === 'string' && value) return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function bucket(value: number, cuts: number[], labels: string[]): string {
  for (let i = 0; i < cuts.length; i += 1) if (value < cuts[i]) return labels[i];
  return labels[labels.length - 1];
}

function proofHour(proofTime: string): string {
  return proofTime.match(/T(\d{2}):/)?.[1] || 'missing';
}

function riskBucket(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'missing';
  if (value <= 8) return '<=8';
  if (value <= 12) return '8.25-12';
  if (value <= 18) return '12.25-18';
  if (value <= 25) return '18.25-25';
  return '>25';
}

function hasText(values: unknown, pattern: RegExp): string {
  if (!Array.isArray(values)) return 'false';
  return values.some((value) => typeof value === 'string' && pattern.test(value)) ? 'true' : 'false';
}

function candidateKey(eventTime: string, index: number, setupType: string, direction: string): string {
  return `${eventTime}:${index}:${setupType}:${direction}`;
}

function isTarget(row: Pick<OutcomeRow, 'setupType' | 'session' | 'direction'>): boolean {
  return row.setupType === 'NoInstalledSetup' && row.session === 'lunch' && row.direction === 'LONG';
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function fieldsFromStatus(statusRow: Record<string, unknown>, replayRow: ReplayPackageRow | null, outcomeRow: OutcomeRow): Record<string, string> {
  const evidence = Array.isArray(statusRow.evidence) ? statusRow.evidence.length : 0;
  const missing = Array.isArray(statusRow.missingEvidence) ? statusRow.missingEvidence.length : 0;
  const levelContextScore = num(statusRow.levelContextScore);
  const rankScore = num(statusRow.rankScore);
  const priority = num(statusRow.priority);
  const entryClarity = num(statusRow.entryClarity);
  const stopClarity = num(statusRow.stopClarity);
  const targetClarity = num(statusRow.targetClarity);
  const riskPoints = num(statusRow.riskPoints) ?? replayRow?.riskPoints ?? outcomeRow.riskPoints ?? null;
  return {
    proofHour: proofHour(outcomeRow.proofTime),
    riskBucket: riskBucket(riskPoints),
    occurrenceBucket: replayRow?.occurrences === undefined ? 'missing' : bucket(replayRow.occurrences, [2, 4, 8], ['1', '2_to_3', '4_to_7', 'gte_8']),
    proofState: replayRow?.proofState || 'missing',
    detectedStatus: str(statusRow.detectedStatus) || 'missing',
    confidence: str(statusRow.confidence) || 'missing',
    executionStatus: str(statusRow.executionStatus) || 'missing',
    blockReason: str(statusRow.blockReason) || 'missing',
    riskAdvisoryStatus: str(statusRow.riskAdvisoryStatus) || 'missing',
    targetRoomStatus: str(valueAt(statusRow, 'targetRoom.targetRoomStatus')) || 'missing',
    cleanPathToT1: str(valueAt(statusRow, 'targetRoom.cleanPathToT1')) || 'missing',
    t2ExtensionObstructed: str(valueAt(statusRow, 'targetRoom.t2ExtensionObstructed')) || 'missing',
    timeframeMssStatus: str(valueAt(statusRow, 'activeRuleset.timeframeMss.status')) || 'missing',
    htfLineInSandStatus: str(valueAt(statusRow, 'activeRuleset.htfLineInSand.status')) || 'missing',
    rankScoreBucket: rankScore === null ? 'missing' : bucket(rankScore, [150, 200, 250], ['lt_150', '150_to_199', '200_to_249', 'gte_250']),
    priorityBucket: priority === null ? 'missing' : bucket(priority, [30, 60, 90], ['lt_30', '30_to_59', '60_to_89', 'gte_90']),
    levelContextBucket: levelContextScore === null ? 'missing' : bucket(levelContextScore, [0, 10, 20, 30], ['lt_0', '0_to_9', '10_to_19', '20_to_29', 'gte_30']),
    entryClarityBucket: entryClarity === null ? 'missing' : bucket(entryClarity, [0.5, 0.75, 1], ['lt_0_5', '0_5_to_0_74', '0_75_to_0_99', '1']),
    stopClarityBucket: stopClarity === null ? 'missing' : bucket(stopClarity, [0.5, 0.75, 1], ['lt_0_5', '0_5_to_0_74', '0_75_to_0_99', '1']),
    targetClarityBucket: targetClarity === null ? 'missing' : bucket(targetClarity, [0.5, 0.75, 1], ['lt_0_5', '0_5_to_0_74', '0_75_to_0_99', '1']),
    evidenceCountBucket: bucket(evidence, [30, 35, 40], ['lt_30', '30_to_34', '35_to_39', 'gte_40']),
    missingEvidenceCountBucket: bucket(missing, [3, 6, 9], ['lt_3', '3_to_5', '6_to_8', 'gte_9']),
    hasSessionChopEvidence: hasText(statusRow.evidence, /Session narrative: chop/i),
    hasPremiumDiscountEvidence: hasText(statusRow.evidence, /Premium\/discount alignment/i),
    hasTierBDisplacementEvidence: hasText(statusRow.evidence, /Tier B displacement/i),
    hasOpposingHtfMssMissingEvidence: hasText(statusRow.missingEvidence, /opposing completed HTF MSS/i),
    hasNoChaseMissingEvidence: hasText(statusRow.missingEvidence, /No chase/i),
  };
}

function buildJoinedRows(artifactPaths: string[], replayRows: ReplayPackageRow[], outcomeRows: OutcomeRow[]): JoinedRow[] {
  const outcomeByTicket = new Map(outcomeRows.filter(isTarget).map((row) => [row.ticketId, row]));
  const replayByTicket = new Map(replayRows.filter(isTarget).map((row) => [row.ticketId, row]));
  const joined: JoinedRow[] = [];
  for (const artifactPath of artifactPaths) {
    const artifact = readJson<Record<string, unknown>>(artifactPath);
    if (!artifact) continue;
    for (const event of events(artifact)) {
      const eventTime = typeof event.eventTime === 'string' ? event.eventTime : '';
      const statuses = (event.setupCandidateStatus as Record<string, unknown> | undefined)?.statuses;
      if (!Array.isArray(statuses)) continue;
      statuses.forEach((status, index) => {
        if (!status || typeof status !== 'object') return;
        const statusRow = status as Record<string, unknown>;
        const setupType = str(statusRow.setupType) || '';
        const direction = statusRow.direction === 'LONG' || statusRow.direction === 'SHORT' ? statusRow.direction : '';
        const ticketId = `${path.basename(artifactPath, '.json')}|${candidateKey(eventTime, index, setupType, direction)}`;
        const outcome = outcomeByTicket.get(ticketId);
        if (!outcome) return;
        joined.push({ ...outcome, fields: fieldsFromStatus(statusRow, replayByTicket.get(ticketId) || null, outcome) });
      });
    }
  }
  return joined;
}

function verdictFor(args: { totalRows: number; winnerRate: number; problemRate: number; grossResolvedOneMesPl: number }): Verdict {
  if (args.totalRows >= 12 && args.winnerRate >= 0.75 && args.problemRate <= 0.25 && args.grossResolvedOneMesPl > 0) return 'positive_candidate';
  if (args.totalRows >= 12 && args.problemRate >= 0.55 && args.winnerRate <= 0.45) return 'negative_candidate';
  return 'mixed_or_too_small';
}

function buildFeatureStats(rows: JoinedRow[]): FeatureStatRow[] {
  const stats = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    for (const [feature, value] of Object.entries(row.fields)) {
      stats.set(`${feature}=${value}`, [...(stats.get(`${feature}=${value}`) || []), row]);
    }
  }
  return [...stats.entries()].map(([key, matchedRows]) => {
    const separator = key.indexOf('=');
    const feature = key.slice(0, separator);
    const value = key.slice(separator + 1);
    const winnerRows = matchedRows.filter(isWinner).length;
    const problemRows = matchedRows.filter(isProblem).length;
    const grossResolvedOneMesPl = round(matchedRows.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0));
    const winnerRate = round(winnerRows / matchedRows.length);
    const problemRate = round(problemRows / matchedRows.length);
    return {
      feature,
      value,
      totalRows: matchedRows.length,
      winnerRows,
      problemRows,
      noFillRows: matchedRows.filter((row) => row.outcomeLabel === 'no_fill').length,
      noTargetOrStopRows: matchedRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      stoppedRows: matchedRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      unresolvedRows: matchedRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      grossResolvedOneMesPl,
      winnerRate,
      problemRate,
      verdict: verdictFor({ totalRows: matchedRows.length, winnerRate, problemRate, grossResolvedOneMesPl }),
    };
  }).sort((a, b) => (
    Number(b.verdict === 'positive_candidate') - Number(a.verdict === 'positive_candidate')
    || Number(b.verdict === 'negative_candidate') - Number(a.verdict === 'negative_candidate')
    || b.winnerRate - a.winnerRate
    || b.grossResolvedOneMesPl - a.grossResolvedOneMesPl
    || a.feature.localeCompare(b.feature)
  ));
}

function authority(): RawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch LONG Full-Day Scanner Field Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact/outcome miner. Outcomes label the research rows, but candidate fields are scanner-owned fields captured before outcome resolution. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Filtered outcome rows: ${report.summary.filteredOutcomeRows}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Feature stats: ${report.summary.featureStats}.`,
    `- Positive/negative candidates: ${report.summary.positiveCandidates} / ${report.summary.negativeCandidates}.`,
    `- Best positive candidate: ${report.summary.bestPositiveCandidate || 'none'}.`,
    `- Best negative candidate: ${report.summary.bestNegativeCandidate || 'none'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport(args: {
  reportDir?: string;
  fullDayRollupPath?: string | null;
  replayPackagePath?: string | null;
  fullDayRollup?: FullDayRollupReport | null;
  replayPackage?: ReplayPackageReport | null;
  joinedRows?: JoinedRow[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const fullDayRollupPath = args.fullDayRollupPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-full-day-model-session-direction-rollup-');
  const replayPackagePath = args.replayPackagePath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-');
  const fullDayRollup = args.fullDayRollup ?? readJson<FullDayRollupReport>(fullDayRollupPath);
  const replayPackage = args.replayPackage ?? readJson<ReplayPackageReport>(replayPackagePath);
  const outcomeRows = fullDayRollup?.rows || [];
  const filteredOutcomeRows = outcomeRows.filter(isTarget);
  const joinedRows = args.joinedRows || buildJoinedRows(replayPackage?.source?.artifactPaths || [], replayPackage?.rows || [], outcomeRows);
  const featureStats = buildFeatureStats(joinedRows);
  const positiveCandidates = featureStats.filter((row) => row.verdict === 'positive_candidate');
  const negativeCandidates = featureStats.filter((row) => row.verdict === 'negative_candidate');
  const blockers = [
    !fullDayRollupPath && !args.fullDayRollup && !args.joinedRows ? 'missing full-day rollup path' : null,
    !replayPackagePath && !args.replayPackage && !args.joinedRows ? 'missing replay package path' : null,
    !fullDayRollup && !args.joinedRows ? 'missing full-day rollup report' : null,
    !replayPackage && !args.joinedRows ? 'missing replay package report' : null,
    fullDayRollup && fullDayRollup.status !== 'pass' ? `full-day rollup status ${fullDayRollup.status}` : null,
    replayPackage && replayPackage.status !== 'pass' ? `replay package status ${replayPackage.status}` : null,
    outcomeRows.length === 0 && !args.joinedRows ? 'full-day rollup has no rows' : null,
    filteredOutcomeRows.length === 0 && !args.joinedRows ? 'no NoInstalledSetup lunch LONG full-day rows found' : null,
    joinedRows.length === 0 ? 'no NoInstalledSetup lunch LONG scanner rows joined to full-day outcomes' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_full_day_scanner_field_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      fullDayRollupPath,
      replayPackagePath,
      filter: {
        setupType: 'NoInstalledSetup',
        session: 'lunch',
        direction: 'LONG',
      },
    },
    assumptions: {
      savedReportsOnly: true,
      joinsByReplayTicketId: true,
      usesScannerOwnedFieldsOnly: true,
      outcomesUsedOnlyForResearchLabels: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      outcomeRows: outcomeRows.length || joinedRows.length,
      filteredOutcomeRows: filteredOutcomeRows.length || joinedRows.length,
      joinedRows: joinedRows.length,
      featureStats: featureStats.length,
      positiveCandidates: positiveCandidates.length,
      negativeCandidates: negativeCandidates.length,
      bestPositiveCandidate: positiveCandidates[0] ? `${positiveCandidates[0].feature}=${positiveCandidates[0].value}` : null,
      bestNegativeCandidate: negativeCandidates[0] ? `${negativeCandidates[0].feature}=${negativeCandidates[0].value}` : null,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : positiveCandidates.length || negativeCandidates.length
          ? 'validate_scanner_field_candidates'
          : 'no_scanner_field_candidate',
    },
    featureStats: featureStats.slice(0, 120),
    joinedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved full-day rollup/replay inputs before scanner-field mining.']
      : positiveCandidates.length || negativeCandidates.length
        ? ['Validate scanner-owned field candidates in a separate no-lookahead selection simulation before any scanner-visible behavior.']
        : ['No scanner-owned field candidate is strong enough from this pass; do not install a runtime rank consumer.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport({
    reportDir,
    fullDayRollupPath: readFlag(args, '--full-day-rollup') || undefined,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-scanner-field-miner-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, topFeatureStats: report.featureStats.slice(0, 10), blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
