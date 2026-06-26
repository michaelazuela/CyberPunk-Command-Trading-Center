import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildNoSilentDropPolicyAudit } from './no-silent-drop-policy-audit';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';

const report = buildNoSilentDropPolicyAudit();
assert.equal(report.reportType, 'phase_8_6_no_silent_drop_policy_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.findings.length, 0);
assert.ok(report.markdown.includes('meaningful structured OHLC evidence'));

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-8-6-no-silent-drop-'));
fs.mkdirSync(path.join(tempRoot, 'src', 'lib'), { recursive: true });
fs.writeFileSync(
  path.join(tempRoot, 'src', 'lib', 'localScannerEngine.ts'),
  [
    'POST_PLAN',
    'POST_WATCH',
    'POST_CONDITIONAL',
    'POST_REVIEW',
    'HOLD_WITH_REASON',
    'NO_TRADE_WITH_REASON',
    'visibilityMode',
    'suppressionReason',
    'nextTrigger',
    'dataQualityBlocker',
    'holdWithReason',
    'noTradeWithReason',
    'hasMeaningfulStructuredEvidence',
    'sourceOfTruth',
  ].join('\n'),
  'utf8',
);
const missingModeReport = buildNoSilentDropPolicyAudit(tempRoot, []);
assert.equal(missingModeReport.status, 'fail');
assert.ok(missingModeReport.findings.some((finding) => finding.reason.includes('DATA_QUALITY_BLOCKER')));

const noEvidenceCandidate: SetupCandidate = {
  setupType: SetupType.LiquiditySweep,
  scenarioLabel: 'No evidence fixture',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Detected,
  confidence: 'High',
  priority: 90,
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  riskPoints: 4,
  invalidation: 'Invalid below protected swing.',
  rankScore: 92,
  evidence: [],
  missingEvidence: [],
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  requiredTrigger: null,
  nextAction: null,
  reducedRiskPlan: null,
};
const missingEvidenceReport = buildNoSilentDropPolicyAudit(undefined, [{
  id: 'fixture_without_structured_evidence',
  state: 'Blocked',
  candidate: noEvidenceCandidate,
  canExecute: false,
  alertDecision: { shouldSend: false, reason: 'Missing evidence fixture.' },
  expectedVisibilityMode: 'HOLD_WITH_REASON',
  expectedDiscordAction: 'hold',
  reasonField: 'holdWithReason',
}]);
assert.equal(missingEvidenceReport.status, 'fail');
assert.ok(missingEvidenceReport.findings.some((finding) => finding.reason.includes('meaningful structured evidence')));

console.log('Phase 8.6 no silent drop policy audit test verified.');
