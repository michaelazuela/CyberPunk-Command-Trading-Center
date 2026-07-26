import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFiveModelSelectorComparisonReport } from './five-model-selector-comparison-report';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'five-model-selector-comparison-'));
const liquidityPath = path.join(tempDir, 'liquidity.json');
const raidFailurePath = path.join(tempDir, 'raid-failure.json');

function row(args: {
  date: string;
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  entryTimeEt: string;
  entry: number;
  exit: number;
  dollars: number;
  quality: 'tight' | 'usable' | 'loose' | 'reject';
}) {
  return {
    trade: {
      date: args.date,
      session: args.session,
      direction: args.direction,
      entryTimeEt: args.entryTimeEt,
      entry: args.entry,
      exit: args.exit,
      dollars: args.dollars,
    },
    matched: args.quality !== 'reject',
    quality: args.quality,
    bestDetection: args.quality === 'reject'
      ? null
      : {
          proofTime: `${args.date}T10:00:00`,
          entry: args.entry,
          stop: args.direction === 'LONG' ? args.entry - 4 : args.entry + 4,
          target1: args.direction === 'LONG' ? args.entry + 6 : args.entry - 6,
          target2: args.direction === 'LONG' ? args.entry + 8 : args.entry - 8,
          riskPoints: 4,
          htfContext: 'support',
        },
    minutesBeforeEntry: args.quality === 'reject' ? null : 10,
    entryDistancePoints: args.quality === 'reject' ? null : 1,
    candidateCount: args.quality === 'reject' ? 0 : 1,
    scannerInstallEligible: false,
    promotionEligible: false,
    discordEligible: false,
    executionApprovalEligible: false,
  };
}

fs.writeFileSync(liquidityPath, JSON.stringify({
  reportType: 'liquidity_raid_reclaim_reversal_tight_match_selector',
  summary: {
    sourceProfitablePdfTrades: 4,
    sourceMatchedTrades: 2,
  },
  rows: [
    row({ date: '2026-06-08', session: 'morning', direction: 'LONG', entryTimeEt: '2026-06-08T10:18:06', entry: 7439.75, exit: 7475.25, dollars: 177.5, quality: 'tight' }),
    row({ date: '2026-06-09', session: 'morning', direction: 'SHORT', entryTimeEt: '2026-06-09T11:25:00', entry: 7362.5, exit: 7351.25, dollars: 56.25, quality: 'loose' }),
  ],
}, null, 2));

fs.writeFileSync(raidFailurePath, JSON.stringify({
  reportType: 'raid_failure_displacement_reversal_tight_match_selector',
  summary: {
    sourceProfitablePdfTrades: 4,
    sourceMatchedTrades: 3,
  },
  rows: [
    row({ date: '2026-06-08', session: 'morning', direction: 'LONG', entryTimeEt: '2026-06-08T10:18:06', entry: 7439.75, exit: 7475.25, dollars: 177.5, quality: 'usable' }),
    row({ date: '2026-06-10', session: 'lunch', direction: 'SHORT', entryTimeEt: '2026-06-10T13:10:14', entry: 7315.75, exit: 7302.5, dollars: 66.25, quality: 'tight' }),
    row({ date: '2026-06-11', session: 'lunch', direction: 'SHORT', entryTimeEt: '2026-06-11T13:25:00', entry: 7375, exit: 7365, dollars: 50, quality: 'reject' }),
  ],
}, null, 2));

const report = buildFiveModelSelectorComparisonReport({
  liquidityRaidReclaimSelectorJson: liquidityPath,
  raidFailureDisplacementSelectorJson: raidFailurePath,
  json: true,
});

assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.summary.modelsCompared, 2);
assert.equal(report.summary.selectedOverlapRows, 1);
assert.equal(report.summary.liquidityRaidReclaimOnlyRows, 0);
assert.equal(report.summary.raidFailureDisplacementOnlyRows, 1);
assert.equal(report.summary.leadingModelId, 'raid_failure_displacement_reversal');
assert.equal(report.summary.leadingModelSelectedRows, 2);
assert.equal(report.summary.leadingModelSelectedDollars, 243.75);
assert.equal(report.summary.scannerInstallEligibleRows, 0);
assert.equal(report.summary.promotionEligibleRows, 0);
assert.equal(report.summary.discordEligibleRows, 0);
assert.equal(report.summary.executionApprovalEligibleRows, 0);
assert.equal(report.recommendation, 'prepare_replay_only_source_clause_miner_for_raid_failure_displacement_before_scanner_preview');

console.log('five-model selector comparison report verified');
