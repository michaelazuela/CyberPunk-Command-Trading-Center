import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildScannerBehaviorAuditReport } from './scanner-behavior-audit';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scanner-behavior-audit-'));
const auditDir = path.join(tmp, 'audit');
fs.mkdirSync(auditDir, { recursive: true });

fs.writeFileSync(path.join(auditDir, 'scanner-decision-tape-2026-06-19-MES-morning.json'), JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-19T09:35:00.0000000': {
      completed5m: { close: 7557.5 },
      currentPrice: 7538.5,
      scannerState: 'TriggerPending',
      setupCandidateStatus: {
        selected: {
          direction: 'LONG',
          setupType: 'IntradayMssMicroContinuation',
          executionStatus: 'Review',
        },
      },
      plan: { canExecute: false },
      visibility: { visibilityMode: 'POST_WATCH' },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'LONG' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            approvalBoundary: {
              changesTradeApprovals: false,
              changesCanExecute: false,
              changesEntryStopTargets: false,
              changesRiskRules: false,
              changesRanking: false,
              createsNewModel: false,
            },
          },
        },
      },
      staleReason: 'T1 was already reached before alert generation. No chase entry.',
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'Watch card qualified for Discord.',
      },
    },
    '2026-06-19T09:40:00.0000000': {
      completed5m: { close: 7550 },
      currentPrice: 7549.5,
      scannerState: 'Watching',
      setupCandidateStatus: {
        selected: {
          direction: 'SHORT',
          setupType: 'raidReclaim',
          executionStatus: 'Watching',
        },
      },
      plan: { canExecute: false },
      visibility: { visibilityMode: 'HOLD_WITH_REASON' },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'SHORT' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            approvalBoundary: {
              changesTradeApprovals: false,
              changesCanExecute: false,
              changesEntryStopTargets: false,
              changesRiskRules: false,
              changesRanking: false,
              createsNewModel: false,
            },
          },
        },
      },
      staleReason: null,
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Duplicate alert suppressed for same setup/reference/direction/state.',
      },
    },
    '2026-06-19T09:45:00.0000000': {
      completed5m: { close: 7551 },
      currentPrice: 7551.25,
      scannerState: 'TriggerPending',
      setupCandidateStatus: {
        selected: {
          direction: 'LONG',
          setupType: 'raidReclaim',
          executionStatus: 'Conditional',
        },
      },
      plan: { canExecute: false },
      visibility: { visibilityMode: 'POST_CONDITIONAL' },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'SHORT' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'SHORT',
          htfFvgReactionRouting: {
            status: 'routed_active_reaction',
            direction: 'SHORT',
            approvalBoundary: {
              changesTradeApprovals: false,
              changesCanExecute: false,
              changesEntryStopTargets: false,
              changesRiskRules: false,
              changesRanking: false,
              createsNewModel: false,
            },
          },
        },
      },
      staleReason: null,
      discord: {
        shouldSend: false,
        sendOrSuppressReason: 'Duplicate alert suppressed for same setup/reference/direction/state.',
      },
    },
    '2026-06-19T09:50:00.0000000': {
      completed5m: { close: 7552 },
      currentPrice: 7552.25,
      scannerState: 'Conditional',
      setupCandidateStatus: {
        selected: {
          direction: 'LONG',
          setupType: 'IntradayMssMicroContinuation',
          executionStatus: 'Conditional',
        },
      },
      plan: { canExecute: false },
      visibility: { visibilityMode: 'POST_REVIEW' },
      candidateLifecycleTrace: {
        activeCampaign: { direction: 'LONG' },
      },
      deskState: {
        primaryDeskPlay: {
          direction: 'LONG',
          htfFvgReactionRouting: {
            status: 'not_applicable',
            direction: 'WAIT',
            approvalBoundary: {
              changesTradeApprovals: false,
              changesCanExecute: false,
              changesEntryStopTargets: false,
              changesRiskRules: false,
              changesRanking: false,
              createsNewModel: false,
            },
          },
        },
      },
      staleReason: null,
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'ActiveCampaign duplicate suppressed by durable Supabase ledger: one trade alert already sent for 2026-06-19:LONG:HTF-FAILED-AUCTION.',
      },
    },
  },
}));

const report = await buildScannerBehaviorAuditReport({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  sessions: ['morning'],
  auditDir,
  outDir: path.join(tmp, 'out'),
  json: false,
});

assert.equal(report.reportType, 'scanner_behavior_phase1_audit');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.tapesReviewed, 1);
assert.equal(report.summary.eventsReviewed, 4);
assert.equal(report.summary.currentRuleExpectedPosts, 1);
assert.equal(report.summary.currentRuleSuppressions, 3);
assert.equal(report.summary.canExecuteFalseExpectedPosts, 1);
assert.equal(report.summary.reviewOrWatchExpectedPosts, 1);
assert.equal(report.summary.staleOrNoChaseEvents, 1);
assert.equal(report.summary.candidateDeskConflicts, 0);
assert.equal(report.summary.htfFvgReactionRoutingEvents, 3);
assert.equal(report.summary.htfFvgReactionRoutingConflicts, 1);
assert.equal(report.summary.htfFvgReactionBoundaryDrift, 0);
assert.equal(report.summary.phase4EnforcementFailures, 1);
assert.equal(report.summary.duplicateSuppressions, 3);
assert.equal(report.rows[0].htfFvgReactionRoutingDirection, 'SHORT');
assert.equal(report.rows[0].htfFvgReactionPhase4Enforcement, 'fail');
assert.equal(report.rows[0].auditFlags.includes('candidate_desk_conflict'), false);
assert.equal(report.rows[0].auditFlags.includes('htf_fvg_reaction_selected_conflict'), false);
assert.ok(report.rows[0].auditFlags.includes('htf_fvg_reaction_campaign_conflict'));
assert.equal(report.rows[1].htfFvgReactionPhase4Enforcement, 'pass');
assert.equal(report.rows[2].htfFvgReactionPhase4Enforcement, 'pass');
assert.equal(report.rows[2].auditFlags.includes('candidate_desk_conflict'), false);
assert.equal(report.rows[2].auditFlags.includes('htf_fvg_reaction_selected_conflict'), false);
assert.ok(report.rows[2].auditFlags.includes('candidate_desk_warning'));
assert.ok(report.rows[2].auditFlags.includes('htf_fvg_reaction_selected_warning'));
assert.equal(report.rows[3].currentRuleExpectedDiscordPost, false);
assert.equal(report.rows[3].discordAction, 'suppress');
assert.ok(report.rows[3].auditFlags.includes('duplicate_suppression'));
assert.match(report.markdown, /Scanner Behavior Phase 1 Audit/);
assert.match(report.markdown, /Read-only replay audit/);
assert.match(report.markdown, /canExecute=false expected posts: 1/);
assert.match(report.markdown, /Phase 4 enforcement failures: 1/);
assert.equal(JSON.stringify(report).includes('"canExecute":true'), false);

fs.rmSync(tmp, { recursive: true, force: true });
