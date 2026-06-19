import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const installScriptPath = path.join(root, 'Install-QuantDesk-StartupTask.ps1');
const uninstallScriptPath = path.join(root, 'Uninstall-QuantDesk-StartupTask.ps1');
const planPath = path.join(root, 'docs', 'LOCAL_RUNTIME_ISOLATION_PLAN.md');

const installScript = fs.readFileSync(installScriptPath, 'utf8');
const uninstallScript = fs.readFileSync(uninstallScriptPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

assert.ok(installScript.includes("Quant Desk Local Supervisor"));
assert.ok(installScript.includes('Launch-QuantDeskSupervisorTray.vbs'));
assert.ok(installScript.includes('New-ScheduledTaskTrigger -AtLogOn'));
assert.ok(installScript.includes('-MultipleInstances IgnoreNew'));
assert.ok(installScript.includes('RunLevel Limited'));
assert.ok(installScript.includes('Status-QuantDesk.ps1'));
assert.equal(installScript.includes('nt:scanner'), false);
assert.equal(installScript.includes('nt:candle-recorder'), false);
assert.equal(installScript.includes('WEBHOOK'), false);
assert.equal(installScript.includes('SUPABASE_SERVICE_ROLE_KEY'), false);

assert.ok(uninstallScript.includes('Unregister-ScheduledTask'));
assert.ok(uninstallScript.includes("Quant Desk Local Supervisor"));
assert.equal(uninstallScript.includes('nt:scanner'), false);
assert.equal(uninstallScript.includes('WEBHOOK'), false);

assert.ok(plan.includes('Install-QuantDesk-StartupTask.ps1'));
assert.ok(plan.includes('Uninstall-QuantDesk-StartupTask.ps1'));
assert.ok(plan.includes('The startup task launches the tray/supervisor wrapper, not scanner child commands directly.'));

console.log('Windows startup script tests passed.');
