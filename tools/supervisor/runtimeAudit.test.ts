import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const auditPath = path.join(root, 'tools', 'supervisor', 'runtimeAudit.ts');
const packageJsonPath = path.join(root, 'package.json');
const planPath = path.join(root, 'docs', 'LOCAL_RUNTIME_ISOLATION_PLAN.md');

const source = fs.readFileSync(auditPath, 'utf8');
const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

assert.ok(source.includes('buildSupervisorRuntimeAudit'));
assert.ok(source.includes('duplicateProcessesDetected'));
assert.ok(source.includes('StartupTaskAudit'));
assert.ok(source.includes('MultipleInstances'));
assert.ok(source.includes('readOnly: true'));
assert.ok(source.includes('stopsProcesses: false'));
assert.ok(source.includes('startsProcesses: false'));
assert.ok(source.includes('changesTradingLogic: false'));
assert.ok(source.includes('changesScannerBehavior: false'));
assert.ok(source.includes('changesCanExecute: false'));
assert.equal(source.includes('Stop-Process'), false);
assert.equal(source.includes('taskkill'), false);
assert.equal(source.includes('Start-Process'), false);
assert.equal(source.includes('npm run nt:scanner'), false);

assert.ok(packageJson.includes('"supervisor:audit": "tsx tools/supervisor/runtimeAudit.ts"'));
assert.ok(plan.includes('npm run supervisor:audit'));

console.log('Runtime audit source contract verified.');
