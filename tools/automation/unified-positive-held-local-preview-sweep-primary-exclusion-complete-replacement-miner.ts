import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package';

interface CliOptions {
  exactProofPackagePath: string | null;
  scannerPackageDir: string;
  outDir: string;
  json: boolean;
}

interface CandidateRow {
  candidateKey: string;
  proofKey: string;
  eventKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  rankScore: number;
  canExecute: boolean;
  exactInvalidStopSweep: boolean;
  hasCompletePlan: boolean;
}

interface CompleteReplacementEvent {
  eventKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  candidateRows: number;
  exactInvalidStopSweepRows: number;
  baselineTopCandidateKey: string | null;
  baselineTopSetupType: string | null;
  baselineTopDirection: string | null;
  baselineTopRankScore: number | null;
  replacementCandidateKey: string | null;
  replacementSetupType: string | null;
  replacementDirection: string | null;
  replacementExecutionStatus: string | null;
  replacementBlockReason: string | null;
  replacementRankScore: number | null;
  replacementHasCompletePlan: boolean;
  replacementCanExecute: boolean;
  runtimeProposalCandidate: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_complete_replacement_miner';
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
    exactProofPackagePath: string | null;
    scannerPackageDir: string;
  };
  assumptions: {
    currentRawScannerPackagesOnly: true;
    exactInvalidStopSweepRowsOnly: true;
    replacementMustHaveEntryStopT1T2: true;
    baselineTopUsesRankScoreOnly: true;
    noRuntimeSelectorInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageFilesRead: number;
    candidateRows: number;
    events: number;
    eventsWithExactInvalidStopSweep: number;
    baselineTopExactInvalidStopSweepEvents: number;
    baselineTopEventsWithReplacement: number;
    completeReplacementEvents: number;
    completeReplacementCanExecuteTrueEvents: number;
    runtimeProposalCandidateEvents: number;
    runtimeInstallAllowed: false;
    recommendation: 'no_runtime_filter_supported' | 'investigate_complete_replacements' | 'fix_missing_input_reports';
  };
  events: CompleteReplacementEvent[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    exactProofPackagePath: readFlag(args, '--exact-proof-package') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package-\d+\.json$/),
    scannerPackageDir: readFlag(args, '--scanner-package-dir') || outDir,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function packageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return packageFiles(fullPath);
    return entry.isFile() && entry.name.startsWith('raw-ohlc-scanner-artifacts-') && entry.name.endsWith('.json') ? [fullPath] : [];
  }).sort();
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function proofKey(args: {
  tradeDate: string;
  session: string;
  eventTime: string;
  direction: string;
  entry: number | null;
  stop: number | null;
}): string {
  return [
    args.tradeDate,
    args.session,
    args.eventTime,
    args.direction,
    args.entry ?? 'null',
    args.stop ?? 'null',
    'InvalidStopLocation',
  ].join('|');
}

function candidateKey(args: {
  eventKey: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  rankScore: number;
}): string {
  return [
    args.eventKey,
    args.setupType,
    args.direction,
    args.executionStatus,
    args.blockReason || 'null',
    args.entry ?? 'null',
    args.stop ?? 'null',
    args.target1 ?? 'null',
    args.target2 ?? 'null',
    args.riskPoints ?? 'null',
    args.rankScore,
  ].join('|');
}

function topCandidate(rows: CandidateRow[]): CandidateRow | null {
  return [...rows].sort((a, b) => b.rankScore - a.rankScore || a.candidateKey.localeCompare(b.candidateKey))[0] || null;
}

function buildRows(dir: string, proofKeys: Set<string>): { filesRead: number; rows: CandidateRow[] } {
  const files = packageFiles(dir);
  const byKey = new Map<string, CandidateRow>();
  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    } catch {
      continue;
    }
    const events = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as { events?: unknown }).events : null;
    if (!events || typeof events !== 'object' || Array.isArray(events)) continue;
    for (const event of Object.values(events)) {
      if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
      const eventRecord = event as { date?: unknown; session?: unknown; eventTime?: unknown; setupCandidateStatus?: { statuses?: unknown } };
      const tradeDate = text(eventRecord.date);
      const session = text(eventRecord.session);
      const eventTime = text(eventRecord.eventTime);
      if (!tradeDate || !session || !eventTime) continue;
      const eventId = `${tradeDate}|${session}|${eventTime}`;
      const candidates = Array.isArray(eventRecord.setupCandidateStatus?.statuses) ? eventRecord.setupCandidateStatus.statuses : [];
      for (const candidateValue of candidates) {
        if (!candidateValue || typeof candidateValue !== 'object' || Array.isArray(candidateValue)) continue;
        const candidate = candidateValue as Record<string, unknown>;
        const setupType = text(candidate.setupType) || 'UNKNOWN';
        const direction = text(candidate.direction) || 'UNKNOWN';
        const executionStatus = text(candidate.executionStatus) || 'missing';
        const blockReason = text(candidate.blockReason);
        const entry = numberOrNull(candidate.entry);
        const stop = numberOrNull(candidate.stop);
        const target1 = numberOrNull(candidate.target1);
        const target2 = numberOrNull(candidate.target2);
        const riskPoints = numberOrNull(candidate.riskPoints);
        const rankScore = numberOrNull(candidate.rankScore) ?? -999999;
        const rowProofKey = proofKey({ tradeDate, session, eventTime, direction, entry, stop });
        const base = {
          eventKey: eventId,
          setupType,
          direction,
          executionStatus,
          blockReason,
          entry,
          stop,
          target1,
          target2,
          riskPoints,
          rankScore,
        };
        const row: CandidateRow = {
          ...base,
          candidateKey: candidateKey(base),
          proofKey: rowProofKey,
          tradeDate,
          session,
          eventTime,
          canExecute: Boolean((candidate as { humanReview?: { canExecute?: unknown } }).humanReview?.canExecute),
          exactInvalidStopSweep: setupType === 'SweepMssFvgRetrace' &&
            blockReason === 'InvalidStopLocation' &&
            proofKeys.has(rowProofKey),
          hasCompletePlan: entry !== null && stop !== null && target1 !== null && target2 !== null,
        };
        byKey.set(row.candidateKey, row);
      }
    }
  }
  return { filesRead: files.length, rows: [...byKey.values()] };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Complete Replacement Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only current raw scanner package miner. It does not run setupScanner, install runtime ranking behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Package files read: ${report.summary.packageFilesRead}.`,
    `- Candidate rows: ${report.summary.candidateRows}.`,
    `- Events: ${report.summary.events}.`,
    `- Events with exact invalid-stop Sweep: ${report.summary.eventsWithExactInvalidStopSweep}.`,
    `- Baseline top exact invalid-stop Sweep events: ${report.summary.baselineTopExactInvalidStopSweepEvents}.`,
    `- Baseline top events with replacement: ${report.summary.baselineTopEventsWithReplacement}.`,
    `- Complete replacement events: ${report.summary.completeReplacementEvents}.`,
    `- Complete replacement canExecute true events: ${report.summary.completeReplacementCanExecuteTrueEvents}.`,
    `- Runtime proposal candidate events: ${report.summary.runtimeProposalCandidateEvents}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Baseline Top Invalid-Stop Events',
    '| Date | Session | Time | Baseline | Replacement | Replacement Complete | Replacement canExecute | Runtime Candidate |',
    '|---|---|---|---|---|---|---|---|',
    ...report.events.map((event) => `| ${event.tradeDate} | ${event.session} | ${event.eventTime} | ${event.baselineTopSetupType || '-'} ${event.baselineTopDirection || ''} | ${event.replacementSetupType || '-'} ${event.replacementDirection || ''} ${event.replacementBlockReason || ''} | ${event.replacementHasCompletePlan} | ${event.replacementCanExecute} | ${event.runtimeProposalCandidate} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport(args: {
  exactProofPackagePath: string | null;
  exactProofPackageReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport | null;
  scannerPackageDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport {
  const proofKeys = new Set((args.exactProofPackageReport?.rows || []).map((row) => row.proofKey));
  const { filesRead, rows } = buildRows(args.scannerPackageDir, proofKeys);
  const events = new Map<string, CandidateRow[]>();
  for (const row of rows) events.set(row.eventKey, [...(events.get(row.eventKey) || []), row]);
  const replacementEvents = [...events.entries()].flatMap(([eventKey, eventRows]) => {
    if (!eventRows.some((row) => row.exactInvalidStopSweep)) return [];
    const baselineTop = topCandidate(eventRows);
    if (!baselineTop?.exactInvalidStopSweep) return [];
    const replacement = topCandidate(eventRows.filter((row) => !row.exactInvalidStopSweep));
    const [tradeDate, session, eventTime] = eventKey.split('|');
    const runtimeProposalCandidate = Boolean(replacement?.hasCompletePlan && !replacement.canExecute);
    return [{
      eventKey,
      tradeDate,
      session,
      eventTime,
      candidateRows: eventRows.length,
      exactInvalidStopSweepRows: eventRows.filter((row) => row.exactInvalidStopSweep).length,
      baselineTopCandidateKey: baselineTop.candidateKey,
      baselineTopSetupType: baselineTop.setupType,
      baselineTopDirection: baselineTop.direction,
      baselineTopRankScore: baselineTop.rankScore,
      replacementCandidateKey: replacement?.candidateKey || null,
      replacementSetupType: replacement?.setupType || null,
      replacementDirection: replacement?.direction || null,
      replacementExecutionStatus: replacement?.executionStatus || null,
      replacementBlockReason: replacement?.blockReason || null,
      replacementRankScore: replacement?.rankScore || null,
      replacementHasCompletePlan: Boolean(replacement?.hasCompletePlan),
      replacementCanExecute: Boolean(replacement?.canExecute),
      runtimeProposalCandidate,
    }];
  }).sort((a, b) => a.eventKey.localeCompare(b.eventKey));
  const blockers = [
    !args.exactProofPackagePath ? 'missing exact proof package path' : null,
    !args.exactProofPackageReport ? 'missing exact proof package report' : null,
    proofKeys.size === 0 ? 'exact proof package has no proof rows' : null,
    filesRead === 0 ? 'no raw scanner artifact package files found' : null,
    rows.length === 0 ? 'no scanner package candidate rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const completeReplacementEvents = replacementEvents.filter((event) => event.replacementHasCompletePlan).length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_complete_replacement_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
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
    },
    source: {
      exactProofPackagePath: args.exactProofPackagePath,
      scannerPackageDir: args.scannerPackageDir,
    },
    assumptions: {
      currentRawScannerPackagesOnly: true,
      exactInvalidStopSweepRowsOnly: true,
      replacementMustHaveEntryStopT1T2: true,
      baselineTopUsesRankScoreOnly: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageFilesRead: filesRead,
      candidateRows: rows.length,
      events: events.size,
      eventsWithExactInvalidStopSweep: [...events.values()].filter((eventRows) => eventRows.some((row) => row.exactInvalidStopSweep)).length,
      baselineTopExactInvalidStopSweepEvents: replacementEvents.length,
      baselineTopEventsWithReplacement: replacementEvents.filter((event) => event.replacementCandidateKey).length,
      completeReplacementEvents,
      completeReplacementCanExecuteTrueEvents: replacementEvents.filter((event) => event.replacementHasCompletePlan && event.replacementCanExecute).length,
      runtimeProposalCandidateEvents: replacementEvents.filter((event) => event.runtimeProposalCandidate).length,
      runtimeInstallAllowed: false,
      recommendation: blockers.length
        ? 'fix_missing_input_reports'
        : completeReplacementEvents > 0
          ? 'investigate_complete_replacements'
          : 'no_runtime_filter_supported',
    },
    events: replacementEvents,
    blockers,
    recommendations: [
      completeReplacementEvents === 0
        ? 'Do not install a runtime Sweep primary-selection exclusion from the current raw package evidence; no exact invalid-stop Sweep top event has a complete same-slate replacement.'
        : 'Investigate complete replacements with scanner-owned DeskState/DeskPublishDecision snapshots before any runtime proposal.',
      'Keep SweepMssFvgRetrace active; this miner only evaluates invalid-stop row contamination, not model removal.',
      'Continue research on source geometry repair or complete-plan replacement evidence before touching scanner-visible behavior.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-complete-replacement-miner-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-complete-replacement-miner-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport({
    exactProofPackagePath: options.exactProofPackagePath,
    exactProofPackageReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport>(options.exactProofPackagePath),
    scannerPackageDir: options.scannerPackageDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCompleteReplacementMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
