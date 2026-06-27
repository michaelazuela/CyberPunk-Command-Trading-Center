import assert from 'node:assert/strict';
import { buildPhase9FReplayValidationAudit } from './replay-validation-audit';

const report = buildPhase9FReplayValidationAudit();

assert.equal(report.reportType, 'phase_9f_replay_validation_audit');
assert.equal(report.status, 'pass', JSON.stringify(report.findings, null, 2));
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.authority.changesRanking, false);
assert.equal(report.authority.changesRiskRules, false);
assert.equal(report.authority.changesBridgeBehavior, false);
assert.equal(report.summary.phase9FStatus, 'pass');
assert.equal(report.summary.cycleCount, 3);
assert.equal(report.summary.watchBeforeMove, 'pass');
assert.equal(report.summary.lineMatched, 'pass');
assert.equal(report.summary.promotionCorrect, 'pass');
assert.equal(report.summary.noChasePreserved, 'pass');
assert.equal(report.summary.noTradeExplained, 'pass');
assert.equal(report.summary.consumersAligned, 'pass');
assert.equal(report.summary.noAuthorityChange, true);
assert.ok(report.filesScanned.includes('src/agents/bridgeDiagnosticReplayAgent.ts'));
assert.ok(report.filesScanned.includes('src/lib/localScannerEngine.ts'));
assert.ok(report.markdown.includes('does not post Discord'));
