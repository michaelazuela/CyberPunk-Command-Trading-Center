import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupType, TradeDecisionStatus } from '../../src/types';
import {
  buildPhase5bApprovalGatesReport,
  buildPhase5bBearishSymmetryReport,
  writePhase5bRegressionArtifacts,
} from './htf-mss-phase-5b-regression';

const bearish = buildPhase5bBearishSymmetryReport();

assert.equal(bearish.replayDataSource, 'new_focused_fixture');
assert.equal(bearish.htfLiquidityDrawState.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.equal(bearish.htfLiquidityDrawState.planDirection, 'SHORT');
assert.equal(bearish.htfLiquidityDrawState.drawDirection, 'sell_side');
assert.equal(bearish.htfLiquidityDrawState.raidState, 'buy_side_raid');
assert.equal(bearish.htfLiquidityDrawState.fiveMinuteMssTriggerConfirmed, true);
assert.equal(bearish.htfLiquidityDrawState.fiveMinuteMssConfirmationType, 'swing_break_with_displacement');
assert.equal(bearish.htfLiquidityDrawState.fifteenMinuteConfirmationStatus, 'potential_mss');
assert.equal(bearish.htfLiquidityDrawState.postShiftState, 'post_mss_digestion');
assert.equal(bearish.htfLiquidityDrawState.activeScanWindow, 'LUNCH_PM_SETUP_SCAN');
assert.ok(bearish.htfLiquidityDrawState.externalLiquidityTarget?.includes('full ETH low'));
assert.ok(bearish.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '4H'));
assert.ok(bearish.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '1H'));
assert.ok(bearish.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '15M'));
assert.ok(bearish.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '5M'));
assert.equal(
  bearish.htfLiquidityDrawState.timeframeStack.find((item) => item.timeframe === '5M')?.direction,
  'bearish'
);

assert.equal(bearish.setupDetection.candidateDetected, true);
assert.equal(bearish.setupDetection.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(bearish.setupDetection.direction, 'SHORT');
assert.equal(bearish.setupDetection.label, 'HTF Draw Continuation After Raid/Reclaim');
assert.equal(bearish.setupDetection.notMisclassifiedAsBullishContinuation, true);
assert.equal(bearish.setupDetection.candidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(bearish.setupDetection.candidate?.direction, 'SHORT');
assert.equal(bearish.setupDetection.candidate?.executionStatus, ExecutionStatus.Conditional);
assert.equal(bearish.setupDetection.candidate?.entry, null);
assert.equal(bearish.setupDetection.candidate?.stop, null);
assert.ok(bearish.setupDetection.candidate?.evidence.some((line) => line.includes('5M MSS trigger confirmed')));
assert.ok(bearish.setupDetection.candidate?.evidence.some((line) => line.includes('External liquidity target exists')));

assert.equal(bearish.finalGateResult.candidateOnly.canExecute, false);
assert.notEqual(bearish.finalGateResult.candidateOnly.status, TradeDecisionStatus.ApprovedTrade);
assert.equal(bearish.finalGateResult.candidateOnly.finalPlan.entry, null);
assert.equal(bearish.finalGateResult.candidateOnly.finalPlan.stop, null);
assert.equal(bearish.finalGateResult.candidateOnly.bestExecutableCandidate, null);
assert.equal(
  bearish.setupDetection.candidate?.missingEvidence.includes('Clean retest or defined reclaim entry'),
  true
);

assert.ok(bearish.diagnosticReplay.htfMssDiagnostics);
assert.equal(bearish.diagnosticReplay.htfMssDiagnostics.raidState, 'buy_side_raid');
assert.equal(bearish.diagnosticReplay.htfMssDiagnostics.fiveMinuteMssTriggerConfirmed, true);
assert.equal(bearish.diagnosticReplay.htfMssDiagnostics.fiveMinuteMssConfirmationType, 'swing_break_with_displacement');
assert.equal(bearish.diagnosticReplay.htfMssDiagnostics.postShiftState, 'post_mss_digestion');
assert.equal(bearish.diagnosticReplay.htfMssDiagnostics.externalLiquidityTarget?.includes('full ETH low'), true);
assert.equal(bearish.diagnosticReplay.approvalBoundary.diagnosticApprovesTrade, false);
assert.equal(bearish.diagnosticReplay.approvalBoundary.diagnosticChangesRules, false);
assert.equal(bearish.diagnosticReplay.approvalBoundary.diagnosticOverridesScanner, false);

const gates = buildPhase5bApprovalGatesReport();

assert.equal(gates.replayDataSource, 'new_focused_fixture');
assert.equal(gates.cases.riskTooWide.scanCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(gates.cases.riskTooWide.scanCandidate?.blockReason, NoTradeReason.RiskTooWide);
assert.equal(gates.cases.riskTooWide.pipeline.canExecute, false);
assert.notEqual(gates.cases.riskTooWide.pipeline.status, TradeDecisionStatus.ApprovedTrade);

assert.equal(gates.cases.missingEntry.scanCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(gates.cases.missingEntry.scanCandidate?.entry, null);
assert.equal(gates.cases.missingEntry.pipeline.canExecute, false);

assert.equal(gates.cases.missingStop.scanCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(gates.cases.missingStop.scanCandidate?.stop, null);
assert.equal(gates.cases.missingStop.pipeline.canExecute, false);

assert.equal(gates.cases.missingTarget.scanCandidate?.candidateState, 'NO_QUALIFIED_STATE');
assert.equal(gates.cases.missingTarget.pipeline.canExecute, false);

assert.equal(gates.cases.missingTrigger.scanCandidate?.candidateState, 'NO_QUALIFIED_STATE');
assert.equal(gates.cases.missingTrigger.pipeline.canExecute, false);
assert.notEqual(gates.cases.missingTrigger.scanCandidate?.executionStatus, ExecutionStatus.Executable);

assert.equal(gates.cases.outsideWindow.scanCandidate?.candidateState, 'NO_QUALIFIED_STATE');
assert.equal(gates.cases.outsideWindow.pipeline.canExecute, false);

assert.equal(gates.cases.scannerReady.scanCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(gates.cases.scannerReady.scanCandidate?.executionStatus, ExecutionStatus.Executable);
assert.equal(gates.cases.scannerReady.scanCandidate?.target1, 7590);
assert.equal(gates.cases.scannerReady.scanCandidate?.target2, 7588);
assert.equal(gates.cases.scannerReady.pipeline.canExecute, false);
assert.notEqual(gates.cases.scannerReady.pipeline.status, TradeDecisionStatus.ApprovedTrade);
assert.equal(
  gates.cases.scannerReady.fullGateStatus,
  'scanner_ready_but_final_replay_shell_not_approved'
);

assert.equal(gates.cases.statusOverrideGuard.containsExecutableCommand, false);
assert.ok(gates.cases.statusOverrideGuard.text.includes('WAIT'));
assert.equal(/EXECUTABLE -|ApprovedTrade|Trade now|Entry confirmed|Take the trade|Enter now|Buy now|Sell now|Trade approved/i.test(gates.cases.statusOverrideGuard.text), false);

assert.equal(gates.safety.brokerExecutionAdded, false);
assert.equal(gates.safety.riskGateBypassed, false);
assert.equal(gates.safety.scannerBehaviorChanged, false);
assert.equal(gates.safety.bridgeBehaviorChanged, false);
assert.equal(gates.safety.liveDiscordPosted, false);
assert.equal(gates.safety.canExecuteBypassed, false);
assert.equal(gates.safety.externalLiquidityReplacesTargets, false);
assert.equal(gates.safety.t1T2RemainAppComputedRTargets, true);

const serialized = JSON.stringify({ bearish, gates });
assert.equal(serialized.includes('"canExecute":true'), false);
assert.equal(serialized.includes('"diagnosticApprovesTrade":true'), false);
assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(serialized), false);

const tempDir = mkdtempSync(join(tmpdir(), 'htf-mss-phase-5b-'));
const artifacts = writePhase5bRegressionArtifacts(tempDir);
const bearishJson = JSON.parse(readFileSync(artifacts.bearishJsonPath, 'utf8'));
const gatesJson = JSON.parse(readFileSync(artifacts.gatesJsonPath, 'utf8'));
const bearishMarkdown = readFileSync(artifacts.bearishMarkdownPath, 'utf8');
const gatesMarkdown = readFileSync(artifacts.gatesMarkdownPath, 'utf8');

assert.equal(bearishJson.reportType, 'htf_mss_phase_5b_bearish_symmetry');
assert.equal(gatesJson.reportType, 'htf_mss_phase_5b_approval_gates');
assert.ok(bearishMarkdown.includes('# HTF/MSS Phase 5B Bearish Symmetry Replay'));
assert.ok(bearishMarkdown.includes('htfMssDiagnostics Present: Yes'));
assert.ok(bearishMarkdown.includes('Candidate-only canExecute: false'));
assert.ok(gatesMarkdown.includes('# HTF/MSS Phase 5B Approval-Gate Replay Coverage'));
assert.ok(gatesMarkdown.includes('riskTooWide'));
assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(bearishMarkdown), false);
assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(gatesMarkdown), false);

console.log('HTF/MSS Phase 5B bearish symmetry and approval-gate replay verified.');
