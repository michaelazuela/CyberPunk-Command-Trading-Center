import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EndOfDayEvidenceBundle } from './endOfDayEvidenceBundle';

type SessionName = EndOfDayEvidenceBundle['session'];

export interface EndOfDayEvidenceSummaryOptions {
  bundleRoot: string;
  tradeDate?: string | null;
  instrument?: string | null;
  session?: SessionName | null;
  json: boolean;
}

export interface EndOfDayEvidenceSummary {
  reportType: 'supervisor_end_of_day_evidence_summary';
  phase: 'phase_11_operator_evidence_summary';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    startsChildProcesses: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
  };
  status: 'ready' | 'blocked' | 'unavailable' | 'missing';
  tradeDate: string | null;
  instrument: string | null;
  session: SessionName | null;
  bundleDir: string | null;
  manifestPath: string | null;
  signoffStatus: EndOfDayEvidenceBundle['signoffStatus'] | null;
  phase6Status: EndOfDayEvidenceBundle['phase6Status'] | null;
  filesPresent: {
    signoffManifest: boolean;
    scannerDecisionTape: boolean;
    phase6ObserverJson: boolean;
    supervisorStatus: boolean;
  };
  failures: string[];
  bottomLine: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_BUNDLE_ROOT = path.join(REPO_ROOT, 'logs', 'supervisor', 'end-of-day-evidence');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function authority(): EndOfDayEvidenceSummary['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    startsChildProcesses: false,
    changesScannerState: false,
    changesTradingLogic: false,
    changesCanExecute: false,
  };
}

export function parseEndOfDayEvidenceSummaryArgs(args = process.argv.slice(2)): EndOfDayEvidenceSummaryOptions {
  return {
    bundleRoot: readFlag(args, '--bundle-dir') || DEFAULT_BUNDLE_ROOT,
    tradeDate: readFlag(args, '--trade-date'),
    instrument: readFlag(args, '--instrument'),
    session: readFlag(args, '--session') as SessionName | null,
    json: hasFlag(args, '--json'),
  };
}

async function fileExists(filePath: string | null | undefined): Promise<boolean> {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findLatestManifest(root: string): Promise<string | null> {
  const candidates: Array<{ filePath: string; mtimeMs: number }> = [];

  async function walk(dir: string): Promise<void> {
    let entries: Array<import('node:fs').Dirent>;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
      } else if (entry.isFile() && entry.name === 'manifest.json') {
        const stat = await fs.stat(filePath);
        candidates.push({ filePath, mtimeMs: stat.mtimeMs });
      }
    }
  }

  await walk(root);
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.filePath ?? null;
}

function requestedManifestPath(options: EndOfDayEvidenceSummaryOptions): string | null {
  if (!options.tradeDate || !options.instrument || !options.session) return null;
  return path.join(options.bundleRoot, options.tradeDate, options.instrument, options.session, 'manifest.json');
}

export async function buildEndOfDayEvidenceSummary(
  options: EndOfDayEvidenceSummaryOptions,
): Promise<EndOfDayEvidenceSummary> {
  const manifestPath = requestedManifestPath(options) ?? await findLatestManifest(options.bundleRoot);
  if (!manifestPath) {
    return {
      reportType: 'supervisor_end_of_day_evidence_summary',
      phase: 'phase_11_operator_evidence_summary',
      generatedAt: new Date().toISOString(),
      authority: authority(),
      status: 'missing',
      tradeDate: options.tradeDate ?? null,
      instrument: options.instrument ?? null,
      session: options.session ?? null,
      bundleDir: null,
      manifestPath: null,
      signoffStatus: null,
      phase6Status: null,
      filesPresent: {
        signoffManifest: false,
        scannerDecisionTape: false,
        phase6ObserverJson: false,
        supervisorStatus: false,
      },
      failures: ['No end-of-day evidence bundle manifest was found.'],
      bottomLine: 'Evidence bundle missing: no end-of-day evidence bundle manifest was found.',
    };
  }

  let bundle: EndOfDayEvidenceBundle;
  try {
    bundle = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as EndOfDayEvidenceBundle;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      reportType: 'supervisor_end_of_day_evidence_summary',
      phase: 'phase_11_operator_evidence_summary',
      generatedAt: new Date().toISOString(),
      authority: authority(),
      status: 'unavailable',
      tradeDate: options.tradeDate ?? null,
      instrument: options.instrument ?? null,
      session: options.session ?? null,
      bundleDir: path.dirname(manifestPath),
      manifestPath,
      signoffStatus: null,
      phase6Status: null,
      filesPresent: {
        signoffManifest: false,
        scannerDecisionTape: false,
        phase6ObserverJson: false,
        supervisorStatus: false,
      },
      failures: [`Bundle manifest could not be read: ${reason}`],
      bottomLine: `Evidence bundle unavailable: ${reason}`,
    };
  }

  const filesPresent = {
    signoffManifest: await fileExists(bundle.files.signoffManifest),
    scannerDecisionTape: await fileExists(bundle.files.scannerDecisionTape),
    phase6ObserverJson: await fileExists(bundle.files.phase6ObserverJson),
    supervisorStatus: await fileExists(bundle.files.supervisorStatus),
  };
  const missingFiles = Object.entries(filesPresent)
    .filter(([, present]) => !present)
    .map(([name]) => `${name} missing`);
  const failures = [...bundle.failures, ...missingFiles];
  const status: EndOfDayEvidenceSummary['status'] =
    bundle.status === 'ready' && failures.length === 0 ? 'ready' : bundle.status === 'unavailable' ? 'unavailable' : 'blocked';

  return {
    reportType: 'supervisor_end_of_day_evidence_summary',
    phase: 'phase_11_operator_evidence_summary',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    status,
    tradeDate: bundle.tradeDate,
    instrument: bundle.instrument,
    session: bundle.session,
    bundleDir: bundle.bundleDir,
    manifestPath,
    signoffStatus: bundle.signoffStatus,
    phase6Status: bundle.phase6Status,
    filesPresent,
    failures,
    bottomLine:
      status === 'ready'
        ? `Evidence bundle ready: ${bundle.tradeDate} ${bundle.instrument} ${bundle.session}; signoff=${bundle.signoffStatus}; phase6=${bundle.phase6Status}.`
        : `Evidence bundle ${status}: ${failures.join(' ')}`,
  };
}

async function main() {
  const options = parseEndOfDayEvidenceSummaryArgs();
  const summary = await buildEndOfDayEvidenceSummary(options);
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(summary.bottomLine);
  if (summary.status !== 'ready') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
