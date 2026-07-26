import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFiveModelScannerSurfaceAdapterPreview } from './five-model-scanner-surface-adapter-preview';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-model-surface-adapter-'));
const geometryPath = path.join(tempDir, 'geometry.json');

const cleanImmediate = {
  name: 'candidate_entry_vs_body_origin',
  entry: 100,
  stop: 104,
  riskPoints: 4,
  riskClean: true,
  target1: 94,
  target2: 92,
};

const cleanRetest = {
  name: 'required_retest_entry_vs_proof_wick',
  entry: 203,
  stop: 208,
  riskPoints: 5,
  riskClean: true,
  target1: 195.5,
  target2: 193,
};

fs.writeFileSync(geometryPath, JSON.stringify({
  rows: [
    {
      modelId: 'raid_failure_displacement_reversal',
      displayName: 'Raid Failure Displacement Reversal',
      laneRole: 'primary_candidate_lane',
      date: '2026-06-17',
      session: 'morning',
      direction: 'SHORT',
      proofTime: '2026-06-17T10:35:00',
      pdfMatchedDollars: 112.5,
      immediateVariants: [cleanImmediate],
      retestVariants: [cleanRetest],
      immediateRiskClean: true,
      retestRiskClean: true,
    },
    {
      modelId: 'structure_shift_continuation',
      displayName: 'Structure Shift Continuation',
      laneRole: 'secondary_candidate_lane',
      date: '2026-06-18',
      session: 'lunch',
      direction: 'LONG',
      proofTime: '2026-06-18T13:15:00',
      pdfMatchedDollars: 80,
      immediateVariants: [{ ...cleanImmediate, riskPoints: 20, riskClean: false }],
      retestVariants: [{ ...cleanRetest, entry: 120, stop: 115, target1: 127.5, target2: 130 }],
      immediateRiskClean: false,
      retestRiskClean: true,
    },
    {
      modelId: 'structure_shift_continuation',
      displayName: 'Structure Shift Continuation',
      laneRole: 'secondary_candidate_lane',
      date: '2026-06-18',
      session: 'lunch',
      direction: 'LONG',
      proofTime: '2026-06-18T13:15:00',
      pdfMatchedDollars: 80,
      immediateVariants: [{ ...cleanImmediate, riskPoints: 20, riskClean: false }],
      retestVariants: [{ ...cleanRetest, entry: 120, stop: 115, target1: 127.5, target2: 130 }],
      immediateRiskClean: false,
      retestRiskClean: true,
    },
  ],
}, null, 2));

const defaultOff = buildFiveModelScannerSurfaceAdapterPreview({
  geometryJson: geometryPath,
  localPreview: false,
  json: true,
}, '2026-07-26T06:00:00.000Z');

assert.equal(defaultOff.status, 'pass');
assert.equal(defaultOff.authority.localPreviewRequested, false);
assert.equal(defaultOff.summary.visibilityCandidates, 0);
assert.equal(defaultOff.summary.renderedRows, 0);
assert.equal(defaultOff.summary.canExecuteTrueRows, 0);

const report = buildFiveModelScannerSurfaceAdapterPreview({
  geometryJson: geometryPath,
  localPreview: true,
  json: true,
}, '2026-07-26T06:00:00.000Z');

assert.equal(report.reportType, 'five_model_scanner_surface_adapter_preview');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localPreviewRequested, true);
assert.equal(report.authority.rendersScannerSurfaceOnly, true);
assert.equal(report.authority.noSetupRegistryChange, true);
assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.authority.noCanExecuteChange, true);
assert.equal(report.authority.noAutomatedOrders, true);
assert.equal(report.summary.sourceGeometryRows, 3);
assert.equal(report.summary.visibilityCandidates, 2);
assert.equal(report.summary.renderedRows, 2);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 1);
assert.equal(report.summary.immediateRiskCleanRows, 1);
assert.equal(report.summary.retestOnlyRows, 2);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.surface.rows[0]?.stateLabel, 'Approved Desk Plan');
assert.equal(report.surface.rows[1]?.stateLabel, 'Forming Desk Read');
assert.equal(report.surface.rows.every((row) => row.canExecute === false), true);
assert.equal(report.surface.rows.every((row) => row.publishDiscord === false), true);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);
assert.equal(report.recommendation, 'ready_for_hidden_local_preview_import_payload');

console.log('five-model scanner surface adapter preview verified');
