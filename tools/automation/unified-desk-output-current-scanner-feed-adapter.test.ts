import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedDeskOutputCurrentScannerFeedAdapterReport,
  writeUnifiedDeskOutputCurrentScannerFeedAdapterReport,
} from './unified-desk-output-current-scanner-feed-adapter';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-desk-current-scanner-feed-'));
const tapePath = path.join(tempDir, 'scanner-decision-tape-2026-07-22-MES-morning.json');

fs.writeFileSync(tapePath, `${JSON.stringify({
  reportType: 'scanner_decision_tape',
  tradeDate: '2026-07-22',
  instrument: 'MES',
  session: 'morning',
  events: {
    '2026-07-22T10:00:00.0000000': {
      time: '2026-07-22T10:00:00',
      scannerState: 'Conditional',
      setupCandidateStatus: {
        selected: {
          setupType: 'NoInstalledSetup',
          direction: 'LONG',
          executionStatus: 'Executable',
        },
        statuses: [
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            executionStatus: 'Executable',
          },
          {
            setupType: 'NoInstalledSetup',
            direction: 'LONG',
            executionStatus: 'Conditional',
          },
        ],
      },
      plan: {
        canExecute: false,
      },
      visibility: {
        authority: {
          discordEligible: true,
        },
        discordAction: 'post_review',
      },
      deskPublishDecision: {
        action: 'POST_REVIEW',
        discordAction: 'post_review',
        shouldPost: true,
        direction: 'LONG',
        setupType: 'NoInstalledSetup',
        entry: 7518,
        stop: 7510.25,
        t1: 7529.75,
        t2: 7533.5,
        hasCompletePlan: true,
        canExecute: false,
        invalidationText: 'Invalid if price closes below 7510.25.',
      },
      discord: {
        shouldSend: false,
      },
    },
    '2026-07-22T10:05:00.0000000': {
      time: '2026-07-22T10:05:00',
      scannerState: 'TriggerPending',
      plan: {
        canExecute: false,
      },
      deskPublishDecision: {
        action: 'HOLD_WITH_REASON',
        discordAction: 'hold',
        shouldPost: false,
        direction: 'WAIT',
        entry: null,
        stop: null,
        t1: null,
        t2: null,
        hasCompletePlan: false,
        canExecute: false,
      },
    },
  },
}, null, 2)}\n`);

const report = buildUnifiedDeskOutputCurrentScannerFeedAdapterReport({
  scannerAuditDir: tempDir,
  tapePaths: [tapePath],
  instrument: 'MES',
  sessions: ['morning'],
}, '2026-07-22T17:00:00.000Z');

assert.equal(report.reportType, 'unified_desk_output_current_scanner_feed_adapter');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readsSavedScannerArtifactsOnly, true);
assert.equal(report.authority.writesSelectorPreviewOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.automatedOrders, false);
assert.equal(report.summary.scannerTapeFilesRead, 1);
assert.equal(report.summary.scannerEventsRead, 2);
assert.equal(report.summary.completePlanEvents, 1);
assert.equal(report.summary.sourceShouldPostRows, 1);
assert.equal(report.summary.selectorRows, 1);
assert.equal(report.summary.approvedDeskPlanRows, 1);
assert.equal(report.summary.formingDeskReadRows, 0);
assert.equal(report.summary.discordPostRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.liveBridgeReadRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.tradingLogicChangedRows, 0);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.recommendation, 'ready_for_fresh_guarded_scanner_output');
assert.equal(report.rows[0]?.model, 'NoInstalledSetup');
assert.equal(report.rows[0]?.visibleState, 'APPROVED_DESK_PLAN');
assert.equal(report.rows[0]?.direction, 'LONG');
assert.equal(report.rows[0]?.entry, 7518);
assert.equal(report.rows[0]?.stop, 7510.25);
assert.deepEqual(report.rows[0]?.contextLabels, ['NoInstalledSetup']);

const written = writeUnifiedDeskOutputCurrentScannerFeedAdapterReport(report, tempDir);
assert.ok(written.selectorPreviewJsonPath);
const selectorPreview = JSON.parse(fs.readFileSync(written.selectorPreviewJsonPath, 'utf8'));
assert.equal(selectorPreview.reportType, 'unified_desk_output_selector_preview');
assert.equal(selectorPreview.sourceOfTruth, 'current_scanner_feed_adapter');
assert.equal(selectorPreview.rows.length, 1);
assert.equal(selectorPreview.authority.postsDiscord, false);

const blockedTapePath = path.join(tempDir, 'scanner-decision-tape-2026-07-22-MES-lunch.json');
fs.writeFileSync(blockedTapePath, `${JSON.stringify({
  tradeDate: '2026-07-22',
  instrument: 'MES',
  session: 'lunch',
  events: {
    '2026-07-22T12:05:00.0000000': {
      time: '2026-07-22T12:05:00',
      plan: { canExecute: true },
      deskPublishDecision: {
        shouldPost: true,
        direction: 'SHORT',
        entry: 100,
        stop: 104,
        t1: 94,
        t2: 92,
        hasCompletePlan: true,
        canExecute: true,
      },
    },
  },
}, null, 2)}\n`);

const blocked = buildUnifiedDeskOutputCurrentScannerFeedAdapterReport({
  scannerAuditDir: tempDir,
  tapePaths: [blockedTapePath],
  instrument: 'MES',
  sessions: ['lunch'],
}, '2026-07-22T17:01:00.000Z');
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.summary.canExecuteTrueRows, 1);
assert.match(blocked.blockers.join('\n'), /canExecute=true/);

console.log('Unified desk output current scanner feed adapter verified.');
