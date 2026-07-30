import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE } from './nt-scanner';
import { buildScannerUnifiedSurfaceRefreshDryRunReport } from './scanner-unified-surface-refresh-dry-run';

interface RefreshArgs {
  writeRuntimeSurface: boolean;
  runtimeSurfacePath: string;
  outDir: string;
}

function readFlagValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : null;
}

function parseArgs(argv = process.argv.slice(2)): RefreshArgs {
  return {
    writeRuntimeSurface: argv.includes('--write-runtime-surface'),
    runtimeSurfacePath: readFlagValue(argv, '--runtime-surface') || UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE,
    outDir: readFlagValue(argv, '--out-dir') || path.join(process.cwd(), 'tools', 'automation', 'diagnostic-reports'),
  };
}

export async function runScannerUnifiedSurfaceRefresh(args: RefreshArgs, generatedAt = new Date().toISOString()): Promise<{
  status: 'pass' | 'blocked';
  mode: 'dry_run' | 'write_runtime_surface';
  diagnosticPath: string;
  runtimeSurfacePath: string;
  backupPath: string | null;
  backupWritten: boolean;
  runtimeSurfaceWritten: boolean;
  summary: Record<string, unknown>;
  blockers: string[];
}> {
  const report = await buildScannerUnifiedSurfaceRefreshDryRunReport(generatedAt);
  await fs.mkdir(args.outDir, { recursive: true });
  const diagnosticPath = path.join(args.outDir, `scanner-unified-surface-refresh-${Date.now()}.json`);
  const blockers = [
    ...report.blockers,
    report.unifiedSurface ? null : 'Unified surface was not built.',
    report.unifiedSurface?.status === 'active' ? null : `Unified surface status is ${report.unifiedSurface?.status || 'missing'}.`,
  ].filter((item): item is string => Boolean(item));
  const canWrite = args.writeRuntimeSurface && blockers.length === 0 && report.unifiedSurface;
  let backupPath: string | null = null;
  let backupWritten = false;
  if (canWrite) {
    await fs.mkdir(path.dirname(args.runtimeSurfacePath), { recursive: true });
    try {
      const previousRuntimeSurface = await fs.readFile(args.runtimeSurfacePath, 'utf8');
      backupPath = `${args.runtimeSurfacePath}.bak-${Date.now()}`;
      await fs.writeFile(backupPath, previousRuntimeSurface);
      backupWritten = true;
    } catch {
      backupPath = null;
      backupWritten = false;
    }
    await fs.writeFile(args.runtimeSurfacePath, `${JSON.stringify(report.unifiedSurface, null, 2)}\n`);
  }
  const payload = {
    reportType: 'scanner_unified_surface_refresh',
    generatedAt,
    status: blockers.length ? 'blocked' as const : 'pass' as const,
    mode: args.writeRuntimeSurface ? 'write_runtime_surface' as const : 'dry_run' as const,
    sourceDryRun: report,
    runtimeSurfacePath: path.relative(process.cwd(), args.runtimeSurfacePath),
    backupPath: backupPath ? path.relative(process.cwd(), backupPath) : null,
    backupWritten,
    runtimeSurfaceWritten: Boolean(canWrite),
    authority: {
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    blockers,
  };
  await fs.writeFile(diagnosticPath, `${JSON.stringify(payload, null, 2)}\n`);
  return {
    status: payload.status,
    mode: payload.mode,
    diagnosticPath,
    runtimeSurfacePath: args.runtimeSurfacePath,
    backupPath,
    backupWritten,
    runtimeSurfaceWritten: payload.runtimeSurfaceWritten,
    summary: report.summary,
    blockers,
  };
}

async function main(): Promise<void> {
  const result = await runScannerUnifiedSurfaceRefresh(parseArgs());
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
