import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAuthorityLanguageAudit } from './authority-language-audit';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-8-5-authority-language-'));
fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
fs.mkdirSync(path.join(root, 'tools', 'automation'), { recursive: true });

const liveFile = path.join(root, 'src', 'lib', 'liveSurface.ts');
const preciseContent = [
  'const authority = {',
  '  registeredModel: true,',
  '  activeModel: true,',
  '  watchEligible: true,',
  '  planEligible: true,',
  '  discordEligible: true,',
  '  executionEligible: false,',
  '  humanReviewOnly: true,',
  '  canExecute: false,',
  '};',
  'const bestApprovedModel = authority.activeModel;',
  '// @deprecated selectedApprovedModel is compatibility only.',
].join('\n');

fs.writeFileSync(liveFile, preciseContent, 'utf8');

const passReport = buildAuthorityLanguageAudit(root, ['src/lib/liveSurface.ts']);
assert.equal(passReport.reportType, 'phase_8_5_authority_language_audit');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.readOnly, true);
assert.equal(passReport.authority.postsDiscord, false);
assert.equal(passReport.authority.writesSupabase, false);
assert.equal(passReport.authority.changesScannerBehavior, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.authority.changesCanExecute, false);
assert.equal(passReport.authority.changesEntryStopTargets, false);
assert.deepEqual(passReport.findings, []);
assert.ok(passReport.markdown.includes('They are not new gates.'));
assert.ok(passReport.markdown.includes('Existing deterministic `canExecute` remains the execution boundary.'));

fs.writeFileSync(
  liveFile,
  `${preciseContent}\nconst reason = 'Approved model route has complete levels.';\n`,
  'utf8',
);
const failReport = buildAuthorityLanguageAudit(root, ['src/lib/liveSurface.ts']);
assert.equal(failReport.status, 'fail');
assert.ok(failReport.findings.some((finding) => finding.reason.includes('"approved model"')));

fs.writeFileSync(liveFile, preciseContent.replace('humanReviewOnly: true,', ''), 'utf8');
const missingTermReport = buildAuthorityLanguageAudit(root, ['src/lib/liveSurface.ts']);
assert.equal(missingTermReport.status, 'fail');
assert.ok(missingTermReport.findings.some((finding) => finding.reason.includes('"humanReviewOnly"')));

console.log('Phase 8.5 authority language audit test verified.');
