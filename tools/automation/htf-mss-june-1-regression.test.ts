import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SetupType, TradeDecisionStatus } from '../../src/types';
import {
  buildJuneOneRegressionReport,
  writeJuneOneRegressionArtifacts,
} from './htf-mss-june-1-regression';

const report = buildJuneOneRegressionReport();

assert.equal(report.replayDataSource, 'new_focused_fixture');
assert.equal(report.htfLiquidityDrawState.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.equal(report.htfLiquidityDrawState.planDirection, 'LONG');
assert.equal(report.htfLiquidityDrawState.drawDirection, 'buy_side');
assert.equal(report.htfLiquidityDrawState.raidState, 'sell_side_raid');
assert.equal(report.htfLiquidityDrawState.fiveMinuteMssTriggerConfirmed, true);
assert.equal(report.htfLiquidityDrawState.fiveMinuteMssConfirmationType, 'swing_break_with_displacement');
assert.equal(report.htfLiquidityDrawState.fifteenMinuteConfirmationStatus, 'potential_mss');
assert.equal(report.htfLiquidityDrawState.postShiftState, 'post_mss_digestion');
assert.equal(report.htfLiquidityDrawState.activeScanWindow, 'LUNCH_PM_SETUP_SCAN');
assert.equal(report.htfLiquidityDrawState.htfContextSufficiency.overallStatus, 'sufficient');
assert.equal(report.htfLiquidityDrawState.classificationReliability, 'structural');
assert.equal(report.htfLiquidityDrawState.htfContextDataLimited, false);
assert.ok(report.htfLiquidityDrawState.externalLiquidityTarget?.includes('full ETH high'));
assert.ok(report.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '4H'));
assert.ok(report.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '1H'));
assert.ok(report.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '15M'));
assert.ok(report.htfLiquidityDrawState.timeframeStack.some((item) => item.timeframe === '5M'));

assert.equal(report.setupDetection.candidateDetected, true);
assert.equal(report.setupDetection.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(report.setupDetection.direction, 'LONG');
assert.equal(report.setupDetection.label, 'HTF Draw Continuation After Raid/Reclaim');
assert.equal(report.setupDetection.notMisclassifiedAsBearishContinuation, true);
assert.equal(report.setupDetection.candidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(report.setupDetection.candidate?.direction, 'LONG');
assert.equal(report.setupDetection.candidate?.executionStatus, 'Conditional');
assert.equal(report.setupDetection.candidate?.entry, null);
assert.equal(report.setupDetection.candidate?.stop, null);
assert.ok(report.setupDetection.candidate?.evidence.some((line) => line.includes('5M MSS trigger confirmed')));
assert.ok(report.setupDetection.candidate?.evidence.some((line) => line.includes('External liquidity target exists')));

assert.equal(report.finalGateResult.candidateOnly.canExecute, false);
assert.notEqual(report.finalGateResult.candidateOnly.status, TradeDecisionStatus.ApprovedTrade);
assert.equal(report.finalGateResult.candidateOnly.finalPlanEntry, null);
assert.equal(report.finalGateResult.candidateOnly.finalPlanStop, null);
assert.equal(report.finalGateResult.candidateOnly.bestConditionalSetupType, null);
assert.equal(report.setupDetection.candidate?.missingEvidence.includes('Clean retest or defined reclaim entry'), true);

assert.equal(report.finalGateResult.fullDeterministicGatesPass.scannerCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
assert.equal(report.finalGateResult.fullDeterministicGatesPass.scannerCandidate?.executionStatus, 'Executable');
assert.equal(report.finalGateResult.fullDeterministicGatesPass.scannerCandidate?.target1, 7614);
assert.equal(report.finalGateResult.fullDeterministicGatesPass.scannerCandidate?.target2, 7616);
assert.notEqual(report.finalGateResult.fullDeterministicGatesPass.status, TradeDecisionStatus.ApprovedTrade);
assert.equal(report.finalGateResult.fullDeterministicGatesPass.canExecute, false);

assert.equal(report.finalGateResult.riskTooWideCheck.status, TradeDecisionStatus.NoTrade);
assert.equal(report.finalGateResult.riskTooWideCheck.noTradeReason, 'RiskTooWide');

assert.ok(report.diagnosticReplay.htfMssDiagnostics);
assert.equal(report.diagnosticReplay.htfMssDiagnostics.fiveMinuteMssTriggerConfirmed, true);
assert.equal(report.diagnosticReplay.htfMssDiagnostics.fiveMinuteMssConfirmationType, 'swing_break_with_displacement');
assert.equal(report.diagnosticReplay.htfMssDiagnostics.postShiftState, 'post_mss_digestion');
assert.equal(report.diagnosticReplay.htfMssDiagnostics.externalLiquidityTarget?.includes('full ETH high'), true);
assert.equal(report.diagnosticReplay.approvalBoundary.diagnosticApprovesTrade, false);
assert.equal(report.diagnosticReplay.approvalBoundary.diagnosticChangesRules, false);
assert.equal(report.diagnosticReplay.approvalBoundary.diagnosticOverridesScanner, false);

const serialized = JSON.stringify(report);
assert.equal(serialized.includes('"canExecute":true'), false);
assert.equal(serialized.includes('"diagnosticApprovesTrade":true'), false);
assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(serialized), false);

const tempDir = mkdtempSync(join(tmpdir(), 'htf-mss-june-1-'));
const artifacts = writeJuneOneRegressionArtifacts(tempDir);
const artifactJson = JSON.parse(readFileSync(artifacts.jsonPath, 'utf8'));
const artifactMarkdown = readFileSync(artifacts.markdownPath, 'utf8');

assert.equal(artifactJson.reportType, 'htf_mss_june_1_regression');
assert.ok(artifactMarkdown.includes('# HTF/MSS June 1 Regression Replay'));
assert.ok(artifactMarkdown.includes('## HTF Context Sufficiency'));
assert.ok(artifactMarkdown.includes('Status: sufficient'));
assert.ok(artifactMarkdown.includes('Reliability: structural'));
assert.ok(artifactMarkdown.includes('HTF Usage: structural confirmation allowed'));
assert.ok(artifactMarkdown.includes('Candidate Promotion: allowed only when approved pathway conditions and deterministic gates are satisfied'));
assert.ok(artifactMarkdown.includes('Data-Limited Blockers'));
assert.ok(artifactMarkdown.includes('- none'));
assert.ok(artifactMarkdown.includes('htfMssDiagnostics Present: Yes'));
assert.ok(artifactMarkdown.includes('Candidate-only canExecute: false'));
assert.ok(artifactMarkdown.includes('Full Deterministic Gates Status: NoTrade'));
assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(artifactMarkdown), false);

console.log('HTF/MSS June 1 regression replay verified.');
