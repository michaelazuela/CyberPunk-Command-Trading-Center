import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDeskStateResponsibilityAudit } from './deskstate-responsibility-audit';

function write(root: string, relative: string, content: string): void {
  const fullPath = path.join(root, relative);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-8-55-deskstate-responsibility-'));

write(root, 'src/config/responsibilityRegistry.ts', [
  "key: 'desk_state_visibility_metadata'",
  "authority: 'visibility_authority'",
  "owner: 'src/lib/localScannerEngine.ts'",
  "sharedEntryPoint: 'src/agents/scannerPlanSelectionAgent.ts'",
  'agents, Discord, RAG, and UI may summarize but must not invent, suppress, rerank, or reinterpret active trade candidates',
].join('\n'));

write(root, 'src/lib/localScannerEngine.ts', [
  'export interface ScannerVisibilityMetadata {}',
  'export interface DeskState {}',
  'export function classifyScannerVisibility() {}',
  'export function buildTradeDecisionMapAudit() {}',
  'export function buildCandidateLifecycleTrace() {}',
  'export function buildDeskState() {}',
  'export function validateDeskStateReplayPath() {}',
].join('\n'));

write(root, 'src/agents/scannerPlanSelectionAgent.ts', [
  'import { classifyScannerVisibility } from "../lib/localScannerEngine";',
  'const visibilityMetadata = classifyScannerVisibility({ sourceOfTruth: "scanner_desk_state_visibility_metadata" });',
].join('\n'));

write(root, 'tools/automation/nt-scanner.ts', [
  'const visibilityMetadata = true;',
  'const candidateLifecycleTrace = true;',
  'const tradeDecisionMapAudit = true;',
  'const deskState = buildDeskState();',
  'function buildDeskState() { return {}; }',
].join('\n'));

write(root, 'tools/automation/discord-alert-format.ts', [
  'export interface CompactDeskStateForDiscord {}',
  'const deskState = true;',
  'const footer = "Decision support only. No automated orders.";',
].join('\n'));

write(root, 'tools/automation/discord-scheduler.ts', [
  'import { buildAppTradePlan } from "../../src/lib/planEngine";',
  'import { applyStaleChaseGuard } from "../../src/lib/localScannerEngine";',
  'const note = "Decision support only";',
  'void buildAppTradePlan; void applyStaleChaseGuard;',
].join('\n'));

const passReport = buildDeskStateResponsibilityAudit(root);
assert.equal(passReport.reportType, 'phase_8_55_deskstate_responsibility_audit');
assert.equal(passReport.status, 'pass');
assert.equal(passReport.authority.readOnly, true);
assert.equal(passReport.authority.postsDiscord, false);
assert.equal(passReport.authority.writesSupabase, false);
assert.equal(passReport.authority.changesScannerBehavior, false);
assert.equal(passReport.authority.changesTradingLogic, false);
assert.equal(passReport.authority.changesCanExecute, false);
assert.equal(passReport.authority.changesEntryStopTargets, false);
assert.equal(passReport.findings.length, 0);
assert.ok(passReport.markdown.includes('NinjaTrader OHLC -> Scanner / Setup Engine -> DeskState / Visibility Policy -> Discord / RAG / UI'));

write(root, 'tools/automation/discord-alert-format.ts', [
  'import { scanSetups } from "../../src/lib/setupScanner";',
  'export interface CompactDeskStateForDiscord {}',
  'const deskState = true;',
  'const footer = "Decision support only. No automated orders.";',
  'void scanSetups;',
].join('\n'));

const forbiddenImportReport = buildDeskStateResponsibilityAudit(root);
assert.equal(forbiddenImportReport.status, 'fail');
assert.ok(forbiddenImportReport.findings.some((finding) => finding.reason.includes('src/lib/setupScanner')));

write(root, 'src/config/responsibilityRegistry.ts', [
  "key: 'desk_state_visibility_metadata'",
  "authority: 'visibility_authority'",
  "owner: 'src/lib/localScannerEngine.ts'",
].join('\n'));

const missingRegistryReport = buildDeskStateResponsibilityAudit(root);
assert.equal(missingRegistryReport.status, 'fail');
assert.ok(missingRegistryReport.findings.some((finding) => finding.reason.includes('sharedEntryPoint')));

console.log('Phase 8.55 DeskState responsibility audit test verified.');
