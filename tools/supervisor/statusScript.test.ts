import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const statusScriptPath = path.join(root, 'Status-QuantDesk.ps1');
const planPath = path.join(root, 'docs', 'LOCAL_RUNTIME_ISOLATION_PLAN.md');

const source = fs.readFileSync(statusScriptPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

assert.ok(source.includes('npm run supervisor:status'));
assert.ok(source.includes('npm.cmd run --silent supervisor:audit'));
assert.ok(source.includes('Runtime Ownership Summary'));
assert.ok(source.includes('duplicateProcessesDetected'));
assert.ok(source.includes('externalPids'));
assert.ok(source.includes('processTreePids'));
assert.ok(source.includes('scanner'));
assert.ok(source.includes('candle-recorder'));
assert.ok(source.includes('Recorder heartbeat is'));
assert.ok(source.includes('npm run supervisor:repair'));
assert.ok(source.includes('Repair-QuantDesk-Runtime.ps1 -Apply'));

assert.equal(source.includes('Stop-Process'), false);
assert.equal(source.includes('Start-Process'), false);
assert.equal(source.includes('taskkill'), false);
assert.equal(source.includes('supervisor:start'), false);
assert.equal(source.includes('supervisor:stop'), false);
assert.equal(source.includes('nt:scanner'), false);
assert.equal(source.includes('nt:candle-recorder'), false);
assert.equal(source.includes('WEBHOOK'), false);
assert.equal(source.includes('SUPABASE_SERVICE_ROLE_KEY'), false);

assert.ok(plan.includes('Status-QuantDesk.ps1'));
assert.ok(plan.includes('operator-facing status summary'));
assert.ok(plan.includes('does not stop processes'));

console.log('Status script safety contract verified.');
