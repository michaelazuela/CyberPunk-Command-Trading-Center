import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TradeDecisionStatus } from '../../src/types';
import {
  evaluateSchedulerReplayProvenance,
  loadExecutableScannerAuditFromFile,
  loadExecutableScannerAuditSummaries,
  provenanceLines,
  validateExecutableScannerAuditVisualsForRepost,
} from './discord-scheduler-provenance';
import { DISCORD_TRADE_PLAN_VISUAL_CONTRACT } from './discord-visual-contract';

const auditDir = await fs.mkdtemp(path.join(os.tmpdir(), 'discord-scheduler-provenance-'));
const liveAuditPath = path.join(auditDir, 'scanner-morning-2026-06-02-MES-MORNING-20260602-140348.json');
await fs.writeFile(liveAuditPath, `${JSON.stringify({
  createdAt: '2026-06-02T14:03:48.573Z',
  source: 'live-scanner',
  session: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  planVersionId: 'MORNING-20260602-140348',
  candidate: {
    setupType: 'raidReclaim',
    direction: 'LONG',
    entry: 7603.25,
    stop: 7599,
    target1: 7611.75,
    target2: 7620,
    riskPoints: 4.25,
    evidence: [],
    missingEvidence: [],
    executionStatus: 'Executable',
    blockReason: null,
    requiredTrigger: null,
    nextAction: 'Verify completed 5M trigger.',
    reducedRiskPlan: null,
  },
  normalizedPlan: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: 7603.25,
    stop: 7599,
    t1: 7609.75,
    t2: 7611.75,
    riskPoints: 4.25,
  },
  attachments: {
    chartMarkup: 'chart.png',
    priceLevelMap: 'level-map.png',
    renderContract: DISCORD_TRADE_PLAN_VISUAL_CONTRACT,
    generatedBy: 'chart-markup-renderer',
    generatedAt: '2026-06-02T14:03:48.573Z',
    planVersionId: 'MORNING-20260602-140348',
  },
}, null, 2)}\n`, 'utf8');

const staleAuditPath = path.join(auditDir, 'legacy-stale-live-scanner-audit.json');
await fs.writeFile(staleAuditPath, `${JSON.stringify({
  createdAt: '2026-06-02T14:03:48.573Z',
  source: 'live-scanner',
  session: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  planVersionId: 'MORNING-20260602-140348-STALE',
  candidate: {
    setupType: 'raidReclaim',
    direction: 'LONG',
    entry: 7603.25,
    stop: 7599,
    target1: 7611.75,
    target2: 7620,
    riskPoints: 4.25,
    evidence: [],
    missingEvidence: [],
    executionStatus: 'Executable',
    blockReason: null,
    requiredTrigger: null,
    nextAction: 'Verify completed 5M trigger.',
    reducedRiskPlan: null,
  },
  normalizedPlan: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: 7603.25,
    stop: 7599,
    t1: 7609.75,
    t2: 7611.75,
    riskPoints: 4.25,
  },
  attachments: {
    chartMarkup: 'old-chart.png',
    priceLevelMap: 'old-level-map.png',
  },
}, null, 2)}\n`, 'utf8');

await fs.writeFile(path.join(auditDir, 'morning-2026-06-02-MES-MORNING-20260602-225643.json'), `${JSON.stringify({
  createdAt: '2026-06-02T22:56:43.726Z',
  job: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  planVersionId: 'MORNING-20260602-225643',
  normalizedPlan: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    noTradeReason: 'RiskTooWide',
  },
}, null, 2)}\n`, 'utf8');

const summaries = await loadExecutableScannerAuditSummaries({
  auditDir,
  tradeDate: '2026-06-02',
  instrument: 'MES',
  session: 'morning',
});
assert.equal(summaries.length, 1);
assert.equal(summaries[0].planVersionId, 'MORNING-20260602-140348');
assert.equal(summaries[0].entry, 7603.25);
assert.equal(summaries[0].t1, 7609.75);
assert.equal(summaries[0].attachments.chartMarkup, 'chart.png');
assert.equal(summaries[0].attachments.renderContract, DISCORD_TRADE_PLAN_VISUAL_CONTRACT);

const liveAudit = await loadExecutableScannerAuditFromFile(liveAuditPath);
assert.equal(liveAudit.planVersionId, 'MORNING-20260602-140348');
assert.equal(liveAudit.normalizedPlan?.canExecute, true);
assert.deepEqual(validateExecutableScannerAuditVisualsForRepost(liveAudit), ['chart.png', 'level-map.png']);

const staleAudit = await loadExecutableScannerAuditFromFile(staleAuditPath);
assert.throws(
  () => validateExecutableScannerAuditVisualsForRepost(staleAudit),
  /missing the current visual render contract/,
);

const blocked = await evaluateSchedulerReplayProvenance({
  auditDir,
  tradeDate: '2026-06-02',
  instrument: 'MES',
  session: 'morning',
  normalizedPlan: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    noTradeReason: 'RiskTooWide',
  },
  allowPostFactoSummary: false,
});
assert.equal(blocked.status, 'blocked_contradicts_live_executable');
assert.ok(blocked.note.includes('Manual scheduler replay blocked'));
assert.equal(blocked.liveExecutableAudits.length, 1);

const allowed = await evaluateSchedulerReplayProvenance({
  auditDir,
  tradeDate: '2026-06-02',
  instrument: 'MES',
  session: 'morning',
  normalizedPlan: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    noTradeReason: 'RiskTooWide',
  },
  allowPostFactoSummary: true,
});
assert.equal(allowed.status, 'allowed_post_facto');
const lines = provenanceLines(allowed).join('\n');
assert.ok(lines.includes('Source: post-facto scheduler replay summary.'));
assert.ok(lines.includes('Live source: MORNING-20260602-140348'));

const blockedPostFactoTradePlan = await evaluateSchedulerReplayProvenance({
  auditDir,
  tradeDate: '2026-06-03',
  instrument: 'MES',
  session: 'morning',
  normalizedPlan: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    noTradeReason: null,
  },
  candidateCount: 1,
  allowPostFactoSummary: true,
});
assert.equal(blockedPostFactoTradePlan.status, 'blocked_post_facto_trade_plan_not_canonical');
assert.ok(blockedPostFactoTradePlan.note.includes('Use --repost-scanner-audit'));
assert.ok(blockedPostFactoTradePlan.note.includes('scanner-owned DeskPublishDecision'));

const clear = await evaluateSchedulerReplayProvenance({
  auditDir,
  tradeDate: '2026-06-03',
  instrument: 'MES',
  session: 'morning',
  normalizedPlan: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    noTradeReason: 'RiskTooWide',
  },
  allowPostFactoSummary: false,
});
assert.equal(clear.status, 'clear');
assert.equal(clear.liveExecutableAudits.length, 0);

await assert.rejects(
  () => loadExecutableScannerAuditFromFile(path.join(auditDir, 'morning-2026-06-02-MES-MORNING-20260602-225643.json')),
  /not a live executable scanner audit/,
);

console.log('Discord scheduler provenance guard verified.');
