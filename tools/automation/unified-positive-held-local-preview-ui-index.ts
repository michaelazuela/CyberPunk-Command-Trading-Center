import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewVisualSignoffReport,
  UnifiedPositiveHeldLocalPreviewVisualSignoffRow,
} from './unified-positive-held-local-preview-visual-signoff';

export interface UnifiedPositiveHeldLocalPreviewUiIndexItem {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  pngPath: string;
  imageSrc: string;
  previewStatus: 'preview_ready' | 'blocked';
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewUiIndexReport {
  reportType: 'unified_positive_held_local_preview_ui_index';
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
    signoffReportPath: string | null;
  };
  summary: {
    signoffRowsLoaded: number;
    previewItemsReady: number;
    blockedItems: number;
    postableFalseItems: number;
    shouldPostFalseItems: number;
    canExecuteFalseItems: number;
    publishDiscordFalseItems: number;
    shouldDispatchFalseItems: number;
    writesSupabaseFalseItems: number;
  };
  output: {
    htmlPath: string | null;
  };
  items: UnifiedPositiveHeldLocalPreviewUiIndexItem[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewUiIndexReport['authority'] {
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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function blockersForRow(row: UnifiedPositiveHeldLocalPreviewVisualSignoffRow, signoffStatus: string): string[] {
  return [
    signoffStatus !== 'pass' ? `signoff report status ${signoffStatus}` : null,
    row.status !== 'signed_off' ? `signoff row status ${row.status}` : null,
    !row.pngPath ? 'missing PNG path' : null,
    row.pngPath && !fs.existsSync(row.pngPath) ? 'PNG file does not exist' : null,
    row.postable !== false ? 'signoff row postable is not false' : null,
    row.shouldPost !== false ? 'signoff row shouldPost is not false' : null,
    row.canExecute !== false ? 'signoff row canExecute is not false' : null,
    row.publishDiscord !== false ? 'signoff row publishDiscord is not false' : null,
    row.shouldDispatch !== false ? 'signoff row shouldDispatch is not false' : null,
    row.writesSupabase !== false ? 'signoff row writesSupabase is not false' : null,
  ].filter((item): item is string => Boolean(item));
}

function buildHtml(report: Omit<UnifiedPositiveHeldLocalPreviewUiIndexReport, 'markdown'>): string {
  const cards = report.items.map((item) => `
    <article class="preview-card ${item.direction.toLowerCase()}">
      <div class="preview-meta">
        <span>${escapeHtml(item.setupType)}</span>
        <strong>${escapeHtml(item.direction)}</strong>
      </div>
      <img src="${escapeHtml(item.imageSrc)}" alt="${escapeHtml(`${item.ticketId} held-local preview card`)}" />
      <div class="ticket">${escapeHtml(item.ticketId)}</div>
    </article>
  `).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Held-Local Preview Index</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #05070b;
        color: #f8fafc;
        font-family: Arial, Helvetica, sans-serif;
      }
      header {
        padding: 28px 32px 20px;
        border-bottom: 1px solid rgba(56,189,248,0.28);
        background: linear-gradient(135deg, #05070b 0%, #0b111b 70%, #05070b 100%);
      }
      .brand {
        color: #38bdf8;
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
      }
      h1 {
        margin: 7px 0 8px;
        font-size: 30px;
        line-height: 1.15;
      }
      .boundary {
        color: #cbd5e1;
        font-size: 14px;
        font-weight: 700;
      }
      main {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
        gap: 22px;
        padding: 24px 32px 34px;
      }
      .preview-card {
        border: 1px solid rgba(148,163,184,0.22);
        background: rgba(15,23,42,0.62);
        padding: 14px;
      }
      .preview-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 0 10px;
        color: #38bdf8;
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
      }
      .preview-meta strong {
        color: #22c55e;
      }
      .preview-card.short .preview-meta strong {
        color: #f87171;
      }
      img {
        width: 100%;
        display: block;
        border: 1px solid rgba(56,189,248,0.22);
        background: #020617;
      }
      .ticket {
        padding-top: 10px;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 700;
      }
      footer {
        padding: 18px 32px 28px;
        border-top: 1px solid rgba(148,163,184,0.22);
        color: #cbd5e1;
        font-size: 13px;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">YourMomsTrader</div>
      <h1>Held-Local Preview Index</h1>
      <div class="boundary">Decision Support Only &bull; No automated orders &bull; Local preview only &bull; No Discord post &bull; No Supabase write</div>
    </header>
    <main>
      ${cards}
    </main>
    <footer>Source: signoff-passing local PNG artifacts only. This page does not run scanner logic or change live behavior.</footer>
  </body>
</html>`;
}

export function buildUnifiedPositiveHeldLocalPreviewUiIndexReport(args: {
  signoffReport: UnifiedPositiveHeldLocalPreviewVisualSignoffReport;
  signoffReportPath?: string | null;
  htmlPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewUiIndexReport {
  const items: UnifiedPositiveHeldLocalPreviewUiIndexItem[] = args.signoffReport.rows.map((row) => {
    const blockers = blockersForRow(row, args.signoffReport.status);
    const pngPath = row.pngPath || '';
    return {
      ticketId: row.ticketId,
      sourceSnapshotId: row.sourceSnapshotId,
      setupType: row.setupType,
      direction: row.direction,
      pngPath,
      imageSrc: pngPath ? pathToFileURL(path.resolve(pngPath)).toString() : '',
      previewStatus: blockers.length ? 'blocked' : 'preview_ready',
      postable: false,
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      blockers,
    };
  });

  const reportBase: Omit<UnifiedPositiveHeldLocalPreviewUiIndexReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_ui_index',
    generatedAt,
    status: items.every((item) => item.previewStatus === 'preview_ready') ? 'pass' : 'fail',
    authority: authority(),
    source: {
      signoffReportPath: args.signoffReportPath || null,
    },
    summary: {
      signoffRowsLoaded: args.signoffReport.rows.length,
      previewItemsReady: items.filter((item) => item.previewStatus === 'preview_ready').length,
      blockedItems: items.filter((item) => item.previewStatus === 'blocked').length,
      postableFalseItems: items.filter((item) => item.postable === false).length,
      shouldPostFalseItems: items.filter((item) => item.shouldPost === false).length,
      canExecuteFalseItems: items.filter((item) => item.canExecute === false).length,
      publishDiscordFalseItems: items.filter((item) => item.publishDiscord === false).length,
      shouldDispatchFalseItems: items.filter((item) => item.shouldDispatch === false).length,
      writesSupabaseFalseItems: items.filter((item) => item.writesSupabase === false).length,
    },
    output: {
      htmlPath: args.htmlPath || null,
    },
    items,
  };
  const recommendations = reportBase.status === 'pass'
    ? [
        'Local preview index built from signoff-passing PNG artifacts only.',
        'Next controlled phase can wire this as a local-only no-post app preview behind an explicit flag.',
      ]
    : [
        'Do not use the local preview index until all items are signoff-passing and all boundary flags remain false.',
      ];
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewUiIndexReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Preview UI Index',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only preview index. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Signoff rows loaded: ${report.summary.signoffRowsLoaded}.`,
    `- Preview items ready: ${report.summary.previewItemsReady}.`,
    `- Blocked items: ${report.summary.blockedItems}.`,
    `- postable=false items: ${report.summary.postableFalseItems}.`,
    `- shouldPost=false items: ${report.summary.shouldPostFalseItems}.`,
    `- canExecute=false items: ${report.summary.canExecuteFalseItems}.`,
    `- publishDiscord=false items: ${report.summary.publishDiscordFalseItems}.`,
    `- shouldDispatch=false items: ${report.summary.shouldDispatchFalseItems}.`,
    `- writesSupabase=false items: ${report.summary.writesSupabaseFalseItems}.`,
    `- HTML path: ${report.output.htmlPath || '-'}.`,
    '',
    '## Items',
    '| Ticket | Setup | Side | Status | PNG | Blockers |',
    '|---|---|---|---|---|---|',
    ...report.items.map((item) => `| ${item.ticketId} | ${item.setupType} | ${item.direction} | ${item.previewStatus} | ${escapeTable(item.pngPath || '-')} | ${escapeTable(item.blockers.join(', ') || '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function writeUnifiedPositiveHeldLocalPreviewUiIndexReport(
  report: UnifiedPositiveHeldLocalPreviewUiIndexReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string; htmlPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-ui-index-${Date.now()}`;
  const htmlPath = path.join(outDir, `${base}.html`);
  const finalReport: UnifiedPositiveHeldLocalPreviewUiIndexReport = {
    ...report,
    output: { htmlPath },
  };
  const reportWithMarkdown: UnifiedPositiveHeldLocalPreviewUiIndexReport = {
    ...finalReport,
    markdown: buildMarkdown(finalReport),
  };
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(htmlPath, buildHtml(reportWithMarkdown), 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(reportWithMarkdown, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${reportWithMarkdown.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath, htmlPath };
}

export function runUnifiedPositiveHeldLocalPreviewUiIndexCli(args = process.argv.slice(2)): void {
  const signoffReportPath = readFlag(args, '--signoff');
  if (!signoffReportPath) throw new Error('Missing required --signoff path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const signoffReport = JSON.parse(fs.readFileSync(signoffReportPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewVisualSignoffReport;
  const report = buildUnifiedPositiveHeldLocalPreviewUiIndexReport({
    signoffReport,
    signoffReportPath,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewUiIndexReport(report, outDir);
  const finalReport = JSON.parse(fs.readFileSync(paths.jsonPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewUiIndexReport;
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: finalReport.status, summary: finalReport.summary }, null, 2));
  } else {
    console.log(finalReport.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Preview HTML: ${paths.htmlPath}`);
  }
  if (finalReport.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewUiIndexCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
