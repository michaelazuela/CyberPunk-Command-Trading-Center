import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePngFile } from './render-html-to-png';
import {
  HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
  HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
  type UnifiedPositiveHeldLocalPreviewVisualReport,
  type UnifiedPositiveHeldLocalPreviewVisualRow,
} from './unified-positive-held-local-preview-visual';

export interface UnifiedPositiveHeldLocalPreviewVisualSignoffRow {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  pngPath: string | null;
  status: 'signed_off' | 'blocked';
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  canExecute: false;
  shouldDispatch: false;
  writesSupabase: false;
  inspection: {
    inspectedPngRecorded: boolean;
    pngExists: boolean;
    dimensionsApproved: boolean;
    minBytesApproved: boolean;
    reportVisualQualityPass: boolean;
    reportQaPass: boolean;
    decisionSupportLanguagePresent: boolean;
    noAutomatedOrdersLanguagePresent: boolean;
    noDiscordPostLanguagePresent: boolean;
    noSupabaseWriteLanguagePresent: boolean;
    inspectorNotePresent: boolean;
  };
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewVisualSignoffReport {
  reportType: 'unified_positive_held_local_preview_visual_signoff';
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
    visualReportPath: string | null;
  };
  signoff: {
    inspector: string;
    note: string;
    requireAllRenderedRows: boolean;
    inspectedPngPaths: string[];
  };
  summary: {
    visualRowsLoaded: number;
    rowsSignedOff: number;
    blockedRows: number;
    inspectedPngsRecorded: number;
    unrecognizedInspectedPngs: number;
    postableFalseRows: number;
    shouldPostFalseRows: number;
    canExecuteFalseRows: number;
    publishDiscordFalseRows: number;
    shouldDispatchFalseRows: number;
    writesSupabaseFalseRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewVisualSignoffRow[];
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

function readRepeatedFlag(args: string[], flag: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === flag && args[index + 1] && !args[index + 1].startsWith('--')) {
      values.push(args[index + 1]);
      index += 1;
      continue;
    }
    const prefix = `${flag}=`;
    if (value.startsWith(prefix)) values.push(value.slice(prefix.length));
  }
  return values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
}

function readBooleanFlag(args: string[], flag: string, defaultValue: boolean): boolean {
  const value = readFlag(args, flag);
  if (value === null) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

function authority(): UnifiedPositiveHeldLocalPreviewVisualSignoffReport['authority'] {
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

function normalizePath(value: string | null): string | null {
  if (!value) return null;
  return path.resolve(value).toLowerCase();
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function visualQaPass(row: UnifiedPositiveHeldLocalPreviewVisualRow): boolean {
  return row.qa.pngRendered === true
    && row.qa.dimensionsApproved === true
    && row.qa.minBytesApproved === true
    && row.qa.hasDecisionSupportFooter === true
    && row.qa.hasNoAutomatedOrdersText === true
    && row.qa.hasNoDiscordPostText === true
    && row.qa.hasNoSupabaseWriteText === true
    && row.qa.hasEntryStopTargets === true
    && row.qa.hasSideSpecificInvalidation === true;
}

function languageQa(row: UnifiedPositiveHeldLocalPreviewVisualRow): Pick<
  UnifiedPositiveHeldLocalPreviewVisualSignoffRow['inspection'],
  'decisionSupportLanguagePresent' | 'noAutomatedOrdersLanguagePresent' | 'noDiscordPostLanguagePresent' | 'noSupabaseWriteLanguagePresent'
> {
  return {
    decisionSupportLanguagePresent: row.qa.hasDecisionSupportFooter === true,
    noAutomatedOrdersLanguagePresent: row.qa.hasNoAutomatedOrdersText === true,
    noDiscordPostLanguagePresent: row.qa.hasNoDiscordPostText === true,
    noSupabaseWriteLanguagePresent: row.qa.hasNoSupabaseWriteText === true,
  };
}

function inspectionPass(inspection: UnifiedPositiveHeldLocalPreviewVisualSignoffRow['inspection']): boolean {
  return Object.values(inspection).every((value) => value === true);
}

export async function buildUnifiedPositiveHeldLocalPreviewVisualSignoffReport(args: {
  visualReport: UnifiedPositiveHeldLocalPreviewVisualReport;
  visualReportPath?: string | null;
  inspectedPngPaths: string[];
  inspector?: string;
  note?: string;
  requireAllRenderedRows?: boolean;
}, generatedAt = new Date().toISOString()): Promise<UnifiedPositiveHeldLocalPreviewVisualSignoffReport> {
  const requireAllRenderedRows = args.requireAllRenderedRows ?? true;
  const inspectedPngPaths = [...new Set(args.inspectedPngPaths.map((item) => path.resolve(item)))];
  const inspectedSet = new Set(inspectedPngPaths.map((item) => item.toLowerCase()));
  const rows: UnifiedPositiveHeldLocalPreviewVisualSignoffRow[] = [];

  for (const visualRow of args.visualReport.rows) {
    const normalizedPngPath = normalizePath(visualRow.pngPath);
    const inspectedPngRecorded = normalizedPngPath !== null && inspectedSet.has(normalizedPngPath);
    const blockers: string[] = [
      args.visualReport.status !== 'pass' ? `visual report status ${args.visualReport.status}` : null,
      visualRow.status !== 'visual_rendered' ? `visual row status ${visualRow.status}` : null,
      requireAllRenderedRows && !inspectedPngRecorded ? 'rendered PNG was not listed as inspected' : null,
      visualRow.postable !== false ? 'visual row postable is not false' : null,
      visualRow.shouldPost !== false ? 'visual row shouldPost is not false' : null,
      visualRow.canExecute !== false ? 'visual row canExecute is not false' : null,
      visualRow.publishDiscord !== false ? 'visual row publishDiscord is not false' : null,
      visualRow.shouldDispatch !== false ? 'visual row shouldDispatch is not false' : null,
      visualRow.writesSupabase !== false ? 'visual row writesSupabase is not false' : null,
      !args.note?.trim() ? 'inspector note is required' : null,
    ].filter((item): item is string => Boolean(item));

    let pngExists = false;
    let dimensionsApproved = false;
    let minBytesApproved = false;
    if (visualRow.pngPath && inspectedPngRecorded) {
      const validation = await validatePngFile(visualRow.pngPath, {
        expectedWidth: HELD_LOCAL_PREVIEW_VISUAL_WIDTH,
        expectedHeight: HELD_LOCAL_PREVIEW_VISUAL_HEIGHT,
        minBytes: 20_000,
      });
      pngExists = fs.existsSync(visualRow.pngPath);
      dimensionsApproved = validation.ok === true;
      minBytesApproved = validation.ok === true;
      if (validation.ok === false) blockers.push(validation.reason);
    }

    const inspection = {
      inspectedPngRecorded,
      pngExists,
      dimensionsApproved,
      minBytesApproved,
      reportVisualQualityPass: visualRow.visualQuality === 'pass',
      reportQaPass: visualQaPass(visualRow),
      ...languageQa(visualRow),
      inspectorNotePresent: Boolean(args.note?.trim()),
    };
    if (!inspectionPass(inspection)) blockers.push('visual signoff inspection checks failed');

    rows.push({
      ticketId: visualRow.ticketId,
      sourceSnapshotId: visualRow.sourceSnapshotId,
      setupType: visualRow.setupType,
      direction: visualRow.direction,
      pngPath: visualRow.pngPath,
      status: blockers.length ? 'blocked' : 'signed_off',
      postable: false,
      publishDiscord: false,
      shouldPost: false,
      canExecute: false,
      shouldDispatch: false,
      writesSupabase: false,
      inspection,
      blockers,
    });
  }

  const visualPngSet = new Set(args.visualReport.rows.map((row) => normalizePath(row.pngPath)).filter((item): item is string => Boolean(item)));
  const unrecognizedInspectedPngs = inspectedPngPaths.filter((item) => !visualPngSet.has(item.toLowerCase())).length;
  const reportBase: Omit<UnifiedPositiveHeldLocalPreviewVisualSignoffReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_visual_signoff',
    generatedAt,
    status: rows.every((row) => row.status === 'signed_off') && unrecognizedInspectedPngs === 0 ? 'pass' : 'fail',
    authority: authority(),
    source: {
      visualReportPath: args.visualReportPath || null,
    },
    signoff: {
      inspector: args.inspector || 'Codex',
      note: args.note || '',
      requireAllRenderedRows,
      inspectedPngPaths,
    },
    summary: {
      visualRowsLoaded: args.visualReport.rows.length,
      rowsSignedOff: rows.filter((row) => row.status === 'signed_off').length,
      blockedRows: rows.filter((row) => row.status === 'blocked').length,
      inspectedPngsRecorded: inspectedPngPaths.length,
      unrecognizedInspectedPngs,
      postableFalseRows: rows.filter((row) => row.postable === false).length,
      shouldPostFalseRows: rows.filter((row) => row.shouldPost === false).length,
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.publishDiscord === false).length,
      shouldDispatchFalseRows: rows.filter((row) => row.shouldDispatch === false).length,
      writesSupabaseFalseRows: rows.filter((row) => row.writesSupabase === false).length,
    },
    rows,
  };

  const recommendations = reportBase.status === 'pass'
    ? [
        'Local visual QA signoff recorded for the rendered held-local preview PNG artifacts.',
        'Before any UI or Discord exposure, run a separate no-post wiring phase with explicit approval.',
      ]
    : [
        'Do not expose held-local visual artifacts until every rendered PNG has a passing local signoff.',
      ];
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewVisualSignoffReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Preview Visual Signoff',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only visual QA signoff. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Signoff',
    `- Inspector: ${report.signoff.inspector}`,
    `- Require all rendered rows: ${report.signoff.requireAllRenderedRows}`,
    `- Inspected PNGs recorded: ${report.summary.inspectedPngsRecorded}`,
    `- Note: ${report.signoff.note || '-'}`,
    '',
    '## Summary',
    `- Visual rows loaded: ${report.summary.visualRowsLoaded}.`,
    `- Rows signed off: ${report.summary.rowsSignedOff}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Unrecognized inspected PNGs: ${report.summary.unrecognizedInspectedPngs}.`,
    `- postable=false rows: ${report.summary.postableFalseRows}.`,
    `- shouldPost=false rows: ${report.summary.shouldPostFalseRows}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    `- publishDiscord=false rows: ${report.summary.publishDiscordFalseRows}.`,
    `- shouldDispatch=false rows: ${report.summary.shouldDispatchFalseRows}.`,
    `- writesSupabase=false rows: ${report.summary.writesSupabaseFalseRows}.`,
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

export function writeUnifiedPositiveHeldLocalPreviewVisualSignoffReport(
  report: UnifiedPositiveHeldLocalPreviewVisualSignoffReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-visual-signoff-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalPreviewVisualSignoffCli(args = process.argv.slice(2)): Promise<void> {
  const visualReportPath = readFlag(args, '--visual');
  if (!visualReportPath) throw new Error('Missing required --visual path.');
  const inspectedPngPaths = readRepeatedFlag(args, '--inspected-png');
  if (!inspectedPngPaths.length) throw new Error('Missing required --inspected-png path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const visualReport = JSON.parse(fs.readFileSync(visualReportPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewVisualReport;
  const report = await buildUnifiedPositiveHeldLocalPreviewVisualSignoffReport({
    visualReport,
    visualReportPath,
    inspectedPngPaths,
    inspector: readFlag(args, '--inspector') || 'Codex',
    note: readFlag(args, '--note') || '',
    requireAllRenderedRows: readBooleanFlag(args, '--require-all', true),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewVisualSignoffReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewVisualSignoffCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
