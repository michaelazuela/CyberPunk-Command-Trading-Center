import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate } from '../../src/types';
import { buildCandidateLifecycleTrace, buildDeskState, resolveScannerWindow, type ScannerVisibilityMetadata } from '../../src/lib/localScannerEngine';
import { BANNED_ACTIVE_DISCORD_ALERT_TEXT, flattenDiscordPayloadText } from './discord-alert-format';
import {
  barsCoverRequestedLookback,
  barsForMorningContinuationWatchlist,
  buildCompletedFiveMinuteGapEventRecord,
  buildScannerDataQualityNoticePayload,
  buildScannerHistoryPreloadPlan,
  buildSegmentedHistoryRepairWindows,
  attachFailedPlanReversalContextFromScannerState,
  appOwnedFailedDecisionEventFromCandidate,
  appOwnedFailedPlanEventsFromScannerAudits,
  appOwnedFailedPlanEventsFromScannerState,
  createPendingScannerAlertDeliveryRecord,
  evaluateCompletedFiveMinuteBarAssuranceGate,
  evaluatePreMarketDataReadinessBackfillGate,
  findMissedExecutableScannerDeliveries,
  cleanupExpiredScannerDiscordMessages,
  cleanupRecoveredScannerOperationalDiscordMessages,
  htfHistoryCoverageReadiness,
  claimDurableActiveCampaignScannerAlert,
  loadScannerActiveCampaignLedgerConfig,
  markScannerAlertDeliveryFailed,
  markScannerAlertDeliverySent,
  markScannerAlertDeliverySkipped,
  markDurableActiveCampaignScannerAlertSent,
  recordScannerDiscordCleanupMessage,
  replacePriorScannerDiscordCurrentDeskPlans,
  recordActiveCampaignScannerAlertSent,
  recordActiveCampaignScannerAlertSuppressed,
  releaseDurableActiveCampaignScannerAlertClaim,
  candidateForDeskPlayContextChart,
  candidateForNormalizedVisualAuthority,
  prepareLiveScannerDeskPlayAlertArtifacts,
  prepareLiveScannerDiscordAlertArtifacts,
  prepareLiveScannerWatchlistAlertArtifacts,
  resolveScannerDiscordWebhookUrl,
  shouldSendScannerDataQualityNoticeForWindow,
  SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
  scannerDataQualityNoticeKey,
  scannerDeskPlanRefreshKey,
  scannerDiscordWebhookDeleteUrl,
  scannerDiscordWebhookUrlForPost,
  scannerActiveCampaignKey,
  scannerActiveCampaignKeyForTradeDate,
  shouldLogBridgeInstrumentResolution,
  shouldPersistScannerAlertToRag,
  shouldSuppressActiveCampaignScannerAlert,
  summarizeScannerHistoryCoverage,
  syncLocalMarketDataGapEventsToSupabase,
  twoHourCoverageDiagnostic,
  verifyScannerActiveCampaignLedgerReady,
  writeLocalMarketDataGapEvent,
  writeScannerDecisionTapeAuditLog,
  upsertScannerDiscordAlertRagRecord,
  normalizeScannerBarTimestampMode,
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

assert.equal(normalizeScannerBarTimestampMode(undefined), 'open');
assert.equal(normalizeScannerBarTimestampMode(null), 'open');
assert.equal(normalizeScannerBarTimestampMode(''), 'open');
assert.equal(normalizeScannerBarTimestampMode('open'), 'open');
assert.equal(normalizeScannerBarTimestampMode('OPEN'), 'open');
assert.equal(normalizeScannerBarTimestampMode('close'), 'close');
assert.equal(normalizeScannerBarTimestampMode('CLOSE'), 'close');
assert.equal(normalizeScannerBarTimestampMode('bar-open'), 'open');
assert.equal(normalizeScannerBarTimestampMode('bad-env-value'), 'open');
assert.equal(shouldLogBridgeInstrumentResolution({
  instrument: 'MES 09-26',
  requestedInstrument: 'MES',
  source: 'front-month-rollover',
  warning: null,
}, 'MES'), false);
assert.equal(shouldLogBridgeInstrumentResolution({
  instrument: 'MES 09-26',
  requestedInstrument: 'MES 06-26',
  source: 'front-month-rollover',
  warning: 'Configured bridge instrument MES 06-26 is stale after rollover; using active front-month contract MES 09-26.',
}, 'MES 06-26'), true);
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
assert.deepEqual(replacementResult, { checked: 3, deleted: 3, failed: 0, skipped: 0 });
assert.equal(cleanupState.discordCleanupMessages[protectedDeskPlayCleanupRecord!.key].deleteStatus, 'replaced');
assert.equal(cleanupState.discordCleanupMessages[protectedDeskPlayCleanupRecord!.key].lastError?.includes('replaced_by:'), true);
assert.equal(cleanupState.discordCleanupMessages['desk_play:2026-06-05:MES:morning:DESK_PLAN_REFRESH:legacy:legacy-desk-play-message-123'].deleteStatus, 'replaced');
assert.equal(cleanupState.discordCleanupMessages['desk_play:2026-06-05:MES:lunch:DESK_PLAN_REFRESH:old-lunch:lunch-desk-play-message-123'].deleteStatus, 'replaced');
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
  'DELETE https://discord.com/api/webhooks/123/token/messages/desk-play-message-123',
  'DELETE https://discord.com/api/webhooks/123/token/messages/legacy-desk-play-message-123',
  'DELETE https://discord.com/api/webhooks/123/token/messages/lunch-desk-play-message-123',
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
const repeatedCampaignDecision = shouldSuppressActiveCampaignScannerAlert({
  activeCampaignSent: activeCampaignLedger,
  candidate: shiftedCampaignCandidate,
});
assert.equal(repeatedCampaignDecision.shouldSuppress, true);
assert.equal(repeatedCampaignDecision.campaignId, '2026-06-08:SHORT:15M5M-MSS');
assert.match(repeatedCampaignDecision.reason || '', /one trade alert already sent/);
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
        { timeframe: '5M', bias: 'BEAR', protectedStructure: 7424.75, confirmationLine: 7416.5 },
      ],
    },
  },
} as any;
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
assert.notEqual(firstDeskPlanRefreshKey, shiftedDeskPlanRefreshKey);
assert.ok(firstDeskPlanRefreshKey.includes('DESK_PLAN_REFRESH'));
assert.ok(shiftedDeskPlanRefreshKey.includes('m5=BEAR:7419.25:7412.75'));
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
  assert.equal(morningHistoryPlan[timeframe].from, '2026-05-03T00:00:00-04:00');
  assert.equal(morningHistoryPlan[timeframe].to, '2026-06-02T12:00:00-04:00');
}
const lunchHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'lunch');
assert.equal(lunchHistoryPlan['5m'].from, '2026-05-03T00:00:00-04:00');
assert.equal(lunchHistoryPlan['5m'].to, '2026-06-02T16:00:00-04:00');
const eveningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'evening');
assert.equal(eveningHistoryPlan['5m'].from, '2026-05-03T00:00:00-04:00');
assert.equal(eveningHistoryPlan['5m'].to, '2026-06-02T22:15:00-04:00');

const liveMorningHistoryPlan = buildScannerHistoryPreloadPlan('2026-06-02', 'morning', '2026-06-02T10:05:00.0000000');
assert.equal(liveMorningHistoryPlan['5m'].from, '2026-05-03T00:00:00-04:00');
assert.equal(liveMorningHistoryPlan['5m'].to, '2026-06-02T10:05:00-04:00');

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
assert.equal(tapeEvent.candidateLifecycleTrace.sourceOfTruth, 'scanner_candidate_lifecycle_trace');
assert.equal(tapeEvent.candidateLifecycleTrace.candidateCount, 0);
assert.equal(tapeEvent.candidateLifecycleTrace.discordDecision.shouldSend, false);
assert.equal(tapeEvent.candidateLifecycleTrace.discordDecision.reason, 'TriggerPending is logged locally as developing context.');
assert.equal(tapeEvent.deskState.sourceOfTruth, 'scanner_desk_state');
assert.equal(tapeEvent.deskState.marketMode, 'watching');
assert.equal(tapeEvent.deskState.visibilityMode, tapeEvent.visibility.visibilityMode);
assert.equal(tapeEvent.deskState.canExecute, false);
assert.equal(tapeEvent.deskState.promotion.sourceOfTruth, 'scanner_desk_state_promotion_path');
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
  assert.ok(text.includes('Compact Trade Plan Summary'));
  assert.ok(text.includes('[AM REVIEW] MES - LONG CONDITIONAL / NO FRESH ENTRY'));
  assert.ok(text.includes('Status: WAIT - fresh completed 5M required'));
  assert.ok(text.includes('Plan:'));
  assert.ok(text.includes('Risk: 5.00 pts / N/A'));
  assert.ok(text.includes('Invalidation:'));
  assert.ok(text.includes('Memory:'));
  assert.ok(text.includes('History: Neutral'));
  assert.ok(text.includes('Action:'));
  assert.ok(text.includes('Details: Chart + Level Map attached.'));
  assert.ok(!/Memory:[\s\S]*approve/i.test(text));
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
  assert.equal(audit.deskState.sourceOfTruth, 'scanner_desk_state');
  assert.equal(audit.deskState.marketMode, 'conditional');
  assert.equal(audit.deskState.visibilityMode, audit.visibility.visibilityMode);
  assert.equal(audit.deskState.canExecute, false);
  assert.equal(audit.deskState.selectedCandidate.setupType, candidate.setupType);
  assert.equal(audit.deskState.promotion.currentStage, 'conditional');
  assert.equal(audit.deskState.promotion.nextStage, 'human_review_ready');
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
      deskState: audit.deskState,
      confidence: 86,
    });
    const ragInsert = ragCalls.find((call) => call.method === 'POST');
    assert.equal(ragInsert?.body.trade_result, 'pending');
    assert.equal(ragInsert?.body.outcome, 'no_trade');
    assert.equal(ragInsert?.body.trade_plan_json.deskState.sourceOfTruth, 'scanner_desk_state');
    assert.equal(ragInsert?.body.trade_plan_json.visibility.sourceOfTruth, 'scanner_desk_state_visibility_metadata');
    assert.equal(ragInsert?.body.trade_plan_json.candidateLifecycleTrace.sourceOfTruth, 'scanner_candidate_lifecycle_trace');
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
    chartContext: chartContext as ChartContext,
    currentPrice: 5325,
    windowLabel: 'Lunch/PM Setup Scanner',
    planVersionId: 'SCANNER-DESK-PLAY-FIXTURE',
    deskState: deskPlayState,
    decisionTapePath: path.join(auditDir, 'desk-play-decision-tape.json'),
    outputDir,
  });
  const deskPlayText = flattenDiscordPayloadText(deskPlayResult.payload);
  assert.equal(deskPlayResult.files.length, 1);
  assert.ok(deskPlayResult.chartMarkup);
  assert.deepEqual(
    (deskPlayResult.payload.components || []).flatMap((row: any) => row.components.map((component: any) => component.label)),
    ['Long T1 Hit', 'Long T2 Hit', 'Long Runner Hit', 'Long Stretch Hit', 'Long Stopped', 'Scratch', 'No Trade', 'Missed'],
  );
  assert.ok(deskPlayText.includes('[PM DESK PLAY] MES - LONG'));
  assert.ok(deskPlayText.includes('MES Current Desk Plan'));
  assert.ok(deskPlayText.includes('Primary: LONG'));
  assert.ok(deskPlayText.includes('Bias:'));
  assert.ok(deskPlayText.includes('Line in sand: 5324.25'));
  assert.ok(deskPlayText.includes('LONG ABOVE 5324.25'));
  assert.ok(deskPlayText.includes('Entry: 5324.25'));
  assert.ok(deskPlayText.includes('Stop: 5319.25'));
  assert.ok(deskPlayText.includes('T1: 5331.75'));
  assert.ok(deskPlayText.includes('T2: 5334.25'));
  assert.ok(deskPlayText.includes('Status: Review only until 5M trigger + canExecute.'));
  assert.ok(deskPlayText.includes('Chart: attached.'));
  assert.ok(deskPlayText.length < 1200, `expected Desk Play payload under 1200 chars, got ${deskPlayText.length}`);
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
  assert.ok(deskPlayChartHtml.includes('ALERT QUALITY'));
  assert.ok(deskPlayChartHtml.includes('PREP / REVIEW ONLY - NOT EXECUTION APPROVAL'));
  assert.ok(deskPlayChartHtml.includes('LONG Quality: <tspan fill="#f8fafc">'));
  assert.ok(deskPlayChartHtml.includes('SHORT Quality: <tspan fill="#f8fafc">'));
  assert.ok(!deskPlayChartHtml.includes('Confidence: <tspan fill="#f8fafc">'));
  assert.ok(deskPlayChartHtml.includes('Levels: <tspan fill="#f8fafc">review planning only</tspan>'));
  assert.ok(deskPlayChartHtml.includes('Next: <tspan fill="#f8fafc">completed 5M proof</tspan>'));
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
  assert.ok(demotedChartHtml.includes('[AM PLAN] MES - LONG CONDITIONAL'));
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
  const displayedScore = riskText.match(/Risk Score: (\d+)\/100 - ([^\n]+)/);
  assert.ok(displayedScore, 'Discord payload must include risk score and label');
  assert.equal(Number(displayedScore[1]), riskAudit.conditionalRiskScore.score);
  assert.equal(displayedScore[2], riskAudit.conditionalRiskScore.label);
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
  assert.ok(riskText.includes('Decision: WAIT | App plan review: NO | canExecute: false'));
  assert.ok(riskText.includes('Risk exceeds standard limit. Human final decision required.'));
  assert.ok(riskText.includes('Do not chase'));

  console.log(`live scanner fixture alert verified: mainText=${text.length}, files=${result.files.length}, audit=${result.auditLogPath}`);
} finally {
  if (previousOutcomeBaseUrl === undefined) delete process.env.DISCORD_OUTCOME_BASE_URL;
  else process.env.DISCORD_OUTCOME_BASE_URL = previousOutcomeBaseUrl;
  if (previousOutcomeSecret === undefined) delete process.env.DISCORD_OUTCOME_SECRET;
  else process.env.DISCORD_OUTCOME_SECRET = previousOutcomeSecret;
  await fs.rm(outputDir, { recursive: true, force: true });
}
