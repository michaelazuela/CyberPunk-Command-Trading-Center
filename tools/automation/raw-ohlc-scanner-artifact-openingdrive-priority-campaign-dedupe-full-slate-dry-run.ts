import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook } from '../../src/lib/unifiedDeskCandidateBook';
import { SetupCandidate, SetupType } from '../../src/types';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow,
} from './unified-positive-held-local-preview-replay-package-outcome';

type OutcomeRow = UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeRow;

interface CliOptions {
  scannerArtifact: string;
  replayPackageOutcome: string;
  setupType: string;
  outDir: string;
  json: boolean;
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  sessionType?: 'replay_morning' | 'replay_lunch' | 'replay_evening';
  setupCandidateStatus?: {
    statuses?: SetupCandidate[];
  };
}

interface ArtifactShape {
  reportType?: string;
  instrument?: string;
  startDate?: string;
  endDate?: string;
  events?: Record<string, ArtifactEventShape>;
}

interface CandidateRow {
  ticketId: string;
  campaignId: string;
  eventTime: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  score: number | null;
  outcomeLabel: OutcomeRow['outcomeLabel'] | null;
  outcomeStatus: OutcomeRow['outcomeStatus'] | null;
  resolvedOneMesPl: number | null;
  suppressedByDedupe: boolean;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
}

interface SlateRow {
  slateId: string;
  eventTime: string;
  tradeDate: string;
  session: string;
  candidateRows: number;
  suppressedRows: number;
  baselineTopTicketId: string | null;
  baselineTopSetupType: string | null;
  baselineTopScore: number | null;
  baselineTopOneMesPl: number | null;
  dedupedTopTicketId: string | null;
  dedupedTopSetupType: string | null;
  dedupedTopScore: number | null;
  dedupedTopOneMesPl: number | null;
  topChanged: boolean;
  changedFromSuppressedSweepDuplicate: boolean;
  changedToNonSweep: boolean;
  deltaTopOneMesPl: number | null;
  canExecuteTrueRows: number;
  approvalBoundaryClean: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_full_slate_dry_run';
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
    scannerArtifact: string;
    replayPackageOutcome: string;
    setupType: string;
  };
  assumptions: {
    consumesSavedScannerArtifactOnly: true;
    consumesSavedReplayOutcomeOnly: true;
    usesInstalledCandidateBookAuditPath: true;
    exactCampaignKeyUsesModelDirectionAndLevels: true;
    duplicateSuppressionIsSimulationOnly: true;
    livePromotionAllowed: false;
  };
  summary: {
    slates: number;
    candidateRows: number;
    targetSetupRows: number;
    suppressedDuplicateRows: number;
    changedSlates: number;
    changedFromSuppressedSweepDuplicateSlates: number;
    changedToNonSweepSlates: number;
    baselineTopOneMesPl: number | null;
    dedupedTopOneMesPl: number | null;
    deltaTopOneMesPl: number | null;
    canExecuteTrueRows: number;
    approvalBoundaryDriftRows: number;
    entryStopTargetRiskDriftRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation:
      | 'full_slate_dry_run_supports_targeted_duplicate_suppression'
      | 'full_slate_dry_run_rejects_targeted_duplicate_suppression'
      | 'full_slate_dry_run_needs_more_evidence'
      | 'fix_inputs';
  };
  slates: SlateRow[];
  rows: CandidateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'NoInstalledSetup';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(outDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(outDir)) return null;
  return fs.readdirSync(outDir)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(outDir, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const scannerArtifact = readFlag(argv, '--scanner-artifact') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifacts-MES-.*-\d+\.json$/);
  const replayPackageOutcome = readFlag(argv, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  if (!scannerArtifact) throw new Error('--scanner-artifact is required.');
  if (!replayPackageOutcome) throw new Error('--replay-package-outcome is required.');
  return {
    scannerArtifact: path.resolve(scannerArtifact),
    replayPackageOutcome: path.resolve(replayPackageOutcome),
    setupType: readFlag(argv, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeTime(value: unknown): string | null {
  return typeof value === 'string' && value.trim()
    ? value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19)
    : null;
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function levelKey(value: number | null): string {
  return value === null ? 'null' : value.toFixed(2);
}

function setupTypeFrom(value: string): SetupType {
  return (Object.values(SetupType) as string[]).includes(value) ? value as SetupType : SetupType.NoSetup;
}

function sessionType(event: ArtifactEventShape): 'replay_morning' | 'replay_lunch' | 'replay_evening' {
  if (event.sessionType) return event.sessionType;
  if (event.session === 'lunch') return 'replay_lunch';
  if (event.session === 'evening') return 'replay_evening';
  return 'replay_morning';
}

function ticketId(args: {
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
}): string {
  return [
    args.tradeDate,
    args.session,
    args.setupType,
    args.direction,
    args.proofTime.replace(/[^0-9T]/g, '').slice(0, 15),
  ].join('-');
}

function campaignId(row: Pick<CandidateRow, 'tradeDate' | 'session' | 'setupType' | 'direction' | 'entry' | 'stop' | 't1' | 't2'>): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    levelKey(row.entry),
    levelKey(row.stop),
    levelKey(row.t1),
    levelKey(row.t2),
  ].join('|');
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function scoreFromCandidate(candidate: SetupCandidate): number | null {
  return finiteNumber(candidate.modelConfidenceScore) ??
    finiteNumber(candidate.decisionQualityScore) ??
    finiteNumber(candidate.rankScore) ??
    finiteNumber(candidate.priority);
}

function hasUsableLevels(candidate: SetupCandidate): boolean {
  return finiteNumber(candidate.entry) !== null &&
    finiteNumber(candidate.stop) !== null &&
    finiteNumber(candidate.target1) !== null &&
    finiteNumber(candidate.target2) !== null &&
    finiteNumber(candidate.riskPoints) !== null;
}

function outcomeMap(report: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null): Map<string, OutcomeRow> {
  return new Map((report?.rows || []).map((row) => [row.ticketId, row]));
}

function copyCandidateForBook(candidate: SetupCandidate, ticket: string): SetupCandidate {
  return {
    ...candidate,
    setupType: setupTypeFrom(String(candidate.setupType)),
    scenarioLabel: ticket,
  };
}

function ticketFromCandidateKey(candidateKey: string | undefined | null): string | null {
  return candidateKey?.split('|')[1] || null;
}

function buildRowsAndSlates(args: {
  artifact: ArtifactShape;
  outcomes: Map<string, OutcomeRow>;
  setupType: string;
}): { rows: CandidateRow[]; slates: SlateRow[] } {
  const rows: CandidateRow[] = [];
  const slates: SlateRow[] = [];
  const seenCampaigns = new Set<string>();
  const events = Object.entries(args.artifact.events || {})
    .map(([key, event]) => ({ key, event, eventTime: normalizeTime(event.eventTime) || normalizeTime(key) || key }))
    .sort((a, b) => timeMs(a.eventTime) - timeMs(b.eventTime));

  for (const { event, eventTime } of events) {
    const tradeDate = event.date || eventTime.slice(0, 10);
    const session = event.session || 'unknown';
    const candidatePairs = (event.setupCandidateStatus?.statuses || [])
      .filter((candidate) => candidate.direction === 'LONG' || candidate.direction === 'SHORT')
      .filter(hasUsableLevels)
      .map((candidate) => {
        const setupType = String(candidate.setupType || 'UnknownSetup');
        const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
        const ticket = ticketId({ tradeDate, session, setupType, direction, proofTime: eventTime });
        const outcome = args.outcomes.get(ticket) || null;
        const rowBase: CandidateRow = {
          ticketId: ticket,
          campaignId: '',
          eventTime,
          tradeDate,
          session,
          setupType,
          direction,
          score: scoreFromCandidate(candidate),
          outcomeLabel: outcome?.outcomeLabel || null,
          outcomeStatus: outcome?.outcomeStatus || null,
          resolvedOneMesPl: outcome?.resolvedOneMesPl ?? null,
          suppressedByDedupe: false,
          entry: finiteNumber(candidate.entry),
          stop: finiteNumber(candidate.stop),
          t1: finiteNumber(candidate.target1),
          t2: finiteNumber(candidate.target2),
          riskPoints: finiteNumber(candidate.riskPoints),
        };
        return {
          row: { ...rowBase, campaignId: campaignId(rowBase) },
          candidate: copyCandidateForBook(candidate, ticket),
        };
      })
      .filter((pair) => pair.row.outcomeStatus === 'resolved');

    for (const pair of candidatePairs) {
      if (pair.row.setupType === args.setupType) {
        pair.row.suppressedByDedupe = seenCampaigns.has(pair.row.campaignId);
        seenCampaigns.add(pair.row.campaignId);
      }
      rows.push(pair.row);
    }

    if (!candidatePairs.length) continue;
    const baselineBook = buildUnifiedDeskCandidateBook({
      sessionType: sessionType(event),
      completedBarTime: eventTime,
      candidates: candidatePairs.map((pair) => pair.candidate),
    });
    const dedupedPairs = candidatePairs.filter((pair) => !pair.row.suppressedByDedupe);
    const dedupedBook = buildUnifiedDeskCandidateBook({
      sessionType: sessionType(event),
      completedBarTime: eventTime,
      candidates: dedupedPairs.map((pair) => pair.candidate),
    });
    const baselineTopTicketId = ticketFromCandidateKey(baselineBook.primaryDeskIdea?.candidateKey);
    const dedupedTopTicketId = ticketFromCandidateKey(dedupedBook.primaryDeskIdea?.candidateKey);
    const baselineTop = candidatePairs.find((pair) => pair.row.ticketId === baselineTopTicketId)?.row || null;
    const dedupedTop = dedupedPairs.find((pair) => pair.row.ticketId === dedupedTopTicketId)?.row || null;
    const canExecuteTrueRows = baselineBook.candidates.filter((item) => item.canExecute).length +
      dedupedBook.candidates.filter((item) => item.canExecute).length;
    const approvalBoundaryClean = !baselineBook.approvalBoundary.changesCanExecute &&
      !baselineBook.approvalBoundary.changesEntryStopTargets &&
      !baselineBook.approvalBoundary.changesRiskRules &&
      !baselineBook.approvalBoundary.postsDiscord &&
      !baselineBook.approvalBoundary.writesSupabase &&
      !dedupedBook.approvalBoundary.changesCanExecute &&
      !dedupedBook.approvalBoundary.changesEntryStopTargets &&
      !dedupedBook.approvalBoundary.changesRiskRules &&
      !dedupedBook.approvalBoundary.postsDiscord &&
      !dedupedBook.approvalBoundary.writesSupabase;
    const deltaTopOneMesPl = baselineTop?.resolvedOneMesPl === null || dedupedTop?.resolvedOneMesPl === null ||
      baselineTop?.resolvedOneMesPl === undefined || dedupedTop?.resolvedOneMesPl === undefined
      ? null
      : round(dedupedTop.resolvedOneMesPl - baselineTop.resolvedOneMesPl);
    slates.push({
      slateId: `${tradeDate}|${session}|${eventTime}`,
      eventTime,
      tradeDate,
      session,
      candidateRows: candidatePairs.length,
      suppressedRows: candidatePairs.filter((pair) => pair.row.suppressedByDedupe).length,
      baselineTopTicketId,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopScore: baselineBook.primaryDeskIdea?.score ?? null,
      baselineTopOneMesPl: baselineTop?.resolvedOneMesPl ?? null,
      dedupedTopTicketId,
      dedupedTopSetupType: dedupedTop?.setupType || null,
      dedupedTopScore: dedupedBook.primaryDeskIdea?.score ?? null,
      dedupedTopOneMesPl: dedupedTop?.resolvedOneMesPl ?? null,
      topChanged: baselineTopTicketId !== dedupedTopTicketId,
      changedFromSuppressedSweepDuplicate: Boolean(baselineTop?.suppressedByDedupe && baselineTop.setupType === args.setupType),
      changedToNonSweep: Boolean(dedupedTop && dedupedTop.setupType !== args.setupType && baselineTop?.setupType === args.setupType),
      deltaTopOneMesPl,
      canExecuteTrueRows,
      approvalBoundaryClean,
    });
  }
  return { rows, slates };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Campaign Dedupe Full-Slate Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only full-slate dry run. It consumes saved scanner artifacts and saved replay outcomes, calls the installed candidate-book audit path, and simulates duplicate removal only in memory. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Slates: ${report.summary.slates}.`,
    `- Candidate rows: ${report.summary.candidateRows}.`,
    `- Target setup rows: ${report.summary.targetSetupRows}.`,
    `- Suppressed duplicate rows: ${report.summary.suppressedDuplicateRows}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Changed from suppressed Sweep duplicate: ${report.summary.changedFromSuppressedSweepDuplicateSlates}.`,
    `- Changed to non-Sweep: ${report.summary.changedToNonSweepSlates}.`,
    `- Baseline/deduped top P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.dedupedTopOneMesPl ?? '-'}.`,
    `- Delta top P/L: ${report.summary.deltaTopOneMesPl ?? '-'}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Approval boundary drift rows: ${report.summary.approvalBoundaryDriftRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Rows | Suppressed | Baseline Top | Baseline Model | Baseline P/L | Deduped Top | Deduped Model | Deduped P/L | Delta |',
    '|---|---:|---:|---|---|---:|---|---|---:|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${row.slateId} | ${row.candidateRows} | ${row.suppressedRows} | ${row.baselineTopTicketId ?? '-'} | ${row.baselineTopSetupType ?? '-'} | ${row.baselineTopOneMesPl ?? '-'} | ${row.dedupedTopTicketId ?? '-'} | ${row.dedupedTopSetupType ?? '-'} | ${row.dedupedTopOneMesPl ?? '-'} | ${row.deltaTopOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport(args: {
  scannerArtifactPath: string;
  scannerArtifact: ArtifactShape | null;
  replayPackageOutcomePath: string;
  replayPackageOutcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
  setupType: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport {
  const built = args.scannerArtifact
    ? buildRowsAndSlates({
      artifact: args.scannerArtifact,
      outcomes: outcomeMap(args.replayPackageOutcome),
      setupType: args.setupType,
    })
    : { rows: [], slates: [] };
  const changedSlates = built.slates.filter((row) => row.topChanged).length;
  const changedFromSuppressed = built.slates.filter((row) => row.changedFromSuppressedSweepDuplicate).length;
  const changedToNonSweep = built.slates.filter((row) => row.changedToNonSweep).length;
  const baselineTopOneMesPl = sum(built.slates.map((row) => row.baselineTopOneMesPl));
  const dedupedTopOneMesPl = sum(built.slates.map((row) => row.dedupedTopOneMesPl));
  const deltaTopOneMesPl = baselineTopOneMesPl === null || dedupedTopOneMesPl === null ? null : round(dedupedTopOneMesPl - baselineTopOneMesPl);
  const canExecuteTrueRows = built.slates.reduce((total, row) => total + row.canExecuteTrueRows, 0);
  const approvalBoundaryDriftRows = built.slates.filter((row) => !row.approvalBoundaryClean).length;
  const blockers = [
    !args.scannerArtifact ? 'missing scanner artifact' : null,
    !args.replayPackageOutcome ? 'missing replay package outcome report' : null,
    args.replayPackageOutcome && args.replayPackageOutcome.status !== 'pass' ? `replay package outcome status ${args.replayPackageOutcome.status}` : null,
    built.rows.length === 0 ? 'no joined resolved scanner candidate rows found' : null,
    built.slates.length === 0 ? 'no full slates found' : null,
    canExecuteTrueRows !== 0 ? `${canExecuteTrueRows} canExecute=true rows found` : null,
    approvalBoundaryDriftRows !== 0 ? `${approvalBoundaryDriftRows} approval-boundary drift rows found` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : changedFromSuppressed > 0 && (deltaTopOneMesPl ?? 0) > 0
      ? 'full_slate_dry_run_supports_targeted_duplicate_suppression'
      : changedFromSuppressed > 0 && (deltaTopOneMesPl ?? 0) < 0
        ? 'full_slate_dry_run_rejects_targeted_duplicate_suppression'
        : 'full_slate_dry_run_needs_more_evidence';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_campaign_dedupe_full_slate_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      scannerArtifact: args.scannerArtifactPath,
      replayPackageOutcome: args.replayPackageOutcomePath,
      setupType: args.setupType,
    },
    assumptions: {
      consumesSavedScannerArtifactOnly: true,
      consumesSavedReplayOutcomeOnly: true,
      usesInstalledCandidateBookAuditPath: true,
      exactCampaignKeyUsesModelDirectionAndLevels: true,
      duplicateSuppressionIsSimulationOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      slates: built.slates.length,
      candidateRows: built.rows.length,
      targetSetupRows: built.rows.filter((row) => row.setupType === args.setupType).length,
      suppressedDuplicateRows: built.rows.filter((row) => row.suppressedByDedupe).length,
      changedSlates,
      changedFromSuppressedSweepDuplicateSlates: changedFromSuppressed,
      changedToNonSweepSlates: changedToNonSweep,
      baselineTopOneMesPl,
      dedupedTopOneMesPl,
      deltaTopOneMesPl,
      canExecuteTrueRows,
      approvalBoundaryDriftRows,
      entryStopTargetRiskDriftRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    slates: built.slates,
    rows: built.rows,
    blockers,
    recommendations: recommendation === 'full_slate_dry_run_supports_targeted_duplicate_suppression'
      ? [
        'Full-slate dry run supports targeted duplicate suppression as research evidence only.',
        'Next phase should produce a live-proposal contract proving one scanner-owned review ticket behavior without changing Discord, Supabase, bridge, canExecute, entry, stop, target, or risk.',
      ]
      : recommendation === 'full_slate_dry_run_rejects_targeted_duplicate_suppression'
        ? [
          'Do not install targeted duplicate suppression. Full-slate ranking lost P/L when duplicate rows were removed.',
          'Next phase should mine the changed negative slates for a no-lookahead separator instead of suppressing duplicate campaigns.',
        ]
        : recommendation === 'full_slate_dry_run_needs_more_evidence'
          ? [
            'Keep duplicate suppression research-only. The full-slate dry run did not prove a meaningful selection improvement.',
            'Next phase should inspect whether duplicate rows are merely repeated visibility or distinct later completed 5M proof events.',
          ]
          : ['Fix input reports before using this full-slate dry run.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-full-slate-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeFullSlateDryRunReport({
    scannerArtifactPath: options.scannerArtifact,
    scannerArtifact: readJson<ArtifactShape>(options.scannerArtifact),
    replayPackageOutcomePath: options.replayPackageOutcome,
    replayPackageOutcome: readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.replayPackageOutcome),
    setupType: options.setupType,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
