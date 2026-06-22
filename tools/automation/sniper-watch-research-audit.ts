import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ScannerSession = 'morning' | 'lunch' | 'evening';
type Direction = 'LONG' | 'SHORT';
type SniperOutcome = 'T2' | 'T1' | 'STOP' | 'NO_RESOLUTION' | 'NO_5M_CONFIRMATION';

export interface SniperWatchResearchRow {
  tradeDate: string;
  session: ScannerSession;
  sourceEventTime: string;
  source: string;
  direction: Direction;
  canExecute: boolean | null;
  scannerState: string;
  lineInSand: number;
  referenceEntry: number;
  referenceStop: number;
  referenceTarget1: number;
  referenceTarget2: number;
  oneMinuteEvidence: 'not_available_in_scanner_decision_tape';
  fiveMinuteConfirmationTime: string | null;
  fiveMinuteConfirmationClose: number | null;
  outcome: SniperOutcome;
  outcomeTime: string | null;
  maxFavorableExcursionPoints: number | null;
  maxAdverseExcursionPoints: number | null;
  notes: string[];
}

export interface SniperWatchResearchAuditReport {
  reportType: 'sniper_watch_research_phase3_audit';
  generatedAt: string;
  tradeDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  sourceTapes: string[];
  summary: {
    tapesReviewed: number;
    eventsReviewed: number;
    opportunities: number;
    fiveMinuteConfirmed: number;
    t1Hits: number;
    t2Hits: number;
    stopped: number;
    unresolved: number;
    noFiveMinuteConfirmation: number;
    canExecuteTrueExcluded: number;
  };
  rows: SniperWatchResearchRow[];
  findings: string[];
  authority: {
    readOnly: true;
    postsDiscord: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntriesStopsTargets: false;
    createsNewModel: false;
    oneMinuteApprovesExecution: false;
  };
  markdown: string;
}

interface SniperWatchResearchAuditOptions {
  tradeDate: string;
  instrument: string;
  sessions: ScannerSession[];
  auditDir: string;
  outDir: string;
  json: boolean;
}

interface TapeEvent {
  time: string;
  event: Record<string, unknown>;
  bar: {
    high: number | null;
    low: number | null;
    close: number | null;
  };
}

interface ReferencePlan {
  source: string;
  direction: Direction;
  lineInSand: number;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const ALL_SESSIONS: ScannerSession[] = ['morning', 'lunch', 'evening'];

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

function parseSessions(raw: string | null): ScannerSession[] {
  if (!raw || raw.toLowerCase() === 'all') return ALL_SESSIONS;
  const sessions = raw.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  for (const session of sessions) {
    if (session !== 'morning' && session !== 'lunch' && session !== 'evening') {
      throw new Error('--sessions must contain morning,lunch,evening, or all.');
    }
  }
  return [...new Set(sessions)] as ScannerSession[];
}

export function parseSniperWatchResearchAuditArgs(args = process.argv.slice(2)): SniperWatchResearchAuditOptions {
  return {
    tradeDate: readFlag(args, '--trade-date') || etDate(),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    sessions: parseSessions(readFlag(args, '--sessions')),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: hasFlag(args, '--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = 'N/A'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function fmt(value: number | null): string {
  return value === null ? 'N/A' : value.toFixed(2);
}

function timeLabel(value: string | null): string {
  if (!value) return 'N/A';
  return value.match(/T(\d{2}:\d{2})/)?.[1] || value;
}

function tapePath(options: SniperWatchResearchAuditOptions, session: ScannerSession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${options.tradeDate}-${options.instrument}-${session}.json`);
}

function normalizeDirection(value: unknown): Direction | null {
  return value === 'LONG' || value === 'SHORT' ? value : null;
}

function closeConfirms(direction: Direction, close: number | null, line: number): boolean {
  if (!isPrice(close)) return false;
  return direction === 'LONG' ? close > line : close < line;
}

function planFromRecord(source: string, value: unknown, fallbackDirection: Direction | null = null): ReferencePlan | null {
  const record = asRecord(value);
  const direction = normalizeDirection(record.direction) || fallbackDirection;
  const entry = numberValue(record.entry);
  const stop = numberValue(record.stop);
  const target1 = numberValue(record.target1) ?? numberValue(record.t1);
  const target2 = numberValue(record.target2) ?? numberValue(record.t2);
  const line = numberValue(record.lineInSand) ?? entry;
  if (!direction || !isPrice(line) || !isPrice(entry) || !isPrice(stop) || !isPrice(target1) || !isPrice(target2)) return null;
  const validStop = direction === 'LONG' ? stop < entry : stop > entry;
  if (!validStop) return null;
  return {
    source,
    direction,
    lineInSand: line,
    entry,
    stop,
    target1,
    target2,
  };
}

function candidatePlansFromEvent(event: Record<string, unknown>): ReferencePlan[] {
  const plans: ReferencePlan[] = [];
  const setupStatus = asRecord(event.setupCandidateStatus);
  const selected = planFromRecord('selected_candidate', asRecord(setupStatus.selected));
  if (selected) plans.push(selected);

  const plan = asRecord(event.plan);
  const selectedDirection = normalizeDirection(asRecord(setupStatus.selected).direction);
  const normalized = planFromRecord('normalized_plan', {
    direction: selectedDirection,
    entry: plan.entry,
    stop: plan.stop,
    t1: plan.t1,
    t2: plan.t2,
    lineInSand: plan.entry,
  });
  if (normalized) plans.push(normalized);

  const deskState = asRecord(event.deskState);
  const longPlan = planFromRecord('desk_best_long', asRecord(deskState.bestLongPlan), 'LONG');
  const shortPlan = planFromRecord('desk_best_short', asRecord(deskState.bestShortPlan), 'SHORT');
  if (longPlan) plans.push(longPlan);
  if (shortPlan) plans.push(shortPlan);

  const unique = new Map<string, ReferencePlan>();
  for (const item of plans) {
    unique.set(`${item.source}:${item.direction}:${item.entry}:${item.stop}:${item.target1}:${item.target2}`, item);
  }
  return [...unique.values()];
}

function outcomeFromBars(plan: ReferencePlan, bars: TapeEvent[], startIndex: number): Pick<SniperWatchResearchRow, 'outcome' | 'outcomeTime' | 'maxFavorableExcursionPoints' | 'maxAdverseExcursionPoints'> {
  let maxFavorable = 0;
  let maxAdverse = 0;
  for (const item of bars.slice(startIndex)) {
    const high = item.bar.high ?? item.bar.close;
    const low = item.bar.low ?? item.bar.close;
    if (!isPrice(high) || !isPrice(low)) continue;
    const favorable = plan.direction === 'LONG' ? high - plan.entry : plan.entry - low;
    const adverse = plan.direction === 'LONG' ? plan.entry - low : high - plan.entry;
    maxFavorable = Math.max(maxFavorable, favorable);
    maxAdverse = Math.max(maxAdverse, adverse);

    const stopHit = plan.direction === 'LONG' ? low <= plan.stop : high >= plan.stop;
    const t2Hit = plan.direction === 'LONG' ? high >= plan.target2 : low <= plan.target2;
    const t1Hit = plan.direction === 'LONG' ? high >= plan.target1 : low <= plan.target1;
    if (t2Hit) return { outcome: 'T2', outcomeTime: item.time, maxFavorableExcursionPoints: maxFavorable, maxAdverseExcursionPoints: maxAdverse };
    if (t1Hit) return { outcome: 'T1', outcomeTime: item.time, maxFavorableExcursionPoints: maxFavorable, maxAdverseExcursionPoints: maxAdverse };
    if (stopHit) return { outcome: 'STOP', outcomeTime: item.time, maxFavorableExcursionPoints: maxFavorable, maxAdverseExcursionPoints: maxAdverse };
  }
  return {
    outcome: 'NO_RESOLUTION',
    outcomeTime: null,
    maxFavorableExcursionPoints: maxFavorable,
    maxAdverseExcursionPoints: maxAdverse,
  };
}

function rowForPlan(args: {
  tradeDate: string;
  session: ScannerSession;
  eventIndex: number;
  events: TapeEvent[];
  plan: ReferencePlan;
}): SniperWatchResearchRow {
  const sourceEvent = args.events[args.eventIndex];
  const plan = args.plan;
  const canExecute = boolValue(asRecord(sourceEvent.event.plan).canExecute) ?? boolValue(asRecord(sourceEvent.event.deskState).canExecute);
  const notes = [
    'Research-only: this audits completed 5M decision-tape evidence and cannot verify the trader discretionary 1M close.',
    'Does not approve execution, change scanner state, or create a trade model.',
  ];
  const confirmationIndex = args.events.findIndex((item, index) =>
    index >= args.eventIndex && closeConfirms(plan.direction, item.bar.close, plan.lineInSand)
  );
  if (confirmationIndex < 0) {
    return {
      tradeDate: args.tradeDate,
      session: args.session,
      sourceEventTime: sourceEvent.time,
      source: plan.source,
      direction: plan.direction,
      canExecute,
      scannerState: stringValue(sourceEvent.event.scannerState, 'unknown'),
      lineInSand: plan.lineInSand,
      referenceEntry: plan.entry,
      referenceStop: plan.stop,
      referenceTarget1: plan.target1,
      referenceTarget2: plan.target2,
      oneMinuteEvidence: 'not_available_in_scanner_decision_tape',
      fiveMinuteConfirmationTime: null,
      fiveMinuteConfirmationClose: null,
      outcome: 'NO_5M_CONFIRMATION',
      outcomeTime: null,
      maxFavorableExcursionPoints: null,
      maxAdverseExcursionPoints: null,
      notes,
    };
  }
  const confirmation = args.events[confirmationIndex];
  const outcome = outcomeFromBars(plan, args.events, confirmationIndex);
  return {
    tradeDate: args.tradeDate,
    session: args.session,
    sourceEventTime: sourceEvent.time,
    source: plan.source,
    direction: plan.direction,
    canExecute,
    scannerState: stringValue(sourceEvent.event.scannerState, 'unknown'),
    lineInSand: plan.lineInSand,
    referenceEntry: plan.entry,
    referenceStop: plan.stop,
    referenceTarget1: plan.target1,
    referenceTarget2: plan.target2,
    oneMinuteEvidence: 'not_available_in_scanner_decision_tape',
    fiveMinuteConfirmationTime: confirmation.time,
    fiveMinuteConfirmationClose: confirmation.bar.close,
    ...outcome,
    notes,
  };
}

function referencePlanKey(plan: ReferencePlan): string {
  return [
    plan.direction,
    plan.lineInSand.toFixed(2),
    plan.entry.toFixed(2),
    plan.stop.toFixed(2),
    plan.target1.toFixed(2),
    plan.target2.toFixed(2),
  ].join('|');
}

function findingsFor(summary: SniperWatchResearchAuditReport['summary']): string[] {
  const findings: string[] = [];
  if (summary.opportunities === 0) {
    findings.push('No non-executable sniper-watch reference-level opportunities were found in the selected decision tapes.');
  } else {
    findings.push(`${summary.opportunities} non-executable sniper-watch reference-level opportunity/opportunities found for research.`);
    findings.push(`${summary.fiveMinuteConfirmed} had completed 5M close/hold confirmation through the line-in-the-sand.`);
    findings.push(`${summary.t1Hits} reached T1 after completed 5M confirmation; ${summary.t2Hits} reached T2; ${summary.stopped} hit stop first.`);
  }
  if (summary.noFiveMinuteConfirmation > 0) {
    findings.push(`${summary.noFiveMinuteConfirmation} opportunity/opportunities never received completed 5M line confirmation in the tape and should not be treated as validated.`);
  }
  if (summary.canExecuteTrueExcluded > 0) {
    findings.push(`${summary.canExecuteTrueExcluded} executable event plan(s) were excluded because sniper watch is only for non-executable discretionary research.`);
  }
  findings.push('1M close evidence is not available in scanner decision tapes; this audit can only study the 5M confirmation/outcome leg.');
  findings.push('Read-only research only. Do not change canExecute, entries, stops, targets, risk gates, setup definitions, ranking, or model definitions from this report.');
  return findings;
}

function markdownFor(report: Omit<SniperWatchResearchAuditReport, 'markdown'>): string {
  const lines = [
    `# Sniper Watch Research Phase 3 Audit - ${report.instrument} ${report.tradeDate}`,
    '',
    'Research-only audit from scanner decision tapes. This report does not post Discord, change scanner state, approve execution, create a model, or change trading logic.',
    '',
    '## Summary',
    `- Tapes reviewed: ${report.summary.tapesReviewed}`,
    `- Events reviewed: ${report.summary.eventsReviewed}`,
    `- Opportunities: ${report.summary.opportunities}`,
    `- Completed 5M confirmations: ${report.summary.fiveMinuteConfirmed}`,
    `- T1 hits: ${report.summary.t1Hits}`,
    `- T2 hits: ${report.summary.t2Hits}`,
    `- Stops: ${report.summary.stopped}`,
    `- No 5M confirmation: ${report.summary.noFiveMinuteConfirmation}`,
    `- Unresolved after confirmation: ${report.summary.unresolved}`,
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Research Table',
    '| Session | Source 5M | Source | Side | Line | Entry | Stop | T1 | T2 | 5M Confirm | Outcome | MFE | MAE |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: |',
    ...report.rows.map((row) => [
      row.session,
      timeLabel(row.sourceEventTime),
      row.source,
      row.direction,
      fmt(row.lineInSand),
      fmt(row.referenceEntry),
      fmt(row.referenceStop),
      fmt(row.referenceTarget1),
      fmt(row.referenceTarget2),
      row.fiveMinuteConfirmationTime ? `${timeLabel(row.fiveMinuteConfirmationTime)} @ ${fmt(row.fiveMinuteConfirmationClose)}` : 'N/A',
      row.outcomeTime ? `${row.outcome} @ ${timeLabel(row.outcomeTime)}` : row.outcome,
      fmt(row.maxFavorableExcursionPoints),
      fmt(row.maxAdverseExcursionPoints),
    ].join(' | ')).map((line) => `| ${line} |`),
    '',
    '## Authority Boundary',
    '- Read-only: true',
    '- Posts Discord: false',
    '- Changes scanner state: false',
    '- Changes trading logic: false',
    '- Changes canExecute: false',
    '- Changes entries/stops/targets: false',
    '- Creates new model: false',
    '- 1M approves execution: false',
  ];
  return `${lines.join('\n')}\n`;
}

export async function buildSniperWatchResearchAuditReport(options: SniperWatchResearchAuditOptions): Promise<SniperWatchResearchAuditReport> {
  const sourceTapes: string[] = [];
  const rows: SniperWatchResearchRow[] = [];
  let eventsReviewed = 0;
  let canExecuteTrueExcluded = 0;

  for (const session of options.sessions) {
    const sourceTape = tapePath(options, session);
    if (!existsSync(sourceTape)) continue;
    sourceTapes.push(sourceTape);
    const seenReferencePlans = new Set<string>();
    const tape = JSON.parse(await fs.readFile(sourceTape, 'utf8')) as Record<string, unknown>;
    const events = Object.entries(asRecord(tape.events))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, raw]): TapeEvent => {
        const event = asRecord(raw);
        const bar = asRecord(event.completed5m);
        return {
          time,
          event,
          bar: {
            high: numberValue(bar.high) ?? numberValue(bar.close),
            low: numberValue(bar.low) ?? numberValue(bar.close),
            close: numberValue(bar.close),
          },
        };
      });
    eventsReviewed += events.length;
    events.forEach((event, index) => {
      const eventCanExecute = boolValue(asRecord(event.event.plan).canExecute) ?? boolValue(asRecord(event.event.deskState).canExecute);
      const plans = candidatePlansFromEvent(event.event);
      if (eventCanExecute === true && plans.length) {
        canExecuteTrueExcluded += plans.length;
        return;
      }
      for (const plan of plans) {
        const key = referencePlanKey(plan);
        if (seenReferencePlans.has(key)) continue;
        seenReferencePlans.add(key);
        rows.push(rowForPlan({
          tradeDate: options.tradeDate,
          session,
          eventIndex: index,
          events,
          plan,
        }));
      }
    });
  }

  const summary: SniperWatchResearchAuditReport['summary'] = {
    tapesReviewed: sourceTapes.length,
    eventsReviewed,
    opportunities: rows.length,
    fiveMinuteConfirmed: rows.filter((row) => row.fiveMinuteConfirmationTime).length,
    t1Hits: rows.filter((row) => row.outcome === 'T1' || row.outcome === 'T2').length,
    t2Hits: rows.filter((row) => row.outcome === 'T2').length,
    stopped: rows.filter((row) => row.outcome === 'STOP').length,
    unresolved: rows.filter((row) => row.outcome === 'NO_RESOLUTION').length,
    noFiveMinuteConfirmation: rows.filter((row) => row.outcome === 'NO_5M_CONFIRMATION').length,
    canExecuteTrueExcluded,
  };
  const reportWithoutMarkdown: Omit<SniperWatchResearchAuditReport, 'markdown'> = {
    reportType: 'sniper_watch_research_phase3_audit',
    generatedAt: new Date().toISOString(),
    tradeDate: options.tradeDate,
    instrument: options.instrument,
    auditDir: options.auditDir,
    outDir: options.outDir,
    sourceTapes,
    summary,
    rows,
    findings: findingsFor(summary),
    authority: {
      readOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntriesStopsTargets: false,
      createsNewModel: false,
      oneMinuteApprovesExecution: false,
    },
  };
  return {
    ...reportWithoutMarkdown,
    markdown: markdownFor(reportWithoutMarkdown),
  };
}

async function main() {
  const options = parseSniperWatchResearchAuditArgs();
  const report = await buildSniperWatchResearchAuditReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const base = `sniper-watch-research-phase3-${options.tradeDate}-${options.instrument}`;
  const jsonPath = path.join(options.outDir, `${base}.json`);
  const mdPath = path.join(options.outDir, `${base}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, report.markdown);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ jsonPath, mdPath, summary: report.summary, findings: report.findings }, null, 2)}\n`);
  } else {
    console.log(`Sniper Watch research Phase 3 audit written: ${mdPath}`);
    console.log(`Opportunities: ${report.summary.opportunities}; 5M confirmed: ${report.summary.fiveMinuteConfirmed}; T1 hits: ${report.summary.t1Hits}; stops: ${report.summary.stopped}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
