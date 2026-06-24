import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadSupervisorConfig } from './config';
import { buildHealthReport, isFuturesDailyMaintenanceBreak } from './health';
import type { SupervisorState } from './processManager';

function withHeartbeatPath(rawPath: string) {
  const result = loadSupervisorConfig({ SUPERVISOR_SERVICES: 'candle-recorder' }, process.cwd());
  assert.equal(result.status, 'valid');
  return {
    ...result.config,
    childServices: result.config.childServices.map((service) => service.id === 'candle-recorder'
      ? { ...service, args: [...service.args, '--heartbeat-path', rawPath] }
      : service),
  };
}

function state(): SupervisorState {
  return {
    supervisorPid: process.pid,
    startedAt: '2026-06-24T20:00:00.000Z',
    statePath: path.join(process.cwd(), 'logs', 'supervisor', 'supervisor-state.json'),
    services: [],
  };
}

async function heartbeatCheckAt(args: {
  now: Date;
  updatedAt: string;
  status: 'ok' | 'warn' | 'error';
  warning?: string | null;
}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quant-desk-health-'));
  const heartbeatPath = path.join(tempDir, 'candle-recorder-heartbeat.json');
  fs.writeFileSync(heartbeatPath, JSON.stringify({
    status: args.status,
    updatedAt: args.updatedAt,
    latestCompleted5m: '2026-06-24T17:00:00-04:00',
    barsProcessed: 10,
    warning: args.warning ?? 'Latest completed 5M is stale.',
  }));
  const config = withHeartbeatPath(heartbeatPath);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ ok: true, defaultInstrument: 'MES' }), { status: 200 })) as typeof fetch;
  try {
    const report = await buildHealthReport(config, state(), args.now, {});
    const check = report.checks.find((item) => item.id === 'recorder_heartbeat');
    assert.ok(check);
    return check;
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const maintenanceBreak = new Date('2026-06-24T21:15:00.000Z');
const beforeBreak = new Date('2026-06-24T20:59:00.000Z');
const afterBreak = new Date('2026-06-24T22:05:00.000Z');
assert.equal(isFuturesDailyMaintenanceBreak(maintenanceBreak), true);
assert.equal(isFuturesDailyMaintenanceBreak(beforeBreak), false);
assert.equal(isFuturesDailyMaintenanceBreak(afterBreak), false);

const maintenanceCheck = await heartbeatCheckAt({
  now: maintenanceBreak,
  updatedAt: '2026-06-24T21:14:30.000Z',
  status: 'warn',
});
assert.equal(maintenanceCheck.status, 'ok');
assert.match(maintenanceCheck.message, /futures maintenance break/);
assert.equal(maintenanceCheck.details?.expectedMarketPause, 'futures_maintenance_break');

const activeSessionCheck = await heartbeatCheckAt({
  now: beforeBreak,
  updatedAt: '2026-06-24T20:58:30.000Z',
  status: 'warn',
});
assert.equal(activeSessionCheck.status, 'warn');
assert.match(activeSessionCheck.message, /reported a warning/);
assert.equal(activeSessionCheck.details?.expectedMarketPause, null);

const staleHeartbeatDuringBreak = await heartbeatCheckAt({
  now: maintenanceBreak,
  updatedAt: '2026-06-24T20:00:00.000Z',
  status: 'warn',
});
assert.equal(staleHeartbeatDuringBreak.status, 'warn');
assert.match(staleHeartbeatDuringBreak.message, /heartbeat is stale/);
