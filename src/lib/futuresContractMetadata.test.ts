import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  calculateEstimatedGrossContractPnl,
  normalizeFuturesRootSymbol,
  pointsToDollars,
  pointsToTicks,
  resolveFuturesContractMetadata,
  ticksToDollars,
} from './futuresContractMetadata';
import type { ResearchCandidateOutcome } from '../agents/researchOutcomeMathAgent';

function outcome(overrides: Partial<ResearchCandidateOutcome> = {}): ResearchCandidateOutcome {
  return {
    candidateId: 'sample-001',
    date: '2026-01-02',
    time: '10:00',
    instrument: 'MES',
    concept: 'test_concept',
    direction: 'LONG',
    window: 'morning',
    classification: 'advisory_only',
    advisoryOnly: true,
    observationWindowBars: 12,
    observationWindowMinutes: 60,
    referencePrice: 5000,
    maxFavorableExcursionPoints: 23,
    maxAdverseExcursionPoints: 4.25,
    maxFavorableExcursionTicks: 92,
    maxAdverseExcursionTicks: 17,
    timeToMaxFavorableBars: 3,
    timeToMaxAdverseBars: 2,
    timeToMaxFavorableMinutes: 15,
    timeToMaxAdverseMinutes: 10,
    thresholdOnePoints: 6,
    thresholdTwoPoints: 10,
    thresholdOneTouched: true,
    thresholdTwoTouched: true,
    adverseThresholdPoints: 6,
    adverseThresholdTouched: false,
    firstMeaningfulMove: 'favorable',
    outcomeClassification: 'favorable_continuation',
    hypotheticalOutcomeOverlay: {
      hypotheticalReferencePrice: 5000,
      hypotheticalThresholdOne: 5006,
      hypotheticalThresholdTwo: 5010,
      hypotheticalInvalidationReference: 4994,
      firstResolvedEvent: 'favorable_threshold_two',
      hypotheticalOutcomeLabel: 'favorable_continuation',
      sameBarAmbiguous: false,
      advisoryOnly: true,
      notes: [],
    },
    dataQualityNotes: [],
    ...overrides,
  } as ResearchCandidateOutcome;
}

const cases: Array<[string, string]> = [
  ['MES', 'MES'],
  ['/MES', 'MES'],
  ['MESU6', 'MES'],
  ['MESM6', 'MES'],
  ['MES 06-26', 'MES'],
  ['MNQ', 'MNQ'],
  ['/MNQ', 'MNQ'],
  ['MNQU6', 'MNQ'],
  ['MNQM6', 'MNQ'],
  ['MNQ 06-26', 'MNQ'],
  ['ES', 'ES'],
  ['/ES', 'ES'],
  ['ESU6', 'ES'],
  ['ESM6', 'ES'],
  ['ES 06-26', 'ES'],
  ['NQ', 'NQ'],
  ['/NQ', 'NQ'],
  ['NQU6', 'NQ'],
  ['NQM6', 'NQ'],
  ['NQ 06-26', 'NQ'],
];

for (const [input, expected] of cases) {
  assert.equal(normalizeFuturesRootSymbol(input), expected);
  assert.equal(resolveFuturesContractMetadata(input)?.rootSymbol, expected);
}

assert.equal(normalizeFuturesRootSymbol('YM'), 'UNKNOWN');
assert.equal(resolveFuturesContractMetadata('YM'), null);

assert.equal(pointsToDollars(1, 5), 5);
assert.equal(pointsToTicks(1, 0.25), 4);
assert.equal(ticksToDollars(1, 1.25), 1.25);
assert.equal(pointsToDollars(1, 2), 2);
assert.equal(ticksToDollars(1, 0.5), 0.5);
assert.equal(pointsToDollars(1, 50), 50);
assert.equal(ticksToDollars(1, 12.5), 12.5);
assert.equal(pointsToDollars(1, 20), 20);
assert.equal(ticksToDollars(1, 5), 5);
assert.equal(pointsToDollars(6, 5), 30);
assert.equal(pointsToDollars(8, 5), 40);
assert.equal(pointsToDollars(10, 5), 50);
assert.equal(pointsToDollars(-4.25, 5), -21.25);

const mes = calculateEstimatedGrossContractPnl({ outcome: outcome(), sampleSymbol: '/MES' });
assert.equal(mes.rootSymbol, 'MES');
assert.equal(mes.mfeDollars, 115);
assert.equal(mes.maeDollars, -21.25);
assert.equal(mes.t1Dollars, 30);
assert.equal(mes.t2Dollars, 50);
assert.equal(mes.adverseDollars, -30);
assert.equal(mes.hypotheticalOutcomeDollars, 50);
assert.equal(mes.status, 'available');

const mnq = calculateEstimatedGrossContractPnl({ outcome: outcome(), sampleSymbol: 'MNQM6' });
assert.equal(mnq.rootSymbol, 'MNQ');
assert.equal(mnq.t1Dollars, 12);
assert.equal(mnq.t2Dollars, 20);

const es = calculateEstimatedGrossContractPnl({ outcome: outcome(), sampleSymbol: 'ES 06-26' });
assert.equal(es.rootSymbol, 'ES');
assert.equal(es.t1Dollars, 300);

const nq = calculateEstimatedGrossContractPnl({ outcome: outcome(), sampleSymbol: '/NQ' });
assert.equal(nq.rootSymbol, 'NQ');
assert.equal(nq.t1Dollars, 120);

const unknown = calculateEstimatedGrossContractPnl({ outcome: outcome(), sampleSymbol: 'YM' });
assert.equal(unknown.rootSymbol, 'UNKNOWN');
assert.equal(unknown.status, 'unavailable_unknown_contract');
assert.equal(unknown.hypotheticalOutcomeDollars, undefined);

const shortFavorable = calculateEstimatedGrossContractPnl({
  outcome: outcome({ direction: 'SHORT' }),
  sampleSymbol: 'MES',
});
assert.equal(shortFavorable.hypotheticalOutcomeDollars, 50);
assert.equal(shortFavorable.firstMeaningfulMoveDollars, 30);

const partial = calculateEstimatedGrossContractPnl({
  outcome: outcome({
    hypotheticalOutcomeOverlay: {
      ...outcome().hypotheticalOutcomeOverlay,
      firstResolvedEvent: 'neutral_no_resolution',
      hypotheticalOutcomeLabel: 'neutral_no_resolution',
    },
  }),
  sampleSymbol: 'MES',
});
assert.equal(partial.status, 'partial');
assert.equal(partial.hypotheticalOutcomeDollars, undefined);

const deskAgentRules = fs.readFileSync('src/lib/gemini.ts', 'utf8');
assert.ok(deskAgentRules.includes('## Research Review P/L Interpretation Rule'));
assert.ok(deskAgentRules.includes('Estimated gross contract P/L based on existing research outcome math.'));
assert.ok(deskAgentRules.includes('must not promote a concept to model-candidate review based on P/L alone'));
