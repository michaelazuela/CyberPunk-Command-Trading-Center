import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildRaidFailureDisplacementSourceClauseMiner } from './raid-failure-displacement-source-clause-miner';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raid-failure-displacement-clause-miner-'));
const selectorPath = path.join(tempDir, 'selector.json');

function row(args: {
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  quality: 'tight' | 'usable' | 'loose' | 'reject';
  dollars: number;
  riskPoints?: number;
  htfContext?: string;
  evidence?: string[];
}) {
  return {
    trade: {
      date: '2026-06-17',
      session: args.session,
      direction: args.direction,
      entryTimeEt: '2026-06-17T10:35:40',
      entry: 7589,
      exit: args.direction === 'SHORT' ? 7566.5 : 7600,
      dollars: args.dollars,
    },
    matched: args.quality !== 'reject',
    quality: args.quality,
    bestDetection: args.quality === 'reject'
      ? null
      : {
          proofTime: '2026-06-17T10:35:00',
          entry: 7590,
          stop: args.direction === 'SHORT' ? 7600.5 : 7580,
          target1: args.direction === 'SHORT' ? 7574.25 : 7605,
          target2: args.direction === 'SHORT' ? 7569 : 7610,
          riskPoints: args.riskPoints ?? 10.5,
          htfContext: args.htfContext ?? 'support',
          raidLevel: 7599,
          raidLevelLabel: 'recent 5M swing high',
          displacementTime: '2026-06-17T10:35:00',
          displacementQuality: 'high_quality',
          evidence: args.evidence ?? [
            'Directional displacement confirmed at 2026-06-17T10:35:00.',
            'Displacement left imbalance context.',
            'Displacement broke structure.',
          ],
        },
    minutesBeforeEntry: args.quality === 'reject' ? null : 0,
    entryDistancePoints: args.quality === 'reject' ? null : 1,
    candidateCount: args.quality === 'reject' ? 0 : 2,
    scannerInstallEligible: false,
    promotionEligible: false,
    discordEligible: false,
    executionApprovalEligible: false,
  };
}

fs.writeFileSync(selectorPath, JSON.stringify({
  reportType: 'raid_failure_displacement_reversal_tight_match_selector',
  rows: [
    row({ session: 'morning', direction: 'SHORT', quality: 'tight', dollars: 112.5 }),
    row({ session: 'lunch', direction: 'SHORT', quality: 'usable', dollars: 66.25, riskPoints: 27.25 }),
    row({ session: 'lunch', direction: 'LONG', quality: 'loose', dollars: 25, htfContext: 'conflict' }),
    row({ session: 'morning', direction: 'LONG', quality: 'reject', dollars: 15 }),
  ],
}, null, 2));

const report = buildRaidFailureDisplacementSourceClauseMiner({
  selectorJson: selectorPath,
  json: true,
});

assert.equal(report.authority.noScannerWiring, true);
assert.equal(report.authority.noDiscordPost, true);
assert.equal(report.authority.noSupabaseRead, true);
assert.equal(report.authority.noSupabaseWrite, true);
assert.equal(report.authority.noBridgeRead, true);
assert.equal(report.authority.noExecutionApproval, true);
assert.equal(report.summary.rows, 4);
assert.equal(report.summary.selectedRows, 2);
assert.equal(report.summary.selectedDollars, 178.75);
assert.equal(report.summary.shortSelectedRows, 2);
assert.equal(report.summary.longSelectedRows, 0);
assert.equal(report.summary.scannerInstallEligibleRows, 0);
assert.equal(report.topClauses[0]?.clause, 'direction=SHORT');
assert.equal(report.topClauses[0]?.selectedRows, 2);
assert.ok(report.topConjunctions.some((item) => item.clausePair.includes('direction=SHORT') && item.clausePair.includes('htf=support')));
assert.equal(report.selectedTrades.length, 2);
assert.equal(report.recommendation, 'draft_scanner_preview_clause_from_high_coverage_pre_entry_fields_only');

console.log('raid failure displacement source clause miner verified');
