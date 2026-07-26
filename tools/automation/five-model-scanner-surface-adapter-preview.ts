import fs from 'node:fs';
import path from 'node:path';
import {
  buildUnifiedDeskOutputScannerVisibilityModel,
  type UnifiedDeskOutputVisibilityCandidate,
  type UnifiedDeskOutputVisibilityReadinessReport,
} from '../../src/lib/unifiedDeskOutputScannerVisibilityAdapter';
import { buildUnifiedDeskOutputScannerSurfaceModel } from '../../src/lib/unifiedDeskOutputScannerSurface';

type Direction = 'LONG' | 'SHORT';

interface Args {
  geometryJson: string;
  localPreview: boolean;
  json: boolean;
}

interface GeometryVariant {
  name: string;
  entry: number;
  stop: number;
  riskPoints: number | null;
  riskClean: boolean;
  target1: number | null;
  target2: number | null;
}

interface GeometryRow {
  modelId: string;
  displayName: string;
  laneRole: 'primary_candidate_lane' | 'secondary_candidate_lane';
  date: string;
  session: 'morning' | 'lunch';
  direction: Direction;
  proofTime: string | null;
  pdfMatchedDollars: number;
  immediateVariants: GeometryVariant[];
  retestVariants: GeometryVariant[];
  immediateRiskClean: boolean;
  retestRiskClean: boolean;
}

interface GeometryReport {
  rows?: GeometryRow[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const geometryJson = readFlag(argv, '--geometry-json');
  if (!geometryJson) throw new Error('--geometry-json is required');
  return {
    geometryJson,
    localPreview: argv.includes('--local-preview'),
    json: argv.includes('--json'),
  };
}

function readGeometry(filePath: string): GeometryReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as GeometryReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function cleanVariant(variants: GeometryVariant[]): GeometryVariant | null {
  return variants.find((variant) =>
    variant.riskClean &&
    typeof variant.riskPoints === 'number' &&
    typeof variant.target1 === 'number' &&
    typeof variant.target2 === 'number'
  ) || null;
}

function candidateFromRow(row: GeometryRow): UnifiedDeskOutputVisibilityCandidate | null {
  if (!row.proofTime) return null;
  const immediate = cleanVariant(row.immediateVariants);
  const retest = cleanVariant(row.retestVariants);
  const variant = immediate || retest;
  if (!variant || variant.riskPoints === null || variant.target1 === null || variant.target2 === null) return null;
  return {
    cardId: `five-model|${row.date}|${row.session}|${row.modelId}|${row.direction}|${row.proofTime}|${variant.name}`,
    date: row.date,
    session: row.session,
    state: immediate ? 'APPROVED_DESK_PLAN' : 'FORMING_DESK_READ',
    model: row.displayName,
    direction: row.direction,
    proofTime: row.proofTime,
    entry: variant.entry,
    stop: variant.stop,
    target1: variant.target1,
    target2: variant.target2,
    riskPoints: variant.riskPoints,
    scannerVisibleIfExplicitGateApproved: true,
    discordEligibleIfSeparatelyApproved: true,
    supabaseEligibleIfSeparatelyApproved: true,
    canExecuteRemainsExternalGate: true,
  };
}

function buildReadinessReport(candidates: UnifiedDeskOutputVisibilityCandidate[]): UnifiedDeskOutputVisibilityReadinessReport {
  return {
    reportType: 'unified_desk_output_live_gate_readiness_audit',
    status: 'pass',
    summary: {
      discordPostNowRows: 0,
      supabaseWriteNowRows: 0,
      liveBridgeReadNowRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      incompleteVisiblePlanRows: 0,
      wordingViolationRows: 0,
      blockedRows: 0,
    },
    candidates,
    blockers: [],
  };
}

function uniqueCandidates(candidates: UnifiedDeskOutputVisibilityCandidate[]): UnifiedDeskOutputVisibilityCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.cardId)) return false;
    seen.add(candidate.cardId);
    return true;
  });
}

function markdown(report: {
  status: 'pass' | 'blocked';
  summary: {
    localPreviewRequested: boolean;
    sourceGeometryRows: number;
    visibilityCandidates: number;
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    immediateRiskCleanRows: number;
    retestOnlyRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
  };
  surface: ReturnType<typeof buildUnifiedDeskOutputScannerSurfaceModel>;
  recommendation: string;
  blockers: string[];
}): string {
  return [
    '# Five Model Scanner Surface Adapter Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local scanner-surface adapter preview only. No setup registry change, scanner wiring, Discord post, Supabase read/write, bridge read, canExecute change, execution approval, or automated orders.',
    '',
    '## Summary',
    `- Local preview requested: ${report.summary.localPreviewRequested}.`,
    `- Source geometry rows: ${report.summary.sourceGeometryRows}.`,
    `- Visibility candidates: ${report.summary.visibilityCandidates}.`,
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Immediate risk-clean rows: ${report.summary.immediateRiskCleanRows}.`,
    `- Retest-only rows: ${report.summary.retestOnlyRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Recommendation: ${report.recommendation}.`,
    '',
    '## Sample Rows',
    '| Date | Session | State | Model | Direction | Level Line | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.surface.rows.slice(0, 30).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelScannerSurfaceAdapterPreview(args: Args, generatedAt = new Date().toISOString()) {
  const geometry = readGeometry(args.geometryJson);
  const geometryRows = geometry.rows || [];
  const candidates = uniqueCandidates(args.localPreview
    ? geometryRows.map(candidateFromRow).filter((candidate): candidate is UnifiedDeskOutputVisibilityCandidate => Boolean(candidate))
    : []);
  const readiness = buildReadinessReport(candidates);
  const visibility = buildUnifiedDeskOutputScannerVisibilityModel({
    enabled: args.localPreview,
    readinessReport: readiness,
  });
  const surface = buildUnifiedDeskOutputScannerSurfaceModel(visibility);
  const blockers = [
    args.localPreview ? null : 'Local preview flag is required before surface rows are rendered.',
    visibility.status === 'ready' || !args.localPreview ? null : `Visibility model status is ${visibility.status}.`,
    surface.status === 'ready' || !args.localPreview ? null : `Surface model status is ${surface.status}.`,
    surface.summary.discordPostRows === 0 ? null : 'Surface contains Discord-post rows.',
    surface.summary.supabaseWriteRows === 0 ? null : 'Surface contains Supabase-write rows.',
    surface.summary.liveBridgeReadRows === 0 ? null : 'Surface contains live bridge read rows.',
    surface.summary.canExecuteTrueRows === 0 ? null : 'Surface contains canExecute=true rows.',
    ...surface.blockers,
  ].filter((item): item is string => Boolean(item));
  const immediateRows = geometryRows.filter((row) => row.immediateRiskClean);
  const retestOnlyRows = geometryRows.filter((row) => !row.immediateRiskClean && row.retestRiskClean);
  const report = {
    reportType: 'five_model_scanner_surface_adapter_preview',
    generatedAt,
    status: blockers.length && args.localPreview ? 'blocked' as const : 'pass' as const,
    authority: {
      localGeometryArtifactOnly: true,
      explicitLocalPreviewRequired: true,
      localPreviewRequested: args.localPreview,
      rendersScannerSurfaceOnly: true,
      noSetupRegistryChange: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
      noCanExecuteChange: true,
      noAutomatedOrders: true,
    },
    source: {
      geometryJson: args.geometryJson,
    },
    summary: {
      localPreviewRequested: args.localPreview,
      sourceGeometryRows: geometryRows.length,
      visibilityCandidates: candidates.length,
      renderedRows: surface.summary.rows,
      approvedDeskPlanRows: surface.summary.approvedDeskPlans,
      formingDeskReadRows: surface.summary.formingDeskReads,
      immediateRiskCleanRows: immediateRows.length,
      retestOnlyRows: retestOnlyRows.length,
      discordPostRows: surface.summary.discordPostRows,
      supabaseWriteRows: surface.summary.supabaseWriteRows,
      liveBridgeReadRows: surface.summary.liveBridgeReadRows,
      canExecuteTrueRows: surface.summary.canExecuteTrueRows,
      wordingViolationRows: surface.summary.wordingViolationRows,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      executionApprovalEligibleRows: 0,
      blockedRows: args.localPreview ? blockers.length : 0,
    },
    visibility,
    surface,
    blockers: args.localPreview ? blockers : [],
    recommendation: args.localPreview && !blockers.length
      ? 'ready_for_hidden_local_preview_import_payload'
      : 'hold_surface_adapter_until_explicit_local_preview_passes',
  };
  return {
    ...report,
    markdown: markdown(report),
  };
}

function writeReport(report: ReturnType<typeof buildFiveModelScannerSurfaceAdapterPreview>): { jsonPath: string; markdownPath: string } {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-scanner-surface-adapter-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-scanner-surface-adapter-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'five-model-scanner-surface-adapter-preview.ts') {
  const args = parseArgs();
  const report = buildFiveModelScannerSurfaceAdapterPreview(args);
  const written = writeReport(report);
  console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, recommendation: report.recommendation, blockers: report.blockers.slice(0, 20) }, null, 2));
}
