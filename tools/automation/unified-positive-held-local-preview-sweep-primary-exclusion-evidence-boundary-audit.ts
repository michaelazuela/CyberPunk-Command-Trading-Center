import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit';
import type { UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport } from './unified-positive-held-local-preview-sweep-primary-exclusion-nonreproduction-drilldown';

interface CliOptions {
  packageMetadataAuditPath: string | null;
  nonreproductionDrilldownPath: string | null;
  outDir: string;
  json: boolean;
}

interface BoundaryRow {
  slateId: string;
  tradeDate: string;
  session: string;
  expectedDirection: string | null;
  packageMatches: number;
  invalidStopLocationRows: number;
  nonreproductionCause: string | null;
  runtimeEvidenceDisposition:
    | 'eligible_exact_package_invalid_stop_proof'
    | 'held_local_only_excluded_until_reproduced'
    | 'package_covered_but_not_exact_invalid_stop_proof';
}

export interface UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport {
  reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_evidence_boundary_audit';
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
    nonreproductionDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    boundaryAuditOnly: true;
    heldLocalRowsAreResearchEvidenceOnly: true;
    rawScannerPackageProofRequiredForRuntimeProposal: true;
    livePromotionAllowed: false;
  };
  policy: {
    nonreproducedHeldLocalRows: 'exclude_from_runtime_evidence_until_reproduced';
    packageCoveredWithoutExactInvalidStopLocation: 'keep_as_research_caution_not_runtime_selector';
    exactPackageInvalidStopLocationRows: 'eligible_for_future_runtime_proposal_evidence_only';
    runtimeInstallAllowedByThisReport: false;
  };
  summary: {
    changedSlates: number;
    exactPackageInvalidStopProofSlates: number;
    packageCoveredButNotExactInvalidStopProofSlates: number;
    heldLocalOnlyExcludedUntilReproducedSlates: number;
    unsupportedEveningReplaySessionSlates: number;
    currentScannerDirectionOrDetectionMismatchSlates: number;
    runtimeEvidenceEligibleSlates: number;
    runtimeInstallAllowed: false;
    recommendation: 'keep_research_only_gather_exact_runtime_evidence' | 'fix_missing_input_reports';
  };
  rows: BoundaryRow[];
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

export function parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  return {
    packageMetadataAuditPath: readFlag(args, '--package-metadata-audit') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-scanner-artifact-package-metadata-audit-\d+\.json$/),
    nonreproductionDrilldownPath: readFlag(args, '--nonreproduction-drilldown') ||
      latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-primary-exclusion-nonreproduction-drilldown-\d+\.json$/),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport['authority'] {
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

function buildRows(
  packageAudit: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport | null,
  nonrepro: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport | null,
): BoundaryRow[] {
  const nonreproBySlate = new Map((nonrepro?.missingSlates || []).map((row) => [row.slateId, row]));
  return (packageAudit?.slates || []).map((slate) => {
    const missing = nonreproBySlate.get(slate.slateId) || null;
    const runtimeEvidenceDisposition: BoundaryRow['runtimeEvidenceDisposition'] = missing
      ? 'held_local_only_excluded_until_reproduced'
      : slate.invalidStopLocationRows > 0
        ? 'eligible_exact_package_invalid_stop_proof'
        : 'package_covered_but_not_exact_invalid_stop_proof';
    return {
      slateId: slate.slateId,
      tradeDate: slate.tradeDate,
      session: slate.session,
      expectedDirection: slate.direction,
      packageMatches: slate.packageMatches,
      invalidStopLocationRows: slate.invalidStopLocationRows,
      nonreproductionCause: missing?.likelyCause || null,
      runtimeEvidenceDisposition,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport, 'markdown'>): string {
  return [
    '# Sweep Primary Exclusion Evidence Boundary Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report boundary audit. It does not install runtime ranking behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Policy',
    `- Nonreproduced held-local rows: ${report.policy.nonreproducedHeldLocalRows}.`,
    `- Package covered without exact InvalidStopLocation: ${report.policy.packageCoveredWithoutExactInvalidStopLocation}.`,
    `- Exact package InvalidStopLocation rows: ${report.policy.exactPackageInvalidStopLocationRows}.`,
    `- Runtime install allowed by this report: ${report.policy.runtimeInstallAllowedByThisReport}.`,
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Exact package InvalidStopLocation proof slates: ${report.summary.exactPackageInvalidStopProofSlates}.`,
    `- Package covered but not exact InvalidStopLocation proof slates: ${report.summary.packageCoveredButNotExactInvalidStopProofSlates}.`,
    `- Held-local-only excluded until reproduced slates: ${report.summary.heldLocalOnlyExcludedUntilReproducedSlates}.`,
    `- Unsupported evening replay session slates: ${report.summary.unsupportedEveningReplaySessionSlates}.`,
    `- Current scanner direction/detection mismatch slates: ${report.summary.currentScannerDirectionOrDetectionMismatchSlates}.`,
    `- Runtime evidence eligible slates: ${report.summary.runtimeEvidenceEligibleSlates}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Date | Session | Direction | Package Matches | InvalidStopLocation Rows | Nonreproduction Cause | Runtime Evidence Disposition |',
    '|---|---|---|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate} | ${row.session} | ${row.expectedDirection || '-'} | ${row.packageMatches} | ${row.invalidStopLocationRows} | ${row.nonreproductionCause || '-'} | ${row.runtimeEvidenceDisposition} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport(args: {
  packageMetadataAuditPath: string | null;
  packageMetadataAuditReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport | null;
  nonreproductionDrilldownPath: string | null;
  nonreproductionDrilldownReport: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport {
  const rows = buildRows(args.packageMetadataAuditReport, args.nonreproductionDrilldownReport);
  const blockers = [
    !args.packageMetadataAuditPath ? 'missing package metadata audit path' : null,
    !args.packageMetadataAuditReport ? 'missing package metadata audit report' : null,
    !args.nonreproductionDrilldownPath ? 'missing nonreproduction drilldown path' : null,
    !args.nonreproductionDrilldownReport ? 'missing nonreproduction drilldown report' : null,
    rows.length === 0 ? 'no changed slates available for evidence-boundary audit' : null,
  ].filter((item): item is string => Boolean(item));
  const exactPackageInvalidStopProofSlates = rows.filter((row) => row.runtimeEvidenceDisposition === 'eligible_exact_package_invalid_stop_proof').length;
  const packageCoveredButNotExactInvalidStopProofSlates = rows.filter((row) => row.runtimeEvidenceDisposition === 'package_covered_but_not_exact_invalid_stop_proof').length;
  const heldLocalOnlyExcludedUntilReproducedSlates = rows.filter((row) => row.runtimeEvidenceDisposition === 'held_local_only_excluded_until_reproduced').length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_primary_exclusion_evidence_boundary_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      packageMetadataAuditPath: args.packageMetadataAuditPath,
      nonreproductionDrilldownPath: args.nonreproductionDrilldownPath,
    },
    assumptions: {
      savedReportsOnly: true,
      boundaryAuditOnly: true,
      heldLocalRowsAreResearchEvidenceOnly: true,
      rawScannerPackageProofRequiredForRuntimeProposal: true,
      livePromotionAllowed: false,
    },
    policy: {
      nonreproducedHeldLocalRows: 'exclude_from_runtime_evidence_until_reproduced',
      packageCoveredWithoutExactInvalidStopLocation: 'keep_as_research_caution_not_runtime_selector',
      exactPackageInvalidStopLocationRows: 'eligible_for_future_runtime_proposal_evidence_only',
      runtimeInstallAllowedByThisReport: false,
    },
    summary: {
      changedSlates: rows.length,
      exactPackageInvalidStopProofSlates,
      packageCoveredButNotExactInvalidStopProofSlates,
      heldLocalOnlyExcludedUntilReproducedSlates,
      unsupportedEveningReplaySessionSlates: rows.filter((row) => row.nonreproductionCause === 'unsupported_evening_replay_session').length,
      currentScannerDirectionOrDetectionMismatchSlates: rows.filter((row) => row.nonreproductionCause === 'current_scanner_direction_or_detection_mismatch').length,
      runtimeEvidenceEligibleSlates: exactPackageInvalidStopProofSlates,
      runtimeInstallAllowed: false,
      recommendation: blockers.length ? 'fix_missing_input_reports' : 'keep_research_only_gather_exact_runtime_evidence',
    },
    rows,
    blockers,
    recommendations: [
      'Do not install the Sweep primary-selection exclusion into runtime from held-local evidence alone.',
      'Use only current raw scanner package rows with exact InvalidStopLocation proof as eligible evidence for a future runtime proposal.',
      'Keep package-covered rows without exact InvalidStopLocation as research cautions, not runtime selector inputs.',
    ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport(report: UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-evidence-boundary-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-positive-held-local-preview-sweep-primary-exclusion-evidence-boundary-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditArgs();
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport({
    packageMetadataAuditPath: options.packageMetadataAuditPath,
    packageMetadataAuditReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionScannerArtifactPackageMetadataAuditReport>(options.packageMetadataAuditPath),
    nonreproductionDrilldownPath: options.nonreproductionDrilldownPath,
    nonreproductionDrilldownReport: readJson<UnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionNonreproductionDrilldownReport>(options.nonreproductionDrilldownPath),
  });
  const written = writeUnifiedPositiveHeldLocalPreviewSweepPrimaryExclusionEvidenceBoundaryAuditReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}
