import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import { buildCandidateLifecycleTrace, buildDeskState, resolveScannerWindow, type DeskPublishDecision, type DeskState, type ScannerState, type ScannerVisibilityMetadata } from '../../src/lib/localScannerEngine';
import type { ScannerHealthReport } from '../../src/agents/scannerHealthAgent';
import { BANNED_ACTIVE_DISCORD_ALERT_TEXT, flattenDiscordPayloadText } from './discord-alert-format';
import {
  barsCoverRequestedLookback,
  barsForMorningContinuationWatchlist,
  buildCompletedFiveMinuteGapEventRecord,
  buildScannerDataQualityNoticePayload,
  buildScannerHistoryPreloadPlan,
  buildSegmentedHistoryRepairWindows,
  attachFailedPlanReversalContextFromScannerState,
  aggregateScannerFiveMinuteBarsToTimeframe,
  appOwnedFailedDecisionEventFromCandidate,
  appOwnedFailedPlanEventsFromScannerAudits,
  appOwnedFailedPlanEventsFromScannerState,
  createPendingScannerAlertDeliveryRecord,
  evaluateCompletedFiveMinuteBarAssuranceGate,
  evaluateScannerCompletedFiveMinuteLatencySentinel,
  buildScannerMissedMoveReentryWatch,
  evaluateScannerDeskPlayDiscordSuppression,
  scannerDeskPlayCanonicalPreDeliveryHold,
  evaluateScannerReversalWatchDiscordSuppression,
  evaluateScannerPrimaryAlertPublishingGate,
  evaluateScannerDiscordCampaignTransition,
  latestSentScannerTradeAlertDelivery,
  applyScannerCompletedFiveMinuteZoneFailureSuppression,
  applyScannerHardDuplicateAlertSuppression,
  applyScannerNearDuplicateTradeAlertCadenceSuppression,
  evaluatePreMarketDataReadinessBackfillGate,
  findMissedExecutableScannerDeliveries,
  cleanupExpiredScannerDiscordMessages,
  cleanupRecoveredScannerOperationalDiscordMessages,
  replacePriorScannerDiscordOperationalMessages,
  htfHistoryCoverageReadiness,
  claimDurableActiveCampaignScannerAlert,
  loadScannerActiveCampaignLedgerConfig,
  markScannerAlertDeliveryFailed,
  markScannerAlertDeliverySent,
  markScannerAlertDeliverySkipped,
  markDurableActiveCampaignScannerAlertSent,
  recordScannerDiscordCleanupMessage,
  replacePriorScannerDiscordCurrentDeskPlans,
  recoverStalePendingScannerFinalDeliveryOutcomes,
  recordActiveCampaignScannerAlertSent,
  recordActiveCampaignScannerAlertSuppressed,
  releaseDurableActiveCampaignScannerAlertClaim,
  candidateForDeskPlayContextChart,
  candidateForDeskPublishDecisionChart,
  candidateForNormalizedVisualAuthority,
  prepareLiveScannerDeskPlayAlertArtifacts,
  prepareLiveScannerDiscordAlertArtifacts,
  prepareScannerMorningHtfDeskMapArtifacts,
  prepareLiveScannerReversalWatchAlertArtifacts,
  prepareLiveScannerWatchlistAlertArtifacts,
  resolveScannerDiscordWebhookUrl,
  resolveScannerOperationalDiscordWebhookUrl,
  shouldSendScannerDataQualityNoticeForWindow,
  shouldSuppressScannerDataQualityNoticeForReason,
  SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
  scannerDataQualityNoticeKey,
  scannerDeskPlanRefreshKey,
  scannerReversalWatchKey,
  scannerReversalWatchRecord,
  scannerDiscordWebhookDeleteUrl,
  scannerDiscordWebhookUrlForPost,
  scannerActiveCampaignKey,
  scannerActiveCampaignKeyForTradeDate,
  shouldLogBridgeInstrumentResolution,
  shouldPersistScannerAlertToRag,
  shouldSuppressActiveCampaignScannerAlert,
  buildScannerReversalWatchLines,
  buildScannerMorningHtfDeskMapPayload,
  scannerHtfDeskMapDataStatusLabel,
  scannerHtfDeskMapDeferReasonForCanonicalPlan,
  buildScannerLiveDiscordSendBoundaryReport,
  buildScannerLiveHoldNoticePayload,
  buildScannerCounterStructureConditional,
  buildScannerMtfPrimarySideArbitration,
  buildScannerHtfTargetToLinePromotion,
  buildScannerEndOfDayMarketRecapPayload,
  classifyScannerReversalWatchState,
  scannerTacticalCampaignMapFromDeskState,
  scannerSniperTriggerWatchMetadata,
  shouldSendScannerMorningHtfDeskMap,
  shouldSendScannerEndOfDayMarketRecap,
  scannerLiveDiscordHoldNoticeEligible,
  scannerLiveHoldNoticeKey,
  summarizeScannerHistoryCoverage,
  scannerHistoryNeedsFiveMinuteAggregationRepair,
  syncLocalMarketDataGapEventsToSupabase,
  twoHourCoverageDiagnostic,
  verifiedFiveMinuteAggregationRepair,
  verifyScannerActiveCampaignLedgerReady,
  validateScannerDiscordFinalDeliveryOutcome,
  writeLocalMarketDataGapEvent,
  writeScannerDiscordReceiptAuditLog,
  writeScannerDiscordFinalDeliveryOutcomeAuditLog,
  writeScannerDiscordFinalDeliveryOutcomeFromReceipt,
  writeScannerDiscordFinalDeliveryFailureOutcome,
  writeScannerDecisionTapeAuditLog,
  readUnifiedDeskOutputProductionScannerSurface,
  unifiedDeskOutputProductionScannerSummaryLine,
  writeUnifiedDeskOutputProductionScannerReadback,
  scannerMarketBarsUpsertSkipAuditLine,
  scannerDiscordDryRunSummaryLine,
  scannerSuppressionSummaryLine,
  upsertScannerDiscordAlertRagRecord,
  upsertScannerReversalWatchRagRecord,
  normalizeScannerBarTimestampMode,
  normalizeScannerOperatorDeliveryReason,
  type ScannerAlertDeliveryRecord,
  type ScannerActiveCampaignDurableLedgerConfig,
  type ScannerActiveCampaignLedgerRecord,
  type ScannerConfig,
} from './nt-scanner';
import { buildChartMarkupHtmlForTest, verifyApprovedDailyTradePlanRender } from './chart-markup-renderer';

const outputDir = path.join(os.tmpdir(), `nt-scanner-alert-${Date.now()}`);
const auditDir = path.join(outputDir, 'discord-audit');
const previousOutcomeBaseUrl = process.env.DISCORD_OUTCOME_BASE_URL;
const previousOutcomeSecret = process.env.DISCORD_OUTCOME_SECRET;
const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const previousDiscordRagUserId = process.env.DISCORD_RAG_USER_ID;
const originalFetch = globalThis.fetch;

await fs.mkdir(outputDir, { recursive: true });
const unifiedDeskOutputSurfacePath = path.join(outputDir, '.unified-desk-output-production-surface.json');
const unifiedDeskOutputReadbackPath = path.join(outputDir, 'unified-desk-output-readback.json');
const unifiedDeskOutputSurface = {
  reportType: 'unified_desk_output_production_scanner_surface_activation',
  generatedAt: '2026-07-22T23:59:00.000Z',
  status: 'active',
  approval: {
    explicitProductionApproval: true,
    approvalScope: 'scanner_visibility_one_morning_one_lunch_optional_one_evening_approved_desk_plan_only',
    discordPostingRemainsGuarded: true,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    automatedOrders: false,
  },
  authority: {
    scannerVisibleNow: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    automatedOrders: false,
  },
  source: {
    finalReadinessChecklistPath: 'final-readiness.json',
  },
  summary: {
    selectedRows: 2,
    morningRows: 1,
    lunchRows: 1,
    eveningRows: 0,
    approvedDeskPlanRows: 2,
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    blockedRows: 0,
  },
  rows: [{
    cardId: 'morning-card',
    date: '2026-07-22',
    session: 'morning',
    state: 'APPROVED_DESK_PLAN',
    stateLabel: 'Approved Desk Plan',
    model: 'HtfDisplacementFvgContinuation',
    direction: 'LONG',
    headline: 'Approved Desk Plan | MORNING | LONG | HtfDisplacementFvgContinuation',
    bodyLines: ['Morning long desk plan.', 'Scanner-owned lane.'],
    levelLine: 'Entry 7519.5 | Stop 7515.25 | T1 7526 | T2 7528',
    riskLine: 'Risk 4.25 points from scanner-owned entry/stop.',
    proofLine: 'Completed 5M proof: 09:10 ET.',
    invalidationLine: 'Invalid if price violates the protected 5M stop line at 7515.25.',
    authorityLine: 'Decision support only. Discord posting remains separately guarded; canExecute, Supabase, bridge, and automated orders remain off in this surface.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  }, {
    cardId: 'lunch-card',
    date: '2026-07-22',
    session: 'lunch',
    state: 'APPROVED_DESK_PLAN',
    stateLabel: 'Approved Desk Plan',
    model: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    headline: 'Approved Desk Plan | LUNCH | LONG | IntradayMssMicroContinuation',
    bodyLines: ['Lunch long desk plan.', 'Scanner-owned lane.'],
    levelLine: 'Entry 7540 | Stop 7535.75 | T1 7546.5 | T2 7548.5',
    riskLine: 'Risk 4.25 points from scanner-owned entry/stop.',
    proofLine: 'Completed 5M proof: 15:45 ET.',
    invalidationLine: 'Invalid if price violates the protected 5M stop line at 7535.75.',
    authorityLine: 'Decision support only. Discord posting remains separately guarded; canExecute, Supabase, bridge, and automated orders remain off in this surface.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  }],
  blockers: [],
};
await fs.writeFile(unifiedDeskOutputSurfacePath, `${JSON.stringify(unifiedDeskOutputSurface, null, 2)}\n`);
const loadedUnifiedDeskOutputSurface = await readUnifiedDeskOutputProductionScannerSurface(unifiedDeskOutputSurfacePath);
assert.equal(loadedUnifiedDeskOutputSurface?.status, 'active');
assert.match(unifiedDeskOutputProductionScannerSummaryLine(loadedUnifiedDeskOutputSurface as any), /rows=2 morning:HtfDisplacementFvgContinuation:LONG:09:10/);
await writeUnifiedDeskOutputProductionScannerReadback({
  tradeDate: '2026-07-22',
  instrument: 'MES',
  session: 'morning',
  completed5mTime: '2026-07-22T16:00:00.000Z',
  surface: loadedUnifiedDeskOutputSurface as any,
  filePath: unifiedDeskOutputReadbackPath,
});
const unifiedDeskOutputReadback = JSON.parse(await fs.readFile(unifiedDeskOutputReadbackPath, 'utf8'));
assert.equal(unifiedDeskOutputReadback.reportType, 'unified_desk_output_production_scanner_readback');
assert.equal(unifiedDeskOutputReadback.status, 'pass');
assert.equal(unifiedDeskOutputReadback.summary.selectedRows, 2);
assert.equal(unifiedDeskOutputReadback.summary.discordPostRows, 0);
assert.equal(unifiedDeskOutputReadback.summary.canExecuteTrueRows, 0);

const dirtyUnifiedDeskOutputSurfacePath = path.join(outputDir, '.dirty-unified-desk-output-production-surface.json');
await fs.writeFile(dirtyUnifiedDeskOutputSurfacePath, `${JSON.stringify({
  ...unifiedDeskOutputSurface,
  summary: {
    ...unifiedDeskOutputSurface.summary,
    canExecuteTrueRows: 1,
  },
}, null, 2)}\n`);
assert.equal(await readUnifiedDeskOutputProductionScannerSurface(dirtyUnifiedDeskOutputSurfacePath), null);

assert.equal(normalizeScannerBarTimestampMode(undefined), 'open');
assert.equal(normalizeScannerBarTimestampMode(null), 'open');
assert.equal(normalizeScannerBarTimestampMode(''), 'open');
assert.equal(normalizeScannerBarTimestampMode('open'), 'open');
assert.equal(normalizeScannerBarTimestampMode('OPEN'), 'open');
assert.equal(normalizeScannerBarTimestampMode('close'), 'close');
assert.equal(normalizeScannerBarTimestampMode('CLOSE'), 'close');
assert.equal(normalizeScannerBarTimestampMode('bar-open'), 'open');
assert.equal(normalizeScannerBarTimestampMode('bad-env-value'), 'open');
assert.deepEqual(normalizeScannerOperatorDeliveryReason({
  shouldSend: false,
  reason: 'Primary trade-card suppressed by DeskState/readiness gate: canExecute=false; readiness=review_only_missing_proof; HTF/protected structure conflict.',
}), {
  code: 'HELD_MISSING_5M_PROOF',
  reason: 'HELD_MISSING_5M_PROOF: waiting for completed 5M trigger/retest proof.',
});
assert.deepEqual(normalizeScannerOperatorDeliveryReason({
  shouldSend: false,
  reason: 'Discord duplicate suppressed by durable ledger.',
}), {
  code: 'HELD_DUPLICATE',
  reason: 'HELD_DUPLICATE: existing Discord/campaign record already covers this setup.',
});
assert.deepEqual(normalizeScannerOperatorDeliveryReason({
  shouldSend: false,
  reason: 'state=Missed; stale/no-chase review state; current price already reached/passed T1.',
}), {
  code: 'HELD_STALE_NO_CHASE',
  reason: 'HELD_STALE_NO_CHASE: no fresh entry; wait for new completed 5M proof.',
});
assert.deepEqual(normalizeScannerOperatorDeliveryReason({
  shouldSend: false,
  reason: 'HTF/data context insufficient for high-confidence review publication.',
}), {
  code: 'HELD_DATA_LIMITED',
  reason: 'HELD_DATA_LIMITED: HTF/data context is insufficient; review-map only.',
});
const dryRunSummary = scannerDiscordDryRunSummaryLine({
  source: 'dry_run',
  files: [path.join(outputDir, 'desk-plan.png'), path.join(outputDir, 'level-map.png')],
  payload: {
    username: 'Quant Desk',
    content: 'MES Current Desk Plan',
    embeds: [{
      title: 'MES Current Desk Plan',
      description: 'Line in the Sand: 7500.00\nEntry: 7499.75\nStop: 7506.00\nT1: 7490.50\nT2: 7487.25',
      color: 0xff6d00,
      fields: [],
      footer: { text: 'Quant Desk - Scanner DeskState play - Not execution approval' },
      timestamp: '2026-07-09T14:00:00.000Z',
    }],
    components: [{ type: 1, components: [] }],
  },
});
assert.match(dryRunSummary, /^\[scanner-discord\] \| held source=dry_run \| title="MES Current Desk Plan"/);
assert.match(dryRunSummary, /files=2:desk-plan\.png,level-map\.png/);
assert.match(dryRunSummary, /set SCANNER_VERBOSE_DISCORD_PAYLOAD_LOG=true/);
assert.equal(dryRunSummary.includes('"embeds"'), false);
const suppressionSummary = scannerSuppressionSummaryLine({
  label: 'Desk Play refresh',
  category: 'duplicate_refresh',
  reason: 'Desk Play suppressed because primary side, readiness, HTF support/conflict, action state, and protected-structure map are unchanged from the latest posted Desk Play.',
  previousFingerprint: 'LONG|7500|7499|7506|7490|7487|same tactical state',
});
assert.match(suppressionSummary, /^\[scanner\] Desk Play refresh suppressed \(duplicate_refresh\):/);
assert.ok(suppressionSummary.length < 320, `suppression summary should stay compact, got ${suppressionSummary.length}`);
assert.equal(shouldLogBridgeInstrumentResolution({
  instrument: 'MES 09-26',
  requestedInstrument: 'MES',
  source: 'front-month-rollover',
  warning: null,
}, 'MES'), false);

const malformedHtfSkipLine = scannerMarketBarsUpsertSkipAuditLine({
  label: 'scanner-cache',
  timeframe: '120m',
  result: {
    upserted: 0,
    skipped: true,
    skipReason: 'timeframe_interval_mismatch',
    integrity: {
      timeframe: '120m',
      expectedIntervalMinutes: 120,
      rows: 3,
      oldestCandleTimeEt: '2026-06-30T10:00:00',
      newestCandleTimeEt: '2026-06-30T10:10:00',
      observedIntervalMinutes: { '5': 2 },
      invalidAlignmentRows: 2,
      invalidShortIntervalRows: 2,
      invalidRows: [],
      valid: false,
    },
  },
});
assert.ok(malformedHtfSkipLine?.includes('reason=timeframe_interval_mismatch'));
assert.ok(malformedHtfSkipLine?.includes('invalidShortIntervalRows=2'));

await fs.mkdir(auditDir, { recursive: true });
const finalOutcomeAuditFile = path.join(auditDir, 'scanner-final-delivery-outcome-loopback.json');
await fs.writeFile(finalOutcomeAuditFile, JSON.stringify({
  source: 'live-scanner',
  planVersionId: 'FINAL-OUTCOME-LOOPBACK',
  visibility: {
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    authority: { discordEligible: true, canExecute: false },
  },
  candidateLifecycleTrace: {
    alertDecision: { shouldSend: true, reason: 'eligible high-confidence review map' },
  },
  deliveryOutcome: {
    status: 'pending_final_delivery',
    reason: 'fixture pending',
    recordedAt: '2026-06-30T15:05:00.000Z',
  },
}, null, 2));
assert.equal(await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
  auditLogPath: finalOutcomeAuditFile,
  outcome: {
    status: 'sent',
    reason: 'Discord review map delivered in loopback.',
    discordMessageId: 'loopback-message-id',
    httpStatus: 204,
    webhookSource: 'scanner',
  },
}), true);
let finalOutcomeAudit = JSON.parse(await fs.readFile(finalOutcomeAuditFile, 'utf8'));
assert.equal(finalOutcomeAudit.deliveryOutcome.status, 'sent');
assert.equal(finalOutcomeAudit.deliveryOutcome.discordMessageId, 'loopback-message-id');
assert.deepEqual(validateScannerDiscordFinalDeliveryOutcome({
  audit: finalOutcomeAudit,
  requireTerminalForEligible: true,
}), {
  ok: true,
  status: 'sent',
  reason: 'Discord review map delivered in loopback.',
});
assert.equal(await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
  auditLogPath: finalOutcomeAuditFile,
  outcome: {
    status: 'hard_suppressed',
    reason: 'stale/no-chase loopback suppression',
    httpStatus: null,
    webhookSource: 'phase11_boundary',
  },
}), true);
finalOutcomeAudit = JSON.parse(await fs.readFile(finalOutcomeAuditFile, 'utf8'));
assert.equal(finalOutcomeAudit.deliveryOutcome.status, 'hard_suppressed');
assert.match(finalOutcomeAudit.deliveryOutcome.reason, /stale\/no-chase/);
assert.equal(validateScannerDiscordFinalDeliveryOutcome({
  audit: finalOutcomeAudit,
  requireTerminalForEligible: true,
}).ok, true);
assert.equal(await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
  auditLogPath: finalOutcomeAuditFile,
  outcome: {
    status: 'delivery_failed',
    reason: 'Discord webhook failed in loopback',
    httpStatus: 500,
    webhookSource: 'scanner',
  },
}), true);
finalOutcomeAudit = JSON.parse(await fs.readFile(finalOutcomeAuditFile, 'utf8'));
assert.equal(finalOutcomeAudit.deliveryOutcome.status, 'delivery_failed');
assert.equal(finalOutcomeAudit.deliveryOutcome.httpStatus, 500);
assert.equal(validateScannerDiscordFinalDeliveryOutcome({
  audit: finalOutcomeAudit,
  requireTerminalForEligible: true,
}).ok, true);
assert.equal(await writeScannerDiscordFinalDeliveryOutcomeFromReceipt({
  auditLogPath: finalOutcomeAuditFile,
  artifactLabel: 'Discord loopback artifact',
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 204,
    discordMessageId: 'receipt-helper-message-id',
  },
}), true);
finalOutcomeAudit = JSON.parse(await fs.readFile(finalOutcomeAuditFile, 'utf8'));
assert.equal(finalOutcomeAudit.deliveryOutcome.status, 'sent');
assert.equal(finalOutcomeAudit.deliveryOutcome.discordMessageId, 'receipt-helper-message-id');
assert.equal(await writeScannerDiscordFinalDeliveryOutcomeFromReceipt({
  auditLogPath: finalOutcomeAuditFile,
  artifactLabel: 'Discord loopback artifact',
  receipt: {
    deliveryStatus: 'skipped',
    webhookSource: 'phase11_boundary',
    httpStatus: null,
    discordMessageId: null,
  },
}), true);
finalOutcomeAudit = JSON.parse(await fs.readFile(finalOutcomeAuditFile, 'utf8'));
assert.equal(finalOutcomeAudit.deliveryOutcome.status, 'hard_suppressed');
assert.match(finalOutcomeAudit.deliveryOutcome.reason, /phase11_boundary/);
assert.equal(await writeScannerDiscordFinalDeliveryFailureOutcome({
  auditLogPath: finalOutcomeAuditFile,
  artifactLabel: 'Discord loopback artifact',
  error: new Error('loopback webhook failure'),
}), true);
finalOutcomeAudit = JSON.parse(await fs.readFile(finalOutcomeAuditFile, 'utf8'));
assert.equal(finalOutcomeAudit.deliveryOutcome.status, 'delivery_failed');
assert.match(finalOutcomeAudit.deliveryOutcome.reason, /loopback webhook failure/);

const nonTerminalEligibleOutcome = validateScannerDiscordFinalDeliveryOutcome({
  audit: {
    visibility: {
      visibilityMode: 'POST_REVIEW',
      discordAction: 'post_review',
      authority: { discordEligible: true, canExecute: false },
    },
    candidateLifecycleTrace: {
      alertDecision: { shouldSend: true, reason: 'eligible high-confidence review map' },
    },
    deliveryOutcome: {
      status: 'pending_final_delivery',
      reason: 'fixture pending',
    },
  },
  requireTerminalForEligible: true,
});
assert.equal(nonTerminalEligibleOutcome.ok, false);
assert.match(nonTerminalEligibleOutcome.reason, /non-terminal deliveryOutcome\.status=pending_final_delivery/);

const sentWithoutMessageIdOutcome = validateScannerDiscordFinalDeliveryOutcome({
  audit: {
    visibility: { authority: { discordEligible: true } },
    deliveryOutcome: {
      status: 'sent',
      reason: 'Sent but missing Discord message id.',
    },
  },
  requireTerminalForEligible: true,
});
assert.equal(sentWithoutMessageIdOutcome.ok, false);
assert.match(sentWithoutMessageIdOutcome.reason, /missing deliveryOutcome\.discordMessageId/);

const stalePendingOutcomeAuditFile = path.join(auditDir, 'scanner-lunch-2026-06-30-MES-STALLED-FINAL-OUTCOME.json');
await fs.writeFile(stalePendingOutcomeAuditFile, JSON.stringify({
  source: 'live-scanner',
  tradeDate: '2026-06-30',
  instrument: 'MES',
  planVersionId: 'LUNCH-20260630-STALLED',
  deliveryOutcome: {
    status: 'pending_final_delivery',
    reason: 'Discord artifact built; final delivery outcome has not been recorded yet.',
    recordedAt: '2026-06-30T19:55:00.000Z',
  },
}, null, 2));
const stalePendingOutcomeRecovery = await recoverStalePendingScannerFinalDeliveryOutcomes({
  auditDir,
  tradeDate: '2026-06-30',
  instrument: 'MES',
  now: new Date('2026-06-30T20:00:00.000Z'),
  staleMs: 60_000,
});
assert.equal(stalePendingOutcomeRecovery.checked, 1);
assert.equal(stalePendingOutcomeRecovery.recovered, 1);
const recoveredPendingOutcomeAudit = JSON.parse(await fs.readFile(stalePendingOutcomeAuditFile, 'utf8'));
assert.equal(recoveredPendingOutcomeAudit.deliveryOutcome.status, 'delivery_failed');
assert.match(recoveredPendingOutcomeAudit.deliveryOutcome.reason, /Recovered stale pending final delivery outcome/);

function counterStructureDeskStateFixture(direction: 'LONG' | 'SHORT', lowerBias: 'BULL' | 'BEAR' | 'RANGE'): DeskState {
  const matchingBias = direction === 'LONG' ? 'BULL' : 'BEAR';
  const line = direction === 'LONG' ? 5320 : 7467.5;
  const zone = direction === 'LONG'
    ? { lower: 5316, upper: 5320 }
    : { lower: 7460.75, upper: 7474 };
  return {
    sourceOfTruth: 'scanner_desk_state',
    marketMode: 'conditional',
    activeCampaign: null,
    bestLongPlan: null,
    bestShortPlan: null,
    selectedCandidate: null,
    lineInSand: line,
    nextTrigger: direction === 'LONG'
      ? 'Completed 5M reclaim/hold above 5320.00.'
      : 'Active tactical zone 7460.75-7474.00: completed 5M hold/reject below the zone required before fresh execution consideration.',
    invalidation: direction === 'LONG'
      ? 'Fresh LONG stand down on completed 5M acceptance below 5316.00.'
      : 'Fresh SHORT stand down on completed 5M acceptance above 7474.00.',
    visibilityMode: 'POST_CONDITIONAL',
    discordAction: 'post_conditional',
    suppressionReason: null,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'ok',
    canExecute: false,
    promotion: {} as any,
    visibilityMetadata: {
      visibilityMode: 'POST_CONDITIONAL',
      discordAction: 'post_conditional',
      suppressionReason: null,
      nextTrigger: null,
      dataQualityBlocker: null,
      holdWithReason: null,
      noTradeWithReason: null,
      hasMeaningfulStructuredEvidence: true,
      sourceOfTruth: 'scanner_desk_state_visibility_metadata',
      authority: {
        registeredModel: true,
        activeModel: true,
        watchEligible: true,
        planEligible: true,
        discordEligible: true,
        executionEligible: false,
        humanReviewOnly: true,
        canExecute: false,
      },
      notes: [],
    },
    candidateLifecycleTrace: {} as any,
    notes: [],
    primaryDeskPlay: {
      sourceOfTruth: 'scanner_primary_desk_play',
      direction,
      trendConfirmation: {} as any,
      activeTacticalLine: {
        sourceOfTruth: 'scanner_active_tactical_line',
        direction,
        originalLine: line,
        activeLine: line,
        migrated: false,
        supportingTimeframes: ['15M', '5M'],
        reason: 'fixture',
        nextTrigger: 'fixture trigger',
        standDown: 'fixture stand down',
        approvalBoundary: { changesTradeApprovals: false, changesCanExecute: false, changesEntryStopTargets: false },
      },
      activeTacticalZone: {
        sourceOfTruth: 'scanner_active_tactical_zone',
        direction,
        lower: zone.lower,
        upper: zone.upper,
        anchorLine: line,
        migratedFromLine: null,
        migrated: false,
        zoneLabel: 'fixture active zone',
        sourceTimeframe: '5M',
        state: 'holding',
        reason: 'fixture zone',
        nextTrigger: direction === 'LONG' ? 'Completed 5M reclaim/hold above 5320.00.' : 'Completed 5M hold/reject below 7460.75-7474.00.',
        standDown: direction === 'LONG' ? 'Fresh LONG stand down on completed 5M acceptance below 5316.00.' : 'Fresh SHORT stand down on completed 5M acceptance above 7474.00.',
        noChase: 'No chase.',
        approvalBoundary: { changesTradeApprovals: false, changesCanExecute: false, changesEntryStopTargets: false },
      },
      modelRouting: {} as any,
      title: `${direction} desk play`,
      summary: `${direction} fixture desk play.`,
      lineInSand: line,
      longAbove: direction === 'LONG' ? line : null,
      shortBelow: direction === 'SHORT' ? line : null,
      targetReactionLevel: null,
      targetReactionLabel: null,
      targetReactionReason: null,
      levelTransition: null,
      htfObjectiveLadder: {} as any,
      htfProtectedStructureMap: {
        sourceOfTruth: 'scanner_htf_protected_structure_map',
        reliability: 'structural',
        summary: 'fixture HTF map',
        rows: [
          { sourceOfTruth: 'scanner_htf_protected_structure_map', timeframe: '4H', bias: 'NEUTRAL', currentBias: 'RANGE', biasChangeLine: null, biasChangeConfirmation: null, protectedStructure: null, confirmationLine: null, target: null, targetLabel: null, confidence: 60, status: 'range', note: 'range' },
          { sourceOfTruth: 'scanner_htf_protected_structure_map', timeframe: '2H', bias: matchingBias, currentBias: matchingBias, biasChangeLine: null, biasChangeConfirmation: null, protectedStructure: null, confirmationLine: null, target: null, targetLabel: null, confidence: 80, status: 'aligned', note: 'aligned' },
          ...(['1H', '15M', '5M'] as const).map((timeframe) => ({ sourceOfTruth: 'scanner_htf_protected_structure_map' as const, timeframe, bias: lowerBias === 'RANGE' ? 'NEUTRAL' as const : lowerBias, currentBias: lowerBias, biasChangeLine: null, biasChangeConfirmation: null, protectedStructure: null, confirmationLine: null, target: null, targetLabel: null, confidence: 70, status: lowerBias, note: lowerBias })),
        ],
        approvalBoundary: { changesTradeApprovals: false, changesCanExecute: false, changesEntryStopTargets: false },
      },
      nextTrigger: null,
      invalidation: null,
      noChase: 'No chase.',
      longBias: { direction: 'LONG', decisionQualityScore: direction === 'LONG' ? 92 : 55, modelConfidenceScore: direction === 'LONG' ? 92 : 55, rankScore: direction === 'LONG' ? 92 : 55, nextTrigger: null, blockers: [], reason: 'fixture' } as any,
      shortBias: { direction: 'SHORT', decisionQualityScore: direction === 'SHORT' ? 98 : 55, modelConfidenceScore: direction === 'SHORT' ? 98 : 55, rankScore: direction === 'SHORT' ? 98 : 55, nextTrigger: null, blockers: [], reason: 'fixture' } as any,
      htfConflict: lowerBias !== matchingBias,
      countertrendWarning: null,
      discordEligible: true,
      approvalBoundary: { changesTradeApprovals: false, changesCanExecute: false, changesEntryStopTargets: false },
      notes: [],
    },
  } as DeskState;
}

const shortCounter = buildScannerCounterStructureConditional({
  deskState: counterStructureDeskStateFixture('SHORT', 'RANGE'),
  normalized: { canExecute: false } as any,
});
assert.equal(shortCounter?.counterStructureConditional, true);
assert.equal(shortCounter?.candidateDirection, 'SHORT');
assert.ok(shortCounter?.lowerTimeframeStateSummary.includes('1H RANGE'));
assert.ok(shortCounter?.standDown.includes('7474.00'));

const longCounter = buildScannerCounterStructureConditional({
  deskState: counterStructureDeskStateFixture('LONG', 'RANGE'),
  normalized: { canExecute: false } as any,
});
assert.equal(longCounter?.counterStructureConditional, true);
assert.equal(longCounter?.candidateDirection, 'LONG');
assert.ok(longCounter?.requiredTrigger.includes('5320.00'));

const alignedShortCounter = buildScannerCounterStructureConditional({
  deskState: counterStructureDeskStateFixture('SHORT', 'BEAR'),
  normalized: { canExecute: false } as any,
});
assert.equal(alignedShortCounter, null);

const phase3CounterShort = buildScannerMtfPrimarySideArbitration({
  deskState: counterStructureDeskStateFixture('SHORT', 'BULL'),
  normalized: { canExecute: false } as any,
});
assert.equal(phase3CounterShort.candidateRole, 'failure_scenario');
assert.equal(phase3CounterShort.mtfPrimarySide, 'LONG');
assert.equal(phase3CounterShort.mtfArbitrationStatus, 'counter_structure');
assert.match(phase3CounterShort.requiredProofToPromote, /Completed 5M/i);
assert.equal(phase3CounterShort.approvalBoundary.changesCanExecute, false);

const phase3AlignedLong = buildScannerMtfPrimarySideArbitration({
  deskState: counterStructureDeskStateFixture('LONG', 'BULL'),
  normalized: { canExecute: false } as any,
});
assert.equal(phase3AlignedLong.mtfPrimarySide, 'LONG');
assert.equal(phase3AlignedLong.candidateRole, 'primary_plan');
assert.notEqual(phase3AlignedLong.mtfArbitrationStatus, 'counter_structure');

const phase3AlignedShort = buildScannerMtfPrimarySideArbitration({
  deskState: counterStructureDeskStateFixture('SHORT', 'BEAR'),
  normalized: { canExecute: false } as any,
});
assert.equal(phase3AlignedShort.mtfPrimarySide, 'SHORT');
assert.equal(phase3AlignedShort.candidateRole, 'primary_plan');

const phase3CounterLong = buildScannerMtfPrimarySideArbitration({
  deskState: counterStructureDeskStateFixture('LONG', 'BEAR'),
  normalized: { canExecute: false } as any,
});
assert.equal(phase3CounterLong.mtfPrimarySide, 'SHORT');
assert.equal(phase3CounterLong.candidateRole, 'failure_scenario');

const phase3MixedHtfLowerPrimary = counterStructureDeskStateFixture('LONG', 'BULL');
phase3MixedHtfLowerPrimary.primaryDeskPlay.htfProtectedStructureMap.rows = phase3MixedHtfLowerPrimary.primaryDeskPlay.htfProtectedStructureMap.rows.map((row) => {
  if (row.timeframe === '4H' || row.timeframe === '2H') return { ...row, bias: 'BEAR', currentBias: 'BEAR', status: 'bearish' };
  return row;
});
const phase3Mixed = buildScannerMtfPrimarySideArbitration({
  deskState: phase3MixedHtfLowerPrimary,
  normalized: { canExecute: false } as any,
});
assert.equal(phase3Mixed.mtfPrimarySide, 'LONG');
assert.equal(phase3Mixed.mtfHtfSide, 'SHORT');
assert.equal(phase3Mixed.mtfLowerTimeframeSide, 'LONG');
assert.equal(phase3Mixed.mtfArbitrationStatus, 'mixed');

const phase3DataLimitedState = counterStructureDeskStateFixture('LONG', 'BULL');
phase3DataLimitedState.htfContextStatus = 'insufficient';
phase3DataLimitedState.primaryDeskPlay.htfProtectedStructureMap.reliability = 'data_limited';
const phase3DataLimited = buildScannerMtfPrimarySideArbitration({
  deskState: phase3DataLimitedState,
  normalized: { canExecute: false } as any,
});
assert.equal(phase3DataLimited.mtfArbitrationStatus, 'data_limited');
assert.equal(phase3DataLimited.mtfPrimarySide, 'DATA_LIMITED');
assert.equal(phase3DataLimited.candidateRole, 'stand_down');

const phase4LongState = counterStructureDeskStateFixture('LONG', 'BULL');
phase4LongState.primaryDeskPlay.targetReactionLevel = 7480;
phase4LongState.primaryDeskPlay.targetReactionLabel = '15M defended FVG';
phase4LongState.primaryDeskPlay.lineInSand = 7480;
phase4LongState.primaryDeskPlay.longAbove = 7488.25;
phase4LongState.primaryDeskPlay.levelTransition = {
  sourceOfTruth: 'scanner_level_transition_map',
  targetReactionLevel: 7480,
  targetReactionLabel: '15M defended FVG',
  targetReactionReason: 'fixture defended reaction',
  longAbove: 7488.25,
  shortBelow: 7463,
  profitProtectionInstruction: 'Protect after acceptance.',
  targetManagementInstruction: 'No chase into 7488.25; wait for acceptance.',
  nextStructureInstruction: 'Acceptance above 7480 promotes 7488.25.',
  approvalBoundary: { changesTradeApprovals: false, changesCanExecute: false, changesEntryStopTargets: false },
} as any;
phase4LongState.primaryDeskPlay.mtfPrimarySideArbitration = buildScannerMtfPrimarySideArbitration({
  deskState: phase4LongState,
  normalized: { canExecute: false } as any,
});
const phase4LongPromotion = buildScannerHtfTargetToLinePromotion({
  deskState: phase4LongState,
  normalized: { entry: 7480, stop: 7474, t1: 7489, t2: 7492, canExecute: false } as any,
});
assert.equal(phase4LongPromotion?.direction, 'LONG');
assert.equal(phase4LongPromotion?.currentReactionLine, 7480);
assert.equal(phase4LongPromotion?.nextHtfLine, 7488.25);
assert.equal(phase4LongPromotion?.primaryMapSide, 'LONG');
assert.equal(phase4LongPromotion?.appTargetsComplete, true);
assert.match(phase4LongPromotion?.acceptanceRule || '', /acceptance above 7480\.00 promotes 7488\.25/i);
assert.match(phase4LongPromotion?.failureRule || '', /Failure\/rejection below 7480\.00/i);
assert.equal(phase4LongPromotion?.approvalBoundary.changesEntryStopTargets, false);

const phase4ShortState = counterStructureDeskStateFixture('SHORT', 'BEAR');
phase4ShortState.primaryDeskPlay.targetReactionLevel = 7463;
phase4ShortState.primaryDeskPlay.targetReactionLabel = '60M rejection line';
phase4ShortState.primaryDeskPlay.lineInSand = 7463;
phase4ShortState.primaryDeskPlay.shortBelow = 7450;
phase4ShortState.primaryDeskPlay.levelTransition = {
  sourceOfTruth: 'scanner_level_transition_map',
  targetReactionLevel: 7463,
  targetReactionLabel: '60M rejection line',
  targetReactionReason: 'fixture rejected reaction',
  longAbove: 7474,
  shortBelow: 7450,
  profitProtectionInstruction: 'Protect after acceptance.',
  targetManagementInstruction: 'No chase into 7450; wait for acceptance.',
  nextStructureInstruction: 'Acceptance below 7463 promotes 7450.',
  approvalBoundary: { changesTradeApprovals: false, changesCanExecute: false, changesEntryStopTargets: false },
} as any;
phase4ShortState.primaryDeskPlay.mtfPrimarySideArbitration = buildScannerMtfPrimarySideArbitration({
  deskState: phase4ShortState,
  normalized: { canExecute: false } as any,
});
const phase4ShortPromotion = buildScannerHtfTargetToLinePromotion({
  deskState: phase4ShortState,
  normalized: { entry: 7460.25, stop: 7490, t1: 7415.75, t2: 7400.75, canExecute: false } as any,
});
assert.equal(phase4ShortPromotion?.direction, 'SHORT');
assert.equal(phase4ShortPromotion?.currentReactionLine, 7463);
assert.equal(phase4ShortPromotion?.nextHtfLine, 7450);
assert.equal(phase4ShortPromotion?.primaryMapSide, 'SHORT');
assert.match(phase4ShortPromotion?.acceptanceRule || '', /acceptance below 7463\.00 promotes 7450\.00/i);
assert.match(phase4ShortPromotion?.failureRule || '', /Failure\/rejection above 7463\.00/i);

const phase4MissingAppTargets = buildScannerHtfTargetToLinePromotion({
  deskState: phase4LongState,
  normalized: { entry: null, stop: null, t1: null, t2: null, canExecute: false } as any,
});
assert.equal(phase4MissingAppTargets?.appTargetsComplete, false);
assert.equal(phase4MissingAppTargets?.nextHtfLine, 7488.25);
assert.equal(shouldLogBridgeInstrumentResolution({
  instrument: 'MES 09-26',
  requestedInstrument: 'MES 06-26',
  source: 'front-month-rollover',
  warning: 'Configured bridge instrument MES 06-26 is stale after rollover; using active front-month contract MES 09-26.',
}, 'MES 06-26'), true);

const rebuilt120mFrom5m = aggregateScannerFiveMinuteBarsToTimeframe([
  { time: '2026-06-28T18:00:00', open: 7440, high: 7442, low: 7439, close: 7441, volume: 10 },
  { time: '2026-06-28T18:05:00', open: 7441, high: 7445, low: 7440, close: 7444, volume: 20 },
  { time: '2026-06-28T19:55:00', open: 7444, high: 7452, low: 7443, close: 7450, volume: 30 },
], '120m');
assert.equal(rebuilt120mFrom5m.length, 1);
assert.deepEqual(rebuilt120mFrom5m[0], {
  time: '2026-06-28T18:00:00',
  open: 7440,
  high: 7452,
  low: 7439,
  close: 7450,
  volume: 60,
});
const validNative120m = Array.from({ length: 370 }, (_, index) => {
  const time = new Date(Date.parse('2026-06-01T00:00:00-04:00') + index * 120 * 60_000).toISOString();
  return { time, open: 7440, high: 7442, low: 7438, close: 7441, volume: 10 };
});
assert.equal(scannerHistoryNeedsFiveMinuteAggregationRepair({
  timeframe: '120m',
  bars: validNative120m,
  requestedFrom: '2026-06-01T00:00:00-04:00',
  requestedTo: '2026-07-01T12:00:00-04:00',
  bridgeInstrument: 'MES 09-26',
}), false);
const native120mWithInternalGap = validNative120m.map((bar, index) => (
  index === 20
    ? { ...bar, time: '2026-06-02T17:00:00-04:00' }
    : bar
));
assert.equal(scannerHistoryNeedsFiveMinuteAggregationRepair({
  timeframe: '120m',
  bars: native120mWithInternalGap,
  requestedFrom: '2026-06-01T00:00:00-04:00',
  requestedTo: '2026-07-01T12:00:00-04:00',
  bridgeInstrument: 'MES 09-26',
}), true);
assert.equal(shouldLogBridgeInstrumentResolution({
  instrument: 'MES 09-26',
  requestedInstrument: 'MES',
  source: 'bridge-health',
  warning: 'Resolved root instrument MES to active bridge contract MES 09-26.',
}, 'MES'), true);
process.env.DISCORD_OUTCOME_BASE_URL = 'https://quant-desk.example';
process.env.DISCORD_OUTCOME_SECRET = 'test-secret';

function restoreOptionalEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

const completed5mAssuranceReady = evaluateCompletedFiveMinuteBarAssuranceGate({
  completed5m: { time: '2026-06-05T10:05:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 },
  now: new Date('2026-06-05T10:07:00-04:00'),
  barFreshness: {
    stale: false,
    latestTime: '2026-06-05T10:05:00-04:00',
    ageMinutes: 2,
    maxAllowedMinutes: 10,
    reason: null,
  },
  liveBars5m: [{ time: '2026-06-05T10:05:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 }],
  historyCoverage: [{
    timeframe: '5m',
    requiredLookbackDays: 30,
    requestedFrom: '2026-05-06T00:00:00-04:00',
    requestedTo: '2026-06-05T12:00:00-04:00',
    barsLoaded: 6000,
    rangeStart: '2026-05-06T00:00:00',
    rangeEnd: '2026-06-05T12:00:00',
    source: 'market_bars_bridge_repair',
    cacheBars: 5000,
    bridgeRepairBars: 1000,
    selfHealed: true,
    sufficient: true,
    warning: null,
  }],
  bridgeInstrument: 'MES 06-26',
  maxStaleBarMinutes: 10,
});
assert.equal(completed5mAssuranceReady.status, 'ready');
assert.ok(completed5mAssuranceReady.message.includes('Completed 5M Bar Assurance Gate ready'));
assert.ok(completed5mAssuranceReady.sourceSummary?.includes('history 5M=6000'));

const completed5mAssuranceMissing = evaluateCompletedFiveMinuteBarAssuranceGate({
  completed5m: null,
  now: new Date('2026-06-05T10:07:00-04:00'),
  barFreshness: {
    stale: true,
    latestTime: null,
    ageMinutes: null,
    maxAllowedMinutes: 10,
    reason: 'No completed 5M candle returned from NinjaTrader.',
  },
  liveBars5m: [],
  bridgeInstrument: 'MES 06-26',
  maxStaleBarMinutes: 10,
});
assert.equal(completed5mAssuranceMissing.status, 'blocked');
assert.ok(completed5mAssuranceMissing.message.includes('no completed 5M bar was available'));
assert.ok(completed5mAssuranceMissing.recoverySteps?.some((step) => step.includes('NinjaTrader')));

const completed5mAssuranceStale = evaluateCompletedFiveMinuteBarAssuranceGate({
  completed5m: { time: '2026-06-05T09:45:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 },
  now: new Date('2026-06-05T10:07:00-04:00'),
  barFreshness: {
    stale: true,
    latestTime: '2026-06-05T09:45:00-04:00',
    ageMinutes: 22,
    maxAllowedMinutes: 10,
    reason: 'Latest completed 5M candle is stale.',
  },
  liveBars5m: [{ time: '2026-06-05T09:45:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 }],
  bridgeInstrument: 'MES 06-26',
  maxStaleBarMinutes: 10,
});
assert.equal(completed5mAssuranceStale.status, 'blocked');
assert.ok(completed5mAssuranceStale.message.includes('Latest completed 5M candle is stale'));

const completed5mLatencyOnTime = evaluateScannerCompletedFiveMinuteLatencySentinel({
  completed5m: { time: '2026-06-05T10:05:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 },
  now: new Date('2026-06-05T10:10:45-04:00'),
  timestampMode: 'open',
  timeZoneMode: 'eastern',
  warningThresholdSeconds: 90,
});
assert.equal(completed5mLatencyOnTime.status, 'on_time');
assert.equal(completed5mLatencyOnTime.latencySeconds, 45);
assert.equal(completed5mLatencyOnTime.approvalBoundary.changesTradeApprovals, false);

const completed5mLatencyLate = evaluateScannerCompletedFiveMinuteLatencySentinel({
  completed5m: { time: '2026-06-05T10:05:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 },
  now: new Date('2026-06-05T10:12:01-04:00'),
  timestampMode: 'open',
  timeZoneMode: 'eastern',
  warningThresholdSeconds: 90,
});
assert.equal(completed5mLatencyLate.status, 'late');
assert.equal(completed5mLatencyLate.latencySeconds, 121);
assert.ok(completed5mLatencyLate.message.includes('Fast-open moves may be stale'));

const missedMoveReentryWatch = buildScannerMissedMoveReentryWatch({
  candidate: {
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'ICT Model 1 Short',
    direction: 'SHORT',
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: ExecutionStatus.Executable,
    confidence: 'High',
    priority: 98,
    entry: 7502.25,
    stop: 7524.25,
    target1: 7469.25,
    target2: 7458.25,
    riskPoints: 22,
    riskAdvisoryStatus: 'RISK_ABOVE_STANDARD_LIMIT',
    riskPolicy: 'STRUCTURAL_RISK_ACKNOWLEDGED',
    invalidation: 'Invalid above 7524.25.',
    entryClarity: 10,
    stopClarity: 10,
    targetClarity: 10,
    proximityScore: 10,
    levelContextScore: 10,
    levelContextSummary: 'test',
    evidence: [],
    missingEvidence: [],
    blockReason: null,
    requiredTrigger: 'Entry only on retrace into bearish imbalance.',
    nextAction: 'No chase.',
    reducedRiskPlan: null,
  },
  currentPrice: 7451.75,
  completed5m: { time: '2026-07-23T09:15:00', open: 7458, high: 7459.5, low: 7454, close: 7458.25, volume: 8450 },
  staleReason: 'T1 was already reached before alert generation. Move occurred without preferred retest. No chase entry.',
});
assert.equal(missedMoveReentryWatch.status, 'watch_retest_only');
assert.equal(missedMoveReentryWatch.tradeAlertEligible, false);
assert.equal(missedMoveReentryWatch.freshEntryAvailable, false);
assert.ok(missedMoveReentryWatch.requiredNextCondition?.includes('fresh completed 5M retest'));
assert.equal(missedMoveReentryWatch.approvalBoundary.watchChangesCanExecute, false);

const scannerDataQualityNoticeConfig: ScannerConfig = {
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  bridgeUrl: 'http://127.0.0.1:8765',
  account: 'Sim101',
  pollSeconds: 60,
  dryRun: true,
  once: true,
  continuousMode: true,
  scanWindows: true,
  discordEnabled: true,
  afternoonEnabled: false,
  thresholds: { conditional: 65, executable: 80, educationalBlocked: 70 },
  maxChaseDistancePoints: 10,
  maxChaseDistanceR: 0.75,
  staleSetupMaxCandles: 3,
  targetAlreadySweptLookbackCandles: 12,
  allowRetestOnlyEntries: false,
  maxStaleBarMinutes: 10,
  marketMapRefreshSeconds: 300,
  preMarketDataGate: true,
  macroCalendarEnabled: true,
  geminiAdvisoryFallbackEnabled: false,
  barTimestampMode: 'close',
  barTimeZone: 'eastern',
  discordMessageCleanupEnabled: true,
  discordMessageTtlMinutes: 15,
};

const reviewOnlyPrimaryAlertGateFixture: Parameters<typeof evaluateScannerPrimaryAlertPublishingGate>[0] = {
  alertDecision: { shouldSend: true, reason: 'High-Quality Trade Plan qualified for Discord.' },
  candidate: {
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Bearish Turtle Soup Reversal',
    direction: 'SHORT',
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: ExecutionStatus.Conditional,
    confidence: 'High',
    priority: 92,
    decisionQualityScore: 93,
    entry: 7557.5,
    stop: 7582,
    target1: 7520.75,
    target2: 7508.5,
    riskPoints: 24.5,
    invalidation: 'Invalid if price trades above 7582.',
    entryClarity: 90,
    stopClarity: 90,
    targetClarity: 90,
    levelContextScore: 18,
    evidence: ['Buy-side sweep candidate'],
    missingEvidence: ['15M and 5M protected structure are not aligned for this side.'],
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M proof below/retest around 7557.50.',
    nextAction: 'Review only; no chase.',
    reducedRiskPlan: null,
  } as SetupCandidate,
  deskState: {
    primaryDeskPlay: {
      direction: 'WAIT',
      htfConflict: true,
      longBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
      shortBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as DeskState,
  normalizedCanExecute: false,
  state: 'Approved',
  staleReason: null,
  scannerReviewStatus: null,
};
const reviewOnlyPrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate(reviewOnlyPrimaryAlertGateFixture);
assert.equal(reviewOnlyPrimaryAlertGate.shouldSend, true);
assert.match(reviewOnlyPrimaryAlertGate.reason, /suppression bypassed for high-confidence conditional publication/);
assert.match(reviewOnlyPrimaryAlertGate.reason, /REVIEW ONLY \/ NOT EXECUTION APPROVAL/);
assert.match(reviewOnlyPrimaryAlertGate.reason, /app-owned canExecute gate turns true/);
assert.match(reviewOnlyPrimaryAlertGate.reason, /canExecute=false/);
assert.match(reviewOnlyPrimaryAlertGate.reason, /DeskState primary=WAIT/);
assert.match(reviewOnlyPrimaryAlertGate.reason, /readiness=not_aligned/);
assert.match(reviewOnlyPrimaryAlertGate.reason, /HTF\/protected structure conflict/);
const staleHighQualityPrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  staleReason: 'no chase: T1 already reached before alert generation',
});
assert.equal(staleHighQualityPrimaryAlertGate.shouldSend, false);
assert.match(staleHighQualityPrimaryAlertGate.reason, /stale\/no-chase review state/);
const blockedTargetRoomPrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    decisionQualityScore: 98,
    decisionQualityHardBlocker: 'Clean 1.5R path unavailable: imbalance sits before T1.',
    targetRoom: {
      targetRoomStatus: 'blocked_before_t1',
      t1Available: false,
      t2Available: false,
      cleanPathToT1: false,
      obstacleBeforeT1: true,
      t2ExtensionAvailable: false,
      t2ExtensionObstructed: true,
      targetRoomReason: 'Clean 1.5R path unavailable: imbalance sits before T1.',
    },
  },
});
assert.equal(blockedTargetRoomPrimaryAlertGate.shouldSend, false);
assert.doesNotMatch(blockedTargetRoomPrimaryAlertGate.reason, /suppression bypassed for high-confidence conditional publication/);
const confidenceBlockedPrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  confidence: {
    score: 0,
    hardBlocker: 'Clean 1.5R path unavailable',
  } as any,
});
assert.equal(confidenceBlockedPrimaryAlertGate.shouldSend, false);
assert.match(confidenceBlockedPrimaryAlertGate.reason, /decision quality hard blocker: Clean 1\.5R path unavailable/);
assert.match(confidenceBlockedPrimaryAlertGate.reason, /decision quality score=0/);
assert.doesNotMatch(confidenceBlockedPrimaryAlertGate.reason, /suppression bypassed for high-confidence conditional publication/);
const priceAwayFromZonePrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  deskState: {
    primaryDeskPlay: {
      direction: 'SHORT',
      htfConflict: true,
      activeTacticalZone: {
        direction: 'SHORT',
        lower: 7429.25,
        upper: 7431.5,
      },
      shortBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as unknown as DeskState,
  currentPrice: 7470.5,
});
assert.equal(priceAwayFromZonePrimaryAlertGate.shouldSend, false);
assert.match(priceAwayFromZonePrimaryAlertGate.reason, /current price 7470\.50 is above active tactical zone 7429\.25-7431\.50/);
assert.doesNotMatch(priceAwayFromZonePrimaryAlertGate.reason, /suppression bypassed for high-confidence conditional publication/);
const oppositeDeskStatePrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    direction: 'SHORT',
  },
  deskState: {
    primaryDeskPlay: {
      direction: 'LONG',
      htfConflict: true,
      longBias: {
        tradeReadiness: { status: 'aligned' },
      },
      shortBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as unknown as DeskState,
});
assert.equal(oppositeDeskStatePrimaryAlertGate.shouldSend, false);
assert.match(oppositeDeskStatePrimaryAlertGate.reason, /candidate side SHORT conflicts with DeskState LONG/);
assert.doesNotMatch(oppositeDeskStatePrimaryAlertGate.reason, /suppression bypassed for high-confidence conditional publication/);
const oppositeHtfRoutingPrimaryAlertGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    direction: 'LONG',
    entry: 7470.75,
    stop: 7467,
    target1: 7480,
    target2: 7490,
  },
  deskState: {
    primaryDeskPlay: {
      direction: 'SHORT',
      htfConflict: true,
      htfFvgReactionRouting: {
        status: 'routed_active_reaction',
        direction: 'SHORT',
      },
      longBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
      shortBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as unknown as DeskState,
  staleReason: 'Bullish Turtle Soup: sell-side sweep below 7468, reclaim back above the swept low.',
});
assert.equal(oppositeHtfRoutingPrimaryAlertGate.shouldSend, false);
assert.match(oppositeHtfRoutingPrimaryAlertGate.reason, /candidate side LONG conflicts with active HTF FVG routing SHORT/);
assert.doesNotMatch(oppositeHtfRoutingPrimaryAlertGate.reason, /suppression bypassed for high-confidence conditional publication/);

const june29MissedShortCandidate = {
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  confidence: 'High',
  priority: 90,
  decisionQualityScore: 90,
  entry: 7460.25,
  stop: 7490,
  target1: 7415.75,
  target2: 7400.75,
  riskPoints: 29.75,
  invalidation: 'Invalid if price reclaims above the protected 5M MSS swing stop near 7490.00.',
  entryClarity: 90,
  stopClarity: 90,
  targetClarity: 90,
  levelContextScore: 18,
  evidence: ['Completed bearish 5M MSS plus bearish 15M MSS/displacement context.'],
  missingEvidence: [],
  blockReason: null,
  requiredTrigger: 'Completed 5M close-through/retest below 7463.00.',
  nextAction: 'Human Review Ready bearish intraday MSS micro-continuation plan. No chase; trader confirmation required and canExecute remains false.',
  reducedRiskPlan: null,
} as SetupCandidate;
const june29ReviewOnlyShortGateFixture: Parameters<typeof evaluateScannerPrimaryAlertPublishingGate>[0] = {
  alertDecision: { shouldSend: false, reason: 'Executable/approved plan below 80 score threshold.' },
  candidate: june29MissedShortCandidate,
  deskState: {
    primaryDeskPlay: {
      direction: 'WAIT',
      lineInSand: 7463,
      shortBelow: 7460,
      longAbove: 7478.5,
      targetReactionLevel: 7450,
      shortBias: {
        tradeReadiness: { status: 'human_review_ready' },
      },
      longBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
    },
    dataQualityStatus: 'partial',
    htfContextStatus: 'sufficient',
  } as unknown as DeskState,
  normalizedCanExecute: false,
  state: 'Approved',
  currentPrice: 7460.25,
  staleReason: null,
  scannerReviewStatus: null,
};
const june29ReviewOnlyShortGate = evaluateScannerPrimaryAlertPublishingGate(june29ReviewOnlyShortGateFixture);
assert.equal(june29ReviewOnlyShortGate.shouldSend, true);
assert.match(june29ReviewOnlyShortGate.reason, /Executable\/approved plan below 80 score threshold/);
assert.match(june29ReviewOnlyShortGate.reason, /REVIEW ONLY \/ NOT EXECUTION APPROVAL/);
assert.match(june29ReviewOnlyShortGate.reason, /app-owned canExecute gate turns true/);
assert.match(june29ReviewOnlyShortGate.reason, /DeskState primary=WAIT/);
assert.match(june29ReviewOnlyShortGate.reason, /canExecute=false/);

const june29DuplicateAlertKey = '2026-06-29|MES|morning|SHORT|SweepMssFvgRetrace|7467.5|Approved';
const june29FreshReviewDelivery = applyScannerHardDuplicateAlertSuppression({
  alertDecision: june29ReviewOnlyShortGate,
  alertKey: june29DuplicateAlertKey,
  existing: null,
  previousDelivery: null,
  planVersionId: 'MORNING-20260629-144350',
});
assert.equal(june29FreshReviewDelivery.shouldSend, true);
const june29DuplicateDelivery = applyScannerHardDuplicateAlertSuppression({
  alertDecision: june29ReviewOnlyShortGate,
  alertKey: june29DuplicateAlertKey,
  existing: { state: 'Approved', confidence: 100, sentAt: '2026-06-29T14:43:59.000Z' },
  previousDelivery: {
    alertKey: june29DuplicateAlertKey,
    planVersionId: 'MORNING-20260629-144350',
    instrument: 'MES',
    tradeDate: '2026-06-29',
    session: 'morning',
    state: 'Approved',
    confidence: 100,
    candidate: {
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      entry: 7467.5,
      stop: 7490,
      target1: 7417.25,
      target2: 7409,
      activeTimeframeMssRuleset: null,
      activeCampaign: null,
    },
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'first-message',
    error: null,
    attemptedAt: '2026-06-29T14:43:58.000Z',
    sentAt: '2026-06-29T14:43:59.000Z',
    auditLogPath: 'scanner-morning-2026-06-29-MES-MORNING-20260629-144350.json',
    stale: false,
    retryEligible: false,
  },
  planVersionId: 'MORNING-20260629-154202',
});
assert.equal(june29DuplicateDelivery.shouldSend, false);
assert.match(june29DuplicateDelivery.reason, /duplicate_suppressed_hard/);
assert.match(june29DuplicateDelivery.reason, /same_candidate_lifecycle_refresh_suppressed/);
assert.match(june29DuplicateDelivery.reason, /priorPlanVersionId=MORNING-20260629-144350/);
assert.match(june29DuplicateDelivery.reason, /priorDiscordMessageId=first-message/);
assert.match(june29DuplicateDelivery.reason, /High-confidence conditional bypass cannot override durable duplicate suppression/);

const july15LunchNearDuplicateCandidate = {
  ...june29MissedShortCandidate,
  setupType: SetupType.IntradayMssMicroContinuation,
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  entry: 7608,
  stop: 7620,
  target1: 7590,
  target2: 7584,
  decisionQualityScore: 86,
} as SetupCandidate;
const july15LunchPriorTradeAlertDelivery: ScannerAlertDeliveryRecord = {
  alertKey: '2026-07-15|MES|lunch|SHORT|IntradayMssMicroContinuation|7609.5|Conditional',
  planVersionId: 'LUNCH-20260715-194627',
  instrument: 'MES',
  tradeDate: '2026-07-15',
  session: 'lunch',
  state: 'Conditional',
  confidence: 86,
  candidate: {
    setupType: 'IntradayMssMicroContinuation',
    direction: 'SHORT',
    entry: 7609.5,
    stop: 7620.25,
    target1: 7593.5,
    target2: 7588,
    activeTimeframeMssRuleset: null,
    activeCampaign: null,
  },
  deliveryStatus: 'sent',
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  httpStatus: 200,
  discordMessageId: 'lunch-first-message',
  error: null,
  attemptedAt: '2026-07-15T19:46:27.000Z',
  sentAt: '2026-07-15T19:46:31.000Z',
  auditLogPath: 'scanner-lunch-2026-07-15-MES-LUNCH-20260715-194627.json',
  stale: false,
  retryEligible: false,
};
const july15LunchNearDuplicateSuppression = applyScannerNearDuplicateTradeAlertCadenceSuppression({
  alertDecision: { shouldSend: true, reason: 'High-quality conditional review map qualified for Discord.' },
  alertKey: '2026-07-15|MES|lunch|SHORT|IntradayMssMicroContinuation|7608|Conditional',
  candidate: july15LunchNearDuplicateCandidate,
  state: 'Conditional',
  priorActiveDelivery: july15LunchPriorTradeAlertDelivery,
  planVersionId: 'LUNCH-20260715-194745',
  now: '2026-07-15T19:47:51.000Z',
});
assert.equal(july15LunchNearDuplicateSuppression.shouldSend, false);
assert.match(july15LunchNearDuplicateSuppression.reason, /near_duplicate_trade_alert_cadence_suppressed/);
assert.match(july15LunchNearDuplicateSuppression.reason, /same_family_nearby_entry_refresh_suppressed/);
assert.match(july15LunchNearDuplicateSuppression.reason, /entryDrift=1\.50/);

const july15LunchDistinctAlertAllowed = applyScannerNearDuplicateTradeAlertCadenceSuppression({
  alertDecision: { shouldSend: true, reason: 'High-quality conditional review map qualified for Discord.' },
  alertKey: '2026-07-15|MES|lunch|SHORT|IntradayMssMicroContinuation|7604|Conditional',
  candidate: { ...july15LunchNearDuplicateCandidate, entry: 7604 } as SetupCandidate,
  state: 'Conditional',
  priorActiveDelivery: {
    ...july15LunchPriorTradeAlertDelivery,
    sentAt: '2026-07-15T19:47:00.000Z',
  },
  planVersionId: 'LUNCH-20260715-194845',
  now: '2026-07-15T19:48:00.000Z',
});
assert.equal(july15LunchDistinctAlertAllowed.shouldSend, true);

const june29SweepMssFvgRetraceCandidate = {
  ...june29MissedShortCandidate,
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Sweep MSS FVG Retrace',
  decisionQualityScore: 98,
  entry: 7467.5,
  stop: 7490,
  target1: 7417.25,
  target2: 7409,
  riskPoints: 22.5,
  requiredTrigger: 'Entry only on retrace into bearish imbalance 7460.75-7474 after sweep, reclaim, displacement, and bearish structure shift.',
} as SetupCandidate;
const june29ShortZoneDeskState = {
  primaryDeskPlay: {
    direction: 'SHORT',
    activeTacticalZone: {
      direction: 'SHORT',
      lower: 7460.75,
      upper: 7474,
    },
    shortBias: {
      tradeReadiness: { status: 'human_review_ready' },
    },
  },
  dataQualityStatus: 'partial',
  htfContextStatus: 'sufficient',
} as unknown as DeskState;
const shortZoneFailureDelivery = applyScannerCompletedFiveMinuteZoneFailureSuppression({
  alertDecision: { shouldSend: true, reason: 'Fresh high-confidence conditional review map.' },
  deskState: june29ShortZoneDeskState,
  candidate: june29SweepMssFvgRetraceCandidate,
  completed5m: { time: '2026-06-29T11:45:00.0000000', open: 7470, high: 7475, low: 7466.75, close: 7474.25, volume: 8688 },
});
assert.equal(shortZoneFailureDelivery.shouldSend, false);
assert.match(shortZoneFailureDelivery.reason, /zone_failed_completed_5m/);
assert.match(shortZoneFailureDelivery.reason, /direction=SHORT/);
assert.match(shortZoneFailureDelivery.reason, /completedClose=7474\.25/);
assert.match(shortZoneFailureDelivery.reason, /zoneUpper=7474\.00/);
const longZoneFailureDelivery = applyScannerCompletedFiveMinuteZoneFailureSuppression({
  alertDecision: { shouldSend: true, reason: 'Fresh high-confidence conditional review map.' },
  deskState: {
    primaryDeskPlay: {
      direction: 'LONG',
      activeTacticalZone: {
        direction: 'LONG',
        lower: 7422,
        upper: 7428,
      },
    },
  } as unknown as DeskState,
  candidate: {
    ...june29MissedShortCandidate,
    direction: 'LONG',
    entry: 7426.75,
    stop: 7422,
    target1: 7434,
    target2: 7436.25,
  } as SetupCandidate,
  completed5m: { time: '2026-06-29T11:45:00.0000000', open: 7426, high: 7427, low: 7420.75, close: 7421.75, volume: 8688 },
});
assert.equal(longZoneFailureDelivery.shouldSend, false);
assert.match(longZoneFailureDelivery.reason, /zone_failed_completed_5m/);
assert.match(longZoneFailureDelivery.reason, /direction=LONG/);
assert.match(longZoneFailureDelivery.reason, /completedClose=7421\.75/);

const longFailureShortTransitionLines = buildScannerReversalWatchLines({
  deskState: {
    canExecute: false,
    primaryDeskPlay: {
      direction: 'LONG',
      activeTacticalZone: {
        direction: 'LONG',
        lower: 7597.75,
        upper: 7598,
        anchorLine: 7593.5,
      },
      lineInSand: 7593.5,
      longBias: {},
      shortBias: {},
      levelTransition: {
        shortBelow: 7593.5,
      },
    },
    bestLongPlan: {
      target1: 7613.75,
      target2: 7619,
    },
    bestShortPlan: null,
  } as unknown as DeskState,
  completed5m: { time: '2026-07-06T19:20:00.0000000', open: 7595.75, high: 7595.75, low: 7592, close: 7592.25, volume: 1083 },
  currentPrice: 7593.75,
});
assert.equal(longFailureShortTransitionLines.eligible, true);
assert.equal(longFailureShortTransitionLines.exhaustedSide, 'LONG');
assert.equal(longFailureShortTransitionLines.watchDirection, 'SHORT');
assert.equal(longFailureShortTransitionLines.triggerLine, 7593.5);
assert.match(longFailureShortTransitionLines.reason, /LONG active tactical zone failed/);
assert.equal(longFailureShortTransitionLines.approvalBoundary.changesCanExecute, false);
const longFailureShortTransitionState = classifyScannerReversalWatchState({
  lines: longFailureShortTransitionLines,
  completed5m: { time: '2026-07-06T19:20:00.0000000', open: 7595.75, high: 7595.75, low: 7592, close: 7592.25, volume: 1083 },
  completed5mHistory: [
    { time: '2026-07-06T19:10:00.0000000', open: 7596.75, high: 7597.5, low: 7595, close: 7596, volume: 545 },
    { time: '2026-07-06T19:15:00.0000000', open: 7596, high: 7597.25, low: 7595.5, close: 7595.75, volume: 437 },
  ],
  currentPrice: 7593.75,
});
assert.equal(longFailureShortTransitionState.state, 'watch_active');
assert.equal(longFailureShortTransitionState.reclaimConfirmed, true);
const longFailureShortTransitionSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-07-06',
  instrument: 'MES',
  session: 'evening',
  latestCompleted5m: '2026-07-06T19:20:00.0000000',
  lines: longFailureShortTransitionLines,
  state: longFailureShortTransitionState,
  reversalWatchSent: {},
});
assert.equal(longFailureShortTransitionSuppression.shouldPost, true);
assert.match(longFailureShortTransitionSuppression.reason, /SHORT reversal watch active/);
const longFailureShortNoChaseState = classifyScannerReversalWatchState({
  lines: longFailureShortTransitionLines,
  completed5m: { time: '2026-07-06T19:40:00.0000000', open: 7591.75, high: 7592.25, low: 7584.75, close: 7585.25, volume: 1800 },
  completed5mHistory: [
    { time: '2026-07-06T19:20:00.0000000', open: 7595.75, high: 7595.75, low: 7592, close: 7592.25, volume: 1083 },
    { time: '2026-07-06T19:25:00.0000000', open: 7592.25, high: 7593.75, low: 7591.5, close: 7593.25, volume: 1166 },
    { time: '2026-07-06T19:30:00.0000000', open: 7593.5, high: 7594.25, low: 7592, close: 7593, volume: 779 },
  ],
  currentPrice: 7585.25,
});
assert.equal(longFailureShortNoChaseState.state, 'no_chase');
const longFailureShortNoChaseSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-07-06',
  instrument: 'MES',
  session: 'evening',
  latestCompleted5m: '2026-07-06T19:40:00.0000000',
  lines: longFailureShortTransitionLines,
  state: longFailureShortNoChaseState,
  reversalWatchSent: {},
});
assert.equal(longFailureShortNoChaseSuppression.shouldPost, true);
assert.match(longFailureShortNoChaseSuppression.reason, /Campaign transition alert/);
assert.match(longFailureShortNoChaseSuppression.reason, /LONG active tactical zone failed/);

const shortFailureLongTransitionLines = buildScannerReversalWatchLines({
  deskState: {
    canExecute: false,
    primaryDeskPlay: {
      direction: 'SHORT',
      activeTacticalZone: {
        direction: 'SHORT',
        lower: 7588,
        upper: 7592,
        anchorLine: 7595.5,
      },
      lineInSand: 7595.5,
      longBias: {},
      shortBias: {},
    },
    bestLongPlan: null,
    bestShortPlan: {
      target1: 7588.5,
      target2: 7586,
    },
  } as unknown as DeskState,
  completed5m: { time: '2026-07-06T19:20:00.0000000', open: 7592, high: 7597, low: 7591.75, close: 7596, volume: 1083 },
  currentPrice: 7596,
});
assert.equal(shortFailureLongTransitionLines.eligible, true);
assert.equal(shortFailureLongTransitionLines.exhaustedSide, 'SHORT');
assert.equal(shortFailureLongTransitionLines.watchDirection, 'LONG');
assert.equal(shortFailureLongTransitionLines.triggerLine, 7595.5);
assert.match(shortFailureLongTransitionLines.reason, /SHORT active tactical zone failed/);

const june29FailureReplayBars = [
  ['2026-06-29T10:35:00.0000000', 7463],
  ['2026-06-29T10:40:00.0000000', 7460.75],
  ['2026-06-29T10:45:00.0000000', 7459.5],
  ['2026-06-29T10:50:00.0000000', 7455.5],
  ['2026-06-29T10:55:00.0000000', 7469],
  ['2026-06-29T11:00:00.0000000', 7468],
  ['2026-06-29T11:05:00.0000000', 7463],
  ['2026-06-29T11:10:00.0000000', 7461.25],
  ['2026-06-29T11:15:00.0000000', 7464],
  ['2026-06-29T11:20:00.0000000', 7459],
  ['2026-06-29T11:25:00.0000000', 7456.5],
  ['2026-06-29T11:30:00.0000000', 7467.25],
  ['2026-06-29T11:35:00.0000000', 7465.75],
  ['2026-06-29T11:40:00.0000000', 7470],
  ['2026-06-29T11:45:00.0000000', 7474.25],
  ['2026-06-29T11:50:00.0000000', 7469],
] as const;
let replaySentCount = 0;
let replayExisting: { state: ScannerState; confidence: number; sentAt: string } | null = null;
let replayPreviousDelivery: Parameters<typeof applyScannerHardDuplicateAlertSuppression>[0]['previousDelivery'] = null;
let replayZoneFailureSeen = false;
for (const [time, close] of june29FailureReplayBars) {
  const duplicateDecision = applyScannerHardDuplicateAlertSuppression({
    alertDecision: { shouldSend: true, reason: 'High-confidence conditional review replay.' },
    alertKey: june29DuplicateAlertKey,
    existing: replayExisting,
    previousDelivery: replayPreviousDelivery,
    planVersionId: `MORNING-20260629-${time.slice(11, 16).replace(':', '')}`,
  });
  const finalDecision = applyScannerCompletedFiveMinuteZoneFailureSuppression({
    alertDecision: duplicateDecision,
    deskState: june29ShortZoneDeskState,
    candidate: june29SweepMssFvgRetraceCandidate,
    completed5m: { time, open: close, high: close, low: close, close, volume: 1 },
  });
  if (/zone_failed_completed_5m/.test(finalDecision.reason)) replayZoneFailureSeen = true;
  if (finalDecision.shouldSend) {
    replaySentCount += 1;
    replayExisting = { state: 'Approved', confidence: 100, sentAt: time };
    replayPreviousDelivery = {
      alertKey: june29DuplicateAlertKey,
      planVersionId: 'MORNING-20260629-144350',
      instrument: 'MES',
      tradeDate: '2026-06-29',
      session: 'morning',
      state: 'Approved',
      confidence: 100,
      candidate: {
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT',
        entry: 7467.5,
        stop: 7490,
        target1: 7417.25,
        target2: 7409,
        activeTimeframeMssRuleset: null,
        activeCampaign: null,
      },
      deliveryStatus: 'sent',
      webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
      httpStatus: 200,
      discordMessageId: 'replay-first-message',
      error: null,
      attemptedAt: time,
      sentAt: time,
      auditLogPath: 'scanner-morning-2026-06-29-MES-MORNING-20260629-144350.json',
      stale: false,
      retryEligible: false,
    };
  } else if (replayExisting) {
    assert.match(finalDecision.reason, /duplicate_suppressed_hard|zone_failed_completed_5m/);
  }
}
assert.equal(replaySentCount, 1);
assert.equal(replayZoneFailureSeen, true);

const june29NoChaseShortGate = evaluateScannerPrimaryAlertPublishingGate({
  ...june29ReviewOnlyShortGateFixture,
  alertDecision: { shouldSend: false, reason: 'Missed setup below educational alert threshold.' },
  candidate: {
    ...june29MissedShortCandidate,
    entry: 7458.75,
    stop: 7490,
    target1: 7412,
    target2: 7396.25,
  },
  state: 'Missed',
  currentPrice: 7450,
  staleReason: 'Preferred entry was missed. Do not chase. Waiting for new retest or next setup.',
  scannerReviewStatus: null,
});
assert.equal(june29NoChaseShortGate.shouldSend, false);
assert.match(june29NoChaseShortGate.reason, /stale\/no-chase review state|state=Missed/);
assert.doesNotMatch(june29NoChaseShortGate.reason, /REVIEW ONLY \/ NOT EXECUTION APPROVAL/);

const june29DataLimitedShortGate = evaluateScannerPrimaryAlertPublishingGate({
  ...june29ReviewOnlyShortGateFixture,
  alertDecision: { shouldSend: false, reason: 'Primary trade-card suppressed because the readiness gate is data-limited; review-map Discord output may post tactical levels only.' },
  deskState: {
    ...june29ReviewOnlyShortGateFixture.deskState,
    dataQualityStatus: 'data_limited',
    htfContextStatus: 'insufficient',
  } as unknown as DeskState,
});
assert.equal(june29DataLimitedShortGate.shouldSend, false);
assert.match(june29DataLimitedShortGate.reason, /HTF\/data context insufficient/);

const missingLevelHighConfidenceGate = evaluateScannerPrimaryAlertPublishingGate({
  ...june29ReviewOnlyShortGateFixture,
  candidate: {
    ...june29MissedShortCandidate,
    target1: null,
    target2: null,
  } as SetupCandidate,
});
assert.equal(missingLevelHighConfidenceGate.shouldSend, false);
assert.doesNotMatch(missingLevelHighConfidenceGate.reason, /REVIEW ONLY \/ NOT EXECUTION APPROVAL/);

const throughTargetHighConfidenceGate = evaluateScannerPrimaryAlertPublishingGate({
  ...june29ReviewOnlyShortGateFixture,
  currentPrice: 7415.5,
});
assert.equal(throughTargetHighConfidenceGate.shouldSend, false);
assert.match(throughTargetHighConfidenceGate.reason, /already reached\/passed T1 7415\.75/);

const priorShortCampaignDelivery: ScannerAlertDeliveryRecord = {
  alertKey: '2026-07-02|MES|morning|SHORT|IntradayMssMicroContinuation|7526.75|Conditional',
  planVersionId: 'MORNING-20260702-152114',
  instrument: 'MES' as const,
  tradeDate: '2026-07-02',
  session: 'morning' as const,
  state: 'Conditional' as ScannerState,
  confidence: 75,
  candidate: {
    setupType: 'IntradayMssMicroContinuation',
    direction: 'SHORT',
    entry: 7526.75,
    stop: 7577,
    target1: 7451.5,
    target2: 7426.25,
    activeTimeframeMssRuleset: null,
    activeCampaign: {
      id: '2026-07-02:SHORT:15M5M-MSS',
      status: 'active',
      direction: 'SHORT',
      htfRelationship: 'support',
      lineInSand: 7544.5,
      deDuplication: {
        oneTradePerCampaignRecommended: true,
        enforced: true,
        resetPolicy: 'trade_date_direction_campaign',
      },
    },
  },
  deliveryStatus: 'sent' as const,
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL' as const,
  httpStatus: 200,
  discordMessageId: 'prior-short-message',
  error: null,
  attemptedAt: '2026-07-02T15:21:18.355Z',
  sentAt: '2026-07-02T15:21:19.383Z',
  auditLogPath: 'scanner-morning-2026-07-02-MES-MORNING-20260702-152114.json',
  stale: false,
  retryEligible: false,
};
const campaignTransitionBlocksLong = evaluateScannerDiscordCampaignTransition({
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    direction: 'LONG',
    entry: 7548,
    stop: 7535,
    target1: 7567.5,
    target2: 7574,
  } as SetupCandidate,
  priorActiveDelivery: priorShortCampaignDelivery,
  completed5m: { time: '2026-07-02T12:00:00-04:00', open: 7538, high: 7542, low: 7520, close: 7536, volume: 1 },
});
assert.equal(campaignTransitionBlocksLong.blocksOppositeDirection, true);
assert.match(campaignTransitionBlocksLong.reason || '', /SHORT campaign still active/);
const oppositeLongWhileShortActiveGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  alertDecision: { shouldSend: true, reason: 'Long conditional qualified.' },
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    direction: 'LONG',
    entry: 7548,
    stop: 7535,
    target1: 7567.5,
    target2: 7574,
  } as SetupCandidate,
  priorActiveDelivery: priorShortCampaignDelivery,
  completed5m: { time: '2026-07-02T12:00:00-04:00', open: 7538, high: 7542, low: 7520, close: 7536, volume: 1 },
});
assert.equal(oppositeLongWhileShortActiveGate.shouldSend, false);
assert.match(oppositeLongWhileShortActiveGate.reason, /SHORT campaign still active/);
assert.match(oppositeLongWhileShortActiveGate.reason, /line in the sand 7544\.50 has not been crossed/);
const campaignTransitionAllowsLongAfterLineCross = evaluateScannerDiscordCampaignTransition({
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    direction: 'LONG',
    entry: 7550,
    stop: 7538,
    target1: 7568,
    target2: 7574,
  } as SetupCandidate,
  priorActiveDelivery: priorShortCampaignDelivery,
  completed5m: { time: '2026-07-02T12:05:00-04:00', open: 7538, high: 7551, low: 7535, close: 7548, volume: 1 },
});
assert.equal(campaignTransitionAllowsLongAfterLineCross.blocksOppositeDirection, false);
assert.match(campaignTransitionAllowsLongAfterLineCross.reason || '', /SHORT campaign line crossed/);
const oppositeLongAfterShortLineCrossGate = evaluateScannerPrimaryAlertPublishingGate({
  ...reviewOnlyPrimaryAlertGateFixture,
  alertDecision: { shouldSend: true, reason: 'Long conditional qualified.' },
  candidate: {
    ...reviewOnlyPrimaryAlertGateFixture.candidate!,
    direction: 'LONG',
    entry: 7550,
    stop: 7538,
    target1: 7568,
    target2: 7574,
  } as SetupCandidate,
  deskState: {
    primaryDeskPlay: {
      direction: 'LONG',
      htfConflict: false,
      longBias: {
        tradeReadiness: { status: 'aligned' },
      },
      shortBias: {
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as unknown as DeskState,
  priorActiveDelivery: priorShortCampaignDelivery,
  completed5m: { time: '2026-07-02T12:05:00-04:00', open: 7538, high: 7551, low: 7535, close: 7548, volume: 1 },
});
assert.equal(oppositeLongAfterShortLineCrossGate.shouldSend, true);
assert.match(oppositeLongAfterShortLineCrossGate.reason, /Campaign transition: SHORT campaign line crossed/);
const latestPriorCampaignDelivery = latestSentScannerTradeAlertDelivery({
  deliveries: {
    oldFailed: { ...priorShortCampaignDelivery, deliveryStatus: 'failed', sentAt: null, discordMessageId: null },
    oldLong: {
      ...priorShortCampaignDelivery,
      alertKey: 'old-long',
      candidate: { ...priorShortCampaignDelivery.candidate, direction: 'LONG' },
      sentAt: '2026-07-02T14:00:00.000Z',
    },
    latestShort: priorShortCampaignDelivery,
  },
  tradeDate: '2026-07-02',
  instrument: 'MES',
  session: 'morning',
  excludeAlertKey: 'current-alert',
});
assert.equal(latestPriorCampaignDelivery?.alertKey, priorShortCampaignDelivery.alertKey);

assert.equal(
  scannerDiscordWebhookUrlForPost('https://discord.com/api/webhooks/123/token', undefined, true),
  'https://discord.com/api/webhooks/123/token?wait=true',
);
assert.equal(
  scannerDiscordWebhookUrlForPost('https://discord.com/api/webhooks/123/token', [{ type: 1 }], true),
  'https://discord.com/api/webhooks/123/token?with_components=true&wait=true',
);
assert.equal(
  scannerDiscordWebhookDeleteUrl('https://discord.com/api/webhooks/123/token?wait=true', 'message-123'),
  'https://discord.com/api/webhooks/123/token/messages/message-123',
);
const receiptAuditPath = await writeScannerDiscordReceiptAuditLog({
  kind: 'desk_play',
  key: '2026-06-05:MES:morning:DESK_PLAN_REFRESH:test',
  planVersionId: 'MORNING-20260605-140000-DESK-PLAY',
  tradeDate: '2026-06-05',
  instrument: 'MES',
  session: 'morning',
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'desk-play-message-789',
  },
  postedAt: '2026-06-05T14:00:03.000Z',
  cleanupRecordKey: 'desk_play:2026-06-05:MES:morning:DESK_PLAN_REFRESH:test:desk-play-message-789',
  ragReceiptAttached: true,
  auditDir,
});
assert.ok(receiptAuditPath);
const receiptAudit = JSON.parse(await fs.readFile(receiptAuditPath, 'utf8'));
assert.equal(receiptAudit.source, 'live-scanner-discord-receipt');
assert.equal(receiptAudit.planVersionId, 'MORNING-20260605-140000-DESK-PLAY');
assert.equal(receiptAudit.discordMessage.messageId, 'desk-play-message-789');
assert.equal(receiptAudit.discordMessage.ragReceiptAttached, true);
assert.equal(JSON.stringify(receiptAudit).includes('discord.com/api/webhooks'), false);
const scannerDeskPlayReceiptSource = await fs.readFile(path.join(process.cwd(), 'tools/automation/nt-scanner.ts'), 'utf8');
assert.match(
  scannerDeskPlayReceiptSource,
  /await attachDiscordMessageReceiptToRagRecord\(\{\s*planVersionId: deskPlayPlanVersionId,\s*discordMessageId: receipt\.discordMessageId,\s*webhookSource: receipt\.webhookSource,/s,
  'Desk Play Discord sends must persist the returned message id into RAG so outcome buttons can lock the card.',
);
assert.match(
  scannerDeskPlayReceiptSource,
  /await writeScannerDiscordReceiptAuditLog\(\{\s*kind: 'desk_play',\s*key: deskPlayKey,\s*planVersionId: deskPlayPlanVersionId,/s,
  'Desk Play Discord sends must write a durable receipt audit so old RAG rows can be repaired without guessing.',
);
const cleanupState: any = {
  discordCleanupMessages: {},
};
const scannerDataQualityNoticeCleanupConfig = {
  ...scannerDataQualityNoticeConfig,
  dryRun: false,
};
const cleanupRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'message-123',
  },
  kind: 'data_quality',
  key: '2026-06-05:MES:morning:data-quality',
  now: new Date('2026-06-05T14:00:00.000Z'),
});
assert.ok(cleanupRecord);
assert.equal(cleanupRecord?.expiresAt, '2026-06-05T14:15:00.000Z');
const protectedDeskPlayCleanupRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'desk-play-message-123',
  },
  kind: 'desk_play',
  key: '2026-06-05:MES:morning:DESK_PLAN_REFRESH:old',
  now: new Date('2026-06-05T14:00:00.000Z'),
});
const replacementDeskPlanCleanupRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'desk-play-message-456',
  },
  kind: 'desk_play',
  key: '2026-06-05:MES:morning:DESK_PLAN_REFRESH:latest',
  now: new Date('2026-06-05T14:05:00.000Z'),
});
const protectedTradeAlertCleanupRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'trade-alert-message-123',
  },
  kind: 'trade_alert',
  key: '2026-06-05:MES:morning:trade-alert',
  now: new Date('2026-06-05T14:00:00.000Z'),
});
assert.ok(protectedDeskPlayCleanupRecord);
assert.equal(protectedDeskPlayCleanupRecord?.expiresAt, '9999-12-31T23:59:59.999Z');
assert.ok(replacementDeskPlanCleanupRecord);
assert.equal(protectedTradeAlertCleanupRecord, null);
cleanupState.discordCleanupMessages['desk_play:2026-06-05:MES:morning:DESK_PLAN_REFRESH:legacy:legacy-desk-play-message-123'] = {
  key: 'desk_play:2026-06-05:MES:morning:DESK_PLAN_REFRESH:legacy:legacy-desk-play-message-123',
  messageId: 'legacy-desk-play-message-123',
  kind: 'desk_play',
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  postedAt: '2026-06-05T14:00:00.000Z',
  expiresAt: '2026-06-05T14:15:00.000Z',
  deletedAt: null,
  deleteStatus: 'pending',
  lastError: null,
};
cleanupState.discordCleanupMessages['desk_play:2026-06-05:MES:lunch:DESK_PLAN_REFRESH:old-lunch:lunch-desk-play-message-123'] = {
  key: 'desk_play:2026-06-05:MES:lunch:DESK_PLAN_REFRESH:old-lunch:lunch-desk-play-message-123',
  messageId: 'lunch-desk-play-message-123',
  kind: 'desk_play',
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  postedAt: '2026-06-05T16:00:00.000Z',
  expiresAt: '9999-12-31T23:59:59.999Z',
  deletedAt: null,
  deleteStatus: 'pending',
  lastError: null,
};
cleanupState.discordCleanupMessages['desk_play:2026-06-06:MES:morning:DESK_PLAN_REFRESH:next-day:next-day-desk-play-message-123'] = {
  key: 'desk_play:2026-06-06:MES:morning:DESK_PLAN_REFRESH:next-day:next-day-desk-play-message-123',
  messageId: 'next-day-desk-play-message-123',
  kind: 'desk_play',
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  postedAt: '2026-06-06T14:00:00.000Z',
  expiresAt: '9999-12-31T23:59:59.999Z',
  deletedAt: null,
  deleteStatus: 'pending',
  lastError: null,
};
cleanupState.discordCleanupMessages['legacy-trade-alert'] = {
  key: 'legacy-trade-alert',
  messageId: 'legacy-trade-alert-message-123',
  kind: 'trade_alert',
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  postedAt: '2026-06-05T14:00:00.000Z',
  expiresAt: '2026-06-05T14:15:00.000Z',
  deletedAt: null,
  deleteStatus: 'pending',
  lastError: null,
};
const previousScannerWebhook = process.env.QUANT_DESK_SCANNER_WEBHOOK_URL;
process.env.QUANT_DESK_SCANNER_WEBHOOK_URL = 'https://discord.com/api/webhooks/123/token';
const cleanupDeletes: string[] = [];
const replacementResult = await replacePriorScannerDiscordCurrentDeskPlans({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  currentDeskPlanKey: '2026-06-05:MES:morning:DESK_PLAN_REFRESH:latest',
  now: new Date('2026-06-05T14:06:00.000Z'),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    cleanupDeletes.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(null, { status: 204 });
  },
});
assert.deepEqual(replacementResult, { checked: 3, deleted: 0, failed: 0, skipped: 0, superseded: 3 });
assert.equal(cleanupDeletes.length, 0, 'Desk Plan replacement must retain Discord cards so outcome buttons can still lock.');
assert.equal(cleanupState.discordCleanupMessages[protectedDeskPlayCleanupRecord!.key].deleteStatus, 'superseded');
assert.equal(cleanupState.discordCleanupMessages[protectedDeskPlayCleanupRecord!.key].deletedAt, null);
assert.equal(cleanupState.discordCleanupMessages[protectedDeskPlayCleanupRecord!.key].lastError?.includes('message_retained_for_outcome_lock'), true);
assert.equal(cleanupState.discordCleanupMessages['desk_play:2026-06-05:MES:morning:DESK_PLAN_REFRESH:legacy:legacy-desk-play-message-123'].deleteStatus, 'superseded');
assert.equal(cleanupState.discordCleanupMessages['desk_play:2026-06-05:MES:lunch:DESK_PLAN_REFRESH:old-lunch:lunch-desk-play-message-123'].deleteStatus, 'superseded');
assert.equal(cleanupState.discordCleanupMessages['desk_play:2026-06-06:MES:morning:DESK_PLAN_REFRESH:next-day:next-day-desk-play-message-123'].deleteStatus, 'pending');
assert.equal(cleanupState.discordCleanupMessages[replacementDeskPlanCleanupRecord!.key].deleteStatus, 'pending');
const cleanupResult = await cleanupExpiredScannerDiscordMessages({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  now: new Date('2026-06-05T14:16:00.000Z'),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    cleanupDeletes.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(null, { status: 204 });
  },
});
restoreOptionalEnv('QUANT_DESK_SCANNER_WEBHOOK_URL', previousScannerWebhook);
assert.deepEqual(cleanupResult, { checked: 2, deleted: 1, failed: 0, skipped: 1 });
assert.deepEqual(cleanupDeletes, [
  'DELETE https://discord.com/api/webhooks/123/token/messages/message-123',
]);
assert.equal(cleanupState.discordCleanupMessages[cleanupRecord!.key].deleteStatus, 'deleted');
assert.equal(cleanupState.discordCleanupMessages['legacy-trade-alert'].deleteStatus, 'skipped');
assert.equal(cleanupState.discordCleanupMessages['legacy-trade-alert'].lastError, 'protected_message_kind_not_ephemeral');
const recoveredOperationalRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'data-quality-message-456',
  },
  kind: 'data_quality',
  key: '2026-06-05:MES:morning:data-quality:recovered-fixture',
  now: new Date('2026-06-05T14:20:00.000Z'),
});
assert.ok(recoveredOperationalRecord);
const recoveredWindowStartRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'window-start-message-456',
  },
  kind: 'window_start',
  key: '2026-06-05:morning:scanner-window-start',
  now: new Date('2026-06-05T14:20:00.000Z'),
});
assert.ok(recoveredWindowStartRecord);
const recoveredDeletes: string[] = [];
process.env.QUANT_DESK_SCANNER_WEBHOOK_URL = 'https://discord.com/api/webhooks/123/token';
const recoveredCleanupResult = await cleanupRecoveredScannerOperationalDiscordMessages({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  now: new Date('2026-06-05T14:21:00.000Z'),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    recoveredDeletes.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(null, { status: 204 });
  },
});
restoreOptionalEnv('QUANT_DESK_SCANNER_WEBHOOK_URL', previousScannerWebhook);
assert.deepEqual(recoveredCleanupResult, { checked: 2, deleted: 2, failed: 0, skipped: 0 });
assert.deepEqual(recoveredDeletes, [
  'DELETE https://discord.com/api/webhooks/123/token/messages/data-quality-message-456',
  'DELETE https://discord.com/api/webhooks/123/token/messages/window-start-message-456',
]);
assert.equal(cleanupState.discordCleanupMessages[recoveredOperationalRecord!.key].deleteStatus, 'deleted');
assert.equal(cleanupState.discordCleanupMessages[recoveredWindowStartRecord!.key].deleteStatus, 'deleted');
assert.equal(cleanupState.discordCleanupMessages['legacy-trade-alert'].deleteStatus, 'skipped');
const scannerHealthDataQualityRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'SUPERVISOR_DISCORD_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'scanner-health-data-quality-message-789',
  },
  kind: 'data_quality',
  key: '2026-06-05:MES:morning:data-quality:scanner-health-fixture',
  now: new Date('2026-06-05T14:22:00.000Z'),
});
assert.ok(scannerHealthDataQualityRecord);
const previousSupervisorWebhook = process.env.SUPERVISOR_DISCORD_WEBHOOK_URL;
process.env.SUPERVISOR_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/scanner-health/token';
const scannerHealthDeletes: string[] = [];
const scannerHealthCleanupResult = await cleanupExpiredScannerDiscordMessages({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  now: new Date('2026-06-05T14:38:00.000Z'),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    scannerHealthDeletes.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(null, { status: 204 });
  },
});
restoreOptionalEnv('SUPERVISOR_DISCORD_WEBHOOK_URL', previousSupervisorWebhook);
assert.equal(scannerHealthCleanupResult.deleted >= 1, true);
assert.ok(scannerHealthDeletes.includes('DELETE https://discord.com/api/webhooks/scanner-health/token/messages/scanner-health-data-quality-message-789'));
assert.equal(cleanupState.discordCleanupMessages[scannerHealthDataQualityRecord!.key].deleteStatus, 'deleted');
const olderHealthRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'health-message-old',
  },
  kind: 'health',
  key: 'health:STALE',
  now: new Date('2026-06-05T14:22:00.000Z'),
});
const latestHealthRecord = recordScannerDiscordCleanupMessage({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  receipt: {
    deliveryStatus: 'sent',
    webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
    httpStatus: 200,
    discordMessageId: 'health-message-latest',
  },
  kind: 'health',
  key: 'health:READY',
  now: new Date('2026-06-05T14:23:00.000Z'),
});
assert.ok(olderHealthRecord);
assert.ok(latestHealthRecord);
const floodControlDeletes: string[] = [];
process.env.QUANT_DESK_SCANNER_WEBHOOK_URL = 'https://discord.com/api/webhooks/123/token';
const floodControlResult = await replacePriorScannerDiscordOperationalMessages({
  state: cleanupState,
  config: scannerDataQualityNoticeCleanupConfig,
  kind: 'health',
  currentKey: 'health:READY',
  now: new Date('2026-06-05T14:24:00.000Z'),
  fetchImpl: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    floodControlDeletes.push(`${init?.method || 'GET'} ${String(input)}`);
    return new Response(null, { status: 204 });
  },
});
restoreOptionalEnv('QUANT_DESK_SCANNER_WEBHOOK_URL', previousScannerWebhook);
assert.deepEqual(floodControlResult, { checked: 1, deleted: 1, failed: 0, skipped: 0 });
assert.deepEqual(floodControlDeletes, ['DELETE https://discord.com/api/webhooks/123/token/messages/health-message-old']);
assert.equal(cleanupState.discordCleanupMessages[olderHealthRecord!.key].deleteStatus, 'replaced');
assert.equal(cleanupState.discordCleanupMessages[latestHealthRecord!.key].deleteStatus, 'pending');
const dataQualityNotice = buildScannerDataQualityNoticePayload({
  tradeDate: '2026-06-05',
  session: 'morning',
  config: scannerDataQualityNoticeConfig,
  windowLabel: 'Morning Setup Scan',
  currentPrice: 7519,
  completed5m: { time: '2026-06-05T09:45:00-04:00', open: 7518, high: 7520, low: 7515, close: 7519, volume: 1000 },
  completedFiveMinuteBarAssurance: completed5mAssuranceStale,
  reason: completed5mAssuranceStale.message,
  manualRun: true,
});
const dataQualityText = flattenDiscordPayloadText(dataQualityNotice);
assert.ok(dataQualityText.includes('No trade alert was posted'));
assert.ok(dataQualityText.includes('Latest completed 5M'));
assert.ok(dataQualityText.includes('Expected completed 5M near'));
assert.ok(dataQualityText.includes('No entries, stops, targets, approvals, or outcome buttons were created'));
assert.equal(dataQualityNotice.components, undefined);
const eveningDataQualityNotice = buildScannerDataQualityNoticePayload({
  tradeDate: '2026-06-16',
  session: 'evening',
  config: scannerDataQualityNoticeConfig,
  windowLabel: 'Evening Setup Scan',
  currentPrice: 7591.75,
  completed5m: { time: '2026-06-16T19:35:00.0000000', open: 7590, high: 7592, low: 7589, close: 7591.75, volume: 1000 },
  completedFiveMinuteBarAssurance: completed5mAssuranceStale,
  reason: completed5mAssuranceStale.message,
  manualRun: false,
});
assert.ok(flattenDiscordPayloadText(eveningDataQualityNotice).includes('Scanner Data-Quality Blocker - Evening'));
assert.ok(flattenDiscordPayloadText(eveningDataQualityNotice).includes('Quant Desk Scanner Data-Quality Notice - Evening'));
assert.equal(flattenDiscordPayloadText(eveningDataQualityNotice).includes('Scanner Data-Quality Blocker - Lunch'), false);
assert.equal(
  shouldSendScannerDataQualityNoticeForWindow(resolveScannerWindow(new Date('2026-06-05T10:00:00-04:00'))),
  true,
);
assert.equal(
  shouldSendScannerDataQualityNoticeForWindow(resolveScannerWindow(new Date('2026-06-05T16:46:00-04:00'))),
  false,
);
assert.equal(
  shouldSendScannerDataQualityNoticeForWindow(resolveScannerWindow(new Date('2026-06-05T18:45:00-04:00'))),
  false,
);
assert.equal(
  shouldSendScannerDataQualityNoticeForWindow(resolveScannerWindow(new Date('2026-06-14T18:45:00-04:00'))),
  true,
);
assert.equal(
  shouldSendScannerDataQualityNoticeForWindow(resolveScannerWindow(new Date('2026-06-13T10:00:00-04:00'))),
  false,
);
assert.equal(
  shouldSuppressScannerDataQualityNoticeForReason({
    session: 'evening',
    reason: 'Pre-Market Data Readiness + Backfill Gate DATA_NOT_READY: completed5m=ready, insufficient=120m. Real cache/bridge backfill was attempted where available.',
  }),
  true,
);
assert.equal(
  shouldSuppressScannerDataQualityNoticeForReason({
    session: 'evening',
    reason: 'Pre-Market Data Readiness + Backfill Gate DATA_NOT_READY: completed5m=ready, insufficient=240m. Real cache/bridge backfill was attempted where available.',
  }),
  true,
);
assert.equal(
  shouldSuppressScannerDataQualityNoticeForReason({
    session: 'evening',
    reason: 'Pre-Market Data Readiness + Backfill Gate DATA_NOT_READY: completed5m=ready, insufficient=120m,240m. Real cache/bridge backfill was attempted where available.',
  }),
  true,
);
assert.equal(
  shouldSuppressScannerDataQualityNoticeForReason({
    session: 'lunch',
    reason: 'Pre-Market Data Readiness + Backfill Gate DATA_NOT_READY: completed5m=ready, insufficient=120m. Real cache/bridge backfill was attempted where available.',
  }),
  false,
);
assert.equal(
  shouldSuppressScannerDataQualityNoticeForReason({
    session: 'evening',
    reason: completed5mAssuranceStale.message,
  }),
  false,
);
assert.equal(
  shouldSuppressScannerDataQualityNoticeForReason({
    session: 'evening',
    reason: 'Pre-Market Data Readiness + Backfill Gate DATA_NOT_READY: completed5m=blocked, insufficient=5m,240m. Real cache/bridge backfill was attempted where available.',
  }),
  false,
);
assert.equal(scannerDataQualityNoticeKey({
  tradeDate: '2026-06-05',
  session: 'morning',
  instrument: 'MES',
  reason: completed5mAssuranceStale.message,
  latestCompleted5mTime: completed5mAssuranceStale.latestCompletedTime,
  expectedCompleted5mTime: completed5mAssuranceStale.expectedCompletedTime,
}), scannerDataQualityNoticeKey({
  tradeDate: '2026-06-05',
  session: 'morning',
  instrument: 'MES',
  reason: completed5mAssuranceStale.message,
  latestCompleted5mTime: completed5mAssuranceStale.latestCompletedTime,
  expectedCompleted5mTime: completed5mAssuranceStale.expectedCompletedTime,
}));
assert.notEqual(scannerDataQualityNoticeKey({
  tradeDate: '2026-06-05',
  session: 'morning',
  instrument: 'MES',
  reason: completed5mAssuranceStale.message,
  latestCompleted5mTime: '2026-06-05T09:50:00-04:00',
  expectedCompleted5mTime: completed5mAssuranceStale.expectedCompletedTime,
}), scannerDataQualityNoticeKey({
  tradeDate: '2026-06-05',
  session: 'morning',
  instrument: 'MES',
  reason: completed5mAssuranceStale.message,
  latestCompleted5mTime: completed5mAssuranceStale.latestCompletedTime,
  expectedCompleted5mTime: completed5mAssuranceStale.expectedCompletedTime,
}));

const sufficientHistoryCoverage = (['5m', '15m', '60m', '120m', '240m'] as const).map((timeframe) => ({
  timeframe,
  requiredLookbackDays: 30,
  requestedFrom: '2026-05-06T00:00:00-04:00',
  requestedTo: '2026-06-05T12:00:00-04:00',
  barsLoaded: timeframe === '5m' ? 6000 : 1000,
  rangeStart: '2026-05-06T00:00:00',
  rangeEnd: '2026-06-05T12:00:00',
  source: 'market_bars_bridge_repair' as const,
  cacheBars: 800,
  bridgeRepairBars: 200,
  selfHealed: true,
  sufficient: true,
  warning: null,
}));

const preMarketDataReady = evaluatePreMarketDataReadinessBackfillGate({
  coverage: sufficientHistoryCoverage,
  completedFiveMinuteBarAssurance: completed5mAssuranceReady,
});
assert.equal(preMarketDataReady.status, 'ready');
assert.equal(preMarketDataReady.canEnterTradePlanningMode, true);
assert.deepEqual(preMarketDataReady.insufficientTimeframes, []);
assert.equal(preMarketDataReady.boundary, 'data_readiness_only_not_trade_approval');

const preMarketDataMissingHtf = evaluatePreMarketDataReadinessBackfillGate({
  coverage: sufficientHistoryCoverage.map((item) => item.timeframe === '120m'
    ? {
        ...item,
        barsLoaded: 0,
        rangeStart: null,
        rangeEnd: null,
        source: 'missing' as const,
        cacheBars: 0,
        bridgeRepairBars: 0,
        selfHealed: false,
        sufficient: false,
        warning: '120M bars were not returned by cache or bridge.',
      }
    : item),
  completedFiveMinuteBarAssurance: completed5mAssuranceReady,
});
assert.equal(preMarketDataMissingHtf.status, 'data_not_ready');
assert.equal(preMarketDataMissingHtf.canEnterTradePlanningMode, false);
assert.deepEqual(preMarketDataMissingHtf.insufficientTimeframes, ['120m']);
assert.ok(preMarketDataMissingHtf.sourceSummary.includes('120m: insufficient'));
assert.ok(preMarketDataMissingHtf.recoverySteps.some((step) => step.includes('market_bars')));

const preMarketDataMissingCompletedFive = evaluatePreMarketDataReadinessBackfillGate({
  coverage: sufficientHistoryCoverage,
  completedFiveMinuteBarAssurance: completed5mAssuranceMissing,
});
assert.equal(preMarketDataMissingCompletedFive.status, 'data_not_ready');
assert.equal(preMarketDataMissingCompletedFive.completedFiveMinuteReady, false);
assert.equal(preMarketDataMissingCompletedFive.canEnterTradePlanningMode, false);
assert.ok(preMarketDataMissingCompletedFive.completedFiveMinuteMessage.includes('no completed 5M bar'));

const scannerSource = await fs.readFile(path.join(process.cwd(), 'tools/automation/nt-scanner.ts'), 'utf8');
const windowStartIndex = scannerSource.indexOf('await sendWindowStartAlert({');
const readinessGateIndex = scannerSource.indexOf('if (shouldRunPreMarketDataReadinessGate(config, window))', windowStartIndex);
const readinessDataQualityIndex = scannerSource.indexOf('await sendScannerDataQualityNoticeIfNeeded({', readinessGateIndex);
assert.ok(windowStartIndex > 0, 'scanner must send an active-window heartbeat in the live scan path');
assert.ok(readinessGateIndex > windowStartIndex, 'active-window heartbeat must not be suppressed by pre-market data readiness');
assert.ok(readinessDataQualityIndex > readinessGateIndex, 'data-readiness blockers must send a data-quality notice before returning');
assert.ok(scannerSource.includes('readEnvWithWindowsUserFallback'), 'scanner webhook resolver must read Windows user-scope env when process env is missing');

assert.deepEqual(resolveScannerDiscordWebhookUrl({}), { url: null, source: null, usingGenericFallback: false });
assert.deepEqual(resolveScannerDiscordWebhookUrl({ DISCORD_WEBHOOK_URL: 'https://discord.example/generic' }), {
  url: 'https://discord.example/generic',
  source: 'DISCORD_WEBHOOK_URL',
  usingGenericFallback: true,
});
assert.deepEqual(resolveScannerDiscordWebhookUrl({
  DISCORD_WEBHOOK_URL: 'https://discord.example/generic',
  SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner',
}), {
  url: 'https://discord.example/scanner',
  source: 'SCANNER_DISCORD_WEBHOOK_URL',
  usingGenericFallback: false,
});
assert.deepEqual(resolveScannerOperationalDiscordWebhookUrl({
  SUPERVISOR_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner-health',
  QUANT_DESK_HEALTH_WEBHOOK_URL: 'https://discord.example/health-alias',
}), {
  url: 'https://discord.example/scanner-health',
  source: 'SUPERVISOR_DISCORD_WEBHOOK_URL',
  usingGenericFallback: false,
});
assert.deepEqual(resolveScannerOperationalDiscordWebhookUrl({
  QUANT_DESK_HEALTH_WEBHOOK_URL: 'https://discord.example/health-alias',
}), {
  url: 'https://discord.example/health-alias',
  source: 'QUANT_DESK_HEALTH_WEBHOOK_URL',
  usingGenericFallback: false,
});

const watchlistScopedBars = barsForMorningContinuationWatchlist({
  tradeDate: '2026-06-03',
  barTimeZone: 'eastern',
  currentEtMinutes: 10 * 60,
  bars5m: [
    { time: '2026-05-18T15:05:00.0000000', open: 7265, high: 7270, low: 7225.25, close: 7269.5, volume: 1000 },
    { time: '2026-06-03T09:30:00.0000000', open: 7611.75, high: 7622.25, low: 7608, close: 7614, volume: 1000 },
    { time: '2026-06-03T09:35:00.0000000', open: 7614, high: 7618, low: 7590, close: 7595, volume: 1000 },
    { time: '2026-06-03T09:40:00.0000000', open: 7595, high: 7598, low: 7574, close: 7581, volume: 1000 },
    { time: '2026-06-03T10:00:00.0000000', open: 7585, high: 7590, low: 7584.25, close: 7586.25, volume: 1000 },
    { time: '2026-06-03T10:05:00.0000000', open: 7586.25, high: 7594, low: 7585, close: 7592, volume: 1000 },
  ],
});
assert.deepEqual(watchlistScopedBars.map((bar) => bar.time), [
  '2026-06-03T09:30:00.0000000',
  '2026-06-03T09:35:00.0000000',
  '2026-06-03T09:40:00.0000000',
  '2026-06-03T10:00:00.0000000',
]);
assert.equal(Math.max(...watchlistScopedBars.slice(0, 6).map((bar) => bar.high)), 7622.25);
assert.equal(Math.min(...watchlistScopedBars.slice(0, 6).map((bar) => bar.low)), 7574);
assert.deepEqual(buildSegmentedHistoryRepairWindows(
  '2026-05-06T00:00:00-04:00',
  '2026-06-05T12:00:00-04:00',
  10,
), [
  { from: '2026-05-06T00:00:00-04:00', to: '2026-05-15T23:59:00-04:00' },
  { from: '2026-05-16T00:00:00-04:00', to: '2026-05-25T23:59:00-04:00' },
  { from: '2026-05-26T00:00:00-04:00', to: '2026-06-04T23:59:00-04:00' },
  { from: '2026-06-05T00:00:00-04:00', to: '2026-06-05T12:00:00-04:00' },
]);
const sundayEveningFourHourCoverageBars = [
  ...Array.from({ length: 29 }, (_, index) => ({
    time: `${new Date(Date.UTC(2026, 4, 15 + index)).toISOString().slice(0, 10)}T02:00:00-04:00`,
    open: 7400,
    high: 7410,
    low: 7390,
    close: 7405,
    volume: 1000,
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    time: `2026-06-12T${String(6 + index).padStart(2, '0')}:00:00-04:00`,
    open: 7400,
    high: 7410,
    low: 7390,
    close: 7405,
    volume: 1000,
  })),
];
assert.equal(
  barsCoverRequestedLookback(
    sundayEveningFourHourCoverageBars,
    '2026-05-15T00:00:00-04:00',
    '2026-06-14T20:35:00-04:00',
    '240m',
  ),
  true,
  'Sunday evening before the first completed 4H candle should not block when 30-day 4H context is otherwise loaded.',
);
assert.equal(
  barsCoverRequestedLookback(
    sundayEveningFourHourCoverageBars,
    '2026-05-15T00:00:00-04:00',
    '2026-06-14T22:00:00-04:00',
    '240m',
  ),
  false,
  'After the first Sunday 4H completion, stale Friday 4H coverage must still block.',
);
const scannerCoverageBarsEnding = (end: string, minutes: number, count: number) => {
  const endMs = Date.parse(end);
  const startMs = endMs - Math.max(0, count - 1) * minutes * 60_000;
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(startMs + index * minutes * 60_000).toISOString(),
    open: 7400,
    high: 7410,
    low: 7390,
    close: 7405,
    volume: 1000,
  }));
};
const scannerOpenTimestampCoverageFixtures = [
  { timeframe: '5m' as const, minutes: 5, count: 8700, insideLast: '2026-06-23T19:10:00-04:00', outsideLast: '2026-06-23T19:00:00-04:00' },
  { timeframe: '15m' as const, minutes: 15, count: 2900, insideLast: '2026-06-23T19:00:00-04:00', outsideLast: '2026-06-23T18:30:00-04:00' },
  { timeframe: '60m' as const, minutes: 60, count: 730, insideLast: '2026-06-23T18:00:00-04:00', outsideLast: '2026-06-23T17:00:00-04:00' },
  { timeframe: '120m' as const, minutes: 120, count: 365, insideLast: '2026-06-23T17:00:00-04:00', outsideLast: '2026-06-23T15:00:00-04:00' },
  { timeframe: '240m' as const, minutes: 240, count: 183, insideLast: '2026-06-23T17:00:00-04:00', outsideLast: '2026-06-23T11:00:00-04:00' },
];
for (const fixture of scannerOpenTimestampCoverageFixtures) {
  assert.equal(
    barsCoverRequestedLookback(
      scannerCoverageBarsEnding(fixture.insideLast, fixture.minutes, fixture.count),
      '2026-05-24T00:00:00-04:00',
      '2026-06-23T19:45:00-04:00',
      fixture.timeframe,
    ),
    true,
    `${fixture.timeframe} scanner preload coverage should accept the latest completed open-timestamp bar.`,
  );
  assert.equal(
    barsCoverRequestedLookback(
      scannerCoverageBarsEnding(fixture.outsideLast, fixture.minutes, fixture.count),
      '2026-05-24T00:00:00-04:00',
      '2026-06-23T19:45:00-04:00',
      fixture.timeframe,
    ),
    false,
    `${fixture.timeframe} scanner preload coverage should still reject genuinely stale history.`,
  );
}
assert.deepEqual(resolveScannerDiscordWebhookUrl({
  DISCORD_WEBHOOK_URL: 'https://discord.example/generic',
  SCANNER_DISCORD_WEBHOOK_URL: 'https://discord.example/scanner',
  QUANT_DESK_SCANNER_WEBHOOK_URL: 'https://discord.example/quant-desk-scanner',
}), {
  url: 'https://discord.example/quant-desk-scanner',
  source: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  usingGenericFallback: false,
});

const completedFiveMinuteGapRecord = buildCompletedFiveMinuteGapEventRecord({
  userId: '00000000-0000-0000-0000-000000000001',
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  requestedFrom: '2026-06-10T13:00:00-04:00',
  requestedTo: '2026-06-10T15:00:00-04:00',
  liveBars: [],
  cachedBars: [],
  repairBars: [],
  finalBars: [],
  staleReason: 'Latest completed 5M bar unavailable after repair.',
  attempts: ['live_bridge=blocked', 'market_bars=blocked', 'historical_bridge=blocked'],
});
assert.equal(completedFiveMinuteGapRecord.timeframe, '5m');
assert.equal(completedFiveMinuteGapRecord.status, 'open');
assert.equal(completedFiveMinuteGapRecord.source, 'missing');
assert.equal(completedFiveMinuteGapRecord.bars_loaded, 0);
assert.equal(completedFiveMinuteGapRecord.metadata.canInventMissingBars, false);
assert.equal(completedFiveMinuteGapRecord.metadata.tradePlanningAllowed, false);
assert.match(completedFiveMinuteGapRecord.data_limitation_message || '', /cannot invent missing completed 5M candles/);
assert.match(completedFiveMinuteGapRecord.operator_action || '', /nt:backfill/);
const localGapLedgerPath = path.join(outputDir, 'market-data-gap-events.json');
const localGapWrite = await writeLocalMarketDataGapEvent({
  record: completedFiveMinuteGapRecord,
  reason: 'test supabase unavailable',
  ledgerPath: localGapLedgerPath,
});
const localGapRewrite = await writeLocalMarketDataGapEvent({
  record: completedFiveMinuteGapRecord,
  reason: 'test supabase still unavailable',
  ledgerPath: localGapLedgerPath,
});
const localGapLedger = JSON.parse(await fs.readFile(localGapLedgerPath, 'utf8')) as Array<Record<string, unknown>>;
assert.equal(localGapWrite.records, 1);
assert.equal(localGapRewrite.records, 1);
assert.equal(localGapLedger.length, 1);
assert.equal(localGapLedger[0].syncStatus, 'pending_supabase_sync');
assert.equal(localGapLedger[0].syncReason, 'test supabase still unavailable');
const localGapSync = await syncLocalMarketDataGapEventsToSupabase({
  ledgerPath: localGapLedgerPath,
  marketConfig: {
    userId: '00000000-0000-0000-0000-000000000001',
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'test-service-role',
  },
  upsert: async () => ({ upserted: 1 }),
});
const syncedLocalGapLedger = JSON.parse(await fs.readFile(localGapLedgerPath, 'utf8')) as Array<Record<string, unknown>>;
assert.equal(localGapSync.attempted, 1);
assert.equal(localGapSync.synced, 1);
assert.equal(localGapSync.failed, 0);
assert.equal(syncedLocalGapLedger.length, 1);
assert.equal(syncedLocalGapLedger[0].syncStatus, 'synced_to_supabase');
assert.equal(typeof syncedLocalGapLedger[0].syncedAt, 'string');

const campaignCandidate = {
  setupType: SetupType.IntradayMssMicroContinuation,
  direction: 'SHORT',
  entry: 7417,
  stop: 7424.75,
  target1: 7405.38,
  target2: 7401.5,
  activeCampaign: {
    id: '2026-06-08:SHORT:15M5M-MSS',
    source: 'app_owned_structured_ohlc',
    authority: 'campaign_context_only_not_execution_authority',
    status: 'active',
    direction: 'SHORT',
    primaryTrigger: '15M_5M_MSS',
    executionTimeframe: '5M',
    htfRelationship: 'caution',
    confidenceAdjustment: 0,
    evidenceLayers: [],
    htfSupportTimeframes: [],
    htfConflictTimeframes: ['60M'],
    obstacleMap: {
      lineInSand: 7415.5,
      reason: 'Nearby 120M/240M support line.',
      role: 'management_obstacle',
      caution: 'Short remains valid; manage around 7415.50 or require acceptance below for extension.',
    },
    deDuplication: {
      oneTradePerCampaignRecommended: true,
      enforced: true,
      resetPolicy: 'trade_date_direction_campaign',
    },
    notes: [],
  },
} as unknown as SetupCandidate;
const shiftedCampaignCandidate = {
  ...campaignCandidate,
  entry: 7412.75,
  stop: 7421,
} as unknown as SetupCandidate;
const activeCampaignLedger: Record<string, ScannerActiveCampaignLedgerRecord> = {};
assert.equal(scannerActiveCampaignKey(campaignCandidate), '2026-06-08:SHORT:15M5M-MSS');
const utcRolloverCampaignCandidate = {
  ...campaignCandidate,
  direction: 'LONG',
  activeCampaign: {
    ...campaignCandidate.activeCampaign,
    id: '2026-06-15:LONG:HTF-FAILED-AUCTION',
    direction: 'LONG',
  },
} as unknown as SetupCandidate;
assert.equal(
  scannerActiveCampaignKeyForTradeDate(utcRolloverCampaignCandidate, '2026-06-14'),
  '2026-06-14:LONG:HTF-FAILED-AUCTION',
);
assert.equal(shouldSuppressActiveCampaignScannerAlert({
  activeCampaignSent: activeCampaignLedger,
  candidate: campaignCandidate,
}).shouldSuppress, false);
recordActiveCampaignScannerAlertSent({
  activeCampaignSent: activeCampaignLedger,
  candidate: campaignCandidate,
  tradeDate: '2026-06-08',
  state: 'Conditional',
  confidence: 82,
  alertKey: 'first-alert-key',
  sentAt: '2026-06-08T15:35:00.000Z',
});
const exactCampaignDecision = shouldSuppressActiveCampaignScannerAlert({
  activeCampaignSent: activeCampaignLedger,
  candidate: campaignCandidate,
});
assert.equal(exactCampaignDecision.shouldSuppress, true);
assert.equal(exactCampaignDecision.campaignId, '2026-06-08:SHORT:15M5M-MSS');
assert.match(exactCampaignDecision.reason || '', /one trade alert already sent/);
const repeatedCampaignDecision = shouldSuppressActiveCampaignScannerAlert({
  activeCampaignSent: activeCampaignLedger,
  candidate: shiftedCampaignCandidate,
});
assert.equal(repeatedCampaignDecision.shouldSuppress, false);
assert.equal(repeatedCampaignDecision.campaignId, '2026-06-08:SHORT:15M5M-MSS');
assert.match(repeatedCampaignDecision.reason || '', /material update allowed/);
recordActiveCampaignScannerAlertSuppressed({
  activeCampaignSent: activeCampaignLedger,
  campaignId: '2026-06-08:SHORT:15M5M-MSS',
  seenAt: '2026-06-08T15:40:00.000Z',
});
assert.equal(activeCampaignLedger['2026-06-08:SHORT:15M5M-MSS'].suppressedCount, 1);
assert.equal(activeCampaignLedger['2026-06-08:SHORT:15M5M-MSS'].resetPolicy, 'trade_date_direction_campaign');
const baseDeskPlanRefreshState = {
  activeCampaign: campaignCandidate.activeCampaign,
  bestLongPlan: null,
  selectedCandidate: null,
  bestShortPlan: {
    lineInSand: 7416.5,
    entry: 7412.75,
    stop: 7424.75,
    target1: 7405.38,
    target2: 7401.5,
  },
  primaryDeskPlay: {
    direction: 'SHORT',
    lineInSand: 7416.5,
    targetReactionLevel: 7405,
    longBias: { state: 'not_present', lineInSand: null },
    shortBias: { state: 'primary', lineInSand: 7416.5 },
    htfObjectiveLadder: { runner: { price: 7394.5 } },
    htfProtectedStructureMap: {
      rows: [
        { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7450, confirmationLine: 7416.5 },
        { timeframe: '2H', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7350, confirmationLine: 7416.5 },
        { timeframe: '1H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7432, confirmationLine: 7416.5 },
        { timeframe: '5M', bias: 'BEAR', protectedStructure: 7424.75, confirmationLine: 7416.5 },
      ],
    },
  },
} as any;
const morningHtfDeskMapState = {
  ...baseDeskPlanRefreshState,
  activeCampaign: null,
  htfContextStatus: 'sufficient',
  dataQualityStatus: 'ready',
  bestShortPlan: null,
  primaryDeskPlay: {
    ...baseDeskPlanRefreshState.primaryDeskPlay,
    direction: 'WAIT',
    lineInSand: null,
    longAbove: 7566.5,
    shortBelow: 7561.75,
    longBias: {
      state: 'secondary',
      lineInSand: 7566.5,
      tradeReadiness: { status: 'not_aligned' },
    },
    shortBias: {
      state: 'secondary',
      lineInSand: 7561.75,
      tradeReadiness: { status: 'not_aligned' },
    },
    htfProtectedStructureMap: {
      rows: [
        { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', biasChangeLine: 7684, protectedStructure: 7684, confirmationLine: 7684, biasChangeConfirmation: 'completed close+hold' },
        { timeframe: '2H', bias: 'BULL', currentBias: 'BULL', biasChangeLine: 7437.25, protectedStructure: 7437.25, confirmationLine: 7437.25, biasChangeConfirmation: 'completed close+hold' },
        { timeframe: '1H', bias: 'BULL', currentBias: 'BULL', biasChangeLine: 7437.25, protectedStructure: 7437.25, confirmationLine: 7437.25, biasChangeConfirmation: 'completed close+hold' },
        { timeframe: '15M', bias: 'RANGE', currentBias: 'RANGE', biasChangeLine: 7564.5, protectedStructure: 7564.5, confirmationLine: 7564.5, biasChangeConfirmation: 'completed close+hold' },
        { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', biasChangeLine: 7521.5, protectedStructure: 7521.5, confirmationLine: 7521.5, biasChangeConfirmation: 'completed close+hold' },
      ],
    },
  },
} as any;
const morningMapCompleted5m = { time: '2026-06-19T09:20:00.0000000', open: 7562, high: 7566, low: 7560, close: 7564, volume: 1000 };
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  completed5m: morningMapCompleted5m,
  barTimeZone: 'eastern',
  sent: {},
}), true);
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'lunch',
  completed5m: morningMapCompleted5m,
  barTimeZone: 'eastern',
  sent: {},
}), false);
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T09:15:00.0000000' },
  barTimeZone: 'eastern',
  sent: {},
}), false);
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  completed5m: morningMapCompleted5m,
  barTimeZone: 'eastern',
  sent: {
    '2026-06-19:MES:morning:SESSION_HTF_DESK_MAP': {
      fingerprint: 'already-sent',
      tradeDate: '2026-06-19',
      instrument: 'MES',
      session: 'morning',
      primary: 'WAIT',
      latestCompleted5m: morningMapCompleted5m.time,
      keyBattleArea: '7561.75-7566.50',
      sentAt: '2026-06-19T13:20:02.000Z',
    },
  },
}), false);
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'lunch',
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T12:05:00.0000000' },
  barTimeZone: 'eastern',
  sent: {},
}), true);
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'evening',
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T18:50:00.0000000' },
  barTimeZone: 'eastern',
  sent: {},
}), true);
assert.equal(shouldSendScannerMorningHtfDeskMap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'evening',
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T18:45:00.0000000' },
  barTimeZone: 'eastern',
  sent: {},
}), false);
const morningMapPayload = buildScannerMorningHtfDeskMapPayload({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  deskState: morningHtfDeskMapState,
  completed5m: morningMapCompleted5m,
  currentPrice: 7563.75,
});
const morningMapText = flattenDiscordPayloadText(morningMapPayload);
assert.equal(scannerHtfDeskMapDataStatusLabel(morningHtfDeskMapState), 'HTF sufficient');
assert.match(morningMapPayload.content || '', /MES Morning HTF Desk Map - 2026-06-19/);
assert.match(morningMapText, /MES Morning High Timeframe Desk Map - 2026-06-19/);
assert.match(morningMapText, /Primary: 🛑 WAIT/);
assert.match(morningMapText, /Key battle area: 7561.75-7566.50/);
assert.match(morningMapText, /🐻 4H: BEAR/);
assert.match(morningMapText, /🐂 2H: BULL/);
assert.match(morningMapText, /⚖️ 15M: RANGE/);
assert.match(morningMapText, /HTF map only • HTF sufficient • Not execution approval/);
assert.doesNotMatch(morningMapText, /Data partial • Not execution approval/);
assert.match(morningMapText, /5M remains execution authority/);
assert.equal(morningMapPayload.components, undefined);
const partialDataHtfMapPayload = buildScannerMorningHtfDeskMapPayload({
  tradeDate: '2026-07-16',
  instrument: 'MES',
  session: 'morning',
  deskState: { ...morningHtfDeskMapState, dataQualityStatus: 'partial' } as any,
  completed5m: morningMapCompleted5m,
  currentPrice: 7595.25,
});
const partialDataHtfMapText = flattenDiscordPayloadText(partialDataHtfMapPayload);
assert.equal(
  scannerHtfDeskMapDataStatusLabel({ ...morningHtfDeskMapState, dataQualityStatus: 'partial' } as any),
  'HTF sufficient / data partial outside map',
);
assert.match(partialDataHtfMapText, /HTF map only • HTF sufficient \/ data partial outside map • Not execution approval/);
assert.match(partialDataHtfMapText, /separate data-quality status is partial, so this remains map-only/);
assert.doesNotMatch(partialDataHtfMapText, /Data partial • Not execution approval/);
const completeCanonicalPublishDecision = {
  sourceOfTruth: 'scanner_desk_publish_decision',
  action: 'POST_PLAN',
  discordAction: 'post_plan',
  shouldPost: true,
  reason: 'fixture canonical ticket',
  displaySource: 'selected_candidate',
  candidateKey: 'fixture-short',
  direction: 'SHORT',
  setupType: SetupType.TurtleSoup,
  lineInSand: 7595.5,
  triggerCondition: 'completed 5M close below 7595.50',
  entry: 7595.5,
  stop: 7598,
  t1: 7591.75,
  t2: 7590.5,
  invalidation: 7598,
  invalidationText: 'Invalid above 7598.00',
  hasCompletePlan: true,
  humanReviewOnly: true,
  canExecute: false,
  noChaseState: false,
  htfContextStatus: 'sufficient',
  dataQualityStatus: 'partial',
  discordReason: 'fixture canonical ticket',
  managementWarnings: [],
  driftBlocker: null,
  approvalBoundary: {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  },
} satisfies DeskPublishDecision;
assert.match(
  scannerHtfDeskMapDeferReasonForCanonicalPlan(completeCanonicalPublishDecision) || '',
  /complete public ticket/,
);
assert.equal(scannerHtfDeskMapDeferReasonForCanonicalPlan({
  ...completeCanonicalPublishDecision,
  action: 'POST_WATCH',
  hasCompletePlan: false,
}), null);
const eveningMapPayload = buildScannerMorningHtfDeskMapPayload({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'evening',
  deskState: morningHtfDeskMapState,
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T18:50:00.0000000' },
  currentPrice: 7563.75,
});
const eveningMapText = flattenDiscordPayloadText(eveningMapPayload);
assert.match(eveningMapPayload.content || '', /MES Evening HTF Desk Map - 2026-06-19/);
assert.match(eveningMapText, /MES Evening High Timeframe Desk Map - 2026-06-19/);
assert.match(eveningMapText, /Evening HTF map only/);
const unalignedLongHtfMapState = counterStructureDeskStateFixture('LONG', 'BULL') as any;
unalignedLongHtfMapState.primaryDeskPlay.longBias = {
  ...unalignedLongHtfMapState.primaryDeskPlay.longBias,
  tradeReadiness: { status: 'not_aligned' },
};
unalignedLongHtfMapState.primaryDeskPlay.shortBias = {
  ...unalignedLongHtfMapState.primaryDeskPlay.shortBias,
  tradeReadiness: { status: 'not_aligned' },
};
const unalignedLongHtfMapPayload = buildScannerMorningHtfDeskMapPayload({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'evening',
  deskState: unalignedLongHtfMapState,
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T18:50:00.0000000' },
  currentPrice: 5326,
});
const unalignedLongHtfMapText = flattenDiscordPayloadText(unalignedLongHtfMapPayload);
assert.match(unalignedLongHtfMapText, /Primary: 🛑 WAIT/);
assert.match(unalignedLongHtfMapText, /No single primary side is active/);
assert.doesNotMatch(unalignedLongHtfMapText, /Primary: 🐂 LONG/);
assert.doesNotMatch(unalignedLongHtfMapText, /LONG is the current desk map side/);
const unalignedLongHtfMapArtifacts = await prepareScannerMorningHtfDeskMapArtifacts({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'evening',
  deskState: unalignedLongHtfMapState,
  normalized: {
    canExecute: false,
    entry: 5320,
    stop: 5316,
    t1: 5326,
    t2: 5328,
    riskPoints: 4,
  } as any,
  chartContext: {
    candles: [
      { index: 0, timestamp: '2026-06-19T18:40:00.0000000', open: 5315, high: 5318, low: 5314, close: 5317 },
      { index: 1, timestamp: '2026-06-19T18:45:00.0000000', open: 5317, high: 5321, low: 5316, close: 5320 },
      { index: 2, timestamp: '2026-06-19T18:50:00.0000000', open: 5320, high: 5324, low: 5319, close: 5323 },
    ],
    liquiditySweeps: [],
    reclaimEvents: [],
    displacementCandles: [],
  } as any,
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T18:50:00.0000000' },
  currentPrice: 5326,
  outputDir: auditDir,
});
assert.equal(unalignedLongHtfMapArtifacts.files.length, 0);
assert.equal(unalignedLongHtfMapArtifacts.chartMarkup, null);
assert.equal(unalignedLongHtfMapArtifacts.levelMap, null);
assert.match(flattenDiscordPayloadText(unalignedLongHtfMapArtifacts.payload), /Primary: 🛑 WAIT/);
const htfMapChartArtifacts = await prepareScannerMorningHtfDeskMapArtifacts({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  session: 'morning',
  deskState: counterStructureDeskStateFixture('LONG', 'BULL'),
  normalized: {
    canExecute: false,
    entry: 5320,
    stop: 5316,
    t1: 5326,
    t2: 5328,
    riskPoints: 4,
  } as any,
  chartContext: {
    candles: [
      { index: 0, timestamp: '2026-06-19T09:20:00.0000000', open: 5315, high: 5318, low: 5314, close: 5317 },
      { index: 1, timestamp: '2026-06-19T09:25:00.0000000', open: 5317, high: 5321, low: 5316, close: 5320 },
      { index: 2, timestamp: '2026-06-19T09:30:00.0000000', open: 5320, high: 5324, low: 5319, close: 5323 },
      { index: 3, timestamp: '2026-06-19T09:35:00.0000000', open: 5323, high: 5325, low: 5321, close: 5324 },
      { index: 4, timestamp: '2026-06-19T09:40:00.0000000', open: 5324, high: 5327, low: 5322, close: 5326 },
    ],
    liquiditySweeps: [],
    reclaimEvents: [],
    displacementCandles: [],
  } as any,
  completed5m: { ...morningMapCompleted5m, time: '2026-06-19T09:40:00.0000000' },
  currentPrice: 5326,
  outputDir: auditDir,
});
assert.match(htfMapChartArtifacts.payload.content || '', /MES Morning HTF Desk Map - 2026-06-19/);
assert.equal(htfMapChartArtifacts.files.length, 2);
assert.match(path.basename(htfMapChartArtifacts.files[0]), /^scanner-htf-desk-map-morning-2026-06-19-MES.*\.png$/);
assert.match(path.basename(htfMapChartArtifacts.files[1]), /^scanner-htf-desk-map-morning-2026-06-19-MES-level-map.*\.png$/);
await fs.access(htfMapChartArtifacts.files[0]);
await fs.access(htfMapChartArtifacts.files[1]);
const eodCompleted5m = { time: '2026-06-19T15:55:00.0000000', open: 7570, high: 7572, low: 7568, close: 7571, volume: 1000 };
assert.equal(shouldSendScannerEndOfDayMarketRecap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  now: new Date('2026-06-19T16:05:00-04:00'),
  completed5m: eodCompleted5m,
  barTimeZone: 'eastern',
  sent: {},
}), true);
assert.equal(shouldSendScannerEndOfDayMarketRecap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  now: new Date('2026-06-19T16:04:00-04:00'),
  completed5m: eodCompleted5m,
  barTimeZone: 'eastern',
  sent: {},
}), false);
assert.equal(shouldSendScannerEndOfDayMarketRecap({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  now: new Date('2026-06-19T16:05:00-04:00'),
  completed5m: eodCompleted5m,
  barTimeZone: 'eastern',
  sent: {
    '2026-06-19:MES:end_of_day_market_recap': {
      fingerprint: 'already-sent',
      tradeDate: '2026-06-19',
      instrument: 'MES',
      latestCompleted5m: eodCompleted5m.time,
      rthRange: '7558.00-7581.00',
      sentAt: '2026-06-19T20:05:00.000Z',
    },
  },
}), false);
const eodAuditDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-eod-recap-'));
await fs.writeFile(path.join(eodAuditDir, 'scanner-decision-tape-2026-06-19-MES-morning.json'), JSON.stringify({
  events: {
    '2026-06-19T09:20:00.0000000': {
      time: '2026-06-19T09:20:00.0000000',
      deskState: morningHtfDeskMapState,
      plan: { decision: 'NO TRADE', decisionStatus: 'Wait', canExecute: false },
      reversalWatch: { state: { state: 'forming' }, lines: { noChaseLine: null } },
    },
  },
}, null, 2));
await fs.writeFile(path.join(eodAuditDir, 'scanner-decision-tape-2026-06-19-MES-lunch.json'), JSON.stringify({
  events: {
    '2026-06-19T13:05:00.0000000': {
      time: '2026-06-19T13:05:00.0000000',
      deskState: {
        ...morningHtfDeskMapState,
        primaryDeskPlay: {
          ...morningHtfDeskMapState.primaryDeskPlay,
          direction: 'SHORT',
        },
      },
      plan: { decision: 'SHORT', decisionStatus: 'Wait', canExecute: false },
      reversalWatch: { state: { state: 'direction_validated' }, lines: { noChaseLine: 7542.25 } },
    },
  },
}, null, 2));
const eodBars = Array.from({ length: 81 }, (_, index) => {
  const minutes = 9 * 60 + 15 + index * 5;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const base = 7560 + index * 0.15;
  return {
    time: `2026-06-19T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.0000000`,
    open: base,
    high: base + 2,
    low: base - 2,
    close: base + 0.75,
    volume: 1000,
  };
});
const eodRecap = await buildScannerEndOfDayMarketRecapPayload({
  tradeDate: '2026-06-19',
  instrument: 'MES',
  bars5m: eodBars,
  completed5m: eodCompleted5m,
  currentPrice: 7571,
  barTimeZone: 'eastern',
  auditDir: eodAuditDir,
});
const eodText = flattenDiscordPayloadText(eodRecap.payload);
assert.match(eodRecap.payload.content || '', /MES End-of-Day Market Recap - 2026-06-19/);
assert.match(eodText, /Opening Desk Map:/);
assert.match(eodText, /Primary: 🛑 WAIT/);
assert.match(eodText, /What Price Did:/);
assert.match(eodText, /Desk Read Review:/);
assert.match(eodText, /Execution Boundary:/);
assert.match(eodText, /No automated orders\. Recap is review\/learning only\./);
assert.match(eodText, /Bottom Line:/);
assert.match(eodText, /Best recorded clean side was SHORT/);
assert.equal(eodRecap.payload.components, undefined);
const tacticalCampaignMap = scannerTacticalCampaignMapFromDeskState({
  deskState: baseDeskPlanRefreshState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'SHORT',
    noTradeReason: 'EntryTriggerPending',
    setupCandidates: [{
      direction: 'SHORT',
      entry: 7412.75,
      stop: 7424.75,
      target1: 7405.38,
      target2: 7401.5,
      riskPoints: 12,
    }],
  } as any,
});
assert.equal(tacticalCampaignMap.eligible, true);
assert.deepEqual(tacticalCampaignMap.supportingTimeframes, ['4H', '1H']);
assert.equal(tacticalCampaignMap.executionTimeframeAligned, true);
assert.equal(tacticalCampaignMap.executionEvidenceSource, 'protected_structure_5m');
assert.equal(tacticalCampaignMap.direction, 'SHORT');
assert.equal(tacticalCampaignMap.lineInSand, 7416.5);
assert.equal(tacticalCampaignMap.entry, 7412.75);
assert.equal(tacticalCampaignMap.stop, 7424.75);
assert.equal(tacticalCampaignMap.changesTradingLogic, false);
assert.equal(tacticalCampaignMap.changesCanExecute, false);
assert.match(tacticalCampaignMap.reason, /4H\/1H support plus aligned completed 5M structure/);
const tacticalCampaignWithoutFiveMinute = scannerTacticalCampaignMapFromDeskState({
  deskState: {
    ...baseDeskPlanRefreshState,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7450, confirmationLine: 7416.5 },
          { timeframe: '2H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7440, confirmationLine: 7416.5 },
          { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7402, confirmationLine: 7416.5 },
        ],
      },
    },
  } as any,
});
assert.equal(tacticalCampaignWithoutFiveMinute.eligible, false);
assert.deepEqual(tacticalCampaignWithoutFiveMinute.supportingTimeframes, ['4H', '2H']);
assert.equal(tacticalCampaignWithoutFiveMinute.executionTimeframeAligned, false);
assert.equal(tacticalCampaignWithoutFiveMinute.executionEvidenceSource, null);
assert.match(tacticalCampaignWithoutFiveMinute.reason, /5M protected-structure row is not aligned/);
const tacticalCampaignFromLifecycle = scannerTacticalCampaignMapFromDeskState({
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      setupType: SetupType.HtfDisplacementMssContinuation,
      direction: 'SHORT',
      candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
      requiredTrigger: 'Completed 5M close-through/retest below 7416.50 required before short continuation can execute.',
      missingEvidence: ['Wait for completed 5M retest/rejection.'],
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7450, confirmationLine: 7416.5 },
          { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7402, confirmationLine: 7416.5 },
        ],
      },
    },
  } as any,
});
assert.equal(tacticalCampaignFromLifecycle.eligible, true);
assert.deepEqual(tacticalCampaignFromLifecycle.supportingTimeframes, ['4H']);
assert.equal(tacticalCampaignFromLifecycle.executionTimeframeAligned, true);
assert.equal(tacticalCampaignFromLifecycle.executionEvidenceSource, 'candidate_lifecycle_5m');
assert.match(tacticalCampaignFromLifecycle.reason, /app-owned 5M candidate lifecycle evidence/);
const shortExhaustionLongWatchState = {
  ...baseDeskPlanRefreshState,
  bestLongPlan: {
    setupType: SetupType.TurtleSoup,
    direction: 'LONG',
    lineInSand: 7411,
    entry: 7411,
    stop: 7404,
    target1: 7421.5,
    target2: 7425,
    targetReactionLevel: 7421.5,
    targetReactionLabel: 'Round Number 7420',
  },
  primaryDeskPlay: {
    ...baseDeskPlanRefreshState.primaryDeskPlay,
    longAbove: 7411,
    longBias: { state: 'secondary', lineInSand: 7411 },
    htfProtectedStructureMap: {
      rows: [
        { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7450, confirmationLine: 7416.5 },
        { timeframe: '2H', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7350, confirmationLine: 7416.5 },
        { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7404, confirmationLine: 7411 },
      ],
    },
  },
} as any;
const longWatchLines = buildScannerReversalWatchLines({
  deskState: shortExhaustionLongWatchState,
  completed5m: { time: '2026-06-08T15:15:00.0000000', open: 7410, high: 7412, low: 7404.75, close: 7408, volume: 1000 },
  currentPrice: 7408,
});
assert.equal(longWatchLines.eligible, true);
assert.equal(longWatchLines.exhaustedSide, 'SHORT');
assert.equal(longWatchLines.watchDirection, 'LONG');
assert.equal(longWatchLines.reactionZoneLow, 7401.5);
assert.equal(longWatchLines.reactionZoneHigh, 7405.5);
assert.equal(longWatchLines.triggerLine, 7411);
assert.equal(longWatchLines.invalidLine, 7404);
assert.equal(longWatchLines.noChaseLine, 7421.5);
assert.equal(longWatchLines.referenceEntry, 7411);
assert.equal(longWatchLines.referenceStop, 7404);
assert.equal(longWatchLines.referenceTarget1, 7421.5);
assert.equal(longWatchLines.referenceTarget2, 7425);
assert.match(longWatchLines.referenceReason || '', /tactical levels only/);
assert.match(longWatchLines.reclaimRule || '', /Completed 5M candle body close above 7411.00/);
assert.match(longWatchLines.retestRule || '', /Later completed 5M retest\/hold close above 7411.00/);
assert.equal(longWatchLines.approvalBoundary.changesCanExecute, false);
assert.equal(longWatchLines.approvalBoundary.changesEntryStopTargets, false);
assert.match(longWatchLines.reason, /SHORT campaign reached mapped reaction zone/);
const longSniperWatch = scannerSniperTriggerWatchMetadata({
  deskState: {
    canExecute: false,
    primaryDeskPlay: {
      direction: 'LONG',
      lineInSand: 7533.75,
      longAbove: 7533.75,
      shortBelow: 7525,
      longBias: { lineInSand: 7533.75 },
      shortBias: { lineInSand: 7525 },
    },
  } as any,
  normalized: {
    entry: 7533.75,
    stop: 7525.75,
    t1: 7550,
    t2: 7553.75,
    canExecute: false,
  } as any,
  candidate: null,
});
assert.equal(longSniperWatch.eligible, true);
assert.equal(longSniperWatch.label, 'Line-in-the-Sand Sniper Watch');
assert.equal(longSniperWatch.direction, 'LONG');
assert.equal(longSniperWatch.lineInSand, 7533.75);
assert.equal(longSniperWatch.referenceEntry, 7533.75);
assert.equal(longSniperWatch.referenceStop, 7525.75);
assert.equal(longSniperWatch.referenceTarget1, 7550);
assert.equal(longSniperWatch.referenceTarget2, 7553.75);
assert.match(longSniperWatch.oneMinuteTimingRule, /1M body close above/);
assert.match(longSniperWatch.fiveMinuteConfirmationRule, /completed 5M body close\/hold above/);
assert.equal(longSniperWatch.approvalBoundary.changesCanExecute, false);
assert.equal(longSniperWatch.approvalBoundary.oneMinuteApprovesExecution, false);
const longWatchForming = classifyScannerReversalWatchState({
  lines: longWatchLines,
  completed5m: { time: '2026-06-08T15:20:00.0000000', open: 7408, high: 7410.75, low: 7406, close: 7410.5, volume: 1000 },
});
assert.equal(longWatchForming.state, 'forming');
assert.equal(longWatchForming.reclaimConfirmed, false);
assert.match(longWatchForming.reason, /Waiting for completed 5M body close above 7411.00/);
const longWatchActive = classifyScannerReversalWatchState({
  lines: longWatchLines,
  completed5m: { time: '2026-06-08T15:25:00.0000000', open: 7410.5, high: 7413, low: 7410.25, close: 7412, volume: 1000 },
  completed5mHistory: [
    { time: '2026-06-08T15:20:00.0000000', open: 7408, high: 7410.75, low: 7406, close: 7410.5, volume: 1000 },
    { time: '2026-06-08T15:25:00.0000000', open: 7410.5, high: 7413, low: 7410.25, close: 7412, volume: 1000 },
  ],
});
assert.equal(longWatchActive.state, 'watch_active');
assert.equal(longWatchActive.reclaimConfirmed, true);
assert.equal(longWatchActive.retestHoldConfirmed, false);
const longWatchValidated = classifyScannerReversalWatchState({
  lines: longWatchLines,
  completed5m: { time: '2026-06-08T15:30:00.0000000', open: 7412, high: 7414, low: 7410.75, close: 7413, volume: 1000 },
  completed5mHistory: [
    { time: '2026-06-08T15:20:00.0000000', open: 7408, high: 7410.75, low: 7406, close: 7410.5, volume: 1000 },
    { time: '2026-06-08T15:25:00.0000000', open: 7410.5, high: 7413, low: 7410.25, close: 7412, volume: 1000 },
    { time: '2026-06-08T15:30:00.0000000', open: 7412, high: 7414, low: 7410.75, close: 7413, volume: 1000 },
  ],
});
assert.equal(longWatchValidated.state, 'direction_validated');
assert.equal(longWatchValidated.retestHoldConfirmed, true);
const longWatchStalled = classifyScannerReversalWatchState({
  lines: longWatchLines,
  completed5m: { time: '2026-06-08T15:40:00.0000000', open: 7412, high: 7414, low: 7411.5, close: 7412.5, volume: 1000 },
  completed5mHistory: [
    { time: '2026-06-08T15:25:00.0000000', open: 7410.5, high: 7413, low: 7410.25, close: 7412, volume: 1000 },
    { time: '2026-06-08T15:30:00.0000000', open: 7412, high: 7414, low: 7411.5, close: 7412.25, volume: 1000 },
    { time: '2026-06-08T15:35:00.0000000', open: 7412.25, high: 7414, low: 7411.5, close: 7412.5, volume: 1000 },
    { time: '2026-06-08T15:40:00.0000000', open: 7412, high: 7414, low: 7411.5, close: 7412.5, volume: 1000 },
  ],
});
assert.equal(longWatchStalled.state, 'stalled');
const longWatchInvalid = classifyScannerReversalWatchState({
  lines: longWatchLines,
  completed5m: { time: '2026-06-08T15:45:00.0000000', open: 7412, high: 7412.5, low: 7402, close: 7403.75, volume: 1000 },
});
assert.equal(longWatchInvalid.state, 'invalidated');
const longWatchNoChase = classifyScannerReversalWatchState({
  lines: longWatchLines,
  completed5m: { time: '2026-06-08T15:45:00.0000000', open: 7418, high: 7422, low: 7417.5, close: 7421.5, volume: 1000 },
});
assert.equal(longWatchNoChase.state, 'no_chase');
const formingReversalSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:20:00.0000000',
  lines: longWatchLines,
  state: longWatchForming,
  reversalWatchSent: {},
});
assert.equal(formingReversalSuppression.shouldPost, false);
assert.equal(formingReversalSuppression.category, 'forming');
const activeReversalKey = scannerReversalWatchKey({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:25:00.0000000',
  lines: longWatchLines,
  state: longWatchActive,
});
assert.match(activeReversalKey, /REVERSAL_WATCH/);
const activeReversalSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:25:00.0000000',
  lines: longWatchLines,
  state: longWatchActive,
  reversalWatchSent: {},
});
assert.equal(activeReversalSuppression.shouldPost, true);
assert.equal(activeReversalSuppression.category, 'post');
const coldNoChaseReversalSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:45:00.0000000',
  lines: longWatchLines,
  state: longWatchNoChase,
  reversalWatchSent: {},
});
assert.equal(coldNoChaseReversalSuppression.shouldPost, false);
assert.equal(coldNoChaseReversalSuppression.category, 'not_ready');
const activeReversalRecord = scannerReversalWatchRecord({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:25:00.0000000',
  lines: longWatchLines,
  state: longWatchActive,
  sentAt: '2026-06-08T19:25:01.000Z',
});
const duplicateReversalSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:25:00.0000000',
  lines: longWatchLines,
  state: longWatchActive,
  reversalWatchSent: { [activeReversalKey]: activeReversalRecord },
});
assert.equal(duplicateReversalSuppression.shouldPost, false);
assert.equal(duplicateReversalSuppression.category, 'duplicate_refresh');
const sameStateShiftedLineReversalSuppression = evaluateScannerReversalWatchDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  latestCompleted5m: '2026-06-08T15:30:00.0000000',
  lines: {
    ...longWatchLines,
    reactionZoneLow: 7401.75,
    reactionZoneHigh: 7405.75,
    triggerLine: 7411.25,
    invalidLine: 7404.25,
    noChaseLine: 7421.75,
  },
  state: longWatchActive,
  reversalWatchSent: { [activeReversalKey]: activeReversalRecord },
});
assert.equal(sameStateShiftedLineReversalSuppression.shouldPost, false);
assert.equal(sameStateShiftedLineReversalSuppression.category, 'duplicate_refresh');
assert.match(sameStateShiftedLineReversalSuppression.reason, /action state/);
const reversalArtifactDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-reversal-watch-'));
const reversalArtifacts = await prepareLiveScannerReversalWatchAlertArtifacts({
  session: 'lunch',
  tradeDate: '2026-06-08',
  config: { instrument: 'MES' },
  chartContext: {
    candles: [
      { index: 0, timestamp: '2026-06-08T15:10:00.0000000', open: 7412, high: 7413, low: 7405, close: 7408 },
      { index: 1, timestamp: '2026-06-08T15:15:00.0000000', open: 7408, high: 7412, low: 7404.75, close: 7408 },
      { index: 2, timestamp: '2026-06-08T15:20:00.0000000', open: 7408, high: 7410.75, low: 7406, close: 7410.5 },
      { index: 3, timestamp: '2026-06-08T15:25:00.0000000', open: 7410.5, high: 7413, low: 7410.25, close: 7412 },
      { index: 4, timestamp: '2026-06-08T15:30:00.0000000', open: 7412, high: 7414, low: 7410.75, close: 7413 },
    ],
  } as any,
  currentPrice: 7412,
  windowLabel: 'Lunch/PM Setup Scan',
  lines: longWatchLines,
  state: longWatchActive,
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-08-MES-lunch.json'),
  planVersionId: 'LUNCH-20260608-REVERSAL-WATCH',
  outputDir: reversalArtifactDir,
});
assert.equal(reversalArtifacts.files.length, 1);
assert.match(reversalArtifacts.payload.content || '', /🎯 MES Tactical Reversal Watch - Lunch/);
const reversalPayloadText = flattenDiscordPayloadText(reversalArtifacts.payload);
assert.match(reversalPayloadText, /🎯 MES Tactical Reversal Watch/);
assert.match(reversalPayloadText, /🐻 Primary: SHORT campaign exhaustion \/ 🐂 LONG reversal watch/);
assert.match(reversalPayloadText, /⚠️ Execution: NOT APPROVED/);
assert.match(reversalPayloadText, /📌 Status: 👀 Watch Active/);
assert.match(reversalPayloadText, /🐂 LONG ABOVE: 7411.00/);
assert.match(reversalPayloadText, /🛑 Invalid Below: 7404.00/);
assert.match(reversalPayloadText, /🚫 No Chase Above: 7421.50/);
assert.match(reversalPayloadText, /📋 Watch Plan Levels \(Reference Only\)/);
assert.match(reversalPayloadText, /🧭 Line in the Sand: 🐂 LONG ABOVE 7411.00/);
assert.match(reversalPayloadText, /🔬 1M may refine; completed 5M close\/hold required\./);
assert.match(reversalPayloadText, /📍 Entry ref: 7411.00 \| 🛑 Stop ref: 7404.00/);
assert.match(reversalPayloadText, /🎯 T1 7421.50 \| 🎯 T2 7425.00/);
assert.match(reversalPayloadText, /🧾 Blocker: tactical levels only/);
assert.match(reversalPayloadText, /No canExecute change/);
assert.ok(reversalPayloadText.length < 1200, `reversal watch Discord text too long: ${reversalPayloadText.length}`);
const reversalWatchButtonLabels = (reversalArtifacts.payload.components || []).flatMap((row: any) =>
  (row.components || []).map((component: any) => component.label),
);
assert.deepEqual(reversalWatchButtonLabels, ['Watch Worked', 'Worked After Invalid', 'Watch Failed', 'Stale When Posted', 'No Trigger', 'Needs Review']);
const reversalWatchButtonPayloads = (reversalArtifacts.payload.components || [])
  .flatMap((row: any) => row.components || [])
  .map((component: any) => {
    const token = new URL(component.url).searchParams.get('t');
    assert.ok(token);
    return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
  });
assert.ok(reversalWatchButtonPayloads.every((payload: any) => payload.ft === 'watch_feedback'));
assert.ok(reversalWatchButtonPayloads.every((payload: any) => payload.tr === 'no_trade'));
assert.ok(reversalWatchButtonPayloads.every((payload: any) => payload.tt === false));
assert.ok(reversalWatchButtonPayloads.every((payload: any) => payload.pp === false));
assert.ok(reversalWatchButtonPayloads.every((payload: any) => payload.pid === 'LUNCH-20260608-REVERSAL-WATCH'));
assert.ok(reversalWatchButtonPayloads.every((payload: any) => !('canExecute' in payload)));
process.env.SUPABASE_URL = 'https://supabase.example';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
process.env.DISCORD_RAG_USER_ID = 'user-test';
const reversalWatchRagCalls: Array<{ method: string; url: string; body: any }> = [];
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  reversalWatchRagCalls.push({
    method: init?.method || 'GET',
    url: String(input),
    body: init?.body ? JSON.parse(String(init.body)) : null,
  });
  if ((init?.method || 'GET') === 'PATCH') {
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify([{ id: 'reversal-watch-rag-row' }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
}) as typeof fetch;
try {
  await upsertScannerReversalWatchRagRecord({
    planVersionId: 'LUNCH-20260608-REVERSAL-WATCH',
    session: 'lunch',
    tradeDate: '2026-06-08',
    instrument: 'MES',
    lines: longWatchLines,
    state: longWatchActive,
    currentPrice: 7412,
    chartMarkup: reversalArtifacts.chartMarkup,
    decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-08-MES-lunch.json'),
    latestCompleted5m: '2026-06-08T15:30:00.0000000',
  });
} finally {
  globalThis.fetch = originalFetch;
  restoreOptionalEnv('SUPABASE_URL', previousSupabaseUrl);
  restoreOptionalEnv('SUPABASE_SERVICE_ROLE_KEY', previousSupabaseServiceRoleKey);
  restoreOptionalEnv('DISCORD_RAG_USER_ID', previousDiscordRagUserId);
}
assert.equal(reversalWatchRagCalls.length, 2);
assert.equal(reversalWatchRagCalls[0].method, 'PATCH');
assert.equal(reversalWatchRagCalls[1].method, 'POST');
const reversalWatchRagPayload = reversalWatchRagCalls[1].body;
assert.equal(reversalWatchRagPayload.source, 'discord_reversal_watch');
assert.equal(reversalWatchRagPayload.outcome, 'watch_feedback_pending');
assert.equal(reversalWatchRagPayload.trade_plan_json.discordWatchFeedbackButtons, true);
assert.equal(reversalWatchRagPayload.trade_plan_json.researchTrack, 'tactical_reversal_watch');
assert.equal(reversalWatchRagPayload.trade_plan_json.researchOutcomeFeedback.status, 'pending');
assert.equal(reversalWatchRagPayload.trade_plan_json.researchOutcomeFeedback.researchUseOnly, true);
assert.equal(reversalWatchRagPayload.trade_plan_json.approvalBoundary.discordWatchFeedbackApprovesTrade, false);
assert.equal(reversalWatchRagPayload.trade_plan_json.approvalBoundary.researchFeedbackChangesCanExecute, false);
assert.equal(reversalWatchRagPayload.trade_plan_json.approvalBoundary.buttonClickPlacesOrder, false);
const longExhaustionShortWatchState = {
  ...baseDeskPlanRefreshState,
  activeCampaign: null,
  bestLongPlan: {
    lineInSand: 7422,
    entry: 7420,
    stop: 7410,
    target1: 7428,
    target2: 7432,
    targetReactionLevel: 7430,
    targetReactionLabel: 'HTF resistance',
  },
  bestShortPlan: {
    setupType: SetupType.TurtleSoup,
    direction: 'SHORT',
    lineInSand: 7424,
    entry: 7424,
    stop: 7431,
    target1: 7413.5,
    target2: 7410,
    targetReactionLevel: 7413.5,
  },
  primaryDeskPlay: {
    ...baseDeskPlanRefreshState.primaryDeskPlay,
    direction: 'LONG',
    lineInSand: 7422,
    targetReactionLevel: 7430,
    longBias: { state: 'primary', lineInSand: 7422 },
    shortBias: { state: 'secondary', lineInSand: 7424 },
    shortBelow: 7424,
    htfProtectedStructureMap: {
      rows: [
        { timeframe: '1H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7431, confirmationLine: 7424 },
        { timeframe: '5M', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7431, confirmationLine: 7424 },
      ],
    },
  },
} as any;
const shortWatchLines = buildScannerReversalWatchLines({
  deskState: longExhaustionShortWatchState,
  completed5m: { time: '2026-06-08T11:15:00.0000000', open: 7426, high: 7430.25, low: 7425, close: 7427, volume: 1000 },
  currentPrice: 7427,
});
assert.equal(shortWatchLines.eligible, true);
assert.equal(shortWatchLines.exhaustedSide, 'LONG');
assert.equal(shortWatchLines.watchDirection, 'SHORT');
assert.equal(shortWatchLines.triggerLine, 7424);
assert.equal(shortWatchLines.invalidLine, 7431);
assert.equal(shortWatchLines.noChaseLine, 7413.5);
assert.equal(shortWatchLines.referenceEntry, 7424);
assert.equal(shortWatchLines.referenceStop, 7431);
assert.equal(shortWatchLines.referenceTarget1, 7413.5);
assert.equal(shortWatchLines.referenceTarget2, 7410);
assert.match(shortWatchLines.referenceReason || '', /not approve execution/);
assert.match(shortWatchLines.reclaimRule || '', /Completed 5M candle body close below 7424.00/);
const firstDeskPlanRefreshKey = scannerDeskPlanRefreshKey({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskState: baseDeskPlanRefreshState,
  latestCompleted5m: '2026-06-08T15:35:00.0000000',
});
const shiftedDeskPlanRefreshKey = scannerDeskPlanRefreshKey({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      lineInSand: 7412.75,
      entry: 7410.25,
      stop: 7419.25,
      target1: 7396.75,
      target2: 7392.25,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7412.75,
      shortBias: { state: 'primary', lineInSand: 7412.75 },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'BEAR', protectedStructure: 7419.25, confirmationLine: 7412.75 },
        ],
      },
    },
  },
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
const sameCandleShiftedDeskPlanRefreshKey = scannerDeskPlanRefreshKey({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      lineInSand: 7412.75,
      entry: 7410.25,
      stop: 7419.25,
      target1: 7396.75,
      target2: 7392.25,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7412.75,
      shortBias: { state: 'primary', lineInSand: 7412.75 },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'BEAR', protectedStructure: 7419.25, confirmationLine: 7412.75 },
        ],
      },
    },
  },
  latestCompleted5m: '2026-06-08T15:35:00.0000000',
});
assert.equal(firstDeskPlanRefreshKey, sameCandleShiftedDeskPlanRefreshKey);
assert.notEqual(firstDeskPlanRefreshKey, shiftedDeskPlanRefreshKey);
assert.ok(firstDeskPlanRefreshKey.includes('DESK_PLAN_REFRESH'));
assert.ok(shiftedDeskPlanRefreshKey.includes('m5=BEAR'));
assert.ok(!shiftedDeskPlanRefreshKey.includes('7419.25:7412.75'));
const sundayEveningDeskPlanRefreshKey = scannerDeskPlanRefreshKey({
  tradeDate: '2026-06-14',
  instrument: 'MES',
  session: 'evening',
  deskState: {
    ...baseDeskPlanRefreshState,
    activeCampaign: utcRolloverCampaignCandidate.activeCampaign,
  },
  latestCompleted5m: '2026-06-14T21:30:00.0000000',
});
assert.ok(sundayEveningDeskPlanRefreshKey.includes('2026-06-14:LONG:HTF-FAILED-AUCTION'));
assert.ok(!sundayEveningDeskPlanRefreshKey.includes('2026-06-15:LONG:HTF-FAILED-AUCTION'));
const repeatedBaseDeskPlanRefreshKey = scannerDeskPlanRefreshKey({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskState: baseDeskPlanRefreshState,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
const previousDeskPlanRefreshRecord = {
  fingerprint: firstDeskPlanRefreshKey,
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  activeCampaignId: '2026-06-08:SHORT:15M5M-MSS',
  direction: 'SHORT',
  latestCompleted5m: '2026-06-08T15:35:00.0000000',
  lineInSand: 7416.5,
  activeTacticalLine: null,
  longLine: null,
  shortLine: 7416.5,
  entry: 7412.75,
  stop: 7424.75,
  target1: 7405.38,
  target2: 7401.5,
  targetReactionLevel: 7405,
  nextTrigger: null,
  invalidation: null,
  standDown: 'Stand down if price accepts above 7416.50.',
  readiness: null,
  tacticalCampaignFingerprint: [
    'eligible=yes',
    'side=SHORT',
    'htf=4H,1H',
    'm5=aligned',
    'm5source=protected_structure_5m',
    'readiness=none',
    'line=7416.50',
    'entry=none',
    'stop=none',
    't1=none',
    't2=none',
    'trigger=none',
  ].join('|'),
  materialCadenceFingerprint: [
    'direction=SHORT',
    'primaryBias=primary',
    'readiness=none',
    'visibility=unknown',
    'discordAction=unknown',
    'htfContext=unknown',
    'dataQuality=unknown',
    'candidateState=none',
    'candidateDirection=none',
    'activeLine=none',
    'activeLineMigrated=no',
    'nextTrigger=none',
    'invalidation=none',
    'standDown=stand down if price accepts above 7416.50.',
    'tacticalEligible=yes',
    'tacticalSide=SHORT',
    'tacticalHtf=1H,4H',
    'tacticalM5=aligned',
    'tacticalM5Source=protected_structure_5m',
    'protectedRows=1H=BEAR=7416.50,2H=BULL=7416.50,4H=BEAR=7416.50,5M=BEAR=7416.50',
  ].join('|'),
  mainPlayFingerprint: [
    '2026-06-08:SHORT:15M5M-MSS',
    'SHORT',
    '7416.50',
    'none',
    'none',
    '7416.50',
    '7412.75',
    '7424.75',
    '7405.38',
    '7401.50',
    '7405.00',
    '',
    '',
    'stand down if price accepts above 7416.50.',
    '',
  ].join('|'),
  sentAt: '2026-06-08T15:35:30.000Z',
} as const;
const duplicateDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: baseDeskPlanRefreshState,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  now: new Date('2026-06-08T15:40:30.000Z'),
});
assert.equal(duplicateDeskPlaySuppression.shouldPost, false);
assert.equal(duplicateDeskPlaySuppression.category, 'low_quality_map');
assert.match(duplicateDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
assert.equal(duplicateDeskPlaySuppression.changesTradingLogic, false);
assert.equal(duplicateDeskPlaySuppression.changesCanExecute, false);
const canonicalDuplicateBypassDecision: DeskPublishDecision = {
  sourceOfTruth: 'scanner_desk_publish_decision',
  action: 'POST_REVIEW',
  discordAction: 'post_review',
  shouldPost: true,
  reason: 'Canonical contract owns this complete review ticket.',
  displaySource: 'desk_ticket',
  candidateKey: 'canonical-duplicate-bypass',
  direction: 'SHORT',
  setupType: SetupType.IntradayMssMicroContinuation,
  lineInSand: 7416.5,
  triggerCondition: 'Completed 5M close below 7416.50.',
  entry: 7412.75,
  stop: 7424.75,
  t1: 7405.25,
  t2: 7401.25,
  invalidation: 7424.75,
  invalidationText: 'Invalid above 7424.75.',
  hasCompletePlan: true,
  humanReviewOnly: true,
  canExecute: false,
  noChaseState: false,
  htfContextStatus: 'sufficient',
  dataQualityStatus: 'ok',
  discordReason: 'Canonical DeskPublishDecision approved this complete review ticket.',
  managementWarnings: [],
  driftBlocker: null,
  approvalBoundary: {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  },
};
const canonicalDuplicateBypassSuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: baseDeskPlanRefreshState,
  publishDecision: canonicalDuplicateBypassDecision,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  now: new Date('2026-06-08T15:40:30.000Z'),
});
assert.equal(canonicalDuplicateBypassSuppression.shouldPost, true);
assert.equal(canonicalDuplicateBypassSuppression.category, 'post');
assert.equal(canonicalDuplicateBypassSuppression.reason, 'Canonical DeskPublishDecision approved this complete review ticket.');
assert.equal(canonicalDuplicateBypassSuppression.changesTradingLogic, false);
assert.equal(canonicalDuplicateBypassSuppression.changesCanExecute, false);
const noisyRecentReviewMapFlipDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    bestLongPlan: {
      setupType: SetupType.IntradayMssMicroContinuation,
      direction: 'LONG',
      entry: 7417,
      stop: 7411,
      target1: 7426,
      target2: 7429,
      riskPoints: 6,
      modelConfidenceScore: 44,
      decisionQualityScore: 44,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'LONG',
      lineInSand: 7417,
      activeTacticalLine: { direction: 'LONG', activeLine: 7417, source: 'test', migrated: false },
      activeTacticalZone: null,
      targetReactionLevel: null,
      longBias: {
        state: 'countertrend_review',
        lineInSand: 7417,
        tradeReadiness: { status: 'not_aligned' },
      },
      shortBias: {
        state: 'primary',
        lineInSand: 7416.5,
        tradeReadiness: { status: 'wait_for_pullback_or_new_5m_structure' },
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', protectedStructure: 7424.75, confirmationLine: 7416.5 },
          { timeframe: '1H', bias: 'BEAR', protectedStructure: 7424.75, confirmationLine: 7416.5 },
          { timeframe: '5M', bias: 'BULL', protectedStructure: 7411, confirmationLine: 7417 },
        ],
      },
    },
  } as any,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7417,
  latestCompleted5m: '2026-06-08T15:45:00.0000000',
  now: new Date('2026-06-08T15:45:30.000Z'),
});
assert.equal(noisyRecentReviewMapFlipDeskPlaySuppression.shouldPost, false);
assert.equal(noisyRecentReviewMapFlipDeskPlaySuppression.category, 'low_quality_map');
assert.match(noisyRecentReviewMapFlipDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
assert.equal(noisyRecentReviewMapFlipDeskPlaySuppression.changesTradingLogic, false);
assert.equal(noisyRecentReviewMapFlipDeskPlaySuppression.changesCanExecute, false);
const sameStateShiftedLevelsDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      entry: 7412.5,
      target1: 7405.25,
      target2: 7401.25,
    },
  } as any,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  now: new Date('2026-06-08T15:41:30.000Z'),
});
assert.equal(sameStateShiftedLevelsDeskPlaySuppression.shouldPost, false);
assert.equal(sameStateShiftedLevelsDeskPlaySuppression.category, 'low_quality_map');
assert.match(sameStateShiftedLevelsDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const priorFourHourOnlyDeskPlanRefreshRecord = {
  ...previousDeskPlanRefreshRecord,
  materialCadenceFingerprint: [
    'direction=SHORT',
    'primaryBias=primary',
    'readiness=none',
    'visibility=unknown',
    'discordAction=unknown',
    'htfContext=unknown',
    'dataQuality=unknown',
    'candidateState=none',
    'candidateDirection=none',
    'activeLine=none',
    'activeLineMigrated=no',
    'nextTrigger=none',
    'invalidation=none',
    'standDown=stand down if price accepts above 7416.50.',
    'tacticalEligible=yes',
    'tacticalSide=SHORT',
    'tacticalHtf=4H',
    'tacticalM5=aligned',
    'tacticalM5Source=protected_structure_5m',
    'protectedRows=1H=BEAR=7416.50,2H=BULL=7416.50,4H=BEAR=7416.50,5M=BEAR=7416.50',
  ].join('|'),
  tacticalCampaignFingerprint: [
    'eligible=yes',
    'side=SHORT',
    'htf=4H',
    'm5=aligned',
    'm5source=protected_structure_5m',
    'readiness=none',
    'line=7416.50',
    'entry=none',
    'stop=none',
    't1=none',
    't2=none',
    'trigger=none',
  ].join('|'),
};
const newHtfSupportDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: baseDeskPlanRefreshState,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: priorFourHourOnlyDeskPlanRefreshRecord },
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  now: new Date('2026-06-08T15:40:30.000Z'),
});
assert.equal(newHtfSupportDeskPlaySuppression.shouldPost, false);
assert.equal(newHtfSupportDeskPlaySuppression.category, 'low_quality_map');
assert.match(newHtfSupportDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const changedInstructionDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      nextTrigger: 'Only update if completed 5M accepts below 7416.50 and rejects the retest.',
    },
  } as any,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(changedInstructionDeskPlaySuppression.shouldPost, false);
assert.equal(changedInstructionDeskPlaySuppression.category, 'low_quality_map');
assert.match(changedInstructionDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const shiftedDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      lineInSand: 7412.75,
      entry: 7410.25,
      stop: 7419.25,
      target1: 7396.75,
      target2: 7392.25,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7412.75,
      shortBias: { state: 'primary', lineInSand: 7412.75 },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'BEAR', protectedStructure: 7419.25, confirmationLine: 7412.75 },
        ],
      },
    },
  } as any,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7408,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(shiftedDeskPlaySuppression.shouldPost, false);
assert.equal(shiftedDeskPlaySuppression.category, 'low_quality_map');
assert.match(shiftedDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const recentSameSideShiftedDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      lineInSand: 7412.75,
      entry: 7410.25,
      stop: 7419.25,
      target1: 7396.75,
      target2: 7392.25,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7412.75,
      shortBias: { state: 'primary', lineInSand: 7412.75 },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'BEAR', protectedStructure: 7419.25, confirmationLine: 7412.75 },
        ],
      },
    },
  } as any,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7408,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  now: new Date('2026-06-08T15:40:30.000Z'),
});
assert.equal(recentSameSideShiftedDeskPlaySuppression.shouldPost, false);
assert.equal(recentSameSideShiftedDeskPlaySuppression.category, 'low_quality_map');
assert.match(recentSameSideShiftedDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const recentSameSideIncompleteInstructionShiftDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      entry: null,
      stop: null,
      target1: null,
      target2: null,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      nextTrigger: 'Fresh completed 5M proof is still required before a new review ticket.',
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        tradeReadiness: { status: 'missed_no_chase' },
      },
    },
  } as any,
  deskPlanRefreshSent: { [firstDeskPlanRefreshKey]: previousDeskPlanRefreshRecord },
  currentPrice: 7408,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  now: new Date('2026-06-08T15:40:30.000Z'),
});
assert.equal(recentSameSideIncompleteInstructionShiftDeskPlaySuppression.shouldPost, false);
assert.equal(recentSameSideIncompleteInstructionShiftDeskPlaySuppression.category, 'low_quality_map');
assert.match(recentSameSideIncompleteInstructionShiftDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const tacticalNotAlignedDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(tacticalNotAlignedDeskPlaySuppression.shouldPost, false);
assert.equal(tacticalNotAlignedDeskPlaySuppression.category, 'low_quality_map');
assert.match(tacticalNotAlignedDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const tacticalNotAlignedWithLevelsDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as any,
  normalized: {
    entry: 7412.75,
    stop: 7424.75,
    setupCandidates: [],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(tacticalNotAlignedWithLevelsDeskPlaySuppression.shouldPost, false);
assert.equal(tacticalNotAlignedWithLevelsDeskPlaySuppression.category, 'low_quality_map');
assert.match(tacticalNotAlignedWithLevelsDeskPlaySuppression.reason, /not aligned with protected 5M structure yet/);
const nonTacticalNotAlignedDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        tradeReadiness: { status: 'not_aligned' },
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7450, confirmationLine: 7416.5 },
          { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7402, confirmationLine: 7416.5 },
        ],
      },
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(nonTacticalNotAlignedDeskPlaySuppression.shouldPost, false);
assert.equal(nonTacticalNotAlignedDeskPlaySuppression.category, 'low_quality_map');
assert.match(nonTacticalNotAlignedDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
assert.equal(nonTacticalNotAlignedDeskPlaySuppression.changesTradingLogic, false);
assert.equal(nonTacticalNotAlignedDeskPlaySuppression.changesCanExecute, false);
const htfFvgReviewMapDeskState = {
    ...baseDeskPlanRefreshState,
    canExecute: false,
    bestShortPlan: null,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7444,
      targetReactionLevel: 7450,
      activeTacticalZone: {
        direction: 'SHORT',
        lower: 7444,
        upper: 7465.25,
        state: 'in_zone',
      },
      htfFvgReactionRouting: {
        status: 'routed_active_reaction',
        direction: 'SHORT',
        lineInSand: 7472.25,
        lineLabel: 'SHORT BELOW 7472.25 from 240M parent FVG 7472.25-7512.00',
      },
      htfFvgCascade: {
        direction: 'SHORT',
        parentZone: {
          direction: 'SHORT',
          timeframe: '240M',
          lower: 7472.25,
          upper: 7512,
          state: 'rejected',
        },
      },
      htfFvgReactionMemory: {
        activeReaction: {
          direction: 'SHORT',
          timeframe: '240M',
          lower: 7472.25,
          upper: 7512,
          state: 'rejected',
        },
      },
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        state: 'primary',
        decisionQualityScore: 98,
        tradeReadiness: {
          status: 'not_aligned',
          missingProof: ['15M and 5M protected structure are not aligned for this side.'],
        },
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7520.5, confirmationLine: 7472.25 },
          { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7468, confirmationLine: 7472.25 },
        ],
      },
    },
  } as any;
const htfFvgReviewMapDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: htfFvgReviewMapDeskState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [{
      setupType: SetupType.IntradayMssMicroContinuation,
      scenarioLabel: 'HTF FVG review level carrier',
      direction: 'SHORT',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7465.25,
      stop: 7468,
      target1: 7461.25,
      target2: 7459.75,
      riskPoints: 2.75,
      decisionQualityScore: 50,
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7463,
  latestCompleted5m: '2026-06-25T10:55:00.0000000',
});
assert.equal(htfFvgReviewMapDeskPlaySuppression.shouldPost, true);
assert.equal(htfFvgReviewMapDeskPlaySuppression.category, 'post');
assert.equal(htfFvgReviewMapDeskPlaySuppression.changesTradingLogic, false);
assert.equal(htfFvgReviewMapDeskPlaySuppression.changesCanExecute, false);
assert.match(htfFvgReviewMapDeskPlaySuppression.reason, /SHORT high-quality HTF\/FVG review map is eligible/);
assert.match(htfFvgReviewMapDeskPlaySuppression.reason, /240M parent FVG 7472\.25-7512\.00/);
assert.match(htfFvgReviewMapDeskPlaySuppression.reason, /complete app-owned entry\/stop\/T1\/T2 are present/);
assert.match(htfFvgReviewMapDeskPlaySuppression.reason, /Discord remains review-only/);
const priorSamePublicHtfFvgDeskPlayRecord = {
  ...previousDeskPlanRefreshRecord,
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  activeCampaignId: null,
  direction: 'SHORT',
  lineInSand: 7472.25,
  activeTacticalLine: 7472.25,
  activeTacticalZoneLow: 7444,
  activeTacticalZoneHigh: 7465.25,
  activeTacticalZoneState: 'in_zone',
  longLine: null,
  shortLine: 7472.25,
  entry: 7465.25,
  stop: 7468,
  target1: 7461.25,
  target2: 7459.75,
  targetReactionLevel: null,
  readiness: 'not_aligned',
  mainPlayFingerprint: 'older-internal-review-map-shape',
  materialCadenceFingerprint: 'older-internal-review-map-label',
  sentAt: '2026-06-25T10:50:00.000Z',
} as any;
const repeatedHtfFvgReviewMapDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: htfFvgReviewMapDeskState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [{
      setupType: SetupType.IntradayMssMicroContinuation,
      scenarioLabel: 'HTF FVG review level carrier',
      direction: 'SHORT',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7465.25,
      stop: 7468,
      target1: 7461.25,
      target2: 7459.75,
      riskPoints: 2.75,
      decisionQualityScore: 50,
    }],
  } as any,
  deskPlanRefreshSent: { 'prior-same-public-htf-fvg': priorSamePublicHtfFvgDeskPlayRecord },
  currentPrice: 7463,
  latestCompleted5m: '2026-06-25T10:55:00.0000000',
  now: new Date('2026-06-25T10:55:30.000Z'),
});
assert.equal(repeatedHtfFvgReviewMapDeskPlaySuppression.shouldPost, false);
assert.equal(repeatedHtfFvgReviewMapDeskPlaySuppression.category, 'duplicate_refresh');
assert.match(repeatedHtfFvgReviewMapDeskPlaySuppression.reason, /same-side public trader action/);
assert.equal(repeatedHtfFvgReviewMapDeskPlaySuppression.changesTradingLogic, false);
assert.equal(repeatedHtfFvgReviewMapDeskPlaySuppression.changesCanExecute, false);
const staleHtfFvgReviewMapDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'morning',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: htfFvgReviewMapDeskState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [{
      setupType: SetupType.IntradayMssMicroContinuation,
      scenarioLabel: 'HTF FVG review level carrier',
      direction: 'SHORT',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7465.25,
      stop: 7468,
      target1: 7461.25,
      target2: 7459.75,
      riskPoints: 2.75,
      decisionQualityScore: 50,
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7461,
  latestCompleted5m: '2026-06-25T11:00:00.0000000',
});
assert.equal(staleHtfFvgReviewMapDeskPlaySuppression.shouldPost, false);
assert.equal(staleHtfFvgReviewMapDeskPlaySuppression.category, 'passed_or_invalidated_levels');
assert.match(staleHtfFvgReviewMapDeskPlaySuppression.reason, /already reached\/passed T1 7461\.25/);
const targetToLineLongReviewMapDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-29',
  instrument: 'MES',
  session: 'morning',
  deskPlayKey: '2026-06-29:MES:morning:DESK_PLAN_REFRESH:2026-06-29T09:30:00.0000000:no-campaign:LONG',
  deskState: {
    ...baseDeskPlanRefreshState,
    canExecute: false,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'ready',
    bestShortPlan: null,
    bestLongPlan: {
      lineInSand: 7480,
      entry: 7476.25,
      stop: 7444.25,
      target1: 7547.5,
      target2: 7560,
      riskPoints: 32,
      targetReactionLevel: 7480,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'LONG',
      lineInSand: 7480,
      longAbove: 7488.25,
      shortBelow: 7463,
      targetReactionLevel: 7480,
      targetReactionLabel: 'Round Number 7480',
      levelTransition: {
        sourceOfTruth: 'scanner_level_transition_map',
        targetReactionLevel: 7480,
        targetReactionLabel: 'Round Number 7480',
        longAbove: 7488.25,
        shortBelow: 7463,
        targetManagementInstruction: 'No chase into 7480. Wait for completed 5M/15M acceptance.',
      },
      longBias: {
        state: 'primary',
        lineInSand: 7480,
        decisionQualityScore: 90,
        tradeReadiness: { status: 'not_aligned' },
      },
      shortBias: {
        state: 'countertrend_review',
        lineInSand: 7463,
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '15M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7463, confirmationLine: 7480, biasChangeLine: 7463 },
          { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7463, confirmationLine: 7480, biasChangeLine: 7463 },
        ],
      },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [{
      setupType: SetupType.TurtleSoup,
      scenarioLabel: 'June 29 target-to-line long review',
      direction: 'LONG',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7476.25,
      stop: 7444.25,
      target1: 7547.5,
      target2: 7560,
      riskPoints: 32,
      decisionQualityScore: 90,
      requiredTrigger: 'Completed 5M/15M acceptance above 7480.00.',
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7480.25,
  latestCompleted5m: '2026-06-29T09:30:00.0000000',
});
assert.equal(targetToLineLongReviewMapDeskPlaySuppression.shouldPost, true);
assert.equal(targetToLineLongReviewMapDeskPlaySuppression.category, 'post');
assert.match(targetToLineLongReviewMapDeskPlaySuppression.reason, /LONG target-to-line review map is eligible/);
assert.match(targetToLineLongReviewMapDeskPlaySuppression.reason, /decision line\/reaction 7480\.00/);
assert.match(targetToLineLongReviewMapDeskPlaySuppression.reason, /acceptance above 7480\.00 promotes next HTF\/session line 7488\.25/);
assert.match(targetToLineLongReviewMapDeskPlaySuppression.reason, /REVIEW ONLY \/ NOT EXECUTION APPROVAL/);
assert.equal(targetToLineLongReviewMapDeskPlaySuppression.changesTradingLogic, false);
assert.equal(targetToLineLongReviewMapDeskPlaySuppression.changesCanExecute, false);
const targetToLineShortReviewMapDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-29',
  instrument: 'MES',
  session: 'morning',
  deskPlayKey: '2026-06-29:MES:morning:DESK_PLAN_REFRESH:2026-06-29T09:30:00.0000000:no-campaign:SHORT',
  deskState: {
    ...baseDeskPlanRefreshState,
    canExecute: false,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'ready',
    bestShortPlan: {
      lineInSand: 7460,
      entry: 7465,
      stop: 7475,
      target1: 7450,
      target2: 7445,
      riskPoints: 10,
      targetReactionLevel: 7460,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'SHORT',
      lineInSand: 7460,
      longAbove: 7480,
      shortBelow: 7450,
      targetReactionLevel: 7460,
      targetReactionLabel: 'Round Number 7460',
      levelTransition: {
        sourceOfTruth: 'scanner_level_transition_map',
        targetReactionLevel: 7460,
        targetReactionLabel: 'Round Number 7460',
        longAbove: 7480,
        shortBelow: 7450,
        targetManagementInstruction: 'No chase into 7460. Wait for completed 5M/15M acceptance below.',
      },
      shortBias: {
        state: 'primary',
        lineInSand: 7460,
        decisionQualityScore: 91,
        tradeReadiness: { status: 'not_aligned' },
      },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [{
      setupType: SetupType.SweepMssFvgRetrace,
      scenarioLabel: 'Target-to-line short review',
      direction: 'SHORT',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7465,
      stop: 7475,
      target1: 7450,
      target2: 7445,
      riskPoints: 10,
      decisionQualityScore: 91,
      requiredTrigger: 'Completed 5M/15M acceptance below 7460.00.',
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7459.75,
  latestCompleted5m: '2026-06-29T09:30:00.0000000',
});
assert.equal(targetToLineShortReviewMapDeskPlaySuppression.shouldPost, true);
assert.equal(targetToLineShortReviewMapDeskPlaySuppression.category, 'post');
assert.match(targetToLineShortReviewMapDeskPlaySuppression.reason, /SHORT target-to-line review map is eligible/);
assert.match(targetToLineShortReviewMapDeskPlaySuppression.reason, /acceptance below 7460\.00 promotes next HTF\/session line 7450\.00/);
const tacticalRequiredTriggerDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      ...baseDeskPlanRefreshState.bestShortPlan,
      setupType: SetupType.HtfDisplacementMssContinuation,
      direction: 'SHORT',
      candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
      requiredTrigger: 'Completed 5M close-through/retest below 7416.50 required before short continuation can execute.',
      missingEvidence: ['Wait for completed 5M retest/rejection.'],
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        tradeReadiness: { status: 'not_aligned' },
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '4H', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7450, confirmationLine: 7416.5 },
          { timeframe: '5M', bias: 'BULL', currentBias: 'BULL', protectedStructure: 7402, confirmationLine: 7416.5 },
        ],
      },
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  staleReason: 'Completed 5M close below 7416.50 required before short continuation is active.',
});
assert.equal(tacticalRequiredTriggerDeskPlaySuppression.shouldPost, false);
assert.equal(tacticalRequiredTriggerDeskPlaySuppression.category, 'low_quality_map');
assert.match(tacticalRequiredTriggerDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const dataLimitedReferenceDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    dataQualityStatus: 'data_limited',
    htfContextStatus: 'insufficient',
    canExecute: false,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7450,
      shortBelow: 7450,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        lineInSand: 7450,
        tradeReadiness: { status: 'data_limited' },
      },
    },
  } as DeskState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'HTF readiness gate is data-limited; review levels only.',
    invalidation: null,
    setupCandidates: [{ ...baseDeskPlanRefreshState.bestShortPlan, direction: 'SHORT' }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(dataLimitedReferenceDeskPlaySuppression.shouldPost, true);
assert.equal(dataLimitedReferenceDeskPlaySuppression.category, 'post');
assert.match(dataLimitedReferenceDeskPlaySuppression.reason, /reference map is eligible/);
assert.match(dataLimitedReferenceDeskPlaySuppression.reason, /readiness is data-limited/);
assert.match(dataLimitedReferenceDeskPlaySuppression.reason, /reference entry\/stop\/T1\/T2/);
const canonicalHeldDataLimitedReferenceDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    dataQualityStatus: 'data_limited',
    htfContextStatus: 'insufficient',
    canExecute: false,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7450,
      shortBelow: 7450,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        lineInSand: 7450,
        tradeReadiness: { status: 'data_limited' },
      },
    },
  } as DeskState,
  publishDecision: {
    sourceOfTruth: 'scanner_desk_publish_decision',
    action: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    shouldPost: false,
    reason: 'Canonical hold fixture.',
    displaySource: 'desk_ticket',
    candidateKey: null,
    direction: 'SHORT',
    setupType: null,
    lineInSand: 7450,
    triggerCondition: 'Completed 5M proof required.',
    entry: 7449.5,
    stop: 7461,
    t1: 7432.25,
    t2: 7420.75,
    invalidation: 7461,
    invalidationText: 'Invalid above 7461.00.',
    hasCompletePlan: true,
    humanReviewOnly: true,
    canExecute: false,
    noChaseState: false,
    htfContextStatus: 'insufficient',
    dataQualityStatus: 'data_limited',
    discordReason: 'Canonical DeskPublishDecision held this Desk Play local.',
    managementWarnings: [],
    driftBlocker: null,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
  },
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'HTF readiness gate is data-limited; review levels only.',
    invalidation: null,
    setupCandidates: [{ ...baseDeskPlanRefreshState.bestShortPlan, direction: 'SHORT' }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(canonicalHeldDataLimitedReferenceDeskPlaySuppression.shouldPost, false);
assert.equal(canonicalHeldDataLimitedReferenceDeskPlaySuppression.category, 'low_quality_map');
assert.match(canonicalHeldDataLimitedReferenceDeskPlaySuppression.reason, /Canonical DeskPublishDecision held/);
const canonicalHeldPreDeliveryGuard = scannerDeskPlayCanonicalPreDeliveryHold({
  sourceOfTruth: 'scanner_desk_publish_decision',
  action: 'HOLD_WITH_REASON',
  discordAction: 'hold',
  shouldPost: false,
  reason: 'Canonical stale/no-chase hold fixture.',
  displaySource: 'desk_ticket',
  candidateKey: null,
  direction: 'LONG',
  setupType: null,
  lineInSand: 7615.25,
  triggerCondition: 'Wait for fresh completed 5M proof.',
  entry: null,
  stop: null,
  t1: null,
  t2: null,
  invalidation: null,
  invalidationText: 'No fresh invalidation until proof returns.',
  hasCompletePlan: false,
  humanReviewOnly: true,
  canExecute: false,
  noChaseState: true,
  htfContextStatus: 'sufficient',
  dataQualityStatus: 'ok',
  discordReason: 'HELD_STALE_NO_CHASE: no fresh entry; wait for new completed 5M proof.',
  managementWarnings: [],
  driftBlocker: null,
  approvalBoundary: {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  },
});
assert.ok(canonicalHeldPreDeliveryGuard);
assert.equal(canonicalHeldPreDeliveryGuard.shouldPost, false);
assert.equal(canonicalHeldPreDeliveryGuard.category, 'low_quality_map');
assert.match(canonicalHeldPreDeliveryGuard.reason, /HELD_STALE_NO_CHASE/);
assert.equal(canonicalHeldPreDeliveryGuard.changesTradingLogic, false);
assert.equal(canonicalHeldPreDeliveryGuard.changesCanExecute, false);
assert.equal(scannerDeskPlayCanonicalPreDeliveryHold(null), null);
const missingProofPreDeliveryGuard = scannerDeskPlayCanonicalPreDeliveryHold(
  {
    sourceOfTruth: 'scanner_desk_publish_decision',
    action: 'POST_CONDITIONAL',
    discordAction: 'post_conditional',
    shouldPost: true,
    reason: 'Complete levels exist, but scanner operator decision is still held.',
    displaySource: 'selected_candidate',
    candidateKey: 'TurtleSoup|LONG|Bullish Turtle Soup Reversal|Conditional',
    direction: 'LONG',
    setupType: SetupType.TurtleSoup,
    lineInSand: 7620,
    triggerCondition: 'Bullish Turtle Soup requires completed 5M confirmation.',
    entry: 7620.5,
    stop: 7613.75,
    t1: 7630.75,
    t2: 7634,
    invalidation: 7613.75,
    invalidationText: 'Invalid below 7613.75.',
    hasCompletePlan: true,
    humanReviewOnly: true,
    canExecute: false,
    noChaseState: false,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'partial',
    discordReason: 'Complete scanner-owned levels exist.',
    managementWarnings: [],
    driftBlocker: null,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
  },
  {
    shouldSend: false,
    reason: 'HELD_MISSING_5M_PROOF: waiting for completed 5M trigger/retest proof.',
  },
);
assert.ok(missingProofPreDeliveryGuard);
assert.equal(missingProofPreDeliveryGuard.shouldPost, false);
assert.equal(missingProofPreDeliveryGuard.category, 'low_quality_map');
assert.match(missingProofPreDeliveryGuard.reason, /HELD_MISSING_5M_PROOF/);
assert.equal(missingProofPreDeliveryGuard.changesTradingLogic, false);
assert.equal(missingProofPreDeliveryGuard.changesCanExecute, false);
const earlyLineInSandNoLevelsDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'evening',
  deskPlayKey: '2026-06-25:MES:evening:DESK_PLAN_REFRESH:2026-06-25T19:25:00.0000000:no-campaign:SHORT',
  deskState: {
    ...baseDeskPlanRefreshState,
    canExecute: false,
    bestShortPlan: null,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7450,
      shortBelow: 7450,
      activeTacticalLine: {
        direction: 'SHORT',
        activeLine: 7450,
        migrated: true,
        nextTrigger: 'Completed 5M close/hold below 7450.00, then reject the retest.',
        standDown: 'Stand down if price accepts back above 7450.00.',
      },
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        lineInSand: 7450,
        tradeReadiness: { status: 'wait_for_completed_5m_proof' },
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7424.75, confirmationLine: 7450 },
        ],
      },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7450.25,
  latestCompleted5m: '2026-06-25T19:25:00.0000000',
});
assert.equal(earlyLineInSandNoLevelsDeskPlaySuppression.shouldPost, false);
assert.equal(earlyLineInSandNoLevelsDeskPlaySuppression.category, 'low_quality_map');
assert.match(earlyLineInSandNoLevelsDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
assert.equal(earlyLineInSandNoLevelsDeskPlaySuppression.changesTradingLogic, false);
assert.equal(earlyLineInSandNoLevelsDeskPlaySuppression.changesCanExecute, false);
const dataLimitedEarlyLineInSandDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'evening',
  deskPlayKey: '2026-06-25:MES:evening:DESK_PLAN_REFRESH:2026-06-25T19:30:00.0000000:no-campaign:SHORT',
  deskState: {
    ...baseDeskPlanRefreshState,
    dataQualityStatus: 'data_limited',
    htfContextStatus: 'insufficient',
    canExecute: false,
    bestShortPlan: null,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7450,
      shortBelow: 7450,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        lineInSand: 7450,
        tradeReadiness: { status: 'data_limited' },
      },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'BEAR', currentBias: 'BEAR', protectedStructure: 7424.75, confirmationLine: 7450 },
        ],
      },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: '120M preload is incomplete; 5M line watch is still visible.',
    setupCandidates: [],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7449.75,
  latestCompleted5m: '2026-06-25T19:30:00.0000000',
});
assert.equal(dataLimitedEarlyLineInSandDeskPlaySuppression.shouldPost, false);
assert.equal(dataLimitedEarlyLineInSandDeskPlaySuppression.category, 'low_quality_map');
assert.match(dataLimitedEarlyLineInSandDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const missingFiveMinuteEarlyLineInSandDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-25',
  instrument: 'MES',
  session: 'evening',
  deskPlayKey: '2026-06-25:MES:evening:DESK_PLAN_REFRESH:no-completed-5m:no-campaign:SHORT',
  deskState: {
    ...baseDeskPlanRefreshState,
    dataQualityStatus: 'data_limited',
    htfContextStatus: 'insufficient',
    canExecute: false,
    bestShortPlan: null,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      lineInSand: 7450,
      shortBelow: 7450,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        lineInSand: 7450,
        tradeReadiness: { status: 'data_limited' },
      },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: '5M execution data unavailable.',
    setupCandidates: [],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7449.75,
});
assert.equal(missingFiveMinuteEarlyLineInSandDeskPlaySuppression.shouldPost, false);
assert.equal(missingFiveMinuteEarlyLineInSandDeskPlaySuppression.category, 'low_quality_map');
assert.match(missingFiveMinuteEarlyLineInSandDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const dataLimitedNoLevelDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: shiftedDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    dataQualityStatus: 'data_limited',
    htfContextStatus: 'insufficient',
    canExecute: false,
    bestShortPlan: null,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      shortBelow: null,
      lineInSand: null,
      shortBias: {
        ...baseDeskPlanRefreshState.primaryDeskPlay.shortBias,
        lineInSand: null,
      },
      htfProtectedStructureMap: { rows: [] },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'HTF readiness gate is data-limited and levels are unavailable.',
    invalidation: null,
    setupCandidates: [],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(dataLimitedNoLevelDeskPlaySuppression.shouldPost, false);
assert.equal(dataLimitedNoLevelDeskPlaySuppression.category, 'low_quality_map');
assert.match(dataLimitedNoLevelDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const staleTargetDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: baseDeskPlanRefreshState,
  deskPlanRefreshSent: {},
  currentPrice: 7405.25,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
});
assert.equal(staleTargetDeskPlaySuppression.shouldPost, false);
assert.equal(staleTargetDeskPlaySuppression.category, 'low_quality_map');
assert.match(staleTargetDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const insideShortTacticalZoneDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-23',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: '2026-06-23:MES:lunch:DESK_PLAN_REFRESH:2026-06-23T15:25:00.0000000:SHORT',
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      lineInSand: 7445,
      entry: 7445.75,
      stop: 7452.5,
      target1: 7435.75,
      target2: 7432.25,
      riskPoints: 6.75,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'SHORT',
      lineInSand: 7445,
      shortBelow: 7445,
      activeTacticalLine: {
        direction: 'SHORT',
        activeLine: 7445,
        migrated: true,
        migratedFromLine: 7440,
      },
      activeTacticalZone: {
        direction: 'SHORT',
        lower: 7445,
        upper: 7446.5,
        state: 'in_zone',
        zoneLabel: 'bearish imbalance retest',
        nextTrigger: 'Completed 5M hold/reject inside 7445.00-7446.50.',
        noChase: 'Do not chase below T1.',
      },
      shortBias: {
        state: 'primary',
        lineInSand: 7445,
        decisionQualityScore: 93,
        tradeReadiness: { status: 'wait_for_completed_5m_proof' },
      },
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7445.5,
  latestCompleted5m: '2026-06-23T15:25:00.0000000',
});
assert.equal(insideShortTacticalZoneDeskPlaySuppression.shouldPost, false);
assert.equal(insideShortTacticalZoneDeskPlaySuppression.category, 'low_quality_map');
assert.match(insideShortTacticalZoneDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const aboveShortTacticalZoneDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-23',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: '2026-06-23:MES:lunch:DESK_PLAN_REFRESH:2026-06-23T15:20:00.0000000:SHORT',
  deskState: {
    ...baseDeskPlanRefreshState,
    bestShortPlan: {
      lineInSand: 7445,
      entry: 7445.75,
      stop: 7452.5,
      target1: 7435.75,
      target2: 7432.25,
      riskPoints: 6.75,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'SHORT',
      lineInSand: 7445,
      shortBelow: 7445,
      activeTacticalLine: {
        direction: 'SHORT',
        activeLine: 7445,
        migrated: true,
        migratedFromLine: 7440,
      },
      activeTacticalZone: {
        direction: 'SHORT',
        lower: 7445,
        upper: 7446.5,
        state: 'waiting_retest',
        zoneLabel: 'bearish imbalance retest',
      },
      shortBias: {
        state: 'primary',
        lineInSand: 7445,
        decisionQualityScore: 93,
        tradeReadiness: { status: 'wait_for_completed_5m_proof' },
      },
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7447.25,
  latestCompleted5m: '2026-06-23T15:20:00.0000000',
});
assert.equal(aboveShortTacticalZoneDeskPlaySuppression.shouldPost, false);
assert.equal(aboveShortTacticalZoneDeskPlaySuppression.category, 'low_quality_map');
assert.match(aboveShortTacticalZoneDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const staleReferenceTargetDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-23',
  instrument: 'MES',
  session: 'morning',
  deskPlayKey: '2026-06-23:MES:morning:DESK_PLAN_REFRESH:2026-06-23T09:45:00.0000000',
  deskState: {
    ...baseDeskPlanRefreshState,
    activeCampaign: { id: '2026-06-23:LONG:HTF-FAILED-AUCTION' },
    bestShortPlan: null,
    bestLongPlan: {
      direction: 'LONG',
      lineInSand: 7436.25,
      entry: 7442.5,
      stop: null,
      target1: null,
      target2: null,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'LONG',
      lineInSand: 7436.25,
      longAbove: 7436.25,
      shortBelow: null,
      targetReactionLevel: null,
      longBias: { state: 'primary', lineInSand: 7436.25, tradeReadiness: { status: 'wait_for_pullback_or_new_5m_structure' } },
      shortBias: { state: 'not_present', lineInSand: null },
      htfProtectedStructureMap: {
        rows: [
          { timeframe: '5M', bias: 'CONFLICT', currentBias: 'BULL', protectedStructure: 7423.5, confirmationLine: 7436.25 },
        ],
      },
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'Review only until completed 5M proof.',
    invalidation: null,
    setupCandidates: [{
      direction: 'LONG',
      setupType: SetupType.TurtleSoup,
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      entry: 7429.5,
      stop: 7423.5,
      target1: 7442,
      target2: 7446.75,
      riskPoints: 6,
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7462.5,
  latestCompleted5m: '2026-06-23T09:45:00.0000000',
});
assert.equal(staleReferenceTargetDeskPlaySuppression.shouldPost, false);
assert.equal(staleReferenceTargetDeskPlaySuppression.category, 'passed_or_invalidated_levels');
assert.match(staleReferenceTargetDeskPlaySuppression.reason, /already reached\/passed T2 7441\.50/);
const missedNoChaseDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: baseDeskPlanRefreshState,
  deskPlanRefreshSent: {},
  currentPrice: 7415,
  latestCompleted5m: '2026-06-08T15:40:00.0000000',
  staleReason: 'Preferred entry was missed before the alert. Do not chase.',
});
assert.equal(missedNoChaseDeskPlaySuppression.shouldPost, false);
assert.equal(missedNoChaseDeskPlaySuppression.category, 'low_quality_map');
assert.match(missedNoChaseDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const lineCrossNoChaseTransitionDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-07-12',
  instrument: 'MES',
  session: 'evening',
  deskPlayKey: '2026-07-12:MES:evening:DESK_PLAN_REFRESH:2026-07-12T21:05:00.0000000:SHORT-line-cross-no-chase',
  deskState: {
    ...baseDeskPlanRefreshState,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'ready',
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'SHORT',
      lineInSand: 7605.75,
      shortBelow: 7605.75,
      longAbove: 7610,
      shortBias: { state: 'primary', lineInSand: 7605.75, tradeReadiness: { status: 'missed_no_chase' } },
      longBias: { state: 'secondary', lineInSand: 7610, tradeReadiness: { status: 'not_aligned' } },
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7593.75,
  latestCompleted5m: '2026-07-12T21:05:00.0000000',
  completed5m: { time: '2026-07-12T21:05:00.0000000', open: 7597, high: 7598, low: 7592.5, close: 7593.75, volume: 3389 },
  staleReason: 'T1 was already reached before alert generation. Move occurred without preferred retest. No chase entry.',
});
assert.equal(lineCrossNoChaseTransitionDeskPlaySuppression.shouldPost, false);
assert.equal(lineCrossNoChaseTransitionDeskPlaySuppression.category, 'low_quality_map');
assert.match(lineCrossNoChaseTransitionDeskPlaySuppression.reason, /complete app-owned entry, stop, T1, and T2/);
const waitHighQualityConditionalDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-23',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: '2026-06-23:MES:lunch:DESK_PLAN_REFRESH:2026-06-23T15:25:00.0000000:no-campaign:WAIT',
  deskState: {
    ...baseDeskPlanRefreshState,
    activeCampaign: { id: '2026-06-23:LONG:HTF-FAILED-AUCTION' },
    bestShortPlan: {
      setupType: SetupType.SweepMssFvgRetrace,
      direction: 'SHORT',
      entry: 7445.75,
      stop: 7452.5,
      target1: 7429.25,
      target2: 7428.75,
      riskPoints: 6.75,
    },
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'WAIT',
      lineInSand: null,
      longBias: { state: 'secondary', lineInSand: null },
      shortBias: { state: 'secondary', lineInSand: 7445, tradeReadiness: { status: 'not_aligned' } },
      htfConflict: true,
    },
  } as any,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [{
      setupType: SetupType.SweepMssFvgRetrace,
      scenarioLabel: 'ICT Model 1 Short: Sweep Reclaim Imbalance Retrace',
      direction: 'SHORT',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7445.75,
      stop: 7452.5,
      target1: 7429.25,
      target2: 7428.75,
      riskPoints: 6.75,
      rankScore: 227,
      decisionQualityScore: 93,
      evidence: ['Sweep/reclaim, displacement, MSS, and 5M FVG retrace are present.'],
      missingEvidence: ['Completed 5M trigger/retest proof still required.', 'HTF conflict still present; publish only as counter-structure review.'],
      requiredTrigger: 'Entry only on retrace into bearish imbalance 7445-7446.5 after sweep, reclaim, displacement, and bearish structure shift.',
      nextAction: 'Wait for completed 5M proof; do not chase after T1.',
      reducedRiskPlan: null,
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7445.5,
  latestCompleted5m: '2026-06-23T15:25:00.0000000',
});
assert.equal(waitHighQualityConditionalDeskPlaySuppression.shouldPost, true);
assert.equal(waitHighQualityConditionalDeskPlaySuppression.category, 'post');
assert.match(waitHighQualityConditionalDeskPlaySuppression.reason, /SHORT high-confidence conditional trade plan is eligible/);
assert.match(waitHighQualityConditionalDeskPlaySuppression.reason, /execution arms only after the named completed 5M condition/);
const htfFvgMicroMssLongWatchDeskState = {
  ...baseDeskPlanRefreshState,
  htfContextStatus: 'sufficient',
  dataQualityStatus: 'ready',
  activeCampaign: { id: '2026-07-02:LONG:HTF-FVG-MICRO-MSS' },
  bestLongPlan: {
    setupType: SetupType.IntradayMssMicroContinuation,
    direction: 'LONG',
    candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
    lineInSand: 7500.75,
    entry: 7501.75,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    decisionQualityScore: 72,
    lineInSandReason: '7500.75 is the completed 5M MSS close-through/reclaim line after the 60M HTF FVG reaction.',
    nextTrigger: 'Human-review long: completed bullish 5M MSS close-through from the 60M HTF FVG, then completed 5M retest/hold above 7500.75.',
    requiredTrigger: 'Completed 5M close-through and retest/hold above 7500.75.',
    missingEvidence: ['Protected 5M retest swing stop is not confirmed.'],
    missingLevels: ['Protected 5M stop', 'App T1/T2 from actual entry/stop risk'],
  },
  bestShortPlan: null,
  primaryDeskPlay: {
    ...baseDeskPlanRefreshState.primaryDeskPlay,
    direction: 'LONG',
    lineInSand: 7500.75,
    targetReactionLevel: null,
    longAbove: 7500.75,
    shortBelow: 7503,
    nextTrigger: 'Completed 5M retest/hold above 7500.75 creates the human-review long plan.',
    activeTacticalLine: {
      activeLine: 7500.75,
      nextTrigger: 'Active line 7500.75: completed 5M hold/retest above required before fresh execution consideration.',
    },
    longBias: {
      state: 'primary',
      lineInSand: 7500.75,
      decisionQualityScore: 72,
      tradeReadiness: {
        status: 'wait_for_pullback_or_new_5m_structure',
        reason: 'HTF FVG reaction plus completed 5M micro MSS is active; protected retest swing stop still required.',
      },
      nextTrigger: 'Completed 5M retest/hold above 7500.75.',
    },
    shortBias: { state: 'secondary', lineInSand: 7503, tradeReadiness: { status: 'not_aligned' } },
    htfConflict: true,
    htfProtectedStructureMap: { rows: [] },
  },
} as any;
const htfFvgMicroMssWatchSuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-07-02',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: '2026-07-02:MES:lunch:DESK_PLAN_REFRESH:2026-07-02T14:10:00.0000000:no-campaign:LONG',
  deskState: htfFvgMicroMssLongWatchDeskState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7504.25,
  latestCompleted5m: '2026-07-02T14:10:00.0000000',
});
assert.equal(htfFvgMicroMssWatchSuppression.shouldPost, false);
assert.equal(htfFvgMicroMssWatchSuppression.category, 'low_quality_map');
assert.match(htfFvgMicroMssWatchSuppression.reason, /complete app-owned entry, stop, T1, and T2/);

const htfFvgMicroMssLongPlanDeskState = {
  ...htfFvgMicroMssLongWatchDeskState,
  bestLongPlan: {
    ...htfFvgMicroMssLongWatchDeskState.bestLongPlan,
    entry: 7501.25,
    stop: 7492.75,
    target1: 7514,
    target2: 7518.25,
    riskPoints: 8.5,
    decisionQualityScore: 88,
    candidateState: 'QUALIFIED_CONDITIONAL',
    missingEvidence: [],
    missingLevels: [],
  },
  primaryDeskPlay: {
    ...htfFvgMicroMssLongWatchDeskState.primaryDeskPlay,
    longBias: {
      ...htfFvgMicroMssLongWatchDeskState.primaryDeskPlay.longBias,
      decisionQualityScore: 88,
      tradeReadiness: { status: 'review_only_missing_proof', reason: 'Human-review only; canExecute remains false.' },
    },
  },
} as any;
const htfFvgMicroMssFullPlanSuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-07-02',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: '2026-07-02:MES:lunch:DESK_PLAN_REFRESH:2026-07-02T14:25:00.0000000:no-campaign:LONG',
  deskState: htfFvgMicroMssLongPlanDeskState,
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [{
      setupType: SetupType.IntradayMssMicroContinuation,
      scenarioLabel: 'HTF FVG Reaction + 5M Micro MSS Reversal',
      direction: 'LONG',
      detectedStatus: SetupCandidateStatus.Conditional,
      executionStatus: ExecutionStatus.Conditional,
      blockReason: NoTradeReason.EntryTriggerPending,
      entry: 7501.25,
      stop: 7492.75,
      target1: 7514,
      target2: 7518.25,
      riskPoints: 8.5,
      decisionQualityScore: 88,
    }],
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7501.25,
  latestCompleted5m: '2026-07-02T14:25:00.0000000',
});
assert.equal(htfFvgMicroMssFullPlanSuppression.shouldPost, true);
assert.equal(htfFvgMicroMssFullPlanSuppression.category, 'post');
assert.doesNotMatch(htfFvgMicroMssFullPlanSuppression.reason, /NO TRADE|low_quality_map|suppressed/i);

const htfFvgMicroMssTransitionGate = evaluateScannerPrimaryAlertPublishingGate({
  alertDecision: { shouldSend: true, reason: 'HTF FVG micro MSS long full plan qualified.' },
  deskState: {
    ...htfFvgMicroMssLongPlanDeskState,
    primaryDeskPlay: {
      ...htfFvgMicroMssLongPlanDeskState.primaryDeskPlay,
      htfConflict: false,
      longBias: { tradeReadiness: { status: 'aligned' } },
      shortBias: { tradeReadiness: { status: 'not_aligned' } },
    },
  } as unknown as DeskState,
  candidate: {
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: 'HTF FVG Reaction + 5M Micro MSS Reversal',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'High',
    priority: 96,
    entry: 7501.25,
    stop: 7492.75,
    target1: 7514,
    target2: 7518.25,
    riskPoints: 8.5,
    decisionQualityScore: 88,
    evidence: ['60M HTF FVG reaction', 'completed bullish 5M MSS close-through'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: 'Completed 5M retest/hold above 7500.75.',
    nextAction: 'Human-review long only.',
    reducedRiskPlan: null,
  } as SetupCandidate,
  normalizedCanExecute: false,
  state: 'Conditional' as ScannerState,
  currentPrice: 7501.25,
  priorActiveDelivery: {
    ...priorShortCampaignDelivery,
    candidate: {
      ...priorShortCampaignDelivery.candidate,
      activeCampaign: {
        ...priorShortCampaignDelivery.candidate.activeCampaign!,
        lineInSand: 7500.75,
      },
    },
  },
  completed5m: { time: '2026-07-02T14:25:00.0000000', open: 7496.25, high: 7502.75, low: 7496, close: 7501.25, volume: 1 },
});
assert.equal(htfFvgMicroMssTransitionGate.shouldSend, true);
assert.match(htfFvgMicroMssTransitionGate.reason, /Campaign transition|REVIEW ONLY \/ NOT EXECUTION APPROVAL/);

const waitDeskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  deskPlayKey: repeatedBaseDeskPlanRefreshKey,
  deskState: {
    ...baseDeskPlanRefreshState,
    primaryDeskPlay: {
      ...baseDeskPlanRefreshState.primaryDeskPlay,
      direction: 'WAIT',
    },
  } as any,
  deskPlanRefreshSent: {},
  currentPrice: 7410,
});
assert.equal(waitDeskPlaySuppression.shouldPost, false);
assert.equal(waitDeskPlaySuppression.category, 'low_quality_map');
assert.deepEqual(loadScannerActiveCampaignLedgerConfig({
  SUPABASE_URL: 'https://project.supabase.co/rest/v1',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
  DISCORD_RAG_USER_ID: '00000000-0000-0000-0000-000000000001',
} as NodeJS.ProcessEnv), {
  supabaseUrl: 'https://project.supabase.co',
  serviceRoleKey: 'service-role-test',
  userId: '00000000-0000-0000-0000-000000000001',
});
const durableLedgerConfig: ScannerActiveCampaignDurableLedgerConfig = {
  supabaseUrl: 'https://project.supabase.co',
  serviceRoleKey: 'service-role-test',
  userId: '00000000-0000-0000-0000-000000000001',
};
const durableFetchCalls: Array<{ method: string; url: string; body: any }> = [];
const durableClaimFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  durableFetchCalls.push({
    method: init?.method || 'GET',
    url: String(input),
    body: init?.body ? JSON.parse(String(init.body)) : null,
  });
  if ((init?.method || 'GET') === 'POST') {
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const durableClaim = await claimDurableActiveCampaignScannerAlert({
  config: durableLedgerConfig,
  candidate: campaignCandidate,
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  state: 'Conditional',
  confidence: 82,
  alertKey: 'first-alert-key',
  planVersionId: 'LUNCH-20260608',
  fetchImpl: durableClaimFetch,
});
assert.equal(durableClaim.claimed, true);
assert.equal(durableClaim.shouldSuppress, false);
assert.equal(durableFetchCalls[0].method, 'POST');
assert.equal(durableFetchCalls[0].body.campaign_id, '2026-06-08:SHORT:15M5M-MSS');
assert.equal(durableFetchCalls[0].body.delivery_status, 'pending');
const initialPublicActionFingerprint = durableFetchCalls[0]?.body?.metadata?.publicActionFingerprint;
assert.equal(typeof initialPublicActionFingerprint, 'string');
durableFetchCalls.length = 0;
const sundayEveningDurableClaim = await claimDurableActiveCampaignScannerAlert({
  config: durableLedgerConfig,
  candidate: utcRolloverCampaignCandidate,
  tradeDate: '2026-06-14',
  instrument: 'MES',
  session: 'evening',
  state: 'Conditional',
  confidence: 79,
  alertKey: 'sunday-evening-alert-key',
  planVersionId: 'EVENING-20260614',
  fetchImpl: durableClaimFetch,
});
assert.equal(sundayEveningDurableClaim.claimed, true);
assert.equal(sundayEveningDurableClaim.campaignId, '2026-06-14:LONG:HTF-FAILED-AUCTION');
assert.equal(durableFetchCalls[0].body.campaign_id, '2026-06-14:LONG:HTF-FAILED-AUCTION');
assert.equal(durableFetchCalls[0].body.trade_date, '2026-06-14');
const missingDurableLedger = await claimDurableActiveCampaignScannerAlert({
  config: null,
  candidate: campaignCandidate,
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  state: 'Conditional',
  confidence: 82,
  alertKey: 'missing-ledger-alert-key',
  planVersionId: 'LUNCH-20260608-MISSING-LEDGER',
});
assert.equal(missingDurableLedger.source, 'blocked');
assert.equal(missingDurableLedger.claimed, false);
assert.equal(missingDurableLedger.shouldSuppress, true);
assert.match(missingDurableLedger.reason || '', /durable Supabase ledger is required/);
const missingLedgerReadiness = await verifyScannerActiveCampaignLedgerReady({ config: null });
assert.equal(missingLedgerReadiness.ready, false);
assert.equal(missingLedgerReadiness.source, 'missing_config');
const okLedgerReadiness = await verifyScannerActiveCampaignLedgerReady({
  config: durableLedgerConfig,
  fetchImpl: async (): Promise<Response> => new Response(JSON.stringify([]), { status: 200 }),
});
assert.equal(okLedgerReadiness.ready, true);
assert.equal(okLedgerReadiness.source, 'supabase');
const failedLedgerReadiness = await verifyScannerActiveCampaignLedgerReady({
  config: durableLedgerConfig,
  fetchImpl: async (): Promise<Response> => new Response('missing table', { status: 404 }),
});
assert.equal(failedLedgerReadiness.ready, false);
assert.equal(failedLedgerReadiness.source, 'error');

const durableDuplicateFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = init?.method || 'GET';
  if (method === 'POST') return new Response('duplicate', { status: 409 });
  if (method === 'GET') {
    return new Response(JSON.stringify([{
      delivery_status: 'sent',
      suppressed_count: 2,
      metadata: { existing: true },
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'PATCH') return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  return new Response('', { status: 500 });
};
const durableDuplicate = await claimDurableActiveCampaignScannerAlert({
  config: durableLedgerConfig,
  candidate: shiftedCampaignCandidate,
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  state: 'Conditional',
  confidence: 82,
  alertKey: 'shifted-alert-key',
  planVersionId: 'LUNCH-20260608-B',
  fetchImpl: durableDuplicateFetch,
});
assert.equal(durableDuplicate.claimed, false);
assert.equal(durableDuplicate.shouldSuppress, true);
assert.match(durableDuplicate.reason || '', /durable Supabase ledger/);

const priorPublicActionFingerprint = initialPublicActionFingerprint;
assert.equal(typeof priorPublicActionFingerprint, 'string');
let durableMaterialUpdatePatched = false;
const durableMaterialUpdateFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = init?.method || 'GET';
  if (method === 'POST') return new Response('duplicate', { status: 409 });
  if (method === 'GET') {
    return new Response(JSON.stringify([{
      delivery_status: 'sent',
      alert_key: 'first-alert-key',
      plan_version_id: 'LUNCH-20260608',
      suppressed_count: 2,
      metadata: {
        existing: true,
        publicActionFingerprint: priorPublicActionFingerprint,
      },
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'PATCH') {
    const body = JSON.parse(String(init?.body || '{}'));
    durableMaterialUpdatePatched = body.delivery_status === 'pending'
      && body.metadata?.campaignUpdateReason === 'material_public_action_update'
      && body.metadata?.priorPublicActionFingerprint === priorPublicActionFingerprint
      && typeof body.metadata?.publicActionFingerprint === 'string'
      && body.metadata.publicActionFingerprint !== priorPublicActionFingerprint;
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  }
  return new Response('', { status: 500 });
};
const durableMaterialUpdate = await claimDurableActiveCampaignScannerAlert({
  config: durableLedgerConfig,
  candidate: shiftedCampaignCandidate,
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  state: 'Conditional',
  confidence: 82,
  alertKey: 'shifted-alert-key',
  planVersionId: 'LUNCH-20260608-B',
  fetchImpl: durableMaterialUpdateFetch,
});
assert.equal(durableMaterialUpdate.claimed, true);
assert.equal(durableMaterialUpdate.shouldSuppress, false);
assert.match(durableMaterialUpdate.reason || '', /material campaign update/);
assert.equal(durableMaterialUpdatePatched, true);

let stalePendingReclaimed = false;
const durableStalePendingFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = init?.method || 'GET';
  if (method === 'POST') return new Response('duplicate', { status: 409 });
  if (method === 'GET') {
    return new Response(JSON.stringify([{
      delivery_status: 'pending',
      first_claimed_at: '2020-06-30T15:35:05.005Z',
      first_sent_at: null,
      suppressed_count: 144,
      metadata: { existing: true },
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (method === 'PATCH') {
    const body = JSON.parse(String(init?.body || '{}'));
    stalePendingReclaimed = body.delivery_status === 'pending'
      && body.metadata?.reclaimedReason === 'stale_pending_without_first_sent_at';
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  }
  return new Response('', { status: 500 });
};
const durableStalePending = await claimDurableActiveCampaignScannerAlert({
  config: durableLedgerConfig,
  candidate: shiftedCampaignCandidate,
  tradeDate: '2026-06-30',
  instrument: 'MES',
  session: 'morning',
  state: 'Conditional',
  confidence: 65,
  alertKey: 'stale-pending-alert-key',
  planVersionId: 'MORNING-20260630-153504',
  fetchImpl: durableStalePendingFetch,
});
assert.equal(durableStalePending.claimed, true);
assert.equal(durableStalePending.shouldSuppress, false);
assert.match(durableStalePending.reason || '', /stale pending claim/);
assert.equal(stalePendingReclaimed, true);

let reclaimPatchedToPending = false;
const durableReclaimFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = init?.method || 'GET';
  if (method === 'POST') return new Response('duplicate', { status: 409 });
  if (method === 'GET') {
    return new Response(JSON.stringify([{ delivery_status: 'skipped', suppressed_count: 0, metadata: {} }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (method === 'PATCH') {
    reclaimPatchedToPending = JSON.parse(String(init?.body || '{}')).delivery_status === 'pending';
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  }
  return new Response('', { status: 500 });
};
const durableReclaim = await claimDurableActiveCampaignScannerAlert({
  config: durableLedgerConfig,
  candidate: campaignCandidate,
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'lunch',
  state: 'Conditional',
  confidence: 82,
  alertKey: 'retry-alert-key',
  planVersionId: 'LUNCH-20260608-C',
  fetchImpl: durableReclaimFetch,
});
assert.equal(durableReclaim.claimed, true);
assert.equal(durableReclaim.shouldSuppress, false);
assert.equal(reclaimPatchedToPending, true);

let markedSent = false;
await markDurableActiveCampaignScannerAlertSent({
  config: durableLedgerConfig,
  campaignId: '2026-06-08:SHORT:15M5M-MSS',
  fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    markedSent = JSON.parse(String(init?.body || '{}')).delivery_status === 'sent';
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  },
});
assert.equal(markedSent, true);

let releasedFailed = false;
await releaseDurableActiveCampaignScannerAlertClaim({
  config: durableLedgerConfig,
  campaignId: '2026-06-08:SHORT:15M5M-MSS',
  deliveryStatus: 'failed',
  reason: 'webhook unavailable',
  fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = init?.method || 'GET';
    if (method === 'GET') return new Response(JSON.stringify([{ metadata: { existing: true } }]), { status: 200 });
    releasedFailed = JSON.parse(String(init?.body || '{}')).delivery_status === 'failed';
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  },
});
assert.equal(releasedFailed, true);

let releasedSkippedAfterSuppression = false;
let skippedReleaseReason = '';
await releaseDurableActiveCampaignScannerAlertClaim({
  config: durableLedgerConfig,
  campaignId: '2026-06-30:LONG:HTF-FAILED-AUCTION',
  deliveryStatus: 'skipped',
  reason: 'Final scanner publishing gate suppressed alert after durable claim: DeskState/readiness suppression.',
  fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = init?.method || 'GET';
    if (method === 'GET') return new Response(JSON.stringify([{ metadata: { existing: true } }]), { status: 200 });
    const body = JSON.parse(String(init?.body || '{}'));
    releasedSkippedAfterSuppression = body.delivery_status === 'skipped';
    skippedReleaseReason = String(body.metadata?.releaseReason || '');
    return new Response(JSON.stringify([{ id: 'claim-1' }]), { status: 200 });
  },
});
assert.equal(releasedSkippedAfterSuppression, true);
assert.match(skippedReleaseReason, /Final scanner publishing gate suppressed alert after durable claim/);

const juneFiveSameCycleFailedLong = appOwnedFailedDecisionEventFromCandidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Bullish Turtle Soup Reversal',
  pathway: 'primary_setup_scanner',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Detected,
  executionStatus: ExecutionStatus.Executable,
  confidence: 'High',
  priority: 1,
  entry: 7518.5,
  stop: 7505.5,
  target1: 7550,
  target2: 7557,
  riskPoints: 13,
  riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
  riskPolicy: 'STRUCTURAL_RISK_ACKNOWLEDGED',
  entryClarity: 0.8,
  stopClarity: 0.8,
  targetClarity: 0.8,
  proximityScore: 0.8,
  levelContextScore: 10,
  evidence: [],
  missingEvidence: [],
  invalidation: null,
  blockReason: null,
  requiredTrigger: null,
  nextAction: null,
  reducedRiskPlan: null,
}, {
  time: '2026-06-05T10:00:00.0000000',
  open: 7524.25,
  high: 7524.75,
  low: 7510.75,
  close: 7511.5,
  volume: 26897,
});
assert.ok(juneFiveSameCycleFailedLong);
assert.equal(juneFiveSameCycleFailedLong.direction, 'SHORT');
assert.equal(juneFiveSameCycleFailedLong.failedLevel, 7518.5);
assert.match(juneFiveSameCycleFailedLong.evidence || '', /Completed 5M close 7511\.5 crossed below 7518\.5/);

assert.equal(SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS, 30);
const morningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'morning');
assert.deepEqual(Object.keys(morningHistoryPlan).sort(), ['120m', '15m', '240m', '5m', '60m']);
for (const timeframe of ['5m', '15m', '60m', '120m', '240m'] as const) {
  assert.equal(morningHistoryPlan[timeframe].requiredLookbackDays, 30);
  assert.equal(morningHistoryPlan[timeframe].from, '2026-05-04T00:00:00-04:00');
  assert.equal(morningHistoryPlan[timeframe].to, '2026-06-02T12:00:00-04:00');
}
const lunchHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'lunch');
assert.equal(lunchHistoryPlan['5m'].from, '2026-05-04T00:00:00-04:00');
assert.equal(lunchHistoryPlan['5m'].to, '2026-06-02T16:00:00-04:00');
const eveningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'evening');
assert.equal(eveningHistoryPlan['5m'].from, '2026-05-04T00:00:00-04:00');
assert.equal(eveningHistoryPlan['5m'].to, '2026-06-02T22:15:00-04:00');

const liveMorningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'morning', '2026-06-02T10:05:00.0000000');
assert.equal(liveMorningHistoryPlan['5m'].from, '2026-05-04T00:00:00-04:00');
assert.equal(liveMorningHistoryPlan['5m'].to, '2026-06-02T10:05:00-04:00');
const julyFirstRollingHistoryPlan = buildScannerHistoryPreloadPlan('2026-07-01', 'morning');
assert.equal(julyFirstRollingHistoryPlan['5m'].from, '2026-06-02T00:00:00-04:00');

const afterMorningCloseHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'morning', '2026-06-02T12:30:00.0000000');
assert.equal(afterMorningCloseHistoryPlan['5m'].to, '2026-06-02T12:00:00-04:00');
const liveEveningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'evening', '2026-06-02T19:05:00.0000000');
assert.equal(liveEveningHistoryPlan['5m'].to, '2026-06-02T19:05:00-04:00');

const ethSessionCoverageBars = Array.from({ length: 6000 }, (_, index) => {
  const first = Date.parse('2026-05-03T18:05:00-04:00');
  const last = Date.parse('2026-06-02T12:00:00-04:00');
  const time = new Date(first + ((last - first) * index) / 5999).toISOString();
  return { time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 };
});
assert.equal(
  barsCoverRequestedLookback(
    ethSessionCoverageBars,
    '2026-05-03T00:00:00-04:00',
    '2026-06-02T12:00:00-04:00',
    '5m',
  ),
  true,
);

await fs.mkdir(auditDir, { recursive: true });
const existingDecisionTapePath = path.join(auditDir, 'scanner-decision-tape-2026-06-03-MES-morning.json');
await fs.writeFile(existingDecisionTapePath, JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  createdAt: '2026-06-03T14:10:00.000Z',
  updatedAt: '2026-06-03T14:10:00.000Z',
  tradeDate: '2026-06-03',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-06-03T10:10:00.0000000': {
      setupCandidateStatus: {
        statuses: [{
          setupType: 'TurtleSoup',
          direction: 'SHORT',
          entry: 7338.25,
          stop: 7360.5,
          target1: 7247,
          target2: 7247,
        }],
      },
    },
  },
}, null, 2));

const decisionTapePath = await writeScannerDecisionTapeAuditLog({
  session: 'morning',
  tradeDate: '2026-06-03',
  instrument: 'MES',
  completed5m: { time: '2026-06-03T10:15:00.0000000', open: 7590, high: 7597, low: 7587, close: 7593, volume: 1000 },
  currentPrice: 7593,
  chartContext: {
    displacementCandles: [{ direction: 'SHORT', time: '2026-06-03T09:45:00.0000000' }],
    liquiditySweeps: [{ direction: 'LONG', level: 7575 }],
    reclaimEvents: [{ direction: 'LONG', level: 7585 }],
    marketStructure: { marketStructureShift: false },
    failedPlanReversal: {
      source: 'ninjatrader_ohlc',
      boundary: 'opposite_side_review_only_not_execution_authority',
      originalPlanDirection: 'LONG',
      oppositeDirection: 'SHORT',
      failedDecisionLevel: 7518,
      failedDecisionLevelRole: 'short_side_resistance',
      failedPlanEvidence: ['Prior long failed below 7518.'],
      htfStackStatus: 'data_limited',
      timeframeConfirmations: [
        { timeframe: '15M', direction: 'SHORT', status: 'confirmed', evidence: ['15M bearish MSS.'] },
        { timeframe: '1H', direction: 'SHORT', status: 'confirmed', evidence: ['1H bearish MSS.'] },
        { timeframe: '2H', direction: 'NEUTRAL', status: 'neutral', evidence: ['2H does not confirm opposite structure.'] },
        { timeframe: '4H', direction: 'UNKNOWN', status: 'data_limited', evidence: ['4H unavailable in this fixture.'] },
        { timeframe: '5M', direction: 'SHORT', status: 'aligned', evidence: ['5M pending retest.'] },
      ],
      fiveMinuteTriggerStatus: 'pending_retest',
      decisionState: 'OPPOSITE_SIDE_RETEST_PENDING',
      freshTriggerRequired: true,
      staleOrNoFreshEntry: false,
      reasons: ['Waiting for clean 5M retest.'],
      blockers: [
        '2H structure is neutral; failed-plan reversal requires 15M, 1H, 2H, and 4H confirmation.',
        '4H structured OHLC is data-limited or unavailable; failed-plan reversal cannot create a candidate.',
      ],
      createsCandidate: false,
      approvesExecution: false,
    },
  },
  candidate: null,
  normalized: {
    decision: 'NO TRADE',
    decisionLabel: 'NO TRADE',
    executionDecision: 'NO TRADE',
    planningDecision: 'WAIT',
    hasConditionalPlans: false,
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    finalConfidence: 'Low',
    whyThisPlan: 'No valid candidate existed first.',
    invalidation: 'N/A',
    source: 'app_rule_engine',
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    setupCandidates: [],
    earlyMoveReview: { status: 'already_triggered_no_fresh_entry', action: 'Context only.' } as any,
  },
  state: 'TriggerPending',
  confidence: {
    score: 0,
    qualifiedReasons: [],
    missingReasons: ['no ICT candidate/reference level'],
    hardBlocker: 'no ICT candidate/reference level',
    recommendation: 'No trade.',
    scorecard: [],
  },
  staleReason: null,
  scannerReviewStatus: 'early_move_review_no_valid_candidate',
  scannerAuditWarnings: ['Early-move review is context only.'],
  alertDecision: { shouldSend: false, reason: 'TriggerPending is logged locally as developing context.' },
  planVersionId: 'MORNING-20260603-101500-TAPE',
  dryRun: true,
  historyCoverage: [],
  auditDir,
});
const decisionTape = JSON.parse(await fs.readFile(decisionTapePath, 'utf8'));
assert.equal(decisionTape.reportType, 'scanner_decision_event_tape');
assert.equal(decisionTape.eventCount, 2);
const repairedHistoricalTapeEvent = decisionTape.events['2026-06-03T10:10:00.0000000'];
assert.equal(repairedHistoricalTapeEvent.setupCandidateStatus.statuses[0].target1, 7305);
assert.equal(repairedHistoricalTapeEvent.setupCandidateStatus.statuses[0].target2, 7293.75);
assert.equal(repairedHistoricalTapeEvent.setupCandidateStatus.statuses[0].targetRepair.source, 'app_entry_stop_r_targets');
assert.equal(repairedHistoricalTapeEvent.setupCandidateStatus.statuses[0].targetRepair.previousTarget1, 7247);
const tapeEvent = decisionTape.events['2026-06-03T10:15:00.0000000'];
assert.equal(tapeEvent.scannerState, 'TriggerPending');
assert.equal(tapeEvent.reviewStatus, 'early_move_review_no_valid_candidate');
assert.equal(tapeEvent.classification.missed, false);
assert.equal(tapeEvent.classification.advisory, true);
assert.equal(tapeEvent.discord.shouldSend, false);
assert.equal(tapeEvent.deskPublishDecision.sourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(tapeEvent.discord.publishDecision.sourceOfTruth, 'scanner_desk_publish_decision');
assert.equal(tapeEvent.deskPublishDecision.approvalBoundary.changesCanExecute, false);
assert.equal(tapeEvent.deskPublishDecision.approvalBoundary.changesTradeApprovals, false);
assert.equal(tapeEvent.facts.displacement.direction, 'SHORT');
const noDisplacementTapePath = await writeScannerDecisionTapeAuditLog({
  session: 'morning',
  tradeDate: '2026-06-04',
  instrument: 'MES',
  completed5m: { time: '2026-06-04T10:15:00.0000000', open: 7590, high: 7597, low: 7587, close: 7593, volume: 1000 },
  currentPrice: 7593,
  chartContext: {
    displacementCandles: [],
    liquiditySweeps: [],
    reclaimEvents: [],
    marketStructure: { marketStructureShift: false },
  },
  candidate: null,
  normalized: {
    decision: 'NO TRADE',
    decisionLabel: 'NO TRADE',
    executionDecision: 'NO TRADE',
    planningDecision: 'WAIT',
    hasConditionalPlans: false,
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    finalConfidence: 'Low',
    whyThisPlan: 'No valid candidate existed first.',
    invalidation: 'N/A',
    source: 'app_rule_engine',
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    setupCandidates: [],
  },
  state: 'TriggerPending',
  confidence: {
    score: 0,
    qualifiedReasons: [],
    missingReasons: ['no ICT candidate/reference level'],
    hardBlocker: 'no ICT candidate/reference level',
    recommendation: 'No trade.',
    scorecard: [],
  },
  staleReason: null,
  scannerReviewStatus: 'no_structured_displacement_fixture',
  scannerAuditWarnings: [],
  alertDecision: { shouldSend: false, reason: 'TriggerPending is logged locally as developing context.' },
  planVersionId: 'MORNING-20260604-101500-TAPE',
  dryRun: true,
  historyCoverage: [],
  auditDir,
});
const noDisplacementTape = JSON.parse(await fs.readFile(noDisplacementTapePath, 'utf8'));
assert.equal(noDisplacementTape.events['2026-06-04T10:15:00.0000000'].facts.displacement.direction, null);
assert.equal(tapeEvent.candidateLifecycleTrace.sourceOfTruth, 'scanner_candidate_lifecycle_trace');
assert.equal(tapeEvent.candidateLifecycleTrace.candidateCount, 0);
assert.equal(tapeEvent.candidateLifecycleTrace.discordDecision.shouldSend, false);
assert.equal(tapeEvent.candidateLifecycleTrace.discordDecision.reason, 'TriggerPending is logged locally as developing context.');
assert.equal(tapeEvent.tradeDecisionMapAudit.sourceOfTruth, 'setup_registry_trade_decision_map_audit');
assert.equal(tapeEvent.tradeDecisionMapAudit.tradingLogicChanged, false);
assert.ok(tapeEvent.tradeDecisionMapAudit.entries.some((entry: any) => entry.setupType === SetupType.TurtleSoup));
assert.equal(tapeEvent.reversalWatch.lines.sourceOfTruth, 'scanner_campaign_exhaustion_reversal_watch_lines');
assert.equal(tapeEvent.reversalWatch.state.sourceOfTruth, 'scanner_campaign_exhaustion_reversal_watch_state');
assert.equal(tapeEvent.reversalWatch.state.approvalBoundary.changesCanExecute, false);
assert.equal(tapeEvent.deskState.sourceOfTruth, 'scanner_desk_state');
assert.equal(tapeEvent.deskState.marketMode, 'watching');
assert.equal(tapeEvent.deskState.visibilityMode, tapeEvent.visibility.visibilityMode);
assert.equal(tapeEvent.deskState.canExecute, false);
assert.equal(tapeEvent.deskState.promotion.sourceOfTruth, 'scanner_desk_state_promotion_path');
assert.equal(tapeEvent.deskState.promotion.approvalBoundary.changesTradeApprovals, false);
assert.equal(tapeEvent.deskState.promotion.approvalBoundary.changesCanExecute, false);
assert.equal(tapeEvent.deskState.promotion.canPromoteNow, false);
assert.equal(tapeEvent.failedPlanReversal.present, true);
assert.equal(tapeEvent.failedPlanReversal.state, 'OPPOSITE_SIDE_RETEST_PENDING');
assert.equal(tapeEvent.failedPlanReversal.htfStackStatus, 'data_limited');
assert.equal(tapeEvent.failedPlanReversal.fiveMinuteTriggerStatus, 'pending_retest');
assert.deepEqual(
  tapeEvent.failedPlanReversal.timeframeConfirmations.map((item: any) => `${item.timeframe}:${item.direction}:${item.status}`),
  ['15M:SHORT:confirmed', '1H:SHORT:confirmed', '2H:NEUTRAL:neutral', '4H:UNKNOWN:data_limited', '5M:SHORT:aligned'],
);
assert.equal(tapeEvent.failedPlanReversal.createsCandidate, false);
assert.equal(tapeEvent.failedPlanReversal.approvesExecution, false);
assert.ok(tapeEvent.failedPlanReversal.blockers.some((item: string) => item.includes('2H structure is neutral')));
assert.ok(tapeEvent.failedPlanReversal.blockers.some((item: string) => item.includes('4H structured OHLC is data-limited')));
assert.equal(tapeEvent.authority.decisionTapeCanExecute, false);
const fourHourCoverageBars = Array.from({ length: 1129 }, (_, index) => {
  const first = Date.parse('2026-05-03T18:05:00-04:00');
  const last = Date.parse('2026-06-02T10:00:00-04:00');
  const time = new Date(first + ((last - first) * index) / 1128).toISOString();
  return { time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 };
});
assert.equal(
  barsCoverRequestedLookback(
    fourHourCoverageBars,
    '2026-05-03T00:00:00-04:00',
    '2026-06-02T12:00:00-04:00',
    '240m',
  ),
  true,
);
assert.equal(
  barsCoverRequestedLookback(
    fourHourCoverageBars.slice(-20),
    '2026-05-03T00:00:00-04:00',
    '2026-06-02T12:00:00-04:00',
    '240m',
  ),
  false,
);

const selfHealedSummary = summarizeScannerHistoryCoverage({
  timeframe: '240m',
  requiredLookbackDays: 30,
  requestedFrom: '2026-05-03T00:00:00-04:00',
  requestedTo: '2026-06-02T12:00:00-04:00',
  barsLoaded: 180,
  rangeStart: '2026-05-03T00:00:00',
  rangeEnd: '2026-06-02T12:00:00',
  source: 'market_bars_bridge_repair',
  cacheBars: 100,
  bridgeRepairBars: 80,
  selfHealed: true,
  sufficient: true,
  warning: null,
});
assert.ok(selfHealedSummary.includes('240m: sufficient'));
assert.ok(selfHealedSummary.includes('source=market_bars_bridge_repair'));
assert.ok(selfHealedSummary.includes('self-healed from bridge'));
const incompleteRepairSummary = summarizeScannerHistoryCoverage({
  timeframe: '120m',
  requiredLookbackDays: 30,
  requestedFrom: '2026-05-03T00:00:00-04:00',
  requestedTo: '2026-06-02T12:00:00-04:00',
  barsLoaded: 20,
  rangeStart: '2026-06-01T00:00:00',
  rangeEnd: '2026-06-02T12:00:00',
  source: 'bridge_repair',
  cacheBars: 0,
  bridgeRepairBars: 20,
  selfHealed: true,
  sufficient: false,
  warning: 'insufficient 120m',
  dataLimitation: {
    status: 'bridge_or_cache_incomplete',
    message: 'Requested 120m bars remain incomplete after cache preload, single bridge repair, and segmented bridge repair. The scanner cannot invent missing NinjaTrader bars; HTF promotion is blocked for this timeframe.',
    retryPolicy: 'cache_then_single_bridge_then_segmented_bridge',
    canInventMissingBars: false,
    htfPromotionAllowed: false,
  },
});
assert.ok(incompleteRepairSummary.includes('120m: insufficient'));
assert.ok(incompleteRepairSummary.includes('cannot invent missing NinjaTrader bars'));
assert.ok(incompleteRepairSummary.includes('HTF promotion is blocked'));
assert.deepEqual(twoHourCoverageDiagnostic([]), {
  timeframe: '120m',
  available: false,
  sufficient: false,
  barsLoaded: 0,
  source: 'not_requested',
  rangeStart: null,
  rangeEnd: null,
  warning: '120M / 2H scanner history was not requested or not reported.',
  candidatePromotionBoundary: 'two_hour_context_required_for_full_confirmation',
});
assert.equal(twoHourCoverageDiagnostic([{
  timeframe: '120m',
  requiredLookbackDays: 30,
  requestedFrom: '2026-05-03T00:00:00-04:00',
  requestedTo: '2026-06-02T12:00:00-04:00',
  barsLoaded: 80,
  rangeStart: '2026-05-03T00:00:00',
  rangeEnd: '2026-06-02T12:00:00',
  source: 'market_bars_bridge_repair',
  cacheBars: 40,
  bridgeRepairBars: 40,
  selfHealed: true,
  sufficient: true,
  warning: null,
}]).sufficient, true);
const sufficientHtfCoverage = htfHistoryCoverageReadiness([
  { timeframe: '15m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 1000, rangeStart: '2026-05-03T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'market_bars', cacheBars: 1000, bridgeRepairBars: 0, selfHealed: false, sufficient: true, warning: null },
  { timeframe: '60m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 500, rangeStart: '2026-05-03T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'market_bars', cacheBars: 500, bridgeRepairBars: 0, selfHealed: false, sufficient: true, warning: null },
  { timeframe: '120m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 250, rangeStart: '2026-05-03T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'market_bars_bridge_repair', cacheBars: 100, bridgeRepairBars: 150, selfHealed: true, sufficient: true, warning: null },
  { timeframe: '240m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 180, rangeStart: '2026-05-03T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'market_bars_bridge_repair', cacheBars: 100, bridgeRepairBars: 80, selfHealed: true, sufficient: true, warning: null },
]);
assert.equal(sufficientHtfCoverage.status, 'sufficient');
assert.deepEqual(sufficientHtfCoverage.insufficientTimeframes, []);
const dataLimitedHtfCoverage = htfHistoryCoverageReadiness([
  { timeframe: '15m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 1000, rangeStart: '2026-05-03T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'market_bars', cacheBars: 1000, bridgeRepairBars: 0, selfHealed: false, sufficient: true, warning: null },
  { timeframe: '60m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 500, rangeStart: '2026-05-03T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'market_bars', cacheBars: 500, bridgeRepairBars: 0, selfHealed: false, sufficient: true, warning: null },
  { timeframe: '120m', requiredLookbackDays: 30, requestedFrom: '2026-05-03T00:00:00-04:00', requestedTo: '2026-06-02T12:00:00-04:00', barsLoaded: 20, rangeStart: '2026-06-01T00:00:00', rangeEnd: '2026-06-02T12:00:00', source: 'bridge_repair', cacheBars: 0, bridgeRepairBars: 20, selfHealed: true, sufficient: false, warning: 'insufficient 120m' },
]);
assert.equal(dataLimitedHtfCoverage.status, 'data_limited');
assert.deepEqual(dataLimitedHtfCoverage.insufficientTimeframes, ['120m', '240m']);
assert.ok(dataLimitedHtfCoverage.summary.includes('context only'));
assert.ok(dataLimitedHtfCoverage.summary.includes('segmented bridge repair'));
assert.ok(dataLimitedHtfCoverage.summary.includes('cannot invent missing NinjaTrader bars'));
const rebuiltFourHourBars = Array.from({ length: 181 }, (_, index) => {
  const time = new Date(Date.UTC(2026, 4, 30, 8 + index * 4, 0, 0));
  const base = 7400 + index * 0.25;
  return {
    time: time.toISOString().slice(0, 19),
    open: base,
    high: base + 2,
    low: base - 2,
    close: base + 1,
    volume: 100 + index,
  };
});
const verifiedFourHourRepair = verifiedFiveMinuteAggregationRepair({
  timeframe: '240m',
  bars: rebuiltFourHourBars,
  requestedFrom: '2026-05-30T09:20:00',
  requestedTo: '2026-06-29T09:20:00',
  bridgeInstrument: 'MES 09-26',
});
assert.ok(verifiedFourHourRepair);
assert.equal(verifiedFourHourRepair.verification.sufficient, true);
const repairedHtfCoverage = htfHistoryCoverageReadiness([
  { timeframe: '15m', requiredLookbackDays: 30, requestedFrom: '2026-05-30T09:20:00', requestedTo: '2026-06-29T09:20:00', barsLoaded: 1906, rangeStart: '2026-05-30T10:00:00', rangeEnd: '2026-06-29T09:15:00', source: 'market_bars_bridge_repair', cacheBars: 0, bridgeRepairBars: 1906, selfHealed: true, sufficient: true, warning: null },
  { timeframe: '60m', requiredLookbackDays: 30, requestedFrom: '2026-05-30T09:20:00', requestedTo: '2026-06-29T09:20:00', barsLoaded: 492, rangeStart: '2026-05-30T10:00:00', rangeEnd: '2026-06-29T09:00:00', source: 'market_bars_bridge_repair', cacheBars: 0, bridgeRepairBars: 492, selfHealed: true, sufficient: true, warning: null },
  { timeframe: '120m', requiredLookbackDays: 30, requestedFrom: '2026-05-30T09:20:00', requestedTo: '2026-06-29T09:20:00', barsLoaded: 274, rangeStart: '2026-05-30T10:00:00', rangeEnd: '2026-06-29T08:00:00', source: 'market_bars_bridge_repair', cacheBars: 0, bridgeRepairBars: 274, selfHealed: true, sufficient: true, warning: null },
  { ...verifiedFourHourRepair.verification, fiveMinuteAggregationRepairBars: rebuiltFourHourBars.length, requiredLookbackDays: 30 },
]);
assert.equal(repairedHtfCoverage.status, 'sufficient');
assert.deepEqual(repairedHtfCoverage.insufficientTimeframes, []);

const failedPlanEvents = appOwnedFailedPlanEventsFromScannerState({
  state: {
    sent: {},
    alertDeliveries: {
      'prior-long': {
        alertKey: 'prior-long',
        planVersionId: 'MORNING-PRIOR-LONG',
        instrument: 'MES',
        tradeDate: '2026-06-05',
        session: 'morning',
        state: 'Executable',
        confidence: 94,
        candidate: {
          setupType: 'FailedBreakoutReversal',
          direction: 'LONG',
          entry: 7518,
          stop: 7511,
          target1: 7528.5,
          target2: 7532,
          activeTimeframeMssRuleset: null,
          activeCampaign: null,
        },
        deliveryStatus: 'sent',
        webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
        httpStatus: 200,
        discordMessageId: 'discord-1',
        error: null,
        attemptedAt: '2026-06-05T14:00:00.000Z',
        sentAt: '2026-06-05T14:00:01.000Z',
        auditLogPath: null,
        stale: false,
        retryEligible: false,
      },
    },
    activeCampaignSent: {},
    watchlistSent: {},
    deskPlaySent: {},
    deskPlanRefreshSent: {},
    reversalWatchSent: {},
    morningHtfDeskMapSent: {},
    endOfDayMarketRecapSent: {},
    liveHoldNoticeSent: {},
    windowStartSent: {},
    dataQualityNoticeSent: {},
    discordCleanupMessages: {},
    lastCompleted5mBySession: {},
    lastMarketMapRefreshBySession: {},
    lastHealthStatus: null,
    lastHealthAlertSentAt: null,
  },
  tradeDate: '2026-06-05',
  session: 'morning',
  instrument: 'MES',
  completed5m: { time: '2026-06-05T10:05:00.0000000', open: 7521, high: 7522, low: 7512.5, close: 7517.25, volume: 1000 },
});
assert.equal(failedPlanEvents.length, 1);
assert.equal(failedPlanEvents[0].direction, 'SHORT');
assert.equal(failedPlanEvents[0].failedLevel, 7518);
assert.ok(failedPlanEvents[0].levelLabel?.includes('app-owned failed plan'));
assert.ok(failedPlanEvents[0].evidence?.includes('App-owned LONG plan'));
assert.ok(failedPlanEvents[0].evidence?.includes('generic failed-break events remain ignored'));

const bearishTimeframe = (timeframe: '5m' | '15m' | '1h' | '2h' | '4h', role: 'execution' | 'liquidity_map' | 'session_structure' | 'macro_context') => ({
  timeframe,
  role,
  barCount: 100,
  high: 7614.75,
  low: 7574,
  open: 7608.5,
  close: 7582.75,
  midpoint: 7594.375,
  rangePoints: 40.75,
  trend: 'bearish' as const,
  candles: [],
  fvgZones: [],
  liquiditySweeps: [],
  reclaimEvents: [],
  failedBreakEvents: [],
  displacementCandles: [{
    direction: 'SHORT' as const,
    candleIndex: 1,
    timestamp: '2026-06-05T10:05:00.0000000',
    open: 7521,
    high: 7522,
    low: 7512.5,
    close: 7517.25,
    bodyPoints: 3.75,
    rangePoints: 9.5,
    breaksStructure: true,
    quality: 'confirmed' as const,
    confidence: 'High' as const,
  }],
  structuralLevels: [],
  confidence: 'High' as const,
  notes: [`${timeframe} bearish MSS/displacement confirms the opposite side.`],
});
const failedPlanChartContext = {
  sessionType: 'morning',
  instrument: 'MES',
  tradeDate: '2026-06-05',
  timeframe: '5m',
  failedBreakEvents: [],
  setupReadyFacts: { notes: [] },
  structureQualityContext: {
    direction: 'SHORT',
    executionTimeframeConfirmed: true,
    structureBreakConfirmedByClose: true,
    wickOnlyBreak: false,
    oldInducementStale: false,
    noChaseRequired: false,
  },
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: bearishTimeframe('4h', 'macro_context'),
    twoHour: bearishTimeframe('2h', 'macro_context'),
    oneHour: bearishTimeframe('1h', 'session_structure'),
    fifteenMinute: bearishTimeframe('15m', 'liquidity_map'),
    fiveMinute: bearishTimeframe('5m', 'execution'),
    alignment: {
      macroBias: 'SHORT',
      sessionBias: 'SHORT',
      liquidityBias: 'SHORT',
      executionBias: 'SHORT',
      alignedDirection: 'SHORT',
      conflicts: [],
      notes: ['Opposite-side bearish stack is aligned.'],
    },
    targetMap: { levelsToWatch: [] },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  },
} as ChartContext;
const failedPlanIntegration = attachFailedPlanReversalContextFromScannerState({
  chartContext: failedPlanChartContext,
  failedPlanEvents,
});
assert.equal(failedPlanIntegration.eventCount, 1);
assert.equal(failedPlanIntegration.chartContext?.failedBreakEvents?.length, 1);
assert.ok(failedPlanIntegration.chartContext?.setupReadyFacts?.notes?.some((note) => note.includes('app-owned failed decision/reclaim level')));
assert.equal(failedPlanIntegration.failedPlanReversal?.originalPlanDirection, 'LONG');
assert.equal(failedPlanIntegration.failedPlanReversal?.oppositeDirection, 'SHORT');
assert.equal(failedPlanIntegration.failedPlanReversal?.failedDecisionLevel, 7518);
assert.equal(failedPlanIntegration.failedPlanReversal?.htfStackStatus, 'full_confirmation');
assert.equal(failedPlanIntegration.failedPlanReversal?.fiveMinuteTriggerStatus, 'confirmed');
assert.equal(failedPlanIntegration.failedPlanReversal?.decisionState, 'FAILED_LONG_TO_BEARISH_MSS_CONFIRMED');
assert.equal(failedPlanIntegration.failedPlanReversal?.createsCandidate, true);
assert.equal(failedPlanIntegration.failedPlanReversal?.approvesExecution, false);
assert.equal(failedPlanIntegration.chartContext?.failedPlanReversal?.approvesExecution, false);

const candles = Array.from({ length: 48 }, (_, index) => {
  const base = index < 16 ? 5328 - index * 0.35 : 5322 + (index - 16) * 0.42;
  const open = base;
  const close = index === 16 ? base - 0.45 : index >= 22 ? base + 0.35 : base + 0.1;
  return {
    index,
    timestamp: `2026-05-26T${String(9 + Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
    open,
    high: Math.max(open, close) + 0.6,
    low: Math.min(open, close) - 0.6,
    close,
    direction: close >= open ? 'bullish' as const : 'bearish' as const,
    confidence: 'High' as const,
  };
});

const chartContext: Partial<ChartContext> = {
  candles,
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'LONG',
    level: candles[16].low + 0.25,
    sweptLevelLabel: 'Sell-side liquidity',
    reclaimed: true,
    timestamp: candles[16].timestamp,
    confidence: 'High',
  }],
  reclaimEvents: [{
    direction: 'LONG',
    reclaimedLevel: candles[16].low + 0.25,
    levelLabel: 'Sell-side liquidity',
    candleIndex: 22,
    timestamp: candles[22].timestamp,
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'LONG',
    candleIndex: 30,
    timestamp: candles[30].timestamp,
    open: candles[30].open,
    high: candles[30].high,
    low: candles[30].low,
    close: candles[30].close,
    bodyPoints: Math.abs(candles[30].close - candles[30].open),
    rangePoints: candles[30].high - candles[30].low,
    confidence: 'High',
  }],
  fvgZones: [{ direction: 'LONG', lower: 5323.25, upper: 5325, midpoint: 5324.125, confidence: 'High' }],
  marketStructure: {
    trend: 'bullish',
    higherHigh: true,
    higherLow: true,
    lowerHigh: false,
    lowerLow: false,
    marketStructureShift: true,
    chopRangeCondition: false,
  },
};

const candidate: SetupCandidate = {
  setupType: SetupType.LiquiditySweep,
  scenarioLabel: 'Liquidity sweep reclaim',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Detected,
  confidence: 'High',
  priority: 90,
  entry: 5324.25,
  stop: 5319.25,
  target1: 5331.75,
  target2: 5334.25,
  riskPoints: 5,
  targetObjectivePlan: {
    targetQuality: 'clear_path',
    targetModel: 'actual_r_with_structural_context',
    objectives: [],
    notes: [],
    liquidityTarget1: {
      label: 'NY premarket high',
      price: 5336,
      direction: 'LONG',
      source: 'ny_premarket',
      type: 'high',
      confidence: 'High',
      score: 88,
      reason: 'Real session liquidity above entry.',
    },
  },
  invalidation: 'Invalid if price loses the protected sweep low.',
  entryClarity: 90,
  stopClarity: 90,
  targetClarity: 90,
  proximityScore: 1,
  levelContextScore: 18,
  evidence: ['HTF MSS support in campaign direction: 60M, 120M.', 'Sweep confirmed', 'Reclaim confirmed', 'Displacement confirmed'],
  missingEvidence: ['Missing reasons should remain audit-only'],
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  requiredTrigger: 'Wait for completed 5M reclaim close above the swept low.',
  nextAction: 'Wait for trigger.',
  reducedRiskPlan: null,
  decisionQualityScore: 86,
  decisionQualityRecommendation: 'Full score detail belongs in audit JSON.',
  decisionQualityScorecard: [
    { label: 'Score breakdown', score: 20, max: 20, status: 'strong', note: 'This must not appear in the Discord main text.' },
  ],
};

const pendingDelivery = createPendingScannerAlertDeliveryRecord({
  alertKey: '2026-06-02|MES|morning|LONG|TurtleSoup|7603.25|Approved',
  planVersionId: 'MORNING-20260602-140348',
  instrument: 'MES',
  tradeDate: '2026-06-02',
  session: 'morning',
  state: 'Approved',
  confidence: 96,
  candidate,
  webhookSource: 'QUANT_DESK_SCANNER_WEBHOOK_URL',
  auditLogPath: path.join(auditDir, 'scanner-delivery-test.json'),
  attemptedAt: '2026-06-02T14:03:48.000Z',
});
assert.equal(pendingDelivery.deliveryStatus, 'pending');
assert.equal(pendingDelivery.retryEligible, true);
assert.equal(pendingDelivery.candidate.entry, candidate.entry);
assert.equal(pendingDelivery.candidate.stop, candidate.stop);
assert.equal(pendingDelivery.candidate.target1, candidate.target1);
assert.equal(pendingDelivery.candidate.target2, candidate.target2);
assert.equal(pendingDelivery.candidate.activeTimeframeMssRuleset?.status, 'not_available');
assert.equal(pendingDelivery.candidate.activeTimeframeMssRuleset?.appliesToAllModels, true);
const sentDelivery = markScannerAlertDeliverySent(pendingDelivery, { sentAt: '2026-06-02T14:03:49.000Z', httpStatus: 204 });
assert.equal(sentDelivery.deliveryStatus, 'sent');
assert.equal(sentDelivery.retryEligible, false);
assert.equal(sentDelivery.httpStatus, 204);
const failedDelivery = markScannerAlertDeliveryFailed(pendingDelivery, {
  error: new Error('Discord webhook failed (401): https://discord.com/api/webhooks/sensitive-token'),
  httpStatus: 401,
});
assert.equal(failedDelivery.deliveryStatus, 'failed');
assert.equal(failedDelivery.retryEligible, true);
assert.equal(failedDelivery.httpStatus, 401);
assert.ok(!failedDelivery.error?.includes('sensitive-token'));
const staleFailedDelivery = markScannerAlertDeliveryFailed(pendingDelivery, { error: 'stale now', stale: true });
assert.equal(staleFailedDelivery.deliveryStatus, 'failed_stale_no_retry');
assert.equal(staleFailedDelivery.retryEligible, false);
const skippedDelivery = markScannerAlertDeliverySkipped(pendingDelivery, { reason: 'dry-run', webhookSource: 'dry_run' });
assert.equal(skippedDelivery.deliveryStatus, 'skipped');
assert.equal(skippedDelivery.retryEligible, false);
const phase11SkippedDelivery = markScannerAlertDeliverySkipped(pendingDelivery, { reason: 'Phase 11B boundary', webhookSource: 'phase11_boundary' });
assert.equal(phase11SkippedDelivery.deliveryStatus, 'skipped');
assert.equal(phase11SkippedDelivery.webhookSource, 'phase11_boundary');
assert.equal(phase11SkippedDelivery.retryEligible, false);

function scannerReadyHealthFixture(): ScannerHealthReport {
  return {
    status: 'READY',
    ready: true,
    canTrustAlerts: true,
    checks: [],
    blockingReasons: [],
    warnings: [],
    summary: 'READY: fixture',
    recommendedAction: 'Fixture.',
    approvalBoundary: {
      healthApprovesTrade: false,
      healthChangesRules: false,
      healthCreatesEntry: false,
      healthCreatesTargets: false,
      healthOverridesScanner: false,
      healthOverridesRisk: false,
    },
  };
}

function phase11BoundaryDeskStateFixture(direction: 'LONG' | 'SHORT' = 'LONG'): DeskState {
  const fixtureCandidate: SetupCandidate = direction === 'LONG'
    ? candidate
    : {
        ...candidate,
        direction: 'SHORT',
        scenarioLabel: 'Liquidity sweep failure',
        entry: 5324.25,
        stop: 5329.25,
        target1: 5316.75,
        target2: 5314.25,
        invalidation: 'Invalid if price reclaims the protected sweep high.',
        requiredTrigger: 'Wait for completed 5M rejection close below the swept high.',
      };
  const visibilityMetadata: ScannerVisibilityMetadata = {
    sourceOfTruth: 'scanner_desk_state_visibility_metadata',
    visibilityMode: 'POST_WATCH',
    discordAction: 'post_watch',
    suppressionReason: null,
    nextTrigger: null,
    dataQualityBlocker: null,
    holdWithReason: null,
    noTradeWithReason: null,
    hasMeaningfulStructuredEvidence: true,
    authority: {
      registeredModel: true,
      activeModel: true,
      watchEligible: true,
      planEligible: false,
      discordEligible: true,
      executionEligible: false,
      humanReviewOnly: true,
      canExecute: false,
    },
    notes: [],
  };
  return buildDeskState({
    state: 'Watching',
    candidate: fixtureCandidate,
    visibilityMetadata,
    candidateLifecycleTrace: buildCandidateLifecycleTrace({
      candidates: [fixtureCandidate],
      selectedCandidate: fixtureCandidate,
      state: 'Watching',
      alertDecision: { shouldSend: true, reason: 'Phase 11B fixture.' },
      canExecute: false,
    }),
    canExecute: false,
  });
}

function highConfidenceConditionalBoundaryDeskStateFixture(): DeskState {
  const highConfidenceCandidate: SetupCandidate = {
    ...candidate,
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    decisionQualityScore: 93,
  };
  const visibilityMetadata: ScannerVisibilityMetadata = {
    sourceOfTruth: 'scanner_desk_state_visibility_metadata',
    visibilityMode: 'POST_CONDITIONAL',
    discordAction: 'post_conditional',
    suppressionReason: null,
    nextTrigger: 'Wait for the named completed 5M condition.',
    dataQualityBlocker: null,
    holdWithReason: null,
    noTradeWithReason: null,
    hasMeaningfulStructuredEvidence: true,
    authority: {
      registeredModel: true,
      activeModel: true,
      watchEligible: true,
      planEligible: true,
      discordEligible: true,
      executionEligible: false,
      humanReviewOnly: true,
      canExecute: false,
    },
    notes: [],
  };
  return buildDeskState({
    state: 'TriggerPending',
    candidate: highConfidenceCandidate,
    visibilityMetadata,
    candidateLifecycleTrace: buildCandidateLifecycleTrace({
      candidates: [highConfidenceCandidate],
      selectedCandidate: highConfidenceCandidate,
      state: 'TriggerPending',
      alertDecision: { shouldSend: true, reason: 'High-confidence conditional fixture.' },
      canExecute: false,
    }),
    canExecute: false,
  });
}

function highConfidenceReviewBoundaryDeskStateFixture(): DeskState {
  const highConfidenceCandidate: SetupCandidate = {
    ...candidate,
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    decisionQualityScore: 92,
  };
  const visibilityMetadata: ScannerVisibilityMetadata = {
    sourceOfTruth: 'scanner_desk_state_visibility_metadata',
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    suppressionReason: null,
    nextTrigger: 'Qualified only if completed 5M proof and app-owned gates remain confirmed.',
    dataQualityBlocker: null,
    holdWithReason: null,
    noTradeWithReason: null,
    hasMeaningfulStructuredEvidence: true,
    authority: {
      registeredModel: true,
      activeModel: true,
      watchEligible: true,
      planEligible: true,
      discordEligible: true,
      executionEligible: false,
      humanReviewOnly: true,
      canExecute: false,
    },
    notes: [],
  };
  const state = buildDeskState({
    state: 'Approved',
    candidate: highConfidenceCandidate,
    visibilityMetadata,
    candidateLifecycleTrace: buildCandidateLifecycleTrace({
      candidates: [highConfidenceCandidate],
      selectedCandidate: highConfidenceCandidate,
      state: 'Approved',
      alertDecision: { shouldSend: true, reason: 'High-confidence review fixture.' },
      canExecute: false,
    }),
    canExecute: false,
  });
  state.promotion.blockedBy = [
    'No chase: non-selected opposite candidate needs new proof.',
    'ChasingExtendedMove',
  ];
  return state;
}

const liveBoundaryWithoutChecklist = buildScannerLiveDiscordSendBoundaryReport({
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: false,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: phase11BoundaryDeskStateFixture(),
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-02-MES-morning.json'),
  auditPath: path.join(auditDir, 'scanner-morning-2026-06-02-MES-PHASE11B.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(liveBoundaryWithoutChecklist.eligible, true);
assert.equal(liveBoundaryWithoutChecklist.blockers.length, 0);
assert.equal(liveBoundaryWithoutChecklist.authorityBoundary.changesCanExecute, false);
assert.equal(liveBoundaryWithoutChecklist.authorityBoundary.createsTradeApproval, false);

for (const direction of ['LONG', 'SHORT'] as const) {
  const freshScannerMapBoundary = buildScannerLiveDiscordSendBoundaryReport({
    config: {
      dryRun: false,
      liveDiscordPolicyConfirmed: false,
    },
    healthReport: scannerReadyHealthFixture(),
    bridgeConnected: true,
    bridgeInstrumentResolved: true,
    completedFiveMinuteFresh: true,
    htfContextPresent: true,
    deskState: phase11BoundaryDeskStateFixture(direction),
    decisionTapePath: path.join(auditDir, `scanner-decision-tape-2026-06-02-MES-${direction}-fresh-map.json`),
    auditPath: path.join(auditDir, `scanner-morning-2026-06-02-MES-${direction}-FRESH-MAP.json`),
    discordPayloadValidated: true,
    webhookConfigured: true,
  });
  assert.equal(freshScannerMapBoundary.eligible, true, `${direction} fresh scanner-owned Discord map should not be blocked by Phase 11 checklist gates`);
  assert.equal(freshScannerMapBoundary.blockers.length, 0);
  assert.equal(freshScannerMapBoundary.authorityBoundary.changesCanExecute, false);
  assert.equal(freshScannerMapBoundary.authorityBoundary.createsTradeApproval, false);
}

const highConfidenceConditionalBoundaryWithoutChecklist = buildScannerLiveDiscordSendBoundaryReport({
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: false,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: highConfidenceConditionalBoundaryDeskStateFixture(),
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-02-MES-morning.json'),
  auditPath: path.join(auditDir, 'scanner-morning-2026-06-02-MES-HIGH-CONFIDENCE-CONDITIONAL.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(highConfidenceConditionalBoundaryWithoutChecklist.eligible, true);
assert.equal(highConfidenceConditionalBoundaryWithoutChecklist.blockers.length, 0);
assert.equal(highConfidenceConditionalBoundaryWithoutChecklist.authorityBoundary.changesCanExecute, false);
assert.equal(highConfidenceConditionalBoundaryWithoutChecklist.authorityBoundary.createsTradeApproval, false);

const highConfidenceReviewBoundaryWithoutChecklist = buildScannerLiveDiscordSendBoundaryReport({
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: false,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: highConfidenceReviewBoundaryDeskStateFixture(),
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-24-MES-morning.json'),
  auditPath: path.join(auditDir, 'scanner-morning-2026-06-24-MES-HIGH-CONFIDENCE-REVIEW.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(highConfidenceReviewBoundaryWithoutChecklist.eligible, true);
assert.equal(highConfidenceReviewBoundaryWithoutChecklist.blockers.length, 0);
assert.equal(highConfidenceReviewBoundaryWithoutChecklist.authorityBoundary.changesCanExecute, false);
assert.equal(highConfidenceReviewBoundaryWithoutChecklist.authorityBoundary.createsTradeApproval, false);

const liveBoundaryWithChecklist = buildScannerLiveDiscordSendBoundaryReport({
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: true,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: phase11BoundaryDeskStateFixture(),
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-02-MES-morning.json'),
  auditPath: path.join(auditDir, 'scanner-morning-2026-06-02-MES-PHASE11B.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(liveBoundaryWithChecklist.eligible, true);
assert.equal(liveBoundaryWithChecklist.blockers.length, 0);
assert.equal(scannerLiveDiscordHoldNoticeEligible(liveBoundaryWithoutChecklist), false);

const deskPlayReviewWithNoChaseContext = {
  ...phase11BoundaryDeskStateFixture('SHORT'),
  visibilityMode: 'POST_REVIEW',
  discordAction: 'post_review',
  suppressionReason: 'SHORT high-quality review map kept local: current price already reached/passed T1.',
  visibilityMetadata: {
    ...phase11BoundaryDeskStateFixture('SHORT').visibilityMetadata,
    visibilityMode: 'POST_REVIEW',
    discordAction: 'post_review',
    suppressionReason: 'SHORT high-quality review map kept local: current price already reached/passed T1.',
    authority: {
      ...phase11BoundaryDeskStateFixture('SHORT').visibilityMetadata.authority,
      planEligible: true,
      discordEligible: true,
      executionEligible: false,
      humanReviewOnly: true,
      canExecute: false,
    },
  },
} satisfies DeskState;
const deskPlayBoundaryWithNoChaseContext = buildScannerLiveDiscordSendBoundaryReport({
  postKind: 'desk_play',
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: true,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: deskPlayReviewWithNoChaseContext,
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-07-01-MES-lunch.json'),
  auditPath: path.join(auditDir, 'scanner-lunch-2026-07-01-MES-DESK-PLAY-NO-CHASE.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(deskPlayBoundaryWithNoChaseContext.eligible, false);
assert.ok(deskPlayBoundaryWithNoChaseContext.blockers.some((item) => item.includes('missed/no-chase')));
assert.equal(scannerLiveDiscordHoldNoticeEligible(deskPlayBoundaryWithNoChaseContext), false);

const tradeAlertWithNoChaseContext = buildScannerLiveDiscordSendBoundaryReport({
  postKind: 'trade_alert',
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: true,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: deskPlayReviewWithNoChaseContext,
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-07-01-MES-lunch.json'),
  auditPath: path.join(auditDir, 'scanner-lunch-2026-07-01-MES-TRADE-ALERT-NO-CHASE.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(tradeAlertWithNoChaseContext.eligible, false);
assert.ok(tradeAlertWithNoChaseContext.blockers.some((item) => item.includes('missed/no-chase')));

const heldDeskState = {
  ...phase11BoundaryDeskStateFixture(),
  visibilityMode: 'HOLD_WITH_REASON',
  discordAction: 'hold',
  suppressionReason: 'missed_no_chase: T1 was already reached before alert generation.',
  visibilityMetadata: {
    ...phase11BoundaryDeskStateFixture().visibilityMetadata,
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    suppressionReason: 'missed_no_chase: T1 was already reached before alert generation.',
    holdWithReason: 'No fresh entry remains. Wait for a new completed 5M retest/hold.',
  },
} satisfies DeskState;
const heldBoundaryWithChecklist = buildScannerLiveDiscordSendBoundaryReport({
  config: {
    dryRun: false,
    liveDiscordPolicyConfirmed: true,
  },
  healthReport: scannerReadyHealthFixture(),
  bridgeConnected: true,
  bridgeInstrumentResolved: true,
  completedFiveMinuteFresh: true,
  htfContextPresent: true,
  deskState: heldDeskState,
  decisionTapePath: path.join(auditDir, 'scanner-decision-tape-2026-06-02-MES-morning.json'),
  auditPath: path.join(auditDir, 'scanner-morning-2026-06-02-MES-PHASE11E-HOLD.json'),
  discordPayloadValidated: true,
  webhookConfigured: true,
});
assert.equal(heldBoundaryWithChecklist.eligible, false);
assert.equal(scannerLiveDiscordHoldNoticeEligible(heldBoundaryWithChecklist), false);
assert.ok(heldBoundaryWithChecklist.blockers.some((item) => item.includes('missed/no-chase')));
const holdNoticePayload = buildScannerLiveHoldNoticePayload({
  tradeDate: '2026-06-02',
  session: 'morning',
  config: scannerDataQualityNoticeConfig,
  windowLabel: 'Morning Setup Scan',
  currentPrice: 7612.25,
  completed5m: { time: '2026-06-02T10:05:00-04:00', open: 7601, high: 7613, low: 7600, close: 7612.25, volume: 1000 },
  deskState: heldDeskState,
  reason: heldDeskState.suppressionReason || 'Held.',
  boundary: heldBoundaryWithChecklist,
  postKind: 'desk_play',
});
const holdNoticeText = flattenDiscordPayloadText(holdNoticePayload);
assert.match(holdNoticeText, /Scanner Hold/);
assert.match(holdNoticeText, /missed_no_chase/);
assert.match(holdNoticeText, /canExecute: false/);
assert.match(holdNoticeText, /Line in the Sand/);
for (const bannedText of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
  assert.ok(!holdNoticeText.includes(bannedText), `hold notice should not include banned active alert text: ${bannedText}`);
}
const holdNoticeStableKey = scannerLiveHoldNoticeKey({
  tradeDate: '2026-06-02',
  instrument: 'MES',
  session: 'morning',
  deskState: heldDeskState,
});
assert.equal(
  holdNoticeStableKey,
  '2026-06-02|MES|morning|live-hold|HOLD_WITH_REASON|hold|LONG|unknown|watching',
);
assert.ok(!holdNoticeStableKey.includes('2026-06-02T10:05:00'), 'hold notice key must not include completed 5M time');
assert.ok(!holdNoticeStableKey.includes('missed_no_chase'), 'hold notice key must not drift when hold reason prose changes');

try {
  await fs.mkdir(auditDir, { recursive: true });
  const missedAuditPath = path.join(auditDir, 'scanner-morning-2026-06-02-MES-MORNING-DELIVERY-MISSED.json');
  await fs.writeFile(missedAuditPath, `${JSON.stringify({
    source: 'live-scanner',
    session: 'morning',
    tradeDate: '2026-06-02',
    instrument: 'MES',
    planVersionId: 'MORNING-DELIVERY-MISSED',
    state: 'Approved',
    candidate: {
      ...candidate,
      setupType: SetupType.TurtleSoup,
      direction: 'LONG',
      entry: 7603.25,
      stop: 7599,
      target1: 7611.75,
      target2: 7620,
    },
    normalizedPlan: {
      canExecute: true,
      decisionStatus: 'ApprovedTrade',
    },
  }, null, 2)}\n`, 'utf8');
  const deliveryState: any = {
    sent: {},
    watchlistSent: {},
    windowStartSent: {},
    discordCleanupMessages: {},
    lastCompleted5mBySession: {},
    lastMarketMapRefreshBySession: {},
    lastHealthStatus: null,
    lastHealthAlertSentAt: null,
  };
  const missed = await findMissedExecutableScannerDeliveries({
    auditDir,
    state: deliveryState,
    tradeDate: '2026-06-02',
    instrument: 'MES',
  });
  assert.equal(missed.length, 1);
  assert.equal(missed[0].deliveryStatus, 'missing');
  assert.equal(missed[0].candidate.entry, 7603.25);
  const recoveredFailedPlanEvents = await appOwnedFailedPlanEventsFromScannerAudits({
    auditDir,
    tradeDate: '2026-06-02',
    session: 'morning',
    instrument: 'MES',
    completed5m: {
      time: '2026-06-02T10:20:00.0000000',
      open: 7601,
      high: 7602,
      low: 7596,
      close: 7598.75,
      volume: 1000,
    },
  });
  assert.equal(recoveredFailedPlanEvents.length, 1);
  assert.equal(recoveredFailedPlanEvents[0].direction, 'SHORT');
  assert.equal(recoveredFailedPlanEvents[0].failedLevel, 7603.25);
  assert.ok(recoveredFailedPlanEvents[0].evidence?.includes('durable live scanner audit'));
  deliveryState.sent[missed[0].alertKey] = { state: 'Approved', confidence: 96, sentAt: '2026-06-02T14:03:49.000Z' };
  const noMissed = await findMissedExecutableScannerDeliveries({
    auditDir,
    state: deliveryState,
    tradeDate: '2026-06-02',
    instrument: 'MES',
  });
  assert.equal(noMissed.length, 0);

  const watchlistResult = await prepareLiveScannerWatchlistAlertArtifacts({
    tradeDate: '2026-05-28',
    instrument: 'MES',
    watchlistKey: '2026-05-28:MES:morning:LONG:morning_continuation_watchlist',
    completed5m: {
      time: '2026-05-28T10:15:00-04:00',
      open: 7540.25,
      high: 7574,
      low: 7535,
      close: 7564.75,
      volume: 1000,
    },
    currentPrice: 7564.75,
    windowLabel: 'Morning Execution Window',
    watchlist: {
      watchlistDetected: true,
      watchlistType: 'morning_continuation_watchlist',
      direction: 'LONG',
      status: 'WATCH_ONLY',
      canExecute: false,
      freshEntryAvailable: false,
      tradeAlertEligible: false,
      reason: 'Strong bullish continuation is developing, but no fresh entry remains under current approved rules.',
      noChaseWarning: true,
      requiredNextCondition: 'Wait for a completed 5M pullback or retest that passes existing approved rules.',
      memoryEligible: true,
      evidence: ['Strong bullish displacement detected after the open.'],
      missingEvidence: ['No safe fresh structure stop is available from this watchlist event.'],
      auditWarnings: ['Advisory only.'],
      approvalBoundary: {
        watchlistApprovesTrade: false,
        watchlistChangesRules: false,
        watchlistCreatesEntry: false,
        watchlistCreatesTargets: false,
        watchlistOverridesScanner: false,
      },
    },
    scannerState: 'Missed',
    bars5m: [{
      time: '2026-05-28T10:10:00-04:00',
      open: 7536.25,
      high: 7540.25,
      low: 7533.5,
      close: 7540.25,
      volume: 1000,
    }, {
      time: '2026-05-28T10:15:00-04:00',
      open: 7540.25,
      high: 7574,
      low: 7535,
      close: 7564.75,
      volume: 1000,
    }],
    auditDir,
  });

  assert.deepEqual(watchlistResult.files, []);
  assert.equal(watchlistResult.payload.components, undefined);
  const watchlistText = flattenDiscordPayloadText(watchlistResult.payload);
  assert.ok(watchlistText.includes('[AM WATCHLIST] MES - LONG DEVELOPING'));
  assert.ok(watchlistText.includes('WATCH ONLY - NO FRESH ENTRY'));
  assert.ok(watchlistText.includes('DO NOT CHASE'));
  assert.ok(!/^Entry:/m.test(watchlistText));
  assert.ok(!/^Stop:/m.test(watchlistText));
  assert.ok(!/^T1:/m.test(watchlistText));
  assert.ok(!/^T2:/m.test(watchlistText));
  assert.ok(!/Approved|Executable|Trade now|Entry confirmed/i.test(watchlistText));
  assert.ok(!JSON.stringify(watchlistResult.payload).includes('Win'));
  assert.ok(!JSON.stringify(watchlistResult.payload).includes('Loss'));
  assert.ok(!JSON.stringify(watchlistResult.payload).includes('Scratch'));
  const watchlistAudit = JSON.parse(await fs.readFile(watchlistResult.auditLogPath, 'utf8'));
  assert.equal(watchlistAudit.source, 'live-scanner-watchlist');
  assert.equal(watchlistAudit.discord.advisoryOnly, true);
  assert.equal(watchlistAudit.discord.tradeAlertEligible, false);
  assert.equal(watchlistAudit.discord.attachmentsGenerated, false);
  assert.equal(watchlistAudit.discord.outcomeButtonsIncluded, false);
  assert.equal(watchlistAudit.discord.ragMemoryWritten, false);
  assert.equal(watchlistAudit.persistence.supabaseRagWriteAttempted, false);
  assert.equal(watchlistAudit.watchlistMemory.record.memoryType, 'watchlist_context');
  assert.equal(watchlistAudit.watchlistMemory.record.canExecute, false);
  assert.equal(watchlistAudit.watchlistMemory.record.tradeAlertEligible, false);
  assert.equal(watchlistAudit.watchlistMemory.record.freshEntryAvailable, false);
  assert.equal(watchlistAudit.watchlistMemory.record.laterValidSetupFormed, null);
  assert.equal(watchlistAudit.watchlistMemory.record.laterSetupType, null);
  assert.equal(watchlistAudit.watchlistMemory.record.laterOutcome, null);
  assert.equal(watchlistAudit.watchlistMemory.record.approvalBoundary.ragMemoryApprovesTrade, false);
  assert.equal(watchlistAudit.watchlistMemory.record.approvalBoundary.ragMemoryChangesRules, false);
  assert.ok(watchlistAudit.watchlistMemory.embeddingText.includes('WATCHLIST CONTEXT ONLY'));
  assert.ok(watchlistAudit.watchlistMemory.embeddingText.includes('not a trade'));
  assert.ok(!('entry' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('stop' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('t1' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('t2' in watchlistAudit.watchlistMemory.record));
  assert.ok(!('tradeResult' in watchlistAudit.watchlistMemory.record));
  assert.equal(watchlistResult.memoryRecord.memoryType, 'watchlist_context');

  const result = await prepareLiveScannerDiscordAlertArtifacts({
    session: 'morning',
    tradeDate: '2026-05-26',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 86,
      qualifiedReasons: ['Fixture qualified reason stays in audit JSON.'],
      missingReasons: ['Fixture missing reason stays in audit JSON.'],
      recommendation: 'Fixture recommendation stays out of main Discord text.',
      hardBlocker: null,
    },
    candidate,
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.ConditionalTrade,
      decision: 'LONG',
      noTradeReason: null,
      invalidation: candidate.invalidation,
      setupCandidates: [candidate],
    } as any,
    chartContext: chartContext as ChartContext,
    currentPrice: 5324.5,
    completed5m: {
      time: candles[30].timestamp!,
      open: candles[30].open,
      high: candles[30].high,
      low: candles[30].low,
      close: candles[30].close,
      volume: 1000,
    },
    scoringTimestamp: candles[30].timestamp!,
    scoringTimestampSource: 'fixture completed 5M candle',
    windowLabel: 'Morning Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['fixture path remains audit-only'],
      targetRoomPoor: false,
      reason: 'Fixture target cascade remains audit-only.',
    },
    alertReason: 'Fixture forced live scanner alert path.',
    planVersionId: 'SCANNER-FIXTURE-TEST',
    outputDir,
    auditDir,
  });

  assert.equal(result.files.length, 2);
  assert.ok(result.chartMarkup);
  assert.ok(result.levelMap);
  assert.match(path.basename(result.levelMap), /level-map/);
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.chartMarkup), { ok: true });
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(result.levelMap), { ok: true });

  const text = flattenDiscordPayloadText(result.payload);
  assert.ok(text.length < 1200, `expected live scanner compact text under 1200 chars, got ${text.length}`);
  assert.ok((result.payload.content?.length || 0) < 2000);
  assert.ok(text.includes('MES Current Desk Plan'));
  assert.ok(text.includes('[AM DESK PLAY] MES - LONG'));
  assert.ok(text.includes('MES Current Desk Ticket'));
  assert.ok(text.includes('Primary: 🐂 LONG'));
  assert.ok(text.includes('Line in the Sand:'));
  assert.ok(text.includes('LONG ABOVE'));
  assert.ok(text.includes('Entry:'));
  assert.ok(text.includes('Stop:'));
  assert.ok(text.includes('T1:'));
  assert.ok(text.includes('T2:'));
  assert.ok(text.includes('Invalid:'));
  assert.ok(text.includes('Human review only.'));
  assert.ok(text.includes('No automated orders.'));
  assert.ok(text.includes('Chart: attached to Discord post.'));
  assert.ok(!text.includes('canExecute'));
  assert.ok(!text.includes('Compact Trade Plan Summary'));
  assert.ok(!text.includes('Plan:'));
  assert.ok(!text.includes('Targets:'));
  assert.ok(text.includes('Trigger:'));
  assert.ok(!text.includes('Memory:'));
  assert.ok(!text.includes('Action:'));
  assert.ok(!text.includes('Details:'));
  assert.ok(!text.includes('HTF Runner Map:'));
  const componentLabels = (result.payload.components || []).flatMap((row: any) => (row.components || []).map((component: any) => component.label));
  assert.deepEqual(componentLabels, ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']);
  assert.ok(!componentLabels.includes('Short Win'));
  assert.ok(!componentLabels.includes('Short Loss'));
  for (const marker of BANNED_ACTIVE_DISCORD_ALERT_TEXT) {
    assert.ok(!text.toLowerCase().includes(marker.toLowerCase()), `live scanner payload leaked old long-form marker: ${marker}`);
  }
  assert.ok(!/Missing rea\.\.\.|Qualified rea\.\.\.|Target casc\.\.\.|Audit det\.\.\.|Counte\.\.\.|Audit detail|\{"/i.test(text));

  const auditText = await fs.readFile(result.auditLogPath, 'utf8');
  const audit = JSON.parse(auditText);
  assert.equal(audit.source, 'live-scanner');
  assert.equal(audit.planVersionId, 'SCANNER-FIXTURE-TEST');
  assert.equal(audit.visibility.sourceOfTruth, 'scanner_desk_state_visibility_metadata');
  assert.equal(audit.visibility.visibilityMode, 'POST_CONDITIONAL');
  assert.equal(audit.visibility.authority.canExecute, false);
  assert.equal(audit.visibility.authority.discordEligible, true);
  assert.equal(audit.candidateLifecycleTrace.sourceOfTruth, 'scanner_candidate_lifecycle_trace');
  assert.equal(audit.candidateLifecycleTrace.candidateCount, 1);
  assert.equal(audit.candidateLifecycleTrace.selectedCandidate.setupType, candidate.setupType);
  assert.equal(audit.candidateLifecycleTrace.discordDecision.shouldSend, true);
  assert.equal(audit.tradeDecisionMapAudit.sourceOfTruth, 'setup_registry_trade_decision_map_audit');
  assert.equal(audit.tradeDecisionMapAudit.tradingLogicChanged, false);
  assert.ok(audit.tradeDecisionMapAudit.entries.some((entry: any) => entry.setupType === candidate.setupType));
  assert.equal(audit.deskState.sourceOfTruth, 'scanner_desk_state');
  assert.equal(audit.deskState.marketMode, 'conditional');
  assert.equal(audit.deskState.visibilityMode, audit.visibility.visibilityMode);
  assert.equal(audit.deskState.canExecute, false);
  assert.equal(audit.deskState.selectedCandidate.setupType, candidate.setupType);
  assert.equal(audit.deskState.promotion.currentStage, 'conditional');
  assert.equal(audit.deskState.promotion.nextStage, 'human_review_ready');
  assert.equal(audit.deskState.promotion.promotionReadiness, 'conditional_waiting_for_review_proof');
  assert.ok(audit.deskState.promotion.requiredProof.includes('Completed 5M hold/retest proof before human-review plan promotion.'));
  assert.equal(audit.deskPublishDecision.sourceOfTruth, 'scanner_desk_publish_decision');
  assert.equal(audit.deskPublishDecision.shouldPost, true);
  assert.equal(audit.deskPublishDecision.direction, 'LONG');
  assert.equal(audit.deskPublishDecision.entry, candidate.entry);
  assert.equal(audit.deskPublishDecision.stop, candidate.stop);
  assert.equal(audit.deskPublishDecision.t1, candidate.target1);
  assert.equal(audit.deskPublishDecision.t2, candidate.target2);
  assert.equal(audit.deskPublishDecision.approvalBoundary.changesCanExecute, false);
  assert.equal(audit.publishDecision.sourceOfTruth, 'scanner_desk_publish_decision');
  assert.equal(shouldPersistScannerAlertToRag(audit.deskState), true);
  assert.equal(audit.attachments.chartMarkup, result.chartMarkup);
  assert.equal(audit.attachments.priceLevelMap, result.levelMap);
  assert.ok(auditText.includes('Fixture target cascade remains audit-only.'));
  assert.ok(!text.includes('Fixture target cascade remains audit-only.'));
  assert.ok(result.auditLogPath.startsWith(auditDir));

  const ragCalls: Array<{ url: string; method: string; body: any }> = [];
  process.env.SUPABASE_URL = 'https://supabase.example';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.DISCORD_RAG_USER_ID = 'user-test';
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    ragCalls.push({
      url: String(url),
      method: String(init?.method || 'GET'),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(init?.method || 'GET') === 'PATCH') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify([{ id: 'rag-row-1' }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    await upsertScannerDiscordAlertRagRecord({
      planVersionId: 'SCANNER-FIXTURE-TEST-RAG',
      session: 'morning',
      tradeDate: '2026-05-26',
      instrument: 'MES',
      analysis: { structuredChartContext: chartContext } as any,
      normalized: {
        canExecute: false,
        decisionStatus: TradeDecisionStatus.ConditionalTrade,
        decision: 'LONG',
        noTradeReason: null,
        invalidation: candidate.invalidation,
        setupCandidates: [candidate],
      } as any,
      candidate,
      visibilityMetadata: audit.visibility,
      candidateLifecycleTrace: audit.candidateLifecycleTrace,
      tradeDecisionMapAudit: audit.tradeDecisionMapAudit,
      deskState: audit.deskState,
      confidence: 86,
    });
    const ragInsert = ragCalls.find((call) => call.method === 'POST');
    assert.equal(ragInsert?.body.trade_result, 'pending');
    assert.equal(ragInsert?.body.outcome, 'no_trade');
    assert.equal(ragInsert?.body.trade_plan_json.deskState.sourceOfTruth, 'scanner_desk_state');
    assert.equal(ragInsert?.body.trade_plan_json.visibility.sourceOfTruth, 'scanner_desk_state_visibility_metadata');
    assert.equal(ragInsert?.body.trade_plan_json.candidateLifecycleTrace.sourceOfTruth, 'scanner_candidate_lifecycle_trace');
    assert.equal(ragInsert?.body.trade_plan_json.tradeDecisionMapAudit.sourceOfTruth, 'setup_registry_trade_decision_map_audit');
    assert.equal(ragInsert?.body.trade_plan_json.tradeDecisionMapAudit.tradingLogicChanged, false);
    assert.equal(ragInsert?.body.trade_plan_json.approvalBoundary.discordOutcomeApprovesTrade, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreOptionalEnv('SUPABASE_URL', previousSupabaseUrl);
    restoreOptionalEnv('SUPABASE_SERVICE_ROLE_KEY', previousSupabaseServiceRoleKey);
    restoreOptionalEnv('DISCORD_RAG_USER_ID', previousDiscordRagUserId);
  }

  const watchCandidate = {
    ...candidate,
    direction: 'SHORT',
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    requiredTrigger: 'Completed 5M close below 7320.25 required before short review.',
    invalidation: 'Invalid if price reclaims 7320.25 on a completed 5M close.',
    executionStatus: ExecutionStatus.Conditional,
  } as SetupCandidate;
  const watchVisibility: ScannerVisibilityMetadata = {
    visibilityMode: 'POST_WATCH',
    discordAction: 'post_watch',
    suppressionReason: null,
    nextTrigger: watchCandidate.requiredTrigger,
    dataQualityBlocker: null,
    holdWithReason: null,
    noTradeWithReason: null,
    hasMeaningfulStructuredEvidence: true,
    sourceOfTruth: 'scanner_desk_state_visibility_metadata',
    authority: {
      registeredModel: true,
      activeModel: true,
      watchEligible: true,
      planEligible: false,
      discordEligible: true,
      executionEligible: false,
      humanReviewOnly: true,
      canExecute: false,
    },
    notes: ['Fixture visibility metadata only.'],
  };
  const watchLifecycleTrace = buildCandidateLifecycleTrace({
    candidates: [watchCandidate],
    selectedCandidate: watchCandidate,
    state: 'Watching',
    alertDecision: { shouldSend: true, reason: 'Fixture forced scanner watch alert path.' },
    canExecute: false,
  });
  const watchDeskState = buildDeskState({
    state: 'Watching',
    candidate: watchCandidate,
    visibilityMetadata: watchVisibility,
    candidateLifecycleTrace: watchLifecycleTrace,
    canExecute: false,
  });
  const watchResult = await prepareLiveScannerDiscordAlertArtifacts({
    session: 'morning',
    tradeDate: '2026-05-26',
    config: { instrument: 'MES' },
    state: 'Watching',
    confidence: {
      score: 78,
      qualifiedReasons: ['Structured watch evidence is present.'],
      missingReasons: ['Full plan proof is still missing.'],
      recommendation: 'Watch only.',
      hardBlocker: null,
    },
    candidate: watchCandidate,
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.Wait,
      decision: 'SHORT',
      noTradeReason: null,
      invalidation: watchCandidate.invalidation,
      setupCandidates: [watchCandidate],
    } as any,
    chartContext: chartContext as ChartContext,
    currentPrice: 7321,
    completed5m: {
      time: candles[30].timestamp!,
      open: candles[30].open,
      high: candles[30].high,
      low: candles[30].low,
      close: candles[30].close,
      volume: 1000,
    },
    scoringTimestamp: candles[30].timestamp!,
    scoringTimestampSource: 'fixture completed 5M candle',
    windowLabel: 'Morning Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['watch fixture path remains audit-only'],
      targetRoomPoor: false,
      reason: 'Watch fixture target cascade remains audit-only.',
    },
    alertReason: 'Fixture forced scanner watch alert path.',
    visibilityMetadata: watchVisibility,
    candidateLifecycleTrace: watchLifecycleTrace,
    deskState: watchDeskState,
    planVersionId: 'SCANNER-WATCH-FIXTURE-TEST',
    outputDir,
    auditDir,
  });
  const watchText = flattenDiscordPayloadText(watchResult.payload);
  assert.equal(watchResult.files.length, 0);
  assert.equal(watchResult.chartMarkup, null);
  assert.equal(watchResult.levelMap, null);
  assert.equal(watchResult.payload.components, undefined);
  assert.ok(watchText.includes('[AM WATCH] MES - SHORT WATCH FORMING'));
  assert.ok(watchText.includes('WATCH - NOT EXECUTION APPROVAL'));
  assert.ok(watchText.includes('Required proof: completed 5M trigger, protected structure stop, target room, and normal app-owned gates.'));
  assert.ok(watchText.includes('Boundary: canExecute=false. This watch does not approve execution.'));
  assert.ok(watchText.includes('No entry, stop, T1, T2, or outcome buttons are included in this watch alert.'));
  assert.ok(!/^Entry:/m.test(watchText));
  assert.ok(!/^Stop:/m.test(watchText));
  assert.ok(!/^T1:/m.test(watchText));
  assert.ok(!/^T2:/m.test(watchText));
  const watchAudit = JSON.parse(await fs.readFile(watchResult.auditLogPath, 'utf8'));
  assert.equal(watchAudit.deskState.visibilityMode, 'POST_WATCH');
  assert.equal(watchAudit.deskState.discordAction, 'post_watch');
  assert.equal(watchAudit.deskState.canExecute, false);
  assert.equal(watchAudit.deskState.promotion.currentStage, 'watch');
  assert.equal(watchAudit.deskState.promotion.nextStage, 'conditional');
  assert.equal(watchAudit.deskState.promotion.promotionReadiness, 'watch_waiting_for_completed_5m');
  assert.ok(watchAudit.deskState.promotion.requiredProof.includes('Completed 5M trigger or retest proof.'));
  assert.equal(watchAudit.deskState.promotion.approvalBoundary.changesEntryStopTargets, false);
  assert.equal(watchAudit.tradeDecisionMapAudit.sourceOfTruth, 'setup_registry_trade_decision_map_audit');
  assert.equal(watchAudit.tradeDecisionMapAudit.tradingLogicChanged, false);
  assert.equal(shouldPersistScannerAlertToRag(watchAudit.deskState), false);

  const deskPlayVisibility: ScannerVisibilityMetadata = {
    visibilityMode: 'HOLD_WITH_REASON',
    discordAction: 'hold',
    suppressionReason: 'Full trade alert suppressed; Desk Play remains visible from scanner-owned state.',
    nextTrigger: 'Completed 5M pullback must hold above 5323.25 and reclaim the retest.',
    dataQualityBlocker: null,
    holdWithReason: 'No executable entry/stop/target approval yet.',
    noTradeWithReason: null,
    hasMeaningfulStructuredEvidence: true,
    sourceOfTruth: 'scanner_desk_state_visibility_metadata',
    authority: {
      registeredModel: true,
      activeModel: true,
      watchEligible: true,
      planEligible: false,
      discordEligible: true,
      executionEligible: false,
      humanReviewOnly: true,
      canExecute: false,
    },
    notes: ['Desk Play fixture visibility metadata only.'],
  };
  const deskPlayCandidate = {
    ...candidate,
    evidence: ['HTF MSS support in campaign direction: 60M, 120M.', ...(candidate.evidence || [])],
  };
  const deskPlayLifecycleTrace = buildCandidateLifecycleTrace({
    candidates: [deskPlayCandidate],
    selectedCandidate: deskPlayCandidate,
    state: 'Conditional',
    alertDecision: { shouldSend: false, reason: 'Full alert suppressed; publish Desk Play context.' },
    canExecute: false,
  });
  const deskPlayState = buildDeskState({
    state: 'Conditional',
    candidate: deskPlayCandidate,
    visibilityMetadata: deskPlayVisibility,
    candidateLifecycleTrace: deskPlayLifecycleTrace,
    canExecute: false,
  });
  const deskPlayNormalized = {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'LONG',
    noTradeReason: 'EntryTriggerPending',
    invalidation: deskPlayCandidate.invalidation,
    setupCandidates: [deskPlayCandidate],
  } as any;
  const contextChartCandidate = candidateForDeskPlayContextChart(deskPlayState, deskPlayNormalized);
  assert.equal(contextChartCandidate?.direction, 'LONG');
  assert.equal(contextChartCandidate?.entry, 5324.25);
  assert.equal(contextChartCandidate?.stop, 5319.25);
  assert.equal(contextChartCandidate?.target1, 5331.75);
  assert.equal(contextChartCandidate?.target2, 5334.25);
  assert.equal(contextChartCandidate?.riskPoints, 5);
  assert.equal(contextChartCandidate?.executionStatus, ExecutionStatus.Conditional);
  assert.equal(contextChartCandidate?.activeRuleset?.htfLineInSand?.affectsExecution, false);
  assert.ok(contextChartCandidate?.scenarioLabel?.includes('Review Planning Levels'));
  assert.ok(!contextChartCandidate?.scenarioLabel?.includes('Conditional Planning Levels'));
  assert.ok(contextChartCandidate?.decisionQualityScorecard?.some((item) => item.label === 'LONG Quality'));
  assert.ok(contextChartCandidate?.decisionQualityScorecard?.some((item) => item.label === 'SHORT Quality'));
  assert.ok(contextChartCandidate?.decisionQualityRecommendation?.includes('Review planning levels only'));
  assert.ok(contextChartCandidate?.missingEvidence?.includes('Desk Play chart shows review-only app-owned planning levels.'));
  const projectedDeskPlayState: typeof deskPlayState = {
    ...deskPlayState,
    primaryDeskPlay: {
      ...deskPlayState.primaryDeskPlay,
      direction: 'LONG' as const,
      lineInSand: 5324.25,
      longAbove: 5324.25,
      longBias: {
        ...deskPlayState.primaryDeskPlay.longBias,
        lineInSand: 5324.25,
      },
      htfProtectedStructureMap: {
        ...deskPlayState.primaryDeskPlay.htfProtectedStructureMap,
        rows: [
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map' as const,
            timeframe: '5M' as const,
            bias: 'BULL' as const,
            currentBias: 'BULL' as const,
            biasChangeLine: 5319.25,
            biasChangeConfirmation: 'close+hold',
            protectedStructure: 5319.25,
            confirmationLine: 5324.25,
            target: 5334.25,
            targetLabel: 'App T2 5334.25',
            confidence: 75,
            status: 'confirmed_mss',
            note: 'protected 5319.25; confirm 5324.25; target 5334.25',
          },
        ],
      },
    },
  };
  const projectedContextChartCandidate = candidateForDeskPlayContextChart(projectedDeskPlayState, {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: 'EntryTriggerPending',
    invalidation: deskPlayCandidate.invalidation,
    setupCandidates: [],
  } as any);
  assert.equal(projectedContextChartCandidate?.direction, 'LONG');
  assert.equal(projectedContextChartCandidate?.entry, 5324.25);
  assert.equal(projectedContextChartCandidate?.stop, 5319.25);
  assert.equal(projectedContextChartCandidate?.target1, 5331.75);
  assert.equal(projectedContextChartCandidate?.target2, 5334.25);
  assert.equal(projectedContextChartCandidate?.executionStatus, ExecutionStatus.Conditional);
  assert.ok(projectedContextChartCandidate?.decisionQualityRecommendation?.includes('Review planning levels only'));
  assert.ok(projectedContextChartCandidate?.missingEvidence?.includes('Desk Play chart shows review-only app-owned planning levels.'));
  const unarmedShortChartState: typeof deskPlayState = {
    ...deskPlayState,
    primaryDeskPlay: {
      ...deskPlayState.primaryDeskPlay,
      direction: 'SHORT' as const,
      lineInSand: 7540,
      shortBelow: 7540,
      longAbove: 7580.25,
      nextTrigger: 'Completed 5M close below 7540.00 required before short continuation is active.',
      noChase: 'No chase: wait for a completed 5M close below 7540.00.',
      shortBias: {
        ...deskPlayState.primaryDeskPlay.shortBias,
        state: 'primary' as const,
        lineInSand: 7540,
        decisionQualityScore: 90,
      },
      longBias: {
        ...deskPlayState.primaryDeskPlay.longBias,
        state: 'secondary' as const,
        lineInSand: 7580.25,
      },
    },
  };
  const unarmedShortContextChartCandidate = candidateForDeskPlayContextChart(unarmedShortChartState, {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'SHORT',
    entry: 7539.5,
    stop: 7561,
    t1: 7507.25,
    t2: 7496.5,
    riskPoints: 21.5,
    noTradeReason: 'EntryTriggerPending',
    setupCandidates: [],
  } as any, 7542.25);
  assert.equal(unarmedShortContextChartCandidate?.direction, 'SHORT');
  assert.equal(unarmedShortContextChartCandidate?.entry, null);
  assert.equal(unarmedShortContextChartCandidate?.stop, null);
  assert.equal(unarmedShortContextChartCandidate?.target1, null);
  assert.equal(unarmedShortContextChartCandidate?.target2, null);
  assert.ok(unarmedShortContextChartCandidate?.scenarioLabel?.includes('Watch Only'));
  assert.ok(unarmedShortContextChartCandidate?.decisionQualityRecommendation?.includes('No short plan yet. Current 7542.25 is above the line 7540.00'));
  assert.ok(unarmedShortContextChartCandidate?.missingEvidence?.some((item) => item.includes('No short plan yet. Current 7542.25 is above the line 7540.00')));
  const unarmedShortChartHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext as ChartContext,
    candidate: unarmedShortContextChartCandidate as SetupCandidate,
    instrument: 'MES',
    tradeDate: '2026-07-07',
    sessionLabel: 'morning',
    renderMode: 'desk_play_context',
    contextLine: 7540,
    contextLabel: 'Line in the sand',
  });
  assert.ok(unarmedShortChartHtml.includes('[AM PREP] MES - WAIT / CONFLICT'));
  assert.ok(unarmedShortChartHtml.includes('WATCH ONLY'));
  assert.ok(unarmedShortChartHtml.includes('Action: wait for clean 5M invalidation'));
  assert.ok(unarmedShortChartHtml.includes('WATCH / CONTEXT CHART ONLY'));
  assert.ok(unarmedShortChartHtml.includes('Line in the sand'));
  assert.ok(!unarmedShortChartHtml.includes('REVIEW ENTRY ZONE'));
  assert.ok(!unarmedShortChartHtml.includes('Entry Zone:'));
  assert.ok(!unarmedShortChartHtml.includes('T1: <tspan'));
  assert.ok(!unarmedShortChartHtml.includes('T2: <tspan'));
  const selectedCandidateDeskPlayChartCandidate = candidateForDeskPlayContextChart(deskPlayState, {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: NoTradeReason.EntryTriggerPending,
    setupCandidates: [],
  } as any, 5325, deskPlayCandidate);
  assert.equal(selectedCandidateDeskPlayChartCandidate?.direction, 'LONG');
  assert.equal(selectedCandidateDeskPlayChartCandidate?.entry, 5324.25);
  assert.equal(selectedCandidateDeskPlayChartCandidate?.stop, 5319.25);
  assert.equal(selectedCandidateDeskPlayChartCandidate?.target1, 5331.75);
  assert.equal(selectedCandidateDeskPlayChartCandidate?.target2, 5334.25);
  const selectedCandidateDeskPlayChartHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext as ChartContext,
    candidate: selectedCandidateDeskPlayChartCandidate as SetupCandidate,
    instrument: 'MES',
    tradeDate: '2026-07-08',
    sessionLabel: 'morning',
    renderMode: 'desk_play_context',
    contextLine: 5324.25,
    contextLabel: 'Line in the sand',
  });
  assert.ok(selectedCandidateDeskPlayChartHtml.includes('REVIEW ONLY'));
  assert.ok(selectedCandidateDeskPlayChartHtml.includes('Entry Zone: <tspan fill="#4ade80">'));
  assert.ok(selectedCandidateDeskPlayChartHtml.includes('Stop: <tspan fill="#ef4444">5319.25</tspan>'));
  assert.ok(selectedCandidateDeskPlayChartHtml.includes('T1: <tspan fill="#facc15">5331.75'));
  assert.ok(selectedCandidateDeskPlayChartHtml.includes('T2: <tspan fill="#facc15">5334.25'));
  assert.ok(!selectedCandidateDeskPlayChartHtml.includes('No entry / stop / T1 / T2'));
  const deskPlayResult = await prepareLiveScannerDeskPlayAlertArtifacts({
    session: 'lunch',
    tradeDate: '2026-05-26',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 81,
      qualifiedReasons: ['Desk Play context fixture.'],
      missingReasons: ['No executable plan approval yet.'],
      recommendation: 'Watch only.',
      hardBlocker: null,
    },
    normalized: deskPlayNormalized,
    candidate: deskPlayCandidate,
    chartContext: chartContext as ChartContext,
    currentPrice: 5325,
    windowLabel: 'Lunch/PM Setup Scanner',
    planVersionId: 'SCANNER-DESK-PLAY-FIXTURE',
    deskState: deskPlayState,
    decisionTapePath: path.join(auditDir, 'desk-play-decision-tape.json'),
    outputDir,
  });
  const deskPlayText = flattenDiscordPayloadText(deskPlayResult.payload);
  assert.equal(deskPlayResult.files.length, 2);
  assert.ok(deskPlayResult.chartMarkup);
  assert.ok(deskPlayResult.levelMap);
  assert.deepEqual(
    (deskPlayResult.payload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)),
    ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed'],
  );
  assert.ok(deskPlayText.includes('[PM DESK PLAY] MES - LONG REVIEW'));
  assert.ok(deskPlayText.includes('MES Current Desk Plan'));
  assert.ok(deskPlayText.includes('Primary: LONG above 5324.25 | Current 5325.00'));
  assert.ok(deskPlayText.includes('HTF:'));
  assert.ok(deskPlayText.includes('Line in the Sand: 5324.25'));
  assert.ok(deskPlayText.includes('Trigger: 5M close above 5324.25'));
  assert.ok(deskPlayText.includes('Trade Plan:'));
  assert.ok(deskPlayText.includes('Entry: 5324.25'));
  assert.ok(deskPlayText.includes('Stop: 5319.25 | Protected 5M swing: 5319.25'));
  assert.ok(deskPlayText.includes('T1: 5331.75 | T2: 5334.25'));
  assert.ok(deskPlayText.includes('Invalid:'));
  assert.ok(deskPlayText.includes('Status: review only;'));
  assert.ok(deskPlayText.includes('No automated orders.'));
  assert.ok(!deskPlayText.includes('Overall play:'));
  assert.ok(!deskPlayText.includes('Decision class:'));
  assert.ok(!deskPlayText.includes('Next trigger:'));
  assert.ok(deskPlayText.length < 1200, `expected Desk Play payload under actionable compact target, got ${deskPlayText.length}`);
  const canonicalDeskPublishDecision: DeskPublishDecision = {
    sourceOfTruth: 'scanner_desk_publish_decision' as const,
    action: 'POST_CONDITIONAL' as const,
    discordAction: 'post_conditional' as const,
    shouldPost: true,
    reason: 'Regression fixture: canonical artifact agreement.',
    displaySource: 'desk_ticket' as const,
    candidateKey: deskPlayState.deskTicket.sourceCandidateKey,
    direction: 'LONG' as const,
    setupType: null,
    lineInSand: 5324.25,
    triggerCondition: 'Completed 5M close above 5324.25.',
    entry: 5324.25,
    stop: 5319.25,
    t1: 5331.75,
    t2: 5334.25,
    invalidation: 5319.25,
    invalidationText: 'Invalid below 5319.25.',
    hasCompletePlan: true,
    humanReviewOnly: true,
    canExecute: false,
    noChaseState: false,
    htfContextStatus: 'sufficient' as const,
    dataQualityStatus: 'ok' as const,
    discordReason: 'Regression fixture: canonical artifact agreement.',
    managementWarnings: [],
    driftBlocker: null,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
  };
  const nullLevelCanonicalChartCandidate = candidateForDeskPublishDecisionChart(canonicalDeskPublishDecision, {
    ...deskPlayCandidate,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
  });
  assert.equal(nullLevelCanonicalChartCandidate?.entry, 5324.25);
  assert.equal(nullLevelCanonicalChartCandidate?.stop, 5319.25);
  assert.equal(nullLevelCanonicalChartCandidate?.target1, 5331.75);
  assert.equal(nullLevelCanonicalChartCandidate?.target2, 5334.25);
  const canonicalLineDeskPlayResult = await prepareLiveScannerDeskPlayAlertArtifacts({
    session: 'lunch',
    tradeDate: '2026-05-26',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 81,
      qualifiedReasons: ['Desk Play context fixture.'],
      missingReasons: ['No executable plan approval yet.'],
      recommendation: 'Watch only.',
      hardBlocker: null,
    },
    normalized: deskPlayNormalized,
    candidate: deskPlayCandidate,
    chartContext: chartContext as ChartContext,
    currentPrice: 5325,
    windowLabel: 'Lunch/PM Setup Scanner',
    planVersionId: 'SCANNER-DESK-PLAY-CANONICAL-LINE-FIXTURE',
    deskState: {
      ...deskPlayState,
      primaryDeskPlay: {
        ...deskPlayState.primaryDeskPlay,
        activeTacticalLine: {
          sourceOfTruth: 'scanner_active_tactical_line',
          direction: 'LONG',
          originalLine: 5310,
          activeLine: 5310,
          migrated: true,
          supportingTimeframes: ['15M', '5M'],
          reason: 'Stale migrated tactical line fixture.',
          nextTrigger: 'Stale migrated tactical line fixture.',
          standDown: 'Stand down fixture.',
          approvalBoundary: {
            changesTradeApprovals: false,
            changesCanExecute: false,
            changesEntryStopTargets: false,
          },
        },
      },
    },
    publishDecision: canonicalDeskPublishDecision,
    decisionTapePath: path.join(auditDir, 'desk-play-canonical-line-decision-tape.json'),
    outputDir,
  });
  assert.equal(canonicalLineDeskPlayResult.files.length, 2);
  const canonicalLineDeskPlayText = flattenDiscordPayloadText(canonicalLineDeskPlayResult.payload);
  assert.ok(canonicalLineDeskPlayText.includes('5324.25'));
  assert.ok(!canonicalLineDeskPlayText.includes('5310'));
  const canonicalOverrideResult = await prepareLiveScannerDeskPlayAlertArtifacts({
      session: 'lunch',
      tradeDate: '2026-05-26',
      config: { instrument: 'MES' },
      state: 'Conditional',
      confidence: {
        score: 81,
        qualifiedReasons: ['Desk Play context fixture.'],
        missingReasons: ['No executable plan approval yet.'],
        recommendation: 'Watch only.',
        hardBlocker: null,
      },
      normalized: deskPlayNormalized,
      candidate: deskPlayCandidate,
      chartContext: chartContext as ChartContext,
      currentPrice: 5325,
      windowLabel: 'Lunch/PM Setup Scanner',
      planVersionId: 'SCANNER-DESK-PLAY-MISMATCH-FIXTURE',
      deskState: deskPlayState,
      publishDecision: {
        ...canonicalDeskPublishDecision,
        reason: 'Regression fixture: force mismatch guard.',
        t1: 5332,
        discordReason: 'Regression fixture: force mismatch guard.',
      },
      decisionTapePath: path.join(auditDir, 'desk-play-mismatch-decision-tape.json'),
      outputDir,
  });
  const canonicalOverrideText = flattenDiscordPayloadText(canonicalOverrideResult.payload);
  assert.ok(canonicalOverrideText.includes('T1: 5332.00'));
  const staleMigratedShortDeskPlayState: typeof deskPlayState = {
    ...deskPlayState,
    htfContextStatus: 'sufficient',
    dataQualityStatus: 'ready',
    canExecute: false,
    primaryDeskPlay: {
      ...deskPlayState.primaryDeskPlay,
      direction: 'SHORT' as const,
      lineInSand: 7549.5,
      longAbove: 7553.25,
      shortBelow: 7549.5,
      levelTransition: {
        sourceOfTruth: 'scanner_level_transition_map',
        targetReactionLevel: 7551.25,
        targetReactionLabel: 'Battle zone',
        longAbove: 7553.25,
        shortBelow: 7549.5,
        targetManagementInstruction: 'Wait for completed 5M close outside 7549.50-7553.25.',
      },
      activeTacticalLine: {
        direction: 'SHORT' as const,
        activeLine: 7580.25,
        originalLine: 7549.5,
        migrated: true,
        nextTrigger: 'Active line 7580.25: completed 5M hold/retest below required before fresh execution consideration.',
        standDown: 'Fresh SHORT stand down on completed 5M acceptance above 7580.25.',
      },
      longBias: {
        ...deskPlayState.primaryDeskPlay.longBias,
        lineInSand: 7553.25,
      },
      shortBias: {
        ...deskPlayState.primaryDeskPlay.shortBias,
        lineInSand: 7549.5,
      },
      htfProtectedStructureMap: {
        ...deskPlayState.primaryDeskPlay.htfProtectedStructureMap,
        reliability: 'structural',
        rows: [
          {
            sourceOfTruth: 'scanner_htf_protected_structure_map' as const,
            timeframe: '5M' as const,
            bias: 'BEAR' as const,
            currentBias: 'BEAR' as const,
            biasChangeLine: 7553.25,
            biasChangeConfirmation: 'close+hold',
            protectedStructure: 7553.25,
            confirmationLine: 7549.5,
            target: 7541.25,
            targetLabel: 'App T2 7541.25',
            confidence: 73,
            status: 'confirmed_mss',
            note: 'battle zone 7549.50-7553.25; prior migrated short line 7580.25 is left behind',
          },
        ],
      },
    },
  } as any;
  const staleMigratedShortCandidate = {
    ...deskPlayCandidate,
    direction: 'SHORT' as const,
    entry: 7548.75,
    stop: 7552.5,
    target1: 7543.25,
    target2: 7541.25,
    riskPoints: 3.75,
    requiredTrigger: 'Completed 5M close below 7549.50.',
  };
  const staleMigratedShortResult = await prepareLiveScannerDeskPlayAlertArtifacts({
    session: 'evening',
    tradeDate: '2026-07-07',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 78,
      qualifiedReasons: ['Desk Play stale migrated line regression fixture.'],
      missingReasons: ['Fresh retest proof required.'],
      recommendation: 'Wait.',
      hardBlocker: null,
    },
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.Wait,
      decision: 'NO TRADE',
      noTradeReason: NoTradeReason.EntryTriggerPending,
      invalidation: staleMigratedShortCandidate.invalidation,
      setupCandidates: [staleMigratedShortCandidate],
    } as any,
    chartContext: chartContext as ChartContext,
    currentPrice: 7551.25,
    windowLabel: 'Evening Setup Scanner',
    planVersionId: 'SCANNER-DESK-PLAY-STALE-MIGRATED-SHORT',
    deskState: staleMigratedShortDeskPlayState,
    decisionTapePath: path.join(auditDir, 'desk-play-stale-migrated-decision-tape.json'),
    outputDir,
  });
  const staleMigratedShortText = flattenDiscordPayloadText(staleMigratedShortResult.payload);
  assert.ok(staleMigratedShortText.includes('[EVENING DESK PLAY] MES - WAIT / SHORT NO CHASE'));
  assert.ok(staleMigratedShortText.includes('Primary: WAIT / battle zone 7549.50-7553.25 | Current 7551.25'));
  assert.ok(staleMigratedShortText.includes('Line in the Sand: 7549.50-7553.25'));
  assert.ok(staleMigratedShortText.includes('Trigger: completed 5M close outside 7549.50-7553.25'));
  assert.ok(staleMigratedShortText.includes('Prior SHORT line: 7580.25 already left; no chase.'));
  assert.ok(staleMigratedShortText.includes('LONG ABOVE 7553.25'));
  assert.ok(staleMigratedShortText.includes('SHORT BELOW 7549.50'));
  assert.ok(staleMigratedShortText.includes('WATCH ONLY:'));
  assert.ok(staleMigratedShortText.includes('Stop: no priced stop yet'));
  assert.ok(staleMigratedShortText.includes('Protected 5M swing: not confirmed'));
  assert.ok(staleMigratedShortText.includes('T1/T2: use mapped zones until priced stop confirms'));
  assert.ok(!staleMigratedShortText.includes('Primary: SHORT below 7580.25'));
  assert.ok(!staleMigratedShortText.includes('Line: 7580.25 | Trigger: 5M close below 7580.25'));
  const deskPlayRagCalls: Array<{ url: string; method: string; body: any }> = [];
  process.env.SUPABASE_URL = 'https://supabase.example/rest/v1';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
  process.env.DISCORD_RAG_USER_ID = 'user-test';
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    deskPlayRagCalls.push({
      url: String(url),
      method: String(init?.method || 'GET'),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(init?.method || 'GET') === 'PATCH') {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify([{ id: 'desk-play-rag-row-1' }]), { status: 201, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  try {
    await upsertScannerDiscordAlertRagRecord({
      planVersionId: 'SCANNER-DESK-PLAY-RAG-FIXTURE',
      session: 'evening',
      tradeDate: '2026-06-14',
      instrument: 'MES',
      analysis: { structuredChartContext: chartContext } as any,
      normalized: {
        canExecute: false,
        decisionStatus: TradeDecisionStatus.Wait,
        decision: 'LONG',
        noTradeReason: 'EntryTriggerPending',
        invalidation: deskPlayCandidate.invalidation,
        setupCandidates: [deskPlayCandidate],
      } as any,
      candidate: {
        ...contextChartCandidate,
        stop: null,
        target1: null,
        target2: null,
        riskPoints: null,
      } as SetupCandidate,
      visibilityMetadata: deskPlayVisibility,
      candidateLifecycleTrace: deskPlayLifecycleTrace,
      deskState: deskPlayState,
      confidence: 81,
    });
    const deskPlayRagInsert = deskPlayRagCalls.find((call) => call.method === 'POST');
    assert.equal(deskPlayRagInsert?.body.session_type, 'evening');
    assert.equal(deskPlayRagInsert?.body.trade_date, '2026-06-14');
    assert.equal(deskPlayRagInsert?.body.trade_result, 'pending');
    assert.equal(deskPlayRagInsert?.body.outcome, 'no_trade');
    assert.equal(deskPlayRagInsert?.body.stop_price, null);
    assert.equal(deskPlayRagInsert?.body.target_1_price, null);
    assert.equal(deskPlayRagInsert?.body.target_2_price, null);
    assert.equal(deskPlayRagInsert?.body.trade_plan_json.approvalBoundary.discordOutcomeApprovesTrade, false);
    assert.equal(deskPlayRagInsert?.body.trade_plan_json.approvalBoundary.ragSaveApprovesTrade, false);
  } finally {
    globalThis.fetch = originalFetch;
    restoreOptionalEnv('SUPABASE_URL', previousSupabaseUrl);
    restoreOptionalEnv('SUPABASE_SERVICE_ROLE_KEY', previousSupabaseServiceRoleKey);
    restoreOptionalEnv('DISCORD_RAG_USER_ID', previousDiscordRagUserId);
  }
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(deskPlayResult.chartMarkup), { ok: true });
  assert.deepEqual(await verifyApprovedDailyTradePlanRender(deskPlayResult.levelMap), { ok: true });
  const deskPlayChartHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext as ChartContext,
    candidate: contextChartCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-26',
    sessionLabel: 'lunch',
    renderMode: 'desk_play_context',
    contextLine: deskPlayState.primaryDeskPlay.lineInSand,
    contextLabel: 'Line in the sand',
  });
  assert.ok(deskPlayChartHtml.includes('[PM PREP] MES - LONG DESK MAP'));
  assert.ok(deskPlayChartHtml.includes('REVIEW ONLY'));
  assert.ok(deskPlayChartHtml.includes('REVIEW ENTRY ZONE'));
  assert.ok(deskPlayChartHtml.includes('Desk Map - Review Levels'));
  assert.ok(deskPlayChartHtml.includes('Action: wait for completed 5M proof'));
  assert.ok(deskPlayChartHtml.includes('REVIEW LEVELS'));
  assert.ok(deskPlayChartHtml.includes('DESK READINESS'));
  assert.ok(deskPlayChartHtml.includes('PREP / REVIEW ONLY - NOT EXECUTION APPROVAL'));
  assert.ok(deskPlayChartHtml.includes('Map Side: <tspan fill="#f8fafc">'));
  assert.ok(deskPlayChartHtml.includes('Map Role: <tspan fill="#f8fafc">chart map under review</tspan>'));
  assert.ok(deskPlayChartHtml.includes('Opposing Side: <tspan fill="#f8fafc">'));
  assert.ok(deskPlayChartHtml.includes('Opposing Role: <tspan fill="#f8fafc">context only - not direction</tspan>'));
  assert.ok(deskPlayChartHtml.includes('Conflict: <tspan fill="'));
  assert.ok(deskPlayChartHtml.includes('Execution: <tspan fill="#facc15">Review only / canExecute=false</tspan>'));
  assert.ok(deskPlayChartHtml.includes('Readiness: <tspan fill="#f8fafc">'));
  assert.ok(deskPlayChartHtml.includes('HTF Context: <tspan fill="#f8fafc">'));
  assert.ok(!deskPlayChartHtml.includes('Confidence: <tspan fill="#f8fafc">'));
  assert.ok(deskPlayChartHtml.includes('Next: <tspan fill="#f8fafc">completed 5M proof</tspan>'));
  const longPullbackClarifierHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext as ChartContext,
    candidate: {
      ...contextChartCandidate,
      direction: 'LONG',
      entry: 7557.5,
      stop: 7551.75,
      target1: 7566.125,
      target2: 7569,
    },
    instrument: 'MES',
    tradeDate: '2026-07-06',
    sessionLabel: 'lunch',
    renderMode: 'desk_play_context',
    contextLine: 7563.5,
    contextLabel: 'Line in the sand',
  });
  assert.ok(longPullbackClarifierHtml.includes('[PM PREP] MES - LONG DESK MAP'));
  assert.ok(!longPullbackClarifierHtml.includes('[PM PREP] MES - LONG FAILED'));
  assert.ok(!longPullbackClarifierHtml.includes('SHORT Watch - Not A Trade Plan'));
  assert.ok(longPullbackClarifierHtml.includes('No short plan. 7557.50 is the LONG pullback review entry zone.'));
  assert.ok(longPullbackClarifierHtml.includes('Short requires completed 5M bearish invalidation below the active long structure.'));
  assert.ok(longPullbackClarifierHtml.includes('No short plan. 7557.50 is the LONG'));
  assert.ok(longPullbackClarifierHtml.includes('pullback review entry zone.'));
  assert.ok(longPullbackClarifierHtml.includes('Short requires completed 5M bearish'));
  assert.ok(longPullbackClarifierHtml.includes('invalidation below the active long structure.'));
  assert.equal(typeof deskPlayState.primaryDeskPlay.lineInSand, 'number');
  assert.ok(deskPlayChartHtml.includes('risk-chip-label">Line</text>'));
  assert.ok(deskPlayChartHtml.includes('risk-chip-label">Risk</text>'));
  assert.ok(deskPlayChartHtml.includes('risk-chip-label">Entry</text>'));
  assert.ok(deskPlayChartHtml.includes('risk-chip-label">Stop</text>'));
  assert.ok(!deskPlayChartHtml.includes('Trade levels:'));
  assert.ok(!deskPlayChartHtml.includes('Desk Play line in the sand missing'));
  assert.ok(!deskPlayChartHtml.includes('trigger + canExecute'));
  assert.ok(!deskPlayChartHtml.includes('trigger + approval gates'));
  assert.ok(!deskPlayChartHtml.includes('conditional planning only'));
  assert.ok(!deskPlayChartHtml.includes('CONDITIONAL ENTRY ZONE'));
  assert.ok(!deskPlayChartHtml.includes('Desk Play - Conditional Levels'));
  assert.ok(!deskPlayChartHtml.includes('CONDITIONAL LEVELS'));
  assert.ok(!deskPlayChartHtml.includes('CONDITIONAL DESK PLAN ONLY'));
  assert.ok(deskPlayChartHtml.includes('5331.75'));
  assert.ok(deskPlayChartHtml.includes('5334.25'));

  const executableLookingCandidate = {
    ...candidate,
    executionStatus: ExecutionStatus.Executable,
    detectedStatus: SetupCandidateStatus.Detected,
  };
  const demotedVisualCandidate = candidateForNormalizedVisualAuthority(executableLookingCandidate, {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    noTradeReason: null,
    invalidation: candidate.invalidation,
    whyThisPlan: 'Candidate idea detected, but normalized plan is not executable.',
  } as any);
  assert.equal(demotedVisualCandidate?.executionStatus, ExecutionStatus.Conditional);
  assert.equal(demotedVisualCandidate?.detectedStatus, SetupCandidateStatus.Conditional);
  const demotedChartHtml = buildChartMarkupHtmlForTest({
    chartContext: chartContext as ChartContext,
    candidate: demotedVisualCandidate,
    instrument: 'MES',
    tradeDate: '2026-05-26',
    sessionLabel: 'morning',
  });
  assert.ok(demotedChartHtml.includes('[AM REVIEW] MES - LONG'));
  assert.equal(/LONG EXECUTABLE|>EXECUTABLE</i.test(demotedChartHtml), false);

  const riskTooWideCandidate: SetupCandidate = {
    ...candidate,
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Turtle Soup LONG',
    entry: 7597,
    stop: 7588.75,
    target1: 7620,
    target2: 7620,
    riskPoints: 8.25,
    blockReason: 'RiskTooWide' as any,
    requiredTrigger: 'Wait for a fresh completed 5M retest that keeps risk inside limits.',
    nextAction: 'Manual decision only. Do not chase the reclaim candle.',
    evidence: ['HTF stack aligned LONG: 4H / 1H / 15M / 5M.', 'Sell-side sweep and reclaim confirmed.'],
  };
  const riskResult = await prepareLiveScannerDiscordAlertArtifacts({
    session: 'morning',
    tradeDate: '2026-05-29',
    config: { instrument: 'MES' },
    state: 'Conditional',
    confidence: {
      score: 82,
      qualifiedReasons: ['RiskTooWide advisory fixture.'],
      missingReasons: [],
      recommendation: 'Manual decision required.',
      hardBlocker: 'RiskTooWide',
    },
    candidate: riskTooWideCandidate,
    normalized: {
      canExecute: false,
      decisionStatus: TradeDecisionStatus.Wait,
      decision: 'LONG',
      noTradeReason: 'RiskTooWide',
      invalidation: riskTooWideCandidate.invalidation,
    } as any,
    chartContext: chartContext as ChartContext,
    currentPrice: 7604.25,
    completed5m: {
      time: '2026-05-29T11:25:00-04:00',
      open: 7599.25,
      high: 7600,
      low: 7593.5,
      close: 7599.5,
      volume: 1000,
    },
    scoringTimestamp: '2026-05-29T11:25:00-04:00',
    scoringTimestampSource: 'fixture completed 5M candle',
    windowLabel: 'Morning Setup Scanner',
    staleReason: null,
    targetCascade: {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: [],
      targetRoomPoor: false,
      reason: 'RiskTooWide target cascade fixture.',
    },
    alertReason: 'RiskTooWide conditional advisory fixture.',
    planVersionId: 'SCANNER-RISKTOOWIDE-FIXTURE',
    outputDir,
    auditDir,
  });
  const riskText = flattenDiscordPayloadText(riskResult.payload);
  const riskAudit = JSON.parse(await fs.readFile(riskResult.auditLogPath, 'utf8'));
  assert.ok(riskText.includes('MES Current Desk Plan'));
  assert.ok(riskText.includes('MES Current Desk Ticket'));
  assert.ok(riskText.includes('Status:'));
  assert.ok(riskText.includes('human review only.'));
  assert.equal(/Risk Score: \d+\/100/i.test(riskText), false, 'Discord body must keep risk score out of compact desk plan text');
  assert.equal(riskAudit.conditionalRiskScore.canExecute, false);
  assert.equal(riskAudit.conditionalRiskScore.blockReason, 'RiskTooWide');
  assert.equal(riskAudit.conditionalRiskScore.score, 64);
  assert.equal(riskAudit.visualAuthority, 'normalized_plan');
  assert.ok(riskAudit.sourceCandidate);
  assert.equal(riskAudit.candidate.executionStatus, ExecutionStatus.Conditional);
  assert.equal(riskAudit.candidate.target1, 7609.5);
  assert.equal(riskAudit.candidate.target2, 7613.5);
  assert.equal(riskAudit.candidate.targetRepair.source, 'app_entry_stop_r_targets');
  assert.equal(riskAudit.candidate.targetRepair.previousTarget1, 7620);
  assert.equal(riskAudit.candidate.targetRepair.previousTarget2, 7620);
  assert.equal(riskAudit.sourceCandidate.target1, 7609.5);
  assert.equal(riskAudit.sourceCandidate.target2, 7613.5);
  assert.ok(riskResult.payload.components);
  assert.deepEqual(
    (riskResult.payload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)),
    ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed']
  );
  assert.equal(riskText.includes('Decision: WAIT | App plan review: NO | canExecute: false'), false);
  assert.ok(riskText.includes('Human review only.'));
  assert.ok(riskText.includes('No automated orders.'));
  assert.ok(!riskText.includes('canExecute'));
  assert.equal(riskText.includes('Risk exceeds standard limit. Human final decision required.'), false);
  assert.equal(riskText.includes('Do not chase'), false);

  console.log(`live scanner fixture alert verified: mainText=${text.length}, files=${result.files.length}, audit=${result.auditLogPath}`);
} finally {
  if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
  if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
  await fs.rm(outputDir, { recursive: true, force: true });
}
