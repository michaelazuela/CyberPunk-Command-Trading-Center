import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDeskPublishContractAudit } from './desk-publish-contract-audit';

function write(root: string, relative: string, content: string): void {
  const fullPath = path.join(root, relative);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

const report = buildDeskPublishContractAudit();
assert.equal(report.reportType, 'phase_3c_desk_publish_contract_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.findings.length, 0);
assert.ok(report.markdown.includes('DeskPublishDecision is the only public Desk Play publish contract'));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-3c-desk-publish-contract-'));
write(root, 'src/lib/localScannerEngine.ts', [
  'export interface DeskPublishDecision {}',
  'export function buildDeskPublishDecision() {}',
  "sourceOfTruth: 'scanner_desk_publish_decision'",
  'public output requires canonical selected-candidate ownership or counter-scenario marking',
].join('\n'));
write(root, 'tools/automation/nt-scanner.ts', [
  'buildDeskPublishDecision',
  'assertScannerDeskPublishArtifactAgreement',
  'DeskPublishDecision artifact agreement failed',
  'chart context line',
  'Canonical DeskPublishDecision line in the sand.',
  'prepareLiveScannerDeskPlayAlertArtifacts',
  'args.publishDecision?.shouldPost && args.publishDecision.hasCompletePlan',
  'scannerDeskPlanRefreshMateriallyMatches',
  'scannerDeskPlayPublicCadenceHoldReason',
].join('\n'));
write(root, 'tools/automation/discord-alert-format.ts', [
  'import { buildDeskPublishDecision } from "../../src/lib/localScannerEngine";',
  'export interface CompactDeskStateForDiscord {}',
  'const deskTicket = true;',
  'const footer = "Decision support only. No automated orders.";',
  'void buildDeskPublishDecision;',
].join('\n'));
write(root, 'tools/automation/discord-scheduler.ts', [
  'const note = "scheduler fixture";',
].join('\n'));
write(root, 'tools/automation/nt-scanner-alert.test.ts', [
  'SCANNER-DESK-PLAY-CANONICAL-LINE-FIXTURE',
  'DeskPublishDecision artifact agreement failed',
  'Canonical DeskPublishDecision held this Desk Play local.',
].join('\n'));

const formatterOwnershipReport = buildDeskPublishContractAudit(root);
assert.equal(formatterOwnershipReport.status, 'fail');
assert.ok(formatterOwnershipReport.findings.some((finding) => finding.file === 'tools/automation/discord-alert-format.ts' && finding.reason.includes('buildDeskPublishDecision')));

write(root, 'tools/automation/nt-scanner.ts', [
  'buildDeskPublishDecision',
  'assertScannerDeskPublishArtifactAgreement',
  'DeskPublishDecision artifact agreement failed',
  'Canonical DeskPublishDecision line in the sand.',
  'prepareLiveScannerDeskPlayAlertArtifacts',
  'args.publishDecision?.shouldPost && args.publishDecision.hasCompletePlan',
  'scannerDeskPlanRefreshMateriallyMatches',
  'scannerDeskPlayPublicCadenceHoldReason',
].join('\n'));
write(root, 'tools/automation/discord-alert-format.ts', [
  'export interface CompactDeskStateForDiscord {}',
  'const deskTicket = true;',
  'const footer = "Decision support only. No automated orders.";',
].join('\n'));

const missingChartLineReport = buildDeskPublishContractAudit(root);
assert.equal(missingChartLineReport.status, 'fail');
assert.ok(missingChartLineReport.findings.some((finding) => finding.file === 'tools/automation/nt-scanner.ts' && finding.reason.includes('chart context line')));

write(root, 'tools/automation/nt-scanner.ts', [
  'buildDeskPublishDecision',
  'assertScannerDeskPublishArtifactAgreement',
  'DeskPublishDecision artifact agreement failed',
  'chart context line',
  'Canonical DeskPublishDecision line in the sand.',
  'prepareLiveScannerDeskPlayAlertArtifacts',
  'scannerDeskPlanRefreshMateriallyMatches',
  'scannerDeskPlayPublicCadenceHoldReason',
  'args.publishDecision?.shouldPost && args.publishDecision.hasCompletePlan',
].join('\n'));

const legacySuppressionOutranksCanonicalReport = buildDeskPublishContractAudit(root);
assert.equal(legacySuppressionOutranksCanonicalReport.status, 'fail');
assert.ok(legacySuppressionOutranksCanonicalReport.findings.some((finding) =>
  finding.checkId === 'scanner_publish_contract_precedes_legacy_suppression' &&
  finding.reason.includes('Canonical DeskPublishDecision POST must be honored before duplicate refresh suppression')
));

write(root, 'tools/automation/nt-scanner.ts', [
  'buildDeskPublishDecision',
  'assertScannerDeskPublishArtifactAgreement',
  'DeskPublishDecision artifact agreement failed',
  'chart context line',
  'Canonical DeskPublishDecision line in the sand.',
  'prepareLiveScannerDeskPlayAlertArtifacts',
  'args.publishDecision?.shouldPost && args.publishDecision.hasCompletePlan',
  'const legacyDeskPlayPromotionAllowed = !hasCanonicalPublishDecision;',
  'scannerDeskPlanRefreshMateriallyMatches',
  'scannerDeskPlayPublicCadenceHoldReason',
].join('\n'));

const redundantLegacyGateReport = buildDeskPublishContractAudit(root);
assert.equal(redundantLegacyGateReport.status, 'fail');
assert.ok(redundantLegacyGateReport.findings.some((finding) =>
  finding.checkId === 'scanner_publish_contract_precedes_legacy_suppression' &&
  finding.reason.includes('legacyDeskPlayPromotionAllowed')
));

console.log('Phase 3C DeskPublishDecision contract audit verified.');
