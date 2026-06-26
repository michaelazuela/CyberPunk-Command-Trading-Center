import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEndOfDayEvidenceSummary, type EndOfDayEvidenceSummary } from './endOfDayEvidenceSummary';
import { buildSupervisorPhase6SignoffStatus, type SupervisorPhase6SignoffStatus } from './phase6Signoff';
import type { Phase6LiveFormatSignoffOptions } from '../automation/phase6-live-format-signoff';

type SessionName = Phase6LiveFormatSignoffOptions['session'];

export interface LiveObservationSignoffOptions {
  tradeDate: string;
  instrument: string;
  session: SessionName;
  auditDir: string;
  observerOutDir: string;
  outDir: string;
  bundleRoot: string;
  sinceRecordedAt?: string | null;
  minRoutingEvents: number;
  minPhase5Events: number;
  requireEvidenceSummary: boolean;
  json: boolean;
}

export interface LiveObservationSignoffReport {
  reportType: 'supervisor_live_observation_signoff';
  phase: 'phase_17_live_scanner_discord_observation';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    startsScannerServices: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  tradeDate: string;
  instrument: string;
  session: SessionName;
  status: 'ready' | 'blocked' | 'unavailable';
  supervisorPhase6Signoff: SupervisorPhase6SignoffStatus;
  evidenceSummary: EndOfDayEvidenceSummary;
  checks: {
    supervisorPhase6Ready: boolean;
    discordSignoffReady: boolean;
    phase4FailuresZero: boolean;
    phase5FailuresZero: boolean;
    htfRoutingEventsPresent: boolean;
    phase5ContractEventsPresent: boolean;
    evidenceSummaryReadyOrNotRequired: boolean;
  };
  failures: string[];
  reportPath: string;
  bottomLine: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_AUDIT_DIR = path.join(REPO_ROOT, 'tools', 'automation', 'discord-audit');
const DEFAULT_OBSERVER_OUT_DIR = path.join(REPO_ROOT, 'tools', 'automation', 'live-desk-observer-reports');
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, 'logs', 'supervisor', 'live-observation-signoff');
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

function numberFlag(args: string[], flag: string, fallback: number): number {
  const raw = readFlag(args, flag);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function etSession(): SessionName {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const minutes = hour * 60 + minute;
  if (minutes >= 12 * 60 && minutes < 16 * 60) return 'lunch';
  if (minutes >= 18 * 60 + 45 && minutes <= 22 * 60 + 15) return 'evening';
  return 'morning';
}

function authority(): LiveObservationSignoffReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    startsScannerServices: false,
    changesScannerState: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  };
}

export function parseLiveObservationSignoffArgs(args = process.argv.slice(2)): LiveObservationSignoffOptions {
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: readFlag(args, '--instrument') || 'MES',
    session: (readFlag(args, '--session') || etSession()) as SessionName,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    observerOutDir: readFlag(args, '--observer-out-dir') || DEFAULT_OBSERVER_OUT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    bundleRoot: readFlag(args, '--bundle-dir') || DEFAULT_BUNDLE_ROOT,
    sinceRecordedAt: readFlag(args, '--since-recorded-at'),
    minRoutingEvents: numberFlag(args, '--min-routing-events', 1),
    minPhase5Events: numberFlag(args, '--min-phase5-events', 1),
    requireEvidenceSummary: hasFlag(args, '--require-evidence-summary'),
    json: hasFlag(args, '--json'),
  };
}

function buildFailures(args: {
  phase6: SupervisorPhase6SignoffStatus;
  evidenceSummary: EndOfDayEvidenceSummary;
  requireEvidenceSummary: boolean;
}): string[] {
  const failures: string[] = [];
  if (args.phase6.status !== 'ready') failures.push(...args.phase6.failures);
  if (args.requireEvidenceSummary && args.evidenceSummary.status !== 'ready') {
    failures.push(`Evidence summary is ${args.evidenceSummary.status}, expected ready.`);
    failures.push(...args.evidenceSummary.failures);
  }
  return failures;
}

export async function buildLiveObservationSignoff(
  options: LiveObservationSignoffOptions,
): Promise<LiveObservationSignoffReport> {
  const phase6 = await buildSupervisorPhase6SignoffStatus({
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    auditDir: options.auditDir,
    outDir: options.observerOutDir,
    sinceRecordedAt: options.sinceRecordedAt,
    minRoutingEvents: options.minRoutingEvents,
    minPhase5Events: options.minPhase5Events,
    json: false,
  });
  const evidenceSummary = await buildEndOfDayEvidenceSummary({
    bundleRoot: options.bundleRoot,
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    json: false,
  });
  const summary = phase6.summary;
  const checks = {
    supervisorPhase6Ready: phase6.status === 'ready',
    discordSignoffReady: summary?.discordSignoffStatus === 'ready',
    phase4FailuresZero: summary?.phase4EnforcementFailures === 0,
    phase5FailuresZero: summary?.htfFvgPhase5ContractFailures === 0,
    htfRoutingEventsPresent: (summary?.htfFvgReactionRoutingEvents ?? 0) >= options.minRoutingEvents,
    phase5ContractEventsPresent: (summary?.htfFvgPhase5ContractEvents ?? 0) >= options.minPhase5Events,
    evidenceSummaryReadyOrNotRequired: !options.requireEvidenceSummary || evidenceSummary.status === 'ready',
  };
  const failures = buildFailures({ phase6, evidenceSummary, requireEvidenceSummary: options.requireEvidenceSummary });
  const status: LiveObservationSignoffReport['status'] =
    phase6.status === 'unavailable' ? 'unavailable' : failures.length ? 'blocked' : 'ready';
  await fs.mkdir(options.outDir, { recursive: true });
  const reportPath = path.join(
    options.outDir,
    `live-observation-signoff-${options.tradeDate}-${options.instrument}-${options.session}.json`,
  );
  const report: LiveObservationSignoffReport = {
    reportType: 'supervisor_live_observation_signoff',
    phase: 'phase_17_live_scanner_discord_observation',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    status,
    supervisorPhase6Signoff: phase6,
    evidenceSummary,
    checks,
    failures,
    reportPath,
    bottomLine: status === 'ready'
      ? `Phase 17 live observation ready: Discord signoff is ready, Phase 4/5 failures are zero, and HTF routing evidence is present for ${options.tradeDate} ${options.instrument} ${options.session}.`
      : `Phase 17 live observation ${status}: ${failures.join(' ')}`,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const options = parseLiveObservationSignoffArgs();
  const report = await buildLiveObservationSignoff(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(report.bottomLine);
  if (report.status !== 'ready') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
