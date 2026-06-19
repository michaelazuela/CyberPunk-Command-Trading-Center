import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bundlePath = path.join(root, 'Export-QuantDesk-HealthBundle.ps1');
const packageJsonPath = path.join(root, 'package.json');
const planPath = path.join(root, 'docs', 'LOCAL_RUNTIME_ISOLATION_PLAN.md');

const source = fs.readFileSync(bundlePath, 'utf8');
const packageJson = fs.readFileSync(packageJsonPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

assert.ok(source.includes('logs\\supervisor\\health-bundles'));
assert.ok(source.includes('supervisor:status'));
assert.ok(source.includes('supervisor:audit'));
assert.ok(source.includes('supervisor:repair'));
assert.ok(source.includes('supervisor:cleanup-json'));
assert.ok(source.includes('Status-QuantDesk.ps1'));
assert.ok(source.includes('cleanupPreviewOnly = $true'));
assert.ok(source.includes('stopsProcesses = $false'));
assert.ok(source.includes('startsProcesses = $false'));
assert.ok(source.includes('postsDiscord = $false'));
assert.ok(source.includes('changesTradingLogic = $false'));
assert.ok(source.includes('changesScannerBehavior = $false'));
assert.ok(source.includes('changesCanExecute = $false'));
assert.ok(source.includes('manifest.json'));

assert.equal(source.includes('-Apply'), false);
assert.equal(source.includes('--apply'), false);
assert.equal(source.includes('Stop-Process'), false);
assert.equal(source.includes('Start-Process'), false);
assert.equal(source.includes('taskkill'), false);
assert.equal(source.includes('supervisor:start'), false);
assert.equal(source.includes('supervisor:stop'), false);
assert.equal(source.includes('nt:scanner'), false);
assert.equal(source.includes('nt:candle-recorder'), false);

assert.ok(packageJson.includes('"supervisor:health-bundle": "powershell -NoProfile -ExecutionPolicy Bypass -File ./Export-QuantDesk-HealthBundle.ps1"'));
assert.ok(plan.includes('Export-QuantDesk-HealthBundle.ps1'));
assert.ok(plan.includes('health-bundles'));

console.log('Health bundle script safety contract verified.');
