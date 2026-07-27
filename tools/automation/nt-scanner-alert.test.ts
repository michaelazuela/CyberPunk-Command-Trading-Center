import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type SetupCandidate } from '../../src/types';
import {
  buildCandidateLifecycleTrace,
  buildDeskPublishDecision,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
} from '../../src/lib/localScannerEngine';
import {
  fiveModelProductionScannerSummaryLine,
  readFiveModelProductionScannerSurface,
  writeFiveModelProductionScannerReadback,
  applyScannerTradeAlertSuppressionAfterDeskPlay,
  normalizeScannerBarTimestampMode,
  normalizeScannerOperatorDeliveryReason,
  readUnifiedDeskOutputProductionScannerSurface,
  scannerDeskPlanSameSideRefreshHoldReason,
  scannerDiscordDryRunSummaryLine,
  scannerMarketBarsUpsertSkipAuditLine,
  scannerSuppressionSummaryLine,
  shouldLogBridgeInstrumentResolution,
  unifiedDeskOutputProductionScannerSummaryLine,
  writeUnifiedDeskOutputProductionScannerReadback,
  type ScannerDeskPlanRefreshLedgerRecord,
} from './nt-scanner';

const outputDir = path.join(os.tmpdir(), `nt-scanner-alert-blank-${Date.now()}`);
await fs.mkdir(outputDir, { recursive: true });

try {
  const blankSurfacePath = path.join(outputDir, '.unified-desk-output-production-surface.json');
  await fs.writeFile(blankSurfacePath, `${JSON.stringify({
    reportType: 'unified_desk_output_production_scanner_surface_activation',
    generatedAt: '2026-07-22T23:59:00.000Z',
    status: 'blocked',
    authority: {
      scannerVisibleNow: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    summary: {
      selectedRows: 0,
      morningRows: 0,
      lunchRows: 0,
      eveningRows: 0,
      approvedDeskPlanRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: 0,
    },
    rows: [],
    blockers: ['Blank-slate mode: no trading models are installed.'],
  }, null, 2)}\n`);

  const loadedSurface = await readUnifiedDeskOutputProductionScannerSurface(blankSurfacePath);
  assert.equal(loadedSurface, null);
  assert.equal(unifiedDeskOutputProductionScannerSummaryLine(null), 'unified-desk-output=unavailable');

  const readbackPath = path.join(outputDir, 'unified-desk-output-readback.json');
  await writeUnifiedDeskOutputProductionScannerReadback({
    tradeDate: '2026-07-22',
    instrument: 'MES',
    session: 'morning',
    completed5mTime: '2026-07-22T16:00:00.000Z',
    surface: null,
    filePath: readbackPath,
  });
  const readback = JSON.parse(await fs.readFile(readbackPath, 'utf8'));
  assert.equal(readback.reportType, 'unified_desk_output_production_scanner_readback');
  assert.equal(readback.status, 'blocked');
  assert.equal(readback.summary.selectedRows, 0);

  const fiveModelRow = (index: number, session: 'morning' | 'lunch' | 'evening', state: 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ') => ({
    cardId: `five-model-row-${index}`,
    date: '2026-06-09',
    session,
    state,
    stateLabel: state === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read',
    model: index % 2 === 0 ? 'Liquidity Raid Reclaim Reversal' : 'Structure Shift Continuation',
    direction: index % 2 === 0 ? 'LONG' : 'SHORT',
    headline: `Five-model row ${index}`,
    bodyLines: ['Five-model scanner surface row.'],
    levelLine: 'Entry 7540.75 | Stop 7536.25 | T1 7547.50 | T2 7549.75',
    riskLine: 'Risk remains scanner-owned.',
    proofLine: 'Completed 5M proof: 10:15 ET.',
    invalidationLine: 'Invalid if protected 5M structure fails.',
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  });
  const fiveModelRows = [
    ...Array.from({ length: 5 }, (_, index) => fiveModelRow(index + 1, index < 3 ? 'morning' : 'lunch', 'APPROVED_DESK_PLAN')),
    ...Array.from({ length: 13 }, (_, index) => fiveModelRow(index + 6, index < 7 ? 'morning' : 'lunch', 'FORMING_DESK_READ')),
    fiveModelRow(19, 'evening', 'FORMING_DESK_READ'),
  ];
  const fiveModelSurfacePath = path.join(outputDir, '.five-model-production-surface.json');
  await fs.writeFile(fiveModelSurfacePath, `${JSON.stringify({
    reportType: 'five_model_production_scanner_surface_activation',
    generatedAt: '2026-07-26T18:20:00.000Z',
    status: 'active',
    approval: {
      explicitProductionApproval: true,
      approvalScope: 'five_model_scanner_surface_rows_only',
      discordPostingRemainsGuarded: true,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      automatedOrders: false,
    },
    authority: {
      scannerVisibleNow: true,
      localRuntimeSurfaceOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: { scannerSurfaceSmokePath: 'surface-smoke.json' },
    summary: {
      selectedRows: 19,
      approvedDeskPlanRows: 5,
      formingDeskReadRows: 14,
      morningRows: 10,
      lunchRows: 8,
      eveningRows: 1,
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
    rows: fiveModelRows,
    blockers: [],
  }, null, 2)}\n`);

  const fiveModelSurface = await readFiveModelProductionScannerSurface(fiveModelSurfacePath);
  assert.notEqual(fiveModelSurface, null);
  assert.match(fiveModelProductionScannerSummaryLine(fiveModelSurface), /Five-model production surface active: rows=19/);
  const fiveModelReadbackPath = path.join(outputDir, 'five-model-readback.json');
  await writeFiveModelProductionScannerReadback({
    tradeDate: '2026-07-22',
    instrument: 'MES',
    session: 'morning',
    completed5mTime: '2026-07-22T16:00:00.000Z',
    surface: fiveModelSurface,
    filePath: fiveModelReadbackPath,
  });
  const fiveModelReadback = JSON.parse(await fs.readFile(fiveModelReadbackPath, 'utf8'));
  assert.equal(fiveModelReadback.reportType, 'five_model_production_scanner_readback');
  assert.equal(fiveModelReadback.status, 'pass');
  assert.equal(fiveModelReadback.summary.selectedRows, 19);
  assert.equal(fiveModelReadback.summary.approvedDeskPlanRows, 5);
  assert.equal(fiveModelReadback.summary.formingDeskReadRows, 14);
  assert.equal(fiveModelReadback.summary.eveningRows, 1);
  assert.equal(fiveModelReadback.summary.discordPostRows, 0);
  assert.equal(fiveModelReadback.summary.canExecuteTrueRows, 0);

  const dirtyFiveModelSurfacePath = path.join(outputDir, '.five-model-production-surface-dirty.json');
  await fs.writeFile(dirtyFiveModelSurfacePath, `${JSON.stringify({
    ...(fiveModelSurface as any),
    rows: [{ ...fiveModelRows[0], canExecute: true }, ...fiveModelRows.slice(1)],
  }, null, 2)}\n`);
  assert.equal(await readFiveModelProductionScannerSurface(dirtyFiveModelSurfacePath), null);

  assert.equal(normalizeScannerBarTimestampMode(undefined), 'open');
  assert.equal(normalizeScannerBarTimestampMode('close'), 'close');
  assert.equal(normalizeScannerBarTimestampMode('bad-env-value'), 'open');
  assert.deepEqual(normalizeScannerOperatorDeliveryReason({
    shouldSend: false,
    reason: 'HTF/data context insufficient for high-confidence review publication.',
  }), {
    code: 'HELD_DATA_LIMITED',
    reason: 'HELD_DATA_LIMITED: HTF/data context is insufficient; review-map only.',
  });

  const candidate: SetupCandidate = {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'Blank-slate candidate fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Blocked,
    confidence: 'Low',
    priority: 0,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    invalidation: null,
    rankScore: 0,
    evidence: [],
    missingEvidence: ['No trading model is installed.'],
    executionStatus: ExecutionStatus.Blocked,
    blockReason: NoTradeReason.NoApprovedSetup,
    requiredTrigger: null,
    nextAction: 'Install a newly approved model definition before scanner publishing can resume.',
    reducedRiskPlan: null,
  };
  const window = resolveScannerWindow(new Date('2026-07-22T10:00:00-04:00'));
  const visibility = classifyScannerVisibility({
    state: 'Blocked',
    candidate,
    window,
    alertDecision: { shouldSend: false, reason: 'Blank-slate mode: no model publish.' },
    canExecute: false,
  });
  assert.equal(visibility.discordAction, 'hold');
  assert.equal(visibility.authority.registeredModel, false);
  assert.equal(visibility.authority.activeModel, false);
  assert.equal(visibility.authority.canExecute, false);

  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [candidate],
    selectedCandidate: null,
    state: 'Blocked',
    window,
    alertDecision: { shouldSend: false, reason: 'Blank-slate mode: no model publish.' },
    canExecute: false,
  });
  const deskState = buildDeskState({
    state: 'Blocked',
    candidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute: false,
  });
  assert.equal(deskState.deskTicket, null);
  const publishDecision = buildDeskPublishDecision({ deskState });
  assert.equal(publishDecision.shouldPost, false);
  assert.equal(publishDecision.candidateKey, null);
  assert.equal(publishDecision.setupType, null);
  assert.equal(publishDecision.canExecute, false);

  const dryRunSummary = scannerDiscordDryRunSummaryLine({
    source: 'dry_run',
    files: [],
    payload: {
      username: 'Quant Desk',
      content: 'Blank slate hold',
      embeds: [],
    },
  });
  assert.match(dryRunSummary, /^\[scanner-discord\] \| held source=dry_run/);
  assert.equal(dryRunSummary.includes('"embeds"'), false);

  const suppressionSummary = scannerSuppressionSummaryLine({
    label: 'Desk Play refresh',
    category: 'blank_slate',
    reason: 'Desk Play suppressed because no trading model is installed.',
  });
  assert.match(suppressionSummary, /Desk Play refresh suppressed/);
  assert.ok(suppressionSummary.length < 320);

  const priorDeskPlan: ScannerDeskPlanRefreshLedgerRecord = {
    fingerprint: '2026-07-27:MES:lunch:DESK_PLAN_REFRESH:14:20:no-campaign:SHORT',
    tradeDate: '2026-07-27',
    instrument: 'MES',
    session: 'lunch',
    activeCampaignId: null,
    setupType: SetupType.StructureShiftContinuation,
    scenarioLabel: 'Structure shift continuation',
    direction: 'SHORT',
    latestCompleted5m: '2026-07-27T18:20:00.000Z',
    lineInSand: 7458,
    activeTacticalLine: 7458,
    activeTacticalZoneLow: 7454,
    activeTacticalZoneHigh: 7458,
    activeTacticalZoneState: 'waiting_for_retest',
    longLine: 7462,
    shortLine: 7458,
    entry: 7457.5,
    stop: 7464.5,
    target1: 7447,
    target2: 7443.5,
    targetReactionLevel: 7447,
    nextTrigger: 'completed 5M rejection below 7458',
    invalidation: 'completed 5M acceptance above 7464.50',
    standDown: 'stand down if protected 5M short structure fails',
    readiness: 'human_review_ready',
    tacticalCampaignFingerprint: null,
    mainPlayFingerprint: 'prior-main-play',
    materialCadenceFingerprint: 'prior-material-play',
    sentAt: '2026-07-27T18:25:00.000Z',
  };
  const candleOnlyRefresh: ScannerDeskPlanRefreshLedgerRecord = {
    ...priorDeskPlan,
    fingerprint: '2026-07-27:MES:lunch:DESK_PLAN_REFRESH:14:25:no-campaign:SHORT',
    latestCompleted5m: '2026-07-27T18:25:00.000Z',
    sentAt: '2026-07-27T18:30:00.000Z',
  };
  assert.match(scannerDeskPlanSameSideRefreshHoldReason({
    previous: priorDeskPlan,
    current: candleOnlyRefresh,
    now: new Date('2026-07-27T18:30:00.000Z'),
  }), /Only the candle timestamp\/session refresh changed/);
  assert.equal(scannerDeskPlanSameSideRefreshHoldReason({
    previous: priorDeskPlan,
    current: { ...candleOnlyRefresh, entry: 7455.25 },
    now: new Date('2026-07-27T18:30:00.000Z'),
  }), null);

  const legacyAlertSuppressed = applyScannerTradeAlertSuppressionAfterDeskPlay({
    alertDecision: { shouldSend: true, reason: 'fixture trade alert would send' },
    deskPlanRefreshSent: { prior: priorDeskPlan },
    tradeDate: '2026-07-27',
    instrument: 'MES',
    session: 'lunch',
    planVersionId: 'fixture-plan-version',
  });
  assert.equal(legacyAlertSuppressed.shouldSend, false);
  assert.match(legacyAlertSuppressed.reason, /legacy_trade_alert_suppressed_after_scanner_owned_desk_play/);
  const legacyAlertAllowedWithoutDeskPlan = applyScannerTradeAlertSuppressionAfterDeskPlay({
    alertDecision: { shouldSend: true, reason: 'fixture trade alert would send' },
    deskPlanRefreshSent: {},
    tradeDate: '2026-07-27',
    instrument: 'MES',
    session: 'lunch',
    planVersionId: 'fixture-plan-version',
  });
  assert.equal(legacyAlertAllowedWithoutDeskPlan.shouldSend, true);

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

  console.log('nt scanner alert blank-slate contract verified.');
} finally {
  await fs.rm(outputDir, { recursive: true, force: true });
}
