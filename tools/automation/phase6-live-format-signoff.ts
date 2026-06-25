import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLiveDeskObserverReport } from './live-desk-observer';

type SessionName = 'morning' | 'lunch' | 'evening';

export interface Phase6LiveFormatSignoffOptions {
  tradeDate: string;
  instrument: string;
  session: SessionName;
  auditDir: string;
  outDir: string;
  sinceRecordedAt?: string | null;
  minRoutingEvents: number;
  minPhase5Events: number;
  json: boolean;
}

export interface Phase6LiveFormatSignoffReport {
  reportType: 'phase6_live_format_signoff';
  authority: {
    researchOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
  };
  tradeDate: string;
  instrument: string;
  session: SessionName;
  generatedAt: string;
  observerJsonPath: string;
  status: 'pass' | 'fail';
  failures: string[];
  summary: Awaited<ReturnType<typeof buildLiveDeskObserverReport>>['summary'];
  bottomLine: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'live-desk-observer-reports');

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

export function parsePhase6LiveFormatSignoffArgs(args = process.argv.slice(2)): Phase6LiveFormatSignoffOptions {
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: readFlag(args, '--instrument') || 'MES',
    session: (readFlag(args, '--session') || etSession()) as SessionName,
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    sinceRecordedAt: readFlag(args, '--since-recorded-at'),
    minRoutingEvents: numberFlag(args, '--min-routing-events', 1),
    minPhase5Events: numberFlag(args, '--min-phase5-events', 1),
    json: hasFlag(args, '--json'),
  };
}

function phase6Failures(args: {
  observer: Awaited<ReturnType<typeof buildLiveDeskObserverReport>>;
  options: Phase6LiveFormatSignoffOptions;
}): string[] {
  const failures: string[] = [];
  const summary = args.observer.summary;
  if (args.observer.eventCount <= 0) failures.push('No observer events were available for the requested tape/filter.');
  if (summary.discordSignoffStatus !== 'ready') failures.push(`Observer signoff is ${summary.discordSignoffStatus}, expected ready.`);
  if (summary.phase4EnforcementFailures !== 0) failures.push(`Phase 4 enforcement failures: ${summary.phase4EnforcementFailures}.`);
  if (summary.htfFvgPhase5ContractFailures !== 0) failures.push(`Phase 5 contract failures: ${summary.htfFvgPhase5ContractFailures}.`);
  if (summary.htfFvgReactionRoutingFieldEvents < args.options.minRoutingEvents) {
    failures.push(`HTF FVG routing field events ${summary.htfFvgReactionRoutingFieldEvents} below required ${args.options.minRoutingEvents}.`);
  }
  if (summary.htfFvgReactionRoutingEvents < args.options.minRoutingEvents) {
    failures.push(`Active HTF FVG routing events ${summary.htfFvgReactionRoutingEvents} below required ${args.options.minRoutingEvents}.`);
  }
  if (summary.htfFvgPhase5ContractEvents < args.options.minPhase5Events) {
    failures.push(`Phase 5 contract events ${summary.htfFvgPhase5ContractEvents} below required ${args.options.minPhase5Events}.`);
  }
  if (args.options.sinceRecordedAt && args.observer.filteredEventCount === 0) {
    failures.push('sinceRecordedAt was supplied, but no older events were filtered; fresh-run cutoff was not proven.');
  }
  return failures;
}

export async function buildPhase6LiveFormatSignoff(options: Phase6LiveFormatSignoffOptions): Promise<Phase6LiveFormatSignoffReport> {
  const observer = await buildLiveDeskObserverReport({
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    auditDir: options.auditDir,
    outDir: options.outDir,
    json: false,
    watch: false,
    pollSeconds: 60,
    sinceRecordedAt: options.sinceRecordedAt,
  });
  await fs.mkdir(options.outDir, { recursive: true });
  const baseName = `phase6-live-format-signoff-${options.tradeDate}-${options.instrument}-${options.session}`;
  const observerJsonPath = path.join(options.outDir, `${baseName}.observer.json`);
  await fs.writeFile(observerJsonPath, JSON.stringify(observer, null, 2));
  const failures = phase6Failures({ observer, options });
  const report: Phase6LiveFormatSignoffReport = {
    reportType: 'phase6_live_format_signoff',
    authority: {
      researchOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
    },
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    session: options.session,
    generatedAt: new Date().toISOString(),
    observerJsonPath,
    status: failures.length ? 'fail' : 'pass',
    failures,
    summary: observer.summary,
    bottomLine: failures.length
      ? `Phase 6 live-format signoff failed: ${failures.join(' ')}`
      : `Phase 6 live-format signoff passed: observer ready with ${observer.summary.htfFvgReactionRoutingEvents} active HTF FVG routing event(s), Phase 4 failures 0, Phase 5 failures 0.`,
  };
  const jsonPath = path.join(options.outDir, `${baseName}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  return report;
}

async function main() {
  const options = parsePhase6LiveFormatSignoffArgs();
  const report = await buildPhase6LiveFormatSignoff(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(report.bottomLine);
  if (report.status !== 'pass') process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
