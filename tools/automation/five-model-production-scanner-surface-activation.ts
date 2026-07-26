import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeRuntimeJsonAtomic } from '../runtimeJson';
import {
  buildFiveModelProductionScannerSurfaceActivation,
  type FiveModelProductionScannerSurfaceActivation,
  type FiveModelScannerSurfaceSmokeInput,
} from '../../src/lib/fiveModelProductionScannerSurface';

interface CliOptions {
  scannerSurfaceSmokePath: string | null;
  runtimeSurfacePath: string;
  outDir: string;
  approve: boolean;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
export const DEFAULT_FIVE_MODEL_PRODUCTION_SURFACE_PATH = path.join(__dirname, '.five-model-production-scanner-surface.json');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    scannerSurfaceSmokePath: readFlag(args, '--scanner-surface-smoke'),
    runtimeSurfacePath: readFlag(args, '--runtime-surface') || DEFAULT_FIVE_MODEL_PRODUCTION_SURFACE_PATH,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    approve: args.includes('--approve-five-model-production-surface'),
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestReportByType(reportDir: string, reportType: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .find((filePath) => {
      try {
        return readJson<Record<string, unknown>>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function buildMarkdown(report: FiveModelProductionScannerSurfaceActivation, runtimeSurfacePath: string): string {
  return [
    '# Five Model Production Scanner Surface Activation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local runtime scanner surface activation only. This writes the five-model scanner surface file only with explicit approval. It does not post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, change entry/stop/targets, or place/manage orders.',
    '',
    '## Summary',
    `- Scanner visible now: ${report.authority.scannerVisibleNow}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime surface: ${runtimeSurfacePath}.`,
    '',
    '## Rows',
    '| Date | Session | State | Model | Direction | Levels |',
    '|---|---|---|---|---|---|',
    ...report.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export async function writeFiveModelProductionScannerSurfaceActivation(args: {
  scannerSurfaceSmokePath: string;
  scannerSurfaceSmoke: FiveModelScannerSurfaceSmokeInput;
  runtimeSurfacePath: string;
  outDir: string;
  explicitProductionApproval: boolean;
  generatedAt?: string;
}): Promise<{ report: FiveModelProductionScannerSurfaceActivation; jsonPath: string; markdownPath: string }> {
  const report = buildFiveModelProductionScannerSurfaceActivation({
    explicitProductionApproval: args.explicitProductionApproval,
    scannerSurfaceSmokePath: args.scannerSurfaceSmokePath,
    scannerSurfaceSmoke: args.scannerSurfaceSmoke,
  }, args.generatedAt);
  fs.mkdirSync(args.outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(args.outDir, `five-model-production-scanner-surface-activation-${stamp}.json`);
  const markdownPath = path.join(args.outDir, `five-model-production-scanner-surface-activation-${stamp}.md`);
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
  const scannerSurfaceSmokePath = path.resolve(options.scannerSurfaceSmokePath ||
    latestReportByType(outDir, 'five_model_scanner_surface_smoke') ||
    '');
  if (!fs.existsSync(scannerSurfaceSmokePath)) throw new Error('Missing five-model scanner surface smoke path.');
  const runtimeSurfacePath = path.resolve(options.runtimeSurfacePath);
  const written = await writeFiveModelProductionScannerSurfaceActivation({
    scannerSurfaceSmokePath,
    scannerSurfaceSmoke: readJson<FiveModelScannerSurfaceSmokeInput>(scannerSurfaceSmokePath),
    runtimeSurfacePath,
    outDir,
    explicitProductionApproval: options.approve,
  });
  if (options.json) {
    console.log(JSON.stringify({
      jsonPath: written.jsonPath,
      markdownPath: written.markdownPath,
      runtimeSurfacePath,
      status: written.report.status,
      summary: written.report.summary,
      blockers: written.report.blockers.slice(0, 20),
    }, null, 2));
  } else {
    console.log(buildMarkdown(written.report, runtimeSurfacePath));
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
    console.log(`Runtime surface: ${runtimeSurfacePath}`);
  }
  process.exitCode = written.report.status === 'active' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
