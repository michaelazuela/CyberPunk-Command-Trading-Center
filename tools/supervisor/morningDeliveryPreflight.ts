import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { loadSupervisorConfig } from './config';
import { buildDeliveryVisibilityReport } from './deliveryVisibility';
import { buildHealthReport } from './health';
import { getSupervisorState } from './processManager';
import { buildSupervisorStatus } from './status';
import type { SupervisorStatusPayload } from './status';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Severity = 'PASS' | 'WARN' | 'BLOCK';

interface Finding {
  severity: Severity;
  label: string;
  detail: string;
}

function add(findings: Finding[], severity: Severity, label: string, detail: string): void {
  findings.push({ severity, label, detail });
}

function etDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`;
}

function parseArgs(args = process.argv.slice(2)): { tradeDate: string; json: boolean } {
  let tradeDate = etDate();
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--date' && args[index + 1]) {
      tradeDate = args[index + 1];
      index += 1;
    } else if (arg.startsWith('--date=')) {
      tradeDate = arg.slice('--date='.length);
    }
  }
  return { tradeDate, json };
}

async function readSupervisorStatus(): Promise<SupervisorStatusPayload | null> {
  const configResult = loadSupervisorConfig();
  try {
    const response = await fetch(
      `http://${configResult.config.host}:${configResult.config.port}${configResult.config.statusPath}`,
      { signal: AbortSignal.timeout(3_000) },
    );
    if (!response.ok) return null;
    return await response.json() as SupervisorStatusPayload;
  } catch {
    const state = getSupervisorState(configResult.config);
    const health = await buildHealthReport(configResult.config, state);
    const delivery = buildDeliveryVisibilityReport({ staleAfterMs: configResult.config.health.logStaleAfterMs });
    return buildSupervisorStatus(configResult, state, health, delivery);
  }
}

function readJsonFile(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function latestDecisionTapeSummary(tradeDate: string): Record<string, unknown> | null {
  const filePath = path.join('tools', 'automation', 'discord-audit', `scanner-decision-tape-${tradeDate}-MES-morning.json`);
  const tape = readJsonFile(filePath);
  if (!tape || typeof tape !== 'object') return null;
  const events = (tape as { events?: Record<string, unknown> }).events || {};
  const latestKey = Object.keys(events).sort().at(-1);
  if (!latestKey) return { filePath, events: 0 };
  const event = events[latestKey] as Record<string, unknown>;
  const completed5m = event.completed5m as Record<string, unknown> | undefined;
  const selected = ((event.setupCandidateStatus as Record<string, unknown> | undefined)?.selected
    || (event.deskState as Record<string, unknown> | undefined)?.selectedCandidate
    || {}) as Record<string, unknown>;
  const discord = event.discord as Record<string, unknown> | undefined;
  return {
    filePath,
    events: Object.keys(events).length,
    latestEvent: latestKey,
    completed5mClose: completed5m?.close ?? null,
    scannerState: event.scannerState ?? null,
    selected: [selected.direction, selected.setupType].filter(Boolean).join(' ') || null,
    entry: selected.entry ?? null,
    stop: selected.stop ?? null,
    t1: selected.target1 ?? null,
    t2: selected.target2 ?? null,
    shouldSend: discord?.shouldSend ?? null,
    reason: discord?.sendOrSuppressReason ?? null,
  };
}

function currentSessionDeliveryRows(tradeDate: string): Array<Record<string, unknown>> {
  const statePath = path.join('tools', 'automation', '.nt-scanner-state.json');
  const state = readJsonFile(statePath);
  if (!state || typeof state !== 'object') return [];
  const deliveries = (state as { alertDeliveries?: Record<string, Record<string, unknown>> }).alertDeliveries || {};
  return Object.entries(deliveries)
    .filter(([key, value]) => key.includes(`${tradeDate}|MES|morning|`) || value.tradeDate === tradeDate && value.session === 'morning')
    .map(([key, value]) => ({ key, ...value }) as Record<string, unknown>)
    .sort((left, right) => {
      const leftTime = String(left.attemptedAt || left.sentAt || '');
      const rightTime = String(right.attemptedAt || right.sentAt || '');
      return rightTime.localeCompare(leftTime);
    });
}

function compactService(status: SupervisorStatusPayload, serviceId: string): { status: string; pid: number | null; startedAt: string | null } {
  const service = status.childServices.find((item) => item.id === serviceId);
  return {
    status: service?.status || 'missing',
    pid: service?.pid || null,
    startedAt: service?.startedAt || null,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const findings: Finding[] = [];
  const status = await readSupervisorStatus();

  if (!status) {
    add(findings, 'BLOCK', 'Supervisor', 'Supervisor status endpoint is not reachable. Start or restart Quant Desk Supervisor.');
  } else {
    add(findings, status.supervisor.status === 'ready' ? 'PASS' : 'BLOCK', 'Supervisor', `Status=${status.supervisor.status}; pid=${status.supervisor.pid}.`);
    add(findings, status.health?.status === 'ok' ? 'PASS' : 'BLOCK', 'Health', `Health=${status.health?.status || 'missing'}.`);

    const scanner = compactService(status, 'scanner');
    const recorder = compactService(status, 'candle-recorder');
    add(findings, scanner.status === 'running' ? 'PASS' : 'BLOCK', 'Scanner process', `Status=${scanner.status}; pid=${scanner.pid}; started=${scanner.startedAt || 'n/a'}.`);
    add(findings, recorder.status === 'running' ? 'PASS' : 'BLOCK', 'Recorder process', `Status=${recorder.status}; pid=${recorder.pid}; started=${recorder.startedAt || 'n/a'}.`);

    const bridge = status.health?.checks.find((item) => item.id === 'bridge');
    add(findings, bridge?.status === 'ok' ? 'PASS' : 'BLOCK', 'NinjaTrader bridge', bridge?.message || 'Bridge health check missing.');

    const discord = status.health?.checks.find((item) => item.id === 'discord_config');
    add(findings, discord?.status === 'ok' ? 'PASS' : 'BLOCK', 'Discord config', discord?.message || 'Discord config check missing.');

    const heartbeat = status.health?.checks.find((item) => item.id === 'recorder_heartbeat');
    add(findings, heartbeat?.status === 'ok' ? 'PASS' : 'BLOCK', 'Recorder heartbeat', heartbeat?.message || 'Recorder heartbeat check missing.');

    const staleBlockers = status.delivery?.staleDataBlockers || [];
    add(findings, staleBlockers.length === 0 ? 'PASS' : 'BLOCK', 'Stale data blockers', staleBlockers.length ? staleBlockers.join(' | ') : 'No stale data blockers.');

    const pendingGaps = status.delivery?.pendingMarketDataGapSync?.count ?? 0;
    const staleGaps = status.delivery?.pendingMarketDataGapSync?.staleCount ?? 0;
    add(findings, pendingGaps === 0 && staleGaps === 0 ? 'PASS' : 'WARN', 'Market data gap sync', `Pending=${pendingGaps}; stale=${staleGaps}.`);

    const failed = status.delivery?.failedDeliveries || [];
    const pending = status.delivery?.pendingDeliveries || [];
    add(findings, failed.length === 0 ? 'PASS' : 'BLOCK', 'Failed Discord deliveries', failed.length ? failed.slice(0, 3).map((item) => item.error || item.alertKey).join(' | ') : 'No failed deliveries.');
    add(findings, pending.length === 0 ? 'PASS' : 'WARN', 'Pending Discord deliveries', pending.length ? pending.slice(0, 3).map((item) => item.alertKey).join(' | ') : 'No pending deliveries.');
  }

  const morningRows = currentSessionDeliveryRows(args.tradeDate);
  const skipped = morningRows.filter((row) => row.deliveryStatus === 'skipped');
  const sent = morningRows.filter((row) => row.deliveryStatus === 'sent');
  add(
    findings,
    skipped.length === 0 ? 'PASS' : 'WARN',
    `${args.tradeDate} morning suppressions`,
    skipped.length
      ? `${skipped.length} skipped morning delivery record(s). Latest: ${String(skipped[0].error || skipped[0].key).slice(0, 260)}`
      : 'No skipped morning delivery records for this trade date.',
  );
  add(
    findings,
    sent.length > 0 ? 'PASS' : 'WARN',
    `${args.tradeDate} morning sent receipts`,
    sent.length
      ? `${sent.length} sent morning delivery record(s). Latest message=${sent[0].discordMessageId || 'n/a'}.`
      : 'No morning trade/report receipt yet. This is normal before a qualifying morning candidate appears.',
  );

  const tape = latestDecisionTapeSummary(args.tradeDate);
  add(
    findings,
    tape ? 'PASS' : 'WARN',
    `${args.tradeDate} morning decision tape`,
    tape ? JSON.stringify(tape) : 'No morning decision tape yet. This is normal before the morning scanner window starts.',
  );

  const blocked = findings.filter((item) => item.severity === 'BLOCK');
  const warned = findings.filter((item) => item.severity === 'WARN');
  const report = {
    sourceOfTruth: 'morning_delivery_preflight',
    generatedAt: new Date().toISOString(),
    tradeDate: args.tradeDate,
    status: blocked.length ? 'BLOCK' : warned.length ? 'WARN' : 'PASS',
    command: 'npm run morning:delivery-preflight',
    findings,
    boundaries: {
      readOnly: true,
      postsDiscord: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
    },
  };

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`Morning Delivery Preflight: ${report.status}\n`);
    process.stdout.write(`Trade date: ${args.tradeDate}\n`);
    for (const item of findings) {
      process.stdout.write(`[${item.severity}] ${item.label}: ${item.detail}\n`);
    }
    process.stdout.write('Read-only: no Discord posts, no scanner state changes, no trading logic changes.\n');
  }

  if (blocked.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
