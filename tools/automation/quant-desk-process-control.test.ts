import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  clearQuantDeskMaintenanceLock,
  createQuantDeskMaintenanceLock,
  readQuantDeskMaintenanceStatus,
} from './quant-desk-maintenance';
import {
  findQuantDeskAutomationProcesses,
  isQuantDeskAutomationCommandLine,
  stopAllQuantDeskAutomation,
  type QuantDeskProcessInfo,
} from './quant-desk-process-control';

const cwd = path.join(os.tmpdir(), 'quant-desk-process-control-test');
fs.rmSync(cwd, { recursive: true, force: true });
fs.mkdirSync(path.join(cwd, 'tools', 'automation'), { recursive: true });

const supervisorCommand = `"C:/Program Files/nodejs/node.exe" "${cwd}/node_modules/tsx/dist/cli.mjs" tools/supervisor/index.ts start`;
const recorderCommand = `"node" "${cwd}/node_modules/tsx/dist/cli.mjs" tools/automation/candle-recorder.ts --instrument MES`;
const unrelatedViteCommand = `"node" "C:/Users/Mike/Documents/IMS Schedule Builder/node_modules/vite/bin/vite.js" --port 3000`;

assert.equal(isQuantDeskAutomationCommandLine(supervisorCommand, cwd), true);
assert.equal(isQuantDeskAutomationCommandLine(recorderCommand, cwd), true);
assert.equal(isQuantDeskAutomationCommandLine(unrelatedViteCommand, cwd), false);

const fakeProcesses: QuantDeskProcessInfo[] = [
  { pid: 10, parentPid: null, name: 'node.exe', commandLine: supervisorCommand },
  { pid: 11, parentPid: 10, name: 'cmd.exe', commandLine: 'cmd child of supervisor' },
  { pid: 20, parentPid: null, name: 'node.exe', commandLine: recorderCommand },
  { pid: 30, parentPid: null, name: 'node.exe', commandLine: unrelatedViteCommand },
];
const matched = findQuantDeskAutomationProcesses({ cwd, processes: fakeProcesses, currentPid: 999 }).map((item) => item.pid).sort();
assert.deepEqual(matched, [10, 11, 20]);

const inactive = readQuantDeskMaintenanceStatus({ cwd });
assert.equal(inactive.active, false);
const active = createQuantDeskMaintenanceLock({ cwd, reason: 'test maintenance', owner: 'test', action: 'test' });
assert.equal(active.active, true);
assert.equal(active.lock?.reason, 'test maintenance');
const cleared = clearQuantDeskMaintenanceLock({ cwd });
assert.equal(cleared.active, false);

const noProcessStop = stopAllQuantDeskAutomation({ cwd, processes: [], currentPid: 999, reason: 'test stop-all' });
assert.equal(noProcessStop.ok, true);
assert.equal(noProcessStop.matchedProcesses.length, 0);
assert.equal(noProcessStop.maintenance.active, true);

clearQuantDeskMaintenanceLock({ cwd });
fs.rmSync(cwd, { recursive: true, force: true });

console.log('quant desk stop-all and maintenance lock loopback verified.');
