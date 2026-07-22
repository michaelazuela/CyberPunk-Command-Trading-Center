import assert from 'node:assert/strict';
import { buildUnifiedDeskOutputDiscordFormatterDryRunReport } from './unified-desk-output-discord-formatter-dry-run';

const row = (state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ') => ({
  cardId: `fixture-${state}`,
  date: '2026-07-22',
  session: state === 'APPROVED_DESK_PLAN' ? 'morning' as const : 'lunch' as const,
  state,
  stateLabel: state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' as const : 'Forming Desk Read' as const,
  model: state === 'APPROVED_DESK_PLAN' ? 'OpeningDriveFvgContinuation' : 'AfterLunchDriveFvgContinuation',
  direction: state === 'APPROVED_DESK_PLAN' ? 'SHORT' as const : 'LONG' as const,
  headline: `${state} headline`,
  bodyLines: ['Scanner-owned setup.', 'HTF context supports the read and 5M proof is complete.'],
  levelLine: 'Entry 100 | Stop 104 | T1 94 | T2 92',
  riskLine: 'Risk 4 points from scanner-owned entry/stop.',
  proofLine: 'Completed 5M proof: 09:45 ET.',
  invalidationLine: 'Invalid if price violates the protected 5M stop line.',
  authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
  scannerVisibleNow: true as const,
  publishDiscord: false as const,
  writesSupabase: false as const,
  readsLiveBridge: false as const,
  canExecute: false as const,
});

const report = buildUnifiedDeskOutputDiscordFormatterDryRunReport({
  proofPath: 'fixture-proof.json',
  proofReport: {
    reportType: 'unified_desk_output_local_scanner_ui_refresh_proof',
    status: 'pass',
    authority: {
      localOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      scannerUiRefreshAllowed: true,
      previewRows: 2,
      approvedDeskPlanRows: 1,
      formingDeskReadRows: 1,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
      blockedRows: 0,
    },
    blockers: [],
  },
  surfacePath: 'fixture-surface.json',
  surfaceReport: {
    reportType: 'unified_desk_output_scanner_surface_smoke',
    status: 'pass',
    authority: {
      localOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      renderedRows: 2,
      approvedDeskPlanRows: 1,
      formingDeskReadRows: 1,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
      blockedRows: 0,
    },
    surface: {
      status: 'ready',
      sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
      localScannerOnly: true,
      rows: [row('APPROVED_DESK_PLAN'), row('FORMING_DESK_READ')],
      summary: {
        rows: 2,
        approvedDeskPlans: 1,
        formingDeskReads: 1,
        discordPostRows: 0,
        supabaseWriteRows: 0,
        liveBridgeReadRows: 0,
        canExecuteTrueRows: 0,
        wordingViolationRows: 0,
      },
      blockers: [],
    },
    blockers: [],
  },
}, '2026-07-22T05:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_discord_formatter_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.dryRunOnly, true);
assert.equal(report.authority.formatsDiscordPayloadsOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.formattedPayloads, 2);
assert.equal(report.summary.approvedDeskPlanPayloads, 1);
assert.equal(report.summary.formingDeskReadPayloads, 1);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.webhookCallRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveSupabaseReadRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.wordingViolationRows, 0);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_discord_publish_gate_decision');
assert.equal(report.samplePayloads.every((payload) => payload.shouldPost === false), true);
assert.equal(report.samplePayloads.every((payload) => payload.webhookCalls === 0), true);
assert.match(report.samplePayloads[0].content, /APPROVED DESK PLAN/);
assert.doesNotMatch(report.markdown, /human[- ]review|no chase|missed|no-trade|no trade/i);

const blocked = buildUnifiedDeskOutputDiscordFormatterDryRunReport({
  ...report.source,
  proofPath: 'fixture-proof.json',
  proofReport: {
    reportType: 'unified_desk_output_local_scanner_ui_refresh_proof',
    status: 'blocked',
    authority: {
      localOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      scannerUiRefreshAllowed: false,
      previewRows: 0,
      approvedDeskPlanRows: 0,
      formingDeskReadRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
      blockedRows: 1,
    },
    blockers: ['fixture blocker'],
  },
  surfacePath: 'fixture-surface.json',
  surfaceReport: {
    reportType: 'unified_desk_output_scanner_surface_smoke',
    status: 'pass',
    authority: {
      localOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    summary: {
      renderedRows: 2,
      approvedDeskPlanRows: 1,
      formingDeskReadRows: 1,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      wordingViolationRows: 0,
      blockedRows: 0,
    },
    surface: {
      status: 'ready',
      sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
      localScannerOnly: true,
      rows: [row('APPROVED_DESK_PLAN'), row('FORMING_DESK_READ')],
      summary: {
        rows: 2,
        approvedDeskPlans: 1,
        formingDeskReads: 1,
        discordPostRows: 0,
        supabaseWriteRows: 0,
        liveBridgeReadRows: 0,
        canExecuteTrueRows: 0,
        wordingViolationRows: 0,
      },
      blockers: [],
    },
    blockers: [],
  },
});
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.recommendation, 'hold_for_discord_formatter_fix');
assert.ok(blocked.blockers.includes('fixture blocker'));

console.log('Unified Desk Output Discord formatter dry-run verified.');
