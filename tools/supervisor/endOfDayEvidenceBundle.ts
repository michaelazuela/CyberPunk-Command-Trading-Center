import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLiveSignoffManifest,
  parseLiveSignoffManifestArgs,
  type LiveSignoffManifest,
  type LiveSignoffManifestOptions,
} from './liveSignoffManifest';

export interface EndOfDayEvidenceBundleOptions extends LiveSignoffManifestOptions {
  bundleDir: string;
  includeSupervisorStatus: boolean;
}

export interface EndOfDayEvidenceBundle {
  reportType: 'supervisor_end_of_day_evidence_bundle';
  phase: 'phase_10_end_of_day_evidence_bundle';
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
  tradeDate: string;
  instrument: string;
  session: LiveSignoffManifestOptions['session'];
  status: 'ready' | 'blocked' | 'unavailable';
  signoffStatus: LiveSignoffManifest['status'];
  phase6Status: LiveSignoffManifest['phase6Status'];
  bundleDir: string;
  files: {
    signoffManifest: string | null;
    scannerDecisionTape: string | null;
    phase6ObserverJson: string | null;
    supervisorStatus: string | null;
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

function authority(): EndOfDayEvidenceBundle['authority'] {
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

export function parseEndOfDayEvidenceBundleArgs(args = process.argv.slice(2)): EndOfDayEvidenceBundleOptions {
  const signoffOptions = parseLiveSignoffManifestArgs(args);
  const bundleRoot = readFlag(args, '--bundle-dir') || DEFAULT_BUNDLE_ROOT;
  return {
    ...signoffOptions,
    bundleDir: path.join(bundleRoot, signoffOptions.tradeDate, signoffOptions.instrument, signoffOptions.session),
    includeSupervisorStatus: !hasFlag(args, '--skip-supervisor-status'),
  };
}

async function copyIfExists(source: string | null, destinationDir: string): Promise<string | null> {
  if (!source) return null;
  try {
    await fs.access(source);
  } catch {
    return null;
  }
  const destination = path.join(destinationDir, path.basename(source));
  await fs.copyFile(source, destination);
  return destination;
}

async function writeSupervisorStatusSnapshot(destinationDir: string): Promise<string | null> {
  try {
    const { loadSupervisorConfig } = await import('./config');
    const { getSupervisorState } = await import('./processManager');
    const { buildHealthReport } = await import('./health');
    const { buildDeliveryVisibilityReport } = await import('./deliveryVisibility');
    const { buildSupervisorStatus } = await import('./status');
    const configResult = loadSupervisorConfig();
    const state = getSupervisorState(configResult.config);
    const health = await buildHealthReport(configResult.config, state);
    const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
    const status = buildSupervisorStatus(configResult, state, health, delivery);
    const snapshotPath = path.join(destinationDir, 'supervisor-status.json');
    await fs.writeFile(snapshotPath, JSON.stringify(status, null, 2));
    return snapshotPath;
  } catch {
    return null;
  }
}

export async function buildEndOfDayEvidenceBundle(
  options: EndOfDayEvidenceBundleOptions,
): Promise<EndOfDayEvidenceBundle> {
  await fs.mkdir(options.bundleDir, { recursive: true });
  const signoffManifest = await buildLiveSignoffManifest(options);
  const scannerDecisionTapePath = path.join(
    options.auditDir,
    `scanner-decision-tape-${options.tradeDate}-${options.instrument}-${options.session}.json`,
  );
  const copiedSignoffManifest = await copyIfExists(signoffManifest.archivedPaths.manifestJsonPath, options.bundleDir);
  const copiedTape = await copyIfExists(scannerDecisionTapePath, options.bundleDir);
  const copiedObserver = await copyIfExists(signoffManifest.archivedPaths.supervisorPhase6ObserverJsonPath, options.bundleDir);
  const supervisorStatus = options.includeSupervisorStatus ? await writeSupervisorStatusSnapshot(options.bundleDir) : null;
  const failures = [...signoffManifest.failures];
  if (!copiedSignoffManifest) failures.push('Signoff manifest could not be copied into the bundle.');
  if (!copiedTape) failures.push('Scanner decision tape was not found for the requested date/instrument/session.');
  if (!copiedObserver) failures.push('Phase 6 observer JSON was not found for the requested signoff.');
  if (options.includeSupervisorStatus && !supervisorStatus) failures.push('Supervisor status snapshot could not be written.');
  const status: EndOfDayEvidenceBundle['status'] =
    signoffManifest.status === 'unavailable' ? 'unavailable' : failures.length === 0 ? signoffManifest.status : 'blocked';
  const bundle: EndOfDayEvidenceBundle = {
    reportType: 'supervisor_end_of_day_evidence_bundle',
    phase: 'phase_10_end_of_day_evidence_bundle',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    status,
    signoffStatus: signoffManifest.status,
    phase6Status: signoffManifest.phase6Status,
    bundleDir: options.bundleDir,
    files: {
      signoffManifest: copiedSignoffManifest,
      scannerDecisionTape: copiedTape,
      phase6ObserverJson: copiedObserver,
      supervisorStatus,
    },
    failures,
    bottomLine:
      status === 'ready'
        ? `Phase 10 evidence bundle ready: archived signoff manifest, scanner tape, Phase 6 observer report, and supervisor status under ${options.bundleDir}.`
        : `Phase 10 evidence bundle ${status}: ${failures.join(' ')}`,
  };
  await fs.writeFile(path.join(options.bundleDir, 'manifest.json'), JSON.stringify(bundle, null, 2));
  return bundle;
}

async function main() {
  const options = parseEndOfDayEvidenceBundleArgs();
  const bundle = await buildEndOfDayEvidenceBundle(options);
  if (options.json) console.log(JSON.stringify(bundle, null, 2));
  else console.log(bundle.bottomLine);
  if (bundle.status !== 'ready') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
