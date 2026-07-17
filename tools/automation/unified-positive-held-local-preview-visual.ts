import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewPreflightReport } from './unified-positive-held-local-preview-preflight';
import type {
  UnifiedPositiveHeldLocalPreviewRenderedCard,
  UnifiedPositiveHeldLocalPreviewRendererReport,
} from './unified-positive-held-local-preview-renderer';
import { renderHtmlToApprovedPng, validatePngFile } from './render-html-to-png';

export const HELD_LOCAL_PREVIEW_VISUAL_WIDTH = 1280;
export const HELD_LOCAL_PREVIEW_VISUAL_HEIGHT = 760;

export interface UnifiedPositiveHeldLocalPreviewVisualRow {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  status: 'visual_rendered' | 'blocked';
  pngPath: string | null;
  visualQuality: 'pass' | 'fail';
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  qa: {
    pngRendered: boolean;
    dimensionsApproved: boolean;
    minBytesApproved: boolean;
    hasDecisionSupportFooter: boolean;
    hasNoAutomatedOrdersText: boolean;
    hasNoDiscordPostText: boolean;
    hasNoSupabaseWriteText: boolean;
    hasEntryStopTargets: boolean;
    hasSideSpecificInvalidation: boolean;
  };
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewVisualReport {
  reportType: 'unified_positive_held_local_preview_visual';
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
  };
  source: {
    rendererPath: string | null;
    preflightPath: string | null;
  };
  summary: {
    rendererRowsLoaded: number;
    preflightRowsLoaded: number;
    visualRowsRendered: number;
    blockedRows: number;
    postableFalseRows: number;
    shouldPostFalseRows: number;
    canExecuteFalseRows: number;
    publishDiscordFalseRows: number;
    shouldDispatchFalseRows: number;
    writesSupabaseFalseRows: number;
    visualPassRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewVisualRow[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_VISUAL_DIR = path.join(DEFAULT_OUT_DIR, 'held-local-preview-visuals');
const LOGO_PATH = path.resolve(__dirname, '../../brand-assets/x-profile/YourMomsTrader-X-avatar-800x800.png');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewVisualReport['authority'] {
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

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'held-local-preview';
}

function logoDataUri(): string {
  if (!fs.existsSync(LOGO_PATH)) return '';
  return `data:image/png;base64,${fs.readFileSync(LOGO_PATH).toString('base64')}`;
}

function section(content: string, label: string): string {
  const match = content.match(new RegExp(`${label}:\\s*([^\\n]+)`));
  return match?.[1]?.trim() || '';
}

function sideTone(direction: string): string {
  return direction === 'LONG' ? 'long' : direction === 'SHORT' ? 'short' : 'neutral';
}

function cardHtml(card: UnifiedPositiveHeldLocalPreviewRenderedCard): string {
  const logoUrl = logoDataUri() || pathToFileURL(LOGO_PATH).toString();
  const what = section(card.content, 'What');
  const where = section(card.content, 'Where');
  const when = section(card.content, 'When');
  const why = section(card.content, 'Why');
  const invalidation = section(card.content, 'Invalidation');
  const line = section(card.content, 'Line');
  const tone = sideTone(card.direction);
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        width: ${HELD_LOCAL_PREVIEW_VISUAL_WIDTH}px;
        height: ${HELD_LOCAL_PREVIEW_VISUAL_HEIGHT}px;
        margin: 0;
        overflow: hidden;
        background: #05070b;
        color: #f8fafc;
        font-family: Arial, Helvetica, sans-serif;
      }
      body {
        padding: 30px;
        background:
          radial-gradient(circle at 15% 0%, rgba(56,189,248,0.16), transparent 28%),
          linear-gradient(135deg, #05070b 0%, #0b111b 58%, #05070b 100%);
      }
      .card {
        position: relative;
        width: 100%;
        height: 100%;
        border: 1px solid rgba(56,189,248,0.34);
        background: rgba(5, 9, 14, 0.95);
        overflow: hidden;
      }
      .watermark {
        position: absolute;
        left: 184px;
        top: 326px;
        transform: rotate(-18deg);
        color: rgba(255,255,255,0.026);
        font-size: 82px;
        font-weight: 900;
        white-space: nowrap;
      }
      .header {
        position: relative;
        display: flex;
        gap: 18px;
        align-items: center;
        padding: 24px 28px 18px;
        border-bottom: 1px solid rgba(148,163,184,0.22);
      }
      .logo {
        width: 62px;
        height: 62px;
        border-radius: 8px;
        object-fit: cover;
        border: 1px solid rgba(56,189,248,0.46);
        flex: 0 0 auto;
      }
      .brand {
        color: #38bdf8;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.6px;
        text-transform: uppercase;
      }
      .title {
        margin-top: 7px;
        font-size: 30px;
        line-height: 1.12;
        font-weight: 900;
        letter-spacing: 0;
      }
      .badge {
        margin-left: auto;
        min-width: 190px;
        text-align: center;
        padding: 14px 16px;
        border: 1px solid ${tone === 'long' ? 'rgba(34,197,94,0.46)' : tone === 'short' ? 'rgba(248,113,113,0.46)' : 'rgba(56,189,248,0.46)'};
        background: ${tone === 'long' ? 'rgba(22,101,52,0.24)' : tone === 'short' ? 'rgba(127,29,29,0.24)' : 'rgba(14,116,144,0.24)'};
      }
      .badge span {
        display: block;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
      }
      .badge strong {
        display: block;
        margin-top: 6px;
        color: ${tone === 'long' ? '#22c55e' : tone === 'short' ? '#f87171' : '#38bdf8'};
        font-size: 24px;
        font-weight: 900;
      }
      .body {
        position: relative;
        display: grid;
        grid-template-columns: 1.08fr 0.92fr;
        gap: 20px;
        padding: 24px 28px 18px;
      }
      .panel {
        border: 1px solid rgba(148,163,184,0.18);
        background: rgba(15,23,42,0.62);
        padding: 18px;
      }
      .panel-title {
        color: #38bdf8;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.4px;
        margin-bottom: 14px;
        text-transform: uppercase;
      }
      .brief {
        display: grid;
        gap: 12px;
      }
      .item {
        min-height: 62px;
        padding: 12px 14px;
        border: 1px solid rgba(148,163,184,0.13);
        background: rgba(2,6,12,0.34);
      }
      .item span, .metric span {
        display: block;
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-bottom: 7px;
      }
      .item strong {
        color: #f8fafc;
        font-size: 17px;
        line-height: 1.28;
        font-weight: 800;
      }
      .levels {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .metric {
        min-height: 80px;
        padding: 13px 14px;
        border: 1px solid rgba(148,163,184,0.13);
        background: rgba(2,6,12,0.34);
      }
      .metric strong {
        color: #f8fafc;
        font-size: 22px;
        line-height: 1.15;
        font-weight: 900;
      }
      .metric.entry strong { color: #22c55e; }
      .metric.stop strong { color: #f87171; }
      .metric.target strong { color: #facc15; }
      .invalidation {
        margin-top: 16px;
        border-color: rgba(248,113,113,0.32);
      }
      .invalidation strong {
        color: #fecaca;
      }
      .footer {
        position: absolute;
        left: 28px;
        right: 28px;
        bottom: 18px;
        border-top: 1px solid rgba(148,163,184,0.22);
        padding-top: 14px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.35;
        font-weight: 800;
      }
      .footer strong { color: #22c55e; }
    </style>
  </head>
  <body>
    <section class="card">
      <div class="watermark">YourMomsTrader</div>
      <header class="header">
        <img class="logo" src="${logoUrl}" />
        <div>
          <div class="brand">YourMomsTrader</div>
          <div class="title">HELD-LOCAL REVIEW CARD</div>
        </div>
        <div class="badge"><span>Direction</span><strong>${escapeHtml(card.direction)}</strong></div>
      </header>
      <main class="body">
        <section class="panel">
          <div class="panel-title">Desk Read</div>
          <div class="brief">
            <div class="item"><span>What</span><strong>${escapeHtml(what)}</strong></div>
            <div class="item"><span>Where</span><strong>${escapeHtml(where)}</strong></div>
            <div class="item"><span>When</span><strong>${escapeHtml(when)}</strong></div>
            <div class="item"><span>Why</span><strong>${escapeHtml(why)}</strong></div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-title">Review Levels</div>
          <div class="levels">
            <div class="metric"><span>Line</span><strong>${escapeHtml(line.split('|')[0]?.replace('Line:', '').trim() || 'not set')}</strong></div>
            <div class="metric entry"><span>Entry</span><strong>${escapeHtml(line.match(/Entry:\s*([^|]+)/)?.[1]?.trim() || 'not set')}</strong></div>
            <div class="metric stop"><span>Stop</span><strong>${escapeHtml(line.match(/Stop:\s*([^|]+)/)?.[1]?.trim() || 'not set')}</strong></div>
            <div class="metric target"><span>T1 / T2</span><strong>${escapeHtml(`${line.match(/T1:\s*([^|]+)/)?.[1]?.trim() || 'not set'} / ${line.match(/T2:\s*([^|]+)/)?.[1]?.trim() || 'not set'}`)}</strong></div>
          </div>
          <div class="item invalidation"><span>Invalidation</span><strong>${escapeHtml(invalidation)}</strong></div>
        </section>
      </main>
      <footer class="footer">
        <span><strong>Decision Support Only</strong> • No automated orders • Human review required</span>
        <span>Local preview only • No Discord post • No Supabase write</span>
      </footer>
    </section>
  </body>
</html>`;
}

function cardQa(card: UnifiedPositiveHeldLocalPreviewRenderedCard, pngPath: string | null): UnifiedPositiveHeldLocalPreviewVisualRow['qa'] {
  const text = card.content;
  return {
    pngRendered: Boolean(pngPath),
    dimensionsApproved: Boolean(pngPath),
    minBytesApproved: Boolean(pngPath),
    hasDecisionSupportFooter: true,
    hasNoAutomatedOrdersText: /No automated order/i.test(text),
    hasNoDiscordPostText: /not posted to Discord/i.test(text),
    hasNoSupabaseWriteText: /not written to Supabase/i.test(text),
    hasEntryStopTargets: ['Entry:', 'Stop:', 'T1:', 'T2:'].every((label) => text.includes(label)),
    hasSideSpecificInvalidation: card.shapeChecks.hasSideSpecificInvalidation === true,
  };
}

function qaPass(qa: UnifiedPositiveHeldLocalPreviewVisualRow['qa']): boolean {
  return Object.values(qa).every((value) => value === true);
}

function blockersForRow(args: {
  rendererReport: UnifiedPositiveHeldLocalPreviewRendererReport;
  preflightReport: UnifiedPositiveHeldLocalPreviewPreflightReport;
  renderedCard: UnifiedPositiveHeldLocalPreviewRenderedCard | null;
  ticketId: string;
}): string[] {
  const preflightRow = args.preflightReport.rows.find((row) => row.ticketId === args.ticketId) || null;
  return [
    args.rendererReport.status !== 'pass' ? `renderer status ${args.rendererReport.status}` : null,
    args.preflightReport.status !== 'pass' ? `preflight status ${args.preflightReport.status}` : null,
    !preflightRow ? 'missing preflight row' : null,
    preflightRow && preflightRow.status !== 'preflight_pass' ? `preflight row status ${preflightRow.status}` : null,
    !args.renderedCard ? 'missing rendered card' : null,
    args.renderedCard?.postable !== false ? 'rendered card postable is not false' : null,
    args.renderedCard?.shouldPost !== false ? 'rendered card shouldPost is not false' : null,
    args.renderedCard?.canExecute !== false ? 'rendered card canExecute is not false' : null,
    args.renderedCard?.publishDiscord !== false ? 'rendered card publishDiscord is not false' : null,
    args.renderedCard?.shouldDispatch !== false ? 'rendered card shouldDispatch is not false' : null,
    args.renderedCard?.writesSupabase !== false ? 'rendered card writesSupabase is not false' : null,
  ].filter((item): item is string => Boolean(item));
}

export async function buildUnifiedPositiveHeldLocalPreviewVisualReport(args: {
  rendererReport: UnifiedPositiveHeldLocalPreviewRendererReport;
  preflightReport: UnifiedPositiveHeldLocalPreviewPreflightReport;
  rendererPath?: string | null;
  preflightPath?: string | null;
  visualDir?: string;
}, generatedAt = new Date().toISOString()): Promise<UnifiedPositiveHeldLocalPreviewVisualReport> {
  const visualDir = args.visualDir || DEFAULT_VISUAL_DIR;
  fs.mkdirSync(visualDir, { recursive: true });
  const rows: UnifiedPositiveHeldLocalPreviewVisualRow[] = [];
  for (const row of args.rendererReport.rows) {
    const blockers = blockersForRow({
      rendererReport: args.rendererReport,
      preflightReport: args.preflightReport,
      renderedCard: row.renderedCard,
      ticketId: row.ticketId,
    });
    let pngPath: string | null = null;
    let qa: UnifiedPositiveHeldLocalPreviewVisualRow['qa'] = {
      pngRendered: false,
      dimensionsApproved: false,
      minBytesApproved: false,
      hasDecisionSupportFooter: false,
      hasNoAutomatedOrdersText: false,
      hasNoDiscordPostText: false,
      hasNoSupabaseWriteText: false,
      hasEntryStopTargets: false,
      hasSideSpecificInvalidation: false,
    };
    if (!blockers.length && row.renderedCard) {
      pngPath = path.join(visualDir, `${safeFilePart(`held-local-preview-${row.ticketId}`)}.png`);
      await renderHtmlToApprovedPng({
        html: cardHtml(row.renderedCard),
        outputPath: pngPath,
        viewport: { width: HELD_LOCAL_PREVIEW_VISUAL_WIDTH, height: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT },
        expectedWidth: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
        expectedHeight: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
        minBytes: 20_000,
        failureLabel: 'Held-local preview visual render',
      });
      const validation = await validatePngFile(pngPath, {
        expectedWidth: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
        expectedHeight: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
        minBytes: 20_000,
      });
      qa = {
        ...cardQa(row.renderedCard, pngPath),
        dimensionsApproved: validation.ok === true,
        minBytesApproved: validation.ok === true,
      };
      if (!qaPass(qa)) blockers.push('visual QA checks failed');
    }
    rows.push({
      ticketId: row.ticketId,
      sourceSnapshotId: row.sourceSnapshotId,
      setupType: row.setupType,
      direction: row.direction,
      status: blockers.length ? 'blocked' : 'visual_rendered',
      pngPath,
      visualQuality: blockers.length ? 'fail' : 'pass',
      postable: false,
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      qa,
      blockers,
    });
  }
  const reportBase: Omit<UnifiedPositiveHeldLocalPreviewVisualReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_visual',
    generatedAt,
    status: rows.every((row) => row.status === 'visual_rendered') ? 'pass' : 'fail',
    authority: authority(),
    source: {
      rendererPath: args.rendererPath || null,
      preflightPath: args.preflightPath || null,
    },
    summary: {
      rendererRowsLoaded: args.rendererReport.rows.length,
      preflightRowsLoaded: args.preflightReport.rows.length,
      visualRowsRendered: rows.filter((row) => row.status === 'visual_rendered').length,
      blockedRows: rows.filter((row) => row.status === 'blocked').length,
      postableFalseRows: rows.filter((row) => row.postable === false).length,
      shouldPostFalseRows: rows.filter((row) => row.shouldPost === false).length,
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.publishDiscord === false).length,
      shouldDispatchFalseRows: rows.filter((row) => row.shouldDispatch === false).length,
      writesSupabaseFalseRows: rows.filter((row) => row.writesSupabase === false).length,
      visualPassRows: rows.filter((row) => row.visualQuality === 'pass').length,
    },
    rows,
  };
  const recommendations = reportBase.status === 'pass'
    ? [
        'Local visual artifacts rendered behind passing text preflight and remain non-postable.',
        'Before any UI or Discord exposure, run a separate controlled wiring phase with explicit approval.',
      ]
    : [
        'Do not use held-local visual artifacts until every visual row passes local QA.',
      ];
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewVisualReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Preview Visual',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only visual artifact render. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Renderer rows loaded: ${report.summary.rendererRowsLoaded}.`,
    `- Preflight rows loaded: ${report.summary.preflightRowsLoaded}.`,
    `- Visual rows rendered: ${report.summary.visualRowsRendered}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- postable=false rows: ${report.summary.postableFalseRows}.`,
    `- shouldPost=false rows: ${report.summary.shouldPostFalseRows}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    `- publishDiscord=false rows: ${report.summary.publishDiscordFalseRows}.`,
    `- shouldDispatch=false rows: ${report.summary.shouldDispatchFalseRows}.`,
    `- writesSupabase=false rows: ${report.summary.writesSupabaseFalseRows}.`,
    `- Visual pass rows: ${report.summary.visualPassRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Status | PNG | Blockers |',
    '|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.setupType} | ${row.direction} | ${row.status} | ${escapeTable(row.pngPath || '-')} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function writeUnifiedPositiveHeldLocalPreviewVisualReport(
  report: UnifiedPositiveHeldLocalPreviewVisualReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-visual-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalPreviewVisualCli(args = process.argv.slice(2)): Promise<void> {
  const rendererPath = readFlag(args, '--renderer');
  const preflightPath = readFlag(args, '--preflight');
  if (!rendererPath) throw new Error('Missing required --renderer path.');
  if (!preflightPath) throw new Error('Missing required --preflight path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const visualDir = readFlag(args, '--visual-dir') || DEFAULT_VISUAL_DIR;
  const rendererReport = JSON.parse(fs.readFileSync(rendererPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewRendererReport;
  const preflightReport = JSON.parse(fs.readFileSync(preflightPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewPreflightReport;
  const report = await buildUnifiedPositiveHeldLocalPreviewVisualReport({
    rendererReport,
    preflightReport,
    rendererPath,
    preflightPath,
    visualDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewVisualReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveHeldLocalPreviewVisualCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
