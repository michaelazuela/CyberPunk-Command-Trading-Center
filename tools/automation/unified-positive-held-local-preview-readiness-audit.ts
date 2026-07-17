import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  buildHeldLocalPreviewUiModel,
  type HeldLocalPreviewUiIndexReport,
} from '../../src/lib/heldLocalPreviewUiAdapter';

export interface UnifiedPositiveHeldLocalPreviewReadinessAuditReport {
  reportType: 'unified_positive_held_local_preview_readiness_audit';
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
    appUrl: string;
    bundlePath: string | null;
    screenshotPath: string | null;
  };
  summary: {
    bundleItems: number;
    expectedCards: number;
    renderedCards: number;
    loadedImages: number;
    minNaturalWidth: number;
  };
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

interface BrowserAuditResult {
  renderedCards: number;
  naturalWidths: number[];
  message: string;
  screenshotPath: string;
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

function authority(): UnifiedPositiveHeldLocalPreviewReadinessAuditReport['authority'] {
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

function findLatestBundlePath(reportDir = DEFAULT_REPORT_DIR): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const bundles = fs.readdirSync(reportDir)
    .filter((name) => /^unified-positive-held-local-preview-localstorage-loader-\d+\.bundle\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return bundles[0] || null;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReadinessAuditReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Readiness Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only browser readiness audit. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- App URL: ${report.source.appUrl}.`,
    `- Bundle path: ${report.source.bundlePath || '-'}.`,
    `- Screenshot path: ${report.source.screenshotPath || '-'}.`,
    `- Bundle items: ${report.summary.bundleItems}.`,
    `- Expected cards: ${report.summary.expectedCards}.`,
    `- Rendered cards: ${report.summary.renderedCards}.`,
    `- Loaded images: ${report.summary.loadedImages}.`,
    `- Minimum natural width: ${report.summary.minNaturalWidth}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReadinessAuditReport(args: {
  appUrl: string;
  bundlePath: string | null;
  bundleReport: HeldLocalPreviewUiIndexReport | null;
  browserResult: BrowserAuditResult | null;
  browserError?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReadinessAuditReport {
  const model = buildHeldLocalPreviewUiModel({
    enabled: true,
    localHost: true,
    report: args.bundleReport,
  });
  const expectedCards = model.items.length;
  const renderedCards = args.browserResult?.renderedCards || 0;
  const naturalWidths = args.browserResult?.naturalWidths || [];
  const loadedImages = naturalWidths.filter((width) => width > 0).length;
  const minNaturalWidth = naturalWidths.length ? Math.min(...naturalWidths) : 0;
  const blockers = [
    !args.bundlePath ? 'missing embedded bundle path' : null,
    ...model.blockers,
    args.browserError ? `browser audit failed: ${args.browserError}` : null,
    expectedCards <= 0 ? 'embedded bundle has no ready preview items' : null,
    renderedCards !== expectedCards ? `rendered cards ${renderedCards} did not match expected ${expectedCards}` : null,
    loadedImages !== expectedCards ? `loaded images ${loadedImages} did not match expected ${expectedCards}` : null,
    minNaturalWidth < 1 ? 'one or more preview images did not load' : null,
  ].filter((item): item is string => Boolean(item));

  const base: Omit<UnifiedPositiveHeldLocalPreviewReadinessAuditReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_readiness_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      appUrl: args.appUrl,
      bundlePath: args.bundlePath,
      screenshotPath: args.browserResult?.screenshotPath || null,
    },
    summary: {
      bundleItems: args.bundleReport?.items.length || 0,
      expectedCards,
      renderedCards,
      loadedImages,
      minNaturalWidth,
    },
    blockers,
    recommendations: blockers.length
      ? ['Keep the held-local preview local until the hidden tab imports the embedded bundle and every preview image renders.']
      : ['Hidden held-local preview tab is ready for local read-only review using the embedded bundle path.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReadinessAuditReport(
  report: UnifiedPositiveHeldLocalPreviewReadinessAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-readiness-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

async function runBrowserAudit(args: {
  appUrl: string;
  bundlePath: string;
  screenshotPath: string;
}): Promise<BrowserAuditResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
    await page.goto(args.appUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Held-Local Preview' }).click();
    await page.getByLabel('Import local preview index JSON').setInputFiles(args.bundlePath);
    await page.getByText('READY', { exact: true }).waitFor({ timeout: 10_000 });
    const images = page.locator('img');
    const renderedCards = await images.count();
    const naturalWidths = await images.evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((img) => img.naturalWidth));
    const message = await page.getByText(/Import ready:/).textContent();
    await page.screenshot({ path: args.screenshotPath, fullPage: true });
    return {
      renderedCards,
      naturalWidths,
      message: message || '',
      screenshotPath: args.screenshotPath,
    };
  } finally {
    await browser.close();
  }
}

export async function runUnifiedPositiveHeldLocalPreviewReadinessAuditCli(args = process.argv.slice(2)): Promise<void> {
  const appUrl = readFlag(args, '--url') || 'http://127.0.0.1:3000/?heldLocalPreview=1';
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const bundlePath = readFlag(args, '--bundle') || findLatestBundlePath(outDir);
  const screenshotPath = path.join(outDir, `unified-positive-held-local-preview-readiness-audit-${Date.now()}.png`);
  const bundleReport = bundlePath && fs.existsSync(bundlePath)
    ? JSON.parse(fs.readFileSync(bundlePath, 'utf8')) as HeldLocalPreviewUiIndexReport
    : null;
  let browserResult: BrowserAuditResult | null = null;
  let browserError: string | null = null;
  if (bundlePath && bundleReport) {
    try {
      browserResult = await runBrowserAudit({ appUrl, bundlePath, screenshotPath });
    } catch (error) {
      browserError = error instanceof Error ? error.message : String(error);
    }
  }
  const report = buildUnifiedPositiveHeldLocalPreviewReadinessAuditReport({
    appUrl,
    bundlePath,
    bundleReport,
    browserResult,
    browserError,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReadinessAuditReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, screenshotPath: report.source.screenshotPath }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveHeldLocalPreviewReadinessAuditCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
