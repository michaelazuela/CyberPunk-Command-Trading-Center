import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-rule-miner';
import type { RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport } from './raw-ohlc-scanner-artifact-openingdrive-priority-campaign-dedupe-changed-slate-miner';

const cases = Array.from({ length: 10 }, (_, index) => ({
  slateId: `slate-${index}`,
  tradeDate: '2026-07-10',
  session: 'morning',
  eventTime: `2026-07-10T09:${String(40 + index).padStart(2, '0')}:00`,
  baselineTopTicketId: `later-${index}`,
  baselineDirection: 'LONG',
  replacementTicketId: `replacement-${index}`,
  replacementSetupType: 'NoInstalledSetup',
  candidateRows: 2,
  duplicateOrdinal: 3,
  minutesSinceCampaignFirst: 10,
  baselineTopOneMesPl: index < 8 ? 50 : -20,
  replacementOneMesPl: -10,
  deltaTopOneMesPl: index < 8 ? -60 : 10,
  duplicateOutcomeClass: index < 8 ? 'winner' : 'loss',
}));

const changedSlateMiner = {
  status: 'pass',
  cases,
} as RawOhlcScannerArtifactOpeningDrivePriorityCampaignDedupeChangedSlateMinerReport;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofRuleMinerReport({
  changedSlateMinerPath: 'changed.json',
  changedSlateMiner,
});

assert.equal(report.status, 'pass');
assert.equal(report.summary.casesRead, 10);
assert.ok(report.summary.validationCandidates > 0);
assert.equal(report.summary.installableSeparatorFound, false);
assert.equal(report.summary.recommendation, 'validate_best_keep_later_proof_candidate');
assert.ok(report.summary.bestRuleId);
assert.equal(report.rules[0].recommendation, 'validate_keep_later_proof_candidate');

console.log('OpeningDrive priority keep-later-proof rule miner verified.');
