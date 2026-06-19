import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const repairPath = path.join(root, 'Repair-QuantDesk-Runtime.ps1');
const packageJsonPath = path.join(root, 'package.json');
const planPath = path.join(root, 'docs', 'LOCAL_RUNTIME_ISOLATION_PLAN.md');

const source = fs.readFileSync(repairPath, 'utf8');
const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

assert.ok(source.includes('[switch]$Apply'));
assert.ok(source.includes('Preview only. No processes were stopped.'));
assert.ok(source.includes('supervisor:audit'));
assert.ok(source.includes('externalPids'));
assert.ok(source.includes('processTreePids'));
assert.ok(source.includes("'scanner'"));
assert.ok(source.includes("'candle-recorder'"));
assert.ok(source.includes('Stop-Process -Id $target.Pid -Force'));
assert.ok(source.includes('Get-Process -Id $target.Pid'));
assert.ok(source.includes('$ownedPids.Contains($processId)'));
assert.ok(source.includes('No startup, no restart, no Discord, no trading logic changes.'));
assert.equal(source.includes('foreach ($pid'), false);

assert.equal(source.includes('taskkill'), false);
assert.equal(source.includes('Start-Process'), false);
assert.equal(source.includes('npm run nt:scanner'), false);
assert.equal(source.includes('npm run nt:candle-recorder'), false);
assert.equal(source.includes('supervisor:start'), false);
assert.equal(source.includes('supervisor:stop'), false);

assert.ok(packageJson.includes('"supervisor:repair": "powershell -NoProfile -ExecutionPolicy Bypass -File ./Repair-QuantDesk-Runtime.ps1"'));
assert.ok(plan.includes('Repair-QuantDesk-Runtime.ps1'));
assert.ok(plan.includes('Preview mode is the default'));
assert.ok(plan.includes('external duplicate scanner/recorder'));

console.log('Runtime repair script safety contract verified.');
