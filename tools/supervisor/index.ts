import http from 'node:http';
import dotenv from 'dotenv';
import { loadSupervisorConfig } from './config';
import { createSupervisorLogger } from './logger';
import {
  getSupervisorState,
  launchEnabledServices,
  stopOwnedServices,
  stopSupervisorProcess,
} from './processManager';
import { buildSupervisorStatus } from './status';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runSupervisorCheck(): Promise<void> {
  const configResult = loadSupervisorConfig();
  printJson(buildSupervisorStatus(configResult, getSupervisorState(configResult.config)));
  if (configResult.status !== 'valid') process.exitCode = 1;
}

export async function runSupervisorStop(): Promise<void> {
  const configResult = loadSupervisorConfig();
  const logger = createSupervisorLogger(configResult.config.logsDir);
  const state = stopOwnedServices(configResult.config, logger);
  printJson(buildSupervisorStatus(configResult, state));
  stopSupervisorProcess(configResult.config, logger);
}

export function startSupervisor(): http.Server {
  const configResult = loadSupervisorConfig();
  const logger = createSupervisorLogger(configResult.config.logsDir);
  logger.log('info', 'Supervisor starting.', {
    phase: 'phase_2_hidden_process_launcher',
    startsChildProcesses: true,
    autoRestartsChildProcesses: false,
  });
  let supervisorState = launchEnabledServices(configResult.config, logger);

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${configResult.config.host}:${configResult.config.port}`);
    if (request.method === 'GET' && url.pathname === configResult.config.statusPath) {
      supervisorState = getSupervisorState(configResult.config);
      const status = buildSupervisorStatus(configResult, supervisorState);
      logger.log('info', 'Status requested.', { path: url.pathname, configStatus: status.config.status });
      response.writeHead(configResult.status === 'valid' ? 200 : 500, {
        'Content-Type': 'application/json',
      });
      response.end(JSON.stringify(status, null, 2));
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not_found' }));
  });

  const shutdown = () => {
    logger.log('info', 'Supervisor shutting down.');
    stopOwnedServices(configResult.config, logger);
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  server.listen(configResult.config.port, configResult.config.host, () => {
    logger.log('info', 'Supervisor listening.', {
      host: configResult.config.host,
      port: configResult.config.port,
      statusPath: configResult.config.statusPath,
    });
    process.stdout.write(
      `Quant Desk Local Supervisor listening on http://${configResult.config.host}:${configResult.config.port}${configResult.config.statusPath}\n`,
    );
  });

  return server;
}

const command = process.argv[2] || 'start';

if (command === 'check') {
  await runSupervisorCheck();
} else if (command === 'start') {
  startSupervisor();
} else if (command === 'status') {
  await runSupervisorCheck();
} else if (command === 'stop') {
  await runSupervisorStop();
} else {
  process.stderr.write('Usage: tsx tools/supervisor/index.ts [start|check|status|stop]\n');
  process.exitCode = 1;
}
