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
}

interface ImpactEvent {
  eventKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  candidates: number;
  baselineTopCandidateKey: string | null;
  baselineTopSetupType: string | null;
  baselineTopDirection: string | null;
  baselineTopExactInvalidStopSweep: boolean;
  simulatedTopCandidateKey: string | null;
  simulatedTopSetupType: string | null;
  simulatedTopDirection: string | null;
  topChanged: boolean;
  simulatedHasReplacement: boolean;
  canExecuteChanged: boolean;
  tradeMathChanged: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_selection_impact_simulation';
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
    simulationOnly: true;
    excludesOnlyExactSweepInvalidStopLocationRows: true;
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
    changedTopEvents: number;
    changedTopEventsWithReplacement: number;
    changedTopEventsWithoutReplacement: number;
    canExecuteChangedEvents: number;
    tradeMathChangedEvents: number;
    livePromotionAllowedRows: 0;
    runtimeInstallAllowed: false;
    recommendation: 'research_selection_impact_only' | 'fix_missing_input_reports';
  };
  changedEvents: ImpactEvent[];
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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationArgs(args = process.argv.slice(2)): CliOptions {
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

function rank(value: unknown): number {
  return numberOrNull(value) ?? -999999;
}

function eventKey(date: string, session: string, eventTime: string): string {
  return `${date}|${session}|${eventTime}`;
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

function exactProofKeys(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport | null): Set<string> {
  return new Set((report?.rows || []).map((row) => row.proofKey));
}

function exactProofKeyForCandidate(row: CandidateRow): string {
  return [
    row.tradeDate,
    row.session,
    row.eventTime,
    row.direction,
    row.entry ?? 'null',
    row.stop ?? 'null',
    'InvalidStopLocation',
  ].join('|');
}

function sameMath(a: CandidateRow | null, b: CandidateRow | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.entry === b.entry &&
    a.stop === b.stop &&
    a.target1 === b.target1 &&
    a.target2 === b.target2 &&
    a.riskPoints === b.riskPoints;
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
      const time = text(eventRecord.eventTime);
      if (!tradeDate || !session || !time) continue;
      const eventId = eventKey(tradeDate, session, time);
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
        const rankScore = rank(candidate.rankScore);
        const base = {
          eventKey: eventId,
          tradeDate,
          session,
          eventTime: time,
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
          canExecute: Boolean((candidate as { humanReview?: { canExecute?: unknown } }).humanReview?.canExecute),
          exactInvalidStopSweep: false,
        };
        row.exactInvalidStopSweep = setupType === 'NoInstalledSetup' &&
          blockReason === 'InvalidStopLocation' &&
          proofKeys.has(exactProofKeyForCandidate(row));
        byKey.set(row.candidateKey, row);
      }
    }
  }
  return { filesRead: files.length, rows: [...byKey.values()] };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Current Selection-Impact Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only current raw scanner package rank simulation. It does not install runtime ranking behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Package files read: ${report.summary.packageFilesRead}.`,
    `- Candidate rows: ${report.summary.candidateRows}.`,
    `- Events: ${report.summary.events}.`,
    `- Events with exact invalid-stop Sweep: ${report.summary.eventsWithExactInvalidStopSweep}.`,
    `- Baseline top exact invalid-stop Sweep events: ${report.summary.baselineTopExactInvalidStopSweepEvents}.`,
    `- Changed top events: ${report.summary.changedTopEvents}.`,
    `- Changed top events with replacement: ${report.summary.changedTopEventsWithReplacement}.`,
    `- Changed top events without replacement: ${report.summary.changedTopEventsWithoutReplacement}.`,
    `- canExecute changed events: ${report.summary.canExecuteChangedEvents}.`,
    `- Trade math changed events: ${report.summary.tradeMathChangedEvents}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Events',
    '| Date | Session | Time | Baseline | Simulated | Replacement | canExecute Changed | Math Changed |',
    '|---|---|---|---|---|---|---|---|',
    ...report.changedEvents.slice(0, 40).map((event) => `| ${event.tradeDate} | ${event.session} | ${event.eventTime} | ${event.baselineTopSetupType || '-'} ${event.baselineTopDirection || ''} | ${event.simulatedTopSetupType || '-'} ${event.simulatedTopDirection || ''} | ${event.simulatedHasReplacement} | ${event.canExecuteChanged} | ${event.tradeMathChanged} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport(args: {
  exactProofPackagePath: string | null;
  exactProofPackageReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport | null;
  scannerPackageDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport {
  const proofKeys = exactProofKeys(args.exactProofPackageReport);
  const { filesRead, rows } = buildRows(args.scannerPackageDir, proofKeys);
  const events = new Map<string, CandidateRow[]>();
  for (const row of rows) events.set(row.eventKey, [...(events.get(row.eventKey) || []), row]);
  const impactEvents: ImpactEvent[] = [...events.entries()].map(([id, eventRows]) => {
    const baselineTop = topCandidate(eventRows);
    const simulatedTop = topCandidate(eventRows.filter((row) => !row.exactInvalidStopSweep));
    const [tradeDate, session, eventTime] = id.split('|');
    return {
      eventKey: id,
      tradeDate,
      session,
      eventTime,
      candidates: eventRows.length,
      baselineTopCandidateKey: baselineTop?.candidateKey || null,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopDirection: baselineTop?.direction || null,
      baselineTopExactInvalidStopSweep: Boolean(baselineTop?.exactInvalidStopSweep),
      simulatedTopCandidateKey: simulatedTop?.candidateKey || null,
      simulatedTopSetupType: simulatedTop?.setupType || null,
      simulatedTopDirection: simulatedTop?.direction || null,
      topChanged: (baselineTop?.candidateKey || null) !== (simulatedTop?.candidateKey || null),
      simulatedHasReplacement: Boolean(simulatedTop),
      canExecuteChanged: Boolean(baselineTop && simulatedTop && baselineTop.canExecute !== simulatedTop.canExecute),
      tradeMathChanged: !sameMath(baselineTop, simulatedTop),
    };
  }).sort((a, b) => a.eventKey.localeCompare(b.eventKey));
  const changedEvents = impactEvents.filter((event) => event.topChanged);
  const blockers = [
    !args.exactProofPackagePath ? 'missing exact proof package path' : null,
    !args.exactProofPackageReport ? 'missing exact proof package report' : null,
    proofKeys.size === 0 ? 'exact proof package has no proof rows' : null,
    filesRead === 0 ? 'no raw scanner artifact package files found' : null,
    rows.length === 0 ? 'no scanner package candidate rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_selection_impact_simulation',
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
      simulationOnly: true,
      excludesOnlyExactSweepInvalidStopLocationRows: true,
      baselineTopUsesRankScoreOnly: true,
      noRuntimeSelectorInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageFilesRead: filesRead,
      candidateRows: rows.length,
      events: events.size,
      eventsWithExactInvalidStopSweep: [...events.values()].filter((eventRows) => eventRows.some((row) => row.exactInvalidStopSweep)).length,
      baselineTopExactInvalidStopSweepEvents: impactEvents.filter((event) => event.baselineTopExactInvalidStopSweep).length,
      changedTopEvents: changedEvents.length,
      changedTopEventsWithReplacement: changedEvents.filter((event) => event.simulatedHasReplacement).length,
      changedTopEventsWithoutReplacement: changedEvents.filter((event) => !event.simulatedHasReplacement).length,
      canExecuteChangedEvents: changedEvents.filter((event) => event.canExecuteChanged).length,
      tradeMathChangedEvents: changedEvents.filter((event) => event.tradeMathChanged).length,
      livePromotionAllowedRows: 0,
      runtimeInstallAllowed: false,
      recommendation: blockers.length ? 'fix_missing_input_reports' : 'research_selection_impact_only',
    },
    changedEvents,
    blockers,
    recommendations: [
      'Treat this as research-only rank impact evidence; the top selector is a local rankScore simulation, not a runtime install.',
      'Do not install runtime ranking behavior until a proposal proves the same impact through the scanner-owned selection path.',
      'Verify any future live-facing proposal preserves canExecute, Discord routing, Supabase behavior, bridge behavior, and trade math.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-current-selection-impact-simulation-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-current-selection-impact-simulation-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport({
    exactProofPackagePath: options.exactProofPackagePath,
    exactProofPackageReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport>(options.exactProofPackagePath),
    scannerPackageDir: options.scannerPackageDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentSelectionImpactSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
