import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit';

interface CliOptions {
  packageMetadataAuditPath: string | null;
  scannerPackageDir: string;
  outDir: string;
  json: boolean;
}

interface MissingSlateDrilldown {
  slateId: string;
  tradeDate: string;
  session: string;
  expectedDirection: string | null;
  sameDateSessionPackageEvents: number;
  sameDateSessionSweepCandidates: number;
  sweepDirectionCounts: Record<string, number>;
  sweepExecutionStatusCounts: Record<string, number>;
  likelyCause: 'unsupported_evening_replay_session' | 'current_scanner_direction_or_detection_mismatch' | 'missing_package_events' | 'unknown';
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_nonreproduction_drilldown';
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
    packageMetadataAuditPath: string | null;
    scannerPackageDir: string;
  };
  summary: {
    missingSlates: number;
    unsupportedEveningReplaySession: number;
    currentScannerDirectionOrDetectionMismatch: number;
    missingPackageEvents: number;
    runtimeInstallAllowed: false;
    recommendation: 'keep_research_only_do_not_install_runtime' | 'fix_missing_input_reports';
  };
  missingSlates: MissingSlateDrilldown[];
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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    packageMetadataAuditPath: readFlag(args, '--package-metadata-audit') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit-\d+\.json$/),
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
  });
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function increment(record: Record<string, number>, key: string | null): void {
  const normalized = key || 'missing';
  record[normalized] = (record[normalized] || 0) + 1;
}

function scanPackages(dir: string, tradeDate: string, session: string): {
  eventCount: number;
  sweepCandidates: number;
  directionCounts: Record<string, number>;
  executionStatusCounts: Record<string, number>;
} {
  let eventCount = 0;
  let sweepCandidates = 0;
  const directionCounts: Record<string, number> = {};
  const executionStatusCounts: Record<string, number> = {};
  for (const file of packageFiles(dir)) {
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
      const eventRecord = event as { date?: unknown; session?: unknown; setupCandidateStatus?: { statuses?: unknown } };
      if (text(eventRecord.date) !== tradeDate || text(eventRecord.session) !== session) continue;
      eventCount += 1;
      const candidates = Array.isArray(eventRecord.setupCandidateStatus?.statuses) ? eventRecord.setupCandidateStatus.statuses : [];
      for (const candidateValue of candidates) {
        if (!candidateValue || typeof candidateValue !== 'object' || Array.isArray(candidateValue)) continue;
        const candidate = candidateValue as Record<string, unknown>;
        if (text(candidate.setupType) !== 'NoInstalledSetup') continue;
        sweepCandidates += 1;
        increment(directionCounts, text(candidate.direction));
        increment(executionStatusCounts, text(candidate.executionStatus));
      }
    }
  }
  return { eventCount, sweepCandidates, directionCounts, executionStatusCounts };
}

function likelyCause(args: { session: string; eventCount: number; sweepCandidates: number; expectedDirection: string | null; directionCounts: Record<string, number> }): MissingSlateDrilldown['likelyCause'] {
  if (args.session === 'evening' && args.eventCount === 0) return 'unsupported_evening_replay_session';
  if (args.eventCount === 0) return 'missing_package_events';
  if (args.sweepCandidates > 0 && args.expectedDirection && !args.directionCounts[args.expectedDirection]) return 'current_scanner_direction_or_detection_mismatch';
  return 'unknown';
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Nonreproduction Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-package drilldown. No runtime behavior, Supabase, Discord, live bridge, canExecute, or trade math changes.',
    '',
    '## Summary',
    `- Missing slates: ${report.summary.missingSlates}.`,
    `- Unsupported evening replay session: ${report.summary.unsupportedEveningReplaySession}.`,
    `- Current scanner direction/detection mismatch: ${report.summary.currentScannerDirectionOrDetectionMismatch}.`,
    `- Missing package events: ${report.summary.missingPackageEvents}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Missing Slates',
    '| Date | Session | Expected Direction | Events | Sweep Candidates | Direction Counts | Execution Status Counts | Likely Cause |',
    '|---|---|---|---:|---:|---|---|---|',
    ...report.missingSlates.map((slate) => `| ${slate.tradeDate} | ${slate.session} | ${slate.expectedDirection || '-'} | ${slate.sameDateSessionPackageEvents} | ${slate.sameDateSessionSweepCandidates} | ${JSON.stringify(slate.sweepDirectionCounts)} | ${JSON.stringify(slate.sweepExecutionStatusCounts)} | ${slate.likelyCause} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport(args: {
  packageMetadataAuditPath: string | null;
  packageMetadataAuditReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport | null;
  scannerPackageDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport {
  const missingSlates = (args.packageMetadataAuditReport?.slates || [])
    .filter((slate) => slate.packageMatches === 0)
    .map((slate) => {
      const scan = scanPackages(args.scannerPackageDir, slate.tradeDate, slate.session);
      const cause = likelyCause({
        session: slate.session,
        eventCount: scan.eventCount,
        sweepCandidates: scan.sweepCandidates,
        expectedDirection: slate.direction,
        directionCounts: scan.directionCounts,
      });
      return {
        slateId: slate.slateId,
        tradeDate: slate.tradeDate,
        session: slate.session,
        expectedDirection: slate.direction,
        sameDateSessionPackageEvents: scan.eventCount,
        sameDateSessionSweepCandidates: scan.sweepCandidates,
        sweepDirectionCounts: scan.directionCounts,
        sweepExecutionStatusCounts: scan.executionStatusCounts,
        likelyCause: cause,
      };
    });
  const blockers = [
    !args.packageMetadataAuditPath ? 'missing package metadata audit path' : null,
    !args.packageMetadataAuditReport ? 'missing package metadata audit report' : null,
    missingSlates.length === 0 ? 'package metadata audit has no missing slates to drill down' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_nonreproduction_drilldown',
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
      packageMetadataAuditPath: args.packageMetadataAuditPath,
      scannerPackageDir: args.scannerPackageDir,
    },
    summary: {
      missingSlates: missingSlates.length,
      unsupportedEveningReplaySession: missingSlates.filter((slate) => slate.likelyCause === 'unsupported_evening_replay_session').length,
      currentScannerDirectionOrDetectionMismatch: missingSlates.filter((slate) => slate.likelyCause === 'current_scanner_direction_or_detection_mismatch').length,
      missingPackageEvents: missingSlates.filter((slate) => slate.likelyCause === 'missing_package_events').length,
      runtimeInstallAllowed: false,
      recommendation: blockers.length ? 'fix_missing_input_reports' : 'keep_research_only_do_not_install_runtime',
    },
    missingSlates,
    blockers,
    recommendations: [
      'Keep the Sweep primary-exclusion runtime change uninstalled.',
      'Treat the June 15 evening row as unsupported by the current replay generator unless an explicit evening replay architecture is added.',
      'Treat the June 29 SHORT held-local row as nonreproduced by current scanner package output before using it as runtime evidence.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-nonreproduction-drilldown-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-nonreproduction-drilldown-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport({
    packageMetadataAuditPath: options.packageMetadataAuditPath,
    packageMetadataAuditReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport>(options.packageMetadataAuditPath),
    scannerPackageDir: options.scannerPackageDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
