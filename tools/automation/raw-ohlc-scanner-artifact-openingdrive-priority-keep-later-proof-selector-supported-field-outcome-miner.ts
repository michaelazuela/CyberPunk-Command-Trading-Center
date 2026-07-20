import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit';

type Direction = 'LONG' | 'SHORT';

interface ReplayPackageReport {
  status?: string;
  source?: { artifactPaths?: string[] };
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
}

interface OutcomeReport {
  status?: string;
  rows?: OutcomeRow[];
}

interface JoinedRow extends OutcomeRow {
  fields: Record<string, string>;
}

interface FeatureStatRow {
  feature: string;
  value: string;
  totalRows: number;
  winnerRows: number;
  problemRows: number;
  unresolvedRows: number;
  grossResolvedOneMesPl: number;
  verdict: 'negative_candidate' | 'positive_candidate' | 'mixed_or_too_small';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_supported_field_outcome_miner';
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
    replayPackagePath: string | null;
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    joinsByReplayTicketId: true;
    usesSupportedScannerFieldsOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    outcomeRows: number;
    joinedRows: number;
    featureStats: number;
    negativeCandidates: number;
    positiveCandidates: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_supported_field_candidates' | 'no_supported_field_candidate' | 'fix_inputs';
  };
  featureStats: FeatureStatRow[];
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

function bucket(value: number, cuts: number[], labels: string[]): string {
  for (let i = 0; i < cuts.length; i += 1) if (value < cuts[i]) return labels[i];
  return labels[labels.length - 1];
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function fieldsFromStatus(row: Record<string, unknown>): Record<string, string> {
  const evidence = Array.isArray(row.evidence) ? row.evidence.length : 0;
  const missing = Array.isArray(row.missingEvidence) ? row.missingEvidence.length : 0;
  const levelContextScore = num(row.levelContextScore);
  const rankScore = num(row.rankScore);
  return {
    detectedStatus: str(row.detectedStatus) || 'missing',
    confidence: str(row.confidence) || 'missing',
    riskAdvisoryStatus: str(row.riskAdvisoryStatus) || 'missing',
    targetRoomStatus: str(valueAt(row, 'targetRoom.targetRoomStatus')) || 'missing',
    cleanPathToT1: str(valueAt(row, 'targetRoom.cleanPathToT1')) || 'missing',
    t2ExtensionObstructed: str(valueAt(row, 'targetRoom.t2ExtensionObstructed')) || 'missing',
    timeframeMssStatus: str(valueAt(row, 'activeRuleset.timeframeMss.status')) || 'missing',
    htfLineInSandStatus: str(valueAt(row, 'activeRuleset.htfLineInSand.status')) || 'missing',
    proximityScore: str(row.proximityScore) || 'missing',
    levelContextBucket: levelContextScore === null ? 'missing' : bucket(levelContextScore, [0, 10, 20, 30], ['lt_0', '0_to_9', '10_to_19', '20_to_29', 'gte_30']),
    rankScoreBucket: rankScore === null ? 'missing' : bucket(rankScore, [150, 200, 250], ['lt_150', '150_to_199', '200_to_249', 'gte_250']),
    evidenceCountBucket: bucket(evidence, [30, 35, 40], ['lt_30', '30_to_34', '35_to_39', 'gte_40']),
    missingEvidenceCountBucket: bucket(missing, [3, 6, 9], ['lt_3', '3_to_5', '6_to_8', 'gte_9']),
  };
}

function candidateKey(eventTime: string, index: number, setupType: string, direction: string): string {
  return `${eventTime}:${index}:${setupType}:${direction}`;
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport['authority'] {
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

function buildJoinedRows(artifactPaths: string[], outcomeRows: OutcomeRow[]): JoinedRow[] {
  const outcomeByTicket = new Map(outcomeRows.map((row) => [row.ticketId, row]));
  const joined: JoinedRow[] = [];
  for (const artifactPath of artifactPaths) {
    const artifact = readJson<Record<string, unknown>>(artifactPath);
    if (!artifact) continue;
    const audit = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport({ artifactPath, artifact });
    const keepLaterKeys = new Set(audit.rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof' && row.deterministicLevelsValid).map((row) => row.candidateKey));
    for (const event of events(artifact)) {
      const eventTime = typeof event.eventTime === 'string' ? event.eventTime : '';
      const statuses = (event.setupCandidateStatus as Record<string, unknown> | undefined)?.statuses;
      if (!Array.isArray(statuses)) continue;
      statuses.forEach((status, index) => {
        if (!status || typeof status !== 'object') return;
        const statusRow = status as Record<string, unknown>;
        const setupType = str(statusRow.setupType) || '';
        const direction = statusRow.direction === 'LONG' || statusRow.direction === 'SHORT' ? statusRow.direction : '';
        const key = candidateKey(eventTime, index, setupType, direction);
        if (!keepLaterKeys.has(key)) return;
        const ticketId = `${path.basename(artifactPath, '.json')}|${key}`;
        const outcome = outcomeByTicket.get(ticketId);
        if (outcome) joined.push({ ...outcome, fields: fieldsFromStatus(statusRow) });
      });
    }
  }
  return joined;
}

function buildFeatureStats(rows: JoinedRow[]): FeatureStatRow[] {
  const stats = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    for (const [feature, value] of Object.entries(row.fields)) {
      const key = `${feature}=${value}`;
      stats.set(key, [...(stats.get(key) || []), row]);
    }
  }
  return [...stats.entries()].map(([key, matchedRows]): FeatureStatRow => {
    const [feature, value] = key.split('=');
    const winnerRows = matchedRows.filter(isWinner).length;
    const problemRows = matchedRows.filter(isProblem).length;
    const unresolvedRows = matchedRows.filter((row) => row.outcomeStatus === 'unresolved').length;
    return {
      feature,
      value,
      totalRows: matchedRows.length,
      winnerRows,
      problemRows,
      unresolvedRows,
      grossResolvedOneMesPl: round(matchedRows.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0)),
      verdict: problemRows >= 3 && winnerRows === 0 && unresolvedRows === 0
        ? 'negative_candidate'
        : winnerRows >= 5 && problemRows === 0 && unresolvedRows === 0
          ? 'positive_candidate'
          : 'mixed_or_too_small',
    };
  }).sort((a, b) => (
    Number(b.verdict === 'negative_candidate') - Number(a.verdict === 'negative_candidate')
    || Number(b.verdict === 'positive_candidate') - Number(a.verdict === 'positive_candidate')
    || b.problemRows - a.problemRows
    || a.feature.localeCompare(b.feature)
  ));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Supported Field Outcome Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact/outcome miner. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Feature stats: ${report.summary.featureStats}.`,
    `- Negative candidates: ${report.summary.negativeCandidates}.`,
    `- Positive candidates: ${report.summary.positiveCandidates}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport(args: {
  reportDir?: string;
  replayPackagePath?: string | null;
  outcomePath?: string | null;
  replayPackage?: ReplayPackageReport | null;
  outcome?: OutcomeReport | null;
  joinedRows?: JoinedRow[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const replayPackagePath = args.replayPackagePath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-broader-daily-replay-package-');
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const replayPackage = args.replayPackage ?? readJson<ReplayPackageReport>(replayPackagePath);
  const outcome = args.outcome ?? readJson<OutcomeReport>(outcomePath);
  const outcomeRows = outcome?.rows || [];
  const artifactPaths = replayPackage?.source?.artifactPaths || [];
  const joinedRows = args.joinedRows || buildJoinedRows(artifactPaths, outcomeRows);
  const featureStats = buildFeatureStats(joinedRows);
  const negativeCandidates = featureStats.filter((row) => row.verdict === 'negative_candidate').length;
  const positiveCandidates = featureStats.filter((row) => row.verdict === 'positive_candidate').length;
  const blockers = [
    !replayPackagePath && !args.replayPackage && !args.joinedRows ? 'missing broader replay package path' : null,
    !outcomePath && !args.outcome && !args.joinedRows ? 'missing broader outcome path' : null,
    replayPackage && replayPackage.status !== 'pass' ? `broader replay package status ${replayPackage.status}` : null,
    outcome && outcome.status !== 'pass' ? `broader outcome status ${outcome.status}` : null,
    outcomeRows.length === 0 && !args.joinedRows ? 'broader outcome has no rows' : null,
    joinedRows.length === 0 ? 'no scanner artifact rows joined to outcomes' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_supported_field_outcome_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, replayPackagePath, outcomePath },
    assumptions: {
      savedReportsOnly: true,
      joinsByReplayTicketId: true,
      usesSupportedScannerFieldsOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      outcomeRows: outcomeRows.length || joinedRows.length,
      joinedRows: joinedRows.length,
      featureStats: featureStats.length,
      negativeCandidates,
      positiveCandidates,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : negativeCandidates || positiveCandidates
          ? 'validate_supported_field_candidates'
          : 'no_supported_field_candidate',
    },
    featureStats: featureStats.slice(0, 80),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved replay/outcome inputs before supported-field outcome mining.']
      : negativeCandidates || positiveCandidates
        ? ['Validate supported-field candidates in a separate simulation before any scanner-visible behavior.']
        : ['No supported-field candidate is strong enough from this pass; do not install a runtime rank consumer.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport({
    reportDir,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-supported-field-outcome-miner-${Date.now()}.json`);
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
