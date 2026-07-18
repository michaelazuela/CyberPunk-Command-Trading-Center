import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRawOhlcScannerArtifactDedupeTimingFilterReport,
  type RawOhlcScannerArtifactDedupeTimingFilterReport,
} from './raw-ohlc-scanner-artifact-dedupe-timing-filter';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

interface CliOptions {
  replayPackageOutcome: string;
  outDir: string;
  json: boolean;
}

interface VariantSummary {
  variantName: string;
  allowSameBarModels: string[];
  selectedCampaignRows: number;
  selectedWinners: number;
  selectedLosses: number;
  selectedUnresolved: number;
  grossSelectedOneMesPl: number | null;
  sameBarExcludedRows: number;
  staleSweepIsolatedRows: number;
  recommendation: string;
}

export interface RawOhlcScannerArtifactSameBarAllowlistProbeReport {
  reportType: 'raw_ohlc_scanner_artifact_samebar_allowlist_probe';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactDedupeTimingFilterReport['authority'];
  source: {
    reportDir: string;
    replayPackageOutcomePath: string | null;
  };
  assumptions: {
    usesReadOnlyDedupeTimingFilter: true;
    sameBarAllowlistIsResearchOnly: true;
    staleSweepRowsRemainIsolated: true;
    livePromotionAllowed: false;
  };
  summary: {
    modelVariantsEvaluated: number;
    baselineGrossSelectedOneMesPl: number | null;
    bestVariantName: string | null;
    bestVariantGrossSelectedOneMesPl: number | null;
    variantsPositive: number;
    variantsNegative: number;
    livePromotionAllowedRows: 0;
  };
  variants: VariantSummary[];
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
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function parseRawOhlcScannerArtifactSameBarAllowlistProbeArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const replayPackageOutcome = readFlag(args, '--replay-package-outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  if (!replayPackageOutcome) throw new Error('--replay-package-outcome is required.');
  return { replayPackageOutcome, outDir, json: args.includes('--json') };
}

function authority(): RawOhlcScannerArtifactDedupeTimingFilterReport['authority'] {
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

function modelNames(report: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport): string[] {
  return [...new Set(report.rows.map((row) => row.setupType))].sort((a, b) => a.localeCompare(b));
}

function variantRecommendation(summary: RawOhlcScannerArtifactDedupeTimingFilterReport['summary']): string {
  if ((summary.grossSelectedOneMesPl ?? 0) > 0 && summary.selectedLosses === 0) {
    return 'Candidate for more research. Same-bar inclusion improved selected campaign evidence with no selected stopped-before-T1 losses.';
  }
  if ((summary.grossSelectedOneMesPl ?? 0) > 0) {
    return 'Research only. Positive after same-bar inclusion, but selected losses still require a stricter timing/proof separator.';
  }
  return 'Do not allowlist from this set. Campaign-level selected evidence is not positive enough for live-facing ranking.';
}

function buildVariant(args: {
  variantName: string;
  allowSameBarModels: string[];
  reportDir: string;
  replayPackageOutcomePath: string | null;
  replayPackageOutcomeReport: UnifiedPositiveHeldLocalPreviewPackageOutcomeReportAlias;
  generatedAt: string;
}): VariantSummary {
  const report = buildRawOhlcScannerArtifactDedupeTimingFilterReport({
    reportDir: args.reportDir,
    replayPackageOutcomePath: args.replayPackageOutcomePath,
    replayPackageOutcomeReport: args.replayPackageOutcomeReport,
    allowSameBarModels: new Set(args.allowSameBarModels),
  }, args.generatedAt);
  return {
    variantName: args.variantName,
    allowSameBarModels: args.allowSameBarModels,
    selectedCampaignRows: report.summary.selectedCampaignRows,
    selectedWinners: report.summary.selectedWinners,
    selectedLosses: report.summary.selectedLosses,
    selectedUnresolved: report.summary.selectedUnresolved,
    grossSelectedOneMesPl: report.summary.grossSelectedOneMesPl,
    sameBarExcludedRows: report.summary.sameBarExcludedRows,
    staleSweepIsolatedRows: report.summary.staleSweepIsolatedRows,
    recommendation: variantRecommendation(report.summary),
  };
}

type UnifiedPositiveHeldLocalPreviewPackageOutcomeReportAlias = UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport;

function bestVariant(variants: VariantSummary[]): VariantSummary | null {
  return [...variants].sort((a, b) => (b.grossSelectedOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.grossSelectedOneMesPl ?? Number.NEGATIVE_INFINITY))[0] || null;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSameBarAllowlistProbeReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Same-Bar Allowlist Probe',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only same-bar allowlist probe. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Model variants evaluated: ${report.summary.modelVariantsEvaluated}.`,
    `- Baseline gross selected one-MES P/L: ${report.summary.baselineGrossSelectedOneMesPl ?? 'not available'}.`,
    `- Best variant: ${report.summary.bestVariantName ?? 'none'}.`,
    `- Best variant gross selected one-MES P/L: ${report.summary.bestVariantGrossSelectedOneMesPl ?? 'not available'}.`,
    `- Positive/negative variants: ${report.summary.variantsPositive}/${report.summary.variantsNegative}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Variants',
    '| Variant | Allow Same-Bar Models | Selected | Winners | Losses | Unresolved | P/L | Same-Bar Excluded | Stale Sweep | Recommendation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.variants.map((row) => `| ${escapeTable(row.variantName)} | ${escapeTable(row.allowSameBarModels.join(', ') || 'none')} | ${row.selectedCampaignRows} | ${row.selectedWinners} | ${row.selectedLosses} | ${row.selectedUnresolved} | ${row.grossSelectedOneMesPl ?? '-'} | ${row.sameBarExcludedRows} | ${row.staleSweepIsolatedRows} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSameBarAllowlistProbeReport(args: {
  reportDir: string;
  replayPackageOutcomePath: string | null;
  replayPackageOutcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSameBarAllowlistProbeReport {
  const blockers = [
    !args.replayPackageOutcomePath ? 'missing replay package outcome path' : null,
    !args.replayPackageOutcomeReport ? 'missing replay package outcome report' : null,
    args.replayPackageOutcomeReport && args.replayPackageOutcomeReport.summary.livePromotionAllowedRows !== 0
      ? `outcome report has ${args.replayPackageOutcomeReport.summary.livePromotionAllowedRows} live-promotion rows`
      : null,
    args.replayPackageOutcomeReport && args.replayPackageOutcomeReport.rows.length === 0 ? 'no outcome rows evaluated' : null,
  ].filter((item): item is string => Boolean(item));
  const variants = args.replayPackageOutcomeReport
    ? [
      buildVariant({
        variantName: 'baseline_no_same_bar_allowlist',
        allowSameBarModels: [],
        reportDir: args.reportDir,
        replayPackageOutcomePath: args.replayPackageOutcomePath,
        replayPackageOutcomeReport: args.replayPackageOutcomeReport,
        generatedAt,
      }),
      ...modelNames(args.replayPackageOutcomeReport).map((setupType) => buildVariant({
        variantName: `allow_${setupType}`,
        allowSameBarModels: [setupType],
        reportDir: args.reportDir,
        replayPackageOutcomePath: args.replayPackageOutcomePath,
        replayPackageOutcomeReport: args.replayPackageOutcomeReport,
        generatedAt,
      })),
    ]
    : [];
  const baseline = variants.find((variant) => variant.variantName === 'baseline_no_same_bar_allowlist') || null;
  const best = bestVariant(variants);
  const base: Omit<RawOhlcScannerArtifactSameBarAllowlistProbeReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_samebar_allowlist_probe',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      replayPackageOutcomePath: args.replayPackageOutcomePath,
    },
    assumptions: {
      usesReadOnlyDedupeTimingFilter: true,
      sameBarAllowlistIsResearchOnly: true,
      staleSweepRowsRemainIsolated: true,
      livePromotionAllowed: false,
    },
    summary: {
      modelVariantsEvaluated: variants.length,
      baselineGrossSelectedOneMesPl: baseline?.grossSelectedOneMesPl ?? null,
      bestVariantName: best?.variantName || null,
      bestVariantGrossSelectedOneMesPl: best?.grossSelectedOneMesPl ?? null,
      variantsPositive: variants.filter((variant) => (variant.grossSelectedOneMesPl ?? 0) > 0).length,
      variantsNegative: variants.filter((variant) => (variant.grossSelectedOneMesPl ?? 0) < 0).length,
      livePromotionAllowedRows: 0,
    },
    variants,
    blockers,
    recommendations: blockers.length
      ? ['Do not use same-bar allowlist findings until the local replay outcome report is complete.']
      : [
        'Treat positive allowlist variants as research hypotheses only; do not install a live same-bar rule from this probe alone.',
        'Require a broader multi-day campaign-level replay before allowing any model to count same-bar entries as publish-quality evidence.',
        'Keep stale Sweep rows isolated from live-facing rank decisions.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSameBarAllowlistProbeReport(
  report: RawOhlcScannerArtifactSameBarAllowlistProbeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-samebar-allowlist-probe-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSameBarAllowlistProbeCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSameBarAllowlistProbeArgs(args);
  const report = buildRawOhlcScannerArtifactSameBarAllowlistProbeReport({
    reportDir: options.outDir,
    replayPackageOutcomePath: options.replayPackageOutcome,
    replayPackageOutcomeReport: fs.existsSync(options.replayPackageOutcome)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.replayPackageOutcome)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactSameBarAllowlistProbeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSameBarAllowlistProbeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
