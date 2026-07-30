import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputProductionScannerSurfaceActivation,
  type UnifiedDeskOutputFinalProductionReadinessChecklistInput,
  type UnifiedDeskOutputProductionScannerSurfaceActivation,
} from '../../src/lib/unifiedDeskOutputProductionScannerSurface';
import { SetupType } from '../../src/types';
import {
  FIVE_MODEL_PRODUCTION_SURFACE_FILE,
  readFiveModelProductionScannerSurface,
} from './nt-scanner';

type SessionName = 'morning' | 'lunch' | 'evening';
type Direction = 'LONG' | 'SHORT';

interface SourceSurfaceRow {
  cardId?: string;
  date?: string;
  session?: string;
  state?: string;
  model?: string;
  direction?: string;
  levelLine?: string;
  proofLine?: string;
}

interface RefreshDryRunReport {
  reportType: 'scanner_unified_surface_refresh_dry_run';
  generatedAt: string;
  status: 'pass' | 'blocked';
  source: {
    fiveModelProductionSurfaceFile: string;
  };
  authority: {
    readOnly: true;
    readsSavedArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
    writesRuntimeSurface: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    automatedOrders: false;
  };
  summary: {
    sourceRows: number;
    sourceApprovedRows: number;
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    convertedRows: number;
    unifiedSurfaceStatus: UnifiedDeskOutputProductionScannerSurfaceActivation['status'] | 'not_built';
    unifiedSurfaceBlockerRows: number;
  };
  selectedCandidates: UnifiedDeskOutputFinalProductionReadinessChecklistInput['selectedCandidates'];
  unifiedSurface: UnifiedDeskOutputProductionScannerSurfaceActivation | null;
  blockers: string[];
}

const DISPLAY_NAME_TO_SETUP_TYPE: Record<string, SetupType> = {
  'Liquidity Raid Reclaim Reversal': SetupType.LiquidityRaidReclaimReversal,
  'Raid Failure Displacement Reversal': SetupType.RaidFailureDisplacementReversal,
  'Drive Pullback Continuation': SetupType.DrivePullbackContinuation,
  'Intraday MSS Micro Continuation': SetupType.IntradayMssMicroContinuation,
  'Structure Shift Continuation': SetupType.StructureShiftContinuation,
  'Failed Breakout Reversal': SetupType.FailedBreakoutReversal,
};

function numberFromLevel(line: string, label: string): number | null {
  const match = line.match(new RegExp(`${label}\\s+(-?\\d+(?:\\.\\d+)?)`, 'i'));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function proofTime(date: string, line: string): string | null {
  const match = line.match(/Completed 5M proof:\s*(\d{2}):(\d{2})\s*ET/i);
  if (!match) return null;
  return `${date}T${match[1]}:${match[2]}:00.0000000`;
}

function convertRow(row: SourceSurfaceRow): UnifiedDeskOutputFinalProductionReadinessChecklistInput['selectedCandidates'][number] | null {
  const model = row.model ? DISPLAY_NAME_TO_SETUP_TYPE[row.model] : null;
  const date = row.date || null;
  const levelLine = row.levelLine || '';
  const proofLine = row.proofLine || '';
  const entry = numberFromLevel(levelLine, 'Entry');
  const stop = numberFromLevel(levelLine, 'Stop');
  const target1 = numberFromLevel(levelLine, 'T1');
  const target2 = numberFromLevel(levelLine, 'T2');
  const parsedProofTime = date ? proofTime(date, proofLine) : null;
  if (
    !model ||
    !date ||
    (row.session !== 'morning' && row.session !== 'lunch' && row.session !== 'evening') ||
    (row.direction !== 'LONG' && row.direction !== 'SHORT') ||
    entry === null ||
    stop === null ||
    target1 === null ||
    target2 === null ||
    !parsedProofTime
  ) {
    return null;
  }
  return {
    cardId: row.cardId ? `unified-refresh-dry-run|${row.cardId}` : undefined,
    date,
    session: row.session,
    state: 'APPROVED_DESK_PLAN',
    model,
    direction: row.direction,
    proofTime: parsedProofTime,
    entry,
    stop,
    target1,
    target2,
    riskPoints: Math.abs(entry - stop),
  };
}

function sessionRank(session: SessionName): number {
  return session === 'morning' ? 0 : session === 'lunch' ? 1 : 2;
}

function selectOnePerSession(rows: SourceSurfaceRow[]): SourceSurfaceRow[] {
  const approved = rows
    .filter((row) => row.state === 'APPROVED_DESK_PLAN')
    .sort((left, right) => {
      const leftSession = left.session as SessionName;
      const rightSession = right.session as SessionName;
      return sessionRank(leftSession) - sessionRank(rightSession) ||
        String(left.proofLine || '').localeCompare(String(right.proofLine || ''));
    });
  const selected: SourceSurfaceRow[] = [];
  for (const session of ['morning', 'lunch', 'evening'] as const) {
    const match = approved.find((row) => row.session === session);
    if (match) selected.push(match);
  }
  return selected.filter((row) => row.session === 'morning' || row.session === 'lunch' || row.session === 'evening').slice(0, 3);
}

export async function buildScannerUnifiedSurfaceRefreshDryRunReport(generatedAt = new Date().toISOString()): Promise<RefreshDryRunReport> {
  const sourceSurface = await readFiveModelProductionScannerSurface();
  const sourceRows = Array.isArray(sourceSurface?.rows) ? sourceSurface.rows as SourceSurfaceRow[] : [];
  const selectedSourceRows = selectOnePerSession(sourceRows);
  const selectedCandidates = selectedSourceRows
    .map(convertRow)
    .filter((candidate): candidate is UnifiedDeskOutputFinalProductionReadinessChecklistInput['selectedCandidates'][number] => Boolean(candidate));
  const sourceApprovedRows = sourceRows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length;
  const baseBlockers = [
    sourceSurface ? null : 'Five-model production surface is not active.',
    selectedCandidates.some((candidate) => candidate.session === 'morning') ? null : 'No convertible approved morning row found.',
    selectedCandidates.some((candidate) => candidate.session === 'lunch') ? null : 'No convertible approved lunch row found.',
  ].filter((item): item is string => Boolean(item));
  const checklist: UnifiedDeskOutputFinalProductionReadinessChecklistInput = {
    reportType: 'unified_desk_output_final_production_readiness_checklist',
    status: baseBlockers.length ? 'blocked' : 'pass',
    summary: {
      selectedRows: selectedCandidates.length,
      morningRows: selectedCandidates.filter((candidate) => candidate.session === 'morning').length,
      lunchRows: selectedCandidates.filter((candidate) => candidate.session === 'lunch').length,
      eveningRows: selectedCandidates.filter((candidate) => candidate.session === 'evening').length,
      approvedDeskPlanRows: selectedCandidates.length,
      browserRenderedRows: selectedCandidates.length,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      runtimeGateEnabled: false,
      productionGoLiveApproved: false,
      blockedRows: baseBlockers.length,
      recommendation: baseBlockers.length ? 'hold_for_final_readiness_fix' : 'ready_for_explicit_production_go_live_approval',
    },
    selectedCandidates,
    blockers: baseBlockers,
  };
  const unifiedSurface = baseBlockers.length
    ? null
    : buildUnifiedDeskOutputProductionScannerSurfaceActivation({
      finalReadinessChecklistPath: FIVE_MODEL_PRODUCTION_SURFACE_FILE,
      finalReadinessChecklist: checklist,
    }, generatedAt);
  const surfaceBlockers = unifiedSurface?.blockers || [];
  const blockers = [...baseBlockers, ...surfaceBlockers];
  return {
    reportType: 'scanner_unified_surface_refresh_dry_run',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    source: {
      fiveModelProductionSurfaceFile: path.relative(process.cwd(), FIVE_MODEL_PRODUCTION_SURFACE_FILE),
    },
    authority: {
      readOnly: true,
      readsSavedArtifactsOnly: true,
      writesDiagnosticArtifactsOnly: true,
      writesRuntimeSurface: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      sourceApprovedRows,
      selectedRows: selectedCandidates.length,
      morningRows: selectedCandidates.filter((candidate) => candidate.session === 'morning').length,
      lunchRows: selectedCandidates.filter((candidate) => candidate.session === 'lunch').length,
      eveningRows: selectedCandidates.filter((candidate) => candidate.session === 'evening').length,
      convertedRows: selectedCandidates.length,
      unifiedSurfaceStatus: unifiedSurface?.status || 'not_built',
      unifiedSurfaceBlockerRows: surfaceBlockers.length,
    },
    selectedCandidates,
    unifiedSurface,
    blockers,
  };
}

async function main(): Promise<void> {
  const report = await buildScannerUnifiedSurfaceRefreshDryRunReport();
  const outDir = path.join(process.cwd(), 'tools', 'automation', 'diagnostic-reports');
  await fs.mkdir(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `scanner-unified-surface-refresh-dry-run-${Date.now()}.json`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ jsonPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
