import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildStoppedTradeWorkflowAuditReport } from './stopped-trade-workflow-audit';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stopped-trade-workflow-audit-'));
const auditDir = path.join(tmp, 'audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-07-28-MES-evening.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-07-28',
  instrument: 'MES',
  session: 'evening',
  events: {
    '2026-07-28T21:25:00.0000000': {
      completed5m: { time: '2026-07-28T21:25:00.0000000', open: 100, high: 110, low: 100, close: 109 },
      htfContextStatus: 'sufficient',
      setupCandidateStatus: {
        selected: {
          setupType: 'LiquidityRaidReclaimReversal',
          direction: 'LONG',
          executionStatus: 'Conditional',
          entry: 99,
          stop: 96,
          target1: 103.5,
          target2: 105,
          riskPoints: 3,
        },
      },
      visibility: { visibilityMode: 'POST_REVIEW', discordAction: 'post_review' },
      discord: { publishDecision: { shouldPost: true, action: 'POST_REVIEW' } },
      mtfPrimarySideArbitration: {
        mtfPrimarySide: 'SHORT',
        mtfArbitrationStatus: 'counter_structure',
        timeframeRows: [{ timeframe: '15M', side: 'SHORT', rawBias: 'BEAR' }],
      },
      staleReason: 'Completed 5M close, retest, or hold beyond the reclaim/failure line.',
    },
    '2026-07-28T21:30:00.0000000': {
      completed5m: { time: '2026-07-28T21:30:00.0000000', open: 109, high: 111, low: 106, close: 107 },
      htfContextStatus: 'sufficient',
      setupCandidateStatus: {
        selected: {
          setupType: 'LiquidityRaidReclaimReversal',
          direction: 'LONG',
          executionStatus: 'Conditional',
          entry: 99,
          stop: 96,
          target1: 103.5,
          target2: 105,
          riskPoints: 3,
        },
      },
      visibility: { visibilityMode: 'POST_REVIEW', discordAction: 'post_review' },
      discord: { publishDecision: { shouldPost: true, action: 'POST_REVIEW' } },
      mtfPrimarySideArbitration: {
        mtfPrimarySide: 'LONG',
        mtfArbitrationStatus: 'mixed',
        timeframeRows: [{ timeframe: '15M', side: 'LONG', rawBias: 'BULL' }],
      },
      staleReason: 'Completed 5M close, retest, or hold beyond the reclaim/failure line.',
    },
    '2026-07-28T21:35:00.0000000': {
      completed5m: { time: '2026-07-28T21:35:00.0000000', open: 107, high: 108, low: 102, close: 103 },
      visibility: { visibilityMode: 'HOLD_WITH_REASON' },
    },
    '2026-07-28T21:40:00.0000000': {
      completed5m: { time: '2026-07-28T21:40:00.0000000', open: 103, high: 102, low: 95, close: 100 },
      visibility: { visibilityMode: 'HOLD_WITH_REASON' },
    },
    '2026-07-28T21:45:00.0000000': {
      completed5m: { time: '2026-07-28T21:45:00.0000000', open: 100, high: 102, low: 95, close: 97.5 },
      visibility: { visibilityMode: 'HOLD_WITH_REASON' },
    },
  },
}));

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-07-28-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-07-28',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-07-28T09:35:00.0000000': {
      completed5m: { time: '2026-07-28T09:35:00.0000000', open: 200, high: 201, low: 190, close: 191 },
      htfContextStatus: 'sufficient',
      setupCandidateStatus: {
        selected: {
          setupType: 'RaidFailureDisplacementReversal',
          direction: 'SHORT',
          executionStatus: 'Conditional',
          entry: 190,
          stop: 225,
          target1: 137.5,
          target2: 120,
          riskPoints: 35,
        },
      },
      visibility: { visibilityMode: 'POST_REVIEW', discordAction: 'post_review' },
      discord: { publishDecision: { shouldPost: true, action: 'POST_REVIEW' } },
      mtfPrimarySideArbitration: {
        mtfPrimarySide: 'SHORT',
        mtfArbitrationStatus: 'aligned',
        timeframeRows: [{ timeframe: '4H', side: 'SHORT', rawBias: 'BEAR' }],
      },
      staleReason: 'Completed 5M close-through or retest after displacement confirms direction.',
    },
    '2026-07-28T09:40:00.0000000': {
      completed5m: { time: '2026-07-28T09:40:00.0000000', open: 191, high: 193, low: 186, close: 188 },
    },
    '2026-07-28T09:45:00.0000000': {
      completed5m: { time: '2026-07-28T09:45:00.0000000', open: 188, high: 226, low: 185, close: 225 },
    },
  },
}));

const report = await buildStoppedTradeWorkflowAuditReport({
  tradeDate: '2026-07-28',
  instrument: 'MES',
  sessions: ['morning', 'evening'],
  auditDir,
  outDir: path.join(tmp, 'out'),
  includeAll: false,
  json: false,
});

assert.equal(report.reportType, 'stopped_trade_workflow_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.tapesReviewed, 2);
assert.equal(report.summary.postedCandidatesReviewed, 3);
assert.equal(report.summary.rowsReported, 3);
assert.equal(report.summary.stoppedRows, 3);
assert.equal(report.summary.targetAlreadyHitBeforeEntryRows, 2);
assert.equal(report.summary.sameCandleEntryStopRows, 2);
assert.equal(report.summary.duplicateCampaignRows, 1);
assert.equal(report.summary.lateExtendedRows, 1);
assert.equal(report.summary.htfMixedOrCounterRows, 2);

const morning = report.rows.find((row) => row.session === 'morning');
assert.ok(morning);
assert.ok(morning.workflowStageFindings.some((finding) => finding.startsWith('late_or_extended_risk')));
assert.equal(morning.recommendedDisposition, 'Keep as evidence unless a fresh retest provides a closer protected 5M structure stop and target room.');

const duplicate = report.rows.find((row) => row.duplicateCampaign);
assert.ok(duplicate);
assert.equal(duplicate.duplicateOf, '21:25');
assert.ok(duplicate.workflowStageFindings.some((finding) => finding.startsWith('duplicate_campaign')));

const stale = report.rows.find((row) => row.targetAlreadyHitBeforeEntry);
assert.ok(stale);
assert.equal(stale.recommendedDisposition, 'Block as stale/no-chase; do not publish a fresh entry after targets were already touched.');

assert.match(report.markdown, /Stopped Trade Workflow Audit/);
assert.match(report.markdown, /Read-only workflow replay/);
assert.match(report.markdown, /Target already hit before entry: 2/);
