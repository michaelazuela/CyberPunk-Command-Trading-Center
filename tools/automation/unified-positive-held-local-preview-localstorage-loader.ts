import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HELD_LOCAL_PREVIEW_STORAGE_KEY,
  buildHeldLocalPreviewUiModel,
  type HeldLocalPreviewUiIndexReport,
} from '../../src/lib/heldLocalPreviewUiAdapter';

export interface UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport {
  reportType: 'unified_positive_held_local_preview_localstorage_loader';
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
    uiIndexPath: string | null;
  };
  output: {
    snippetPath: string | null;
  };
  summary: {
    storageKey: string;
    previewItemsReady: number;
    blockedItems: number;
    snippetBytes: number;
  };
  blockers: string[];
  snippet: string;
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

function authority(): UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport['authority'] {
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

function escapeForSingleQuotedJavaScript(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildSnippet(report: HeldLocalPreviewUiIndexReport): string {
  const payload = JSON.stringify(report);
  return [
    `localStorage.setItem('${HELD_LOCAL_PREVIEW_STORAGE_KEY}', '${escapeForSingleQuotedJavaScript(payload)}');`,
    "window.location.href = `${window.location.origin}${window.location.pathname}?heldLocalPreview=1`;",
  ].join('\n');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview LocalStorage Loader',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only loader artifact. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Storage key: ${report.summary.storageKey}.`,
    `- Preview items ready: ${report.summary.previewItemsReady}.`,
    `- Blocked items: ${report.summary.blockedItems}.`,
    `- Snippet bytes: ${report.summary.snippetBytes}.`,
    `- Snippet path: ${report.output.snippetPath || '-'}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport(args: {
  uiIndexReport: HeldLocalPreviewUiIndexReport | null;
  uiIndexPath?: string | null;
  snippetPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport {
  const model = buildHeldLocalPreviewUiModel({
    enabled: true,
    localHost: true,
    report: args.uiIndexReport,
  });
  const blockers = [
    ...model.blockers,
    args.uiIndexReport?.authority.changesAppRuntime !== false ? 'preview index changesAppRuntime is not false' : null,
  ].filter((item): item is string => Boolean(item));
  const snippet = blockers.length || !args.uiIndexReport ? '' : buildSnippet(args.uiIndexReport);
  const base: Omit<UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_localstorage_loader',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      uiIndexPath: args.uiIndexPath || null,
    },
    output: {
      snippetPath: args.snippetPath || null,
    },
    summary: {
      storageKey: HELD_LOCAL_PREVIEW_STORAGE_KEY,
      previewItemsReady: model.items.length,
      blockedItems: blockers.length ? 1 : 0,
      snippetBytes: Buffer.byteLength(snippet, 'utf8'),
    },
    blockers,
    snippet,
    recommendations: blockers.length
      ? ['Do not load the held-local app preview until the UI index passes adapter validation.']
      : ['Paste the snippet into the local browser console on localhost to load the held-local preview tab.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport(
  report: UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string; snippetPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-localstorage-loader-${Date.now()}`;
  const snippetPath = path.join(outDir, `${base}.js`);
  const finalReport = { ...report, output: { snippetPath } };
  const reportWithMarkdown = { ...finalReport, markdown: buildMarkdown(finalReport) };
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(snippetPath, `${reportWithMarkdown.snippet}\n`, 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(reportWithMarkdown, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${reportWithMarkdown.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath, snippetPath };
}

export function runUnifiedPositiveHeldLocalPreviewLocalStorageLoaderCli(args = process.argv.slice(2)): void {
  const uiIndexPath = readFlag(args, '--ui-index');
  if (!uiIndexPath) throw new Error('Missing required --ui-index path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const uiIndexReport = JSON.parse(fs.readFileSync(uiIndexPath, 'utf8')) as HeldLocalPreviewUiIndexReport;
  const report = buildUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport({
    uiIndexReport,
    uiIndexPath,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport(report, outDir);
  const finalReport = JSON.parse(fs.readFileSync(paths.jsonPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewLocalStorageLoaderReport;
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: finalReport.status, summary: finalReport.summary }, null, 2));
  } else {
    console.log(finalReport.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Loader snippet: ${paths.snippetPath}`);
  }
  if (finalReport.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewLocalStorageLoaderCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
