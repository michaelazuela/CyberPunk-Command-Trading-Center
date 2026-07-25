import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { repairAuditTargetFiles, repairDuplicateAuditTargets } from './audit-target-repair';

const fixture = {
  source: 'live-scanner',
  candidate: {
    setupType: 'raidReclaim',
    direction: 'SHORT',
    entry: 7338.25,
    stop: 7360.5,
    target1: 7247,
    target2: 7247,
  },
  setupCandidateStatus: {
    statuses: [{
      setupType: 'raidReclaim',
      direction: 'SHORT',
      entry: 7338.25,
      stop: 7360.5,
      target1: 7247,
      target2: 7247,
    }],
  },
};

const repaired = repairDuplicateAuditTargets(JSON.parse(JSON.stringify(fixture)));
assert.equal(repaired.repairs, 2);
assert.equal((repaired.value as any).candidate.target1, 7305);
assert.equal((repaired.value as any).candidate.target2, 7293.75);
assert.equal((repaired.value as any).candidate.targetRepair.previousTarget1, 7247);
assert.equal((repaired.value as any).setupCandidateStatus.statuses[0].target1, 7305);
assert.equal((repaired.value as any).setupCandidateStatus.statuses[0].target2, 7293.75);

const noOp = repairDuplicateAuditTargets({
  candidate: {
    direction: 'LONG',
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
  },
});
assert.equal(noOp.repairs, 0);

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-target-repair-'));
try {
  const auditPath = path.join(tmp, 'scanner-decision-tape-2026-06-10-MES-morning.json');
  await fs.writeFile(auditPath, JSON.stringify(fixture, null, 2));
  const summary = await repairAuditTargetFiles(tmp);
  assert.equal(summary.filesChecked, 1);
  assert.equal(summary.filesUpdated, 1);
  assert.equal(summary.repairs, 2);
  const parsed = JSON.parse(await fs.readFile(auditPath, 'utf8'));
  assert.equal(parsed.candidate.target1, 7305);
  assert.equal(parsed.candidate.target2, 7293.75);
} finally {
  await fs.rm(tmp, { recursive: true, force: true });
}

console.log('Audit target repair verified.');
