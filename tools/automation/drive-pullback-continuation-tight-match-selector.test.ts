import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildDrivePullbackContinuationTightMatchSelector } from './drive-pullback-continuation-tight-match-selector';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drive-pullback-tight-selector-'));
const sourcePath = path.join(tempDir, 'filter.json');

fs.writeFileSync(sourcePath, JSON.stringify({
  summary: {
    profitablePdfTrades: 3,
    matchedTrades: 3,
  },
  matches: [
    {
      trade: { date: '2026-06-25', session: 'lunch', direction: 'SHORT', entryTimeEt: '2026-06-25T14:35:09', entry: 7433.5, exit: 7418, dollars: 77.5 },
      matched: true,
      bestDetection: { proofTime: '2026-06-25T14:15:00', entry: 7433.25, stop: 7435.75, target1: 7429.5, target2: 7428.25, riskPoints: 2.5, driveTime: '2026-06-25T14:00:00', htfContext: 'support' },
      minutesBeforeEntry: 20,
      entryDistancePoints: 0.25,
      candidateCount: 1,
    },
    {
      trade: { date: '2026-06-08', session: 'morning', direction: 'LONG', entryTimeEt: '2026-06-08T10:18:06', entry: 7439.75, exit: 7475.25, dollars: 177.5 },
      matched: true,
      bestDetection: { proofTime: '2026-06-08T10:05:00', entry: 7431, stop: 7428.75, target1: 7434.5, target2: 7435.5, riskPoints: 2.25, driveTime: '2026-06-08T09:45:00', htfContext: 'conflict' },
      minutesBeforeEntry: 13,
      entryDistancePoints: 8.75,
      candidateCount: 2,
    },
    {
      trade: { date: '2026-06-10', session: 'lunch', direction: 'SHORT', entryTimeEt: '2026-06-10T13:10:14', entry: 7315.75, exit: 7302.5, dollars: 66.25 },
      matched: false,
      bestDetection: null,
      minutesBeforeEntry: null,
      entryDistancePoints: null,
      candidateCount: 0,
    },
  ],
}, null, 2));

const report = buildDrivePullbackContinuationTightMatchSelector({
  pdfWindowFilterJson: sourcePath,
  json: true,
});

assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.summary.tightRows, 1);
assert.equal(report.summary.looseRows, 1);
assert.equal(report.summary.rejectRows, 1);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.selectedDollars, 77.5);
assert.equal(report.summary.selectedShortRows, 1);
assert.equal(report.summary.selectedSupportHtfRows, 1);
assert.equal(report.rows[0]?.scannerInstallEligible, false);
assert.equal(report.recommendation, 'continue_replay_only_source_filtering_before_scanner_install');

console.log('drive pullback continuation tight-match selector verified');
