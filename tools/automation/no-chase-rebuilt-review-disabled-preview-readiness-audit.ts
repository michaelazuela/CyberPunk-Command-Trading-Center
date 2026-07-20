import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport } from './no-chase-rebuilt-review-disabled-local-adapter-preview';

interface CliOptions {
  preview: string;
  repoRoot: string;
  outDir: string;
  json: boolean;
}

interface RuntimeReference {
  file: string;
  line: number;
  text: string;
}

export interface NoChaseRebuiltReviewDisabledPreviewReadinessAuditReport {
  reportType: 'no_chase_rebuilt_review_disabled_preview_readiness_audit';
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
    previewPath: string;
    repoRoot: string;
  };
  summary: {
    previewCards: number;
    disabledPreviewCards: number;
    humanReviewOnlyCards: number;
    canExecuteFalseCards: number;
    publishDiscordFalseCards: number;
    scannerVisibleRows: 0;
    livePromotionAllowedRows: 0;
    runtimeReferenceCount: number;
    appRuntimeReferenceCount: number;
    scannerRuntimeReferenceCount: number;
    discordRuntimeReferenceCount: number;
    supabaseRuntimeReferenceCount: number;
    failedGateCount: number;
    recommendation: 'ready_for_local_review_only' | 'fix_inputs';
  };
  runtimeReferences: RuntimeReference[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const PREVIEW_TOKEN = 'no-chase-rebuilt-review-disabled-local-adapter-preview';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseRebuiltReviewDisabledPreviewReadinessAuditArgs(args = process.argv.slice(2)): CliOptions {
  const preview = readFlag(args, '--preview');
  if (!preview) throw new Error('--preview is required.');
  return {
    preview,
    repoRoot: readFlag(args, '--repo-root') || path.resolve(__dirname, '../..'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): NoChaseRebuiltReviewDisabledPreviewReadinessAuditReport['authority'] {
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

function walkFiles(root: string, roots: string[]): string[] {
  const files: string[] = [];
  for (const relativeRoot of roots) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    const stack = [absoluteRoot];
    while (stack.length) {
      const current = stack.pop();
      if (!current) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'diagnostic-reports' || entry.name === 'node_modules' || entry.name === 'dist') continue;
          stack.push(fullPath);
        } else if (/\.(ts|tsx|js|jsx|json|md)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  }
  return files;
}

function allowedReference(relativeFile: string): boolean {
  return relativeFile === 'package.json' ||
    relativeFile === path.normalize('docs/PROJECT_STATUS.md') ||
    relativeFile === path.normalize('tools/automation/no-chase-rebuilt-review-disabled-local-adapter-preview.ts') ||
    relativeFile === path.normalize('tools/automation/no-chase-rebuilt-review-disabled-local-adapter-preview.test.ts') ||
    relativeFile === path.normalize('tools/automation/no-chase-rebuilt-review-disabled-preview-readiness-audit.ts') ||
    relativeFile === path.normalize('tools/automation/no-chase-rebuilt-review-disabled-preview-readiness-audit.test.ts');
}

function findRuntimeReferences(repoRoot: string, token = PREVIEW_TOKEN): RuntimeReference[] {
  const files = walkFiles(repoRoot, ['src', 'tools', 'docs', '.']);
  const seen = new Set<string>();
  return files.flatMap((file) => {
    const relativeFile = path.relative(repoRoot, file);
    if (seen.has(relativeFile) || allowedReference(relativeFile)) return [];
    seen.add(relativeFile);
    const text = fs.readFileSync(file, 'utf8');
    return text.split(/\r?\n/).flatMap((line, index) => (
      line.includes(token)
        ? [{ file: relativeFile, line: index + 1, text: line.trim() }]
        : []
    ));
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<NoChaseRebuiltReviewDisabledPreviewReadinessAuditReport, 'markdown'>): string {
  return [
    '# No-Chase Rebuilt Review Disabled Preview Readiness Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local read-only readiness audit. It does not wire scanner runtime, run setupScanner, post Discord, write Supabase, read live Supabase, read live bridge data, change canExecute, change app runtime, or change trading logic.',
    '',
    '## Summary',
    `- Preview path: ${report.source.previewPath}.`,
    `- Preview cards: ${report.summary.previewCards}.`,
    `- Disabled preview cards: ${report.summary.disabledPreviewCards}.`,
    `- Human-review-only cards: ${report.summary.humanReviewOnlyCards}.`,
    `- canExecute=false cards: ${report.summary.canExecuteFalseCards}.`,
    `- publishDiscord=false cards: ${report.summary.publishDiscordFalseCards}.`,
    `- Scanner-visible rows: ${report.summary.scannerVisibleRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Runtime references: ${report.summary.runtimeReferenceCount}.`,
    `- Failed gate count: ${report.summary.failedGateCount}.`,
    '',
    '## Runtime References',
    ...(report.runtimeReferences.length
      ? [
        '| File | Line | Text |',
        '|---|---:|---|',
        ...report.runtimeReferences.map((item) => `| ${escapeTable(item.file)} | ${item.line} | ${escapeTable(item.text)} |`),
      ]
      : ['- None outside allowed local automation/package/status files.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport(args: {
  previewPath: string;
  repoRoot: string;
  previewReport: NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport | null;
  runtimeReferences?: RuntimeReference[];
}, generatedAt = new Date().toISOString()): NoChaseRebuiltReviewDisabledPreviewReadinessAuditReport {
  const report = args.previewReport;
  const cards = report?.previewCards || [];
  const runtimeReferences = args.runtimeReferences ?? findRuntimeReferences(args.repoRoot);
  const normalizedRuntimeReferences = runtimeReferences.map((item) => ({
    ...item,
    file: path.normalize(item.file),
  }));
  const appRuntimeReferences = normalizedRuntimeReferences.filter((item) => item.file.startsWith(`src${path.sep}`));
  const scannerRuntimeReferences = normalizedRuntimeReferences.filter((item) => item.file.includes('nt-scanner') || item.file.includes('setupScanner') || item.file.includes('localScanner'));
  const discordRuntimeReferences = normalizedRuntimeReferences.filter((item) => item.file.toLowerCase().includes('discord'));
  const supabaseRuntimeReferences = normalizedRuntimeReferences.filter((item) => item.file.toLowerCase().includes('supabase'));
  const blockers = [
    !report ? 'missing disabled local adapter preview report' : null,
    report && report.status !== 'pass' ? `preview report status ${report.status}` : null,
    report && report.installState.scannerRuntimeWired !== false ? 'preview scannerRuntimeWired is not false' : null,
    report && report.installState.scannerVisibleNow !== false ? 'preview scannerVisibleNow is not false' : null,
    report && report.installState.discordPostingEnabled !== false ? 'preview discordPostingEnabled is not false' : null,
    report && report.installState.supabasePersistenceEnabled !== false ? 'preview supabasePersistenceEnabled is not false' : null,
    report && report.installState.canExecuteChanged !== false ? 'preview canExecuteChanged is not false' : null,
    cards.length !== 3 ? `preview card count ${cards.length}` : null,
    cards.some((card) => card.state !== 'DISABLED_LOCAL_REVIEW_PREVIEW') ? 'one or more cards are not disabled preview state' : null,
    cards.some((card) => card.scannerVisible !== false) ? 'one or more cards are scanner-visible' : null,
    cards.some((card) => card.canExecute !== false) ? 'one or more cards canExecute is not false' : null,
    cards.some((card) => card.publishDiscord !== false) ? 'one or more cards publishDiscord is not false' : null,
    cards.some((card) => card.writesSupabase !== false) ? 'one or more cards writesSupabase is not false' : null,
    cards.some((card) => card.readsLiveSupabase !== false) ? 'one or more cards readsLiveSupabase is not false' : null,
    cards.some((card) => card.readsLiveBridge !== false) ? 'one or more cards readsLiveBridge is not false' : null,
    report && report.summary.scannerVisibleRows !== 0 ? `preview scannerVisibleRows ${report.summary.scannerVisibleRows}` : null,
    report && report.summary.livePromotionAllowedRows !== 0 ? `preview livePromotionAllowedRows ${report.summary.livePromotionAllowedRows}` : null,
    runtimeReferences.length ? `unexpected runtime references ${runtimeReferences.length}` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<NoChaseRebuiltReviewDisabledPreviewReadinessAuditReport, 'markdown'> = {
    reportType: 'no_chase_rebuilt_review_disabled_preview_readiness_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      previewPath: args.previewPath,
      repoRoot: args.repoRoot,
    },
    summary: {
      previewCards: cards.length,
      disabledPreviewCards: cards.filter((card) => card.state === 'DISABLED_LOCAL_REVIEW_PREVIEW' && card.scannerVisible === false).length,
      humanReviewOnlyCards: cards.filter((card) => card.humanReviewOnly === true).length,
      canExecuteFalseCards: cards.filter((card) => card.canExecute === false).length,
      publishDiscordFalseCards: cards.filter((card) => card.publishDiscord === false).length,
      scannerVisibleRows: 0,
      livePromotionAllowedRows: 0,
      runtimeReferenceCount: runtimeReferences.length,
      appRuntimeReferenceCount: appRuntimeReferences.length,
      scannerRuntimeReferenceCount: scannerRuntimeReferences.length,
      discordRuntimeReferenceCount: discordRuntimeReferences.length,
      supabaseRuntimeReferenceCount: supabaseRuntimeReferences.length,
      failedGateCount: blockers.length,
      recommendation: blockers.length ? 'fix_inputs' : 'ready_for_local_review_only',
    },
    runtimeReferences,
    blockers,
    recommendations: blockers.length
      ? ['Keep the disabled preview out of review flow until all isolation and boundary gates pass.']
      : [
        'The disabled preview remains isolated and ready for local review only.',
        'Continue broader no-chase candidate research or add a separate scanner-visible proposal before any live-facing implementation.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport(
  report: NoChaseRebuiltReviewDisabledPreviewReadinessAuditReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-rebuilt-review-disabled-preview-readiness-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseRebuiltReviewDisabledPreviewReadinessAuditCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseRebuiltReviewDisabledPreviewReadinessAuditArgs(args);
  const report = buildNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport({
    previewPath: options.preview,
    repoRoot: options.repoRoot,
    previewReport: fs.existsSync(options.preview) ? readJson(options.preview) : null,
  });
  const paths = writeNoChaseRebuiltReviewDisabledPreviewReadinessAuditReport(report, options.outDir);
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
    runNoChaseRebuiltReviewDisabledPreviewReadinessAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
