import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSupervisorPhase6SignoffStatus,
  parseSupervisorPhase6SignoffArgs,
  type SupervisorPhase6SignoffStatus,
} from './phase6Signoff';

type SessionName = SupervisorPhase6SignoffStatus['session'];

export interface LiveSignoffManifestOptions {
  tradeDate: string;
  instrument: string;
  session: SessionName;
  auditDir: string;
  outDir: string;
  manifestDir: string;
  sinceRecordedAt?: string | null;
  minRoutingEvents: number;
  minPhase5Events: number;
  json: boolean;
}

export interface LiveSignoffManifest {
  reportType: 'supervisor_live_signoff_manifest';
  phase: 'phase_9_signoff_manifest_archive';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    startsChildProcesses: false;
  };
  tradeDate: string;
  instrument: string;
  session: SessionName;
  status: SupervisorPhase6SignoffStatus['status'];
  phase6Status: SupervisorPhase6SignoffStatus['phase6Status'];
  failures: string[];
  summary: SupervisorPhase6SignoffStatus['summary'];
  evidence: {
    supervisorSignoffGeneratedAt: string;
    observerJsonPath: string | null;
    latestCompleted5m: string | null;
    latestDeskPrimary: string | null;
    latestLineInSand: number | null;
    discordSignoffStatus: string | null;
    phase4EnforcementFailures: number | null;
    htfFvgPhase5ContractFailures: number | null;
    htfFvgReactionRoutingEvents: number | null;
    htfFvgPhase5ContractEvents: number | null;
  };
  archivedPaths: {
    manifestJsonPath: string;
    supervisorPhase6ObserverJsonPath: string | null;
  };
  bottomLine: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_MANIFEST_DIR = path.join(REPO_ROOT, 'logs', 'supervisor', 'live-signoff-manifests');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

export function parseLiveSignoffManifestArgs(args = process.argv.slice(2)): LiveSignoffManifestOptions {
  const phase6Options = parseSupervisorPhase6SignoffArgs(args);
  return {
    ...phase6Options,
    manifestDir: readFlag(args, '--manifest-dir') || DEFAULT_MANIFEST_DIR,
  };
}

function authority(): LiveSignoffManifest['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    changesScannerState: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    startsChildProcesses: false,
  };
}

function manifestFileName(args: Pick<LiveSignoffManifestOptions, 'tradeDate' | 'instrument' | 'session'>): string {
  return `live-signoff-manifest-${args.tradeDate}-${args.instrument}-${args.session}.json`;
}

export async function buildLiveSignoffManifest(options: LiveSignoffManifestOptions): Promise<LiveSignoffManifest> {
  const status = await buildSupervisorPhase6SignoffStatus(options);
  const sessionDir = path.join(options.manifestDir, options.tradeDate);
  await fs.mkdir(sessionDir, { recursive: true });
  const manifestJsonPath = path.join(sessionDir, manifestFileName(options));
  const summary = status.summary;
  const manifest: LiveSignoffManifest = {
    reportType: 'supervisor_live_signoff_manifest',
    phase: 'phase_9_signoff_manifest_archive',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    tradeDate: status.tradeDate,
    instrument: status.instrument,
    session: status.session,
    status: status.status,
    phase6Status: status.phase6Status,
    failures: status.failures,
    summary,
    evidence: {
      supervisorSignoffGeneratedAt: status.generatedAt,
      observerJsonPath: status.observerJsonPath,
      latestCompleted5m: summary?.latestCompleted5m ?? null,
      latestDeskPrimary: summary?.latestDeskPrimary ?? null,
      latestLineInSand: summary?.latestLineInSand ?? null,
      discordSignoffStatus: summary?.discordSignoffStatus ?? null,
      phase4EnforcementFailures: summary?.phase4EnforcementFailures ?? null,
      htfFvgPhase5ContractFailures: summary?.htfFvgPhase5ContractFailures ?? null,
      htfFvgReactionRoutingEvents: summary?.htfFvgReactionRoutingEvents ?? null,
      htfFvgPhase5ContractEvents: summary?.htfFvgPhase5ContractEvents ?? null,
    },
    archivedPaths: {
      manifestJsonPath,
      supervisorPhase6ObserverJsonPath: status.observerJsonPath,
    },
    bottomLine:
      status.status === 'ready'
        ? `Phase 9 live signoff manifest archived: ${status.bottomLine}`
        : `Phase 9 live signoff manifest archived with status ${status.status}: ${status.failures.join(' ')}`,
  };
  await fs.writeFile(manifestJsonPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

async function main() {
  const options = parseLiveSignoffManifestArgs();
  const manifest = await buildLiveSignoffManifest(options);
  if (options.json) console.log(JSON.stringify(manifest, null, 2));
  else console.log(manifest.bottomLine);
  if (manifest.status !== 'ready') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
