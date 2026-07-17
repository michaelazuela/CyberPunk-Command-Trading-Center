import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewPayload,
  UnifiedPositiveHeldLocalPreviewPayloadReport,
} from './unified-positive-held-local-preview-payload';

export interface UnifiedPositiveHeldLocalPreviewRenderedCard {
  sourceOfTruth: 'scanner_owned_held_local_local_preview_render';
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  status: 'rendered_local_preview_card';
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  content: string;
  footer: string;
  shapeChecks: {
    hasTitle: boolean;
    hasWhatWhereWhenWhyInvalidation: boolean;
    hasLevels: boolean;
    hasHumanReviewOnlyBoundary: boolean;
    hasNoAutomatedOrdersBoundary: boolean;
    hasNoDispatchBoundary: boolean;
    hasSideSpecificInvalidation: boolean;
    hasGenericBelowAboveWording: boolean;
  };
}

export interface UnifiedPositiveHeldLocalPreviewRendererRow {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  status: 'rendered' | 'blocked';
  renderedCard: UnifiedPositiveHeldLocalPreviewRenderedCard | null;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewRendererReport {
  reportType: 'unified_positive_held_local_preview_renderer';
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
    previewPayloadPath: string | null;
  };
  summary: {
    previewPayloadRowsLoaded: number;
    renderedCards: number;
    blockedRows: number;
    postableFalseCards: number;
    shouldPostFalseCards: number;
    canExecuteFalseCards: number;
    publishDiscordFalseCards: number;
    shouldDispatchFalseCards: number;
    writesSupabaseFalseCards: number;
    shapePassCards: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewRendererRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewRendererReport['authority'] {
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

function price(value: number | null | undefined): string {
  return Number.isFinite(value) ? Number(value).toFixed(2) : 'not set';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function expectedSidePhrase(payload: UnifiedPositiveHeldLocalPreviewPayload): string | null {
  const stopText = price(payload.levels.stop);
  if (payload.direction === 'LONG') return `Invalid if price trades below the protected 5M stop line at ${stopText}.`;
  if (payload.direction === 'SHORT') return `Invalid if price trades above the protected 5M stop line at ${stopText}.`;
  return null;
}

function renderContent(payload: UnifiedPositiveHeldLocalPreviewPayload): string {
  return [
    `[HELD-LOCAL REVIEW] MES - ${payload.direction} ACTIVE_REVIEW`,
    payload.title,
    '',
    `What: ${payload.sections.what}`,
    `Where: ${payload.sections.where}`,
    `When: ${payload.sections.when}`,
    `Why: ${payload.sections.why}`,
    `Invalidation: ${payload.sections.invalidation}`,
    '',
    `Line: ${price(payload.levels.lineInSand)} | Entry: ${price(payload.levels.entry)} | Stop: ${price(payload.levels.stop)} | T1: ${price(payload.levels.t1)} | T2: ${price(payload.levels.t2)}`,
    `HTF status: ${payload.htfStatus || 'not provided'}`,
    'Boundary: Human-review only. No automated order authority. Local preview only; not posted to Discord and not written to Supabase.',
  ].join('\n');
}

function buildRenderedCard(payload: UnifiedPositiveHeldLocalPreviewPayload): UnifiedPositiveHeldLocalPreviewRenderedCard {
  const content = renderContent(payload);
  const expected = expectedSidePhrase(payload);
  return {
    sourceOfTruth: 'scanner_owned_held_local_local_preview_render',
    ticketId: payload.ticketId,
    sourceSnapshotId: payload.sourceSnapshotId,
    setupType: payload.setupType,
    direction: payload.direction,
    status: 'rendered_local_preview_card',
    postable: false,
    publishDiscord: false,
    shouldPost: false,
    canExecute: false,
    shouldDispatch: false,
    writesSupabase: false,
    content,
    footer: 'Local preview only. Human review required. No automated orders. No Discord post. No Supabase write.',
    shapeChecks: {
      hasTitle: content.includes('[HELD-LOCAL REVIEW]') && content.includes(payload.title),
      hasWhatWhereWhenWhyInvalidation: ['What:', 'Where:', 'When:', 'Why:', 'Invalidation:'].every((label) => content.includes(label)),
      hasLevels: ['Line:', 'Entry:', 'Stop:', 'T1:', 'T2:'].every((label) => content.includes(label)),
      hasHumanReviewOnlyBoundary: /Human-review only/i.test(content) && payload.humanReviewOnly === true,
      hasNoAutomatedOrdersBoundary: /No automated order/i.test(content) && payload.noAutomatedOrders === true,
      hasNoDispatchBoundary: /not posted to Discord/i.test(content) && /not written to Supabase/i.test(content),
      hasSideSpecificInvalidation: Boolean(expected && payload.sections.invalidation.includes(expected)),
      hasGenericBelowAboveWording: /below\/above|above\/below/i.test(payload.sections.invalidation),
    },
  };
}

function blockersForPayload(payload: UnifiedPositiveHeldLocalPreviewPayload | null, sourceStatus: UnifiedPositiveHeldLocalPreviewPayloadReport['status']): string[] {
  if (!payload) return ['missing preview payload'];
  const rendered = buildRenderedCard(payload);
  return [
    sourceStatus !== 'pass' ? `preview payload report status ${sourceStatus}` : null,
    payload.state !== 'ACTIVE_REVIEW' ? 'payload is not ACTIVE_REVIEW' : null,
    payload.publishDiscord !== false ? 'payload publishDiscord is not false' : null,
    payload.shouldPost !== false ? 'payload shouldPost is not false' : null,
    payload.canExecute !== false ? 'payload canExecute is not false' : null,
    payload.shouldDispatch !== false ? 'payload shouldDispatch is not false' : null,
    payload.writesSupabase !== false ? 'payload writesSupabase is not false' : null,
    payload.reviewOnly !== true ? 'payload reviewOnly is not true' : null,
    payload.humanReviewOnly !== true ? 'payload humanReviewOnly is not true' : null,
    payload.noAutomatedOrders !== true ? 'payload noAutomatedOrders is not true' : null,
    rendered.shapeChecks.hasTitle !== true ? 'rendered card is missing title' : null,
    rendered.shapeChecks.hasWhatWhereWhenWhyInvalidation !== true ? 'rendered card is missing What/Where/When/Why/Invalidation' : null,
    rendered.shapeChecks.hasLevels !== true ? 'rendered card is missing levels' : null,
    rendered.shapeChecks.hasHumanReviewOnlyBoundary !== true ? 'rendered card is missing human-review-only boundary' : null,
    rendered.shapeChecks.hasNoAutomatedOrdersBoundary !== true ? 'rendered card is missing no-automated-orders boundary' : null,
    rendered.shapeChecks.hasNoDispatchBoundary !== true ? 'rendered card is missing no-dispatch boundary' : null,
    rendered.shapeChecks.hasSideSpecificInvalidation !== true ? 'rendered card is missing side-specific invalidation' : null,
    rendered.shapeChecks.hasGenericBelowAboveWording ? 'rendered card contains generic below/above wording' : null,
  ].filter((item): item is string => Boolean(item));
}

function rowForPreviewPayload(
  row: UnifiedPositiveHeldLocalPreviewPayloadReport['rows'][number],
  sourceStatus: UnifiedPositiveHeldLocalPreviewPayloadReport['status'],
): UnifiedPositiveHeldLocalPreviewRendererRow {
  const blockers = blockersForPayload(row.payload, sourceStatus);
  return {
    ticketId: row.ticketId,
    sourceSnapshotId: row.sourceSnapshotId,
    setupType: row.setupType,
    direction: row.direction,
    status: blockers.length ? 'blocked' : 'rendered',
    renderedCard: blockers.length || !row.payload ? null : buildRenderedCard(row.payload),
    blockers,
  };
}

function shapePass(card: UnifiedPositiveHeldLocalPreviewRenderedCard | null): boolean {
  if (!card) return false;
  return Object.entries(card.shapeChecks).every(([key, value]) => (
    key === 'hasGenericBelowAboveWording' ? value === false : value === true
  ));
}

function buildRecommendations(report: Omit<UnifiedPositiveHeldLocalPreviewRendererReport, 'recommendations' | 'markdown'>): string[] {
  if (report.status === 'fail') {
    return [
      'Do not use held-local preview card shape until every row renders locally with no executable or dispatch boundary failures.',
    ];
  }
  return [
    'Held-local preview cards are locally renderable as non-postable human-review cards.',
    'Next narrow phase can add a visual/card artifact render behind the same local-only boundary if the desk wants image-level QA.',
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewRendererReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Preview Renderer',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only render shape. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Preview payload rows loaded: ${report.summary.previewPayloadRowsLoaded}.`,
    `- Rendered cards: ${report.summary.renderedCards}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- postable=false cards: ${report.summary.postableFalseCards}.`,
    `- shouldPost=false cards: ${report.summary.shouldPostFalseCards}.`,
    `- canExecute=false cards: ${report.summary.canExecuteFalseCards}.`,
    `- publishDiscord=false cards: ${report.summary.publishDiscordFalseCards}.`,
    `- shouldDispatch=false cards: ${report.summary.shouldDispatchFalseCards}.`,
    `- writesSupabase=false cards: ${report.summary.writesSupabaseFalseCards}.`,
    `- Shape-pass cards: ${report.summary.shapePassCards}.`,
    '',
    '## Cards',
    '| Ticket | Setup | Side | Status | Shape pass | Blockers |',
    '|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.setupType} | ${row.direction} | ${row.status} | ${shapePass(row.renderedCard)} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewRendererReport(args: {
  previewPayloadReport: UnifiedPositiveHeldLocalPreviewPayloadReport;
  previewPayloadPath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewRendererReport {
  const rows = args.previewPayloadReport.rows.map((row) => rowForPreviewPayload(row, args.previewPayloadReport.status));
  const reportBase: Omit<UnifiedPositiveHeldLocalPreviewRendererReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_renderer',
    generatedAt,
    status: rows.every((row) => row.status === 'rendered') ? 'pass' : 'fail',
    authority: authority(),
    source: {
      previewPayloadPath: args.previewPayloadPath || null,
    },
    summary: {
      previewPayloadRowsLoaded: args.previewPayloadReport.rows.length,
      renderedCards: rows.filter((row) => row.status === 'rendered').length,
      blockedRows: rows.filter((row) => row.status === 'blocked').length,
      postableFalseCards: rows.filter((row) => row.renderedCard?.postable === false).length,
      shouldPostFalseCards: rows.filter((row) => row.renderedCard?.shouldPost === false).length,
      canExecuteFalseCards: rows.filter((row) => row.renderedCard?.canExecute === false).length,
      publishDiscordFalseCards: rows.filter((row) => row.renderedCard?.publishDiscord === false).length,
      shouldDispatchFalseCards: rows.filter((row) => row.renderedCard?.shouldDispatch === false).length,
      writesSupabaseFalseCards: rows.filter((row) => row.renderedCard?.writesSupabase === false).length,
      shapePassCards: rows.filter((row) => shapePass(row.renderedCard)).length,
    },
    rows,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveHeldLocalPreviewRendererReport(
  report: UnifiedPositiveHeldLocalPreviewRendererReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-renderer-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalPreviewRendererCli(args = process.argv.slice(2)): Promise<void> {
  const previewPayloadPath = readFlag(args, '--preview-payload');
  if (!previewPayloadPath) throw new Error('Missing required --preview-payload path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const previewPayloadReport = JSON.parse(fs.readFileSync(previewPayloadPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewPayloadReport;
  const report = buildUnifiedPositiveHeldLocalPreviewRendererReport({ previewPayloadReport, previewPayloadPath });
  const paths = writeUnifiedPositiveHeldLocalPreviewRendererReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewRendererCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
