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
} from './discord-scheduler-provenance';

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
    setupType: 'TurtleSoup',
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

const liveAudit = await loadExecutableScannerAuditFromFile(liveAuditPath);
assert.equal(liveAudit.planVersionId, 'MORNING-20260602-140348');
assert.equal(liveAudit.normalizedPlan?.canExecute, true);

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
assert.ok(lines.includes('Live scanner source of truth: MORNING-20260602-140348'));

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
