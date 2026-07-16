import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildLegacyDeskFieldAudit } from './legacy-desk-field-audit';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-desk-field-audit-'));

function write(relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

write('src/lib/current.ts', [
  'const deskTicket = state.deskTicket;',
  'const deskPublishDecision = audit.deskPublishDecision;',
  'const candidateLifecycleTrace = state.candidateLifecycleTrace;',
].join('\n'));

write('tools/automation/discord-alert-format.ts', [
  'const play = args.deskState?.primaryDeskPlay;',
  'const long = args.deskState?.bestLongPlan;',
].join('\n'));

write('tools/automation/scanner-behavior-audit.ts', [
  'const selected = event.setupCandidateStatus?.selected;',
  'const entry = event.plan.entry;',
].join('\n'));

write('tools/automation/discord-audit/scanner-decision-tape-test.json', JSON.stringify({
  deskState: { primaryDeskPlay: { direction: 'SHORT' } },
  setupCandidateStatus: { selected: { direction: 'SHORT' } },
}));

const report = buildLegacyDeskFieldAudit(root, { includeArtifacts: true });

assert.equal(report.reportType, 'legacy_desk_field_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.ok(report.summary.keep_canonical >= 2);
assert.ok(report.summary.keep_current_support >= 1);
assert.ok(report.summary.blocked_still_used >= 2);
assert.ok(report.summary.deprecated_read_only >= 2);
assert.ok(report.summary.safe_to_archive_from_artifacts >= 1);
assert.ok(report.cleanupPlan.some((item) => item.includes('public consumers still read legacy/support fields')));
assert.ok(report.markdown.includes('Legacy Desk Field Audit'));

console.log('Legacy Desk field audit verified.');
