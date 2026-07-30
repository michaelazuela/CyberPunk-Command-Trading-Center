import fs from 'node:fs/promises';
import path from 'node:path';
import {
  FIVE_MODEL_PRODUCTION_SURFACE_FILE,
  UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE,
  fiveModelProductionSurfaceBlockers,
  readFiveModelProductionScannerSurface,
  readUnifiedDeskOutputProductionScannerSurface,
  unifiedDeskOutputProductionSurfaceBlockers,
} from './nt-scanner';

type JsonRecord = Record<string, unknown>;

async function readJsonOrNull(filePath: string): Promise<JsonRecord | null> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as JsonRecord;
  } catch {
    return null;
  }
}

function rowModels(surface: JsonRecord | null): string[] {
  const rows = Array.isArray(surface?.rows) ? surface.rows : [];
  return [...new Set(rows
    .map((row) => row && typeof row === 'object' ? (row as { model?: unknown }).model : null)
    .filter((model): model is string => typeof model === 'string' && model.trim().length > 0))];
}

async function main(): Promise<void> {
  const unifiedRaw = await readJsonOrNull(UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE);
  const fiveModelRaw = await readJsonOrNull(FIVE_MODEL_PRODUCTION_SURFACE_FILE);
  const unifiedSurface = await readUnifiedDeskOutputProductionScannerSurface();
  const fiveModelSurface = await readFiveModelProductionScannerSurface();
  const unifiedBlockers = unifiedDeskOutputProductionSurfaceBlockers(unifiedRaw as any);
  const fiveModelBlockers = fiveModelProductionSurfaceBlockers(fiveModelRaw as any);
  const fiveModelRedundant = Boolean(unifiedSurface) && Boolean(fiveModelRaw) && fiveModelBlockers.length === 0;
  const report = {
    reportType: 'scanner_production_surface_redundancy_report',
    generatedAt: new Date().toISOString(),
    status: fiveModelRedundant ? 'five_model_surface_redundant' : 'five_model_surface_not_redundant',
    files: {
      unifiedDeskOutputProductionSurfaceFile: path.relative(process.cwd(), UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE),
      fiveModelProductionSurfaceFile: path.relative(process.cwd(), FIVE_MODEL_PRODUCTION_SURFACE_FILE),
    },
    summary: {
      unifiedSurfaceReadable: Boolean(unifiedRaw),
      unifiedSurfaceActive: Boolean(unifiedSurface),
      unifiedSurfaceBlockerRows: unifiedBlockers.length,
      fiveModelSurfaceReadable: Boolean(fiveModelRaw),
      fiveModelSurfaceActive: Boolean(fiveModelSurface),
      fiveModelSurfaceBlockerRows: fiveModelBlockers.length,
      fiveModelSurfaceRedundant: fiveModelRedundant,
    },
    models: {
      unifiedSurfaceModels: rowModels(unifiedRaw),
      fiveModelSurfaceModels: rowModels(fiveModelRaw),
    },
    blockers: {
      unifiedSurface: unifiedBlockers,
      fiveModelSurface: fiveModelBlockers,
    },
    recommendation: fiveModelRedundant
      ? 'The five-model production surface can be considered for removal in a separate cleanup branch after live-flow parity replay passes.'
      : 'Do not remove the five-model production surface branch yet. It is still the active scanner surface fallback until Unified Desk Output validates cleanly.',
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
