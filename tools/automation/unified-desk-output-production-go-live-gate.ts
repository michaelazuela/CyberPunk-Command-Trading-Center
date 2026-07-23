import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeRuntimeJsonAtomic } from '../runtimeJson';
import {
  buildUnifiedDeskOutputProductionScannerSurfaceActivation,
  type UnifiedDeskOutputFinalProductionReadinessChecklistInput,
  type UnifiedDeskOutputProductionScannerSurfaceActivation,
} from '../../src/lib/unifiedDeskOutputProductionScannerSurface';

interface CliOptions {
  finalReadinessChecklistPath: string | null;
  runtimeSurfacePath: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
export const DEFAULT_UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_PATH = path.join(__dirname, '.unified-desk-output-production-scanner-surface.json');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    finalReadinessChecklistPath: readFlag(args, '--final-readiness-checklist'),
    runtimeSurfacePath: readFlag(args, '--runtime-surface') || DEFAULT_UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_PATH,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestReportByType(reportDir: string, reportType: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .find((filePath) => {
      try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function buildMarkdown(report: UnifiedDeskOutputProductionScannerSurfaceActivation, runtimeSurfacePath: string): string {
  return [
    '# Unified Desk Output Production Go-Live Gate',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: production scanner surface activation only. This writes the runtime scanner surface file for one morning, one lunch, and optionally one evening Approved Desk Plan row. It does not post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, change entry/stop/targets, or place/manage orders.',
    '',
    '## Summary',
    `- Scanner visible now: ${report.authority.scannerVisibleNow}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime surface: ${runtimeSurfacePath}.`,
    '',
    '## Rows',
    '| Session | Model | Direction | Proof | Levels |',
    '|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.session} | ${row.model} | ${row.direction} | ${row.proofLine} | ${row.levelLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export async function writeUnifiedDeskOutputProductionGoLiveGate(args: {
  finalReadinessChecklistPath: string;
  finalReadinessChecklist: UnifiedDeskOutputFinalProductionReadinessChecklistInput;
  runtimeSurfacePath: string;
  outDir: string;
  generatedAt?: string;
}): Promise<{ report: UnifiedDeskOutputProductionScannerSurfaceActivation; jsonPath: string; markdownPath: string }> {
  const report = buildUnifiedDeskOutputProductionScannerSurfaceActivation({
    finalReadinessChecklistPath: args.finalReadinessChecklistPath,
    finalReadinessChecklist: args.finalReadinessChecklist,
  }, args.generatedAt);
  fs.mkdirSync(args.outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(args.outDir, `unified-desk-output-production-go-live-gate-${stamp}.json`);
  const markdownPath = path.join(args.outDir, `unified-desk-output-production-go-live-gate-${stamp}.md`);
  const withRuntimePath = {
    ...report,
    runtimeSurfacePath: args.runtimeSurfacePath,
    markdown: buildMarkdown(report, args.runtimeSurfacePath),
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(withRuntimePath, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${withRuntimePath.markdown}\n`);
  if (report.status === 'active') {
    await writeRuntimeJsonAtomic(args.runtimeSurfacePath, withRuntimePath);
  }
  return { report, jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const finalReadinessChecklistPath = path.resolve(options.finalReadinessChecklistPath ||
    latestReportByType(outDir, 'unified_desk_output_final_production_readiness_checklist') ||
    '');
  if (!fs.existsSync(finalReadinessChecklistPath)) throw new Error('Missing Unified Desk Output final production readiness checklist path.');
  const written = await writeUnifiedDeskOutputProductionGoLiveGate({
    finalReadinessChecklistPath,
    finalReadinessChecklist: readJson<UnifiedDeskOutputFinalProductionReadinessChecklistInput>(finalReadinessChecklistPath),
    runtimeSurfacePath: path.resolve(options.runtimeSurfacePath),
    outDir,
  });
  if (options.json) {
    console.log(JSON.stringify({
      jsonPath: written.jsonPath,
      markdownPath: written.markdownPath,
      runtimeSurfacePath: path.resolve(options.runtimeSurfacePath),
      status: written.report.status,
      summary: written.report.summary,
      blockers: written.report.blockers.slice(0, 20),
    }, null, 2));
  } else {
    console.log(buildMarkdown(written.report, path.resolve(options.runtimeSurfacePath)));
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
    console.log(`Runtime surface: ${path.resolve(options.runtimeSurfacePath)}`);
  }
  process.exitCode = written.report.status === 'active' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
