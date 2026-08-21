import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

type SessionName = 'morning' | 'lunch' | 'full-rth';
type AnyRecord = Record<string, any>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'replay-diagnostics');
const DIAGNOSTIC_SCRIPT = 'tools/automation/jan7-fvg-failure-diagnostic.ts';
const BOUNDARY = 'research_only_no_live_scanner_discord_or_trading_rule_change';
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function argValue(name: string, fallback: string): string {
  const equalsPrefix = `--${name}=`;
  const equalsArg = process.argv.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg) return equalsArg.slice(equalsPrefix.length);
  const flagIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (flagIndex >= 0) {
    const value = process.argv[flagIndex + 1];
    if (value && !value.startsWith('--')) return value;
  }
  return fallback;
}

function argNumber(name: string, fallback: number): number {
  const raw = argValue(name, String(fallback));
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid --${name}: ${raw}`);
  return parsed;
}

function safeLabel(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected YYYY-MM-DD date, got ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function* weekdaysBetween(from: string, to: string): Generator<string> {
  const cursor = parseDate(from);
  const end = parseDate(to);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) yield isoDate(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

function tail(text: string, maxChars = 3000): string {
  return text.length <= maxChars ? text : text.slice(text.length - maxChars);
}

function money(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '';
}

function price(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '';
}

function zoneText(zone: AnyRecord | null | undefined): string {
  if (!zone) return '';
  const lower = Number(zone.lower ?? zone.low ?? zone.zoneLow);
  const upper = Number(zone.upper ?? zone.high ?? zone.zoneHigh);
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return '';
  return `${lower.toFixed(2)}-${upper.toFixed(2)}`;
}

function directionOf(trace: AnyRecord): string {
  return String(trace.parentFvg?.direction ?? trace.direction ?? '');
}

function outcomeOf(trace: AnyRecord): string {
  return String(trace.managedOutcome ?? trace.outcome ?? '');
}

function pnlOf(trace: AnyRecord): number | null {
  const raw = trace.managedOneMesPnl ?? trace.oneMesPnl;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function coverageCell(coverage: AnyRecord | null | undefined, timeframe: string): AnyRecord {
  const cell = coverage?.[timeframe] ?? {};
  return {
    bars: cell.bars ?? cell.count ?? cell.loadedBars ?? 0,
    first: cell.first ?? cell.from ?? cell.start ?? cell.earliest ?? '',
    last: cell.last ?? cell.to ?? cell.end ?? cell.latest ?? '',
  };
}

function incrementBucket(bucket: AnyRecord, date: string, session: string, traces: AnyRecord[]): void {
  const month = date.slice(0, 7);
  bucket[month] ??= {};
  bucket[month][session] ??= { days: 0, traces: 0, eligible: 0, winners: 0, stops: 0, pnl: 0 };
  const target = bucket[month][session];
  target.days += 1;
  target.traces += traces.length;
  for (const trace of traces) {
    if (trace.eligible) target.eligible += 1;
    const outcome = outcomeOf(trace);
    const pnl = pnlOf(trace);
    if (['T1', 'T2', 'LQ1'].includes(outcome)) target.winners += 1;
    if (outcome === 'Stop') target.stops += 1;
    if (pnl !== null) target.pnl += pnl;
  }
}

function summarizeTrace(report: AnyRecord, trace: AnyRecord): AnyRecord {
  return {
    date: report.date,
    session: report.session,
    direction: directionOf(trace),
    eligible: Boolean(trace.eligible),
    verdict: trace.verdict ?? '',
    parentCreatedAt: trace.parentFvg?.createdAt ?? '',
    parentDisplacementAt: trace.parentFvg?.parentDisplacementAt ?? trace.parentDisplacementTime ?? '',
    parentZone: zoneText(trace.parentFvg),
    proofTime: trace.proofTime ?? '',
    entry: trace.entry ?? null,
    stop: trace.stop ?? null,
    riskPoints: trace.riskPoints ?? null,
    target1: trace.target1 ?? null,
    target2: trace.target2 ?? null,
    nearestLiquidity: trace.nearestLiquidity ?? null,
    liquidityFirstTarget: trace.liquidityFirstTarget ?? null,
    opposingFvgObstacleBeforeT1: trace.opposingFvgObstacleBeforeT1 ?? null,
    opposingFvgObstacleReaction: trace.opposingFvgObstacleReaction ?? '',
    balancedPathToLiquidity: trace.balancedPathToLiquidity ?? null,
    continuationRead: trace.continuationRead ?? '',
    outcome: trace.outcome ?? '',
    outcomeTime: trace.outcomeTime ?? '',
    exitPrice: trace.exitPrice ?? null,
    oneMesPnl: trace.oneMesPnl ?? null,
    managedOutcome: trace.managedOutcome ?? '',
    managedOutcomeTime: trace.managedOutcomeTime ?? '',
    managedExitPrice: trace.managedExitPrice ?? null,
    managedOneMesPnl: trace.managedOneMesPnl ?? null,
    reasons: Array.isArray(trace.reasons) ? trace.reasons : [],
  };
}

function markdownTable(rows: AnyRecord[]): string[] {
  const lines = [
    '| Date | Session | Dir | Parent FVG | Proof | Entry | Stop | T1 | T2 | Outcome | PnL/MES | Notes |',
    '|---|---:|---:|---|---|---:|---:|---:|---:|---|---:|---|',
  ];
  for (const row of rows) {
    const obstacle = row.opposingFvgObstacleBeforeT1 ? 'obstacle before T1' : '';
    const balanced = row.balancedPathToLiquidity?.status === 'balanced_path_to_liquidity' ? 'balanced path' : '';
    const notes = [row.verdict, obstacle, balanced].filter(Boolean).join('; ').replace(/\|/g, '/');
    const outcome = row.managedOutcome || row.outcome || '';
    const pnl = row.managedOneMesPnl ?? row.oneMesPnl;
    lines.push(
      `| ${row.date} | ${row.session} | ${row.direction} | ${row.parentZone} @ ${row.parentCreatedAt.slice(11, 16)} | ${String(row.proofTime).slice(11, 16)} | ${price(row.entry)} | ${price(row.stop)} | ${price(row.target1)} | ${price(row.target2)} | ${outcome} | ${money(pnl)} | ${notes} |`,
    );
  }
  return lines;
}

function buildMarkdown(summary: AnyRecord): string {
  const lines: string[] = [
    '# FVG Trading System v1 June/July Research Replay',
    '',
    `Generated: ${summary.generatedAt}`,
    `Boundary: ${summary.boundary}`,
    `Instrument: ${summary.args.bridgeInstrument}`,
    `Range: ${summary.args.from} to ${summary.args.to}`,
    `Sessions: ${summary.args.sessions.join(', ')}`,
    `Context days: ${summary.args.contextDays}`,
    '',
    '## Totals',
    '',
    `- Runs attempted: ${summary.totals.runsAttempted}`,
    `- Runs completed: ${summary.totals.runsCompleted}`,
    `- Runs failed: ${summary.failures.length}`,
    `- Candidate traces: ${summary.totals.traces}`,
    `- Eligible trades: ${summary.totals.eligible}`,
    `- Winners by managed/standard outcome: ${summary.totals.winners}`,
    `- Stops: ${summary.totals.stops}`,
    `- Net one-MES PnL from rows with outcome: ${money(summary.totals.pnl)}`,
    '',
    '## Month/Session Breakdown',
    '',
    '| Month | Session | Days | Traces | Eligible | Winners | Stops | PnL/MES |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];

  for (const month of Object.keys(summary.byMonthSession).sort()) {
    for (const session of Object.keys(summary.byMonthSession[month]).sort()) {
      const row = summary.byMonthSession[month][session];
      lines.push(
        `| ${month} | ${session} | ${row.days} | ${row.traces} | ${row.eligible} | ${row.winners} | ${row.stops} | ${money(row.pnl)} |`,
      );
    }
  }

  lines.push('', '## Eligible Trade Rows', '');
  const eligibleRows = summary.eligibleRows as AnyRecord[];
  if (eligibleRows.length) lines.push(...markdownTable(eligibleRows));
  else lines.push('No eligible FVG System v1 trade rows were produced.');

  lines.push('', '## Review Queue', '');
  const reviewRows = summary.reviewQueue as AnyRecord[];
  if (reviewRows.length) {
    lines.push(...markdownTable(reviewRows.slice(0, 25)));
  } else {
    lines.push('No stopped/negative/obstacle rows were flagged for immediate review.');
  }

  if (summary.failures.length) {
    lines.push('', '## Failed Runs', '');
    for (const failure of summary.failures) {
      lines.push(`- ${failure.date} ${failure.session}: ${failure.error}`);
    }
  }

  lines.push('', '## Rule Boundary', '');
  lines.push('- This is research replay only.');
  lines.push('- No live scanner, Discord, Supabase write, NinjaTrader, or execution behavior was changed.');
  lines.push('- Same-direction 15M parent FVG remains mandatory; 5M only confirms/executes.');

  return `${lines.join('\n')}\n`;
}

function main(): void {
  const from = argValue('from', '2026-06-01');
  const to = argValue('to', '2026-07-31');
  const bridgeInstrument = argValue('bridge-instrument', 'MES 09-26');
  const contextDays = argNumber('context-days', 275);
  const forwardDays = argNumber('forward-days', 1);
  const sessions = argValue('sessions', 'morning,lunch')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as SessionName[];
  const prefix = safeLabel(argValue('prefix', 'fvg-system-v1-month-replay'));

  for (const session of sessions) {
    if (!['morning', 'lunch', 'full-rth'].includes(session)) throw new Error(`Unsupported session: ${session}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const runs: AnyRecord[] = [];
  const failures: AnyRecord[] = [];
  const eligibleRows: AnyRecord[] = [];
  const reviewQueue: AnyRecord[] = [];
  const byMonthSession: AnyRecord = {};
  const totals = { runsAttempted: 0, runsCompleted: 0, traces: 0, eligible: 0, winners: 0, stops: 0, pnl: 0 };

  for (const date of weekdaysBetween(from, to)) {
    for (const session of sessions) {
      totals.runsAttempted += 1;
      const label = safeLabel(`${prefix}-${date}-${session}`);
      const jsonPath = path.join(OUT_DIR, `${label}.json`);
      const args = [
        TSX_CLI,
        DIAGNOSTIC_SCRIPT,
        '--date',
        date,
        '--session',
        session,
        '--bridge-instrument',
        bridgeInstrument,
        '--context-days',
        String(contextDays),
        '--forward-days',
        String(forwardDays),
        '--label',
        label,
      ];

      const result = spawnSync(process.execPath, args, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 20,
      });

      if (result.status !== 0 || !existsSync(jsonPath)) {
        failures.push({
          date,
          session,
          label,
          error: result.error?.message ?? `diagnostic failed with status ${result.status ?? 'unknown'}`,
          stdoutTail: tail(result.stdout ?? ''),
          stderrTail: tail(result.stderr ?? ''),
        });
        continue;
      }

      const report = JSON.parse(readFileSync(jsonPath, 'utf8')) as AnyRecord;
      const traces = Array.isArray(report.traces) ? report.traces : [];
      incrementBucket(byMonthSession, date, session, traces);
      totals.runsCompleted += 1;
      totals.traces += traces.length;

      const summarized = traces.map((trace: AnyRecord) => summarizeTrace(report, trace));
      for (const row of summarized) {
        const outcome = String(row.managedOutcome || row.outcome || '');
        const pnl = Number(row.managedOneMesPnl ?? row.oneMesPnl);
        if (row.eligible) {
          eligibleRows.push(row);
          totals.eligible += 1;
        }
        if (['T1', 'T2', 'LQ1'].includes(outcome)) totals.winners += 1;
        if (outcome === 'Stop') totals.stops += 1;
        if (Number.isFinite(pnl)) totals.pnl += pnl;
        if (row.eligible && (outcome === 'Stop' || (Number.isFinite(pnl) && pnl < 0) || row.opposingFvgObstacleBeforeT1)) {
          reviewQueue.push(row);
        }
      }

      runs.push({
        date,
        session,
        label,
        jsonPath,
        markdownPath: path.join(OUT_DIR, `${label}.md`),
        traceCount: traces.length,
        eligibleCount: summarized.filter((row: AnyRecord) => row.eligible).length,
        coverage: {
          '5m': coverageCell(report.coverage, '5m'),
          '15m': coverageCell(report.coverage, '15m'),
          '60m': coverageCell(report.coverage, '60m'),
          '120m': coverageCell(report.coverage, '120m'),
          '240m': coverageCell(report.coverage, '240m'),
        },
      });
    }
  }

  const summary = {
    reportType: 'fvg_system_v1_month_replay_summary',
    generatedAt: new Date().toISOString(),
    boundary: BOUNDARY,
    args: { from, to, sessions, bridgeInstrument, contextDays, forwardDays, prefix },
    totals,
    byMonthSession,
    runs,
    eligibleRows,
    reviewQueue,
    failures,
  };

  const summaryJsonPath = path.join(OUT_DIR, `${prefix}-summary.json`);
  const summaryMarkdownPath = path.join(OUT_DIR, `${prefix}-summary.md`);
  writeFileSync(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(summaryMarkdownPath, buildMarkdown(summary));

  console.log(JSON.stringify({
    ok: failures.length === 0,
    summaryJsonPath,
    summaryMarkdownPath,
    totals,
    failures: failures.length,
  }, null, 2));
}

main();
