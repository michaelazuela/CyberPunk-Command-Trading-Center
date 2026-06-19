import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cleanupPath = path.join(root, 'tools', 'supervisor', 'runtimeJsonCleanup.ts');
const packageJsonPath = path.join(root, 'package.json');
const planPath = path.join(root, 'docs', 'LOCAL_RUNTIME_ISOLATION_PLAN.md');

const source = fs.readFileSync(cleanupPath, 'utf8');
const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

assert.ok(source.includes('cleanupRuntimeJsonTempFilesSync'));
assert.ok(source.includes("hasArg('apply')"));
assert.ok(source.includes("mode: apply ? 'apply' : 'preview'"));
assert.ok(source.includes('deletesOnlyRuntimeJsonTempFiles: true'));
assert.ok(source.includes('changesTradingLogic: false'));
assert.ok(source.includes('changesScannerBehavior: false'));
assert.ok(source.includes('changesCanExecute: false'));
assert.ok(source.includes("'logs', 'supervisor'"));
assert.ok(source.includes("'tools', 'automation'"));
assert.ok(source.includes("'discord-audit'"));

assert.equal(source.includes('Stop-Process'), false);
assert.equal(source.includes('Start-Process'), false);
assert.equal(source.includes('taskkill'), false);
assert.equal(source.includes('supervisor:start'), false);
assert.equal(source.includes('supervisor:stop'), false);
assert.equal(source.includes('nt:scanner'), false);
assert.equal(source.includes('nt:candle-recorder'), false);

assert.ok(packageJson.includes('"supervisor:cleanup-json": "tsx tools/supervisor/runtimeJsonCleanup.ts"'));
assert.ok(plan.includes('npm run supervisor:cleanup-json'));
assert.ok(plan.includes('Preview mode'));

console.log('Runtime JSON cleanup script safety contract verified.');
