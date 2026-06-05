import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSupervisorConfig } from './config';
import { createSupervisorLogger } from './logger';
import { isProcessRunning, launchEnabledServices, stopOwnedServices } from './processManager';
import { buildSupervisorStatus } from './status';

const defaultConfig = loadSupervisorConfig({}, 'C:\\quant-desk');
assert.equal(defaultConfig.status, 'valid');
assert.equal(defaultConfig.config.host, '127.0.0.1');
assert.equal(defaultConfig.config.port, 8797);
assert.equal(defaultConfig.config.statusPath, '/status');
assert.equal(defaultConfig.config.childServices.length, 4);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.enabled, true);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'scanner')?.enabled, true);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'companion-proxy')?.enabled, false);
assert.equal(defaultConfig.config.childServices.find((service) => service.id === 'discord-alerts')?.enabled, false);

const fixedNow = new Date('2026-06-05T12:00:00.000Z');
const status = buildSupervisorStatus(defaultConfig, null, fixedNow);
assert.equal(status.supervisor.name, 'quant-desk-local-supervisor');
assert.equal(status.supervisor.phase, 'phase_2_hidden_process_launcher');
assert.equal(status.supervisor.status, 'ready');
assert.equal(status.supervisor.timestamp, '2026-06-05T12:00:00.000Z');
assert.equal(status.config.status, 'valid');
assert.equal(status.boundaries.startsChildProcesses, true);
assert.equal(status.boundaries.autoRestartsChildProcesses, false);
assert.equal(status.boundaries.changesTradingLogic, false);
assert.equal(status.boundaries.changesScannerBehavior, false);
assert.equal(status.boundaries.changesBridgeBehavior, false);
assert.equal(status.boundaries.changesDiscordBehavior, false);
assert.equal(status.boundaries.changesCanExecuteBehavior, false);
assert.equal(JSON.stringify(status).includes('"canExecute":true'), false);

const invalidConfig = loadSupervisorConfig(
  {
    SUPERVISOR_HOST: '0.0.0.0',
    SUPERVISOR_PORT: '99999',
    SUPERVISOR_STATUS_PATH: 'status',
  },
  'C:\\quant-desk',
);
assert.equal(invalidConfig.status, 'invalid');
assert.equal(invalidConfig.config.host, '0.0.0.0');
assert.equal(invalidConfig.config.port, 8797);
assert.equal(invalidConfig.config.statusPath, '/status');
assert.equal(invalidConfig.errors.length, 3);

const serviceFilteredConfig = loadSupervisorConfig(
  {
    SUPERVISOR_SERVICES: 'candle-recorder',
    SUPERVISOR_INSTRUMENT: 'MNQ',
    SUPERVISOR_BRIDGE_INSTRUMENT: 'MNQ 06-26',
    SUPERVISOR_BRIDGE_URL: 'http://127.0.0.1:8765',
  },
  'C:\\quant-desk',
);
assert.equal(serviceFilteredConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.enabled, true);
assert.equal(serviceFilteredConfig.config.childServices.find((service) => service.id === 'scanner')?.enabled, false);
assert.ok(serviceFilteredConfig.config.childServices.find((service) => service.id === 'candle-recorder')?.args.includes('MNQ'));

const statusSource = await import('./status');
assert.equal('runTradeDecisionPipeline' in statusSource, false);
assert.equal('scanSetupCandidates' in statusSource, false);

const supervisorDir = path.dirname(fileURLToPath(import.meta.url));
const protectedImportPatterns = [
  'setupScanner',
  'tradeDecisionPipeline',
  'tradePlan',
  'localScannerEngine',
  'ninjaTraderBridge',
  'discord-alert-format',
  'effectiveExecution',
];

for (const entry of fs.readdirSync(supervisorDir)) {
  if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
  const source = fs.readFileSync(path.join(supervisorDir, entry), 'utf8');
  for (const protectedPattern of protectedImportPatterns) {
    assert.equal(
      source.includes(protectedPattern),
      false,
      `Supervisor Phase 1 must not import or reference protected module ${protectedPattern} in ${entry}.`,
    );
  }
}

const tempLogsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quant-supervisor-test-'));
const processConfig = {
  host: '127.0.0.1',
  port: 8797,
  statusPath: '/status',
  logsDir: tempLogsDir,
  childServices: [
    {
      id: 'test-child',
      label: 'Supervisor test child',
      npmScript: 'supervisor:test-child',
      args: [],
      enabled: true,
    },
  ],
};
const logger = createSupervisorLogger(tempLogsDir);
const launchedState = launchEnabledServices(processConfig, logger);
const launchedChild = launchedState.services[0];
assert.equal(launchedChild.status, 'running');
assert.ok(launchedChild.pid);
assert.equal(isProcessRunning(launchedChild.pid), true);
assert.ok(fs.existsSync(launchedChild.stdoutLog));
assert.ok(fs.existsSync(launchedChild.stderrLog));

const stoppedState = stopOwnedServices(processConfig, logger);
const stoppedChild = stoppedState.services[0];
assert.equal(stoppedChild.status, 'stopped');
assert.equal(isProcessRunning(stoppedChild.pid), false);

console.log('Supervisor skeleton test verified.');
