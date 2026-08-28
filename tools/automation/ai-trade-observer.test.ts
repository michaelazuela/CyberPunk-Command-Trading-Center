import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAiTradeObserverReport } from './ai-trade-observer';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-trade-observer-'));
const auditDir = path.join(tmp, 'audit');
const outDir = path.join(tmp, 'out');
const statePath = path.join(tmp, 'state.json');
fs.mkdirSync(auditDir, { recursive: true });

const tapePath = path.join(auditDir, 'scanner-decision-tape-2026-08-28-MES-lunch.json');
fs.writeFileSync(tapePath, JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-08-28',
  instrument: 'MES',
  session: 'lunch',
  events: {
    '2026-08-28T10:15:00.0000000': {
      time: '2026-08-28T10:15:00.0000000',
      scannerState: 'Conditional',
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'Watchlist / Conditional Plan qualified for Discord.',
      },
      trafficCopTrace: {
        sourceOfTruth: 'scanner_traffic_cop_trace',
        candidate: {
          setupType: 'FvgStrengthContinuation',
          direction: 'LONG',
        },
        gates: {
          scannerSawCandidate: true,
          scoringPassed: true,
          dedupePassed: true,
          visibilityPassed: true,
          humanReviewReady: true,
          canExecute: false,
          liveDiscordBoundary: 'passed',
          delivery: 'sent',
        },
        reasons: {
          score: 75,
          staleReason: null,
        },
      },
    },
    '2026-08-28T10:20:00.0000000': {
      time: '2026-08-28T10:20:00.0000000',
      scannerState: 'Conditional',
      discord: {
        shouldSend: true,
        sendOrSuppressReason: 'High-confidence review blocked by boundary.',
      },
      trafficCopTrace: {
        sourceOfTruth: 'scanner_traffic_cop_trace',
        candidate: {
          setupType: 'DefendedBattleZoneContinuation',
          direction: 'SHORT',
        },
        gates: {
          scannerSawCandidate: true,
          scoringPassed: true,
          dedupePassed: true,
          visibilityPassed: false,
          humanReviewReady: true,
          canExecute: false,
          liveDiscordBoundary: 'blocked',
          delivery: 'skipped',
        },
        reasons: {
          score: 82,
          staleReason: null,
        },
      },
    },
  },
}), 'utf8');

const { report, reportPath } = await buildAiTradeObserverReport({
  tradeDate: '2026-08-28',
  tradeDateLocked: true,
  instrument: 'MES',
  session: 'lunch',
  sessionLocked: true,
  auditDir,
  outDir,
  statePath,
  endpointUrl: null,
  liveAiCall: false,
  postDiscord: false,
  watch: false,
  pollSeconds: 60,
  maxEvents: 5,
  json: false,
});

assert.equal(report.reportType, 'ai_trade_observer_report');
assert.equal(report.reviews.length, 2);
assert.equal(report.reviews[0].status, 'dry_run');
assert.equal(report.reviews[0].modelRoute.model, 'gpt-5.6-terra');
assert.equal(report.reviews[1].modelRoute.model, 'gpt-5.6-sol');
assert.equal(report.authorityBoundary.changesScannerState, false);
assert.equal(report.authorityBoundary.blocksDiscord, false);
assert.equal(report.reviews.every((review) => review.authorityBoundary.observerChangesCanExecute === false), true);
assert.ok(fs.existsSync(reportPath));

const second = await buildAiTradeObserverReport({
  tradeDate: '2026-08-28',
  tradeDateLocked: true,
  instrument: 'MES',
  session: 'lunch',
  sessionLocked: true,
  auditDir,
  outDir,
  statePath,
  endpointUrl: null,
  liveAiCall: false,
  postDiscord: false,
  watch: false,
  pollSeconds: 60,
  maxEvents: 5,
  json: false,
});
assert.equal(second.report.reviews.length, 0);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('AI trade observer loopback verified.');
