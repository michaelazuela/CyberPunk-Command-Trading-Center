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
  normalizeScannerBarTimestampMode,
  normalizeScannerOperatorDeliveryReason,
  readUnifiedDeskOutputProductionScannerSurface,
  scannerDiscordDryRunSummaryLine,
  scannerMarketBarsUpsertSkipAuditLine,
  scannerSuppressionSummaryLine,
  shouldLogBridgeInstrumentResolution,
  unifiedDeskOutputProductionScannerSummaryLine,
  writeUnifiedDeskOutputProductionScannerReadback,
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
