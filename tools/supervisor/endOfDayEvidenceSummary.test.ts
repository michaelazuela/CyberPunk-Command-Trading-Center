import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildEndOfDayEvidenceSummary } from './endOfDayEvidenceSummary';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'end-of-day-evidence-summary-'));
const bundleRoot = path.join(tmp, 'bundles');
const bundleDir = path.join(bundleRoot, '2026-06-25', 'MES', 'morning');
await fs.mkdir(bundleDir, { recursive: true });

const signoffManifest = path.join(bundleDir, 'live-signoff-manifest-2026-06-25-MES-morning.json');
const scannerDecisionTape = path.join(bundleDir, 'scanner-decision-tape-2026-06-25-MES-morning.json');
const phase6ObserverJson = path.join(bundleDir, 'phase6-live-format-signoff-2026-06-25-MES-morning.observer.json');
const supervisorStatus = path.join(bundleDir, 'supervisor-status.json');
for (const filePath of [signoffManifest, scannerDecisionTape, phase6ObserverJson, supervisorStatus]) {
  await fs.writeFile(filePath, JSON.stringify({ ok: true }));
}
await fs.writeFile(path.join(bundleDir, 'manifest.json'), JSON.stringify({
  reportType: 'supervisor_end_of_day_evidence_bundle',
  phase: 'phase_10_end_of_day_evidence_bundle',
  generatedAt: '2026-06-25T16:00:00.000Z',
  authority: {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    startsChildProcesses: false,
    changesScannerState: false,
    changesTradingLogic: false,
    changesCanExecute: false,
  },
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  status: 'ready',
  signoffStatus: 'ready',
  phase6Status: 'pass',
  bundleDir,
  files: {
    signoffManifest,
    scannerDecisionTape,
    phase6ObserverJson,
    supervisorStatus,
  },
  failures: [],
  bottomLine: 'ready',
}));

const ready = await buildEndOfDayEvidenceSummary({
  bundleRoot,
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  json: false,
});
assert.equal(ready.reportType, 'supervisor_end_of_day_evidence_summary');
assert.equal(ready.phase, 'phase_11_operator_evidence_summary');
assert.equal(ready.status, 'ready');
assert.equal(ready.signoffStatus, 'ready');
assert.equal(ready.phase6Status, 'pass');
assert.deepEqual(ready.failures, []);
assert.equal(ready.authority.readOnly, true);
assert.equal(ready.authority.postsDiscord, false);
assert.equal(ready.authority.writesSupabase, false);
assert.equal(ready.authority.startsChildProcesses, false);
assert.equal(ready.authority.changesScannerState, false);
assert.equal(ready.authority.changesTradingLogic, false);
assert.equal(ready.authority.changesCanExecute, false);
assert.deepEqual(ready.filesPresent, {
  signoffManifest: true,
  scannerDecisionTape: true,
  phase6ObserverJson: true,
  supervisorStatus: true,
});
assert.match(ready.bottomLine, /Evidence bundle ready/);

await fs.rm(supervisorStatus);
const blocked = await buildEndOfDayEvidenceSummary({
  bundleRoot,
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  json: false,
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.filesPresent.supervisorStatus, false);
assert.ok(blocked.failures.includes('supervisorStatus missing'));

const missing = await buildEndOfDayEvidenceSummary({
  bundleRoot: path.join(tmp, 'missing-root'),
  json: false,
});
assert.equal(missing.status, 'missing');
assert.equal(missing.manifestPath, null);
assert.ok(missing.failures[0].includes('No end-of-day evidence bundle manifest'));
