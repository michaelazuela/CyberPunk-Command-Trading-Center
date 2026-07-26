import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-evidence-boundary-audit';

interface CliOptions {
  evidenceBoundaryAuditPath: string | null;
  scannerPackageDir: string;
  outDir: string;
  json: boolean;
}

interface ExactProofRow {
  proofKey: string;
  tradeDate: string;
  session: string;
  eventTime: string;
  direction: string;
  executionStatus: string;
  blockReason: 'InvalidStopLocation';
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  rankScore: number | null;
  sourceFiles: string[];
  duplicateSourceRows: number;
  overlapsEvidenceBoundarySlate: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_exact_proof_package';
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
    evidenceBoundaryAuditPath: string | null;
    scannerPackageDir: string;
  };
  assumptions: {
    currentRawScannerPackagesOnly: true;
    exactBlockReasonOnly: 'InvalidStopLocation';
    dedupesByEventDirectionAndLevels: true;
    excludesHeldLocalOnlyNonreproducedRows: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageFilesRead: number;
    rawExactInvalidStopRows: number;
    dedupedExactProofRows: number;
    sessions: Record<string, number>;
    directions: Record<string, number>;
    rowsWithStopMissing: number;
    rowsWithDirectionallyInvalidStopGeometry: number;
    rowsOverlappingEvidenceBoundarySlates: number;
    heldLocalOnlyRowsIncluded: 0;
    runtimeInstallAllowed: false;
    recommendation: 'use_as_current_research_evidence_only' | 'fix_missing_input_reports';
  };
  rows: ExactProofRow[];
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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    evidenceBoundaryAuditPath: readFlag(args, '--evidence-boundary-audit') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-evidence-boundary-audit-\d+\.json$/),
    scannerPackageDir: readFlag(args, '--scanner-package-dir') || outDir,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport['authority'] {
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

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] || 0) + 1;
}

function directionallyInvalidStop(row: ExactProofRow): boolean {
  if (row.entry === null || row.stop === null) return false;
  if (row.direction === 'LONG') return row.stop >= row.entry;
  if (row.direction === 'SHORT') return row.stop <= row.entry;
  return false;
}

function boundaryKeys(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport | null): Set<string> {
  return new Set((report?.rows || [])
    .filter((row) => row.runtimeEvidenceDisposition === 'eligible_exact_package_invalid_stop_proof')
    .map((row) => `${row.tradeDate}|${row.session}|${row.expectedDirection}`));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Current Exact-Proof Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only current raw scanner package proof. It does not install runtime ranking behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Package files read: ${report.summary.packageFilesRead}.`,
    `- Raw exact InvalidStopLocation rows: ${report.summary.rawExactInvalidStopRows}.`,
    `- Deduped exact proof rows: ${report.summary.dedupedExactProofRows}.`,
    `- Sessions: ${JSON.stringify(report.summary.sessions)}.`,
    `- Directions: ${JSON.stringify(report.summary.directions)}.`,
    `- Rows with stop missing: ${report.summary.rowsWithStopMissing}.`,
    `- Rows with directionally invalid stop geometry: ${report.summary.rowsWithDirectionallyInvalidStopGeometry}.`,
    `- Rows overlapping evidence-boundary slates: ${report.summary.rowsOverlappingEvidenceBoundarySlates}.`,
    `- Held-local-only rows included: ${report.summary.heldLocalOnlyRowsIncluded}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Rows',
    '| Date | Session | Time | Direction | Entry | Stop | Execution | Rank | Source Files |',
    '|---|---|---|---|---:|---:|---|---:|---:|',
    ...report.rows.slice(0, 30).map((row) => `| ${row.tradeDate} | ${row.session} | ${row.eventTime} | ${row.direction} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.executionStatus} | ${row.rankScore ?? '-'} | ${row.sourceFiles.length} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport(args: {
  evidenceBoundaryAuditPath: string | null;
  evidenceBoundaryAuditReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport | null;
  scannerPackageDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport {
  const files = packageFiles(args.scannerPackageDir);
  const boundary = boundaryKeys(args.evidenceBoundaryAuditReport);
  const byKey = new Map<string, ExactProofRow>();
  let rawExactInvalidStopRows = 0;
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
      const candidates = Array.isArray(eventRecord.setupCandidateStatus?.statuses) ? eventRecord.setupCandidateStatus.statuses : [];
      for (const candidateValue of candidates) {
        if (!candidateValue || typeof candidateValue !== 'object' || Array.isArray(candidateValue)) continue;
        const candidate = candidateValue as Record<string, unknown>;
        if (text(candidate.setupType) !== 'NoInstalledSetup' || text(candidate.blockReason) !== 'InvalidStopLocation') continue;
        const direction = text(candidate.direction) || 'UNKNOWN';
        const entry = numberOrNull(candidate.entry);
        const stop = numberOrNull(candidate.stop);
        const key = proofKey({ tradeDate, session, eventTime, direction, entry, stop });
        rawExactInvalidStopRows += 1;
        const existing = byKey.get(key);
        if (existing) {
          existing.duplicateSourceRows += 1;
          const fileName = path.basename(file);
          if (!existing.sourceFiles.includes(fileName)) existing.sourceFiles.push(fileName);
          continue;
        }
        byKey.set(key, {
          proofKey: key,
          tradeDate,
          session,
          eventTime,
          direction,
          executionStatus: text(candidate.executionStatus) || 'missing',
          blockReason: 'InvalidStopLocation',
          entry,
          stop,
          riskPoints: numberOrNull(candidate.riskPoints),
          rankScore: numberOrNull(candidate.rankScore),
          sourceFiles: [path.basename(file)],
          duplicateSourceRows: 1,
          overlapsEvidenceBoundarySlate: boundary.has(`${tradeDate}|${session}|${direction}`),
        });
      }
    }
  }
  const rows = [...byKey.values()].sort((a, b) => a.proofKey.localeCompare(b.proofKey));
  const sessions: Record<string, number> = {};
  const directions: Record<string, number> = {};
  for (const row of rows) {
    increment(sessions, row.session);
    increment(directions, row.direction);
  }
  const blockers = [
    !args.evidenceBoundaryAuditPath ? 'missing evidence-boundary audit path' : null,
    !args.evidenceBoundaryAuditReport ? 'missing evidence-boundary audit report' : null,
    files.length === 0 ? 'no raw scanner artifact package files found' : null,
    rows.length === 0 ? 'no current raw-package Sweep InvalidStopLocation rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_current_exact_proof_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      evidenceBoundaryAuditPath: args.evidenceBoundaryAuditPath,
      scannerPackageDir: args.scannerPackageDir,
    },
    assumptions: {
      currentRawScannerPackagesOnly: true,
      exactBlockReasonOnly: 'InvalidStopLocation',
      dedupesByEventDirectionAndLevels: true,
      excludesHeldLocalOnlyNonreproducedRows: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageFilesRead: files.length,
      rawExactInvalidStopRows,
      dedupedExactProofRows: rows.length,
      sessions,
      directions,
      rowsWithStopMissing: rows.filter((row) => row.stop === null).length,
      rowsWithDirectionallyInvalidStopGeometry: rows.filter(directionallyInvalidStop).length,
      rowsOverlappingEvidenceBoundarySlates: rows.filter((row) => row.overlapsEvidenceBoundarySlate).length,
      heldLocalOnlyRowsIncluded: 0,
      runtimeInstallAllowed: false,
      recommendation: blockers.length ? 'fix_missing_input_reports' : 'use_as_current_research_evidence_only',
    },
    rows,
    blockers,
    recommendations: [
      'Use this package as current raw-scanner research evidence only; it does not authorize runtime ranking behavior.',
      'A future runtime proposal must still prove selected-candidate impact, canExecute stability, and entry/stop/target/risk stability from current scanner outputs.',
      'Do not include held-local-only nonreproduced rows in runtime proposal evidence.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-current-exact-proof-package-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport({
    evidenceBoundaryAuditPath: options.evidenceBoundaryAuditPath,
    evidenceBoundaryAuditReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport>(options.evidenceBoundaryAuditPath),
    scannerPackageDir: options.scannerPackageDir,
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionCurrentExactProofPackageReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
