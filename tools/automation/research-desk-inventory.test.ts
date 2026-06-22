import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildResearchDeskInventoryReport } from './research-desk-inventory';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'research-desk-inventory-'));
const researchReports = path.join(tmp, 'tools', 'automation', 'research-reports');
const diagnosticReports = path.join(tmp, 'tools', 'automation', 'diagnostic-reports');
const replayDiagnostics = path.join(tmp, 'tools', 'automation', 'replay-diagnostics');
fs.mkdirSync(researchReports, { recursive: true });
fs.mkdirSync(diagnosticReports, { recursive: true });
fs.mkdirSync(replayDiagnostics, { recursive: true });

fs.writeFileSync(path.join(researchReports, 'promising-sniper.json'), JSON.stringify({
  reportType: 'sniper_watch_research_phase3_audit',
  instrument: 'MES',
  finding: 'Promising candidate: 5 reached T1 after completed 5M confirmation.',
}, null, 2));
fs.writeFileSync(path.join(diagnosticReports, 'needs-more-data.md'), [
  '# Research Note',
  'Research-only. Needs more data before promotion.',
].join('\n'));
fs.writeFileSync(path.join(replayDiagnostics, 'reject-case.json'), JSON.stringify({
  reportType: 'experimental_replay',
  instrument: 'MES',
  conclusion: 'Reject. Do not promote.',
}, null, 2));

const report = await buildResearchDeskInventoryReport({
  root: tmp,
  outDir: path.join(tmp, 'out'),
  json: false,
});

assert.equal(report.reportType, 'research_desk_inventory_phase1');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.createsNewModel, false);
assert.equal(report.summary.filesReviewed, 3);
assert.equal(report.summary.jsonFiles, 2);
assert.equal(report.summary.markdownFiles, 1);
assert.equal(report.summary.promisingArtifacts, 1);
assert.equal(report.summary.needsMoreDataArtifacts, 1);
assert.equal(report.summary.weakOrRejectedArtifacts, 1);
assert.ok(report.families.find((family) => family.family === 'research_reports')?.reportTypes.sniper_watch_research_phase3_audit);
assert.match(report.markdown, /Quant Desk Research Inventory/);
assert.match(report.markdown, /Read-only Phase 1 inventory\/audit/);
assert.match(report.markdown, /Next phase should convert selected promising artifacts into an evidence table/);
assert.match(report.html, /Quant Desk Research Status/);
assert.match(report.html, /Phase 1 inventory is complete/);
assert.match(report.html, /Posts Discord: false/);

fs.rmSync(tmp, { recursive: true, force: true });
