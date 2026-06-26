import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildObsoleteDirtyCodeCleanupAudit } from './obsolete-dirty-code-cleanup-audit';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-8-45-cleanup-audit-'));
fs.mkdirSync(path.join(root, 'tools', 'automation'), { recursive: true });
fs.mkdirSync(path.join(root, 'src', 'agents'), { recursive: true });
fs.mkdirSync(path.join(root, 'src', 'config'), { recursive: true });

fs.writeFileSync(
  path.join(root, 'tools', 'automation', 'nt-scanner.ts'),
  [
    "const title = 'Desk Play - Conditional Planning Levels';",
    "function discordRagServiceHeaders() { return {}; }",
    "const directGemini = '/api/gemini';",
  ].join('\n'),
  'utf8',
);

fs.writeFileSync(
  path.join(root, 'tools', 'automation', 'discord-alert-format.ts'),
  [
    "return 'NO TRADE - no active executable plan';",
    "return 'Stand down. Recheck at next scheduled scan.';",
  ].join('\n'),
  'utf8',
);

fs.writeFileSync(
  path.join(root, 'src', 'agents', 'legacyAgent.ts'),
  "const wording = 'approved model';\nconst window = '09:15';\n",
  'utf8',
);

fs.writeFileSync(
  path.join(root, 'src', 'config', 'timeWindows.ts'),
  "export const label = '09:15';\n",
  'utf8',
);

const report = buildObsoleteDirtyCodeCleanupAudit(root);

assert.equal(report.reportType, 'phase_8_45_obsolete_dirty_code_cleanup_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.ok(report.filesScanned >= 4);
assert.ok(report.summary.removalReady >= 3);
assert.ok(report.summary.deferredForReview >= 3);
assert.ok(report.findings.some((finding) => finding.ruleId === 'obsolete-desk-play-wording-guarded'));
assert.ok(report.findings.some((finding) => finding.ruleId === 'local-rag-persistence-duplication'));
assert.ok(report.findings.some((finding) => finding.ruleId === 'automation-gemini-active-path-risk'));
assert.ok(report.findings.some((finding) => finding.ruleId === 'formatter-no-trade-collapse-risk'));
assert.ok(report.findings.some((finding) => finding.ruleId === 'legacy-approved-authority-language'));
assert.ok(report.findings.some((finding) => finding.ruleId === 'hardcoded-active-window-risk'));
assert.ok(!report.findings.some((finding) => finding.file === 'src/config/timeWindows.ts'));
assert.ok(report.markdown.includes('No code removal was performed in this phase') || report.markdown.includes('## Removal Plan'));
assert.ok(report.markdown.includes('This audit does not loosen `canExecute`'));

console.log('Phase 8.45 obsolete/dirty code cleanup audit test verified.');
