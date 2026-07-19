import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-exclusion-carveout-miner';

interface CliOptions {
  carveoutMiner: string;
  auditDir: string;
  outDir: string;
  json: boolean;
}

type UnresolvedClass =
  | 'countertrend_opposing_mss_conditional'
  | 'failed_plan_reversal_no_deterministic_levels'
  | 'htf_mss_protected_stop_conflict'
  | 'manual_inspection_required';

interface UnresolvedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  snapshotId: string | null;
  blockReason: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  unresolvedClass: UnresolvedClass;
  performanceCarveoutEligible: boolean;
  selectorProposalEligible: false;
  evidenceNotes: string[];
  recommendation: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_unresolved_exclusion_drilldown';
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
    carveoutMinerPath: string | null;
    auditDir: string;
  };
  assumptions: {
    consumesSavedResearchReportsAndSnapshotsOnly: true;
    unresolvedRowsAreNotRepaired: true;
    livePromotionAllowed: false;
  };
  summary: {
    unresolvedRows: number;
    newlyPerformanceCarveoutEligibleRows: number;
    manualInspectionRows: number;
    selectorProposalEligibleRows: 0;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'rerun_readiness_with_research_accounting_carveouts'
      | 'manual_snapshot_inspection_before_retest'
      | 'fix_inputs';
  };
  rows: UnresolvedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');

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
  const carveoutMiner = readFlag(args, '--carveout-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-exclusion-carveout-miner-\d+\.json$/);
  if (!carveoutMiner) throw new Error('--carveout-miner is required.');
  return {
    carveoutMiner: path.resolve(carveoutMiner),
    auditDir: path.resolve(readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport['authority'] {
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

function matchingCandidate(auditDir: string, snapshotId: string | null, setupType: string, direction: string): Record<string, unknown> | null {
  if (!snapshotId) return null;
  const file = path.join(auditDir, `${snapshotId}.json`);
  if (!fs.existsSync(file)) return null;
  const candidates = asRecord(readJson<unknown>(file)).normalizedPlan;
  const setupCandidates = asRecord(candidates).setupCandidates;
  if (!Array.isArray(setupCandidates)) return null;
  return setupCandidates.map(asRecord).find((candidate) => candidate.setupType === setupType && candidate.direction === direction) || null;
}

function activeBlockers(candidate: Record<string, unknown> | null): string[] {
  const activeRuleset = asRecord(candidate?.activeRuleset);
  return Object.values(activeRuleset).flatMap((ruleset) => stringArray(asRecord(ruleset).blockers));
}

function classify(args: {
  setupType: string;
  candidate: Record<string, unknown> | null;
  missingEvidence: string[];
  evidence: string[];
  activeRulesetBlockers: string[];
}): UnresolvedClass {
  const text = [...args.missingEvidence, ...args.evidence, ...args.activeRulesetBlockers].join(' | ');
  if (args.setupType === 'SweepMssFvgRetrace' && /Countertrend|opposing completed 5M|opposing completed HTF|Structure signal conflicts/i.test(text)) {
    return 'countertrend_opposing_mss_conditional';
  }
  if (args.setupType === 'FailedPlanReversal' && (!numberOrNull(args.candidate?.entry) || !numberOrNull(args.candidate?.stop))) {
    return 'failed_plan_reversal_no_deterministic_levels';
  }
  if (args.setupType === 'HtfDisplacementMssContinuation' && /Protected 5M MSS swing stop blocked|Protected 5M structure stop|opposing completed 5M/i.test(text)) {
    return 'htf_mss_protected_stop_conflict';
  }
  return 'manual_inspection_required';
}

function rowRecommendation(unresolvedClass: UnresolvedClass): string {
  if (unresolvedClass === 'countertrend_opposing_mss_conditional') return 'Treat as research-accounting carveout: it is conditional/countertrend with opposing completed MSS, not proof for selector promotion.';
  if (unresolvedClass === 'failed_plan_reversal_no_deterministic_levels') return 'Treat as research-accounting carveout until app-owned opposite-side entry, protected stop, and targets exist.';
  if (unresolvedClass === 'htf_mss_protected_stop_conflict') return 'Treat as research-accounting carveout until protected 5M stop and aligned completed 5M MSS exist.';
  return 'Keep out of readiness until manually inspected.';
}

function buildRows(args: {
  carveoutMiner: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport | null;
  auditDir: string;
}): UnresolvedRow[] {
  return (args.carveoutMiner?.rows || [])
    .filter((row) => !row.performanceCarveoutEligible)
    .map((row) => {
      const candidate = matchingCandidate(args.auditDir, row.snapshotId, row.setupType, row.direction);
      const missingEvidence = stringArray(candidate?.missingEvidence);
      const evidence = stringArray(candidate?.evidence);
      const activeRulesetBlockers = activeBlockers(candidate);
      const unresolvedClass = classify({ setupType: row.setupType, candidate, missingEvidence, evidence, activeRulesetBlockers });
      const performanceCarveoutEligible = unresolvedClass !== 'manual_inspection_required';
      return {
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        snapshotId: row.snapshotId,
        blockReason: stringOrNull(candidate?.blockReason) || row.blockReason,
        entry: numberOrNull(candidate?.entry),
        stop: numberOrNull(candidate?.stop),
        target1: numberOrNull(candidate?.target1),
        target2: numberOrNull(candidate?.target2),
        unresolvedClass,
        performanceCarveoutEligible,
        selectorProposalEligible: false,
        evidenceNotes: [...missingEvidence, ...activeRulesetBlockers].slice(0, 8),
        recommendation: rowRecommendation(unresolvedClass),
      };
    });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Unresolved Exclusion Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only unresolved exclusion drilldown. It reads saved research reports and scanner snapshots only; it does not run setupScanner, change selector behavior, post Discord, write Supabase, read live bridge data, or change trading logic.',
    '',
    '## Summary',
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- Newly performance-carveout eligible rows: ${report.summary.newlyPerformanceCarveoutEligibleRows}.`,
    `- Manual-inspection rows: ${report.summary.manualInspectionRows}.`,
    `- Selector-proposal eligible rows: ${report.summary.selectorProposalEligibleRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Ticket | Class | Entry | Stop | T1 | T2 | Performance Carveout |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.unresolvedClass} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} | ${row.performanceCarveoutEligible} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport(args: {
  carveoutMinerPath: string | null;
  carveoutMiner: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport {
  const blockers = [
    !args.carveoutMinerPath ? 'missing carveout miner path' : null,
    !args.carveoutMiner ? 'missing carveout miner report' : null,
    args.carveoutMiner && args.carveoutMiner.status !== 'pass' ? `carveout miner status ${args.carveoutMiner.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const rows = buildRows(args);
  const manualInspectionRows = rows.filter((row) => row.unresolvedClass === 'manual_inspection_required').length;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_unresolved_exclusion_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      carveoutMinerPath: args.carveoutMinerPath,
      auditDir: args.auditDir,
    },
    assumptions: {
      consumesSavedResearchReportsAndSnapshotsOnly: true,
      unresolvedRowsAreNotRepaired: true,
      livePromotionAllowed: false,
    },
    summary: {
      unresolvedRows: rows.length,
      newlyPerformanceCarveoutEligibleRows: rows.filter((row) => row.performanceCarveoutEligible).length,
      manualInspectionRows,
      selectorProposalEligibleRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs'
        : manualInspectionRows > 0 ? 'manual_snapshot_inspection_before_retest'
          : 'rerun_readiness_with_research_accounting_carveouts',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix source report inputs before unresolved-exclusion drilldown.']
      : ['Use these classifications for research accounting only, then rerun readiness with explicit carveouts. Do not install live selector behavior from this report alone.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-unresolved-exclusion-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport({
    carveoutMinerPath: options.carveoutMiner,
    carveoutMiner: fs.existsSync(options.carveoutMiner)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorExclusionCarveoutMinerReport>(options.carveoutMiner)
      : null,
    auditDir: options.auditDir,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, rows: report.rows }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorUnresolvedExclusionDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
